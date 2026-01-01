/**
 * Variant manager tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SceneGraph } from '@scene/graph/scene-graph';
import { createVariantManager, } from '@scene/components/variant-manager';
import { createComponentRegistry, } from '@scene/components/component-registry';
describe('VariantManager', () => {
    let sceneGraph;
    let registry;
    let variantManager;
    let pageId;
    beforeEach(() => {
        sceneGraph = new SceneGraph();
        sceneGraph.createNewDocument();
        registry = createComponentRegistry();
        variantManager = createVariantManager(sceneGraph, registry);
        pageId = sceneGraph.getPages()[0].id;
    });
    describe('variant key operations', () => {
        describe('createVariantKey', () => {
            it('creates key from property values', () => {
                const key = variantManager.createVariantKey([
                    { property: 'State', value: 'Default' },
                    { property: 'Size', value: 'Medium' },
                ]);
                expect(key).toBe('Size=Medium,State=Default');
            });
            it('sorts properties alphabetically', () => {
                const key = variantManager.createVariantKey([
                    { property: 'Z', value: '1' },
                    { property: 'A', value: '2' },
                    { property: 'M', value: '3' },
                ]);
                expect(key).toBe('A=2,M=3,Z=1');
            });
            it('handles single property', () => {
                const key = variantManager.createVariantKey([
                    { property: 'State', value: 'Hover' },
                ]);
                expect(key).toBe('State=Hover');
            });
            it('handles empty values', () => {
                const key = variantManager.createVariantKey([]);
                expect(key).toBe('');
            });
        });
        describe('parseVariantKey', () => {
            it('parses key into property values', () => {
                const parsed = variantManager.parseVariantKey('Size=Medium,State=Default');
                expect(parsed.values.get('Size')).toBe('Medium');
                expect(parsed.values.get('State')).toBe('Default');
                expect(parsed.raw).toBe('Size=Medium,State=Default');
            });
            it('handles single property', () => {
                const parsed = variantManager.parseVariantKey('State=Hover');
                expect(parsed.values.size).toBe(1);
                expect(parsed.values.get('State')).toBe('Hover');
            });
            it('handles empty key', () => {
                const parsed = variantManager.parseVariantKey('');
                expect(parsed.values.size).toBe(0);
            });
            it('trims whitespace', () => {
                const parsed = variantManager.parseVariantKey(' State = Default , Size = Large ');
                expect(parsed.values.get('State')).toBe('Default');
                expect(parsed.values.get('Size')).toBe('Large');
            });
        });
        describe('getAllVariantKeys', () => {
            it('returns all possible keys for a component set', () => {
                const variantProps = [
                    { name: 'State', values: ['Default', 'Hover'] },
                    { name: 'Size', values: ['Small', 'Large'] },
                ];
                registry.createComponentSet('set-1', 'Buttons', variantProps);
                const keys = variantManager.getAllVariantKeys('set-1');
                expect(keys).toHaveLength(4); // 2 x 2 = 4 combinations
                expect(keys).toContain('Size=Small,State=Default');
                expect(keys).toContain('Size=Small,State=Hover');
                expect(keys).toContain('Size=Large,State=Default');
                expect(keys).toContain('Size=Large,State=Hover');
            });
            it('returns empty array for non-existent set', () => {
                const keys = variantManager.getAllVariantKeys('non-existent');
                expect(keys).toEqual([]);
            });
        });
        describe('generateVariantCombinations', () => {
            it('generates all combinations of property values', () => {
                const properties = [
                    { name: 'A', values: ['1', '2'] },
                    { name: 'B', values: ['x', 'y', 'z'] },
                ];
                const combinations = variantManager.generateVariantCombinations(properties);
                expect(combinations).toHaveLength(6); // 2 x 3 = 6
            });
            it('handles single property', () => {
                const properties = [
                    { name: 'State', values: ['Default', 'Hover', 'Pressed'] },
                ];
                const combinations = variantManager.generateVariantCombinations(properties);
                expect(combinations).toHaveLength(3);
            });
            it('returns single empty key for no properties', () => {
                const combinations = variantManager.generateVariantCombinations([]);
                expect(combinations).toEqual(['']);
            });
        });
        describe('isValidVariantKey', () => {
            beforeEach(() => {
                registry.createComponentSet('set-1', 'Buttons', [
                    { name: 'State', values: ['Default', 'Hover'] },
                    { name: 'Size', values: ['Small', 'Large'] },
                ]);
            });
            it('returns true for valid key', () => {
                expect(variantManager.isValidVariantKey('set-1', 'Size=Small,State=Default')).toBe(true);
            });
            it('returns false for missing property', () => {
                expect(variantManager.isValidVariantKey('set-1', 'State=Default')).toBe(false);
            });
            it('returns false for invalid value', () => {
                expect(variantManager.isValidVariantKey('set-1', 'Size=ExtraLarge,State=Default')).toBe(false);
            });
            it('returns false for non-existent set', () => {
                expect(variantManager.isValidVariantKey('non-existent', 'State=Default')).toBe(false);
            });
        });
    });
    describe('component variant operations', () => {
        let componentId;
        beforeEach(() => {
            componentId = sceneGraph.createNode('COMPONENT', pageId, -1, { name: 'Button' });
            registry.registerComponent(componentId, 'Button', 'set-1', 'State=Default');
            registry.createComponentSet('set-1', 'Buttons', [
                { name: 'State', values: ['Default', 'Hover'] },
            ]);
            registry.addToComponentSet('set-1', 'State=Default', componentId);
        });
        it('getComponentVariantKey returns key for component', () => {
            const key = variantManager.getComponentVariantKey(componentId);
            expect(key).toBe('State=Default');
        });
        it('getComponentVariantKey returns null for non-variant component', () => {
            const regularId = sceneGraph.createNode('COMPONENT', pageId, -1, { name: 'Regular' });
            registry.registerComponent(regularId, 'Regular');
            const key = variantManager.getComponentVariantKey(regularId);
            expect(key).toBeNull();
        });
        it('getComponentSet returns set for component', () => {
            const set = variantManager.getComponentSet(componentId);
            expect(set).not.toBeNull();
            expect(set?.name).toBe('Buttons');
        });
        it('getVariantValues returns parsed values', () => {
            const values = variantManager.getVariantValues(componentId);
            expect(values).toHaveLength(1);
            expect(values[0]).toEqual({ property: 'State', value: 'Default' });
        });
    });
    describe('sibling variant lookup', () => {
        let defaultId;
        let hoverId;
        beforeEach(() => {
            registry.createComponentSet('set-1', 'Buttons', [
                { name: 'State', values: ['Default', 'Hover', 'Pressed'] },
            ]);
            defaultId = sceneGraph.createNode('COMPONENT', pageId, -1, { name: 'Default' });
            registry.registerComponent(defaultId, 'Default', 'set-1', 'State=Default');
            registry.addToComponentSet('set-1', 'State=Default', defaultId);
            hoverId = sceneGraph.createNode('COMPONENT', pageId, -1, { name: 'Hover' });
            registry.registerComponent(hoverId, 'Hover', 'set-1', 'State=Hover');
            registry.addToComponentSet('set-1', 'State=Hover', hoverId);
        });
        it('finds sibling variant with different value', () => {
            const sibling = variantManager.findSiblingVariant(defaultId, 'State', 'Hover');
            expect(sibling).toBe(hoverId);
        });
        it('returns null if sibling does not exist', () => {
            const sibling = variantManager.findSiblingVariant(defaultId, 'State', 'Pressed');
            expect(sibling).toBeNull();
        });
        it('returns null for non-variant component', () => {
            const regularId = sceneGraph.createNode('COMPONENT', pageId, -1, { name: 'Regular' });
            registry.registerComponent(regularId, 'Regular');
            const sibling = variantManager.findSiblingVariant(regularId, 'State', 'Hover');
            expect(sibling).toBeNull();
        });
    });
    describe('set variants', () => {
        beforeEach(() => {
            registry.createComponentSet('set-1', 'Buttons', [
                { name: 'State', values: ['Default', 'Hover'] },
            ]);
            const comp1 = sceneGraph.createNode('COMPONENT', pageId, -1, { name: 'Default' });
            registry.registerComponent(comp1, 'Default');
            registry.addToComponentSet('set-1', 'State=Default', comp1);
            const comp2 = sceneGraph.createNode('COMPONENT', pageId, -1, { name: 'Hover' });
            registry.registerComponent(comp2, 'Hover');
            registry.addToComponentSet('set-1', 'State=Hover', comp2);
        });
        it('getSetVariants returns all variants', () => {
            const variants = variantManager.getSetVariants('set-1');
            expect(variants).toHaveLength(2);
            expect(variants.map(v => v.key)).toContain('State=Default');
            expect(variants.map(v => v.key)).toContain('State=Hover');
        });
        it('getSetVariants returns empty for non-existent set', () => {
            const variants = variantManager.getSetVariants('non-existent');
            expect(variants).toEqual([]);
        });
        it('getVariantsByProperty groups variants by value', () => {
            // Create a set with multiple properties so we can have multiple variants per size
            registry.createComponentSet('set-2', 'Sized Buttons', [
                { name: 'Size', values: ['Small', 'Large'] },
                { name: 'State', values: ['Default', 'Hover'] },
            ]);
            // Small variants
            const smallDefault = sceneGraph.createNode('COMPONENT', pageId, -1, { name: 'Small Default' });
            registry.addToComponentSet('set-2', 'Size=Small,State=Default', smallDefault);
            const smallHover = sceneGraph.createNode('COMPONENT', pageId, -1, { name: 'Small Hover' });
            registry.addToComponentSet('set-2', 'Size=Small,State=Hover', smallHover);
            // Large variant
            const largeDefault = sceneGraph.createNode('COMPONENT', pageId, -1, { name: 'Large Default' });
            registry.addToComponentSet('set-2', 'Size=Large,State=Default', largeDefault);
            const grouped = variantManager.getVariantsByProperty('set-2', 'Size');
            expect(grouped.get('Small')).toHaveLength(2);
            expect(grouped.get('Large')).toHaveLength(1);
        });
    });
    describe('variant property management', () => {
        let setId;
        beforeEach(() => {
            registry.createComponentSet('set-1', 'Buttons', [
                { name: 'State', values: ['Default', 'Hover'] },
            ]);
            setId = 'set-1';
        });
        it('addVariantProperty adds a new property', () => {
            variantManager.addVariantProperty(setId, { name: 'Size', values: ['Small', 'Large'] });
            const set = registry.getComponentSet(setId);
            expect(set?.variantProperties).toHaveLength(2);
        });
        it('removeVariantProperty removes a property', () => {
            variantManager.removeVariantProperty(setId, 'State');
            const set = registry.getComponentSet(setId);
            expect(set?.variantProperties.some(p => p.name === 'State')).toBe(false);
        });
        it('addPropertyValue adds a value to a property', () => {
            variantManager.addPropertyValue(setId, 'State', 'Pressed');
            const set = registry.getComponentSet(setId);
            const stateProp = set?.variantProperties.find(p => p.name === 'State');
            expect(stateProp?.values).toContain('Pressed');
        });
        it('addPropertyValue does not duplicate existing value', () => {
            variantManager.addPropertyValue(setId, 'State', 'Default');
            const set = registry.getComponentSet(setId);
            const stateProp = set?.variantProperties.find(p => p.name === 'State');
            expect(stateProp?.values.filter(v => v === 'Default')).toHaveLength(1);
        });
        it('removePropertyValue removes a value', () => {
            variantManager.removePropertyValue(setId, 'State', 'Hover');
            const set = registry.getComponentSet(setId);
            const stateProp = set?.variantProperties.find(p => p.name === 'State');
            expect(stateProp?.values).not.toContain('Hover');
        });
        it('renameProperty renames a property', () => {
            variantManager.renameProperty(setId, 'State', 'Status');
            const set = registry.getComponentSet(setId);
            expect(set?.variantProperties.some(p => p.name === 'Status')).toBe(true);
            expect(set?.variantProperties.some(p => p.name === 'State')).toBe(false);
        });
    });
    describe('variant creation from component', () => {
        let sourceId;
        beforeEach(() => {
            registry.createComponentSet('set-1', 'Buttons', [
                { name: 'State', values: ['Default', 'Hover', 'Pressed'] },
            ]);
            sourceId = sceneGraph.createNode('COMPONENT', pageId, -1, { name: 'Default Button' });
            registry.registerComponent(sourceId, 'Default Button', 'set-1', 'State=Default');
            registry.addToComponentSet('set-1', 'State=Default', sourceId);
        });
        it('creates new variant from existing component', () => {
            const newId = variantManager.createVariantFromComponent(sourceId, 'State=Hover');
            expect(newId).not.toBeNull();
            expect(sceneGraph.hasNode(newId)).toBe(true);
            expect(registry.getVariantComponent('set-1', 'State=Hover')).toBe(newId);
        });
        it('returns null if variant key already exists', () => {
            const newId = variantManager.createVariantFromComponent(sourceId, 'State=Default');
            expect(newId).toBeNull();
        });
        it('returns null for non-variant component', () => {
            const regularId = sceneGraph.createNode('COMPONENT', pageId, -1, { name: 'Regular' });
            registry.registerComponent(regularId, 'Regular');
            const newId = variantManager.createVariantFromComponent(regularId, 'State=Hover');
            expect(newId).toBeNull();
        });
        it('clones children from source component', () => {
            void sceneGraph.createNode('FRAME', sourceId, -1, { name: 'Child 1' });
            void sceneGraph.createNode('FRAME', sourceId, -1, { name: 'Child 2' });
            const newId = variantManager.createVariantFromComponent(sourceId, 'State=Hover');
            const newChildren = sceneGraph.getChildIds(newId);
            expect(newChildren).toHaveLength(2);
        });
    });
});
//# sourceMappingURL=variant-manager.test.js.map