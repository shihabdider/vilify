# Iteration 006: Watch Page Fixes

## Problem
Watch page has multiple bugs: broken keybindings, missing UI feedback, incorrect modal layouts, and recommended videos not being scraped for filtering.

## Solution
Fix keybindings, add status bar feedback messages for all actions, fix modal UX (chapter input at bottom, command palette cleanup), and implement recommended video scraping.

## Success Criteria
- `m` mutes/unmutes and shows feedback
- `c` toggles captions and shows feedback
- `Shift+M` toggles subscription, updates button, shows feedback
- `h`/`l` seek -10s/+10s and show feedback
- `:q` exits focus mode
- All commands show status bar feedback
- Chapter drawer has input at bottom (like command palette)
- Command palette: no emojis, tighter spacing, no wrap at list end (flash instead)
- Description modal: no excess whitespace
- `/` on watch page filters recommended videos
- Recommended videos are scraped and displayed in sidebar

## Constraints
- Language: JavaScript (ES modules)
- Platform: Chrome extension (userscript-style)
- Dependencies: None (vanilla JS)

## Scope

### v1 (Now)
1. Fix keybindings: m=mute, c=captions, Shift+M=subscribe, h/l=seek, :q=exit
2. Add status bar feedback for all commands
3. Subscribe button UI update on toggle
4. Chapter drawer: move input to bottom
5. Command palette: remove emojis, tighten spacing, flash on boundary (no wrap)
6. Description modal: fix whitespace
7. Scrape recommended videos on watch page
8. `/` filters recommended videos on watch page

### Later
- Recommended video thumbnails
- More granular seek feedback (show timestamp)
