/**
 * Project Types (Internal: Tree, Branch, Leaf)
 *
 * Tree = Project (Git repository)
 * Branch = Version/variant (Git branch)
 * Leaf = Design document/page
 */

/**
 * Tree - A project with version control
 *
 * Internal naming: Tree
 * Canonical naming: Project
 */
export interface Tree {
  /** Unique identifier */
  id: string;

  /** Project name */
  name: string;

  /** Local filesystem path or remote URL */
  path: string;

  /** All branches in this project */
  branches: Branch[];

  /** Currently active branch ID */
  currentBranchId: string;

  /** Default branch ID (usually 'main') */
  defaultBranchId: string;

  /** Git remotes */
  remotes: GitRemote[];

  /** Project metadata */
  metadata: TreeMetadata;

  /** Whether this project syncs to cloud */
  isCloudSync: boolean;

  /** Creation timestamp */
  createdAt: number;

  /** Last modification timestamp */
  lastModifiedAt: number;
}

/**
 * Project metadata (bark)
 */
export interface TreeMetadata {
  /** Project description */
  description: string;

  /** Thumbnail image (base64 or URL) */
  thumbnail?: string;

  /** Tags for organization */
  tags: string[];

  /** Author name */
  author: string;

  /** Author email */
  authorEmail?: string;

  /** License identifier */
  license?: string;

  /** Project homepage/docs URL */
  homepage?: string;
}

/**
 * Git remote configuration
 */
export interface GitRemote {
  /** Remote name (e.g., "origin") */
  name: string;

  /** Remote URL */
  url: string;

  /** Remote type for icon/behavior */
  type: 'github' | 'gitlab' | 'bitbucket' | 'self-hosted' | 'unknown';
}

/**
 * Branch - A version/variant of a Tree
 *
 * Internal naming: Branch
 * Canonical naming: Branch (same)
 */
export interface Branch {
  /** Unique identifier */
  id: string;

  /** Branch name (e.g., "main", "feature/dark-mode") */
  name: string;

  /** Git reference */
  gitRef: string;

  /** Design documents in this branch */
  leaves: LeafReference[];

  /** Parent branch ID for visualization */
  parentBranchId: string | null;

  /** Latest commit info */
  lastCommit: Commit | null;

  /** Whether branch is protected from deletion */
  isProtected: boolean;

  /** Tracking remote branch (e.g., "origin/main") */
  upstream?: string;

  /** Commits ahead of upstream */
  ahead: number;

  /** Commits behind upstream */
  behind: number;

  /** Creation timestamp */
  createdAt: number;

  /** Last modification timestamp */
  lastModifiedAt: number;
}

/**
 * Git commit information
 */
export interface Commit {
  /** Full commit hash */
  hash: string;

  /** Short hash (7 chars) */
  shortHash: string;

  /** Commit message */
  message: string;

  /** Author name */
  author: string;

  /** Author email */
  email: string;

  /** Commit timestamp */
  timestamp: number;

  /** Parent commit hashes */
  parentHashes: string[];
}

/**
 * Reference to a Leaf without full data (for lazy loading)
 */
export interface LeafReference {
  /** Leaf ID */
  id: string;

  /** Display name */
  name: string;

  /** Leaf type */
  type: LeafType;

  /** Thumbnail for preview */
  thumbnail?: string;

  /** Last modified timestamp */
  lastModifiedAt: number;

  /** Sort order within branch */
  order: number;
}

/**
 * Leaf - An individual design document
 *
 * Internal naming: Leaf
 * Canonical naming: Page or Document
 */
export interface Leaf {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Leaf type */
  type: LeafType;

  /** Canvas/artboard settings */
  canvas: LeafCanvasSettings;

  /** Thumbnail image */
  thumbnail?: string;

  /** Creation timestamp */
  createdAt: number;

  /** Last modification timestamp */
  lastModifiedAt: number;

  /** File path relative to project root */
  relativePath: string;
}

/**
 * Type of design document
 */
export type LeafType =
  | 'design' // Standard design document
  | 'component' // Reusable component library
  | 'asset' // Static assets page
  | 'prototype'; // Interactive prototype

/**
 * Canvas settings for a Leaf
 */
export interface LeafCanvasSettings {
  /** Canvas width */
  width: number;

  /** Canvas height */
  height: number;

  /** Background color */
  backgroundColor: string;

  /** Show grid */
  gridEnabled: boolean;

  /** Grid size in pixels */
  gridSize: number;

  /** Snap to grid */
  snapToGrid: boolean;

  /** Show rulers */
  rulerEnabled: boolean;

  /** Zoom level (1 = 100%) */
  zoom: number;

  /** Viewport scroll position */
  scrollX: number;
  scrollY: number;
}

/**
 * Default canvas settings
 */
export const DEFAULT_CANVAS_SETTINGS: LeafCanvasSettings = {
  width: 1920,
  height: 1080,
  backgroundColor: '#ffffff',
  gridEnabled: true,
  gridSize: 8,
  snapToGrid: true,
  rulerEnabled: true,
  zoom: 1,
  scrollX: 0,
  scrollY: 0,
};

/**
 * Default tree metadata
 */
export const DEFAULT_TREE_METADATA: TreeMetadata = {
  description: '',
  tags: [],
  author: '',
};

/**
 * Create a new Tree (project)
 */
export function createTree(
  name: string,
  path: string,
  options?: {
    metadata?: Partial<TreeMetadata>;
    isCloudSync?: boolean;
  }
): Tree {
  const id = crypto.randomUUID();
  const mainBranch = createBranch('main', { isProtected: true });

  return {
    id,
    name,
    path,
    branches: [mainBranch],
    currentBranchId: mainBranch.id,
    defaultBranchId: mainBranch.id,
    remotes: [],
    metadata: { ...DEFAULT_TREE_METADATA, ...options?.metadata },
    isCloudSync: options?.isCloudSync ?? false,
    createdAt: Date.now(),
    lastModifiedAt: Date.now(),
  };
}

/**
 * Create a new Branch
 */
export function createBranch(
  name: string,
  options?: {
    parentBranchId?: string;
    isProtected?: boolean;
    gitRef?: string;
  }
): Branch {
  return {
    id: crypto.randomUUID(),
    name,
    gitRef: options?.gitRef ?? `refs/heads/${name}`,
    leaves: [],
    parentBranchId: options?.parentBranchId ?? null,
    lastCommit: null,
    isProtected: options?.isProtected ?? false,
    ahead: 0,
    behind: 0,
    createdAt: Date.now(),
    lastModifiedAt: Date.now(),
  };
}

/**
 * Create a new Leaf reference
 */
export function createLeafReference(
  id: string,
  name: string,
  type: LeafType = 'design',
  order: number = 0
): LeafReference {
  return {
    id,
    name,
    type,
    lastModifiedAt: Date.now(),
    order,
  };
}

/**
 * Create a new Leaf (full document)
 */
export function createLeaf(
  name: string,
  type: LeafType = 'design',
  canvas?: Partial<LeafCanvasSettings>
): Leaf {
  const id = crypto.randomUUID();
  return {
    id,
    name,
    type,
    canvas: { ...DEFAULT_CANVAS_SETTINGS, ...canvas },
    createdAt: Date.now(),
    lastModifiedAt: Date.now(),
    relativePath: `pages/${id}.json`,
  };
}

/**
 * Detect remote type from URL
 */
export function detectRemoteType(
  url: string
): GitRemote['type'] {
  if (url.includes('github.com')) return 'github';
  if (url.includes('gitlab.com')) return 'gitlab';
  if (url.includes('bitbucket.org')) return 'bitbucket';
  return 'self-hosted';
}

/**
 * Create a GitRemote
 */
export function createGitRemote(name: string, url: string): GitRemote {
  return {
    name,
    url,
    type: detectRemoteType(url),
  };
}
