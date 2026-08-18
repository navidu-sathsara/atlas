import { api } from '@/lib/api';

const listeners = new Map();
const statusListeners = new Set();
const cache = new Map();
const snapshotLoads = new Map();
let stream = null;
let closeTimer = null;
let connection = 'connecting';

function setConnection(next) {
  connection = next;
  statusListeners.forEach((listener) => listener(next));
}

function ensureStream() {
  if (typeof window === 'undefined' || stream || listeners.size === 0) return;
  setConnection('connecting');
  stream = new EventSource('/api/console-events');
  stream.onopen = () => setConnection('live');
  stream.onerror = () => setConnection('reconnecting');
  stream.onmessage = (event) => {
    let payload;
    try { payload = JSON.parse(event.data); } catch { return; }
    if (payload.type !== 'log' || !payload.id) return;
    const rows = [...(cache.get(payload.id) || []), payload].slice(-160);
    cache.set(payload.id, rows);
    listeners.get(payload.id)?.forEach((listener) => listener(payload));
  };
}

async function loadSnapshot(botId) {
  if (snapshotLoads.has(botId)) return snapshotLoads.get(botId);
  const load = api(`/bots/${encodeURIComponent(botId)}`)
    .then((result) => {
      const rows = (result.logs || []).slice(-160);
      cache.set(botId, rows);
      listeners.get(botId)?.forEach((listener) => listener({
        type: 'snapshot',
        logs: rows,
        status: result.bot?.status,
        inventory: result.inventory,
      }));
    })
    .catch(() => {})
    .finally(() => snapshotLoads.delete(botId));
  snapshotLoads.set(botId, load);
  return load;
}

export function subscribeConsole(botId, onMessage, onConnection) {
  if (!listeners.has(botId)) listeners.set(botId, new Set());
  listeners.get(botId).add(onMessage);
  if (onConnection) {
    statusListeners.add(onConnection);
    onConnection(connection);
  }
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  ensureStream();

  const existing = cache.get(botId);
  if (existing) onMessage({ type: 'snapshot', logs: existing });
  else loadSnapshot(botId);

  return () => {
    const group = listeners.get(botId);
    group?.delete(onMessage);
    if (group && group.size === 0) listeners.delete(botId);
    if (onConnection) statusListeners.delete(onConnection);
    if (listeners.size === 0) {
      closeTimer = setTimeout(() => {
        if (listeners.size === 0 && stream) {
          stream.close();
          stream = null;
          setConnection('connecting');
        }
      }, 1000);
    }
  };
}
