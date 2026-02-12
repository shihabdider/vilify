// @vitest-environment jsdom
// Tests for YouTube drawer type annotations — verifying functions accept and return typed values

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createChapterDrawer,
  getChapterDrawer,
  resetChapterDrawer,
} from './chapters';
import {
  createDescriptionDrawer,
  getDescriptionDrawer,
  resetDescriptionDrawer,
} from './description';
import {
  setRecommendedItems,
  createRecommendedDrawer,
  getRecommendedDrawer,
  resetRecommendedDrawer,
} from './recommended';
import {
  createTranscriptDrawer,
  getTranscriptDrawer,
  resetTranscriptDrawer,
} from './transcript';
import {
  getYouTubeDrawerHandler,
  resetYouTubeDrawers,
} from './index';
import type {
  ChaptersResult,
  ContentItem,
  DrawerHandler,
  TranscriptResult,
  YouTubeState,
} from '../../../types';

// =============================================================================
// JSDOM POLYFILLS
// =============================================================================

Element.prototype.scrollIntoView = vi.fn();

// =============================================================================
// MOCK: scraper.getDescription (used by description drawer)
// =============================================================================

vi.mock('../scraper', () => ({
  getDescription: () => 'Mock video description\nLine 2',
}));

// =============================================================================
// MOCK: player.seekToChapter (used by chapter & transcript drawers)
// =============================================================================

vi.mock('../player', () => ({
  seekToChapter: vi.fn(),
}));

// =============================================================================
// HELPERS
// =============================================================================

function makeChaptersResult(overrides: Partial<ChaptersResult> = {}): ChaptersResult {
  return {
    status: 'loaded',
    videoId: 'abc123',
    chapters: [
      { title: 'Intro', time: 0, timeText: '0:00' },
      { title: 'Main', time: 60, timeText: '1:00' },
      { title: 'Outro', time: 300, timeText: '5:00' },
    ],
    ...overrides,
  };
}

function makeTranscriptResult(overrides: Partial<TranscriptResult> = {}): TranscriptResult {
  return {
    status: 'loaded',
    videoId: 'abc123',
    lines: [
      { time: 0, timeText: '0:00', duration: 5, text: 'Hello everyone' },
      { time: 5, timeText: '0:05', duration: 4, text: 'Welcome back' },
    ],
    ...overrides,
  };
}

function makeContentItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    title: 'Test Video',
    url: 'https://youtube.com/watch?v=test',
    meta: '100K views',
    thumbnail: 'https://img.youtube.com/vi/test/default.jpg',
    ...overrides,
  };
}

function makeYouTubeState(overrides: Partial<YouTubeState> = {}): YouTubeState {
  return {
    chapterQuery: '',
    chapterSelectedIdx: 0,
    commentPage: 0,
    commentPageStarts: [0],
    settingsApplied: false,
    watchPageRetryCount: 0,
    commentLoadAttempts: 0,
    transcript: null,
    chapters: null,
    ...overrides,
  };
}

// =============================================================================
// chapters.ts
// =============================================================================

describe('chapters drawer', () => {
  beforeEach(() => {
    resetChapterDrawer();
  });

  describe('createChapterDrawer', () => {
    it('returns a DrawerHandler with render and onKey', () => {
      const chaptersResult = makeChaptersResult();
      const handler: DrawerHandler = createChapterDrawer(chaptersResult);
      expect(typeof handler.render).toBe('function');
      expect(typeof handler.onKey).toBe('function');
    });

    it('works with empty chapters array', () => {
      const chaptersResult = makeChaptersResult({ chapters: [] });
      const handler = createChapterDrawer(chaptersResult);
      expect(handler).toBeDefined();
      expect(typeof handler.render).toBe('function');
    });
  });

  describe('getChapterDrawer', () => {
    it('returns a handler for valid chapters data', () => {
      const chaptersResult = makeChaptersResult();
      const handler = getChapterDrawer(chaptersResult);
      expect(handler).not.toBeNull();
      expect(typeof handler!.render).toBe('function');
    });

    it('caches and returns same handler for same input', () => {
      const chaptersResult = makeChaptersResult();
      const handler1 = getChapterDrawer(chaptersResult);
      const handler2 = getChapterDrawer(chaptersResult);
      expect(handler1).toBe(handler2);
    });

    it('recreates handler when chapters data changes', () => {
      const chaptersResult1 = makeChaptersResult();
      const chaptersResult2 = makeChaptersResult({ videoId: 'different' });
      const handler1 = getChapterDrawer(chaptersResult1);
      const handler2 = getChapterDrawer(chaptersResult2);
      expect(handler1).not.toBe(handler2);
    });
  });

  describe('resetChapterDrawer', () => {
    it('clears the cached drawer so next get creates fresh', () => {
      const chaptersResult = makeChaptersResult();
      const handler1 = getChapterDrawer(chaptersResult);
      resetChapterDrawer();
      const handler2 = getChapterDrawer(chaptersResult);
      expect(handler1).not.toBe(handler2);
    });

    it('does not throw when called with no cached drawer', () => {
      expect(() => resetChapterDrawer()).not.toThrow();
    });
  });
});

// =============================================================================
// description.ts
// =============================================================================

describe('description drawer', () => {
  beforeEach(() => {
    resetDescriptionDrawer();
  });

  describe('createDescriptionDrawer', () => {
    it('returns a DrawerHandler with render and onKey', () => {
      const handler: DrawerHandler = createDescriptionDrawer();
      expect(typeof handler.render).toBe('function');
      expect(typeof handler.onKey).toBe('function');
    });
  });

  describe('getDescriptionDrawer', () => {
    it('returns a handler', () => {
      const handler = getDescriptionDrawer();
      expect(handler).not.toBeNull();
      expect(typeof handler!.render).toBe('function');
    });

    it('caches and returns same handler on repeat calls', () => {
      const handler1 = getDescriptionDrawer();
      const handler2 = getDescriptionDrawer();
      expect(handler1).toBe(handler2);
    });
  });

  describe('resetDescriptionDrawer', () => {
    it('clears the cached drawer', () => {
      const handler1 = getDescriptionDrawer();
      resetDescriptionDrawer();
      const handler2 = getDescriptionDrawer();
      expect(handler1).not.toBe(handler2);
    });

    it('does not throw when called with no cached drawer', () => {
      expect(() => resetDescriptionDrawer()).not.toThrow();
    });
  });
});

// =============================================================================
// recommended.ts
// =============================================================================

describe('recommended drawer', () => {
  beforeEach(() => {
    resetRecommendedDrawer();
  });

  describe('setRecommendedItems', () => {
    it('stores items so getRecommendedDrawer can use them', () => {
      const items: ContentItem[] = [makeContentItem()];
      setRecommendedItems(items);
      const handler = getRecommendedDrawer();
      expect(handler).not.toBeNull();
    });
  });

  describe('createRecommendedDrawer', () => {
    it('returns a DrawerHandler with render and onKey', () => {
      const items: ContentItem[] = [makeContentItem(), makeContentItem({ title: 'Other' })];
      const handler: DrawerHandler = createRecommendedDrawer(items);
      expect(typeof handler.render).toBe('function');
      expect(typeof handler.onKey).toBe('function');
    });

    it('works with empty items array', () => {
      const handler = createRecommendedDrawer([]);
      expect(handler).toBeDefined();
      expect(typeof handler.render).toBe('function');
    });
  });

  describe('getRecommendedDrawer', () => {
    it('returns null when no items are set', () => {
      const handler = getRecommendedDrawer();
      expect(handler).toBeNull();
    });

    it('returns null when items are empty array', () => {
      setRecommendedItems([]);
      const handler = getRecommendedDrawer();
      expect(handler).toBeNull();
    });

    it('returns handler when items are set', () => {
      setRecommendedItems([makeContentItem()]);
      const handler = getRecommendedDrawer();
      expect(handler).not.toBeNull();
      expect(typeof handler!.render).toBe('function');
    });

    it('caches handler for same items reference', () => {
      const items = [makeContentItem()];
      setRecommendedItems(items);
      const handler1 = getRecommendedDrawer();
      const handler2 = getRecommendedDrawer();
      expect(handler1).toBe(handler2);
    });

    it('recreates handler when items reference changes', () => {
      setRecommendedItems([makeContentItem()]);
      const handler1 = getRecommendedDrawer();
      setRecommendedItems([makeContentItem({ title: 'New' })]);
      const handler2 = getRecommendedDrawer();
      expect(handler1).not.toBe(handler2);
    });
  });

  describe('resetRecommendedDrawer', () => {
    it('clears the cached drawer and items', () => {
      setRecommendedItems([makeContentItem()]);
      const handler1 = getRecommendedDrawer();
      resetRecommendedDrawer();
      const handler2 = getRecommendedDrawer();
      expect(handler2).toBeNull(); // items also reset
      expect(handler1).not.toBe(handler2);
    });

    it('does not throw when called with no cached drawer', () => {
      expect(() => resetRecommendedDrawer()).not.toThrow();
    });
  });
});

// =============================================================================
// transcript.ts
// =============================================================================

describe('transcript drawer', () => {
  beforeEach(() => {
    resetTranscriptDrawer();
  });

  describe('createTranscriptDrawer', () => {
    it('returns a DrawerHandler with render and onKey', () => {
      const transcript = makeTranscriptResult();
      const handler: DrawerHandler = createTranscriptDrawer(transcript);
      expect(typeof handler.render).toBe('function');
      expect(typeof handler.onKey).toBe('function');
    });

    it('works with empty lines', () => {
      const transcript = makeTranscriptResult({ lines: [] });
      const handler = createTranscriptDrawer(transcript);
      expect(handler).toBeDefined();
      expect(typeof handler.render).toBe('function');
    });
  });

  describe('getTranscriptDrawer', () => {
    it('returns a handler for valid transcript data', () => {
      const transcript = makeTranscriptResult();
      const handler = getTranscriptDrawer(transcript);
      expect(handler).not.toBeNull();
      expect(typeof handler!.render).toBe('function');
    });

    it('caches and returns same handler for same input', () => {
      const transcript = makeTranscriptResult();
      const handler1 = getTranscriptDrawer(transcript);
      const handler2 = getTranscriptDrawer(transcript);
      expect(handler1).toBe(handler2);
    });

    it('recreates handler when transcript data changes', () => {
      const transcript1 = makeTranscriptResult();
      const transcript2 = makeTranscriptResult({ videoId: 'different' });
      const handler1 = getTranscriptDrawer(transcript1);
      const handler2 = getTranscriptDrawer(transcript2);
      expect(handler1).not.toBe(handler2);
    });
  });

  describe('resetTranscriptDrawer', () => {
    it('clears the cached drawer so next get creates fresh', () => {
      const transcript = makeTranscriptResult();
      const handler1 = getTranscriptDrawer(transcript);
      resetTranscriptDrawer();
      const handler2 = getTranscriptDrawer(transcript);
      expect(handler1).not.toBe(handler2);
    });

    it('does not throw when called with no cached drawer', () => {
      expect(() => resetTranscriptDrawer()).not.toThrow();
    });
  });
});

// =============================================================================
// index.ts — getYouTubeDrawerHandler, resetYouTubeDrawers
// =============================================================================

describe('drawer index', () => {
  beforeEach(() => {
    resetYouTubeDrawers();
  });

  describe('getYouTubeDrawerHandler', () => {
    it('returns null for unknown drawer state', () => {
      const state = makeYouTubeState();
      const handler = getYouTubeDrawerHandler('unknown', state);
      expect(handler).toBeNull();
    });

    it('returns handler for chapters when loaded', () => {
      const chapters = makeChaptersResult();
      const state = makeYouTubeState({ chapters });
      const handler = getYouTubeDrawerHandler('chapters', state);
      expect(handler).not.toBeNull();
      expect(typeof handler!.render).toBe('function');
    });

    it('returns null for chapters when not loaded', () => {
      const state = makeYouTubeState({ chapters: null });
      const handler = getYouTubeDrawerHandler('chapters', state);
      expect(handler).toBeNull();
    });

    it('returns null for chapters when status is loading', () => {
      const chapters = makeChaptersResult({ status: 'loading' });
      const state = makeYouTubeState({ chapters });
      const handler = getYouTubeDrawerHandler('chapters', state);
      expect(handler).toBeNull();
    });

    it('returns handler for description', () => {
      const state = makeYouTubeState();
      const handler = getYouTubeDrawerHandler('description', state);
      expect(handler).not.toBeNull();
      expect(typeof handler!.render).toBe('function');
    });

    it('returns handler for transcript when loaded', () => {
      const transcript = makeTranscriptResult();
      const state = makeYouTubeState({ transcript });
      const handler = getYouTubeDrawerHandler('transcript', state);
      expect(handler).not.toBeNull();
      expect(typeof handler!.render).toBe('function');
    });

    it('returns null for transcript when not loaded', () => {
      const state = makeYouTubeState({ transcript: null });
      const handler = getYouTubeDrawerHandler('transcript', state);
      expect(handler).toBeNull();
    });

    it('returns null for transcript when status is loading', () => {
      const transcript = makeTranscriptResult({ status: 'loading' });
      const state = makeYouTubeState({ transcript });
      const handler = getYouTubeDrawerHandler('transcript', state);
      expect(handler).toBeNull();
    });

    it('returns null for recommended when no items set', () => {
      const state = makeYouTubeState();
      const handler = getYouTubeDrawerHandler('recommended', state);
      expect(handler).toBeNull();
    });

    it('returns handler for recommended when items are set', () => {
      setRecommendedItems([makeContentItem()]);
      const state = makeYouTubeState();
      const handler = getYouTubeDrawerHandler('recommended', state);
      expect(handler).not.toBeNull();
    });
  });

  describe('resetYouTubeDrawers', () => {
    it('resets all drawers without throwing', () => {
      expect(() => resetYouTubeDrawers()).not.toThrow();
    });

    it('clears cached drawers across all types', () => {
      const chapters = makeChaptersResult();
      const transcript = makeTranscriptResult();
      const state = makeYouTubeState({ chapters, transcript });

      // Populate caches
      getYouTubeDrawerHandler('chapters', state);
      getYouTubeDrawerHandler('description', state);
      getYouTubeDrawerHandler('transcript', state);
      setRecommendedItems([makeContentItem()]);
      getYouTubeDrawerHandler('recommended', state);

      // Reset all
      resetYouTubeDrawers();

      // Recommended returns null after reset (items cleared)
      const recHandler = getYouTubeDrawerHandler('recommended', state);
      expect(recHandler).toBeNull();
    });
  });
});
