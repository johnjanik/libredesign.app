/**
 * Render Target Pool
 *
 * Manages a pool of reusable render targets to minimize GPU allocations.
 * Render targets are keyed by size and reused when available.
 */
import type { WebGLContext } from '../core/webgl-context';
import { RenderTarget } from './render-target';
/**
 * Pool configuration
 */
export interface RenderTargetPoolConfig {
    /** Maximum number of render targets to keep in pool */
    readonly maxPoolSize?: number;
    /** Time in ms after which unused targets are disposed */
    readonly gcTimeout?: number;
}
/**
 * Render target pool for efficient FBO reuse
 */
export declare class RenderTargetPool {
    private ctx;
    private pool;
    private maxPoolSize;
    private gcTimeout;
    private gcIntervalId;
    constructor(ctx: WebGLContext, config?: RenderTargetPoolConfig);
    /**
     * Acquire a render target of the specified size.
     * Returns a pooled target if available, otherwise creates a new one.
     */
    acquire(width: number, height: number): RenderTarget;
    /**
     * Release a render target back to the pool.
     */
    release(target: RenderTarget): void;
    /**
     * Clear a render target (convenience method).
     */
    clear(target: RenderTarget, r?: number, g?: number, b?: number, a?: number): void;
    /**
     * Run garbage collection to dispose unused targets.
     */
    private gc;
    /**
     * Get pool statistics.
     */
    getStats(): {
        total: number;
        inUse: number;
        available: number;
    };
    /**
     * Dispose all render targets and stop GC.
     */
    dispose(): void;
}
/**
 * Create a render target pool.
 */
export declare function createRenderTargetPool(ctx: WebGLContext, config?: RenderTargetPoolConfig): RenderTargetPool;
//# sourceMappingURL=render-target-pool.d.ts.map