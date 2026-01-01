/**
 * Keyboard Handler - Keyboard input handling with shortcuts
 */
import { EventEmitter } from '@core/events/event-emitter';
/**
 * Keyboard Handler
 */
export class KeyboardHandler extends EventEmitter {
    target;
    shortcuts = [];
    pressedKeys = new Set();
    // Bound handlers for cleanup
    boundHandlers;
    constructor(options = {}) {
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
    attach() {
        this.target.addEventListener('keydown', this.boundHandlers.keydown);
        this.target.addEventListener('keyup', this.boundHandlers.keyup);
        window.addEventListener('blur', this.boundHandlers.blur);
    }
    /**
     * Detach event listeners.
     */
    detach() {
        this.target.removeEventListener('keydown', this.boundHandlers.keydown);
        this.target.removeEventListener('keyup', this.boundHandlers.keyup);
        window.removeEventListener('blur', this.boundHandlers.blur);
    }
    /**
     * Dispose of the handler.
     */
    dispose() {
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
    registerShortcut(shortcut) {
        // Remove existing shortcut with same action
        this.shortcuts = this.shortcuts.filter(s => s.action !== shortcut.action);
        this.shortcuts.push(shortcut);
    }
    /**
     * Register multiple shortcuts.
     */
    registerShortcuts(shortcuts) {
        for (const shortcut of shortcuts) {
            this.registerShortcut(shortcut);
        }
    }
    /**
     * Unregister a shortcut by action name.
     */
    unregisterShortcut(action) {
        this.shortcuts = this.shortcuts.filter(s => s.action !== action);
    }
    /**
     * Clear all shortcuts.
     */
    clearShortcuts() {
        this.shortcuts = [];
    }
    /**
     * Get all registered shortcuts.
     */
    getShortcuts() {
        return this.shortcuts;
    }
    // =========================================================================
    // Default Shortcuts
    // =========================================================================
    /**
     * Register common editing shortcuts.
     */
    registerDefaultShortcuts() {
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
            { action: 'tool:move', key: 'm' },
            { action: 'tool:rectangle', key: 'r' },
            { action: 'tool:ellipse', key: 'o' },
            { action: 'tool:line', key: 'l' },
            { action: 'tool:pen', key: 'p' },
            { action: 'tool:text', key: 't' },
            { action: 'tool:hand', key: 'h' },
            { action: 'tool:zoom', key: 'z' },
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
    handleKeyDown(e) {
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
    handleKeyUp(e) {
        this.pressedKeys.delete(e.code);
        const data = this.createKeyEventData(e);
        this.emit('keyup', data);
    }
    handleBlur() {
        // Clear pressed keys when window loses focus
        this.pressedKeys.clear();
    }
    // =========================================================================
    // Utilities
    // =========================================================================
    createKeyEventData(e) {
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
    findMatchingShortcut(event, isInputFocused) {
        for (const shortcut of this.shortcuts) {
            // Skip if in input and shortcut doesn't allow it
            if (isInputFocused && !shortcut.allowInInput) {
                continue;
            }
            // Match key
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                event.code.toLowerCase() === shortcut.key.toLowerCase();
            if (!keyMatch)
                continue;
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
    isInputFocused() {
        const activeElement = document.activeElement;
        if (!activeElement)
            return false;
        const tagName = activeElement.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
            return true;
        }
        if (activeElement.isContentEditable) {
            return true;
        }
        return false;
    }
    /**
     * Check if a key is currently pressed.
     */
    isKeyPressed(code) {
        return this.pressedKeys.has(code);
    }
    /**
     * Get all currently pressed keys.
     */
    getPressedKeys() {
        return Array.from(this.pressedKeys);
    }
    /**
     * Check if any modifier key is pressed.
     */
    isModifierPressed() {
        return (this.pressedKeys.has('ShiftLeft') ||
            this.pressedKeys.has('ShiftRight') ||
            this.pressedKeys.has('ControlLeft') ||
            this.pressedKeys.has('ControlRight') ||
            this.pressedKeys.has('AltLeft') ||
            this.pressedKeys.has('AltRight') ||
            this.pressedKeys.has('MetaLeft') ||
            this.pressedKeys.has('MetaRight'));
    }
    /**
     * Format a shortcut for display.
     */
    static formatShortcut(shortcut) {
        const parts = [];
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
            case 'ArrowUp':
                keyDisplay = '↑';
                break;
            case 'ArrowDown':
                keyDisplay = '↓';
                break;
            case 'ArrowLeft':
                keyDisplay = '←';
                break;
            case 'ArrowRight':
                keyDisplay = '→';
                break;
            case 'Delete':
                keyDisplay = isMac ? '⌫' : 'Del';
                break;
            case 'Backspace':
                keyDisplay = isMac ? '⌫' : 'Backspace';
                break;
            case 'Escape':
                keyDisplay = 'Esc';
                break;
            case ' ':
                keyDisplay = 'Space';
                break;
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
export function createKeyboardHandler(options) {
    return new KeyboardHandler(options);
}
//# sourceMappingURL=keyboard-handler.js.map