# Column Order Customization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to customize column order and visibility in the Home page Services Status table via a dropdown panel with drag-and-drop.

**Architecture:** Extend the existing Pinia persisted settings store with a `columnOrder` array. A new `ColumnCustomizer.vue` component provides drag-and-drop reordering and visibility toggles inside a QMenu dropdown. The `serviceStatusColumns` computed in HomeView respects the stored order.

**Tech Stack:** Vue 3, Quasar, Pinia with persisted state, HTML5 Drag & Drop API

---

## Task 1: Extend Settings Store with `columnOrder`

**Files:**
- Modify: `client/src/stores/settings.ts`

**Step 1: Add ColumnConfig interface and columnOrder to state**

Add `ColumnConfig` export interface and extend `SettingState`:

```typescript
export interface ColumnConfig {
  name: string;
  visible: boolean;
}

interface SettingState {
  gitCheckoutType: string;
  selectedServices: string[];
  ideCommand: string;
  leftDrawerDefaultOpen: boolean;
  columnOrder: ColumnConfig[];
}
```

Add `columnOrder: []` to the state default.

**Step 2: Add resetColumnOrder action**

```typescript
actions: {
  resetColumnOrder() {
    this.columnOrder = [];
  },
},
```

**Step 3: Verify type-check passes**

Run: `cd client && npx vue-tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add client/src/stores/settings.ts
git commit -m "feat: add columnOrder to settings store"
```

---

## Task 2: Create ColumnCustomizer component

**Files:**
- Create: `client/src/components/ColumnCustomizer.vue`

**Step 1: Create the component with props and template**

The component receives `availableColumns` (all columns except "name") as a prop. It reads/writes `settingsStore.columnOrder`. It renders inside a QMenu.

```vue
<template>
  <q-list dense style="min-width: 250px">
    <q-item-label header>Customize Columns</q-item-label>
    <q-separator />
    <q-item
      v-for="(col, index) in displayColumns"
      :key="col.name"
      draggable="true"
      @dragstart="onDragStart(index, $event)"
      @dragover.prevent="onDragOver(index, $event)"
      @dragleave="onDragLeave($event)"
      @drop="onDrop(index, $event)"
      :class="{ 'drag-over': dragOverIndex === index }"
      class="column-item"
    >
      <q-item-section side>
        <q-icon name="drag_indicator" class="drag-handle cursor-move" />
      </q-item-section>
      <q-item-section side>
        <q-toggle
          :model-value="col.visible"
          @update:model-value="toggleVisibility(index)"
          size="sm"
        />
      </q-item-section>
      <q-item-section>
        <q-item-label>{{ col.label }}</q-item-label>
      </q-item-section>
    </q-item>
    <q-separator />
    <q-item>
      <q-item-section>
        <q-btn
          flat
          dense
          color="primary"
          label="Reset to defaults"
          icon="restart_alt"
          @click="resetToDefaults"
        />
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useSettingsStore, type ColumnConfig } from "@/stores/settings";

interface ColumnDisplay {
  name: string;
  label: string;
  visible: boolean;
}

const props = defineProps<{
  availableColumns: { name: string; label: string }[];
}>();

const settingsStore = useSettingsStore();
const draggedIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const displayColumns = computed((): ColumnDisplay[] => {
  const stored = settingsStore.columnOrder;
  if (stored.length === 0) {
    return props.availableColumns.map((col) => ({
      name: col.name,
      label: col.label,
      visible: true,
    }));
  }

  const result: ColumnDisplay[] = [];
  const availableMap = new Map(
    props.availableColumns.map((c) => [c.name, c.label]),
  );

  // Add columns from stored order (skip removed ones)
  for (const stored_col of stored) {
    const label = availableMap.get(stored_col.name);
    if (label !== undefined) {
      result.push({
        name: stored_col.name,
        label,
        visible: stored_col.visible,
      });
      availableMap.delete(stored_col.name);
    }
  }

  // Append new columns not in stored order
  for (const [name, label] of availableMap) {
    result.push({ name, label, visible: true });
  }

  return result;
});

function syncToStore() {
  settingsStore.columnOrder = displayColumns.value.map((col) => ({
    name: col.name,
    visible: col.visible,
  }));
}

function toggleVisibility(index: number) {
  // Initialize store from current display if empty
  if (settingsStore.columnOrder.length === 0) {
    syncToStore();
  }
  settingsStore.columnOrder[index]!.visible =
    !settingsStore.columnOrder[index]!.visible;
}

function onDragStart(index: number, event: DragEvent) {
  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function onDragOver(index: number, _event: DragEvent) {
  dragOverIndex.value = index;
}

function onDragLeave(_event: DragEvent) {
  dragOverIndex.value = null;
}

function onDrop(targetIndex: number, _event: DragEvent) {
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    dragOverIndex.value = null;
    return;
  }

  // Initialize store from current display if empty
  if (settingsStore.columnOrder.length === 0) {
    syncToStore();
  }

  const items = [...settingsStore.columnOrder];
  const [moved] = items.splice(draggedIndex.value, 1);
  items.splice(targetIndex, 0, moved!);
  settingsStore.columnOrder = items;

  draggedIndex.value = null;
  dragOverIndex.value = null;
}

function resetToDefaults() {
  settingsStore.resetColumnOrder();
}
</script>

<style scoped lang="scss">
.column-item {
  transition: background-color 0.15s;
  user-select: none;
}

.column-item.drag-over {
  border-top: 2px solid $primary;
}

.drag-handle {
  opacity: 0.5;
}

.column-item:hover .drag-handle {
  opacity: 1;
}
</style>
```

**Step 2: Verify type-check passes**

Run: `cd client && npx vue-tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add client/src/components/ColumnCustomizer.vue
git commit -m "feat: create ColumnCustomizer component with drag-and-drop"
```

---

## Task 3: Update HomeView — serviceStatusColumns computed

**Files:**
- Modify: `client/src/views/HomeView.vue` (lines 325-375)

**Step 1: Refactor serviceStatusColumns to respect columnOrder**

Replace the current `serviceStatusColumns` computed (lines 325-375) with logic that:

1. Builds a Map of all available column definitions
2. Reads `settingsStore.columnOrder`
3. If `columnOrder` is empty, returns the default order (current behavior)
4. If populated, returns columns in stored order, skipping hidden ones, appending new ones

```typescript
const allColumnDefinitions = computed(() => {
  const cols: { name: string; label: string; def: NonNullable<QTableProps["columns"]>[number] }[] = [
    { name: "ide", label: "IDE", def: { name: "ide", label: "IDE", align: "center", field: (row) => row.name } },
    { name: "branch", label: "Git branch", def: { name: "branch", label: "Git branch", align: "left", field: (row) => row.currentGitBranch } },
    { name: "cloned", label: "Cloned", def: { name: "cloned", label: "Cloned", align: "center", field: (row) => row.cloned } },
    { name: "runStatus", label: "Run status", def: { name: "runStatus", label: "Run status", align: "center", field: (row) => row.runStatus } },
  ];

  for (const task of tasksStore.tasks) {
    if (!isGitTask(task)) {
      cols.push({
        name: task.name,
        label: task.name,
        def: { name: task.name, label: task.name, align: "center", field: (row) => row.name },
      });
    }
  }

  cols.push({
    name: "custom",
    label: "CUSTOM TASKS",
    def: { name: "custom", label: "CUSTOM TASKS", align: "center", field: (row) => row.currentGitBranch },
  });

  return cols;
});

const serviceStatusColumns = computed((): QTableProps["columns"] => {
  const nameCol: NonNullable<QTableProps["columns"]>[number] = {
    name: "name", label: "Name", align: "left", field: (row) => row.name,
  };

  const allCols = allColumnDefinitions.value;
  const defMap = new Map(allCols.map((c) => [c.name, c.def]));
  const stored = settingStore.columnOrder;

  // Default order — no customization
  if (stored.length === 0) {
    return [nameCol, ...allCols.map((c) => c.def)];
  }

  // Custom order
  const result: NonNullable<QTableProps["columns"]> = [nameCol];
  const used = new Set<string>();

  for (const entry of stored) {
    if (entry.visible && defMap.has(entry.name)) {
      result.push(defMap.get(entry.name)!);
      used.add(entry.name);
    }
  }

  // Append any new columns not in stored order
  for (const col of allCols) {
    if (!used.has(col.name)) {
      result.push(col.def);
    }
  }

  return result;
});
```

**Step 2: Extract availableColumns computed for the ColumnCustomizer prop**

```typescript
const availableColumns = computed(() =>
  allColumnDefinitions.value.map((c) => ({ name: c.name, label: c.label })),
);
```

**Step 3: Verify type-check passes**

Run: `cd client && npx vue-tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add client/src/views/HomeView.vue
git commit -m "feat: refactor serviceStatusColumns to respect columnOrder from settings"
```

---

## Task 4: Update HomeView — add Customize Columns button and panel

**Files:**
- Modify: `client/src/views/HomeView.vue` (template + imports)

**Step 1: Add import for ColumnCustomizer**

In the `<script setup>` block, add:

```typescript
import ColumnCustomizer from "@/components/ColumnCustomizer.vue";
```

**Step 2: Add the button + QMenu to the template**

In the toolbar section (lines 9-19), add a new button next to the "Reset all to defaults" button:

```vue
<div class="services-status-container q-gutter-sm">
  <div class="text-h6">Services Status</div>
  <div class="row q-gutter-sm">
    <q-btn
      unelevated
      color="primary"
      icon="view_column"
      label="Customize columns"
    >
      <q-menu anchor="bottom right" self="top right">
        <column-customizer :available-columns="availableColumns" />
      </q-menu>
    </q-btn>
    <q-btn
      unelevated
      color="negative"
      :loading="resetInProgress"
      label="reset all to defaults"
      :disable="resetInProgress"
      @click="openConfirmDefaultsResetDialog"
    />
  </div>
</div>
```

**Step 3: Update top-row template for column visibility**

The `top-row` slot (lines 175-241) has hardcoded `<q-td>` cells that must stay aligned with the visible columns. The top-row renders bulk action buttons. It needs to be adjusted so that hidden columns don't produce extra `<q-td>` cells.

Add a helper function:

```typescript
const isColumnVisible = (columnName: string): boolean => {
  const stored = settingStore.columnOrder;
  if (stored.length === 0) return true;
  const entry = stored.find((c) => c.name === columnName);
  return entry ? entry.visible : true; // new columns default visible
};
```

Then wrap each `<q-td>` in the top-row with `v-if="isColumnVisible('columnName')"`:

- `<q-td>` for ide: `v-if="isColumnVisible('ide')"`
- `<q-td>` containing branch/git task buttons: `v-if="isColumnVisible('branch')"`
- `<q-td>` for cloned: `v-if="isColumnVisible('cloned')"`
- `<q-td>` for runStatus: `v-if="isColumnVisible('runStatus')"`
- The dynamic task `<q-td>` loop: add `v-if="isColumnVisible(task.name)"` to each
- `<q-td key="custom">`: `v-if="isColumnVisible('custom')"`

**Step 4: Verify type-check passes**

Run: `cd client && npx vue-tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add client/src/views/HomeView.vue
git commit -m "feat: add Customize Columns button and panel to HomeView"
```

---

## Task 5: Integrate reset with global "Reset all to defaults"

**Files:**
- Modify: `client/src/stores/resetToDefaultsStore.ts`
- Modify: `client/src/views/HomeView.vue` (line 465-468, `startResetToDefaults` function)

**Step 1: Clear columnOrder in the global reset flow**

In `HomeView.vue`, the `startResetToDefaults` function (line 465) triggers the global reset. Add `settingStore.resetColumnOrder()` call:

```typescript
const startResetToDefaults = () => {
  resetToDefaultsStore.startReset();
  settingStore.resetColumnOrder();
  tasksStore.resetAllServices();
};
```

**Step 2: Verify type-check passes**

Run: `cd client && npx vue-tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add client/src/views/HomeView.vue
git commit -m "feat: include columnOrder in global reset to defaults"
```

---

## Task 6: Manual smoke test and final verification

**Step 1: Start the dev server**

Run: `cd client && npm run dev`

**Step 2: Verify in browser**

Test checklist:
- [ ] "Customize columns" button appears next to "Reset all to defaults"
- [ ] Clicking it opens a dropdown panel listing all columns (except Name)
- [ ] Each column has a drag handle and toggle switch
- [ ] Toggling a column off hides it from the table
- [ ] Dragging a column changes its position in the table
- [ ] Refreshing the page preserves the custom order (localStorage)
- [ ] "Reset to defaults" in panel restores original order
- [ ] Global "Reset all to defaults" also resets column order
- [ ] New task columns (if added to config) appear at the end
- [ ] Top-row bulk action buttons stay aligned with visible columns

**Step 3: Run lint**

Run: `cd client && npm run lint`
Expected: No errors

**Step 4: Run type-check**

Run: `cd client && npm run type-check`
Expected: No errors

**Step 5: Final commit (if any lint fixes needed)**

```bash
git add -A
git commit -m "fix: lint fixes for column customization feature"
```
