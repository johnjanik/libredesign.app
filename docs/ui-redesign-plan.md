# DesignLibre UI Redesign - Vanilla TypeScript Implementation Plan

## Architecture Overview

Adapts the tree-themed conceptual model to vanilla TypeScript, using existing patterns:
- **EventEmitter** for reactivity
- **Class-based components** with `setup()` and `dispose()` lifecycle
- **Factory functions** for instantiation
- **CSS variables** for theming

## Internal Naming (Trunk/Tree/Branch/Leaf)

| Internal Name | Canonical Name | Purpose |
|---------------|----------------|---------|
| Trunk | Workspace | Container for projects |
| Tree | Project | Git repository with version control |
| Branch | Branch | Git branch (version/variant) |
| Leaf | Page/Document | Individual design file |

**Event names use canonical terminology:**
- `workspace:changed` (not `trunk:changed`)
- `project:opened`, `project:closed`
- `branch:switched`, `branch:created`
- `document:opened`, `document:saved`

---

## Phase 1: Type Definitions & State Infrastructure

### Files to Create

#### `/src/core/types/workspace.ts`
```typescript
// Trunk (Workspace) - container for Trees
export interface Trunk {
  id: string;
  name: string;
  trees: Tree[];
  settings: TrunkSettings;
  createdAt: number;
  lastOpenedAt: number;
}

export interface TrunkSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  sidebarWidth: number;
  autoSave: boolean;
  autoSaveInterval: number;
}
```

#### `/src/core/types/project.ts`
```typescript
// Tree (Project) - git repository
export interface Tree {
  id: string;
  name: string;
  path: string;
  branches: Branch[];
  currentBranchId: string;
  defaultBranchId: string;
  remotes: GitRemote[];
  metadata: TreeMetadata;
  createdAt: number;
  lastModifiedAt: number;
}

// Branch - git branch
export interface Branch {
  id: string;
  name: string;
  gitRef: string;
  leaves: Leaf[];
  parentBranchId: string | null;
  lastCommit: Commit | null;
  isProtected: boolean;
}

// Leaf - individual design document
export interface Leaf {
  id: string;
  name: string;
  type: LeafType;
  thumbnail?: string;
  createdAt: number;
  lastModifiedAt: number;
}
```

#### `/src/runtime/workspace-manager.ts`
```typescript
// Manages Trunk/Tree/Branch/Leaf navigation
// Extends EventEmitter for reactivity
// Persists to localStorage/IndexedDB
```

### Events (Canonical Names)
```typescript
interface WorkspaceEvents {
  'workspace:changed': { trunkId: string };
  'workspace:created': { trunk: Trunk };
  'workspace:deleted': { trunkId: string };
  'project:opened': { treeId: string };
  'project:closed': { treeId: string };
  'project:created': { tree: Tree };
  'branch:switched': { branchId: string };
  'branch:created': { branch: Branch };
  'branch:deleted': { branchId: string };
  'document:opened': { leafId: string };
  'document:closed': { leafId: string };
}
```

---

## Phase 2: UI Shell Components

### Layout Structure
```
┌──────────┬─────────────────┬─────────────────────────────┐
│ NavRail  │   SidePanel     │         MainView            │
│  (48px)  │  (240-400px)    │          (flex)             │
│          │                 │                             │
│ [icons]  │ WorkspaceSelect │                             │
│          │ ProjectSelect   │        CanvasContainer      │
│          │ ────────────    │             or              │
│          │ ToolStrip       │         CodeView            │
│          │ ────────────    │                             │
│          │ LayerTree       │                             │
│ ──────── │                 │                             │
│ [help]   │                 │                             │
│ [settings]                 │                             │
└──────────┴─────────────────┴─────────────────────────────┘
```

### Component Names (Relocatable)

| Component | Purpose | Location Agnostic |
|-----------|---------|-------------------|
| `NavRail` | Vertical icon strip | Can move to top/bottom |
| `SidePanel` | Collapsible panel container | Can be left/right |
| `WorkspaceSelector` | Trunk dropdown | Can be in header |
| `ProjectSelector` | Tree/Branch dropdowns | Can be in header |
| `ToolStrip` | Tool buttons | Can be floating |
| `LayerTree` | Layer hierarchy | Can be separate panel |
| `MainView` | Primary content area | Fixed center |

### Files to Create

#### `/src/ui/components/nav-rail.ts`
- Vertical icon bar (48px)
- Core actions: Layers, Assets, Components, History
- Bottom: Help, Settings
- Plugin extension points

#### `/src/ui/components/side-panel.ts`
- Collapsible container
- Resizable width (240-400px)
- Hosts child components
- Persist width to localStorage

#### `/src/ui/components/workspace-selector.ts`
- Trunk dropdown
- Create/rename/delete workspaces
- Shows sync status

#### `/src/ui/components/project-selector.ts`
- Tree dropdown + Branch dropdown
- Create/switch/delete
- Shows git status

#### `/src/ui/components/layer-tree.ts`
- Hierarchical layer view
- Multi-select (Ctrl+Click, Shift+Click)
- Drag-and-drop reorder
- Inline rename
- Visibility/lock toggles

---

## Phase 3: Modal System

### Base Modal
```typescript
interface ModalOptions {
  title: string;
  size: 'small' | 'medium' | 'large' | 'fullscreen';
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
}
```

### Modals to Create
- `SettingsModal` - App settings with tabs
- `HelpModal` - Keyboard shortcuts, docs
- `WorkspaceManagerModal` - Manage trunks
- `BranchManagerModal` - Merge, compare branches
- `ExportModal` - Export options

---

## Phase 4: Plugin System

### Plugin API
```typescript
interface PluginAPI {
  // UI Extension
  addNavRailAction(config: NavRailAction): Unsubscribe;
  addToolStripAction(config: ToolAction): Unsubscribe;

  // Commands
  registerCommand(command: Command): Unsubscribe;

  // Settings
  registerSettingsTab(tab: SettingsTab): Unsubscribe;

  // Storage
  loadData<T>(): Promise<T | null>;
  saveData<T>(data: T): Promise<void>;

  // Events
  on<K extends keyof PluginEvents>(event: K, handler): Unsubscribe;

  // Runtime access
  getRuntime(): DesignLibreRuntime;
}
```

### Files to Create
- `/src/plugins/plugin-types.ts` - Type definitions
- `/src/plugins/plugin-manager.ts` - Load/unload plugins
- `/src/plugins/plugin-api.ts` - API implementation

---

## Implementation Order

### Phase 1: Foundation (Current)
1. [x] Type definitions (`workspace.ts`, `project.ts`)
2. [ ] WorkspaceManager class
3. [ ] WorkspaceEvents integration

### Phase 2: Shell Components
1. [ ] NavRail
2. [ ] SidePanel (resizable)
3. [ ] WorkspaceSelector
4. [ ] ProjectSelector
5. [ ] LayerTree (enhanced from existing)

### Phase 3: Modals
1. [ ] Base Modal component
2. [ ] SettingsModal
3. [ ] WorkspaceManagerModal
4. [ ] Other modals

### Phase 4: Plugin System
1. [ ] Plugin types
2. [ ] PluginManager
3. [ ] PluginAPI
4. [ ] Example plugin

### Phase 5: Integration
1. [ ] Wire up main.ts
2. [ ] Keyboard shortcuts
3. [ ] Persistence layer
4. [ ] Polish & accessibility

---

## File Structure

```
src/
├── core/types/
│   ├── workspace.ts      # Trunk type
│   ├── project.ts        # Tree, Branch, Leaf types
│   └── ... (existing)
├── runtime/
│   ├── workspace-manager.ts  # Navigation state
│   └── ... (existing)
├── ui/
│   ├── components/
│   │   ├── nav-rail.ts
│   │   ├── side-panel.ts
│   │   ├── workspace-selector.ts
│   │   ├── project-selector.ts
│   │   ├── layer-tree.ts
│   │   ├── modal.ts
│   │   └── ... (existing)
│   └── modals/
│       ├── settings-modal.ts
│       ├── workspace-manager-modal.ts
│       └── ...
├── plugins/
│   ├── plugin-types.ts
│   ├── plugin-manager.ts
│   └── plugin-api.ts
└── main.ts
```

---

## Design Tokens (CSS Variables)

Use existing `--designlibre-*` prefix:
```css
--designlibre-nav-rail-width: 48px;
--designlibre-side-panel-width: 280px;
--designlibre-side-panel-min: 240px;
--designlibre-side-panel-max: 400px;
```

---

## Notes

1. **Relocatable components**: Each UI component manages its own DOM, can be mounted anywhere
2. **Canonical events**: Use standard terms (workspace, project, branch, document) not tree metaphors
3. **Existing patterns**: Follow EventEmitter, factory function, dispose() patterns
4. **No React**: Pure vanilla TypeScript with direct DOM manipulation
