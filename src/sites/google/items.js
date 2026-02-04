// Google item rendering - custom renderer for search results
// No thumbnails, shows description text

import { el } from '../../core/view.js';

// CSS for Google-specific item styles
const GOOGLE_ITEM_CSS = `
  /* Google search result item - no thumbnail */
  .vilify-google-item {
    display: flex;
    flex-direction: column;
    padding: 12px 24px;
    cursor: pointer;
    border-left: 2px solid transparent;
    gap: 4px;
  }

  .vilify-google-item:hover {
    background: var(--bg-2);
  }

  .vilify-google-item.selected {
    background: var(--bg-2);
    border-left-color: var(--accent);
  }

  .vilify-google-item-title {
    color: var(--txt-4);
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .vilify-google-item.selected .vilify-google-item-title {
    color: var(--txt-1);
  }

  .vilify-google-item-url {
    color: var(--txt-3);
    font-size: 12px;
  }

  .vilify-google-item-description {
    color: var(--txt-2);
    font-size: 13px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

let stylesInjected = false;

/**
 * Inject Google item styles into document.
 * [I/O]
 */
export function injectGoogleItemStyles() {
  if (stylesInjected) return;
  
  const style = document.createElement('style');
  style.textContent = GOOGLE_ITEM_CSS;
  document.head.appendChild(style);
  stylesInjected = true;
}

/**
 * Render a Google search result item.
 * No thumbnail - shows title, URL, and description.
 * 
 * Signature: renderGoogleItem : ContentItem × Boolean → HTMLElement
 * Purpose: Render a search result with title, URL, and description (no thumbnail)
 * 
 * @param {Object} item - Search result item
 * @param {boolean} isSelected - Whether this item is selected
 * @returns {HTMLElement} Rendered item element
 */
export function renderGoogleItem(item, isSelected) {
  const classes = isSelected ? 'vilify-google-item selected' : 'vilify-google-item';
  const children = [];

  // Title
  const title = el('div', { class: 'vilify-google-item-title' }, [item.title || '']);
  children.push(title);

  // URL (meta field contains display URL)
  if (item.meta) {
    const url = el('div', { class: 'vilify-google-item-url' }, [item.meta]);
    children.push(url);
  }

  // Description (snippet text)
  if (item.description) {
    const desc = el('div', { class: 'vilify-google-item-description' }, [item.description]);
    children.push(desc);
  }

  return el('div', { class: classes }, children);
}
