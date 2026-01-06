/**
 * Initial Generator
 *
 * Generates initial design candidates from user intent.
 */

import type { AIMessage } from '@ai/providers/ai-provider';
import type { DesignCandidate, GenerationStrategy } from '../types';
import { BaseGenerator, type GenerationContext, type GeneratorConfig } from './base-generator';

/**
 * Initial generator configuration
 */
export interface InitialGeneratorConfig extends GeneratorConfig {
  /** Vary temperature across candidates for diversity */
  varyTemperature?: boolean;
}

/**
 * Initial Generator - creates designs from scratch based on intent
 */
export class InitialGenerator extends BaseGenerator {
  readonly strategy: GenerationStrategy = 'initial';
  private varyTemperature: boolean;

  constructor(config: InitialGeneratorConfig = {}) {
    super(config);
    this.varyTemperature = config.varyTemperature ?? true;
  }

  async generate(context: GenerationContext, count: number): Promise<DesignCandidate[]> {
    if (!this.provider) {
      throw new Error('Provider not set. Call setProvider() first.');
    }

    const candidates: DesignCandidate[] = [];
    const baseTemp = this.config.temperature ?? 0.7;

    // Generate candidates with varying temperatures for diversity
    const temperatures = this.varyTemperature
      ? this.getTemperatureVariants(baseTemp, count)
      : Array(count).fill(baseTemp);

    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildIntentPrompt(context.intent);

    const messages: AIMessage[] = [
      { role: 'user', content: userPrompt },
    ];

    // Generate candidates in parallel
    const promises = temperatures.map(async (temp) => {
      try {
        const response = await this.provider!.sendMessage(messages, {
          systemPrompt,
          temperature: temp,
          maxTokens: this.config.maxTokens,
        });

        const seed = this.parseToolCalls(response.content);
        return this.createCandidate(seed, context.iteration);
      } catch (error) {
        console.warn('Initial generation failed:', error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    for (const result of results) {
      if (result) {
        candidates.push(result);
      }
    }

    return candidates;
  }

  /**
   * Generate temperature variants for diversity
   */
  private getTemperatureVariants(base: number, count: number): number[] {
    if (count === 1) return [base];

    const variants: number[] = [];
    const spread = 0.3; // +/- spread around base

    for (let i = 0; i < count; i++) {
      // Spread temperatures evenly
      const offset = (i / (count - 1) - 0.5) * 2 * spread;
      const temp = Math.max(0.1, Math.min(1.0, base + offset));
      variants.push(temp);
    }

    return variants;
  }
}

/**
 * Create an initial generator
 */
export function createInitialGenerator(config?: InitialGeneratorConfig): InitialGenerator {
  return new InitialGenerator(config);
}
