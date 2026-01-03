/**
 * AI Configuration Manager
 *
 * Manages AI provider configuration with:
 * - Persistence to localStorage
 * - Secure API key storage (encrypted)
 * - Runtime validation
 * - Event notifications for config changes
 */

import { EventEmitter } from '@core/events/event-emitter';
import type {
  AIConfig,
  ProviderType,
  ProviderConfig,
  AnthropicProviderConfig,
  OpenAIProviderConfig,
  OllamaProviderConfig,
  LlamaCppProviderConfig,
  ProviderStatusInfo,
  ToolTierConfig,
} from './provider-config';
import {
  DEFAULT_AI_CONFIG,
  CONFIG_STORAGE_KEY,
  API_KEY_STORAGE_PREFIX,
} from './defaults';

/**
 * Configuration manager events
 */
export interface ConfigManagerEvents {
  'config:changed': { config: AIConfig };
  'config:providerChanged': { provider: ProviderType; config: ProviderConfig };
  'config:activeProviderChanged': { provider: ProviderType };
  'config:apiKeyChanged': { provider: ProviderType };
  'config:toolTierChanged': { tier: ToolTierConfig };
  'config:loaded': { config: AIConfig };
  'config:saved': { config: AIConfig };
  'config:error': { error: Error };
  [key: string]: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Simple encryption for API keys (obfuscation, not true security)
 * In production, consider using Web Crypto API or a proper secrets manager
 */
class SimpleEncryption {
  private static readonly KEY = 'designlibre-ai-2024';

  static encrypt(text: string): string {
    if (!text) return '';
    try {
      // XOR with key, then base64 encode
      const keyBytes = new TextEncoder().encode(this.KEY);
      const textBytes = new TextEncoder().encode(text);
      const result = new Uint8Array(textBytes.length);

      for (let i = 0; i < textBytes.length; i++) {
        const keyByte = keyBytes[i % keyBytes.length];
        const textByte = textBytes[i];
        if (keyByte !== undefined && textByte !== undefined) {
          result[i] = textByte ^ keyByte;
        }
      }

      return btoa(String.fromCharCode(...result));
    } catch {
      return '';
    }
  }

  static decrypt(encrypted: string): string {
    if (!encrypted) return '';
    try {
      // Base64 decode, then XOR with key
      const keyBytes = new TextEncoder().encode(this.KEY);
      const encryptedBytes = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
      const result = new Uint8Array(encryptedBytes.length);

      for (let i = 0; i < encryptedBytes.length; i++) {
        const keyByte = keyBytes[i % keyBytes.length];
        const encByte = encryptedBytes[i];
        if (keyByte !== undefined && encByte !== undefined) {
          result[i] = encByte ^ keyByte;
        }
      }

      return new TextDecoder().decode(result);
    } catch {
      return '';
    }
  }
}

/**
 * Configuration Manager
 */
export class ConfigManager extends EventEmitter<ConfigManagerEvents> {
  private config: AIConfig;
  private providerStatus: Map<ProviderType, ProviderStatusInfo> = new Map();

  constructor() {
    super();
    this.config = this.loadConfig();
    this.initializeProviderStatus();
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<AIConfig> {
    return this.config;
  }

  /**
   * Get provider-specific configuration
   */
  getProviderConfig<T extends ProviderType>(
    provider: T
  ): AIConfig['providers'][T] {
    return this.config.providers[provider];
  }

  /**
   * Get the active provider configuration
   */
  getActiveProviderConfig(): ProviderConfig {
    return this.config.providers[this.config.activeProvider];
  }

  /**
   * Set the active provider
   */
  setActiveProvider(provider: ProviderType): void {
    if (!this.config.providers[provider].enabled) {
      throw new Error(`Provider ${provider} is not enabled`);
    }

    this.config.activeProvider = provider;
    this.saveConfig();
    this.emit('config:activeProviderChanged', { provider });
    this.emit('config:changed', { config: this.config });
  }

  /**
   * Update provider configuration
   */
  updateProviderConfig<T extends ProviderType>(
    provider: T,
    updates: Partial<AIConfig['providers'][T]>
  ): ValidationResult {
    // Validate updates
    const validation = this.validateProviderConfig(provider, {
      ...this.config.providers[provider],
      ...updates,
    } as ProviderConfig);

    if (!validation.valid) {
      return validation;
    }

    // Handle API key separately (secure storage)
    if ('apiKey' in updates && updates.apiKey !== undefined) {
      this.setApiKey(provider, updates.apiKey as string);
      // Don't store API key in main config
      const { apiKey: _, ...rest } = updates;
      updates = rest as Partial<AIConfig['providers'][T]>;
    }

    // Update config
    this.config.providers[provider] = {
      ...this.config.providers[provider],
      ...updates,
    };

    this.saveConfig();
    this.emit('config:providerChanged', {
      provider,
      config: this.config.providers[provider],
    });
    this.emit('config:changed', { config: this.config });

    return validation;
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(provider: ProviderType, enabled: boolean): void {
    this.config.providers[provider].enabled = enabled;

    // If disabling the active provider, switch to another
    if (!enabled && this.config.activeProvider === provider) {
      const nextProvider = this.getFirstEnabledProvider();
      if (nextProvider) {
        this.config.activeProvider = nextProvider;
      }
    }

    this.saveConfig();
    this.emit('config:providerChanged', {
      provider,
      config: this.config.providers[provider],
    });
    this.emit('config:changed', { config: this.config });
  }

  /**
   * Get API key for a provider
   */
  getApiKey(provider: ProviderType): string {
    const storageKey = API_KEY_STORAGE_PREFIX + provider;
    const encrypted = localStorage.getItem(storageKey);
    if (!encrypted) return '';
    return SimpleEncryption.decrypt(encrypted);
  }

  /**
   * Set API key for a provider (stored securely)
   */
  setApiKey(provider: ProviderType, apiKey: string): void {
    const storageKey = API_KEY_STORAGE_PREFIX + provider;

    if (apiKey) {
      const encrypted = SimpleEncryption.encrypt(apiKey);
      localStorage.setItem(storageKey, encrypted);
    } else {
      localStorage.removeItem(storageKey);
    }

    this.emit('config:apiKeyChanged', { provider });
  }

  /**
   * Check if a provider has an API key configured
   */
  hasApiKey(provider: ProviderType): boolean {
    return !!this.getApiKey(provider);
  }

  /**
   * Update the fallback chain
   */
  setFallbackChain(providers: ProviderType[]): void {
    this.config.fallbackChain = providers;
    this.saveConfig();
    this.emit('config:changed', { config: this.config });
  }

  /**
   * Get the current tool tier
   */
  getToolTier(): ToolTierConfig {
    return this.config.toolTier;
  }

  /**
   * Set the tool tier
   */
  setToolTier(tier: ToolTierConfig): void {
    this.config.toolTier = tier;
    this.saveConfig();
    this.emit('config:toolTierChanged', { tier });
    this.emit('config:changed', { config: this.config });
  }

  /**
   * Update global settings
   */
  updateGlobalSettings(updates: Partial<Pick<AIConfig, 'autoConnect' | 'showStatus'>>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.emit('config:changed', { config: this.config });
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    // Clear API keys
    for (const provider of Object.keys(this.config.providers) as ProviderType[]) {
      this.setApiKey(provider, '');
    }

    this.config = structuredClone(DEFAULT_AI_CONFIG);
    this.saveConfig();
    this.emit('config:changed', { config: this.config });
  }

  /**
   * Reset a specific provider to defaults
   */
  resetProviderToDefaults(provider: ProviderType): void {
    this.setApiKey(provider, '');
    // Use explicit assignment based on provider type to satisfy TypeScript
    switch (provider) {
      case 'anthropic':
        this.config.providers.anthropic = structuredClone(DEFAULT_AI_CONFIG.providers.anthropic);
        break;
      case 'openai':
        this.config.providers.openai = structuredClone(DEFAULT_AI_CONFIG.providers.openai);
        break;
      case 'ollama':
        this.config.providers.ollama = structuredClone(DEFAULT_AI_CONFIG.providers.ollama);
        break;
      case 'llamacpp':
        this.config.providers.llamacpp = structuredClone(DEFAULT_AI_CONFIG.providers.llamacpp);
        break;
    }
    this.saveConfig();
    this.emit('config:providerChanged', {
      provider,
      config: this.config.providers[provider],
    });
    this.emit('config:changed', { config: this.config });
  }

  /**
   * Get provider status
   */
  getProviderStatus(provider: ProviderType): ProviderStatusInfo | undefined {
    return this.providerStatus.get(provider);
  }

  /**
   * Update provider status
   */
  updateProviderStatus(provider: ProviderType, status: Partial<ProviderStatusInfo>): void {
    const current = this.providerStatus.get(provider) || {
      type: provider,
      status: 'disconnected',
      lastChecked: null,
    };
    this.providerStatus.set(provider, { ...current, ...status });
  }

  /**
   * Get all enabled providers
   */
  getEnabledProviders(): ProviderType[] {
    return (Object.keys(this.config.providers) as ProviderType[]).filter(
      (p) => this.config.providers[p].enabled
    );
  }

  /**
   * Export configuration (without API keys)
   */
  exportConfig(): string {
    const exportData = structuredClone(this.config);
    // Remove API keys from export
    for (const provider of Object.keys(exportData.providers) as ProviderType[]) {
      const config = exportData.providers[provider];
      if ('apiKey' in config) {
        (config as { apiKey?: string }).apiKey = '';
      }
    }
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import configuration
   */
  importConfig(json: string): ValidationResult {
    try {
      const imported = JSON.parse(json) as AIConfig;
      const validation = this.validateConfig(imported);

      if (validation.valid) {
        // Preserve existing API keys
        for (const provider of Object.keys(imported.providers) as ProviderType[]) {
          const config = imported.providers[provider];
          if ('apiKey' in config && !(config as { apiKey?: string }).apiKey) {
            (config as { apiKey: string }).apiKey = this.getApiKey(provider);
          }
        }

        this.config = imported;
        this.saveConfig();
        this.emit('config:loaded', { config: this.config });
        this.emit('config:changed', { config: this.config });
      }

      return validation;
    } catch (error) {
      return {
        valid: false,
        errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`],
        warnings: [],
      };
    }
  }

  // Private methods

  private loadConfig(): AIConfig {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AIConfig>;
        // Merge with defaults to ensure all fields exist
        const config = this.mergeWithDefaults(parsed);

        // Restore API keys from secure storage
        for (const provider of Object.keys(config.providers) as ProviderType[]) {
          const providerConfig = config.providers[provider];
          if ('apiKey' in providerConfig) {
            (providerConfig as { apiKey: string }).apiKey = this.getApiKey(provider);
          }
        }

        this.emit('config:loaded', { config });
        return config;
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
      this.emit('config:error', {
        error: error instanceof Error ? error : new Error('Failed to load config'),
      });
    }

    return structuredClone(DEFAULT_AI_CONFIG);
  }

  private saveConfig(): void {
    try {
      // Create a copy without API keys for storage
      const configToStore = structuredClone(this.config);
      for (const provider of Object.keys(configToStore.providers) as ProviderType[]) {
        const config = configToStore.providers[provider];
        if ('apiKey' in config) {
          (config as { apiKey: string }).apiKey = '';
        }
      }

      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configToStore));
      this.emit('config:saved', { config: this.config });
    } catch (error) {
      console.error('Failed to save AI config:', error);
      this.emit('config:error', {
        error: error instanceof Error ? error : new Error('Failed to save config'),
      });
    }
  }

  private mergeWithDefaults(partial: Partial<AIConfig>): AIConfig {
    const config = structuredClone(DEFAULT_AI_CONFIG);

    if (partial.activeProvider) {
      config.activeProvider = partial.activeProvider;
    }
    if (partial.fallbackChain) {
      config.fallbackChain = partial.fallbackChain;
    }
    if (partial.autoConnect !== undefined) {
      config.autoConnect = partial.autoConnect;
    }
    if (partial.showStatus !== undefined) {
      config.showStatus = partial.showStatus;
    }
    if (partial.toolTier) {
      config.toolTier = partial.toolTier;
    }

    if (partial.providers) {
      // Merge each provider config explicitly to satisfy TypeScript
      if (partial.providers.anthropic) {
        config.providers.anthropic = {
          ...config.providers.anthropic,
          ...partial.providers.anthropic,
        };
      }
      if (partial.providers.openai) {
        config.providers.openai = {
          ...config.providers.openai,
          ...partial.providers.openai,
        };
      }
      if (partial.providers.ollama) {
        config.providers.ollama = {
          ...config.providers.ollama,
          ...partial.providers.ollama,
        };
      }
      if (partial.providers.llamacpp) {
        config.providers.llamacpp = {
          ...config.providers.llamacpp,
          ...partial.providers.llamacpp,
        };
      }
    }

    return config;
  }

  private initializeProviderStatus(): void {
    for (const provider of Object.keys(this.config.providers) as ProviderType[]) {
      this.providerStatus.set(provider, {
        type: provider,
        status: 'disconnected',
        lastChecked: null,
      });
    }
  }

  private getFirstEnabledProvider(): ProviderType | null {
    // Check fallback chain first
    for (const provider of this.config.fallbackChain) {
      if (this.config.providers[provider].enabled) {
        return provider;
      }
    }

    // Then check all providers
    for (const provider of Object.keys(this.config.providers) as ProviderType[]) {
      if (this.config.providers[provider].enabled) {
        return provider;
      }
    }

    return null;
  }

  private validateConfig(config: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object');
      return { valid: false, errors, warnings };
    }

    const cfg = config as Partial<AIConfig>;

    // Validate activeProvider
    if (cfg.activeProvider) {
      const validProviders: ProviderType[] = ['anthropic', 'openai', 'ollama', 'llamacpp'];
      if (!validProviders.includes(cfg.activeProvider)) {
        errors.push(`Invalid active provider: ${cfg.activeProvider}`);
      }
    }

    // Validate providers
    if (cfg.providers) {
      for (const provider of Object.keys(cfg.providers) as ProviderType[]) {
        const providerValidation = this.validateProviderConfig(
          provider,
          cfg.providers[provider] as ProviderConfig
        );
        errors.push(...providerValidation.errors);
        warnings.push(...providerValidation.warnings);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private validateProviderConfig(
    provider: ProviderType,
    config: ProviderConfig
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Common validations
    if (config.maxTokens !== undefined && (config.maxTokens < 1 || config.maxTokens > 100000)) {
      errors.push(`${provider}: maxTokens must be between 1 and 100000`);
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      errors.push(`${provider}: temperature must be between 0 and 2`);
    }

    if (config.timeout !== undefined && config.timeout < 1000) {
      warnings.push(`${provider}: timeout is very low (${config.timeout}ms)`);
    }

    // Provider-specific validations
    switch (provider) {
      case 'anthropic': {
        const anthropicConfig = config as AnthropicProviderConfig;
        if (anthropicConfig.enabled && !anthropicConfig.apiKey && !this.hasApiKey(provider)) {
          warnings.push('Anthropic: API key is required when enabled');
        }
        if (anthropicConfig.baseUrl && !anthropicConfig.baseUrl.startsWith('http')) {
          errors.push('Anthropic: baseUrl must be a valid URL');
        }
        break;
      }
      case 'openai': {
        const openaiConfig = config as OpenAIProviderConfig;
        if (openaiConfig.enabled && !openaiConfig.apiKey && !this.hasApiKey(provider)) {
          warnings.push('OpenAI: API key is required when enabled');
        }
        if (openaiConfig.baseUrl && !openaiConfig.baseUrl.startsWith('http')) {
          errors.push('OpenAI: baseUrl must be a valid URL');
        }
        break;
      }
      case 'ollama': {
        const ollamaConfig = config as OllamaProviderConfig;
        if (ollamaConfig.endpoint && !ollamaConfig.endpoint.startsWith('http')) {
          errors.push('Ollama: endpoint must be a valid URL');
        }
        break;
      }
      case 'llamacpp': {
        const llamacppConfig = config as LlamaCppProviderConfig;
        if (llamacppConfig.endpoint && !llamacppConfig.endpoint.startsWith('http')) {
          errors.push('llama.cpp: endpoint must be a valid URL');
        }
        if (llamacppConfig.topP !== undefined && (llamacppConfig.topP < 0 || llamacppConfig.topP > 1)) {
          errors.push('llama.cpp: topP must be between 0 and 1');
        }
        break;
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

// Singleton instance
let configManagerInstance: ConfigManager | null = null;

/**
 * Get the configuration manager singleton
 */
export function getConfigManager(): ConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager();
  }
  return configManagerInstance;
}

/**
 * Create a new configuration manager (for testing)
 */
export function createConfigManager(): ConfigManager {
  return new ConfigManager();
}
