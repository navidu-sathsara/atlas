'use strict';

/* ==================================================================
   Mass command

   POST /api/mass-cmd { cmd, botIds?, staggerMs? } -> 202 { ok, jobId, total }
   Only running bots are dispatched to; the server skips the rest.
   ================================================================== */
let mcOpen = false;

function mcCats() { return Array.from(new Set(botsArray().map(catOf))).sort(natural); }

function mcTargets() {
  const all = botsArray();
  if (mc.mode === 'selection') return all.filter((b) => state.selected.has(b.id));
  if (mc.mode === 'running') return all.filter((b) => b.status === 'running');
  if (mc.mode === 'category') return all.filter((b) => mc.cats.has(catOf(b)));
  return all;
}

function mcRecent() {
  try { return JSON.parse(localStorage.getItem(tenantStorageKey(MC_RECENT_KEY)) || '[]'); } catch (_) { return []; }
}
function mcRemember(cmd) {
  const list = mcRecent().filter((c) => c !== cmd);
  list.unshift(cmd);
  try { localStorage.setItem(tenantStorageKey(MC_RECENT_KEY), JSON.stringify(list.slice(0, 8))); } catch (_) {}
}

function openMassCmd(prefill) {
  if (!mc.cats.size) mcCats().forEach((c) => mc.cats.add(c));
  mcOpen = true;
  const recent = mcRecent();
  const saved = state.cmds.slice(0, 8);

  openModal({
    title: 'Mass command',
    sub: 'Broadcast to many bots',
    wide: true,
    body: `<div class="form">
      <div class="fld">
        <label for="mcCmd">Command <em>*</em></label>
        <input id="mcCmd" value="${esc(prefill || '')}" placeholder="/warp afk" autocomplete="off" spellcheck="false">
        ${(saved.length || recent.length) ? `<div class="mc-quick" id="mcQuick">
          ${saved.map((c) => `<button type="button" class="btn sm" data-mcq="${esc(c.cmd)}" title="${esc(c.name)}">${esc(c.name)}</button>`).join('')}
          ${recent.map((c) => `<button type="button" class="btn sm" data-mcq="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>` : ''}
      </div>

      <div class="fld">
        <label>Targets</label>
        <div class="seg" id="mcModes">
          ${MC_MODES.map((m) => `<button type="button" data-mcmode="${m.k}" class="${mc.mode === m.k ? 'on' : ''}">${esc(m.label)}</button>`).join('')}
        </div>
        <div class="catbox" id="mcCats" style="display:none">
          ${mcCats().map((c) => `<button type="button" class="btn sm ${mc.cats.has(c) ? 'on' : ''}" data-mccat="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>
      </div>

      <div class="fld">
        <label for="mcStagger">Delay between bots</label>
        <div class="mc-quick" id="mcPresets">
          ${MC_PRESETS.map((p) => `<button type="button" class="btn sm ${mc.stagger === p ? 'on' : ''}" data-mcpre="${p}">${dur(p)}</button>`).join('')}
        </div>
        <input id="mcStagger" type="number" min="0" max="${MC_MAX_STAGGER}" step="50" value="${mc.stagger}">
        <div class="hint">0 sends everything at once. Max ${dur(MC_MAX_STAGGER)}.</div>
      </div>

      <div class="fld">
        <label>Preview</label>
        <div class="mc-prev" id="mcPrev"></div>
        <div class="mc-eta" id="mcEta"></div>
      </div>
    </div>`,
    confirm: 'Broadcast',
    onSubmit: mcSend,
  });

  mcMount();
  mcPaint();
}

function mcMount() {
  $$('[data-mcq]').forEach((b) => b.addEventListener('click', () => { $('#mcCmd').value = b.dataset.mcq; mcPaint(); }));
  $$('[data-mcmode]').forEach((b) => b.addEventListener('click', () => {
    mc.mode = b.dataset.mcmode;
    $$('[data-mcmode]').forEach((x) => x.classList.toggle('on', x === b));
    mcPaint();
  }));
  $$('[data-mccat]').forEach((b) => b.addEventListener('click', () => {
    const c = b.dataset.mccat;
    if (mc.cats.has(c)) mc.cats.delete(c); else mc.cats.add(c);
    b.classList.toggle('on');
    mcPaint();
  }));
  $$('[data-mcpre]').forEach((b) => b.addEventListener('click', () => {
    mc.stagger = Number(b.dataset.mcpre);
    $('#mcStagger').value = mc.stagger;
    $$('[data-mcpre]').forEach((x) => x.classList.toggle('on', x === b));
    mcPaint();
  }));
  $('#mcStagger').addEventListener('input', () => {
    mc.stagger = clamp(parseInt($('#mcStagger').value, 10) || 0, 0, MC_MAX_STAGGER);
    $$('[data-mcpre]').forEach((x) => x.classList.toggle('on', Number(x.dataset.mcpre) === mc.stagger));
    mcPaint();
  });
  $('#mcCmd').addEventListener('input', mcPaint);
}

function mcPaint() {
  if (!mcOpen || !$('#mcPrev')) return;
  const catBox = $('#mcCats');
  if (catBox) catBox.style.display = mc.mode === 'category' ? 'flex' : 'none';

  const targets = mcTargets();
  const live = targets.filter((b) => b.status === 'running');
  const skipped = targets.length - live.length;

  $('#mcPrev').innerHTML = live.length
    ? live.slice(0, 40).map((b) => `<b>${esc(b.id)}</b>`).join(', ') + (live.length > 40 ? ` … +${live.length - 40} more` : '')
    : 'No running bots match these targets.';

  const total = mc.stagger * Math.max(0, live.length - 1);
  $('#mcEta').innerHTML = `<b>${live.length}</b> bot${live.length === 1 ? '' : 's'}` +
    (skipped ? ` · ${skipped} skipped (not running)` : '') +
    (live.length > 1 ? ` · finishes in about <b>${dur(total)}</b>` : '');

  const ok = $('#mOk');
  if (ok) ok.disabled = !live.length;
}

async function mcSend() {
  const cmd = $('#mcCmd').value.trim();
  if (!cmd) throw new Error('Enter a command');
  const targets = mcTargets().filter((b) => b.status === 'running');
  if (!targets.length) throw new Error('No running bots match these targets');

  const r = await api('/mass-cmd', {
    method: 'POST',
    body: JSON.stringify({
      cmd,
      botIds: targets.map((b) => b.id),
      staggerMs: clamp(mc.stagger, 0, MC_MAX_STAGGER),
    }),
  });
  mcRemember(cmd);
  // Server responds 202 { ok, jobId, total }.
  toast(`Broadcasting to ${r.total ?? targets.length} bot${(r.total ?? targets.length) === 1 ? '' : 's'}`, 'ok');
  loadJobs();
}

$('#fabMass').addEventListener('click', () => openMassCmd(''));
function syncFab() {
  const n = state.selected.size;
  $('#fabMass').classList.toggle('on', n > 1);
  $('#fabCount').textContent = n;
}

/* ==================================================================
   Bulk bar
   ================================================================== */
$('#bar').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-bulk]');
  if (!btn || btn.disabled) return;
  const act = btn.dataset.bulk;
  const ids = Array.from(state.selected);

  if (act === 'clear') return clearSel();
  if (!ids.length) return;

  if (act === 'cmd') { mc.mode = 'selection'; return openMassCmd(''); }

  if (act === 'delete') {
    const ok = await confirmModal({
      title: `Delete ${ids.length} bot${ids.length === 1 ? '' : 's'}`,
      body: `Permanently delete <b>${esc(ids.slice(0, 8).join(', '))}</b>${ids.length > 8 ? ` and ${ids.length - 8} more` : ''}?`,
      confirm: 'Delete all', danger: true,
    });
    if (!ok) return;
  }

  btn.classList.add('busy');
  let done = 0, failed = 0;
  for (const id of ids) {
    try {
      if (act === 'delete') await api(`/bots/${encodeURIComponent(id)}`, { method: 'DELETE' });
      else await api(`/bots/${encodeURIComponent(id)}/${act}`, { method: 'POST' });
      done++;
    } catch (_) { failed++; }
  }
  btn.classList.remove('busy');
  toast(`${act}: ${done} ok${failed ? ` · ${failed} failed` : ''}`, failed ? 'warn' : 'ok');
  if (act === 'delete') clearSel();
  await loadBots();
});

/* ==================================================================
   Command palette
   ================================================================== */
let palIdx = 0, palRows = [];

function palSource() {
  const rows = [];
  PAGES.forEach((p) => {
    if (p === 'users' && !(state.me && state.me.role === 'admin')) return;
    rows.push({ icon: ICONS.grid, t: 'Go to ' + PAGE_TITLES[p], k: 'page', run: () => setPage(p) });
  });
  rows.push({ icon: ICONS.plus, t: 'Deploy bot', k: 'action', run: openDeploy });
  rows.push({ icon: ICONS.bolt, t: 'Mass command', k: 'action', run: () => openMassCmd('') });
  rows.push({ icon: ICONS.spark, t: 'Test all proxies', k: 'action', run: () => { setPage('proxies'); $('#btnPxCheck').click(); } });
  rows.push({ icon: ICONS.shield, t: 'Auto-assign proxies', k: 'action', run: () => { setPage('proxies'); $('#btnPxAssign').click(); } });
  rows.push({ icon: ICONS.checks, t: 'Select all visible bots', k: 'action', run: () => { visibleBots().forEach((b) => state.selected.add(b.id)); syncSelection(); } });
  rows.push({ icon: ICONS.x, t: 'Clear selection', k: 'action', run: clearSel });

  botsArray().sort((a, b) => natural(a.id, b.id)).forEach((b) => {
    rows.push({ icon: ICONS.term, t: b.id + ' · ' + catOf(b), k: b.status || 'stopped', run: () => openBot(b.id) });
  });
  state.cmds.forEach((c) => {
    rows.push({ icon: ICONS.send, t: 'Broadcast ' + c.name, k: 'cmd', run: () => openMassCmd(c.cmd) });
  });
  return rows;
}

function renderPal() {
  const q = $('#palInput').value.toLowerCase().trim();
  palRows = palSource().filter((r) => !q || r.t.toLowerCase().includes(q)).slice(0, 40);
  palIdx = clamp(palIdx, 0, Math.max(0, palRows.length - 1));
  $('#palList').innerHTML = palRows.length
    ? palRows.map((r, i) => `<div class="pal-item ${i === palIdx ? 'on' : ''}" data-i="${i}">
        ${SVG(r.icon, 15)}<span class="t">${esc(r.t)}</span><span class="k">${esc(r.k)}</span></div>`).join('')
    : '<div class="empty">No matches</div>';
  $$('#palList .pal-item').forEach((el) => {
    el.addEventListener('click', () => { const r = palRows[Number(el.dataset.i)]; closePal(); if (r) r.run(); });
  });
  const on = $('#palList .pal-item.on');
  if (on) on.scrollIntoView({ block: 'nearest' });
}

function openPal() {
  $('#palVeil').classList.add('on');
  $('#palInput').value = '';
  palIdx = 0;
  renderPal();
  setTimeout(() => $('#palInput').focus(), 40);
}
function closePal() { $('#palVeil').classList.remove('on'); }

$('#btnPal').addEventListener('click', openPal);
$('#tbPal').addEventListener('click', openPal);

$('#palInput').addEventListener('input', () => { palIdx = 0; renderPal(); });
$('#palVeil').addEventListener('mousedown', (e) => { if (e.target.id === 'palVeil') closePal(); });
$('#palInput').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); palIdx = Math.min(palIdx + 1, palRows.length - 1); renderPal(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); palIdx = Math.max(palIdx - 1, 0); renderPal(); }
  else if (e.key === 'Enter') { e.preventDefault(); const r = palRows[palIdx]; closePal(); if (r) r.run(); }
  else if (e.key === 'Escape') closePal();
});

/* ==================================================================
   Keyboard shortcuts
   ================================================================== */
document.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName || '');

  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); return openPal(); }
  if (e.key === 'Escape') {
    if ($('#palVeil').classList.contains('on')) return closePal();
    if (modalOpen()) return closeModal();
    if ($('#app').classList.contains('drawer')) return openDrawer(false);
    return;
  }
  if (mod && e.key === 'Enter' && modalOpen()) { e.preventDefault(); return submitModal(); }
  if (typing) return;

  if (mod && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    visibleBots().forEach((b) => state.selected.add(b.id));
    return syncSelection();
  }
  if (e.key === '/') { e.preventDefault(); return $('#botSearch').focus(); }
  if (e.key.toLowerCase() === 'm') { e.preventDefault(); return openMassCmd(''); }
  if (e.key >= '1' && e.key <= '8') {
    const p = PAGES[Number(e.key) - 1];
    if (p === 'users' && !(state.me && state.me.role === 'admin')) return;
    return setPage(p);
  }
});

/* ==================================================================
   Boot
   ================================================================== */
async function loadBots() {
  try {
    const r = await api('/bots');
    mergeBots(Array.isArray(r) ? r : (r.bots || []));
  } catch (e) { toast(e.message, 'err'); }
}

let resizeT = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { if (state.page === 'bots' && state.tab === 'console') syncConsoles(); }, 180);
});

async function boot() {
  state.loading = true;
  if (typeof applyPreferences === 'function') applyPreferences(state.me?.preferences || {});
  if (typeof loadTenantTilePreferences === 'function') loadTenantTilePreferences();
  applyRoleVisibility();
  // Proxies first so the fleet can resolve config.proxy into pool labels.
  await loadProxies();
  await loadBots();
  if (state.me && state.me.role === 'admin') await loadUsers();
  await loadCmds();
  if (typeof loadWorkspace === 'function') await loadWorkspace();
  openGlobalStream();
  startJobsPoll();
  // Keep tile uptimes ticking while the fleet is visible, without hammering
  // the DOM: refresh once a second only on the fleet page.
  if (!state.uptimeTimer) {
    state.uptimeTimer = setInterval(() => {
      if (state.page === 'fleet' && state.since && state.since.size) renderFleet();
    }, 1000);
  }
  if (!state.activeId) {
    const first = visibleBots()[0];
    if (first) { state.activeId = first.id; renderBotHead(); }
  }
  const landing = typeof preferredStartPage === 'function' ? preferredStartPage() : 'fleet';
  setPage(PAGES.includes(landing) ? landing : 'fleet');
  state.loading = false;
}

(async function init() {
  paintChrome();
  setSse(false, 'connecting');
  try {
    const me = await fetch('/api/me', { credentials: 'same-origin' }).then((r) => r.json());
    if (me && me.authenticated) {
      state.me = me.user;
      showApp();
      await boot();
    } else {
      showLogin();
    }
  } catch (_) {
    showLogin();
  }
})();
