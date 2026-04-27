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

export type OmnibarActionResult =
  | { kind: 'none' }
  | { kind: 'close' }
  | { kind: 'push-mode'; mode: OmnibarMode };

export type OmnibarAction =
  | { kind: 'noop' }
  | { kind: 'close' }
  | { kind: 'push-mode'; mode: OmnibarMode }
  | { kind: 'custom'; execute: (context: OmnibarActionContext) => OmnibarActionResult | void };

export interface OmnibarItem {
  readonly id: string;
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

export type OmnibarActionExecutor = (
  action: OmnibarAction,
  context: OmnibarActionContext,
) => OmnibarActionResult | void;
