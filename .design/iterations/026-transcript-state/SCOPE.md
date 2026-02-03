# Iteration 026: transcript-state

Convert transcript fetching to proper HtDP World state transition pattern.

## Problem

Current implementation mixes I/O with state:
```javascript
// watchPageConfig.onEnter (I/O + state update combined)
setTimeout(async () => {
  const transcript = await fetchTranscript(videoId);  // I/O
  setSiteState({ ...currentState, transcript });      // Direct state update
}, 500);
```

This violates HtDP World model:
- Async I/O inside lifecycle hook
- Direct imperative state update
- No explicit loading state

## Solution

### Data Changes

**YouTubeState.transcript** changes from:
- Before: `TranscriptResult | null`
- After: `TranscriptState` (explicit loading state)

**New type TranscriptState**:
```javascript
// TranscriptState is one of:
// - null              (not requested)
// - { status: 'loading', videoId }
// - { status: 'loaded', videoId, lines, language }
// - { status: 'unavailable', videoId }
```

### State Transitions (Pure)

| Function | Signature | Purpose |
|----------|-----------|---------|
| onTranscriptRequest | AppState × String → AppState | Mark transcript as loading for videoId |
| onTranscriptLoad | AppState × TranscriptResult → AppState | Store loaded transcript |

### I/O Changes

**watchPageConfig.onEnter**:
- Calls `onTranscriptRequest(state, videoId)` to set loading state
- Returns request descriptor instead of doing I/O

**Orchestration (createApp)**:
- Handles transcript fetch request
- Calls `fetchTranscript()` (I/O)
- Calls `onTranscriptLoad()` with result

## Files to Change

| File | Change |
|------|--------|
| src/core/state.js | Add onTranscriptRequest, onTranscriptLoad |
| src/sites/youtube/index.js | Update YouTubeState, refactor onEnter |
| src/core/index.js | Add transcript fetch orchestration |

## Tests

- onTranscriptRequest sets loading state
- onTranscriptLoad stores result
- Loading state renders correctly
- Drawer handles loading state

## Acceptance

- [ ] Pure state transitions for transcript
- [ ] Explicit loading state in UI
- [ ] I/O isolated in orchestration
- [ ] All 90 tests pass
