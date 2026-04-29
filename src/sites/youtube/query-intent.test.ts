import { describe, expect, it } from 'vitest';
import { buildYouTubeSearchUrl, parseYouTubeRootQueryIntent } from './query-intent';

describe('parseYouTubeRootQueryIntent', () => {
  it('treats empty and unprefixed queries as default command filtering', () => {
    expect(parseYouTubeRootQueryIntent('')).toEqual({ kind: 'command-filter', query: '' });
    expect(parseYouTubeRootQueryIntent('transcript')).toEqual({ kind: 'command-filter', query: 'transcript' });
    expect(parseYouTubeRootQueryIntent('x/unknown')).toEqual({ kind: 'command-filter', query: 'x/unknown' });
  });

  it('parses recognized Vim-style prefixes and preserves the query after the first slash', () => {
    expect(parseYouTubeRootQueryIntent('s/lofi beats')).toEqual({ kind: 'youtube-search', query: 'lofi beats', prefix: 's/' });
    expect(parseYouTubeRootQueryIntent('t/needle phrase')).toEqual({ kind: 'transcript-search', query: 'needle phrase', prefix: 't/' });
    expect(parseYouTubeRootQueryIntent('n/home')).toEqual({ kind: 'navigation-filter', query: 'home', prefix: 'n/' });
    expect(parseYouTubeRootQueryIntent('s/a/b/c')).toEqual({ kind: 'youtube-search', query: 'a/b/c', prefix: 's/' });
  });

  it('keeps empty prefixed queries as explicit intents for provider policy handling', () => {
    expect(parseYouTubeRootQueryIntent('s/')).toEqual({ kind: 'youtube-search', query: '', prefix: 's/' });
    expect(parseYouTubeRootQueryIntent('t/   ')).toEqual({ kind: 'transcript-search', query: '   ', prefix: 't/' });
    expect(parseYouTubeRootQueryIntent('n/')).toEqual({ kind: 'navigation-filter', query: '', prefix: 'n/' });
  });
});

describe('buildYouTubeSearchUrl', () => {
  it('builds a URL-encoded YouTube search results URL from trimmed query text', () => {
    expect(buildYouTubeSearchUrl('lofi beats')).toBe('https://www.youtube.com/results?search_query=lofi%20beats');
    expect(buildYouTubeSearchUrl('  tabs & spaces  ')).toBe(
      'https://www.youtube.com/results?search_query=tabs%20%26%20spaces',
    );
    expect(buildYouTubeSearchUrl('a/b+c')).toBe('https://www.youtube.com/results?search_query=a%2Fb%2Bc');
  });

  it('returns the non-navigating empty-search URL shape for whitespace-only text', () => {
    expect(buildYouTubeSearchUrl('   ')).toBe('https://www.youtube.com/results?search_query=');
  });
});
