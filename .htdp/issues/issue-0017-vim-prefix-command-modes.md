---
id: issue-0017
status: draft
type: feature
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on: []
remote:
  github: null
---

# Add Vim-style prefix command modes to the omnibar

## What to build

Add lightweight Vim-style command prefixes inside the omnibar query so common flows do not require first selecting a mode item. Initial prefixes: `s/{query}` searches YouTube, `t/{query}` searches the current video's transcript, and `n/{query}` filters to YouTube navigation actions. For example, `n/h` should narrow to Home, and `t/needle` should search transcript lines for “needle” on an actionable watch page.

## Acceptance examples

- [ ] Given the YouTube omnibar is open, when the user types `s/lofi beats` and presses Enter on the generated/default search item, then Vilify navigates to YouTube search results for `lofi beats` using a URL-encoded query.
- [ ] Given the YouTube omnibar is open on a watch page with transcript capability, when the user types `t/needle`, then transcript results for `needle` are shown directly without first selecting “Search transcript”.
- [ ] Given the user types `t/needle` on a page without an actionable current video, then no transcript command/result is shown or a concise unavailable status is shown according to the capability policy from `issue-0016`.
- [ ] Given the user types `n/h`, when results render, then only matching navigation actions such as Home are shown, not transcript, copy, or video-scoped actions.
- [ ] Given the query does not start with a known prefix, when results render, then existing default fuzzy command filtering still works.

## Data definition impact

Expected new query-intent data definitions, for example `ParsedOmnibarQuery` variants for default filtering, YouTube search, transcript search, and navigation filtering. Providers or the runtime may need a way to receive the parsed intent while preserving the existing simple query flow for normal modes. A new YouTube search navigation action may be needed for `s/{query}`.

## HtDP entry note

Phase 0 problem statement: evolve the omnibar from a generic command picker into a Vim-like modal command line while keeping all behavior inside the omnibar open state. Prefixes are query syntax, not ambient keybindings; closed state should still intercept only `:`. The implementation should compose with capability-aware command availability and the pruned command inventory if `issue-0016` or `issue-0019` has already landed.

## Verification

- `bun run build`
- `bun run test`
- Parser unit tests for recognized prefixes, empty prefixes, unknown prefixes, slash-containing search text, and URL encoding for `s/{query}`.
- Runtime/provider tests for `s/`, `t/`, and `n/` behavior on watch and non-watch YouTube pages.
- Manual browser checks for `s/{query}`, `t/{query}`, and `n/h`.

## Blocked by

- None - can start immediately.

## HtDP iterations

- None yet.

## Out of scope

- Ambient multi-key normal-mode bindings while the omnibar is closed.
- A full Vim command language, mappings, registers, macros, or configurable keymaps.
- Prefixes for non-YouTube sites until another site plugin exists.
