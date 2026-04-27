import { youtubePlugin } from '../sites/youtube/plugin';
import type { OmnibarMode } from '../omnibar/types';
import type { SitePlugin } from './types';

export const sitePlugins = [youtubePlugin] as const satisfies readonly SitePlugin[];

export function getActivePlugin(
  url: URL,
  plugins: readonly SitePlugin[] = sitePlugins,
): SitePlugin | null {
  for (const plugin of plugins) {
    if (plugin.matches(url)) {
      return plugin;
    }
  }

  return null;
}

export function getPluginDefaultMode(plugin: SitePlugin): OmnibarMode {
  const mode = plugin.modes.find((candidate) => candidate.id === plugin.defaultModeId);
  if (!mode) {
    throw new Error(`Plugin ${plugin.id} does not declare default mode ${plugin.defaultModeId}`);
  }

  return mode;
}
