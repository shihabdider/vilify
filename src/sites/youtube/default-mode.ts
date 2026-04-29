import { filterOmnibarItems } from '../../omnibar/state';
import type { OmnibarItem, OmnibarMode, ProviderContext } from '../../omnibar/types';
import { youtubeTranscriptMode } from './transcript-mode';
import {
  deriveYouTubePageCapability,
  satisfiesYouTubeCommandCapability,
  type YouTubeCommandCapabilityRequirement,
  type YouTubePageCapability,
} from './capability';
import { buildYouTubeSearchUrl, parseYouTubeRootQueryIntent, type YouTubeRootQueryIntent } from './query-intent';

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

export function getYouTubeRootItems(context: ProviderContext, query: string): readonly OmnibarItem[] {
  const capability = deriveYouTubePageCapability(context);
  const intent = parseYouTubeRootQueryIntent(query);

  return itemsForYouTubeRootIntent(youtubeRootCommands, capability, intent, context);
}

export function itemsForYouTubeRootIntent(
  commands: readonly YouTubeRootCommand[],
  capability: YouTubePageCapability,
  intent: YouTubeRootQueryIntent,
  context: ProviderContext,
): readonly OmnibarItem[] {
  switch (intent.kind) {
    case 'command-filter':
    case 'navigation-filter':
      return filterYouTubeRootCommandsByIntent(
        availableYouTubeRootCommands(commands, capability),
        intent,
      ).map((command) => command.item);
    case 'youtube-search':
      return [createYouTubeSearchIntentItem(intent.query)];
    case 'transcript-search':
      return getTranscriptSearchIntentItems(context, intent.query);
  }
}

export function availableYouTubeRootCommands(
  commands: readonly YouTubeRootCommand[],
  capability: YouTubePageCapability,
): readonly YouTubeRootCommand[] {
  return commands.filter((command) => satisfiesYouTubeCommandCapability(capability, command.capability));
}

export function filterYouTubeRootCommandsByIntent(
  commands: readonly YouTubeRootCommand[],
  intent: YouTubeRootQueryIntent,
): readonly YouTubeRootCommand[] {
  switch (intent.kind) {
    case 'command-filter':
      return filterCommandsByQuery(commands, intent.query);
    case 'navigation-filter':
      return filterCommandsByQuery(
        commands.filter((command) => command.category === 'navigation'),
        intent.query,
      );
    case 'youtube-search':
    case 'transcript-search':
      return [];
  }
}

export function createYouTubeSearchIntentItem(query: string): OmnibarItem {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      id: 'youtube-search-empty-query',
      kind: 'status',
      tone: 'warning',
      title: 'Type a YouTube search query',
      subtitle: 'Use s/{query} to open YouTube search results.',
      keywords: ['youtube', 'search', 'empty query'],
      action: { kind: 'noop' },
    };
  }

  return {
    id: `youtube-search-${idPart(trimmedQuery)}`,
    kind: 'navigation',
    title: `Search YouTube for “${trimmedQuery}”`,
    subtitle: 'Open YouTube search results.',
    keywords: ['youtube', 'search', trimmedQuery],
    action: { kind: 'navigate', url: buildYouTubeSearchUrl(trimmedQuery) },
  };
}

export function getTranscriptSearchIntentItems(
  context: ProviderContext,
  query: string,
): readonly OmnibarItem[] {
  const capability = deriveYouTubePageCapability(context);
  if (!capability.canUseVideoScopedCommands) {
    return [transcriptSearchUnavailableItem()];
  }

  return youtubeTranscriptMode.providers.flatMap((provider) => Array.from(provider.getItems(context, query)));
}

function filterCommandsByQuery(
  commands: readonly YouTubeRootCommand[],
  query: string,
): readonly YouTubeRootCommand[] {
  const matchingItemIds = new Set(filterOmnibarItems(commands.map((command) => command.item), query).map((item) => item.id));
  return commands.filter((command) => matchingItemIds.has(command.item.id));
}

function transcriptSearchUnavailableItem(): OmnibarItem {
  return {
    id: 'youtube-transcript-search-unavailable',
    kind: 'status',
    tone: 'warning',
    title: 'Transcript search unavailable',
    subtitle: 'Open a YouTube watch page with a playable video to use t/{query}.',
    keywords: ['transcript', 'unavailable', 'missing video', 'youtube'],
    action: { kind: 'noop' },
  };
}

function idPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'query';
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
