// @vitest-environment jsdom
// Tests for renderVideoInfoBox DOM structure and CSS
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies that watch.js imports
vi.mock('./scraper', () => ({
  getComments: vi.fn(() => ({ status: 'disabled', items: [] })),
  getYouTubePageType: vi.fn(() => 'watch'),
  formatDuration: vi.fn((s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`),
}));

vi.mock('./player', () => ({
  getVideo: vi.fn(() => null),
}));

vi.mock('../../core/view', () => {
  // Provide real el/clear implementations for DOM testing
  return {
    el: (tag, attrs = {}, children = []) => {
      const element = document.createElement(tag);
      for (const [key, value] of Object.entries(attrs)) {
        if (value !== null && value !== undefined) {
          element.setAttribute(key, value);
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
    clear: (container) => { container.innerHTML = ''; },
    showMessage: vi.fn(),
  };
});

import { renderVideoInfo, updateLikeButton, updateDislikeButton, WATCH_CSS } from './watch';

// =============================================================================
// CSS TESTS
// =============================================================================

describe('WATCH_CSS - action grid styles', () => {
  it('vilify-watch-actions uses CSS grid', () => {
    expect(WATCH_CSS).toMatch(/\.vilify-watch-actions\s*\{[^}]*display:\s*grid/);
  });

  it('vilify-watch-actions has 3 columns', () => {
    expect(WATCH_CSS).toMatch(/grid-template-columns:\s*repeat\(3/);
  });
});

// =============================================================================
// CSS - Description Drawer Styles
// =============================================================================

describe('WATCH_CSS - description drawer styles', () => {
  it('description drawer has half player width', () => {
    expect(WATCH_CSS).toContain('data-drawer-id="description"');
    expect(WATCH_CSS).toMatch(/width:\s*calc\(\(100% - 350px\) \/ 2\)/);
  });

  it('description drawer is left-aligned', () => {
    expect(WATCH_CSS).toMatch(/\[data-drawer-id="description"\][^}]*left:\s*0/);
    expect(WATCH_CSS).toMatch(/\[data-drawer-id="description"\][^}]*right:\s*auto/);
  });

  it('description drawer content has white-space normal', () => {
    expect(WATCH_CSS).toMatch(/\[data-drawer-id="description"\]\s*\.vilify-drawer-content[^}]*white-space:\s*normal/);
  });

  it('hashtag links have custom styling', () => {
    expect(WATCH_CSS).toContain('a[href*="/hashtag/"]');
  });

  it('social handle links have custom styling', () => {
    expect(WATCH_CSS).toContain('a[href*="/@"]');
    expect(WATCH_CSS).toContain('a[href*="/channel/"]');
  });

  it('social handle links have font-weight 600', () => {
    expect(WATCH_CSS).toMatch(/a\[href\*="\/channel\/"\][^}]*font-weight:\s*600/);
  });
});

// =============================================================================
// DOM STRUCTURE TESTS
// =============================================================================

describe('renderVideoInfoBox - action hint grid', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  function makeCtx(overrides = {}) {
    return {
      title: 'Test Video',
      channelName: 'Test Channel',
      isSubscribed: false,
      uploadDate: '2024-01-01',
      views: '1K views',
      duration: 120,
      videoId: 'abc123',
      chapters: [],
      ...overrides,
    };
  }

  it('renders 6 children (ss, sw, sl, sd, f, zo)', () => {
    renderVideoInfo(makeCtx(), container);
    const actionsRow = container.querySelector('.vilify-watch-actions');
    expect(actionsRow).not.toBeNull();
    expect(actionsRow.children.length).toBe(6);
  });

  it('row 1: ss then sw then sl', () => {
    renderVideoInfo(makeCtx(), container);
    const cells = container.querySelector('.vilify-watch-actions').children;
    expect(cells[0].querySelector('kbd').textContent).toBe('ss');
    expect(cells[1].querySelector('kbd').textContent).toBe('sw');
    expect(cells[2].querySelector('kbd').textContent).toBe('sl');
  });

  it('row 2: sd then f then zo', () => {
    renderVideoInfo(makeCtx(), container);
    const cells = container.querySelector('.vilify-watch-actions').children;
    expect(cells[3].querySelector('kbd').textContent).toBe('sd');
    expect(cells[4].querySelector('kbd').textContent).toBe('f');
    expect(cells[5].querySelector('kbd').textContent).toBe('zo');
  });

  it('preserves vilify-sub-action id on ss hint', () => {
    renderVideoInfo(makeCtx(), container);
    const subAction = container.querySelector('#vilify-sub-action');
    expect(subAction).not.toBeNull();
    expect(subAction.querySelector('kbd').textContent).toBe('ss');
  });

  it('preserves vilify-wl-action id on sw hint', () => {
    renderVideoInfo(makeCtx(), container);
    const wlAction = container.querySelector('#vilify-wl-action');
    expect(wlAction).not.toBeNull();
    expect(wlAction.querySelector('kbd').textContent).toBe('sw');
  });

  it('preserves vilify-like-action id on sl hint', () => {
    renderVideoInfo(makeCtx(), container);
    const likeAction = container.querySelector('#vilify-like-action');
    expect(likeAction).not.toBeNull();
    expect(likeAction.querySelector('kbd').textContent).toBe('sl');
  });

  it('preserves vilify-dislike-action id on sd hint', () => {
    renderVideoInfo(makeCtx(), container);
    const dislikeAction = container.querySelector('#vilify-dislike-action');
    expect(dislikeAction).not.toBeNull();
    expect(dislikeAction.querySelector('kbd').textContent).toBe('sd');
  });

  it('vilify-wl-added class not set by default', () => {
    renderVideoInfo(makeCtx(), container);
    const wlAction = container.querySelector('#vilify-wl-action');
    expect(wlAction.classList.contains('vilify-wl-added')).toBe(false);
  });

  it('subscribe hint shows "sub" when not subscribed', () => {
    renderVideoInfo(makeCtx({ isSubscribed: false }), container);
    const subAction = container.querySelector('#vilify-sub-action');
    expect(subAction.textContent).toContain('sub');
  });

  it('subscribe hint shows "unsub" when subscribed', () => {
    renderVideoInfo(makeCtx({ isSubscribed: true }), container);
    const subAction = container.querySelector('#vilify-sub-action');
    expect(subAction.textContent).toContain('unsub');
  });

  it('like hint shows "like" by default', () => {
    renderVideoInfo(makeCtx(), container);
    const likeAction = container.querySelector('#vilify-like-action');
    expect(likeAction.textContent).toContain('like');
  });

  it('dislike hint shows "dislike" by default', () => {
    renderVideoInfo(makeCtx(), container);
    const dislikeAction = container.querySelector('#vilify-dislike-action');
    expect(dislikeAction.textContent).toContain('dislike');
  });
});

// =============================================================================
// updateLikeButton TESTS
// =============================================================================

describe('updateLikeButton', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('adds vilify-wl-added class and sets text to "liked" when liked=true', () => {
    const likeEl = document.createElement('span');
    likeEl.id = 'vilify-like-action';
    likeEl.textContent = 'like';
    document.body.appendChild(likeEl);

    updateLikeButton(true);

    const el = document.getElementById('vilify-like-action');
    expect(el.classList.contains('vilify-wl-added')).toBe(true);
    expect(el.textContent).toContain('liked');
  });

  it('removes vilify-wl-added class and sets text to "like" when liked=false', () => {
    const likeEl = document.createElement('span');
    likeEl.id = 'vilify-like-action';
    likeEl.classList.add('vilify-wl-added');
    likeEl.textContent = 'liked';
    document.body.appendChild(likeEl);

    updateLikeButton(false);

    const el = document.getElementById('vilify-like-action');
    expect(el.classList.contains('vilify-wl-added')).toBe(false);
    expect(el.textContent).toContain('like');
    expect(el.textContent).not.toContain('liked');
  });

  it('does not throw when element is missing', () => {
    expect(() => updateLikeButton(true)).not.toThrow();
  });

  it('preserves kbd element with sl key', () => {
    const likeEl = document.createElement('span');
    likeEl.id = 'vilify-like-action';
    document.body.appendChild(likeEl);

    updateLikeButton(true);

    const el = document.getElementById('vilify-like-action');
    expect(el.querySelector('kbd').textContent).toBe('sl');
  });
});

// =============================================================================
// updateDislikeButton TESTS
// =============================================================================

describe('updateDislikeButton', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('adds vilify-wl-added class and sets text to "disliked" when disliked=true', () => {
    const dislikeEl = document.createElement('span');
    dislikeEl.id = 'vilify-dislike-action';
    dislikeEl.textContent = 'dislike';
    document.body.appendChild(dislikeEl);

    updateDislikeButton(true);

    const el = document.getElementById('vilify-dislike-action');
    expect(el.classList.contains('vilify-wl-added')).toBe(true);
    expect(el.textContent).toContain('disliked');
  });

  it('removes vilify-wl-added class and sets text to "dislike" when disliked=false', () => {
    const dislikeEl = document.createElement('span');
    dislikeEl.id = 'vilify-dislike-action';
    dislikeEl.classList.add('vilify-wl-added');
    dislikeEl.textContent = 'disliked';
    document.body.appendChild(dislikeEl);

    updateDislikeButton(false);

    const el = document.getElementById('vilify-dislike-action');
    expect(el.classList.contains('vilify-wl-added')).toBe(false);
    expect(el.textContent).toContain('dislike');
    expect(el.textContent).not.toContain('disliked');
  });

  it('does not throw when element is missing', () => {
    expect(() => updateDislikeButton(true)).not.toThrow();
  });

  it('preserves kbd element with sd key', () => {
    const dislikeEl = document.createElement('span');
    dislikeEl.id = 'vilify-dislike-action';
    document.body.appendChild(dislikeEl);

    updateDislikeButton(true);

    const el = document.getElementById('vilify-dislike-action');
    expect(el.querySelector('kbd').textContent).toBe('sd');
  });
});
