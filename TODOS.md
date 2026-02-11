# TODOs - Google Site

1. **Loading screen injection** — Inject loading screen early so the original Google page doesn't flash before the Vilify overlay appears. Currently the loading CSS only hides YouTube-specific selectors (`ytd-app`, `#content`, etc.). Need to add Google-specific selectors and ensure the overlay is injected before the Google DOM renders.
2. **Show page number** — Display the current Google search results page number in the status bar (e.g., "Page 2"). Google's URL contains `&start=10` for page 2, etc.
3. [google] add support for image search page (grid view with copy paste)
   - ✅ **Iteration 1**: `go`/`gi` key sequences for switching between web search and Google Images, type-aware `searchUrl` so `i` preserves search type, `'images'` page type detection via `udm=2` (v0.5.84)
   - **Iteration 2**: Google Images scraper + grid view with 2D hjkl navigation. Scrape image thumbnails/titles/source URLs from Google Images DOM. New grid renderer in `items.js` (or new file). 2D navigation state (row/col) — `h`/`l` move left/right, `j`/`k` move down/up in the grid. Replace `searchPageConfig` reuse in `pages.images` with proper grid layout.
   - **Iteration 3**: Copy image to clipboard with `yy`. Fetch selected image blob, use `navigator.clipboard.write()` with `ClipboardItem`. Show success/failure message. Extension already has `clipboardWrite` permission.
4. [google] add copying of links (yy)
