/**
 * Component Registry
 *
 * Stores and manages component definitions and their relationships.
 * Tracks which instances reference which components.
 */
import type { NodeId } from '@core/types/common';
/**
 * Component metadata stored in the registry
 */
export interface ComponentEntry {
    /** Component node ID */
    readonly id: NodeId;
    /** Component name (for display) */
    readonly name: string;
    /** Timestamp when component was created */
    readonly createdAt: number;
    /** Timestamp when component was last modified */
    readonly modifiedAt: number;
    /** Optional component set ID (for variants) */
    readonly componentSetId: string | null;
    /** Variant key if part of a component set */
    readonly variantKey: string | null;
}
/**
 * Component set for grouping variants
 */
export interface ComponentSet {
    /** Unique set identifier */
    readonly id: string;
    /** Set name */
    readonly name: string;
    /** Variant property definitions */
    readonly variantProperties: readonly VariantPropertyDef[];
    /** Mapping from variant key to component ID */
    readonly variants: ReadonlyMap<string, NodeId>;
}
/**
 * Variant property definition
 */
export interface VariantPropertyDef {
    /** Property name (e.g., "State", "Size") */
    readonly name: string;
    /** Possible values (e.g., ["Default", "Hover", "Pressed"]) */
    readonly values: readonly string[];
}
/**
 * Component registry for tracking components and instances
 */
export declare class ComponentRegistry {
    private components;
    private componentSets;
    private instanceToComponent;
    private componentToInstances;
    /**
     * Register a new component.
     */
    registerComponent(id: NodeId, name: string, componentSetId?: string | null, variantKey?: string | null): void;
    /**
     * Unregister a component.
     */
    unregisterComponent(id: NodeId): void;
    /**
     * Get a component entry by ID.
     */
    getComponent(id: NodeId): ComponentEntry | null;
    /**
     * Check if a component exists.
     */
    hasComponent(id: NodeId): boolean;
    /**
     * Get all component IDs.
     */
    getAllComponentIds(): NodeId[];
    /**
     * Get all components.
     */
    getAllComponents(): ComponentEntry[];
    /**
     * Update component name.
     */
    updateComponentName(id: NodeId, name: string): void;
    /**
     * Mark component as modified.
     */
    markComponentModified(id: NodeId): void;
    /**
     * Register an instance referencing a component.
     */
    registerInstance(instanceId: NodeId, componentId: NodeId): void;
    /**
     * Unregister an instance.
     */
    unregisterInstance(instanceId: NodeId): void;
    /**
     * Get the component ID for an instance.
     */
    getComponentForInstance(instanceId: NodeId): NodeId | null;
    /**
     * Get all instance IDs for a component.
     */
    getInstancesForComponent(componentId: NodeId): NodeId[];
    /**
     * Get instance count for a component.
     */
    getInstanceCount(componentId: NodeId): number;
    /**
     * Create a new component set.
     */
    createComponentSet(id: string, name: string, variantProperties: VariantPropertyDef[]): void;
    /**
     * Get a component set.
     */
    getComponentSet(id: string): ComponentSet | null;
    /**
     * Add a component to a component set.
     */
    addToComponentSet(setId: string, variantKey: string, componentId: NodeId): void;
    /**
     * Remove a component from a component set.
     */
    removeFromComponentSet(setId: string, variantKey: string): void;
    /**
     * Get component ID for a variant key in a set.
     */
    getVariantComponent(setId: string, variantKey: string): NodeId | null;
    /**
     * Delete a component set.
     */
    deleteComponentSet(id: string): void;
    /**
     * Get all component sets.
     */
    getAllComponentSets(): ComponentSet[];
    /**
     * Clear all registry data.
     */
    clear(): void;
    /**
     * Export registry data as JSON.
     */
    toJSON(): Record<string, unknown>;
    /**
     * Import registry data from JSON.
     */
    fromJSON(data: Record<string, unknown>): void;
}
/**
 * Create a new component registry.
 */
export declare function createComponentRegistry(): ComponentRegistry;
//# sourceMappingURL=component-registry.d.ts.map