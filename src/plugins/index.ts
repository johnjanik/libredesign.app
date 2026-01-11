/**
 * DesignLibre Plugin System
 *
 * Zero-trust plugin ecosystem using QuickJS WebAssembly sandboxing
 * with capability-based security.
 */

// Types
export * from './types';

// Sandbox
export {
  QuickJSSandbox,
  SandboxFactory,
  MemoryManager,
  ExecutionTimer,
  MemoryThreshold,
  DEFAULT_SANDBOX_CONFIG,
  DEFAULT_MEMORY_CONFIG,
  DEFAULT_TIMER_CONFIG,
} from './sandbox';
export type {
  SandboxConfig,
  SandboxResult,
  SandboxState,
  HostFunction,
  SandboxCreationOptions,
  ActiveSandbox,
  SandboxStats,
  SandboxFactoryStats,
  MemoryManagerConfig,
  MemorySnapshot,
  MemoryViolation,
  PluginMemoryStats,
  MemoryManagerStats,
  MemoryViolationCallback,
  ExecutionTimerConfig,
  ExecutionTiming,
  ExecutionBudget,
  PluginExecutionStats,
  ExecutionTimerStats,
  TimeoutCallback,
} from './sandbox';

// Capabilities
export {
  createCapabilityToken,
  validateCapabilityToken,
  serializeToken,
  deserializeToken,
  CapabilityGuard,
  ScopeResolver,
  createEmptyScopeResolver,
  RateLimiter,
  DEFAULT_GUARD_CONFIG,
  DEFAULT_RATE_LIMITS,
} from './capabilities';
export type {
  CreateTokenOptions,
  TokenValidation,
  CapabilityGuardConfig,
  PermissionResult,
  ScopeContext,
  RateLimitConfig,
  RateLimitResult,
  RateLimitStats,
  EndpointStats,
} from './capabilities';

// Manifest
export {
  parseManifest,
  parseManifestObject,
  validateManifestFull,
  isValidManifest,
  MANIFEST_SCHEMA,
  EXAMPLE_MANIFEST,
} from './manifest';
export type { ParseResult, ManifestValidationResult } from './manifest';

// API
export {
  serialize,
  deserialize,
  cloneDeep,
  isSerializable,
  estimateSize,
  sanitize,
  IPCBridge,
  APIDispatcher,
  createDesignAPIMethods,
  DEFAULT_IPC_CONFIG,
} from './api';
export type {
  IPCBridgeConfig,
  APIHandler,
  IPCBridgeStats,
  PluginIPCStats,
  APIMethodDefinition,
} from './api';

// Loader
export {
  PluginLoader,
  PluginRegistry,
  DEFAULT_LOADER_CONFIG,
} from './loader';
export type {
  PluginLoaderConfig,
  PluginLoadResult,
  CodeProvider,
  PluginLoaderStats,
  PluginState,
  PluginInstance,
  PluginStateCallback,
  PluginRegistryStats,
} from './loader';

// Host APIs
export {
  createDesignAPI,
  createSelectionAPI,
  createViewportAPI,
  createHistoryAPI,
  createEventsAPI,
  createStorageAPI,
  createNetworkAPI,
  createUIAPI,
  createConsoleAPI,
  DEFAULT_STORAGE_CONFIG,
  DEFAULT_NETWORK_CONFIG,
  DEFAULT_UI_CONFIG,
  DEFAULT_CONSOLE_CONFIG,
} from './api/host-api';
export type {
  SceneGraphAdapter,
  NodeQuery,
  DesignAPIHandlers,
  SelectionAdapter,
  SelectionAPIHandlers,
  ViewportAdapter,
  ViewportAPIHandlers,
  HistoryAdapter,
  HistoryAPIHandlers,
  EventEmitterAdapter,
  EventListener,
  PluginEventType,
  EventsAPIHandlers,
  StorageConfig,
  StorageAPIHandlers,
  NetworkConfig,
  PluginFetchOptions,
  PluginFetchResponse,
  NetworkAPIHandlers,
  UIAdapter,
  UIConfig,
  PanelHandle,
  ModalResult,
  UIAPIHandlers,
  ConsoleConfig,
  ConsoleLogLevel,
  ConsoleLogEntry,
  ConsoleOutputHandler,
  ConsoleAPIHandlers,
} from './api/host-api';

// UI Sandbox
export {
  createUISandbox,
  renderUI,
  updateComponent,
  setEventHandler,
  destroySandbox,
  UIBridge,
  UIRenderer,
  DEFAULT_UI_SANDBOX_CONFIG,
} from './ui';
export type {
  UISandboxConfig,
  UISandboxInstance,
  UIMessageType,
  UIHostMessage,
  UIIframeMessage,
  UIEventHandler,
  UIRendererConfig,
} from './ui';

// Monitoring
export {
  ResourceMonitor,
  QuotaManager,
  MetricsCollector,
  AlertManager,
  DEFAULT_RESOURCE_LIMITS,
  DEFAULT_MONITOR_CONFIG,
  DEFAULT_ENFORCEMENT_POLICY,
  DEFAULT_METRICS_CONFIG,
  DEFAULT_ALERT_CONFIG,
} from './monitoring';
export type {
  ResourceType,
  ResourceSnapshot,
  CPUSnapshot,
  MemorySnapshot as ResourceMemorySnapshot,
  APICallSnapshot,
  StorageSnapshot,
  NetworkSnapshot,
  ResourceLimits,
  ResourceViolation,
  ViolationCallback,
  ResourceMonitorConfig,
  EnforcementAction,
  EnforcementPolicy,
  PluginQuotaStatus,
  PluginQuota,
  QuotaCheckResult,
  QuotaEventType,
  QuotaEvent,
  QuotaEventCallback,
  MetricPeriod,
  AggregatedMetric,
  PluginMetricsSummary,
  MethodStats,
  MetricsCollectorConfig,
  AlertSeverity,
  AlertStatus,
  AlertSource,
  Alert,
  AlertRule,
  AlertCondition,
  AlertChannel,
  AlertCallback,
  AlertFilterOptions,
  AlertStats,
  AlertManagerConfig,
} from './monitoring';

// Security
export {
  StaticAnalyzer,
  PatternDetector,
  BehaviorMonitor,
  DEFAULT_ANALYZER_CONFIG,
  DEFAULT_PATTERN_CONFIG,
  DEFAULT_BEHAVIOR_CONFIG,
} from './security';
export type {
  AnalysisRule,
  AnalysisSeverity,
  AnalysisFinding,
  AnalysisResult,
  AnalysisSummary,
  CodeLocation,
  CodeMetrics,
  FindingCategory,
  AnalysisContext,
  StaticAnalyzerConfig,
  PatternType,
  DetectedPattern,
  PatternRule,
  PatternDetectorConfig,
  BehaviorEventType,
  BehaviorEvent,
  BehaviorProfile,
  ResourceUsagePattern,
  ApiCallPattern,
  AnomalyType,
  DetectedAnomaly,
  AnomalyCallback,
  BehaviorMonitorConfig,
} from './security';

// Audit
export {
  AuditLogger,
  LogStorage,
  IndexedDBBackend,
  MemoryBackend,
  DEFAULT_AUDIT_CONFIG,
  DEFAULT_STORAGE_CONFIG as DEFAULT_LOG_STORAGE_CONFIG,
} from './audit';
export type {
  ActionCategory,
  ActionResult,
  AuditLogEntry,
  AuditLogFilter,
  AuditLogStats,
  AuditLogCallback,
  AuditLoggerConfig,
  StorageBackend,
  LogStorageConfig,
} from './audit';

// Compliance
export {
  ComplianceConfigManager,
  DataRetentionManager,
  PrivacyControls,
  DEFAULT_COMPLIANCE_CONFIG,
  GDPR_COMPLIANCE_CONFIG,
  SOC2_COMPLIANCE_CONFIG,
  DEFAULT_RETENTION_CONFIG,
  DEFAULT_PRIVACY_CONFIG,
} from './compliance';
export type {
  ComplianceStandard,
  DataClassification,
  DataPurpose,
  ConsentStatus,
  RetentionPolicy,
  DataInventoryEntry,
  ComplianceConfig,
  RetentionJobStatus,
  RetentionJobResult,
  RetentionSchedule,
  ArchiveEntry,
  RetentionCallback,
  DataRetentionConfig,
  DataRequestType,
  DataRequestStatus,
  DataRequest,
  DataRequestResponse,
  UserDataExport,
  UserDataSection,
  ConsentRequest,
  PrivacyCallback,
  PrivacyControlsConfig,
  PluginDataHandler,
} from './compliance';

// Marketplace
export {
  MarketplaceClient,
  MarketplaceError,
  PluginSearch,
  LocalPluginSearch,
  InstallationManager,
  IndexedDBPluginStorage,
  PluginVerifier,
  verifyPlugin,
  calculateChecksum,
  DEFAULT_MARKETPLACE_CONFIG,
  DEFAULT_SEARCH_CONFIG,
  DEFAULT_VERIFICATION_CONFIG,
  createEmptyFilterState,
} from './marketplace';
export type {
  MarketplaceClientConfig,
  PluginListing,
  PluginAuthor,
  PluginPricing,
  PluginCompatibility,
  PluginReview,
  SearchFilters,
  SearchResults,
  SearchFacets,
  FacetCount,
  PluginDownload,
  ApiResponse,
  ApiError,
  PluginVersionInfo,
  Category,
  PluginUpdate,
  PluginSearchConfig,
  SearchSuggestion,
  SearchHistoryEntry,
  FilterState,
  InstallationManagerConfig,
  InstallationProgress,
  InstallationStatus,
  InstalledPlugin,
  PluginStorageBackend,
  InstallationCallback,
  InstallOptions,
  VerificationConfig,
  VerificationResult,
  VerificationCheck,
  SignerInfo,
  PublicKey,
} from './marketplace';

// Developer Tools
export {
  PluginConsole,
  PluginInspector,
  PerformanceProfiler,
  NetworkInspector,
  createPluginConsoleInterface,
  createTimingDecorator,
  createInspectedFetch,
  timeExecution,
  timeAsyncExecution,
  DEFAULT_CONSOLE_CONFIG as DEFAULT_DEVTOOLS_CONSOLE_CONFIG,
  DEFAULT_INSPECTOR_CONFIG,
  DEFAULT_PROFILER_CONFIG,
  DEFAULT_NETWORK_INSPECTOR_CONFIG,
} from './devtools';
export type {
  PluginConsoleConfig,
  ConsoleEntry,
  ConsoleSource,
  ConsoleFilter,
  LogLevel,
  ConsoleEventHandler,
  PluginConsoleInterface,
  InspectorConfig,
  InspectedValue,
  InspectedValueType,
  PluginStateSnapshot,
  ListenerInfo,
  TimerInfo,
  MemoryInfo,
  StateChangeEvent,
  StateChangeHandler,
  SnapshotDiff,
  ValueChange,
  ListenerChange,
  TimerChange,
  ProfilerConfig,
  ProfileEntry,
  ProfileEntryType,
  ProfileSession,
  ProfileSummary,
  ProfileEntrySummary,
  FlameGraphNode,
  NetworkInspectorConfig,
  NetworkEntry,
  ApiCallEntry,
  NetworkFilter,
  NetworkStats,
  RequestType,
  RequestStatus,
  RequestTiming,
  BlockReason,
} from './devtools';

// Runtime
export {
  PluginRuntimeManager,
  getPluginRuntimeManager,
} from './runtime';
export type {
  RuntimePlugin,
  PluginRuntimeEvent,
  PluginRuntimeEventCallback,
} from './runtime';
