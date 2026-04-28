import type { SitePlugin } from '../../plugins/types';
import { youtubeDefaultMode, youtubeTranscriptMode } from './default-mode';
import { isSupportedYouTubeUrl } from './url';

export { youtubeDefaultMode, youtubeTranscriptMode } from './default-mode';
export { getYouTubeVideoId, isSupportedYouTubeUrl, isYouTubeWatchUrl } from './url';

export const youtubePlugin: SitePlugin = {
  id: 'youtube',
  matches: isSupportedYouTubeUrl,
  defaultModeId: youtubeDefaultMode.id,
  modes: [youtubeDefaultMode, youtubeTranscriptMode],
  bridge: { id: 'youtube-main-world' },
};
