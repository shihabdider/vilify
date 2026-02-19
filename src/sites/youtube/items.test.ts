// @vitest-environment jsdom
// Tests for items.ts — YouTube item rendering and styles

import { describe, it, expect, beforeEach } from 'vitest';
import { renderYouTubeItem, injectYouTubeItemStyles } from './items';
import type { ContentItem, WatchLaterRemoval } from '../../types';

// =============================================================================
// injectYouTubeItemStyles
// =============================================================================
describe('injectYouTubeItemStyles', () => {
  beforeEach(() => {
    // Remove any previously injected style element
    const existing = document.getElementById('vilify-youtube-item-styles');
    if (existing) existing.remove();
  });

  it('injects a <style> element into <head>', () => {
    injectYouTubeItemStyles();
    const styleEl = document.getElementById('vilify-youtube-item-styles');
    expect(styleEl).not.toBeNull();
    expect(styleEl!.tagName).toBe('STYLE');
    expect(styleEl!.textContent).toContain('.vilify-item-meta2');
    expect(styleEl!.textContent).toContain('.vilify-cursor-icon');
  });

  it('is idempotent — second call does not add another <style>', () => {
    // First call may or may not inject depending on prior test state,
    // but calling twice should never produce more than one element.
    injectYouTubeItemStyles();
    injectYouTubeItemStyles();
    const styles = document.querySelectorAll('#vilify-youtube-item-styles');
    expect(styles.length).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// renderYouTubeItem — basic rendering
// =============================================================================
describe('renderYouTubeItem', () => {
  const baseItem: ContentItem = {
    title: 'Test Video',
    url: 'https://youtube.com/watch?v=abc',
    meta: 'Channel Name · 2 days ago',
    thumbnail: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
    data: { videoId: 'abc', viewCount: '1M views', duration: '12:34' },
  };

  it('returns an HTMLElement', () => {
    const el = renderYouTubeItem(baseItem, false);
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('contains the video title', () => {
    const el = renderYouTubeItem(baseItem, false);
    expect(el.textContent).toContain('Test Video');
  });

  it('contains the meta text', () => {
    const el = renderYouTubeItem(baseItem, false);
    expect(el.textContent).toContain('Channel Name · 2 days ago');
  });

  it('contains meta2 row with viewCount and duration', () => {
    const el = renderYouTubeItem(baseItem, false);
    expect(el.textContent).toContain('1M views');
    expect(el.textContent).toContain('12:34');
  });

  it('renders thumbnail as <img>', () => {
    const el = renderYouTubeItem(baseItem, false);
    const img = el.querySelector('img.vilify-thumb');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe(baseItem.thumbnail);
  });

  it('renders placeholder when no thumbnail', () => {
    const noThumb: ContentItem = { ...baseItem, thumbnail: undefined };
    const el = renderYouTubeItem(noThumb, false);
    const img = el.querySelector('img.vilify-thumb');
    expect(img).toBeNull();
    const placeholder = el.querySelector('.vilify-thumb');
    expect(placeholder).not.toBeNull();
  });

  // =========================================================================
  // Selection state
  // =========================================================================
  it('adds "selected" class when isSelected is true', () => {
    const el = renderYouTubeItem(baseItem, true);
    expect(el.classList.contains('selected')).toBe(true);
  });

  it('does not add "selected" class when isSelected is false', () => {
    const el = renderYouTubeItem(baseItem, false);
    expect(el.classList.contains('selected')).toBe(false);
  });

  // =========================================================================
  // Cursor icon
  // =========================================================================
  it('always includes a cursor icon element with class vilify-cursor-icon', () => {
    const el = renderYouTubeItem(baseItem, false);
    const cursor = el.querySelector('.vilify-cursor-icon');
    expect(cursor).not.toBeNull();
  });

  it('cursor icon contains the arrow character when selected', () => {
    const el = renderYouTubeItem(baseItem, true);
    const cursor = el.querySelector('.vilify-cursor-icon');
    expect(cursor).not.toBeNull();
    expect(cursor!.textContent).toBe('\u25B6');
  });

  it('cursor icon is present but empty when not selected', () => {
    const el = renderYouTubeItem(baseItem, false);
    const cursor = el.querySelector('.vilify-cursor-icon');
    expect(cursor).not.toBeNull();
    expect(cursor!.textContent).toBe('');
  });

  it('cursor icon is the first child of the item element', () => {
    const el = renderYouTubeItem(baseItem, true);
    const firstChild = el.firstElementChild;
    expect(firstChild).not.toBeNull();
    expect(firstChild!.classList.contains('vilify-cursor-icon')).toBe(true);
  });

  it('cursor icon does not appear in group headers', () => {
    const groupItem = { title: '', url: '', group: 'My Group' } as ContentItem;
    const el = renderYouTubeItem(groupItem, false);
    const cursor = el.querySelector('.vilify-cursor-icon');
    expect(cursor).toBeNull();
  });

  it('cursor icon does not appear in command items', () => {
    const cmdItem = { title: '', url: '', label: 'Do thing', action: () => {} } as any;
    const el = renderYouTubeItem(cmdItem, true);
    const cursor = el.querySelector('.vilify-cursor-icon');
    expect(cursor).toBeNull();
  });

  // =========================================================================
  // Watch Later badge
  // =========================================================================
  it('shows WL badge when video is in watchLaterAdded', () => {
    const added = new Set(['abc']);
    const el = renderYouTubeItem(baseItem, false, added);
    const badge = el.querySelector('.vilify-watch-later-badge');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe('WL');
  });

  it('does not show WL badge for videos not in watchLaterAdded', () => {
    const added = new Set(['other']);
    const el = renderYouTubeItem(baseItem, false, added);
    const badge = el.querySelector('.vilify-watch-later-badge');
    expect(badge).toBeNull();
  });

  // =========================================================================
  // Removed from Watch Later
  // =========================================================================
  it('shows removed badge and vilify-removed class for removed videos', () => {
    const removed = new Map<string, WatchLaterRemoval>([
      ['abc', { videoId: 'abc', setVideoId: 'set1', position: 0 }],
    ]);
    const el = renderYouTubeItem(baseItem, false, new Set(), removed);
    expect(el.classList.contains('vilify-removed')).toBe(true);
    const badge = el.querySelector('.vilify-removed-badge');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe('WL');
  });

  // =========================================================================
  // Dismissed videos
  // =========================================================================
  it('shows dismissed badge and vilify-removed class for dismissed videos', () => {
    const dismissed = new Set(['abc']);
    const el = renderYouTubeItem(baseItem, false, new Set(), new Map(), dismissed);
    expect(el.classList.contains('vilify-removed')).toBe(true);
    const badge = el.querySelector('.vilify-removed-badge');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe('✕');
  });

  // =========================================================================
  // Group headers
  // =========================================================================
  it('renders group header for group items', () => {
    const groupItem = { title: '', url: '', group: 'My Group' } as ContentItem;
    const el = renderYouTubeItem(groupItem, false);
    expect(el.classList.contains('vilify-group-header')).toBe(true);
    expect(el.textContent).toBe('My Group');
  });

  // =========================================================================
  // Command items (label + action)
  // =========================================================================
  it('renders command items with label', () => {
    const cmdItem = { title: '', url: '', label: 'Do thing', action: () => {} } as any;
    const el = renderYouTubeItem(cmdItem, true);
    expect(el.classList.contains('vilify-item')).toBe(true);
    expect(el.classList.contains('selected')).toBe(true);
    expect(el.textContent).toBe('Do thing');
  });

  // =========================================================================
  // Missing optional data
  // =========================================================================
  it('handles item with no data field gracefully', () => {
    const minimal: ContentItem = { title: 'Bare', url: '/bare' };
    const el = renderYouTubeItem(minimal, false);
    expect(el.textContent).toContain('Bare');
  });

  it('handles item with no meta', () => {
    const noMeta: ContentItem = { title: 'No Meta', url: '/x' };
    const el = renderYouTubeItem(noMeta, false);
    // Should not contain meta div
    const metaDiv = el.querySelector('.vilify-item-meta');
    expect(metaDiv).toBeNull();
  });

  it('skips meta2 row when viewCount and duration are absent', () => {
    const noMeta2: ContentItem = { title: 'No Meta2', url: '/x', data: { videoId: 'z' } };
    const el = renderYouTubeItem(noMeta2, false);
    const meta2 = el.querySelector('.vilify-item-meta2');
    expect(meta2).toBeNull();
  });
});
