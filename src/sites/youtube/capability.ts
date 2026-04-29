import type { ProviderContext } from '../../omnibar/types';
import { getYouTubeVideoId, isSupportedYouTubeUrl } from './url';

export type YouTubePageSurface = 'watch' | 'youtube' | 'unsupported';

export interface YouTubePageCapability {
  readonly surface: YouTubePageSurface;
  readonly currentUrl: URL | null;
  readonly watchVideoId: string | null;
  readonly hasNativeVideoElement: boolean;
  readonly canUseVideoScopedCommands: boolean;
}

export type YouTubeCommandCapabilityRequirement = 'always' | 'watch-video' | 'native-video';

export function deriveYouTubePageCapability(context: ProviderContext): YouTubePageCapability {
  const currentUrl = currentUrlFromContext(context);
  const watchVideoId = currentUrl ? getYouTubeVideoId(currentUrl) : null;
  const hasNativeVideoElement = Boolean(context.document?.querySelector('video'));
  const surface: YouTubePageSurface = currentUrl && isSupportedYouTubeUrl(currentUrl)
    ? watchVideoId
      ? 'watch'
      : 'youtube'
    : 'unsupported';

  return {
    surface,
    currentUrl,
    watchVideoId,
    hasNativeVideoElement,
    canUseVideoScopedCommands: Boolean(watchVideoId && hasNativeVideoElement),
  };
}

export function satisfiesYouTubeCommandCapability(
  capability: YouTubePageCapability,
  requirement: YouTubeCommandCapabilityRequirement,
): boolean {
  switch (requirement) {
    case 'always':
      return true;
    case 'watch-video':
      return capability.watchVideoId !== null;
    case 'native-video':
      return capability.canUseVideoScopedCommands;
  }
}

function currentUrlFromContext(context: ProviderContext): URL | null {
  return (
    urlFromLocation(context.location) ??
    urlFromLocation(context.document?.location) ??
    urlFromLocation(globalThis.location) ??
    urlFromUrl(context.activePlugin?.url) ??
    null
  );
}

function urlFromLocation(location: Location | undefined): URL | null {
  if (!location) {
    return null;
  }

  return urlFromString(location.href);
}

function urlFromUrl(url: URL | undefined): URL | null {
  if (!url) {
    return null;
  }

  return urlFromString(url.href);
}

function urlFromString(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
