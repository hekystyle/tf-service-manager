# Column Order Customization — Design Document

**Date:** 2026-03-02
**Status:** Approved
**Branch:** `buttons-order`

## Summary

Allow users to customize the order and visibility of columns in the Services Status table on the Home page. The feature uses a "Customize columns" dropdown panel with drag-and-drop reordering and toggle switches for visibility. Preferences are persisted in localStorage via the existing Pinia persisted store.

## Requirements

- Reorder columns via drag-and-drop in a dropdown panel
- Show/hide individual columns via toggle switches
- "Name" column is always first and cannot be moved or hidden
- New task columns (added via config) automatically appear at the end
- Removed task columns are silently ignored
- Reset to defaults button in the panel + integration with global "Reset all to defaults"
- No new dependencies — uses HTML5 Drag & Drop API and Quasar components

## Data Model

### Extension to `SettingState` in `client/src/stores/settings.ts`

```typescript
interface ColumnConfig {
  name: string;      // column identifier (e.g. "ide", "branch", task.name)
  visible: boolean;  // whether the column is shown
}

interface SettingState {
  gitCheckoutType: string;
  selectedServices: string[];
  ideCommand: string;
  leftDrawerDefaultOpen: boolean;
  columnOrder: ColumnConfig[];  // empty array = default order
}
```

### Behavior

| Scenario | `columnOrder` value | Result |
|---|---|---|
| Fresh install / no customization | `[]` | Default hardcoded order |
| User reorders | `[{name:"branch",visible:true}, ...]` | Custom order applied |
| New task added in config | Missing from `columnOrder` | Appended at end, visible |
| Task removed from config | Present in `columnOrder` | Silently skipped |
| Reset to defaults | `[]` | Returns to default order |

## UI Design

### Activation

A new button with icon `mdi-view-column` placed in the toolbar above the table (next to "Reset all to defaults"). Click opens a `QMenu` dropdown anchored to the button.

### Panel Layout

```
+-- Customize Columns -------------------+
|                                         |
|  [drag-handle] [toggle] IDE             |
|  [drag-handle] [toggle] Git branch      |
|  [drag-handle] [toggle] Cloned          |
|  [drag-handle] [toggle] Run status      |
|  [drag-handle] [toggle] install         |
|  [drag-handle] [toggle] build           |
|  [drag-handle] [toggle] CUSTOM TASKS    |
|                                         |
|  [Reset to defaults]                    |
+-----------------------------------------+
```

- Drag handle: `mdi-drag` icon
- Toggle: `QToggle` component
- "Name" column is NOT shown in the list (always fixed first)
- Changes apply immediately (reactive via Pinia)

### New Component

`client/src/components/ColumnCustomizer.vue`

Props/interface:
- Reads available columns from a computed that merges static + dynamic columns
- Writes directly to `settingsStore.columnOrder`

## Integration with HomeView

### Modified `serviceStatusColumns` computed property

Current flow (hardcoded):
1. Static columns array → push dynamic task columns → push custom column

New flow:
1. Build a **Map** of all available column definitions (key = column `name`)
2. Read `settingsStore.columnOrder`
3. If empty → return default order (backward compatible)
4. If populated:
   - Always start with `name` column
   - Iterate `columnOrder`: for each entry with `visible: true`, take definition from Map
   - Columns in Map but NOT in `columnOrder` (new tasks) → append at end as visible
5. Return sorted, filtered array

### Drag & Drop Implementation (HTML5 API)

In `ColumnCustomizer.vue`:
- Each row: `draggable="true"` attribute
- `@dragstart` → store dragged item index in component state
- `@dragover` → `event.preventDefault()` + CSS class for drop indicator
- `@drop` → splice item from old position, insert at new position in `columnOrder`
- Reactivity: Pinia store update triggers `serviceStatusColumns` recompute → table re-renders

### Reset Logic

- **Panel button "Reset to defaults"**: sets `settingsStore.columnOrder = []`
- **Global "Reset all to defaults"**: extend `resetToDefaultsStore` to also clear `columnOrder`

## Files to Create/Modify

| File | Action | Description |
|---|---|---|
| `client/src/components/ColumnCustomizer.vue` | **Create** | New drag-and-drop column customizer panel component |
| `client/src/stores/settings.ts` | Modify | Add `ColumnConfig` interface and `columnOrder` to state |
| `client/src/views/HomeView.vue` | Modify | Add customize button, use `ColumnCustomizer`, update `serviceStatusColumns` computed |
| `client/src/stores/resetToDefaultsStore.ts` | Modify | Include `columnOrder` reset in global reset action |

## Edge Cases

- **Empty task list**: Panel shows only static columns (IDE, Branch, Cloned, Run status, Custom tasks)
- **All columns hidden**: At minimum the "Name" column is always visible (enforced, not in panel)
- **localStorage migration**: Existing users without `columnOrder` get `[]` (default behavior unchanged)
- **Concurrent config change**: If tasks change while panel is open, panel should reactively update (add new entries, keep existing order)

## Rejected Alternatives

- **vuedraggable library**: Smoother animations but adds ~45KB dependency for a single use case
- **Settings page placement**: Less discoverable, requires navigation away from context
- **Direct header drag-and-drop**: Conflicts with potential column sort clicks, complex to implement in QTable
- **Arrow buttons (up/down)**: Simpler but slower UX for multi-position moves
