/**
 * AI Error Handler
 *
 * Centralized error handling with retry logic, fallback strategies,
 * and user-friendly error messages.
 */

/**
 * Error codes for AI operations
 */
export type AIErrorCode =
  | 'PROVIDER_OFFLINE'
  | 'RATE_LIMITED'
  | 'CONTEXT_TOO_LARGE'
  | 'MODEL_NOT_FOUND'
  | 'STREAM_INTERRUPTED'
  | 'AUTH_FAILED'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'CONTENT_FILTERED'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

/**
 * Error category for recovery strategies
 */
export type AIErrorCategory =
  | 'retryable'
  | 'auth'
  | 'limit'
  | 'network'
  | 'fatal';

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Add jitter to prevent thundering herd */
  jitter: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * AI Error class with additional metadata
 */
export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly category: AIErrorCategory;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly retryAfter: number | undefined;
  readonly provider: string | undefined;
  readonly originalError: Error | undefined;
  readonly statusCode: number | undefined;

  constructor(
    code: AIErrorCode,
    message: string,
    options?: {
      userMessage?: string | undefined;
      provider?: string | undefined;
      originalError?: Error | undefined;
      statusCode?: number | undefined;
      retryAfter?: number | undefined;
    }
  ) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.category = getErrorCategory(code);
    this.retryable = isRetryable(code);
    this.userMessage = options?.userMessage || getUserFriendlyMessage(code);
    this.provider = options?.provider;
    this.originalError = options?.originalError;
    this.statusCode = options?.statusCode;
    this.retryAfter = options?.retryAfter;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError);
    }
  }

  /**
   * Create a JSON representation
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      userMessage: this.userMessage,
      retryable: this.retryable,
      retryAfter: this.retryAfter,
      provider: this.provider,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Get error category from code
 */
function getErrorCategory(code: AIErrorCode): AIErrorCategory {
  switch (code) {
    case 'AUTH_FAILED':
      return 'auth';

    case 'RATE_LIMITED':
    case 'QUOTA_EXCEEDED':
      return 'limit';

    case 'NETWORK_ERROR':
    case 'PROVIDER_OFFLINE':
      return 'network';

    case 'TIMEOUT':
    case 'STREAM_INTERRUPTED':
    case 'SERVER_ERROR':
      return 'retryable';

    case 'CONTEXT_TOO_LARGE':
    case 'MODEL_NOT_FOUND':
    case 'INVALID_RESPONSE':
    case 'CONTENT_FILTERED':
    case 'UNKNOWN':
    default:
      return 'fatal';
  }
}

/**
 * Check if error is retryable
 */
function isRetryable(code: AIErrorCode): boolean {
  const retryableCodes: AIErrorCode[] = [
    'TIMEOUT',
    'STREAM_INTERRUPTED',
    'SERVER_ERROR',
    'NETWORK_ERROR',
    'PROVIDER_OFFLINE',
  ];
  return retryableCodes.includes(code);
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(code: AIErrorCode): string {
  const messages: Record<AIErrorCode, string> = {
    PROVIDER_OFFLINE: 'AI service is currently unavailable. Please check your connection and try again.',
    RATE_LIMITED: 'Too many requests. Please wait a moment before trying again.',
    CONTEXT_TOO_LARGE: 'The conversation is too long. Please start a new conversation or reduce the context.',
    MODEL_NOT_FOUND: 'The selected model is not available. Please choose a different model.',
    STREAM_INTERRUPTED: 'The response was interrupted. Please try again.',
    AUTH_FAILED: 'Authentication failed. Please check your API key in settings.',
    TIMEOUT: 'The request timed out. Please try again.',
    INVALID_RESPONSE: 'Received an unexpected response. Please try again.',
    NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
    QUOTA_EXCEEDED: 'API quota exceeded. Please check your usage limits or upgrade your plan.',
    CONTENT_FILTERED: 'The response was filtered due to content policy. Please rephrase your request.',
    SERVER_ERROR: 'The AI service encountered an error. Please try again.',
    UNKNOWN: 'An unexpected error occurred. Please try again.',
  };
  return messages[code];
}

/**
 * Parse HTTP status code to error code
 */
export function parseHttpError(statusCode: number, body?: unknown): AIErrorCode {
  switch (statusCode) {
    case 400:
      return 'INVALID_RESPONSE';
    case 401:
    case 403:
      return 'AUTH_FAILED';
    case 404:
      return 'MODEL_NOT_FOUND';
    case 429:
      return 'RATE_LIMITED';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'SERVER_ERROR';
    default:
      // Check body for specific errors
      if (body && typeof body === 'object') {
        const errorBody = body as Record<string, unknown>;
        const errorValue = errorBody['error'];
        const typeValue = errorBody['type'];
        const errorType = (errorValue?.toString() || typeValue?.toString() || '');

        if (errorType.includes('context_length') || errorType.includes('token')) {
          return 'CONTEXT_TOO_LARGE';
        }
        if (errorType.includes('content_filter')) {
          return 'CONTENT_FILTERED';
        }
      }
      return 'UNKNOWN';
  }
}

/**
 * Create AIError from fetch response
 */
export async function createErrorFromResponse(
  response: Response,
  provider: string
): Promise<AIError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }

  const code = parseHttpError(response.status, body);

  // Extract error message from body
  let message = `HTTP ${response.status}: ${response.statusText}`;
  if (body && typeof body === 'object') {
    const errorBody = body as Record<string, unknown>;
    const errorValue = errorBody['error'];
    const messageValue = errorBody['message'];

    let errorMessage: string | undefined;

    if (typeof errorValue === 'string') {
      errorMessage = errorValue;
    } else if (errorValue && typeof errorValue === 'object') {
      const nestedMessage = (errorValue as Record<string, unknown>)['message'];
      if (typeof nestedMessage === 'string') {
        errorMessage = nestedMessage;
      }
    } else if (typeof messageValue === 'string') {
      errorMessage = messageValue;
    }

    if (errorMessage) {
      message = errorMessage;
    }
  }

  // Check for rate limit retry-after header
  const retryAfterHeader = response.headers.get('retry-after');
  let retryAfter: number | undefined;
  if (retryAfterHeader) {
    const parsed = parseInt(retryAfterHeader, 10) * 1000;
    if (!isNaN(parsed)) {
      retryAfter = parsed;
    }
  }

  const options: {
    provider: string;
    statusCode: number;
    retryAfter?: number | undefined;
  } = {
    provider,
    statusCode: response.status,
  };

  if (retryAfter !== undefined) {
    options.retryAfter = retryAfter;
  }

  return new AIError(code, message, options);
}

/**
 * Create AIError from caught error
 */
export function createErrorFromException(error: unknown, provider?: string): AIError {
  if (error instanceof AIError) {
    return error;
  }

  // Build options only with defined values
  const buildOptions = (originalError?: Error) => {
    const opts: {
      provider?: string | undefined;
      originalError?: Error | undefined;
    } = {};
    if (provider !== undefined) {
      opts.provider = provider;
    }
    if (originalError !== undefined) {
      opts.originalError = originalError;
    }
    return opts;
  };

  if (error instanceof Error) {
    // Check for network errors
    if (
      error.name === 'TypeError' &&
      (error.message.includes('fetch') || error.message.includes('network'))
    ) {
      return new AIError('NETWORK_ERROR', error.message, buildOptions(error));
    }

    // Check for abort/timeout
    if (error.name === 'AbortError') {
      return new AIError('TIMEOUT', 'Request was aborted', buildOptions(error));
    }

    // Generic error
    return new AIError('UNKNOWN', error.message, buildOptions(error));
  }

  // Unknown error type
  const simpleOpts: { provider?: string | undefined } = {};
  if (provider !== undefined) {
    simpleOpts.provider = provider;
  }
  return new AIError('UNKNOWN', String(error), simpleOpts);
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  retryAfterMs?: number
): number {
  // Use retry-after if provided and larger than calculated delay
  if (retryAfterMs !== undefined && retryAfterMs > 0) {
    return Math.min(retryAfterMs, config.maxDelay);
  }

  // Exponential backoff
  let delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);

  // Cap at max delay
  delay = Math.min(delay, config.maxDelay);

  // Add jitter (0-25% of delay)
  if (config.jitter) {
    const jitterAmount = delay * 0.25 * Math.random();
    delay += jitterAmount;
  }

  return Math.round(delay);
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: AIError | undefined;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = createErrorFromException(error);

      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        throw lastError;
      }

      // Don't retry if max retries reached
      if (attempt >= retryConfig.maxRetries) {
        throw lastError;
      }

      // Calculate delay
      const delay = calculateRetryDelay(attempt, retryConfig, lastError.retryAfter);

      // Wait before retry
      await sleep(delay);
    }
  }

  throw lastError || new AIError('UNKNOWN', 'Retry failed');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Network status detector
 */
export class NetworkStatusDetector {
  private isOnline: boolean;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setOnline(true));
      window.addEventListener('offline', () => this.setOnline(false));
    }
  }

  private setOnline(online: boolean): void {
    if (this.isOnline !== online) {
      this.isOnline = online;
      for (const listener of this.listeners) {
        listener(online);
      }
    }
  }

  /**
   * Check if currently online
   */
  online(): boolean {
    return this.isOnline;
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Wait until online
   */
  waitForOnline(timeoutMs?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isOnline) {
        resolve();
        return;
      }

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const unsubscribe = this.onStatusChange((online) => {
        if (online) {
          if (timeoutId) clearTimeout(timeoutId);
          unsubscribe();
          resolve();
        }
      });

      if (timeoutMs) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new AIError('NETWORK_ERROR', 'Timeout waiting for network'));
        }, timeoutMs);
      }
    });
  }
}

// Singleton network detector
let networkDetector: NetworkStatusDetector | undefined;

export function getNetworkDetector(): NetworkStatusDetector {
  if (!networkDetector) {
    networkDetector = new NetworkStatusDetector();
  }
  return networkDetector;
}

/**
 * Error recovery strategies
 */
export interface RecoveryStrategy {
  /** Strategy name */
  name: string;
  /** Whether this strategy can handle the error */
  canHandle: (error: AIError) => boolean;
  /** Execute the recovery */
  execute: (error: AIError, context: RecoveryContext) => Promise<RecoveryResult>;
}

/**
 * Context for recovery strategies
 */
export interface RecoveryContext {
  /** Retry the original operation */
  retry: () => Promise<unknown>;
  /** Switch to fallback provider */
  switchProvider?: (provider: string) => void;
  /** Current provider name */
  currentProvider?: string;
  /** Available fallback providers */
  fallbackProviders?: string[];
}

/**
 * Result of recovery attempt
 */
export interface RecoveryResult {
  /** Whether recovery succeeded */
  success: boolean;
  /** Result of recovery (if successful) */
  result?: unknown;
  /** New error (if recovery failed) */
  error?: AIError;
  /** Message to show user */
  message?: string;
}

/**
 * Retry recovery strategy
 */
export const retryRecoveryStrategy: RecoveryStrategy = {
  name: 'retry',
  canHandle: (error) => error.retryable,
  execute: async (_error, context) => {
    try {
      const result = await withRetry(() => context.retry());
      return { success: true, result, message: 'Request succeeded after retry' };
    } catch (retryError) {
      return {
        success: false,
        error: createErrorFromException(retryError),
        message: 'Request failed after multiple retries',
      };
    }
  },
};

/**
 * Provider fallback recovery strategy
 */
export const providerFallbackStrategy: RecoveryStrategy = {
  name: 'providerFallback',
  canHandle: (error) =>
    error.category === 'network' ||
    error.code === 'PROVIDER_OFFLINE' ||
    error.code === 'SERVER_ERROR',
  execute: async (error, context) => {
    if (!context.switchProvider || !context.fallbackProviders?.length) {
      return {
        success: false,
        error,
        message: 'No fallback providers available',
      };
    }

    // Find next available provider
    const currentIndex = context.fallbackProviders.indexOf(context.currentProvider || '');
    const nextProvider = context.fallbackProviders[currentIndex + 1];

    if (!nextProvider) {
      return {
        success: false,
        error,
        message: 'All providers exhausted',
      };
    }

    context.switchProvider(nextProvider);

    try {
      const result = await context.retry();
      return {
        success: true,
        result,
        message: `Switched to ${nextProvider} provider`,
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: createErrorFromException(fallbackError),
        message: `Fallback to ${nextProvider} also failed`,
      };
    }
  },
};

/**
 * Error handler with recovery strategies
 */
export class ErrorHandler {
  private strategies: RecoveryStrategy[] = [];
  private onError: ((error: AIError) => void) | undefined;
  private onRecovery: ((result: RecoveryResult) => void) | undefined;

  constructor(options?: {
    onError?: ((error: AIError) => void) | undefined;
    onRecovery?: ((result: RecoveryResult) => void) | undefined;
  }) {
    this.onError = options?.onError;
    this.onRecovery = options?.onRecovery;

    // Add default strategies
    this.addStrategy(retryRecoveryStrategy);
    this.addStrategy(providerFallbackStrategy);
  }

  /**
   * Add a recovery strategy
   */
  addStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Handle an error with recovery
   */
  async handle(error: AIError, context: RecoveryContext): Promise<RecoveryResult> {
    this.onError?.(error);

    // Find applicable strategy
    for (const strategy of this.strategies) {
      if (strategy.canHandle(error)) {
        const result = await strategy.execute(error, context);
        this.onRecovery?.(result);

        if (result.success) {
          return result;
        }
      }
    }

    // No recovery succeeded
    return {
      success: false,
      error,
      message: error.userMessage,
    };
  }

  /**
   * Wrap a function with error handling
   */
  wrap<T>(
    fn: () => Promise<T>,
    context: Partial<RecoveryContext> = {}
  ): Promise<T> {
    const fullContext: RecoveryContext = {
      retry: fn,
      ...context,
    };

    return fn().catch(async (error) => {
      const aiError = createErrorFromException(error);
      const result = await this.handle(aiError, fullContext);

      if (result.success) {
        return result.result as T;
      }

      throw result.error || aiError;
    });
  }
}

/**
 * Create an error handler
 */
export function createErrorHandler(options?: {
  onError?: (error: AIError) => void;
  onRecovery?: (result: RecoveryResult) => void;
}): ErrorHandler {
  return new ErrorHandler(options);
}
