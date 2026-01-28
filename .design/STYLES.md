# Style Guide - TUI Aesthetic

This documents the visual design language for the extension.

## Color Palette (Solarized Dark)

```css
:root {
  /* Backgrounds */
  --bg-1: #002b36;    /* Main background */
  --bg-2: #073642;    /* Panels, cards, hover states */
  --bg-3: #0a4a5c;    /* Borders, subtle accents */

  /* Text */
  --txt-1: #f1f1f1;   /* Primary text (selected items) */
  --txt-2: #aaaaaa;   /* Secondary text (normal items) */
  --txt-3: #717171;   /* Muted text (hints, labels) */
  --txt-4: #3ea6ff;   /* Accent text (links, special) */

  /* Brand */
  --yt-red: #ff0000;        /* YouTube red (selection outlines) */
  --yt-red-hover: #cc0000;  /* Darker red for hover */
}
```

## Typography

```css
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
```

- **Base size:** 14px
- **Line height:** 1.5
- **Weights:** 400 only (no bold except sparse use)

## TUI Box Pattern

The signature visual element - bordered boxes with inline titles:

```
┌─ video ────────────────────────┐
│                                │
│  Content here                  │
│                                │
└────────────────────────────────┘
```

### CSS Implementation

```css
.tui-box {
  position: relative;
  border: 2px solid var(--bg-3);
  padding: 16px;
  margin: 12px;
}

.tui-box::before {
  content: 'label';
  position: absolute;
  top: -10px;
  left: 10px;
  background: var(--bg-1);  /* Must match container bg */
  color: var(--txt-3);
  padding: 0 6px;
  font-size: 12px;
}
```

### Usage Examples

| Element | Label |
|---------|-------|
| Video info panel | `video` |
| Comments section | `comments` |

## Selection States

### List Items (videos, commands, chapters)

```css
/* Normal */
.item {
  background: transparent;
  color: var(--txt-2);
}

/* Hover */
.item:hover {
  background: var(--bg-2);
}

/* Selected */
.item.selected {
  background: var(--bg-2);
  outline: 2px solid var(--yt-red);
  outline-offset: -2px;
}

.item.selected .title {
  color: var(--txt-1);  /* Brighter when selected */
}
```

### Thumbnails

```css
/* Normal */
.thumb {
  border: 1px solid var(--bg-3);
}

/* Selected */
.item.selected .thumb {
  border-color: var(--yt-red);
}
```

## Buttons

### Subscribe Button (TUI style)

```css
/* Unsubscribed */
.subscribe-btn {
  background: transparent;
  border: 1px solid var(--yt-red);
  color: var(--yt-red);
  padding: 4px 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
}

.subscribe-btn:hover {
  background: var(--yt-red);
  color: var(--bg-1);
}

/* Subscribed */
.subscribe-btn.subscribed {
  border-color: var(--txt-3);
  color: var(--txt-3);
}

.subscribe-btn.subscribed:hover {
  background: var(--bg-3);
}
```

## Keyboard Hint Badges

```css
kbd {
  background: transparent;
  border: 1px solid var(--bg-3);
  padding: 1px 5px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--txt-3);
}

/* In selected items */
.selected kbd {
  border-color: var(--txt-3);
  color: var(--txt-1);
}
```

## Input Fields

```css
input {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--bg-3);
  color: var(--txt-1);
  font-family: var(--font-mono);
  font-size: 14px;
  padding: 4px 8px;
  outline: none;
}

input:focus {
  border-bottom-color: var(--txt-3);
}

input::placeholder {
  color: var(--txt-3);
}
```

## Scrollbars

```css
/* Firefox */
scrollbar-width: thin;
scrollbar-color: var(--bg-3) transparent;

/* Webkit */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--bg-3);
}
```

---

## Layout Structure

### Listing Page (Home, Subscriptions, Search Results, etc.)

No header. Full-screen content with status bar at bottom.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌──────────┐                                       │
│  │ Thumb    │  Video Title Here                    │
│  │          │  Channel Name · 2 days ago            │
│  └──────────┘                                       │
│                                                     │
│  ┌──────────┐                                       │
│  │ Thumb    │  Another Video Title                  │  Content
│  │          │  Another Channel · 1 week ago         │  (scrollable)
│  └──────────┘                                       │
│                                                     │
│  ┌──────────┐                                       │
│  │ Thumb    │  Third Video                          │
│  │          │  Channel · 3 days ago                 │
│  └──────────┘                                       │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [NORMAL]                                            │  Status Bar
└─────────────────────────────────────────────────────┘
```

### Watch Page

Video player on left (full height minus status bar), sidebar on right with video info and comments.

```
┌───────────────────────────────────────┬─────────────────────────────┐
│                                       │ ┌─ video ────────────────┐  │
│                                       │ │ Video Title Here       │  │
│                                       │ │ Channel · 2 days ago   │  │
│                                       │ │                        │  │
│                                       │ │ [m] subscribe          │  │
│           Video Player                │ │ [zo] desc · [f] chap   │  │
│           (YouTube native)            │ └────────────────────────┘  │
│                                       │ ┌─ comments ─────────────┐  │
│                                       │ │ @user1                 │  │
│                                       │ │ Great video!           │  │
│                                       │ │ ────────────────────   │  │
│                                       │ │ @user2                 │  │
│                                       │ │ Thanks for explaining  │  │
│                                       │ ├────────────────────────┤  │
│                                       │ │ [^b] 1-8 / 45 [^f]     │  │
│                                       │ └────────────────────────┘  │
├───────────────────────────────────────┴─────────────────────────────┤
│ [NORMAL]                                                            │
└─────────────────────────────────────────────────────────────────────┘

Sidebar width: 350px
Player: calc(100% - 350px)
```

---

## Status Bar

Vim-like status bar at the bottom of every page.

### Normal Mode

```
┌─────────────────────────────────────────────────────┐
│ [NORMAL]                                            │
└─────────────────────────────────────────────────────┘
```

### Normal Mode with Message

```
┌─────────────────────────────────────────────────────┐
│ [NORMAL]                               Copied URL   │
└─────────────────────────────────────────────────────┘
```

### Filter Mode (local filtering with `/`)

```
┌─────────────────────────────────────────────────────┐
│ [FILTER] query_                                     │
└─────────────────────────────────────────────────────┘
```

### Search Mode (site search with `i`)

```
┌─────────────────────────────────────────────────────┐
│ [SEARCH] query_                                     │
└─────────────────────────────────────────────────────┘
```

### Command Mode (`:`)

```
┌─────────────────────────────────────────────────────┐
│ [COMMAND] query_                                    │
└─────────────────────────────────────────────────────┘
```

---

## Bottom Drawer

Used for command palette, chapter picker, description, and filter results. Appears above status bar.

### Command Palette (`:` mode)

```
│                                                     │
│              (main content above)                   │
│                                                     │
├─────────────────────────────────────────────────────┤
│ > Copy video URL                              [yy]  │
│   Copy URL at time                            [Y]   │
│   Copy title                                  [yt]  │
│   Copy title + URL                            [ya]  │
├─────────────────────────────────────────────────────┤
│ [COMMAND] copy_               [j/k] [↵] [esc]       │
└─────────────────────────────────────────────────────┘
```

### Filter Results (`/` mode on listing page)

```
│                                                     │
│              (main content above)                   │
│                                                     │
├─────────────────────────────────────────────────────┤
│ > ┌──────┐ Matching Video Title                     │
│   │Thumb │ Channel · 2 days ago                     │
│   └──────┘                                          │
│   ┌──────┐ Another Match                            │
│   │Thumb │ Other Channel · 1 week ago               │
│   └──────┘                                          │
├─────────────────────────────────────────────────────┤
│ [FILTER] query_               [j/k] [↵] [esc]       │
└─────────────────────────────────────────────────────┘
```

### Chapter Picker (`f` on watch page)

```
│                                                     │
│              Video Player                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│ > ┌──────┐ Introduction                      0:00   │
│   │Thumb │                                          │
│   └──────┘                                          │
│   ┌──────┐ Main Topic                        2:34   │
│   │Thumb │                                          │
│   └──────┘                                          │
│   ┌──────┐ Conclusion                       10:15   │
│   │Thumb │                                          │
│   └──────┘                                          │
├─────────────────────────────────────────────────────┤
│ chapters                      [j/k] [↵] [esc]       │
└─────────────────────────────────────────────────────┘
```

### Description (`zo` on watch page)

```
│                                                     │
│              Video Player                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│ In this video we explore the history of computing  │
│ and how we got to where we are today.              │
│                                                     │
│ Links:                                              │
│ - https://example.com/resource                      │
│ - https://another.com/link                          │
│                                                     │
│ Timestamps:                                         │
│ 0:00 Intro                                          │
│ 2:34 Main topic                                     │
├─────────────────────────────────────────────────────┤
│ description                            [esc]        │
└─────────────────────────────────────────────────────┘
```

---

## Mode Badge

The mode indicator styled as a badge (like vim):

```css
.mode-badge {
  background: var(--bg-2);
  border: 1px solid var(--bg-3);
  color: var(--txt-2);
  padding: 2px 8px;
  font-size: 12px;
  font-family: var(--font-mono);
  text-transform: uppercase;
}
```

---

## Boundary Flash Effect

When user hits top/bottom of list:

```css
.content.flash-end {
  background-color: var(--bg-2);
  transition: background-color 0.15s ease-out;
}
```

---

## Key Visual Principles

1. **No header** - Content goes edge-to-edge, status bar at bottom only
2. **No background fills** - Buttons and kbd use transparent backgrounds with borders
3. **Borders define structure** - 2px solid for major containers, 1px for subtle
4. **Red for selection only** - YouTube red (`--yt-red`) used exclusively for selection outlines
5. **Monospace everywhere** - Consistent terminal/TUI feel
6. **Muted by default** - Text starts muted (`--txt-2`), brightens on selection (`--txt-1`)
7. **Inline labels** - TUI box pattern with labels interrupting the border
8. **Bottom drawer pattern** - Modals/pickers appear above status bar, not centered
9. **Status bar is minimal** - Mode badge + input + contextual hints only when drawer open + messages
10. **Hints stay contextual** - Subscribe/shortcut hints live in the sidebar where they're relevant
