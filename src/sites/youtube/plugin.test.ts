import { describe, expect, it } from 'vitest';
import { collectOmnibarItems, createInitialOmnibarState, setOmnibarQuery } from '../../omnibar/state';
import { domDocumentLocation, makeOmnibarTestDom } from '../../test-helpers/omnibar';
import {
  getYouTubeVideoId,
  isSupportedYouTubeUrl,
  isYouTubeWatchUrl,
  youtubeDefaultMode,
  youtubePlugin,
  youtubeTranscriptMode,
} from './plugin';
import {
  NON_YOUTUBE_URLS,
  YOUTUBE_NON_WATCH_URLS,
  YOUTUBE_SUPPORTED_URLS,
  YOUTUBE_WATCH_URL,
} from '../../test-helpers/youtube-url-fixtures';

describe('YouTube URL helpers', () => {
  it('supports YouTube host-level pages on youtube.com and subdomains', () => {
    for (const url of YOUTUBE_SUPPORTED_URLS) {
      expect(isSupportedYouTubeUrl(new URL(url)), url).toBe(true);
    }
  });

  it('does not support Google, youtu.be, or unrelated hosts', () => {
    for (const url of NON_YOUTUBE_URLS) {
      expect(isSupportedYouTubeUrl(new URL(url)), url).toBe(false);
    }
  });

  it('extracts non-empty video ids from YouTube watch URLs on youtube.com and subdomains', () => {
    expect(getYouTubeVideoId(new URL('https://youtube.com/watch?v=bare-host-id'))).toBe('bare-host-id');
    expect(getYouTubeVideoId(new URL('https://www.youtube.com/watch?v=abc123&t=42s'))).toBe('abc123');
    expect(getYouTubeVideoId(new URL('https://m.youtube.com/watch?v=xyz789'))).toBe('xyz789');
  });

  it('returns null for YouTube pages without watch video capability', () => {
    for (const url of [...YOUTUBE_NON_WATCH_URLS, 'https://www.youtube.com/watch?v=%20%20']) {
      expect(getYouTubeVideoId(new URL(url)), url).toBeNull();
    }

    expect(getYouTubeVideoId(undefined)).toBeNull();
    expect(isYouTubeWatchUrl(new URL('https://www.youtube.com/watch?t=42s'))).toBe(false);
  });

  it('returns null for Google, youtu.be, and unrelated hosts', () => {
    for (const url of [...NON_YOUTUBE_URLS, 'https://google.com/watch?v=abc123']) {
      expect(getYouTubeVideoId(new URL(url)), url).toBeNull();
    }
  });

  it('matches only YouTube watch pages with a non-empty video id', () => {
    expect(isYouTubeWatchUrl(new URL(YOUTUBE_WATCH_URL))).toBe(true);

    for (const url of [
      ...YOUTUBE_NON_WATCH_URLS,
      'https://www.youtube.com/watch?v=',
      'https://www.youtube.com/watch?v=%20%20',
      ...NON_YOUTUBE_URLS,
    ]) {
      expect(isYouTubeWatchUrl(new URL(url)), url).toBe(false);
    }
  });
});

describe('youtubePlugin', () => {
  it('matches YouTube host-level pages for plugin activation', () => {
    for (const url of YOUTUBE_SUPPORTED_URLS) {
      expect(youtubePlugin.matches(new URL(url)), url).toBe(true);
    }

    for (const url of NON_YOUTUBE_URLS) {
      expect(youtubePlugin.matches(new URL(url)), url).toBe(false);
    }
  });

  it('declares stateless plugin configuration without page hooks or ambient keybindings', () => {
    expect(youtubePlugin.id).toBe('youtube');
    expect(youtubePlugin.defaultModeId).toBe(youtubeDefaultMode.id);
    expect(youtubePlugin.modes).toEqual([youtubeDefaultMode, youtubeTranscriptMode]);
    expect(youtubePlugin.bridge).toEqual({ id: 'youtube-main-world' });
    expect(Object.keys(youtubePlugin).sort()).toEqual(['bridge', 'defaultModeId', 'id', 'matches', 'modes']);

    for (const forbiddenKey of ['state', 'install', 'render', 'mount', 'unmount', 'keybindings', 'ambientKeybindings']) {
      expect(youtubePlugin).not.toHaveProperty(forbiddenKey);
    }
  });

  it('declares a capability-aware default mode with a transcript search action for non-empty queries on watch pages', () => {
    const dom = makeOmnibarTestDom(
      'https://www.youtube.com/watch?v=plugin-video-0016',
      '<main><video></video></main>',
    );
    const items = collectOmnibarItems(
      setOmnibarQuery(createInitialOmnibarState(youtubeDefaultMode), 'transcript'),
      domDocumentLocation(dom),
    );

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'youtube-open-transcript',
          title: 'Search transcript',
          action: { kind: 'push-mode', mode: youtubeTranscriptMode },
        }),
      ]),
    );
  });

  it('declares transcript mode as the transcript search provider UI', () => {
    const items = collectOmnibarItems(createInitialOmnibarState(youtubeTranscriptMode));

    expect(youtubeTranscriptMode.id).toBe('youtube-transcript');
    expect(youtubeTranscriptMode.title).toBe('Search transcript');
    expect(youtubeTranscriptMode.placeholder).toBe('Search this video transcript');
    expect(items).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-missing-video',
        kind: 'status',
        title: 'No active YouTube video',
        action: { kind: 'noop' },
      }),
    ]);
  });
});
