import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { detectSupportedPage, initContentScript } from './content';
import { youtubeDefaultMode, youtubePlugin } from './sites/youtube/plugin';

function makeDom(url: string): JSDOM {
  return new JSDOM('<!doctype html><html><body><main id="page"><button>Native page control</button></main></body></html>', {
    url,
  });
}

function pressKey(window: Window, target: EventTarget, key: string): KeyboardEvent {
  const event = new window.KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

function getOmnibarInput(document: Document): HTMLInputElement | null {
  return document.querySelector('[data-vilify-omnibar-input="true"]');
}

function getOmnibarTitle(document: Document): string | null {
  return document.querySelector('.vilify-omnibar-title')?.textContent ?? null;
}

describe('detectSupportedPage', () => {
  it('detects the active YouTube plugin for watch pages', () => {
    const url = new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s');

    expect(detectSupportedPage(url)).toEqual({
      kind: 'active-plugin',
      url,
      plugin: youtubePlugin,
    });
  });

  it('treats YouTube watch URLs without a video id as unsupported', () => {
    const url = new URL('https://www.youtube.com/watch?t=42s');

    expect(detectSupportedPage(url)).toEqual({ kind: 'unsupported', url });
  });

  it('treats YouTube non-watch pages as unsupported', () => {
    const urls = [
      new URL('https://www.youtube.com/'),
      new URL('https://www.youtube.com/results?search_query=vim'),
      new URL('https://www.youtube.com/@vilify'),
      new URL('https://www.youtube.com/playlist?list=PL123'),
      new URL('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
    ];

    for (const url of urls) {
      expect(detectSupportedPage(url)).toEqual({ kind: 'unsupported', url });
    }
  });

  it('treats Google and unrelated pages as unsupported', () => {
    const urls = [
      new URL('https://www.google.com/search?q=vilify'),
      new URL('https://google.com/search?q=vilify'),
      new URL('https://example.com/watch?v=dQw4w9WgXcQ'),
    ];

    for (const url of urls) {
      expect(detectSupportedPage(url)).toEqual({ kind: 'unsupported', url });
    }
  });
});

describe('initContentScript', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('installs a closed-state opener on active YouTube plugin pages that intercepts only :', () => {
    const dom = makeDom('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const page = dom.window.document.getElementById('page');
    const beforePageHtml = page?.outerHTML;

    const result = initContentScript({
      location: dom.window.location,
      document: dom.window.document,
    });

    expect(result).toMatchObject({ kind: 'active-plugin' });
    expect(result.kind === 'active-plugin' ? result.plugin : null).toBe(youtubePlugin);

    const nativeKey = pressKey(dom.window, dom.window.document.body, 'a');
    expect(nativeKey.defaultPrevented).toBe(false);
    expect(getOmnibarInput(dom.window.document)).toBeNull();

    const openerKey = pressKey(dom.window, dom.window.document.body, ':');
    expect(openerKey.defaultPrevented).toBe(true);

    const input = getOmnibarInput(dom.window.document);
    expect(input).not.toBeNull();
    expect(input?.placeholder).toBe(youtubeDefaultMode.placeholder);
    expect(getOmnibarTitle(dom.window.document)).toBe(youtubeDefaultMode.title);
    expect(dom.window.document.activeElement).toBe(input);
    expect(page?.outerHTML).toBe(beforePageHtml);
  });

  it('bypasses : when focus is inside editable targets', () => {
    const dom = new JSDOM(
      '<!doctype html><html><body><main id="page">' +
        '<input id="input" />' +
        '<textarea id="textarea"></textarea>' +
        '<select id="select"><option>One</option></select>' +
        '<div id="editable" contenteditable="true"></div>' +
        '<div id="editable-parent" contenteditable="true"><span id="editable-child"></span></div>' +
        '</main></body></html>',
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    );

    initContentScript({
      location: dom.window.location,
      document: dom.window.document,
    });

    for (const id of ['input', 'textarea', 'select', 'editable', 'editable-child']) {
      const target = dom.window.document.getElementById(id);
      expect(target, id).not.toBeNull();

      const event = pressKey(dom.window, target!, ':');
      expect(event.defaultPrevented, id).toBe(false);
      expect(getOmnibarInput(dom.window.document), id).toBeNull();
    }
  });

  it('leaves pages with no active plugin without a listener, opener interception, or omnibar UI', () => {
    const dom = makeDom('https://www.youtube.com/results?search_query=vilify');
    const beforeHtml = dom.window.document.documentElement.outerHTML;
    const documentAddEventListener = vi.spyOn(dom.window.document, 'addEventListener');
    const windowAddEventListener = vi.spyOn(dom.window, 'addEventListener');

    const result = initContentScript({
      location: dom.window.location,
      document: dom.window.document,
    });

    expect(result).toEqual({ kind: 'unsupported', url: new URL('https://www.youtube.com/results?search_query=vilify') });
    expect(documentAddEventListener).not.toHaveBeenCalled();
    expect(windowAddEventListener).not.toHaveBeenCalled();

    const event = pressKey(dom.window, dom.window.document.body, ':');
    expect(event.defaultPrevented).toBe(false);
    expect(getOmnibarInput(dom.window.document)).toBeNull();
    expect(dom.window.document.documentElement.outerHTML).toBe(beforeHtml);
  });
});
