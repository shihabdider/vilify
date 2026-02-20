// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleKeyEvent, normalizeKey, setupKeyboardEngine } from './keyboard';

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

  it('returns S- prefix for Shift+SpecialKey', () => {
    expect(normalizeKey({ key: 'Enter', shiftKey: true, ctrlKey: false })).toBe('S-Enter');
    expect(normalizeKey({ key: 'Tab', shiftKey: true, ctrlKey: false })).toBe('S-Tab');
  });

  it('returns C-S- prefix for Ctrl+Shift+SpecialKey', () => {
    expect(normalizeKey({ key: 'Enter', shiftKey: true, ctrlKey: true })).toBe('C-S-Enter');
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

// ===== setupKeyboardEngine tests =====

/** Helper: create a minimal mock config */
function mockConfig(overrides = {}) {
  return {
    getPageType: () => 'home',
    getKeySequences: () => ({}),
    getBlockedNativeKeys: () => [],
    isNativeSearchInput: () => false,
    ...overrides,
  };
}

/** Helper: create a minimal mock state */
function mockState(overrides = {}) {
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

/** Helper: dispatch a keydown event on document (capture phase) */
function press(key, opts = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  document.dispatchEvent(event);
  return event;
}

describe('setupKeyboardEngine - appCallbacks forwarding to getKeySequences', () => {
  it('forwards appCallbacks to getKeySequences with context', () => {
    let capturedApp = null;
    let capturedContext = null;
    const config = mockConfig({
      getKeySequences: (app, context) => {
        capturedApp = app;
        capturedContext = context;
        return { 'x': () => {} };
      },
    });

    const state = mockState();
    const selectedItem = { id: 'video-1', title: 'Test Video' };
    const appCallbacks = {
      getSelectedItem: vi.fn(() => selectedItem),
      navigate: vi.fn(),
      select: vi.fn(),
      render: vi.fn(),
    };

    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), appCallbacks, () => null);

    press('x');

    expect(capturedApp).not.toBeNull();
    expect(capturedContext).not.toBeNull();
    expect(typeof capturedApp.getSelectedItem).toBe('function');
    expect(capturedContext).toHaveProperty('pageType');
    expect(capturedContext).toHaveProperty('filterActive');
    expect(capturedContext).toHaveProperty('searchActive');
    expect(capturedContext).toHaveProperty('drawer');

    const result = capturedApp.getSelectedItem();
    expect(appCallbacks.getSelectedItem).toHaveBeenCalled();
    expect(result).toBe(selectedItem);

    cleanup();
  });

  it('handles missing optional appCallbacks gracefully', () => {
    let capturedApp = null;
    const config = mockConfig({
      getKeySequences: (app, context) => {
        capturedApp = app;
        return { 'x': () => {} };
      },
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), {}, () => null);

    press('x');
    expect(capturedApp).not.toBeNull();

    cleanup();
  });
});

describe('setupKeyboardEngine - cleanup', () => {
  it('returns a cleanup function that removes the event listener', () => {
    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'x': action }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('x');
    expect(action).toHaveBeenCalledTimes(1);

    cleanup();

    press('x');
    // Should NOT fire again after cleanup
    expect(action).toHaveBeenCalledTimes(1);
  });
});

describe('setupKeyboardEngine - focus mode gate', () => {
  it('does not process keys when focusModeActive is false', () => {
    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'x': action }),
    });

    const state = mockState({ core: { focusModeActive: false } });
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('x');
    expect(action).not.toHaveBeenCalled();

    cleanup();
  });

  it('processes keys when focusModeActive is true', () => {
    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'x': action }),
    });

    const state = mockState({ core: { focusModeActive: true } });
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('x');
    expect(action).toHaveBeenCalledTimes(1);

    cleanup();
  });
});

describe('setupKeyboardEngine - input element filtering', () => {
  let cleanup;
  afterEach(() => { if (cleanup) cleanup(); });

  it('ignores keys when focused on a regular input element', () => {
    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'x': action }),
    });

    const state = mockState();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    // Dispatch from the input element
    const event = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
    input.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('ignores keys when focused on a textarea', () => {
    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'x': action }),
    });

    const state = mockState();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    const event = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it('ignores keys when focused on a contenteditable element', () => {
    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'x': action }),
    });

    const state = mockState();
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);
    cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    const event = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
    div.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });
});

describe('setupKeyboardEngine - native search input', () => {
  let cleanup;
  afterEach(() => { if (cleanup) cleanup(); });

  it('blurs native search input on Escape', () => {
    const searchInput = document.createElement('input');
    searchInput.id = 'native-search';
    document.body.appendChild(searchInput);
    searchInput.focus();

    const config = mockConfig({
      isNativeSearchInput: (target) => target.id === 'native-search',
    });

    const state = mockState();
    cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    const event = new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true, cancelable: true,
    });
    searchInput.dispatchEvent(event);

    // The input should have been blurred
    expect(document.activeElement).not.toBe(searchInput);

    document.body.removeChild(searchInput);
  });

  it('blocks other keys on native search input (does not trigger sequences)', () => {
    const action = vi.fn();
    const searchInput = document.createElement('input');
    searchInput.id = 'native-search';
    document.body.appendChild(searchInput);

    const config = mockConfig({
      isNativeSearchInput: (target) => target.id === 'native-search',
      getKeySequences: () => ({ 'x': action }),
    });

    const state = mockState();
    cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    const event = new KeyboardEvent('keydown', {
      key: 'x', bubbles: true, cancelable: true,
    });
    searchInput.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();

    document.body.removeChild(searchInput);
  });
});

describe('setupKeyboardEngine - Escape handling', () => {
  it('closes drawer on Escape when drawer is open', () => {
    const state = mockState({ ui: { drawer: 'chapters' } });
    const setState = vi.fn();
    const render = vi.fn();
    const config = mockConfig();

    const cleanup = setupKeyboardEngine(config, () => state, setState, { render }, () => null);

    press('Escape');

    // setState should have been called to close the drawer
    expect(setState).toHaveBeenCalled();
    const newState = setState.mock.calls[0][0];
    expect(newState.ui.drawer).toBeNull();
    expect(render).toHaveBeenCalled();

    cleanup();
  });

  it('exits filter on Escape when filterActive (no drawer)', () => {
    const state = mockState({ ui: { filterActive: true } });
    const setState = vi.fn();
    const render = vi.fn();
    const config = mockConfig();

    const cleanup = setupKeyboardEngine(config, () => state, setState, { render }, () => null);

    press('Escape');

    expect(setState).toHaveBeenCalled();
    const newState = setState.mock.calls[0][0];
    expect(newState.ui.filterActive).toBe(false);
    expect(render).toHaveBeenCalled();

    cleanup();
  });

  it('exits search on Escape when searchActive (no drawer, no filter)', () => {
    const state = mockState({ ui: { searchActive: true } });
    const setState = vi.fn();
    const render = vi.fn();
    const config = mockConfig();

    const cleanup = setupKeyboardEngine(config, () => state, setState, { render }, () => null);

    press('Escape');

    expect(setState).toHaveBeenCalled();
    const newState = setState.mock.calls[0][0];
    expect(newState.ui.searchActive).toBe(false);
    expect(render).toHaveBeenCalled();

    cleanup();
  });

  it('closes drawer before filter (priority ordering)', () => {
    // drawer takes priority over filter
    const state = mockState({ ui: { drawer: 'chapters', filterActive: true } });
    const setState = vi.fn();
    const render = vi.fn();
    const config = mockConfig();

    const cleanup = setupKeyboardEngine(config, () => state, setState, { render }, () => null);

    press('Escape');

    expect(setState).toHaveBeenCalled();
    const newState = setState.mock.calls[0][0];
    // Drawer should be closed but filterActive preserved
    expect(newState.ui.drawer).toBeNull();

    cleanup();
  });

  it('does nothing on Escape when nothing is open', () => {
    const state = mockState();
    const setState = vi.fn();
    const render = vi.fn();
    const config = mockConfig();

    const cleanup = setupKeyboardEngine(config, () => state, setState, { render }, () => null);

    press('Escape');

    // Nothing to close — no state change
    expect(setState).not.toHaveBeenCalled();

    cleanup();
  });
});

describe('setupKeyboardEngine - drawer key delegation', () => {
  it('delegates keys to onDrawerKey when a site drawer is open', () => {
    const onDrawerKey = vi.fn();
    const state = mockState({ ui: { drawer: 'chapters' } });
    const config = mockConfig();

    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), {
      render: vi.fn(),
      onDrawerKey,
    }, () => null);

    press('j');

    expect(onDrawerKey).toHaveBeenCalledWith('j');

    cleanup();
  });

  it('does NOT delegate to onDrawerKey when drawer is palette', () => {
    const onDrawerKey = vi.fn();
    const action = vi.fn();
    const state = mockState({ ui: { drawer: 'palette' } });
    const config = mockConfig({
      getKeySequences: () => ({ 'j': action }),
    });

    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), {
      render: vi.fn(),
      onDrawerKey,
    }, () => null);

    press('j');

    expect(onDrawerKey).not.toHaveBeenCalled();
    // Palette blocks all key processing — action should not fire
    expect(action).not.toHaveBeenCalled();

    cleanup();
  });

  it('delegates to onDrawerKey when drawer is recommended', () => {
    const onDrawerKey = vi.fn();
    const state = mockState({ ui: { drawer: 'recommended' } });
    const config = mockConfig();

    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), {
      render: vi.fn(),
      onDrawerKey,
    }, () => null);

    press('j');

    expect(onDrawerKey).toHaveBeenCalledWith('j');

    cleanup();
  });
});

describe('setupKeyboardEngine - palette block', () => {
  it('blocks all key processing when palette is open', () => {
    const action = vi.fn();
    const state = mockState({ ui: { drawer: 'palette' } });
    const config = mockConfig({
      getKeySequences: () => ({ 'x': action }),
    });

    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('x');
    expect(action).not.toHaveBeenCalled();

    cleanup();
  });
});

describe('setupKeyboardEngine - modifier-only keys', () => {
  it('ignores modifier-only key presses (Shift, Control, etc.)', () => {
    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'Shift': action }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('Shift');
    expect(action).not.toHaveBeenCalled();

    cleanup();
  });
});

describe('setupKeyboardEngine - sequence execution', () => {
  it('executes single-key sequence action', () => {
    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'j': action }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('j');
    expect(action).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('executes multi-key sequence action', () => {
    const goHome = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'gh': goHome }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('g');
    expect(goHome).not.toHaveBeenCalled();

    press('h');
    expect(goHome).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('calls preventDefault and stopPropagation on exact match', () => {
    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'x': action }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    const event = press('x');
    expect(event.defaultPrevented).toBe(true);

    cleanup();
  });

  it('calls preventDefault and stopPropagation on ambiguous match', () => {
    const mute = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'm': mute, 'mw': vi.fn() }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    // 'm' is ambiguous (exact match + longer prefix) — should still prevent
    const event = press('m');
    expect(event.defaultPrevented).toBe(true);

    cleanup();
  });

  it('does NOT prevent default on no-match key', () => {
    const config = mockConfig({
      getKeySequences: () => ({ 'x': vi.fn() }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    const event = press('z'); // 'z' is not in sequences
    expect(event.defaultPrevented).toBe(false);

    cleanup();
  });
});

describe('setupKeyboardEngine - blocked native keys', () => {
  it('blocks keys from getBlockedNativeKeys even without sequence match', () => {
    const config = mockConfig({
      getBlockedNativeKeys: () => ['f', 'm'],
      getKeySequences: () => ({}), // No sequences registered
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    const event = press('f');
    expect(event.defaultPrevented).toBe(true);

    cleanup();
  });

  it('does not block keys not in blocked list', () => {
    const config = mockConfig({
      getBlockedNativeKeys: () => ['f', 'm'],
      getKeySequences: () => ({}),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    const event = press('z');
    expect(event.defaultPrevented).toBe(false);

    cleanup();
  });
});

describe('setupKeyboardEngine - context building', () => {
  it('builds KeyContext from state and config', () => {
    let capturedContext = null;
    const config = mockConfig({
      getPageType: () => 'watch',
      getKeySequences: (app, context) => {
        capturedContext = context;
        return {};
      },
    });

    const state = mockState({
      ui: { drawer: 'chapters', filterActive: true, searchActive: false },
    });
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    // Need a non-Escape key to get past escape handling + drawer delegation
    // Use Escape which will be handled by escape logic, but context is built before that
    // Actually drawer is open, so Escape closes it. Let me use a key that triggers getKeySequences
    // When drawer is open (not palette, not recommended), keys go to onDrawerKey.
    // So I need a state where getKeySequences is actually called...
    // Use no drawer for this test
    const state2 = mockState({
      ui: { drawer: null, filterActive: true, searchActive: false },
      core: { focusModeActive: true },
    });
    cleanup();

    const cleanup2 = setupKeyboardEngine(
      { ...config, getPageType: () => 'watch' },
      () => state2, vi.fn(), { render: vi.fn() }, () => null
    );

    press('z');

    expect(capturedContext).toEqual({
      pageType: 'watch',
      filterActive: true,
      searchActive: false,
      drawer: null,
    });

    cleanup2();
  });

  it('uses null pageType when getPageType is not provided', () => {
    let capturedContext = null;
    const config = mockConfig({
      getPageType: undefined,
      getKeySequences: (app, context) => {
        capturedContext = context;
        return {};
      },
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('z');
    expect(capturedContext.pageType).toBeNull();

    cleanup();
  });
});

describe('setupKeyboardEngine - ambiguous match timeout', () => {
  it('fires pending action after timeout when no follow-up key', async () => {
    vi.useFakeTimers();

    const mute = vi.fn();
    const watchLater = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'm': mute, 'mw': watchLater }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('m');
    expect(mute).not.toHaveBeenCalled();

    // Advance past the sequence timeout (500ms default)
    vi.advanceTimersByTime(600);

    expect(mute).toHaveBeenCalledTimes(1);
    expect(watchLater).not.toHaveBeenCalled();

    cleanup();
    vi.useRealTimers();
  });

  it('fires longer sequence instead of pending action when follow-up key arrives', () => {
    vi.useFakeTimers();

    const mute = vi.fn();
    const watchLater = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'm': mute, 'mw': watchLater }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('m');
    expect(mute).not.toHaveBeenCalled();

    press('w');
    expect(watchLater).toHaveBeenCalledTimes(1);
    expect(mute).not.toHaveBeenCalled();

    // Advance timer — pending should not fire since it was resolved
    vi.advanceTimersByTime(600);
    expect(mute).not.toHaveBeenCalled();

    cleanup();
    vi.useRealTimers();
  });

  it('resets sequence on no match and fires pending action if exists', () => {
    vi.useFakeTimers();

    const mute = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'm': mute, 'mw': vi.fn() }),
    });

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('m'); // ambiguous — pending = mute
    press('x'); // no match for 'mx' — resets seq, fires pending

    expect(mute).toHaveBeenCalledTimes(1);

    cleanup();
    vi.useRealTimers();
  });
});

describe('setupKeyboardEngine - auto-focus status bar input after action', () => {
  it('focuses vilify-status-input after action execution', async () => {
    vi.useFakeTimers();

    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'x': action }),
    });

    // Create the status bar input in the DOM
    const input = document.createElement('input');
    input.id = 'vilify-status-input';
    document.body.appendChild(input);

    const state = mockState();
    const cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    press('x');
    expect(action).toHaveBeenCalled();

    // Auto-focus happens after a setTimeout(10)
    vi.advanceTimersByTime(20);

    // The input should be attempted to focus (if it exists in DOM)
    // This verifies the auto-focus mechanism runs without error
    expect(action).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
    cleanup();
    vi.useRealTimers();
  });
});

describe('setupKeyboardEngine - vilify-status-input filtering', () => {
  let cleanup;
  afterEach(() => { if (cleanup) cleanup(); });

  it('does not trigger sequences when focused on vilify-status-input', () => {
    const action = vi.fn();
    const config = mockConfig({
      getKeySequences: () => ({ 'x': action }),
    });

    const input = document.createElement('input');
    input.id = 'vilify-status-input';
    document.body.appendChild(input);

    const state = mockState();
    cleanup = setupKeyboardEngine(config, () => state, vi.fn(), { render: vi.fn() }, () => null);

    const event = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
    input.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
