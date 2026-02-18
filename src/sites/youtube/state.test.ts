// Tests for YouTube state transitions
import { describe, it, expect } from 'vitest';
import type { YouTubeState, TranscriptResult, ChaptersResult, ContentItem, VideoContext } from '../../types';
import {
  createListPageState,
  createWatchPageState,
  onTranscriptRequest,
  onTranscriptLoad,
  onTranscriptClear,
  onChaptersRequest,
  onChaptersLoad,
  onChaptersClear,
} from './state';

/** Helper: create a full YouTubeState with overrides for relevant fields */
function makeState(overrides: Partial<YouTubeState> = {}): YouTubeState {
  return {
    chapterQuery: '',
    chapterSelectedIdx: 0,
    commentPage: 0,
    commentPageStarts: [0],
    settingsApplied: false,
    watchPageRetryCount: 0,
    commentLoadAttempts: 0,
    transcript: null,
    chapters: null,
    ...overrides,
  };
}

// =============================================================================
// PAGE STATE CREATION
// =============================================================================

describe('createListPageState', () => {
  it('creates empty list page state', () => {
    const result = createListPageState([]);
    
    expect(result).toEqual({
      type: 'list',
      videos: []
    });
  });
  
  it('creates list page state with videos', () => {
    const videos: ContentItem[] = [
      { title: 'Video 1', url: '/watch?v=1', id: '1' },
      { title: 'Video 2', url: '/watch?v=2', id: '2' }
    ];
    const result = createListPageState(videos);
    
    expect(result.type).toBe('list');
    expect(result.videos).toHaveLength(2);
    expect(result.videos[0].title).toBe('Video 1');
  });
  
  it('defaults to empty array', () => {
    const result = createListPageState();
    
    expect(result).toEqual({
      type: 'list',
      videos: []
    });
  });
});

describe('createWatchPageState', () => {
  it('creates empty watch page state', () => {
    const result = createWatchPageState(null, [], []);
    
    expect(result).toEqual({
      type: 'watch',
      videoContext: null,
      recommended: [],
      chapters: []
    });
  });
  
  it('creates watch page state with all data', () => {
    const videoContext: VideoContext = { videoId: 'abc', title: 'Cool Video', channelName: 'Creator' };
    const recommended: ContentItem[] = [{ title: 'Related', url: '/watch?v=xyz', id: 'xyz' }];
    const chapters: Chapter[] = [{ title: 'Intro', time: 0, timeText: '0:00' }];
    
    const result = createWatchPageState(videoContext, recommended, chapters);
    
    expect(result.type).toBe('watch');
    expect(result.videoContext!.videoId).toBe('abc');
    expect(result.recommended).toHaveLength(1);
    expect(result.chapters).toHaveLength(1);
  });
  
  it('defaults all fields', () => {
    const result = createWatchPageState();
    
    expect(result).toEqual({
      type: 'watch',
      videoContext: null,
      recommended: [],
      chapters: []
    });
  });
});

describe('onTranscriptRequest', () => {
  it('sets loading state from null', () => {
    const state = makeState({ transcript: null });
    const result = onTranscriptRequest(state, 'abc123');
    
    expect(result.transcript).toEqual({
      status: 'loading',
      videoId: 'abc123',
    });
  });
  
  it('resets to loading for different video', () => {
    const state = makeState({
      transcript: {
        status: 'loaded',
        videoId: 'old',
        segments: [{ text: 'hello', start: 0, duration: 1 }],
      }
    });
    const result = onTranscriptRequest(state, 'new');
    
    expect(result.transcript).toEqual({
      status: 'loading',
      videoId: 'new',
    });
  });
  
  it('no-op when already loading same video', () => {
    const state = makeState({
      transcript: {
        status: 'loading',
        videoId: 'abc',
      }
    });
    const result = onTranscriptRequest(state, 'abc');
    
    expect(result).toBe(state); // Same reference (no change)
  });
  
  it('preserves other state fields', () => {
    const state = makeState({
      chapterQuery: 'intro',
      commentPage: 2,
      transcript: null
    });
    const result = onTranscriptRequest(state, 'xyz');
    
    expect(result.chapterQuery).toBe('intro');
    expect(result.commentPage).toBe(2);
  });
});

describe('onTranscriptLoad', () => {
  it('stores loaded result when videoId matches', () => {
    const state = makeState({
      transcript: {
        status: 'loading',
        videoId: 'abc',
      }
    });
    const result = onTranscriptLoad(state, {
      status: 'loaded',
      videoId: 'abc',
      segments: [{ text: 'hello', start: 0, duration: 1 }],
    });
    
    expect(result.transcript!.status).toBe('loaded');
    expect(result.transcript!.segments).toHaveLength(1);
  });
  
  it('ignores stale result when videoId differs', () => {
    const state = makeState({
      transcript: {
        status: 'loading',
        videoId: 'new',
      }
    });
    const result = onTranscriptLoad(state, {
      status: 'loaded',
      videoId: 'old',
      segments: [{ text: 'stale', start: 0, duration: 1 }],
    });
    
    expect(result).toBe(state); // No change - stale result ignored
  });
  
  it('handles error result', () => {
    const state = makeState({
      transcript: {
        status: 'loading',
        videoId: 'abc',
      }
    });
    const result = onTranscriptLoad(state, {
      status: 'error',
      videoId: 'abc',
      error: 'unavailable',
    });
    
    expect(result.transcript!.status).toBe('error');
  });
  
  it('ignores result when no current transcript', () => {
    const state = makeState({ transcript: null });
    const result = onTranscriptLoad(state, {
      status: 'loaded',
      videoId: 'abc',
      segments: [{ text: 'hello', start: 0, duration: 1 }],
    });
    
    expect(result).toBe(state); // No change - no active request
  });
});

describe('onTranscriptClear', () => {
  it('clears transcript state', () => {
    const state = makeState({
      transcript: {
        status: 'loaded',
        videoId: 'abc',
        segments: [{ text: 'hello', start: 0, duration: 1 }],
      }
    });
    const result = onTranscriptClear(state);
    
    expect(result.transcript).toBeNull();
  });
  
  it('preserves other state fields', () => {
    const state = makeState({
      chapterQuery: 'intro',
      commentPage: 2,
      transcript: { status: 'loaded', videoId: 'abc', segments: [] }
    });
    const result = onTranscriptClear(state);
    
    expect(result.chapterQuery).toBe('intro');
    expect(result.commentPage).toBe(2);
    expect(result.transcript).toBeNull();
  });
});

// =============================================================================
// CHAPTERS STATE TRANSITIONS
// =============================================================================

describe('onChaptersRequest', () => {
  it('sets loading state from null', () => {
    const state = makeState({ chapters: null });
    const result = onChaptersRequest(state, 'abc123');
    
    expect(result.chapters).toEqual({
      status: 'loading',
      videoId: 'abc123',
      chapters: []
    });
  });
  
  it('resets to loading for different video', () => {
    const state = makeState({
      chapters: {
        status: 'loaded',
        videoId: 'old',
        chapters: [{ title: 'Intro', time: 0, timeText: '0:00' }]
      }
    });
    const result = onChaptersRequest(state, 'new');
    
    expect(result.chapters).toEqual({
      status: 'loading',
      videoId: 'new',
      chapters: []
    });
  });
  
  it('no-op when already loading same video', () => {
    const state = makeState({
      chapters: {
        status: 'loading',
        videoId: 'abc',
        chapters: []
      }
    });
    const result = onChaptersRequest(state, 'abc');
    
    expect(result).toBe(state); // Same reference (no change)
  });
  
  it('preserves other state fields', () => {
    const state = makeState({
      commentPage: 2,
      transcript: { status: 'loaded', videoId: 'abc', segments: [] },
      chapters: null
    });
    const result = onChaptersRequest(state, 'xyz');
    
    expect(result.commentPage).toBe(2);
    expect(result.transcript!.status).toBe('loaded');
  });
});

describe('onChaptersLoad', () => {
  it('stores loaded result when videoId matches', () => {
    const state = makeState({
      chapters: {
        status: 'loading',
        videoId: 'abc',
        chapters: []
      }
    });
    const result = onChaptersLoad(state, {
      status: 'loaded',
      videoId: 'abc',
      chapters: [{ title: 'Intro', time: 0, timeText: '0:00' }]
    });
    
    expect(result.chapters!.status).toBe('loaded');
    expect(result.chapters!.chapters).toHaveLength(1);
  });
  
  it('ignores stale result when videoId differs', () => {
    const state = makeState({
      chapters: {
        status: 'loading',
        videoId: 'new',
        chapters: []
      }
    });
    const result = onChaptersLoad(state, {
      status: 'loaded',
      videoId: 'old',
      chapters: [{ title: 'Stale', time: 0, timeText: '0:00' }]
    });
    
    expect(result).toBe(state); // No change - stale result ignored
  });
  
  it('handles empty chapters (no chapters in video)', () => {
    const state = makeState({
      chapters: {
        status: 'loading',
        videoId: 'abc',
        chapters: []
      }
    });
    const result = onChaptersLoad(state, {
      status: 'loaded',
      videoId: 'abc',
      chapters: []
    });
    
    expect(result.chapters!.status).toBe('loaded');
    expect(result.chapters!.chapters).toHaveLength(0);
  });
  
  it('ignores result when no current chapters request', () => {
    const state = makeState({ chapters: null });
    const result = onChaptersLoad(state, {
      status: 'loaded',
      videoId: 'abc',
      chapters: [{ title: 'Intro', time: 0, timeText: '0:00' }]
    });
    
    expect(result).toBe(state); // No change - no active request
  });
});

describe('onChaptersClear', () => {
  it('clears chapters state', () => {
    const state = makeState({
      chapters: {
        status: 'loaded',
        videoId: 'abc',
        chapters: [{ title: 'Intro', time: 0, timeText: '0:00' }]
      }
    });
    const result = onChaptersClear(state);
    
    expect(result.chapters).toBeNull();
  });
  
  it('preserves other state fields', () => {
    const state = makeState({
      commentPage: 2,
      transcript: { status: 'loaded', videoId: 'abc', segments: [] },
      chapters: { status: 'loaded', videoId: 'abc', chapters: [] }
    });
    const result = onChaptersClear(state);

    expect(result.commentPage).toBe(2);
    expect(result.transcript!.status).toBe('loaded');
    expect(result.chapters).toBeNull();
  });
});
