/**
 * AI Provider Configuration Types
 *
 * Centralized configuration system for all AI providers with
 * persistence, validation, and secure API key storage.
 */

/**
 * Provider type identifiers
 */
export type ProviderType = 'anthropic' | 'openai' | 'ollama' | 'llamacpp';

/**
 * Provider connection status
 */
export type ProviderStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Base provider configuration
 */
export interface BaseProviderConfig {
  /** Whether this provider is enabled */
  enabled: boolean;
  /** Default model to use */
  defaultModel: string;
  /** Maximum tokens for responses */
  maxTokens: number;
  /** Temperature (0-1) */
  temperature: number;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
}

/**
 * Anthropic-specific configuration
 */
export interface AnthropicProviderConfig extends BaseProviderConfig {
  type: 'anthropic';
  /** API key (stored securely) */
  apiKey: string;
  /** API base URL (for proxies) */
  baseUrl: string;
  /** API version */
  apiVersion: string;
}

/**
 * OpenAI-specific configuration
 */
export interface OpenAIProviderConfig extends BaseProviderConfig {
  type: 'openai';
  /** API key (stored securely) */
  apiKey: string;
  /** API base URL */
  baseUrl: string;
  /** Organization ID (optional) */
  organization?: string;
}

/**
 * Ollama-specific configuration
 */
export interface OllamaProviderConfig extends BaseProviderConfig {
  type: 'ollama';
  /** Server endpoint */
  endpoint: string;
  /** Keep model loaded duration */
  keepAlive: string;
  /** Number of GPUs to use */
  numGpu?: number;
  /** Number of threads */
  numThread?: number;
}

/**
 * llama.cpp-specific configuration
 */
export interface LlamaCppProviderConfig extends BaseProviderConfig {
  type: 'llamacpp';
  /** Server endpoint */
  endpoint: string;
  /** Top-p sampling */
  topP: number;
  /** Top-k sampling */
  topK: number;
  /** Repetition penalty */
  repeatPenalty: number;
  /** Use chat completions API vs raw completions */
  useChatApi: boolean;
}

/**
 * Union of all provider configurations
 */
export type ProviderConfig =
  | AnthropicProviderConfig
  | OpenAIProviderConfig
  | OllamaProviderConfig
  | LlamaCppProviderConfig;

/**
 * Tool tier levels
 */
export type ToolTierConfig = 'basic' | 'advanced' | 'professional';

/**
 * Global AI configuration
 */
export interface AIConfig {
  /** Active provider name */
  activeProvider: ProviderType;
  /** Fallback chain (ordered list of providers to try) */
  fallbackChain: ProviderType[];
  /** Auto-connect on startup */
  autoConnect: boolean;
  /** Show provider status in UI */
  showStatus: boolean;
  /** Tool tier level (determines which tools are available) */
  toolTier: ToolTierConfig;
  /** Provider-specific configurations */
  providers: {
    anthropic: AnthropicProviderConfig;
    openai: OpenAIProviderConfig;
    ollama: OllamaProviderConfig;
    llamacpp: LlamaCppProviderConfig;
  };
}

/**
 * Provider status information
 */
export interface ProviderStatusInfo {
  type: ProviderType;
  status: ProviderStatus;
  lastChecked: Date | null;
  error?: string;
  availableModels?: string[];
}

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  contextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
}

/**
 * Available models by provider
 */
export const AVAILABLE_MODELS: Record<ProviderType, ModelInfo[]> = {
  anthropic: [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
  ],
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 4096,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 4096,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 4096,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
  ],
  ollama: [
    {
      id: 'llama3.1:8b',
      name: 'Llama 3.1 8B',
      provider: 'ollama',
      contextWindow: 8192,
      maxOutputTokens: 2048,
      supportsVision: false,
      supportsStreaming: true,
      supportsFunctionCalling: true, // llama3.1 supports tools
    },
    {
      id: 'llava:latest',
      name: 'LLaVA (Vision)',
      provider: 'ollama',
      contextWindow: 4096,
      maxOutputTokens: 2048,
      supportsVision: true,
      supportsStreaming: true,
      supportsFunctionCalling: false,
    },
    {
      id: 'mistral-nemo:latest',
      name: 'Mistral Nemo',
      provider: 'ollama',
      contextWindow: 8192,
      maxOutputTokens: 2048,
      supportsVision: false,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'codellama:latest',
      name: 'Code Llama',
      provider: 'ollama',
      contextWindow: 4096,
      maxOutputTokens: 2048,
      supportsVision: false,
      supportsStreaming: true,
      supportsFunctionCalling: false,
    },
  ],
  llamacpp: [
    {
      id: 'default',
      name: 'Local Model',
      provider: 'llamacpp',
      contextWindow: 4096,
      maxOutputTokens: 2048,
      supportsVision: false,
      supportsStreaming: true,
      supportsFunctionCalling: false,
    },
  ],
};

/**
 * Get model info by ID
 */
export function getModelInfo(provider: ProviderType, modelId: string): ModelInfo | undefined {
  return AVAILABLE_MODELS[provider].find((m) => m.id === modelId);
}

/**
 * Check if a model supports a capability
 */
export function modelSupportsCapability(
  provider: ProviderType,
  modelId: string,
  capability: 'vision' | 'streaming' | 'functionCalling'
): boolean {
  const model = getModelInfo(provider, modelId);
  if (!model) return false;

  switch (capability) {
    case 'vision':
      return model.supportsVision;
    case 'streaming':
      return model.supportsStreaming;
    case 'functionCalling':
      return model.supportsFunctionCalling;
    default:
      return false;
  }
}
