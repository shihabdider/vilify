# Iteration

anchor: 91928f5713c4b1861df14848e287978791e7b67d
started: 2026-02-19T12:00:00Z
mode: data-definition-driven
language: TypeScript
transparent: true

## Problem

No keybinds exist for liking/disliking a video on the watch page. Add `likeVideo()` and `dislikeVideo()` functions that click YouTube's native buttons, wire them to key sequences (`sl` for like, `sd` for dislike), add command palette entries, and update tests.

## Data Definition Plan

No data definition changes. Pure behavioral addition:
1. Add `likeVideo()` and `dislikeVideo()` functions in commands.ts that click YouTube's native like/dislike buttons
2. Add `sl` and `sd` key sequences on the watch page (following `ss`/`sw` pattern)
3. Add command palette entries under an "Engagement" group
4. Update tests

Phases 1 and 3 skipped (no type changes, small leaf functions).
