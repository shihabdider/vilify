function isYouTubeHost(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return normalizedHostname === 'youtube.com' || normalizedHostname.endsWith('.youtube.com');
}

export function isSupportedYouTubeUrl(url: URL): boolean {
  return isYouTubeHost(url.hostname);
}

export function getYouTubeVideoId(url: URL | undefined): string | null {
  if (!url || !isYouTubeHost(url.hostname) || url.pathname !== '/watch') {
    return null;
  }

  const videoId = url.searchParams.get('v')?.trim() ?? '';
  return videoId.length > 0 ? videoId : null;
}

export function isYouTubeWatchUrl(url: URL): boolean {
  return getYouTubeVideoId(url) !== null;
}
