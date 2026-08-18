'use strict';

/* ==================================================================
   Broadcast jobs
   ================================================================== */
async function loadJobs() {
  try { const r = await api('/jobs'); state.jobs = r.jobs || []; }
  catch (_) { return; }
  renderJobs();
}

function renderJobs() {
  const host = $('#jobList');
  if (!state.jobs.length) {
    host.innerHTML = '<div class="empty">No broadcasts yet.</div>';
    return;
  }
  host.innerHTML = state.jobs.slice(0, 12).map((j) => {
    const total = Number(j.total) || 0;
    const done = Number(j.done) || 0;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const live = j.status === 'running' || j.status === 'queued';
    const cls = j.status === 'done' ? 'running' : (j.interrupted || j.status === 'failed' ? 'error' : (live ? 'starting' : ''));
    const label = j.interrupted ? 'interrupted' : (j.status || 'done');
    return `<div class="job">
      <div class="job-top">
        <span class="pill ${cls}">${esc(label)}</span>
        <span class="job-cmd">${esc(j.cmd)}</span>
        <span class="job-n">${done}/${total}${j.skipped ? ' · ' + j.skipped + ' skipped' : ''}</span>
      </div>
      <div class="job-top">
        <div class="bar-meter grow"><i class="${pct >= 100 ? 'done' : ''}" style="width:${pct}%"></i></div>
        <span class="job-n">${esc(ago(j.createdAt))}${j.staggerMs ? ' · ' + dur(j.staggerMs) + ' apart' : ''}</span>
      </div>
    </div>`;
  }).join('');
}

function startJobsPoll() {
  if (state.jobTimer) clearInterval(state.jobTimer);
  if (state.me && state.me.preferences && state.me.preferences.autoRefresh === false) return;
  state.jobTimer = setInterval(() => {
    if (state.page !== 'cmds') return;
    if (document.hidden) return;
    loadJobs();
  }, 3000);
}

/* ==================================================================
   Per-account aliases
   ================================================================== */
async function loadCmds() {
  try {
    const r = await api('/custom-cmds');
    state.cmds = r.cmds || [];
    state.syncedTo = r.syncedTo || 0;
  } catch (e) { toast(e.message, 'err'); return; }
  renderCmds();
}

function renderCmds() {
  const rows = state.cmds;
  $('#cmSub').textContent = rows.length
    ? `${rows.length} saved · pushed to ${state.syncedTo} bot${state.syncedTo === 1 ? '' : 's'}`
    : 'No aliases yet';

  if (!rows.length) {
    const msg = 'No aliases yet. Save commands you run often; they sync only to bots owned by this account.';
    $('#cmBody').innerHTML = `<tr><td colspan="4"><div class="empty">${msg}</div></td></tr>`;
    $('#cmCards').innerHTML = `<div class="empty">${msg}</div>`;
    return;
  }

  const acts = (c, wide) => `
    <button class="btn sm${wide ? '' : ' icon'}" data-cmrun="${esc(c.id)}" title="Broadcast" aria-label="Broadcast ${esc(c.name)}">${wide ? 'Run' : SVG(ICONS.send, 13)}</button>
    <button class="btn sm${wide ? '' : ' icon'}" data-cmedit="${esc(c.id)}" title="Edit" aria-label="Edit ${esc(c.name)}">${wide ? 'Edit' : SVG(ICONS.edit, 13)}</button>
    <button class="btn sm${wide ? '' : ' icon'} danger" data-cmdel="${esc(c.id)}" title="Delete" aria-label="Delete ${esc(c.name)}">${wide ? 'Delete' : SVG(ICONS.trash, 13)}</button>`;

  $('#cmBody').innerHTML = rows.map((c) => `<tr>
    <td class="m"><b>${esc(c.name)}</b></td>
    <td class="m dim"><span class="trunc">${esc(c.cmd)}</span></td>
    <td class="dim"><span class="trunc">${esc(c.description || c.desc || '')}</span></td>
    <td class="col-x"><div class="fleet-acts">${acts(c)}</div></td>
  </tr>`).join('');

  $('#cmCards').innerHTML = rows.map((c) => `<div class="card">
    <div class="card-top"><span class="card-title">${esc(c.name)}</span></div>
    <dl class="card-kv">
      <dt>Command</dt><dd>${esc(c.cmd)}</dd>
      ${(c.description || c.desc) ? `<dt>About</dt><dd>${esc(c.description || c.desc)}</dd>` : ''}
    </dl>
    <div class="card-acts">${acts(c, true)}</div>
  </div>`).join('');

  $$('[data-cmrun]').forEach((b) => b.addEventListener('click', () => {
    const c = rows.find((x) => String(x.id) === b.dataset.cmrun);
    if (c) openMassCmd(c.cmd);
  }));
  $$('[data-cmedit]').forEach((b) => b.addEventListener('click', () => {
    const c = rows.find((x) => String(x.id) === b.dataset.cmedit);
    if (c) openCmdModal(c);
  }));
  $$('[data-cmdel]').forEach((b) => b.addEventListener('click', async () => {
    const c = rows.find((x) => String(x.id) === b.dataset.cmdel);
    if (!c) return;
    const ok = await confirmModal({ title: 'Delete command', body: `Delete <b>${esc(c.name)}</b>?`, confirm: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api(`/custom-cmds/${encodeURIComponent(c.id)}`, { method: 'DELETE' });
      toast('Command deleted', 'ok');
      await loadCmds();
    } catch (e) { toast(e.message, 'err'); }
  }));
}

function openCmdModal(existing) {
  const c = existing || {};
  openModal({
    title: existing ? 'Edit alias' : 'New alias',
    body: `<div class="form">
      <div class="fld">
        <label for="ccName">Name <em>*</em></label>
        <input id="ccName" maxlength="40" value="${esc(c.name || '')}" placeholder="afk-warp" autocomplete="off">
        <div class="hint">Used as a shorthand when broadcasting. Max 40 characters.</div>
      </div>
      <div class="fld">
        <label for="ccCmd">Command <em>*</em></label>
        <input id="ccCmd" maxlength="300" value="${esc(c.cmd || '')}" placeholder="/warp afk" autocomplete="off" spellcheck="false">
        <div class="hint">Sent verbatim to each bot. Use <code>!</code> for bot commands and <code>/</code> for server commands.</div>
      </div>
      <div class="fld">
        <label for="ccDesc">Description</label>
        <input id="ccDesc" maxlength="200" value="${esc(c.description || c.desc || '')}" placeholder="Optional note" autocomplete="off">
      </div>
    </div>`,
    confirm: existing ? 'Save' : 'Create',
    onSubmit: async () => {
      const name = $('#ccName').value.trim();
      const cmd = $('#ccCmd').value.trim();
      if (!name) throw new Error('Name is required');
      if (!cmd) throw new Error('Command is required');
      const body = JSON.stringify({ name, cmd, description: $('#ccDesc').value.trim() });
      if (existing) await api(`/custom-cmds/${encodeURIComponent(c.id)}`, { method: 'PATCH', body });
      else await api('/custom-cmds', { method: 'POST', body });
      toast(existing ? 'Alias saved' : 'Alias created', 'ok');
      await loadCmds();
    },
  });
}

$('#btnAddCmd').addEventListener('click', () => openCmdModal(null));
$('#cmSync').addEventListener('click', async (e) => {
  const b = e.currentTarget;
  b.classList.add('busy');
  try {
    const r = await api('/custom-cmds/sync', { method: 'POST' });
    toast(`Pushed to ${r.pushed ?? 0} bot${r.pushed === 1 ? '' : 's'}`, 'ok');
    await loadCmds();
  } catch (err) { toast(err.message, 'err'); }
  finally { b.classList.remove('busy'); }
});

/* ==================================================================
   Users (admin only)
   ================================================================== */
async function loadUsers() {
  try { const r = await api('/users'); state.users = r.users || []; }
  catch (e) { toast(e.message, 'err'); return; }
  renderUsers();
}

function renderUsers() {
  const rows = state.users;
  $('#usSub').textContent = `${rows.length} account${rows.length === 1 ? '' : 's'}`;
  if (!rows.length) {
    $('#usBody').innerHTML = '<tr><td colspan="5"><div class="empty">No users.</div></td></tr>';
    $('#usCards').innerHTML = '<div class="empty">No users.</div>';
    return;
  }

  const ownership = (u) => {
    const bots = botsArray().filter((bot) => bot.ownerId === u.id).length;
    const endpoints = (state.proxies || []).filter((proxy) => proxy.owner === u.id).length;
    return `${bots} bot${bots === 1 ? '' : 's'} · ${endpoints} proxy endpoint${endpoints === 1 ? '' : 's'}`;
  };
  const self = (u) => state.me && String(u.id) === String(state.me.id);
  const acts = (u, wide) => `
    <button class="btn sm${wide ? '' : ' icon'}" data-usedit="${esc(u.id)}" title="Edit" aria-label="Edit ${esc(u.email)}">${wide ? 'Edit' : SVG(ICONS.edit, 13)}</button>
    <button class="btn sm${wide ? '' : ' icon'} danger" data-usdel="${esc(u.id)}" title="${self(u) ? 'You cannot delete yourself' : 'Delete'}" aria-label="Delete ${esc(u.email)}" ${self(u) ? 'disabled' : ''}>${wide ? 'Delete' : SVG(ICONS.trash, 13)}</button>`;

  $('#usBody').innerHTML = rows.map((u) => `<tr>
    <td class="m"><b>${esc(u.email)}</b>${self(u) ? ' <span class="dim3">(you)</span>' : ''}</td>
    <td><span class="pill ${u.role === 'admin' ? 'running' : ''}">${esc(u.role || 'user')}</span></td>
    <td class="dim"><span class="trunc">${esc(ownership(u))}</span></td>
    <td class="dim m">${esc(u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—')}</td>
    <td class="col-x"><div class="fleet-acts">${acts(u)}</div></td>
  </tr>`).join('');

  $('#usCards').innerHTML = rows.map((u) => `<div class="card">
    <div class="card-top">
      <span class="card-title">${esc(u.email)}</span>
      <span class="pill ${u.role === 'admin' ? 'running' : ''}">${esc(u.role || 'user')}</span>
    </div>
    <dl class="card-kv">
      <dt>Ownership</dt><dd>${esc(ownership(u))}</dd>
      <dt>Created</dt><dd>${esc(u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—')}</dd>
    </dl>
    <div class="card-acts">${acts(u, true)}</div>
  </div>`).join('');

  $$('[data-usedit]').forEach((b) => b.addEventListener('click', () => {
    const u = rows.find((x) => String(x.id) === b.dataset.usedit);
    if (u) openUserModal(u);
  }));
  $$('[data-usdel]').forEach((b) => b.addEventListener('click', async () => {
    if (b.hasAttribute('disabled')) return;
    const u = rows.find((x) => String(x.id) === b.dataset.usdel);
    if (!u) return;
    const ok = await confirmModal({ title: 'Delete user', body: `Delete <b>${esc(u.email)}</b>? They lose access immediately.`, confirm: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api(`/users/${encodeURIComponent(u.id)}`, { method: 'DELETE' });
      toast('User deleted', 'ok');
      await loadUsers();
    } catch (e) { toast(e.message, 'err'); }
  }));
}

function openUserModal(existing) {
  const u = existing || {};
  openModal({
    title: existing ? 'Edit user' : 'New user',
    body: `<div class="form">
      <div class="fld">
        <label for="nuEmail">Username or email <em>*</em></label>
        <input id="nuEmail" type="text" value="${esc(u.email || '')}" autocomplete="off" spellcheck="false" ${existing ? 'disabled' : ''}>
      </div>
      <div class="fld">
        <label for="nuPass">Password ${existing ? '' : '<em>*</em>'}</label>
        <input id="nuPass" type="password" autocomplete="new-password" placeholder="${existing ? 'Leave blank to keep current' : ''}">
      </div>
      <div class="fld">
        <label for="nuRole">Role</label>
        <select id="nuRole">
          <option value="user"${(u.role || 'user') === 'user' ? ' selected' : ''}>User · owns private resources</option>
          <option value="admin"${u.role === 'admin' ? ' selected' : ''}>Admin · manages the service</option>
        </select>
      </div>
      <div class="hint">Bots and proxies are assigned by owner. An account cannot be deleted until its resources are reassigned or removed.</div>
    </div>`,
    confirm: existing ? 'Save' : 'Create',
    onSubmit: async () => {
      const email = $('#nuEmail').value.trim();
      const pass = $('#nuPass').value;
      const role = $('#nuRole').value;
      if (!existing) {
        if (!email) throw new Error('Email is required');
        if (!pass) throw new Error('Password is required');
        await api('/users', { method: 'POST', body: JSON.stringify({ email, password: pass, role }) });
      } else {
        const body = { role };
        if (pass) body.password = pass;
        await api(`/users/${encodeURIComponent(u.id)}`, { method: 'PATCH', body: JSON.stringify(body) });
      }
      toast(existing ? 'User saved' : 'User created', 'ok');
      await loadUsers();
    },
  });

}

$('#btnAddUser').addEventListener('click', () => openUserModal(null));

function applyRoleVisibility() {
  const admin = state.me && state.me.role === 'admin';
  $$('[data-nav="users"]').forEach((b) => { b.style.display = admin ? '' : 'none'; });
  $$('.admin-only').forEach((el) => { el.style.display = admin ? '' : 'none'; });
  if (!admin && state.page === 'users') setPage('fleet');
}
