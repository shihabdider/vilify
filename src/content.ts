import { createOmnibarRuntime } from './omnibar/runtime';
import { getActivePlugin, getPluginDefaultMode, sitePlugins } from './plugins/registry';
import type { OmnibarActionExecutor, OmnibarMode } from './omnibar/types';
import type { SitePlugin } from './plugins/types';

export type SupportedPage =
  | { kind: 'active-plugin'; url: URL; plugin: SitePlugin }
  | { kind: 'unsupported'; url: URL };

export interface ContentScriptEnv {
  location?: Location;
  document?: Document;
  plugins?: readonly SitePlugin[];
  omnibarMode?: OmnibarMode;
  actionExecutor?: OmnibarActionExecutor;
}

export function detectSupportedPage(
  url: URL,
  plugins: readonly SitePlugin[] = sitePlugins,
): SupportedPage {
  const plugin = getActivePlugin(url, plugins);
  if (!plugin) {
    return { kind: 'unsupported', url };
  }

  return { kind: 'active-plugin', url, plugin };
}

function readRuntimeUrl(env: ContentScriptEnv): URL {
  const href = env.location?.href ?? globalThis.location?.href ?? 'about:blank';

  try {
    return new URL(href);
  } catch {
    return new URL('about:blank');
  }
}

export function initContentScript(env: ContentScriptEnv = {}): SupportedPage {
  const url = readRuntimeUrl(env);
  const page = detectSupportedPage(url, env.plugins);
  const document = env.document ?? globalThis.document;

  if (page.kind === 'active-plugin' && document) {
    createOmnibarRuntime({
      document,
      rootMode: env.omnibarMode ?? getPluginDefaultMode(page.plugin),
      providerContext: {
        document,
        location: env.location ?? document.location,
        activePlugin: { plugin: page.plugin, url: page.url },
        page,
      },
      actionExecutor: env.actionExecutor,
    });
  }

  return page;
}

if (typeof globalThis.location !== 'undefined') {
  initContentScript();
}
