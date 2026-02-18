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
    expect(theme.bg1).toBe('#1F1F28');
    expect(theme.bg2).toBe('#2A2A37');
    expect(theme.bg3).toBe('#363646');
    expect(theme.txt1).toBe('#DCD7BA');
    expect(theme.txt2).toBe('#C8C093');
    expect(theme.txt3).toBe('#727169');
    expect(theme.txt4).toBe('#7E9CD8');
    expect(theme.accent).toBe('#C34043');
    expect(theme.accentHover).toBe('#E82424');
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
