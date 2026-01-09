/**
 * Library Component Registry
 *
 * Manages pre-built, reusable UI components that can be dragged onto the canvas.
 * These are distinct from user-created components - they're predefined templates
 * with UnoCSS mappings for design-to-code workflow.
 */

import { EventEmitter } from '@core/events/event-emitter';

// =============================================================================
// Types
// =============================================================================

/**
 * Component categories for organization in the library panel
 */
export type ComponentCategory =
  | 'device-frames'
  | 'layout'
  | 'navigation'
  | 'typography'
  | 'buttons'
  | 'forms'
  | 'data-display'
  | 'feedback'
  | 'overlays'
  | 'media'
  | 'icons'
  | 'utility';

/**
 * Component variant definition
 */
export interface LibraryComponentVariant {
  /** Variant identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Variant-specific property values */
  readonly propertyValues: Record<string, unknown>;
  /** UnoCSS classes for this variant */
  readonly unoClasses: string[];
}

/**
 * Component property definition
 */
export interface LibraryPropertyDefinition {
  /** Property identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Property type */
  readonly type: 'boolean' | 'text' | 'number' | 'enum' | 'color';
  /** Default value */
  readonly defaultValue: unknown;
  /** Enum options (if type is 'enum') */
  readonly options?: string[];
  /** Description for tooltips */
  readonly description?: string;
  /** Min value (for numbers) */
  readonly min?: number;
  /** Max value (for numbers) */
  readonly max?: number;
}

/**
 * Slot definition for nested content
 */
export interface LibrarySlotDefinition {
  /** Slot identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Allow multiple children */
  readonly allowMultiple: boolean;
  /** Allowed component categories */
  readonly allowedCategories?: ComponentCategory[];
  /** Default placeholder text */
  readonly placeholder?: string;
}

/**
 * Node structure for library components
 */
export interface LibraryNodeStructure {
  /** Node type to create */
  readonly type: 'FRAME' | 'RECTANGLE' | 'ELLIPSE' | 'TEXT' | 'INSTANCE';
  /** Node name */
  readonly name: string;
  /** Initial properties */
  readonly properties: Record<string, unknown>;
  /** Child nodes */
  readonly children?: LibraryNodeStructure[];
  /** UnoCSS classes mapped to this node */
  readonly unoClasses?: string[];
  /** Property bindings - which component props affect this node */
  readonly propertyBindings?: PropertyBinding[];
  /** Slot ID if this is a slot container */
  readonly slotId?: string;
}

/**
 * Property binding - connects component prop to node property
 */
export interface PropertyBinding {
  /** Property ID from component */
  readonly propertyId: string;
  /** Path to target property on node */
  readonly targetPath: string[];
  /** Optional value mapping */
  readonly valueMap?: Record<string, unknown>;
}

/**
 * Library component definition
 */
export interface LibraryComponent {
  /** Unique component identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Component category */
  readonly category: ComponentCategory;
  /** Brief description */
  readonly description: string;
  /** Search tags */
  readonly tags: string[];
  /** Component icon (iconify name) */
  readonly icon: string;
  /** Property definitions */
  readonly properties: LibraryPropertyDefinition[];
  /** Variant definitions */
  readonly variants: LibraryComponentVariant[];
  /** Slot definitions */
  readonly slots: LibrarySlotDefinition[];
  /** Node structure template */
  readonly structure: LibraryNodeStructure;
  /** Base UnoCSS classes */
  readonly unoClasses: string[];
  /** Default size (width, height) */
  readonly defaultSize: { width: number; height: number };
  /** Thumbnail image data URL (optional) */
  readonly thumbnail?: string;
}

/**
 * Registry events
 */
export type LibraryRegistryEvents = {
  'component:registered': { component: LibraryComponent };
  'component:unregistered': { id: string };
  'components:loaded': { count: number };
  [key: string]: unknown;
};

// =============================================================================
// Library Component Registry
// =============================================================================

/**
 * Registry for library components
 */
export class LibraryComponentRegistry extends EventEmitter<LibraryRegistryEvents> {
  private components: Map<string, LibraryComponent> = new Map();
  private byCategory: Map<ComponentCategory, Set<string>> = new Map();

  constructor() {
    super();
    this.initializeCategories();
  }

  /**
   * Initialize category sets
   */
  private initializeCategories(): void {
    const categories: ComponentCategory[] = [
      'device-frames', 'layout', 'navigation', 'typography', 'buttons', 'forms',
      'data-display', 'feedback', 'overlays', 'media', 'icons', 'utility'
    ];
    for (const category of categories) {
      this.byCategory.set(category, new Set());
    }
  }

  /**
   * Register a library component
   */
  register(component: LibraryComponent): void {
    this.components.set(component.id, component);
    this.byCategory.get(component.category)?.add(component.id);
    this.emit('component:registered', { component });
  }

  /**
   * Register multiple components
   */
  registerAll(components: LibraryComponent[]): void {
    for (const component of components) {
      this.register(component);
    }
    this.emit('components:loaded', { count: components.length });
  }

  /**
   * Unregister a component
   */
  unregister(id: string): void {
    const component = this.components.get(id);
    if (component) {
      this.byCategory.get(component.category)?.delete(id);
      this.components.delete(id);
      this.emit('component:unregistered', { id });
    }
  }

  /**
   * Get a component by ID
   */
  get(id: string): LibraryComponent | undefined {
    return this.components.get(id);
  }

  /**
   * Check if component exists
   */
  has(id: string): boolean {
    return this.components.has(id);
  }

  /**
   * Get all components
   */
  getAll(): LibraryComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get components by category
   */
  getByCategory(category: ComponentCategory): LibraryComponent[] {
    const ids = this.byCategory.get(category);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.components.get(id))
      .filter((c): c is LibraryComponent => c !== undefined);
  }

  /**
   * Get all categories with their component counts
   */
  getCategoryCounts(): Map<ComponentCategory, number> {
    const counts = new Map<ComponentCategory, number>();
    for (const [category, ids] of this.byCategory) {
      counts.set(category, ids.size);
    }
    return counts;
  }

  /**
   * Search components by name or tags
   */
  search(query: string): LibraryComponent[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return this.getAll();

    return this.getAll().filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery) ||
      c.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get component count
   */
  get size(): number {
    return this.components.size;
  }

  /**
   * Clear all components
   */
  clear(): void {
    this.components.clear();
    for (const ids of this.byCategory.values()) {
      ids.clear();
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a library component registry
 */
export function createLibraryComponentRegistry(): LibraryComponentRegistry {
  return new LibraryComponentRegistry();
}

/**
 * Helper to create a library component definition
 */
export function defineLibraryComponent(
  definition: Omit<LibraryComponent, 'id'> & { id?: string }
): LibraryComponent {
  return {
    id: definition.id ?? `lib-${definition.name.toLowerCase().replace(/\s+/g, '-')}`,
    ...definition,
  } as LibraryComponent;
}

// =============================================================================
// Category Metadata
// =============================================================================

/**
 * Category display information
 */
export const CATEGORY_INFO: Record<ComponentCategory, { name: string; icon: string; description: string }> = {
  'device-frames': {
    name: 'Device Frames',
    icon: 'lucide:smartphone',
    description: 'Device screen templates for responsive design',
  },
  'layout': {
    name: 'Layout',
    icon: 'lucide:layout',
    description: 'Structural components for organizing content',
  },
  'navigation': {
    name: 'Navigation',
    icon: 'lucide:compass',
    description: 'Components for user navigation and wayfinding',
  },
  'typography': {
    name: 'Typography',
    icon: 'lucide:type',
    description: 'Text and content components',
  },
  'buttons': {
    name: 'Buttons',
    icon: 'lucide:mouse-pointer-click',
    description: 'Interactive button elements',
  },
  'forms': {
    name: 'Forms',
    icon: 'lucide:text-cursor-input',
    description: 'Input and form control components',
  },
  'data-display': {
    name: 'Data Display',
    icon: 'lucide:table',
    description: 'Components for presenting information',
  },
  'feedback': {
    name: 'Feedback',
    icon: 'lucide:bell',
    description: 'User feedback and status communication',
  },
  'overlays': {
    name: 'Overlays',
    icon: 'lucide:layers',
    description: 'Components that appear above page content',
  },
  'media': {
    name: 'Media',
    icon: 'lucide:image',
    description: 'Images, video, and media content',
  },
  'icons': {
    name: 'Icons',
    icon: 'lucide:smile',
    description: 'Iconography components',
  },
  'utility': {
    name: 'Utility',
    icon: 'lucide:wrench',
    description: 'Helper components for common patterns',
  },
};

/**
 * Get ordered list of categories
 */
export function getOrderedCategories(): ComponentCategory[] {
  return [
    'device-frames',
    'layout',
    'navigation',
    'typography',
    'buttons',
    'forms',
    'data-display',
    'feedback',
    'overlays',
    'media',
    'icons',
    'utility',
  ];
}
