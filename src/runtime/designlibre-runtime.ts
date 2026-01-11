/**
 * DesignLibre Runtime
 *
 * Main runtime class that coordinates all subsystems.
 */

import type { NodeId } from '@core/types/common';
import type { VectorPath, PathCommand } from '@core/types/geometry';
import { EventEmitter } from '@core/events/event-emitter';
import { SceneGraph, type CreateNodeOptions } from '@scene/graph/scene-graph';
import type { NodeData } from '@scene/nodes/base-node';
import { Renderer, createRenderer } from '@renderer/core/renderer';
import { Viewport } from '@renderer/core/viewport';
import { ToolManager, createToolManager } from '@tools/base/tool-manager';
import { SelectTool, createSelectTool } from '@tools/selection/select-tool';
import { MoveTool, createMoveTool } from '@tools/transform/move-tool';
import { ResizeTool, createResizeTool } from '@tools/transform/resize-tool';
import { RotateTool, createRotateTool } from '@tools/transform/rotate-tool';
import { RectangleTool, createRectangleTool } from '@tools/drawing/rectangle-tool';
import { FrameTool, createFrameTool } from '@tools/drawing/frame-tool';
import { EllipseTool, createEllipseTool } from '@tools/drawing/ellipse-tool';
import { LineTool, createLineTool } from '@tools/drawing/line-tool';
import { PenTool, createPenTool } from '@tools/drawing/pen-tool';
import { PolygonTool, createPolygonTool } from '@tools/drawing/polygon-tool';
import { StarTool, createStarTool } from '@tools/drawing/star-tool';
import { PencilTool, createPencilTool } from '@tools/drawing/pencil-tool';
import { ImageTool, createImageTool } from '@tools/drawing/image-tool';
import { TextTool, createTextTool } from '@tools/drawing/text-tool';
import { PolylineTool, createPolylineTool } from '@tools/drawing/polyline-tool';
import { ArcTool, createArcTool } from '@tools/drawing/arc-tool';
import { CircleTool, createCircleTool } from '@tools/drawing/circle-tool';
import { TextEditTool, createTextEditTool } from '@tools/text';
import { NodeEditTool, createNodeEditTool } from '@tools/path';
import { SnapManager, createSnapManager } from '@tools/snapping';
import { SkewTool, createSkewTool } from '@tools/transform/skew-tool';
import { DimensionTool, createDimensionTool } from '@tools/annotation/dimension-tool';
import { MirrorTool, createMirrorTool, mirrorBounds } from '@tools/modification/mirror-tool';
import {
  ArrayTool,
  createArrayTool,
  calculateRectangularArrayPositions,
  calculatePolarArrayPositions,
} from '@tools/modification/array-tool';
import { TrimTool, createTrimTool } from '@tools/modification/trim-tool';
import { ExtendTool, createExtendTool } from '@tools/modification/extend-tool';
import { FilletTool, createFilletTool } from '@tools/modification/fillet-tool';
import { ChamferTool, createChamferTool } from '@tools/modification/chamfer-tool';
import { ConstructionLineTool, createConstructionLineTool } from '@tools/construction/construction-line-tool';
import { ReferencePointTool, createReferencePointTool } from '@tools/construction/reference-point-tool';
import { HatchTool, createHatchTool } from '@tools/annotation/hatch-tool';
import { BlockInsertionTool, createBlockInsertionTool } from '@tools/block/block-insertion-tool';
import { BlockManager, createBlockManager } from '@/blocks/block-manager';
import { WireTool, createWireTool } from '@tools/schematic/wire-tool';
import { NetLabelTool } from '@tools/schematic/net-label-tool';
import { TrackRoutingTool, createTrackRoutingTool } from '@tools/pcb/track-routing-tool';
import { ViaTool, createViaTool } from '@tools/pcb/via-tool';
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
import { createSeedArchive, readSeedArchive, seedToNode } from '@persistence/seed';
import type { SeedArchive, SeedWriteOptions, SeedNode } from '@persistence/seed';
import { solidPaint } from '@core/types/paint';
import { rgba } from '@core/types/color';
import { StyleManager, createStyleManager } from '@core/styles/style-manager';
import { KeyboardManager, createKeyboardManager } from '@ui/keyboard';
import { ContextMenu, createContextMenu } from '@ui/components/context-menu';
import {
  LibraryComponentRegistry,
  createLibraryComponentRegistry,
  type LibraryComponent,
  type LibraryNodeStructure,
} from '@scene/components/library-component-registry';
import { getAllLibraryComponents } from '@scene/components/library';
import {
  InteractionManager,
  createInteractionManager,
} from '@prototype/interaction-manager';
import {
  VariableManager,
  createVariableManager,
} from '@prototype/variable-manager';
import {
  StateRestorationService,
  createStateRestorationService,
} from '@core/history/state-restoration';
import {
  CheckpointManager,
  createCheckpointManager,
} from '@core/history/checkpoint-manager';
import {
  HistoryPersistenceService,
  createHistoryPersistenceService,
} from '@persistence/history-persistence';
import type { Checkpoint, StateSnapshot } from '@core/types/history';
import { setSemanticMetadata } from '@core/types/semantic-schema';
import {
  suggestSemanticType,
  createSemanticMetadataFromPreset,
} from '@semantic/semantic-presets';

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
  'history:changed': { canUndo: boolean; canRedo: boolean; undoDescription: string | null; redoDescription: string | null };
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
  currentPageId: NodeId | null;
}

/**
 * Middle mouse button pan/zoom state
 */
interface MMBState {
  active: boolean;
  mode: 'pan' | 'zoom' | null;
  startCanvasX: number;
  startCanvasY: number;
  startZoom: number;
}

/**
 * Space key temporary hand tool state
 */
interface SpaceHandState {
  active: boolean;
  previousTool: string | null;
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
  private styleManager: StyleManager;
  private libraryRegistry: LibraryComponentRegistry;
  private interactionManager: InteractionManager;
  private variableManager: VariableManager;
  private stateRestoration: StateRestorationService;
  private checkpointManager: CheckpointManager;
  private historyPersistence: HistoryPersistenceService;

  // Input handlers
  private pointerHandler: PointerHandler | null = null;
  private keyboardHandler: KeyboardHandler | null = null;
  private browserZoomHandler: ((e: WheelEvent) => void) | null = null;
  private keyboardManager: KeyboardManager | null = null;
  private contextMenu: ContextMenu | null = null;

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
  private frameTool: FrameTool | null = null;
  private ellipseTool: EllipseTool | null = null;
  private lineTool: LineTool | null = null;
  private penTool: PenTool | null = null;
  private polygonTool: PolygonTool | null = null;
  private starTool: StarTool | null = null;
  private pencilTool: PencilTool | null = null;
  private imageTool: ImageTool | null = null;
  private textTool: TextTool | null = null;
  private textEditTool: TextEditTool | null = null;
  private nodeEditTool: NodeEditTool | null = null;
  private handTool: HandTool | null = null;
  private polylineTool: PolylineTool | null = null;
  private arcTool: ArcTool | null = null;
  private circleTool: CircleTool | null = null;
  private skewTool: SkewTool | null = null;
  private dimensionTool: DimensionTool | null = null;

  // CAD tools
  private snapManager: SnapManager | null = null;
  private mirrorTool: MirrorTool | null = null;
  private arrayTool: ArrayTool | null = null;
  private trimTool: TrimTool | null = null;
  private extendTool: ExtendTool | null = null;
  private filletTool: FilletTool | null = null;
  private chamferTool: ChamferTool | null = null;
  private constructionLineTool: ConstructionLineTool | null = null;
  private referencePointTool: ReferencePointTool | null = null;
  private hatchTool: HatchTool | null = null;
  private blockInsertionTool: BlockInsertionTool | null = null;
  private blockManager: BlockManager | null = null;
  private wireTool: WireTool | null = null;
  private netLabelTool: NetLabelTool | null = null;
  private trackRoutingTool: TrackRoutingTool | null = null;
  private viaTool: ViaTool | null = null;

  // State
  private state: RuntimeState = {
    initialized: false,
    currentDocumentId: null,
    currentPageId: null,
  };

  // Middle mouse button state for pan/zoom
  private mmbState: MMBState = {
    active: false,
    mode: null,
    startCanvasX: 0,
    startCanvasY: 0,
    startZoom: 1,
  };

  // Space key temporary hand tool state (canonical behavior)
  private spaceHandState: SpaceHandState = {
    active: false,
    previousTool: null,
  };

  // Last used fill color for shapes (default: #D4D2D0)
  private lastUsedFillColor = { r: 0.831, g: 0.824, b: 0.816, a: 1 };

  // Last used stroke color and weight for lines/paths (default: black, 2px)
  private lastUsedStrokeColor = { r: 0, g: 0, b: 0, a: 1 };
  private lastUsedStrokeWeight = 2;

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
    this.styleManager = createStyleManager();

    // Forward undo manager events
    this.undoManager.on('stateChanged', () => {
      this.emit('history:changed', {
        canUndo: this.undoManager.canUndo(),
        canRedo: this.undoManager.canRedo(),
        undoDescription: this.undoManager.getUndoDescription(),
        redoDescription: this.undoManager.getRedoDescription(),
      });
    });

    // Apply undo operations to scene graph
    this.undoManager.on('undo', ({ operation }) => {
      if (operation.type === 'SET_PROPERTY') {
        const updates: Record<string, unknown> = {};
        const path = operation.path[0];
        if (typeof path === 'string') {
          updates[path] = operation.oldValue;
          this.sceneGraph.updateNode(operation.nodeId, updates as Partial<import('@scene/nodes/base-node').NodeData>);
        }
      } else if (operation.type === 'DELETE_NODE') {
        // Undo delete = recreate node
        const op = operation as import('@operations/operation').DeleteNodeOperation & { parentId: NodeId; index: number };
        if (op.deletedNodes.length > 0) {
          const nodeData = op.deletedNodes[0]!;
          // Pass nodeData which includes the original id
          this.sceneGraph.createNode(
            nodeData.type as 'FRAME' | 'GROUP' | 'VECTOR' | 'TEXT' | 'IMAGE' | 'COMPONENT' | 'INSTANCE',
            op.parentId,
            op.index,
            nodeData as Parameters<typeof this.sceneGraph.createNode>[3]
          );
        }
      } else if (operation.type === 'INSERT_NODE') {
        // Undo insert = delete node
        const op = operation as import('@operations/operation').InsertNodeOperation;
        this.sceneGraph.deleteNode(op.nodeId);
      } else if (operation.type === 'MOVE_NODE') {
        // Undo move = move back to old parent/index
        const op = operation as import('@operations/operation').MoveNodeOperation;
        if (op.oldParentId) {
          this.sceneGraph.moveNode(op.nodeId, op.oldParentId, op.oldIndex);
        }
      } else if (operation.type === 'REORDER_CHILDREN') {
        // Undo reorder = reorder back to old index
        const op = operation as import('@operations/operation').ReorderChildrenOperation;
        this.sceneGraph.reorderNode(op.nodeId, op.oldIndex);
      }
    });

    // Apply redo operations to scene graph
    this.undoManager.on('redo', ({ operation }) => {
      if (operation.type === 'SET_PROPERTY') {
        const updates: Record<string, unknown> = {};
        const path = operation.path[0];
        if (typeof path === 'string') {
          updates[path] = operation.newValue;
          this.sceneGraph.updateNode(operation.nodeId, updates as Partial<import('@scene/nodes/base-node').NodeData>);
        }
      } else if (operation.type === 'DELETE_NODE') {
        // Redo delete = delete node again
        this.sceneGraph.deleteNode(operation.nodeId);
      } else if (operation.type === 'INSERT_NODE') {
        // Redo insert = recreate node
        const op = operation as import('@operations/operation').InsertNodeOperation;
        this.sceneGraph.createNode(
          op.node.type as 'FRAME' | 'GROUP' | 'VECTOR' | 'TEXT' | 'IMAGE' | 'COMPONENT' | 'INSTANCE',
          op.parentId,
          op.index,
          op.node as Parameters<typeof this.sceneGraph.createNode>[3]
        );
      } else if (operation.type === 'MOVE_NODE') {
        // Redo move = move to new parent/index
        const op = operation as import('@operations/operation').MoveNodeOperation;
        this.sceneGraph.moveNode(op.nodeId, op.newParentId, op.newIndex);
      } else if (operation.type === 'REORDER_CHILDREN') {
        // Redo reorder = reorder to new index
        const op = operation as import('@operations/operation').ReorderChildrenOperation;
        this.sceneGraph.reorderNode(op.nodeId, op.newIndex);
      }
    });

    // Initialize library component registry with core components
    this.libraryRegistry = createLibraryComponentRegistry();
    this.libraryRegistry.registerAll(getAllLibraryComponents());

    // Initialize interaction manager for prototyping
    this.interactionManager = createInteractionManager();

    // Initialize variable manager for prototype variables
    this.variableManager = createVariableManager();

    // Initialize state restoration and checkpoint services
    this.stateRestoration = createStateRestorationService(
      this.sceneGraph,
      this.selectionManager,
      { snapshotInterval: 10 }
    );
    this.checkpointManager = createCheckpointManager(this.stateRestoration);
    this.historyPersistence = createHistoryPersistenceService();

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

      // Prevent browser zoom on Ctrl+wheel only on the canvas (not on preview/code panels)
      this.browserZoomHandler = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          const target = e.target as HTMLElement;
          // Allow browser zoom on panels (code view, preview, inspector, etc.)
          const isOnPanel = target.closest('.preview-panel, .code-view, .view-switcher-pane, .inspector-panel, .left-sidebar') !== null;
          if (isOnPanel) {
            return; // Allow browser zoom
          }
          // Only prevent on canvas
          if (target === this.canvas || target.closest('canvas') !== null) {
            e.preventDefault();
          }
        }
      };
      document.addEventListener('wheel', this.browserZoomHandler, { passive: false });

      // Initialize keyboard manager for shortcuts
      this.keyboardManager = createKeyboardManager(this);

      // Initialize context menu
      this.contextMenu = createContextMenu(this);

      // Wire input to tools
      this.wireInputHandlers();

      // Set up library component drop handler
      this.setupLibraryDropHandler();

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

  /**
   * Get description of the next undo operation.
   */
  getUndoDescription(): string | null {
    return this.undoManager.getUndoDescription();
  }

  /**
   * Get description of the next redo operation.
   */
  getRedoDescription(): string | null {
    return this.undoManager.getRedoDescription();
  }

  /**
   * Get the undo history (most recent first).
   */
  getUndoHistory(): readonly import('@operations/undo-manager').OperationGroup[] {
    return this.undoManager.getUndoHistory();
  }

  /**
   * Get the redo history (most recent first).
   */
  getRedoHistory(): readonly import('@operations/undo-manager').OperationGroup[] {
    return this.undoManager.getRedoHistory();
  }

  // =========================================================================
  // Checkpoints
  // =========================================================================

  /**
   * Create a named checkpoint at the current state.
   */
  createCheckpoint(name: string, description?: string): Checkpoint {
    return this.checkpointManager.createCheckpoint(name, description);
  }

  /**
   * Delete a checkpoint.
   */
  deleteCheckpoint(id: string): boolean {
    return this.checkpointManager.deleteCheckpoint(id);
  }

  /**
   * Rename a checkpoint.
   */
  renameCheckpoint(id: string, newName: string): boolean {
    return this.checkpointManager.renameCheckpoint(id, newName);
  }

  /**
   * Get all checkpoints.
   */
  getCheckpoints(): Checkpoint[] {
    return this.checkpointManager.getCheckpoints();
  }

  /**
   * Restore state to a checkpoint.
   */
  restoreCheckpoint(id: string): boolean {
    return this.checkpointManager.restoreCheckpoint(id);
  }

  /**
   * Get the checkpoint manager for advanced operations.
   */
  getCheckpointManager(): CheckpointManager {
    return this.checkpointManager;
  }

  // =========================================================================
  // History Persistence
  // =========================================================================

  /**
   * Save current history to IndexedDB.
   */
  async saveHistory(documentId: string): Promise<void> {
    const checkpoints = this.checkpointManager.getCheckpoints();
    await this.historyPersistence.saveHistory(
      documentId,
      this.undoManager.getUndoHistory(),
      this.undoManager.getRedoHistory(),
      checkpoints
    );

    // Save checkpoint snapshots
    for (const checkpoint of checkpoints) {
      const snapshot = this.stateRestoration.getSnapshot(checkpoint.id);
      if (snapshot) {
        await this.historyPersistence.saveSnapshot(documentId, checkpoint.id, snapshot);
      }
    }
  }

  /**
   * Load history from IndexedDB.
   */
  async loadHistory(documentId: string): Promise<boolean> {
    const history = await this.historyPersistence.loadHistory(documentId);
    if (!history) return false;

    // Load snapshots
    const snapshots = await this.historyPersistence.loadSnapshots(documentId);

    // Import checkpoints with snapshots
    this.checkpointManager.importCheckpoints(history.checkpoints, snapshots);

    return true;
  }

  /**
   * Clear saved history for a document.
   */
  async clearSavedHistory(documentId: string): Promise<void> {
    await this.historyPersistence.clearHistory(documentId);
  }

  /**
   * Capture a state snapshot manually.
   */
  captureSnapshot(): StateSnapshot {
    return this.stateRestoration.captureSnapshot();
  }

  /**
   * Restore a state snapshot.
   */
  restoreSnapshot(snapshot: StateSnapshot): void {
    this.stateRestoration.restoreSnapshot(snapshot);
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
  // .seed Format (Open Standard)
  // =========================================================================

  /**
   * Save the current document as a .seed file.
   */
  async saveAsSeed(filename: string = 'document.seed', options?: SeedWriteOptions): Promise<void> {
    const blob = await createSeedArchive(this.sceneGraph, null, options);
    this.downloadBlob(blob, filename);
  }

  /**
   * Get the current document as a .seed Blob.
   */
  async getSeedBlob(options?: SeedWriteOptions): Promise<Blob> {
    return createSeedArchive(this.sceneGraph, null, options);
  }

  /**
   * Load a .seed file and replace the current document with its contents.
   */
  async loadSeed(file: File | Blob): Promise<void> {
    const archive = await readSeedArchive(file);

    // Clear current document and rebuild from archive
    // First, get the document node
    const doc = this.sceneGraph.getDocument();
    if (!doc) {
      throw new Error('No document');
    }

    // Delete all existing pages
    const existingPageIds = this.sceneGraph.getChildIds(doc.id);
    for (const pageId of existingPageIds) {
      this.sceneGraph.deleteNode(pageId);
    }

    // Import pages from archive
    for (const [_pageId, seedPage] of archive.pages) {
      // Create the page
      const newPageId = this.sceneGraph.createNode('PAGE', doc.id, -1, {
        name: seedPage.name,
        backgroundColor: seedPage.backgroundColor,
      } as Parameters<typeof this.sceneGraph.createNode>[3]);

      // Import nodes into this page
      for (const seedNode of seedPage.nodes) {
        this.importSeedNode(seedNode, newPageId);
      }
    }

    // Set current page to the first page
    const newPageIds = this.sceneGraph.getChildIds(doc.id);
    if (newPageIds.length > 0) {
      this.setCurrentPage(newPageIds[0]!);
    }
  }

  /**
   * Recursively import a seed node and its children.
   */
  private importSeedNode(seedNode: SeedNode, parentId: NodeId): NodeId {
    // Use the converter to get proper internal node format
    const nodeData = seedToNode(seedNode);

    // Create the node with converted properties
    const nodeId = this.sceneGraph.createNode(
      seedNode.type as Parameters<typeof this.sceneGraph.createNode>[0],
      parentId,
      -1,
      nodeData as Parameters<typeof this.sceneGraph.createNode>[3]
    );

    // Import children recursively
    const nodeWithChildren = seedNode as { children?: SeedNode[] };
    if (nodeWithChildren.children) {
      for (const childNode of nodeWithChildren.children) {
        this.importSeedNode(childNode, nodeId);
      }
    }

    return nodeId;
  }

  /**
   * Import nodes from a .seed archive into the current page (append mode).
   */
  async importFromSeed(archive: SeedArchive): Promise<NodeId[]> {
    const currentPageId = this.getCurrentPageId();
    if (!currentPageId) {
      throw new Error('No current page');
    }

    const importedIds: NodeId[] = [];

    // Import nodes from the first page of the archive
    const firstPage = archive.pages.values().next().value;
    if (firstPage) {
      for (const seedNode of firstPage.nodes) {
        const nodeId = this.importSeedNode(seedNode, currentPageId);
        importedIds.push(nodeId);
      }
    }

    return importedIds;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
   * Get the undo manager.
   */
  getUndoManager(): UndoManager {
    return this.undoManager;
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

  /**
   * Get the renderer.
   */
  getRenderer(): Renderer | null {
    return this.renderer;
  }

  /**
   * Get the keyboard manager.
   */
  getKeyboardManager(): KeyboardManager | null {
    return this.keyboardManager;
  }

  /**
   * Get the style manager.
   */
  getStyleManager(): StyleManager {
    return this.styleManager;
  }

  /**
   * Get the library component registry.
   */
  getLibraryRegistry(): LibraryComponentRegistry {
    return this.libraryRegistry;
  }

  /**
   * Get the interaction manager.
   */
  getInteractionManager(): InteractionManager {
    return this.interactionManager;
  }

  /**
   * Get the variable manager.
   */
  getVariableManager(): VariableManager {
    return this.variableManager;
  }

  /**
   * Get the polygon tool.
   */
  getPolygonTool(): PolygonTool | null {
    return this.polygonTool;
  }

  /**
   * Get the snap manager.
   */
  getSnapManager(): SnapManager | null {
    return this.snapManager;
  }

  /**
   * Find snap point for a cursor position.
   * Returns the snapped point and snap type, or null if no snap.
   */
  findSnapPoint(cursorX: number, cursorY: number, excludeNodeIds?: NodeId[]): { x: number; y: number; type: string } | null {
    if (!this.snapManager || !this.viewport) return null;

    const zoom = this.viewport.getZoom();
    const excludeSet = excludeNodeIds ? new Set(excludeNodeIds) : undefined;
    const snap = this.snapManager.findSnapPoint({ x: cursorX, y: cursorY }, zoom, excludeSet);

    if (snap) {
      return { x: snap.point.x, y: snap.point.y, type: snap.type };
    }
    return null;
  }

  /**
   * Render snap indicator at the given snap point.
   */
  renderSnapIndicator(ctx: CanvasRenderingContext2D, snap: { x: number; y: number; type: string } | null): void {
    if (!this.snapManager || !this.viewport) return;

    const zoom = this.viewport.getZoom();

    // Always try to render alignment guides for the cursor position
    if (snap) {
      // Find and render alignment guides
      const guides = this.snapManager.findAlignmentGuides({ x: snap.x, y: snap.y }, zoom);
      this.snapManager.renderAlignmentGuides(ctx, guides, zoom);

      // Render the snap indicator
      const snapPoint = {
        point: { x: snap.x, y: snap.y },
        type: snap.type as import('@tools/snapping').SnapType,
        distance: 0,
      };
      this.snapManager.render(ctx, snapPoint, zoom);
    }
  }

  /**
   * Get the mirror tool.
   */
  getMirrorTool(): MirrorTool | null {
    return this.mirrorTool;
  }

  /**
   * Get the array tool.
   */
  getArrayTool(): ArrayTool | null {
    return this.arrayTool;
  }

  /**
   * Get autosave settings.
   */
  getAutosaveSettings(): { enabled: boolean; interval: number } | null {
    return this.autosaveManager?.getSettings() ?? null;
  }

  /**
   * Set autosave enabled state.
   */
  setAutosaveEnabled(enabled: boolean): void {
    if (this.autosaveManager) {
      this.autosaveManager.setEnabled(enabled);
    } else if (enabled && this.options.autosaveInterval) {
      // Create autosave manager if enabling and we have an interval
      this.autosaveManager = createAutosaveManager(
        this.sceneGraph,
        this.serializer,
        this.storage,
        { interval: this.options.autosaveInterval, enabled: true }
      );
      if (this.state.currentDocumentId) {
        this.autosaveManager.start(this.state.currentDocumentId as string);
      }
    }
  }

  /**
   * Set autosave interval.
   */
  setAutosaveInterval(interval: number): void {
    if (this.autosaveManager) {
      this.autosaveManager.setInterval(interval);
    } else if (interval > 0) {
      // Create autosave manager with the new interval
      this.autosaveManager = createAutosaveManager(
        this.sceneGraph,
        this.serializer,
        this.storage,
        { interval, enabled: true }
      );
      if (this.state.currentDocumentId) {
        this.autosaveManager.start(this.state.currentDocumentId as string);
      }
    }
  }

  /**
   * Get the star tool.
   */
  getStarTool(): StarTool | null {
    return this.starTool;
  }

  /**
   * Get the fillet tool.
   */
  getFilletTool(): FilletTool | null {
    return this.filletTool;
  }

  /**
   * Get the chamfer tool.
   */
  getChamferTool(): ChamferTool | null {
    return this.chamferTool;
  }

  /**
   * Get the track routing tool.
   */
  getTrackRoutingTool(): TrackRoutingTool | null {
    return this.trackRoutingTool;
  }

  /**
   * Get the via tool.
   */
  getViaTool(): ViaTool | null {
    return this.viaTool;
  }

  /**
   * Get the last used fill color for shapes.
   */
  getLastUsedFillColor(): { r: number; g: number; b: number; a: number } {
    return { ...this.lastUsedFillColor };
  }

  /**
   * Set the last used fill color for shapes.
   */
  setLastUsedFillColor(color: { r: number; g: number; b: number; a: number }): void {
    this.lastUsedFillColor = { ...color };
  }

  /**
   * Get the last used stroke color for lines/paths.
   */
  getLastUsedStrokeColor(): { r: number; g: number; b: number; a: number } {
    return { ...this.lastUsedStrokeColor };
  }

  /**
   * Set the last used stroke color for lines/paths.
   */
  setLastUsedStrokeColor(color: { r: number; g: number; b: number; a: number }): void {
    this.lastUsedStrokeColor = { ...color };
  }

  /**
   * Get the last used stroke weight for lines/paths.
   */
  getLastUsedStrokeWeight(): number {
    return this.lastUsedStrokeWeight;
  }

  /**
   * Set the last used stroke weight for lines/paths.
   */
  setLastUsedStrokeWeight(weight: number): void {
    this.lastUsedStrokeWeight = weight;
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  /**
   * Dispose of the runtime.
   */
  dispose(): void {
    window.removeEventListener('resize', this.handleResize);

    // Remove browser zoom prevention listener
    if (this.browserZoomHandler) {
      document.removeEventListener('wheel', this.browserZoomHandler);
      this.browserZoomHandler = null;
    }

    this.autosaveManager?.dispose();
    this.pointerHandler?.dispose();
    this.keyboardHandler?.dispose();
    this.keyboardManager?.dispose();
    this.contextMenu?.dispose();
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
      onMoveEnd: (operations) => {
        // Record move operations for undo/redo
        if (operations.length > 0) {
          this.undoManager.beginGroup('Move');
          for (const op of operations) {
            this.undoManager.push({
              id: `movex_${op.nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
              type: 'SET_PROPERTY',
              timestamp: Date.now(),
              clientId: 'local',
              nodeId: op.nodeId,
              path: ['x'],
              oldValue: op.startX,
              newValue: op.endX,
            });
            this.undoManager.push({
              id: `movey_${op.nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
              type: 'SET_PROPERTY',
              timestamp: Date.now(),
              clientId: 'local',
              nodeId: op.nodeId,
              path: ['y'],
              oldValue: op.startY,
              newValue: op.endY,
            });
          }
          this.undoManager.endGroup();
        }
      },
      onResizeEnd: (op) => {
        // Record resize operation for undo/redo
        this.undoManager.beginGroup('Resize');
        this.undoManager.push({
          id: `resizex_${op.nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
          type: 'SET_PROPERTY',
          timestamp: Date.now(),
          clientId: 'local',
          nodeId: op.nodeId,
          path: ['x'],
          oldValue: op.startX,
          newValue: op.endX,
        });
        this.undoManager.push({
          id: `resizey_${op.nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
          type: 'SET_PROPERTY',
          timestamp: Date.now(),
          clientId: 'local',
          nodeId: op.nodeId,
          path: ['y'],
          oldValue: op.startY,
          newValue: op.endY,
        });
        this.undoManager.push({
          id: `resizew_${op.nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
          type: 'SET_PROPERTY',
          timestamp: Date.now(),
          clientId: 'local',
          nodeId: op.nodeId,
          path: ['width'],
          oldValue: op.startWidth,
          newValue: op.endWidth,
        });
        this.undoManager.push({
          id: `resizeh_${op.nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
          type: 'SET_PROPERTY',
          timestamp: Date.now(),
          clientId: 'local',
          nodeId: op.nodeId,
          path: ['height'],
          oldValue: op.startHeight,
          newValue: op.endHeight,
        });
        this.undoManager.endGroup();
      },
      onRotationEnd: (operations) => {
        // Record rotation operations for undo/redo
        if (operations.length > 0) {
          this.undoManager.beginGroup('Rotate');
          for (const op of operations) {
            // Create SET_PROPERTY operations for rotation and position
            this.undoManager.push({
              id: `rot_${op.nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
              type: 'SET_PROPERTY',
              timestamp: Date.now(),
              clientId: 'local',
              nodeId: op.nodeId,
              path: ['rotation'],
              oldValue: op.startRotation,
              newValue: op.endRotation,
            });
            this.undoManager.push({
              id: `rotx_${op.nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
              type: 'SET_PROPERTY',
              timestamp: Date.now(),
              clientId: 'local',
              nodeId: op.nodeId,
              path: ['x'],
              oldValue: op.startX,
              newValue: op.endX,
            });
            this.undoManager.push({
              id: `roty_${op.nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
              type: 'SET_PROPERTY',
              timestamp: Date.now(),
              clientId: 'local',
              nodeId: op.nodeId,
              path: ['y'],
              oldValue: op.startY,
              newValue: op.endY,
            });
          }
          this.undoManager.endGroup();
        }
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

    // Rectangle tool - creates FRAME nodes with cornerRadius support
    this.rectangleTool = createRectangleTool();
    this.rectangleTool.setOnRectComplete((rect, cornerRadius) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      // Create a FRAME node (supports cornerRadius for rounded rectangles)
      const nodeId = this.sceneGraph.createFrame(parentId, {
        name: 'Rectangle',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        cornerRadius: cornerRadius,
        fills: [solidPaint(rgba(this.lastUsedFillColor.r, this.lastUsedFillColor.g, this.lastUsedFillColor.b, this.lastUsedFillColor.a))],
      });

      // Record for undo
      this.recordNodeInsertion(nodeId, parentId, 'Rectangle');

      this.selectionManager.select([nodeId], 'replace');

      // Canonical behavior: return to Select tool after creating object
      this.setTool('select');

      return nodeId;
    });

    // Wire snapping to rectangle tool
    this.rectangleTool.setOnFindSnap((x, y) => this.findSnapPoint(x, y));
    this.rectangleTool.setOnRenderSnap((ctx, snap) => this.renderSnapIndicator(ctx, snap));

    // Frame tool (creates actual frame container)
    this.frameTool = createFrameTool();
    this.frameTool.setOnFrameComplete((rect) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      const nodeId = this.sceneGraph.createFrame(parentId, {
        name: 'Frame',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        fills: [solidPaint(rgba(1, 1, 1, 1))], // White background
      });

      // Record for undo
      this.recordNodeInsertion(nodeId, parentId, 'Frame');

      this.selectionManager.select([nodeId], 'replace');

      // Canonical behavior: return to Select tool after creating object
      this.setTool('select');

      return nodeId;
    });

    // Wire snapping to frame tool
    this.frameTool.setOnFindSnap((x, y) => this.findSnapPoint(x, y));
    this.frameTool.setOnRenderSnap((ctx, snap) => this.renderSnapIndicator(ctx, snap));

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
        fills: [solidPaint(rgba(this.lastUsedFillColor.r, this.lastUsedFillColor.g, this.lastUsedFillColor.b, this.lastUsedFillColor.a))],
      });

      // Record for undo
      this.recordNodeInsertion(nodeId, parentId, 'Ellipse');

      this.selectionManager.select([nodeId], 'replace');

      // Canonical behavior: return to Select tool after creating object
      this.setTool('select');

      return nodeId;
    });

    // Wire snapping to ellipse tool
    this.ellipseTool.setOnFindSnap((x, y) => this.findSnapPoint(x, y));
    this.ellipseTool.setOnRenderSnap((ctx, snap) => this.renderSnapIndicator(ctx, snap));

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
        strokes: [solidPaint(rgba(this.lastUsedStrokeColor.r, this.lastUsedStrokeColor.g, this.lastUsedStrokeColor.b, this.lastUsedStrokeColor.a))],
        strokeWeight: this.lastUsedStrokeWeight,
      });

      // Record for undo
      this.recordNodeInsertion(nodeId, parentId, 'Line');

      this.selectionManager.select([nodeId], 'replace');

      // Canonical behavior: return to Select tool after creating object
      this.setTool('select');

      return nodeId;
    });

    // Wire snapping to line tool
    this.lineTool.setOnFindSnap((x, y) => this.findSnapPoint(x, y));
    this.lineTool.setOnRenderSnap((ctx, snap) => this.renderSnapIndicator(ctx, snap));

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
        strokes: [solidPaint(rgba(this.lastUsedStrokeColor.r, this.lastUsedStrokeColor.g, this.lastUsedStrokeColor.b, this.lastUsedStrokeColor.a))],
        strokeWeight: this.lastUsedStrokeWeight,
      });

      // Record for undo
      this.recordNodeInsertion(nodeId, parentId, 'Path');

      this.selectionManager.select([nodeId], 'replace');

      // Canonical behavior: return to Select tool after creating object
      this.setTool('select');

      return nodeId;
    });

    // Wire snapping to pen tool
    this.penTool.setOnFindSnap((x, y) => this.findSnapPoint(x, y));
    this.penTool.setOnRenderSnap((ctx, snap) => this.renderSnapIndicator(ctx, snap));

    // Polygon tool
    this.polygonTool = createPolygonTool();
    this.polygonTool.setOnPolygonComplete((polygon) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      // Create path from polygon vertices
      const commands: PathCommand[] = [];
      if (polygon.vertices.length > 0) {
        // Translate vertices to local coordinates
        const minX = polygon.bounds.x;
        const minY = polygon.bounds.y;

        commands.push({ type: 'M', x: polygon.vertices[0]!.x - minX, y: polygon.vertices[0]!.y - minY });
        for (let i = 1; i < polygon.vertices.length; i++) {
          commands.push({ type: 'L', x: polygon.vertices[i]!.x - minX, y: polygon.vertices[i]!.y - minY });
        }
        commands.push({ type: 'Z' });
      }

      const path: VectorPath = { windingRule: 'NONZERO', commands };

      const nodeId = this.sceneGraph.createVector(parentId, {
        name: `Polygon (${polygon.sides} sides)`,
        x: polygon.bounds.x,
        y: polygon.bounds.y,
        width: polygon.bounds.width,
        height: polygon.bounds.height,
        vectorPaths: [path],
        fills: [solidPaint(rgba(this.lastUsedFillColor.r, this.lastUsedFillColor.g, this.lastUsedFillColor.b, this.lastUsedFillColor.a))],
      });

      // Record for undo
      this.recordNodeInsertion(nodeId, parentId, 'Polygon');

      this.selectionManager.select([nodeId], 'replace');

      // Canonical behavior: return to Select tool after creating object
      this.setTool('select');

      return nodeId;
    });

    // Wire snapping to polygon tool
    this.polygonTool.setOnFindSnap((x, y) => this.findSnapPoint(x, y));
    this.polygonTool.setOnRenderSnap((ctx, snap) => this.renderSnapIndicator(ctx, snap));

    // Star tool
    this.starTool = createStarTool();
    this.starTool.setOnStarComplete((star) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      // Create path from star vertices
      const commands: PathCommand[] = [];
      if (star.vertices.length > 0) {
        // Translate vertices to local coordinates
        const minX = star.bounds.x;
        const minY = star.bounds.y;

        commands.push({ type: 'M', x: star.vertices[0]!.x - minX, y: star.vertices[0]!.y - minY });
        for (let i = 1; i < star.vertices.length; i++) {
          commands.push({ type: 'L', x: star.vertices[i]!.x - minX, y: star.vertices[i]!.y - minY });
        }
        commands.push({ type: 'Z' });
      }

      const path: VectorPath = { windingRule: 'NONZERO', commands };

      const nodeId = this.sceneGraph.createVector(parentId, {
        name: `Star (${star.points} points)`,
        x: star.bounds.x,
        y: star.bounds.y,
        width: star.bounds.width,
        height: star.bounds.height,
        vectorPaths: [path],
        fills: [solidPaint(rgba(this.lastUsedFillColor.r, this.lastUsedFillColor.g, this.lastUsedFillColor.b, this.lastUsedFillColor.a))],
      });

      // Record for undo
      this.recordNodeInsertion(nodeId, parentId, 'Star');

      this.selectionManager.select([nodeId], 'replace');

      // Canonical behavior: return to Select tool after creating object
      this.setTool('select');

      return nodeId;
    });

    // Wire snapping to star tool
    this.starTool.setOnFindSnap((x, y) => this.findSnapPoint(x, y));
    this.starTool.setOnRenderSnap((ctx, snap) => this.renderSnapIndicator(ctx, snap));

    // Pencil tool (freehand drawing)
    this.pencilTool = createPencilTool();
    this.pencilTool.setOnPathComplete((data) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      // Translate path to local coordinates
      const minX = data.bounds.x;
      const minY = data.bounds.y;

      const translatedCommands = data.path.commands.map((cmd) => {
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
        name: 'Freehand',
        x: minX,
        y: minY,
        width: data.bounds.width,
        height: data.bounds.height,
        vectorPaths: [{ windingRule: data.path.windingRule, commands: translatedCommands }],
        fills: [],
        strokes: [solidPaint(rgba(this.lastUsedStrokeColor.r, this.lastUsedStrokeColor.g, this.lastUsedStrokeColor.b, this.lastUsedStrokeColor.a))],
        strokeWeight: this.lastUsedStrokeWeight,
      });

      // Record for undo
      this.recordNodeInsertion(nodeId, parentId, 'Freehand');

      this.selectionManager.select([nodeId], 'replace');

      // Canonical behavior: return to Select tool after creating object
      this.setTool('select');

      return nodeId;
    });

    // Image tool
    this.imageTool = createImageTool();
    this.imageTool.setOnImagePlace((data) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      const width = data.naturalWidth ?? 200;
      const height = data.naturalHeight ?? 200;

      // Create an IMAGE node with the data URL
      const nodeId = this.sceneGraph.createImage(parentId, {
        name: data.file.name,
        x: data.position.x,
        y: data.position.y,
        width,
        height,
        imageRef: data.dataUrl,
        naturalWidth: width,
        naturalHeight: height,
        scaleMode: 'FILL',
      });

      // Record for undo
      this.recordNodeInsertion(nodeId, parentId, 'Image');

      this.selectionManager.select([nodeId], 'replace');

      // Canonical behavior: return to Select tool after creating object
      this.setTool('select');

      return nodeId;
    });

    // Text tool
    this.textTool = createTextTool();
    this.textTool.setOnTextComplete((position, width) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      const nodeId = this.sceneGraph.createText(parentId, {
        name: 'Text',
        x: position.x,
        y: position.y,
        width: width ?? 100,
        characters: '', // Start with empty text
      });

      // Set default fill (black text)
      this.sceneGraph.updateNode(nodeId, {
        fills: [solidPaint(rgba(0, 0, 0, 1))],
      });

      // Record for undo (after all updates applied)
      this.recordNodeInsertion(nodeId, parentId, 'Text');

      this.selectionManager.select([nodeId], 'replace');

      // Enter text editing mode with cursor ready for input
      if (this.textEditTool) {
        this.setTool('text-edit');
        this.textEditTool.startEditing(nodeId, '', 0);
      } else {
        // Fallback: return to Select tool if text-edit tool not available
        this.setTool('select');
      }

      return nodeId;
    });

    // Wire snapping to text tool (no render callback - text tool doesn't have preview rendering)
    this.textTool.setOnFindSnap((x, y) => this.findSnapPoint(x, y));

    // Text edit tool
    this.textEditTool = createTextEditTool();
    this.textEditTool.setOnTextUpdate((nodeId, text) => {
      // Update the text node in the scene graph
      // Note: Only update the characters, not the name - user may want a custom layer name
      this.sceneGraph.updateNode(nodeId, {
        characters: text,
      });
    });
    this.textEditTool.setOnEditEnd(() => {
      // Return to select tool when editing ends
      this.setTool('select');
    });

    // Node edit tool for editing vector paths
    this.nodeEditTool = createNodeEditTool();
    this.nodeEditTool.setOnPathChange((nodeId, path) => {
      // Update the vector paths in the scene graph
      this.sceneGraph.updateNode(nodeId, {
        vectorPaths: [path],
      });
    });
    // Note: selection changes are handled through the selection manager

    // Hand tool for panning
    this.handTool = createHandTool();

    // Polyline tool
    this.polylineTool = createPolylineTool();
    this.polylineTool.setOnPolylineComplete((path, points, closed) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      // Calculate bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }

      const nodeId = this.sceneGraph.createVector(parentId, {
        name: closed ? 'Polygon' : 'Polyline',
        x: minX,
        y: minY,
        width: maxX - minX || 1,
        height: maxY - minY || 1,
        vectorPaths: [path],
        fills: closed ? [solidPaint(rgba(this.lastUsedFillColor.r, this.lastUsedFillColor.g, this.lastUsedFillColor.b, this.lastUsedFillColor.a))] : [],
        strokes: [solidPaint(rgba(this.lastUsedStrokeColor.r, this.lastUsedStrokeColor.g, this.lastUsedStrokeColor.b, this.lastUsedStrokeColor.a))],
        strokeWeight: this.lastUsedStrokeWeight,
      });

      // Record for undo
      this.recordNodeInsertion(nodeId, parentId, 'Polyline');

      this.selectionManager.select([nodeId], 'replace');
      this.setTool('select');
      return nodeId;
    });

    // Wire snapping to polyline tool
    this.polylineTool.setOnFindSnap((x, y) => this.findSnapPoint(x, y));
    this.polylineTool.setOnRenderSnap((ctx, snap) => this.renderSnapIndicator(ctx, snap));

    // Arc tool
    this.arcTool = createArcTool();
    this.arcTool.setOnArcComplete((path, bounds) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      const nodeId = this.sceneGraph.createVector(parentId, {
        name: 'Arc',
        x: bounds.x,
        y: bounds.y,
        width: bounds.width || 1,
        height: bounds.height || 1,
        vectorPaths: [path],
        fills: [],
        strokes: [solidPaint(rgba(this.lastUsedStrokeColor.r, this.lastUsedStrokeColor.g, this.lastUsedStrokeColor.b, this.lastUsedStrokeColor.a))],
        strokeWeight: this.lastUsedStrokeWeight,
      });

      // Record for undo
      this.recordNodeInsertion(nodeId, parentId, 'Arc');

      this.selectionManager.select([nodeId], 'replace');
      this.setTool('select');
      return nodeId;
    });

    // Wire snapping to arc tool
    this.arcTool.setOnFindSnap((x, y) => this.findSnapPoint(x, y));
    this.arcTool.setOnRenderSnap((ctx, snap) => this.renderSnapIndicator(ctx, snap));

    // Circle tool (with multiple modes)
    this.circleTool = createCircleTool();
    this.circleTool.setOnCircleComplete((path, bounds) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return null;

      const nodeId = this.sceneGraph.createVector(parentId, {
        name: 'Circle',
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        vectorPaths: [path],
        fills: [solidPaint(rgba(this.lastUsedFillColor.r, this.lastUsedFillColor.g, this.lastUsedFillColor.b, this.lastUsedFillColor.a))],
      });

      // Record for undo
      this.recordNodeInsertion(nodeId, parentId, 'Circle');

      this.selectionManager.select([nodeId], 'replace');
      this.setTool('select');
      return nodeId;
    });

    // Wire snapping to circle tool
    this.circleTool.setOnFindSnap((x, y) => this.findSnapPoint(x, y));
    this.circleTool.setOnRenderSnap((ctx, snap) => this.renderSnapIndicator(ctx, snap));

    // Snap manager - configured for CAD precision
    this.snapManager = createSnapManager({
      endpoint: true,
      midpoint: true,
      center: true,
      intersection: true,
      grid: true,
      gridSize: 10,
      aperture: 15,
    });

    // Update snap manager when nodes change
    this.sceneGraph.on('node:created', () => this.updateSnapManagerNodes());
    this.sceneGraph.on('node:deleted', () => this.updateSnapManagerNodes());
    this.sceneGraph.on('node:propertyChanged', () => this.updateSnapManagerNodes());

    // Wire snap context to tool manager for select tool snapping
    if (this.toolManager && this.snapManager) {
      const snapManager = this.snapManager;
      const viewport = this.viewport;
      this.toolManager.setSnapContext({
        findSnapPoint: (x: number, y: number, excludeNodeIds?: NodeId[]) => {
          if (!viewport) return null;
          const zoom = viewport.getZoom();
          const excludeSet = excludeNodeIds ? new Set(excludeNodeIds) : undefined;
          const snap = snapManager.findSnapPoint({ x, y }, zoom, excludeSet);
          if (snap) {
            return { x: snap.point.x, y: snap.point.y, type: snap.type };
          }
          return null;
        },
        findAlignmentGuides: (x: number, y: number, excludeNodeIds?: NodeId[]) => {
          if (!viewport) return [];
          const zoom = viewport.getZoom();
          const excludeSet = excludeNodeIds ? new Set(excludeNodeIds) : undefined;
          const guides = snapManager.findAlignmentGuides({ x, y }, zoom, excludeSet);
          return guides.map(g => ({
            type: g.type,
            position: g.position,
            start: g.start,
            end: g.end,
          }));
        },
        isEnabled: () => snapManager.isEnabled(),
      });
    }

    // Mirror tool - mirrors selected nodes (in place or copy)
    this.mirrorTool = createMirrorTool();
    this.mirrorTool.setOnMirror((nodeIds, options) => {
      const newIds: NodeId[] = [];

      for (const nodeId of nodeIds) {
        const node = this.sceneGraph.getNode(nodeId);
        if (!node || !('x' in node)) continue;

        const frameNode = node as { x: number; y: number; width?: number; height?: number };
        const bounds = { x: frameNode.x ?? 0, y: frameNode.y ?? 0, width: frameNode.width ?? 0, height: frameNode.height ?? 0 };
        const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
        const newBounds = mirrorBounds(frameNode as any, options.axis, center, options.axisPoints);

        if (options.copy) {
          // Create a mirrored copy
          const newId = this.sceneGraph.duplicateNode(nodeId, {
            x: newBounds.x - bounds.x,
            y: newBounds.y - bounds.y,
          });
          if (newId) newIds.push(newId);
        } else {
          // Mirror in place
          this.sceneGraph.updateNode(nodeId, { x: newBounds.x, y: newBounds.y });
        }
      }
      return { originalIds: nodeIds, newIds, success: true };
    });

    // Array tool - creates arrays of nodes
    this.arrayTool = createArrayTool();
    this.arrayTool.setOnArray((nodeIds, options) => {
      const allNewIds: NodeId[] = [];

      for (const nodeId of nodeIds) {
        const node = this.sceneGraph.getNode(nodeId);
        if (!node || !('x' in node)) continue;

        const frameNode = node as { x: number; y: number; width?: number; height?: number };
        const basePos = { x: frameNode.x ?? 0, y: frameNode.y ?? 0 };

        if (options.type === 'rectangular') {
          // Calculate positions for rectangular array
          const positions = calculateRectangularArrayPositions(basePos, options);

          // Create duplicates at each position
          for (const pos of positions) {
            const newId = this.sceneGraph.duplicateNode(nodeId, {
              x: pos.x - basePos.x,
              y: pos.y - basePos.y,
            });
            if (newId) allNewIds.push(newId);
          }
        } else if (options.type === 'polar') {
          // Calculate positions for polar array
          const positions = calculatePolarArrayPositions(basePos, options);

          // Create duplicates at each position with optional rotation
          for (const { position, rotation } of positions) {
            const newId = this.sceneGraph.duplicateNode(nodeId, {
              x: position.x - basePos.x,
              y: position.y - basePos.y,
            });
            if (newId && rotation !== 0) {
              // Apply rotation if rotateItems is enabled
              const newNode = this.sceneGraph.getNode(newId);
              if (newNode && 'rotation' in newNode) {
                const currentRotation = (newNode.rotation as number) ?? 0;
                this.sceneGraph.updateNode(newId, { rotation: currentRotation + rotation });
              }
            }
            if (newId) allNewIds.push(newId);
          }
        }
      }

      return {
        originalIds: nodeIds,
        newIds: allNewIds,
        copyCount: allNewIds.length,
        success: true,
      };
    });

    // Skew tool - applies horizontal/vertical shear transforms
    this.skewTool = createSkewTool({
      onSkewUpdate: (nodeId, skewX, skewY) => {
        // Skew is stored as custom properties - not yet part of standard NodeData
        // For now, log the skew values - full integration requires extending node types
        console.log('Skew update:', nodeId, { skewX, skewY });
        // TODO: When node types support skew, uncomment:
        // this.sceneGraph.updateNode(nodeId, { skewX, skewY });
      },
    });

    // Dimension tool - creates linear/angular/radial dimensions
    this.dimensionTool = createDimensionTool({
      onDimensionCreate: (data, startPoint, endPoint) => {
        // For now, create a visual representation as a vector path
        // In the future, this would create a proper DIMENSION node type
        const pageId = this.getCurrentPageId();
        if (!pageId) return;

        // Create dimension as annotation (vector group for now)
        console.log('Dimension created:', {
          type: data.dimensionType,
          orientation: data.orientation,
          offset: data.offset,
          startPoint,
          endPoint,
        });
      },
    });

    // CAD Modification Tools
    this.trimTool = createTrimTool();
    this.extendTool = createExtendTool();
    this.filletTool = createFilletTool({ radius: 10 });
    this.chamferTool = createChamferTool({ distance1: 10, distance2: 10 });

    // Construction Tools
    this.constructionLineTool = createConstructionLineTool();
    this.referencePointTool = createReferencePointTool();

    // Hatch Tool
    this.hatchTool = createHatchTool();

    // Block Tools
    this.blockInsertionTool = createBlockInsertionTool();
    this.blockManager = createBlockManager();

    // Schematic Tools
    this.wireTool = createWireTool();
    this.wireTool.setOnWireCreate((result) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return;

      // Create a VECTOR node for each wire segment
      for (const wire of result.wires) {
        const minX = Math.min(wire.start.x, wire.end.x);
        const minY = Math.min(wire.start.y, wire.end.y);
        const width = Math.abs(wire.end.x - wire.start.x) || 1;
        const height = Math.abs(wire.end.y - wire.start.y) || 1;

        // Create path relative to bounding box
        const wirePath: VectorPath = {
          windingRule: 'NONZERO',
          commands: [
            { type: 'M', x: wire.start.x - minX, y: wire.start.y - minY },
            { type: 'L', x: wire.end.x - minX, y: wire.end.y - minY },
          ] as PathCommand[],
        };

        const nodeId = this.sceneGraph.createVector(parentId, {
          name: 'Wire',
          x: minX,
          y: minY,
          width,
          height,
          vectorPaths: [wirePath],
          strokes: [solidPaint(rgba(0, 0.8, 0, 1))],
          strokeWeight: wire.style.width,
        });

        // Record for undo
        this.recordNodeInsertion(nodeId, parentId, 'Draw Wire');
      }

      // Create junction dots as small filled circles
      for (const junction of result.junctions) {
        const radius = junction.style.radius;
        const size = radius * 2;
        // Create ellipse path for junction dot
        const junctionPath: VectorPath = {
          windingRule: 'NONZERO',
          commands: [
            { type: 'M', x: size, y: radius },
            { type: 'C', x1: size, y1: radius + radius * 0.552, x2: radius + radius * 0.552, y2: size, x: radius, y: size },
            { type: 'C', x1: radius - radius * 0.552, y1: size, x2: 0, y2: radius + radius * 0.552, x: 0, y: radius },
            { type: 'C', x1: 0, y1: radius - radius * 0.552, x2: radius - radius * 0.552, y2: 0, x: radius, y: 0 },
            { type: 'C', x1: radius + radius * 0.552, y1: 0, x2: size, y2: radius - radius * 0.552, x: size, y: radius },
            { type: 'Z' },
          ] as PathCommand[],
        };
        const nodeId = this.sceneGraph.createVector(parentId, {
          name: 'Junction',
          x: junction.position.x - radius,
          y: junction.position.y - radius,
          width: size,
          height: size,
          vectorPaths: [junctionPath],
          fills: [solidPaint(rgba(0, 0.8, 0, 1))],
        });
        this.recordNodeInsertion(nodeId, parentId, 'Create Junction');
      }
    });

    this.netLabelTool = new NetLabelTool();
    this.netLabelTool.setOnLabelPlace((result) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return;

      const label = result.label;
      const nodeId = this.sceneGraph.createText(parentId, {
        name: `Net: ${label.text}`,
        x: label.position.x,
        y: label.position.y,
        characters: label.text,
        fills: [solidPaint(rgba(
          label.style.textColor.r,
          label.style.textColor.g,
          label.style.textColor.b,
          label.style.textColor.a
        ))],
      });

      // Apply rotation if needed
      if (label.rotation !== 0) {
        this.sceneGraph.updateNode(nodeId, { rotation: label.rotation });
      }

      this.recordNodeInsertion(nodeId, parentId, 'Place Net Label');
    });
    this.netLabelTool.setOnPreviewUpdate(() => {
      // Render loop handles updates automatically
    });

    // Block Tools callback
    this.blockInsertionTool.setOnInsert((instance) => {
      const parentId = this.getCurrentPageId();
      if (!parentId) return;

      // Get block definition from block manager
      const blockDef = this.blockManager?.getBlock(instance.blockId);
      if (!blockDef) {
        console.warn(`Block definition not found: ${instance.blockId}`);
        return;
      }

      // Create a frame to contain the block instance
      const frameId = this.sceneGraph.createFrame(parentId, {
        name: instance.name || blockDef.name,
        x: instance.position.x,
        y: instance.position.y,
        width: 100,
        height: 100,
      });

      // Apply rotation after creation if needed
      if (instance.rotation !== 0) {
        this.sceneGraph.updateNode(frameId, { rotation: instance.rotation });
      }

      // Clone block geometry into the frame
      for (const geomNode of blockDef.geometry) {
        const node = geomNode as unknown as Record<string, unknown>;
        const nodeType = node['type'] as string;

        if (nodeType === 'RECTANGLE') {
          const rx = ((node['x'] as number) || 0) * instance.scale.x;
          const ry = ((node['y'] as number) || 0) * instance.scale.y;
          const rw = ((node['width'] as number) || 10) * Math.abs(instance.scale.x);
          const rh = ((node['height'] as number) || 10) * Math.abs(instance.scale.y);
          // Create rectangle as a vector path
          const rectPath: VectorPath = {
            windingRule: 'NONZERO',
            commands: [
              { type: 'M', x: 0, y: 0 },
              { type: 'L', x: rw, y: 0 },
              { type: 'L', x: rw, y: rh },
              { type: 'L', x: 0, y: rh },
              { type: 'Z' },
            ] as PathCommand[],
          };
          this.sceneGraph.createVector(frameId, {
            name: (node['name'] as string) || 'Rectangle',
            x: rx,
            y: ry,
            width: rw,
            height: rh,
            vectorPaths: [rectPath],
            fills: [solidPaint(rgba(0.8, 0.8, 0.8, 1))],
          });
        } else if (nodeType === 'ELLIPSE') {
          const ex = ((node['x'] as number) || 0) * instance.scale.x;
          const ey = ((node['y'] as number) || 0) * instance.scale.y;
          const ew = ((node['width'] as number) || 10) * Math.abs(instance.scale.x);
          const eh = ((node['height'] as number) || 10) * Math.abs(instance.scale.y);
          const rx = ew / 2;
          const ry = eh / 2;
          // Create ellipse as bezier curves (approximation)
          const k = 0.552284749831;
          const ellipsePath: VectorPath = {
            windingRule: 'NONZERO',
            commands: [
              { type: 'M', x: ew, y: ry },
              { type: 'C', x1: ew, y1: ry + ry * k, x2: rx + rx * k, y2: eh, x: rx, y: eh },
              { type: 'C', x1: rx - rx * k, y1: eh, x2: 0, y2: ry + ry * k, x: 0, y: ry },
              { type: 'C', x1: 0, y1: ry - ry * k, x2: rx - rx * k, y2: 0, x: rx, y: 0 },
              { type: 'C', x1: rx + rx * k, y1: 0, x2: ew, y2: ry - ry * k, x: ew, y: ry },
              { type: 'Z' },
            ] as PathCommand[],
          };
          this.sceneGraph.createVector(frameId, {
            name: (node['name'] as string) || 'Ellipse',
            x: ex,
            y: ey,
            width: ew,
            height: eh,
            vectorPaths: [ellipsePath],
            fills: [solidPaint(rgba(0.8, 0.8, 0.8, 1))],
          });
        } else if (nodeType === 'LINE' || nodeType === 'VECTOR') {
          const x1 = (node['x1'] as number) || 0;
          const y1 = (node['y1'] as number) || 0;
          const x2 = (node['x2'] as number) || 10;
          const y2 = (node['y2'] as number) || 0;
          const minX = Math.min(x1, x2) * instance.scale.x;
          const minY = Math.min(y1, y2) * instance.scale.y;
          const w = Math.abs(x2 - x1) * Math.abs(instance.scale.x) || 1;
          const h = Math.abs(y2 - y1) * Math.abs(instance.scale.y) || 1;

          const linePath: VectorPath = {
            windingRule: 'NONZERO',
            commands: [
              { type: 'M', x: (x1 - Math.min(x1, x2)) * Math.abs(instance.scale.x), y: (y1 - Math.min(y1, y2)) * Math.abs(instance.scale.y) },
              { type: 'L', x: (x2 - Math.min(x1, x2)) * Math.abs(instance.scale.x), y: (y2 - Math.min(y1, y2)) * Math.abs(instance.scale.y) },
            ] as PathCommand[],
          };
          this.sceneGraph.createVector(frameId, {
            name: (node['name'] as string) || 'Line',
            x: minX,
            y: minY,
            width: w,
            height: h,
            vectorPaths: [linePath],
            strokes: [solidPaint(rgba(0, 0, 0, 1))],
          });
        } else if (nodeType === 'TEXT') {
          this.sceneGraph.createText(frameId, {
            name: (node['name'] as string) || 'Text',
            x: ((node['x'] as number) || 0) * instance.scale.x,
            y: ((node['y'] as number) || 0) * instance.scale.y,
            characters: (node['characters'] as string) || '',
          });
        }
      }

      this.recordNodeInsertion(frameId, parentId, 'Insert Block');
    });

    // PCB Tools
    this.trackRoutingTool = createTrackRoutingTool();
    this.viaTool = createViaTool();

    // Register tools
    this.toolManager.registerTool(this.selectTool);
    this.toolManager.registerTool(this.moveTool);
    this.toolManager.registerTool(this.resizeTool);
    this.toolManager.registerTool(this.rotateTool);
    this.toolManager.registerTool(this.rectangleTool);
    this.toolManager.registerTool(this.frameTool);
    this.toolManager.registerTool(this.ellipseTool);
    this.toolManager.registerTool(this.lineTool);
    this.toolManager.registerTool(this.penTool);
    this.toolManager.registerTool(this.polygonTool);
    this.toolManager.registerTool(this.starTool);
    this.toolManager.registerTool(this.pencilTool);
    this.toolManager.registerTool(this.imageTool);
    this.toolManager.registerTool(this.textTool);
    this.toolManager.registerTool(this.textEditTool);
    this.toolManager.registerTool(this.nodeEditTool);
    this.toolManager.registerTool(this.handTool);
    this.toolManager.registerTool(this.polylineTool);
    this.toolManager.registerTool(this.arcTool);
    this.toolManager.registerTool(this.circleTool);
    this.toolManager.registerTool(this.skewTool);
    this.toolManager.registerTool(this.dimensionTool);

    // CAD Modification tools
    this.toolManager.registerTool(this.trimTool);
    this.toolManager.registerTool(this.extendTool);
    this.toolManager.registerTool(this.filletTool);
    this.toolManager.registerTool(this.chamferTool);

    // Construction tools
    this.toolManager.registerTool(this.constructionLineTool);
    this.toolManager.registerTool(this.referencePointTool);

    // Annotation tools
    this.toolManager.registerTool(this.hatchTool);

    // Block tools
    this.toolManager.registerTool(this.blockInsertionTool);

    // Schematic tools
    this.toolManager.registerTool(this.wireTool);
    this.toolManager.registerTool(this.netLabelTool);

    // PCB tools
    this.toolManager.registerTool(this.trackRoutingTool);
    this.toolManager.registerTool(this.viaTool);

    // Set default tool
    this.toolManager.setActiveTool('select');
  }

  /**
   * Get the current page ID.
   */
  getCurrentPageId(): NodeId | null {
    // Return tracked page if valid
    if (this.state.currentPageId) {
      const page = this.sceneGraph.getNode(this.state.currentPageId);
      if (page && page.type === 'PAGE') {
        return this.state.currentPageId;
      }
    }

    // Fallback to first page
    const doc = this.sceneGraph.getDocument();
    if (!doc) return null;
    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length > 0) {
      this.state.currentPageId = pageIds[0]!;
      return pageIds[0]!;
    }
    return null;
  }

  /**
   * Set the current page.
   */
  setCurrentPage(pageId: NodeId): void {
    const page = this.sceneGraph.getNode(pageId);
    if (!page || page.type !== 'PAGE') {
      throw new Error(`Invalid page ID: ${pageId}`);
    }
    this.state.currentPageId = pageId;
    // Update renderer to show the new page
    this.renderer?.setCurrentPageId(pageId);
  }

  /**
   * Get all page IDs in the document.
   */
  getPageIds(): NodeId[] {
    const doc = this.sceneGraph.getDocument();
    if (!doc) return [];
    return this.sceneGraph.getChildIds(doc.id);
  }

  private wireInputHandlers(): void {
    if (!this.pointerHandler || !this.keyboardHandler || !this.toolManager) return;

    // Listen for cursor changes from tool manager
    this.toolManager.on('cursor:changed', ({ cursor }) => {
      if (this.canvas) {
        this.canvas.style.cursor = cursor;
      }
    });

    // Pointer events
    this.pointerHandler.on('pointerdown', (event) => {
      // Middle mouse button (button 1) for pan/zoom
      if (event.button === 1) {
        this.mmbState.active = true;
        this.mmbState.startCanvasX = event.canvasX;
        this.mmbState.startCanvasY = event.canvasY;
        this.mmbState.startZoom = this.viewport?.getZoom() ?? 1;
        // Ctrl+MMB = zoom, MMB alone = pan
        this.mmbState.mode = (event.ctrlKey || event.metaKey) ? 'zoom' : 'pan';
        return; // Don't pass to tool manager
      }

      // Right mouse button (button 2) for context menu
      if (event.button === 2) {
        // Get screen coordinates from canvas coordinates
        if (this.canvas) {
          const rect = this.canvas.getBoundingClientRect();
          const scaleX = rect.width / this.canvas.width;
          const scaleY = rect.height / this.canvas.height;
          const screenX = rect.left + event.canvasX * scaleX;
          const screenY = rect.top + event.canvasY * scaleY;

          // Show context menu with current selection
          const selectedIds = this.selectionManager.getSelectedNodeIds();
          this.contextMenu?.show(screenX, screenY, selectedIds);
        }
        return; // Don't pass to tool manager
      }

      this.toolManager!.handlePointerDown(event);
    });

    this.pointerHandler.on('pointermove', (event) => {
      // Handle MMB pan/zoom
      if (this.mmbState.active) {
        const dy = event.canvasY - this.mmbState.startCanvasY;

        if (this.mmbState.mode === 'zoom') {
          // Vertical drag controls zoom (up = zoom in, down = zoom out)
          const zoomSensitivity = 0.01;
          const zoomDelta = -dy * zoomSensitivity;
          const newZoom = this.mmbState.startZoom * (1 + zoomDelta);
          // Zoom centered on starting point
          this.viewport?.zoomAt(
            Math.max(0.01, Math.min(100, newZoom)),
            this.mmbState.startCanvasX,
            this.mmbState.startCanvasY
          );
        } else {
          // Pan mode - move viewport by delta since last frame
          this.viewport?.pan(
            event.canvasX - this.mmbState.startCanvasX,
            event.canvasY - this.mmbState.startCanvasY
          );
          // Update start position for continuous panning
          this.mmbState.startCanvasX = event.canvasX;
          this.mmbState.startCanvasY = event.canvasY;
        }
        return; // Don't pass to tool manager
      }
      this.toolManager!.handlePointerMove(event);
    });

    this.pointerHandler.on('pointerup', (event) => {
      // Release MMB state
      if (event.button === 1 || this.mmbState.active) {
        this.mmbState.active = false;
        this.mmbState.mode = null;
        if (event.button === 1) return; // Don't pass MMB release to tool manager
      }
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

      // Handle zoom with Ctrl/Meta + wheel
      if (event.ctrlKey || event.metaKey) {
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const currentZoom = this.viewport?.getZoom() ?? 1;
        // Convert CSS offset to canvas pixels
        const canvasX = event.offsetX * scaleX;
        const canvasY = event.offsetY * scaleY;
        this.viewport?.zoomAt(currentZoom * zoomFactor, canvasX, canvasY);
      } else if (event.shiftKey) {
        // Shift + wheel: horizontal pan (swap deltaY to deltaX for horizontal scrolling)
        this.viewport?.pan(-event.deltaY * scaleX, 0);
      } else {
        // Pan with wheel (deltaX/Y are CSS pixels, convert to canvas pixels)
        this.viewport?.pan(-event.deltaX * scaleX, -event.deltaY * scaleY);
      }
    });

    // Keyboard shortcuts
    this.keyboardHandler.on('shortcut', ({ action, event }) => {
      // Don't process shortcuts during text editing (except Escape)
      if (this.textEditTool?.isEditing() && action !== 'cancel') {
        // Pass as regular keydown instead
        this.toolManager!.handleKeyDown(event);
        return;
      }
      this.handleShortcut(action);
    });

    this.keyboardHandler.on('keydown', (event) => {
      // Don't hijack keys when text editing is active
      const currentTool = this.getActiveTool();
      if (currentTool === 'text-edit' && this.textEditTool?.isEditing()) {
        this.toolManager!.handleKeyDown(event);
        return;
      }

      // Space key for temporary hand tool (canonical behavior)
      if (event.key === ' ' && !this.spaceHandState.active) {
        if (currentTool !== 'hand') {
          this.spaceHandState.active = true;
          this.spaceHandState.previousTool = currentTool;
          this.setTool('hand');
          return; // Don't pass to tool manager
        }
      }

      this.toolManager!.handleKeyDown(event);
    });

    this.keyboardHandler.on('keyup', (event) => {
      // Space key release - return to previous tool
      if (event.key === ' ' && this.spaceHandState.active) {
        this.spaceHandState.active = false;
        if (this.spaceHandState.previousTool) {
          this.setTool(this.spaceHandState.previousTool);
        }
        this.spaceHandState.previousTool = null;
        return; // Don't pass to tool manager
      }

      this.toolManager!.handleKeyUp(event);
    });
  }

  /**
   * Set up handler for library component drops
   */
  private setupLibraryDropHandler(): void {
    window.addEventListener('designlibre-library-drop', ((e: CustomEvent) => {
      const { componentId, x, y } = e.detail as {
        componentId: string;
        x: number;
        y: number;
      };

      // Get the library component definition
      const component = this.libraryRegistry.get(componentId);
      if (!component) {
        console.warn(`Library component not found: ${componentId}`);
        return;
      }

      // Create the component nodes on the canvas
      this.createLibraryComponentInstance(component, x, y);
    }) as EventListener);
  }

  /**
   * Create an instance of a library component at the specified position
   */
  private createLibraryComponentInstance(
    component: LibraryComponent,
    x: number,
    y: number
  ): NodeId | null {
    // Get the current page as parent
    const pageId = this.getCurrentPageId();
    if (!pageId) {
      console.warn('No current page to place component');
      return null;
    }

    // Create the root frame for this component
    const rootNode = this.createNodeFromStructure(
      component.structure,
      pageId,
      x,
      y,
      component.name
    );

    if (rootNode) {
      // Apply semantic metadata based on component category and name
      this.applySemanticMetadataToLibraryComponent(rootNode, component);

      // Select the newly created component
      this.selectionManager.select([rootNode]);
    }

    return rootNode;
  }

  /**
   * Apply semantic metadata to a library component instance
   */
  private applySemanticMetadataToLibraryComponent(
    nodeId: NodeId,
    component: LibraryComponent
  ): void {
    // Suggest semantic type based on component category and name
    const semanticType = suggestSemanticType(component.category, component.name);

    // Create metadata from preset
    const metadata = createSemanticMetadataFromPreset(semanticType);

    // Get current pluginData (if any)
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return;

    const existingPluginData = (node as { pluginData?: Record<string, unknown> }).pluginData ?? {};
    const updatedPluginData = setSemanticMetadata(existingPluginData, metadata);

    // Update the node with semantic metadata
    this.sceneGraph.updateNode(nodeId, { pluginData: updatedPluginData } as Partial<NodeData>);
  }

  /**
   * Recursively create nodes from a library component structure
   */
  private createNodeFromStructure(
    structure: LibraryNodeStructure,
    parentId: NodeId,
    x: number,
    y: number,
    rootName?: string
  ): NodeId | null {
    const props = structure.properties || {};

    // Determine node type and create
    let nodeId: NodeId;

    switch (structure.type) {
      case 'FRAME':
      case 'RECTANGLE':
      case 'ELLIPSE': {
        // RECTANGLE and ELLIPSE are implemented as FRAME nodes with fills/strokes
        nodeId = this.sceneGraph.createNode('FRAME', parentId, -1, {
          name: rootName ?? structure.name,
          x,
          y,
          width: (props['width'] as number) ?? 100,
          height: (props['height'] as number) ?? 40,
          fills: (props['fills'] as unknown[]) ?? [],
          strokes: (props['strokes'] as unknown[]) ?? [],
          strokeWeight: (props['strokeWeight'] as number) ?? 0,
          cornerRadius: (props['cornerRadius'] as number) ?? 0,
          clipsContent: (props['clipsContent'] as boolean) ?? false,
          effects: (props['effects'] as unknown[]) ?? [],
          autoLayoutMode: props['autoLayoutMode'] as string | undefined,
          autoLayoutGap: (props['autoLayoutGap'] as number) ?? 0,
          autoLayoutPadding: props['autoLayoutPadding'] as { top: number; right: number; bottom: number; left: number } | undefined,
          primaryAxisAlign: props['primaryAxisAlign'] as string | undefined,
          counterAxisAlign: props['counterAxisAlign'] as string | undefined,
          primaryAxisSizing: props['primaryAxisSizing'] as string | undefined,
          counterAxisSizing: props['counterAxisSizing'] as string | undefined,
        } as CreateNodeOptions);
        break;
      }

      case 'TEXT': {
        nodeId = this.sceneGraph.createNode('TEXT', parentId, -1, {
          name: rootName ?? structure.name,
          x,
          y,
          width: (props['width'] as number) ?? 100,
          height: (props['height'] as number) ?? 20,
          characters: (props['characters'] as string) ?? 'Text',
          fills: (props['fills'] as unknown[]) ?? [],
          fontFamily: (props['fontFamily'] as string) ?? 'Inter',
          fontWeight: (props['fontWeight'] as number) ?? 400,
          fontSize: (props['fontSize'] as number) ?? 14,
          textAlignHorizontal: (props['textAlignHorizontal'] as string) ?? 'LEFT',
          textAlignVertical: (props['textAlignVertical'] as string) ?? 'TOP',
        } as CreateNodeOptions);
        break;
      }

      default:
        console.warn(`Unsupported node type: ${structure.type}`);
        return null;
    }

    // Create children
    if (structure.children) {
      let childY = 0;
      for (const childStructure of structure.children) {
        this.createNodeFromStructure(childStructure, nodeId, 0, childY);
        childY += 30; // Basic vertical stacking for children
      }
    }

    return nodeId;
  }

  private handleShortcut(action: string): void {
    switch (action) {
      // ========================================
      // Edit operations
      // ========================================
      case 'undo':
        this.undo();
        break;
      case 'redo':
        this.redo();
        break;
      case 'delete':
        this.deleteSelection();
        break;
      case 'duplicate':
        this.duplicateSelection();
        break;

      // ========================================
      // Selection
      // ========================================
      case 'selectAll':
        this.selectionManager.selectAll();
        break;
      case 'deselectAll':
        // Escape key - canonical escape hatch behavior
        this.handleEscapeKey();
        break;

      // ========================================
      // Tools (V is home base)
      // ========================================
      case 'tool:select':
        this.setTool('select');
        break;
      case 'tool:frame':
        this.setTool('frame');
        break;
      case 'tool:rectangle':
        this.setTool('rectangle');
        break;
      case 'tool:ellipse':
        this.setTool('ellipse');
        break;
      case 'tool:line':
        this.setTool('line');
        break;
      case 'tool:pen':
        this.setTool('pen');
        break;
      case 'tool:text':
        this.setTool('text');
        break;
      case 'tool:hand':
        this.setTool('hand');
        break;
      case 'tool:move':
        this.setTool('move');
        break;

      // ========================================
      // Nudge (arrow keys)
      // ========================================
      case 'nudge:up':
        this.nudgeSelection(0, -1);
        break;
      case 'nudge:down':
        this.nudgeSelection(0, 1);
        break;
      case 'nudge:left':
        this.nudgeSelection(-1, 0);
        break;
      case 'nudge:right':
        this.nudgeSelection(1, 0);
        break;
      case 'nudge:up:large':
        this.nudgeSelection(0, -10);
        break;
      case 'nudge:down:large':
        this.nudgeSelection(0, 10);
        break;
      case 'nudge:left:large':
        this.nudgeSelection(-10, 0);
        break;
      case 'nudge:right:large':
        this.nudgeSelection(10, 0);
        break;

      // ========================================
      // Grouping
      // ========================================
      case 'group':
        this.groupSelection();
        break;
      case 'ungroup':
        this.ungroupSelection();
        break;

      // ========================================
      // Z-Order
      // ========================================
      case 'bringToFront':
        this.bringSelectionToFront();
        break;
      case 'sendToBack':
        this.sendSelectionToBack();
        break;
      case 'bringForward':
        this.bringSelectionForward();
        break;
      case 'sendBackward':
        this.sendSelectionBackward();
        break;

      // ========================================
      // View / Zoom
      // ========================================
      case 'zoomIn':
        this.viewport?.zoomIn();
        break;
      case 'zoomOut':
        this.viewport?.zoomOut();
        break;
      case 'zoom100':
        this.viewport?.setZoom(1);
        break;
      case 'zoomToFit':
        this.zoomToFit(); // Uses public method
        break;
      case 'zoomToSelection':
        this.zoomToSelectionInternal();
        break;

      // ========================================
      // Toolbar Modes
      // ========================================
      case 'mode:design':
        this.emit('toolbar:set-mode', { mode: 'design' });
        break;
      case 'mode:cad':
        this.emit('toolbar:set-mode', { mode: 'cad' });
        break;
      case 'mode:schematic':
        this.emit('toolbar:set-mode', { mode: 'schematic' });
        break;
      case 'mode:pcb':
        this.emit('toolbar:set-mode', { mode: 'pcb' });
        break;

      // ========================================
      // CAD Modification Tools
      // ========================================
      case 'tool:trim':
        this.setTool('trim');
        break;
      case 'tool:extend':
        this.setTool('extend');
        break;
      case 'tool:fillet':
        this.setTool('fillet');
        break;
      case 'tool:chamfer':
        this.setTool('chamfer');
        break;
      case 'tool:mirror':
        this.setTool('mirror');
        break;
      case 'tool:array':
        this.setTool('array');
        break;

      // ========================================
      // Construction Tools
      // ========================================
      case 'tool:construction-line':
        this.setTool('construction-line');
        break;
      case 'tool:reference-point':
        this.setTool('reference-point');
        break;

      // ========================================
      // Annotation Tools
      // ========================================
      case 'tool:dimension':
        this.setTool('dimension');
        break;
      case 'tool:hatch':
        this.setTool('hatch');
        break;

      // ========================================
      // Block Tools
      // ========================================
      case 'tool:block-insert':
        this.setTool('block-insert');
        break;

      // ========================================
      // Schematic Tools
      // ========================================
      case 'tool:wire':
        this.setTool('wire');
        break;
      case 'tool:net-label':
        this.setTool('net-label');
        break;

      // ========================================
      // PCB Tools
      // ========================================
      case 'tool:track-routing':
        this.setTool('track-routing');
        break;
      case 'tool:via':
        this.setTool('via');
        break;
    }
  }

  // ============================================================
  // Canonical Escape Behavior
  // ============================================================

  /**
   * Handle Escape key with canonical priority:
   * 1. Cancel active operation (drawing, dragging)
   * 2. Exit text editing
   * 3. Deselect if objects selected
   * 4. Return to Select tool if using another tool
   */
  private handleEscapeKey(): void {
    // Priority 1: Check if any tool has active operation to cancel
    const currentTool = this.toolManager?.getActiveTool();
    if (currentTool) {
      // Drawing tools with active operation
      if (this.frameTool?.isDrawing?.()) {
        // Cancel will happen in tool's onKeyDown
        return;
      }
      if (this.rectangleTool?.isDrawing?.()) {
        return;
      }
      if (this.ellipseTool?.isDrawing?.()) {
        return;
      }
    }

    // Priority 2: Deselect if there's a selection
    const selectedIds = this.selectionManager.getSelectedNodeIds();
    if (selectedIds.length > 0) {
      this.clearSelection();
      return;
    }

    // Priority 3: Return to Select tool if not already there
    const toolName = currentTool?.name;
    if (toolName && toolName !== 'select') {
      this.setTool('select');
      return;
    }

    // Already at home base - do nothing
  }

  // ============================================================
  // Nudge Selection
  // ============================================================

  private nudgeSelection(dx: number, dy: number): void {
    const selectedIds = this.selectionManager.getSelectedNodeIds();
    if (selectedIds.length === 0) return;

    this.undoManager.beginGroup('Nudge');

    for (const nodeId of selectedIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node) {
        const oldX = node.x as number;
        const oldY = node.y as number;
        const newX = oldX + dx;
        const newY = oldY + dy;

        // Record undo for x
        if (dx !== 0) {
          this.undoManager.push({
            id: `nudge_${nodeId}_x_${Date.now()}` as import('@core/types/common').OperationId,
            type: 'SET_PROPERTY',
            timestamp: Date.now(),
            clientId: 'local',
            nodeId,
            path: ['x'],
            oldValue: oldX,
            newValue: newX,
          } as import('@operations/operation').SetPropertyOperation);
        }

        // Record undo for y
        if (dy !== 0) {
          this.undoManager.push({
            id: `nudge_${nodeId}_y_${Date.now()}` as import('@core/types/common').OperationId,
            type: 'SET_PROPERTY',
            timestamp: Date.now(),
            clientId: 'local',
            nodeId,
            path: ['y'],
            oldValue: oldY,
            newValue: newY,
          } as import('@operations/operation').SetPropertyOperation);
        }

        this.sceneGraph.updateNode(nodeId, { x: newX, y: newY });
      }
    }

    this.undoManager.endGroup();
  }

  // ============================================================
  // Grouping
  // ============================================================

  private groupSelection(): void {
    const selectedIds = this.selectionManager.getSelectedNodeIds();
    if (selectedIds.length < 2) return;

    // Find common parent
    const firstNodeId = selectedIds[0];
    if (!firstNodeId) return;
    const firstNode = this.sceneGraph.getNode(firstNodeId);
    if (!firstNode) return;
    const parentId = firstNode.parentId;
    if (!parentId) return;

    // Capture old positions before moving
    const oldPositions: Array<{ nodeId: NodeId; parentId: NodeId; index: number }> = [];
    for (const nodeId of selectedIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (node && node.parentId) {
        const siblings = this.sceneGraph.getChildIds(node.parentId);
        oldPositions.push({
          nodeId,
          parentId: node.parentId,
          index: siblings.indexOf(nodeId),
        });
      }
    }

    // Create group
    const groupId = this.sceneGraph.createNode('GROUP', parentId, -1, {
      name: 'Group',
    });

    // Move all selected nodes into group
    for (const nodeId of selectedIds) {
      this.sceneGraph.moveNode(nodeId, groupId, -1);
    }

    // Record undo operations (in reverse order for proper undo)
    this.undoManager.beginGroup('Group');

    // Record group creation
    this.recordNodeInsertion(groupId, parentId, 'Group');

    // Record move operations
    for (let i = 0; i < selectedIds.length; i++) {
      const nodeId = selectedIds[i]!;
      const oldPos = oldPositions[i]!;
      const newSiblings = this.sceneGraph.getChildIds(groupId);
      this.recordNodeMove(nodeId, oldPos.parentId, groupId, oldPos.index, newSiblings.indexOf(nodeId));
    }

    this.undoManager.endGroup();

    // Select the new group
    this.selectionManager.select([groupId], 'replace');
  }

  private ungroupSelection(): void {
    const selectedIds = this.selectionManager.getSelectedNodeIds();
    const newSelection: NodeId[] = [];

    this.undoManager.beginGroup('Ungroup');

    for (const nodeId of selectedIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (!node || node.type !== 'GROUP') continue;

      const parentId = node.parentId;
      if (!parentId) continue;

      // Get children before ungrouping
      const childIds = this.sceneGraph.getChildIds(nodeId);

      // Capture old positions
      const oldPositions: Array<{ childId: NodeId; index: number }> = [];
      for (let i = 0; i < childIds.length; i++) {
        oldPositions.push({ childId: childIds[i]!, index: i });
      }

      // Move children to parent
      for (const childId of childIds) {
        this.sceneGraph.moveNode(childId, parentId, -1);
        newSelection.push(childId);
      }

      // Record move operations
      for (let i = 0; i < childIds.length; i++) {
        const childId = childIds[i]!;
        const oldPos = oldPositions[i]!;
        const newSiblings = this.sceneGraph.getChildIds(parentId);
        this.recordNodeMove(childId, nodeId, parentId, oldPos.index, newSiblings.indexOf(childId));
      }

      // Record group deletion before deleting
      const groupData = JSON.parse(JSON.stringify(node));
      const groupSiblings = this.sceneGraph.getChildIds(parentId);
      const groupIndex = groupSiblings.indexOf(nodeId);

      // Delete the empty group
      this.sceneGraph.deleteNode(nodeId);

      // Record deletion
      this.undoManager.push({
        id: `del_${nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
        type: 'DELETE_NODE',
        timestamp: Date.now(),
        clientId: 'local',
        nodeId,
        deletedNodes: [groupData],
        parentId,
        index: groupIndex >= 0 ? groupIndex : 0,
      } as import('@operations/operation').Operation & { parentId: NodeId; index: number });
    }

    this.undoManager.endGroup();

    // Select the ungrouped items
    if (newSelection.length > 0) {
      this.selectionManager.select(newSelection, 'replace');
    }
  }

  // ============================================================
  // Z-Order Operations
  // ============================================================

  private bringSelectionToFront(): void {
    const selectedIds = this.selectionManager.getSelectedNodeIds();
    if (selectedIds.length === 0) return;

    this.undoManager.beginGroup('Bring to Front');
    for (const nodeId of selectedIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (!node?.parentId) continue;
      const siblings = this.sceneGraph.getChildIds(node.parentId);
      const oldIndex = siblings.indexOf(nodeId);
      const newIndex = siblings.length - 1;
      if (oldIndex !== newIndex) {
        this.sceneGraph.reorderNode(nodeId, newIndex);
        this.recordNodeReorder(nodeId, node.parentId, oldIndex, newIndex);
      }
    }
    this.undoManager.endGroup();
  }

  private sendSelectionToBack(): void {
    const selectedIds = this.selectionManager.getSelectedNodeIds();
    if (selectedIds.length === 0) return;

    this.undoManager.beginGroup('Send to Back');
    for (const nodeId of selectedIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (!node?.parentId) continue;
      const siblings = this.sceneGraph.getChildIds(node.parentId);
      const oldIndex = siblings.indexOf(nodeId);
      const newIndex = 0;
      if (oldIndex !== newIndex) {
        this.sceneGraph.reorderNode(nodeId, newIndex);
        this.recordNodeReorder(nodeId, node.parentId, oldIndex, newIndex);
      }
    }
    this.undoManager.endGroup();
  }

  private bringSelectionForward(): void {
    const selectedIds = this.selectionManager.getSelectedNodeIds();
    if (selectedIds.length === 0) return;

    this.undoManager.beginGroup('Bring Forward');
    for (const nodeId of selectedIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (!node?.parentId) continue;
      const siblings = this.sceneGraph.getChildIds(node.parentId);
      const oldIndex = siblings.indexOf(nodeId);
      if (oldIndex < siblings.length - 1) {
        const newIndex = oldIndex + 1;
        this.sceneGraph.reorderNode(nodeId, newIndex);
        this.recordNodeReorder(nodeId, node.parentId, oldIndex, newIndex);
      }
    }
    this.undoManager.endGroup();
  }

  private sendSelectionBackward(): void {
    const selectedIds = this.selectionManager.getSelectedNodeIds();
    if (selectedIds.length === 0) return;

    this.undoManager.beginGroup('Send Backward');
    for (const nodeId of selectedIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (!node?.parentId) continue;
      const siblings = this.sceneGraph.getChildIds(node.parentId);
      const oldIndex = siblings.indexOf(nodeId);
      if (oldIndex > 0) {
        const newIndex = oldIndex - 1;
        this.sceneGraph.reorderNode(nodeId, newIndex);
        this.recordNodeReorder(nodeId, node.parentId, oldIndex, newIndex);
      }
    }
    this.undoManager.endGroup();
  }

  // ============================================================
  // Duplicate
  // ============================================================

  private duplicateSelection(): void {
    const selectedIds = this.selectionManager.getSelectedNodeIds();
    if (selectedIds.length === 0) return;

    const newIds: NodeId[] = [];
    const offset = 10; // Offset duplicates by 10px

    for (const nodeId of selectedIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (!node || !node.parentId) continue;

      // Clone node properties
      const props: Record<string, unknown> = {};
      for (const key of Object.keys(node)) {
        if (key === 'id' || key === 'parentId' || key === 'childIds') continue;
        const value = (node as unknown as Record<string, unknown>)[key];
        if (value !== null && typeof value === 'object') {
          props[key] = JSON.parse(JSON.stringify(value));
        } else {
          props[key] = value;
        }
      }

      // Offset the position
      if ('x' in props && typeof props['x'] === 'number') {
        props['x'] = (props['x'] as number) + offset;
      }
      if ('y' in props && typeof props['y'] === 'number') {
        props['y'] = (props['y'] as number) + offset;
      }

      // Update name to indicate it's a copy
      if ('name' in props && typeof props['name'] === 'string') {
        props['name'] = (props['name'] as string) + ' copy';
      }

      // Create the duplicate
      const newNodeId = this.sceneGraph.createNode(
        node.type as 'FRAME' | 'GROUP' | 'VECTOR' | 'TEXT' | 'IMAGE' | 'COMPONENT' | 'INSTANCE',
        node.parentId,
        -1,
        props as Parameters<typeof this.sceneGraph.createNode>[3]
      );

      newIds.push(newNodeId);
    }

    // Record for undo
    if (newIds.length > 0) {
      this.undoManager.beginGroup('Duplicate');
      for (const nodeId of newIds) {
        const node = this.sceneGraph.getNode(nodeId);
        if (node && node.parentId) {
          this.recordNodeInsertion(nodeId, node.parentId, 'Duplicate');
        }
      }
      this.undoManager.endGroup();
    }

    // Select the duplicates
    if (newIds.length > 0) {
      this.selectionManager.select(newIds, 'replace');
    }
  }

  // ============================================================
  // Zoom Helpers
  // ============================================================

  private zoomToSelectionInternal(): void {
    const selectedIds = this.selectionManager.getSelectedNodeIds();
    if (selectedIds.length === 0) return;

    // Calculate bounding box of selection
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const nodeId of selectedIds) {
      const node = this.sceneGraph.getNode(nodeId);
      if (!node || !('x' in node) || !('y' in node)) continue;

      const x = node.x as number;
      const y = node.y as number;
      const w = (node as { width?: number }).width ?? 0;
      const h = (node as { height?: number }).height ?? 0;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    if (minX !== Infinity && this.viewport) {
      const padding = 50;
      this.viewport.fitRect(minX - padding, minY - padding, maxX - minX + padding * 2, maxY - minY + padding * 2);
    }
  }

  private deleteSelection(): void {
    const selection = this.selectionManager.getSelectedNodeIds();
    if (selection.length === 0) return;

    // Collect node data before deleting for undo support
    const deletedNodesData: Array<{
      nodeId: NodeId;
      nodeData: import('@scene/nodes/base-node').NodeData;
      parentId: NodeId;
      index: number;
    }> = [];

    for (const nodeId of selection) {
      const node = this.sceneGraph.getNode(nodeId);
      const parent = this.sceneGraph.getParent(nodeId);
      if (node && parent) {
        const siblings = this.sceneGraph.getChildIds(parent.id);
        const index = siblings.indexOf(nodeId);
        deletedNodesData.push({
          nodeId,
          nodeData: JSON.parse(JSON.stringify(node)),
          parentId: parent.id,
          index,
        });
      }
    }

    // Record delete operations for undo
    if (deletedNodesData.length > 0) {
      this.undoManager.beginGroup('Delete');
      for (const item of deletedNodesData) {
        this.undoManager.push({
          id: `del_${item.nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
          type: 'DELETE_NODE',
          timestamp: Date.now(),
          clientId: 'local',
          nodeId: item.nodeId,
          deletedNodes: [item.nodeData],
          parentId: item.parentId,
          index: item.index,
        } as import('@operations/operation').Operation & { parentId: NodeId; index: number });
      }
      this.undoManager.endGroup();
    }

    // Actually delete the nodes
    for (const nodeId of selection) {
      this.sceneGraph.deleteNode(nodeId);
    }
    this.clearSelection();
  }

  /**
   * Record a node insertion for undo support.
   */
  private recordNodeInsertion(nodeId: NodeId, parentId: NodeId, _description: string = 'Create'): void {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return;

    const siblings = this.sceneGraph.getChildIds(parentId);
    const index = siblings.indexOf(nodeId);

    this.undoManager.push({
      id: `ins_${nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
      type: 'INSERT_NODE',
      timestamp: Date.now(),
      clientId: 'local',
      nodeId,
      node: JSON.parse(JSON.stringify(node)),
      parentId,
      index: index >= 0 ? index : siblings.length - 1,
    } as import('@operations/operation').InsertNodeOperation);
  }

  /**
   * Record a node move for undo support.
   */
  private recordNodeMove(
    nodeId: NodeId,
    oldParentId: NodeId | null,
    newParentId: NodeId,
    oldIndex: number,
    newIndex: number
  ): void {
    this.undoManager.push({
      id: `mov_${nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
      type: 'MOVE_NODE',
      timestamp: Date.now(),
      clientId: 'local',
      nodeId,
      oldParentId,
      newParentId,
      oldIndex,
      newIndex,
    } as import('@operations/operation').MoveNodeOperation);
  }

  /**
   * Record a node reorder for undo support.
   */
  private recordNodeReorder(
    nodeId: NodeId,
    parentId: NodeId,
    oldIndex: number,
    newIndex: number
  ): void {
    this.undoManager.push({
      id: `reo_${nodeId}_${Date.now()}` as import('@core/types/common').OperationId,
      type: 'REORDER_CHILDREN',
      timestamp: Date.now(),
      clientId: 'local',
      nodeId,
      parentId,
      oldIndex,
      newIndex,
    } as import('@operations/operation').ReorderChildrenOperation);
  }

  /**
   * Update snap manager with current scene graph nodes.
   */
  private updateSnapManagerNodes(): void {
    if (!this.snapManager) return;

    const pageId = this.getCurrentPageId();
    if (!pageId) return;

    // Collect all nodes on the current page
    const nodes = new Map<NodeId, import('@scene/nodes/base-node').NodeData>();
    const descendants = this.sceneGraph.getDescendants(pageId);
    for (const node of descendants) {
      nodes.set(node.id, node);
    }

    this.snapManager.updateNodes(nodes);
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
