export type YouTubeRootQueryIntent =
  | { readonly kind: 'command-filter'; readonly query: string }
  | { readonly kind: 'youtube-search'; readonly query: string }
  | { readonly kind: 'transcript-search'; readonly query: string }
  | { readonly kind: 'navigation-filter'; readonly query: string };

export function parseYouTubeRootQueryIntent(_query: string): YouTubeRootQueryIntent {
  throw new Error('not implemented: parseYouTubeRootQueryIntent');
}

export function buildYouTubeSearchUrl(_query: string): string {
  throw new Error('not implemented: buildYouTubeSearchUrl');
}
