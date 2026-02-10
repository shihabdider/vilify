# Iteration

anchor: 4e91aa72553fe424d86c84b654760b82f04bb46c
started: 2026-02-10T13:59:37-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Improve the layout of the metadata container on the YouTube watch page for key hints. Currently they are in a single line with wrap on overflow. Group them instead:
- Group 1: `ms` (sub/unsub) and `mw` (watch later)
- Group 2: `f` (chapters), `t` (transcript), and `zo` (desc)

## Data Definition Plan

No data definition changes. Pure layout/DOM restructuring in `renderVideoInfoBox` and associated CSS in `src/sites/youtube/watch.js`.

## Abbreviated Workflow

Skipping Phase 1 (stubber) and Phase 3 (abstractor) — no type/data changes, no new functions. Dispatching implementer directly.
