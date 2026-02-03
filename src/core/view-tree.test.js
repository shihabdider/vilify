// Tests for view-tree.js - Pure view computation
// Run with: npm test

import { describe, it, expect } from 'vitest';
import {
  toView,
  toStatusBarView,
  toContentView,
  toDrawerView,
  getPageItems,
  statusBarViewEqual,
  contentViewChanged,
  drawerViewChanged
} from './view-tree.js';
import { createAppState } from './state.js';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestState(overrides = {}) {
  const base = createAppState();
  return {
    ...base,
    core: { ...base.core, ...overrides.core },
    ui: { ...base.ui, ...overrides.ui },
    site: overrides.site ?? base.site,
    page: overrides.page ?? base.page
  };
}

function createTestConfig(overrides = {}) {
  return {
    name: 'test',
    getPageType: () => overrides.pageType || 'home',
    getItems: () => overrides.items || [],
    layouts: overrides.layouts || { home: 'listing' },
    getDrawerHandler: overrides.getDrawerHandler || (() => null),
    ...overrides
  };
}

// =============================================================================
// toStatusBarView TESTS
// =============================================================================

describe('toStatusBarView', () => {
  it('returns NORMAL mode when nothing active', () => {
    const state = createTestState();
    const view = toStatusBarView(state);
    
    expect(view.mode).toBe('NORMAL');
    expect(view.inputVisible).toBe(false);
    expect(view.inputFocus).toBe(false);
    expect(view.hints).toBe(null);
  });

  it('returns FILTER mode with input visible', () => {
    const state = createTestState({
      ui: { filterActive: true, filterQuery: 'react' }
    });
    const view = toStatusBarView(state);
    
    expect(view.mode).toBe('FILTER');
    expect(view.inputVisible).toBe(true);
    expect(view.inputValue).toBe('react');
    expect(view.inputPlaceholder).toBe('Filter...');
    expect(view.inputFocus).toBe(true);
    expect(view.hints).toContain('navigate');
  });

  it('returns COMMAND mode for palette', () => {
    const state = createTestState({
      ui: { drawer: 'palette', paletteQuery: ':sort' }
    });
    const view = toStatusBarView(state);
    
    expect(view.mode).toBe('COMMAND');
    expect(view.inputVisible).toBe(true);
    expect(view.inputValue).toBe(':sort');
    expect(view.inputPlaceholder).toBe('Command...');
  });

  it('returns SEARCH mode', () => {
    const state = createTestState({
      ui: { searchActive: true, searchQuery: 'test' }
    });
    const view = toStatusBarView(state);
    
    expect(view.mode).toBe('SEARCH');
    expect(view.inputVisible).toBe(true);
    expect(view.inputValue).toBe('test');
    expect(view.inputPlaceholder).toBe('Search YouTube...');
  });

  it('returns drawer name as mode for site drawers', () => {
    const state = createTestState({
      ui: { drawer: 'chapters' }
    });
    const view = toStatusBarView(state);
    
    expect(view.mode).toBe('CHAPTERS');
    expect(view.inputVisible).toBe(true);
    expect(view.inputPlaceholder).toContain('chapters');
  });

  it('returns DESCRIPTION mode with scroll hints', () => {
    const state = createTestState({
      ui: { drawer: 'description' }
    });
    const view = toStatusBarView(state);
    
    expect(view.mode).toBe('DESCRIPTION');
    expect(view.inputVisible).toBe(false);  // Description doesn't need input
    expect(view.hints).toContain('scroll');
  });

  it('includes sort label when sorting active', () => {
    const state = createTestState({
      ui: { sort: { field: 'date', direction: 'desc' } }
    });
    const view = toStatusBarView(state);
    
    expect(view.sortLabel).toBe('date↓');
  });

  it('uses custom drawer placeholder', () => {
    const state = createTestState({
      ui: { drawer: 'transcript' }
    });
    const view = toStatusBarView(state, 'Search transcript...');
    
    expect(view.inputPlaceholder).toBe('Search transcript...');
  });
});

// =============================================================================
// toContentView TESTS
// =============================================================================

// =============================================================================
// getPageItems TESTS
// =============================================================================

describe('getPageItems', () => {
  it('returns videos from list page', () => {
    const state = createTestState({
      page: { type: 'list', videos: [{ id: '1' }, { id: '2' }] }
    });
    
    const items = getPageItems(state);
    
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('1');
  });
  
  it('returns recommended from watch page', () => {
    const state = createTestState({
      page: { type: 'watch', videoContext: null, recommended: [{ id: 'r1' }], chapters: [] }
    });
    
    const items = getPageItems(state);
    
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('r1');
  });
  
  it('returns empty array when page is null', () => {
    const state = createTestState({ page: null });
    
    const items = getPageItems(state);
    
    expect(items).toEqual([]);
  });
  
  it('returns empty array for unknown page type', () => {
    const state = createTestState({ page: { type: 'unknown' } });
    
    const items = getPageItems(state);
    
    expect(items).toEqual([]);
  });
});

// =============================================================================
// toContentView TESTS
// =============================================================================

describe('toContentView', () => {
  it('reads items from state.page (HtDP model)', () => {
    const state = createTestState({ 
      ui: { selectedIdx: 2 },
      page: { type: 'list', videos: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] }
    });
    const config = createTestConfig({ pageType: 'home', layouts: { home: 'listing' } });
    
    const view = toContentView(state, config);
    
    expect(view.type).toBe('listing');
    expect(view.items).toHaveLength(3);
    expect(view.selectedIdx).toBe(2);
    expect(view.render).toBe(null);
  });
  
  it('returns listing type for listing layout (legacy items parameter)', () => {
    const state = createTestState({ ui: { selectedIdx: 2 } });
    const config = createTestConfig({ pageType: 'home', layouts: { home: 'listing' } });
    const items = [{ title: 'A' }, { title: 'B' }, { title: 'C' }];
    
    const view = toContentView(state, config, items);
    
    expect(view.type).toBe('listing');
    expect(view.items).toHaveLength(3);
    expect(view.selectedIdx).toBe(2);
    expect(view.render).toBe(null);
  });

  it('returns custom type for function layout', () => {
    const customRender = () => {};
    const state = createTestState();
    const config = createTestConfig({
      pageType: 'watch',
      layouts: { watch: customRender }
    });
    
    const view = toContentView(state, config, []);
    
    expect(view.type).toBe('custom');
    expect(view.render).toBe(customRender);
  });

  it('returns empty type when no items', () => {
    const state = createTestState();
    const config = createTestConfig({ pageType: 'home', layouts: { home: 'listing' } });
    
    const view = toContentView(state, config, []);
    
    expect(view.type).toBe('empty');
    expect(view.items).toHaveLength(0);
  });

  it('applies filter to items', () => {
    const state = createTestState({
      ui: { filterActive: true, filterQuery: 'react' }
    });
    const config = createTestConfig();
    const items = [
      { title: 'React Tutorial' },
      { title: 'Vue Guide' },
      { title: 'React Hooks' }
    ];
    
    const view = toContentView(state, config, items);
    
    expect(view.type).toBe('listing');
    expect(view.items).toHaveLength(2);
    expect(view.items.every(i => i.title.includes('React'))).toBe(true);
  });

  it('applies sort to items', () => {
    const state = createTestState({
      ui: { sort: { field: 'title', direction: 'asc' } }
    });
    const config = createTestConfig();
    const items = [
      { title: 'Zebra' },
      { title: 'Apple' },
      { title: 'Mango' }
    ];
    
    const view = toContentView(state, config, items);
    
    expect(view.items[0].title).toBe('Apple');
    expect(view.items[1].title).toBe('Mango');
    expect(view.items[2].title).toBe('Zebra');
  });
});

// =============================================================================
// toDrawerView TESTS
// =============================================================================

describe('toDrawerView', () => {
  it('returns null when no drawer open', () => {
    const state = createTestState({ ui: { drawer: null } });
    const config = createTestConfig();
    
    const view = toDrawerView(state, config, {});
    
    expect(view).toBe(null);
  });

  it('returns palette drawer with filtered commands', () => {
    const state = createTestState({
      ui: { drawer: 'palette', paletteQuery: 'sort', paletteSelectedIdx: 1 }
    });
    const config = createTestConfig();
    const commands = [
      { label: 'Sort by date', keys: ':sd' },
      { label: 'Sort by views', keys: ':sv' },
      { label: 'Copy URL', keys: 'y' }
    ];
    
    const view = toDrawerView(state, config, { commands });
    
    expect(view.type).toBe('palette');
    expect(view.visible).toBe(true);
    expect(view.items).toHaveLength(2);  // Filtered to 'sort' matches
    expect(view.selectedIdx).toBe(1);
    expect(view.handler).toBe(null);
  });

  it('returns site drawer with handler', () => {
    const mockHandler = { render: () => {}, onKey: () => {} };
    const state = createTestState({ ui: { drawer: 'chapters' } });
    const config = createTestConfig({
      getDrawerHandler: (type) => type === 'chapters' ? mockHandler : null
    });
    
    const view = toDrawerView(state, config, { siteState: {} });
    
    expect(view.type).toBe('chapters');
    expect(view.visible).toBe(true);
    expect(view.handler).toBe(mockHandler);
  });
});

// =============================================================================
// toView TESTS
// =============================================================================

describe('toView', () => {
  it('computes complete view tree', () => {
    const state = createTestState({
      ui: { selectedIdx: 1, sort: { field: 'date', direction: 'desc' } },
      page: { type: 'list', videos: [{ title: 'A' }, { title: 'B' }] }
    });
    const config = createTestConfig();
    const commands = [{ label: 'Test' }];
    
    const view = toView(state, config, { commands });
    
    expect(view.statusBar).toBeDefined();
    expect(view.statusBar.mode).toBe('NORMAL');
    expect(view.statusBar.sortLabel).toBe('date↓');
    expect(view.statusBar.itemCount).toBe(2);
    
    expect(view.content).toBeDefined();
    expect(view.content.type).toBe('listing');
    expect(view.content.items).toHaveLength(2);
    
    expect(view.drawer).toBe(null);
  });

  it('includes drawer in view tree', () => {
    const state = createTestState({ 
      ui: { drawer: 'palette' },
      page: { type: 'list', videos: [] }
    });
    const config = createTestConfig();
    const commands = [{ label: 'Command 1' }];
    
    const view = toView(state, config, { commands });
    
    expect(view.drawer).not.toBe(null);
    expect(view.drawer.type).toBe('palette');
  });

  it('uses drawer placeholder from handler', () => {
    const state = createTestState({ 
      ui: { drawer: 'transcript' },
      page: { type: 'list', videos: [] }
    });
    const config = createTestConfig({
      getDrawerHandler: () => ({
        getFilterPlaceholder: () => 'Search transcript...'
      })
    });
    
    const view = toView(state, config, { siteState: {} });
    
    expect(view.statusBar.inputPlaceholder).toBe('Search transcript...');
  });
});

// =============================================================================
// VIEW COMPARISON TESTS
// =============================================================================

describe('statusBarViewEqual', () => {
  it('returns true for identical views', () => {
    const view = {
      mode: 'NORMAL',
      inputVisible: false,
      inputValue: '',
      inputPlaceholder: '',
      inputFocus: false,
      sortLabel: null,
      itemCount: 10,
      hints: null
    };
    
    expect(statusBarViewEqual(view, view)).toBe(true);
    expect(statusBarViewEqual(view, { ...view })).toBe(true);
  });

  it('returns false for different modes', () => {
    const a = { mode: 'NORMAL', inputVisible: false };
    const b = { mode: 'FILTER', inputVisible: true };
    
    expect(statusBarViewEqual(a, b)).toBe(false);
  });

  it('handles null values', () => {
    expect(statusBarViewEqual(null, null)).toBe(true);  // Both null = equal
    expect(statusBarViewEqual({}, null)).toBe(false);
    expect(statusBarViewEqual(null, {})).toBe(false);
  });
});

describe('contentViewChanged', () => {
  it('returns false for same reference', () => {
    const view = { type: 'listing', items: [], selectedIdx: 0 };
    expect(contentViewChanged(view, view)).toBe(false);
  });

  it('returns true for type change', () => {
    const a = { type: 'listing', items: [], selectedIdx: 0 };
    const b = { type: 'empty', items: [], selectedIdx: 0 };
    
    expect(contentViewChanged(a, b)).toBe(true);
  });

  it('returns true for selection change', () => {
    const items = [];
    const a = { type: 'listing', items, selectedIdx: 0 };
    const b = { type: 'listing', items, selectedIdx: 1 };
    
    expect(contentViewChanged(a, b)).toBe(true);
  });

  it('returns true for items array change', () => {
    const a = { type: 'listing', items: [], selectedIdx: 0 };
    const b = { type: 'listing', items: [], selectedIdx: 0 };  // Different array ref
    
    expect(contentViewChanged(a, b)).toBe(true);
  });
});

describe('drawerViewChanged', () => {
  it('returns false for same reference', () => {
    const view = { type: 'palette', visible: true };
    expect(drawerViewChanged(view, view)).toBe(false);
  });

  it('returns true for type change', () => {
    const a = { type: 'palette', visible: true };
    const b = { type: 'chapters', visible: true };
    
    expect(drawerViewChanged(a, b)).toBe(true);
  });

  it('returns true for null vs non-null', () => {
    const view = { type: 'palette', visible: true };
    
    expect(drawerViewChanged(null, view)).toBe(true);
    expect(drawerViewChanged(view, null)).toBe(true);
  });
});
