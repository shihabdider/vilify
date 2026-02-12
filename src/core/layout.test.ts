// @vitest-environment jsdom
// Tests for layout.ts — Type annotations on all exported functions
// Verifies function signatures accept correct types and return correct types

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setInputCallbacks,
  injectFocusModeStyles,
  applyTheme,
  renderFocusMode,
  updateStatusBar,
  updateSortIndicator,
  updateItemCount,
  renderListing,
  renderDefaultItem,
  updateStatusMessage,
  removeFocusMode,
  getContentContainer,
} from './layout';
import type { SiteConfig, SiteTheme, AppState, ContentItem } from '../types';
import { createAppState } from './state';

// =============================================================================
// Helpers
// =============================================================================

function makeTheme(): SiteTheme {
  return {
    bg1: '#002b36', bg2: '#073642', bg3: '#0a4a5c',
    txt1: '#f1f1f1', txt2: '#aaaaaa', txt3: '#717171', txt4: '#3ea6ff',
    accent: '#ff0000', accentHover: '#cc0000',
  };
}

function makeConfig(overrides: Partial<SiteConfig> = {}): SiteConfig {
  return {
    name: 'test',
    theme: makeTheme(),
    getPageType: () => 'home',
    ...overrides,
  };
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  const base = createAppState(null);
  return { ...base, ...overrides };
}

function makeItem(title: string, url: string = 'https://example.com'): ContentItem {
  return { title, url };
}

// =============================================================================
// setInputCallbacks
// =============================================================================
describe('setInputCallbacks', () => {
  it('accepts an object with callback functions', () => {
    expect(() => setInputCallbacks({ onEscape: () => {} })).not.toThrow();
  });

  it('accepts null to clear callbacks', () => {
    expect(() => setInputCallbacks(null)).not.toThrow();
  });
});

// =============================================================================
// injectFocusModeStyles
// =============================================================================
describe('injectFocusModeStyles', () => {
  afterEach(() => {
    const el = document.getElementById('vilify-focus-mode-styles');
    if (el) el.remove();
  });

  it('returns void and injects a style element', () => {
    const result = injectFocusModeStyles();
    expect(result).toBeUndefined();
    expect(document.getElementById('vilify-focus-mode-styles')).not.toBeNull();
  });

  it('is idempotent — calling twice does not duplicate styles', () => {
    injectFocusModeStyles();
    injectFocusModeStyles();
    const styles = document.querySelectorAll('#vilify-focus-mode-styles');
    expect(styles.length).toBe(1);
  });
});

// =============================================================================
// applyTheme
// =============================================================================
describe('applyTheme', () => {
  it('sets CSS custom properties on document root', () => {
    const theme = makeTheme();
    applyTheme(theme);
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--bg-1')).toBe('#002b36');
    expect(root.style.getPropertyValue('--accent')).toBe('#ff0000');
    expect(root.style.getPropertyValue('--txt-4')).toBe('#3ea6ff');
  });
});

// =============================================================================
// renderFocusMode
// =============================================================================
describe('renderFocusMode', () => {
  afterEach(() => {
    removeFocusMode();
  });

  it('creates focus mode container with content and status bar', () => {
    const config = makeConfig();
    const state = makeState();
    renderFocusMode(config, state);

    expect(document.getElementById('vilify-focus')).not.toBeNull();
    expect(document.getElementById('vilify-content')).not.toBeNull();
    expect(document.querySelector('.vilify-status-bar')).not.toBeNull();
    expect(document.body.classList.contains('vilify-focus-mode')).toBe(true);
  });

  it('replaces existing focus mode container on re-render', () => {
    const config = makeConfig();
    const state = makeState();
    renderFocusMode(config, state);
    renderFocusMode(config, state);
    const containers = document.querySelectorAll('#vilify-focus');
    expect(containers.length).toBe(1);
  });

  it('applies theme from config', () => {
    const config = makeConfig();
    const state = makeState();
    renderFocusMode(config, state);
    expect(document.documentElement.style.getPropertyValue('--bg-1')).toBe('#002b36');
  });
});

// =============================================================================
// updateStatusBar
// =============================================================================
describe('updateStatusBar', () => {
  beforeEach(() => {
    const config = makeConfig();
    const state = makeState();
    renderFocusMode(config, state);
  });

  afterEach(() => {
    removeFocusMode();
  });

  it('updates the mode badge to NORMAL for default state', () => {
    const state = makeState();
    updateStatusBar(state);
    const badge = document.querySelector('.vilify-mode-badge');
    expect(badge?.textContent).toBe('NORMAL');
  });

  it('accepts optional focusInput boolean parameter', () => {
    const state = makeState();
    expect(() => updateStatusBar(state, true)).not.toThrow();
  });

  it('accepts optional drawerPlaceholder parameter', () => {
    const state = makeState();
    expect(() => updateStatusBar(state, false, 'Filter chapters...')).not.toThrow();
  });

  it('accepts optional searchPlaceholder parameter', () => {
    const state = makeState();
    expect(() => updateStatusBar(state, false, null, 'Search YouTube...')).not.toThrow();
  });

  it('shows input for FILTER mode', () => {
    const state = makeState();
    state.ui.filterActive = true;
    updateStatusBar(state, true);
    const input = document.getElementById('vilify-status-input') as HTMLInputElement;
    expect(input?.classList.contains('visible')).toBe(true);
    expect(input?.placeholder).toBe('Filter...');
  });
});

// =============================================================================
// updateSortIndicator
// =============================================================================
describe('updateSortIndicator', () => {
  beforeEach(() => {
    renderFocusMode(makeConfig(), makeState());
  });

  afterEach(() => {
    removeFocusMode();
  });

  it('shows sort label when non-empty string provided', () => {
    updateSortIndicator('date↓');
    const el = document.getElementById('vilify-status-sort');
    expect(el?.textContent).toBe('date↓');
    expect(el?.style.display).toBe('inline');
  });

  it('hides indicator when empty string provided', () => {
    updateSortIndicator('');
    const el = document.getElementById('vilify-status-sort');
    expect(el?.style.display).toBe('none');
  });
});

// =============================================================================
// updateItemCount
// =============================================================================
describe('updateItemCount', () => {
  beforeEach(() => {
    renderFocusMode(makeConfig(), makeState());
  });

  afterEach(() => {
    removeFocusMode();
  });

  it('shows count in brackets for positive number', () => {
    updateItemCount(42);
    const el = document.getElementById('vilify-status-count');
    expect(el?.textContent).toBe('[42]');
  });

  it('shows empty for zero', () => {
    updateItemCount(0);
    const el = document.getElementById('vilify-status-count');
    expect(el?.textContent).toBe('');
  });
});

// =============================================================================
// renderListing
// =============================================================================
describe('renderListing', () => {
  beforeEach(() => {
    renderFocusMode(makeConfig(), makeState());
    // jsdom doesn't implement scrollIntoView
    Element.prototype.scrollIntoView = () => {};
  });

  afterEach(() => {
    removeFocusMode();
  });

  it('renders items into the content container', () => {
    const items: ContentItem[] = [makeItem('Video 1'), makeItem('Video 2')];
    renderListing(items, 0);
    const content = document.getElementById('vilify-content');
    expect(content?.querySelectorAll('.vilify-item').length).toBe(2);
  });

  it('marks the selected item', () => {
    const items: ContentItem[] = [makeItem('A'), makeItem('B')];
    renderListing(items, 1);
    const content = document.getElementById('vilify-content');
    const selected = content?.querySelectorAll('.vilify-item.selected');
    expect(selected?.length).toBe(1);
    expect(selected?.[0].getAttribute('data-index')).toBe('1');
  });

  it('shows empty message for empty array', () => {
    renderListing([], 0);
    const content = document.getElementById('vilify-content');
    expect(content?.querySelector('.vilify-empty')).not.toBeNull();
  });

  it('accepts optional container parameter', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const items: ContentItem[] = [makeItem('Test')];
    renderListing(items, 0, container);
    expect(container.querySelectorAll('.vilify-item').length).toBe(1);
    container.remove();
  });

  it('accepts optional renderItem callback', () => {
    const items: ContentItem[] = [makeItem('Custom')];
    const customRenderer = (item: ContentItem, isSelected: boolean): HTMLElement => {
      const div = document.createElement('div');
      div.className = isSelected ? 'vilify-item selected' : 'vilify-item';
      div.textContent = `CUSTOM: ${item.title}`;
      return div;
    };
    renderListing(items, 0, null, customRenderer);
    const content = document.getElementById('vilify-content');
    expect(content?.textContent).toContain('CUSTOM: Custom');
  });

  it('accepts null for optional parameters', () => {
    const items: ContentItem[] = [makeItem('Test')];
    expect(() => renderListing(items, 0, null, null)).not.toThrow();
  });
});

// =============================================================================
// renderDefaultItem
// =============================================================================
describe('renderDefaultItem', () => {
  it('renders a content item with title', () => {
    const item = makeItem('My Video');
    const el = renderDefaultItem(item, false);
    expect(el.className).toBe('vilify-item');
    expect(el.querySelector('.vilify-item-title')?.textContent).toBe('My Video');
  });

  it('adds selected class when isSelected is true', () => {
    const item = makeItem('Selected Video');
    const el = renderDefaultItem(item, true);
    expect(el.className).toBe('vilify-item selected');
  });

  it('renders thumbnail when present', () => {
    const item: ContentItem = { title: 'Thumb', url: '#', thumbnail: 'https://img.example.com/thumb.jpg' };
    const el = renderDefaultItem(item, false);
    const img = el.querySelector('img.vilify-thumb') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://img.example.com/thumb.jpg');
  });

  it('renders placeholder when no thumbnail', () => {
    const item = makeItem('No Thumb');
    const el = renderDefaultItem(item, false);
    const thumb = el.querySelector('.vilify-thumb');
    expect(thumb?.tagName).toBe('DIV');
  });

  it('renders meta when present', () => {
    const item: ContentItem = { title: 'T', url: '#', meta: '100K views' };
    const el = renderDefaultItem(item, false);
    expect(el.querySelector('.vilify-item-meta')?.textContent).toBe('100K views');
  });
});

// =============================================================================
// updateStatusMessage
// =============================================================================
describe('updateStatusMessage', () => {
  beforeEach(() => {
    renderFocusMode(makeConfig(), makeState());
  });

  afterEach(() => {
    removeFocusMode();
  });

  it('sets message text in status bar', () => {
    updateStatusMessage('Saved!');
    const el = document.getElementById('vilify-status-message');
    expect(el?.textContent).toBe('Saved!');
  });

  it('clears message with empty string', () => {
    updateStatusMessage('Saved!');
    updateStatusMessage('');
    const el = document.getElementById('vilify-status-message');
    expect(el?.textContent).toBe('');
  });
});

// =============================================================================
// removeFocusMode
// =============================================================================
describe('removeFocusMode', () => {
  it('removes focus mode container from DOM', () => {
    renderFocusMode(makeConfig(), makeState());
    removeFocusMode();
    expect(document.getElementById('vilify-focus')).toBeNull();
    expect(document.body.classList.contains('vilify-focus-mode')).toBe(false);
  });

  it('is safe to call when no focus mode active', () => {
    expect(() => removeFocusMode()).not.toThrow();
  });
});

// =============================================================================
// getContentContainer
// =============================================================================
describe('getContentContainer', () => {
  it('returns null when focus mode is not active', () => {
    removeFocusMode();
    const result = getContentContainer();
    expect(result).toBeNull();
  });

  it('returns the content element when focus mode is active', () => {
    renderFocusMode(makeConfig(), makeState());
    const result = getContentContainer();
    expect(result).not.toBeNull();
    expect(result?.id).toBe('vilify-content');
    removeFocusMode();
  });
});
