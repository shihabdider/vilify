# Iteration 021: HtDP Refactor

## Goal

Refactor Vilify to align with HtDP World model principles.

## Scope (This Iteration)

**Unify state + pure transitions in `src/core/` only**

1. Create unified `AppState` type with hierarchy:
   - `core`: Extension-level state
   - `ui`: UI state  
   - `site`: Site-wide state (persists across pages)
   - `page`: Page-specific state (resets on navigation)

2. Implement pure transition functions:
   - Navigation: `onNavigate`, `onSelect`
   - Filter: `onFilterChange`, `onFilterToggle`
   - Drawer: `onDrawerOpen`, `onDrawerClose`
   - Keys: `onKeySeqUpdate`, `onKeySeqClear`
   - Sort: `onSortChange`
   - Lifecycle: `onUrlChange`, `onItemsUpdate`

3. Implement pure query functions:
   - `getMode`: Derive current mode
   - `getVisibleItems`: Get filtered/sorted items

## Out of Scope

- Pure view extraction (`toView()`) - iteration 022
- Big-bang orchestration - iteration 023
- Site/Page config refinement - iteration 024
- YouTube-specific cleanup - iteration 025

## Success Criteria

- [ ] `AppState` type defined with full hierarchy
- [ ] All transition functions are pure (no side effects)
- [ ] Existing functionality preserved (no regressions)
- [ ] Core module uses new state structure
- [ ] Sites adapt to new core interface

## Key Files to Modify

| File | Changes |
|------|---------|
| `src/core/state.js` | Define AppState, AppCore, UIState, PageState types |
| `src/core/transitions.js` | New file: all pure transition functions |
| `src/core/queries.js` | New file: pure query functions (getMode, getVisibleItems) |
| `src/core/index.js` | Use new state + transitions (keep render for now) |
