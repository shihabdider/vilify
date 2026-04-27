import type {
  OmnibarAction,
  OmnibarActionContext,
  OmnibarActionResult,
  OmnibarItem,
  OmnibarMode,
  OmnibarModeId,
  OmnibarState,
  ProviderContext,
} from './types';

export interface StaticOmnibarModeInput {
  readonly id: OmnibarModeId;
  readonly title: string;
  readonly placeholder?: string;
  readonly items: readonly OmnibarItem[];
}

export function createStaticOmnibarMode(input: StaticOmnibarModeInput): OmnibarMode {
  return {
    id: input.id,
    title: input.title,
    placeholder: input.placeholder,
    providers: [
      {
        id: `${input.id}:static`,
        getItems: () => input.items,
      },
    ],
  };
}

export function createDefaultOmnibarMode(): OmnibarMode {
  const nestedMode = createStaticOmnibarMode({
    id: 'placeholder-nested',
    title: 'Placeholder mode',
    placeholder: 'Placeholder nested mode',
    items: [
      {
        id: 'placeholder-nested-item',
        title: 'Nested placeholder item',
        subtitle: 'Static placeholder result for future Vilify modes',
        keywords: ['nested', 'placeholder'],
        action: { kind: 'noop' },
      },
    ],
  });

  return createStaticOmnibarMode({
    id: 'root',
    title: 'Vilify',
    placeholder: 'Search Vilify commands',
    items: [
      {
        id: 'placeholder-command',
        title: 'Placeholder command',
        subtitle: 'Static command placeholder for the omnibar primitive',
        keywords: ['placeholder', 'command'],
        action: { kind: 'noop' },
      },
      {
        id: 'open-placeholder-mode',
        title: 'Open placeholder mode',
        subtitle: 'Demonstrates nested omnibar mode navigation',
        keywords: ['nested', 'mode', 'placeholder'],
        action: { kind: 'push-mode', mode: nestedMode },
      },
    ],
  });
}

export function createInitialOmnibarState(rootMode: OmnibarMode): OmnibarState {
  return {
    open: false,
    query: '',
    selectedIndex: 0,
    modeStack: [rootMode],
  };
}

export function getRootOmnibarMode(state: OmnibarState): OmnibarMode {
  const [rootMode] = state.modeStack;
  if (!rootMode) {
    throw new Error('Omnibar state requires at least one mode');
  }

  return rootMode;
}

export function getActiveOmnibarMode(state: OmnibarState): OmnibarMode {
  const activeMode = state.modeStack[state.modeStack.length - 1];
  if (!activeMode) {
    throw new Error('Omnibar state requires at least one mode');
  }

  return activeMode;
}

export function openOmnibar(state: OmnibarState): OmnibarState {
  return {
    ...state,
    open: true,
    query: '',
    selectedIndex: 0,
    modeStack: [getRootOmnibarMode(state)],
  };
}

export function closeOmnibar(state: OmnibarState): OmnibarState {
  return {
    ...state,
    open: false,
    query: '',
    selectedIndex: 0,
    modeStack: [getRootOmnibarMode(state)],
  };
}

export function setOmnibarQuery(state: OmnibarState, query: string): OmnibarState {
  return {
    ...state,
    query,
    selectedIndex: 0,
  };
}

export function moveOmnibarSelection(
  state: OmnibarState,
  delta: number,
  resultCount: number,
): OmnibarState {
  return {
    ...state,
    selectedIndex: clampSelectedIndex(state.selectedIndex + delta, resultCount),
  };
}

export function normalizeOmnibarSelection(state: OmnibarState, resultCount: number): OmnibarState {
  const selectedIndex = clampSelectedIndex(state.selectedIndex, resultCount);
  if (selectedIndex === state.selectedIndex) {
    return state;
  }

  return { ...state, selectedIndex };
}

export function pushOmnibarMode(state: OmnibarState, mode: OmnibarMode): OmnibarState {
  return {
    ...state,
    open: true,
    query: '',
    selectedIndex: 0,
    modeStack: [...state.modeStack, mode],
  };
}

export function popOmnibarMode(state: OmnibarState): OmnibarState {
  if (state.modeStack.length <= 1) {
    return closeOmnibar(state);
  }

  return {
    ...state,
    open: true,
    query: '',
    selectedIndex: 0,
    modeStack: state.modeStack.slice(0, -1),
  };
}

export function escapeOmnibar(state: OmnibarState): OmnibarState {
  return popOmnibarMode(state);
}

export function collectOmnibarItems(
  state: OmnibarState,
  providerContext: ProviderContext = {},
): readonly OmnibarItem[] {
  const mode = getActiveOmnibarMode(state);
  const items = mode.providers.flatMap((provider) => Array.from(provider.getItems(providerContext)));
  return filterOmnibarItems(items, state.query);
}

export function resolveSelectedOmnibarItem(
  state: OmnibarState,
  providerContext: ProviderContext = {},
): OmnibarItem | undefined {
  const items = collectOmnibarItems(state, providerContext);
  if (items.length === 0) {
    return undefined;
  }

  return items[clampSelectedIndex(state.selectedIndex, items.length)];
}

export function executeOmnibarAction(
  action: OmnibarAction,
  context: OmnibarActionContext,
): OmnibarActionResult {
  switch (action.kind) {
    case 'noop':
      return { kind: 'none' };
    case 'close':
      return { kind: 'close' };
    case 'push-mode':
      return { kind: 'push-mode', mode: action.mode };
    case 'custom':
      return action.execute(context) ?? { kind: 'none' };
  }
}

function filterOmnibarItems(items: readonly OmnibarItem[], query: string): readonly OmnibarItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return items;
  }

  return items.filter((item) => itemMatchesQuery(item, normalizedQuery));
}

function itemMatchesQuery(item: OmnibarItem, normalizedQuery: string): boolean {
  const searchableText = [item.id, item.title, item.subtitle ?? '', ...(item.keywords ?? [])]
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

function clampSelectedIndex(index: number, resultCount: number): number {
  if (resultCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), resultCount - 1);
}
