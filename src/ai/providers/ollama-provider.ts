/**
 * Ollama Provider
 *
 * Integration with local Ollama server for AI assistance.
 * Supports vision models like llava for image understanding.
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
 * Ollama-specific configuration
 */
export interface OllamaConfig extends AIProviderConfig {
  /** Ollama server endpoint */
  endpoint?: string;
  /** Model to use (default: llava for vision support) */
  model?: string;
  /** Keep model loaded in memory */
  keepAlive?: string;
}

/**
 * Ollama message format
 */
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

/**
 * Ollama chat response
 */
interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama provider implementation
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  readonly capabilities: AICapabilities = {
    vision: true, // Depends on model, llava supports vision
    streaming: true,
    functionCalling: false, // Ollama has limited tool support
    maxContextTokens: 8192, // Varies by model
  };

  private config: OllamaConfig;
  private connected = false;

  constructor(config: OllamaConfig = {}) {
    this.config = {
      endpoint: 'http://localhost:11434',
      model: 'llava',
      maxTokens: 2048,
      temperature: 0.7,
      keepAlive: '5m',
      ...config,
    };
  }

  async connect(): Promise<void> {
    try {
      // Check if Ollama is running
      const response = await fetch(`${this.config.endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama server not responding: ${response.statusText}`);
      }

      // Check if the model is available
      const data = await response.json();
      const models = data.models || [];
      const modelName = this.config.model?.split(':')[0];
      const hasModel = models.some(
        (m: { name: string }) => m.name.startsWith(modelName || '')
      );

      if (!hasModel && models.length > 0) {
        console.warn(
          `Model ${this.config.model} not found. Available models: ${models.map((m: { name: string }) => m.name).join(', ')}`
        );
      }

      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(
        `Failed to connect to Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    const ollamaMessages = this.convertMessages(messages, options?.systemPrompt);

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: ollamaMessages,
      stream: false,
      options: {
        num_predict: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
      },
    };

    if (this.config.keepAlive) {
      body['keep_alive'] = this.config.keepAlive;
    }

    const response = await fetch(`${this.config.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }

    const data: OllamaChatResponse = await response.json();

    return {
      content: data.message.content,
      toolCalls: [], // Ollama doesn't support tools in the same way
      stopReason: data.done_reason === 'stop' ? 'end_turn' : 'end_turn',
      usage: {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
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
    const ollamaMessages = this.convertMessages(messages, options?.systemPrompt);

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: ollamaMessages,
      stream: true,
      options: {
        num_predict: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
      },
    };

    if (this.config.keepAlive) {
      body['keep_alive'] = this.config.keepAlive;
    }

    const response = await fetch(`${this.config.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
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
          if (!line.trim()) continue;

          try {
            const data: OllamaChatResponse = JSON.parse(line);

            if (data.message?.content) {
              yield { type: 'text', text: data.message.content };
            }

            if (data.done) {
              yield { type: 'done' };
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const data: OllamaChatResponse = JSON.parse(buffer);
          if (data.message?.content) {
            yield { type: 'text', text: data.message.content };
          }
          if (data.done) {
            yield { type: 'done' };
          }
        } catch {
          // Ignore
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private convertMessages(messages: AIMessage[], systemPrompt?: string): OllamaMessage[] {
    const result: OllamaMessage[] = [];

    // Add system prompt first
    const system = systemPrompt ?? this.config.systemPrompt;
    if (system) {
      result.push({ role: 'system', content: system });
    }

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Combine system messages
        result.push({ role: 'system', content: this.extractText(msg) });
        continue;
      }

      const ollamaMsg: OllamaMessage = {
        role: msg.role,
        content: '',
      };

      if (typeof msg.content === 'string') {
        ollamaMsg.content = msg.content;
      } else {
        const textParts: string[] = [];
        const images: string[] = [];

        for (const part of msg.content) {
          if (part.type === 'text') {
            textParts.push(part.text);
          } else if (part.type === 'image') {
            // Ollama expects base64 without the data URL prefix
            images.push(part.source.data);
          }
        }

        ollamaMsg.content = textParts.join('\n');
        if (images.length > 0) {
          ollamaMsg.images = images;
        }
      }

      result.push(ollamaMsg);
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
   * List available models on the Ollama server.
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.config.endpoint}/api/tags`);
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`);
    }
    const data = await response.json();
    return (data.models || []).map((m: { name: string }) => m.name);
  }

  /**
   * Pull a model from Ollama registry.
   */
  async pullModel(model: string): Promise<void> {
    const response = await fetch(`${this.config.endpoint}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.statusText}`);
    }

    // Stream the pull progress
    const reader = response.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        console.log('Pull progress:', text);
      }
      reader.releaseLock();
    }
  }
}

/**
 * Create an Ollama provider instance.
 */
export function createOllamaProvider(config?: OllamaConfig): OllamaProvider {
  return new OllamaProvider(config);
}
