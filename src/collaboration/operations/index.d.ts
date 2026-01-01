/**
 * Operations Module
 *
 * Exports for operation types and logging.
 */
export { compareTimestamps, createTimestamp, incrementTimestamp, mergeTimestamps, generateOperationId, } from './operation-types';
export type { LamportTimestamp, BaseOperation, OperationType, InsertNodeOperation, DeleteNodeOperation, SetPropertyOperation, MoveNodeOperation, ReorderNodeOperation, Operation, } from './operation-types';
export { OperationLog, createOperationLog } from './operation-log';
export type { OperationLogConfig } from './operation-log';
export { OperationCompressor, createOperationCompressor } from './operation-compressor';
export type { CompressionConfig, CompressionStats, OperationBatch } from './operation-compressor';
//# sourceMappingURL=index.d.ts.map