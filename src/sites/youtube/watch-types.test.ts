// @vitest-environment jsdom
// Tests for type annotations on watch.ts functions
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { YouTubeState, VideoContext } from '../../types';
import type { CommentsResult, ScrapedComment } from './scraper';

// Mock dependencies
vi.mock('./scraper', () => ({
  getComments: vi.fn(() => ({ status: 'loaded', comments: [] })),
  getYouTubePageType: vi.fn(() => 'watch'),
  formatDuration: vi.fn((s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`),
}));

vi.mock('./player', () => ({
  getVideo: vi.fn(() => null),
}));

vi.mock('../../core/view', () => ({
  el: (tag: string, attrs: Record<string, any> = {}, children: any[] = []) => {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== null && value !== undefined) {
        element.setAttribute(key, String(value));
      }
    }
    for (const child of children) {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    }
    return element;
  },
  clear: (container: HTMLElement) => { container.innerHTML = ''; },
  showMessage: vi.fn(),
}));

import {
  injectWatchStyles,
  renderWatchPage,
  renderVideoInfo,
  renderComments,
  nextCommentPage,
  prevCommentPage,
  triggerCommentLoad,
  updateSubscribeButton,
} from './watch';

// =============================================================================
// HELPERS
// =============================================================================

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

function makeVideoContext(overrides: Partial<VideoContext> = {}): VideoContext {
  return {
    videoId: 'abc123',
    title: 'Test Video',
    channelName: 'Test Channel',
    isSubscribed: false,
    subscriberCount: '100K',
    viewCount: '1M',
    publishDate: '2024-01-01',
    ...overrides,
  };
}

// =============================================================================
// TYPE CONTRACT TESTS — injectWatchStyles
// =============================================================================

describe('injectWatchStyles type contract', () => {
  beforeEach(() => {
    // Remove any previously injected styles
    const existing = document.getElementById('vilify-watch-styles');
    if (existing) existing.remove();
  });

  it('accepts no arguments and returns void', () => {
    const result = injectWatchStyles();
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// TYPE CONTRACT TESTS — renderWatchPage
// =============================================================================

describe('renderWatchPage type contract', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('accepts (VideoContext | null, YouTubeState, HTMLElement) — null ctx', () => {
    const state = makeYouTubeState();
    renderWatchPage(null, state, container);
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('accepts (VideoContext, YouTubeState, HTMLElement) — with ctx', () => {
    const ctx = makeVideoContext();
    const state = makeYouTubeState();
    renderWatchPage(ctx, state, container);
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('accepts optional watchLaterAdded as Set<string>', () => {
    const ctx = makeVideoContext();
    const state = makeYouTubeState();
    const wlSet = new Set<string>(['abc123']);
    renderWatchPage(ctx, state, container, wlSet);
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('accepts optional watchLaterAdded as null', () => {
    const ctx = makeVideoContext();
    const state = makeYouTubeState();
    renderWatchPage(ctx, state, container, null);
    expect(container.children.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// TYPE CONTRACT TESTS — renderVideoInfo
// =============================================================================

describe('renderVideoInfo type contract', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('accepts (VideoContext, HTMLElement) and returns void', () => {
    const ctx = makeVideoContext();
    const result = renderVideoInfo(ctx, container);
    expect(result).toBeUndefined();
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('accepts (null, HTMLElement) — null ctx shows empty state', () => {
    const result = renderVideoInfo(null, container);
    expect(result).toBeUndefined();
    expect(container.textContent).toContain('No video info');
  });
});

// =============================================================================
// TYPE CONTRACT TESTS — renderComments
// =============================================================================

describe('renderComments type contract', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('accepts (CommentsResult, YouTubeState, HTMLElement) — loaded with comments', () => {
    const commentsResult: CommentsResult = {
      status: 'loaded',
      comments: [{ author: 'Alice', text: 'Great video!' }],
    };
    const state = makeYouTubeState();
    const result = renderComments(commentsResult, state, container);
    expect(result).toBeUndefined();
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('accepts (CommentsResult, YouTubeState, HTMLElement) — loading status', () => {
    const commentsResult: CommentsResult = {
      status: 'loading',
      comments: [],
    };
    const state = makeYouTubeState();
    renderComments(commentsResult, state, container);
    expect(container.textContent).toContain('Loading comments');
  });

  it('accepts (CommentsResult, YouTubeState, HTMLElement) — disabled status', () => {
    const commentsResult: CommentsResult = {
      status: 'disabled',
      comments: [],
    };
    const state = makeYouTubeState();
    renderComments(commentsResult, state, container);
    expect(container.textContent).toContain('disabled');
  });
});

// =============================================================================
// TYPE CONTRACT TESTS — nextCommentPage / prevCommentPage
// =============================================================================

describe('nextCommentPage type contract', () => {
  it('accepts YouTubeState and returns YouTubeState', () => {
    const state = makeYouTubeState();
    const result = nextCommentPage(state);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('commentPage');
    expect(result).toHaveProperty('chapterQuery');
  });
});

describe('prevCommentPage type contract', () => {
  it('accepts YouTubeState and returns YouTubeState', () => {
    const state = makeYouTubeState();
    const result = prevCommentPage(state);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('commentPage');
    expect(result).toHaveProperty('chapterQuery');
  });
});

// =============================================================================
// TYPE CONTRACT TESTS — triggerCommentLoad
// =============================================================================

describe('triggerCommentLoad type contract', () => {
  it('accepts no arguments and returns void', () => {
    const result = triggerCommentLoad();
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// TYPE CONTRACT TESTS — updateSubscribeButton
// =============================================================================

describe('updateSubscribeButton type contract', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('accepts boolean true and returns void', () => {
    // Create the DOM elements it expects
    const statusEl = document.createElement('span');
    statusEl.id = 'vilify-sub-status';
    document.body.appendChild(statusEl);

    const actionEl = document.createElement('span');
    actionEl.id = 'vilify-sub-action';
    document.body.appendChild(actionEl);

    const result = updateSubscribeButton(true);
    expect(result).toBeUndefined();
    expect(statusEl.textContent).toContain('subscribed');
  });

  it('accepts boolean false and returns void', () => {
    const statusEl = document.createElement('span');
    statusEl.id = 'vilify-sub-status';
    document.body.appendChild(statusEl);

    const actionEl = document.createElement('span');
    actionEl.id = 'vilify-sub-action';
    document.body.appendChild(actionEl);

    const result = updateSubscribeButton(false);
    expect(result).toBeUndefined();
    expect(statusEl.textContent).toContain('subscribe');
  });

  it('handles missing DOM elements gracefully', () => {
    // No DOM elements present — should not throw
    expect(() => updateSubscribeButton(true)).not.toThrow();
    expect(() => updateSubscribeButton(false)).not.toThrow();
  });
});
