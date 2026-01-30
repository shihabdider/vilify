# Blueprint - Iteration 008: Filter Keybindings

## Overview

Modify `src/core/keyboard.js` to handle arrow keys and Enter in the status bar filter input.

## Changes Required

### 1. Add Status Bar Filter to Input Passthrough

**Location**: `setupKeyboardHandler()`, lines ~109-130

**Current code**:
```js
if (isInputElement(target)) {
  const isChapterFilter = target.id === 'vilify-chapter-filter-input';
  // ...
  if (isChapterFilter) {
    if (event.key === 'Escape' || event.key === 'Enter' || 
        event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      // Don't return - let these fall through
    } else {
      return;  // letters stay in input
    }
  } else {
    return;  // All other inputs - don't intercept
  }
}
```

**New code**:
```js
if (isInputElement(target)) {
  const isChapterFilter = target.id === 'vilify-chapter-filter-input';
  const isStatusBarFilter = target.id === 'vilify-status-input' && state.localFilterActive;
  const isYouTubeSearch = target.id === 'search' || 
                          target.closest?.('ytd-searchbox') || 
                          target.closest?.('#search-form');
  
  // For filter inputs: arrows/Enter/Escape navigate, letters stay in input
  if (isChapterFilter || isStatusBarFilter) {
    if (event.key === 'Escape' || event.key === 'Enter' || 
        event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      // Don't return - let these fall through to handlers below
    } else {
      return;  // j/k and other keys stay in input for typing
    }
  } else if (event.key === 'Escape' && isYouTubeSearch) {
    // ...existing YouTube search handling
  } else {
    return;  // All other inputs - don't intercept
  }
}
```

---

### 2. Handle Arrow/Enter When Filter Active

**Location**: `setupKeyboardHandler()`, lines ~241-268

**Current code**:
```js
// Handle j/k for list navigation on listing pages
if (isListingPage && !state.localFilterActive && !state.siteSearchActive) {
  if (event.key === 'j' || event.key === 'ArrowDown') { ... }
  if (event.key === 'k' || event.key === 'ArrowUp') { ... }
  if (event.key === 'Enter') { ... }
}
```

**New code**:
```js
// Handle list navigation on listing pages
// - j/k only when NOT filtering (user might type those letters)
// - Arrow keys work even when filtering
// - Enter works even when filtering
if (isListingPage) {
  // Arrow keys always navigate (even in filter mode)
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (callbacks.onNavigate) {
      callbacks.onNavigate('down');
    }
    return;
  }
  
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (callbacks.onNavigate) {
      callbacks.onNavigate('up');
    }
    return;
  }
  
  // Enter always selects (even in filter mode)
  if (event.key === 'Enter') {
    event.preventDefault();
    if (callbacks.onSelect) {
      callbacks.onSelect(event.shiftKey);
    }
    return;
  }
  
  // j/k only navigate when NOT filtering (user might type those letters)
  if (!state.localFilterActive && !state.siteSearchActive) {
    if (event.key === 'j') {
      event.preventDefault();
      if (callbacks.onNavigate) {
        callbacks.onNavigate('down');
      }
      return;
    }
    
    if (event.key === 'k') {
      event.preventDefault();
      if (callbacks.onNavigate) {
        callbacks.onNavigate('up');
      }
      return;
    }
  }
}
```

---

## Behavior Mapping

| Behavior | Code Change |
|----------|-------------|
| B1: Arrow Down navigates | Change 1 (passthrough) + Change 2 (handle ArrowDown) |
| B2: Arrow Up navigates | Change 1 (passthrough) + Change 2 (handle ArrowUp) |
| B3: Enter selects | Change 1 (passthrough) + Change 2 (handle Enter) |
| B4: Shift+Enter new tab | Already handled by `callbacks.onSelect(event.shiftKey)` |
| B5: j/k type in input | Change 1 ensures they don't pass through |
| B6: Escape exits | Already works (existing Escape handler) |

---

## Summary

| Function | Behavior | Where | Type |
|----------|----------|-------|------|
| setupKeyboardHandler (input check) | B1, B2, B3, B5 | Core | I/O |
| setupKeyboardHandler (navigation) | B1, B2, B3, B4 | Core | I/O |

## Files to Modify

- `src/core/keyboard.js` - Two sections within `setupKeyboardHandler()`

## No New Functions

This is a modification to existing code, not new functions. The changes are:
1. Add `isStatusBarFilter` check to input passthrough logic
2. Restructure navigation handling to separate arrow keys from j/k
