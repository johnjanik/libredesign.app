/**
 * Text Input Handler
 *
 * Processes keyboard input for text editing.
 * Handles special keys, shortcuts, and clipboard operations.
 */
import type { KeyEventData } from '../base/tool';
import type { TextCursor } from './text-cursor';
/**
 * Text change event
 */
export interface TextChange {
    readonly type: 'insert' | 'delete' | 'replace';
    readonly position: number;
    readonly deletedText: string;
    readonly insertedText: string;
}
/**
 * Input handler configuration
 */
export interface TextInputHandlerConfig {
    /** Maximum text length (0 = unlimited) */
    readonly maxLength?: number;
    /** Allow multiline text */
    readonly multiline?: boolean;
}
/**
 * Text input handler for processing keyboard events
 */
export declare class TextInputHandler {
    private config;
    private cursor;
    private text;
    private onTextChange;
    private onExit;
    constructor(cursor: TextCursor, initialText: string, config?: TextInputHandlerConfig);
    /**
     * Set text change callback.
     */
    setOnTextChange(callback: (change: TextChange, newText: string) => void): void;
    /**
     * Set exit callback.
     */
    setOnExit(callback: () => void): void;
    /**
     * Get current text.
     */
    getText(): string;
    /**
     * Set text (for external updates).
     */
    setText(text: string): void;
    /**
     * Handle key down event.
     * Returns true if the event was handled.
     */
    handleKeyDown(event: KeyEventData): boolean;
    /**
     * Handle navigation keys.
     */
    private handleNavigationKey;
    /**
     * Handle keyboard shortcuts.
     */
    private handleShortcut;
    /**
     * Handle deletion keys.
     */
    private handleDeletionKey;
    /**
     * Insert text at cursor position.
     */
    insertText(insertedText: string): void;
    /**
     * Delete backward (backspace).
     */
    deleteBackward(): void;
    /**
     * Delete forward (delete key).
     */
    deleteForward(): void;
    /**
     * Delete a range of text.
     */
    deleteRange(start: number, end: number): void;
    /**
     * Copy selection to clipboard.
     */
    copySelection(): void;
    /**
     * Cut selection to clipboard.
     */
    cutSelection(): void;
    /**
     * Paste from clipboard.
     */
    pasteFromClipboard(): void;
    /**
     * Find line start from position.
     */
    private findLineStart;
    /**
     * Find line end from position.
     */
    private findLineEnd;
    /**
     * Dispose of resources.
     */
    dispose(): void;
}
/**
 * Create a text input handler.
 */
export declare function createTextInputHandler(cursor: TextCursor, initialText: string, config?: TextInputHandlerConfig): TextInputHandler;
//# sourceMappingURL=text-input-handler.d.ts.map