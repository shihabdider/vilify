import { describe, expect, it } from 'vitest';
import type { OmnibarMode } from '../omnibar/types';
import { youtubePlugin } from '../sites/youtube/plugin';
import { getActivePlugin } from './registry';
import type { SitePlugin } from './types';
import { NON_YOUTUBE_URLS, YOUTUBE_SUPPORTED_URLS } from '../test-helpers/youtube-url-fixtures';

const placeholderMode: OmnibarMode = {
  id: 'placeholder-root',
  title: 'Placeholder',
  providers: [],
};

function makePlugin(id: string, matches: (url: URL) => boolean): SitePlugin {
  return {
    id,
    matches,
    defaultModeId: placeholderMode.id,
    modes: [placeholderMode],
  };
}

describe('getActivePlugin', () => {
  it('returns the YouTube plugin for YouTube host-level URLs', () => {
    for (const url of YOUTUBE_SUPPORTED_URLS) {
      expect(getActivePlugin(new URL(url), [youtubePlugin]), url).toBe(youtubePlugin);
    }
  });

  it('returns null for Google, youtu.be, and unrelated URLs', () => {
    for (const url of NON_YOUTUBE_URLS) {
      expect(getActivePlugin(new URL(url), [youtubePlugin]), url).toBeNull();
    }
  });

  it('selects only the first matching plugin from the registry', () => {
    const first = makePlugin('first', () => true);
    const second = makePlugin('second', () => true);

    expect(getActivePlugin(new URL('https://example.com/'), [first, second])).toBe(first);
  });
});
