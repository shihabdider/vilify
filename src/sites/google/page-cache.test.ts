// Page cache tests
// Following HtDP: Examples become tests

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock sessionStorage
let store = {};
const mockSessionStorage = {
  getItem: vi.fn((key) => (key in store ? store[key] : null)),
  setItem: vi.fn((key, value) => { store[key] = String(value); }),
  removeItem: vi.fn((key) => { delete store[key]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i) => Object.keys(store)[i] ?? null),
  clear: vi.fn(() => { store = {}; }),
};

vi.stubGlobal('sessionStorage', mockSessionStorage);

const { getCachedPage, setCachedPage, clearPageCache } = await import('./page-cache');

beforeEach(() => {
  store = {};
  vi.clearAllMocks();
});

// =============================================================================
// getCachedPage
// =============================================================================

describe('getCachedPage', () => {
  it('returns null when no cache entry exists', () => {
    const result = getCachedPage('https://google.com/search?q=test');
    expect(result).toBe(null);
  });

  it('returns parsed items array when entry exists', () => {
    const items = [
      { id: 'https://example.com', title: 'Example', url: 'https://example.com', meta: 'example.com', description: 'An example site' },
    ];
    store['vilify-page-cache:https://google.com/search?q=test'] = JSON.stringify(items);

    const result = getCachedPage('https://google.com/search?q=test');
    expect(result).toEqual(items);
  });

  it('returns multiple items correctly', () => {
    const items = [
      { id: 'https://a.com', title: 'A', url: 'https://a.com', meta: 'a.com', description: 'Site A' },
      { id: 'https://b.com', title: 'B', url: 'https://b.com', meta: 'b.com', description: 'Site B' },
    ];
    store['vilify-page-cache:https://google.com/search?q=hello'] = JSON.stringify(items);

    const result = getCachedPage('https://google.com/search?q=hello');
    expect(result).toEqual(items);
    expect(result).toHaveLength(2);
  });

  it('returns null when cached JSON is invalid', () => {
    store['vilify-page-cache:https://google.com/search?q=bad'] = '{not valid json';

    const result = getCachedPage('https://google.com/search?q=bad');
    expect(result).toBe(null);
  });

  it('returns null when sessionStorage.getItem throws', () => {
    mockSessionStorage.getItem.mockImplementationOnce(() => { throw new Error('Private browsing'); });

    const result = getCachedPage('https://google.com/search?q=test');
    expect(result).toBe(null);
  });

  it('uses correct key prefix', () => {
    getCachedPage('https://google.com/search?q=test');
    expect(mockSessionStorage.getItem).toHaveBeenCalledWith('vilify-page-cache:https://google.com/search?q=test');
  });

  it('returns empty array when empty array was cached', () => {
    store['vilify-page-cache:https://google.com/search?q=empty'] = JSON.stringify([]);

    const result = getCachedPage('https://google.com/search?q=empty');
    expect(result).toEqual([]);
  });
});

// =============================================================================
// setCachedPage
// =============================================================================

describe('setCachedPage', () => {
  it('stores items in sessionStorage with correct key prefix', () => {
    const items = [
      { id: 'https://example.com', title: 'Example', url: 'https://example.com', meta: 'example.com', description: 'desc' },
    ];
    setCachedPage('https://google.com/search?q=test', items);

    expect(store['vilify-page-cache:https://google.com/search?q=test']).toBe(JSON.stringify(items));
  });

  it('stores empty array', () => {
    setCachedPage('https://google.com/search?q=nothing', []);

    expect(store['vilify-page-cache:https://google.com/search?q=nothing']).toBe('[]');
  });

  it('overwrites existing cache for same URL', () => {
    const items1 = [{ id: '1', title: 'Old' }];
    const items2 = [{ id: '2', title: 'New' }];

    setCachedPage('https://google.com/search?q=test', items1);
    setCachedPage('https://google.com/search?q=test', items2);

    const cached = JSON.parse(store['vilify-page-cache:https://google.com/search?q=test']);
    expect(cached).toEqual(items2);
  });

  it('handles storage errors gracefully (no-op)', () => {
    mockSessionStorage.setItem.mockImplementationOnce(() => { throw new Error('QuotaExceededError'); });

    // Should not throw
    expect(() => setCachedPage('https://google.com/search?q=test', [{ id: '1' }])).not.toThrow();
  });

  it('prunes oldest entries when over MAX_CACHE_ENTRIES (20)', () => {
    // Fill cache with 20 entries
    for (let i = 0; i < 20; i++) {
      store[`vilify-page-cache:https://google.com/search?q=query${i}`] = JSON.stringify([{ id: String(i) }]);
    }

    // Add one more — should prune at least one old entry
    setCachedPage('https://google.com/search?q=new', [{ id: 'new' }]);

    // Count remaining vilify-page-cache entries
    const cacheKeys = Object.keys(store).filter(k => k.startsWith('vilify-page-cache:'));
    expect(cacheKeys.length).toBeLessThanOrEqual(20);

    // The new entry should exist
    expect(store['vilify-page-cache:https://google.com/search?q=new']).toBeDefined();
  });

  it('does not prune when under MAX_CACHE_ENTRIES', () => {
    // Add 5 entries
    for (let i = 0; i < 5; i++) {
      store[`vilify-page-cache:https://google.com/search?q=query${i}`] = JSON.stringify([{ id: String(i) }]);
    }

    setCachedPage('https://google.com/search?q=new', [{ id: 'new' }]);

    const cacheKeys = Object.keys(store).filter(k => k.startsWith('vilify-page-cache:'));
    expect(cacheKeys.length).toBe(6);
  });

  it('does not prune non-vilify sessionStorage keys', () => {
    store['some-other-key'] = 'keep me';
    for (let i = 0; i < 20; i++) {
      store[`vilify-page-cache:https://google.com/search?q=query${i}`] = JSON.stringify([{ id: String(i) }]);
    }

    setCachedPage('https://google.com/search?q=new', [{ id: 'new' }]);

    expect(store['some-other-key']).toBe('keep me');
  });
});

// =============================================================================
// clearPageCache
// =============================================================================

describe('clearPageCache', () => {
  it('removes all vilify-page-cache entries', () => {
    store['vilify-page-cache:https://google.com/search?q=a'] = JSON.stringify([]);
    store['vilify-page-cache:https://google.com/search?q=b'] = JSON.stringify([]);

    clearPageCache();

    const cacheKeys = Object.keys(store).filter(k => k.startsWith('vilify-page-cache:'));
    expect(cacheKeys.length).toBe(0);
  });

  it('does not remove other sessionStorage entries', () => {
    store['vilify-page-cache:https://google.com/search?q=a'] = JSON.stringify([]);
    store['some-other-key'] = 'keep me';
    store['another-key'] = 'also keep';

    clearPageCache();

    expect(store['some-other-key']).toBe('keep me');
    expect(store['another-key']).toBe('also keep');
  });

  it('handles empty sessionStorage gracefully', () => {
    expect(() => clearPageCache()).not.toThrow();
  });

  it('handles sessionStorage errors gracefully', () => {
    // Make key() throw
    mockSessionStorage.key.mockImplementationOnce(() => { throw new Error('Private browsing'); });

    expect(() => clearPageCache()).not.toThrow();
  });
});
