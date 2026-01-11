/**
 * Security Module
 *
 * Exports static analysis, pattern detection, and behavior monitoring
 * components for plugin security.
 */

export {
  StaticAnalyzer,
  DEFAULT_ANALYZER_CONFIG,
  type AnalysisRule,
  type AnalysisSeverity,
  type AnalysisFinding,
  type AnalysisResult,
  type AnalysisSummary,
  type CodeLocation,
  type CodeMetrics,
  type FindingCategory,
  type AnalysisContext,
  type StaticAnalyzerConfig,
} from './static-analyzer';

export {
  PatternDetector,
  DEFAULT_PATTERN_CONFIG,
  type PatternType,
  type DetectedPattern,
  type PatternRule,
  type PatternDetectorConfig,
} from './pattern-detector';

export {
  BehaviorMonitor,
  DEFAULT_BEHAVIOR_CONFIG,
  type BehaviorEventType,
  type BehaviorEvent,
  type BehaviorProfile,
  type ResourceUsagePattern,
  type ApiCallPattern,
  type AnomalyType,
  type DetectedAnomaly,
  type AnomalyCallback,
  type BehaviorMonitorConfig,
} from './behavior-monitor';
