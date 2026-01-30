# Iteration 008: Filter Keybindings

## Goal

Fix arrow keys and Enter not working in filter mode on listing pages.

## Problem

When user activates filter mode (`/`) on a listing page (home, subscriptions, history, search results):
- Typing works (filters the list)
- But arrow keys move cursor in input instead of navigating filtered list
- And Enter does nothing instead of selecting the highlighted video

Root cause: The keyboard handler either:
1. Doesn't intercept arrow/Enter from the filter input, OR
2. Explicitly skips navigation when `localFilterActive` is true

## Behaviors

| ID | Behavior | Test Method | Depends On | Est. Tokens |
|----|----------|-------------|------------|-------------|
| B1 | Arrow Down navigates filtered list | On home, press `/`, type filter, press Down, selection moves to next video | - | 3K |
| B2 | Arrow Up navigates filtered list | On home, press `/`, type filter, press Up, selection moves to previous video | B1 | 2K |
| B3 | Enter selects from filtered list | On home, press `/`, type filter, press Enter, navigates to selected video | B1 | 2K |
| B4 | Shift+Enter opens in new tab | On home, press `/`, type filter, press Shift+Enter, opens video in new tab | B3 | 1K |
| B5 | j/k still type in input | On home, press `/`, type "jk", letters appear in input (not navigation) | - | 1K |
| B6 | Escape exits filter mode | On home, press `/`, press Escape, filter closes, full list returns | - | 1K |

## Dependency Graph

```
B1 ──┬── B2
     └── B3 ──── B4

B5 (independent)
B6 (independent)
```

## Analysis

Looking at `src/core/keyboard.js`:

```js
// Line 47-67: Input element handling
if (isInputElement(target)) {
  const isChapterFilter = target.id === 'vilify-chapter-filter-input';
  // ... special handling for chapter filter
  // BUT: no handling for status bar filter input!
}

// Line 95-113: Navigation handling
if (isListingPage && !state.localFilterActive && !state.siteSearchActive) {
  // This SKIPS navigation when filtering!
}
```

**Fix approach:**
1. Add the status bar filter input to the passthrough list (like chapter filter)
2. Let ArrowUp, ArrowDown, Enter, Escape pass through to handlers
3. Remove the `!state.localFilterActive` condition for arrow/Enter handling

## Notes

- j/k should NOT navigate when filtering (user might type those letters)
- Only arrow keys and Enter should be intercepted
- This is similar to how chapter filter already works

## References

- `src/core/keyboard.js` - main file to modify
- `src/core/layout.js` - filter input element (need to check its ID)
