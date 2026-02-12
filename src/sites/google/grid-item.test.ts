// @vitest-environment jsdom
// Tests for renderGoogleGridItem
// Uses jsdom for real DOM element creation (el() helper needs instanceof Node)

import { describe, it, expect } from 'vitest';
import { renderGoogleGridItem } from './grid';

/**
 * Helper: create a ContentItem-shaped object for tests.
 */
function makeItem(overrides = {}) {
  return {
    id: 'img-1',
    title: 'Sunset over mountains',
    thumbnail: 'https://example.com/thumb.jpg',
    meta: 'example.com',
    url: 'https://example.com/page',
    ...overrides,
  };
}

describe('renderGoogleGridItem', () => {
  // ---- Container structure ----

  it('returns an HTMLElement (div) as the container', () => {
    const cell = renderGoogleGridItem(makeItem(), false);
    expect(cell).toBeInstanceOf(HTMLElement);
    expect(cell.tagName).toBe('DIV');
  });

  it('container has class vilify-google-grid-cell', () => {
    const cell = renderGoogleGridItem(makeItem(), false);
    expect(cell.classList.contains('vilify-google-grid-cell')).toBe(true);
  });

  // ---- Selected state ----

  it('adds "selected" class when isSelected is true', () => {
    const cell = renderGoogleGridItem(makeItem(), true);
    expect(cell.classList.contains('selected')).toBe(true);
    expect(cell.classList.contains('vilify-google-grid-cell')).toBe(true);
  });

  it('does NOT add "selected" class when isSelected is false', () => {
    const cell = renderGoogleGridItem(makeItem(), false);
    expect(cell.classList.contains('selected')).toBe(false);
  });

  // ---- Thumbnail image ----

  it('contains an img element as a child', () => {
    const cell = renderGoogleGridItem(makeItem(), false);
    const img = cell.querySelector('img');
    expect(img).not.toBeNull();
  });

  it('img src is set to item.thumbnail', () => {
    const item = makeItem({ thumbnail: 'https://cdn.test/photo.png' });
    const cell = renderGoogleGridItem(item, false);
    const img = cell.querySelector('img');
    expect(img.getAttribute('src')).toBe('https://cdn.test/photo.png');
  });

  it('img has alt attribute set to item.title', () => {
    const item = makeItem({ title: 'Mountain view' });
    const cell = renderGoogleGridItem(item, false);
    const img = cell.querySelector('img');
    expect(img.getAttribute('alt')).toBe('Mountain view');
  });

  // ---- Title overlay ----

  it('contains a title overlay element with correct class', () => {
    const cell = renderGoogleGridItem(makeItem(), false);
    const title = cell.querySelector('.vilify-google-grid-cell-title');
    expect(title).not.toBeNull();
  });

  it('title overlay shows item.title text', () => {
    const item = makeItem({ title: 'Northern lights' });
    const cell = renderGoogleGridItem(item, false);
    const title = cell.querySelector('.vilify-google-grid-cell-title');
    expect(title.textContent).toBe('Northern lights');
  });

  it('title overlay falls back to empty string when title is empty', () => {
    const item = makeItem({ title: '' });
    const cell = renderGoogleGridItem(item, false);
    const title = cell.querySelector('.vilify-google-grid-cell-title');
    expect(title.textContent).toBe('');
  });

  // ---- Meta (source domain) ----

  it('contains a meta overlay element with correct class when meta exists', () => {
    const item = makeItem({ meta: 'photos.example.com' });
    const cell = renderGoogleGridItem(item, false);
    const meta = cell.querySelector('.vilify-google-grid-cell-meta');
    expect(meta).not.toBeNull();
  });

  it('meta overlay shows item.meta text', () => {
    const item = makeItem({ meta: 'flickr.com' });
    const cell = renderGoogleGridItem(item, false);
    const meta = cell.querySelector('.vilify-google-grid-cell-meta');
    expect(meta.textContent).toBe('flickr.com');
  });

  it('does NOT render meta overlay when item.meta is falsy', () => {
    const item = makeItem({ meta: '' });
    const cell = renderGoogleGridItem(item, false);
    const meta = cell.querySelector('.vilify-google-grid-cell-meta');
    expect(meta).toBeNull();
  });

  // ---- Child order: img, title, meta ----

  it('children order is img first, then title, then meta', () => {
    const cell = renderGoogleGridItem(makeItem(), false);
    const children = Array.from(cell.children);
    expect(children.length).toBeGreaterThanOrEqual(3);
    expect(children[0].tagName).toBe('IMG');
    expect(children[1].classList.contains('vilify-google-grid-cell-title')).toBe(true);
    expect(children[2].classList.contains('vilify-google-grid-cell-meta')).toBe(true);
  });

  // ---- Edge cases ----

  it('works with minimal item (only required fields)', () => {
    const item = { id: 'x', title: 'T', thumbnail: 'http://t.co/i.jpg', meta: '', url: '' };
    const cell = renderGoogleGridItem(item, false);
    expect(cell.tagName).toBe('DIV');
    expect(cell.querySelector('img').getAttribute('src')).toBe('http://t.co/i.jpg');
  });

  it('selected + meta missing: only has selected class and no meta child', () => {
    const item = makeItem({ meta: undefined });
    const cell = renderGoogleGridItem(item, true);
    expect(cell.classList.contains('selected')).toBe(true);
    expect(cell.querySelector('.vilify-google-grid-cell-meta')).toBeNull();
  });
});
