/**
 * Component registry tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ComponentRegistry,
  createComponentRegistry,
  type VariantPropertyDef,
} from '@scene/components/component-registry';
import type { NodeId } from '@core/types/common';

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;

  beforeEach(() => {
    registry = createComponentRegistry();
  });

  describe('component registration', () => {
    it('registers a new component', () => {
      registry.registerComponent('comp-1' as NodeId, 'Button');

      const entry = registry.getComponent('comp-1' as NodeId);
      expect(entry).not.toBeNull();
      expect(entry?.id).toBe('comp-1');
      expect(entry?.name).toBe('Button');
    });

    it('sets timestamps on registration', () => {
      const before = Date.now();
      registry.registerComponent('comp-1' as NodeId, 'Button');
      const after = Date.now();

      const entry = registry.getComponent('comp-1' as NodeId);
      expect(entry?.createdAt).toBeGreaterThanOrEqual(before);
      expect(entry?.createdAt).toBeLessThanOrEqual(after);
      expect(entry?.modifiedAt).toBe(entry?.createdAt);
    });

    it('registers component with component set info', () => {
      registry.registerComponent('comp-1' as NodeId, 'Button', 'set-1', 'State=Default');

      const entry = registry.getComponent('comp-1' as NodeId);
      expect(entry?.componentSetId).toBe('set-1');
      expect(entry?.variantKey).toBe('State=Default');
    });

    it('initializes instance tracking for component', () => {
      registry.registerComponent('comp-1' as NodeId, 'Button');

      const instances = registry.getInstancesForComponent('comp-1' as NodeId);
      expect(instances).toEqual([]);
    });
  });

  describe('component unregistration', () => {
    it('removes a registered component', () => {
      registry.registerComponent('comp-1' as NodeId, 'Button');
      expect(registry.hasComponent('comp-1' as NodeId)).toBe(true);

      registry.unregisterComponent('comp-1' as NodeId);

      expect(registry.hasComponent('comp-1' as NodeId)).toBe(false);
      expect(registry.getComponent('comp-1' as NodeId)).toBeNull();
    });

    it('removes component from component set when unregistered', () => {
      registry.createComponentSet('set-1', 'Buttons', [{ name: 'State', values: ['Default', 'Hover'] }]);
      registry.registerComponent('comp-1' as NodeId, 'Button', 'set-1', 'State=Default');
      registry.addToComponentSet('set-1', 'State=Default', 'comp-1' as NodeId);

      registry.unregisterComponent('comp-1' as NodeId);

      expect(registry.getVariantComponent('set-1', 'State=Default')).toBeNull();
    });

    it('does nothing for non-existent component', () => {
      expect(() => registry.unregisterComponent('non-existent' as NodeId)).not.toThrow();
    });
  });

  describe('component queries', () => {
    beforeEach(() => {
      registry.registerComponent('comp-1' as NodeId, 'Button');
      registry.registerComponent('comp-2' as NodeId, 'Card');
      registry.registerComponent('comp-3' as NodeId, 'Input');
    });

    it('hasComponent returns true for registered components', () => {
      expect(registry.hasComponent('comp-1' as NodeId)).toBe(true);
      expect(registry.hasComponent('comp-2' as NodeId)).toBe(true);
    });

    it('hasComponent returns false for unregistered components', () => {
      expect(registry.hasComponent('non-existent' as NodeId)).toBe(false);
    });

    it('getAllComponentIds returns all component IDs', () => {
      const ids = registry.getAllComponentIds();

      expect(ids).toHaveLength(3);
      expect(ids).toContain('comp-1');
      expect(ids).toContain('comp-2');
      expect(ids).toContain('comp-3');
    });

    it('getAllComponents returns all component entries', () => {
      const components = registry.getAllComponents();

      expect(components).toHaveLength(3);
      expect(components.map(c => c.name)).toContain('Button');
      expect(components.map(c => c.name)).toContain('Card');
      expect(components.map(c => c.name)).toContain('Input');
    });
  });

  describe('component updates', () => {
    it('updates component name', () => {
      registry.registerComponent('comp-1' as NodeId, 'Button');

      registry.updateComponentName('comp-1' as NodeId, 'Primary Button');

      const entry = registry.getComponent('comp-1' as NodeId);
      expect(entry?.name).toBe('Primary Button');
    });

    it('updates modifiedAt when name changes', () => {
      registry.registerComponent('comp-1' as NodeId, 'Button');
      const original = registry.getComponent('comp-1' as NodeId)!;

      // Wait a bit to ensure timestamp difference
      registry.updateComponentName('comp-1' as NodeId, 'Primary Button');

      const updated = registry.getComponent('comp-1' as NodeId)!;
      expect(updated.modifiedAt).toBeGreaterThanOrEqual(original.modifiedAt);
    });

    it('markComponentModified updates timestamp', () => {
      registry.registerComponent('comp-1' as NodeId, 'Button');
      const original = registry.getComponent('comp-1' as NodeId)!;

      registry.markComponentModified('comp-1' as NodeId);

      const updated = registry.getComponent('comp-1' as NodeId)!;
      expect(updated.modifiedAt).toBeGreaterThanOrEqual(original.modifiedAt);
    });
  });

  describe('instance registration', () => {
    beforeEach(() => {
      registry.registerComponent('comp-1' as NodeId, 'Button');
    });

    it('registers an instance for a component', () => {
      registry.registerInstance('inst-1' as NodeId, 'comp-1' as NodeId);

      expect(registry.getComponentForInstance('inst-1' as NodeId)).toBe('comp-1');
    });

    it('tracks multiple instances for a component', () => {
      registry.registerInstance('inst-1' as NodeId, 'comp-1' as NodeId);
      registry.registerInstance('inst-2' as NodeId, 'comp-1' as NodeId);
      registry.registerInstance('inst-3' as NodeId, 'comp-1' as NodeId);

      const instances = registry.getInstancesForComponent('comp-1' as NodeId);
      expect(instances).toHaveLength(3);
      expect(instances).toContain('inst-1');
      expect(instances).toContain('inst-2');
      expect(instances).toContain('inst-3');
    });

    it('getInstanceCount returns correct count', () => {
      expect(registry.getInstanceCount('comp-1' as NodeId)).toBe(0);

      registry.registerInstance('inst-1' as NodeId, 'comp-1' as NodeId);
      expect(registry.getInstanceCount('comp-1' as NodeId)).toBe(1);

      registry.registerInstance('inst-2' as NodeId, 'comp-1' as NodeId);
      expect(registry.getInstanceCount('comp-1' as NodeId)).toBe(2);
    });
  });

  describe('instance unregistration', () => {
    beforeEach(() => {
      registry.registerComponent('comp-1' as NodeId, 'Button');
      registry.registerInstance('inst-1' as NodeId, 'comp-1' as NodeId);
      registry.registerInstance('inst-2' as NodeId, 'comp-1' as NodeId);
    });

    it('unregisters an instance', () => {
      registry.unregisterInstance('inst-1' as NodeId);

      expect(registry.getComponentForInstance('inst-1' as NodeId)).toBeNull();
    });

    it('removes instance from component tracking', () => {
      registry.unregisterInstance('inst-1' as NodeId);

      const instances = registry.getInstancesForComponent('comp-1' as NodeId);
      expect(instances).not.toContain('inst-1');
      expect(instances).toContain('inst-2');
    });

    it('decrements instance count', () => {
      expect(registry.getInstanceCount('comp-1' as NodeId)).toBe(2);

      registry.unregisterInstance('inst-1' as NodeId);

      expect(registry.getInstanceCount('comp-1' as NodeId)).toBe(1);
    });
  });

  describe('component sets', () => {
    const variantProps: VariantPropertyDef[] = [
      { name: 'State', values: ['Default', 'Hover', 'Pressed'] },
      { name: 'Size', values: ['Small', 'Medium', 'Large'] },
    ];

    it('creates a component set', () => {
      registry.createComponentSet('set-1', 'Button Variants', variantProps);

      const set = registry.getComponentSet('set-1');
      expect(set).not.toBeNull();
      expect(set?.name).toBe('Button Variants');
      expect(set?.variantProperties).toEqual(variantProps);
    });

    it('adds component to component set', () => {
      registry.createComponentSet('set-1', 'Buttons', variantProps);
      registry.registerComponent('comp-1' as NodeId, 'Default Button');

      registry.addToComponentSet('set-1', 'State=Default,Size=Medium', 'comp-1' as NodeId);

      expect(registry.getVariantComponent('set-1', 'State=Default,Size=Medium')).toBe('comp-1');
    });

    it('updates component entry when added to set', () => {
      registry.createComponentSet('set-1', 'Buttons', variantProps);
      registry.registerComponent('comp-1' as NodeId, 'Default Button');

      registry.addToComponentSet('set-1', 'State=Default,Size=Medium', 'comp-1' as NodeId);

      const entry = registry.getComponent('comp-1' as NodeId);
      expect(entry?.componentSetId).toBe('set-1');
      expect(entry?.variantKey).toBe('State=Default,Size=Medium');
    });

    it('removes component from component set', () => {
      registry.createComponentSet('set-1', 'Buttons', variantProps);
      registry.registerComponent('comp-1' as NodeId, 'Default Button');
      registry.addToComponentSet('set-1', 'State=Default,Size=Medium', 'comp-1' as NodeId);

      registry.removeFromComponentSet('set-1', 'State=Default,Size=Medium');

      expect(registry.getVariantComponent('set-1', 'State=Default,Size=Medium')).toBeNull();
    });

    it('updates component entry when removed from set', () => {
      registry.createComponentSet('set-1', 'Buttons', variantProps);
      registry.registerComponent('comp-1' as NodeId, 'Default Button');
      registry.addToComponentSet('set-1', 'State=Default,Size=Medium', 'comp-1' as NodeId);

      registry.removeFromComponentSet('set-1', 'State=Default,Size=Medium');

      const entry = registry.getComponent('comp-1' as NodeId);
      expect(entry?.componentSetId).toBeNull();
      expect(entry?.variantKey).toBeNull();
    });

    it('deletes component set', () => {
      registry.createComponentSet('set-1', 'Buttons', variantProps);
      registry.registerComponent('comp-1' as NodeId, 'Default');
      registry.addToComponentSet('set-1', 'State=Default', 'comp-1' as NodeId);

      registry.deleteComponentSet('set-1');

      expect(registry.getComponentSet('set-1')).toBeNull();
    });

    it('clears component set references when deleted', () => {
      registry.createComponentSet('set-1', 'Buttons', variantProps);
      registry.registerComponent('comp-1' as NodeId, 'Default');
      registry.addToComponentSet('set-1', 'State=Default', 'comp-1' as NodeId);

      registry.deleteComponentSet('set-1');

      const entry = registry.getComponent('comp-1' as NodeId);
      expect(entry?.componentSetId).toBeNull();
      expect(entry?.variantKey).toBeNull();
    });

    it('getAllComponentSets returns all sets', () => {
      registry.createComponentSet('set-1', 'Buttons', []);
      registry.createComponentSet('set-2', 'Cards', []);
      registry.createComponentSet('set-3', 'Inputs', []);

      const sets = registry.getAllComponentSets();

      expect(sets).toHaveLength(3);
      expect(sets.map(s => s.name)).toContain('Buttons');
      expect(sets.map(s => s.name)).toContain('Cards');
      expect(sets.map(s => s.name)).toContain('Inputs');
    });
  });

  describe('clear', () => {
    it('removes all data', () => {
      registry.registerComponent('comp-1' as NodeId, 'Button');
      registry.registerInstance('inst-1' as NodeId, 'comp-1' as NodeId);
      registry.createComponentSet('set-1', 'Buttons', []);

      registry.clear();

      expect(registry.getAllComponents()).toEqual([]);
      expect(registry.getAllComponentSets()).toEqual([]);
      expect(registry.getComponentForInstance('inst-1' as NodeId)).toBeNull();
    });
  });

  describe('serialization', () => {
    it('exports and imports registry data', () => {
      registry.registerComponent('comp-1' as NodeId, 'Button');
      registry.registerComponent('comp-2' as NodeId, 'Card');
      registry.registerInstance('inst-1' as NodeId, 'comp-1' as NodeId);
      registry.createComponentSet('set-1', 'Buttons', [{ name: 'State', values: ['Default'] }]);
      registry.addToComponentSet('set-1', 'State=Default', 'comp-1' as NodeId);

      const json = registry.toJSON();

      const newRegistry = createComponentRegistry();
      newRegistry.fromJSON(json);

      expect(newRegistry.hasComponent('comp-1' as NodeId)).toBe(true);
      expect(newRegistry.hasComponent('comp-2' as NodeId)).toBe(true);
      expect(newRegistry.getComponentForInstance('inst-1' as NodeId)).toBe('comp-1');
      expect(newRegistry.getComponentSet('set-1')).not.toBeNull();
      expect(newRegistry.getVariantComponent('set-1', 'State=Default')).toBe('comp-1');
    });
  });
});
