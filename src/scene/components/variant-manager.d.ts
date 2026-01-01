/**
 * Variant Manager
 *
 * Manages component variants and variant properties.
 * Handles variant switching, property combination, and variant key generation.
 */
import type { NodeId } from '@core/types/common';
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
export declare class VariantManager {
    private sceneGraph;
    private registry;
    constructor(sceneGraph: SceneGraph, registry: ComponentRegistry);
    /**
     * Create a variant key from property values.
     */
    createVariantKey(values: readonly VariantValue[]): string;
    /**
     * Parse a variant key into property values.
     */
    parseVariantKey(key: string): ParsedVariantKey;
    /**
     * Get all possible variant keys for a component set.
     */
    getAllVariantKeys(setId: string): string[];
    /**
     * Generate all combinations of variant property values.
     */
    generateVariantCombinations(properties: readonly VariantPropertyDef[]): string[];
    /**
     * Check if a variant key is valid for a component set.
     */
    isValidVariantKey(setId: string, key: string): boolean;
    /**
     * Get the variant key for a component.
     */
    getComponentVariantKey(componentId: NodeId): string | null;
    /**
     * Get the component set for a component.
     */
    getComponentSet(componentId: NodeId): ComponentSet | null;
    /**
     * Get variant property values for a component.
     */
    getVariantValues(componentId: NodeId): VariantValue[];
    /**
     * Find sibling variant with different property value.
     */
    findSiblingVariant(componentId: NodeId, property: string, newValue: string): NodeId | null;
    /**
     * Get all variants in a component set.
     */
    getSetVariants(setId: string): Array<{
        key: string;
        componentId: NodeId;
    }>;
    /**
     * Get variants grouped by property value.
     */
    getVariantsByProperty(setId: string, property: string): Map<string, NodeId[]>;
    /**
     * Add a variant property to a component set.
     */
    addVariantProperty(setId: string, property: VariantPropertyDef): void;
    /**
     * Remove a variant property from a component set.
     */
    removeVariantProperty(setId: string, propertyName: string): void;
    /**
     * Add a value to a variant property.
     */
    addPropertyValue(setId: string, propertyName: string, value: string): void;
    /**
     * Remove a value from a variant property.
     */
    removePropertyValue(setId: string, propertyName: string, value: string): void;
    /**
     * Rename a variant property.
     */
    renameProperty(setId: string, oldName: string, newName: string): void;
    /**
     * Create a variant by duplicating a component with a new variant key.
     */
    createVariantFromComponent(sourceComponentId: NodeId, targetKey: string): NodeId | null;
    /**
     * Generate a variant name from base name and key.
     */
    private generateVariantName;
    /**
     * Extract properties for cloning.
     */
    private extractComponentProperties;
    /**
     * Clone children from source component to destination.
     */
    private cloneComponentChildren;
}
/**
 * Create a variant manager.
 */
export declare function createVariantManager(sceneGraph: SceneGraph, registry: ComponentRegistry): VariantManager;
//# sourceMappingURL=variant-manager.d.ts.map