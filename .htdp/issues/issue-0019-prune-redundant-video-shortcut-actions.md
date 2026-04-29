---
id: issue-0019
status: done
type: feature
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on: []
remote:
  github: null
---

# Prune video actions that duplicate default YouTube shortcuts

## What to build

Remove omnibar commands whose behavior is already covered by reliable default YouTube keyboard shortcuts, especially play/pause, relative seek, and playback speed changes. The default command surface should focus on fast search, navigation, transcript jumping, and commands that YouTube does not already make easy from the keyboard.

## Acceptance examples

- [x] Given the YouTube default mode opens with an empty query, when results render, then `Play / pause`, relative seek commands, and playback-rate commands are absent.
- [x] Given the user searches for `play`, `pause`, `seek`, or `speed`, when those terms only match removed shortcut-duplicate actions, then the removed video actions do not appear.
- [x] Given the default mode opens, when the user types a non-empty query or prefix, then navigation commands and transcript search remain available subject to page capability rules.
- [x] Given copy commands are not default YouTube keyboard shortcuts, when the command inventory is pruned, then copy-current-URL behavior is preserved unless a later product issue removes it explicitly.
- [x] Given action variants become unused after pruning, when the code is cleaned up, then unused typed actions/tests are removed only where they are not still needed by transcript seek or copy-at-current-time behavior.

## Data definition impact

Expected changes to the YouTube default command inventory and possibly the `OmnibarAction` union. `playPause` and `setPlaybackRate` may become unused and removable. The `seek` action likely remains because transcript results use absolute native video seeking. `OmnibarItemKind` may no longer need active default-mode `video-action` rows, but keep the type only if another current issue still uses it.

## HtDP entry note

Phase 0 problem statement: align the command surface with the user's stated product focus: fast search and navigation through Vim-style modal shortcuts. Do not keep commands just because the platform API can implement them; if native YouTube already has a stable shortcut, omit it from Vilify's omnibar. Avoid broad legacy video-control scope creep.

## Verification

- `bun run build`
- `bun run test`
- Provider inventory tests proving removed action ids are absent from empty and filtered results.
- Action/type cleanup tests adjusted so removed variants are not kept alive by obsolete tests.
- Manual smoke check that the default omnibar is shorter and focused on navigation/search/transcript/copy rather than native playback controls.

## Blocked by

- None - can start immediately.

## HtDP iterations

- Completed in combined HtDP iteration for issues 0014-0019 on 2026-04-29; final preverify passed (`bun run build`, `bun run test` with 121 tests), targeted palette/hints fix landed, and human final verification passed.

## Out of scope

- Removing transcript search or transcript-result seeking.
- Replacing YouTube's native keyboard shortcuts.
- Capability gating for remaining video-scoped commands; see `issue-0016`.
