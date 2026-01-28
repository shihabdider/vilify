/**
 * Core Layout
 * 
 * Focus mode overlay and content rendering.
 */

import { el, clear, updateListSelection } from './dom.js';
import { renderStatusBar } from './status-bar.js';
import { getMode } from './state.js';

/**
 * [I/O] Render the full focus mode overlay (content area + command line + status bar).
 *
 * Examples:
 *   renderFocusMode(youtubeConfig, state)
 *   // Creates overlay with site's theme, ready for content
 */
export function renderFocusMode(siteConfig, state) {
  // Remove existing overlay if any
  const existing = document.querySelector('.vilify-overlay');
  if (existing) {
    existing.remove();
  }
  
  // Create overlay structure
  const overlay = el('div', { class: 'vilify-overlay' }, [
    // Content area
    el('div', { class: 'vilify-content' }, []),
    // Command line
    el('div', { class: 'vilify-command-line' }, [
      el('input', { 
        class: 'vilify-command-input',
        type: 'text',
        placeholder: 'Type : for commands, / to filter...',
      }, []),
    ]),
    // Status bar will be added by renderStatusBar
  ]);
  
  document.body.appendChild(overlay);
  
  // Apply theme
  applyTheme(siteConfig.theme);
  
  // Render status bar
  const mode = getMode(state);
  renderStatusBar(mode, '', siteConfig);
  
  // Show/hide based on state
  if (state.focusModeActive) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

/**
 * [I/O] Show or hide the focus mode overlay.
 */
export function toggleFocusMode(show) {
  const overlay = document.querySelector('.vilify-overlay');
  if (!overlay) return;
  
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

/**
 * [I/O] Render a list of items with selection state.
 * Uses default rendering or custom RenderItem function.
 *
 * Examples:
 *   renderListing(videos, 0)                    // Default rendering, first selected
 *   renderListing(comments, 2, renderComment)   // Custom renderer, third selected
 */
export function renderListing(items, selectedIdx, renderItem = null) {
  const content = document.querySelector('.vilify-content');
  if (!content) return;
  
  clear(content);
  
  const renderer = renderItem || defaultRenderItem;
  
  items.forEach((item, idx) => {
    const isSelected = idx === selectedIdx;
    const itemEl = renderer(item, isSelected);
    content.appendChild(itemEl);
  });
  
  // Scroll selected into view
  updateListSelection(content, '.vilify-item', selectedIdx);
}

/**
 * [I/O] Apply CSS custom properties from theme to focus mode container.
 *
 * Examples:
 *   applyTheme({ accent: '#ff0000', bg1: '#002b36', ... })
 *   // Sets --accent, --bg-1, etc.
 */
export function applyTheme(theme) {
  const overlay = document.querySelector('.vilify-overlay');
  if (!overlay) return;
  
  // Map theme properties to CSS custom properties
  const cssProps = {
    '--bg-1': theme.bg1,
    '--bg-2': theme.bg2,
    '--bg-3': theme.bg3,
    '--txt-1': theme.txt1,
    '--txt-2': theme.txt2,
    '--txt-3': theme.txt3,
    '--txt-4': theme.txt4,
    '--accent': theme.accent,
    '--accent-hover': theme.accentHover,
  };
  
  for (const [prop, value] of Object.entries(cssProps)) {
    if (value) {
      overlay.style.setProperty(prop, value);
    }
  }
}

/**
 * [PURE] Default item renderer for ContentItem.
 * 
 * Examples:
 *   defaultRenderItem({ title: 'Video', meta: 'Channel', thumbnail: '...' }, false)
 *     => <div class="vilify-item">...</div>
 */
export function defaultRenderItem(item, isSelected) {
  const classes = ['vilify-item'];
  if (isSelected) classes.push('selected');
  
  const children = [];
  
  // Thumbnail
  if (item.thumbnail) {
    children.push(el('img', { 
      class: 'vilify-item-thumbnail',
      src: item.thumbnail,
      alt: '',
    }, []));
  }
  
  // Content wrapper
  const contentChildren = [];
  
  // Title
  contentChildren.push(el('div', { class: 'vilify-item-title' }, [item.title || '']));
  
  // Meta
  if (item.meta) {
    contentChildren.push(el('div', { class: 'vilify-item-meta' }, [item.meta]));
  }
  
  // Subtitle
  if (item.subtitle) {
    contentChildren.push(el('div', { class: 'vilify-item-subtitle' }, [item.subtitle]));
  }
  
  children.push(el('div', { class: 'vilify-item-content' }, contentChildren));
  
  return el('div', { class: classes.join(' ') }, children);
}

/**
 * [I/O] Get the content container.
 */
export function getContentContainer() {
  return document.querySelector('.vilify-content');
}
