// YouTube scraper tests — pure functions + page type detection
// Tests type annotations are correct and behavior is preserved.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Stub minimal DOM globals so the module can load
vi.stubGlobal('document', {
  querySelector: vi.fn(() => null),
  querySelectorAll: vi.fn(() => []),
});

// Mutable location object — tests override pathname/search before each call
const fakeLocation = { pathname: '/', search: '', href: 'https://www.youtube.com/' };
vi.stubGlobal('location', fakeLocation);

const {
  extractVideoId,
  parseTimestamp,
  formatDuration,
  getYouTubePageType,
  getDescription,
  getChapters,
  getVideos,
  getRecommendedVideos,
  getComments,
} = await import('./scraper');

// =============================================================================
// extractVideoId
// =============================================================================
describe('extractVideoId', () => {
  it('extracts ID from relative watch URL', () => {
    expect(extractVideoId('/watch?v=abc123')).toBe('abc123');
  });

  it('extracts ID from full URL with extra params', () => {
    expect(extractVideoId('https://youtube.com/watch?v=xyz&t=10')).toBe('xyz');
  });

  it('returns null for shorts URL', () => {
    expect(extractVideoId('/shorts/abc')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(extractVideoId(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(extractVideoId(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractVideoId('')).toBeNull();
  });

  it('extracts ID when v param is first', () => {
    expect(extractVideoId('/watch?v=myVideoId')).toBe('myVideoId');
  });

  it('extracts ID with dashes and underscores', () => {
    expect(extractVideoId('/watch?v=a-B_c1')).toBe('a-B_c1');
  });
});

// =============================================================================
// parseTimestamp
// =============================================================================
describe('parseTimestamp', () => {
  it('parses MM:SS format', () => {
    expect(parseTimestamp('1:23')).toBe(83);
  });

  it('parses HH:MM:SS format', () => {
    expect(parseTimestamp('1:23:45')).toBe(5025);
  });

  it('returns 0 for "0:00"', () => {
    expect(parseTimestamp('0:00')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseTimestamp('')).toBe(0);
  });

  it('returns 0 for null/undefined', () => {
    expect(parseTimestamp(null)).toBe(0);
    expect(parseTimestamp(undefined)).toBe(0);
  });

  it('handles single-part string', () => {
    // e.g. "45" — only 1 part, doesn't match 2 or 3
    expect(parseTimestamp('45')).toBe(0);
  });

  it('parses 10:00 correctly', () => {
    expect(parseTimestamp('10:00')).toBe(600);
  });
});

// =============================================================================
// formatDuration
// =============================================================================
describe('formatDuration', () => {
  it('formats seconds-only duration', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('formats hour-length duration', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('returns "0:00" for zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('returns "0:00" for negative', () => {
    expect(formatDuration(-5)).toBe('0:00');
  });

  it('returns "0:00" for null/undefined', () => {
    expect(formatDuration(null)).toBe('0:00');
    expect(formatDuration(undefined)).toBe('0:00');
  });

  it('pads seconds to 2 digits', () => {
    expect(formatDuration(61)).toBe('1:01');
  });

  it('pads minutes in hour format', () => {
    expect(formatDuration(3605)).toBe('1:00:05');
  });
});

// =============================================================================
// getYouTubePageType
// =============================================================================
describe('getYouTubePageType', () => {
  beforeEach(() => {
    fakeLocation.pathname = '/';
    fakeLocation.search = '';
  });

  it('returns "watch" for /watch?v=...', () => {
    fakeLocation.pathname = '/watch';
    fakeLocation.search = '?v=abc123';
    expect(getYouTubePageType()).toBe('watch');
  });

  it('returns "home" for /', () => {
    fakeLocation.pathname = '/';
    expect(getYouTubePageType()).toBe('home');
  });

  it('returns "home" for empty path', () => {
    fakeLocation.pathname = '';
    expect(getYouTubePageType()).toBe('home');
  });

  it('returns "search" for /results', () => {
    fakeLocation.pathname = '/results';
    fakeLocation.search = '?search_query=test';
    expect(getYouTubePageType()).toBe('search');
  });

  it('returns "channel" for /@handle', () => {
    fakeLocation.pathname = '/@creator';
    expect(getYouTubePageType()).toBe('channel');
  });

  it('returns "channel" for /channel/...', () => {
    fakeLocation.pathname = '/channel/UC1234';
    expect(getYouTubePageType()).toBe('channel');
  });

  it('returns "channel" for /c/...', () => {
    fakeLocation.pathname = '/c/channelname';
    expect(getYouTubePageType()).toBe('channel');
  });

  it('returns "playlist" for /playlist', () => {
    fakeLocation.pathname = '/playlist';
    fakeLocation.search = '?list=PLabcdef';
    expect(getYouTubePageType()).toBe('playlist');
  });

  it('returns "subscriptions" for /feed/subscriptions', () => {
    fakeLocation.pathname = '/feed/subscriptions';
    expect(getYouTubePageType()).toBe('subscriptions');
  });

  it('returns "history" for /feed/history', () => {
    fakeLocation.pathname = '/feed/history';
    expect(getYouTubePageType()).toBe('history');
  });

  it('returns "library" for /feed/library', () => {
    fakeLocation.pathname = '/feed/library';
    expect(getYouTubePageType()).toBe('library');
  });

  it('returns "shorts" for /shorts/...', () => {
    fakeLocation.pathname = '/shorts/abc123';
    expect(getYouTubePageType()).toBe('shorts');
  });

  it('returns "other" for unknown paths', () => {
    fakeLocation.pathname = '/feed/trending';
    expect(getYouTubePageType()).toBe('other');
  });

  it('returns "other" for /watch without v param', () => {
    fakeLocation.pathname = '/watch';
    fakeLocation.search = '';
    expect(getYouTubePageType()).toBe('other');
  });
});

// =============================================================================
// getDescription (DOM-dependent, returns empty with stub)
// =============================================================================
describe('getDescription', () => {
  it('returns empty string when no description element found', () => {
    expect(getDescription()).toBe('');
  });

  it('returns a string type', () => {
    const result = getDescription();
    expect(typeof result).toBe('string');
  });
});

// =============================================================================
// getChapters (DOM-dependent, returns empty with stub)
// =============================================================================
describe('getChapters', () => {
  it('returns empty array when no chapters found', () => {
    expect(getChapters()).toEqual([]);
  });

  it('returns an array', () => {
    expect(Array.isArray(getChapters())).toBe(true);
  });
});

// =============================================================================
// getVideos (DOM-dependent, returns empty with stub)
// =============================================================================
describe('getVideos', () => {
  it('returns empty array when no videos found', () => {
    expect(getVideos()).toEqual([]);
  });

  it('returns an array', () => {
    expect(Array.isArray(getVideos())).toBe(true);
  });
});

// =============================================================================
// getRecommendedVideos (DOM-dependent, returns empty when not on watch page)
// =============================================================================
describe('getRecommendedVideos', () => {
  beforeEach(() => {
    fakeLocation.pathname = '/';
    fakeLocation.search = '';
  });

  it('returns empty array when not on watch page', () => {
    fakeLocation.pathname = '/';
    expect(getRecommendedVideos()).toEqual([]);
  });

  it('returns an array', () => {
    expect(Array.isArray(getRecommendedVideos())).toBe(true);
  });
});

// =============================================================================
// getComments (DOM-dependent, returns loading status with stub)
// =============================================================================
describe('getComments', () => {
  it('returns object with comments array and status', () => {
    const result = getComments();
    expect(result).toHaveProperty('comments');
    expect(result).toHaveProperty('status');
    expect(Array.isArray(result.comments)).toBe(true);
  });

  it('returns loading status when no comments section in DOM', () => {
    const result = getComments();
    expect(result.status).toBe('loading');
    expect(result.comments).toEqual([]);
  });
});
