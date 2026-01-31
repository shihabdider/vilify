# Implementation - Iteration 011: YouTube Transcripts

Generated from BRAINSTORM.md on January 28, 2026.
Updated after architecture review.

## Dependency Graph

```
B6 (badge hint) ────────────────────┐
B7 (no-transcript message) ─────────┤
B1 (open drawer) ──── B2 (fetch) ──┬┴── B3 (scroll)
                                   ├─── B4 (filter)
                                   └─── B5 (jump)
```

## Execution Plan

| Wave | Behaviors | Est. Tokens | Subagents | Status |
|------|-----------|-------------|-----------|--------|
| 1 | B1, B6, B7 | 5K | 1 | → In Progress |
| 2 | B2 | 5K | 1 | Pending |
| 3 | B3, B4, B5 | 7K | 1 | Pending |

**Wave 1 includes core changes:**
- `src/core/keyboard.js` - Add `getSiteState` param, `openTranscriptDrawer` callback
- `src/core/index.js` - Pass `getSiteState`, pass `siteState` to getDrawerHandler

## Behavior Status

| ID | Behavior | Status | Tested | Notes |
|----|----------|--------|--------|-------|
| B1 | Open transcript drawer (keybinding `t`) | → In Progress | - | Via appCallbacks.openTranscriptDrawer |
| B2 | Transcript content fetched and displayed | Pending | - | |
| B3 | Scroll through transcript lines | Pending | - | Handled by createListDrawer |
| B4 | Search/filter within transcript | Pending | - | Handled by createListDrawer |
| B5 | Jump to video position on Enter | Pending | - | Handled by onSelect callback |
| B6 | Badge hint shows when captions available | → In Progress | - | |
| B7 | Status message when no transcript | → In Progress | - | Via appCallbacks.openTranscriptDrawer |

## Wave Log

(populated during execution)
