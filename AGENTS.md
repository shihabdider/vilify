make sure to always increment the version of the extension (including manifest.json) when making changes.

commit and push after each change.

## Build & Test

```bash
bun run build    # esbuild bundler
bun run test     # vitest run (NOT `bun test` — that uses bun's native runner)
```

## Architecture Notes

### Active v1 scope

Vilify's active runtime is a YouTube-wide omnibar command layer. `src/content.ts` detects supported pages through the stateless plugin registry and installs or reuses the omnibar runtime on all supported YouTube pages.

Keep Google support, full focus-mode/page replacement, listing renderers, drawers, comments UI, Watch Later/dismiss/subscribe mutations, and visible-control choreography out of active `main` code unless a new PRD explicitly expands scope. Historical reset planning remains in `.htdp/prds`, `.htdp/issues`, and `.htdp/architecture`.

htdp.mode: autonomous
htdp.transparent: true
