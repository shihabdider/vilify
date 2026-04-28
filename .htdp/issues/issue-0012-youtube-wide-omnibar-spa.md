---
id: issue-0012
status: done
type: feature
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on:
  - issue-0011
remote:
  github: null
---

# Enable the omnibar on all YouTube pages and survive SPA navigation

## What to build

Broaden Vilify's YouTube activation from direct-loaded watch pages to all YouTube pages. Pressing `:` should open the omnibar anywhere on YouTube, including home, search, channel, playlist, Shorts, and watch pages, without requiring a hard reload after YouTube client-side navigation.

The extension should still remain inactive on Google and non-YouTube pages. Commands that need a native video element or current video id should keep the existing safe behavior: execute when the required platform data exists, otherwise return a status/noop outcome rather than clicking visible YouTube controls or mutating page layout.

## Acceptance examples

- [x] Given a direct load of YouTube home, search results, a channel page, a playlist page, Shorts, or a watch page, when focus is not inside an editable target and the user presses `:`, then the Vilify omnibar opens.
- [x] Given a YouTube page that was loaded on home/search/channel and then navigated by YouTube's client-side router to a watch page, when the user presses `:` without hard-refreshing, then the omnibar opens and watch/video commands use the current page state.
- [x] Given a YouTube watch page that was reached through client-side navigation from another YouTube page, when transcript search is selected, then transcript mode uses the current video id and structured bridge data for the active watch page.
- [x] Given a YouTube non-watch page with no native video element or current video id, when a video-only or transcript-only action is invoked, then Vilify shows a status/noop outcome instead of throwing, clicking YouTube controls, or scraping visible UI.
- [x] Given a Google page or unrelated site, when the user presses `:`, then Vilify renders no UI and does not intercept the key.
- [x] Given any supported YouTube page with the omnibar closed, when normal YouTube/browser shortcuts other than `:` are used, then Vilify leaves them alone.
- [x] Given focus is in an `input`, `textarea`, `select`, or `contenteditable` element on any YouTube page, when the user types `:`, then Vilify leaves the event alone.

## Data definition impact

Expected new or changed definitions:

- Broaden the YouTube plugin/page-support definition from `isYouTubeWatchUrl` to a YouTube-host-level support predicate, while preserving watch/video id helpers for capability checks.
- Add a small YouTube page/capability context if needed, e.g. current URL, current video id, and native video availability.
- Update provider/action context reads so current URL/video id are evaluated at execution/render time and remain correct after YouTube SPA navigation.
- Manifest content script matches should include all YouTube paths, not only `/watch*`.

## HtDP entry note

Phase 0 problem statement: make Vilify's omnibar available across YouTube, not just direct-loaded watch pages. The goal is activation/runtime robustness, not reintroducing the old full-site focus mode. Keep the current narrow omnibar product shape and safe command adapters; do not add listing UI, drawers, comments UI, Google support, or visible-control automation.

Constraints:

- Do not activate on Google or non-YouTube pages.
- Do not reintroduce ambient multi-key shortcuts; closed state should still intercept only `:`.
- Do not scrape visible YouTube UI or click visible controls to make commands work.
- Do not duplicate omnibar roots/listeners across YouTube SPA navigations.
- Keep transcript data flowing through the structured bridge protocol.

## Verification

- `bun run build`
- `bun run test`
- Manifest tests proving all YouTube paths are matched and Google is not.
- Content/runtime tests proving `:` opens on YouTube non-watch pages and ignores editable targets.
- SPA-style jsdom tests simulating URL changes from non-watch to watch pages without reinitializing the extension.
- Transcript/provider tests proving current video id is read after navigation.
- Manual browser smoke test: load YouTube home, press `:`, navigate to a video without reload, press `:`, enter transcript mode if available, and verify native shortcuts still work while closed.

## Blocked by

- None - can start immediately.

## HtDP iterations

- Completed in YouTube-wide omnibar / SPA iteration on 2026-04-28; version bumped through `0.6.78`; final preverify passed (`bun run build`, `bun run test`), and human verification items passed.

## Out of scope

- Google support.
- Full focus-mode/page replacement.
- YouTube listing renderers, drawers, comments UI, or persistent sidebars.
- Watch Later/dismiss/subscribe mutations.
- Captions/theater/fullscreen automation through visible YouTube controls.
- New non-YouTube plugins.
