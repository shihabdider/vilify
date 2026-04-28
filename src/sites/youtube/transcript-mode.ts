import type { OmnibarItem, OmnibarMode, OmnibarProvider, ProviderContext } from '../../omnibar/types';
import { createYouTubeBridgeClient, type YouTubeBridgeClient } from './bridge-client';
import type { TranscriptLine, TranscriptResult } from './bridge-types';
import { formatTranscriptTimestamp } from './transcript-parser';

const MAX_TRANSCRIPT_RESULTS = 50;

export interface TranscriptProviderState {
  readonly cacheByVideoId: Map<string, TranscriptLoadState>;
}

type LoadedTranscriptResult = Extract<TranscriptResult, { status: 'loaded' }>;

export type TranscriptLoadState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly promise: Promise<TranscriptResult> }
  | { readonly status: 'loaded'; readonly result: LoadedTranscriptResult }
  | {
      readonly status: 'unavailable';
      readonly reason: string;
      readonly message?: string;
    };

export interface YouTubeTranscriptModeOptions {
  readonly state?: TranscriptProviderState;
  readonly createBridgeClient?: (context: ProviderContext) => YouTubeBridgeClient;
}

interface RankedTranscriptLine {
  readonly line: TranscriptLine;
  readonly index: number;
  readonly score: number;
}

interface YouTubeProviderServices {
  readonly bridgeClient?: YouTubeBridgeClient;
  readonly getCurrentVideoId?: () => string | null | undefined;
}

export function createTranscriptProviderState(): TranscriptProviderState {
  return { cacheByVideoId: new Map() };
}

export function createYouTubeTranscriptMode(options: YouTubeTranscriptModeOptions = {}): OmnibarMode {
  return {
    id: 'youtube-transcript',
    title: 'Search transcript',
    placeholder: 'Search this video transcript',
    providers: [createYouTubeTranscriptProvider(options)],
  };
}

export function createYouTubeTranscriptProvider(
  options: YouTubeTranscriptModeOptions = {},
): OmnibarProvider {
  const state = options.state ?? createTranscriptProviderState();
  const createBridgeClient = options.createBridgeClient ?? createBridgeClientForContext;

  return {
    id: 'youtube-transcript-lines',
    getItems: (context, query) => getTranscriptItems(state, createBridgeClient, context, query),
  };
}

function getTranscriptItems(
  state: TranscriptProviderState,
  createBridgeClient: (context: ProviderContext) => YouTubeBridgeClient,
  context: ProviderContext,
  query: string,
): readonly OmnibarItem[] {
  const videoId = resolveActiveVideoId(context);
  if (!videoId) {
    return [missingVideoItem()];
  }

  const loadState = state.cacheByVideoId.get(videoId) ?? { status: 'idle' as const };
  switch (loadState.status) {
    case 'idle':
      return startTranscriptLoad(state, createBridgeClient, context, videoId);
    case 'loading':
      return [loadingItem(videoId)];
    case 'unavailable':
      return [unavailableItem(videoId, loadState)];
    case 'loaded':
      return transcriptResultItems(videoId, loadState.result.lines, query);
  }
}

function startTranscriptLoad(
  state: TranscriptProviderState,
  createBridgeClient: (context: ProviderContext) => YouTubeBridgeClient,
  context: ProviderContext,
  videoId: string,
): readonly OmnibarItem[] {
  try {
    const promise = createBridgeClient(context).getTranscript(videoId);
    const loadingState: TranscriptLoadState = { status: 'loading', promise };
    state.cacheByVideoId.set(videoId, loadingState);

    promise
      .then((result) => {
        if (state.cacheByVideoId.get(videoId) !== loadingState) {
          return;
        }

        state.cacheByVideoId.set(videoId, loadStateFromResult(videoId, result));
        context.requestRender?.();
      })
      .catch((error) => {
        if (state.cacheByVideoId.get(videoId) !== loadingState) {
          return;
        }

        state.cacheByVideoId.set(videoId, {
          status: 'unavailable',
          reason: 'bridge-error',
          message: error instanceof Error ? error.message : 'Transcript request failed.',
        });
        context.requestRender?.();
      });
  } catch (error) {
    const unavailableState: Extract<TranscriptLoadState, { status: 'unavailable' }> = {
      status: 'unavailable',
      reason: 'bridge-error',
      message: error instanceof Error ? error.message : 'Transcript request failed.',
    };
    state.cacheByVideoId.set(videoId, unavailableState);
    context.requestRender?.();
    return [unavailableItem(videoId, unavailableState)];
  }

  return [loadingItem(videoId)];
}

function loadStateFromResult(videoId: string, result: TranscriptResult): TranscriptLoadState {
  switch (result.status) {
    case 'loaded':
      if (result.videoId !== videoId) {
        return staleUnavailableState(result.videoId, videoId);
      }

      return { status: 'loaded', result };
    case 'unavailable':
      return {
        status: 'unavailable',
        reason: result.reason,
        message: result.message,
      };
    case 'stale':
      return staleUnavailableState(result.requestedVideoId, result.actualVideoId);
  }
}

function staleUnavailableState(
  requestedVideoId: string | undefined,
  actualVideoId: string | undefined,
): TranscriptLoadState {
  const suffix = actualVideoId ? ` Active video is ${actualVideoId}.` : '';
  return {
    status: 'unavailable',
    reason: 'stale-video-id',
    message: `Transcript response was for ${requestedVideoId ?? 'a previous video'}.${suffix}`,
  };
}

function transcriptResultItems(
  videoId: string,
  lines: readonly TranscriptLine[],
  query: string,
): readonly OmnibarItem[] {
  const rankedLines = rankTranscriptLines(lines, query).slice(0, MAX_TRANSCRIPT_RESULTS);
  if (rankedLines.length === 0) {
    return [noMatchesItem(videoId, query)];
  }

  return rankedLines.map(({ line, index }) => transcriptLineItem(videoId, line, index));
}

function rankTranscriptLines(lines: readonly TranscriptLine[], query: string): readonly RankedTranscriptLine[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return lines.map((line, index) => ({ line, index, score: 0 }));
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  return lines
    .map((line, index): RankedTranscriptLine | null => {
      const text = normalizeSearchText(line.text);
      const timeText = normalizeSearchText(displayTime(line));
      const searchableText = `${text} ${timeText}`.trim();

      if (!terms.every((term) => searchableText.includes(term))) {
        return null;
      }

      return {
        line,
        index,
        score: scoreTranscriptLine(text, timeText, normalizedQuery, terms),
      };
    })
    .filter((line): line is RankedTranscriptLine => line !== null)
    .sort((left, right) => right.score - left.score || safeLineTime(left.line) - safeLineTime(right.line));
}

function scoreTranscriptLine(
  text: string,
  timeText: string,
  normalizedQuery: string,
  terms: readonly string[],
): number {
  let score = 0;

  if (text === normalizedQuery) {
    score += 1000;
  }
  if (text.startsWith(normalizedQuery)) {
    score += 800;
  }
  if (text.includes(normalizedQuery)) {
    score += 600;
  }
  if (timeText.includes(normalizedQuery)) {
    score += 500;
  }

  for (const term of terms) {
    if (text.startsWith(term)) {
      score += 30;
    } else if (text.includes(term)) {
      score += 20;
    } else if (timeText.includes(term)) {
      score += 10;
    }
  }

  return score;
}

function transcriptLineItem(videoId: string, line: TranscriptLine, index: number): OmnibarItem {
  const timeText = displayTime(line);
  const seconds = safeLineTime(line);

  return {
    id: `youtube-transcript-line-${idPart(videoId)}-${index}-${Math.floor(seconds * 1000)}`,
    kind: 'search-result',
    title: `${timeText} ${line.text}`,
    subtitle: `Jump to ${timeText}`,
    keywords: [line.text, timeText, 'transcript'],
    action: { kind: 'seek', seconds, seekMode: 'absolute' },
  };
}

function missingVideoItem(): OmnibarItem {
  return {
    id: 'youtube-transcript-missing-video',
    kind: 'status',
    title: 'No active YouTube video',
    subtitle: 'Open a YouTube watch page with a video id to search its transcript.',
    keywords: ['transcript', 'missing video', 'youtube'],
    action: { kind: 'noop' },
  };
}

function loadingItem(videoId: string): OmnibarItem {
  return {
    id: `youtube-transcript-loading-${idPart(videoId)}`,
    kind: 'status',
    title: 'Loading transcript…',
    subtitle: 'Loading structured transcript data from YouTube.',
    keywords: ['transcript', 'loading', videoId],
    action: { kind: 'noop' },
  };
}

function unavailableItem(
  videoId: string,
  loadState: Extract<TranscriptLoadState, { status: 'unavailable' }>,
): OmnibarItem {
  return {
    id: `youtube-transcript-unavailable-${idPart(videoId)}`,
    kind: 'status',
    title: 'Transcript unavailable',
    subtitle: loadState.message ?? `Could not load this transcript (${loadState.reason}).`,
    keywords: ['transcript', 'unavailable', loadState.reason, videoId],
    action: { kind: 'noop' },
  };
}

function noMatchesItem(videoId: string, query: string): OmnibarItem {
  const normalizedQuery = query.trim();
  return {
    id: `youtube-transcript-no-matches-${idPart(videoId)}`,
    kind: 'status',
    title: 'No transcript matches',
    subtitle: normalizedQuery ? `No transcript lines match “${normalizedQuery}”.` : 'No transcript lines are available.',
    keywords: ['transcript', 'no matches', videoId],
    action: { kind: 'noop' },
  };
}

function createBridgeClientForContext(context: ProviderContext): YouTubeBridgeClient {
  const services = readYouTubeServices(context);
  if (services.bridgeClient) {
    return services.bridgeClient;
  }

  return createYouTubeBridgeClient({
    document: context.document,
    getCurrentVideoId: () => resolveActiveVideoId(context),
  });
}

function resolveActiveVideoId(context: ProviderContext): string | null {
  const services = readYouTubeServices(context);
  const serviceVideoId = readServiceVideoId(services);
  if (serviceVideoId) {
    return serviceVideoId;
  }

  return (
    videoIdFromLocation(context.location) ??
    videoIdFromLocation(context.document?.location) ??
    videoIdFromLocation(globalThis.location) ??
    videoIdFromUrl(context.activePlugin?.url) ??
    null
  );
}

function readServiceVideoId(services: YouTubeProviderServices): string | null {
  try {
    const videoId = services.getCurrentVideoId?.()?.trim();
    return videoId ? videoId : null;
  } catch {
    return null;
  }
}

function readYouTubeServices(context: ProviderContext): YouTubeProviderServices {
  const youtubeServices = context.services?.youtube;
  if (!isRecord(youtubeServices)) {
    return {};
  }

  const bridgeClient = isYouTubeBridgeClient(youtubeServices.bridgeClient)
    ? youtubeServices.bridgeClient
    : undefined;
  const getCurrentVideoId =
    typeof youtubeServices.getCurrentVideoId === 'function'
      ? (youtubeServices.getCurrentVideoId as YouTubeProviderServices['getCurrentVideoId'])
      : undefined;

  return { bridgeClient, getCurrentVideoId };
}

function isYouTubeBridgeClient(value: unknown): value is YouTubeBridgeClient {
  return isRecord(value) && typeof value.getTranscript === 'function';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function videoIdFromLocation(location: Location | undefined): string | null {
  if (!location) {
    return null;
  }

  try {
    return videoIdFromUrl(new URL(location.href));
  } catch {
    return null;
  }
}

function videoIdFromUrl(url: URL | undefined): string | null {
  if (!url || url.pathname !== '/watch') {
    return null;
  }

  const videoId = url.searchParams.get('v')?.trim() ?? '';
  return videoId.length > 0 ? videoId : null;
}

function displayTime(line: TranscriptLine): string {
  const timeText = line.timeText.trim();
  return timeText || formatTranscriptTimestamp(safeLineTime(line));
}

function safeLineTime(line: TranscriptLine): number {
  return Number.isFinite(line.time) ? Math.max(0, line.time) : 0;
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function idPart(value: string): string {
  return encodeURIComponent(value);
}

export const youtubeTranscriptMode = createYouTubeTranscriptMode();
