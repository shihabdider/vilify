# Focus Mode Design

> Minimal TUI-style overlay for YouTube with Solarized Dark theme.

## Overview

Focus Mode provides a distraction-free YouTube experience by overlaying a minimal, terminal-inspired interface on top of YouTube's native UI. YouTube's functionality remains intact underneath (handling data loading, navigation, search), but users only see a clean single-column interface.

## Visual Design

### Theme: Solarized Dark

```
Background:     #002b36 (base03)
Background HL:  #073642 (base02)
Border:         #586e75 (base01)
Text Primary:   #839496 (base0)
Text Secondary: #657b83 (base00)
Text Emphasis:  #93a1a1 (base1)
Accent:         #268bd2 (blue)
Accent Alt:     #2aa198 (cyan)
Selection:      #859900 (green)
Error:          #dc322f (red)
```

### TUI Aesthetics

- **Font:** Monospace (`'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace`)
- **Borders:** Box drawing characters (`┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼`)
- **Chrome:** No rounded corners, minimal padding
- **Density:** Compact list items, more content per screen

### Example Layout (Listing Page)

```
┌─────────────────────────────────────────────────────────────┐
│ VILIFY                                            [/] filter│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  Video Title Goes Here                        │
│  │          │  channel name · 2 days ago · 124K views       │
│  └──────────┘                                               │
│                                                             │
│  ┌──────────┐  Another Video Title                          │
│  │          │  another channel · 1 week ago · 50K views     │
│  └──────────┘                                               │
│                                                             │
│  ┌──────────┐  Third Video With Longer Title That Might     │
│  │          │  Wrap to Two Lines                            │
│  └──────────┘  some channel · 3 days ago · 89K views        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ j/k navigate · enter select · shift+enter new tab · :q quit │
└─────────────────────────────────────────────────────────────┘
```

## Page Layouts

### Listing Pages (home, search, history, subscriptions, channel)

**Visible elements:**
- Header with logo and filter indicator
- Single-column video list with thumbnails
- Footer with key hints

**Hidden elements:**
- YouTube sidebar
- YouTube header/navbar
- Chips/filters bar
- Shorts shelves
- All promotional content

**Behavior:**
- Videos scraped from hidden YouTube DOM
- `/` activates filter input (filters current videos)
- `i` focuses YouTube search (triggers real search)
- `:` opens command palette

### Watch Page

**Visible elements:**
- Video player (full width)
- Title
- Channel name + subscribe button
- Description (collapsible)
- Comments section

**Hidden elements:**
- Recommended videos sidebar
- End screen overlays
- Playlist sidebar
- "Up next" section

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [ VIDEO PLAYER ]                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Video Title                                                 │
│ Channel Name                                    [SUBSCRIBE] │
├─────────────────────────────────────────────────────────────┤
│ Description text here, can be multiple lines...             │
│ [show more]                                                 │
├─────────────────────────────────────────────────────────────┤
│ Comments (243)                                              │
│─────────────────────────────────────────────────────────────│
│ @user · 2 days ago                                          │
│ Comment text goes here                                      │
│                                                             │
│ @another · 1 week ago                                       │
│ Another comment                                             │
└─────────────────────────────────────────────────────────────┘
```

## Keybindings

### Global (all pages)

| Key | Action |
|-----|--------|
| `/` | Filter current videos |
| `:` | Open command palette |
| `i` | Focus YouTube search |
| `:q` | Exit focus mode |
| `ZZ` | Exit focus mode |
| `j` / `↓` | Move selection down |
| `k` / `↑` | Move selection up |
| `Enter` | Select / navigate |
| `Shift+Enter` | Open in new tab |

### Navigation

| Key | Action |
|-----|--------|
| `gh` | Go home |
| `gs` | Go subscriptions |
| `gy` | Go history |
| `gl` | Go library |
| `gt` | Go trending |
| `gc` | Go to channel (on watch page) |

### Watch Page

| Key | Action |
|-----|--------|
| `Space` | Play/pause |
| `f` | Toggle fullscreen |
| `m` | Toggle mute |
| `yy` | Copy video URL |
| `Y` | Copy URL at current time |
| `yt` | Copy title |
| `ya` | Copy title + URL |
| `g1` | Speed 1x |
| `g2` | Speed 2x |

## Implementation Approach

### Initialization Flow

1. Userscript loads
2. Inject CSS immediately to hide YouTube UI (prevents flash)
3. Wait for YouTube data to load (observe DOM for video elements)
4. Build and display focus mode overlay
5. Continue observing for SPA navigation

### CSS Strategy

```css
/* Hide YouTube UI immediately */
ytd-app { visibility: hidden !important; }

/* Show specific elements we need */
#movie_player { visibility: visible !important; }

/* Our overlay sits on top */
#vilify-focus {
  position: fixed;
  inset: 0;
  z-index: 9999;
  visibility: visible !important;
}
```

### Video Scraping

Continue using current DOM scraping approach:
- Works on all page types (home, search, history, channel, etc.)
- Selectors already handle both old and new YouTube layouts
- Cache results for 2 seconds to avoid re-scraping

### Focus Mode Toggle

- **Exit:** `:q` or `ZZ` removes overlay, shows YouTube UI
- **Re-enter:** Refresh page (focus mode is default)
- State not persisted — always starts in focus mode

### SPA Navigation Handling

- Detect URL changes via MutationObserver + popstate
- On navigation: re-scrape videos, rebuild list
- Keep overlay visible during transitions

## Changes from Current Implementation

| Current | New |
|---------|-----|
| Palette is optional overlay | Focus mode is default UI |
| YouTube theme (dark red) | Solarized Dark |
| Rounded corners, YouTube fonts | Box drawing, monospace |
| `gi` → history | `gy` → history |
| No exit command | `:q` and `ZZ` to exit |

## Open Questions (resolved)

1. ~~Watch page layout~~ → Player + title + channel + subscribe + description + comments
2. ~~Search behavior~~ → `/` filters, `i` searches YouTube, `:` commands
3. ~~Focus mode toggle~~ → `:q` or `ZZ` to exit, refresh to re-enter
4. ~~History shortcut~~ → `gy` (removed `gi`)
5. ~~Theme~~ → Solarized Dark, TUI aesthetics

## Future Considerations

- Persist focus mode preference (localStorage)
- Light mode toggle (Solarized Light)
- Custom keybinding configuration
- Thumbnail size options
