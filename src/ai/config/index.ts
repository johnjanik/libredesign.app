/**
 * AI Configuration Module
 *
 * Exports all configuration types, defaults, and the config manager.
 */

// Types
export type {
  ProviderType,
  ProviderStatus,
  BaseProviderConfig,
  AnthropicProviderConfig,
  OpenAIProviderConfig,
  OllamaProviderConfig,
  LlamaCppProviderConfig,
  ProviderConfig,
  AIConfig,
  ProviderStatusInfo,
  ModelInfo,
} from './provider-config';

export {
  AVAILABLE_MODELS,
  getModelInfo,
  modelSupportsCapability,
} from './provider-config';

// Defaults
export {
  DEFAULT_ANTHROPIC_CONFIG,
  DEFAULT_OPENAI_CONFIG,
  DEFAULT_OLLAMA_CONFIG,
  DEFAULT_LLAMACPP_CONFIG,
  DEFAULT_AI_CONFIG,
  CONFIG_STORAGE_KEY,
  API_KEY_STORAGE_PREFIX,
  PANEL_CONFIG,
  MESSAGE_CONFIG,
  CONTEXT_CONFIG,
  KEYBOARD_SHORTCUTS,
  SUPPORTED_CODE_LANGUAGES,
} from './defaults';

export type { SupportedCodeLanguage } from './defaults';

// Config Manager
export type {
  ConfigManagerEvents,
  ValidationResult,
} from './config-manager';

export {
  ConfigManager,
  getConfigManager,
  createConfigManager,
} from './config-manager';

// Provider Factory
export {
  createAnthropicFromConfig,
  createOpenAIFromConfig,
  createOllamaFromConfig,
  createLlamaCppFromConfig,
  createProviderFromConfig,
  createProviderManagerFromConfig,
  initializeProviders,
  updateProviderAtRuntime,
  testProviderConnection,
} from './provider-factory';
