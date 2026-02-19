// @vitest-environment jsdom
// Tests for :help command integration
// Tests that the keyboard guard in core/keyboard.ts blocks keys when help is open

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// 1. Keyboard guard: isHelpOpen blocks keys
// =============================================================================

// Mock help-window for keyboard tests
vi.mock('./help-window', () => ({
  isHelpOpen: vi.fn(() => false),
}));

vi.mock('./settings-window', () => ({
  isSettingsOpen: vi.fn(() => false),
}));

vi.mock('./view', () => ({
  isInputElement: vi.fn((el) => {
    const tag = el.tagName?.toLowerCase?.();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable;
  }),
  showMessage: vi.fn(),
}));

vi.mock('./layout', () => ({
  removeFocusMode: vi.fn(),
}));

import { setupKeyboardEngine } from './keyboard';
import { isHelpOpen } from './help-window';
import { isSettingsOpen } from './settings-window';

function mockConfig(overrides = {}) {
  return {
    getPageType: () => 'home',
    getKeySequences: () => ({}),
    getBlockedNativeKeys: () => [],
    isNativeSearchInput: () => false,
    ...overrides,
  };
}

function mockState(overrides: any = {}) {
  const base = {
    ui: { drawer: null, searchActive: false, filterActive: false, selectedIdx: 0 },
    core: { focusModeActive: true },
  };
  return {
    ...base,
    ui: { ...base.ui, ...(overrides.ui || {}) },
    core: { ...base.core, ...(overrides.core || {}) },
  };
}

function press(key: string, opts = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  document.dispatchEvent(event);
  return event;
}

describe('setupKeyboardEngine - help window guard', () => {
  afterEach(() => {
    vi.mocked(isHelpOpen).mockReturnValue(false);
    vi.mocked(isSettingsOpen).mockReturnValue(false);
  });

  it('blocks all key processing when help window is open', () => {
    vi.mocked(isHelpOpen).mockReturnValue(true);

    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'x': action }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('x');
    expect(action).not.toHaveBeenCalled();

    cleanup();
  });

  it('allows key processing when help window is closed', () => {
    vi.mocked(isHelpOpen).mockReturnValue(false);

    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'x': action }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('x');
    expect(action).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('blocks keys when either settings or help is open', () => {
    vi.mocked(isSettingsOpen).mockReturnValue(false);
    vi.mocked(isHelpOpen).mockReturnValue(true);

    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'j': action }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('j');
    expect(action).not.toHaveBeenCalled();

    cleanup();
  });
});
