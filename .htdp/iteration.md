# Iteration

anchor: c757f7476a3cbc62f146d6b1d7d5558f96dddee7
started: 2026-02-10T04:33:00-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Add autocomplete suggestions to Google search mode by reusing the drawer system. When user presses 'i' on Google, instead of plain search mode, a suggest drawer opens showing Google autocomplete suggestions fetched from `/complete/search?client=firefox&q=...` (same-origin). Arrow keys navigate suggestions, Enter navigates to search URL, Escape closes.

## Data Definition Plan

1. New file `src/sites/google/suggest.js` — custom drawer handler with: fetchGoogleSuggestions(query, signal), createSuggestDrawer({ searchUrl, placeholder }). Internal state: query, suggestions[], selectedIdx, userNavigated, debounceTimer, abortController.

2. Modify `src/sites/google/index.js` — getDrawerHandler('suggest') returns suggest drawer.

3. Modify `src/core/keyboard.js` — openSearch checks for 'suggest' drawer support → opens drawer instead of searchActive.

4. Modify `src/core/layout.js` — updateStatusBar isSiteDrawer path uses searchQuery for initial input value when drawer is 'suggest'.

5. Tests for suggest.js.
