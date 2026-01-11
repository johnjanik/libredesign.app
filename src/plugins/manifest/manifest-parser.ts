/**
 * Manifest Parser
 *
 * Parses and validates plugin.json manifest files.
 */

import Ajv from 'ajv';
import type { PluginManifest, PluginLimits, PluginCapabilities } from '../types/plugin-manifest';
import { DEFAULT_LIMITS } from '../types/plugin-manifest';
import { MANIFEST_SCHEMA, type ManifestValidationResult } from './manifest-schema';

/**
 * AJV instance for validation
 */
const ajv = new Ajv({ allErrors: true, strict: false });

/**
 * Compiled schema validator
 */
let validateManifest: ReturnType<typeof ajv.compile> | null = null;

/**
 * Get or create the manifest validator
 */
function getValidator(): ReturnType<typeof ajv.compile> {
  if (!validateManifest) {
    validateManifest = ajv.compile(MANIFEST_SCHEMA);
  }
  return validateManifest;
}

/**
 * Parse result
 */
export interface ParseResult {
  readonly success: boolean;
  readonly manifest?: PluginManifest;
  readonly errors?: readonly string[];
}

/**
 * Parse a manifest from JSON string
 */
export function parseManifest(json: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return {
      success: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  return parseManifestObject(parsed);
}

/**
 * Parse a manifest from an object
 */
export function parseManifestObject(obj: unknown): ParseResult {
  // Validate against schema
  const validate = getValidator();
  const valid = validate(obj);

  if (!valid) {
    const errors = validate.errors?.map((e) => {
      const path = e.instancePath || 'root';
      return `${path}: ${e.message}`;
    }) ?? ['Unknown validation error'];

    return {
      success: false,
      errors,
    };
  }

  // Apply defaults
  const manifest = applyDefaults(obj as Partial<PluginManifest>);

  // Additional validation
  const additionalErrors = validateManifestRules(manifest);
  if (additionalErrors.length > 0) {
    return {
      success: false,
      errors: additionalErrors,
    };
  }

  return {
    success: true,
    manifest,
  };
}

/**
 * Apply default values to a partial manifest
 */
function applyDefaults(partial: Partial<PluginManifest>): PluginManifest {
  // Build limits with defaults
  const limits = {
    memory: partial.limits?.memory ?? DEFAULT_LIMITS.memory,
    executionTime: partial.limits?.executionTime ?? DEFAULT_LIMITS.executionTime,
    storage: partial.limits?.storage ?? DEFAULT_LIMITS.storage,
  } as PluginLimits;

  if (partial.limits?.apiCallsPerMinute !== undefined) {
    (limits as { apiCallsPerMinute?: number }).apiCallsPerMinute = partial.limits.apiCallsPerMinute;
  }
  if (partial.limits?.networkRequestsPerMinute !== undefined) {
    (limits as { networkRequestsPerMinute?: number }).networkRequestsPerMinute = partial.limits.networkRequestsPerMinute;
  }

  // Build capabilities - only include defined properties
  const capabilities: PluginCapabilities = {};
  if (partial.capabilities?.read) {
    (capabilities as { read?: typeof partial.capabilities.read }).read = partial.capabilities.read;
  }
  if (partial.capabilities?.write) {
    (capabilities as { write?: typeof partial.capabilities.write }).write = partial.capabilities.write;
  }
  if (partial.capabilities?.ui) {
    (capabilities as { ui?: typeof partial.capabilities.ui }).ui = partial.capabilities.ui;
  }
  if (partial.capabilities?.network) {
    (capabilities as { network?: typeof partial.capabilities.network }).network = partial.capabilities.network;
  }
  if (partial.capabilities?.clipboard !== undefined) {
    (capabilities as { clipboard?: boolean }).clipboard = partial.capabilities.clipboard;
  }
  if (partial.capabilities?.storage !== undefined) {
    (capabilities as { storage?: boolean }).storage = partial.capabilities.storage;
  }

  // Build manifest - only include defined optional properties
  const manifest = {
    schemaVersion: partial.schemaVersion ?? '1.0.0',
    id: partial.id!,
    version: partial.version!,
    name: partial.name!,
    capabilities,
    limits,
    entry: partial.entry!,
    integrity: partial.integrity ?? {},
  } as PluginManifest;

  if (partial.description) {
    (manifest as { description?: string }).description = partial.description;
  }
  if (partial.author) {
    (manifest as { author?: typeof partial.author }).author = partial.author;
  }
  if (partial.homepage) {
    (manifest as { homepage?: string }).homepage = partial.homepage;
  }
  if (partial.license) {
    (manifest as { license?: string }).license = partial.license;
  }
  if (partial.keywords) {
    (manifest as { keywords?: typeof partial.keywords }).keywords = partial.keywords;
  }
  if (partial.icon) {
    (manifest as { icon?: string }).icon = partial.icon;
  }
  if (partial.minimumDesignLibreVersion) {
    (manifest as { minimumDesignLibreVersion?: string }).minimumDesignLibreVersion = partial.minimumDesignLibreVersion;
  }
  if (partial.dependencies) {
    (manifest as { dependencies?: typeof partial.dependencies }).dependencies = partial.dependencies;
  }

  return manifest;
}

/**
 * Additional validation rules beyond JSON Schema
 */
function validateManifestRules(manifest: PluginManifest): string[] {
  const errors: string[] = [];

  // Validate plugin ID format (reverse domain notation)
  if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/.test(manifest.id)) {
    errors.push('Plugin ID must be in reverse domain notation (e.g., com.example.my-plugin)');
  }

  // Validate version is valid semver
  if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(manifest.version)) {
    errors.push('Version must be valid semver (e.g., 1.0.0, 2.1.3-beta.1)');
  }

  // Validate entry point exists
  if (!manifest.entry.main) {
    errors.push('Entry point "main" is required');
  }

  // Validate network domains if network capability is declared
  if (manifest.capabilities.network) {
    for (const domain of manifest.capabilities.network.domains) {
      // Basic domain validation
      if (!/^(\*\.)?[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)*$/.test(domain)) {
        errors.push(`Invalid domain pattern: ${domain}`);
      }
    }
  }

  // Validate size strings
  const sizePattern = /^\d+(?:\.\d+)?\s*(B|KB|MB|GB)$/i;
  if (!sizePattern.test(manifest.limits.memory)) {
    errors.push('Invalid memory limit format');
  }
  if (!sizePattern.test(manifest.limits.storage)) {
    errors.push('Invalid storage limit format');
  }

  // Validate duration string
  const durationPattern = /^\d+(?:\.\d+)?\s*(ms|s|m|h)$/i;
  if (!durationPattern.test(manifest.limits.executionTime)) {
    errors.push('Invalid executionTime format');
  }

  return errors;
}

/**
 * Validate manifest and return detailed result
 */
export function validateManifestFull(obj: unknown): ManifestValidationResult {
  const result = parseManifestObject(obj);

  if (result.success && result.manifest) {
    return {
      valid: true,
      errors: [],
      manifest: result.manifest,
    };
  }

  return {
    valid: false,
    errors: result.errors ?? [],
  };
}

/**
 * Quick validation check (boolean result)
 */
export function isValidManifest(obj: unknown): boolean {
  return parseManifestObject(obj).success;
}
