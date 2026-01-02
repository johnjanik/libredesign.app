/**
 * DesignLibre Runtime
 *
 * Main runtime class that coordinates all subsystems.
 */
import { EventEmitter } from '@core/events/event-emitter';
import { SceneGraph } from '@scene/graph/scene-graph';
import { createRenderer } from '@renderer/core/renderer';
import { createToolManager } from '@tools/base/tool-manager';
import { createSelectTool } from '@tools/selection/select-tool';
import { createMoveTool } from '@tools/transform/move-tool';
import { createResizeTool } from '@tools/transform/resize-tool';
import { createRotateTool } from '@tools/transform/rotate-tool';
import { createRectangleTool } from '@tools/drawing/rectangle-tool';
import { createEllipseTool } from '@tools/drawing/ellipse-tool';
import { createLineTool } from '@tools/drawing/line-tool';
import { createPenTool } from '@tools/drawing/pen-tool';
import { createPolygonTool } from '@tools/drawing/polygon-tool';
import { createStarTool } from '@tools/drawing/star-tool';
import { createPencilTool } from '@tools/drawing/pencil-tool';
import { createImageTool } from '@tools/drawing/image-tool';
import { createHandTool } from '@tools/navigation/hand-tool';
import { createPointerHandler } from '@tools/input/pointer-handler';
import { createKeyboardHandler } from '@tools/input/keyboard-handler';
import { createSelectionManager } from '@scene/selection/selection-manager';
import { createLayoutEngine } from '@layout/layout-engine';
import { createUndoManager } from '@operations/undo-manager';
import { createDocumentSerializer } from '@persistence/serialization/document-serializer';
import { createIndexedDBStorage } from '@persistence/storage/indexed-db';
import { createAutosaveManager } from '@persistence/storage/autosave';
import { createPNGExporter } from '@persistence/export/png-exporter';
import { createSVGExporter } from '@persistence/export/svg-exporter';
import { solidPaint } from '@core/types/paint';
import { rgba } from '@core/types/color';
import { createStyleManager } from '@core/styles/style-manager';
/**
 * DesignLibre Runtime
 */
export class DesignLibreRuntime extends EventEmitter {
    // Core systems
    sceneGraph;
    renderer = null;
    viewport = null;
    toolManager = null;
    selectionManager;
    layoutEngine;
    undoManager;
    styleManager;
    // Input handlers
    pointerHandler = null;
    keyboardHandler = null;
    // Canvas element (for coordinate transformations)
    canvas = null;
    // Persistence
    serializer;
    storage;
    autosaveManager = null;
    // Exporters
    pngExporter;
    svgExporter;
    // Tools
    selectTool = null;
    moveTool = null;
    resizeTool = null;
    rotateTool = null;
    rectangleTool = null;
    ellipseTool = null;
    lineTool = null;
    penTool = null;
    polygonTool = null;
    starTool = null;
    pencilTool = null;
    imageTool = null;
    handTool = null;
    // State
    state = {
        initialized: false,
        currentDocumentId: null,
        currentPageId: null,
    };
    // Last used fill color for shapes (default: #D4D2D0)
    lastUsedFillColor = { r: 0.831, g: 0.824, b: 0.816, a: 1 };
    // Options
    options;
    constructor(options = {}) {
        super();
        this.options = options;
        // Initialize core systems
        this.sceneGraph = new SceneGraph();
        this.selectionManager = createSelectionManager(this.sceneGraph);
        this.layoutEngine = createLayoutEngine(this.sceneGraph);
        this.undoManager = createUndoManager({ maxHistory: 100 });
        this.styleManager = createStyleManager();
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
    async initialize(container) {
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
                this.autosaveManager = createAutosaveManager(this.sceneGraph, this.serializer, this.storage, { interval: this.options.autosaveInterval });
            }
            // Handle window resize
            window.addEventListener('resize', this.handleResize);
            this.handleResize();
            // Start render loop
            this.renderer.startRenderLoop();
            this.state.initialized = true;
            this.emit('initialized');
        }
        catch (err) {
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
    createDocument(name = 'Untitled') {
        // Create document structure using createNewDocument which creates doc + first page
        const docId = this.sceneGraph.createNewDocument(name);
        this.state.currentDocumentId = docId;
        // Start autosave
        if (this.autosaveManager) {
            this.autosaveManager.start(docId);
        }
        this.emit('document:created', { documentId: docId });
        return docId;
    }
    /**
     * Load a document from storage.
     */
    async loadDocument(documentId) {
        const stored = await this.storage.loadDocument(documentId);
        if (!stored) {
            throw new Error(`Document not found: ${documentId}`);
        }
        this.serializer.deserialize(stored.data, this.sceneGraph);
        this.state.currentDocumentId = documentId;
        // Start autosave
        if (this.autosaveManager) {
            this.autosaveManager.start(documentId);
        }
        this.emit('document:loaded', { documentId: documentId });
    }
    /**
     * Save current document to storage.
     */
    async saveDocument() {
        if (!this.state.currentDocumentId) {
            throw new Error('No document to save');
        }
        const doc = this.sceneGraph.getDocument();
        const name = doc?.name ?? 'Untitled';
        const json = this.serializer.serialize(this.sceneGraph, { includeMetadata: true });
        await this.storage.saveDocument(this.state.currentDocumentId, name, json);
        this.emit('document:saved', { documentId: this.state.currentDocumentId });
    }
    /**
     * Get document name.
     */
    getDocumentName() {
        const doc = this.sceneGraph.getDocument();
        return doc?.name ?? 'Untitled';
    }
    // =========================================================================
    // Selection
    // =========================================================================
    /**
     * Get selected node IDs.
     */
    getSelection() {
        return this.selectionManager.getSelectedNodeIds();
    }
    /**
     * Set selection.
     */
    setSelection(nodeIds) {
        this.selectionManager.select(nodeIds, 'replace');
    }
    /**
     * Clear selection.
     */
    clearSelection() {
        this.selectionManager.clear();
    }
    // =========================================================================
    // Tools
    // =========================================================================
    /**
     * Set the active tool.
     */
    setTool(toolName) {
        if (!this.toolManager)
            return;
        this.toolManager.setActiveTool(toolName);
        this.emit('tool:changed', { tool: toolName });
    }
    /**
     * Get active tool name.
     */
    getActiveTool() {
        return this.toolManager?.getActiveTool()?.name ?? 'select';
    }
    // =========================================================================
    // Undo/Redo
    // =========================================================================
    /**
     * Undo last operation.
     */
    undo() {
        return this.undoManager.undo() !== null;
    }
    /**
     * Redo last undone operation.
     */
    redo() {
        return this.undoManager.redo() !== null;
    }
    /**
     * Check if undo is available.
     */
    canUndo() {
        return this.undoManager.canUndo();
    }
    /**
     * Check if redo is available.
     */
    canRedo() {
        return this.undoManager.canRedo();
    }
    // =========================================================================
    // Export
    // =========================================================================
    /**
     * Export node to PNG.
     */
    async exportPNG(nodeId, options) {
        const result = await this.pngExporter.export(nodeId, options);
        return result.blob;
    }
    /**
     * Export node to SVG.
     */
    exportSVG(nodeId, options) {
        const result = this.svgExporter.export(nodeId, options);
        return result.svg;
    }
    /**
     * Download node as PNG.
     */
    async downloadPNG(nodeId, filename = 'export.png') {
        await this.pngExporter.download(nodeId, filename);
    }
    /**
     * Download node as SVG.
     */
    downloadSVG(nodeId, filename = 'export.svg') {
        this.svgExporter.download(nodeId, filename);
    }
    // =========================================================================
    // Viewport
    // =========================================================================
    /**
     * Get current zoom level.
     */
    getZoom() {
        return this.viewport?.getZoom() ?? 1;
    }
    /**
     * Set zoom level.
     */
    setZoom(zoom) {
        this.viewport?.setZoom(zoom);
    }
    /**
     * Zoom to fit all content.
     */
    zoomToFit() {
        const bounds = this.selectionManager.getSelectionBounds();
        if (bounds && this.viewport) {
            this.viewport.fitRect(bounds.x, bounds.y, bounds.width, bounds.height);
        }
    }
    /**
     * Reset viewport to default.
     */
    resetViewport() {
        this.viewport?.reset();
    }
    // =========================================================================
    // Scene Graph Access
    // =========================================================================
    /**
     * Get the scene graph.
     */
    getSceneGraph() {
        return this.sceneGraph;
    }
    /**
     * Get the layout engine.
     */
    getLayoutEngine() {
        return this.layoutEngine;
    }
    /**
     * Get a node by ID.
     */
    getNode(nodeId) {
        return this.sceneGraph.getNode(nodeId);
    }
    /**
     * Get the tool manager.
     */
    getToolManager() {
        return this.toolManager;
    }
    /**
     * Get the viewport.
     */
    getViewport() {
        return this.viewport;
    }
    /**
     * Get the selection manager.
     */
    getSelectionManager() {
        return this.selectionManager;
    }
    /**
     * Get the renderer.
     */
    getRenderer() {
        return this.renderer;
    }
    /**
     * Get the style manager.
     */
    getStyleManager() {
        return this.styleManager;
    }
    /**
     * Get the polygon tool.
     */
    getPolygonTool() {
        return this.polygonTool;
    }
    /**
     * Get the star tool.
     */
    getStarTool() {
        return this.starTool;
    }
    /**
     * Get the last used fill color for shapes.
     */
    getLastUsedFillColor() {
        return { ...this.lastUsedFillColor };
    }
    /**
     * Set the last used fill color for shapes.
     */
    setLastUsedFillColor(color) {
        this.lastUsedFillColor = { ...color };
    }
    // =========================================================================
    // Cleanup
    // =========================================================================
    /**
     * Dispose of the runtime.
     */
    dispose() {
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
    initializeTools() {
        if (!this.toolManager)
            return;
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
            if (!parentId)
                return null;
            // Create a rectangle path
            const path = {
                windingRule: 'NONZERO',
                commands: [
                    { type: 'M', x: 0, y: 0 },
                    { type: 'L', x: rect.width, y: 0 },
                    { type: 'L', x: rect.width, y: rect.height },
                    { type: 'L', x: 0, y: rect.height },
                    { type: 'Z' },
                ],
            };
            const nodeId = this.sceneGraph.createVector(parentId, {
                name: 'Rectangle',
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                vectorPaths: [path],
                fills: [solidPaint(rgba(this.lastUsedFillColor.r, this.lastUsedFillColor.g, this.lastUsedFillColor.b, this.lastUsedFillColor.a))],
            });
            this.selectionManager.select([nodeId], 'replace');
            return nodeId;
        });
        // Ellipse tool
        this.ellipseTool = createEllipseTool();
        this.ellipseTool.setOnEllipseComplete((path, bounds) => {
            const parentId = this.getCurrentPageId();
            if (!parentId)
                return null;
            const nodeId = this.sceneGraph.createVector(parentId, {
                name: 'Ellipse',
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                vectorPaths: [path],
                fills: [solidPaint(rgba(this.lastUsedFillColor.r, this.lastUsedFillColor.g, this.lastUsedFillColor.b, this.lastUsedFillColor.a))],
            });
            this.selectionManager.select([nodeId], 'replace');
            return nodeId;
        });
        // Line tool
        this.lineTool = createLineTool();
        this.lineTool.setOnLineComplete((_path, start, end) => {
            const parentId = this.getCurrentPageId();
            if (!parentId)
                return null;
            const minX = Math.min(start.x, end.x);
            const minY = Math.min(start.y, end.y);
            const width = Math.abs(end.x - start.x) || 1;
            const height = Math.abs(end.y - start.y) || 1;
            // Adjust path to be relative to bounding box
            const adjustedPath = {
                windingRule: 'NONZERO',
                commands: [
                    { type: 'M', x: start.x - minX, y: start.y - minY },
                    { type: 'L', x: end.x - minX, y: end.y - minY },
                ],
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
            if (!parentId)
                return null;
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
                    newCmd.x1 -= minX;
                    newCmd.y1 -= minY;
                }
                if ('x2' in newCmd && 'y2' in newCmd) {
                    newCmd.x2 -= minX;
                    newCmd.y2 -= minY;
                }
                return newCmd;
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
        // Polygon tool
        this.polygonTool = createPolygonTool();
        this.polygonTool.setOnPolygonComplete((polygon) => {
            const parentId = this.getCurrentPageId();
            if (!parentId)
                return null;
            // Create path from polygon vertices
            const commands = [];
            if (polygon.vertices.length > 0) {
                // Translate vertices to local coordinates
                const minX = polygon.bounds.x;
                const minY = polygon.bounds.y;
                commands.push({ type: 'M', x: polygon.vertices[0].x - minX, y: polygon.vertices[0].y - minY });
                for (let i = 1; i < polygon.vertices.length; i++) {
                    commands.push({ type: 'L', x: polygon.vertices[i].x - minX, y: polygon.vertices[i].y - minY });
                }
                commands.push({ type: 'Z' });
            }
            const path = { windingRule: 'NONZERO', commands };
            const nodeId = this.sceneGraph.createVector(parentId, {
                name: `Polygon (${polygon.sides} sides)`,
                x: polygon.bounds.x,
                y: polygon.bounds.y,
                width: polygon.bounds.width,
                height: polygon.bounds.height,
                vectorPaths: [path],
                fills: [solidPaint(rgba(this.lastUsedFillColor.r, this.lastUsedFillColor.g, this.lastUsedFillColor.b, this.lastUsedFillColor.a))],
            });
            this.selectionManager.select([nodeId], 'replace');
            return nodeId;
        });
        // Star tool
        this.starTool = createStarTool();
        this.starTool.setOnStarComplete((star) => {
            const parentId = this.getCurrentPageId();
            if (!parentId)
                return null;
            // Create path from star vertices
            const commands = [];
            if (star.vertices.length > 0) {
                // Translate vertices to local coordinates
                const minX = star.bounds.x;
                const minY = star.bounds.y;
                commands.push({ type: 'M', x: star.vertices[0].x - minX, y: star.vertices[0].y - minY });
                for (let i = 1; i < star.vertices.length; i++) {
                    commands.push({ type: 'L', x: star.vertices[i].x - minX, y: star.vertices[i].y - minY });
                }
                commands.push({ type: 'Z' });
            }
            const path = { windingRule: 'NONZERO', commands };
            const nodeId = this.sceneGraph.createVector(parentId, {
                name: `Star (${star.points} points)`,
                x: star.bounds.x,
                y: star.bounds.y,
                width: star.bounds.width,
                height: star.bounds.height,
                vectorPaths: [path],
                fills: [solidPaint(rgba(this.lastUsedFillColor.r, this.lastUsedFillColor.g, this.lastUsedFillColor.b, this.lastUsedFillColor.a))],
            });
            this.selectionManager.select([nodeId], 'replace');
            return nodeId;
        });
        // Pencil tool (freehand drawing)
        this.pencilTool = createPencilTool();
        this.pencilTool.setOnPathComplete((data) => {
            const parentId = this.getCurrentPageId();
            if (!parentId)
                return null;
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
                    newCmd.x1 -= minX;
                    newCmd.y1 -= minY;
                }
                if ('x2' in newCmd && 'y2' in newCmd) {
                    newCmd.x2 -= minX;
                    newCmd.y2 -= minY;
                }
                return newCmd;
            });
            const nodeId = this.sceneGraph.createVector(parentId, {
                name: 'Freehand',
                x: minX,
                y: minY,
                width: data.bounds.width,
                height: data.bounds.height,
                vectorPaths: [{ windingRule: data.path.windingRule, commands: translatedCommands }],
                fills: [],
                strokes: [solidPaint(rgba(0, 0, 0, 1))],
                strokeWeight: 2,
            });
            this.selectionManager.select([nodeId], 'replace');
            return nodeId;
        });
        // Image tool
        this.imageTool = createImageTool();
        this.imageTool.setOnImagePlace((data) => {
            const parentId = this.getCurrentPageId();
            if (!parentId)
                return null;
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
        this.toolManager.registerTool(this.polygonTool);
        this.toolManager.registerTool(this.starTool);
        this.toolManager.registerTool(this.pencilTool);
        this.toolManager.registerTool(this.imageTool);
        this.toolManager.registerTool(this.handTool);
        // Set default tool
        this.toolManager.setActiveTool('select');
    }
    /**
     * Get the current page ID.
     */
    getCurrentPageId() {
        // Return tracked page if valid
        if (this.state.currentPageId) {
            const page = this.sceneGraph.getNode(this.state.currentPageId);
            if (page && page.type === 'PAGE') {
                return this.state.currentPageId;
            }
        }
        // Fallback to first page
        const doc = this.sceneGraph.getDocument();
        if (!doc)
            return null;
        const pageIds = this.sceneGraph.getChildIds(doc.id);
        if (pageIds.length > 0) {
            this.state.currentPageId = pageIds[0];
            return pageIds[0];
        }
        return null;
    }
    /**
     * Set the current page.
     */
    setCurrentPage(pageId) {
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
    getPageIds() {
        const doc = this.sceneGraph.getDocument();
        if (!doc)
            return [];
        return this.sceneGraph.getChildIds(doc.id);
    }
    wireInputHandlers() {
        if (!this.pointerHandler || !this.keyboardHandler || !this.toolManager)
            return;
        // Pointer events
        this.pointerHandler.on('pointerdown', (event) => {
            this.toolManager.handlePointerDown(event);
        });
        this.pointerHandler.on('pointermove', (event) => {
            this.toolManager.handlePointerMove(event);
        });
        this.pointerHandler.on('pointerup', (event) => {
            this.toolManager.handlePointerUp(event);
        });
        this.pointerHandler.on('doubleclick', (event) => {
            this.toolManager.handleDoubleClick(event);
        });
        this.pointerHandler.on('wheel', (event) => {
            if (!this.canvas)
                return;
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
            }
            else {
                // Pan with wheel (deltaX/Y are CSS pixels, convert to canvas pixels)
                this.viewport?.pan(-event.deltaX * scaleX, -event.deltaY * scaleY);
            }
        });
        // Keyboard shortcuts
        this.keyboardHandler.on('shortcut', ({ action }) => {
            this.handleShortcut(action);
        });
        this.keyboardHandler.on('keydown', (event) => {
            this.toolManager.handleKeyDown(event);
        });
        this.keyboardHandler.on('keyup', (event) => {
            this.toolManager.handleKeyUp(event);
        });
    }
    handleShortcut(action) {
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
    deleteSelection() {
        const selection = this.selectionManager.getSelectedNodeIds();
        for (const nodeId of selection) {
            this.sceneGraph.deleteNode(nodeId);
        }
        this.clearSelection();
    }
    setupEventForwarding() {
        // Forward selection changes
        this.selectionManager.on('selection:changed', ({ nodeIds }) => {
            if (this.toolManager) {
                this.toolManager.setSelectedNodeIds(nodeIds);
            }
            this.emit('selection:changed', { nodeIds });
        });
    }
    handleResize = () => {
        this.renderer?.resize();
    };
}
/**
 * Create a DesignLibre runtime.
 */
export function createDesignLibreRuntime(options) {
    return new DesignLibreRuntime(options);
}
//# sourceMappingURL=designlibre-runtime.js.map