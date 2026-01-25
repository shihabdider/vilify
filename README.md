# Vilify

Bespoke vim-style command palettes for the web.

Unlike generic browser extensions that try to handle all websites with one-size-fits-all solutions, Vilify provides **deep, site-specific integrations**. Each site gets a carefully crafted keyboard-driven experience with native theming.

## Supported Sites

| Site | Install | Description |
|------|---------|-------------|
| YouTube | [Install](https://raw.githubusercontent.com/shihabdider/vilify/main/sites/youtube.user.js) | Video controls, navigation, copy URLs |

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. Click the **Install** link for your site
3. Click "Install" in the Tampermonkey dialog
4. Refresh the site

Scripts auto-update when changes are pushed to this repo.

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

## Contributing

Want to add a new site? See [Contributing Guide](docs/contributing.md).

1. Copy `template/site.template.js`
2. Fill in the TODOs
3. Submit a PR

## License

MIT
