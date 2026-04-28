import { describe, expect, it, vi } from 'vitest';
import { createOmnibarActionExecutor } from '../../omnibar/actions';
import { createOmnibarRuntime } from '../../omnibar/runtime';
import { collectOmnibarItems, createInitialOmnibarState, setOmnibarQuery } from '../../omnibar/state';
import {
  makeYouTubeWatchDom as makeDom,
  omnibarItemIds as itemIds,
  omnibarModeLabel as modeLabel,
  pressKey,
  requireOmnibarInput as input,
  setOmnibarInputValue,
} from '../../test-helpers/omnibar';
import type { JSDOM } from 'jsdom';
import type { OmnibarItem, ProviderContext } from '../../omnibar/types';
import {
  YOUTUBE_BRIDGE_PROTOCOL,
  YOUTUBE_BRIDGE_REQUEST_EVENT,
  YOUTUBE_BRIDGE_RESPONSE_EVENT,
  type TranscriptResult,
  type YouTubeBridgeRequest,
  type YouTubeBridgeResponse,
} from './bridge-types';
import { youtubeDefaultMode, youtubePlugin, youtubeTranscriptMode } from './plugin';

function providerContext(dom: JSDOM): ProviderContext {
  return {
    document: dom.window.document,
    location: dom.window.location,
    activePlugin: {
      plugin: youtubePlugin,
      url: new URL(dom.window.location.href),
    },
  };
}

function transcriptItems(dom: JSDOM, query = ''): readonly OmnibarItem[] {
  const initialState = createInitialOmnibarState(youtubeTranscriptMode);
  const state = query ? setOmnibarQuery(initialState, query) : initialState;

  return collectOmnibarItems(state, providerContext(dom));
}

function recordBridgeRequests(document: Document): YouTubeBridgeRequest[] {
  const requests: YouTubeBridgeRequest[] = [];
  document.addEventListener(YOUTUBE_BRIDGE_REQUEST_EVENT, (event) => {
    requests.push((event as CustomEvent<YouTubeBridgeRequest>).detail);
  });
  return requests;
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
  const CustomEventCtor = document.defaultView?.CustomEvent ?? CustomEvent;
  document.dispatchEvent(new CustomEventCtor(YOUTUBE_BRIDGE_RESPONSE_EVENT, { detail: response }));
}

async function flushBridgeSettlement(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('youtubeTranscriptMode provider', () => {
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

  it('does not show stale loaded lines when the active video id changes before a pending request resolves', async () => {
    const dom = makeDom('old-video-0010');
    const requests = recordBridgeRequests(dom.window.document);

    transcriptItems(dom);
    expect(requests).toHaveLength(1);

    dom.reconfigure({ url: 'https://www.youtube.com/watch?v=new-video-0010' });
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
    const dom = makeDom('entry-video-0010');
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
