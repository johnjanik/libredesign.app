/**
 * Fresh Generator
 *
 * Generates completely new designs from scratch, ignoring previous candidates.
 * Useful for escaping local optima.
 */

import type { AIMessage } from '@ai/providers/ai-provider';
import type { DesignCandidate, GenerationStrategy } from '../types';
import { BaseGenerator, type GenerationContext, type GeneratorConfig } from './base-generator';
import { definedProps } from '@core/utils/object-utils';

/**
 * Fresh generator configuration
 */
export interface FreshGeneratorConfig extends GeneratorConfig {
  /** Use higher temperature for more creative output */
  creativeMode?: boolean;
  /** Explicitly avoid patterns from previous candidates */
  avoidPreviousPatterns?: boolean;
}

/**
 * Fresh Generator - creates new designs from scratch
 */
export class FreshGenerator extends BaseGenerator {
  readonly strategy: GenerationStrategy = 'fresh';
  private creativeMode: boolean;
  private avoidPreviousPatterns: boolean;

  constructor(config: FreshGeneratorConfig = {}) {
    super(config);
    this.creativeMode = config.creativeMode ?? true;
    this.avoidPreviousPatterns = config.avoidPreviousPatterns ?? true;
  }

  async generate(context: GenerationContext, count: number): Promise<DesignCandidate[]> {
    if (!this.provider) {
      throw new Error('Provider not set. Call setProvider() first.');
    }

    const candidates: DesignCandidate[] = [];
    const baseTemp = this.creativeMode ? 0.9 : (this.config.temperature ?? 0.7);

    const systemPrompt = this.buildFreshSystemPrompt(context);
    const userPrompt = this.buildFreshPrompt(context);

    const messages: AIMessage[] = [
      { role: 'user', content: userPrompt },
    ];

    // Generate candidates in parallel with varied temperatures
    const temps = this.getVariedTemperatures(baseTemp, count);

    const promises = temps.map(async (temp) => {
      try {
        const response = await this.provider!.sendMessage(messages, {
          systemPrompt,
          temperature: temp,
          ...definedProps({ maxTokens: this.config.maxTokens }),
        });

        const seed = this.parseToolCalls(response.content);
        return this.createCandidate(seed, context.iteration);
      } catch (error) {
        console.warn('Fresh generation failed:', error);
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
   * Build system prompt for fresh generation
   */
  private buildFreshSystemPrompt(context: GenerationContext): string {
    let prompt = `You are a creative UI/UX designer starting with a blank canvas.
Create a fresh, original design based on the user's intent. Don't be constrained by conventions - explore creative approaches while maintaining usability.

Available tools: ${context.availableTools.join(', ')}

IMPORTANT:
- Output ONLY a JSON array of tool calls
- Create an original design from scratch
- Think creatively about the layout and visual approach
- Ensure the design is functional and usable
- Pay attention to visual hierarchy and user flow`;

    return prompt;
  }

  /**
   * Build prompt for fresh generation
   */
  private buildFreshPrompt(context: GenerationContext): string {
    let prompt = `Create a fresh, original design for:\n\n${context.intent.description}\n\n`;

    if (context.intent.constraints?.length) {
      prompt += 'Requirements:\n';
      for (const c of context.intent.constraints) {
        prompt += `- [${c.priority}] ${c.type}: ${c.description}\n`;
      }
      prompt += '\n';
    }

    if (context.intent.style) {
      prompt += 'Style guidance:\n';
      if (context.intent.style.colorScheme) prompt += `- Color scheme: ${context.intent.style.colorScheme}\n`;
      if (context.intent.style.primaryColor) prompt += `- Primary color: ${context.intent.style.primaryColor}\n`;
      if (context.intent.style.style) prompt += `- Visual style: ${context.intent.style.style}\n`;
      if (context.intent.style.density) prompt += `- Density: ${context.intent.style.density}\n`;
      prompt += '\n';
    }

    // If avoiding previous patterns, mention what to avoid
    if (this.avoidPreviousPatterns && context.previousCandidates.length > 0) {
      prompt += 'For variety, try a different approach than:\n';

      // Analyze previous candidates for patterns to avoid
      const patterns = this.extractPatterns(context);
      for (const pattern of patterns.slice(0, 3)) {
        prompt += `- ${pattern}\n`;
      }
      prompt += '\n';
    }

    prompt += `Think outside the box and create something original.\n`;
    prompt += `Output only the JSON array of tool calls for your fresh design.`;

    return prompt;
  }

  /**
   * Extract patterns from previous candidates to avoid
   */
  private extractPatterns(context: GenerationContext): string[] {
    const patterns: string[] = [];

    // Simple pattern extraction from critiques
    for (const scored of context.previousCandidates.slice(0, 3)) {
      if (scored.verification.detailedAnalysis.strengths.length > 0) {
        // Suggest avoiding strengths to encourage different approaches
        const strength = scored.verification.detailedAnalysis.strengths[0];
        if (strength && strength.length < 50) {
          patterns.push(strength);
        }
      }
    }

    // Generic patterns based on iteration
    if (context.iteration > 2) {
      patterns.push('Previous layout arrangements');
    }
    if (context.iteration > 4) {
      patterns.push('Similar color schemes used before');
    }

    return patterns;
  }

  /**
   * Get varied temperatures for diversity
   */
  private getVariedTemperatures(base: number, count: number): number[] {
    if (count === 1) return [base];

    const temps: number[] = [];
    for (let i = 0; i < count; i++) {
      // Vary from base-0.1 to base+0.1
      const offset = (i / (count - 1) - 0.5) * 0.2;
      temps.push(Math.max(0.1, Math.min(1.0, base + offset)));
    }

    return temps;
  }
}

/**
 * Create a fresh generator
 */
export function createFreshGenerator(config?: FreshGeneratorConfig): FreshGenerator {
  return new FreshGenerator(config);
}
