/**
 * Refinement Generator
 *
 * Improves existing candidates based on verification critique.
 */

import type { AIMessage } from '@ai/providers/ai-provider';
import type { DesignCandidate, GenerationStrategy, ScoredCandidate } from '../types';
import { BaseGenerator, type GenerationContext, type GeneratorConfig } from './base-generator';

/**
 * Refinement generator configuration
 */
export interface RefinementGeneratorConfig extends GeneratorConfig {
  /** Focus on specific categories (layout, fidelity, completeness, polish) */
  focusCategories?: string[];
  /** Minimum score improvement target */
  targetImprovement?: number;
}

/**
 * Refinement Generator - improves designs based on critique
 */
export class RefinementGenerator extends BaseGenerator {
  readonly strategy: GenerationStrategy = 'refinement';
  private focusCategories: string[];
  private targetImprovement: number;

  constructor(config: RefinementGeneratorConfig = {}) {
    super(config);
    this.focusCategories = config.focusCategories ?? [];
    this.targetImprovement = config.targetImprovement ?? 0.1;
  }

  async generate(context: GenerationContext, count: number): Promise<DesignCandidate[]> {
    if (!this.provider) {
      throw new Error('Provider not set. Call setProvider() first.');
    }

    // Need previous candidates to refine
    if (context.previousCandidates.length === 0) {
      return [];
    }

    const candidates: DesignCandidate[] = [];

    // Select top candidates to refine (best performers with room for improvement)
    const candidatesToRefine = this.selectCandidatesToRefine(
      context.previousCandidates,
      count
    );

    const systemPrompt = this.buildRefinementSystemPrompt(context);

    // Generate refinements in parallel
    const promises = candidatesToRefine.map(async (scored) => {
      try {
        const userPrompt = this.buildRefinementPrompt(context, scored);

        const messages: AIMessage[] = [
          { role: 'user', content: userPrompt },
        ];

        const response = await this.provider!.sendMessage(messages, {
          systemPrompt,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        });

        const seed = this.parseToolCalls(response.content);
        const focusArea = this.identifyWeakestCategory(scored);

        return this.createCandidate(seed, context.iteration, {
          parentId: scored.candidate.id,
          refinementFocus: focusArea,
          improvementConfidence: 0.7,
          parentScores: [scored.qualityScore.overall],
        });
      } catch (error) {
        console.warn('Refinement generation failed:', error);
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
   * Select candidates that have potential for improvement
   */
  private selectCandidatesToRefine(
    candidates: ScoredCandidate[],
    count: number
  ): ScoredCandidate[] {
    // Sort by score descending but filter out near-perfect ones
    const eligible = candidates
      .filter(c => c.qualityScore.overall < 0.95) // Room for improvement
      .filter(c => c.qualityScore.overall > 0.3)  // Worth refining
      .sort((a, b) => b.qualityScore.overall - a.qualityScore.overall);

    return eligible.slice(0, count);
  }

  /**
   * Build system prompt for refinement
   */
  private buildRefinementSystemPrompt(context: GenerationContext): string {
    return `You are a professional UI/UX designer improving existing designs.
You will receive a design critique and must create an improved version that addresses the issues.

Available tools: ${context.availableTools.join(', ')}

IMPORTANT:
- Output ONLY a JSON array of tool calls
- Address ALL issues mentioned in the critique
- Preserve what works well in the original
- Focus on the weakest areas first
- Maintain consistency with the design intent`;
  }

  /**
   * Build prompt for refining a specific candidate
   */
  private buildRefinementPrompt(
    context: GenerationContext,
    scored: ScoredCandidate
  ): string {
    const { candidate, verification, qualityScore } = scored;

    let prompt = `Original design intent:\n${context.intent.description}\n\n`;

    prompt += `Previous design (score: ${(qualityScore.overall * 100).toFixed(1)}%):\n`;
    prompt += `${candidate.seed}\n\n`;

    prompt += `Verification feedback:\n${verification.critique}\n\n`;

    prompt += `Category scores:\n`;
    prompt += `- Layout: ${(verification.detailedAnalysis.categories.layout * 100).toFixed(1)}%\n`;
    prompt += `- Fidelity: ${(verification.detailedAnalysis.categories.fidelity * 100).toFixed(1)}%\n`;
    prompt += `- Completeness: ${(verification.detailedAnalysis.categories.completeness * 100).toFixed(1)}%\n`;
    prompt += `- Polish: ${(verification.detailedAnalysis.categories.polish * 100).toFixed(1)}%\n\n`;

    if (verification.detailedAnalysis.issues.length > 0) {
      prompt += `Issues to fix:\n`;
      for (const issue of verification.detailedAnalysis.issues) {
        prompt += `- [${issue.severity}] ${issue.description}`;
        if (issue.suggestion) prompt += ` → ${issue.suggestion}`;
        prompt += '\n';
      }
      prompt += '\n';
    }

    if (verification.detailedAnalysis.strengths.length > 0) {
      prompt += `Strengths to preserve:\n`;
      for (const strength of verification.detailedAnalysis.strengths) {
        prompt += `- ${strength}\n`;
      }
      prompt += '\n';
    }

    const focusArea = this.identifyWeakestCategory(scored);
    prompt += `Priority focus: Improve ${focusArea} first.\n\n`;

    prompt += `Create an improved version that:\n`;
    prompt += `1. Fixes all critical and major issues\n`;
    prompt += `2. Addresses minor issues where possible\n`;
    prompt += `3. Preserves strengths from the original\n`;
    prompt += `4. Targets a score improvement of at least ${(this.targetImprovement * 100).toFixed(0)}%\n\n`;

    prompt += `Output only the JSON array of tool calls for the improved design.`;

    return prompt;
  }

  /**
   * Identify the weakest category for focus
   */
  private identifyWeakestCategory(scored: ScoredCandidate): string {
    const categories = scored.verification.detailedAnalysis.categories;

    let weakest = 'layout';
    let lowestScore = categories.layout;

    if (categories.fidelity < lowestScore) {
      weakest = 'fidelity';
      lowestScore = categories.fidelity;
    }
    if (categories.completeness < lowestScore) {
      weakest = 'completeness';
      lowestScore = categories.completeness;
    }
    if (categories.polish < lowestScore) {
      weakest = 'polish';
    }

    return weakest;
  }
}

/**
 * Create a refinement generator
 */
export function createRefinementGenerator(
  config?: RefinementGeneratorConfig
): RefinementGenerator {
  return new RefinementGenerator(config);
}
