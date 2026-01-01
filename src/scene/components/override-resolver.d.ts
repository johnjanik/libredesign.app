/**
 * Override Resolver
 *
 * Resolves property overrides for component instances.
 * Handles nested paths, deep merging, and override precedence.
 */
import type { NodeId } from '@core/types/common';
import type { NodeData, PropertyOverride } from '../nodes/base-node';
/**
 * Resolved override result
 */
export interface ResolvedOverride {
    /** Full path to the overridden property */
    readonly path: readonly string[];
    /** The override value */
    readonly value: unknown;
    /** Source of the override (which instance) */
    readonly sourceInstanceId: NodeId;
}
/**
 * Override context for resolution
 */
export interface OverrideContext {
    /** Instance ID being resolved */
    readonly instanceId: NodeId;
    /** Component ID being referenced */
    readonly componentId: NodeId;
    /** Overrides from the instance */
    readonly overrides: readonly PropertyOverride[];
    /** Parent override context (for nested instances) */
    readonly parent: OverrideContext | null;
}
/**
 * Override path utilities
 */
export declare const OverridePath: {
    /**
     * Create a path string from path segments.
     */
    toString(path: readonly string[]): string;
    /**
     * Parse a path string into segments.
     */
    fromString(pathString: string): string[];
    /**
     * Check if a path starts with a prefix.
     */
    startsWith(path: readonly string[], prefix: readonly string[]): boolean;
    /**
     * Get a subpath after a prefix.
     */
    stripPrefix(path: readonly string[], prefix: readonly string[]): string[];
    /**
     * Append to a path.
     */
    append(path: readonly string[], ...segments: string[]): string[];
    /**
     * Check if paths are equal.
     */
    equals(a: readonly string[], b: readonly string[]): boolean;
};
/**
 * Override resolver for component instances
 */
export declare class OverrideResolver {
    /**
     * Apply overrides to component data.
     * Returns a new object with overrides applied.
     */
    applyOverrides<T extends NodeData>(componentData: T, overrides: readonly PropertyOverride[]): T;
    /**
     * Apply overrides from a chain of nested instances.
     * Handles parent → child override inheritance.
     */
    applyOverrideChain<T extends NodeData>(componentData: T, contexts: readonly OverrideContext[]): T;
    /**
     * Get the effective value of a property considering overrides.
     */
    getEffectiveValue(componentData: NodeData, path: readonly string[], overrides: readonly PropertyOverride[]): unknown;
    /**
     * Check if a property is overridden.
     */
    isOverridden(path: readonly string[], overrides: readonly PropertyOverride[]): boolean;
    /**
     * Get all overrides for a specific node in the component tree.
     * Filters overrides by the node path prefix.
     */
    getOverridesForNode(nodePath: readonly string[], overrides: readonly PropertyOverride[]): PropertyOverride[];
    /**
     * Create an override for a property.
     */
    createOverride(path: readonly string[], value: unknown): PropertyOverride;
    /**
     * Merge override sets, with later overrides taking precedence.
     */
    mergeOverrides(...overrideSets: readonly (readonly PropertyOverride[])[]): PropertyOverride[];
    /**
     * Remove an override by path.
     */
    removeOverride(overrides: readonly PropertyOverride[], path: readonly string[]): PropertyOverride[];
    /**
     * Get or update an override value.
     */
    setOverride(overrides: readonly PropertyOverride[], path: readonly string[], value: unknown): PropertyOverride[];
    /**
     * Compute diff between base and modified data.
     * Returns overrides that would transform base into modified.
     */
    computeOverrides(base: NodeData, modified: NodeData, currentPath?: string[]): PropertyOverride[];
    /**
     * Get value at a path in an object.
     */
    private getValueAtPath;
    /**
     * Set value at a path in an object (mutates).
     */
    private setValueAtPath;
    /**
     * Deep clone an object.
     */
    private deepClone;
    /**
     * Deep equality check.
     */
    private deepEquals;
}
/**
 * Create an override resolver.
 */
export declare function createOverrideResolver(): OverrideResolver;
//# sourceMappingURL=override-resolver.d.ts.map