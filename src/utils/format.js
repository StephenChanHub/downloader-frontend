// Formatting utilities — file size, dates, etc.

/**
 * Format bytes into a human-readable string (e.g. "5.2 MB", "450 KB").
 * Matches the style used in the existing UI.
 */
export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  const rounded =
    value >= 10 || unitIndex === 0
      ? value.toFixed(1)
      : value.toFixed(2);

  return `${rounded.replace(/\.0$/, '')} ${units[unitIndex]}`;
}

/**
 * Format an ISO 8601 date string to a short local display.
 * Examples: "Jun 5, 2024", "Oct 12, 2023"
 */
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a remaining time in ms to "MM:SS" string.
 */
export function formatRemainingTime(remainingMs) {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
