/**
 * Plugin Registry
 *
 * Tracks registered and loaded plugins.
 */

import type { PluginManifest, PluginId } from '../types/plugin-manifest';
import type { QuickJSSandbox } from '../sandbox/quickjs-sandbox';

/**
 * Plugin state
 */
export type PluginState =
  | 'registered' // Manifest registered but not loaded
  | 'loading' // Currently loading
  | 'active' // Running
  | 'suspended' // Temporarily suspended
  | 'error' // Error state
  | 'unloading' // Currently unloading
  | 'unloaded'; // Unloaded

/**
 * Plugin instance information
 */
export interface PluginInstance {
  /** Plugin ID */
  readonly id: PluginId;
  /** Plugin manifest */
  readonly manifest: PluginManifest;
  /** Current state */
  state: PluginState;
  /** Associated sandbox (if active) */
  sandbox?: QuickJSSandbox;
  /** Load timestamp */
  loadedAt?: number;
  /** Last error */
  lastError?: string;
  /** State change history */
  stateHistory: Array<{ state: PluginState; timestamp: number }>;
}

/**
 * Plugin state change callback
 */
export type PluginStateCallback = (
  pluginId: PluginId,
  oldState: PluginState,
  newState: PluginState
) => void;

/**
 * Plugin Registry
 */
export class PluginRegistry {
  private plugins: Map<PluginId, PluginInstance> = new Map();
  private stateCallbacks: Set<PluginStateCallback> = new Set();

  /**
   * Register a plugin from its manifest
   */
  register(manifest: PluginManifest): void {
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already registered`);
    }

    const instance: PluginInstance = {
      id: manifest.id,
      manifest,
      state: 'registered',
      stateHistory: [{ state: 'registered', timestamp: Date.now() }],
    };

    this.plugins.set(manifest.id, instance);
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: PluginId): void {
    const instance = this.plugins.get(pluginId);
    if (instance && instance.state !== 'active' && instance.state !== 'loading') {
      this.plugins.delete(pluginId);
    } else if (instance) {
      throw new Error(`Cannot unregister plugin ${pluginId} in state ${instance.state}`);
    }
  }

  /**
   * Get a plugin instance
   */
  get(pluginId: PluginId): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Check if a plugin is registered
   */
  has(pluginId: PluginId): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get all registered plugin IDs
   */
  getPluginIds(): PluginId[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get plugins by state
   */
  getByState(state: PluginState): PluginInstance[] {
    return Array.from(this.plugins.values()).filter((p) => p.state === state);
  }

  /**
   * Update plugin state
   */
  setState(pluginId: PluginId, newState: PluginState): void {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const oldState = instance.state;
    instance.state = newState;
    instance.stateHistory.push({ state: newState, timestamp: Date.now() });

    // Keep history limited
    if (instance.stateHistory.length > 100) {
      instance.stateHistory.shift();
    }

    // Notify callbacks
    for (const callback of this.stateCallbacks) {
      try {
        callback(pluginId, oldState, newState);
      } catch (error) {
        console.error('Plugin state callback error:', error);
      }
    }
  }

  /**
   * Set plugin sandbox
   */
  setSandbox(pluginId: PluginId, sandbox: QuickJSSandbox): void {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    instance.sandbox = sandbox;
    instance.loadedAt = Date.now();
  }

  /**
   * Clear plugin sandbox
   */
  clearSandbox(pluginId: PluginId): void {
    const instance = this.plugins.get(pluginId);
    if (instance) {
      delete instance.sandbox;
    }
  }

  /**
   * Set plugin error
   */
  setError(pluginId: PluginId, error: string): void {
    const instance = this.plugins.get(pluginId);
    if (instance) {
      instance.lastError = error;
      this.setState(pluginId, 'error');
    }
  }

  /**
   * Clear plugin error
   */
  clearError(pluginId: PluginId): void {
    const instance = this.plugins.get(pluginId);
    if (instance) {
      delete instance.lastError;
    }
  }

  /**
   * Add state change callback
   */
  onStateChange(callback: PluginStateCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  /**
   * Get active plugin count
   */
  getActiveCount(): number {
    return this.getByState('active').length;
  }

  /**
   * Get registry statistics
   */
  getStatistics(): PluginRegistryStats {
    const byState: Record<PluginState, number> = {
      registered: 0,
      loading: 0,
      active: 0,
      suspended: 0,
      error: 0,
      unloading: 0,
      unloaded: 0,
    };

    for (const instance of this.plugins.values()) {
      byState[instance.state]++;
    }

    return {
      total: this.plugins.size,
      byState,
    };
  }

  /**
   * Dispose the registry
   */
  dispose(): void {
    this.plugins.clear();
    this.stateCallbacks.clear();
  }
}

/**
 * Plugin registry statistics
 */
export interface PluginRegistryStats {
  readonly total: number;
  readonly byState: Record<PluginState, number>;
}
