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
export class ComponentRegistry {
  private components: Map<NodeId, ComponentEntry> = new Map();
  private componentSets: Map<string, ComponentSet> = new Map();
  private instanceToComponent: Map<NodeId, NodeId> = new Map();
  private componentToInstances: Map<NodeId, Set<NodeId>> = new Map();

  /**
   * Register a new component.
   */
  registerComponent(id: NodeId, name: string, componentSetId: string | null = null, variantKey: string | null = null): void {
    const now = Date.now();
    this.components.set(id, {
      id,
      name,
      createdAt: now,
      modifiedAt: now,
      componentSetId,
      variantKey,
    });

    // Initialize instance tracking
    if (!this.componentToInstances.has(id)) {
      this.componentToInstances.set(id, new Set());
    }
  }

  /**
   * Unregister a component.
   */
  unregisterComponent(id: NodeId): void {
    const entry = this.components.get(id);
    if (!entry) return;

    // Remove from component set if applicable
    if (entry.componentSetId && entry.variantKey) {
      this.removeFromComponentSet(entry.componentSetId, entry.variantKey);
    }

    this.components.delete(id);
    this.componentToInstances.delete(id);
  }

  /**
   * Get a component entry by ID.
   */
  getComponent(id: NodeId): ComponentEntry | null {
    return this.components.get(id) ?? null;
  }

  /**
   * Check if a component exists.
   */
  hasComponent(id: NodeId): boolean {
    return this.components.has(id);
  }

  /**
   * Get all component IDs.
   */
  getAllComponentIds(): NodeId[] {
    return Array.from(this.components.keys());
  }

  /**
   * Get all components.
   */
  getAllComponents(): ComponentEntry[] {
    return Array.from(this.components.values());
  }

  /**
   * Update component name.
   */
  updateComponentName(id: NodeId, name: string): void {
    const entry = this.components.get(id);
    if (!entry) return;

    this.components.set(id, {
      ...entry,
      name,
      modifiedAt: Date.now(),
    });
  }

  /**
   * Mark component as modified.
   */
  markComponentModified(id: NodeId): void {
    const entry = this.components.get(id);
    if (!entry) return;

    this.components.set(id, {
      ...entry,
      modifiedAt: Date.now(),
    });
  }

  /**
   * Register an instance referencing a component.
   */
  registerInstance(instanceId: NodeId, componentId: NodeId): void {
    this.instanceToComponent.set(instanceId, componentId);

    let instances = this.componentToInstances.get(componentId);
    if (!instances) {
      instances = new Set();
      this.componentToInstances.set(componentId, instances);
    }
    instances.add(instanceId);
  }

  /**
   * Unregister an instance.
   */
  unregisterInstance(instanceId: NodeId): void {
    const componentId = this.instanceToComponent.get(instanceId);
    if (componentId) {
      const instances = this.componentToInstances.get(componentId);
      instances?.delete(instanceId);
    }
    this.instanceToComponent.delete(instanceId);
  }

  /**
   * Get the component ID for an instance.
   */
  getComponentForInstance(instanceId: NodeId): NodeId | null {
    return this.instanceToComponent.get(instanceId) ?? null;
  }

  /**
   * Get all instance IDs for a component.
   */
  getInstancesForComponent(componentId: NodeId): NodeId[] {
    const instances = this.componentToInstances.get(componentId);
    return instances ? Array.from(instances) : [];
  }

  /**
   * Get instance count for a component.
   */
  getInstanceCount(componentId: NodeId): number {
    return this.componentToInstances.get(componentId)?.size ?? 0;
  }

  // =========================================================================
  // Component Sets (Variants)
  // =========================================================================

  /**
   * Create a new component set.
   */
  createComponentSet(id: string, name: string, variantProperties: VariantPropertyDef[]): void {
    this.componentSets.set(id, {
      id,
      name,
      variantProperties,
      variants: new Map(),
    });
  }

  /**
   * Get a component set.
   */
  getComponentSet(id: string): ComponentSet | null {
    return this.componentSets.get(id) ?? null;
  }

  /**
   * Add a component to a component set.
   */
  addToComponentSet(setId: string, variantKey: string, componentId: NodeId): void {
    const set = this.componentSets.get(setId);
    if (!set) return;

    const variants = new Map(set.variants);
    variants.set(variantKey, componentId);

    this.componentSets.set(setId, {
      ...set,
      variants,
    });

    // Update component entry
    const entry = this.components.get(componentId);
    if (entry) {
      this.components.set(componentId, {
        ...entry,
        componentSetId: setId,
        variantKey,
        modifiedAt: Date.now(),
      });
    }
  }

  /**
   * Remove a component from a component set.
   */
  removeFromComponentSet(setId: string, variantKey: string): void {
    const set = this.componentSets.get(setId);
    if (!set) return;

    const variants = new Map(set.variants);
    const componentId = variants.get(variantKey);
    variants.delete(variantKey);

    this.componentSets.set(setId, {
      ...set,
      variants,
    });

    // Update component entry
    if (componentId) {
      const entry = this.components.get(componentId);
      if (entry) {
        this.components.set(componentId, {
          ...entry,
          componentSetId: null,
          variantKey: null,
          modifiedAt: Date.now(),
        });
      }
    }
  }

  /**
   * Get component ID for a variant key in a set.
   */
  getVariantComponent(setId: string, variantKey: string): NodeId | null {
    const set = this.componentSets.get(setId);
    return set?.variants.get(variantKey) ?? null;
  }

  /**
   * Delete a component set.
   */
  deleteComponentSet(id: string): void {
    const set = this.componentSets.get(id);
    if (!set) return;

    // Update all components in the set
    for (const componentId of set.variants.values()) {
      const entry = this.components.get(componentId);
      if (entry) {
        this.components.set(componentId, {
          ...entry,
          componentSetId: null,
          variantKey: null,
          modifiedAt: Date.now(),
        });
      }
    }

    this.componentSets.delete(id);
  }

  /**
   * Get all component sets.
   */
  getAllComponentSets(): ComponentSet[] {
    return Array.from(this.componentSets.values());
  }

  /**
   * Clear all registry data.
   */
  clear(): void {
    this.components.clear();
    this.componentSets.clear();
    this.instanceToComponent.clear();
    this.componentToInstances.clear();
  }

  /**
   * Export registry data as JSON.
   */
  toJSON(): Record<string, unknown> {
    return {
      components: Array.from(this.components.entries()),
      componentSets: Array.from(this.componentSets.entries()).map(([id, set]) => [
        id,
        {
          ...set,
          variants: Array.from(set.variants.entries()),
        },
      ]),
      instances: Array.from(this.instanceToComponent.entries()),
    };
  }

  /**
   * Import registry data from JSON.
   */
  fromJSON(data: Record<string, unknown>): void {
    this.clear();

    const components = data['components'] as [NodeId, ComponentEntry][];
    for (const [id, entry] of components) {
      this.components.set(id, entry);
      this.componentToInstances.set(id, new Set());
    }

    const componentSets = data['componentSets'] as [string, { id: string; name: string; variantProperties: VariantPropertyDef[]; variants: [string, NodeId][] }][];
    for (const [id, setData] of componentSets) {
      this.componentSets.set(id, {
        ...setData,
        variants: new Map(setData.variants),
      });
    }

    const instances = data['instances'] as [NodeId, NodeId][];
    for (const [instanceId, componentId] of instances) {
      this.registerInstance(instanceId, componentId);
    }
  }
}

/**
 * Create a new component registry.
 */
export function createComponentRegistry(): ComponentRegistry {
  return new ComponentRegistry();
}
