/**
 * Console API
 *
 * Host API providing sandboxed console logging for plugins.
 */

import type { SerializableValue } from '../../types/serialization';

/**
 * Console log level
 */
export type ConsoleLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace';

/**
 * Console log entry
 */
export interface ConsoleLogEntry {
  readonly timestamp: number;
  readonly pluginId: string;
  readonly level: ConsoleLogLevel;
  readonly message: string;
  readonly args: readonly SerializableValue[];
  readonly stack?: string;
}

/**
 * Console configuration
 */
export interface ConsoleConfig {
  /** Maximum log entries to keep per plugin */
  readonly maxEntriesPerPlugin: number;
  /** Maximum message length */
  readonly maxMessageLength: number;
  /** Maximum arguments per log call */
  readonly maxArgs: number;
  /** Whether to forward to browser console */
  readonly forwardToConsole: boolean;
}

/**
 * Default console configuration
 */
export const DEFAULT_CONSOLE_CONFIG: ConsoleConfig = {
  maxEntriesPerPlugin: 1000,
  maxMessageLength: 10000,
  maxArgs: 20,
  forwardToConsole: true,
};

/**
 * Console output handler
 */
export interface ConsoleOutputHandler {
  onLog(entry: ConsoleLogEntry): void;
}

/**
 * Plugin console state
 */
interface PluginConsoleState {
  readonly pluginId: string;
  entries: ConsoleLogEntry[];
}

/**
 * Format a value for console output
 */
function formatValue(value: SerializableValue, depth: number = 0): string {
  if (depth > 5) return '[...]';

  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'string') {
    if (depth === 0) return value;
    return `"${value.length > 100 ? value.substring(0, 100) + '...' : value}"`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length > 10) {
      const items = value.slice(0, 10).map((v) => formatValue(v, depth + 1));
      return `[${items.join(', ')}, ... ${value.length - 10} more]`;
    }
    return `[${value.map((v) => formatValue(v, depth + 1)).join(', ')}]`;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, SerializableValue>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    if (keys.length > 10) {
      const items = keys
        .slice(0, 10)
        .map((k) => `${k}: ${formatValue(obj[k] ?? null, depth + 1)}`);
      return `{${items.join(', ')}, ... ${keys.length - 10} more}`;
    }
    return `{${keys.map((k) => `${k}: ${formatValue(obj[k] ?? null, depth + 1)}`).join(', ')}}`;
  }

  return String(value);
}

/**
 * Create the Console API handlers
 */
export function createConsoleAPI(
  config: ConsoleConfig = DEFAULT_CONSOLE_CONFIG,
  outputHandler?: ConsoleOutputHandler
) {
  const pluginStates = new Map<string, PluginConsoleState>();

  // Get or create plugin console state
  function getPluginState(pluginId: string): PluginConsoleState {
    let state = pluginStates.get(pluginId);
    if (!state) {
      state = {
        pluginId,
        entries: [],
      };
      pluginStates.set(pluginId, state);
    }
    return state;
  }

  // Create a log entry
  function createLogEntry(
    pluginId: string,
    level: ConsoleLogLevel,
    args: readonly SerializableValue[]
  ): ConsoleLogEntry {
    // Format the message from args
    let message = '';
    if (args.length > 0) {
      const firstArg = args[0];
      if (typeof firstArg === 'string') {
        // Support printf-style formatting
        message = firstArg;
        let argIndex = 1;
        message = message.replace(/%[sdifjoO%]/g, (match) => {
          if (match === '%%') return '%';
          if (argIndex >= args.length) return match;
          const arg = args[argIndex++] ?? null;
          switch (match) {
            case '%s':
              return String(arg);
            case '%d':
            case '%i':
              return String(Math.floor(Number(arg) || 0));
            case '%f':
              return String(Number(arg) || 0);
            case '%j':
            case '%o':
            case '%O':
              return formatValue(arg);
            default:
              return match;
          }
        });
        // Append remaining args
        for (let i = argIndex; i < args.length; i++) {
          const arg = args[i];
          if (arg !== undefined) {
            message += ' ' + formatValue(arg);
          }
        }
      } else {
        message = args.map((arg) => formatValue(arg)).join(' ');
      }
    }

    // Truncate message if too long
    if (message.length > config.maxMessageLength) {
      message = message.substring(0, config.maxMessageLength) + '...';
    }

    // Capture stack trace for errors
    let stack: string | undefined;
    if (level === 'error' || level === 'trace') {
      const error = new Error();
      stack = error.stack
        ?.split('\n')
        .slice(3) // Skip internal frames
        .join('\n');
    }

    const entry: ConsoleLogEntry = {
      timestamp: Date.now(),
      pluginId,
      level,
      message,
      args: args.slice(0, config.maxArgs),
      ...(stack !== undefined && { stack }),
    };

    return entry;
  }

  // Add entry to plugin log
  function addEntry(entry: ConsoleLogEntry): void {
    const state = getPluginState(entry.pluginId);

    // Add entry
    state.entries.push(entry);

    // Trim if over limit
    if (state.entries.length > config.maxEntriesPerPlugin) {
      state.entries = state.entries.slice(-config.maxEntriesPerPlugin);
    }

    // Notify output handler
    if (outputHandler) {
      outputHandler.onLog(entry);
    }

    // Forward to browser console
    if (config.forwardToConsole) {
      const prefix = `[Plugin: ${entry.pluginId}]`;
      switch (entry.level) {
        case 'log':
          console.log(prefix, entry.message);
          break;
        case 'info':
          console.info(prefix, entry.message);
          break;
        case 'warn':
          console.warn(prefix, entry.message);
          break;
        case 'error':
          console.error(prefix, entry.message);
          break;
        case 'debug':
          console.debug(prefix, entry.message);
          break;
        case 'trace':
          console.trace(prefix, entry.message);
          break;
      }
    }
  }

  // Generic log handler
  function logHandler(level: ConsoleLogLevel) {
    return async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const entry = createLogEntry(pluginId, level, args);
      addEntry(entry);
    };
  }

  return {
    /**
     * Log a message
     */
    'console.log': logHandler('log'),

    /**
     * Log an info message
     */
    'console.info': logHandler('info'),

    /**
     * Log a warning message
     */
    'console.warn': logHandler('warn'),

    /**
     * Log an error message
     */
    'console.error': logHandler('error'),

    /**
     * Log a debug message
     */
    'console.debug': logHandler('debug'),

    /**
     * Log with stack trace
     */
    'console.trace': logHandler('trace'),

    /**
     * Clear the console for this plugin
     */
    'console.clear': async (pluginId: string): Promise<void> => {
      const state = getPluginState(pluginId);
      state.entries = [];
    },

    /**
     * Get log entries for this plugin
     */
    'console.getEntries': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<ConsoleLogEntry[]> => {
      const options = (args[0] ?? {}) as {
        level?: ConsoleLogLevel;
        limit?: number;
        since?: number;
      };

      const state = getPluginState(pluginId);
      let entries = state.entries;

      // Filter by level
      if (options.level) {
        entries = entries.filter((e) => e.level === options.level);
      }

      // Filter by timestamp
      const since = options.since;
      if (typeof since === 'number') {
        entries = entries.filter((e) => e.timestamp >= since);
      }

      // Limit results
      if (typeof options.limit === 'number' && options.limit > 0) {
        entries = entries.slice(-options.limit);
      }

      return entries;
    },

    /**
     * Get entry count for this plugin
     */
    'console.getEntryCount': async (pluginId: string): Promise<number> => {
      const state = getPluginState(pluginId);
      return state.entries.length;
    },

    /**
     * Assert a condition (logs error if false)
     */
    'console.assert': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const condition = args[0];
      const messageArgs = args.slice(1);

      if (!condition) {
        const entry = createLogEntry(pluginId, 'error', [
          'Assertion failed:',
          ...messageArgs,
        ]);
        addEntry(entry);
      }
    },

    /**
     * Start a timer
     */
    'console.time': (() => {
      const timers = new Map<string, Map<string, number>>();

      return async (
        pluginId: string,
        args: readonly SerializableValue[]
      ): Promise<void> => {
        const label = String(args[0] ?? 'default');

        let pluginTimers = timers.get(pluginId);
        if (!pluginTimers) {
          pluginTimers = new Map();
          timers.set(pluginId, pluginTimers);
        }

        if (pluginTimers.size >= 100) {
          throw new Error('Maximum timers exceeded (100)');
        }

        pluginTimers.set(label, performance.now());
      };
    })(),

    /**
     * End a timer and log the duration
     */
    'console.timeEnd': (() => {
      const timers = new Map<string, Map<string, number>>();

      return async (
        pluginId: string,
        args: readonly SerializableValue[]
      ): Promise<void> => {
        const label = String(args[0] ?? 'default');

        const pluginTimers = timers.get(pluginId);
        const startTime = pluginTimers?.get(label);

        if (startTime === undefined) {
          const entry = createLogEntry(pluginId, 'warn', [
            `Timer '${label}' does not exist`,
          ]);
          addEntry(entry);
          return;
        }

        const duration = performance.now() - startTime;
        pluginTimers!.delete(label);

        const entry = createLogEntry(pluginId, 'log', [
          `${label}: ${duration.toFixed(2)}ms`,
        ]);
        addEntry(entry);
      };
    })(),

    /**
     * Count occurrences
     */
    'console.count': (() => {
      const counters = new Map<string, Map<string, number>>();

      return async (
        pluginId: string,
        args: readonly SerializableValue[]
      ): Promise<void> => {
        const label = String(args[0] ?? 'default');

        let pluginCounters = counters.get(pluginId);
        if (!pluginCounters) {
          pluginCounters = new Map();
          counters.set(pluginId, pluginCounters);
        }

        const count = (pluginCounters.get(label) ?? 0) + 1;
        pluginCounters.set(label, count);

        const entry = createLogEntry(pluginId, 'log', [`${label}: ${count}`]);
        addEntry(entry);
      };
    })(),

    /**
     * Reset a counter
     */
    'console.countReset': (() => {
      const counters = new Map<string, Map<string, number>>();

      return async (
        pluginId: string,
        args: readonly SerializableValue[]
      ): Promise<void> => {
        const label = String(args[0] ?? 'default');

        const pluginCounters = counters.get(pluginId);
        if (pluginCounters) {
          pluginCounters.delete(label);
        }
      };
    })(),

    /**
     * Log data as a table
     */
    'console.table': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const data = args[0];
      const columns = args[1] as string[] | undefined;

      // Format as table-like output
      let message = 'Table:\n';

      if (Array.isArray(data)) {
        for (let i = 0; i < Math.min(data.length, 100); i++) {
          const row = data[i];
          if (row !== undefined && typeof row === 'object' && row !== null) {
            const obj = row as Record<string, SerializableValue>;
            const keys = columns ?? Object.keys(obj);
            message += `  ${i}: ${keys.map((k) => `${k}=${formatValue(obj[k] ?? null)}`).join(', ')}\n`;
          } else if (row !== undefined) {
            message += `  ${i}: ${formatValue(row)}\n`;
          }
        }
      } else if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, SerializableValue>;
        const keys = columns ?? Object.keys(obj);
        for (const key of keys) {
          message += `  ${key}: ${formatValue(obj[key] ?? null)}\n`;
        }
      }

      const entry = createLogEntry(pluginId, 'log', [message]);
      addEntry(entry);
    },

    /**
     * Create a labeled group
     */
    'console.group': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const firstArg = args[0];
      const label = firstArg !== undefined ? formatValue(firstArg) : '';
      const entry = createLogEntry(pluginId, 'log', [`▼ ${label}`]);
      addEntry(entry);
    },

    /**
     * Create a collapsed group
     */
    'console.groupCollapsed': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const firstArg = args[0];
      const label = firstArg !== undefined ? formatValue(firstArg) : '';
      const entry = createLogEntry(pluginId, 'log', [`▶ ${label}`]);
      addEntry(entry);
    },

    /**
     * End the current group
     */
    'console.groupEnd': async (pluginId: string): Promise<void> => {
      // Groups are visual only, nothing to track
      const entry = createLogEntry(pluginId, 'log', ['└──']);
      addEntry(entry);
    },

    /**
     * Clean up console state for a plugin
     */
    _cleanup: (pluginId: string): void => {
      pluginStates.delete(pluginId);
    },

    /**
     * Get all entries (admin only)
     */
    _getAllEntries: (): Map<string, ConsoleLogEntry[]> => {
      const result = new Map<string, ConsoleLogEntry[]>();
      for (const [pluginId, state] of pluginStates) {
        result.set(pluginId, [...state.entries]);
      }
      return result;
    },
  };
}

export type ConsoleAPIHandlers = ReturnType<typeof createConsoleAPI>;
