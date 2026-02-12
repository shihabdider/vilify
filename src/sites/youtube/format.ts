// Shared YouTube formatting utilities

/**
 * Format seconds to timestamp string like '0:45', '1:05', or '1:02:05'.
 * Handles null/undefined/NaN/negative gracefully.
 *
 * @param seconds - Time in seconds
 * @returns Formatted timestamp string
 *
 * Examples:
 *   formatTimestamp(65)        => '1:05'
 *   formatTimestamp(3661)      => '1:01:01'
 *   formatTimestamp(0)         => '0:00'
 *   formatTimestamp(null)      => '0:00'
 *   formatTimestamp(undefined) => '0:00'
 */
export function formatTimestamp(seconds: number | null | undefined): string {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
