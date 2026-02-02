/**
 * Command Registry
 *
 * Central registry for all commands that can be executed via:
 * - Command palette
 * - Keyboard shortcuts
 * - Menu items
 * - CLI-style input
 *
 * Supports:
 * - Command registration with metadata
 * - Aliases
 * - Parameter parsing
 * - Command history
 * - Undo/redo integration
 */

import type { NodeId } from '@core/types/common';

/**
 * Command parameter definition
 */
export interface CommandParameter {
  /** Parameter name */
  readonly name: string;
  /** Parameter type */
  readonly type: 'string' | 'number' | 'boolean' | 'point' | 'nodeId' | 'nodeIds';
  /** Description */
  readonly description?: string;
  /** Whether required */
  readonly required?: boolean;
  /** Default value */
  readonly defaultValue?: unknown;
  /** Validation function */
  readonly validate?: (value: unknown) => boolean;
}

/**
 * Command execution context
 */
export interface CommandContext {
  /** Currently selected node IDs */
  readonly selectedNodeIds: readonly NodeId[];
  /** Current canvas position (world coordinates) */
  readonly canvasPosition?: { x: number; y: number };
  /** Additional context data */
  readonly data?: Record<string, unknown>;
}

/**
 * Command execution result
 */
export interface CommandResult {
  /** Whether command succeeded */
  readonly success: boolean;
  /** Result message */
  readonly message?: string;
  /** Error if failed */
  readonly error?: string;
  /** Result data */
  readonly data?: unknown;
  /** Whether this command can be undone */
  readonly canUndo?: boolean;
  /** Undo function */
  readonly undo?: () => void;
}

/**
 * Command definition
 */
export interface Command {
  /** Unique command ID */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Description */
  readonly description: string;
  /** Category for grouping */
  readonly category: string;
  /** Keyboard shortcut */
  readonly shortcut?: string;
  /** Alternative shortcuts */
  readonly shortcuts?: readonly string[];
  /** Command aliases (for CLI) */
  readonly aliases?: readonly string[];
  /** Command parameters */
  readonly parameters?: readonly CommandParameter[];
  /** Whether command requires selection */
  readonly requiresSelection?: boolean;
  /** Whether command is available */
  readonly isEnabled?: (context: CommandContext) => boolean;
  /** Execute the command */
  readonly execute: (args: Record<string, unknown>, context: CommandContext) => CommandResult | Promise<CommandResult>;
}

/**
 * Command search result
 */
export interface CommandSearchResult {
  readonly command: Command;
  readonly score: number;
  readonly matchedOn: 'name' | 'alias' | 'description' | 'category';
}

/**
 * Command history entry
 */
interface CommandHistoryEntry {
  readonly commandId: string;
  readonly args: Record<string, unknown>;
  readonly timestamp: number;
  readonly result: CommandResult;
}

/**
 * Command Registry
 */
export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private aliases: Map<string, string> = new Map();
  private shortcuts: Map<string, string> = new Map();
  private history: CommandHistoryEntry[] = [];
  private maxHistorySize = 100;

  // Callbacks
  private onCommandExecuted?: (entry: CommandHistoryEntry) => void;

  /**
   * Register a command
   */
  register(command: Command): void {
    if (this.commands.has(command.id)) {
      console.warn(`Command ${command.id} already registered, overwriting`);
    }

    this.commands.set(command.id, command);

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias.toLowerCase(), command.id);
      }
    }

    // Register shortcuts
    if (command.shortcut) {
      this.shortcuts.set(this.normalizeShortcut(command.shortcut), command.id);
    }
    if (command.shortcuts) {
      for (const shortcut of command.shortcuts) {
        this.shortcuts.set(this.normalizeShortcut(shortcut), command.id);
      }
    }
  }

  /**
   * Unregister a command
   */
  unregister(commandId: string): void {
    const command = this.commands.get(commandId);
    if (!command) return;

    // Remove aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.delete(alias.toLowerCase());
      }
    }

    // Remove shortcuts
    if (command.shortcut) {
      this.shortcuts.delete(this.normalizeShortcut(command.shortcut));
    }
    if (command.shortcuts) {
      for (const shortcut of command.shortcuts) {
        this.shortcuts.delete(this.normalizeShortcut(shortcut));
      }
    }

    this.commands.delete(commandId);
  }

  /**
   * Get a command by ID
   */
  get(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Get a command by alias
   */
  getByAlias(alias: string): Command | undefined {
    const commandId = this.aliases.get(alias.toLowerCase());
    return commandId ? this.commands.get(commandId) : undefined;
  }

  /**
   * Get a command by shortcut
   */
  getByShortcut(shortcut: string): Command | undefined {
    const commandId = this.shortcuts.get(this.normalizeShortcut(shortcut));
    return commandId ? this.commands.get(commandId) : undefined;
  }

  /**
   * Get all commands
   */
  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  getByCategory(category: string): Command[] {
    return this.getAll().filter(cmd => cmd.category === category);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const command of this.commands.values()) {
      categories.add(command.category);
    }
    return Array.from(categories).sort();
  }

  /**
   * Search commands
   */
  search(query: string, context?: CommandContext): CommandSearchResult[] {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return this.getAll()
        .filter(cmd => !context || !cmd.isEnabled || cmd.isEnabled(context))
        .map(cmd => ({ command: cmd, score: 0, matchedOn: 'name' as const }));
    }

    const results: CommandSearchResult[] = [];

    for (const command of this.commands.values()) {
      // Skip disabled commands
      if (context && command.isEnabled && !command.isEnabled(context)) {
        continue;
      }

      let score = 0;
      let matchedOn: 'name' | 'alias' | 'description' | 'category' = 'name';

      // Exact ID match
      if (command.id.toLowerCase() === normalizedQuery) {
        score = 100;
        matchedOn = 'name';
      }
      // Name starts with query
      else if (command.name.toLowerCase().startsWith(normalizedQuery)) {
        score = 80;
        matchedOn = 'name';
      }
      // Name contains query
      else if (command.name.toLowerCase().includes(normalizedQuery)) {
        score = 60;
        matchedOn = 'name';
      }
      // Alias match
      else if (command.aliases?.some(a => a.toLowerCase().startsWith(normalizedQuery))) {
        score = 70;
        matchedOn = 'alias';
      }
      // Category match
      else if (command.category.toLowerCase().includes(normalizedQuery)) {
        score = 40;
        matchedOn = 'category';
      }
      // Description match
      else if (command.description.toLowerCase().includes(normalizedQuery)) {
        score = 30;
        matchedOn = 'description';
      }
      // Fuzzy match on name
      else {
        const fuzzyScore = this.fuzzyMatch(normalizedQuery, command.name.toLowerCase());
        if (fuzzyScore > 0.5) {
          score = Math.round(fuzzyScore * 50);
          matchedOn = 'name';
        }
      }

      if (score > 0) {
        results.push({ command, score, matchedOn });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Execute a command
   */
  async execute(
    commandId: string,
    args: Record<string, unknown> = {},
    context: CommandContext
  ): Promise<CommandResult> {
    const command = this.commands.get(commandId) || this.getByAlias(commandId);

    if (!command) {
      return {
        success: false,
        error: `Unknown command: ${commandId}`,
      };
    }

    // Check if command is enabled
    if (command.isEnabled && !command.isEnabled(context)) {
      return {
        success: false,
        error: `Command ${command.name} is not available in current context`,
      };
    }

    // Check selection requirement
    if (command.requiresSelection && context.selectedNodeIds.length === 0) {
      return {
        success: false,
        error: `Command ${command.name} requires a selection`,
      };
    }

    // Validate and apply default values for parameters
    const processedArgs = this.processArguments(command, args);
    if ('error' in processedArgs && typeof processedArgs.error === 'string') {
      return {
        success: false,
        error: processedArgs.error,
      };
    }

    try {
      const result = await command.execute(processedArgs, context);

      // Add to history
      const entry: CommandHistoryEntry = {
        commandId: command.id,
        args: processedArgs,
        timestamp: Date.now(),
        result,
      };
      this.addToHistory(entry);

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Command execution failed',
      };
    }
  }

  /**
   * Execute command from CLI-style input
   */
  async executeFromInput(
    input: string,
    context: CommandContext
  ): Promise<CommandResult> {
    const parsed = this.parseInput(input);
    if (!parsed) {
      return {
        success: false,
        error: 'Invalid command input',
      };
    }

    return this.execute(parsed.commandId, parsed.args, context);
  }

  /**
   * Parse CLI-style input
   */
  parseInput(input: string): { commandId: string; args: Record<string, unknown> } | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Split by spaces, respecting quotes
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (const char of trimmed) {
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current) {
      parts.push(current);
    }

    if (parts.length === 0) return null;

    const commandId = parts[0]!;
    const args: Record<string, unknown> = {};

    // Parse arguments
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]!;

      // Named argument: name=value or --name=value
      if (part.includes('=')) {
        const [name, ...valueParts] = part.split('=');
        const cleanName = (name ?? '').replace(/^--?/, '');
        const value = valueParts.join('=');
        args[cleanName] = this.parseValue(value);
      }
      // Flag: --flag or -f
      else if (part.startsWith('-')) {
        const name = part.replace(/^--?/, '');
        args[name] = true;
      }
      // Positional argument
      else {
        const command = this.commands.get(commandId) || this.getByAlias(commandId);
        if (command?.parameters) {
          const paramIndex = Object.keys(args).filter(k => !k.startsWith('_')).length;
          const param = command.parameters[paramIndex];
          if (param) {
            args[param.name] = this.parseValue(part);
          } else {
            args[`_pos${paramIndex}`] = this.parseValue(part);
          }
        } else {
          args[`_pos${i - 1}`] = this.parseValue(part);
        }
      }
    }

    return { commandId, args };
  }

  /**
   * Set command executed callback
   */
  setOnCommandExecuted(callback: (entry: CommandHistoryEntry) => void): void {
    this.onCommandExecuted = callback;
  }

  /**
   * Get command history
   */
  getHistory(): readonly CommandHistoryEntry[] {
    return this.history;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Process and validate arguments
   */
  private processArguments(
    command: Command,
    args: Record<string, unknown>
  ): Record<string, unknown> | { error: string } {
    const processed: Record<string, unknown> = { ...args };

    if (!command.parameters) {
      return processed;
    }

    for (const param of command.parameters) {
      if (!(param.name in processed)) {
        if (param.required && param.defaultValue === undefined) {
          return { error: `Missing required parameter: ${param.name}` };
        }
        if (param.defaultValue !== undefined) {
          processed[param.name] = param.defaultValue;
        }
      } else if (param.validate && !param.validate(processed[param.name])) {
        return { error: `Invalid value for parameter: ${param.name}` };
      }
    }

    return processed;
  }

  /**
   * Parse a value string
   */
  private parseValue(value: string): unknown {
    // Try number
    const num = parseFloat(value);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }

    // Try boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Try JSON
    try {
      return JSON.parse(value);
    } catch {
      // Return as string
      return value;
    }
  }

  /**
   * Normalize shortcut string
   */
  private normalizeShortcut(shortcut: string): string {
    return shortcut
      .toLowerCase()
      .split('+')
      .map(s => s.trim())
      .sort()
      .join('+');
  }

  /**
   * Simple fuzzy match score
   */
  private fuzzyMatch(query: string, target: string): number {
    if (query.length === 0) return 1;
    if (target.length === 0) return 0;

    let queryIndex = 0;
    let matches = 0;

    for (let i = 0; i < target.length && queryIndex < query.length; i++) {
      if (target[i] === query[queryIndex]) {
        matches++;
        queryIndex++;
      }
    }

    return queryIndex === query.length ? matches / target.length : 0;
  }

  /**
   * Add entry to history
   */
  private addToHistory(entry: CommandHistoryEntry): void {
    this.history.push(entry);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
    this.onCommandExecuted?.(entry);
  }
}

/**
 * Create a command registry instance
 */
export function createCommandRegistry(): CommandRegistry {
  return new CommandRegistry();
}

/**
 * Global command registry singleton
 */
let globalRegistry: CommandRegistry | null = null;

export function getGlobalCommandRegistry(): CommandRegistry {
  if (!globalRegistry) {
    globalRegistry = createCommandRegistry();
  }
  return globalRegistry;
}
