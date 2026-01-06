/**
 * Provider Adapter
 *
 * Provides a unified interface for AI providers that integrates:
 * - System prompt building
 * - Tool format conversion
 * - Context injection
 *
 * This adapter makes it easy to use any supported provider with the
 * AI priming system in a model-agnostic way.
 */

import type { AIProvider, AIMessage, AIResponse, AITool, AIToolCall } from './ai-provider';
import { getToolDefinitions } from '../tools/tool-registry';
import {
  toPromptFormat,
  parsePromptToolCalls,
  extractPromptResponse,
  toolDefinitionToAITool,
  getProviderFormat,
  supportsNativeToolCalling,
} from './tool-format-converter';
import type { ProviderFormat } from './tool-format-converter';
import {
  buildSystemPrompt,
  buildContextPrompt,
  type SystemPromptOptions,
  type DesignContext,
} from '../prompts/system-prompt-builder';

// =============================================================================
// Types
// =============================================================================

/**
 * Adapter configuration
 */
export interface ProviderAdapterConfig {
  /** The underlying AI provider */
  provider: AIProvider;
  /** Provider format for tool conversion (auto-detected if not specified) */
  format?: ProviderFormat;
  /** System prompt options */
  systemPromptOptions?: SystemPromptOptions;
  /** Tool names to include (defaults to all priority 1 tools) */
  toolNames?: string[];
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Temperature for response */
  temperature?: number;
}

/**
 * Send message options
 */
export interface SendMessageOptions {
  /** Override system prompt options */
  systemPromptOptions?: SystemPromptOptions;
  /** Current design context */
  context?: DesignContext;
  /** Override tool names */
  toolNames?: string[];
  /** Override max tokens */
  maxTokens?: number;
  /** Override temperature */
  temperature?: number;
  /** Additional tools beyond registered ones */
  additionalTools?: AITool[];
  /** Include tool call results in messages */
  toolResults?: Array<{
    toolCallId: string;
    result: unknown;
  }>;
}

/**
 * Adapted response with unified format
 */
export interface AdaptedResponse {
  /** Response text */
  content: string;
  /** Tool calls (normalized across all providers) */
  toolCalls: AIToolCall[];
  /** Whether response requires tool execution */
  requiresToolExecution: boolean;
  /** Stop reason */
  stopReason: AIResponse['stopReason'];
  /** Token usage if available */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  /** The provider format used */
  format: ProviderFormat;
}

// =============================================================================
// Provider Adapter Class
// =============================================================================

/**
 * Provider Adapter
 *
 * Wraps an AIProvider with automatic system prompt building and tool formatting.
 */
export class ProviderAdapter {
  private provider: AIProvider;
  private format: ProviderFormat;
  private systemPromptOptions: SystemPromptOptions;
  private toolNames: string[];
  private maxTokens: number;
  private temperature: number;
  private cachedTools: AITool[] | null = null;
  private cachedSystemPrompt: string | null = null;

  constructor(config: ProviderAdapterConfig) {
    this.provider = config.provider;
    this.format = config.format ?? getProviderFormat(config.provider.name);
    this.systemPromptOptions = config.systemPromptOptions ?? {};
    this.toolNames = config.toolNames ?? [];
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(
    messages: AIMessage[],
    options: SendMessageOptions = {}
  ): Promise<AdaptedResponse> {
    // Build system prompt
    const systemPrompt = this.buildFullSystemPrompt(options);

    // Get tools in provider format
    const tools = this.getFormattedTools(options);

    // Handle prompt-based providers differently
    if (!supportsNativeToolCalling(this.format)) {
      return this.sendPromptBasedMessage(messages, systemPrompt, tools, options);
    }

    // Prepare messages with tool results if provided
    const preparedMessages = this.prepareMessages(messages, options.toolResults);

    // Send to provider
    const response = await this.provider.sendMessage(preparedMessages, {
      systemPrompt,
      tools,
      maxTokens: options.maxTokens ?? this.maxTokens,
      temperature: options.temperature ?? this.temperature,
    });

    return this.adaptResponse(response);
  }

  /**
   * Stream a message response
   */
  async *streamMessage(
    messages: AIMessage[],
    options: SendMessageOptions = {}
  ): AsyncIterable<{ type: 'text' | 'tool_call'; content?: string; toolCall?: Partial<AIToolCall> }> {
    // Build system prompt
    const systemPrompt = this.buildFullSystemPrompt(options);

    // Get tools in provider format
    const tools = this.getFormattedTools(options);

    // Prepare messages with tool results if provided
    const preparedMessages = this.prepareMessages(messages, options.toolResults);

    // Stream from provider
    const stream = this.provider.streamMessage(preparedMessages, {
      systemPrompt,
      tools,
      maxTokens: options.maxTokens ?? this.maxTokens,
      temperature: options.temperature ?? this.temperature,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'text' && chunk.text) {
        yield { type: 'text' as const, content: chunk.text };
      } else if ((chunk.type === 'tool_call_start' || chunk.type === 'tool_call_delta') && chunk.toolCall) {
        yield { type: 'tool_call' as const, toolCall: chunk.toolCall };
      }
    }
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ProviderAdapterConfig>): void {
    if (config.format !== undefined) {
      this.format = config.format;
    }
    if (config.systemPromptOptions !== undefined) {
      this.systemPromptOptions = config.systemPromptOptions;
      this.cachedSystemPrompt = null;
    }
    if (config.toolNames !== undefined) {
      this.toolNames = config.toolNames;
      this.cachedTools = null;
    }
    if (config.maxTokens !== undefined) {
      this.maxTokens = config.maxTokens;
    }
    if (config.temperature !== undefined) {
      this.temperature = config.temperature;
    }
  }

  /**
   * Get the provider format being used
   */
  getFormat(): ProviderFormat {
    return this.format;
  }

  /**
   * Get the underlying provider
   */
  getProvider(): AIProvider {
    return this.provider;
  }

  /**
   * Check if the provider supports native tool calling
   */
  supportsNativeTools(): boolean {
    return supportsNativeToolCalling(this.format);
  }

  /**
   * Clear cached prompts and tools (call after changing tool definitions)
   */
  clearCache(): void {
    this.cachedTools = null;
    this.cachedSystemPrompt = null;
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * Build the complete system prompt with context
   */
  private buildFullSystemPrompt(options: SendMessageOptions): string {
    const promptOptions = {
      ...this.systemPromptOptions,
      ...options.systemPromptOptions,
    };

    // Use cached prompt if options haven't changed
    if (this.cachedSystemPrompt && !options.systemPromptOptions && !options.context) {
      return this.cachedSystemPrompt;
    }

    const result = buildSystemPrompt(promptOptions);
    let prompt = result.prompt;

    // Add context if provided
    if (options.context) {
      prompt += '\n\n---\n\n' + buildContextPrompt(options.context);
    }

    // Add prompt-based tool documentation for non-native providers
    if (!supportsNativeToolCalling(this.format)) {
      const tools = this.getAITools(options);
      prompt += '\n\n---\n\n' + toPromptFormat(tools);
    }

    // Cache if no context was provided
    if (!options.context && !options.systemPromptOptions) {
      this.cachedSystemPrompt = prompt;
    }

    return prompt;
  }

  /**
   * Get tools formatted for the provider
   */
  private getFormattedTools(options: SendMessageOptions): AITool[] {
    if (!supportsNativeToolCalling(this.format)) {
      // Prompt-based providers don't use tools array
      return [];
    }

    return this.getAITools(options);
  }

  /**
   * Get AITool array from tool names
   */
  private getAITools(options: SendMessageOptions): AITool[] {
    // Use cached tools if available
    if (this.cachedTools && !options.toolNames && !options.additionalTools) {
      return this.cachedTools;
    }

    const toolNames = options.toolNames ?? this.toolNames;
    let tools: AITool[] = [];

    if (toolNames.length > 0) {
      const definitions = getToolDefinitions(toolNames);
      tools = definitions.map(toolDefinitionToAITool);
    }

    // Add additional tools if provided
    if (options.additionalTools) {
      tools = [...tools, ...options.additionalTools];
    }

    // Cache if using default tools
    if (!options.toolNames && !options.additionalTools) {
      this.cachedTools = tools;
    }

    return tools;
  }

  /**
   * Prepare messages with tool results
   */
  private prepareMessages(
    messages: AIMessage[],
    toolResults?: Array<{ toolCallId: string; result: unknown }>
  ): AIMessage[] {
    if (!toolResults || toolResults.length === 0) {
      return messages;
    }

    // Add tool result messages
    const resultMessages: AIMessage[] = toolResults.map(({ toolCallId, result }) => ({
      role: 'user' as const,
      content: JSON.stringify({
        type: 'tool_result',
        tool_use_id: toolCallId,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      }),
    }));

    return [...messages, ...resultMessages];
  }

  /**
   * Handle prompt-based message sending
   */
  private async sendPromptBasedMessage(
    messages: AIMessage[],
    systemPrompt: string,
    _tools: AITool[],
    options: SendMessageOptions
  ): Promise<AdaptedResponse> {
    // For prompt-based providers, tools are included in the system prompt
    const response = await this.provider.sendMessage(messages, {
      systemPrompt,
      maxTokens: options.maxTokens ?? this.maxTokens,
      temperature: options.temperature ?? this.temperature,
    });

    // Parse tool calls from the response
    const toolCalls = parsePromptToolCalls(response.content);
    const content = extractPromptResponse(response.content);

    const result: AdaptedResponse = {
      content,
      toolCalls: toolCalls.map((tc, index) => ({
        id: `prompt-${index}`,
        name: tc.tool,
        arguments: tc.args,
      })),
      requiresToolExecution: toolCalls.length > 0,
      stopReason: response.stopReason,
      format: this.format,
    };
    if (response.usage) {
      result.usage = response.usage;
    }
    return result;
  }

  /**
   * Adapt provider response to unified format
   */
  private adaptResponse(response: AIResponse): AdaptedResponse {
    const result: AdaptedResponse = {
      content: response.content,
      toolCalls: response.toolCalls,
      requiresToolExecution: response.toolCalls.length > 0,
      stopReason: response.stopReason,
      format: this.format,
    };
    if (response.usage) {
      result.usage = response.usage;
    }
    return result;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a provider adapter
 */
export function createProviderAdapter(config: ProviderAdapterConfig): ProviderAdapter {
  return new ProviderAdapter(config);
}

/**
 * Create an adapter with default configuration for DesignLibre
 */
export function createDesignLibreAdapter(
  provider: AIProvider,
  options?: Partial<Omit<ProviderAdapterConfig, 'provider'>>
): ProviderAdapter {
  return new ProviderAdapter({
    provider,
    systemPromptOptions: {
      application: 'designlibre',
      verbosity: 'standard',
      ...options?.systemPromptOptions,
    },
    ...options,
  });
}

/**
 * Create an adapter with default configuration for CADLibre
 */
export function createCADLibreAdapter(
  provider: AIProvider,
  options?: Partial<Omit<ProviderAdapterConfig, 'provider'>>
): ProviderAdapter {
  return new ProviderAdapter({
    provider,
    systemPromptOptions: {
      application: 'cadlibre',
      verbosity: 'standard',
      ...options?.systemPromptOptions,
    },
    ...options,
  });
}

/**
 * Create an adapter with default configuration for CAMLibre
 */
export function createCAMLibreAdapter(
  provider: AIProvider,
  options?: Partial<Omit<ProviderAdapterConfig, 'provider'>>
): ProviderAdapter {
  return new ProviderAdapter({
    provider,
    systemPromptOptions: {
      application: 'camlibre',
      verbosity: 'standard',
      ...options?.systemPromptOptions,
    },
    ...options,
  });
}
