/**
 * Operation Compressor
 *
 * Optimizes operation logs by compressing redundant operations.
 * Reduces storage size and network bandwidth.
 */
import type { Operation, LamportTimestamp } from './operation-types';
/**
 * Compression configuration
 */
export interface CompressionConfig {
    /** Maximum time window for compressing SET_PROPERTY operations (ms) */
    readonly propertyCompressionWindow?: number;
    /** Maximum operations to buffer before flushing */
    readonly maxBufferSize?: number;
    /** Remove operations for deleted nodes */
    readonly pruneDeletedNodes?: boolean;
    /** Combine consecutive MOVE operations for same node */
    readonly combineMoves?: boolean;
    /** Combine consecutive REORDER operations for same node */
    readonly combineReorders?: boolean;
}
/**
 * Compression statistics
 */
export interface CompressionStats {
    readonly inputCount: number;
    readonly outputCount: number;
    readonly compressedCount: number;
    readonly prunedCount: number;
    readonly compressionRatio: number;
}
/**
 * Operation batch for network transmission
 */
export interface OperationBatch {
    readonly operations: Operation[];
    readonly baseTimestamp: LamportTimestamp;
    readonly checksum: string;
}
/**
 * Operation compressor for reducing operation log size
 */
export declare class OperationCompressor {
    private config;
    private buffer;
    private propertyBuffer;
    private lastFlush;
    constructor(config?: CompressionConfig);
    /**
     * Add an operation to the compression buffer.
     * Returns compressed operations when buffer is flushed.
     */
    add(operation: Operation): Operation[];
    /**
     * Add multiple operations.
     */
    addAll(operations: Operation[]): Operation[];
    /**
     * Flush all buffered operations.
     */
    flush(): Operation[];
    /**
     * Add a SET_PROPERTY operation with compression.
     */
    private addSetProperty;
    /**
     * Add a MOVE operation with potential combination.
     */
    private addMoveOperation;
    /**
     * Add a REORDER operation with potential combination.
     */
    private addReorderOperation;
    /**
     * Flush the property buffer.
     */
    private flushPropertyBuffer;
    /**
     * Get a unique key for a property operation.
     */
    private getPropertyKey;
    /**
     * Compress an array of operations.
     * This is a static batch compression that doesn't use buffering.
     */
    static compress(operations: Operation[], config?: CompressionConfig): {
        operations: Operation[];
        stats: CompressionStats;
    };
    /**
     * Create an operation batch for network transmission.
     */
    static createBatch(operations: Operation[]): OperationBatch;
    /**
     * Verify a batch checksum.
     */
    static verifyBatch(batch: OperationBatch): boolean;
    /**
     * Generate a simple checksum for operations.
     */
    private static generateChecksum;
    /**
     * Estimate compressed size in bytes.
     */
    static estimateSize(operations: Operation[]): number;
    /**
     * Get buffer size.
     */
    getBufferSize(): number;
    /**
     * Check if buffer has operations.
     */
    hasBufferedOperations(): boolean;
    /**
     * Clear all buffers.
     */
    clear(): void;
}
/**
 * Create an operation compressor.
 */
export declare function createOperationCompressor(config?: CompressionConfig): OperationCompressor;
//# sourceMappingURL=operation-compressor.d.ts.map