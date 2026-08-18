'use strict';

/* ==================================================================
   Bot shape helpers

   The server returns publicBot(): { id, config, status, pid,
   hasInventory, shards }.
   Note config.proxy is a socks5 URI (there is no config.proxyId).
   ================================================================== */
const catOf = (b) => (b && b.config && b.config.category) || 'Uncategorized';

// Legacy verify-status helper: the server no longer reports a verifying flag,
// so every bot counts as "not verifying" (kept for the fleet stat row).
const isVerifying = () => false;

function shortProxy(uri) {
  if (!uri) return '';
  let s = String(uri);
  const i = s.indexOf('://');
  if (i >= 0) s = s.slice(i + 3);
  const at = s.lastIndexOf('@');
  if (at >= 0) s = s.slice(at + 1);
  return s;
}
/** Resolve a bot's proxy URI to the pool entry, so the fleet can show a label. */
function proxyOf(b) {
  const uri = b && b.config && b.config.proxy;
  if (!uri) return null;
  return state.proxies.find((p) => p.uri === uri) || { id: null, uri, label: shortProxy(uri) };
}
function botsArray() { return Array.from(state.bots.values()); }

function shardText(value) {
  if (value === null || value === undefined || value === '') return '--';
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString() : '--';
}

/* ==================================================================
   Selection
   ================================================================== */
function syncSelection() {
  const n = state.selected.size;
  $('#selCount').textContent = n + ' selected';
  $('#bar').classList.toggle('show', n > 0);
  $('#app').classList.toggle('bulk', n > 0);
  $$('#bar .btn[data-bulk]').forEach((b) => { if (b.dataset.bulk !== 'clear') b.disabled = n === 0; });
  $$('.bot').forEach((el) => el.classList.toggle('sel', state.selected.has(el.dataset.id)));
  $$('#botList input[data-catsel]').forEach((cb) => {
    const inCat = botsArray().filter((b) => catOf(b) === cb.dataset.catsel);
    const picked = inCat.filter((b) => state.selected.has(b.id)).length;
    cb.checked = inCat.length > 0 && picked === inCat.length;
    cb.indeterminate = picked > 0 && picked < inCat.length;
  });
  $$('.grid tbody tr[data-id]').forEach((el) => {
    el.classList.toggle('sel', state.selected.has(el.dataset.id));
    const cb = el.querySelector('input[type=checkbox]');
    if (cb) cb.checked = state.selected.has(el.dataset.id);
  });
  $$('.card[data-id]').forEach((el) => {
    el.classList.toggle('sel', state.selected.has(el.dataset.id));
    const cb = el.querySelector('input[type=checkbox]');
    if (cb) cb.checked = state.selected.has(el.dataset.id);
  });
  $$('.tile[data-id]').forEach((el) => {
    el.classList.toggle('sel', state.selected.has(el.dataset.id));
    const cb = el.querySelector('.tile-check');
    if (cb) cb.checked = state.selected.has(el.dataset.id);
  });
  const vis = visibleBots();
  const all = $('#fleetAll');
  if (all) all.checked = vis.length > 0 && vis.every((b) => state.selected.has(b.id));
  syncFab();
  if (mcOpen) mcPaint();
}
function toggleSel(id, on) {
  if (on === undefined) on = !state.selected.has(id);
  if (on) state.selected.add(id); else state.selected.delete(id);
  state.lastAnchor = id;
  syncSelection();
}
function rangeSel(id) {
  const ids = visibleBots().map((b) => b.id);
  const a = ids.indexOf(state.lastAnchor), z = ids.indexOf(id);
  if (a < 0 || z < 0) return toggleSel(id, true);
  for (let i = Math.min(a, z); i <= Math.max(a, z); i++) state.selected.add(ids[i]);
  syncSelection();
}
function clearSel() { state.selected.clear(); syncSelection(); }

/* ==================================================================
   Sidebar
   ================================================================== */
function renderSidebar() {
  const q = ($('#botSearch').value || '').toLowerCase().trim();
  const bots = botsArray().filter((b) => {
    if (!q) return true;
    return b.id.toLowerCase().includes(q)
      || String(b.config && b.config.username || '').toLowerCase().includes(q)
      || catOf(b).toLowerCase().includes(q);
  });

  const groups = new Map();
  for (const b of bots) {
    const c = catOf(b);
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(b);
  }
  const keys = Array.from(groups.keys()).sort((a, b) => {
    if (a === CLAIM_CAT) return -1;
    if (b === CLAIM_CAT) return 1;
    return natural(a, b);
  });

  const host = $('#botList');
  if (!bots.length) {
    host.innerHTML = `<div class="empty">${q ? 'No bots match <b>' + esc(q) + '</b>' : 'No bots yet.<br>Deploy one to get started.'}</div>`;
    return;
  }

  host.innerHTML = keys.map((cat) => {
    const rows = groups.get(cat).sort((a, b) => natural(a.id, b.id));
    const run = rows.filter((b) => b.status === 'running').length;
    const closed = state.closed.has(cat) ? ' closed' : '';
    return `<div class="cat${closed}" data-cat="${esc(cat)}">
      <div class="cat-head">
        ${SVG('<path d="m6 9 6 6 6-6"/>', 12).replace('<svg', '<svg class="cat-chev"')}
        <label class="cat-sel" title="Select all in this category"><input type="checkbox" data-catsel="${esc(cat)}"></label>
        <span class="cat-name">${esc(cat)}</span>
        <span class="cat-n">${run}/${rows.length}</span>
      </div>
      <div class="cat-body">${rows.map(botRow).join('')}</div>
    </div>`;
  }).join('');

  $$('#botList .cat-head').forEach((h) => h.addEventListener('click', (e) => {
    if (e.target.closest('.cat-sel')) return;
    const cat = h.parentElement.dataset.cat;
    if (state.closed.has(cat)) state.closed.delete(cat); else state.closed.add(cat);
    h.parentElement.classList.toggle('closed');
  }));
  $$('#botList input[data-catsel]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const cat = cb.dataset.catsel;
      botsArray().filter((b) => catOf(b) === cat).forEach((b) => {
        if (cb.checked) state.selected.add(b.id); else state.selected.delete(b.id);
      });
      syncSelection();
    });
  });
  $$('#botList .bot').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey) return toggleSel(el.dataset.id);
      if (e.shiftKey) return rangeSel(el.dataset.id);
      openBot(el.dataset.id);
    });
  });
  syncSelection();
}

function botRow(b) {
  const act = state.activeId === b.id ? ' act' : '';
  const sel = state.selected.has(b.id) ? ' sel' : '';
  const shards = shardText(b.shards);
  const shardClass = shards === '--' ? ' unknown' : '';
  return `<div class="bot${act}${sel}" data-id="${esc(b.id)}">
    <span class="dot ${esc(b.status || 'stopped')}"></span>
    <span class="bot-id">${esc(b.id)}</span>
    <span class="bot-user">${esc((b.config && b.config.username) || '')}</span>
    <span class="bot-tags"><span class="shard${shardClass}" title="Shards">${esc(shards)}</span></span>
  </div>`;
}

/* ==================================================================
   Fleet
   ================================================================== */
function visibleBots() {
  let rows = botsArray();
  if (state.filter !== 'all') rows = rows.filter((b) => (b.status || 'stopped') === state.filter);

  const k = state.sort.key, d = state.sort.dir;
  rows.sort((a, b) => {
    let x, y;
    if (k === 'id') { x = a.id; y = b.id; }
    else if (k === 'status') { x = a.status || ''; y = b.status || ''; }
    else if (k === 'username') { x = (a.config && a.config.username) || ''; y = (b.config && b.config.username) || ''; }
    else if (k === 'category') { x = catOf(a); y = catOf(b); }
    else if (k === 'host') { x = (a.config && a.config.host) || ''; y = (b.config && b.config.host) || ''; }
    else if (k === 'proxy') {
      const pa = proxyOf(a), pb = proxyOf(b);
      x = pa ? (pa.label || pa.uri) : '';
      y = pb ? (pb.label || pb.uri) : '';
    } else { x = a.id; y = b.id; }
    return natural(x, y) * d;
  });
  return rows;
}

/* ==================================================================
   Fleet — draggable / groupable tiles
   ================================================================== */
const TILE_ORDER_KEY = 'bm.tiles.order';
const TILE_GROUP_KEY = 'bm.tiles.group';
const TILE_DENSITY_KEY = 'bm.tiles.density';
const TILE_CLOSED_KEY = 'bm.tiles.closed';

function loadTileOrder() {
  try { const a = JSON.parse(localStorage.getItem(tenantStorageKey(TILE_ORDER_KEY))); return Array.isArray(a) ? a : []; }
  catch (_) { return []; }
}
function saveTileOrder(ids) { try { localStorage.setItem(tenantStorageKey(TILE_ORDER_KEY), JSON.stringify(ids)); } catch (_) {} }

const tileUI = {
  group: 'flat',
  density: 'comfortable',
  closed: new Set(),
  sortables: [],
};
function loadTenantTilePreferences() {
  tileUI.group = localStorage.getItem(tenantStorageKey(TILE_GROUP_KEY)) || 'flat';
  tileUI.density = state.me?.preferences?.density || localStorage.getItem(tenantStorageKey(TILE_DENSITY_KEY)) || 'comfortable';
  try { tileUI.closed = new Set(JSON.parse(localStorage.getItem(tenantStorageKey(TILE_CLOSED_KEY))) || []); }
  catch (_) { tileUI.closed = new Set(); }
}
function saveTileClosed() { try { localStorage.setItem(tenantStorageKey(TILE_CLOSED_KEY), JSON.stringify([...tileUI.closed])); } catch (_) {} }

/** Order bots by the saved manual order; unknown ids fall to the end (natural). */
function orderedBots(rows) {
  const order = loadTileOrder();
  const idx = new Map(order.map((id, i) => [id, i]));
  return rows.slice().sort((a, b) => {
    const ia = idx.has(a.id) ? idx.get(a.id) : Infinity;
    const ib = idx.has(b.id) ? idx.get(b.id) : Infinity;
    if (ia !== ib) return ia - ib;
    return natural(a.id, b.id);
  });
}

/** Uptime tracking: remember when each bot most recently became 'running'. */
function tileSince(id, status) {
  if (!state.since) state.since = new Map();
  if (status === 'running') { if (!state.since.has(id)) state.since.set(id, Date.now()); }
  else state.since.delete(id);
  return state.since.get(id) || null;
}
function uptimeStr(since) {
  if (!since) return '—';
  const s = Math.max(0, Math.floor((Date.now() - since) / 1000));
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + (s % 60) + 's';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ' + (m % 60) + 'm';
  return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
}

function tileHTML(b) {
  const status = b.status || 'stopped';
  const px = proxyOf(b);
  const host = (b.config && b.config.host) || '—';
  const port = b.config && b.config.port ? b.config.port : 25565;
  const server = host + (port && port !== 25565 ? ':' + port : '');
  const shards = shardText(b.shards);
  const since = tileSince(b.id, status);
  const sel = state.selected.has(b.id) ? ' sel' : '';
  return `<div class="tile st-${esc(status)}${sel}" data-id="${esc(b.id)}" data-testid="bot-tile-${esc(b.id)}">
    <div class="tile-head">
      <span class="tile-drag" data-drag title="Drag to reorder">${SVG('<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>', 14)}</span>
      <span class="tdot"></span>
      <span class="tile-name">${esc(b.id)}</span>
      <span class="tile-shards${shards === '--' ? ' unknown' : ''}" title="Shards">${SVG(ICONS.spark, 11)}${esc(shards)}</span>
      <input type="checkbox" class="tile-check" aria-label="Select ${esc(b.id)}" ${state.selected.has(b.id) ? 'checked' : ''}>
    </div>
    <div class="tile-body">
      <div class="tile-row"><span class="pill ${esc(status)}">${esc(status)}</span><span class="v mute">${esc((b.config && b.config.username) || b.id)}</span></div>
      <div class="tile-row opt">${SVG(ICONS.globe, 12)}<span class="v">${esc(server)}</span></div>
      <div class="tile-row opt">${SVG(ICONS.shield, 12)}<span class="v ${px ? '' : 'mute'}">${px ? esc(px.label || shortProxy(px.uri)) : 'direct'}</span></div>
    </div>
    <div class="tile-metrics">
      <div class="tile-metric"><div class="mk">Shards</div><div class="mv ${shards === '--' ? 'mute' : 'acc'}">${esc(shards)}</div></div>
      <div class="tile-metric"><div class="mk">Uptime</div><div class="mv ${status === 'running' ? 'run' : ''}">${uptimeStr(since)}</div></div>
      <div class="tile-metric"><div class="mk">Category</div><div class="mv" style="font-size:11px">${esc(catOf(b))}</div></div>
    </div>
    <div class="tile-foot">${fleetActs(b, true)}<button class="btn sm icon" data-open title="Open" aria-label="Open" data-testid="tile-open-${esc(b.id)}">${SVG(ICONS.term, 14)}</button></div>
  </div>`;
}

function wireTiles(host) {
  host.querySelectorAll('.tile[data-id]').forEach((el) => {
    const id = el.dataset.id;
    const cb = el.querySelector('.tile-check');
    if (cb) cb.addEventListener('click', (e) => { e.stopPropagation(); toggleSel(id, cb.checked); });
    el.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); botAction(id, btn.dataset.act, btn); });
    });
    const open = el.querySelector('[data-open]');
    if (open) open.addEventListener('click', (e) => { e.stopPropagation(); openBot(id); });
    el.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('[data-drag]')) return;
      if (e.metaKey || e.ctrlKey) return toggleSel(id);
      if (e.shiftKey) return rangeSel(id);
      openBot(id);
    });
  });
}

function persistTileGridOrder() {
  const ids = [];
  $$('#tilesHost .tile-grid').forEach((g) => g.querySelectorAll('.tile[data-id]').forEach((t) => ids.push(t.dataset.id)));
  // Merge with any ids not currently visible so filters don't wipe their order.
  const seen = new Set(ids);
  loadTileOrder().forEach((id) => { if (!seen.has(id)) ids.push(id); });
  saveTileOrder(ids);
}

function initTileSortables() {
  if (typeof Sortable === 'undefined') return;
  tileUI.sortables.forEach((s) => { try { s.destroy(); } catch (_) {} });
  tileUI.sortables = [];
  $$('#tilesHost .tile-grid').forEach((grid) => {
    tileUI.sortables.push(new Sortable(grid, {
      animation: 150,
      handle: '[data-drag]',
      draggable: '.tile',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      forceFallback: true,
      onStart: () => { tileUI.dragging = true; },
      onEnd: () => { tileUI.dragging = false; persistTileGridOrder(); },
    }));
  });
}

function renderFleet() {
  if (tileUI.dragging) return;
  const all = botsArray();
  const cnt = (s) => all.filter((b) => (b.status || 'stopped') === s).length;

  $('#stTotal').textContent = all.length;
  $('#stRun').textContent = cnt('running');
  $('#stStop').textContent = cnt('stopped');
  $('#stErr').textContent = cnt('error');
  $('#stVer').textContent = all.filter(isVerifying).length;
  $('#stCat').textContent = new Set(all.map(catOf)).size;

  const used = all.filter((b) => b.config && b.config.proxy).length;
  const cap = state.proxies.length * (state.proxyCap || 0);
  $('#stSlots').textContent = cap ? `${used}/${cap}` : String(used);

  $('#nFleet').textContent = all.length;
  $('#nFleetM').textContent = all.length;

  let rows = botsArray();
  if (state.filter !== 'all') rows = rows.filter((b) => (b.status || 'stopped') === state.filter);
  rows = orderedBots(rows);

  $('#fleetSub').textContent = rows.length === all.length
    ? `${all.length} bot${all.length === 1 ? '' : 's'}`
    : `${rows.length} of ${all.length}`;

  const host = $('#tilesHost');
  const scroll = $('#tilesScroll');
  if (scroll) scroll.classList.toggle('dense', tileUI.density === 'compact');

  if (!rows.length) {
    const msg = all.length ? 'No bots match this filter.' : 'No bots yet. Deploy one to get started.';
    host.innerHTML = `<div class="empty">${msg}</div>`;
    syncSelection();
    return;
  }

  if (tileUI.group === 'category') {
    const cats = [...new Set(rows.map(catOf))].sort(natural);
    host.innerHTML = cats.map((cat) => {
      const inCat = rows.filter((b) => catOf(b) === cat);
      const run = inCat.filter((b) => b.status === 'running').length;
      const closed = tileUI.closed.has(cat) ? ' closed' : '';
      return `<div class="tile-group${closed}" data-cat="${esc(cat)}">
        <div class="tile-group-head" data-gtoggle="${esc(cat)}">
          <span class="chev">${SVG('<path d="m6 9 6 6 6-6"/>', 14)}</span>
          <span class="gname">${esc(cat)}</span>
          <span class="gn">${run}/${inCat.length}</span>
          <span class="gline"></span>
        </div>
        <div class="tile-grid">${inCat.map(tileHTML).join('')}</div>
      </div>`;
    }).join('');
    host.querySelectorAll('[data-gtoggle]').forEach((h) => h.addEventListener('click', () => {
      const cat = h.dataset.gtoggle;
      if (tileUI.closed.has(cat)) tileUI.closed.delete(cat); else tileUI.closed.add(cat);
      h.parentElement.classList.toggle('closed');
      saveTileClosed();
    }));
  } else {
    host.innerHTML = `<div class="tile-grid">${rows.map(tileHTML).join('')}</div>`;
  }

  wireTiles(host);
  initTileSortables();
  syncSelection();
}

function fleetActs(b, wide) {
  const cls = wide ? 'btn sm' : 'btn sm icon';
  const run = b.status === 'running';
  const label = (txt, icon) => wide ? txt : SVG(icon, 13);
  if (run) {
    return `<button class="${cls}" data-act="restart" title="Restart" aria-label="Restart" data-testid="tile-restart-${esc(b.id)}">${label('Restart', ICONS.restart)}</button>
            <button class="${cls} danger" data-act="stop" title="Stop" aria-label="Stop" data-testid="tile-stop-${esc(b.id)}">${label('Stop', ICONS.stop)}</button>`;
  }
  return `<button class="${cls}" data-act="start" title="Start" aria-label="Start" data-testid="tile-start-${esc(b.id)}">${label('Start', ICONS.play)}</button>`;
}

/** Single place that performs a lifecycle action on one bot. */
async function botAction(id, act, btn) {
  if (btn) btn.classList.add('busy');
  try {
    await api(`/bots/${encodeURIComponent(id)}/${act}`, { method: 'POST' });
    const nice = { start:'Starting', stop:'Stopping', restart:'Restarting' };
    toast(`${nice[act] || act} · ${id}`, 'ok');
  } catch (e) {
    toast(`${id}: ${e.message}`, 'err');
  } finally {
    if (btn) btn.classList.remove('busy');
  }
}

$('#fleetFilter').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.filter = b.dataset.f;
  $$('#fleetFilter button').forEach((x) => x.classList.toggle('on', x === b));
  renderFleet();
});
$('#tileGroupSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  tileUI.group = b.dataset.g;
  localStorage.setItem(tenantStorageKey(TILE_GROUP_KEY), tileUI.group);
  $$('#tileGroupSeg button').forEach((x) => x.classList.toggle('on', x === b));
  renderFleet();
});
$('#tileDensitySeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  tileUI.density = b.dataset.d;
  localStorage.setItem(tenantStorageKey(TILE_DENSITY_KEY), tileUI.density);
  $$('#tileDensitySeg button').forEach((x) => x.classList.toggle('on', x === b));
  renderFleet();
});
$('#btnTileReset').addEventListener('click', () => {
  localStorage.removeItem(tenantStorageKey(TILE_ORDER_KEY));
  renderFleet();
  toast('Tile order reset', 'ok');
});
$('#btnSelAll').addEventListener('click', () => { visibleBots().forEach((b) => state.selected.add(b.id)); syncSelection(); });
$('#btnSelList').addEventListener('click', () => { visibleBots().forEach((b) => state.selected.add(b.id)); syncSelection(); });
$('#botSearch').addEventListener('input', renderSidebar);

/* Reflect persisted tile prefs on the controls at boot. */
(function initTilePrefs() {
  $$('#tileGroupSeg button').forEach((x) => x.classList.toggle('on', x.dataset.g === tileUI.group));
  $$('#tileDensitySeg button').forEach((x) => x.classList.toggle('on', x.dataset.d === tileUI.density));
})();
