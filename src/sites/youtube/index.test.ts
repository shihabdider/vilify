// Type annotation tests for YouTube site configuration
// Validates that all exports and internal structures match expected types

import { describe, it, expect } from 'vitest';
import { youtubeConfig } from './index';
import type { SiteConfig, SiteTheme, YouTubeState, PageConfig } from '../../types';

// =============================================================================
// youtubeConfig type conformance
// =============================================================================

describe('youtubeConfig type annotations', () => {
  it('conforms to SiteConfig interface', () => {
    const config: SiteConfig = youtubeConfig;
    expect(config).toBe(youtubeConfig);
  });

  it('has required SiteConfig fields', () => {
    expect(youtubeConfig.name).toBe('youtube');
    expect(typeof youtubeConfig.getPageType).toBe('function');
  });

  it('has a valid SiteTheme', () => {
    const theme: SiteTheme = youtubeConfig.theme;
    expect(theme.bg1).toBe('hsl(240, 14%, 14%)');
    expect(theme.bg2).toBe('hsl(240, 15%, 19%)');
    expect(theme.bg3).toBe('hsl(240, 14%, 24%)');
    expect(theme.txt1).toBe('hsl(50, 36%, 77%)');
    expect(theme.txt2).toBe('hsl(49, 30%, 68%)');
    expect(theme.txt3).toBe('hsl(53, 4%, 43%)');
    expect(theme.txt4).toBe('hsl(220, 53%, 67%)');
    expect(theme.accent).toBe('hsl(358, 51%, 51%)');
    expect(theme.accentHover).toBe('hsl(0, 82%, 53%)');
  });

  it('has mode colors in hsl() format', () => {
    const theme: SiteTheme = youtubeConfig.theme;
    expect(theme.modeNormal).toBe('hsl(205, 69%, 49%)');
    expect(theme.modeSearch).toBe('hsl(68, 100%, 30%)');
    expect(theme.modeCommand).toBe('hsl(18, 80%, 44%)');
    expect(theme.modeFilter).toBe('hsl(331, 64%, 52%)');
  });

  it('has modeReplace matching solarized red (not placeholder gray)', () => {
    const theme: SiteTheme = youtubeConfig.theme;
    expect(theme.modeReplace).not.toBe('hsl(0, 0%, 50%)');
    expect(theme.modeReplace).toBe('hsl(1, 71%, 52%)');
  });

  it('all theme values use hsl() format, not hex', () => {
    const theme: SiteTheme = youtubeConfig.theme;
    for (const [key, value] of Object.entries(theme)) {
      expect(value).toMatch(/^hsl\(/);
      expect(value).not.toMatch(/^#/);
    }
  });
});

// =============================================================================
// createSiteState
// =============================================================================

describe('createSiteState returns YouTubeState', () => {
  it('returns a valid YouTubeState', () => {
    const state: YouTubeState = youtubeConfig.createSiteState!();
    expect(state.chapterQuery).toBe('');
    expect(state.chapterSelectedIdx).toBe(0);
    expect(state.commentPage).toBe(0);
    expect(state.commentPageStarts).toEqual([0]);
    expect(state.settingsApplied).toBe(false);
    expect(state.watchPageRetryCount).toBe(0);
    expect(state.commentLoadAttempts).toBe(0);
    expect(state.transcript).toBeNull();
    expect(state.chapters).toBeNull();
  });
});

// =============================================================================
// pages config
// =============================================================================

describe('pages config', () => {
  it('has pages record with PageConfig values', () => {
    const pages: Record<string, PageConfig> = youtubeConfig.pages;
    expect(pages).toBeDefined();
    expect(Object.keys(pages)).toContain('home');
    expect(Object.keys(pages)).toContain('watch');
  });

  it('listing pages have a render function', () => {
    const home: PageConfig = youtubeConfig.pages.home;
    expect(typeof home.render).toBe('function');
  });

  it('watch page has render, onEnter, and onLeave', () => {
    const watch: PageConfig = youtubeConfig.pages.watch;
    expect(typeof watch.render).toBe('function');
    expect(typeof watch.onEnter).toBe('function');
    expect(typeof watch.onLeave).toBe('function');
  });

  it('all page types are present', () => {
    const expectedPages = [
      'home', 'search', 'subscriptions', 'channel', 'playlist',
      'history', 'library', 'shorts', 'other', 'watch',
    ];
    for (const page of expectedPages) {
      expect(youtubeConfig.pages[page]).toBeDefined();
    }
  });

  // ===========================================================================
  // waitForContent predicates — every page type must have one so core
  // does not need YouTube-specific DOM fallbacks
  // ===========================================================================

  it('every page config has a waitForContent predicate', () => {
    const pages = youtubeConfig.pages;
    for (const [name, cfg] of Object.entries(pages)) {
      expect(typeof cfg.waitForContent).toBe('function');
    }
  });

  it('all listing pages share the same waitForContent predicate', () => {
    const listingPages = ['home', 'search', 'subscriptions', 'channel', 'playlist', 'history', 'library', 'shorts', 'other'];
    const homePred = youtubeConfig.pages.home.waitForContent;
    for (const page of listingPages) {
      expect(youtubeConfig.pages[page].waitForContent).toBe(homePred);
    }
  });

  it('watch page waitForContent differs from listing pages', () => {
    expect(youtubeConfig.pages.watch.waitForContent).not.toBe(
      youtubeConfig.pages.home.waitForContent
    );
  });
});

// =============================================================================
// optional SiteConfig fields
// =============================================================================

describe('optional SiteConfig fields', () => {
  it('has matches array', () => {
    expect(Array.isArray(youtubeConfig.matches)).toBe(true);
    expect(youtubeConfig.matches.length).toBeGreaterThan(0);
  });

  it('has getCommands function', () => {
    expect(typeof youtubeConfig.getCommands).toBe('function');
  });

  it('has getKeySequences function', () => {
    expect(typeof youtubeConfig.getKeySequences).toBe('function');
  });

  it('has getBlockedNativeKeys function', () => {
    expect(typeof youtubeConfig.getBlockedNativeKeys).toBe('function');
  });

  it('has isNativeSearchInput function', () => {
    expect(typeof youtubeConfig.isNativeSearchInput).toBe('function');
  });

  it('has getDrawerHandler function', () => {
    expect(typeof youtubeConfig.getDrawerHandler).toBe('function');
  });

  it('has addToWatchLater function', () => {
    expect(typeof youtubeConfig.addToWatchLater).toBe('function');
  });

  it('has getDescription function', () => {
    expect(typeof youtubeConfig.getDescription).toBe('function');
  });

  it('has getChapters function', () => {
    expect(typeof youtubeConfig.getChapters).toBe('function');
  });

  it('has seekToChapter function', () => {
    expect(typeof youtubeConfig.seekToChapter).toBe('function');
  });
});
