/**
 * DesignLibre Runtime
 *
 * Main runtime class that coordinates all subsystems.
 */

import type { NodeId } from '@core/types/common';
import type { VectorPath, PathCommand } from '@core/types/geometry';
import { EventEmitter } from '@core/events/event-emitter';
import { SceneGraph } from '@scene/graph/scene-graph';
import { Renderer, createRenderer } from '@renderer/core/renderer';
import { Viewport } from '@renderer/core/viewport';
import { ToolManager, createToolManager } from '@tools/base/tool-manager';
import { SelectTool, createSelectTool } from '@tools/selection/select-tool';
import { MoveTool, createMoveTool } from '@tools/transform/move-tool';
import { ResizeTool, createResizeTool } from '@tools/transform/resize-tool';
import { RotateTool, createRotateTool } from '@tools/transform/rotate-tool';
import { RectangleTool, createRectangleTool } from '@tools/drawing/rectangle-tool';
import { EllipseTool, createEllipseTool } from '@tools/drawing/ellipse-tool';
import { LineTool, createLineTool } from '@tools/drawing/line-tool';
import { PenTool, createPenTool } from '@tools/drawing/pen-tool';
import { HandTool, createHandTool } from '@tools/navigation/hand-tool';
import { PointerHandler, createPointerHandler } from '@tools/input/pointer-handler';
import { KeyboardHandler, createKeyboardHandler } from '@tools/input/keyboard-handler';
import { SelectionManager, createSelectionManager } from '@scene/selection/selection-manager';
import { LayoutEngine, createLayoutEngine } from '@layout/layout-engine';
import { UndoManager, createUndoManager } from '@operations/undo-manager';
import { DocumentSerializer, createDocumentSerializer } from '@persistence/serialization/document-serializer';
import { IndexedDBStorage, createIndexedDBStorage } from '@persistence/storage/indexed-db';
import { AutosaveManager, createAutosaveManager } from '@persistence/storage/autosave';
import { PNGExporter, createPNGExporter } from '@persistence/export/png-exporter';
import { SVGExporter, createSVGExporter } from '@persistence/export/svg-exporter';
import { solidPaint } from '@core/types/paint';
import { rgba } from '@core/types/color';

/**
 * Runtime events
 */
export type RuntimeEvents = {
  'initialized': undefined;
  'document:created': { documentId: NodeId };
  'document:loaded': { documentId: NodeId };
  'document:saved': { documentId: NodeId };
  'tool:changed': { tool: string };
  'selection:changed': { nodeIds: NodeId[] };
  'error': { error: Error };
  [key: string]: unknown;
};

/**
 * Runtime options
 */
export interface RuntimeOptions {
  /** Autosave interval in ms (0 to disable) */
  autosaveInterval?: number | undefined;
  /** Enable debug mode */
  debug?: boolean | undefined;
}

/**
 * Runtime state
 */
interface RuntimeState {
  initialized: boolean;
  currentDocumentId: string | null;
}

/**
 * DesignLibre Runtime
 */
export class DesignLibreRuntime extends EventEmitter<RuntimeEvents> {
  // Core systems
  private sceneGraph: SceneGraph;
  private renderer: Renderer | null = null;
  private viewport: Viewport | null = null;
  private toolManager: ToolManager | null = null;
  private selectionManager: SelectionManager;
  private layoutEngine: LayoutEngine;
  private undoManager: UndoManager;

  // Input handlers
  private pointerHandler: PointerHandler | null = null;
  private keyboardHandler: KeyboardHandler | null = null;

  // Canvas element (for coordinate transformations)
  private canvas: HTMLCanvasElement | null = null;

  // Persistence
  private serializer: DocumentSerializer;
  private storage: IndexedDBStorage;
  private autosaveManager: AutosaveManager | null = null;

  // Exporters
  private pngExporter: PNGExporter;
  private svgExporter: SVGExporter;

  // Tools
  private selectTool: SelectTool | null = null;
  private moveTool: MoveTool | null = null;
  private resizeTool: ResizeTool | null = null;
  private rotateTool: RotateTool | null = null;
  private rectangleTool: RectangleTool | null = null;
  private ellipseTool: EllipseTool | null = null;
  private lineTool: LineTool | null = null;
  private penTool: PenTool | null = null;
  private handTool: HandTool | null = null;

  // State
  private state: RuntimeState = {
    initialized: false,
    currentDocumentId: null,
  };

  // Options
  private options: RuntimeOptions;

  constructor(options: RuntimeOptions = {}) {
    super();
    this.options = options;

    // Initialize core systems
    this.sceneGraph = new SceneGraph();
    this.selectionManager = createSelectionManager(this.sceneGraph);
    this.layoutEngine = createLayoutEngine(this.sceneGraph);
    this.undoManager = createUndoManager({ maxHistory: 100 });

    // Initialize persistence
    this.serializer = createDocumentSerializer();
    this.storage = createIndexedDBStorage();

    // Initialize exporters
    this.pngExporter = createPNGExporter(this.sceneGraph);
    this.svgExporter = createSVGExporter(this.sceneGraph);

    // Set up event forwarding
    this.setupEventForwarding();
  }

  /**
   * Initialize the runtime with a container element.
   */
  async initialize(container: HTMLElement): Promise<void> {
    if (this.state.initialized) {
      throw new Error('Runtime already initialized');
    }

    try {
      // Create canvas
      this.canvas = document.createElement('canvas');
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      container.appendChild(this.canvas);

      // Initialize renderer
      this.renderer = createRenderer(this.canvas);
      this.viewport = this.renderer.getViewport();
      this.renderer.setSceneGraph(this.sceneGraph);

      // Initialize tool manager
      this.toolManager = createToolManager(this.sceneGraph, this.viewport);

      // Initialize tools
      this.initializeTools();

      // Initialize input handlers
      this.pointerHandler = createPointerHandler(this.canvas, this.viewport);
      this.keyboardHandler = createKeyboardHandler();
      this.keyboardHandler.registerDefaultShortcuts();

      // Wire input to tools
      this.wireInputHandlers();

      // Initialize storage
      await this.storage.initialize();

      // Initialize autosave
      if (this.options.autosaveInterval) {
        this.autosaveManager = createAutosaveManager(
          this.sceneGraph,
          this.serializer,
          this.storage,
          { interval: this.options.autosaveInterval }
        );
      }

      // Handle window resize
      window.addEventListener('resize', this.handleResize);
      this.handleResize();

      // Start render loop
      this.renderer.startRenderLoop();

      this.state.initialized = true;
      this.emit('initialized');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', { error });
      throw error;
    }
  }

  // =========================================================================
  // Document Management
  // =========================================================================

  /**
   * Create a new document.
   */
  createDocument(name: string = 'Untitled'): NodeId {
    // Create document structure using createNewDocument which creates doc + first page
    const docId = this.sceneGraph.createNewDocument(name);

    // Get page and add a sample frame
    const doc = this.sceneGraph.getDocument();
    if (doc) {
      const pageIds = this.sceneGraph.getChildIds(doc.id);
      if (pageIds.length > 0) {
        const pageId = pageIds[0]!;
        this.sceneGraph.createFrame(pageId, {
          name: 'Frame 1',
          x: 100,
          y: 100,
          width: 400,
          height: 300,
        });
      }
    }

    this.state.currentDocumentId = docId as unknown as string;

    // Start autosave
    if (this.autosaveManager) {
      this.autosaveManager.start(docId as unknown as string);
    }

    this.emit('document:created', { documentId: docId });

    return docId;
  }

  /**
   * Load a document from storage.
   */
  async loadDocument(documentId: string): Promise<void> {
    const stored = await this.storage.loadDocument(documentId);
    if (!stored) {
      throw new Error(`Document not found: ${documentId}`);
    }

    this.serializer.deserialize(stored.data, this.sceneGraph);
    this.state.currentDocumentId = documentId as string;

    // Start autosave
    if (this.autosaveManager) {
      this.autosaveManager.start(documentId);
    }

    this.emit('document:loaded', { documentId: documentId as unknown as NodeId });
  }

  /**
   * Save current document to storage.
   */
  async saveDocument(): Promise<void> {
    if (!this.state.currentDocumentId) {
      throw new Error('No document to save');
    }

    const doc = this.sceneGraph.getDocument();
    const name = doc?.name ?? 'Untitled';
    const json = this.serializer.serialize(this.sceneGraph, { includeMetadata: true });

    await this.storage.saveDocument(this.state.currentDocumentId, name, json);

    this.emit('document:saved', { documentId: this.state.currentDocumentId as unknown as NodeId });
  }

  /**
   * Get document name.
   */
  getDocumentName(): string {
    const doc = this.sceneGraph.getDocument();
    return doc?.name ?? 'Untitled';
  }

  // =========================================================================
  // Selection
  // =========================================================================

  /**
   * Get selected node IDs.
   */
  getSelection(): NodeId[] {
    return this.selectionManager.getSelectedNodeIds();
  }

  /**
   * Set selection.
   */
  setSelection(nodeIds: NodeId[]): void {
    this.selectionManager.select(nodeIds, 'replace');
  }

  /**
   * Clear selection.
   */
  clearSelection(): void {
    this.selectionManager.clear();
  }

  // =========================================================================
  // Tools
  // =========================================================================

  /**
   * Set the active tool.
   */
  setTool(toolName: string): void {
    if (!this.toolManager) return;

    this.toolManager.setActiveTool(toolName);
    this.emit('tool:changed', { tool: toolName });
  }

  /**
   * Get active tool name.
   */
  getActiveTool(): string {
    return this.toolManager?.getActiveTool()?.name ?? 'select';
  }

  // =========================================================================
  // Undo/Redo
  // =========================================================================

  /**
   * Undo last operation.
   */
  undo(): boolean {
    return this.undoManager.undo() !== null;
  }

  /**
   * Redo last undone operation.
   */
  redo(): boolean {
    return this.undoManager.redo() !== null;
  }

  /**
   * Check if undo is available.
   */
  canUndo(): boolean {
    return this.undoManager.canUndo();
  }

  /**
   * Check if redo is available.
   */
  canRedo(): boolean {
    return this.undoManager.canRedo();
  }

  // =========================================================================
  // Export
  // =========================================================================

  /**
   * Export node to PNG.
   */
  async exportPNG(
    nodeId: NodeId,
    options?: { scale?: number; backgroundColor?: string }
  ): Promise<Blob> {
    const result = await this.pngExporter.export(nodeId, options);
    return result.blob;
  }

  /**
   * Export node to SVG.
   */
  exportSVG(nodeId: NodeId, options?: { padding?: number }): string {
    const result = this.svgExporter.export(nodeId, options);
    return result.svg;
  }

  /**
   * Download node as PNG.
   */
  async downloadPNG(nodeId: NodeId, filename: string = 'export.png'): Promise<void> {
    await this.pngExporter.download(nodeId, filename);
  }

  /**
   * Download node as SVG.
   */
  downloadSVG(nodeId: NodeId, filename: string = 'export.svg'): void {
    this.svgExporter.download(nodeId, filename);
  }

  // =========================================================================
  // Viewport
  // =========================================================================

  /**
   * Get current zoom level.
   */
  getZoom(): number {
    return this.viewport?.getZoom() ?? 1;
  }

  /**
   * Set zoom level.
   */
  setZoom(zoom: number): void {
    this.viewport?.setZoom(zoom);
  }

  /**
   * Zoom to fit all content.
   */
  zoomToFit(): void {
    const bounds = this.selectionManager.getSelectionBounds();
    if (bounds && this.viewport) {
      this.viewport.fitRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
  }

  /**
   * Reset viewport to default.
   */
  resetViewport(): void {
    this.viewport?.reset();
  }

  // =========================================================================
  // Scene Graph Access
  // =========================================================================

  /**
   * Get the scene graph.
   */
  getSceneGraph(): SceneGraph {
    return this.sceneGraph;
  }

  /**
   * Get the layout engine.
   */
  getLayoutEngine(): LayoutEngine {
    return this.layoutEngine;
  }

  /**
   * Get a node by ID.
   */
  getNode(nodeId: NodeId): ReturnType<SceneGraph['getNode']> {
    return this.sceneGraph.getNode(nodeId);
  }

  /**
   * Get the tool manager.
   */
  getToolManager(): ToolManager | null {
    return this.toolManager;
  }

  /**
   * Get the viewport.
   */
  getViewport(): Viewport | null {
    return this.viewport;
  }

  /**
   * Get the selection manager.
   */
  getSelectionManager(): SelectionManager {
    return this.selectionManager;
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  /**
   * Dispose of the runtime.
   */
  dispose(): void {
    window.removeEventListener('resize', this.handleResize);

    this.autosaveManager?.dispose();
    this.pointerHandler?.dispose();
    this.keyboardHandler?.dispose();
    this.renderer?.dispose();
    this.storage.close();

    this.state.initialized = false;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private initializeTools(): void {
    if (!this.toolManager) return;

    // Create tools with callbacks
    this.selectTool = createSelectTool({
      onSelectionChange: (nodeIds) => {
        this.selectionManager.select(nodeIds, 'replace');
      },
    });

    this.moveTool = createMoveTool({
      onMoveEnd: (operations) => {
        // Apply moves to scene graph
        for (const op of operations) {
          this.sceneGraph.updateNode(op.nodeId, {
            x: op.endX,
            y: op.endY,
          });
        }
      },
    });

    this.resizeTool = createResizeTool({
      onResizeUpdate: (nodeId, bounds) => {
        this.sceneGraph.updateNode(nodeId, {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        });
      },
    });

    this.rotateTool = createRotateTool({
      onRotateUpdate: (nodeId, rotation, _pivot) => {
        this.sceneGraph.updateNode(nodeId, { rotation });
      },
    });

    // Rectangle tool
    this.rectangleTool = createRectangleTool();
    this.rectangleTool.setOnRectComplete((rect, _cornerRadius) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      // Create a rectangle path
      const path: VectorPath = {
        windingRule: 'NONZERO',
        commands: [
          { type: 'M', x: 0, y: 0 },
          { type: 'L', x: rect.width, y: 0 },
          { type: 'L', x: rect.width, y: rect.height },
          { type: 'L', x: 0, y: rect.height },
          { type: 'Z' },
        ] as PathCommand[],
      };

      const nodeId = this.sceneGraph.createVector(parentId, {
        name: 'Rectangle',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        vectorPaths: [path],
        fills: [solidPaint(rgba(0.85, 0.85, 0.85, 1))],
      });

      this.selectionManager.select([nodeId], 'replace');
      return nodeId;
    });

    // Ellipse tool
    this.ellipseTool = createEllipseTool();
    this.ellipseTool.setOnEllipseComplete((path, bounds) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      const nodeId = this.sceneGraph.createVector(parentId, {
        name: 'Ellipse',
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        vectorPaths: [path],
        fills: [solidPaint(rgba(0.85, 0.85, 0.85, 1))],
      });

      this.selectionManager.select([nodeId], 'replace');
      return nodeId;
    });

    // Line tool
    this.lineTool = createLineTool();
    this.lineTool.setOnLineComplete((_path, start, end) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      const minX = Math.min(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x) || 1;
      const height = Math.abs(end.y - start.y) || 1;

      // Adjust path to be relative to bounding box
      const adjustedPath: VectorPath = {
        windingRule: 'NONZERO',
        commands: [
          { type: 'M', x: start.x - minX, y: start.y - minY },
          { type: 'L', x: end.x - minX, y: end.y - minY },
        ] as PathCommand[],
      };

      const nodeId = this.sceneGraph.createVector(parentId, {
        name: 'Line',
        x: minX,
        y: minY,
        width,
        height,
        vectorPaths: [adjustedPath],
        fills: [],
        strokes: [solidPaint(rgba(0, 0, 0, 1))],
        strokeWeight: 2,
      });

      this.selectionManager.select([nodeId], 'replace');
      return nodeId;
    });

    // Pen tool
    this.penTool = createPenTool();
    this.penTool.setOnPathComplete((path) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      // Calculate bounding box from path
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const cmd of path.commands) {
        if ('x' in cmd && 'y' in cmd) {
          minX = Math.min(minX, cmd.x);
          minY = Math.min(minY, cmd.y);
          maxX = Math.max(maxX, cmd.x);
          maxY = Math.max(maxY, cmd.y);
        }
        if ('x1' in cmd && 'y1' in cmd) {
          minX = Math.min(minX, cmd.x1);
          minY = Math.min(minY, cmd.y1);
          maxX = Math.max(maxX, cmd.x1);
          maxY = Math.max(maxY, cmd.y1);
        }
        if ('x2' in cmd && 'y2' in cmd) {
          minX = Math.min(minX, cmd.x2);
          minY = Math.min(minY, cmd.y2);
          maxX = Math.max(maxX, cmd.x2);
          maxY = Math.max(maxY, cmd.y2);
        }
      }

      if (!isFinite(minX)) {
        minX = minY = 0;
        maxX = maxY = 100;
      }

      const width = Math.max(maxX - minX, 1);
      const height = Math.max(maxY - minY, 1);

      // Translate path to origin
      const translatedCommands = path.commands.map((cmd) => {
        const newCmd = { ...cmd };
        if ('x' in newCmd && 'y' in newCmd) {
          newCmd.x -= minX;
          newCmd.y -= minY;
        }
        if ('x1' in newCmd && 'y1' in newCmd) {
          (newCmd as { x1: number; y1: number }).x1 -= minX;
          (newCmd as { x1: number; y1: number }).y1 -= minY;
        }
        if ('x2' in newCmd && 'y2' in newCmd) {
          (newCmd as { x2: number; y2: number }).x2 -= minX;
          (newCmd as { x2: number; y2: number }).y2 -= minY;
        }
        return newCmd as PathCommand;
      });

      const nodeId = this.sceneGraph.createVector(parentId, {
        name: 'Path',
        x: minX,
        y: minY,
        width,
        height,
        vectorPaths: [{ windingRule: path.windingRule, commands: translatedCommands }],
        fills: [],
        strokes: [solidPaint(rgba(0, 0, 0, 1))],
        strokeWeight: 2,
      });

      this.selectionManager.select([nodeId], 'replace');
      return nodeId;
    });

    // Hand tool for panning
    this.handTool = createHandTool();

    // Register tools
    this.toolManager.registerTool(this.selectTool);
    this.toolManager.registerTool(this.moveTool);
    this.toolManager.registerTool(this.resizeTool);
    this.toolManager.registerTool(this.rotateTool);
    this.toolManager.registerTool(this.rectangleTool);
    this.toolManager.registerTool(this.ellipseTool);
    this.toolManager.registerTool(this.lineTool);
    this.toolManager.registerTool(this.penTool);
    this.toolManager.registerTool(this.handTool);

    // Set default tool
    this.toolManager.setActiveTool('select');
  }

  /**
   * Get the current page ID (first page of document).
   */
  private getCurrentPageId(): NodeId | null {
    const doc = this.sceneGraph.getDocument();
    if (!doc) return null;
    const pageIds = this.sceneGraph.getChildIds(doc.id);
    return pageIds.length > 0 ? pageIds[0]! : null;
  }

  private wireInputHandlers(): void {
    if (!this.pointerHandler || !this.keyboardHandler || !this.toolManager) return;

    // Pointer events
    this.pointerHandler.on('pointerdown', (event) => {
      this.toolManager!.handlePointerDown(event);
    });

    this.pointerHandler.on('pointermove', (event) => {
      this.toolManager!.handlePointerMove(event);
    });

    this.pointerHandler.on('pointerup', (event) => {
      this.toolManager!.handlePointerUp(event);
    });

    this.pointerHandler.on('doubleclick', (event) => {
      this.toolManager!.handleDoubleClick(event);
    });

    this.pointerHandler.on('wheel', (event) => {
      if (!this.canvas) return;

      // Calculate scale factor using universal approach (canvas.width / rect.width)
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      // Handle zoom with wheel
      if (event.ctrlKey || event.metaKey) {
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const currentZoom = this.viewport?.getZoom() ?? 1;
        // Convert CSS offset to canvas pixels
        const canvasX = event.offsetX * scaleX;
        const canvasY = event.offsetY * scaleY;
        this.viewport?.zoomAt(currentZoom * zoomFactor, canvasX, canvasY);
      } else {
        // Pan with wheel (deltaX/Y are CSS pixels, convert to canvas pixels)
        this.viewport?.pan(-event.deltaX * scaleX, -event.deltaY * scaleY);
      }
    });

    // Keyboard shortcuts
    this.keyboardHandler.on('shortcut', ({ action }) => {
      this.handleShortcut(action);
    });

    this.keyboardHandler.on('keydown', (event) => {
      this.toolManager!.handleKeyDown(event);
    });

    this.keyboardHandler.on('keyup', (event) => {
      this.toolManager!.handleKeyUp(event);
    });
  }

  private handleShortcut(action: string): void {
    switch (action) {
      case 'undo':
        this.undo();
        break;
      case 'redo':
        this.redo();
        break;
      case 'selectAll':
        this.selectionManager.selectAll();
        break;
      case 'deselectAll':
        this.clearSelection();
        break;
      case 'delete':
        this.deleteSelection();
        break;
      case 'tool:select':
        this.setTool('select');
        break;
      case 'tool:move':
        this.setTool('move');
        break;
      case 'zoomIn':
        this.viewport?.zoomIn();
        break;
      case 'zoomOut':
        this.viewport?.zoomOut();
        break;
      case 'zoom100':
        this.viewport?.setZoom(1);
        break;
    }
  }

  private deleteSelection(): void {
    const selection = this.selectionManager.getSelectedNodeIds();
    for (const nodeId of selection) {
      this.sceneGraph.deleteNode(nodeId);
    }
    this.clearSelection();
  }

  private setupEventForwarding(): void {
    // Forward selection changes
    this.selectionManager.on('selection:changed', ({ nodeIds }) => {
      if (this.toolManager) {
        this.toolManager.setSelectedNodeIds(nodeIds);
      }
      this.emit('selection:changed', { nodeIds });
    });
  }

  private handleResize = (): void => {
    this.renderer?.resize();
  };
}

/**
 * Create a DesignLibre runtime.
 */
export function createDesignLibreRuntime(options?: RuntimeOptions): DesignLibreRuntime {
  return new DesignLibreRuntime(options);
}
