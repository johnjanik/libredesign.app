/**
 * Component System Module
 *
 * Exports for the component and instance management system.
 */
export { ComponentRegistry, createComponentRegistry } from './component-registry';
export type { ComponentEntry, ComponentSet, VariantPropertyDef, } from './component-registry';
export { OverrideResolver, createOverrideResolver, OverridePath } from './override-resolver';
export type { ResolvedOverride, OverrideContext, } from './override-resolver';
export { ComponentManager, createComponentManager } from './component-manager';
export type { ComponentManagerEvents, ComponentCreationOptions, InstanceCreationOptions, } from './component-manager';
export { VariantManager, createVariantManager } from './variant-manager';
export type { VariantValue, ParsedVariantKey, } from './variant-manager';
//# sourceMappingURL=index.d.ts.map