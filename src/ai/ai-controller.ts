/**
 * AI Controller
 *
 * Main controller for AI integration with DesignLibre.
 * Coordinates providers, actions, vision, and conversation management.
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { Point } from '@core/types/geometry';

import {
  ProviderManager,
  createProviderManager,
} from './providers/provider-manager';
import type {
  AIProvider,
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AIToolCall,
} from './providers/ai-provider';
import { createAnthropicProvider } from './providers/anthropic-provider';
import type { AnthropicConfig } from './providers/anthropic-provider';
import { createOllamaProvider } from './providers/ollama-provider';
import type { OllamaConfig } from './providers/ollama-provider';
import { createLlamaCppProvider } from './providers/llamacpp-provider';
import type { LlamaCppConfig } from './providers/llamacpp-provider';

import { ActionExecutor, createActionExecutor } from './actions/action-executor';
import type { AIAction, ActionResult } from './actions/action-types';

import { ToolExecutor, createToolExecutor } from './tools/tool-executor';
import type { ToolResult, ToolCall, MessageContext, AttachedImage } from './tools/tool-executor';
import { DesignLibreBridge, createDesignLibreBridge } from './tools/designlibre-bridge';
import { setGlobalBridge } from './tools/runtime-bridge';

import { CanvasCapture, createCanvasCapture } from './vision/canvas-capture';
import type { CaptureResult } from './vision/canvas-capture';
import { parseTextToolCalls } from './tools/text-tool-parser';

// Advanced parser for fault-tolerant JSON parsing from local models
import {
  AIOutputParser,
  createParser,
  type ParserConfig,
  type NormalizedToolCall,
  type ModelType,
} from './parser';

import {
  CoordinateCalibrator,
  createCoordinateCalibrator,
} from './calibration/coordinate-calibrator';
import type { CalibrationResult } from './calibration/coordinate-calibrator';

import { ContextBuilder, createContextBuilder } from './context/context-builder';
import {
  ConversationManager,
  createConversationManager,
} from './context/conversation-manager';
import { SchemaValidator } from './parser/schema-validator';
import { createDefaultRegistry, type ToolSchemaRegistry } from './parser/schema-registry';

/**
 * AI Controller events
 */
export interface AIControllerEvents {
  'ai:message:start': { message: string };
  'ai:message:complete': { response: AIResponse };
  'ai:message:error': { error: Error };
  'ai:stream:chunk': { chunk: AIStreamChunk };
  'ai:tool:start': { toolCall: AIToolCall };
  'ai:tool:complete': { toolCall: AIToolCall; result: ToolResult };
  'ai:cursor:move': { x: number; y: number };
  'ai:status:change': { status: AIStatus };
  [key: string]: unknown;
}

/**
 * AI status
 */
export type AIStatus = 'idle' | 'thinking' | 'executing' | 'error';

/**
 * AI Controller configuration
 */
export interface AIControllerConfig {
  /** Provider configurations */
  providers?: {
    anthropic?: AnthropicConfig;
    ollama?: OllamaConfig;
    llamacpp?: LlamaCppConfig;
  };
  /** Default provider to use */
  defaultProvider?: string;
  /** Fallback provider chain */
  fallbackChain?: string[];
  /** Auto-connect providers */
  autoConnect?: boolean;
  /** Include scene graph in context */
  includeSceneGraph?: boolean;
  /** Advanced parser configuration */
  parser?: {
    /** Enable the advanced fault-tolerant parser (default: true) */
    enabled?: boolean;
    /** Parser config overrides */
    config?: Partial<ParserConfig>;
    /** Use simple parser as fallback if advanced fails */
    fallbackToSimple?: boolean;
  };
}

/**
 * Chat options
 */
export interface ChatOptions {
  /** Include a screenshot with the message */
  screenshot?: boolean;
  /** Include scene graph in context */
  includeSceneGraph?: boolean;
  /** Stream the response */
  stream?: boolean;
  /** User-attached images (base64) */
  attachments?: Array<{
    data: string;
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  }>;
}

/**
 * AI Controller
 */
export class AIController extends EventEmitter<AIControllerEvents> {
  private providerManager: ProviderManager;
  private actionExecutor: ActionExecutor;
  private toolExecutor: ToolExecutor;
  private bridge: DesignLibreBridge;
  private canvasCapture: CanvasCapture;
  private calibrator: CoordinateCalibrator;
  private contextBuilder: ContextBuilder;
  private conversationManager: ConversationManager;
  private advancedParser: AIOutputParser | null = null;
  private schemaValidator: SchemaValidator;
  private schemaRegistry: ToolSchemaRegistry;
  private config: AIControllerConfig;
  private status: AIStatus = 'idle';
  private cursorPosition: Point = { x: 0, y: 0 };

  constructor(runtime: DesignLibreRuntime, config: AIControllerConfig = {}) {
    super();
    this.config = config;

    // Initialize components
    this.providerManager = createProviderManager({
      defaultProvider: config.defaultProvider,
      fallbackChain: config.fallbackChain,
      autoConnect: config.autoConnect,
    });

    // Initialize the bridge and tool executor
    this.bridge = createDesignLibreBridge(runtime);
    setGlobalBridge(this.bridge);
    this.toolExecutor = createToolExecutor(this.bridge);

    this.actionExecutor = createActionExecutor(runtime);
    this.canvasCapture = createCanvasCapture(runtime);
    this.calibrator = createCoordinateCalibrator(runtime);
    this.contextBuilder = createContextBuilder(runtime, this.calibrator);
    this.conversationManager = createConversationManager();

    // Initialize schema validator for tool parameter validation
    this.schemaRegistry = createDefaultRegistry();
    this.schemaValidator = new SchemaValidator({
      fuzzyToolMatching: true,
      fuzzyParamMatching: true,
      enableCoercion: true,
      strictMode: false,
      allowExtraParams: true,
      useDefaults: true,
    });

    // Forward cursor events
    this.actionExecutor.on('cursor:move', ({ x, y }) => {
      this.cursorPosition = { x, y };
      this.emit('ai:cursor:move', { x, y });
    });

    // Register providers
    this.registerProviders(config.providers);

    // Initialize advanced parser (enabled by default)
    if (config.parser?.enabled !== false) {
      this.advancedParser = createParser({
        strictMode: false,
        enableJson5: true,
        fuzzyToolMatching: true,
        semanticParamMapping: true,
        ...config.parser?.config,
      });
    }
  }

  /**
   * Register providers from config.
   */
  private async registerProviders(
    providers?: AIControllerConfig['providers']
  ): Promise<void> {
    if (!providers) return;

    if (providers.anthropic) {
      const provider = createAnthropicProvider(providers.anthropic);
      await this.providerManager.registerProvider(provider);
    }

    if (providers.ollama) {
      const provider = createOllamaProvider(providers.ollama);
      await this.providerManager.registerProvider(provider);
    }

    if (providers.llamacpp) {
      const provider = createLlamaCppProvider(providers.llamacpp);
      await this.providerManager.registerProvider(provider);
    }
  }

  // =========================================================================
  // Chat Interface
  // =========================================================================

  /**
   * Send a chat message to the AI.
   */
  async chat(message: string, options: ChatOptions = {}): Promise<AIResponse> {
    this.setStatus('thinking');
    this.emit('ai:message:start', { message });

    try {
      // Calibrate coordinates
      this.calibrator.calibrate();

      // Build context
      const context = this.contextBuilder.build({
        includeSceneGraph: options.includeSceneGraph ?? this.config.includeSceneGraph,
      });

      // Capture screenshot if requested
      let screenshot: CaptureResult | null = null;
      if (options.screenshot) {
        screenshot = await this.canvasCapture.capture();
      }

      // Add user message to conversation
      this.conversationManager.addUserMessage(message, !!screenshot || (options.attachments?.length ?? 0) > 0);

      // Build message content with images (screenshot + user attachments)
      type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
      const imageContent: Array<{ type: 'image'; source: { type: 'base64'; mediaType: ImageMediaType; data: string } }> = [];

      // Add screenshot if present
      if (screenshot) {
        imageContent.push({
          type: 'image',
          source: {
            type: 'base64',
            mediaType: screenshot.mediaType as ImageMediaType,
            data: screenshot.base64,
          },
        });
      }

      // Add user attachments
      if (options.attachments) {
        for (const att of options.attachments) {
          imageContent.push({
            type: 'image',
            source: {
              type: 'base64',
              mediaType: att.mimeType,
              data: att.data,
            },
          });
        }
      }

      const userMessage: AIMessage = imageContent.length > 0
        ? {
            role: 'user',
            content: [
              { type: 'text' as const, text: message },
              ...imageContent,
            ],
          }
        : { role: 'user', content: message };

      // Get previous messages (limited)
      const previousMessages = this.conversationManager.getLastMessages(10);
      const messages = [...previousMessages.slice(0, -1), userMessage];

      // Send to provider
      const response = await this.providerManager.sendMessage(messages, {
        tools: context.tools,
        systemPrompt: context.systemPrompt,
      });

      // Add assistant response to conversation
      this.conversationManager.addAssistantMessage(response.content);

      // Execute tool calls - either from native function calling or parsed from text
      let toolCallsToExecute = response.toolCalls;

      // If no native tool calls, try to parse JSON tool calls from text
      // This is needed for local models that don't support function calling
      if (toolCallsToExecute.length === 0 && response.content) {
        const parsedToolCalls = await this.parseToolCallsFromText(response.content);
        if (parsedToolCalls.length > 0) {
          toolCallsToExecute = parsedToolCalls;
        }
      }

      if (toolCallsToExecute.length > 0) {
        this.setStatus('executing');
        // Extract attached images from user message for tool context
        const messageContext = this.extractMessageContext(userMessage);
        await this.executeToolCalls(toolCallsToExecute, messageContext);
      }

      this.setStatus('idle');
      this.emit('ai:message:complete', { response });

      return response;
    } catch (error) {
      this.setStatus('error');
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('ai:message:error', { error: err });
      throw err;
    }
  }

  /**
   * Stream a chat message response.
   */
  async *streamChat(
    message: string,
    options: ChatOptions = {}
  ): AsyncIterable<AIStreamChunk> {
    this.setStatus('thinking');
    this.emit('ai:message:start', { message });

    try {
      // Calibrate and build context
      this.calibrator.calibrate();
      const context = this.contextBuilder.build({
        includeSceneGraph: options.includeSceneGraph ?? this.config.includeSceneGraph,
      });

      // Capture screenshot if requested
      let screenshot: CaptureResult | null = null;
      if (options.screenshot) {
        screenshot = await this.canvasCapture.capture();
      }

      this.conversationManager.addUserMessage(message, !!screenshot || (options.attachments?.length ?? 0) > 0);

      // Build message content with images (screenshot + user attachments)
      type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
      const imageContent: Array<{ type: 'image'; source: { type: 'base64'; mediaType: ImageMediaType; data: string } }> = [];

      // Add screenshot if present
      if (screenshot) {
        imageContent.push({
          type: 'image',
          source: {
            type: 'base64',
            mediaType: screenshot.mediaType as ImageMediaType,
            data: screenshot.base64,
          },
        });
      }

      // Add user attachments
      if (options.attachments) {
        for (const att of options.attachments) {
          imageContent.push({
            type: 'image',
            source: {
              type: 'base64',
              mediaType: att.mimeType,
              data: att.data,
            },
          });
        }
      }

      const userMessage: AIMessage = imageContent.length > 0
        ? {
            role: 'user',
            content: [
              { type: 'text' as const, text: message },
              ...imageContent,
            ],
          }
        : { role: 'user', content: message };

      const previousMessages = this.conversationManager.getLastMessages(10);
      const messages = [...previousMessages.slice(0, -1), userMessage];

      // Stream response
      let fullContent = '';
      const toolCalls: AIToolCall[] = [];

      for await (const chunk of this.providerManager.streamMessage(messages, {
        tools: context.tools,
        systemPrompt: context.systemPrompt,
      })) {
        this.emit('ai:stream:chunk', { chunk });
        yield chunk;

        if (chunk.type === 'text' && chunk.text) {
          fullContent += chunk.text;
        }

        if (chunk.type === 'tool_call_end' && chunk.toolCall) {
          console.log(`[AIController] Received tool call: ${chunk.toolCall.name}`);
          toolCalls.push(chunk.toolCall as AIToolCall);
        }
      }

      console.log(`[AIController] Total tool calls received: ${toolCalls.length}`);
      if (toolCalls.length > 0) {
        console.log(`[AIController] Tool calls:`, toolCalls.map(t => `${t.name}(${JSON.stringify(t.arguments).slice(0, 100)})`).join(', '));
      }

      // Add to conversation
      this.conversationManager.addAssistantMessage(fullContent);

      // Execute tool calls - either from native function calling or parsed from text
      let toolCallsToExecute = toolCalls;

      // If no native tool calls, try to parse JSON tool calls from text
      // This is needed for local models that don't support function calling
      if (toolCallsToExecute.length === 0 && fullContent) {
        const parsedToolCalls = await this.parseToolCallsFromText(fullContent);
        if (parsedToolCalls.length > 0) {
          toolCallsToExecute = parsedToolCalls;
        }
      }

      if (toolCallsToExecute.length > 0) {
        this.setStatus('executing');
        // Extract attached images from user message for tool context
        const messageContext = this.extractMessageContext(userMessage);
        await this.executeToolCalls(toolCallsToExecute, messageContext);
      }

      this.setStatus('idle');
    } catch (error) {
      this.setStatus('error');
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('ai:message:error', { error: err });
      throw err;
    }
  }

  // =========================================================================
  // Tool Execution
  // =========================================================================

  /**
   * Execute tool calls from the AI response using the ToolExecutor.
   * Includes parameter validation before execution.
   */
  private async executeToolCalls(
    toolCalls: AIToolCall[],
    messageContext?: MessageContext
  ): Promise<void> {
    // Set message context (attached images, etc.) before executing tools
    this.toolExecutor.setMessageContext(messageContext ?? null);

    for (const toolCall of toolCalls) {
      this.emit('ai:tool:start', { toolCall });

      // Validate parameters against schema
      const validationResult = this.schemaValidator.validate(
        { tool: toolCall.name, arguments: toolCall.arguments },
        this.schemaRegistry
      );

      // Use validated/normalized args if available, otherwise fall back to original
      const validatedArgs = validationResult.normalizedData?.arguments ?? toolCall.arguments;

      // Log validation warnings
      if (validationResult.warnings.length > 0) {
        console.info(`Tool "${toolCall.name}" validation warnings:`, validationResult.warnings);
      }

      // Log validation errors but still attempt execution (non-strict mode)
      if (!validationResult.isValid && validationResult.errors.length > 0) {
        console.warn(`Tool "${toolCall.name}" validation errors:`, validationResult.errors);
      }

      // Convert AIToolCall to ToolCall format with validated args
      const call: ToolCall = {
        tool: validationResult.normalizedData?.tool ?? toolCall.name,
        args: validatedArgs,
      };

      // Execute through the ToolExecutor
      const result = await this.toolExecutor.executeTool(call);

      // Handle cursor movement for look_at tool
      if (toolCall.name === 'look_at' && result.success) {
        const x = validatedArgs['x'] as number;
        const y = validatedArgs['y'] as number;
        this.cursorPosition = { x, y };
        this.emit('ai:cursor:move', { x, y });
      }

      this.emit('ai:tool:complete', { toolCall, result });

      // Log tool execution for debugging
      if (!result.success) {
        console.warn(`Tool "${toolCall.name}" failed:`, result.error);
      }
    }

    // Clear message context after execution
    this.toolExecutor.setMessageContext(null);
  }

  /**
   * Extract message context (attached images) from a user message
   */
  private extractMessageContext(message: AIMessage): MessageContext {
    const attachedImages: AttachedImage[] = [];

    if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'image' && 'source' in part) {
          const source = part.source as { type: string; mediaType: string; data: string };
          if (source.type === 'base64') {
            attachedImages.push({
              data: source.data,
              mediaType: source.mediaType as AttachedImage['mediaType'],
            });
          }
        }
      }
    }

    return { attachedImages };
  }

  /**
   * Parse tool calls from text using the advanced parser.
   * Falls back to simple parser if advanced fails or is disabled.
   */
  private async parseToolCallsFromText(text: string): Promise<AIToolCall[]> {
    // Try advanced parser first if enabled
    if (this.advancedParser) {
      try {
        // Determine model type from active provider
        const providerName = this.providerManager.getActiveProviderName();
        const modelType = this.getModelTypeFromProvider(providerName);

        const result = await this.advancedParser.parse(text, { modelType });

        if (result.success && result.toolCalls.length > 0) {
          console.log(
            `Advanced parser found ${result.toolCalls.length} tool call(s) ` +
            `(format: ${result.metadata.format}, confidence: ${result.metadata.confidence.toFixed(2)})`
          );

          // Log any warnings
          if (result.metadata.warnings.length > 0) {
            for (const warning of result.metadata.warnings) {
              console.warn(`Parser warning: ${warning.message}`);
            }
          }

          // Convert NormalizedToolCall to AIToolCall
          return result.toolCalls.map((tc) => this.normalizedToAIToolCall(tc));
        }
      } catch (error) {
        console.warn('Advanced parser failed:', error);
        // Fall through to simple parser if fallback is enabled
      }
    }

    // Use simple parser as fallback (or if advanced is disabled)
    if (!this.advancedParser || this.config.parser?.fallbackToSimple !== false) {
      const parsedToolCalls = parseTextToolCalls(text);
      if (parsedToolCalls.length > 0) {
        console.log(`Simple parser found ${parsedToolCalls.length} tool call(s) from text response`);
        return parsedToolCalls;
      }
    }

    return [];
  }

  /**
   * Convert NormalizedToolCall from advanced parser to AIToolCall.
   */
  private normalizedToAIToolCall(tc: NormalizedToolCall): AIToolCall {
    return {
      id: tc.id,
      name: tc.tool,
      arguments: tc.parameters,
    };
  }

  /**
   * Map provider name to model type for the parser.
   */
  private getModelTypeFromProvider(providerName: string | null): ModelType {
    if (!providerName) return 'unknown';

    const lower = providerName.toLowerCase();
    if (lower.includes('anthropic') || lower.includes('claude')) return 'claude';
    if (lower.includes('openai') || lower.includes('gpt')) return 'openai';
    if (lower.includes('ollama')) return 'ollama';
    if (lower.includes('llama')) return 'llama';
    if (lower.includes('qwen')) return 'qwen';
    if (lower.includes('mistral')) return 'mistral';
    return 'unknown';
  }

  // =========================================================================
  // Direct Execution
  // =========================================================================

  /**
   * Execute an AI action directly.
   */
  async execute(action: AIAction): Promise<ActionResult> {
    return this.actionExecutor.execute(action);
  }

  /**
   * Execute multiple actions.
   */
  async executeMany(actions: AIAction[]): Promise<ActionResult[]> {
    return this.actionExecutor.executeMany(actions);
  }

  // =========================================================================
  // Vision
  // =========================================================================

  /**
   * Capture the current canvas state.
   */
  async captureCanvas(): Promise<CaptureResult> {
    return this.canvasCapture.capture();
  }

  /**
   * Capture as base64 string.
   */
  async captureCanvasBase64(): Promise<string> {
    const result = await this.canvasCapture.capture();
    return result.base64;
  }

  // =========================================================================
  // Calibration
  // =========================================================================

  /**
   * Calibrate the coordinate system.
   */
  calibrate(): CalibrationResult {
    return this.calibrator.calibrate();
  }

  /**
   * Get current calibration.
   */
  getCalibration(): CalibrationResult | null {
    return this.calibrator.getCalibration();
  }

  /**
   * Convert vision coordinates to world coordinates.
   */
  visionToWorld(visionX: number, visionY: number): Point {
    return this.calibrator.visionToWorld(visionX, visionY);
  }

  // =========================================================================
  // Provider Management
  // =========================================================================

  /**
   * Set the active provider.
   */
  setProvider(name: string): void {
    this.providerManager.setActiveProvider(name);
  }

  /**
   * Get the active provider.
   */
  getProvider(): AIProvider | null {
    return this.providerManager.getActiveProvider();
  }

  /**
   * Get the active provider name.
   */
  getProviderName(): string | null {
    return this.providerManager.getActiveProviderName();
  }

  /**
   * Get all available provider names.
   */
  getProviderNames(): string[] {
    return this.providerManager.getProviderNames();
  }

  /**
   * Connect to the active provider.
   */
  async connect(): Promise<void> {
    await this.providerManager.connect();
  }

  // =========================================================================
  // Conversation
  // =========================================================================

  /**
   * Clear the conversation history.
   */
  clearConversation(): void {
    this.conversationManager.clear();
  }

  /**
   * Get conversation summary.
   */
  getConversationSummary(): string {
    return this.conversationManager.getSummary();
  }

  // =========================================================================
  // Status
  // =========================================================================

  /**
   * Get the current status.
   */
  getStatus(): AIStatus {
    return this.status;
  }

  /**
   * Set the status.
   */
  private setStatus(status: AIStatus): void {
    this.status = status;
    this.emit('ai:status:change', { status });
  }

  // =========================================================================
  // Cursor
  // =========================================================================

  /**
   * Get the AI cursor position.
   */
  getCursorPosition(): Point {
    return this.cursorPosition;
  }

  /**
   * Move the AI cursor.
   */
  moveCursor(x: number, y: number): void {
    this.cursorPosition = { x, y };
    this.emit('ai:cursor:move', { x, y });
  }

  // =========================================================================
  // Disposal
  // =========================================================================

  /**
   * Dispose of the AI controller.
   */
  dispose(): void {
    this.providerManager.dispose();
    this.actionExecutor.clear();
    this.clear();
  }
}

/**
 * Create an AI controller instance.
 */
export function createAIController(
  runtime: DesignLibreRuntime,
  config?: AIControllerConfig
): AIController {
  return new AIController(runtime, config);
}
