/**
 * Text Cursor
 *
 * Manages cursor position and text selection within a text node.
 */
/**
 * Text selection range
 */
export interface TextSelection {
    /** Start position (character index) */
    readonly start: number;
    /** End position (character index) */
    readonly end: number;
    /** Selection direction: forward means start < end anchor */
    readonly direction: 'forward' | 'backward' | 'none';
}
/**
 * Cursor blink state
 */
export interface CursorBlinkState {
    readonly visible: boolean;
    readonly timestamp: number;
}
/**
 * Text cursor configuration
 */
export interface TextCursorConfig {
    /** Blink interval in milliseconds */
    readonly blinkInterval?: number;
    /** Cursor width in pixels */
    readonly cursorWidth?: number;
}
/**
 * Text cursor manager
 */
export declare class TextCursor {
    private config;
    private _position;
    private _anchor;
    private blinkVisible;
    private blinkTimer;
    private onBlinkChange;
    constructor(config?: TextCursorConfig);
    /**
     * Get current cursor position.
     */
    get position(): number;
    /**
     * Set cursor position (clears selection).
     */
    setPosition(position: number, textLength: number): void;
    /**
     * Move cursor by offset.
     */
    move(offset: number, textLength: number, extendSelection?: boolean): void;
    /**
     * Move to start of text.
     */
    moveToStart(extendSelection?: boolean): void;
    /**
     * Move to end of text.
     */
    moveToEnd(textLength: number, extendSelection?: boolean): void;
    /**
     * Move to start of line.
     */
    moveToLineStart(text: string, extendSelection?: boolean): void;
    /**
     * Move to end of line.
     */
    moveToLineEnd(text: string, extendSelection?: boolean): void;
    /**
     * Move to next word boundary.
     */
    moveToNextWord(text: string, extendSelection?: boolean): void;
    /**
     * Move to previous word boundary.
     */
    moveToPreviousWord(text: string, extendSelection?: boolean): void;
    /**
     * Check if character is part of a word.
     */
    private isWordChar;
    /**
     * Get current selection.
     */
    getSelection(): TextSelection | null;
    /**
     * Check if there's an active selection.
     */
    hasSelection(): boolean;
    /**
     * Set selection range.
     */
    setSelection(start: number, end: number, textLength: number): void;
    /**
     * Select all text.
     */
    selectAll(textLength: number): void;
    /**
     * Select word at position.
     */
    selectWordAt(text: string, position: number): void;
    /**
     * Clear selection (keep cursor at end of selection).
     */
    clearSelection(): void;
    /**
     * Collapse selection to start or end.
     */
    collapseSelection(toStart: boolean): void;
    /**
     * Get deletion range for backspace.
     */
    getBackspaceRange(): {
        start: number;
        end: number;
    } | null;
    /**
     * Get deletion range for delete key.
     */
    getDeleteRange(textLength: number): {
        start: number;
        end: number;
    } | null;
    /**
     * Get insertion position.
     */
    getInsertPosition(): number;
    /**
     * Update cursor after text change.
     */
    afterTextChange(insertPosition: number, _deletedCount: number, insertedCount: number): void;
    /**
     * Start cursor blinking.
     */
    startBlinking(onChange: (visible: boolean) => void): void;
    /**
     * Stop cursor blinking.
     */
    stopBlinking(): void;
    /**
     * Reset blink (show cursor).
     */
    private resetBlink;
    /**
     * Check if cursor is visible (for rendering).
     */
    isVisible(): boolean;
    /**
     * Get cursor width.
     */
    getCursorWidth(): number;
    /**
     * Clamp value to range.
     */
    private clamp;
    /**
     * Dispose of resources.
     */
    dispose(): void;
}
/**
 * Create a text cursor.
 */
export declare function createTextCursor(config?: TextCursorConfig): TextCursor;
//# sourceMappingURL=text-cursor.d.ts.map