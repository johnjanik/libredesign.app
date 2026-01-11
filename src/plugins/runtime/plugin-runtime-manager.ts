/**
 * Plugin Runtime Manager
 *
 * Connects the plugin UI to the plugin infrastructure (sandbox, loader, API).
 * Manages plugin lifecycle and provides a high-level API for the UI.
 */

import type { PluginManifest } from '../types/plugin-manifest';
import type { UIPluginInfo, PluginStatus } from '@ui/components/plugins-panel';

/**
 * Runtime plugin instance
 */
export interface RuntimePlugin {
  id: string;
  manifest: PluginManifest;
  status: PluginStatus;
  enabled: boolean;
  code: string;
  error?: string;
  loadedAt: number;
  lastRun?: number;
}

/**
 * Plugin runtime events
 */
export type PluginRuntimeEvent =
  | { type: 'plugin:loaded'; pluginId: string }
  | { type: 'plugin:unloaded'; pluginId: string }
  | { type: 'plugin:started'; pluginId: string }
  | { type: 'plugin:stopped'; pluginId: string }
  | { type: 'plugin:error'; pluginId: string; error: string }
  | { type: 'plugin:log'; pluginId: string; level: string; message: string };

/**
 * Event callback
 */
export type PluginRuntimeEventCallback = (event: PluginRuntimeEvent) => void;

/**
 * Plugin Runtime Manager
 */
export class PluginRuntimeManager {
  private plugins: Map<string, RuntimePlugin> = new Map();
  private listeners: Set<PluginRuntimeEventCallback> = new Set();
  private consoleOutput: Map<string, Array<{ level: string; message: string; timestamp: number }>> =
    new Map();

  constructor() {
    // Initialize
  }

  /**
   * Get all plugins as UI info
   */
  getPlugins(): UIPluginInfo[] {
    return Array.from(this.plugins.values()).map((plugin) => this.toUIPluginInfo(plugin));
  }

  /**
   * Get a single plugin
   */
  getPlugin(pluginId: string): RuntimePlugin | null {
    return this.plugins.get(pluginId) ?? null;
  }

  /**
   * Load a plugin from manifest and code
   */
  async loadPlugin(manifest: PluginManifest, code: string): Promise<RuntimePlugin> {
    const existing = this.plugins.get(manifest.id);
    if (existing) {
      throw new Error(`Plugin ${manifest.id} is already loaded`);
    }

    const plugin: RuntimePlugin = {
      id: manifest.id,
      manifest,
      status: 'installed',
      enabled: false,
      code,
      loadedAt: Date.now(),
    };

    this.plugins.set(manifest.id, plugin);
    this.emit({ type: 'plugin:loaded', pluginId: manifest.id });

    return plugin;
  }

  /**
   * Load a plugin from a local directory
   */
  async loadLocalPlugin(path: string): Promise<RuntimePlugin> {
    // In a real implementation, this would:
    // 1. Read plugin.json from the path
    // 2. Read the main entry file
    // 3. Validate the manifest
    // 4. Load the plugin

    // For now, we'll simulate loading the hello-world plugin
    const manifestResponse = await fetch(`${path}/plugin.json`);
    if (!manifestResponse.ok) {
      throw new Error(`Failed to load plugin manifest from ${path}/plugin.json`);
    }
    const manifest = (await manifestResponse.json()) as PluginManifest;

    // Load the main entry file
    const entryPath = manifest.entry.main.replace('./', '');
    const codeResponse = await fetch(`${path}/${entryPath}`);
    if (!codeResponse.ok) {
      throw new Error(`Failed to load plugin code from ${path}/${entryPath}`);
    }
    const code = await codeResponse.text();

    return this.loadPlugin(manifest, code);
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Stop if running
    if (plugin.status === 'running') {
      await this.stopPlugin(pluginId);
    }

    this.plugins.delete(pluginId);
    this.consoleOutput.delete(pluginId);
    this.emit({ type: 'plugin:unloaded', pluginId });
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.enabled = true;
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Stop if running
    if (plugin.status === 'running') {
      await this.stopPlugin(pluginId);
    }

    plugin.enabled = false;
  }

  /**
   * Run a plugin
   */
  async runPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (!plugin.enabled) {
      throw new Error(`Plugin ${pluginId} is not enabled`);
    }

    if (plugin.status === 'running') {
      throw new Error(`Plugin ${pluginId} is already running`);
    }

    plugin.status = 'loading';

    try {
      // Create a mock designtool API for the plugin
      const mockApi = this.createMockApi(pluginId);

      // Execute the plugin code in a sandboxed context
      // In a real implementation, this would use the QuickJS sandbox
      // For now, we'll use a Function constructor with the mock API
      await this.executePluginCode(plugin, mockApi);

      plugin.status = 'running';
      plugin.lastRun = Date.now();
      delete plugin.error;
      this.emit({ type: 'plugin:started', pluginId });
    } catch (error) {
      plugin.status = 'error';
      plugin.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit({ type: 'plugin:error', pluginId, error: plugin.error });
      throw error;
    }
  }

  /**
   * Stop a plugin
   */
  async stopPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status !== 'running') {
      return;
    }

    // In a real implementation, this would terminate the sandbox
    plugin.status = 'stopped';
    this.emit({ type: 'plugin:stopped', pluginId });
  }

  /**
   * Get console output for a plugin
   */
  getConsoleOutput(pluginId: string): Array<{ level: string; message: string; timestamp: number }> {
    return this.consoleOutput.get(pluginId) ?? [];
  }

  /**
   * Clear console output for a plugin
   */
  clearConsoleOutput(pluginId: string): void {
    this.consoleOutput.set(pluginId, []);
  }

  /**
   * Add event listener
   */
  addEventListener(callback: PluginRuntimeEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Convert runtime plugin to UI info
   */
  private toUIPluginInfo(plugin: RuntimePlugin): UIPluginInfo {
    const info: UIPluginInfo = {
      id: plugin.id,
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      description: plugin.manifest.description ?? '',
      author: plugin.manifest.author?.name ?? 'Unknown',
      status: plugin.status,
      enabled: plugin.enabled,
    };
    if (plugin.manifest.icon) {
      info.icon = plugin.manifest.icon;
    }
    if (plugin.error) {
      info.error = plugin.error;
    }
    return info;
  }

  /**
   * Emit an event
   */
  private emit(event: PluginRuntimeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Create mock API for plugin
   */
  private createMockApi(pluginId: string): object {
    const self = this;

    return {
      design: {
        async getSelection() {
          // Return mock selection
          return [];
        },
        async getNode(_id: string) {
          return null;
        },
        async getChildren(_id: string) {
          return [];
        },
        async findNodes(_query: unknown) {
          return [];
        },
      },
      selection: {
        async get() {
          return [];
        },
        async set(_ids: string[]) {},
        async clear() {},
      },
      ui: {
        async showToast(message: string, type: string = 'info') {
          // Show actual toast notification
          self.showToast(message, type as 'info' | 'success' | 'warning' | 'error');
        },
        async showPanel(_options: unknown) {
          return { id: 'mock-panel' };
        },
        async closePanel(_handle: unknown) {},
      },
      events: {
        async on(_event: string, _callback: unknown) {
          return 'listener-' + Math.random().toString(36).slice(2);
        },
        async off(_listenerId: string) {},
      },
      data: {
        storage: {
          async get(key: string) {
            const storageKey = `plugin:${pluginId}:${key}`;
            const value = localStorage.getItem(storageKey);
            return value ? JSON.parse(value) : null;
          },
          async set(key: string, value: unknown) {
            const storageKey = `plugin:${pluginId}:${key}`;
            localStorage.setItem(storageKey, JSON.stringify(value));
          },
          async delete(key: string) {
            const storageKey = `plugin:${pluginId}:${key}`;
            localStorage.removeItem(storageKey);
          },
        },
      },
      console: {
        log: (...args: unknown[]) => self.pluginLog(pluginId, 'log', args),
        debug: (...args: unknown[]) => self.pluginLog(pluginId, 'debug', args),
        info: (...args: unknown[]) => self.pluginLog(pluginId, 'info', args),
        warn: (...args: unknown[]) => self.pluginLog(pluginId, 'warn', args),
        error: (...args: unknown[]) => self.pluginLog(pluginId, 'error', args),
        clear: () => self.clearConsoleOutput(pluginId),
      },
    };
  }

  /**
   * Execute plugin code
   */
  private async executePluginCode(plugin: RuntimePlugin, api: object): Promise<void> {
    // Create a sandboxed execution context
    // In production, this would use QuickJS WebAssembly
    // For now, inject the API as a global and execute the code

    // Inject the API as a global (plugins expect `designtool` to be global)
    // Note: In a real implementation, each plugin would have its own isolated sandbox
    // For now, we keep it simple - the API stays available for event callbacks
    (window as unknown as Record<string, unknown>)['designtool'] = api;

    try {
      // Execute the plugin code
      // The plugin code is typically a bundled IIFE that accesses `designtool` globally
      const fn = new Function(plugin.code);
      await fn();
    } catch (error) {
      throw new Error(`Plugin execution failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Log from plugin
   */
  private pluginLog(pluginId: string, level: string, args: unknown[]): void {
    const message = args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');

    // Store in console output
    if (!this.consoleOutput.has(pluginId)) {
      this.consoleOutput.set(pluginId, []);
    }
    const output = this.consoleOutput.get(pluginId)!;
    output.push({ level, message, timestamp: Date.now() });

    // Limit stored output
    while (output.length > 1000) {
      output.shift();
    }

    // Also log to browser console
    const prefix = `[Plugin:${pluginId}]`;
    switch (level) {
      case 'debug':
        console.debug(prefix, ...args);
        break;
      case 'info':
        console.info(prefix, ...args);
        break;
      case 'warn':
        console.warn(prefix, ...args);
        break;
      case 'error':
        console.error(prefix, ...args);
        break;
      default:
        console.log(prefix, ...args);
    }

    this.emit({ type: 'plugin:log', pluginId, level, message });
  }

  /**
   * Show toast notification
   */
  private showToast(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
    // Create and show toast directly
    const colors = {
      info: { bg: '#0d99ff', text: '#ffffff' },
      success: { bg: '#1db954', text: '#ffffff' },
      warning: { bg: '#f5a623', text: '#000000' },
      error: { bg: '#ff4444', text: '#ffffff' },
    };

    const color = colors[type];
    const toast = document.createElement('div');
    toast.className = 'designlibre-plugin-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: ${color.bg};
      color: ${color.text};
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: pluginToastIn 0.2s ease-out;
    `;
    toast.textContent = message;

    // Add animation keyframes if not already present
    if (!document.getElementById('plugin-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'plugin-toast-styles';
      style.textContent = `
        @keyframes pluginToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pluginToastOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(10px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'pluginToastOut 0.2s ease-out forwards';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }
}

/**
 * Singleton instance
 */
let runtimeManagerInstance: PluginRuntimeManager | null = null;

/**
 * Get or create the plugin runtime manager instance
 */
export function getPluginRuntimeManager(): PluginRuntimeManager {
  if (!runtimeManagerInstance) {
    runtimeManagerInstance = new PluginRuntimeManager();
  }
  return runtimeManagerInstance;
}
