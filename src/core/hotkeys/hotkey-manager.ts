/**
 * Hotkey Manager
 *
 * Manages keyboard shortcuts with customization and persistence.
 */

import { EventEmitter } from '@core/events/event-emitter';

/**
 * Hotkey action definition
 */
export interface HotkeyAction {
  id: string;
  name: string;
  category: 'common' | 'tools' | 'view' | 'ai';
  defaultShortcut: string;
}

/**
 * Hotkey manager events
 */
export type HotkeyManagerEvents = {
  'hotkey:changed': { actionId: string; shortcut: string };
  'hotkey:reset': { actionId: string };
  [key: string]: unknown;
};

const STORAGE_KEY = 'designlibre-hotkeys';

/**
 * Default hotkey definitions
 */
const DEFAULT_HOTKEYS: HotkeyAction[] = [
  // Common Actions
  { id: 'select-all', name: 'Select All', category: 'common', defaultShortcut: 'Ctrl+A' },
  { id: 'copy', name: 'Copy', category: 'common', defaultShortcut: 'Ctrl+C' },
  { id: 'paste', name: 'Paste', category: 'common', defaultShortcut: 'Ctrl+V' },
  { id: 'cut', name: 'Cut', category: 'common', defaultShortcut: 'Ctrl+X' },
  { id: 'undo', name: 'Undo', category: 'common', defaultShortcut: 'Ctrl+Z' },
  { id: 'redo', name: 'Redo', category: 'common', defaultShortcut: 'Ctrl+Shift+Z' },
  { id: 'delete', name: 'Delete', category: 'common', defaultShortcut: 'Delete' },
  { id: 'duplicate', name: 'Duplicate', category: 'common', defaultShortcut: 'Ctrl+D' },
  { id: 'group', name: 'Group', category: 'common', defaultShortcut: 'Ctrl+G' },
  { id: 'ungroup', name: 'Ungroup', category: 'common', defaultShortcut: 'Ctrl+Shift+G' },
  { id: 'save', name: 'Save', category: 'common', defaultShortcut: 'Ctrl+S' },

  // Tools
  { id: 'tool-select', name: 'Select Tool', category: 'tools', defaultShortcut: 'V' },
  { id: 'tool-rectangle', name: 'Rectangle Tool', category: 'tools', defaultShortcut: 'R' },
  { id: 'tool-ellipse', name: 'Ellipse Tool', category: 'tools', defaultShortcut: 'O' },
  { id: 'tool-line', name: 'Line Tool', category: 'tools', defaultShortcut: 'L' },
  { id: 'tool-text', name: 'Text Tool', category: 'tools', defaultShortcut: 'T' },
  { id: 'tool-hand', name: 'Hand Tool', category: 'tools', defaultShortcut: 'H' },
  { id: 'tool-zoom', name: 'Zoom Tool', category: 'tools', defaultShortcut: 'Z' },
  { id: 'tool-pen', name: 'Pen Tool', category: 'tools', defaultShortcut: 'P' },
  { id: 'tool-frame', name: 'Frame Tool', category: 'tools', defaultShortcut: 'F' },

  // View
  { id: 'view-zoom-in', name: 'Zoom In', category: 'view', defaultShortcut: 'Ctrl++' },
  { id: 'view-zoom-out', name: 'Zoom Out', category: 'view', defaultShortcut: 'Ctrl+-' },
  { id: 'view-fit', name: 'Zoom to Fit', category: 'view', defaultShortcut: 'Ctrl+1' },
  { id: 'view-100', name: 'Zoom to 100%', category: 'view', defaultShortcut: 'Ctrl+0' },
  { id: 'view-design', name: 'Design View', category: 'view', defaultShortcut: 'Alt+1' },
  { id: 'view-code', name: 'Code View', category: 'view', defaultShortcut: 'Alt+2' },
  { id: 'view-split', name: 'Split View', category: 'view', defaultShortcut: 'Alt+3' },

  // AI
  { id: 'ai-toggle', name: 'Toggle AI Panel', category: 'ai', defaultShortcut: 'Ctrl+Shift+L' },
  { id: 'ai-new-chat', name: 'New AI Chat', category: 'ai', defaultShortcut: 'Ctrl+Shift+N' },
  { id: 'ai-command', name: 'AI Command Palette', category: 'ai', defaultShortcut: 'Ctrl+K' },
];

/**
 * Hotkey Manager
 */
export class HotkeyManager extends EventEmitter<HotkeyManagerEvents> {
  private actions: Map<string, HotkeyAction> = new Map();
  private customShortcuts: Map<string, string> = new Map();
  private keyHandlers: Map<string, () => void> = new Map();

  constructor() {
    super();
    this.initializeDefaults();
    this.loadCustomShortcuts();
  }

  private initializeDefaults(): void {
    for (const action of DEFAULT_HOTKEYS) {
      this.actions.set(action.id, action);
    }
  }

  private loadCustomShortcuts(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const shortcuts = JSON.parse(stored) as Record<string, string>;
        for (const [id, shortcut] of Object.entries(shortcuts)) {
          if (this.actions.has(id)) {
            this.customShortcuts.set(id, shortcut);
          }
        }
      }
    } catch {
      // localStorage not available or parse error
    }
  }

  private saveCustomShortcuts(): void {
    try {
      const shortcuts: Record<string, string> = {};
      for (const [id, shortcut] of this.customShortcuts) {
        shortcuts[id] = shortcut;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
    } catch {
      // localStorage not available
    }
  }

  /**
   * Get all hotkey actions
   */
  getAllActions(): HotkeyAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Get actions by category
   */
  getActionsByCategory(category: HotkeyAction['category']): HotkeyAction[] {
    return Array.from(this.actions.values()).filter((a) => a.category === category);
  }

  /**
   * Get the current shortcut for an action (custom or default)
   */
  getShortcut(actionId: string): string {
    if (this.customShortcuts.has(actionId)) {
      return this.customShortcuts.get(actionId)!;
    }
    return this.actions.get(actionId)?.defaultShortcut ?? '';
  }

  /**
   * Get the default shortcut for an action
   */
  getDefaultShortcut(actionId: string): string {
    return this.actions.get(actionId)?.defaultShortcut ?? '';
  }

  /**
   * Check if an action has a custom shortcut
   */
  hasCustomShortcut(actionId: string): boolean {
    return this.customShortcuts.has(actionId);
  }

  /**
   * Set a custom shortcut for an action
   */
  setShortcut(actionId: string, shortcut: string): void {
    if (!this.actions.has(actionId)) return;

    // Check if this shortcut is already used by another action
    const conflict = this.findConflict(shortcut, actionId);
    if (conflict) {
      // Clear the conflict
      this.customShortcuts.delete(conflict);
    }

    const action = this.actions.get(actionId)!;
    if (shortcut === action.defaultShortcut) {
      // If setting to default, remove custom
      this.customShortcuts.delete(actionId);
    } else {
      this.customShortcuts.set(actionId, shortcut);
    }

    this.saveCustomShortcuts();
    this.emit('hotkey:changed', { actionId, shortcut });
  }

  /**
   * Reset an action to its default shortcut
   */
  resetShortcut(actionId: string): void {
    if (this.customShortcuts.has(actionId)) {
      this.customShortcuts.delete(actionId);
      this.saveCustomShortcuts();
      this.emit('hotkey:reset', { actionId });
    }
  }

  /**
   * Reset all shortcuts to defaults
   */
  resetAllShortcuts(): void {
    this.customShortcuts.clear();
    this.saveCustomShortcuts();
    for (const action of this.actions.values()) {
      this.emit('hotkey:reset', { actionId: action.id });
    }
  }

  /**
   * Find action that conflicts with a shortcut
   */
  findConflict(shortcut: string, excludeActionId?: string): string | null {
    const normalized = this.normalizeShortcut(shortcut);
    for (const [actionId] of this.actions) {
      if (actionId === excludeActionId) continue;
      const currentShortcut = this.getShortcut(actionId);
      if (this.normalizeShortcut(currentShortcut) === normalized) {
        return actionId;
      }
    }
    return null;
  }

  /**
   * Normalize a shortcut string for comparison
   */
  private normalizeShortcut(shortcut: string): string {
    const parts = shortcut.toLowerCase().split('+');
    const modifiers: string[] = [];
    let key = '';

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed === 'ctrl' || trimmed === 'cmd' || trimmed === 'meta') {
        modifiers.push('ctrl');
      } else if (trimmed === 'alt' || trimmed === 'option') {
        modifiers.push('alt');
      } else if (trimmed === 'shift') {
        modifiers.push('shift');
      } else {
        key = trimmed;
      }
    }

    modifiers.sort();
    return [...modifiers, key].join('+');
  }

  /**
   * Convert a keyboard event to shortcut string
   */
  eventToShortcut(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey || event.metaKey) {
      parts.push('Ctrl');
    }
    if (event.altKey) {
      parts.push('Alt');
    }
    if (event.shiftKey) {
      parts.push('Shift');
    }

    // Get the key
    let key = event.key;

    // Normalize special keys
    if (key === ' ') key = 'Space';
    if (key === 'ArrowUp') key = '↑';
    if (key === 'ArrowDown') key = '↓';
    if (key === 'ArrowLeft') key = '←';
    if (key === 'ArrowRight') key = '→';
    if (key === 'Escape') key = 'Esc';

    // Don't include modifier keys as the main key
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      // Capitalize single character keys
      if (key.length === 1) {
        key = key.toUpperCase();
      }
      parts.push(key);
    }

    return parts.join('+');
  }

  /**
   * Check if a keyboard event matches a shortcut
   */
  matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
    return this.normalizeShortcut(this.eventToShortcut(event)) === this.normalizeShortcut(shortcut);
  }

  /**
   * Register a handler for an action
   */
  registerHandler(actionId: string, handler: () => void): void {
    this.keyHandlers.set(actionId, handler);
  }

  /**
   * Unregister a handler for an action
   */
  unregisterHandler(actionId: string): void {
    this.keyHandlers.delete(actionId);
  }

  /**
   * Handle a keyboard event, returns true if handled
   */
  handleKeyEvent(event: KeyboardEvent): boolean {
    for (const [actionId] of this.actions) {
      const shortcut = this.getShortcut(actionId);
      if (this.matchesShortcut(event, shortcut)) {
        const handler = this.keyHandlers.get(actionId);
        if (handler) {
          event.preventDefault();
          event.stopPropagation();
          handler();
          return true;
        }
      }
    }
    return false;
  }
}

// Singleton instance
let hotkeyManagerInstance: HotkeyManager | null = null;

/**
 * Get the hotkey manager instance
 */
export function getHotkeyManager(): HotkeyManager {
  if (!hotkeyManagerInstance) {
    hotkeyManagerInstance = new HotkeyManager();
  }
  return hotkeyManagerInstance;
}
