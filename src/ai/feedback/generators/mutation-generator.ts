/**
 * Mutation Generator
 *
 * Creates variations of existing designs with random modifications.
 */

import type { AIMessage } from '@ai/providers/ai-provider';
import type { DesignCandidate, GenerationStrategy, ScoredCandidate } from '../types';
import { BaseGenerator, type GenerationContext, type GeneratorConfig } from './base-generator';

/**
 * Mutation types
 */
export type MutationType =
  | 'color_shift'      // Adjust colors/palette
  | 'spacing_adjust'   // Modify spacing/padding
  | 'size_variation'   // Scale elements
  | 'layout_tweak'     // Minor layout changes
  | 'style_shift'      // Visual style variations
  | 'element_swap';    // Swap similar elements

/**
 * Mutation generator configuration
 */
export interface MutationGeneratorConfig extends GeneratorConfig {
  /** Types of mutations to apply */
  mutationTypes?: MutationType[];
  /** Mutation intensity (0-1) */
  intensity?: number;
}

/**
 * Mutation Generator - creates variations through random changes
 */
export class MutationGenerator extends BaseGenerator {
  readonly strategy: GenerationStrategy = 'mutation';
  private mutationTypes: MutationType[];
  private intensity: number;

  constructor(config: MutationGeneratorConfig = {}) {
    super(config);
    this.mutationTypes = config.mutationTypes ?? [
      'color_shift',
      'spacing_adjust',
      'size_variation',
      'layout_tweak',
      'style_shift',
    ];
    this.intensity = config.intensity ?? 0.3;
  }

  async generate(context: GenerationContext, count: number): Promise<DesignCandidate[]> {
    if (!this.provider) {
      throw new Error('Provider not set. Call setProvider() first.');
    }

    // Need candidates to mutate
    if (context.previousCandidates.length === 0) {
      return [];
    }

    const candidates: DesignCandidate[] = [];
    const systemPrompt = this.buildMutationSystemPrompt(context);

    // Select candidates to mutate
    const toMutate = this.selectCandidatesToMutate(context.previousCandidates, count);

    const promises = toMutate.map(async ({ candidate: scored, mutation }) => {
      try {
        const userPrompt = this.buildMutationPrompt(context, scored, mutation);

        const messages: AIMessage[] = [
          { role: 'user', content: userPrompt },
        ];

        // Higher temperature for mutations to encourage variation
        const mutationTemp = Math.min(1.0, (this.config.temperature ?? 0.7) + 0.2);

        const response = await this.provider!.sendMessage(messages, {
          systemPrompt,
          temperature: mutationTemp,
          maxTokens: this.config.maxTokens,
        });

        const seed = this.parseToolCalls(response.content);

        return this.createCandidate(seed, context.iteration, {
          parentId: scored.candidate.id,
          refinementFocus: mutation,
          parentScores: [scored.qualityScore.overall],
        });
      } catch (error) {
        console.warn('Mutation generation failed:', error);
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
   * Select candidates and mutation types
   */
  private selectCandidatesToMutate(
    candidates: ScoredCandidate[],
    count: number
  ): Array<{ candidate: ScoredCandidate; mutation: MutationType }> {
    const selections: Array<{ candidate: ScoredCandidate; mutation: MutationType }> = [];

    // Prefer mutating good-but-not-perfect candidates
    const sorted = [...candidates]
      .filter(c => c.qualityScore.overall > 0.5)
      .sort((a, b) => b.qualityScore.overall - a.qualityScore.overall);

    for (let i = 0; i < count && sorted.length > 0; i++) {
      // Round-robin through candidates
      const candidateIdx = i % sorted.length;
      const mutationIdx = i % this.mutationTypes.length;

      selections.push({
        candidate: sorted[candidateIdx],
        mutation: this.mutationTypes[mutationIdx],
      });
    }

    return selections;
  }

  /**
   * Build system prompt for mutations
   */
  private buildMutationSystemPrompt(context: GenerationContext): string {
    return `You are a professional UI/UX designer creating design variations.
You will receive a design and instructions for a specific type of modification. Create a variation that applies the requested changes while maintaining the overall design quality.

Available tools: ${context.availableTools.join(', ')}

IMPORTANT:
- Output ONLY a JSON array of tool calls
- Apply the requested mutation type
- Maintain overall design coherence
- Keep successful elements from the original
- The variation should be noticeably different but still good`;
  }

  /**
   * Build prompt for mutation
   */
  private buildMutationPrompt(
    context: GenerationContext,
    scored: ScoredCandidate,
    mutation: MutationType
  ): string {
    const mutationInstructions = this.getMutationInstructions(mutation);
    const intensityDesc = this.intensity < 0.3 ? 'subtle' :
                          this.intensity < 0.6 ? 'moderate' : 'significant';

    let prompt = `Design intent:\n${context.intent.description}\n\n`;

    prompt += `Original design (score: ${(scored.qualityScore.overall * 100).toFixed(1)}%):\n`;
    prompt += `${scored.candidate.seed}\n\n`;

    prompt += `Create a ${intensityDesc} ${mutation} variation:\n`;
    prompt += `${mutationInstructions}\n\n`;

    prompt += `Guidelines:\n`;
    prompt += `- Apply ${intensityDesc} changes (intensity: ${(this.intensity * 100).toFixed(0)}%)\n`;
    prompt += `- Maintain the overall structure and purpose\n`;
    prompt += `- Keep elements that scored well\n`;
    prompt += `- The variation should be visually distinct but coherent\n\n`;

    prompt += `Output only the JSON array of tool calls for the mutated design.`;

    return prompt;
  }

  /**
   * Get instructions for each mutation type
   */
  private getMutationInstructions(mutation: MutationType): string {
    const instructions: Record<MutationType, string> = {
      color_shift: `Modify the color palette:
- Adjust hue/saturation of primary colors
- Try different color harmonies (complementary, analogous)
- Vary accent colors
- Maintain contrast for readability`,

      spacing_adjust: `Modify spacing and padding:
- Increase or decrease margins between elements
- Adjust internal padding
- Try tighter or looser grouping
- Maintain visual hierarchy through spacing`,

      size_variation: `Modify element sizes:
- Scale up or down key elements
- Adjust text sizes for different emphasis
- Vary button/input sizes
- Maintain proportions and balance`,

      layout_tweak: `Make minor layout adjustments:
- Shift element positions slightly
- Try different alignment options
- Adjust row/column arrangements
- Experiment with visual weight distribution`,

      style_shift: `Modify visual styling:
- Adjust border radius (more/less rounded)
- Try different shadow depths
- Vary stroke weights
- Experiment with opacity levels`,

      element_swap: `Swap similar elements:
- Replace buttons with different variants
- Swap icon styles
- Try different input styles
- Use alternative visual patterns`,
    };

    return instructions[mutation];
  }
}

/**
 * Create a mutation generator
 */
export function createMutationGenerator(
  config?: MutationGeneratorConfig
): MutationGenerator {
  return new MutationGenerator(config);
}
