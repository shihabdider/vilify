---
id: prd-0001
status: draft
source: conversation
related_issues:
  - .htdp/issues/issue-0005-backup-reset-scaffold.md
  - .htdp/issues/issue-0006-omnibar-opener-primitive.md
  - .htdp/issues/issue-0007-plugin-registry-youtube-shell.md
  - .htdp/issues/issue-0008-youtube-default-mode-actions.md
  - .htdp/issues/issue-0009-youtube-bridge-protocol.md
  - .htdp/issues/issue-0010-transcript-mode-provider.md
  - .htdp/issues/issue-0011-retire-legacy-scope-docs.md
related_architecture:
  - .htdp/architecture/review-0001-render-site-boundaries.md
remote:
  github: null
---

# Vilify Omnibar Reset

## Problem Statement

Vilify has grown into a broad, custom UI replacement layer for target websites. It currently includes focus-mode page replacement, custom listing UIs, drawers, comments rendering, Google-specific overlays, YouTube listing navigation, Watch Later/dismiss mutations, and many direct keybindings. This makes the extension powerful but brittle: when a target site changes DOM structure or visible controls, Vilify breaks or requires maintenance.

The desired product direction is narrower: Vilify should add Vim-like ergonomics to frequently visited websites without taking over those websites' UIs. It should feel like a small keyboard command layer over native sites, not a parallel application shell.

## Desired Outcome

Vilify is rebuilt as a focused, low-maintenance browser extension with these properties:

- One custom UI primitive: a small Spotlight-like omnibar/dropdown.
- The omnibar is available only on supported target pages.
- When closed, Vilify intercepts only the opener key (`:`) and otherwise leaves the site/browser untouched.
- All user-facing commands run through the omnibar; ambient multi-key bindings are removed.
- Site integrations use only web platform APIs and structured site protocols/data.
- Features requiring visible UI controls, hidden menu choreography, DOM scraping, or page-layout replacement are removed or deferred.
- Initial active scope is YouTube watch pages plus YouTube URL navigation.
- Google support and the current full focus-mode/listing UI are removed from active scope.
- The current implementation is preserved on a backup branch and tag before greenfield work begins.

## User Stories / Scenarios

1. As a user watching a YouTube video, I want to press `:` to open a small omnibar, so that I can run commands without replacing the YouTube page.
2. As a user, I want the omnibar to show YouTube navigation commands such as Home, Subscriptions, Watch Later, History, and Library, so that I can navigate quickly using the keyboard.
3. As a user, I want to enter a transcript-search mode from the omnibar, search transcript lines, and press Enter to jump to a timestamp, so that I can find moments in a video quickly.
4. As a user, I want basic video actions such as play/pause, seek, set speed, copy current URL, and copy URL at current time to be available from the omnibar, so that I can avoid mouse interactions without relying on fragile page controls.
5. As a maintainer, I want site-specific functionality to be organized as small plugins/modes/providers, so that future sites can be added without recreating the old full-site app abstraction.
6. As a maintainer, I want transcript retrieval to use structured YouTube protocols, not transcript panel DOM scraping, so that the feature is less likely to break when YouTube changes visible UI.

## Domain Terms and Data Definitions

### Reliability boundary

`AllowedInteraction` is one of:

```ts
type AllowedInteraction =
  | { kind: 'web-platform-api' }
  | { kind: 'structured-site-protocol' };
```

Examples:

- Web platform APIs: `URL`, `location`, `history`, `HTMLVideoElement.currentTime`, `HTMLVideoElement.play()`, `HTMLVideoElement.pause()`, Clipboard API, focus management for Vilify's own input.
- Structured site protocols/data: YouTube `ytInitialData`, `ytInitialPlayerResponse`, InnerTube transcript endpoint, caption track URLs/base URLs from structured player response, Google URL params if Google is reintroduced later.

Disallowed for core features:

- Clicking visible target-site buttons as a normal strategy.
- Driving hidden menus.
- Scraping visible UI text or layout.
- Replacing target-site layout with Vilify's own full page/listing UI.
- Ambient keybinding systems beyond the omnibar opener.

### Omnibar runtime

The omnibar runtime owns generic UI state only:

```ts
interface OmnibarState {
  open: boolean;
  query: string;
  selectedIndex: number;
  modeStack: OmnibarModeId[];
}
```

Constraints:

- Closed state intercepts only `:` on supported pages and ignores normal site/browser behavior.
- Open state owns text input, result navigation, Enter, and Escape.
- Escape should close the omnibar or pop back from a nested mode according to mode stack rules.

### Site plugin

A site plugin is stateless configuration. It answers whether it applies and declares user-facing omnibar modes.

```ts
interface SitePlugin {
  id: string;
  matches(url: URL): boolean;
  modes: OmnibarMode[];
  bridge?: BridgeSpec;
}
```

Constraints:

- No persistent app state.
- No render hooks for target pages.
- No page lifecycle framework.
- No ambient keybinding declarations except relying on the global `:` opener.

### Mode and provider split

A mode is the frontend/user-facing state. Providers are backend/data/action sources inside a mode.

```ts
interface OmnibarMode {
  id: string;
  title: string;
  placeholder: string;
  providers: OmnibarProvider[];
}

interface OmnibarProvider {
  id: string;
  getItems(ctx: ProviderContext, query: string): Promise<OmnibarItem[]> | OmnibarItem[];
}
```

Rationale:

- Modes define title, placeholder, empty/loading copy, selection/ranking behavior, and mode semantics.
- Providers return data-backed or command-backed items.
- A future mode may be hydrated by multiple providers, e.g. a `jump` mode containing chapters plus transcript lines.

### Provider-owned state, until proven otherwise

Providers may own narrow state/caches. The initial design deliberately avoids a per-site runtime container until shared provider state is proven necessary by concrete examples.

Examples:

```ts
interface TranscriptProviderState {
  cacheByVideoId: Map<string, TranscriptLoadState>;
}

type TranscriptLoadState =
  | { status: 'idle' }
  | { status: 'loading'; promise: Promise<TranscriptResult> }
  | { status: 'loaded'; result: TranscriptResult }
  | { status: 'unavailable'; reason: string };
```

Extraction rule:

- If two or more providers need the same mutable resource, extract a small shared store/resource at that time using HtDP examples.
- Do not introduce a broad `SiteRuntime` state object in v1.

### Omnibar item and action

```ts
type OmnibarItemKind =
  | 'command'
  | 'navigation'
  | 'video-action'
  | 'search-result'
  | 'status';

interface OmnibarItem {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  kind: OmnibarItemKind;
  action: OmnibarAction;
}

type OmnibarAction =
  | { type: 'navigate'; url: string }
  | { type: 'copy'; text: string }
  | { type: 'seek'; seconds: number }
  | { type: 'playPause' }
  | { type: 'setPlaybackRate'; rate: number }
  | { type: 'enterMode'; modeId: string }
  | { type: 'noop'; reason?: string }
  | { type: 'custom'; run: (ctx: ActionContext) => Promise<void> | void };
```

Constraints:

- Prefer typed actions over `custom`.
- `custom` must still obey the reliability boundary.
- Transcript result Enter uses `{ type: 'seek', seconds }`, implemented through `HTMLVideoElement.currentTime`.

### YouTube v1 plugin

```ts
const youtubePlugin: SitePlugin = {
  id: 'youtube',
  matches: (url) => isYouTubeWatchUrl(url),
  modes: [youtubeDefaultMode, youtubeTranscriptMode],
  bridge: youtubeBridgeSpec,
};
```

Initial modes:

- `default`: YouTube URL navigation and basic video actions.
- `transcript`: transcript line search, loaded lazily and cached per video ID.

Initial YouTube providers:

- Navigation provider: Home, Subscriptions, Watch Later, History, Library.
- Video actions provider: play/pause, seek relative, set playback rate, copy URL, copy URL at current time, copy title if available from structured player data.
- Transcript provider: fetch/search transcript lines for the current video.

### Transcript retrieval

Preferred strategy:

1. Main-world bridge reads structured YouTube data/protocols.
2. Try InnerTube `get_transcript` using params from `ytInitialData.engagementPanels`.
3. Fall back to caption track URLs from structured player response, fetching XML or `fmt=json3`.
4. Return structured transcript lines to the content script.

```ts
interface TranscriptLine {
  time: number;
  timeText: string;
  duration: number;
  text: string;
}

type TranscriptResult =
  | { status: 'loaded'; videoId: string; lines: TranscriptLine[]; language: string | null }
  | { status: 'unavailable'; videoId: string; reason: string };
```

Not allowed:

- Automatically clicking "Show transcript".
- Scraping YouTube transcript panel DOM.
- Rendering a persistent transcript sidebar/drawer.

## Candidate Implementation Shape

### Greenfield reset

Implementation should start from a greenfield rewrite on `main` after backing up the current implementation:

- Branch: `backup/pre-omnibar-reset`
- Tag: `pre-omnibar-reset-2026-04-27`

Reuse only small proven ideas/modules from the old implementation:

- Current InnerTube transcript approach in `src/sites/youtube/data-bridge.ts`.
- Caption-track fallback ideas from inspected transcript repos and current YouTube data code.
- Timestamp formatting helper ideas.
- Clipboard helper ideas if still useful.
- Tests/fixtures rewritten around the new product scope.

Do not reuse the old architecture stack:

- focus-mode shell
- custom list rendering
- drawers
- generic site `PageConfig` app framework
- ambient keyboard command engine
- Google modules
- YouTube comments UI
- Watch Later/dismiss/subscribe menu flows

### Runtime surfaces

Use a minimal Manifest V3 TypeScript extension with two surfaces:

1. Isolated-world content script:
   - detect active plugin by URL
   - listen for `:` only when closed
   - render and operate the omnibar
   - execute web-platform actions
   - talk to bridge for structured protocol data

2. Main-world YouTube bridge:
   - capture structured YouTube globals/data
   - service typed bridge requests such as transcript fetch and current video metadata
   - avoid DOM UI interactions

### Plugin registry

A tiny registry selects one active plugin at a time based on URL.

```ts
function getActivePlugin(url: URL, plugins: SitePlugin[]): SitePlugin | null;
```

No multi-plugin composition is required in v1, but the omnibar should not hard-code YouTube.

## Unknowns That Matter

- [open] Exact Escape behavior in nested modes: Escape may close the omnibar immediately or pop from `transcript` back to `default` first. This affects mode stack examples and tests.
- [open] Exact syntax for entering transcript mode: select "Search transcript" from default mode, use a prefix command, or support both. This affects discoverability and ranking tests.
- [open] Whether `copy title` should rely only on structured player data; if unavailable, it may need to be omitted rather than read from DOM.
- [open] Which basic video actions make v1: play/pause, relative seek, set speed, copy URL, copy URL at time are likely; fullscreen/theater/captions are excluded unless implemented through stable platform/protocol affordances.
- [open] How much visual styling the omnibar should have beyond being unobtrusive and site-scoped.

## Testing / Verification Plan

Automated checks:

- `bun run build`
- `bun run test`
- TypeScript compile check once dependencies are installed consistently.

Core tests:

- Plugin registry chooses YouTube plugin only for YouTube watch URLs.
- Closed-state keyboard handler intercepts only `:` and ignores inputs/editable targets.
- Omnibar open-state handles query input, result navigation, Enter, and Escape.
- Mode stack behavior for default/transcript transitions.
- Providers return expected items for empty and non-empty queries.
- Typed actions execute platform behavior through small adapters that are mockable in tests.

YouTube protocol tests:

- InnerTube transcript parser fixture tests using captured `get_transcript` response shapes.
- Caption-track fallback parser tests for XML and `json3` payloads.
- Bridge request/response tests for success, unavailable, timeout, and stale video ID.
- Transcript provider cache tests keyed by video ID.

Behavioral/manual checks:

- On a YouTube watch page, pressing `:` opens omnibar.
- On non-watch pages and Google pages, Vilify does nothing in v1.
- Typing/selecting YouTube navigation commands navigates by URL.
- Transcript search returns timestamped lines and Enter seeks the native video element.
- If transcript retrieval fails, omnibar shows an unavailable/status item and does not mutate page UI.
- Normal YouTube keyboard shortcuts/browser behavior work when omnibar is closed.

Tests should not assert fragile target-site DOM selectors or visible layout details outside Vilify's own omnibar DOM.

## Out of Scope

- Google support.
- Full-site focus mode.
- Replacing YouTube listings, comments, or watch-page layout.
- YouTube listing/search/subscriptions result navigation.
- Watch Later add/remove/undo mutations.
- "Not interested" / dismiss mutations.
- Subscribe/unsubscribe automation.
- Clicking YouTube visible controls for captions/theater/fullscreen as a core strategy.
- Persistent drawers, transcript sidebars, or comments panels.
- External transcript backend service.
- Cross-site provider composition beyond selecting one active plugin by URL.
- General browser bookmark/history/search integration.

## Issue Decomposition Notes

Suggested vertical slices:

1. **Backup and reset scaffold** — create/push backup branch and tag, then replace the active codebase with a minimal MV3 TypeScript skeleton. HITL because it is a destructive product reset.
2. **Omnibar primitive** — implement `:` opener, overlay UI, input, selection, Enter/Escape, and tests. AFK after visual constraints are accepted.
3. **Plugin registry and YouTube plugin shell** — add stateless `SitePlugin`, `OmnibarMode`, provider interfaces, and YouTube watch-page matching. AFK.
4. **YouTube default mode** — navigation commands and basic platform video actions. AFK if limited to platform APIs and URL navigation.
5. **YouTube bridge protocol** — typed main-world bridge for structured player/video data and transcript fetch requests. HITL/AFK depending on protocol fixture availability.
6. **Transcript mode/provider** — lazy transcript loading, per-video cache, search/ranking, and seek action. AFK after bridge contract is stable.
7. **Remove legacy scope from manifest and docs** — ensure Google and old focus-mode behavior are not active. AFK.

Sequencing constraints:

- Backup branch/tag must exist before destructive deletion.
- The omnibar primitive should land before plugin/provider complexity.
- Transcript search should not be implemented by scraping/clicking YouTube's visible transcript panel.

## Further Notes

Alignment decisions captured in this PRD:

- The extension should stop "completely changing the UI of targets."
- The product is now about adding Vim-like ergonomics to frequent websites.
- The only custom UI primitive is an unobtrusive Spotlight-like omnibar/dropdown.
- Transcript search remains in Vilify as a YouTube omnibar mode, not as a separate extension for now.
- Search confirmed that YouTube transcript extensions already exist; Vilify's differentiation is keyboard-first ergonomics and target-site protocol integration, not being a standalone transcript product.
- Inspected public transcript-extension repos mostly use DOM transcript panel scraping, caption-track URL fetching, external backends, or combinations thereof. DOM scraping is explicitly not the desired strategy. MIT code could be copied with attribution, but the preferred path is to reimplement the small protocol ideas and avoid GPL/no-license code.
- Current architecture review issues remain useful historical context but are superseded by the greenfield reset direction for implementation planning.
