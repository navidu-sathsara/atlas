'use strict';

/* ==================================================================
   Modal system
   ================================================================== */
let modalCtx = null;

function openModal({ title, sub, body, confirm = 'Save', cancel = 'Cancel', danger = false, wide = false, onSubmit }) {
  modalCtx = { onSubmit };
  $('#veilHost').outerHTML = `<div class="modal${wide ? ' wide' : ''}" id="veilHost" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head">
      <h3>${esc(title)}</h3>
      ${sub ? `<span class="sub">${esc(sub)}</span>` : ''}
      <button class="btn sm icon" id="mClose" aria-label="Close">${SVG(ICONS.x, 13)}</button>
    </div>
    <div class="modal-body">${body}</div>
    <div class="modal-foot">
      <div class="err-msg" id="mErr"></div>
      <button class="btn" id="mCancel">${esc(cancel)}</button>
      <button class="btn pri${danger ? ' danger' : ''}" id="mOk">${esc(confirm)}</button>
    </div>
  </div>`;
  $('#veil').classList.add('on');
  $('#mClose').addEventListener('click', closeModal);
  $('#mCancel').addEventListener('click', closeModal);
  $('#mOk').addEventListener('click', submitModal);
  $('#veil').addEventListener('mousedown', veilClick);
  const first = $('#veilHost').querySelector('input:not([type=checkbox]), textarea, select');
  if (first && !MOBILE()) setTimeout(() => first.focus(), 40);
}

function veilClick(e) { if (e.target.id === 'veil') closeModal(); }
function modalError(msg) { const el = $('#mErr'); if (el) el.textContent = msg || ''; }
function modalOpen() { return $('#veil').classList.contains('on'); }

async function submitModal() {
  if (!modalCtx || !modalCtx.onSubmit) return closeModal();
  const ok = $('#mOk');
  modalError('');
  ok.classList.add('busy');
  try {
    await modalCtx.onSubmit();
    closeModal();
  } catch (e) {
    modalError(e.message);
  } finally {
    ok.classList.remove('busy');
  }
}

function closeModal() {
  $('#veil').classList.remove('on');
  $('#veil').removeEventListener('mousedown', veilClick);
  $('#veilHost').outerHTML = '<div id="veilHost"></div>';
  modalCtx = null;
  mcOpen = false;
}

function confirmModal({ title, body, confirm = 'Confirm', danger = false }) {
  if (danger && state.me && state.me.preferences && state.me.preferences.confirmDanger === false) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    let done = false;
    openModal({
      title, body: `<div class="modal-note">${body}</div>`, confirm, danger,
      onSubmit: async () => { done = true; resolve(true); },
    });
    const veil = $('#veil');
    const obs = new MutationObserver(() => {
      if (!veil.classList.contains('on')) { obs.disconnect(); if (!done) resolve(false); }
    });
    obs.observe(veil, { attributes: true, attributeFilter: ['class'] });
  });
}

/* ==================================================================
   Deploy bot

   The create route reads FLAT fields off the request body (body.host,
   body.port, body.username, ...) and takes `proxy` as a URI. A nested
   { config: {...} } payload silently produces an all-defaults bot.
   ================================================================== */
function openDeploy() {
  const cats = Array.from(new Set(botsArray().map(catOf))).sort(natural);
  const admin = state.me && state.me.role === 'admin';
  openModal({
    title: 'Deploy bot',
    sub: 'Creates a new bot process',
    wide: true,
    body: `<div class="form two">
      <div class="fld">
        <label for="ndId">Bot ID <em>*</em></label>
        <input id="ndId" placeholder="miner01" autocomplete="off" spellcheck="false">
        <div class="hint">Letters, numbers, dash, underscore. Max 24.</div>
      </div>
      <div class="fld">
        <label for="ndUser">Minecraft username</label>
        <input id="ndUser" placeholder="defaults to the bot ID" autocomplete="off" spellcheck="false">
      </div>
      <div class="fld">
        <label for="ndHost">Server host</label>
        <input id="ndHost" value="play.bananasmp.net" autocomplete="off" spellcheck="false">
      </div>
      <div class="fld">
        <label for="ndPort">Port</label>
        <input id="ndPort" type="number" value="25565">
      </div>
      <div class="fld">
        <label for="ndVer">Version</label>
        <input id="ndVer" value="1.20.1" autocomplete="off" spellcheck="false">
      </div>
      <div class="fld">
        <label for="ndCat">Category</label>
        <input id="ndCat" list="ndCatList" placeholder="Uncategorized" autocomplete="off">
        <datalist id="ndCatList">${cats.map((c) => `<option value="${esc(c)}"></option>`).join('')}</datalist>
      </div>
      ${admin ? `<div class="fld span"><label for="ndOwner">Resource owner</label><select id="ndOwner">${state.users.map((user) => `<option value="${esc(user.id)}"${user.id === state.me.id ? ' selected' : ''}>${esc(user.email)} · ${esc(user.role)}</option>`).join('')}</select><div class="hint">The owner receives an isolated runtime folder, aliases, scripts, schedules, and proxy access.</div></div>` : ''}
      <div class="fld span">
        <label for="ndProxy">SOCKS5 proxy</label>
        <select id="ndProxy">
          <option value="">No proxy · direct connection</option>
          ${state.proxies.map((p) => {
            const n = (p.assignedTo || []).length, c = p.capacity || state.proxyCap;
            return `<option value="${esc(p.id)}"${n >= c ? ' disabled' : ''}>${esc(p.label || shortProxy(p.uri))} · ${n}/${c}${p.alive === false ? ' · offline' : ''}${admin && p.ownerLabel ? ' · ' + esc(p.ownerLabel) : ''}</option>`;
          }).join('')}
        </select>
        ${state.proxies.length ? '' : '<div class="hint">No proxies in the pool yet. Add some on the Proxies page.</div>'}
      </div>
    </div>`,
    confirm: 'Deploy',
    onSubmit: async () => {
      const id = $('#ndId').value.trim();
      if (!id) throw new Error('Bot ID is required');
      if (!/^[a-zA-Z0-9_-]{1,24}$/.test(id)) throw new Error('Bot ID may only use letters, numbers, dash and underscore');
      if (state.bots.has(id)) throw new Error(`Bot "${id}" already exists`);
      const port = parseInt($('#ndPort').value, 10);

      await api('/bots', {
        method: 'POST',
        body: JSON.stringify({
          id,
          username: $('#ndUser').value.trim() || id,
          host: $('#ndHost').value.trim() || 'play.bananasmp.net',
          port: Number.isFinite(port) ? port : 25565,
          version: $('#ndVer').value.trim() || '1.20.1',
          category: $('#ndCat').value.trim() || 'Uncategorized',
          proxyId: $('#ndProxy').value || null,
          ownerId: admin && $('#ndOwner') ? $('#ndOwner').value : undefined,
        }),
      });
      toast(`Deployed ${id}`, 'ok');
      await loadBots();
      openBot(id);
    },
  });
}
$('#btnAddBot').addEventListener('click', openDeploy);
$('#btnAddBot2').addEventListener('click', openDeploy);
