// Tests for YouTube getPositionLabel hook — returns "chapters: N" on watch pages with chapters

import { describe, it, expect } from 'vitest';
import type { AppState, Chapter } from '../../types';
import { youtubeConfig } from './index';

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    core: { focusModeActive: true, lastUrl: '' },
    ui: {
      drawer: null, paletteQuery: '', paletteSelectedIdx: 0,
      selectedIdx: 0, filterActive: false, filterQuery: '',
      searchActive: false, searchQuery: '', keySeq: '',
      sort: { field: null, direction: 'desc' },
      message: null, boundaryFlash: null,
      watchLaterAdded: new Set(), watchLaterRemoved: new Map(),
      lastWatchLaterRemoval: null, dismissedVideos: new Set(),
      lastDismissal: null,
    },
    site: null,
    page: null,
    ...overrides,
  };
}

describe('YouTube getPositionLabel', () => {
  const getPositionLabel = youtubeConfig.getPositionLabel!;

  it('returns "chapters: N" on watch page with chapters', () => {
    const chapters: Chapter[] = [
      { title: 'Intro', time: 0, timeText: '0:00' },
      { title: 'Main', time: 60, timeText: '1:00' },
      { title: 'Outro', time: 120, timeText: '2:00' },
    ];
    const state = makeState({
      page: { type: 'watch', videoContext: null, recommended: [], chapters },
    });
    expect(getPositionLabel(state)).toBe('chapters: 3');
  });

  it('returns null on watch page with empty chapters', () => {
    const state = makeState({
      page: { type: 'watch', videoContext: null, recommended: [], chapters: [] },
    });
    expect(getPositionLabel(state)).toBeNull();
  });

  it('returns null on list page', () => {
    const state = makeState({
      page: { type: 'list', videos: [] },
    });
    expect(getPositionLabel(state)).toBeNull();
  });

  it('returns null when page state is null', () => {
    const state = makeState({ page: null });
    expect(getPositionLabel(state)).toBeNull();
  });

  it('returns "chapters: 1" for single chapter', () => {
    const chapters: Chapter[] = [
      { title: 'Only Chapter', time: 0, timeText: '0:00' },
    ];
    const state = makeState({
      page: { type: 'watch', videoContext: null, recommended: [], chapters },
    });
    expect(getPositionLabel(state)).toBe('chapters: 1');
  });
});
