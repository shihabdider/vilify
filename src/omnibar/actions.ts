import type {
  OmnibarAction,
  OmnibarActionContext,
  OmnibarActionExecution,
  OmnibarActionExecutor,
  OmnibarActionResult,
  OmnibarCopySource,
} from './types';

export type OmnibarVideoElement = Pick<HTMLVideoElement, 'play' | 'pause'> & {
  readonly paused: boolean;
  currentTime: number;
  readonly duration: number;
  playbackRate: number;
};

export interface OmnibarActionPlatform {
  readonly navigate: (url: string, context: OmnibarActionContext) => void;
  readonly writeClipboardText: (
    text: string,
    context: OmnibarActionContext,
  ) => void | Promise<void>;
  readonly getCurrentUrl: (context: OmnibarActionContext) => string;
  readonly getVideoElement: (context: OmnibarActionContext) => OmnibarVideoElement | null;
  readonly formatUrlAtVideoTime: (
    url: string,
    currentTimeSeconds: number,
    context: OmnibarActionContext,
  ) => string;
}

const closeResult: OmnibarActionResult = { kind: 'close' };
const noneResult: OmnibarActionResult = { kind: 'none' };

export function createOmnibarActionExecutor(
  platformOverrides: Partial<OmnibarActionPlatform> = {},
): OmnibarActionExecutor {
  const platform: OmnibarActionPlatform = {
    ...defaultOmnibarActionPlatform,
    ...platformOverrides,
  };

  return (action, context) => executeWithPlatform(action, context, platform);
}

export function formatUrlAtVideoTime(url: string, currentTimeSeconds: number): string {
  const seconds = normalizeTimeSeconds(currentTimeSeconds);

  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set('t', `${seconds}s`);
    parsedUrl.hash = '';
    return parsedUrl.toString();
  } catch {
    const [urlWithoutHash] = url.split('#');
    const separator = urlWithoutHash.includes('?') ? '&' : '?';
    return `${urlWithoutHash}${separator}t=${seconds}s`;
  }
}

const defaultOmnibarActionPlatform: OmnibarActionPlatform = {
  navigate: (url, context) => {
    const location =
      context.providerContext.location ?? context.providerContext.document?.location ?? globalThis.location;
    if (!location || typeof location.assign !== 'function') {
      throw new Error('Navigation adapter is unavailable');
    }

    location.assign(url);
  },
  writeClipboardText: (text, context) => {
    const clipboard =
      context.providerContext.document?.defaultView?.navigator?.clipboard ?? globalThis.navigator?.clipboard;
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      throw new Error('Clipboard API is unavailable');
    }

    return clipboard.writeText(text);
  },
  getCurrentUrl: (context) => {
    return (
      context.providerContext.location?.href ??
      context.providerContext.document?.location?.href ??
      globalThis.location?.href ??
      'about:blank'
    );
  },
  getVideoElement: (context) => {
    const document = context.providerContext.document ?? globalThis.document;
    return document?.querySelector('video') as OmnibarVideoElement | null;
  },
  formatUrlAtVideoTime: (url, currentTimeSeconds) => formatUrlAtVideoTime(url, currentTimeSeconds),
};

export const executeOmnibarAction: OmnibarActionExecutor = createOmnibarActionExecutor();

function executeWithPlatform(
  action: OmnibarAction,
  context: OmnibarActionContext,
  platform: OmnibarActionPlatform,
): OmnibarActionExecution {
  try {
    switch (action.kind) {
      case 'noop':
        return noneResult;
      case 'close':
        return closeResult;
      case 'push-mode':
        return { kind: 'push-mode', mode: action.mode };
      case 'navigate':
        platform.navigate(action.url, context);
        return closeResult;
      case 'copy':
        return executeCopyAction(action.source, context, platform);
      case 'seek':
        return executeSeekAction(action.seconds, action.seekMode ?? 'relative', context, platform);
      case 'playPause':
        return executePlayPauseAction(context, platform);
      case 'setPlaybackRate':
        return executeSetPlaybackRateAction(action.rate, context, platform);
      case 'custom':
        return action.execute(context) ?? noneResult;
    }
  } catch (error) {
    return statusFromError(error, `Could not run ${action.kind} action`);
  }
}

function executeCopyAction(
  source: OmnibarCopySource,
  context: OmnibarActionContext,
  platform: OmnibarActionPlatform,
): OmnibarActionExecution {
  const text = resolveCopyText(source, context, platform);
  if (typeof text !== 'string') {
    return text;
  }

  return closeAfter(platform.writeClipboardText(text, context), 'Could not copy to clipboard');
}

function resolveCopyText(
  source: OmnibarCopySource,
  context: OmnibarActionContext,
  platform: OmnibarActionPlatform,
): string | OmnibarActionResult {
  switch (source.kind) {
    case 'text':
      return source.text;
    case 'current-url':
      return platform.getCurrentUrl(context);
    case 'current-url-at-video-time': {
      const video = platform.getVideoElement(context);
      if (!video) {
        return missingVideoStatus();
      }

      return platform.formatUrlAtVideoTime(platform.getCurrentUrl(context), video.currentTime, context);
    }
  }
}

function executeSeekAction(
  seconds: number,
  seekMode: 'relative' | 'absolute',
  context: OmnibarActionContext,
  platform: OmnibarActionPlatform,
): OmnibarActionResult {
  const video = platform.getVideoElement(context);
  if (!video) {
    return missingVideoStatus();
  }

  if (!Number.isFinite(seconds)) {
    return {
      kind: 'status',
      tone: 'warning',
      message: 'Cannot seek by a non-finite number of seconds.',
    };
  }

  const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  const targetTime = seekMode === 'absolute' ? seconds : currentTime + seconds;
  video.currentTime = clampVideoTime(targetTime, video.duration);
  return closeResult;
}

function executePlayPauseAction(
  context: OmnibarActionContext,
  platform: OmnibarActionPlatform,
): OmnibarActionExecution {
  const video = platform.getVideoElement(context);
  if (!video) {
    return missingVideoStatus();
  }

  if (video.paused) {
    return closeAfter(video.play(), 'Could not play the native video element');
  }

  video.pause();
  return closeResult;
}

function executeSetPlaybackRateAction(
  rate: number,
  context: OmnibarActionContext,
  platform: OmnibarActionPlatform,
): OmnibarActionResult {
  const video = platform.getVideoElement(context);
  if (!video) {
    return missingVideoStatus();
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    return {
      kind: 'status',
      tone: 'warning',
      message: 'Cannot set a non-positive or non-finite playback rate.',
    };
  }

  video.playbackRate = rate;
  return closeResult;
}

function closeAfter(value: void | Promise<void>, failureMessage: string): OmnibarActionExecution {
  if (isPromiseLike(value)) {
    return Promise.resolve(value)
      .then(() => closeResult)
      .catch((error) => statusFromError(error, failureMessage));
  }

  return closeResult;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

function clampVideoTime(value: number, duration: number): number {
  const lowerBoundedValue = Math.max(0, value);
  if (!Number.isFinite(duration)) {
    return lowerBoundedValue;
  }

  return Math.min(lowerBoundedValue, Math.max(0, duration));
}

function normalizeTimeSeconds(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function missingVideoStatus(): OmnibarActionResult {
  return {
    kind: 'status',
    tone: 'warning',
    message: 'No native video element is available for this action.',
  };
}

function statusFromError(error: unknown, fallbackMessage: string): OmnibarActionResult {
  const detail = error instanceof Error && error.message ? `: ${error.message}` : '';
  return {
    kind: 'status',
    tone: 'error',
    message: `${fallbackMessage}${detail}`,
  };
}
