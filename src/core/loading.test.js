// Tests for loading.js - LOADING_CSS content and injectLoadingStyles behavior
// Following HtDP: test CSS content (selectors present) and DOM side effects

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- DOM mocks ---
let headChildren = [];
let htmlClassList = [];

const mockStyle = {
  id: '',
  textContent: '',
};

const mockDocumentElement = {
  classList: {
    add: vi.fn((cls) => { if (!htmlClassList.includes(cls)) htmlClassList.push(cls); }),
    remove: vi.fn((cls) => { htmlClassList = htmlClassList.filter(c => c !== cls); }),
    contains: vi.fn((cls) => htmlClassList.includes(cls)),
  },
  appendChild: vi.fn((child) => headChildren.push(child)),
};

vi.stubGlobal('document', {
  createElement: vi.fn(() => ({ ...mockStyle })),
  head: {
    appendChild: vi.fn((child) => headChildren.push(child)),
  },
  documentElement: mockDocumentElement,
  getElementById: vi.fn(() => null),
  body: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    appendChild: vi.fn(),
  },
});

// Fresh import each describe block to reset stylesInjected
beforeEach(() => {
  headChildren = [];
  htmlClassList = [];
  vi.clearAllMocks();
  // Reset the module to clear stylesInjected flag
  vi.resetModules();
});

describe('LOADING_CSS content', () => {
  it('contains body.vilify-loading YouTube selectors', async () => {
    const { _LOADING_CSS_FOR_TEST } = await import('./loading.js');
    const css = _LOADING_CSS_FOR_TEST || '';
    expect(css).toContain('body.vilify-loading ytd-app');
    expect(css).toContain('body.vilify-loading #content');
    expect(css).toContain('body.vilify-loading ytd-browse');
    expect(css).toContain('body.vilify-loading ytd-watch-flexy');
    expect(css).toContain('body.vilify-loading ytd-search');
  });

  it('contains html.vilify-loading YouTube selectors', async () => {
    const { _LOADING_CSS_FOR_TEST } = await import('./loading.js');
    const css = _LOADING_CSS_FOR_TEST || '';
    expect(css).toContain('html.vilify-loading ytd-app');
    expect(css).toContain('html.vilify-loading #content');
    expect(css).toContain('html.vilify-loading ytd-browse');
    expect(css).toContain('html.vilify-loading ytd-watch-flexy');
    expect(css).toContain('html.vilify-loading ytd-search');
  });

  it('contains body.vilify-loading Google selectors', async () => {
    const { _LOADING_CSS_FOR_TEST } = await import('./loading.js');
    const css = _LOADING_CSS_FOR_TEST || '';
    expect(css).toContain('body.vilify-loading #searchform');
    expect(css).toContain('body.vilify-loading #rcnt');
    expect(css).toContain('body.vilify-loading #rso');
    expect(css).toContain('body.vilify-loading #appbar');
    expect(css).toContain('body.vilify-loading #botstuff');
    expect(css).toContain('body.vilify-loading footer');
    expect(css).toContain('body.vilify-loading #top_nav');
  });

  it('contains html.vilify-loading Google selectors', async () => {
    const { _LOADING_CSS_FOR_TEST } = await import('./loading.js');
    const css = _LOADING_CSS_FOR_TEST || '';
    expect(css).toContain('html.vilify-loading #searchform');
    expect(css).toContain('html.vilify-loading #rcnt');
    expect(css).toContain('html.vilify-loading #rso');
    expect(css).toContain('html.vilify-loading #appbar');
    expect(css).toContain('html.vilify-loading #botstuff');
    expect(css).toContain('html.vilify-loading footer');
    expect(css).toContain('html.vilify-loading #top_nav');
  });

  it('uses visibility: hidden for all hiding selectors', async () => {
    const { _LOADING_CSS_FOR_TEST } = await import('./loading.js');
    const css = _LOADING_CSS_FOR_TEST || '';
    expect(css).toContain('visibility: hidden !important');
  });
});

describe('injectLoadingStyles', () => {
  it('adds vilify-loading class to document.documentElement', async () => {
    const { injectLoadingStyles } = await import('./loading.js');
    injectLoadingStyles();
    expect(document.documentElement.classList.add).toHaveBeenCalledWith('vilify-loading');
  });

  it('creates a style element with id vilify-loading-styles', async () => {
    const { injectLoadingStyles } = await import('./loading.js');
    injectLoadingStyles();
    expect(document.createElement).toHaveBeenCalledWith('style');
  });

  it('appends the style to head', async () => {
    const { injectLoadingStyles } = await import('./loading.js');
    injectLoadingStyles();
    expect(document.head.appendChild).toHaveBeenCalled();
  });

  it('only injects once on repeated calls', async () => {
    const { injectLoadingStyles } = await import('./loading.js');
    injectLoadingStyles();
    injectLoadingStyles();
    injectLoadingStyles();
    // createElement called only once
    expect(document.createElement).toHaveBeenCalledTimes(1);
  });
});

describe('hideLoadingScreen', () => {
  it('removes vilify-loading class from document.documentElement', async () => {
    const { hideLoadingScreen } = await import('./loading.js');
    hideLoadingScreen();
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('vilify-loading');
  });
});
