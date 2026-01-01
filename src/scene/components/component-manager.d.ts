/**
 * Component Manager
 *
 * Core API for creating and managing components and instances.
 * Handles component creation, instance creation, and override management.
 */
import type { NodeId } from '@core/types/common';
import type { NodeData, PropertyOverride } from '../nodes/base-node';
import type { SceneGraph } from '../graph/scene-graph';
import { ComponentRegistry, type ComponentEntry, type ComponentSet, type VariantPropertyDef } from './component-registry';
import { OverrideResolver } from './override-resolver';
import { EventEmitter } from '@core/events/event-emitter';
/**
 * Component manager events
 */
export type ComponentManagerEvents = {
    'component:created': {
        componentId: NodeId;
        name: string;
    };
    'component:deleted': {
        componentId: NodeId;
    };
    'component:updated': {
        componentId: NodeId;
    };
    'instance:created': {
        instanceId: NodeId;
        componentId: NodeId;
    };
    'instance:deleted': {
        instanceId: NodeId;
    };
    'instance:overrideChanged': {
        instanceId: NodeId;
        path: readonly string[];
    };
    'componentSet:created': {
        setId: string;
        name: string;
    };
    'componentSet:deleted': {
        setId: string;
    };
    [key: string]: unknown;
};
/**
 * Options for creating a component via component manager
 */
export interface ComponentCreationOptions {
    /** Component name */
    name?: string;
    /** Add to an existing component set */
    componentSetId?: string;
    /** Variant key if part of a component set */
    variantKey?: string;
}
/**
 * Options for creating an instance via component manager
 */
export interface InstanceCreationOptions {
    /** Initial overrides */
    overrides?: PropertyOverride[];
    /** Position to insert */
    position?: number;
}
/**
 * Component manager for the scene graph
 */
export declare class ComponentManager extends EventEmitter<ComponentManagerEvents> {
    private sceneGraph;
    private registry;
    private resolver;
    constructor(sceneGraph: SceneGraph);
    /**
     * Get the component registry.
     */
    getRegistry(): ComponentRegistry;
    /**
     * Get the override resolver.
     */
    getResolver(): OverrideResolver;
    /**
     * Create a component from an existing node.
     * The node and its descendants become the component definition.
     */
    createComponentFromNode(sourceNodeId: NodeId, options?: ComponentCreationOptions): NodeId | null;
    /**
     * Create an empty component.
     */
    createEmptyComponent(parentId: NodeId, options?: ComponentCreationOptions): NodeId;
    /**
     * Delete a component.
     * All instances become detached (they keep their current appearance).
     */
    deleteComponent(componentId: NodeId): void;
    /**
     * Update component after child modifications.
     */
    updateComponent(componentId: NodeId): void;
    /**
     * Create an instance of a component.
     */
    createInstance(componentId: NodeId, parentId: NodeId, options?: InstanceCreationOptions): NodeId | null;
    /**
     * Delete an instance.
     */
    deleteInstance(instanceId: NodeId): void;
    /**
     * Detach an instance from its component.
     * Converts the instance into regular nodes with the current appearance.
     */
    detachInstance(instanceId: NodeId): NodeId | null;
    /**
     * Reset an instance to match its component.
     */
    resetInstance(instanceId: NodeId): void;
    /**
     * Set an override on an instance.
     */
    setOverride(instanceId: NodeId, path: readonly string[], value: unknown): void;
    /**
     * Reset an override on an instance.
     */
    resetOverride(instanceId: NodeId, path: readonly string[]): void;
    /**
     * Check if a property is overridden on an instance.
     */
    isPropertyOverridden(instanceId: NodeId, path: readonly string[]): boolean;
    /**
     * Get the resolved data for an instance (component + overrides).
     */
    getResolvedInstanceData(instanceId: NodeId): NodeData | null;
    /**
     * Get effective property value for an instance.
     */
    getEffectiveValue(instanceId: NodeId, path: readonly string[]): unknown;
    /**
     * Create a component set from multiple components.
     */
    createComponentSet(name: string, variantProperties: VariantPropertyDef[], componentIds?: NodeId[]): string;
    /**
     * Delete a component set.
     */
    deleteComponentSet(setId: string): void;
    /**
     * Get component for a specific variant.
     */
    getVariantComponent(setId: string, variantKey: string): NodeId | null;
    /**
     * Switch an instance to a different variant.
     */
    switchInstanceVariant(instanceId: NodeId, newVariantKey: string): boolean;
    /**
     * Get component entry by ID.
     */
    getComponent(componentId: NodeId): ComponentEntry | null;
    /**
     * Get all components.
     */
    getAllComponents(): ComponentEntry[];
    /**
     * Get all instances of a component.
     */
    getInstances(componentId: NodeId): NodeId[];
    /**
     * Get instance count for a component.
     */
    getInstanceCount(componentId: NodeId): number;
    /**
     * Get component set.
     */
    getComponentSet(setId: string): ComponentSet | null;
    /**
     * Get all component sets.
     */
    getAllComponentSets(): ComponentSet[];
    /**
     * Check if a node is a component.
     */
    isComponent(nodeId: NodeId): boolean;
    /**
     * Check if a node is an instance.
     */
    isInstance(nodeId: NodeId): boolean;
    /**
     * Extract common node properties (excluding structural ones).
     */
    private extractNodeProperties;
    /**
     * Clone children from source to destination, applying overrides.
     */
    private cloneChildren;
    /**
     * Parse variant key from component properties.
     */
    private parseVariantKey;
    /**
     * Filter overrides to only those compatible with a component.
     */
    private filterCompatibleOverrides;
    /**
     * Clear all component data.
     */
    clear(): void;
    /**
     * Export component data.
     */
    toJSON(): Record<string, unknown>;
    /**
     * Import component data.
     */
    fromJSON(data: Record<string, unknown>): void;
}
/**
 * Create a component manager.
 */
export declare function createComponentManager(sceneGraph: SceneGraph): ComponentManager;
//# sourceMappingURL=component-manager.d.ts.map