/**
 * Rate Limiter
 *
 * Enforces API call rate limits for plugins.
 * Uses sliding window algorithm for accurate rate limiting.
 */

import type { PluginId } from '../types/plugin-manifest';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests in the window */
  readonly maxRequests: number;
  /** Window size in milliseconds */
  readonly windowMs: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  readonly allowed: boolean;
  /** Remaining requests in current window */
  readonly remaining: number;
  /** Time in ms until limit resets */
  readonly resetIn: number;
  /** Total limit */
  readonly limit: number;
}

/**
 * Plugin rate limit state
 */
interface PluginRateState {
  readonly pluginId: PluginId;
  /** Request timestamps in current window */
  requests: number[];
  /** Per-endpoint limits */
  endpointLimits: Map<string, RateLimitConfig>;
  /** Per-endpoint request counts */
  endpointRequests: Map<string, number[]>;
}

/**
 * Default rate limits
 */
export const DEFAULT_RATE_LIMITS = {
  /** Global API calls per minute */
  global: { maxRequests: 1000, windowMs: 60000 },
  /** Read operations per minute */
  read: { maxRequests: 500, windowMs: 60000 },
  /** Write operations per minute */
  write: { maxRequests: 100, windowMs: 60000 },
  /** Network requests per minute */
  network: { maxRequests: 60, windowMs: 60000 },
  /** Storage operations per minute */
  storage: { maxRequests: 200, windowMs: 60000 },
} as const;

/**
 * Rate Limiter for plugin API calls
 */
export class RateLimiter {
  private plugins: Map<PluginId, PluginRateState> = new Map();
  private globalLimits: Record<string, RateLimitConfig>;

  constructor(globalLimits?: Record<string, RateLimitConfig>) {
    this.globalLimits = globalLimits ?? { ...DEFAULT_RATE_LIMITS };
  }

  /**
   * Register a plugin with optional custom limits
   */
  register(pluginId: PluginId, customLimits?: Record<string, RateLimitConfig>): void {
    const endpointLimits = new Map<string, RateLimitConfig>();

    // Apply global limits first
    for (const [key, config] of Object.entries(this.globalLimits)) {
      endpointLimits.set(key, config);
    }

    // Override with custom limits
    if (customLimits) {
      for (const [key, config] of Object.entries(customLimits)) {
        endpointLimits.set(key, config);
      }
    }

    this.plugins.set(pluginId, {
      pluginId,
      requests: [],
      endpointLimits,
      endpointRequests: new Map(),
    });
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: PluginId): void {
    this.plugins.delete(pluginId);
  }

  /**
   * Check if a request is allowed (without consuming)
   */
  check(pluginId: PluginId, endpoint: string = 'global'): RateLimitResult {
    const state = this.plugins.get(pluginId);
    if (!state) {
      return {
        allowed: true,
        remaining: Infinity,
        resetIn: 0,
        limit: Infinity,
      };
    }

    const config = state.endpointLimits.get(endpoint) ?? this.globalLimits['global']!;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get requests for this endpoint
    let requests = state.endpointRequests.get(endpoint) ?? [];

    // Filter to requests in window
    requests = requests.filter((t) => t > windowStart);

    const remaining = Math.max(0, config.maxRequests - requests.length);
    const allowed = remaining > 0;
    const oldestRequest = requests[0] ?? now;
    const resetIn = allowed ? 0 : Math.max(0, oldestRequest + config.windowMs - now);

    return {
      allowed,
      remaining,
      resetIn,
      limit: config.maxRequests,
    };
  }

  /**
   * Check and consume a request slot
   */
  consume(pluginId: PluginId, endpoint: string = 'global'): RateLimitResult {
    const result = this.check(pluginId, endpoint);

    if (result.allowed) {
      const state = this.plugins.get(pluginId);
      if (state) {
        const now = Date.now();

        // Add to global requests
        state.requests.push(now);

        // Add to endpoint requests
        let endpointRequests = state.endpointRequests.get(endpoint) ?? [];
        endpointRequests.push(now);
        state.endpointRequests.set(endpoint, endpointRequests);

        // Clean up old entries periodically
        this.cleanup(state);
      }
    }

    return result;
  }

  /**
   * Clean up old request timestamps
   */
  private cleanup(state: PluginRateState): void {
    const now = Date.now();
    const maxWindow = Math.max(
      ...Array.from(state.endpointLimits.values()).map((c) => c.windowMs)
    );
    const cutoff = now - maxWindow;

    // Clean global requests
    state.requests = state.requests.filter((t) => t > cutoff);

    // Clean endpoint requests
    for (const [endpoint, requests] of state.endpointRequests) {
      const config = state.endpointLimits.get(endpoint);
      const endpointCutoff = now - (config?.windowMs ?? maxWindow);
      state.endpointRequests.set(
        endpoint,
        requests.filter((t) => t > endpointCutoff)
      );
    }
  }

  /**
   * Get rate limit statistics for a plugin
   */
  getStatistics(pluginId: PluginId): RateLimitStats | null {
    const state = this.plugins.get(pluginId);
    if (!state) return null;

    const now = Date.now();
    const endpoints: EndpointStats[] = [];

    for (const [endpoint, config] of state.endpointLimits) {
      const requests = state.endpointRequests.get(endpoint) ?? [];
      const windowStart = now - config.windowMs;
      const recentRequests = requests.filter((t) => t > windowStart);

      endpoints.push({
        endpoint,
        limit: config.maxRequests,
        windowMs: config.windowMs,
        current: recentRequests.length,
        remaining: Math.max(0, config.maxRequests - recentRequests.length),
      });
    }

    return {
      pluginId,
      globalRequests: state.requests.length,
      endpoints,
    };
  }

  /**
   * Reset rate limits for a plugin
   */
  reset(pluginId: PluginId, endpoint?: string): void {
    const state = this.plugins.get(pluginId);
    if (!state) return;

    if (endpoint) {
      state.endpointRequests.delete(endpoint);
    } else {
      state.requests = [];
      state.endpointRequests.clear();
    }
  }

  /**
   * Update limits for a plugin endpoint
   */
  setLimit(pluginId: PluginId, endpoint: string, config: RateLimitConfig): void {
    const state = this.plugins.get(pluginId);
    if (state) {
      state.endpointLimits.set(endpoint, config);
    }
  }

  /**
   * Get headers for rate limit response
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.ceil(result.resetIn / 1000)),
    };
  }

  /**
   * Dispose the rate limiter
   */
  dispose(): void {
    this.plugins.clear();
  }
}

/**
 * Per-endpoint rate limit statistics
 */
export interface EndpointStats {
  readonly endpoint: string;
  readonly limit: number;
  readonly windowMs: number;
  readonly current: number;
  readonly remaining: number;
}

/**
 * Plugin rate limit statistics
 */
export interface RateLimitStats {
  readonly pluginId: PluginId;
  readonly globalRequests: number;
  readonly endpoints: readonly EndpointStats[];
}
