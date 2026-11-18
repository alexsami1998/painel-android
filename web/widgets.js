'use strict';
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const virg = (n, c) => n.toFixed(c).replace('.', ',');
const GB = (b) => b == null ? '—' : b >= 1e9 ? virg(b / 1e9, b >= 1e10 ? 0 : 1) + ' GB' : Math.round(b / 1e6) + ' MB';
const MB = (b) => b == null ? '—' : b >= 1e9 ? virg(b / 1e9, 1) + ' GB' : Math.round(b / 1e6) + ' MB';
const pct = (v) => v == null ? '—' : Math.round(v) + '%';
const moeda = (v) => v == null ? '—' : (v < 0 ? '-' : '') + 'R$ ' + Math.abs(v).toFixed(2).replace('.', ',');
const sinal = (v, f) => v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + f(Math.abs(v));
const duracao = (s) => { if (s == null) return '—'; const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}min` : `${m} min`; };
const ha = (t) => { if (!t) return '—'; const s = Date.now() / 1000 - t; return s < 90 ? 'agora' : s < 3600 ? `há ${Math.round(s / 60)} min` : s < 86400 ? `há ${Math.round(s / 3600)} h` : `há ${Math.round(s / 86400)} d`; };
const corNivel = (v, inv) => { if (v == null) return 'var(--fraco)'; const r = inv ? 100 - v : v; return r <= 15 ? 'var(--perigo)' : r <= 30 ? 'var(--alerta)' : 'var(--verde)'; };
const fmtN = (n) => n == null ? '—' : n >= 1e6 ? virg(n / 1e6, 1) + ' mi' : n >= 1e3 ? Math.round(n / 1e3) + ' mil' : String(n);

const IC = {
  bateria: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2"/></svg>',
  raio: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  disco: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
  chip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
  servicos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>',
  ia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M5.6 18.4l2.9-2.9M15.5 8.5l2.9-2.9"/></svg>',
  grafico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  lista: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
  msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z"/></svg>',
  msgB: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z"/><path d="M10 8.5h2.6a1.7 1.7 0 010 3.4H10zM10 11.9h3a1.8 1.8 0 010 3.6h-3z" stroke-width="1.6"/></svg>',
  engrenagem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  relogio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

function anel(v, cor, centro, rotulo) {
  const r = 52, c = 2 * Math.PI * r, f = Math.max(0, Math.min(100, v || 0)) / 100;
  return `<svg class="g" viewBox="0 0 130 130" role="img" aria-label="${esc(rotulo || '')} ${pct(v)}">
    <circle cx="65" cy="65" r="${r}" fill="none" stroke="var(--card2)" stroke-width="12"/>
    ${f > 0 ? `<circle cx="65" cy="65" r="${r}" fill="none" stroke="${cor}" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 65 65)"/>` : ''}
    <text x="65" y="${rotulo ? 66 : 73}" text-anchor="middle" fill="var(--txt)" font-size="${String(centro).length > 4 ? 22 : 30}" font-weight="700" class="num">${esc(centro)}</text>
    ${rotulo ? `<text x="65" y="88" text-anchor="middle" fill="var(--sub)" font-size="11">${esc(rotulo)}</text>` : ''}
  </svg>`;
}

function spark(pts, cor, min, max) {
  if (!pts || pts.length < 2) return '<svg class="spark" viewBox="0 0 300 46" preserveAspectRatio="none" aria-hidden="true"><path d="M0,40 L300,40" stroke="var(--linha)" stroke-width="2" stroke-dasharray="4 6" vector-effect="non-scaling-stroke"/></svg>';
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = xs[0], x1 = xs[xs.length - 1] || x0 + 1;
  const lo = min ?? Math.min(...ys), hi = max ?? Math.max(...ys), amp = hi - lo || 1;
  const P = pts.map((p) => `${((p[0] - x0) / (x1 - x0) * 300).toFixed(1)},${(44 - (p[1] - lo) / amp * 40).toFixed(1)}`);
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  return `<svg class="spark" viewBox="0 0 300 46" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cor}" stop-opacity=".35"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></linearGradient></defs>
    <path d="M0,46 L${P.join(' L')} L300,46 Z" fill="url(#${id})"/><path d="M${P.join(' L')}" fill="none" stroke="${cor}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}

const SAUDE = { 2: ['Boa', 'bom'], 3: ['Superaquecida', 'ruim'], 4: ['Gasta', 'ruim'], 5: ['Sobretensão', 'ruim'], 6: ['Falha', 'ruim'], 7: ['Fria demais', 'atencao'] };
const vazio = (msg) => `<div class="cta">${msg}</div>`;
const pedirAcesso = (txt) => `<div class="cta">${txt}<button class="btn" data-acao="notificacoes">Liberar acesso</button></div>`;

function blocoUso(u, rotulo) {
  return `<div class="anel coluna">${anel(u?.uso, corNivel(u?.uso, true), pct(u?.uso), rotulo)}
    <div class="info"><div class="dado"><small>Renova em</small><b>${u?.renova_s != null ? duracao(u.renova_s) : '—'}</b></div>
    <div class="dado"><small>Lido</small><b>${ha(u?.t)}</b></div></div></div>`;
}

const WIDGETS = {
  relogio: {
    titulo: 'Relógio', icone: IC.relogio,
    grande: () => { const d = new Date(); return `<div class="cta" style="color:var(--txt)"><div class="grande num">${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div><div class="sub">${d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div></div>`; },
    mini: () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), classe: 'relogio',
  },

  bateria: {
    titulo: 'Bateria', icone: IC.bateria,
    grande: (d) => {
      const b = d.dispositivo;
      if (!b) return vazio('Abra o app Painel no celular para ler a bateria.');
      const s = SAUDE[b.saude] || ['—', ''];
      return `<div class="anel">${anel(b.nivel, corNivel(b.nivel), Math.round(b.nivel) + '%', b.carregando ? 'carregando' : 'na bateria')}
        <div class="info">
          <div class="dado"><small>Saúde</small><b class="${s[1]}">${s[0]}</b></div>
          <div class="dado"><small>Temperatura</small><b class="num ${b.temperatura >= 42 ? 'ruim' : b.temperatura >= 38 ? 'atencao' : ''}">${virg(b.temperatura || 0, 1)} °C</b></div>
          <div class="dado"><small>${b.carregando ? 'Fonte' : 'Tensão'}</small><b class="num">${b.carregando ? (b.fonte || 'tomada') : virg(b.tensao / 1000, 2) + ' V'}</b></div>
        </div></div>${spark(d.historico?.bateria, 'var(--verde)', 0, 100)}`;
    },
    mini: (d) => d.dispositivo ? `${Math.round(d.dispositivo.nivel)}%` : '—', iconeMini: (d) => d.dispositivo?.carregando ? IC.raio : IC.bateria,
  },

  armazenamento: {
    titulo: 'Armazenamento', icone: IC.disco,
    grande: (d) => {
      const s = d.sistema;
      if (!s) return vazio('Lendo...');
      const usado = 100 * (1 - s.disco_livre / s.disco_total);
      const srv = (d.servicos?.lista || []).filter((x) => x.disco).sort((a, b) => b.disco - a.disco).slice(0, 4);
      const maior = Math.max(...srv.map((x) => x.disco), 1);
      return `<div class="anel" style="flex:0 0 auto;height:118px">${anel(usado, corNivel(usado, true), GB(s.disco_livre), 'livres')}
        <div class="info"><div class="dado"><small>Total</small><b class="num">${GB(s.disco_total)}</b></div>
        <div class="dado"><small>Em uso</small><b class="num">${pct(usado)}</b></div></div></div>
        <div class="barras">${srv.map((x) => `<div class="barra-l"><span>${esc(x.nome)}</span><span class="trilha"><i style="width:${(x.disco / maior * 100).toFixed(0)}%;background:var(--azul)"></i></span><span class="num">${MB(x.disco)}</span></div>`).join('')}</div>`;
    },
    mini: (d) => d.sistema ? `${GB(d.sistema.disco_livre)} livres` : '—',
  },

  memoria: {
    titulo: 'Memória', icone: IC.chip,
    grande: (d) => {
      const s = d.sistema;
      if (!s) return vazio('Lendo...');
      const usado = 100 * (1 - s.mem_livre / s.mem_total);
      return `<div class="anel">${anel(usado, corNivel(usado, true), pct(usado), 'em uso')}
        <div class="info"><div class="dado"><small>Livre</small><b class="num">${GB(s.mem_livre)}</b></div>
        <div class="dado"><small>Total</small><b class="num">${GB(s.mem_total)}</b></div>
        <div class="dado"><small>Ligado há</small><b class="num">${duracao(s.ligado_s)}</b></div></div></div>
        ${spark(d.historico?.memoria, 'var(--azul)', 0, 100)}`;
    },
    mini: (d) => d.sistema ? `${pct(100 * (1 - d.sistema.mem_livre / d.sistema.mem_total))} RAM` : '—',
  },

  whatsapp: conversas('com.whatsapp', 'WhatsApp', IC.msg),
  whatsapp_business: conversas('com.whatsapp.w4b', 'WhatsApp Business', IC.msgB),

  servicos: {
    titulo: 'Serviços', icone: IC.servicos, largo: true,
    grande: (d) => {
      const l = d.servicos?.lista || Array.from({ length: 6 }, () => ({}));
      return `<div class="servicos">${l.map((x) => {
        const cls = x.ok ? 'ok' : x.rodando ? 'meio' : x.nome ? 'parado' : '';
        const est = x.nome ? (x.ok ? (x.ha != null ? 'no ar há ' + duracao(x.ha) : x.detalhe || 'no ar') : x.detalhe || (x.rodando ? 'sem resposta' : 'parado')) : '—';
        return `<div class="srv ${cls}"><div><b>${esc(x.nome || 'Serviço')}</b><div class="sub" style="font-size:12px">${esc(est)}</div></div>
          <div class="met"><span>CPU <b class="num">${x.cpu != null ? virg(x.cpu, 1) + '%' : '—'}</b></span><span>RAM <b class="num">${MB(x.memoria)}</b></span><span>Disco <b class="num">${MB(x.disco)}</b></span></div></div>`;
      }).join('')}</div>`;
    },
    mini: (d) => { const l = d.servicos?.lista; return l ? `${l.filter((x) => x.ok).length}/${l.length} no ar` : '—'; },
  },

  ia_sessao: {
    titulo: 'IA · sessão', icone: IC.ia,
    grande: (d) => blocoUso(d.ia?.sessao, 'janela 5 h'),
    mini: (d) => `IA ${pct(d.ia?.sessao?.uso)}`,
  },
  ia_semana: {
    titulo: 'IA · semana', icone: IC.ia,
    grande: (d) => blocoUso(d.ia?.semana, 'semana'),
    mini: (d) => `Semana ${pct(d.ia?.semana?.uso)}`,
  },
  ia_tokens: {
    titulo: 'IA · tokens', icone: IC.ia,
    grande: (d) => {
      const p = d.ia?.tokens || {};
      return `<div class="dado"><small>Hoje</small><span class="grande num">${fmtN(p.hoje)}</span></div>
        <div style="display:flex;gap:18px;margin-top:10px"><div class="dado"><small>Últimas 5 h</small><b class="num">${fmtN(p.cinco_h)}</b></div>
        <div class="dado"><small>7 dias</small><b class="num">${fmtN(p.semana)}</b></div></div>
        <div class="sub" style="margin-top:auto;font-size:12px">atualizado ${ha(d.ia?.t)}</div>`;
    },
    mini: (d) => `${fmtN(d.ia?.tokens?.hoje)} tokens`,
  },

  patrimonio: {
    titulo: 'Carteira · patrimônio', icone: IC.grafico, largo: true,
    grande: (d) => {
      const v = d.carteira || {};
      const total = v.patrimonio != null && v.inicio ? (v.patrimonio / v.inicio - 1) * 100 : null;
      return `<div style="display:flex;align-items:flex-end;gap:22px">
        <div class="dado"><small>Patrimônio</small><span class="grande num">${moeda(v.patrimonio)}</span></div>
        <div class="dado"><small>Hoje</small><b class="medio num ${v.dia >= 0 ? 'bom' : v.dia < 0 ? 'ruim' : ''}">${sinal(v.dia, moeda)}</b></div>
        <div class="dado"><small>Desde o início</small><b class="medio num ${total >= 0 ? 'bom' : total < 0 ? 'ruim' : ''}">${sinal(total, (x) => virg(x, 1) + '%')}</b></div></div>
        <div style="flex:1;display:flex;margin-top:8px;min-height:0">${spark(v.historico, v.dia < 0 ? 'var(--perigo)' : 'var(--verde)').replace('class="spark"', 'class="spark" style="height:100%"')}</div>
        <div class="sub" style="font-size:12px">7 dias · ${v.abertas ?? '—'} posição(ões) aberta(s)</div>`;
    },
    mini: (d) => moeda(d.carteira?.patrimonio),
  },
  operacoes: {
    titulo: 'Operações', icone: IC.lista,
    grande: (d) => {
      const v = d.carteira || {};
      const l = v.ultimas || Array.from({ length: 4 }, () => ({}));
      return `<div style="display:flex;gap:16px;margin-bottom:8px"><div class="dado"><small>Hoje</small><b class="medio num">${v.ops_hoje ?? '—'}</b></div>
        <div class="dado"><small>Ganhos</small><b class="medio num bom">${v.ganhos_hoje ?? '—'}</b></div>
        <div class="dado"><small>Resultado</small><b class="medio num ${v.soma_hoje >= 0 ? 'bom' : v.soma_hoje < 0 ? 'ruim' : ''}">${sinal(v.soma_hoje, moeda)}</b></div></div>
        <div class="lista">${l.map((o) => `<div class="item"><div class="t"><b>${esc(o.ativo || '—')}${o.estrategia ? ' · ' + esc(o.estrategia) : ''}</b><span>${esc(o.lado || '—')} · ${esc(o.hora || '--:--')}</span></div>
          <b class="num ${o.resultado >= 0 ? 'bom' : o.resultado < 0 ? 'ruim' : ''}">${sinal(o.resultado, moeda)}</b></div>`).join('')}</div>`;
    },
    mini: (d) => `${d.carteira?.ops_hoje ?? '—'} ops hoje`,
  },

  camera_vivo: {
    titulo: 'Câmera', icone: IC.camera, largo: true,
    grande: (d) => {
      const c = d.camera || {};
      const u = (c.ultimos || []).find((e) => e.imagem);
      return `<div class="destaque">${u ? `<img src="${esc(u.imagem)}" alt="Último evento">` : '<div class="sem-sinal">sem sinal</div>'}
        <div class="rot"><div><b style="font-size:18px">${u ? esc(u.principal) : 'Nenhum evento'}</b><div>${u ? 'às ' + esc(u.hora) : ''}</div></div>
        <span class="chip" style="background:#000a"><i style="width:8px;height:8px;border-radius:50%;background:${c.monitorando ? 'var(--verde)' : 'var(--fraco)'}"></i>${c.monitorando ? 'vigiando' : 'parada'}</span></div></div>
        <div style="display:flex;gap:16px;margin-top:8px"><div class="dado"><small>Alertas hoje</small><b class="num">${c.hoje ?? '—'}</b></div>
        <div class="dado"><small>Pessoas hoje</small><b class="num">${c.pessoas_hoje ?? '—'}</b></div>
        <div class="dado" style="min-width:0"><small>Conhecidos</small><b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((c.conhecidos_hoje || []).join(', ') || '—')}</b></div></div>`;
    },
    mini: (d) => `${d.camera?.hoje ?? '—'} alertas`,
  },
  camera_eventos: {
    titulo: 'Últimos alertas', icone: IC.camera,
    grande: (d) => {
      const l = (d.camera?.ultimos || Array.from({ length: 6 }, () => ({}))).slice(0, 6);
      return `<div class="fotos">${l.map((e) => `<div class="foto">${e.imagem ? `<img src="${esc(e.imagem)}" alt="" loading="lazy">` : ''}<span>${esc(e.principal || '—')} ${esc(e.hora || '')}</span></div>`).join('')}</div>`;
    },
    mini: (d) => d.camera?.ultimos?.[0] ? `${d.camera.ultimos[0].principal} ${d.camera.ultimos[0].hora}` : '—',
  },
};
WIDGETS.mini_bateria = { ...WIDGETS.bateria, titulo: 'Bateria (compacta)', soMini: true };
WIDGETS.mini_whatsapp = { ...WIDGETS.whatsapp, titulo: 'WhatsApp (compacto)', soMini: true };
WIDGETS.mini_business = { ...WIDGETS.whatsapp_business, titulo: 'WhatsApp Business (compacto)', soMini: true };

function conversas(pacote, nome, icone) {
  const doApp = (d) => (d.notificacoes || []).filter((n) => n.app === pacote);
  return {
    titulo: nome, icone, largo: true,
    grande: (d) => {
      const l = doApp(d);
      if (!d.dispositivo?.notificacoes_liberadas && d.dispositivo) return pedirAcesso('Para mostrar as mensagens, libere o acesso às notificações para o Painel.');
      if (!l.length) return vazio(`Nenhuma mensagem nova no ${nome}.`);
      return `<div class="lista">${l.slice(0, 6).map((n) => `<div class="item" data-conversa="${esc(n.conversa || n.titulo)}"><div class="t"><b>${esc(n.conversa || n.titulo)}${n.quantas > 1 ? ` <span class="sub" style="display:inline">(${n.quantas})</span>` : ''}</b>
        <span>${n.conversa && n.titulo && n.titulo !== n.conversa ? esc(n.titulo) + ': ' : ''}${esc(n.texto)}</span></div><span class="h">${ha(n.t / 1000)}</span></div>`).join('')}</div>`;
    },
    mini: (d) => String(doApp(d).length),
  };
}
