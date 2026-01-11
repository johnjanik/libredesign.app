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
