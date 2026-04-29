import { getOmnibarCommandPrefix } from './prefix';
import type {
  OmnibarItem,
  OmnibarItemKind,
  OmnibarRowMarker,
  OmnibarStatusTone,
  OmnibarSyntaxPart,
} from './types';

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
  | 'statusError'
  | 'syntaxPrefix'
  | 'syntaxKeyword'
  | 'syntaxPlaceholder'
  | 'syntaxExample'
  | 'syntaxDescription'
  | 'syntaxKind'
  | 'syntaxStatus';

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
  readonly syntaxPartClasses: Record<OmnibarSyntaxPart['kind'], string>;
}

/**
 * Presentation-only layout tokens for the omnibar shell and result rows.
 *
 * Rows are laid out as cursor/marker, prefix-kind marker, and primary content.
 * The sum of markerColumnWidth, kindColumnWidth, and the row column gaps defines
 * the primary title-column start; keep that start near the prompt input text
 * column for the default YouTube prompt while preserving visible prefix markers.
 */
export interface OmnibarLayoutDefinition {
  readonly baseFontSize: string;
  readonly lineHeight: string;
  readonly panelWidth: string;
  readonly panelMaxHeight: string;
  readonly resultsMaxHeight: string;
  readonly overlayPadding: string;
  readonly promptPadding: string;
  readonly rowPadding: string;
  readonly footerPadding: string;
  /** Cursor/selection marker column for the row grid. */
  readonly markerColumnWidth: string;
  /** Compact prefix-kind marker column; should fit two-character markers like s/, t/, and n/. */
  readonly kindColumnWidth: string;
  /** Gap between marker, prefix-kind, and primary content columns. */
  readonly rowColumnGap: string;
  readonly rowGap: string;
}

export interface OmnibarViewDefinition {
  readonly resultsViewport: OmnibarResultsViewportDefinition;
  readonly rowText: OmnibarRowTextDefinition;
  readonly layout: OmnibarLayoutDefinition;
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
    layout: createReadableOmnibarLayoutDefinition(),
    theme: {
      tokens: createSyntaxLikeOmnibarThemeTokens(),
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
      syntaxPartClasses: {
        prefix: 'vilify-omnibar-syntax-prefix',
        keyword: 'vilify-omnibar-syntax-keyword',
        placeholder: 'vilify-omnibar-syntax-placeholder',
        example: 'vilify-omnibar-syntax-example',
        description: 'vilify-omnibar-syntax-description',
        kind: 'vilify-omnibar-syntax-kind',
        status: 'vilify-omnibar-syntax-status',
        title: 'vilify-omnibar-syntax-title',
      },
    },
  };
}

export function buildOmnibarStyleSheet(definition: OmnibarViewDefinition): string {
  const tokens = definition.theme.tokens;
  const layout = definition.layout;

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
  --vilify-omnibar-syntax-prefix: ${tokens.syntaxPrefix};
  --vilify-omnibar-syntax-keyword: ${tokens.syntaxKeyword};
  --vilify-omnibar-syntax-placeholder: ${tokens.syntaxPlaceholder};
  --vilify-omnibar-syntax-example: ${tokens.syntaxExample};
  --vilify-omnibar-syntax-description: ${tokens.syntaxDescription};
  --vilify-omnibar-syntax-kind: ${tokens.syntaxKind};
  --vilify-omnibar-syntax-status: ${tokens.syntaxStatus};
  --vilify-omnibar-font-size: ${layout.baseFontSize};
  --vilify-omnibar-line-height: ${layout.lineHeight};
  --vilify-omnibar-panel-width: ${layout.panelWidth};
  --vilify-omnibar-panel-max-height: ${layout.panelMaxHeight};
  --vilify-omnibar-results-max-height: ${layout.resultsMaxHeight};
  --vilify-omnibar-overlay-padding: ${layout.overlayPadding};
  --vilify-omnibar-prompt-padding: ${layout.promptPadding};
  --vilify-omnibar-row-padding: ${layout.rowPadding};
  --vilify-omnibar-footer-padding: ${layout.footerPadding};
  --vilify-omnibar-marker-column-width: ${layout.markerColumnWidth};
  --vilify-omnibar-kind-column-width: ${layout.kindColumnWidth};
  --vilify-omnibar-row-column-gap: ${layout.rowColumnGap};
  --vilify-omnibar-row-gap: ${layout.rowGap};
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--vilify-omnibar-font-size);
  color: var(--vilify-omnibar-foreground);
  pointer-events: none;
}

#vilify-omnibar-root .vilify-omnibar-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--vilify-omnibar-overlay-padding);
  box-sizing: border-box;
  pointer-events: none;
}

#vilify-omnibar-root .vilify-omnibar-panel {
  width: var(--vilify-omnibar-panel-width);
  max-height: var(--vilify-omnibar-panel-max-height);
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
  padding: var(--vilify-omnibar-prompt-padding);
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
  max-height: var(--vilify-omnibar-results-max-height);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  background: var(--vilify-omnibar-background);
}

#vilify-omnibar-root .vilify-omnibar-row {
  display: grid;
  grid-template-columns: var(--vilify-omnibar-marker-column-width) var(--vilify-omnibar-kind-column-width) minmax(0, 1fr);
  column-gap: var(--vilify-omnibar-row-column-gap);
  row-gap: var(--vilify-omnibar-row-gap);
  align-items: start;
  padding: var(--vilify-omnibar-row-padding);
  border-radius: 0;
  white-space: ${definition.rowText.titleWrap === 'wrap' ? 'normal' : 'nowrap'};
  overflow-wrap: anywhere;
  line-height: var(--vilify-omnibar-line-height);
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

#vilify-omnibar-root .vilify-omnibar-syntax-prefix {
  color: var(--vilify-omnibar-syntax-prefix);
}

#vilify-omnibar-root .vilify-omnibar-syntax-keyword {
  color: var(--vilify-omnibar-syntax-keyword);
}

#vilify-omnibar-root .vilify-omnibar-syntax-placeholder {
  color: var(--vilify-omnibar-syntax-placeholder);
}

#vilify-omnibar-root .vilify-omnibar-syntax-example {
  color: var(--vilify-omnibar-syntax-example);
}

#vilify-omnibar-root .vilify-omnibar-syntax-description {
  color: var(--vilify-omnibar-syntax-description);
}

#vilify-omnibar-root .vilify-omnibar-syntax-kind {
  color: var(--vilify-omnibar-syntax-kind);
}

#vilify-omnibar-root .vilify-omnibar-syntax-status {
  color: var(--vilify-omnibar-syntax-status);
}

#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-cursor,
#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-kind,
#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-item-title,
#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-item-subtitle,
#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-status,
#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] [class*="vilify-omnibar-syntax-"] {
  color: var(--vilify-omnibar-selection-fg);
}

#vilify-omnibar-root .vilify-omnibar-empty {
  padding: var(--vilify-omnibar-row-padding);
  color: var(--vilify-omnibar-muted);
}

#vilify-omnibar-root .vilify-omnibar-footer {
  flex: 0 0 auto;
  padding: var(--vilify-omnibar-footer-padding);
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

export function createSyntaxLikeOmnibarThemeTokens(): Record<OmnibarThemeToken, string> {
  return {
    background: '#000000',
    foreground: '#e8e8d3',
    muted: '#8a8a8a',
    border: '#5f5f5f',
    prompt: '#87ff5f',
    selectionBackground: '#ffd75f',
    selectionForeground: '#000000',
    navigation: '#87d7ff',
    command: '#ffd75f',
    videoScoped: '#ff87d7',
    searchResult: '#87ffaf',
    statusInfo: '#87d7ff',
    statusWarning: '#ffaf00',
    statusError: '#ff5f5f',
    syntaxPrefix: '#87ff5f',
    syntaxKeyword: '#ffd75f',
    syntaxPlaceholder: '#af87ff',
    syntaxExample: '#87d7ff',
    syntaxDescription: '#d7d7af',
    syntaxKind: '#ff87d7',
    syntaxStatus: '#ffaf00',
  };
}

export function createReadableOmnibarLayoutDefinition(): OmnibarLayoutDefinition {
  return {
    baseFontSize: '16px',
    lineHeight: '1.45',
    panelWidth: 'min(92ch, calc(100vw - 2rem))',
    panelMaxHeight: 'min(80vh, calc(100vh - 2rem))',
    resultsMaxHeight: 'min(64vh, calc(100vh - 8rem))',
    overlayPadding: '1rem',
    promptPadding: '0.7rem 0.9rem',
    rowPadding: '0.6rem 0.9rem',
    footerPadding: '0.5rem 0.9rem',
    markerColumnWidth: '2ch',
    kindColumnWidth: '8ch',
    rowColumnGap: '0.6rem',
    rowGap: '0.2rem',
  };
}

export function deriveOmnibarRowMarker(item: OmnibarItem, query: string): OmnibarRowMarker {
  const explicitMarker = item.display?.marker;

  if (explicitMarker) {
    return explicitMarker;
  }

  const activePrefix = getOmnibarCommandPrefix(query);
  return activePrefix ? { kind: 'prefix', prefix: activePrefix } : { kind: 'empty' };
}

export function deriveOmnibarSyntaxParts(item: OmnibarItem): readonly OmnibarSyntaxPart[] {
  const explicitTitleParts = item.display?.titleParts;
  if (explicitTitleParts) {
    return explicitTitleParts;
  }

  const title = item.title;
  if (title.length === 0) {
    return [];
  }

  const appendLeadingPartAndTitle = (
    parts: OmnibarSyntaxPart[],
    text: string,
    leadingKind: OmnibarSyntaxPart['kind'],
  ): boolean => {
    const leadingPartMatch = text.match(/^(\S+)(.*)$/);
    if (!leadingPartMatch) {
      return false;
    }

    parts.push({ kind: leadingKind, text: leadingPartMatch[1] });
    if (leadingPartMatch[2]) {
      parts.push({ kind: 'title', text: leadingPartMatch[2] });
    }

    return true;
  };

  const appendPrefixedToken = (parts: OmnibarSyntaxPart[], text: string): boolean => {
    const prefix = getOmnibarCommandPrefix(text);
    if (!prefix) {
      return false;
    }

    const tokenMatch = text.slice(prefix.length).match(/^(\S*)(.*)$/);
    if (!tokenMatch) {
      return false;
    }

    const token = tokenMatch[1];
    parts.push({ kind: 'prefix', text: prefix });
    if (token) {
      parts.push({
        kind: token.startsWith('{') && token.endsWith('}') ? 'placeholder' : 'keyword',
        text: token,
      });
    }
    if (tokenMatch[2]) {
      parts.push({ kind: 'title', text: tokenMatch[2] });
    }

    return true;
  };

  const prefixHintPrefix = getOmnibarCommandPrefix(title);
  const prefixHintMatch = prefixHintPrefix
    ? title.slice(prefixHintPrefix.length).match(/^(\{[^}]+\})(\s+—\s+)(.*)$/)
    : null;
  if (prefixHintPrefix && prefixHintMatch) {
    const parts: OmnibarSyntaxPart[] = [
      { kind: 'prefix', text: prefixHintPrefix },
      { kind: 'placeholder', text: prefixHintMatch[1] },
      { kind: 'description', text: prefixHintMatch[2] },
    ];
    appendLeadingPartAndTitle(parts, prefixHintMatch[3], 'keyword');
    return parts;
  }

  const exampleMatch = title.match(/^(Example:)(\s+)(.*)$/);
  if (exampleMatch) {
    const parts: OmnibarSyntaxPart[] = [
      { kind: 'example', text: exampleMatch[1] },
      { kind: 'description', text: exampleMatch[2] },
    ];
    if (exampleMatch[3] && !appendPrefixedToken(parts, exampleMatch[3])) {
      appendLeadingPartAndTitle(parts, exampleMatch[3], 'keyword');
    }
    return parts;
  }

  const dashHintMatch = title.match(/^(.+?)(\s+—\s+)(.*)$/);
  if (dashHintMatch) {
    const parts: OmnibarSyntaxPart[] = [
      { kind: dashHintMatch[1].toLowerCase().startsWith('type ') ? 'keyword' : 'title', text: dashHintMatch[1] },
      { kind: 'description', text: dashHintMatch[2] },
    ];
    appendLeadingPartAndTitle(parts, dashHintMatch[3], 'keyword');
    return parts;
  }

  if (item.kind === 'status') {
    const parts: OmnibarSyntaxPart[] = [];
    if (!appendLeadingPartAndTitle(parts, title, 'status')) {
      return [];
    }

    return parts;
  }

  return [{ kind: 'title', text: title }];
}

export function renderOmnibarSyntaxText(
  document: Document,
  className: string,
  fallbackText: string,
  parts: readonly OmnibarSyntaxPart[],
): HTMLSpanElement {
  const container = document.createElement('span');
  container.className = className;

  if (parts.length === 0) {
    container.textContent = fallbackText;
    return container;
  }

  const syntaxPartClasses = getOmnibarViewDefinition().theme.syntaxPartClasses;
  for (const part of parts) {
    const partElement = document.createElement('span');
    partElement.className = syntaxPartClasses[part.kind];
    partElement.textContent = part.text;
    container.append(partElement);
  }

  return container;
}
