/**
 * Asset Types
 *
 * Type definitions for user-saved reusable compositions (assets).
 */

/**
 * A saved asset (reusable composition)
 */
export interface SavedAsset {
  /** Unique asset ID */
  id: string;
  /** User-provided name */
  name: string;
  /** Category for organization */
  category: string;
  /** Thumbnail data URL (PNG) */
  thumbnail?: string;
  /** Serialized node tree */
  nodeData: SerializedAssetNode;
  /** Tags for search/filtering */
  tags: string[];
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
}

/**
 * Serialized node for asset storage
 */
export interface SerializedAssetNode {
  /** Node type */
  type: string;
  /** Node name */
  name: string;
  /** Node properties (excluding children) */
  properties: Record<string, unknown>;
  /** Child nodes */
  children: SerializedAssetNode[];
}

/**
 * Asset category
 */
export interface AssetCategory {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Default asset categories
 */
export const DEFAULT_ASSET_CATEGORIES: AssetCategory[] = [
  { id: 'layouts', name: 'Layouts' },
  { id: 'headers', name: 'Headers' },
  { id: 'footers', name: 'Footers' },
  { id: 'cards', name: 'Cards' },
  { id: 'forms', name: 'Forms' },
  { id: 'navigation', name: 'Navigation' },
  { id: 'modals', name: 'Modals' },
  { id: 'icons', name: 'Icons' },
  { id: 'other', name: 'Other' },
];
