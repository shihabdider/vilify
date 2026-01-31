# Blueprint - Iteration 011: YouTube Transcripts

## Overview

Functions to implement behaviors B1-B7 for transcript viewing, searching, and navigation.

**Dependencies**: 
- Types from iteration DATA.md: TranscriptLine, TranscriptStatus, TranscriptResult
- Types from master DATA.md: DrawerHandler, ListDrawerConfig, AppState, YouTubeState
- Existing functions: createListDrawer (core), showMessage (core), seekToChapter (youtube/player.js)

---

## B1: Open transcript drawer (keybinding `t`)

Handled via `appCallbacks.openTranscriptDrawer` in keyboard.js (see "Core Change" section below).

The `'t'` key sequence in commands.js maps to this callback:

```js
// In getYouTubeKeySequences
sequences['t'] = () => app?.openTranscriptDrawer?.();
```

The callback checks `getSiteState().transcript` and either:
- Opens drawer if `status === 'loaded'`
- Shows "Loading transcript..." if `transcript === null`
- Shows "No transcript available" if `status === 'unavailable'`

---

## B2: Transcript content fetched and displayed

### fetchTranscript

**Signature**: `fetchTranscript : String -> Promise<TranscriptResult>`
**Purpose**: Fetches transcript from YouTube Innertube API for given video ID
**Where**: YouTube (`src/sites/youtube/transcript.js`)
**Type**: [IO] - network requests

**Examples**:
```js
// Video with captions
await fetchTranscript('dQw4w9WgXcQ')
  => { 
    status: 'loaded', 
    lines: [
      { time: 0, timeText: '0:00', duration: 2.5, text: 'Hello everyone' },
      { time: 2.5, timeText: '0:02', duration: 3.0, text: 'Welcome back' }
    ], 
    language: 'en' 
  }

// Video without captions
await fetchTranscript('xyz123noCaption')
  => { status: 'unavailable', lines: [], language: null }

// API/network error - degrade gracefully
await fetchTranscript('abc123')  // on error
  => { status: 'unavailable', lines: [], language: null }
```

**Template**:
```js
async function fetchTranscript(videoId) {
  // Inventory: videoId (String)
  // Template: sequential IO with error handling
  
  try {
    // 1. Get caption tracks from ytInitialPlayerResponse or Innertube API
    const captionTracks = getCaptionTracks(videoId);
    if (!captionTracks || captionTracks.length === 0) {
      return { status: 'unavailable', lines: [], language: null };
    }
    
    // 2. Fetch XML from first track's baseUrl
    const track = captionTracks[0];
    const response = await fetch(track.baseUrl);
    const xmlText = await response.text();
    
    // 3. Parse XML to TranscriptLine[]
    const lines = parseTranscriptXml(xmlText);
    
    // 4. Return result
    return { status: 'loaded', lines, language: track.languageCode };
  } catch (e) {
    return { status: 'unavailable', lines: [], language: null };
  }
}
```

---

### parseTranscriptXml

**Signature**: `parseTranscriptXml : String -> Array<TranscriptLine>`
**Purpose**: Parses YouTube transcript XML into structured lines
**Where**: YouTube (`src/sites/youtube/transcript.js`)
**Type**: [PURE]

**Examples**:
```js
parseTranscriptXml('<text start="0" dur="2.5">Hello</text><text start="2.5" dur="3">World</text>')
  => [
    { time: 0, timeText: '0:00', duration: 2.5, text: 'Hello' },
    { time: 2.5, timeText: '0:02', duration: 3, text: 'World' }
  ]

// Decodes HTML entities
parseTranscriptXml('<text start="5" dur="2">It&#39;s great</text>')
  => [{ time: 5, timeText: '0:05', duration: 2, text: "It's great" }]

// Empty/malformed XML
parseTranscriptXml('')
  => []
```

**Template**:
```js
function parseTranscriptXml(xmlText) {
  // Inventory: xmlText (String)
  // Template (list): build array via regex iteration
  
  const lines = [];
  const regex = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
  let match;
  
  while ((match = regex.exec(xmlText)) !== null) {
    const time = parseFloat(match[1]);
    lines.push({
      time,
      timeText: formatTime(time),
      duration: parseFloat(match[2]),
      text: decodeHtmlEntities(match[3]).trim()
    });
  }
  
  return lines;
}
```

---

### formatTime

**Signature**: `formatTime : Number -> String`
**Purpose**: Formats seconds into MM:SS or H:MM:SS string
**Where**: YouTube (`src/sites/youtube/transcript.js`)
**Type**: [PURE]

**Examples**:
```js
formatTime(0)      => '0:00'
formatTime(65)     => '1:05'
formatTime(3725)   => '1:02:05'
formatTime(45.7)   => '0:45'
```

**Template**:
```js
function formatTime(seconds) {
  // Inventory: seconds (Number)
  // Template (interval): conditional on value range
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```

---

### decodeHtmlEntities

**Signature**: `decodeHtmlEntities : String -> String`
**Purpose**: Decodes HTML entities in transcript text (&#39; -> ', &amp; -> &, etc.)
**Where**: YouTube (`src/sites/youtube/transcript.js`)
**Type**: [PURE]

**Examples**:
```js
decodeHtmlEntities("It&#39;s")      => "It's"
decodeHtmlEntities("A &amp; B")    => "A & B"
decodeHtmlEntities("Hello")        => "Hello"
```

**Template**:
```js
function decodeHtmlEntities(text) {
  // Inventory: text (String)
  // Template: use browser's built-in decoder
  
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}
```

---

### createTranscriptDrawer

**Signature**: `createTranscriptDrawer : TranscriptResult -> DrawerHandler`
**Purpose**: Creates drawer handler for displaying and filtering transcript lines
**Where**: YouTube (`src/sites/youtube/drawers/transcript.js`)
**Type**: [PURE]

**Examples**:
```js
const drawer = createTranscriptDrawer({ 
  status: 'loaded', 
  lines: [
    { time: 0, timeText: '0:00', duration: 2.5, text: 'Hello everyone' },
    { time: 2.5, timeText: '0:02', duration: 3.0, text: 'Welcome back' }
  ], 
  language: 'en' 
});

// Returns DrawerHandler with:
drawer.render(container)          // Renders transcript list into container
drawer.onKey('ArrowDown', state)  // Navigate down
drawer.onKey('Enter', state)      // Seek to selected line
drawer.onKey('/', state)          // Activate filter
drawer.updateQuery('hello')       // Filter lines containing 'hello'
drawer.cleanup()                  // Remove DOM, reset state
drawer.getFilterPlaceholder()     // => 'Filter transcript...'
```

**Template** (follows chapters.js pattern):
```js
function createTranscriptDrawer(transcript) {
  // Inventory: transcript (TranscriptResult)
  // Template (compound): access fields, pass to factory
  
  return createListDrawer({
    id: 'transcript',
    
    getItems: () => transcript.lines,
    
    renderItem: (line, isSelected) => {
      // Render: [timestamp] text
      return el('div', {}, [
        el('span', { 
          class: 'vilify-transcript-time',
          style: 'color: var(--accent); font-family: var(--font-mono); font-size: 12px; min-width: 55px;'
        }, [line.timeText]),
        el('span', { 
          class: 'vilify-transcript-text',
          style: `color: ${isSelected ? 'var(--txt-1)' : 'var(--txt-2)'}; font-size: 13px; flex: 1;`
        }, [line.text]),
      ]);
    },
    
    onSelect: (line) => {
      seekToChapter(line);  // Reuse - both have .time field
      showMessage(`Jumped to: ${line.timeText}`);
    },
    
    filterPlaceholder: 'Filter transcript...',
    
    matchesFilter: (line, query) => 
      line.text.toLowerCase().includes(query.toLowerCase())
  });
}
```

---

## B3: Scroll through transcript lines

Handled by `createListDrawer` - arrow key navigation is built-in. No new functions needed.

---

## B4: Search/filter within transcript

Handled by `createListDrawer` - filter mode (`/` key, query matching) is built-in. 
The `matchesFilter` callback in `createTranscriptDrawer` customizes matching to transcript text.

---

## B5: Jump to video position by selecting a line

Handled by `onSelect` callback in `createTranscriptDrawer` - calls `seekToChapter(line)` which uses the `.time` field.

---

## B6: Badge hint shows when video has captions

### getTranscriptBadge

**Signature**: `getTranscriptBadge : YouTubeState -> { key: String, label: String } | null`
**Purpose**: Returns badge hint if transcript is available, null otherwise
**Where**: YouTube (`src/sites/youtube/watch.js` or `transcript.js`)
**Type**: [PURE]

**Examples**:
```js
// Transcript available
getTranscriptBadge({ transcript: { status: 'loaded', lines: [...], ... }, ... })
  => { key: 't', label: 'Transcript' }

// Transcript unavailable
getTranscriptBadge({ transcript: { status: 'unavailable', ... }, ... })
  => null

// Not yet fetched
getTranscriptBadge({ transcript: null, ... })
  => null
```

**Template**:
```js
function getTranscriptBadge(siteState) {
  // Inventory: siteState.transcript (TranscriptResult | null)
  // Template (union): conditional per variant
  
  if (siteState.transcript?.status === 'loaded') {
    return { key: 't', label: 'Transcript' };
  }
  return null;
}
```

---

## B7: Status message when no transcript available

Handled in keybinding handler - when `t` is pressed:
1. Call `openTranscriptDrawer(siteState, appState)`
2. If returns `null`, call `showMessage('No transcript available')`

No new function needed - logic integrated into command handler.

---

## Core Change: Keyboard Handler siteState Access

To enable key sequences to check API-fetched state (transcript availability), we extend the keyboard handler.

### setupKeyboardHandler (MODIFIED)

**Signature**: `setupKeyboardHandler : SiteConfig × GetState × SetState × Callbacks × GetSiteState? -> void`
**Purpose**: Add optional `getSiteState` parameter to enable siteState-aware callbacks
**Where**: Core (`src/core/keyboard.js`)
**Type**: [IO]

**Change**:
```js
// Before
export function setupKeyboardHandler(config, getState, setState, callbacks) {

// After  
export function setupKeyboardHandler(config, getState, setState, callbacks, getSiteState = null) {
```

### appCallbacks Extension

Add `openTranscriptDrawer` callback that uses `getSiteState()`:

```js
const appCallbacks = {
  // ... existing callbacks ...
  
  openTranscriptDrawer: () => {
    const siteState = getSiteState?.();
    if (!siteState) return;
    
    // Toggle off if already open
    if (state.drawerState === 'transcript') {
      setState({ ...state, drawerState: null });
      return;
    }
    
    // Check availability
    if (!siteState.transcript || siteState.transcript.status !== 'loaded') {
      if (siteState.transcript === null) {
        showMessage('Loading transcript...');
      } else {
        showMessage('No transcript available');
      }
      return;
    }
    
    // Open drawer
    setState({ ...state, drawerState: 'transcript' });
  },
};
```

### index.js Change

Pass `getSiteState` to keyboard handler:

```js
// In initSite()
setupKeyboardHandler(config, getState, setState, {
  // ... callbacks ...
}, () => siteState);  // Add getSiteState getter
```

---

## Integration: Drawer Handler Lookup

Update `getDrawerHandler` in YouTube's SiteConfig to return transcript drawer:

```js
getDrawerHandler: (drawerState, siteState) => {
  if (drawerState === 'chapters') return getChapterDrawer();
  if (drawerState === 'description') return getDescriptionDrawer();
  if (drawerState === 'transcript') {
    if (siteState.transcript?.status === 'loaded') {
      return getTranscriptDrawer(siteState.transcript);
    }
  }
  return null;
}
```

---

## Integration: Transcript Fetch on Page Load

On watch page load, fetch transcript and store in YouTubeState:

```js
// In onContentReady or similar
async function initTranscript(videoId) {
  const result = await fetchTranscript(videoId);
  // Update siteState.transcript = result
}
```

---

## Summary

| Function | Behavior | Where | Type |
|----------|----------|-------|------|
| **Core changes** ||||
| setupKeyboardHandler (mod) | B1, B7 | Core | IO |
| appCallbacks.openTranscriptDrawer | B1, B7 | Core | IO |
| **YouTube functions** ||||
| fetchTranscript | B2 | YouTube | IO |
| parseTranscriptXml | B2 | YouTube | PURE |
| formatTime | B2 | YouTube | PURE |
| decodeHtmlEntities | B2 | YouTube | PURE |
| createTranscriptDrawer | B2 | YouTube | PURE |
| getTranscriptDrawer | B2 | YouTube | PURE |
| getTranscriptBadge | B6 | YouTube | PURE |
| getYouTubeDrawerHandler (mod) | B2 | YouTube | PURE |

**Reused existing**:
- `createListDrawer` (Core) - B3, B4
- `seekToChapter` (YouTube) - B5
- `showMessage` (Core) - B7

---

## Files to Create/Modify

| File | Action | Contents |
|------|--------|----------|
| **Core** |||
| `src/core/keyboard.js` | MODIFY | Add `getSiteState` parameter, add `openTranscriptDrawer` callback |
| `src/core/index.js` | MODIFY | Pass `getSiteState` to setupKeyboardHandler, pass `siteState` to getDrawerHandler |
| **YouTube** |||
| `src/sites/youtube/transcript.js` | CREATE | fetchTranscript, parseTranscriptXml, formatTime, decodeHtmlEntities |
| `src/sites/youtube/drawers/transcript.js` | CREATE | createTranscriptDrawer, getTranscriptDrawer |
| `src/sites/youtube/drawers/index.js` | MODIFY | Add transcript drawer to getYouTubeDrawerHandler |
| `src/sites/youtube/commands.js` | MODIFY | Register `t` keybinding using `openTranscriptDrawer` callback |
| `src/sites/youtube/watch.js` | MODIFY | Add transcript badge, call initTranscript on page load |
| `src/sites/youtube/index.js` | MODIFY | Add transcript to createSiteState |
