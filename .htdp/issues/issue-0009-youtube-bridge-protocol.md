---
id: issue-0009
status: done
type: feature
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on:
  - issue-0007
remote:
  github: null
---

# Implement the typed YouTube main-world bridge protocol

## What to build

Implement a typed request/response bridge between the isolated content script and the main-world YouTube bridge for structured YouTube data. The bridge should expose current video metadata and transcript retrieval without using visible UI controls or transcript-panel DOM scraping.

Transcript retrieval should try structured approaches in order:

1. Use `ytInitialData.engagementPanels` transcript params with InnerTube `get_transcript`.
2. Fall back to caption track URLs/base URLs from `ytInitialPlayerResponse`, fetching XML or `fmt=json3` and normalizing the result.
3. Return a typed unavailable result when neither structured source works.

## Acceptance examples

- [ ] Given main-world structured player data contains `videoDetails`, when the isolated script requests current video metadata, then the bridge returns a typed response with video id and any structured title/duration fields available.
- [ ] Given `ytInitialData.engagementPanels` contains transcript params and InnerTube context is available, when the isolated script requests a transcript for the current video id, then the bridge posts `get_transcript` and returns normalized transcript lines.
- [ ] Given InnerTube transcript retrieval is unavailable but structured caption tracks exist, when transcript is requested, then the bridge fetches a caption track fixture shape and returns normalized lines.
- [ ] Given no structured transcript source exists, when transcript is requested, then the response is `{ status: 'unavailable', videoId, reason }` rather than a thrown error or DOM mutation.
- [ ] Given a request times out or the bridge is absent, when the isolated-side client resolves, then it removes listeners and returns a typed timeout/unavailable result.
- [ ] Given a response's video id no longer matches the active video id, when the isolated script receives it, then stale data is ignored or reported explicitly and not shown as current.
- [ ] Given bridge event names and request ids, when multiple concurrent requests run, then only the matching listener resolves and all listeners are cleaned up.

## Data definition impact

Expected new or changed definitions:

- `YouTubeBridgeRequest`, `YouTubeBridgeResponse`, and stable request id/event-name definitions.
- `YouTubeBridgeClient` or equivalent isolated-side command client with timeout cleanup.
- `VideoMetadata` from structured player data.
- `TranscriptLine` and `TranscriptResult` matching the PRD shape.
- `CaptionTrack` / caption parser data definitions for XML and `json3` fallback.
- Narrow bridge error/unavailable variants with machine-readable reasons.

## HtDP entry note

Phase 0 problem statement: keep YouTube protocol access behind a small typed main-world bridge. Reuse only proven ideas from the old `src/sites/youtube/data-bridge.ts` InnerTube transcript approach and timestamp formatting helpers; do not keep the old broad data-provider, Watch Later, or page-app bridge responsibilities alive.

Constraints:

- No automatic clicking of "Show transcript".
- No scraping visible transcript panel DOM.
- No persistent transcript sidebar or drawer.
- No Watch Later/dismiss/subscribe mutation commands.
- No generic extension-wide RPC bus unless the examples force it; keep the protocol YouTube-specific for v1.
- Prefer captured or synthetic fixtures for parser tests before live manual checks.

## Verification

- `bun run build`
- `bun run test`
- Fixture tests for InnerTube `get_transcript` response parsing.
- Fixture tests for caption XML and `json3` parsing.
- Unit tests for bridge client timeout, listener cleanup, concurrent request matching, unavailable results, and stale video id handling.
- Manual YouTube watch-page smoke test that metadata and transcript retrieval work without opening YouTube's transcript panel.

## Blocked by

- None beyond `depends_on`.

## HtDP iterations

- 2026-04-27: Added typed YouTube bridge request/response protocol, isolated bridge client, main-world listener, structured metadata extraction, InnerTube transcript parsing/fetch, caption fallback parsing, and tests.

## Out of scope

- Omnibar transcript search UI.
- Default-mode video action execution, except exposing structured metadata for commands that can use it.
- Any DOM-scraping fallback for transcript text.
- Cross-site bridge generalization.
