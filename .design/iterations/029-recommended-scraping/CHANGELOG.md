# Iteration 029: Recommended Videos Scraping Fix

**Date:** 2026-02-01
**Version:** 0.5.37 → 0.5.41

## Problem

The recommended videos drawer on watch pages was showing empty - no videos were being scraped.

## Root Cause Analysis

**Primary Bug:** In `src/sites/youtube/index.js`, the `createPageState()` function was calling `dp.getVideos()` instead of `dp.getRecommendations()` for watch pages:

```javascript
// WRONG - getVideos() returns main page listing (empty on watch page)
const recommended = dp.getVideos?.() ?? [];

// CORRECT - getRecommendations() returns sidebar videos
const recommended = dp.getRecommendations?.() ?? [];
```

This was a regression where the wrong data provider method was being called.

**Secondary Issue (also fixed):** The DOM fallback scraper `getRecommendedVideos()` only looked for old-format elements:
```javascript
document.querySelectorAll('#secondary ytd-compact-video-renderer, ...')
```

YouTube has been transitioning to `yt-lockup-view-model` format, so the DOM fallback also needed updating.

## Fix

### Fix 1: Missing Recommended Drawer Handler
The 'recommended' drawer had no handler! `getYouTubeDrawerHandler` returned `null` for drawer='recommended', so the drawer rendered nothing.

**Solution:** Created `src/sites/youtube/drawers/recommended.js`:
- New `createRecommendedDrawer()` using `createListDrawer` factory
- `setRecommendedItems()` to cache items from `state.page.recommended` 
- `getRecommendedDrawer()` to return the handler

Updated `src/sites/youtube/drawers/index.js`:
- Added handler for `drawerState === 'recommended'`
- Added reset function

Updated `src/sites/youtube/index.js`:
- Import `setRecommendedItems`
- Call `setRecommendedItems(recommended)` in `createPageState()` for watch pages

### Fix 2: Wrong Data Provider Method
Changed `src/sites/youtube/index.js` to call the correct method:
```javascript
const recommended = dp.getRecommendations?.() ?? [];  // Was: dp.getVideos()
```

### Fix 3: DOM Fallback Format Mismatch
`scrapeDOMRecommendations()` was transforming ContentItem back to Video format, causing format mismatch.

**Solution:** Updated `src/sites/youtube/data/dom-fallback.js` to preserve ContentItem format.

### Fix 4 (DOM Fallback Selectors)
Updated `getRecommendedVideos()` in `src/sites/youtube/scraper.js` to support three strategies:

1. **New layout**: `yt-lockup-view-model` elements in sidebar (YouTube's 2024+ format)
   - Selectors: `#secondary yt-lockup-view-model`, `#related yt-lockup-view-model`, `ytd-watch-next-secondary-results-renderer yt-lockup-view-model`
   - Extracts title from `.yt-lockup-metadata-view-model-wiz__title` or `.yt-lockup-metadata-view-model__title`
   - Extracts channel/views/date from `.yt-content-metadata-view-model-wiz__metadata-text`

2. **Old layout**: `ytd-compact-video-renderer` (still used in some cases)
   - Kept existing selectors as fallback

3. **Rich item renderer**: `ytd-rich-item-renderer` containing `ytd-video-renderer`
   - Additional fallback for mixed layouts

Also improved data extraction:
- Now includes `duration` via `scrapeDuration()` for all strategies
- Now includes `viewCount` and `channelUrl` where available

## Files Changed

- `src/sites/youtube/drawers/recommended.js` - **NEW** Recommended drawer handler
- `src/sites/youtube/drawers/index.js` - Added recommended drawer support
- `src/sites/youtube/index.js` - Fixed `createPageState()`, added `setRecommendedItems()` call
- `src/sites/youtube/data/index.js` - Added debug logging
- `src/sites/youtube/data/dom-fallback.js` - Fixed format mismatch
- `src/sites/youtube/scraper.js` - Updated `getRecommendedVideos()` with multi-strategy scraping
- `.design/SCRAPING.md` - Added Watch Page Recommendations section
- `manifest.json` - Version bump 0.5.37 → 0.5.41
- `package.json` - Version bump 0.5.37 → 0.5.41

## Testing

- Reload extension in Chrome
- Navigate to a YouTube watch page
- Open recommended drawer (should now show videos)
- Verify videos display with title, channel, duration
