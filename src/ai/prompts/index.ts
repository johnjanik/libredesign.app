/**
 * AI Prompts Module
 *
 * Exports system prompt builders for AI model priming.
 * Provides model-agnostic prompt generation for all supported applications.
 */

export {
  // Types
  type ApplicationType,
  type PromptVerbosity,
  type SystemPromptOptions,
  type DesignContext,
  type SystemPromptResult,
  // Main builders
  buildSystemPrompt,
  buildContextPrompt,
  buildCombinedPrompt,
  // Preset configurations
  buildMinimalPrompt,
  buildStandardPrompt,
  buildDetailedPrompt,
  // Utilities
  getApplicationTypes,
  getApplicationDomain,
  validatePromptOptions,
  getPromptSizeCategory,
} from './system-prompt-builder';
