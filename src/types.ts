// Vilify Type Definitions
// Central type file for gradual JS → TS migration
// Phase 1: Loose types to get everything compiling
// Phase 2: Strict types with proper narrowing

// =============================================================================
// CORE TYPES
// =============================================================================

export interface AppState {
  core: AppCore;
  ui: UIState;
  site: any;
  page: PageState | null;
}

export interface AppCore {
  focusModeActive: boolean;
  lastUrl: string;
}

export interface UIState {
  drawer: string | null;
  paletteQuery: string;
  paletteSelectedIdx: number;
  selectedIdx: number;
  filterActive: boolean;
  filterQuery: string;
  searchActive: boolean;
  searchQuery: string;
  keySeq: string;
  sort: SortConfig;
  message: Message | null;
  boundaryFlash: BoundaryFlash | null;
  watchLaterAdded: Set<string>;
  watchLaterRemoved: Map<string, WatchLaterRemoval>;
  lastWatchLaterRemoval: WatchLaterRemoval | null;
  dismissedVideos: Set<string>;
  lastDismissal: { videoId: string } | null;
}

export interface SortConfig {
  field: string | null;
  direction: 'asc' | 'desc';
}

export interface Message {
  text: string;
  timestamp: number;
}

export interface BoundaryFlash {
  edge: 'top' | 'bottom';
  timestamp: number;
}

export interface WatchLaterRemoval {
  videoId: string;
  setVideoId: string;
  position: number;
}

export interface KeyContext {
  pageType: string | null;
  filterActive: boolean;
  searchActive: boolean;
  drawer: string | null;
}

// =============================================================================
// SITE TYPES
// =============================================================================

export interface SiteTheme {
  bg1: string;
  bg2: string;
  bg3: string;
  txt1: string;
  txt2: string;
  txt3: string;
  txt4: string;
  accent: string;
  accentHover: string;
  modeNormal: string;
  modeSearch: string;
  modeCommand: string;
  modeFilter: string;
  modeReplace: string;
}

export interface SiteConfig {
  name: string;
  theme: SiteTheme;
  matches?: string[];
  logo?: string | null;
  getPageType: () => string;
  getItems?: () => ContentItem[];
  createPageState?: () => any;
  pages?: Record<string, PageConfig>;
  getCommands?: (ctx: any) => any[];
  getKeySequences?: (app: any, context: KeyContext) => Record<string, Function>;
  getBlockedNativeKeys?: (context: KeyContext) => string[];
  isNativeSearchInput?: (el: Element) => boolean;
  createSiteState?: () => any;
  getDrawerHandler?: (drawerState: any, siteState?: any) => DrawerHandler | null;
  onNavigate?: (oldUrl: string, newUrl: string, app: any) => void;
  searchUrl?: (query: string) => string;
  searchPlaceholder?: string;
  addToWatchLater?: (videoId: string) => Promise<boolean>;
  getPlaylistItemData?: (videoId: string) => Promise<{ setVideoId: string; position: number } | null>;
  removeFromWatchLater?: (setVideoId: string) => Promise<boolean>;
  undoRemoveFromWatchLater?: (videoId: string, position: number) => Promise<boolean>;
  dismissVideo?: (videoId: string) => Promise<boolean>;
  clickUndoDismiss?: () => Promise<boolean>;
  getDescription?: () => string;
  getChapters?: () => Chapter[];
  seekToChapter?: (chapter: Chapter) => void;
  getPageCache?: (url: string) => ContentItem[] | null;
  setPageCache?: (url: string, items: ContentItem[]) => void;
  [key: string]: any;
}

export interface PageConfig {
  render?: (state: AppState, siteState: any, container: HTMLElement) => void;
  onEnter?: (ctx: any) => void | Promise<void>;
  onLeave?: () => void;
  waitForContent?: () => boolean;
  gridColumns?: number;
  nextCommentPage?: () => void;
  prevCommentPage?: () => void;
  [key: string]: any;
}

export interface DrawerHandler {
  render: (container: HTMLElement) => void;
  onKey: (key: string, state: AppState) => { handled: boolean; newState: AppState };
  cleanup?: () => void;
  updateQuery?: (query: string) => void;
  getFilterPlaceholder?: () => string;
  [key: string]: any;
}

export interface ContentItem {
  title: string;
  url: string;
  id?: string;
  meta?: string;
  description?: string;
  channel?: string;
  channelUrl?: string;
  thumbnail?: string;
  duration?: string;
  views?: string;
  date?: string;
  badges?: string[];
  isLive?: boolean;
  isShort?: boolean;
  [key: string]: any;
}

// =============================================================================
// PAGE STATE (union type)
// =============================================================================

export type PageState = ListPageState | WatchPageState;

export interface ListPageState {
  type: 'list';
  videos: ContentItem[];
}

export interface WatchPageState {
  type: 'watch';
  videoContext: VideoContext | null;
  recommended: ContentItem[];
  chapters: Chapter[];
}

export interface VideoContext {
  videoId: string;
  title: string;
  channelName: string;
  channelUrl?: string;
  subscriberCount?: string;
  isSubscribed?: boolean;
  viewCount?: string;
  likeCount?: string;
  publishDate?: string;
  description?: string;
  [key: string]: any;
}

export interface Chapter {
  title: string;
  time: number;
  timeText: string;
}

// =============================================================================
// YOUTUBE-SPECIFIC TYPES
// =============================================================================

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptLine {
  time: number;
  timeText: string;
  duration: number;
  text: string;
}

export interface TranscriptResult {
  status: 'loading' | 'loaded' | 'error';
  videoId: string;
  segments?: TranscriptSegment[];
  lines?: TranscriptLine[];
  error?: string;
}

export interface ChaptersResult {
  status: 'loading' | 'loaded' | 'error';
  videoId: string;
  chapters?: Chapter[];
  error?: string;
}

export interface YouTubeState {
  chapterQuery: string;
  chapterSelectedIdx: number;
  commentPage: number;
  commentPageStarts: number[];
  settingsApplied: boolean;
  watchPageRetryCount: number;
  commentLoadAttempts: number;
  transcript: TranscriptResult | null;
  chapters: ChaptersResult | null;
}

// =============================================================================
// GOOGLE-SPECIFIC TYPES
// =============================================================================

export interface GoogleState {
  [key: string]: any;
}

// =============================================================================
// VIEW TREE TYPES
// =============================================================================

export interface StatusBarView {
  mode: string;
  inputVisible: boolean;
  inputValue: string;
  inputPlaceholder: string;
  inputFocus: boolean;
  sortLabel: string;
  itemCount: number | null;
  hints: string | null;
}

export interface ContentView {
  type: string;
  items: ContentItem[];
  selectedIdx: number;
  render: ((state: AppState, siteState: any, container: HTMLElement) => void) | null;
}

export interface DrawerView {
  type: string;
  visible: boolean;
  items: any[];
  selectedIdx: number;
  handler: DrawerHandler | null;
}

export interface ViewTree {
  statusBar: StatusBarView;
  content: ContentView;
  drawer: DrawerView | null;
}

// =============================================================================
// APP INTERFACE
// =============================================================================

export interface App {
  init: () => Promise<void>;
  destroy: () => void;
  getState: () => AppState | null;
  setState: (newState: AppState) => void;
  getSiteState: () => any;
  setSiteState: (newState: any) => void;
  render: () => void;
  openPalette: (mode?: string) => void;
  openLocalFilter: () => void;
  openDrawer: (drawerId: string) => void;
  closeDrawer: () => void;
  exitFocusMode: () => void;
  executeSort: (field: string) => void;
  [key: string]: any;
}

// =============================================================================
// KEYBOARD TYPES
// =============================================================================

export interface KeyboardState {
  keySeq: string;
  keyTimer: number | null;
}

export interface KeyEventResult {
  action: Function | null;
  pendingAction: Function | null;
  newSeq: string;
  shouldPrevent: boolean;
}

// =============================================================================
// SORT TYPES
// =============================================================================

export interface SortFieldDef {
  name: string;
  defaultDir: 'asc' | 'desc';
  prefixes: string[];
}
