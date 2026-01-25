# Vilify Patterns Reference

Common patterns used across Vilify site implementations.

## Keyboard Sequence Handler

Detects vim-style multi-key sequences (e.g., `gh` for "go home"):

```javascript
let keySeq = '';
let keyTimer = null;
const KEY_SEQ_TIMEOUT_MS = 500;

document.addEventListener('keydown', e => {
  // Skip if typing in an input
  const isInput = e.target.tagName === 'INPUT' || 
                  e.target.tagName === 'TEXTAREA' || 
                  e.target.isContentEditable;
  if (isInput) return;

  // Skip modifier keys
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

  // Build sequence
  clearTimeout(keyTimer);
  keySeq += e.key.toLowerCase();
  keyTimer = setTimeout(() => { keySeq = ''; }, KEY_SEQ_TIMEOUT_MS);

  // Check for match
  const sequences = { 'gh': () => goHome(), 'gs': () => goSearch() };
  if (sequences[keySeq]) {
    e.preventDefault();
    sequences[keySeq]();
    keySeq = '';
  }
}, true); // Capture phase to intercept before site handlers
```

## SPA Navigation Detection

Detects client-side navigation in single-page apps:

```javascript
let lastUrl = location.href;

const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    onNavigate();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Also handle back/forward buttons
window.addEventListener('popstate', () => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    onNavigate();
  }
});
```

## CSP-Safe DOM Creation

Avoids `innerHTML` which is blocked by some sites' Content Security Policy:

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

## Toast Notifications

Non-intrusive feedback for user actions:

```javascript
function showToast(message, duration = 2000) {
  let toast = document.querySelector('.vilify-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'vilify-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}
```

## Clipboard with Tampermonkey

Use `GM_setClipboard` for reliable clipboard access:

```javascript
// Requires: @grant GM_setClipboard

function copyToClipboard(text) {
  if (typeof GM_setClipboard === 'function') {
    GM_setClipboard(text);
    showToast('Copied');
  } else {
    // Fallback for testing outside Tampermonkey
    navigator.clipboard.writeText(text)
      .then(() => showToast('Copied'))
      .catch(() => showToast('Copy failed'));
  }
}
```

## Content Scraping with Caching

Cache scraped content to avoid re-querying DOM:

```javascript
const CACHE_MS = 2000;
let cache = null;
let cacheTime = 0;

function scrapeContent() {
  if (cache && Date.now() - cacheTime < CACHE_MS) {
    return cache;
  }
  
  // ... scraping logic ...
  
  cache = results;
  cacheTime = Date.now();
  return results;
}

function clearCache() {
  cache = null;
  cacheTime = 0;
}
```

## Filtering with Empty Group Removal

Filter items while cleaning up empty groups:

```javascript
function filterItems(items, query) {
  const q = query.toLowerCase();
  
  // Filter
  let filtered = items.filter(item => {
    if (item.group) return true;
    return item.label?.toLowerCase().includes(q);
  });
  
  // Remove empty groups
  filtered = filtered.filter((item, i, arr) => {
    if (item.group) {
      const next = arr[i + 1];
      return next && !next.group;
    }
    return true;
  });
  
  return filtered;
}
```

## Handling Site-Specific Inputs

Allow Escape to blur site search boxes:

```javascript
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    // Check if in site's search box
    const searchInput = document.querySelector('#search-input');
    if (document.activeElement === searchInput) {
      e.preventDefault();
      searchInput.blur();
      showToast('Exited search');
      return;
    }
  }
  // ... rest of handler
}, true);
```

## Reliable Selector Strategies

Prefer these selector types (most to least reliable):

1. **IDs:** `#unique-id`
2. **Data attributes:** `[data-testid="post"]`
3. **ARIA:** `[aria-label="Search"]`
4. **Semantic HTML:** `article`, `nav`, `main`
5. **Stable classes:** `.post-title` (human-readable)
6. **Avoid:** `.css-1x2y3z` (auto-generated)

Combine for resilience:

```javascript
const title = el.querySelector('[data-testid="title"], h1.title, .post-title');
```
