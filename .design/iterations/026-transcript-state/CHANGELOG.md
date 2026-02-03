# Iteration 026: transcript-state

## Summary

Converted transcript fetching to proper HtDP World state transition pattern.

## Changes

### New Files
- `src/sites/youtube/state.js` - Pure state transitions for YouTube-specific state
- `src/sites/youtube/state.test.js` - Tests for YouTube state transitions (10 tests)

### Modified Files

**src/sites/youtube/transcript.js**
- Added `videoId` field to all TranscriptResult returns
- Enables validation that results match current video (handles async race conditions)

**src/sites/youtube/index.js**
- Updated `watchPageConfig.onEnter` to accept context parameter
- Uses pure `onTranscriptRequest` to set loading state immediately
- Uses pure `onTranscriptLoad` to store results (with stale result handling)
- Removed direct import of `getSiteState`/`setSiteState`

**src/core/index.js**
- Updated `onEnter` calls to pass context object
- Context includes: `{ getSiteState, updateSiteState, render }`
- `updateSiteState` uses functional update pattern

**.design/DATA.md**
- Added `videoId` field to TranscriptResult type
- Documented pure transitions table

## Architecture

### Before (Imperative)
```javascript
onEnter: async () => {
  setTimeout(async () => {
    const transcript = await fetchTranscript(videoId);  // I/O
    setSiteState({ ...currentState, transcript });      // Direct mutation
  }, 500);
}
```

### After (HtDP World Pattern)
```javascript
onEnter: async (ctx) => {
  // Set loading state immediately (pure)
  ctx.updateSiteState(state => onTranscriptRequest(state, videoId));
  
  // Async I/O
  setTimeout(async () => {
    const result = await fetchTranscript(videoId);
    // Update with result (pure, validates videoId)
    ctx.updateSiteState(state => onTranscriptLoad(state, result));
  }, 500);
}
```

### Key Improvements
1. **Explicit loading state** - UI can show "loading" immediately
2. **Stale result handling** - `onTranscriptLoad` validates videoId matches
3. **Pure state transitions** - All state changes via pure functions
4. **Functional updates** - `updateSiteState(fn)` vs imperative `setSiteState`
5. **Context injection** - Hooks receive context, don't import global state

## Tests

- 10 new tests for transcript state transitions
- All 100 tests pass

## Version

0.5.32 → 0.5.33
