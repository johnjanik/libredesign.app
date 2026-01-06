/**
 * Verifiers Module
 *
 * Design verification using vision models.
 */

// Base
export { BaseVerifier } from './base-verifier';
export type { Verifier, VerifierConfig, VerificationRequest } from './base-verifier';

// Implementations
export { ClaudeVerifier, createClaudeVerifier } from './claude-verifier';
export type { ClaudeVerifierConfig } from './claude-verifier';

export { OpenAIVerifier, createOpenAIVerifier } from './openai-verifier';
export type { OpenAIVerifierConfig } from './openai-verifier';

export { OllamaVerifier, createOllamaVerifier, OLLAMA_VISION_MODELS } from './ollama-verifier';
export type { OllamaVerifierConfig } from './ollama-verifier';

// Tiered Orchestration
export { TieredVerifier, createTieredVerifier } from './tiered-verifier';
export type { TieredVerifierConfig } from './tiered-verifier';
