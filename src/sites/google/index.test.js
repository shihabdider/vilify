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
vi.mock('../../core/actions.js', () => ({
  copyToClipboard: (...args) => mockCopyToClipboard(...args),
  copyImageToClipboard: (...args) => mockCopyImageToClipboard(...args),
}));

const { googleConfig } = await import('./index.js');

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

describe('getGoogleSingleKeyActions (via googleConfig.getSingleKeyActions)', () => {
  it('returns "F" for next page', () => {
    const app = {};
    const actions = googleConfig.getSingleKeyActions(app);
    expect(actions).toHaveProperty('F');
  });

  it('returns "B" for previous page', () => {
    const app = {};
    const actions = googleConfig.getSingleKeyActions(app);
    expect(actions).toHaveProperty('B');
  });

  it('returns "G" for go to bottom', () => {
    const app = { goToBottom: vi.fn() };
    const actions = googleConfig.getSingleKeyActions(app);
    expect(actions).toHaveProperty('G');
    actions['G']();
    expect(app.goToBottom).toHaveBeenCalled();
  });

  it('handles null app gracefully for "G"', () => {
    const actions = googleConfig.getSingleKeyActions(null);
    expect(() => actions['G']()).not.toThrow();
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
