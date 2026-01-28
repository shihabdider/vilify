/**
 * Core Palette
 * 
 * Command palette state and rendering.
 */

import { el, clear, updateListSelection } from './dom.js';

/**
 * [PURE] Open command palette in specified mode.
 *
 * Examples:
 *   openPalette(state, 'command')
 *     => { ...state, modalState: 'palette', paletteQuery: '', paletteSelectedIdx: 0 }
 */
export function openPalette(state, mode) {
  return {
    ...state,
    modalState: 'palette',
    paletteQuery: '',
    paletteSelectedIdx: 0,
  };
}

/**
 * [PURE] Close palette.
 *
 * Examples:
 *   closePalette(state)
 *     => { ...state, modalState: null, paletteQuery: '' }
 */
export function closePalette(state) {
  return {
    ...state,
    modalState: null,
    paletteQuery: '',
  };
}

/**
 * [I/O] Render palette dropdown with items and selection.
 *
 * Examples:
 *   renderPalette([{label: 'Copy URL', keys: 'yy'}, ...], 0)
 */
export function renderPalette(items, selectedIdx) {
  let palette = document.querySelector('.vilify-palette');
  
  // Create palette if it doesn't exist
  if (!palette) {
    palette = el('div', { class: 'vilify-palette' }, []);
    const commandLine = document.querySelector('.vilify-command-line');
    if (commandLine) {
      commandLine.appendChild(palette);
    }
  }
  
  clear(palette);
  
  let currentGroup = null;
  
  items.forEach((item, idx) => {
    // Handle group headers
    if (item.group) {
      const header = el('div', { class: 'vilify-group-header' }, [item.group]);
      palette.appendChild(header);
      currentGroup = item.group;
      return;
    }
    
    const isSelected = idx === selectedIdx;
    const itemEl = renderPaletteItem(item, isSelected);
    palette.appendChild(itemEl);
  });
  
  // Scroll selected into view
  updateListSelection(palette, '.vilify-palette-item', selectedIdx);
}

/**
 * [PURE] Render a single palette item.
 */
function renderPaletteItem(item, isSelected) {
  const classes = ['vilify-palette-item'];
  if (isSelected) classes.push('selected');
  
  const children = [];
  
  // Icon
  if (item.icon) {
    children.push(el('span', { class: 'vilify-palette-icon' }, [item.icon]));
  }
  
  // Label (for Command) or Title (for ContentItem)
  const label = item.label || item.title || '';
  children.push(el('span', { class: 'vilify-palette-label' }, [label]));
  
  // Keys/shortcut hint
  if (item.keys) {
    children.push(el('span', { class: 'vilify-palette-keys' }, [item.keys]));
  }
  
  // Meta info
  if (item.meta) {
    children.push(el('span', { class: 'vilify-palette-meta' }, [item.meta]));
  }
  
  return el('div', { class: classes.join(' ') }, children);
}

/**
 * [I/O] Hide the palette.
 */
export function hidePalette() {
  const palette = document.querySelector('.vilify-palette');
  if (palette) {
    palette.remove();
  }
}

/**
 * [PURE] Filter items by query (fuzzy or substring match).
 *
 * Examples:
 *   filterItems([{label: 'Copy URL'}, {label: 'Go Home'}], 'copy')
 *     => [{label: 'Copy URL'}]
 *
 *   filterItems(items, '')  => items  // Empty returns all
 */
export function filterItems(items, query) {
  if (!query) return items;
  
  const lowerQuery = query.toLowerCase();
  
  return items.filter(item => {
    // Skip group headers
    if (item.group) return true;
    
    const label = (item.label || item.title || '').toLowerCase();
    return label.includes(lowerQuery);
  });
}
