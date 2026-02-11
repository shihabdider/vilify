// State module tests
// Following HtDP: Examples become tests

import { describe, it, expect } from 'vitest';
import { 
  createAppState, 
  getMode, 
  onNavigate,
  onFilterToggle,
  onFilterChange,
  onDrawerOpen,
  onDrawerClose,
  onKeySeqUpdate,
  onKeySeqClear,
  onSortChange,
  onShowMessage,
  onBoundaryHit,
  onWatchLaterAdd,
  onWatchLaterRemove,
  onWatchLaterUndoRemove,
  onDismissVideo,
  onUndoDismissVideo,
  onClearFlash,
  onSearchToggle,
  onSearchChange,
  onPaletteQueryChange,
  onPaletteNavigate,
  onUrlChange,
  onPageUpdate,
  onListItemsUpdate,
  getVisibleItems,
  onSelect
} from './state.js';

describe('createAppState', () => {
  it('creates initial state with nested structure (no config)', () => {
    const state = createAppState();
    
    // Core
    expect(state.core).toEqual({
      focusModeActive: false,
      lastUrl: ''
    });
    
    // UI
    expect(state.ui.drawer).toBe(null);
    expect(state.ui.paletteQuery).toBe('');
    expect(state.ui.paletteSelectedIdx).toBe(0);
    expect(state.ui.selectedIdx).toBe(0);
    expect(state.ui.filterActive).toBe(false);
    expect(state.ui.filterQuery).toBe('');
    expect(state.ui.searchActive).toBe(false);
    expect(state.ui.searchQuery).toBe('');
    expect(state.ui.keySeq).toBe('');
    expect(state.ui.sort).toEqual({ field: null, direction: 'desc' });
    expect(state.ui.message).toBe(null);
    expect(state.ui.boundaryFlash).toBe(null);
    
    // Site and Page
    expect(state.site).toBe(null);
    expect(state.page).toBe(null);
  });

  it('creates site state when config has createSiteState', () => {
    const config = {
      name: 'youtube',
      createSiteState: () => ({ transcript: null, commentPage: 0 })
    };
    
    const state = createAppState(config);
    
    expect(state.site).toEqual({ transcript: null, commentPage: 0 });
    expect(state.page).toBe(null);
  });

  it('leaves site null when config has no createSiteState', () => {
    const config = { name: 'google' };
    
    const state = createAppState(config);
    
    expect(state.site).toBe(null);
  });

  it('creates independent instances (no shared references)', () => {
    const state1 = createAppState();
    const state2 = createAppState();
    
    state1.ui.selectedIdx = 5;
    state1.core.focusModeActive = true;
    
    expect(state2.ui.selectedIdx).toBe(0);
    expect(state2.core.focusModeActive).toBe(false);
  });
});

describe('getMode', () => {
  it('returns NORMAL when no mode active', () => {
    const state = createAppState();
    expect(getMode(state)).toBe('NORMAL');
  });

  it('returns COMMAND when palette drawer open', () => {
    const state = createAppState();
    state.ui.drawer = 'palette';
    expect(getMode(state)).toBe('COMMAND');
  });

  it('returns FILTER when filter active', () => {
    const state = createAppState();
    state.ui.filterActive = true;
    expect(getMode(state)).toBe('FILTER');
  });

  it('returns SEARCH when search active', () => {
    const state = createAppState();
    state.ui.searchActive = true;
    expect(getMode(state)).toBe('SEARCH');
  });

  it('returns uppercase drawer name for site drawers', () => {
    const state = createAppState();
    
    state.ui.drawer = 'chapters';
    expect(getMode(state)).toBe('CHAPTERS');
    
    state.ui.drawer = 'description';
    expect(getMode(state)).toBe('DESCRIPTION');
    
    state.ui.drawer = 'transcript';
    expect(getMode(state)).toBe('TRANSCRIPT');
  });

  it('drawer takes priority over filter', () => {
    const state = createAppState();
    state.ui.drawer = 'chapters';
    state.ui.filterActive = true;
    expect(getMode(state)).toBe('CHAPTERS');
  });

  it('filter takes priority over search', () => {
    const state = createAppState();
    state.ui.filterActive = true;
    state.ui.searchActive = true;
    expect(getMode(state)).toBe('FILTER');
  });
});

// =============================================================================
// STATE TRANSITIONS
// =============================================================================

describe('onNavigate', () => {
  it('moves down from index 0', () => {
    const state = createAppState();
    const result = onNavigate(state, 'down', 5);
    
    expect(result.state.ui.selectedIdx).toBe(1);
    expect(result.boundary).toBe(null);
  });

  it('moves up from index 2', () => {
    const state = createAppState();
    state.ui.selectedIdx = 2;
    const result = onNavigate(state, 'up', 5);
    
    expect(result.state.ui.selectedIdx).toBe(1);
    expect(result.boundary).toBe(null);
  });

  it('hits bottom boundary at last index', () => {
    const state = createAppState();
    state.ui.selectedIdx = 4;
    const result = onNavigate(state, 'down', 5);
    
    expect(result.state.ui.selectedIdx).toBe(4);
    expect(result.boundary).toBe('bottom');
  });

  it('hits top boundary at index 0', () => {
    const state = createAppState();
    const result = onNavigate(state, 'up', 5);
    
    expect(result.state.ui.selectedIdx).toBe(0);
    expect(result.boundary).toBe('top');
  });

  it('jumps to top', () => {
    const state = createAppState();
    state.ui.selectedIdx = 3;
    const result = onNavigate(state, 'top', 5);
    
    expect(result.state.ui.selectedIdx).toBe(0);
    expect(result.boundary).toBe(null);
  });

  it('jumps to bottom', () => {
    const state = createAppState();
    const result = onNavigate(state, 'bottom', 5);
    
    expect(result.state.ui.selectedIdx).toBe(4);
    expect(result.boundary).toBe(null);
  });

  it('handles empty list', () => {
    const state = createAppState();
    const result = onNavigate(state, 'down', 0);
    
    expect(result.state.ui.selectedIdx).toBe(0);
    expect(result.boundary).toBe(null);
  });

  // --- step parameter for down ---
  it('moves down by step from index 0', () => {
    const state = createAppState();
    const result = onNavigate(state, 'down', 20, 5);
    expect(result.state.ui.selectedIdx).toBe(5);
    expect(result.boundary).toBe(null);
  });

  it('moves down by step and hits bottom boundary at max', () => {
    const state = createAppState();
    state.ui.selectedIdx = 15;
    const result = onNavigate(state, 'down', 20, 5);
    expect(result.state.ui.selectedIdx).toBe(19);
    expect(result.boundary).toBe(null);
  });

  it('moves down by step clamped to max when near end', () => {
    const state = createAppState();
    state.ui.selectedIdx = 18;
    const result = onNavigate(state, 'down', 20, 5);
    expect(result.state.ui.selectedIdx).toBe(19);
    expect(result.boundary).toBe(null);
  });

  // --- step parameter for up ---
  it('moves up by step from index 10', () => {
    const state = createAppState();
    state.ui.selectedIdx = 10;
    const result = onNavigate(state, 'up', 20, 5);
    expect(result.state.ui.selectedIdx).toBe(5);
    expect(result.boundary).toBe(null);
  });

  it('moves up by step clamped to 0 when near start', () => {
    const state = createAppState();
    state.ui.selectedIdx = 3;
    const result = onNavigate(state, 'up', 20, 5);
    expect(result.state.ui.selectedIdx).toBe(0);
    expect(result.boundary).toBe(null);
  });

  it('hits top boundary when up from index 0 with step', () => {
    const state = createAppState();
    state.ui.selectedIdx = 0;
    const result = onNavigate(state, 'up', 20, 5);
    expect(result.state.ui.selectedIdx).toBe(0);
    expect(result.boundary).toBe('top');
  });

  // --- left direction ---
  it('moves left from index 5', () => {
    const state = createAppState();
    state.ui.selectedIdx = 5;
    const result = onNavigate(state, 'left', 20);
    expect(result.state.ui.selectedIdx).toBe(4);
    expect(result.boundary).toBe(null);
  });

  it('hits top boundary when left from index 0', () => {
    const state = createAppState();
    state.ui.selectedIdx = 0;
    const result = onNavigate(state, 'left', 20);
    expect(result.state.ui.selectedIdx).toBe(0);
    expect(result.boundary).toBe('top');
  });

  it('left ignores step parameter (always -1)', () => {
    const state = createAppState();
    state.ui.selectedIdx = 5;
    const result = onNavigate(state, 'left', 20, 5);
    expect(result.state.ui.selectedIdx).toBe(4);
    expect(result.boundary).toBe(null);
  });

  // --- right direction ---
  it('moves right from index 5', () => {
    const state = createAppState();
    state.ui.selectedIdx = 5;
    const result = onNavigate(state, 'right', 20);
    expect(result.state.ui.selectedIdx).toBe(6);
    expect(result.boundary).toBe(null);
  });

  it('hits bottom boundary when right from max index', () => {
    const state = createAppState();
    state.ui.selectedIdx = 19;
    const result = onNavigate(state, 'right', 20);
    expect(result.state.ui.selectedIdx).toBe(19);
    expect(result.boundary).toBe('bottom');
  });

  it('right ignores step parameter (always +1)', () => {
    const state = createAppState();
    state.ui.selectedIdx = 5;
    const result = onNavigate(state, 'right', 20, 5);
    expect(result.state.ui.selectedIdx).toBe(6);
    expect(result.boundary).toBe(null);
  });

  // --- backward compatibility ---
  it('down without step defaults to step=1', () => {
    const state = createAppState();
    const result = onNavigate(state, 'down', 5);
    expect(result.state.ui.selectedIdx).toBe(1);
    expect(result.boundary).toBe(null);
  });

  it('up without step defaults to step=1', () => {
    const state = createAppState();
    state.ui.selectedIdx = 2;
    const result = onNavigate(state, 'up', 5);
    expect(result.state.ui.selectedIdx).toBe(1);
    expect(result.boundary).toBe(null);
  });
});

describe('onFilterToggle', () => {
  it('turns filter on', () => {
    const state = createAppState();
    const result = onFilterToggle(state);
    
    expect(result.ui.filterActive).toBe(true);
    expect(result.ui.filterQuery).toBe('');
  });

  it('turns filter off and clears query', () => {
    const state = createAppState();
    state.ui.filterActive = true;
    state.ui.filterQuery = 'test';
    const result = onFilterToggle(state);
    
    expect(result.ui.filterActive).toBe(false);
    expect(result.ui.filterQuery).toBe('');
  });

  it('resets selectedIdx when turning off', () => {
    const state = createAppState();
    state.ui.filterActive = true;
    state.ui.selectedIdx = 5;
    const result = onFilterToggle(state);
    
    expect(result.ui.selectedIdx).toBe(0);
  });
});

describe('onFilterChange', () => {
  it('updates filter query', () => {
    const state = createAppState();
    const result = onFilterChange(state, 'test');
    
    expect(result.ui.filterQuery).toBe('test');
  });

  it('resets selectedIdx', () => {
    const state = createAppState();
    state.ui.selectedIdx = 5;
    const result = onFilterChange(state, 'test');
    
    expect(result.ui.selectedIdx).toBe(0);
  });
});

describe('onDrawerOpen', () => {
  it('opens drawer', () => {
    const state = createAppState();
    const result = onDrawerOpen(state, 'chapters');
    
    expect(result.ui.drawer).toBe('chapters');
  });

  it('resets palette state when opening palette', () => {
    const state = createAppState();
    state.ui.paletteQuery = 'old';
    state.ui.paletteSelectedIdx = 3;
    const result = onDrawerOpen(state, 'palette');
    
    expect(result.ui.drawer).toBe('palette');
    expect(result.ui.paletteQuery).toBe('');
    expect(result.ui.paletteSelectedIdx).toBe(0);
  });
});

describe('onDrawerClose', () => {
  it('closes drawer and resets palette state', () => {
    const state = createAppState();
    state.ui.drawer = 'chapters';
    state.ui.paletteQuery = 'test';
    const result = onDrawerClose(state);
    
    expect(result.ui.drawer).toBe(null);
    expect(result.ui.paletteQuery).toBe('');
    expect(result.ui.paletteSelectedIdx).toBe(0);
  });
});

describe('onKeySeqUpdate', () => {
  it('appends key to sequence', () => {
    const state = createAppState();
    const result = onKeySeqUpdate(state, 'g');
    
    expect(result.ui.keySeq).toBe('g');
  });

  it('appends to existing sequence', () => {
    const state = createAppState();
    state.ui.keySeq = 'g';
    const result = onKeySeqUpdate(state, 'h');
    
    expect(result.ui.keySeq).toBe('gh');
  });
});

describe('onKeySeqClear', () => {
  it('clears key sequence', () => {
    const state = createAppState();
    state.ui.keySeq = 'gh';
    const result = onKeySeqClear(state);
    
    expect(result.ui.keySeq).toBe('');
  });
});

describe('onSortChange', () => {
  it('sets sort field and direction', () => {
    const state = createAppState();
    const result = onSortChange(state, 'date', 'asc');
    
    expect(result.ui.sort.field).toBe('date');
    expect(result.ui.sort.direction).toBe('asc');
  });

  it('resets selectedIdx', () => {
    const state = createAppState();
    state.ui.selectedIdx = 5;
    const result = onSortChange(state, 'date', 'desc');
    
    expect(result.ui.selectedIdx).toBe(0);
  });

  it('can reset sort with null field', () => {
    const state = createAppState();
    state.ui.sort = { field: 'date', direction: 'asc' };
    const result = onSortChange(state, null, 'desc');
    
    expect(result.ui.sort.field).toBe(null);
    expect(result.ui.sort.direction).toBe('desc');
  });
});

describe('onShowMessage', () => {
  it('sets message with timestamp', () => {
    const state = createAppState();
    const before = Date.now();
    const result = onShowMessage(state, 'Copied!');
    const after = Date.now();
    
    expect(result.ui.message.text).toBe('Copied!');
    expect(result.ui.message.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.ui.message.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('onBoundaryHit', () => {
  it('sets boundary flash with timestamp', () => {
    const state = createAppState();
    const before = Date.now();
    const result = onBoundaryHit(state, 'top');
    const after = Date.now();
    
    expect(result.ui.boundaryFlash.edge).toBe('top');
    expect(result.ui.boundaryFlash.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.ui.boundaryFlash.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('onWatchLaterAdd', () => {
  it('adds video ID to watchLaterAdded set', () => {
    const state = createAppState();
    expect(state.ui.watchLaterAdded.size).toBe(0);
    
    const result = onWatchLaterAdd(state, 'abc123');
    
    expect(result.ui.watchLaterAdded.has('abc123')).toBe(true);
    expect(result.ui.watchLaterAdded.size).toBe(1);
  });
  
  it('preserves existing IDs when adding new one', () => {
    let state = createAppState();
    state = onWatchLaterAdd(state, 'video1');
    state = onWatchLaterAdd(state, 'video2');
    
    expect(state.ui.watchLaterAdded.has('video1')).toBe(true);
    expect(state.ui.watchLaterAdded.has('video2')).toBe(true);
    expect(state.ui.watchLaterAdded.size).toBe(2);
  });
  
  it('does not duplicate existing IDs', () => {
    let state = createAppState();
    state = onWatchLaterAdd(state, 'abc123');
    state = onWatchLaterAdd(state, 'abc123');
    
    expect(state.ui.watchLaterAdded.size).toBe(1);
  });
});

describe('onClearFlash', () => {
  it('clears expired message', () => {
    const state = createAppState();
    state.ui.message = { text: 'test', timestamp: Date.now() - 3000 };
    const result = onClearFlash(state, 2000, 150);
    
    expect(result.ui.message).toBe(null);
  });

  it('keeps unexpired message', () => {
    const state = createAppState();
    state.ui.message = { text: 'test', timestamp: Date.now() - 500 };
    const result = onClearFlash(state, 2000, 150);
    
    expect(result.ui.message.text).toBe('test');
  });

  it('clears expired boundary flash', () => {
    const state = createAppState();
    state.ui.boundaryFlash = { edge: 'top', timestamp: Date.now() - 200 };
    const result = onClearFlash(state, 2000, 150);
    
    expect(result.ui.boundaryFlash).toBe(null);
  });
});

describe('onSearchToggle', () => {
  it('turns search on', () => {
    const state = createAppState();
    const result = onSearchToggle(state);
    
    expect(result.ui.searchActive).toBe(true);
    expect(result.ui.searchQuery).toBe('');
  });

  it('turns search off and clears query', () => {
    const state = createAppState();
    state.ui.searchActive = true;
    state.ui.searchQuery = 'test';
    const result = onSearchToggle(state);
    
    expect(result.ui.searchActive).toBe(false);
    expect(result.ui.searchQuery).toBe('');
  });
});

describe('onSearchChange', () => {
  it('updates search query', () => {
    const state = createAppState();
    const result = onSearchChange(state, 'cats');
    
    expect(result.ui.searchQuery).toBe('cats');
  });
});

describe('onPaletteQueryChange', () => {
  it('updates palette query and resets selection', () => {
    const state = createAppState();
    state.ui.paletteSelectedIdx = 5;
    const result = onPaletteQueryChange(state, ':sort');
    
    expect(result.ui.paletteQuery).toBe(':sort');
    expect(result.ui.paletteSelectedIdx).toBe(0);
  });
});

describe('onPaletteNavigate', () => {
  it('moves down', () => {
    const state = createAppState();
    const result = onPaletteNavigate(state, 'down', 5);
    
    expect(result.state.ui.paletteSelectedIdx).toBe(1);
    expect(result.boundary).toBe(null);
  });

  it('moves up', () => {
    const state = createAppState();
    state.ui.paletteSelectedIdx = 2;
    const result = onPaletteNavigate(state, 'up', 5);
    
    expect(result.state.ui.paletteSelectedIdx).toBe(1);
  });

  it('hits bottom boundary', () => {
    const state = createAppState();
    state.ui.paletteSelectedIdx = 4;
    const result = onPaletteNavigate(state, 'down', 5);
    
    expect(result.state.ui.paletteSelectedIdx).toBe(4);
    expect(result.boundary).toBe('bottom');
  });

  it('hits top boundary', () => {
    const state = createAppState();
    const result = onPaletteNavigate(state, 'up', 5);
    
    expect(result.state.ui.paletteSelectedIdx).toBe(0);
    expect(result.boundary).toBe('top');
  });
});

describe('onUrlChange', () => {
  it('resets UI state on navigation', () => {
    const state = createAppState();
    state.ui.drawer = 'chapters';
    state.ui.selectedIdx = 5;
    state.ui.filterActive = true;
    state.ui.filterQuery = 'test';
    state.ui.sort = { field: 'date', direction: 'asc' };
    
    const result = onUrlChange(state, 'https://youtube.com/watch?v=abc');
    
    expect(result.core.lastUrl).toBe('https://youtube.com/watch?v=abc');
    expect(result.ui.drawer).toBe(null);
    expect(result.ui.selectedIdx).toBe(0);
    expect(result.ui.filterActive).toBe(false);
    expect(result.ui.filterQuery).toBe('');
    expect(result.ui.sort).toEqual({ field: null, direction: 'desc' });
    expect(result.page).toBe(null);
  });

  it('preserves site state', () => {
    const config = {
      createSiteState: () => ({ transcript: { status: 'loaded' } })
    };
    const state = createAppState(config);
    
    const result = onUrlChange(state, 'https://youtube.com/watch?v=abc');
    
    expect(result.site).toEqual({ transcript: { status: 'loaded' } });
  });
});

describe('getVisibleItems', () => {
  const items = [
    { id: '1', title: 'Music Video', meta: 'Artist · 2 days ago' },
    { id: '2', title: 'Code Tutorial', meta: 'Dev Channel · 1 week ago' },
    { id: '3', title: 'Music Theory', meta: 'Education · 3 days ago' },
  ];

  it('returns all items when no filter active', () => {
    const state = createAppState();
    const result = getVisibleItems(state, items);
    
    expect(result).toEqual(items);
  });

  it('filters by title', () => {
    const state = createAppState();
    state.ui.filterActive = true;
    state.ui.filterQuery = 'music';
    const result = getVisibleItems(state, items);
    
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Music Video');
    expect(result[1].title).toBe('Music Theory');
  });

  it('filters by meta (channel name)', () => {
    const state = createAppState();
    state.ui.filterActive = true;
    state.ui.filterQuery = 'dev';
    const result = getVisibleItems(state, items);
    
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Code Tutorial');
  });

  it('filter is case insensitive', () => {
    const state = createAppState();
    state.ui.filterActive = true;
    state.ui.filterQuery = 'MUSIC';
    const result = getVisibleItems(state, items);
    
    expect(result).toHaveLength(2);
  });

  it('returns empty array when filter matches nothing', () => {
    const state = createAppState();
    state.ui.filterActive = true;
    state.ui.filterQuery = 'xyz';
    const result = getVisibleItems(state, items);
    
    expect(result).toEqual([]);
  });

  it('handles empty items array', () => {
    const state = createAppState();
    const result = getVisibleItems(state, []);
    
    expect(result).toEqual([]);
  });

  it('returns all items when filter active but query empty', () => {
    const state = createAppState();
    state.ui.filterActive = true;
    state.ui.filterQuery = '';
    const result = getVisibleItems(state, items);
    
    expect(result).toEqual(items);
  });

  it('applies sort when sort field set', () => {
    const state = createAppState();
    state.ui.sort = { field: 'title', direction: 'asc' };
    const result = getVisibleItems(state, items);
    
    expect(result[0].title).toBe('Code Tutorial');
    expect(result[1].title).toBe('Music Theory');
    expect(result[2].title).toBe('Music Video');
  });
});

describe('onSelect', () => {
  const items = [
    { id: '1', title: 'Video 1', url: '/watch?v=abc' },
    { id: '2', title: 'Video 2', url: '/watch?v=def' },
  ];

  it('returns navigate action for normal select', () => {
    const state = createAppState();
    const result = onSelect(state, items, false);
    
    expect(result.action).toBe('navigate');
    expect(result.url).toBe('/watch?v=abc');
  });

  it('returns newTab action when shift held', () => {
    const state = createAppState();
    const result = onSelect(state, items, true);
    
    expect(result.action).toBe('newTab');
    expect(result.url).toBe('/watch?v=abc');
  });

  it('selects correct item based on selectedIdx', () => {
    const state = createAppState();
    state.ui.selectedIdx = 1;
    const result = onSelect(state, items, false);
    
    expect(result.url).toBe('/watch?v=def');
  });

  it('returns null action when no items', () => {
    const state = createAppState();
    const result = onSelect(state, [], false);
    
    expect(result.action).toBe(null);
    expect(result.url).toBe(null);
  });

  it('returns null action when item has no URL', () => {
    const state = createAppState();
    const result = onSelect(state, [{ id: '1', title: 'No URL' }], false);
    
    expect(result.action).toBe(null);
    expect(result.url).toBe(null);
  });

  it('returns null action when selectedIdx out of bounds', () => {
    const state = createAppState();
    state.ui.selectedIdx = 10;
    const result = onSelect(state, items, false);
    
    expect(result.action).toBe(null);
    expect(result.url).toBe(null);
  });
});

// =============================================================================
// PAGE STATE
// =============================================================================

describe('onPageUpdate', () => {
  it('sets list page state', () => {
    const state = createAppState();
    const pageState = { type: 'list', videos: [{ id: '1', title: 'Video' }] };
    
    const result = onPageUpdate(state, pageState);
    
    expect(result.page).toEqual(pageState);
    expect(result.page.type).toBe('list');
    expect(result.page.videos).toHaveLength(1);
  });
  
  it('sets watch page state', () => {
    const state = createAppState();
    const pageState = { 
      type: 'watch', 
      videoContext: { videoId: 'abc', title: 'Test' },
      recommended: [],
      chapters: []
    };
    
    const result = onPageUpdate(state, pageState);
    
    expect(result.page.type).toBe('watch');
    expect(result.page.videoContext.videoId).toBe('abc');
  });
  
  it('replaces existing page state', () => {
    const state = createAppState();
    state.page = { type: 'list', videos: [{ id: '1' }] };
    
    const newPageState = { type: 'list', videos: [{ id: '2' }, { id: '3' }] };
    const result = onPageUpdate(state, newPageState);
    
    expect(result.page.videos).toHaveLength(2);
    expect(result.page.videos[0].id).toBe('2');
  });
  
  it('preserves other state fields', () => {
    const state = createAppState();
    state.ui.selectedIdx = 5;
    state.core.focusModeActive = true;
    
    const result = onPageUpdate(state, { type: 'list', videos: [] });
    
    expect(result.ui.selectedIdx).toBe(5);
    expect(result.core.focusModeActive).toBe(true);
  });
});

describe('onListItemsUpdate', () => {
  it('updates videos in list page', () => {
    const state = createAppState();
    state.page = { type: 'list', videos: [] };
    
    const videos = [{ id: '1', title: 'New Video' }];
    const result = onListItemsUpdate(state, videos);
    
    expect(result.page.videos).toHaveLength(1);
    expect(result.page.videos[0].title).toBe('New Video');
  });
  
  it('no-op for watch page', () => {
    const state = createAppState();
    state.page = { 
      type: 'watch', 
      videoContext: null,
      recommended: [],
      chapters: []
    };
    
    const result = onListItemsUpdate(state, [{ id: '1' }]);
    
    // Should return same state (watch page not updated)
    expect(result).toBe(state);
    expect(result.page.type).toBe('watch');
  });
  
  it('no-op when page is null', () => {
    const state = createAppState();
    expect(state.page).toBeNull();
    
    const result = onListItemsUpdate(state, [{ id: '1' }]);
    
    expect(result).toBe(state);
    expect(result.page).toBeNull();
  });
  
  it('preserves other page fields', () => {
    const state = createAppState();
    state.page = { type: 'list', videos: [], customField: 'test' };
    
    const result = onListItemsUpdate(state, [{ id: '1' }]);
    
    expect(result.page.customField).toBe('test');
    expect(result.page.videos).toHaveLength(1);
  });
});

// =============================================================================
// WATCH LATER REMOVAL
// =============================================================================

describe('onWatchLaterRemove', () => {
  it('adds video to removed map', () => {
    const state = createAppState();
    
    const result = onWatchLaterRemove(state, 'video1', 'SET_VIDEO_ID_1', 0);
    
    expect(result.ui.watchLaterRemoved.has('video1')).toBe(true);
    expect(result.ui.watchLaterRemoved.get('video1')).toEqual({
      setVideoId: 'SET_VIDEO_ID_1',
      position: 0
    });
  });
  
  it('sets lastWatchLaterRemoval for undo', () => {
    const state = createAppState();
    
    const result = onWatchLaterRemove(state, 'video1', 'SET_VIDEO_ID_1', 2);
    
    expect(result.ui.lastWatchLaterRemoval).toEqual({
      videoId: 'video1',
      setVideoId: 'SET_VIDEO_ID_1',
      position: 2
    });
  });
  
  it('does not mutate original state', () => {
    const state = createAppState();
    const originalRemoved = state.ui.watchLaterRemoved;
    
    onWatchLaterRemove(state, 'video1', 'SET_VIDEO_ID_1', 0);
    
    expect(state.ui.watchLaterRemoved).toBe(originalRemoved);
    expect(state.ui.watchLaterRemoved.has('video1')).toBe(false);
  });
});

describe('onWatchLaterUndoRemove', () => {
  it('removes video from removed map', () => {
    let state = createAppState();
    state = onWatchLaterRemove(state, 'video1', 'SET_VIDEO_ID_1', 0);
    
    const result = onWatchLaterUndoRemove(state, 'video1');
    
    expect(result.ui.watchLaterRemoved.has('video1')).toBe(false);
  });
  
  it('clears lastWatchLaterRemoval', () => {
    let state = createAppState();
    state = onWatchLaterRemove(state, 'video1', 'SET_VIDEO_ID_1', 0);
    
    const result = onWatchLaterUndoRemove(state, 'video1');
    
    expect(result.ui.lastWatchLaterRemoval).toBe(null);
  });
  
  it('does not mutate original state', () => {
    let state = createAppState();
    state = onWatchLaterRemove(state, 'video1', 'SET_VIDEO_ID_1', 0);
    const originalRemoved = state.ui.watchLaterRemoved;
    
    onWatchLaterUndoRemove(state, 'video1');
    
    expect(state.ui.watchLaterRemoved).toBe(originalRemoved);
    expect(state.ui.watchLaterRemoved.has('video1')).toBe(true);
  });
});

// =============================================================================
// DISMISS VIDEO ("Not interested")
// =============================================================================

describe('onDismissVideo', () => {
  it('adds video ID to dismissedVideos set', () => {
    const state = createAppState();
    expect(state.ui.dismissedVideos.size).toBe(0);
    
    const result = onDismissVideo(state, 'abc123');
    
    expect(result.ui.dismissedVideos.has('abc123')).toBe(true);
    expect(result.ui.dismissedVideos.size).toBe(1);
  });
  
  it('sets lastDismissal for undo', () => {
    const state = createAppState();
    
    const result = onDismissVideo(state, 'abc123');
    
    expect(result.ui.lastDismissal).toEqual({ videoId: 'abc123' });
  });
  
  it('preserves existing dismissed IDs when adding new one', () => {
    let state = createAppState();
    state = onDismissVideo(state, 'video1');
    state = onDismissVideo(state, 'video2');
    
    expect(state.ui.dismissedVideos.has('video1')).toBe(true);
    expect(state.ui.dismissedVideos.has('video2')).toBe(true);
    expect(state.ui.dismissedVideos.size).toBe(2);
  });
  
  it('updates lastDismissal to most recent', () => {
    let state = createAppState();
    state = onDismissVideo(state, 'video1');
    state = onDismissVideo(state, 'video2');
    
    expect(state.ui.lastDismissal).toEqual({ videoId: 'video2' });
  });
  
  it('does not duplicate existing IDs', () => {
    let state = createAppState();
    state = onDismissVideo(state, 'abc123');
    state = onDismissVideo(state, 'abc123');
    
    expect(state.ui.dismissedVideos.size).toBe(1);
  });
  
  it('does not mutate original state', () => {
    const state = createAppState();
    const originalSet = state.ui.dismissedVideos;
    
    onDismissVideo(state, 'abc123');
    
    expect(state.ui.dismissedVideos).toBe(originalSet);
    expect(state.ui.dismissedVideos.has('abc123')).toBe(false);
  });
});

describe('onUndoDismissVideo', () => {
  it('removes video from dismissed set', () => {
    let state = createAppState();
    state = onDismissVideo(state, 'video1');
    
    const result = onUndoDismissVideo(state, 'video1');
    
    expect(result.ui.dismissedVideos.has('video1')).toBe(false);
  });
  
  it('clears lastDismissal', () => {
    let state = createAppState();
    state = onDismissVideo(state, 'video1');
    
    const result = onUndoDismissVideo(state, 'video1');
    
    expect(result.ui.lastDismissal).toBe(null);
  });
  
  it('does not mutate original state', () => {
    let state = createAppState();
    state = onDismissVideo(state, 'video1');
    const originalSet = state.ui.dismissedVideos;
    
    onUndoDismissVideo(state, 'video1');
    
    expect(state.ui.dismissedVideos).toBe(originalSet);
    expect(state.ui.dismissedVideos.has('video1')).toBe(true);
  });
  
  it('preserves other dismissed videos', () => {
    let state = createAppState();
    state = onDismissVideo(state, 'video1');
    state = onDismissVideo(state, 'video2');
    
    const result = onUndoDismissVideo(state, 'video1');
    
    expect(result.ui.dismissedVideos.has('video1')).toBe(false);
    expect(result.ui.dismissedVideos.has('video2')).toBe(true);
  });
});

describe('getVisibleItems - dismissed videos stay visible', () => {
  const items = [
    { id: '1', title: 'Video 1', meta: 'Channel A', data: { videoId: '1' } },
    { id: '2', title: 'Video 2', meta: 'Channel B', data: { videoId: '2' } },
    { id: '3', title: 'Video 3', meta: 'Channel C', data: { videoId: '3' } },
  ];

  it('dismissed videos remain in visible items (grayed out in renderer)', () => {
    let state = createAppState();
    state = onDismissVideo(state, '2');
    
    const result = getVisibleItems(state, items);
    
    // Dismissed videos are NOT filtered out — they stay visible but grayed out
    expect(result).toHaveLength(3);
    expect(result[1].id).toBe('2');
  });
  
  it('multiple dismissed videos remain visible', () => {
    let state = createAppState();
    state = onDismissVideo(state, '1');
    state = onDismissVideo(state, '3');
    
    const result = getVisibleItems(state, items);
    
    expect(result).toHaveLength(3);
  });
  
  it('dismissed + text filter still applies text filter', () => {
    let state = createAppState();
    state = onDismissVideo(state, '1');
    state.ui.filterActive = true;
    state.ui.filterQuery = 'Channel';
    
    const result = getVisibleItems(state, items);
    
    // Text filter applies, but dismissed status doesn't filter
    expect(result).toHaveLength(3);
  });
  
  it('returns all items when no dismissed videos', () => {
    const state = createAppState();
    
    const result = getVisibleItems(state, items);
    
    expect(result).toHaveLength(3);
  });
});
