/**
 * AI Provider Factory
 *
 * Creates and configures AI providers based on the configuration system.
 */

import type { AIProvider } from '../providers/ai-provider';
import { AnthropicProvider } from '../providers/anthropic-provider';
import { OpenAIProvider } from '../providers/openai-provider';
import { OllamaProvider } from '../providers/ollama-provider';
import { LlamaCppProvider } from '../providers/llamacpp-provider';
import { ProviderManager } from '../providers/provider-manager';
import type {
  ProviderType,
  AIConfig,
  AnthropicProviderConfig,
  OpenAIProviderConfig,
  OllamaProviderConfig,
  LlamaCppProviderConfig,
} from './provider-config';
import { getConfigManager } from './config-manager';
import { getOAuthClient } from '../auth/oauth-client';

/**
 * Create an Anthropic provider from configuration
 */
export function createAnthropicFromConfig(config: AnthropicProviderConfig): AnthropicProvider {
  const configManager = getConfigManager();
  const oauthClient = getOAuthClient();

  // Check for OAuth authentication first
  if (oauthClient.isAuthenticated()) {
    return new AnthropicProvider({
      getAccessToken: () => oauthClient.getAccessToken(),
      baseUrl: config.baseUrl,
      model: config.defaultModel,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    });
  }

  // Fall back to API key
  const apiKey = config.apiKey || configManager.getApiKey('anthropic');
  return new AnthropicProvider({
    apiKey,
    baseUrl: config.baseUrl,
    model: config.defaultModel,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });
}

/**
 * Create an OpenAI provider from configuration
 */
export function createOpenAIFromConfig(config: OpenAIProviderConfig): OpenAIProvider {
  const configManager = getConfigManager();
  const apiKey = config.apiKey || configManager.getApiKey('openai');

  // Build config object conditionally
  if (config.organization) {
    return new OpenAIProvider({
      apiKey,
      baseUrl: config.baseUrl,
      organization: config.organization,
      model: config.defaultModel,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    });
  }

  return new OpenAIProvider({
    apiKey,
    baseUrl: config.baseUrl,
    model: config.defaultModel,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });
}

/**
 * Create an Ollama provider from configuration
 */
export function createOllamaFromConfig(config: OllamaProviderConfig): OllamaProvider {
  return new OllamaProvider({
    endpoint: config.endpoint,
    model: config.defaultModel,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    keepAlive: config.keepAlive,
  });
}

/**
 * Create a llama.cpp provider from configuration
 */
export function createLlamaCppFromConfig(config: LlamaCppProviderConfig): LlamaCppProvider {
  return new LlamaCppProvider({
    endpoint: config.endpoint,
    model: config.defaultModel,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    topP: config.topP,
    topK: config.topK,
    repeatPenalty: config.repeatPenalty,
    useChatApi: config.useChatApi,
  });
}

/**
 * Create a provider from configuration
 */
export function createProviderFromConfig(
  type: ProviderType,
  config: AIConfig['providers'][ProviderType]
): AIProvider | null {
  switch (type) {
    case 'anthropic':
      return createAnthropicFromConfig(config as AnthropicProviderConfig);
    case 'openai':
      return createOpenAIFromConfig(config as OpenAIProviderConfig);
    case 'ollama':
      return createOllamaFromConfig(config as OllamaProviderConfig);
    case 'llamacpp':
      return createLlamaCppFromConfig(config as LlamaCppProviderConfig);
    default:
      return null;
  }
}

/**
 * Create and configure a ProviderManager from the configuration
 */
export function createProviderManagerFromConfig(config?: AIConfig): ProviderManager {
  const configManager = getConfigManager();
  const cfg = config || configManager.getConfig();

  const providerManager = new ProviderManager({
    defaultProvider: cfg.activeProvider,
    fallbackChain: cfg.fallbackChain,
    autoConnect: cfg.autoConnect,
  });

  // Register enabled providers
  for (const providerType of Object.keys(cfg.providers) as ProviderType[]) {
    const providerConfig = cfg.providers[providerType];
    if (!providerConfig.enabled) continue;

    const provider = createProviderFromConfig(providerType, providerConfig);
    if (provider) {
      providerManager.registerProvider(provider);
    }
  }

  return providerManager;
}

/**
 * Initialize all providers from configuration
 * Returns a map of provider type to initialized provider
 */
export async function initializeProviders(config?: AIConfig): Promise<{
  manager: ProviderManager;
  connected: ProviderType[];
  failed: { provider: ProviderType; error: string }[];
}> {
  const manager = createProviderManagerFromConfig(config);
  const connected: ProviderType[] = [];
  const failed: { provider: ProviderType; error: string }[] = [];

  // Try to connect to each registered provider
  for (const provider of manager.getAllProviders()) {
    try {
      await provider.connect();
      connected.push(provider.name as ProviderType);
    } catch (error) {
      failed.push({
        provider: provider.name as ProviderType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { manager, connected, failed };
}

/**
 * Update a provider's configuration at runtime
 */
export function updateProviderAtRuntime(
  manager: ProviderManager,
  type: ProviderType,
  config: AIConfig['providers'][ProviderType]
): AIProvider | null {
  // Remove old provider if registered
  try {
    manager.unregisterProvider(type);
  } catch {
    // Provider wasn't registered, that's fine
  }

  // Create new provider with updated config
  const provider = createProviderFromConfig(type, config);
  if (provider && config.enabled) {
    manager.registerProvider(provider);
  }

  return provider;
}

/**
 * Test a provider's connection without registering it
 */
export async function testProviderConnection(
  type: ProviderType,
  config: AIConfig['providers'][ProviderType]
): Promise<{ success: boolean; error?: string; models?: string[] }> {
  const provider = createProviderFromConfig(type, config);
  if (!provider) {
    return { success: false, error: 'Provider type not supported' };
  }

  try {
    await provider.connect();

    // Try to list models for providers that support it
    let models: string[] | undefined;
    if (type === 'ollama' && provider instanceof OllamaProvider) {
      models = await provider.listModels();
    }

    provider.disconnect();
    // Only include models if we got them
    if (models) {
      return { success: true, models };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
