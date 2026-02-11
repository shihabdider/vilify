// Google Images grid renderer
// CSS grid layout with 2D navigation support

import { el, clear } from '../../core/view.js';
import { updateSortIndicator, updateItemCount } from '../../core/layout.js';
import { getSortLabel } from '../../core/sort.js';
import { getVisibleItems } from '../../core/state.js';
import { getPageItems } from '../../core/view-tree.js';

/**
 * Number of columns in the image grid.
 * Used by keyboard navigation to calculate step size for up/down movement.
 * @type {number}
 */
export const GRID_COLUMNS = 5;

// =============================================================================
// STYLES
// =============================================================================

const GOOGLE_GRID_CSS = `
  /* Google Images grid container */
  .vilify-google-grid {
    display: grid;
    grid-template-columns: repeat(${GRID_COLUMNS}, 1fr);
    gap: 8px;
    padding: 8px;
    overflow-y: auto;
    scroll-behavior: smooth;
  }

  /* Individual grid cell */
  .vilify-google-grid-cell {
    position: relative;
    aspect-ratio: 4 / 3;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    background: var(--bg-2);
  }

  .vilify-google-grid-cell:hover {
    background: var(--bg-3);
  }

  .vilify-google-grid-cell.selected {
    border-color: var(--accent);
  }

  /* Thumbnail image */
  .vilify-google-grid-cell img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* Title overlay at bottom of cell */
  .vilify-google-grid-cell-title {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 4px 6px;
    background: rgba(0, 0, 0, 0.7);
    color: var(--txt-1);
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Source domain below title */
  .vilify-google-grid-cell-meta {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 2px 6px 4px;
    background: rgba(0, 0, 0, 0.7);
    color: var(--txt-3);
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* When both title and meta exist, stack them */
  .vilify-google-grid-cell-title + .vilify-google-grid-cell-meta {
    bottom: 0;
  }
  .vilify-google-grid-cell-title:has(+ .vilify-google-grid-cell-meta) {
    bottom: 16px;
  }
`;

let stylesInjected = false;

/**
 * Inject CSS grid styles for Google Images layout.
 * Idempotent — only injects once.
 * [I/O - appends <style> to document.head]
 *
 * Signature: injectGoogleGridStyles : () → void
 * Purpose: Inject CSS for image grid layout (grid container, cells, selection highlight, thumbnail sizing)
 */
export function injectGoogleGridStyles() {
  if (stylesInjected) return;

  const style = document.createElement('style');
  style.textContent = GOOGLE_GRID_CSS;
  document.head.appendChild(style);
  stylesInjected = true;
}

// =============================================================================
// GRID ITEM
// =============================================================================

/**
 * Render a single grid cell with thumbnail image and title overlay.
 *
 * Signature: renderGoogleGridItem : ContentItem × Boolean → HTMLElement
 * Purpose: Create a grid cell element showing the image thumbnail with a title
 *          overlay at the bottom; highlight with accent border when selected.
 *
 * @param {Object} item - ContentItem with thumbnail, title, meta fields
 * @param {boolean} isSelected - Whether this item is currently selected
 * @returns {HTMLElement} Grid cell element
 */
export function renderGoogleGridItem(item, isSelected) {
  const classes = isSelected ? 'vilify-google-grid-cell selected' : 'vilify-google-grid-cell';
  const children = [];

  // Thumbnail image (styled by .vilify-google-grid-cell img selector)
  const img = el('img', { src: item.thumbnail, alt: item.title || '' });
  children.push(img);

  // Title overlay at bottom of cell
  const title = el('div', { class: 'vilify-google-grid-cell-title' }, [item.title || '']);
  children.push(title);

  // Source domain (only if present)
  if (item.meta) {
    const meta = el('div', { class: 'vilify-google-grid-cell-meta' }, [item.meta]);
    children.push(meta);
  }

  return el('div', { class: classes }, children);
}

// =============================================================================
// GRID RENDERER
// =============================================================================

/**
 * Custom render function for the Google Images page.
 * Clears container, creates a CSS grid of image thumbnails, highlights
 * the selected item, and scrolls it into view.
 *
 * Signature: renderGoogleImageGrid : AppState × GoogleState × HTMLElement → void
 * Purpose: Render image results as a CSS grid with selection highlighting
 *          and scroll-into-view for the selected cell.
 *
 * Template: Compound (state fields) + Collection (iterate items)
 *   - Read items from state.page.videos
 *   - Apply filter if state.ui.filterActive
 *   - For each item: call renderGoogleGridItem(item, isSelected)
 *   - Append grid to container, scroll selected into view
 *
 * @param {Object} state - AppState
 * @param {Object} siteState - GoogleState (unused for now)
 * @param {HTMLElement} container - DOM container to render into
 */
export function renderGoogleImageGrid(state, siteState, container) {
  // Inject Google grid-specific styles
  injectGoogleGridStyles();

  const allItems = getPageItems(state);
  const items = getVisibleItems(state, allItems);

  const { sort, selectedIdx } = state.ui;

  // Update sort indicator and count in status bar
  updateSortIndicator(getSortLabel(sort.field, sort.direction));
  updateItemCount(items.length);

  // Clear existing content
  clear(container);

  // Empty state
  if (!items || items.length === 0) {
    const empty = el('div', { class: 'vilify-empty' }, ['No images found']);
    container.appendChild(empty);
    return;
  }

  // Build grid container
  const grid = el('div', { class: 'vilify-google-grid' });

  items.forEach((item, index) => {
    const isSelected = index === selectedIdx;
    const cellEl = renderGoogleGridItem(item, isSelected);
    cellEl.setAttribute('data-index', String(index));
    grid.appendChild(cellEl);
  });

  container.appendChild(grid);

  // Scroll selected item into view
  const selectedEl = container.querySelector('.vilify-google-grid-cell.selected');
  if (selectedEl && selectedEl.scrollIntoView) {
    selectedEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
}
