---
id: issue-0003
status: superseded
type: architecture
mode: HITL
source_prd: null
source_architecture: .htdp/architecture/review-0001-render-site-boundaries.md
depends_on: []
remote:
  github: null
---

# Deepen the YouTube data and bridge boundary

> Superseded for implementation planning by `.htdp/prds/prd-0001-omnibar-reset.md` and reset issues `issue-0005` through `issue-0011`. Keep this as historical architecture context only.

## What to build

Make the YouTube data layer expose normalized page data and readiness through a deeper interface, while hiding bridge transport, cache details, DOM fallback, continuation merging, and command response wiring.

Start by typing and centralizing the current bridge event/command protocol. Then move toward a `YouTubeDataSnapshot` or equivalent provider interface that callers can use without knowing whether data came from bridge data, continuation data, or DOM fallback.

## Acceptance examples

- [ ] Given an `initialData` bridge event, when the data provider receives it, then callers can read a normalized snapshot with page type and videos without inspecting internal caches.
- [ ] Given continuation bridge data after initial videos, when callers request videos, then duplicates are removed by video id and the source/ready state remains observable for debugging.
- [ ] Given bridge data does not arrive before timeout, when callers request page data, then the provider returns DOM fallback data with an explicit readiness/source state.
- [ ] Given a watch page has both initial data and player response, when callers request watch data, then video context and recommendations are available from the same snapshot boundary.
- [ ] Given a Watch Later or transcript command is sent through the main-world bridge, when a matching response or timeout occurs, then listener cleanup and result mapping are handled by one typed command client/helper.
- [ ] Given unused bridge modules remain, when the issue is complete, then they are either removed or explicitly documented as adapters with references/tests.

## Data definition impact

Expected new or changed definitions:

- `YouTubeBridgeEvent`
- `YouTubeBridgeCommand`
- `YouTubeBridgeResponse`
- `YouTubeDataSnapshot`
- `YouTubeDataReadiness` / `DataSource`
- `NormalizedVideo` or a clarified boundary between `RawVideo` and `ContentItem`
- Possibly `BridgeRpcClient` or a narrower Watch Later command client

The design should preserve the distinction between bridge data and DOM fallback rather than hiding it entirely.

## HtDP entry note

Phase 0 problem statement: the data provider is useful but shallow. It mixes bridge event handling, cache state, continuation extraction, DOM fallback, readiness, normalization, and debug exposure. There are also unused bridge/interceptor modules and repeated Watch Later/transcript command request/response code. Introduce typed bridge protocol definitions and characterize current provider behavior before changing callers.

Constraints:

- Do not introduce a generic extension-wide RPC bus until YouTube-specific examples justify it.
- Keep `data-bridge.ts` as the manifest-built bridge unless replacing it deliberately.
- Add tests before removing unused bridge modules.
- Avoid changing YouTube user-visible behavior in the first slice.

## Verification

- `bun run build`
- `bun run test`
- New unit tests for data-provider bridge events, continuation merge/dedupe, DOM fallback, timeouts, and watch-data readiness.
- New unit tests for Watch Later and transcript command response matching and timeout cleanup.
- Manual YouTube smoke test for home/search listing data, watch page metadata, recommendations, and Watch Later add/remove/undo.

## Blocked by

- Human review of target interface depth: low-risk typed constants cleanup first, or direct migration to a snapshot provider.

## HtDP iterations

- None yet.

## Out of scope

- Rewriting all YouTube extractors from scratch.
- Changing the visual render pipeline.
- Generalizing the bridge for all future sites.
