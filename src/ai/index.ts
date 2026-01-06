/**
 * AI Module
 *
 * AI integration for DesignLibre - enables AI assistants to understand
 * and manipulate the design canvas.
 */

// Main controller
export { AIController, createAIController } from './ai-controller';
export type {
  AIControllerConfig,
  AIControllerEvents,
  AIStatus,
  ChatOptions,
} from './ai-controller';

// Providers
export type {
  AIProvider,
  AICapabilities,
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AITool,
  AIToolCall,
  AIProviderConfig,
  ContentPart,
  TextContent,
  ImageContent,
} from './providers/ai-provider';
export {
  textMessage,
  imageMessage,
  hasImages,
  extractText,
} from './providers/ai-provider';

export { AnthropicProvider, createAnthropicProvider } from './providers/anthropic-provider';
export type { AnthropicConfig } from './providers/anthropic-provider';

export { OpenAIProvider, createOpenAIProvider } from './providers/openai-provider';
export type { OpenAIConfig } from './providers/openai-provider';

export { OllamaProvider, createOllamaProvider } from './providers/ollama-provider';
export type { OllamaConfig } from './providers/ollama-provider';

export { LlamaCppProvider, createLlamaCppProvider } from './providers/llamacpp-provider';
export type { LlamaCppConfig } from './providers/llamacpp-provider';

export { ProviderManager, createProviderManager } from './providers/provider-manager';
export type { ProviderManagerEvents, ProviderManagerOptions } from './providers/provider-manager';

// Actions
export type {
  AIAction,
  ActionResult,
  ColorSpec,
  CreateRectangleAction,
  CreateEllipseAction,
  CreateLineAction,
  CreateTextAction,
  CreateFrameAction,
  SelectAction,
  MoveAction,
  DeleteAction,
  ZoomAction,
} from './actions/action-types';
export {
  getActionType,
  isCreationAction,
  isModificationAction,
  isViewportAction,
} from './actions/action-types';

export { ActionExecutor, createActionExecutor } from './actions/action-executor';
export type { ActionExecutorEvents } from './actions/action-executor';

// Vision
export { CanvasCapture, createCanvasCapture } from './vision/canvas-capture';
export type { CaptureOptions, CaptureResult } from './vision/canvas-capture';

// Calibration
export { CoordinateCalibrator, createCoordinateCalibrator } from './calibration/coordinate-calibrator';
export type { CalibrationResult, SpatialDescription } from './calibration/coordinate-calibrator';

// Context
export { ContextBuilder, createContextBuilder, DEFAULT_TOKEN_BUDGET } from './context/context-builder';
export type { AIContext, ContextBuilderOptions, TokenBudget } from './context/context-builder';

export { ConversationManager, createConversationManager } from './context/conversation-manager';
export type {
  ConversationEntry,
  ConversationManagerOptions,
} from './context/conversation-manager';

// UI Components
export { AIPanel, createAIPanel } from './ui/ai-panel';
export type { AIPanelOptions } from './ui/ai-panel';

export { AICommandPalette, createAICommandPalette } from './ui/ai-command-palette';
export type { AICommandPaletteOptions } from './ui/ai-command-palette';

export { AICursorOverlay, createAICursorOverlay } from './ui/ai-cursor-overlay';
export type { AICursorOverlayOptions } from './ui/ai-cursor-overlay';

export { AISettingsPanel, showAISettingsPanel, createAISettingsPanel } from './ui/ai-settings-panel';
export type { AISettingsPanelOptions } from './ui/ai-settings-panel';

export { MessageInput, createMessageInput } from './ui/components/message-input';
export type { MessageInputOptions, MessageInputEvents, MessageAttachment } from './ui/components/message-input';

export { CodeBlock, createCodeBlock, detectLanguage } from './ui/components/code-block';
export type { CodeBlockOptions, CodeLanguage } from './ui/components/code-block';

export { MarkdownRenderer, createMarkdownRenderer, renderMarkdownToHtml } from './ui/components/markdown-renderer';
export type { MarkdownRendererOptions } from './ui/components/markdown-renderer';

// Error Handling
export {
  AIError,
  ErrorHandler,
  NetworkStatusDetector,
  createErrorHandler,
  createErrorFromException,
  createErrorFromResponse,
  parseHttpError,
  calculateRetryDelay,
  withRetry,
  getNetworkDetector,
  retryRecoveryStrategy,
  providerFallbackStrategy,
  DEFAULT_RETRY_CONFIG,
} from './error';

export type {
  AIErrorCode,
  AIErrorCategory,
  RetryConfig,
  RecoveryStrategy,
  RecoveryContext,
  RecoveryResult,
} from './error';

// Configuration
export type {
  ProviderType,
  ProviderStatus,
  BaseProviderConfig,
  AnthropicProviderConfig,
  OpenAIProviderConfig,
  OllamaProviderConfig,
  LlamaCppProviderConfig,
  ProviderConfig,
  AIConfig,
  ProviderStatusInfo,
  ModelInfo,
  ConfigManagerEvents,
  ValidationResult,
  SupportedCodeLanguage,
} from './config';

export {
  AVAILABLE_MODELS,
  getModelInfo,
  modelSupportsCapability,
  DEFAULT_ANTHROPIC_CONFIG,
  DEFAULT_OPENAI_CONFIG,
  DEFAULT_OLLAMA_CONFIG,
  DEFAULT_LLAMACPP_CONFIG,
  DEFAULT_AI_CONFIG,
  CONFIG_STORAGE_KEY,
  PANEL_CONFIG,
  MESSAGE_CONFIG,
  CONTEXT_CONFIG,
  KEYBOARD_SHORTCUTS,
  SUPPORTED_CODE_LANGUAGES,
  ConfigManager,
  getConfigManager,
  createConfigManager,
  createAnthropicFromConfig,
  createOpenAIFromConfig,
  createOllamaFromConfig,
  createLlamaCppFromConfig,
  createProviderFromConfig,
  createProviderManagerFromConfig,
  initializeProviders,
  updateProviderAtRuntime,
  testProviderConnection,
} from './config';

// Authentication
export {
  AnthropicOAuthClient,
  getOAuthClient,
  createOAuthClient,
} from './auth';

export type {
  OAuthConfig,
  OAuthTokens,
  AuthState,
} from './auth';

// Tools
export {
  TOOL_CATEGORIES,
  getToolsByPriority,
  getToolsForCapability,
  getToolCategory,
  isToolAvailable,
  setGlobalBridge,
  getGlobalBridge,
  isBridgeInitialized,
  parseHexColor,
  colorToHex,
  TOOL_DEFINITIONS,
  getToolDefinition,
  getAllToolDefinitions,
  getToolDefinitionsForCapability,
  toOpenAIFunctions,
  getOpenAIToolsForCapability,
  ToolExecutor,
  createToolExecutor,
  ErrorSeverity,
  DesignLibreBridge,
  createDesignLibreBridge,
} from './tools';

export type {
  ToolCategory,
  ToolName,
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
  JSONSchema,
  FunctionDefinition,
  ToolDefinition,
  ToolResult,
  ToolCall,
  ExecutionContext,
  ToolError,
  MessageContext,
  AttachedImage,
} from './tools';

// Schemas (AI Priming)
export {
  // Type Schemas
  type PropertySchema,
  type TypeSchema,
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
  TYPE_SCHEMA_REGISTRY,
  getTypeSchema,
  getTypeSchemaNames,
  generateTypeSchemaDocumentation,
  generateTypeSchemaPrompt,
  typeSchemaToJSONSchema,
  // Tool Documentation
  type ToolDocumentation,
  type ParameterDoc,
  type ReturnDoc,
  type ExampleDoc,
  PRIORITY_1_TOOLS,
  PRIORITY_2_TOOLS,
  PRIORITY_3_TOOLS,
  ALL_PRIORITY_TOOLS,
  getToolPriority,
  IMPLEMENTED_TOOLS,
  isToolImplemented,
  getImplementationStats,
  generateToolDocumentation,
  generateToolMarkdown,
  generateCompleteToolDocumentation,
  generateToolPrompt,
  getToolsForTier,
  generateToolQuickReference,
} from './schemas';

// Prompts (System Prompt Builder)
export {
  // Types
  type ApplicationType,
  type PromptVerbosity,
  type SystemPromptOptions,
  type DesignContext,
  type SystemPromptResult,
  // Main builders
  buildSystemPrompt,
  buildContextPrompt,
  buildCombinedPrompt,
  // Preset configurations
  buildMinimalPrompt,
  buildStandardPrompt,
  buildDetailedPrompt,
  // Utilities
  getApplicationTypes,
  getApplicationDomain,
  validatePromptOptions,
  getPromptSizeCategory,
} from './prompts';

// Tool Format Converter
export {
  // Types
  type AnthropicTool,
  type OpenAITool,
  type OllamaTool,
  type LlamaCppTool,
  type ProviderFormat,
  // Converters
  toAnthropicFormat,
  toOpenAIFormat,
  toOllamaFormat,
  toLlamaCppFormat,
  toPromptFormat,
  toolDefinitionToAITool,
  convertToolsToFormat,
  // Prompt-based parsing
  parsePromptToolCalls,
  extractPromptResponse,
  // Utilities
  validateToolDefinition,
  supportsNativeToolCalling,
  getProviderFormat,
} from './providers/tool-format-converter';

// Provider Adapter
export {
  // Types
  type ProviderAdapterConfig,
  type SendMessageOptions,
  type AdaptedResponse,
  // Class
  ProviderAdapter,
  // Factory functions
  createProviderAdapter,
  createDesignLibreAdapter,
  createCADLibreAdapter,
  createCAMLibreAdapter,
} from './providers/provider-adapter';
