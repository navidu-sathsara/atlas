export function formatDate(value, options = {}) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: options.dateOnly ? undefined : 'short',
  }).format(date);
}

export function relativeTime(value) {
  if (!value) return 'Never';
  const ms = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(ms)) return 'Unknown';
  const abs = Math.abs(ms);
  const table = [
    [86400000, 'day'],
    [3600000, 'hour'],
    [60000, 'minute'],
    [1000, 'second'],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [size, unit] of table) {
    if (abs >= size || unit === 'second') return formatter.format(Math.round(ms / size), unit);
  }
  return 'now';
}

export function botLabel(bot) {
  return bot?.config?.username || bot?.id || 'Unknown bot';
}

export function categoryOf(bot) {
  return bot?.config?.category || 'Uncategorized';
}

export function proxyLabel(proxy) {
  return proxy?.label || `${proxy?.host || 'unknown'}:${proxy?.port || '?'}`;
}
