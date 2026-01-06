/**
 * Schema Validator
 *
 * Validates tool calls against their schemas with support for
 * fuzzy tool matching, parameter mapping, and type coercion.
 */

import type {
  JSONSchemaProperty,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CoercedValue,
  NormalizedToolCall,
  ValidationErrorCode,
} from './types';
import type { ToolSchemaRegistry } from './schema-registry';
import { findTool, suggestToolCorrections } from './fuzzy-matcher';
import { ParameterMapper, type SimpleSchema } from './param-mapper';

// =============================================================================
// Types
// =============================================================================

export interface ValidatorConfig {
  /** Enable fuzzy tool name matching */
  fuzzyToolMatching: boolean;
  /** Minimum similarity for tool matching */
  toolMatchThreshold: number;
  /** Enable fuzzy parameter name matching */
  fuzzyParamMatching: boolean;
  /** Minimum similarity for parameter matching */
  paramMatchThreshold: number;
  /** Enable type coercion */
  enableCoercion: boolean;
  /** Strict mode - fail on any validation error */
  strictMode: boolean;
  /** Allow extra parameters not in schema */
  allowExtraParams: boolean;
  /** Fill missing required params with defaults */
  useDefaults: boolean;
}

const DEFAULT_CONFIG: ValidatorConfig = {
  fuzzyToolMatching: true,
  toolMatchThreshold: 0.6,
  fuzzyParamMatching: true,
  paramMatchThreshold: 0.7,
  enableCoercion: true,
  strictMode: false,
  allowExtraParams: true,
  useDefaults: true,
};

export interface RawToolCall {
  tool?: string;
  name?: string;
  function?: string;
  parameters?: Record<string, unknown>;
  params?: Record<string, unknown>;
  arguments?: Record<string, unknown>;
  args?: Record<string, unknown>;
  [key: string]: unknown;
}

// =============================================================================
// Helper Functions
// =============================================================================

function createError(
  code: ValidationErrorCode,
  message: string,
  path: string[],
  options?: { expected?: string; received?: string; suggestedFix?: string }
): ValidationError {
  return {
    code,
    message,
    path,
    ...options,
  };
}

function createWarning(
  message: string,
  path: string[],
  suggestion?: string
): ValidationWarning {
  const warning: ValidationWarning = {
    message,
    path,
  };
  if (suggestion !== undefined) {
    warning.suggestion = suggestion;
  }
  return warning;
}

// =============================================================================
// Schema Validator Class
// =============================================================================

/**
 * Validates tool calls against schemas
 */
export class SchemaValidator {
  private config: ValidatorConfig;
  private paramMapper: ParameterMapper;

  constructor(config: Partial<ValidatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.paramMapper = new ParameterMapper({
      fuzzyMatching: this.config.fuzzyParamMatching,
      fuzzyThreshold: this.config.paramMatchThreshold,
      enableCoercion: this.config.enableCoercion,
      includeUnmapped: this.config.allowExtraParams,
      strict: this.config.strictMode,
      useDefaults: this.config.useDefaults,
    });
  }

  /**
   * Validate a tool call against the registry
   */
  validate(
    rawToolCall: RawToolCall,
    registry: ToolSchemaRegistry
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const coercedValues: Record<string, CoercedValue> = {};
    const injectedDefaults: Record<string, unknown> = {};

    // Step 1: Extract tool name
    const toolName = this.extractToolName(rawToolCall);
    if (!toolName) {
      errors.push(createError(
        'invalid_json_structure',
        'Tool call is missing tool name',
        ['tool']
      ));
      return {
        isValid: false,
        normalizedData: null,
        errors,
        warnings,
        coercedValues,
        injectedDefaults,
      };
    }

    // Step 2: Find the tool schema
    // If fuzzy matching is disabled, set threshold to 1.0 (exact match only)
    const toolMatch = findTool(toolName, registry, {
      threshold: this.config.fuzzyToolMatching ? this.config.toolMatchThreshold : 1.0,
      checkAliases: this.config.fuzzyToolMatching,
    });

    if (!toolMatch) {
      const suggestions = suggestToolCorrections(toolName, registry, 3);
      const suggestedFix = suggestions.length > 0 ? `Did you mean: ${suggestions.join(', ')}?` : undefined;
      errors.push(createError(
        'unknown_tool',
        `Unknown tool: "${toolName}"`,
        ['tool'],
        suggestedFix ? { suggestedFix } : undefined
      ));
      return {
        isValid: false,
        normalizedData: null,
        errors,
        warnings,
        coercedValues,
        injectedDefaults,
      };
    }

    const schema = toolMatch.match;

    // Warn if fuzzy matched (levenshtein or jaro_winkler algorithms indicate fuzzy match)
    if (toolMatch.algorithm !== 'exact') {
      warnings.push(createWarning(
        `Tool name "${toolName}" was matched to "${schema.name}" (${Math.round(toolMatch.similarity * 100)}% confidence)`,
        ['tool'],
        `Use "${schema.name}" for exact match`
      ));
    }

    // Step 3: Extract parameters
    const rawParams = this.extractParameters(rawToolCall);

    // Step 4: Map and validate parameters
    const schemaProperties = schema.parameters.properties;
    const simpleSchema: SimpleSchema = {
      parameters: schemaProperties,
      required: schema.parameters.required || [],
    };
    const mappingResult = this.paramMapper.map(rawParams, simpleSchema);

    // Add coercions
    for (const coercion of mappingResult.coercions) {
      coercedValues[coercion.parameter] = {
        from: coercion.from,
        to: coercion.to,
        coercionType: typeof coercion.to,
      };
    }

    // Add mapping warnings
    for (const mapping of mappingResult.mappings) {
      if (mapping.method === 'fuzzy' || mapping.method === 'alias') {
        warnings.push(createWarning(
          `Parameter "${mapping.from}" mapped to "${mapping.to}" (${Math.round(mapping.confidence * 100)}% confidence)`,
          ['parameters', mapping.from],
          `Use "${mapping.to}" for exact match`
        ));
      }
    }

    // Add warnings for unmapped parameters
    if (!this.config.allowExtraParams && mappingResult.unmapped.length > 0) {
      for (const unmapped of mappingResult.unmapped) {
        errors.push(createError(
          'schema_mismatch',
          `Unknown parameter: "${unmapped}"`,
          ['parameters', unmapped]
        ));
      }
    } else if (mappingResult.unmapped.length > 0) {
      warnings.push(createWarning(
        `Extra parameters ignored: ${mappingResult.unmapped.join(', ')}`,
        ['parameters']
      ));
    }

    // Step 5: Validate against schema
    const schemaErrors = this.validateAgainstSchema(
      mappingResult.parameters,
      schemaProperties,
      schema.parameters.required || []
    );
    errors.push(...schemaErrors);

    // Step 6: Check required parameters and apply defaults
    const required = schema.parameters.required || [];
    for (const requiredParam of required) {
      if (!(requiredParam in mappingResult.parameters)) {
        const prop = schemaProperties[requiredParam];

        if (this.config.useDefaults && prop && 'default' in prop) {
          mappingResult.parameters[requiredParam] = prop.default;
          injectedDefaults[requiredParam] = prop.default;
          warnings.push(createWarning(
            `Using default value for missing required parameter: ${requiredParam}`,
            ['parameters', requiredParam]
          ));
        } else {
          errors.push(createError(
            'required_parameter_missing',
            `Missing required parameter: "${requiredParam}"`,
            ['parameters', requiredParam]
          ));
        }
      }
    }

    // Build normalized result
    const isValid = this.config.strictMode ? errors.length === 0 : !this.hasCriticalErrors(errors);

    // Build metadata object, conditionally including fuzzyMatch
    const baseMetadata = {
      model: 'unknown',
      timestamp: new Date(),
      parsingMethod: 'schema_validator' as const,
      sourceFormat: 'custom_structured' as const,
      extractionMethod: 'ast_balanced' as const,
      parameterMappings: mappingResult.mappings.reduce(
        (acc, m) => {
          acc[m.from] = m.to;
          return acc;
        },
        {} as Record<string, string>
      ),
      coercions: coercedValues,
    };

    const metadata = toolMatch.algorithm !== 'exact'
      ? {
          ...baseMetadata,
          fuzzyMatch: {
            originalName: toolName,
            matchedName: schema.name,
            similarity: toolMatch.similarity,
          },
        }
      : baseMetadata;

    const normalizedData: NormalizedToolCall | null = isValid
      ? {
          id: this.generateId(),
          tool: schema.name,
          parameters: mappingResult.parameters,
          confidence: toolMatch.similarity,
          sourceFormat: 'custom_structured',
          rawData: rawToolCall,
          metadata,
        }
      : null;

    return {
      isValid,
      normalizedData,
      errors,
      warnings,
      coercedValues,
      injectedDefaults,
    };
  }

  /**
   * Validate multiple tool calls
   */
  validateAll(
    rawToolCalls: RawToolCall[],
    registry: ToolSchemaRegistry
  ): ValidationResult[] {
    return rawToolCalls.map((tc) => this.validate(tc, registry));
  }

  /**
   * Extract tool name from various formats
   */
  private extractToolName(rawToolCall: RawToolCall): string | null {
    return (
      (rawToolCall.tool as string) ||
      (rawToolCall.name as string) ||
      (rawToolCall.function as string) ||
      null
    );
  }

  /**
   * Extract parameters from various formats
   */
  private extractParameters(rawToolCall: RawToolCall): Record<string, unknown> {
    const params =
      rawToolCall.parameters ||
      rawToolCall.params ||
      rawToolCall.arguments ||
      rawToolCall.args ||
      {};

    // If params is a string (JSON), try to parse it
    if (typeof params === 'string') {
      try {
        return JSON.parse(params);
      } catch {
        return {};
      }
    }

    return params as Record<string, unknown>;
  }

  /**
   * Validate parameters against schema
   */
  private validateAgainstSchema(
    params: Record<string, unknown>,
    schemaProperties: Record<string, JSONSchemaProperty>,
    _required: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [paramName, value] of Object.entries(params)) {
      const propSchema = schemaProperties[paramName];

      if (!propSchema) {
        // Unknown parameter - already handled
        continue;
      }

      // Type validation
      const typeError = this.validateType(value, propSchema, paramName);
      if (typeError) {
        errors.push(typeError);
      }

      // Range validation for numbers
      if (propSchema.type === 'number' && typeof value === 'number') {
        if (propSchema.minimum !== undefined && value < propSchema.minimum) {
          errors.push(createError(
            'number_out_of_range',
            `${paramName} must be >= ${propSchema.minimum}`,
            ['parameters', paramName],
            { expected: `>= ${propSchema.minimum}`, received: String(value) }
          ));
        }
        if (propSchema.maximum !== undefined && value > propSchema.maximum) {
          errors.push(createError(
            'number_out_of_range',
            `${paramName} must be <= ${propSchema.maximum}`,
            ['parameters', paramName],
            { expected: `<= ${propSchema.maximum}`, received: String(value) }
          ));
        }
      }

      // Enum validation
      if (propSchema.enum && !propSchema.enum.includes(value)) {
        errors.push(createError(
          'invalid_enum_value',
          `${paramName} must be one of: ${propSchema.enum.join(', ')}`,
          ['parameters', paramName],
          { expected: propSchema.enum.join(', '), received: String(value) }
        ));
      }

      // Pattern validation for strings
      if (
        propSchema.pattern &&
        typeof value === 'string' &&
        !new RegExp(propSchema.pattern).test(value)
      ) {
        errors.push(createError(
          'string_pattern_mismatch',
          `${paramName} does not match required pattern`,
          ['parameters', paramName],
          { expected: propSchema.pattern, received: value }
        ));
      }
    }

    return errors;
  }

  /**
   * Validate value type against schema
   */
  private validateType(
    value: unknown,
    schema: JSONSchemaProperty,
    paramName: string
  ): ValidationError | null {
    const actualType = this.getValueType(value);
    const expectedType = schema.type;

    if (actualType !== expectedType) {
      // Allow null for optional parameters
      if (value === null) {
        return null;
      }

      return createError(
        'invalid_type',
        `${paramName} expected ${expectedType} but got ${actualType}`,
        ['parameters', paramName],
        { expected: expectedType, received: actualType }
      );
    }

    return null;
  }

  /**
   * Get the type of a value
   */
  private getValueType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Check if errors include critical ones
   */
  private hasCriticalErrors(errors: ValidationError[]): boolean {
    const criticalCodes: ValidationErrorCode[] = ['unknown_tool', 'required_parameter_missing'];
    return errors.some((e) => criticalCodes.includes(e.code));
  }

  /**
   * Generate a unique ID for a tool call
   */
  private generateId(): string {
    return `tc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ValidatorConfig>): void {
    this.config = { ...this.config, ...config };
    this.paramMapper.configure({
      fuzzyMatching: this.config.fuzzyParamMatching,
      fuzzyThreshold: this.config.paramMatchThreshold,
      enableCoercion: this.config.enableCoercion,
      includeUnmapped: this.config.allowExtraParams,
      strict: this.config.strictMode,
      useDefaults: this.config.useDefaults,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): ValidatorConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a schema validator with default settings
 */
export function createValidator(config: Partial<ValidatorConfig> = {}): SchemaValidator {
  return new SchemaValidator(config);
}

/**
 * Quick validation with default settings
 */
export function validateToolCall(
  rawToolCall: RawToolCall,
  registry: ToolSchemaRegistry
): ValidationResult {
  const validator = new SchemaValidator();
  return validator.validate(rawToolCall, registry);
}

/**
 * Check if a tool call is valid
 */
export function isValidToolCall(
  rawToolCall: RawToolCall,
  registry: ToolSchemaRegistry
): boolean {
  const result = validateToolCall(rawToolCall, registry);
  return result.isValid;
}
