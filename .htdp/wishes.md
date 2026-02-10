# Wishes

## Layer 0 (leaves — no dependencies)

1. **`getYouTubeKeySequences` in `src/sites/youtube/commands.js`**
   Purpose: Add `mw` key sequence for watch pages (currently gated behind `pageType !== 'watch'`). On watch page, `mw` should call `app?.addToWatchLater?.()`.

2. **`getYouTubeCommands` in `src/sites/youtube/commands.js`**
   Purpose: Add 'Add to Watch Later' command entry in the watch page section with keys 'M W'.

3. **`handleAddToWatchLater` in `src/core/index.js`**
   Purpose: When no selected list item has a videoId (watch page), fall back to extracting videoId from `location.href` using URL pattern `/watch?v=ID`.

4. **`renderVideoInfoBox` in `src/sites/youtube/watch.js`**
   Purpose: Add 'mw' key hint to the actions row (alongside M/zo/f/t hints).

5. **Tests in `src/sites/youtube/commands.test.js`**
   Purpose: Update test "does not have mw on watch page" → expect mw IS present on watch page. Add test that mw calls addToWatchLater on watch page.

6. **Version bump: `manifest.json` and `package.json`**
   Purpose: Increment version to 0.5.72 / 0.5.70.
