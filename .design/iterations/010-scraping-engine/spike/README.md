# Spike: Data Interception for Scraping Engine

## Goal

Explore whether intercepting YouTube's API responses is a viable alternative (or supplement) to DOM scraping.

## Test Script

Install `data-intercept.user.js` in Tampermonkey/Violentmonkey.

### Console Commands

```js
// Get all collected videos
__vilifyHelpers.getVideos()

// Get chapters (on watch page)
__vilifyHelpers.getChapters()

// See raw ytInitialData
__vilifyHelpers.getInitialData()

// See all intercepted API calls
__vilifyHelpers.getApiResponses()

// Quick summary
__vilifyHelpers.summary()

// Clear collected data
__vilifyHelpers.clear()
```

## Test Checklist

### Page Types to Test

| Page | URL Pattern | Test |
|------|-------------|------|
| Home | `/` | Videos load? Infinite scroll captured? |
| Watch | `/watch?v=...` | Video details? Chapters? Recommendations? |
| Search | `/results?search_query=...` | Results captured? |
| Channel | `/@channel` | Videos listed? |
| Playlist | `/playlist?list=...` | All videos? |
| History | `/feed/history` | Videos captured? |
| Subscriptions | `/feed/subscriptions` | Videos captured? |

### Data Quality Checklist

For each page type, verify we can extract:
- [ ] videoId
- [ ] title
- [ ] channelName
- [ ] channelUrl
- [ ] viewCount
- [ ] publishedTime / uploadDate
- [ ] duration
- [ ] thumbnail

### Watch Page Specific
- [ ] Current video metadata
- [ ] Chapters (if present)
- [ ] Description
- [ ] Recommended videos

### SPA Navigation
- [ ] Data re-extracted on navigation (no full page reload)
- [ ] Fetch interception continues working

## Findings

### ytInitialData Structure

(Fill in after testing)

### API Endpoints Observed

| Endpoint | When Called | Data Contains |
|----------|-------------|---------------|
| `/youtubei/v1/browse` | | |
| `/youtubei/v1/search` | | |
| `/youtubei/v1/next` | | |
| `/youtubei/v1/player` | | |

### Pros Discovered

- 

### Cons Discovered

- 

### Recommendation

(Hybrid / Pure interception / Stick with DOM scraping)

## Notes

- `@run-at document-start` is critical for fetch interception
- YouTube may change API response structure, but likely less often than DOM
- Some data might only be in initial HTML, not in API responses
