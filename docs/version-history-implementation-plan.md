# Version History Implementation Plan

## Executive Summary

DesignLibre already has robust undo/redo infrastructure (UndoManager, HistoryManager, Transaction system). The gap is **user-facing UI and persistence**. This plan focuses on:

1. **History Panel UI** - Visual timeline of actions
2. **State Snapshots** - Jump to any point in history
3. **Named Checkpoints** - User-defined save points
4. **Persistence** - Save history across sessions

---

## Current Infrastructure Analysis

### What Exists

| Component | Location | Capability |
|-----------|----------|------------|
| UndoManager | `src/operations/undo-manager.ts` | Operation groups, undo/redo stacks, events |
| HistoryManager | `src/core/history/history-manager.ts` | Command pattern, batch operations, merging |
| Transaction | `src/operations/transaction.ts` | Atomic batching with rollback |
| Keyboard Shortcuts | `src/ui/components/canvas-container.ts` | Ctrl+Z, Ctrl+Shift+Z |
| Nav Rail Button | `src/ui/components/nav-rail.ts` | History tab (icon only) |
| Left Sidebar Placeholder | `src/ui/components/left-sidebar.ts` | "Version History coming soon" |

### What's Missing

| Feature | Priority | Complexity |
|---------|----------|------------|
| History Panel UI | P0 | Medium |
| State Snapshots | P1 | High |
| Named Checkpoints | P2 | Low |
| History Persistence | P2 | Medium |
| Undo/Redo Toolbar Buttons | P0 | Low |

---

## Implementation Phases

### Phase 1: History Panel UI (MVP)

#### 1.1 Create History Panel Component

**File:** `src/ui/components/history-panel.ts`

```typescript
interface HistoryPanelEntry {
  id: string;
  description: string;
  timestamp: number;
  type: 'action' | 'checkpoint';
  isCurrent: boolean;
  isUndone: boolean;  // In redo stack
}
```

**Features:**
- Scrollable list of history entries
- Visual indicator for current position
- Dimmed styling for undone (redo) entries
- Click to jump to any state
- Timestamps (relative: "2 min ago")
- Icons per operation type

**UI Layout:**
```
┌─────────────────────────────┐
│ History           [+ ] [⟳]  │ ← Add checkpoint, Clear
├─────────────────────────────┤
│ ▸ Current State      ●      │ ← Current position marker
│ ▸ Move 3 elements    2m ago │
│ ▸ Change fill color  3m ago │
│ ▸ ★ "Before refactor" 5m ago│ ← Checkpoint (starred)
│ ▸ Create Rectangle   6m ago │
│ ▸ Delete Text        8m ago │ ← Grayed out (in redo stack)
│ ▸ Paste elements     9m ago │
└─────────────────────────────┘
```

#### 1.2 Integrate with Left Sidebar

**File:** `src/ui/components/left-sidebar.ts`

- Replace placeholder at line ~396 with HistoryPanel instance
- Show when nav rail "history" tab is active

#### 1.3 Add Undo/Redo Buttons to Toolbar

**File:** `src/ui/components/toolbar.ts`

- Add undo button (←) with tooltip showing next undo description
- Add redo button (→) with tooltip showing next redo description
- Disable buttons when no undo/redo available
- Subscribe to `stateChanged` event for live updates

---

### Phase 2: State Snapshots (Time-Travel)

#### 2.1 Extend UndoManager for Snapshots

**File:** `src/operations/undo-manager.ts`

Add snapshot capture on each operation group:

```typescript
interface OperationGroup {
  readonly id: string;
  readonly description: string;
  readonly operations: readonly Operation[];
  readonly timestamp: number;
  readonly snapshot?: StateSnapshot;  // NEW
}

interface StateSnapshot {
  sceneGraphState: SerializedSceneGraph;
  selectionState: NodeId[];
  viewportState: ViewportState;
}
```

**Strategy:**
- Capture full state every N operations (e.g., every 10)
- For intervening states, replay operations from nearest snapshot
- Use Immer patches for efficient delta storage (per best practices doc)

#### 2.2 Jump-to-State Implementation

**File:** `src/operations/undo-manager.ts`

```typescript
jumpToState(targetGroupId: string): void {
  // 1. Find target in undo or redo stack
  // 2. Calculate operations needed
  // 3. Either undo multiple times or redo multiple times
  // 4. Or restore from nearest snapshot + replay
}
```

#### 2.3 State Restoration Service

**File:** `src/core/history/state-restoration.ts`

```typescript
class StateRestorationService {
  captureSnapshot(): StateSnapshot;
  restoreSnapshot(snapshot: StateSnapshot): void;
  calculateOperationsToReplay(fromSnapshot: StateSnapshot, toTarget: string): Operation[];
}
```

---

### Phase 3: Named Checkpoints

#### 3.1 Checkpoint Interface

**File:** `src/core/types/history.ts`

```typescript
interface Checkpoint {
  id: string;
  name: string;
  description?: string;
  timestamp: number;
  groupId: string;  // Links to OperationGroup
  snapshot: StateSnapshot;
  thumbnail?: string;  // Canvas thumbnail (data URL)
}
```

#### 3.2 Checkpoint Manager

**File:** `src/core/history/checkpoint-manager.ts`

```typescript
class CheckpointManager {
  createCheckpoint(name: string, description?: string): Checkpoint;
  deleteCheckpoint(id: string): void;
  renameCheckpoint(id: string, name: string): void;
  getCheckpoints(): Checkpoint[];
  restoreCheckpoint(id: string): void;
}
```

#### 3.3 Checkpoint UI in History Panel

- "Create Checkpoint" button (bookmark icon)
- Dialog to name checkpoint
- Starred display in history list
- Right-click menu: Rename, Delete, Restore

---

### Phase 4: History Persistence

#### 4.1 IndexedDB Storage

**File:** `src/persistence/history-persistence.ts`

```typescript
interface HistoryPersistenceService {
  saveHistory(documentId: string, history: SerializedHistory): Promise<void>;
  loadHistory(documentId: string): Promise<SerializedHistory | null>;
  clearHistory(documentId: string): Promise<void>;
}

interface SerializedHistory {
  undoStack: SerializedOperationGroup[];
  redoStack: SerializedOperationGroup[];
  checkpoints: Checkpoint[];
  snapshots: Map<string, StateSnapshot>;
}
```

#### 4.2 Auto-Save Strategy

- Save history on:
  - Every checkpoint creation
  - Every N operations (e.g., 20)
  - Document save
  - Tab close / page unload
- Debounced saves to avoid performance impact

#### 4.3 History Pruning

- Keep last N operation groups (default: 100)
- Always keep checkpoints
- Prune old snapshots but keep checkpoint snapshots

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/ui/components/history-panel.ts` | History panel UI component |
| `src/core/history/state-restoration.ts` | Snapshot capture and restoration |
| `src/core/history/checkpoint-manager.ts` | Named checkpoint management |
| `src/core/types/history.ts` | History-related type definitions |
| `src/persistence/history-persistence.ts` | IndexedDB persistence |

### Modified Files

| File | Changes |
|------|---------|
| `src/ui/components/left-sidebar.ts` | Replace placeholder with HistoryPanel |
| `src/ui/components/toolbar.ts` | Add undo/redo buttons |
| `src/operations/undo-manager.ts` | Add snapshot field to OperationGroup |
| `src/runtime/designlibre-runtime.ts` | Expose history services |

---

## Implementation Order

```
Week 1: Phase 1 (MVP)
├── Day 1-2: History Panel component
├── Day 3: Left sidebar integration
├── Day 4: Toolbar undo/redo buttons
└── Day 5: Testing and polish

Week 2: Phase 2 (Snapshots)
├── Day 1-2: StateSnapshot interface and capture
├── Day 3-4: Jump-to-state implementation
└── Day 5: State restoration service

Week 3: Phase 3-4 (Checkpoints + Persistence)
├── Day 1-2: Checkpoint manager
├── Day 3: Checkpoint UI
├── Day 4-5: IndexedDB persistence
```

---

## Technical Decisions

### 1. Snapshot Strategy: Hybrid Approach

Per the best practices document, use:
- **Full snapshots** every 10-20 operations
- **Delta patches** between snapshots (Immer patches)
- **Always capture** at checkpoints

This balances memory usage with fast restoration.

### 2. Operation Description Generation

Improve descriptions with context:
- "Move Rectangle 'Header Background'" instead of "Move element"
- "Change fill to #3B82F6" instead of "Change property"
- "Delete 5 elements" instead of "Delete element"

### 3. History Panel Performance

- Virtual scrolling for long history lists
- Lazy load timestamps (update on scroll)
- Batch UI updates on rapid operations

### 4. Collaboration Consideration

When multi-user is added later:
- Each user has local undo stack (per best practices)
- Global history shows all changes with user attribution
- Checkpoints can be shared or personal

---

## Success Criteria

1. **MVP (Phase 1)**
   - [ ] User can see list of past actions in History panel
   - [ ] User can click entry to jump to that state
   - [ ] Undo/redo buttons work in toolbar
   - [ ] Keyboard shortcuts continue to work

2. **Full Feature (Phases 2-4)**
   - [ ] State restoration is fast (<100ms for most operations)
   - [ ] Named checkpoints persist across sessions
   - [ ] History survives browser refresh
   - [ ] Memory usage stays under 50MB for 1000 operations

---

## Dependencies

None - builds entirely on existing infrastructure.

## Risks

| Risk | Mitigation |
|------|------------|
| Large state snapshots | Use Immer patches for deltas |
| IndexedDB quota limits | Implement pruning, warn user |
| Complex restoration bugs | Extensive test coverage |
