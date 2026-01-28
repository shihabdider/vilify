/**
 * YouTube State
 * 
 * Site-specific state for YouTube.
 */

/**
 * [PURE] Creates initial YouTube-specific state.
 *
 * Examples:
 *   createYouTubeState()
 *     => { modalState: null, chapterQuery: '', chapterSelectedIdx: 0,
 *          commentPage: 0, commentPageStarts: [0], settingsApplied: false,
 *          watchPageRetryCount: 0, commentLoadAttempts: 0 }
 */
export function createYouTubeState() {
  return {
    modalState: null,
    chapterQuery: '',
    chapterSelectedIdx: 0,
    commentPage: 0,
    commentPageStarts: [0],
    settingsApplied: false,
    watchPageRetryCount: 0,
    commentLoadAttempts: 0,
  };
}

/**
 * [PURE] Reset YouTube state.
 *
 * Examples:
 *   resetYouTubeState(state)
 *     => createYouTubeState()
 */
export function resetYouTubeState(state) {
  return createYouTubeState();
}
