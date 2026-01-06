/**
 * DesignLibre Bridge
 *
 * Concrete implementation of RuntimeBridge that connects to DesignLibreRuntime.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import type {
  RuntimeBridge,
  ColorValue,
  LayerSummary,
  CanvasState,
  RectangleOptions,
  EllipseOptions,
  TextOptions,
  FrameOptions,
  LineOptions,
  AlignmentType,
  DistributionType,
} from './runtime-bridge';
import { solidPaint, linearGradientPaint, radialGradientPaint, gradientStop } from '@core/types/paint';
import type { Paint, GradientStop } from '@core/types/paint';
import { rgba } from '@core/types/color';
import type { VectorPath, PathCommand } from '@core/types/geometry';
import type { BlendMode } from '@core/types/common';
import type { Effect } from '@core/types/effect';
import { dropShadow } from '@core/types/effect';
import { rgba as rgbaColor } from '@core/types/color';
import { createCSSGenerator } from '@persistence/export/css-generator';
import { createIOSCodeGenerator } from '@persistence/export/ios-code-generator';
import { createAndroidCodeGenerator } from '@persistence/export/android-code-generator';
import { createReactComponentGenerator } from '@persistence/export/react-component-generator';
import { createHTMLExporter } from '@persistence/export/html-exporter';

/**
 * Helper to safely get node properties
 */
function getNodeProps(node: unknown): {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  id: string;
} {
  const n = node as Record<string, unknown>;
  return {
    x: (n['x'] as number) ?? 0,
    y: (n['y'] as number) ?? 0,
    width: (n['width'] as number) ?? 0,
    height: (n['height'] as number) ?? 0,
    name: (n['name'] as string) ?? '',
    type: (n['type'] as string) ?? '',
    visible: (n['visible'] as boolean) !== false,
    locked: (n['locked'] as boolean) === true,
    id: String(n['id'] ?? ''),
  };
}

/**
 * DesignLibre Runtime Bridge
 */
export class DesignLibreBridge implements RuntimeBridge {
  constructor(private runtime: DesignLibreRuntime) {}

  // =========================================================================
  // Selection Operations
  // =========================================================================

  async selectAll(): Promise<string[]> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) return [];

    const allIds = this.getAllLayerIds(pageId, sceneGraph);
    this.runtime.setSelection(allIds);
    return allIds.map(String);
  }

  async selectByIds(ids: string[]): Promise<void> {
    this.runtime.setSelection(ids as NodeId[]);
  }

  async selectByName(pattern: string): Promise<string[]> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) return [];

    const allIds = this.getAllLayerIds(pageId, sceneGraph);
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');

    const matchingIds = allIds.filter((id) => {
      const node = sceneGraph.getNode(id);
      if (!node) return false;
      const props = getNodeProps(node);
      return regex.test(props.name);
    });

    this.runtime.setSelection(matchingIds);
    return matchingIds.map(String);
  }

  async selectByType(type: string): Promise<string[]> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) return [];

    const allIds = this.getAllLayerIds(pageId, sceneGraph);
    const matchingIds = allIds.filter((id) => {
      const node = sceneGraph.getNode(id);
      if (!node) return false;
      const props = getNodeProps(node);
      return props.type === type;
    });

    this.runtime.setSelection(matchingIds);
    return matchingIds.map(String);
  }

  async getSelection(): Promise<string[]> {
    return this.runtime.getSelection().map(String);
  }

  async clearSelection(): Promise<void> {
    this.runtime.clearSelection();
  }

  // =========================================================================
  // Layer Operations
  // =========================================================================

  async groupLayers(layerIds: string[]): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    const groupId = sceneGraph.createNode('GROUP', pageId, -1, {
      name: 'Group',
    });

    for (const id of layerIds) {
      sceneGraph.moveNode(id as NodeId, groupId, -1);
    }

    this.runtime.setSelection([groupId]);
    return String(groupId);
  }

  async ungroupLayers(groupId: string): Promise<string[]> {
    const sceneGraph = this.runtime.getSceneGraph();
    const group = sceneGraph.getNode(groupId as NodeId);
    if (!group) throw new Error('Group not found');

    const props = getNodeProps(group);
    if (props.type !== 'GROUP') {
      throw new Error('Not a group');
    }

    const parent = sceneGraph.getParent(groupId as NodeId);
    if (!parent) throw new Error('Group has no parent');
    const parentId = (parent as { id: NodeId }).id;

    const childIds = sceneGraph.getChildIds(groupId as NodeId);

    for (const childId of childIds) {
      sceneGraph.moveNode(childId, parentId, -1);
    }

    sceneGraph.deleteNode(groupId as NodeId);

    this.runtime.setSelection(childIds);
    return childIds.map(String);
  }

  async lockLayer(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { locked: true });
  }

  async unlockLayer(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { locked: false });
  }

  async hideLayer(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { visible: false });
  }

  async showLayer(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { visible: true });
  }

  async deleteLayers(layerIds: string[]): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    for (const id of layerIds) {
      sceneGraph.deleteNode(id as NodeId);
    }
    this.runtime.clearSelection();
  }

  async renameLayer(layerId: string, name: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { name });
  }

  async duplicateLayer(layerId: string): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const parent = sceneGraph.getParent(layerId as NodeId);
    if (!parent) throw new Error('Layer has no parent');
    const parentId = (parent as { id: NodeId }).id;

    const props = getNodeProps(node);
    const newId = sceneGraph.createNode(props.type as 'GROUP', parentId, -1, {
      name: `${props.name} Copy`,
    });

    sceneGraph.updateNode(newId, {
      x: props.x + 20,
      y: props.y + 20,
    });

    this.runtime.setSelection([newId]);
    return String(newId);
  }

  // =========================================================================
  // Creation Operations
  // =========================================================================

  async createRectangle(options: RectangleOptions): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    const path: VectorPath = {
      windingRule: 'NONZERO',
      commands: [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: options.width, y: 0 },
        { type: 'L', x: options.width, y: options.height },
        { type: 'L', x: 0, y: options.height },
        { type: 'Z' },
      ] as PathCommand[],
    };

    const fills = options.fill
      ? [solidPaint(rgba(options.fill.r, options.fill.g, options.fill.b, options.fill.a))]
      : [solidPaint(rgba(0.831, 0.824, 0.816, 1))];

    const strokes = options.stroke
      ? [solidPaint(rgba(options.stroke.r, options.stroke.g, options.stroke.b, options.stroke.a))]
      : [];

    const nodeId = sceneGraph.createVector(pageId, {
      name: options.name ?? 'Rectangle',
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      vectorPaths: [path],
      fills,
      strokes,
      strokeWeight: options.strokeWidth ?? 0,
    });

    this.runtime.setSelection([nodeId]);
    return String(nodeId);
  }

  async createEllipse(options: EllipseOptions): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    const rx = options.width / 2;
    const ry = options.height / 2;
    const k = 0.5522847498;

    const path: VectorPath = {
      windingRule: 'NONZERO',
      commands: [
        { type: 'M', x: rx, y: 0 },
        { type: 'C', x1: rx + rx * k, y1: 0, x2: options.width, y2: ry - ry * k, x: options.width, y: ry },
        { type: 'C', x1: options.width, y1: ry + ry * k, x2: rx + rx * k, y2: options.height, x: rx, y: options.height },
        { type: 'C', x1: rx - rx * k, y1: options.height, x2: 0, y2: ry + ry * k, x: 0, y: ry },
        { type: 'C', x1: 0, y1: ry - ry * k, x2: rx - rx * k, y2: 0, x: rx, y: 0 },
        { type: 'Z' },
      ] as PathCommand[],
    };

    const fills = options.fill
      ? [solidPaint(rgba(options.fill.r, options.fill.g, options.fill.b, options.fill.a))]
      : [solidPaint(rgba(0.831, 0.824, 0.816, 1))];

    const strokes = options.stroke
      ? [solidPaint(rgba(options.stroke.r, options.stroke.g, options.stroke.b, options.stroke.a))]
      : [];

    const nodeId = sceneGraph.createVector(pageId, {
      name: options.name ?? 'Ellipse',
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      vectorPaths: [path],
      fills,
      strokes,
      strokeWeight: options.strokeWidth ?? 0,
    });

    this.runtime.setSelection([nodeId]);
    return String(nodeId);
  }

  async createText(options: TextOptions): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    const nodeId = sceneGraph.createText(pageId, {
      name: options.name ?? 'Text',
      x: options.x,
      y: options.y,
      characters: options.content,
    });

    // Update fills after creation
    const fills = options.fill
      ? [solidPaint(rgba(options.fill.r, options.fill.g, options.fill.b, options.fill.a))]
      : [solidPaint(rgba(0, 0, 0, 1))];
    sceneGraph.updateNode(nodeId, { fills });

    this.runtime.setSelection([nodeId]);
    return String(nodeId);
  }

  async createFrame(options: FrameOptions): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    const nodeId = sceneGraph.createFrame(pageId, {
      name: options.name ?? 'Frame',
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
    });

    if (options.fill) {
      const fills = [solidPaint(rgba(options.fill.r, options.fill.g, options.fill.b, options.fill.a))];
      sceneGraph.updateNode(nodeId, { fills });
    }

    this.runtime.setSelection([nodeId]);
    return String(nodeId);
  }

  async createLine(options: LineOptions): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    const minX = Math.min(options.startX, options.endX);
    const minY = Math.min(options.startY, options.endY);
    const width = Math.abs(options.endX - options.startX) || 1;
    const height = Math.abs(options.endY - options.startY) || 1;

    const path: VectorPath = {
      windingRule: 'NONZERO',
      commands: [
        { type: 'M', x: options.startX - minX, y: options.startY - minY },
        { type: 'L', x: options.endX - minX, y: options.endY - minY },
      ] as PathCommand[],
    };

    const strokes = options.stroke
      ? [solidPaint(rgba(options.stroke.r, options.stroke.g, options.stroke.b, options.stroke.a))]
      : [solidPaint(rgba(0, 0, 0, 1))];

    const nodeId = sceneGraph.createVector(pageId, {
      name: options.name ?? 'Line',
      x: minX,
      y: minY,
      width,
      height,
      vectorPaths: [path],
      fills: [],
      strokes,
      strokeWeight: options.strokeWidth ?? 2,
    });

    this.runtime.setSelection([nodeId]);
    return String(nodeId);
  }

  // =========================================================================
  // Styling Operations
  // =========================================================================

  async setFillColor(layerId: string, color: ColorValue): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const fills = [solidPaint(rgba(color.r, color.g, color.b, color.a))];
    sceneGraph.updateNode(layerId as NodeId, { fills });
  }

  async setStrokeColor(layerId: string, color: ColorValue): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const strokes = [solidPaint(rgba(color.r, color.g, color.b, color.a))];
    sceneGraph.updateNode(layerId as NodeId, { strokes });
  }

  async setStrokeWidth(layerId: string, width: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { strokeWeight: width });
  }

  async setOpacity(layerId: string, opacity: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { opacity });
  }

  async setCornerRadius(layerId: string, radius: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { cornerRadius: radius });
  }

  async setBlendMode(layerId: string, blendMode: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { blendMode: blendMode as BlendMode });
  }

  async addDropShadow(
    layerId: string,
    options: {
      color?: ColorValue;
      offsetX?: number;
      offsetY?: number;
      radius?: number;
      spread?: number;
    }
  ): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    // Get existing effects or create empty array
    const existingEffects = ((node as unknown as Record<string, unknown>)['effects'] as Effect[]) ?? [];

    // Build dropShadow options, only including defined properties
    const shadowOptions: {
      color?: ReturnType<typeof rgbaColor>;
      offsetX?: number;
      offsetY?: number;
      radius?: number;
      spread?: number;
    } = {};

    if (options.color) {
      shadowOptions.color = rgbaColor(options.color.r, options.color.g, options.color.b, options.color.a);
    }
    if (options.offsetX !== undefined) {
      shadowOptions.offsetX = options.offsetX;
    }
    if (options.offsetY !== undefined) {
      shadowOptions.offsetY = options.offsetY;
    }
    if (options.radius !== undefined) {
      shadowOptions.radius = options.radius;
    }
    if (options.spread !== undefined) {
      shadowOptions.spread = options.spread;
    }

    const shadow = dropShadow(shadowOptions);

    // Add to effects array
    sceneGraph.updateNode(layerId as NodeId, {
      effects: [...existingEffects, shadow],
    });
  }

  async addBlur(layerId: string, radius: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    // Get existing effects or create empty array
    const existingEffects = ((node as unknown as Record<string, unknown>)['effects'] as Effect[]) ?? [];

    // Create blur effect
    const blurEffect: Effect = {
      type: 'BLUR',
      visible: true,
      radius,
    };

    // Add to effects array
    sceneGraph.updateNode(layerId as NodeId, {
      effects: [...existingEffects, blurEffect],
    });
  }

  async removeEffects(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    // Remove all effects by setting to empty array
    sceneGraph.updateNode(layerId as NodeId, {
      effects: [],
    });
  }

  // =========================================================================
  // Typography Operations
  // =========================================================================

  async setFontFamily(layerId: string, fontFamily: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const props = getNodeProps(node);
    if (props.type !== 'TEXT') throw new Error('Layer is not a text node');

    // Get existing text styles and update fontFamily for all ranges
    const nodeData = node as unknown as Record<string, unknown>;
    const existingStyles = (nodeData['textStyles'] as Array<Record<string, unknown>>) ?? [];
    const updatedStyles = existingStyles.map(style => ({
      ...style,
      fontFamily,
    }));

    sceneGraph.updateNode(layerId as NodeId, { textStyles: updatedStyles } as Partial<unknown>);
  }

  async setFontSize(layerId: string, fontSize: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const props = getNodeProps(node);
    if (props.type !== 'TEXT') throw new Error('Layer is not a text node');

    const nodeData = node as unknown as Record<string, unknown>;
    const existingStyles = (nodeData['textStyles'] as Array<Record<string, unknown>>) ?? [];
    const updatedStyles = existingStyles.map(style => ({
      ...style,
      fontSize,
    }));

    sceneGraph.updateNode(layerId as NodeId, { textStyles: updatedStyles } as Partial<unknown>);
  }

  async setFontWeight(layerId: string, fontWeight: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const props = getNodeProps(node);
    if (props.type !== 'TEXT') throw new Error('Layer is not a text node');

    const nodeData = node as unknown as Record<string, unknown>;
    const existingStyles = (nodeData['textStyles'] as Array<Record<string, unknown>>) ?? [];
    const updatedStyles = existingStyles.map(style => ({
      ...style,
      fontWeight,
    }));

    sceneGraph.updateNode(layerId as NodeId, { textStyles: updatedStyles } as Partial<unknown>);
  }

  async setTextAlignment(layerId: string, alignment: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const props = getNodeProps(node);
    if (props.type !== 'TEXT') throw new Error('Layer is not a text node');

    sceneGraph.updateNode(layerId as NodeId, { textAlignHorizontal: alignment } as Partial<unknown>);
  }

  async setLineHeight(layerId: string, lineHeight: number | 'AUTO'): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const props = getNodeProps(node);
    if (props.type !== 'TEXT') throw new Error('Layer is not a text node');

    const nodeData = node as unknown as Record<string, unknown>;
    const existingStyles = (nodeData['textStyles'] as Array<Record<string, unknown>>) ?? [];
    const updatedStyles = existingStyles.map(style => ({
      ...style,
      lineHeight,
    }));

    sceneGraph.updateNode(layerId as NodeId, { textStyles: updatedStyles } as Partial<unknown>);
  }

  async setLetterSpacing(layerId: string, letterSpacing: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const props = getNodeProps(node);
    if (props.type !== 'TEXT') throw new Error('Layer is not a text node');

    const nodeData = node as unknown as Record<string, unknown>;
    const existingStyles = (nodeData['textStyles'] as Array<Record<string, unknown>>) ?? [];
    const updatedStyles = existingStyles.map(style => ({
      ...style,
      letterSpacing,
    }));

    sceneGraph.updateNode(layerId as NodeId, { textStyles: updatedStyles } as Partial<unknown>);
  }

  async setTextContent(layerId: string, content: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const props = getNodeProps(node);
    if (props.type !== 'TEXT') throw new Error('Layer is not a text node');

    // Get existing style from first range (or create default)
    const nodeData = node as unknown as Record<string, unknown>;
    const existingStyles = (nodeData['textStyles'] as Array<Record<string, unknown>>) ?? [];
    const firstStyle = existingStyles[0] ?? {
      fontFamily: 'Inter',
      fontWeight: 400,
      fontSize: 14,
      lineHeight: 'AUTO',
      letterSpacing: 0,
      textDecoration: 'NONE',
      fills: [],
    };

    // Create new style spanning entire content
    const newStyle = {
      ...firstStyle,
      start: 0,
      end: content.length,
    };

    sceneGraph.updateNode(layerId as NodeId, {
      characters: content,
      textStyles: [newStyle],
    } as Partial<unknown>);
  }

  // =========================================================================
  // Layout Operations
  // =========================================================================

  async alignLayers(layerIds: string[], alignment: AlignmentType): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    if (layerIds.length < 2) return;

    const items = layerIds.map((id) => {
      const node = sceneGraph.getNode(id as NodeId);
      const props = node ? getNodeProps(node) : { x: 0, y: 0, width: 0, height: 0 };
      return { id, ...props };
    });

    let targetX: number | null = null;
    let targetY: number | null = null;

    switch (alignment) {
      case 'left':
        targetX = Math.min(...items.map((i) => i.x));
        break;
      case 'center-h': {
        const minX = Math.min(...items.map((i) => i.x));
        const maxX = Math.max(...items.map((i) => i.x + i.width));
        targetX = (minX + maxX) / 2;
        break;
      }
      case 'right':
        targetX = Math.max(...items.map((i) => i.x + i.width));
        break;
      case 'top':
        targetY = Math.min(...items.map((i) => i.y));
        break;
      case 'center-v': {
        const minY = Math.min(...items.map((i) => i.y));
        const maxY = Math.max(...items.map((i) => i.y + i.height));
        targetY = (minY + maxY) / 2;
        break;
      }
      case 'bottom':
        targetY = Math.max(...items.map((i) => i.y + i.height));
        break;
    }

    for (const item of items) {
      const updates: { x?: number; y?: number } = {};

      if (targetX !== null) {
        switch (alignment) {
          case 'left':
            updates.x = targetX;
            break;
          case 'center-h':
            updates.x = targetX - item.width / 2;
            break;
          case 'right':
            updates.x = targetX - item.width;
            break;
        }
      }

      if (targetY !== null) {
        switch (alignment) {
          case 'top':
            updates.y = targetY;
            break;
          case 'center-v':
            updates.y = targetY - item.height / 2;
            break;
          case 'bottom':
            updates.y = targetY - item.height;
            break;
        }
      }

      if (Object.keys(updates).length > 0) {
        sceneGraph.updateNode(item.id as NodeId, updates);
      }
    }
  }

  async distributeLayers(layerIds: string[], distribution: DistributionType): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    if (layerIds.length < 3) return;

    const items = layerIds.map((id) => {
      const node = sceneGraph.getNode(id as NodeId);
      const props = node ? getNodeProps(node) : { x: 0, y: 0, width: 0, height: 0 };
      return { id, ...props };
    });

    if (distribution === 'horizontal') {
      items.sort((a, b) => a.x - b.x);
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const minX = first.x;
      const maxX = last.x + last.width;
      const totalWidth = items.reduce((sum, i) => sum + i.width, 0);
      const gap = (maxX - minX - totalWidth) / (items.length - 1);

      let currentX = minX;
      for (const item of items) {
        sceneGraph.updateNode(item.id as NodeId, { x: currentX });
        currentX += item.width + gap;
      }
    } else {
      items.sort((a, b) => a.y - b.y);
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const minY = first.y;
      const maxY = last.y + last.height;
      const totalHeight = items.reduce((sum, i) => sum + i.height, 0);
      const gap = (maxY - minY - totalHeight) / (items.length - 1);

      let currentY = minY;
      for (const item of items) {
        sceneGraph.updateNode(item.id as NodeId, { y: currentY });
        currentY += item.height + gap;
      }
    }
  }

  async setPosition(layerId: string, x: number, y: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { x, y });
  }

  async setSize(layerId: string, width: number, height: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { width, height });
  }

  async setRotation(layerId: string, degrees: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { rotation: degrees });
  }

  // =========================================================================
  // Transform Operations
  // =========================================================================

  async scaleLayers(
    layerIds: string[],
    factor: number,
    origin: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'center'
  ): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();

    for (const layerId of layerIds) {
      const node = sceneGraph.getNode(layerId as NodeId);
      if (!node) continue;

      const props = getNodeProps(node);
      const newWidth = props.width * factor;
      const newHeight = props.height * factor;

      let newX = props.x;
      let newY = props.y;

      // Calculate new position based on origin
      switch (origin) {
        case 'center':
          newX = props.x - (newWidth - props.width) / 2;
          newY = props.y - (newHeight - props.height) / 2;
          break;
        case 'top-left':
          // Position stays the same
          break;
        case 'top-right':
          newX = props.x - (newWidth - props.width);
          break;
        case 'bottom-left':
          newY = props.y - (newHeight - props.height);
          break;
        case 'bottom-right':
          newX = props.x - (newWidth - props.width);
          newY = props.y - (newHeight - props.height);
          break;
      }

      sceneGraph.updateNode(layerId as NodeId, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
    }
  }

  async moveBy(layerId: string, dx: number, dy: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const props = getNodeProps(node);
    sceneGraph.updateNode(layerId as NodeId, {
      x: props.x + dx,
      y: props.y + dy,
    });
  }

  async flipHorizontal(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    // Get current scaleX, default to 1
    const nodeData = node as unknown as Record<string, unknown>;
    const currentScaleX = (nodeData['scaleX'] as number) ?? 1;

    sceneGraph.updateNode(layerId as NodeId, {
      scaleX: -currentScaleX,
    } as Partial<unknown>);
  }

  async flipVertical(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    // Get current scaleY, default to 1
    const nodeData = node as unknown as Record<string, unknown>;
    const currentScaleY = (nodeData['scaleY'] as number) ?? 1;

    sceneGraph.updateNode(layerId as NodeId, {
      scaleY: -currentScaleY,
    } as Partial<unknown>);
  }

  async distributeHorizontal(layerIds: string[], spacing?: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    if (layerIds.length < 3) return; // Need at least 3 items to distribute

    // Get all items with their bounds
    const items = layerIds.map((id) => {
      const node = sceneGraph.getNode(id as NodeId);
      const props = node ? getNodeProps(node) : { x: 0, y: 0, width: 0, height: 0 };
      return { id, ...props };
    });

    // Sort by x position
    items.sort((a, b) => a.x - b.x);

    if (spacing !== undefined) {
      // Use fixed spacing
      let currentX = items[0]!.x + items[0]!.width;
      for (let i = 1; i < items.length; i++) {
        currentX += spacing;
        sceneGraph.updateNode(items[i]!.id as NodeId, { x: currentX });
        currentX += items[i]!.width;
      }
    } else {
      // Distribute evenly (equal spacing between objects)
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const totalWidth = items.reduce((sum, item) => sum + item.width, 0);
      const totalSpace = last.x + last.width - first.x - totalWidth;
      const gap = totalSpace / (items.length - 1);

      let currentX = first.x + first.width;
      for (let i = 1; i < items.length - 1; i++) {
        currentX += gap;
        sceneGraph.updateNode(items[i]!.id as NodeId, { x: currentX });
        currentX += items[i]!.width;
      }
    }
  }

  async distributeVertical(layerIds: string[], spacing?: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    if (layerIds.length < 3) return; // Need at least 3 items to distribute

    // Get all items with their bounds
    const items = layerIds.map((id) => {
      const node = sceneGraph.getNode(id as NodeId);
      const props = node ? getNodeProps(node) : { x: 0, y: 0, width: 0, height: 0 };
      return { id, ...props };
    });

    // Sort by y position
    items.sort((a, b) => a.y - b.y);

    if (spacing !== undefined) {
      // Use fixed spacing
      let currentY = items[0]!.y + items[0]!.height;
      for (let i = 1; i < items.length; i++) {
        currentY += spacing;
        sceneGraph.updateNode(items[i]!.id as NodeId, { y: currentY });
        currentY += items[i]!.height;
      }
    } else {
      // Distribute evenly (equal spacing between objects)
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const totalHeight = items.reduce((sum, item) => sum + item.height, 0);
      const totalSpace = last.y + last.height - first.y - totalHeight;
      const gap = totalSpace / (items.length - 1);

      let currentY = first.y + first.height;
      for (let i = 1; i < items.length - 1; i++) {
        currentY += gap;
        sceneGraph.updateNode(items[i]!.id as NodeId, { y: currentY });
        currentY += items[i]!.height;
      }
    }
  }

  async tidyUp(layerIds: string[], columns?: number, spacing: number = 10): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    if (layerIds.length === 0) return;

    // Get all items with their bounds
    const items = layerIds.map((id) => {
      const node = sceneGraph.getNode(id as NodeId);
      const props = node ? getNodeProps(node) : { x: 0, y: 0, width: 0, height: 0 };
      return { id, ...props };
    });

    // Auto-calculate columns if not specified (square-ish grid)
    const numColumns = columns ?? Math.ceil(Math.sqrt(items.length));

    // Find max width and height for each column/row
    const colWidths: number[] = [];
    const rowHeights: number[] = [];

    for (let i = 0; i < items.length; i++) {
      const col = i % numColumns;
      const row = Math.floor(i / numColumns);
      colWidths[col] = Math.max(colWidths[col] ?? 0, items[i]!.width);
      rowHeights[row] = Math.max(rowHeights[row] ?? 0, items[i]!.height);
    }

    // Calculate starting position (use first item's position)
    const startX = items[0]!.x;
    const startY = items[0]!.y;

    // Position each item
    for (let i = 0; i < items.length; i++) {
      const col = i % numColumns;
      const row = Math.floor(i / numColumns);

      // Calculate x position
      let x = startX;
      for (let c = 0; c < col; c++) {
        x += colWidths[c]! + spacing;
      }

      // Calculate y position
      let y = startY;
      for (let r = 0; r < row; r++) {
        y += rowHeights[r]! + spacing;
      }

      sceneGraph.updateNode(items[i]!.id as NodeId, { x, y });
    }
  }

  // =========================================================================
  // Query Operations
  // =========================================================================

  async getLayerProperties(layerId: string): Promise<LayerSummary | null> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) return null;

    const props = getNodeProps(node);
    const parent = sceneGraph.getParent(layerId as NodeId);
    const parentId = parent ? String((parent as { id: NodeId }).id) : null;

    return {
      id: props.id,
      name: props.name,
      type: props.type,
      bounds: {
        x: props.x,
        y: props.y,
        width: props.width,
        height: props.height,
      },
      visible: props.visible,
      locked: props.locked,
      parentId,
    };
  }

  async getCanvasState(): Promise<CanvasState> {
    const viewport = this.runtime.getViewport();
    const pageId = this.runtime.getCurrentPageId();

    const selectionIds = this.runtime.getSelection();
    const selection: LayerSummary[] = [];

    for (const id of selectionIds) {
      const props = await this.getLayerProperties(String(id));
      if (props) {
        selection.push(props);
      }
    }

    const sceneGraph = this.runtime.getSceneGraph();
    const allLayerIds = pageId ? this.getAllLayerIds(pageId, sceneGraph) : [];

    return {
      selection,
      viewport: {
        x: viewport?.getOffset().x ?? 0,
        y: viewport?.getOffset().y ?? 0,
        zoom: viewport?.getZoom() ?? 1,
        width: viewport?.getCanvasSize().width ?? 0,
        height: viewport?.getCanvasSize().height ?? 0,
      },
      activePage: pageId ? String(pageId) : '',
      pageCount: this.runtime.getPageIds().length,
      stats: {
        totalLayers: allLayerIds.length,
        selectedCount: selectionIds.length,
      },
    };
  }

  async getAllLayers(): Promise<LayerSummary[]> {
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) return [];

    const sceneGraph = this.runtime.getSceneGraph();
    const layerIds = this.getAllLayerIds(pageId, sceneGraph);
    const layers: LayerSummary[] = [];

    for (const id of layerIds) {
      const props = await this.getLayerProperties(String(id));
      if (props) {
        layers.push(props);
      }
    }

    return layers;
  }

  // =========================================================================
  // Viewport Operations
  // =========================================================================

  async zoomToSelection(): Promise<void> {
    this.runtime.zoomToFit();
  }

  async zoomToFit(): Promise<void> {
    this.runtime.zoomToFit();
  }

  async setZoom(level: number): Promise<void> {
    this.runtime.setZoom(level);
  }

  async getZoom(): Promise<number> {
    return this.runtime.getZoom();
  }

  // =========================================================================
  // Export Operations
  // =========================================================================

  async exportPNG(layerId: string, scale?: number): Promise<Blob> {
    const options = scale !== undefined ? { scale } : undefined;
    return this.runtime.exportPNG(layerId as NodeId, options);
  }

  async exportSVG(layerId: string): Promise<string> {
    return this.runtime.exportSVG(layerId as NodeId);
  }

  async exportToJSON(layerId: string, includeChildren?: boolean): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) {
      throw new Error(`Layer not found: ${layerId}`);
    }

    // Build the JSON structure
    const buildNodeJSON = (nodeId: NodeId, includeDescendants: boolean): Record<string, unknown> => {
      const n = sceneGraph.getNode(nodeId);
      if (!n) return {};

      const result: Record<string, unknown> = { ...n };

      // Include children if requested
      if (includeDescendants) {
        const childIds = sceneGraph.getChildIds(nodeId);
        if (childIds.length > 0) {
          result['children'] = childIds.map(childId =>
            buildNodeJSON(childId, true)
          );
        }
      }

      return result;
    };

    const jsonData = buildNodeJSON(layerId as NodeId, includeChildren !== false);
    return JSON.stringify(jsonData, null, 2);
  }

  async batchExport(
    layerIds: string[],
    format: 'png' | 'jpg' | 'svg' | 'pdf',
    scale?: number
  ): Promise<{ exportedCount: number; files: string[] }> {
    const files: string[] = [];

    for (const layerId of layerIds) {
      try {
        if (format === 'svg') {
          await this.exportSVG(layerId);
          files.push(`${layerId}.svg`);
        } else if (format === 'png' || format === 'jpg') {
          await this.exportPNG(layerId, scale);
          files.push(`${layerId}.${format}`);
        } else if (format === 'pdf') {
          // PDF export not yet implemented - use SVG as fallback
          await this.exportSVG(layerId);
          files.push(`${layerId}.pdf`);
        } else {
          continue;
        }
      } catch (error) {
        console.warn(`Failed to export layer ${layerId}:`, error);
      }
    }

    return { exportedCount: files.length, files };
  }

  // =========================================================================
  // Editing Operations
  // =========================================================================

  // In-memory clipboard for copy/paste operations
  private clipboardData: unknown[] | null = null;

  async undo(): Promise<void> {
    this.runtime.undo();
  }

  async redo(): Promise<void> {
    this.runtime.redo();
  }

  async copyLayers(layerIds: string[]): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    // Deep clone the nodes for the clipboard
    this.clipboardData = layerIds.map(id => {
      const node = sceneGraph.getNode(id as NodeId);
      if (!node) return null;
      return JSON.parse(JSON.stringify(node));
    }).filter(Boolean);
  }

  async paste(): Promise<string[]> {
    if (!this.clipboardData || this.clipboardData.length === 0) {
      return [];
    }

    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) return [];

    const pastedIds: string[] = [];

    for (const nodeData of this.clipboardData) {
      const data = nodeData as Record<string, unknown>;
      const nodeType = (data['type'] as string) ?? 'RECTANGLE';
      const name = (data['name'] as string) ?? 'Pasted';

      // Create a new node of the same type
      const newId = sceneGraph.createNode(nodeType as 'FRAME', pageId, -1, { name });

      // Copy over properties (offset position slightly)
      const updateProps: Record<string, unknown> = {};
      for (const key of Object.keys(data)) {
        if (key !== 'id' && key !== 'type' && key !== 'name') {
          updateProps[key] = data[key];
        }
      }
      updateProps['x'] = ((data['x'] as number) ?? 0) + 10;
      updateProps['y'] = ((data['y'] as number) ?? 0) + 10;

      sceneGraph.updateNode(newId, updateProps as Partial<unknown>);
      pastedIds.push(String(newId));
    }

    // Select the pasted nodes
    this.runtime.setSelection(pastedIds as NodeId[]);
    return pastedIds;
  }

  async pasteHere(x: number, y: number): Promise<string[]> {
    if (!this.clipboardData || this.clipboardData.length === 0) {
      return [];
    }

    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) return [];

    // Calculate the bounding box of copied items to center at (x, y)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const nodeData of this.clipboardData) {
      const data = nodeData as Record<string, unknown>;
      const nx = (data['x'] as number) ?? 0;
      const ny = (data['y'] as number) ?? 0;
      const nw = (data['width'] as number) ?? 0;
      const nh = (data['height'] as number) ?? 0;
      minX = Math.min(minX, nx);
      minY = Math.min(minY, ny);
      maxX = Math.max(maxX, nx + nw);
      maxY = Math.max(maxY, ny + nh);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const offsetX = x - centerX;
    const offsetY = y - centerY;

    const pastedIds: string[] = [];

    for (const nodeData of this.clipboardData) {
      const data = nodeData as Record<string, unknown>;
      const nodeType = (data['type'] as string) ?? 'RECTANGLE';
      const name = (data['name'] as string) ?? 'Pasted';

      // Create a new node of the same type
      const newId = sceneGraph.createNode(nodeType as 'FRAME', pageId, -1, { name });

      // Copy over properties with offset
      const updateProps: Record<string, unknown> = {};
      for (const key of Object.keys(data)) {
        if (key !== 'id' && key !== 'type' && key !== 'name') {
          updateProps[key] = data[key];
        }
      }
      updateProps['x'] = ((data['x'] as number) ?? 0) + offsetX;
      updateProps['y'] = ((data['y'] as number) ?? 0) + offsetY;

      sceneGraph.updateNode(newId, updateProps as Partial<unknown>);
      pastedIds.push(String(newId));
    }

    // Select the pasted nodes
    this.runtime.setSelection(pastedIds as NodeId[]);
    return pastedIds;
  }

  // =========================================================================
  // Code Generation Operations
  // =========================================================================

  async generateCSS(layerId: string, options?: { includeLayout?: boolean; useVariables?: boolean }): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const cssGenerator = createCSSGenerator(sceneGraph);
    const result = cssGenerator.generate(layerId as NodeId, {
      useVariables: options?.useVariables ?? false,
    });
    return result.css;
  }

  async generateTailwind(layerId: string): Promise<{ classes: string; html: string }> {
    const sceneGraph = this.runtime.getSceneGraph();
    const htmlExporter = createHTMLExporter(sceneGraph);
    const result = htmlExporter.export([layerId as NodeId]);

    // Return Tailwind classes and HTML
    return {
      classes: result.classes.join(' '),
      html: result.html,
    };
  }

  async generateSwift(layerId: string, _componentName?: string): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const iosGenerator = createIOSCodeGenerator(sceneGraph);
    // Component name is handled via prefix in options
    const result = iosGenerator.generate(layerId as NodeId, {});
    return result.code;
  }

  async generateAndroid(layerId: string, _componentName?: string): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const androidGenerator = createAndroidCodeGenerator(sceneGraph);
    // Component name is handled via prefix in options
    const result = androidGenerator.generate(layerId as NodeId, {});
    return result.code;
  }

  async generateReact(
    layerId: string,
    _componentName?: string,
    _styleFormat?: 'inline' | 'css' | 'styled-components' | 'tailwind'
  ): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const reactGenerator = createReactComponentGenerator(sceneGraph);
    const result = reactGenerator.generate([layerId as NodeId]);
    return result.component;
  }

  async generateHTML(layerId: string, _inlineStyles?: boolean): Promise<{ html: string; css: string }> {
    const sceneGraph = this.runtime.getSceneGraph();
    const htmlExporter = createHTMLExporter(sceneGraph);
    const result = htmlExporter.export([layerId as NodeId]);
    return { html: result.html, css: result.css };
  }

  // =========================================================================
  // Component Operations
  // =========================================================================

  async createComponent(layerId: string, name?: string, _description?: string): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const sourceNode = sceneGraph.getNode(layerId as NodeId);
    if (!sourceNode) {
      throw new Error(`Layer not found: ${layerId}`);
    }

    const parentId = sourceNode.parentId;
    if (!parentId) {
      throw new Error('Cannot convert root node to component');
    }

    // Create a component node with the same properties
    const componentId = sceneGraph.createNode('COMPONENT', parentId, -1, {
      name: name ?? sourceNode.name,
      ...this.extractNodeProperties(sourceNode),
    });

    // Copy children to the component
    this.copyChildrenToNode(sceneGraph, layerId as NodeId, componentId);

    // Delete the original node
    sceneGraph.deleteNode(layerId as NodeId);

    return String(componentId);
  }

  async createComponentSet(componentIds: string[], name?: string): Promise<string> {
    if (componentIds.length === 0) {
      throw new Error('At least one component ID is required');
    }

    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    // Create a frame to hold the component set
    const setId = sceneGraph.createNode('FRAME', pageId, -1, {
      name: name ?? 'Component Set',
    });

    // Move components into the set
    for (const componentId of componentIds) {
      const node = sceneGraph.getNode(componentId as NodeId);
      if (node && node.type === 'COMPONENT') {
        sceneGraph.moveNode(componentId as NodeId, setId, -1);
      }
    }

    return String(setId);
  }

  async createInstance(componentId: string, x?: number, y?: number): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const component = sceneGraph.getNode(componentId as NodeId);
    if (!component || component.type !== 'COMPONENT') {
      throw new Error(`Component not found: ${componentId}`);
    }

    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    // Create instance with component reference
    const instanceId = sceneGraph.createNode('INSTANCE', pageId, -1, {
      name: `${component.name} Instance`,
      componentId: componentId as NodeId,
    } as Parameters<typeof sceneGraph.createNode>[3]);

    // Set position if provided
    if (x !== undefined || y !== undefined) {
      sceneGraph.updateNode(instanceId, {
        x: x ?? 0,
        y: y ?? 0,
      } as Partial<unknown>);
    }

    return String(instanceId);
  }

  async detachInstance(instanceId: string): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const instance = sceneGraph.getNode(instanceId as NodeId);
    if (!instance || instance.type !== 'INSTANCE') {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const componentId = (instance as { componentId: NodeId }).componentId;
    const component = sceneGraph.getNode(componentId);
    if (!component) {
      throw new Error('Component not found for instance');
    }

    const parentId = instance.parentId;
    if (!parentId) throw new Error('Instance has no parent');

    // Create a frame to replace the instance
    const frameId = sceneGraph.createNode('FRAME', parentId, -1, {
      name: instance.name.replace(' Instance', ''),
      ...this.extractNodeProperties(instance),
    });

    // Copy component children to the frame
    this.copyChildrenToNode(sceneGraph, componentId, frameId);

    // Delete the instance
    sceneGraph.deleteNode(instanceId as NodeId);

    return String(frameId);
  }

  async resetInstance(instanceId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const instance = sceneGraph.getNode(instanceId as NodeId);
    if (!instance || instance.type !== 'INSTANCE') {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    // Clear all overrides
    sceneGraph.updateNode(instanceId as NodeId, { overrides: [] });
  }

  async pushOverridesToMain(instanceId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const instance = sceneGraph.getNode(instanceId as NodeId);
    if (!instance || instance.type !== 'INSTANCE') {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const componentId = (instance as unknown as { componentId: NodeId }).componentId;
    const overrides = (instance as unknown as { overrides: readonly unknown[] }).overrides ?? [];

    // Apply overrides to the main component
    // This is a simplified implementation - real implementation would handle nested paths
    for (const override of overrides) {
      const { path, value } = override as { path: string[]; value: unknown };
      if (path.length === 1) {
        sceneGraph.updateNode(componentId, { [path[0]!]: value } as Partial<unknown>);
      }
    }

    // Clear instance overrides
    sceneGraph.updateNode(instanceId as NodeId, { overrides: [] } as Partial<unknown>);
  }

  async swapComponent(instanceId: string, newComponentId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const instance = sceneGraph.getNode(instanceId as NodeId);
    if (!instance || instance.type !== 'INSTANCE') {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const newComponent = sceneGraph.getNode(newComponentId as NodeId);
    if (!newComponent || newComponent.type !== 'COMPONENT') {
      throw new Error(`Component not found: ${newComponentId}`);
    }

    // Update the instance to point to the new component
    sceneGraph.updateNode(instanceId as NodeId, {
      componentId: newComponentId as NodeId,
      overrides: [], // Clear overrides when swapping
    });
  }

  async goToMainComponent(instanceId: string): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const instance = sceneGraph.getNode(instanceId as NodeId);
    if (!instance || instance.type !== 'INSTANCE') {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const componentId = (instance as { componentId: NodeId }).componentId;

    // Select the component
    this.runtime.setSelection([componentId]);

    // Zoom to the component
    await this.zoomToSelection();

    return String(componentId);
  }

  async listComponentInstances(componentId: string): Promise<{ id: string; name: string }[]> {
    const sceneGraph = this.runtime.getSceneGraph();
    const component = sceneGraph.getNode(componentId as NodeId);
    if (!component || component.type !== 'COMPONENT') {
      throw new Error(`Component not found: ${componentId}`);
    }

    const instances: { id: string; name: string }[] = [];
    const doc = sceneGraph.getDocument();
    if (!doc) return instances;

    // Find all instances that reference this component
    const findInstances = (nodeId: NodeId) => {
      const node = sceneGraph.getNode(nodeId);
      if (!node) return;

      if (node.type === 'INSTANCE') {
        const instanceComponentId = (node as unknown as { componentId: NodeId }).componentId;
        if (String(instanceComponentId) === componentId) {
          instances.push({ id: String(nodeId), name: node.name });
        }
      }

      // Recurse into children
      const childIds = sceneGraph.getChildIds(nodeId);
      for (const childId of childIds) {
        findInstances(childId);
      }
    };

    // Search all pages
    const pageIds = sceneGraph.getChildIds(doc.id);
    for (const pageId of pageIds) {
      findInstances(pageId);
    }

    return instances;
  }

  async addComponentProperty(
    componentId: string,
    propertyName: string,
    _propertyType: string,
    _defaultValue?: string
  ): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const component = sceneGraph.getNode(componentId as NodeId);
    if (!component || component.type !== 'COMPONENT') {
      throw new Error(`Component not found: ${componentId}`);
    }

    // Get existing properties or initialize
    const componentData = component as unknown as Record<string, unknown>;
    const existingProps = (componentData['componentPropertyDefinitions'] as Record<string, unknown>) ?? {};

    // Add the new property
    const newProps = {
      ...existingProps,
      [propertyName]: {
        type: _propertyType,
        defaultValue: _defaultValue,
      },
    };

    sceneGraph.updateNode(componentId as NodeId, {
      componentPropertyDefinitions: newProps,
    } as Partial<unknown>);
  }

  async setComponentDescription(componentId: string, description: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const component = sceneGraph.getNode(componentId as NodeId);
    if (!component || component.type !== 'COMPONENT') {
      throw new Error(`Component not found: ${componentId}`);
    }

    sceneGraph.updateNode(componentId as NodeId, { description } as Partial<unknown>);
  }

  private extractNodeProperties(node: unknown): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    const n = node as Record<string, unknown>;

    // Copy common properties
    const propertiesToCopy = ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'fills', 'strokes', 'effects', 'blendMode', 'cornerRadius', 'visible', 'locked'];
    for (const prop of propertiesToCopy) {
      if (prop in n) {
        props[prop] = n[prop];
      }
    }

    return props;
  }

  private copyChildrenToNode(
    sceneGraph: ReturnType<DesignLibreRuntime['getSceneGraph']>,
    sourceId: NodeId,
    targetId: NodeId
  ): void {
    const childIds = sceneGraph.getChildIds(sourceId);
    for (const childId of childIds) {
      const child = sceneGraph.getNode(childId);
      if (!child) continue;

      // Create a copy of the child in the target
      const newChildId = sceneGraph.createNode(child.type as 'FRAME', targetId, -1, {
        name: child.name,
        ...this.extractNodeProperties(child),
      });

      // Recursively copy grandchildren
      this.copyChildrenToNode(sceneGraph, childId, newChildId);
    }
  }

  // =========================================================================
  // Style Operations
  // =========================================================================

  async createColorStyle(name: string, color: ColorValue, description?: string): Promise<string> {
    const styleManager = this.runtime.getStyleManager();
    const rgbaColor = { r: color.r, g: color.g, b: color.b, a: color.a };
    const style = styleManager.createColorStyle(name, rgbaColor);

    // Update description if provided
    if (description) {
      styleManager.updateStyle(style.id, { description });
    }

    return style.id;
  }

  async createTextStyle(
    name: string,
    fontFamily: string,
    fontSize: number,
    fontWeight?: string,
    lineHeight?: number,
    letterSpacing?: number
  ): Promise<string> {
    const styleManager = this.runtime.getStyleManager();
    const style = styleManager.createTextStyle(name, {
      fontFamily,
      fontSize,
      fontWeight: fontWeight ? parseInt(fontWeight, 10) : 400,
      lineHeight: lineHeight ?? 'AUTO',
      letterSpacing: letterSpacing ?? 0,
    });
    return style.id;
  }

  async createEffectStyle(name: string, effects: unknown[]): Promise<string> {
    const styleManager = this.runtime.getStyleManager();
    // Cast effects to the expected type
    const style = styleManager.createEffectStyle(name, effects as Parameters<typeof styleManager.createEffectStyle>[1]);
    return style.id;
  }

  async applyStyle(styleId: string, layerIds: string[]): Promise<void> {
    const styleManager = this.runtime.getStyleManager();
    const style = styleManager.getStyle(styleId);
    if (!style) {
      throw new Error(`Style not found: ${styleId}`);
    }

    const sceneGraph = this.runtime.getSceneGraph();

    for (const layerId of layerIds) {
      const node = sceneGraph.getNode(layerId as NodeId);
      if (!node) continue;

      // Apply style based on its type
      if (style.type === 'COLOR') {
        const color = (style as { color: { r: number; g: number; b: number; a: number } }).color;
        const fills = [solidPaint(rgba(color.r, color.g, color.b, color.a))];
        sceneGraph.updateNode(layerId as NodeId, { fills });
      } else if (style.type === 'TEXT') {
        const textStyle = style as {
          fontFamily: string;
          fontSize: number;
          fontWeight: number;
          lineHeight: number | 'AUTO';
          letterSpacing: number;
        };
        // Get existing textStyles and update them
        const nodeData = node as unknown as Record<string, unknown>;
        const existingStyles = (nodeData['textStyles'] as Array<Record<string, unknown>>) ?? [];
        const updatedStyles = existingStyles.map(s => ({
          ...s,
          fontFamily: textStyle.fontFamily,
          fontSize: textStyle.fontSize,
          fontWeight: textStyle.fontWeight,
          lineHeight: textStyle.lineHeight,
          letterSpacing: textStyle.letterSpacing,
        }));
        sceneGraph.updateNode(layerId as NodeId, { textStyles: updatedStyles } as Partial<unknown>);
      } else if (style.type === 'EFFECT') {
        const effectStyle = style as { effects: readonly unknown[] };
        sceneGraph.updateNode(layerId as NodeId, { effects: [...effectStyle.effects] });
      }

      // Store the style reference on the node
      const nodeData = node as unknown as Record<string, unknown>;
      const existingRefs = (nodeData['styleReferences'] as Record<string, string>) ?? {};
      existingRefs[style.type.toLowerCase()] = styleId;
      sceneGraph.updateNode(layerId as NodeId, { styleReferences: existingRefs } as Partial<unknown>);
    }
  }

  async detachStyle(
    layerIds: string[],
    styleType?: 'fill' | 'stroke' | 'text' | 'effect' | 'all'
  ): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();

    for (const layerId of layerIds) {
      const node = sceneGraph.getNode(layerId as NodeId);
      if (!node) continue;

      const nodeData = node as unknown as Record<string, unknown>;
      const existingRefs = (nodeData['styleReferences'] as Record<string, string>) ?? {};

      if (styleType === 'all' || !styleType) {
        // Remove all style references
        sceneGraph.updateNode(layerId as NodeId, { styleReferences: {} } as Partial<unknown>);
      } else {
        // Remove specific style reference
        const typeKey = styleType === 'fill' ? 'color' : styleType;
        delete existingRefs[typeKey];
        sceneGraph.updateNode(layerId as NodeId, { styleReferences: existingRefs } as Partial<unknown>);
      }
    }
  }

  async listLocalStyles(
    styleType?: 'color' | 'text' | 'effect' | 'all'
  ): Promise<{ id: string; name: string; type: string }[]> {
    const styleManager = this.runtime.getStyleManager();
    let styles;

    if (!styleType || styleType === 'all') {
      styles = styleManager.getAllStyles();
    } else {
      const typeMap: Record<string, 'COLOR' | 'TEXT' | 'EFFECT'> = {
        color: 'COLOR',
        text: 'TEXT',
        effect: 'EFFECT',
      };
      styles = styleManager.getStylesByType(typeMap[styleType]!);
    }

    return styles.map(style => ({
      id: style.id,
      name: style.name,
      type: style.type,
    }));
  }

  async findUnusedStyles(): Promise<{ id: string; name: string; type: string }[]> {
    const styleManager = this.runtime.getStyleManager();
    const sceneGraph = this.runtime.getSceneGraph();
    const allStyles = styleManager.getAllStyles();
    const usedStyleIds = new Set<string>();

    // Find all style references in the document
    const doc = sceneGraph.getDocument();
    if (doc) {
      const findStyleRefs = (nodeId: NodeId) => {
        const node = sceneGraph.getNode(nodeId);
        if (!node) return;

        const nodeData = node as unknown as Record<string, unknown>;
        const refs = nodeData['styleReferences'] as Record<string, string> | undefined;
        if (refs) {
          for (const styleId of Object.values(refs)) {
            usedStyleIds.add(styleId);
          }
        }

        // Recurse into children
        const childIds = sceneGraph.getChildIds(nodeId);
        for (const childId of childIds) {
          findStyleRefs(childId);
        }
      };

      // Search all pages
      const pageIds = sceneGraph.getChildIds(doc.id);
      for (const pageId of pageIds) {
        findStyleRefs(pageId);
      }
    }

    // Return styles that aren't used
    return allStyles
      .filter(style => !usedStyleIds.has(style.id))
      .map(style => ({
        id: style.id,
        name: style.name,
        type: style.type,
      }));
  }

  // =========================================================================
  // Fill & Stroke Operations
  // =========================================================================

  // Style clipboard for copy/paste style operations
  private styleClipboard: {
    fills?: Paint[];
    strokes?: Paint[];
    strokeWeight?: number;
    effects?: Effect[];
    opacity?: number;
    cornerRadius?: number;
  } | null = null;

  async setFillGradient(
    layerId: string,
    type: 'linear' | 'radial' | 'angular' | 'diamond',
    stops: Array<{ position: number; color: ColorValue }>,
    angle?: number
  ): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    // Convert color stops
    const gradientStops: GradientStop[] = stops.map(stop =>
      gradientStop(stop.position, rgba(stop.color.r, stop.color.g, stop.color.b, stop.color.a))
    );

    // Calculate transform matrix for angle (for linear gradients)
    let transform;
    if (angle !== undefined && type === 'linear') {
      // Convert angle to radians and create rotation matrix
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      transform = [cos, sin, -sin, cos, 0, 0] as [number, number, number, number, number, number];
    }

    // Create the appropriate gradient paint
    let fill: Paint;
    if (type === 'linear') {
      fill = linearGradientPaint(gradientStops, transform);
    } else if (type === 'radial') {
      fill = radialGradientPaint(gradientStops);
    } else {
      // Angular and diamond gradients are not directly supported, use linear as fallback
      fill = linearGradientPaint(gradientStops, transform);
    }

    sceneGraph.updateNode(layerId as NodeId, { fills: [fill] });
  }

  async removeFill(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { fills: [] });
  }

  async removeStroke(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(layerId as NodeId, { strokes: [], strokeWeight: 0 });
  }

  async swapFillStroke(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const nodeData = node as unknown as Record<string, unknown>;
    const currentFills = (nodeData['fills'] as Paint[]) ?? [];
    const currentStrokes = (nodeData['strokes'] as Paint[]) ?? [];

    // Swap fills and strokes
    sceneGraph.updateNode(layerId as NodeId, {
      fills: currentStrokes,
      strokes: currentFills,
    });
  }

  async copyStyle(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const nodeData = node as unknown as Record<string, unknown>;

    // Store style properties in clipboard
    this.styleClipboard = {
      fills: nodeData['fills'] ? JSON.parse(JSON.stringify(nodeData['fills'])) : undefined,
      strokes: nodeData['strokes'] ? JSON.parse(JSON.stringify(nodeData['strokes'])) : undefined,
      strokeWeight: nodeData['strokeWeight'] as number | undefined,
      effects: nodeData['effects'] ? JSON.parse(JSON.stringify(nodeData['effects'])) : undefined,
      opacity: nodeData['opacity'] as number | undefined,
      cornerRadius: nodeData['cornerRadius'] as number | undefined,
    };
  }

  async pasteStyle(layerIds: string[]): Promise<void> {
    if (!this.styleClipboard) {
      throw new Error('No style copied. Use copy_style first.');
    }

    const sceneGraph = this.runtime.getSceneGraph();

    for (const layerId of layerIds) {
      const node = sceneGraph.getNode(layerId as NodeId);
      if (!node) continue;

      const updates: Record<string, unknown> = {};

      if (this.styleClipboard.fills !== undefined) {
        updates['fills'] = this.styleClipboard.fills;
      }
      if (this.styleClipboard.strokes !== undefined) {
        updates['strokes'] = this.styleClipboard.strokes;
      }
      if (this.styleClipboard.strokeWeight !== undefined) {
        updates['strokeWeight'] = this.styleClipboard.strokeWeight;
      }
      if (this.styleClipboard.effects !== undefined) {
        updates['effects'] = this.styleClipboard.effects;
      }
      if (this.styleClipboard.opacity !== undefined) {
        updates['opacity'] = this.styleClipboard.opacity;
      }
      if (this.styleClipboard.cornerRadius !== undefined) {
        updates['cornerRadius'] = this.styleClipboard.cornerRadius;
      }

      if (Object.keys(updates).length > 0) {
        sceneGraph.updateNode(layerId as NodeId, updates as Partial<unknown>);
      }
    }
  }

  // =========================================================================
  // Prototyping Operations
  // =========================================================================

  async addInteraction(
    layerId: string,
    trigger: 'on_click' | 'on_hover' | 'on_press' | 'on_drag' | 'after_delay' | 'mouse_enter' | 'mouse_leave',
    action: 'navigate' | 'open_overlay' | 'close_overlay' | 'back' | 'scroll_to' | 'open_url',
    destinationId?: string
  ): Promise<string> {
    const interactionManager = this.runtime.getInteractionManager?.();
    if (!interactionManager) {
      throw new Error('Interaction manager not available');
    }

    // Map trigger types
    const triggerTypeMap: Record<string, string> = {
      'on_click': 'ON_CLICK',
      'on_hover': 'ON_HOVER',
      'on_press': 'ON_PRESS',
      'on_drag': 'ON_DRAG',
      'after_delay': 'AFTER_TIMEOUT',
      'mouse_enter': 'MOUSE_ENTER',
      'mouse_leave': 'MOUSE_LEAVE',
    };

    // Map action types
    const actionTypeMap: Record<string, string> = {
      'navigate': 'NAVIGATE',
      'open_overlay': 'OPEN_OVERLAY',
      'close_overlay': 'CLOSE_OVERLAY',
      'back': 'BACK',
      'scroll_to': 'SCROLL_TO',
      'open_url': 'OPEN_URL',
    };

    const id = `interaction_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const interaction = {
      id,
      triggerNodeId: layerId,
      trigger: { type: triggerTypeMap[trigger] ?? 'ON_CLICK' },
      actions: [{
        type: actionTypeMap[action] ?? 'NAVIGATE',
        destinationId: destinationId ?? '',
        transition: {
          type: 'DISSOLVE',
          duration: 300,
          easing: 'EASE_OUT',
        },
      }],
    };

    interactionManager.addInteraction(interaction as Parameters<typeof interactionManager.addInteraction>[0]);
    return id;
  }

  async removeInteractions(layerId: string): Promise<void> {
    const interactionManager = this.runtime.getInteractionManager?.();
    if (!interactionManager) {
      throw new Error('Interaction manager not available');
    }

    // Get all interactions for this node and remove them
    const interactions = interactionManager.getInteractionsForNode(layerId as NodeId);
    for (const interaction of interactions) {
      interactionManager.removeInteraction(interaction.id);
    }
  }

  async setTransition(
    layerId: string,
    transitionType: 'instant' | 'dissolve' | 'smart_animate' | 'move_in' | 'move_out' | 'push' | 'slide_in' | 'slide_out',
    duration?: number,
    easing?: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'ease_in_back' | 'ease_out_back' | 'spring'
  ): Promise<void> {
    const interactionManager = this.runtime.getInteractionManager?.();
    if (!interactionManager) {
      throw new Error('Interaction manager not available');
    }

    // Map transition types
    const transitionTypeMap: Record<string, string> = {
      'instant': 'INSTANT',
      'dissolve': 'DISSOLVE',
      'smart_animate': 'SMART_ANIMATE',
      'move_in': 'MOVE_IN',
      'move_out': 'MOVE_OUT',
      'push': 'PUSH',
      'slide_in': 'SLIDE_IN',
      'slide_out': 'SLIDE_OUT',
    };

    // Map easing types
    const easingTypeMap: Record<string, string> = {
      'linear': 'LINEAR',
      'ease_in': 'EASE_IN',
      'ease_out': 'EASE_OUT',
      'ease_in_out': 'EASE_IN_OUT',
      'ease_in_back': 'EASE_IN_BACK',
      'ease_out_back': 'EASE_OUT_BACK',
      'spring': 'SPRING',
    };

    // Get interactions for this node and update their transitions
    const interactions = interactionManager.getInteractionsForNode(layerId as NodeId);
    for (const interaction of interactions) {
      // Update each action's transition
      const updatedActions = interaction.actions.map(action => ({
        ...action,
        transition: {
          ...action.transition,
          type: transitionTypeMap[transitionType] ?? 'DISSOLVE',
          duration: duration ?? action.transition.duration ?? 300,
          easing: easing ? (easingTypeMap[easing] ?? 'EASE_OUT') : action.transition.easing,
        },
      }));

      interactionManager.updateInteraction(interaction.id, { actions: updatedActions });
    }
  }

  async listAllInteractions(pageId?: string): Promise<{ interactions: unknown[]; count: number }> {
    const interactionManager = this.runtime.getInteractionManager?.();
    if (!interactionManager) {
      return { interactions: [], count: 0 };
    }

    let interactions = interactionManager.getAllInteractions();

    // Filter by page if specified
    if (pageId) {
      const sceneGraph = this.runtime.getSceneGraph();
      const pageChildIds = new Set(this.getAllLayerIds(pageId as NodeId, sceneGraph).map(String));

      interactions = interactions.filter(i => pageChildIds.has(i.triggerNodeId));
    }

    return {
      interactions,
      count: interactions.length,
    };
  }

  async setStartingFrame(frameId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(frameId as NodeId);
    if (!node) throw new Error('Frame not found');

    // Mark this frame as a starting point for prototyping
    // This is typically stored on the page or document level
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    // Store starting frame ID on the page
    sceneGraph.updateNode(pageId, {
      prototypeStartingFrameId: frameId,
    } as Partial<unknown>);
  }

  async setDeviceFrame(device: 'iphone_14' | 'iphone_14_pro' | 'iphone_se' | 'android_small' | 'android_large' | 'ipad' | 'desktop' | 'none'): Promise<void> {
    // Store device frame preference on the document
    const sceneGraph = this.runtime.getSceneGraph();
    const doc = sceneGraph.getDocument();
    if (!doc) throw new Error('No document');

    sceneGraph.updateNode(doc.id, {
      prototypeDeviceFrame: device,
    } as Partial<unknown>);
  }

  async previewPrototype(frameId?: string): Promise<void> {
    // Get starting frame
    let startFrameId = frameId;

    if (!startFrameId) {
      // Try to get from page settings
      const pageId = this.runtime.getCurrentPageId();
      if (pageId) {
        const sceneGraph = this.runtime.getSceneGraph();
        const page = sceneGraph.getNode(pageId);
        if (page) {
          const pageData = page as unknown as Record<string, unknown>;
          startFrameId = pageData['prototypeStartingFrameId'] as string | undefined;
        }
      }

      // If still no frame, use first frame on page
      if (!startFrameId && pageId) {
        const sceneGraph = this.runtime.getSceneGraph();
        const childIds = sceneGraph.getChildIds(pageId);
        for (const childId of childIds) {
          const node = sceneGraph.getNode(childId);
          if (node && node.type === 'FRAME') {
            startFrameId = String(childId);
            break;
          }
        }
      }
    }

    if (!startFrameId) {
      throw new Error('No frame available to preview');
    }

    // Emit event to trigger preview mode
    this.runtime.emit('prototype:preview', { frameId: startFrameId });
  }

  // =========================================================================
  // Auto-Layout Operations
  // =========================================================================

  async addAutoLayout(
    layerId: string,
    direction: 'horizontal' | 'vertical' = 'horizontal',
    gap: number = 10,
    padding: number = 10
  ): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const props = getNodeProps(node);
    if (props.type !== 'FRAME') throw new Error('Auto layout can only be added to frames');

    // Set auto-layout properties
    sceneGraph.updateNode(layerId as NodeId, {
      layoutMode: direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO',
      paddingTop: padding,
      paddingRight: padding,
      paddingBottom: padding,
      paddingLeft: padding,
      itemSpacing: gap,
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'MIN',
    } as Partial<unknown>);
  }

  async removeAutoLayout(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    // Remove auto-layout by setting layoutMode to NONE
    sceneGraph.updateNode(layerId as NodeId, {
      layoutMode: 'NONE',
    } as Partial<unknown>);
  }

  async setLayoutDirection(layerId: string, direction: 'horizontal' | 'vertical'): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    sceneGraph.updateNode(layerId as NodeId, {
      layoutMode: direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL',
    } as Partial<unknown>);
  }

  async setLayoutGap(layerId: string, gap: number): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    sceneGraph.updateNode(layerId as NodeId, {
      itemSpacing: gap,
    } as Partial<unknown>);
  }

  async setLayoutPadding(
    layerId: string,
    padding: { top?: number; right?: number; bottom?: number; left?: number; all?: number }
  ): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const updates: Record<string, number> = {};

    if (padding.all !== undefined) {
      updates['paddingTop'] = padding.all;
      updates['paddingRight'] = padding.all;
      updates['paddingBottom'] = padding.all;
      updates['paddingLeft'] = padding.all;
    } else {
      if (padding.top !== undefined) updates['paddingTop'] = padding.top;
      if (padding.right !== undefined) updates['paddingRight'] = padding.right;
      if (padding.bottom !== undefined) updates['paddingBottom'] = padding.bottom;
      if (padding.left !== undefined) updates['paddingLeft'] = padding.left;
    }

    if (Object.keys(updates).length > 0) {
      sceneGraph.updateNode(layerId as NodeId, updates as Partial<unknown>);
    }
  }

  // =========================================================================
  // Variable Operations
  // =========================================================================

  async createVariable(
    name: string,
    type: 'boolean' | 'number' | 'string' | 'color',
    defaultValue: boolean | number | string,
    options?: { group?: string; description?: string; scope?: 'document' | 'page' | 'component' }
  ): Promise<string> {
    const variableManager = this.runtime.getVariableManager?.();
    if (!variableManager) {
      throw new Error('Variable manager not available');
    }

    // Generate a unique ID
    const id = `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Create the variable definition
    const definition = {
      id,
      name,
      type,
      defaultValue,
      scope: options?.scope ?? 'document',
      description: options?.description,
      group: options?.group,
    };

    variableManager.defineVariable(definition as Parameters<typeof variableManager.defineVariable>[0]);
    return id;
  }

  async setVariableValue(variableId: string, value: boolean | number | string): Promise<void> {
    const variableManager = this.runtime.getVariableManager?.();
    if (!variableManager) {
      throw new Error('Variable manager not available');
    }

    variableManager.setValue(variableId, value);
  }

  async bindToVariable(
    layerId: string,
    propertyName: string,
    variableId: string
  ): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    // Get existing variable bindings or initialize
    const nodeData = node as unknown as Record<string, unknown>;
    const existingBindings = (nodeData['variableBindings'] as Record<string, string>) ?? {};

    // Add the new binding
    existingBindings[propertyName] = variableId;

    sceneGraph.updateNode(layerId as NodeId, {
      variableBindings: existingBindings,
    } as Partial<unknown>);
  }

  async listVariables(options?: {
    type?: 'boolean' | 'number' | 'string' | 'color' | 'all';
    group?: string;
  }): Promise<Array<{
    id: string;
    name: string;
    type: string;
    value: boolean | number | string;
    defaultValue: boolean | number | string;
    group?: string;
  }>> {
    const variableManager = this.runtime.getVariableManager?.();
    if (!variableManager) {
      return [];
    }

    let definitions = variableManager.getAllDefinitions();

    // Filter by type if specified
    if (options?.type && options.type !== 'all') {
      definitions = definitions.filter(d => d.type === options.type);
    }

    // Filter by group if specified
    if (options?.group) {
      definitions = definitions.filter(d => d.group === options.group);
    }

    // Map to result format with current values
    return definitions.map(def => ({
      id: def.id,
      name: def.name,
      type: def.type,
      value: variableManager.getValue(def.id) ?? def.defaultValue,
      defaultValue: def.defaultValue,
      group: def.group,
    }));
  }

  async switchVariableMode(modeId: string): Promise<void> {
    // Variable modes are not yet fully implemented in the VariableManager
    // For now, we'll store the current mode on the document
    const sceneGraph = this.runtime.getSceneGraph();
    const doc = sceneGraph.getDocument();
    if (!doc) throw new Error('No document');

    sceneGraph.updateNode(doc.id, {
      currentVariableMode: modeId,
    } as Partial<unknown>);

    // Emit event for mode change
    this.runtime.emit('variable:modeChanged' as Parameters<typeof this.runtime.emit>[0], { modeId });
  }

  // =========================================================================
  // AI-Powered Operations
  // =========================================================================

  async generateImage(
    prompt: string,
    options?: {
      width?: number;
      height?: number;
      style?: 'realistic' | 'artistic' | 'illustration' | 'icon';
    }
  ): Promise<{ imageId: string; url?: string }> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    // Create a placeholder image node
    const width = options?.width ?? 512;
    const height = options?.height ?? 512;

    const imageId = sceneGraph.createNode('RECTANGLE', pageId, -1, {
      name: `AI Generated: ${prompt.slice(0, 30)}...`,
      width,
      height,
      x: 0,
      y: 0,
    });

    // Store the generation prompt as metadata for future processing
    sceneGraph.updateNode(imageId, {
      aiGenerationPrompt: prompt,
      aiGenerationStyle: options?.style ?? 'illustration',
      aiGenerationStatus: 'pending',
    } as Partial<unknown>);

    // Emit event to trigger actual generation (can be handled by AI service)
    this.runtime.emit('ai:generateImage' as Parameters<typeof this.runtime.emit>[0], {
      imageId: String(imageId),
      prompt,
      width,
      height,
      style: options?.style,
    });

    return { imageId: String(imageId) };
  }

  async removeBackground(layerId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    // Mark the layer for background removal processing
    sceneGraph.updateNode(layerId as NodeId, {
      aiBackgroundRemovalStatus: 'pending',
    } as Partial<unknown>);

    // Emit event to trigger actual background removal
    this.runtime.emit('ai:removeBackground' as Parameters<typeof this.runtime.emit>[0], { layerId });
  }

  async generateCopy(
    context: string,
    options?: {
      type?: 'headline' | 'body' | 'cta' | 'tagline';
      tone?: 'professional' | 'casual' | 'playful' | 'urgent';
      maxLength?: number;
    }
  ): Promise<{ copy: string; alternatives: string[] }> {
    // This is a stub implementation - real implementation would call AI service
    // Generate placeholder copy based on type
    const type = options?.type ?? 'body';
    const tone = options?.tone ?? 'professional';

    const placeholders: Record<string, Record<string, string>> = {
      headline: {
        professional: 'Transform Your Business Today',
        casual: "Let's Make Something Awesome",
        playful: 'Ready for Some Fun?',
        urgent: 'Limited Time Only!',
      },
      body: {
        professional: 'Our comprehensive solution delivers measurable results for your organization.',
        casual: 'We make things simple and easy for you.',
        playful: "Because life's too short for boring stuff!",
        urgent: "Don't miss out on this exclusive opportunity.",
      },
      cta: {
        professional: 'Get Started',
        casual: 'Try It Out',
        playful: "Let's Go!",
        urgent: 'Act Now',
      },
      tagline: {
        professional: 'Excellence in Every Detail',
        casual: 'Simple. Easy. Done.',
        playful: 'Where Fun Meets Function',
        urgent: "Time's Running Out",
      },
    };

    const copy = placeholders[type]?.[tone] ?? 'Sample text content';

    // Emit event for actual AI generation
    this.runtime.emit('ai:generateCopy' as Parameters<typeof this.runtime.emit>[0], {
      context,
      type,
      tone,
      maxLength: options?.maxLength,
    });

    return {
      copy,
      alternatives: [
        `Alternative 1: ${copy}`,
        `Alternative 2: ${copy}`,
      ],
    };
  }

  async rewriteText(
    layerId: string,
    options?: {
      tone?: 'formal' | 'casual' | 'friendly' | 'professional';
      action?: 'shorten' | 'expand' | 'simplify' | 'rephrase';
    }
  ): Promise<{ newText: string }> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const nodeData = node as unknown as Record<string, unknown>;
    const currentText = (nodeData['characters'] as string) ?? '';

    // Stub implementation - real implementation would call AI service
    let newText = currentText;
    const action = options?.action ?? 'rephrase';

    switch (action) {
      case 'shorten':
        newText = currentText.split(' ').slice(0, Math.ceil(currentText.split(' ').length / 2)).join(' ');
        break;
      case 'expand':
        newText = `${currentText} Furthermore, this is additional content.`;
        break;
      case 'simplify':
        newText = currentText.replace(/\b\w{10,}\b/g, 'word');
        break;
      case 'rephrase':
        // Just return the same text for now
        break;
    }

    // Update the text node
    sceneGraph.updateNode(layerId as NodeId, { characters: newText });

    // Emit event for actual AI rewriting
    this.runtime.emit('ai:rewriteText' as Parameters<typeof this.runtime.emit>[0], {
      layerId,
      originalText: currentText,
      tone: options?.tone,
      action,
    });

    return { newText };
  }

  async translateText(
    layerId: string,
    targetLanguage: string
  ): Promise<{ translatedText: string; sourceLanguage: string }> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    const nodeData = node as unknown as Record<string, unknown>;
    const currentText = (nodeData['characters'] as string) ?? '';

    // Stub implementation - real implementation would call translation API
    const translatedText = `[${targetLanguage}] ${currentText}`;

    // Update the text node
    sceneGraph.updateNode(layerId as NodeId, { characters: translatedText });

    // Emit event for actual translation
    this.runtime.emit('ai:translateText' as Parameters<typeof this.runtime.emit>[0], {
      layerId,
      originalText: currentText,
      targetLanguage,
    });

    return {
      translatedText,
      sourceLanguage: 'en', // Assumed English source
    };
  }

  async suggestLayout(
    layerIds: string[]
  ): Promise<{ suggestions: Array<{ description: string; changes: unknown[] }> }> {
    const sceneGraph = this.runtime.getSceneGraph();

    // Analyze current layout
    const layers = layerIds.map(id => {
      const node = sceneGraph.getNode(id as NodeId);
      if (!node) return null;
      return getNodeProps(node);
    }).filter(Boolean);

    // Stub implementation - real implementation would use AI for analysis
    const suggestions: Array<{ description: string; changes: unknown[] }> = [];

    // Check for alignment issues
    const xValues = layers.map(l => l?.x ?? 0);
    const hasUnalignedLayers = new Set(xValues).size > 1;
    if (hasUnalignedLayers) {
      suggestions.push({
        description: 'Align layers to the left for visual consistency',
        changes: layerIds.map(id => ({
          type: 'align',
          layerId: id,
          alignment: 'left',
        })),
      });
    }

    // Check for inconsistent spacing
    if (layers.length > 2) {
      suggestions.push({
        description: 'Add consistent spacing between layers',
        changes: [{
          type: 'distribute',
          layerIds,
          direction: 'vertical',
          spacing: 16,
        }],
      });
    }

    // Emit event for actual AI analysis
    this.runtime.emit('ai:suggestLayout' as Parameters<typeof this.runtime.emit>[0], {
      layerIds,
      currentState: layers,
    });

    return { suggestions };
  }

  async autoRenameLayers(
    layerIds: string[]
  ): Promise<{ renamedCount: number; changes: Array<{ id: string; oldName: string; newName: string }> }> {
    const sceneGraph = this.runtime.getSceneGraph();
    const changes: Array<{ id: string; oldName: string; newName: string }> = [];

    for (const layerId of layerIds) {
      const node = sceneGraph.getNode(layerId as NodeId);
      if (!node) continue;

      const oldName = node.name;
      let newName = oldName;

      // Stub implementation - infer name from node type and properties
      const nodeData = node as unknown as Record<string, unknown>;

      switch (node.type) {
        case 'TEXT':
          // Name text layers by their content
          const text = (nodeData['characters'] as string) ?? '';
          newName = text.slice(0, 30) || 'Text';
          break;
        case 'RECTANGLE':
          // Check if it looks like a button, card, etc.
          const width = (nodeData['width'] as number) ?? 0;
          const height = (nodeData['height'] as number) ?? 0;
          if (height < 60 && width > 100) {
            newName = 'Button';
          } else if (width > 200 && height > 200) {
            newName = 'Card';
          } else {
            newName = 'Rectangle';
          }
          break;
        case 'FRAME':
          // Check if it's a container, section, etc.
          const childCount = sceneGraph.getChildIds(layerId as NodeId).length;
          if (childCount > 3) {
            newName = 'Section';
          } else if (childCount > 0) {
            newName = 'Container';
          } else {
            newName = 'Frame';
          }
          break;
        case 'ELLIPSE':
          newName = 'Circle';
          break;
        default:
          newName = node.type.charAt(0) + node.type.slice(1).toLowerCase();
      }

      if (newName !== oldName) {
        sceneGraph.updateNode(layerId as NodeId, { name: newName });
        changes.push({ id: layerId, oldName, newName });
      }
    }

    // Emit event for actual AI analysis
    this.runtime.emit('ai:autoRenameLayers' as Parameters<typeof this.runtime.emit>[0], {
      layerIds,
      changes,
    });

    return {
      renamedCount: changes.length,
      changes,
    };
  }

  // =========================================================================
  // Selection Navigation Operations
  // =========================================================================

  async selectChildren(layerId: string): Promise<string[]> {
    const sceneGraph = this.runtime.getSceneGraph();
    const childIds = sceneGraph.getChildIds(layerId as NodeId);
    const childIdStrings = childIds.map(String);

    if (childIdStrings.length > 0) {
      this.runtime.setSelection(childIds);
    }

    return childIdStrings;
  }

  async selectParent(layerId: string): Promise<string | null> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) return null;

    const parentId = node.parentId;
    if (!parentId) return null;

    this.runtime.setSelection([parentId]);
    return String(parentId);
  }

  async selectSiblings(layerId: string): Promise<string[]> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node || !node.parentId) return [];

    const siblingIds = sceneGraph.getChildIds(node.parentId);
    const siblingIdStrings = siblingIds.map(String);

    this.runtime.setSelection(siblingIds);
    return siblingIdStrings;
  }

  async selectSimilar(
    layerId: string,
    matchProperties?: ('type' | 'fill' | 'stroke' | 'font' | 'size')[]
  ): Promise<string[]> {
    const sceneGraph = this.runtime.getSceneGraph();
    const sourceNode = sceneGraph.getNode(layerId as NodeId);
    if (!sourceNode) return [];

    const sourceProps = getNodeProps(sourceNode);
    const sourceData = sourceNode as unknown as Record<string, unknown>;
    const matchOn = matchProperties ?? ['type'];

    // Get all layers on the current page
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) return [];

    const allIds = this.getAllLayerIds(pageId, sceneGraph);
    const matchingIds: NodeId[] = [];

    for (const nodeId of allIds) {
      if (String(nodeId) === layerId) continue; // Skip the source layer

      const node = sceneGraph.getNode(nodeId);
      if (!node) continue;

      const nodeProps = getNodeProps(node);
      const nodeData = node as unknown as Record<string, unknown>;
      let matches = true;

      for (const prop of matchOn) {
        switch (prop) {
          case 'type':
            if (nodeProps.type !== sourceProps.type) matches = false;
            break;
          case 'fill':
            // Compare first fill color
            const sourceFills = (sourceData['fills'] as unknown[]) ?? [];
            const nodeFills = (nodeData['fills'] as unknown[]) ?? [];
            if (JSON.stringify(sourceFills[0]) !== JSON.stringify(nodeFills[0])) matches = false;
            break;
          case 'stroke':
            // Compare first stroke color
            const sourceStrokes = (sourceData['strokes'] as unknown[]) ?? [];
            const nodeStrokes = (nodeData['strokes'] as unknown[]) ?? [];
            if (JSON.stringify(sourceStrokes[0]) !== JSON.stringify(nodeStrokes[0])) matches = false;
            break;
          case 'font':
            // Compare font family and size
            const sourceTextStyles = (sourceData['textStyles'] as Array<Record<string, unknown>>) ?? [];
            const nodeTextStyles = (nodeData['textStyles'] as Array<Record<string, unknown>>) ?? [];
            const sourceFont = sourceTextStyles[0]?.['fontFamily'];
            const nodeFont = nodeTextStyles[0]?.['fontFamily'];
            if (sourceFont !== nodeFont) matches = false;
            break;
          case 'size':
            // Compare width and height (within 10% tolerance)
            const tolerance = 0.1;
            const widthDiff = Math.abs(nodeProps.width - sourceProps.width) / sourceProps.width;
            const heightDiff = Math.abs(nodeProps.height - sourceProps.height) / sourceProps.height;
            if (widthDiff > tolerance || heightDiff > tolerance) matches = false;
            break;
        }
        if (!matches) break;
      }

      if (matches) {
        matchingIds.push(nodeId);
      }
    }

    // Include the source layer in selection
    matchingIds.unshift(layerId as NodeId);
    this.runtime.setSelection(matchingIds);

    return matchingIds.map(String);
  }

  async invertSelection(): Promise<string[]> {
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) return [];

    const sceneGraph = this.runtime.getSceneGraph();
    const allIds = this.getAllLayerIds(pageId, sceneGraph);
    const currentSelection = new Set(this.runtime.getSelection().map(String));

    // Select all layers that are NOT currently selected
    const invertedIds = allIds.filter(id => !currentSelection.has(String(id)));

    this.runtime.setSelection(invertedIds);
    return invertedIds.map(String);
  }

  // =========================================================================
  // Layer Management Operations
  // =========================================================================

  async renameLayersBulk(
    layerIds: string[],
    pattern: string
  ): Promise<Array<{ id: string; oldName: string; newName: string }>> {
    const sceneGraph = this.runtime.getSceneGraph();
    const changes: Array<{ id: string; oldName: string; newName: string }> = [];

    for (let i = 0; i < layerIds.length; i++) {
      const layerId = layerIds[i]!;
      const node = sceneGraph.getNode(layerId as NodeId);
      if (!node) continue;

      const oldName = node.name;
      // Replace {n} with index, {name} with original name
      const newName = pattern
        .replace(/\{n\}/g, String(i + 1))
        .replace(/\{name\}/g, oldName)
        .replace(/\{type\}/g, node.type.toLowerCase());

      sceneGraph.updateNode(layerId as NodeId, { name: newName });
      changes.push({ id: layerId, oldName, newName });
    }

    return changes;
  }

  async flattenLayers(layerIds: string[]): Promise<string> {
    if (layerIds.length === 0) throw new Error('No layers to flatten');

    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    // Calculate bounding box of all layers
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const layerId of layerIds) {
      const node = sceneGraph.getNode(layerId as NodeId);
      if (!node) continue;
      const props = getNodeProps(node);
      minX = Math.min(minX, props.x);
      minY = Math.min(minY, props.y);
      maxX = Math.max(maxX, props.x + props.width);
      maxY = Math.max(maxY, props.y + props.height);
    }

    // Create a new rectangle to represent the flattened result
    const flattenedId = sceneGraph.createNode('RECTANGLE', pageId, -1, {
      name: 'Flattened',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    });

    // Mark it as flattened with source layers (for potential undo)
    sceneGraph.updateNode(flattenedId, {
      flattenedFromLayers: layerIds,
    } as Partial<unknown>);

    // Delete original layers
    for (const layerId of layerIds) {
      sceneGraph.deleteNode(layerId as NodeId);
    }

    return String(flattenedId);
  }

  async reorderLayers(layerIds: string[], direction: 'up' | 'down' | 'top' | 'bottom'): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();

    for (const layerId of layerIds) {
      const node = sceneGraph.getNode(layerId as NodeId);
      if (!node || !node.parentId) continue;

      const siblings = sceneGraph.getChildIds(node.parentId);
      const currentIndex = siblings.indexOf(layerId as NodeId);

      let newIndex: number;
      switch (direction) {
        case 'up':
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'down':
          newIndex = Math.min(siblings.length - 1, currentIndex + 1);
          break;
        case 'top':
          newIndex = siblings.length - 1;
          break;
        case 'bottom':
          newIndex = 0;
          break;
      }

      if (newIndex !== currentIndex) {
        sceneGraph.moveNode(layerId as NodeId, node.parentId, newIndex);
      }
    }
  }

  // =========================================================================
  // Shape Creation Operations
  // =========================================================================

  async createPolygon(
    x: number,
    y: number,
    radius: number,
    sides: number,
    options?: { fill?: ColorValue; stroke?: ColorValue; name?: string }
  ): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    // Create a polygon as a vector path
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      points.push({
        x: radius + Math.cos(angle) * radius,
        y: radius + Math.sin(angle) * radius,
      });
    }

    const polygonId = sceneGraph.createNode('VECTOR', pageId, -1, {
      name: options?.name ?? `Polygon (${sides} sides)`,
      x,
      y,
      width: radius * 2,
      height: radius * 2,
    });

    // Build the vector path
    const pathData: PathCommand[] = points.map((p, i) => ({
      type: i === 0 ? 'M' : 'L',
      x: p.x,
      y: p.y,
    })) as PathCommand[];
    pathData.push({ type: 'Z' } as PathCommand);

    const fills = options?.fill
      ? [solidPaint(rgba(options.fill.r, options.fill.g, options.fill.b, options.fill.a))]
      : [solidPaint(rgba(0.5, 0.5, 0.5, 1))];

    const strokes = options?.stroke
      ? [solidPaint(rgba(options.stroke.r, options.stroke.g, options.stroke.b, options.stroke.a))]
      : [];

    sceneGraph.updateNode(polygonId, {
      vectorPaths: [{ windingRule: 'EVENODD', data: pathData }],
      fills,
      strokes,
    } as Partial<unknown>);

    return String(polygonId);
  }

  async createStar(
    x: number,
    y: number,
    outerRadius: number,
    innerRadius: number,
    points: number,
    options?: { fill?: ColorValue; stroke?: ColorValue; name?: string }
  ): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    // Create star vertices
    const vertices: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      vertices.push({
        x: outerRadius + Math.cos(angle) * r,
        y: outerRadius + Math.sin(angle) * r,
      });
    }

    const starId = sceneGraph.createNode('VECTOR', pageId, -1, {
      name: options?.name ?? `Star (${points} points)`,
      x,
      y,
      width: outerRadius * 2,
      height: outerRadius * 2,
    });

    const pathData: PathCommand[] = vertices.map((v, i) => ({
      type: i === 0 ? 'M' : 'L',
      x: v.x,
      y: v.y,
    })) as PathCommand[];
    pathData.push({ type: 'Z' } as PathCommand);

    const fills = options?.fill
      ? [solidPaint(rgba(options.fill.r, options.fill.g, options.fill.b, options.fill.a))]
      : [solidPaint(rgba(1, 0.8, 0, 1))]; // Default yellow

    const strokes = options?.stroke
      ? [solidPaint(rgba(options.stroke.r, options.stroke.g, options.stroke.b, options.stroke.a))]
      : [];

    sceneGraph.updateNode(starId, {
      vectorPaths: [{ windingRule: 'EVENODD', data: pathData }],
      fills,
      strokes,
    } as Partial<unknown>);

    return String(starId);
  }

  async createArrow(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    options?: { stroke?: ColorValue; strokeWidth?: number; headSize?: number; name?: string }
  ): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) throw new Error('No active page');

    const headSize = options?.headSize ?? 10;
    const strokeWidth = options?.strokeWidth ?? 2;

    // Calculate arrow direction
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / length;
    const ny = dy / length;

    // Arrow head points
    const headBase = { x: endX - nx * headSize, y: endY - ny * headSize };
    const perpX = -ny * headSize * 0.5;
    const perpY = nx * headSize * 0.5;

    // Create as a group with line and head
    const arrowId = sceneGraph.createNode('FRAME', pageId, -1, {
      name: options?.name ?? 'Arrow',
      x: Math.min(startX, endX) - headSize,
      y: Math.min(startY, endY) - headSize,
      width: Math.abs(dx) + headSize * 2,
      height: Math.abs(dy) + headSize * 2,
    });

    // Create arrow line as vector
    const lineId = sceneGraph.createNode('LINE', arrowId, -1, {
      name: 'Arrow Line',
    });

    const strokes = options?.stroke
      ? [solidPaint(rgba(options.stroke.r, options.stroke.g, options.stroke.b, options.stroke.a))]
      : [solidPaint(rgba(0, 0, 0, 1))];

    sceneGraph.updateNode(lineId, {
      vectorPaths: [{
        windingRule: 'NONZERO',
        data: [
          { type: 'M', x: startX, y: startY },
          { type: 'L', x: endX, y: endY },
        ],
      }],
      strokes,
      strokeWeight: strokeWidth,
    } as Partial<unknown>);

    // Create arrow head
    const headId = sceneGraph.createNode('VECTOR', arrowId, -1, {
      name: 'Arrow Head',
    });

    sceneGraph.updateNode(headId, {
      vectorPaths: [{
        windingRule: 'EVENODD',
        data: [
          { type: 'M', x: endX, y: endY },
          { type: 'L', x: headBase.x + perpX, y: headBase.y + perpY },
          { type: 'L', x: headBase.x - perpX, y: headBase.y - perpY },
          { type: 'Z' },
        ],
      }],
      fills: strokes,
    } as Partial<unknown>);

    return String(arrowId);
  }

  // =========================================================================
  // Appearance Operations
  // =========================================================================

  async setIndividualCorners(
    layerId: string,
    corners: { topLeft?: number; topRight?: number; bottomRight?: number; bottomLeft?: number }
  ): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    sceneGraph.updateNode(layerId as NodeId, {
      topLeftRadius: corners.topLeft,
      topRightRadius: corners.topRight,
      bottomRightRadius: corners.bottomRight,
      bottomLeftRadius: corners.bottomLeft,
    } as Partial<unknown>);
  }

  async getSelectionColors(
    layerIds: string[]
  ): Promise<Array<{ color: ColorValue; count: number; type: 'fill' | 'stroke' }>> {
    const sceneGraph = this.runtime.getSceneGraph();
    const colorMap = new Map<string, { color: ColorValue; count: number; type: 'fill' | 'stroke' }>();

    for (const layerId of layerIds) {
      const node = sceneGraph.getNode(layerId as NodeId);
      if (!node) continue;

      const nodeData = node as unknown as Record<string, unknown>;

      // Extract fill colors
      const fills = (nodeData['fills'] as Array<{ type: string; color?: { r: number; g: number; b: number; a: number } }>) ?? [];
      for (const fill of fills) {
        if (fill.type === 'SOLID' && fill.color) {
          const key = `fill:${fill.color.r},${fill.color.g},${fill.color.b},${fill.color.a}`;
          const existing = colorMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            colorMap.set(key, { color: fill.color, count: 1, type: 'fill' });
          }
        }
      }

      // Extract stroke colors
      const strokes = (nodeData['strokes'] as Array<{ type: string; color?: { r: number; g: number; b: number; a: number } }>) ?? [];
      for (const stroke of strokes) {
        if (stroke.type === 'SOLID' && stroke.color) {
          const key = `stroke:${stroke.color.r},${stroke.color.g},${stroke.color.b},${stroke.color.a}`;
          const existing = colorMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            colorMap.set(key, { color: stroke.color, count: 1, type: 'stroke' });
          }
        }
      }
    }

    return Array.from(colorMap.values()).sort((a, b) => b.count - a.count);
  }

  async replaceColor(
    oldColor: ColorValue,
    newColor: ColorValue,
    options?: { scope?: 'selection' | 'page' | 'document' }
  ): Promise<number> {
    const sceneGraph = this.runtime.getSceneGraph();
    const scope = options?.scope ?? 'page';
    let layerIds: NodeId[];

    if (scope === 'selection') {
      layerIds = this.runtime.getSelection();
    } else if (scope === 'page') {
      const pageId = this.runtime.getCurrentPageId();
      if (!pageId) return 0;
      layerIds = this.getAllLayerIds(pageId, sceneGraph);
    } else {
      const doc = sceneGraph.getDocument();
      if (!doc) return 0;
      const pageIds = sceneGraph.getChildIds(doc.id);
      layerIds = [];
      for (const pageId of pageIds) {
        layerIds.push(...this.getAllLayerIds(pageId, sceneGraph));
      }
    }

    const tolerance = 0.01;
    const colorMatches = (c1: ColorValue, c2: ColorValue) =>
      Math.abs(c1.r - c2.r) < tolerance &&
      Math.abs(c1.g - c2.g) < tolerance &&
      Math.abs(c1.b - c2.b) < tolerance &&
      Math.abs(c1.a - c2.a) < tolerance;

    let replacedCount = 0;

    for (const layerId of layerIds) {
      const node = sceneGraph.getNode(layerId);
      if (!node) continue;

      const nodeData = node as unknown as Record<string, unknown>;

      // Replace in fills
      const fills = (nodeData['fills'] as Array<{ type: string; color?: ColorValue }>) ?? [];
      let fillsChanged = false;
      for (const fill of fills) {
        if (fill.type === 'SOLID' && fill.color && colorMatches(fill.color, oldColor)) {
          fill.color = { ...newColor };
          fillsChanged = true;
          replacedCount++;
        }
      }
      if (fillsChanged) {
        sceneGraph.updateNode(layerId, { fills } as Partial<unknown>);
      }

      // Replace in strokes
      const strokes = (nodeData['strokes'] as Array<{ type: string; color?: ColorValue }>) ?? [];
      let strokesChanged = false;
      for (const stroke of strokes) {
        if (stroke.type === 'SOLID' && stroke.color && colorMatches(stroke.color, oldColor)) {
          stroke.color = { ...newColor };
          strokesChanged = true;
          replacedCount++;
        }
      }
      if (strokesChanged) {
        sceneGraph.updateNode(layerId, { strokes } as Partial<unknown>);
      }
    }

    return replacedCount;
  }

  // =========================================================================
  // Viewport Operations (Additional)
  // =========================================================================

  async zoomTo100(): Promise<void> {
    this.runtime.setZoom(1);
  }

  async zoomIn(): Promise<void> {
    const currentZoom = this.runtime.getZoom();
    const zoomLevels = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 8, 10];
    const nextLevel = zoomLevels.find(z => z > currentZoom) ?? 10;
    this.runtime.setZoom(nextLevel);
  }

  async zoomOut(): Promise<void> {
    const currentZoom = this.runtime.getZoom();
    const zoomLevels = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 8, 10];
    const prevLevel = [...zoomLevels].reverse().find(z => z < currentZoom) ?? 0.1;
    this.runtime.setZoom(prevLevel);
  }

  // =========================================================================
  // Query Operations (Additional)
  // =========================================================================

  async inspectProperties(layerId: string): Promise<Record<string, unknown>> {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(layerId as NodeId);
    if (!node) throw new Error('Layer not found');

    // Return all node properties
    return { ...node } as Record<string, unknown>;
  }

  // =========================================================================
  // Page Management Operations
  // =========================================================================

  async createPage(name?: string): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const doc = sceneGraph.getDocument();
    if (!doc) throw new Error('No document');

    const pageId = sceneGraph.createNode('PAGE', doc.id, -1, {
      name: name ?? 'New Page',
    });

    return String(pageId);
  }

  async renamePage(pageId: string, name: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(pageId as NodeId, { name });
  }

  async deletePage(pageId: string): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    const doc = sceneGraph.getDocument();
    if (!doc) throw new Error('No document');

    const pageIds = sceneGraph.getChildIds(doc.id);
    if (pageIds.length <= 1) {
      throw new Error('Cannot delete the last page');
    }

    sceneGraph.deleteNode(pageId as NodeId);
  }

  async duplicatePage(pageId: string, name?: string): Promise<string> {
    const sceneGraph = this.runtime.getSceneGraph();
    const sourcePage = sceneGraph.getNode(pageId as NodeId);
    if (!sourcePage) throw new Error('Page not found');

    const doc = sceneGraph.getDocument();
    if (!doc) throw new Error('No document');

    // Create new page
    const newPageId = sceneGraph.createNode('PAGE', doc.id, -1, {
      name: name ?? `${sourcePage.name} Copy`,
    });

    // Copy all children from source page
    this.copyChildrenToNode(sceneGraph, pageId as NodeId, newPageId);

    return String(newPageId);
  }

  async goToPage(pageId: string): Promise<void> {
    this.runtime.setCurrentPage(pageId as NodeId);
  }

  async listPages(): Promise<Array<{ id: string; name: string }>> {
    const sceneGraph = this.runtime.getSceneGraph();
    const doc = sceneGraph.getDocument();
    if (!doc) return [];

    const pageIds = sceneGraph.getChildIds(doc.id);
    return pageIds.map(id => {
      const page = sceneGraph.getNode(id);
      return { id: String(id), name: page?.name ?? 'Untitled' };
    });
  }

  async setPageBackground(pageId: string, color: ColorValue): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(pageId as NodeId, {
      backgroundColor: { r: color.r, g: color.g, b: color.b, a: color.a },
    } as Partial<unknown>);
  }

  // =========================================================================
  // File Operations
  // =========================================================================

  async getFileInfo(): Promise<{ name: string; lastModified: Date; size?: number; path?: string }> {
    const sceneGraph = this.runtime.getSceneGraph();
    const doc = sceneGraph.getDocument();
    return {
      name: doc?.name ?? 'Untitled',
      lastModified: new Date(),
      path: undefined,
    };
  }

  async getVersionHistory(): Promise<Array<{ id: string; timestamp: Date; description: string; author?: string }>> {
    // Stub implementation - would integrate with version control system
    return [];
  }

  async saveVersion(description: string): Promise<string> {
    const versionId = `v_${Date.now()}`;
    // Emit event for version save
    this.runtime.emit('file:versionSaved' as Parameters<typeof this.runtime.emit>[0], { versionId, description });
    return versionId;
  }

  async getFileStats(): Promise<{ layerCount: number; pageCount: number; componentCount: number; styleCount: number }> {
    const sceneGraph = this.runtime.getSceneGraph();
    const doc = sceneGraph.getDocument();
    if (!doc) return { layerCount: 0, pageCount: 0, componentCount: 0, styleCount: 0 };

    const pageIds = sceneGraph.getChildIds(doc.id);
    let layerCount = 0;
    let componentCount = 0;

    for (const pageId of pageIds) {
      const layerIds = this.getAllLayerIds(pageId, sceneGraph);
      layerCount += layerIds.length;
      for (const id of layerIds) {
        const node = sceneGraph.getNode(id);
        if (node?.type === 'COMPONENT') componentCount++;
      }
    }

    const styleManager = this.runtime.getStyleManager?.();
    const styleCount = styleManager?.getAllStyles().length ?? 0;

    return { layerCount, pageCount: pageIds.length, componentCount, styleCount };
  }

  // =========================================================================
  // Collaboration Operations
  // =========================================================================

  private comments: Map<string, { id: string; layerId?: string; text: string; author?: string; timestamp: Date; resolved: boolean; x?: number; y?: number; replies: Array<{ id: string; text: string; author?: string; timestamp: Date }> }> = new Map();

  async addComment(layerId: string, text: string, x?: number, y?: number): Promise<string> {
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.comments.set(commentId, {
      id: commentId,
      layerId,
      text,
      author: undefined,
      timestamp: new Date(),
      resolved: false,
      x,
      y,
      replies: [],
    });
    return commentId;
  }

  async replyToComment(commentId: string, text: string): Promise<string> {
    const comment = this.comments.get(commentId);
    if (!comment) throw new Error('Comment not found');

    const replyId = `reply_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    comment.replies.push({
      id: replyId,
      text,
      author: undefined,
      timestamp: new Date(),
    });
    return replyId;
  }

  async resolveComment(commentId: string): Promise<void> {
    const comment = this.comments.get(commentId);
    if (!comment) throw new Error('Comment not found');
    comment.resolved = true;
  }

  async listComments(options?: { resolved?: boolean; layerId?: string }): Promise<Array<{ id: string; text: string; author?: string; timestamp: Date; resolved: boolean; layerId?: string; replies: Array<{ id: string; text: string; author?: string; timestamp: Date }> }>> {
    let comments = Array.from(this.comments.values());

    if (options?.resolved !== undefined) {
      comments = comments.filter(c => c.resolved === options.resolved);
    }
    if (options?.layerId) {
      comments = comments.filter(c => c.layerId === options.layerId);
    }

    return comments;
  }

  // =========================================================================
  // Analysis Operations
  // =========================================================================

  async accessibilityAudit(layerIds?: string[]): Promise<Array<{ layerId: string; issue: string; severity: 'error' | 'warning' | 'info'; suggestion: string }>> {
    const sceneGraph = this.runtime.getSceneGraph();
    const issues: Array<{ layerId: string; issue: string; severity: 'error' | 'warning' | 'info'; suggestion: string }> = [];

    const idsToCheck = layerIds ?? (this.runtime.getCurrentPageId() ? this.getAllLayerIds(this.runtime.getCurrentPageId()!, sceneGraph).map(String) : []);

    for (const layerId of idsToCheck) {
      const node = sceneGraph.getNode(layerId as NodeId);
      if (!node) continue;

      const nodeData = node as unknown as Record<string, unknown>;

      // Check for missing alt text on images
      if (node.type === 'IMAGE' || node.type === 'RECTANGLE') {
        const fills = (nodeData['fills'] as Array<{ type: string }>) ?? [];
        const hasImageFill = fills.some(f => f.type === 'IMAGE');
        if (hasImageFill && !nodeData['altText']) {
          issues.push({
            layerId,
            issue: 'Missing alt text for image',
            severity: 'error',
            suggestion: 'Add descriptive alt text for screen readers',
          });
        }
      }

      // Check for small text
      if (node.type === 'TEXT') {
        const textStyles = (nodeData['textStyles'] as Array<{ fontSize?: number }>) ?? [];
        const fontSize = textStyles[0]?.fontSize ?? 12;
        if (fontSize < 12) {
          issues.push({
            layerId,
            issue: `Text size ${fontSize}px is too small`,
            severity: 'warning',
            suggestion: 'Use at least 12px for body text',
          });
        }
      }

      // Check for small touch targets
      const width = (nodeData['width'] as number) ?? 0;
      const height = (nodeData['height'] as number) ?? 0;
      if ((node.type === 'RECTANGLE' || node.type === 'FRAME') && width < 44 && height < 44) {
        issues.push({
          layerId,
          issue: 'Touch target may be too small',
          severity: 'info',
          suggestion: 'Ensure interactive elements are at least 44x44px',
        });
      }
    }

    return issues;
  }

  async contrastCheck(layerIds?: string[]): Promise<Array<{ layerId: string; foreground: ColorValue; background: ColorValue; ratio: number; passes: { aa: boolean; aaa: boolean } }>> {
    const sceneGraph = this.runtime.getSceneGraph();
    const results: Array<{ layerId: string; foreground: ColorValue; background: ColorValue; ratio: number; passes: { aa: boolean; aaa: boolean } }> = [];

    const idsToCheck = layerIds ?? (this.runtime.getCurrentPageId() ? this.getAllLayerIds(this.runtime.getCurrentPageId()!, sceneGraph).map(String) : []);

    for (const layerId of idsToCheck) {
      const node = sceneGraph.getNode(layerId as NodeId);
      if (!node || node.type !== 'TEXT') continue;

      const nodeData = node as unknown as Record<string, unknown>;
      const fills = (nodeData['fills'] as Array<{ type: string; color?: ColorValue }>) ?? [];
      const textColor = fills.find(f => f.type === 'SOLID')?.color;
      if (!textColor) continue;

      // Find parent background
      let bgColor: ColorValue = { r: 1, g: 1, b: 1, a: 1 }; // Default white
      if (node.parentId) {
        const parent = sceneGraph.getNode(node.parentId);
        if (parent) {
          const parentData = parent as unknown as Record<string, unknown>;
          const parentFills = (parentData['fills'] as Array<{ type: string; color?: ColorValue }>) ?? [];
          const bg = parentFills.find(f => f.type === 'SOLID')?.color;
          if (bg) bgColor = bg;
        }
      }

      // Calculate contrast ratio
      const getLuminance = (c: ColorValue) => {
        const sRGB = [c.r, c.g, c.b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * sRGB[0]! + 0.7152 * sRGB[1]! + 0.0722 * sRGB[2]!;
      };
      const l1 = getLuminance(textColor);
      const l2 = getLuminance(bgColor);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

      results.push({
        layerId,
        foreground: textColor,
        background: bgColor,
        ratio: Math.round(ratio * 100) / 100,
        passes: {
          aa: ratio >= 4.5,
          aaa: ratio >= 7,
        },
      });
    }

    return results;
  }

  async consistencyAudit(): Promise<Array<{ type: 'spacing' | 'color' | 'font' | 'size'; issue: string; affectedLayers: string[] }>> {
    // Stub implementation
    return [];
  }

  async listFontsUsed(): Promise<Array<{ fontFamily: string; fontWeight: number; count: number }>> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) return [];

    const fontMap = new Map<string, { fontFamily: string; fontWeight: number; count: number }>();
    const layerIds = this.getAllLayerIds(pageId, sceneGraph);

    for (const layerId of layerIds) {
      const node = sceneGraph.getNode(layerId);
      if (!node || node.type !== 'TEXT') continue;

      const nodeData = node as unknown as Record<string, unknown>;
      const textStyles = (nodeData['textStyles'] as Array<{ fontFamily?: string; fontWeight?: number }>) ?? [];

      for (const style of textStyles) {
        if (style.fontFamily) {
          const key = `${style.fontFamily}_${style.fontWeight ?? 400}`;
          const existing = fontMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            fontMap.set(key, { fontFamily: style.fontFamily, fontWeight: style.fontWeight ?? 400, count: 1 });
          }
        }
      }
    }

    return Array.from(fontMap.values()).sort((a, b) => b.count - a.count);
  }

  async findMissingFonts(): Promise<Array<{ fontFamily: string; fontWeight: number; layerIds: string[] }>> {
    // Stub implementation - would check against available system fonts
    return [];
  }

  async replaceFont(oldFont: string, newFont: string): Promise<number> {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!pageId) return 0;

    const layerIds = this.getAllLayerIds(pageId, sceneGraph);
    let replacedCount = 0;

    for (const layerId of layerIds) {
      const node = sceneGraph.getNode(layerId);
      if (!node || node.type !== 'TEXT') continue;

      const nodeData = node as unknown as Record<string, unknown>;
      const textStyles = (nodeData['textStyles'] as Array<{ fontFamily?: string }>) ?? [];
      let changed = false;

      for (const style of textStyles) {
        if (style.fontFamily === oldFont) {
          style.fontFamily = newFont;
          changed = true;
          replacedCount++;
        }
      }

      if (changed) {
        sceneGraph.updateNode(layerId, { textStyles } as Partial<unknown>);
      }
    }

    return replacedCount;
  }

  // =========================================================================
  // UI Toggle Operations
  // =========================================================================

  private uiState = {
    rulers: true,
    grid: false,
    guides: true,
    outlines: false,
  };

  async toggleRulers(): Promise<boolean> {
    this.uiState.rulers = !this.uiState.rulers;
    this.runtime.emit('ui:rulersToggled' as Parameters<typeof this.runtime.emit>[0], { visible: this.uiState.rulers });
    return this.uiState.rulers;
  }

  async toggleGrid(): Promise<boolean> {
    this.uiState.grid = !this.uiState.grid;
    this.runtime.emit('ui:gridToggled' as Parameters<typeof this.runtime.emit>[0], { visible: this.uiState.grid });
    return this.uiState.grid;
  }

  async toggleGuides(): Promise<boolean> {
    this.uiState.guides = !this.uiState.guides;
    this.runtime.emit('ui:guidesToggled' as Parameters<typeof this.runtime.emit>[0], { visible: this.uiState.guides });
    return this.uiState.guides;
  }

  async toggleOutlines(): Promise<boolean> {
    this.uiState.outlines = !this.uiState.outlines;
    this.runtime.emit('ui:outlinesToggled' as Parameters<typeof this.runtime.emit>[0], { visible: this.uiState.outlines });
    return this.uiState.outlines;
  }

  async collapseAllLayers(): Promise<void> {
    this.runtime.emit('ui:collapseAllLayers' as Parameters<typeof this.runtime.emit>[0], {});
  }

  async expandAllLayers(): Promise<void> {
    this.runtime.emit('ui:expandAllLayers' as Parameters<typeof this.runtime.emit>[0], {});
  }

  // =========================================================================
  // Events
  // =========================================================================

  private unsubscribers = new Map<string, () => void>();

  on(event: string, callback: (data: unknown) => void): void {
    // Store the unsubscribe function for later use with off()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = this.runtime.on(event as any, callback as any);
    // Create a unique key for this event+callback pair
    const key = `${event}_${callback.toString().slice(0, 50)}`;
    this.unsubscribers.set(key, unsubscribe);
  }

  off(event: string, callback: (data: unknown) => void): void {
    // Find and call the unsubscribe function
    const key = `${event}_${callback.toString().slice(0, 50)}`;
    const unsubscribe = this.unsubscribers.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(key);
    }
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private getAllLayerIds(pageId: NodeId, sceneGraph: ReturnType<DesignLibreRuntime['getSceneGraph']>): NodeId[] {
    const ids: NodeId[] = [];

    const traverse = (parentId: NodeId) => {
      const childIds = sceneGraph.getChildIds(parentId);
      for (const childId of childIds) {
        ids.push(childId);
        traverse(childId);
      }
    };

    traverse(pageId);
    return ids;
  }
}

/**
 * Create a DesignLibre bridge
 */
export function createDesignLibreBridge(runtime: DesignLibreRuntime): DesignLibreBridge {
  return new DesignLibreBridge(runtime);
}
