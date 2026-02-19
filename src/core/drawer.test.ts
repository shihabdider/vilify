// @vitest-environment jsdom
// Tests for drawer.ts — Drawer factories and manager functions

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createListDrawer, createContentDrawer, handleDrawerKey, renderDrawer, closeDrawer, injectDrawerStyles } from './drawer';
import type { AppState, DrawerHandler } from '../types';
import { createAppState } from './state';

// =============================================================================
// JSDOM POLYFILLS
// =============================================================================

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// =============================================================================
// HELPERS
// =============================================================================

function makeState(overrides: Partial<AppState['ui']> = {}): AppState {
  const state = createAppState();
  return { ...state, ui: { ...state.ui, ...overrides } };
}

function makeListConfig(overrides: Record<string, any> = {}) {
  return {
    id: 'test-list',
    getItems: () => [
      { title: 'Alpha' },
      { title: 'Beta' },
      { title: 'Gamma' },
    ],
    renderItem: (item: any, isSelected: boolean) => {
      const div = document.createElement('div');
      div.textContent = item.title;
      return div;
    },
    onSelect: vi.fn(),
    filterPlaceholder: 'Filter items...',
    matchesFilter: null,
    ...overrides,
  };
}

function makeContentConfig(overrides: Record<string, any> = {}) {
  return {
    id: 'test-content',
    getContent: () => 'Hello world\n\nSome content here.',
    emptyMessage: 'Nothing to show',
    ...overrides,
  };
}

// =============================================================================
// injectDrawerStyles
// =============================================================================
describe('injectDrawerStyles', () => {
  it('injects a style element with drawer CSS into document head', () => {
    // Note: injectDrawerStyles is idempotent (module-level flag).
    // We test it once — the style element may already be in the DOM from a prior call.
    injectDrawerStyles();
    const styleEl = document.getElementById('vilify-drawer-styles');
    expect(styleEl).not.toBeNull();
    expect(styleEl?.tagName).toBe('STYLE');
    expect(styleEl?.textContent).toContain('.vilify-drawer');
  });
});

// =============================================================================
// createListDrawer
// =============================================================================
describe('createListDrawer', () => {
  let handler: DrawerHandler;
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    handler = createListDrawer(makeListConfig());
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('returns an object with render, onKey, cleanup, updateQuery, getFilterPlaceholder', () => {
    expect(typeof handler.render).toBe('function');
    expect(typeof handler.onKey).toBe('function');
    expect(typeof handler.cleanup).toBe('function');
    expect(typeof handler.updateQuery).toBe('function');
    expect(typeof handler.getFilterPlaceholder).toBe('function');
  });

  it('getFilterPlaceholder returns config placeholder', () => {
    expect(handler.getFilterPlaceholder!()).toBe('Filter items...');
  });

  it('render creates drawer DOM with items', () => {
    handler.render(container);
    const items = container.querySelectorAll('.vilify-drawer-item');
    expect(items.length).toBe(3);
  });

  it('render marks first item as selected by default', () => {
    handler.render(container);
    const items = container.querySelectorAll('.vilify-drawer-item');
    expect(items[0].classList.contains('selected')).toBe(true);
    expect(items[1].classList.contains('selected')).toBe(false);
  });

  it('onKey ArrowDown moves selection down', () => {
    handler.render(container);
    const state = makeState({ drawer: 'test-list' });
    const result = handler.onKey('ArrowDown', state);
    expect(result.handled).toBe(true);
    // After ArrowDown, second item should be selected
    const items = container.querySelectorAll('.vilify-drawer-item');
    expect(items[1].classList.contains('selected')).toBe(true);
  });

  it('onKey j also moves selection down', () => {
    handler.render(container);
    const state = makeState({ drawer: 'test-list' });
    handler.onKey('j', state);
    const items = container.querySelectorAll('.vilify-drawer-item');
    expect(items[1].classList.contains('selected')).toBe(true);
  });

  it('onKey ArrowUp does not go below 0', () => {
    handler.render(container);
    const state = makeState({ drawer: 'test-list' });
    const result = handler.onKey('ArrowUp', state);
    expect(result.handled).toBe(true);
    const items = container.querySelectorAll('.vilify-drawer-item');
    expect(items[0].classList.contains('selected')).toBe(true);
  });

  it('onKey Escape closes drawer by setting drawer to null', () => {
    handler.render(container);
    const state = makeState({ drawer: 'test-list' });
    const result = handler.onKey('Escape', state);
    expect(result.handled).toBe(true);
    expect(result.newState.ui.drawer).toBeNull();
  });

  it('onKey Enter calls onSelect with current item', () => {
    const onSelect = vi.fn();
    handler = createListDrawer(makeListConfig({ onSelect }));
    handler.render(container);
    const state = makeState({ drawer: 'test-list' });
    handler.onKey('Enter', state);
    expect(onSelect).toHaveBeenCalledWith({ title: 'Alpha' });
  });

  it('onKey Enter closes drawer', () => {
    handler.render(container);
    const state = makeState({ drawer: 'test-list' });
    const result = handler.onKey('Enter', state);
    expect(result.newState.ui.drawer).toBeNull();
  });

  it('updateQuery filters items', () => {
    handler.render(container);
    handler.updateQuery!('bet');
    const items = container.querySelectorAll('.vilify-drawer-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Beta');
  });

  it('updateQuery with no matches shows empty message', () => {
    handler.render(container);
    handler.updateQuery!('zzz');
    const empty = container.querySelector('.vilify-drawer-empty');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toBe('No matches');
  });

  it('cleanup removes drawer from DOM', () => {
    handler.render(container);
    expect(container.querySelector('.vilify-drawer')).not.toBeNull();
    handler.cleanup!();
    expect(container.querySelector('.vilify-drawer')).toBeNull();
  });

  it('handles empty items list', () => {
    handler = createListDrawer(makeListConfig({ getItems: () => [] }));
    handler.render(container);
    const empty = container.querySelector('.vilify-drawer-empty');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toBe('No items');
  });

  it('sets data-drawer-id attribute from config.id', () => {
    handler.render(container);
    const drawer = container.querySelector('.vilify-drawer');
    expect(drawer?.getAttribute('data-drawer-id')).toBe('test-list');
  });

  it('unrecognized key returns handled: false', () => {
    handler.render(container);
    const state = makeState({ drawer: 'test-list' });
    const result = handler.onKey('x', state);
    expect(result.handled).toBe(false);
  });

  it('uses custom matchesFilter when provided', () => {
    const matchesFilter = (item: any, q: string) => item.title.startsWith(q);
    handler = createListDrawer(makeListConfig({ matchesFilter }));
    handler.render(container);
    handler.updateQuery!('G');
    const items = container.querySelectorAll('.vilify-drawer-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Gamma');
  });
});

// =============================================================================
// createContentDrawer
// =============================================================================
describe('createContentDrawer', () => {
  let handler: DrawerHandler;
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    handler = createContentDrawer(makeContentConfig());
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('returns an object with render, onKey, cleanup', () => {
    expect(typeof handler.render).toBe('function');
    expect(typeof handler.onKey).toBe('function');
    expect(typeof handler.cleanup).toBe('function');
  });

  it('render creates drawer with content text', () => {
    handler.render(container);
    const content = container.querySelector('.vilify-drawer-content');
    expect(content).not.toBeNull();
    expect(content?.textContent).toContain('Hello world');
  });

  it('sets data-drawer-id attribute from config.id', () => {
    handler.render(container);
    const drawer = container.querySelector('.vilify-drawer');
    expect(drawer?.getAttribute('data-drawer-id')).toBe('test-content');
  });

  it('render shows empty message when content is null', () => {
    handler = createContentDrawer(makeContentConfig({ getContent: () => null }));
    handler.render(container);
    const empty = container.querySelector('.vilify-drawer-empty');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toBe('Nothing to show');
  });

  it('render shows empty message when content is whitespace-only', () => {
    handler = createContentDrawer(makeContentConfig({ getContent: () => '   \n  ' }));
    handler.render(container);
    const empty = container.querySelector('.vilify-drawer-empty');
    expect(empty).not.toBeNull();
  });

  it('onKey Escape closes drawer', () => {
    handler.render(container);
    const state = makeState({ drawer: 'test-content' });
    const result = handler.onKey('Escape', state);
    expect(result.handled).toBe(true);
    expect(result.newState.ui.drawer).toBeNull();
  });

  it('onKey j scrolls down', () => {
    handler.render(container);
    const state = makeState({ drawer: 'test-content' });
    const result = handler.onKey('j', state);
    expect(result.handled).toBe(true);
  });

  it('onKey k scrolls up', () => {
    handler.render(container);
    const state = makeState({ drawer: 'test-content' });
    const result = handler.onKey('k', state);
    expect(result.handled).toBe(true);
  });

  it('onKey g scrolls to top', () => {
    handler.render(container);
    const state = makeState({ drawer: 'test-content' });
    const result = handler.onKey('g', state);
    expect(result.handled).toBe(true);
  });

  it('onKey G scrolls to bottom', () => {
    handler.render(container);
    const state = makeState({ drawer: 'test-content' });
    const result = handler.onKey('G', state);
    expect(result.handled).toBe(true);
  });

  it('unrecognized key returns handled: false', () => {
    handler.render(container);
    const state = makeState({ drawer: 'test-content' });
    const result = handler.onKey('x', state);
    expect(result.handled).toBe(false);
  });

  it('cleanup removes drawer from DOM', () => {
    handler.render(container);
    expect(container.querySelector('.vilify-drawer')).not.toBeNull();
    handler.cleanup!();
    expect(container.querySelector('.vilify-drawer')).toBeNull();
  });
});

// =============================================================================
// handleDrawerKey
// =============================================================================
describe('handleDrawerKey', () => {
  it('returns handled: false when drawer is null', () => {
    const state = makeState({ drawer: null });
    const result = handleDrawerKey('j', state, null);
    expect(result.handled).toBe(false);
    expect(result.newState).toBe(state);
  });

  it('returns handled: false when handler is null', () => {
    const state = makeState({ drawer: 'chapters' });
    const result = handleDrawerKey('j', state, null);
    expect(result.handled).toBe(false);
  });

  it('delegates to handler.onKey when both drawer and handler exist', () => {
    const state = makeState({ drawer: 'chapters' });
    const mockHandler: DrawerHandler = {
      render: vi.fn(),
      onKey: vi.fn().mockReturnValue({ handled: true, newState: state }),
      cleanup: vi.fn(),
    };
    const result = handleDrawerKey('j', state, mockHandler);
    expect(mockHandler.onKey).toHaveBeenCalledWith('j', state);
    expect(result.handled).toBe(true);
  });
});

// =============================================================================
// renderDrawer / closeDrawer
// =============================================================================
describe('renderDrawer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('calls handler.render when drawerState and handler are provided', () => {
    const mockHandler: DrawerHandler = {
      render: vi.fn(),
      onKey: vi.fn().mockReturnValue({ handled: false, newState: {} }),
      cleanup: vi.fn(),
    };
    renderDrawer('chapters', mockHandler);
    expect(mockHandler.render).toHaveBeenCalled();
  });

  it('does not call render when drawerState is null', () => {
    const mockHandler: DrawerHandler = {
      render: vi.fn(),
      onKey: vi.fn().mockReturnValue({ handled: false, newState: {} }),
      cleanup: vi.fn(),
    };
    renderDrawer(null, mockHandler);
    expect(mockHandler.render).not.toHaveBeenCalled();
  });

  it('does not call render when handler is null', () => {
    renderDrawer('chapters', null);
    // No error thrown — just a no-op
  });

  it('cleans up previous active drawer when rendering a new one', () => {
    const firstHandler: DrawerHandler = {
      render: vi.fn(),
      onKey: vi.fn().mockReturnValue({ handled: false, newState: {} }),
      cleanup: vi.fn(),
    };
    const secondHandler: DrawerHandler = {
      render: vi.fn(),
      onKey: vi.fn().mockReturnValue({ handled: false, newState: {} }),
      cleanup: vi.fn(),
    };
    renderDrawer('chapters', firstHandler);
    renderDrawer('description', secondHandler);
    expect(firstHandler.cleanup).toHaveBeenCalled();
  });
});

describe('closeDrawer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('does not throw when no drawer is active', () => {
    expect(() => closeDrawer()).not.toThrow();
  });

  it('cleans up active drawer', () => {
    const mockHandler: DrawerHandler = {
      render: vi.fn(),
      onKey: vi.fn().mockReturnValue({ handled: false, newState: {} }),
      cleanup: vi.fn(),
    };
    renderDrawer('chapters', mockHandler);
    closeDrawer();
    expect(mockHandler.cleanup).toHaveBeenCalled();
  });
});
