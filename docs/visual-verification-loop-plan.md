# Visual Verification Loop Implementation Plan

## Goal
Achieve **95% success rate**: users get the design they want through AI assistance with multi-model visual verification and adaptive iteration.

---

## Executive Summary

This plan implements a **sophisticated visual feedback loop** with:
- Multi-candidate generation (3+ per iteration)
- Multi-model verification with confidence fusion
- 5 generation strategies (refinement, crossover, mutation, fresh, diversity)
- Progressive refinement stages (layout → style → details)
- Adaptive self-tuning configuration
- Production-grade resilience (circuit breakers, graceful degradation)

---

## Phase 1: Core Infrastructure

### 1.1 Type Definitions
**File**: `src/ai/feedback/types.ts`

```typescript
// Core types for the feedback system
interface DesignIntent {
  description: string;
  constraints?: DesignConstraint[];
  references?: ReferenceImage[];
  style?: StylePreferences;
}

interface DesignCandidate {
  id: string;
  seed: string;  // Our internal representation (tool calls or scene state)
  generationMethod: GenerationStrategy;
  parentId?: string;
  iterationBorn: number;
  metadata: Record<string, unknown>;
}

interface RenderedCandidate {
  candidate: DesignCandidate;
  screenshot: {
    full: string;      // base64
    thumbnail: string; // base64
    dimensions: { width: number; height: number };
  };
  renderSuccessful: boolean;
  error?: string;
}

interface ScoredCandidate {
  candidate: DesignCandidate;
  rendered: RenderedCandidate;
  verification: VerificationResult;
  qualityScore: QualityScore;
}

interface VerificationResult {
  overallScore: number;       // 0-1
  acceptable: boolean;
  critique: string;
  detailedAnalysis: DetailedAnalysis;
  modelConsensus: number;     // Agreement between models
  confidence: number;
  modelBreakdown?: ModelScore[];
}

interface QualityScore {
  overall: number;
  components: QualityComponent[];
  confidence: number;
  improvementPotential: number;
}

interface QualityComponent {
  name: 'visual_fidelity' | 'technical_correctness' | 'design_principles' | 'intent_alignment';
  weight: number;
  score: number;
  confidence: number;
}

type GenerationStrategy = 'refinement' | 'crossover' | 'mutation' | 'fresh' | 'diversity';

interface FeedbackIteration {
  iteration: number;
  timestamp: number;
  candidates: ScoredCandidate[];
  bestCandidate: ScoredCandidate;
  terminationCheck: TerminationDecision;
  performanceMetrics: PerformanceMetrics;
}

interface FeedbackLoopOptions {
  maxIterations?: number;           // Default: 10
  qualityThreshold?: number;        // Default: 0.85
  timeoutMs?: number;               // Default: 30000
  enableEarlyStopping?: boolean;    // Default: true
  parallelVerification?: boolean;   // Default: true
  candidatesPerIteration?: number;  // Default: 3
  onProgress?: (iteration: FeedbackIteration) => void;
}
```

### 1.2 Candidate Renderer
**File**: `src/ai/feedback/candidate-renderer.ts`

Responsibilities:
- Execute tool calls to create design
- Wait for render completion
- Capture screenshot at multiple resolutions
- Handle render failures gracefully

```typescript
class CandidateRenderer {
  async renderCandidate(candidate: DesignCandidate): Promise<RenderedCandidate>;
  async renderCandidatesParallel(candidates: DesignCandidate[]): Promise<RenderedCandidate[]>;
}
```

### 1.3 Screenshot Capture Enhancement
**File**: `src/ai/vision/canvas-capture.ts` (enhance existing)

Add:
- Multi-resolution capture (full + thumbnail)
- Region-specific capture
- Consistent timing (wait for GPU flush)
- Format options (PNG quality levels)

### Deliverables
- [ ] Type definitions in `src/ai/feedback/types.ts`
- [ ] `CandidateRenderer` class
- [ ] Enhanced `CanvasCapture` with multi-resolution support

---

## Phase 2: Tiered Verification Engine

### 2.1 Verification Tiers

The verification system supports two tiers to balance cost, speed, and accuracy:

| Tier | Models | Use Case | Cost |
|------|--------|----------|------|
| **Standard** | Single model (user choice) | Default, cost-effective | $ |
| **Advanced** | Multi-model consensus | Higher accuracy, premium feature | $$$ |

### 2.2 Verification Model Interface
**File**: `src/ai/feedback/verifiers/verifier-interface.ts`

```typescript
interface VerificationModel {
  name: string;
  type: 'local' | 'cloud';
  weight: number;  // For consensus fusion (Advanced tier)
  verify(
    screenshot: string,
    intent: DesignIntent
  ): Promise<ModelVerificationResult>;
}

interface ModelVerificationResult {
  score: number;
  confidence: number;
  critique: string;
  categories: {
    layout: number;
    fidelity: number;
    completeness: number;
    polish: number;
  };
}

type VerificationTier = 'standard' | 'advanced';

interface VerificationConfig {
  tier: VerificationTier;
  // Standard tier: single model selection
  primaryModel?: 'claude' | 'openai' | 'ollama';
  // Advanced tier: multi-model with weights
  advancedConfig?: {
    models: Array<{
      name: 'claude' | 'openai' | 'ollama';
      weight: number;
      enabled: boolean;
    }>;
    consensusThreshold: number;  // Minimum agreement required
  };
}
```

### 2.3 Available Verification Models

#### 2.3.1 Claude Vision Verifier
**File**: `src/ai/feedback/verifiers/claude-verifier.ts`

- Uses existing AnthropicProvider
- Structured JSON response parsing
- Score normalization
- **Best for**: Detailed critique, nuanced understanding

#### 2.3.2 OpenAI Vision Verifier
**File**: `src/ai/feedback/verifiers/openai-verifier.ts`

- Uses existing OpenAIProvider with GPT-4V
- Parallel verification support
- **Best for**: Fast flagship verification

#### 2.3.3 Local Vision Verifier (Ollama)
**File**: `src/ai/feedback/verifiers/local-verifier.ts`

- Uses LLaVA, LLaVA-Next, or Qwen2-VL
- No API costs, runs locally
- Fast preliminary checks
- **Best for**: Cost-conscious users, offline use, privacy

#### 2.3.4 Computer Vision Verifier (Always Active)
**File**: `src/ai/feedback/verifiers/cv-verifier.ts`

- Traditional CV for basic sanity checks (always runs first):
  - Is anything rendered? (not blank)
  - Is layout obviously broken? (elements off-screen)
  - Basic color contrast checks
- Very fast, no API calls
- **Acts as fail-fast gate before AI verification**

### 2.4 Standard Tier Verifier
**File**: `src/ai/feedback/standard-verifier.ts`

Single-model verification for cost-effective operation:

```typescript
class StandardVerifier {
  private cvVerifier = new ComputerVisionVerifier();
  private activeModel: VerificationModel;

  constructor(modelChoice: 'claude' | 'openai' | 'ollama') {
    this.activeModel = this.createModel(modelChoice);
  }

  async verify(
    rendered: RenderedCandidate,
    intent: DesignIntent
  ): Promise<VerificationResult> {
    // 1. Fast CV sanity check (fail-fast)
    const cvResult = await this.cvVerifier.verify(rendered.screenshot);
    if (!cvResult.basicChecksPassed) {
      return earlyRejection(cvResult);
    }

    // 2. Single model verification
    const result = await this.activeModel.verify(rendered.screenshot, intent);

    return {
      ...result,
      modelConsensus: 1.0,  // Single model = full "consensus"
      verificationTier: 'standard'
    };
  }
}
```

### 2.5 Advanced Tier Verifier (Premium Feature)
**File**: `src/ai/feedback/advanced-verifier.ts`

Multi-model consensus for maximum accuracy:

```typescript
class AdvancedVerifier {
  private models: VerificationModel[];
  private cvVerifier = new ComputerVisionVerifier();
  private consensusThreshold: number;

  constructor(config: AdvancedVerificationConfig) {
    this.models = config.models
      .filter(m => m.enabled)
      .map(m => this.createModel(m.name, m.weight));
    this.consensusThreshold = config.consensusThreshold ?? 0.7;
  }

  async verify(
    rendered: RenderedCandidate,
    intent: DesignIntent
  ): Promise<VerificationResult> {
    // 1. Fast CV sanity check (fail-fast)
    const cvResult = await this.cvVerifier.verify(rendered.screenshot);
    if (!cvResult.basicChecksPassed) {
      return earlyRejection(cvResult);
    }

    // 2. Parallel multi-model verification
    const results = await Promise.allSettled(
      this.models.map(m => m.verify(rendered.screenshot, intent))
    );

    // Filter successful results
    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<ModelVerificationResult> =>
        r.status === 'fulfilled')
      .map(r => r.value);

    if (successfulResults.length === 0) {
      throw new Error('All verification models failed');
    }

    // 3. Weighted consensus fusion
    return this.fuseResults(successfulResults);
  }

  private fuseResults(results: ModelVerificationResult[]): VerificationResult {
    const weights = this.models.map(m => m.weight);
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    // Weighted average score
    const weightedScore = results.reduce((sum, r, i) =>
      sum + r.score * (weights[i] / totalWeight), 0
    );

    // Calculate model consensus (agreement level)
    const scores = results.map(r => r.score);
    const variance = this.calculateVariance(scores);
    const consensus = Math.max(0, 1 - variance * 2);  // Low variance = high consensus

    // Combine critiques (prioritize by weight)
    const combinedCritique = this.combineCritiques(results, weights);

    return {
      overallScore: weightedScore,
      acceptable: weightedScore >= 0.7 && consensus >= this.consensusThreshold,
      critique: combinedCritique,
      modelConsensus: consensus,
      confidence: consensus * (successfulResults.length / this.models.length),
      verificationTier: 'advanced',
      modelBreakdown: results.map((r, i) => ({
        model: this.models[i].name,
        score: r.score,
        weight: weights[i],
        critique: r.critique
      }))
    };
  }
}
```

### 2.6 Verification Factory
**File**: `src/ai/feedback/verification-factory.ts`

```typescript
class VerificationFactory {
  static create(config: VerificationConfig): StandardVerifier | AdvancedVerifier {
    if (config.tier === 'advanced' && config.advancedConfig) {
      return new AdvancedVerifier(config.advancedConfig);
    }
    return new StandardVerifier(config.primaryModel ?? 'claude');
  }
}
```

### 2.7 User Settings Integration

```typescript
interface FeedbackLoopOptions {
  // ... existing options ...

  verification?: {
    tier: 'standard' | 'advanced';
    // Standard: which single model to use
    model?: 'claude' | 'openai' | 'ollama';
    // Advanced: custom weights and selection
    advancedModels?: Array<{
      name: 'claude' | 'openai' | 'ollama';
      weight: number;
      enabled: boolean;
    }>;
  };
}
```

### Deliverables
- [ ] `VerificationModel` interface with tier support
- [ ] `ClaudeVisionVerifier` implementation
- [ ] `OpenAIVisionVerifier` implementation
- [ ] `LocalVisionVerifier` (Ollama/LLaVA)
- [ ] `ComputerVisionVerifier` (always-on sanity check)
- [ ] `StandardVerifier` (single model)
- [ ] `AdvancedVerifier` (multi-model consensus) - Premium
- [ ] `VerificationFactory` for tier selection
- [ ] UI for model selection in settings

---

## Phase 3: Adaptive Generation Engine

### 3.1 Generation Strategies
**File**: `src/ai/feedback/generators/`

Five strategies:

#### 3.1.1 Refinement Strategy
- Take best candidate
- Generate focused improvements based on critique
- Low temperature, targeted changes

#### 3.1.2 Crossover Strategy
- Combine elements from multiple good candidates
- Tournament selection for parents
- Extract and recombine design components

#### 3.1.3 Mutation Strategy
- Random variations of good candidates
- Higher temperature
- Explore nearby design space

#### 3.1.4 Fresh Strategy
- Generate completely new designs from intent
- High temperature
- Escape local optima

#### 3.1.5 Diversity Strategy
- Generate deliberately different alternatives
- Maximize design space coverage
- Prevent convergence to single solution

### 3.2 Strategy Selector
**File**: `src/ai/feedback/strategy-selector.ts`

```typescript
class StrategySelector {
  selectStrategies(
    iteration: number,
    history: FeedbackIteration[],
    config: AdaptiveConfig
  ): GenerationStrategy[] {
    // Early iterations: more exploration (fresh, diversity)
    // Later iterations: more exploitation (refinement, crossover)
    // Stalled progress: increase diversity
    // Near threshold: focus on refinement
  }
}
```

### 3.3 Adaptive Generator
**File**: `src/ai/feedback/adaptive-generator.ts`

```typescript
class AdaptiveGenerator {
  private explorationRate: number = 0.3;
  private temperatureSchedule: TemperatureSchedule;
  private strategySelector: StrategySelector;

  async generateNext(
    previousCandidates: ScoredCandidate[],
    intent: DesignIntent,
    iteration: number,
    config: AdaptiveConfig
  ): Promise<DesignCandidate[]> {
    const strategies = this.strategySelector.selectStrategies(
      iteration, history, config
    );

    // Execute strategies in parallel
    const candidates = await Promise.all(
      strategies.map(s => this.executeStrategy(s, previousCandidates, intent))
    );

    return this.deduplicateAndRank(candidates.flat());
  }
}
```

### Deliverables
- [ ] `RefinementStrategy` class
- [ ] `CrossoverStrategy` class
- [ ] `MutationStrategy` class
- [ ] `FreshStrategy` class
- [ ] `DiversityStrategy` class
- [ ] `StrategySelector` with adaptive selection
- [ ] `AdaptiveGenerator` orchestrating all strategies

---

## Phase 4: Progressive Refinement System

### 4.1 Refinement Stages
**File**: `src/ai/feedback/progressive-refinement.ts`

Three stages with focused verification:

```typescript
const REFINEMENT_STAGES: RefinementStage[] = [
  {
    name: 'layout',
    focus: ['position', 'size', 'hierarchy', 'structure'],
    verificationWeight: 0.3,
    maxIterations: 3,
    verificationPrompt: 'Focus on layout: Are elements positioned correctly? Is hierarchy clear?'
  },
  {
    name: 'style',
    focus: ['colors', 'typography', 'spacing', 'visual_rhythm'],
    verificationWeight: 0.4,
    maxIterations: 4,
    verificationPrompt: 'Focus on styling: Are colors appropriate? Is typography readable?'
  },
  {
    name: 'details',
    focus: ['effects', 'polish', 'consistency', 'finishing'],
    verificationWeight: 0.3,
    maxIterations: 3,
    verificationPrompt: 'Focus on polish: Are details refined? Is it production-ready?'
  }
];
```

### 4.2 Stage-Specific Verification
- Each stage uses focused verification prompts
- Stage completion criteria differ
- Progressive quality accumulation

### Deliverables
- [ ] `ProgressiveRefinementSystem` class
- [ ] Stage-specific verification prompts
- [ ] Stage transition logic

---

## Phase 5: Intelligent Termination

### 5.1 Termination Strategies
**File**: `src/ai/feedback/termination/`

```typescript
interface TerminationStrategy {
  name: string;
  shouldTerminate(
    current: FeedbackIteration,
    history: FeedbackIteration[]
  ): { terminate: boolean; confidence: number; reason?: string };
}
```

Strategies:

1. **QualityThresholdStrategy** - Score >= threshold (0.85)
2. **ConvergenceDetectionStrategy** - Score stopped improving (window=3, epsilon=0.01)
3. **DiminishingReturnsStrategy** - Improvement < minImprovement (0.02)
4. **TimeoutStrategy** - Total time > maxTimeMs (30s)
5. **DiversityDepletionStrategy** - All candidates too similar

### 5.2 Termination Controller
**File**: `src/ai/feedback/termination-controller.ts`

```typescript
class TerminationController {
  shouldTerminate(
    current: FeedbackIteration,
    history: FeedbackIteration[]
  ): TerminationDecision {
    const decisions = this.strategies.map(s => s.shouldTerminate(current, history));
    return this.fuseDecisions(decisions);  // Weighted fusion
  }
}
```

### Deliverables
- [ ] 5 termination strategy implementations
- [ ] `TerminationController` with weighted fusion
- [ ] Alternative suggestions when not terminating

---

## Phase 6: Main Feedback Loop Controller

### 6.1 Visual Feedback Controller
**File**: `src/ai/feedback/visual-feedback-controller.ts`

```typescript
class VisualFeedbackController {
  constructor(
    private generator: AdaptiveGenerator,
    private verifier: MultiModelVerifier,
    private renderer: CandidateRenderer,
    private termination: TerminationController,
    private config: AdaptiveConfigurationManager
  ) {}

  async execute(
    intent: DesignIntent,
    options: FeedbackLoopOptions
  ): Promise<DesignResult> {
    // Phase 1: Generate diverse initial candidates
    let candidates = await this.generator.generateInitial(intent, { count: 3 });

    // Main loop
    for (let i = 0; i < options.maxIterations; i++) {
      // Step 1: Render candidates in parallel
      const rendered = await this.renderer.renderCandidatesParallel(candidates);

      // Step 2: Multi-model verification in parallel
      const verified = await this.verifyCandidates(rendered, intent);

      // Step 3: Score and rank
      const scored = this.scoreCandidates(verified);

      // Step 4: Check termination
      const best = this.selectBest(scored);
      const shouldStop = this.termination.shouldTerminate(best, this.history);

      // Record iteration
      this.history.push({ iteration: i + 1, candidates: scored, best, ... });
      options.onProgress?.(this.history[this.history.length - 1]);

      if (shouldStop.terminate) {
        return this.prepareFinalResult(best);
      }

      // Step 5: Generate next candidates
      candidates = await this.generator.generateNext(scored, intent, i);

      // Adapt configuration
      this.config.updateBasedOnHistory(this.history);
    }

    return this.prepareFinalResult(this.selectBestFromHistory());
  }
}
```

### Deliverables
- [ ] `VisualFeedbackController` class
- [ ] Integration with all subsystems
- [ ] Progress event emission
- [ ] Final result preparation

---

## Phase 7: Quality Metrics & Analytics

### 7.1 Quality Metrics Analyzer
**File**: `src/ai/feedback/quality-metrics.ts`

4-component quality scoring:

```typescript
const QUALITY_COMPONENTS = [
  { name: 'visual_fidelity', weight: 0.4 },      // Does it look like intent?
  { name: 'technical_correctness', weight: 0.2 }, // Valid structure?
  { name: 'design_principles', weight: 0.2 },     // Good design patterns?
  { name: 'intent_alignment', weight: 0.2 }       // Matches user request?
];
```

### 7.2 Convergence Analysis
- Detect if scores are converging
- Detect oscillation (alternating scores)
- Detect plateaus (stuck at same score)
- Recommend actions based on patterns

### 7.3 Analytics Dashboard Data
- Iteration history with scores
- Model consensus tracking
- Strategy effectiveness
- Time/cost analysis

### Deliverables
- [ ] `QualityMetricsAnalyzer` class
- [ ] Convergence detection algorithms
- [ ] Analytics data structures

---

## Phase 8: Resilience & Error Handling

### 8.1 Circuit Breaker
**File**: `src/ai/feedback/resilience/circuit-breaker.ts`

```typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private threshold = 5;
  private resetTimeout = 60000;

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>;
}
```

### 8.2 Graceful Degradation
**File**: `src/ai/feedback/resilience/degradation-manager.ts`

Fallback chain:
1. **Vision model timeout** → Fall back to local vision
2. **Render failure** → Generate synthetic preview
3. **All models fail** → Rule-based quality estimation
4. **API unavailable** → Queue for retry + notify user

### 8.3 Retry Logic
- Exponential backoff
- Jitter to prevent thundering herd
- Max retry attempts per operation

### Deliverables
- [ ] `CircuitBreaker` class
- [ ] `GracefulDegradationManager` class
- [ ] Retry utilities with backoff

---

## Phase 9: Adaptive Configuration

### 9.1 Configuration Manager
**File**: `src/ai/feedback/adaptive-config.ts`

Self-tuning parameters:
- `explorationRate` - Balance between explore/exploit
- `temperatureSchedule` - How temperature changes over iterations
- `verificationTimeout` - Adjust based on API response times
- `candidateDiversity` - Minimum diversity threshold

### 9.2 Performance-Based Tuning
```typescript
class AdaptiveConfigurationManager {
  updateBasedOnHistory(history: FeedbackIteration[]): void {
    // If converging slowly → increase exploration
    // If oscillating → decrease temperature
    // If API slow → increase timeout
    // If quality high → focus on refinement
  }
}
```

### Deliverables
- [ ] `AdaptiveConfigurationManager` class
- [ ] Performance analysis utilities
- [ ] Tuning recommendation engine

---

## Phase 10: UI Integration

### 10.1 Feedback Panel Component
**File**: `src/ui/components/ai-feedback-panel.ts`

Display:
- Current iteration / max iterations
- All candidates with thumbnails
- Best candidate highlighted
- Quality score gauge with confidence
- Critique text
- Model consensus indicator
- Strategy being used
- Cancel/Accept/Continue controls

### 10.2 Iteration History Viewer
- Timeline of iterations
- Score trend graph
- Thumbnail comparison
- Strategy effectiveness visualization

### 10.3 Manual Intervention
- Accept current (even if below threshold)
- Provide additional guidance
- Skip to specific strategy
- Revert to previous iteration

### Deliverables
- [ ] `AIFeedbackPanel` component
- [ ] `IterationHistory` component
- [ ] Manual intervention controls
- [ ] Real-time progress updates

---

## Phase 11: Testing & Validation

### 11.1 A/B Testing Framework
**File**: `src/ai/feedback/testing/ab-testing.ts`

```typescript
class ABTestingController {
  async runExperiment(
    intent: DesignIntent,
    variants: ExperimentVariant[]
  ): Promise<ExperimentResult> {
    // Run each variant
    // Compare results
    // Statistical significance testing
    // Generate insights
  }
}
```

### 11.2 Unit Tests
- Each strategy in isolation
- Verifier accuracy tests
- Termination logic tests
- Score fusion tests

### 11.3 Integration Tests
- Full loop with mock verifiers
- Error recovery scenarios
- Timeout handling

### Deliverables
- [ ] `ABTestingController` class
- [ ] Unit test suite
- [ ] Integration test suite

---

## File Structure

```
src/ai/feedback/
├── types.ts                        # All type definitions
├── visual-feedback-controller.ts   # Main orchestrator
├── candidate-renderer.ts           # Render candidates
├── verification-factory.ts         # Creates Standard or Advanced verifier
├── standard-verifier.ts            # Single-model verification (default)
├── advanced-verifier.ts            # Multi-model consensus (premium)
├── adaptive-generator.ts           # Multi-strategy generation
├── progressive-refinement.ts       # Stage-based refinement
├── termination-controller.ts       # Termination decisions
├── quality-metrics.ts              # Quality scoring
├── adaptive-config.ts              # Self-tuning config
├── verifiers/
│   ├── verifier-interface.ts       # Base interface for all verifiers
│   ├── claude-verifier.ts          # Claude Vision (cloud)
│   ├── openai-verifier.ts          # GPT-4V (cloud)
│   ├── local-verifier.ts           # Ollama/LLaVA (local)
│   └── cv-verifier.ts              # Traditional CV sanity checks (always-on)
├── generators/
│   ├── refinement-strategy.ts
│   ├── crossover-strategy.ts
│   ├── mutation-strategy.ts
│   ├── fresh-strategy.ts
│   └── diversity-strategy.ts
├── termination/
│   ├── quality-threshold.ts
│   ├── convergence-detection.ts
│   ├── diminishing-returns.ts
│   ├── timeout.ts
│   └── diversity-depletion.ts
├── resilience/
│   ├── circuit-breaker.ts
│   ├── degradation-manager.ts
│   └── retry-utils.ts
└── testing/
    └── ab-testing.ts
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| First-attempt success | 60% | Score ≥ 0.85 on iteration 1 |
| Final success rate | **95%** | Score ≥ 0.85 within maxIterations |
| Average iterations | < 3 | Mean iterations to acceptable |
| Model consensus | > 0.7 | Agreement between verifiers |
| User override rate | < 5% | User accepts below threshold |
| P95 latency | < 45s | 95th percentile total time |
| API cost/design | < $0.50 | Average cost per successful design |

---

## Implementation Priority

### Must Have (Phase 1-6)
- Core loop with multi-candidate generation
- Multi-model verification with fusion
- Basic refinement strategy
- Quality threshold termination
- Progress UI

### Should Have (Phase 7-9)
- Full strategy set (crossover, mutation, diversity)
- Progressive refinement stages
- Adaptive configuration
- Circuit breaker

### Nice to Have (Phase 10-11)
- Full analytics dashboard
- A/B testing framework
- Advanced termination strategies

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Infrastructure | 2 days | None |
| Phase 2: Multi-Model Verification | 3 days | Phase 1 |
| Phase 3: Adaptive Generation | 3 days | Phase 1 |
| Phase 4: Progressive Refinement | 2 days | Phase 3 |
| Phase 5: Termination | 1 day | Phase 2 |
| Phase 6: Main Controller | 2 days | Phases 2-5 |
| Phase 7: Quality Metrics | 1 day | Phase 6 |
| Phase 8: Resilience | 2 days | Phase 6 |
| Phase 9: Adaptive Config | 1 day | Phase 7 |
| Phase 10: UI | 2 days | Phase 6 |
| Phase 11: Testing | 2 days | All |

**Total: ~21 days for full implementation**

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vision API costs | High | Two-stage (local first), caching, batching |
| Latency too high | Medium | Parallel execution, thumbnail pre-checks |
| Infinite loops | High | Multiple termination strategies, hard timeout |
| Inconsistent scoring | Medium | Multi-model consensus, calibration prompts |
| Generation diverges | Medium | Diversity tracking, crossover strategy |
| User frustration | High | Progress UI, manual override, early stopping |
