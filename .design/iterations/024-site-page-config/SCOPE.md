# Iteration 024: Site Page Config

## Goal

Extract `PageConfig` from `SiteConfig` to better organize page-specific behavior. Implement page lifecycle hooks (`onEnter`/`onLeave`) for proper setup/teardown.

## Current State (Problem)

In `youtubeConfig`:
- `layouts` maps page type to render function
- `onContentReady` is a single callback (but only does things on watch page)
- `watch` has comment pagination (page-specific functions scattered)
- Page-specific setup/teardown is ad-hoc (e.g., `clearWatchRetry()`, `resetYouTubeDrawers()`)

## Target State

```javascript
// SiteConfig
{
  name: 'youtube',
  theme: { ... },
  pages: {
    watch: {
      render: (state, siteState, container) => { ... },
      onEnter: () => { /* apply video settings, fetch transcript */ },
      onLeave: () => { /* clear retries, reset drawers */ },
      // Page-specific extensions
      nextCommentPage: (siteState) => { ... },
      prevCommentPage: (siteState) => { ... },
    },
    home: {
      render: renderYouTubeListing,
      // No onEnter/onLeave needed for simple pages
    },
    // ...other pages
  },
  // Site-wide (applies to all pages)
  getCommands: (ctx) => { ... },
  getKeySequences: (ctx) => { ... },
  // ...
}
```

## New Type: PageConfig

```typescript
interface PageConfig {
  /** Render function for this page type */
  render: (state: AppState, siteState: SiteState, container: HTMLElement) => void;
  
  /** Called when entering this page type (after waitForContent) */
  onEnter?: () => void | Promise<void>;
  
  /** Called when leaving this page type (before navigation) */
  onLeave?: () => void;
  
  /** Page-specific extensions (e.g., comment pagination for watch) */
  [key: string]: any;
}
```

## Changes

### Core Changes

1. **index.js**: Update `handleNavigation` to call `onLeave` then `onEnter`
2. **index.js**: Update init to call `onEnter` for initial page

### YouTube Changes

1. **index.js**: Refactor `layouts` → `pages` with PageConfig structure
2. Move `onContentReady` logic to `pages.watch.onEnter`
3. Add `onLeave` to watch page (clear retry timer, reset drawers)
4. Keep `watch.nextCommentPage`/`prevCommentPage` as page extensions

## Wishes

### getPageConfig
- **Signature**: `getPageConfig : SiteConfig × PageType → PageConfig | null`
- **Purpose**: Get page configuration for a given page type
- **Notes**: Helper to access pages[pageType] with defaults

### Lifecycle Integration
- Update `createApp().init()` to call `pageConfig.onEnter()`
- Update `handleNavigation` to call `oldPageConfig.onLeave()` then `newPageConfig.onEnter()`

## Out of Scope

- Per-page commands (keep at site level for now)
- Per-page key sequences (keep at site level for now)
- Data provider abstraction (iteration 025)

## Tests

- Existing tests should pass (no state/view function changes)
- Manual test: navigation between watch ↔ listing triggers lifecycle

## Version

0.5.30 → 0.5.31
