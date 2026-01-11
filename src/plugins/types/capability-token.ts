/**
 * Capability Token Types
 *
 * Tokens are HMAC-signed capability grants that authorize plugins
 * to perform specific actions within defined scopes.
 */

import type { PluginId, CapabilityScope, NodeType, HttpMethod } from './plugin-manifest';

/**
 * Capability categories
 */
export type CapabilityCategory = 'read' | 'write' | 'ui' | 'network' | 'clipboard' | 'storage';

/**
 * Fine-grained capability actions
 */
export type CapabilityAction =
  // Read actions
  | 'read:node'
  | 'read:properties'
  | 'read:children'
  | 'read:parent'
  | 'read:selection'
  | 'read:viewport'
  // Write actions
  | 'write:create'
  | 'write:update'
  | 'write:delete'
  | 'write:duplicate'
  | 'write:group'
  // Selection actions
  | 'selection:get'
  | 'selection:set'
  | 'selection:add'
  | 'selection:remove'
  // History actions
  | 'history:undo'
  | 'history:redo'
  | 'history:batch'
  // UI actions
  | 'ui:panel'
  | 'ui:modal'
  | 'ui:toast'
  | 'ui:context-menu'
  // Network actions
  | 'network:fetch'
  // Data actions
  | 'clipboard:read'
  | 'clipboard:write'
  | 'storage:read'
  | 'storage:write'
  | 'storage:delete';

/**
 * Rate limit configuration
 */
export interface RateLimit {
  /** Maximum number of requests */
  readonly requests: number;
  /** Time window in seconds */
  readonly perSeconds: number;
}

/**
 * Token constraints that limit how the token can be used
 */
export interface TokenConstraints {
  /** Token expiration timestamp (Unix ms) */
  readonly expiresAt?: number;
  /** Maximum number of times this token can be used */
  readonly usageLimit?: number;
  /** Rate limiting configuration */
  readonly rateLimit?: RateLimit;
  /** Allowed node types (for read/write actions) */
  readonly nodeTypes?: readonly NodeType[];
  /** Allowed domains (for network actions) */
  readonly domains?: readonly string[];
  /** Allowed HTTP methods (for network actions) */
  readonly methods?: readonly HttpMethod[];
}

/**
 * Resolved scope - concrete node IDs or special values
 */
export type ResolvedScope =
  | { readonly type: 'node-ids'; readonly ids: readonly string[] }
  | { readonly type: 'current-page'; readonly pageId: string }
  | { readonly type: 'current-document'; readonly documentId: string }
  | { readonly type: 'all' };

/**
 * Capability token structure
 */
export interface CapabilityToken {
  /** Unique token identifier */
  readonly tokenId: string;

  /** Plugin that owns this token */
  readonly pluginId: PluginId;

  /** The capability this token grants */
  readonly capability: CapabilityAction;

  /** Abstract scopes (from manifest) */
  readonly scopes: readonly CapabilityScope[];

  /** Constraints on token usage */
  readonly constraints: TokenConstraints;

  /** Token creation timestamp */
  readonly issuedAt: number;

  /** HMAC-SHA256 signature */
  readonly signature: string;
}

/**
 * Token with resolved scope (runtime)
 */
export interface ResolvedCapabilityToken extends CapabilityToken {
  /** Resolved scope with concrete IDs */
  readonly resolvedScope: ResolvedScope;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  /** Whether the token is valid */
  readonly valid: boolean;
  /** Reason for invalidity (if invalid) */
  readonly reason?: string;
  /** Resolved token (if valid) */
  readonly token?: ResolvedCapabilityToken;
}

/**
 * Token usage record for tracking
 */
export interface TokenUsageRecord {
  /** Token ID */
  readonly tokenId: string;
  /** Number of times used */
  readonly usageCount: number;
  /** Timestamps of recent uses (for rate limiting) */
  readonly recentUses: readonly number[];
  /** Last use timestamp */
  readonly lastUsedAt: number;
}

/**
 * Generate a unique token ID
 */
export function generateTokenId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `tok_${timestamp}_${random}`;
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(token: CapabilityToken): boolean {
  if (token.constraints.expiresAt === undefined) {
    return false;
  }
  return Date.now() > token.constraints.expiresAt;
}

/**
 * Check if token has exceeded usage limit
 */
export function isTokenUsageExceeded(
  token: CapabilityToken,
  usage: TokenUsageRecord
): boolean {
  if (token.constraints.usageLimit === undefined) {
    return false;
  }
  return usage.usageCount >= token.constraints.usageLimit;
}

/**
 * Check if token is rate limited
 */
export function isTokenRateLimited(
  token: CapabilityToken,
  usage: TokenUsageRecord
): boolean {
  const rateLimit = token.constraints.rateLimit;
  if (!rateLimit) {
    return false;
  }

  const windowStart = Date.now() - rateLimit.perSeconds * 1000;
  const recentCount = usage.recentUses.filter((t) => t > windowStart).length;
  return recentCount >= rateLimit.requests;
}
