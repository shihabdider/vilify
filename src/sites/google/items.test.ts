// @vitest-environment jsdom
// Tests for renderGoogleItem
// Uses jsdom for real DOM element creation (el() helper needs instanceof Node)

import { describe, it, expect } from 'vitest';
import { renderGoogleItem } from './items';

/**
 * Helper: create a ContentItem-shaped object for tests.
 */
function makeItem(overrides = {}) {
  return {
    id: 'result-1',
    title: 'Example Page',
    meta: 'example.com',
    url: 'https://example.com/page',
    description: 'A description of the page.',
    ...overrides,
  };
}

describe('renderGoogleItem', () => {
  // ---- Container structure ----

  it('returns an HTMLElement (div) as the container', () => {
    const node = renderGoogleItem(makeItem(), false);
    expect(node).toBeInstanceOf(HTMLElement);
    expect(node.tagName).toBe('DIV');
  });

  it('container has class vilify-google-item', () => {
    const node = renderGoogleItem(makeItem(), false);
    expect(node.classList.contains('vilify-google-item')).toBe(true);
  });

  // ---- Selected state ----

  it('adds "selected" class when isSelected is true', () => {
    const node = renderGoogleItem(makeItem(), true);
    expect(node.classList.contains('selected')).toBe(true);
    expect(node.classList.contains('vilify-google-item')).toBe(true);
  });

  it('does NOT add "selected" class when isSelected is false', () => {
    const node = renderGoogleItem(makeItem(), false);
    expect(node.classList.contains('selected')).toBe(false);
  });

  // ---- Favicon image ----

  it('contains a favicon img element when item has a valid http url', () => {
    const node = renderGoogleItem(makeItem(), false);
    const img = node.querySelector('img');
    expect(img).not.toBeNull();
  });

  it('favicon src uses Google favicon service with correct domain', () => {
    const item = makeItem({ url: 'https://docs.python.org/3/library/' });
    const node = renderGoogleItem(item, false);
    const img = node.querySelector('img');
    expect(img.getAttribute('src')).toBe(
      'https://www.google.com/s2/favicons?domain=docs.python.org&sz=32'
    );
  });

  it('favicon src extracts domain from complex URLs', () => {
    const item = makeItem({ url: 'https://sub.example.co.uk/path?q=1#frag' });
    const node = renderGoogleItem(item, false);
    const img = node.querySelector('img');
    expect(img.getAttribute('src')).toBe(
      'https://www.google.com/s2/favicons?domain=sub.example.co.uk&sz=32'
    );
  });

  it('favicon img has width and height of 20', () => {
    const node = renderGoogleItem(makeItem(), false);
    const img = node.querySelector('img');
    expect(img.getAttribute('width')).toBe('20');
    expect(img.getAttribute('height')).toBe('20');
  });

  it('does NOT render favicon when item.url is falsy', () => {
    const item = makeItem({ url: '' });
    const node = renderGoogleItem(item, false);
    const img = node.querySelector('img');
    expect(img).toBeNull();
  });

  it('does NOT render favicon when item.url is undefined', () => {
    const item = makeItem({ url: undefined });
    const node = renderGoogleItem(item, false);
    const img = node.querySelector('img');
    expect(img).toBeNull();
  });

  it('does NOT render favicon when item.url is not a valid http URL', () => {
    const item = makeItem({ url: 'not-a-url' });
    const node = renderGoogleItem(item, false);
    const img = node.querySelector('img');
    expect(img).toBeNull();
  });

  // ---- Layout: row with favicon + info div ----

  it('top-level children are favicon img and info div when url exists', () => {
    const node = renderGoogleItem(makeItem(), false);
    const children = Array.from(node.children);
    expect(children.length).toBe(2);
    expect(children[0].tagName).toBe('IMG');
    expect(children[1].tagName).toBe('DIV');
  });

  it('info div contains title, url, description as children', () => {
    const node = renderGoogleItem(makeItem(), false);
    const infoDiv = node.children[1];
    const infoChildren = Array.from(infoDiv.children);
    expect(infoChildren.length).toBe(3);
    expect(infoChildren[0].classList.contains('vilify-google-item-title')).toBe(true);
    expect(infoChildren[1].classList.contains('vilify-google-item-url')).toBe(true);
    expect(infoChildren[2].classList.contains('vilify-google-item-description')).toBe(true);
  });

  it('when url is falsy, no favicon and info div is the only child', () => {
    const item = makeItem({ url: '' });
    const node = renderGoogleItem(item, false);
    const children = Array.from(node.children);
    expect(children.length).toBe(1);
    expect(children[0].tagName).toBe('DIV'); // info div only
  });

  // ---- Title ----

  it('title element shows item.title text', () => {
    const item = makeItem({ title: 'My Page Title' });
    const node = renderGoogleItem(item, false);
    const title = node.querySelector('.vilify-google-item-title');
    expect(title.textContent).toBe('My Page Title');
  });

  it('title falls back to empty string when title is falsy', () => {
    const item = makeItem({ title: '' });
    const node = renderGoogleItem(item, false);
    const title = node.querySelector('.vilify-google-item-title');
    expect(title.textContent).toBe('');
  });

  // ---- URL (meta) ----

  it('url element shows item.meta text', () => {
    const item = makeItem({ meta: 'docs.example.com' });
    const node = renderGoogleItem(item, false);
    const url = node.querySelector('.vilify-google-item-url');
    expect(url.textContent).toBe('docs.example.com');
  });

  it('does NOT render url element when item.meta is falsy', () => {
    const item = makeItem({ meta: '' });
    const node = renderGoogleItem(item, false);
    const url = node.querySelector('.vilify-google-item-url');
    expect(url).toBeNull();
  });

  // ---- Description ----

  it('description element shows item.description text', () => {
    const item = makeItem({ description: 'Some snippet text here.' });
    const node = renderGoogleItem(item, false);
    const desc = node.querySelector('.vilify-google-item-description');
    expect(desc.textContent).toBe('Some snippet text here.');
  });

  it('does NOT render description when item.description is falsy', () => {
    const item = makeItem({ description: '' });
    const node = renderGoogleItem(item, false);
    const desc = node.querySelector('.vilify-google-item-description');
    expect(desc).toBeNull();
  });

  // ---- Favicon onerror hides image ----

  it('favicon img has an onerror handler that hides it', () => {
    const node = renderGoogleItem(makeItem(), false);
    const img = node.querySelector('img');
    // Simulate error by calling onerror
    expect(img.onerror).toBeDefined();
    img.onerror();
    expect(img.style.display).toBe('none');
  });

  // ---- Edge cases ----

  it('works with minimal item (no meta, no description, no url)', () => {
    const item = { id: 'x', title: 'T', meta: '', url: '', description: '' };
    const node = renderGoogleItem(item, false);
    expect(node.tagName).toBe('DIV');
    // Only info div, no favicon
    const infoDiv = node.children[0];
    expect(infoDiv.children.length).toBe(1); // title only
  });
});
