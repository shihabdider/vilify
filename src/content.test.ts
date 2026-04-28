import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectSupportedPage, initContentScript } from './content';
import {
  getOmnibarInput,
  makeOmnibarTestDom as makeDom,
  omnibarItemIds,
  omnibarModeLabel as getOmnibarModeLabel,
  pressKey,
  requireOmnibarInput,
} from './test-helpers/omnibar';
import { youtubeDefaultMode, youtubePlugin } from './sites/youtube/plugin';
import type { OmnibarMode } from './omnibar/types';

describe('detectSupportedPage', () => {
  it('detects the active YouTube plugin for YouTube host-level pages', () => {
    const urls = [
      new URL('https://www.youtube.com/'),
      new URL('https://www.youtube.com/results?search_query=vim'),
      new URL('https://www.youtube.com/@vilify'),
      new URL('https://www.youtube.com/channel/UC123'),
      new URL('https://www.youtube.com/playlist?list=PL123'),
      new URL('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
      new URL('https://www.youtube.com/watch?t=42s'),
      new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s'),
    ];

    for (const url of urls) {
      expect(detectSupportedPage(url)).toEqual({
        kind: 'active-plugin',
        url,
        plugin: youtubePlugin,
      });
    }
  });

  it('treats Google, youtu.be, and unrelated pages as unsupported', () => {
    const urls = [
      new URL('https://www.google.com/search?q=vilify'),
      new URL('https://google.com/search?q=vilify'),
      new URL('https://youtu.be/dQw4w9WgXcQ'),
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

    for (const [key, init] of [
      ['a', {}],
      [':', { altKey: true }],
      [':', { ctrlKey: true }],
      [':', { metaKey: true }],
    ] as const) {
      const bypassedKey = pressKey(dom.window, dom.window.document.body, key, init);
      expect(bypassedKey.defaultPrevented, key).toBe(false);
      expect(getOmnibarInput(dom.window.document), key).toBeNull();
    }

    const openerKey = pressKey(dom.window, dom.window.document.body, ':');
    expect(openerKey.defaultPrevented).toBe(true);

    const input = getOmnibarInput(dom.window.document);
    expect(input).not.toBeNull();
    expect(input?.placeholder).toBe(youtubeDefaultMode.placeholder);
    expect(getOmnibarModeLabel(dom.window.document)).toBe(youtubeDefaultMode.title.toLowerCase());
    expect(dom.window.document.activeElement).toBe(input);
    expect(page?.outerHTML).toBe(beforePageHtml);
  });

  it('installs a closed-state opener on YouTube non-watch plugin pages', () => {
    for (const pageUrl of [
      'https://www.youtube.com/',
      'https://www.youtube.com/results?search_query=vilify',
      'https://www.youtube.com/@vilify',
      'https://www.youtube.com/channel/UC123',
      'https://www.youtube.com/playlist?list=PL123',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/watch?t=42s',
    ]) {
      const dom = makeDom(pageUrl);

      const result = initContentScript({
        location: dom.window.location,
        document: dom.window.document,
      });

      expect(result, pageUrl).toMatchObject({ kind: 'active-plugin' });
      expect(result.kind === 'active-plugin' ? result.plugin : null, pageUrl).toBe(youtubePlugin);

      const event = pressKey(dom.window, dom.window.document.body, ':');
      expect(event.defaultPrevented, pageUrl).toBe(true);
      expect(getOmnibarInput(dom.window.document), pageUrl).not.toBeNull();
    }
  });

  it('bypasses : when focus is inside editable targets on supported YouTube pages', () => {
    for (const pageUrl of [
      'https://www.youtube.com/',
      'https://www.youtube.com/results?search_query=vilify',
      'https://www.youtube.com/channel/UC123',
      'https://www.youtube.com/playlist?list=PL123',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/watch?t=42s',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    ]) {
      const dom = makeDom(
        pageUrl,
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
        expect(target, `${pageUrl} ${id}`).not.toBeNull();

        const event = pressKey(dom.window, target!, ':');
        expect(event.defaultPrevented, `${pageUrl} ${id}`).toBe(false);
        expect(getOmnibarInput(dom.window.document), `${pageUrl} ${id}`).toBeNull();
      }
    }
  });

  it('reuses one runtime when initialized twice for the same YouTube document', () => {
    const dom = makeDom('https://www.youtube.com/channel/UC123');
    const actionExecutor = vi.fn(() => ({ kind: 'close' as const }));
    const omnibarMode: OmnibarMode = {
      id: 'single-runtime-root',
      title: 'Single Runtime',
      providers: [
        {
          id: 'single-runtime-provider',
          getItems: () => [
            {
              id: 'single-runtime-item',
              kind: 'command',
              title: 'Run once',
              action: { kind: 'noop' },
            },
          ],
        },
      ],
    };
    const documentAddEventListener = vi.spyOn(dom.window.document, 'addEventListener');

    const first = initContentScript({
      location: dom.window.location,
      document: dom.window.document,
      omnibarMode,
      actionExecutor,
    });
    const second = initContentScript({
      location: dom.window.location,
      document: dom.window.document,
      omnibarMode,
      actionExecutor,
    });

    expect(first).toMatchObject({ kind: 'active-plugin' });
    expect(second).toMatchObject({ kind: 'active-plugin' });
    expect(documentAddEventListener.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1);

    const opener = pressKey(dom.window, dom.window.document.body, ':');
    expect(opener.defaultPrevented).toBe(true);
    expect(dom.window.document.querySelectorAll('#vilify-omnibar-root')).toHaveLength(1);

    const enter = pressKey(dom.window, requireOmnibarInput(dom.window.document), 'Enter');
    expect(enter.defaultPrevented).toBe(true);
    expect(actionExecutor).toHaveBeenCalledTimes(1);
    expect(dom.window.document.querySelectorAll('#vilify-omnibar-root')).toHaveLength(1);
  });

  it('keeps the same live omnibar across SPA navigation from non-watch to watch without reinitializing', () => {
    const dom = makeDom('https://www.youtube.com/');
    const providerHrefs: string[] = [];
    let actionHref: string | undefined;
    const actionExecutor = vi.fn((_action, context) => {
      actionHref = context.providerContext.location?.href;
      return { kind: 'close' as const };
    });
    const omnibarMode: OmnibarMode = {
      id: 'url-aware-root',
      title: 'URL Aware',
      providers: [
        {
          id: 'url-aware-provider',
          getItems: (context) => {
            const href = context.location?.href ?? 'about:blank';
            const videoId = new URL(href).searchParams.get('v') ?? 'none';
            providerHrefs.push(href);
            return [
              {
                id: `video-${videoId}`,
                kind: 'command' as const,
                title: `Video ${videoId}`,
                action: { kind: 'noop' as const },
              },
            ];
          },
        },
      ],
    };

    const result = initContentScript({
      document: dom.window.document,
      omnibarMode,
      actionExecutor,
    });

    expect(result).toMatchObject({ kind: 'active-plugin' });

    const firstOpen = pressKey(dom.window, dom.window.document.body, ':');
    expect(firstOpen.defaultPrevented).toBe(true);
    expect(providerHrefs.at(-1)).toBe('https://www.youtube.com/');
    expect(omnibarItemIds(dom.window.document)).toEqual(['video-none']);

    const root = dom.window.document.querySelector('#vilify-omnibar-root');
    expect(root).not.toBeNull();

    pressKey(dom.window, requireOmnibarInput(dom.window.document), 'Escape');
    dom.window.history.pushState({}, '', '/watch?v=spa-video-0012');

    const secondOpen = pressKey(dom.window, dom.window.document.body, ':');
    expect(secondOpen.defaultPrevented).toBe(true);
    expect(dom.window.document.querySelector('#vilify-omnibar-root')).toBe(root);
    expect(providerHrefs.at(-1)).toBe('https://www.youtube.com/watch?v=spa-video-0012');
    expect(omnibarItemIds(dom.window.document)).toEqual(['video-spa-video-0012']);

    pressKey(dom.window, requireOmnibarInput(dom.window.document), 'Enter');

    expect(actionExecutor).toHaveBeenCalledTimes(1);
    expect(actionHref).toBe('https://www.youtube.com/watch?v=spa-video-0012');
  });

  it('leaves Google, youtu.be, and unrelated pages without a listener, opener interception, or omnibar UI', () => {
    for (const pageUrl of [
      'https://www.google.com/search?q=vilify',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://example.com/watch?v=dQw4w9WgXcQ',
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
