// List sorting - Sort listing items by various fields
// Supports date, duration, title, channel, views with Vim-style prefix matching

import type { SortFieldDef, ContentItem } from '../types';

// =============================================================================
// SORT FIELDS
// =============================================================================

/**
 * Available sort fields with their default directions
 * @type {Object<string, {name: string, defaultDir: 'asc'|'desc', prefixes: string[]}>}
 */
export const SORT_FIELDS: Record<string, SortFieldDef> = {
  date: { name: 'date', defaultDir: 'desc', prefixes: ['da', 'date'] },
  duration: { name: 'duration', defaultDir: 'desc', prefixes: ['du', 'dur', 'duration'] },
  title: { name: 'title', defaultDir: 'asc', prefixes: ['t', 'ti', 'title'] },
  channel: { name: 'channel', defaultDir: 'asc', prefixes: ['c', 'ch', 'channel'] },
  views: { name: 'views', defaultDir: 'desc', prefixes: ['v', 'vi', 'views'] },
};

// =============================================================================
// PARSERS
// =============================================================================

/**
 * Parse relative date string to timestamp (approximate).
 * Handles: "2 days ago", "3 weeks ago", "1 month ago", "1 year ago", etc.
 * Also handles: "Jan 15, 2026", "Streamed 2 days ago", "Premiered 3 hours ago"
 * [PURE]
 *
 * @param {string} dateStr - Date string from YouTube
 * @returns {number} Unix timestamp (lower = older), or Infinity if unparseable
 *
 * @example
 * parseRelativeDate('2 days ago')  // => Date.now() - 2*24*60*60*1000
 * parseRelativeDate('1 year ago')  // => Date.now() - 365*24*60*60*1000
 */
export function parseRelativeDate(dateStr: string): number {
  if (!dateStr || typeof dateStr !== 'string') return Infinity;

  const str = dateStr.toLowerCase().trim();

  // Remove "Streamed" or "Premiered" prefix
  const cleaned = str.replace(/^(streamed|premiered)\s+/, '');

  // Try relative time patterns
  const relativeMatch = cleaned.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i);
  if (relativeMatch) {
    const num = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();

    const multipliers = {
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };

    return Date.now() - num * (multipliers[unit] || 0);
  }

  // Try absolute date (e.g., "Jan 15, 2026")
  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) {
    return parsed;
  }

  return Infinity;
}

/**
 * Parse duration string to seconds.
 * Handles: "12:34", "1:23:45", "1:02:03"
 * [PURE]
 *
 * @param {string} durStr - Duration string
 * @returns {number} Duration in seconds, or 0 if unparseable
 *
 * @example
 * parseDuration('12:34')    // => 754
 * parseDuration('1:23:45')  // => 5025
 */
export function parseDuration(durStr: string): number {
  if (!durStr || typeof durStr !== 'string') return 0;

  const parts = durStr.split(':').map((p) => parseInt(p, 10));

  if (parts.some(isNaN)) return 0;

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }

  return 0;
}

/**
 * Parse view count string to number.
 * Handles: "1.2M views", "1,234,567 views", "1.5K views", "123 views", "No views"
 * [PURE]
 *
 * @param {string} viewStr - View count string
 * @returns {number} View count as number, or 0 if unparseable
 *
 * @example
 * parseViewCount('1.2M views')      // => 1200000
 * parseViewCount('1,234,567 views') // => 1234567
 * parseViewCount('1.5K views')      // => 1500
 */
export function parseViewCount(viewStr: string): number {
  if (!viewStr || typeof viewStr !== 'string') return 0;

  const str = viewStr.toLowerCase().replace(/,/g, '').replace(/\s*views?$/i, '').trim();

  if (str === 'no' || str === '') return 0;

  // Check for K/M/B suffix
  const match = str.match(/^([\d.]+)\s*([kmb])?$/i);
  if (match) {
    const num = parseFloat(match[1]);
    const suffix = (match[2] || '').toLowerCase();

    const multipliers = { k: 1000, m: 1000000, b: 1000000000 };
    return Math.round(num * (multipliers[suffix] || 1));
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Extract channel name from meta string.
 * Meta format: "Channel Name · 2 days ago" or just "Channel Name"
 * [PURE]
 *
 * @param {string} meta - Meta string
 * @returns {string} Channel name (lowercased for sorting)
 */
export function extractChannel(meta: string): string {
  if (!meta || typeof meta !== 'string') return '';

  // Split by " · " and take first part
  const parts = meta.split(' · ');
  return (parts[0] || '').toLowerCase().trim();
}

/**
 * Extract date from meta string.
 * Meta format: "Channel Name · 2 days ago"
 * [PURE]
 *
 * @param {string} meta - Meta string
 * @returns {string} Date part
 */
export function extractDateFromMeta(meta: string): string {
  if (!meta || typeof meta !== 'string') return '';

  const parts = meta.split(' · ');
  return parts.length > 1 ? parts[1] : '';
}

// =============================================================================
// SORT FUNCTIONS
// =============================================================================

/**
 * Get sort value for an item based on field.
 * [PURE]
 *
 * @param {ContentItem} item - Item to get value from
 * @param {string} field - Sort field name
 * @returns {number|string} Sortable value
 */
function getSortValue(item: ContentItem, field: string): number | string {
  switch (field) {
    case 'date':
      return parseRelativeDate(extractDateFromMeta(item.meta));
    case 'duration':
      return parseDuration(item.data?.duration);
    case 'title':
      return (item.title || '').toLowerCase();
    case 'channel':
      return extractChannel(item.meta);
    case 'views':
      return parseViewCount(item.data?.viewCount);
    default:
      return 0;
  }
}

/**
 * Sort items by field and direction.
 * Items with missing/unparseable values sort to the end.
 * [PURE]
 *
 * @param {Array<ContentItem>} items - Items to sort
 * @param {string} field - Sort field
 * @param {'asc'|'desc'} direction - Sort direction
 * @returns {Array<ContentItem>} Sorted items (new array)
 */
export function sortItems(items: ContentItem[], field: string, direction: 'asc' | 'desc'): ContentItem[] {
  if (!items || items.length === 0) return items;
  if (!field) return items;

  const sorted = [...items];
  const isDesc = direction === 'desc';

  sorted.sort((a, b) => {
    const valA = getSortValue(a, field);
    const valB = getSortValue(b, field);

    // Handle missing values - sort to end
    const aMissing =
      valA === Infinity || valA === 0 || valA === '';
    const bMissing =
      valB === Infinity || valB === 0 || valB === '';

    if (aMissing && !bMissing) return 1;
    if (!aMissing && bMissing) return -1;
    if (aMissing && bMissing) return 0;

    // Compare values
    if (typeof valA === 'string' && typeof valB === 'string') {
      const cmp = valA.localeCompare(valB);
      return isDesc ? -cmp : cmp;
    }

    // Numeric comparison
    const cmp = valA - valB;
    return isDesc ? -cmp : cmp;
  });

  return sorted;
}

// =============================================================================
// PREFIX MATCHING
// =============================================================================

/**
 * Match a prefix to a sort field using Vim-style prefix matching.
 * [PURE]
 *
 * @param {string} prefix - User input prefix (e.g., "da", "dur")
 * @returns {string|null} Matched field name or null if no match
 *
 * @example
 * matchSortPrefix('da')       // => 'date'
 * matchSortPrefix('dur')      // => 'duration'
 * matchSortPrefix('duration') // => 'duration'
 * matchSortPrefix('xyz')      // => null
 */
export function matchSortPrefix(prefix: string): string | null {
  if (!prefix || typeof prefix !== 'string') return null;

  const p = prefix.toLowerCase().trim();
  if (!p) return null;

  for (const [field, config] of Object.entries(SORT_FIELDS)) {
    for (const validPrefix of config.prefixes) {
      if (validPrefix.startsWith(p) || p === validPrefix) {
        return field;
      }
    }
  }

  return null;
}

/**
 * Parse sort command string.
 * Format: "<prefix>" or "<prefix>!" for reverse direction
 * [PURE]
 *
 * @param {string} cmdStr - Sort command (e.g., "da", "dur!", "title")
 * @returns {{field: string, reverse: boolean}|null} Parsed command or null
 *
 * @example
 * parseSortCommand('da')   // => { field: 'date', reverse: false }
 * parseSortCommand('da!')  // => { field: 'date', reverse: true }
 * parseSortCommand('')     // => null (reset to default)
 * parseSortCommand('xyz')  // => null
 */
export function parseSortCommand(cmdStr: string): { field: string; reverse: boolean } | null {
  if (!cmdStr || typeof cmdStr !== 'string') return null;

  const str = cmdStr.trim();
  if (!str) return null; // Empty = reset

  const reverse = str.endsWith('!');
  const prefix = reverse ? str.slice(0, -1) : str;

  const field = matchSortPrefix(prefix);
  if (!field) return null;

  return { field, reverse };
}

/**
 * Get the display label for current sort state.
 * [PURE]
 *
 * @param {string|null} field - Current sort field
 * @param {'asc'|'desc'} direction - Current direction
 * @returns {string} Display label (e.g., "date↓", "dur↑") or empty string
 */
export function getSortLabel(field: string | null, direction: string): string {
  if (!field) return '';

  // Short labels for status bar
  const labels = {
    date: 'date',
    duration: 'dur',
    title: 'title',
    channel: 'chan',
    views: 'views',
  };

  const arrow = direction === 'desc' ? '↓' : '↑';
  return `${labels[field] || field}${arrow}`;
}

/**
 * Toggle sort direction.
 * [PURE]
 *
 * @param {'asc'|'desc'} current - Current direction
 * @returns {'asc'|'desc'} Toggled direction
 */
export function toggleDirection(current: 'asc' | 'desc'): 'asc' | 'desc' {
  return current === 'desc' ? 'asc' : 'desc';
}

/**
 * Get default direction for a field.
 * [PURE]
 *
 * @param {string} field - Sort field
 * @returns {'asc'|'desc'} Default direction
 */
export function getDefaultDirection(field: string): 'asc' | 'desc' {
  return SORT_FIELDS[field]?.defaultDir || 'asc';
}
