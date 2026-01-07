/**
 * Diversity Generator
 *
 * Generates deliberately different designs to maintain population diversity.
 * Uses negative constraints to ensure novelty.
 */

import type { AIMessage } from '@ai/providers/ai-provider';
import type { DesignCandidate, GenerationStrategy } from '../types';
import { BaseGenerator, type GenerationContext, type GeneratorConfig } from './base-generator';
import { definedProps } from '@core/utils/object-utils';

/**
 * Diversity dimensions to vary
 */
export type DiversityDimension =
  | 'layout_structure'  // Different arrangements
  | 'color_theme'       // Different color approaches
  | 'visual_density'    // Minimal vs detailed
  | 'component_style'   // Different UI paradigms
  | 'hierarchy_flow';   // Different information flow

/**
 * Diversity generator configuration
 */
export interface DiversityGeneratorConfig extends GeneratorConfig {
  /** Dimensions to vary for diversity */
  dimensions?: DiversityDimension[];
  /** How different from existing (0-1) */
  divergenceLevel?: number;
}

/**
 * Diversity Generator - creates deliberately different designs
 */
export class DiversityGenerator extends BaseGenerator {
  readonly strategy: GenerationStrategy = 'diversity';
  private dimensions: DiversityDimension[];
  private divergenceLevel: number;

  constructor(config: DiversityGeneratorConfig = {}) {
    super(config);
    this.dimensions = config.dimensions ?? [
      'layout_structure',
      'color_theme',
      'visual_density',
      'component_style',
      'hierarchy_flow',
    ];
    this.divergenceLevel = config.divergenceLevel ?? 0.7;
  }

  async generate(context: GenerationContext, count: number): Promise<DesignCandidate[]> {
    if (!this.provider) {
      throw new Error('Provider not set. Call setProvider() first.');
    }

    const candidates: DesignCandidate[] = [];
    const systemPrompt = this.buildDiversitySystemPrompt(context);

    // Analyze existing candidates to know what to avoid
    const existingPatterns = this.analyzeExistingPatterns(context);

    // Select dimensions to vary for each candidate
    const dimensionAssignments = this.assignDimensions(count);

    const promises = dimensionAssignments.map(async (dims) => {
      try {
        const userPrompt = this.buildDiversityPrompt(context, existingPatterns, dims);

        const messages: AIMessage[] = [
          { role: 'user', content: userPrompt },
        ];

        // Use high temperature for creative divergence
        const diverseTemp = 0.8 + (this.divergenceLevel * 0.2);

        const response = await this.provider!.sendMessage(messages, {
          systemPrompt,
          temperature: diverseTemp,
          ...definedProps({ maxTokens: this.config.maxTokens }),
        });

        const seed = this.parseToolCalls(response.content);

        return this.createCandidate(seed, context.iteration, {
          refinementFocus: dims.join(', '),
        });
      } catch (error) {
        console.warn('Diversity generation failed:', error);
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
   * Analyze patterns in existing candidates
   */
  private analyzeExistingPatterns(context: GenerationContext): ExistingPatterns {
    const patterns: ExistingPatterns = {
      layoutTypes: [],
      colorApproaches: [],
      densityLevels: [],
      styleTypes: [],
      flowPatterns: [],
    };

    // Simple pattern extraction based on critiques and strengths
    for (const scored of context.previousCandidates) {
      const cats = scored.verification.detailedAnalysis.categories;

      // Infer layout type from score
      if (cats.layout > 0.7) {
        patterns.layoutTypes.push('standard');
      }

      // Infer density from polish (polished = usually well-balanced)
      if (cats.polish > 0.7) {
        patterns.densityLevels.push('balanced');
      }

      // Extract from strengths
      for (const strength of scored.verification.detailedAnalysis.strengths) {
        if (strength.toLowerCase().includes('layout')) {
          patterns.layoutTypes.push(strength);
        }
        if (strength.toLowerCase().includes('color')) {
          patterns.colorApproaches.push(strength);
        }
      }
    }

    return patterns;
  }

  /**
   * Assign diversity dimensions to each candidate
   */
  private assignDimensions(count: number): DiversityDimension[][] {
    const assignments: DiversityDimension[][] = [];

    for (let i = 0; i < count; i++) {
      // Each candidate gets a subset of dimensions to vary
      const startIdx = i % this.dimensions.length;
      const numDims = 1 + (i % 3); // 1-3 dimensions

      const dims: DiversityDimension[] = [];
      for (let j = 0; j < numDims; j++) {
        const idx = (startIdx + j) % this.dimensions.length;
        const dim = this.dimensions[idx];
        if (dim) dims.push(dim);
      }

      assignments.push(dims);
    }

    return assignments;
  }

  /**
   * Build system prompt for diversity generation
   */
  private buildDiversitySystemPrompt(context: GenerationContext): string {
    return `You are an innovative UI/UX designer tasked with creating DIFFERENT design approaches.
Your goal is to explore the design space by creating alternatives that are deliberately distinct from existing solutions.

Available tools: ${context.availableTools.join(', ')}

IMPORTANT:
- Output ONLY a JSON array of tool calls
- Create a design that is NOTICEABLY DIFFERENT from the patterns described
- Maintain quality and usability while being different
- Think creatively about alternative approaches
- The design should still meet the core requirements`;
  }

  /**
   * Build prompt for diversity generation
   */
  private buildDiversityPrompt(
    context: GenerationContext,
    patterns: ExistingPatterns,
    dimensions: DiversityDimension[]
  ): string {
    let prompt = `Design intent:\n${context.intent.description}\n\n`;

    // What to avoid
    prompt += `Create a design that is DIFFERENT from existing approaches.\n\n`;
    prompt += `AVOID these patterns already tried:\n`;

    if (patterns.layoutTypes.length > 0) {
      prompt += `- Layout patterns: ${[...new Set(patterns.layoutTypes)].slice(0, 3).join(', ')}\n`;
    }
    if (patterns.colorApproaches.length > 0) {
      prompt += `- Color approaches: ${[...new Set(patterns.colorApproaches)].slice(0, 3).join(', ')}\n`;
    }
    if (patterns.densityLevels.length > 0) {
      prompt += `- Density levels: ${[...new Set(patterns.densityLevels)].slice(0, 3).join(', ')}\n`;
    }

    prompt += '\n';

    // What to vary
    prompt += `Focus on being different in these areas:\n`;
    for (const dim of dimensions) {
      prompt += `- ${this.getDimensionInstructions(dim)}\n`;
    }

    prompt += '\n';

    // Divergence level guidance
    const divergenceDesc = this.divergenceLevel < 0.4 ? 'slightly' :
                           this.divergenceLevel < 0.7 ? 'noticeably' : 'dramatically';

    prompt += `Make this design ${divergenceDesc} different while still meeting the requirements.\n\n`;
    prompt += `Output only the JSON array of tool calls for your diverse design.`;

    return prompt;
  }

  /**
   * Get instructions for each diversity dimension
   */
  private getDimensionInstructions(dimension: DiversityDimension): string {
    const instructions: Record<DiversityDimension, string> = {
      layout_structure: 'Try a completely different layout arrangement (e.g., if others use vertical, try horizontal; if centered, try asymmetric)',
      color_theme: 'Use a different color palette approach (e.g., monochromatic vs complementary, warm vs cool)',
      visual_density: 'Vary the visual density (e.g., if others are detailed, try minimal; if sparse, try rich)',
      component_style: 'Use different UI component styles (e.g., rounded vs sharp, flat vs elevated, outlined vs filled)',
      hierarchy_flow: 'Create a different visual hierarchy and information flow (e.g., different focal points, reading patterns)',
    };

    return instructions[dimension];
  }
}

/**
 * Patterns found in existing candidates
 */
interface ExistingPatterns {
  layoutTypes: string[];
  colorApproaches: string[];
  densityLevels: string[];
  styleTypes: string[];
  flowPatterns: string[];
}

/**
 * Create a diversity generator
 */
export function createDiversityGenerator(
  config?: DiversityGeneratorConfig
): DiversityGenerator {
  return new DiversityGenerator(config);
}
