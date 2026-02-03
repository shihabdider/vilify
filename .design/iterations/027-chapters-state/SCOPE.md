# Iteration 027: Chapters State

## Goal

Convert chapters fetching to proper state transitions, mirroring the transcript pattern from iteration 026.

## Current Behavior

- Chapters drawer calls `getChapters()` (DOM scraping) on every render
- No loading state, no validation
- Chapters re-scraped each time drawer opens

## After Refinement

- Chapters fetched once on watch page enter via onEnter hook
- ChaptersResult stored in YouTubeState (like TranscriptResult)
- Drawer reads from state, doesn't call getChapters() directly
- Loading state while fetching
- videoId validation (ignore stale results)

## Data Changes

| Type | Change |
|------|--------|
| YouTubeState | Add `chapters: ChaptersResult \| null` field |
| ChaptersResult | New type: `{ status, videoId, chapters }` |
| ChaptersStatus | New enum: `'loading' \| 'loaded' \| 'unavailable'` |

## New Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| onChaptersRequest | YouTubeState × String → YouTubeState | Mark chapters as loading |
| onChaptersLoad | YouTubeState × ChaptersResult → YouTubeState | Store fetched chapters |
| onChaptersClear | YouTubeState → YouTubeState | Clear chapters state |

## Files to Modify

- `src/sites/youtube/state.js` - Add state transitions
- `src/sites/youtube/state.test.js` - Add tests
- `src/sites/youtube/index.js` - Update onEnter hook, createYouTubeState
- `src/sites/youtube/drawers/chapters.js` - Get chapters from state
- `.design/DATA.md` - Add ChaptersResult type
- `.design/WISHES.md` - Add function signatures

## Test Strategy

Same pattern as transcript tests:
- onChaptersRequest: Sets loading state, handles already loading
- onChaptersLoad: Stores result, validates videoId, ignores stale
- onChaptersClear: Clears chapters state
