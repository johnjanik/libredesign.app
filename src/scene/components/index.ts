/**
 * Component System Module
 *
 * Exports for the component and instance management system.
 */

// Component Registry
export { ComponentRegistry, createComponentRegistry } from './component-registry';
export type {
  ComponentEntry,
  ComponentSet,
  VariantPropertyDef,
} from './component-registry';

// Override Resolver
export { OverrideResolver, createOverrideResolver, OverridePath } from './override-resolver';
export type {
  ResolvedOverride,
  OverrideContext,
} from './override-resolver';

// Component Manager
export { ComponentManager, createComponentManager } from './component-manager';
export type {
  ComponentManagerEvents,
  ComponentCreationOptions,
  InstanceCreationOptions,
} from './component-manager';

// Variant Manager
export { VariantManager, createVariantManager } from './variant-manager';
export type {
  VariantValue,
  ParsedVariantKey,
} from './variant-manager';
