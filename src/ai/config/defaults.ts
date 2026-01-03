/**
 * Default AI Configuration Constants
 *
 * Default values for all provider configurations.
 */

import type {
  AIConfig,
  AnthropicProviderConfig,
  OpenAIProviderConfig,
  OllamaProviderConfig,
  LlamaCppProviderConfig,
} from './provider-config';

/**
 * Default Anthropic configuration
 */
export const DEFAULT_ANTHROPIC_CONFIG: AnthropicProviderConfig = {
  type: 'anthropic',
  enabled: false, // Requires API key
  apiKey: '',
  baseUrl: 'https://api.anthropic.com',
  apiVersion: '2023-06-01',
  defaultModel: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  temperature: 0.7,
  timeout: 120000,
  maxRetries: 3,
};

/**
 * Default OpenAI configuration
 */
export const DEFAULT_OPENAI_CONFIG: OpenAIProviderConfig = {
  type: 'openai',
  enabled: false, // Requires API key
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  defaultModel: 'gpt-4o',
  maxTokens: 4096,
  temperature: 0.7,
  timeout: 60000,
  maxRetries: 3,
};

/**
 * Default Ollama configuration
 */
export const DEFAULT_OLLAMA_CONFIG: OllamaProviderConfig = {
  type: 'ollama',
  enabled: true, // Local, no API key needed
  endpoint: 'http://localhost:11434',
  keepAlive: '5m',
  defaultModel: 'llama3.1:8b',
  maxTokens: 2048,
  temperature: 0.7,
  timeout: 120000,
  maxRetries: 2,
};

/**
 * Default llama.cpp configuration
 */
export const DEFAULT_LLAMACPP_CONFIG: LlamaCppProviderConfig = {
  type: 'llamacpp',
  enabled: false, // Requires local server
  endpoint: 'http://localhost:8080',
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
  useChatApi: true,
  defaultModel: 'default',
  maxTokens: 2048,
  temperature: 0.7,
  timeout: 120000,
  maxRetries: 2,
};

/**
 * Default global AI configuration
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  activeProvider: 'ollama', // Default to local provider
  fallbackChain: ['ollama', 'anthropic', 'openai'],
  autoConnect: true,
  showStatus: true,
  providers: {
    anthropic: DEFAULT_ANTHROPIC_CONFIG,
    openai: DEFAULT_OPENAI_CONFIG,
    ollama: DEFAULT_OLLAMA_CONFIG,
    llamacpp: DEFAULT_LLAMACPP_CONFIG,
  },
};

/**
 * Configuration storage key
 */
export const CONFIG_STORAGE_KEY = 'designlibre:ai-config';

/**
 * API key storage prefix
 */
export const API_KEY_STORAGE_PREFIX = 'designlibre:ai-key:';

/**
 * Panel configuration
 */
export const PANEL_CONFIG = {
  defaultWidth: 400,
  minWidth: 300,
  maxWidth: 600,
  collapsedWidth: 48,
  autoCollapseBreakpoint: 1200,
} as const;

/**
 * Message configuration
 */
export const MESSAGE_CONFIG = {
  maxLength: 32000,
  maxAttachments: 10,
  maxAttachmentSize: 10 * 1024 * 1024, // 10MB
  streamBufferMs: 50, // Buffer streaming chunks for this many ms
} as const;

/**
 * Context configuration
 */
export const CONTEXT_CONFIG = {
  includeSelection: true,
  includeActiveFile: false,
  includeOpenFiles: false,
  includeProjectInfo: true,
  maxContextTokens: 8000,
} as const;

/**
 * Keyboard shortcuts
 */
export const KEYBOARD_SHORTCUTS = {
  togglePanel: 'Ctrl+Shift+L',
  sendMessage: 'Enter',
  newLine: 'Shift+Enter',
  clearConversation: 'Ctrl+K',
  newConversation: 'Ctrl+N',
  cancelStreaming: 'Escape',
  copyCode: 'Ctrl+C',
} as const;

/**
 * Supported code languages for syntax highlighting
 */
export const SUPPORTED_CODE_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'css',
  'html',
  'json',
  'markdown',
  'yaml',
  'sql',
  'bash',
  'rust',
  'go',
  'swift',
  'kotlin',
  'java',
  'c',
  'cpp',
] as const;

export type SupportedCodeLanguage = (typeof SUPPORTED_CODE_LANGUAGES)[number];
