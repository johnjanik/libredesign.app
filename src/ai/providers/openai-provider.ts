/**
 * OpenAI Provider
 *
 * Integration with OpenAI's GPT-4 API for AI assistance.
 * Supports vision (GPT-4o), streaming, and function calling.
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
  ContentPart,
} from './ai-provider';
import { tauriFetch } from '../utils/tauri-fetch';

/**
 * OpenAI-specific configuration
 */
export interface OpenAIConfig extends AIProviderConfig {
  /** OpenAI API key */
  apiKey: string;
  /** API base URL (for proxies or Azure) */
  baseUrl?: string;
  /** Organization ID (optional) */
  organization?: string;
  /** Model to use (default: gpt-4o) */
  model?: string;
}

/**
 * OpenAI message format
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | OpenAIContentPart[] | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

/**
 * OpenAI tool format
 */
interface OpenAITool {
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
 * OpenAI tool call format
 */
interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * OpenAI API response
 */
interface OpenAIResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI streaming chunk
 */
interface OpenAIStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | null;
  }>;
}

/**
 * OpenAI GPT provider implementation
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly capabilities: AICapabilities = {
    vision: true, // GPT-4o and GPT-4 Vision support images
    streaming: true,
    functionCalling: true,
    maxContextTokens: 128000, // GPT-4o context window
  };

  private config: OpenAIConfig;
  private connected = false;

  constructor(config: OpenAIConfig) {
    this.config = {
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      maxTokens: 4096,
      temperature: 0.7,
      ...config,
    };
  }

  async connect(): Promise<void> {
    try {
      // Validate API key by listing models
      const response = await tauriFetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
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
    const openaiMessages = this.convertMessages(messages, options?.systemPrompt);
    const openaiTools = options?.tools?.map((t) => this.convertTool(t));

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: openaiMessages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
    };

    if (options?.temperature !== undefined) {
      body['temperature'] = options.temperature;
    } else if (this.config.temperature !== undefined) {
      body['temperature'] = this.config.temperature;
    }

    if (openaiTools && openaiTools.length > 0) {
      body['tools'] = openaiTools;
    }

    const response = await tauriFetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();
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
    const openaiMessages = this.convertMessages(messages, options?.systemPrompt);
    const openaiTools = options?.tools?.map((t) => this.convertTool(t));

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: openaiMessages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      stream: true,
    };

    if (options?.temperature !== undefined) {
      body['temperature'] = options.temperature;
    } else if (this.config.temperature !== undefined) {
      body['temperature'] = this.config.temperature;
    }

    if (openaiTools && openaiTools.length > 0) {
      body['tools'] = openaiTools;
    }

    const response = await tauriFetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const currentToolCalls: Map<number, Partial<AIToolCall> & { argumentsBuffer: string }> = new Map();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              // Finalize any pending tool calls
              for (const [index, toolCall] of currentToolCalls) {
                try {
                  const args = JSON.parse(toolCall.argumentsBuffer || '{}');
                  yield {
                    type: 'tool_call_end',
                    toolCall: { ...toolCall, arguments: args },
                    index,
                  };
                } catch {
                  yield {
                    type: 'tool_call_end',
                    toolCall: { ...toolCall, arguments: {} },
                    index,
                  };
                }
              }
              yield { type: 'done' };
              continue;
            }

            try {
              const chunk: OpenAIStreamChunk = JSON.parse(data);
              const choice = chunk.choices[0];

              if (!choice) continue;

              // Handle text content
              if (choice.delta.content) {
                yield { type: 'text', text: choice.delta.content };
              }

              // Handle tool calls
              if (choice.delta.tool_calls) {
                for (const tc of choice.delta.tool_calls) {
                  const index = tc.index;
                  let current = currentToolCalls.get(index);

                  // Start of a new tool call
                  if (tc.id) {
                    current = {
                      id: tc.id,
                      name: tc.function?.name || '',
                      argumentsBuffer: '',
                    };
                    currentToolCalls.set(index, current);
                    yield {
                      type: 'tool_call_start',
                      toolCall: { id: tc.id, name: tc.function?.name || '' },
                      index,
                    };
                  }

                  // Update function name if provided
                  if (tc.function?.name && current) {
                    current.name = tc.function.name;
                  }

                  // Accumulate arguments
                  if (tc.function?.arguments && current) {
                    current.argumentsBuffer += tc.function.arguments;
                    yield {
                      type: 'tool_call_delta',
                      text: tc.function.arguments,
                      index,
                    };
                  }
                }
              }

              // Handle finish reason
              if (choice.finish_reason === 'stop' || choice.finish_reason === 'tool_calls') {
                // Tool calls are finalized when we get [DONE]
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    if (this.config.organization) {
      headers['OpenAI-Organization'] = this.config.organization;
    }

    return headers;
  }

  private convertMessages(messages: AIMessage[], systemPrompt?: string): OpenAIMessage[] {
    const result: OpenAIMessage[] = [];

    // Add system prompt first
    const system = systemPrompt ?? this.config.systemPrompt;
    if (system) {
      result.push({ role: 'system', content: system });
    }

    for (const msg of messages) {
      if (msg.role === 'system') {
        result.push({ role: 'system', content: this.extractText(msg) });
        continue;
      }

      // Convert content
      if (typeof msg.content === 'string') {
        result.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      } else {
        // Multi-part content (text + images)
        const parts = this.convertContentParts(msg.content);
        result.push({
          role: msg.role as 'user' | 'assistant',
          content: parts,
        });
      }
    }

    return result;
  }

  private convertContentParts(parts: ContentPart[]): OpenAIContentPart[] {
    return parts.map((part) => {
      if (part.type === 'text') {
        return { type: 'text' as const, text: part.text };
      } else {
        // Convert base64 image to data URL
        const dataUrl = `data:${part.source.mediaType};base64,${part.source.data}`;
        return {
          type: 'image_url' as const,
          image_url: { url: dataUrl, detail: 'auto' as const },
        };
      }
    });
  }

  private convertTool(tool: AITool): OpenAITool {
    const params: OpenAITool['function']['parameters'] = {
      type: 'object',
      properties: tool.parameters.properties,
    };

    if (tool.parameters.required && tool.parameters.required.length > 0) {
      params.required = tool.parameters.required;
    }

    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: params,
      },
    };
  }

  private convertResponse(response: OpenAIResponse): AIResponse {
    const choice = response.choices[0];
    if (!choice) {
      return {
        content: '',
        toolCalls: [],
        stopReason: 'end_turn',
      };
    }

    const content = choice.message.content || '';
    const toolCalls: AIToolCall[] = [];

    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        try {
          const args = JSON.parse(tc.function.arguments);
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: args,
          });
        } catch {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: {},
          });
        }
      }
    }

    // Map OpenAI finish reasons to our format
    let stopReason: AIResponse['stopReason'] = 'end_turn';
    if (choice.finish_reason === 'tool_calls') {
      stopReason = 'tool_use';
    } else if (choice.finish_reason === 'length') {
      stopReason = 'max_tokens';
    } else if (choice.finish_reason === 'content_filter') {
      stopReason = 'stop_sequence';
    }

    const result: AIResponse = {
      content,
      toolCalls,
      stopReason,
    };

    if (response.usage) {
      result.usage = {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
      };
    }

    return result;
  }

  private extractText(msg: AIMessage): string {
    if (typeof msg.content === 'string') return msg.content;
    return msg.content
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join('\n');
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    const response = await tauriFetch(`${this.config.baseUrl}/models`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.data || [])
      .filter((m: { id: string }) => m.id.startsWith('gpt-'))
      .map((m: { id: string }) => m.id);
  }
}

/**
 * Create an OpenAI provider instance.
 */
export function createOpenAIProvider(config: OpenAIConfig): OpenAIProvider {
  return new OpenAIProvider(config);
}
