# Data Definitions - Iteration 012: Metadata Display

## Overview

No structural type changes. This iteration extends existing fields.

**References**: Uses these existing types from master DATA.md:
- ContentItem (Core) - `data` field for site-specific extras
- VideoContext (YouTube) - already has `views`, `duration`, `uploadDate`

---

## ContentItem.data (EXTENDED)

For YouTube video items, the `data` object now includes:

```js
{
  videoId: String,           // existing
  channelUrl: String | null, // existing
  viewCount: String | null,  // NEW - e.g., "1.2M views"
  duration: String | null    // NEW - e.g., "12:34"
}
```

**Where**: YouTube (site-specific extension of Core type)

**Examples**:
```js
// Video with all metadata
{
  type: 'content',
  id: 'abc123',
  title: 'Cool Video',
  url: '/watch?v=abc123',
  thumbnail: 'https://i.ytimg.com/...',
  meta: 'Channel Name · 2 days ago',
  subtitle: null,
  data: {
    videoId: 'abc123',
    channelUrl: '/@channel',
    viewCount: '1.2M views',
    duration: '12:34'
  }
}

// Video with missing metadata (e.g., live stream)
{
  type: 'content',
  id: 'xyz789',
  title: 'Live Stream',
  url: '/watch?v=xyz789',
  thumbnail: '...',
  meta: 'Channel · LIVE',
  subtitle: null,
  data: {
    videoId: 'xyz789',
    channelUrl: '/@channel',
    viewCount: null,
    duration: null
  }
}
```

---

## VideoContext (NO CHANGES)

Already has the required fields - just need proper scraping:
- `views: String | null` - "1.2M views"
- `duration: Number` - video length in seconds
- `uploadDate: String | null` - "2 days ago", "Jan 5, 2024"

---

## Summary

| Type | Classification | Where | Status |
|------|---------------|-------|--------|
| ContentItem.data | Compound | YouTube | EXTENDED (viewCount, duration) |
| VideoContext | Compound | YouTube | NO CHANGES (ensure populated) |
