import { isPromiseLike } from './async';
import {
  closeOmnibar,
  collectOmnibarItems,
  createDefaultOmnibarMode,
  createInitialOmnibarState,
  escapeOmnibar,
  executeOmnibarAction,
  getActiveOmnibarMode,
  moveOmnibarSelection,
  normalizeOmnibarSelection,
  openOmnibar,
  pushOmnibarMode,
  setOmnibarQuery,
} from './state';
import { getOpenOmnibarKeyIntent, isEditableTarget, isOmnibarOpenerKey } from './keyboard';
import type {
  OmnibarActionExecution,
  OmnibarActionExecutor,
  OmnibarActionResult,
  OmnibarItem,
  OmnibarMode,
  OmnibarState,
  ProviderContext,
} from './types';

export interface OmnibarRuntimeOptions {
  readonly document: Document;
  readonly rootMode?: OmnibarMode;
  readonly providerContext?: ProviderContext;
  readonly actionExecutor?: OmnibarActionExecutor;
}

export interface OmnibarRuntime {
  readonly root: HTMLElement;
  getState(): OmnibarState;
  open(): void;
  close(): void;
  destroy(): void;
}

const omnibarRuntimeByDocument = new WeakMap<Document, OmnibarRuntime>();

export function createOmnibarRuntime(options: OmnibarRuntimeOptions): OmnibarRuntime {
  const document = options.document;
  const existingRuntime = omnibarRuntimeByDocument.get(document);
  if (existingRuntime) {
    return existingRuntime;
  }

  const rootMode = options.rootMode ?? createDefaultOmnibarMode();
  const suppliedProviderContext = options.providerContext;
  const requestRender = () => render();
  const providerContext: ProviderContext = {
    ...(suppliedProviderContext ?? {}),
    get document() {
      return document;
    },
    get location() {
      return suppliedProviderContext?.location ?? document.location ?? undefined;
    },
    requestRender,
  };
  const actionExecutor = options.actionExecutor ?? executeOmnibarAction;
  const root = document.createElement('div');
  let state = createInitialOmnibarState(rootMode);
  let destroyed = false;

  root.id = 'vilify-omnibar-root';
  root.dataset.vilifyOmnibarRoot = 'true';
  root.hidden = true;

  function getVisibleItems(): readonly OmnibarItem[] {
    return collectOmnibarItems(state, providerContext);
  }

  function ensureRootMounted(): void {
    if (root.isConnected) {
      return;
    }

    (document.body ?? document.documentElement).appendChild(root);
  }

  function focusInput(input: HTMLInputElement): void {
    input.focus({ preventScroll: true });
    try {
      input.setSelectionRange(input.value.length, input.value.length);
    } catch {
      // Some input implementations do not support selection ranges. Focus is enough.
    }
  }

  function render(): void {
    if (destroyed) {
      return;
    }

    root.dataset.open = state.open ? 'true' : 'false';

    if (!state.open) {
      root.hidden = true;
      root.replaceChildren();
      return;
    }

    ensureRootMounted();
    const items = getVisibleItems();
    state = normalizeOmnibarSelection(state, items.length);

    root.hidden = false;
    root.replaceChildren(
      renderStyle(),
      renderOverlay(items),
    );

    const input = root.querySelector<HTMLInputElement>('[data-vilify-omnibar-input="true"]');
    if (input) {
      focusInput(input);
    }
  }

  function renderStyle(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      #vilify-omnibar-root {
        all: initial;
        --vilify-omnibar-bg: #050505;
        --vilify-omnibar-fg: #e7e7e7;
        --vilify-omnibar-muted: #8a8a8a;
        --vilify-omnibar-border: #777777;
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        pointer-events: none;
        color: var(--vilify-omnibar-fg);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 13px;
        line-height: 1.35;
      }
      #vilify-omnibar-root[hidden] { display: none !important; }
      #vilify-omnibar-root * { box-sizing: border-box; }
      #vilify-omnibar-root .vilify-omnibar-panel {
        pointer-events: auto;
        width: min(88ch, calc(100vw - 24px));
        margin: 8vh auto 0;
        color: var(--vilify-omnibar-fg);
        background: var(--vilify-omnibar-bg);
        border: 1px solid var(--vilify-omnibar-border);
        border-radius:0;
        box-shadow: none;
        overflow: hidden;
      }
      #vilify-omnibar-root .vilify-omnibar-header,
      #vilify-omnibar-root .vilify-omnibar-prompt {
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr);
        align-items: center;
        gap: 1ch;
        min-height: 2rem;
        padding: 0.35rem 1ch;
        border-bottom: 1px solid var(--vilify-omnibar-border);
      }
      #vilify-omnibar-root .vilify-omnibar-title,
      #vilify-omnibar-root .vilify-omnibar-mode {
        margin: 0;
        color: var(--vilify-omnibar-muted);
        font: inherit;
        font-weight: 600;
        letter-spacing: 0;
        text-transform: none;
        white-space: nowrap;
      }
      #vilify-omnibar-root .vilify-omnibar-title::after,
      #vilify-omnibar-root .vilify-omnibar-prompt-mark {
        content: " ❯";
        color: var(--vilify-omnibar-fg);
        font-weight: 400;
      }
      #vilify-omnibar-root input {
        all: unset;
        display: block;
        min-width: 0;
        width: 100%;
        color: var(--vilify-omnibar-fg);
        caret-color: var(--vilify-omnibar-fg);
        font: inherit;
        line-height: 1.35;
      }
      #vilify-omnibar-root input::placeholder { color: var(--vilify-omnibar-muted); }
      #vilify-omnibar-root .vilify-omnibar-results {
        max-height: min(22rem, 52vh);
        overflow: auto;
        padding: 0.25rem 0;
      }
      #vilify-omnibar-root .vilify-omnibar-row {
        display: flex;
        align-items: baseline;
        gap: 2ch;
        width: 100%;
        min-height: 1.45rem;
        padding: 0 1ch;
        border-radius:0;
        color: var(--vilify-omnibar-fg);
        white-space: nowrap;
        overflow: hidden;
      }
      #vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] {
        background: var(--vilify-omnibar-fg);
        color: var(--vilify-omnibar-bg);
        border-radius:0;
      }
      #vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-cursor,
      #vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-kind,
      #vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-item-title,
      #vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-item-subtitle,
      #vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-status {
        color: var(--vilify-omnibar-bg);
      }
      #vilify-omnibar-root .vilify-omnibar-cursor {
        flex: 0 0 1ch;
        color: var(--vilify-omnibar-muted);
      }
      #vilify-omnibar-root .vilify-omnibar-kind {
        flex: 0 0 auto;
        color: var(--vilify-omnibar-muted);
        text-transform: lowercase;
      }
      #vilify-omnibar-root .vilify-omnibar-item-title {
        flex: 0 1 auto;
        min-width: 0;
        color: inherit;
        font: inherit;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #vilify-omnibar-root .vilify-omnibar-item-subtitle {
        flex: 1 1 auto;
        min-width: 8ch;
        color: var(--vilify-omnibar-muted);
        font: inherit;
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #vilify-omnibar-root .vilify-omnibar-footer,
      #vilify-omnibar-root .vilify-omnibar-status-row {
        padding: 0.25rem 1ch;
        border-top: 1px solid var(--vilify-omnibar-border);
        color: var(--vilify-omnibar-muted);
        white-space: nowrap;
      }
      #vilify-omnibar-root .vilify-omnibar-empty {
        padding: 0.25rem 1ch;
        color: var(--vilify-omnibar-muted);
        font: inherit;
        white-space: nowrap;
      }
      #vilify-omnibar-root .vilify-omnibar-status {
        color: var(--vilify-omnibar-muted);
        font: inherit;
        white-space: nowrap;
      }
      #vilify-omnibar-root .vilify-omnibar-status[data-tone="error"],
      #vilify-omnibar-root .vilify-omnibar-status-row[data-tone="error"] {
        color: var(--vilify-omnibar-fg);
      }
    `;
    return style;
  }

  function renderOverlay(items: readonly OmnibarItem[]): HTMLDivElement {
    const activeMode = getActiveOmnibarMode(state);
    const overlay = document.createElement('div');
    overlay.className = 'vilify-omnibar-overlay';
    overlay.setAttribute('role', 'presentation');

    const panel = document.createElement('div');
    panel.className = 'vilify-omnibar-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Vilify omnibar');

    const prompt = document.createElement('div');
    prompt.className = 'vilify-omnibar-prompt';

    const promptLabel = document.createElement('span');
    const mode = document.createElement('span');
    mode.className = 'vilify-omnibar-mode';
    mode.textContent = activeMode.title.toLowerCase();

    const promptMark = document.createElement('span');
    promptMark.className = 'vilify-omnibar-prompt-mark';
    promptMark.textContent = '❯ :';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = state.query;
    input.placeholder = activeMode.placeholder ?? 'Search Vilify';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.dataset.vilifyOmnibarInput = 'true';
    input.setAttribute('aria-label', 'Search Vilify commands');
    input.addEventListener('input', () => {
      state = setOmnibarQuery(state, input.value);
      render();
    });
    input.addEventListener('keydown', (event) => {
      if (!getOpenOmnibarKeyIntent(event)) {
        event.stopPropagation();
      }
    });

    const footer = document.createElement('div');
    footer.className = 'vilify-omnibar-footer';
    footer.setAttribute('role', 'status');
    footer.textContent = `${items.length} ${items.length === 1 ? 'result' : 'results'} · ↑/↓ or ctrl+n/ctrl+p move · enter select · esc close`;

    promptLabel.append(mode, ' ', promptMark);
    prompt.append(promptLabel, input);
    panel.append(prompt, renderResults(items), footer);
    overlay.append(panel);
    return overlay;
  }

  function renderResults(items: readonly OmnibarItem[]): HTMLDivElement {
    const results = document.createElement('div');
    results.className = 'vilify-omnibar-results';
    results.setAttribute('role', 'listbox');
    results.dataset.vilifyOmnibarResults = 'true';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vilify-omnibar-empty';
      empty.textContent = '-- no matches --';
      results.append(empty);
      return results;
    }

    for (const [index, item] of items.entries()) {
      results.append(renderItem(item, index === state.selectedIndex));
    }

    return results;
  }

  function renderItem(item: OmnibarItem, selected: boolean): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'vilify-omnibar-row';
    row.dataset.vilifyOmnibarItem = 'true';
    row.dataset.itemId = item.id;
    row.dataset.itemKind = item.kind;
    row.dataset.selected = selected ? 'true' : 'false';
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', selected ? 'true' : 'false');

    const cursor = document.createElement('span');
    cursor.className = 'vilify-omnibar-cursor';
    cursor.textContent = selected ? '>' : '';

    const kind = document.createElement('span');
    kind.className = 'vilify-omnibar-kind';
    kind.textContent = item.kind === 'status' ? '!' : item.kind;

    const title = document.createElement('span');
    title.className = item.kind === 'status'
      ? 'vilify-omnibar-item-title vilify-omnibar-status'
      : 'vilify-omnibar-item-title';
    title.textContent = item.title;

    row.append(cursor, kind, title);

    if (item.subtitle) {
      const subtitle = document.createElement('span');
      subtitle.className = 'vilify-omnibar-item-subtitle';
      subtitle.textContent = item.subtitle;
      row.append(subtitle);
    }

    return row;
  }

  function applyActionResult(result: OmnibarActionResult | void): void {
    switch (result?.kind ?? 'none') {
      case 'none':
        state = normalizeOmnibarSelection(state, getVisibleItems().length);
        break;
      case 'close':
        state = closeOmnibar(state);
        break;
      case 'push-mode':
        state = pushOmnibarMode(state, result.mode);
        break;
      case 'status':
        state = normalizeOmnibarSelection(state, getVisibleItems().length);
        break;
    }

    render();
  }

  function applyActionExecution(execution: OmnibarActionExecution): void {
    if (isPromiseLike(execution)) {
      execution
        .then((result) => applyActionResult(result))
        .catch((error) => applyActionResult(statusFromActionError(error)));
      return;
    }

    applyActionResult(execution);
  }

  function executeSelectedItem(): void {
    const items = getVisibleItems();
    if (items.length === 0) {
      render();
      return;
    }

    const selectedIndex = Math.min(state.selectedIndex, items.length - 1);
    const item = items[selectedIndex];
    const result = actionExecutor(item.action, {
      item,
      state,
      providerContext,
    });

    applyActionExecution(result);
  }

  function handleDocumentKeyDown(event: KeyboardEvent): void {
    if (destroyed) {
      return;
    }

    if (state.open) {
      const intent = getOpenOmnibarKeyIntent(event);
      if (!intent) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      switch (intent) {
        case 'move-up':
          state = moveOmnibarSelection(state, -1, getVisibleItems().length);
          render();
          return;
        case 'move-down':
          state = moveOmnibarSelection(state, 1, getVisibleItems().length);
          render();
          return;
        case 'execute':
          executeSelectedItem();
          return;
        case 'escape':
          state = escapeOmnibar(state);
          render();
          return;
      }
    }

    if (!isOmnibarOpenerKey(event) || isEditableTarget(event.target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    state = openOmnibar(state);
    render();
  }

  function statusFromActionError(error: unknown): OmnibarActionResult {
    const detail = error instanceof Error && error.message ? `: ${error.message}` : '';
    return {
      kind: 'status',
      tone: 'error',
      message: `Could not execute omnibar action${detail}`,
    };
  }

  document.addEventListener('keydown', handleDocumentKeyDown, true);

  const runtime: OmnibarRuntime = {
    root,
    getState: () => state,
    open: () => {
      state = openOmnibar(state);
      render();
    },
    close: () => {
      state = closeOmnibar(state);
      render();
    },
    destroy: () => {
      if (destroyed) {
        return;
      }

      destroyed = true;
      document.removeEventListener('keydown', handleDocumentKeyDown, true);
      root.replaceChildren();
      root.remove();
      omnibarRuntimeByDocument.delete(document);
    },
  };

  omnibarRuntimeByDocument.set(document, runtime);
  return runtime;
}
