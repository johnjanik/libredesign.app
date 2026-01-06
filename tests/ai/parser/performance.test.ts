/**
 * Tests for Performance & Caching Module
 *
 * Tests LRU caching, repair pattern caching, and performance metrics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LRUParserCache,
  RepairPatternCache,
  PerformanceCollector,
  CachedParser,
  createCache,
  createMetricsCollector,
  withCaching,
} from '../../../src/ai/parser/performance';
import type { ParsingResult, ParsingSuccess } from '../../../src/ai/parser/types';

// Helper to create a complete mock ParsingResult
function createMockResult(overrides?: Partial<ParsingSuccess>): ParsingResult {
  return {
    success: true,
    toolCalls: [],
    metadata: {
      parsingTime: 10,
      extractionMethod: 'ast_balanced' as const,
      format: 'custom_structured' as const,
      confidence: 0.9,
      coercions: {},
      warnings: [],
      rawOutputSnippet: '...',
    },
    ...overrides,
  } as ParsingResult;
}

// =============================================================================
// LRUParserCache Tests
// =============================================================================

describe('LRUParserCache', () => {
  let cache: LRUParserCache;

  beforeEach(() => {
    cache = new LRUParserCache({ maxSize: 5, ttlMs: 0, trackStats: true });
  });

  describe('getCacheKey', () => {
    it('generates consistent keys for same input', () => {
      const key1 = cache.getCacheKey('{"tool": "test"}', { modelType: 'claude' });
      const key2 = cache.getCacheKey('{"tool": "test"}', { modelType: 'claude' });
      expect(key1).toBe(key2);
    });

    it('generates different keys for different inputs', () => {
      const key1 = cache.getCacheKey('{"tool": "test1"}', { modelType: 'claude' });
      const key2 = cache.getCacheKey('{"tool": "test2"}', { modelType: 'claude' });
      expect(key1).not.toBe(key2);
    });

    it('generates different keys for different model types', () => {
      const key1 = cache.getCacheKey('{"tool": "test"}', { modelType: 'claude' });
      const key2 = cache.getCacheKey('{"tool": "test"}', { modelType: 'openai' });
      expect(key1).not.toBe(key2);
    });
  });

  describe('get/set', () => {
    const mockResult = createMockResult();

    it('stores and retrieves values', () => {
      cache.set('key1', mockResult, 'claude');
      const retrieved = cache.get('key1');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.result).toEqual(mockResult);
    });

    it('returns null for missing keys', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('tracks hit count', () => {
      cache.set('key1', mockResult, 'claude');
      cache.get('key1'); // hit 1
      cache.get('key1'); // hit 2
      const entry = cache.get('key1'); // hit 3

      expect(entry!.hitCount).toBe(3);
    });
  });

  describe('LRU eviction', () => {
    const mockResult = createMockResult();

    it('evicts oldest entry when at capacity', () => {
      // Fill cache
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, mockResult, 'claude');
      }

      expect(cache.size).toBe(5);
      expect(cache.has('key0')).toBe(true);

      // Add one more - should evict key0
      cache.set('key5', mockResult, 'claude');

      expect(cache.size).toBe(5);
      expect(cache.has('key0')).toBe(false);
      expect(cache.has('key5')).toBe(true);
    });

    it('accessing entry moves it to front', () => {
      // Fill cache
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, mockResult, 'claude');
      }

      // Access key0 to move it to front
      cache.get('key0');

      // Add new entry - should evict key1 (now oldest)
      cache.set('key5', mockResult, 'claude');

      expect(cache.has('key0')).toBe(true);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('TTL expiration', () => {
    it('expires entries after TTL', async () => {
      const shortTTLCache = new LRUParserCache({ maxSize: 10, ttlMs: 50 });
      const mockResult = createMockResult();

      shortTTLCache.set('key1', mockResult, 'claude');
      expect(shortTTLCache.get('key1')).not.toBeNull();

      // Wait for TTL
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(shortTTLCache.get('key1')).toBeNull();
    });
  });

  describe('statistics', () => {
    const mockResult = createMockResult();

    it('tracks hits and misses', () => {
      cache.set('key1', mockResult, 'claude');
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('missing'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('tracks evictions', () => {
      for (let i = 0; i < 7; i++) {
        cache.set(`key${i}`, mockResult, 'claude');
      }

      const stats = cache.getStats();
      expect(stats.evictions).toBe(2);
    });

    it('resets statistics', () => {
      cache.set('key1', mockResult, 'claude');
      cache.get('key1');
      cache.get('missing');

      cache.resetStats();
      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(1); // Size preserved
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      const mockResult = createMockResult();

      cache.set('key1', mockResult, 'claude');
      cache.set('key2', mockResult, 'claude');

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeNull();
    });
  });
});

// =============================================================================
// RepairPatternCache Tests
// =============================================================================

describe('RepairPatternCache', () => {
  let cache: RepairPatternCache;

  beforeEach(() => {
    cache = new RepairPatternCache(5);
  });

  describe('cachePattern', () => {
    it('stores patterns', () => {
      cache.cachePattern('trailing_comma', 'remove comma', 0.9);
      expect(cache.getFix('trailing_comma')).toBe('remove comma');
    });

    it('updates success rate on repeated use', () => {
      cache.cachePattern('pattern1', 'fix1', 0.8);
      cache.cachePattern('pattern1', 'fix1', 1.0);

      const patterns = cache.getPatterns();
      const pattern = patterns.find((p) => p.pattern === 'pattern1');

      expect(pattern!.useCount).toBe(2);
      expect(pattern!.successRate).toBe(0.9); // Average of 0.8 and 1.0
    });
  });

  describe('getPatterns', () => {
    it('returns patterns sorted by success rate', () => {
      cache.cachePattern('low', 'fix', 0.5);
      cache.cachePattern('high', 'fix', 0.9);
      cache.cachePattern('mid', 'fix', 0.7);

      const patterns = cache.getPatterns();

      expect(patterns[0]!.pattern).toBe('high');
      expect(patterns[1]!.pattern).toBe('mid');
      expect(patterns[2]!.pattern).toBe('low');
    });
  });

  describe('eviction', () => {
    it('evicts lowest success rate when at capacity', () => {
      cache.cachePattern('p1', 'fix', 0.9);
      cache.cachePattern('p2', 'fix', 0.8);
      cache.cachePattern('p3', 'fix', 0.7);
      cache.cachePattern('p4', 'fix', 0.6);
      cache.cachePattern('p5', 'fix', 0.5);

      // Add one more - should evict p5 (lowest success rate)
      cache.cachePattern('p6', 'fix', 0.85);

      expect(cache.getFix('p5')).toBeNull();
      expect(cache.getFix('p6')).toBe('fix');
    });
  });
});

// =============================================================================
// PerformanceCollector Tests
// =============================================================================

describe('PerformanceCollector', () => {
  let collector: PerformanceCollector;

  beforeEach(() => {
    collector = new PerformanceCollector({ maxSamples: 100 });
  });

  describe('recordParse', () => {
    it('records successful parses', () => {
      const result = createMockResult();

      collector.recordParse(result, 50, 'claude', false);

      const metrics = collector.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successRate.firstAttempt).toBe(1);
    });

    it('tracks fallback success separately', () => {
      const result = createMockResult();

      collector.recordParse(result, 50, 'claude', false);
      collector.recordParse(result, 50, 'claude', true);

      const metrics = collector.getMetrics();
      expect(metrics.successRate.firstAttempt).toBe(0.5);
      expect(metrics.successRate.withFallback).toBe(1);
    });

    it('records failures with error distribution', () => {
      const result: ParsingResult = {
        success: false,
        error: 'Failed',
        errors: [{ path: [], code: 'unknown_tool', message: 'Unknown tool' }],
        suggestions: [],
        metadata: { parsingTime: 10 },
      };

      collector.recordParse(result, 50, 'claude', false);

      const metrics = collector.getMetrics();
      expect(metrics.errorDistribution.byType['unknown_tool']).toBe(1);
      expect(metrics.errorDistribution.bySeverity.critical).toBe(1);
    });

    it('tracks per-model success rates', () => {
      const success = createMockResult();
      const failure: ParsingResult = {
        success: false,
        error: 'Failed',
        errors: [],
        suggestions: [],
        metadata: { parsingTime: 10 },
      };

      collector.recordParse(success, 50, 'claude', false);
      collector.recordParse(success, 50, 'claude', false);
      collector.recordParse(failure, 50, 'openai', false);

      const metrics = collector.getMetrics();
      expect(metrics.successRate.byModel['claude']).toBe(1);
      expect(metrics.successRate.byModel['openai']).toBe(0);
    });
  });

  describe('timing statistics', () => {
    it('computes percentiles correctly', () => {
      const result = createMockResult();

      // Add samples with known distribution
      for (let i = 1; i <= 100; i++) {
        collector.recordParse(result, i, 'claude', false);
      }

      const metrics = collector.getMetrics();

      expect(metrics.parsingTime.min).toBe(1);
      expect(metrics.parsingTime.max).toBe(100);
      // p50 at index floor(100 * 0.5) = 50, which is the 51st value (value 51)
      expect(metrics.parsingTime.p50).toBeCloseTo(51, 0);
      // p90 at index floor(100 * 0.9) = 90, which is the 91st value (value 91)
      expect(metrics.parsingTime.p90).toBeCloseTo(91, 0);
      expect(metrics.parsingTime.avg).toBeCloseTo(50.5, 0);
    });
  });

  describe('reset', () => {
    it('clears all metrics', () => {
      const result = createMockResult();

      collector.recordParse(result, 50, 'claude', false);
      collector.reset();

      const metrics = collector.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.parsingTime.avg).toBe(0);
    });
  });

  describe('auto-reset', () => {
    it('resets after configured number of requests', () => {
      const autoResetCollector = new PerformanceCollector({
        autoResetAfter: 5,
      });

      const result = createMockResult();

      for (let i = 0; i < 6; i++) {
        autoResetCollector.recordParse(result, 50, 'claude', false);
      }

      const metrics = autoResetCollector.getMetrics();
      expect(metrics.totalRequests).toBe(1); // Reset after 5
    });
  });
});

// =============================================================================
// CachedParser Tests
// =============================================================================

describe('CachedParser', () => {
  let mockParser: { parse: (raw: string, ctx?: any) => Promise<ParsingResult> };
  let parseCallCount: number;

  beforeEach(() => {
    parseCallCount = 0;
    mockParser = {
      parse: async (_raw: string) => {
        parseCallCount++;
        return {
          success: true,
          toolCalls: [{ id: '1', tool: 'test', parameters: {}, confidence: 1, sourceFormat: 'unknown' as const, rawData: null, metadata: { model: 'test', timestamp: new Date(), parsingMethod: 'test', sourceFormat: 'unknown' as const, extractionMethod: 'ast_balanced' as const } }],
          metadata: {
            parsingTime: 10,
            extractionMethod: 'ast_balanced' as const,
            format: 'custom_structured' as const,
            confidence: 0.9,
            coercions: {},
            warnings: [],
            rawOutputSnippet: '...',
          },
        };
      },
    };
  });

  it('caches successful results', async () => {
    const cachedParser = new CachedParser(mockParser);

    await cachedParser.parse('{"tool": "test"}', { modelType: 'claude' });
    await cachedParser.parse('{"tool": "test"}', { modelType: 'claude' });

    expect(parseCallCount).toBe(1);
  });

  it('returns cached result on hit', async () => {
    const cachedParser = new CachedParser(mockParser);

    const result1 = await cachedParser.parse('{"tool": "test"}');
    const result2 = await cachedParser.parse('{"tool": "test"}');

    expect(result1).toEqual(result2);
  });

  it('collects metrics', async () => {
    const cachedParser = new CachedParser(mockParser);

    await cachedParser.parse('{"tool": "test1"}');
    await cachedParser.parse('{"tool": "test2"}');
    await cachedParser.parse('{"tool": "test1"}'); // Cache hit

    const metrics = cachedParser.getMetrics();
    expect(metrics.totalRequests).toBe(3);
    expect(metrics.cacheEfficiency.hitRate).toBeGreaterThan(0);
  });

  it('provides cache statistics', async () => {
    const cachedParser = new CachedParser(mockParser);

    await cachedParser.parse('{"tool": "test"}');
    await cachedParser.parse('{"tool": "test"}');

    const stats = cachedParser.getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('can disable caching', async () => {
    const cachedParser = new CachedParser(mockParser, { enableCache: false });

    await cachedParser.parse('{"tool": "test"}');
    await cachedParser.parse('{"tool": "test"}');

    expect(parseCallCount).toBe(2);
  });

  it('can clear cache', async () => {
    const cachedParser = new CachedParser(mockParser);

    await cachedParser.parse('{"tool": "test"}');
    cachedParser.clearCache();
    await cachedParser.parse('{"tool": "test"}');

    expect(parseCallCount).toBe(2);
  });
});

// =============================================================================
// Convenience Function Tests
// =============================================================================

describe('Convenience Functions', () => {
  describe('createCache', () => {
    it('creates cache with default config', () => {
      const cache = createCache();
      expect(cache).toBeInstanceOf(LRUParserCache);
    });

    it('creates cache with custom config', () => {
      const cache = createCache({ maxSize: 50, ttlMs: 1000 });
      expect(cache).toBeInstanceOf(LRUParserCache);
    });
  });

  describe('createMetricsCollector', () => {
    it('creates collector with default config', () => {
      const collector = createMetricsCollector();
      expect(collector).toBeInstanceOf(PerformanceCollector);
    });

    it('creates collector with custom config', () => {
      const collector = createMetricsCollector({ maxSamples: 500 });
      expect(collector).toBeInstanceOf(PerformanceCollector);
    });
  });

  describe('withCaching', () => {
    it('wraps parser with caching', async () => {
      let callCount = 0;
      const parser = {
        parse: async () => {
          callCount++;
          return createMockResult();
        },
      };

      const cached = withCaching(parser);
      await cached.parse('test');
      await cached.parse('test');

      expect(callCount).toBe(1);
    });
  });
});
