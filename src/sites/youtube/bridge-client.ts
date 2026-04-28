import {
  YOUTUBE_BRIDGE_PROTOCOL,
  YOUTUBE_BRIDGE_REQUEST_EVENT,
  YOUTUBE_BRIDGE_RESPONSE_EVENT,
  createStaleVideoResult,
  isYouTubeBridgeResponse,
  type TranscriptResult,
  type VideoMetadataResult,
  type YouTubeBridgeRequest,
  type YouTubeBridgeRequestId,
  type YouTubeBridgeResponse,
} from './bridge-types';

const DEFAULT_TIMEOUT_MS = 3000;

export interface YouTubeBridgeClientEnv {
  readonly document?: Document;
  readonly timeoutMs?: number;
  readonly createRequestId?: () => YouTubeBridgeRequestId;
  readonly getCurrentVideoId?: () => string | null | undefined;
  readonly setTimeout?: typeof globalThis.setTimeout;
  readonly clearTimeout?: typeof globalThis.clearTimeout;
}

export interface YouTubeBridgeClient {
  readonly getVideoMetadata: (expectedVideoId?: string) => Promise<VideoMetadataResult>;
  readonly getTranscript: (videoId?: string) => Promise<TranscriptResult>;
}

let requestSequence = 0;

export function createYouTubeBridgeRequestId(): YouTubeBridgeRequestId {
  requestSequence += 1;
  return `vilify-youtube-${Date.now()}-${requestSequence}`;
}

function readCurrentVideoId(env: YouTubeBridgeClientEnv): string | null {
  try {
    const videoId = env.getCurrentVideoId?.()?.trim();
    return videoId ? videoId : null;
  } catch {
    return null;
  }
}

function dispatchBridgeRequest(document: Document, request: YouTubeBridgeRequest): void {
  const CustomEventCtor = document.defaultView?.CustomEvent ?? CustomEvent;
  document.dispatchEvent(new CustomEventCtor(YOUTUBE_BRIDGE_REQUEST_EVENT, { detail: request }));
}

function applyTranscriptStaleCheck(
  result: TranscriptResult,
  requestedVideoId: string | undefined,
  activeVideoId: string | null,
): TranscriptResult {
  if (result.status === 'stale') {
    return result;
  }

  const resultVideoId = result.status === 'loaded' || result.status === 'unavailable' ? result.videoId : undefined;
  return staleResultForVideoMismatch(resultVideoId, requestedVideoId, activeVideoId) ?? result;
}

function applyMetadataStaleCheck(
  result: VideoMetadataResult,
  requestedVideoId: string | undefined,
  activeVideoId: string | null,
): VideoMetadataResult {
  if (result.status === 'stale') {
    return result;
  }

  const resultVideoId = result.status === 'ok' ? result.metadata.videoId : result.videoId;
  return staleResultForVideoMismatch(resultVideoId, requestedVideoId, activeVideoId) ?? result;
}

function staleResultForVideoMismatch(
  resultVideoId: string | undefined,
  requestedVideoId: string | undefined,
  activeVideoId: string | null,
): ReturnType<typeof createStaleVideoResult> | null {
  if (activeVideoId && resultVideoId && resultVideoId !== activeVideoId) {
    return createStaleVideoResult(resultVideoId, activeVideoId);
  }

  if (requestedVideoId && resultVideoId && resultVideoId !== requestedVideoId) {
    return createStaleVideoResult(requestedVideoId, resultVideoId);
  }

  return null;
}

type BridgeUnavailableResult = {
  readonly status: 'unavailable';
  readonly reason: 'timeout' | 'bridge-unavailable';
  readonly videoId?: string;
};

type VideoMetadataResponse = Extract<YouTubeBridgeResponse, { readonly kind: 'video-metadata-response' }>;
type TranscriptResponse = Extract<YouTubeBridgeResponse, { readonly kind: 'transcript-response' }>;

interface VideoScopedBridgeRequestConfig<Result, Response extends YouTubeBridgeResponse> {
  readonly requestKind: YouTubeBridgeRequest['kind'];
  readonly responseKind: Response['kind'];
  readonly videoIdField: 'expectedVideoId' | 'videoId';
  readonly applyStaleCheck: (
    result: Result,
    requestedVideoId: string | undefined,
    activeVideoId: string | null,
  ) => Result;
}

function unavailableBridgeResult(
  env: YouTubeBridgeClientEnv,
  videoId: string | undefined,
): BridgeUnavailableResult {
  return {
    status: 'unavailable',
    reason: env.document || globalThis.document ? 'timeout' : 'bridge-unavailable',
    ...(videoId ? { videoId } : {}),
  };
}

const videoMetadataRequestConfig: VideoScopedBridgeRequestConfig<
  VideoMetadataResult,
  VideoMetadataResponse
> = {
  requestKind: 'get-video-metadata',
  responseKind: 'video-metadata-response',
  videoIdField: 'expectedVideoId',
  applyStaleCheck: applyMetadataStaleCheck,
};

const transcriptRequestConfig: VideoScopedBridgeRequestConfig<TranscriptResult, TranscriptResponse> = {
  requestKind: 'get-transcript',
  responseKind: 'transcript-response',
  videoIdField: 'videoId',
  applyStaleCheck: applyTranscriptStaleCheck,
};

function sendBridgeRequest<Result>(
  env: YouTubeBridgeClientEnv,
  request: YouTubeBridgeRequest,
  responseKind: YouTubeBridgeResponse['kind'],
  timeoutResult: Result,
  projectResponse: (response: YouTubeBridgeResponse) => Result | null,
): Promise<Result> {
  const document = env.document ?? globalThis.document;
  if (!document) {
    return Promise.resolve(timeoutResult);
  }

  const setTimer = env.setTimeout ?? globalThis.setTimeout;
  const clearTimer = env.clearTimeout ?? globalThis.clearTimeout;
  const timeoutMs = env.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve) => {
    let settled = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const settle = (result: Result): void => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeoutHandle !== undefined) {
        clearTimer(timeoutHandle);
      }
      document.removeEventListener(YOUTUBE_BRIDGE_RESPONSE_EVENT, onResponse);
      resolve(result);
    };

    const onResponse = (event: Event): void => {
      const response = (event as CustomEvent<unknown>).detail;
      if (!isYouTubeBridgeResponse(response)) {
        return;
      }

      if (response.requestId !== request.requestId || response.kind !== responseKind) {
        return;
      }

      const result = projectResponse(response);
      if (result !== null) {
        settle(result);
      }
    };

    document.addEventListener(YOUTUBE_BRIDGE_RESPONSE_EVENT, onResponse);
    timeoutHandle = setTimer(() => settle(timeoutResult), timeoutMs);
    dispatchBridgeRequest(document, request);
  });
}

function requestVideoScopedBridgeData<Result, Response extends YouTubeBridgeResponse>(
  env: YouTubeBridgeClientEnv,
  createRequestId: () => YouTubeBridgeRequestId,
  videoId: string | undefined,
  config: VideoScopedBridgeRequestConfig<Result, Response>,
): Promise<Result> {
  const requestId = createRequestId();
  const requestedVideoId = videoId?.trim() || readCurrentVideoId(env) || undefined;
  const request = {
    protocol: YOUTUBE_BRIDGE_PROTOCOL,
    kind: config.requestKind,
    requestId,
    ...(requestedVideoId ? { [config.videoIdField]: requestedVideoId } : {}),
  } as YouTubeBridgeRequest;
  const timeoutResult = unavailableBridgeResult(env, requestedVideoId) as Result;

  return sendBridgeRequest(env, request, config.responseKind, timeoutResult, (response) => {
    if (response.kind !== config.responseKind) {
      return null;
    }

    return config.applyStaleCheck(
      (response as Response).result as Result,
      requestedVideoId,
      readCurrentVideoId(env),
    );
  });
}

export function createYouTubeBridgeClient(env: YouTubeBridgeClientEnv = {}): YouTubeBridgeClient {
  const createRequestId = env.createRequestId ?? createYouTubeBridgeRequestId;

  return {
    getVideoMetadata: (expectedVideoId) =>
      requestVideoScopedBridgeData(env, createRequestId, expectedVideoId, videoMetadataRequestConfig),

    getTranscript: (videoId) =>
      requestVideoScopedBridgeData(env, createRequestId, videoId, transcriptRequestConfig),
  };
}
