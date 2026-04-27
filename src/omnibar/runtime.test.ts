import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { createOmnibarRuntime } from './runtime';
import { createStaticOmnibarMode, getActiveOmnibarMode } from './state';
import type { OmnibarItem, OmnibarMode } from './types';

function makeDom(): JSDOM {
  return new JSDOM('<!doctype html><html><body><main id="page"><button>Native page control</button></main></body></html>', {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  });
}

function makeMode(items: readonly OmnibarItem[], id = 'root', title = 'Root'): OmnibarMode {
  return createStaticOmnibarMode({
    id,
    title,
    placeholder: `Search ${title}`,
    items,
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

function input(document: Document): HTMLInputElement {
  const element = document.querySelector<HTMLInputElement>('[data-vilify-omnibar-input="true"]');
  expect(element).not.toBeNull();
  return element!;
}

function itemIds(document: Document): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-vilify-omnibar-item]')).map(
    (element) => element.dataset.itemId ?? '',
  );
}

function selectedItemId(document: Document): string | undefined {
  return document.querySelector<HTMLElement>('[data-vilify-omnibar-item][data-selected="true"]')?.dataset.itemId;
}

describe('createOmnibarRuntime', () => {
  it('updates the query from the focused input and re-renders filtered results', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([
        { id: 'alpha', title: 'Alpha command', action: { kind: 'noop' } },
        { id: 'beta', title: 'Beta command', action: { kind: 'noop' } },
      ]),
    });

    runtime.open();
    expect(itemIds(dom.window.document)).toEqual(['alpha', 'beta']);

    const search = input(dom.window.document);
    search.value = 'bet';
    search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

    expect(runtime.getState().query).toBe('bet');
    expect(itemIds(dom.window.document)).toEqual(['beta']);
    expect(input(dom.window.document).value).toBe('bet');
  });

  it('keeps ArrowUp and ArrowDown selection navigation in bounds and marks the selected row', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([
        { id: 'alpha', title: 'Alpha command', action: { kind: 'noop' } },
        { id: 'beta', title: 'Beta command', action: { kind: 'noop' } },
      ]),
    });

    runtime.open();
    expect(runtime.getState().selectedIndex).toBe(0);
    expect(selectedItemId(dom.window.document)).toBe('alpha');

    const down = pressKey(dom.window, input(dom.window.document), 'ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    expect(runtime.getState().selectedIndex).toBe(1);
    expect(selectedItemId(dom.window.document)).toBe('beta');

    pressKey(dom.window, input(dom.window.document), 'ArrowDown');
    expect(runtime.getState().selectedIndex).toBe(1);
    expect(selectedItemId(dom.window.document)).toBe('beta');

    const up = pressKey(dom.window, input(dom.window.document), 'ArrowUp');
    expect(up.defaultPrevented).toBe(true);
    expect(runtime.getState().selectedIndex).toBe(0);
    expect(selectedItemId(dom.window.document)).toBe('alpha');

    pressKey(dom.window, input(dom.window.document), 'ArrowUp');
    expect(runtime.getState().selectedIndex).toBe(0);
    expect(selectedItemId(dom.window.document)).toBe('alpha');
  });

  it('invokes the selected custom action through Enter', () => {
    const dom = makeDom();
    const execute = vi.fn(() => ({ kind: 'close' as const }));
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([
        {
          id: 'run-placeholder',
          title: 'Run placeholder action',
          action: { kind: 'custom', execute },
        },
      ]),
    });

    runtime.open();
    const event = pressKey(dom.window, input(dom.window.document), 'Enter');

    expect(event.defaultPrevented).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({ id: 'run-placeholder' }),
        state: expect.objectContaining({ open: true }),
      }),
    );
    expect(runtime.getState().open).toBe(false);
    expect(dom.window.document.querySelector('[data-vilify-omnibar-input="true"]')).toBeNull();
  });

  it('closes on Escape at the root mode and then leaves normal keys alone', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([{ id: 'alpha', title: 'Alpha command', action: { kind: 'noop' } }]),
    });

    runtime.open();
    const escape = pressKey(dom.window, input(dom.window.document), 'Escape');

    expect(escape.defaultPrevented).toBe(true);
    expect(runtime.getState().open).toBe(false);
    expect(dom.window.document.querySelector('[data-vilify-omnibar-input="true"]')).toBeNull();

    const nativeKey = pressKey(dom.window, dom.window.document.body, 'a');
    expect(nativeKey.defaultPrevented).toBe(false);
  });

  it('pops a nested mode on Escape without mutating the page DOM outside Vilify root', () => {
    const dom = makeDom();
    const beforePageHtml = dom.window.document.getElementById('page')?.outerHTML;
    const nestedMode = makeMode(
      [{ id: 'nested-item', title: 'Nested placeholder item', action: { kind: 'noop' } }],
      'nested',
      'Nested',
    );
    const rootMode = makeMode([
      {
        id: 'open-nested',
        title: 'Open nested placeholder mode',
        action: { kind: 'push-mode', mode: nestedMode },
      },
    ]);
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode,
    });

    runtime.open();
    pressKey(dom.window, input(dom.window.document), 'Enter');

    expect(runtime.getState().modeStack.map((mode) => mode.id)).toEqual(['root', 'nested']);
    expect(getActiveOmnibarMode(runtime.getState()).id).toBe('nested');
    expect(itemIds(dom.window.document)).toEqual(['nested-item']);

    const escape = pressKey(dom.window, input(dom.window.document), 'Escape');

    expect(escape.defaultPrevented).toBe(true);
    expect(runtime.getState().open).toBe(true);
    expect(runtime.getState().modeStack.map((mode) => mode.id)).toEqual(['root']);
    expect(getActiveOmnibarMode(runtime.getState()).id).toBe('root');
    expect(itemIds(dom.window.document)).toEqual(['open-nested']);
    expect(dom.window.document.getElementById('page')?.outerHTML).toBe(beforePageHtml);
  });
});
