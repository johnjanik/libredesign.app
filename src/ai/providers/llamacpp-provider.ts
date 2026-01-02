/**
 * llama.cpp Provider
 *
 * Integration with llama.cpp server for local AI inference.
 * Supports the OpenAI-compatible API endpoint.
 */

import type {
  AIProvider,
  AICapabilities,
  AIMessage,
  AITool,
  AIResponse,
  AIStreamChunk,
  AIProviderConfig,
} from './ai-provider';

/**
 * llama.cpp-specific configuration
 */
export interface LlamaCppConfig extends AIProviderConfig {
  /** Server endpoint */
  endpoint?: string;
  /** Use chat completions API (vs raw completions) */
  useChatApi?: boolean;
  /** Stop sequences */
  stop?: string[];
  /** Top-p sampling */
  topP?: number;
  /** Top-k sampling */
  topK?: number;
  /** Repetition penalty */
  repeatPenalty?: number;
}

/**
 * llama.cpp chat message format
 */
interface LlamaCppMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * llama.cpp chat response
 */
interface LlamaCppChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: LlamaCppMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * llama.cpp streaming chunk
 */
interface LlamaCppStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: { content?: string; role?: string };
    finish_reason: string | null;
  }>;
}

/**
 * llama.cpp completion response (raw API)
 */
interface LlamaCppCompletionResponse {
  content: string;
  stop: boolean;
  generation_settings?: Record<string, unknown>;
  tokens_predicted?: number;
  tokens_evaluated?: number;
}

/**
 * llama.cpp provider implementation
 */
export class LlamaCppProvider implements AIProvider {
  readonly name = 'llamacpp';
  readonly capabilities: AICapabilities = {
    vision: false, // Depends on model, most don't support vision
    streaming: true,
    functionCalling: false,
    maxContextTokens: 4096, // Varies by model
  };

  private config: LlamaCppConfig;
  private connected = false;

  constructor(config: LlamaCppConfig = {}) {
    this.config = {
      endpoint: 'http://localhost:8080',
      useChatApi: true,
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      stop: ['</s>', '<|im_end|>', '<|end|>'],
      ...config,
    };
  }

  async connect(): Promise<void> {
    try {
      // Check if server is running
      const response = await fetch(`${this.config.endpoint}/health`);
      if (!response.ok) {
        // Try alternative health check
        const propsResponse = await fetch(`${this.config.endpoint}/props`);
        if (!propsResponse.ok) {
          throw new Error('Server not responding');
        }
      }
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(
        `Failed to connect to llama.cpp server: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
    if (this.config.useChatApi) {
      return this.sendChatMessage(messages, options);
    } else {
      return this.sendCompletionMessage(messages, options);
    }
  }

  private async sendChatMessage(
    messages: AIMessage[],
    options?: {
      tools?: AITool[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResponse> {
    const llamaMessages = this.convertMessages(messages, options?.systemPrompt);

    const body: Record<string, unknown> = {
      messages: llamaMessages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      top_p: this.config.topP,
      top_k: this.config.topK,
      repeat_penalty: this.config.repeatPenalty,
      stop: this.config.stop,
      stream: false,
    };

    const response = await fetch(`${this.config.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`llama.cpp API error: ${error}`);
    }

    const data: LlamaCppChatResponse = await response.json();
    const choice = data.choices[0];

    return {
      content: choice?.message?.content || '',
      toolCalls: [],
      stopReason: choice?.finish_reason === 'stop' ? 'end_turn' : 'max_tokens',
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }

  private async sendCompletionMessage(
    messages: AIMessage[],
    options?: {
      tools?: AITool[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResponse> {
    // Build a single prompt from messages
    const prompt = this.buildPrompt(messages, options?.systemPrompt);

    const body: Record<string, unknown> = {
      prompt,
      n_predict: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      top_p: this.config.topP,
      top_k: this.config.topK,
      repeat_penalty: this.config.repeatPenalty,
      stop: this.config.stop,
      stream: false,
    };

    const response = await fetch(`${this.config.endpoint}/completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`llama.cpp API error: ${error}`);
    }

    const data: LlamaCppCompletionResponse = await response.json();

    return {
      content: data.content,
      toolCalls: [],
      stopReason: data.stop ? 'end_turn' : 'max_tokens',
      usage: {
        inputTokens: data.tokens_evaluated ?? 0,
        outputTokens: data.tokens_predicted ?? 0,
      },
    };
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
    if (this.config.useChatApi) {
      yield* this.streamChatMessage(messages, options);
    } else {
      yield* this.streamCompletionMessage(messages, options);
    }
  }

  private async *streamChatMessage(
    messages: AIMessage[],
    options?: {
      tools?: AITool[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): AsyncIterable<AIStreamChunk> {
    const llamaMessages = this.convertMessages(messages, options?.systemPrompt);

    const body: Record<string, unknown> = {
      messages: llamaMessages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      top_p: this.config.topP,
      top_k: this.config.topK,
      repeat_penalty: this.config.repeatPenalty,
      stop: this.config.stop,
      stream: true,
    };

    const response = await fetch(`${this.config.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`llama.cpp API error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

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
              const chunk: LlamaCppStreamChunk = JSON.parse(data);
              const delta = chunk.choices[0]?.delta;

              if (delta?.content) {
                yield { type: 'text', text: delta.content };
              }

              if (chunk.choices[0]?.finish_reason) {
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

  private async *streamCompletionMessage(
    messages: AIMessage[],
    options?: {
      tools?: AITool[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): AsyncIterable<AIStreamChunk> {
    const prompt = this.buildPrompt(messages, options?.systemPrompt);

    const body: Record<string, unknown> = {
      prompt,
      n_predict: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      top_p: this.config.topP,
      top_k: this.config.topK,
      repeat_penalty: this.config.repeatPenalty,
      stop: this.config.stop,
      stream: true,
    };

    const response = await fetch(`${this.config.endpoint}/completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`llama.cpp API error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

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

            try {
              const chunk: LlamaCppCompletionResponse = JSON.parse(data);

              if (chunk.content) {
                yield { type: 'text', text: chunk.content };
              }

              if (chunk.stop) {
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

  private convertMessages(messages: AIMessage[], systemPrompt?: string): LlamaCppMessage[] {
    const result: LlamaCppMessage[] = [];

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

      result.push({
        role: msg.role,
        content: this.extractText(msg),
      });
    }

    return result;
  }

  private buildPrompt(messages: AIMessage[], systemPrompt?: string): string {
    // Build a ChatML-style prompt
    const parts: string[] = [];

    const system = systemPrompt ?? this.config.systemPrompt;
    if (system) {
      parts.push(`<|im_start|>system\n${system}<|im_end|>`);
    }

    for (const msg of messages) {
      const content = this.extractText(msg);
      parts.push(`<|im_start|>${msg.role}\n${content}<|im_end|>`);
    }

    parts.push('<|im_start|>assistant\n');
    return parts.join('\n');
  }

  private extractText(msg: AIMessage): string {
    if (typeof msg.content === 'string') return msg.content;
    return msg.content
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join('\n');
  }

  /**
   * Get server properties.
   */
  async getServerProps(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.config.endpoint}/props`);
    if (!response.ok) {
      throw new Error(`Failed to get server props: ${response.statusText}`);
    }
    return response.json();
  }
}

/**
 * Create a llama.cpp provider instance.
 */
export function createLlamaCppProvider(config?: LlamaCppConfig): LlamaCppProvider {
  return new LlamaCppProvider(config);
}
