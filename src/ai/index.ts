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
export { ContextBuilder, createContextBuilder } from './context/context-builder';
export type { AIContext, ContextBuilderOptions } from './context/context-builder';

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
