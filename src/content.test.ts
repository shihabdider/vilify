import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { detectSupportedPage, initContentScript } from './content';

function makeDom(url: string): JSDOM {
  return new JSDOM('<!doctype html><html><body><main id="page"><button>Native page control</button></main></body></html>', {
    url,
  });
}

describe('detectSupportedPage', () => {
  it('detects YouTube watch pages and extracts the video id', () => {
    const url = new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s');

    expect(detectSupportedPage(url)).toEqual({
      kind: 'youtube-watch',
      url,
      videoId: 'dQw4w9WgXcQ',
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

  it('returns the supported YouTube watch page without mutating the page DOM or installing key handlers', () => {
    const dom = makeDom('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const beforeHtml = dom.window.document.documentElement.outerHTML;
    const documentAddEventListener = vi.spyOn(dom.window.document, 'addEventListener');
    const windowAddEventListener = vi.spyOn(dom.window, 'addEventListener');

    const result = initContentScript({
      location: dom.window.location,
      document: dom.window.document,
    });

    expect(result).toMatchObject({ kind: 'youtube-watch', videoId: 'dQw4w9WgXcQ' });
    expect(dom.window.document.documentElement.outerHTML).toBe(beforeHtml);
    expect(documentAddEventListener).not.toHaveBeenCalled();
    expect(windowAddEventListener).not.toHaveBeenCalled();
  });

  it('returns unsupported for Google pages without mutating the page DOM or installing key handlers', () => {
    const dom = makeDom('https://www.google.com/search?q=vilify');
    const beforeHtml = dom.window.document.documentElement.outerHTML;
    const documentAddEventListener = vi.spyOn(dom.window.document, 'addEventListener');
    const windowAddEventListener = vi.spyOn(dom.window, 'addEventListener');

    const result = initContentScript({
      location: dom.window.location,
      document: dom.window.document,
    });

    expect(result).toEqual({ kind: 'unsupported', url: new URL('https://www.google.com/search?q=vilify') });
    expect(dom.window.document.documentElement.outerHTML).toBe(beforeHtml);
    expect(documentAddEventListener).not.toHaveBeenCalled();
    expect(windowAddEventListener).not.toHaveBeenCalled();
  });
});
