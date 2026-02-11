// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { handleKeyEvent, normalizeKey, setupKeyboardEngine } from './keyboard.js';

describe('normalizeKey', () => {
  it('returns key as-is for regular key', () => {
    expect(normalizeKey({ key: 'a', ctrlKey: false })).toBe('a');
  });

  it('returns uppercase key for Shift+key (browser gives uppercase)', () => {
    expect(normalizeKey({ key: 'G', shiftKey: true, ctrlKey: false })).toBe('G');
  });

  it('returns C- prefix for Ctrl+key', () => {
    expect(normalizeKey({ key: 'f', ctrlKey: true })).toBe('C-f');
  });

  it('returns null for Shift modifier-only', () => {
    expect(normalizeKey({ key: 'Shift' })).toBeNull();
  });

  it('returns null for Control modifier-only', () => {
    expect(normalizeKey({ key: 'Control' })).toBeNull();
  });

  it('returns null for Alt modifier-only', () => {
    expect(normalizeKey({ key: 'Alt' })).toBeNull();
  });

  it('returns null for Meta modifier-only', () => {
    expect(normalizeKey({ key: 'Meta' })).toBeNull();
  });

  it('returns special keys as-is (Enter, Escape, etc.)', () => {
    expect(normalizeKey({ key: 'Enter', ctrlKey: false })).toBe('Enter');
    expect(normalizeKey({ key: 'Escape', ctrlKey: false })).toBe('Escape');
  });
});

describe('handleKeyEvent - prefix disambiguation', () => {
  const mute = vi.fn();
  const watchLater = vi.fn();
  const subscribe = vi.fn();
  const goHome = vi.fn();
  const goSubs = vi.fn();

  const sequences = {
    'm': mute,
    'mw': watchLater,
    'ms': subscribe,
    'gh': goHome,
    'gs': goSubs,
  };

  it('returns pendingAction for ambiguous exact match (m has longer prefixes)', () => {
    const result = handleKeyEvent('m', '', sequences, 500);
    expect(result.action).toBeNull();
    expect(result.pendingAction).toBe(mute);
    expect(result.newSeq).toBe('m');
    expect(result.shouldPrevent).toBe(true);
  });

  it('returns action for unambiguous exact match (mw has no longer prefix)', () => {
    const result = handleKeyEvent('w', 'm', sequences, 500);
    expect(result.action).toBe(watchLater);
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('');
    expect(result.shouldPrevent).toBe(true);
  });

  it('returns action for unambiguous exact match (ms)', () => {
    const result = handleKeyEvent('s', 'm', sequences, 500);
    expect(result.action).toBe(subscribe);
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('');
  });

  it('keeps building sequence for prefix with no exact match (g)', () => {
    const result = handleKeyEvent('g', '', sequences, 500);
    expect(result.action).toBeNull();
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('g');
    expect(result.shouldPrevent).toBe(false);
  });

  it('resets on no match (mx)', () => {
    const result = handleKeyEvent('x', 'm', sequences, 500);
    expect(result.action).toBeNull();
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('');
    expect(result.shouldPrevent).toBe(false);
  });

  it('fires gh immediately (no longer prefix)', () => {
    const result = handleKeyEvent('h', 'g', sequences, 500);
    expect(result.action).toBe(goHome);
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('');
  });
});

describe('setupKeyboardEngine - appCallbacks forwarding to getKeySequences', () => {
  it('forwards appCallbacks to getKeySequences with context', () => {
    // Capture the (app, context) passed to getKeySequences
    let capturedApp = null;
    let capturedContext = null;
    const mockConfig = {
      getPageType: () => 'home',
      getKeySequences: (app, context) => {
        capturedApp = app;
        capturedContext = context;
        return { 'x': () => {} };
      },
      getBlockedNativeKeys: () => [],
      isNativeSearchInput: () => false,
    };

    const mockState = {
      ui: { drawer: null, searchActive: false, filterActive: false, selectedIdx: 0 },
      core: { focusModeActive: true },
    };
    const getState = () => mockState;
    const setState = vi.fn();

    const selectedItem = { id: 'video-1', title: 'Test Video' };
    const appCallbacks = {
      getSelectedItem: vi.fn(() => selectedItem),
      navigate: vi.fn(),
      select: vi.fn(),
      render: vi.fn(),
    };

    const cleanup = setupKeyboardEngine(mockConfig, getState, setState, appCallbacks, () => null);

    // Trigger a keydown event so the handler runs
    const event = new KeyboardEvent('keydown', { key: 'x', bubbles: true });
    document.dispatchEvent(event);

    // getKeySequences should have been called with appCallbacks and context
    expect(capturedApp).not.toBeNull();
    expect(capturedContext).not.toBeNull();
    expect(typeof capturedApp.getSelectedItem).toBe('function');
    expect(capturedContext).toHaveProperty('pageType');
    expect(capturedContext).toHaveProperty('filterActive');
    expect(capturedContext).toHaveProperty('searchActive');
    expect(capturedContext).toHaveProperty('drawer');

    // Calling appCallbacks.getSelectedItem should delegate to our callback
    const result = capturedApp.getSelectedItem();
    expect(appCallbacks.getSelectedItem).toHaveBeenCalled();
    expect(result).toBe(selectedItem);

    cleanup();
  });

  it('handles missing optional appCallbacks gracefully', () => {
    let capturedApp = null;
    const mockConfig = {
      getPageType: () => 'home',
      getKeySequences: (app, context) => {
        capturedApp = app;
        return { 'x': () => {} };
      },
      getBlockedNativeKeys: () => [],
      isNativeSearchInput: () => false,
    };

    const mockState = {
      ui: { drawer: null, searchActive: false, filterActive: false, selectedIdx: 0 },
      core: { focusModeActive: true },
    };
    const getState = () => mockState;
    const setState = vi.fn();

    // Minimal appCallbacks — no getSelectedItem
    const cleanup = setupKeyboardEngine(mockConfig, getState, setState, {}, () => null);

    const event = new KeyboardEvent('keydown', { key: 'x', bubbles: true });
    document.dispatchEvent(event);

    expect(capturedApp).not.toBeNull();

    cleanup();
  });
});
