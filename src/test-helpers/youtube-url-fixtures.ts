export const YOUTUBE_HOME_URL = 'https://www.youtube.com/' as const;
export const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch?v=abc123' as const;
export const YOUTUBE_WATCH_WITH_TIMESTAMP_URL = 'https://www.youtube.com/watch?v=abc123&t=42s' as const;

export const YOUTUBE_NON_WATCH_URLS = [
  'https://youtube.com/',
  YOUTUBE_HOME_URL,
  'https://www.youtube.com/results?search_query=vilify',
  'https://www.youtube.com/@channel',
  'https://www.youtube.com/channel/UC123',
  'https://www.youtube.com/playlist?list=PL123',
  'https://www.youtube.com/shorts/abc123',
  'https://www.youtube.com/watch?t=42s',
  'https://m.youtube.com/feed/subscriptions',
] as const;

export const YOUTUBE_SUPPORTED_URLS = [
  ...YOUTUBE_NON_WATCH_URLS,
  YOUTUBE_WATCH_URL,
  YOUTUBE_WATCH_WITH_TIMESTAMP_URL,
] as const;

export const NON_YOUTUBE_URLS = [
  'https://www.google.com/search?q=vilify',
  'https://google.com/search?q=vilify',
  'https://youtu.be/abc123',
  'https://example.com/watch?v=abc123',
] as const;
