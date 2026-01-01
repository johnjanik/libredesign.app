/**
 * Override resolver tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OverrideResolver,
  createOverrideResolver,
  OverridePath,
} from '@scene/components/override-resolver';
import type { PropertyOverride, FrameNodeData } from '@scene/nodes/base-node';
import type { NodeId } from '@core/types/common';

describe('OverridePath', () => {
  describe('toString', () => {
    it('joins path segments with dots', () => {
      expect(OverridePath.toString(['a', 'b', 'c'])).toBe('a.b.c');
    });

    it('handles single segment', () => {
      expect(OverridePath.toString(['name'])).toBe('name');
    });

    it('handles empty path', () => {
      expect(OverridePath.toString([])).toBe('');
    });
  });

  describe('fromString', () => {
    it('splits path string into segments', () => {
      expect(OverridePath.fromString('a.b.c')).toEqual(['a', 'b', 'c']);
    });

    it('handles single segment', () => {
      expect(OverridePath.fromString('name')).toEqual(['name']);
    });

    it('handles empty string', () => {
      expect(OverridePath.fromString('')).toEqual(['']);
    });
  });

  describe('startsWith', () => {
    it('returns true when path starts with prefix', () => {
      expect(OverridePath.startsWith(['a', 'b', 'c'], ['a', 'b'])).toBe(true);
    });

    it('returns true when path equals prefix', () => {
      expect(OverridePath.startsWith(['a', 'b'], ['a', 'b'])).toBe(true);
    });

    it('returns false when path does not start with prefix', () => {
      expect(OverridePath.startsWith(['a', 'b', 'c'], ['a', 'c'])).toBe(false);
    });

    it('returns false when path is shorter than prefix', () => {
      expect(OverridePath.startsWith(['a'], ['a', 'b'])).toBe(false);
    });

    it('returns true for empty prefix', () => {
      expect(OverridePath.startsWith(['a', 'b'], [])).toBe(true);
    });
  });

  describe('stripPrefix', () => {
    it('removes prefix from path', () => {
      expect(OverridePath.stripPrefix(['a', 'b', 'c'], ['a', 'b'])).toEqual(['c']);
    });

    it('returns empty array when path equals prefix', () => {
      expect(OverridePath.stripPrefix(['a', 'b'], ['a', 'b'])).toEqual([]);
    });

    it('returns original path when prefix does not match', () => {
      expect(OverridePath.stripPrefix(['a', 'b', 'c'], ['x', 'y'])).toEqual(['a', 'b', 'c']);
    });
  });

  describe('append', () => {
    it('appends segments to path', () => {
      expect(OverridePath.append(['a', 'b'], 'c', 'd')).toEqual(['a', 'b', 'c', 'd']);
    });

    it('works with empty path', () => {
      expect(OverridePath.append([], 'a', 'b')).toEqual(['a', 'b']);
    });
  });

  describe('equals', () => {
    it('returns true for equal paths', () => {
      expect(OverridePath.equals(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
    });

    it('returns false for different paths', () => {
      expect(OverridePath.equals(['a', 'b'], ['a', 'c'])).toBe(false);
    });

    it('returns false for different lengths', () => {
      expect(OverridePath.equals(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
    });

    it('returns true for empty paths', () => {
      expect(OverridePath.equals([], [])).toBe(true);
    });
  });
});

describe('OverrideResolver', () => {
  let resolver: OverrideResolver;

  // Helper to create mock node data
  const createMockNode = (props: Partial<FrameNodeData> = {}): FrameNodeData => ({
    id: 'node-1' as NodeId,
    type: 'FRAME',
    name: 'Test Frame',
    visible: true,
    locked: false,
    parentId: null,
    childIds: [],
    pluginData: {},
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    blendMode: 'NORMAL',
    fills: [],
    strokes: [],
    strokeWeight: 1,
    strokeAlign: 'CENTER',
    strokeCap: 'NONE',
    strokeJoin: 'MITER',
    strokeMiterLimit: 4,
    dashPattern: [],
    dashOffset: 0,
    effects: [],
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
    clipsContent: false,
    autoLayout: { mode: 'NONE' },
    ...props,
  } as FrameNodeData);

  beforeEach(() => {
    resolver = createOverrideResolver();
  });

  describe('applyOverrides', () => {
    it('returns original data when no overrides', () => {
      const node = createMockNode({ name: 'Original' });

      const result = resolver.applyOverrides(node, []);

      expect(result.name).toBe('Original');
    });

    it('applies single override', () => {
      const node = createMockNode({ name: 'Original' });
      const overrides: PropertyOverride[] = [
        { path: ['name'], value: 'Overridden' },
      ];

      const result = resolver.applyOverrides(node, overrides);

      expect(result.name).toBe('Overridden');
    });

    it('applies multiple overrides', () => {
      const node = createMockNode({ name: 'Original', x: 0, y: 0 });
      const overrides: PropertyOverride[] = [
        { path: ['name'], value: 'Overridden' },
        { path: ['x'], value: 100 },
        { path: ['y'], value: 200 },
      ];

      const result = resolver.applyOverrides(node, overrides);

      expect(result.name).toBe('Overridden');
      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
    });

    it('applies nested property override', () => {
      const node = createMockNode({
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
      });
      const overrides: PropertyOverride[] = [
        { path: ['constraints', 'horizontal'], value: 'CENTER' },
      ];

      const result = resolver.applyOverrides(node, overrides);

      expect(result.constraints.horizontal).toBe('CENTER');
      expect(result.constraints.vertical).toBe('MIN');
    });

    it('does not mutate original data', () => {
      const node = createMockNode({ name: 'Original' });
      const overrides: PropertyOverride[] = [
        { path: ['name'], value: 'Overridden' },
      ];

      resolver.applyOverrides(node, overrides);

      expect(node.name).toBe('Original');
    });

    it('creates intermediate objects for deep paths', () => {
      const node = createMockNode();
      const overrides: PropertyOverride[] = [
        { path: ['pluginData', 'myPlugin', 'setting'], value: 'value' },
      ];

      const result = resolver.applyOverrides(node, overrides);

      const pluginData = result.pluginData as Record<string, unknown>;
      expect(pluginData['myPlugin']).toBeDefined();
      expect((pluginData['myPlugin'] as { setting: string })?.setting).toBe('value');
    });
  });

  describe('applyOverrideChain', () => {
    it('applies overrides from multiple contexts in order', () => {
      const node = createMockNode({ name: 'Original', x: 0 });

      const contexts = [
        {
          instanceId: 'inst-1' as NodeId,
          componentId: 'comp-1' as NodeId,
          overrides: [{ path: ['name'], value: 'First' }],
          parent: null,
        },
        {
          instanceId: 'inst-2' as NodeId,
          componentId: 'comp-1' as NodeId,
          overrides: [{ path: ['name'], value: 'Second' }, { path: ['x'], value: 50 }],
          parent: null,
        },
      ];

      const result = resolver.applyOverrideChain(node, contexts);

      expect(result.name).toBe('Second'); // Later override wins
      expect(result.x).toBe(50);
    });
  });

  describe('getEffectiveValue', () => {
    it('returns override value when property is overridden', () => {
      const node = createMockNode({ name: 'Original' });
      const overrides: PropertyOverride[] = [
        { path: ['name'], value: 'Overridden' },
      ];

      const value = resolver.getEffectiveValue(node, ['name'], overrides);

      expect(value).toBe('Overridden');
    });

    it('returns original value when property is not overridden', () => {
      const node = createMockNode({ name: 'Original' });
      const overrides: PropertyOverride[] = [];

      const value = resolver.getEffectiveValue(node, ['name'], overrides);

      expect(value).toBe('Original');
    });

    it('returns nested value', () => {
      const node = createMockNode({
        constraints: { horizontal: 'CENTER', vertical: 'MIN' },
      });

      const value = resolver.getEffectiveValue(node, ['constraints', 'horizontal'], []);

      expect(value).toBe('CENTER');
    });
  });

  describe('isOverridden', () => {
    it('returns true when path is overridden', () => {
      const overrides: PropertyOverride[] = [
        { path: ['name'], value: 'Test' },
        { path: ['x'], value: 100 },
      ];

      expect(resolver.isOverridden(['name'], overrides)).toBe(true);
      expect(resolver.isOverridden(['x'], overrides)).toBe(true);
    });

    it('returns false when path is not overridden', () => {
      const overrides: PropertyOverride[] = [
        { path: ['name'], value: 'Test' },
      ];

      expect(resolver.isOverridden(['y'], overrides)).toBe(false);
    });
  });

  describe('getOverridesForNode', () => {
    it('filters overrides by node path prefix', () => {
      const overrides: PropertyOverride[] = [
        { path: ['child-1', 'name'], value: 'Child 1' },
        { path: ['child-1', 'x'], value: 100 },
        { path: ['child-2', 'name'], value: 'Child 2' },
      ];

      const child1Overrides = resolver.getOverridesForNode(['child-1'], overrides);

      expect(child1Overrides).toHaveLength(2);
      expect(child1Overrides[0]?.path).toEqual(['name']);
      expect(child1Overrides[1]?.path).toEqual(['x']);
    });

    it('strips prefix from paths', () => {
      const overrides: PropertyOverride[] = [
        { path: ['child-1', 'nested', 'value'], value: 42 },
      ];

      const result = resolver.getOverridesForNode(['child-1'], overrides);

      expect(result[0]?.path).toEqual(['nested', 'value']);
    });
  });

  describe('createOverride', () => {
    it('creates override object', () => {
      const override = resolver.createOverride(['name'], 'Test');

      expect(override.path).toEqual(['name']);
      expect(override.value).toBe('Test');
    });
  });

  describe('mergeOverrides', () => {
    it('merges multiple override sets', () => {
      const set1: PropertyOverride[] = [
        { path: ['name'], value: 'Name 1' },
        { path: ['x'], value: 10 },
      ];
      const set2: PropertyOverride[] = [
        { path: ['y'], value: 20 },
      ];

      const merged = resolver.mergeOverrides(set1, set2);

      expect(merged).toHaveLength(3);
    });

    it('later overrides take precedence for same path', () => {
      const set1: PropertyOverride[] = [
        { path: ['name'], value: 'First' },
      ];
      const set2: PropertyOverride[] = [
        { path: ['name'], value: 'Second' },
      ];

      const merged = resolver.mergeOverrides(set1, set2);

      expect(merged).toHaveLength(1);
      expect(merged[0]?.value).toBe('Second');
    });
  });

  describe('removeOverride', () => {
    it('removes override by path', () => {
      const overrides: PropertyOverride[] = [
        { path: ['name'], value: 'Test' },
        { path: ['x'], value: 100 },
      ];

      const result = resolver.removeOverride(overrides, ['name']);

      expect(result).toHaveLength(1);
      expect(result[0]?.path).toEqual(['x']);
    });

    it('returns all overrides if path not found', () => {
      const overrides: PropertyOverride[] = [
        { path: ['name'], value: 'Test' },
      ];

      const result = resolver.removeOverride(overrides, ['x']);

      expect(result).toHaveLength(1);
    });
  });

  describe('setOverride', () => {
    it('adds new override', () => {
      const overrides: PropertyOverride[] = [];

      const result = resolver.setOverride(overrides, ['name'], 'Test');

      expect(result).toHaveLength(1);
      expect(result[0]?.value).toBe('Test');
    });

    it('replaces existing override', () => {
      const overrides: PropertyOverride[] = [
        { path: ['name'], value: 'Old' },
      ];

      const result = resolver.setOverride(overrides, ['name'], 'New');

      expect(result).toHaveLength(1);
      expect(result[0]?.value).toBe('New');
    });
  });

  describe('computeOverrides', () => {
    it('computes overrides from differences', () => {
      const base = createMockNode({ name: 'Original', x: 0 });
      const modified = createMockNode({ name: 'Modified', x: 100 });

      const overrides = resolver.computeOverrides(base, modified);

      expect(overrides).toContainEqual({ path: ['name'], value: 'Modified' });
      expect(overrides).toContainEqual({ path: ['x'], value: 100 });
    });

    it('skips structural properties', () => {
      const base = createMockNode();
      const modified = { ...base, id: 'different-id' as NodeId };

      const overrides = resolver.computeOverrides(base, modified);

      expect(overrides.some(o => OverridePath.equals(o.path, ['id']))).toBe(false);
    });

    it('returns empty array for identical data', () => {
      const node = createMockNode();

      const overrides = resolver.computeOverrides(node, node);

      expect(overrides).toHaveLength(0);
    });
  });
});
