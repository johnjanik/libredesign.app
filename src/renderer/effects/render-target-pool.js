/**
 * Render Target Pool
 *
 * Manages a pool of reusable render targets to minimize GPU allocations.
 * Render targets are keyed by size and reused when available.
 */
import { createRenderTarget } from './render-target';
function makeKey(width, height) {
    return `${width}x${height}`;
}
/**
 * Render target pool for efficient FBO reuse
 */
export class RenderTargetPool {
    ctx;
    pool = new Map();
    maxPoolSize;
    gcTimeout;
    gcIntervalId = null;
    constructor(ctx, config = {}) {
        this.ctx = ctx;
        this.maxPoolSize = config.maxPoolSize ?? 16;
        this.gcTimeout = config.gcTimeout ?? 10000;
        // Start garbage collection timer
        this.gcIntervalId = setInterval(() => this.gc(), this.gcTimeout / 2);
    }
    /**
     * Acquire a render target of the specified size.
     * Returns a pooled target if available, otherwise creates a new one.
     */
    acquire(width, height) {
        const key = makeKey(width, height);
        const entries = this.pool.get(key);
        if (entries) {
            // Look for an available target
            for (const entry of entries) {
                if (!entry.inUse && !entry.target.disposed) {
                    entry.inUse = true;
                    entry.lastUsed = Date.now();
                    return entry.target;
                }
            }
        }
        // No available target, create a new one
        const target = createRenderTarget(this.ctx, { width, height });
        const newEntry = {
            target,
            inUse: true,
            lastUsed: Date.now(),
        };
        if (entries) {
            entries.push(newEntry);
        }
        else {
            this.pool.set(key, [newEntry]);
        }
        return target;
    }
    /**
     * Release a render target back to the pool.
     */
    release(target) {
        if (target.disposed)
            return;
        const key = makeKey(target.width, target.height);
        const entries = this.pool.get(key);
        if (entries) {
            for (const entry of entries) {
                if (entry.target === target) {
                    entry.inUse = false;
                    entry.lastUsed = Date.now();
                    return;
                }
            }
        }
        // Target not found in pool - dispose it
        target.dispose();
    }
    /**
     * Clear a render target (convenience method).
     */
    clear(target, r = 0, g = 0, b = 0, a = 0) {
        target.clear(r, g, b, a);
    }
    /**
     * Run garbage collection to dispose unused targets.
     */
    gc() {
        const now = Date.now();
        let totalCount = 0;
        for (const [key, entries] of this.pool) {
            // Remove disposed entries
            const validEntries = entries.filter(e => !e.target.disposed);
            // Dispose old unused entries
            for (let i = validEntries.length - 1; i >= 0; i--) {
                const entry = validEntries[i];
                if (!entry.inUse && now - entry.lastUsed > this.gcTimeout) {
                    entry.target.dispose();
                    validEntries.splice(i, 1);
                }
            }
            // Update pool
            if (validEntries.length === 0) {
                this.pool.delete(key);
            }
            else {
                this.pool.set(key, validEntries);
                totalCount += validEntries.length;
            }
        }
        // If pool is too large, dispose oldest unused entries
        if (totalCount > this.maxPoolSize) {
            const allEntries = [];
            for (const [key, entries] of this.pool) {
                entries.forEach((entry, index) => {
                    if (!entry.inUse) {
                        allEntries.push({ key, entry, index });
                    }
                });
            }
            // Sort by last used (oldest first)
            allEntries.sort((a, b) => a.entry.lastUsed - b.entry.lastUsed);
            // Dispose oldest until under limit
            const toRemove = totalCount - this.maxPoolSize;
            for (let i = 0; i < toRemove && i < allEntries.length; i++) {
                const { key, entry } = allEntries[i];
                entry.target.dispose();
                const entries = this.pool.get(key);
                if (entries) {
                    const idx = entries.indexOf(entry);
                    if (idx !== -1) {
                        entries.splice(idx, 1);
                    }
                    if (entries.length === 0) {
                        this.pool.delete(key);
                    }
                }
            }
        }
    }
    /**
     * Get pool statistics.
     */
    getStats() {
        let total = 0;
        let inUse = 0;
        for (const entries of this.pool.values()) {
            for (const entry of entries) {
                if (!entry.target.disposed) {
                    total++;
                    if (entry.inUse) {
                        inUse++;
                    }
                }
            }
        }
        return {
            total,
            inUse,
            available: total - inUse,
        };
    }
    /**
     * Dispose all render targets and stop GC.
     */
    dispose() {
        if (this.gcIntervalId !== null) {
            clearInterval(this.gcIntervalId);
            this.gcIntervalId = null;
        }
        for (const entries of this.pool.values()) {
            for (const entry of entries) {
                if (!entry.target.disposed) {
                    entry.target.dispose();
                }
            }
        }
        this.pool.clear();
    }
}
/**
 * Create a render target pool.
 */
export function createRenderTargetPool(ctx, config) {
    return new RenderTargetPool(ctx, config);
}
//# sourceMappingURL=render-target-pool.js.map