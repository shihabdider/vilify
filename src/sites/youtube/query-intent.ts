export type YouTubeRootQueryIntent =
  | { readonly kind: 'command-filter'; readonly query: string }
  | { readonly kind: 'youtube-search'; readonly query: string }
  | { readonly kind: 'transcript-search'; readonly query: string }
  | { readonly kind: 'navigation-filter'; readonly query: string };

export function parseYouTubeRootQueryIntent(query: string): YouTubeRootQueryIntent {
  if (query.startsWith('s/')) {
    return { kind: 'youtube-search', query: query.slice(2) };
  }

  if (query.startsWith('t/')) {
    return { kind: 'transcript-search', query: query.slice(2) };
  }

  if (query.startsWith('n/')) {
    return { kind: 'navigation-filter', query: query.slice(2) };
  }

  return { kind: 'command-filter', query };
}

export function buildYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
}
