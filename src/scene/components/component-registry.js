/**
 * Component Registry
 *
 * Stores and manages component definitions and their relationships.
 * Tracks which instances reference which components.
 */
/**
 * Component registry for tracking components and instances
 */
export class ComponentRegistry {
    components = new Map();
    componentSets = new Map();
    instanceToComponent = new Map();
    componentToInstances = new Map();
    /**
     * Register a new component.
     */
    registerComponent(id, name, componentSetId = null, variantKey = null) {
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
    unregisterComponent(id) {
        const entry = this.components.get(id);
        if (!entry)
            return;
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
    getComponent(id) {
        return this.components.get(id) ?? null;
    }
    /**
     * Check if a component exists.
     */
    hasComponent(id) {
        return this.components.has(id);
    }
    /**
     * Get all component IDs.
     */
    getAllComponentIds() {
        return Array.from(this.components.keys());
    }
    /**
     * Get all components.
     */
    getAllComponents() {
        return Array.from(this.components.values());
    }
    /**
     * Update component name.
     */
    updateComponentName(id, name) {
        const entry = this.components.get(id);
        if (!entry)
            return;
        this.components.set(id, {
            ...entry,
            name,
            modifiedAt: Date.now(),
        });
    }
    /**
     * Mark component as modified.
     */
    markComponentModified(id) {
        const entry = this.components.get(id);
        if (!entry)
            return;
        this.components.set(id, {
            ...entry,
            modifiedAt: Date.now(),
        });
    }
    /**
     * Register an instance referencing a component.
     */
    registerInstance(instanceId, componentId) {
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
    unregisterInstance(instanceId) {
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
    getComponentForInstance(instanceId) {
        return this.instanceToComponent.get(instanceId) ?? null;
    }
    /**
     * Get all instance IDs for a component.
     */
    getInstancesForComponent(componentId) {
        const instances = this.componentToInstances.get(componentId);
        return instances ? Array.from(instances) : [];
    }
    /**
     * Get instance count for a component.
     */
    getInstanceCount(componentId) {
        return this.componentToInstances.get(componentId)?.size ?? 0;
    }
    // =========================================================================
    // Component Sets (Variants)
    // =========================================================================
    /**
     * Create a new component set.
     */
    createComponentSet(id, name, variantProperties) {
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
    getComponentSet(id) {
        return this.componentSets.get(id) ?? null;
    }
    /**
     * Add a component to a component set.
     */
    addToComponentSet(setId, variantKey, componentId) {
        const set = this.componentSets.get(setId);
        if (!set)
            return;
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
    removeFromComponentSet(setId, variantKey) {
        const set = this.componentSets.get(setId);
        if (!set)
            return;
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
    getVariantComponent(setId, variantKey) {
        const set = this.componentSets.get(setId);
        return set?.variants.get(variantKey) ?? null;
    }
    /**
     * Delete a component set.
     */
    deleteComponentSet(id) {
        const set = this.componentSets.get(id);
        if (!set)
            return;
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
    getAllComponentSets() {
        return Array.from(this.componentSets.values());
    }
    /**
     * Clear all registry data.
     */
    clear() {
        this.components.clear();
        this.componentSets.clear();
        this.instanceToComponent.clear();
        this.componentToInstances.clear();
    }
    /**
     * Export registry data as JSON.
     */
    toJSON() {
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
    fromJSON(data) {
        this.clear();
        const components = data['components'];
        for (const [id, entry] of components) {
            this.components.set(id, entry);
            this.componentToInstances.set(id, new Set());
        }
        const componentSets = data['componentSets'];
        for (const [id, setData] of componentSets) {
            this.componentSets.set(id, {
                ...setData,
                variants: new Map(setData.variants),
            });
        }
        const instances = data['instances'];
        for (const [instanceId, componentId] of instances) {
            this.registerInstance(instanceId, componentId);
        }
    }
}
/**
 * Create a new component registry.
 */
export function createComponentRegistry() {
    return new ComponentRegistry();
}
//# sourceMappingURL=component-registry.js.map