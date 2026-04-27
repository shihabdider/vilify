import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  MAIN_WORLD_BRIDGE_MARKER,
  initMainWorldBridge,
} from './main-world-bridge';
import {
  YOUTUBE_BRIDGE_PROTOCOL,
  YOUTUBE_BRIDGE_REQUEST_EVENT,
  YOUTUBE_BRIDGE_RESPONSE_EVENT,
  type YouTubeBridgeRequest,
  type YouTubeBridgeResponse,
} from './bridge-types';

function makeDom(): JSDOM {
  return new JSDOM('<!doctype html><html><body><ytd-app></ytd-app></body></html>', {
    url: 'https://www.youtube.com/watch?v=abc123',
  });
}

function defineWindowValue(window: Window, key: string, value: unknown): void {
  Object.defineProperty(window, key, {
    configurable: true,
    value,
  });
}

function requestBridge(document: Document, request: YouTubeBridgeRequest): Promise<YouTubeBridgeResponse> {
  const CustomEventCtor = document.defaultView?.CustomEvent ?? CustomEvent;
  const response = new Promise<YouTubeBridgeResponse>((resolve) => {
    document.addEventListener(
      YOUTUBE_BRIDGE_RESPONSE_EVENT,
      (event) => resolve((event as CustomEvent<YouTubeBridgeResponse>).detail),
      { once: true },
    );
  });

  document.dispatchEvent(new CustomEventCtor(YOUTUBE_BRIDGE_REQUEST_EVENT, { detail: request }));
  return response;
}

const innerTubeFixture = {
  actions: [
    {
      updateEngagementPanelAction: {
        content: {
          transcriptRenderer: {
            content: {
              transcriptSearchPanelRenderer: {
                body: {
                  transcriptSegmentListRenderer: {
                    initialSegments: [
                      {
                        transcriptSegmentRenderer: {
                          startMs: '0',
                          endMs: '1500',
                          snippet: { runs: [{ text: 'InnerTube line' }] },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  ],
};

describe('initMainWorldBridge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('installs a typed request listener and dispatches metadata responses without mutating DOM', async () => {
    const dom = makeDom();
    defineWindowValue(dom.window, 'ytInitialPlayerResponse', {
      videoDetails: {
        videoId: 'abc123',
        title: 'Structured Video',
        lengthSeconds: '42',
      },
    });
    const beforeHtml = dom.window.document.documentElement.outerHTML;

    expect(
      initMainWorldBridge({
        window: dom.window,
        document: dom.window.document,
      }),
    ).toEqual({
      kind: 'youtube-main-world-bridge',
      marker: MAIN_WORLD_BRIDGE_MARKER,
      listenersInstalled: true,
    });

    await expect(
      requestBridge(dom.window.document, {
        protocol: YOUTUBE_BRIDGE_PROTOCOL,
        kind: 'get-video-metadata',
        requestId: 'req-meta',
        expectedVideoId: 'abc123',
      }),
    ).resolves.toEqual({
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'video-metadata-response',
      requestId: 'req-meta',
      result: {
        status: 'ok',
        metadata: {
          videoId: 'abc123',
          title: 'Structured Video',
          durationSeconds: 42,
        },
      },
    });
    expect(dom.window.document.documentElement.outerHTML).toBe(beforeHtml);
  });

  it('uses engagement-panel params to fetch InnerTube transcripts and dispatch normalized transcript responses', async () => {
    const dom = makeDom();
    defineWindowValue(dom.window, 'ytInitialPlayerResponse', {
      videoDetails: { videoId: 'abc123', title: 'Structured Video' },
    });
    defineWindowValue(dom.window, 'ytInitialData', {
      engagementPanels: [
        {
          engagementPanelSectionListRenderer: {
            content: {
              continuationItemRenderer: {
                continuationEndpoint: {
                  getTranscriptEndpoint: { params: 'TRANSCRIPT_PARAMS' },
                },
              },
            },
          },
        },
      ],
    });
    defineWindowValue(dom.window, 'ytcfg', {
      get: vi.fn((key: string) => {
        if (key === 'INNERTUBE_API_KEY') return 'api-key';
        if (key === 'INNERTUBE_CONTEXT') return { client: { clientName: 'WEB', clientVersion: '1.0' } };
        return undefined;
      }),
    });
    const fetch = vi.fn(async () => new Response(JSON.stringify(innerTubeFixture)));
    const beforeHtml = dom.window.document.documentElement.outerHTML;

    initMainWorldBridge({ window: dom.window, document: dom.window.document, fetch });

    await expect(
      requestBridge(dom.window.document, {
        protocol: YOUTUBE_BRIDGE_PROTOCOL,
        kind: 'get-transcript',
        requestId: 'req-transcript',
        videoId: 'abc123',
      }),
    ).resolves.toEqual({
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'transcript-response',
      requestId: 'req-transcript',
      result: {
        status: 'loaded',
        videoId: 'abc123',
        source: 'innertube',
        language: null,
        lines: [
          {
            time: 0,
            timeText: '0:00',
            duration: 1.5,
            text: 'InnerTube line',
          },
        ],
      },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toContain('/youtubei/v1/get_transcript?key=api-key');
    expect(JSON.parse(String(init?.body))).toEqual({
      context: { client: { clientName: 'WEB', clientVersion: '1.0' } },
      params: 'TRANSCRIPT_PARAMS',
    });
    expect(dom.window.document.documentElement.outerHTML).toBe(beforeHtml);
  });

  it('falls back to structured caption tracks when InnerTube transcript data is unavailable', async () => {
    const dom = makeDom();
    defineWindowValue(dom.window, 'ytInitialPlayerResponse', {
      videoDetails: { videoId: 'abc123', title: 'Structured Video' },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            {
              baseUrl: 'https://www.youtube.com/api/timedtext?v=abc123&lang=en',
              name: { simpleText: 'English' },
              languageCode: 'en',
            },
          ],
        },
      },
    });
    const fetch = vi.fn(async (url: string | URL | Request) => {
      expect(new URL(String(url)).searchParams.get('fmt')).toBe('json3');
      return new Response(
        JSON.stringify({
          events: [
            { tStartMs: 2500, dDurationMs: 1250, segs: [{ utf8: 'Caption fallback' }] },
          ],
        }),
      );
    });
    const beforeHtml = dom.window.document.documentElement.outerHTML;

    initMainWorldBridge({ window: dom.window, document: dom.window.document, fetch });

    await expect(
      requestBridge(dom.window.document, {
        protocol: YOUTUBE_BRIDGE_PROTOCOL,
        kind: 'get-transcript',
        requestId: 'req-caption',
        videoId: 'abc123',
      }),
    ).resolves.toEqual({
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'transcript-response',
      requestId: 'req-caption',
      result: {
        status: 'loaded',
        videoId: 'abc123',
        source: 'caption-json3',
        language: 'en',
        trackName: 'English',
        lines: [
          {
            time: 2.5,
            timeText: '0:02',
            duration: 1.25,
            text: 'Caption fallback',
          },
        ],
      },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(dom.window.document.documentElement.outerHTML).toBe(beforeHtml);
  });
});
