/**
 * Selection Manager - Manages node selection state
 */

import type { NodeId } from '@core/types/common';
import type { Rect } from '@core/types/geometry';
import type { SceneGraph } from '@scene/graph/scene-graph';
import { EventEmitter } from '@core/events/event-emitter';

/**
 * Selection manager events
 */
export type SelectionManagerEvents = {
  'selection:changed': { nodeIds: NodeId[]; previousNodeIds: NodeId[] };
  'selection:cleared': { previousNodeIds: NodeId[] };
  [key: string]: unknown;
};

/**
 * Selection mode
 */
export type SelectionMode = 'replace' | 'add' | 'remove' | 'toggle';

/**
 * Selection manager options
 */
export interface SelectionManagerOptions {
  /** Maximum selection size (0 for unlimited) */
  maxSelection?: number;
  /** Allow multi-selection */
  allowMultiple?: boolean;
}

/**
 * Selection Manager
 */
export class SelectionManager extends EventEmitter<SelectionManagerEvents> {
  private sceneGraph: SceneGraph;
  private selectedNodeIds: Set<NodeId> = new Set();
  private maxSelection: number;
  private allowMultiple: boolean;

  // Selection history for undo
  private selectionHistory: NodeId[][] = [];
  private historyIndex = -1;

  constructor(sceneGraph: SceneGraph, options: SelectionManagerOptions = {}) {
    super();
    this.sceneGraph = sceneGraph;
    this.maxSelection = options.maxSelection ?? 0;
    this.allowMultiple = options.allowMultiple ?? true;

    // Listen for node deletions
    sceneGraph.on('node:deleted', ({ nodeId }) => {
      if (this.selectedNodeIds.has(nodeId)) {
        this.deselect(nodeId);
      }
    });
  }

  // =========================================================================
  // Selection State
  // =========================================================================

  /**
   * Get selected node IDs.
   */
  getSelectedNodeIds(): NodeId[] {
    return Array.from(this.selectedNodeIds);
  }

  /**
   * Check if a node is selected.
   */
  isSelected(nodeId: NodeId): boolean {
    return this.selectedNodeIds.has(nodeId);
  }

  /**
   * Get selection count.
   */
  getSelectionCount(): number {
    return this.selectedNodeIds.size;
  }

  /**
   * Check if selection is empty.
   */
  isEmpty(): boolean {
    return this.selectedNodeIds.size === 0;
  }

  // =========================================================================
  // Selection Operations
  // =========================================================================

  /**
   * Select nodes with the given mode.
   */
  select(nodeIds: NodeId | NodeId[], mode: SelectionMode = 'replace'): void {
    const ids = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
    const previousNodeIds = this.getSelectedNodeIds();
    let changed = false;

    switch (mode) {
      case 'replace':
        changed = this.replaceSelection(ids);
        break;
      case 'add':
        changed = this.addToSelection(ids);
        break;
      case 'remove':
        changed = this.removeFromSelection(ids);
        break;
      case 'toggle':
        changed = this.toggleSelection(ids);
        break;
    }

    if (changed) {
      this.pushHistory();
      this.emit('selection:changed', {
        nodeIds: this.getSelectedNodeIds(),
        previousNodeIds,
      });
    }
  }

  /**
   * Deselect specific nodes.
   */
  deselect(nodeIds: NodeId | NodeId[]): void {
    this.select(nodeIds, 'remove');
  }

  /**
   * Clear all selection.
   */
  clear(): void {
    if (this.selectedNodeIds.size === 0) return;

    const previousNodeIds = this.getSelectedNodeIds();
    this.selectedNodeIds.clear();
    this.pushHistory();

    this.emit('selection:cleared', { previousNodeIds });
    this.emit('selection:changed', {
      nodeIds: [],
      previousNodeIds,
    });
  }

  /**
   * Select all selectable nodes.
   */
  selectAll(): void {
    const allNodes = this.getAllSelectableNodes();
    this.select(allNodes, 'replace');
  }

  /**
   * Invert selection.
   */
  invertSelection(): void {
    const allNodes = this.getAllSelectableNodes();
    const currentlySelected = new Set(this.selectedNodeIds);
    const inverted = allNodes.filter(id => !currentlySelected.has(id));
    this.select(inverted, 'replace');
  }

  // =========================================================================
  // Selection by Criteria
  // =========================================================================

  /**
   * Select nodes by type.
   */
  selectByType(type: string): void {
    const matching: NodeId[] = [];
    const allNodes = this.getAllSelectableNodes();

    for (const nodeId of allNodes) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node && node.type === type) {
        matching.push(nodeId);
      }
    }

    this.select(matching, 'replace');
  }

  /**
   * Select nodes within a rectangle (world coordinates).
   */
  selectInRect(rect: Rect, mode: SelectionMode = 'replace'): void {
    const matching: NodeId[] = [];
    const allNodes = this.getAllSelectableNodes();

    for (const nodeId of allNodes) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
        const n = node as { x: number; y: number; width: number; height: number };
        if (this.rectsIntersect(rect, n)) {
          matching.push(nodeId);
        }
      }
    }

    this.select(matching, mode);
  }

  /**
   * Select parent of current selection.
   */
  selectParent(): void {
    if (this.selectedNodeIds.size !== 1) return;

    const selectedId = Array.from(this.selectedNodeIds)[0]!;
    const parent = this.sceneGraph.getParent(selectedId);

    if (parent) {
      // Don't select document or page nodes
      if (parent.type !== 'DOCUMENT' && parent.type !== 'PAGE') {
        this.select(parent.id, 'replace');
      }
    }
  }

  /**
   * Select children of current selection.
   */
  selectChildren(): void {
    if (this.selectedNodeIds.size !== 1) return;

    const selectedId = Array.from(this.selectedNodeIds)[0]!;
    const childIds = this.sceneGraph.getChildIds(selectedId);

    if (childIds.length > 0) {
      this.select(childIds, 'replace');
    }
  }

  /**
   * Select siblings of current selection.
   */
  selectSiblings(): void {
    if (this.selectedNodeIds.size !== 1) return;

    const selectedId = Array.from(this.selectedNodeIds)[0]!;
    const parent = this.sceneGraph.getParent(selectedId);

    if (parent) {
      const siblings = this.sceneGraph.getChildIds(parent.id);
      this.select(siblings, 'replace');
    }
  }

  // =========================================================================
  // Selection Navigation
  // =========================================================================

  /**
   * Select next sibling.
   */
  selectNextSibling(): void {
    if (this.selectedNodeIds.size !== 1) return;

    const selectedId = Array.from(this.selectedNodeIds)[0]!;
    const parent = this.sceneGraph.getParent(selectedId);

    if (parent) {
      const siblings = this.sceneGraph.getChildIds(parent.id);
      const currentIndex = siblings.indexOf(selectedId);

      if (currentIndex >= 0 && currentIndex < siblings.length - 1) {
        this.select(siblings[currentIndex + 1]!, 'replace');
      }
    }
  }

  /**
   * Select previous sibling.
   */
  selectPreviousSibling(): void {
    if (this.selectedNodeIds.size !== 1) return;

    const selectedId = Array.from(this.selectedNodeIds)[0]!;
    const parent = this.sceneGraph.getParent(selectedId);

    if (parent) {
      const siblings = this.sceneGraph.getChildIds(parent.id);
      const currentIndex = siblings.indexOf(selectedId);

      if (currentIndex > 0) {
        this.select(siblings[currentIndex - 1]!, 'replace');
      }
    }
  }

  // =========================================================================
  // Selection History
  // =========================================================================

  /**
   * Undo selection change.
   */
  undoSelection(): boolean {
    if (this.historyIndex <= 0) return false;

    this.historyIndex--;
    const previousSelection = this.selectionHistory[this.historyIndex]!;
    const currentNodeIds = this.getSelectedNodeIds();

    this.selectedNodeIds = new Set(previousSelection);

    this.emit('selection:changed', {
      nodeIds: previousSelection,
      previousNodeIds: currentNodeIds,
    });

    return true;
  }

  /**
   * Redo selection change.
   */
  redoSelection(): boolean {
    if (this.historyIndex >= this.selectionHistory.length - 1) return false;

    this.historyIndex++;
    const nextSelection = this.selectionHistory[this.historyIndex]!;
    const currentNodeIds = this.getSelectedNodeIds();

    this.selectedNodeIds = new Set(nextSelection);

    this.emit('selection:changed', {
      nodeIds: nextSelection,
      previousNodeIds: currentNodeIds,
    });

    return true;
  }

  // =========================================================================
  // Bounds
  // =========================================================================

  /**
   * Get bounding box of selection.
   */
  getSelectionBounds(): Rect | null {
    if (this.selectedNodeIds.size === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const nodeId of this.selectedNodeIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
        const n = node as { x: number; y: number; width: number; height: number };
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + n.width);
        maxY = Math.max(maxY, n.y + n.height);
      }
    }

    if (minX === Infinity) return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private replaceSelection(ids: NodeId[]): boolean {
    const validIds = this.filterValidNodes(ids);
    const limitedIds = this.limitSelection(validIds);

    const oldSet = this.selectedNodeIds;
    const newSet = new Set(limitedIds);

    // Check if changed
    if (oldSet.size === newSet.size) {
      let same = true;
      for (const id of oldSet) {
        if (!newSet.has(id)) {
          same = false;
          break;
        }
      }
      if (same) return false;
    }

    this.selectedNodeIds = newSet;
    return true;
  }

  private addToSelection(ids: NodeId[]): boolean {
    const validIds = this.filterValidNodes(ids);
    let changed = false;

    for (const id of validIds) {
      if (!this.selectedNodeIds.has(id)) {
        if (this.canAddMore()) {
          this.selectedNodeIds.add(id);
          changed = true;
        }
      }
    }

    return changed;
  }

  private removeFromSelection(ids: NodeId[]): boolean {
    let changed = false;

    for (const id of ids) {
      if (this.selectedNodeIds.has(id)) {
        this.selectedNodeIds.delete(id);
        changed = true;
      }
    }

    return changed;
  }

  private toggleSelection(ids: NodeId[]): boolean {
    const validIds = this.filterValidNodes(ids);
    let changed = false;

    for (const id of validIds) {
      if (this.selectedNodeIds.has(id)) {
        this.selectedNodeIds.delete(id);
        changed = true;
      } else if (this.canAddMore()) {
        this.selectedNodeIds.add(id);
        changed = true;
      }
    }

    return changed;
  }

  private filterValidNodes(ids: NodeId[]): NodeId[] {
    return ids.filter(id => {
      const node = this.sceneGraph.getNode(id);
      if (!node) return false;
      // Don't allow selecting document nodes (but PAGE/Leaf nodes are allowed)
      return node.type !== 'DOCUMENT';
    });
  }

  private limitSelection(ids: NodeId[]): NodeId[] {
    if (!this.allowMultiple) {
      return ids.slice(0, 1);
    }
    if (this.maxSelection > 0) {
      return ids.slice(0, this.maxSelection);
    }
    return ids;
  }

  private canAddMore(): boolean {
    if (!this.allowMultiple && this.selectedNodeIds.size >= 1) {
      return false;
    }
    if (this.maxSelection > 0 && this.selectedNodeIds.size >= this.maxSelection) {
      return false;
    }
    return true;
  }

  private getAllSelectableNodes(): NodeId[] {
    const result: NodeId[] = [];
    const doc = this.sceneGraph.getDocument();
    if (!doc) return result;

    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) return result;

    const pageId = pageIds[0]!;
    this.collectSelectableNodes(pageId, result);

    return result;
  }

  private collectSelectableNodes(nodeId: NodeId, result: NodeId[]): void {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return;

    if (node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
      result.push(nodeId);
    }

    const childIds = this.sceneGraph.getChildIds(nodeId);
    for (const childId of childIds) {
      this.collectSelectableNodes(childId, result);
    }
  }

  private rectsIntersect(a: Rect, b: { x: number; y: number; width: number; height: number }): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  private pushHistory(): void {
    // Truncate any forward history
    this.selectionHistory = this.selectionHistory.slice(0, this.historyIndex + 1);

    // Add current selection
    this.selectionHistory.push(this.getSelectedNodeIds());
    this.historyIndex = this.selectionHistory.length - 1;

    // Limit history size
    if (this.selectionHistory.length > 50) {
      this.selectionHistory.shift();
      this.historyIndex--;
    }
  }
}

/**
 * Create a selection manager.
 */
export function createSelectionManager(
  sceneGraph: SceneGraph,
  options?: SelectionManagerOptions
): SelectionManager {
  return new SelectionManager(sceneGraph, options);
}
