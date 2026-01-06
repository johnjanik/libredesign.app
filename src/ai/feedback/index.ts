/**
 * Visual Feedback Loop Module
 *
 * AI-verified design generation with multi-candidate generation
 * and tiered verification support.
 */

// Types
export * from './types';

// Core Components
export { CandidateRenderer, createCandidateRenderer } from './candidate-renderer';
export type { CandidateRendererConfig } from './candidate-renderer';

// Verifiers
export * from './verifiers';

// Generators
export * from './generators';

// Termination
export * from './termination';

// Feedback Loop Orchestrator
export { FeedbackLoop, createFeedbackLoop } from './feedback-loop';
export type { FeedbackLoopConfig } from './feedback-loop';
