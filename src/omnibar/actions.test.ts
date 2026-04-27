import { describe, expect, it, vi } from 'vitest';
import { createOmnibarActionExecutor } from './actions';
import { createInitialOmnibarState, createStaticOmnibarMode } from './state';
import type {
  OmnibarActionContext,
  OmnibarActionExecution,
  OmnibarActionResult,
  OmnibarItem,
} from './types';

interface VideoStub {
  paused: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
}

function makeVideo(overrides: Partial<VideoStub> = {}): VideoStub {
  return {
    paused: true,
    currentTime: 0,
    duration: 300,
    playbackRate: 1,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    ...overrides,
  };
}

function makeContext(): OmnibarActionContext {
  const item: OmnibarItem = {
    id: 'test-item',
    kind: 'command',
    title: 'Test item',
    action: { kind: 'noop' },
  };
  const mode = createStaticOmnibarMode({
    id: 'root',
    title: 'Root',
    items: [item],
  });

  return {
    item,
    state: createInitialOmnibarState(mode),
    providerContext: {},
  };
}

async function resolveActionResult(result: OmnibarActionExecution): Promise<OmnibarActionResult> {
  return (await result) ?? { kind: 'none' };
}

describe('createOmnibarActionExecutor', () => {
  it('executes navigate actions through the navigation adapter', () => {
    const navigate = vi.fn();
    const context = makeContext();
    const execute = createOmnibarActionExecutor({ navigate });

    const result = execute(
      { kind: 'navigate', url: 'https://www.youtube.com/feed/subscriptions' },
      context,
    );

    expect(navigate).toHaveBeenCalledWith('https://www.youtube.com/feed/subscriptions', context);
    expect(result).toEqual({ kind: 'close' });
  });

  it('toggles playback through the native video element and never YouTube controls', async () => {
    const video = makeVideo({ paused: true });
    const getVideoElement = vi.fn(() => video);
    const context = makeContext();
    const execute = createOmnibarActionExecutor({ getVideoElement });

    await expect(resolveActionResult(execute({ kind: 'playPause' }, context))).resolves.toEqual({ kind: 'close' });
    expect(getVideoElement).toHaveBeenCalledWith(context);
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(video.pause).not.toHaveBeenCalled();

    video.paused = false;
    await expect(resolveActionResult(execute({ kind: 'playPause' }, context))).resolves.toEqual({ kind: 'close' });
    expect(video.pause).toHaveBeenCalledTimes(1);
  });

  it('returns a status result instead of throwing when a video action has no native video element', async () => {
    const context = makeContext();
    const execute = createOmnibarActionExecutor({ getVideoElement: () => null });

    await expect(resolveActionResult(execute({ kind: 'playPause' }, context))).resolves.toEqual(
      expect.objectContaining({
        kind: 'status',
        message: expect.stringContaining('video'),
      }),
    );
  });

  it('seeks relatively and clamps currentTime to the finite video duration', () => {
    const video = makeVideo({ currentTime: 100, duration: 120 });
    const context = makeContext();
    const execute = createOmnibarActionExecutor({ getVideoElement: () => video });

    expect(execute({ kind: 'seek', seconds: 50 }, context)).toEqual({ kind: 'close' });
    expect(video.currentTime).toBe(120);

    expect(execute({ kind: 'seek', seconds: -500 }, context)).toEqual({ kind: 'close' });
    expect(video.currentTime).toBe(0);
  });

  it('sets playbackRate on the native video element', () => {
    const video = makeVideo({ playbackRate: 1 });
    const context = makeContext();
    const execute = createOmnibarActionExecutor({ getVideoElement: () => video });

    expect(execute({ kind: 'setPlaybackRate', rate: 1.5 }, context)).toEqual({ kind: 'close' });
    expect(video.playbackRate).toBe(1.5);
  });

  it('copies the current URL through the clipboard adapter', async () => {
    const writeClipboardText = vi.fn();
    const context = makeContext();
    const execute = createOmnibarActionExecutor({
      getCurrentUrl: () => 'https://www.youtube.com/watch?v=abc123&list=PL123',
      writeClipboardText,
    });

    await expect(
      resolveActionResult(execute({ kind: 'copy', source: { kind: 'current-url' } }, context)),
    ).resolves.toEqual({ kind: 'close' });
    expect(writeClipboardText).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc123&list=PL123', context);
  });

  it('copies the current URL at the native video currentTime through the clipboard adapter', async () => {
    const video = makeVideo({ currentTime: 42.9 });
    const writeClipboardText = vi.fn();
    const context = makeContext();
    const execute = createOmnibarActionExecutor({
      getCurrentUrl: () => 'https://www.youtube.com/watch?v=abc123',
      getVideoElement: () => video,
      writeClipboardText,
    });

    await expect(
      resolveActionResult(execute({ kind: 'copy', source: { kind: 'current-url-at-video-time' } }, context)),
    ).resolves.toEqual({ kind: 'close' });
    expect(writeClipboardText).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc123&t=42s', context);
  });
});
