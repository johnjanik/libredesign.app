/**
 * Workspace Manager
 *
 * Manages navigation state for Trunk/Tree/Branch/Leaf hierarchy.
 * Uses canonical event names for external consumption.
 *
 * Internal naming → Canonical naming:
 * - Trunk → Workspace
 * - Tree → Project
 * - Branch → Branch
 * - Leaf → Document
 */

import { EventEmitter } from '../core/events/event-emitter';
import {
  Trunk,
  TrunkSettings,
  createTrunk,
  createTreeReference,
} from '../core/types/workspace';
import {
  Tree,
  Branch,
  Leaf,
  LeafType,
  createTree,
  createBranch,
  createLeaf,
  createLeafReference,
} from '../core/types/project';

/**
 * Workspace manager events (using canonical names)
 */
export type WorkspaceEvents = {
  // Workspace (Trunk) events
  'workspace:changed': { trunkId: string; trunk: Trunk };
  'workspace:created': { trunk: Trunk };
  'workspace:updated': { trunk: Trunk };
  'workspace:deleted': { trunkId: string };
  'workspace:list-changed': { trunks: Trunk[] };

  // Project (Tree) events
  'project:opened': { treeId: string; tree: Tree };
  'project:closed': { treeId: string };
  'project:created': { tree: Tree };
  'project:updated': { tree: Tree };
  'project:deleted': { treeId: string };

  // Branch events
  'branch:switched': { branchId: string; branch: Branch };
  'branch:created': { branch: Branch; treeId: string };
  'branch:updated': { branch: Branch };
  'branch:deleted': { branchId: string; treeId: string };

  // Document (Leaf) events
  'document:opened': { leafId: string; leaf: Leaf };
  'document:closed': { leafId: string };
  'document:created': { leaf: Leaf; branchId: string };
  'document:updated': { leaf: Leaf };
  'document:deleted': { leafId: string; branchId: string };

  // Navigation state
  'navigation:changed': {
    trunkId: string | null;
    treeId: string | null;
    branchId: string | null;
    leafId: string | null;
  };
} & Record<string, unknown>;

/**
 * Navigation state
 */
interface NavigationState {
  currentTrunkId: string | null;
  currentTreeId: string | null;
  currentBranchId: string | null;
  currentLeafId: string | null;
}

/**
 * Storage key for persisting workspace data
 */
const STORAGE_KEY = 'designlibre-workspaces';
const NAV_STATE_KEY = 'designlibre-nav-state';

/**
 * WorkspaceManager - Manages workspace navigation and state
 */
export class WorkspaceManager extends EventEmitter<WorkspaceEvents> {
  private trunks: Map<string, Trunk> = new Map();
  private trees: Map<string, Tree> = new Map();
  private leaves: Map<string, Leaf> = new Map();

  private navigation: NavigationState = {
    currentTrunkId: null,
    currentTreeId: null,
    currentBranchId: null,
    currentLeafId: null,
  };

  constructor() {
    super();
    this.loadFromStorage();
  }

  // ============================================================
  // Initialization & Persistence
  // ============================================================

  /**
   * Load workspace data from storage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as { trunks: Trunk[] };
        for (const trunk of parsed.trunks) {
          this.trunks.set(trunk.id, trunk);
        }
      }

      const navData = localStorage.getItem(NAV_STATE_KEY);
      if (navData) {
        this.navigation = JSON.parse(navData) as NavigationState;
      }
    } catch (error) {
      console.warn('Failed to load workspace data from storage:', error);
    }

    // Create default workspace if none exist
    if (this.trunks.size === 0) {
      const defaultTrunk = createTrunk('My Workspace');
      this.trunks.set(defaultTrunk.id, defaultTrunk);
      this.navigation.currentTrunkId = defaultTrunk.id;
      this.saveToStorage();
    }
  }

  /**
   * Save workspace data to storage
   */
  private saveToStorage(): void {
    try {
      const data = {
        trunks: Array.from(this.trunks.values()),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(NAV_STATE_KEY, JSON.stringify(this.navigation));
    } catch (error) {
      console.warn('Failed to save workspace data to storage:', error);
    }
  }

  // ============================================================
  // Getters
  // ============================================================

  /** Get all trunks (workspaces) */
  getTrunks(): Trunk[] {
    return Array.from(this.trunks.values());
  }

  /** Get trunk by ID */
  getTrunk(id: string): Trunk | undefined {
    return this.trunks.get(id);
  }

  /** Get current trunk */
  getCurrentTrunk(): Trunk | undefined {
    return this.navigation.currentTrunkId
      ? this.trunks.get(this.navigation.currentTrunkId)
      : undefined;
  }

  /** Get tree by ID */
  getTree(id: string): Tree | undefined {
    return this.trees.get(id);
  }

  /** Get current tree */
  getCurrentTree(): Tree | undefined {
    return this.navigation.currentTreeId
      ? this.trees.get(this.navigation.currentTreeId)
      : undefined;
  }

  /** Get current branch */
  getCurrentBranch(): Branch | undefined {
    const tree = this.getCurrentTree();
    if (!tree || !this.navigation.currentBranchId) return undefined;
    return tree.branches.find((b) => b.id === this.navigation.currentBranchId);
  }

  /** Get leaf by ID */
  getLeaf(id: string): Leaf | undefined {
    return this.leaves.get(id);
  }

  /** Get current leaf */
  getCurrentLeaf(): Leaf | undefined {
    return this.navigation.currentLeafId
      ? this.leaves.get(this.navigation.currentLeafId)
      : undefined;
  }

  /** Get current navigation state */
  getNavigationState(): Readonly<NavigationState> {
    return { ...this.navigation };
  }

  // ============================================================
  // Trunk (Workspace) Operations
  // ============================================================

  /** Create a new trunk */
  createWorkspace(name: string, settings?: Partial<TrunkSettings>): Trunk {
    const trunk = createTrunk(name, settings);
    this.trunks.set(trunk.id, trunk);
    this.saveToStorage();
    this.emit('workspace:created', { trunk });
    this.emit('workspace:list-changed', { trunks: this.getTrunks() });
    return trunk;
  }

  /** Switch to a workspace */
  setCurrentWorkspace(trunkId: string): void {
    const trunk = this.trunks.get(trunkId);
    if (!trunk) {
      throw new Error(`Workspace not found: ${trunkId}`);
    }

    trunk.lastOpenedAt = Date.now();
    this.navigation.currentTrunkId = trunkId;
    this.navigation.currentTreeId = null;
    this.navigation.currentBranchId = null;
    this.navigation.currentLeafId = null;
    this.saveToStorage();

    this.emit('workspace:changed', { trunkId, trunk });
    this.emitNavigationChanged();
  }

  /** Update workspace settings */
  updateWorkspace(trunkId: string, updates: Partial<Trunk>): void {
    const trunk = this.trunks.get(trunkId);
    if (!trunk) {
      throw new Error(`Workspace not found: ${trunkId}`);
    }

    Object.assign(trunk, updates);
    this.saveToStorage();
    this.emit('workspace:updated', { trunk });
  }

  /** Delete a workspace */
  deleteWorkspace(trunkId: string): void {
    if (!this.trunks.has(trunkId)) {
      throw new Error(`Workspace not found: ${trunkId}`);
    }

    this.trunks.delete(trunkId);

    // Clear navigation if deleted workspace was current
    if (this.navigation.currentTrunkId === trunkId) {
      const remaining = this.getTrunks();
      this.navigation.currentTrunkId = remaining[0]?.id ?? null;
      this.navigation.currentTreeId = null;
      this.navigation.currentBranchId = null;
      this.navigation.currentLeafId = null;
    }

    this.saveToStorage();
    this.emit('workspace:deleted', { trunkId });
    this.emit('workspace:list-changed', { trunks: this.getTrunks() });
    this.emitNavigationChanged();
  }

  // ============================================================
  // Tree (Project) Operations
  // ============================================================

  /** Create a new project in current workspace */
  createProject(name: string, path: string): Tree {
    const trunk = this.getCurrentTrunk();
    if (!trunk) {
      throw new Error('No workspace selected');
    }

    const tree = createTree(name, path);
    this.trees.set(tree.id, tree);

    // Add reference to trunk
    trunk.trees.push(
      createTreeReference(tree.id, name, path, {
        lastModifiedAt: tree.lastModifiedAt,
      })
    );
    trunk.settings.recentTreeIds.unshift(tree.id);

    this.saveToStorage();
    this.emit('project:created', { tree });
    return tree;
  }

  /** Open a project */
  openProject(treeId: string): void {
    const tree = this.trees.get(treeId);
    if (!tree) {
      throw new Error(`Project not found: ${treeId}`);
    }

    this.navigation.currentTreeId = treeId;
    this.navigation.currentBranchId = tree.currentBranchId;
    this.navigation.currentLeafId = null;

    // Update recents
    const trunk = this.getCurrentTrunk();
    if (trunk) {
      const recents = trunk.settings.recentTreeIds.filter((id) => id !== treeId);
      recents.unshift(treeId);
      trunk.settings.recentTreeIds = recents.slice(0, 10);
    }

    this.saveToStorage();
    this.emit('project:opened', { treeId, tree });
    this.emitNavigationChanged();
  }

  /** Close current project */
  closeProject(): void {
    const treeId = this.navigation.currentTreeId;
    if (!treeId) return;

    this.navigation.currentTreeId = null;
    this.navigation.currentBranchId = null;
    this.navigation.currentLeafId = null;

    this.saveToStorage();
    this.emit('project:closed', { treeId });
    this.emitNavigationChanged();
  }

  /** Delete a project */
  deleteProject(treeId: string): void {
    const tree = this.trees.get(treeId);
    if (!tree) {
      throw new Error(`Project not found: ${treeId}`);
    }

    this.trees.delete(treeId);

    // Remove from trunk
    const trunk = this.getCurrentTrunk();
    if (trunk) {
      trunk.trees = trunk.trees.filter((t) => t.id !== treeId);
      trunk.settings.recentTreeIds = trunk.settings.recentTreeIds.filter(
        (id) => id !== treeId
      );
    }

    // Clear navigation if deleted project was current
    if (this.navigation.currentTreeId === treeId) {
      this.navigation.currentTreeId = null;
      this.navigation.currentBranchId = null;
      this.navigation.currentLeafId = null;
    }

    this.saveToStorage();
    this.emit('project:deleted', { treeId });
    this.emitNavigationChanged();
  }

  // ============================================================
  // Branch Operations
  // ============================================================

  /** Create a new branch */
  createBranch(name: string, fromBranchId?: string): Branch {
    const tree = this.getCurrentTree();
    if (!tree) {
      throw new Error('No project selected');
    }

    const parentId = fromBranchId ?? this.navigation.currentBranchId ?? undefined;
    const branchOptions: { parentBranchId?: string } = {};
    if (parentId !== undefined) {
      branchOptions.parentBranchId = parentId;
    }
    const branch = createBranch(name, branchOptions);

    tree.branches.push(branch);
    tree.lastModifiedAt = Date.now();

    this.saveToStorage();
    this.emit('branch:created', { branch, treeId: tree.id });
    return branch;
  }

  /** Switch to a branch */
  switchBranch(branchId: string): void {
    const tree = this.getCurrentTree();
    if (!tree) {
      throw new Error('No project selected');
    }

    const branch = tree.branches.find((b) => b.id === branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    tree.currentBranchId = branchId;
    this.navigation.currentBranchId = branchId;
    this.navigation.currentLeafId = null;

    this.saveToStorage();
    this.emit('branch:switched', { branchId, branch });
    this.emitNavigationChanged();
  }

  /** Delete a branch */
  deleteBranch(branchId: string): void {
    const tree = this.getCurrentTree();
    if (!tree) {
      throw new Error('No project selected');
    }

    const branch = tree.branches.find((b) => b.id === branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    if (branch.isProtected) {
      throw new Error('Cannot delete protected branch');
    }

    if (tree.branches.length === 1) {
      throw new Error('Cannot delete last branch');
    }

    tree.branches = tree.branches.filter((b) => b.id !== branchId);

    // Switch to default branch if deleted branch was current
    if (this.navigation.currentBranchId === branchId) {
      const defaultBranch = tree.branches.find(
        (b) => b.id === tree.defaultBranchId
      );
      const newBranch = defaultBranch ?? tree.branches[0]!;
      tree.currentBranchId = newBranch.id;
      this.navigation.currentBranchId = newBranch.id;
      this.navigation.currentLeafId = null;
    }

    this.saveToStorage();
    this.emit('branch:deleted', { branchId, treeId: tree.id });
    this.emitNavigationChanged();
  }

  // ============================================================
  // Leaf (Document) Operations
  // ============================================================

  /** Create a new document */
  createDocument(name: string, type: LeafType = 'design'): Leaf {
    const branch = this.getCurrentBranch();
    if (!branch) {
      throw new Error('No branch selected');
    }

    const leaf = createLeaf(name, type);
    this.leaves.set(leaf.id, leaf);

    // Add reference to branch
    branch.leaves.push(
      createLeafReference(leaf.id, name, type, branch.leaves.length)
    );
    branch.lastModifiedAt = Date.now();

    this.saveToStorage();
    this.emit('document:created', { leaf, branchId: branch.id });
    return leaf;
  }

  /** Open a document */
  openDocument(leafId: string): void {
    const leaf = this.leaves.get(leafId);
    if (!leaf) {
      throw new Error(`Document not found: ${leafId}`);
    }

    this.navigation.currentLeafId = leafId;

    // Update recents
    const trunk = this.getCurrentTrunk();
    if (trunk) {
      const recents = trunk.settings.recentLeafIds.filter((id) => id !== leafId);
      recents.unshift(leafId);
      trunk.settings.recentLeafIds = recents.slice(0, 20);
    }

    this.saveToStorage();
    this.emit('document:opened', { leafId, leaf });
    this.emitNavigationChanged();
  }

  /** Close current document */
  closeDocument(): void {
    const leafId = this.navigation.currentLeafId;
    if (!leafId) return;

    this.navigation.currentLeafId = null;

    this.saveToStorage();
    this.emit('document:closed', { leafId });
    this.emitNavigationChanged();
  }

  /** Delete a document */
  deleteDocument(leafId: string): void {
    const branch = this.getCurrentBranch();
    if (!branch) {
      throw new Error('No branch selected');
    }

    if (!this.leaves.has(leafId)) {
      throw new Error(`Document not found: ${leafId}`);
    }

    this.leaves.delete(leafId);
    branch.leaves = branch.leaves.filter((l) => l.id !== leafId);

    // Clear navigation if deleted document was current
    if (this.navigation.currentLeafId === leafId) {
      this.navigation.currentLeafId = null;
    }

    this.saveToStorage();
    this.emit('document:deleted', { leafId, branchId: branch.id });
    this.emitNavigationChanged();
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  /** Emit navigation changed event */
  private emitNavigationChanged(): void {
    this.emit('navigation:changed', {
      trunkId: this.navigation.currentTrunkId,
      treeId: this.navigation.currentTreeId,
      branchId: this.navigation.currentBranchId,
      leafId: this.navigation.currentLeafId,
    });
  }

  /** Register a tree that was loaded externally */
  registerTree(tree: Tree): void {
    this.trees.set(tree.id, tree);
  }

  /** Register a leaf that was loaded externally */
  registerLeaf(leaf: Leaf): void {
    this.leaves.set(leaf.id, leaf);
  }

  /** Clear all data (for testing) */
  reset(): void {
    this.trunks.clear();
    this.trees.clear();
    this.leaves.clear();
    this.navigation = {
      currentTrunkId: null,
      currentTreeId: null,
      currentBranchId: null,
      currentLeafId: null,
    };
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NAV_STATE_KEY);
  }
}

/**
 * Create a workspace manager instance
 */
export function createWorkspaceManager(): WorkspaceManager {
  return new WorkspaceManager();
}
