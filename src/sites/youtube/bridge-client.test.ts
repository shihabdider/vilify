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

  it('uses the current video id at getTranscript call time when no explicit id is provided', async () => {
    vi.useFakeTimers();
    const dom = makeDom();
    const requests: YouTubeBridgeRequest[] = [];
    dom.window.document.addEventListener(YOUTUBE_BRIDGE_REQUEST_EVENT, (event) => {
      requests.push((event as CustomEvent<YouTubeBridgeRequest>).detail);
    });
    let currentVideoId = 'first-video';
    const requestIds = ['req-first-transcript', 'req-second-transcript'];
    const client = createYouTubeBridgeClient({
      document: dom.window.document,
      timeoutMs: 1000,
      createRequestId: () => requestIds.shift() ?? 'extra',
      getCurrentVideoId: () => currentVideoId,
    });

    const firstResult = client.getTranscript();

    expect(requests[0]).toEqual({
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'get-transcript',
      requestId: 'req-first-transcript',
      videoId: 'first-video',
    });
    dispatchResponse(dom.window.document, {
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'transcript-response',
      requestId: 'req-first-transcript',
      result: {
        status: 'loaded',
        videoId: 'first-video',
        source: 'caption-json3',
        language: null,
        lines: [],
      },
    });
    await expect(firstResult).resolves.toEqual({
      status: 'loaded',
      videoId: 'first-video',
      source: 'caption-json3',
      language: null,
      lines: [],
    });

    currentVideoId = 'second-video';
    const secondResult = client.getTranscript();

    expect(requests[1]).toEqual({
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'get-transcript',
      requestId: 'req-second-transcript',
      videoId: 'second-video',
    });
    dispatchResponse(dom.window.document, {
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'transcript-response',
      requestId: 'req-second-transcript',
      result: {
        status: 'loaded',
        videoId: 'second-video',
        source: 'caption-json3',
        language: null,
        lines: [],
      },
    });
    await expect(secondResult).resolves.toEqual({
      status: 'loaded',
      videoId: 'second-video',
      source: 'caption-json3',
      language: null,
      lines: [],
    });
  });

  it('uses the current video id at getVideoMetadata call time when no explicit expected id is provided', async () => {
    vi.useFakeTimers();
    const dom = makeDom();
    const requests: YouTubeBridgeRequest[] = [];
    dom.window.document.addEventListener(YOUTUBE_BRIDGE_REQUEST_EVENT, (event) => {
      requests.push((event as CustomEvent<YouTubeBridgeRequest>).detail);
    });
    let currentVideoId = 'initial-video';
    const client = createYouTubeBridgeClient({
      document: dom.window.document,
      timeoutMs: 1000,
      createRequestId: () => 'req-current-metadata',
      getCurrentVideoId: () => currentVideoId,
    });

    currentVideoId = 'metadata-video';
    const result = client.getVideoMetadata();

    expect(requests[0]).toEqual({
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'get-video-metadata',
      requestId: 'req-current-metadata',
      expectedVideoId: 'metadata-video',
    });
    dispatchResponse(dom.window.document, {
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'video-metadata-response',
      requestId: 'req-current-metadata',
      result: {
        status: 'ok',
        metadata: {
          videoId: 'metadata-video',
          title: 'Metadata Video',
        },
      },
    });

    await expect(result).resolves.toEqual({
      status: 'ok',
      metadata: {
        videoId: 'metadata-video',
        title: 'Metadata Video',
      },
    });
  });

  it('reports stale transcript responses when the active video id changed before the response arrived', async () => {
    vi.useFakeTimers();
    const dom = makeDom();
    let currentVideoId = 'old-video';
    const client = createYouTubeBridgeClient({
      document: dom.window.document,
      timeoutMs: 1000,
      createRequestId: () => 'req-stale',
      getCurrentVideoId: () => currentVideoId,
    });

    const result = client.getTranscript();
    currentVideoId = 'new-video';

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

  it('reports stale metadata responses when the active video id changed before the response arrived', async () => {
    vi.useFakeTimers();
    const dom = makeDom();
    let currentVideoId = 'old-video';
    const client = createYouTubeBridgeClient({
      document: dom.window.document,
      timeoutMs: 1000,
      createRequestId: () => 'req-stale-metadata',
      getCurrentVideoId: () => currentVideoId,
    });

    const result = client.getVideoMetadata();
    currentVideoId = 'new-video';

    dispatchResponse(dom.window.document, {
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'video-metadata-response',
      requestId: 'req-stale-metadata',
      result: {
        status: 'ok',
        metadata: {
          videoId: 'old-video',
          title: 'Old Video',
        },
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
