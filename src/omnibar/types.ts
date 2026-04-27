import type { ActivePluginContext } from '../plugins/types';

export type OmnibarModeId = string;

export interface ProviderContext {
  readonly document?: Document;
  readonly location?: Location;
  readonly activePlugin?: ActivePluginContext;
  readonly page?: unknown;
}

export interface OmnibarActionContext {
  readonly item: OmnibarItem;
  readonly state: OmnibarState;
  readonly providerContext: ProviderContext;
}

export type OmnibarItemKind = 'navigation' | 'video-action' | 'command' | 'status';

export type OmnibarActionResult =
  | { kind: 'none' }
  | { kind: 'close' }
  | { kind: 'push-mode'; mode: OmnibarMode }
  | { kind: 'status'; message: string; tone?: 'info' | 'warning' | 'error' };

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
  | { kind: 'seek'; seconds: number }
  | { kind: 'playPause' }
  | { kind: 'setPlaybackRate'; rate: number }
  | { kind: 'custom'; execute: (context: OmnibarActionContext) => OmnibarActionExecution };

export interface OmnibarItem {
  readonly id: string;
  readonly kind: OmnibarItemKind;
  readonly title: string;
  readonly subtitle?: string;
  readonly keywords?: readonly string[];
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
