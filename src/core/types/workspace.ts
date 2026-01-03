/**
 * Workspace Types (Internal: Trunk)
 *
 * A Trunk (Workspace) is the root container for all Trees (Projects).
 * This maps to the concept of a workspace directory or collection.
 */

/**
 * Trunk - Root workspace containing multiple Trees (projects)
 *
 * Internal naming: Trunk
 * Canonical naming: Workspace
 */
export interface Trunk {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Trees (projects) in this workspace */
  trees: TreeReference[];

  /** Workspace settings */
  settings: TrunkSettings;

  /** Creation timestamp */
  createdAt: number;

  /** Last opened timestamp */
  lastOpenedAt: number;
}

/**
 * Reference to a Tree without full data (for lazy loading)
 */
export interface TreeReference {
  /** Tree ID */
  id: string;

  /** Tree name */
  name: string;

  /** Local path or remote URL */
  path: string;

  /** Whether this is a cloud-synced project */
  isCloudSync: boolean;

  /** Thumbnail for quick preview */
  thumbnail?: string;

  /** Last modified timestamp */
  lastModifiedAt: number;
}

/**
 * Workspace-level settings
 */
export interface TrunkSettings {
  /** UI theme */
  theme: 'dark' | 'light' | 'system';

  /** Accent color for UI elements */
  accentColor: string;

  /** Side panel width in pixels */
  sidebarWidth: number;

  /** Enable auto-save */
  autoSave: boolean;

  /** Auto-save interval in milliseconds */
  autoSaveInterval: number;

  /** Enable cloud sync */
  syncEnabled: boolean;

  /** Recent tree IDs for quick access */
  recentTreeIds: string[];

  /** Recently opened leaf IDs */
  recentLeafIds: string[];
}

/**
 * Default workspace settings
 */
export const DEFAULT_TRUNK_SETTINGS: TrunkSettings = {
  theme: 'dark',
  accentColor: '#0d99ff',
  sidebarWidth: 280,
  autoSave: true,
  autoSaveInterval: 30000, // 30 seconds
  syncEnabled: false,
  recentTreeIds: [],
  recentLeafIds: [],
};

/**
 * Create a new Trunk with defaults
 */
export function createTrunk(
  name: string,
  settings?: Partial<TrunkSettings>
): Trunk {
  return {
    id: crypto.randomUUID(),
    name,
    trees: [],
    settings: { ...DEFAULT_TRUNK_SETTINGS, ...settings },
    createdAt: Date.now(),
    lastOpenedAt: Date.now(),
  };
}

/**
 * Create a tree reference
 */
export function createTreeReference(
  id: string,
  name: string,
  path: string,
  options?: Partial<Omit<TreeReference, 'id' | 'name' | 'path'>>
): TreeReference {
  const ref: TreeReference = {
    id,
    name,
    path,
    isCloudSync: options?.isCloudSync ?? false,
    lastModifiedAt: options?.lastModifiedAt ?? Date.now(),
  };
  if (options?.thumbnail !== undefined) {
    ref.thumbnail = options.thumbnail;
  }
  return ref;
}
