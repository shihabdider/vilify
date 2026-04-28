import { describe, expect, it } from 'vitest';
import type { OmnibarMode } from '../omnibar/types';
import { youtubePlugin } from '../sites/youtube/plugin';
import { getActivePlugin } from './registry';
import type { SitePlugin } from './types';

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
    const urls = [
      'https://www.youtube.com/',
      'https://www.youtube.com/results?search_query=vilify',
      'https://www.youtube.com/@example',
      'https://www.youtube.com/channel/UC123',
      'https://www.youtube.com/playlist?list=PL123',
      'https://www.youtube.com/shorts/abc123',
      'https://www.youtube.com/watch?t=42s',
      'https://www.youtube.com/watch?v=abc123',
    ];

    for (const url of urls) {
      expect(getActivePlugin(new URL(url), [youtubePlugin]), url).toBe(youtubePlugin);
    }
  });

  it('returns null for Google, youtu.be, and unrelated URLs', () => {
    const urls = [
      'https://www.google.com/search?q=vilify',
      'https://google.com/search?q=vilify',
      'https://youtu.be/abc123',
      'https://example.com/watch?v=abc123',
    ];

    for (const url of urls) {
      expect(getActivePlugin(new URL(url), [youtubePlugin]), url).toBeNull();
    }
  });

  it('selects only the first matching plugin from the registry', () => {
    const first = makePlugin('first', () => true);
    const second = makePlugin('second', () => true);

    expect(getActivePlugin(new URL('https://example.com/'), [first, second])).toBe(first);
  });
});
