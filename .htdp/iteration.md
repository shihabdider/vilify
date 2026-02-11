# Iteration

anchor: de68fb4c056b9caf71bcbb89f7dee9fa62bdd163
started: 2026-02-10T04:33:30-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

TODO #3 iteration 3 + TODO #4: `yy` copies to clipboard on Google pages.
- Images page: copy selected image blob to clipboard via `navigator.clipboard.write()` with `ClipboardItem`
- Web search page: copy selected link URL to clipboard via existing `copyToClipboard`
- Show success/failure message. Extension already has `clipboardWrite` permission.

## Data Definition Plan

No data definition changes. ContentItem already has `thumbnail` and `url` fields.

## Wishes

### Layer 2 (leaf)
- `copyImageToClipboard(imgSrc: string): Promise<boolean>` in `src/core/actions.js`
  Purpose: Fetch image blob from URL/data-URI, convert to PNG, copy to clipboard via navigator.clipboard.write([new ClipboardItem]). Show success/failure status message.

### Layer 1
- Thread `getSelectedItem` callback through `src/core/index.js` → `src/core/keyboard.js` → `appCallbacks`
  Purpose: Plumb a `getSelectedItem()` callback so site key sequences can access the currently selected ContentItem.

### Layer 0
- `yy` key sequence in `src/sites/google/index.js` `getGoogleKeySequences`
  Purpose: Page-type-aware copy — images page: `copyImageToClipboard(item.thumbnail)`, search page: `copyToClipboard(item.url)`. Uses `app.getSelectedItem()`.
