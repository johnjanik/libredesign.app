/**
 * Ollama Local Verifier
 *
 * Design verification using local Ollama vision models (e.g., llava, llama3.2-vision).
 */

import type { AIProvider, AIMessage, ContentPart } from '@ai/providers/ai-provider';
import type { ModelVerificationResult, VerificationModelName } from '../types';
import {
  BaseVerifier,
  type VerifierConfig,
  type VerificationRequest,
} from './base-verifier';
import { definedProps } from '@core/utils/object-utils';

/**
 * Vision-capable models in Ollama
 */
export const OLLAMA_VISION_MODELS = [
  'llava',
  'llava:13b',
  'llava:34b',
  'llama3.2-vision',
  'llama3.2-vision:11b',
  'llama3.2-vision:90b',
  'bakllava',
  'moondream',
];

/**
 * Ollama-specific configuration
 */
export interface OllamaVerifierConfig extends VerifierConfig {
  /** Model to use for verification */
  model?: string;
  /** Ollama server endpoint */
  endpoint?: string;
}

/**
 * Ollama Vision Verifier
 */
export class OllamaVerifier extends BaseVerifier {
  readonly name: VerificationModelName = 'ollama';
  private provider: AIProvider | null = null;
  private readonly model: string;

  constructor(config: OllamaVerifierConfig = {}) {
    super(config);
    // Default to llava for vision tasks
    this.model = config.model ?? 'llava';
  }

  /**
   * Set the AI provider to use
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    try {
      // Check if provider is connected and supports vision
      if (!this.provider.isConnected()) {
        return false;
      }

      // Check if a vision model is loaded
      return this.provider.capabilities.vision;
    } catch {
      return false;
    }
  }

  async verify(request: VerificationRequest): Promise<ModelVerificationResult> {
    if (!this.provider) {
      throw new Error('Ollama provider not set. Call setProvider() first.');
    }

    if (!this.provider.capabilities.vision) {
      throw new Error('Ollama provider does not support vision. Use a vision model like llava.');
    }

    const prompt = this.buildVerificationPrompt(request);

    // Build message with image
    const content: ContentPart[] = [
      {
        type: 'image',
        source: {
          type: 'base64',
          mediaType: 'image/png',
          data: request.screenshot.full,
        },
      },
      {
        type: 'text',
        text: prompt,
      },
    ];

    const messages: AIMessage[] = [
      {
        role: 'user',
        content,
      },
    ];

    const startTime = performance.now();

    try {
      const response = await this.provider.sendMessage(messages, {
        systemPrompt: 'You are a precise design verification assistant. Always respond with valid JSON.',
        ...definedProps({
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
      });

      const duration = performance.now() - startTime;

      const result = this.parseVerificationResponse(response.content);

      return {
        ...result,
        rawResponse: `[${duration.toFixed(0)}ms] ${response.content}`,
      };
    } catch (error) {
      return {
        score: 0,
        confidence: 0,
        critique: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
        categories: {
          layout: 0,
          fidelity: 0,
          completeness: 0,
          polish: 0,
        },
        rawResponse: String(error),
      };
    }
  }

  /**
   * Get the model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get recommended models for verification
   */
  static getRecommendedModels(): string[] {
    return OLLAMA_VISION_MODELS;
  }
}

/**
 * Create an Ollama verifier instance
 */
export function createOllamaVerifier(
  config?: OllamaVerifierConfig
): OllamaVerifier {
  return new OllamaVerifier(config);
}
