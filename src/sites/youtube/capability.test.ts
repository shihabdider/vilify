import { describe, expect, it } from 'vitest';
import { domDocumentLocation, makeOmnibarTestDom, pushDomHistory } from '../../test-helpers/omnibar';
import type { ProviderContext } from '../../omnibar/types';
import { youtubePlugin } from './plugin';
import { deriveYouTubePageCapability, satisfiesYouTubeCommandCapability } from './capability';

function contextFor(domUrl: string, body = '<main id="page"></main>'): ProviderContext {
  const dom = makeOmnibarTestDom(domUrl, body);
  return {
    ...domDocumentLocation(dom),
    activePlugin: {
      plugin: youtubePlugin,
      url: new URL(domUrl),
    },
  };
}

describe('deriveYouTubePageCapability', () => {
  it('derives non-watch YouTube pages as site-level only even when no native video exists', () => {
    const capability = deriveYouTubePageCapability(contextFor('https://www.youtube.com/'));

    expect(capability.surface).toBe('youtube');
    expect(capability.currentUrl?.href).toBe('https://www.youtube.com/');
    expect(capability.watchVideoId).toBeNull();
    expect(capability.hasNativeVideoElement).toBe(false);
    expect(capability.canUseVideoScopedCommands).toBe(false);
  });

  it('requires both a watch video id and a native video element for actionable video-scoped commands', () => {
    const withoutVideo = deriveYouTubePageCapability(
      contextFor('https://www.youtube.com/watch?v=capability-video-0016'),
    );
    const withVideo = deriveYouTubePageCapability(
      contextFor('https://www.youtube.com/watch?v=capability-video-0016', '<main><video></video></main>'),
    );

    expect(withoutVideo).toMatchObject({
      surface: 'watch',
      watchVideoId: 'capability-video-0016',
      hasNativeVideoElement: false,
      canUseVideoScopedCommands: false,
    });
    expect(withVideo).toMatchObject({
      surface: 'watch',
      watchVideoId: 'capability-video-0016',
      hasNativeVideoElement: true,
      canUseVideoScopedCommands: true,
    });
  });

  it('uses live document/location state after SPA navigation instead of stale plugin URLs', () => {
    const dom = makeOmnibarTestDom(
      'https://www.youtube.com/watch?v=stale-watch-video',
      '<main><video></video></main>',
    );
    const context: ProviderContext = {
      ...domDocumentLocation(dom),
      activePlugin: {
        plugin: youtubePlugin,
        url: new URL('https://www.youtube.com/watch?v=stale-watch-video'),
      },
    };

    pushDomHistory(dom, '/results?search_query=vilify');
    const capability = deriveYouTubePageCapability(context);

    expect(capability.currentUrl?.href).toBe('https://www.youtube.com/results?search_query=vilify');
    expect(capability.surface).toBe('youtube');
    expect(capability.watchVideoId).toBeNull();
    expect(capability.hasNativeVideoElement).toBe(true);
    expect(capability.canUseVideoScopedCommands).toBe(false);
  });

  it('marks unsupported live URLs as unsupported even if an active plugin snapshot is present', () => {
    const capability = deriveYouTubePageCapability({
      ...contextFor('https://example.test/watch?v=not-youtube'),
      activePlugin: {
        plugin: youtubePlugin,
        url: new URL('https://www.youtube.com/watch?v=stale-youtube'),
      },
    });

    expect(capability.surface).toBe('unsupported');
    expect(capability.watchVideoId).toBeNull();
    expect(capability.canUseVideoScopedCommands).toBe(false);
  });
});

describe('satisfiesYouTubeCommandCapability', () => {
  it('matches command requirements against derived page capability', () => {
    const site = deriveYouTubePageCapability(contextFor('https://www.youtube.com/'));
    const watchWithoutVideo = deriveYouTubePageCapability(
      contextFor('https://www.youtube.com/watch?v=requirement-video'),
    );
    const watchWithVideo = deriveYouTubePageCapability(
      contextFor('https://www.youtube.com/watch?v=requirement-video', '<main><video></video></main>'),
    );

    expect(satisfiesYouTubeCommandCapability(site, 'always')).toBe(true);
    expect(satisfiesYouTubeCommandCapability(site, 'watch-video')).toBe(false);
    expect(satisfiesYouTubeCommandCapability(site, 'native-video')).toBe(false);

    expect(satisfiesYouTubeCommandCapability(watchWithoutVideo, 'watch-video')).toBe(true);
    expect(satisfiesYouTubeCommandCapability(watchWithoutVideo, 'native-video')).toBe(false);

    expect(satisfiesYouTubeCommandCapability(watchWithVideo, 'watch-video')).toBe(true);
    expect(satisfiesYouTubeCommandCapability(watchWithVideo, 'native-video')).toBe(true);
  });
});
