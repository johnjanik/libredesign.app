/**
 * Crossover Generator
 *
 * Combines elements from multiple successful candidates.
 */

import type { AIMessage } from '@ai/providers/ai-provider';
import type { DesignCandidate, GenerationStrategy, ScoredCandidate } from '../types';
import { BaseGenerator, type GenerationContext, type GeneratorConfig } from './base-generator';
import { definedProps } from '@core/utils/object-utils';

/**
 * Crossover generator configuration
 */
export interface CrossoverGeneratorConfig extends GeneratorConfig {
  /** Minimum candidates required for crossover */
  minParents?: number;
  /** Maximum candidates to combine */
  maxParents?: number;
}

/**
 * Crossover Generator - combines best elements from multiple designs
 */
export class CrossoverGenerator extends BaseGenerator {
  readonly strategy: GenerationStrategy = 'crossover';
  private minParents: number;
  private maxParents: number;

  constructor(config: CrossoverGeneratorConfig = {}) {
    super(config);
    this.minParents = config.minParents ?? 2;
    this.maxParents = config.maxParents ?? 3;
  }

  async generate(context: GenerationContext, count: number): Promise<DesignCandidate[]> {
    if (!this.provider) {
      throw new Error('Provider not set. Call setProvider() first.');
    }

    // Need multiple candidates to crossover
    if (context.previousCandidates.length < this.minParents) {
      return [];
    }

    const candidates: DesignCandidate[] = [];
    const systemPrompt = this.buildCrossoverSystemPrompt(context);

    // Generate crossover candidates
    for (let i = 0; i < count; i++) {
      try {
        // Select parents for this crossover
        const parents = this.selectParents(context.previousCandidates);
        const userPrompt = this.buildCrossoverPrompt(context, parents);

        const messages: AIMessage[] = [
          { role: 'user', content: userPrompt },
        ];

        const response = await this.provider.sendMessage(messages, {
          systemPrompt,
          ...definedProps({
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
          }),
        });

        const seed = this.parseToolCalls(response.content);

        candidates.push(
          this.createCandidate(seed, context.iteration, {
            parentIds: parents.map(p => p.candidate.id),
            parentScores: parents.map(p => p.qualityScore.overall),
            improvementConfidence: 0.6,
          })
        );
      } catch (error) {
        console.warn('Crossover generation failed:', error);
      }
    }

    return candidates;
  }

  /**
   * Select parent candidates for crossover
   */
  private selectParents(candidates: ScoredCandidate[]): ScoredCandidate[] {
    // Sort by score and select diverse high-performers
    const sorted = [...candidates].sort(
      (a, b) => b.qualityScore.overall - a.qualityScore.overall
    );

    // Take top performers
    const topN = Math.min(sorted.length, this.maxParents);
    const parents: ScoredCandidate[] = [];

    // Select parents with different strengths
    const selected = new Set<string>();

    // First, add best overall
    const bestOverall = sorted[0];
    if (bestOverall) {
      parents.push(bestOverall);
      selected.add(bestOverall.candidate.id);
    }

    // Then add candidates with different category strengths
    const categoryBests = this.findCategoryBests(sorted);
    for (const best of categoryBests) {
      if (parents.length >= topN) break;
      if (!selected.has(best.candidate.id)) {
        parents.push(best);
        selected.add(best.candidate.id);
      }
    }

    // Fill remaining slots from top performers
    for (const c of sorted) {
      if (parents.length >= topN) break;
      if (!selected.has(c.candidate.id)) {
        parents.push(c);
        selected.add(c.candidate.id);
      }
    }

    return parents;
  }

  /**
   * Find candidates that are best in each category
   */
  private findCategoryBests(candidates: ScoredCandidate[]): ScoredCandidate[] {
    const categories = ['layout', 'fidelity', 'completeness', 'polish'] as const;
    const bests: ScoredCandidate[] = [];

    for (const category of categories) {
      let best: ScoredCandidate | null = null;
      let bestScore = -1;

      for (const c of candidates) {
        const score = c.verification.detailedAnalysis.categories[category];
        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      }

      if (best) {
        bests.push(best);
      }
    }

    return bests;
  }

  /**
   * Build system prompt for crossover
   */
  private buildCrossoverSystemPrompt(context: GenerationContext): string {
    return `You are a professional UI/UX designer creating hybrid designs.
You will receive multiple design candidates and their strengths. Create a new design that combines the best elements from each.

Available tools: ${context.availableTools.join(', ')}

IMPORTANT:
- Output ONLY a JSON array of tool calls
- Identify the best elements from each parent design
- Combine elements thoughtfully, not randomly
- Ensure visual consistency in the combined design
- The result should be better than any individual parent`;
  }

  /**
   * Build prompt for crossover
   */
  private buildCrossoverPrompt(
    context: GenerationContext,
    parents: ScoredCandidate[]
  ): string {
    let prompt = `Design intent:\n${context.intent.description}\n\n`;

    prompt += `Combine the best elements from these ${parents.length} designs:\n\n`;

    for (let i = 0; i < parents.length; i++) {
      const p = parents[i];
      if (!p) continue;
      prompt += `=== Design ${i + 1} (score: ${(p.qualityScore.overall * 100).toFixed(1)}%) ===\n`;
      prompt += `Strengths:\n`;

      // List category scores as strengths indicator
      const cats = p.verification.detailedAnalysis.categories;
      if (cats.layout >= 0.8) prompt += `- Excellent layout (${(cats.layout * 100).toFixed(0)}%)\n`;
      if (cats.fidelity >= 0.8) prompt += `- High fidelity (${(cats.fidelity * 100).toFixed(0)}%)\n`;
      if (cats.completeness >= 0.8) prompt += `- Very complete (${(cats.completeness * 100).toFixed(0)}%)\n`;
      if (cats.polish >= 0.8) prompt += `- Well polished (${(cats.polish * 100).toFixed(0)}%)\n`;

      if (p.verification.detailedAnalysis.strengths.length > 0) {
        for (const s of p.verification.detailedAnalysis.strengths.slice(0, 3)) {
          prompt += `- ${s}\n`;
        }
      }

      prompt += `\nTool calls:\n${p.candidate.seed}\n\n`;
    }

    prompt += `Create a new design that:\n`;
    prompt += `1. Takes the best layout elements from the design with highest layout score\n`;
    prompt += `2. Uses the best visual styling from the design with highest fidelity\n`;
    prompt += `3. Includes all necessary elements from the most complete design\n`;
    prompt += `4. Applies polish techniques from the best polished design\n\n`;

    prompt += `Output only the JSON array of tool calls for the combined design.`;

    return prompt;
  }
}

/**
 * Create a crossover generator
 */
export function createCrossoverGenerator(
  config?: CrossoverGeneratorConfig
): CrossoverGenerator {
  return new CrossoverGenerator(config);
}
