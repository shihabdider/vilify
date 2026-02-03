# Iteration 024: Site Page Config - Changelog

## Summary

Extracted `PageConfig` from `SiteConfig` to organize page-specific behavior. Implemented page lifecycle hooks (`onEnter`/`onLeave`) for proper setup/teardown.

## Changes

### Modified Files

| File | Changes |
|------|---------|
| `src/sites/youtube/index.js` | Refactored `layouts` → `pages` with PageConfig structure |
| `src/core/index.js` | Added `getPageConfig()`, lifecycle calls in `init()` and `handleNavigation()` |
| `src/core/view-tree.js` | Updated `toContentView()` to support `pages[type].render` |

### New Type: PageConfig

```typescript
interface PageConfig {
  render: (state, siteState, container) => void;  // Render function
  onEnter?: () => void | Promise<void>;           // Called when entering page
  onLeave?: () => void;                           // Called when leaving page
  [key: string]: any;                             // Page-specific extensions
}
```

### YouTube Config Changes

**Before:**
```javascript
layouts: {
  watch: (state, siteState, container) => { ... },
  home: renderYouTubeListing,
  ...
},
onContentReady: async () => { /* watch page setup */ },
watch: { nextCommentPage, prevCommentPage },
```

**After:**
```javascript
pages: {
  watch: {
    render: (state, siteState, container) => { ... },
    onEnter: async () => { /* apply settings, fetch transcript */ },
    onLeave: () => { /* clear retries, reset drawers */ },
    nextCommentPage,
    prevCommentPage,
  },
  home: { render: renderYouTubeListing },
  ...
}
```

### Lifecycle Integration

- `createApp().init()` now calls `pageConfig.onEnter()` for initial page
- `handleNavigation()` calls `oldPageConfig.onLeave()` before navigation, then `newPageConfig.onEnter()` after content ready
- Legacy `config.onContentReady` still supported for backward compatibility

### Backward Compatibility

- `config.layouts[type]` still works (fallback in `toContentView`)
- `config.watch.nextCommentPage` still works (fallback in handlers)
- `config.onContentReady` still called (after page-specific onEnter)

## Tests

- All 98 existing tests pass
- Build successful (185.3kb content.js)

## Version

0.5.30 → 0.5.31

## Next Steps (Iteration 025)

- YouTube-specific state/transition cleanup
