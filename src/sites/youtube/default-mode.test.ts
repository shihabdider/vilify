import { describe, expect, it } from 'vitest';
import { collectOmnibarItems, createInitialOmnibarState, setOmnibarQuery } from '../../omnibar/state';
import type { OmnibarItem } from '../../omnibar/types';
import { youtubeDefaultMode, youtubeTranscriptMode } from './plugin';

function getDefaultItems(query = ''): readonly OmnibarItem[] {
  const initialState = createInitialOmnibarState(youtubeDefaultMode);
  const state = query ? setOmnibarQuery(initialState, query) : initialState;

  return collectOmnibarItems(state);
}

function itemIds(query = ''): string[] {
  return getDefaultItems(query).map((item) => item.id);
}

describe('youtubeDefaultMode', () => {
  it('returns stable navigation, video, copy, and transcript commands for an empty query', () => {
    const items = getDefaultItems();
    const byId = new Map(items.map((item) => [item.id, item]));

    expect(itemIds()).toEqual([
      'youtube-nav-home',
      'youtube-nav-subscriptions',
      'youtube-nav-watch-later',
      'youtube-nav-history',
      'youtube-nav-library',
      'youtube-video-play-pause',
      'youtube-video-seek-back-10',
      'youtube-video-seek-forward-10',
      'youtube-video-rate-0-5',
      'youtube-video-rate-1',
      'youtube-video-rate-1-25',
      'youtube-video-rate-1-5',
      'youtube-video-rate-2',
      'youtube-copy-current-url',
      'youtube-copy-url-at-current-time',
      'youtube-open-transcript',
    ]);

    expect(byId.get('youtube-nav-home')).toMatchObject({
      kind: 'navigation',
      title: 'Home',
      action: { kind: 'navigate', url: 'https://www.youtube.com/' },
    });
    expect(byId.get('youtube-nav-home')?.keywords).toEqual(
      expect.arrayContaining(['youtube', 'home', 'navigation']),
    );

    expect(byId.get('youtube-nav-subscriptions')).toMatchObject({
      kind: 'navigation',
      title: 'Subscriptions',
      action: { kind: 'navigate', url: 'https://www.youtube.com/feed/subscriptions' },
    });
    expect(byId.get('youtube-nav-subscriptions')?.keywords).toEqual(
      expect.arrayContaining(['subscriptions', 'feed']),
    );

    expect(byId.get('youtube-nav-watch-later')).toMatchObject({
      kind: 'navigation',
      title: 'Watch Later',
      action: { kind: 'navigate', url: 'https://www.youtube.com/playlist?list=WL' },
    });

    expect(byId.get('youtube-video-play-pause')).toMatchObject({
      kind: 'video-action',
      title: 'Play / pause',
      action: { kind: 'playPause' },
    });
    expect(byId.get('youtube-video-seek-back-10')).toMatchObject({
      kind: 'video-action',
      title: 'Seek back 10 seconds',
      action: { kind: 'seek', seconds: -10 },
    });
    expect(byId.get('youtube-video-rate-1-25')).toMatchObject({
      kind: 'video-action',
      title: 'Speed 1.25×',
      action: { kind: 'setPlaybackRate', rate: 1.25 },
    });
    expect(byId.get('youtube-video-rate-1-25')?.keywords).toEqual(
      expect.arrayContaining(['speed', 'rate', '1.25']),
    );

    expect(byId.get('youtube-copy-current-url')).toMatchObject({
      kind: 'command',
      title: 'Copy current URL',
      action: { kind: 'copy', source: { kind: 'current-url' } },
    });
    expect(byId.get('youtube-copy-url-at-current-time')).toMatchObject({
      kind: 'command',
      title: 'Copy URL at current time',
      action: { kind: 'copy', source: { kind: 'current-url-at-video-time' } },
    });

    expect(byId.get('youtube-open-transcript')).toMatchObject({
      kind: 'command',
      title: 'Search transcript',
      subtitle: 'Search this video transcript and jump to a matching timestamp.',
      action: { kind: 'push-mode', mode: youtubeTranscriptMode },
    });
  });

  it('filters commands by id, label, subtitle, and keywords for non-empty queries', () => {
    expect(itemIds('subscriptions')).toEqual(['youtube-nav-subscriptions']);
    expect(itemIds('1.25')).toEqual(['youtube-video-rate-1-25']);
    expect(itemIds('captions')).toEqual(['youtube-open-transcript']);
    expect(itemIds('search transcript')).toEqual(['youtube-open-transcript']);
    expect(itemIds('copy time')).toEqual(['youtube-copy-url-at-current-time']);
    expect(itemIds('not a youtube command')).toEqual([]);
  });
});
