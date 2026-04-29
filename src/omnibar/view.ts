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
  throw new Error('not implemented: getOmnibarViewDefinition');
}

export function buildOmnibarStyleSheet(_definition: OmnibarViewDefinition): string {
  throw new Error('not implemented: buildOmnibarStyleSheet');
}

export function ensureSelectedOmnibarRowVisible(
  _root: ParentNode,
  _adapter?: OmnibarSelectionVisibilityAdapter,
): void {
  throw new Error('not implemented: ensureSelectedOmnibarRowVisible');
}

export function classForOmnibarItemKind(_kind: OmnibarItemKind): string {
  throw new Error('not implemented: classForOmnibarItemKind');
}

export function classForOmnibarStatusTone(_tone: OmnibarStatusTone | undefined): string {
  throw new Error('not implemented: classForOmnibarStatusTone');
}
