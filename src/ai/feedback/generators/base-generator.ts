/**
 * Base Generator Interface
 *
 * Defines the contract for design candidate generators.
 */

import type { AIProvider } from '@ai/providers/ai-provider';
import type {
  DesignIntent,
  DesignCandidate,
  GenerationStrategy,
  ScoredCandidate,
  VerificationResult,
} from '../types';
import { generateId } from '../types';

/**
 * Generator configuration
 */
export interface GeneratorConfig {
  /** Temperature for generation */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
  /** Timeout (ms) */
  timeout?: number;
}

/**
 * Generation context - state available during generation
 */
export interface GenerationContext {
  /** Original design intent */
  intent: DesignIntent;
  /** Current iteration number */
  iteration: number;
  /** Previous candidates with scores */
  previousCandidates: ScoredCandidate[];
  /** Best candidate so far */
  bestCandidate?: ScoredCandidate;
  /** Available tools for design */
  availableTools: string[];
}

/**
 * Base Generator interface
 */
export interface Generator {
  /** Generation strategy this generator implements */
  readonly strategy: GenerationStrategy;

  /** Generate candidates */
  generate(context: GenerationContext, count: number): Promise<DesignCandidate[]>;

  /** Configure the generator */
  configure(config: Partial<GeneratorConfig>): void;
}

/**
 * Abstract base class for generators
 */
export abstract class BaseGenerator implements Generator {
  abstract readonly strategy: GenerationStrategy;
  protected config: GeneratorConfig;
  protected provider: AIProvider | null = null;

  constructor(config: GeneratorConfig = {}) {
    this.config = {
      temperature: 0.7,
      maxTokens: 4000,
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Set the AI provider to use for generation
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  abstract generate(context: GenerationContext, count: number): Promise<DesignCandidate[]>;

  configure(config: Partial<GeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create a candidate object
   */
  protected createCandidate(
    seed: string,
    iteration: number,
    metadata: Partial<{
      parentId?: string;
      parentIds?: string[];
      refinementFocus?: string;
      improvementConfidence?: number;
      parentScores?: number[];
    }> = {}
  ): DesignCandidate {
    return {
      id: generateId(),
      seed,
      generationMethod: this.strategy,
      iterationBorn: iteration,
      parentId: metadata.parentId,
      parentIds: metadata.parentIds,
      metadata: {
        temperature: this.config.temperature,
        refinementFocus: metadata.refinementFocus,
        improvementConfidence: metadata.improvementConfidence,
        parentScores: metadata.parentScores,
        generatedAt: Date.now(),
      },
    };
  }

  /**
   * Build a system prompt for design generation
   */
  protected buildSystemPrompt(context: GenerationContext): string {
    return `You are a professional UI/UX designer creating designs using a design tool.
You generate designs by outputting a series of tool calls that create and arrange visual elements.

Available tools: ${context.availableTools.join(', ')}

IMPORTANT:
- Output ONLY a JSON array of tool calls
- Each tool call should be: { "tool": "tool_name", "args": { ... } }
- Create complete, polished designs
- Use proper spacing, alignment, and visual hierarchy
- Consider accessibility (contrast, readable text sizes)

Example output format:
[
  { "tool": "create_frame", "args": { "width": 400, "height": 600, "name": "Main Frame" } },
  { "tool": "create_rectangle", "args": { "x": 0, "y": 0, "width": 400, "height": 80, "fill": "#3B82F6" } },
  { "tool": "create_text", "args": { "x": 16, "y": 24, "text": "Header", "fontSize": 24, "fontWeight": "bold" } }
]`;
  }

  /**
   * Build user prompt for intent
   */
  protected buildIntentPrompt(intent: DesignIntent): string {
    let prompt = `Create a UI design based on this description:\n\n${intent.description}`;

    if (intent.constraints?.length) {
      prompt += '\n\nConstraints:';
      for (const c of intent.constraints) {
        prompt += `\n- [${c.priority}] ${c.type}: ${c.description}`;
      }
    }

    if (intent.style) {
      prompt += '\n\nStyle preferences:';
      if (intent.style.colorScheme) prompt += `\n- Color scheme: ${intent.style.colorScheme}`;
      if (intent.style.primaryColor) prompt += `\n- Primary color: ${intent.style.primaryColor}`;
      if (intent.style.style) prompt += `\n- Visual style: ${intent.style.style}`;
      if (intent.style.density) prompt += `\n- Density: ${intent.style.density}`;
    }

    if (intent.requirements) {
      prompt += '\n\nRequired elements:';
      for (const el of intent.requirements.elements) {
        prompt += `\n- ${el}`;
      }
      if (intent.requirements.layout) {
        prompt += `\n\nLayout: ${intent.requirements.layout}`;
      }
    }

    prompt += '\n\nOutput only the JSON array of tool calls to create this design.';

    return prompt;
  }

  /**
   * Parse tool calls from AI response
   */
  protected parseToolCalls(response: string): string {
    // Try to extract JSON array from response
    try {
      // Handle markdown code blocks
      let jsonStr = response;
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      // Try to find array in response
      const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonStr = arrayMatch[0];
      }

      // Validate it's valid JSON
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) {
        throw new Error('Expected array of tool calls');
      }

      return JSON.stringify({ toolCalls: parsed });
    } catch (error) {
      throw new Error(`Failed to parse tool calls: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
