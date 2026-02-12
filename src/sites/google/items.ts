// Google item rendering - custom renderer for search results
// No thumbnails, shows description text

import { el } from '../../core/view';

// CSS for Google-specific item styles
const GOOGLE_ITEM_CSS = `
  /* Google search result item - favicon + text */
  .vilify-google-item {
    display: flex;
    flex-direction: row;
    padding: 12px 24px;
    cursor: pointer;
    border-left: 2px solid transparent;
    gap: 4px;
    align-items: flex-start;
  }

  .vilify-google-item:hover {
    background: var(--bg-2);
  }

  .vilify-google-item.selected {
    background: var(--bg-2);
    border-left-color: var(--accent);
  }

  .vilify-google-item-favicon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    margin-right: 10px;
    margin-top: 2px;
    border-radius: 2px;
  }

  .vilify-google-item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
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
  const topChildren = [];

  // Favicon - only for valid http(s) URLs
  const faviconUrl = getFaviconUrl(item.url);
  if (faviconUrl) {
    const favicon = el('img', {
      src: faviconUrl,
      width: '20',
      height: '20',
      class: 'vilify-google-item-favicon',
    });
    favicon.onerror = function () { this.style.display = 'none'; };
    topChildren.push(favicon);
  }

  // Info div wrapping title, url, description
  const infoChildren = [];

  // Title
  const title = el('div', { class: 'vilify-google-item-title' }, [item.title || '']);
  infoChildren.push(title);

  // URL (meta field contains display URL)
  if (item.meta) {
    const url = el('div', { class: 'vilify-google-item-url' }, [item.meta]);
    infoChildren.push(url);
  }

  // Description (snippet text)
  if (item.description) {
    const desc = el('div', { class: 'vilify-google-item-description' }, [item.description]);
    infoChildren.push(desc);
  }

  const infoDiv = el('div', { class: 'vilify-google-item-info' }, infoChildren);
  topChildren.push(infoDiv);

  return el('div', { class: classes }, topChildren);
}

/**
 * Derive a Google favicon service URL from an item URL.
 * Returns null if the URL is falsy or not a valid http(s) URL.
 *
 * Signature: getFaviconUrl : String|undefined → String|null
 * Purpose: Extract hostname from URL and build favicon service URL
 *
 * @param {string|undefined} url - The item URL
 * @returns {string|null} Favicon URL or null
 */
function getFaviconUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;
  } catch {
    return null;
  }
}
