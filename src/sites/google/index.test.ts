// Google site config tests
// Tests for key sequences, single key actions, and search config

import { describe, it, expect, vi } from 'vitest';

// We test the exported googleConfig and the key sequence/action functions indirectly through it
// Need to mock DOM APIs that the module uses at import time
vi.stubGlobal('document', {
  querySelector: vi.fn(() => null),
  querySelectorAll: vi.fn(() => []),
  createElement: vi.fn(() => ({
    style: {},
    setAttribute: vi.fn(),
    appendChild: vi.fn(),
    classList: { add: vi.fn(), contains: vi.fn(() => false) },
  })),
  head: { appendChild: vi.fn() },
  getElementById: vi.fn(() => null),
});

const mockLocation = { href: 'https://www.google.com/search?q=test', pathname: '/search', search: '?q=test' };
vi.stubGlobal('window', { location: mockLocation });
vi.stubGlobal('location', mockLocation);

const mockCopyToClipboard = vi.fn();
const mockCopyImageToClipboard = vi.fn();
vi.mock('../../core/actions', () => ({
  copyToClipboard: (...args) => mockCopyToClipboard(...args),
  copyImageToClipboard: (...args) => mockCopyImageToClipboard(...args),
}));

const { googleConfig } = await import('./index');

// Helper to create a KeyContext for tests
function makeContext(overrides = {}) {
  return { pageType: null, filterActive: false, searchActive: false, drawer: null, ...overrides };
}

describe('getGoogleKeySequences (via googleConfig.getKeySequences)', () => {
  const defaultCtx = makeContext({ pageType: 'search' });

  it('returns an object with "/" key for local filter', () => {
    const app = { openLocalFilter: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, defaultCtx);
    expect(seqs).toHaveProperty('/');
    seqs['/']();
    expect(app.openLocalFilter).toHaveBeenCalled();
  });

  it('returns an object with "i" key for search, pre-filled with URL query', () => {
    const app = { openSearch: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, defaultCtx);
    expect(seqs).toHaveProperty('i');
    seqs['i']();
    // location.search is '?q=test' from the global mock
    expect(app.openSearch).toHaveBeenCalledWith('test');
  });

  it('returns an object with ":" key for command palette', () => {
    const app = { openPalette: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, defaultCtx);
    expect(seqs).toHaveProperty(':');
    seqs[':']();
    expect(app.openPalette).toHaveBeenCalledWith('command');
  });

  it('returns an object with "gg" key for go to top', () => {
    const app = { goToTop: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, defaultCtx);
    expect(seqs).toHaveProperty('gg');
    seqs['gg']();
    expect(app.goToTop).toHaveBeenCalled();
  });

  it('handles null/undefined app gracefully (optional chaining)', () => {
    const seqs = googleConfig.getKeySequences(null, defaultCtx);
    // Should not throw
    expect(() => seqs['i']()).not.toThrow();
    expect(() => seqs[':']()).not.toThrow();
    expect(() => seqs['gg']()).not.toThrow();
  });

  it('"go" navigates to web search results with current query', () => {
    // location.search is '?q=test' from the global mock
    const seqs = googleConfig.getKeySequences({}, defaultCtx);
    seqs['go']();
    expect(window.location.href).toBe('/search?q=test');
  });

  it('"gi" navigates to image search results with current query', () => {
    const seqs = googleConfig.getKeySequences({}, defaultCtx);
    seqs['gi']();
    expect(window.location.href).toBe('/search?q=test&udm=2');
  });

  it('"go" shows message when no query present', () => {
    const origSearch = location.search;
    location.search = '';
    const seqs = googleConfig.getKeySequences({}, defaultCtx);
    seqs['go']();
    // showMessage is called instead of navigating — we just verify no throw
    location.search = origSearch;
  });

  it('"gi" shows message when no query present', () => {
    const origSearch = location.search;
    location.search = '';
    const seqs = googleConfig.getKeySequences({}, defaultCtx);
    seqs['gi']();
    location.search = origSearch;
  });

  it('returns an object with "yy" key', () => {
    const seqs = googleConfig.getKeySequences({}, defaultCtx);
    expect(seqs).toHaveProperty('yy');
  });

  it('"yy" shows "No item selected" when getSelectedItem returns null', () => {
    const app = { getSelectedItem: vi.fn(() => null) };
    const seqs = googleConfig.getKeySequences(app, defaultCtx);
    seqs['yy']();
    expect(mockCopyToClipboard).not.toHaveBeenCalled();
    expect(mockCopyImageToClipboard).not.toHaveBeenCalled();
  });

  it('"yy" on images page calls copyImageToClipboard with item.imageUrl', () => {
    mockCopyImageToClipboard.mockClear();
    const origSearch = location.search;
    location.search = '?q=test&udm=2';
    const item = { id: '1', title: 'img', url: 'https://example.com', thumbnail: 'data:image/jpeg;base64,thumb', imageUrl: 'https://cdn.example.com/full.jpg' };
    const app = { getSelectedItem: vi.fn(() => item) };
    const seqs = googleConfig.getKeySequences(app, makeContext({ pageType: 'images' }));
    seqs['yy']();
    expect(mockCopyImageToClipboard).toHaveBeenCalledWith('https://cdn.example.com/full.jpg');
    expect(mockCopyToClipboard).not.toHaveBeenCalled();
    location.search = origSearch;
  });

  it('"yy" on images page falls back to thumbnail when imageUrl is empty', () => {
    mockCopyImageToClipboard.mockClear();
    const origSearch = location.search;
    location.search = '?q=test&udm=2';
    const item = { id: '1', title: 'img', url: 'https://example.com', thumbnail: 'data:image/jpeg;base64,thumb', imageUrl: '' };
    const app = { getSelectedItem: vi.fn(() => item) };
    const seqs = googleConfig.getKeySequences(app, makeContext({ pageType: 'images' }));
    seqs['yy']();
    expect(mockCopyImageToClipboard).toHaveBeenCalledWith('data:image/jpeg;base64,thumb');
    expect(mockCopyToClipboard).not.toHaveBeenCalled();
    location.search = origSearch;
  });

  it('"yy" on search page calls copyToClipboard with item.url', () => {
    mockCopyToClipboard.mockClear();
    mockCopyImageToClipboard.mockClear();
    const origSearch = location.search;
    location.search = '?q=test';
    const item = { id: '1', title: 'result', url: 'https://example.com/page', thumbnail: null };
    const app = { getSelectedItem: vi.fn(() => item) };
    const seqs = googleConfig.getKeySequences(app, defaultCtx);
    seqs['yy']();
    expect(mockCopyToClipboard).toHaveBeenCalledWith('https://example.com/page');
    expect(mockCopyImageToClipboard).not.toHaveBeenCalled();
    location.search = origSearch;
  });

  it('"yy" does not throw when app is null', () => {
    const seqs = googleConfig.getKeySequences(null, defaultCtx);
    expect(() => seqs['yy']()).not.toThrow();
  });
});

describe('merged keys (C-f, C-b, G) in getKeySequences', () => {
  const defaultCtx = makeContext({ pageType: 'search' });

  it('returns "C-f" for next page', () => {
    const seqs = googleConfig.getKeySequences({}, defaultCtx);
    expect(seqs).toHaveProperty('C-f');
  });

  it('returns "C-b" for previous page', () => {
    const seqs = googleConfig.getKeySequences({}, defaultCtx);
    expect(seqs).toHaveProperty('C-b');
  });

  it('returns "G" for go to bottom', () => {
    const app = { goToBottom: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, defaultCtx);
    expect(seqs).toHaveProperty('G');
    seqs['G']();
    expect(app.goToBottom).toHaveBeenCalled();
  });

  it('handles null app gracefully for "G"', () => {
    const seqs = googleConfig.getKeySequences(null, defaultCtx);
    expect(() => seqs['G']()).not.toThrow();
  });
});

describe('listing page navigation keys in getKeySequences', () => {
  const listingCtx = makeContext({ pageType: 'search', filterActive: false, searchActive: false });

  it('includes ArrowDown, ArrowUp, ArrowLeft, ArrowRight, Enter on listing pages', () => {
    const app = { navigate: vi.fn(), select: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, listingCtx);
    expect(seqs).toHaveProperty('ArrowDown');
    expect(seqs).toHaveProperty('ArrowUp');
    expect(seqs).toHaveProperty('ArrowLeft');
    expect(seqs).toHaveProperty('ArrowRight');
    expect(seqs).toHaveProperty('Enter');
  });

  it('ArrowDown calls app.navigate("down")', () => {
    const app = { navigate: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, listingCtx);
    seqs['ArrowDown']();
    expect(app.navigate).toHaveBeenCalledWith('down');
  });

  it('ArrowUp calls app.navigate("up")', () => {
    const app = { navigate: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, listingCtx);
    seqs['ArrowUp']();
    expect(app.navigate).toHaveBeenCalledWith('up');
  });

  it('ArrowLeft calls app.navigate("left")', () => {
    const app = { navigate: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, listingCtx);
    seqs['ArrowLeft']();
    expect(app.navigate).toHaveBeenCalledWith('left');
  });

  it('ArrowRight calls app.navigate("right")', () => {
    const app = { navigate: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, listingCtx);
    seqs['ArrowRight']();
    expect(app.navigate).toHaveBeenCalledWith('right');
  });

  it('Enter calls app.select(false)', () => {
    const app = { select: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, listingCtx);
    seqs['Enter']();
    expect(app.select).toHaveBeenCalledWith(false);
  });

  it('S-Enter calls app.select(true)', () => {
    const app = { select: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, listingCtx);
    expect(seqs).toHaveProperty('S-Enter');
    seqs['S-Enter']();
    expect(app.select).toHaveBeenCalledWith(true);
  });

  it('includes j and k when !filterActive and !searchActive', () => {
    const app = { navigate: vi.fn() };
    const seqs = googleConfig.getKeySequences(app, listingCtx);
    expect(seqs).toHaveProperty('j');
    expect(seqs).toHaveProperty('k');
    seqs['j']();
    expect(app.navigate).toHaveBeenCalledWith('down');
    seqs['k']();
    expect(app.navigate).toHaveBeenCalledWith('up');
  });

  it('excludes j and k when filterActive is true', () => {
    const ctx = makeContext({ pageType: 'search', filterActive: true, searchActive: false });
    const seqs = googleConfig.getKeySequences({}, ctx);
    expect(seqs).not.toHaveProperty('j');
    expect(seqs).not.toHaveProperty('k');
  });

  it('excludes j and k when searchActive is true', () => {
    const ctx = makeContext({ pageType: 'search', filterActive: false, searchActive: true });
    const seqs = googleConfig.getKeySequences({}, ctx);
    expect(seqs).not.toHaveProperty('j');
    expect(seqs).not.toHaveProperty('k');
  });

  it('includes h and l on images page', () => {
    const app = { navigate: vi.fn() };
    const ctx = makeContext({ pageType: 'images' });
    const seqs = googleConfig.getKeySequences(app, ctx);
    expect(seqs).toHaveProperty('h');
    expect(seqs).toHaveProperty('l');
    seqs['h']();
    expect(app.navigate).toHaveBeenCalledWith('left');
    seqs['l']();
    expect(app.navigate).toHaveBeenCalledWith('right');
  });

  it('does NOT include h or l on regular search page', () => {
    const seqs = googleConfig.getKeySequences({}, listingCtx);
    expect(seqs).not.toHaveProperty('h');
    expect(seqs).not.toHaveProperty('l');
  });
});

describe('googleConfig.matches', () => {
  it('only contains search-specific patterns, not wildcard /*', () => {
    for (const pattern of googleConfig.matches) {
      expect(pattern).toMatch(/\/search\*/);
      expect(pattern).not.toMatch(/\/\*$/);
    }
  });

  it('has exactly two patterns (www and non-www)', () => {
    expect(googleConfig.matches).toHaveLength(2);
    expect(googleConfig.matches).toContain('*://www.google.com/search*');
    expect(googleConfig.matches).toContain('*://google.com/search*');
  });
});

describe('googleConfig theme uses hsl() format', () => {
  it('has background colors in hsl() format', () => {
    const theme = googleConfig.theme;
    expect(theme.bg1).toBe('hsl(192, 100%, 11%)');
    expect(theme.bg2).toBe('hsl(192, 81%, 14%)');
    expect(theme.bg3).toBe('hsl(193, 80%, 20%)');
  });

  it('has text colors in hsl() format', () => {
    const theme = googleConfig.theme;
    expect(theme.txt1).toBe('hsl(0, 0%, 95%)');
    expect(theme.txt2).toBe('hsl(0, 0%, 67%)');
    expect(theme.txt3).toBe('hsl(0, 0%, 44%)');
    expect(theme.txt4).toBe('hsl(217, 89%, 61%)');
  });

  it('has accent and mode colors in hsl() format', () => {
    const theme = googleConfig.theme;
    expect(theme.accent).toBe('hsl(217, 89%, 61%)');
    expect(theme.accentHover).toBe('hsl(219, 62%, 52%)');
    expect(theme.modeNormal).toBe('hsl(136, 52%, 43%)');
    expect(theme.modeSearch).toBe('hsl(217, 89%, 61%)');
    expect(theme.modeCommand).toBe('hsl(45, 97%, 50%)');
    expect(theme.modeFilter).toBe('hsl(4, 81%, 56%)');
  });

  it('has modeReplace as Google Red (not placeholder gray)', () => {
    const theme = googleConfig.theme;
    expect(theme.modeReplace).not.toBe('hsl(0, 0%, 50%)');
    expect(theme.modeReplace).toBe('hsl(5, 81%, 56%)');
  });

  it('all theme values use hsl() format, not hex', () => {
    const theme = googleConfig.theme;
    for (const [key, value] of Object.entries(theme)) {
      expect(value).toMatch(/^hsl\(/);
      expect(value).not.toMatch(/^#/);
    }
  });
});

describe('googleConfig search fields', () => {
  it('has searchUrl that returns correct Google search URL', () => {
    expect(googleConfig.searchUrl).toBeDefined();
    expect(googleConfig.searchUrl('hello world')).toBe('/search?q=hello%20world');
  });

  it('searchUrl encodes special characters', () => {
    expect(googleConfig.searchUrl('a&b=c')).toBe('/search?q=a%26b%3Dc');
  });

  it('searchUrl handles empty query', () => {
    expect(googleConfig.searchUrl('')).toBe('/search?q=');
  });

  it('has searchPlaceholder string', () => {
    expect(googleConfig.searchPlaceholder).toBe('Search Google...');
  });

  it('searchUrl appends &udm=2 when on images page', () => {
    const origSearch = location.search;
    location.search = '?q=test&udm=2';
    expect(googleConfig.searchUrl('cats')).toBe('/search?q=cats&udm=2');
    location.search = origSearch;
  });

  it('searchUrl omits &udm=2 when on regular search page', () => {
    const origSearch = location.search;
    location.search = '?q=test';
    expect(googleConfig.searchUrl('cats')).toBe('/search?q=cats');
    location.search = origSearch;
  });
});
