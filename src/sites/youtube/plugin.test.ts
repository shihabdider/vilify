import { describe, expect, it } from 'vitest';
import { collectOmnibarItems, createInitialOmnibarState } from '../../omnibar/state';
import {
  getYouTubeVideoId,
  isSupportedYouTubeUrl,
  isYouTubeWatchUrl,
  youtubeDefaultMode,
  youtubePlugin,
  youtubeTranscriptMode,
} from './plugin';

describe('YouTube URL helpers', () => {
  it('supports YouTube host-level pages on youtube.com and subdomains', () => {
    for (const url of [
      'https://youtube.com/',
      'https://www.youtube.com/results?search_query=vilify',
      'https://www.youtube.com/@channel',
      'https://www.youtube.com/channel/UC123',
      'https://www.youtube.com/playlist?list=PL123',
      'https://www.youtube.com/shorts/abc123',
      'https://www.youtube.com/watch?v=abc123',
      'https://www.youtube.com/watch?t=42s',
      'https://m.youtube.com/feed/subscriptions',
    ]) {
      expect(isSupportedYouTubeUrl(new URL(url)), url).toBe(true);
    }
  });

  it('does not support Google, youtu.be, or unrelated hosts', () => {
    for (const url of [
      'https://www.google.com/search?q=vilify',
      'https://google.com/search?q=vilify',
      'https://youtu.be/abc123',
      'https://example.com/watch?v=abc123',
    ]) {
      expect(isSupportedYouTubeUrl(new URL(url)), url).toBe(false);
    }
  });

  it('extracts non-empty video ids from YouTube watch URLs', () => {
    expect(getYouTubeVideoId(new URL('https://www.youtube.com/watch?v=abc123&t=42s'))).toBe('abc123');
    expect(getYouTubeVideoId(new URL('https://m.youtube.com/watch?v=xyz789'))).toBe('xyz789');
  });

  it('treats watch URLs without a video id as unsupported', () => {
    expect(getYouTubeVideoId(new URL('https://www.youtube.com/watch?t=42s'))).toBeNull();
    expect(getYouTubeVideoId(new URL('https://www.youtube.com/watch?v=%20%20'))).toBeNull();
    expect(getYouTubeVideoId(new URL('https://www.youtube.com/shorts/abc123'))).toBeNull();
    expect(isYouTubeWatchUrl(new URL('https://www.youtube.com/watch?t=42s'))).toBe(false);
  });

  it('matches only YouTube watch pages with a video id', () => {
    expect(isYouTubeWatchUrl(new URL('https://www.youtube.com/watch?v=abc123'))).toBe(true);

    for (const url of [
      'https://www.youtube.com/',
      'https://www.youtube.com/results?search_query=vilify',
      'https://www.youtube.com/@channel',
      'https://www.youtube.com/channel/UC123',
      'https://www.youtube.com/playlist?list=PL123',
      'https://www.youtube.com/shorts/abc123',
      'https://www.google.com/search?q=vilify',
      'https://example.com/watch?v=abc123',
    ]) {
      expect(isYouTubeWatchUrl(new URL(url)), url).toBe(false);
    }
  });
});

describe('youtubePlugin', () => {
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

  it('declares a default mode with a transcript search action', () => {
    const items = collectOmnibarItems(createInitialOmnibarState(youtubeDefaultMode));

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
