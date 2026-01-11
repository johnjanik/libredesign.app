/**
 * Capability Tokens
 *
 * Creates and validates HMAC-signed capability tokens
 * that authorize plugins to perform specific actions.
 */

import type {
  CapabilityToken,
  CapabilityAction,
  TokenConstraints,
  TokenUsageRecord,
  RateLimit,
} from '../types/capability-token';
import type { CapabilityScope, PluginId, NodeType, HttpMethod } from '../types/plugin-manifest';
import {
  generateTokenId,
  isTokenExpired,
  isTokenUsageExceeded,
  isTokenRateLimited,
} from '../types/capability-token';

/**
 * Token signing key (should be securely generated in production)
 */
let signingKey: CryptoKey | null = null;

/**
 * Initialize the signing key
 */
async function initSigningKey(): Promise<CryptoKey> {
  if (signingKey) return signingKey;

  // Generate a random key for this session
  signingKey = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );

  return signingKey;
}

/**
 * Sign data using HMAC-SHA256
 */
async function signData(data: string): Promise<string> {
  const key = await initSigningKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return arrayBufferToBase64(signature);
}

/**
 * Verify HMAC-SHA256 signature
 */
async function verifySignature(data: string, signature: string): Promise<boolean> {
  const key = await initSigningKey();
  const encoder = new TextEncoder();
  const signatureBuffer = base64ToArrayBuffer(signature);
  return crypto.subtle.verify('HMAC', key, signatureBuffer, encoder.encode(data));
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Convert base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Token creation options
 */
export interface CreateTokenOptions {
  readonly pluginId: PluginId;
  readonly capability: CapabilityAction;
  readonly scopes: readonly CapabilityScope[];
  readonly constraints?: Partial<TokenConstraints>;
}

/**
 * Create a new capability token
 */
export async function createCapabilityToken(
  options: CreateTokenOptions
): Promise<CapabilityToken> {
  const tokenId = generateTokenId();
  const issuedAt = Date.now();

  // Build constraints, only including defined values
  const constraints: TokenConstraints = {};
  if (options.constraints?.expiresAt !== undefined) {
    (constraints as { expiresAt?: number }).expiresAt = options.constraints.expiresAt;
  }
  if (options.constraints?.usageLimit !== undefined) {
    (constraints as { usageLimit?: number }).usageLimit = options.constraints.usageLimit;
  }
  if (options.constraints?.rateLimit !== undefined) {
    (constraints as { rateLimit?: RateLimit }).rateLimit = options.constraints.rateLimit;
  }
  if (options.constraints?.nodeTypes !== undefined) {
    (constraints as { nodeTypes?: readonly NodeType[] }).nodeTypes = options.constraints.nodeTypes;
  }
  if (options.constraints?.domains !== undefined) {
    (constraints as { domains?: readonly string[] }).domains = options.constraints.domains;
  }
  if (options.constraints?.methods !== undefined) {
    (constraints as { methods?: readonly HttpMethod[] }).methods = options.constraints.methods;
  }

  // Build data to sign
  const dataToSign = JSON.stringify({
    tokenId,
    pluginId: options.pluginId,
    capability: options.capability,
    scopes: options.scopes,
    constraints,
    issuedAt,
  });

  const signature = await signData(dataToSign);

  return {
    tokenId,
    pluginId: options.pluginId,
    capability: options.capability,
    scopes: options.scopes,
    constraints,
    issuedAt,
    signature,
  };
}

/**
 * Token validation result
 */
export interface TokenValidation {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * Validate a capability token
 */
export async function validateCapabilityToken(
  token: CapabilityToken,
  usage?: TokenUsageRecord
): Promise<TokenValidation> {
  // Check expiration
  if (isTokenExpired(token)) {
    return { valid: false, reason: 'Token has expired' };
  }

  // Check usage limit
  if (usage && isTokenUsageExceeded(token, usage)) {
    return { valid: false, reason: 'Token usage limit exceeded' };
  }

  // Check rate limit
  if (usage && isTokenRateLimited(token, usage)) {
    return { valid: false, reason: 'Token rate limit exceeded' };
  }

  // Verify signature
  const dataToVerify = JSON.stringify({
    tokenId: token.tokenId,
    pluginId: token.pluginId,
    capability: token.capability,
    scopes: token.scopes,
    constraints: token.constraints,
    issuedAt: token.issuedAt,
  });

  const signatureValid = await verifySignature(dataToVerify, token.signature);
  if (!signatureValid) {
    return { valid: false, reason: 'Invalid token signature' };
  }

  return { valid: true };
}

/**
 * Serialize a token for transmission
 */
export function serializeToken(token: CapabilityToken): string {
  return JSON.stringify(token);
}

/**
 * Deserialize a token from transmission
 */
export function deserializeToken(serialized: string): CapabilityToken | null {
  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (!isValidTokenShape(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check if object has valid token shape
 */
function isValidTokenShape(obj: unknown): obj is CapabilityToken {
  if (typeof obj !== 'object' || obj === null) return false;
  const token = obj as Record<string, unknown>;
  return (
    typeof token['tokenId'] === 'string' &&
    typeof token['pluginId'] === 'string' &&
    typeof token['capability'] === 'string' &&
    Array.isArray(token['scopes']) &&
    typeof token['constraints'] === 'object' &&
    typeof token['issuedAt'] === 'number' &&
    typeof token['signature'] === 'string'
  );
}
