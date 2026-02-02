/**
 * Block Manager
 *
 * Manages block definitions, libraries, and instances.
 * Provides CRUD operations and search functionality.
 */

import { EventEmitter } from '@core/events/event-emitter';
import type {
  BlockDefinition,
  BlockInstance,
  BlockLibrary,
  BlockCategory,
  BlockAttributeDefinition,
} from '@core/types/block';
import {
  createBlockDefinition,
  createBlockInstance,
} from '@core/types/block';
import type { Point } from '@core/types/geometry';
import type { SerializedNode } from '@core/types/page-schema';

// =============================================================================
// Types
// =============================================================================

/**
 * Block manager events
 */
export type BlockManagerEvents = {
  'block:created': { block: BlockDefinition };
  'block:updated': { block: BlockDefinition };
  'block:deleted': { id: string };
  'library:loaded': { library: BlockLibrary };
  'library:unloaded': { id: string };
  'instance:created': { instance: BlockInstance };
  'instance:updated': { instance: BlockInstance };
  'instance:deleted': { id: string };
  [key: string]: unknown;
};

/**
 * Block search options
 */
export interface BlockSearchOptions {
  /** Search in name */
  searchName?: boolean;
  /** Search in description */
  searchDescription?: boolean;
  /** Search in tags */
  searchTags?: boolean;
  /** Filter by category */
  category?: BlockCategory;
  /** Filter by library */
  libraryId?: string;
  /** Maximum results */
  limit?: number;
}

// =============================================================================
// Block Manager
// =============================================================================

/**
 * Block manager - handles all block-related operations
 */
export class BlockManager extends EventEmitter<BlockManagerEvents> {
  /** Block definitions indexed by ID */
  private blocks: Map<string, BlockDefinition> = new Map();

  /** Block instances indexed by ID */
  private instances: Map<string, BlockInstance> = new Map();

  /** Libraries indexed by ID */
  private libraries: Map<string, BlockLibrary> = new Map();

  /** Blocks indexed by category */
  private byCategory: Map<BlockCategory, Set<string>> = new Map();

  /** Blocks indexed by library */
  private byLibrary: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.initializeCategories();
  }

  /**
   * Initialize category index
   */
  private initializeCategories(): void {
    const categories: BlockCategory[] = [
      'electrical-passive', 'electrical-active', 'electrical-power',
      'electrical-connectors', 'electrical-switches',
      'mechanical-fasteners', 'mechanical-bearings', 'mechanical-gears',
      'mechanical-symbols',
      'architectural-doors', 'architectural-furniture', 'architectural-fixtures',
      'architectural-symbols',
      'annotation-leaders', 'annotation-symbols', 'annotation-notes',
      'general-shapes', 'general-arrows', 'custom',
    ];

    for (const category of categories) {
      this.byCategory.set(category, new Set());
    }
  }

  // ===========================================================================
  // Block Definition Operations
  // ===========================================================================

  /**
   * Register a block definition
   */
  registerBlock(block: BlockDefinition): void {
    this.blocks.set(block.id, block);
    this.byCategory.get(block.category)?.add(block.id);
    this.emit('block:created', { block });
  }

  /**
   * Create and register a new block from geometry
   */
  createBlock(
    name: string,
    category: BlockCategory,
    geometry: SerializedNode[],
    options: {
      description?: string;
      tags?: string[];
      basePoint?: Point;
      attributes?: BlockAttributeDefinition[];
    } = {}
  ): BlockDefinition {
    const block = createBlockDefinition(name, category, geometry);

    // Apply options - handle optional description properly
    let finalBlock: BlockDefinition = {
      ...block,
      tags: options.tags ?? [],
      basePoint: options.basePoint ?? { x: 0, y: 0 },
      attributes: options.attributes ?? [],
    };

    if (options.description !== undefined) {
      finalBlock = { ...finalBlock, description: options.description };
    }

    this.registerBlock(finalBlock);
    return finalBlock;
  }

  /**
   * Update a block definition
   */
  updateBlock(id: string, updates: Partial<BlockDefinition>): BlockDefinition | null {
    const existing = this.blocks.get(id);
    if (!existing) return null;

    // If category changed, update index
    if (updates.category && updates.category !== existing.category) {
      this.byCategory.get(existing.category)?.delete(id);
      this.byCategory.get(updates.category)?.add(id);
    }

    const updated: BlockDefinition = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      updatedAt: new Date().toISOString(),
    };

    this.blocks.set(id, updated);
    this.emit('block:updated', { block: updated });
    return updated;
  }

  /**
   * Delete a block definition
   */
  deleteBlock(id: string): boolean {
    const block = this.blocks.get(id);
    if (!block) return false;

    this.byCategory.get(block.category)?.delete(id);
    this.blocks.delete(id);
    this.emit('block:deleted', { id });
    return true;
  }

  /**
   * Get a block definition by ID
   */
  getBlock(id: string): BlockDefinition | undefined {
    return this.blocks.get(id);
  }

  /**
   * Check if block exists
   */
  hasBlock(id: string): boolean {
    return this.blocks.has(id);
  }

  /**
   * Get all block definitions
   */
  getAllBlocks(): BlockDefinition[] {
    return Array.from(this.blocks.values());
  }

  /**
   * Get blocks by category
   */
  getBlocksByCategory(category: BlockCategory): BlockDefinition[] {
    const ids = this.byCategory.get(category);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.blocks.get(id))
      .filter((b): b is BlockDefinition => b !== undefined);
  }

  /**
   * Search blocks
   */
  searchBlocks(query: string, options: BlockSearchOptions = {}): BlockDefinition[] {
    const {
      searchName = true,
      searchDescription = true,
      searchTags = true,
      category,
      libraryId,
      limit,
    } = options;

    const lowerQuery = query.toLowerCase().trim();
    let results = this.getAllBlocks();

    // Filter by category
    if (category) {
      results = results.filter(b => b.category === category);
    }

    // Filter by library
    if (libraryId) {
      const libraryBlockIds = this.byLibrary.get(libraryId);
      if (libraryBlockIds) {
        results = results.filter(b => libraryBlockIds.has(b.id));
      } else {
        results = [];
      }
    }

    // Search
    if (lowerQuery) {
      results = results.filter(block => {
        if (searchName && block.name.toLowerCase().includes(lowerQuery)) return true;
        if (searchDescription && block.description?.toLowerCase().includes(lowerQuery)) return true;
        if (searchTags && block.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) return true;
        return false;
      });
    }

    // Limit
    if (limit && results.length > limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Get category counts
   */
  getCategoryCounts(): Map<BlockCategory, number> {
    const counts = new Map<BlockCategory, number>();
    for (const [category, ids] of this.byCategory) {
      counts.set(category, ids.size);
    }
    return counts;
  }

  // ===========================================================================
  // Block Instance Operations
  // ===========================================================================

  /**
   * Create a block instance
   */
  createInstance(
    blockId: string,
    position: Point,
    options: {
      name?: string;
      scale?: { x: number; y: number };
      rotation?: number;
      attributeValues?: Record<string, string>;
      layer?: string;
    } = {}
  ): BlockInstance | null {
    const block = this.blocks.get(blockId);
    if (!block) return null;

    // Merge default attribute values
    const attributeValues: Record<string, string> = {};
    for (const attr of block.attributes) {
      attributeValues[attr.tag] = options.attributeValues?.[attr.tag] ?? attr.defaultValue;
    }

    const instance = createBlockInstance(blockId, position, {
      ...options,
      attributeValues,
    });

    this.instances.set(instance.id, instance);
    this.emit('instance:created', { instance });
    return instance;
  }

  /**
   * Update an instance
   */
  updateInstance(id: string, updates: Partial<BlockInstance>): BlockInstance | null {
    const existing = this.instances.get(id);
    if (!existing) return null;

    const updated: BlockInstance = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      blockId: existing.blockId, // Prevent block change (use swap instead)
    };

    this.instances.set(id, updated);
    this.emit('instance:updated', { instance: updated });
    return updated;
  }

  /**
   * Update instance attribute value
   */
  updateInstanceAttribute(
    instanceId: string,
    tag: string,
    value: string
  ): BlockInstance | null {
    const instance = this.instances.get(instanceId);
    if (!instance) return null;

    return this.updateInstance(instanceId, {
      attributeValues: {
        ...instance.attributeValues,
        [tag]: value,
      },
    });
  }

  /**
   * Delete an instance
   */
  deleteInstance(id: string): boolean {
    if (!this.instances.has(id)) return false;

    this.instances.delete(id);
    this.emit('instance:deleted', { id });
    return true;
  }

  /**
   * Get an instance by ID
   */
  getInstance(id: string): BlockInstance | undefined {
    return this.instances.get(id);
  }

  /**
   * Get all instances of a block
   */
  getInstancesOfBlock(blockId: string): BlockInstance[] {
    return Array.from(this.instances.values())
      .filter(inst => inst.blockId === blockId);
  }

  /**
   * Get all instances
   */
  getAllInstances(): BlockInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Explode an instance (convert to geometry)
   * Returns true if successful
   */
  explodeInstance(id: string): boolean {
    const instance = this.instances.get(id);
    if (!instance || instance.exploded) return false;

    return this.updateInstance(id, { exploded: true }) !== null;
  }

  // ===========================================================================
  // Library Operations
  // ===========================================================================

  /**
   * Load a block library
   */
  loadLibrary(library: BlockLibrary): void {
    this.libraries.set(library.id, library);
    this.byLibrary.set(library.id, new Set());

    // Register all blocks from the library
    for (const block of library.blocks) {
      this.registerBlock(block);
      this.byLibrary.get(library.id)?.add(block.id);
    }

    this.emit('library:loaded', { library });
  }

  /**
   * Unload a library (optionally keeping blocks)
   */
  unloadLibrary(id: string, keepBlocks: boolean = false): void {
    const library = this.libraries.get(id);
    if (!library) return;

    if (!keepBlocks) {
      const blockIds = this.byLibrary.get(id);
      if (blockIds) {
        for (const blockId of blockIds) {
          this.deleteBlock(blockId);
        }
      }
    }

    this.byLibrary.delete(id);
    this.libraries.delete(id);
    this.emit('library:unloaded', { id });
  }

  /**
   * Get a library by ID
   */
  getLibrary(id: string): BlockLibrary | undefined {
    return this.libraries.get(id);
  }

  /**
   * Get all libraries
   */
  getAllLibraries(): BlockLibrary[] {
    return Array.from(this.libraries.values());
  }

  /**
   * Get blocks in a library
   */
  getBlocksInLibrary(libraryId: string): BlockDefinition[] {
    const blockIds = this.byLibrary.get(libraryId);
    if (!blockIds) return [];

    return Array.from(blockIds)
      .map(id => this.blocks.get(id))
      .filter((b): b is BlockDefinition => b !== undefined);
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Get block count
   */
  get blockCount(): number {
    return this.blocks.size;
  }

  /**
   * Get instance count
   */
  get instanceCount(): number {
    return this.instances.size;
  }

  /**
   * Get library count
   */
  get libraryCount(): number {
    return this.libraries.size;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.blocks.clear();
    this.instances.clear();
    this.libraries.clear();
    for (const ids of this.byCategory.values()) {
      ids.clear();
    }
    this.byLibrary.clear();
  }

  /**
   * Export block to JSON
   */
  exportBlock(id: string): string | null {
    const block = this.blocks.get(id);
    if (!block) return null;
    return JSON.stringify(block, null, 2);
  }

  /**
   * Import block from JSON
   */
  importBlock(json: string): BlockDefinition | null {
    try {
      const block = JSON.parse(json) as BlockDefinition;
      if (!block.id || !block.name || !block.category) {
        return null;
      }
      this.registerBlock(block);
      return block;
    } catch {
      return null;
    }
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a block manager
 */
export function createBlockManager(): BlockManager {
  return new BlockManager();
}

// =============================================================================
// Category Metadata
// =============================================================================

/**
 * Category display information
 */
export const BLOCK_CATEGORY_INFO: Record<BlockCategory, {
  name: string;
  icon: string;
  description: string;
  group: string;
}> = {
  'electrical-passive': {
    name: 'Passive Components',
    icon: 'lucide:minus',
    description: 'Resistors, capacitors, inductors',
    group: 'Electrical',
  },
  'electrical-active': {
    name: 'Active Components',
    icon: 'lucide:cpu',
    description: 'Transistors, ICs, op-amps',
    group: 'Electrical',
  },
  'electrical-power': {
    name: 'Power Symbols',
    icon: 'lucide:zap',
    description: 'Power supplies, ground symbols',
    group: 'Electrical',
  },
  'electrical-connectors': {
    name: 'Connectors',
    icon: 'lucide:plug',
    description: 'Plugs, terminals, headers',
    group: 'Electrical',
  },
  'electrical-switches': {
    name: 'Switches',
    icon: 'lucide:toggle-left',
    description: 'Switches, relays',
    group: 'Electrical',
  },
  'mechanical-fasteners': {
    name: 'Fasteners',
    icon: 'lucide:circle-dot',
    description: 'Bolts, screws, nuts',
    group: 'Mechanical',
  },
  'mechanical-bearings': {
    name: 'Bearings',
    icon: 'lucide:circle',
    description: 'Bearings, bushings',
    group: 'Mechanical',
  },
  'mechanical-gears': {
    name: 'Gears',
    icon: 'lucide:settings',
    description: 'Gears, sprockets',
    group: 'Mechanical',
  },
  'mechanical-symbols': {
    name: 'Mech Symbols',
    icon: 'lucide:hash',
    description: 'Weld symbols, surface finish',
    group: 'Mechanical',
  },
  'architectural-doors': {
    name: 'Doors & Windows',
    icon: 'lucide:door-open',
    description: 'Doors, windows',
    group: 'Architectural',
  },
  'architectural-furniture': {
    name: 'Furniture',
    icon: 'lucide:armchair',
    description: 'Tables, chairs',
    group: 'Architectural',
  },
  'architectural-fixtures': {
    name: 'Fixtures',
    icon: 'lucide:lightbulb',
    description: 'Plumbing fixtures, outlets',
    group: 'Architectural',
  },
  'architectural-symbols': {
    name: 'Arch Symbols',
    icon: 'lucide:compass',
    description: 'Section marks, north arrows',
    group: 'Architectural',
  },
  'annotation-leaders': {
    name: 'Leaders',
    icon: 'lucide:arrow-right',
    description: 'Leaders, callouts',
    group: 'Annotations',
  },
  'annotation-symbols': {
    name: 'GD&T Symbols',
    icon: 'lucide:target',
    description: 'Datum, GD&T symbols',
    group: 'Annotations',
  },
  'annotation-notes': {
    name: 'Note Blocks',
    icon: 'lucide:sticky-note',
    description: 'Note blocks, title blocks',
    group: 'Annotations',
  },
  'general-shapes': {
    name: 'Basic Shapes',
    icon: 'lucide:shapes',
    description: 'Common geometric shapes',
    group: 'General',
  },
  'general-arrows': {
    name: 'Arrows',
    icon: 'lucide:move-right',
    description: 'Arrows, direction indicators',
    group: 'General',
  },
  'custom': {
    name: 'Custom',
    icon: 'lucide:box',
    description: 'User-defined blocks',
    group: 'General',
  },
};

/**
 * Get categories grouped by their group
 */
export function getCategoriesByGroup(): Map<string, BlockCategory[]> {
  const groups = new Map<string, BlockCategory[]>();

  for (const [category, info] of Object.entries(BLOCK_CATEGORY_INFO)) {
    const existing = groups.get(info.group) ?? [];
    existing.push(category as BlockCategory);
    groups.set(info.group, existing);
  }

  return groups;
}
