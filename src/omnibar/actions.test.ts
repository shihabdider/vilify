import { describe, expect, it, vi } from 'vitest';
import { domDocumentLocation, makeOmnibarTestDom, pushDomHistory } from '../test-helpers/omnibar';
import { createOmnibarActionExecutor } from './actions';
import { createInitialOmnibarState, createStaticOmnibarMode } from './state';
import type {
  OmnibarAction,
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

const missingNativeVideoStatus = {
  kind: 'status',
  tone: 'warning',
  message: 'No native video element is available for this action.',
} as const;

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

  it('returns the missing-video status when video-only actions have no native video element', async () => {
    const context = makeContext();
    const getVideoElement = vi.fn(() => null);
    const getCurrentUrl = vi.fn(() => 'https://www.youtube.com/watch?v=abc123');
    const writeClipboardText = vi.fn();
    const execute = createOmnibarActionExecutor({
      getVideoElement,
      getCurrentUrl,
      writeClipboardText,
    });
    const videoOnlyActions: OmnibarAction[] = [
      { kind: 'seek', seconds: 10 },
      { kind: 'copy', source: { kind: 'current-url-at-video-time' } },
    ];

    for (const action of videoOnlyActions) {
      await expect(resolveActionResult(execute(action, context))).resolves.toEqual(missingNativeVideoStatus);
    }
    expect(getVideoElement).toHaveBeenCalledTimes(videoOnlyActions.length);
    expect(getCurrentUrl).not.toHaveBeenCalled();
    expect(writeClipboardText).not.toHaveBeenCalled();
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

  it('seeks absolutely when a typed seek action targets an exact transcript timestamp', () => {
    const video = makeVideo({ currentTime: 10, duration: 300 });
    const context = makeContext();
    const execute = createOmnibarActionExecutor({ getVideoElement: () => video });

    expect(execute({ kind: 'seek', seconds: 123, seekMode: 'absolute' }, context)).toEqual({ kind: 'close' });
    expect(video.currentTime).toBe(123);
  });

  it('copies the current URL by reading the live URL adapter at execution time', async () => {
    let currentUrl = 'https://www.youtube.com/watch?v=old';
    const getCurrentUrl = vi.fn(() => currentUrl);
    const writeClipboardText = vi.fn();
    const context = makeContext();
    const execute = createOmnibarActionExecutor({
      getCurrentUrl,
      writeClipboardText,
    });
    currentUrl = 'https://www.youtube.com/watch?v=abc123&list=PL123';

    await expect(
      resolveActionResult(execute({ kind: 'copy', source: { kind: 'current-url' } }, context)),
    ).resolves.toEqual({ kind: 'close' });
    expect(getCurrentUrl).toHaveBeenCalledTimes(1);
    expect(getCurrentUrl).toHaveBeenCalledWith(context);
    expect(writeClipboardText).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc123&list=PL123', context);
  });

  it('default current URL adapter reads provider location after SPA history changes', async () => {
    const dom = makeOmnibarTestDom('https://www.youtube.com/watch?v=old');
    const writeClipboardText = vi.fn();
    const context: OmnibarActionContext = {
      ...makeContext(),
      providerContext: domDocumentLocation(dom),
    };
    const execute = createOmnibarActionExecutor({ writeClipboardText });

    pushDomHistory(dom, '/watch?v=new-video&list=PL123');

    await expect(
      resolveActionResult(execute({ kind: 'copy', source: { kind: 'current-url' } }, context)),
    ).resolves.toEqual({ kind: 'close' });
    expect(writeClipboardText).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=new-video&list=PL123',
      context,
    );
  });

  it('default native video adapter queries the provider document at execution time', () => {
    const dom = makeOmnibarTestDom('https://www.youtube.com/watch?v=abc123', '<main id="page"></main>');
    const context: OmnibarActionContext = {
      ...makeContext(),
      providerContext: domDocumentLocation(dom),
    };
    const execute = createOmnibarActionExecutor();
    const seekAction: OmnibarAction = { kind: 'seek', seconds: 12, seekMode: 'absolute' };

    expect(execute(seekAction, context)).toEqual(missingNativeVideoStatus);

    const video = dom.window.document.createElement('video');
    dom.window.document.body.appendChild(video);

    expect(execute(seekAction, context)).toEqual({ kind: 'close' });
    expect(video.currentTime).toBe(12);

    video.remove();

    expect(execute(seekAction, context)).toEqual(missingNativeVideoStatus);
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
