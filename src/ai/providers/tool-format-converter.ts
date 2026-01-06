/**
 * Tool Format Converter
 *
 * Converts tool definitions between internal format and provider-specific formats.
 * Provides a unified interface for tool formatting across all AI providers.
 *
 * Supported providers:
 * - Anthropic (Claude)
 * - OpenAI (GPT-4, etc.)
 * - Ollama (local models)
 * - LlamaCPP (local models)
 * - Prompt-based (for models without native tool support)
 */

import type { AITool, AIToolParameter } from './ai-provider';
import type { ToolDefinition, JSONSchema } from '../tools/tool-registry';

// =============================================================================
// Provider-Specific Types
// =============================================================================

/**
 * Anthropic tool format
 */
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * OpenAI tool format (function calling)
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * Ollama tool format (compatible with OpenAI)
 */
export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * LlamaCPP tool format
 */
export interface LlamaCppTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * Provider type identifiers
 */
export type ProviderFormat = 'anthropic' | 'openai' | 'ollama' | 'llamacpp' | 'prompt';

// =============================================================================
// Format Converters
// =============================================================================

/**
 * Convert AITool to Anthropic format
 */
export function toAnthropicFormat(tool: AITool): AnthropicTool {
  const inputSchema: AnthropicTool['input_schema'] = {
    type: 'object',
    properties: convertProperties(tool.parameters.properties),
  };

  if (tool.parameters.required && tool.parameters.required.length > 0) {
    inputSchema.required = tool.parameters.required;
  }

  return {
    name: tool.name,
    description: tool.description,
    input_schema: inputSchema,
  };
}

/**
 * Convert AITool to OpenAI format
 */
export function toOpenAIFormat(tool: AITool): OpenAITool {
  const parameters: OpenAITool['function']['parameters'] = {
    type: 'object',
    properties: convertProperties(tool.parameters.properties),
  };

  if (tool.parameters.required && tool.parameters.required.length > 0) {
    parameters.required = tool.parameters.required;
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters,
    },
  };
}

/**
 * Convert AITool to Ollama format (same as OpenAI)
 */
export function toOllamaFormat(tool: AITool): OllamaTool {
  return toOpenAIFormat(tool) as OllamaTool;
}

/**
 * Convert AITool to LlamaCPP format (same as OpenAI)
 */
export function toLlamaCppFormat(tool: AITool): LlamaCppTool {
  return toOpenAIFormat(tool) as LlamaCppTool;
}

/**
 * Convert ToolDefinition to AITool
 */
export function toolDefinitionToAITool(def: ToolDefinition): AITool {
  const params: AITool['parameters'] = {
    type: 'object',
    properties: convertToolDefProperties(def.parameters.properties ?? {}),
  };

  if (def.parameters.required && def.parameters.required.length > 0) {
    params.required = def.parameters.required;
  }

  return {
    name: def.name,
    description: def.description,
    parameters: params,
  };
}

/**
 * Convert multiple AITools to provider format
 */
export function convertToolsToFormat(
  tools: AITool[],
  format: ProviderFormat
): unknown[] {
  switch (format) {
    case 'anthropic':
      return tools.map(toAnthropicFormat);
    case 'openai':
      return tools.map(toOpenAIFormat);
    case 'ollama':
      return tools.map(toOllamaFormat);
    case 'llamacpp':
      return tools.map(toLlamaCppFormat);
    case 'prompt':
      // Prompt format returns the original tools (used for prompt generation)
      return tools;
    default:
      throw new Error(`Unsupported provider format: ${format}`);
  }
}

// =============================================================================
// Prompt-Based Tool Format (for models without native tool support)
// =============================================================================

/**
 * Generate a prompt-based tool description for models without function calling
 */
export function toPromptFormat(tools: AITool[]): string {
  const lines: string[] = [
    '## Available Commands',
    '',
    'You can execute commands by responding with JSON in this format:',
    '',
    '```json',
    '{',
    '  "thinking": "Your analysis of what to do",',
    '  "commands": [',
    '    { "tool": "tool_name", "args": { "param": "value" } }',
    '  ],',
    '  "response": "What to tell the user"',
    '}',
    '```',
    '',
    '### Command Reference',
    '',
  ];

  // Group tools by category if available
  for (const tool of tools) {
    lines.push(`**${tool.name}**`);
    lines.push(tool.description.split('\n')[0] ?? tool.description);

    // List parameters
    if (Object.keys(tool.parameters.properties).length > 0) {
      const params = Object.entries(tool.parameters.properties)
        .map(([name, schema]) => {
          const s = schema as AIToolParameter;
          const required = tool.parameters.required?.includes(name);
          const opt = required ? '' : '?';
          return `${name}${opt}: ${s.type}`;
        })
        .join(', ');
      lines.push(`Parameters: { ${params} }`);
    } else {
      lines.push('Parameters: none');
    }

    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('Execute commands to help the user. Always respond with valid JSON.');

  return lines.join('\n');
}

/**
 * Parse tool calls from a prompt-based response
 */
export function parsePromptToolCalls(response: string): Array<{ tool: string; args: Record<string, unknown> }> {
  const calls: Array<{ tool: string; args: Record<string, unknown> }> = [];

  // Try to extract JSON from the response
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    // Try to find raw JSON object
    const rawMatch = response.match(/\{[\s\S]*"commands"[\s\S]*\}/);
    if (!rawMatch) return calls;

    try {
      const parsed = JSON.parse(rawMatch[0]) as { commands?: Array<{ tool: string; args: Record<string, unknown> }> };
      return parsed.commands ?? [];
    } catch {
      return calls;
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[1] ?? '{}') as { commands?: Array<{ tool: string; args: Record<string, unknown> }> };
    return parsed.commands ?? [];
  } catch {
    return calls;
  }
}

/**
 * Extract the response text from a prompt-based response
 */
export function extractPromptResponse(response: string): string {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return response;

  try {
    const parsed = JSON.parse(jsonMatch[1] ?? '{}') as { response?: string };
    return parsed.response ?? response;
  } catch {
    return response;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert AIToolParameter properties to provider format
 */
function convertProperties(
  props: Record<string, AIToolParameter>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, param] of Object.entries(props)) {
    result[key] = convertParameter(param);
  }

  return result;
}

/**
 * Convert a single AIToolParameter to JSON Schema format
 */
function convertParameter(param: AIToolParameter): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: param.type,
  };

  if (param.description) {
    schema['description'] = param.description;
  }

  if (param.enum) {
    schema['enum'] = param.enum;
  }

  if (param.items) {
    schema['items'] = convertParameter(param.items);
  }

  if (param.properties) {
    schema['properties'] = convertProperties(param.properties);
    if (param.required) {
      schema['required'] = param.required;
    }
  }

  if (param.minimum !== undefined) {
    schema['minimum'] = param.minimum;
  }

  if (param.maximum !== undefined) {
    schema['maximum'] = param.maximum;
  }

  if (param.default !== undefined) {
    schema['default'] = param.default;
  }

  return schema;
}

/**
 * Convert ToolDefinition JSONSchema properties to AIToolParameter format
 */
function convertToolDefProperties(
  props: Record<string, JSONSchema & { description?: string }>
): Record<string, AIToolParameter> {
  const result: Record<string, AIToolParameter> = {};

  for (const [key, schema] of Object.entries(props)) {
    result[key] = convertJSONSchemaToParam(schema);
  }

  return result;
}

/**
 * Convert JSONSchema to AIToolParameter
 */
function convertJSONSchemaToParam(schema: JSONSchema): AIToolParameter {
  const param: AIToolParameter = {
    type: schema.type as AIToolParameter['type'],
  };

  if (schema.description) {
    param.description = schema.description;
  }

  if (schema.enum) {
    param.enum = schema.enum;
  }

  if (schema.items) {
    param.items = convertJSONSchemaToParam(schema.items);
  }

  if (schema.properties) {
    param.properties = convertToolDefProperties(schema.properties);
    if (schema.required) {
      param.required = schema.required;
    }
  }

  if (schema.minimum !== undefined) {
    param.minimum = schema.minimum;
  }

  if (schema.maximum !== undefined) {
    param.maximum = schema.maximum;
  }

  if (schema.default !== undefined) {
    param.default = schema.default;
  }

  return param;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate that a tool definition is valid for all providers
 */
export function validateToolDefinition(tool: AITool): string[] {
  const errors: string[] = [];

  if (!tool.name) {
    errors.push('Tool name is required');
  } else if (!/^[a-z][a-z0-9_]*$/.test(tool.name)) {
    errors.push(`Tool name "${tool.name}" must be lowercase with underscores`);
  }

  if (!tool.description) {
    errors.push('Tool description is required');
  }

  if (!tool.parameters) {
    errors.push('Tool parameters object is required');
  } else if (tool.parameters.type !== 'object') {
    errors.push('Tool parameters type must be "object"');
  }

  return errors;
}

/**
 * Check if a provider supports native tool calling
 */
export function supportsNativeToolCalling(provider: ProviderFormat): boolean {
  return provider !== 'prompt';
}

/**
 * Get the recommended format for a provider
 */
export function getProviderFormat(providerName: string): ProviderFormat {
  const normalized = providerName.toLowerCase();

  if (normalized.includes('anthropic') || normalized.includes('claude')) {
    return 'anthropic';
  }
  if (normalized.includes('openai') || normalized.includes('gpt')) {
    return 'openai';
  }
  if (normalized.includes('ollama')) {
    return 'ollama';
  }
  if (normalized.includes('llama') || normalized.includes('cpp')) {
    return 'llamacpp';
  }

  // Default to prompt-based for unknown providers
  return 'prompt';
}
