/**
 * Claude Vision Verifier
 *
 * Design verification using Anthropic's Claude vision model.
 */

import type { AIProvider, AIMessage, ContentPart } from '@ai/providers/ai-provider';
import type { ModelVerificationResult, VerificationModelName } from '../types';
import {
  BaseVerifier,
  type VerifierConfig,
  type VerificationRequest,
} from './base-verifier';

/**
 * Claude-specific configuration
 */
export interface ClaudeVerifierConfig extends VerifierConfig {
  /** Model to use for verification */
  model?: string;
}

/**
 * Claude Vision Verifier
 */
export class ClaudeVerifier extends BaseVerifier {
  readonly name: VerificationModelName = 'claude';
  private provider: AIProvider | null = null;
  private model: string;

  constructor(config: ClaudeVerifierConfig = {}) {
    super(config);
    this.model = config.model ?? 'claude-sonnet-4-20250514';
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
      return this.provider.isConnected() && this.provider.capabilities.vision;
    } catch {
      return false;
    }
  }

  async verify(request: VerificationRequest): Promise<ModelVerificationResult> {
    if (!this.provider) {
      throw new Error('Claude provider not set. Call setProvider() first.');
    }

    if (!this.provider.capabilities.vision) {
      throw new Error('Claude provider does not support vision');
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
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        systemPrompt: 'You are a precise design verification assistant. Always respond with valid JSON.',
      });

      const duration = performance.now() - startTime;

      const result = this.parseVerificationResponse(response.content);

      // Add timing metadata
      return {
        ...result,
        rawResponse: `[${duration.toFixed(0)}ms] ${response.content}`,
      };
    } catch (error) {
      // Return a failed verification result
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
 * Create a Claude verifier instance
 */
export function createClaudeVerifier(
  config?: ClaudeVerifierConfig
): ClaudeVerifier {
  return new ClaudeVerifier(config);
}
