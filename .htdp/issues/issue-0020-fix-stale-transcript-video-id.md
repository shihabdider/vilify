---
id: issue-0020
status: draft
type: bug
mode: HITL
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on: []
remote:
  github: null
---

# Fix transcript fetching for captioned YouTube videos

## What to build

Make transcript mode and the `t/` prefix reliably fetch and display transcript lines for the currently active YouTube video. The previous HtDP iteration fixed stale request/response identity in the provider cache, but final manual verification still failed on a captioned video with `caption-parse-failed`.

Current failing evidence:

- Video: `https://www.youtube.com/watch?v=xmkSf5IS-zw`
- Browser evidence: YouTube shows `Subtitles/CC (2)` for this video.
- Vilify result after typing `t/`: `Transcript unavailable` / `Could not load this transcript (caption-parse-failed).`
- Upstream evidence: [`tombulled/innertube#87`](https://github.com/tombulled/innertube/issues/87) is open for InnerTube API calls returning `400 Bad Request` / `Precondition check failed`, so Vilify should not rely on direct InnerTube `get_transcript` success for this slice.
- Screenshots:
  - Failure: `/var/folders/vb/vpcg5jdd3xsbq6xd77tv1x0jdgfsjw/T/pi-clipboard-caf0af53-d9ae-4368-8d48-e9b590c749b6.png`
  - YouTube CC evidence: `/var/folders/vb/vpcg5jdd3xsbq6xd77tv1x0jdgfsjw/T/pi-clipboard-319fc6cf-68c2-4398-aaa1-a9e0b49573c6.png`

The next iteration should focus on structured transcript retrieval and parsing/fallback correctness for videos where YouTube has captions, not on DOM transcript-panel scraping. Treat the direct InnerTube transcript path as an unreliable first attempt while the upstream issue is open; the practical fix path is robust caption-track fallback and source-specific diagnostics.

## Acceptance examples

- [ ] Given `https://www.youtube.com/watch?v=xmkSf5IS-zw` shows YouTube `Subtitles/CC (2)`, when the user opens Vilify and types `t/`, then transcript lines render instead of `Transcript unavailable (caption-parse-failed)`.
- [ ] Given InnerTube `get_transcript` returns the upstream `400 Bad Request` / `Precondition check failed` failure tracked in `tombulled/innertube#87`, when structured caption tracks exist, then Vilify records a source-specific InnerTube failure and continues to caption-track fallback before reporting unavailable.
- [ ] Given a caption track response is in a YouTube-supported structured caption format, when Vilify fetches it, then the parser either returns timestamped `TranscriptLine` values or falls back to another structured track/format before reporting unavailable.
- [ ] Given transcript fetch/parsing genuinely fails after all structured fallbacks, when Vilify reports unavailable, then the reason identifies the failed source/format enough to debug without inspecting visible YouTube UI.
- [x] Given transcript fetch for video A is pending, when YouTube SPA navigation changes the active video to video B before the response resolves, then the response for A is ignored for B and does not become a terminal unavailable status for B.
- [x] Given the bridge or structured YouTube globals temporarily report an old video id while the URL/runtime reports a new active video id, when transcript mode requests data, then Vilify applies one explicit current-video identity policy instead of permanently caching a mismatch as unavailable.

## Data definition impact

Likely changes are now around structured transcript source/fetch/parse diagnostics, not just provider cache identity. Consider adding or refining data definitions for transcript source attempts, InnerTube HTTP/upstream failure classification, caption fetch attempts, caption response format/source, parser failure reason, and fallback ordering so `innertube-fetch-failed` and `caption-parse-failed` can be tested with fixtures and not treated as terminal black boxes. Preserve the invariant that cached transcript results are keyed by the video they belong to.

## HtDP entry note

Phase 0 problem statement: finish the transcript user story for real captioned YouTube videos. A previous iteration implemented request identity, stale response discard/retry behavior, and prefix marker/display work through version `0.6.98`; symbolic tests pass, but manual verification failed for `xmkSf5IS-zw` with `caption-parse-failed` despite YouTube showing captions. A known upstream InnerTube issue (`tombulled/innertube#87`) reports transcript/API requests failing with `400 Bad Request` / `Precondition check failed`, so do not spend this slice assuming direct InnerTube `get_transcript` can be made reliable. Start from the structured bridge/parser path: inspect caption-track URL construction, response text, parser assumptions, and fallback order using fixtures where possible.

Constraints:

- Do not scrape YouTube's visible transcript panel.
- Do not click `Show transcript`, captions menus, or other visible controls as the feature strategy.
- Keep using structured YouTube protocols/data and caption track URLs.
- Prefer robust caption-track fallback over visible UI scraping while the InnerTube upstream issue remains open.
- Keep the stale response discard/retry behavior from the previous iteration.

## Verification

- `bun run build`
- `bun run test`
- Unit tests with fixture caption responses that reproduce or guard against `caption-parse-failed` for supported YouTube caption formats.
- Unit tests or bridge tests proving an InnerTube `400 Bad Request` / `Precondition check failed` response falls through to caption-track attempts with useful diagnostics.
- Provider/bridge tests confirming stale responses still discard/retry and true unavailable states remain tied to the requested active video.
- Manual YouTube smoke test on `https://www.youtube.com/watch?v=xmkSf5IS-zw`: open `:`, type `t/`, confirm transcript results render.

## Blocked by

- Upstream InnerTube API regression tracked at [`tombulled/innertube#87`](https://github.com/tombulled/innertube/issues/87) prevents treating direct InnerTube `get_transcript` as reliable; continue via caption-track fallback and do not mark InnerTube-specific behavior complete until upstream is resolved or independently verified.
- Manual browser verification is required before marking done, because the failure is against live YouTube caption data.

## HtDP iterations

- 2026-04-29: Implemented transcript request identity, stale response discard/retry settlement, cache-key isolation, and tests through version `0.6.98`. `bun run build` and `bun run test` passed, but final manual verification failed on `xmkSf5IS-zw` with `caption-parse-failed`; this issue remains open for structured caption parsing/fallback correctness.
- 2026-04-29: Added upstream blocker context from [`tombulled/innertube#87`](https://github.com/tombulled/innertube/issues/87): InnerTube transcript/API calls can return `400 Bad Request` / `Precondition check failed`, so the next implementation pass should prioritize caption-track fallback and source-specific diagnostics rather than depending on direct InnerTube success.

## Out of scope

- Scraping or opening YouTube's visible transcript panel.
- Persistent transcript sidebars/drawers.
- Non-YouTube transcript providers.
- Visual alignment/palette work; see `issue-0024` for the remaining alignment polish.
