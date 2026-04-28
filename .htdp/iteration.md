# Iteration

anchor: 13c8aece4a0eb5dd614a059dbafd798e281831e9
started: 2026-04-28T17:37:28Z
stubber-mode: data-definition-driven
workflow-mode: autonomous
language: TypeScript
transparent: true

## Source Artifacts

- PRD: .htdp/prds/prd-0001-omnibar-reset.md
- Issue: .htdp/issues/issue-0012-youtube-wide-omnibar-spa.md
- Architecture review: <none>

## Problem

Broaden Vilify's omnibar activation from direct-loaded YouTube watch pages to all YouTube pages, and make runtime/provider reads robust across YouTube SPA navigation without reintroducing focus mode, page replacement, visible-control automation, or Google support.

## Data Definition Plan

Change the YouTube support predicate from watch-with-video-id to YouTube-host-level support while preserving `getYouTubeVideoId`/watch helpers for capability checks. Reuse `SupportedPage`, `SitePlugin`, `ProviderContext`, and existing action/status result definitions unless implementation proves a small capability context is needed. Ensure provider/action code reads current URL/video id from live `Location`/`Document.location` at render/execution time rather than from the initial `activePlugin.url` snapshot. Broaden manifest content-script matches to all YouTube paths. Update docs/project notes that currently describe watch-page-only activation.

## Polya Ledger

### Knowns

- Current `youtubePlugin.matches` uses `isYouTubeWatchUrl`, so YouTube home/search/channel/playlist/Shorts are unsupported.
- Current manifest content scripts match only `*://youtube.com/watch*` and `*://*.youtube.com/watch*`.
- Current `initContentScript` installs one omnibar runtime when the content script loads on a supported plugin page.
- Current transcript provider already tries `context.location`, `context.document?.location`, `globalThis.location`, then initial `activePlugin.url` for video id resolution.
- Current native video actions use the live document query for `video` and already return status results when no native video element exists.
- Current version is `0.6.66` after issue 0013.

### Constraints

- Do not activate on Google or non-YouTube pages.
- Do not reintroduce ambient multi-key shortcuts; closed state should still intercept only `:` outside editable targets.
- Do not scrape visible YouTube UI or click visible controls to make commands work.
- Do not duplicate omnibar roots/listeners across YouTube SPA navigations.
- Keep transcript data flowing through the structured bridge protocol.
- Shorts pages should be supported for omnibar activation, but not treated as watch/video-id transcript pages in v1.
- Bump both `package.json` and `manifest.json` for implementation changes, then commit and push.

### Unknowns That Matter

- [resolved by user go] Shorts activation is in scope, but Shorts path IDs should not be added as transcript/watch video IDs because the user does not watch Shorts.

### Out of Scope

- Google support.
- Full focus-mode/page replacement.
- YouTube listing renderers, drawers, comments UI, or persistent sidebars.
- Watch Later/dismiss/subscribe mutations.
- Captions/theater/fullscreen automation through visible YouTube controls.
- New non-YouTube plugins.

### Assumptions

- A host-level predicate plus live URL reads is enough; no route observer is needed because the content script remains installed across YouTube SPA navigation once injected on any YouTube page.
- It is acceptable for transcript mode on non-watch pages and Shorts to show the existing no-active-video status item.
- Video actions on non-watch pages should rely on the existing live native-video lookup and return existing missing-video status if no `<video>` exists.
- Manifest matches should cover `*://youtube.com/*` and `*://*.youtube.com/*` without adding host permissions.

### Alternatives Considered

- Add a new `YouTubePageContext` struct carrying URL/video/native-video capabilities — deferred unless stubber/implementer finds stale reads or duplicated capability logic; current live `Location`/`Document` context appears sufficient.
- Add URL parsing for Shorts path IDs — rejected for v1 by user preference; Shorts activation is enough.
- Add a YouTube SPA route listener/re-installer — rejected unless tests show duplication/installation gaps; manifest-wide injection plus one runtime should survive client-side navigation.
- Chosen: broaden plugin/manifest support to all YouTube paths, keep watch/video helpers as capability gates, and make tests prove live URL reads after SPA-like URL changes.

### Decision Log

- 2026-04-28T17:37:28Z — Started issue 0012 after issue 0013 passed final human verification and was marked done.
- 2026-04-28T17:37:28Z — Reused prior user confirmation that Shorts do not need transcript/watch video-id semantics.

### Look Back

- Leave empty for now.
