// Tests for content.js early loading styles injection
// Verifies injectLoadingStyles is called at module-init time on supported sites,
// and NOT called on unsupported sites.

import { describe, it, expect, vi, beforeEach } from 'vitest';

function setupDomMocks() {
  vi.stubGlobal('document', {
    readyState: 'loading',
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    createElement: vi.fn(() => ({
      style: {},
      setAttribute: vi.fn(),
      appendChild: vi.fn(),
      classList: { add: vi.fn(), contains: vi.fn(() => false) },
    })),
    head: { appendChild: vi.fn() },
    getElementById: vi.fn(() => null),
    addEventListener: vi.fn(),
    documentElement: {
      classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn(() => false) },
      appendChild: vi.fn(),
    },
  });
  vi.stubGlobal('window', { location: {} });
}

describe('content.js early loading styles injection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('calls injectLoadingStyles immediately when on YouTube', async () => {
    setupDomMocks();
    vi.stubGlobal('location', { hostname: 'www.youtube.com', pathname: '/' });

    const mockInjectLoadingStyles = vi.fn();
    vi.doMock('./core/loading', () => ({ injectLoadingStyles: mockInjectLoadingStyles }));
    vi.doMock('./core/index', () => ({ initSite: vi.fn() }));

    await import('./content');

    expect(mockInjectLoadingStyles).toHaveBeenCalledTimes(1);
  });

  it('calls injectLoadingStyles immediately when on Google search', async () => {
    setupDomMocks();
    vi.stubGlobal('location', { hostname: 'www.google.com', pathname: '/search' });

    const mockInjectLoadingStyles = vi.fn();
    vi.doMock('./core/loading', () => ({ injectLoadingStyles: mockInjectLoadingStyles }));
    vi.doMock('./core/index', () => ({ initSite: vi.fn() }));

    await import('./content');

    expect(mockInjectLoadingStyles).toHaveBeenCalledTimes(1);
  });

  it('does NOT call injectLoadingStyles on unsupported sites', async () => {
    setupDomMocks();
    vi.stubGlobal('location', { hostname: 'www.example.com', pathname: '/' });

    const mockInjectLoadingStyles = vi.fn();
    vi.doMock('./core/loading', () => ({ injectLoadingStyles: mockInjectLoadingStyles }));
    vi.doMock('./core/index', () => ({ initSite: vi.fn() }));

    await import('./content');

    expect(mockInjectLoadingStyles).not.toHaveBeenCalled();
  });

  it('does NOT call injectLoadingStyles on Google non-search pages', async () => {
    setupDomMocks();
    vi.stubGlobal('location', { hostname: 'www.google.com', pathname: '/maps' });

    const mockInjectLoadingStyles = vi.fn();
    vi.doMock('./core/loading', () => ({ injectLoadingStyles: mockInjectLoadingStyles }));
    vi.doMock('./core/index', () => ({ initSite: vi.fn() }));

    await import('./content');

    expect(mockInjectLoadingStyles).not.toHaveBeenCalled();
  });

  it('calls injectLoadingStyles before DOMContentLoaded handler runs', async () => {
    setupDomMocks();
    document.readyState = 'loading';
    vi.stubGlobal('location', { hostname: 'www.youtube.com', pathname: '/' });

    const callOrder = [];
    const mockInjectLoadingStyles = vi.fn(() => callOrder.push('injectLoadingStyles'));
    const mockInitSite = vi.fn(() => callOrder.push('initSite'));
    vi.doMock('./core/loading', () => ({ injectLoadingStyles: mockInjectLoadingStyles }));
    vi.doMock('./core/index', () => ({ initSite: mockInitSite }));

    await import('./content');

    // injectLoadingStyles called immediately
    expect(mockInjectLoadingStyles).toHaveBeenCalledTimes(1);
    // initSite NOT called yet (deferred to DOMContentLoaded)
    expect(mockInitSite).not.toHaveBeenCalled();
    // Only injectLoadingStyles has run
    expect(callOrder).toEqual(['injectLoadingStyles']);
  });
});
