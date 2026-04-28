import {
  YOUTUBE_BRIDGE_PROTOCOL,
  YOUTUBE_BRIDGE_REQUEST_EVENT,
  YOUTUBE_BRIDGE_RESPONSE_EVENT,
  createStaleVideoResult,
  isYouTubeBridgeRequest,
  type TranscriptResult,
  type YouTubeBridgeRequest,
  type YouTubeBridgeResponse,
  type VideoMetadataResult,
} from './bridge-types';
import {
  buildCaptionTrackUrl,
  extractCaptionTracks,
  extractTranscriptParams,
  extractVideoMetadata,
  parseCaptionJson3Transcript,
  parseCaptionXmlTranscript,
  parseInnerTubeTranscript,
  selectCaptionTrack,
} from './transcript-parser';
import { getYouTubeVideoId } from './url';

export const MAIN_WORLD_BRIDGE_MARKER = 'vilify-youtube-main-world-bridge' as const;

type BridgeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface MainWorldBridgeEnv {
  window?: Window;
  document?: Document;
  fetch?: BridgeFetch;
}

export interface MainWorldBridgeInitResult {
  kind: 'youtube-main-world-bridge';
  marker: typeof MAIN_WORLD_BRIDGE_MARKER;
  listenersInstalled: boolean;
}

interface BridgeRuntime {
  readonly window?: Window;
  readonly document: Document;
  readonly fetch?: BridgeFetch;
}

function readGlobalDocument(): Document | undefined {
  return typeof globalThis.document === 'undefined' ? undefined : globalThis.document;
}

function readGlobalWindow(): Window | undefined {
  return typeof globalThis.window === 'undefined' ? undefined : globalThis.window;
}

function readGlobalFetch(): BridgeFetch | undefined {
  return typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined;
}

function readWindowRecord(window: Window | undefined): Record<string, unknown> | null {
  return typeof window === 'object' && window !== null ? (window as unknown as Record<string, unknown>) : null;
}

function readPlayerResponse(window: Window | undefined): unknown {
  return readWindowRecord(window)?.ytInitialPlayerResponse;
}

function readInitialData(window: Window | undefined): unknown {
  return readWindowRecord(window)?.ytInitialData;
}

function readCurrentVideoId(window: Window | undefined, playerResponse: unknown = readPlayerResponse(window)): string | null {
  const structuredVideoId = extractVideoMetadata(playerResponse)?.videoId;
  if (structuredVideoId) {
    return structuredVideoId;
  }

  const href = window?.location?.href;
  if (!href) {
    return null;
  }

  try {
    return getYouTubeVideoId(new URL(href));
  } catch {
    return null;
  }
}

function dispatchBridgeResponse(document: Document, response: YouTubeBridgeResponse): void {
  const CustomEventCtor = document.defaultView?.CustomEvent ?? CustomEvent;
  document.dispatchEvent(new CustomEventCtor(YOUTUBE_BRIDGE_RESPONSE_EVENT, { detail: response }));
}

function readYtConfigValue(window: Window | undefined, key: string): unknown {
  const ytcfg = readWindowRecord(window)?.ytcfg;
  if (typeof ytcfg !== 'object' || ytcfg === null) {
    return undefined;
  }

  const record = ytcfg as Record<string, unknown>;
  const get = record.get;
  if (typeof get === 'function') {
    try {
      const value = get.call(ytcfg, key);
      if (value !== undefined) {
        return value;
      }
    } catch {
      // Fall through to data_ lookup.
    }
  }

  const data = record.data_;
  if (typeof data === 'object' && data !== null) {
    return (data as Record<string, unknown>)[key];
  }

  return undefined;
}

function readInnerTubeApiKey(window: Window | undefined): string | null {
  const value = readYtConfigValue(window, 'INNERTUBE_API_KEY');
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readInnerTubeContext(window: Window | undefined): unknown | null {
  return readYtConfigValue(window, 'INNERTUBE_CONTEXT') ?? null;
}

async function readResponseText(response: Response): Promise<string> {
  if ('ok' in response && response.ok === false) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (typeof response.text === 'function') {
    return response.text();
  }

  if (typeof response.json === 'function') {
    return JSON.stringify(await response.json());
  }

  return '';
}

async function readResponseJson(response: Response): Promise<unknown> {
  const text = await readResponseText(response);
  return JSON.parse(text.replace(/^\)\]\}'\s*/, ''));
}

function makeMetadataResponse(request: YouTubeBridgeRequest, runtime: BridgeRuntime): YouTubeBridgeResponse {
  const playerResponse = readPlayerResponse(runtime.window);
  const metadata = extractVideoMetadata(playerResponse);
  const actualVideoId = metadata?.videoId ?? readCurrentVideoId(runtime.window, playerResponse) ?? undefined;

  if (request.kind === 'get-video-metadata' && request.expectedVideoId && actualVideoId && request.expectedVideoId !== actualVideoId) {
    return {
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'video-metadata-response',
      requestId: request.requestId,
      result: createStaleVideoResult(request.expectedVideoId, actualVideoId),
    };
  }

  const result: VideoMetadataResult = metadata
    ? { status: 'ok', metadata }
    : {
        status: 'unavailable',
        reason: playerResponse ? 'missing-video-details' : 'missing-player-response',
        ...(actualVideoId ? { videoId: actualVideoId } : {}),
      };

  return {
    protocol: YOUTUBE_BRIDGE_PROTOCOL,
    kind: 'video-metadata-response',
    requestId: request.requestId,
    result,
  };
}

async function fetchInnerTubeTranscript(
  runtime: BridgeRuntime,
  videoId: string,
  params: string,
): Promise<TranscriptResult | null> {
  const fetch = runtime.fetch;
  const apiKey = readInnerTubeApiKey(runtime.window);
  const context = readInnerTubeContext(runtime.window);
  if (!fetch || !apiKey || !context) {
    return null;
  }

  const origin = runtime.window?.location?.origin || 'https://www.youtube.com';
  const url = new URL('/youtubei/v1/get_transcript', origin);
  url.searchParams.set('key', apiKey);

  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context, params }),
    });
    const data = await readResponseJson(response);
    const lines = parseInnerTubeTranscript(data);
    if (lines.length === 0) {
      return null;
    }

    return {
      status: 'loaded',
      videoId,
      lines,
      language: null,
      source: 'innertube',
    };
  } catch {
    return null;
  }
}

async function fetchCaptionTranscript(
  runtime: BridgeRuntime,
  videoId: string,
  preferredLanguageCode?: string,
): Promise<TranscriptResult> {
  const fetch = runtime.fetch;
  const track = selectCaptionTrack(extractCaptionTracks(readPlayerResponse(runtime.window)), preferredLanguageCode);
  if (!track) {
    return {
      status: 'unavailable',
      videoId,
      reason: 'caption-tracks-missing',
    };
  }
  if (!fetch) {
    return {
      status: 'unavailable',
      videoId,
      reason: 'caption-fetch-failed',
    };
  }

  try {
    const json3Response = await fetch(buildCaptionTrackUrl(track, 'json3'));
    const json3Text = await readResponseText(json3Response);
    const json3Lines = parseCaptionJson3Transcript(json3Text);
    if (json3Lines.length > 0) {
      return {
        status: 'loaded',
        videoId,
        lines: json3Lines,
        language: track.languageCode ?? null,
        source: 'caption-json3',
        ...(track.name ? { trackName: track.name } : {}),
      };
    }
  } catch {
    // Try XML below.
  }

  try {
    const xmlResponse = await fetch(buildCaptionTrackUrl(track, 'xml'));
    const xmlText = await readResponseText(xmlResponse);
    const xmlLines = parseCaptionXmlTranscript(xmlText);
    if (xmlLines.length > 0) {
      return {
        status: 'loaded',
        videoId,
        lines: xmlLines,
        language: track.languageCode ?? null,
        source: 'caption-xml',
        ...(track.name ? { trackName: track.name } : {}),
      };
    }

    return {
      status: 'unavailable',
      videoId,
      reason: 'caption-parse-failed',
    };
  } catch {
    return {
      status: 'unavailable',
      videoId,
      reason: 'caption-fetch-failed',
    };
  }
}

async function makeTranscriptResponse(request: YouTubeBridgeRequest, runtime: BridgeRuntime): Promise<YouTubeBridgeResponse> {
  if (request.kind !== 'get-transcript') {
    throw new Error('Invalid transcript request');
  }

  const playerResponse = readPlayerResponse(runtime.window);
  const actualVideoId = readCurrentVideoId(runtime.window, playerResponse) ?? undefined;
  const requestedVideoId = request.videoId?.trim() || actualVideoId;

  if (!requestedVideoId) {
    return {
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'transcript-response',
      requestId: request.requestId,
      result: {
        status: 'unavailable',
        reason: 'missing-video-id',
      },
    };
  }

  if (request.videoId && actualVideoId && request.videoId !== actualVideoId) {
    return {
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'transcript-response',
      requestId: request.requestId,
      result: createStaleVideoResult(request.videoId, actualVideoId),
    };
  }

  const params = extractTranscriptParams(readInitialData(runtime.window));
  if (params) {
    const innerTubeResult = await fetchInnerTubeTranscript(runtime, requestedVideoId, params);
    if (innerTubeResult?.status === 'loaded') {
      return {
        protocol: YOUTUBE_BRIDGE_PROTOCOL,
        kind: 'transcript-response',
        requestId: request.requestId,
        result: innerTubeResult,
      };
    }
  }

  const captionResult = await fetchCaptionTranscript(runtime, requestedVideoId, request.preferredLanguageCode);
  return {
    protocol: YOUTUBE_BRIDGE_PROTOCOL,
    kind: 'transcript-response',
    requestId: request.requestId,
    result: captionResult,
  };
}

function makeUnavailableResponse(request: YouTubeBridgeRequest): YouTubeBridgeResponse {
  if (request.kind === 'get-video-metadata') {
    return {
      protocol: YOUTUBE_BRIDGE_PROTOCOL,
      kind: 'video-metadata-response',
      requestId: request.requestId,
      result: {
        status: 'unavailable',
        reason: 'missing-player-response',
      },
    };
  }

  return {
    protocol: YOUTUBE_BRIDGE_PROTOCOL,
    kind: 'transcript-response',
    requestId: request.requestId,
    result: {
      status: 'unavailable',
      reason: 'caption-fetch-failed',
      ...(request.videoId ? { videoId: request.videoId } : {}),
    },
  };
}

async function handleBridgeRequest(request: YouTubeBridgeRequest, runtime: BridgeRuntime): Promise<YouTubeBridgeResponse> {
  if (request.kind === 'get-video-metadata') {
    return makeMetadataResponse(request, runtime);
  }

  return makeTranscriptResponse(request, runtime);
}

export function initMainWorldBridge(env: MainWorldBridgeEnv = {}): MainWorldBridgeInitResult {
  const document = env.document ?? readGlobalDocument();
  if (!document) {
    return {
      kind: 'youtube-main-world-bridge',
      marker: MAIN_WORLD_BRIDGE_MARKER,
      listenersInstalled: false,
    };
  }

  const runtime: BridgeRuntime = {
    document,
    window: env.window ?? document.defaultView ?? readGlobalWindow(),
    fetch: env.fetch ?? readGlobalFetch(),
  };

  document.addEventListener(YOUTUBE_BRIDGE_REQUEST_EVENT, (event) => {
    const request = (event as CustomEvent<unknown>).detail;
    if (!isYouTubeBridgeRequest(request)) {
      return;
    }

    void handleBridgeRequest(request, runtime)
      .then((response) => dispatchBridgeResponse(document, response))
      .catch(() => dispatchBridgeResponse(document, makeUnavailableResponse(request)));
  });

  return {
    kind: 'youtube-main-world-bridge',
    marker: MAIN_WORLD_BRIDGE_MARKER,
    listenersInstalled: true,
  };
}

initMainWorldBridge();
