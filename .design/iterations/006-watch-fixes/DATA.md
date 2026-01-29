# Data Definitions - Iteration 006

This iteration focuses on bug fixes and UX improvements. No new data types are needed.

## Relevant Existing Types

### ContentItem

Used for recommended videos on watch page (same format as listing pages).

A ContentItem is a structure:
- type: 'content' - literal string
- id: String - unique identifier (videoId)
- title: String - video title
- url: String - where to navigate on select
- thumbnail: String | null - image URL
- meta: String | null - channel · views · date
- subtitle: String | null - not used for videos
- data: Object | null - { videoId, channelUrl }

Examples:
```js
// Recommended video on watch page
{ type: 'content', id: 'xyz789', title: 'Related Video',
  url: '/watch?v=xyz789', thumbnail: 'https://i.ytimg.com/...',
  meta: 'Some Channel · 500K views', subtitle: null,
  data: { videoId: 'xyz789', channelUrl: '/@channel' } }
```

---

### VideoContext

Used for feedback messages (muted state, subscription state).

Relevant fields:
- muted: Boolean - is muted?
- isSubscribed: Boolean - subscribed to channel?
- channelName: String | null - for feedback messages

---

### AppState

Used for local filtering on watch page (recommended videos).

Relevant fields:
- localFilterActive: Boolean - is `/` filter active?
- localFilterQuery: String - current filter text

---

### Command

Modified behavior: `icon` field will use simple text characters instead of emojis.

A Command is a structure:
- label: String - display name
- icon: String - simple character ('>' or similar)
- action: Function - () => void
- keys: String | null - shortcut hint
- meta: String | null - extra info
- group: String | null - for grouping

Examples:
```js
// Before (with emoji)
{ label: 'Home', icon: '🏠', action: () => navigateTo('/'), keys: 'G H' }

// After (simple character)
{ label: 'Home', icon: '>', action: () => navigateTo('/'), keys: 'G H' }
```

---

## Summary

| Type | Change | Purpose |
|------|--------|---------|
| ContentItem | No change | Recommended videos |
| VideoContext | No change | Feedback state |
| AppState | No change | Filter state |
| Command | Behavior change | Remove emojis from icon field |
