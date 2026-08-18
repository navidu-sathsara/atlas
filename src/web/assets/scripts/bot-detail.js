'use strict';

/* ==================================================================
   Bot detail
   ================================================================== */
function openBot(id) {
  state.activeId = id;
  setPage('bots');
  renderSidebar();
  renderBotHead();
  openStream(id);
  syncConsoles();
  if (state.tab === 'config') renderConfig();
  if (state.tab === 'inventory') loadInventory(id);
  if (state.tab === 'modules') loadModules(id);
  if (state.tab === 'scripts') loadScripts(id);
}

function renderBotHead() {
  const b = state.bots.get(state.activeId);
  if (!b) {
    $('#bId').textContent = 'No bot selected';
    $('#bInit').textContent = '–';
    $('#bPill').textContent = '—';
    $('#bPill').className = 'pill';
    $('#bAvatar').className = 'bavatar';
    $('#bDot').className = 'dot';
    $('#bMeta').innerHTML = '';
    $('#bActions').innerHTML = '';
    $('#bStats').innerHTML = '';
    $('#termGrid').innerHTML = '<div class="empty">Pick a bot from the list to open its console.</div>';
    return;
  }

  const st = b.status || 'stopped';
  const cfg = b.config || {};
  const px = proxyOf(b);

  $('#bId').textContent = b.id;
  $('#bInit').textContent = b.id.slice(0, 2).toUpperCase();
  $('#bAvatar').className = 'bavatar ' + st;
  $('#bDot').className = 'dot ' + st;
  $('#bPill').className = 'pill ' + st;
  $('#bPill').textContent = st;

  const chip = (icon, val, cls) =>
    `<span class="bchip ${cls || ''}">${SVG(icon, 11)}<b>${esc(val)}</b></span>`;
  const meta = [
    chip(ICONS.user, cfg.username || b.id),
    chip(ICONS.globe, (cfg.host || '—') + (cfg.port && cfg.port !== 25565 ? ':' + cfg.port : '')),
    chip(ICONS.tag, catOf(b)),
    chip(ICONS.box, cfg.version || '—'),
  ];
  if (px) meta.push(chip(ICONS.shield, px.label || shortProxy(px.uri)));
  $('#bMeta').innerHTML = meta.join('');

  const stat = (k, v, cls) => `<div class="bstat"><div class="k">${esc(k)}</div><div class="v ${cls || ''}">${esc(v)}</div></div>`;
  $('#bStats').innerHTML = [
    stat('Status', st, st === 'running' ? 'run' : (st === 'error' ? 'err' : 'mute')),
    stat('PID', b.pid || '—', b.pid ? '' : 'mute'),
    stat('Shards', shardText(b.shards), b.shards === null || b.shards === undefined ? 'mute' : 'acc'),
    stat('Auth', cfg.auth === 'microsoft' ? 'Microsoft' : 'Offline'),
  ].join('');

  syncBotActions();
}

function syncBotActions() {
  const b = state.bots.get(state.activeId);
  if (!b) return;
  const run = b.status === 'running';
  const btn = (act, label, icon, cls) =>
    `<button class="btn sm ${cls || ''}" data-bact="${act}">${SVG(icon, 13)}${label}</button>`;

  const out = [];
  if (run) {
    out.push(btn('restart', 'Restart', ICONS.restart));
    out.push(btn('stop', 'Stop', ICONS.stop, 'danger'));
  } else {
    out.push(btn('start', 'Start', ICONS.play, 'pri'));
  }
  out.push(btn('delete', 'Delete', ICONS.trash, 'danger'));
  $('#bActions').innerHTML = out.join('');

  $$('#bActions [data-bact]').forEach((el) => el.addEventListener('click', async () => {
    const act = el.dataset.bact;
    if (act === 'delete') {
      const ok = await confirmModal({
        title: 'Delete bot',
        body: `Permanently delete <b>${esc(b.id)}</b>? The process is stopped and its configuration is removed.`,
        confirm: 'Delete bot', danger: true,
      });
      if (!ok) return;
      try {
        await api(`/bots/${encodeURIComponent(b.id)}`, { method: 'DELETE' });
        toast(`Deleted ${b.id}`, 'ok');
      } catch (e) { toast(e.message, 'err'); }
      return;
    }
    botAction(b.id, act, el);
  }));
}

/* ==================================================================
   Console
   ================================================================== */
function consoleTargets() {
  const sel = Array.from(state.selected).filter((id) => state.bots.has(id));
  if (sel.length > 1) return sel;
  if (state.activeId && state.bots.has(state.activeId)) return [state.activeId];
  return sel;
}

function syncConsoles() {
  const ids = consoleTargets();
  const host = $('#termGrid');
  if (!ids.length) {
    host.innerHTML = '<div class="empty">Pick a bot from the list to open its console.</div>';
    return;
  }
  autoTileConsoles(ids.length);
  host.innerHTML = ids.map(termHtml).join('');
  ids.forEach((id) => {
    openStream(id);
    paintLog(id);
    const input = host.querySelector(`[data-cmd="${CSS.escape(id)}"]`);
    if (input) {
      input.addEventListener('keydown', async (e) => {
        if (e.key !== 'Enter') return;
        const cmd = input.value.trim();
        if (!cmd) return;
        input.value = '';
        try {
          await api(`/bots/${encodeURIComponent(id)}/cmd`, { method: 'POST', body: JSON.stringify({ cmd }) });
        } catch (err) { toast(`${id}: ${err.message}`, 'err'); }
      });
    }
  });
  closeStreamsExcept(new Set(ids));
}

function autoTileConsoles(n) {
  const host = $('#termGrid');
  const cols = MOBILE() ? 1 : (n <= 1 ? 1 : n <= 4 ? 2 : 3);
  host.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  host.style.gridAutoRows = n <= (MOBILE() ? 1 : cols) ? '1fr' : 'minmax(220px, 1fr)';
}

function termHtml(id) {
  const b = state.bots.get(id) || {};
  const st = b.status || 'stopped';
  return `<div class="term" data-term="${esc(id)}">
    <div class="term-head">
      <span class="dot ${esc(st)}"></span>
      <b>${esc(id)}</b>
      <span class="dim3 grow">${esc((b.config && b.config.username) || '')}</span>
      <button class="btn sm icon" data-clear="${esc(id)}" title="Clear" aria-label="Clear log">${SVG(ICONS.x, 12)}</button>
    </div>
    <div class="log" data-log="${esc(id)}"></div>
    <div class="cmd">
      <span>&gt;</span>
      <input data-cmd="${esc(id)}" placeholder="Send command…" autocomplete="off" spellcheck="false" aria-label="Send command to ${esc(id)}">
    </div>
  </div>`;
}

$('#termGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-clear]');
  if (!btn) return;
  state.logs.set(btn.dataset.clear, []);
  paintLog(btn.dataset.clear);
});

function pushLog(id, line, t) {
  if (!state.logs.has(id)) state.logs.set(id, []);
  const arr = state.logs.get(id);
  arr.push({ t: t || Date.now(), line: String(line ?? '') });
  if (arr.length > MAX_LOG) arr.splice(0, arr.length - MAX_LOG);
}

function logClass(line) {
  const s = line.toLowerCase();
  if (s.includes('error') || s.includes('failed') || s.includes('crash') || s.includes('kicked')) return 'err';
  if (s.includes('warn')) return 'warn';
  if (s.includes('connected') || s.includes('spawned') || s.includes('success') || s.includes('logged in')) return 'ok';
  if (s.startsWith('[system]') || s.includes('🍌')) return 'sys';
  return '';
}

function paintLog(id) {
  const el = $(`[data-log="${CSS.escape(id)}"]`);
  if (!el) return;
  const rows = state.logs.get(id) || [];
  if (!rows.length) {
    el.innerHTML = '<div class="dim3">Waiting for output…</div>';
    return;
  }
  const stick = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
  el.innerHTML = rows.map((r) =>
    `<div><span class="t">${timeStr(r.t)}</span><span class="${logClass(r.line)}">${esc(r.line)}</span></div>`
  ).join('');
  if (stick) el.scrollTop = el.scrollHeight;
}

/* ==================================================================
   Per-bot SSE

   Frames: { type:'snapshot', status, logs, inventory }
           { type:'log', t, line } | { type:'status', status }
           { type:'shards', shards } | { type:'inventory', data }
           { type:'modules', modules }
   ================================================================== */
function openStream(id) {
  if (state.streams.has(id)) return;
  const es = new EventSource(`/api/bots/${encodeURIComponent(id)}/events`);
  es.onmessage = (ev) => {
    let d; try { d = JSON.parse(ev.data); } catch (_) { return; }
    handleBotEvent(id, d);
  };
  es.onerror = () => { /* EventSource retries on its own */ };
  state.streams.set(id, es);
}

function closeStreamsExcept(keep) {
  for (const [id, es] of Array.from(state.streams.entries())) {
    if (keep.has(id)) continue;
    try { es.close(); } catch (_) {}
    state.streams.delete(id);
  }
}

function handleBotEvent(id, d) {
  if (!d || !d.type) return;

  if (d.type === 'snapshot') {
    // Replay buffered history so an opened console is never blank.
    const rows = Array.isArray(d.logs) ? d.logs : [];
    state.logs.set(id, rows.slice(-MAX_LOG).map((r) =>
      typeof r === 'string' ? { t: null, line: r } : { t: r.t, line: r.line }
    ));
    paintLog(id);
    const b = state.bots.get(id);
    if (b && d.status && b.status !== d.status) { b.status = d.status; renderAllBotViews(); }
    if (d.inventory) { state.inv.set(id, d.inventory); if (state.tab === 'inventory' && state.activeId === id) renderInventory(id); }
    return;
  }

  if (d.type === 'log') { pushLog(id, d.line, d.t); paintLog(id); return; }

  if (d.type === 'status') {
    const b = state.bots.get(id);
    if (b) { b.status = d.status; renderAllBotViews(); }
    return;
  }

  if (d.type === 'shards') {
    const b = state.bots.get(id);
    if (b) { b.shards = d.shards; renderSidebar(); renderFleet(); if (state.activeId === id) renderBotHead(); }
    return;
  }

  if (d.type === 'inventory') {
    state.inv.set(id, d.data);
    if (state.activeId === id && state.tab === 'inventory') renderInventory(id);
    return;
  }

  if (d.type === 'modules') {
    state.modules.set(id, d.modules || []);
    if (state.activeId === id) {
      $('#tnMod').textContent = (d.modules || []).length;
      if (state.tab === 'modules') renderModules(id);
    }
    return;
  }
}

/* ==================================================================
   Global SSE

   Frames: hello | status | event | shards
           bot-added | bot-updated | bot-removed   (keyed by `id`)
   ================================================================== */
function setSse(on, txt) {
  $('#sseDot').className = 'dot ' + (on ? 'running' : 'error');
  $('#sseTxt').textContent = txt;
}

function openGlobalStream() {
  if (state.global) { try { state.global.close(); } catch (_) {} }
  const es = new EventSource('/api/events');
  state.global = es;

  es.onopen = () => setSse(true, 'live');
  es.onerror = () => setSse(false, 'reconnecting');

  es.onmessage = (ev) => {
    let d; try { d = JSON.parse(ev.data); } catch (_) { return; }
    if (!d || !d.type) return;

    switch (d.type) {
      case 'hello':
        mergeBots(d.bots || []);
        setSse(true, 'live');
        break;

      case 'bot-added':
        if (d.bot) {
          state.bots.set(d.bot.id, d.bot);
          renderAllBotViews();
          toast(`${d.bot.id} deployed`, 'ok');
        }
        break;

      case 'bot-updated':
        if (d.bot) {
          state.bots.set(d.bot.id, d.bot);
          renderAllBotViews();
          if (state.activeId === d.bot.id && state.tab === 'config') renderConfig();
        }
        break;

      case 'bot-removed': {
        const id = d.id || (d.bot && d.bot.id);
        if (!id) break;
        state.bots.delete(id);
        state.selected.delete(id);
        const es2 = state.streams.get(id);
        if (es2) { try { es2.close(); } catch (_) {} state.streams.delete(id); }
        if (state.activeId === id) state.activeId = null;
        renderAllBotViews();
        break;
      }

      case 'status': {
        const b = state.bots.get(d.id);
        if (b) { b.status = d.status; renderAllBotViews(); }
        break;
      }

      case 'shards': {
        const b = state.bots.get(d.id);
        if (b) { b.shards = d.shards; renderSidebar(); renderFleet(); if (state.activeId === d.id) renderBotHead(); }
        break;
      }

      case 'event':
        // Structured bot event (death, kick, reward, ...). Surface notable ones.
        if (d.event && d.event.type && ['kicked', 'death', 'crash', 'error'].includes(d.event.type)) {
          toast(`${d.id}: ${d.event.type}${d.event.reason ? ' — ' + d.event.reason : ''}`, 'warn');
        }
        break;
    }
  };
}

/** One entry point so every view stays consistent after a state change. */
let repaintQueued = false;
function renderAllBotViews() {
  if (repaintQueued) return;
  repaintQueued = true;
  requestAnimationFrame(() => {
    repaintQueued = false;
    renderSidebar();
    renderFleet();
    if (state.activeId) renderBotHead();
    const ids = new Set(consoleTargets());
    $$('#termGrid .term').forEach((el) => {
      const id = el.dataset.term;
      if (!ids.has(id)) return;
      const b = state.bots.get(id) || {};
      const dot = el.querySelector('.dot');
      if (dot) dot.className = 'dot ' + (b.status || 'stopped');
    });
  });
}

function mergeBots(list) {
  const seen = new Set();
  for (const b of list) { state.bots.set(b.id, b); seen.add(b.id); }
  for (const id of Array.from(state.bots.keys())) if (!seen.has(id)) state.bots.delete(id);
  for (const id of Array.from(state.selected)) if (!state.bots.has(id)) state.selected.delete(id);
  renderAllBotViews();
}
