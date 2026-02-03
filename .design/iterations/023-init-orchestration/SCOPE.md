# Iteration 023: Init Orchestration

## Goal

Create clean `init()` entry point with encapsulated state. Remove module-level mutable state from `src/core/index.js`.

## Current State (Problem)

Module-level mutable state in `src/core/index.js`:
```javascript
let state = null;           // AppState
let siteState = null;       // Site-specific state
let currentConfig = null;   // SiteConfig
let pollTimer = null;       // Timer handle
let lastVideoCount = 0;     // Polling state
let lastRenderedDrawer = null; // View diff state
```

This makes testing difficult and violates HtDP's isolation principle.

## Target State

Encapsulate all state into an `App` object returned by `createApp()`:
```javascript
function createApp(config) {
  // All state private via closure
  let state = createAppState(config);
  let pollTimer = null;
  let lastVideoCount = 0;
  let lastRenderedDrawer = null;
  
  // Return interface
  return {
    init(),      // Set up event handlers, show UI
    destroy(),   // Clean up event handlers, timers
    getState(),  // For testing
    setState(s), // For testing
  };
}
```

## Wishes

### createApp
- **Signature**: `createApp : SiteConfig → App`
- **Purpose**: Create app instance with encapsulated state and event handlers
- **Notes**: All module-level state becomes closure state

### App.init
- **Signature**: `App.init : () → void`
- **Purpose**: Initialize app (inject styles, set up handlers, show UI)
- **Notes**: Consolidates `initSite()` setup

### App.destroy
- **Signature**: `App.destroy : () → void`
- **Purpose**: Clean up event handlers and timers
- **Notes**: Important for testing, hot reload

## Out of Scope

- Site-specific state management (iteration 025)
- PageConfig extraction (iteration 024)
- Render loop changes (already pure via toView)

## Tests

- `createApp` returns object with expected interface
- Multiple `createApp()` calls create independent instances
- `destroy()` removes event listeners
- State is properly encapsulated (no module-level state)

## Version

0.5.29 → 0.5.30
