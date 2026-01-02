/**
 * Anthropic Claude Provider
 *
 * Integration with Anthropic's Claude API for AI assistance.
 */

import type {
  AIProvider,
  AICapabilities,
  AIMessage,
  AITool,
  AIResponse,
  AIStreamChunk,
  AIProviderConfig,
  AIToolCall,
} from './ai-provider';

/**
 * Anthropic-specific configuration
 */
export interface AnthropicConfig extends AIProviderConfig {
  /** Anthropic API key */
  apiKey: string;
  /** API base URL (for proxies) */
  baseUrl?: string;
  /** Model to use (default: claude-sonnet-4-20250514) */
  model?: string;
}

/**
 * Anthropic API message format
 */
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: AnthropicContent[];
}

type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

/**
 * Anthropic API tool format
 */
interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Anthropic API response
 */
interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContent[];
  model: string;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Anthropic streaming event types
 */
interface AnthropicStreamEvent {
  type: string;
  index?: number;
  delta?: {
    type?: string;
    text?: string;
    partial_json?: string;
  };
  content_block?: {
    type: string;
    id?: string;
    name?: string;
    text?: string;
  };
  message?: AnthropicResponse;
}

/**
 * Anthropic Claude provider implementation
 */
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  readonly capabilities: AICapabilities = {
    vision: true,
    streaming: true,
    functionCalling: true,
    maxContextTokens: 200000,
  };

  private config: AnthropicConfig;
  private connected = false;

  constructor(config: AnthropicConfig) {
    this.config = {
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4096,
      temperature: 0.7,
      ...config,
    };
  }

  async connect(): Promise<void> {
    // Validate API key by making a minimal request
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
      }

      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  configure(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async sendMessage(
    messages: AIMessage[],
    options?: {
      tools?: AITool[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResponse> {
    const anthropicMessages = this.convertMessages(messages);
    const anthropicTools = options?.tools?.map((t) => this.convertTool(t));

    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      messages: anthropicMessages,
    };

    if (options?.temperature !== undefined) {
      body['temperature'] = options.temperature;
    }

    const systemPrompt = options?.systemPrompt ?? this.config.systemPrompt;
    if (systemPrompt) {
      body['system'] = systemPrompt;
    }

    if (anthropicTools && anthropicTools.length > 0) {
      body['tools'] = anthropicTools;
    }

    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data: AnthropicResponse = await response.json();
    return this.convertResponse(data);
  }

  async *streamMessage(
    messages: AIMessage[],
    options?: {
      tools?: AITool[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): AsyncIterable<AIStreamChunk> {
    const anthropicMessages = this.convertMessages(messages);
    const anthropicTools = options?.tools?.map((t) => this.convertTool(t));

    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      messages: anthropicMessages,
      stream: true,
    };

    if (options?.temperature !== undefined) {
      body['temperature'] = options.temperature;
    }

    const systemPrompt = options?.systemPrompt ?? this.config.systemPrompt;
    if (systemPrompt) {
      body['system'] = systemPrompt;
    }

    if (anthropicTools && anthropicTools.length > 0) {
      body['tools'] = anthropicTools;
    }

    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const currentToolCalls: Map<number, Partial<AIToolCall>> = new Map();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { type: 'done' };
              continue;
            }

            try {
              const event: AnthropicStreamEvent = JSON.parse(data);

              if (event.type === 'content_block_start') {
                if (event.content_block?.type === 'tool_use') {
                  const toolCall: Partial<AIToolCall> = {
                    id: event.content_block.id ?? '',
                    name: event.content_block.name ?? '',
                    arguments: {},
                  };
                  const idx = event.index ?? 0;
                  currentToolCalls.set(idx, toolCall);
                  yield { type: 'tool_call_start', toolCall, index: idx };
                }
              } else if (event.type === 'content_block_delta') {
                if (event.delta?.type === 'text_delta' && event.delta.text) {
                  yield { type: 'text', text: event.delta.text };
                } else if (event.delta?.type === 'input_json_delta' && event.delta.partial_json) {
                  yield {
                    type: 'tool_call_delta',
                    text: event.delta.partial_json,
                    index: event.index ?? 0,
                  };
                }
              } else if (event.type === 'content_block_stop') {
                const idx = event.index ?? 0;
                const toolCall = currentToolCalls.get(idx);
                if (toolCall) {
                  yield { type: 'tool_call_end', toolCall, index: idx };
                  currentToolCalls.delete(idx);
                }
              } else if (event.type === 'message_stop') {
                yield { type: 'done' };
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  private convertMessages(messages: AIMessage[]): AnthropicMessage[] {
    const result: AnthropicMessage[] = [];

    for (const msg of messages) {
      // Skip system messages (handled separately)
      if (msg.role === 'system') continue;

      const content: AnthropicContent[] = [];

      if (typeof msg.content === 'string') {
        content.push({ type: 'text', text: msg.content });
      } else {
        for (const part of msg.content) {
          if (part.type === 'text') {
            content.push({ type: 'text', text: part.text });
          } else if (part.type === 'image') {
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: part.source.mediaType,
                data: part.source.data,
              },
            });
          }
        }
      }

      result.push({ role: msg.role as 'user' | 'assistant', content });
    }

    return result;
  }

  private convertTool(tool: AITool): AnthropicTool {
    const inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] } = {
      type: 'object',
      properties: tool.parameters.properties,
    };
    if (tool.parameters.required) {
      inputSchema.required = tool.parameters.required;
    }
    return {
      name: tool.name,
      description: tool.description,
      input_schema: inputSchema,
    };
  }

  private convertResponse(response: AnthropicResponse): AIResponse {
    let content = '';
    const toolCalls: AIToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input,
        });
      }
    }

    return {
      content,
      toolCalls,
      stopReason: response.stop_reason,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}

/**
 * Create an Anthropic provider instance.
 */
export function createAnthropicProvider(config: AnthropicConfig): AnthropicProvider {
  return new AnthropicProvider(config);
}
