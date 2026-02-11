# Iteration

anchor: e174e9ae02fca7215aec9cec0899e29a7b1f0392
started: 2026-02-11T11:51:00-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Refactor the keyboard engine to cleanly separate core vim-like sequence matching from site-specific bindings. Currently three separate binding mechanisms exist (hardcoded early-return keys, getKeySequences, getSingleKeyActions) which conflict with each other (the gh bug). YouTube-specific logic (watch page key blocking, search input detection) is baked into core/keyboard.js. The appCallbacks object (80 lines) is constructed inside the keyboard handler instead of being passed in.

## Data Definition Plan

### New: KeyContext
```
KeyContext = { pageType: string|null, filterActive: bool, searchActive: bool, drawer: string|null }
```
Passed to getKeySequences so sites control which bindings are active per-context.

### New: normalizeKey(event) -> string|null
Converts KeyboardEvent to engine key string:
- Modifier-only → null
- Ctrl+key → 'C-' + event.key  
- Regular → event.key (case-sensitive; Shift naturally produces uppercase)

### Modified: handleKeyEvent(key, keySeq, sequences) 
Takes normalized key string instead of event. No internal toLowerCase.

### Modified: SiteConfig.getKeySequences(app, context) 
Expanded to include ALL bindings (navigation, modifiers, sequences). Replaces getSingleKeyActions.

### Removed: SiteConfig.getSingleKeyActions
Merged into getKeySequences ('G' = Shift+G, 'C-f' = Ctrl+F).

### New: SiteConfig.getBlockedNativeKeys(context) -> string[]
Keys to preventDefault+stopPropagation (YouTube watch page native key suppression).

### New: SiteConfig.isNativeSearchInput(target) -> boolean
Site-specific input detection (replaces hardcoded YouTube search selectors in core).

### Modified: setupKeyboardEngine (renamed from setupKeyboardHandler)
Simplified: input filtering + Escape stack + sequence engine. appCallbacks passed in from core/index.js.
