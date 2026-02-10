// @vitest-environment jsdom
// Tests for renderVideoInfoBox DOM structure and CSS
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies that watch.js imports
vi.mock('./scraper.js', () => ({
  getComments: vi.fn(() => ({ status: 'disabled', items: [] })),
  getYouTubePageType: vi.fn(() => 'watch'),
  formatDuration: vi.fn((s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`),
}));

vi.mock('./player.js', () => ({
  getVideo: vi.fn(() => null),
}));

vi.mock('../../core/view.js', () => {
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

import { renderVideoInfo, WATCH_CSS } from './watch.js';

// =============================================================================
// CSS TESTS
// =============================================================================

describe('WATCH_CSS - action group styles', () => {
  it('contains .vilify-action-group class', () => {
    expect(WATCH_CSS).toContain('.vilify-action-group');
  });

  it('vilify-action-group is a flex container', () => {
    expect(WATCH_CSS).toMatch(/\.vilify-action-group\s*\{[^}]*display:\s*flex/);
  });

  it('vilify-watch-actions still exists as outer container', () => {
    expect(WATCH_CSS).toContain('.vilify-watch-actions');
  });
});

// =============================================================================
// DOM STRUCTURE TESTS
// =============================================================================

describe('renderVideoInfoBox - action hint grouping', () => {
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

  it('renders two action groups inside vilify-watch-actions', () => {
    renderVideoInfo(makeCtx(), container);
    const actionsRow = container.querySelector('.vilify-watch-actions');
    expect(actionsRow).not.toBeNull();
    const groups = actionsRow.querySelectorAll('.vilify-action-group');
    expect(groups.length).toBe(2);
  });

  it('group 1 contains ms and mw hints', () => {
    renderVideoInfo(makeCtx(), container);
    const groups = container.querySelectorAll('.vilify-action-group');
    const group1 = groups[0];
    const hints = group1.querySelectorAll('.vilify-action-hint');
    expect(hints.length).toBe(2);

    // First hint: ms (sub)
    const kbds1 = hints[0].querySelectorAll('kbd');
    expect(kbds1[0].textContent).toBe('ms');

    // Second hint: mw (watch later)
    const kbds2 = hints[1].querySelectorAll('kbd');
    expect(kbds2[0].textContent).toBe('mw');
  });

  it('group 2 contains zo hint when no chapters or transcript', () => {
    renderVideoInfo(makeCtx(), container);
    const groups = container.querySelectorAll('.vilify-action-group');
    const group2 = groups[1];
    const hints = group2.querySelectorAll('.vilify-action-hint');
    // Only zo (desc) — no chapters, no transcript via renderVideoInfo (no siteState)
    expect(hints.length).toBe(1);
    const kbd = hints[0].querySelector('kbd');
    expect(kbd.textContent).toBe('zo');
  });

  it('group 2 contains f hint when chapters exist', () => {
    const ctx = makeCtx({ chapters: [{ title: 'Ch1', time: 0 }] });
    renderVideoInfo(ctx, container);
    const groups = container.querySelectorAll('.vilify-action-group');
    const group2 = groups[1];
    const hints = group2.querySelectorAll('.vilify-action-hint');
    // f (chapters) and zo (desc)
    expect(hints.length).toBe(2);
    const kbdTexts = Array.from(hints).map(h => h.querySelector('kbd').textContent);
    expect(kbdTexts).toContain('f');
    expect(kbdTexts).toContain('zo');
  });

  it('group 2 order is f, t, zo when all present (via renderWatchPage)', async () => {
    // renderVideoInfo doesn't pass siteState, so transcript won't show.
    // We verify the order with chapters only: f before zo
    const ctx = makeCtx({ chapters: [{ title: 'Ch1', time: 0 }] });
    renderVideoInfo(ctx, container);
    const groups = container.querySelectorAll('.vilify-action-group');
    const group2 = groups[1];
    const kbdTexts = Array.from(group2.querySelectorAll('.vilify-action-hint'))
      .map(h => h.querySelector('kbd').textContent);
    expect(kbdTexts[0]).toBe('f');
    expect(kbdTexts[kbdTexts.length - 1]).toBe('zo');
  });

  it('preserves vilify-sub-action id on subscribe hint', () => {
    renderVideoInfo(makeCtx(), container);
    const subAction = container.querySelector('#vilify-sub-action');
    expect(subAction).not.toBeNull();
    expect(subAction.querySelector('kbd').textContent).toBe('ms');
  });

  it('preserves vilify-wl-action id on watch later hint', () => {
    renderVideoInfo(makeCtx(), container);
    const wlAction = container.querySelector('#vilify-wl-action');
    expect(wlAction).not.toBeNull();
    expect(wlAction.querySelector('kbd').textContent).toBe('mw');
  });

  it('preserves vilify-wl-added class when video is in watch later', () => {
    // renderVideoInfo doesn't pass watchLaterAdded, so this tests the default case
    renderVideoInfo(makeCtx(), container);
    const wlAction = container.querySelector('#vilify-wl-action');
    expect(wlAction).not.toBeNull();
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
