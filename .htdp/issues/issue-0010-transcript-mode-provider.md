---
id: issue-0010
status: done
type: feature
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on:
  - issue-0008
  - issue-0009
remote:
  github: null
---

# Add YouTube transcript search mode and provider

## What to build

Implement the YouTube transcript omnibar mode. The default mode should include a discoverable "Search transcript" item that enters the transcript mode. The transcript provider should lazily load transcript lines through the typed YouTube bridge, cache load state per video id, filter/rank lines by query, render timestamped results, and seek the native video element when the user selects a line.

This slice should preserve the v1 interaction defaults from the omnibar primitive: Escape in transcript mode pops back to the default mode, and Enter executes the selected transcript-line seek action.

## Acceptance examples

- [x] Given the YouTube default mode is open, when the user selects "Search transcript", then the omnibar enters transcript mode and updates title/placeholder to transcript-search copy.
- [x] Given transcript mode is entered for a video id with no cache entry, when results are requested, then the provider starts one bridge transcript request and shows a loading/status item until it resolves.
- [x] Given transcript mode is queried repeatedly while the first request is still pending, when provider results are requested, then all calls share the same per-video load state instead of sending duplicate bridge requests.
- [x] Given a loaded transcript, when the user types a query, then matching transcript lines are shown with timestamp, text, stable ids, and `search-result` kind.
- [x] Given a selected transcript result at time `123`, when the user presses Enter, then Vilify executes a typed seek action that sets the native video element to `123` seconds without clicking YouTube UI.
- [x] Given transcript retrieval returns unavailable, when transcript mode renders, then it shows an unavailable/status item and does not mutate the page outside Vilify's own omnibar DOM.
- [x] Given the active video id changes while a transcript request is pending, when the old response resolves, then stale lines are not shown for the new video.
- [x] Given transcript mode is open, when the user presses Escape, then the omnibar returns to the default mode according to the mode-stack rule.

## Data definition impact

Expected new or changed definitions:

- `TranscriptProviderState` with `cacheByVideoId`.
- `TranscriptLoadState` variants for `idle`, `loading`, `loaded`, and `unavailable`.
- Transcript search/ranking helper data definitions, if needed.
- Provider context fields for current video id and bridge client access.
- A transcript-mode provider that returns `OmnibarItem` values with `search-result` and `status` kinds.

## HtDP entry note

Phase 0 problem statement: deliver the transcript user story as an omnibar mode, not a drawer, sidebar, page replacement, or transcript-panel automation. The provider owns its narrow cache and uses the bridge contract to retrieve structured transcript lines.

Constraints:

- Do not scrape YouTube's visible transcript panel.
- Do not click "Show transcript" or any other visible control.
- Do not introduce a broad shared site runtime just for transcript cache; provider-owned cache is the v1 default.
- If two or more providers later need the same mutable resource, extract a shared store in a separate issue using concrete examples.

## Verification

- `bun run build`
- `bun run test`
- Unit tests for transcript mode entry item, cache state transitions, duplicate-request suppression, loaded filtering, unavailable status, stale video id handling, and seek action construction.
- Integration-style jsdom tests from omnibar default mode into transcript mode and back via Escape.
- Manual YouTube watch-page smoke test: open `:`, enter transcript mode, search a term, press Enter, and observe the native video seek.

## Blocked by

- None beyond `depends_on`.

## HtDP iterations

- 2026-04-28: Added the YouTube transcript omnibar mode/provider with provider-owned per-video cache, lazy bridge loading, duplicate pending request suppression, loaded filtering/ranking, unavailable/stale status handling, absolute native-video seek actions, runtime re-render callback for async provider settlement, tests, and version bump to 0.6.58.

## Out of scope

- Persistent transcript sidebar/drawer.
- Transcript editing/export.
- External transcript backend service.
- Chapter search or combined jump mode.
- Non-YouTube transcript providers.
