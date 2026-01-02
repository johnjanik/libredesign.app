/**
 * AI Action Executor
 *
 * Executes AI actions on the design canvas via the runtime API.
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import type { VectorPath, WindingRule, PathCommand } from '@core/types/geometry';
import type { SolidPaint } from '@core/types/paint';
import type { AIAction, ActionResult, ColorSpec } from './action-types';

/**
 * Action executor events
 */
export interface ActionExecutorEvents {
  'action:start': { action: AIAction };
  'action:complete': { action: AIAction; result: ActionResult };
  'action:error': { action: AIAction; error: Error };
  'cursor:move': { x: number; y: number };
  [key: string]: unknown;
}

/**
 * AI Action Executor
 */
export class ActionExecutor extends EventEmitter<ActionExecutorEvents> {
  private runtime: DesignLibreRuntime;

  constructor(runtime: DesignLibreRuntime) {
    super();
    this.runtime = runtime;
  }

  /**
   * Execute an AI action.
   */
  async execute(action: AIAction): Promise<ActionResult> {
    this.emit('action:start', { action });

    try {
      const result = await this.executeAction(action);
      this.emit('action:complete', { action, result });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('action:error', { action, error: err });
      return { success: false, error: err.message };
    }
  }

  /**
   * Execute multiple actions in sequence.
   */
  async executeMany(actions: AIAction[]): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    for (const action of actions) {
      const result = await this.execute(action);
      results.push(result);
      if (!result.success) break; // Stop on first error
    }
    return results;
  }

  private async executeAction(action: AIAction): Promise<ActionResult> {
    switch (action.type) {
      case 'CREATE_RECTANGLE':
        return this.createRectangle(action);
      case 'CREATE_ELLIPSE':
        return this.createEllipse(action);
      case 'CREATE_LINE':
        return this.createLine(action);
      case 'CREATE_TEXT':
        return this.createText(action);
      case 'CREATE_FRAME':
        return this.createFrame(action);
      case 'SELECT':
        return this.select(action.nodeIds);
      case 'SELECT_ALL':
        return this.selectAll();
      case 'CLEAR_SELECTION':
        return this.clearSelection();
      case 'UPDATE_NODE':
        return this.updateNode(action.nodeId, action.updates);
      case 'MOVE':
        return this.move(action.nodeIds, action.dx, action.dy);
      case 'RESIZE':
        return this.resize(action.nodeId, action.width, action.height);
      case 'ROTATE':
        return this.rotate(action.nodeId, action.angle, action.relative);
      case 'DELETE':
        return this.deleteNodes(action.nodeIds);
      case 'DUPLICATE':
        return this.duplicate(action.nodeIds, action.offsetX, action.offsetY);
      case 'GROUP':
        return this.group(action.nodeIds);
      case 'UNGROUP':
        return this.ungroup(action.nodeId);
      case 'PAN':
        return this.pan(action.dx, action.dy);
      case 'ZOOM':
        return this.zoom(action.level, action.centerX, action.centerY);
      case 'ZOOM_TO_FIT':
        return this.zoomToFit();
      case 'ZOOM_TO_SELECTION':
        return this.zoomToSelection();
      case 'SET_TOOL':
        return this.setTool(action.tool);
      case 'UNDO':
        return this.undo();
      case 'REDO':
        return this.redo();
      case 'LOOK_AT':
        return this.lookAt(action.x, action.y);
      case 'BRING_TO_FRONT':
        return this.bringToFront(action.nodeIds);
      case 'SEND_TO_BACK':
        return this.sendToBack(action.nodeIds);
      default:
        return { success: false, error: `Unknown action type: ${(action as AIAction).type}` };
    }
  }

  // =========================================================================
  // Creation Actions
  // =========================================================================

  private createRectangle(action: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill?: ColorSpec | undefined;
    stroke?: ColorSpec | undefined;
    strokeWidth?: number | undefined;
    cornerRadius?: number | undefined;
    name?: string | undefined;
  }): ActionResult {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!sceneGraph || !pageId) {
      return { success: false, error: 'No active page' };
    }

    const nodeId = sceneGraph.createVector(pageId, {
      name: action.name ?? 'Rectangle',
      x: action.x,
      y: action.y,
      width: action.width,
      height: action.height,
      vectorPaths: [this.createRectPath(action.width, action.height, action.cornerRadius)],
      fills: action.fill ? [this.createSolidFill(action.fill)] : [],
      strokes: action.stroke ? [this.createSolidFill(action.stroke)] : [],
      strokeWeight: action.strokeWidth ?? 1,
    });

    return { success: true, nodeIds: [nodeId] };
  }

  private createEllipse(action: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill?: ColorSpec | undefined;
    stroke?: ColorSpec | undefined;
    strokeWidth?: number | undefined;
    name?: string | undefined;
  }): ActionResult {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!sceneGraph || !pageId) {
      return { success: false, error: 'No active page' };
    }

    const nodeId = sceneGraph.createVector(pageId, {
      name: action.name ?? 'Ellipse',
      x: action.x,
      y: action.y,
      width: action.width,
      height: action.height,
      vectorPaths: [this.createEllipsePath(action.width, action.height)],
      fills: action.fill ? [this.createSolidFill(action.fill)] : [],
      strokes: action.stroke ? [this.createSolidFill(action.stroke)] : [],
      strokeWeight: action.strokeWidth ?? 1,
    });

    return { success: true, nodeIds: [nodeId] };
  }

  private createLine(action: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke?: ColorSpec | undefined;
    strokeWidth?: number | undefined;
    name?: string | undefined;
  }): ActionResult {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!sceneGraph || !pageId) {
      return { success: false, error: 'No active page' };
    }

    const x = Math.min(action.x1, action.x2);
    const y = Math.min(action.y1, action.y2);
    const width = Math.abs(action.x2 - action.x1);
    const height = Math.abs(action.y2 - action.y1);

    const nodeId = sceneGraph.createVector(pageId, {
      name: action.name ?? 'Line',
      x,
      y,
      width: width || 1,
      height: height || 1,
      vectorPaths: [this.createLinePath(action.x1 - x, action.y1 - y, action.x2 - x, action.y2 - y)],
      fills: [],
      strokes: [this.createSolidFill(action.stroke ?? '#000000')],
      strokeWeight: action.strokeWidth ?? 1,
    });

    return { success: true, nodeIds: [nodeId] };
  }

  private createText(action: {
    x: number;
    y: number;
    text: string;
    fontSize?: number | undefined;
    fontFamily?: string | undefined;
    fontWeight?: number | undefined;
    fill?: ColorSpec | undefined;
    name?: string | undefined;
  }): ActionResult {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!sceneGraph || !pageId) {
      return { success: false, error: 'No active page' };
    }

    const nodeId = sceneGraph.createText(pageId, {
      name: action.name ?? 'Text',
      x: action.x,
      y: action.y,
      characters: action.text,
    });

    // Update additional text properties via node update
    if (action.fontSize || action.fontFamily || action.fontWeight || action.fill) {
      const textStyles = [{
        start: 0,
        end: action.text.length,
        fontSize: action.fontSize ?? 16,
        fontFamily: action.fontFamily ?? 'Inter',
        fontWeight: action.fontWeight ?? 400,
        fills: action.fill ? [this.createSolidFill(action.fill)] : [this.createSolidFill('#000000')],
        textDecoration: 'NONE' as const,
        letterSpacing: 0,
        lineHeight: 'AUTO' as const,
      }];
      sceneGraph.updateNode(nodeId, { textStyles });
    }

    return { success: true, nodeIds: [nodeId] };
  }

  private createFrame(action: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill?: ColorSpec | undefined;
    name?: string | undefined;
  }): ActionResult {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!sceneGraph || !pageId) {
      return { success: false, error: 'No active page' };
    }

    const nodeId = sceneGraph.createFrame(pageId, {
      name: action.name ?? 'Frame',
      x: action.x,
      y: action.y,
      width: action.width,
      height: action.height,
    });

    // Update fill if specified
    if (action.fill) {
      sceneGraph.updateNode(nodeId, { fills: [this.createSolidFill(action.fill)] });
    }

    return { success: true, nodeIds: [nodeId] };
  }

  // =========================================================================
  // Selection Actions
  // =========================================================================

  private select(nodeIds: NodeId[]): ActionResult {
    const selectionManager = this.runtime.getSelectionManager();
    if (!selectionManager) {
      return { success: false, error: 'Selection manager not available' };
    }

    selectionManager.select(nodeIds, 'replace');
    return { success: true, nodeIds };
  }

  private selectAll(): ActionResult {
    const selectionManager = this.runtime.getSelectionManager();
    if (!selectionManager) {
      return { success: false, error: 'Selection manager not available' };
    }

    selectionManager.selectAll();
    return { success: true };
  }

  private clearSelection(): ActionResult {
    const selectionManager = this.runtime.getSelectionManager();
    if (!selectionManager) {
      return { success: false, error: 'Selection manager not available' };
    }

    selectionManager.clear();
    return { success: true };
  }

  // =========================================================================
  // Modification Actions
  // =========================================================================

  private updateNode(nodeId: NodeId, updates: Record<string, unknown>): ActionResult {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) {
      return { success: false, error: 'Scene graph not available' };
    }

    const node = sceneGraph.getNode(nodeId);
    if (!node) {
      return { success: false, error: `Node not found: ${nodeId}` };
    }

    // Convert color specs to fills/strokes if provided
    const nodeUpdates: Record<string, unknown> = { ...updates };

    if (updates['fill']) {
      nodeUpdates['fills'] = [this.createSolidFill(updates['fill'] as ColorSpec)];
      delete nodeUpdates['fill'];
    }

    if (updates['stroke']) {
      nodeUpdates['strokes'] = [this.createSolidFill(updates['stroke'] as ColorSpec)];
      delete nodeUpdates['stroke'];
    }

    if (updates['strokeWidth']) {
      nodeUpdates['strokeWeight'] = updates['strokeWidth'];
      delete nodeUpdates['strokeWidth'];
    }

    sceneGraph.updateNode(nodeId, nodeUpdates);
    return { success: true, nodeIds: [nodeId] };
  }

  private move(nodeIds: NodeId[], dx: number, dy: number): ActionResult {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) {
      return { success: false, error: 'Scene graph not available' };
    }

    for (const nodeId of nodeIds) {
      const node = sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node) {
        sceneGraph.updateNode(nodeId, {
          x: (node.x as number) + dx,
          y: (node.y as number) + dy,
        });
      }
    }

    return { success: true, nodeIds };
  }

  private resize(nodeId: NodeId, width: number, height: number): ActionResult {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) {
      return { success: false, error: 'Scene graph not available' };
    }

    sceneGraph.updateNode(nodeId, { width, height });
    return { success: true, nodeIds: [nodeId] };
  }

  private rotate(nodeId: NodeId, angle: number, relative?: boolean): ActionResult {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) {
      return { success: false, error: 'Scene graph not available' };
    }

    const node = sceneGraph.getNode(nodeId);
    if (!node) {
      return { success: false, error: `Node not found: ${nodeId}` };
    }

    const currentRotation = ('rotation' in node ? node.rotation : 0) as number;
    const newRotation = relative ? currentRotation + angle : angle;

    sceneGraph.updateNode(nodeId, { rotation: newRotation });
    return { success: true, nodeIds: [nodeId] };
  }

  private deleteNodes(nodeIds: NodeId[]): ActionResult {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) {
      return { success: false, error: 'Scene graph not available' };
    }

    for (const nodeId of nodeIds) {
      sceneGraph.deleteNode(nodeId);
    }

    return { success: true, nodeIds };
  }

  private duplicate(nodeIds: NodeId[], offsetX = 20, offsetY = 20): ActionResult {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) {
      return { success: false, error: 'Scene graph not available' };
    }

    const newNodeIds: NodeId[] = [];

    for (const nodeId of nodeIds) {
      const node = sceneGraph.getNode(nodeId);
      if (!node || !node.parentId) continue;

      // Clone the node (simplified - creates a basic node at offset position)
      const x = ('x' in node ? (node.x as number) : 0) + offsetX;
      const y = ('y' in node ? (node.y as number) : 0) + offsetY;
      const width = 'width' in node ? (node.width as number) : 100;
      const height = 'height' in node ? (node.height as number) : 100;

      const newNodeId = sceneGraph.createNode(node.type, node.parentId, undefined, {
        name: `${node.name} copy`,
      } as Record<string, unknown>);

      // Update position after creation
      if (newNodeId) {
        sceneGraph.updateNode(newNodeId, { x, y, width, height });
        newNodeIds.push(newNodeId);
      }
    }

    return { success: true, nodeIds: newNodeIds };
  }

  private group(nodeIds: NodeId[]): ActionResult {
    this.runtime.getKeyboardManager()?.actionGroup();
    return { success: true, nodeIds };
  }

  private ungroup(nodeId: NodeId): ActionResult {
    this.runtime.setSelection([nodeId]);
    this.runtime.getKeyboardManager()?.actionUngroup();
    return { success: true, nodeIds: [nodeId] };
  }

  // =========================================================================
  // Viewport Actions
  // =========================================================================

  private pan(dx: number, dy: number): ActionResult {
    const viewport = this.runtime.getViewport();
    if (!viewport) {
      return { success: false, error: 'Viewport not available' };
    }

    viewport.pan(dx, dy);
    return { success: true };
  }

  private zoom(level: number, centerX?: number, centerY?: number): ActionResult {
    const viewport = this.runtime.getViewport();
    if (!viewport) {
      return { success: false, error: 'Viewport not available' };
    }

    if (centerX !== undefined && centerY !== undefined) {
      viewport.zoomAt(level, centerX, centerY);
    } else {
      viewport.setZoom(level);
    }

    return { success: true };
  }

  private zoomToFit(): ActionResult {
    this.runtime.getKeyboardManager()?.actionZoomToFit();
    return { success: true };
  }

  private zoomToSelection(): ActionResult {
    this.runtime.getKeyboardManager()?.actionZoomToSelection();
    return { success: true };
  }

  // =========================================================================
  // Tool Actions
  // =========================================================================

  private setTool(tool: string): ActionResult {
    const toolManager = this.runtime.getToolManager();
    if (!toolManager) {
      return { success: false, error: 'Tool manager not available' };
    }

    toolManager.setActiveTool(tool);
    return { success: true };
  }

  // =========================================================================
  // History Actions
  // =========================================================================

  private undo(): ActionResult {
    this.runtime.getKeyboardManager()?.actionUndo();
    return { success: true };
  }

  private redo(): ActionResult {
    this.runtime.getKeyboardManager()?.actionRedo();
    return { success: true };
  }

  // =========================================================================
  // Visual Feedback Actions
  // =========================================================================

  private lookAt(x: number, y: number): ActionResult {
    this.emit('cursor:move', { x, y });
    return { success: true };
  }

  // =========================================================================
  // Layer Order Actions
  // =========================================================================

  private bringToFront(nodeIds: NodeId[]): ActionResult {
    this.runtime.setSelection(nodeIds);
    this.runtime.getKeyboardManager()?.actionBringToFront();
    return { success: true, nodeIds };
  }

  private sendToBack(nodeIds: NodeId[]): ActionResult {
    this.runtime.setSelection(nodeIds);
    this.runtime.getKeyboardManager()?.actionSendToBack();
    return { success: true, nodeIds };
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private createRectPath(width: number, height: number, cornerRadius = 0): VectorPath {
    if (cornerRadius > 0) {
      const r = Math.min(cornerRadius, width / 2, height / 2);
      // Rounded rectangle path
      const commands: PathCommand[] = [
        { type: 'M', x: r, y: 0 },
        { type: 'L', x: width - r, y: 0 },
        { type: 'C', x1: width, y1: 0, x2: width, y2: r, x: width, y: r },
        { type: 'L', x: width, y: height - r },
        { type: 'C', x1: width, y1: height, x2: width - r, y2: height, x: width - r, y: height },
        { type: 'L', x: r, y: height },
        { type: 'C', x1: 0, y1: height, x2: 0, y2: height - r, x: 0, y: height - r },
        { type: 'L', x: 0, y: r },
        { type: 'C', x1: 0, y1: 0, x2: r, y2: 0, x: r, y: 0 },
        { type: 'Z' },
      ];
      return { windingRule: 'NONZERO' as WindingRule, commands };
    }

    // Simple rectangle
    const commands: PathCommand[] = [
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: width, y: 0 },
      { type: 'L', x: width, y: height },
      { type: 'L', x: 0, y: height },
      { type: 'Z' },
    ];
    return { windingRule: 'NONZERO' as WindingRule, commands };
  }

  private createEllipsePath(width: number, height: number): VectorPath {
    const rx = width / 2;
    const ry = height / 2;
    const cx = rx;
    const cy = ry;

    // Approximate ellipse with cubic bezier curves
    const kappa = 0.5522847498;
    const ox = rx * kappa;
    const oy = ry * kappa;

    const commands: PathCommand[] = [
      { type: 'M', x: cx, y: cy - ry },
      { type: 'C', x1: cx + ox, y1: cy - ry, x2: cx + rx, y2: cy - oy, x: cx + rx, y: cy },
      { type: 'C', x1: cx + rx, y1: cy + oy, x2: cx + ox, y2: cy + ry, x: cx, y: cy + ry },
      { type: 'C', x1: cx - ox, y1: cy + ry, x2: cx - rx, y2: cy + oy, x: cx - rx, y: cy },
      { type: 'C', x1: cx - rx, y1: cy - oy, x2: cx - ox, y2: cy - ry, x: cx, y: cy - ry },
      { type: 'Z' },
    ];
    return { windingRule: 'NONZERO' as WindingRule, commands };
  }

  private createLinePath(x1: number, y1: number, x2: number, y2: number): VectorPath {
    const commands: PathCommand[] = [
      { type: 'M', x: x1, y: y1 },
      { type: 'L', x: x2, y: y2 },
    ];
    return { windingRule: 'NONZERO' as WindingRule, commands };
  }

  private createSolidFill(color: ColorSpec): SolidPaint {
    const rgba = this.parseColor(color);
    return {
      type: 'SOLID',
      color: rgba,
      opacity: rgba.a,
      visible: true,
    };
  }

  private parseColor(color: ColorSpec): { r: number; g: number; b: number; a: number } {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        const r = parseInt(hex.charAt(0) + hex.charAt(0), 16) / 255;
        const g = parseInt(hex.charAt(1) + hex.charAt(1), 16) / 255;
        const b = parseInt(hex.charAt(2) + hex.charAt(2), 16) / 255;
        return { r, g, b, a: 1 };
      } else if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        return { r, g, b, a: 1 };
      } else if (hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        const a = parseInt(hex.slice(6, 8), 16) / 255;
        return { r, g, b, a };
      }
    }

    // Handle rgb/rgba
    const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i);
    if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
      return {
        r: parseInt(rgbMatch[1], 10) / 255,
        g: parseInt(rgbMatch[2], 10) / 255,
        b: parseInt(rgbMatch[3], 10) / 255,
        a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
      };
    }

    // Handle named colors (simplified)
    const namedColors: Record<string, { r: number; g: number; b: number; a: number }> = {
      red: { r: 1, g: 0, b: 0, a: 1 },
      green: { r: 0, g: 0.5, b: 0, a: 1 },
      blue: { r: 0, g: 0, b: 1, a: 1 },
      white: { r: 1, g: 1, b: 1, a: 1 },
      black: { r: 0, g: 0, b: 0, a: 1 },
      yellow: { r: 1, g: 1, b: 0, a: 1 },
      cyan: { r: 0, g: 1, b: 1, a: 1 },
      magenta: { r: 1, g: 0, b: 1, a: 1 },
      orange: { r: 1, g: 0.65, b: 0, a: 1 },
      purple: { r: 0.5, g: 0, b: 0.5, a: 1 },
      pink: { r: 1, g: 0.75, b: 0.8, a: 1 },
      gray: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      grey: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
    };

    return namedColors[color.toLowerCase()] || { r: 0, g: 0, b: 0, a: 1 };
  }
}

/**
 * Create an action executor instance.
 */
export function createActionExecutor(runtime: DesignLibreRuntime): ActionExecutor {
  return new ActionExecutor(runtime);
}
