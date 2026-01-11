/**
 * Sandbox Factory
 *
 * Creates and manages QuickJS sandboxes for plugins.
 * Handles initialization, configuration, and lifecycle.
 */

import { QuickJSSandbox, type SandboxConfig, DEFAULT_SANDBOX_CONFIG } from './quickjs-sandbox';
import type { PluginManifest, PluginLimits } from '../types/plugin-manifest';
import { parseSize, parseDuration } from '../types/plugin-manifest';

/**
 * Sandbox creation options
 */
export interface SandboxCreationOptions {
  /** Plugin manifest for configuration */
  readonly manifest: PluginManifest;
  /** Override default limits */
  readonly limitOverrides?: Partial<PluginLimits>;
}

/**
 * Active sandbox entry
 */
export interface ActiveSandbox {
  /** The sandbox instance */
  readonly sandbox: QuickJSSandbox;
  /** Plugin ID */
  readonly pluginId: string;
  /** Creation timestamp */
  readonly createdAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
}

/**
 * Sandbox factory for creating and managing sandboxes
 */
export class SandboxFactory {
  private static instance: SandboxFactory | null = null;
  private initialized = false;
  private activeSandboxes: Map<string, ActiveSandbox> = new Map();

  /**
   * Maximum concurrent sandboxes allowed
   */
  private readonly maxConcurrentSandboxes: number;

  /**
   * Idle timeout for sandbox cleanup (default: 5 minutes)
   */
  private readonly idleTimeoutMs: number;

  /**
   * Cleanup interval handle
   */
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private constructor(maxConcurrent: number = 50, idleTimeoutMs: number = 5 * 60 * 1000) {
    this.maxConcurrentSandboxes = maxConcurrent;
    this.idleTimeoutMs = idleTimeoutMs;
  }

  /**
   * Get the singleton factory instance
   */
  static getInstance(): SandboxFactory {
    if (!SandboxFactory.instance) {
      SandboxFactory.instance = new SandboxFactory();
    }
    return SandboxFactory.instance;
  }

  /**
   * Initialize the factory (loads QuickJS WASM module)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await QuickJSSandbox.initialize();
    this.initialized = true;

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleSandboxes();
    }, 60000); // Check every minute
  }

  /**
   * Check if factory is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Create a new sandbox for a plugin
   */
  async createSandbox(options: SandboxCreationOptions): Promise<QuickJSSandbox> {
    if (!this.initialized) {
      throw new Error('SandboxFactory not initialized. Call initialize() first.');
    }

    const { manifest, limitOverrides } = options;

    // Check concurrent sandbox limit
    if (this.activeSandboxes.size >= this.maxConcurrentSandboxes) {
      // Try to clean up idle sandboxes first
      this.cleanupIdleSandboxes();

      if (this.activeSandboxes.size >= this.maxConcurrentSandboxes) {
        throw new Error('Maximum concurrent sandboxes reached');
      }
    }

    // Check if sandbox already exists for this plugin
    const existing = this.activeSandboxes.get(manifest.id);
    if (existing) {
      // Update activity and return existing
      existing.lastActivityAt = Date.now();
      return existing.sandbox;
    }

    // Build configuration from manifest
    const config = this.buildConfig(manifest, limitOverrides);

    // Create and initialize sandbox
    const sandbox = new QuickJSSandbox(config);
    await sandbox.init();

    // Track the sandbox
    const now = Date.now();
    this.activeSandboxes.set(manifest.id, {
      sandbox,
      pluginId: manifest.id,
      createdAt: now,
      lastActivityAt: now,
    });

    return sandbox;
  }

  /**
   * Build sandbox configuration from manifest
   */
  private buildConfig(
    manifest: PluginManifest,
    overrides?: Partial<PluginLimits>
  ): SandboxConfig {
    const limits = { ...manifest.limits, ...overrides };

    return {
      pluginId: manifest.id,
      memoryLimit: parseSize(limits.memory),
      executionTimeout: parseDuration(limits.executionTime),
      maxStackDepth: DEFAULT_SANDBOX_CONFIG.maxStackDepth,
    };
  }

  /**
   * Get an active sandbox by plugin ID
   */
  getSandbox(pluginId: string): QuickJSSandbox | null {
    const entry = this.activeSandboxes.get(pluginId);
    if (entry) {
      entry.lastActivityAt = Date.now();
      return entry.sandbox;
    }
    return null;
  }

  /**
   * Terminate a sandbox by plugin ID
   */
  terminateSandbox(pluginId: string): void {
    const entry = this.activeSandboxes.get(pluginId);
    if (entry) {
      entry.sandbox.terminate();
      this.activeSandboxes.delete(pluginId);
    }
  }

  /**
   * Terminate all sandboxes
   */
  terminateAll(): void {
    for (const entry of this.activeSandboxes.values()) {
      entry.sandbox.terminate();
    }
    this.activeSandboxes.clear();
  }

  /**
   * Clean up idle sandboxes
   */
  private cleanupIdleSandboxes(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [pluginId, entry] of this.activeSandboxes) {
      if (now - entry.lastActivityAt > this.idleTimeoutMs) {
        toRemove.push(pluginId);
      }
    }

    for (const pluginId of toRemove) {
      this.terminateSandbox(pluginId);
    }
  }

  /**
   * Get count of active sandboxes
   */
  getActiveSandboxCount(): number {
    return this.activeSandboxes.size;
  }

  /**
   * Get all active plugin IDs
   */
  getActivePluginIds(): string[] {
    return Array.from(this.activeSandboxes.keys());
  }

  /**
   * Get sandbox statistics
   */
  getStatistics(): SandboxFactoryStats {
    let totalMemory = 0;
    const sandboxStats: SandboxStats[] = [];

    for (const [pluginId, entry] of this.activeSandboxes) {
      const memoryUsed = entry.sandbox.getMemoryUsage();
      totalMemory += memoryUsed;

      sandboxStats.push({
        pluginId,
        state: entry.sandbox.getState(),
        memoryUsed,
        createdAt: entry.createdAt,
        lastActivityAt: entry.lastActivityAt,
      });
    }

    return {
      activeSandboxes: this.activeSandboxes.size,
      maxSandboxes: this.maxConcurrentSandboxes,
      totalMemoryUsed: totalMemory,
      sandboxes: sandboxStats,
    };
  }

  /**
   * Dispose the factory and clean up
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.terminateAll();
    this.initialized = false;
    SandboxFactory.instance = null;
  }
}

/**
 * Individual sandbox statistics
 */
export interface SandboxStats {
  readonly pluginId: string;
  readonly state: string;
  readonly memoryUsed: number;
  readonly createdAt: number;
  readonly lastActivityAt: number;
}

/**
 * Factory-wide statistics
 */
export interface SandboxFactoryStats {
  readonly activeSandboxes: number;
  readonly maxSandboxes: number;
  readonly totalMemoryUsed: number;
  readonly sandboxes: readonly SandboxStats[];
}
