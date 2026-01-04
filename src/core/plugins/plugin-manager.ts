/**
 * Plugin Manager
 *
 * Manages loading, enabling, and disabling of plugins.
 */

import { EventEmitter } from '@core/events/event-emitter';

/**
 * Plugin definition
 */
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  /** Called when plugin is enabled */
  onEnable?: () => void | Promise<void>;
  /** Called when plugin is disabled */
  onDisable?: () => void | Promise<void>;
  /** Called on app startup if plugin is enabled */
  onInit?: () => void | Promise<void>;
}

/**
 * Plugin manager events
 */
export type PluginManagerEvents = {
  'plugin:enabled': { pluginId: string };
  'plugin:disabled': { pluginId: string };
  'plugin:registered': { pluginId: string };
  [key: string]: unknown;
};

const STORAGE_KEY = 'designlibre-plugins';

/**
 * Plugin Manager
 */
export class PluginManager extends EventEmitter<PluginManagerEvents> {
  private plugins: Map<string, Plugin> = new Map();
  private enabledPlugins: Set<string> = new Set();

  constructor() {
    super();
    this.loadEnabledState();
  }

  /**
   * Load enabled state from localStorage
   */
  private loadEnabledState(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const enabled = JSON.parse(stored) as string[];
        this.enabledPlugins = new Set(enabled);
      }
    } catch {
      // localStorage not available
    }
  }

  /**
   * Save enabled state to localStorage
   */
  private saveEnabledState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.enabledPlugins]));
    } catch {
      // localStorage not available
    }
  }

  /**
   * Register a plugin
   */
  register(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);

    // Check if it should be enabled by default or from saved state
    if (this.enabledPlugins.has(plugin.id) || (plugin.enabled && !this.hasStoredState(plugin.id))) {
      this.enabledPlugins.add(plugin.id);
      plugin.enabled = true;
    } else {
      plugin.enabled = false;
    }

    this.emit('plugin:registered', { pluginId: plugin.id });
  }

  /**
   * Check if we have a stored state for this plugin
   */
  private hasStoredState(_pluginId: string): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get a plugin by ID
   */
  get(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    return this.enabledPlugins.has(pluginId);
  }

  /**
   * Enable a plugin
   */
  async enable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    if (!this.enabledPlugins.has(pluginId)) {
      this.enabledPlugins.add(pluginId);
      plugin.enabled = true;
      this.saveEnabledState();

      if (plugin.onEnable) {
        await plugin.onEnable();
      }

      this.emit('plugin:enabled', { pluginId });
    }
  }

  /**
   * Disable a plugin
   */
  async disable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    if (this.enabledPlugins.has(pluginId)) {
      this.enabledPlugins.delete(pluginId);
      plugin.enabled = false;
      this.saveEnabledState();

      if (plugin.onDisable) {
        await plugin.onDisable();
      }

      this.emit('plugin:disabled', { pluginId });
    }
  }

  /**
   * Toggle a plugin
   */
  async toggle(pluginId: string): Promise<void> {
    if (this.isEnabled(pluginId)) {
      await this.disable(pluginId);
    } else {
      await this.enable(pluginId);
    }
  }

  /**
   * Initialize all enabled plugins
   */
  async initializeAll(): Promise<void> {
    for (const [pluginId, plugin] of this.plugins) {
      if (this.enabledPlugins.has(pluginId) && plugin.onInit) {
        try {
          await plugin.onInit();
        } catch (error) {
          console.error(`Failed to initialize plugin ${pluginId}:`, error);
        }
      }
    }
  }
}

// Singleton instance
let pluginManagerInstance: PluginManager | null = null;

/**
 * Get the plugin manager instance
 */
export function getPluginManager(): PluginManager {
  if (!pluginManagerInstance) {
    pluginManagerInstance = new PluginManager();
  }
  return pluginManagerInstance;
}

/**
 * Register built-in plugins
 */
export function registerBuiltInPlugins(): void {
  const manager = getPluginManager();

  // Code Export plugin
  manager.register({
    id: 'code-export',
    name: 'Code Export',
    description: 'Export designs to React, SwiftUI, Compose',
    version: '1.0.0',
    enabled: true,
  });

  // Version History plugin
  manager.register({
    id: 'version-history',
    name: 'Version History',
    description: 'Track changes with Git integration',
    version: '1.0.0',
    enabled: true,
  });

  // AI Assistant plugin
  manager.register({
    id: 'ai-assistant',
    name: 'AI Assistant',
    description: 'AI-powered design suggestions',
    version: '1.0.0',
    enabled: false,
  });
}
