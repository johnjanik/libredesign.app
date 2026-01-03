/**
 * AI Error Module
 *
 * Exports error handling utilities and types.
 */

export {
  AIError,
  ErrorHandler,
  NetworkStatusDetector,
  createErrorHandler,
  createErrorFromException,
  createErrorFromResponse,
  parseHttpError,
  calculateRetryDelay,
  withRetry,
  getNetworkDetector,
  retryRecoveryStrategy,
  providerFallbackStrategy,
  DEFAULT_RETRY_CONFIG,
} from './error-handler';

export type {
  AIErrorCode,
  AIErrorCategory,
  RetryConfig,
  RecoveryStrategy,
  RecoveryContext,
  RecoveryResult,
} from './error-handler';
