# 019: Duration Loading Performance Issue ✅ COMPLETE

## Problem
List pages (home, subscriptions, history, etc.) have noticeable loading delays.

## Root Cause Confirmed
**Duration scraping from DOM is the bottleneck.**

Two places cause the slowdown:
1. `src/core/index.js` - `waitForContent()` waits for duration badges to appear in DOM before showing content
2. `src/sites/youtube/data/index.js` - `augmentDuration()` scrapes DOM to fill in missing durations from bridge data

## Test Results
Disabling both duration-related waits resulted in **significantly faster loading** across all list pages.

## Questions to Research
1. Why is duration missing from the API/bridge data in the first place?
2. Can we get duration directly from ytInitialData without DOM scraping?
3. Alternative: Use innertube API directly instead of intercepting YouTube's data?

---

## Research Findings

### Current Architecture
- `data-bridge.js` runs in MAIN world, captures `ytInitialData` and `ytInitialPlayerResponse`
- `extractors.js` extracts videos from various renderer formats
- For new `lockupViewModel` format (home 2024+), duration extraction tries multiple paths:
  - `contentImage.collectionThumbnailViewModel.primaryThumbnail.thumbnailViewModel.overlays`
  - `contentImage.thumbnailViewModel.overlays`
  - `rendererContext.thumbnail.overlays`
  - `inlinePlayerData.lengthSeconds` fallback
- **Hypothesis**: Duration may not be present in ytInitialData for some renderer formats, or the paths changed

### YouTube.js / Innertube Research ❌ NOT RECOMMENDED
- **Library**: https://github.com/LuanRT/YouTube.js (youtubei.js)
- **CORS Issue**: Requires proxy server for browser usage - YouTube doesn't expose CORS headers
- **In Extension Context**: Since content scripts run on YouTube's domain, we could potentially make direct innertube API calls without CORS issues
- **Complexity**: Would need to manage API keys, auth, and format our own requests
- **Verdict**: Overkill for our use case - we already intercept the same data YouTube uses
- **DO NOT REVISIT** - researched 2026-02-01, not worth the complexity

---

## Potential Solutions

### Option A: Fix duration extraction from existing bridge data
- Inspect actual ytInitialData on home/subs pages to find where duration lives
- Update `extractLockupViewModel()` paths if YouTube changed the structure
- **Effort**: Low if duration exists in data
- **Risk**: YouTube may genuinely not include duration in initial data for some pages

### Option B: Remove duration wait, lazy-load durations (RECOMMENDED)
- Show content immediately without durations (or with placeholder)
- Backfill durations asynchronously after initial render
- Two approaches:
  1. Observe DOM for duration badges appearing, update items when available
  2. Use MutationObserver to watch for thumbnail overlay changes
- **Effort**: Medium
- **Benefit**: Fast initial load, durations appear progressively
- **UX**: Slight visual shift as durations populate, but much faster perceived performance

### Option C: Make duration optional/deprioritized
- Simply don't wait for duration at all
- Accept that some items may not show duration
- **Effort**: Very low (already tested in branch)
- **Tradeoff**: Missing metadata on some items

### Option D: Hybrid - Try API first, lazy DOM fallback
- Extract duration from ytInitialData where available
- For items missing duration, queue background DOM scraping
- Batch update items when DOM scraping completes
- **Effort**: Medium-high
- **Benefit**: Best of both worlds

---

## Resolution

**Implemented Option A** - Fixed duration extraction from existing bridge data.

### Root Cause
YouTube changed the duration location in `lockupViewModel` overlays. Our extractor was looking for old paths like `thumbnailOverlayTimeStatusViewModel` but YouTube now uses `thumbnailBadgeViewModel.text` inside various overlay structures.

### Fix Applied
Replaced hardcoded path checking with recursive search for any `thumbnailBadgeViewModel.text` matching duration pattern (`\d+:\d{2}(:\d{2})?`). This is resilient to future YouTube layout changes.

### Files Changed
- `src/sites/youtube/data/extractors.js` - Recursive duration search in `extractLockupViewModel()`
- `src/core/index.js` - Removed wait for DOM duration badges (no longer needed)
- `src/sites/youtube/data/index.js` - Removed `augmentDuration()` call (duration comes from API)

### Result
- ✅ Home page loads fast with durations
- ✅ History page loads fast with durations
- ✅ Subscriptions page loads fast with durations
