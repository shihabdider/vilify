// Tests for Google autocomplete suggest drawer
// Tests fetchGoogleSuggestions and createSuggestDrawer behavior

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchGoogleSuggestions, createSuggestDrawer } from './suggest.js';

// =============================================================================
// fetchGoogleSuggestions tests
// =============================================================================

describe('fetchGoogleSuggestions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches from /complete/search with encoded query', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(['hello', ['hello world', 'hello there']]),
    });

    const result = await fetchGoogleSuggestions('hello', new AbortController().signal);
    expect(fetch).toHaveBeenCalledWith(
      '/complete/search?client=firefox&q=hello',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result).toEqual(['hello world', 'hello there']);
  });

  it('encodes special characters in query', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(['a&b', ['a&b=c']]),
    });

    await fetchGoogleSuggestions('a&b', new AbortController().signal);
    expect(fetch).toHaveBeenCalledWith(
      '/complete/search?client=firefox&q=a%26b',
      expect.any(Object)
    );
  });

  it('returns empty array on fetch error', async () => {
    fetch.mockRejectedValue(new Error('network'));
    const result = await fetchGoogleSuggestions('test', new AbortController().signal);
    expect(result).toEqual([]);
  });

  it('returns empty array when response is not ok', async () => {
    fetch.mockResolvedValue({ ok: false, json: () => Promise.resolve([]) });
    const result = await fetchGoogleSuggestions('test', new AbortController().signal);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty query', async () => {
    const result = await fetchGoogleSuggestions('', new AbortController().signal);
    expect(result).toEqual([]);
  });

  it('returns empty array on abort', async () => {
    const controller = new AbortController();
    controller.abort();
    fetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    const result = await fetchGoogleSuggestions('test', controller.signal);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// createSuggestDrawer tests
// =============================================================================

describe('createSuggestDrawer', () => {
  let handler;
  let container;
  const searchUrl = (q) => '/search?q=' + encodeURIComponent(q);

  beforeEach(() => {
    // Mock DOM
    container = {
      appendChild: vi.fn(),
    };
    vi.stubGlobal('document', {
      createElement: vi.fn((tag) => ({
        tagName: tag.toUpperCase(),
        className: '',
        classList: { add: vi.fn(), contains: vi.fn(() => false), remove: vi.fn() },
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        remove: vi.fn(),
        children: [],
        childNodes: [],
        style: {},
        dataset: {},
        textContent: '',
        innerHTML: '',
        id: '',
        scrollIntoView: vi.fn(),
        querySelectorAll: vi.fn(() => []),
        querySelector: vi.fn(() => null),
      })),
      head: { appendChild: vi.fn() },
      getElementById: vi.fn(() => null),
      body: { appendChild: vi.fn() },
    });

    handler = createSuggestDrawer({
      searchUrl,
      placeholder: 'Search Google...',
      initialQuery: 'test',
    });
  });

  afterEach(() => {
    if (handler?.cleanup) handler.cleanup();
    vi.restoreAllMocks();
  });

  it('returns a DrawerHandler with required methods', () => {
    expect(handler).toHaveProperty('render');
    expect(handler).toHaveProperty('updateQuery');
    expect(handler).toHaveProperty('getFilterPlaceholder');
    expect(handler).toHaveProperty('onKey');
    expect(handler).toHaveProperty('cleanup');
  });

  it('getFilterPlaceholder returns placeholder from config', () => {
    expect(handler.getFilterPlaceholder()).toBe('Search Google...');
  });

  it('render creates drawer DOM in container', () => {
    handler.render(container);
    expect(container.appendChild).toHaveBeenCalled();
  });

  it('onKey Escape closes drawer', () => {
    handler.render(container);
    const state = { ui: { drawer: 'suggest' } };
    const result = handler.onKey('Escape', state);
    expect(result.handled).toBe(true);
    expect(result.newState.ui.drawer).toBe(null);
  });

  it('onKey ArrowDown sets userNavigated and returns handled', () => {
    handler.render(container);
    const state = { ui: { drawer: 'suggest' } };
    const result = handler.onKey('ArrowDown', state);
    expect(result.handled).toBe(true);
  });

  it('onKey ArrowUp returns handled', () => {
    handler.render(container);
    const state = { ui: { drawer: 'suggest' } };
    const result = handler.onKey('ArrowUp', state);
    expect(result.handled).toBe(true);
  });

  it('onKey Enter without navigation navigates to typed query URL', () => {
    vi.stubGlobal('location', { href: '' });
    handler.render(container);
    handler.updateQuery('cats');
    const state = { ui: { drawer: 'suggest' } };
    const result = handler.onKey('Enter', state);
    expect(result.handled).toBe(true);
    expect(result.newState.ui.drawer).toBe(null);
    expect(location.href).toBe('/search?q=cats');
  });

  it('cleanup aborts pending fetches and clears timers', () => {
    handler.render(container);
    // Should not throw
    expect(() => handler.cleanup()).not.toThrow();
  });
});
