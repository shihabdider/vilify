import type { ActivePluginContext } from '../plugins/types';

export type OmnibarModeId = string;

export interface ProviderContext {
  readonly document?: Document;
  readonly location?: Location;
  readonly activePlugin?: ActivePluginContext;
  readonly page?: unknown;
  readonly services?: Record<string, unknown>;
  readonly requestRender?: () => void;
}

export interface OmnibarActionContext {
  readonly item: OmnibarItem;
  readonly state: OmnibarState;
  readonly providerContext: ProviderContext;
}

export type OmnibarItemKind = 'navigation' | 'video-action' | 'command' | 'search-result' | 'status';
export type OmnibarStatusTone = 'info' | 'warning' | 'error';
export type OmnibarCommandPrefix = 's/' | 't/' | 'n/';

export type OmnibarRowMarker =
  | { readonly kind: 'prefix'; readonly prefix: OmnibarCommandPrefix }
  | { readonly kind: 'empty' };

export type OmnibarSyntaxPartKind =
  | 'prefix'
  | 'keyword'
  | 'placeholder'
  | 'example'
  | 'description'
  | 'kind'
  | 'status'
  | 'title';

export interface OmnibarSyntaxPart {
  readonly kind: OmnibarSyntaxPartKind;
  readonly text: string;
}

export interface OmnibarItemDisplay {
  readonly marker?: OmnibarRowMarker;
  readonly titleParts?: readonly OmnibarSyntaxPart[];
  readonly subtitleParts?: readonly OmnibarSyntaxPart[];
}

export type OmnibarActionResult =
  | { kind: 'none' }
  | { kind: 'close' }
  | { kind: 'push-mode'; mode: OmnibarMode }
  | { kind: 'status'; message: string; tone?: OmnibarStatusTone };

export type OmnibarCopySource =
  | { kind: 'current-url' }
  | { kind: 'current-url-at-video-time' }
  | { kind: 'text'; text: string };

export type OmnibarAction =
  | { kind: 'noop' }
  | { kind: 'close' }
  | { kind: 'push-mode'; mode: OmnibarMode }
  | { kind: 'navigate'; url: string }
  | { kind: 'copy'; source: OmnibarCopySource }
  | { kind: 'seek'; seconds: number; seekMode?: 'relative' | 'absolute' }
  | { kind: 'custom'; execute: (context: OmnibarActionContext) => OmnibarActionExecution };

export interface OmnibarItem {
  readonly id: string;
  readonly kind: OmnibarItemKind;
  readonly title: string;
  readonly subtitle?: string;
  readonly keywords?: readonly string[];
  readonly tone?: OmnibarStatusTone;
  readonly display?: OmnibarItemDisplay;
  readonly action: OmnibarAction;
}

export interface OmnibarProvider {
  readonly id: string;
  readonly getItems: (context: ProviderContext, query: string) => readonly OmnibarItem[];
}

export interface OmnibarMode {
  readonly id: OmnibarModeId;
  readonly title: string;
  readonly placeholder?: string;
  readonly providers: readonly OmnibarProvider[];
}

export interface OmnibarState {
  readonly open: boolean;
  readonly query: string;
  readonly selectedIndex: number;
  readonly modeStack: readonly OmnibarMode[];
}

export type OmnibarActionExecution = OmnibarActionResult | void | Promise<OmnibarActionResult | void>;

export type OmnibarActionExecutor = (
  action: OmnibarAction,
  context: OmnibarActionContext,
) => OmnibarActionExecution;
