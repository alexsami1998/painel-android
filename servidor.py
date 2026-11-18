import hashlib, hmac, ipaddress, json, os, re, secrets, socket, threading, time
from datetime import timedelta
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import psycopg
import redis
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

RAIZ = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(RAIZ, 'web')
HOME = os.path.expanduser('~')
PORTA = int(os.environ.get('PAINEL_PORTA', '8830'))
DSN = os.environ.get('PAINEL_DSN', 'dbname=painel')
R = redis.Redis(host=os.environ.get('PAINEL_REDIS_HOST', '127.0.0.1'), port=int(os.environ.get('PAINEL_REDIS_PORTA', '6379')),
                db=int(os.environ.get('PAINEL_REDIS_DB', '3')))
K = 'painel:'
REDES = [ipaddress.ip_network(n) for n in ('127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16')]
TIPOS = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
         '.svg': 'image/svg+xml', '.png': 'image/png'}

LAYOUT_PADRAO = {
    'paginas': [
        {'id': 'dispositivo', 'nome': 'Dispositivo', 'widgets': ['bateria', 'armazenamento', 'memoria']},
        {'id': 'mensagens', 'nome': 'Mensagens', 'widgets': ['whatsapp', 'whatsapp_business']},
        {'id': 'servicos', 'nome': 'Serviços', 'widgets': ['servicos']},
        {'id': 'ia', 'nome': 'IA', 'widgets': ['ia_sessao', 'ia_semana', 'ia_tokens']},
        {'id': 'carteira', 'nome': 'Carteira', 'widgets': ['patrimonio', 'operacoes']},
        {'id': 'camera', 'nome': 'Câmera', 'widgets': ['camera_vivo', 'camera_eventos']},
    ],
    'fixos': ['relogio', 'mini_bateria', 'mini_whatsapp', 'mini_business'],
}

AJUSTES_PADRAO = {'janela_s': 60, 'duracao_s': 15, 'tema': 'escuro', 'fontes': {'whatsapp': True, 'business': True}}
TIPO_APP = {'com.whatsapp': 'whatsapp', 'com.whatsapp.w4b': 'business'}
AVISO_DE_SISTEMA = ('procurando novas mensagens', 'procurando mensagens', 'checking for new messages', 'whatsapp web',
                    'backup', 'buscando mensagens')
HIST_MSGS, HIST_DIAS = 300, 30
CONTAGEM = re.compile(r'\s*\(\d+ (mensage(m|ns)|messages?)\)$', re.I)


def banco():
    return psycopg.connect(DSN, autocommit=True, row_factory=dict_row, connect_timeout=5)


def preparar():
    with banco() as c:
        c.execute("create table if not exists config (chave text primary key, valor jsonb not null)")
        c.execute("create table if not exists serie (fonte text not null, t timestamptz not null default now(), v real not null)")
        c.execute("create index if not exists serie_fonte_t on serie (fonte, t)")


def cfg_ler(chave, padrao=None):
    with banco() as c:
        r = c.execute("select valor from config where chave=%s", [chave]).fetchone()
    return r['valor'] if r else padrao


def cfg_gravar(chave, valor):
    with banco() as c:
        c.execute("insert into config values (%s, %s) on conflict (chave) do update set valor=excluded.valor", [chave, Jsonb(valor)])


def ajustes():
    a = cfg_ler('ajustes', {}) or {}
    return {**AJUSTES_PADRAO, **a, 'fontes': {**AJUSTES_PADRAO['fontes'], **a.get('fontes', {})}}


def guardar(nome, dado):
    R.set(K + 'dado:' + nome, json.dumps({'t': time.time(), **dado}))


def ler(nome):
    b = R.get(K + 'dado:' + nome)
    return json.loads(b) if b else None


def coletar_sistema():
    mem = {}
    with open('/proc/meminfo') as f:
        for l in f:
            k, v = l.split(':', 1)
            mem[k] = int(v.split()[0]) * 1024
    st = os.statvfs(HOME)
    guardar('sistema', {'mem_total': mem.get('MemTotal'), 'mem_livre': mem.get('MemAvailable'),
                        'disco_total': st.f_blocks * st.f_frsize, 'disco_livre': st.f_bavail * st.f_frsize,
                        'ligado_s': round(time.clock_gettime(time.CLOCK_BOOTTIME))})


def serie(fonte, v):
    if v is None:
        return
    with banco() as c:
        c.execute("insert into serie (fonte, v) values (%s, %s)", [fonte, v])


def amostrar():
    d, s = ler('dispositivo') or {}, ler('sistema') or {}
    serie('bateria', d.get('nivel'))
    serie('temperatura', d.get('temperatura'))
    if s.get('mem_total'):
        serie('memoria', round(100 * (1 - s['mem_livre'] / s['mem_total']), 1))
    with banco() as c:
        c.execute("delete from serie where t < now() - interval '3 days'")


def coletor():
    passos = [(coletar_sistema, 5), (amostrar, 300)]
    ultimo = {f: 0 for f, _ in passos}
    while True:
        for f, intervalo in passos:
            if time.time() - ultimo[f] >= intervalo:
                ultimo[f] = time.time()
                try:
                    f()
                except Exception as e:
                    print('coletor', f.__name__, repr(e), flush=True)
        time.sleep(1)


def historico(fonte, horas):
    with banco() as c:
        return [[int(r['t'].timestamp()), r['v']] for r in c.execute(
            "select t, v from serie where fonte=%s and t >= now() - %s order by t", [fonte, timedelta(hours=horas)]).fetchall()]


def painel():
    d = {}
    for chave in R.scan_iter(K + 'dado:*'):
        b = R.get(chave)
        if b:
            d[chave.decode()[len(K) + 5:]] = json.loads(b)
    d['notificacoes'] = [json.loads(x) for x in R.lrange(K + 'notificacoes', 0, 29)]
    d['historico'] = {f: historico(f, 24) for f in ('bateria', 'temperatura', 'memoria')}
    d['agora'] = time.time()
    return d


def avisar(d):
    R.publish(K + 'avisos', json.dumps(d, ensure_ascii=False, default=str))


def nome_conversa(c):
    return CONTAGEM.sub('', c or '').strip('‎‏‪‬ ')


def historico_guardar(d):
    app, conversa = d['app'], nome_conversa(d.get('conversa') or d.get('titulo'))[:200]
    if not conversa:
        return
    msgs = d.get('mensagens') or [{'texto': d.get('texto'), 'quem': d.get('titulo'), 't': d.get('t')}]
    chave, idx = K + f'hist:{app}:{conversa}', K + f'hist:idx:{app}'
    p = R.pipeline()
    ult = 0
    for m in msgs:
        t = int(m.get('t') or d.get('t') or time.time() * 1000)
        if not m.get('texto'):
            continue
        ult = max(ult, t)
        p.zadd(chave, {json.dumps({'quem': m.get('quem'), 'texto': m['texto'], 't': t}, ensure_ascii=False): t})
    if not ult:
        return
    p.zremrangebyrank(chave, 0, -HIST_MSGS - 1)
    p.expire(chave, HIST_DIAS * 86400)
    if ult > (R.zscore(idx, conversa) or 0):
        p.zadd(idx, {conversa: ult})
    p.zremrangebyscore(idx, 0, (time.time() - HIST_DIAS * 86400) * 1000)
    p.expire(idx, HIST_DIAS * 86400)
    p.execute()


def historico_conversas(app):
    saida = []
    for conversa, t in R.zrevrange(K + f'hist:idx:{app}', 0, 99, withscores=True):
        conversa = conversa.decode()
        chave = K + f'hist:{app}:{conversa}'
        ult = R.zrange(chave, -1, -1)
        if ult:
            saida.append({'conversa': conversa, 't': t, 'n': R.zcard(chave), 'ultima': json.loads(ult[0])})
    return saida


def historico_mensagens(app, conversa):
    return [json.loads(x) for x in R.zrange(K + f'hist:{app}:{conversa}', -HIST_MSGS, -1)]


def senha_hash(senha, sal=None):
    sal = sal or secrets.token_hex(16)
    return sal + '$' + hashlib.pbkdf2_hmac('sha256', senha.encode(), sal.encode(), 200_000).hex()


class Painel(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = 'Painel'

    def log_message(self, *a):
        pass

    def setup(self):
        super().setup()
        self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

    def ip(self):
        return ipaddress.ip_address(self.client_address[0])

    def responder(self, cod, corpo=b'', tipo='application/json', extra=None):
        if isinstance(corpo, (dict, list)):
            corpo = json.dumps(corpo, ensure_ascii=False, default=str).encode()
        elif isinstance(corpo, str):
            corpo = corpo.encode()
        self.send_response(cod)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(corpo)))
        self.send_header('Cache-Control', 'no-store')
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(corpo)

    def json(self):
        n = int(self.headers.get('Content-Length') or 0)
        if n > 2_000_000:
            raise ValueError('grande demais')
        return json.loads(self.rfile.read(n)) if n else {}

    def autorizado(self):
        if self.ip().is_loopback:
            return True
        t = cookies.SimpleCookie(self.headers.get('Cookie', '')).get('painel_sessao')
        return bool(t and R.exists(K + 'sessao:' + t.value))

    def sessao_nova(self):
        t = secrets.token_urlsafe(32)
        R.set(K + 'sessao:' + t, '1', ex=30 * 86400)
        return {'Set-Cookie': f'painel_sessao={t}; Path=/; HttpOnly; SameSite=Strict; Max-Age={30 * 86400}'}

    def tratar(self, metodo):
        if not any(self.ip() in r for r in REDES):
            return self.responder(403, {'erro': 'fora da rede local'})
        u = urlparse(self.path)
        rota, q = u.path, parse_qs(u.query)
        try:
            if rota.startswith('/api/app/'):
                if not self.ip().is_loopback:
                    return self.responder(403, {'erro': 'só o app do próprio celular'})
                return self.rota_app(rota)
            if rota == '/api/sessao':
                return self.responder(200, {'logado': self.autorizado(), 'criar_senha': cfg_ler('senha') is None})
            if rota in ('/api/entrar', '/api/senha') and metodo == 'POST':
                return self.entrar(rota)
            if rota.startswith('/api/') and not self.autorizado():
                return self.responder(401, {'erro': 'entre primeiro'})
            if rota == '/api/ajustes':
                if metodo == 'POST':
                    d, a = self.json(), ajustes()
                    if 'janela_s' in d:
                        a['janela_s'] = int(min(86400, max(5, int(d['janela_s']))))
                    if 'duracao_s' in d:
                        a['duracao_s'] = int(min(300, max(5, int(d['duracao_s']))))
                    if d.get('tema') in ('auto', 'escuro', 'claro'):
                        a['tema'] = d['tema']
                    for k, v in (d.get('fontes') or {}).items():
                        if k in a['fontes']:
                            a['fontes'][k] = bool(v)
                    cfg_gravar('ajustes', a)
                    avisar({'tipo': 'ajustes', 'ajustes': a})
                return self.responder(200, ajustes())
            if rota == '/api/avisos':
                return self.avisos()
            if rota == '/api/historico':
                app, conversa = q.get('app', [''])[0], q.get('conversa', [None])[0]
                return self.responder(200, historico_mensagens(app, conversa) if conversa else historico_conversas(app))
            if rota == '/api/painel':
                return self.responder(200, painel())
            if rota == '/api/layout':
                if metodo == 'POST':
                    cfg_gravar('layout', self.json())
                return self.responder(200, cfg_ler('layout', LAYOUT_PADRAO))
            if rota == '/api/layout/padrao' and metodo == 'POST':
                cfg_gravar('layout', LAYOUT_PADRAO)
                return self.responder(200, LAYOUT_PADRAO)
            if rota == '/api/notificacoes/limpar' and metodo == 'POST':
                R.delete(K + 'notificacoes')
                return self.responder(200, {'ok': True})
            if metodo == 'GET' and not rota.startswith('/api/'):
                return self.estatico(rota)
            self.responder(404, {'erro': 'não achei'})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:
            print('erro', rota, repr(e), flush=True)
            try:
                self.responder(500, {'erro': 'falha interna'})
            except Exception:
                pass

    def do_GET(self):
        self.tratar('GET')

    def do_POST(self):
        self.tratar('POST')

    def entrar(self, rota):
        d = self.json()
        senha, atual = str(d.get('senha', '')), cfg_ler('senha')
        if rota == '/api/senha':
            if atual is not None and not self.autorizado():
                return self.responder(403, {'erro': 'a senha já existe'})
            if len(senha) < 6:
                return self.responder(400, {'erro': 'a senha precisa de 6 caracteres ou mais'})
            cfg_gravar('senha', senha_hash(senha))
            return self.responder(200, {'ok': True}, extra=self.sessao_nova())
        chave = K + 'tentativas:' + self.client_address[0]
        if int(R.get(chave) or 0) >= 8:
            return self.responder(429, {'erro': 'muitas tentativas; espere 10 minutos'})
        if atual and hmac.compare_digest(senha_hash(senha, atual.split('$', 1)[0]), atual):
            R.delete(chave)
            return self.responder(200, {'ok': True}, extra=self.sessao_nova())
        R.incr(chave)
        R.expire(chave, 600)
        return self.responder(401, {'erro': 'senha incorreta'})

    def rota_app(self, rota):
        d = self.json()
        if rota == '/api/app/dispositivo':
            guardar('dispositivo', d)
        elif rota == '/api/app/notificacao':
            if not d.get('removida'):
                txt = f"{d.get('titulo', '')} {d.get('texto', '')}".lower()
                if any(a in txt for a in AVISO_DE_SISTEMA) and not d.get('quantas', 1) > 1:
                    return self.responder(200, {'ok': True, 'ignorada': True})
                if d.get('app') in TIPO_APP:
                    historico_guardar(d)
            lista = [json.loads(x) for x in R.lrange(K + 'notificacoes', 0, 99)]
            lista = [n for n in lista if n.get('chave') != d.get('chave')]
            if not d.get('removida') and d.get('app') in TIPO_APP:
                nova = {k: d.get(k) for k in ('chave', 'app', 'titulo', 'texto', 'conversa', 't', 'quantas')}
                nova['tipo'] = TIPO_APP[nova['app']]
                lista.insert(0, nova)
                a, t = ajustes(), (nova.get('t') or 0) / 1000
                ultimo = float(R.hget(K + 'alertado', nova['chave']) or 0)
                if a['fontes'].get(nova['tipo'], True) and time.time() - t <= a['janela_s'] and t > ultimo:
                    if R.hlen(K + 'alertado') > 2000:
                        R.delete(K + 'alertado')
                    R.hset(K + 'alertado', nova['chave'], t)
                    avisar({'tipo': 'mensagem', 'mensagem': nova})
            p = R.pipeline()
            p.delete(K + 'notificacoes')
            if lista:
                p.rpush(K + 'notificacoes', *[json.dumps(n, ensure_ascii=False) for n in lista[:100]])
            p.execute()
        else:
            return self.responder(404, {'erro': 'não achei'})
        return self.responder(200, {'ok': True})

    def avisos(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Connection', 'close')
        self.end_headers()
        ps = R.pubsub(ignore_subscribe_messages=True)
        ps.subscribe(K + 'avisos')
        try:
            self.wfile.write(b'retry: 2000\n\n')
            self.wfile.flush()
            while True:
                m = ps.get_message(timeout=15)
                self.wfile.write(b'data: ' + m['data'] + b'\n\n' if m else b': vivo\n\n')
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            ps.close()
            self.close_connection = True

    def estatico(self, rota):
        nome = 'index.html' if rota in ('/', '') else rota.lstrip('/')
        cam = os.path.realpath(os.path.join(WEB, nome))
        if not cam.startswith(os.path.realpath(WEB) + os.sep) or not os.path.isfile(cam):
            return self.responder(404, 'não achei', 'text/plain; charset=utf-8')
        with open(cam, 'rb') as f:
            self.responder(200, f.read(), TIPOS.get(os.path.splitext(cam)[1], 'application/octet-stream'))


class Servidor(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    preparar()
    threading.Thread(target=coletor, daemon=True).start()
    print(f'painel na porta {PORTA}', flush=True)
    Servidor(('0.0.0.0', PORTA), Painel).serve_forever()
