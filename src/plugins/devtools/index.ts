/**
 * Developer Tools Module
 *
 * Tools for plugin development, debugging, and profiling.
 */

// Plugin console
export {
  PluginConsole,
  DEFAULT_CONSOLE_CONFIG,
  createPluginConsoleInterface,
  type PluginConsoleConfig,
  type ConsoleEntry,
  type ConsoleSource,
  type ConsoleFilter,
  type LogLevel,
  type ConsoleEventHandler,
  type PluginConsoleInterface,
} from './plugin-console';

// Plugin state inspector
export {
  PluginInspector,
  DEFAULT_INSPECTOR_CONFIG,
  type InspectorConfig,
  type InspectedValue,
  type InspectedValueType,
  type PluginStateSnapshot,
  type ListenerInfo,
  type TimerInfo,
  type MemoryInfo,
  type StateChangeEvent,
  type StateChangeHandler,
  type SnapshotDiff,
  type ValueChange,
  type ListenerChange,
  type TimerChange,
} from './plugin-inspector';

// Performance profiler
export {
  PerformanceProfiler,
  DEFAULT_PROFILER_CONFIG,
  createTimingDecorator,
  timeExecution,
  timeAsyncExecution,
  type ProfilerConfig,
  type ProfileEntry,
  type ProfileEntryType,
  type ProfileSession,
  type ProfileSummary,
  type ProfileEntrySummary,
  type FlameGraphNode,
} from './performance-profiler';

// Network inspector
export {
  NetworkInspector,
  DEFAULT_NETWORK_INSPECTOR_CONFIG,
  createInspectedFetch,
  type NetworkInspectorConfig,
  type NetworkEntry,
  type ApiCallEntry,
  type NetworkFilter,
  type NetworkStats,
  type RequestType,
  type RequestStatus,
  type RequestTiming,
  type BlockReason,
} from './network-inspector';
