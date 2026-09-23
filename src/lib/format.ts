export function formatDate(date: Date | null): string {
  return date ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export function relativeTime(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  if (seconds < 86400 * 30) return `${Math.round(seconds / 86400)}d ago`;
  return formatDate(date);
}
