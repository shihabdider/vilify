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

vi.stubGlobal('window', {
  location: { href: 'https://www.google.com/search?q=test', pathname: '/search' },
});

const { googleConfig } = await import('./index.js');

describe('getGoogleKeySequences (via googleConfig.getKeySequences)', () => {
  it('returns an object with "/" key for local filter', () => {
    const app = { openLocalFilter: vi.fn() };
    const seqs = googleConfig.getKeySequences(app);
    expect(seqs).toHaveProperty('/');
    seqs['/']();
    expect(app.openLocalFilter).toHaveBeenCalled();
  });

  it('returns an object with "i" key for search', () => {
    const app = { openSearch: vi.fn() };
    const seqs = googleConfig.getKeySequences(app);
    expect(seqs).toHaveProperty('i');
    seqs['i']();
    expect(app.openSearch).toHaveBeenCalled();
  });

  it('returns an object with ":" key for command palette', () => {
    const app = { openPalette: vi.fn() };
    const seqs = googleConfig.getKeySequences(app);
    expect(seqs).toHaveProperty(':');
    seqs[':']();
    expect(app.openPalette).toHaveBeenCalledWith('command');
  });

  it('returns an object with "gg" key for go to top', () => {
    const app = { goToTop: vi.fn() };
    const seqs = googleConfig.getKeySequences(app);
    expect(seqs).toHaveProperty('gg');
    seqs['gg']();
    expect(app.goToTop).toHaveBeenCalled();
  });

  it('handles null/undefined app gracefully (optional chaining)', () => {
    const seqs = googleConfig.getKeySequences(null);
    // Should not throw
    expect(() => seqs['i']()).not.toThrow();
    expect(() => seqs[':']()).not.toThrow();
    expect(() => seqs['gg']()).not.toThrow();
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
});
