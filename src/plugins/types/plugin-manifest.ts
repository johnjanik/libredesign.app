/**
 * Plugin Manifest Types
 *
 * Defines the structure for plugin.json manifest files that declare
 * plugin metadata, capabilities, resource limits, and entry points.
 */

/**
 * Semantic version string (e.g., "1.0.0", "2.1.3-beta.1")
 */
export type SemVer = string;

/**
 * Plugin identifier in reverse-domain notation
 * @example "com.example.my-plugin"
 */
export type PluginId = string;

/**
 * Resource capability scopes that can be requested
 */
export type CapabilityScope =
  | 'selection' // Current selection only
  | 'current-page' // Current page only
  | 'current-document' // Entire current document
  | 'all-documents'; // All open documents

/**
 * Node types that can be accessed
 */
export type NodeType =
  | 'FRAME'
  | 'GROUP'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'POLYGON'
  | 'STAR'
  | 'VECTOR'
  | 'TEXT'
  | 'IMAGE'
  | 'COMPONENT'
  | 'INSTANCE'
  | 'LINE'
  | '*'; // All types

/**
 * HTTP methods for network requests
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * UI capability types
 */
export type UICapabilityType =
  | 'panel' // Side panel
  | 'modal' // Modal dialog
  | 'context-menu' // Context menu items
  | 'toast'; // Toast notifications

/**
 * Read capabilities - what the plugin can read
 */
export interface ReadCapabilities {
  /** Node types the plugin can read */
  readonly types: readonly NodeType[];
  /** Scopes where reading is allowed */
  readonly scopes: readonly CapabilityScope[];
}

/**
 * Write capabilities - what the plugin can modify
 */
export interface WriteCapabilities {
  /** Node types the plugin can create/modify */
  readonly types: readonly NodeType[];
  /** Scopes where writing is allowed */
  readonly scopes: readonly CapabilityScope[];
}

/**
 * UI capabilities - what UI the plugin can show
 */
export interface UICapabilities {
  /** UI element types the plugin can use */
  readonly types: readonly UICapabilityType[];
  /** Where UI can be shown */
  readonly scopes: readonly ('main' | 'inspector' | 'toolbar')[];
}

/**
 * Network capabilities - what network access the plugin has
 */
export interface NetworkCapabilities {
  /** Allowed domains (e.g., "api.example.com", "*.example.com") */
  readonly domains: readonly string[];
  /** Allowed HTTP methods */
  readonly methods: readonly HttpMethod[];
}

/**
 * All capability declarations
 */
export interface PluginCapabilities {
  /** Read access capabilities */
  readonly read?: ReadCapabilities;
  /** Write access capabilities */
  readonly write?: WriteCapabilities;
  /** UI display capabilities */
  readonly ui?: UICapabilities;
  /** Network request capabilities */
  readonly network?: NetworkCapabilities;
  /** Access to clipboard */
  readonly clipboard?: boolean;
  /** Access to local storage */
  readonly storage?: boolean;
}

/**
 * Resource size string (e.g., "64MB", "10KB")
 */
export type SizeString = string;

/**
 * Duration string (e.g., "5s", "100ms", "1m")
 */
export type DurationString = string;

/**
 * Resource limits for the plugin
 */
export interface PluginLimits {
  /** Maximum memory usage (default: "64MB") */
  readonly memory: SizeString;
  /** Maximum execution time per tick (default: "50ms") */
  readonly executionTime: DurationString;
  /** Maximum storage quota (default: "10MB") */
  readonly storage: SizeString;
  /** Maximum API calls per minute (default: 1000) */
  readonly apiCallsPerMinute?: number;
  /** Maximum network requests per minute (default: 60) */
  readonly networkRequestsPerMinute?: number;
}

/**
 * Entry point configuration
 */
export interface PluginEntryPoints {
  /** Main plugin code entry point */
  readonly main: string;
  /** UI-specific code entry point (runs in iframe) */
  readonly ui?: string;
}

/**
 * Plugin author information
 */
export interface PluginAuthor {
  /** Author name */
  readonly name: string;
  /** Author email */
  readonly email?: string;
  /** Author website */
  readonly url?: string;
}

/**
 * Integrity hashes for plugin files
 * Maps file paths to SHA-384 hashes
 */
export type IntegrityHashes = Record<string, string>;

/**
 * Plugin manifest schema version
 */
export type ManifestSchemaVersion = '1.0.0';

/**
 * Complete plugin manifest structure
 */
export interface PluginManifest {
  /** Schema version for this manifest format */
  readonly schemaVersion: ManifestSchemaVersion;

  /** Unique plugin identifier (reverse-domain notation) */
  readonly id: PluginId;

  /** Plugin version (semver) */
  readonly version: SemVer;

  /** Human-readable plugin name */
  readonly name: string;

  /** Plugin description */
  readonly description?: string;

  /** Plugin author */
  readonly author?: PluginAuthor;

  /** Plugin homepage/repository URL */
  readonly homepage?: string;

  /** Plugin license (SPDX identifier) */
  readonly license?: string;

  /** Keywords for marketplace search */
  readonly keywords?: readonly string[];

  /** Plugin icon path (relative to plugin root) */
  readonly icon?: string;

  /** Capabilities requested by the plugin */
  readonly capabilities: PluginCapabilities;

  /** Resource limits */
  readonly limits: PluginLimits;

  /** Entry points */
  readonly entry: PluginEntryPoints;

  /** Integrity hashes for verification */
  readonly integrity: IntegrityHashes;

  /** Minimum DesignLibre version required */
  readonly minimumDesignLibreVersion?: SemVer;

  /** Dependencies on other plugins */
  readonly dependencies?: Record<PluginId, SemVer>;
}

/**
 * Default resource limits
 */
export const DEFAULT_LIMITS: PluginLimits = {
  memory: '64MB',
  executionTime: '50ms',
  storage: '10MB',
  apiCallsPerMinute: 1000,
  networkRequestsPerMinute: 60,
};

/**
 * Parse a size string to bytes
 * @example parseSize("64MB") => 67108864
 */
export function parseSize(size: SizeString): number {
  const match = /^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i.exec(size);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  const value = parseFloat(match[1]!);
  const unit = match[2]!.toUpperCase();
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };
  return Math.floor(value * multipliers[unit]!);
}

/**
 * Parse a duration string to milliseconds
 * @example parseDuration("5s") => 5000
 */
export function parseDuration(duration: DurationString): number {
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h)$/i.exec(duration);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = parseFloat(match[1]!);
  const unit = match[2]!.toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
  };
  return Math.floor(value * multipliers[unit]!);
}
