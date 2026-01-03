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
import type { ToolResult, ToolCall } from './tools/tool-executor';
import { DesignLibreBridge, createDesignLibreBridge } from './tools/designlibre-bridge';
import { setGlobalBridge } from './tools/runtime-bridge';

import { CanvasCapture, createCanvasCapture } from './vision/canvas-capture';
import type { CaptureResult } from './vision/canvas-capture';

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

    // Forward cursor events
    this.actionExecutor.on('cursor:move', ({ x, y }) => {
      this.cursorPosition = { x, y };
      this.emit('ai:cursor:move', { x, y });
    });

    // Register providers
    this.registerProviders(config.providers);
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
      this.conversationManager.addUserMessage(message, !!screenshot);

      // Build message content
      const userMessage: AIMessage = screenshot
        ? {
            role: 'user',
            content: [
              { type: 'text', text: message },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  mediaType: screenshot.mediaType,
                  data: screenshot.base64,
                },
              },
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

      // Execute tool calls
      if (response.toolCalls.length > 0) {
        this.setStatus('executing');
        await this.executeToolCalls(response.toolCalls);
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

      this.conversationManager.addUserMessage(message, !!screenshot);

      const userMessage: AIMessage = screenshot
        ? {
            role: 'user',
            content: [
              { type: 'text', text: message },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  mediaType: screenshot.mediaType,
                  data: screenshot.base64,
                },
              },
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
          toolCalls.push(chunk.toolCall as AIToolCall);
        }
      }

      // Add to conversation
      this.conversationManager.addAssistantMessage(fullContent);

      // Execute tool calls
      if (toolCalls.length > 0) {
        this.setStatus('executing');
        await this.executeToolCalls(toolCalls);
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
   */
  private async executeToolCalls(toolCalls: AIToolCall[]): Promise<void> {
    for (const toolCall of toolCalls) {
      this.emit('ai:tool:start', { toolCall });

      // Convert AIToolCall to ToolCall format
      const call: ToolCall = {
        tool: toolCall.name,
        args: toolCall.arguments,
      };

      // Execute through the ToolExecutor
      const result = await this.toolExecutor.executeTool(call);

      // Handle cursor movement for look_at tool
      if (toolCall.name === 'look_at' && result.success) {
        const x = toolCall.arguments['x'] as number;
        const y = toolCall.arguments['y'] as number;
        this.cursorPosition = { x, y };
        this.emit('ai:cursor:move', { x, y });
      }

      this.emit('ai:tool:complete', { toolCall, result });

      // Log tool execution for debugging
      if (!result.success) {
        console.warn(`Tool "${toolCall.name}" failed:`, result.error);
      }
    }
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
