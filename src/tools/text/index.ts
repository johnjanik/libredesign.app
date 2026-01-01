/**
 * Text Tools Module
 *
 * Exports text editing tool and related utilities.
 */

// Text cursor
export { TextCursor, createTextCursor } from './text-cursor';
export type { TextSelection, CursorBlinkState, TextCursorConfig } from './text-cursor';

// Text input handler
export { TextInputHandler, createTextInputHandler } from './text-input-handler';
export type { TextChange, TextInputHandlerConfig } from './text-input-handler';

// Text edit tool
export { TextEditTool, createTextEditTool } from './text-edit-tool';
export type {
  TextEditToolState,
  TextEditToolOptions,
  TextLayoutQuery,
  CharacterPosition,
  LineInfo,
} from './text-edit-tool';
