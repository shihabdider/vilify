import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  MAIN_WORLD_BRIDGE_MARKER,
  initMainWorldBridge,
} from './main-world-bridge';

describe('initMainWorldBridge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a no-op scaffold marker without mutating DOM or installing listeners', () => {
    const dom = new JSDOM('<!doctype html><html><body><ytd-app></ytd-app></body></html>', {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    const beforeHtml = dom.window.document.documentElement.outerHTML;
    const windowAddEventListener = vi.spyOn(dom.window, 'addEventListener');
    const documentAddEventListener = vi.spyOn(dom.window.document, 'addEventListener');

    expect(
      initMainWorldBridge({
        window: dom.window,
        document: dom.window.document,
      }),
    ).toEqual({
      kind: 'youtube-main-world-bridge',
      marker: MAIN_WORLD_BRIDGE_MARKER,
      listenersInstalled: false,
    });
    expect(dom.window.document.documentElement.outerHTML).toBe(beforeHtml);
    expect(windowAddEventListener).not.toHaveBeenCalled();
    expect(documentAddEventListener).not.toHaveBeenCalled();
  });
});
