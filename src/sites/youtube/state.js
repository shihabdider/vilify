// YouTube state transitions - Pure functions
// Following HTDP design from .design/DATA.md

// =============================================================================
// PAGE STATE CREATION
// =============================================================================

/**
 * Create ListPageState for listing pages.
 * [PURE]
 *
 * @param {Array<ContentItem>} videos - Videos on the page
 * @returns {ListPageState} Page state for listing page
 *
 * @example
 * createListPageState([])
 *   => { type: 'list', videos: [] }
 *
 * @example
 * createListPageState([{ id: '1', title: 'Video 1' }, { id: '2', title: 'Video 2' }])
 *   => { type: 'list', videos: [{ id: '1', title: 'Video 1' }, { id: '2', title: 'Video 2' }] }
 */
export function createListPageState(videos = []) {
  // Template: videos is List → use directly
  return {
    type: 'list',
    videos
  };
}

/**
 * Create WatchPageState for watch page.
 * [PURE]
 *
 * @param {VideoContext|null} videoContext - Current video metadata
 * @param {Array<ContentItem>} recommended - Recommended videos
 * @param {Array<Chapter>} chapters - Video chapters
 * @returns {WatchPageState} Page state for watch page
 *
 * @example
 * // Before data loads
 * createWatchPageState(null, [], [])
 *   => { type: 'watch', videoContext: null, recommended: [], chapters: [] }
 *
 * @example
 * // Fully loaded
 * createWatchPageState(
 *   { videoId: 'abc', title: 'Cool Video', channelName: 'Creator' },
 *   [{ id: 'xyz', title: 'Related' }],
 *   [{ title: 'Intro', time: 0, timeText: '0:00' }]
 * ) => {
 *   type: 'watch',
 *   videoContext: { videoId: 'abc', title: 'Cool Video', channelName: 'Creator' },
 *   recommended: [{ id: 'xyz', title: 'Related' }],
 *   chapters: [{ title: 'Intro', time: 0, timeText: '0:00' }]
 * }
 */
export function createWatchPageState(videoContext = null, recommended = [], chapters = []) {
  // Template: all inputs are simple (Compound/List) → construct directly
  return {
    type: 'watch',
    videoContext,
    recommended,
    chapters
  };
}

// =============================================================================
// TRANSCRIPT STATE TRANSITIONS
// =============================================================================

/**
 * Mark transcript as loading for a video.
 * [PURE]
 *
 * @param {YouTubeState} siteState - Current YouTube state
 * @param {string} videoId - Video ID to fetch transcript for
 * @returns {YouTubeState} New state with transcript marked as loading
 *
 * @example
 * onTranscriptRequest({ transcript: null }, 'dQw4w9WgXcQ')
 *   => { transcript: { status: 'loading', videoId: 'dQw4w9WgXcQ', lines: [], language: null } }
 *
 * @example
 * // Already loading same video - no change
 * onTranscriptRequest({ transcript: { status: 'loading', videoId: 'abc' } }, 'abc')
 *   => { transcript: { status: 'loading', videoId: 'abc', lines: [], language: null } }
 *
 * @example
 * // Different video - reset to loading
 * onTranscriptRequest({ transcript: { status: 'loaded', videoId: 'old', lines: [...] } }, 'new')
 *   => { transcript: { status: 'loading', videoId: 'new', lines: [], language: null } }
 */
export function onTranscriptRequest(siteState, videoId) {
  // Template: siteState is Compound → access transcript
  // videoId is Atomic → use directly
  
  // If already loading for same video, no change needed
  if (siteState.transcript?.status === 'loading' && 
      siteState.transcript?.videoId === videoId) {
    return siteState;
  }
  
  return {
    ...siteState,
    transcript: {
      status: 'loading',
      videoId,
      lines: [],
      language: null
    }
  };
}

/**
 * Store fetched transcript result.
 * Validates that result matches current video (ignores stale results).
 * [PURE]
 *
 * @param {YouTubeState} siteState - Current YouTube state
 * @param {TranscriptResult} result - Fetched transcript result
 * @returns {YouTubeState} New state with transcript stored (if videoId matches)
 *
 * @example
 * // Successful load
 * onTranscriptLoad(
 *   { transcript: { status: 'loading', videoId: 'abc' } },
 *   { status: 'loaded', videoId: 'abc', lines: [...], language: 'en' }
 * ) => { transcript: { status: 'loaded', videoId: 'abc', lines: [...], language: 'en' } }
 *
 * @example
 * // Stale result (different videoId) - ignored
 * onTranscriptLoad(
 *   { transcript: { status: 'loading', videoId: 'new' } },
 *   { status: 'loaded', videoId: 'old', lines: [...], language: 'en' }
 * ) => { transcript: { status: 'loading', videoId: 'new', lines: [], language: null } }
 *
 * @example
 * // Unavailable result
 * onTranscriptLoad(
 *   { transcript: { status: 'loading', videoId: 'abc' } },
 *   { status: 'unavailable', videoId: 'abc', lines: [], language: null }
 * ) => { transcript: { status: 'unavailable', videoId: 'abc', lines: [], language: null } }
 */
export function onTranscriptLoad(siteState, result) {
  // Template: siteState is Compound → access transcript
  // result is Compound → access status, videoId, lines, language
  
  // Validate videoId matches current request
  // If no current transcript or different video, this is a stale result
  if (!siteState.transcript || 
      siteState.transcript.videoId !== result.videoId) {
    return siteState;
  }
  
  return {
    ...siteState,
    transcript: result
  };
}

/**
 * Clear transcript state.
 * Called when leaving watch page or navigating to different video.
 * [PURE]
 *
 * @param {YouTubeState} siteState - Current YouTube state
 * @returns {YouTubeState} New state with transcript cleared
 *
 * @example
 * onTranscriptClear({ transcript: { status: 'loaded', ... } })
 *   => { transcript: null }
 */
export function onTranscriptClear(siteState) {
  return {
    ...siteState,
    transcript: null
  };
}

// =============================================================================
// CHAPTERS STATE TRANSITIONS
// =============================================================================

/**
 * Mark chapters as loading for a video.
 * [PURE]
 *
 * @param {YouTubeState} siteState - Current YouTube state
 * @param {string} videoId - Video ID to fetch chapters for
 * @returns {YouTubeState} New state with chapters marked as loading
 *
 * @example
 * onChaptersRequest({ chapters: null }, 'dQw4w9WgXcQ')
 *   => { chapters: { status: 'loading', videoId: 'dQw4w9WgXcQ', chapters: [] } }
 *
 * @example
 * // Already loading same video - no change
 * onChaptersRequest({ chapters: { status: 'loading', videoId: 'abc' } }, 'abc')
 *   => { chapters: { status: 'loading', videoId: 'abc', chapters: [] } }
 *
 * @example
 * // Different video - reset to loading
 * onChaptersRequest({ chapters: { status: 'loaded', videoId: 'old', chapters: [...] } }, 'new')
 *   => { chapters: { status: 'loading', videoId: 'new', chapters: [] } }
 */
export function onChaptersRequest(siteState, videoId) {
  // Template: siteState is Compound → access chapters
  // videoId is Atomic → use directly
  
  // If already loading for same video, no change needed
  if (siteState.chapters?.status === 'loading' && 
      siteState.chapters?.videoId === videoId) {
    return siteState;
  }
  
  return {
    ...siteState,
    chapters: {
      status: 'loading',
      videoId,
      chapters: []
    }
  };
}

/**
 * Store fetched chapters result.
 * Validates that result matches current video (ignores stale results).
 * [PURE]
 *
 * @param {YouTubeState} siteState - Current YouTube state
 * @param {ChaptersResult} result - Fetched chapters result
 * @returns {YouTubeState} New state with chapters stored (if videoId matches)
 *
 * @example
 * // Successful load
 * onChaptersLoad(
 *   { chapters: { status: 'loading', videoId: 'abc' } },
 *   { status: 'loaded', videoId: 'abc', chapters: [...] }
 * ) => { chapters: { status: 'loaded', videoId: 'abc', chapters: [...] } }
 *
 * @example
 * // Stale result (different videoId) - ignored
 * onChaptersLoad(
 *   { chapters: { status: 'loading', videoId: 'new' } },
 *   { status: 'loaded', videoId: 'old', chapters: [...] }
 * ) => { chapters: { status: 'loading', videoId: 'new', chapters: [] } }
 *
 * @example
 * // No chapters available
 * onChaptersLoad(
 *   { chapters: { status: 'loading', videoId: 'abc' } },
 *   { status: 'loaded', videoId: 'abc', chapters: [] }
 * ) => { chapters: { status: 'loaded', videoId: 'abc', chapters: [] } }
 */
export function onChaptersLoad(siteState, result) {
  // Template: siteState is Compound → access chapters
  // result is Compound → access status, videoId, chapters
  
  // Validate videoId matches current request
  // If no current chapters or different video, this is a stale result
  if (!siteState.chapters || 
      siteState.chapters.videoId !== result.videoId) {
    return siteState;
  }
  
  return {
    ...siteState,
    chapters: result
  };
}

/**
 * Clear chapters state.
 * Called when leaving watch page or navigating to different video.
 * [PURE]
 *
 * @param {YouTubeState} siteState - Current YouTube state
 * @returns {YouTubeState} New state with chapters cleared
 *
 * @example
 * onChaptersClear({ chapters: { status: 'loaded', ... } })
 *   => { chapters: null }
 */
export function onChaptersClear(siteState) {
  return {
    ...siteState,
    chapters: null
  };
}
