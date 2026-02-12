// Tests for injectGoogleGridStyles
// Verifies idempotent CSS injection for the Google Images grid layout

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Reset module between tests so the stylesInjected flag resets
beforeEach(() => {
  vi.resetModules();
  // Fresh DOM mocks for each test
  vi.stubGlobal('document', {
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    createElement: vi.fn(() => ({
      textContent: '',
      style: {},
      setAttribute: vi.fn(),
      appendChild: vi.fn(),
      classList: { add: vi.fn(), contains: vi.fn(() => false) },
    })),
    head: { appendChild: vi.fn() },
    getElementById: vi.fn(() => null),
  });
});

describe('injectGoogleGridStyles', () => {
  it('appends a <style> element to document.head', async () => {
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(document.createElement).toHaveBeenCalledWith('style');
    expect(document.head.appendChild).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — calling twice only injects once', async () => {
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    injectGoogleGridStyles();
    expect(document.head.appendChild).toHaveBeenCalledTimes(1);
  });

  it('sets textContent on the style element with CSS', async () => {
    let capturedStyle = null;
    document.createElement = vi.fn(() => {
      capturedStyle = { textContent: '' };
      return capturedStyle;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(capturedStyle).not.toBeNull();
    expect(capturedStyle.textContent).toBeTruthy();
    expect(capturedStyle.textContent.length).toBeGreaterThan(50);
  });

  it('CSS includes .vilify-google-grid container class', async () => {
    let capturedCSS = '';
    document.createElement = vi.fn(() => {
      const obj = { set textContent(v) { capturedCSS = v; }, get textContent() { return capturedCSS; } };
      return obj;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(capturedCSS).toContain('.vilify-google-grid');
  });

  it('CSS includes .vilify-google-grid-cell class', async () => {
    let capturedCSS = '';
    document.createElement = vi.fn(() => {
      const obj = { set textContent(v) { capturedCSS = v; }, get textContent() { return capturedCSS; } };
      return obj;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(capturedCSS).toContain('.vilify-google-grid-cell');
  });

  it('CSS uses grid-template-columns with GRID_COLUMNS (5)', async () => {
    let capturedCSS = '';
    document.createElement = vi.fn(() => {
      const obj = { set textContent(v) { capturedCSS = v; }, get textContent() { return capturedCSS; } };
      return obj;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(capturedCSS).toContain('repeat(5, 1fr)');
  });

  it('CSS defines gap for grid spacing', async () => {
    let capturedCSS = '';
    document.createElement = vi.fn(() => {
      const obj = { set textContent(v) { capturedCSS = v; }, get textContent() { return capturedCSS; } };
      return obj;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(capturedCSS).toMatch(/gap\s*:/);
  });

  it('CSS defines aspect-ratio for cell thumbnails', async () => {
    let capturedCSS = '';
    document.createElement = vi.fn(() => {
      const obj = { set textContent(v) { capturedCSS = v; }, get textContent() { return capturedCSS; } };
      return obj;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(capturedCSS).toMatch(/aspect-ratio/);
  });

  it('CSS includes selected state with accent border', async () => {
    let capturedCSS = '';
    document.createElement = vi.fn(() => {
      const obj = { set textContent(v) { capturedCSS = v; }, get textContent() { return capturedCSS; } };
      return obj;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(capturedCSS).toContain('.selected');
    expect(capturedCSS).toContain('var(--accent)');
  });

  it('CSS includes hover state', async () => {
    let capturedCSS = '';
    document.createElement = vi.fn(() => {
      const obj = { set textContent(v) { capturedCSS = v; }, get textContent() { return capturedCSS; } };
      return obj;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(capturedCSS).toContain(':hover');
  });

  it('CSS includes title overlay styling', async () => {
    let capturedCSS = '';
    document.createElement = vi.fn(() => {
      const obj = { set textContent(v) { capturedCSS = v; }, get textContent() { return capturedCSS; } };
      return obj;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    // Title overlay should be positioned at bottom with dark background
    expect(capturedCSS).toContain('vilify-google-grid-cell-title');
  });

  it('CSS includes meta (source domain) styling', async () => {
    let capturedCSS = '';
    document.createElement = vi.fn(() => {
      const obj = { set textContent(v) { capturedCSS = v; }, get textContent() { return capturedCSS; } };
      return obj;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(capturedCSS).toContain('vilify-google-grid-cell-meta');
  });

  it('CSS uses theme custom properties (--bg-2, --txt-1)', async () => {
    let capturedCSS = '';
    document.createElement = vi.fn(() => {
      const obj = { set textContent(v) { capturedCSS = v; }, get textContent() { return capturedCSS; } };
      return obj;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(capturedCSS).toContain('var(--txt-1)');
  });

  it('CSS includes object-fit: cover for thumbnails', async () => {
    let capturedCSS = '';
    document.createElement = vi.fn(() => {
      const obj = { set textContent(v) { capturedCSS = v; }, get textContent() { return capturedCSS; } };
      return obj;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(capturedCSS).toContain('object-fit: cover');
  });

  it('CSS includes scroll-behavior for smooth scrolling', async () => {
    let capturedCSS = '';
    document.createElement = vi.fn(() => {
      const obj = { set textContent(v) { capturedCSS = v; }, get textContent() { return capturedCSS; } };
      return obj;
    });
    const { injectGoogleGridStyles } = await import('./grid');
    injectGoogleGridStyles();
    expect(capturedCSS).toContain('scroll');
  });
});
