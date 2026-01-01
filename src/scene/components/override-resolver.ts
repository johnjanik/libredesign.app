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
export const OverridePath = {
  /**
   * Create a path string from path segments.
   */
  toString(path: readonly string[]): string {
    return path.join('.');
  },

  /**
   * Parse a path string into segments.
   */
  fromString(pathString: string): string[] {
    return pathString.split('.');
  },

  /**
   * Check if a path starts with a prefix.
   */
  startsWith(path: readonly string[], prefix: readonly string[]): boolean {
    if (path.length < prefix.length) return false;
    for (let i = 0; i < prefix.length; i++) {
      if (path[i] !== prefix[i]) return false;
    }
    return true;
  },

  /**
   * Get a subpath after a prefix.
   */
  stripPrefix(path: readonly string[], prefix: readonly string[]): string[] {
    if (!OverridePath.startsWith(path, prefix)) {
      return [...path];
    }
    return path.slice(prefix.length);
  },

  /**
   * Append to a path.
   */
  append(path: readonly string[], ...segments: string[]): string[] {
    return [...path, ...segments];
  },

  /**
   * Check if paths are equal.
   */
  equals(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  },
};

/**
 * Override resolver for component instances
 */
export class OverrideResolver {
  /**
   * Apply overrides to component data.
   * Returns a new object with overrides applied.
   */
  applyOverrides<T extends NodeData>(
    componentData: T,
    overrides: readonly PropertyOverride[]
  ): T {
    if (overrides.length === 0) {
      return componentData;
    }

    // Create a deep copy to mutate
    const result = this.deepClone(componentData) as T;

    // Apply each override
    for (const override of overrides) {
      this.setValueAtPath(result, override.path, override.value);
    }

    return result;
  }

  /**
   * Apply overrides from a chain of nested instances.
   * Handles parent → child override inheritance.
   */
  applyOverrideChain<T extends NodeData>(
    componentData: T,
    contexts: readonly OverrideContext[]
  ): T {
    let result = componentData;

    // Apply overrides in order (parent to child)
    for (const ctx of contexts) {
      result = this.applyOverrides(result, ctx.overrides);
    }

    return result;
  }

  /**
   * Get the effective value of a property considering overrides.
   */
  getEffectiveValue(
    componentData: NodeData,
    path: readonly string[],
    overrides: readonly PropertyOverride[]
  ): unknown {
    // Check for direct override
    for (const override of overrides) {
      if (OverridePath.equals(override.path, path)) {
        return override.value;
      }
    }

    // Return original value
    return this.getValueAtPath(componentData, path);
  }

  /**
   * Check if a property is overridden.
   */
  isOverridden(
    path: readonly string[],
    overrides: readonly PropertyOverride[]
  ): boolean {
    return overrides.some(o => OverridePath.equals(o.path, path));
  }

  /**
   * Get all overrides for a specific node in the component tree.
   * Filters overrides by the node path prefix.
   */
  getOverridesForNode(
    nodePath: readonly string[],
    overrides: readonly PropertyOverride[]
  ): PropertyOverride[] {
    return overrides
      .filter(o => OverridePath.startsWith(o.path, nodePath))
      .map(o => ({
        path: OverridePath.stripPrefix(o.path, nodePath),
        value: o.value,
      }));
  }

  /**
   * Create an override for a property.
   */
  createOverride(
    path: readonly string[],
    value: unknown
  ): PropertyOverride {
    return { path, value };
  }

  /**
   * Merge override sets, with later overrides taking precedence.
   */
  mergeOverrides(
    ...overrideSets: readonly (readonly PropertyOverride[])[]
  ): PropertyOverride[] {
    const merged = new Map<string, PropertyOverride>();

    for (const overrides of overrideSets) {
      for (const override of overrides) {
        const key = OverridePath.toString(override.path);
        merged.set(key, override);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Remove an override by path.
   */
  removeOverride(
    overrides: readonly PropertyOverride[],
    path: readonly string[]
  ): PropertyOverride[] {
    return overrides.filter(o => !OverridePath.equals(o.path, path));
  }

  /**
   * Get or update an override value.
   */
  setOverride(
    overrides: readonly PropertyOverride[],
    path: readonly string[],
    value: unknown
  ): PropertyOverride[] {
    const result = this.removeOverride(overrides, path);
    result.push(this.createOverride(path, value));
    return result;
  }

  /**
   * Compute diff between base and modified data.
   * Returns overrides that would transform base into modified.
   */
  computeOverrides(
    base: NodeData,
    modified: NodeData,
    currentPath: string[] = []
  ): PropertyOverride[] {
    const overrides: PropertyOverride[] = [];

    // Compare all properties
    const baseObj = base as unknown as Record<string, unknown>;
    const modifiedObj = modified as unknown as Record<string, unknown>;

    for (const key of Object.keys(modifiedObj)) {
      if (key === 'id' || key === 'type' || key === 'parentId' || key === 'childIds') {
        continue; // Skip structural properties
      }

      const basePath = [...currentPath, key];
      const baseValue = baseObj[key];
      const modifiedValue = modifiedObj[key];

      if (!this.deepEquals(baseValue, modifiedValue)) {
        // For objects, we could recurse, but for simplicity store the whole value
        overrides.push({
          path: basePath,
          value: modifiedValue,
        });
      }
    }

    return overrides;
  }

  /**
   * Get value at a path in an object.
   */
  private getValueAtPath(obj: unknown, path: readonly string[]): unknown {
    let current = obj;

    for (const key of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  /**
   * Set value at a path in an object (mutates).
   */
  private setValueAtPath(obj: unknown, path: readonly string[], value: unknown): void {
    if (path.length === 0) return;

    let current = obj as Record<string, unknown>;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]!;
      if (current[key] === undefined || current[key] === null) {
        current[key] = {};
      }
      if (typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    const lastKey = path[path.length - 1]!;
    current[lastKey] = value;
  }

  /**
   * Deep clone an object.
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    const cloned: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      cloned[key] = this.deepClone((obj as Record<string, unknown>)[key]);
    }

    return cloned as T;
  }

  /**
   * Deep equality check.
   */
  private deepEquals(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEquals(a[i], b[i])) return false;
      }
      return true;
    }

    if (Array.isArray(a) || Array.isArray(b)) return false;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!this.deepEquals(aObj[key], bObj[key])) return false;
    }

    return true;
  }
}

/**
 * Create an override resolver.
 */
export function createOverrideResolver(): OverrideResolver {
  return new OverrideResolver();
}
