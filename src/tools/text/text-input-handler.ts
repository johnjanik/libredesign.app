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

const DEFAULT_CONFIG: Required<TextInputHandlerConfig> = {
  maxLength: 0,
  multiline: true,
};

/**
 * Text input handler for processing keyboard events
 */
export class TextInputHandler {
  private config: Required<TextInputHandlerConfig>;
  private cursor: TextCursor;
  private text: string;

  // Callbacks
  private onTextChange: ((change: TextChange, newText: string) => void) | null = null;
  private onExit: (() => void) | null = null;

  constructor(
    cursor: TextCursor,
    initialText: string,
    config: TextInputHandlerConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cursor = cursor;
    this.text = initialText;
  }

  /**
   * Set text change callback.
   */
  setOnTextChange(callback: (change: TextChange, newText: string) => void): void {
    this.onTextChange = callback;
  }

  /**
   * Set exit callback.
   */
  setOnExit(callback: () => void): void {
    this.onExit = callback;
  }

  /**
   * Get current text.
   */
  getText(): string {
    return this.text;
  }

  /**
   * Set text (for external updates).
   */
  setText(text: string): void {
    this.text = text;
  }

  /**
   * Handle key down event.
   * Returns true if the event was handled.
   */
  handleKeyDown(event: KeyEventData): boolean {
    const { key, ctrlKey, metaKey, shiftKey } = event;
    const cmdKey = ctrlKey || metaKey;

    // Exit on Escape
    if (key === 'Escape') {
      this.onExit?.();
      return true;
    }

    // Navigation keys
    if (this.handleNavigationKey(key, shiftKey, cmdKey)) {
      return true;
    }

    // Editing shortcuts
    if (cmdKey) {
      if (this.handleShortcut(key)) {
        return true;
      }
    }

    // Deletion keys
    if (this.handleDeletionKey(key, cmdKey)) {
      return true;
    }

    // Character input
    if (key.length === 1 && !ctrlKey && !metaKey) {
      this.insertText(key);
      return true;
    }

    // Enter key
    if (key === 'Enter') {
      if (this.config.multiline) {
        this.insertText('\n');
      } else {
        this.onExit?.();
      }
      return true;
    }

    // Tab key (insert tab or move focus)
    if (key === 'Tab') {
      this.insertText('\t');
      return true;
    }

    return false;
  }

  /**
   * Handle navigation keys.
   */
  private handleNavigationKey(key: string, shift: boolean, cmd: boolean): boolean {
    const textLength = this.text.length;

    switch (key) {
      case 'ArrowLeft':
        if (cmd) {
          this.cursor.moveToLineStart(this.text, shift);
        } else {
          this.cursor.move(-1, textLength, shift);
        }
        return true;

      case 'ArrowRight':
        if (cmd) {
          this.cursor.moveToLineEnd(this.text, shift);
        } else {
          this.cursor.move(1, textLength, shift);
        }
        return true;

      case 'ArrowUp':
        // Move to previous line (simplified - move to line start then back)
        this.cursor.moveToLineStart(this.text, shift);
        if (this.cursor.position > 0) {
          this.cursor.move(-1, textLength, shift);
          this.cursor.moveToLineStart(this.text, shift);
        }
        return true;

      case 'ArrowDown':
        // Move to next line
        this.cursor.moveToLineEnd(this.text, shift);
        if (this.cursor.position < textLength) {
          this.cursor.move(1, textLength, shift);
        }
        return true;

      case 'Home':
        if (cmd) {
          this.cursor.moveToStart(shift);
        } else {
          this.cursor.moveToLineStart(this.text, shift);
        }
        return true;

      case 'End':
        if (cmd) {
          this.cursor.moveToEnd(textLength, shift);
        } else {
          this.cursor.moveToLineEnd(this.text, shift);
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle keyboard shortcuts.
   */
  private handleShortcut(key: string): boolean {
    switch (key.toLowerCase()) {
      case 'a':
        this.cursor.selectAll(this.text.length);
        return true;

      case 'c':
        this.copySelection();
        return true;

      case 'x':
        this.cutSelection();
        return true;

      case 'v':
        this.pasteFromClipboard();
        return true;

      case 'z':
        // Undo - handled externally
        return false;

      case 'y':
        // Redo - handled externally
        return false;

      default:
        return false;
    }
  }

  /**
   * Handle deletion keys.
   */
  private handleDeletionKey(key: string, cmd: boolean): boolean {
    switch (key) {
      case 'Backspace':
        if (cmd) {
          // Delete to line start
          const lineStart = this.findLineStart(this.cursor.position);
          if (lineStart < this.cursor.position) {
            this.deleteRange(lineStart, this.cursor.position);
          }
        } else {
          this.deleteBackward();
        }
        return true;

      case 'Delete':
        if (cmd) {
          // Delete to line end
          const lineEnd = this.findLineEnd(this.cursor.position);
          if (this.cursor.position < lineEnd) {
            this.deleteRange(this.cursor.position, lineEnd);
          }
        } else {
          this.deleteForward();
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * Insert text at cursor position.
   */
  insertText(insertedText: string): void {
    // Check max length
    if (this.config.maxLength > 0) {
      const selection = this.cursor.getSelection();
      const selectedLength = selection ? selection.end - selection.start : 0;
      const newLength = this.text.length - selectedLength + insertedText.length;
      if (newLength > this.config.maxLength) {
        const allowedLength = this.config.maxLength - (this.text.length - selectedLength);
        if (allowedLength <= 0) return;
        insertedText = insertedText.substring(0, allowedLength);
      }
    }

    const selection = this.cursor.getSelection();
    let position: number;
    let deletedText: string;

    if (selection) {
      position = selection.start;
      deletedText = this.text.substring(selection.start, selection.end);
      this.text = this.text.substring(0, selection.start) +
                  insertedText +
                  this.text.substring(selection.end);
    } else {
      position = this.cursor.position;
      deletedText = '';
      this.text = this.text.substring(0, position) +
                  insertedText +
                  this.text.substring(position);
    }

    this.cursor.afterTextChange(position, deletedText.length, insertedText.length);

    const change: TextChange = {
      type: deletedText ? 'replace' : 'insert',
      position,
      deletedText,
      insertedText,
    };

    this.onTextChange?.(change, this.text);
  }

  /**
   * Delete backward (backspace).
   */
  deleteBackward(): void {
    const range = this.cursor.getBackspaceRange();
    if (!range) return;

    this.deleteRange(range.start, range.end);
  }

  /**
   * Delete forward (delete key).
   */
  deleteForward(): void {
    const range = this.cursor.getDeleteRange(this.text.length);
    if (!range) return;

    this.deleteRange(range.start, range.end);
  }

  /**
   * Delete a range of text.
   */
  deleteRange(start: number, end: number): void {
    const deletedText = this.text.substring(start, end);
    this.text = this.text.substring(0, start) + this.text.substring(end);

    this.cursor.afterTextChange(start, deletedText.length, 0);

    const change: TextChange = {
      type: 'delete',
      position: start,
      deletedText,
      insertedText: '',
    };

    this.onTextChange?.(change, this.text);
  }

  /**
   * Copy selection to clipboard.
   */
  copySelection(): void {
    const selection = this.cursor.getSelection();
    if (!selection) return;

    const selectedText = this.text.substring(selection.start, selection.end);

    navigator.clipboard.writeText(selectedText).catch(err => {
      console.warn('Failed to copy to clipboard:', err);
    });
  }

  /**
   * Cut selection to clipboard.
   */
  cutSelection(): void {
    const selection = this.cursor.getSelection();
    if (!selection) return;

    const selectedText = this.text.substring(selection.start, selection.end);

    navigator.clipboard.writeText(selectedText).then(() => {
      this.deleteRange(selection.start, selection.end);
    }).catch(err => {
      console.warn('Failed to cut to clipboard:', err);
    });
  }

  /**
   * Paste from clipboard.
   */
  pasteFromClipboard(): void {
    navigator.clipboard.readText().then(text => {
      if (text) {
        // Remove non-printable characters except newlines and tabs
        text = text.replace(/[^\x20-\x7E\n\t]/g, '');

        // Convert line endings
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Remove newlines if not multiline
        if (!this.config.multiline) {
          text = text.replace(/\n/g, ' ');
        }

        this.insertText(text);
      }
    }).catch(err => {
      console.warn('Failed to paste from clipboard:', err);
    });
  }

  /**
   * Find line start from position.
   */
  private findLineStart(position: number): number {
    let pos = position - 1;
    while (pos >= 0 && this.text[pos] !== '\n') {
      pos--;
    }
    return pos + 1;
  }

  /**
   * Find line end from position.
   */
  private findLineEnd(position: number): number {
    let pos = position;
    while (pos < this.text.length && this.text[pos] !== '\n') {
      pos++;
    }
    return pos;
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.onTextChange = null;
    this.onExit = null;
  }
}

/**
 * Create a text input handler.
 */
export function createTextInputHandler(
  cursor: TextCursor,
  initialText: string,
  config?: TextInputHandlerConfig
): TextInputHandler {
  return new TextInputHandler(cursor, initialText, config);
}
