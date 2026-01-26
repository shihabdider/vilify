# Video Page UI Redesign

## Problem

The current watch page has excessive empty space:
- Large black bars flanking a centered video
- Sparse info section below video with too much padding
- Comments section wastes vertical space
- Overall layout doesn't utilize screen real estate well

## Solution

### Layout: Sidebar Style (Option B)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ▶ YouTube                                              [/] filter [i] search [:] │
├────────────────────────────────────────────────┬─────────────────────────────────┤
│                                                │ beyond fear                     │
│ █████████████████████████████████████████████  │ do5e              [Subscribe]   │
│ █████████████████████████████████████████████  │ Press zo for description        │
│ ██████████████ VIDEO ████████████████████████  ├─────────────────────────────────┤
│ █████████████████████████████████████████████  │ Comments                        │
│ █████████████████████████████████████████████  │ ──────────────────────────────  │
│ ▶ ━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━  1:21/9:52  │ @Dale_Blackburn                 │
│                                                │ Oh boy... Little did he know    │
│                                                │ what's coming for him.          │
│                                                │                                 │
│                                                │ @pizzajesus6_9                  │
│                                                │ ...                             │
├────────────────────────────────────────────────┴─────────────────────────────────┤
│ j/k navigate · enter select · :q quit                                           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Key changes:
- Video takes left ~65% of width
- Sidebar on right contains: title, channel, subscribe, description hint, comments
- Comments scroll independently in sidebar
- Footer spans full width at bottom

### Theme: Solarized Dark × YouTube

Map YouTube's semantic colors to Solarized equivalents while preserving meaning:

| Role | YouTube Original | Solarized |
|------|------------------|-----------|
| Background | `#0f0f0f` | `#002b36` (base03) |
| Surface/Cards | `#272727` | `#073642` (base02) |
| Hover states | `#3f3f3f` | `#094959` (blend) |
| Primary text | `#f1f1f1` | `#93a1a1` (base1) |
| Secondary text | `#aaaaaa` | `#657b83` (base00) |
| Borders | `#3f3f3f` | `#586e75` (base01) |
| Accent (red) | `#ff0000` | `#dc322f` (sol red) |
| Links (blue) | `#3ea6ff` | `#268bd2` (sol blue) |

## Implementation

### CSS Changes

1. Update `:root` color variables to Solarized palette
2. Add new layout structure for watch page:
   - `.vilify-watch-layout` - flex container (row)
   - `.vilify-watch-video` - left side (video area)
   - `.vilify-watch-sidebar` - right side (info + comments)
3. Update `#vilify-focus` to use full viewport on watch pages
4. Adjust video player positioning to fill left column
5. Make comments section scrollable within sidebar

### JS Changes

1. Update `renderWatchPage()` to create sidebar layout structure
2. Adjust player positioning logic for new layout
3. Ensure comments load properly in sidebar

### Measurements

- Video column: `calc(100% - 350px)` or `~65%`
- Sidebar: `350px` fixed width
- Sidebar padding: `16px`
- Comment spacing: `12px` between comments
