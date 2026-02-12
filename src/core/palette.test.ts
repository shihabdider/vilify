// Palette module tests
// Following HtDP: Examples become tests

import { describe, it, expect } from 'vitest';
import { filterItems, openPalette, closePalette } from './palette';
import type { AppState } from '../types';
import { createAppState } from './state';

// Helper: minimal AppState for testing pure state transitions
function makeState(overrides: Partial<AppState['ui']> = {}): AppState {
  const state = createAppState();
  return { ...state, ui: { ...state.ui, ...overrides } };
}

describe('filterItems', () => {
  it('returns all items when query is empty', () => {
    const items = [
      { label: 'Copy URL', keys: 'yy' },
      { label: 'Go Home', keys: 'gh' },
    ];
    expect(filterItems(items, '')).toEqual(items);
  });

  it('filters by label substring (case-insensitive)', () => {
    const items = [
      { label: 'Copy URL', keys: 'yy' },
      { label: 'Go Home', keys: 'gh' },
    ];
    expect(filterItems(items, 'copy')).toEqual([{ label: 'Copy URL', keys: 'yy' }]);
  });

  it('filters by keys substring', () => {
    const items = [
      { label: 'Copy URL', keys: 'yy' },
      { label: 'Go Home', keys: 'gh' },
    ];
    expect(filterItems(items, 'gh')).toEqual([{ label: 'Go Home', keys: 'gh' }]);
  });

  it('excludes group headers when query is present', () => {
    const items = [
      { group: 'Navigation' },
      { label: 'Go Home', keys: 'gh' },
      { group: 'Actions' },
      { label: 'Copy URL', keys: 'yy' },
    ];
    expect(filterItems(items, 'go')).toEqual([{ label: 'Go Home', keys: 'gh' }]);
  });

  it('returns empty array when nothing matches', () => {
    const items = [
      { label: 'Copy URL', keys: 'yy' },
      { label: 'Go Home', keys: 'gh' },
    ];
    expect(filterItems(items, 'zzz')).toEqual([]);
  });

  it('handles empty items array', () => {
    expect(filterItems([], 'test')).toEqual([]);
  });

  it('matches label with mixed case query', () => {
    const items = [{ label: 'Copy URL', keys: 'yy' }];
    expect(filterItems(items, 'COPY')).toEqual([{ label: 'Copy URL', keys: 'yy' }]);
  });

  it('matches keys ignoring whitespace', () => {
    const items = [{ label: 'Sort by date', keys: 's d' }];
    // keys 's d' stripped to 'sd', query 'sd' matches
    expect(filterItems(items, 'sd')).toEqual([{ label: 'Sort by date', keys: 's d' }]);
  });
});

describe('openPalette', () => {
  it('opens palette in command mode with ":" query', () => {
    const state = makeState();
    const result = openPalette(state, 'command');
    expect(result.ui.drawer).toBe('palette');
    expect(result.ui.paletteQuery).toBe(':');
    expect(result.ui.paletteSelectedIdx).toBe(0);
  });

  it('opens palette in video mode with empty query', () => {
    const state = makeState();
    const result = openPalette(state, 'video');
    expect(result.ui.drawer).toBe('palette');
    expect(result.ui.paletteQuery).toBe('');
    expect(result.ui.paletteSelectedIdx).toBe(0);
  });

  it('opens palette with no mode (defaults to empty query)', () => {
    const state = makeState();
    const result = openPalette(state);
    expect(result.ui.drawer).toBe('palette');
    expect(result.ui.paletteQuery).toBe('');
    expect(result.ui.paletteSelectedIdx).toBe(0);
  });

  it('does not mutate original state', () => {
    const state = makeState();
    const original = JSON.parse(JSON.stringify(state));
    openPalette(state, 'command');
    // Remove non-serializable fields for comparison
    expect(state.ui.drawer).toBe(original.ui.drawer);
    expect(state.ui.paletteQuery).toBe(original.ui.paletteQuery);
  });

  it('preserves other ui fields', () => {
    const state = makeState({ selectedIdx: 5, filterActive: true });
    const result = openPalette(state, 'command');
    expect(result.ui.selectedIdx).toBe(5);
    expect(result.ui.filterActive).toBe(true);
  });
});

describe('closePalette', () => {
  it('closes palette and clears query', () => {
    const state = makeState({ drawer: 'palette', paletteQuery: ':copy' });
    const result = closePalette(state);
    expect(result.ui.drawer).toBe(null);
    expect(result.ui.paletteQuery).toBe('');
  });

  it('does not mutate original state', () => {
    const state = makeState({ drawer: 'palette', paletteQuery: ':test' });
    closePalette(state);
    expect(state.ui.drawer).toBe('palette');
    expect(state.ui.paletteQuery).toBe(':test');
  });

  it('preserves other ui fields', () => {
    const state = makeState({ drawer: 'palette', paletteQuery: ':x', selectedIdx: 3 });
    const result = closePalette(state);
    expect(result.ui.selectedIdx).toBe(3);
  });

  it('works when palette is already closed', () => {
    const state = makeState({ drawer: null, paletteQuery: '' });
    const result = closePalette(state);
    expect(result.ui.drawer).toBe(null);
    expect(result.ui.paletteQuery).toBe('');
  });
});
