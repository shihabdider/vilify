# Vilify

Vilify is a small Chrome MV3 extension that adds a keyboard-driven omnibar to YouTube watch pages.

The active v1 product scope is intentionally narrow: open the omnibar with `:`, run YouTube watch-page commands, navigate to YouTube URLs, use native video-element actions, copy the current watch URL, and search the current video's transcript through structured YouTube data.

## Active v1 Scope

| Surface | Status |
|---------|--------|
| YouTube watch pages (`/watch?v=...`) | Supported |
| YouTube non-watch pages | No Vilify UI or key interception |
| Google pages | Out of active scope |
| Full focus-mode/page replacement UI | Out of active scope |

## Commands

Open the omnibar on a YouTube watch page with `:`. When the omnibar is closed, Vilify intercepts only `:` and leaves native YouTube/browser shortcuts alone.

The root mode includes:

- YouTube URL navigation commands, such as Home, Subscriptions, Watch Later, History, and Library.
- Native video actions through the page's `<video>` element: play/pause, seek, and playback speed.
- Copy current watch URL and copy URL at current video time.
- Search transcript, which opens a transcript-search mode for the current video.

## Keybindings

| Key | Closed omnibar | Open omnibar |
|-----|----------------|--------------|
| `:` | Open omnibar on supported watch pages | Type `:` in the input |
| `↑` / `↓` | Native page behavior | Move selection |
| `Enter` | Native page behavior | Execute selected item |
| `Escape` | Native page behavior | Close omnibar or return to the previous mode |

Editable targets (`input`, `textarea`, `select`, and `contenteditable`) keep their native behavior; typing `:` there does not open Vilify.

## Out of Active v1 Scope

The pre-reset implementation is preserved on the backup branch/tag. The current `main` branch does not actively support:

- Google Search integration.
- Full-site focus mode or layout replacement.
- Listing renderers, drawers, comments UI, or persistent sidebars.
- Watch Later, dismiss, subscribe, captions, theater, or fullscreen automation through visible YouTube controls/menus.
- Ambient multi-key shortcuts such as `/` for page content or `g h` navigation.

## Installation from Source

1. Clone this repo.
2. Install dependencies and build:
   ```bash
   bun install
   bun run build
   ```
3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the repo directory.
6. Navigate directly to a YouTube watch page.

## Development

```bash
bun run build   # Build dist/content.js and dist/data-bridge.js
bun run test    # Run Vitest suite
bun run watch   # Rebuild on file changes
bun run clean   # Remove build artifacts
```

## Project Structure

```
├── src/
│   ├── content.ts              # Content-script entry and page support detection
│   ├── omnibar/                # Generic omnibar runtime, state, keyboard, and actions
│   ├── plugins/                # Stateless plugin registry
│   └── sites/youtube/          # YouTube watch-page plugin, bridge, and transcript provider
├── dist/                       # Built extension files
├── manifest.json               # Chrome extension manifest
└── build.js                    # esbuild configuration
```

## License

MIT
