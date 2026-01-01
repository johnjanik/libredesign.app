/**
 * Layout Engine - Main coordinator for layout calculations
 *
 * Manages constraint-based layout and auto layout for the scene graph.
 */
import type { NodeId, AutoLayoutProps } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import { EventEmitter } from '@core/events/event-emitter';
import { type LayoutConstraints } from './constraints/layout-constraints';
import { type AutoLayoutResult } from './auto-layout/auto-layout';
/**
 * Layout engine events
 */
export type LayoutEngineEvents = {
    'layout:updated': {
        nodeIds: NodeId[];
    };
    'layout:started': undefined;
    'layout:completed': {
        duration: number;
    };
    [key: string]: unknown;
};
/**
 * Node layout data stored by the engine
 */
export interface NodeLayoutData {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly constraints?: LayoutConstraints | undefined;
    readonly autoLayout?: AutoLayoutProps | undefined;
}
/**
 * Layout engine - coordinates all layout calculations
 */
export declare class LayoutEngine extends EventEmitter<LayoutEngineEvents> {
    private sceneGraph;
    private solver;
    private layoutData;
    private dirtyNodes;
    private isLayoutPending;
    private rafId;
    constructor(sceneGraph: SceneGraph);
    /**
     * Get layout data for a node.
     */
    getLayout(nodeId: NodeId): NodeLayoutData | null;
    /**
     * Set constraints for a node.
     */
    setConstraints(nodeId: NodeId, constraints: LayoutConstraints): void;
    /**
     * Set auto layout properties for a container.
     */
    setAutoLayout(nodeId: NodeId, autoLayout: AutoLayoutProps): void;
    /**
     * Clear auto layout properties for a container.
     */
    clearAutoLayout(nodeId: NodeId): void;
    /**
     * Update a node's position.
     */
    setPosition(nodeId: NodeId, x: number, y: number): void;
    /**
     * Update a node's size.
     */
    setSize(nodeId: NodeId, width: number, height: number): void;
    /**
     * Mark a node as needing layout recalculation.
     */
    markDirty(nodeId: NodeId): void;
    /**
     * Mark a node and its children as dirty.
     */
    markDirtyWithChildren(nodeId: NodeId): void;
    /**
     * Force immediate layout calculation.
     */
    layoutNow(): void;
    /**
     * Calculate auto layout for a specific container.
     */
    calculateContainerAutoLayout(nodeId: NodeId): AutoLayoutResult[];
    /**
     * Get the minimum size for an auto layout container.
     */
    getAutoLayoutMinSize(nodeId: NodeId): {
        width: number;
        height: number;
    } | null;
    /**
     * Dispose of the layout engine.
     */
    dispose(): void;
    /**
     * Handle node creation.
     */
    private onNodeCreated;
    /**
     * Handle node deletion.
     */
    private onNodeDeleted;
    /**
     * Handle property changes.
     */
    private onNodePropertyChanged;
    /**
     * Schedule layout calculation on next frame.
     */
    private scheduleLayout;
    /**
     * Perform the actual layout calculation.
     */
    private performLayout;
    /**
     * Collect all nodes that need to be processed.
     */
    private collectNodesToProcess;
    /**
     * Sort nodes topologically (parents before children).
     */
    private topologicalSort;
    /**
     * Process a single node's layout.
     */
    private processNode;
    /**
     * Apply auto layout constraints for a child.
     */
    private applyAutoLayoutForChild;
    /**
     * Build auto layout config for a container.
     */
    private buildAutoLayoutConfig;
}
/**
 * Create a new layout engine.
 */
export declare function createLayoutEngine(sceneGraph: SceneGraph): LayoutEngine;
//# sourceMappingURL=layout-engine.d.ts.map