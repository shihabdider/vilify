import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectSupportedPage, initContentScript } from './content';
import {
  getOmnibarInput,
  makeOmnibarTestDom as makeDom,
  omnibarModeLabel as getOmnibarModeLabel,
  pressKey,
} from './test-helpers/omnibar';
import { youtubeDefaultMode, youtubePlugin } from './sites/youtube/plugin';

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
    expect(getOmnibarModeLabel(dom.window.document)).toBe(youtubeDefaultMode.title.toLowerCase());
    expect(dom.window.document.activeElement).toBe(input);
    expect(page?.outerHTML).toBe(beforePageHtml);
  });

  it('bypasses : when focus is inside editable targets', () => {
    const dom = makeDom(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '<main id="page">' +
        '<input id="input" />' +
        '<textarea id="textarea"></textarea>' +
        '<select id="select"><option>One</option></select>' +
        '<div id="editable" contenteditable="true"></div>' +
        '<div id="editable-parent" contenteditable="true"><span id="editable-child"></span></div>' +
        '</main>',
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

  it('leaves Google search and YouTube non-watch pages without a listener, opener interception, or omnibar UI', () => {
    for (const pageUrl of [
      'https://www.youtube.com/results?search_query=vilify',
      'https://www.google.com/search?q=vilify',
    ]) {
      const dom = makeDom(pageUrl);
      const beforeHtml = dom.window.document.documentElement.outerHTML;
      const documentAddEventListener = vi.spyOn(dom.window.document, 'addEventListener');
      const windowAddEventListener = vi.spyOn(dom.window, 'addEventListener');

      const result = initContentScript({
        location: dom.window.location,
        document: dom.window.document,
      });

      expect(result, pageUrl).toEqual({ kind: 'unsupported', url: new URL(pageUrl) });
      expect(documentAddEventListener, pageUrl).not.toHaveBeenCalled();
      expect(windowAddEventListener, pageUrl).not.toHaveBeenCalled();

      const event = pressKey(dom.window, dom.window.document.body, ':');
      expect(event.defaultPrevented, pageUrl).toBe(false);
      expect(getOmnibarInput(dom.window.document), pageUrl).toBeNull();
      expect(dom.window.document.documentElement.outerHTML, pageUrl).toBe(beforeHtml);
    }
  });
});
