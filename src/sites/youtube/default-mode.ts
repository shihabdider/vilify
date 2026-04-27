import { filterOmnibarItems } from '../../omnibar/state';
import type { OmnibarItem, OmnibarMode } from '../../omnibar/types';

const YOUTUBE_BASE_URL = 'https://www.youtube.com';

export const youtubeTranscriptMode: OmnibarMode = {
  id: 'youtube-transcript',
  title: 'YouTube Transcript',
  placeholder: 'Search transcript (coming soon)',
  providers: [
    {
      id: 'youtube-transcript-status',
      getItems: () => [
        {
          id: 'youtube-transcript-placeholder',
          kind: 'status',
          title: 'Transcript search coming soon',
          subtitle: 'Transcript loading and search will be added in a later issue.',
          keywords: ['transcript', 'placeholder', 'coming soon', 'status'],
          action: { kind: 'noop' },
        },
      ],
    },
  ],
};

const youtubeNavigationItems: readonly OmnibarItem[] = [
  {
    id: 'youtube-nav-home',
    kind: 'navigation',
    title: 'Home',
    subtitle: 'Open the YouTube home page.',
    keywords: ['youtube', 'home', 'navigation'],
    action: { kind: 'navigate', url: `${YOUTUBE_BASE_URL}/` },
  },
  {
    id: 'youtube-nav-subscriptions',
    kind: 'navigation',
    title: 'Subscriptions',
    subtitle: 'Open your YouTube subscriptions feed.',
    keywords: ['youtube', 'subscriptions', 'subscription', 'subs', 'feed', 'navigation'],
    action: { kind: 'navigate', url: `${YOUTUBE_BASE_URL}/feed/subscriptions` },
  },
  {
    id: 'youtube-nav-watch-later',
    kind: 'navigation',
    title: 'Watch Later',
    subtitle: 'Open your YouTube Watch Later playlist.',
    keywords: ['youtube', 'watch later', 'watch-later', 'saved', 'playlist', 'wl', 'navigation'],
    action: { kind: 'navigate', url: `${YOUTUBE_BASE_URL}/playlist?list=WL` },
  },
  {
    id: 'youtube-nav-history',
    kind: 'navigation',
    title: 'History',
    subtitle: 'Open your YouTube watch history.',
    keywords: ['youtube', 'history', 'watch history', 'feed', 'navigation'],
    action: { kind: 'navigate', url: `${YOUTUBE_BASE_URL}/feed/history` },
  },
  {
    id: 'youtube-nav-library',
    kind: 'navigation',
    title: 'Library',
    subtitle: 'Open your YouTube library.',
    keywords: ['youtube', 'library', 'feed', 'navigation'],
    action: { kind: 'navigate', url: `${YOUTUBE_BASE_URL}/feed/library` },
  },
];

const youtubeVideoItems: readonly OmnibarItem[] = [
  {
    id: 'youtube-video-play-pause',
    kind: 'video-action',
    title: 'Play / pause',
    subtitle: 'Toggle the native video element without clicking YouTube controls.',
    keywords: ['video', 'native', 'play', 'pause', 'toggle'],
    action: { kind: 'playPause' },
  },
  {
    id: 'youtube-video-seek-back-10',
    kind: 'video-action',
    title: 'Seek back 10 seconds',
    subtitle: 'Move the native video element backward by 10 seconds.',
    keywords: ['video', 'native', 'seek', 'back', 'rewind', '10', 'seconds'],
    action: { kind: 'seek', seconds: -10 },
  },
  {
    id: 'youtube-video-seek-forward-10',
    kind: 'video-action',
    title: 'Seek forward 10 seconds',
    subtitle: 'Move the native video element forward by 10 seconds.',
    keywords: ['video', 'native', 'seek', 'forward', 'ahead', '10', 'seconds'],
    action: { kind: 'seek', seconds: 10 },
  },
  ...[0.5, 1, 1.25, 1.5, 2].map((rate): OmnibarItem => ({
    id: `youtube-video-rate-${String(rate).replace('.', '-')}`,
    kind: 'video-action',
    title: `Speed ${rate}×`,
    subtitle: `Set native video playback rate to ${rate}×.`,
    keywords: ['video', 'native', 'speed', 'rate', 'playback rate', String(rate)],
    action: { kind: 'setPlaybackRate', rate },
  })),
];

const youtubeCopyItems: readonly OmnibarItem[] = [
  {
    id: 'youtube-copy-current-url',
    kind: 'command',
    title: 'Copy current URL',
    subtitle: 'Copy the current watch URL through the Clipboard API.',
    keywords: ['copy', 'clipboard', 'url', 'link', 'current'],
    action: { kind: 'copy', source: { kind: 'current-url' } },
  },
  {
    id: 'youtube-copy-url-at-current-time',
    kind: 'command',
    title: 'Copy URL at current time',
    subtitle: 'Copy the current watch URL with a t= timestamp from the native video element.',
    keywords: ['copy', 'copy time', 'clipboard', 'url', 'link', 'time', 'timestamp', 'current time'],
    action: { kind: 'copy', source: { kind: 'current-url-at-video-time' } },
  },
];

const youtubeCommandItems: readonly OmnibarItem[] = [
  {
    id: 'youtube-open-transcript',
    kind: 'command',
    title: 'Transcript',
    subtitle: 'Open the transcript mode shell. Transcript loading arrives in a later issue.',
    keywords: ['transcript', 'captions', 'caption', 'shell', 'command'],
    action: { kind: 'push-mode', mode: youtubeTranscriptMode },
  },
];

const youtubeDefaultItems: readonly OmnibarItem[] = [
  ...youtubeNavigationItems,
  ...youtubeVideoItems,
  ...youtubeCopyItems,
  ...youtubeCommandItems,
];

export const youtubeDefaultMode: OmnibarMode = {
  id: 'youtube-root',
  title: 'YouTube',
  placeholder: 'Search YouTube commands',
  providers: [
    {
      id: 'youtube-root-actions',
      getItems: (_context, query) => filterOmnibarItems(youtubeDefaultItems, query),
    },
  ],
};
