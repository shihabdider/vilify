## Wish List

### Layer 4 (implement first)
- `isSupportedYouTubeUrl(url: URL): boolean` in `src/sites/youtube/url.ts`
  Purpose: Return true for YouTube host-level pages on `youtube.com` and `*.youtube.com` for any path, including home, search, channel, playlist, Shorts, watch-with-id, and watch-without-id; return false for Google, `youtu.be`, and unrelated hosts.
  Depends on: none
- `getYouTubeVideoId(url: URL | undefined): string | null` in `src/sites/youtube/url.ts`
  Purpose: Preserve watch-page capability detection by extracting only a non-empty `/watch?v=` video id from a YouTube URL and returning null for home/search/channel/playlist/Shorts/watch-without-id.
  Depends on: none
- `createYouTubeBridgeClient(env: YouTubeBridgeClientEnv = {}): YouTubeBridgeClient` in `src/sites/youtube/bridge-client.ts`
  Purpose: Send structured bridge metadata/transcript requests using the current video id at request time and classify stale responses when SPA navigation changes the active video before a response returns.
  Depends on: none
- `executeWithPlatform(action: OmnibarAction, context: OmnibarActionContext, platform: OmnibarActionPlatform): OmnibarActionExecution` in `src/omnibar/actions.ts`
  Purpose: Execute navigation/copy/video actions against live platform adapters, returning status/noop outcomes when a native video element is unavailable and never clicking visible YouTube controls or scraping visible UI.
  Depends on: none

### Layer 3
- `youtubePlugin.matches(url: URL): boolean` in `src/sites/youtube/plugin.ts`
  Purpose: Wire the YouTube plugin to host-level activation via `isSupportedYouTubeUrl` while keeping `getYouTubeVideoId` and `isYouTubeWatchUrl` as capability checks rather than activation gates.
  Depends on: isSupportedYouTubeUrl
- `resolveActiveVideoId(context: ProviderContext): string | null` in `src/sites/youtube/transcript-mode.ts`
  Purpose: Resolve the current watch video id at provider-render time from services and live `Location`/`Document.location` state after SPA navigation, returning null on YouTube non-watch pages and Shorts.
  Depends on: getYouTubeVideoId
- `createOmnibarActionExecutor(platformOverrides: Partial<OmnibarActionPlatform> = {}): OmnibarActionExecutor` in `src/omnibar/actions.ts`
  Purpose: Provide a default action executor whose current-URL and native-video adapters read live document/location state at execution time, so commands use the post-SPA page state.
  Depends on: executeWithPlatform

### Layer 2
- `detectSupportedPage(url: URL, plugins: readonly SitePlugin[] = sitePlugins): SupportedPage` in `src/content.ts`
  Purpose: Classify all YouTube host-level URLs as `{ kind: 'active-plugin' }` and Google/unrelated URLs as `{ kind: 'unsupported' }` without changing the existing `SupportedPage` union shape.
  Depends on: youtubePlugin.matches
- `createBridgeClientForContext(context: ProviderContext): YouTubeBridgeClient` in `src/sites/youtube/transcript-mode.ts`
  Purpose: Create or reuse the YouTube bridge client with a live `getCurrentVideoId` resolver so transcript requests after SPA navigation target the active watch page.
  Depends on: resolveActiveVideoId, createYouTubeBridgeClient
- `getTranscriptItems(state: TranscriptProviderState, createBridgeClient: (context: ProviderContext) => YouTubeBridgeClient, context: ProviderContext, query: string): readonly OmnibarItem[]` in `src/sites/youtube/transcript-mode.ts`
  Purpose: Render transcript-mode items from the current video capability: show a missing-video status on non-watch pages, start structured bridge loading for the current watch id, and avoid showing stale transcript lines after navigation.
  Depends on: resolveActiveVideoId, createBridgeClientForContext

### Layer 1
- `createOmnibarRuntime(options: OmnibarRuntimeOptions): OmnibarRuntime` in `src/omnibar/runtime.ts`
  Purpose: Keep the compact TUI omnibar runtime attached to a YouTube document across SPA navigation, intercept only `:` while closed outside editable targets, use live provider context for renders/actions, and avoid duplicate roots/listeners if initialization is invoked more than once for the same document.
  Depends on: createOmnibarActionExecutor, getTranscriptItems

### Layer 0 (implement last)
- `initContentScript(env: ContentScriptEnv = {}): SupportedPage` in `src/content.ts`
  Purpose: On direct load of any supported YouTube page, install or reuse the omnibar runtime exactly once with live `Document`/`Location` provider context; leave Google and unrelated sites inactive; preserve SPA navigation without hard refresh.
  Depends on: detectSupportedPage, createOmnibarRuntime

## Data Definitions Created/Modified
- None in this stub pass — existing `SupportedPage`, `SitePlugin`, `ProviderContext`, `OmnibarActionResult`, `TranscriptResult`, and bridge request/response definitions are sufficient; no new capability context was introduced.
- Planned implementation/config changes captured by the wishes: add/use `isSupportedYouTubeUrl` in `src/sites/youtube/url.ts` and `src/sites/youtube/plugin.ts`; broaden `manifest.json` content-script matches to all YouTube paths; bump `package.json` and `manifest.json` from `0.6.66` to `0.6.67`.

## Assertion Changes Flagged
- `src/manifest.test.ts:8`: `expect(packageJson.version).toBe('0.6.66')` — must change to the required `0.6.67` version bump.
- `src/manifest.test.ts:9`: `expect(manifest.version).toBe('0.6.66')` — must change to the required `0.6.67` version bump.
- `src/manifest.test.ts:28-31`: expected content-script matches currently require `*://youtube.com/watch*` and `*://*.youtube.com/watch*`; acceptance requires all YouTube paths instead.
- `src/manifest.test.ts:34`: `expect(matches.every((pattern: string) => pattern.endsWith('/watch*'))).toBe(true)` — must be replaced with an assertion that matches cover all YouTube paths while excluding Google.
- `src/content.test.ts:25`: `expect(detectSupportedPage(url)).toEqual({ kind: 'unsupported', url })` for a YouTube watch URL without `v` — host-level activation means this should become an active YouTube plugin page with no current video id.
- `src/content.test.ts:38`: `expect(detectSupportedPage(url)).toEqual({ kind: 'unsupported', url })` for YouTube home/search/channel/playlist/Shorts — these should become active YouTube plugin pages.
- `src/content.test.ts:130-137`: expectations that YouTube search gets no listener, no `:` interception, and no omnibar UI — this case must split from Google and expect YouTube activation instead.
- `src/plugins/registry.test.ts:44`: `expect(getActivePlugin(new URL(url), [youtubePlugin]), url).toBeNull()` currently covers YouTube non-watch/watch-without-id URLs; those YouTube cases should return `youtubePlugin`, while Google/unrelated cases remain null.
- `src/scope-audit.test.ts:35-36`: README assertions currently require watch-page-only wording; docs should describe all-YouTube activation with watch/video commands gated by page capability.

## Assumptions / Interpretations
- I interpreted “all YouTube pages” as `youtube.com` and `*.youtube.com` paths matched by the current manifest style, not `youtu.be`; adding `youtu.be` would change both support predicate and manifest scope.
- I interpreted `/watch` without a non-empty `v` parameter as activation-supported but video-id-unavailable, because the requested support predicate is host-level while `getYouTubeVideoId` remains the capability check.
- I preserved the explicit Shorts decision: Shorts pages activate the omnibar, but `/shorts/:id` is not a watch/transcript video id for v1.
- I interpreted “no duplicate roots/listeners” as at most one omnibar runtime per `Document`, including defensive behavior if `initContentScript` is called multiple times in tests or by future route hooks.
- I interpreted capability-unavailable commands as allowed to remain visible in the compact YouTube root mode, with execution returning status/noop outcomes, rather than hiding video/transcript commands on non-watch pages.
- I assumed the version bump is the next patch version, `0.6.67`, because the current version is `0.6.66` and no alternate version was specified.

## Notes
- Brownfield type search shows the existing `SupportedPage`, `SitePlugin`, `ProviderContext`, action-result, bridge, and transcript data shapes already model the needed branches; this issue is mainly a support predicate, manifest scope, live-context, and lifecycle/test update.
- `bun run build` and `bun run test` passed before writing this wish list against the current watch-page-only implementation.
- No test files were edited in this stub pass, so `diff-check` was not run.
- The working tree already had active HtDP artifacts modified/deleted before this pass; this pass restored `.htdp/wishes.md` with the new wish list only.
