/**
 * AI Provider Manager
 *
 * Manages multiple AI providers with fallback support.
 */

import { EventEmitter } from '@core/events/event-emitter';
import type {
  AIProvider,
  AIMessage,
  AITool,
  AIResponse,
  AIStreamChunk,
} from './ai-provider';

/**
 * Provider manager events
 */
export interface ProviderManagerEvents {
  'provider:registered': { name: string; provider: AIProvider };
  'provider:unregistered': { name: string };
  'provider:changed': { name: string; provider: AIProvider };
  'provider:connected': { name: string };
  'provider:disconnected': { name: string };
  'provider:error': { name: string; error: Error };
  'fallback:triggered': { from: string; to: string; reason: string };
  [key: string]: unknown;
}

/**
 * Provider manager options
 */
export interface ProviderManagerOptions {
  /** Default provider to use */
  defaultProvider?: string | undefined;
  /** Fallback chain (ordered list of provider names) */
  fallbackChain?: string[] | undefined;
  /** Auto-connect providers on registration */
  autoConnect?: boolean | undefined;
}

/**
 * AI Provider Manager
 */
export class ProviderManager extends EventEmitter<ProviderManagerEvents> {
  private providers = new Map<string, AIProvider>();
  private activeProvider: AIProvider | null = null;
  private activeProviderName: string | null = null;
  private fallbackChain: string[] = [];
  private options: Required<ProviderManagerOptions>;

  constructor(options: ProviderManagerOptions = {}) {
    super();
    const fallbackChain = options.fallbackChain ?? [];
    this.options = {
      defaultProvider: options.defaultProvider ?? '',
      fallbackChain,
      autoConnect: options.autoConnect ?? false,
    };
    this.fallbackChain = fallbackChain;
  }

  /**
   * Register a provider.
   */
  async registerProvider(provider: AIProvider): Promise<void> {
    this.providers.set(provider.name, provider);
    this.emit('provider:registered', { name: provider.name, provider });

    // Auto-connect if enabled
    if (this.options.autoConnect) {
      try {
        await provider.connect();
        this.emit('provider:connected', { name: provider.name });
      } catch (error) {
        this.emit('provider:error', {
          name: provider.name,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    // Set as active if it's the default or first provider
    if (
      provider.name === this.options.defaultProvider ||
      (!this.activeProvider && this.providers.size === 1)
    ) {
      this.setActiveProvider(provider.name);
    }
  }

  /**
   * Unregister a provider.
   */
  unregisterProvider(name: string): void {
    const provider = this.providers.get(name);
    if (provider) {
      provider.disconnect();
      this.providers.delete(name);
      this.emit('provider:unregistered', { name });

      // Switch to another provider if the active one was removed
      if (this.activeProviderName === name) {
        const remaining = Array.from(this.providers.keys());
        const nextProvider = remaining[0];
        if (nextProvider) {
          this.setActiveProvider(nextProvider);
        } else {
          this.activeProvider = null;
          this.activeProviderName = null;
        }
      }
    }
  }

  /**
   * Get a provider by name.
   */
  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers.
   */
  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider names.
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Set the active provider.
   */
  setActiveProvider(name: string): void {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }

    this.activeProvider = provider;
    this.activeProviderName = name;
    this.emit('provider:changed', { name, provider });
  }

  /**
   * Get the active provider.
   */
  getActiveProvider(): AIProvider | null {
    return this.activeProvider;
  }

  /**
   * Get the active provider name.
   */
  getActiveProviderName(): string | null {
    return this.activeProviderName;
  }

  /**
   * Set the fallback chain.
   */
  setFallbackChain(providerNames: string[]): void {
    this.fallbackChain = providerNames;
  }

  /**
   * Connect to the active provider.
   */
  async connect(): Promise<void> {
    if (!this.activeProvider) {
      throw new Error('No active provider');
    }

    await this.activeProvider.connect();
    this.emit('provider:connected', { name: this.activeProviderName! });
  }

  /**
   * Disconnect from the active provider.
   */
  disconnect(): void {
    if (this.activeProvider) {
      this.activeProvider.disconnect();
      this.emit('provider:disconnected', { name: this.activeProviderName! });
    }
  }

  /**
   * Send a message with automatic fallback.
   */
  async sendMessage(
    messages: AIMessage[],
    options?: {
      tools?: AITool[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResponse> {
    // Try active provider first
    if (this.activeProvider) {
      try {
        return await this.activeProvider.sendMessage(messages, options);
      } catch (error) {
        // Try fallback chain
        const fallbackResult = await this.tryFallback(
          messages,
          options,
          error instanceof Error ? error.message : 'Unknown error'
        );
        if (fallbackResult) {
          return fallbackResult;
        }
        throw error;
      }
    }

    throw new Error('No active provider');
  }

  /**
   * Stream a message with automatic fallback.
   */
  async *streamMessage(
    messages: AIMessage[],
    options?: {
      tools?: AITool[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): AsyncIterable<AIStreamChunk> {
    if (!this.activeProvider) {
      throw new Error('No active provider');
    }

    // For streaming, we don't do fallback mid-stream
    yield* this.activeProvider.streamMessage(messages, options);
  }

  /**
   * Try fallback providers.
   */
  private async tryFallback(
    messages: AIMessage[],
    options?: {
      tools?: AITool[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    },
    reason?: string
  ): Promise<AIResponse | null> {
    for (const providerName of this.fallbackChain) {
      // Skip active provider
      if (providerName === this.activeProviderName) continue;

      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        // Connect if needed
        if (!provider.isConnected()) {
          await provider.connect();
        }

        this.emit('fallback:triggered', {
          from: this.activeProviderName || 'none',
          to: providerName,
          reason: reason || 'active provider failed',
        });

        return await provider.sendMessage(messages, options);
      } catch {
        // Continue to next fallback
        continue;
      }
    }

    return null;
  }

  /**
   * Check if any provider is connected.
   */
  hasConnectedProvider(): boolean {
    for (const provider of this.providers.values()) {
      if (provider.isConnected()) return true;
    }
    return false;
  }

  /**
   * Dispose of all providers.
   */
  dispose(): void {
    for (const provider of this.providers.values()) {
      provider.disconnect();
    }
    this.providers.clear();
    this.activeProvider = null;
    this.activeProviderName = null;
    this.clear();
  }
}

/**
 * Create a provider manager instance.
 */
export function createProviderManager(options?: ProviderManagerOptions): ProviderManager {
  return new ProviderManager(options);
}
