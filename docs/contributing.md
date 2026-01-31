# Contributing a New Site to Vilify

This guide walks you through adding support for a new website.

## Overview

Vilify is a Chrome extension with modular site-specific implementations. Each site lives in its own directory under `src/sites/` and shares common palette, keyboard, and filtering logic from `src/core/`.

**Time estimate:** 2-4 hours for a basic implementation

## Project Structure

```
src/
├── core/              # Shared infrastructure
│   ├── palette.js     # Command palette UI
│   ├── keyboard.js    # Key sequence handling
│   ├── filter.js      # Fuzzy filtering
│   └── ...
├── sites/
│   └── youtube/       # Example implementation
│       ├── index.js   # Main entry point
│       ├── commands.js
│       ├── keybindings.js
│       └── styles.css
└── content.js         # Site router
```

## Step 1: Create Site Directory

```bash
mkdir src/sites/[sitename]
```

Replace `[sitename]` with your site's name in lowercase (e.g., `reddit`, `twitter`, `notion`).

## Step 2: Update manifest.json

Add your site's URL pattern to the content script matches:

```json
{
  "content_scripts": [
    {
      "matches": [
        "*://www.youtube.com/*",
        "*://www.yoursite.com/*"
      ],
      "js": ["dist/content.js"],
      "run_at": "document_start"
    }
  ]
}
```

## Step 3: Design Your Theme

Inspect the target site and extract its design language:

1. Open DevTools → Elements
2. Find the main colors: backgrounds, text, accents, borders
3. Identify the font family
4. Create a `styles.css` in your site directory

```css
:root {
  --bg-primary: #1a1a1b;      /* Main background */
  --bg-secondary: #272729;    /* Card/input background */
  --bg-hover: #3a3a3c;        /* Hover state */
  --text-primary: #d7dadc;    /* Main text */
  --text-secondary: #818384;  /* Muted text */
  --accent: #ff4500;          /* Brand color for selection */
  --border: #343536;          /* Borders */
  --font: 'IBM Plex Sans', sans-serif;
}
```

**Tip:** The accent color is used for the selected item highlight. Use the site's primary brand color.

## Step 4: Implement Context Detection

Context detection lets you show different commands based on what page the user is on.

```javascript
export function getPageType() {
  const path = location.pathname;
  
  if (path === '/') return 'home';
  if (path.startsWith('/r/')) return 'subreddit';
  if (path.includes('/comments/')) return 'post';
  return 'other';
}

export function getContext() {
  const pageType = getPageType();
  
  if (pageType === 'post') {
    return {
      postId: extractPostId(),
      title: document.querySelector('h1')?.textContent,
      subreddit: extractSubreddit(),
    };
  }
  
  return null;
}
```

## Step 5: Define Commands

Commands are the heart of your implementation. Think about:

- **Navigation:** Where do users commonly go?
- **Actions:** What do users frequently do on this site?
- **Context actions:** What's relevant to the current page?

```javascript
export function getCommands(ctx) {
  const cmds = [];

  // Always available
  cmds.push({ group: 'Navigation' });
  cmds.push({ label: 'Home', icon: '🏠', action: () => navigateTo('/'), keys: 'G H' });
  cmds.push({ label: 'Popular', icon: '🔥', action: () => navigateTo('/r/popular'), keys: 'G P' });

  // Context-specific
  if (ctx?.postId) {
    cmds.push({ group: 'Post Actions' });
    cmds.push({ label: 'Upvote', icon: '⬆', action: () => upvote(ctx.postId), keys: 'U' });
    cmds.push({ label: 'Save', icon: '🔖', action: () => save(ctx.postId), keys: 'S' });
    cmds.push({ label: 'Copy Link', icon: '🔗', action: () => copyToClipboard(ctx.url) });
  }

  return cmds;
}
```

## Step 6: Define Key Sequences

Key sequences work when the palette is closed. Follow vim conventions:

| Prefix | Meaning | Example |
|--------|---------|---------|
| `g` | Go to | `gh` = go home |
| `y` | Yank (copy) | `yy` = copy URL |
| Single key | Frequent action | `u` = upvote |

```javascript
export function getKeySequences(openPalette, navigateTo) {
  return {
    '/': () => openPalette('content'),
    ':': () => openPalette('command'),
    'gh': () => navigateTo('/'),
    'gp': () => navigateTo('/r/popular'),
    'yy': () => copyToClipboard(location.href),
  };
}
```

## Step 7: Content Scraping (Optional)

If the site shows lists (posts, videos, emails), scrape them for the palette:

```javascript
export function scrapeContent() {
  const posts = document.querySelectorAll('[data-testid="post-container"]');
  
  return Array.from(posts).slice(0, 15).map(el => {
    const title = el.querySelector('h3')?.textContent;
    const link = el.querySelector('a[href*="/comments/"]')?.href;
    
    return {
      type: 'content',
      label: title,
      meta: el.querySelector('[data-testid="subreddit-name"]')?.textContent,
      url: link,
    };
  });
}
```

## Step 8: Wire Up the Site

Create an `index.js` that exports a site adapter matching the interface expected by `content.js`. Study `src/sites/youtube/index.js` for the full pattern.

Update `src/content.js` to route to your site based on hostname.

## Step 9: Build and Test

```bash
npm run build    # Build the extension
npm run watch    # Or watch for changes
```

1. Go to `chrome://extensions`
2. Click "Reload" on Vilify (or load it if first time)
3. Navigate to your target site
4. Test all commands and keybindings

**Testing checklist:**
- [ ] Palette opens with `/` and `:`
- [ ] Commands filter correctly
- [ ] Arrow keys navigate
- [ ] Enter executes
- [ ] Escape closes
- [ ] Key sequences work outside palette
- [ ] Theme looks native to the site
- [ ] Works on different page types

## Step 10: Submit a Pull Request

1. Fork the repo
2. Add your site directory to `src/sites/`
3. Update `manifest.json` with your site's URL patterns
4. Update `README.md` to list your site
5. Submit PR with:
   - Screenshot of the palette on the site
   - List of implemented commands
   - Any known limitations

## Tips

### Dealing with SPAs

Most modern sites don't do full page reloads. Use `MutationObserver` or URL change detection to handle navigation. The YouTube implementation has examples of this.

### Handling CSP Restrictions

Some sites block `innerHTML`. Use `document.createElement()` which works everywhere.

### Finding Reliable Selectors

Sites often have obfuscated class names. Look for:
- `data-testid` attributes
- `id` attributes
- Semantic HTML (`article`, `nav`, `main`)
- ARIA attributes (`aria-label`, `role`)

Avoid relying on class names that look auto-generated (e.g., `css-1a2b3c`).

### Debugging

Add `console.log('[Vilify]', ...)` statements. Check the browser console for errors.

## Examples

Study the existing implementation:
- `src/sites/youtube/` - Video site with playback controls, content scraping

## Questions?

Open an issue on GitHub or check existing site implementations for patterns.
