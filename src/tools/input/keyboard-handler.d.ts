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
    'shortcut': {
        action: string;
        event: KeyEventData;
    };
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
export declare class KeyboardHandler extends EventEmitter<KeyboardHandlerEvents> {
    private target;
    private shortcuts;
    private pressedKeys;
    private boundHandlers;
    constructor(options?: KeyboardHandlerOptions);
    /**
     * Attach event listeners.
     */
    attach(): void;
    /**
     * Detach event listeners.
     */
    detach(): void;
    /**
     * Dispose of the handler.
     */
    dispose(): void;
    /**
     * Register a keyboard shortcut.
     */
    registerShortcut(shortcut: ShortcutDefinition): void;
    /**
     * Register multiple shortcuts.
     */
    registerShortcuts(shortcuts: ShortcutDefinition[]): void;
    /**
     * Unregister a shortcut by action name.
     */
    unregisterShortcut(action: string): void;
    /**
     * Clear all shortcuts.
     */
    clearShortcuts(): void;
    /**
     * Get all registered shortcuts.
     */
    getShortcuts(): readonly ShortcutDefinition[];
    /**
     * Register common editing shortcuts.
     */
    registerDefaultShortcuts(): void;
    private handleKeyDown;
    private handleKeyUp;
    private handleBlur;
    private createKeyEventData;
    private findMatchingShortcut;
    private isInputFocused;
    /**
     * Check if a key is currently pressed.
     */
    isKeyPressed(code: string): boolean;
    /**
     * Get all currently pressed keys.
     */
    getPressedKeys(): readonly string[];
    /**
     * Check if any modifier key is pressed.
     */
    isModifierPressed(): boolean;
    /**
     * Format a shortcut for display.
     */
    static formatShortcut(shortcut: ShortcutDefinition): string;
}
/**
 * Create a keyboard handler.
 */
export declare function createKeyboardHandler(options?: KeyboardHandlerOptions): KeyboardHandler;
//# sourceMappingURL=keyboard-handler.d.ts.map