/**
 * Component manager tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SceneGraph } from '@scene/graph/scene-graph';
import {
  ComponentManager,
  createComponentManager,
} from '@scene/components/component-manager';
import type { NodeId } from '@core/types/common';
import type { InstanceNodeData } from '@scene/nodes/base-node';

describe('ComponentManager', () => {
  let sceneGraph: SceneGraph;
  let manager: ComponentManager;
  let pageId: NodeId;

  beforeEach(() => {
    sceneGraph = new SceneGraph();
    sceneGraph.createNewDocument();
    manager = createComponentManager(sceneGraph);
    pageId = sceneGraph.getPages()[0]!.id;
  });

  describe('component creation', () => {
    describe('createEmptyComponent', () => {
      it('creates an empty component', () => {
        const componentId = manager.createEmptyComponent(pageId, { name: 'Button' });

        expect(componentId).toBeDefined();
        expect(manager.isComponent(componentId)).toBe(true);

        const node = sceneGraph.getNode(componentId);
        expect(node?.type).toBe('COMPONENT');
        expect(node?.name).toBe('Button');
      });

      it('registers component in registry', () => {
        const componentId = manager.createEmptyComponent(pageId, { name: 'Button' });

        const entry = manager.getComponent(componentId);
        expect(entry).not.toBeNull();
        expect(entry?.name).toBe('Button');
      });

      it('emits component:created event', () => {
        const handler = vi.fn();
        manager.on('component:created', handler);

        const componentId = manager.createEmptyComponent(pageId, { name: 'Button' });

        expect(handler).toHaveBeenCalledWith({
          componentId,
          name: 'Button',
        });
      });

      it('creates component with default name', () => {
        const componentId = manager.createEmptyComponent(pageId);

        const node = sceneGraph.getNode(componentId);
        expect(node?.name).toBe('Component');
      });
    });

    describe('createComponentFromNode', () => {
      it('converts a frame to a component', () => {
        const frameId = sceneGraph.createFrame(pageId, { name: 'MyFrame' });

        const componentId = manager.createComponentFromNode(frameId, { name: 'MyComponent' });

        expect(componentId).not.toBeNull();
        expect(manager.isComponent(componentId!)).toBe(true);
        expect(sceneGraph.hasNode(frameId)).toBe(false); // Original deleted
      });

      it('moves children to the new component', () => {
        const frameId = sceneGraph.createFrame(pageId, { name: 'Container' });
        const child1 = sceneGraph.createFrame(frameId, { name: 'Child 1' });
        const child2 = sceneGraph.createFrame(frameId, { name: 'Child 2' });

        const componentId = manager.createComponentFromNode(frameId)!;

        const children = sceneGraph.getChildIds(componentId);
        expect(children).toContain(child1);
        expect(children).toContain(child2);
      });

      it('registers in component set if specified', () => {
        const frameId = sceneGraph.createFrame(pageId, { name: 'Button' });
        manager.createComponentSet('Buttons', [{ name: 'State', values: ['Default', 'Hover'] }]);

        const setId = manager.getAllComponentSets()[0]?.id;
        const componentId = manager.createComponentFromNode(frameId, {
          name: 'Default Button',
          ...(setId !== undefined ? { componentSetId: setId } : {}),
          variantKey: 'State=Default',
        })!;

        const entry = manager.getComponent(componentId);
        expect(entry?.componentSetId).toBeDefined();
        expect(entry?.variantKey).toBe('State=Default');
      });

      it('returns null for non-existent node', () => {
        const result = manager.createComponentFromNode('non-existent' as NodeId);
        expect(result).toBeNull();
      });
    });
  });

  describe('component deletion', () => {
    it('deletes a component', () => {
      const componentId = manager.createEmptyComponent(pageId, { name: 'Button' });

      manager.deleteComponent(componentId);

      expect(sceneGraph.hasNode(componentId)).toBe(false);
      expect(manager.getComponent(componentId)).toBeNull();
    });

    it('emits component:deleted event', () => {
      const componentId = manager.createEmptyComponent(pageId, { name: 'Button' });
      const handler = vi.fn();
      manager.on('component:deleted', handler);

      manager.deleteComponent(componentId);

      expect(handler).toHaveBeenCalledWith({ componentId });
    });
  });

  describe('instance creation', () => {
    let componentId: NodeId;

    beforeEach(() => {
      componentId = manager.createEmptyComponent(pageId, { name: 'Button' });
    });

    it('creates an instance of a component', () => {
      const instanceId = manager.createInstance(componentId, pageId);

      expect(instanceId).not.toBeNull();
      expect(manager.isInstance(instanceId!)).toBe(true);

      const node = sceneGraph.getNode(instanceId!) as InstanceNodeData;
      expect(node.type).toBe('INSTANCE');
      expect(node.componentId).toBe(componentId);
    });

    it('registers instance in registry', () => {
      const instanceId = manager.createInstance(componentId, pageId)!;

      const instances = manager.getInstances(componentId);
      expect(instances).toContain(instanceId);
    });

    it('emits instance:created event', () => {
      const handler = vi.fn();
      manager.on('instance:created', handler);

      const instanceId = manager.createInstance(componentId, pageId);

      expect(handler).toHaveBeenCalledWith({ instanceId, componentId });
    });

    it('creates instance and can set overrides', () => {
      const instanceId = manager.createInstance(componentId, pageId)!;

      // Set override after creation (factory doesn't support initial overrides)
      manager.setOverride(instanceId, ['name'], 'Custom Name');

      const node = sceneGraph.getNode(instanceId) as InstanceNodeData;
      expect(node.overrides).toHaveLength(1);
      expect(node.overrides[0]?.value).toBe('Custom Name');
    });

    it('returns null for non-component', () => {
      const frameId = sceneGraph.createFrame(pageId);

      const result = manager.createInstance(frameId, pageId);

      expect(result).toBeNull();
    });
  });

  describe('instance deletion', () => {
    let componentId: NodeId;
    let instanceId: NodeId;

    beforeEach(() => {
      componentId = manager.createEmptyComponent(pageId, { name: 'Button' });
      instanceId = manager.createInstance(componentId, pageId)!;
    });

    it('deletes an instance', () => {
      manager.deleteInstance(instanceId);

      expect(sceneGraph.hasNode(instanceId)).toBe(false);
    });

    it('unregisters instance from registry', () => {
      manager.deleteInstance(instanceId);

      expect(manager.getInstances(componentId)).not.toContain(instanceId);
    });

    it('emits instance:deleted event', () => {
      const handler = vi.fn();
      manager.on('instance:deleted', handler);

      manager.deleteInstance(instanceId);

      expect(handler).toHaveBeenCalledWith({ instanceId });
    });
  });

  describe('overrides', () => {
    let componentId: NodeId;
    let instanceId: NodeId;

    beforeEach(() => {
      componentId = manager.createEmptyComponent(pageId, { name: 'Button' });
      instanceId = manager.createInstance(componentId, pageId)!;
    });

    it('sets an override on an instance', () => {
      manager.setOverride(instanceId, ['name'], 'Custom Button');

      const node = sceneGraph.getNode(instanceId) as InstanceNodeData;
      expect(node.overrides.some(o => o.path[0] === 'name' && o.value === 'Custom Button')).toBe(true);
    });

    it('emits instance:overrideChanged event when setting override', () => {
      const handler = vi.fn();
      manager.on('instance:overrideChanged', handler);

      manager.setOverride(instanceId, ['name'], 'Custom');

      expect(handler).toHaveBeenCalledWith({
        instanceId,
        path: ['name'],
      });
    });

    it('resets an override', () => {
      manager.setOverride(instanceId, ['name'], 'Custom');
      expect(manager.isPropertyOverridden(instanceId, ['name'])).toBe(true);

      manager.resetOverride(instanceId, ['name']);

      expect(manager.isPropertyOverridden(instanceId, ['name'])).toBe(false);
    });

    it('resets all overrides', () => {
      manager.setOverride(instanceId, ['name'], 'Custom');
      manager.setOverride(instanceId, ['x'], 100);

      manager.resetInstance(instanceId);

      const node = sceneGraph.getNode(instanceId) as InstanceNodeData;
      expect(node.overrides).toHaveLength(0);
    });

    it('isPropertyOverridden returns correct status', () => {
      expect(manager.isPropertyOverridden(instanceId, ['name'])).toBe(false);

      manager.setOverride(instanceId, ['name'], 'Custom');

      expect(manager.isPropertyOverridden(instanceId, ['name'])).toBe(true);
      expect(manager.isPropertyOverridden(instanceId, ['x'])).toBe(false);
    });
  });

  describe('resolved instance data', () => {
    let componentId: NodeId;
    let instanceId: NodeId;

    beforeEach(() => {
      componentId = manager.createEmptyComponent(pageId, { name: 'Button' });
      instanceId = manager.createInstance(componentId, pageId)!;
    });

    it('returns component data with overrides applied', () => {
      manager.setOverride(instanceId, ['name'], 'Custom Button');

      const resolved = manager.getResolvedInstanceData(instanceId);

      expect(resolved?.name).toBe('Custom Button');
    });

    it('returns component data when no overrides', () => {
      const component = sceneGraph.getNode(componentId);
      const resolved = manager.getResolvedInstanceData(instanceId);

      expect(resolved?.name).toBe(component?.name);
    });

    it('getEffectiveValue returns override value', () => {
      manager.setOverride(instanceId, ['name'], 'Custom');

      const value = manager.getEffectiveValue(instanceId, ['name']);

      expect(value).toBe('Custom');
    });

    it('getEffectiveValue returns component value when not overridden', () => {
      const component = sceneGraph.getNode(componentId);

      const value = manager.getEffectiveValue(instanceId, ['name']);

      expect(value).toBe(component?.name);
    });
  });

  describe('component sets', () => {
    it('creates a component set', () => {
      const setId = manager.createComponentSet('Buttons', [
        { name: 'State', values: ['Default', 'Hover', 'Pressed'] },
      ]);

      expect(setId).toBeDefined();
      const set = manager.getComponentSet(setId);
      expect(set?.name).toBe('Buttons');
    });

    it('emits componentSet:created event', () => {
      const handler = vi.fn();
      manager.on('componentSet:created', handler);

      const setId = manager.createComponentSet('Buttons', []);

      expect(handler).toHaveBeenCalledWith({ setId, name: 'Buttons' });
    });

    it('deletes a component set', () => {
      const setId = manager.createComponentSet('Buttons', []);

      manager.deleteComponentSet(setId);

      expect(manager.getComponentSet(setId)).toBeNull();
    });

    it('emits componentSet:deleted event', () => {
      const setId = manager.createComponentSet('Buttons', []);
      const handler = vi.fn();
      manager.on('componentSet:deleted', handler);

      manager.deleteComponentSet(setId);

      expect(handler).toHaveBeenCalledWith({ setId });
    });

    it('getAllComponentSets returns all sets', () => {
      manager.createComponentSet('Buttons', []);
      manager.createComponentSet('Cards', []);

      const sets = manager.getAllComponentSets();

      expect(sets).toHaveLength(2);
    });
  });

  describe('queries', () => {
    it('isComponent returns true for components', () => {
      const componentId = manager.createEmptyComponent(pageId);
      const frameId = sceneGraph.createFrame(pageId);

      expect(manager.isComponent(componentId)).toBe(true);
      expect(manager.isComponent(frameId)).toBe(false);
    });

    it('isInstance returns true for instances', () => {
      const componentId = manager.createEmptyComponent(pageId);
      const instanceId = manager.createInstance(componentId, pageId)!;
      const frameId = sceneGraph.createFrame(pageId);

      expect(manager.isInstance(instanceId)).toBe(true);
      expect(manager.isInstance(frameId)).toBe(false);
    });

    it('getAllComponents returns all components', () => {
      manager.createEmptyComponent(pageId, { name: 'Button' });
      manager.createEmptyComponent(pageId, { name: 'Card' });

      const components = manager.getAllComponents();

      expect(components).toHaveLength(2);
    });

    it('getInstances returns all instances of a component', () => {
      const componentId = manager.createEmptyComponent(pageId);
      const inst1 = manager.createInstance(componentId, pageId)!;
      const inst2 = manager.createInstance(componentId, pageId)!;
      const inst3 = manager.createInstance(componentId, pageId)!;

      const instances = manager.getInstances(componentId);

      expect(instances).toHaveLength(3);
      expect(instances).toContain(inst1);
      expect(instances).toContain(inst2);
      expect(instances).toContain(inst3);
    });

    it('getInstanceCount returns correct count', () => {
      const componentId = manager.createEmptyComponent(pageId);

      expect(manager.getInstanceCount(componentId)).toBe(0);

      manager.createInstance(componentId, pageId);
      expect(manager.getInstanceCount(componentId)).toBe(1);

      manager.createInstance(componentId, pageId);
      expect(manager.getInstanceCount(componentId)).toBe(2);
    });
  });

  describe('serialization', () => {
    it('exports and imports component data', () => {
      const componentId = manager.createEmptyComponent(pageId, { name: 'Button' });
      const instanceId = manager.createInstance(componentId, pageId)!;

      const json = manager.toJSON();

      // Create new manager and import
      const newManager = createComponentManager(sceneGraph);
      newManager.fromJSON(json);

      expect(newManager.getComponent(componentId)).not.toBeNull();
      expect(newManager.getInstances(componentId)).toContain(instanceId);
    });
  });

  describe('clear', () => {
    it('clears all component data', () => {
      const componentId = manager.createEmptyComponent(pageId, { name: 'Button' });
      manager.createInstance(componentId, pageId);
      manager.createComponentSet('Buttons', []);

      manager.clear();

      expect(manager.getAllComponents()).toHaveLength(0);
      expect(manager.getAllComponentSets()).toHaveLength(0);
    });
  });
});
