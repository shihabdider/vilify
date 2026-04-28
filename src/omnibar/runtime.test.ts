import { describe, expect, it, vi } from 'vitest';
import { createOmnibarRuntime } from './runtime';
import { createStaticOmnibarMode, getActiveOmnibarMode } from './state';
import {
  makeOmnibarTestDom as makeDom,
  omnibarItemIds as itemIds,
  omnibarModeLabel as modeLabel,
  pressKey,
  requireOmnibarInput as input,
  setOmnibarInputValue,
} from '../test-helpers/omnibar';
import type { SitePlugin } from '../plugins/types';
import type { OmnibarItem, OmnibarMode } from './types';

function makeMode(items: readonly OmnibarItem[], id = 'root', title = 'Root'): OmnibarMode {
  return createStaticOmnibarMode({
    id,
    title,
    placeholder: `Search ${title}`,
    items,
  });
}

function resultsList(document: Document): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-vilify-omnibar-results="true"]');
  expect(element).not.toBeNull();
  return element!;
}

function selectedItemId(document: Document): string | undefined {
  return document.querySelector<HTMLElement>('[data-vilify-omnibar-item][data-selected="true"]')?.dataset.itemId;
}

function itemRow(document: Document, id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-vilify-omnibar-item][data-item-id="${id}"]`);
  expect(element).not.toBeNull();
  return element!;
}

function footerLine(document: Document): string | null {
  return document.querySelector('.vilify-omnibar-footer')?.textContent ?? null;
}

function omnibarStyleText(document: Document): string {
  const element = document.querySelector<HTMLStyleElement>('#vilify-omnibar-root style');
  expect(element).not.toBeNull();
  return element?.textContent ?? '';
}

function cssRule(styleText: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styleText.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  expect(match).not.toBeNull();
  return match?.[1] ?? '';
}

describe('createOmnibarRuntime', () => {
  it('injects compact monospace TUI panel CSS instead of a glassy rounded modal', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([{ id: 'alpha', kind: 'command', title: 'Alpha command', action: { kind: 'noop' } }]),
    });

    runtime.open();
    const styles = omnibarStyleText(dom.window.document);
    const rootRule = cssRule(styles, '#vilify-omnibar-root');
    const panelRule = cssRule(styles, '#vilify-omnibar-root .vilify-omnibar-panel');

    expect(rootRule).toMatch(/font-family:\s*ui-monospace,[^;]*monospace/);
    expect(panelRule).toMatch(/width:\s*min\((?:7[2-9]|8[0-8])ch,/);
    expect(panelRule).toMatch(/border:\s*1px\s+solid/);
    expect(panelRule).toMatch(/border-radius:\s*0\b/);
    expect(panelRule).toMatch(/box-shadow:\s*none/);
    expect(panelRule).not.toMatch(/backdrop-filter|blur\(|border-radius:\s*(?!0\b)[^;]+/i);
  });

  it('styles selected rows as square inverse video instead of a rounded blue pill', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([
        { id: 'alpha', kind: 'command', title: 'Alpha command', action: { kind: 'noop' } },
        { id: 'beta', kind: 'command', title: 'Beta command', action: { kind: 'noop' } },
      ]),
    });

    runtime.open();
    const styles = omnibarStyleText(dom.window.document);
    const rowRule = cssRule(styles, '#vilify-omnibar-root .vilify-omnibar-row');
    const selectedRule = cssRule(styles, '#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"]');

    expect(selectedItemId(dom.window.document)).toBe('alpha');
    expect(rowRule).toMatch(/white-space:\s*nowrap/);
    expect(rowRule).toMatch(/border-radius:\s*0\b/);
    expect(selectedRule).toMatch(/background:\s*var\(--vilify-omnibar-fg\)/);
    expect(selectedRule).toMatch(/color:\s*var\(--vilify-omnibar-bg\)/);
    expect(selectedRule).toMatch(/border-radius:\s*0\b/);
    expect(selectedRule).not.toMatch(/59,\s*130,\s*246|blue|border-radius:\s*(?!0\b)[^;]+/i);
  });

  it('exposes CSS anchors for prompt, metadata, footer, empty, and status rows', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([]),
    });

    runtime.open();
    const styles = omnibarStyleText(dom.window.document);

    for (const hook of [
      '.vilify-omnibar-prompt',
      '.vilify-omnibar-mode',
      '.vilify-omnibar-prompt-mark',
      '.vilify-omnibar-cursor',
      '.vilify-omnibar-kind',
      '.vilify-omnibar-item-title',
      '.vilify-omnibar-item-subtitle',
      '.vilify-omnibar-footer',
      '.vilify-omnibar-empty',
      '.vilify-omnibar-status',
      '.vilify-omnibar-status-row',
    ]) {
      expect(styles).toContain(hook);
    }

    expect(cssRule(styles, '#vilify-omnibar-root .vilify-omnibar-kind')).toMatch(
      /color:\s*var\(--vilify-omnibar-muted\)/,
    );
    expect(cssRule(styles, '#vilify-omnibar-root .vilify-omnibar-empty')).toMatch(
      /color:\s*var\(--vilify-omnibar-muted\)/,
    );
  });

  it('renders the active mode as a terminal prompt with focused input and footer status', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode(
        [
          { id: 'alpha', kind: 'command', title: 'Alpha command', action: { kind: 'noop' } },
          { id: 'beta', kind: 'command', title: 'Beta command', action: { kind: 'noop' } },
        ],
        'youtube-root',
        'YouTube',
      ),
    });

    runtime.open();
    const prompt = dom.window.document.querySelector<HTMLElement>('.vilify-omnibar-prompt');
    const search = input(dom.window.document);
    const footer = dom.window.document.querySelector<HTMLElement>('.vilify-omnibar-footer');

    expect(prompt).not.toBeNull();
    expect(dom.window.document.querySelector('.vilify-omnibar-header')).toBeNull();
    expect(dom.window.document.querySelector('.vilify-omnibar-title')).toBeNull();
    expect(prompt?.querySelector('.vilify-omnibar-mode')?.textContent).toBe('youtube');
    expect(prompt?.querySelector('.vilify-omnibar-prompt-mark')?.textContent).toBe('❯ :');
    expect(prompt?.contains(search)).toBe(true);
    expect(search.placeholder).toBe('Search YouTube');
    expect(dom.window.document.activeElement).toBe(search);
    expect(footer).not.toBeNull();
    expect(footer?.textContent).toContain('2 results');
    expect(footer?.textContent?.toLowerCase()).toContain('enter');
    expect(footer?.textContent?.toLowerCase()).toContain('esc');
  });

  it('renders empty result collections as an inline terminal no-matches row', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([]),
    });

    runtime.open();
    const results = resultsList(dom.window.document);
    const empty = results.querySelector<HTMLElement>('.vilify-omnibar-empty, .vilify-omnibar-status-row');

    expect(results.getAttribute('role')).toBe('listbox');
    expect(results.dataset.vilifyOmnibarResults).toBe('true');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toBe('-- no matches --');
    expect(
      Boolean(
        empty?.classList.contains('vilify-omnibar-empty') ||
          empty?.classList.contains('vilify-omnibar-status-row'),
      ),
    ).toBe(true);
    expect(results.querySelector('[data-vilify-omnibar-item]')).toBeNull();
    expect(results.textContent).not.toContain('No placeholder results');
  });

  it('renders non-empty result collections as a listbox of selectable item rows', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([
        { id: 'alpha', kind: 'command', title: 'Alpha command', action: { kind: 'noop' } },
        { id: 'beta', kind: 'video-action', title: 'Beta video action', action: { kind: 'noop' } },
        { id: 'gamma', kind: 'search-result', title: 'Gamma result', action: { kind: 'noop' } },
      ]),
    });

    runtime.open();
    pressKey(dom.window, input(dom.window.document), 'ArrowDown');

    const results = resultsList(dom.window.document);
    const rows = Array.from(results.querySelectorAll<HTMLElement>('[data-vilify-omnibar-item="true"]'));

    expect(runtime.getState().selectedIndex).toBe(1);
    expect(results.getAttribute('role')).toBe('listbox');
    expect(results.dataset.vilifyOmnibarResults).toBe('true');
    expect(rows.map((row) => row.dataset.itemId)).toEqual(['alpha', 'beta', 'gamma']);
    expect(rows.map((row) => row.dataset.itemKind)).toEqual(['command', 'video-action', 'search-result']);
    expect(rows.map((row) => row.getAttribute('role'))).toEqual(['option', 'option', 'option']);
    expect(rows.map((row) => row.dataset.selected)).toEqual(['false', 'true', 'false']);
    expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(selectedItemId(dom.window.document)).toBe('beta');
  });

  it('renders each item as a one-line terminal row with cursor, kind, title, and subtitle hooks', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([
        {
          id: 'copy-url',
          kind: 'command',
          title: 'Copy URL',
          subtitle: 'Writes the current watch URL to the clipboard',
          action: { kind: 'noop' },
        },
        { id: 'go-home', kind: 'navigation', title: 'Open Home', action: { kind: 'noop' } },
      ]),
    });

    runtime.open();
    const selectedRow = itemRow(dom.window.document, 'copy-url');
    const unselectedRow = itemRow(dom.window.document, 'go-home');

    expect(selectedRow.dataset.itemKind).toBe('command');
    expect(selectedRow.dataset.selected).toBe('true');
    expect(selectedRow.getAttribute('role')).toBe('option');
    expect(selectedRow.getAttribute('aria-selected')).toBe('true');
    expect(Array.from(selectedRow.children).map((child) => child.className)).toEqual([
      'vilify-omnibar-cursor',
      'vilify-omnibar-kind',
      'vilify-omnibar-item-title',
      'vilify-omnibar-item-subtitle',
    ]);
    expect(selectedRow.querySelector('.vilify-omnibar-cursor')?.textContent).toBe('>');
    expect(selectedRow.querySelector('.vilify-omnibar-kind')?.textContent).toBe('command');
    expect(selectedRow.querySelector('.vilify-omnibar-item-title')?.textContent).toBe('Copy URL');
    expect(selectedRow.querySelector('.vilify-omnibar-item-subtitle')?.textContent).toBe(
      'Writes the current watch URL to the clipboard',
    );

    expect(unselectedRow.dataset.itemKind).toBe('navigation');
    expect(unselectedRow.dataset.selected).toBe('false');
    expect(unselectedRow.getAttribute('aria-selected')).toBe('false');
    expect(Array.from(unselectedRow.children).map((child) => child.className)).toEqual([
      'vilify-omnibar-cursor',
      'vilify-omnibar-kind',
      'vilify-omnibar-item-title',
    ]);
    expect(unselectedRow.querySelector('.vilify-omnibar-cursor')?.textContent).not.toContain('>');
    expect(unselectedRow.querySelector('.vilify-omnibar-kind')?.textContent).toBe('navigation');
    expect(unselectedRow.querySelector('.vilify-omnibar-item-title')?.textContent).toBe('Open Home');
    expect(unselectedRow.querySelector('.vilify-omnibar-item-subtitle')).toBeNull();
  });

  it('renders status-kind items with inline terminal status grammar while preserving item hooks', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([
        {
          id: 'transcript-unavailable',
          kind: 'status',
          title: 'Transcript unavailable',
          subtitle: 'Timed out while loading transcript data',
          action: { kind: 'noop' },
        },
      ]),
    });

    runtime.open();
    const row = itemRow(dom.window.document, 'transcript-unavailable');

    expect(row.dataset.itemKind).toBe('status');
    expect(row.dataset.selected).toBe('true');
    expect(row.getAttribute('role')).toBe('option');
    expect(row.getAttribute('aria-selected')).toBe('true');
    expect(row.querySelector('.vilify-omnibar-cursor')?.textContent).toBe('>');
    expect(row.querySelector('.vilify-omnibar-kind')?.textContent).toBe('!');
    expect(row.querySelector('.vilify-omnibar-status')?.textContent).toBe('Transcript unavailable');
    expect(row.querySelector('.vilify-omnibar-item-title')?.textContent).toBe('Transcript unavailable');
    expect(row.querySelector('.vilify-omnibar-item-subtitle')?.textContent).toBe(
      'Timed out while loading transcript data',
    );
  });

  it('updates the query from the focused input and re-renders filtered results', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([
        { id: 'alpha', kind: 'command', title: 'Alpha command', action: { kind: 'noop' } },
        { id: 'beta', kind: 'command', title: 'Beta command', action: { kind: 'noop' } },
      ]),
    });

    runtime.open();
    expect(itemIds(dom.window.document)).toEqual(['alpha', 'beta']);
    expect(footerLine(dom.window.document)).toContain('2 results');

    const search = input(dom.window.document);
    expect(dom.window.document.activeElement).toBe(search);
    setOmnibarInputValue(dom.window, dom.window.document, 'bet');

    expect(runtime.getState().query).toBe('bet');
    expect(itemIds(dom.window.document)).toEqual(['beta']);
    expect(input(dom.window.document).value).toBe('bet');
    expect(dom.window.document.activeElement).toBe(input(dom.window.document));
    expect(footerLine(dom.window.document)).toContain('1 result');
  });

  it('keeps ArrowUp and ArrowDown selection navigation in bounds and marks the selected row', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([
        { id: 'alpha', kind: 'command', title: 'Alpha command', action: { kind: 'noop' } },
        { id: 'beta', kind: 'command', title: 'Beta command', action: { kind: 'noop' } },
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

  it('keeps Ctrl+n and Ctrl+p selection navigation in the same bounds as arrows', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([
        { id: 'alpha', kind: 'command', title: 'Alpha command', action: { kind: 'noop' } },
        { id: 'beta', kind: 'command', title: 'Beta command', action: { kind: 'noop' } },
      ]),
    });

    runtime.open();
    expect(runtime.getState().selectedIndex).toBe(0);
    expect(selectedItemId(dom.window.document)).toBe('alpha');

    const down = pressKey(dom.window, input(dom.window.document), 'n', { ctrlKey: true });
    expect(down.defaultPrevented).toBe(true);
    expect(runtime.getState().selectedIndex).toBe(1);
    expect(selectedItemId(dom.window.document)).toBe('beta');

    pressKey(dom.window, input(dom.window.document), 'n', { ctrlKey: true });
    expect(runtime.getState().selectedIndex).toBe(1);
    expect(selectedItemId(dom.window.document)).toBe('beta');

    const up = pressKey(dom.window, input(dom.window.document), 'p', { ctrlKey: true });
    expect(up.defaultPrevented).toBe(true);
    expect(runtime.getState().selectedIndex).toBe(0);
    expect(selectedItemId(dom.window.document)).toBe('alpha');

    pressKey(dom.window, input(dom.window.document), 'p', { ctrlKey: true });
    expect(runtime.getState().selectedIndex).toBe(0);
    expect(selectedItemId(dom.window.document)).toBe('alpha');
  });

  it('does not intercept Ctrl+n or Ctrl+p while closed', () => {
    const dom = makeDom();
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([{ id: 'alpha', kind: 'command', title: 'Alpha command', action: { kind: 'noop' } }]),
    });
    const pageButton = dom.window.document.querySelector('button');
    expect(pageButton).not.toBeNull();

    const ctrlN = pressKey(dom.window, pageButton!, 'n', { ctrlKey: true });
    expect(ctrlN.defaultPrevented).toBe(false);
    expect(runtime.getState().open).toBe(false);
    expect(dom.window.document.querySelector('[data-vilify-omnibar-input="true"]')).toBeNull();

    const ctrlP = pressKey(dom.window, pageButton!, 'p', { ctrlKey: true });
    expect(ctrlP.defaultPrevented).toBe(false);
    expect(runtime.getState().open).toBe(false);
    expect(dom.window.document.querySelector('[data-vilify-omnibar-input="true"]')).toBeNull();
  });

  it('invokes the selected custom action through Enter', () => {
    const dom = makeDom();
    const execute = vi.fn(() => ({ kind: 'close' as const }));
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: makeMode([
        {
          id: 'run-placeholder',
          kind: 'command',
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
      rootMode: makeMode([{ id: 'alpha', kind: 'command', title: 'Alpha command', action: { kind: 'noop' } }]),
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
      [{ id: 'nested-item', kind: 'status', title: 'Nested placeholder item', action: { kind: 'noop' } }],
      'nested',
      'Nested',
    );
    const rootMode = makeMode([
      {
        id: 'open-nested',
        kind: 'command',
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

  it('renders a fake plugin mode and provider without YouTube coupling', () => {
    const dom = makeDom('https://example.test/tool');
    const url = new URL(dom.window.location.href);
    const provider = vi.fn((_context, query: string) => [
      {
        id: query ? `fake-${query}` : 'fake-all',
        kind: 'command' as const,
        title: query ? `Fake result for ${query}` : 'All fake results',
        action: { kind: 'noop' as const },
      },
    ]);
    const fakeMode: OmnibarMode = {
      id: 'fake-root',
      title: 'Fake Site',
      placeholder: 'Search fake provider',
      providers: [{ id: 'fake-provider', getItems: provider }],
    };
    const fakePlugin: SitePlugin = {
      id: 'fake-site',
      matches: () => true,
      defaultModeId: fakeMode.id,
      modes: [fakeMode],
    };
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: fakeMode,
      providerContext: {
        location: dom.window.location,
        activePlugin: { plugin: fakePlugin, url },
      },
    });

    runtime.open();

    expect(modeLabel(dom.window.document)).toBe('fake site');
    expect(input(dom.window.document).placeholder).toBe('Search fake provider');
    expect(itemIds(dom.window.document)).toEqual(['fake-all']);
    expect(provider).toHaveBeenLastCalledWith(
      expect.objectContaining({ activePlugin: { plugin: fakePlugin, url } }),
      '',
    );

    setOmnibarInputValue(dom.window, dom.window.document, 'needle');

    expect(itemIds(dom.window.document)).toEqual(['fake-needle']);
    expect(provider).toHaveBeenLastCalledWith(
      expect.objectContaining({ activePlugin: { plugin: fakePlugin, url } }),
      'needle',
    );
  });
});
