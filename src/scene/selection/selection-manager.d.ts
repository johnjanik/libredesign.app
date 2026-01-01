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
    'selection:changed': {
        nodeIds: NodeId[];
        previousNodeIds: NodeId[];
    };
    'selection:cleared': {
        previousNodeIds: NodeId[];
    };
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
export declare class SelectionManager extends EventEmitter<SelectionManagerEvents> {
    private sceneGraph;
    private selectedNodeIds;
    private maxSelection;
    private allowMultiple;
    private selectionHistory;
    private historyIndex;
    constructor(sceneGraph: SceneGraph, options?: SelectionManagerOptions);
    /**
     * Get selected node IDs.
     */
    getSelectedNodeIds(): NodeId[];
    /**
     * Check if a node is selected.
     */
    isSelected(nodeId: NodeId): boolean;
    /**
     * Get selection count.
     */
    getSelectionCount(): number;
    /**
     * Check if selection is empty.
     */
    isEmpty(): boolean;
    /**
     * Select nodes with the given mode.
     */
    select(nodeIds: NodeId | NodeId[], mode?: SelectionMode): void;
    /**
     * Deselect specific nodes.
     */
    deselect(nodeIds: NodeId | NodeId[]): void;
    /**
     * Clear all selection.
     */
    clear(): void;
    /**
     * Select all selectable nodes.
     */
    selectAll(): void;
    /**
     * Invert selection.
     */
    invertSelection(): void;
    /**
     * Select nodes by type.
     */
    selectByType(type: string): void;
    /**
     * Select nodes within a rectangle (world coordinates).
     */
    selectInRect(rect: Rect, mode?: SelectionMode): void;
    /**
     * Select parent of current selection.
     */
    selectParent(): void;
    /**
     * Select children of current selection.
     */
    selectChildren(): void;
    /**
     * Select siblings of current selection.
     */
    selectSiblings(): void;
    /**
     * Select next sibling.
     */
    selectNextSibling(): void;
    /**
     * Select previous sibling.
     */
    selectPreviousSibling(): void;
    /**
     * Undo selection change.
     */
    undoSelection(): boolean;
    /**
     * Redo selection change.
     */
    redoSelection(): boolean;
    /**
     * Get bounding box of selection.
     */
    getSelectionBounds(): Rect | null;
    private replaceSelection;
    private addToSelection;
    private removeFromSelection;
    private toggleSelection;
    private filterValidNodes;
    private limitSelection;
    private canAddMore;
    private getAllSelectableNodes;
    private collectSelectableNodes;
    private rectsIntersect;
    private pushHistory;
}
/**
 * Create a selection manager.
 */
export declare function createSelectionManager(sceneGraph: SceneGraph, options?: SelectionManagerOptions): SelectionManager;
//# sourceMappingURL=selection-manager.d.ts.map