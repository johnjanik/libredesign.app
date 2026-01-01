/**
 * Variant Manager
 *
 * Manages component variants and variant properties.
 * Handles variant switching, property combination, and variant key generation.
 */
/**
 * Variant manager for handling component variants
 */
export class VariantManager {
    sceneGraph;
    registry;
    constructor(sceneGraph, registry) {
        this.sceneGraph = sceneGraph;
        this.registry = registry;
    }
    // =========================================================================
    // Variant Key Operations
    // =========================================================================
    /**
     * Create a variant key from property values.
     */
    createVariantKey(values) {
        // Sort by property name for consistent keys
        const sorted = [...values].sort((a, b) => a.property.localeCompare(b.property));
        return sorted.map(v => `${v.property}=${v.value}`).join(',');
    }
    /**
     * Parse a variant key into property values.
     */
    parseVariantKey(key) {
        const values = new Map();
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
    getAllVariantKeys(setId) {
        const set = this.registry.getComponentSet(setId);
        if (!set)
            return [];
        // Generate all combinations
        return this.generateVariantCombinations(set.variantProperties);
    }
    /**
     * Generate all combinations of variant property values.
     */
    generateVariantCombinations(properties) {
        if (properties.length === 0)
            return [''];
        const combinations = [];
        const generate = (index, current) => {
            if (index === properties.length) {
                combinations.push(this.createVariantKey(current));
                return;
            }
            const prop = properties[index];
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
    isValidVariantKey(setId, key) {
        const set = this.registry.getComponentSet(setId);
        if (!set)
            return false;
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
    getComponentVariantKey(componentId) {
        const entry = this.registry.getComponent(componentId);
        return entry?.variantKey ?? null;
    }
    /**
     * Get the component set for a component.
     */
    getComponentSet(componentId) {
        const entry = this.registry.getComponent(componentId);
        if (!entry?.componentSetId)
            return null;
        return this.registry.getComponentSet(entry.componentSetId);
    }
    /**
     * Get variant property values for a component.
     */
    getVariantValues(componentId) {
        const key = this.getComponentVariantKey(componentId);
        if (!key)
            return [];
        const parsed = this.parseVariantKey(key);
        return Array.from(parsed.values.entries()).map(([property, value]) => ({
            property,
            value,
        }));
    }
    /**
     * Find sibling variant with different property value.
     */
    findSiblingVariant(componentId, property, newValue) {
        const entry = this.registry.getComponent(componentId);
        if (!entry?.componentSetId || !entry.variantKey)
            return null;
        const set = this.registry.getComponentSet(entry.componentSetId);
        if (!set)
            return null;
        // Parse current key and modify
        const parsed = this.parseVariantKey(entry.variantKey);
        const newValues = new Map(parsed.values);
        newValues.set(property, newValue);
        // Generate new key
        const newKey = this.createVariantKey(Array.from(newValues.entries()).map(([p, v]) => ({ property: p, value: v })));
        return this.registry.getVariantComponent(entry.componentSetId, newKey);
    }
    /**
     * Get all variants in a component set.
     */
    getSetVariants(setId) {
        const set = this.registry.getComponentSet(setId);
        if (!set)
            return [];
        return Array.from(set.variants.entries()).map(([key, componentId]) => ({
            key,
            componentId,
        }));
    }
    /**
     * Get variants grouped by property value.
     */
    getVariantsByProperty(setId, property) {
        const set = this.registry.getComponentSet(setId);
        if (!set)
            return new Map();
        const grouped = new Map();
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
    addVariantProperty(setId, property) {
        const set = this.registry.getComponentSet(setId);
        if (!set)
            return;
        // Update set with new property
        const newProperties = [...set.variantProperties, property];
        // This would require recreating the set
        // In a real implementation, you'd update existing variants or duplicate them
        this.registry.createComponentSet(setId, set.name, newProperties);
    }
    /**
     * Remove a variant property from a component set.
     */
    removeVariantProperty(setId, propertyName) {
        const set = this.registry.getComponentSet(setId);
        if (!set)
            return;
        const newProperties = set.variantProperties.filter(p => p.name !== propertyName);
        // This would require recreating the set and consolidating variants
        this.registry.createComponentSet(setId, set.name, newProperties);
    }
    /**
     * Add a value to a variant property.
     */
    addPropertyValue(setId, propertyName, value) {
        const set = this.registry.getComponentSet(setId);
        if (!set)
            return;
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
    removePropertyValue(setId, propertyName, value) {
        const set = this.registry.getComponentSet(setId);
        if (!set)
            return;
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
    renameProperty(setId, oldName, newName) {
        const set = this.registry.getComponentSet(setId);
        if (!set)
            return;
        const newProperties = set.variantProperties.map(p => {
            if (p.name === oldName) {
                return { ...p, name: newName };
            }
            return p;
        });
        // Update all variant keys
        const newVariants = new Map();
        for (const [key, componentId] of set.variants.entries()) {
            const parsed = this.parseVariantKey(key);
            const newValues = new Map();
            for (const [prop, val] of parsed.values.entries()) {
                const newProp = prop === oldName ? newName : prop;
                newValues.set(newProp, val);
            }
            const newKey = this.createVariantKey(Array.from(newValues.entries()).map(([p, v]) => ({ property: p, value: v })));
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
    createVariantFromComponent(sourceComponentId, targetKey) {
        const entry = this.registry.getComponent(sourceComponentId);
        if (!entry?.componentSetId)
            return null;
        const source = this.sceneGraph.getNode(sourceComponentId);
        if (!source || source.type !== 'COMPONENT')
            return null;
        // Check if target key already exists
        const existing = this.registry.getVariantComponent(entry.componentSetId, targetKey);
        if (existing)
            return null;
        // Create new component
        const parentId = source.parentId;
        if (!parentId)
            return null;
        const newComponentId = this.sceneGraph.createNode('COMPONENT', parentId, -1, {
            ...this.extractComponentProperties(source),
            name: this.generateVariantName(source.name, targetKey),
        });
        // Clone children
        this.cloneComponentChildren(sourceComponentId, newComponentId);
        // Register in set
        this.registry.registerComponent(newComponentId, source.name, entry.componentSetId, targetKey);
        this.registry.addToComponentSet(entry.componentSetId, targetKey, newComponentId);
        return newComponentId;
    }
    /**
     * Generate a variant name from base name and key.
     */
    generateVariantName(baseName, key) {
        const parsed = this.parseVariantKey(key);
        const suffix = Array.from(parsed.values.values()).join(', ');
        return `${baseName}, ${suffix}`;
    }
    /**
     * Extract properties for cloning.
     */
    extractComponentProperties(component) {
        const { id, type, parentId, childIds, ...rest } = component;
        return rest;
    }
    /**
     * Clone children from source component to destination.
     */
    cloneComponentChildren(sourceId, destId) {
        const children = this.sceneGraph.getChildIds(sourceId);
        for (let i = 0; i < children.length; i++) {
            const childId = children[i];
            const child = this.sceneGraph.getNode(childId);
            if (!child)
                continue;
            const { id, parentId, childIds, ...props } = child;
            const clonedId = this.sceneGraph.createNode(child.type, destId, i, props);
            // Recursively clone
            this.cloneComponentChildren(childId, clonedId);
        }
    }
}
/**
 * Create a variant manager.
 */
export function createVariantManager(sceneGraph, registry) {
    return new VariantManager(sceneGraph, registry);
}
//# sourceMappingURL=variant-manager.js.map