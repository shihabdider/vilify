import { describe, expect, it, vi } from 'vitest';
import { createOmnibarActionExecutor } from '../../omnibar/actions';
import { createOmnibarRuntime } from '../../omnibar/runtime';
import { collectOmnibarItems, createInitialOmnibarState, setOmnibarQuery } from '../../omnibar/state';
import {
  domDocumentLocation,
  makeOmnibarTestDom,
  makeYouTubeWatchDom as makeDom,
  omnibarItemIds as itemIds,
  omnibarModeLabel as modeLabel,
  pressKey,
  pushDomHistory,
  reconfigureDomUrl,
  requireOmnibarInput as input,
  setOmnibarInputValue,
} from '../../test-helpers/omnibar';
import type { JSDOM } from 'jsdom';
import type { OmnibarItem, OmnibarMode, ProviderContext } from '../../omnibar/types';
import type { YouTubeBridgeClient } from './bridge-client';
import {
  YOUTUBE_BRIDGE_PROTOCOL,
  type TranscriptResult,
  type YouTubeBridgeRequest,
  type YouTubeBridgeResponse,
} from './bridge-types';
import {
  dispatchYouTubeBridgeResponse,
  recordYouTubeBridgeRequests as recordBridgeRequests,
} from '../../test-helpers/youtube-bridge';
import { youtubeDefaultMode, youtubePlugin, youtubeTranscriptMode } from './plugin';
import { createTranscriptProviderState, createYouTubeTranscriptMode } from './transcript-mode';

function providerContext(dom: JSDOM): ProviderContext {
  return {
    ...domDocumentLocation(dom),
    activePlugin: {
      plugin: youtubePlugin,
      url: new URL(dom.window.location.href),
    },
  };
}

function transcriptItemsForMode(
  mode: OmnibarMode,
  context: ProviderContext,
  query = '',
): readonly OmnibarItem[] {
  const initialState = createInitialOmnibarState(mode);
  const state = query ? setOmnibarQuery(initialState, query) : initialState;

  return collectOmnibarItems(state, context);
}

function transcriptItemsForContext(context: ProviderContext, query = ''): readonly OmnibarItem[] {
  return transcriptItemsForMode(youtubeTranscriptMode, context, query);
}

function transcriptItems(dom: JSDOM, query = ''): readonly OmnibarItem[] {
  return transcriptItemsForContext(providerContext(dom), query);
}

function pendingBridgeFactory() {
  const getTranscript = vi.fn((_videoId?: string) => new Promise<TranscriptResult>(() => {}));
  const createBridgeClient = vi.fn(
    (): YouTubeBridgeClient => ({
      getVideoMetadata: async () => ({ status: 'unavailable', reason: 'bridge-unavailable' }),
      getTranscript,
    }),
  );

  return { createBridgeClient, getTranscript };
}

function dispatchTranscriptResponse(
  document: Document,
  request: YouTubeBridgeRequest,
  result: TranscriptResult,
): void {
  const response: YouTubeBridgeResponse = {
    protocol: YOUTUBE_BRIDGE_PROTOCOL,
    kind: 'transcript-response',
    requestId: request.requestId,
    result,
  };
  dispatchYouTubeBridgeResponse(document, response);
}

async function flushBridgeSettlement(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('youtubeTranscriptMode provider', () => {
  it('returns missing-video status without creating a bridge client on non-watch and Shorts pages', () => {
    const { createBridgeClient } = pendingBridgeFactory();
    const mode = createYouTubeTranscriptMode({ createBridgeClient });
    const cases = [
      {
        url: 'https://www.youtube.com/results?search_query=vilify',
        staleWatchUrl: 'https://www.youtube.com/watch?v=stale-results-video-0012',
      },
      {
        url: 'https://www.youtube.com/shorts/shorts-video-0012',
        staleWatchUrl: 'https://www.youtube.com/watch?v=stale-shorts-video-0012',
      },
    ];

    for (const testCase of cases) {
      const dom = makeOmnibarTestDom(testCase.url);
      const context: ProviderContext = {
        ...providerContext(dom),
        activePlugin: {
          plugin: youtubePlugin,
          url: new URL(testCase.staleWatchUrl),
        },
      };

      expect(transcriptItemsForMode(mode, context)).toEqual([
        expect.objectContaining({
          id: 'youtube-transcript-missing-video',
          kind: 'status',
          title: 'No active YouTube video',
          action: { kind: 'noop' },
        }),
      ]);
    }

    expect(createBridgeClient).not.toHaveBeenCalled();
  });

  it('uses the live watch video id after starting on a non-watch page and navigating by SPA history', () => {
    const dom = makeOmnibarTestDom('https://www.youtube.com/results?search_query=vilify');
    const context = providerContext(dom);
    const requests = recordBridgeRequests(dom.window.document);

    pushDomHistory(dom, '/watch?v=spa-new-video-0012');

    expect(transcriptItemsForContext(context)).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-loading-spa-new-video-0012',
        kind: 'status',
        title: 'Loading transcript…',
      }),
    ]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ kind: 'get-transcript', videoId: 'spa-new-video-0012' });
  });

  it('passes a live current-video resolver to created bridge clients after history.pushState', async () => {
    const dom = makeDom('resolver-old-video-0012');
    const context = providerContext(dom);
    const requests = recordBridgeRequests(dom.window.document);

    expect(transcriptItemsForContext(context)).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-loading-resolver-old-video-0012',
        kind: 'status',
        title: 'Loading transcript…',
      }),
    ]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ kind: 'get-transcript', videoId: 'resolver-old-video-0012' });

    pushDomHistory(dom, '/watch?v=resolver-new-video-0012');
    dispatchTranscriptResponse(dom.window.document, requests[0], {
      status: 'loaded',
      videoId: 'resolver-old-video-0012',
      language: 'en',
      source: 'caption-json3',
      lines: [{ time: 7, timeText: '0:07', duration: 2, text: 'stale resolver line' }],
    });
    await flushBridgeSettlement();

    pushDomHistory(dom, '/watch?v=resolver-old-video-0012');

    expect(transcriptItemsForContext(context, 'stale resolver line')).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-unavailable-resolver-old-video-0012',
        kind: 'status',
        title: 'Transcript unavailable',
        subtitle: expect.stringContaining('Active video is resolver-new-video-0012'),
      }),
    ]);
    expect(requests).toHaveLength(1);
  });

  it('shows missing-video status on non-watch YouTube pages instead of requesting a stale activePlugin id', () => {
    const dom = makeOmnibarTestDom('https://www.youtube.com/results?search_query=vilify');
    const requests = recordBridgeRequests(dom.window.document);
    const context: ProviderContext = {
      ...providerContext(dom),
      activePlugin: {
        plugin: youtubePlugin,
        url: new URL('https://www.youtube.com/watch?v=stale-active-plugin-0012'),
      },
    };

    expect(transcriptItemsForContext(context)).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-missing-video',
        kind: 'status',
        title: 'No active YouTube video',
      }),
    ]);
    expect(requests).toHaveLength(0);
  });

  it('shows missing-video status on Shorts instead of requesting a stale activePlugin id', () => {
    const dom = makeOmnibarTestDom('https://www.youtube.com/shorts/shorts-video-0012');
    const requests = recordBridgeRequests(dom.window.document);
    const context: ProviderContext = {
      ...providerContext(dom),
      activePlugin: {
        plugin: youtubePlugin,
        url: new URL('https://www.youtube.com/watch?v=stale-shorts-video-0012'),
      },
    };

    expect(transcriptItemsForContext(context)).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-missing-video',
        kind: 'status',
        title: 'No active YouTube video',
      }),
    ]);
    expect(requests).toHaveLength(0);
  });

  it('prefers live location state over a stale activePlugin watch URL after SPA navigation', () => {
    const dom = makeDom('stale-active-plugin-0012');
    const context = providerContext(dom);
    const requests = recordBridgeRequests(dom.window.document);

    reconfigureDomUrl(dom, 'https://www.youtube.com/watch?v=live-state-wins-0012');

    expect(transcriptItemsForContext(context)).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-loading-live-state-wins-0012',
        kind: 'status',
        title: 'Loading transcript…',
      }),
    ]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ kind: 'get-transcript', videoId: 'live-state-wins-0012' });
  });

  it('prefers a non-empty service current video id over live location state', () => {
    const dom = makeDom('live-service-loses-0012');
    const requests = recordBridgeRequests(dom.window.document);
    const context: ProviderContext = {
      ...providerContext(dom),
      services: {
        youtube: {
          getCurrentVideoId: () => 'service-video-0012',
        },
      },
    };

    expect(transcriptItemsForContext(context)).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-loading-service-video-0012',
        kind: 'status',
        title: 'Loading transcript…',
      }),
    ]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ kind: 'get-transcript', videoId: 'service-video-0012' });
  });

  it('reuses a provided service bridge client instead of creating a DOM bridge request', () => {
    const dom = makeDom('service-bridge-video-0012');
    const requests = recordBridgeRequests(dom.window.document);
    const getTranscript = vi.fn(() => new Promise<TranscriptResult>(() => {}));
    const bridgeClient = {
      getTranscript,
      getVideoMetadata: vi.fn(),
    };
    const context: ProviderContext = {
      ...providerContext(dom),
      services: {
        youtube: { bridgeClient },
      },
    };

    expect(transcriptItemsForContext(context)).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-loading-service-bridge-video-0012',
        kind: 'status',
        title: 'Loading transcript…',
      }),
    ]);
    expect(getTranscript).toHaveBeenCalledTimes(1);
    expect(getTranscript).toHaveBeenCalledWith('service-bridge-video-0012');
    expect(requests).toHaveLength(0);
  });

  it('starts one bridge transcript request for a video and shares pending load state across calls', () => {
    const dom = makeDom('pending-video-0010');
    const requests = recordBridgeRequests(dom.window.document);

    expect(transcriptItems(dom)).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-loading-pending-video-0010',
        kind: 'status',
        title: 'Loading transcript…',
      }),
    ]);

    expect(transcriptItems(dom, 'needle')).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-loading-pending-video-0010',
        kind: 'status',
        title: 'Loading transcript…',
      }),
    ]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'get-transcript',
      videoId: 'pending-video-0010',
    });
  });

  it('renders loaded matching transcript lines as ranked timestamped search results with stable seek actions', async () => {
    const dom = makeDom('loaded-video-0010');
    const requests = recordBridgeRequests(dom.window.document);

    transcriptItems(dom);
    expect(requests).toHaveLength(1);

    dispatchTranscriptResponse(dom.window.document, requests[0], {
      status: 'loaded',
      videoId: 'loaded-video-0010',
      language: 'en',
      source: 'caption-json3',
      lines: [
        { time: 5, timeText: '0:05', duration: 2, text: 'A later needle mention' },
        { time: 123, timeText: '2:03', duration: 4, text: 'Needle exact moment' },
        { time: 150, timeText: '2:30', duration: 3, text: 'Unrelated closing words' },
      ],
    });
    await flushBridgeSettlement();

    const items = transcriptItems(dom, 'needle');

    expect(items.map((item) => item.id)).toEqual([
      'youtube-transcript-line-loaded-video-0010-1-123000',
      'youtube-transcript-line-loaded-video-0010-0-5000',
    ]);
    expect(items[0]).toMatchObject({
      kind: 'search-result',
      title: '2:03 Needle exact moment',
      subtitle: 'Jump to 2:03',
      keywords: expect.arrayContaining(['Needle exact moment', '2:03', 'transcript']),
      action: { kind: 'seek', seconds: 123, seekMode: 'absolute' },
    });
  });

  it('shows an unavailable status item after transcript retrieval fails without mutating page DOM', async () => {
    const dom = makeDom('unavailable-video-0010');
    const page = dom.window.document.getElementById('page');
    const beforePageHtml = page?.outerHTML;
    const requests = recordBridgeRequests(dom.window.document);

    transcriptItems(dom);
    expect(requests).toHaveLength(1);

    dispatchTranscriptResponse(dom.window.document, requests[0], {
      status: 'unavailable',
      videoId: 'unavailable-video-0010',
      reason: 'empty-transcript',
      message: 'No captions are available for this video.',
    });
    await flushBridgeSettlement();

    expect(transcriptItems(dom)).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-unavailable-unavailable-video-0010',
        kind: 'status',
        title: 'Transcript unavailable',
        subtitle: expect.stringContaining('No captions are available for this video.'),
        action: { kind: 'noop' },
      }),
    ]);
    expect(page?.outerHTML).toBe(beforePageHtml);
  });

  it('ignores a loaded old-video cache when live navigation points to another watch page or non-watch page', () => {
    const state = createTranscriptProviderState();
    state.cacheByVideoId.set('cached-old-video-0012', {
      status: 'loaded',
      result: {
        status: 'loaded',
        videoId: 'cached-old-video-0012',
        language: 'en',
        source: 'caption-json3',
        lines: [{ time: 12, timeText: '0:12', duration: 2, text: 'Cached old transcript line' }],
      },
    });
    const { createBridgeClient, getTranscript } = pendingBridgeFactory();
    const mode = createYouTubeTranscriptMode({ state, createBridgeClient });
    const dom = makeDom('cached-old-video-0012');
    const context = providerContext(dom);

    expect(transcriptItemsForMode(mode, context, 'cached old')).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-line-cached-old-video-0012-0-12000',
        kind: 'search-result',
        title: '0:12 Cached old transcript line',
      }),
    ]);
    expect(createBridgeClient).not.toHaveBeenCalled();

    pushDomHistory(dom, '/watch?v=cached-current-video-0012');
    const currentWatchItems = transcriptItemsForMode(mode, context, 'cached old');

    expect(currentWatchItems).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-loading-cached-current-video-0012',
        kind: 'status',
        title: 'Loading transcript…',
      }),
    ]);
    expect(currentWatchItems).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'search-result',
          title: expect.stringContaining('Cached old transcript line'),
        }),
      ]),
    );
    expect(createBridgeClient).toHaveBeenCalledTimes(1);
    expect(getTranscript).toHaveBeenCalledWith('cached-current-video-0012');

    pushDomHistory(dom, '/results?search_query=vilify');
    const nonWatchItems = transcriptItemsForMode(mode, context, 'cached old');

    expect(nonWatchItems).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-missing-video',
        kind: 'status',
        title: 'No active YouTube video',
      }),
    ]);
    expect(nonWatchItems).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'search-result',
          title: expect.stringContaining('Cached old transcript line'),
        }),
      ]),
    );
    expect(createBridgeClient).toHaveBeenCalledTimes(1);
  });

  it('renders stale bridge responses as unavailable status rows instead of transcript line rows', async () => {
    const dom = makeDom('stale-response-video-0012');
    const requests = recordBridgeRequests(dom.window.document);

    transcriptItems(dom);
    expect(requests).toHaveLength(1);

    dispatchTranscriptResponse(dom.window.document, requests[0], {
      status: 'stale',
      reason: 'stale-video-id',
      requestedVideoId: 'stale-response-video-0012',
      actualVideoId: 'current-response-video-0012',
    });
    await flushBridgeSettlement();

    const items = transcriptItems(dom, 'stale');

    expect(items).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-unavailable-stale-response-video-0012',
        kind: 'status',
        title: 'Transcript unavailable',
        subtitle: expect.stringContaining('Active video is current-response-video-0012'),
      }),
    ]);
    expect(items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'search-result',
        }),
      ]),
    );
  });

  it('does not show stale loaded lines when the active video id changes before a pending request resolves', async () => {
    const dom = makeDom('old-video-0010');
    const requests = recordBridgeRequests(dom.window.document);

    transcriptItems(dom);
    expect(requests).toHaveLength(1);

    reconfigureDomUrl(dom, 'https://www.youtube.com/watch?v=new-video-0010');
    dispatchTranscriptResponse(dom.window.document, requests[0], {
      status: 'loaded',
      videoId: 'old-video-0010',
      language: 'en',
      source: 'innertube',
      lines: [{ time: 42, timeText: '0:42', duration: 2, text: 'Old stale line' }],
    });
    await flushBridgeSettlement();

    const newVideoItems = transcriptItems(dom, 'Old stale line');

    expect(newVideoItems).toEqual([
      expect.objectContaining({
        id: 'youtube-transcript-loading-new-video-0010',
        kind: 'status',
        title: 'Loading transcript…',
      }),
    ]);
    expect(newVideoItems).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'search-result',
          title: expect.stringContaining('Old stale line'),
        }),
      ]),
    );
    expect(requests).toHaveLength(2);
    expect(requests[1]).toMatchObject({ kind: 'get-transcript', videoId: 'new-video-0010' });
  });
});

describe('YouTube transcript omnibar integration', () => {
  it('enters transcript mode from the Search transcript default item and pops back to default mode with Escape', () => {
    const dom = makeDom(
      'entry-video-0010',
      '<main id="page"><video></video><button id="native-control">Native page control</button></main>',
    );
    recordBridgeRequests(dom.window.document);
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: youtubeDefaultMode,
      providerContext: providerContext(dom),
    });

    runtime.open();
    setOmnibarInputValue(dom.window, dom.window.document, 'search transcript');

    expect(itemIds(dom.window.document)).toEqual(['youtube-open-transcript']);
    const enter = pressKey(dom.window, input(dom.window.document), 'Enter');

    expect(enter.defaultPrevented).toBe(true);
    expect(runtime.getState().modeStack.map((mode) => mode.id)).toEqual(['youtube-root', 'youtube-transcript']);
    expect(modeLabel(dom.window.document)).toBe('search transcript');
    expect(input(dom.window.document).placeholder).toBe('Search this video transcript');

    const escape = pressKey(dom.window, input(dom.window.document), 'Escape');

    expect(escape.defaultPrevented).toBe(true);
    expect(runtime.getState().modeStack.map((mode) => mode.id)).toEqual(['youtube-root']);
    expect(modeLabel(dom.window.document)).toBe('youtube');
    expect(input(dom.window.document).placeholder).toBe('Search YouTube commands');
  });

  it('executes Enter on a selected transcript result as an absolute native video seek without clicking page controls', async () => {
    const dom = makeDom(
      'seek-video-0010',
      '<main id="page"><video id="native-video"></video><button id="native-control">Native page control</button></main>',
    );
    const video = dom.window.document.getElementById('native-video') as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { configurable: true, value: 300 });
    video.currentTime = 10;
    const nativeControl = dom.window.document.getElementById('native-control') as HTMLButtonElement;
    const nativeClick = vi.fn();
    nativeControl.addEventListener('click', nativeClick);
    const requests = recordBridgeRequests(dom.window.document);
    const runtime = createOmnibarRuntime({
      document: dom.window.document,
      rootMode: youtubeDefaultMode,
      providerContext: providerContext(dom),
      actionExecutor: createOmnibarActionExecutor(),
    });

    runtime.open();
    setOmnibarInputValue(dom.window, dom.window.document, 'search transcript');
    pressKey(dom.window, input(dom.window.document), 'Enter');
    expect(requests).toHaveLength(1);

    dispatchTranscriptResponse(dom.window.document, requests[0], {
      status: 'loaded',
      videoId: 'seek-video-0010',
      language: 'en',
      source: 'caption-json3',
      lines: [{ time: 123, timeText: '2:03', duration: 3, text: 'Jump here' }],
    });
    await flushBridgeSettlement();

    expect(itemIds(dom.window.document)).toEqual(['youtube-transcript-line-seek-video-0010-0-123000']);
    const enter = pressKey(dom.window, input(dom.window.document), 'Enter');

    expect(enter.defaultPrevented).toBe(true);
    expect(video.currentTime).toBe(123);
    expect(nativeClick).not.toHaveBeenCalled();
    expect(runtime.getState().open).toBe(false);
  });
});
