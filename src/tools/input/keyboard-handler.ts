/**
 * Keyboard Handler - Keyboard input handling with shortcuts
 */

import type { KeyEventData } from '../base/tool';
import { EventEmitter } from '@core/events/event-emitter';

/**
 * Keyboard handler events
 */
export type KeyboardHandlerEvents = {
  'keydown': KeyEventData;
  'keyup': KeyEventData;
  'shortcut': { action: string; event: KeyEventData };
  [key: string]: unknown;
};

/**
 * Shortcut definition
 */
export interface ShortcutDefinition {
  /** Action name */
  action: string;
  /** Key code or key value */
  key: string;
  /** Require Ctrl/Cmd */
  ctrl?: boolean;
  /** Require Shift */
  shift?: boolean;
  /** Require Alt */
  alt?: boolean;
  /** Require Meta (Cmd on Mac) */
  meta?: boolean;
  /** Allow when focused on input elements */
  allowInInput?: boolean;
}

/**
 * Keyboard handler options
 */
export interface KeyboardHandlerOptions {
  /** Initial shortcuts */
  shortcuts?: ShortcutDefinition[];
  /** Target element (defaults to window) */
  target?: HTMLElement | Window;
}

/**
 * Keyboard Handler
 */
export class KeyboardHandler extends EventEmitter<KeyboardHandlerEvents> {
  private target: HTMLElement | Window;
  private shortcuts: ShortcutDefinition[] = [];
  private pressedKeys: Set<string> = new Set();

  // Bound handlers for cleanup
  private boundHandlers: {
    keydown: (e: KeyboardEvent) => void;
    keyup: (e: KeyboardEvent) => void;
    blur: () => void;
  };

  constructor(options: KeyboardHandlerOptions = {}) {
    super();
    this.target = options.target ?? window;
    this.shortcuts = options.shortcuts ?? [];

    // Create bound handlers
    this.boundHandlers = {
      keydown: this.handleKeyDown.bind(this),
      keyup: this.handleKeyUp.bind(this),
      blur: this.handleBlur.bind(this),
    };

    this.attach();
  }

  /**
   * Attach event listeners.
   */
  attach(): void {
    this.target.addEventListener('keydown', this.boundHandlers.keydown as EventListener);
    this.target.addEventListener('keyup', this.boundHandlers.keyup as EventListener);
    window.addEventListener('blur', this.boundHandlers.blur);
  }

  /**
   * Detach event listeners.
   */
  detach(): void {
    this.target.removeEventListener('keydown', this.boundHandlers.keydown as EventListener);
    this.target.removeEventListener('keyup', this.boundHandlers.keyup as EventListener);
    window.removeEventListener('blur', this.boundHandlers.blur);
  }

  /**
   * Dispose of the handler.
   */
  dispose(): void {
    this.detach();
    this.pressedKeys.clear();
    this.shortcuts = [];
    this.clear();
  }

  // =========================================================================
  // Shortcut Management
  // =========================================================================

  /**
   * Register a keyboard shortcut.
   */
  registerShortcut(shortcut: ShortcutDefinition): void {
    // Remove existing shortcut with same action
    this.shortcuts = this.shortcuts.filter(s => s.action !== shortcut.action);
    this.shortcuts.push(shortcut);
  }

  /**
   * Register multiple shortcuts.
   */
  registerShortcuts(shortcuts: ShortcutDefinition[]): void {
    for (const shortcut of shortcuts) {
      this.registerShortcut(shortcut);
    }
  }

  /**
   * Unregister a shortcut by action name.
   */
  unregisterShortcut(action: string): void {
    this.shortcuts = this.shortcuts.filter(s => s.action !== action);
  }

  /**
   * Clear all shortcuts.
   */
  clearShortcuts(): void {
    this.shortcuts = [];
  }

  /**
   * Get all registered shortcuts.
   */
  getShortcuts(): readonly ShortcutDefinition[] {
    return this.shortcuts;
  }

  // =========================================================================
  // Default Shortcuts
  // =========================================================================

  /**
   * Register common editing shortcuts.
   */
  registerDefaultShortcuts(): void {
    this.registerShortcuts([
      // Selection
      { action: 'selectAll', key: 'a', ctrl: true },
      { action: 'deselectAll', key: 'Escape', ctrl: false },

      // Edit
      { action: 'undo', key: 'z', ctrl: true },
      { action: 'redo', key: 'z', ctrl: true, shift: true },
      { action: 'redo', key: 'y', ctrl: true },
      { action: 'cut', key: 'x', ctrl: true },
      { action: 'copy', key: 'c', ctrl: true },
      { action: 'paste', key: 'v', ctrl: true },
      { action: 'duplicate', key: 'd', ctrl: true },
      { action: 'delete', key: 'Delete' },
      { action: 'delete', key: 'Backspace' },

      // Tools
      { action: 'tool:select', key: 'v' },
      { action: 'tool:frame', key: 'f' },
      { action: 'tool:rectangle', key: 'r' },
      { action: 'tool:ellipse', key: 'o' },
      { action: 'tool:line', key: 'l' },
      { action: 'tool:pen', key: 'p' },
      { action: 'tool:text', key: 't' },
      { action: 'tool:hand', key: 'h' },
      { action: 'tool:move', key: 'm' },

      // Nudge
      { action: 'nudge:up', key: 'ArrowUp' },
      { action: 'nudge:down', key: 'ArrowDown' },
      { action: 'nudge:left', key: 'ArrowLeft' },
      { action: 'nudge:right', key: 'ArrowRight' },
      { action: 'nudge:up:large', key: 'ArrowUp', shift: true },
      { action: 'nudge:down:large', key: 'ArrowDown', shift: true },
      { action: 'nudge:left:large', key: 'ArrowLeft', shift: true },
      { action: 'nudge:right:large', key: 'ArrowRight', shift: true },

      // View
      { action: 'zoomIn', key: '=', ctrl: true },
      { action: 'zoomIn', key: '+', ctrl: true },
      { action: 'zoomOut', key: '-', ctrl: true },
      { action: 'zoomToFit', key: '1', ctrl: true },
      { action: 'zoomToSelection', key: '2', ctrl: true },
      { action: 'zoom100', key: '0', ctrl: true },

      // Layer ordering
      { action: 'bringToFront', key: ']', ctrl: true, shift: true },
      { action: 'sendToBack', key: '[', ctrl: true, shift: true },
      { action: 'bringForward', key: ']', ctrl: true },
      { action: 'sendBackward', key: '[', ctrl: true },

      // Grouping
      { action: 'group', key: 'g', ctrl: true },
      { action: 'ungroup', key: 'g', ctrl: true, shift: true },

      // Alignment
      { action: 'alignLeft', key: 'ArrowLeft', ctrl: true, alt: true },
      { action: 'alignRight', key: 'ArrowRight', ctrl: true, alt: true },
      { action: 'alignTop', key: 'ArrowUp', ctrl: true, alt: true },
      { action: 'alignBottom', key: 'ArrowDown', ctrl: true, alt: true },
    ]);
  }

  // =========================================================================
  // Event Handlers
  // =========================================================================

  private handleKeyDown(e: KeyboardEvent): void {
    // Check if focused on input element
    const isInputFocused = this.isInputFocused();

    const data = this.createKeyEventData(e);

    // Track pressed keys
    this.pressedKeys.add(e.code);

    // Check shortcuts
    const matchedShortcut = this.findMatchingShortcut(data, isInputFocused);
    if (matchedShortcut) {
      e.preventDefault();
      e.stopPropagation();
      this.emit('shortcut', { action: matchedShortcut.action, event: data });
      return;
    }

    // Emit raw keydown
    this.emit('keydown', data);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.pressedKeys.delete(e.code);

    const data = this.createKeyEventData(e);
    this.emit('keyup', data);
  }

  private handleBlur(): void {
    // Clear pressed keys when window loses focus
    this.pressedKeys.clear();
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  private createKeyEventData(e: KeyboardEvent): KeyEventData {
    return {
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      repeat: e.repeat,
    };
  }

  private findMatchingShortcut(
    event: KeyEventData,
    isInputFocused: boolean
  ): ShortcutDefinition | null {
    for (const shortcut of this.shortcuts) {
      // Skip if in input and shortcut doesn't allow it
      if (isInputFocused && !shortcut.allowInInput) {
        continue;
      }

      // Match key
      const keyMatch =
        event.key.toLowerCase() === shortcut.key.toLowerCase() ||
        event.code.toLowerCase() === shortcut.key.toLowerCase();

      if (!keyMatch) continue;

      // Match modifiers
      const ctrlMatch = (shortcut.ctrl ?? false) === (event.ctrlKey || event.metaKey);
      const shiftMatch = (shortcut.shift ?? false) === event.shiftKey;
      const altMatch = (shortcut.alt ?? false) === event.altKey;

      if (ctrlMatch && shiftMatch && altMatch) {
        return shortcut;
      }
    }

    return null;
  }

  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return true;
    }

    if ((activeElement as HTMLElement).isContentEditable) {
      return true;
    }

    return false;
  }

  /**
   * Check if a key is currently pressed.
   */
  isKeyPressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }

  /**
   * Get all currently pressed keys.
   */
  getPressedKeys(): readonly string[] {
    return Array.from(this.pressedKeys);
  }

  /**
   * Check if any modifier key is pressed.
   */
  isModifierPressed(): boolean {
    return (
      this.pressedKeys.has('ShiftLeft') ||
      this.pressedKeys.has('ShiftRight') ||
      this.pressedKeys.has('ControlLeft') ||
      this.pressedKeys.has('ControlRight') ||
      this.pressedKeys.has('AltLeft') ||
      this.pressedKeys.has('AltRight') ||
      this.pressedKeys.has('MetaLeft') ||
      this.pressedKeys.has('MetaRight')
    );
  }

  /**
   * Format a shortcut for display.
   */
  static formatShortcut(shortcut: ShortcutDefinition): string {
    const parts: string[] = [];
    const isMac = navigator.platform.includes('Mac');

    if (shortcut.ctrl) {
      parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.alt) {
      parts.push(isMac ? '⌥' : 'Alt');
    }
    if (shortcut.shift) {
      parts.push(isMac ? '⇧' : 'Shift');
    }

    // Format key
    let keyDisplay = shortcut.key;
    switch (shortcut.key) {
      case 'ArrowUp': keyDisplay = '↑'; break;
      case 'ArrowDown': keyDisplay = '↓'; break;
      case 'ArrowLeft': keyDisplay = '←'; break;
      case 'ArrowRight': keyDisplay = '→'; break;
      case 'Delete': keyDisplay = isMac ? '⌫' : 'Del'; break;
      case 'Backspace': keyDisplay = isMac ? '⌫' : 'Backspace'; break;
      case 'Escape': keyDisplay = 'Esc'; break;
      case ' ': keyDisplay = 'Space'; break;
      default:
        if (keyDisplay.length === 1) {
          keyDisplay = keyDisplay.toUpperCase();
        }
    }

    parts.push(keyDisplay);

    return parts.join(isMac ? '' : '+');
  }
}

/**
 * Create a keyboard handler.
 */
export function createKeyboardHandler(options?: KeyboardHandlerOptions): KeyboardHandler {
  return new KeyboardHandler(options);
}
