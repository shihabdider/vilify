# Iteration

anchor: 34fd920101d0ce051c9bd41eea7967c379acface
started: 2026-02-10T13:59:37-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Add 'i' key binding to Google site that opens search mode (same as YouTube). When user presses 'i', a search input appears in the status bar. On submit, navigate to Google search results for the entered query.

Currently `handleSearchSubmit` in core/index.js is hardcoded to YouTube's URL (`/results?search_query=...`) and the placeholder in layout.js says "Search YouTube...". These need to become site-configurable.

## Data Definition Plan

No new data definitions needed. The existing `searchActive`/`searchQuery` state fields and `onSearchToggle`/`onSearchChange` transitions in core/state.js already support search mode.

Changes needed:
1. Add optional `searchUrl(query) → string` to SiteConfig (returns the search URL for a query)
2. Add optional `searchPlaceholder → string` to SiteConfig
3. Add `'i': () => app?.openSearch?.()` to Google's key sequences
4. Use `config.searchUrl` in `handleSearchSubmit` (core/index.js) instead of hardcoded YouTube URL
5. Use `config.searchPlaceholder` in `updateStatusBar` (layout.js) instead of hardcoded text

## Abbreviated Workflow

Skipping Phase 1 (no data definition changes) and Phase 3 (too small for duplication). Dispatching implementer directly.
