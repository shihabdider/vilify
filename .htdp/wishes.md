## Wish List

### Layer 3 (implement first — pure leaf functions)
- `normalizeKey(event: KeyboardEvent): string|null` in `src/core/keyboard.js`
  Purpose: Convert a keyboard event into a normalized key string for sequence matching. Modifier-only keys (Shift, Control, Alt, Meta) return null. Ctrl+key produces 'C-' prefix (e.g., 'C-f'). Regular keys return event.key as-is — Shift naturally produces uppercase ('G' for Shift+G), no toLowerCase.

- `handleKeyEvent(key: string, keySeq: string, sequences: Object, timeout: number): { action, pendingAction, newSeq, shouldPrevent }` in `src/core/keyboard.js`
  Purpose: Process a pre-normalized key string against registered sequences. Appends key to keySeq, checks for exact/prefix matches. Returns action for unambiguous match, pendingAction for ambiguous (exact + longer prefix exists), or resets on no match. No internal toLowerCase — key comes pre-normalized from normalizeKey. Core matching logic is identical to the old implementation, just operating on strings instead of events.

- `getYouTubeBlockedNativeKeys(context: KeyContext): string[]` in `src/sites/youtube/commands.js`
  Purpose: Return keys to preventDefault+stopPropagation on YouTube pages even if just a prefix match. On watch page (context.pageType === 'watch'), return ['f', 'm', 'c', 't', 'j', 'k', 'l', ' ', 'h'] — all keys YouTube would handle natively. On listing pages return empty array.

- `isNativeSearchInput(target: HTMLElement): boolean` in `src/sites/youtube/index.js` (config property)
  Purpose: Return true if target is YouTube's native search input — check target.id === 'search' or target.closest('ytd-searchbox') or target.closest('#search-form'). Used by keyboard engine for Escape-to-blur behavior. Replaces hardcoded YouTube search selectors in old core.

- `isNativeSearchInput(target: HTMLElement): boolean` in `src/sites/google/index.js` (config property)
  Purpose: Return true if target is Google's native search input — check for textarea[name="q"], input[name="q"], or target inside the search form. Used by keyboard engine for Escape-to-blur behavior.

### Layer 2 (expanded site sequence functions)
- `getYouTubeKeySequences(app: Object, context: KeyContext): Object<string, Function>` in `src/sites/youtube/commands.js`
  Purpose: Return ALL key bindings for YouTube — absorbs old getSingleKeyActions and hardcoded navigation keys from the engine. Context-conditional bindings: (1) Always: '/', ':', 'i', 'gh'→home, 'gs'→subs, 'gy'→history, 'gl'→library, 'gw'→watch later, 'gg'→goToTop, 'mw'→addToWatchLater. (2) Listing pages: 'ArrowDown'→navigate down, 'ArrowUp'→navigate up, 'Enter'→select, 'G'→goToBottom, 'dd'→removeFromWatchLater. (3) Listing + !filterActive + !searchActive: 'j'→down, 'k'→up, 'h'→left, 'l'→right, 'u'→undoWatchLaterRemoval. (4) Watch page: 'C-f'→nextCommentPage, 'C-b'→prevCommentPage, ' '→togglePlayPause. (5) Watch page with video context: 'm'→toggleMute, 'c'→toggleCaptions, 'h'→seekBack, 'l'→seekForward, 'f'→chapters, 't'→transcript, 'Y'→copyUrlAtTime, 'yy'→copyUrl, 'yt'→copyTitle, 'ms'→subscribe, 'gc'→channel, 'g1'→speed1x, 'g2'→speed2x, 'zo'→openDescription, 'zc'→closeDrawer. Note: j/k/h/l on listing pages should NOT be registered when a key sequence is in progress (keySeq is non-empty) — that logic now lives in the engine's handling of prefix matches, not in which keys are registered. Register them always on listing+!filter+!search; the engine handles the multi-key overlap via handleKeyEvent.

- `getGoogleKeySequences(app: Object, context: KeyContext): Object<string, Function>` in `src/sites/google/index.js`
  Purpose: Return ALL key bindings for Google — absorbs old getSingleKeyActions. Includes existing sequences ('/', 'i', ':', 'gg', 'go', 'gi', 'yy') plus: 'C-f'→nextPage, 'C-b'→prevPage, 'G'→goToBottom (were in getSingleKeyActions as 'F', 'B', 'G'). On listing pages: 'ArrowDown'→navigate down, 'ArrowUp'→navigate up, 'Enter'→select. On listing + !filterActive + !searchActive: 'j'→down, 'k'→up.

### Layer 1 (config wiring + appCallbacks construction)
- `appCallbacks` construction in `src/core/index.js` createApp()
  Purpose: Build the full appCallbacks object that was previously constructed inside keyboard.js's setupKeyboardHandler. Move the updateUI helper and all callback implementations (openPalette, openRecommended, openLocalFilter, openSearch, openDrawer, closeDrawer, goToTop, goToBottom, openTranscriptDrawer, dismissVideo, addToWatchLater, removeFromWatchLater, exitFocusMode, updateSubscribeButton, getSelectedItem, undoWatchLaterRemoval, render, navigate, select, nextCommentPage, prevCommentPage) from the old keyboard.js handler into core/index.js. Needs access to getState/setState/config/getSiteState/render/handleListNavigation/handleSelect etc. — all available in createApp scope.

- Update `youtubeConfig` in `src/sites/youtube/index.js`
  Purpose: Remove deprecated getSingleKeyActions property. getBlockedNativeKeys and isNativeSearchInput already stubbed. Verify getKeySequences passes (app, context) through correctly.

- Update `googleConfig` in `src/sites/google/index.js`
  Purpose: Remove deprecated getSingleKeyActions property. getBlockedNativeKeys (returns []) and isNativeSearchInput already stubbed. Verify getKeySequences passes (app, context) through correctly.

### Layer 0 (implement last — the engine)
- `setupKeyboardEngine(config, getState, setState, appCallbacks, getSiteState): Function` in `src/core/keyboard.js`
  Purpose: Capture-phase keydown listener. Core sequence engine that: (1) Filters Vilify's own input elements (drawer filter, status bar, site drawer inputs — same as old code). (2) Calls config.isNativeSearchInput(target) for Escape-to-blur on site search inputs. (3) Skips if focusModeActive is false. (4) Handles Escape via generic modal stack: drawer→filter→search (same as old code). (5) Delegates drawer keys when drawer is open (same as old code). (6) Skips when palette is open (same as old code). (7) Calls normalizeKey(event) — returns null for modifiers. (8) Builds KeyContext { pageType, filterActive, searchActive, drawer } from state. (9) Calls config.getKeySequences(appCallbacks, context) to get ALL sequences. (10) Calls config.getBlockedNativeKeys(context) — for any matched key in this list, always preventDefault+stopPropagation even if just a prefix match. (11) Calls handleKeyEvent(key, keySeq, sequences, timeout) for sequence matching. (12) For ALL matched sequences (exact or prefix): preventDefault+stopPropagation. (13) Handles ambiguous match timeout (same as old code). (14) Auto-focuses status bar input after modal openers trigger. Returns cleanup function.

## Data Definitions Created/Modified
- `src/core/keyboard.js`: Added `KeyContext` typedef: `{ pageType: string|null, filterActive: boolean, searchActive: boolean, drawer: string|null }`
- `src/core/keyboard.js`: Added `normalizeKey(event)` — new pure function
- `src/core/keyboard.js`: Modified `handleKeyEvent` signature — first param changed from `event: KeyboardEvent` to `key: string`, removed internal toLowerCase and modifier key filtering
- `src/core/keyboard.js`: Added `setupKeyboardEngine` (replaces `setupKeyboardHandler`) — new signature: `(config, getState, setState, appCallbacks, getSiteState)`
- `src/sites/youtube/commands.js`: Modified `getYouTubeKeySequences` — added `context: KeyContext` second param
- `src/sites/youtube/commands.js`: Added `getYouTubeBlockedNativeKeys(context)` — new pure function
- `src/sites/youtube/commands.js`: Marked `getYouTubeSingleKeyActions` as `@deprecated`
- `src/sites/youtube/index.js`: Added `getBlockedNativeKeys` and `isNativeSearchInput` to config; marked `getSingleKeyActions` deprecated
- `src/sites/google/index.js`: Modified `getGoogleKeySequences` — added `context: KeyContext` second param
- `src/sites/google/index.js`: Added `getBlockedNativeKeys` (returns []) and `isNativeSearchInput` to config; marked `getSingleKeyActions` deprecated
- `src/core/index.js`: Changed import from `setupKeyboardHandler` to `setupKeyboardEngine`; added stub `appCallbacks` construction

## Assertion Changes Flagged
- `src/core/keyboard.test.js:66-68`: Removed 3 assertions from "ignores modifier keys" test — test removed because normalizeKey now handles modifier filtering, not handleKeyEvent
- `src/core/keyboard.test.js:106-111`: Added 4 new assertions checking `capturedContext` shape (pageType, filterActive, searchActive, drawer) — validates new KeyContext data definition
- `src/core/keyboard.test.js:115`: Changed `expect(getSelectedItem).toHaveBeenCalled()` to `expect(appCallbacks.getSelectedItem).toHaveBeenCalled()` — variable rename from restructured test, same assertion logic
- `src/core/keyboard.test.js:145`: Removed `expect(capturedApp.getSelectedItem()).toBeUndefined()` — old test for missing callback pattern replaced with simpler test

## Notes
- **handleKeyEvent core logic is preserved**: The matching algorithm (exact match, prefix match, ambiguous match with pendingAction) is the same. The implementer should restore the exact same matching logic, just operating on the pre-normalized `key` string directly (no toLowerCase, no modifier key check). See old code in git history.
- **j/k/h/l overlap with multi-key sequences (gh, gl)**: In the old engine, j/k/h/l were hardcoded early-returns that checked `!keySeq` to avoid firing during multi-key sequences. In the new design, these are registered as single-char sequences. The handleKeyEvent engine handles this naturally: when 'g' is pressed, it becomes a prefix match; when 'h' follows, it matches 'gh'. If 'h' is pressed alone (no pending sequence), it matches 'h'. No special case needed.
- **Modal opener focus**: The old engine had special-case code for ':', '/', 'i' to auto-focus the status bar input. In the new design, the openPalette/openFilter/openSearch callbacks in appCallbacks should handle focus themselves. The engine can also check post-action state to see if a modal opened and auto-focus.
- **getSingleKeyActions deprecated but kept**: The deprecated functions and config properties are preserved to avoid breaking other code paths that might reference them. The implementer should remove them after confirming all references use the new getKeySequences path.
- **appCallbacks stubs reference existing handlers**: Many appCallbacks entries (navigate→handleListNavigation, select→handleSelect, etc.) just delegate to existing functions already in scope in createApp. The openPalette/openSearch/etc. entries need the updateUI helper moved from old keyboard.js.
- **Google getBlockedNativeKeys returns []**: Google doesn't have native keyboard shortcuts that conflict with Vilify, so it returns an empty array. This is already implemented (not a stub).
