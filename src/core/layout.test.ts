// @vitest-environment jsdom
// Tests for layout.ts — Type annotations on all exported functions
// Verifies function signatures accept correct types and return correct types

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  contrastText,
  setInputCallbacks,
  injectFocusModeStyles,
  applyTheme,
  applyFont,
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
    bg1: 'hsl(240, 14%, 14%)', bg2: 'hsl(240, 15%, 19%)', bg3: 'hsl(240, 14%, 24%)',
    txt1: 'hsl(50, 36%, 77%)', txt2: 'hsl(49, 30%, 68%)', txt3: 'hsl(53, 4%, 43%)', txt4: 'hsl(220, 53%, 67%)',
    accent: 'hsl(358, 51%, 51%)', accentHover: 'hsl(0, 82%, 53%)',
    modeNormal: 'hsl(220, 53%, 67%)', modeSearch: 'hsl(93, 34%, 58%)',
    modeCommand: 'hsl(39, 40%, 59%)', modeFilter: 'hsl(264, 29%, 61%)',
    modeReplace: 'hsl(0, 0%, 50%)',
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

  it('does not include an outer border on #vilify-focus container', () => {
    injectFocusModeStyles();
    const styleEl = document.getElementById('vilify-focus-mode-styles') as HTMLStyleElement;
    const css = styleEl.textContent ?? '';
    // Extract the #vilify-focus rule block
    const match = css.match(/#vilify-focus\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    const ruleBody = match![1];
    // The rule should NOT contain a border declaration
    expect(ruleBody).not.toMatch(/\bborder\s*:/);
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
    expect(root.style.getPropertyValue('--bg-1')).toBe('hsl(240, 14%, 14%)');
    expect(root.style.getPropertyValue('--accent')).toBe('hsl(358, 51%, 51%)');
    expect(root.style.getPropertyValue('--txt-4')).toBe('hsl(220, 53%, 67%)');
  });
});

// =============================================================================
// applyFont
// =============================================================================
describe('applyFont', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--font-mono');
  });

  it('sets --font-mono CSS variable on document root', () => {
    applyFont('JetBrains Mono');
    const root = document.documentElement;
    const value = root.style.getPropertyValue('--font-mono');
    expect(value).toBe("'JetBrains Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace");
  });

  it('works with the default font SF Mono', () => {
    applyFont('SF Mono');
    const root = document.documentElement;
    const value = root.style.getPropertyValue('--font-mono');
    expect(value).toBe("'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace");
  });

  it('handles an unknown font name gracefully', () => {
    applyFont('Nonexistent Font');
    const root = document.documentElement;
    const value = root.style.getPropertyValue('--font-mono');
    expect(value).toBe("'Nonexistent Font', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace");
  });

  it('handles empty string font name', () => {
    applyFont('');
    const root = document.documentElement;
    const value = root.style.getPropertyValue('--font-mono');
    expect(value).toBe("'', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace");
  });

  it('returns void', () => {
    const result = applyFont('Fira Code');
    expect(result).toBeUndefined();
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
    expect(document.documentElement.style.getPropertyValue('--bg-1')).toBe('hsl(240, 14%, 14%)');
  });
});

// =============================================================================
// createTabBar (tested via renderFocusMode)
// =============================================================================
describe('createTabBar (site-aware)', () => {
  afterEach(() => {
    removeFocusMode();
  });

  it('renders tabs from config.tabs', () => {
    const config = makeConfig({
      tabs: [
        { label: 'Home', shortcut: 'gh', type: 'home', path: '/' },
        { label: 'Subs', shortcut: 'gs', type: 'subscriptions', path: '/feed/subscriptions' },
      ],
    });
    renderFocusMode(config, makeState());
    const tabs = document.querySelectorAll('.vilify-tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toContain('gh');
    expect(tabs[0].textContent).toContain('Home');
    expect(tabs[1].textContent).toContain('gs');
    expect(tabs[1].textContent).toContain('Subs');
  });

  it('renders no tabs when config.tabs is empty', () => {
    const config = makeConfig({ tabs: [] });
    renderFocusMode(config, makeState());
    const tabs = document.querySelectorAll('.vilify-tab');
    expect(tabs.length).toBe(0);
  });

  it('renders no tabs when config.tabs is undefined', () => {
    const config = makeConfig();
    // no tabs property
    renderFocusMode(config, makeState());
    const tabs = document.querySelectorAll('.vilify-tab');
    expect(tabs.length).toBe(0);
  });

  it('marks the active tab based on pageType matching tab.type', () => {
    const config = makeConfig({
      getPageType: () => 'subscriptions',
      tabs: [
        { label: 'Home', shortcut: 'gh', type: 'home', path: '/' },
        { label: 'Subs', shortcut: 'gs', type: 'subscriptions', path: '/feed/subscriptions' },
      ],
    });
    renderFocusMode(config, makeState());
    const tabs = document.querySelectorAll('.vilify-tab');
    expect(tabs[0].classList.contains('active')).toBe(false);
    expect(tabs[1].classList.contains('active')).toBe(true);
  });

  it('renders list hints on non-watch pages', () => {
    const config = makeConfig({
      getPageType: () => 'home',
      hints: {
        list: [
          { key: 'j', label: '' },
          { key: 'k', label: 'move' },
        ],
      },
    });
    renderFocusMode(config, makeState());
    const right = document.querySelector('.vilify-tab-bar-right');
    expect(right).not.toBeNull();
    const kbds = right!.querySelectorAll('kbd');
    expect(kbds.length).toBeGreaterThanOrEqual(2);
    expect(kbds[0].textContent).toBe('j');
    expect(kbds[1].textContent).toBe('k');
    expect(right!.textContent).toContain('move');
  });

  it('renders detail hints on watch pages', () => {
    const config = makeConfig({
      getPageType: () => 'watch',
      hints: {
        detail: [
          { key: 'zp', label: 'chapters' },
          { key: 't', label: 'transcript' },
        ],
      },
    });
    renderFocusMode(config, makeState());
    const right = document.querySelector('.vilify-tab-bar-right');
    expect(right).not.toBeNull();
    const kbds = right!.querySelectorAll('kbd');
    expect(kbds.length).toBeGreaterThanOrEqual(2);
    expect(kbds[0].textContent).toBe('zp');
    expect(kbds[1].textContent).toBe('t');
    expect(right!.textContent).toContain('chapters');
    expect(right!.textContent).toContain('transcript');
  });

  it('renders no hints when config.hints is undefined', () => {
    const config = makeConfig({ getPageType: () => 'home' });
    renderFocusMode(config, makeState());
    const right = document.querySelector('.vilify-tab-bar-right');
    expect(right).not.toBeNull();
    // Should have no kbd elements (except possibly settings gear)
    const kbds = right!.querySelectorAll('kbd');
    expect(kbds.length).toBe(0);
  });

  it('renders settings gear in tab bar', () => {
    const config = makeConfig();
    renderFocusMode(config, makeState());
    const gear = document.querySelector('.vilify-settings-btn');
    expect(gear).not.toBeNull();
    expect(gear!.textContent).toContain('\u2699');
  });

  it('Google-style tabs render correctly', () => {
    const config = makeConfig({
      getPageType: () => 'search',
      tabs: [
        { label: 'Web', shortcut: 'go', type: 'search', path: '/search' },
        { label: 'Images', shortcut: 'gi', type: 'images', path: '/search' },
      ],
      hints: {
        list: [
          { key: 'j', label: '' },
          { key: 'k', label: 'move' },
          { key: 'yy', label: 'copy' },
        ],
      },
    });
    renderFocusMode(config, makeState());
    const tabs = document.querySelectorAll('.vilify-tab');
    expect(tabs.length).toBe(2);
    // 'search' type should be active since pageType is 'search'
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(tabs[1].classList.contains('active')).toBe(false);
    // Hints should show Google-specific hints
    const right = document.querySelector('.vilify-tab-bar-right');
    expect(right!.textContent).toContain('copy');
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

  it('shows position/count for positive number', () => {
    updateItemCount(42);
    const el = document.getElementById('vilify-status-position');
    expect(el?.textContent).toBe('1/42');
  });

  it('shows empty for zero', () => {
    updateItemCount(0);
    const el = document.getElementById('vilify-status-position');
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

// =============================================================================
// contrastText
// =============================================================================

describe('contrastText', () => {
  // Hex input tests (backward compatibility)
  it('returns dark text for light hex color (white)', () => {
    expect(contrastText('#FFFFFF')).toBe('hsl(0, 0%, 0%)');
  });

  it('returns light text for dark hex color (black)', () => {
    expect(contrastText('#000000')).toBe('hsl(0, 0%, 100%)');
  });

  it('returns light text for dark hex (Kanagawa bg)', () => {
    expect(contrastText('#1F1F28')).toBe('hsl(0, 0%, 100%)');
  });

  it('returns dark text for bright hex (yellow-green)', () => {
    expect(contrastText('#FFFF00')).toBe('hsl(0, 0%, 0%)');
  });

  // HSL input tests
  it('returns dark text for high lightness hsl (white)', () => {
    expect(contrastText('hsl(0, 0%, 100%)')).toBe('hsl(0, 0%, 0%)');
  });

  it('returns light text for low lightness hsl (black)', () => {
    expect(contrastText('hsl(0, 0%, 0%)')).toBe('hsl(0, 0%, 100%)');
  });

  it('returns light text for dark hsl (Kanagawa bg)', () => {
    expect(contrastText('hsl(240, 14%, 14%)')).toBe('hsl(0, 0%, 100%)');
  });

  it('returns dark text for warm hsl at 60% lightness (perceptually bright)', () => {
    expect(contrastText('hsl(50, 36%, 60%)')).toBe('hsl(0, 0%, 0%)');
  });

  it('returns dark text for warm hsl at 59% lightness (YIQ still bright)', () => {
    // Warm amber at 59% converts to high YIQ brightness via HSL→RGB→YIQ
    expect(contrastText('hsl(50, 36%, 59%)')).toBe('hsl(0, 0%, 0%)');
  });

  it('returns dark text for high lightness hsl (Kanagawa txt-1)', () => {
    expect(contrastText('hsl(50, 36%, 77%)')).toBe('hsl(0, 0%, 0%)');
  });

  it('returns light text for Kanagawa mode-normal hsl (blue at 49%)', () => {
    // Blue at 49% lightness is perceptually dark despite medium L
    expect(contrastText('hsl(205, 69%, 49%)')).toBe('hsl(0, 0%, 100%)');
  });

  it('returns dark text for kanagawa modeSearch (green at 58%)', () => {
    // Green at 58% is perceptually bright — needs dark text
    expect(contrastText('hsl(93, 34%, 58%)')).toBe('hsl(0, 0%, 0%)');
  });

  it('returns dark text for gruvbox modeCommand (yellow-green at 44%)', () => {
    // Yellow-green is perceptually bright even at medium lightness
    expect(contrastText('hsl(62, 66%, 44%)')).toBe('hsl(0, 0%, 0%)');
  });
});
