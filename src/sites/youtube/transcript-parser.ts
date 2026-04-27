import type { CaptionTrack, TranscriptLine, VideoMetadata } from './bridge-types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readNonEmptyString(value: unknown): string | undefined {
  const text = readString(value)?.trim();
  return text ? text : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function roundSeconds(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function formatTranscriptTimestamp(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  const twoDigits = (value: number) => String(value).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${twoDigits(minutes)}:${twoDigits(remainingSeconds)}`;
  }

  return `${minutes}:${twoDigits(remainingSeconds)}`;
}

function normalizeTranscriptText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function textFromRuns(value: unknown): string | undefined {
  const record = readRecord(value);
  if (!record) {
    return undefined;
  }

  const simpleText = readString(record.simpleText);
  if (simpleText !== undefined) {
    return normalizeTranscriptText(simpleText);
  }

  if (Array.isArray(record.runs)) {
    const text = record.runs
      .map((run) => readRecord(run)?.text)
      .filter((part): part is string => typeof part === 'string')
      .join('');
    const normalized = normalizeTranscriptText(text);
    return normalized.length > 0 ? normalized : undefined;
  }

  return undefined;
}

function makeTranscriptLine(
  startMs: number | undefined,
  durationMs: number | undefined,
  text: string | undefined,
  timeText?: string,
): TranscriptLine | null {
  if (startMs === undefined || startMs < 0 || !text) {
    return null;
  }

  const time = roundSeconds(startMs / 1000);
  const normalizedTimeText = timeText ? normalizeTranscriptText(timeText) : '';

  return {
    time,
    timeText: normalizedTimeText || formatTranscriptTimestamp(time),
    duration: durationMs !== undefined && durationMs >= 0 ? roundSeconds(durationMs / 1000) : 0,
    text,
  };
}

export function extractVideoMetadata(playerResponse: unknown): VideoMetadata | null {
  const response = readRecord(playerResponse);
  const videoDetails = readRecord(response?.videoDetails);
  const videoId = readNonEmptyString(videoDetails?.videoId);
  if (!videoDetails || !videoId) {
    return null;
  }

  const metadata: {
    videoId: string;
    title?: string;
    durationSeconds?: number;
    author?: string;
    channelId?: string;
    shortDescription?: string;
    isLive?: boolean;
  } = { videoId };

  const title = readNonEmptyString(videoDetails.title);
  const durationSeconds = readNumber(videoDetails.lengthSeconds);
  const author = readNonEmptyString(videoDetails.author);
  const channelId = readNonEmptyString(videoDetails.channelId);
  const shortDescription = readNonEmptyString(videoDetails.shortDescription);
  const isLive = readBoolean(videoDetails.isLiveContent) ?? readBoolean(videoDetails.isLive);

  if (title !== undefined) metadata.title = title;
  if (durationSeconds !== undefined && durationSeconds >= 0) metadata.durationSeconds = durationSeconds;
  if (author !== undefined) metadata.author = author;
  if (channelId !== undefined) metadata.channelId = channelId;
  if (shortDescription !== undefined) metadata.shortDescription = shortDescription;
  if (isLive !== undefined) metadata.isLive = isLive;

  return metadata;
}

function findTranscriptParams(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const params = findTranscriptParams(item);
      if (params) {
        return params;
      }
    }
    return null;
  }

  const record = readRecord(value);
  if (!record) {
    return null;
  }

  const endpoint = readRecord(record.getTranscriptEndpoint);
  const params = readNonEmptyString(endpoint?.params);
  if (params) {
    return params;
  }

  for (const child of Object.values(record)) {
    const childParams = findTranscriptParams(child);
    if (childParams) {
      return childParams;
    }
  }

  return null;
}

export function extractTranscriptParams(initialData: unknown): string | null {
  const data = readRecord(initialData);
  if (!Array.isArray(data?.engagementPanels)) {
    return null;
  }

  return findTranscriptParams(data.engagementPanels);
}

function parseTranscriptSegmentRenderer(value: unknown): TranscriptLine | null {
  const renderer = readRecord(value);
  if (!renderer) {
    return null;
  }

  const startMs = readNumber(renderer.startMs);
  const endMs = readNumber(renderer.endMs);
  const durationMs = startMs !== undefined && endMs !== undefined ? endMs - startMs : undefined;
  const text = textFromRuns(renderer.snippet) ?? textFromRuns(renderer.body);
  const timeText = textFromRuns(renderer.startTimeText);

  return makeTranscriptLine(startMs, durationMs, text, timeText);
}

function parseTranscriptCueRenderer(value: unknown): TranscriptLine | null {
  const renderer = readRecord(value);
  if (!renderer) {
    return null;
  }

  const startMs = readNumber(renderer.startOffsetMs) ?? readNumber(renderer.startMs);
  const durationMs = readNumber(renderer.durationMs);
  const text = textFromRuns(renderer.cue) ?? textFromRuns(renderer.snippet);
  const timeText = textFromRuns(renderer.startTimeText);

  return makeTranscriptLine(startMs, durationMs, text, timeText);
}

function collectInnerTubeLines(value: unknown, lines: TranscriptLine[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectInnerTubeLines(item, lines);
    }
    return;
  }

  const record = readRecord(value);
  if (!record) {
    return;
  }

  const segmentLine = parseTranscriptSegmentRenderer(record.transcriptSegmentRenderer);
  if (segmentLine) {
    lines.push(segmentLine);
  }

  const cueLine = parseTranscriptCueRenderer(record.transcriptCueRenderer);
  if (cueLine) {
    lines.push(cueLine);
  }

  for (const child of Object.values(record)) {
    collectInnerTubeLines(child, lines);
  }
}

export function parseInnerTubeTranscript(response: unknown): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  collectInnerTubeLines(response, lines);
  return lines;
}

function parseXmlAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(source)) !== null) {
    attributes[match[1]] = match[2] ?? match[3] ?? '';
  }

  return attributes;
}

function decodeXmlEntities(source: string): string {
  return source.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos|nbsp);/g, (_match, entity: string) => {
    if (entity === 'amp') return '&';
    if (entity === 'lt') return '<';
    if (entity === 'gt') return '>';
    if (entity === 'quot') return '"';
    if (entity === 'apos') return "'";
    if (entity === 'nbsp') return ' ';

    if (entity.startsWith('#x')) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
    }

    if (entity.startsWith('#')) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
    }

    return '';
  });
}

export function parseCaptionXmlTranscript(xml: string): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  const textPattern = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = textPattern.exec(xml)) !== null) {
    const attributes = parseXmlAttributes(match[1]);
    const rawText = match[2].replace(/<[^>]+>/g, ' ');
    const text = normalizeTranscriptText(decodeXmlEntities(rawText));
    const startSeconds = readNumber(attributes.start);
    const durationSeconds = readNumber(attributes.dur);
    const line = makeTranscriptLine(
      startSeconds !== undefined ? startSeconds * 1000 : undefined,
      durationSeconds !== undefined ? durationSeconds * 1000 : undefined,
      text,
    );

    if (line) {
      lines.push(line);
    }
  }

  return lines;
}

export function parseCaptionJson3Transcript(input: unknown): TranscriptLine[] {
  const data = typeof input === 'string' ? safeParseJson(input) : input;
  const events = readRecord(data)?.events;
  if (!Array.isArray(events)) {
    return [];
  }

  const lines: TranscriptLine[] = [];
  for (const event of events) {
    const record = readRecord(event);
    if (!record || !Array.isArray(record.segs)) {
      continue;
    }

    const text = normalizeTranscriptText(
      record.segs
        .map((segment) => readRecord(segment)?.utf8)
        .filter((part): part is string => typeof part === 'string')
        .join(''),
    );
    const line = makeTranscriptLine(readNumber(record.tStartMs), readNumber(record.dDurationMs), text);
    if (line) {
      lines.push(line);
    }
  }

  return lines;
}

function safeParseJson(source: string): unknown {
  try {
    return JSON.parse(source.replace(/^\)\]\}'\s*/, ''));
  } catch {
    return null;
  }
}

export function extractCaptionTracks(playerResponse: unknown): readonly CaptionTrack[] {
  const response = readRecord(playerResponse);
  const captions = readRecord(response?.captions);
  const renderer = readRecord(captions?.playerCaptionsTracklistRenderer);
  const captionTracks = renderer?.captionTracks;
  if (!Array.isArray(captionTracks)) {
    return [];
  }

  return captionTracks.flatMap((candidate): CaptionTrack[] => {
    const record = readRecord(candidate);
    const baseUrl = readNonEmptyString(record?.baseUrl);
    if (!record || !baseUrl) {
      return [];
    }

    const track: {
      baseUrl: string;
      name?: string;
      languageCode?: string;
      vssId?: string;
      kind?: string;
      isTranslatable?: boolean;
    } = { baseUrl };
    const name = textFromRuns(record.name);
    const languageCode = readNonEmptyString(record.languageCode);
    const vssId = readNonEmptyString(record.vssId);
    const kind = readNonEmptyString(record.kind);
    const isTranslatable = readBoolean(record.isTranslatable);

    if (name !== undefined) track.name = name;
    if (languageCode !== undefined) track.languageCode = languageCode;
    if (vssId !== undefined) track.vssId = vssId;
    if (kind !== undefined) track.kind = kind;
    if (isTranslatable !== undefined) track.isTranslatable = isTranslatable;

    return [track];
  });
}

export function selectCaptionTrack(
  tracks: readonly CaptionTrack[],
  preferredLanguageCode?: string,
): CaptionTrack | null {
  if (tracks.length === 0) {
    return null;
  }

  if (preferredLanguageCode) {
    const preferred = tracks.find((track) => track.languageCode === preferredLanguageCode);
    if (preferred) {
      return preferred;
    }
  }

  return tracks.find((track) => track.kind !== 'asr') ?? tracks[0] ?? null;
}

export function buildCaptionTrackUrl(track: CaptionTrack, format: 'json3' | 'xml'): string {
  try {
    const url = new URL(track.baseUrl);
    if (format === 'json3') {
      url.searchParams.set('fmt', 'json3');
    } else {
      url.searchParams.delete('fmt');
    }
    return url.toString();
  } catch {
    if (format === 'json3') {
      const separator = track.baseUrl.includes('?') ? '&' : '?';
      return `${track.baseUrl}${separator}fmt=json3`;
    }

    return track.baseUrl.replace(/([?&])fmt=[^&]*&?/, '$1').replace(/[?&]$/, '');
  }
}
