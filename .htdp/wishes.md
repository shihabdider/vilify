## Wish List

Phase 2 of JS→TS migration: Add TypeScript type annotations to all functions, importing types from `src/types.ts`. Each wish = add proper parameter types, return types, and `import type { ... } from '../types'` to the specified function. The function bodies are already fully implemented — only signatures need annotation.

### Layer 5 (implement first) — Leaf utilities with no type imports needed

- `el(tag: string, attrs?: Record<string, any>, children?: (string | Node)[]): HTMLElement` in `src/core/view.ts`
  Purpose: Add parameter and return type annotations to DOM element creator

- `clear(element: HTMLElement): void` in `src/core/view.ts`
  Purpose: Add parameter type annotation to DOM clearing utility

- `updateListSelection(container: HTMLElement, selector: string, index: number): void` in `src/core/view.ts`
  Purpose: Add parameter type annotations to list selection highlighter

- `showMessage(msg: string, duration?: number): void` in `src/core/view.ts`
  Purpose: Add parameter type annotations to status message display

- `flashBoundary(): void` in `src/core/view.ts`
  Purpose: Add return type annotation to boundary flash effect

- `navigateList(direction: number, index: number, count: number): number` in `src/core/view.ts`
  Purpose: Add types to list navigation calculator (returns new index)

- `scrollHalfPage(direction: number, index: number, count: number, visibleCount: number): number` in `src/core/view.ts`
  Purpose: Add types to half-page scroll calculator

- `isInputElement(element: Element): boolean` in `src/core/view.ts`
  Purpose: Add types to input element detector

- `normalizeKey(event: KeyboardEvent): string | null` in `src/core/keyboard.ts`
  Purpose: Add types to keyboard event normalizer (modifier keys → null, Ctrl+key → 'C-x')

- `handleKeyEvent(key: string, keySeq: string, sequences: Record<string, Function>, timeout: number): KeyEventResult` in `src/core/keyboard.ts`
  Purpose: Add types to key sequence matcher, import KeyEventResult from types.ts

- `createKeyboardState(): KeyboardState` in `src/core/keyboard.ts`
  Purpose: Add return type annotation, import KeyboardState from types.ts

- `parseRelativeDate(dateStr: string): number` in `src/core/sort.ts`
  Purpose: Add types to relative date parser (returns unix timestamp)

- `parseDuration(durStr: string): number` in `src/core/sort.ts`
  Purpose: Add types to duration string parser (returns seconds)

- `parseViewCount(viewStr: string): number` in `src/core/sort.ts`
  Purpose: Add types to view count parser (returns numeric count)

- `extractChannel(meta: string): string` in `src/core/sort.ts`
  Purpose: Add types to channel name extractor from metadata string

- `extractDateFromMeta(meta: string): string` in `src/core/sort.ts`
  Purpose: Add types to date extractor from metadata string

- `matchSortPrefix(prefix: string): string | null` in `src/core/sort.ts`
  Purpose: Add types to sort field prefix matcher

- `parseSortCommand(cmdStr: string): { field: string, direction: 'asc' | 'desc' } | null` in `src/core/sort.ts`
  Purpose: Add types to sort command parser, return SortConfig-compatible result

- `getSortLabel(field: string | null, direction: string): string` in `src/core/sort.ts`
  Purpose: Add types to sort label formatter

- `SORT_FIELDS: Record<string, SortFieldDef>` in `src/core/sort.ts`
  Purpose: Add type annotation to sort fields constant, import SortFieldDef from types.ts

- `formatTime(seconds: number): string` in `src/sites/youtube/transcript.ts`
  Purpose: Add types to timestamp formatter (seconds → "mm:ss")

- `navigateTo(path: string): void` in `src/core/actions.ts`
  Purpose: Add types to URL navigation function

- `openInNewTab(url: string): void` in `src/core/actions.ts`
  Purpose: Add types to new-tab opener

- `navigate(url: string, newTab?: boolean): void` in `src/core/actions.ts`
  Purpose: Add types to unified navigation function

- `copyToClipboard(text: string): Promise<boolean>` in `src/core/actions.ts`
  Purpose: Add types to clipboard copy with status message

- `copyImageToClipboard(imgSrc: string): Promise<boolean>` in `src/core/actions.ts`
  Purpose: Add types to image clipboard copy

### Layer 4 — State creation & transition functions

These functions create/modify AppState and related types. Import AppState, UIState, AppCore, SortConfig, ContentItem, etc. from types.ts.

- `createUIState(): UIState` in `src/core/state.ts`
  Purpose: Add return type, import UIState from types.ts

- `createAppCore(): AppCore` in `src/core/state.ts`
  Purpose: Add return type, import AppCore from types.ts

- `createAppState(config?: SiteConfig | null): AppState` in `src/core/state.ts`
  Purpose: Add parameter and return types, import AppState, SiteConfig from types.ts

- `getMode(state: AppState): string` in `src/core/state.ts`
  Purpose: Add types to mode deriver (returns 'NORMAL', 'COMMAND', 'FILTER', 'SEARCH', or drawer name)

- `getVisibleItems(state: AppState, items: ContentItem[]): ContentItem[]` in `src/core/state.ts`
  Purpose: Add types to filtered/sorted item list deriver

- `onNavigate(state: AppState, direction: number, itemCount: number, step?: number): AppState` in `src/core/state.ts`
  Purpose: Add types to navigation state transition (updates selectedIdx with bounds)

- `onFilterToggle(state: AppState): AppState` in `src/core/state.ts`
  Purpose: Add types to filter mode toggle transition

- `onFilterChange(state: AppState, query: string): AppState` in `src/core/state.ts`
  Purpose: Add types to filter query update transition

- `onDrawerOpen(state: AppState, drawerType: string): AppState` in `src/core/state.ts`
  Purpose: Add types to drawer open transition

- `onDrawerClose(state: AppState): AppState` in `src/core/state.ts`
  Purpose: Add types to drawer close transition

- `onKeySeqUpdate(state: AppState, key: string): AppState` in `src/core/state.ts`
  Purpose: Add types to key sequence accumulation transition

- `onKeySeqClear(state: AppState): AppState` in `src/core/state.ts`
  Purpose: Add types to key sequence clear transition

- `onSortChange(state: AppState, field: string, direction: 'asc' | 'desc'): AppState` in `src/core/state.ts`
  Purpose: Add types to sort state change transition

- `onShowMessage(state: AppState, text: string): AppState` in `src/core/state.ts`
  Purpose: Add types to message display transition (creates Message with timestamp)

- `onBoundaryHit(state: AppState, edge: 'top' | 'bottom'): AppState` in `src/core/state.ts`
  Purpose: Add types to boundary flash transition

- `onWatchLaterAdd(state: AppState, videoId: string): AppState` in `src/core/state.ts`
  Purpose: Add types to Watch Later add transition

- `onWatchLaterRemove(state: AppState, videoId: string, setVideoId: string, position: number): AppState` in `src/core/state.ts`
  Purpose: Add types to Watch Later remove transition (stores WatchLaterRemoval for undo)

- `onWatchLaterUndoRemove(state: AppState, videoId: string): AppState` in `src/core/state.ts`
  Purpose: Add types to Watch Later undo-remove transition

- `onDismissVideo(state: AppState, videoId: string): AppState` in `src/core/state.ts`
  Purpose: Add types to video dismiss transition

- `onUndoDismissVideo(state: AppState, videoId: string): AppState` in `src/core/state.ts`
  Purpose: Add types to video dismiss undo transition

- `onSearchToggle(state: AppState): AppState` in `src/core/state.ts`
  Purpose: Add types to search mode toggle transition

- `onSearchChange(state: AppState, query: string): AppState` in `src/core/state.ts`
  Purpose: Add types to search query update transition

- `onPaletteQueryChange(state: AppState, query: string): AppState` in `src/core/state.ts`
  Purpose: Add types to palette query update transition

- `onPaletteNavigate(state: AppState, direction: number, itemCount: number): AppState` in `src/core/state.ts`
  Purpose: Add types to palette navigation transition

- `onUrlChange(state: AppState, newUrl: string, config?: SiteConfig | null): AppState` in `src/core/state.ts`
  Purpose: Add types to URL change transition (resets page state)

- `onPageUpdate(state: AppState, pageState: PageState): AppState` in `src/core/state.ts`
  Purpose: Add types to page state update transition, import PageState from types.ts

- `onListItemsUpdate(state: AppState, videos: ContentItem[]): AppState` in `src/core/state.ts`
  Purpose: Add types to list items update transition

- `onItemsUpdate(state: AppState, items: ContentItem[]): AppState` in `src/core/state.ts`
  Purpose: Add types to items update transition (bounds selectedIdx)

- `onSelect(state: AppState, visibleItems: ContentItem[], shiftKey?: boolean): AppState` in `src/core/state.ts`
  Purpose: Add types to selection action transition

- `onClearFlash(state: AppState, messageTimeout?: number, flashTimeout?: number): AppState` in `src/core/state.ts`
  Purpose: Add types to message/flash clear transition (time-based cleanup)

- `sortItems(items: ContentItem[], field: string, direction: 'asc' | 'desc'): ContentItem[]` in `src/core/sort.ts`
  Purpose: Add types to item sorter, import ContentItem from types.ts

- `filterItems(items: any[], query: string): any[]` in `src/core/palette.ts`
  Purpose: Add types to fuzzy filter function

- `openPalette(state: AppState, mode: string): AppState` in `src/core/palette.ts`
  Purpose: Add types to palette open transition

- `closePalette(state: AppState): AppState` in `src/core/palette.ts`
  Purpose: Add types to palette close transition

- `createListPageState(videos?: ContentItem[]): ListPageState` in `src/sites/youtube/state.ts`
  Purpose: Add types to list page state creator, import ListPageState, ContentItem from types.ts

- `createWatchPageState(videoContext?: VideoContext | null, recommended?: ContentItem[], chapters?: Chapter[]): WatchPageState` in `src/sites/youtube/state.ts`
  Purpose: Add types to watch page state creator, import WatchPageState, VideoContext, ContentItem, Chapter from types.ts

- `onTranscriptRequest(siteState: YouTubeState, videoId: string): YouTubeState` in `src/sites/youtube/state.ts`
  Purpose: Add types to transcript loading transition, import YouTubeState from types.ts

- `onTranscriptLoad(siteState: YouTubeState, videoId: string, segments: TranscriptSegment[]): YouTubeState` in `src/sites/youtube/state.ts`
  Purpose: Add types to transcript load completion transition

- `onChaptersRequest(siteState: YouTubeState, videoId: string): YouTubeState` in `src/sites/youtube/state.ts`
  Purpose: Add types to chapters loading transition

- `onChaptersLoad(siteState: YouTubeState, videoId: string, chapters: Chapter[]): YouTubeState` in `src/sites/youtube/state.ts`
  Purpose: Add types to chapters load completion transition

### Layer 3 — View tree computation & site-specific rendering

These compose state functions and produce view objects. Import ViewTree, StatusBarView, ContentView, DrawerView, SiteConfig from types.ts.

- `toStatusBarView(state: AppState, drawerPlaceholder?: string | null): StatusBarView` in `src/core/view-tree.ts`
  Purpose: Add types to status bar view deriver, import AppState, StatusBarView from types.ts

- `getPageItems(state: AppState): ContentItem[]` in `src/core/view-tree.ts`
  Purpose: Add types to page items extractor from state.page

- `toContentView(state: AppState, config: SiteConfig, items?: ContentItem[] | null): ContentView` in `src/core/view-tree.ts`
  Purpose: Add types to content view deriver

- `toDrawerView(state: AppState, config: SiteConfig, context?: any): DrawerView | null` in `src/core/view-tree.ts`
  Purpose: Add types to drawer view deriver (returns null if no drawer open)

- `toView(state: AppState, config: SiteConfig, context?: any): ViewTree` in `src/core/view-tree.ts`
  Purpose: Add types to complete view tree deriver (composes statusBar + content + drawer)

- `statusBarViewEqual(a: StatusBarView, b: StatusBarView): boolean` in `src/core/view-tree.ts`
  Purpose: Add types to status bar equality check (diff minimization)

- `contentViewChanged(a: ContentView, b: ContentView): boolean` in `src/core/view-tree.ts`
  Purpose: Add types to content view change detector

- `drawerViewChanged(a: DrawerView | null, b: DrawerView | null): boolean` in `src/core/view-tree.ts`
  Purpose: Add types to drawer view change detector

- `applyStatusBar(view: StatusBarView, prev?: StatusBarView | null): void` in `src/core/apply-view.ts`
  Purpose: Add types to status bar DOM applier

- `applyContent(view: ContentView, prev?: ContentView | null, context?: any): void` in `src/core/apply-view.ts`
  Purpose: Add types to content DOM applier

- `applyDrawer(view: DrawerView | null, prev?: DrawerView | null): void` in `src/core/apply-view.ts`
  Purpose: Add types to drawer DOM applier

- `applyView(view: ViewTree, context?: any): void` in `src/core/apply-view.ts`
  Purpose: Add types to complete view tree DOM applier (diffs against previous view)

- `resetViewState(): void` in `src/core/apply-view.ts`
  Purpose: Add return type annotation to view state resetter

- `getLastRenderedDrawerType(): string | null` in `src/core/apply-view.ts`
  Purpose: Add return type annotation

- `renderFocusMode(config: SiteConfig, state: AppState): void` in `src/core/layout.ts`
  Purpose: Add types to focus mode layout renderer (creates container, status bar, etc.)

- `updateStatusBar(state: AppState, focusInput?: boolean, drawerPlaceholder?: string | null, searchPlaceholder?: string | null): void` in `src/core/layout.ts`
  Purpose: Add types to status bar updater

- `renderListing(items: ContentItem[], selectedIdx: number, container?: HTMLElement | null, renderItem?: Function | null): void` in `src/core/layout.ts`
  Purpose: Add types to listing renderer (creates item list with selection)

- `updateSortIndicator(sortLabel: string): void` in `src/core/layout.ts`
  Purpose: Add parameter type annotation

- `updateItemCount(count: number): void` in `src/core/layout.ts`
  Purpose: Add parameter type annotation

- `applyTheme(theme: SiteTheme): void` in `src/core/layout.ts`
  Purpose: Add types, import SiteTheme from types.ts

- `setInputCallbacks(callbacks: any): void` in `src/core/layout.ts`
  Purpose: Add parameter type annotation for input callback handler

- `removeFocusMode(): void` in `src/core/layout.ts`
  Purpose: Add return type annotation

- `getContentContainer(): HTMLElement | null` in `src/core/layout.ts`
  Purpose: Add return type annotation

- `createListDrawer(config: any): DrawerHandler` in `src/core/drawer.ts`
  Purpose: Add types, import DrawerHandler from types.ts

- `createContentDrawer(config: any): DrawerHandler` in `src/core/drawer.ts`
  Purpose: Add types, import DrawerHandler from types.ts

- `renderDrawer(drawerState: any, handler: DrawerHandler): void` in `src/core/drawer.ts`
  Purpose: Add types to drawer renderer

- `handleDrawerKey(key: string, state: any, handler: DrawerHandler): void` in `src/core/drawer.ts`
  Purpose: Add types to drawer keyboard handler

- `closeDrawer(): void` in `src/core/drawer.ts`
  Purpose: Add return type annotation

- `injectDrawerStyles(): void` in `src/core/drawer.ts`
  Purpose: Add return type annotation

- `setupKeyboardEngine(config: any): any` in `src/core/keyboard.ts`
  Purpose: Add types to keyboard engine setup (takes callbacks object, returns cleanup)

- `setupNavigationObserver(onNavigate: (oldUrl: string, newUrl: string) => void): () => void` in `src/core/navigation.ts`
  Purpose: Add types to navigation observer setup (returns cleanup function)

- `pollPageContent(config: any, state: AppState, callbacks: any): () => void` in `src/core/poll-content.ts`
  Purpose: Add types to content polling setup (returns cleanup function)

- `injectLoadingStyles(): void` in `src/core/loading.ts`
  Purpose: Add return type annotation

- `showLoadingScreen(siteConfig: SiteConfig): void` in `src/core/loading.ts`
  Purpose: Add types, import SiteConfig from types.ts

- `hideLoadingScreen(): void` in `src/core/loading.ts`
  Purpose: Add return type annotation

### Layer 2 — Site-specific functions

These implement site-specific behavior using the core types.

- `getYouTubePageType(): string` in `src/sites/youtube/scraper.ts`
  Purpose: Add return type annotation (returns 'home' | 'subscriptions' | 'watch' | 'search' | 'playlist' | 'channel' | 'other')

- `getDescription(): string` in `src/sites/youtube/scraper.ts`
  Purpose: Add return type annotation

- `getChapters(): Chapter[]` in `src/sites/youtube/scraper.ts`
  Purpose: Add return type, import Chapter from types.ts

- `extractVideoId(): string | null` in `src/sites/youtube/scraper.ts`
  Purpose: Add return type annotation

- `renderWatchPage(ctx: any, state: AppState, container: HTMLElement, watchLaterAdded?: Set<string> | null): void` in `src/sites/youtube/watch.ts`
  Purpose: Add types to watch page renderer

- `renderVideoInfo(ctx: any, container: HTMLElement): void` in `src/sites/youtube/watch.ts`
  Purpose: Add types to video info renderer

- `renderComments(commentsResult: any, youtubeState: YouTubeState, container: HTMLElement): void` in `src/sites/youtube/watch.ts`
  Purpose: Add types to comments renderer

- `nextCommentPage(state: YouTubeState): YouTubeState` in `src/sites/youtube/watch.ts`
  Purpose: Add types to comment pagination forward

- `prevCommentPage(state: YouTubeState): YouTubeState` in `src/sites/youtube/watch.ts`
  Purpose: Add types to comment pagination backward

- `triggerCommentLoad(): void` in `src/sites/youtube/watch.ts`
  Purpose: Add return type annotation

- `updateSubscribeButton(isSubscribed: boolean): void` in `src/sites/youtube/watch.ts`
  Purpose: Add types to subscribe button DOM updater

- `injectWatchStyles(): void` in `src/sites/youtube/watch.ts`
  Purpose: Add return type annotation

- `renderYouTubeItem(item: ContentItem, isSelected: boolean, watchLaterAdded?: Set<string>, watchLaterRemoved?: Map<string, WatchLaterRemoval>, dismissedVideos?: Set<string>): HTMLElement` in `src/sites/youtube/items.ts`
  Purpose: Add types to YouTube item renderer, import ContentItem, WatchLaterRemoval from types.ts

- `injectYouTubeItemStyles(): void` in `src/sites/youtube/items.ts`
  Purpose: Add return type annotation

- `getYouTubeCommands(app: App): any[]` in `src/sites/youtube/commands.ts`
  Purpose: Add types to command list builder, import App from types.ts

- `getYouTubeKeySequences(app: App, context: KeyContext): Record<string, Function>` in `src/sites/youtube/commands.ts`
  Purpose: Add types to key sequence mapper, import App, KeyContext from types.ts

- `getYouTubeBlockedNativeKeys(context: KeyContext): string[]` in `src/sites/youtube/commands.ts`
  Purpose: Add types to blocked key list builder

- `addToWatchLater(videoId: string): Promise<boolean>` in `src/sites/youtube/commands.ts`
  Purpose: Add types to Watch Later API caller

- `getPlaylistItemData(videoId: string): Promise<any>` in `src/sites/youtube/commands.ts`
  Purpose: Add types to playlist item data fetcher

- `removeFromWatchLater(setVideoId: string): Promise<boolean>` in `src/sites/youtube/commands.ts`
  Purpose: Add types to Watch Later removal API caller

- `undoRemoveFromWatchLater(videoId: string, position: number): Promise<boolean>` in `src/sites/youtube/commands.ts`
  Purpose: Add types to Watch Later undo-removal API caller

- `dismissVideo(videoId: string): Promise<boolean>` in `src/sites/youtube/commands.ts`
  Purpose: Add types to "Not interested" API caller

- `clickUndoDismiss(): Promise<boolean>` in `src/sites/youtube/commands.ts`
  Purpose: Add types to dismiss undo clicker

- `fetchTranscript(videoId: string): Promise<TranscriptSegment[]>` in `src/sites/youtube/transcript.ts`
  Purpose: Add types to transcript fetcher, import TranscriptSegment from types.ts

- `getVideo(): HTMLVideoElement | null` in `src/sites/youtube/player.ts`
  Purpose: Add return type annotation

- `togglePlayPause(): void` in `src/sites/youtube/player.ts`
  Purpose: Add return type annotation

- `seekRelative(seconds: number): void` in `src/sites/youtube/player.ts`
  Purpose: Add types

- `setPlaybackRate(rate: number): void` in `src/sites/youtube/player.ts`
  Purpose: Add types

- `toggleMute(): void` in `src/sites/youtube/player.ts`
  Purpose: Add return type annotation

- `toggleFullscreen(): void` in `src/sites/youtube/player.ts`
  Purpose: Add return type annotation

- `toggleTheaterMode(): void` in `src/sites/youtube/player.ts`
  Purpose: Add return type annotation

- `toggleCaptions(): void` in `src/sites/youtube/player.ts`
  Purpose: Add return type annotation

- `seekToChapter(chapter: Chapter): void` in `src/sites/youtube/player.ts`
  Purpose: Add types, import Chapter from types.ts

- `seekToPercent(percent: number): void` in `src/sites/youtube/player.ts`
  Purpose: Add types

- `applyDefaultVideoSettings(): void` in `src/sites/youtube/player.ts`
  Purpose: Add return type annotation

- `createChapterDrawer(chaptersResult: ChaptersResult): DrawerHandler` in `src/sites/youtube/drawers/chapters.ts`
  Purpose: Add types, import ChaptersResult, DrawerHandler from types.ts

- `getChapterDrawer(chaptersResult: ChaptersResult): DrawerHandler | null` in `src/sites/youtube/drawers/chapters.ts`
  Purpose: Add types for cached drawer getter

- `resetChapterDrawer(): void` in `src/sites/youtube/drawers/chapters.ts`
  Purpose: Add return type annotation

- `createDescriptionDrawer(): DrawerHandler` in `src/sites/youtube/drawers/description.ts`
  Purpose: Add return type, import DrawerHandler from types.ts

- `getDescriptionDrawer(): DrawerHandler | null` in `src/sites/youtube/drawers/description.ts`
  Purpose: Add return type

- `resetDescriptionDrawer(): void` in `src/sites/youtube/drawers/description.ts`
  Purpose: Add return type annotation

- `setRecommendedItems(items: ContentItem[]): void` in `src/sites/youtube/drawers/recommended.ts`
  Purpose: Add types, import ContentItem from types.ts

- `createRecommendedDrawer(items: ContentItem[]): DrawerHandler` in `src/sites/youtube/drawers/recommended.ts`
  Purpose: Add types to recommended videos drawer creator

- `getRecommendedDrawer(): DrawerHandler | null` in `src/sites/youtube/drawers/recommended.ts`
  Purpose: Add return type

- `resetRecommendedDrawer(): void` in `src/sites/youtube/drawers/recommended.ts`
  Purpose: Add return type annotation

- `createTranscriptDrawer(transcript: TranscriptResult): DrawerHandler` in `src/sites/youtube/drawers/transcript.ts`
  Purpose: Add types, import TranscriptResult, DrawerHandler from types.ts

- `getTranscriptDrawer(transcript: TranscriptResult): DrawerHandler | null` in `src/sites/youtube/drawers/transcript.ts`
  Purpose: Add types for cached drawer getter

- `resetTranscriptDrawer(): void` in `src/sites/youtube/drawers/transcript.ts`
  Purpose: Add return type annotation

- `getYouTubeDrawerHandler(drawerState: any, siteState: YouTubeState): DrawerHandler | null` in `src/sites/youtube/drawers/index.ts`
  Purpose: Add types to drawer handler router, import YouTubeState, DrawerHandler from types.ts

- `resetYouTubeDrawers(): void` in `src/sites/youtube/drawers/index.ts`
  Purpose: Add return type annotation

- `extractVideoRenderer(renderer: any): ContentItem | null` in `src/sites/youtube/data/extractors.ts`
  Purpose: Add return type, import ContentItem from types.ts

- `extractCompactVideoRenderer(renderer: any): ContentItem | null` in `src/sites/youtube/data/extractors.ts`
  Purpose: Add return type

- `extractGridVideoRenderer(renderer: any): ContentItem | null` in `src/sites/youtube/data/extractors.ts`
  Purpose: Add return type

- `extractPlaylistVideoRenderer(renderer: any): ContentItem | null` in `src/sites/youtube/data/extractors.ts`
  Purpose: Add return type

- `extractRichItemRenderer(renderer: any): ContentItem | null` in `src/sites/youtube/data/extractors.ts`
  Purpose: Add return type

- `extractLockupViewModel(model: any): ContentItem | null` in `src/sites/youtube/data/extractors.ts`
  Purpose: Add return type

- `extractChaptersFromData(data: any): Chapter[]` in `src/sites/youtube/data/extractors.ts`
  Purpose: Add return type, import Chapter from types.ts

- `extractVideoContext(initialData: any, playerResponse: any): VideoContext | null` in `src/sites/youtube/data/extractors.ts`
  Purpose: Add return type, import VideoContext from types.ts

- `extractVideosForPage(data: any, pageType: string): ContentItem[]` in `src/sites/youtube/data/extractors.ts`
  Purpose: Add return type

- `extractVideosFromData(data: any): ContentItem[]` in `src/sites/youtube/data/extractors.ts`
  Purpose: Add return type

- `createDataProvider(): any` in `src/sites/youtube/data/index.ts`
  Purpose: Add return type annotation (data provider object interface)

- `getDataProvider(): any` in `src/sites/youtube/data/index.ts`
  Purpose: Add return type annotation

- `detectPageTypeFromData(data: any): string` in `src/sites/youtube/data/initial-data.ts`
  Purpose: Add return type annotation

- `parseInitialData(): any` in `src/sites/youtube/data/initial-data.ts`
  Purpose: Add return type annotation

- `parsePlayerResponse(): any` in `src/sites/youtube/data/initial-data.ts`
  Purpose: Add return type annotation

- `scrapeDOMVideos(): ContentItem[]` in `src/sites/youtube/data/dom-fallback.ts`
  Purpose: Add return type, import ContentItem from types.ts

- `scrapeDOMVideoContext(): VideoContext | null` in `src/sites/youtube/data/dom-fallback.ts`
  Purpose: Add return type, import VideoContext from types.ts

- `scrapeDOMRecommendations(): ContentItem[]` in `src/sites/youtube/data/dom-fallback.ts`
  Purpose: Add return type

- `createNavigationWatcher(callback: Function): any` in `src/sites/youtube/data/navigation.ts`
  Purpose: Add types to navigation watcher creator

- `installFetchIntercept(onData: Function): void` in `src/sites/youtube/data/fetch-intercept.ts`
  Purpose: Add types to fetch interceptor installer

- `installMainWorldBridge(onData: Function): void` in `src/sites/youtube/data/main-world-bridge.ts`
  Purpose: Add types to main world bridge installer

- `getGooglePageType(): string` in `src/sites/google/scraper.ts`
  Purpose: Add return type annotation (returns 'search' | 'images' | 'other')

- `scrapeSearchResults(): ContentItem[]` in `src/sites/google/scraper.ts`
  Purpose: Add return type, import ContentItem from types.ts

- `scrapeImageResults(): ContentItem[]` in `src/sites/google/scraper.ts`
  Purpose: Add return type

- `renderGoogleItem(item: ContentItem, isSelected: boolean): HTMLElement` in `src/sites/google/items.ts`
  Purpose: Add types to Google item renderer, import ContentItem from types.ts

- `injectGoogleItemStyles(): void` in `src/sites/google/items.ts`
  Purpose: Add return type annotation

- `renderGoogleGridItem(item: ContentItem, isSelected: boolean): HTMLElement` in `src/sites/google/grid.ts`
  Purpose: Add types to Google grid item renderer

- `renderGoogleImageGrid(state: AppState, siteState: GoogleState, container: HTMLElement): void` in `src/sites/google/grid.ts`
  Purpose: Add types to image grid renderer, import AppState, GoogleState from types.ts

- `injectGoogleGridStyles(): void` in `src/sites/google/grid.ts`
  Purpose: Add return type annotation

- `GRID_COLUMNS: number` in `src/sites/google/grid.ts`
  Purpose: Add type annotation to grid columns constant

- `getCachedPage(url: string): ContentItem[] | null` in `src/sites/google/page-cache.ts`
  Purpose: Add types, import ContentItem from types.ts

- `setCachedPage(url: string, items: ContentItem[]): void` in `src/sites/google/page-cache.ts`
  Purpose: Add types to page cache setter

- `clearPageCache(): void` in `src/sites/google/page-cache.ts`
  Purpose: Add return type annotation

- `createSuggestDrawer(config: SiteConfig): DrawerHandler` in `src/sites/google/suggest.ts`
  Purpose: Add types, import SiteConfig, DrawerHandler from types.ts

- `getSuggestDrawer(config: SiteConfig): DrawerHandler | null` in `src/sites/google/suggest.ts`
  Purpose: Add types for cached suggest drawer getter

- `resetSuggestDrawer(): void` in `src/sites/google/suggest.ts`
  Purpose: Add return type annotation

### Layer 1 — Site configs & orchestration

These implement the SiteConfig interface and compose all site-specific functions.

- `youtubeConfig: SiteConfig` in `src/sites/youtube/index.ts`
  Purpose: Type the exported config object as SiteConfig, ensuring all required properties match the interface. Add `satisfies SiteConfig` or explicit annotation.

- `createYouTubeState(): YouTubeState` in `src/sites/youtube/index.ts`
  Purpose: Add return type, import YouTubeState from types.ts

- `googleConfig: SiteConfig` in `src/sites/google/index.ts`
  Purpose: Type the exported config object as SiteConfig, ensuring all required properties match the interface. Add `satisfies SiteConfig` or explicit annotation.

- `createGoogleState(): GoogleState` in `src/sites/google/index.ts`
  Purpose: Add return type, import GoogleState from types.ts

### Layer 0 (implement last) — Entry points

These are the top-level entry points that wire everything together.

- `createApp(config: SiteConfig): App` in `src/core/index.ts`
  Purpose: Add types to main app factory — takes SiteConfig, returns App interface with getState, render, openPalette, etc. This is the largest function (~1300 lines) and contains many internal closures that reference AppState.

- `buildSearchUrl(config: SiteConfig, query: string): string` in `src/core/index.ts`
  Purpose: Add types to search URL builder

- `initSite(config: SiteConfig): void` in `src/core/index.ts`
  Purpose: Add types to site initializer entry point

- `getSiteConfig(): SiteConfig | null` in `src/content.ts`
  Purpose: Add return type, import SiteConfig from types.ts — the outermost entry point that detects the site

## Data Definitions Created/Modified
- `src/types.ts`: Created with 19 interfaces/types — AppState, AppCore, UIState, SortConfig, Message, BoundaryFlash, WatchLaterRemoval, KeyContext, SiteTheme, SiteConfig, PageConfig, DrawerHandler, ContentItem, PageState (union), ListPageState, WatchPageState, VideoContext, Chapter, TranscriptSegment, TranscriptResult, ChaptersResult, YouTubeState, GoogleState, StatusBarView, ContentView, DrawerView, ViewTree, App, KeyboardState, KeyEventResult, SortFieldDef
- `tsconfig.json`: Created with loose settings (strict: false, noImplicitAny: false, target ES2020, moduleResolution bundler)
- `build.js`: Updated entry points from `.js` to `.ts`
- `package.json`: Added typescript and @types/chrome devDependencies, version 0.6.15

## Assertion Changes Flagged
None — no test assertions were modified. Only import paths were updated (`.js` → extensionless).

## Notes
- **Phase 1 is complete**: all 63 files renamed .js→.ts, types.ts created, imports fixed, build passes, all 542 tests pass.
- **esbuild does NOT type-check** — it just strips types. So `bun run build` will pass even with type errors. For type-checking, use `npx tsc --noEmit` (not expected to pass until all wishes are implemented).
- **Gradual migration strategy**: Each wish involves adding type annotations to an already-implemented function. No logic changes needed — only signatures and imports. The implementer should `import type { ... } from '../types'` (or appropriate relative path) at the top of each file.
- **Test files do NOT need type annotations** in Phase 2 — tests use vitest which handles untyped JS-style code fine. Type annotations in test files can be a Phase 3 concern.
- **The `createApp` function in `src/core/index.ts` is 1300+ lines** with many internal closures. Typing it fully will require defining a callback/handler type for the internal functions. Consider typing just the public API (the returned App object) first, with internal functions remaining untyped.
- **Some types may need refinement** during implementation — the interfaces in types.ts were derived from JSDoc comments and may not perfectly match runtime shapes. The implementer should adjust types.ts if needed.
