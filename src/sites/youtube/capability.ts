import type { ProviderContext } from '../../omnibar/types';

export type YouTubePageSurface = 'watch' | 'youtube' | 'unsupported';

export interface YouTubePageCapability {
  readonly surface: YouTubePageSurface;
  readonly currentUrl: URL | null;
  readonly watchVideoId: string | null;
  readonly hasNativeVideoElement: boolean;
  readonly canUseVideoScopedCommands: boolean;
}

export type YouTubeCommandCapabilityRequirement = 'always' | 'watch-video' | 'native-video';

export function deriveYouTubePageCapability(_context: ProviderContext): YouTubePageCapability {
  throw new Error('not implemented: deriveYouTubePageCapability');
}

export function satisfiesYouTubeCommandCapability(
  _capability: YouTubePageCapability,
  _requirement: YouTubeCommandCapabilityRequirement,
): boolean {
  throw new Error('not implemented: satisfiesYouTubeCommandCapability');
}
