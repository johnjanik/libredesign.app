/**
 * Layout Engine - Main coordinator for layout calculations
 *
 * Manages constraint-based layout and auto layout for the scene graph.
 */
import { EventEmitter } from '@core/events/event-emitter';
import { createConstraintSolver, createSizeConstraints, createPositionConstraints, } from './solver/constraint-solver';
import { applyConstraints, DEFAULT_CONSTRAINTS, } from './constraints/layout-constraints';
import { calculateAutoLayout, calculateAutoLayoutMinSize, } from './auto-layout/auto-layout';
/**
 * Layout engine - coordinates all layout calculations
 */
export class LayoutEngine extends EventEmitter {
    sceneGraph;
    solver;
    layoutData = new Map();
    dirtyNodes = new Set();
    isLayoutPending = false;
    rafId = null;
    constructor(sceneGraph) {
        super();
        this.sceneGraph = sceneGraph;
        this.solver = createConstraintSolver();
        // Listen to scene graph changes
        this.sceneGraph.on('node:created', ({ nodeId }) => {
            const node = this.sceneGraph.getNode(nodeId);
            if (node) {
                this.onNodeCreated(node);
            }
        });
        this.sceneGraph.on('node:deleted', ({ nodeId }) => {
            this.onNodeDeleted(nodeId);
        });
        this.sceneGraph.on('node:propertyChanged', ({ nodeId, path }) => {
            this.onNodePropertyChanged(nodeId, path);
        });
        this.sceneGraph.on('node:parentChanged', ({ nodeId }) => {
            this.markDirty(nodeId);
        });
    }
    // =========================================================================
    // Public API
    // =========================================================================
    /**
     * Get layout data for a node.
     */
    getLayout(nodeId) {
        return this.layoutData.get(nodeId) ?? null;
    }
    /**
     * Set constraints for a node.
     */
    setConstraints(nodeId, constraints) {
        const current = this.layoutData.get(nodeId);
        if (current) {
            this.layoutData.set(nodeId, { ...current, constraints });
            this.markDirty(nodeId);
        }
    }
    /**
     * Set auto layout properties for a container.
     */
    setAutoLayout(nodeId, autoLayout) {
        const current = this.layoutData.get(nodeId);
        if (current) {
            this.layoutData.set(nodeId, { ...current, autoLayout });
            this.markDirtyWithChildren(nodeId);
        }
    }
    /**
     * Clear auto layout properties for a container.
     */
    clearAutoLayout(nodeId) {
        const current = this.layoutData.get(nodeId);
        if (current) {
            const { autoLayout: _, ...rest } = current;
            this.layoutData.set(nodeId, rest);
            this.markDirtyWithChildren(nodeId);
        }
    }
    /**
     * Update a node's position.
     */
    setPosition(nodeId, x, y) {
        const current = this.layoutData.get(nodeId);
        if (current) {
            this.layoutData.set(nodeId, { ...current, x, y });
            this.markDirty(nodeId);
        }
    }
    /**
     * Update a node's size.
     */
    setSize(nodeId, width, height) {
        const current = this.layoutData.get(nodeId);
        if (current) {
            this.layoutData.set(nodeId, { ...current, width, height });
            this.markDirtyWithChildren(nodeId);
        }
    }
    /**
     * Mark a node as needing layout recalculation.
     */
    markDirty(nodeId) {
        this.dirtyNodes.add(nodeId);
        this.scheduleLayout();
    }
    /**
     * Mark a node and its children as dirty.
     */
    markDirtyWithChildren(nodeId) {
        this.dirtyNodes.add(nodeId);
        const childIds = this.sceneGraph.getChildIds(nodeId);
        for (const childId of childIds) {
            this.markDirtyWithChildren(childId);
        }
        this.scheduleLayout();
    }
    /**
     * Force immediate layout calculation.
     */
    layoutNow() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.isLayoutPending = false;
        this.performLayout();
    }
    /**
     * Calculate auto layout for a specific container.
     */
    calculateContainerAutoLayout(nodeId) {
        const node = this.sceneGraph.getNode(nodeId);
        if (!node)
            return [];
        const layoutData = this.layoutData.get(nodeId);
        if (!layoutData?.autoLayout)
            return [];
        const config = this.buildAutoLayoutConfig(nodeId, layoutData);
        return calculateAutoLayout(config);
    }
    /**
     * Get the minimum size for an auto layout container.
     */
    getAutoLayoutMinSize(nodeId) {
        const layoutData = this.layoutData.get(nodeId);
        if (!layoutData?.autoLayout)
            return null;
        const config = this.buildAutoLayoutConfig(nodeId, layoutData);
        return calculateAutoLayoutMinSize(config);
    }
    /**
     * Dispose of the layout engine.
     */
    dispose() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.solver.reset();
        this.layoutData.clear();
        this.dirtyNodes.clear();
    }
    // =========================================================================
    // Private Methods
    // =========================================================================
    /**
     * Handle node creation.
     */
    onNodeCreated(node) {
        // Initialize layout data from node properties
        const x = 'x' in node ? node.x : 0;
        const y = 'y' in node ? node.y : 0;
        const width = 'width' in node ? node.width : 0;
        const height = 'height' in node ? node.height : 0;
        // Check for auto layout
        let autoLayout;
        if ('autoLayout' in node) {
            const frameNode = node;
            if (frameNode.autoLayout) {
                autoLayout = frameNode.autoLayout;
            }
        }
        const layoutData = {
            x,
            y,
            width,
            height,
            constraints: DEFAULT_CONSTRAINTS,
            autoLayout,
        };
        this.layoutData.set(node.id, layoutData);
        this.markDirty(node.id);
    }
    /**
     * Handle node deletion.
     */
    onNodeDeleted(nodeId) {
        this.layoutData.delete(nodeId);
        this.dirtyNodes.delete(nodeId);
        // Remove constraints involving this node
        // The solver's constraints are keyed by IDs that include nodeId,
        // so they'll be automatically cleaned up when referenced
    }
    /**
     * Handle property changes.
     */
    onNodePropertyChanged(nodeId, path) {
        const relevantProps = ['x', 'y', 'width', 'height', 'autoLayout', 'constraints'];
        if (relevantProps.includes(path[0] ?? '')) {
            this.markDirty(nodeId);
        }
    }
    /**
     * Schedule layout calculation on next frame.
     */
    scheduleLayout() {
        if (this.isLayoutPending)
            return;
        this.isLayoutPending = true;
        this.rafId = requestAnimationFrame(() => {
            this.isLayoutPending = false;
            this.rafId = null;
            this.performLayout();
        });
    }
    /**
     * Perform the actual layout calculation.
     */
    performLayout() {
        if (this.dirtyNodes.size === 0)
            return;
        const startTime = performance.now();
        this.emit('layout:started');
        // Collect all dirty nodes and their ancestors/descendants
        const nodesToProcess = this.collectNodesToProcess();
        // Reset solver for affected nodes
        this.solver.clear();
        // Process nodes in order (parents before children)
        const sortedNodes = this.topologicalSort(nodesToProcess);
        // Apply constraints and calculate layout
        for (const nodeId of sortedNodes) {
            this.processNode(nodeId);
        }
        // Solve the system
        this.solver.solve();
        // Update layout data with solved values
        const updatedNodes = [];
        for (const nodeId of sortedNodes) {
            const result = this.solver.getNodeLayout(nodeId);
            const current = this.layoutData.get(nodeId);
            if (current) {
                this.layoutData.set(nodeId, {
                    ...current,
                    x: result.x,
                    y: result.y,
                    width: result.width,
                    height: result.height,
                });
                updatedNodes.push(nodeId);
            }
        }
        this.dirtyNodes.clear();
        const duration = performance.now() - startTime;
        this.emit('layout:updated', { nodeIds: updatedNodes });
        this.emit('layout:completed', { duration });
    }
    /**
     * Collect all nodes that need to be processed.
     */
    collectNodesToProcess() {
        const nodes = new Set();
        for (const nodeId of this.dirtyNodes) {
            nodes.add(nodeId);
            // Add ancestors
            const ancestors = this.sceneGraph.getAncestors(nodeId);
            for (const ancestor of ancestors) {
                nodes.add(ancestor.id);
            }
            // Add descendants
            const descendants = this.sceneGraph.getDescendants(nodeId);
            for (const descendant of descendants) {
                nodes.add(descendant.id);
            }
        }
        return nodes;
    }
    /**
     * Sort nodes topologically (parents before children).
     */
    topologicalSort(nodes) {
        const sorted = [];
        const visited = new Set();
        const visit = (nodeId) => {
            if (visited.has(nodeId) || !nodes.has(nodeId))
                return;
            const node = this.sceneGraph.getNode(nodeId);
            if (node?.parentId && nodes.has(node.parentId)) {
                visit(node.parentId);
            }
            visited.add(nodeId);
            sorted.push(nodeId);
        };
        for (const nodeId of nodes) {
            visit(nodeId);
        }
        return sorted;
    }
    /**
     * Process a single node's layout.
     */
    processNode(nodeId) {
        const layoutData = this.layoutData.get(nodeId);
        if (!layoutData)
            return;
        const node = this.sceneGraph.getNode(nodeId);
        if (!node)
            return;
        // Set initial values as weak constraints
        createPositionConstraints(this.solver, nodeId, { x: layoutData.x, y: layoutData.y }, 'weak');
        createSizeConstraints(this.solver, nodeId, { width: layoutData.width, height: layoutData.height }, 'weak');
        // Apply parent constraints
        if (node.parentId) {
            const parentLayoutData = this.layoutData.get(node.parentId);
            if (parentLayoutData) {
                // Check if parent has auto layout
                if (parentLayoutData.autoLayout) {
                    // Auto layout handles child positioning
                    this.applyAutoLayoutForChild(node.parentId, nodeId);
                }
                else if (layoutData.constraints) {
                    // Apply constraint-based layout
                    applyConstraints(this.solver, node.parentId, nodeId, layoutData.constraints, {
                        x: parentLayoutData.x,
                        y: parentLayoutData.y,
                        width: parentLayoutData.width,
                        height: parentLayoutData.height,
                    }, {
                        x: layoutData.x,
                        y: layoutData.y,
                        width: layoutData.width,
                        height: layoutData.height,
                    });
                }
            }
        }
        // If this node has auto layout, calculate and apply child positions
        if (layoutData.autoLayout) {
            const results = this.calculateContainerAutoLayout(nodeId);
            for (const result of results) {
                const childLayoutData = this.layoutData.get(result.nodeId);
                if (childLayoutData) {
                    this.layoutData.set(result.nodeId, {
                        ...childLayoutData,
                        x: layoutData.x + result.x,
                        y: layoutData.y + result.y,
                        width: result.width,
                        height: result.height,
                    });
                }
            }
        }
    }
    /**
     * Apply auto layout constraints for a child.
     */
    applyAutoLayoutForChild(parentId, childId) {
        const parentLayoutData = this.layoutData.get(parentId);
        if (!parentLayoutData?.autoLayout)
            return;
        const results = this.calculateContainerAutoLayout(parentId);
        const childResult = results.find((r) => r.nodeId === childId);
        if (childResult) {
            createPositionConstraints(this.solver, childId, {
                x: parentLayoutData.x + childResult.x,
                y: parentLayoutData.y + childResult.y,
            }, 'strong');
            createSizeConstraints(this.solver, childId, {
                width: childResult.width,
                height: childResult.height,
            }, 'strong');
        }
    }
    /**
     * Build auto layout config for a container.
     */
    buildAutoLayoutConfig(nodeId, layoutData) {
        const autoLayout = layoutData.autoLayout;
        const childIds = this.sceneGraph.getChildIds(nodeId);
        const children = [];
        for (const childId of childIds) {
            const childLayoutData = this.layoutData.get(childId);
            if (childLayoutData) {
                children.push({
                    nodeId: childId,
                    width: childLayoutData.width,
                    height: childLayoutData.height,
                });
            }
        }
        return {
            ...autoLayout,
            children,
            containerWidth: layoutData.width,
            containerHeight: layoutData.height,
        };
    }
}
/**
 * Create a new layout engine.
 */
export function createLayoutEngine(sceneGraph) {
    return new LayoutEngine(sceneGraph);
}
//# sourceMappingURL=layout-engine.js.map