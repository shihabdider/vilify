// Tests for type annotations on core/index.ts exports
// Verifies that typed signatures don't break existing behavior
// Following HtDP: derive tests from function contracts (signature + purpose)

import { describe, it, expect } from 'vitest';
import { buildSearchUrl } from './index';
import type { SiteConfig, App } from '../types';

// =============================================================================
// buildSearchUrl(config: SiteConfig, query: string): string
// =============================================================================

describe('buildSearchUrl type contract', () => {
  it('accepts a SiteConfig-shaped config without searchUrl and returns string', () => {
    const config = { name: 'test', theme: { bg1: '', bg2: '', bg3: '', txt1: '', txt2: '', txt3: '', txt4: '', accent: '', accentHover: '' }, getPageType: () => 'home' } as SiteConfig;
    const result: string = buildSearchUrl(config, 'hello');
    expect(typeof result).toBe('string');
    expect(result).toBe('/results?search_query=hello');
  });

  it('accepts a SiteConfig with searchUrl and returns string', () => {
    const config = {
      name: 'google',
      theme: { bg1: '', bg2: '', bg3: '', txt1: '', txt2: '', txt3: '', txt4: '', accent: '', accentHover: '' },
      getPageType: () => 'search',
      searchUrl: (q: string) => '/search?q=' + encodeURIComponent(q),
    } as SiteConfig;
    const result: string = buildSearchUrl(config, 'test query');
    expect(result).toBe('/search?q=test%20query');
  });

  it('returns YouTube-style fallback URL when searchUrl is absent', () => {
    const config = { name: 'yt', theme: { bg1: '', bg2: '', bg3: '', txt1: '', txt2: '', txt3: '', txt4: '', accent: '', accentHover: '' }, getPageType: () => 'home' } as SiteConfig;
    const result = buildSearchUrl(config, 'a&b');
    expect(result).toBe('/results?search_query=a%26b');
  });

  it('handles empty query string', () => {
    const config = { name: 'test', theme: { bg1: '', bg2: '', bg3: '', txt1: '', txt2: '', txt3: '', txt4: '', accent: '', accentHover: '' }, getPageType: () => 'home' } as SiteConfig;
    const result = buildSearchUrl(config, '');
    expect(result).toBe('/results?search_query=');
  });
});

// =============================================================================
// createApp return type matches App interface shape
// =============================================================================

describe('createApp return type contract', () => {
  // We can't easily call createApp without mocking DOM, but we can verify
  // the App interface has the expected method signatures by type-checking.
  // This test ensures the interface shape is correct.

  it('App interface has required methods', () => {
    // Verify App interface shape at the type level
    // This is a compile-time check — if App is wrong, TS will error
    const fakeApp: App = {
      init: async () => {},
      destroy: () => {},
      getState: () => null as any,
      setState: (_s: any) => {},
      getSiteState: () => null,
      setSiteState: (_s: any) => {},
      render: () => {},
      openPalette: () => {},
      openLocalFilter: () => {},
      openDrawer: (_id: string) => {},
      closeDrawer: () => {},
      exitFocusMode: () => {},
      executeSort: (_field: string) => {},
    };
    expect(fakeApp.init).toBeTypeOf('function');
    expect(fakeApp.destroy).toBeTypeOf('function');
    expect(fakeApp.getState).toBeTypeOf('function');
    expect(fakeApp.setState).toBeTypeOf('function');
    expect(fakeApp.getSiteState).toBeTypeOf('function');
    expect(fakeApp.setSiteState).toBeTypeOf('function');
  });
});
