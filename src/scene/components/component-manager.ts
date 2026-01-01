/**
 * Component Manager
 *
 * Core API for creating and managing components and instances.
 * Handles component creation, instance creation, and override management.
 */

import type { NodeId, NodeType } from '@core/types/common';
import type { NodeData, ComponentNodeData, InstanceNodeData, PropertyOverride } from '../nodes/base-node';
import type { SceneGraph } from '../graph/scene-graph';
import { ComponentRegistry, createComponentRegistry, type ComponentEntry, type ComponentSet, type VariantPropertyDef } from './component-registry';
import { OverrideResolver, createOverrideResolver } from './override-resolver';
import { EventEmitter } from '@core/events/event-emitter';

/**
 * Component manager events
 */
export type ComponentManagerEvents = {
  'component:created': { componentId: NodeId; name: string };
  'component:deleted': { componentId: NodeId };
  'component:updated': { componentId: NodeId };
  'instance:created': { instanceId: NodeId; componentId: NodeId };
  'instance:deleted': { instanceId: NodeId };
  'instance:overrideChanged': { instanceId: NodeId; path: readonly string[] };
  'componentSet:created': { setId: string; name: string };
  'componentSet:deleted': { setId: string };
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
export class ComponentManager extends EventEmitter<ComponentManagerEvents> {
  private sceneGraph: SceneGraph;
  private registry: ComponentRegistry;
  private resolver: OverrideResolver;

  constructor(sceneGraph: SceneGraph) {
    super();
    this.sceneGraph = sceneGraph;
    this.registry = createComponentRegistry();
    this.resolver = createOverrideResolver();
  }

  /**
   * Get the component registry.
   */
  getRegistry(): ComponentRegistry {
    return this.registry;
  }

  /**
   * Get the override resolver.
   */
  getResolver(): OverrideResolver {
    return this.resolver;
  }

  // =========================================================================
  // Component Creation
  // =========================================================================

  /**
   * Create a component from an existing node.
   * The node and its descendants become the component definition.
   */
  createComponentFromNode(sourceNodeId: NodeId, options: ComponentCreationOptions = {}): NodeId | null {
    const sourceNode = this.sceneGraph.getNode(sourceNodeId);
    if (!sourceNode) return null;

    const parentId = sourceNode.parentId;
    if (!parentId) return null;

    // Get position of source node
    const siblings = this.sceneGraph.getChildIds(parentId);
    const position = siblings.indexOf(sourceNodeId);

    // Create component node with same properties as source
    const componentId = this.sceneGraph.createNode('COMPONENT', parentId, position, {
      ...this.extractNodeProperties(sourceNode),
      name: options.name ?? `${sourceNode.name} Component`,
    });

    // Move children from source to component
    const sourceChildren = this.sceneGraph.getChildIds(sourceNodeId);
    for (let i = 0; i < sourceChildren.length; i++) {
      const childId = sourceChildren[i]!;
      this.sceneGraph.moveNode(childId, componentId, i);
    }

    // Delete the original source node
    this.sceneGraph.deleteNode(sourceNodeId);

    // Register in component registry
    this.registry.registerComponent(
      componentId,
      options.name ?? sourceNode.name,
      options.componentSetId ?? null,
      options.variantKey ?? null
    );

    // Add to component set if specified
    if (options.componentSetId && options.variantKey) {
      this.registry.addToComponentSet(options.componentSetId, options.variantKey, componentId);
    }

    this.emit('component:created', { componentId, name: options.name ?? sourceNode.name });

    return componentId;
  }

  /**
   * Create an empty component.
   */
  createEmptyComponent(parentId: NodeId, options: ComponentCreationOptions = {}): NodeId {
    const componentId = this.sceneGraph.createNode('COMPONENT', parentId, -1, {
      name: options.name ?? 'Component',
    } as Parameters<typeof this.sceneGraph.createNode>[3]);

    this.registry.registerComponent(
      componentId,
      options.name ?? 'Component',
      options.componentSetId ?? null,
      options.variantKey ?? null
    );

    if (options.componentSetId && options.variantKey) {
      this.registry.addToComponentSet(options.componentSetId, options.variantKey, componentId);
    }

    this.emit('component:created', { componentId, name: options.name ?? 'Component' });

    return componentId;
  }

  /**
   * Delete a component.
   * All instances become detached (they keep their current appearance).
   */
  deleteComponent(componentId: NodeId): void {
    const entry = this.registry.getComponent(componentId);
    if (!entry) return;

    // Get all instances and detach them
    const instances = this.registry.getInstancesForComponent(componentId);
    for (const instanceId of instances) {
      this.detachInstance(instanceId);
    }

    // Unregister component
    this.registry.unregisterComponent(componentId);

    // Delete the node
    this.sceneGraph.deleteNode(componentId);

    this.emit('component:deleted', { componentId });
  }

  /**
   * Update component after child modifications.
   */
  updateComponent(componentId: NodeId): void {
    if (!this.registry.hasComponent(componentId)) return;

    this.registry.markComponentModified(componentId);
    this.emit('component:updated', { componentId });
  }

  // =========================================================================
  // Instance Creation
  // =========================================================================

  /**
   * Create an instance of a component.
   */
  createInstance(
    componentId: NodeId,
    parentId: NodeId,
    options: InstanceCreationOptions = {}
  ): NodeId | null {
    const component = this.sceneGraph.getNode(componentId);
    if (!component || component.type !== 'COMPONENT') return null;

    // Create instance node
    const instanceId = this.sceneGraph.createNode('INSTANCE', parentId, options.position ?? -1, {
      name: `${component.name} Instance`,
      componentId,
      overrides: options.overrides ?? [],
      exposedInstances: [],
    } as Parameters<typeof this.sceneGraph.createNode>[3]);

    // Register in registry
    this.registry.registerInstance(instanceId, componentId);

    this.emit('instance:created', { instanceId, componentId });

    return instanceId;
  }

  /**
   * Delete an instance.
   */
  deleteInstance(instanceId: NodeId): void {
    const instance = this.sceneGraph.getNode(instanceId);
    if (!instance || instance.type !== 'INSTANCE') return;

    this.registry.unregisterInstance(instanceId);
    this.sceneGraph.deleteNode(instanceId);

    this.emit('instance:deleted', { instanceId });
  }

  /**
   * Detach an instance from its component.
   * Converts the instance into regular nodes with the current appearance.
   */
  detachInstance(instanceId: NodeId): NodeId | null {
    const instance = this.sceneGraph.getNode(instanceId) as InstanceNodeData;
    if (!instance || instance.type !== 'INSTANCE') return null;

    const componentId = instance.componentId;
    const component = this.sceneGraph.getNode(componentId) as ComponentNodeData;
    if (!component) return null;

    // Get resolved data
    const resolvedData = this.getResolvedInstanceData(instanceId);
    if (!resolvedData) return null;

    const parentId = instance.parentId;
    if (!parentId) return null;

    // Create a frame to replace the instance
    const position = this.sceneGraph.getChildIds(parentId).indexOf(instanceId);
    const frameId = this.sceneGraph.createNode('FRAME', parentId, position, {
      name: instance.name.replace(' Instance', ''),
      ...this.extractNodeProperties(resolvedData),
    });

    // Clone component children into the frame
    this.cloneChildren(componentId, frameId, instance.overrides);

    // Unregister and delete instance
    this.registry.unregisterInstance(instanceId);
    this.sceneGraph.deleteNode(instanceId);

    return frameId;
  }

  /**
   * Reset an instance to match its component.
   */
  resetInstance(instanceId: NodeId): void {
    const instance = this.sceneGraph.getNode(instanceId) as InstanceNodeData;
    if (!instance || instance.type !== 'INSTANCE') return;

    this.sceneGraph.updateNode(instanceId, {
      overrides: [],
    });

    this.emit('instance:overrideChanged', { instanceId, path: [] });
  }

  // =========================================================================
  // Overrides
  // =========================================================================

  /**
   * Set an override on an instance.
   */
  setOverride(
    instanceId: NodeId,
    path: readonly string[],
    value: unknown
  ): void {
    const instance = this.sceneGraph.getNode(instanceId) as InstanceNodeData;
    if (!instance || instance.type !== 'INSTANCE') return;

    const newOverrides = this.resolver.setOverride(instance.overrides, path, value);
    this.sceneGraph.updateNode(instanceId, { overrides: newOverrides });

    this.emit('instance:overrideChanged', { instanceId, path });
  }

  /**
   * Reset an override on an instance.
   */
  resetOverride(
    instanceId: NodeId,
    path: readonly string[]
  ): void {
    const instance = this.sceneGraph.getNode(instanceId) as InstanceNodeData;
    if (!instance || instance.type !== 'INSTANCE') return;

    const newOverrides = this.resolver.removeOverride(instance.overrides, path);
    this.sceneGraph.updateNode(instanceId, { overrides: newOverrides });

    this.emit('instance:overrideChanged', { instanceId, path });
  }

  /**
   * Check if a property is overridden on an instance.
   */
  isPropertyOverridden(
    instanceId: NodeId,
    path: readonly string[]
  ): boolean {
    const instance = this.sceneGraph.getNode(instanceId) as InstanceNodeData;
    if (!instance || instance.type !== 'INSTANCE') return false;

    return this.resolver.isOverridden(path, instance.overrides);
  }

  /**
   * Get the resolved data for an instance (component + overrides).
   */
  getResolvedInstanceData(instanceId: NodeId): NodeData | null {
    const instance = this.sceneGraph.getNode(instanceId) as InstanceNodeData;
    if (!instance || instance.type !== 'INSTANCE') return null;

    const component = this.sceneGraph.getNode(instance.componentId);
    if (!component) return null;

    return this.resolver.applyOverrides(component, instance.overrides);
  }

  /**
   * Get effective property value for an instance.
   */
  getEffectiveValue(
    instanceId: NodeId,
    path: readonly string[]
  ): unknown {
    const instance = this.sceneGraph.getNode(instanceId) as InstanceNodeData;
    if (!instance || instance.type !== 'INSTANCE') return undefined;

    const component = this.sceneGraph.getNode(instance.componentId);
    if (!component) return undefined;

    return this.resolver.getEffectiveValue(component, path, instance.overrides);
  }

  // =========================================================================
  // Component Sets (Variants)
  // =========================================================================

  /**
   * Create a component set from multiple components.
   */
  createComponentSet(
    name: string,
    variantProperties: VariantPropertyDef[],
    componentIds?: NodeId[]
  ): string {
    const setId = `component-set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.registry.createComponentSet(setId, name, variantProperties);

    // Add existing components if provided
    if (componentIds) {
      for (const componentId of componentIds) {
        const component = this.sceneGraph.getNode(componentId) as ComponentNodeData;
        if (component?.type === 'COMPONENT') {
          // Parse variant key from component name or properties
          const variantKey = this.parseVariantKey(component, variantProperties);
          if (variantKey) {
            this.registry.addToComponentSet(setId, variantKey, componentId);
          }
        }
      }
    }

    this.emit('componentSet:created', { setId, name });

    return setId;
  }

  /**
   * Delete a component set.
   */
  deleteComponentSet(setId: string): void {
    this.registry.deleteComponentSet(setId);
    this.emit('componentSet:deleted', { setId });
  }

  /**
   * Get component for a specific variant.
   */
  getVariantComponent(setId: string, variantKey: string): NodeId | null {
    return this.registry.getVariantComponent(setId, variantKey);
  }

  /**
   * Switch an instance to a different variant.
   */
  switchInstanceVariant(
    instanceId: NodeId,
    newVariantKey: string
  ): boolean {
    const instance = this.sceneGraph.getNode(instanceId) as InstanceNodeData;
    if (!instance || instance.type !== 'INSTANCE') return false;

    const currentComponent = this.registry.getComponent(instance.componentId);
    if (!currentComponent?.componentSetId) return false;

    const newComponentId = this.registry.getVariantComponent(
      currentComponent.componentSetId,
      newVariantKey
    );
    if (!newComponentId) return false;

    // Update instance to use new component
    this.sceneGraph.updateNode(instanceId, {
      componentId: newComponentId,
      // Keep compatible overrides, remove incompatible ones
      overrides: this.filterCompatibleOverrides(instance.overrides, newComponentId),
    });

    // Update registry
    this.registry.unregisterInstance(instanceId);
    this.registry.registerInstance(instanceId, newComponentId);

    return true;
  }

  // =========================================================================
  // Queries
  // =========================================================================

  /**
   * Get component entry by ID.
   */
  getComponent(componentId: NodeId): ComponentEntry | null {
    return this.registry.getComponent(componentId);
  }

  /**
   * Get all components.
   */
  getAllComponents(): ComponentEntry[] {
    return this.registry.getAllComponents();
  }

  /**
   * Get all instances of a component.
   */
  getInstances(componentId: NodeId): NodeId[] {
    return this.registry.getInstancesForComponent(componentId);
  }

  /**
   * Get instance count for a component.
   */
  getInstanceCount(componentId: NodeId): number {
    return this.registry.getInstanceCount(componentId);
  }

  /**
   * Get component set.
   */
  getComponentSet(setId: string): ComponentSet | null {
    return this.registry.getComponentSet(setId);
  }

  /**
   * Get all component sets.
   */
  getAllComponentSets(): ComponentSet[] {
    return this.registry.getAllComponentSets();
  }

  /**
   * Check if a node is a component.
   */
  isComponent(nodeId: NodeId): boolean {
    const node = this.sceneGraph.getNode(nodeId);
    return node?.type === 'COMPONENT';
  }

  /**
   * Check if a node is an instance.
   */
  isInstance(nodeId: NodeId): boolean {
    const node = this.sceneGraph.getNode(nodeId);
    return node?.type === 'INSTANCE';
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * Extract common node properties (excluding structural ones).
   */
  private extractNodeProperties(node: NodeData): Partial<NodeData> {
    const { id, type, parentId, childIds, ...rest } = node as NodeData & {
      id: NodeId;
      parentId: NodeId | null;
      childIds: readonly NodeId[];
    };
    return rest;
  }

  /**
   * Clone children from source to destination, applying overrides.
   */
  private cloneChildren(
    sourceId: NodeId,
    destId: NodeId,
    overrides: readonly PropertyOverride[]
  ): void {
    const children = this.sceneGraph.getChildIds(sourceId);

    for (let i = 0; i < children.length; i++) {
      const childId = children[i]!;
      const child = this.sceneGraph.getNode(childId);
      if (!child) continue;

      // Get overrides for this child
      const childOverrides = this.resolver.getOverridesForNode([childId], overrides);

      // Apply overrides to child data
      const resolvedChild = this.resolver.applyOverrides(child, childOverrides);

      // Create cloned node
      const clonedId = this.sceneGraph.createNode(
        child.type as NodeType,
        destId,
        i,
        this.extractNodeProperties(resolvedChild)
      );

      // Recursively clone children
      this.cloneChildren(childId, clonedId, childOverrides);
    }
  }

  /**
   * Parse variant key from component properties.
   */
  private parseVariantKey(
    component: ComponentNodeData,
    properties: readonly VariantPropertyDef[]
  ): string | null {
    // Try to extract variant values from component name
    // Format: "ComponentName, Property1=Value1, Property2=Value2"
    const parts: string[] = [];

    for (const prop of properties) {
      // Look in property definitions first
      const propDef = component.propertyDefinitions[prop.name];
      if (propDef?.type === 'VARIANT' && propDef.defaultValue) {
        parts.push(`${prop.name}=${propDef.defaultValue}`);
      }
    }

    return parts.length > 0 ? parts.join(',') : null;
  }

  /**
   * Filter overrides to only those compatible with a component.
   */
  private filterCompatibleOverrides(
    overrides: readonly PropertyOverride[],
    componentId: NodeId
  ): PropertyOverride[] {
    const component = this.sceneGraph.getNode(componentId);
    if (!component) return [];

    // For now, keep all overrides. A more sophisticated implementation
    // would check if paths are valid in the new component.
    return [...overrides];
  }

  /**
   * Clear all component data.
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * Export component data.
   */
  toJSON(): Record<string, unknown> {
    return this.registry.toJSON();
  }

  /**
   * Import component data.
   */
  fromJSON(data: Record<string, unknown>): void {
    this.registry.fromJSON(data);
  }
}

/**
 * Create a component manager.
 */
export function createComponentManager(sceneGraph: SceneGraph): ComponentManager {
  return new ComponentManager(sceneGraph);
}
