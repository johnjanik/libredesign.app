/**
 * API Dispatcher
 *
 * Routes API calls from plugins to appropriate handlers.
 * Integrates with capability guard for authorization.
 */

import type { SerializableValue } from '../types/serialization';
import type { CapabilityAction } from '../types/capability-token';
import { IPCBridge, type APIHandler } from './ipc-bridge';
import { CapabilityGuard } from '../capabilities/capability-guard';
import { RateLimiter } from '../capabilities/rate-limiter';
import { serializeToken } from '../capabilities/capability-tokens';

/**
 * API method definition
 */
export interface APIMethodDefinition {
  /** Method name */
  readonly method: string;
  /** Required capability action */
  readonly requiredCapability: CapabilityAction;
  /** Rate limit endpoint */
  readonly rateLimitEndpoint?: string;
  /** Method implementation */
  readonly handler: (
    pluginId: string,
    args: readonly SerializableValue[]
  ) => Promise<SerializableValue>;
}

/**
 * API Dispatcher for plugin API calls
 */
export class APIDispatcher {
  private bridge: IPCBridge;
  private guard: CapabilityGuard;
  private rateLimiter: RateLimiter;
  private methods: Map<string, APIMethodDefinition> = new Map();
  private pluginTokens: Map<string, Map<CapabilityAction, string>> = new Map();

  constructor(bridge: IPCBridge, guard: CapabilityGuard, rateLimiter: RateLimiter) {
    this.bridge = bridge;
    this.guard = guard;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Register an API method
   */
  registerMethod(definition: APIMethodDefinition): void {
    this.methods.set(definition.method, definition);

    // Create wrapped handler with authorization
    const wrappedHandler: APIHandler = async (pluginId, args) => {
      // Check rate limit
      const rateLimitEndpoint = definition.rateLimitEndpoint ?? 'global';
      const rateResult = this.rateLimiter.consume(pluginId, rateLimitEndpoint);
      if (!rateResult.allowed) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          errorCode: 'RATE_LIMIT',
          retryAfter: rateResult.resetIn,
        };
      }

      // Get or issue capability token
      const token = await this.getOrIssueToken(pluginId, definition.requiredCapability);
      if (!token) {
        return {
          success: false,
          error: `Permission denied: ${definition.requiredCapability}`,
          errorCode: 'PERMISSION_DENIED',
        };
      }

      // Check permission
      const permission = await this.guard.checkPermission(
        token,
        definition.requiredCapability
      );
      if (!permission.allowed) {
        return {
          success: false,
          error: permission.reason ?? 'Permission denied',
          errorCode: 'PERMISSION_DENIED',
        };
      }

      // Execute handler
      try {
        return await definition.handler(pluginId, args);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          errorCode: 'HANDLER_ERROR',
        };
      }
    };

    this.bridge.registerHandler(definition.method, wrappedHandler);
  }

  /**
   * Unregister an API method
   */
  unregisterMethod(method: string): void {
    this.methods.delete(method);
    this.bridge.unregisterHandler(method);
  }

  /**
   * Get or issue a capability token for a plugin
   */
  private async getOrIssueToken(
    pluginId: string,
    capability: CapabilityAction
  ): Promise<string | null> {
    // Check cached token
    let pluginTokens = this.pluginTokens.get(pluginId);
    if (pluginTokens?.has(capability)) {
      return pluginTokens.get(capability)!;
    }

    // Issue new token
    const scopes = this.getScopesForCapability(capability);
    const token = await this.guard.issueToken(pluginId, capability, scopes);
    if (!token) {
      return null;
    }

    // Cache token
    if (!pluginTokens) {
      pluginTokens = new Map();
      this.pluginTokens.set(pluginId, pluginTokens);
    }
    const serialized = serializeToken(token);
    pluginTokens.set(capability, serialized);

    return serialized;
  }

  /**
   * Get default scopes for a capability
   */
  private getScopesForCapability(capability: CapabilityAction): readonly ('selection' | 'current-page' | 'current-document' | 'all-documents')[] {
    // Default to current-document scope
    // Could be customized based on capability
    if (capability.startsWith('read:selection') || capability.startsWith('selection:')) {
      return ['selection'];
    }
    return ['current-document'];
  }

  /**
   * Clear cached tokens for a plugin
   */
  clearTokens(pluginId: string): void {
    this.pluginTokens.delete(pluginId);
  }

  /**
   * Get registered method names
   */
  getRegisteredMethods(): string[] {
    return Array.from(this.methods.keys());
  }

  /**
   * Check if a method is registered
   */
  hasMethod(method: string): boolean {
    return this.methods.has(method);
  }

  /**
   * Get method definition
   */
  getMethodDefinition(method: string): APIMethodDefinition | undefined {
    return this.methods.get(method);
  }

  /**
   * Register multiple methods at once
   */
  registerMethods(definitions: readonly APIMethodDefinition[]): void {
    for (const definition of definitions) {
      this.registerMethod(definition);
    }
  }

  /**
   * Dispose the dispatcher
   */
  dispose(): void {
    for (const method of this.methods.keys()) {
      this.bridge.unregisterHandler(method);
    }
    this.methods.clear();
    this.pluginTokens.clear();
  }
}

/**
 * Create standard API methods for design operations
 */
export function createDesignAPIMethods(
  getSelection: () => SerializableValue[],
  getNode: (id: string) => SerializableValue | null,
  getChildren: (id: string) => SerializableValue[],
  getParent: (id: string) => SerializableValue | null,
  findNodes: (query: SerializableValue) => SerializableValue[]
): APIMethodDefinition[] {
  return [
    {
      method: 'design.getSelection',
      requiredCapability: 'read:selection',
      rateLimitEndpoint: 'read',
      handler: async () => getSelection(),
    },
    {
      method: 'design.getNode',
      requiredCapability: 'read:node',
      rateLimitEndpoint: 'read',
      handler: async (_pluginId, args) => {
        const id = args[0];
        if (typeof id !== 'string') {
          return { success: false, error: 'Invalid node ID' };
        }
        return getNode(id);
      },
    },
    {
      method: 'design.getChildren',
      requiredCapability: 'read:children',
      rateLimitEndpoint: 'read',
      handler: async (_pluginId, args) => {
        const id = args[0];
        if (typeof id !== 'string') {
          return { success: false, error: 'Invalid node ID' };
        }
        return getChildren(id);
      },
    },
    {
      method: 'design.getParent',
      requiredCapability: 'read:parent',
      rateLimitEndpoint: 'read',
      handler: async (_pluginId, args) => {
        const id = args[0];
        if (typeof id !== 'string') {
          return { success: false, error: 'Invalid node ID' };
        }
        return getParent(id);
      },
    },
    {
      method: 'design.findNodes',
      requiredCapability: 'read:node',
      rateLimitEndpoint: 'read',
      handler: async (_pluginId, args) => {
        const query = args[0];
        if (typeof query !== 'object' || query === null) {
          return { success: false, error: 'Invalid query' };
        }
        return findNodes(query);
      },
    },
  ];
}
