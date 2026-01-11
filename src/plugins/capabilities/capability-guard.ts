/**
 * Capability Guard
 *
 * Enforces capability-based access control for plugin API calls.
 * Validates tokens and checks permissions before allowing operations.
 */

import type { CapabilityToken, CapabilityAction, TokenUsageRecord } from '../types/capability-token';
import type { PluginManifest, PluginCapabilities, CapabilityScope, NodeType } from '../types/plugin-manifest';
import { validateCapabilityToken, createCapabilityToken, deserializeToken } from './capability-tokens';

/**
 * Permission check result
 */
export interface PermissionResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

/**
 * Guard configuration
 */
export interface CapabilityGuardConfig {
  /** Whether to log all permission checks */
  readonly verbose: boolean;
  /** Default token expiration in ms (0 = no expiration) */
  readonly defaultTokenExpiration: number;
  /** Whether to enforce strict scope checking */
  readonly strictScopes: boolean;
}

/**
 * Default guard configuration
 */
export const DEFAULT_GUARD_CONFIG: CapabilityGuardConfig = {
  verbose: false,
  defaultTokenExpiration: 3600000, // 1 hour
  strictScopes: true,
};

/**
 * Capability action to required manifest capability mapping
 */
const ACTION_TO_CAPABILITY: Record<CapabilityAction, keyof PluginCapabilities | null> = {
  // Read actions require 'read' capability
  'read:node': 'read',
  'read:properties': 'read',
  'read:children': 'read',
  'read:parent': 'read',
  'read:selection': 'read',
  'read:viewport': 'read',
  // Write actions require 'write' capability
  'write:create': 'write',
  'write:update': 'write',
  'write:delete': 'write',
  'write:duplicate': 'write',
  'write:group': 'write',
  // Selection actions require 'write' for modifications
  'selection:get': 'read',
  'selection:set': 'write',
  'selection:add': 'write',
  'selection:remove': 'write',
  // History actions require 'write'
  'history:undo': 'write',
  'history:redo': 'write',
  'history:batch': 'write',
  // UI actions require 'ui'
  'ui:panel': 'ui',
  'ui:modal': 'ui',
  'ui:toast': 'ui',
  'ui:context-menu': 'ui',
  // Network actions require 'network'
  'network:fetch': 'network',
  // Clipboard actions
  'clipboard:read': 'clipboard',
  'clipboard:write': 'clipboard',
  // Storage actions
  'storage:read': 'storage',
  'storage:write': 'storage',
  'storage:delete': 'storage',
};

/**
 * Capability Guard for plugin access control
 */
export class CapabilityGuard {
  private config: CapabilityGuardConfig;
  private manifests: Map<string, PluginManifest> = new Map();
  private tokenUsage: Map<string, TokenUsageRecord> = new Map();
  private activeTokens: Map<string, CapabilityToken> = new Map();

  constructor(config: Partial<CapabilityGuardConfig> = {}) {
    this.config = { ...DEFAULT_GUARD_CONFIG, ...config };
  }

  /**
   * Register a plugin's manifest for capability checking
   */
  registerPlugin(manifest: PluginManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string): void {
    this.manifests.delete(pluginId);
    // Clean up tokens for this plugin
    for (const [tokenId, token] of this.activeTokens) {
      if (token.pluginId === pluginId) {
        this.activeTokens.delete(tokenId);
        this.tokenUsage.delete(tokenId);
      }
    }
  }

  /**
   * Check if a plugin has a specific capability in its manifest
   */
  hasCapability(pluginId: string, action: CapabilityAction): boolean {
    const manifest = this.manifests.get(pluginId);
    if (!manifest) return false;

    const requiredCapability = ACTION_TO_CAPABILITY[action];
    if (requiredCapability === null) return true; // No capability required

    const capabilities = manifest.capabilities;

    switch (requiredCapability) {
      case 'read':
        return !!capabilities.read;
      case 'write':
        return !!capabilities.write;
      case 'ui':
        return !!capabilities.ui;
      case 'network':
        return !!capabilities.network;
      case 'clipboard':
        return !!capabilities.clipboard;
      case 'storage':
        return !!capabilities.storage;
      default:
        return false;
    }
  }

  /**
   * Check if a scope is allowed for a plugin
   */
  private isScopeAllowed(
    pluginId: string,
    action: CapabilityAction,
    scope: CapabilityScope
  ): boolean {
    const manifest = this.manifests.get(pluginId);
    if (!manifest) return false;

    const requiredCapability = ACTION_TO_CAPABILITY[action];
    if (requiredCapability === null) return true;

    const capabilities = manifest.capabilities;

    // Get the scopes for the required capability
    let allowedScopes: readonly CapabilityScope[] | undefined;

    switch (requiredCapability) {
      case 'read':
        allowedScopes = capabilities.read?.scopes;
        break;
      case 'write':
        allowedScopes = capabilities.write?.scopes;
        break;
      case 'ui':
        // UI doesn't have scopes in the same way
        return true;
      case 'network':
        // Network doesn't have scopes in the same way
        return true;
      case 'clipboard':
      case 'storage':
        // These are boolean capabilities
        return true;
      default:
        return false;
    }

    if (!allowedScopes) return false;

    // Check scope hierarchy
    return this.scopeContains(allowedScopes, scope);
  }

  /**
   * Check if allowed scopes contain the requested scope
   */
  private scopeContains(
    allowedScopes: readonly CapabilityScope[],
    requestedScope: CapabilityScope
  ): boolean {
    // Direct match
    if (allowedScopes.includes(requestedScope)) return true;

    // Scope hierarchy: all-documents > current-document > current-page > selection
    const hierarchy: CapabilityScope[] = [
      'selection',
      'current-page',
      'current-document',
      'all-documents',
    ];

    const requestedIndex = hierarchy.indexOf(requestedScope);
    if (requestedIndex === -1) return false;

    // Check if any allowed scope is higher in hierarchy
    for (const allowed of allowedScopes) {
      const allowedIndex = hierarchy.indexOf(allowed);
      if (allowedIndex >= requestedIndex) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a node type is allowed for a plugin action
   */
  private isNodeTypeAllowed(
    pluginId: string,
    action: CapabilityAction,
    nodeType: NodeType
  ): boolean {
    const manifest = this.manifests.get(pluginId);
    if (!manifest) return false;

    const requiredCapability = ACTION_TO_CAPABILITY[action];
    if (requiredCapability !== 'read' && requiredCapability !== 'write') {
      return true;
    }

    const capabilities = manifest.capabilities;
    let allowedTypes: readonly NodeType[] | undefined;

    if (requiredCapability === 'read') {
      allowedTypes = capabilities.read?.types;
    } else {
      allowedTypes = capabilities.write?.types;
    }

    if (!allowedTypes) return false;

    // '*' means all types allowed
    if (allowedTypes.includes('*')) return true;

    return allowedTypes.includes(nodeType);
  }

  /**
   * Issue a capability token for a plugin
   */
  async issueToken(
    pluginId: string,
    action: CapabilityAction,
    scopes: readonly CapabilityScope[]
  ): Promise<CapabilityToken | null> {
    // Check if plugin has the capability
    if (!this.hasCapability(pluginId, action)) {
      if (this.config.verbose) {
        console.warn(`Plugin ${pluginId} lacks capability for action ${action}`);
      }
      return null;
    }

    // Check scopes
    for (const scope of scopes) {
      if (!this.isScopeAllowed(pluginId, action, scope)) {
        if (this.config.verbose) {
          console.warn(`Plugin ${pluginId} not allowed scope ${scope} for action ${action}`);
        }
        return null;
      }
    }

    // Create token
    const tokenConstraints = this.config.defaultTokenExpiration > 0
      ? { expiresAt: Date.now() + this.config.defaultTokenExpiration }
      : {};
    const token = await createCapabilityToken({
      pluginId,
      capability: action,
      scopes,
      constraints: tokenConstraints,
    });

    // Track token
    this.activeTokens.set(token.tokenId, token);
    this.tokenUsage.set(token.tokenId, {
      tokenId: token.tokenId,
      usageCount: 0,
      recentUses: [],
      lastUsedAt: 0,
    });

    return token;
  }

  /**
   * Check permission using a token
   */
  async checkPermission(
    tokenString: string,
    action: CapabilityAction,
    options?: {
      scope?: CapabilityScope;
      nodeType?: NodeType;
    }
  ): Promise<PermissionResult> {
    // Deserialize token
    const token = deserializeToken(tokenString);
    if (!token) {
      return { allowed: false, reason: 'Invalid token format' };
    }

    // Get usage record
    const usage = this.tokenUsage.get(token.tokenId);

    // Validate token
    const validation = await validateCapabilityToken(token, usage);
    if (!validation.valid) {
      return { allowed: false, reason: validation.reason ?? 'Token validation failed' };
    }

    // Check action matches
    if (token.capability !== action) {
      return { allowed: false, reason: `Token is for ${token.capability}, not ${action}` };
    }

    // Check scope if provided
    if (options?.scope && this.config.strictScopes) {
      if (!this.scopeContains(token.scopes, options.scope)) {
        return { allowed: false, reason: `Token scope does not include ${options.scope}` };
      }
    }

    // Check node type if provided
    if (options?.nodeType) {
      if (!this.isNodeTypeAllowed(token.pluginId, action, options.nodeType)) {
        return { allowed: false, reason: `Node type ${options.nodeType} not allowed` };
      }
    }

    // Record usage
    if (usage) {
      const now = Date.now();
      const updatedUsage: TokenUsageRecord = {
        tokenId: usage.tokenId,
        usageCount: usage.usageCount + 1,
        recentUses: [...usage.recentUses.slice(-99), now],
        lastUsedAt: now,
      };
      this.tokenUsage.set(token.tokenId, updatedUsage);
    }

    return { allowed: true };
  }

  /**
   * Revoke a token
   */
  revokeToken(tokenId: string): void {
    this.activeTokens.delete(tokenId);
    this.tokenUsage.delete(tokenId);
  }

  /**
   * Revoke all tokens for a plugin
   */
  revokeAllTokens(pluginId: string): void {
    for (const [tokenId, token] of this.activeTokens) {
      if (token.pluginId === pluginId) {
        this.revokeToken(tokenId);
      }
    }
  }

  /**
   * Get active token count
   */
  getActiveTokenCount(pluginId?: string): number {
    if (!pluginId) {
      return this.activeTokens.size;
    }
    let count = 0;
    for (const token of this.activeTokens.values()) {
      if (token.pluginId === pluginId) count++;
    }
    return count;
  }

  /**
   * Get capability summary for a plugin
   */
  getCapabilitySummary(pluginId: string): PluginCapabilities | null {
    const manifest = this.manifests.get(pluginId);
    return manifest?.capabilities ?? null;
  }

  /**
   * Dispose the guard
   */
  dispose(): void {
    this.manifests.clear();
    this.activeTokens.clear();
    this.tokenUsage.clear();
  }
}
