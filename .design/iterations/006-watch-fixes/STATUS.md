# Iteration 006 Status

## Version: 0.1.39

## ✅ COMPLETED

All issues from this iteration have been resolved.

### Watch Page Keybindings
- [x] `m` = mute with feedback
- [x] `c` = captions with feedback  
- [x] `Shift+M` = subscribe (instant update)
- [x] `h`/`l` = seek ±10s with feedback
- [x] `:q` = exit focus mode

### UI Improvements
- [x] Command palette: keys-first layout with fixed-width column
- [x] Filter drawer uses status bar input (consistent with command mode)
- [x] Hidden scrollbars on all modals (description, chapter, filter, command)
- [x] Description whitespace cleanup (aggressive Unicode handling)
- [x] Instant scroll behavior (no lag)
- [x] Navigation flashes at list boundaries

### Bug Fixes
- [x] Filter drawer shows recommended videos on watch page
- [x] Escape properly closes all modals
- [x] Subscribe button updates instantly (removed 500ms delay)
- [x] Chapter input moved to bottom of drawer
- [x] No duplicate hints (status bar only)

## Files Changed

| File | Changes |
|------|---------|
| `src/core/view.js` | `updateListSelection` uses `behavior: 'instant'` |
| `src/core/state.js` | `getMode()` returns 'FILTER' for `modalState: 'filter'` |
| `src/core/keyboard.js` | Chapter filter input exception for Escape |
| `src/core/layout.js` | Status bar hints for FILTER/COMMAND modes |
| `src/core/palette.js` | Keys-first layout, hidden scrollbars |
| `src/core/modals.js` | Filter drawer (no input), chapter input at bottom, aggressive whitespace cleanup, hidden scrollbars |
| `src/core/index.js` | Filter drawer callbacks, handleInputEscape for filter modal |
| `src/sites/youtube/player.js` | Feedback messages for all controls |
| `src/sites/youtube/commands.js` | Fixed keybindings, instant subscribe update |
| `src/sites/youtube/watch.js` | Added `updateSubscribeButton()` |
| `src/sites/youtube/index.js` | Use `getVideos()` for all pages including watch |
