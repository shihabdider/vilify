import type { SitePlugin } from '../../plugins/types';
import { youtubeDefaultMode, youtubeTranscriptMode } from './default-mode';
import { isYouTubeWatchUrl } from './url';

export { youtubeDefaultMode, youtubeTranscriptMode } from './default-mode';
export { getYouTubeVideoId, isSupportedYouTubeUrl, isYouTubeWatchUrl } from './url';

export const youtubePlugin: SitePlugin = {
  id: 'youtube',
  matches: isYouTubeWatchUrl,
  defaultModeId: youtubeDefaultMode.id,
  modes: [youtubeDefaultMode, youtubeTranscriptMode],
  bridge: { id: 'youtube-main-world' },
};
