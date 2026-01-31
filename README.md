# Vilify

Bespoke vim-style command palettes for the web.

Unlike generic browser extensions that try to handle all websites with one-size-fits-all solutions, Vilify provides **deep, site-specific integrations**. Each site gets a carefully crafted keyboard-driven experience with native theming.

## Supported Sites

| Site | Description |
|------|-------------|
| YouTube | Video controls, navigation, copy URLs |

## Installation

### From Source

1. Clone this repo
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Open Chrome and go to `chrome://extensions`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked" and select the repo directory
6. Navigate to YouTube

### Development

```bash
npm run watch   # Rebuild on file changes
npm run clean   # Remove build artifacts
```

## Usage

Press `/` to open the command palette with page content (videos, posts, etc.)

Press `:` to open the command palette with commands

### Common Keybindings

| Key | Action |
|-----|--------|
| `/` | Open palette (content) |
| `:` | Open palette (commands) |
| `↑` `↓` | Navigate items |
| `Enter` | Select item |
| `Shift+Enter` | Open in new tab |
| `Escape` | Close palette |
| `g h` | Go home |

Each site has additional keybindings. Open the palette and type to search commands.

## Philosophy

The bespokeness is the point. Generic solutions handle nothing well; focused solutions handle one thing excellently.

Each Vilify implementation:
- **Looks native** — themed to match the site's design
- **Feels native** — commands that make sense for that site
- **Works reliably** — selectors tuned to each site's DOM

## Project Structure

```
├── src/
│   ├── core/          # Shared palette, keyboard, and filtering logic
│   ├── sites/         # Site-specific implementations
│   │   └── youtube/   # YouTube integration
│   └── content.js     # Entry point
├── dist/              # Built extension files
├── manifest.json      # Chrome extension manifest
└── build.js           # esbuild configuration
```

## Contributing

Want to add a new site? See [Contributing Guide](docs/contributing.md).

1. Create a new directory in `src/sites/`
2. Implement the site adapter following the YouTube example
3. Add the site's URL pattern to `manifest.json`
4. Submit a PR

## License

MIT
