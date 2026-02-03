# Iteration 023: Init Orchestration - Changelog

## Summary

Refactored `src/core/index.js` to encapsulate all module-level state into `createApp()` factory function. This improves testability and aligns with HtDP's isolation principles.

## Changes

### Modified Files

| File | Changes |
|------|---------|
| `src/core/index.js` | Complete refactor: `createApp()` factory, encapsulated state, legacy API |
| `src/core/keyboard.js` | Return cleanup function from `setupKeyboardHandler()` |

### New API

**`createApp(config)`** - Factory function that returns an App instance:
```javascript
const app = createApp(youtubeConfig);
await app.init();    // Initialize (inject styles, setup handlers, render)
app.destroy();       // Clean up (remove handlers, timers, DOM)
app.getState();      // Get AppState (for testing)
app.setState(s);     // Set AppState (for testing)
app.getSiteState();  // Get site state
app.setSiteState(s); // Set site state
```

### Encapsulated State

All module-level state is now private via closure inside `createApp()`:
- `state` - Main AppState
- `siteState` - Site-specific state
- `pollTimer` - Content polling timer
- `lastVideoCount` - Polling state
- `lastRenderedDrawer` - View diff state
- `cleanupKeyboard` - Keyboard handler cleanup function
- `navigationObserver` - Navigation observer reference

### Legacy API

Backward compatibility maintained via:
- `initSite(config)` - Uses `createApp()` internally with singleton
- `getSiteState()` / `setSiteState()` - Proxy to singleton app

### Keyboard Handler Cleanup

`setupKeyboardHandler()` now returns a cleanup function that:
- Removes the keydown event listener
- Clears any pending key sequence timeout

## Tests

- All 98 existing tests pass
- Build successful (184.5kb content.js)

## Version

0.5.29 → 0.5.30

## Next Steps (Iteration 024)

- Extract PageConfig from SiteConfig
- Implement page lifecycle (onEnter/onLeave)
