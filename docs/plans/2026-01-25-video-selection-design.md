# Video Selection in Command Palette - Design

## Overview

Extend the Cmd+K palette to show videos from the current YouTube page, allowing quick navigation without mouse.

## User Experience

**Default behavior (Cmd+K with empty input):**
- Shows up to 15 videos scraped from the current page
- Each video shows: small thumbnail (80x45), title, channel name
- Arrow keys navigate, Enter opens video, Shift+Enter opens in new tab

**Prefix filtering:**
- Type `:` to switch to commands-only view (vim-style command mode)
- Regular typing fuzzy-filters video titles
- If no videos match but commands do, show commands automatically

**Where videos come from:**
- Home page: trending/recommended videos
- Subscriptions: subscription feed videos
- Watch page: recommended sidebar videos
- Channel page: channel's videos
- Search results: search result videos

## Technical Approach

**Video scraping:**
- Query DOM for video renderers (`ytd-rich-item-renderer`, `ytd-video-renderer`, `ytd-compact-video-renderer`)
- Extract from each: video ID, title, thumbnail URL, channel name
- Limit to first 15 found
- Re-scrape each time palette opens (videos change as user scrolls)

**Data structure:**
```javascript
{
  type: 'video',
  videoId: 'dQw4w9WgXcQ',
  title: 'Video Title Here',
  channelName: 'Channel Name',
  thumbnailUrl: 'https://i.ytimg.com/vi/VIDEO_ID/mqdefault.jpg',
  url: '/watch?v=dQw4w9WgXcQ'
}
```

**Rendering:**
- Videos use same `.keyring-item` structure but with thumbnail instead of icon
- Thumbnail styled as 80x45px with border-radius to match theme
- Title truncated with ellipsis if too long
- Channel name as `.keyring-meta`

## Performance Strategy

**Scraping:**
- Synchronous DOM queries only (no waiting for network)
- Single `querySelectorAll` call, iterate once
- Stop at 15 videos (don't process more)
- Cache results for 1-2 seconds (if user closes/reopens quickly)

**Thumbnails:**
- Use YouTube's smallest useful thumbnail size (`mqdefault.jpg` - 320x180)
- Let browser handle loading - show item immediately with placeholder background
- No lazy loading complexity - 15 small images is trivial
- Thumbnails are already cached by browser from page load

**Rendering:**
- Build all DOM nodes in one pass before appending to list
- Reuse existing `createElement` helper (no innerHTML)

**Perceived performance:**
- Palette opens instantly with video items
- Thumbnails pop in as browser loads them (usually instant since cached)
- No loading spinners or skeleton states

## Keybindings

| Key | Action |
|-----|--------|
| `Enter` | Navigate to selected video |
| `Shift+Enter` | Open video in new tab |
| `:` prefix | Filter to commands only |
