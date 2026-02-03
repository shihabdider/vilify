# Iteration 022: Pure View

## Goal

Align rendering with HtDP World model by separating pure view computation from impure DOM manipulation.

## Scope (This Iteration)

**Extract `toView()` pure function, create ViewTree type, isolate DOM in `applyView()`**

1. Create `ViewTree` type hierarchy:
   - `ViewTree`: Top-level view state
   - `StatusBarView`: Mode badge, input, sort indicator, hints
   - `ContentView`: Main content area (listing or custom layout)
   - `DrawerView`: Drawer state (palette, site drawers)

2. Implement pure view functions:
   - `toView`: AppState × SiteConfig → ViewTree
   - `toStatusBarView`: AppState → StatusBarView
   - `toContentView`: AppState × SiteConfig → ContentView
   - `toDrawerView`: AppState × SiteConfig → DrawerView

3. Implement I/O shell:
   - `applyView`: ViewTree → void (DOM manipulation)

4. Refactor `render()` to use `toView()` + `applyView()`

## Out of Scope

- Big-bang orchestration refactor (iteration 023)
- Site/Page config refinement (iteration 024)
- YouTube-specific cleanup (iteration 025)

## Success Criteria

- [x] ViewTree types defined in DATA.md
- [x] `toView()` is pure (no side effects, no DOM access)
- [x] `applyView()` contains all DOM manipulation
- [x] Existing functionality preserved (no regressions)
- [x] Tests for pure view functions (29 tests)

## Key Files

| File | Purpose |
|------|---------|
| `src/core/view-tree.js` | NEW - ViewTree type, toView, toStatusBarView, toContentView, toDrawerView |
| `src/core/apply-view.js` | NEW - applyView (isolated I/O) |
| `src/core/index.js` | Use toView + applyView instead of monolithic render |
| `.design/DATA.md` | Add ViewTree types |

## Design Notes

### ViewTree Structure

```
ViewTree
├── statusBar: StatusBarView
│   ├── mode: String
│   ├── inputVisible: Boolean
│   ├── inputValue: String
│   ├── inputPlaceholder: String
│   ├── sortLabel: String | null
│   ├── itemCount: Number | null
│   └── hints: String | null
├── content: ContentView
│   ├── type: 'listing' | 'custom'
│   ├── items: Item[] (for listing)
│   ├── selectedIdx: Number
│   └── customRender: Function | null (for watch page, etc.)
└── drawer: DrawerView | null
    ├── type: DrawerType
    ├── items: Item[] (for list drawers)
    ├── selectedIdx: Number
    └── content: String | null (for content drawers)
```

### Pure/Impure Separation

```javascript
// Pure (in view-tree.js)
function toView(state, config) {
  return {
    statusBar: toStatusBarView(state),
    content: toContentView(state, config),
    drawer: toDrawerView(state, config)
  };
}

// Impure (in apply-view.js)
function applyView(view) {
  applyStatusBar(view.statusBar);
  applyContent(view.content);
  applyDrawer(view.drawer);
}

// In index.js
function render() {
  const view = toView(state, currentConfig);
  applyView(view);
}
```
