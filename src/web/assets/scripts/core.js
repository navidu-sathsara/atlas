'use strict';

/* ==================================================================
   Constants
   ================================================================== */
const MAX_LOG = 400;
const CLAIM_CAT = 'Claim';
const WIDE = new Set(['fleet', 'proxies', 'cmds', 'library', 'schedules', 'users', 'account']);
const PAGES = ['fleet', 'bots', 'proxies', 'cmds', 'library', 'schedules', 'users', 'account'];
const PAGE_TITLES = { fleet:'Overview', bots:'Bot console', proxies:'Network', cmds:'Aliases', library:'Script library', schedules:'Schedules', users:'Users', account:'Account' };
const MC_PRESETS = [250, 500, 1000, 2000, 5000, 15000];
const MC_RECENT_KEY = 'bm.mc.recent';
const MC_MAX_STAGGER = 300000;
const MOBILE = () => window.matchMedia('(max-width: 860px)').matches;

const state = {
  me: null, page: 'fleet', tab: 'console',
  bots: new Map(), selected: new Set(), activeId: null, closed: new Set(),
  logs: new Map(), streams: new Map(), modules: new Map(), scripts: new Map(), inv: new Map(),
  proxies: [], proxyCap: 3, canReassign: false,
  users: [], jobs: [], cmds: [], schedules: [], libraryScripts: [], workspaceAliases: [], syncedTo: 0,
  sort: { key: 'id', dir: 1 }, filter: 'all', lastAnchor: null,
  global: null, loading: false, jobTimer: null, scheduleTimer: null, scheduleLoading: false,
};

const mc = { mode: 'selection', queued: false, stagger: 1000, cats: new Set() };
const MC_MODES = [
  { k:'selection', label:'Selected' },
  { k:'running',   label:'All running' },
  { k:'category',  label:'By category' },
  { k:'all',       label:'Everything' },
];

/* ==================================================================
   Helpers
   ================================================================== */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const tenantStorageKey = (key) => `${key}.${state.me?.id || 'anonymous'}`;

function timeStr(ts) {
  const d = ts ? new Date(ts) : new Date();
  if (Number.isNaN(d.getTime())) return '--:--:--';
  return d.toTimeString().slice(0, 8);
}
function ago(ts) {
  if (!ts) return 'never';
  const s = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
function dur(ms) {
  if (ms < 1000) return ms + 'ms';
  const s = Math.round(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  return m + 'm ' + (s % 60) + 's';
}

const SVG = (p, s = 16) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
  `stroke-linecap="round" stroke-linejoin="round" width="${s}" height="${s}" aria-hidden="true">${p}</svg>`;

const ICONS = {
  grid:   '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  term:   '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  globe:  '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>',
  code:   '<path d="m8 6-6 6 6 6M16 6l6 6-6 6"/>',
  user:   '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  users:  '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 5.2a3.2 3.2 0 0 1 0 5.6M18.5 20a6.6 6.6 0 0 0-2.2-4.9"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus:   '<path d="M12 5v14M5 12h14"/>',
  check:  '<path d="m4 12 5 5L20 6"/>',
  checks: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
  x:      '<path d="M6 6l12 12M18 6L6 18"/>',
  play:   '<path d="M7 4.5v15l13-7.5z"/>',
  stop:   '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  restart:'<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5"/>',
  trash:  '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
  gear:   '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.5 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 10a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  box:    '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 17.5 12 22l9-4.5"/>',
  shield: '<path d="M12 3l7.5 3v6c0 4.5-3 7.8-7.5 9-4.5-1.2-7.5-4.5-7.5-9V6z"/>',
  bolt:   '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
  tag:    '<path d="M3 12.5V4a1 1 0 0 1 1-1h8.5L21 11.5 12.5 20z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
  send:   '<path d="M4 12 20 4l-4 16-4-6z"/>',
  spark:  '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  warn:   '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17.2v.1"/>',
  menu:   '<path d="M4 7h16M4 12h16M4 17h16"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h11"/>',
  refresh:'<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4"/>',
  edit:   '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/>',
};

/* ==================================================================
   Toasts
   ================================================================== */
function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = `<span>${esc(msg)}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .2s, transform .2s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => el.remove(), 220);
  }, kind === 'err' ? 5200 : 3200);
}

/* ==================================================================
   API
   The server answers errors as { ok:false, reason } and module routes
   as { ok:false, error }. Surface whichever is present so the user
   sees the real cause instead of a bare status code.
   ================================================================== */
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    credentials: 'same-origin',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    ...opts,
  });
  if (res.status === 401) { showLogin(); throw new Error('Unauthorized'); }

  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) { try { data = await res.json(); } catch (_) { data = null; } }

  if (!res.ok || (data && data.ok === false)) {
    const reason = (data && (data.reason || data.error || data.message)) || `Request failed (${res.status})`;
    const err = new Error(reason);
    err.data = data;
    throw err;
  }
  return data ?? {};
}

/* ==================================================================
   Auth
   ================================================================== */
function showLogin() {
  $('#login').classList.add('on');
  $('#app').style.display = 'none';
  if (state.global) { try { state.global.close(); } catch (_) {} state.global = null; }
  for (const es of state.streams.values()) { try { es.close(); } catch (_) {} }
  state.streams.clear();
  if (state.jobTimer) { clearInterval(state.jobTimer); state.jobTimer = null; }
  if (state.scheduleTimer) { clearInterval(state.scheduleTimer); state.scheduleTimer = null; }
  setTimeout(() => $('#liEmail').focus(), 60);
}
function showApp() {
  $('#login').classList.remove('on');
  $('#app').style.display = '';
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#liBtn');
  $('#liErr').textContent = '';
  btn.classList.add('busy');
  try {
    const r = await api('/login', {
      method: 'POST',
      body: JSON.stringify({ email: $('#liEmail').value.trim(), password: $('#liPass').value }),
    });
    state.me = r.user;
    $('#liPass').value = '';
    showApp();
    await boot();
  } catch (err) {
    $('#liErr').textContent = err.message;
  } finally {
    btn.classList.remove('busy');
  }
});

async function logout() {
  try { await api('/logout', { method: 'POST' }); } catch (_) {}
  state.me = null;
  state.bots.clear();
  showLogin();
}

/* ==================================================================
   Chrome: icons + mobile shell
   ================================================================== */
function paintChrome() {
  const navIcons = { fleet:ICONS.grid, bots:ICONS.term, proxies:ICONS.globe, cmds:ICONS.bolt, library:ICONS.code, schedules:ICONS.clock, users:ICONS.users, account:ICONS.gear };
  $$('#rail .rail-btn[data-nav]').forEach((b) => {
    b.insertAdjacentHTML('afterbegin', SVG(navIcons[b.dataset.nav], 18));
  });
  $$('#nav .nav-btn[data-nav]').forEach((b) => {
    b.insertAdjacentHTML('afterbegin', SVG(navIcons[b.dataset.nav], 20));
  });
  $('#btnPal').innerHTML = SVG(ICONS.search, 18);
  $('#btnLogout').innerHTML = SVG(ICONS.logout, 18);
  $('#tbMenu').innerHTML = SVG(ICONS.menu, 20);
  $('#tbPal').innerHTML = SVG(ICONS.search, 20);
  $('#tbLogout').innerHTML = SVG(ICONS.logout, 20);
  $('#btnSelList').innerHTML = SVG(ICONS.checks, 15);
  $('#btnAddBot').innerHTML = SVG(ICONS.plus, 15);
  $('#fabMass').insertAdjacentHTML('afterbegin', SVG(ICONS.bolt, 16));
  $('.search').insertAdjacentHTML('afterbegin', SVG(ICONS.search, 14));
}

function openDrawer(on) {
  $('#app').classList.toggle('drawer', on);
}
$('#tbMenu').addEventListener('click', () => openDrawer(!$('#app').classList.contains('drawer')));
$('#scrim').addEventListener('click', () => openDrawer(false));

/* ==================================================================
   Navigation
   ================================================================== */
function setPage(p) {
  if (!PAGES.includes(p)) return;
  state.page = p;
  $$('.page').forEach((el) => el.classList.toggle('on', el.dataset.page === p));
  $$('#rail .rail-btn[data-nav]').forEach((b) => b.classList.toggle('on', b.dataset.nav === p));
  $$('#nav .nav-btn[data-nav]').forEach((b) => b.classList.toggle('on', b.dataset.nav === p));
  $('#app').classList.toggle('wide', WIDE.has(p));
  $('#tbTitle').textContent = PAGE_TITLES[p] || 'Fleet';
  openDrawer(false);

  if (p === 'proxies') loadProxies();
  if (p === 'cmds') { loadCmds(); loadJobs(); }
  if (p === 'library' && typeof loadLibraryScripts === 'function') loadLibraryScripts();
  if (p === 'account' && typeof loadWorkspace === 'function') loadWorkspace();
  if (p === 'schedules' && typeof loadSchedules === 'function') {
    loadSchedules();
    startSchedulesPoll();
  } else if (typeof stopSchedulesPoll === 'function') {
    stopSchedulesPoll();
  }
  if (p === 'users') loadUsers();
  if (p === 'bots') syncConsoles();
}

function setTab(t) {
  state.tab = t;
  $$('#botTabs .tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  $$('[data-pane]').forEach((el) => el.classList.toggle('on', el.dataset.pane === t));
  if (!state.activeId) return;
  if (t === 'inventory') loadInventory(state.activeId);
  if (t === 'modules') loadModules(state.activeId);
  if (t === 'scripts') loadScripts(state.activeId);
  if (t === 'console') syncConsoles();
}

$$('[data-nav]').forEach((b) => b.addEventListener('click', () => setPage(b.dataset.nav)));
$$('#botTabs .tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
$('#btnLogout').addEventListener('click', logout);
$('#tbLogout').addEventListener('click', logout);
