// Tests for sort.ts — pure parsing, matching, and sorting functions
// Following HtDP: derive tests from input types

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseRelativeDate,
  parseDuration,
  parseViewCount,
  extractChannel,
  extractDateFromMeta,
  matchSortPrefix,
  parseSortCommand,
  getSortLabel,
  sortItems,
  toggleDirection,
  getDefaultDirection,
  SORT_FIELDS,
} from './sort';

// =============================================================================
// parseRelativeDate
// =============================================================================
describe('parseRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses "2 days ago" relative to now', () => {
    const result = parseRelativeDate('2 days ago');
    const expected = Date.now() - 2 * 24 * 60 * 60 * 1000;
    expect(result).toBe(expected);
  });

  it('parses "1 year ago"', () => {
    const result = parseRelativeDate('1 year ago');
    const expected = Date.now() - 365 * 24 * 60 * 60 * 1000;
    expect(result).toBe(expected);
  });

  it('parses "3 weeks ago"', () => {
    const result = parseRelativeDate('3 weeks ago');
    const expected = Date.now() - 3 * 7 * 24 * 60 * 60 * 1000;
    expect(result).toBe(expected);
  });

  it('parses "5 hours ago"', () => {
    const result = parseRelativeDate('5 hours ago');
    const expected = Date.now() - 5 * 60 * 60 * 1000;
    expect(result).toBe(expected);
  });

  it('parses "30 minutes ago"', () => {
    const result = parseRelativeDate('30 minutes ago');
    const expected = Date.now() - 30 * 60 * 1000;
    expect(result).toBe(expected);
  });

  it('strips "Streamed" prefix', () => {
    const result = parseRelativeDate('Streamed 2 days ago');
    const expected = Date.now() - 2 * 24 * 60 * 60 * 1000;
    expect(result).toBe(expected);
  });

  it('strips "Premiered" prefix', () => {
    const result = parseRelativeDate('Premiered 3 hours ago');
    const expected = Date.now() - 3 * 60 * 60 * 1000;
    expect(result).toBe(expected);
  });

  it('parses absolute date string like "Jan 15, 2026"', () => {
    const result = parseRelativeDate('Jan 15, 2026');
    expect(result).toBe(Date.parse('Jan 15, 2026'));
  });

  it('returns Infinity for empty string', () => {
    expect(parseRelativeDate('')).toBe(Infinity);
  });

  it('returns Infinity for null/undefined', () => {
    expect(parseRelativeDate(null as any)).toBe(Infinity);
    expect(parseRelativeDate(undefined as any)).toBe(Infinity);
  });

  it('returns Infinity for unparseable string', () => {
    expect(parseRelativeDate('not a date')).toBe(Infinity);
  });
});

// =============================================================================
// parseDuration
// =============================================================================
describe('parseDuration', () => {
  it('parses MM:SS format', () => {
    expect(parseDuration('12:34')).toBe(12 * 60 + 34);
  });

  it('parses HH:MM:SS format', () => {
    expect(parseDuration('1:23:45')).toBe(1 * 3600 + 23 * 60 + 45);
  });

  it('parses zero values correctly', () => {
    expect(parseDuration('0:00')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseDuration('')).toBe(0);
  });

  it('returns 0 for null/undefined', () => {
    expect(parseDuration(null as any)).toBe(0);
    expect(parseDuration(undefined as any)).toBe(0);
  });

  it('returns 0 for non-duration string', () => {
    expect(parseDuration('abc')).toBe(0);
  });

  it('returns 0 for single number (no colon)', () => {
    expect(parseDuration('123')).toBe(0);
  });
});

// =============================================================================
// parseViewCount
// =============================================================================
describe('parseViewCount', () => {
  it('parses "1.2M views"', () => {
    expect(parseViewCount('1.2M views')).toBe(1200000);
  });

  it('parses "1.5K views"', () => {
    expect(parseViewCount('1.5K views')).toBe(1500);
  });

  it('parses "1,234,567 views"', () => {
    expect(parseViewCount('1,234,567 views')).toBe(1234567);
  });

  it('parses "123 views"', () => {
    expect(parseViewCount('123 views')).toBe(123);
  });

  it('parses "1B views"', () => {
    expect(parseViewCount('1B views')).toBe(1000000000);
  });

  it('returns 0 for "No views"', () => {
    expect(parseViewCount('No views')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseViewCount('')).toBe(0);
  });

  it('returns 0 for null/undefined', () => {
    expect(parseViewCount(null as any)).toBe(0);
    expect(parseViewCount(undefined as any)).toBe(0);
  });
});

// =============================================================================
// extractChannel
// =============================================================================
describe('extractChannel', () => {
  it('extracts channel from "Channel Name · 2 days ago"', () => {
    expect(extractChannel('MyChannel · 2 days ago')).toBe('mychannel');
  });

  it('returns lowercased channel when no separator', () => {
    expect(extractChannel('MyChannel')).toBe('mychannel');
  });

  it('returns empty string for empty input', () => {
    expect(extractChannel('')).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(extractChannel(null as any)).toBe('');
    expect(extractChannel(undefined as any)).toBe('');
  });
});

// =============================================================================
// extractDateFromMeta
// =============================================================================
describe('extractDateFromMeta', () => {
  it('extracts date from "Channel Name · 2 days ago"', () => {
    expect(extractDateFromMeta('MyChannel · 2 days ago')).toBe('2 days ago');
  });

  it('returns empty string when no separator', () => {
    expect(extractDateFromMeta('MyChannel')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(extractDateFromMeta('')).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(extractDateFromMeta(null as any)).toBe('');
    expect(extractDateFromMeta(undefined as any)).toBe('');
  });
});

// =============================================================================
// matchSortPrefix
// =============================================================================
describe('matchSortPrefix', () => {
  it('matches "da" to "date"', () => {
    expect(matchSortPrefix('da')).toBe('date');
  });

  it('matches "date" to "date"', () => {
    expect(matchSortPrefix('date')).toBe('date');
  });

  it('matches "du" to "duration"', () => {
    expect(matchSortPrefix('du')).toBe('duration');
  });

  it('matches "dur" to "duration"', () => {
    expect(matchSortPrefix('dur')).toBe('duration');
  });

  it('matches "t" to "title"', () => {
    expect(matchSortPrefix('t')).toBe('title');
  });

  it('matches "c" to "channel"', () => {
    expect(matchSortPrefix('c')).toBe('channel');
  });

  it('matches "v" to "views"', () => {
    expect(matchSortPrefix('v')).toBe('views');
  });

  it('is case-insensitive', () => {
    expect(matchSortPrefix('DA')).toBe('date');
  });

  it('returns null for unknown prefix', () => {
    expect(matchSortPrefix('xyz')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(matchSortPrefix('')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(matchSortPrefix(null as any)).toBeNull();
    expect(matchSortPrefix(undefined as any)).toBeNull();
  });
});

// =============================================================================
// parseSortCommand
// =============================================================================
describe('parseSortCommand', () => {
  it('parses "da" to { field: "date", reverse: false }', () => {
    expect(parseSortCommand('da')).toEqual({ field: 'date', reverse: false });
  });

  it('parses "da!" to { field: "date", reverse: true }', () => {
    expect(parseSortCommand('da!')).toEqual({ field: 'date', reverse: true });
  });

  it('parses "dur" to { field: "duration", reverse: false }', () => {
    expect(parseSortCommand('dur')).toEqual({ field: 'duration', reverse: false });
  });

  it('parses "title!" to { field: "title", reverse: true }', () => {
    expect(parseSortCommand('title!')).toEqual({ field: 'title', reverse: true });
  });

  it('returns null for unknown prefix', () => {
    expect(parseSortCommand('xyz')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseSortCommand('')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(parseSortCommand(null as any)).toBeNull();
    expect(parseSortCommand(undefined as any)).toBeNull();
  });
});

// =============================================================================
// getSortLabel
// =============================================================================
describe('getSortLabel', () => {
  it('returns "date↓" for field=date, direction=desc', () => {
    expect(getSortLabel('date', 'desc')).toBe('date↓');
  });

  it('returns "date↑" for field=date, direction=asc', () => {
    expect(getSortLabel('date', 'asc')).toBe('date↑');
  });

  it('returns "dur↓" for duration desc', () => {
    expect(getSortLabel('duration', 'desc')).toBe('dur↓');
  });

  it('returns "title↑" for title asc', () => {
    expect(getSortLabel('title', 'asc')).toBe('title↑');
  });

  it('returns "chan↓" for channel desc', () => {
    expect(getSortLabel('channel', 'desc')).toBe('chan↓');
  });

  it('returns "views↑" for views asc', () => {
    expect(getSortLabel('views', 'asc')).toBe('views↑');
  });

  it('returns empty string for null field', () => {
    expect(getSortLabel(null, 'asc')).toBe('');
  });

  it('uses field name as fallback for unknown field', () => {
    expect(getSortLabel('unknown', 'desc')).toBe('unknown↓');
  });
});

// =============================================================================
// sortItems
// =============================================================================
describe('sortItems', () => {
  it('sorts by title ascending', () => {
    const items = [
      { title: 'Banana', url: '/b' },
      { title: 'Apple', url: '/a' },
      { title: 'Cherry', url: '/c' },
    ];
    const result = sortItems(items, 'title', 'asc');
    expect(result.map((i) => i.title)).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('sorts by title descending', () => {
    const items = [
      { title: 'Banana', url: '/b' },
      { title: 'Apple', url: '/a' },
      { title: 'Cherry', url: '/c' },
    ];
    const result = sortItems(items, 'title', 'desc');
    expect(result.map((i) => i.title)).toEqual(['Cherry', 'Banana', 'Apple']);
  });

  it('returns same reference for empty array', () => {
    const items: any[] = [];
    expect(sortItems(items, 'title', 'asc')).toBe(items);
  });

  it('returns same reference for null field', () => {
    const items = [{ title: 'A', url: '/a' }];
    expect(sortItems(items, '', 'asc')).toBe(items);
  });

  it('does not mutate original array', () => {
    const items = [
      { title: 'B', url: '/b' },
      { title: 'A', url: '/a' },
    ];
    const result = sortItems(items, 'title', 'asc');
    expect(result).not.toBe(items);
    expect(items[0].title).toBe('B'); // original unchanged
  });

  it('sorts by channel ascending from meta', () => {
    const items = [
      { title: 'V1', url: '/1', meta: 'Zebra · 1 day ago' },
      { title: 'V2', url: '/2', meta: 'Alpha · 2 days ago' },
    ];
    const result = sortItems(items, 'channel', 'asc');
    expect(result.map((i) => i.title)).toEqual(['V2', 'V1']);
  });
});

// =============================================================================
// toggleDirection
// =============================================================================
describe('toggleDirection', () => {
  it('toggles desc to asc', () => {
    expect(toggleDirection('desc')).toBe('asc');
  });

  it('toggles asc to desc', () => {
    expect(toggleDirection('asc')).toBe('desc');
  });
});

// =============================================================================
// getDefaultDirection
// =============================================================================
describe('getDefaultDirection', () => {
  it('returns desc for date', () => {
    expect(getDefaultDirection('date')).toBe('desc');
  });

  it('returns asc for title', () => {
    expect(getDefaultDirection('title')).toBe('asc');
  });

  it('returns asc for unknown field', () => {
    expect(getDefaultDirection('unknown')).toBe('asc');
  });
});

// =============================================================================
// SORT_FIELDS constant
// =============================================================================
describe('SORT_FIELDS', () => {
  it('has all five sort fields', () => {
    expect(Object.keys(SORT_FIELDS)).toEqual(
      expect.arrayContaining(['date', 'duration', 'title', 'channel', 'views'])
    );
  });

  it('each field has name, defaultDir, and prefixes', () => {
    for (const [key, def] of Object.entries(SORT_FIELDS)) {
      expect(def).toHaveProperty('name');
      expect(def).toHaveProperty('defaultDir');
      expect(def).toHaveProperty('prefixes');
      expect(Array.isArray(def.prefixes)).toBe(true);
    }
  });
});
