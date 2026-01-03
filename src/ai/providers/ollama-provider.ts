/**
 * Ollama Provider
 *
 * Integration with local Ollama server for AI assistance.
 * Supports vision models like llava for image understanding.
 * Supports tool calling for compatible models (llama3.1, mistral-nemo, etc.)
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
 * Ollama-specific configuration
 */
export interface OllamaConfig extends AIProviderConfig {
  /** Ollama server endpoint */
  endpoint?: string;
  /** Model to use (default: llama3.1:8b for tool support) */
  model?: string;
  /** Keep model loaded in memory */
  keepAlive?: string;
}

/**
 * Ollama tool format
 */
interface OllamaTool {
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
 * Ollama tool call format
 */
interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * Ollama message format
 */
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[];
  tool_calls?: OllamaToolCall[];
}

/**
 * Ollama chat response
 */
interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage & { tool_calls?: OllamaToolCall[] };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Model info from Ollama
 */
interface OllamaModelInfo {
  name: string;
  details?: {
    family?: string;
    parameter_size?: string;
  };
}

/**
 * Models known to support tool calling in Ollama
 */
const TOOL_CAPABLE_MODELS = [
  'llama3.1',
  'llama3.2',
  'mistral',
  'mistral-nemo',
  'mixtral',
  'qwen2',
  'qwen2.5',
  'command-r',
  'command-r-plus',
  'nemotron',
  'granite3',
];

/**
 * Ollama provider implementation
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  private _capabilities: AICapabilities = {
    vision: true, // Depends on model, llava supports vision
    streaming: true,
    functionCalling: false, // Updated based on model detection
    maxContextTokens: 8192, // Varies by model
  };

  get capabilities(): AICapabilities {
    return this._capabilities;
  }

  private config: OllamaConfig;
  private connected = false;
  private modelSupportsTools = false;

  constructor(config: OllamaConfig = {}) {
    this.config = {
      endpoint: 'http://localhost:11434',
      model: 'llama3.1:8b',
      maxTokens: 2048,
      temperature: 0.7,
      keepAlive: '5m',
      ...config,
    };

    // Check if model likely supports tools based on name
    this.updateToolSupport();
  }

  private updateToolSupport(): void {
    const modelName = this.config.model?.toLowerCase() || '';
    this.modelSupportsTools = TOOL_CAPABLE_MODELS.some((m) => modelName.includes(m));
    this._capabilities.functionCalling = this.modelSupportsTools;
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
    // Update tool support when model changes
    if (config.model) {
      this.updateToolSupport();
    }
  }

  /**
   * Check if the current model supports tool calling.
   */
  supportsTools(): boolean {
    return this.modelSupportsTools;
  }

  /**
   * Get model information from Ollama server.
   */
  async getModelInfo(model?: string): Promise<OllamaModelInfo | null> {
    try {
      const response = await fetch(`${this.config.endpoint}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model || this.config.model }),
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
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

    // Add tools if model supports them
    if (this.modelSupportsTools && options?.tools && options.tools.length > 0) {
      body['tools'] = options.tools.map((t) => this.convertTool(t));
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

    // Parse tool calls if present
    const toolCalls: AIToolCall[] = [];
    let content = data.message.content;

    if (data.message.tool_calls) {
      for (let i = 0; i < data.message.tool_calls.length; i++) {
        const tc = data.message.tool_calls[i];
        if (tc) {
          toolCalls.push({
            id: `ollama-tool-${i}`,
            name: tc.function.name,
            arguments: tc.function.arguments,
          });
        }
      }
    }

    // Fallback: Parse tool calls from text content if model doesn't use native format
    // Some models output JSON tool calls as plain text instead of using tool_calls
    if (toolCalls.length === 0 && content) {
      const parsed = this.parseToolCallsFromText(content, options?.tools ?? []);
      if (parsed.toolCalls.length > 0) {
        toolCalls.push(...parsed.toolCalls);
        content = parsed.remainingContent;
      }
    }

    // Determine stop reason
    let stopReason: AIResponse['stopReason'] = 'end_turn';
    if (toolCalls.length > 0) {
      stopReason = 'tool_use';
    } else if (data.done_reason === 'length') {
      stopReason = 'max_tokens';
    }

    return {
      content,
      toolCalls,
      stopReason,
      usage: {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
      },
    };
  }

  private convertTool(tool: AITool): OllamaTool {
    const params: OllamaTool['function']['parameters'] = {
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

  /**
   * Parse tool calls from text content when model outputs JSON instead of using native format.
   * Handles common patterns like {"name": "tool_name", "arguments": {...}}
   */
  private parseToolCallsFromText(
    content: string,
    availableTools: AITool[]
  ): { toolCalls: AIToolCall[]; remainingContent: string } {
    const toolCalls: AIToolCall[] = [];
    let remainingContent = content;

    // Build a map of tool names (including normalized versions without underscores)
    const toolNameMap = new Map<string, string>();
    for (const tool of availableTools) {
      toolNameMap.set(tool.name.toLowerCase(), tool.name);
      // Also map versions without underscores (e.g., "importimageas_leaf" -> "import_image_as_leaf")
      toolNameMap.set(tool.name.toLowerCase().replace(/_/g, ''), tool.name);
    }

    // Find JSON objects by tracking brace depth
    const jsonObjects = this.extractJsonObjects(content);

    for (const jsonStr of jsonObjects) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.name && typeof parsed.arguments === 'object') {
          // Normalize the tool name (handle missing underscores)
          const normalizedName = parsed.name.toLowerCase().replace(/_/g, '');
          const actualToolName = toolNameMap.get(normalizedName) || toolNameMap.get(parsed.name.toLowerCase());

          if (actualToolName) {
            toolCalls.push({
              id: `ollama-text-tool-${toolCalls.length}`,
              name: actualToolName,
              arguments: parsed.arguments,
            });
            // Remove the JSON from content
            remainingContent = remainingContent.replace(jsonStr, '').trim();
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    return { toolCalls, remainingContent };
  }

  /**
   * Extract complete JSON objects from text by tracking brace depth.
   */
  private extractJsonObjects(text: string): string[] {
    const objects: string[] = [];
    let depth = 0;
    let start = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === '\\' && inString) {
        escape = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{') {
        if (depth === 0) {
          start = i;
        }
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          const jsonStr = text.slice(start, i + 1);
          // Only include if it looks like a tool call (has "name" and "arguments")
          if (jsonStr.includes('"name"') && jsonStr.includes('"arguments"')) {
            objects.push(jsonStr);
          }
          start = -1;
        }
      }
    }

    return objects;
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

    // Add tools if model supports them
    if (this.modelSupportsTools && options?.tools && options.tools.length > 0) {
      body['tools'] = options.tools.map((t) => this.convertTool(t));
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
    let toolCallIndex = 0;
    let accumulatedContent = ''; // Accumulate content to check for tool calls at end
    let hasNativeToolCalls = false;

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
              accumulatedContent += data.message.content;
              yield { type: 'text', text: data.message.content };
            }

            // Handle tool calls in streaming response
            if (data.message?.tool_calls) {
              hasNativeToolCalls = true;
              for (const tc of data.message.tool_calls) {
                yield {
                  type: 'tool_call_start',
                  toolCall: {
                    id: `ollama-tool-${toolCallIndex}`,
                    name: tc.function.name,
                  },
                  index: toolCallIndex,
                };
                yield {
                  type: 'tool_call_end',
                  toolCall: {
                    id: `ollama-tool-${toolCallIndex}`,
                    name: tc.function.name,
                    arguments: tc.function.arguments,
                  },
                  index: toolCallIndex,
                };
                toolCallIndex++;
              }
            }

            if (data.done) {
              // Before yielding done, check for tool calls in text if none were native
              if (!hasNativeToolCalls && accumulatedContent) {
                const parsed = this.parseToolCallsFromText(accumulatedContent, options?.tools ?? []);
                for (const tc of parsed.toolCalls) {
                  yield {
                    type: 'tool_call_start',
                    toolCall: { id: tc.id, name: tc.name },
                    index: toolCallIndex,
                  };
                  yield {
                    type: 'tool_call_end',
                    toolCall: tc,
                    index: toolCallIndex,
                  };
                  toolCallIndex++;
                }
              }
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
            accumulatedContent += data.message.content;
            yield { type: 'text', text: data.message.content };
          }
          if (data.message?.tool_calls) {
            hasNativeToolCalls = true;
            for (const tc of data.message.tool_calls) {
              yield {
                type: 'tool_call_start',
                toolCall: {
                  id: `ollama-tool-${toolCallIndex}`,
                  name: tc.function.name,
                },
                index: toolCallIndex,
              };
              yield {
                type: 'tool_call_end',
                toolCall: {
                  id: `ollama-tool-${toolCallIndex}`,
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                },
                index: toolCallIndex,
              };
              toolCallIndex++;
            }
          }
          if (data.done) {
            // Before yielding done, check for tool calls in text if none were native
            if (!hasNativeToolCalls && accumulatedContent) {
              const parsed = this.parseToolCallsFromText(accumulatedContent, options?.tools ?? []);
              for (const tc of parsed.toolCalls) {
                yield {
                  type: 'tool_call_start',
                  toolCall: { id: tc.id, name: tc.name },
                  index: toolCallIndex,
                };
                yield {
                  type: 'tool_call_end',
                  toolCall: tc,
                  index: toolCallIndex,
                };
                toolCallIndex++;
              }
            }
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
