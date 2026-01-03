/**
 * Sync Module
 *
 * Bidirectional synchronization between DesignLibre and source code.
 */

// Main sync engine
export {
  SyncEngine,
  createSyncEngine,
  type SyncEngineConfig,
  type SyncEngineEvents,
  type DesignChange,
  type CodeChange,
  type SyncConflict,
} from './sync-engine';

// Source mapping
export {
  SourceMappingManager,
  createSourceMappingManager,
  type SourceMappingEntry,
  type PropertyAnchor,
  type TrackedFile,
} from './source-mapping';

// Code writer
export {
  CodeWriter,
  createCodeWriter,
  type TextEdit,
  type EditResult,
  type ConversionOptions,
} from './code-writer';
