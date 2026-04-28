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

export function createOmnibarRuntime(options: OmnibarRuntimeOptions): OmnibarRuntime {
  const document = options.document;
  const rootMode = options.rootMode ?? createDefaultOmnibarMode();
  const providerContext: ProviderContext = {
    document,
    location: document.location ?? undefined,
    ...(options.providerContext ?? {}),
    requestRender: () => render(),
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
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        pointer-events: none;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #vilify-omnibar-root[hidden] { display: none !important; }
      #vilify-omnibar-root * { box-sizing: border-box; }
      #vilify-omnibar-root .vilify-omnibar-panel {
        pointer-events: auto;
        width: min(720px, calc(100vw - 32px));
        margin: 12vh auto 0;
        color: #f8fafc;
        background: rgba(15, 23, 42, 0.96);
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 14px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.36);
        overflow: hidden;
      }
      #vilify-omnibar-root .vilify-omnibar-header {
        padding: 10px 12px 8px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      }
      #vilify-omnibar-root .vilify-omnibar-title {
        margin: 0 0 8px;
        color: #cbd5e1;
        font: 600 12px/1.3 ui-sans-serif, system-ui, sans-serif;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      #vilify-omnibar-root input {
        all: unset;
        display: block;
        width: 100%;
        color: #f8fafc;
        font: 18px/1.4 ui-sans-serif, system-ui, sans-serif;
      }
      #vilify-omnibar-root input::placeholder { color: #64748b; }
      #vilify-omnibar-root .vilify-omnibar-results {
        max-height: min(420px, 52vh);
        overflow: auto;
        padding: 6px;
      }
      #vilify-omnibar-root .vilify-omnibar-row {
        display: block;
        width: 100%;
        padding: 10px 12px;
        border-radius: 10px;
        color: #e2e8f0;
      }
      #vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] {
        background: rgba(59, 130, 246, 0.26);
        color: #ffffff;
      }
      #vilify-omnibar-root .vilify-omnibar-item-title {
        font: 600 14px/1.35 ui-sans-serif, system-ui, sans-serif;
      }
      #vilify-omnibar-root .vilify-omnibar-item-subtitle,
      #vilify-omnibar-root .vilify-omnibar-empty {
        color: #94a3b8;
        font: 12px/1.35 ui-sans-serif, system-ui, sans-serif;
        margin-top: 2px;
      }
      #vilify-omnibar-root .vilify-omnibar-empty { padding: 12px; }
    `;
    return style;
  }

  function renderOverlay(items: readonly OmnibarItem[]): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'vilify-omnibar-overlay';
    overlay.setAttribute('role', 'presentation');

    const panel = document.createElement('div');
    panel.className = 'vilify-omnibar-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Vilify omnibar');

    const header = document.createElement('div');
    header.className = 'vilify-omnibar-header';

    const title = document.createElement('div');
    title.className = 'vilify-omnibar-title';
    title.textContent = getActiveOmnibarMode(state).title;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = state.query;
    input.placeholder = getActiveOmnibarMode(state).placeholder ?? 'Search Vilify';
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

    header.append(title, input);
    panel.append(header, renderResults(items));
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
      empty.textContent = 'No placeholder results';
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

    const title = document.createElement('div');
    title.className = 'vilify-omnibar-item-title';
    title.textContent = item.title;
    row.append(title);

    if (item.subtitle) {
      const subtitle = document.createElement('div');
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

  function isPromiseLike(value: unknown): value is PromiseLike<OmnibarActionResult | void> {
    return (
      value !== null &&
      typeof value === 'object' &&
      typeof (value as PromiseLike<unknown>).then === 'function'
    );
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

  return {
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
      destroyed = true;
      document.removeEventListener('keydown', handleDocumentKeyDown, true);
      root.replaceChildren();
      root.remove();
    },
  };
}
