# Iteration 4: Bug Fixing

## Problem
The Vilify extension (v0.1.6) has core functionality working but scraping is broken on most page types, resulting in missing/incomplete video lists and metadata.

## Solution
Systematically fix the known bugs documented in Iteration 3, prioritizing scraping issues since they block all other functionality.

## Success Criteria
- Home page scrapes all visible videos on initial load
- History page scrapes videos correctly  
- Library page scrapes videos correctly
- Watch page shows correct video title and channel
- Comments load on watch page
- All YouTube page types work: `/`, `/feed/subscriptions`, `/feed/history`, `/results`, `/watch`, `/@...`

## Constraints
- Language: JavaScript (Chrome Extension)
- Platform: Chrome browser
- Reference: Working userscript at `sites/youtube.user.js`
- Docs: `.design/SCRAPING.md` has verified selectors

## Scope

### v1 (This Iteration)
**PRIORITY 1: Scraping**
- [ ] Fix home page scraping (port multi-strategy approach from userscript)
- [ ] Fix history page scraping
- [ ] Fix library page scraping
- [ ] Fix watch page metadata (title/channel showing "Untitled"/"Unknown")
- [ ] Fix comment loading
- [ ] Add proper content polling/retry logic

**PRIORITY 2: Watch Page Polish**
- [ ] Fix subscribe button layout
- [ ] Implement chapters picker content
- [ ] Implement description modal

**PRIORITY 3: Navigation**
- [ ] Test and fix key sequences (yy, yt, ya, zo, zc, g1, g2, gc)
- [ ] Fix j/k navigation highlight
- [ ] Implement load more videos at bottom

### Later
- Additional sites beyond YouTube
- Settings/configuration
- Themes

## Reference Files
| File | What to Use |
|------|-------------|
| `sites/youtube.user.js` | Working `Scraper` object (lines 300-550), content polling (lines 1680-1720) |
| `.design/SCRAPING.md` | Verified DOM selectors |
| `src/sites/youtube/scraper.js` | Current broken implementation to fix |

## Testing Strategy
For each fix:
1. Build extension (`npm run build`)
2. Reload in Chrome (`chrome://extensions`)
3. Test on specific YouTube page
4. Verify console for errors
5. Compare behavior to userscript reference
