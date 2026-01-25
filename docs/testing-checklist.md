# Keyring YouTube - Testing Checklist

## Installation
- [ ] Install Tampermonkey extension
- [ ] Enable Developer Mode in chrome://extensions/
- [ ] Create new userscript and paste contents of `keyring-youtube.user.js`
- [ ] Enable the script
- [ ] Refresh YouTube

## Basic Palette Functionality
- [ ] `Cmd+K` opens palette on home page
- [ ] `Cmd+K` again closes palette
- [ ] `Escape` closes palette
- [ ] Clicking outside modal closes palette
- [ ] Arrow keys navigate items
- [ ] Enter executes selected item
- [ ] Typing filters commands
- [ ] Mouse hover changes selection
- [ ] Mouse click executes item

## Navigation Commands
- [ ] "Home" navigates to youtube.com
- [ ] "Subscriptions" navigates to /feed/subscriptions
- [ ] "History" navigates to /feed/history
- [ ] "Library" navigates to /feed/library
- [ ] "Trending" navigates to /feed/trending
- [ ] "Search" focuses search box

## Vim Sequences (palette closed)
- [ ] `gh` goes to home
- [ ] `gs` goes to subscriptions
- [ ] `gi` goes to history
- [ ] `gl` goes to library
- [ ] `gt` goes to trending
- [ ] `/` focuses search

## Video Page - Playback Commands
- [ ] Navigate to any video
- [ ] "Play/Pause" toggles video
- [ ] "Skip back 10s" works
- [ ] "Skip forward 10s" works
- [ ] Speed commands change playback rate
- [ ] "Toggle fullscreen" works
- [ ] "Theater mode" toggles
- [ ] "Toggle captions" works (if available)
- [ ] "Toggle mute" works

## Video Page - Copy Commands
- [ ] "Copy video URL" copies clean URL
- [ ] "Copy URL at current time" includes timestamp
- [ ] "Copy video title" copies title
- [ ] "Copy title + URL" copies both

## Video Page - Channel Commands
- [ ] "Go to channel" navigates to channel page
- [ ] "Channel videos" navigates to videos tab

## Edge Cases
- [ ] Palette doesn't open when typing in search box
- [ ] Palette doesn't open when typing in comments
- [ ] Works on Shorts page (limited commands)
- [ ] Works on channel pages
- [ ] SPA navigation closes palette
- [ ] Back/forward buttons handled correctly

## Visual
- [ ] Palette uses YouTube dark theme colors
- [ ] Play button logo in header
- [ ] Red selection highlight
- [ ] Toast notifications appear and fade
