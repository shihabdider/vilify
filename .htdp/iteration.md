# Iteration

anchor: 33a66182bd8e1fc4abc852c5ccb51c5ad5cdb170
started: 2026-02-10T13:59:37-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Change two YouTube keyboard shortcuts:
1. ArrowLeft (dismiss/remove from watch later) → `dd`
2. ArrowRight (add to watch later) → `mw`

## Data Definition Plan

No data definition changes. This is a keybinding remapping:
1. Remove hardcoded ArrowLeft/ArrowRight handlers from `src/core/keyboard.js`
2. Add `dd` and `mw` key sequences to `getYouTubeKeySequences()` in `src/sites/youtube/commands.js`
3. Update display keys in `getYouTubeCommands()` from `←` to `D D`, add `M W` for watch later
4. Version bump in manifest.json

## Abbreviated Workflow

Skipping Phase 1 (stubber) and Phase 3 (abstractor) — no type/data changes, no new functions.
Dispatching implementer directly.
