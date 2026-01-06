/**
 * Feedback Loop Orchestrator
 *
 * Main orchestrator for the visual verification feedback loop.
 * Coordinates generators, renderers, verifiers, and termination.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { AIProvider } from '@ai/providers/ai-provider';
import type { CanvasCapture } from '@ai/vision/canvas-capture';
import type { ToolExecutor } from '@ai/tools/tool-executor';
import type {
  DesignIntent,
  DesignCandidate,
  DesignResult,
  FeedbackIteration,
  FeedbackLoopOptions,
  ScoredCandidate,
  QualityScore,
  PerformanceMetrics,
  AdaptiveConfig,
  TemperatureSchedule,
  VerificationConfig,
  DesignAnalytics,
  ConvergenceAnalysis,
  GenerationStrategy,
} from './types';
import {
  DEFAULT_FEEDBACK_OPTIONS,
  DEFAULT_ADAPTIVE_CONFIG,
  DEFAULT_TEMPERATURE_SCHEDULE,
  QUALITY_COMPONENT_WEIGHTS,
  generateId,
} from './types';
import { CandidateRenderer, createCandidateRenderer } from './candidate-renderer';
import { TieredVerifier, createTieredVerifier } from './verifiers';
import { StrategyManager, createStrategyManager } from './generators';
import { TerminationManager, createTerminationManager } from './termination';
import type { GenerationContext } from './generators/base-generator';

/**
 * Feedback loop configuration
 */
export interface FeedbackLoopConfig {
  /** Runtime instance */
  runtime: DesignLibreRuntime;
  /** Canvas capture instance */
  canvasCapture: CanvasCapture;
  /** Tool executor instance */
  toolExecutor: ToolExecutor;
  /** AI provider for generation */
  provider: AIProvider;
  /** Available tools for design generation */
  availableTools?: string[];
}

/**
 * Visual Feedback Loop
 */
export class FeedbackLoop {
  private runtime: DesignLibreRuntime;
  private candidateRenderer: CandidateRenderer;
  private tieredVerifier: TieredVerifier;
  private strategyManager: StrategyManager;
  private terminationManager: TerminationManager;
  private provider: AIProvider;
  private availableTools: string[];
  private adaptiveConfig: AdaptiveConfig;
  private temperatureSchedule: TemperatureSchedule;

  constructor(config: FeedbackLoopConfig) {
    this.runtime = config.runtime;
    this.provider = config.provider;
    this.availableTools = config.availableTools ?? this.getDefaultTools();

    // Initialize components
    this.candidateRenderer = createCandidateRenderer(
      config.runtime,
      config.canvasCapture,
      config.toolExecutor
    );

    this.tieredVerifier = createTieredVerifier();
    this.strategyManager = createStrategyManager();
    this.terminationManager = createTerminationManager();

    // Set providers
    this.strategyManager.setProvider(config.provider);

    // Initialize adaptive configuration
    this.adaptiveConfig = { ...DEFAULT_ADAPTIVE_CONFIG };
    this.temperatureSchedule = { ...DEFAULT_TEMPERATURE_SCHEDULE };
  }

  /**
   * Run the feedback loop
   */
  async run(
    intent: DesignIntent,
    options: FeedbackLoopOptions = {}
  ): Promise<DesignResult> {
    const mergedOptions = { ...DEFAULT_FEEDBACK_OPTIONS, ...options };
    const startTime = Date.now();
    const iterations: FeedbackIteration[] = [];
    let bestCandidate: ScoredCandidate | null = null;
    let terminationReason = 'unknown';

    try {
      // Iteration loop
      for (let iteration = 1; iteration <= mergedOptions.maxIterations; iteration++) {
        const iterationStartTime = Date.now();

        // Build generation context
        const generationContext: GenerationContext = {
          intent,
          iteration,
          previousCandidates: iterations.flatMap(i => i.candidates),
          bestCandidate: bestCandidate ?? undefined,
          availableTools: this.availableTools,
        };

        // Update temperature based on schedule
        this.updateTemperature(iteration);

        // Generate candidates
        const generationStart = performance.now();
        const candidates = await this.strategyManager.generateCandidates(
          generationContext,
          mergedOptions.candidatesPerIteration,
          this.adaptiveConfig
        );
        const generationTimeMs = performance.now() - generationStart;

        // Get strategies used
        const strategiesUsed = this.getStrategiesUsed(candidates);

        // Render candidates
        const renderStart = performance.now();
        const renderedCandidates = await this.candidateRenderer.renderCandidatesParallel(
          candidates
        );
        const renderTimeMs = performance.now() - renderStart;

        // Filter successfully rendered
        const successfullyRendered = renderedCandidates.filter(r => r.renderSuccessful);

        // Verify candidates
        const verificationStart = performance.now();
        const scoredCandidates: ScoredCandidate[] = [];

        for (const rendered of successfullyRendered) {
          if (!rendered.screenshot) continue;

          // Notify progress with screenshot
          if (options.onScreenshot) {
            options.onScreenshot(rendered.screenshot, rendered.candidate.id);
          }

          // Verify
          const verification = await this.tieredVerifier.verify(
            intent,
            rendered.screenshot,
            mergedOptions.verification
          );

          // Calculate quality score
          const qualityScore = this.calculateQualityScore(verification);

          scoredCandidates.push({
            candidate: rendered.candidate,
            rendered,
            verification,
            qualityScore,
          });
        }
        const verificationTimeMs = performance.now() - verificationStart;

        // Find best candidate
        const iterationBest = this.findBestCandidate(scoredCandidates);
        if (iterationBest && (!bestCandidate || iterationBest.qualityScore.overall > bestCandidate.qualityScore.overall)) {
          bestCandidate = iterationBest;
        }

        // Build iteration record
        const iterationRecord: FeedbackIteration = {
          iteration,
          timestamp: Date.now(),
          candidates: scoredCandidates,
          bestCandidate: iterationBest ?? bestCandidate!,
          terminationCheck: { shouldTerminate: false, confidence: 0, strategyBreakdown: [] },
          performanceMetrics: {
            totalTimeMs: Date.now() - iterationStartTime,
            renderTimeMs,
            verificationTimeMs,
            generationTimeMs,
            apiCalls: scoredCandidates.length + 1, // verification + generation
          },
          strategiesUsed,
        };

        // Check termination
        iterations.push(iterationRecord);
        const terminationDecision = this.terminationManager.evaluate(iterations, {
          maxIterations: mergedOptions.maxIterations,
          qualityThreshold: mergedOptions.qualityThreshold,
          startTime,
          timeoutMs: mergedOptions.timeoutMs,
        });

        iterationRecord.terminationCheck = terminationDecision;

        // Notify progress
        if (options.onProgress) {
          options.onProgress(iterationRecord);
        }

        // Update adaptive config
        this.updateAdaptiveConfig(iterationRecord);

        // Check termination
        if (terminationDecision.shouldTerminate) {
          terminationReason = terminationDecision.reason ?? 'Termination criteria met';
          break;
        }

        // Early stopping
        if (mergedOptions.enableEarlyStopping && bestCandidate) {
          if (bestCandidate.qualityScore.overall >= mergedOptions.qualityThreshold) {
            terminationReason = 'Quality threshold met';
            break;
          }
        }
      }

      // Build result
      if (!bestCandidate) {
        throw new Error('No candidates were successfully generated and verified');
      }

      const analytics = this.buildAnalytics(iterations);

      return {
        success: bestCandidate.qualityScore.overall >= mergedOptions.qualityThreshold,
        finalCandidate: bestCandidate.candidate,
        finalScreenshot: bestCandidate.rendered.screenshot!,
        qualityScore: bestCandidate.qualityScore,
        iterations,
        totalIterations: iterations.length,
        totalTimeMs: Date.now() - startTime,
        terminationReason,
        analytics,
      };
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (bestCandidate) {
        return {
          success: false,
          finalCandidate: bestCandidate.candidate,
          finalScreenshot: bestCandidate.rendered.screenshot!,
          qualityScore: bestCandidate.qualityScore,
          iterations,
          totalIterations: iterations.length,
          totalTimeMs: Date.now() - startTime,
          terminationReason: `Error: ${errorMessage}`,
        };
      }

      throw error;
    }
  }

  /**
   * Calculate quality score from verification result
   */
  private calculateQualityScore(verification: ScoredCandidate['verification']): QualityScore {
    const categories = verification.detailedAnalysis.categories;

    // Calculate component scores
    const components = [
      {
        name: 'visual_fidelity' as const,
        weight: QUALITY_COMPONENT_WEIGHTS.visual_fidelity,
        score: categories.fidelity,
        confidence: verification.confidence,
      },
      {
        name: 'technical_correctness' as const,
        weight: QUALITY_COMPONENT_WEIGHTS.technical_correctness,
        score: (categories.layout + categories.completeness) / 2,
        confidence: verification.confidence,
      },
      {
        name: 'design_principles' as const,
        weight: QUALITY_COMPONENT_WEIGHTS.design_principles,
        score: categories.polish,
        confidence: verification.confidence,
      },
      {
        name: 'intent_alignment' as const,
        weight: QUALITY_COMPONENT_WEIGHTS.intent_alignment,
        score: verification.overallScore,
        confidence: verification.confidence,
      },
    ];

    // Calculate weighted overall score
    const overall = components.reduce(
      (sum, c) => sum + c.score * c.weight,
      0
    );

    // Calculate improvement potential (inverse of score)
    const improvementPotential = Math.max(0, 1 - overall);

    return {
      overall,
      components,
      confidence: verification.confidence,
      normalizedScore: Math.round(overall * 100),
      improvementPotential,
    };
  }

  /**
   * Find the best candidate from a list
   */
  private findBestCandidate(candidates: ScoredCandidate[]): ScoredCandidate | null {
    if (candidates.length === 0) return null;

    return candidates.reduce((best, current) =>
      current.qualityScore.overall > best.qualityScore.overall ? current : best
    );
  }

  /**
   * Get strategies used in this batch
   */
  private getStrategiesUsed(candidates: DesignCandidate[]): GenerationStrategy[] {
    const strategies = new Set<GenerationStrategy>();
    for (const c of candidates) {
      strategies.add(c.generationMethod);
    }
    return Array.from(strategies);
  }

  /**
   * Update temperature based on schedule
   */
  private updateTemperature(iteration: number): void {
    const { initial, min, decayRate } = this.temperatureSchedule;
    const decayed = initial * Math.pow(1 - decayRate, iteration - 1);
    this.adaptiveConfig.temperature = Math.max(min, decayed);
  }

  /**
   * Update adaptive config based on iteration results
   */
  private updateAdaptiveConfig(iteration: FeedbackIteration): void {
    const scores = iteration.candidates.map(c => c.qualityScore.overall);

    if (scores.length < 2) return;

    // Calculate score variance
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;

    // Adjust exploration rate based on variance
    // High variance = good exploration, low variance = need more exploration
    if (variance < 0.01) {
      this.adaptiveConfig.explorationRate = Math.min(0.8, this.adaptiveConfig.explorationRate + 0.1);
    } else if (variance > 0.05) {
      this.adaptiveConfig.explorationRate = Math.max(0.1, this.adaptiveConfig.explorationRate - 0.05);
    }

    // Adjust diversity requirement based on improvement
    if (iteration.iteration > 1) {
      const prevBest = iteration.candidates
        .find(c => c.candidate.parentId !== undefined)?.qualityScore.overall ?? 0;
      const currentBest = iteration.bestCandidate.qualityScore.overall;

      if (currentBest <= prevBest) {
        // Not improving, need more diversity
        this.adaptiveConfig.minDiversity = Math.min(0.5, this.adaptiveConfig.minDiversity + 0.05);
      }
    }
  }

  /**
   * Build analytics from iterations
   */
  private buildAnalytics(iterations: FeedbackIteration[]): DesignAnalytics {
    // Score progression
    const scoreProgression = iterations.map(i => i.bestCandidate.qualityScore.overall);

    // Strategy effectiveness
    const strategyScores = new Map<GenerationStrategy, number[]>();
    for (const iteration of iterations) {
      for (const candidate of iteration.candidates) {
        const strategy = candidate.candidate.generationMethod;
        if (!strategyScores.has(strategy)) {
          strategyScores.set(strategy, []);
        }
        strategyScores.get(strategy)!.push(candidate.qualityScore.overall);
      }
    }

    const strategyEffectiveness: Record<GenerationStrategy, number> = {} as any;
    for (const [strategy, scores] of strategyScores) {
      strategyEffectiveness[strategy] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    // Average iteration time
    const avgIterationTimeMs = iterations.reduce(
      (sum, i) => sum + i.performanceMetrics.totalTimeMs,
      0
    ) / iterations.length;

    // Total cost estimate
    const totalCostEstimate = iterations.reduce(
      (sum, i) => sum + (i.performanceMetrics.estimatedCost ?? 0),
      0
    );

    // Convergence analysis
    const convergenceAnalysis = this.analyzeConvergence(scoreProgression);

    return {
      scoreProgression,
      strategyEffectiveness,
      avgIterationTimeMs,
      totalCostEstimate,
      convergenceAnalysis,
    };
  }

  /**
   * Analyze convergence pattern
   */
  private analyzeConvergence(scores: number[]): ConvergenceAnalysis {
    if (scores.length < 3) {
      return {
        converged: false,
        convergenceRate: 0,
        oscillationDetected: false,
        plateauDetected: false,
      };
    }

    // Check for oscillation
    let directionChanges = 0;
    for (let i = 2; i < scores.length; i++) {
      const prev = scores[i - 1] - scores[i - 2];
      const curr = scores[i] - scores[i - 1];
      if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
        directionChanges++;
      }
    }
    const oscillationDetected = directionChanges / (scores.length - 2) > 0.5;

    // Check for plateau
    const recent = scores.slice(-4);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / recent.length;
    const plateauDetected = variance < 0.001;

    // Calculate convergence rate
    const improvements = [];
    for (let i = 1; i < scores.length; i++) {
      improvements.push(scores[i] - scores[i - 1]);
    }
    const convergenceRate = improvements.length > 0
      ? Math.abs(improvements.reduce((a, b) => a + b, 0) / improvements.length)
      : 0;

    return {
      converged: plateauDetected && !oscillationDetected,
      convergenceRate,
      oscillationDetected,
      plateauDetected,
    };
  }

  /**
   * Get default available tools
   */
  private getDefaultTools(): string[] {
    return [
      'create_frame',
      'create_rectangle',
      'create_ellipse',
      'create_text',
      'create_line',
      'set_fill',
      'set_stroke',
      'set_corner_radius',
      'set_opacity',
      'move_layer',
      'resize_layer',
      'set_auto_layout',
      'add_effect',
      'group_layers',
    ];
  }

  /**
   * Set the AI provider
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
    this.strategyManager.setProvider(provider);
  }

  /**
   * Set verification providers
   */
  setVerificationProvider(name: 'claude' | 'openai' | 'ollama', provider: AIProvider): void {
    const verifier = this.tieredVerifier.getVerifier(name);
    if (verifier && 'setProvider' in verifier) {
      (verifier as { setProvider: (p: AIProvider) => void }).setProvider(provider);
    }
  }

  /**
   * Configure options
   */
  configure(options: {
    adaptiveConfig?: Partial<AdaptiveConfig>;
    temperatureSchedule?: Partial<TemperatureSchedule>;
  }): void {
    if (options.adaptiveConfig) {
      this.adaptiveConfig = { ...this.adaptiveConfig, ...options.adaptiveConfig };
    }
    if (options.temperatureSchedule) {
      this.temperatureSchedule = { ...this.temperatureSchedule, ...options.temperatureSchedule };
    }
  }
}

/**
 * Create a feedback loop instance
 */
export function createFeedbackLoop(config: FeedbackLoopConfig): FeedbackLoop {
  return new FeedbackLoop(config);
}
