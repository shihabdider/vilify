# Vilify Design Document

> Bespoke vim-style command palettes for the web.

## Philosophy

Unlike generic browser extensions (Vimium, Surfingkeys) that try to handle all websites with one-size-fits-all solutions, Vilify provides **deep, site-specific integrations**. Each site gets:

- **Native-feeling UI** — themed to match the site's design language
- **Context-aware commands** — actions that make sense for that specific site
- **Reliable DOM scraping** — selectors tuned to each site's structure
- **Site-specific keybindings** — vim-inspired but adapted to each site's needs

The bespokeness is the point. Generic solutions handle nothing well; focused solutions handle one thing excellently.

---

## Supported Sites

| Site | Status | Script |
|------|--------|--------|
| YouTube | ✅ Implemented | `vilify-youtube.user.js` |
| Gmail | 🔜 Planned | `vilify-gmail.user.js` |
| Google Search | 🔜 Planned | `vilify-google.user.js` |

---

## Architecture

### Approach: Template + Convention

Rather than a shared library, Vilify uses a **documented template** approach:

```
vilify/
├── sites/
│   ├── youtube.user.js      # Complete, standalone
│   ├── gmail.user.js        # Complete, standalone
│   └── reddit.user.js       # Complete, standalone
│
├── template/
│   └── site.template.js     # Documented skeleton with TODOs
│
├── docs/
│   ├── design.md            # This document
│   ├── contributing.md      # How to add a new site
│   ├── patterns.md          # Common code patterns
│   └── plans/               # Implementation plans
│
└── README.md                # Installation links
```

**Why not a shared library?**

1. The "shared" code would be ~100 lines of trivial utilities
2. Each site needs different rendering (thumbnails vs icons vs previews)
3. Abstraction adds complexity without reducing code
4. Sites can evolve independently

**What IS shared:**

- **Template:** Starting point with boilerplate solved
- **Patterns:** Documented solutions for common problems
- **Conventions:** Consistent UX across sites (keybindings, palette behavior)

### Installation Flow

```
User clicks Install link
    ↓
GitHub raw URL → Tampermonkey
    ↓
Script installed with @updateURL
    ↓
Auto-updates on future changes
```

Each site is a standalone `.user.js` file with:
```javascript
// @updateURL    https://raw.githubusercontent.com/shihabdider/vilify/main/sites/[site].user.js
// @downloadURL  https://raw.githubusercontent.com/shihabdider/vilify/main/sites/[site].user.js
```

---

## Core Module Specifications

### `core/palette.js`

Responsibilities:
- Create overlay and modal DOM structure
- Render list of items (commands or scraped content)
- Handle selection state (selectedIdx)
- Support two item types: **command** (icon + label + keys) and **content** (thumbnail + title + meta)

Interface:
```javascript
// Site provides these via registration
interface PaletteConfig {
  cssVariables: string;      // Site-specific CSS variables
  logoHtml: string;          // Header logo element
  title: string;             // "Command Palette" etc.
  placeholder: string;       // Input placeholder
}

// Core provides these
function createPalette(config: PaletteConfig): void;
function openPalette(items: Item[], mode?: string): void;
function closePalette(): void;
function isPaletteOpen(): boolean;
function render(items: Item[]): void;
function setSelectedIdx(idx: number): void;
```

### `core/keyboard.js`

Responsibilities:
- Global keydown listener (capture phase)
- Vim-style sequence detection (e.g., `gh`, `yy`)
- Configurable sequence timeout
- Ignore input elements (except palette input)
- Handle palette triggers (currently `/` for videos, `:` for commands)

Interface:
```javascript
interface KeyboardConfig {
  sequences: Record<string, () => void>;  // 'gh' -> action
  singleKeys: Record<string, () => void>; // 'Y' (shift+y) -> action
  paletteTriggers: {
    video: string;    // '/' to open video palette
    command: string;  // ':' to open command palette
  };
  sequenceTimeout: number;  // ms, default 500
}

function initKeyboard(config: KeyboardConfig): void;
```

### `core/input.js`

Responsibilities:
- Handle input events in palette
- Filter items based on query
- Support mode prefixes (`:` for commands)
- Arrow key navigation
- Enter/Shift+Enter execution

Interface:
```javascript
interface InputConfig {
  onFilter: (query: string) => Item[];
  onExecute: (item: Item, newTab: boolean) => void;
  commandPrefix: string;  // ':' 
}

function initInput(config: InputConfig): void;
```

### `core/utils.js`

Shared utilities:
```javascript
function showToast(message: string, duration?: number): void;
function copyToClipboard(text: string): void;
function escapeHtml(str: string): string;
function createElement(tag: string, attrs: object, children?: array): HTMLElement;
```

---

## Site Module Specifications

### Site Interface

Each site module exports:
```javascript
export default {
  // Metadata
  name: 'youtube',
  match: ['*://www.youtube.com/*', '*://youtube.com/*'],
  
  // Theme
  css: `/* site-specific CSS including variables */`,
  logo: `<div class="logo">...</div>`,
  
  // Commands
  getCommands(): Command[];
  getKeySequences(): Record<string, () => void>;
  getSingleKeyActions(): Record<string, () => void>;
  
  // Content scraping (optional)
  scrapeContent?(): ContentItem[];
  
  // Context
  getContext(): SiteContext;
  
  // Lifecycle
  init?(): void;           // Called once on load
  onNavigate?(): void;     // Called on SPA navigation
}
```

### YouTube Site Module

**Theme:** Dark background (#0f0f0f), red accents (#ff0000), Roboto font

**Page Types:**
- `home` — trending/recommended
- `watch` — video player page
- `subscriptions` — subscription feed
- `history` — watch history
- `library` — saved playlists
- `channel` — channel page
- `search` — search results
- `shorts` — shorts player

**Context (on watch page):**
```javascript
{
  videoId: string,
  title: string,
  channelName: string,
  channelUrl: string,
  currentTime: number,
  duration: number,
  paused: boolean,
  playbackRate: number,
  muted: boolean,
  isLiked: boolean,
  isSubscribed: boolean,
}
```

**Commands:**
| Group | Commands |
|-------|----------|
| Navigation | Home, Subscriptions, History, Library, Trending, Search |
| Playback | Play/Pause, Seek ±5s/±10s, Speed (0.5x-2x) |
| View | Fullscreen, Theater, Captions, Mute |
| Copy | URL, URL at time, Title, Title+URL |
| Channel | Go to channel, Channel videos |

**Key Sequences:**
| Sequence | Action |
|----------|--------|
| `/` | Open palette (videos) |
| `:` | Open palette (commands) |
| `gh` | Go home |
| `gs` | Go subscriptions |
| `gi` | Go history |
| `gl` | Go library |
| `gt` | Go trending |
| `gc` | Go to channel (on watch) |
| `g1` | Speed 1x |
| `g2` | Speed 2x |
| `yy` | Yank (copy) URL |
| `yt` | Yank title |
| `ya` | Yank all (title + URL) |
| `Y` | Yank URL at current time |
| `i` | Focus search box |

**Video Scraping:**
- Selectors: `yt-lockup-view-model`, `ytd-rich-item-renderer`, `ytd-video-renderer`, `ytd-compact-video-renderer`
- Extract: videoId, title, channelName, thumbnailUrl
- Cache for 2 seconds
- Limit to 15 videos

### Gmail Site Module (Planned)

**Theme:** White background, blue accents (#1a73e8), Google Sans font

**Page Types:**
- `inbox` — main inbox
- `thread` — viewing an email thread
- `compose` — composing new email
- `search` — search results
- `label` — viewing a label

**Commands:**
| Group | Commands |
|-------|----------|
| Navigation | Inbox, Sent, Drafts, Starred, Snoozed, Important |
| Thread Actions | Archive, Delete, Mark read/unread, Star, Snooze |
| Labels | Add label, Remove label, Move to |
| Compose | Compose new, Reply, Reply all, Forward |
| Copy | Copy email link, Copy subject |

**Key Sequences:**
| Sequence | Action |
|----------|--------|
| `gi` | Go inbox |
| `gs` | Go starred |
| `gt` | Go sent |
| `gd` | Go drafts |
| `e` | Archive |
| `#` | Delete |
| `r` | Reply |
| `a` | Reply all |
| `f` | Forward |
| `c` | Compose |
| `u` | Mark unread |
| `s` | Star/unstar |

### Google Search Site Module (Planned)

**Theme:** White background, blue links, minimal chrome

**Page Types:**
- `search` — web search results
- `images` — image search
- `news` — news search
- `videos` — video search

**Commands:**
| Group | Commands |
|-------|----------|
| Navigation | Images, News, Videos, Maps, Shopping |
| Results | Open result #1-10, Open in new tab |
| Copy | Copy search URL, Copy query |
| Search | Focus search box, Clear and search |

**Key Sequences:**
| Sequence | Action |
|----------|--------|
| `1`-`9`, `0` | Open result #1-10 |
| `gi` | Go images |
| `gn` | Go news |
| `gv` | Go videos |
| `/` | Focus search |
| `yy` | Copy search URL |

---

## SPA Navigation Handling

All three sites are SPAs. We use MutationObserver + popstate:

```javascript
let lastUrl = location.href;

const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    site.onNavigate?.();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('popstate', () => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    site.onNavigate?.();
  }
});
```

---

## Rendering Approach

YouTube blocks `innerHTML` due to Trusted Types CSP. We use DOM APIs:

```javascript
function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'textContent') el.textContent = val;
    else if (key === 'className') el.className = val;
    else el.setAttribute(key, val);
  }
  for (const child of children) {
    el.appendChild(typeof child === 'string' 
      ? document.createTextNode(child) 
      : child);
  }
  return el;
}
```

This approach works universally and avoids CSP issues.

---

## Refactoring Plan

### Phase 1: Extract Core from YouTube

1. Identify all YouTube-specific code (context, scraping, commands, theme)
2. Extract generic palette/keyboard/input logic
3. Create site interface contract
4. Refactor YouTube to use core + site structure
5. Verify YouTube still works

### Phase 2: Build Infrastructure

1. Set up esbuild for bundling
2. Create build script that combines core + site → userscript
3. Test build output matches current functionality

### Phase 3: Add Gmail

1. Implement Gmail site module
2. Theme: white/blue, Google Sans
3. Context detection for inbox/thread/compose
4. Email scraping (careful: obfuscated classes)
5. Gmail-specific commands

### Phase 4: Add Google Search

1. Implement Google Search site module
2. Minimal theme
3. Result scraping (numbered results)
4. Search-specific commands

---

## Open Questions

1. **Shared settings?** Should there be a global config (e.g., sequence timeout) or per-site?
   - *Current thinking:* Per-site, but with sensible defaults from core.

2. **Cross-site consistency vs site-native feel?** How much should keybindings differ?
   - *Current thinking:* Common patterns (`g` prefix for go, `y` prefix for yank) but site-specific targets.

3. **Installation UX?** Should users install 3 separate scripts or one mega-script?
   - *Current thinking:* Separate scripts. Users only install what they need. Simpler to maintain.

4. **Auto-update mechanism?** 
   - *Current thinking:* Use Tampermonkey's `@updateURL` and `@downloadURL` pointing to GitHub raw files.

---

## File Reference

| File | Purpose |
|------|---------|
| `vilify-youtube.user.js` | Current monolithic YouTube implementation |
| `docs/design.md` | This document |
| `docs/testing-checklist.md` | Manual testing checklist |
| `docs/plans/*.md` | Implementation plans |
