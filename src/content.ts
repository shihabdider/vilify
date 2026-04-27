export type SupportedPage =
  | { kind: 'youtube-watch'; url: URL; videoId: string }
  | { kind: 'unsupported'; url: URL };

export interface ContentScriptEnv {
  location?: Location;
  document?: Document;
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
  return detectSupportedPage(readRuntimeUrl(env));
}

if (typeof globalThis.location !== 'undefined') {
  initContentScript();
}
