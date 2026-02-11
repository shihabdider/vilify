// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { handleKeyEvent, setupKeyboardHandler } from './keyboard.js';

// Helper to create a minimal KeyboardEvent-like object
function keyEvent(key) {
  return { key, preventDefault: vi.fn(), stopPropagation: vi.fn() };
}

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
    const result = handleKeyEvent(keyEvent('m'), '', sequences, 500);
    expect(result.action).toBeNull();
    expect(result.pendingAction).toBe(mute);
    expect(result.newSeq).toBe('m');
    expect(result.shouldPrevent).toBe(true);
  });

  it('returns action for unambiguous exact match (mw has no longer prefix)', () => {
    const result = handleKeyEvent(keyEvent('w'), 'm', sequences, 500);
    expect(result.action).toBe(watchLater);
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('');
    expect(result.shouldPrevent).toBe(true);
  });

  it('returns action for unambiguous exact match (ms)', () => {
    const result = handleKeyEvent(keyEvent('s'), 'm', sequences, 500);
    expect(result.action).toBe(subscribe);
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('');
  });

  it('keeps building sequence for prefix with no exact match (g)', () => {
    const result = handleKeyEvent(keyEvent('g'), '', sequences, 500);
    expect(result.action).toBeNull();
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('g');
    expect(result.shouldPrevent).toBe(false);
  });

  it('resets on no match (mx)', () => {
    const result = handleKeyEvent(keyEvent('x'), 'm', sequences, 500);
    expect(result.action).toBeNull();
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('');
    expect(result.shouldPrevent).toBe(false);
  });

  it('ignores modifier keys', () => {
    const result = handleKeyEvent(keyEvent('Shift'), 'g', sequences, 500);
    expect(result.action).toBeNull();
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('g');
  });

  it('fires gh immediately (no longer prefix)', () => {
    const result = handleKeyEvent(keyEvent('h'), 'g', sequences, 500);
    expect(result.action).toBe(goHome);
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('');
  });
});

describe('setupKeyboardHandler - getSelectedItem forwarding', () => {
  it('forwards getSelectedItem through appCallbacks to getKeySequences', () => {
    // Capture the appCallbacks object passed to getKeySequences
    let capturedApp = null;
    const mockConfig = {
      getKeySequences: (app) => {
        capturedApp = app;
        return { 'x': () => {} };
      },
    };

    const mockState = {
      ui: { drawer: null, searchActive: false, filterActive: false, selectedIdx: 0 },
      core: { focusModeActive: true },
    };
    const getState = () => mockState;
    const setState = vi.fn();

    const selectedItem = { id: 'video-1', title: 'Test Video' };
    const getSelectedItem = vi.fn(() => selectedItem);

    const cleanup = setupKeyboardHandler(mockConfig, getState, setState, {
      getSelectedItem,
    });

    // Trigger a keydown event so the handler runs and builds appCallbacks
    // Use 'x' which won't match any early-return navigation keys
    const event = new KeyboardEvent('keydown', { key: 'x', bubbles: true });
    document.dispatchEvent(event);

    // getKeySequences should have been called with appCallbacks containing getSelectedItem
    expect(capturedApp).not.toBeNull();
    expect(typeof capturedApp.getSelectedItem).toBe('function');

    // Calling appCallbacks.getSelectedItem should delegate to our callback
    const result = capturedApp.getSelectedItem();
    expect(getSelectedItem).toHaveBeenCalled();
    expect(result).toBe(selectedItem);

    cleanup();
  });

  it('handles missing getSelectedItem callback gracefully', () => {
    let capturedApp = null;
    const mockConfig = {
      getKeySequences: (app) => {
        capturedApp = app;
        return { 'x': () => {} };
      },
    };

    const mockState = {
      ui: { drawer: null, searchActive: false, filterActive: false, selectedIdx: 0 },
      core: { focusModeActive: true },
    };
    const getState = () => mockState;
    const setState = vi.fn();

    // No getSelectedItem in callbacks
    const cleanup = setupKeyboardHandler(mockConfig, getState, setState, {});

    const event = new KeyboardEvent('keydown', { key: 'x', bubbles: true });
    document.dispatchEvent(event);

    expect(capturedApp).not.toBeNull();
    // Should return undefined (optional chaining), not throw
    expect(capturedApp.getSelectedItem()).toBeUndefined();

    cleanup();
  });
});
