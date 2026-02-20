// @vitest-environment jsdom
// Tests for help-window.ts — generic floating help window with keybind reference

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openHelpWindow, closeHelpWindow, isHelpOpen } from './help-window';
import type { HelpSection } from './help-window';

// =============================================================================
// Test data — generic sections (not site-specific)
// =============================================================================

const testSections: HelpSection[] = [
  {
    name: 'Section A',
    keybinds: [
      { keys: ['j'], description: 'Move down' },
      { keys: ['k'], description: 'Move up' },
      { keys: ['gg'], description: 'Go to top' },
    ],
  },
  {
    name: 'Section B',
    keybinds: [
      { keys: ['Enter'], description: 'Open item' },
      { keys: ['/'], description: 'Filter' },
    ],
  },
  {
    name: 'Section C',
    keybinds: [
      { keys: ['Esc'], description: 'Close overlay' },
      { keys: [':q'], description: 'Exit' },
    ],
  },
];

// =============================================================================
// Helpers
// =============================================================================

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

// =============================================================================
// isHelpOpen — initial state
// =============================================================================

describe('isHelpOpen', () => {
  afterEach(() => {
    closeHelpWindow();
  });

  it('returns false initially', () => {
    expect(isHelpOpen()).toBe(false);
  });

  it('returns true after opening', () => {
    openHelpWindow(testSections);
    expect(isHelpOpen()).toBe(true);
  });

  it('returns false after closing', () => {
    openHelpWindow(testSections);
    closeHelpWindow();
    expect(isHelpOpen()).toBe(false);
  });
});

// =============================================================================
// openHelpWindow — DOM creation
// =============================================================================

describe('openHelpWindow', () => {
  afterEach(() => {
    closeHelpWindow();
  });

  it('creates backdrop and window elements in DOM', () => {
    openHelpWindow(testSections);
    expect(document.querySelector('.vilify-help-backdrop')).not.toBeNull();
    expect(document.querySelector('.vilify-help-window')).not.toBeNull();
  });

  it('shows title "Help"', () => {
    openHelpWindow(testSections);
    const title = document.querySelector('.vilify-help-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Help');
  });

  it('has tabs matching provided sections', () => {
    openHelpWindow(testSections);
    const tabs = document.querySelectorAll('.vilify-help-tab');
    expect(tabs.length).toBe(3);
    expect(tabs[0]!.textContent).toBe('Section A');
    expect(tabs[1]!.textContent).toBe('Section B');
    expect(tabs[2]!.textContent).toBe('Section C');
  });

  it('first tab is active by default', () => {
    openHelpWindow(testSections);
    const tabs = document.querySelectorAll('.vilify-help-tab');
    expect(tabs[0]!.classList.contains('active')).toBe(true);
    expect(tabs[1]!.classList.contains('active')).toBe(false);
  });

  it('renders keybind rows with kbd elements', () => {
    openHelpWindow(testSections);
    const kbds = document.querySelectorAll('.vilify-help-list kbd');
    expect(kbds.length).toBeGreaterThan(0);
  });

  it('opening when already open is a no-op', () => {
    openHelpWindow(testSections);
    openHelpWindow(testSections);
    const windows = document.querySelectorAll('.vilify-help-window');
    expect(windows.length).toBe(1);
  });

  it('has a footer with navigation hints', () => {
    openHelpWindow(testSections);
    const footer = document.querySelector('.vilify-help-footer');
    expect(footer).not.toBeNull();
    expect(footer!.textContent).toContain('navigate');
    expect(footer!.textContent).toContain('Esc');
  });
});

// =============================================================================
// closeHelpWindow — DOM cleanup
// =============================================================================

describe('closeHelpWindow', () => {
  it('removes DOM elements', () => {
    openHelpWindow(testSections);
    closeHelpWindow();
    expect(document.querySelector('.vilify-help-backdrop')).toBeNull();
    expect(document.querySelector('.vilify-help-window')).toBeNull();
  });

  it('closing when not open is a no-op', () => {
    // Should not throw
    closeHelpWindow();
    expect(isHelpOpen()).toBe(false);
  });
});

// =============================================================================
// Tab switching
// =============================================================================

describe('Tab switching', () => {
  afterEach(() => {
    closeHelpWindow();
  });

  it('Tab key switches to next section', () => {
    openHelpWindow(testSections);
    const tabs = document.querySelectorAll('.vilify-help-tab');
    expect(tabs[0]!.classList.contains('active')).toBe(true);

    fireKey('Tab');
    const tabsAfter = document.querySelectorAll('.vilify-help-tab');
    expect(tabsAfter[0]!.classList.contains('active')).toBe(false);
    expect(tabsAfter[1]!.classList.contains('active')).toBe(true);
  });

  it('Tab wraps around from last to first section', () => {
    openHelpWindow(testSections);
    fireKey('Tab'); // -> Section B
    fireKey('Tab'); // -> Section C
    fireKey('Tab'); // -> Section A (wrap)
    const tabs = document.querySelectorAll('.vilify-help-tab');
    expect(tabs[0]!.classList.contains('active')).toBe(true);
  });

  it('clicking a tab switches to that section', () => {
    openHelpWindow(testSections);
    const tabs = document.querySelectorAll('.vilify-help-tab');
    (tabs[2] as HTMLElement).click();
    const tabsAfter = document.querySelectorAll('.vilify-help-tab');
    expect(tabsAfter[2]!.classList.contains('active')).toBe(true);
    expect(tabsAfter[0]!.classList.contains('active')).toBe(false);
  });
});

// =============================================================================
// Keyboard navigation
// =============================================================================

describe('Keyboard navigation', () => {
  afterEach(() => {
    closeHelpWindow();
  });

  it('Esc key closes the window', () => {
    openHelpWindow(testSections);
    expect(isHelpOpen()).toBe(true);
    fireKey('Escape');
    expect(isHelpOpen()).toBe(false);
  });

  it('j key moves selection down', () => {
    openHelpWindow(testSections);
    const firstRow = document.querySelector('.vilify-help-item.selected');
    expect(firstRow).not.toBeNull();

    fireKey('j');
    const items = document.querySelectorAll('.vilify-help-item');
    expect(items[0]!.classList.contains('selected')).toBe(false);
    expect(items[1]!.classList.contains('selected')).toBe(true);
  });

  it('k key moves selection up', () => {
    openHelpWindow(testSections);
    fireKey('j'); // move to 1
    fireKey('k'); // move back to 0
    const items = document.querySelectorAll('.vilify-help-item');
    expect(items[0]!.classList.contains('selected')).toBe(true);
  });

  it('g key goes to top', () => {
    openHelpWindow(testSections);
    fireKey('j');
    fireKey('j');
    fireKey('g');
    const items = document.querySelectorAll('.vilify-help-item');
    expect(items[0]!.classList.contains('selected')).toBe(true);
  });

  it('G key goes to bottom', () => {
    openHelpWindow(testSections);
    fireKey('G');
    const items = document.querySelectorAll('.vilify-help-item');
    const last = items[items.length - 1];
    expect(last!.classList.contains('selected')).toBe(true);
  });
});
