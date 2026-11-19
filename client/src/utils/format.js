export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }, locale = undefined) {
  if (!value) return '—';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(locale, options).format(date);
}
export function timeAgo(value, language = 'en') {
  const ms = Date.now() - new Date(value).getTime(); const days = Math.floor(ms / 86400000);
  if (language === 'hi') { const number = new Intl.NumberFormat('hi-IN'); if (days < 1) return 'आज'; if (days === 1) return 'कल'; if (days < 30) return `${number.format(days)} दिन पहले`; }
  if (days < 1) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 30) return `${days} days ago`;
  return formatDate(value, { month: 'short', year: 'numeric' }, language === 'hi' ? 'hi-IN' : undefined);
}
export function daysLeft(value) {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  const today = new Date(); today.setHours(0, 0, 0, 0); date.setHours(0, 0, 0, 0); return Math.round((date - today) / 86400000);
}
export function fileSize(bytes = 0) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`; return `${(bytes / 1048576).toFixed(1)} MB`; }
