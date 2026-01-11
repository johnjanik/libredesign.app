/**
 * Capabilities Module - Public Exports
 */

export {
  createCapabilityToken,
  validateCapabilityToken,
  serializeToken,
  deserializeToken,
} from './capability-tokens';
export type { CreateTokenOptions, TokenValidation } from './capability-tokens';

export { CapabilityGuard, DEFAULT_GUARD_CONFIG } from './capability-guard';
export type { CapabilityGuardConfig, PermissionResult } from './capability-guard';

export { ScopeResolver, createEmptyScopeResolver } from './scope-resolver';
export type { ScopeContext } from './scope-resolver';

export { RateLimiter, DEFAULT_RATE_LIMITS } from './rate-limiter';
export type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitStats,
  EndpointStats,
} from './rate-limiter';
