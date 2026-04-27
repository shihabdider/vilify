import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { createYouTubeBridgeClient } from './bridge-client';
import {
  YOUTUBE_BRIDGE_PROTOCOL,
  YOUTUBE_BRIDGE_REQUEST_EVENT,
  YOUTUBE_BRIDGE_RESPONSE_EVENT,
  type YouTubeBridgeRequest,
  type YouTubeBridgeResponse,
} from './bridge-types';

function makeDom(): JSDOM {
  return new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://www.youtube.com/watch?v=old-video',
  });
}

function dispatchResponse(document: Document, response: YouTubeBridgeResponse): void {
  const CustomEventCtor = document.defaultView?.CustomEvent ?? CustomEvent;
  document.dispatchEvent(new CustomEventCtor(YOUTUBE_BRIDGE_RESPONSE_EVENT, { detail: response }));
}

describe('createYouTubeBridgeClient', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns a typed timeout result and removes its listener when the bridge is absent', async () => {
    vi.useFakeTimers();
    const dom = makeDom();
    const requests: YouTubeBridgeRequest[] = [];
    dom.window.document.addEventListener(YOUTUBE_BRIDGE_REQUEST_EVENT, (event) => {
      requests.push((event as CustomEvent<YouTubeBridgeRequest>).detail);
    });
    const removeEventListener = vi.spyOn(dom.window.document, 'removeEventListener');
    const client = createYouTubeBridgeClient({
      document: dom.window.document,
      timeoutMs: 25,
      createRequestId: () => 'req-timeout',
      getCurrentVideoId: () => 'old-video',
    });

    const result = client.getTranscript('old-video');

    expect(requests).toEqual([
      {
        protocol: YOUTUBE_BRIDGE_PROTOCOL,
        kind: 'get-transcript',
        requestId: 'req-timeout',
        videoId: 'old-video',
      },
    ]);

    await vi.advanceTimersByTimeAsync(25);

    await expect(result).resolves.toEqual({
      status: 'unavailable',
      videoId: 'old-video',
      reason: 'timeout',
    });
    expect(removeEventListener).toHaveBeenCalledWith(YOUTUBE_BRIDGE_RESPONSE_EVENT, expect.any(Function));
  });

  it('matches concurrent responses only by their corresponding request ids and cleans up both listeners', async () => {
    vi.useFakeTimers();
    const dom = makeDom();
    const requests: YouTubeBridgeRequest[] = [];
    dom.window.document.addEventListener(YOUTUBE_BRIDGE_REQUEST_EVENT, (event) => {
      requests.push((event as CustomEvent<YouTubeBridgeRequest>).detail);
    });
    const removeEventListener = vi.spyOn(dom.window.document, 'removeEventListener');
    const requestIds = ['req-meta', 'req-transcript'];
    const client = createYouTubeBridgeClient({
      document: dom.window.document,
      timeoutMs: 1000,
      createRequestId: () => requestIds.shift() ?? 'extra',
      getCurrentVideoId: () => 'old-video',
    });

    const metadataPromise = client.getVideoMetadata('old-video');
    let metadataResolved = false;
    metadataPromise.then(() => {
      metadataResolved = true;
    });
    const transcriptPromise = client.getTranscript('old-video');

    expect(requests.map((request) => request.requestId)).toEqual(['req-meta', 'req-transcript']);

    dispatchResponse(dom.window.document, {
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'transcript-response',
      requestId: 'req-transcript',
      result: {
        status: 'loaded',
        videoId: 'old-video',
        source: 'caption-json3',
        language: null,
        lines: [],
      },
    });

    await expect(transcriptPromise).resolves.toEqual({
      status: 'loaded',
      videoId: 'old-video',
      source: 'caption-json3',
      language: null,
      lines: [],
    });
    await Promise.resolve();
    expect(metadataResolved).toBe(false);

    dispatchResponse(dom.window.document, {
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'video-metadata-response',
      requestId: 'req-meta',
      result: {
        status: 'ok',
        metadata: {
          videoId: 'old-video',
          title: 'Old Video',
        },
      },
    });

    await expect(metadataPromise).resolves.toEqual({
      status: 'ok',
      metadata: {
        videoId: 'old-video',
        title: 'Old Video',
      },
    });
    expect(removeEventListener).toHaveBeenCalledTimes(2);
  });

  it('reports stale transcript responses when the active video id changed before the response arrived', async () => {
    vi.useFakeTimers();
    const dom = makeDom();
    const client = createYouTubeBridgeClient({
      document: dom.window.document,
      timeoutMs: 1000,
      createRequestId: () => 'req-stale',
      getCurrentVideoId: () => 'new-video',
    });

    const result = client.getTranscript('old-video');

    dispatchResponse(dom.window.document, {
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'transcript-response',
      requestId: 'req-stale',
      result: {
        status: 'loaded',
        videoId: 'old-video',
        source: 'innertube',
        language: null,
        lines: [{ time: 0, timeText: '0:00', duration: 1, text: 'Old line' }],
      },
    });

    await expect(result).resolves.toEqual({
      status: 'stale',
      reason: 'stale-video-id',
      requestedVideoId: 'old-video',
      actualVideoId: 'new-video',
    });
  });
});
