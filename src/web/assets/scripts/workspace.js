'use strict';

const PREF_PAGE = { overview:'fleet', commands:'cmds' };

function applyPreferences(preferences = {}) {
  const prefs = {
    theme: preferences.theme || 'dark',
    density: preferences.density || 'comfortable',
    startPage: preferences.startPage || 'overview',
    sidebar: preferences.sidebar || 'expanded',
    timezone: preferences.timezone || 'local',
    confirmDanger: preferences.confirmDanger !== false,
    autoRefresh: preferences.autoRefresh !== false,
  };
  if (state.me) state.me.preferences = prefs;
  document.documentElement.dataset.theme = prefs.theme;
  document.body.classList.toggle('sidebar-collapsed', prefs.sidebar === 'collapsed');
  document.body.classList.toggle('density-compact', prefs.density === 'compact');
  if (typeof tileUI !== 'undefined') {
    tileUI.density = prefs.density;
    try { localStorage.setItem(tenantStorageKey(TILE_DENSITY_KEY), prefs.density); } catch (_) {}
  }
  return prefs;
}

function preferredStartPage() {
  const raw = state.me && state.me.preferences && state.me.preferences.startPage;
  return PREF_PAGE[raw] || raw || 'fleet';
}

function accountInitials(value) {
  const raw = String(value || 'BH').split('@')[0].replace(/[^a-z0-9]+/ig, ' ').trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts.slice(0, 2).map(p => p[0]).join('') : raw.slice(0, 2)).toUpperCase() || 'BH';
}

async function loadWorkspace() {
  try {
    const data = await api('/workspace');
    state.libraryScripts = data.scripts || [];
    state.workspaceAliases = data.aliases || [];
    applyPreferences(data.preferences || state.me?.preferences || {});
    renderLibraryScripts();
    renderAccount();
  } catch (e) {
    toast(e.message, 'err');
  }
}

function renderAccount() {
  if (!state.me) return;
  const prefs = state.me.preferences || {};
  $('#acctEmail').textContent = state.me.email || '--';
  $('#acctLogin').value = state.me.email || '';
  $('#acctRole').textContent = state.me.role || 'user';
  $('#acctRole').className = `pill ${state.me.role === 'admin' ? 'running' : ''}`;
  $('#acctAvatar').textContent = accountInitials(state.me.email);
  $('#acctSince').textContent = state.me.createdAt
    ? `Member since ${new Date(state.me.createdAt).toLocaleDateString()}`
    : 'Personal BotHive workspace';
  $('#prefTheme').value = prefs.theme || 'dark';
  $('#prefDensity').value = prefs.density || 'comfortable';
  $('#prefStart').value = prefs.startPage || 'overview';
  $('#prefSidebar').value = prefs.sidebar || 'expanded';
  $('#prefConfirm').checked = prefs.confirmDanger !== false;
  $('#prefRefresh').checked = prefs.autoRefresh !== false;
  $('#acctAliasCount').textContent = (state.cmds || state.workspaceAliases || []).length;
  $('#acctScriptCount').textContent = (state.libraryScripts || []).length;
  $('#acctProxyCount').textContent = (state.proxies || []).length;
  $('#acctBotCount').textContent = state.bots.size;
}

$('#accountForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = e.currentTarget.querySelector('button[type="submit"]');
  button.classList.add('busy');
  try {
    const body = { email: $('#acctLogin').value.trim() };
    if ($('#acctPassword').value) body.password = $('#acctPassword').value;
    const result = await api('/account', { method:'PATCH', body:JSON.stringify(body) });
    state.me = { ...state.me, ...(result.user || {}) };
    $('#acctPassword').value = '';
    renderAccount();
    toast('Account updated', 'ok');
  } catch (err) { toast(err.message, 'err'); }
  finally { button.classList.remove('busy'); }
});

$('#prefsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = e.currentTarget.querySelector('button[type="submit"]');
  button.classList.add('busy');
  try {
    const body = {
      theme: $('#prefTheme').value,
      density: $('#prefDensity').value,
      startPage: $('#prefStart').value,
      sidebar: $('#prefSidebar').value,
      confirmDanger: $('#prefConfirm').checked,
      autoRefresh: $('#prefRefresh').checked,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
    };
    const result = await api('/preferences', { method:'PATCH', body:JSON.stringify(body) });
    applyPreferences(result.preferences || body);
    renderFleet();
    $('#prefsSaved').textContent = 'Saved';
    setTimeout(() => { if ($('#prefsSaved')) $('#prefsSaved').textContent = ''; }, 1800);
    toast('Preferences saved', 'ok');
  } catch (err) { toast(err.message, 'err'); }
  finally { button.classList.remove('busy'); }
});

$$('[data-go]').forEach(button => button.addEventListener('click', () => setPage(button.dataset.go)));

/* ==================================================================
   Account script library
   ================================================================== */
async function loadLibraryScripts() {
  try {
    const result = await api('/scripts');
    state.libraryScripts = result.scripts || [];
    renderLibraryScripts();
    renderAccount();
  } catch (e) { toast(e.message, 'err'); }
}

function scriptActionLabel(script) {
  const value = script.action && script.action.value || '';
  return `${script.action?.type === 'chat' ? 'chat' : 'command'}: ${value}`;
}

function scriptTypeLabel(script) {
  if (script.type === 'message-trigger') return 'Message trigger';
  return `Every ${dur(script.interval || 5000)}`;
}

function renderLibraryScripts() {
  if (!$('#libBody')) return;
  const rows = state.libraryScripts || [];
  const deployments = rows.reduce((sum, script) => sum + (script.botIds || []).length, 0);
  $('#libTotal').textContent = rows.length;
  $('#libEnabled').textContent = rows.filter(s => s.enabled !== false).length;
  $('#libDeployments').textContent = deployments;
  $('#libOwner').textContent = state.me?.email || '--';
  $('#libSub').textContent = `${rows.length} private script${rows.length === 1 ? '' : 's'}`;

  if (!rows.length) {
    const empty = '<div class="empty">No library scripts yet. Create one and choose which of your bots should receive it.</div>';
    $('#libBody').innerHTML = `<tr><td colspan="6">${empty}</td></tr>`;
    $('#libCards').innerHTML = empty;
    return;
  }

  const actions = (script, wide = false) => `
    <button class="btn sm${wide ? '' : ' icon'}" data-libedit="${esc(script.id)}" aria-label="Edit ${esc(script.name)}">${wide ? 'Edit' : SVG(ICONS.edit, 13)}</button>
    <button class="btn sm${wide ? '' : ' icon'} danger" data-libdel="${esc(script.id)}" aria-label="Delete ${esc(script.name)}">${wide ? 'Delete' : SVG(ICONS.trash, 13)}</button>`;

  $('#libBody').innerHTML = rows.map(script => `<tr>
    <td><b>${esc(script.name)}</b><div class="dim3">${esc(script.description || '')}</div></td>
    <td class="m dim">${esc(scriptTypeLabel(script))}</td>
    <td class="m dim"><span class="trunc">${esc(scriptActionLabel(script))}</span></td>
    <td class="m">${(script.botIds || []).length}</td>
    <td><button class="sw ${script.enabled !== false ? 'on' : ''}" data-libtog="${esc(script.id)}" role="switch" aria-checked="${script.enabled !== false}"></button></td>
    <td class="col-x"><div class="fleet-acts">${actions(script)}</div></td>
  </tr>`).join('');

  $('#libCards').innerHTML = rows.map(script => `<div class="card">
    <div class="card-top"><span class="card-title">${esc(script.name)}</span><span class="pill ${script.enabled !== false ? 'running' : ''}">${script.enabled !== false ? 'enabled' : 'disabled'}</span></div>
    <dl class="card-kv"><dt>Type</dt><dd>${esc(scriptTypeLabel(script))}</dd><dt>Targets</dt><dd>${(script.botIds || []).length}</dd><dt>Action</dt><dd>${esc(scriptActionLabel(script))}</dd></dl>
    <div class="card-acts">${actions(script, true)}</div>
  </div>`).join('');

  $$('[data-libedit]').forEach(button => button.addEventListener('click', () => {
    const script = rows.find(s => s.id === button.dataset.libedit);
    if (script) openLibraryScriptModal(script);
  }));
  $$('[data-libdel]').forEach(button => button.addEventListener('click', async () => {
    const script = rows.find(s => s.id === button.dataset.libdel);
    if (!script) return;
    const ok = await confirmModal({ title:'Delete script', body:`Delete <b>${esc(script.name)}</b> from your library and its target bots?`, confirm:'Delete', danger:true });
    if (!ok) return;
    try { await api(`/scripts/${encodeURIComponent(script.id)}`, { method:'DELETE' }); await loadLibraryScripts(); toast('Script deleted', 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }));
  $$('[data-libtog]').forEach(button => button.addEventListener('click', async () => {
    const script = rows.find(s => s.id === button.dataset.libtog);
    if (!script) return;
    button.classList.add('busy');
    try {
      await api(`/scripts/${encodeURIComponent(script.id)}`, { method:'PATCH', body:JSON.stringify({ enabled:script.enabled === false }) });
      await loadLibraryScripts();
    } catch (e) { toast(e.message, 'err'); button.classList.remove('busy'); }
  }));
}

function scriptFields(script = {}, fixedBotId = null) {
  const selected = new Set(fixedBotId ? [fixedBotId] : (script.botIds || []));
  const type = script.type || 'interval';
  const targetBots = botsArray().filter(bot => bot.ownerId === state.me?.id);
  return `<div class="form two">
    <div class="fld"><label for="scName">Name <em>*</em></label><input id="scName" maxlength="80" value="${esc(script.name || '')}" placeholder="Auto home"></div>
    <div class="fld"><label for="scType">Type</label><select id="scType"><option value="interval"${type === 'interval' ? ' selected' : ''}>Interval</option><option value="message-trigger"${type === 'message-trigger' ? ' selected' : ''}>Message trigger</option></select></div>
    <div class="fld"><label for="scActionType">Action</label><select id="scActionType"><option value="command"${script.action?.type !== 'chat' ? ' selected' : ''}>Bot command</option><option value="chat"${script.action?.type === 'chat' ? ' selected' : ''}>Chat message</option></select></div>
    <div class="fld"><label for="scAction">Action value <em>*</em></label><input id="scAction" maxlength="300" value="${esc(script.action?.value || '')}" placeholder="home"></div>
    <div class="fld" data-script-interval><label for="scInterval">Interval (seconds)</label><input id="scInterval" type="number" min="1" max="86400" value="${Math.max(1, Math.round((script.interval || 5000) / 1000))}"></div>
    <div class="fld" data-script-trigger><label for="scPattern">Message pattern</label><input id="scPattern" maxlength="200" value="${esc(script.trigger?.pattern || '')}" placeholder="server restarting"></div>
    <div class="fld" data-script-trigger><label for="scMatch">Match mode</label><select id="scMatch"><option value="contains">Contains</option><option value="exact"${script.trigger?.matchType === 'exact' ? ' selected' : ''}>Exact</option><option value="regex"${script.trigger?.matchType === 'regex' ? ' selected' : ''}>Regular expression</option></select></div>
    <div class="fld" data-script-trigger><label for="scCooldown">Cooldown (seconds)</label><input id="scCooldown" type="number" min="0" max="300" value="${Math.round((script.cooldown || 3000) / 1000)}"></div>
    <div class="fld span"><label for="scDesc">Description</label><input id="scDesc" maxlength="200" value="${esc(script.description || '')}" placeholder="Optional internal note"></div>
    ${fixedBotId ? '' : `<div class="fld span"><label>Target bots</label><div class="script-targets">${targetBots.length ? targetBots.map(bot => `<label><input type="checkbox" data-script-bot="${esc(bot.id)}" ${selected.has(bot.id) ? 'checked' : ''}><span>${esc(bot.id)}</span><small>${esc(catOf(bot))}</small></label>`).join('') : '<span class="hint">Deploy a bot under this account first.</span>'}</div></div>`}
  </div>`;
}

function readScriptForm(fixedBotId = null) {
  const type = $('#scType').value;
  const script = {
    name: $('#scName').value.trim(),
    type,
    enabled: true,
    description: $('#scDesc').value.trim(),
    action: { type:$('#scActionType').value, value:$('#scAction').value.trim() },
    botIds: fixedBotId ? [fixedBotId] : $$('[data-script-bot]:checked').map(input => input.dataset.scriptBot),
  };
  if (!script.name || !script.action.value) throw new Error('Name and action are required');
  if (type === 'interval') script.interval = Math.max(1, Number($('#scInterval').value) || 5) * 1000;
  else {
    const pattern = $('#scPattern').value.trim();
    if (!pattern) throw new Error('Message pattern is required');
    script.trigger = { pattern, matchType:$('#scMatch').value, ignoreCase:true, source:'all' };
    script.cooldown = Math.max(0, Number($('#scCooldown').value) || 0) * 1000;
  }
  return script;
}

function wireScriptType() {
  const paint = () => {
    const interval = $('#scType').value === 'interval';
    $$('[data-script-interval]').forEach(el => { el.style.display = interval ? '' : 'none'; });
    $$('[data-script-trigger]').forEach(el => { el.style.display = interval ? 'none' : ''; });
  };
  $('#scType').addEventListener('change', paint);
  paint();
}

function openLibraryScriptModal(existing) {
  openModal({
    title: existing ? 'Edit library script' : 'New library script',
    sub: 'Private account automation', wide:true,
    body: scriptFields(existing || {}),
    confirm: existing ? 'Save script' : 'Create script',
    onSubmit: async () => {
      const body = readScriptForm();
      if (existing) await api(`/scripts/${encodeURIComponent(existing.id)}`, { method:'PATCH', body:JSON.stringify(body) });
      else await api('/scripts', { method:'POST', body:JSON.stringify(body) });
      await loadLibraryScripts();
      toast(existing ? 'Script saved' : 'Script created', 'ok');
    },
  });
  wireScriptType();
}

$('#btnAddLibraryScript').addEventListener('click', () => openLibraryScriptModal(null));

function openBotScriptModal() {
  const id = state.activeId;
  if (!id) return;
  openModal({
    title:'New bot script', sub:id, wide:true,
    body:scriptFields({}, id), confirm:'Create script',
    onSubmit:async () => {
      await api(`/bots/${encodeURIComponent(id)}/scripts`, { method:'POST', body:JSON.stringify(readScriptForm(id)) });
      await loadScripts(id);
      toast('Bot script created', 'ok');
    },
  });
  wireScriptType();
}
$('#btnAddBotScript').addEventListener('click', openBotScriptModal);

/* ==================================================================
   Missing bot configuration and inventory views
   ================================================================== */
function renderConfig() {
  const bot = state.bots.get(state.activeId);
  const form = $('#cfgForm');
  if (!bot) { form.innerHTML = '<div class="empty">Select a bot first.</div>'; return; }
  const cfg = bot.config || {};
  const currentProxy = proxyOf(bot);
  const admin = state.me && state.me.role === 'admin';
  form.innerHTML = `<div class="form two">
    <div class="fld"><label for="cfgUser">Minecraft username</label><input id="cfgUser" value="${esc(cfg.username || '')}" autocomplete="off"></div>
    <div class="fld"><label for="cfgCategory">Category</label><input id="cfgCategory" value="${esc(cfg.category || 'Uncategorized')}" autocomplete="off"></div>
    <div class="fld"><label for="cfgHost">Server host</label><input id="cfgHost" value="${esc(cfg.host || '')}" autocomplete="off"></div>
    <div class="fld"><label for="cfgPort">Port</label><input id="cfgPort" type="number" value="${esc(cfg.port || 25565)}"></div>
    <div class="fld"><label for="cfgVersion">Minecraft version</label><input id="cfgVersion" value="${esc(cfg.version || '1.20.1')}"></div>
    <div class="fld"><label for="cfgProxy">Proxy</label><select id="cfgProxy"><option value="">Direct connection</option>${state.proxies.map(proxy => `<option value="${esc(proxy.id)}"${currentProxy && (proxy.id === currentProxy.id || proxy.uri === currentProxy.uri) ? ' selected' : ''}>${esc(proxy.label || shortProxy(proxy.uri))}</option>`).join('')}</select></div>
    ${admin ? `<div class="fld span"><label for="cfgOwner">Resource owner</label><select id="cfgOwner">${state.users.map(user => `<option value="${esc(user.id)}"${user.id === bot.ownerId ? ' selected' : ''}>${esc(user.email)} · ${esc(user.role)}</option>`).join('')}</select><div class="hint">Transferring ownership clears account-level aliases and deployed scripts from this bot.</div></div>` : ''}
    <div class="fld"><label for="cfgPassword">Login password</label><input id="cfgPassword" type="password" autocomplete="new-password" placeholder="Leave blank to keep current"></div>
    <div class="fld"><label>Authentication handshake</label><label class="mc-row"><input id="cfgAutoLogin" type="checkbox" ${cfg.autoLogin ? 'checked' : ''}> Auto login</label><label class="mc-row"><input id="cfgAutoRegister" type="checkbox" ${cfg.autoRegister ? 'checked' : ''}> Auto register</label></div>
    <div class="fld span"><label class="setting-toggle"><span><b>Reconnect automatically</b><small>Restart the connection after kicks or network loss.</small></span><input id="cfgReconnect" type="checkbox" ${cfg.autoReconnect !== false ? 'checked' : ''}></label></div>
    <button class="btn pri span" type="submit">Save configuration</button>
  </div>`;
  form.onsubmit = async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.classList.add('busy');
    try {
      if (admin && $('#cfgOwner').value !== bot.ownerId) {
        const owner = state.users.find(user => user.id === $('#cfgOwner').value);
        const ok = await confirmModal({ title:'Transfer bot ownership', body:`Transfer <b>${esc(bot.id)}</b> to <b>${esc(owner?.email || 'this account')}</b>? Account aliases and deployed scripts will be cleared from this bot.`, confirm:'Transfer', danger:true });
        if (!ok) return;
        const transfer = await api(`/bots/${encodeURIComponent(bot.id)}/owner`, { method:'PATCH', body:JSON.stringify({ ownerId:$('#cfgOwner').value }) });
        if (transfer.bot) state.bots.set(bot.id, transfer.bot);
      }
      const patch = {
        username:$('#cfgUser').value.trim(), category:$('#cfgCategory').value.trim(),
        host:$('#cfgHost').value.trim(), port:Number($('#cfgPort').value) || 25565,
        version:$('#cfgVersion').value.trim(), proxyId:$('#cfgProxy').value,
        autoLogin:$('#cfgAutoLogin').checked, autoRegister:$('#cfgAutoRegister').checked,
        autoReconnect:$('#cfgReconnect').checked,
      };
      if ($('#cfgPassword').value) patch.loginPassword = $('#cfgPassword').value;
      const result = await api(`/bots/${encodeURIComponent(bot.id)}/config`, { method:'PATCH', body:JSON.stringify(patch) });
      if (result.bot) state.bots.set(bot.id, result.bot);
      renderBotHead(); renderSidebar(); renderFleet(); renderConfig();
      toast('Configuration saved', 'ok');
    } catch (e) { toast(e.message, 'err'); }
    finally { button.classList.remove('busy'); }
  };
}

async function loadInventory(id) {
  try {
    const result = await api(`/bots/${encodeURIComponent(id)}/inventory`);
    state.inv.set(id, result.inventory || []);
    renderInventory(id);
  } catch (e) { toast(e.message, 'err'); }
}

function renderInventory(id) {
  const inventory = state.inv.get(id);
  const items = Array.isArray(inventory) ? inventory : (inventory && (inventory.items || inventory.slots)) || [];
  $('#invSub').textContent = items.length ? `${items.filter(Boolean).length} occupied slots` : 'No inventory snapshot';
  $('#invGrid').innerHTML = items.length
    ? items.map((item, index) => `<div class="slot ${item ? 'has' : ''}"><span>${item ? esc(item.displayName || item.name || item.type || 'item') : `Slot ${index}`}</span>${item && (item.count || item.amount) ? `<span class="ct">${esc(item.count || item.amount)}</span>` : ''}</div>`).join('')
    : '<div class="empty">Start the bot and refresh to load its inventory.</div>';
}

$('#btnInvRefresh').addEventListener('click', async (event) => {
  if (!state.activeId) return;
  event.currentTarget.classList.add('busy');
  try {
    await api(`/bots/${encodeURIComponent(state.activeId)}/inventory/refresh`, { method:'POST', body:JSON.stringify({}) });
    setTimeout(() => loadInventory(state.activeId), 450);
  } catch (e) { toast(e.message, 'err'); }
  finally { setTimeout(() => event.currentTarget.classList.remove('busy'), 500); }
});
