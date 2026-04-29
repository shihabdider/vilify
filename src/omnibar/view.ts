import type { OmnibarItemKind, OmnibarStatusTone } from './types';

export type OmnibarThemeToken =
  | 'background'
  | 'foreground'
  | 'muted'
  | 'border'
  | 'prompt'
  | 'selectionBackground'
  | 'selectionForeground'
  | 'navigation'
  | 'command'
  | 'videoScoped'
  | 'searchResult'
  | 'statusInfo'
  | 'statusWarning'
  | 'statusError';

export type OmnibarTextWrapPolicy = 'wrap' | 'nowrap';
export type OmnibarSelectionVisibilityPolicy = 'nearest-scrollport';

export interface OmnibarResultsViewportDefinition {
  readonly className: 'vilify-omnibar-results';
  readonly datasetKey: 'vilifyOmnibarResults';
  readonly scrollsInsidePicker: true;
  readonly fixedPromptAndFooter: true;
  readonly selectionVisibility: OmnibarSelectionVisibilityPolicy;
}

export interface OmnibarRowTextDefinition {
  readonly titleWrap: OmnibarTextWrapPolicy;
  readonly subtitleWrap: OmnibarTextWrapPolicy;
  readonly statusWrap: OmnibarTextWrapPolicy;
}

export interface OmnibarThemeDefinition {
  readonly tokens: Record<OmnibarThemeToken, string>;
  readonly kindClasses: Record<OmnibarItemKind, string>;
  readonly statusToneClasses: Record<OmnibarStatusTone, string>;
}

export interface OmnibarViewDefinition {
  readonly resultsViewport: OmnibarResultsViewportDefinition;
  readonly rowText: OmnibarRowTextDefinition;
  readonly theme: OmnibarThemeDefinition;
}

export interface OmnibarSelectionVisibilityAdapter {
  readonly keepVisible: (selectedRow: HTMLElement, resultsViewport: HTMLElement) => void;
}

export function getOmnibarViewDefinition(): OmnibarViewDefinition {
  return {
    resultsViewport: {
      className: 'vilify-omnibar-results',
      datasetKey: 'vilifyOmnibarResults',
      scrollsInsidePicker: true,
      fixedPromptAndFooter: true,
      selectionVisibility: 'nearest-scrollport',
    },
    rowText: {
      titleWrap: 'wrap',
      subtitleWrap: 'wrap',
      statusWrap: 'wrap',
    },
    theme: {
      tokens: {
        background: '#1c1f1a',
        foreground: '#d7d7c7',
        muted: '#8f9a88',
        border: '#4b5745',
        prompt: '#8ec07c',
        selectionBackground: '#b8bb26',
        selectionForeground: '#1c1f1a',
        navigation: '#83a598',
        command: '#d7ba7d',
        videoScoped: '#fe8019',
        searchResult: '#8ec07c',
        statusInfo: '#83a598',
        statusWarning: '#fabd2f',
        statusError: '#fb4934',
      },
      kindClasses: {
        navigation: 'vilify-omnibar-kind-navigation',
        command: 'vilify-omnibar-kind-command',
        'video-action': 'vilify-omnibar-kind-video-scoped',
        'search-result': 'vilify-omnibar-kind-search-result',
        status: 'vilify-omnibar-kind-status vilify-omnibar-status-row',
      },
      statusToneClasses: {
        info: 'vilify-omnibar-status-info',
        warning: 'vilify-omnibar-status-warning',
        error: 'vilify-omnibar-status-error',
      },
    },
  };
}

export function buildOmnibarStyleSheet(definition: OmnibarViewDefinition): string {
  const tokens = definition.theme.tokens;

  return `#vilify-omnibar-root {
  --vilify-omnibar-background: ${tokens.background};
  --vilify-omnibar-foreground: ${tokens.foreground};
  --vilify-omnibar-bg: var(--vilify-omnibar-background);
  --vilify-omnibar-fg: var(--vilify-omnibar-foreground);
  --vilify-omnibar-muted: ${tokens.muted};
  --vilify-omnibar-border: ${tokens.border};
  --vilify-omnibar-prompt: ${tokens.prompt};
  --vilify-omnibar-selection-bg: ${tokens.selectionBackground};
  --vilify-omnibar-selection-fg: ${tokens.selectionForeground};
  --vilify-omnibar-navigation: ${tokens.navigation};
  --vilify-omnibar-command: ${tokens.command};
  --vilify-omnibar-video-scoped: ${tokens.videoScoped};
  --vilify-omnibar-search-result: ${tokens.searchResult};
  --vilify-omnibar-status-info: ${tokens.statusInfo};
  --vilify-omnibar-status-warning: ${tokens.statusWarning};
  --vilify-omnibar-status-error: ${tokens.statusError};
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--vilify-omnibar-foreground);
  pointer-events: none;
}

#vilify-omnibar-root .vilify-omnibar-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 1rem 1rem;
  box-sizing: border-box;
  pointer-events: none;
}

#vilify-omnibar-root .vilify-omnibar-panel {
  width: min(80ch, calc(100vw - 2rem));
  max-height: min(72vh, 42rem);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--vilify-omnibar-background);
  color: var(--vilify-omnibar-foreground);
  border: 1px solid var(--vilify-omnibar-border);
  border-radius: 0;
  box-shadow: none;
  pointer-events: auto;
}

#vilify-omnibar-root .vilify-omnibar-prompt {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 1ch;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--vilify-omnibar-border);
  background: var(--vilify-omnibar-background);
  color: var(--vilify-omnibar-foreground);
  white-space: nowrap;
}

#vilify-omnibar-root .vilify-omnibar-mode {
  color: var(--vilify-omnibar-prompt);
  font-weight: 700;
}

#vilify-omnibar-root .vilify-omnibar-prompt-mark {
  color: var(--vilify-omnibar-status-info);
}

#vilify-omnibar-root input[data-vilify-omnibar-input="true"] {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  outline: 0;
  padding: 0;
  background: transparent;
  color: var(--vilify-omnibar-foreground);
  font: inherit;
  white-space: nowrap;
}

#vilify-omnibar-root input[data-vilify-omnibar-input="true"]::placeholder {
  color: var(--vilify-omnibar-muted);
}

#vilify-omnibar-root .${definition.resultsViewport.className} {
  flex: 1 1 auto;
  min-height: 0;
  max-height: min(52vh, 32rem);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  background: var(--vilify-omnibar-background);
}

#vilify-omnibar-root .vilify-omnibar-row {
  display: grid;
  grid-template-columns: 2ch minmax(10ch, 16ch) minmax(0, 1fr);
  column-gap: 1ch;
  row-gap: 0.15rem;
  align-items: start;
  padding: 0.45rem 0.75rem;
  border-radius: 0;
  white-space: ${definition.rowText.titleWrap === 'wrap' ? 'normal' : 'nowrap'};
  overflow-wrap: anywhere;
  line-height: 1.35;
}

#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] {
  background: var(--vilify-omnibar-selection-bg);
  color: var(--vilify-omnibar-selection-fg);
  border-radius: 0;
}

#vilify-omnibar-root .vilify-omnibar-cursor {
  grid-column: 1;
  color: var(--vilify-omnibar-prompt);
  font-weight: 700;
}

#vilify-omnibar-root .vilify-omnibar-kind {
  grid-column: 2;
  color: var(--vilify-omnibar-muted);
  overflow-wrap: anywhere;
}

#vilify-omnibar-root .vilify-omnibar-item-title,
#vilify-omnibar-root .vilify-omnibar-item-subtitle,
#vilify-omnibar-root .vilify-omnibar-status {
  grid-column: 3;
  min-width: 0;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  overflow-wrap: anywhere;
}

#vilify-omnibar-root .vilify-omnibar-item-title {
  font-weight: 700;
}

#vilify-omnibar-root .vilify-omnibar-item-subtitle {
  color: var(--vilify-omnibar-muted);
}

#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-kind,
#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-item-subtitle,
#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-status-neutral,
#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-status-info,
#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-status-warning,
#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-status-error {
  color: var(--vilify-omnibar-selection-fg);
}

#vilify-omnibar-root .vilify-omnibar-kind-navigation .vilify-omnibar-kind,
#vilify-omnibar-root .vilify-omnibar-kind-navigation .vilify-omnibar-item-title {
  color: var(--vilify-omnibar-navigation);
}

#vilify-omnibar-root .vilify-omnibar-kind-command .vilify-omnibar-kind,
#vilify-omnibar-root .vilify-omnibar-kind-command .vilify-omnibar-item-title {
  color: var(--vilify-omnibar-command);
}

#vilify-omnibar-root .vilify-omnibar-kind-video-scoped .vilify-omnibar-kind,
#vilify-omnibar-root .vilify-omnibar-kind-video-scoped .vilify-omnibar-item-title {
  color: var(--vilify-omnibar-video-scoped);
}

#vilify-omnibar-root .vilify-omnibar-kind-search-result .vilify-omnibar-kind,
#vilify-omnibar-root .vilify-omnibar-kind-search-result .vilify-omnibar-item-title {
  color: var(--vilify-omnibar-search-result);
}

#vilify-omnibar-root .vilify-omnibar-kind-status .vilify-omnibar-kind,
#vilify-omnibar-root .vilify-omnibar-status-row .vilify-omnibar-kind,
#vilify-omnibar-root .vilify-omnibar-status-row .vilify-omnibar-item-title {
  color: var(--vilify-omnibar-status-info);
}

#vilify-omnibar-root .vilify-omnibar-status-neutral {
  color: var(--vilify-omnibar-muted);
}

#vilify-omnibar-root .vilify-omnibar-status-info {
  color: var(--vilify-omnibar-status-info);
}

#vilify-omnibar-root .vilify-omnibar-status-warning {
  color: var(--vilify-omnibar-status-warning);
}

#vilify-omnibar-root .vilify-omnibar-status-error {
  color: var(--vilify-omnibar-status-error);
}

#vilify-omnibar-root .vilify-omnibar-empty {
  padding: 0.45rem 0.75rem;
  color: var(--vilify-omnibar-muted);
}

#vilify-omnibar-root .vilify-omnibar-footer {
  flex: 0 0 auto;
  padding: 0.45rem 0.75rem;
  border-top: 1px solid var(--vilify-omnibar-border);
  color: var(--vilify-omnibar-muted);
  background: var(--vilify-omnibar-background);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}`;
}

export function ensureSelectedOmnibarRowVisible(
  root: ParentNode,
  adapter?: OmnibarSelectionVisibilityAdapter,
): void {
  const resultsViewport = root.querySelector<HTMLElement>('[data-vilify-omnibar-results="true"]');
  const selectedRow = resultsViewport?.querySelector<HTMLElement>(
    '[data-vilify-omnibar-item="true"][data-selected="true"]',
  );

  if (!resultsViewport || !selectedRow) {
    return;
  }

  if (adapter) {
    adapter.keepVisible(selectedRow, resultsViewport);
    return;
  }

  selectedRow.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

export function classForOmnibarItemKind(kind: OmnibarItemKind): string {
  return getOmnibarViewDefinition().theme.kindClasses[kind];
}

export function classForOmnibarStatusTone(tone: OmnibarStatusTone | undefined): string {
  if (!tone) {
    return 'vilify-omnibar-status-neutral';
  }

  return getOmnibarViewDefinition().theme.statusToneClasses[tone];
}
