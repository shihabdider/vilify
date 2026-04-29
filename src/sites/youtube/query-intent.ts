import { getOmnibarCommandPrefix } from '../../omnibar/prefix';
import type { OmnibarCommandPrefix } from '../../omnibar/types';

export type YouTubeRootQueryIntent =
  | { readonly kind: 'command-filter'; readonly query: string; readonly prefix?: undefined }
  | { readonly kind: 'youtube-search'; readonly query: string; readonly prefix: 's/' }
  | { readonly kind: 'transcript-search'; readonly query: string; readonly prefix: 't/' }
  | { readonly kind: 'navigation-filter'; readonly query: string; readonly prefix: 'n/' };

export type YouTubeRootPrefixIntent = Extract<YouTubeRootQueryIntent, { readonly prefix: OmnibarCommandPrefix }>;

export function parseYouTubeRootQueryIntent(query: string): YouTubeRootQueryIntent {
  const prefix = getOmnibarCommandPrefix(query);
  switch (prefix) {
    case 's/':
      return { kind: 'youtube-search', query: query.slice(prefix.length), prefix };
    case 't/':
      return { kind: 'transcript-search', query: query.slice(prefix.length), prefix };
    case 'n/':
      return { kind: 'navigation-filter', query: query.slice(prefix.length), prefix };
    case null:
      return { kind: 'command-filter', query };
  }
}

export function buildYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
}
