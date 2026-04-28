import { expect } from 'vitest';
import { JSDOM } from 'jsdom';

const DEFAULT_WATCH_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const DEFAULT_OMNIBAR_TEST_BODY = '<main id="page"><button>Native page control</button></main>';
const DEFAULT_YOUTUBE_WATCH_BODY = '<main id="page"><button id="native-control">Native page control</button></main>';
const OMNIBAR_INPUT_SELECTOR = '[data-vilify-omnibar-input="true"]';
const OMNIBAR_ITEM_SELECTOR = '[data-vilify-omnibar-item]';
const OMNIBAR_MODE_SELECTOR = '.vilify-omnibar-mode';

export function makeOmnibarTestDom(
  url = DEFAULT_WATCH_URL,
  body = DEFAULT_OMNIBAR_TEST_BODY,
): JSDOM {
  return new JSDOM(`<!doctype html><html><body>${body}</body></html>`, {
    url,
  });
}

export function makeYouTubeWatchDom(videoId: string, body = DEFAULT_YOUTUBE_WATCH_BODY): JSDOM {
  return makeOmnibarTestDom(`https://www.youtube.com/watch?v=${videoId}`, body);
}

export function domDocumentLocation(dom: JSDOM): { readonly document: Document; readonly location: Location } {
  return {
    document: dom.window.document,
    location: dom.window.location,
  };
}

export function pushDomHistory(dom: JSDOM, url: string): void {
  dom.window.history.pushState({}, '', url);
}

export function reconfigureDomUrl(dom: JSDOM, url: string): void {
  dom.reconfigure({ url });
}

export function createKeyDownEvent(
  window: Window,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  return new window.KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
}

export function pressKey(
  window: Window,
  target: EventTarget,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = createKeyDownEvent(window, key, init);
  target.dispatchEvent(event);
  return event;
}

export function getOmnibarInput(document: Document): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>(OMNIBAR_INPUT_SELECTOR);
}

export function requireOmnibarInput(document: Document): HTMLInputElement {
  const element = getOmnibarInput(document);
  expect(element).not.toBeNull();
  return element!;
}

export function setOmnibarInputValue(
  window: Window,
  document: Document,
  value: string,
): HTMLInputElement {
  const element = requireOmnibarInput(document);
  element.value = value;
  element.dispatchEvent(new window.Event('input', { bubbles: true }));
  return element;
}

export function omnibarItemIds(document: Document): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>(OMNIBAR_ITEM_SELECTOR)).map(
    (element) => element.dataset.itemId ?? '',
  );
}

export function omnibarModeLabel(document: Document): string | null {
  return document.querySelector(OMNIBAR_MODE_SELECTOR)?.textContent ?? null;
}
