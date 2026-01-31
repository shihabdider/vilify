# Data Definitions - Iteration 011: YouTube Transcripts

## Overview

Types introduced or modified in this iteration.

**References**: This iteration uses these existing types from master DATA.md:
- DrawerState (Core)
- DrawerHandler (Core)
- ListDrawerConfig (Core)
- YouTubeState (YouTube)
- Chapter (YouTube) - similar pattern

---

## TranscriptLine (NEW)

A TranscriptLine is a structure:
- time: Number - timestamp in seconds
- timeText: String - formatted time ("2:34" or "1:02:15")
- duration: Number - how long this segment lasts (seconds)
- text: String - the transcript text

**Where**: YouTube

**Examples**:
```js
// Short video line
{ time: 45.2, timeText: '0:45', duration: 2.8, text: 'And here we can see the result' }

// Long video line
{ time: 3725.5, timeText: '1:02:05', duration: 3.1, text: 'In conclusion' }
```

---

## TranscriptStatus (NEW)

A TranscriptStatus is one of:
- 'loading' - transcript fetch in progress
- 'unavailable' - video has no captions/transcript
- 'loaded' - transcript successfully fetched

**Where**: YouTube

**Examples**:
```js
'loading'     // Fetching from Innertube API
'unavailable' // Video has no captions
'loaded'      // Transcript ready (check lines array)
```

---

## TranscriptResult (NEW)

A TranscriptResult is a structure:
- status: TranscriptStatus - loading state
- lines: Array<TranscriptLine> - transcript lines (empty if loading/unavailable)
- language: String | null - language code of transcript ("en", "es", etc.)

**Where**: YouTube

**Examples**:
```js
// Successfully loaded
{ 
  status: 'loaded', 
  lines: [
    { time: 0, timeText: '0:00', duration: 2.5, text: 'Hey everyone' },
    { time: 2.5, timeText: '0:02', duration: 3.1, text: 'Welcome back to the channel' }
  ],
  language: 'en'
}

// Still loading
{ status: 'loading', lines: [], language: null }

// No transcript available
{ status: 'unavailable', lines: [], language: null }
```

---

## DrawerState (MODIFIED)

Add variant:
- 'transcript' - transcript drawer open (YouTube)

**Where**: Core

Full union after modification:
- null
- 'palette'
- 'filter'
- 'chapters'
- 'description'
- 'transcript' ← NEW

---

## YouTubeState (MODIFIED)

Add field:
- transcript: TranscriptResult | null - cached transcript data for current video

**Where**: YouTube

**Examples**:
```js
// Initial state (not yet fetched)
{ chapterQuery: '', chapterSelectedIdx: 0, commentPage: 0, ..., transcript: null }

// After fetch - has transcript
{ ..., transcript: { status: 'loaded', lines: [...], language: 'en' } }

// After fetch - no transcript available
{ ..., transcript: { status: 'unavailable', lines: [], language: null } }
```

---

## Architectural Note: Site Getters vs API Getters

This iteration introduces a distinction between data sources:

| Type | Source | Timing | State | Examples |
|------|--------|--------|-------|----------|
| **Site getters** | DOM scraping | Sync | Stateless | getChapters(), getDescription() |
| **API getters** | External API | Async | Cached in siteState | fetchTranscript() |

**Rationale**: API-fetched data has explicit lifecycle (fetch, cache, invalidate) and should be visible in the state structure, not hidden in module-level variables. This makes async behavior explicit and ensures proper reset on navigation via `createSiteState()`.

---

## Core Change: Keyboard Handler siteState Access

To enable key sequences to access API-fetched state (like transcript availability), the keyboard handler needs access to siteState.

**Change to setupKeyboardHandler**:
- Add optional `getSiteState` parameter: `setupKeyboardHandler(config, getState, setState, callbacks, getSiteState)`
- Add `openTranscriptDrawer` to `appCallbacks` that uses `getSiteState()` to check availability

This keeps the change contained to keyboard.js while enabling API-backed features.

---

## Summary

| Type | Classification | Where | Status |
|------|---------------|-------|--------|
| TranscriptLine | Compound | YouTube | NEW |
| TranscriptStatus | Enum | YouTube | NEW |
| TranscriptResult | Compound | YouTube | NEW |
| DrawerState | Union | Core | MODIFIED |
| YouTubeState | Compound | YouTube | MODIFIED |
