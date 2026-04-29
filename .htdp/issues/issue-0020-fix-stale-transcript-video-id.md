---
id: issue-0020
status: draft
type: bug
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on: []
remote:
  github: null
---

# Fix stale transcript responses after active video changes

## What to build

Make transcript mode and the `t/` prefix reliably fetch and display transcript lines for the currently active YouTube video. When YouTube SPA navigation or bridge timing produces a response for an earlier video, Vilify should not turn that stale response into a final “transcript unavailable” result for the current video; it should discard or isolate the stale response and allow a fresh request for the active video.

The observed failure is an unavailable row that says: `Transcript response was for xmkSf5IS-zw. Active video is A04b-52jtos.` This happened on a video that should have transcript data.

## Acceptance examples

- [ ] Given the active YouTube video is `A04b-52jtos` and it has transcript data, when the user opens the omnibar and types `t/`, then transcript fetching is correlated with `A04b-52jtos` and transcript results for that video can render.
- [ ] Given transcript fetch for video A is pending, when YouTube SPA navigation changes the active video to video B before the response resolves, then the response for A is ignored for B and does not become a terminal unavailable status for B.
- [ ] Given the bridge or structured YouTube globals temporarily report an old video id while the URL/runtime reports a new active video id, when transcript mode requests data, then Vilify applies one explicit current-video identity policy instead of permanently caching a mismatch as unavailable.
- [ ] Given a video truly has no transcript available, when transcript mode settles, then the unavailable reason is tied to the current active video id and is not caused solely by a stale response for a previous video.

## Data definition impact

Expected changes around transcript request identity and load state. Options include adding an explicit requested video id, request generation token, or stale-response state to the transcript provider/bridge boundary. Preserve the invariant that cached transcript results are keyed by the video they belong to, not by whatever video happens to be active when an async response resolves.

## HtDP entry note

Phase 0 problem statement: fix the transcript mismatch bug shown in the screenshot where transcript mode reports a response for one video while the active video is another. Keep the v1 reliability boundary: use structured YouTube protocols/data and native video APIs only; do not click or scrape the visible transcript panel. The implementation should be small and evidence-backed, with tests that simulate pending transcript requests across active-video changes.

## Verification

- `bun run build`
- `bun run test`
- Unit/provider tests for stale response isolation, retry/fresh request behavior for the active video, and cache keys by video id.
- Bridge/client tests, if needed, for mismatched requested-vs-returned video ids.
- Manual YouTube smoke test on a known video with transcripts: open `:`, type `t/`, confirm transcript results render instead of the mismatch unavailable row.

## Blocked by

- None - can start immediately.

## HtDP iterations

- None yet.

## Out of scope

- Scraping or opening YouTube's visible transcript panel.
- Persistent transcript sidebars/drawers.
- Non-YouTube transcript providers.
- Broad rewrites of the omnibar runtime unrelated to transcript request identity.
