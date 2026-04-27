import type { OmnibarMode, OmnibarModeId } from '../omnibar/types';

export interface BridgeSpec {
  readonly id: string;
  readonly description?: string;
}

export interface SitePlugin {
  readonly id: string;
  readonly matches: (url: URL) => boolean;
  readonly defaultModeId: OmnibarModeId;
  readonly modes: readonly OmnibarMode[];
  readonly bridge?: BridgeSpec;
}

export interface ActivePluginContext {
  readonly plugin: SitePlugin;
  readonly url: URL;
}
