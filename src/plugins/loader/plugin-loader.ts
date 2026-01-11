/**
 * Plugin Loader
 *
 * Loads plugin code into sandboxes and manages plugin lifecycle.
 */

import type { PluginManifest, PluginId } from '../types/plugin-manifest';
import { parseManifest } from '../manifest/manifest-parser';
import { SandboxFactory } from '../sandbox/sandbox-factory';
import { MemoryManager } from '../sandbox/memory-manager';
import { ExecutionTimer } from '../sandbox/execution-timer';
import { CapabilityGuard } from '../capabilities/capability-guard';
import { RateLimiter } from '../capabilities/rate-limiter';
import { IPCBridge } from '../api/ipc-bridge';
import { PluginRegistry } from './plugin-registry';
import { parseSize, parseDuration } from '../types/plugin-manifest';

/**
 * Plugin loader configuration
 */
export interface PluginLoaderConfig {
  /** Whether to verify integrity hashes */
  readonly verifyIntegrity: boolean;
  /** Maximum concurrent loading plugins */
  readonly maxConcurrentLoads: number;
  /** Plugin code fetch timeout in ms */
  readonly fetchTimeout: number;
}

/**
 * Default loader configuration
 */
export const DEFAULT_LOADER_CONFIG: PluginLoaderConfig = {
  verifyIntegrity: true,
  maxConcurrentLoads: 5,
  fetchTimeout: 30000,
};

/**
 * Plugin load result
 */
export interface PluginLoadResult {
  readonly success: boolean;
  readonly pluginId?: PluginId;
  readonly error?: string;
}

/**
 * Plugin code provider
 */
export type CodeProvider = (pluginId: PluginId, path: string) => Promise<string>;

/**
 * Plugin Loader
 */
export class PluginLoader {
  private config: PluginLoaderConfig;
  private registry: PluginRegistry;
  private sandboxFactory: SandboxFactory;
  private memoryManager: MemoryManager;
  private executionTimer: ExecutionTimer;
  private capabilityGuard: CapabilityGuard;
  private rateLimiter: RateLimiter;
  private ipcBridge: IPCBridge;
  private codeProvider: CodeProvider;
  private loadingCount = 0;

  constructor(
    config: Partial<PluginLoaderConfig> = {},
    codeProvider: CodeProvider
  ) {
    this.config = { ...DEFAULT_LOADER_CONFIG, ...config };
    this.codeProvider = codeProvider;

    // Initialize components
    this.registry = new PluginRegistry();
    this.sandboxFactory = SandboxFactory.getInstance();
    this.memoryManager = new MemoryManager();
    this.executionTimer = new ExecutionTimer();
    this.capabilityGuard = new CapabilityGuard();
    this.rateLimiter = new RateLimiter();
    this.ipcBridge = new IPCBridge();

    // Set up memory violation handler
    this.memoryManager.onViolation((violation) => {
      console.warn(`[Plugin:${violation.pluginId}] Memory violation: ${violation.action}`);
      if (violation.action === 'terminate') {
        this.unload(violation.pluginId);
      }
    });

    // Set up execution timeout handler
    this.executionTimer.onTimeout((pluginId, operationId, duration) => {
      console.warn(`[Plugin:${pluginId}] Execution timeout: ${operationId} took ${duration}ms`);
    });
  }

  /**
   * Initialize the loader
   */
  async initialize(): Promise<void> {
    await this.sandboxFactory.initialize();
    this.memoryManager.startMonitoring();
  }

  /**
   * Register a plugin from manifest JSON
   */
  registerFromJSON(manifestJSON: string): PluginLoadResult {
    const parseResult = parseManifest(manifestJSON);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid manifest: ${parseResult.errors?.join(', ')}`,
      };
    }

    return this.register(parseResult.manifest!);
  }

  /**
   * Register a plugin from manifest object
   */
  register(manifest: PluginManifest): PluginLoadResult {
    try {
      this.registry.register(manifest);
      this.capabilityGuard.registerPlugin(manifest);
      this.rateLimiter.register(manifest.id, {
        global: {
          maxRequests: manifest.limits.apiCallsPerMinute ?? 1000,
          windowMs: 60000,
        },
        network: {
          maxRequests: manifest.limits.networkRequestsPerMinute ?? 60,
          windowMs: 60000,
        },
      });

      return {
        success: true,
        pluginId: manifest.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Load a registered plugin
   */
  async load(pluginId: PluginId): Promise<PluginLoadResult> {
    const instance = this.registry.get(pluginId);
    if (!instance) {
      return { success: false, error: `Plugin ${pluginId} not registered` };
    }

    if (instance.state === 'active') {
      return { success: true, pluginId };
    }

    if (instance.state === 'loading') {
      return { success: false, error: 'Plugin is already loading' };
    }

    // Check concurrent load limit
    if (this.loadingCount >= this.config.maxConcurrentLoads) {
      return { success: false, error: 'Too many plugins loading concurrently' };
    }

    this.loadingCount++;
    this.registry.setState(pluginId, 'loading');

    try {
      // Fetch plugin code
      const code = await this.codeProvider(pluginId, instance.manifest.entry.main);

      // Verify integrity if enabled
      if (this.config.verifyIntegrity) {
        const integrityHash = instance.manifest.integrity[instance.manifest.entry.main];
        if (integrityHash) {
          const isValid = await this.verifyIntegrity(code, integrityHash);
          if (!isValid) {
            throw new Error('Plugin integrity check failed');
          }
        }
      }

      // Create sandbox
      const sandbox = await this.sandboxFactory.createSandbox({
        manifest: instance.manifest,
      });

      // Register with components
      this.registry.setSandbox(pluginId, sandbox);
      this.memoryManager.register(
        pluginId,
        sandbox,
        parseSize(instance.manifest.limits.memory)
      );
      this.executionTimer.register(
        pluginId,
        parseDuration(instance.manifest.limits.executionTime) * 60 // Per minute budget
      );
      this.ipcBridge.registerSandbox(pluginId, sandbox);

      // Execute plugin code
      const result = await sandbox.evaluate(code);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Call plugin initialization
      const initResult = await sandbox.callFunction('init', []);
      if (!initResult.success) {
        console.warn(`[Plugin:${pluginId}] init() failed:`, initResult.error);
        // Non-fatal - plugin might not have init function
      }

      this.registry.setState(pluginId, 'active');

      return { success: true, pluginId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.registry.setError(pluginId, errorMessage);
      return { success: false, pluginId, error: errorMessage };
    } finally {
      this.loadingCount--;
    }
  }

  /**
   * Unload a plugin
   */
  async unload(pluginId: PluginId): Promise<PluginLoadResult> {
    const instance = this.registry.get(pluginId);
    if (!instance) {
      return { success: false, error: `Plugin ${pluginId} not found` };
    }

    if (instance.state === 'unloading' || instance.state === 'unloaded') {
      return { success: true, pluginId };
    }

    this.registry.setState(pluginId, 'unloading');

    try {
      // Call plugin cleanup
      if (instance.sandbox && !instance.sandbox.isTerminated()) {
        try {
          await instance.sandbox.callFunction('cleanup', []);
        } catch {
          // Ignore cleanup errors
        }
      }

      // Unregister from components
      this.ipcBridge.unregisterSandbox(pluginId);
      this.memoryManager.unregister(pluginId);
      this.executionTimer.unregister(pluginId);
      this.sandboxFactory.terminateSandbox(pluginId);
      this.capabilityGuard.unregisterPlugin(pluginId);
      this.rateLimiter.unregister(pluginId);

      this.registry.clearSandbox(pluginId);
      this.registry.setState(pluginId, 'unloaded');

      return { success: true, pluginId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.registry.setError(pluginId, errorMessage);
      return { success: false, pluginId, error: errorMessage };
    }
  }

  /**
   * Reload a plugin
   */
  async reload(pluginId: PluginId): Promise<PluginLoadResult> {
    await this.unload(pluginId);
    return this.load(pluginId);
  }

  /**
   * Suspend a plugin
   */
  suspend(pluginId: PluginId): void {
    const instance = this.registry.get(pluginId);
    if (instance?.state === 'active' && instance.sandbox) {
      instance.sandbox.suspend();
      this.registry.setState(pluginId, 'suspended');
    }
  }

  /**
   * Resume a suspended plugin
   */
  resume(pluginId: PluginId): void {
    const instance = this.registry.get(pluginId);
    if (instance?.state === 'suspended' && instance.sandbox) {
      instance.sandbox.resume();
      this.registry.setState(pluginId, 'active');
    }
  }

  /**
   * Verify code integrity using SubtleCrypto
   */
  private async verifyIntegrity(code: string, expectedHash: string): Promise<boolean> {
    if (!expectedHash.startsWith('sha384-')) {
      return false;
    }

    const expectedBase64 = expectedHash.slice(7); // Remove 'sha384-' prefix

    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-384', data);
    const hashArray = new Uint8Array(hashBuffer);

    // Convert to base64
    let binary = '';
    for (let i = 0; i < hashArray.byteLength; i++) {
      binary += String.fromCharCode(hashArray[i]!);
    }
    const actualBase64 = btoa(binary);

    return actualBase64 === expectedBase64;
  }

  /**
   * Get plugin registry
   */
  getRegistry(): PluginRegistry {
    return this.registry;
  }

  /**
   * Get IPC bridge
   */
  getIPCBridge(): IPCBridge {
    return this.ipcBridge;
  }

  /**
   * Get capability guard
   */
  getCapabilityGuard(): CapabilityGuard {
    return this.capabilityGuard;
  }

  /**
   * Get rate limiter
   */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  /**
   * Get loader statistics
   */
  getStatistics(): PluginLoaderStats {
    return {
      registry: this.registry.getStatistics(),
      sandbox: this.sandboxFactory.getStatistics(),
      memory: this.memoryManager.getStatistics(),
      execution: this.executionTimer.getAggregateStatistics(),
      ipc: this.ipcBridge.getStatistics(),
      loadingCount: this.loadingCount,
    };
  }

  /**
   * Dispose the loader
   */
  dispose(): void {
    // Unload all plugins
    for (const pluginId of this.registry.getPluginIds()) {
      this.unload(pluginId).catch(() => {});
    }

    this.memoryManager.dispose();
    this.executionTimer.dispose();
    this.capabilityGuard.dispose();
    this.rateLimiter.dispose();
    this.ipcBridge.dispose();
    this.registry.dispose();
    this.sandboxFactory.dispose();
  }
}

/**
 * Plugin loader statistics
 */
export interface PluginLoaderStats {
  readonly registry: import('./plugin-registry').PluginRegistryStats;
  readonly sandbox: import('../sandbox/sandbox-factory').SandboxFactoryStats;
  readonly memory: import('../sandbox/memory-manager').MemoryManagerStats;
  readonly execution: import('../sandbox/execution-timer').ExecutionTimerStats;
  readonly ipc: import('../api/ipc-bridge').IPCBridgeStats;
  readonly loadingCount: number;
}
