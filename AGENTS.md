make sure to always increment the version of the extension (including manifest.json) when making changes.

commit and push after each change.

## Build & Test

```bash
bun run build    # esbuild bundler
bun run test     # vitest run (NOT `bun test` — that uses bun's native runner)
```

htdp.transparent: true
