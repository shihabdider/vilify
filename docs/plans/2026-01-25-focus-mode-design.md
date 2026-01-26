# Focus Mode Design

> Minimal distraction-free overlay for YouTube, preserving YouTube's native look and feel.

## Overview

Focus Mode provides a distraction-free YouTube experience by overlaying a minimal interface on top of YouTube's native UI. YouTube's functionality remains intact underneath (handling data loading, navigation, search), but users only see a clean single-column interface with YouTube's familiar branding and colors.

## Visual Design

### Theme: YouTube Dark

Keeps YouTube's native dark theme colors to feel familiar and site-specific:

```
Background:     #0f0f0f
Background HL:  #272727  
Hover:          #3f3f3f
Text Primary:   #f1f1f1
Text Secondary: #aaaaaa
Border:         #3f3f3f
Accent:         #ff0000 (YouTube red)
Blue:           #3ea6ff
```

### Design Principles

- **Font:** YouTube's native font stack (`Roboto`, `Arial`, sans-serif)
- **Borders:** Rounded corners (8-12px) matching YouTube's modern UI
- **Branding:** YouTube logo in header, not custom branding
- **Density:** Clean, spacious layout matching YouTube's aesthetic

### Example Layout (Listing Page)

```
┌─────────────────────────────────────────────────────────────┐
│ [YouTube Logo]                          [/] filter [i] search│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [thumbnail]  Video Title Goes Here                         │
│               channel name                                   │
│                                                             │
│  [thumbnail]  Another Video Title                           │
│               another channel                                │
│                                                             │
│  [thumbnail]  Third Video With Longer Title That Might      │
│               Wrap to Two Lines                             │
│               some channel                                   │
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
| `gi` → history | `gy` → history |
| No exit command | `:q` and `ZZ` to exit |

## Open Questions (resolved)

1. ~~Watch page layout~~ → Player + title + channel + subscribe + description + comments
2. ~~Search behavior~~ → `/` filters, `i` searches YouTube, `:` commands
3. ~~Focus mode toggle~~ → `:q` or `ZZ` to exit, refresh to re-enter
4. ~~History shortcut~~ → `gy` (removed `gi`)
5. ~~Theme~~ → YouTube Dark (keeps native site branding and colors)

## Future Considerations

- Persist focus mode preference (localStorage)
- Light mode toggle (YouTube Light theme)
- Custom keybinding configuration
- Thumbnail size options
