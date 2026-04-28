export const YOUTUBE_BRIDGE_PROTOCOL = 'vilify-youtube-bridge-v1' as const;
export const YOUTUBE_BRIDGE_REQUEST_EVENT = 'vilify:youtube-bridge:request' as const;
export const YOUTUBE_BRIDGE_RESPONSE_EVENT = 'vilify:youtube-bridge:response' as const;

export type YouTubeBridgeRequestId = string;

export interface VideoMetadata {
  readonly videoId: string;
  readonly title?: string;
  readonly durationSeconds?: number;
  readonly author?: string;
  readonly channelId?: string;
  readonly shortDescription?: string;
  readonly isLive?: boolean;
}

export type VideoMetadataUnavailableReason =
  | 'bridge-unavailable'
  | 'missing-player-response'
  | 'missing-video-details'
  | 'missing-video-id'
  | 'timeout';

export type StaleVideoResult = {
  readonly status: 'stale';
  readonly reason: 'stale-video-id';
  readonly requestedVideoId?: string;
  readonly actualVideoId?: string;
};

export function createStaleVideoResult(
  requestedVideoId: string | undefined,
  actualVideoId: string | undefined,
): StaleVideoResult {
  return {
    status: 'stale',
    reason: 'stale-video-id',
    ...(requestedVideoId ? { requestedVideoId } : {}),
    ...(actualVideoId ? { actualVideoId } : {}),
  };
}

export type VideoMetadataResult =
  | { readonly status: 'ok'; readonly metadata: VideoMetadata }
  | {
      readonly status: 'unavailable';
      readonly reason: VideoMetadataUnavailableReason;
      readonly videoId?: string;
      readonly message?: string;
    }
  | StaleVideoResult;

export interface TranscriptLine {
  time: number;
  timeText: string;
  duration: number;
  text: string;
}

export type TranscriptSource = 'innertube' | 'caption-json3' | 'caption-xml';

export type TranscriptUnavailableReason =
  | 'bridge-unavailable'
  | 'caption-fetch-failed'
  | 'caption-parse-failed'
  | 'caption-tracks-missing'
  | 'empty-transcript'
  | 'innertube-context-missing'
  | 'innertube-fetch-failed'
  | 'missing-video-id'
  | 'timeout'
  | 'transcript-params-missing';

export type TranscriptResult =
  | {
      status: 'loaded';
      videoId: string;
      lines: TranscriptLine[];
      language: string | null;
      source?: TranscriptSource;
      trackName?: string;
    }
  | {
      status: 'unavailable';
      reason: TranscriptUnavailableReason;
      videoId?: string;
      message?: string;
    }
  | StaleVideoResult;

export interface CaptionTrack {
  readonly baseUrl: string;
  readonly name?: string;
  readonly languageCode?: string;
  readonly vssId?: string;
  readonly kind?: string;
  readonly isTranslatable?: boolean;
}

export type YouTubeBridgeRequest =
  | {
      readonly protocol: typeof YOUTUBE_BRIDGE_PROTOCOL;
      readonly kind: 'get-video-metadata';
      readonly requestId: YouTubeBridgeRequestId;
      readonly expectedVideoId?: string;
    }
  | {
      readonly protocol: typeof YOUTUBE_BRIDGE_PROTOCOL;
      readonly kind: 'get-transcript';
      readonly requestId: YouTubeBridgeRequestId;
      readonly videoId?: string;
      readonly preferredLanguageCode?: string;
    };

export type YouTubeBridgeResponse =
  | {
      readonly protocol: typeof YOUTUBE_BRIDGE_PROTOCOL;
      readonly kind: 'video-metadata-response';
      readonly requestId: YouTubeBridgeRequestId;
      readonly result: VideoMetadataResult;
    }
  | {
      readonly protocol: typeof YOUTUBE_BRIDGE_PROTOCOL;
      readonly kind: 'transcript-response';
      readonly requestId: YouTubeBridgeRequestId;
      readonly result: TranscriptResult;
    };

const youtubeBridgeRequestKinds = ['get-video-metadata', 'get-transcript'] as const;
const youtubeBridgeResponseKinds = ['video-metadata-response', 'transcript-response'] as const;

type YouTubeBridgeEnvelope = {
  readonly protocol: typeof YOUTUBE_BRIDGE_PROTOCOL;
  readonly requestId: string;
  readonly kind: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isYouTubeBridgeEnvelope(value: unknown, kinds: readonly string[]): value is YouTubeBridgeEnvelope {
  return (
    isRecord(value) &&
    value.protocol === YOUTUBE_BRIDGE_PROTOCOL &&
    typeof value.requestId === 'string' &&
    typeof value.kind === 'string' &&
    kinds.includes(value.kind)
  );
}

export function isYouTubeBridgeRequest(value: unknown): value is YouTubeBridgeRequest {
  return isYouTubeBridgeEnvelope(value, youtubeBridgeRequestKinds);
}

export function isYouTubeBridgeResponse(value: unknown): value is YouTubeBridgeResponse {
  return isYouTubeBridgeEnvelope(value, youtubeBridgeResponseKinds);
}
