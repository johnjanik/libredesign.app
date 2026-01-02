/**
 * AI Action Types
 *
 * Defines all actions the AI can execute on the design canvas.
 */

import type { NodeId } from '@core/types/common';

/**
 * Color specification (CSS color string)
 */
export type ColorSpec = string;

/**
 * Action result
 */
export interface ActionResult {
  success: boolean;
  nodeIds?: NodeId[] | undefined;
  error?: string | undefined;
  data?: unknown;
}

/**
 * Create rectangle action
 */
export interface CreateRectangleAction {
  type: 'CREATE_RECTANGLE';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: ColorSpec | undefined;
  stroke?: ColorSpec | undefined;
  strokeWidth?: number | undefined;
  cornerRadius?: number | undefined;
  name?: string | undefined;
}

/**
 * Create ellipse action
 */
export interface CreateEllipseAction {
  type: 'CREATE_ELLIPSE';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: ColorSpec | undefined;
  stroke?: ColorSpec | undefined;
  strokeWidth?: number | undefined;
  name?: string | undefined;
}

/**
 * Create line action
 */
export interface CreateLineAction {
  type: 'CREATE_LINE';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: ColorSpec | undefined;
  strokeWidth?: number | undefined;
  name?: string | undefined;
}

/**
 * Create text action
 */
export interface CreateTextAction {
  type: 'CREATE_TEXT';
  x: number;
  y: number;
  text: string;
  fontSize?: number | undefined;
  fontFamily?: string | undefined;
  fontWeight?: number | undefined;
  fill?: ColorSpec | undefined;
  name?: string | undefined;
}

/**
 * Create frame action
 */
export interface CreateFrameAction {
  type: 'CREATE_FRAME';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: ColorSpec | undefined;
  name?: string | undefined;
}

/**
 * Select action
 */
export interface SelectAction {
  type: 'SELECT';
  nodeIds: NodeId[];
}

/**
 * Select all action
 */
export interface SelectAllAction {
  type: 'SELECT_ALL';
}

/**
 * Clear selection action
 */
export interface ClearSelectionAction {
  type: 'CLEAR_SELECTION';
}

/**
 * Update node action
 */
export interface UpdateNodeAction {
  type: 'UPDATE_NODE';
  nodeId: NodeId;
  updates: {
    x?: number | undefined;
    y?: number | undefined;
    width?: number | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    fill?: ColorSpec | undefined;
    stroke?: ColorSpec | undefined;
    strokeWidth?: number | undefined;
    opacity?: number | undefined;
    name?: string | undefined;
    visible?: boolean | undefined;
    locked?: boolean | undefined;
  };
}

/**
 * Move action
 */
export interface MoveAction {
  type: 'MOVE';
  nodeIds: NodeId[];
  dx: number;
  dy: number;
}

/**
 * Resize action
 */
export interface ResizeAction {
  type: 'RESIZE';
  nodeId: NodeId;
  width: number;
  height: number;
  proportional?: boolean | undefined;
}

/**
 * Rotate action
 */
export interface RotateAction {
  type: 'ROTATE';
  nodeId: NodeId;
  angle: number;
  relative?: boolean | undefined;
}

/**
 * Delete action
 */
export interface DeleteAction {
  type: 'DELETE';
  nodeIds: NodeId[];
}

/**
 * Duplicate action
 */
export interface DuplicateAction {
  type: 'DUPLICATE';
  nodeIds: NodeId[];
  offsetX?: number | undefined;
  offsetY?: number | undefined;
}

/**
 * Group action
 */
export interface GroupAction {
  type: 'GROUP';
  nodeIds: NodeId[];
}

/**
 * Ungroup action
 */
export interface UngroupAction {
  type: 'UNGROUP';
  nodeId: NodeId;
}

/**
 * Pan action
 */
export interface PanAction {
  type: 'PAN';
  dx: number;
  dy: number;
}

/**
 * Zoom action
 */
export interface ZoomAction {
  type: 'ZOOM';
  level: number;
  centerX?: number | undefined;
  centerY?: number | undefined;
}

/**
 * Zoom to fit action
 */
export interface ZoomToFitAction {
  type: 'ZOOM_TO_FIT';
}

/**
 * Zoom to selection action
 */
export interface ZoomToSelectionAction {
  type: 'ZOOM_TO_SELECTION';
}

/**
 * Set tool action
 */
export interface SetToolAction {
  type: 'SET_TOOL';
  tool: 'select' | 'rectangle' | 'ellipse' | 'line' | 'pen' | 'text' | 'hand' | 'frame';
}

/**
 * Undo action
 */
export interface UndoAction {
  type: 'UNDO';
}

/**
 * Redo action
 */
export interface RedoAction {
  type: 'REDO';
}

/**
 * Look at action (move AI cursor for visual feedback)
 */
export interface LookAtAction {
  type: 'LOOK_AT';
  x: number;
  y: number;
}

/**
 * Bring to front action
 */
export interface BringToFrontAction {
  type: 'BRING_TO_FRONT';
  nodeIds: NodeId[];
}

/**
 * Send to back action
 */
export interface SendToBackAction {
  type: 'SEND_TO_BACK';
  nodeIds: NodeId[];
}

/**
 * All AI actions
 */
export type AIAction =
  | CreateRectangleAction
  | CreateEllipseAction
  | CreateLineAction
  | CreateTextAction
  | CreateFrameAction
  | SelectAction
  | SelectAllAction
  | ClearSelectionAction
  | UpdateNodeAction
  | MoveAction
  | ResizeAction
  | RotateAction
  | DeleteAction
  | DuplicateAction
  | GroupAction
  | UngroupAction
  | PanAction
  | ZoomAction
  | ZoomToFitAction
  | ZoomToSelectionAction
  | SetToolAction
  | UndoAction
  | RedoAction
  | LookAtAction
  | BringToFrontAction
  | SendToBackAction;

/**
 * Get the action type string
 */
export function getActionType(action: AIAction): string {
  return action.type;
}

/**
 * Check if action creates a node
 */
export function isCreationAction(action: AIAction): boolean {
  return action.type.startsWith('CREATE_');
}

/**
 * Check if action modifies nodes
 */
export function isModificationAction(action: AIAction): boolean {
  return ['UPDATE_NODE', 'MOVE', 'RESIZE', 'ROTATE', 'DELETE', 'DUPLICATE', 'GROUP', 'UNGROUP'].includes(
    action.type
  );
}

/**
 * Check if action affects viewport
 */
export function isViewportAction(action: AIAction): boolean {
  return ['PAN', 'ZOOM', 'ZOOM_TO_FIT', 'ZOOM_TO_SELECTION'].includes(action.type);
}
