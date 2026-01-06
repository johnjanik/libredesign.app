/**
 * Performance & Caching Module
 *
 * Provides LRU caching for parsed results and performance metrics
 * collection for monitoring parser health and efficiency.
 */

import type {
  ModelType,
  ParsingResult,
  ParserContext,
  PercentileStats,
  PerformanceMetrics,
  ValidationErrorCode,
} from './types';

// =============================================================================
// Types
// =============================================================================

export interface CacheConfig {
  /** Maximum number of entries */
  maxSize: number;
  /** Time-to-live in milliseconds (0 = no expiry) */
  ttlMs: number;
  /** Enable cache statistics */
  trackStats: boolean;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,
  ttlMs: 300000, // 5 minutes
  trackStats: true,
};

export interface CachedParse {
  /** The parsing result */
  result: ParsingResult;
  /** When the entry was created */
  timestamp: number;
  /** Model type used for parsing */
  modelType: ModelType;
  /** Number of times this cache entry was hit */
  hitCount: number;
}

export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Current cache size */
  size: number;
  /** Number of evictions */
  evictions: number;
  /** Hit rate (0-1) */
  hitRate: number;
}

export interface RepairPattern {
  /** The pattern to match */
  pattern: string;
  /** The fix to apply */
  fix: string;
  /** Success rate (0-1) */
  successRate: number;
  /** Number of times used */
  useCount: number;
}

// =============================================================================
// LRU Cache Implementation
// =============================================================================

/**
 * LRU (Least Recently Used) cache for parsed results.
 * Avoids re-parsing identical inputs.
 */
export class LRUParserCache {
  private config: CacheConfig;
  private cache = new Map<string, CachedParse>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    evictions: 0,
    hitRate: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * Generate a cache key from input and context
   */
  getCacheKey(rawOutput: string, context?: Partial<ParserContext>): string {
    // Use a hash-like key based on content and model type
    const modelType = context?.modelType || 'unknown';
    const contentHash = this.simpleHash(rawOutput);
    return `${modelType}:${contentHash}`;
  }

  /**
   * Get a cached parse result
   */
  get(key: string): CachedParse | null {
    const cached = this.cache.get(key);

    if (!cached) {
      if (this.config.trackStats) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return null;
    }

    // Check TTL
    if (this.config.ttlMs > 0) {
      const age = Date.now() - cached.timestamp;
      if (age > this.config.ttlMs) {
        this.cache.delete(key);
        if (this.config.trackStats) {
          this.stats.misses++;
          this.stats.size = this.cache.size;
          this.updateHitRate();
        }
        return null;
      }
    }

    // Move to front (most recently used) by re-inserting
    this.cache.delete(key);
    cached.hitCount++;
    this.cache.set(key, cached);

    if (this.config.trackStats) {
      this.stats.hits++;
      this.updateHitRate();
    }

    return cached;
  }

  /**
   * Store a parse result in the cache
   */
  set(key: string, result: ParsingResult, modelType: ModelType = 'unknown'): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CachedParse = {
      result,
      timestamp: Date.now(),
      modelType,
      hitCount: 0,
    };

    this.cache.set(key, entry);

    if (this.config.trackStats) {
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    // Check TTL
    if (this.config.ttlMs > 0) {
      const age = Date.now() - cached.timestamp;
      if (age > this.config.ttlMs) {
        this.cache.delete(key);
        return false;
      }
    }

    return true;
  }

  /**
   * Remove an entry from the cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (this.config.trackStats) {
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    if (this.config.trackStats) {
      this.stats.size = 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      size: this.cache.size,
      evictions: 0,
      hitRate: 0,
    };
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    // Map maintains insertion order, first key is oldest
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
      if (this.config.trackStats) {
        this.stats.evictions++;
        this.stats.size = this.cache.size;
      }
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Simple string hash for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// =============================================================================
// Repair Pattern Cache
// =============================================================================

/**
 * Cache for successful repair patterns.
 * Learns from successful repairs to apply them more quickly.
 */
export class RepairPatternCache {
  private patterns = new Map<string, RepairPattern>();
  private maxPatterns: number;

  constructor(maxPatterns: number = 100) {
    this.maxPatterns = maxPatterns;
  }

  /**
   * Cache a repair pattern with its success rate
   */
  cachePattern(pattern: string, fix: string, successRate: number): void {
    const existing = this.patterns.get(pattern);

    if (existing) {
      // Update existing pattern
      existing.useCount++;
      // Running average of success rate
      existing.successRate =
        (existing.successRate * (existing.useCount - 1) + successRate) /
        existing.useCount;
    } else {
      // Evict if at capacity
      if (this.patterns.size >= this.maxPatterns) {
        this.evictLowestSuccess();
      }

      this.patterns.set(pattern, {
        pattern,
        fix,
        successRate,
        useCount: 1,
      });
    }
  }

  /**
   * Get the fix for a pattern
   */
  getFix(pattern: string): string | null {
    const cached = this.patterns.get(pattern);
    return cached ? cached.fix : null;
  }

  /**
   * Get all patterns sorted by success rate
   */
  getPatterns(): RepairPattern[] {
    return Array.from(this.patterns.values()).sort(
      (a, b) => b.successRate - a.successRate
    );
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.patterns.clear();
  }

  /**
   * Evict the pattern with the lowest success rate
   */
  private evictLowestSuccess(): void {
    let lowestKey: string | null = null;
    let lowestRate = Infinity;

    for (const [key, pattern] of this.patterns) {
      if (pattern.successRate < lowestRate) {
        lowestRate = pattern.successRate;
        lowestKey = key;
      }
    }

    if (lowestKey) {
      this.patterns.delete(lowestKey);
    }
  }
}

// =============================================================================
// Performance Metrics Collector
// =============================================================================

export interface MetricsConfig {
  /** Maximum number of timing samples to keep */
  maxSamples: number;
  /** Enable detailed per-model tracking */
  trackByModel: boolean;
  /** Reset metrics after this many requests (0 = never) */
  autoResetAfter: number;
}

const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  maxSamples: 10000,
  trackByModel: true,
  autoResetAfter: 0,
};

/**
 * Collects and computes performance metrics for the parser.
 */
export class PerformanceCollector {
  private config: MetricsConfig;
  private startTime: number;
  private timingSamples: number[] = [];
  private successCount = 0;
  private fallbackSuccessCount = 0;
  private failureCount = 0;
  private modelStats = new Map<ModelType, { success: number; total: number }>();
  private errorCounts = new Map<ValidationErrorCode, number>();
  private severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  private cacheStats: CacheStats | null = null;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = { ...DEFAULT_METRICS_CONFIG, ...config };
    this.startTime = Date.now();
  }

  /**
   * Record a parsing attempt
   */
  recordParse(
    result: ParsingResult,
    parsingTimeMs: number,
    modelType: ModelType,
    usedFallback: boolean = false
  ): void {
    // Record timing
    this.timingSamples.push(parsingTimeMs);
    if (this.timingSamples.length > this.config.maxSamples) {
      this.timingSamples.shift();
    }

    // Record success/failure
    if (result.success) {
      this.successCount++;
      if (usedFallback) {
        this.fallbackSuccessCount++;
      }
    } else {
      this.failureCount++;

      // Record errors
      if ('errors' in result && result.errors) {
        for (const error of result.errors) {
          const count = this.errorCounts.get(error.code) || 0;
          this.errorCounts.set(error.code, count + 1);

          // Categorize severity
          const severity = this.getErrorSeverity(error.code);
          this.severityCounts[severity]++;
        }
      }
    }

    // Record per-model stats
    if (this.config.trackByModel) {
      const stats = this.modelStats.get(modelType) || { success: 0, total: 0 };
      stats.total++;
      if (result.success) {
        stats.success++;
      }
      this.modelStats.set(modelType, stats);
    }

    // Auto-reset if configured
    if (
      this.config.autoResetAfter > 0 &&
      this.getTotalRequests() >= this.config.autoResetAfter
    ) {
      this.reset();
    }
  }

  /**
   * Update cache statistics
   */
  updateCacheStats(stats: CacheStats): void {
    this.cacheStats = stats;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const parsingTime = this.computePercentiles(this.timingSamples);
    const totalRequests = this.getTotalRequests();

    // Compute success rates
    const firstAttemptSuccess =
      totalRequests > 0
        ? (this.successCount - this.fallbackSuccessCount) / totalRequests
        : 0;
    const withFallbackSuccess =
      totalRequests > 0 ? this.successCount / totalRequests : 0;

    // Compute per-model success rates
    const byModel: Record<string, number> = {};
    for (const [model, stats] of this.modelStats) {
      byModel[model] = stats.total > 0 ? stats.success / stats.total : 0;
    }

    // Error distribution
    const byType: Record<string, number> = {};
    for (const [code, count] of this.errorCounts) {
      byType[code] = count;
    }

    return {
      parsingTime,
      successRate: {
        firstAttempt: firstAttemptSuccess,
        withFallback: withFallbackSuccess,
        byModel: byModel as Record<ModelType, number>,
      },
      errorDistribution: {
        byType: byType as Record<ValidationErrorCode, number>,
        bySeverity: { ...this.severityCounts },
      },
      cacheEfficiency: this.cacheStats
        ? {
            hitRate: this.cacheStats.hitRate,
            size: this.cacheStats.size,
            evictionRate:
              this.cacheStats.evictions /
              Math.max(1, this.cacheStats.hits + this.cacheStats.misses),
          }
        : { hitRate: 0, size: 0, evictionRate: 0 },
      totalRequests,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get total number of requests
   */
  getTotalRequests(): number {
    return this.successCount + this.failureCount;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.timingSamples = [];
    this.successCount = 0;
    this.fallbackSuccessCount = 0;
    this.failureCount = 0;
    this.modelStats.clear();
    this.errorCounts.clear();
    this.severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    this.startTime = Date.now();
  }

  /**
   * Compute percentile statistics from samples
   */
  private computePercentiles(samples: number[]): PercentileStats {
    if (samples.length === 0) {
      return { p50: 0, p90: 0, p99: 0, max: 0, min: 0, avg: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const len = sorted.length;

    const p50Index = Math.floor(len * 0.5);
    const p90Index = Math.floor(len * 0.9);
    const p99Index = Math.floor(len * 0.99);

    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      p50: sorted[p50Index] || 0,
      p90: sorted[p90Index] || 0,
      p99: sorted[p99Index] || 0,
      max: sorted[len - 1] || 0,
      min: sorted[0] || 0,
      avg: sum / len,
    };
  }

  /**
   * Get error severity category
   */
  private getErrorSeverity(
    code: ValidationErrorCode
  ): 'critical' | 'high' | 'medium' | 'low' {
    switch (code) {
      case 'unknown_tool':
      case 'invalid_json_structure':
        return 'critical';
      case 'required_parameter_missing':
      case 'schema_mismatch':
        return 'high';
      case 'invalid_type':
      case 'invalid_enum_value':
        return 'medium';
      case 'number_out_of_range':
      case 'string_pattern_mismatch':
        return 'low';
      default:
        return 'medium';
    }
  }
}

// =============================================================================
// Cached Parser Wrapper
// =============================================================================

export interface CachedParserConfig {
  /** Cache configuration */
  cache: Partial<CacheConfig>;
  /** Metrics configuration */
  metrics: Partial<MetricsConfig>;
  /** Enable caching */
  enableCache: boolean;
  /** Enable metrics */
  enableMetrics: boolean;
}

const DEFAULT_CACHED_PARSER_CONFIG: CachedParserConfig = {
  cache: {},
  metrics: {},
  enableCache: true,
  enableMetrics: true,
};

/**
 * Wrapper that adds caching and metrics to any parser.
 */
export class CachedParser<T extends { parse: (raw: string, ctx?: Partial<ParserContext>) => Promise<ParsingResult> }> {
  private parser: T;
  private cache: LRUParserCache;
  private metrics: PerformanceCollector;
  private config: CachedParserConfig;

  constructor(parser: T, config: Partial<CachedParserConfig> = {}) {
    this.parser = parser;
    this.config = { ...DEFAULT_CACHED_PARSER_CONFIG, ...config };
    this.cache = new LRUParserCache(this.config.cache);
    this.metrics = new PerformanceCollector(this.config.metrics);
  }

  /**
   * Parse with caching and metrics
   */
  async parse(
    rawOutput: string,
    context?: Partial<ParserContext>
  ): Promise<ParsingResult> {
    const startTime = Date.now();
    const modelType = context?.modelType || 'unknown';

    // Check cache
    if (this.config.enableCache) {
      const cacheKey = this.cache.getCacheKey(rawOutput, context);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        // Record cache hit
        if (this.config.enableMetrics) {
          const elapsed = Date.now() - startTime;
          this.metrics.recordParse(cached.result, elapsed, modelType, false);
          this.metrics.updateCacheStats(this.cache.getStats());
        }
        return cached.result;
      }
    }

    // Parse
    const result = await this.parser.parse(rawOutput, context);
    const elapsed = Date.now() - startTime;

    // Cache successful results
    if (this.config.enableCache && result.success) {
      const cacheKey = this.cache.getCacheKey(rawOutput, context);
      this.cache.set(cacheKey, result, modelType);
    }

    // Record metrics
    if (this.config.enableMetrics) {
      const usedFallback = result.success && result.metadata?.fallbackStrategy !== undefined;
      this.metrics.recordParse(result, elapsed, modelType, usedFallback);
      this.metrics.updateCacheStats(this.cache.getStats());
    }

    return result;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return this.metrics.getMetrics();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics.reset();
  }

  /**
   * Get the underlying parser
   */
  getParser(): T {
    return this.parser;
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create an LRU cache with default settings
 */
export function createCache(config: Partial<CacheConfig> = {}): LRUParserCache {
  return new LRUParserCache(config);
}

/**
 * Create a performance collector with default settings
 */
export function createMetricsCollector(
  config: Partial<MetricsConfig> = {}
): PerformanceCollector {
  return new PerformanceCollector(config);
}

/**
 * Wrap a parser with caching and metrics
 */
export function withCaching<T extends { parse: (raw: string, ctx?: Partial<ParserContext>) => Promise<ParsingResult> }>(
  parser: T,
  config: Partial<CachedParserConfig> = {}
): CachedParser<T> {
  return new CachedParser(parser, config);
}
