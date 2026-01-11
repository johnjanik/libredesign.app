/**
 * Plugin Console
 *
 * Developer console for plugin debugging with log levels and filtering.
 */

/**
 * Console log level
 */
export type LogLevel = 'debug' | 'log' | 'info' | 'warn' | 'error';

/**
 * Console entry
 */
export interface ConsoleEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly level: LogLevel;
  readonly pluginId: string;
  readonly message: string;
  readonly args: readonly unknown[];
  readonly stack?: string;
  readonly source?: ConsoleSource;
}

/**
 * Console source location
 */
export interface ConsoleSource {
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

/**
 * Console filter
 */
export interface ConsoleFilter {
  readonly levels: Set<LogLevel>;
  readonly pluginIds: Set<string>;
  readonly searchText: string;
  readonly showTimestamps: boolean;
}

/**
 * Console configuration
 */
export interface PluginConsoleConfig {
  /** Maximum entries to keep */
  readonly maxEntries: number;
  /** Default visible log levels */
  readonly defaultLevels: readonly LogLevel[];
  /** Enable persistent storage */
  readonly persist: boolean;
  /** Storage key prefix */
  readonly storageKey: string;
}

/**
 * Default console configuration
 */
export const DEFAULT_CONSOLE_CONFIG: PluginConsoleConfig = {
  maxEntries: 1000,
  defaultLevels: ['log', 'info', 'warn', 'error'],
  persist: false,
  storageKey: 'designlibre-plugin-console',
};

/**
 * Console event handler
 */
export type ConsoleEventHandler = (entry: ConsoleEntry) => void;

/**
 * Plugin Console class
 */
export class PluginConsole {
  private readonly config: PluginConsoleConfig;
  private readonly entries: ConsoleEntry[];
  private readonly listeners: Set<ConsoleEventHandler>;
  private filter: ConsoleFilter;
  private nextId: number;
  private paused: boolean;

  constructor(config: PluginConsoleConfig = DEFAULT_CONSOLE_CONFIG) {
    this.config = config;
    this.entries = [];
    this.listeners = new Set();
    this.nextId = 1;
    this.paused = false;
    this.filter = {
      levels: new Set(config.defaultLevels),
      pluginIds: new Set(),
      searchText: '',
      showTimestamps: true,
    };

    // Load persisted entries
    if (config.persist) {
      this.loadFromStorage();
    }
  }

  /**
   * Log a message
   */
  log(pluginId: string, ...args: unknown[]): void {
    this.addEntry('log', pluginId, args);
  }

  /**
   * Log a debug message
   */
  debug(pluginId: string, ...args: unknown[]): void {
    this.addEntry('debug', pluginId, args);
  }

  /**
   * Log an info message
   */
  info(pluginId: string, ...args: unknown[]): void {
    this.addEntry('info', pluginId, args);
  }

  /**
   * Log a warning message
   */
  warn(pluginId: string, ...args: unknown[]): void {
    this.addEntry('warn', pluginId, args);
  }

  /**
   * Log an error message
   */
  error(pluginId: string, ...args: unknown[]): void {
    this.addEntry('error', pluginId, args);
  }

  /**
   * Log an error with stack trace
   */
  errorWithStack(pluginId: string, error: Error, ...args: unknown[]): void {
    const entry = this.createEntry('error', pluginId, [error.message, ...args]);
    const entryWithStack: ConsoleEntry = error.stack !== undefined
      ? { ...entry, stack: error.stack }
      : entry;
    this.addEntryObject(entryWithStack);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.length = 0;
    this.saveToStorage();
  }

  /**
   * Clear entries for a specific plugin
   */
  clearPlugin(pluginId: string): void {
    const indicesToRemove: number[] = [];
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i]?.pluginId === pluginId) {
        indicesToRemove.push(i);
      }
    }
    for (const index of indicesToRemove) {
      this.entries.splice(index, 1);
    }
    this.saveToStorage();
  }

  /**
   * Get all entries
   */
  getEntries(): ConsoleEntry[] {
    return [...this.entries];
  }

  /**
   * Get filtered entries
   */
  getFilteredEntries(): ConsoleEntry[] {
    return this.entries.filter((entry) => this.matchesFilter(entry));
  }

  /**
   * Get entries for a specific plugin
   */
  getPluginEntries(pluginId: string): ConsoleEntry[] {
    return this.entries.filter((entry) => entry.pluginId === pluginId);
  }

  /**
   * Get filter state
   */
  getFilter(): ConsoleFilter {
    return {
      ...this.filter,
      levels: new Set(this.filter.levels),
      pluginIds: new Set(this.filter.pluginIds),
    };
  }

  /**
   * Set filter
   */
  setFilter(filter: Partial<ConsoleFilter>): void {
    this.filter = {
      ...this.filter,
      ...filter,
      levels: filter.levels ?? this.filter.levels,
      pluginIds: filter.pluginIds ?? this.filter.pluginIds,
    };
  }

  /**
   * Toggle log level filter
   */
  toggleLevel(level: LogLevel): void {
    const levels = new Set(this.filter.levels);
    if (levels.has(level)) {
      levels.delete(level);
    } else {
      levels.add(level);
    }
    this.filter = { ...this.filter, levels };
  }

  /**
   * Toggle plugin filter
   */
  togglePlugin(pluginId: string): void {
    const pluginIds = new Set(this.filter.pluginIds);
    if (pluginIds.has(pluginId)) {
      pluginIds.delete(pluginId);
    } else {
      pluginIds.add(pluginId);
    }
    this.filter = { ...this.filter, pluginIds };
  }

  /**
   * Set search text
   */
  setSearchText(text: string): void {
    this.filter = { ...this.filter, searchText: text };
  }

  /**
   * Pause logging
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume logging
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Add event listener
   */
  addListener(handler: ConsoleEventHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  /**
   * Export entries to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(
      {
        exported: Date.now(),
        entries: this.entries.map((entry) => ({
          ...entry,
          args: entry.args.map((arg) => this.serializeArg(arg)),
        })),
      },
      null,
      2
    );
  }

  /**
   * Export entries to text
   */
  exportToText(): string {
    return this.entries
      .map((entry) => {
        const timestamp = new Date(entry.timestamp).toISOString();
        const level = entry.level.toUpperCase().padEnd(5);
        const message = this.formatMessage(entry);
        return `[${timestamp}] [${level}] [${entry.pluginId}] ${message}`;
      })
      .join('\n');
  }

  /**
   * Get unique plugin IDs from entries
   */
  getPluginIds(): string[] {
    const ids = new Set<string>();
    for (const entry of this.entries) {
      ids.add(entry.pluginId);
    }
    return Array.from(ids);
  }

  /**
   * Get entry counts by level
   */
  getCounts(): Record<LogLevel, number> {
    const counts: Record<LogLevel, number> = {
      debug: 0,
      log: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    for (const entry of this.entries) {
      counts[entry.level]++;
    }

    return counts;
  }

  /**
   * Add entry
   */
  private addEntry(level: LogLevel, pluginId: string, args: unknown[]): void {
    if (this.paused) return;

    const entry = this.createEntry(level, pluginId, args);
    this.addEntryObject(entry);
  }

  /**
   * Create entry object
   */
  private createEntry(level: LogLevel, pluginId: string, args: unknown[]): ConsoleEntry {
    const message = this.formatArgs(args);
    const source = this.extractSource();

    const entryBase = {
      id: `console-${this.nextId++}`,
      timestamp: Date.now(),
      level,
      pluginId,
      message,
      args,
    };

    return source !== undefined
      ? { ...entryBase, source }
      : entryBase;
  }

  /**
   * Add entry object
   */
  private addEntryObject(entry: ConsoleEntry): void {
    this.entries.push(entry);

    // Trim entries if over limit
    while (this.entries.length > this.config.maxEntries) {
      this.entries.shift();
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // Ignore listener errors
      }
    }

    // Persist
    if (this.config.persist) {
      this.saveToStorage();
    }
  }

  /**
   * Check if entry matches filter
   */
  private matchesFilter(entry: ConsoleEntry): boolean {
    // Check level
    if (!this.filter.levels.has(entry.level)) {
      return false;
    }

    // Check plugin (if any plugins are selected)
    if (this.filter.pluginIds.size > 0 && !this.filter.pluginIds.has(entry.pluginId)) {
      return false;
    }

    // Check search text
    if (this.filter.searchText) {
      const searchLower = this.filter.searchText.toLowerCase();
      const messageLower = entry.message.toLowerCase();
      const pluginLower = entry.pluginId.toLowerCase();

      if (!messageLower.includes(searchLower) && !pluginLower.includes(searchLower)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Format args to message string
   */
  private formatArgs(args: unknown[]): string {
    return args.map((arg) => this.formatArg(arg)).join(' ');
  }

  /**
   * Format single arg
   */
  private formatArg(arg: unknown): string {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (arg instanceof Error) return `${arg.name}: ${arg.message}`;

    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }

  /**
   * Format entry message for display
   */
  private formatMessage(entry: ConsoleEntry): string {
    let message = entry.message;
    if (entry.stack) {
      message += `\n${entry.stack}`;
    }
    return message;
  }

  /**
   * Serialize arg for export
   */
  private serializeArg(arg: unknown): unknown {
    if (arg === null || arg === undefined) return arg;
    if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean')
      return arg;
    if (arg instanceof Error) {
      return {
        __type: 'Error',
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      };
    }

    try {
      // Test if serializable
      JSON.stringify(arg);
      return arg;
    } catch {
      return String(arg);
    }
  }

  /**
   * Extract source location (simplified - would need stack trace parsing)
   */
  private extractSource(): ConsoleSource | undefined {
    // In a real implementation, this would parse the stack trace
    // to find the plugin code location
    return undefined;
  }

  /**
   * Load entries from storage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.config.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed.entries)) {
          this.entries.push(...parsed.entries);
          this.nextId = this.entries.length + 1;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Save entries to storage
   */
  private saveToStorage(): void {
    try {
      const data = JSON.stringify({
        saved: Date.now(),
        entries: this.entries.slice(-100), // Only persist last 100
      });
      localStorage.setItem(this.config.storageKey, data);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Create a sandboxed console interface for a plugin
 */
export function createPluginConsoleInterface(
  console: PluginConsole,
  pluginId: string
): PluginConsoleInterface {
  return {
    log: (...args: unknown[]) => console.log(pluginId, ...args),
    debug: (...args: unknown[]) => console.debug(pluginId, ...args),
    info: (...args: unknown[]) => console.info(pluginId, ...args),
    warn: (...args: unknown[]) => console.warn(pluginId, ...args),
    error: (...args: unknown[]) => console.error(pluginId, ...args),
    clear: () => console.clearPlugin(pluginId),
  };
}

/**
 * Plugin console interface (exposed to plugins)
 */
export interface PluginConsoleInterface {
  log(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  clear(): void;
}
