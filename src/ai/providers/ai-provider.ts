/**
 * AI Provider Interface
 *
 * Defines the contract for AI providers (Anthropic, Ollama, llama.cpp).
 */

/**
 * Provider capabilities
 */
export interface AICapabilities {
  /** Supports image/vision input */
  vision: boolean;
  /** Supports streaming responses */
  streaming: boolean;
  /** Supports function/tool calling */
  functionCalling: boolean;
  /** Maximum context window in tokens */
  maxContextTokens: number;
}

/**
 * Text content part
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Image content part
 */
export interface ImageContent {
  type: 'image';
  source: {
    type: 'base64';
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
    data: string;
  };
}

/**
 * Content part (text or image)
 */
export type ContentPart = TextContent | ImageContent;

/**
 * AI message
 */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

/**
 * Tool parameter schema
 */
export interface AIToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: AIToolParameter;
  properties?: Record<string, AIToolParameter>;
  required?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
}

/**
 * Tool definition for function calling
 */
export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, AIToolParameter>;
    required?: string[];
  };
}

/**
 * Tool call from AI response
 */
export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * AI response
 */
export interface AIResponse {
  /** Response text content */
  content: string;
  /** Tool calls requested by the AI */
  toolCalls: AIToolCall[];
  /** Stop reason */
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  /** Token usage */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Streaming chunk
 */
export interface AIStreamChunk {
  type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'done';
  /** Text delta for text chunks */
  text?: string;
  /** Tool call info for tool chunks */
  toolCall?: Partial<AIToolCall>;
  /** Index for tool call chunks */
  index?: number;
}

/**
 * Provider configuration base
 */
export interface AIProviderConfig {
  /** Model identifier */
  model?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0-1) */
  temperature?: number;
  /** System prompt */
  systemPrompt?: string;
}

/**
 * AI Provider interface
 */
export interface AIProvider {
  /** Provider name */
  readonly name: string;

  /** Provider capabilities */
  readonly capabilities: AICapabilities;

  /**
   * Send a message and get a complete response.
   */
  sendMessage(
    messages: AIMessage[],
    options?: {
      tools?: AITool[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResponse>;

  /**
   * Stream a message response.
   */
  streamMessage(
    messages: AIMessage[],
    options?: {
      tools?: AITool[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): AsyncIterable<AIStreamChunk>;

  /**
   * Connect to the provider (validate credentials, etc).
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the provider.
   */
  disconnect(): void;

  /**
   * Check if connected.
   */
  isConnected(): boolean;

  /**
   * Update configuration.
   */
  configure(config: Partial<AIProviderConfig>): void;
}

/**
 * Helper to create a text message
 */
export function textMessage(role: AIMessage['role'], text: string): AIMessage {
  return { role, content: text };
}

/**
 * Helper to create a message with image
 */
export function imageMessage(
  role: AIMessage['role'],
  text: string,
  imageBase64: string,
  mediaType: ImageContent['source']['mediaType'] = 'image/png'
): AIMessage {
  return {
    role,
    content: [
      { type: 'text', text },
      {
        type: 'image',
        source: { type: 'base64', mediaType, data: imageBase64 },
      },
    ],
  };
}

/**
 * Helper to check if content contains images
 */
export function hasImages(message: AIMessage): boolean {
  if (typeof message.content === 'string') return false;
  return message.content.some((part) => part.type === 'image');
}

/**
 * Helper to extract text from message content
 */
export function extractText(message: AIMessage): string {
  if (typeof message.content === 'string') return message.content;
  return message.content
    .filter((part): part is TextContent => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}
