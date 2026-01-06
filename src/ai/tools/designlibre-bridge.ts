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
import { solidPaint } from '@core/types/paint';
import { rgba } from '@core/types/color';
import type { VectorPath, PathCommand } from '@core/types/geometry';
import type { BlendMode } from '@core/types/common';
import type { Effect } from '@core/types/effect';
import { dropShadow } from '@core/types/effect';
import { rgba as rgbaColor } from '@core/types/color';

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
