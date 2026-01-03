/**
 * AI Tools Module
 *
 * Tool infrastructure for AI-powered design operations.
 */

// Categories
export {
  TOOL_CATEGORIES,
  getToolsByPriority,
  getToolsForCapability,
  getToolCategory,
  isToolAvailable,
} from './tool-categories';
export type { ToolCategory, ToolName } from './tool-categories';

// Runtime Bridge
export {
  setGlobalBridge,
  getGlobalBridge,
  isBridgeInitialized,
  parseHexColor,
  colorToHex,
} from './runtime-bridge';
export type {
  RuntimeBridge,
  ColorValue,
  Bounds,
  LayerSummary,
  ViewportState,
  CanvasState,
  RectangleOptions,
  EllipseOptions,
  TextOptions,
  FrameOptions,
  LineOptions,
  AlignmentType,
  DistributionType,
} from './runtime-bridge';

// Tool Registry
export {
  TOOL_DEFINITIONS,
  getToolDefinition,
  getAllToolDefinitions,
  getToolDefinitionsForCapability,
  toOpenAIFunctions,
  getOpenAIToolsForCapability,
} from './tool-registry';
export type {
  JSONSchema,
  FunctionDefinition,
  ToolDefinition,
} from './tool-registry';

// Tool Executor
export {
  ToolExecutor,
  createToolExecutor,
  ErrorSeverity,
} from './tool-executor';
export type {
  ToolResult,
  ToolCall,
  ExecutionContext,
  ToolError,
} from './tool-executor';

// DesignLibre Bridge
export {
  DesignLibreBridge,
  createDesignLibreBridge,
} from './designlibre-bridge';
