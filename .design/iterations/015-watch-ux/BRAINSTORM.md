# 015 - Watch Page Video Container UX

## Goal

Improve UX of the watch page video metadata container:
- Better layout and visual hierarchy
- Unified action row with all keyboard hints
- Clear subscription status indicator

## Final Design

```
(when subscribed:)
┌─ video ────────────────────────────────────────┐
│                                                │
│  Revenge | Mr. Robot                           │
│                                                │
│  Mr. Robot · subscribed                        │  <- "subscribed" GREY
│  Oct 10, 2020 · 255k views · 6:07              │
│                                                │
│  [M] unsub  [zo] desc  [f] ch  [t] transcript  │  <- action row (all muted)
│                                                │
└────────────────────────────────────────────────┘

(when NOT subscribed:)
│  Mr. Robot · subscribe                         │  <- "subscribe" RED
│  Oct 10, 2020 · 255k views · 6:07              │
│                                                │
│  [M] sub  [zo] desc  [f] ch  [t] transcript    │  <- action row (all muted)
```

### Color Rules
- "· subscribed" status text: `--txt-3` (grey/muted)
- "· subscribe" status text: `--accent` (red)
- All action hints (`[M] sub`, `[zo] desc`, etc.): `--txt-3` (muted)

### Conditional Hints
- `[f] ch` - only shown when video has chapters
- `[t] transcript` - only shown when transcript is loaded

```
(no chapters, no transcript:)
│  [M] sub  [zo] desc                            │

(has chapters, no transcript:)
│  [M] sub  [zo] desc  [f] ch                    │

(all available:)
│  [M] sub  [zo] desc  [f] ch  [t] transcript    │
```

## HTML Structure

```html
<div class="vilify-tui-box" data-label="video">
  <h1 class="vilify-watch-title">Title</h1>
  <div class="vilify-watch-channel">
    Mr. Robot<span class="vilify-sub-status"> · subscribed</span>
  </div>
  <div class="vilify-watch-stats">Oct 10, 2020 · 255k views · 6:07</div>
  <div class="vilify-watch-actions">
    <span class="vilify-action-hint" id="vilify-sub-action"><kbd>M</kbd>sub</span>
    <span class="vilify-action-hint"><kbd>zo</kbd>desc</span>
    <span class="vilify-action-hint"><kbd>f</kbd>ch</span>
    <span class="vilify-action-hint"><kbd>t</kbd>transcript</span>
  </div>
</div>
```
