'use strict';
const Historico = (() => {
  const APPS = [['com.whatsapp', 'WhatsApp', 'msg'], ['com.whatsapp.w4b', 'WhatsApp Business', 'msgB']];
  let app = APPS[0][0], conversa = null, conversas = [], fechando = null;
  const caixa = () => document.getElementById('hist');
  const aberto = () => caixa().classList.contains('dentro');
  const hora = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  function dia(t) {
    const d = new Date(t), hoje = new Date(), ontem = new Date(Date.now() - 864e5);
    if (d.toDateString() === hoje.toDateString()) return 'Hoje';
    if (d.toDateString() === ontem.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }

  function esqueleto() {
    caixa().innerHTML = `<div class="h-caixa" role="dialog" aria-modal="true" aria-label="Histórico de mensagens">
      <div class="h-topo"><div class="h-apps" role="tablist">${APPS.map(([k, nome, ic]) => `<button role="tab" data-app="${k}">${IC[ic]}${nome}</button>`).join('')}</div>
        <span class="sub h-nota">Só leitura: nada é marcado como lido no WhatsApp</span><button class="h-fechar" data-fechar="1" aria-label="Fechar">✕</button></div>
      <div class="h-corpo"><nav class="h-lista" aria-label="Conversas"></nav><section class="h-chat"><div class="h-cab"></div><div class="h-msgs"></div></section></div></div>`;
  }

  async function abrir(a, conv) {
    const c = caixa();
    clearTimeout(fechando);
    if (!aberto()) {
      esqueleto();
      c.hidden = false;
      requestAnimationFrame(() => c.classList.add('dentro'));
      c.onclick = (ev) => {
        const b = ev.target.closest('button');
        if (ev.target === c || b?.dataset.fechar) return fechar();
        if (b?.dataset.app) return trocarApp(b.dataset.app);
        if (b?.dataset.conv != null) return abrirConversa(conversas[+b.dataset.conv].conversa);
      };
    }
    app = a || app;
    conversa = conv || null;
    await carregar();
  }

  function fechar() {
    const c = caixa();
    c.classList.remove('dentro');
    fechando = setTimeout(() => { c.hidden = true; c.innerHTML = ''; }, 220);
  }

  function trocarApp(a) {
    if (a === app) return;
    app = a; conversa = null;
    carregar();
  }

  async function carregar(trocou = true) {
    caixa().querySelectorAll('[data-app]').forEach((b) => b.setAttribute('aria-selected', b.dataset.app === app));
    try { conversas = await api('/api/historico?app=' + encodeURIComponent(app)); } catch (e) { conversas = []; }
    if (!conversas.some((c) => c.conversa === conversa)) conversa = conversas[0]?.conversa || null;
    pintarLista();
    await abrirConversa(conversa, trocou);
  }

  function pintarLista() {
    const nav = caixa().querySelector('.h-lista');
    if (!nav) return;
    nav.innerHTML = conversas.length ? conversas.map((c, i) => `<button class="h-conv${c.conversa === conversa ? ' on' : ''}" data-conv="${i}">
      <b>${esc(c.conversa)}</b><span>${c.ultima.quem && c.ultima.quem !== c.conversa ? esc(c.ultima.quem) + ': ' : c.ultima.quem ? '' : 'Você: '}${esc(c.ultima.texto)}</span>
      <small>${dia(c.t) === 'Hoje' ? hora(c.t) : dia(c.t)} · ${c.n}</small></button>`).join('')
      : '<p class="sub" style="padding:10px">Nenhuma mensagem guardada ainda. O histórico começa a encher com as próximas notificações.</p>';
    nav.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  }

  async function abrirConversa(c, recarga) {
    const msgsEl = caixa().querySelector('.h-msgs'), cab = caixa().querySelector('.h-cab');
    if (!msgsEl) return;
    const trocou = c !== conversa || recarga;
    conversa = c;
    caixa().querySelectorAll('.h-conv').forEach((b) => b.classList.toggle('on', conversas[+b.dataset.conv]?.conversa === c));
    if (!c) { cab.innerHTML = ''; msgsEl.innerHTML = ''; return; }
    let msgs = [];
    try { msgs = await api(`/api/historico?app=${encodeURIComponent(app)}&conversa=${encodeURIComponent(c)}`); } catch (e) {}
    const grupo = msgs.some((m) => m.quem && m.quem !== c);
    cab.innerHTML = `<b>${esc(c)}</b><span class="sub">${msgs.length} mensage${msgs.length === 1 ? 'm' : 'ns'} guardada${msgs.length === 1 ? '' : 's'}</span>`;
    const perto = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 60;
    let ultDia = '';
    msgsEl.innerHTML = msgs.map((m) => {
      const d = dia(m.t), sep = d !== ultDia ? `<div class="h-dia">${d}</div>` : '';
      ultDia = d;
      const meu = !m.quem;
      return `${sep}<div class="h-msg${meu ? ' meu' : ''}">${grupo && !meu ? `<b>${esc(m.quem)}</b>` : ''}<p>${esc(m.texto)}</p><time>${hora(m.t)}</time></div>`;
    }).join('');
    if (trocou || perto) msgsEl.scrollTop = msgsEl.scrollHeight;
    if (trocou) msgsEl.classList.remove('troca'), void msgsEl.offsetWidth, msgsEl.classList.add('troca');
  }
  function tecla(k) {
    if (k === 'Escape') return fechar();
    if (k === 'ArrowLeft' || k === 'ArrowRight') return trocarApp(APPS[(APPS.findIndex((a) => a[0] === app) + (k === 'ArrowRight' ? 1 : APPS.length - 1)) % APPS.length][0]);
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      const i = conversas.findIndex((c) => c.conversa === conversa) + (k === 'ArrowDown' ? 1 : -1);
      if (conversas[i]) abrirConversa(conversas[i].conversa).then(() => caixa().querySelector('.h-conv.on')?.scrollIntoView({ block: 'nearest' }));
    }
  }
  function novaMensagem(n) {
    if (aberto() && n.app === app) carregar(false);
  }

  return { abrir, fechar, aberto, tecla, novaMensagem };
})();
