'use strict';

/* ==================================================================
   Bot lifecycle schedules
   ================================================================== */
const SCHEDULE_POLL_MS = 3000;
let scheduleDraftIds = new Set();
let scheduleDraftZone = 'local';

function scheduleBotLabel(id) {
  const bot = state.bots.get(id);
  if (!bot) return id;
  const username = bot.config && bot.config.username;
  return username && username !== id ? `${username} (${id})` : id;
}

function scheduleStatusLabel(status) {
  return ({
    pending: 'Pending', running: 'Running', done: 'Completed', partial: 'Partial',
    failed: 'Failed', cancelled: 'Cancelled',
  })[status] || String(status || 'Unknown');
}

function durationWords(ms) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  if (totalMinutes < 1) return 'less than a minute';

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes && parts.length < 2) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  return parts.slice(0, 2).join(' ');
}

function scheduleCountdown(schedule) {
  if (schedule.status === 'pending') {
    const remaining = new Date(schedule.runAt).getTime() - Date.now();
    return remaining > 0 ? `in ${durationWords(remaining)}` : 'due now';
  }
  if (schedule.status === 'running') return 'running now';

  const finishedAt = schedule.completedAt || schedule.cancelledAt || schedule.startedAt;
  if (!finishedAt) return scheduleStatusLabel(schedule.status).toLowerCase();
  const elapsed = Math.max(0, Date.now() - new Date(finishedAt).getTime());
  const prefix = schedule.status === 'cancelled' ? 'cancelled' : 'done';
  return `${prefix} ${durationWords(elapsed)} ago`;
}

function formatScheduleTime(date, utc) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'Invalid time';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium', timeStyle: 'short', ...(utc ? { timeZone: 'UTC' } : {}),
  }).format(date);
}

function scheduleTimePair(schedule) {
  const date = new Date(schedule.runAt);
  const local = `${formatScheduleTime(date, false)} local`;
  const gmt = `${formatScheduleTime(date, true)} GMT`;
  return schedule.timeZone === 'UTC' ? [gmt, local] : [local, gmt];
}

function scheduleOutcome(schedule) {
  if (schedule.status === 'pending') return `${schedule.botIds.length} bot${schedule.botIds.length === 1 ? '' : 's'} waiting`;
  if (schedule.status === 'running') return `Working through ${schedule.botIds.length} bot${schedule.botIds.length === 1 ? '' : 's'}`;
  if (schedule.status === 'cancelled') return 'Action was cancelled before it ran';

  const parts = [];
  if (schedule.ok) parts.push(`${schedule.ok} completed`);
  if (schedule.skipped) parts.push(`${schedule.skipped} skipped`);
  if (schedule.failed) parts.push(`${schedule.failed} failed`);
  return parts.join(' · ') || 'No bot state changes were needed';
}

function scheduleRow(schedule) {
  const [primaryTime, secondaryTime] = scheduleTimePair(schedule);
  const ids = Array.isArray(schedule.botIds) ? schedule.botIds : [];
  const shown = ids.slice(0, 6);
  const canDelete = schedule.status !== 'running';
  const deleteLabel = schedule.status === 'pending' ? 'Cancel' : 'Remove';
  const failedResults = (schedule.results || []).filter(r => r.result === 'failed');

  return `<article class="schedule-row status-${esc(schedule.status)}" data-schedule-id="${esc(schedule.id)}">
    <div class="schedule-mark ${esc(schedule.action)}">${SVG(schedule.action === 'start' ? ICONS.play : ICONS.stop, 15)}</div>
    <div class="schedule-main">
      <div class="schedule-top">
        <div class="schedule-title"><strong>${esc(schedule.action === 'start' ? 'Start bots' : 'Stop bots')}</strong><span class="schedule-status">${esc(scheduleStatusLabel(schedule.status))}</span></div>
        <div class="schedule-countdown">${esc(scheduleCountdown(schedule))}</div>
      </div>
      <div class="schedule-time"><span>${esc(primaryTime)}</span><small>${esc(secondaryTime)}</small></div>
      <div class="schedule-targets">
        ${shown.map(id => `<span title="${esc(scheduleBotLabel(id))}">${esc(scheduleBotLabel(id))}</span>`).join('')}
        ${ids.length > shown.length ? `<span>+${ids.length - shown.length} more</span>` : ''}
      </div>
      <div class="schedule-outcome">${esc(scheduleOutcome(schedule))}</div>
      ${failedResults.length ? `<div class="schedule-errors">${failedResults.map(r => `<span><b>${esc(r.id)}</b> ${esc(r.reason || 'Action failed')}</span>`).join('')}</div>` : ''}
    </div>
    ${canDelete ? `<button class="btn sm schedule-delete${schedule.status === 'pending' ? '' : ' quiet'}" data-schedule-delete="${esc(schedule.id)}" aria-label="${deleteLabel} schedule">${SVG(schedule.status === 'pending' ? ICONS.x : ICONS.trash, 13)}<span>${deleteLabel}</span></button>` : ''}
  </article>`;
}

function renderSchedules() {
  const host = $('#scheduleList');
  if (!host) return;
  const rows = Array.isArray(state.schedules) ? state.schedules.slice() : [];
  const pending = rows
    .filter(s => ['pending', 'running'].includes(s.status))
    .sort((a, b) => new Date(a.runAt) - new Date(b.runAt));
  const history = rows
    .filter(s => !['pending', 'running'].includes(s.status))
    .sort((a, b) => new Date(b.completedAt || b.cancelledAt || b.runAt) - new Date(a.completedAt || a.cancelledAt || a.runAt));

  $('#schPending').textContent = pending.length;
  $('#schDone').textContent = rows.filter(s => s.status === 'done').length;
  $('#schFailed').textContent = rows.filter(s => ['failed', 'partial'].includes(s.status)).length;
  $('#schNext').textContent = pending.length ? scheduleCountdown(pending[0]) : '--';
  $('#schNext').title = pending.length ? `${pending[0].action} ${pending[0].botIds.length} bots` : '';

  if (!rows.length) {
    host.innerHTML = '<div class="empty">No schedules yet.<br>Create one to start or stop bots at an exact Local or GMT time.</div>';
    return;
  }

  host.innerHTML = `${pending.length ? `<div class="schedule-section">Upcoming</div>${pending.map(scheduleRow).join('')}` : ''}
    ${history.length ? `<div class="schedule-section">History</div>${history.map(scheduleRow).join('')}` : ''}`;
}

async function loadSchedules() {
  if (state.scheduleLoading) return;
  state.scheduleLoading = true;
  try {
    const response = await api('/schedules');
    state.schedules = Array.isArray(response) ? response : (response.schedules || []);
    renderSchedules();
  } catch (error) {
    if (error.message !== 'Unauthorized') toast(error.message, 'err');
  } finally {
    state.scheduleLoading = false;
  }
}

function startSchedulesPoll() {
  if (state.scheduleTimer) return;
  if (state.me && state.me.preferences && state.me.preferences.autoRefresh === false) return;
  let elapsed = 0;
  state.scheduleTimer = setInterval(() => {
    if (state.page !== 'schedules') return;
    renderSchedules();
    elapsed += 1000;
    if (elapsed >= SCHEDULE_POLL_MS) {
      elapsed = 0;
      loadSchedules();
    }
  }, 1000);
}

function stopSchedulesPoll() {
  if (!state.scheduleTimer) return;
  clearInterval(state.scheduleTimer);
  state.scheduleTimer = null;
}

function padSchedulePart(value) { return String(value).padStart(2, '0'); }

function scheduleInputValue(date, zone) {
  const utc = zone === 'UTC';
  const year = utc ? date.getUTCFullYear() : date.getFullYear();
  const month = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
  const day = utc ? date.getUTCDate() : date.getDate();
  const hours = utc ? date.getUTCHours() : date.getHours();
  const minutes = utc ? date.getUTCMinutes() : date.getMinutes();
  return `${year}-${padSchedulePart(month)}-${padSchedulePart(day)}T${padSchedulePart(hours)}:${padSchedulePart(minutes)}`;
}

function parseScheduleInput(value, zone) {
  if (!value) return null;
  const date = new Date(zone === 'UTC' ? `${value}Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function paintScheduleDraft() {
  const count = scheduleDraftIds.size;
  const countEl = $('#schTargetCount');
  if (countEl) countEl.textContent = `${count} bot${count === 1 ? '' : 's'} selected`;
  const ok = $('#mOk');
  const date = parseScheduleInput($('#schAt') && $('#schAt').value, scheduleDraftZone);
  if (ok) ok.disabled = !count || !date || date.getTime() <= Date.now() + 1000;

  const preview = $('#schTimePreview');
  if (!preview) return;
  if (!date) {
    preview.textContent = 'Choose a valid date and time.';
    return;
  }
  const remaining = date.getTime() - Date.now();
  preview.innerHTML = `<b>${esc(formatScheduleTime(date, false))} local</b><span>${esc(formatScheduleTime(date, true))} GMT</span><span>${remaining > 0 ? `Runs in ${esc(durationWords(remaining))}` : 'Time must be in the future'}</span>`;
}

function setScheduleDraft(ids) {
  scheduleDraftIds = new Set(ids);
  $$('#schBotChoices input[data-schedule-bot]').forEach(input => {
    input.checked = scheduleDraftIds.has(input.dataset.scheduleBot);
  });
  paintScheduleDraft();
}

function openScheduleModal() {
  const bots = botsArray().slice().sort((a, b) => natural(scheduleBotLabel(a.id), scheduleBotLabel(b.id)));
  if (!bots.length) return toast('There are no bots to schedule', 'warn');

  const selected = bots.filter(bot => state.selected.has(bot.id)).map(bot => bot.id);
  scheduleDraftIds = new Set(selected.length ? selected : bots.map(bot => bot.id));
  scheduleDraftZone = 'local';
  const defaultAt = new Date(Date.now() + 5 * 60000);
  defaultAt.setSeconds(0, 0);

  openModal({
    title: 'Schedule action',
    sub: 'Runs even when this page is closed',
    wide: true,
    body: `<div class="form two">
      <div class="fld">
        <label for="schAction">Action</label>
        <select id="schAction">
          <option value="start">Start bots</option>
          <option value="stop">Stop bots</option>
        </select>
      </div>
      <div class="fld">
        <label for="schZone">Time zone</label>
        <select id="schZone">
          <option value="local">Local time</option>
          <option value="UTC">GMT (UTC)</option>
        </select>
      </div>
      <div class="fld span">
        <label for="schAt">Date and time <em>*</em></label>
        <input id="schAt" type="datetime-local" value="${scheduleInputValue(defaultAt, 'local')}" step="60">
        <div class="schedule-time-preview" id="schTimePreview"></div>
      </div>
      <div class="fld span">
        <div class="schedule-target-head">
          <label>Bot targets</label>
          <span id="schTargetCount"></span>
        </div>
        <div class="schedule-target-tools">
          <button type="button" class="btn sm" data-schedule-preset="all">All visible</button>
          <button type="button" class="btn sm" data-schedule-preset="selected">Current selection</button>
          <button type="button" class="btn sm" data-schedule-preset="running">Running</button>
          <button type="button" class="btn sm" data-schedule-preset="clear">Clear</button>
        </div>
        <div class="schedule-bot-choices" id="schBotChoices">
          ${bots.map(bot => `<label class="schedule-bot-choice">
            <input type="checkbox" data-schedule-bot="${esc(bot.id)}" ${scheduleDraftIds.has(bot.id) ? 'checked' : ''}>
            <span class="dot ${esc(bot.status || 'stopped')}"></span>
            <span><b>${esc((bot.config && bot.config.username) || bot.id)}</b><small>${esc(bot.id)}</small></span>
          </label>`).join('')}
        </div>
      </div>
    </div>`,
    confirm: 'Schedule',
    onSubmit: async () => {
      const date = parseScheduleInput($('#schAt').value, scheduleDraftZone);
      if (!date) throw new Error('Choose a valid date and time');
      if (date.getTime() <= Date.now() + 1000) throw new Error('Schedule the action in the future');
      if (!scheduleDraftIds.size) throw new Error('Choose at least one bot');

      const action = $('#schAction').value;
      const response = await api('/schedules', {
        method: 'POST',
        body: JSON.stringify({
          action,
          botIds: Array.from(scheduleDraftIds),
          runAt: date.toISOString(),
          timeZone: scheduleDraftZone,
        }),
      });
      const schedule = response.schedule;
      toast(`${action === 'start' ? 'Start' : 'Stop'} scheduled for ${scheduleDraftIds.size} bot${scheduleDraftIds.size === 1 ? '' : 's'} ${schedule ? scheduleCountdown(schedule) : ''}`, 'ok');
      await loadSchedules();
    },
  });

  $('#schAt').min = scheduleInputValue(new Date(Date.now() + 60000), scheduleDraftZone);
  $('#schAt').addEventListener('input', paintScheduleDraft);
  $('#schZone').addEventListener('change', () => {
    const input = $('#schAt');
    const instant = parseScheduleInput(input.value, scheduleDraftZone);
    scheduleDraftZone = $('#schZone').value;
    if (instant) input.value = scheduleInputValue(instant, scheduleDraftZone);
    input.min = scheduleInputValue(new Date(Date.now() + 60000), scheduleDraftZone);
    paintScheduleDraft();
  });
  $$('#schBotChoices input[data-schedule-bot]').forEach(input => input.addEventListener('change', () => {
    if (input.checked) scheduleDraftIds.add(input.dataset.scheduleBot);
    else scheduleDraftIds.delete(input.dataset.scheduleBot);
    paintScheduleDraft();
  }));
  $$('[data-schedule-preset]').forEach(button => button.addEventListener('click', () => {
    const preset = button.dataset.schedulePreset;
    if (preset === 'all') setScheduleDraft(bots.map(bot => bot.id));
    if (preset === 'selected') setScheduleDraft(bots.filter(bot => state.selected.has(bot.id)).map(bot => bot.id));
    if (preset === 'running') setScheduleDraft(bots.filter(bot => bot.status === 'running').map(bot => bot.id));
    if (preset === 'clear') setScheduleDraft([]);
  }));
  paintScheduleDraft();
}

$('#btnAddSchedule').addEventListener('click', openScheduleModal);

$('#scheduleList').addEventListener('click', async event => {
  const button = event.target.closest('[data-schedule-delete]');
  if (!button || button.disabled) return;
  const id = button.dataset.scheduleDelete;
  const schedule = state.schedules.find(item => item.id === id);
  if (!schedule) return;

  if (schedule.status === 'pending') {
    const confirmed = await confirmModal({
      title: 'Cancel schedule',
      body: `Cancel the scheduled <b>${esc(schedule.action)}</b> action for ${schedule.botIds.length} bot${schedule.botIds.length === 1 ? '' : 's'}?`,
      confirm: 'Cancel schedule',
      danger: true,
    });
    if (!confirmed) return;
  }

  button.classList.add('busy');
  try {
    await api(`/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' });
    toast(schedule.status === 'pending' ? 'Schedule cancelled' : 'Schedule removed', 'ok');
    await loadSchedules();
  } catch (error) {
    toast(error.message, 'err');
  } finally {
    button.classList.remove('busy');
  }
});
