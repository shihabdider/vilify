import { describe, expect, it, vi } from 'vitest';
import { collectOmnibarItems, createInitialOmnibarState, setOmnibarQuery } from '../../omnibar/state';
import type { OmnibarItem, ProviderContext } from '../../omnibar/types';
import { domDocumentLocation, makeOmnibarTestDom, pushDomHistory } from '../../test-helpers/omnibar';
import { youtubePlugin } from './plugin';
import { deriveYouTubePageCapability } from './capability';
import {
  availableYouTubeRootCommands,
  createYouTubeSearchIntentItem,
  filterYouTubeRootCommandsByIntent,
  getTranscriptSearchIntentItems,
  getYouTubeRootItems,
  itemsForYouTubeRootIntent,
  youtubeDefaultMode,
  youtubeRootCommands,
  youtubeTranscriptMode,
} from './default-mode';

const SITE_COMMAND_IDS = [
  'youtube-nav-home',
  'youtube-nav-subscriptions',
  'youtube-nav-watch-later',
  'youtube-nav-history',
  'youtube-nav-library',
  'youtube-copy-current-url',
];

const WATCH_COMMAND_IDS = [
  ...SITE_COMMAND_IDS,
  'youtube-copy-url-at-current-time',
  'youtube-open-transcript',
];

function makeContext(
  url = 'https://www.youtube.com/',
  body = '<main id="page"></main>',
  overrides: Partial<ProviderContext> = {},
): { readonly dom: ReturnType<typeof makeOmnibarTestDom>; readonly context: ProviderContext } {
  const dom = makeOmnibarTestDom(url, body);
  const context: ProviderContext = {
    ...domDocumentLocation(dom),
    activePlugin: {
      plugin: youtubePlugin,
      url: new URL(url),
    },
    ...overrides,
  };

  return { dom, context };
}

function makeWatchContext(
  videoId = 'root-video-0016',
  body = '<main id="page"><video></video></main>',
  overrides: Partial<ProviderContext> = {},
): { readonly dom: ReturnType<typeof makeOmnibarTestDom>; readonly context: ProviderContext } {
  return makeContext(`https://www.youtube.com/watch?v=${videoId}`, body, overrides);
}

function defaultItems(context: ProviderContext, query = ''): readonly OmnibarItem[] {
  const initialState = createInitialOmnibarState(youtubeDefaultMode);
  const state = query ? setOmnibarQuery(initialState, query) : initialState;

  return collectOmnibarItems(state, context);
}

function ids(items: readonly OmnibarItem[]): string[] {
  return items.map((item) => item.id);
}

describe('youtubeDefaultMode root commands', () => {
  it('shows only site-wide navigation and copy commands on non-watch YouTube pages', () => {
    const { context } = makeContext('https://www.youtube.com/');
    const items = defaultItems(context);
    const byId = new Map(items.map((item) => [item.id, item]));

    expect(ids(items)).toEqual(SITE_COMMAND_IDS);
    expect(byId.get('youtube-nav-home')).toMatchObject({
      kind: 'navigation',
      title: 'Home',
      action: { kind: 'navigate', url: 'https://www.youtube.com/' },
    });
    expect(byId.get('youtube-copy-current-url')).toMatchObject({
      kind: 'command',
      title: 'Copy current URL',
      action: { kind: 'copy', source: { kind: 'current-url' } },
    });
    expect(byId.has('youtube-copy-url-at-current-time')).toBe(false);
    expect(byId.has('youtube-open-transcript')).toBe(false);
  });

  it('shows remaining video-scoped copy and transcript commands only on actionable watch pages', () => {
    const { context } = makeWatchContext('actionable-video-0016');
    const items = defaultItems(context);
    const byId = new Map(items.map((item) => [item.id, item]));

    expect(ids(items)).toEqual(WATCH_COMMAND_IDS);
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

  it('keeps pruned playback shortcut duplicate commands absent from empty and filtered results', () => {
    const { context } = makeWatchContext('pruned-video-0019');
    const allItems = defaultItems(context);

    expect(ids(allItems)).not.toEqual(expect.arrayContaining([
      'youtube-video-play-pause',
      'youtube-video-seek-back-10',
      'youtube-video-seek-forward-10',
      'youtube-video-rate-1-25',
    ]));
    expect(ids(defaultItems(context, 'play / pause'))).toEqual([]);
    expect(ids(defaultItems(context, 'seek back'))).toEqual([]);
    expect(ids(defaultItems(context, 'speed'))).toEqual([]);
    expect(ids(defaultItems(context, 'rate 1.25'))).toEqual([]);
  });

  it('applies capability-gated default fuzzy filtering and recomputes after SPA navigation', () => {
    const { dom, context } = makeWatchContext('spa-video-0016', '<main><video></video></main>');

    expect(ids(defaultItems(context, 'search transcript'))).toEqual(['youtube-open-transcript']);
    expect(ids(defaultItems(context, 'copy time'))).toEqual(['youtube-copy-url-at-current-time']);

    pushDomHistory(dom, '/results?search_query=vilify');

    expect(ids(defaultItems(context, 'search transcript'))).toEqual([]);
    expect(ids(defaultItems(context, 'copy time'))).toEqual([]);
    expect(ids(defaultItems(context, 'subscriptions'))).toEqual(['youtube-nav-subscriptions']);
  });
});

describe('YouTube root intent helpers', () => {
  it('filters available commands by capability before applying command intent filtering', () => {
    const homeCapability = deriveYouTubePageCapability(makeContext('https://www.youtube.com/').context);
    const watchCapability = deriveYouTubePageCapability(makeWatchContext('capability-filter-video').context);

    expect(ids(availableYouTubeRootCommands(youtubeRootCommands, homeCapability).map((command) => command.item))).toEqual(
      SITE_COMMAND_IDS,
    );
    expect(ids(availableYouTubeRootCommands(youtubeRootCommands, watchCapability).map((command) => command.item))).toEqual(
      WATCH_COMMAND_IDS,
    );
    expect(
      ids(
        filterYouTubeRootCommandsByIntent(
          availableYouTubeRootCommands(youtubeRootCommands, homeCapability),
          { kind: 'command-filter', query: 'transcript' },
        ).map((command) => command.item),
      ),
    ).toEqual([]);
  });

  it('limits n/{query} intent filtering to navigation commands', () => {
    const { context } = makeWatchContext('navigation-filter-video');
    const capability = deriveYouTubePageCapability(context);

    expect(
      ids(
        itemsForYouTubeRootIntent(
          youtubeRootCommands,
          capability,
          { kind: 'navigation-filter', query: '' },
          context,
        ),
      ),
    ).toEqual([
      'youtube-nav-home',
      'youtube-nav-subscriptions',
      'youtube-nav-watch-later',
      'youtube-nav-history',
      'youtube-nav-library',
    ]);
    expect(ids(getYouTubeRootItems(context, 'n/home'))).toEqual(['youtube-nav-home']);
    expect(ids(getYouTubeRootItems(context, 'n/copy'))).toEqual([]);
  });

  it('creates a generated YouTube search navigation item or a concise empty-query status', () => {
    const search = createYouTubeSearchIntentItem('  lofi beats  ');
    const empty = createYouTubeSearchIntentItem('   ');

    expect(search).toMatchObject({
      id: 'youtube-search-lofi-beats',
      kind: 'navigation',
      title: 'Search YouTube for “lofi beats”',
      action: { kind: 'navigate', url: 'https://www.youtube.com/results?search_query=lofi%20beats' },
    });
    expect(empty).toMatchObject({
      id: 'youtube-search-empty-query',
      kind: 'status',
      tone: 'warning',
      title: 'Type a YouTube search query',
      action: { kind: 'noop' },
    });
  });

  it('dispatches s/{query} and empty s/ intents from the root provider', () => {
    const { context } = makeContext('https://www.youtube.com/');

    expect(getYouTubeRootItems(context, 's/lofi beats')).toEqual([
      expect.objectContaining({
        id: 'youtube-search-lofi-beats',
        action: { kind: 'navigate', url: 'https://www.youtube.com/results?search_query=lofi%20beats' },
      }),
    ]);
    expect(getYouTubeRootItems(context, 's/   ')).toEqual([
      expect.objectContaining({
        id: 'youtube-search-empty-query',
        kind: 'status',
        action: { kind: 'noop' },
      }),
    ]);
  });

  it('returns one unavailable status for explicit t/{query} without an actionable video', () => {
    const home = makeContext('https://www.youtube.com/').context;
    const watchWithoutVideo = makeWatchContext('missing-native-video', '<main></main>').context;

    for (const context of [home, watchWithoutVideo]) {
      expect(getYouTubeRootItems(context, 't/needle')).toEqual([
        expect.objectContaining({
          id: 'youtube-transcript-search-unavailable',
          kind: 'status',
          tone: 'warning',
          title: 'Transcript search unavailable',
          action: { kind: 'noop' },
        }),
      ]);
    }
  });

  it('returns direct transcript search results for t/{query} on actionable watch pages', async () => {
    const getTranscript = vi.fn(async () => ({
      status: 'loaded' as const,
      videoId: 'direct-transcript-video-0017',
      language: 'en',
      source: 'caption-json3' as const,
      lines: [
        { time: 12, timeText: '0:12', duration: 2, text: 'A useful needle appears here' },
        { time: 30, timeText: '0:30', duration: 2, text: 'Another line' },
      ],
    }));
    const requestRender = vi.fn();
    const { context } = makeWatchContext('direct-transcript-video-0017', '<main><video></video></main>', {
      requestRender,
      services: {
        youtube: {
          bridgeClient: {
            getTranscript,
          },
        },
      },
    });

    expect(getTranscriptSearchIntentItems(context, 'needle')).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-loading-direct-transcript-video-0017',
        kind: 'status',
        title: 'Loading transcript…',
      }),
    ]);
    expect(getTranscript).toHaveBeenCalledWith('direct-transcript-video-0017');

    await Promise.resolve();
    await Promise.resolve();

    expect(requestRender).toHaveBeenCalled();
    expect(getYouTubeRootItems(context, 't/needle')).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-line-direct-transcript-video-0017-0-12000',
        kind: 'search-result',
        title: '0:12 A useful needle appears here',
        action: { kind: 'seek', seconds: 12, seekMode: 'absolute' },
      }),
    ]);
  });
});
