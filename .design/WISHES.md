# Wishes

Function wish list for iteration 021 (htdp-refactor).

## Pending

### createAppState
- **Signature**: `createAppState : SiteConfig → AppState`
- **Purpose**: Create initial app state for a site

### onNavigate
- **Signature**: `onNavigate : AppState × Direction → AppState`
- **Purpose**: Move selection up/down in list

### onSelect
- **Signature**: `onSelect : AppState × boolean → AppState`
- **Purpose**: Select current item (boolean = shift key for new tab)

### onFilterChange
- **Signature**: `onFilterChange : AppState × string → AppState`
- **Purpose**: Update filter query text

### onFilterToggle
- **Signature**: `onFilterToggle : AppState → AppState`
- **Purpose**: Enter/exit filter mode

### onDrawerOpen
- **Signature**: `onDrawerOpen : AppState × DrawerType → AppState`
- **Purpose**: Open a drawer (command palette, chapters, etc.)

### onDrawerClose
- **Signature**: `onDrawerClose : AppState → AppState`
- **Purpose**: Close current drawer

### onKeySeqUpdate
- **Signature**: `onKeySeqUpdate : AppState × string → AppState`
- **Purpose**: Update partial key sequence (e.g., 'g' waiting for second key)

### onKeySeqClear
- **Signature**: `onKeySeqClear : AppState → AppState`
- **Purpose**: Clear key sequence (on timeout or completion)

### onSortChange
- **Signature**: `onSortChange : AppState × SortField × SortDirection → AppState`
- **Purpose**: Update sort field and direction

### onUrlChange
- **Signature**: `onUrlChange : AppState × string × SiteConfig → AppState`
- **Purpose**: Handle URL navigation (reset page state, update pageType)

### onItemsUpdate
- **Signature**: `onItemsUpdate : AppState × Item[] → AppState`
- **Purpose**: Update items from content polling

### getMode
- **Signature**: `getMode : AppState → Mode`
- **Purpose**: Derive current mode from state (normal, filter, search, command, input)

### getVisibleItems
- **Signature**: `getVisibleItems : AppState → Item[]`
- **Purpose**: Get items after filter/sort applied

## Complete

(none yet)
