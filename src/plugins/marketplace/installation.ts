/**
 * Plugin Installation
 *
 * Handles plugin installation, update, and uninstallation flows.
 */

import type { PluginManifest } from '../types/plugin-manifest';
import type { MarketplaceClient, PluginDownload, PluginListing } from './marketplace-client';

/**
 * Installation status
 */
export type InstallationStatus =
  | 'pending'
  | 'downloading'
  | 'verifying'
  | 'extracting'
  | 'installing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Installation progress
 */
export interface InstallationProgress {
  readonly pluginId: string;
  readonly status: InstallationStatus;
  readonly progress: number;
  readonly message: string;
  readonly bytesDownloaded: number;
  readonly totalBytes: number;
  readonly startTime: number;
  readonly error?: string;
}

/**
 * Installed plugin info
 */
export interface InstalledPlugin {
  readonly pluginId: string;
  readonly name: string;
  readonly version: string;
  readonly installedAt: number;
  readonly updatedAt: number;
  readonly enabled: boolean;
  readonly manifest: PluginManifest;
  readonly installPath: string;
  readonly sourceType: 'marketplace' | 'local' | 'development';
  readonly listing?: PluginListing;
}

/**
 * Installation options
 */
export interface InstallOptions {
  /** Enable plugin after installation */
  readonly enableAfterInstall?: boolean;
  /** Replace existing version if installed */
  readonly replace?: boolean;
  /** Specific version to install */
  readonly version?: string;
  /** Skip verification (development only) */
  readonly skipVerification?: boolean;
}

/**
 * Installation callback
 */
export type InstallationCallback = (progress: InstallationProgress) => void;

/**
 * Plugin storage backend
 */
export interface PluginStorageBackend {
  savePlugin(pluginId: string, data: ArrayBuffer, manifest: PluginManifest): Promise<string>;
  loadPlugin(pluginId: string): Promise<{ code: string; manifest: PluginManifest } | null>;
  deletePlugin(pluginId: string): Promise<boolean>;
  listPlugins(): Promise<string[]>;
  getPluginPath(pluginId: string): string;
}

/**
 * Installation manager configuration
 */
export interface InstallationManagerConfig {
  /** Maximum concurrent installations */
  readonly maxConcurrent: number;
  /** Download timeout in ms */
  readonly downloadTimeout: number;
  /** Retry failed downloads */
  readonly retryCount: number;
  /** Retry delay in ms */
  readonly retryDelay: number;
  /** Verify plugin signatures */
  readonly verifySignatures: boolean;
}

/**
 * Default installation manager configuration
 */
export const DEFAULT_INSTALLATION_CONFIG: InstallationManagerConfig = {
  maxConcurrent: 3,
  downloadTimeout: 60000,
  retryCount: 3,
  retryDelay: 1000,
  verifySignatures: true,
};

/**
 * Installation task
 */
interface InstallationTask {
  pluginId: string;
  download: PluginDownload;
  options: InstallOptions;
  progress: InstallationProgress;
  abortController: AbortController;
  resolve: (result: InstalledPlugin) => void;
  reject: (error: Error) => void;
}

/**
 * Installation Manager class
 */
export class InstallationManager {
  private readonly config: InstallationManagerConfig;
  private readonly client: MarketplaceClient;
  private readonly storage: PluginStorageBackend;
  private readonly installedPlugins: Map<string, InstalledPlugin>;
  private readonly activeInstalls: Map<string, InstallationTask>;
  private readonly pendingInstalls: InstallationTask[];
  private readonly callbacks: Set<InstallationCallback>;

  constructor(
    client: MarketplaceClient,
    storage: PluginStorageBackend,
    config: InstallationManagerConfig = DEFAULT_INSTALLATION_CONFIG
  ) {
    this.config = config;
    this.client = client;
    this.storage = storage;
    this.installedPlugins = new Map();
    this.activeInstalls = new Map();
    this.pendingInstalls = [];
    this.callbacks = new Set();
  }

  /**
   * Install a plugin from the marketplace
   */
  async install(pluginId: string, options: InstallOptions = {}): Promise<InstalledPlugin> {
    // Check if already installed
    const existing = this.installedPlugins.get(pluginId);
    if (existing && !options.replace) {
      throw new InstallationError('Plugin already installed', 'ALREADY_INSTALLED', pluginId);
    }

    // Check if already installing
    if (this.activeInstalls.has(pluginId)) {
      throw new InstallationError('Installation in progress', 'IN_PROGRESS', pluginId);
    }

    // Get download info
    const download = await this.client.getDownload(pluginId, options.version);

    // Create installation task
    return new Promise((resolve, reject) => {
      const task: InstallationTask = {
        pluginId,
        download,
        options,
        progress: {
          pluginId,
          status: 'pending',
          progress: 0,
          message: 'Waiting to start...',
          bytesDownloaded: 0,
          totalBytes: 0,
          startTime: Date.now(),
        },
        abortController: new AbortController(),
        resolve,
        reject,
      };

      // Check concurrent limit
      if (this.activeInstalls.size >= this.config.maxConcurrent) {
        this.pendingInstalls.push(task);
        this.notifyProgress(task.progress);
      } else {
        this.startInstallation(task);
      }
    });
  }

  /**
   * Install from local file
   */
  async installFromFile(
    file: ArrayBuffer,
    manifest: PluginManifest,
    options: InstallOptions = {}
  ): Promise<InstalledPlugin> {
    const pluginId = manifest.id;

    // Check if already installed
    const existing = this.installedPlugins.get(pluginId);
    if (existing && !options.replace) {
      throw new InstallationError('Plugin already installed', 'ALREADY_INSTALLED', pluginId);
    }

    // Save plugin
    const installPath = await this.storage.savePlugin(pluginId, file, manifest);

    // Create installed plugin record
    const installed: InstalledPlugin = {
      pluginId,
      name: manifest.name,
      version: manifest.version,
      installedAt: Date.now(),
      updatedAt: Date.now(),
      enabled: options.enableAfterInstall ?? true,
      manifest,
      installPath,
      sourceType: 'local',
    };

    this.installedPlugins.set(pluginId, installed);

    return installed;
  }

  /**
   * Update a plugin
   */
  async update(pluginId: string, version?: string): Promise<InstalledPlugin> {
    const existing = this.installedPlugins.get(pluginId);
    if (!existing) {
      throw new InstallationError('Plugin not installed', 'NOT_INSTALLED', pluginId);
    }

    // Install with replace option
    const options: InstallOptions = {
      replace: true,
      enableAfterInstall: existing.enabled,
    };
    if (version !== undefined) {
      (options as { version: string }).version = version;
    }
    return this.install(pluginId, options);
  }

  /**
   * Uninstall a plugin
   */
  async uninstall(pluginId: string): Promise<boolean> {
    const existing = this.installedPlugins.get(pluginId);
    if (!existing) {
      return false;
    }

    // Delete from storage
    await this.storage.deletePlugin(pluginId);

    // Remove from installed list
    this.installedPlugins.delete(pluginId);

    return true;
  }

  /**
   * Cancel an installation
   */
  cancel(pluginId: string): boolean {
    // Check active installs
    const activeTask = this.activeInstalls.get(pluginId);
    if (activeTask) {
      activeTask.abortController.abort();
      this.updateProgress(activeTask, 'cancelled', 'Installation cancelled');
      activeTask.reject(new InstallationError('Installation cancelled', 'CANCELLED', pluginId));
      this.activeInstalls.delete(pluginId);
      this.processQueue();
      return true;
    }

    // Check pending installs
    const pendingIndex = this.pendingInstalls.findIndex((t) => t.pluginId === pluginId);
    if (pendingIndex >= 0) {
      const task = this.pendingInstalls.splice(pendingIndex, 1)[0];
      if (task) {
        this.updateProgress(task, 'cancelled', 'Installation cancelled');
        task.reject(new InstallationError('Installation cancelled', 'CANCELLED', pluginId));
      }
      return true;
    }

    return false;
  }

  /**
   * Get installed plugin
   */
  getInstalled(pluginId: string): InstalledPlugin | null {
    return this.installedPlugins.get(pluginId) ?? null;
  }

  /**
   * Get all installed plugins
   */
  getAllInstalled(): InstalledPlugin[] {
    return Array.from(this.installedPlugins.values());
  }

  /**
   * Check if plugin is installed
   */
  isInstalled(pluginId: string): boolean {
    return this.installedPlugins.has(pluginId);
  }

  /**
   * Enable a plugin
   */
  enablePlugin(pluginId: string): boolean {
    const plugin = this.installedPlugins.get(pluginId);
    if (!plugin) return false;

    this.installedPlugins.set(pluginId, { ...plugin, enabled: true });
    return true;
  }

  /**
   * Disable a plugin
   */
  disablePlugin(pluginId: string): boolean {
    const plugin = this.installedPlugins.get(pluginId);
    if (!plugin) return false;

    this.installedPlugins.set(pluginId, { ...plugin, enabled: false });
    return true;
  }

  /**
   * Get installation progress
   */
  getProgress(pluginId: string): InstallationProgress | null {
    const task = this.activeInstalls.get(pluginId);
    if (task) return task.progress;

    const pending = this.pendingInstalls.find((t) => t.pluginId === pluginId);
    if (pending) return pending.progress;

    return null;
  }

  /**
   * Get all active installations
   */
  getActiveInstallations(): InstallationProgress[] {
    return [
      ...Array.from(this.activeInstalls.values()).map((t) => t.progress),
      ...this.pendingInstalls.map((t) => t.progress),
    ];
  }

  /**
   * Register progress callback
   */
  onProgress(callback: InstallationCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Load installed plugins from storage
   */
  async loadInstalled(): Promise<void> {
    const pluginIds = await this.storage.listPlugins();

    for (const pluginId of pluginIds) {
      const pluginData = await this.storage.loadPlugin(pluginId);
      if (pluginData) {
        const installed: InstalledPlugin = {
          pluginId,
          name: pluginData.manifest.name,
          version: pluginData.manifest.version,
          installedAt: Date.now(),
          updatedAt: Date.now(),
          enabled: true,
          manifest: pluginData.manifest,
          installPath: this.storage.getPluginPath(pluginId),
          sourceType: 'marketplace',
        };
        this.installedPlugins.set(pluginId, installed);
      }
    }
  }

  /**
   * Start installation process
   */
  private async startInstallation(task: InstallationTask): Promise<void> {
    this.activeInstalls.set(task.pluginId, task);

    try {
      // Download
      this.updateProgress(task, 'downloading', 'Downloading plugin...');
      const data = await this.downloadWithProgress(task);

      // Verify
      if (this.config.verifySignatures && !task.options.skipVerification) {
        this.updateProgress(task, 'verifying', 'Verifying signature...');
        await this.verifyPlugin(task.download, data);
      }

      // Extract and parse manifest
      this.updateProgress(task, 'extracting', 'Extracting plugin...');
      const manifest = await this.extractManifest(data);

      // Install
      this.updateProgress(task, 'installing', 'Installing plugin...');
      const installPath = await this.storage.savePlugin(task.pluginId, data, manifest);

      // Get listing info
      let listing: PluginListing | undefined;
      try {
        listing = await this.client.getPlugin(task.pluginId);
      } catch {
        // Listing not required
      }

      // Create installed record
      const installedBase = {
        pluginId: task.pluginId,
        name: manifest.name,
        version: manifest.version,
        installedAt: Date.now(),
        updatedAt: Date.now(),
        enabled: task.options.enableAfterInstall ?? true,
        manifest,
        installPath,
        sourceType: 'marketplace' as const,
      };
      const installed: InstalledPlugin = listing !== undefined
        ? { ...installedBase, listing }
        : installedBase;

      this.installedPlugins.set(task.pluginId, installed);

      // Complete
      this.updateProgress(task, 'completed', 'Installation complete');
      task.resolve(installed);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Installation failed';
      this.updateProgress(task, 'failed', errorMessage, errorMessage);
      task.reject(
        error instanceof Error
          ? error
          : new InstallationError(errorMessage, 'UNKNOWN', task.pluginId)
      );
    } finally {
      this.activeInstalls.delete(task.pluginId);
      this.processQueue();
    }
  }

  /**
   * Download with progress tracking
   */
  private async downloadWithProgress(task: InstallationTask): Promise<ArrayBuffer> {
    let retries = 0;

    while (retries <= this.config.retryCount) {
      try {
        const response = await fetch(task.download.downloadUrl, {
          signal: task.abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }

        const contentLength = response.headers.get('content-length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

        if (!response.body) {
          return response.arrayBuffer();
        }

        // Stream download with progress
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let bytesDownloaded = 0;

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          chunks.push(value);
          bytesDownloaded += value.length;

          // Update progress
          const progress = totalBytes > 0 ? (bytesDownloaded / totalBytes) * 100 : 0;
          task.progress = {
            ...task.progress,
            progress: Math.min(progress, 99),
            bytesDownloaded,
            totalBytes,
          };
          this.notifyProgress(task.progress);
        }

        // Combine chunks
        const result = new Uint8Array(bytesDownloaded);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }

        return result.buffer;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }

        retries++;
        if (retries > this.config.retryCount) {
          throw error;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay * retries));
      }
    }

    throw new Error('Download failed after retries');
  }

  /**
   * Verify plugin signature
   */
  private async verifyPlugin(download: PluginDownload, data: ArrayBuffer): Promise<void> {
    // Calculate checksum
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const checksum = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    if (checksum !== download.checksum) {
      throw new InstallationError('Checksum verification failed', 'CHECKSUM_MISMATCH');
    }

    // TODO: Verify signature using public key
    // This would require importing the marketplace's public key
    // and verifying the signature against the checksum
  }

  /**
   * Extract manifest from plugin package
   */
  private async extractManifest(data: ArrayBuffer): Promise<PluginManifest> {
    // For now, assume the data is a JSON manifest + code bundle
    // In a real implementation, this would handle ZIP extraction
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(data);

      // Try to parse as manifest
      // In reality, we'd extract from a ZIP archive
      const manifest = JSON.parse(text) as PluginManifest;

      if (!manifest.id || !manifest.version || !manifest.name) {
        throw new Error('Invalid manifest');
      }

      return manifest;
    } catch {
      throw new InstallationError('Failed to extract manifest', 'INVALID_PACKAGE');
    }
  }

  /**
   * Process pending installation queue
   */
  private processQueue(): void {
    while (
      this.pendingInstalls.length > 0 &&
      this.activeInstalls.size < this.config.maxConcurrent
    ) {
      const task = this.pendingInstalls.shift();
      if (task) {
        this.startInstallation(task);
      }
    }
  }

  /**
   * Update installation progress
   */
  private updateProgress(
    task: InstallationTask,
    status: InstallationStatus,
    message: string,
    error?: string
  ): void {
    const progressBase = {
      ...task.progress,
      status,
      message,
      progress: status === 'completed' ? 100 : task.progress.progress,
    };
    task.progress = error !== undefined
      ? { ...progressBase, error }
      : progressBase;
    this.notifyProgress(task.progress);
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(progress: InstallationProgress): void {
    for (const callback of this.callbacks) {
      try {
        callback(progress);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

/**
 * Installation error
 */
export class InstallationError extends Error {
  readonly code: string;
  readonly pluginId?: string;

  constructor(message: string, code: string, pluginId?: string) {
    super(message);
    this.name = 'InstallationError';
    this.code = code;
    if (pluginId !== undefined) {
      this.pluginId = pluginId;
    }
  }
}

/**
 * IndexedDB plugin storage backend
 */
export class IndexedDBPluginStorage implements PluginStorageBackend {
  private db: IDBDatabase | null = null;
  private readonly dbName: string;
  private readonly storeName: string;

  constructor(dbName: string = 'designlibre-plugins', storeName: string = 'plugins') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'pluginId' });
        }
      };
    });
  }

  async savePlugin(
    pluginId: string,
    data: ArrayBuffer,
    manifest: PluginManifest
  ): Promise<string> {
    await this.init();

    const decoder = new TextDecoder();
    const code = decoder.decode(data);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({
        pluginId,
        code,
        manifest,
        installedAt: Date.now(),
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(`indexeddb://${this.dbName}/${this.storeName}/${pluginId}`);
    });
  }

  async loadPlugin(
    pluginId: string
  ): Promise<{ code: string; manifest: PluginManifest } | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(pluginId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          resolve({
            code: request.result.code,
            manifest: request.result.manifest,
          });
        } else {
          resolve(null);
        }
      };
    });
  }

  async deletePlugin(pluginId: string): Promise<boolean> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(pluginId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  }

  async listPlugins(): Promise<string[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  }

  getPluginPath(pluginId: string): string {
    return `indexeddb://${this.dbName}/${this.storeName}/${pluginId}`;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
