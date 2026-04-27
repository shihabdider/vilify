import {
  YOUTUBE_BRIDGE_PROTOCOL,
  YOUTUBE_BRIDGE_REQUEST_EVENT,
  YOUTUBE_BRIDGE_RESPONSE_EVENT,
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

function staleResult(requestedVideoId: string | undefined, actualVideoId: string | undefined) {
  return {
    status: 'stale' as const,
    reason: 'stale-video-id' as const,
    ...(requestedVideoId ? { requestedVideoId } : {}),
    ...(actualVideoId ? { actualVideoId } : {}),
  };
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
  if (activeVideoId && resultVideoId && resultVideoId !== activeVideoId) {
    return staleResult(resultVideoId, activeVideoId);
  }

  if (requestedVideoId && resultVideoId && resultVideoId !== requestedVideoId) {
    return staleResult(requestedVideoId, resultVideoId);
  }

  return result;
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
  if (activeVideoId && resultVideoId && resultVideoId !== activeVideoId) {
    return staleResult(resultVideoId, activeVideoId);
  }

  if (requestedVideoId && resultVideoId && resultVideoId !== requestedVideoId) {
    return staleResult(requestedVideoId, resultVideoId);
  }

  return result;
}

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

export function createYouTubeBridgeClient(env: YouTubeBridgeClientEnv = {}): YouTubeBridgeClient {
  const createRequestId = env.createRequestId ?? createYouTubeBridgeRequestId;

  return {
    getVideoMetadata(expectedVideoId?: string): Promise<VideoMetadataResult> {
      const requestId = createRequestId();
      const requestedVideoId = expectedVideoId?.trim() || readCurrentVideoId(env) || undefined;
      const request: YouTubeBridgeRequest = requestedVideoId
        ? {
            protocol: YOUTUBE_BRIDGE_PROTOCOL,
            kind: 'get-video-metadata',
            requestId,
            expectedVideoId: requestedVideoId,
          }
        : {
            protocol: YOUTUBE_BRIDGE_PROTOCOL,
            kind: 'get-video-metadata',
            requestId,
          };
      const timeoutResult: VideoMetadataResult = {
        status: 'unavailable',
        reason: env.document || globalThis.document ? 'timeout' : 'bridge-unavailable',
        ...(requestedVideoId ? { videoId: requestedVideoId } : {}),
      };

      return sendBridgeRequest(env, request, 'video-metadata-response', timeoutResult, (response) => {
        if (response.kind !== 'video-metadata-response') {
          return null;
        }

        return applyMetadataStaleCheck(response.result, requestedVideoId, readCurrentVideoId(env));
      });
    },

    getTranscript(videoId?: string): Promise<TranscriptResult> {
      const requestId = createRequestId();
      const requestedVideoId = videoId?.trim() || readCurrentVideoId(env) || undefined;
      const request: YouTubeBridgeRequest = requestedVideoId
        ? {
            protocol: YOUTUBE_BRIDGE_PROTOCOL,
            kind: 'get-transcript',
            requestId,
            videoId: requestedVideoId,
          }
        : {
            protocol: YOUTUBE_BRIDGE_PROTOCOL,
            kind: 'get-transcript',
            requestId,
          };
      const timeoutResult: TranscriptResult = {
        status: 'unavailable',
        reason: env.document || globalThis.document ? 'timeout' : 'bridge-unavailable',
        ...(requestedVideoId ? { videoId: requestedVideoId } : {}),
      };

      return sendBridgeRequest(env, request, 'transcript-response', timeoutResult, (response) => {
        if (response.kind !== 'transcript-response') {
          return null;
        }

        return applyTranscriptStaleCheck(response.result, requestedVideoId, readCurrentVideoId(env));
      });
    },
  };
}
