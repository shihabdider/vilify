---
id: issue-0011
status: done
type: chore
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on:
  - issue-0010
remote:
  github: null
---

# Audit and retire legacy scope from active manifest, code, tests, and docs

## What to build

Perform the final scope audit for the omnibar reset. Ensure the active extension, build, tests, and user-facing docs describe and exercise only the v1 omnibar product scope: YouTube watch pages, URL navigation, basic platform video actions, and transcript search through structured YouTube data.

Legacy focus-mode/listing UI, Google support, drawers, comments UI, Watch Later/dismiss/subscribe mutations, and visible-control choreography should be removed from active code paths or explicitly archived only on the backup branch/tag.

## Acceptance examples

- [x] Given `manifest.json`, when matches, permissions, and content scripts are inspected, then Google support and legacy site-replacement surfaces are not active.
- [x] Given `src/content.ts` and bundled entry points, when imports are inspected, then the active content script does not import the old focus-mode app framework, Google modules, listing renderers, drawers, comments UI, or Watch Later/dismiss/subscribe automation.
- [x] Given the test suite, when `bun run test` runs, then tests target the omnibar runtime, plugin registry, YouTube default mode, bridge protocol, and transcript provider rather than legacy page replacement behavior.
- [x] Given README or extension docs, when a maintainer reads them, then they describe Vilify as a small omnibar command layer and list Google/full focus mode as out of active v1 scope.
- [x] Given a Google search page after installing the extension, when the user types normal keys, then Vilify does nothing.
- [x] Given a YouTube watch page with the omnibar closed, when normal YouTube/browser shortcuts are used, then Vilify intercepts only `:`.

## Data definition impact

None expected beyond deleting or deactivating obsolete definitions. This is a scope audit and documentation cleanup issue, not a new runtime capability.

## HtDP entry note

Phase 0 problem statement: after the new omnibar slices exist, verify that the old broad product surface is no longer active or documented as current behavior. Keep the backup branch/tag as the preservation mechanism for legacy code; do not keep dead compatibility layers on `main`.

Constraints:

- Do not add new product features.
- Do not reintroduce Google support or full-site focus mode.
- Do not keep old tests by weakening assertions; rewrite or remove them based on the new scope.
- Follow repository policy: bump extension version in `package.json` and `manifest.json`, then commit and push the completed change.

## Verification

- `bun run build`
- `bun run test`
- Manifest/build entry audit.
- Import/dead-code audit using `rg` for legacy feature names and disallowed strategies.
- Manual smoke checks on Google search, YouTube non-watch pages, and YouTube watch pages.

## Blocked by

- None beyond `depends_on`.

## HtDP iterations

- Completed in omnibar reset iteration on 2026-04-28; version bumped to `0.6.59`.

## Out of scope

- New omnibar commands.
- New sites.
- Visual redesign beyond accurate docs/screenshots if docs contain them.
- Deleting the backup branch or tag.
