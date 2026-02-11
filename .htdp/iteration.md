# Iteration

anchor: e6af27ad1dc260b8d6ac946538b9cb3e050af4a0
started: 2026-02-10T04:33:00-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Add `go`/`gi` key sequences for switching between Google web search and Google Images, and make `i` (search mode) preserve the current search type. Requires adding `'images'` as a new GooglePageType variant.

- `go` key sequence → navigate to `/search?q=<current query>` (web results)
- `gi` key sequence → navigate to `/search?q=<current query>&udm=2` (image results)
- `i` in search mode should preserve search type (images stays images, web stays web)
- `searchUrl` becomes type-aware based on current page type

## Data Definition Plan

1. **GooglePageType** gains new variant `'images'` — currently `'search' | 'other'`, becomes `'search' | 'images' | 'other'`
2. `getGooglePageType()` updated to detect `udm=2` URL param → returns `'images'`
3. `googleConfig.searchUrl` becomes type-aware: on images page, appends `&udm=2`
4. `googleConfig.pages` gets `images` entry (initially same as search — proper grid comes in iteration 2)
5. `getGoogleKeySequences` gets `go` and `gi` sequences
6. `createPageState` handles `'images'` variant
