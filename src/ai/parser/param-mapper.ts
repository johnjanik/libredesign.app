/**
 * Parameter Mapper
 *
 * Maps alternative parameter names to canonical names and performs
 * basic type normalization for tool parameters.
 */

import type { ToolSchema, JSONSchemaProperty } from './types';
import { PARAMETER_ALIASES, getCanonicalParamName } from './config';
import { mapParametersToSchema } from './fuzzy-matcher';

// =============================================================================
// Types
// =============================================================================

/** Internal coercion record for parameter mapper */
export interface ParamCoercion {
  /** Parameter name */
  parameter: string;
  /** Original value */
  from: unknown;
  /** Coerced value */
  to: unknown;
  /** Whether coercion was applied */
  coerced: boolean;
}

export interface ParameterMappingResult {
  /** Mapped parameters with canonical names */
  parameters: Record<string, unknown>;
  /** Parameters that couldn't be mapped */
  unmapped: string[];
  /** Mapping details for each parameter */
  mappings: ParameterMapping[];
  /** Type coercions that were applied */
  coercions: ParamCoercion[];
  /** Warnings during mapping */
  warnings: string[];
}

export interface ParameterMapping {
  /** Original parameter name */
  from: string;
  /** Canonical parameter name */
  to: string;
  /** How the mapping was determined */
  method: 'direct' | 'alias' | 'fuzzy' | 'case_insensitive';
  /** Confidence score (0-1) */
  confidence: number;
}

export interface MapperConfig {
  /** Enable fuzzy matching for parameter names */
  fuzzyMatching: boolean;
  /** Minimum similarity for fuzzy matches */
  fuzzyThreshold: number;
  /** Enable type coercion */
  enableCoercion: boolean;
  /** Include unmapped parameters in output */
  includeUnmapped: boolean;
  /** Strict mode - fail on unknown parameters */
  strict: boolean;
  /** Fill missing required params with defaults */
  useDefaults: boolean;
}

const DEFAULT_CONFIG: MapperConfig = {
  fuzzyMatching: true,
  fuzzyThreshold: 0.7,
  enableCoercion: true,
  includeUnmapped: false,
  strict: false,
  useDefaults: true,
};

// =============================================================================
// Parameter Mapper Class
// =============================================================================

/** Simplified schema input for parameter mapping */
export interface SimpleSchema {
  parameters: Record<string, JSONSchemaProperty>;
  required?: string[];
}

/**
 * Maps and normalizes tool parameters
 */
export class ParameterMapper {
  private config: MapperConfig;

  constructor(config: Partial<MapperConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Map input parameters to schema parameters
   * Accepts either a full ToolSchema or a simplified schema with just parameters
   */
  map(
    inputParams: Record<string, unknown>,
    schema: ToolSchema | SimpleSchema
  ): ParameterMappingResult {
    const result: ParameterMappingResult = {
      parameters: {},
      unmapped: [],
      mappings: [],
      coercions: [],
      warnings: [],
    };

    // Handle both ToolSchema (with nested parameters.properties) and SimpleSchema
    const schemaParams = this.isToolSchema(schema)
      ? schema.parameters.properties
      : schema.parameters;
    const required = this.isToolSchema(schema)
      ? schema.parameters.required || []
      : schema.required || [];

    const schemaParamNames = Object.keys(schemaParams);

    for (const [inputKey, inputValue] of Object.entries(inputParams)) {
      const mapping = this.findParameterMapping(inputKey, schemaParamNames);

      if (mapping) {
        // Get the schema property for type coercion
        const schemaProperty = schemaParams[mapping.to];
        let value = inputValue;

        // Apply type coercion if enabled
        if (this.config.enableCoercion && schemaProperty) {
          const coerced = this.coerceValue(inputValue, schemaProperty, inputKey);
          if (coerced.coerced) {
            result.coercions.push(coerced);
            value = coerced.to;
          } else {
            value = coerced.to;
          }
        }

        result.parameters[mapping.to] = value;
        result.mappings.push(mapping);
      } else {
        result.unmapped.push(inputKey);

        if (this.config.includeUnmapped) {
          result.parameters[inputKey] = inputValue;
        }

        if (this.config.strict) {
          result.warnings.push(`Unknown parameter: ${inputKey}`);
        }
      }
    }

    // Check for missing required parameters
    for (const requiredParam of required) {
      if (!(requiredParam in result.parameters)) {
        // Check if we have a default value and useDefaults is enabled
        const prop = schemaParams[requiredParam];
        if (this.config.useDefaults && prop && 'default' in prop) {
          result.parameters[requiredParam] = prop.default;
          result.warnings.push(`Using default for missing required param: ${requiredParam}`);
        } else {
          result.warnings.push(`Missing required parameter: ${requiredParam}`);
        }
      }
    }

    return result;
  }

  /**
   * Type guard to check if schema is a full ToolSchema
   */
  private isToolSchema(schema: ToolSchema | SimpleSchema): schema is ToolSchema {
    return 'parameters' in schema &&
           typeof schema.parameters === 'object' &&
           'properties' in schema.parameters;
  }

  /**
   * Find the mapping for a parameter name
   */
  private findParameterMapping(
    inputName: string,
    schemaParams: string[]
  ): ParameterMapping | null {
    const normalizedInput = inputName.toLowerCase();

    // Direct match (case-insensitive)
    for (const schemaParam of schemaParams) {
      if (schemaParam.toLowerCase() === normalizedInput) {
        return {
          from: inputName,
          to: schemaParam,
          method: inputName === schemaParam ? 'direct' : 'case_insensitive',
          confidence: 1,
        };
      }
    }

    // Check built-in aliases
    const canonical = getCanonicalParamName(normalizedInput);
    if (canonical !== normalizedInput) {
      for (const schemaParam of schemaParams) {
        if (schemaParam.toLowerCase() === canonical) {
          return {
            from: inputName,
            to: schemaParam,
            method: 'alias',
            confidence: 0.95,
          };
        }
      }
    }

    // Fuzzy matching
    if (this.config.fuzzyMatching) {
      const { mapped, mappings } = mapParametersToSchema(
        { [inputName]: null },
        schemaParams,
        { threshold: this.config.fuzzyThreshold }
      );

      const mappedKey = Object.keys(mapped)[0];
      if (mappedKey) {
        const mapping = mappings[inputName];
        return {
          from: inputName,
          to: mappedKey,
          method: 'fuzzy',
          confidence: mapping?.similarity || 0.7,
        };
      }
    }

    return null;
  }

  /**
   * Coerce a value to match the expected schema type
   */
  private coerceValue(
    value: unknown,
    property: JSONSchemaProperty,
    paramName: string
  ): ParamCoercion {
    const original = value;

    // Already correct type
    if (this.matchesType(value, property.type)) {
      return { parameter: paramName, from: value, to: value, coerced: false };
    }

    // Type coercion
    let coercedValue: unknown = value;
    let wasCoerced = false;

    switch (property.type) {
      case 'number':
        coercedValue = this.coerceToNumber(value);
        wasCoerced = coercedValue !== value;
        break;

      case 'string':
        coercedValue = this.coerceToString(value, property);
        wasCoerced = coercedValue !== value;
        break;

      case 'boolean':
        coercedValue = this.coerceToBoolean(value);
        wasCoerced = coercedValue !== value;
        break;

      case 'array':
        coercedValue = this.coerceToArray(value);
        wasCoerced = coercedValue !== value;
        break;
    }

    return {
      parameter: paramName,
      from: original,
      to: coercedValue,
      coerced: wasCoerced,
    };
  }

  /**
   * Check if a value matches the expected type
   */
  private matchesType(value: unknown, type: JSONSchemaProperty['type']): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Coerce value to number
   */
  private coerceToNumber(value: unknown): number | unknown {
    if (typeof value === 'number') return value;

    if (typeof value === 'string') {
      // Handle units: "100px", "50%", "2rem"
      const match = value.match(/^(-?\d*\.?\d+)(px|%|rem|em|pt|deg)?$/);
      if (match && match[1]) {
        return parseFloat(match[1]);
      }

      // Try parsing as number
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return value;
  }

  /**
   * Coerce value to string
   */
  private coerceToString(value: unknown, _property: JSONSchemaProperty): string | unknown {
    if (typeof value === 'string') return value;

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'boolean') {
      return String(value);
    }

    // Color object to string
    if (typeof value === 'object' && value !== null) {
      const colorStr = this.colorObjectToString(value as Record<string, unknown>);
      if (colorStr) return colorStr;
    }

    return value;
  }

  /**
   * Convert a color object to a string
   */
  private colorObjectToString(obj: Record<string, unknown>): string | null {
    // RGB object: { r, g, b, a? }
    if ('r' in obj && 'g' in obj && 'b' in obj) {
      const r = Number(obj['r']);
      const g = Number(obj['g']);
      const b = Number(obj['b']);
      const a = obj['a'] !== undefined ? Number(obj['a']) : 1;

      // Normalize if values are 0-1 range
      const isNormalized = r <= 1 && g <= 1 && b <= 1;
      const rVal = isNormalized ? Math.round(r * 255) : r;
      const gVal = isNormalized ? Math.round(g * 255) : g;
      const bVal = isNormalized ? Math.round(b * 255) : b;

      if (a < 1) {
        return `rgba(${rVal}, ${gVal}, ${bVal}, ${a})`;
      }

      return `rgb(${rVal}, ${gVal}, ${bVal})`;
    }

    // HSL object: { h, s, l, a? }
    if ('h' in obj && 's' in obj && 'l' in obj) {
      const h = Number(obj['h']);
      const s = Number(obj['s']);
      const l = Number(obj['l']);
      const a = obj['a'] !== undefined ? Number(obj['a']) : 1;

      // Normalize s and l to percentages if needed
      const sVal = s <= 1 ? s * 100 : s;
      const lVal = l <= 1 ? l * 100 : l;

      if (a < 1) {
        return `hsla(${h}, ${sVal}%, ${lVal}%, ${a})`;
      }

      return `hsl(${h}, ${sVal}%, ${lVal}%)`;
    }

    return null;
  }

  /**
   * Coerce value to boolean
   */
  private coerceToBoolean(value: unknown): boolean | unknown {
    if (typeof value === 'boolean') return value;

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === 'yes' || lower === '1') return true;
      if (lower === 'false' || lower === 'no' || lower === '0') return false;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return value;
  }

  /**
   * Coerce value to array
   */
  private coerceToArray(value: unknown): unknown[] | unknown {
    if (Array.isArray(value)) return value;

    // Wrap single values in an array
    if (value !== null && value !== undefined) {
      return [value];
    }

    return value;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<MapperConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MapperConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Map parameters using default settings
 */
export function mapParameters(
  inputParams: Record<string, unknown>,
  schema: ToolSchema
): ParameterMappingResult {
  const mapper = new ParameterMapper();
  return mapper.map(inputParams, schema);
}

/**
 * Quick parameter name resolution
 */
export function resolveParameterName(
  inputName: string,
  schemaParams: string[]
): string | null {
  const normalizedInput = inputName.toLowerCase();

  // Direct match
  for (const param of schemaParams) {
    if (param.toLowerCase() === normalizedInput) {
      return param;
    }
  }

  // Alias match
  const canonical = getCanonicalParamName(normalizedInput);
  for (const param of schemaParams) {
    if (param.toLowerCase() === canonical) {
      return param;
    }
  }

  return null;
}

/**
 * Check if a parameter name is a known alias
 */
export function isParameterAlias(paramName: string): boolean {
  const normalized = paramName.toLowerCase();
  return Object.values(PARAMETER_ALIASES).some(
    (aliases) => aliases.some((a) => a.toLowerCase() === normalized)
  );
}

/**
 * Get all possible aliases for a parameter
 */
export function getParameterAliases(canonicalName: string): string[] {
  const aliases = PARAMETER_ALIASES[canonicalName.toLowerCase()];
  return aliases ? [...aliases] : [];
}
