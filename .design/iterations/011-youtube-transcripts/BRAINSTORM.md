# Iteration 011: YouTube Transcripts

## Goal

Enable viewing, searching, and navigating video transcripts with keyboard-driven interface.

## Behaviors

| ID | Behavior | Test Method | Depends On | Est. Tokens |
|----|----------|-------------|------------|-------------|
| B1 | User can open a transcript drawer on a watch page (keybinding) | Press `t`, transcript drawer appears | - | 2K |
| B2 | Transcript content is fetched and displayed with timestamps | Drawer shows timestamped lines from video's transcript | B1 | 5K |
| B3 | User can scroll through transcript lines | Arrow keys navigate, selection highlights | B2 | 2K |
| B4 | User can search/filter within transcript | With transcript drawer open, press `/`, type text, matching lines shown (does NOT open recommended videos filter) | B2 | 3K |
| B5 | User can jump to video position by selecting a transcript line | Press Enter on line, video seeks to that timestamp | B2 | 2K |
| B6 | Badge hint "t Transcript" shows in watch metadata when video has captions | On video with captions: badge visible. On video without: badge hidden | - | 2K |
| B7 | Status message when pressing `t` on video without transcript | Press `t` on video without captions, status bar shows "No transcript available" | - | 1K |

## Dependency Graph

```
B6 (badge hint)
B7 (no-transcript message)

B1 ──── B2 ──┬── B3
             ├── B4
             └── B5
```

## Notes

- YouTube exposes transcripts via Innertube API (`/youtubei/v1/player`) or `ytInitialPlayerResponse`
- Caption track URLs return XML with `<text start="0.5" dur="2.3">content</text>`
- Transcript drawer follows existing drawer patterns (chapters, description)
- Badge hint pattern mirrors chapters: conditional on availability (see watch.js)
- Filter behavior mirrors existing filter drawer pattern
- Timestamp format: `MM:SS` or `HH:MM:SS` for longer videos
- Handle: no captions, multiple languages (default to first), auto-generated vs manual
- Keybinding: `/` in transcript drawer filters transcript (overrides normal watch page `/` which opens recommended videos filter) - handled by drawer onKey priority
