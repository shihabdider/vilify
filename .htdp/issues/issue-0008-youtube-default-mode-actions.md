---
id: issue-0008
status: draft
type: feature
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on:
  - issue-0007
remote:
  github: null
---

# Populate the YouTube default mode with navigation and video actions

## What to build

Populate the YouTube default omnibar mode with URL navigation commands and basic video actions that obey the reliability boundary. Commands should be discoverable through query filtering and should execute through typed `OmnibarAction` variants rather than ad hoc DOM choreography.

Initial command set:

- Navigate to Home, Subscriptions, Watch Later, History, and Library using YouTube URLs.
- Play/pause the native video element.
- Seek relative amounts through `HTMLVideoElement.currentTime`.
- Set common playback rates through `HTMLVideoElement.playbackRate`.
- Copy the current URL.
- Copy the current URL at the current playback time.
- Omit copy-title unless structured player metadata is already available through the bridge contract; do not read title text from visible DOM.

## Acceptance examples

- [ ] Given the YouTube default mode is open with an empty query, when results render, then navigation and platform video action commands are present with stable ids, labels, kinds, and keywords.
- [ ] Given the query matches a navigation command, when the user presses Enter on that item, then `location.assign` or an equivalent navigation adapter is called with the expected YouTube URL.
- [ ] Given a watch page with a native `HTMLVideoElement`, when the user runs play/pause, then Vilify calls `play()` or `pause()` on the video element without clicking YouTube controls.
- [ ] Given a watch page with current time `100`, when the user runs a relative seek command, then the video element's `currentTime` changes by the command's seconds and clamps to a valid time range when duration is known.
- [ ] Given a watch page with a native video element, when the user runs a playback-rate command, then the video element's `playbackRate` is set to the selected rate.
- [ ] Given a watch URL and current playback time, when the user runs copy URL at current time, then the copied URL contains the current video id and an appropriate `t=` value.
- [ ] Given no native video element is available, when a video action is selected, then the omnibar returns a status/noop outcome instead of throwing or touching visible YouTube UI.

## Data definition impact

Expected new or changed definitions:

- Complete `OmnibarItemKind` variants needed for `navigation`, `video-action`, `command`, and `status`.
- Complete typed `OmnibarAction` variants for `navigate`, `copy`, `seek`, `playPause`, `setPlaybackRate`, and `noop`.
- Small platform adapters for navigation, clipboard, video lookup, seeking, and playback rate that are mockable in tests.
- YouTube default-mode provider definitions for navigation and video actions.

## HtDP entry note

Phase 0 problem statement: deliver the first useful YouTube omnibar behavior without relying on target-site controls or the old command engine. The default mode should offer keyboard-driven navigation and native video actions through typed actions and platform adapters.

Constraints:

- Use URL navigation, Clipboard API, and `HTMLVideoElement` APIs only.
- Do not click YouTube buttons, drive menus, scrape visible text, or use old Watch Later/dismiss/subscribe flows.
- Keep transcript entry/loading out of this issue except for preserving any mode shell introduced earlier.
- Prefer typed action variants over `custom`; if `custom` is unavoidable, document why it still obeys the reliability boundary.

## Verification

- `bun run build`
- `bun run test`
- Unit tests for provider output, query filtering, stable ids/kinds, and action construction.
- Unit tests for action executor adapters: navigation, copy, seek, play/pause, playback rate, missing-video status, and URL-at-time formatting.
- Manual YouTube watch-page smoke test for representative navigation, play/pause, seek, speed, copy URL, and copy URL at time.

## Blocked by

- None beyond `depends_on`.

## HtDP iterations

- None yet.

## Out of scope

- Transcript retrieval and transcript search.
- Watch Later add/remove mutation.
- Subscribe/unsubscribe, dismiss, captions, theater, fullscreen, comments, drawers, or page-layout replacement.
- Google commands.
