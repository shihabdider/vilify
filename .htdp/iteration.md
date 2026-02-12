# Iteration

anchor: 3d7de2da46b83af1c67c190a1d4527a296fb2fe2
started: 2026-02-11T23:46:00-05:00
mode: data-definition-driven
language: JavaScript → TypeScript
transparent: true

## Problem

Convert the entire Vilify codebase from JavaScript to TypeScript. The project has 42 source files and 21 test files (~21K lines total) across src/core/, src/sites/google/, and src/sites/youtube/. The code already uses JSDoc type annotations extensively (AppState, UIState, SiteConfig, PageState, etc.), which should become proper TypeScript interfaces.

Strategy: gradual — start with `strict: false` / `noImplicitAny: false`, get it compiling, tests passing.

## Data Definition Plan

### New: src/types.ts — Central type definitions file
Extract all JSDoc type annotations into proper TypeScript interfaces/types:

**Core types:**
- `AppState = { core: AppCore, ui: UIState, site: any, page: PageState | null }`
- `AppCore = { focusModeActive: boolean, lastUrl: string }`
- `UIState = { drawer, paletteQuery, paletteSelectedIdx, selectedIdx, filterActive, filterQuery, searchActive, searchQuery, keySeq, sort, message, boundaryFlash, watchLaterAdded, watchLaterRemoved, lastWatchLaterRemoval, dismissedVideos, lastDismissal }`
- `SortConfig = { field: string | null, direction: 'asc' | 'desc' }`
- `Message = { text: string, timestamp: number }`
- `BoundaryFlash = { edge: 'top' | 'bottom', timestamp: number }`
- `KeyContext = { pageType: string | null, filterActive: boolean, searchActive: boolean, drawer: string | null }`

**Site types:**
- `SiteConfig` — the big interface (name, theme, pageConfigs, getKeySequences, etc.)
- `SiteTheme = { bg1, bg2, bg3, txt1, txt2, txt3, txt4, accent, accentHover }`
- `PageConfig = { scrape, render, ... }`
- `DrawerHandler = { element, update?, setQuery?, navigateDrawer?, getSelected? }`

**Content types:**
- `ContentItem = { title, url, meta, description, ... }`
- `PageState = ListPageState | WatchPageState`
- `ListPageState = { type: 'list', videos: ContentItem[] }`
- `WatchPageState = { type: 'watch', videoContext, recommended, chapters, ... }`

**YouTube-specific:**
- `YouTubeState = { chapterQuery, chapterSelectedIdx, commentPage, ... transcript, chapters }`
- `TranscriptResult`, `ChaptersResult`

**Google-specific:**
- `GoogleState = {}`

### Infrastructure changes:
- Add `tsconfig.json` with loose settings
- Add `typescript` and `@types/chrome` devDependencies
- Update `build.js` entry points from .js to .ts
- Rename all 63 .js files to .ts
- Fix all import paths (remove .js extensions)
