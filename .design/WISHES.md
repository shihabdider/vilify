# Wishes

Function wish list for iteration 031 (google-search).

## Pending (Iteration 031)

(none)

## Complete (Iteration 031)

### getGooglePageType
- **Signature**: `getGooglePageType : () → GooglePageType`
- **Purpose**: Detect current Google page type from URL ('search' | 'other')
- **File**: src/sites/google/scraper.js
- **Tests**: (I/O function, integration tested)

### scrapeSearchResults
- **Signature**: `scrapeSearchResults : () → Array<ContentItem>`
- **Purpose**: Extract search results from Google DOM using stable selectors
- **File**: src/sites/google/scraper.js
- **Selectors**: `#rso div[data-hveid][lang]` → `h3`, `a`, `div[style*="line"]`, `cite`
- **Tests**: (I/O function, integration tested)

### googleConfig
- **Signature**: `googleConfig : SiteConfig`
- **Purpose**: Google site configuration (theme, pages, scraper)
- **File**: src/sites/google/index.js

### getSiteConfig
- **Signature**: `getSiteConfig : () → SiteConfig | null`
- **Purpose**: Detect current site and return appropriate config
- **File**: src/content.js
- **Logic**: Check hostname for youtube.com vs google.com

## Complete (Iteration 030)

## Complete (Iteration 030)

### onWatchLaterAdd
- **Signature**: `onWatchLaterAdd : AppState × String → AppState`
- **Purpose**: Mark a video ID as added to Watch Later (session-scoped)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (3 tests)

### addToWatchLater
- **Signature**: `addToWatchLater : String → Promise<Boolean>`
- **Purpose**: Add video to Watch Later via YouTube's triple-dot menu (I/O)
- **File**: src/sites/youtube/commands.js
- **Tests**: (I/O function, integration tested)

## Complete (Iteration 028)

### createListPageState
- **Signature**: `createListPageState : Array<ContentItem> → ListPageState`
- **Purpose**: Create ListPageState for listing pages with videos array
- **File**: src/sites/youtube/state.js
- **Tests**: src/sites/youtube/state.test.js (3 tests)

### createWatchPageState
- **Signature**: `createWatchPageState : VideoContext | null × Array<ContentItem> × Array<Chapter> → WatchPageState`
- **Purpose**: Create WatchPageState for watch page with video context, recommended, and chapters
- **File**: src/sites/youtube/state.js
- **Tests**: src/sites/youtube/state.test.js (3 tests)

### onPageUpdate
- **Signature**: `onPageUpdate : AppState × PageState → AppState`
- **Purpose**: Replace state.page with new PageState (used on navigation)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (4 tests)

### onListItemsUpdate
- **Signature**: `onListItemsUpdate : AppState × Array<ContentItem> → AppState`
- **Purpose**: Update videos in ListPageState (for content polling), validates page type
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (4 tests)

### getPageItems
- **Signature**: `getPageItems : AppState → Array<Item>`
- **Purpose**: Extract items from page state based on page type (list or watch)
- **File**: src/core/view-tree.js
- **Tests**: src/core/view-tree.test.js (4 tests)

### toContentView (update)
- **Signature**: `toContentView : AppState × SiteConfig → ContentView`
- **Purpose**: Compute content view reading items from state.page (no items parameter)
- **File**: src/core/view-tree.js
- **Tests**: src/core/view-tree.test.js (updated existing + 1 new)

### createPageState (site config)
- **Signature**: `createPageState : () → YouTubePageState`
- **Purpose**: Factory function to create page state for current page type
- **File**: src/sites/youtube/index.js
- **Tests**: (I/O function, integration tested)

## Complete (Iteration 027)

## Complete (Iteration 027)

### onChaptersRequest
- **Signature**: `onChaptersRequest : YouTubeState × String → YouTubeState`
- **Purpose**: Mark chapters as loading for videoId (pure state transition)
- **File**: src/sites/youtube/state.js
- **Tests**: src/sites/youtube/state.test.js (4 tests)

### onChaptersLoad
- **Signature**: `onChaptersLoad : YouTubeState × ChaptersResult → YouTubeState`
- **Purpose**: Store fetched chapters (validates videoId matches, ignores stale results)
- **File**: src/sites/youtube/state.js
- **Tests**: src/sites/youtube/state.test.js (4 tests)

### onChaptersClear
- **Signature**: `onChaptersClear : YouTubeState → YouTubeState`
- **Purpose**: Clear chapters state when leaving watch page
- **File**: src/sites/youtube/state.js
- **Tests**: src/sites/youtube/state.test.js (2 tests)

### getChapterDrawer (updated)
- **Signature**: `getChapterDrawer : ChaptersResult → DrawerHandler`
- **Purpose**: Now receives chapters from state instead of scraping DOM
- **File**: src/sites/youtube/drawers/chapters.js

## Complete (Iteration 026)

### onTranscriptRequest
- **Signature**: `onTranscriptRequest : YouTubeState × String → YouTubeState`
- **Purpose**: Mark transcript as loading for videoId (pure state transition)
- **File**: src/sites/youtube/state.js
- **Tests**: src/sites/youtube/state.test.js (4 tests)

### onTranscriptLoad
- **Signature**: `onTranscriptLoad : YouTubeState × TranscriptResult → YouTubeState`
- **Purpose**: Store fetched transcript (validates videoId matches, ignores stale results)
- **File**: src/sites/youtube/state.js
- **Tests**: src/sites/youtube/state.test.js (4 tests)

### onTranscriptClear
- **Signature**: `onTranscriptClear : YouTubeState → YouTubeState`
- **Purpose**: Clear transcript state when leaving watch page
- **File**: src/sites/youtube/state.js
- **Tests**: src/sites/youtube/state.test.js (2 tests)

### PageConfig.onEnter (updated)
- **Signature**: `onEnter : Context → Promise<void>`
- **Purpose**: Now receives context object with state management functions
- **Context**: `{ getSiteState, updateSiteState, render }`
- **File**: src/core/index.js (caller), src/sites/youtube/index.js (consumer)

## Complete (Iteration 025)

### Legacy State Removal
- **Scope**: Remove `createLegacyState()` and all dual-access patterns (`state.ui?.x ?? state.x`)
- **Files**: state.js, palette.js, drawer.js, keyboard.js, view-tree.js, index.js, youtube/index.js
- **Tests**: Removed 8 legacy tests, 90 tests pass

## Complete (Iteration 024)

### getPageConfig
- **Signature**: `getPageConfig : PageType → PageConfig | null`
- **Purpose**: Get page configuration for a given page type
- **File**: src/core/index.js (inside createApp closure)
- **Tests**: (helper function, tested via integration)

### PageConfig.onEnter
- **Signature**: `onEnter : () → void | Promise<void>`
- **Purpose**: Called when entering a page type (after waitForContent)
- **File**: src/sites/youtube/index.js (watchPageConfig)
- **Tests**: (I/O hook)

### PageConfig.onLeave
- **Signature**: `onLeave : () → void`
- **Purpose**: Called when leaving a page type (before navigation)
- **File**: src/sites/youtube/index.js (watchPageConfig)
- **Tests**: (I/O hook)

## Complete (Iteration 023)

### createApp
- **Signature**: `createApp : SiteConfig → App`
- **Purpose**: Create app instance with encapsulated state and event handlers
- **File**: src/core/index.js
- **Tests**: (factory function, tested via integration)

### App.init
- **Signature**: `App.init : () → Promise<void>`
- **Purpose**: Initialize app (inject styles, set up handlers, show UI)
- **File**: src/core/index.js
- **Tests**: (I/O function)

### App.destroy
- **Signature**: `App.destroy : () → void`
- **Purpose**: Clean up event handlers and timers
- **File**: src/core/index.js
- **Tests**: (I/O function)

### setupKeyboardHandler (updated)
- **Signature**: `setupKeyboardHandler : SiteConfig × ... → () → void`
- **Purpose**: Set up keyboard handler, now returns cleanup function
- **File**: src/core/keyboard.js
- **Tests**: (I/O function)

## Complete (Iteration 022)

### toView
- **Signature**: `toView : AppState × SiteConfig × Object → ViewTree`
- **Purpose**: Compute complete view tree from state (pure, no DOM access)
- **File**: src/core/view-tree.js
- **Tests**: src/core/view-tree.test.js (7 tests)

### toStatusBarView
- **Signature**: `toStatusBarView : AppState × String | null → StatusBarView`
- **Purpose**: Compute status bar view from state
- **File**: src/core/view-tree.js
- **Tests**: src/core/view-tree.test.js (8 tests)

### toContentView
- **Signature**: `toContentView : AppState × SiteConfig × Item[] → ContentView`
- **Purpose**: Compute content area view from state
- **File**: src/core/view-tree.js
- **Tests**: src/core/view-tree.test.js (5 tests)

### toDrawerView
- **Signature**: `toDrawerView : AppState × SiteConfig × Object → DrawerView | null`
- **Purpose**: Compute drawer view from state (palette items, handlers)
- **File**: src/core/view-tree.js
- **Tests**: src/core/view-tree.test.js (3 tests)

### applyView
- **Signature**: `applyView : ViewTree × Object → void`
- **Purpose**: Apply view tree to DOM (all I/O isolated here)
- **File**: src/core/apply-view.js
- **Tests**: (I/O function, tested via integration)

### applyStatusBar
- **Signature**: `applyStatusBar : StatusBarView × StatusBarView | null → void`
- **Purpose**: Apply status bar view to DOM
- **File**: src/core/apply-view.js
- **Tests**: (I/O function)

### applyContent
- **Signature**: `applyContent : ContentView × ContentView | null × Object → void`
- **Purpose**: Apply content view to DOM
- **File**: src/core/apply-view.js
- **Tests**: (I/O function)

### applyDrawer
- **Signature**: `applyDrawer : DrawerView | null × DrawerView | null → void`
- **Purpose**: Apply drawer view to DOM (show/hide palette, site drawers)
- **File**: src/core/apply-view.js
- **Tests**: (I/O function)

### View Comparison Helpers
- `statusBarViewEqual : StatusBarView × StatusBarView → Boolean`
- `contentViewChanged : ContentView × ContentView → Boolean`
- `drawerViewChanged : DrawerView × DrawerView → Boolean`
- **File**: src/core/view-tree.js
- **Tests**: src/core/view-tree.test.js (6 tests)

## Complete (Iteration 021)

### createAppState
- **Signature**: `createAppState : SiteConfig | null → AppState`
- **Purpose**: Create initial app state with nested structure (core, ui, site, page)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (4 tests)

### getMode
- **Signature**: `getMode : AppState → Mode`
- **Purpose**: Derive current mode from state (NORMAL, COMMAND, FILTER, SEARCH, or drawer name)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (12 tests)

### createLegacyState (helper)
- **Signature**: `createLegacyState : () → Object`
- **Purpose**: Create flat state structure for backward compatibility during migration
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (1 test)

### onNavigate
- **Signature**: `onNavigate : AppState × Direction × Number → { state: AppState, boundary: 'top'|'bottom'|null }`
- **Purpose**: Move selection up/down/top/bottom in list, returns boundary hit info
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (8 tests)

### onFilterToggle
- **Signature**: `onFilterToggle : AppState → AppState`
- **Purpose**: Enter/exit filter mode
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (3 tests)

### onFilterChange
- **Signature**: `onFilterChange : AppState × String → AppState`
- **Purpose**: Update filter query text
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (2 tests)

### onDrawerOpen
- **Signature**: `onDrawerOpen : AppState × DrawerType → AppState`
- **Purpose**: Open a drawer (command palette, chapters, etc.)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (2 tests)

### onDrawerClose
- **Signature**: `onDrawerClose : AppState → AppState`
- **Purpose**: Close current drawer
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (1 test)

### onKeySeqUpdate
- **Signature**: `onKeySeqUpdate : AppState × String → AppState`
- **Purpose**: Update partial key sequence (e.g., 'g' waiting for second key)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (2 tests)

### onKeySeqClear
- **Signature**: `onKeySeqClear : AppState → AppState`
- **Purpose**: Clear key sequence (on timeout or completion)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (1 test)

### onSortChange
- **Signature**: `onSortChange : AppState × SortField × SortDirection → AppState`
- **Purpose**: Update sort field and direction
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (3 tests)

### onUrlChange
- **Signature**: `onUrlChange : AppState × String × SiteConfig → AppState`
- **Purpose**: Handle URL navigation (reset page state, preserve site state)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (2 tests)

### onItemsUpdate
- **Signature**: `onItemsUpdate : AppState × Item[] → AppState`
- **Purpose**: Update items from content polling (stores in page.items if applicable)
- **File**: src/core/state.js
- **Tests**: (placeholder - items typically fetched via getItems())

### onShowMessage
- **Signature**: `onShowMessage : AppState × String → AppState`
- **Purpose**: Show a flash message (sets ui.message with current timestamp)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (1 test)

### onBoundaryHit
- **Signature**: `onBoundaryHit : AppState × ('top' | 'bottom') → AppState`
- **Purpose**: Flash edge when hitting list boundary (sets ui.boundaryFlash)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (1 test)

### onClearFlash
- **Signature**: `onClearFlash : AppState × Number × Number → AppState`
- **Purpose**: Clear expired flash states (message and boundaryFlash based on timestamp)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (3 tests)

### onSearchToggle
- **Signature**: `onSearchToggle : AppState → AppState`
- **Purpose**: Enter/exit site search mode
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (2 tests)

### onSearchChange
- **Signature**: `onSearchChange : AppState × String → AppState`
- **Purpose**: Update site search query text
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (1 test)

### onPaletteQueryChange
- **Signature**: `onPaletteQueryChange : AppState × String → AppState`
- **Purpose**: Update command palette query text
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (1 test)

### onPaletteNavigate
- **Signature**: `onPaletteNavigate : AppState × Direction × Number → { state: AppState, boundary: 'top'|'bottom'|null }`
- **Purpose**: Navigate selection in command palette
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (4 tests)

### getVisibleItems
- **Signature**: `getVisibleItems : AppState × Item[] → Item[]`
- **Purpose**: Get items after filter/sort applied (supports both filter and sort)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (9 tests)

### onSelect
- **Signature**: `onSelect : AppState × Item[] × Boolean → { action: 'navigate'|'newTab'|null, url: string|null }`
- **Purpose**: Determine action for selecting current item (returns descriptor, I/O shell handles navigation)
- **File**: src/core/state.js
- **Tests**: src/core/state.test.js (6 tests)
