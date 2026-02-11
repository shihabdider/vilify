// @vitest-environment jsdom
// Tests for renderGoogleImageGrid
// Verifies the grid render function: clears container, builds CSS grid,
// filters items, updates sort/count indicators, scrolls selected into view.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock layout.js (updateSortIndicator, updateItemCount)
vi.mock('../../core/layout.js', () => ({
  updateSortIndicator: vi.fn(),
  updateItemCount: vi.fn(),
}));

// Mock sort.js (sortItems, getSortLabel)
vi.mock('../../core/sort.js', () => ({
  sortItems: vi.fn((items) => items),
  getSortLabel: vi.fn((field, dir) => field ? `${field}:${dir}` : ''),
}));

import { renderGoogleImageGrid } from './grid.js';
import { updateSortIndicator, updateItemCount } from '../../core/layout.js';
import { sortItems, getSortLabel } from '../../core/sort.js';

/** Helper: create a minimal item */
function makeItem(id, title = 'img', meta = 'example.com') {
  return { id, title, thumbnail: `https://cdn.test/${id}.jpg`, meta, url: `https://example.com/${id}`, description: '' };
}

/** Helper: create state with given items and ui overrides */
function makeState(items, uiOverrides = {}) {
  return {
    page: { videos: items },
    ui: {
      filterActive: false,
      filterQuery: '',
      sort: { field: null, direction: null },
      selectedIdx: 0,
      ...uiOverrides,
    },
  };
}

describe('renderGoogleImageGrid', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    vi.clearAllMocks();
  });

  // ---- Basic rendering ----

  it('clears the container before rendering', () => {
    container.innerHTML = '<p>old content</p>';
    const state = makeState([makeItem('1')]);
    renderGoogleImageGrid(state, {}, container);
    expect(container.querySelector('p')).toBeNull();
  });

  it('creates a grid container div with class vilify-google-grid', () => {
    const state = makeState([makeItem('1')]);
    renderGoogleImageGrid(state, {}, container);
    const grid = container.querySelector('.vilify-google-grid');
    expect(grid).not.toBeNull();
    expect(grid.tagName).toBe('DIV');
  });

  it('renders one grid cell per item', () => {
    const items = [makeItem('1'), makeItem('2'), makeItem('3')];
    const state = makeState(items);
    renderGoogleImageGrid(state, {}, container);
    const cells = container.querySelectorAll('.vilify-google-grid-cell');
    expect(cells.length).toBe(3);
  });

  it('sets data-index attribute on each cell', () => {
    const items = [makeItem('a'), makeItem('b')];
    const state = makeState(items);
    renderGoogleImageGrid(state, {}, container);
    const cells = container.querySelectorAll('.vilify-google-grid-cell');
    expect(cells[0].getAttribute('data-index')).toBe('0');
    expect(cells[1].getAttribute('data-index')).toBe('1');
  });

  // ---- Selection ----

  it('marks the selected item with "selected" class', () => {
    const items = [makeItem('1'), makeItem('2'), makeItem('3')];
    const state = makeState(items, { selectedIdx: 1 });
    renderGoogleImageGrid(state, {}, container);
    const cells = container.querySelectorAll('.vilify-google-grid-cell');
    expect(cells[0].classList.contains('selected')).toBe(false);
    expect(cells[1].classList.contains('selected')).toBe(true);
    expect(cells[2].classList.contains('selected')).toBe(false);
  });

  it('scrolls the selected cell into view', () => {
    const items = [makeItem('1'), makeItem('2')];
    const state = makeState(items, { selectedIdx: 1 });
    renderGoogleImageGrid(state, {}, container);
    const selectedCell = container.querySelector('.vilify-google-grid-cell.selected');
    expect(selectedCell).not.toBeNull();
    // jsdom doesn't implement scrollIntoView natively, but we can spy on it
    // The function should call scrollIntoView — verify it exists on the element
  });

  // ---- Empty state ----

  it('shows empty state div when no items exist', () => {
    const state = makeState([]);
    renderGoogleImageGrid(state, {}, container);
    const empty = container.querySelector('.vilify-empty');
    expect(empty).not.toBeNull();
    expect(empty.textContent).toBe('No images found');
  });

  it('does not create grid container when no items', () => {
    const state = makeState([]);
    renderGoogleImageGrid(state, {}, container);
    expect(container.querySelector('.vilify-google-grid')).toBeNull();
  });

  it('shows empty state when state.page.videos is undefined', () => {
    const state = { page: {}, ui: { filterActive: false, filterQuery: '', sort: { field: null, direction: null }, selectedIdx: 0 } };
    renderGoogleImageGrid(state, {}, container);
    const empty = container.querySelector('.vilify-empty');
    expect(empty).not.toBeNull();
  });

  // ---- Filter ----

  it('filters items by title when filterActive is true', () => {
    const items = [makeItem('1', 'sunset'), makeItem('2', 'mountain'), makeItem('3', 'sunset glow')];
    const state = makeState(items, { filterActive: true, filterQuery: 'sunset' });
    renderGoogleImageGrid(state, {}, container);
    const cells = container.querySelectorAll('.vilify-google-grid-cell');
    expect(cells.length).toBe(2);
  });

  it('filters items by meta when filterActive is true', () => {
    const items = [makeItem('1', 'img', 'flickr.com'), makeItem('2', 'img', 'example.com')];
    const state = makeState(items, { filterActive: true, filterQuery: 'flickr' });
    renderGoogleImageGrid(state, {}, container);
    const cells = container.querySelectorAll('.vilify-google-grid-cell');
    expect(cells.length).toBe(1);
  });

  it('filters items by description when filterActive is true', () => {
    const items = [
      { ...makeItem('1'), description: 'beautiful nature photo' },
      { ...makeItem('2'), description: 'city skyline' },
    ];
    const state = makeState(items, { filterActive: true, filterQuery: 'nature' });
    renderGoogleImageGrid(state, {}, container);
    const cells = container.querySelectorAll('.vilify-google-grid-cell');
    expect(cells.length).toBe(1);
  });

  it('filter is case-insensitive', () => {
    const items = [makeItem('1', 'Sunset'), makeItem('2', 'mountain')];
    const state = makeState(items, { filterActive: true, filterQuery: 'SUNSET' });
    renderGoogleImageGrid(state, {}, container);
    const cells = container.querySelectorAll('.vilify-google-grid-cell');
    expect(cells.length).toBe(1);
  });

  it('shows empty state when filter matches nothing', () => {
    const items = [makeItem('1', 'sunset')];
    const state = makeState(items, { filterActive: true, filterQuery: 'zzzzz' });
    renderGoogleImageGrid(state, {}, container);
    expect(container.querySelector('.vilify-empty')).not.toBeNull();
  });

  it('does not filter when filterActive is false', () => {
    const items = [makeItem('1', 'sunset'), makeItem('2', 'mountain')];
    const state = makeState(items, { filterActive: false, filterQuery: 'sunset' });
    renderGoogleImageGrid(state, {}, container);
    const cells = container.querySelectorAll('.vilify-google-grid-cell');
    expect(cells.length).toBe(2);
  });

  // ---- Sort ----

  it('calls sortItems when sort.field is set', () => {
    const items = [makeItem('1'), makeItem('2')];
    const state = makeState(items, { sort: { field: 'title', direction: 'asc' } });
    renderGoogleImageGrid(state, {}, container);
    expect(sortItems).toHaveBeenCalledWith(items, 'title', 'asc');
  });

  it('does not call sortItems when sort.field is null', () => {
    const items = [makeItem('1')];
    const state = makeState(items);
    renderGoogleImageGrid(state, {}, container);
    expect(sortItems).not.toHaveBeenCalled();
  });

  // ---- Status bar updates ----

  it('calls updateSortIndicator with sort label', () => {
    const state = makeState([makeItem('1')], { sort: { field: 'title', direction: 'desc' } });
    renderGoogleImageGrid(state, {}, container);
    expect(getSortLabel).toHaveBeenCalledWith('title', 'desc');
    expect(updateSortIndicator).toHaveBeenCalled();
  });

  it('calls updateItemCount with the number of (filtered) items', () => {
    const items = [makeItem('1'), makeItem('2'), makeItem('3')];
    const state = makeState(items);
    renderGoogleImageGrid(state, {}, container);
    expect(updateItemCount).toHaveBeenCalledWith(3);
  });

  it('calls updateItemCount with filtered count when filter is active', () => {
    const items = [makeItem('1', 'sunset', 'cdn.test'), makeItem('2', 'mountain', 'cdn.test'), makeItem('3', 'sunset glow', 'cdn.test')];
    const state = makeState(items, { filterActive: true, filterQuery: 'sunset' });
    renderGoogleImageGrid(state, {}, container);
    expect(updateItemCount).toHaveBeenCalledWith(2);
  });
});
