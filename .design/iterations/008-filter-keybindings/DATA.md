# Data Definitions - Iteration 008: Filter Keybindings

## Overview

This iteration fixes keyboard behavior, no new types needed.

**References**: Uses existing types from master DATA.md:
- AppState (Core) - `localFilterActive`, `localFilterQuery`, `selectedIdx`
- No new types required

## Analysis

The fix is purely behavioral - modifying how the keyboard handler routes keys when:
1. Focus is in the status bar filter input (`#vilify-status-input`)
2. `state.localFilterActive` is true

### Existing Types Used

**AppState** fields relevant to this fix:
- `localFilterActive: Boolean` - is inline filter mode on?
- `localFilterQuery: String` - current filter text
- `selectedIdx: Number` - selected item in list

### Input Element IDs

| ID | Location | Current Passthrough |
|----|----------|---------------------|
| `vilify-status-input` | Status bar | None (bug!) |
| `vilify-chapter-filter-input` | Chapter drawer | ArrowUp, ArrowDown, Enter, Escape |

The chapter filter already has correct passthrough behavior. We need to apply the same pattern to the status bar filter.

## Summary

| Type | Classification | Where | Status |
|------|---------------|-------|--------|
| (none) | - | - | No new types needed |

## Notes

This is a code-only fix. The data model already supports filter mode correctly - the issue is in keyboard event routing, not state management.
