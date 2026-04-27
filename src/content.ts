import { createOmnibarRuntime } from './omnibar/runtime';
import { createDefaultOmnibarMode } from './omnibar/state';
import type { OmnibarActionExecutor, OmnibarMode } from './omnibar/types';

export type SupportedPage =
  | { kind: 'youtube-watch'; url: URL; videoId: string }
  | { kind: 'unsupported'; url: URL };

export interface ContentScriptEnv {
  location?: Location;
  document?: Document;
  omnibarMode?: OmnibarMode;
  actionExecutor?: OmnibarActionExecutor;
}

function isYouTubeHost(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return normalizedHostname === 'youtube.com' || normalizedHostname.endsWith('.youtube.com');
}

export function detectSupportedPage(url: URL): SupportedPage {
  if (isYouTubeHost(url.hostname) && url.pathname === '/watch') {
    const videoId = url.searchParams.get('v')?.trim() ?? '';
    if (videoId.length > 0) {
      return { kind: 'youtube-watch', url, videoId };
    }
  }

  return { kind: 'unsupported', url };
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
  const page = detectSupportedPage(readRuntimeUrl(env));
  const document = env.document ?? globalThis.document;

  if (page.kind !== 'unsupported' && document) {
    createOmnibarRuntime({
      document,
      rootMode: env.omnibarMode ?? createDefaultOmnibarMode(),
      providerContext: {
        document,
        location: env.location ?? document.location,
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
