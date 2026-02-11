## Wish List

### Layer 1 (implement first)
- `fetchGoogleSuggestions(query: string, signal: AbortSignal): Promise<string[]>` in `src/sites/google/suggest.js`
  Purpose: Fetch autocomplete suggestions from Google's suggest API at `/complete/search?client=firefox&q=<encoded-query>`. Parse the JSON response `[query, [suggestions...]]` and return the suggestions array. Return empty array for empty query, network errors, non-ok responses, or aborted requests. Pass the AbortSignal to fetch for cancellation support.

### Layer 0 (implement last)
- `createSuggestDrawer(config: { searchUrl: (q) => string, placeholder: string, initialQuery: string }): DrawerHandler` in `src/sites/google/suggest.js`
  Purpose: Create a DrawerHandler for Google autocomplete suggestions. Maintains closure state: query, suggestions[], selectedIdx (-1 initially), userNavigated (boolean), debounceTimer, abortController. `render(container)` creates drawer DOM using `injectDrawerStyles()` CSS classes (vilify-drawer, vilify-drawer-list, vilify-drawer-item). `updateQuery(q)` stores query, resets userNavigated to false, debounce-fetches suggestions via `fetchGoogleSuggestions` (~200ms), re-renders the suggestion list. `getFilterPlaceholder()` returns config.placeholder. `onKey(key, state)`: ArrowDown/Up navigate selectedIdx within suggestions (clamped), set userNavigated=true, re-render; Enter navigates to `config.searchUrl(suggestions[selectedIdx])` if userNavigated && selectedIdx >= 0, else `config.searchUrl(query)` for typed query, closes drawer; Escape closes drawer. `cleanup()` aborts pending fetch, clears debounce timer, removes DOM.

## Data Definitions Created/Modified
- `src/sites/google/suggest.js` (NEW): Created with data definitions for SuggestDrawerConfig, SuggestState (closure), and two function stubs (`fetchGoogleSuggestions`, `createSuggestDrawer`)
- `src/sites/google/index.js`: Added import of `createSuggestDrawer`; changed `getDrawerHandler` from `() => null` to return suggest drawer handler when `drawerState === 'suggest'`
- `src/core/keyboard.js`: Modified `openSearch` callback to check `config.getDrawerHandler?.('suggest', siteState)` — if truthy, opens `drawer: 'suggest'` instead of `searchActive: true`
- `src/core/layout.js`: Modified `updateStatusBar` isSiteDrawer path to set `input.value` to `searchQuery` when `drawer === 'suggest'`, preserving the typed query in the status bar input

## Test Files Created
- `src/sites/google/suggest.test.js` (NEW): 14 tests covering `fetchGoogleSuggestions` (6 tests: fetch URL encoding, success parsing, error handling, empty query, abort) and `createSuggestDrawer` (8 tests: interface shape, getFilterPlaceholder, render, onKey Escape/ArrowDown/ArrowUp/Enter, cleanup)

## Assertion Changes Flagged
None

## Notes
- The suggest drawer is intentionally NOT using `createListDrawer` from `drawer.js` — it needs async item fetching with debounce, userNavigated tracking for different Enter behavior (typed query vs selected suggestion), and AbortController management. It reuses `injectDrawerStyles()` for CSS and `el`/`clear`/`updateListSelection` from `view.js`.
- `getDrawerHandler('suggest', siteState)` in `index.js` creates a new handler each call. This matches the existing pattern (YouTube's chapter/transcript drawers work the same way). The drawer system in `core/index.js` already handles this correctly — `handleDrawerChange`, `handleDrawerSubmit`, `handleDrawerNavigate` all call `getDrawerHandler` per-invocation.
- The `getMode` function in `state.js` already handles `drawer: 'suggest'` correctly — it returns `'SUGGEST'` via `drawer.toUpperCase()`, which falls through to the `isSiteDrawer` path in `updateStatusBar` and the drawer key handling in `keyboard.js`.
- The keyboard.js change uses `getSiteState` (the 5th parameter of `setupKeyboardHandler`) to get the site state for the `getDrawerHandler` check. This parameter is already passed by `core/index.js` when setting up the keyboard handler.
- Version bumped from 0.5.98 to 0.5.99 in both `package.json` and `manifest.json`.
