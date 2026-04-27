import type { SitePlugin } from '../../plugins/types';
import { youtubeDefaultMode, youtubeTranscriptMode } from './default-mode';

export { youtubeDefaultMode, youtubeTranscriptMode } from './default-mode';

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

export const youtubePlugin: SitePlugin = {
  id: 'youtube',
  matches: isYouTubeWatchUrl,
  defaultModeId: youtubeDefaultMode.id,
  modes: [youtubeDefaultMode, youtubeTranscriptMode],
};
