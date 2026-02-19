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

import { renderVideoInfo, WATCH_CSS } from './watch';

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

  it('renders 5 children when no transcript (ms, mw, empty, f, zo)', () => {
    renderVideoInfo(makeCtx(), container);
    const actionsRow = container.querySelector('.vilify-watch-actions');
    expect(actionsRow).not.toBeNull();
    expect(actionsRow.children.length).toBe(5);
  });

  it('row 1: ms then mw then empty cell', () => {
    renderVideoInfo(makeCtx(), container);
    const cells = container.querySelector('.vilify-watch-actions').children;
    expect(cells[0].querySelector('kbd').textContent).toBe('\\ms');
    expect(cells[1].querySelector('kbd').textContent).toBe('\\mw');
    // Third cell is empty spacer
    expect(cells[2].textContent.trim()).toBe('');
  });

  it('row 2 without transcript: f then zo (slides left)', () => {
    renderVideoInfo(makeCtx(), container);
    const cells = container.querySelector('.vilify-watch-actions').children;
    expect(cells[3].querySelector('kbd').textContent).toBe('\\f');
    expect(cells[4].querySelector('kbd').textContent).toBe('\\zo');
  });

  it('preserves vilify-sub-action id on ms hint', () => {
    renderVideoInfo(makeCtx(), container);
    const subAction = container.querySelector('#vilify-sub-action');
    expect(subAction).not.toBeNull();
    expect(subAction.querySelector('kbd').textContent).toBe('\\ms');
  });

  it('preserves vilify-wl-action id on mw hint', () => {
    renderVideoInfo(makeCtx(), container);
    const wlAction = container.querySelector('#vilify-wl-action');
    expect(wlAction).not.toBeNull();
    expect(wlAction.querySelector('kbd').textContent).toBe('\\mw');
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
});
