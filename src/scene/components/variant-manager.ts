/**
 * Variant Manager
 *
 * Manages component variants and variant properties.
 * Handles variant switching, property combination, and variant key generation.
 */

import type { NodeId } from '@core/types/common';
import type { ComponentNodeData } from '../nodes/base-node';
import type { SceneGraph } from '../graph/scene-graph';
import type { ComponentRegistry, ComponentSet, VariantPropertyDef } from './component-registry';

/**
 * Variant property value pair
 */
export interface VariantValue {
  readonly property: string;
  readonly value: string;
}

/**
 * Parsed variant key
 */
export interface ParsedVariantKey {
  readonly values: ReadonlyMap<string, string>;
  readonly raw: string;
}

/**
 * Variant manager for handling component variants
 */
export class VariantManager {
  private sceneGraph: SceneGraph;
  private registry: ComponentRegistry;

  constructor(sceneGraph: SceneGraph, registry: ComponentRegistry) {
    this.sceneGraph = sceneGraph;
    this.registry = registry;
  }

  // =========================================================================
  // Variant Key Operations
  // =========================================================================

  /**
   * Create a variant key from property values.
   */
  createVariantKey(values: readonly VariantValue[]): string {
    // Sort by property name for consistent keys
    const sorted = [...values].sort((a, b) => a.property.localeCompare(b.property));
    return sorted.map(v => `${v.property}=${v.value}`).join(',');
  }

  /**
   * Parse a variant key into property values.
   */
  parseVariantKey(key: string): ParsedVariantKey {
    const values = new Map<string, string>();

    if (key) {
      const pairs = key.split(',');
      for (const pair of pairs) {
        const [prop, val] = pair.split('=');
        if (prop && val) {
          values.set(prop.trim(), val.trim());
        }
      }
    }

    return { values, raw: key };
  }

  /**
   * Get all possible variant keys for a component set.
   */
  getAllVariantKeys(setId: string): string[] {
    const set = this.registry.getComponentSet(setId);
    if (!set) return [];

    // Generate all combinations
    return this.generateVariantCombinations(set.variantProperties);
  }

  /**
   * Generate all combinations of variant property values.
   */
  generateVariantCombinations(properties: readonly VariantPropertyDef[]): string[] {
    if (properties.length === 0) return [''];

    const combinations: string[] = [];

    const generate = (index: number, current: VariantValue[]): void => {
      if (index === properties.length) {
        combinations.push(this.createVariantKey(current));
        return;
      }

      const prop = properties[index]!;
      for (const value of prop.values) {
        generate(index + 1, [...current, { property: prop.name, value }]);
      }
    };

    generate(0, []);
    return combinations;
  }

  /**
   * Check if a variant key is valid for a component set.
   */
  isValidVariantKey(setId: string, key: string): boolean {
    const set = this.registry.getComponentSet(setId);
    if (!set) return false;

    const parsed = this.parseVariantKey(key);

    // Check that all required properties are present
    for (const prop of set.variantProperties) {
      const value = parsed.values.get(prop.name);
      if (!value || !prop.values.includes(value)) {
        return false;
      }
    }

    return true;
  }

  // =========================================================================
  // Variant Operations
  // =========================================================================

  /**
   * Get the variant key for a component.
   */
  getComponentVariantKey(componentId: NodeId): string | null {
    const entry = this.registry.getComponent(componentId);
    return entry?.variantKey ?? null;
  }

  /**
   * Get the component set for a component.
   */
  getComponentSet(componentId: NodeId): ComponentSet | null {
    const entry = this.registry.getComponent(componentId);
    if (!entry?.componentSetId) return null;
    return this.registry.getComponentSet(entry.componentSetId);
  }

  /**
   * Get variant property values for a component.
   */
  getVariantValues(componentId: NodeId): VariantValue[] {
    const key = this.getComponentVariantKey(componentId);
    if (!key) return [];

    const parsed = this.parseVariantKey(key);
    return Array.from(parsed.values.entries()).map(([property, value]) => ({
      property,
      value,
    }));
  }

  /**
   * Find sibling variant with different property value.
   */
  findSiblingVariant(
    componentId: NodeId,
    property: string,
    newValue: string
  ): NodeId | null {
    const entry = this.registry.getComponent(componentId);
    if (!entry?.componentSetId || !entry.variantKey) return null;

    const set = this.registry.getComponentSet(entry.componentSetId);
    if (!set) return null;

    // Parse current key and modify
    const parsed = this.parseVariantKey(entry.variantKey);
    const newValues = new Map(parsed.values);
    newValues.set(property, newValue);

    // Generate new key
    const newKey = this.createVariantKey(
      Array.from(newValues.entries()).map(([p, v]) => ({ property: p, value: v }))
    );

    return this.registry.getVariantComponent(entry.componentSetId, newKey);
  }

  /**
   * Get all variants in a component set.
   */
  getSetVariants(setId: string): Array<{ key: string; componentId: NodeId }> {
    const set = this.registry.getComponentSet(setId);
    if (!set) return [];

    return Array.from(set.variants.entries()).map(([key, componentId]) => ({
      key,
      componentId,
    }));
  }

  /**
   * Get variants grouped by property value.
   */
  getVariantsByProperty(
    setId: string,
    property: string
  ): Map<string, NodeId[]> {
    const set = this.registry.getComponentSet(setId);
    if (!set) return new Map();

    const grouped = new Map<string, NodeId[]>();

    for (const [key, componentId] of set.variants.entries()) {
      const parsed = this.parseVariantKey(key);
      const value = parsed.values.get(property);

      if (value) {
        const group = grouped.get(value) ?? [];
        group.push(componentId);
        grouped.set(value, group);
      }
    }

    return grouped;
  }

  // =========================================================================
  // Variant Property Management
  // =========================================================================

  /**
   * Add a variant property to a component set.
   */
  addVariantProperty(
    setId: string,
    property: VariantPropertyDef
  ): void {
    const set = this.registry.getComponentSet(setId);
    if (!set) return;

    // Update set with new property
    const newProperties = [...set.variantProperties, property];

    // This would require recreating the set
    // In a real implementation, you'd update existing variants or duplicate them
    this.registry.createComponentSet(setId, set.name, newProperties);
  }

  /**
   * Remove a variant property from a component set.
   */
  removeVariantProperty(
    setId: string,
    propertyName: string
  ): void {
    const set = this.registry.getComponentSet(setId);
    if (!set) return;

    const newProperties = set.variantProperties.filter(p => p.name !== propertyName);

    // This would require recreating the set and consolidating variants
    this.registry.createComponentSet(setId, set.name, newProperties);
  }

  /**
   * Add a value to a variant property.
   */
  addPropertyValue(
    setId: string,
    propertyName: string,
    value: string
  ): void {
    const set = this.registry.getComponentSet(setId);
    if (!set) return;

    const newProperties = set.variantProperties.map(p => {
      if (p.name === propertyName && !p.values.includes(value)) {
        return {
          ...p,
          values: [...p.values, value],
        };
      }
      return p;
    });

    this.registry.createComponentSet(setId, set.name, newProperties);
  }

  /**
   * Remove a value from a variant property.
   */
  removePropertyValue(
    setId: string,
    propertyName: string,
    value: string
  ): void {
    const set = this.registry.getComponentSet(setId);
    if (!set) return;

    const newProperties = set.variantProperties.map(p => {
      if (p.name === propertyName) {
        return {
          ...p,
          values: p.values.filter(v => v !== value),
        };
      }
      return p;
    });

    this.registry.createComponentSet(setId, set.name, newProperties);

    // Remove variants using this value
    for (const [key] of set.variants.entries()) {
      const parsed = this.parseVariantKey(key);
      if (parsed.values.get(propertyName) === value) {
        this.registry.removeFromComponentSet(setId, key);
      }
    }
  }

  /**
   * Rename a variant property.
   */
  renameProperty(
    setId: string,
    oldName: string,
    newName: string
  ): void {
    const set = this.registry.getComponentSet(setId);
    if (!set) return;

    const newProperties = set.variantProperties.map(p => {
      if (p.name === oldName) {
        return { ...p, name: newName };
      }
      return p;
    });

    // Update all variant keys
    const newVariants = new Map<string, NodeId>();
    for (const [key, componentId] of set.variants.entries()) {
      const parsed = this.parseVariantKey(key);
      const newValues = new Map<string, string>();

      for (const [prop, val] of parsed.values.entries()) {
        const newProp = prop === oldName ? newName : prop;
        newValues.set(newProp, val);
      }

      const newKey = this.createVariantKey(
        Array.from(newValues.entries()).map(([p, v]) => ({ property: p, value: v }))
      );
      newVariants.set(newKey, componentId);
    }

    // Recreate set with updated data
    this.registry.createComponentSet(setId, set.name, newProperties);
    for (const [key, componentId] of newVariants.entries()) {
      this.registry.addToComponentSet(setId, key, componentId);
    }
  }

  // =========================================================================
  // Variant Creation
  // =========================================================================

  /**
   * Create a variant by duplicating a component with a new variant key.
   */
  createVariantFromComponent(
    sourceComponentId: NodeId,
    targetKey: string
  ): NodeId | null {
    const entry = this.registry.getComponent(sourceComponentId);
    if (!entry?.componentSetId) return null;

    const source = this.sceneGraph.getNode(sourceComponentId) as ComponentNodeData;
    if (!source || source.type !== 'COMPONENT') return null;

    // Check if target key already exists
    const existing = this.registry.getVariantComponent(entry.componentSetId, targetKey);
    if (existing) return null;

    // Create new component
    const parentId = source.parentId;
    if (!parentId) return null;

    const newComponentId = this.sceneGraph.createNode('COMPONENT', parentId, -1, {
      ...this.extractComponentProperties(source),
      name: this.generateVariantName(source.name, targetKey),
    });

    // Clone children
    this.cloneComponentChildren(sourceComponentId, newComponentId);

    // Register in set
    this.registry.registerComponent(
      newComponentId,
      source.name,
      entry.componentSetId,
      targetKey
    );
    this.registry.addToComponentSet(entry.componentSetId, targetKey, newComponentId);

    return newComponentId;
  }

  /**
   * Generate a variant name from base name and key.
   */
  private generateVariantName(baseName: string, key: string): string {
    const parsed = this.parseVariantKey(key);
    const suffix = Array.from(parsed.values.values()).join(', ');
    return `${baseName}, ${suffix}`;
  }

  /**
   * Extract properties for cloning.
   */
  private extractComponentProperties(component: ComponentNodeData): Partial<ComponentNodeData> {
    const { id, type, parentId, childIds, ...rest } = component as ComponentNodeData & {
      parentId: NodeId | null;
      childIds: readonly NodeId[];
    };
    return rest;
  }

  /**
   * Clone children from source component to destination.
   */
  private cloneComponentChildren(sourceId: NodeId, destId: NodeId): void {
    const children = this.sceneGraph.getChildIds(sourceId);

    for (let i = 0; i < children.length; i++) {
      const childId = children[i]!;
      const child = this.sceneGraph.getNode(childId);
      if (!child) continue;

      const { id, parentId, childIds, ...props } = child as typeof child & {
        parentId: NodeId | null;
        childIds: readonly NodeId[];
      };

      const clonedId = this.sceneGraph.createNode(
        child.type,
        destId,
        i,
        props
      );

      // Recursively clone
      this.cloneComponentChildren(childId, clonedId);
    }
  }
}

/**
 * Create a variant manager.
 */
export function createVariantManager(
  sceneGraph: SceneGraph,
  registry: ComponentRegistry
): VariantManager {
  return new VariantManager(sceneGraph, registry);
}
