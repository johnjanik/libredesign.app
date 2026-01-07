/**
 * Base Verifier Interface
 *
 * Defines the contract for design verification using vision models.
 */

import type {
  DesignIntent,
  ScreenshotData,
  ModelVerificationResult,
  VerificationModelName,
} from '../types';

/**
 * Verifier configuration
 */
export interface VerifierConfig {
  /** Timeout for verification request (ms) */
  timeout?: number;
  /** Temperature for model response */
  temperature?: number;
  /** Maximum tokens for response */
  maxTokens?: number;
}

/**
 * Verification request
 */
export interface VerificationRequest {
  /** The original design intent */
  intent: DesignIntent;
  /** Screenshot of the rendered design */
  screenshot: ScreenshotData;
  /** Optional previous critique to compare against */
  previousCritique?: string;
  /** Specific aspects to focus on */
  focusAreas?: string[];
}

/**
 * Base Verifier interface
 */
export interface Verifier {
  /** Verifier name/type */
  readonly name: VerificationModelName;

  /** Check if verifier is available */
  isAvailable(): Promise<boolean>;

  /** Verify a design against intent */
  verify(request: VerificationRequest): Promise<ModelVerificationResult>;

  /** Configure the verifier */
  configure(config: Partial<VerifierConfig>): void;
}

/**
 * Abstract base class for verifiers with common functionality
 */
export abstract class BaseVerifier implements Verifier {
  abstract readonly name: VerificationModelName;
  protected config: VerifierConfig;

  constructor(config: VerifierConfig = {}) {
    this.config = {
      timeout: 30000,
      temperature: 0.3,
      maxTokens: 2000,
      ...config,
    };
  }

  abstract isAvailable(): Promise<boolean>;
  abstract verify(request: VerificationRequest): Promise<ModelVerificationResult>;

  configure(config: Partial<VerifierConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Build the verification prompt
   */
  protected buildVerificationPrompt(request: VerificationRequest): string {
    const { intent, previousCritique, focusAreas } = request;

    let prompt = `You are a design verification expert. Analyze the provided screenshot of a UI design and evaluate how well it matches the user's intent.

## User's Design Intent
${intent.description}

${intent.constraints?.length ? `## Constraints
${intent.constraints.map(c => `- [${c.priority}] ${c.type}: ${c.description}`).join('\n')}` : ''}

${intent.style ? `## Style Preferences
- Color scheme: ${intent.style.colorScheme ?? 'not specified'}
- Primary color: ${intent.style.primaryColor ?? 'not specified'}
- Style: ${intent.style.style ?? 'not specified'}
- Density: ${intent.style.density ?? 'not specified'}` : ''}

${intent.requirements ? `## Requirements
- Elements: ${intent.requirements.elements.join(', ')}
${intent.requirements.layout ? `- Layout: ${intent.requirements.layout}` : ''}
${intent.requirements.interactions ? `- Interactions: ${intent.requirements.interactions.join(', ')}` : ''}
${intent.requirements.responsive ? '- Responsive: yes' : ''}` : ''}

${previousCritique ? `## Previous Critique (for comparison)
${previousCritique}` : ''}

${focusAreas?.length ? `## Focus Areas
Please pay special attention to: ${focusAreas.join(', ')}` : ''}

## Evaluation Instructions
Analyze the screenshot and provide:

1. **Overall Score** (0.0-1.0): How well does this match the intent?
2. **Confidence** (0.0-1.0): How confident are you in this assessment?
3. **Category Scores** (each 0.0-1.0):
   - Layout: Correctness of element positioning, spacing, hierarchy
   - Fidelity: Visual match to the described intent
   - Completeness: All required elements are present
   - Polish: Refinement level, visual quality, attention to detail
4. **Issues**: List specific problems (with severity: critical/major/minor)
5. **Strengths**: What was done well
6. **Suggestions**: Actionable improvements

Respond in JSON format:
{
  "score": 0.85,
  "confidence": 0.9,
  "categories": {
    "layout": 0.9,
    "fidelity": 0.85,
    "completeness": 0.8,
    "polish": 0.75
  },
  "issues": [
    {"type": "spacing", "severity": "minor", "description": "...", "suggestion": "..."}
  ],
  "strengths": ["..."],
  "suggestions": ["..."],
  "critique": "Brief overall assessment..."
}`;

    return prompt;
  }

  /**
   * Parse verification response from model
   */
  protected parseVerificationResponse(responseText: string): ModelVerificationResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = responseText;
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonStr = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonStr.trim());

      return {
        score: this.clamp(parsed.score ?? 0.5, 0, 1),
        confidence: this.clamp(parsed.confidence ?? 0.7, 0, 1),
        critique: parsed.critique ?? 'No critique provided',
        categories: {
          layout: this.clamp(parsed.categories?.layout ?? 0.5, 0, 1),
          fidelity: this.clamp(parsed.categories?.fidelity ?? 0.5, 0, 1),
          completeness: this.clamp(parsed.categories?.completeness ?? 0.5, 0, 1),
          polish: this.clamp(parsed.categories?.polish ?? 0.5, 0, 1),
        },
        rawResponse: responseText,
      };
    } catch (error) {
      // Fallback: try to extract scores from text
      return this.fallbackParse(responseText);
    }
  }

  /**
   * Fallback parsing when JSON parsing fails
   */
  protected fallbackParse(responseText: string): ModelVerificationResult {
    // Try to extract score from text patterns like "score: 0.8" or "8/10"
    let score = 0.5;
    const scoreMatch = responseText.match(/score[:\s]+(\d+\.?\d*)/i);
    if (scoreMatch && scoreMatch[1]) {
      const num = parseFloat(scoreMatch[1]);
      score = num > 1 ? num / 10 : num;
    } else {
      const ratingMatch = responseText.match(/(\d+)\s*\/\s*10/);
      if (ratingMatch && ratingMatch[1]) {
        score = parseInt(ratingMatch[1]) / 10;
      }
    }

    return {
      score: this.clamp(score, 0, 1),
      confidence: 0.5, // Lower confidence for fallback parsing
      critique: responseText.slice(0, 500),
      categories: {
        layout: score,
        fidelity: score,
        completeness: score,
        polish: score,
      },
      rawResponse: responseText,
    };
  }

  protected clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
