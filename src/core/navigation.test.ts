// Tests for setupNavigationObserver — SPA URL change detection
// Derive test cases from: onNavigate callback types, return type, cleanup behavior

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mocks ---
let mutationCallback: (() => void) | null = null;
let popstateHandler: (() => void) | null = null;

const mockObserverInstance = {
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => []),
};

const MockMutationObserver = vi.fn((cb: MutationCallback) => {
  mutationCallback = cb as unknown as () => void;
  return mockObserverInstance;
});

vi.stubGlobal('MutationObserver', MockMutationObserver);

const addEventListener = vi.fn((event: string, handler: () => void) => {
  if (event === 'popstate') popstateHandler = handler;
});
const removeEventListener = vi.fn();

vi.stubGlobal('window', {
  addEventListener,
  removeEventListener,
});

let currentHref = 'https://www.youtube.com/';
vi.stubGlobal('location', {
  get href() { return currentHref; },
  set href(v: string) { currentHref = v; },
});

vi.stubGlobal('document', {
  body: {
    classList: { add: vi.fn(), remove: vi.fn() },
  },
});

vi.stubGlobal('setTimeout', vi.fn((fn: () => void) => fn()));

beforeEach(() => {
  currentHref = 'https://www.youtube.com/';
  mutationCallback = null;
  popstateHandler = null;
  vi.clearAllMocks();
});

describe('setupNavigationObserver', () => {
  // =========================================================================
  // Return type — returns a MutationObserver with disconnect
  // =========================================================================

  it('returns an object with a disconnect method', async () => {
    const { setupNavigationObserver } = await import('./navigation');
    const observer = setupNavigationObserver(vi.fn());
    expect(observer).toBeDefined();
    expect(typeof observer.disconnect).toBe('function');
  });

  // =========================================================================
  // Observes document.body for childList + subtree mutations
  // =========================================================================

  it('observes document.body with childList and subtree', async () => {
    const { setupNavigationObserver } = await import('./navigation');
    setupNavigationObserver(vi.fn());
    expect(mockObserverInstance.observe).toHaveBeenCalledWith(document.body, {
      childList: true,
      subtree: true,
    });
  });

  // =========================================================================
  // Listens for popstate events
  // =========================================================================

  it('adds a popstate event listener', async () => {
    const { setupNavigationObserver } = await import('./navigation');
    setupNavigationObserver(vi.fn());
    expect(addEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
  });

  // =========================================================================
  // Calls onNavigate with old and new URL on URL change via mutation
  // =========================================================================

  it('calls onNavigate when URL changes during mutation', async () => {
    const { setupNavigationObserver } = await import('./navigation');
    const onNavigate = vi.fn();
    setupNavigationObserver(onNavigate);

    // Simulate URL change + mutation
    const oldUrl = currentHref;
    currentHref = 'https://www.youtube.com/watch?v=abc';
    mutationCallback?.();

    expect(onNavigate).toHaveBeenCalledWith(oldUrl, 'https://www.youtube.com/watch?v=abc');
  });

  // =========================================================================
  // Does NOT call onNavigate when URL hasn't changed
  // =========================================================================

  it('does not call onNavigate when URL has not changed', async () => {
    const { setupNavigationObserver } = await import('./navigation');
    const onNavigate = vi.fn();
    setupNavigationObserver(onNavigate);

    // Trigger mutation without URL change
    mutationCallback?.();

    expect(onNavigate).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Calls onNavigate on popstate when URL changes (back/forward)
  // =========================================================================

  it('calls onNavigate on popstate when URL changes', async () => {
    const { setupNavigationObserver } = await import('./navigation');
    const onNavigate = vi.fn();
    setupNavigationObserver(onNavigate);

    const oldUrl = currentHref;
    currentHref = 'https://www.youtube.com/results?search_query=test';
    popstateHandler?.();

    expect(onNavigate).toHaveBeenCalledWith(oldUrl, 'https://www.youtube.com/results?search_query=test');
  });

  // =========================================================================
  // Disconnect cleans up observer + popstate listener
  // =========================================================================

  it('disconnect removes popstate listener', async () => {
    const { setupNavigationObserver } = await import('./navigation');
    const observer = setupNavigationObserver(vi.fn());
    observer.disconnect();

    expect(removeEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
  });
});
