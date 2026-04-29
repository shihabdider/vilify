import type { OmnibarItem, OmnibarMode, ProviderContext } from '../../omnibar/types';
import { youtubeTranscriptMode } from './transcript-mode';
import type { YouTubeCommandCapabilityRequirement, YouTubePageCapability } from './capability';
import type { YouTubeRootQueryIntent } from './query-intent';

export { youtubeTranscriptMode } from './transcript-mode';

const YOUTUBE_BASE_URL = 'https://www.youtube.com';

export type YouTubeRootCommandScope = 'site' | 'video';
export type YouTubeRootCommandCategory = 'navigation' | 'search' | 'transcript' | 'copy' | 'status';

export interface YouTubeRootCommand {
  readonly id: string;
  readonly scope: YouTubeRootCommandScope;
  readonly category: YouTubeRootCommandCategory;
  readonly capability: YouTubeCommandCapabilityRequirement;
  readonly item: OmnibarItem;
}

export const youtubeRootCommands: readonly YouTubeRootCommand[] = [
  {
    id: 'youtube-nav-home',
    scope: 'site',
    category: 'navigation',
    capability: 'always',
    item: {
      id: 'youtube-nav-home',
      kind: 'navigation',
      title: 'Home',
      subtitle: 'Open the YouTube home page.',
      keywords: ['youtube', 'home', 'navigation'],
      action: { kind: 'navigate', url: `${YOUTUBE_BASE_URL}/` },
    },
  },
  {
    id: 'youtube-nav-subscriptions',
    scope: 'site',
    category: 'navigation',
    capability: 'always',
    item: {
      id: 'youtube-nav-subscriptions',
      kind: 'navigation',
      title: 'Subscriptions',
      subtitle: 'Open your YouTube subscriptions feed.',
      keywords: ['youtube', 'subscriptions', 'subscription', 'subs', 'feed', 'navigation'],
      action: { kind: 'navigate', url: `${YOUTUBE_BASE_URL}/feed/subscriptions` },
    },
  },
  {
    id: 'youtube-nav-watch-later',
    scope: 'site',
    category: 'navigation',
    capability: 'always',
    item: {
      id: 'youtube-nav-watch-later',
      kind: 'navigation',
      title: 'Watch Later',
      subtitle: 'Open your YouTube Watch Later playlist.',
      keywords: ['youtube', 'watch later', 'watch-later', 'saved', 'playlist', 'wl', 'navigation'],
      action: { kind: 'navigate', url: `${YOUTUBE_BASE_URL}/playlist?list=WL` },
    },
  },
  {
    id: 'youtube-nav-history',
    scope: 'site',
    category: 'navigation',
    capability: 'always',
    item: {
      id: 'youtube-nav-history',
      kind: 'navigation',
      title: 'History',
      subtitle: 'Open your YouTube watch history.',
      keywords: ['youtube', 'history', 'watch history', 'feed', 'navigation'],
      action: { kind: 'navigate', url: `${YOUTUBE_BASE_URL}/feed/history` },
    },
  },
  {
    id: 'youtube-nav-library',
    scope: 'site',
    category: 'navigation',
    capability: 'always',
    item: {
      id: 'youtube-nav-library',
      kind: 'navigation',
      title: 'Library',
      subtitle: 'Open your YouTube library.',
      keywords: ['youtube', 'library', 'feed', 'navigation'],
      action: { kind: 'navigate', url: `${YOUTUBE_BASE_URL}/feed/library` },
    },
  },
  {
    id: 'youtube-copy-current-url',
    scope: 'site',
    category: 'copy',
    capability: 'always',
    item: {
      id: 'youtube-copy-current-url',
      kind: 'command',
      title: 'Copy current URL',
      subtitle: 'Copy the current URL through the Clipboard API.',
      keywords: ['copy', 'clipboard', 'url', 'link', 'current'],
      action: { kind: 'copy', source: { kind: 'current-url' } },
    },
  },
  {
    id: 'youtube-copy-url-at-current-time',
    scope: 'video',
    category: 'copy',
    capability: 'native-video',
    item: {
      id: 'youtube-copy-url-at-current-time',
      kind: 'command',
      title: 'Copy URL at current time',
      subtitle: 'Copy the current watch URL with a t= timestamp from the native video element.',
      keywords: ['copy', 'copy time', 'clipboard', 'url', 'link', 'time', 'timestamp', 'current time'],
      action: { kind: 'copy', source: { kind: 'current-url-at-video-time' } },
    },
  },
  {
    id: 'youtube-open-transcript',
    scope: 'video',
    category: 'transcript',
    capability: 'native-video',
    item: {
      id: 'youtube-open-transcript',
      kind: 'command',
      title: 'Search transcript',
      subtitle: 'Search this video transcript and jump to a matching timestamp.',
      keywords: ['transcript', 'search transcript', 'captions', 'caption', 'search', 'timestamp', 'command'],
      action: { kind: 'push-mode', mode: youtubeTranscriptMode },
    },
  },
];

export function getYouTubeRootItems(_context: ProviderContext, _query: string): readonly OmnibarItem[] {
  throw new Error('not implemented: getYouTubeRootItems');
}

export function itemsForYouTubeRootIntent(
  _commands: readonly YouTubeRootCommand[],
  _capability: YouTubePageCapability,
  _intent: YouTubeRootQueryIntent,
  _context: ProviderContext,
): readonly OmnibarItem[] {
  throw new Error('not implemented: itemsForYouTubeRootIntent');
}

export function availableYouTubeRootCommands(
  _commands: readonly YouTubeRootCommand[],
  _capability: YouTubePageCapability,
): readonly YouTubeRootCommand[] {
  throw new Error('not implemented: availableYouTubeRootCommands');
}

export function filterYouTubeRootCommandsByIntent(
  _commands: readonly YouTubeRootCommand[],
  _intent: YouTubeRootQueryIntent,
): readonly YouTubeRootCommand[] {
  throw new Error('not implemented: filterYouTubeRootCommandsByIntent');
}

export function createYouTubeSearchIntentItem(_query: string): OmnibarItem {
  throw new Error('not implemented: createYouTubeSearchIntentItem');
}

export function getTranscriptSearchIntentItems(
  _context: ProviderContext,
  _query: string,
): readonly OmnibarItem[] {
  throw new Error('not implemented: getTranscriptSearchIntentItems');
}

export const youtubeDefaultMode: OmnibarMode = {
  id: 'youtube-root',
  title: 'YouTube',
  placeholder: 'Search YouTube commands',
  providers: [
    {
      id: 'youtube-root-actions',
      getItems: (context, query) => getYouTubeRootItems(context, query),
    },
  ],
};
