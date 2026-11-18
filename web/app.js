'use strict';
const $ = (s) => document.querySelector(s);
const N = window.Nativo || null;
let layout = null, dados = {}, paginaAtual = 0;

async function api(rota, opc = {}) {
  const r = await fetch(rota, { headers: opc.body ? { 'Content-Type': 'application/json' } : {}, ...opc, body: opc.body ? JSON.stringify(opc.body) : undefined });
  if (r.status === 401) { $('#login').hidden = false; throw new Error('sessão'); }
  const j = await r.json();
  if (!r.ok) throw new Error(j.erro || 'falhou');
  return j;
}

function cardHtml(id) {
  const w = WIDGETS[id];
  if (!w) return '';
  let corpo;
  try { corpo = w.grande(dados); } catch (e) { corpo = '<div class="cta">Sem dados ainda.</div>'; }
  return `<section class="w${w.largo ? ' largo' : ''}" data-w="${id}"><h3>${w.icone}${w.titulo}</h3><div class="corpo">${corpo}</div></section>`;
}

function chipHtml(id) {
  const w = WIDGETS[id];
  if (!w) return '';
  let txt = '—', ic = w.icone;
  try { txt = w.mini(dados); ic = w.iconeMini ? w.iconeMini(dados) : w.icone; } catch (e) {}
  return `<div class="chip ${w.classe || ''}" data-w="${id}">${w.classe === 'relogio' ? '' : ic}<b class="num">${esc(txt)}</b></div>`;
}

function montar() {
  $('#trilho').innerHTML = layout.paginas.map((p, i) => `<div class="pag" data-pag="${i}">${p.widgets.map(cardHtml).join('')}</div>`).join('');
  $('#pontos').innerHTML = layout.paginas.map((_, i) => `<i class="${i === paginaAtual ? 'on' : ''}"></i>`).join('');
  pintarTopo();
  irPara(paginaAtual, false);
  levarDinamicos();
}
function atualizar() {
  layout.paginas.forEach((p, i) => {
    const pag = document.querySelector(`.pag[data-pag="${i}"]`);
    if (!pag) return;
    p.widgets.forEach((id) => {
      const el = pag.querySelector(`[data-w="${id}"] .corpo`);
      if (!el) return;
      const novo = document.createElement('div');
      novo.innerHTML = cardHtml(id);
      const corpo = novo.querySelector('.corpo').innerHTML;
      if (el.innerHTML !== corpo) el.innerHTML = corpo;
    });
  });
  pintarTopo();
}
function pintarTopo() {
  $('#fixos').innerHTML = layout.fixos.map(chipHtml).join('');
  $('#nome-pagina').textContent = layout.paginas[paginaAtual]?.nome || 'Painel';
  [...$('#pontos').children].forEach((p, i) => p.classList.toggle('on', i === paginaAtual));
}
function irPara(i, suave = true) {
  const t = $('#trilho');
  t.scrollTo({ left: i * t.clientWidth, behavior: suave ? 'smooth' : 'auto' });
}
$('#trilho').addEventListener('scroll', () => {
  const t = $('#trilho'), i = Math.round(t.scrollLeft / t.clientWidth);
  if (i !== paginaAtual) { paginaAtual = i; pintarTopo(); levarDinamicos(); try { localStorage.setItem('pagina', i); } catch (e) {} }
}, { passive: true });
$('#pontos').onclick = (ev) => { const i = [...$('#pontos').children].indexOf(ev.target); if (i >= 0) irPara(i); };

async function ciclo() {
  try { dados = await api('/api/painel'); atualizar(); } catch (e) {}
}

let segurar = null;
document.addEventListener('pointerdown', (ev) => {
  const alvo = ev.target.closest('[data-w]'), pag = ev.target.closest('.pag');
  if (!alvo && !pag) return;
  const x = ev.clientX, y = ev.clientY;
  alvo?.classList.add('segurando');
  segurar = { alvo, x, y, t: setTimeout(() => { alvo?.classList.remove('segurando'); segurar = null; abrirFolha(alvo ? alvo.dataset.w : null, pag ? +pag.dataset.pag : paginaAtual); if (N && N.vibrar) N.vibrar(); }, 550) };
});
const soltar = (ev) => {
  if (!segurar) return;
  if (ev.type === 'pointermove' && Math.hypot(ev.clientX - segurar.x, ev.clientY - segurar.y) < 10) return;
  clearTimeout(segurar.t); segurar.alvo?.classList.remove('segurando'); segurar = null;
};
['pointerup', 'pointercancel', 'pointermove'].forEach((e) => document.addEventListener(e, soltar));
document.addEventListener('contextmenu', (e) => e.preventDefault());

function ondeEsta(id) {
  if (layout.fixos.includes(id)) return 'fixo';
  const i = layout.paginas.findIndex((p) => p.widgets.includes(id));
  return i >= 0 ? i : 'oculto';
}
function tirar(id) {
  layout.fixos = layout.fixos.filter((x) => x !== id);
  layout.paginas.forEach((p) => { p.widgets = p.widgets.filter((x) => x !== id); });
}
let segurouEm = 0;
function abrirFolha(id, pagina) {
  segurouEm = Date.now();
  const f = $('#folha');
  if (!id) {
    const ocultos = Object.keys(WIDGETS).filter((k) => ondeEsta(k) === 'oculto');
    f.innerHTML = `<div class="caixa"><h4>Adicionar em "${esc(layout.paginas[pagina].nome)}"</h4>
      <div class="opcoes">${ocultos.map((k) => `<button data-add="${k}">${esc(WIDGETS[k].titulo)}</button>`).join('') || '<span class="sub">Todos os indicadores já estão em uso.</span>'}</div>
      <small>Layout</small><div class="opcoes"><button data-padrao="1">Voltar ao layout original</button><button data-fechar="1">Fechar</button></div></div>`;
  } else {
    const onde = ondeEsta(id), w = WIDGETS[id], pi = typeof onde === 'number' ? onde : -1;
    f.innerHTML = `<div class="caixa"><h4>${esc(w.titulo)}</h4>
      <small>Mostrar em</small><div class="opcoes">${layout.paginas.map((p, i) => `<button data-pag-dest="${i}" class="${onde === i ? 'atual' : ''}">${esc(p.nome)}</button>`).join('')}
      <button data-fixar="1" class="${onde === 'fixo' ? 'atual' : ''}">Todas as páginas (faixa de cima)</button></div>
      <small>Arrumar</small><div class="opcoes">${pi >= 0 ? '<button data-mover="-1">Mover para a esquerda</button><button data-mover="1">Mover para a direita</button>' : ''}
      <button data-ocultar="1">Ocultar</button><button data-fechar="1">Fechar</button></div></div>`;
  }
  f.hidden = false;
  f.onclick = async (ev) => {
    const b = ev.target.closest('button');
    if (ev.target === f || b?.dataset.fechar) { f.hidden = true; return; }
    if (!b) return;
    if (b.dataset.padrao) { layout = await api('/api/layout/padrao', { method: 'POST' }); f.hidden = true; montar(); return; }
    if (b.dataset.add) layout.paginas[pagina].widgets.push(b.dataset.add);
    if (b.dataset.pagDest) { tirar(id); layout.paginas[+b.dataset.pagDest].widgets.push(id); }
    if (b.dataset.fixar) { tirar(id); layout.fixos.push(id); }
    if (b.dataset.ocultar) tirar(id);
    if (b.dataset.mover) {
      const l = layout.paginas[ondeEsta(id)].widgets, i = l.indexOf(id), j = i + +b.dataset.mover;
      if (j >= 0 && j < l.length) [l[i], l[j]] = [l[j], l[i]];
    }
    f.hidden = true;
    layout = await api('/api/layout', { method: 'POST', body: layout });
    montar();
  };
}

const JANELAS = [[10, '10 s'], [60, '1 min'], [300, '5 min'], [600, '10 min']];
const DURACOES = [[10, '10 s'], [15, '15 s'], [30, '30 s'], [60, '1 min']];
const TEMAS = [['escuro', 'Escuro'], ['claro', 'Claro'], ['auto', 'Igual ao sistema']];
function abrirAjustes() {
  const f = $('#folha'), outro = !JANELAS.some(([v]) => v === aj.janela_s);
  f.innerHTML = `<div class="caixa"><h4>Ajustes</h4>
    <small>Mostrar card só de mensagens recebidas nos últimos</small>
    <div class="opcoes">${JANELAS.map(([v, r]) => `<button data-janela="${v}" class="${aj.janela_s === v ? 'atual' : ''}">${r}</button>`).join('')}<button data-janela-outro="1" class="${outro ? 'atual' : ''}">Outro tempo</button></div>
    <div class="campo" ${outro ? '' : 'hidden'} id="janela-outro"><input type="number" min="5" max="86400" id="janela-seg" value="${aj.janela_s}" aria-label="Segundos"><span class="sub">segundos</span><button class="btn s" data-janela-salvar="1">Salvar</button></div>
    <small>Tempo do card na tela</small>
    <div class="opcoes">${DURACOES.map(([v, r]) => `<button data-duracao="${v}" class="${aj.duracao_s === v ? 'atual' : ''}">${r}</button>`).join('')}</div>
    <small>Tema</small>
    <div class="opcoes">${TEMAS.map(([v, r]) => `<button data-tema="${v}" class="${aj.tema === v ? 'atual' : ''}">${r}</button>`).join('')}</div>
    <small style="margin-top:12px">Avisar na tela</small>
    ${[['whatsapp', 'WhatsApp'], ['business', 'WhatsApp Business']].map(([k, r]) => `<label class="liga">${r}<input type="checkbox" data-fonte="${k}" ${aj.fontes[k] !== false ? 'checked' : ''}></label>`).join('')}
    <small style="margin-top:12px">Indicadores</small><p class="sub" style="margin:0 0 10px;font-size:13px">Segure o dedo sobre um indicador para mudar de página, fixar na faixa de cima ou ocultar.</p>
    <div class="opcoes"><button data-fechar="1">Fechar</button></div></div>`;
  f.hidden = false;
  const salvar = async (d) => { aj = await api('/api/ajustes', { method: 'POST', body: d }); abrirAjustes(); };
  f.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (ev.target === f || b?.dataset.fechar) { f.hidden = true; return; }
    if (!b) return;
    if (b.dataset.janela) salvar({ janela_s: +b.dataset.janela });
    if (b.dataset.janelaOutro) { $('#janela-outro').hidden = false; $('#janela-seg').focus(); }
    if (b.dataset.janelaSalvar) salvar({ janela_s: +$('#janela-seg').value || 60 });
    if (b.dataset.duracao) salvar({ duracao_s: +b.dataset.duracao });
    if (b.dataset.tema) { aj.tema = b.dataset.tema; aplicarTema(); salvar({ tema: b.dataset.tema }); }
  };
  f.onchange = (ev) => {
    const k = ev.target.dataset.fonte;
    if (k) salvar({ fontes: { [k]: ev.target.checked } });
  };
}

const temaSistema = matchMedia('(prefers-color-scheme: dark)');
function aplicarTema() {
  const t = aj.tema === 'auto' ? (temaSistema.matches ? 'escuro' : 'claro') : aj.tema === 'claro' ? 'claro' : 'escuro';
  document.documentElement.classList.add('trocando-tema');
  document.documentElement.dataset.tema = t;
  setTimeout(() => document.documentElement.classList.remove('trocando-tema'), 400);
  document.querySelector('meta[name=theme-color]').content = t === 'claro' ? '#f3f5f9' : '#07090e';
  try { localStorage.setItem('tema', t); } catch (e) {}
}
temaSistema.addEventListener('change', () => { if (aj.tema === 'auto') aplicarTema(); });
$('#ajustes-btn').innerHTML = IC.engrenagem;
$('#ajustes-btn').onclick = abrirAjustes;

const APP_DO_WIDGET = { whatsapp: 'com.whatsapp', mini_whatsapp: 'com.whatsapp', whatsapp_business: 'com.whatsapp.w4b', mini_business: 'com.whatsapp.w4b' };
document.addEventListener('click', (ev) => {
  if (Date.now() - segurouEm < 700 || ev.target.closest('[data-acao]')) return;
  const w = ev.target.closest('[data-w]'), app = w && APP_DO_WIDGET[w.dataset.w];
  if (app) Historico.abrir(app, ev.target.closest('[data-conversa]')?.dataset.conversa);
});

function teclado(k) {
  if (Historico.aberto()) return Historico.tecla(k);
  if (!$('#folha').hidden) { if (k === 'Escape') $('#folha').hidden = true; return; }
  const ult = layout.paginas.length - 1;
  if (k === 'ArrowRight' || k === 'ArrowLeft') return irPara(Math.max(0, Math.min(ult, paginaAtual + (k === 'ArrowRight' ? 1 : -1))));
  if (k === 'Home' || k === 'End') return irPara(k === 'Home' ? 0 : ult);
}
document.addEventListener('keydown', (ev) => {
  if (ev.target.matches('input, textarea')) return;
  teclado(ev.key);
});

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-acao]');
  if (!b) return;
  if (!N) { alert('Isso só funciona dentro do app Painel.'); return; }
  if (b.dataset.acao === 'notificacoes') N.acessoNotificacoes();
});

$('#login-form').onsubmit = async (ev) => {
  ev.preventDefault();
  try {
    const s = await api('/api/sessao');
    await api(s.criar_senha ? '/api/senha' : '/api/entrar', { method: 'POST', body: { senha: $('#login-senha').value } });
    $('#login').hidden = true; iniciar();
  } catch (e) { $('#login-erro').textContent = e.message; }
};

const dinamicos = new Map();
function paginaVisivel() { return document.querySelector(`.pag[data-pag="${paginaAtual}"]`); }
function abrirDinamico(id, classe, html, segundos) {
  fecharDinamico(id, true);
  const pag = paginaVisivel();
  if (!pag) return;
  const el = document.createElement('section');
  el.className = 'w dinamico ' + classe;
  el.dataset.din = id;
  el.innerHTML = html + (segundos ? `<i class="tempo" style="animation-duration:${segundos}s"></i>` : '');
  pag.prepend(el);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('dentro'); ajustarPaginas(); }));
  dinamicos.set(id, { el, timer: segundos ? setTimeout(() => fecharDinamico(id), segundos * 1000) : null });
  if (dinamicos.size > 2) fecharDinamico(dinamicos.keys().next().value);
  return el;
}
function fecharDinamico(id, ja) {
  const d = dinamicos.get(id);
  if (!d) return;
  dinamicos.delete(id);
  clearTimeout(d.timer);
  if (ja) { d.el.remove(); ajustarPaginas(); return; }
  d.el.classList.remove('dentro');
  ajustarPaginas();
  setTimeout(() => d.el.remove(), 480);
}
function ajustarPaginas() {
  document.querySelectorAll('.pag').forEach((pag) => {
    const din = pag.querySelectorAll('.w.dinamico.dentro').length;
    const normais = [...pag.querySelectorAll('.w:not(.dinamico)')];
    const cabem = din ? Math.max(0, 3 - din) : normais.length;
    normais.forEach((w, i) => w.classList.toggle('recolhido', i >= cabem));
  });
}
function levarDinamicos() {
  const pag = paginaVisivel();
  if (!pag) return;
  [...dinamicos.values()].reverse().forEach((d) => { if (d.el.parentNode !== pag) pag.prepend(d.el); });
  ajustarPaginas();
}

let aj = { janela_s: 60, duracao_s: 15, fontes: {} };
function mostrarMensagem(n) {
  const biz = n.app === 'com.whatsapp.w4b';
  const grupo = n.conversa && n.titulo && n.conversa !== n.titulo;
  abrirDinamico('msg-' + n.chave, 'zap', `<div class="cab">${biz ? IC.msgB : IC.msg}${biz ? 'WhatsApp Business' : 'WhatsApp'} · agora</div>
    <div class="quem">${esc(n.conversa || n.titulo)}</div>${grupo ? `<div class="autor">${esc(n.titulo)}</div>` : ''}
    <div class="texto">${esc(n.texto)}</div>`, aj.duracao_s);
}

function ouvir() {
  const es = new EventSource('/api/avisos');
  es.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.tipo === 'mensagem') { mostrarMensagem(d.mensagem); ciclo(); Historico.novaMensagem(d.mensagem); }
    if (d.tipo === 'ajustes') { aj = d.ajustes; aplicarTema(); }
  };
}

async function iniciar() {
  const s = await api('/api/sessao');
  if (!s.logado) {
    $('#login').hidden = false;
    $('#login-tit').textContent = s.criar_senha ? 'Crie a senha do Painel (6 ou mais)' : 'Painel';
    return;
  }
  try { paginaAtual = +(localStorage.getItem('pagina') || 0); } catch (e) {}
  layout = await api('/api/layout');
  aj = await api('/api/ajustes');
  aplicarTema();
  dados = await api('/api/painel');
  paginaAtual = Math.min(paginaAtual, layout.paginas.length - 1);
  montar();
  setInterval(() => { if (!document.hidden) ciclo(); }, 5000);
  ouvir();
  setInterval(pintarTopo, 20000);
}
iniciar();
