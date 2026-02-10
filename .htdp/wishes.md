# Wishes

## Layer 0 (leaves)

1. **`handleKeyEvent` in `src/core/keyboard.js`** — Add prefix disambiguation: return `pendingAction` when exact match + longer prefix exists
2. **`handleKeyEvent` tests in `src/core/keyboard.test.js`** — New file with tests for pendingAction behavior

## Layer 1 (depends on Layer 0)

3. **`setupKeyboardHandler` in `src/core/keyboard.js`** — Handle `pendingAction`: store it, fire on timeout or when sequence breaks; update subscribe kbd from 'M' to 'ms'
4. **`getYouTubeKeySequences` in `src/sites/youtube/commands.js`** — Add `ms` → subscribe sequence on watch page
5. **`getYouTubeSingleKeyActions` in `src/sites/youtube/commands.js`** — Remove `M` for subscribe
6. **`getYouTubeCommands` in `src/sites/youtube/commands.js`** — Update subscribe display key from `⇧M` to `M S`
7. **`renderVideoInfoBox` in `src/sites/youtube/watch.js`** — Subscribe hint `M` → `ms`; add `watchLaterAdded` param; show "added" + dim class
8. **`renderWatchPage` / render chain** — Thread `watchLaterAdded` from app state to renderVideoInfoBox
9. **`updateSubscribeButton` in `src/sites/youtube/watch.js`** — kbd 'M' → 'ms'
10. **Tests in `src/sites/youtube/commands.test.js`** — Add ms sequence tests
11. **Version bump** — 0.5.72 → 0.5.73 (manifest), 0.5.70 → 0.5.71 (package)
