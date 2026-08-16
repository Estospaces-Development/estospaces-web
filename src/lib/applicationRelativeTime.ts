export const formatApplicationRelativeTime = (
  dateString: string | undefined,
  now = Date.now(),
) => {
  if (!dateString) return 'N/A';
  const timestamp = new Date(dateString).getTime();
  if (!Number.isFinite(timestamp)) return 'N/A';

  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
