---
id: issue-0007
status: done
type: feature
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on:
  - issue-0006
remote:
  github: null
---

# Add a stateless plugin registry and YouTube watch-page plugin shell

## What to build

Introduce the small plugin/mode/provider seam for the new omnibar architecture. The content script should select at most one active plugin from a registry based on the current URL. The initial plugin is YouTube v1 and matches only YouTube watch pages. It declares a default mode and a transcript mode shell, but real providers can remain empty/status-only until later issues.

The omnibar runtime should consume generic modes/providers and should not hard-code YouTube command lists.

## Acceptance examples

- [ ] Given `https://www.youtube.com/watch?v=abc123`, when the plugin registry is queried, then it returns the YouTube plugin.
- [ ] Given YouTube home, search, channel, playlist, Shorts, Google search, or another non-supported URL, when the registry is queried, then it returns `null`.
- [ ] Given no active plugin, when the content script initializes, then Vilify does not install the omnibar opener and does not intercept keys.
- [ ] Given the YouTube plugin is active, when the omnibar opens, then the active root mode metadata comes from the plugin's declared default mode.
- [ ] Given a fake test plugin with its own mode and provider, when the omnibar runtime renders it, then no YouTube-specific changes are needed in the generic runtime.
- [ ] Given a plugin declaration, when it is inspected, then it is stateless configuration: no persistent app state, no target-page render hooks, and no ambient keybinding declarations.

## Data definition impact

Expected new or changed definitions:

- `SitePlugin` with `id`, `matches(url)`, `modes`, and optional `bridge`/`BridgeSpec`.
- `OmnibarMode` with `id`, `title`, `placeholder`, and `providers`.
- `OmnibarProvider` with `id` and `getItems(ctx, query)`.
- `ProviderContext` containing only generic context needed by providers.
- `getActivePlugin(url, plugins)` as the registry selection function.

## HtDP entry note

Phase 0 problem statement: make the omnibar generic enough for future sites while keeping v1 scoped to YouTube watch pages. Add stateless plugin configuration and mode/provider declarations, then route supported-page detection through the registry.

Constraints:

- No broad `SiteRuntime` mutable container in v1.
- No multi-plugin composition.
- No target-page render lifecycle hooks.
- No Google plugin in active scope.
- No real transcript or video command behavior in this slice unless needed as a stub/status item.

## Verification

- `bun run build`
- `bun run test`
- Unit tests for URL matching and `getActivePlugin` selection.
- Unit tests proving the omnibar runtime can render modes from a non-YouTube fake plugin.
- Manual smoke test that `:` opens only on YouTube watch pages and does nothing elsewhere.

## Blocked by

- None beyond `depends_on`.

## HtDP iterations

- 2026-04-27: Added stateless plugin registry, YouTube watch-page plugin shell, default/transcript mode declarations, and content-script plugin selection.

## Out of scope

- YouTube navigation commands.
- YouTube video actions.
- Bridge request/response implementation.
- Transcript loading and search.
