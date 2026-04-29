# Iteration

anchor: 6ea8a3daa5653248ddeb02be135d5dbff79a1024
started: 2026-04-29T20:04:39Z
stubber-mode: compiler-driven
workflow-mode: autonomous
language: TypeScript
transparent: true

## Source Artifacts

- PRD: .htdp/prds/prd-0001-omnibar-reset.md
- Issue: .htdp/issues/issue-0020-fix-stale-transcript-video-id.md
- Issue: .htdp/issues/issue-0021-refine-omnibar-syntax-colors.md
- Issue: .htdp/issues/issue-0022-increase-omnibar-type-scale.md
- Issue: .htdp/issues/issue-0023-replace-bare-row-marker.md
- Architecture review: <none>

## Problem

Implement the four new omnibar feedback issues as one HtDP batch: fix stale transcript request/response identity so transcript mode and `t/` fetch for the active video, refine the omnibar into a more syntax-like Vim color palette, increase the omnibar type scale/readability while keeping the compact TUI picker model, and replace the confusing bare status `!` left marker with useful prefix context (`t/`, `s/`, `n/`) or no marker.

## Data Definition Plan

Use a compiler-driven TypeScript pass because the transcript fix should be modeled in data, not patched as control-flow only, and the row marker/palette work likely needs explicit display/view definitions. Revise transcript load/request identity around `TranscriptLoadState`, bridge client results, or provider cache entries so each pending/settled state is correlated with the requested video id and stale responses are discarded/isolated instead of cached as final unavailable for the current video. Add display-only row marker metadata or renderer derivation so active prefix flows can render `t/`, `s/`, or `n/` in the left marker column while unprefixed/status rows do not render a bare `!`. Extend/refine omnibar view/theme tokens for syntax-part colors and readable type/layout scale; keep these presentation definitions separate from command/action semantics. Bump package and manifest version from 0.6.83 to the next patch version.

## Polya Ledger

### Knowns

- Current transcript provider caches load state by resolved active video id.
- Current bridge client can return `status: 'stale'` when response video id differs from the requested or active video id.
- Current transcript provider turns stale bridge results into an unavailable load state, producing messages such as `Transcript response was for xmkSf5IS-zw. Active video is A04b-52jtos.`
- Current `t/` root prefix delegates into `youtubeTranscriptMode` providers on actionable watch pages.
- Current omnibar rows render `item.kind === 'status' ? '!' : item.kind` in the kind/marker column.
- Current root prefix hints are status items whose title strings include `s/{query}`, `t/{query}`, `n/{query}`, and `type text`.
- Current view tokens use bright black/yellow/cyan/green/magenta values but the user reports the result is too monotone/all-blue in practice.
- Current omnibar base font is inherited from the root with no explicit larger font-size token.
- Repo convention requires version bumps in package and manifest, then commit and push.

### Constraints

- Keep the v1 reliability boundary: no visible transcript-panel scraping, no clicking YouTube UI, no hidden-menu choreography.
- Closed omnibar state still intercepts only `:` outside editable targets.
- Prefixes remain query syntax in the open omnibar, not ambient keybindings.
- Do not broaden product scope beyond YouTube omnibar v1.
- Palette/font changes are visual/presentational and should not change command behavior.
- Error/status semantics must remain visible through row copy and color even if the bare `!` marker is removed.
- Build and test hooks are `bun run build` and `bun run test` from `htdp.json`.
- HITL visual acceptance for palette and type scale must be handled in final verification.

### Unknowns That Matter

- [resolved by user go] Implement issues 0020-0023 together in this batch.
- [resolved by user go] Make a conservative concrete palette/type-scale pass and rely on final browser screenshot review for taste.
- [resolved by user go] Stale transcript responses should not become terminal unavailable cache entries for the active video; they should be isolated/discarded so the current video can fetch.

### Out of Scope

- Configurable themes or named theme clone.
- Full responsive redesign beyond keeping the larger picker inside the viewport.
- Persistent transcript drawer/sidebar or visible YouTube transcript panel automation.
- Non-YouTube transcript providers.
- Command inventory changes unrelated to marker/display metadata.
- Full Vim command language, mappings, registers, macros, or ambient normal-mode bindings while closed.
- Google support, drawers, listing renderers, comments UI, or page replacement.

### Assumptions

- Stale transcript handling should prefer retry/fresh request behavior over showing a stale mismatch as a user-facing terminal unavailable state.
- A true no-transcript result from the active/requested video should still render an unavailable status tied to that video.
- For active prefix flows, showing `t/`, `s/`, or `n/` in the left marker column is useful; for unprefixed status rows, an empty or neutral marker is preferable to `!`.
- Palette refinement can be expressed with explicit theme tokens and syntax/display classes rather than changing provider action data.
- Font-size increase should be moderate and paired with panel width/max-height/line-height adjustments to keep the picker compact.
- Version bump target is 0.6.84 unless implementation discovers an existing bump.

### Alternatives Considered

- Keep stale responses as unavailable but improve copy — rejected because issue 0020 says stale responses should be discarded/isolated and allow fresh active-video requests.
- Remove the left marker column entirely — acceptable for unprefixed/status rows, but less informative than prefix context for `t/`, `s/`, and `n/` flows.
- Encode prefix markers into `OmnibarItemKind` — rejected because marker context is display/query-intent metadata, not command kind semantics.
- Use a named Vim theme clone — deferred; user feedback asks for syntax-like differentiation, not a specific theme.
- Large modal-like font/layout increase — rejected by issue 0022; preserve compact TUI picker.
- Chosen: request-correlated transcript load state + display-only prefix marker/syntax classes + explicit theme/type-scale tokens.

### Decision Log

- 2026-04-29T20:04:39Z — User chose to start fresh instead of resuming completed issues 0014-0019 iteration.
- 2026-04-29T20:04:39Z — User confirmed Phase 0 understanding with `go` for implementing issues 0020-0023 together.
- 2026-04-29T20:29:00Z — User approved Phase 1 assertion changes and chose to proceed with Phase 2 implementation.

### Look Back

- 2026-04-29T20:12:32Z — First stubber dispatch returned 0 wishes; retrying Phase 1 with narrower file-level context because the requirement clearly needs code/test changes.
- 2026-04-29T21:30:35Z — Layer 2 wishes show `fail` in status because implementer_post ran full tests while downstream stubs were still pending; later full-suite verification passes after layer 1/0, so treating the layer 2 code as complete for Phase 3.
