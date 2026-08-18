'use strict';

/* ==================================================================
   Modules

   Rows: { key, label, group, describe, running, canStart, canStop,
           readOnly, unavailable, detail, fields, editable, armed,
           savedOpts }
   Field defs: { key, label, type:'number'|'text'|'list', min, max,
                 step, default, required, placeholder, info }
   ================================================================== */
async function loadModules(id) {
  try {
    const r = await api(`/bots/${encodeURIComponent(id)}/modules`);
    state.modules.set(id, r.modules || []);
  } catch (e) {
    state.modules.set(id, []);
    toast(e.message, 'err');
  }
  if (state.activeId === id) $('#tnMod').textContent = (state.modules.get(id) || []).length;
  renderModules(id);
}

function renderModules(id) {
  const host = $('#modList');
  const rows = state.modules.get(id) || [];
  const b = state.bots.get(id);
  if (!b) { host.innerHTML = ''; return; }
  if (!rows.length) { host.innerHTML = '<div class="empty">No modules reported.</div>'; return; }

  const groups = new Map();
  for (const r of rows) {
    const g = r.group || 'Other';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }

  host.innerHTML = Array.from(groups.entries()).map(([g, list]) => `
    <div class="sec">${esc(g)}</div>
    ${list.map((m) => {
      const on = !!m.running;
      const blocked = !!m.unavailable;
      const canToggle = !m.readOnly && !blocked && (b.status === 'running' || m.editable || m.armed !== undefined);
      return `<div class="mod" data-mod="${esc(m.key)}">
        <div class="info">
          <div class="name">${esc(m.label || m.key)}
            ${m.armed ? '<span class="chip arm">ARMED</span>' : ''}
          </div>
          <div class="desc">${esc(m.describe || '')}</div>
          ${m.detail ? `<div class="det">${esc(m.detail)}</div>` : ''}
          ${blocked ? `<div class="modrr">${esc(m.unavailable)}</div>` : ''}
        </div>
        ${m.editable ? `<button class="btn sm icon" data-modcfg="${esc(m.key)}" title="Settings" aria-label="Settings for ${esc(m.label || m.key)}">${SVG(ICONS.gear, 13)}</button>` : ''}
        <button class="sw ${on ? 'on' : ''}" data-modtog="${esc(m.key)}" role="switch"
          aria-checked="${on ? 'true' : 'false'}" aria-label="${esc(m.label || m.key)}"
          ${canToggle ? '' : 'disabled'}></button>
      </div>`;
    }).join('')}`).join('') +
    (b.status !== 'running' ? '<div class="prose">Offline changes are saved and applied on the next start.</div>' : '');

  $$('#modList [data-modtog]').forEach((sw) => sw.addEventListener('click', async () => {
    if (sw.hasAttribute('disabled')) return;
    const key = sw.dataset.modtog;
    const action = sw.classList.contains('on') ? 'stop' : 'start';
    sw.classList.add('busy');
    try {
      const r = await api(`/bots/${encodeURIComponent(id)}/modules`, {
        method: 'POST', body: JSON.stringify({ key, action }),
      });
      if (r.modules) state.modules.set(id, r.modules);
      toast(`${key} ${action === 'start' ? 'started' : 'stopped'}`, 'ok');
      renderModules(id);
    } catch (e) {
      sw.classList.remove('busy');
      if (e.data && e.data.requiresSetup) {
        toast(`${key} needs settings first`, 'warn');
        openModuleSettings(id, key);
      } else {
        toast(e.message, 'err');
      }
    }
  }));
  $$('#modList [data-modcfg]').forEach((btn) =>
    btn.addEventListener('click', () => openModuleSettings(id, btn.dataset.modcfg)));
}

function openModuleSettings(id, key) {
  const m = (state.modules.get(id) || []).find((x) => x.key === key);
  if (!m || !m.fields) return;
  const saved = m.savedOpts || {};

  openModal({
    title: m.label || key,
    sub: 'Module settings',
    body: `<div class="form">${m.fields.map((f) => {
      const v = saved[f.key] ?? f.default ?? '';
      const attrs = [
        f.min !== undefined ? `min="${esc(f.min)}"` : '',
        f.max !== undefined ? `max="${esc(f.max)}"` : '',
        f.step !== undefined ? `step="${esc(f.step)}"` : '',
        f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '',
      ].filter(Boolean).join(' ');
      return `<div class="fld">
        <label for="mf_${esc(f.key)}">${esc(f.label)}${f.required ? ' <em>*</em>' : ''}</label>
        <input id="mf_${esc(f.key)}" data-mf="${esc(f.key)}" data-mftype="${esc(f.type)}"
          type="${f.type === 'number' ? 'number' : 'text'}" value="${esc(v)}" ${attrs}>
        ${f.info ? `<div class="hint">${esc(f.info)}</div>` : ''}
      </div>`;
    }).join('')}</div>`,
    confirm: 'Save & arm',
    onSubmit: async () => {
      const opts = {};
      for (const f of m.fields) {
        const el = $(`[data-mf="${CSS.escape(f.key)}"]`);
        if (!el) continue;
        let v = el.value.trim();
        if (f.required && !v) throw new Error(`${f.label} is required`);
        if (f.type === 'number') {
          const n = Number(v);
          if (v !== '' && !Number.isFinite(n)) throw new Error(`${f.label} must be a number`);
          if (v !== '') opts[f.key] = n;
        } else if (v !== '') {
          opts[f.key] = v;
        }
      }
      const r = await api(`/bots/${encodeURIComponent(id)}/modules`, {
        method: 'POST', body: JSON.stringify({ key, action: 'start', opts }),
      });
      if (r.modules) state.modules.set(id, r.modules);
      renderModules(id);
      toast(`${m.label || key} saved`, 'ok');
    },
  });
}

/* ==================================================================
   Scripts
   Scripts are stored in this bot's private runtime folder and can be changed
   while it is offline. The account library can deploy reusable templates.
   ================================================================== */
async function loadScripts(id) {
  try {
    const r = await api(`/bots/${encodeURIComponent(id)}/scripts`);
    state.scripts.set(id, r.scripts || []);
  } catch (e) {
    state.scripts.set(id, []);
    toast(e.message, 'err');
  }
  if (state.activeId === id) $('#tnScr').textContent = (state.scripts.get(id) || []).length;
  renderScripts(id);
}

function renderScripts(id) {
  const host = $('#scrList');
  const rows = state.scripts.get(id) || [];
  const b = state.bots.get(id);
  if (!rows.length) {
    host.innerHTML = '<div class="empty">No scripts for this bot. Create one here or deploy a template from your account library.</div>';
    return;
  }

  host.innerHTML = rows.map((s) => {
    const sid = s.id ?? s.name ?? '';
    const on = s.enabled !== false;
    return `<div class="mod" data-scr="${esc(sid)}">
      <div class="info">
        <div class="name">${esc(s.name || sid)}</div>
        <div class="desc">${esc(s.describe || s.description || s.type || 'Script')}</div>
        <div class="det">${esc(sid)}</div>
      </div>
      <button class="btn sm icon danger" data-scrdel="${esc(sid)}" title="Delete" aria-label="Delete script">${SVG(ICONS.trash, 13)}</button>
      <button class="sw ${on ? 'on' : ''}" data-scrtog="${esc(sid)}" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-label="Enable ${esc(s.name || sid)}"></button>
    </div>`;
  }).join('');

  const send = async (sid, action) => {
    const result = await api(`/bots/${encodeURIComponent(id)}/scripts/${encodeURIComponent(sid)}`, {
      method: 'POST', body: JSON.stringify({ action }),
    });
    if (result.scripts) state.scripts.set(id, result.scripts);
    renderScripts(id);
  };

  $$('#scrList [data-scrtog]').forEach((sw) => sw.addEventListener('click', async () => {
    if (sw.hasAttribute('disabled')) return;
    const sid = sw.dataset.scrtog;
    const action = sw.classList.contains('on') ? 'disable' : 'enable';
    sw.classList.add('busy');
    try { await send(sid, action); toast(`Script ${action}d`, 'ok'); }
    catch (e) { sw.classList.remove('busy'); toast(e.message, 'err'); }
  }));
  $$('#scrList [data-scrdel]').forEach((btn) => btn.addEventListener('click', async () => {
    const sid = btn.dataset.scrdel;
    const ok = await confirmModal({ title:'Delete script', body:`Delete <b>${esc(sid)}</b> from this bot?`, confirm:'Delete', danger:true });
    if (!ok) return;
    try { await send(sid, 'delete'); toast('Script deleted', 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }));
}

$('#btnReloadScripts').addEventListener('click', (e) => {
  if (!state.activeId) return;
  e.currentTarget.classList.add('busy');
  api(`/bots/${encodeURIComponent(state.activeId)}/scripts/reload`, { method:'POST', body:JSON.stringify({}) })
    .then((result) => { if (result.scripts) state.scripts.set(state.activeId, result.scripts); renderScripts(state.activeId); })
    .catch((err) => toast(err.message, 'err'))
    .finally(() => e.currentTarget.classList.remove('busy'));
});

/* ==================================================================
   Proxies
   ================================================================== */
async function loadProxies() {
  try {
    const r = await api('/proxies');
    state.proxies = r.proxies || [];
    state.proxyCap = r.capacity || state.proxyCap;
    state.canReassign = !!r.canReassign;
  } catch (e) {
    toast(e.message, 'err');
    return;
  }
  renderProxies();
  renderFleet();
}

function renderProxies() {
  const rows = state.proxies;
  const cap = state.proxyCap || 1;
  const used = rows.reduce((n, p) => n + ((p.assignedTo || []).length), 0);
  const total = rows.length * cap;
  const dead = rows.filter((p) => p.alive === false).length;

  $('#pxTotal').textContent = rows.length;
  $('#pxUsed').textContent = used;
  $('#pxFree').textContent = Math.max(0, total - used);
  $('#pxSat').textContent = total ? Math.round((used / total) * 100) + '%' : '0%';
  $('#pxDead').textContent = dead;
  $('#nProx').textContent = rows.length;
  $('#nProxM').textContent = rows.length;
  $('#pxSub').textContent = `${cap} bot${cap === 1 ? '' : 's'} per proxy`;

  if (!rows.length) {
    const msg = 'No proxies in the pool. Add SOCKS5 endpoints to spread bots across IPs.';
    $('#pxBody').innerHTML = `<tr><td colspan="7"><div class="empty">${msg}</div></td></tr>`;
    $('#pxCards').innerHTML = `<div class="empty">${msg}</div>`;
    return;
  }

  const health = (p) => p.alive === true
    ? `<span class="pill running">online</span>`
    : (p.alive === false ? `<span class="pill error">offline</span>` : `<span class="pill">untested</span>`);
  const load = (p) => {
    const n = (p.assignedTo || []).length;
    const c = p.capacity || cap;
    let out = '';
    for (let i = 0; i < c; i++) out += `<i class="${i < n ? 'f' : ''}"></i>`;
    for (let i = c; i < n; i++) out += '<i class="o"></i>';
    return `<div class="sat" title="${n} of ${c} slots used">${out}</div>`;
  };
  const assigneeLabel = (entry) => {
    if (typeof entry === 'string') return entry;
    const id = entry && entry.id ? String(entry.id) : '';
    const username = entry && entry.username ? String(entry.username) : '';
    if (username && id && username !== id) return `${username} (${id})`;
    return username || id;
  };
  const assigned = (p) => {
    const list = (p.assignedTo || []).map(assigneeLabel).filter(Boolean);
    const extra = p.hiddenAssignments ? ` +${p.hiddenAssignments}` : '';
    if (!list.length) return `<span class="dim3">${extra ? extra.trim() + ' hidden' : 'unassigned'}</span>`;
    return `<span class="trunc">${esc(list.join(', '))}${esc(extra)}</span>`;
  };

  $('#pxBody').innerHTML = rows.map((p) => `<tr data-px="${esc(p.id)}">
    <td class="m"><b>${esc(p.label || shortProxy(p.uri))}</b>${p.hasAuth ? ' <span class="dim3">auth</span>' : ''}
      ${state.me && state.me.role === 'admin' && p.ownerLabel ? `<div class="dim3">${esc(p.ownerLabel)}</div>` : ''}</td>
    <td>${health(p)}</td>
    <td class="num dim">${p.latency ? esc(p.latency) + 'ms' : '—'}</td>
    <td class="m dim">${assigned(p)}</td>
    <td>${load(p)}</td>
    <td class="dim"><span class="trunc">${esc(p.note || '')}</span></td>
    <td class="col-x"><div class="fleet-acts">
      <button class="btn sm icon" data-pxcheck="${esc(p.id)}" title="Test" aria-label="Test proxy">${SVG(ICONS.spark, 13)}</button>
      <button class="btn sm icon" data-pxnote="${esc(p.id)}" title="Edit note" aria-label="Edit note">${SVG(ICONS.edit, 13)}</button>
      <button class="btn sm icon danger" data-pxdel="${esc(p.id)}" title="Remove" aria-label="Remove proxy">${SVG(ICONS.trash, 13)}</button>
    </div></td>
  </tr>`).join('');

  $('#pxCards').innerHTML = rows.map((p) => `<div class="card" data-px="${esc(p.id)}">
    <div class="card-top">
      <span class="card-title">${esc(p.label || shortProxy(p.uri))}</span>
      ${health(p)}
    </div>
    <dl class="card-kv">
      <dt>Latency</dt><dd>${p.latency ? esc(p.latency) + 'ms' : '—'}</dd>
      <dt>Checked</dt><dd>${esc(ago(p.checkedAt))}</dd>
      <dt>Assigned</dt><dd>${assigned(p)}</dd>
      <dt>Slots</dt><dd>${(p.assignedTo || []).length}/${p.capacity || cap}</dd>
      ${p.note ? `<dt>Note</dt><dd>${esc(p.note)}</dd>` : ''}
    </dl>
    <div class="card-acts">
      <button class="btn sm" data-pxcheck="${esc(p.id)}">Test</button>
      <button class="btn sm" data-pxnote="${esc(p.id)}">Note</button>
      <button class="btn sm danger" data-pxdel="${esc(p.id)}">Remove</button>
    </div>
  </div>`).join('');

  $$('[data-pxcheck]').forEach((b) => b.addEventListener('click', async () => {
    b.classList.add('busy');
    try {
      const r = await api(`/proxies/${encodeURIComponent(b.dataset.pxcheck)}/check`, { method: 'POST' });
      toast(r.alive === false ? 'Proxy is offline' : `Proxy online · ${r.latency || r.ms || '?'}ms`, r.alive === false ? 'err' : 'ok');
    } catch (e) { toast(e.message, 'err'); }
    finally { b.classList.remove('busy'); loadProxies(); }
  }));

  $$('[data-pxnote]').forEach((b) => b.addEventListener('click', () => {
    const p = state.proxies.find((x) => String(x.id) === b.dataset.pxnote);
    if (!p) return;
    openModal({
      title: 'Edit note', sub: p.label || shortProxy(p.uri),
      body: `<div class="form"><div class="fld">
        <label for="pxNote">Note</label>
        <input id="pxNote" value="${esc(p.note || '')}" placeholder="e.g. residential · EU">
      </div></div>`,
      confirm: 'Save',
      onSubmit: async () => {
        await api(`/proxies/${encodeURIComponent(p.id)}`, { method: 'PATCH', body: JSON.stringify({ note: $('#pxNote').value }) });
        await loadProxies();
        toast('Note saved', 'ok');
      },
    });
  }));

  $$('[data-pxdel]').forEach((b) => b.addEventListener('click', async () => {
    const p = state.proxies.find((x) => String(x.id) === b.dataset.pxdel);
    if (!p) return;
    const n = (p.assignedTo || []).length;
    const ok = await confirmModal({
      title: 'Remove proxy',
      body: `Remove <b>${esc(p.label || shortProxy(p.uri))}</b> from the pool?` +
            (n ? `<br><br>${n} bot${n === 1 ? '' : 's'} will fall back to a direct connection.` : ''),
      confirm: 'Remove', danger: true,
    });
    if (!ok) return;
    try {
      const r = await api(`/proxies/${encodeURIComponent(p.id)}`, { method: 'DELETE' });
      toast(r.detached ? `Removed · ${r.detached} bot(s) detached` : 'Proxy removed', 'ok');
      await loadProxies();
    } catch (e) { toast(e.message, 'err'); }
  }));
}

$('#btnPxCheck').addEventListener('click', async (e) => {
  const b = e.currentTarget;
  b.classList.add('busy');
  try {
    const r = await api('/proxies/check-all', { method: 'POST', body: JSON.stringify({}) });
    toast(`${r.working ?? 0} online · ${r.failed ?? 0} offline`, (r.failed ? 'warn' : 'ok'));
    if (r.proxies) { state.proxies = r.proxies; renderProxies(); renderFleet(); }
    else await loadProxies();
  } catch (err) { toast(err.message, 'err'); }
  finally { b.classList.remove('busy'); }
});

$('#btnPxAssign').addEventListener('click', () => {
  openModal({
    title: 'Auto-assign proxies',
    sub: 'Round-robin across the pool',
    body: `<div class="form">
      <div class="fld">
        <label>Options</label>
        <label class="mc-row" style="font-weight:400"><input type="checkbox" id="aaWorking" checked> Only use proxies that passed their last test</label>
        <label class="mc-row" style="font-weight:400"><input type="checkbox" id="aaOver"> Overwrite bots that already have a proxy</label>
      </div>
      <div class="hint">Bots are filled up to ${state.proxyCap} per proxy. Selected bots are used when there is a selection, otherwise the whole fleet.</div>
    </div>`,
    confirm: 'Assign',
    onSubmit: async () => {
      const body = { onlyWorking: $('#aaWorking').checked, overwrite: $('#aaOver').checked };
      if (state.selected.size) body.botIds = Array.from(state.selected);
      const r = await api('/proxies/assign', { method: 'POST', body: JSON.stringify(body) });
      const assignedCount = Array.isArray(r.assigned) ? r.assigned.length : (Number(r.assigned) || 0);
      toast(`Assigned ${assignedCount}${r.skipped ? ` · ${r.skipped} skipped` : ''}`, 'ok');
      if (r.note) toast(r.note, 'warn');
      await loadProxies();
    },
  });
});

$('#btnPxAdd').addEventListener('click', () => {
  openModal({
    title: 'Add proxies',
    sub: 'One endpoint per line',
    body: `<div class="form">
      <div class="fld">
        <label for="pxText">SOCKS5 endpoints</label>
        <textarea id="pxText" rows="7" spellcheck="false" placeholder="host:port&#10;host:port:user:pass&#10;socks5://user:pass@host:port"></textarea>
        <div class="hint">Accepts <code>host:port</code>, <code>host:port:user:pass</code> or a full <code>socks5://</code> URI.</div>
      </div>
      <div class="fld">
        <label class="mc-row" style="font-weight:400"><input type="checkbox" id="pxReplace"> Replace the entire pool</label>
      </div>
    </div>`,
    confirm: 'Add to pool',
    onSubmit: async () => {
      const text = $('#pxText').value.trim();
      if (!text) throw new Error('Enter at least one proxy');
      // Server expects a raw text blob, not an array.
      const r = await api('/proxies', {
        method: 'POST',
        body: JSON.stringify({ text, replace: $('#pxReplace').checked }),
      });
      await loadProxies();
      toast(`Pool updated · ${state.proxies.length} total`, 'ok');
      return r;
    },
  });
});
