import type { OmnibarMode } from '../../omnibar/types';
import type { SitePlugin } from '../../plugins/types';

function isYouTubeHost(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return normalizedHostname === 'youtube.com' || normalizedHostname.endsWith('.youtube.com');
}

export function getYouTubeVideoId(url: URL): string | null {
  if (!isYouTubeHost(url.hostname) || url.pathname !== '/watch') {
    return null;
  }

  const videoId = url.searchParams.get('v')?.trim() ?? '';
  return videoId.length > 0 ? videoId : null;
}

export function isYouTubeWatchUrl(url: URL): boolean {
  return getYouTubeVideoId(url) !== null;
}

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
          title: 'Transcript search coming soon',
          subtitle: 'Transcript loading and search will be added in a later issue.',
          keywords: ['transcript', 'placeholder', 'coming soon'],
          action: { kind: 'noop' },
        },
      ],
    },
  ],
};

export const youtubeDefaultMode: OmnibarMode = {
  id: 'youtube-root',
  title: 'YouTube',
  placeholder: 'Search YouTube commands',
  providers: [
    {
      id: 'youtube-root-status',
      getItems: () => [
        {
          id: 'youtube-open-transcript',
          title: 'Transcript',
          subtitle: 'Open the transcript mode shell. Transcript loading arrives in a later issue.',
          keywords: ['transcript', 'captions', 'shell'],
          action: { kind: 'push-mode', mode: youtubeTranscriptMode },
        },
        {
          id: 'youtube-plugin-active',
          title: 'YouTube plugin active',
          subtitle: 'Video actions are not implemented in this slice.',
          keywords: ['youtube', 'status', 'placeholder'],
          action: { kind: 'noop' },
        },
      ],
    },
  ],
};

export const youtubePlugin: SitePlugin = {
  id: 'youtube',
  matches: isYouTubeWatchUrl,
  defaultModeId: youtubeDefaultMode.id,
  modes: [youtubeDefaultMode, youtubeTranscriptMode],
};
