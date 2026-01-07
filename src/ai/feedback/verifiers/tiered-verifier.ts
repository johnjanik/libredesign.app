/**
 * Tiered Verifier
 *
 * Orchestrates verification across tiers:
 * - Standard: Single model verification (user choice)
 * - Advanced: Multi-model consensus with weighted score fusion (premium)
 */

import type {
  DesignIntent,
  ScreenshotData,
  VerificationConfig,
  VerificationResult,
  VerificationModelName,
  ModelVerificationResult,
  VerificationCategories,
  DetailedAnalysis,
  DesignIssue,
  ModelScore,
} from '../types';
import type { Verifier, VerificationRequest } from './base-verifier';
import { ClaudeVerifier } from './claude-verifier';
import { OpenAIVerifier } from './openai-verifier';
import { OllamaVerifier } from './ollama-verifier';

/**
 * Tiered verifier configuration
 */
export interface TieredVerifierConfig {
  /** Default acceptance threshold */
  acceptanceThreshold?: number;
  /** Timeout for verification (ms) */
  timeout?: number;
}

const DEFAULT_CONFIG: Required<TieredVerifierConfig> = {
  acceptanceThreshold: 0.85,
  timeout: 60000,
};

/**
 * Score fusion result
 */
interface FusionResult {
  fusedScore: number;
  consensus: number;
  confidence: number;
  breakdown: ModelScore[];
}

/**
 * Tiered Verifier
 */
export class TieredVerifier {
  private verifiers: Map<VerificationModelName, Verifier> = new Map();
  private config: Required<TieredVerifierConfig>;

  constructor(config: TieredVerifierConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize verifiers
    this.verifiers.set('claude', new ClaudeVerifier());
    this.verifiers.set('openai', new OpenAIVerifier());
    this.verifiers.set('ollama', new OllamaVerifier());
  }

  /**
   * Register a verifier
   */
  registerVerifier(name: VerificationModelName, verifier: Verifier): void {
    this.verifiers.set(name, verifier);
  }

  /**
   * Get a verifier by name
   */
  getVerifier(name: VerificationModelName): Verifier | undefined {
    return this.verifiers.get(name);
  }

  /**
   * Check which verifiers are available
   */
  async getAvailableVerifiers(): Promise<VerificationModelName[]> {
    const available: VerificationModelName[] = [];

    for (const [name, verifier] of this.verifiers) {
      if (await verifier.isAvailable()) {
        available.push(name);
      }
    }

    return available;
  }

  /**
   * Verify a design using the configured tier
   */
  async verify(
    intent: DesignIntent,
    screenshot: ScreenshotData,
    verificationConfig: VerificationConfig
  ): Promise<VerificationResult> {
    const request: VerificationRequest = {
      intent,
      screenshot,
    };

    if (verificationConfig.tier === 'standard') {
      return this.verifyStandard(request, verificationConfig);
    } else {
      return this.verifyAdvanced(request, verificationConfig);
    }
  }

  /**
   * Standard tier verification - single model
   */
  private async verifyStandard(
    request: VerificationRequest,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    const modelName = config.primaryModel ?? 'claude';
    const verifier = this.verifiers.get(modelName);

    if (!verifier) {
      throw new Error(`Verifier not found: ${modelName}`);
    }

    if (!await verifier.isAvailable()) {
      throw new Error(`Verifier not available: ${modelName}`);
    }

    const result = await verifier.verify(request);

    // Parse issues from critique if structured response
    const { issues, strengths, suggestions } = this.parseDetailedInfo(result);

    return {
      overallScore: result.score,
      acceptable: result.score >= this.config.acceptanceThreshold,
      critique: result.critique,
      detailedAnalysis: {
        categories: result.categories,
        issues,
        strengths,
        suggestions,
      },
      modelConsensus: 1.0, // Single model = perfect consensus
      confidence: result.confidence,
      verificationTier: 'standard',
    };
  }

  /**
   * Advanced tier verification - multi-model consensus
   */
  private async verifyAdvanced(
    request: VerificationRequest,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    const advConfig = config.advancedConfig;
    if (!advConfig) {
      throw new Error('Advanced tier requires advancedConfig');
    }

    const enabledModels = advConfig.models.filter(m => m.enabled);
    if (enabledModels.length === 0) {
      throw new Error('No models enabled for advanced verification');
    }

    // Run verifications in parallel
    const verificationPromises = enabledModels.map(async (modelConfig) => {
      const verifier = this.verifiers.get(modelConfig.name);
      if (!verifier || !await verifier.isAvailable()) {
        return null;
      }

      try {
        const result = await verifier.verify(request);
        return {
          model: modelConfig.name,
          weight: modelConfig.weight,
          result,
        };
      } catch (error) {
        console.warn(`Verifier ${modelConfig.name} failed:`, error);
        return null;
      }
    });

    const results = await Promise.all(verificationPromises);
    const validResults = results.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );

    if (validResults.length === 0) {
      throw new Error('All verifiers failed');
    }

    // Fuse scores
    const fusion = this.fuseScores(validResults);

    // Aggregate detailed info
    const aggregatedAnalysis = this.aggregateAnalysis(validResults);

    // Generate consensus critique
    const critique = this.generateConsensusCritique(validResults, fusion);

    return {
      overallScore: fusion.fusedScore,
      acceptable: fusion.fusedScore >= this.config.acceptanceThreshold &&
                  fusion.consensus >= advConfig.consensusThreshold,
      critique,
      detailedAnalysis: aggregatedAnalysis,
      modelConsensus: fusion.consensus,
      confidence: fusion.confidence,
      verificationTier: 'advanced',
      modelBreakdown: fusion.breakdown,
    };
  }

  /**
   * Fuse scores from multiple models using weighted averaging
   */
  private fuseScores(
    results: Array<{
      model: VerificationModelName;
      weight: number;
      result: ModelVerificationResult;
    }>
  ): FusionResult {
    // Normalize weights
    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);

    // Calculate weighted average score
    let fusedScore = 0;
    let weightedConfidence = 0;
    const breakdown: ModelScore[] = [];

    for (const r of results) {
      const normalizedWeight = r.weight / totalWeight;
      fusedScore += r.result.score * normalizedWeight;
      weightedConfidence += r.result.confidence * normalizedWeight;

      breakdown.push({
        model: r.model,
        score: r.result.score,
        weight: normalizedWeight,
        confidence: r.result.confidence,
        critique: r.result.critique,
      });
    }

    // Calculate consensus (agreement between models)
    const scores = results.map(r => r.result.score);
    const consensus = this.calculateConsensus(scores);

    // Adjust confidence based on consensus
    const confidence = weightedConfidence * (0.5 + 0.5 * consensus);

    return {
      fusedScore,
      consensus,
      confidence,
      breakdown,
    };
  }

  /**
   * Calculate consensus (agreement) between model scores
   */
  private calculateConsensus(scores: number[]): number {
    if (scores.length <= 1) return 1.0;

    // Calculate variance
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Convert std dev to consensus (0-1)
    // Low std dev = high consensus
    // Max expected std dev ~0.5 (if scores are 0 and 1)
    const consensus = Math.max(0, 1 - stdDev * 2);

    return consensus;
  }

  /**
   * Aggregate detailed analysis from multiple models
   */
  private aggregateAnalysis(
    results: Array<{
      model: VerificationModelName;
      result: ModelVerificationResult;
    }>
  ): DetailedAnalysis {
    // Average category scores
    const categories: VerificationCategories = {
      layout: 0,
      fidelity: 0,
      completeness: 0,
      polish: 0,
    };

    for (const r of results) {
      categories.layout += r.result.categories.layout;
      categories.fidelity += r.result.categories.fidelity;
      categories.completeness += r.result.categories.completeness;
      categories.polish += r.result.categories.polish;
    }

    const count = results.length;
    categories.layout /= count;
    categories.fidelity /= count;
    categories.completeness /= count;
    categories.polish /= count;

    // Collect all issues, strengths, suggestions
    const allIssues: DesignIssue[] = [];
    const allStrengths: string[] = [];
    const allSuggestions: string[] = [];

    for (const r of results) {
      const { issues, strengths, suggestions } = this.parseDetailedInfo(r.result);
      allIssues.push(...issues);
      allStrengths.push(...strengths);
      allSuggestions.push(...suggestions);
    }

    // Deduplicate and sort by frequency/severity
    const uniqueIssues = this.deduplicateIssues(allIssues);
    const uniqueStrengths = [...new Set(allStrengths)];
    const uniqueSuggestions = [...new Set(allSuggestions)];

    return {
      categories,
      issues: uniqueIssues,
      strengths: uniqueStrengths,
      suggestions: uniqueSuggestions,
    };
  }

  /**
   * Parse detailed info from verification result
   */
  private parseDetailedInfo(result: ModelVerificationResult): {
    issues: DesignIssue[];
    strengths: string[];
    suggestions: string[];
  } {
    const issues: DesignIssue[] = [];
    const strengths: string[] = [];
    const suggestions: string[] = [];

    // Try to parse structured data from raw response
    if (result.rawResponse) {
      try {
        const jsonMatch = result.rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = (jsonMatch && jsonMatch[1]) ? jsonMatch[1] : result.rawResponse;
        const parsed = JSON.parse(jsonStr);

        if (Array.isArray(parsed.issues)) {
          for (const issue of parsed.issues) {
            issues.push({
              type: issue.type ?? 'layout',
              severity: issue.severity ?? 'minor',
              description: issue.description ?? '',
              location: issue.location,
              suggestion: issue.suggestion,
            });
          }
        }

        if (Array.isArray(parsed.strengths)) {
          strengths.push(...parsed.strengths);
        }

        if (Array.isArray(parsed.suggestions)) {
          suggestions.push(...parsed.suggestions);
        }
      } catch {
        // If parsing fails, extract from critique text
        if (result.critique) {
          suggestions.push(result.critique);
        }
      }
    }

    return { issues, strengths, suggestions };
  }

  /**
   * Deduplicate issues by description similarity
   */
  private deduplicateIssues(issues: DesignIssue[]): DesignIssue[] {
    const seen = new Set<string>();
    const unique: DesignIssue[] = [];

    for (const issue of issues) {
      // Create a key based on type and description
      const key = `${issue.type}:${issue.description.toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(issue);
      }
    }

    // Sort by severity (critical > major > minor)
    const severityOrder = { critical: 0, major: 1, minor: 2 };
    unique.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return unique;
  }

  /**
   * Generate a consensus critique from multiple model results
   */
  private generateConsensusCritique(
    results: Array<{
      model: VerificationModelName;
      result: ModelVerificationResult;
    }>,
    fusion: FusionResult
  ): string {
    const lines: string[] = [];

    // Summary
    lines.push(`Multi-model verification (${results.length} models)`);
    lines.push(`Fused score: ${(fusion.fusedScore * 100).toFixed(1)}%`);
    lines.push(`Consensus: ${(fusion.consensus * 100).toFixed(1)}%`);
    lines.push('');

    // Individual model summaries
    lines.push('Model breakdown:');
    for (const item of fusion.breakdown) {
      lines.push(`- ${item.model}: ${(item.score * 100).toFixed(1)}% (weight: ${(item.weight * 100).toFixed(0)}%)`);
    }
    lines.push('');

    // Aggregate critique
    const critiques = results.map(r => r.result.critique).filter((c): c is string => Boolean(c));
    if (critiques.length > 0 && critiques[0]) {
      lines.push('Key observations:');
      lines.push(critiques[0]); // Use first model's critique as primary
    }

    return lines.join('\n');
  }

  /**
   * Configure acceptance threshold
   */
  setAcceptanceThreshold(threshold: number): void {
    this.config.acceptanceThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Get current acceptance threshold
   */
  getAcceptanceThreshold(): number {
    return this.config.acceptanceThreshold;
  }
}

/**
 * Create a tiered verifier instance
 */
export function createTieredVerifier(
  config?: TieredVerifierConfig
): TieredVerifier {
  return new TieredVerifier(config);
}
