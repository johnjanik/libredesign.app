/**
 * AI Schemas Module
 *
 * Exports type schemas and tool documentation for AI model priming.
 * This module provides model-agnostic documentation that can be used
 * with Claude, OpenAI, Ollama, LlamaCPP, and other providers.
 */

// Type Schemas
export {
  // Types
  type PropertySchema,
  type TypeSchema,
  // Individual schemas
  POINT_SCHEMA,
  BOUNDS_SCHEMA,
  TRANSFORM_SCHEMA,
  COLOR_SCHEMA,
  RGBA_SCHEMA,
  GRADIENT_STOP_SCHEMA,
  FILL_SCHEMA,
  STROKE_SCHEMA,
  EFFECT_SCHEMA,
  BLEND_MODE_SCHEMA,
  NODE_TYPE_SCHEMA,
  BASE_NODE_SCHEMA,
  TEXT_NODE_SCHEMA,
  FRAME_NODE_SCHEMA,
  TOOL_RESULT_SCHEMA,
  VIEWPORT_SCHEMA,
  ALIGNMENT_TYPE_SCHEMA,
  DISTRIBUTION_TYPE_SCHEMA,
  // Registry
  TYPE_SCHEMA_REGISTRY,
  getTypeSchema,
  getTypeSchemaNames,
  // Generators
  generateTypeSchemaDocumentation,
  generateTypeSchemaPrompt,
  typeSchemaToJSONSchema,
} from './type-schemas';

// Tool Documentation
export {
  // Types
  type ToolDocumentation,
  type ParameterDoc,
  type ReturnDoc,
  type ExampleDoc,
  // Priority lists
  PRIORITY_1_TOOLS,
  PRIORITY_2_TOOLS,
  PRIORITY_3_TOOLS,
  ALL_PRIORITY_TOOLS,
  getToolPriority,
  // Implementation tracking
  IMPLEMENTED_TOOLS,
  isToolImplemented,
  getImplementationStats,
  // Documentation generation
  generateToolDocumentation,
  generateToolMarkdown,
  generateCompleteToolDocumentation,
  // Prompt generation
  generateToolPrompt,
  getToolsForTier,
  generateToolQuickReference,
} from './tool-documentation';
