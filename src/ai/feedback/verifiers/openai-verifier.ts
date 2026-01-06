/**
 * OpenAI Vision Verifier
 *
 * Design verification using OpenAI's GPT-4 vision model.
 */

import type { AIProvider, AIMessage, ContentPart } from '@ai/providers/ai-provider';
import type { ModelVerificationResult, VerificationModelName } from '../types';
import {
  BaseVerifier,
  type VerifierConfig,
  type VerificationRequest,
} from './base-verifier';

/**
 * OpenAI-specific configuration
 */
export interface OpenAIVerifierConfig extends VerifierConfig {
  /** Model to use for verification */
  model?: string;
  /** Image detail level */
  imageDetail?: 'low' | 'high' | 'auto';
}

/**
 * OpenAI Vision Verifier
 */
export class OpenAIVerifier extends BaseVerifier {
  readonly name: VerificationModelName = 'openai';
  private provider: AIProvider | null = null;
  private model: string;
  private imageDetail: 'low' | 'high' | 'auto';

  constructor(config: OpenAIVerifierConfig = {}) {
    super(config);
    this.model = config.model ?? 'gpt-4o';
    this.imageDetail = config.imageDetail ?? 'high';
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
      return this.provider.isConnected() && this.provider.capabilities.vision;
    } catch {
      return false;
    }
  }

  async verify(request: VerificationRequest): Promise<ModelVerificationResult> {
    if (!this.provider) {
      throw new Error('OpenAI provider not set. Call setProvider() first.');
    }

    if (!this.provider.capabilities.vision) {
      throw new Error('OpenAI provider does not support vision');
    }

    const prompt = this.buildVerificationPrompt(request);

    // Build message with image - OpenAI uses data URLs
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
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        systemPrompt: 'You are a precise design verification assistant. Always respond with valid JSON.',
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
}

/**
 * Create an OpenAI verifier instance
 */
export function createOpenAIVerifier(
  config?: OpenAIVerifierConfig
): OpenAIVerifier {
  return new OpenAIVerifier(config);
}
