make sure to always increment the version of the extension (including manifest.json) when making changes.

commit and push after each change.

## Build & Test

```bash
bun run build    # esbuild bundler
bun run test     # vitest run (NOT `bun test` — that uses bun's native runner)
```

## Architecture Notes

### Watch page DOM updates after state changes

The watch page uses a **full re-render** pattern: `render()` → `renderWatchWithRetry` → `renderWatchPage` → `clear(container)` + rebuild everything from scratch (info box, comments, observers).

**Direct DOM updates must come AFTER `render()`, not before.** Since `render()` destroys and rebuilds the entire container, any DOM changes made before `render()` are lost. The working pattern (used by `updateSubscribeButton` and the watch later hint) is:

```javascript
state = onSomeStateChange(state, data);
render();                                         // rebuilds DOM from state
// Direct DOM update AFTER render — modifies the newly created element
const el = document.getElementById('vilify-some-id');
if (el) { /* update element */ }
```

This is needed because the render chain (`renderWatchWithRetry` → `renderWatchPage` → `renderVideoInfoBox`) may not always propagate state changes to the info box reliably — the direct DOM update is the primary mechanism for immediate visual feedback.

htdp.transparent: true
