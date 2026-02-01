# Iteration 020: List Sorting

## Goal

Add ability to sort listing pages via `:sort` command with Vim-style prefix matching.

## Design

### Command Interface

Invoked via command palette with `:sort <prefix>`

**Prefix matching** (shortest unique prefix):
| Prefix | Matches | Default Direction |
|--------|---------|-------------------|
| `da` | date | newest first (↓) |
| `du` | duration | longest first (↓) |
| `t` | title | A-Z (↑) |
| `c` | channel | A-Z (↑) |
| `v` | views | most first (↓) |

**Direction toggle**: Repeat same command to flip direction (`:sort da` → date↓, again → date↑)

**Reverse**: Vim-style bang `:sort da!` for immediate reverse direction

**Reset**: `:sort` with no argument → back to original order

### Status Bar

Shows active sort: `LISTING [12] date↓` or `LISTING [12] dur↑`

No indicator when in default order.

### Scope

- **Applies to**: Listing pages only (home, search, channel/videos, subscriptions, playlists)
- **Does NOT apply to**: Recommendation drawer, other drawers
- **Resets on**: Navigation to new page
- **No multi-level sorting**

### Lazy Loading

Re-sort entire list when new items are loaded (simplest approach).

### Parsing Requirements

| Field | Raw Format | Parse To |
|-------|------------|----------|
| date | "2 days ago", "Jan 15, 2026" | Date/timestamp |
| duration | "12:34", "1:23:45" | seconds (number) |
| views | "5.2M views", "1,234 views" | number |
| title | string | string (case-insensitive) |
| channel | string | string (case-insensitive) |

## Behaviors

| ID | Behavior | Test Method | Depends On | Est. Tokens |
|----|----------|-------------|------------|-------------|
| B1 | `:sort` command registered in command palette | Press `:`, type `sort`, command appears | - | 1K |
| B2 | `:sort da` sorts by date (newest first) | Run command, list reorders by date descending | B1 | 3K |
| B3 | `:sort du` sorts by duration (longest first) | Run command, list reorders by duration descending | B1 | 2K |
| B4 | `:sort t` sorts by title (A-Z) | Run command, list reorders alphabetically | B1 | 1K |
| B5 | `:sort c` sorts by channel (A-Z) | Run command, list reorders by channel name | B1 | 1K |
| B6 | `:sort v` sorts by views (most first) | Run command, list reorders by view count descending | B1 | 1K |
| B7 | Repeat command toggles direction | `:sort da` twice flips to oldest first | B2 | 1K |
| B8 | Bang syntax reverses direction | `:sort da!` sorts oldest first immediately | B2 | 1K |
| B9 | `:sort` with no arg resets to original order | Run `:sort`, list returns to original order | B2 | 1K |
| B10 | Status bar shows active sort | After `:sort da`, status shows `date↓` | B2 | 1K |
| B11 | Sort resets on navigation | Sort, navigate to new page, sort is cleared | B2 | 1K |
| B12 | Lazy-loaded items are sorted into list | Scroll to load more, new items sorted correctly | B2 | 2K |
| B13 | Prefix matching works for longer prefixes | `:sort date`, `:sort dur`, `:sort duration` all work | B2 | 1K |

## Dependency Graph

```
B1 ──┬── B2 ──┬── B7
     │        ├── B8
     │        ├── B9
     │        ├── B10
     │        ├── B11
     │        ├── B12
     │        └── B13
     ├── B3
     ├── B4
     ├── B5
     └── B6
```

## Notes

- Priority sort fields: date & duration (most useful)
- Parse functions needed for relative dates ("2 days ago") and abbreviated numbers ("5.2M")
- Original order must be preserved (store original indices)
- Sort state stored in AppState, cleared on page change
- Command palette needs to support `:sort` prefix commands (may need extension)
- Consider: items missing metadata sort to end of list
