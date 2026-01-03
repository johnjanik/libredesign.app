/**
 * DesignLibre Project Manifest Schema
 *
 * The `designlibre.json` file is the single source of truth for a design project.
 * It defines project structure, export targets, and collaboration settings.
 *
 * @version 1.0.0
 * @license MIT
 */

// =============================================================================
// Manifest Version
// =============================================================================

/**
 * Manifest schema version for forward compatibility
 */
export type ManifestVersion = '1.0.0';

// =============================================================================
// Core Manifest Structure
// =============================================================================

/**
 * Root manifest structure
 */
export interface DesignLibreManifest {
  /**
   * Schema version for parsing compatibility
   * @example "1.0.0"
   */
  readonly $schema: 'https://designlibre.app/schemas/manifest-v1.json';

  /**
   * Manifest format version
   */
  readonly version: ManifestVersion;

  /**
   * Project metadata
   */
  readonly project: ProjectMetadata;

  /**
   * Page definitions and structure
   */
  readonly pages: PageReference[];

  /**
   * Component library configuration
   */
  readonly components: ComponentLibraryConfig;

  /**
   * Design tokens (colors, typography, spacing)
   */
  readonly tokens: TokensConfig;

  /**
   * Asset management configuration
   */
  readonly assets: AssetsConfig;

  /**
   * Code export configurations
   */
  readonly exports: ExportConfig;

  /**
   * Version control and sync settings
   */
  readonly sync: SyncConfig;

  /**
   * Editor preferences (optional, can be .gitignore'd)
   */
  readonly editor?: EditorConfig;

  /**
   * Plugin/extension configurations
   */
  readonly plugins?: PluginConfig[];

  /**
   * Custom metadata for extensions
   */
  readonly meta?: Record<string, unknown>;
}

// =============================================================================
// Project Metadata
// =============================================================================

export interface ProjectMetadata {
  /**
   * Human-readable project name
   * @example "Acme Design System"
   */
  readonly name: string;

  /**
   * URL-safe project identifier
   * @example "acme-design-system"
   */
  readonly slug: string;

  /**
   * Project description
   */
  readonly description?: string;

  /**
   * Semantic version of the design system
   * @example "2.1.0"
   */
  readonly designVersion: string;

  /**
   * Project authors/maintainers
   */
  readonly authors: Author[];

  /**
   * Project license
   * @example "MIT" | "proprietary" | "CC-BY-4.0"
   */
  readonly license: string;

  /**
   * Project repository URL
   * @example "https://github.com/acme/design-system"
   */
  readonly repository?: string;

  /**
   * Project homepage
   */
  readonly homepage?: string;

  /**
   * Keywords for discoverability
   */
  readonly keywords?: string[];

  /**
   * Creation timestamp (ISO 8601)
   */
  readonly createdAt: string;

  /**
   * Last modification timestamp (ISO 8601)
   */
  readonly updatedAt: string;

  /**
   * Unique project identifier (UUID)
   */
  readonly id: string;
}

export interface Author {
  readonly name: string;
  readonly email?: string;
  readonly url?: string;
  readonly role?: 'owner' | 'maintainer' | 'contributor';
}

// =============================================================================
// Pages
// =============================================================================

export interface PageReference {
  /**
   * Unique page identifier
   */
  readonly id: string;

  /**
   * Display name
   */
  readonly name: string;

  /**
   * Relative path to page JSON file
   * @example "pages/home.json"
   */
  readonly path: string;

  /**
   * Page type for organization
   */
  readonly type: PageType;

  /**
   * Display order (lower = first)
   */
  readonly order: number;

  /**
   * Page grouping/folder
   * @example "Marketing" | "App Screens" | "Components"
   */
  readonly group?: string;

  /**
   * Page description
   */
  readonly description?: string;

  /**
   * Page status for workflow
   */
  readonly status?: PageStatus;

  /**
   * Thumbnail path for quick preview
   */
  readonly thumbnail?: string;
}

export type PageType =
  | 'canvas'      // Free-form design canvas
  | 'component'   // Component documentation page
  | 'prototype'   // Interactive prototype flow
  | 'specs'       // Developer specification page
  | 'archive';    // Archived/deprecated page

export type PageStatus =
  | 'draft'
  | 'in-review'
  | 'approved'
  | 'archived';

// =============================================================================
// Components
// =============================================================================

export interface ComponentLibraryConfig {
  /**
   * Path to components directory
   * @default "components"
   */
  readonly directory: string;

  /**
   * Component naming convention
   */
  readonly naming: NamingConvention;

  /**
   * Component organization strategy
   */
  readonly organization: ComponentOrganization;

  /**
   * External component library references
   */
  readonly externalLibraries?: ExternalLibrary[];

  /**
   * Auto-generate component documentation
   */
  readonly autoDocument: boolean;

  /**
   * Component categories for organization
   */
  readonly categories?: ComponentCategory[];
}

export type NamingConvention =
  | 'PascalCase'    // Button, CardHeader
  | 'kebab-case'    // button, card-header
  | 'camelCase';    // button, cardHeader

export type ComponentOrganization =
  | 'flat'          // All components in one directory
  | 'by-category'   // Grouped by category (buttons/, cards/, etc.)
  | 'atomic';       // Atomic design (atoms/, molecules/, organisms/)

export interface ExternalLibrary {
  /**
   * Library identifier
   */
  readonly id: string;

  /**
   * Display name
   */
  readonly name: string;

  /**
   * Library source
   */
  readonly source: LibrarySource;

  /**
   * Pinned version (optional)
   */
  readonly version?: string;

  /**
   * Auto-update settings
   */
  readonly autoUpdate: boolean;
}

export type LibrarySource =
  | { readonly type: 'local'; readonly path: string }
  | { readonly type: 'git'; readonly url: string; readonly branch?: string }
  | { readonly type: 'npm'; readonly package: string }
  | { readonly type: 'url'; readonly url: string };

export interface ComponentCategory {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly icon?: string;
}

// =============================================================================
// Design Tokens
// =============================================================================

export interface TokensConfig {
  /**
   * Path to tokens directory
   * @default "tokens"
   */
  readonly directory: string;

  /**
   * Token file format
   */
  readonly format: TokenFormat;

  /**
   * Token files to include
   */
  readonly files: TokenFile[];

  /**
   * Token transformation settings
   */
  readonly transform?: TokenTransform;
}

export type TokenFormat =
  | 'designlibre'           // Native format
  | 'style-dictionary'      // Amazon Style Dictionary
  | 'figma-tokens'          // Figma Tokens plugin format
  | 'w3c-design-tokens';    // W3C Design Tokens spec

export interface TokenFile {
  readonly path: string;
  readonly type: TokenType;
  readonly description?: string;
}

export type TokenType =
  | 'colors'
  | 'typography'
  | 'spacing'
  | 'sizing'
  | 'shadows'
  | 'borders'
  | 'radii'
  | 'opacity'
  | 'motion'
  | 'breakpoints'
  | 'z-index'
  | 'composite';  // Mixed token types

export interface TokenTransform {
  /**
   * CSS custom properties output
   */
  readonly css?: {
    readonly enabled: boolean;
    readonly outputPath: string;
    readonly prefix?: string;
  };

  /**
   * Tailwind CSS config output
   */
  readonly tailwind?: {
    readonly enabled: boolean;
    readonly outputPath: string;
  };

  /**
   * Swift/iOS output
   */
  readonly swift?: {
    readonly enabled: boolean;
    readonly outputPath: string;
  };

  /**
   * Kotlin/Android output
   */
  readonly kotlin?: {
    readonly enabled: boolean;
    readonly outputPath: string;
  };
}

// =============================================================================
// Assets
// =============================================================================

export interface AssetsConfig {
  /**
   * Path to assets directory
   * @default "assets"
   */
  readonly directory: string;

  /**
   * Asset subdirectories
   */
  readonly subdirectories: {
    readonly images: string;
    readonly icons: string;
    readonly fonts: string;
    readonly videos?: string;
    readonly lottie?: string;
  };

  /**
   * Git LFS configuration
   */
  readonly lfs: LfsConfig;

  /**
   * Image optimization settings
   */
  readonly optimization?: ImageOptimization;
}

export interface LfsConfig {
  /**
   * Enable Git LFS for large files
   */
  readonly enabled: boolean;

  /**
   * File patterns to track with LFS
   */
  readonly patterns: string[];

  /**
   * Size threshold for auto-LFS (in bytes)
   * @default 102400 (100KB)
   */
  readonly threshold?: number;
}

export interface ImageOptimization {
  /**
   * Maximum image dimension (width or height)
   */
  readonly maxDimension?: number;

  /**
   * JPEG quality (1-100)
   */
  readonly jpegQuality?: number;

  /**
   * Generate WebP versions
   */
  readonly generateWebp?: boolean;

  /**
   * Generate responsive sizes
   */
  readonly responsiveSizes?: number[];
}

// =============================================================================
// Code Export Configuration
// =============================================================================

export interface ExportConfig {
  /**
   * Output directory for generated code
   * @default "generated"
   */
  readonly outputDirectory: string;

  /**
   * Export targets
   */
  readonly targets: ExportTarget[];

  /**
   * Shared export settings
   */
  readonly settings: ExportSettings;
}

export interface ExportTarget {
  /**
   * Target identifier
   */
  readonly id: string;

  /**
   * Target platform
   */
  readonly platform: ExportPlatform;

  /**
   * Output subdirectory
   */
  readonly outputPath: string;

  /**
   * Enable this target
   */
  readonly enabled: boolean;

  /**
   * Platform-specific options
   */
  readonly options: PlatformExportOptions;
}

export type ExportPlatform =
  | 'react'
  | 'react-native'
  | 'vue'
  | 'svelte'
  | 'angular'
  | 'html-css'
  | 'swiftui'
  | 'uikit'
  | 'compose'
  | 'flutter';

export type PlatformExportOptions =
  | ReactExportOptions
  | SwiftUIExportOptions
  | ComposeExportOptions
  | HtmlCssExportOptions;

export interface ReactExportOptions {
  readonly platform: 'react' | 'react-native';
  /**
   * TypeScript or JavaScript
   */
  readonly language: 'typescript' | 'javascript';
  /**
   * Styling approach
   */
  readonly styling: 'css-modules' | 'styled-components' | 'tailwind' | 'inline' | 'emotion';
  /**
   * Component file structure
   */
  readonly structure: 'flat' | 'folder';  // Button.tsx vs Button/index.tsx
  /**
   * Include prop types/interfaces
   */
  readonly includeTypes: boolean;
  /**
   * Include Storybook stories
   */
  readonly includeStories: boolean;
  /**
   * Include unit tests
   */
  readonly includeTests: boolean;
}

export interface SwiftUIExportOptions {
  readonly platform: 'swiftui';
  /**
   * Minimum iOS version
   */
  readonly minimumVersion: string;
  /**
   * Include preview providers
   */
  readonly includePreviews: boolean;
  /**
   * Generate asset catalogs
   */
  readonly generateAssetCatalog: boolean;
  /**
   * Accessibility modifiers
   */
  readonly includeAccessibility: boolean;
}

export interface ComposeExportOptions {
  readonly platform: 'compose';
  /**
   * Minimum Android SDK
   */
  readonly minSdk: number;
  /**
   * Package name
   */
  readonly packageName: string;
  /**
   * Include preview annotations
   */
  readonly includePreviews: boolean;
  /**
   * Material Design version
   */
  readonly materialVersion: 2 | 3;
}

export interface HtmlCssExportOptions {
  readonly platform: 'html-css';
  /**
   * CSS methodology
   */
  readonly cssMethodology: 'bem' | 'utility' | 'plain';
  /**
   * Include CSS reset
   */
  readonly includeReset: boolean;
  /**
   * CSS preprocessor
   */
  readonly preprocessor: 'none' | 'scss' | 'less';
}

export interface ExportSettings {
  /**
   * Include source design reference in generated code
   */
  readonly includeSourceReference: boolean;

  /**
   * Auto-regenerate on design changes
   */
  readonly watchMode: boolean;

  /**
   * Preserve manual edits (merge vs overwrite)
   */
  readonly preserveManualEdits: boolean;

  /**
   * Code formatting
   */
  readonly formatting: {
    readonly indentSize: number;
    readonly useTabs: boolean;
    readonly lineWidth: number;
    readonly trailingComma: boolean;
    readonly singleQuote: boolean;
  };
}

// =============================================================================
// Sync & Version Control
// =============================================================================

export interface SyncConfig {
  /**
   * Version control provider
   */
  readonly vcs: VcsConfig;

  /**
   * Branch protection rules
   */
  readonly branchProtection?: BranchProtection[];

  /**
   * Auto-commit settings
   */
  readonly autoCommit?: AutoCommitConfig;

  /**
   * Cloud sync (future feature)
   */
  readonly cloud?: CloudSyncConfig;
}

export interface VcsConfig {
  /**
   * VCS provider
   */
  readonly provider: 'git' | 'none';

  /**
   * Default branch name
   * @default "main"
   */
  readonly defaultBranch: string;

  /**
   * Remote repository URL
   */
  readonly remote?: string;

  /**
   * Commit message template
   */
  readonly commitTemplate?: string;

  /**
   * Files to exclude from version control
   */
  readonly ignore?: string[];
}

export interface BranchProtection {
  /**
   * Branch pattern (glob)
   * @example "main" | "release/*"
   */
  readonly pattern: string;

  /**
   * Require pull request
   */
  readonly requirePullRequest: boolean;

  /**
   * Required approvals count
   */
  readonly requiredApprovals: number;

  /**
   * Allowed mergers
   */
  readonly allowedMergers: string[];  // Author emails or 'maintainers'
}

export interface AutoCommitConfig {
  /**
   * Enable auto-commit
   */
  readonly enabled: boolean;

  /**
   * Commit interval in seconds
   * @default 300 (5 minutes)
   */
  readonly interval: number;

  /**
   * Auto-commit message prefix
   */
  readonly messagePrefix: string;
}

export interface CloudSyncConfig {
  /**
   * Cloud provider (future)
   */
  readonly provider: 'designlibre-cloud' | 'self-hosted';

  /**
   * Sync endpoint
   */
  readonly endpoint?: string;

  /**
   * Real-time collaboration
   */
  readonly realtime: boolean;
}

// =============================================================================
// Editor Configuration
// =============================================================================

export interface EditorConfig {
  /**
   * Canvas settings
   */
  readonly canvas: {
    readonly backgroundColor: string;
    readonly showGrid: boolean;
    readonly gridSize: number;
    readonly snapToGrid: boolean;
    readonly snapToObjects: boolean;
    readonly rulerUnits: 'px' | 'pt' | 'rem' | 'percent';
  };

  /**
   * Default new frame settings
   */
  readonly defaultFrame: {
    readonly width: number;
    readonly height: number;
    readonly preset?: string;  // 'iphone-15' | 'desktop-1440' | etc.
  };

  /**
   * Autosave settings
   */
  readonly autosave: {
    readonly enabled: boolean;
    readonly intervalSeconds: number;
  };

  /**
   * UI preferences
   */
  readonly ui: {
    readonly theme: 'light' | 'dark' | 'system';
    readonly panelLayout: 'default' | 'compact' | 'custom';
    readonly showLayerPanel: boolean;
    readonly showInspectorPanel: boolean;
  };

  /**
   * Keyboard shortcut profile
   */
  readonly shortcuts: 'default' | 'figma' | 'sketch' | 'custom';
}

// =============================================================================
// Plugins
// =============================================================================

export interface PluginConfig {
  /**
   * Plugin identifier
   */
  readonly id: string;

  /**
   * Plugin name
   */
  readonly name: string;

  /**
   * Plugin version
   */
  readonly version: string;

  /**
   * Plugin source
   */
  readonly source: PluginSource;

  /**
   * Plugin-specific settings
   */
  readonly settings?: Record<string, unknown>;

  /**
   * Enable/disable plugin
   */
  readonly enabled: boolean;
}

export type PluginSource =
  | { readonly type: 'builtin' }
  | { readonly type: 'local'; readonly path: string }
  | { readonly type: 'npm'; readonly package: string }
  | { readonly type: 'url'; readonly url: string };

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Create a new default manifest
 */
export function createDefaultManifest(
  name: string,
  slug: string
): DesignLibreManifest {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  return {
    $schema: 'https://designlibre.app/schemas/manifest-v1.json',
    version: '1.0.0',

    project: {
      id,
      name,
      slug,
      designVersion: '0.1.0',
      authors: [],
      license: 'MIT',
      createdAt: now,
      updatedAt: now,
    },

    pages: [],

    components: {
      directory: 'components',
      naming: 'PascalCase',
      organization: 'by-category',
      autoDocument: true,
      categories: [
        { id: 'primitives', name: 'Primitives', description: 'Basic building blocks' },
        { id: 'components', name: 'Components', description: 'Reusable UI components' },
        { id: 'patterns', name: 'Patterns', description: 'Common UI patterns' },
        { id: 'templates', name: 'Templates', description: 'Page templates' },
      ],
    },

    tokens: {
      directory: 'tokens',
      format: 'designlibre',
      files: [
        { path: 'colors.json', type: 'colors' },
        { path: 'typography.json', type: 'typography' },
        { path: 'spacing.json', type: 'spacing' },
        { path: 'shadows.json', type: 'shadows' },
      ],
    },

    assets: {
      directory: 'assets',
      subdirectories: {
        images: 'images',
        icons: 'icons',
        fonts: 'fonts',
      },
      lfs: {
        enabled: true,
        patterns: [
          '*.png',
          '*.jpg',
          '*.jpeg',
          '*.gif',
          '*.webp',
          '*.svg',
          '*.woff',
          '*.woff2',
          '*.ttf',
          '*.otf',
          '*.mp4',
          '*.webm',
        ],
        threshold: 102400, // 100KB
      },
    },

    exports: {
      outputDirectory: 'generated',
      targets: [
        {
          id: 'react',
          platform: 'react',
          outputPath: 'react',
          enabled: true,
          options: {
            platform: 'react',
            language: 'typescript',
            styling: 'css-modules',
            structure: 'folder',
            includeTypes: true,
            includeStories: false,
            includeTests: false,
          },
        },
        {
          id: 'swiftui',
          platform: 'swiftui',
          outputPath: 'swiftui',
          enabled: true,
          options: {
            platform: 'swiftui',
            minimumVersion: '16.0',
            includePreviews: true,
            generateAssetCatalog: true,
            includeAccessibility: true,
          },
        },
        {
          id: 'compose',
          platform: 'compose',
          outputPath: 'compose',
          enabled: true,
          options: {
            platform: 'compose',
            minSdk: 24,
            packageName: 'com.example.design',
            includePreviews: true,
            materialVersion: 3,
          },
        },
      ],
      settings: {
        includeSourceReference: true,
        watchMode: false,
        preserveManualEdits: true,
        formatting: {
          indentSize: 2,
          useTabs: false,
          lineWidth: 100,
          trailingComma: true,
          singleQuote: true,
        },
      },
    },

    sync: {
      vcs: {
        provider: 'git',
        defaultBranch: 'main',
        ignore: [
          '.DS_Store',
          'node_modules/',
          '*.local',
          '.env*',
        ],
      },
    },

    editor: {
      canvas: {
        backgroundColor: '#1a1a1a',
        showGrid: true,
        gridSize: 8,
        snapToGrid: true,
        snapToObjects: true,
        rulerUnits: 'px',
      },
      defaultFrame: {
        width: 1440,
        height: 900,
        preset: 'desktop-1440',
      },
      autosave: {
        enabled: true,
        intervalSeconds: 30,
      },
      ui: {
        theme: 'dark',
        panelLayout: 'default',
        showLayerPanel: true,
        showInspectorPanel: true,
      },
      shortcuts: 'default',
    },
  };
}

/**
 * Validate a manifest object
 */
export function validateManifest(
  manifest: unknown
): { valid: true; manifest: DesignLibreManifest } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be an object'] };
  }

  const m = manifest as Record<string, unknown>;

  // Required fields
  if (!m['$schema']) errors.push('Missing $schema');
  if (!m['version']) errors.push('Missing version');
  if (!m['project']) errors.push('Missing project');
  if (!m['pages']) errors.push('Missing pages');
  if (!m['components']) errors.push('Missing components');
  if (!m['tokens']) errors.push('Missing tokens');
  if (!m['assets']) errors.push('Missing assets');
  if (!m['exports']) errors.push('Missing exports');
  if (!m['sync']) errors.push('Missing sync');

  // Project validation
  if (m['project'] && typeof m['project'] === 'object') {
    const p = m['project'] as Record<string, unknown>;
    if (!p['name']) errors.push('Missing project.name');
    if (!p['slug']) errors.push('Missing project.slug');
    if (!p['id']) errors.push('Missing project.id');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, manifest: manifest as DesignLibreManifest };
}
