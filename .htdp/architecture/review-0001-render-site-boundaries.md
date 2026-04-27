---
id: arch-0001
status: draft
source_iteration: .htdp/iteration.md
related_prds: []
related_issues:
  - .htdp/issues/issue-0001-render-transaction-seam.md
  - .htdp/issues/issue-0002-site-adapter-contracts.md
  - .htdp/issues/issue-0003-youtube-data-boundary.md
  - .htdp/issues/issue-0004-watch-comments-window-state.md
remote:
  github: null
---

# Architecture Review: Render and Site Boundaries After the TypeScript Migration

## Scope

Reviewed the current Phase 4 surface after the JS→TS migration anchored at `3d7de2da46b83af1c67c190a1d4527a296fb2fe2`, with emphasis on the newly typed core/site boundary, render pipeline, YouTube data bridge, and watch page behavior.

Files inspected include `.htdp/iteration.md`, `.htdp/status.md`, `.htdp/wishes.md`, `src/types.ts`, `src/core/index.ts`, `src/core/view-tree.ts`, `src/core/apply-view.ts`, `src/core/keyboard.ts`, `src/sites/youtube/index.ts`, `src/sites/youtube/data/index.ts`, `src/sites/youtube/data-bridge.ts`, `src/sites/youtube/data/main-world-bridge.ts`, `src/sites/youtube/data/fetch-intercept.ts`, `src/sites/youtube/watch.ts`, `src/sites/youtube/commands.ts`, `src/sites/youtube/transcript.ts`, `src/sites/google/index.ts`, and relevant tests.

Verification commands run for evidence:

- `bun run build` — passed.
- `bun run test` — passed, 35 files / 966 tests.
- `npx tsc --noEmit --pretty false` — did not reach code checking because local `node_modules` is missing `@types/chrome` even though `package.json` declares it.

## Summary

The highest-leverage opportunity is to turn rendering into a real deep module. The repo already has `ViewTree` and `apply-view`, but production rendering mostly bypasses them, so render ordering, status bar updates, drawer handling, and watch-page post-render DOM patches remain concentrated in `src/core/index.ts` and site renderers. This is especially risky because the project already documents a fragile invariant: watch-page direct DOM updates must happen after a full re-render.

The second opportunity is to make the site adapter contract explicit. `SiteConfig`, `PageConfig`, `App`, keyboard bindings, commands, and page lifecycle contexts still expose broad `any`/`Function` surfaces. This makes the TypeScript migration compile through esbuild but does not yet make cross-module changes local or mechanically checkable.

The third opportunity is to deepen the YouTube data/bridge boundary. There is one manifest-built bridge plus two unused bridge/interceptor modules, duplicated event names, repeated request/response timeout code, and no direct data-provider tests. The current `DataProvider` is useful but still exposes transport/cache details and mixes bridge events, continuation parsing, DOM fallback, readiness, and normalization.

A smaller but concrete watch-page issue is comment pagination. `YouTubeState` includes comment pagination fields, but the watch renderer uses module globals for the actual window state. Tests mostly assert type shape rather than pagination behavior, which is evidence that the current seam is hard to test.

Implementation is recommended, but not as one large refactor. Start with `issue-0001-render-transaction-seam.md`; the other issues become safer after render ordering is explicit.

## Candidates

### 1. Make render a single transaction seam

**Files**
- `src/core/index.ts`
- `src/core/view-tree.ts`
- `src/core/apply-view.ts`
- `src/core/layout.ts`
- `src/sites/youtube/index.ts`
- `src/sites/youtube/watch.ts`
- `src/core/app-callbacks.test.ts`
- `src/core/view-tree.test.ts`

**Problem**

`src/core/index.ts` has a `render()` function that claims to use pure view computation followed by I/O application, but it manually computes status/content views and directly calls layout, palette, and drawer functions. `applyView`, `applyStatusBar`, `applyContent`, and `applyDrawer` are imported/re-exported but not used by the production render path. Site renderers also update status bar/counts directly.

The result is a shallow module boundary: callers still need to know render ordering, DOM container existence, drawer special cases, palette filtering, status bar focus rules, and watch-page post-render mutation rules.

**Evidence**

- `rg` shows `applyView`, `applyStatusBar`, `applyContent`, and `applyDrawer` are used only by tests/re-exports, not by the core render path.
- `resetViewState()` is called on navigation, but the `previousView` state it resets is otherwise unused by production rendering.
- `render()` in `src/core/index.ts` directly calls `updateStatusBar`, `updateSortIndicator`, `updateItemCount`, `renderListing`, `renderPalette`, `showPalette`, `hidePalette`, `renderDrawer`, and `closeDrawer`.
- `renderYouTubeListing()` and `renderGoogleListing()` also call `updateSortIndicator()` and `updateItemCount()`, duplicating status-bar responsibility outside the render module.
- `AGENTS.md` documents a fragile watch-page invariant: direct DOM updates must happen after `render()` because full re-render destroys prior elements.
- `handleAddToWatchLater()` performs a post-render direct DOM patch for `#vilify-wl-action`; `appCallbacks.updateSubscribeButton` performs similar targeted DOM mutation.
- Deletion test: most of `apply-view.ts` could be deleted without changing production behavior except for imports/re-exports and `resetViewState()`, so it does not currently buy locality.

**Proposed direction**

Create a render transaction module that owns the ordering from app state to DOM and makes post-render imperative patches explicit. `src/core/index.ts` should ask for one operation such as `renderAppFrame(context)`, not know which sub-DOM operations must happen in which order.

**Benefits**

- Locality: render ordering, focus behavior, drawer/palette transitions, and post-render DOM patches concentrate in one module.
- Leverage: callers change state and call a single render transaction; they do not need to know which DOM node survives a re-render.
- Tests: tests can assert transaction inputs/outputs and post-render effects instead of mocking most of `layout`, `palette`, `drawer`, and `view-tree` to observe internal callback behavior.

**Interface alternatives**

#### Alternative A — Complete the existing `ViewTree` / `applyView` seam

1. Interface sketch

   ```ts
   export interface RenderContext<S = unknown> {
     state: AppState;
     siteState: S;
     config: SiteConfig<S>;
     container?: HTMLElement | null;
     commands?: Command[];
   }

   export function toView<S>(ctx: RenderContext<S>): ViewTree;
   export function applyView<S>(view: ViewTree, ctx: RenderContext<S>): void;
   export function resetViewState(): void;
   ```

   Invariants: `toView` is pure except for config callbacks that are already impure today; `applyView` is the only frame-level DOM mutator; navigation must call `resetViewState()` before the next frame.

   Error modes: missing container triggers focus-mode skeleton creation or a no-op with an observable result, not ad hoc caller checks.

2. Usage example

   ```ts
   function render() {
     if (!state) return;
     const view = toView({ state, siteState, config });
     applyView(view, { state, siteState, config });
   }
   ```

3. What moves behind the seam

   Status bar updates, item count, sort indicator, content selection updates, palette visibility, drawer open/close, and empty-state rendering.

4. Dependency strategy

   In-process module with local-substitutable tests. Site custom renderers remain adapters.

5. Tradeoffs

   High leverage and relatively incremental because the module already exists. Misuse risk remains if callers keep doing post-render DOM patches outside the seam. Preserves existing domain distinctions (`StatusBarView`, `ContentView`, `DrawerView`) but may still hide the important distinction between full re-render and targeted post-render effect.

#### Alternative B — Delete `ViewTree` / `apply-view` and make `core/index.ts` the explicit renderer

1. Interface sketch

   ```ts
   export function renderCoreAppFrame(ctx: CoreAppFrameContext): void;
   ```

   `core/index.ts` remains the coordinator; dead abstractions are removed.

2. Usage example

   ```ts
   renderCoreAppFrame({ state, siteState, config });
   ```

3. What moves behind the seam

   Only duplicated layout calls move to a helper; view data definitions are reduced.

4. Dependency strategy

   In-process function, no new adapters.

5. Tradeoffs

   Lowest immediate risk and removes dead code, but it abandons the HtDP state→view model and keeps render rules shallow. It improves deletion-test clarity but gives less long-term leverage.

#### Alternative C — Render plan with explicit post-render effects

1. Interface sketch

   ```ts
   export interface RenderPlan<S = unknown> {
     view: ViewTree;
     effects: PostRenderEffect[];
   }

   export type PostRenderEffect =
     | { type: 'watchLaterHint'; videoId: string; status: 'added' | 'removed' }
     | { type: 'subscribeHint'; isSubscribed: boolean }
     | { type: 'focusStatusInput' }
     | { type: 'site'; run: () => void };

   export function planRender<S>(ctx: RenderContext<S>): RenderPlan<S>;
   export function commitRender<S>(plan: RenderPlan<S>, ctx: RenderContext<S>): void;
   ```

   Invariants: effects run only after DOM replacement has completed; effects are idempotent where possible; effect failures do not prevent base frame rendering.

2. Usage example

   ```ts
   const plan = planRender({ state, siteState, config });
   commitRender(plan, { state, siteState, config });
   ```

3. What moves behind the seam

   Everything from Alternative A plus the currently scattered watch-page post-render mutation rule.

4. Dependency strategy

   In-process, local-substitutable. Site-specific effects can be adapters when needed.

5. Tradeoffs

   Highest leverage for the documented watch-page invariant, but more design work and more moving pieces. Preserves the full-re-render vs targeted-effect distinction instead of hiding it behind a too-simple `render()` call.

**Recommendation**

Use Alternative A as the first implementation step, but reserve the interface shape needed for Alternative C. In practice: make `applyView` the only normal frame-level DOM mutator, then introduce typed post-render effects only for real cases (`watchLaterHint`, `subscribeHint`) rather than designing a general effects system up front.

**HtDP implementation path**

Start from `issue-0001-render-transaction-seam.md`. First write characterization tests around current render ordering for list pages, palette, site drawer, and watch-page post-render hints. Then migrate one caller path at a time so `core/index.ts` stops importing direct layout/palette/drawer DOM operations except through the render transaction.

### 2. Type the site adapter and app callback contract

**Files**
- `src/types.ts`
- `src/core/index.ts`
- `src/core/keyboard.ts`
- `src/sites/youtube/index.ts`
- `src/sites/youtube/commands.ts`
- `src/sites/google/index.ts`
- `src/core/app-callbacks.test.ts`
- `src/core/keyboard.test.ts`

**Problem**

The TypeScript migration created a central `src/types.ts`, but the most important boundaries still use `any`, `Function`, and index signatures. Site adapters receive anonymous callback objects whose capabilities are not named as data definitions. Commands and key sequences depend on optional callback properties that are not reflected in the `App` interface.

This makes changes across the core/site boundary shallow: adding, renaming, or narrowing an app capability requires editing core callbacks, site command code, and tests by convention rather than by compiler guidance.

**Evidence**

- `SiteConfig` uses `createPageState?: () => any`, `getCommands?: (ctx: any) => any[]`, `getKeySequences?: (app: any, context: KeyContext) => Record<string, Function>`, `createSiteState?: () => any`, `onNavigate?: (..., app: any) => void`, and `[key: string]: any`.
- `PageConfig` uses `siteState: any`, `ctx: any`, and `[key: string]: any`.
- `App` has `getSiteState(): any`, `setSiteState(newState: any): void`, and `[key: string]: any`, while key sequences call additional capabilities such as `addToWatchLater`, `updateSubscribeButton`, `nextCommentPage`, and `prevCommentPage`.
- `setupKeyboardEngine()` takes `config: any`, `getState: any`, `setState: any`, `appCallbacks: any`, and `getSiteState: any`.
- `app-callbacks.test.ts` has to mock most of the app internals to capture the anonymous `appCallbacks` object constructed inside `createApp.init()`.
- `npx tsc --noEmit` is not currently usable in this checkout because local dependencies are missing `@types/chrome`, so esbuild/test success does not verify these contracts.

**Proposed direction**

Add explicit data definitions for the public core capabilities that site adapters can use, then make `SiteConfig` and `PageConfig` generic over site state and page type only as far as current sites need.

**Benefits**

- Locality: app/site contract changes become compiler-guided rather than search-guided.
- Leverage: YouTube and Google adapters receive a stable capability interface without knowing `createApp` internals.
- Tests: tests can import and instantiate `AppCallbacks`, `Command`, and `PageLifecycleContext` shapes directly instead of mocking unrelated render modules.

**Interface alternatives**

#### Alternative A — Generic `SiteAdapter<S, PageType>`

1. Interface sketch

   ```ts
   export interface SiteAdapter<S, PageType extends string> {
     name: string;
     theme: SiteTheme;
     getPageType: () => PageType;
     createSiteState?: () => S;
     createPageState?: (ctx: SiteReadContext<S, PageType>) => PageState;
     pages: Partial<Record<PageType, PageConfig<S>>>;
     getCommands?: (ctx: CommandContext<S>) => Command[];
     getKeySequences?: (app: AppCallbacks, context: KeyContext<PageType>) => KeyBindingMap;
     getDrawerHandler?: (drawer: DrawerId, siteState: S) => DrawerHandler | null;
   }
   ```

   Error modes: unsupported page type falls back to an `other` page config; missing optional capabilities are absent at compile time.

2. Usage example

   ```ts
   export const youtubeConfig = {
     name: 'youtube',
     getPageType: getYouTubePageType,
     pages: { watch: watchPageConfig, home: listingPageConfig },
   } satisfies SiteAdapter<YouTubeState, YouTubePageType>;
   ```

3. What moves behind the seam

   Site state type, page type strings, lifecycle context, key-binding map, command shape, and drawer handler lookup.

4. Dependency strategy

   In-process local adapters for YouTube and Google.

5. Tradeoffs

   Strongest compiler leverage but broadest migration. Risk is type-design churn before the runtime seams are stable.

#### Alternative B — Minimal named contracts first

1. Interface sketch

   ```ts
   export interface AppCallbacks {
     navigate(direction: NavigationDirection): void;
     select(newTab?: boolean): void;
     render(): void;
     openPalette(mode?: PaletteMode): void;
     openLocalFilter(): void;
     openSearch(initialQuery?: string): void;
     openDrawer(drawerId: string): void;
     closeDrawer(): void;
     getSelectedItem(): ContentItem | null;
     addToWatchLater?(): Promise<void> | void;
     removeFromWatchLater?(): Promise<void> | void;
     undoWatchLaterRemoval?(): Promise<void> | void;
     updateSubscribeButton?(isSubscribed: boolean): void;
     nextCommentPage?(): void;
     prevCommentPage?(): void;
   }

   export type KeyBindingMap = Record<string, () => void>;

   export interface PageLifecycleContext<S = unknown> {
     getSiteState(): S;
     updateSiteState(fn: (state: S) => S): void;
     render(): void;
     refreshItems(): void;
   }
   ```

2. Usage example

   ```ts
   export function getYouTubeKeySequences(app: AppCallbacks, context: KeyContext): KeyBindingMap {
     return { 'mw': () => app.addToWatchLater?.() };
   }
   ```

3. What moves behind the seam

   The anonymous app callback object and command/lifecycle context shapes become named modules.

4. Dependency strategy

   In-process, incremental. No new adapters required.

5. Tradeoffs

   Lower blast radius and enough leverage for the next TS migration layer. It preserves current site-specific optional capabilities but does not fully eliminate `any` from `SiteConfig`.

#### Alternative C — Per-site runtime facades

1. Interface sketch

   ```ts
   export interface YouTubeRuntime {
     app: AppCallbacks;
     data: DataProvider;
     watch: WatchPageActions;
   }
   ```

2. Usage example

   ```ts
   getYouTubeKeySequences(runtime, context);
   ```

3. What moves behind the seam

   YouTube commands stop depending directly on broad app callbacks and data-provider singletons.

4. Dependency strategy

   In-process facade per site.

5. Tradeoffs

   Useful for YouTube complexity but fragments the general site adapter story. It risks making Google and future sites second-class.

**Recommendation**

Use Alternative B now. It is the smallest step that turns the callback/lifecycle contracts into data definitions. Revisit Alternative A after render and data boundaries settle.

**HtDP implementation path**

Start from `issue-0002-site-adapter-contracts.md`. Define the named types, then migrate `setupKeyboardEngine`, YouTube key sequences, Google key sequences, command contexts, and page lifecycle hooks. Keep runtime behavior unchanged.

### 3. Deepen the YouTube data and bridge boundary

**Files**
- `src/sites/youtube/data/index.ts`
- `src/sites/youtube/data-bridge.ts`
- `src/sites/youtube/data/main-world-bridge.ts`
- `src/sites/youtube/data/fetch-intercept.ts`
- `src/sites/youtube/data/extractors.ts`
- `src/sites/youtube/data/dom-fallback.ts`
- `src/sites/youtube/commands.ts`
- `src/sites/youtube/transcript.ts`
- `build.js`
- `manifest.json`

**Problem**

The YouTube data layer has a useful facade, but the seam is still shallow. Bridge event names and message shapes are duplicated. `DataProvider` owns event listening, caching, continuation extraction, DOM fallback, readiness, normalization, and debug cache exposure. There are also two unused bridge/interceptor modules that look like alternate adapters, while `build.js` and `manifest.json` use only `src/sites/youtube/data-bridge.ts`.

Commands use the same event channel style for Watch Later and transcript RPC but duplicate request IDs, response listeners, timeout cleanup, and success interpretation across command functions.

**Evidence**

- `BRIDGE_EVENT = '__vilify_data__'` appears in both `data-bridge.ts` and `data/index.ts`; `main-world-bridge.ts` defines the same event name as `BRIDGE_EVENT_NAME`.
- `installMainWorldBridge()` and `installFetchIntercept()` are exported but have no `rg` references outside their defining files.
- `build.js` bundles only `src/content.ts` and `src/sites/youtube/data-bridge.ts`; `manifest.json` injects only `dist/data-bridge.js` and `dist/content.js`.
- `DataProvider._getCachedData()` exposes internal cache shape for debugging, which leaks implementation details through the public interface.
- `extractVideosFromContinuation()` and `extractVideoFromRenderer()` duplicate renderer extraction logic that also exists in `extractors.ts`.
- `commands.ts` repeats the same `document.addEventListener('__vilify_response__')`, `document.dispatchEvent('__vilify_command__')`, request id, and timeout pattern for Watch Later add/remove/undo and playlist lookup.
- `transcript.ts` now has its own `sendBridgeCommand()` helper using the same `__vilify_command__` / `__vilify_response__` transport for `fetchTranscript`, strengthening the case for a typed bridge command client.
- No direct tests were found for `src/sites/youtube/data/index.ts` or `src/sites/youtube/data/extractors.ts`; tests mock `getDataProvider()` from commands instead.

**Proposed direction**

Model the YouTube data layer as two explicit seams:

1. A typed bridge protocol (`BridgeEvent`, `BridgeCommand`, `BridgeResponse`) shared by the main-world bridge and isolated-world content script.
2. A data snapshot/provider interface that exposes normalized page data and readiness without exposing caches or transport.

**Benefits**

- Locality: YouTube transport changes stay in bridge adapters; YouTube JSON shape changes stay in extractors/normalizers.
- Leverage: callers ask for a snapshot or command result, not cached initial data or event wiring.
- Tests: provider tests can feed typed bridge events and DOM fallback fixtures without loading YouTube or mocking the whole command layer.

**Interface alternatives**

#### Alternative A — Normalize names and delete unused adapters

1. Interface sketch

   ```ts
   export const YOUTUBE_BRIDGE_EVENT = '__vilify_data__' as const;

   export type YouTubeBridgeEvent =
     | { type: 'initialData'; data: unknown }
     | { type: 'playerResponse'; data: unknown }
     | { type: 'continuationData'; data: unknown }
     | { type: 'dataTimeout'; data: null };
   ```

2. Usage example

   ```ts
   document.addEventListener(YOUTUBE_BRIDGE_EVENT, handleBridgeEvent);
   ```

3. What moves behind the seam

   Constants and event shapes only. Remove or explicitly mark unused adapters.

4. Dependency strategy

   In-process constants/types shared at build time; no runtime adapter change.

5. Tradeoffs

   Low risk, good cleanup, but it does not address provider readiness or command RPC duplication.

#### Alternative B — `YouTubeDataStore` snapshot + typed bridge adapter

1. Interface sketch

   ```ts
   export interface YouTubeDataSnapshot {
     pageType: YouTubePageType | 'other';
     readiness: 'empty' | 'bridge' | 'dom-fallback' | 'timed-out';
     videos: ContentItem[];
     recommendations: ContentItem[];
     videoContext: VideoContext | null;
   }

   export interface YouTubeDataStore {
     getSnapshot(): YouTubeDataSnapshot;
     waitForData(timeout?: number): Promise<YouTubeDataSnapshot>;
     waitForWatchData(timeout?: number): Promise<YouTubeDataSnapshot>;
     start(): void;
     stop(): void;
   }
   ```

2. Usage example

   ```ts
   const snapshot = dataStore.getSnapshot();
   if (snapshot.pageType === 'watch') {
     return createWatchPageState(snapshot.videoContext, snapshot.recommendations, getChapters());
   }
   return createListPageState(snapshot.videos);
   ```

3. What moves behind the seam

   Cache variables, continuation merging, dedupe, bridge-vs-DOM source choice, readiness timeouts, and debug internals.

4. Dependency strategy

   Owned remote-with-adapters: the true external is YouTube; production adapters are bridge and DOM fallback; tests use an in-memory adapter/fixtures.

5. Tradeoffs

   Strong leverage and testability. Higher blast radius because callers of `getVideos()`, `getVideoContext()`, and `getRecommendations()` need to migrate. Preserves the distinction between bridge and DOM fallback via `readiness` rather than hiding it.

#### Alternative C — General browser-extension message bus/RPC layer

1. Interface sketch

   ```ts
   export interface ExtensionRpcClient<Commands> {
     request<K extends keyof Commands>(command: K, payload: Commands[K]['request'], timeout?: number): Promise<Commands[K]['response']>;
   }
   ```

2. Usage example

   ```ts
   const result = await youtubeRpc.request('addToWatchLater', { videoId }, 5000);
   ```

3. What moves behind the seam

   Request id generation, listener registration/removal, timeout behavior, and response matching.

4. Dependency strategy

   Local-substitutable adapter over `CustomEvent` transport.

5. Tradeoffs

   Useful for Watch Later commands, but too broad if introduced before the data-provider snapshot is clarified. Could hide important YouTube command result differences behind a generic RPC abstraction.

**Recommendation**

Use Alternative B as the target, with Alternative A as the first safe slice. Introduce a tiny typed command client only where current duplication proves it is needed; do not build a general message bus first.

**HtDP implementation path**

Start from `issue-0003-youtube-data-boundary.md`. First add tests around the current provider behavior with bridge events, continuation data, DOM fallback, transcript command responses, and timeouts. Then introduce bridge event/command types/constants and migrate provider internals behind a snapshot interface.

### 4. Reify watch comment window state

**Files**
- `src/sites/youtube/watch.ts`
- `src/sites/youtube/state.ts`
- `src/sites/youtube/watch-types.test.ts`
- `src/sites/youtube/state.test.ts`
- `src/sites/youtube/index.ts`

**Problem**

The watch page has comment pagination fields in `YouTubeState`, but actual pagination uses module-level variables in `watch.ts`: `commentStartIdx`, `commentEndIdx`, and `commentStartHistory`. `nextCommentPage(state)` and `prevCommentPage(state)` return the input state while mutating DOM/module state. This hides the domain concept being manipulated: a comments viewport/window over a scraped comment list.

**Evidence**

- `YouTubeState` contains `commentPage` and `commentPageStarts`, and tests assert those fields survive transcript/chapter state transitions.
- `watch.ts` resets comment globals on every `renderWatchPage()` and updates globals in `nextCommentPage()` / `prevCommentPage()`.
- `watch-types.test.ts` checks that `nextCommentPage()` and `prevCommentPage()` return an object with `commentPage` and `chapterQuery`, but does not assert window movement behavior.
- `handleNextCommentPage()` and `handlePrevCommentPage()` in `core/index.ts` update `siteState` but do not call `render()`, because the watch module mutates the comments DOM directly.

**Proposed direction**

Introduce a small `CommentWindow` data definition and pure transition functions. Keep YouTube lazy-loading as I/O, but make the rendered window calculation pure and testable.

**Benefits**

- Locality: comment pagination rules live in one data definition rather than hidden globals plus unused state fields.
- Leverage: watch-page keyboard handlers can advance comments without knowing DOM implementation details.
- Tests: pure tests can cover next/previous windows, history, empty comments, disabled comments, and load-more boundary behavior.

**Interface alternatives**

Not enough interface uncertainty to justify multiple deep alternatives. This should be a normal HtDP slice:

```ts
export interface CommentWindow {
  startIdx: number;
  endIdx: number;
  history: number[];
}

export function nextCommentWindow(window: CommentWindow, totalComments: number): CommentWindow | 'load-more';
export function prevCommentWindow(window: CommentWindow): CommentWindow;
export function renderCommentWindow(comments: ScrapedComment[], window: CommentWindow, container: HTMLElement): CommentWindow;
```

**HtDP implementation path**

Start from `issue-0004-watch-comments-window-state.md`, ideally after the render transaction issue. Add pure examples first, then adapt `watch.ts` so I/O uses the pure window transitions.

## Follow-up issues created

- `.htdp/issues/issue-0001-render-transaction-seam.md`
- `.htdp/issues/issue-0002-site-adapter-contracts.md`
- `.htdp/issues/issue-0003-youtube-data-boundary.md`
- `.htdp/issues/issue-0004-watch-comments-window-state.md`

## Deferred / rejected candidates

- Generic plugin architecture for arbitrary websites: rejected for now. There are only two real site adapters, and the evidence points to typed current boundaries rather than a broader plugin framework.
- Standalone deduplication of Watch Later request/response code: deferred into the YouTube data boundary. It is real duplication, but a simple helper without typed bridge events would be a shallow Phase 3 cleanup.
- Full `strict: true` TypeScript conversion: deferred. The current iteration is explicitly gradual; architecture should first name the contracts that strict checking would enforce.
- Package-lock/dependency cleanup: not reviewed as architecture. `npx tsc --noEmit` is currently blocked by missing local `@types/chrome`, but dependency reconciliation is separate from the module-boundary findings above.
