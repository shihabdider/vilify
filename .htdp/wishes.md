# Wishes

## Layer 0

### Wish 1: likeDislikeKeybinds
- **Signature:** Behavioral change in `src/sites/youtube/commands.ts`
- **Files:** `src/sites/youtube/commands.ts`, `src/sites/youtube/commands.test.ts`
- **Purpose:** Add `likeVideo()` and `dislikeVideo()` functions that click YouTube's native like/dislike buttons. Add `sl`/`sd` key sequences on watch page. Add command palette entries. Update tests.
- **Status:** PASS

### Wish 2: actionHintsWithLikeDislike
- **Signature:** UI change in `src/sites/youtube/watch.ts`
- **Files:** `src/sites/youtube/watch.ts`, `src/sites/youtube/watch.test.ts`
- **Purpose:** Restore action hints grid in renderVideoInfoBox showing keybinds (ss sub, sw wl, sl like, sd dislike, f fullscreen, zo desc). Add updateLikeButton() to toggle visual state after liking/disliking. Fix stale watch.test.ts tests.
