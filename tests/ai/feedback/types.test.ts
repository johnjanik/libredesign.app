/**
 * Level 1: Types and Utilities Tests
 *
 * Simple tests for type definitions, utility functions, and default values.
 */

import { describe, it, expect } from 'vitest';
import {
  generateId,
  DEFAULT_FEEDBACK_OPTIONS,
  DEFAULT_ADAPTIVE_CONFIG,
  DEFAULT_TEMPERATURE_SCHEDULE,
  QUALITY_COMPONENT_WEIGHTS,
} from '@ai/feedback/types';
import type {
  DesignIntent,
  DesignCandidate,
  VerificationConfig,
  QualityScore,
  FeedbackLoopOptions,
} from '@ai/feedback/types';

describe('Level 1: Types and Utilities', () => {
  // =========================================================================
  // Test 1.1: generateId()
  // =========================================================================
  describe('generateId()', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with expected format', () => {
      const id = generateId();

      // Format: timestamp_randomstring
      expect(id).toMatch(/^\d+_[a-z0-9]+$/);
    });

    it('should generate IDs of reasonable length', () => {
      const id = generateId();

      expect(id.length).toBeGreaterThan(10);
      expect(id.length).toBeLessThan(30);
    });
  });

  // =========================================================================
  // Test 1.2: DEFAULT_FEEDBACK_OPTIONS
  // =========================================================================
  describe('DEFAULT_FEEDBACK_OPTIONS', () => {
    it('should have all required properties', () => {
      expect(DEFAULT_FEEDBACK_OPTIONS.maxIterations).toBeDefined();
      expect(DEFAULT_FEEDBACK_OPTIONS.qualityThreshold).toBeDefined();
      expect(DEFAULT_FEEDBACK_OPTIONS.timeoutMs).toBeDefined();
      expect(DEFAULT_FEEDBACK_OPTIONS.enableEarlyStopping).toBeDefined();
      expect(DEFAULT_FEEDBACK_OPTIONS.candidatesPerIteration).toBeDefined();
      expect(DEFAULT_FEEDBACK_OPTIONS.verification).toBeDefined();
    });

    it('should have reasonable default values', () => {
      expect(DEFAULT_FEEDBACK_OPTIONS.maxIterations).toBe(10);
      expect(DEFAULT_FEEDBACK_OPTIONS.qualityThreshold).toBe(0.85);
      expect(DEFAULT_FEEDBACK_OPTIONS.timeoutMs).toBe(60000);
      expect(DEFAULT_FEEDBACK_OPTIONS.candidatesPerIteration).toBe(3);
    });

    it('should have valid verification config', () => {
      expect(DEFAULT_FEEDBACK_OPTIONS.verification.tier).toBe('standard');
      expect(DEFAULT_FEEDBACK_OPTIONS.verification.primaryModel).toBe('claude');
    });
  });

  // =========================================================================
  // Test 1.3: DEFAULT_ADAPTIVE_CONFIG
  // =========================================================================
  describe('DEFAULT_ADAPTIVE_CONFIG', () => {
    it('should have all required properties', () => {
      expect(DEFAULT_ADAPTIVE_CONFIG.explorationRate).toBeDefined();
      expect(DEFAULT_ADAPTIVE_CONFIG.temperature).toBeDefined();
      expect(DEFAULT_ADAPTIVE_CONFIG.minDiversity).toBeDefined();
      expect(DEFAULT_ADAPTIVE_CONFIG.verificationTimeout).toBeDefined();
      expect(DEFAULT_ADAPTIVE_CONFIG.preferLocal).toBeDefined();
    });

    it('should have values in valid ranges', () => {
      expect(DEFAULT_ADAPTIVE_CONFIG.explorationRate).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_ADAPTIVE_CONFIG.explorationRate).toBeLessThanOrEqual(1);

      expect(DEFAULT_ADAPTIVE_CONFIG.temperature).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_ADAPTIVE_CONFIG.temperature).toBeLessThanOrEqual(1);

      expect(DEFAULT_ADAPTIVE_CONFIG.minDiversity).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_ADAPTIVE_CONFIG.minDiversity).toBeLessThanOrEqual(1);
    });
  });

  // =========================================================================
  // Test 1.4: DEFAULT_TEMPERATURE_SCHEDULE
  // =========================================================================
  describe('DEFAULT_TEMPERATURE_SCHEDULE', () => {
    it('should have valid temperature bounds', () => {
      expect(DEFAULT_TEMPERATURE_SCHEDULE.initial).toBeDefined();
      expect(DEFAULT_TEMPERATURE_SCHEDULE.min).toBeDefined();
      expect(DEFAULT_TEMPERATURE_SCHEDULE.max).toBeDefined();
      expect(DEFAULT_TEMPERATURE_SCHEDULE.decayRate).toBeDefined();
    });

    it('should have min <= initial <= max', () => {
      expect(DEFAULT_TEMPERATURE_SCHEDULE.min).toBeLessThanOrEqual(DEFAULT_TEMPERATURE_SCHEDULE.initial);
      expect(DEFAULT_TEMPERATURE_SCHEDULE.initial).toBeLessThanOrEqual(DEFAULT_TEMPERATURE_SCHEDULE.max);
    });

    it('should have decay rate in valid range', () => {
      expect(DEFAULT_TEMPERATURE_SCHEDULE.decayRate).toBeGreaterThan(0);
      expect(DEFAULT_TEMPERATURE_SCHEDULE.decayRate).toBeLessThan(1);
    });
  });

  // =========================================================================
  // Test 1.5: QUALITY_COMPONENT_WEIGHTS
  // =========================================================================
  describe('QUALITY_COMPONENT_WEIGHTS', () => {
    it('should have all four components', () => {
      expect(QUALITY_COMPONENT_WEIGHTS.visual_fidelity).toBeDefined();
      expect(QUALITY_COMPONENT_WEIGHTS.technical_correctness).toBeDefined();
      expect(QUALITY_COMPONENT_WEIGHTS.design_principles).toBeDefined();
      expect(QUALITY_COMPONENT_WEIGHTS.intent_alignment).toBeDefined();
    });

    it('should have weights that sum to 1.0', () => {
      const sum =
        QUALITY_COMPONENT_WEIGHTS.visual_fidelity +
        QUALITY_COMPONENT_WEIGHTS.technical_correctness +
        QUALITY_COMPONENT_WEIGHTS.design_principles +
        QUALITY_COMPONENT_WEIGHTS.intent_alignment;

      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should have all positive weights', () => {
      expect(QUALITY_COMPONENT_WEIGHTS.visual_fidelity).toBeGreaterThan(0);
      expect(QUALITY_COMPONENT_WEIGHTS.technical_correctness).toBeGreaterThan(0);
      expect(QUALITY_COMPONENT_WEIGHTS.design_principles).toBeGreaterThan(0);
      expect(QUALITY_COMPONENT_WEIGHTS.intent_alignment).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Test 1.6: Type Structure Validation
  // =========================================================================
  describe('Type Structure Validation', () => {
    it('should create a valid DesignIntent', () => {
      const intent: DesignIntent = {
        description: 'Create a login form with email and password fields',
        constraints: [
          { type: 'size', description: 'Max width 400px', priority: 'required' },
        ],
        style: {
          colorScheme: 'light',
          primaryColor: '#3B82F6',
          style: 'modern',
          density: 'comfortable',
        },
        requirements: {
          elements: ['email input', 'password input', 'submit button'],
          layout: 'vertical',
        },
      };

      expect(intent.description).toBe('Create a login form with email and password fields');
      expect(intent.constraints).toHaveLength(1);
      expect(intent.style?.colorScheme).toBe('light');
    });

    it('should create a valid DesignCandidate', () => {
      const candidate: DesignCandidate = {
        id: generateId(),
        seed: JSON.stringify({ toolCalls: [] }),
        generationMethod: 'initial',
        iterationBorn: 1,
        metadata: {
          temperature: 0.7,
          generatedAt: Date.now(),
        },
      };

      expect(candidate.id).toBeDefined();
      expect(candidate.generationMethod).toBe('initial');
      expect(candidate.iterationBorn).toBe(1);
    });

    it('should create a valid VerificationConfig for standard tier', () => {
      const config: VerificationConfig = {
        tier: 'standard',
        primaryModel: 'claude',
      };

      expect(config.tier).toBe('standard');
      expect(config.primaryModel).toBe('claude');
    });

    it('should create a valid VerificationConfig for advanced tier', () => {
      const config: VerificationConfig = {
        tier: 'advanced',
        advancedConfig: {
          models: [
            { name: 'claude', weight: 0.5, enabled: true },
            { name: 'openai', weight: 0.3, enabled: true },
            { name: 'ollama', weight: 0.2, enabled: false },
          ],
          consensusThreshold: 0.7,
        },
      };

      expect(config.tier).toBe('advanced');
      expect(config.advancedConfig?.models).toHaveLength(3);
      expect(config.advancedConfig?.consensusThreshold).toBe(0.7);
    });

    it('should create a valid QualityScore', () => {
      const score: QualityScore = {
        overall: 0.85,
        components: [
          { name: 'visual_fidelity', weight: 0.4, score: 0.9, confidence: 0.8 },
          { name: 'technical_correctness', weight: 0.2, score: 0.8, confidence: 0.9 },
          { name: 'design_principles', weight: 0.2, score: 0.85, confidence: 0.85 },
          { name: 'intent_alignment', weight: 0.2, score: 0.8, confidence: 0.9 },
        ],
        confidence: 0.85,
        normalizedScore: 85,
        improvementPotential: 0.15,
      };

      expect(score.overall).toBe(0.85);
      expect(score.components).toHaveLength(4);
      expect(score.normalizedScore).toBe(85);
    });
  });
});
