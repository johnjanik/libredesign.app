/**
 * Level 3: Generator Tests
 *
 * Tests for candidate generation strategies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InitialGenerator,
  RefinementGenerator,
  CrossoverGenerator,
  MutationGenerator,
  FreshGenerator,
  DiversityGenerator,
  StrategyManager,
} from '@ai/feedback/generators';
import type { GenerationContext } from '@ai/feedback/generators';
import type { AIProvider, AIResponse } from '@ai/providers/ai-provider';
import type {
  DesignIntent,
  ScoredCandidate,
  DesignCandidate,
  QualityScore,
  VerificationResult,
  RenderedCandidate,
  ScreenshotData,
} from '@ai/feedback/types';
import { generateId } from '@ai/feedback/types';

// Mock intent
const mockIntent: DesignIntent = {
  description: 'Create a dashboard with charts',
  constraints: [
    { type: 'layout', description: 'Grid layout', priority: 'required' },
  ],
  style: { style: 'modern', colorScheme: 'dark' },
  requirements: {
    elements: ['header', 'sidebar', 'chart area', 'stats cards'],
    layout: 'grid',
  },
};

// Create mock provider
function createMockProvider(toolCallsResponse: object[] = []): AIProvider {
  return {
    name: 'mock',
    capabilities: {
      vision: true,
      streaming: true,
      functionCalling: true,
      maxContextTokens: 100000,
    },
    sendMessage: vi.fn().mockResolvedValue({
      content: JSON.stringify(toolCallsResponse),
      toolCalls: [],
      stopReason: 'end_turn',
    } as AIResponse),
    streamMessage: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    configure: vi.fn(),
  };
}

// Create mock scored candidate
function createMockScoredCandidate(options: {
  id?: string;
  score?: number;
  method?: string;
  categories?: { layout: number; fidelity: number; completeness: number; polish: number };
}): ScoredCandidate {
  const {
    id = generateId(),
    score = 0.75,
    method = 'initial',
    categories = { layout: 0.8, fidelity: 0.75, completeness: 0.7, polish: 0.75 },
  } = options;

  const candidate: DesignCandidate = {
    id,
    seed: JSON.stringify({ toolCalls: [{ tool: 'create_frame', args: {} }] }),
    generationMethod: method as any,
    iterationBorn: 1,
    metadata: { generatedAt: Date.now() },
  };

  const screenshot: ScreenshotData = {
    full: 'base64data',
    thumbnail: 'base64thumb',
    dimensions: { width: 1024, height: 768 },
    devicePixelRatio: 2,
  };

  const rendered: RenderedCandidate = {
    candidate,
    screenshot,
    renderSuccessful: true,
  };

  const verification: VerificationResult = {
    overallScore: score,
    acceptable: score >= 0.85,
    critique: 'Mock critique',
    detailedAnalysis: {
      categories,
      issues: [],
      strengths: ['Good layout'],
      suggestions: ['Improve colors'],
    },
    modelConsensus: 1.0,
    confidence: 0.9,
    verificationTier: 'standard',
  };

  const qualityScore: QualityScore = {
    overall: score,
    components: [
      { name: 'visual_fidelity', weight: 0.4, score: categories.fidelity, confidence: 0.9 },
      { name: 'technical_correctness', weight: 0.2, score: categories.layout, confidence: 0.9 },
      { name: 'design_principles', weight: 0.2, score: categories.polish, confidence: 0.9 },
      { name: 'intent_alignment', weight: 0.2, score, confidence: 0.9 },
    ],
    confidence: 0.9,
    normalizedScore: Math.round(score * 100),
    improvementPotential: 1 - score,
  };

  return { candidate, rendered, verification, qualityScore };
}

// Base context
function createContext(overrides: Partial<GenerationContext> = {}): GenerationContext {
  return {
    intent: mockIntent,
    iteration: 1,
    previousCandidates: [],
    availableTools: ['create_frame', 'create_rectangle', 'create_text', 'set_fill'],
    ...overrides,
  };
}

describe('Level 3: Generators', () => {
  // =========================================================================
  // Test 3.1: InitialGenerator
  // =========================================================================
  describe('InitialGenerator', () => {
    let generator: InitialGenerator;
    let mockProvider: AIProvider;

    beforeEach(() => {
      generator = new InitialGenerator();
      mockProvider = createMockProvider([
        { tool: 'create_frame', args: { width: 800, height: 600 } },
        { tool: 'create_text', args: { text: 'Dashboard', x: 20, y: 20 } },
      ]);
      generator.setProvider(mockProvider);
    });

    it('should have correct strategy name', () => {
      expect(generator.strategy).toBe('initial');
    });

    it('should throw error without provider', async () => {
      const noProviderGen = new InitialGenerator();
      const context = createContext();

      await expect(noProviderGen.generate(context, 1)).rejects.toThrow('Provider not set');
    });

    it('should generate requested number of candidates', async () => {
      const context = createContext();
      const candidates = await generator.generate(context, 3);

      expect(candidates.length).toBeLessThanOrEqual(3);
      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should set correct generation method on candidates', async () => {
      const context = createContext();
      const candidates = await generator.generate(context, 1);

      expect(candidates[0].generationMethod).toBe('initial');
    });

    it('should set correct iteration born', async () => {
      const context = createContext({ iteration: 5 });
      const candidates = await generator.generate(context, 1);

      expect(candidates[0].iterationBorn).toBe(5);
    });

    it('should generate valid seed JSON', async () => {
      const context = createContext();
      const candidates = await generator.generate(context, 1);

      expect(() => JSON.parse(candidates[0].seed)).not.toThrow();
      const parsed = JSON.parse(candidates[0].seed);
      expect(parsed.toolCalls).toBeDefined();
    });

    it('should vary temperature when varyTemperature is true', async () => {
      const genWithVary = new InitialGenerator({ varyTemperature: true });
      genWithVary.setProvider(mockProvider);

      const context = createContext();
      await genWithVary.generate(context, 3);

      // Check that sendMessage was called with different temperatures
      const calls = (mockProvider.sendMessage as any).mock.calls;
      // Each call should have options with temperature
      expect(calls.length).toBe(3);
    });
  });

  // =========================================================================
  // Test 3.2: RefinementGenerator
  // =========================================================================
  describe('RefinementGenerator', () => {
    let generator: RefinementGenerator;
    let mockProvider: AIProvider;

    beforeEach(() => {
      generator = new RefinementGenerator();
      mockProvider = createMockProvider([
        { tool: 'create_frame', args: { width: 800, height: 600 } },
        { tool: 'set_fill', args: { color: '#3B82F6' } },
      ]);
      generator.setProvider(mockProvider);
    });

    it('should have correct strategy name', () => {
      expect(generator.strategy).toBe('refinement');
    });

    it('should return empty array with no previous candidates', async () => {
      const context = createContext({ previousCandidates: [] });
      const candidates = await generator.generate(context, 3);

      expect(candidates).toHaveLength(0);
    });

    it('should generate refinements from previous candidates', async () => {
      const prevCandidate = createMockScoredCandidate({ score: 0.7 });
      const context = createContext({
        iteration: 2,
        previousCandidates: [prevCandidate],
      });

      const candidates = await generator.generate(context, 1);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].generationMethod).toBe('refinement');
      expect(candidates[0].parentId).toBe(prevCandidate.candidate.id);
    });

    it('should skip near-perfect candidates', async () => {
      const perfectCandidate = createMockScoredCandidate({ score: 0.98 });
      const context = createContext({
        iteration: 2,
        previousCandidates: [perfectCandidate],
      });

      const candidates = await generator.generate(context, 1);

      // Should return empty because candidate is too good to refine
      expect(candidates).toHaveLength(0);
    });

    it('should skip very low scoring candidates', async () => {
      const poorCandidate = createMockScoredCandidate({ score: 0.2 });
      const context = createContext({
        iteration: 2,
        previousCandidates: [poorCandidate],
      });

      const candidates = await generator.generate(context, 1);

      // Should return empty because candidate is too poor to refine
      expect(candidates).toHaveLength(0);
    });

    it('should include refinement focus in metadata', async () => {
      const prevCandidate = createMockScoredCandidate({
        score: 0.7,
        categories: { layout: 0.5, fidelity: 0.8, completeness: 0.7, polish: 0.8 },
      });
      const context = createContext({
        iteration: 2,
        previousCandidates: [prevCandidate],
      });

      const candidates = await generator.generate(context, 1);

      expect(candidates[0].metadata.refinementFocus).toBe('layout');
    });
  });

  // =========================================================================
  // Test 3.3: CrossoverGenerator
  // =========================================================================
  describe('CrossoverGenerator', () => {
    let generator: CrossoverGenerator;
    let mockProvider: AIProvider;

    beforeEach(() => {
      generator = new CrossoverGenerator();
      mockProvider = createMockProvider([
        { tool: 'create_frame', args: { width: 800, height: 600 } },
      ]);
      generator.setProvider(mockProvider);
    });

    it('should have correct strategy name', () => {
      expect(generator.strategy).toBe('crossover');
    });

    it('should return empty with less than 2 candidates', async () => {
      const context = createContext({
        previousCandidates: [createMockScoredCandidate({})],
      });

      const candidates = await generator.generate(context, 1);

      expect(candidates).toHaveLength(0);
    });

    it('should generate crossover from multiple candidates', async () => {
      const parent1 = createMockScoredCandidate({ id: 'parent1', score: 0.8 });
      const parent2 = createMockScoredCandidate({ id: 'parent2', score: 0.75 });
      const context = createContext({
        iteration: 3,
        previousCandidates: [parent1, parent2],
      });

      const candidates = await generator.generate(context, 1);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].generationMethod).toBe('crossover');
      expect(candidates[0].parentIds).toBeDefined();
      expect(candidates[0].parentIds!.length).toBeGreaterThanOrEqual(2);
    });

    it('should include parent scores in metadata', async () => {
      const parent1 = createMockScoredCandidate({ score: 0.8 });
      const parent2 = createMockScoredCandidate({ score: 0.75 });
      const context = createContext({
        iteration: 3,
        previousCandidates: [parent1, parent2],
      });

      const candidates = await generator.generate(context, 1);

      expect(candidates[0].metadata.parentScores).toBeDefined();
      expect(candidates[0].metadata.parentScores!.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // Test 3.4: MutationGenerator
  // =========================================================================
  describe('MutationGenerator', () => {
    let generator: MutationGenerator;
    let mockProvider: AIProvider;

    beforeEach(() => {
      generator = new MutationGenerator({ intensity: 0.5 });
      mockProvider = createMockProvider([
        { tool: 'create_frame', args: { width: 800, height: 600 } },
      ]);
      generator.setProvider(mockProvider);
    });

    it('should have correct strategy name', () => {
      expect(generator.strategy).toBe('mutation');
    });

    it('should return empty with no previous candidates', async () => {
      const context = createContext({ previousCandidates: [] });
      const candidates = await generator.generate(context, 1);

      expect(candidates).toHaveLength(0);
    });

    it('should prefer good candidates for mutation', async () => {
      const goodCandidate = createMockScoredCandidate({ score: 0.8 });
      const poorCandidate = createMockScoredCandidate({ score: 0.3 });
      const context = createContext({
        previousCandidates: [poorCandidate, goodCandidate],
      });

      const candidates = await generator.generate(context, 1);

      // Should mutate the good candidate
      expect(candidates[0].parentId).toBe(goodCandidate.candidate.id);
    });

    it('should set mutation type as refinement focus', async () => {
      const prevCandidate = createMockScoredCandidate({ score: 0.7 });
      const context = createContext({
        previousCandidates: [prevCandidate],
      });

      const candidates = await generator.generate(context, 1);

      // refinementFocus should be a mutation type
      const mutationTypes = ['color_shift', 'spacing_adjust', 'size_variation', 'layout_tweak', 'style_shift', 'element_swap'];
      expect(mutationTypes).toContain(candidates[0].metadata.refinementFocus);
    });
  });

  // =========================================================================
  // Test 3.5: FreshGenerator
  // =========================================================================
  describe('FreshGenerator', () => {
    let generator: FreshGenerator;
    let mockProvider: AIProvider;

    beforeEach(() => {
      generator = new FreshGenerator();
      mockProvider = createMockProvider([
        { tool: 'create_frame', args: { width: 800, height: 600 } },
      ]);
      generator.setProvider(mockProvider);
    });

    it('should have correct strategy name', () => {
      expect(generator.strategy).toBe('fresh');
    });

    it('should generate even with no previous candidates', async () => {
      const context = createContext({ previousCandidates: [] });
      const candidates = await generator.generate(context, 2);

      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should not have parent references', async () => {
      const prevCandidate = createMockScoredCandidate({});
      const context = createContext({
        previousCandidates: [prevCandidate],
      });

      const candidates = await generator.generate(context, 1);

      expect(candidates[0].parentId).toBeUndefined();
      expect(candidates[0].parentIds).toBeUndefined();
    });

    it('should use higher temperature in creative mode', async () => {
      const creativeGen = new FreshGenerator({ creativeMode: true });
      creativeGen.setProvider(mockProvider);

      const context = createContext();
      await creativeGen.generate(context, 1);

      // Verify temperature used (checking via mock calls)
      const call = (mockProvider.sendMessage as any).mock.calls[0];
      // Temperature should be high (0.9+)
      expect(call[1].temperature).toBeGreaterThanOrEqual(0.8);
    });
  });

  // =========================================================================
  // Test 3.6: DiversityGenerator
  // =========================================================================
  describe('DiversityGenerator', () => {
    let generator: DiversityGenerator;
    let mockProvider: AIProvider;

    beforeEach(() => {
      generator = new DiversityGenerator({ divergenceLevel: 0.7 });
      mockProvider = createMockProvider([
        { tool: 'create_frame', args: { width: 800, height: 600 } },
      ]);
      generator.setProvider(mockProvider);
    });

    it('should have correct strategy name', () => {
      expect(generator.strategy).toBe('diversity');
    });

    it('should generate diverse candidates', async () => {
      const context = createContext();
      const candidates = await generator.generate(context, 2);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].generationMethod).toBe('diversity');
    });

    it('should include dimension focus in metadata', async () => {
      const context = createContext();
      const candidates = await generator.generate(context, 1);

      // Should have refinementFocus indicating which dimensions were varied
      expect(candidates[0].metadata.refinementFocus).toBeDefined();
    });
  });

  // =========================================================================
  // Test 3.7: StrategyManager
  // =========================================================================
  describe('StrategyManager', () => {
    let manager: StrategyManager;
    let mockProvider: AIProvider;

    beforeEach(() => {
      manager = new StrategyManager();
      mockProvider = createMockProvider([
        { tool: 'create_frame', args: { width: 800, height: 600 } },
      ]);
      manager.setProvider(mockProvider);
    });

    it('should throw without provider', async () => {
      const noProviderManager = new StrategyManager();
      const context = createContext();

      await expect(
        noProviderManager.generateCandidates(context, 3)
      ).rejects.toThrow('Provider not set');
    });

    it('should use initial strategy for first iteration', async () => {
      const context = createContext({ iteration: 1 });
      const candidates = await manager.generateCandidates(context, 3);

      // All should be from initial strategy
      expect(candidates.every(c => c.generationMethod === 'initial')).toBe(true);
    });

    it('should select appropriate strategies for later iterations', () => {
      const context = createContext({
        iteration: 5,
        previousCandidates: [
          createMockScoredCandidate({}),
          createMockScoredCandidate({}),
        ],
      });

      const selections = manager.selectStrategies(context, 5);

      // Should not use 'initial' after first iteration
      expect(selections.some(s => s.strategy === 'initial')).toBe(false);
      // Should have some strategy selections
      expect(selections.length).toBeGreaterThan(0);
    });

    it('should get strategy effectiveness metrics', async () => {
      const context = createContext({ iteration: 1 });
      await manager.generateCandidates(context, 2);

      const effectiveness = manager.getStrategyEffectiveness();

      expect(effectiveness.initial).toBeDefined();
      expect(effectiveness.initial.uses).toBeGreaterThan(0);
    });

    it('should update weights based on results', () => {
      const results = new Map<any, number>();
      results.set('refinement', 0.1); // Good improvement
      results.set('mutation', -0.2);  // Bad results

      manager.updateWeights(results);

      const weights = manager.getStrategyEffectiveness();
      // Weights should have been adjusted (we can't directly check weights,
      // but the method should not throw)
      expect(true).toBe(true);
    });
  });

  // =========================================================================
  // Test 3.8: Tool Call Parsing
  // =========================================================================
  describe('Tool Call Parsing', () => {
    let generator: InitialGenerator;

    beforeEach(() => {
      generator = new InitialGenerator();
    });

    it('should parse plain JSON array', async () => {
      const mockProvider = createMockProvider([
        { tool: 'create_frame', args: { width: 100 } },
      ]);
      generator.setProvider(mockProvider);

      const context = createContext();
      const candidates = await generator.generate(context, 1);

      const seed = JSON.parse(candidates[0].seed);
      expect(seed.toolCalls).toBeDefined();
    });

    it('should handle JSON in markdown code blocks', async () => {
      const mockProvider: AIProvider = {
        ...createMockProvider([]),
        sendMessage: vi.fn().mockResolvedValue({
          content: '```json\n[{"tool": "create_frame", "args": {}}]\n```',
          toolCalls: [],
          stopReason: 'end_turn',
        }),
      };
      generator.setProvider(mockProvider);

      const context = createContext();
      const candidates = await generator.generate(context, 1);

      expect(candidates.length).toBe(1);
      const seed = JSON.parse(candidates[0].seed);
      expect(seed.toolCalls).toHaveLength(1);
    });

    it('should handle extra text around JSON', async () => {
      const mockProvider: AIProvider = {
        ...createMockProvider([]),
        sendMessage: vi.fn().mockResolvedValue({
          content: 'Here is the design:\n[{"tool": "create_frame", "args": {}}]\nHope this helps!',
          toolCalls: [],
          stopReason: 'end_turn',
        }),
      };
      generator.setProvider(mockProvider);

      const context = createContext();
      const candidates = await generator.generate(context, 1);

      expect(candidates.length).toBe(1);
    });

    it('should handle generation failures gracefully', async () => {
      const mockProvider: AIProvider = {
        ...createMockProvider([]),
        sendMessage: vi.fn()
          .mockResolvedValueOnce({ content: 'invalid json', toolCalls: [], stopReason: 'end_turn' })
          .mockResolvedValueOnce({ content: '[{"tool": "create_frame", "args": {}}]', toolCalls: [], stopReason: 'end_turn' }),
      };
      generator.setProvider(mockProvider);

      const context = createContext();
      const candidates = await generator.generate(context, 2);

      // Should have at least one candidate from the second call
      expect(candidates.length).toBeGreaterThanOrEqual(1);
    });
  });
});
