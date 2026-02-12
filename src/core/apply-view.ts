// Apply View - I/O functions for applying ViewTree to DOM
// Following HTDP design: all DOM manipulation isolated here
// See .design/DATA.md for ViewTree type definitions

import { el, clear } from './view';
import { renderListing, renderDefaultItem, updateSortIndicator, updateItemCount } from './layout';
import { renderPalette, showPalette, hidePalette } from './palette';
import { renderDrawer, closeDrawer } from './drawer';
import { statusBarViewEqual, contentViewChanged, drawerViewChanged } from './view-tree';

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {ViewTree|null} Previous view for diffing */
let previousView = null;

/** @type {string|null} Last rendered drawer type (for tracking) */
let lastRenderedDrawerType = null;

// =============================================================================
// STATUS BAR
// =============================================================================

/**
 * Apply status bar view to DOM.
 * [I/O]
 *
 * @param {StatusBarView} view - Status bar view data
 * @param {StatusBarView|null} prev - Previous status bar view (for diffing)
 */
export function applyStatusBar(view, prev = null) {
  // Skip if unchanged
  if (prev && statusBarViewEqual(view, prev)) {
    return;
  }
  
  // Update mode badge
  const badge = document.querySelector('.vilify-mode-badge');
  if (badge && (!prev || prev.mode !== view.mode)) {
    badge.textContent = view.mode;
  }
  
  // Update input
  const input = document.getElementById('vilify-status-input');
  if (input) {
    // Visibility
    if (!prev || prev.inputVisible !== view.inputVisible) {
      if (view.inputVisible) {
        input.classList.add('visible');
      } else {
        input.classList.remove('visible');
        input.blur();
      }
    }
    
    // Placeholder
    if (!prev || prev.inputPlaceholder !== view.inputPlaceholder) {
      input.placeholder = view.inputPlaceholder;
    }
    
    // Value - only update if different (avoid cursor jump)
    if (input.value !== view.inputValue) {
      input.value = view.inputValue;
    }
    
    // Focus
    if (view.inputFocus && view.inputVisible) {
      input.focus();
    }
  }
  
  // Update sort indicator
  if (!prev || prev.sortLabel !== view.sortLabel) {
    updateSortIndicator(view.sortLabel);
  }
  
  // Update item count
  if (!prev || prev.itemCount !== view.itemCount) {
    updateItemCount(view.itemCount || 0);
  }
  
  // Update hints
  const hints = document.getElementById('vilify-status-hints');
  if (hints && (!prev || prev.hints !== view.hints)) {
    if (view.hints) {
      // Convert plain text hints to HTML with kbd tags
      hints.innerHTML = view.hints
        .replace(/↑↓/g, '<kbd>↑↓</kbd>')
        .replace(/↵/g, '<kbd>↵</kbd>')
        .replace(/esc/g, '<kbd>esc</kbd>')
        .replace(/\bj\b/g, '<kbd>j</kbd>')
        .replace(/\bk\b/g, '<kbd>k</kbd>');
    } else {
      hints.innerHTML = '';
    }
  }
}

// =============================================================================
// CONTENT
// =============================================================================

/**
 * Apply content view to DOM.
 * [I/O]
 *
 * @param {ContentView} view - Content view data
 * @param {ContentView|null} prev - Previous content view (for diffing)
 * @param {Object} context - Additional context { state, siteState, container }
 */
export function applyContent(view, prev = null, context = {}) {
  const { state, siteState, container } = context;
  const targetContainer = container || document.getElementById('vilify-content');
  
  if (!targetContainer) return;
  
  // Check if we need to re-render
  if (prev && !contentViewChanged(view, prev)) {
    // Just update selection if only selectedIdx changed
    if (view.selectedIdx !== prev.selectedIdx) {
      updateSelection(targetContainer, view.selectedIdx);
    }
    return;
  }
  
  switch (view.type) {
    case 'listing':
      renderListing(view.items, view.selectedIdx, targetContainer);
      break;
      
    case 'custom':
      if (view.render) {
        view.render(state, siteState, targetContainer);
      }
      break;
      
    case 'empty':
      clear(targetContainer);
      const empty = el('div', { class: 'vilify-empty' }, ['No items found']);
      targetContainer.appendChild(empty);
      break;
  }
}

/**
 * Update selection in listing without full re-render.
 * [I/O]
 *
 * @param {HTMLElement} container - Content container
 * @param {number} selectedIdx - New selected index
 */
function updateSelection(container, selectedIdx) {
  // Remove previous selection
  const prevSelected = container.querySelector('.vilify-item.selected');
  if (prevSelected) {
    prevSelected.classList.remove('selected');
  }
  
  // Add new selection
  const items = container.querySelectorAll('.vilify-item');
  if (items[selectedIdx]) {
    items[selectedIdx].classList.add('selected');
    items[selectedIdx].scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
}

// =============================================================================
// DRAWER
// =============================================================================

/**
 * Apply drawer view to DOM.
 * [I/O]
 *
 * @param {DrawerView|null} view - Drawer view data
 * @param {DrawerView|null} prev - Previous drawer view (for diffing)
 */
export function applyDrawer(view, prev = null) {
  // Handle closing drawer
  if (!view) {
    if (prev) {
      if (prev.type === 'palette') {
        hidePalette();
      } else {
        closeDrawer();
      }
      lastRenderedDrawerType = null;
    }
    return;
  }
  
  // Check if drawer type changed
  const typeChanged = !prev || prev.type !== view.type;
  
  if (view.type === 'palette') {
    // Close any site drawer if we're switching to palette
    if (typeChanged && lastRenderedDrawerType && lastRenderedDrawerType !== 'palette') {
      closeDrawer();
    }
    
    renderPalette(view.items, view.selectedIdx);
    showPalette();
    lastRenderedDrawerType = 'palette';
  } else {
    // Site-specific drawer
    // Close palette if switching from it
    if (typeChanged && lastRenderedDrawerType === 'palette') {
      hidePalette();
    }
    
    // Only render if drawer type changed (avoid resetting scroll/selection)
    if (typeChanged && view.handler) {
      renderDrawer(view.type, view.handler);
      lastRenderedDrawerType = view.type;
    }
  }
}

// =============================================================================
// MAIN APPLY FUNCTION
// =============================================================================

/**
 * Apply complete view tree to DOM.
 * [I/O] - All DOM manipulation happens here.
 *
 * @param {ViewTree} view - View tree to apply
 * @param {Object} context - Additional context { state, siteState }
 */
export function applyView(view, context = {}) {
  const prev = previousView;
  
  // Apply each component
  applyStatusBar(view.statusBar, prev?.statusBar);
  applyContent(view.content, prev?.content, context);
  applyDrawer(view.drawer, prev?.drawer);
  
  // Store for next diff
  previousView = view;
}

/**
 * Reset previous view (call on navigation or major state changes).
 * [I/O]
 */
export function resetViewState() {
  previousView = null;
  lastRenderedDrawerType = null;
}

/**
 * Get the last rendered drawer type.
 * [PURE - accessor]
 *
 * @returns {string|null}
 */
export function getLastRenderedDrawerType() {
  return lastRenderedDrawerType;
}
