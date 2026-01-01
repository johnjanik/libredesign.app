/**
 * Text Cursor
 *
 * Manages cursor position and text selection within a text node.
 */

// Note: Point type not currently used, but may be needed for future coordinate-based cursor positioning

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

const DEFAULT_CONFIG: Required<TextCursorConfig> = {
  blinkInterval: 530,
  cursorWidth: 2,
};

/**
 * Text cursor manager
 */
export class TextCursor {
  private config: Required<TextCursorConfig>;

  // Cursor position (character index)
  private _position = 0;

  // Selection anchor (for shift+click/arrow selection)
  private _anchor: number | null = null;

  // Blink state
  private blinkVisible = true;
  private blinkTimer: ReturnType<typeof setInterval> | null = null;
  private onBlinkChange: ((visible: boolean) => void) | null = null;

  constructor(config: TextCursorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current cursor position.
   */
  get position(): number {
    return this._position;
  }

  /**
   * Set cursor position (clears selection).
   */
  setPosition(position: number, textLength: number): void {
    this._position = this.clamp(position, 0, textLength);
    this._anchor = null;
    this.resetBlink();
  }

  /**
   * Move cursor by offset.
   */
  move(offset: number, textLength: number, extendSelection = false): void {
    const newPosition = this.clamp(this._position + offset, 0, textLength);

    if (extendSelection) {
      // Start selection if not already selecting
      if (this._anchor === null) {
        this._anchor = this._position;
      }
    } else {
      this._anchor = null;
    }

    this._position = newPosition;
    this.resetBlink();
  }

  /**
   * Move to start of text.
   */
  moveToStart(extendSelection = false): void {
    if (extendSelection && this._anchor === null) {
      this._anchor = this._position;
    } else if (!extendSelection) {
      this._anchor = null;
    }

    this._position = 0;
    this.resetBlink();
  }

  /**
   * Move to end of text.
   */
  moveToEnd(textLength: number, extendSelection = false): void {
    if (extendSelection && this._anchor === null) {
      this._anchor = this._position;
    } else if (!extendSelection) {
      this._anchor = null;
    }

    this._position = textLength;
    this.resetBlink();
  }

  /**
   * Move to start of line.
   */
  moveToLineStart(text: string, extendSelection = false): void {
    if (extendSelection && this._anchor === null) {
      this._anchor = this._position;
    } else if (!extendSelection) {
      this._anchor = null;
    }

    // Find previous newline
    let pos = this._position - 1;
    while (pos >= 0 && text[pos] !== '\n') {
      pos--;
    }
    this._position = pos + 1;
    this.resetBlink();
  }

  /**
   * Move to end of line.
   */
  moveToLineEnd(text: string, extendSelection = false): void {
    if (extendSelection && this._anchor === null) {
      this._anchor = this._position;
    } else if (!extendSelection) {
      this._anchor = null;
    }

    // Find next newline
    let pos = this._position;
    while (pos < text.length && text[pos] !== '\n') {
      pos++;
    }
    this._position = pos;
    this.resetBlink();
  }

  /**
   * Move to next word boundary.
   */
  moveToNextWord(text: string, extendSelection = false): void {
    if (extendSelection && this._anchor === null) {
      this._anchor = this._position;
    } else if (!extendSelection) {
      this._anchor = null;
    }

    let pos = this._position;

    // Skip current word
    while (pos < text.length && this.isWordChar(text[pos]!)) {
      pos++;
    }

    // Skip whitespace
    while (pos < text.length && !this.isWordChar(text[pos]!)) {
      pos++;
    }

    this._position = pos;
    this.resetBlink();
  }

  /**
   * Move to previous word boundary.
   */
  moveToPreviousWord(text: string, extendSelection = false): void {
    if (extendSelection && this._anchor === null) {
      this._anchor = this._position;
    } else if (!extendSelection) {
      this._anchor = null;
    }

    let pos = this._position;

    // Skip whitespace before cursor
    while (pos > 0 && !this.isWordChar(text[pos - 1]!)) {
      pos--;
    }

    // Skip word
    while (pos > 0 && this.isWordChar(text[pos - 1]!)) {
      pos--;
    }

    this._position = pos;
    this.resetBlink();
  }

  /**
   * Check if character is part of a word.
   */
  private isWordChar(char: string): boolean {
    return /\w/.test(char);
  }

  /**
   * Get current selection.
   */
  getSelection(): TextSelection | null {
    if (this._anchor === null || this._anchor === this._position) {
      return null;
    }

    const start = Math.min(this._anchor, this._position);
    const end = Math.max(this._anchor, this._position);
    const direction = this._anchor < this._position ? 'forward' : 'backward';

    return { start, end, direction };
  }

  /**
   * Check if there's an active selection.
   */
  hasSelection(): boolean {
    return this._anchor !== null && this._anchor !== this._position;
  }

  /**
   * Set selection range.
   */
  setSelection(start: number, end: number, textLength: number): void {
    this._anchor = this.clamp(start, 0, textLength);
    this._position = this.clamp(end, 0, textLength);
    this.resetBlink();
  }

  /**
   * Select all text.
   */
  selectAll(textLength: number): void {
    this._anchor = 0;
    this._position = textLength;
    this.resetBlink();
  }

  /**
   * Select word at position.
   */
  selectWordAt(text: string, position: number): void {
    // Find word boundaries
    let start = position;
    let end = position;

    // Expand to word start
    while (start > 0 && this.isWordChar(text[start - 1]!)) {
      start--;
    }

    // Expand to word end
    while (end < text.length && this.isWordChar(text[end]!)) {
      end++;
    }

    // If not in a word, select adjacent whitespace
    if (start === end) {
      while (start > 0 && !this.isWordChar(text[start - 1]!)) {
        start--;
      }
      while (end < text.length && !this.isWordChar(text[end]!)) {
        end++;
      }
    }

    this._anchor = start;
    this._position = end;
    this.resetBlink();
  }

  /**
   * Clear selection (keep cursor at end of selection).
   */
  clearSelection(): void {
    this._anchor = null;
  }

  /**
   * Collapse selection to start or end.
   */
  collapseSelection(toStart: boolean): void {
    if (this._anchor === null) return;

    const selection = this.getSelection();
    if (selection) {
      this._position = toStart ? selection.start : selection.end;
    }
    this._anchor = null;
  }

  /**
   * Get deletion range for backspace.
   */
  getBackspaceRange(): { start: number; end: number } | null {
    const selection = this.getSelection();
    if (selection) {
      return { start: selection.start, end: selection.end };
    }

    if (this._position === 0) {
      return null;
    }

    return { start: this._position - 1, end: this._position };
  }

  /**
   * Get deletion range for delete key.
   */
  getDeleteRange(textLength: number): { start: number; end: number } | null {
    const selection = this.getSelection();
    if (selection) {
      return { start: selection.start, end: selection.end };
    }

    if (this._position >= textLength) {
      return null;
    }

    return { start: this._position, end: this._position + 1 };
  }

  /**
   * Get insertion position.
   */
  getInsertPosition(): number {
    const selection = this.getSelection();
    if (selection) {
      return selection.start;
    }
    return this._position;
  }

  /**
   * Update cursor after text change.
   */
  afterTextChange(insertPosition: number, _deletedCount: number, insertedCount: number): void {
    // Clear selection
    this._anchor = null;

    // Move cursor to end of inserted text
    this._position = insertPosition + insertedCount;
    this.resetBlink();
  }

  /**
   * Start cursor blinking.
   */
  startBlinking(onChange: (visible: boolean) => void): void {
    this.onBlinkChange = onChange;
    this.blinkVisible = true;

    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
    }

    this.blinkTimer = setInterval(() => {
      this.blinkVisible = !this.blinkVisible;
      this.onBlinkChange?.(this.blinkVisible);
    }, this.config.blinkInterval);
  }

  /**
   * Stop cursor blinking.
   */
  stopBlinking(): void {
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = null;
    }
    this.blinkVisible = true;
    this.onBlinkChange = null;
  }

  /**
   * Reset blink (show cursor).
   */
  private resetBlink(): void {
    this.blinkVisible = true;
    this.onBlinkChange?.(true);

    // Restart timer
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = setInterval(() => {
        this.blinkVisible = !this.blinkVisible;
        this.onBlinkChange?.(this.blinkVisible);
      }, this.config.blinkInterval);
    }
  }

  /**
   * Check if cursor is visible (for rendering).
   */
  isVisible(): boolean {
    return this.blinkVisible;
  }

  /**
   * Get cursor width.
   */
  getCursorWidth(): number {
    return this.config.cursorWidth;
  }

  /**
   * Clamp value to range.
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.stopBlinking();
  }
}

/**
 * Create a text cursor.
 */
export function createTextCursor(config?: TextCursorConfig): TextCursor {
  return new TextCursor(config);
}
