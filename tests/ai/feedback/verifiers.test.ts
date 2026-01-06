/**
 * Level 2: Verifier Tests
 *
 * Tests for verification components: base verifier, individual verifiers,
 * tiered verification, and score fusion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ClaudeVerifier,
  OpenAIVerifier,
  OllamaVerifier,
  TieredVerifier,
  OLLAMA_VISION_MODELS,
} from '@ai/feedback/verifiers';
import type { VerificationRequest } from '@ai/feedback/verifiers';
import type { AIProvider, AIResponse, AICapabilities } from '@ai/providers/ai-provider';
import type { DesignIntent, ScreenshotData, VerificationConfig } from '@ai/feedback/types';

// Mock screenshot data
const mockScreenshot: ScreenshotData = {
  full: 'base64encodedimagedata',
  thumbnail: 'base64thumbnaildata',
  dimensions: { width: 1024, height: 768 },
  devicePixelRatio: 2,
};

// Mock design intent
const mockIntent: DesignIntent = {
  description: 'Create a simple login form',
  constraints: [
    { type: 'size', description: 'Max width 400px', priority: 'required' },
  ],
  style: {
    colorScheme: 'light',
    primaryColor: '#3B82F6',
  },
};

// Mock verification request
const mockRequest: VerificationRequest = {
  intent: mockIntent,
  screenshot: mockScreenshot,
};

// Create a mock AI provider
function createMockProvider(options: {
  connected?: boolean;
  vision?: boolean;
  response?: string;
}): AIProvider {
  const { connected = true, vision = true, response = '{"score": 0.85}' } = options;

  return {
    name: 'mock',
    capabilities: {
      vision,
      streaming: true,
      functionCalling: true,
      maxContextTokens: 100000,
    } as AICapabilities,
    sendMessage: vi.fn().mockResolvedValue({
      content: response,
      toolCalls: [],
      stopReason: 'end_turn',
    } as AIResponse),
    streamMessage: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(connected),
    configure: vi.fn(),
  };
}

describe('Level 2: Verifiers', () => {
  // =========================================================================
  // Test 2.1: ClaudeVerifier
  // =========================================================================
  describe('ClaudeVerifier', () => {
    let verifier: ClaudeVerifier;

    beforeEach(() => {
      verifier = new ClaudeVerifier();
    });

    it('should have correct name', () => {
      expect(verifier.name).toBe('claude');
    });

    it('should report unavailable when no provider set', async () => {
      const available = await verifier.isAvailable();
      expect(available).toBe(false);
    });

    it('should report available when provider is connected with vision', async () => {
      const mockProvider = createMockProvider({ connected: true, vision: true });
      verifier.setProvider(mockProvider);

      const available = await verifier.isAvailable();
      expect(available).toBe(true);
    });

    it('should report unavailable when provider lacks vision', async () => {
      const mockProvider = createMockProvider({ connected: true, vision: false });
      verifier.setProvider(mockProvider);

      const available = await verifier.isAvailable();
      expect(available).toBe(false);
    });

    it('should throw error when verifying without provider', async () => {
      await expect(verifier.verify(mockRequest)).rejects.toThrow('provider not set');
    });

    it('should parse valid JSON response', async () => {
      const mockProvider = createMockProvider({
        response: JSON.stringify({
          score: 0.85,
          confidence: 0.9,
          categories: {
            layout: 0.9,
            fidelity: 0.85,
            completeness: 0.8,
            polish: 0.75,
          },
          critique: 'Good design overall',
        }),
      });
      verifier.setProvider(mockProvider);

      const result = await verifier.verify(mockRequest);

      expect(result.score).toBeCloseTo(0.85);
      expect(result.confidence).toBeCloseTo(0.9);
      expect(result.categories.layout).toBeCloseTo(0.9);
    });

    it('should handle JSON in markdown code blocks', async () => {
      const mockProvider = createMockProvider({
        response: '```json\n{"score": 0.75, "confidence": 0.8, "categories": {"layout": 0.8, "fidelity": 0.7, "completeness": 0.75, "polish": 0.7}, "critique": "Test"}\n```',
      });
      verifier.setProvider(mockProvider);

      const result = await verifier.verify(mockRequest);

      expect(result.score).toBeCloseTo(0.75);
    });

    it('should use fallback parsing for non-JSON response', async () => {
      const mockProvider = createMockProvider({
        response: 'The design scores 8/10 overall. Good layout but needs polish.',
      });
      verifier.setProvider(mockProvider);

      const result = await verifier.verify(mockRequest);

      expect(result.score).toBeCloseTo(0.8);
      expect(result.confidence).toBe(0.5); // Lower confidence for fallback
    });

    it('should configure options correctly', () => {
      verifier.configure({ timeout: 60000, temperature: 0.5 });
      // Configuration is internal, but verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  // =========================================================================
  // Test 2.2: OpenAIVerifier
  // =========================================================================
  describe('OpenAIVerifier', () => {
    let verifier: OpenAIVerifier;

    beforeEach(() => {
      verifier = new OpenAIVerifier();
    });

    it('should have correct name', () => {
      expect(verifier.name).toBe('openai');
    });

    it('should report unavailable when no provider set', async () => {
      const available = await verifier.isAvailable();
      expect(available).toBe(false);
    });

    it('should verify with valid provider', async () => {
      const mockProvider = createMockProvider({
        response: '{"score": 0.9, "confidence": 0.95, "categories": {"layout": 0.95, "fidelity": 0.9, "completeness": 0.85, "polish": 0.9}, "critique": "Excellent"}',
      });
      verifier.setProvider(mockProvider);

      const result = await verifier.verify(mockRequest);

      expect(result.score).toBeCloseTo(0.9);
      expect(mockProvider.sendMessage).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Test 2.3: OllamaVerifier
  // =========================================================================
  describe('OllamaVerifier', () => {
    let verifier: OllamaVerifier;

    beforeEach(() => {
      verifier = new OllamaVerifier();
    });

    it('should have correct name', () => {
      expect(verifier.name).toBe('ollama');
    });

    it('should have recommended vision models', () => {
      expect(OLLAMA_VISION_MODELS).toContain('llava');
      expect(OLLAMA_VISION_MODELS).toContain('llama3.2-vision');
      expect(OLLAMA_VISION_MODELS.length).toBeGreaterThan(0);
    });

    it('should get recommended models statically', () => {
      const models = OllamaVerifier.getRecommendedModels();
      expect(models).toEqual(OLLAMA_VISION_MODELS);
    });
  });

  // =========================================================================
  // Test 2.4: TieredVerifier - Standard Tier
  // =========================================================================
  describe('TieredVerifier - Standard Tier', () => {
    let tieredVerifier: TieredVerifier;

    beforeEach(() => {
      tieredVerifier = new TieredVerifier();
    });

    it('should have default verifiers registered', () => {
      expect(tieredVerifier.getVerifier('claude')).toBeDefined();
      expect(tieredVerifier.getVerifier('openai')).toBeDefined();
      expect(tieredVerifier.getVerifier('ollama')).toBeDefined();
    });

    it('should report no available verifiers without providers', async () => {
      const available = await tieredVerifier.getAvailableVerifiers();
      expect(available).toHaveLength(0);
    });

    it('should verify using standard tier', async () => {
      // Set up mock provider for claude
      const claudeVerifier = tieredVerifier.getVerifier('claude') as ClaudeVerifier;
      const mockProvider = createMockProvider({
        response: '{"score": 0.88, "confidence": 0.9, "categories": {"layout": 0.9, "fidelity": 0.85, "completeness": 0.9, "polish": 0.85}, "critique": "Good"}',
      });
      claudeVerifier.setProvider(mockProvider);

      const config: VerificationConfig = {
        tier: 'standard',
        primaryModel: 'claude',
      };

      const result = await tieredVerifier.verify(mockIntent, mockScreenshot, config);

      expect(result.overallScore).toBeCloseTo(0.88);
      expect(result.verificationTier).toBe('standard');
      expect(result.modelConsensus).toBe(1.0); // Single model = perfect consensus
    });

    it('should set acceptance threshold', () => {
      tieredVerifier.setAcceptanceThreshold(0.9);
      expect(tieredVerifier.getAcceptanceThreshold()).toBe(0.9);
    });

    it('should clamp acceptance threshold to valid range', () => {
      tieredVerifier.setAcceptanceThreshold(1.5);
      expect(tieredVerifier.getAcceptanceThreshold()).toBe(1.0);

      tieredVerifier.setAcceptanceThreshold(-0.5);
      expect(tieredVerifier.getAcceptanceThreshold()).toBe(0);
    });
  });

  // =========================================================================
  // Test 2.5: TieredVerifier - Advanced Tier
  // =========================================================================
  describe('TieredVerifier - Advanced Tier', () => {
    let tieredVerifier: TieredVerifier;

    beforeEach(() => {
      tieredVerifier = new TieredVerifier();

      // Set up mock providers
      const claudeVerifier = tieredVerifier.getVerifier('claude') as ClaudeVerifier;
      const openaiVerifier = tieredVerifier.getVerifier('openai') as OpenAIVerifier;

      claudeVerifier.setProvider(createMockProvider({
        response: '{"score": 0.85, "confidence": 0.9, "categories": {"layout": 0.9, "fidelity": 0.85, "completeness": 0.8, "polish": 0.85}, "critique": "Claude says good"}',
      }));

      openaiVerifier.setProvider(createMockProvider({
        response: '{"score": 0.90, "confidence": 0.95, "categories": {"layout": 0.95, "fidelity": 0.9, "completeness": 0.85, "polish": 0.9}, "critique": "OpenAI says excellent"}',
      }));
    });

    it('should verify using advanced tier with multiple models', async () => {
      const config: VerificationConfig = {
        tier: 'advanced',
        advancedConfig: {
          models: [
            { name: 'claude', weight: 0.6, enabled: true },
            { name: 'openai', weight: 0.4, enabled: true },
          ],
          consensusThreshold: 0.7,
        },
      };

      const result = await tieredVerifier.verify(mockIntent, mockScreenshot, config);

      expect(result.verificationTier).toBe('advanced');
      expect(result.modelBreakdown).toBeDefined();
      expect(result.modelBreakdown).toHaveLength(2);

      // Check weighted average
      // Expected: 0.85 * 0.6 + 0.90 * 0.4 = 0.51 + 0.36 = 0.87
      expect(result.overallScore).toBeCloseTo(0.87, 1);
    });

    it('should calculate consensus between models', async () => {
      const config: VerificationConfig = {
        tier: 'advanced',
        advancedConfig: {
          models: [
            { name: 'claude', weight: 0.5, enabled: true },
            { name: 'openai', weight: 0.5, enabled: true },
          ],
          consensusThreshold: 0.7,
        },
      };

      const result = await tieredVerifier.verify(mockIntent, mockScreenshot, config);

      // Scores are 0.85 and 0.90, fairly close = high consensus
      expect(result.modelConsensus).toBeGreaterThan(0.8);
    });

    it('should throw error when no models enabled', async () => {
      const config: VerificationConfig = {
        tier: 'advanced',
        advancedConfig: {
          models: [
            { name: 'claude', weight: 0.5, enabled: false },
            { name: 'openai', weight: 0.5, enabled: false },
          ],
          consensusThreshold: 0.7,
        },
      };

      await expect(
        tieredVerifier.verify(mockIntent, mockScreenshot, config)
      ).rejects.toThrow('No models enabled');
    });

    it('should throw error when advancedConfig missing', async () => {
      const config: VerificationConfig = {
        tier: 'advanced',
        // Missing advancedConfig
      };

      await expect(
        tieredVerifier.verify(mockIntent, mockScreenshot, config)
      ).rejects.toThrow('advancedConfig');
    });
  });

  // =========================================================================
  // Test 2.6: Score Fusion
  // =========================================================================
  describe('Score Fusion', () => {
    let tieredVerifier: TieredVerifier;

    beforeEach(() => {
      tieredVerifier = new TieredVerifier();
    });

    it('should handle single model correctly', async () => {
      const claudeVerifier = tieredVerifier.getVerifier('claude') as ClaudeVerifier;
      claudeVerifier.setProvider(createMockProvider({
        response: '{"score": 0.75, "confidence": 0.8, "categories": {"layout": 0.8, "fidelity": 0.75, "completeness": 0.7, "polish": 0.75}, "critique": "Decent"}',
      }));

      const config: VerificationConfig = {
        tier: 'advanced',
        advancedConfig: {
          models: [{ name: 'claude', weight: 1.0, enabled: true }],
          consensusThreshold: 0.5,
        },
      };

      const result = await tieredVerifier.verify(mockIntent, mockScreenshot, config);

      expect(result.overallScore).toBeCloseTo(0.75);
      expect(result.modelConsensus).toBe(1.0); // Single model
    });

    it('should respect model weights in fusion', async () => {
      const claudeVerifier = tieredVerifier.getVerifier('claude') as ClaudeVerifier;
      const openaiVerifier = tieredVerifier.getVerifier('openai') as OpenAIVerifier;

      // Claude scores 0.6, OpenAI scores 1.0
      claudeVerifier.setProvider(createMockProvider({
        response: '{"score": 0.6, "confidence": 0.9, "categories": {"layout": 0.6, "fidelity": 0.6, "completeness": 0.6, "polish": 0.6}, "critique": "Low"}',
      }));

      openaiVerifier.setProvider(createMockProvider({
        response: '{"score": 1.0, "confidence": 0.9, "categories": {"layout": 1.0, "fidelity": 1.0, "completeness": 1.0, "polish": 1.0}, "critique": "Perfect"}',
      }));

      // Weight Claude heavily (0.8) vs OpenAI (0.2)
      const config: VerificationConfig = {
        tier: 'advanced',
        advancedConfig: {
          models: [
            { name: 'claude', weight: 0.8, enabled: true },
            { name: 'openai', weight: 0.2, enabled: true },
          ],
          consensusThreshold: 0.5,
        },
      };

      const result = await tieredVerifier.verify(mockIntent, mockScreenshot, config);

      // Expected: 0.6 * 0.8 + 1.0 * 0.2 = 0.48 + 0.2 = 0.68
      expect(result.overallScore).toBeCloseTo(0.68, 1);
    });
  });

  // =========================================================================
  // Test 2.7: Verification Response Parsing
  // =========================================================================
  describe('Verification Response Parsing', () => {
    let verifier: ClaudeVerifier;

    beforeEach(() => {
      verifier = new ClaudeVerifier();
    });

    it('should clamp scores to 0-1 range', async () => {
      const mockProvider = createMockProvider({
        response: '{"score": 1.5, "confidence": -0.2, "categories": {"layout": 2.0, "fidelity": -0.5, "completeness": 0.8, "polish": 0.9}, "critique": "Out of range"}',
      });
      verifier.setProvider(mockProvider);

      const result = await verifier.verify(mockRequest);

      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.categories.layout).toBeLessThanOrEqual(1);
      expect(result.categories.fidelity).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing categories gracefully', async () => {
      const mockProvider = createMockProvider({
        response: '{"score": 0.8, "confidence": 0.9, "categories": {"layout": 0.85}, "critique": "Partial categories"}',
      });
      verifier.setProvider(mockProvider);

      const result = await verifier.verify(mockRequest);

      expect(result.score).toBeCloseTo(0.8);
      expect(result.categories.layout).toBeCloseTo(0.85);
      // Missing categories should default to 0.5
      expect(result.categories.fidelity).toBeDefined();
    });

    it('should extract score from "X/10" format', async () => {
      const mockProvider = createMockProvider({
        response: 'I would rate this design 7/10. The layout is good but needs improvement.',
      });
      verifier.setProvider(mockProvider);

      const result = await verifier.verify(mockRequest);

      expect(result.score).toBeCloseTo(0.7);
    });

    it('should handle API errors gracefully', async () => {
      const mockProvider = createMockProvider({ connected: true, vision: true });
      mockProvider.sendMessage = vi.fn().mockRejectedValue(new Error('API Error'));
      verifier.setProvider(mockProvider);

      const result = await verifier.verify(mockRequest);

      expect(result.score).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.critique).toContain('failed');
    });
  });
});
