/**
 * DesignLibre Runtime
 *
 * Main runtime class that coordinates all subsystems.
 */
import type { NodeId } from '@core/types/common';
import { EventEmitter } from '@core/events/event-emitter';
import { SceneGraph } from '@scene/graph/scene-graph';
import { Renderer } from '@renderer/core/renderer';
import { Viewport } from '@renderer/core/viewport';
import { ToolManager } from '@tools/base/tool-manager';
import { PolygonTool } from '@tools/drawing/polygon-tool';
import { StarTool } from '@tools/drawing/star-tool';
import { SelectionManager } from '@scene/selection/selection-manager';
import { LayoutEngine } from '@layout/layout-engine';
import type { PreserveArchive, PreserveWriteOptions } from '@persistence/preserve';
import { StyleManager } from '@core/styles/style-manager';
import { KeyboardManager } from '@ui/keyboard';
/**
 * Runtime events
 */
export type RuntimeEvents = {
    'initialized': undefined;
    'document:created': {
        documentId: NodeId;
    };
    'document:loaded': {
        documentId: NodeId;
    };
    'document:saved': {
        documentId: NodeId;
    };
    'tool:changed': {
        tool: string;
    };
    'selection:changed': {
        nodeIds: NodeId[];
    };
    'error': {
        error: Error;
    };
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
 * DesignLibre Runtime
 */
export declare class DesignLibreRuntime extends EventEmitter<RuntimeEvents> {
    private sceneGraph;
    private renderer;
    private viewport;
    private toolManager;
    private selectionManager;
    private layoutEngine;
    private undoManager;
    private styleManager;
    private pointerHandler;
    private keyboardHandler;
    private keyboardManager;
    private canvas;
    private serializer;
    private storage;
    private autosaveManager;
    private pngExporter;
    private svgExporter;
    private selectTool;
    private moveTool;
    private resizeTool;
    private rotateTool;
    private rectangleTool;
    private ellipseTool;
    private lineTool;
    private penTool;
    private polygonTool;
    private starTool;
    private pencilTool;
    private imageTool;
    private handTool;
    private state;
    private lastUsedFillColor;
    private options;
    constructor(options?: RuntimeOptions);
    /**
     * Initialize the runtime with a container element.
     */
    initialize(container: HTMLElement): Promise<void>;
    /**
     * Create a new document.
     */
    createDocument(name?: string): NodeId;
    /**
     * Load a document from storage.
     */
    loadDocument(documentId: string): Promise<void>;
    /**
     * Save current document to storage.
     */
    saveDocument(): Promise<void>;
    /**
     * Get document name.
     */
    getDocumentName(): string;
    /**
     * Get selected node IDs.
     */
    getSelection(): NodeId[];
    /**
     * Set selection.
     */
    setSelection(nodeIds: NodeId[]): void;
    /**
     * Clear selection.
     */
    clearSelection(): void;
    /**
     * Set the active tool.
     */
    setTool(toolName: string): void;
    /**
     * Get active tool name.
     */
    getActiveTool(): string;
    /**
     * Undo last operation.
     */
    undo(): boolean;
    /**
     * Redo last undone operation.
     */
    redo(): boolean;
    /**
     * Check if undo is available.
     */
    canUndo(): boolean;
    /**
     * Check if redo is available.
     */
    canRedo(): boolean;
    /**
     * Export node to PNG.
     */
    exportPNG(nodeId: NodeId, options?: {
        scale?: number;
        backgroundColor?: string;
    }): Promise<Blob>;
    /**
     * Export node to SVG.
     */
    exportSVG(nodeId: NodeId, options?: {
        padding?: number;
    }): string;
    /**
     * Download node as PNG.
     */
    downloadPNG(nodeId: NodeId, filename?: string): Promise<void>;
    /**
     * Download node as SVG.
     */
    downloadSVG(nodeId: NodeId, filename?: string): void;
    /**
     * Save the current document as a .preserve file.
     */
    saveAsPreserve(filename?: string, options?: PreserveWriteOptions): Promise<void>;
    /**
     * Get the current document as a .preserve Blob.
     */
    getPreserveBlob(options?: PreserveWriteOptions): Promise<Blob>;
    /**
     * Load a .preserve file and replace the current document with its contents.
     */
    loadPreserve(file: File | Blob): Promise<void>;
    /**
     * Recursively import a preserve node and its children.
     */
    private importPreserveNode;
    /**
     * Import nodes from a .preserve archive into the current page (append mode).
     */
    importFromPreserve(archive: PreserveArchive): Promise<NodeId[]>;
    private downloadBlob;
    /**
     * Get current zoom level.
     */
    getZoom(): number;
    /**
     * Set zoom level.
     */
    setZoom(zoom: number): void;
    /**
     * Zoom to fit all content.
     */
    zoomToFit(): void;
    /**
     * Reset viewport to default.
     */
    resetViewport(): void;
    /**
     * Get the scene graph.
     */
    getSceneGraph(): SceneGraph;
    /**
     * Get the layout engine.
     */
    getLayoutEngine(): LayoutEngine;
    /**
     * Get a node by ID.
     */
    getNode(nodeId: NodeId): ReturnType<SceneGraph['getNode']>;
    /**
     * Get the tool manager.
     */
    getToolManager(): ToolManager | null;
    /**
     * Get the viewport.
     */
    getViewport(): Viewport | null;
    /**
     * Get the selection manager.
     */
    getSelectionManager(): SelectionManager;
    /**
     * Get the renderer.
     */
    getRenderer(): Renderer | null;
    /**
     * Get the keyboard manager.
     */
    getKeyboardManager(): KeyboardManager | null;
    /**
     * Get the style manager.
     */
    getStyleManager(): StyleManager;
    /**
     * Get the polygon tool.
     */
    getPolygonTool(): PolygonTool | null;
    /**
     * Get the star tool.
     */
    getStarTool(): StarTool | null;
    /**
     * Get the last used fill color for shapes.
     */
    getLastUsedFillColor(): {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    /**
     * Set the last used fill color for shapes.
     */
    setLastUsedFillColor(color: {
        r: number;
        g: number;
        b: number;
        a: number;
    }): void;
    /**
     * Dispose of the runtime.
     */
    dispose(): void;
    private initializeTools;
    /**
     * Get the current page ID.
     */
    getCurrentPageId(): NodeId | null;
    /**
     * Set the current page.
     */
    setCurrentPage(pageId: NodeId): void;
    /**
     * Get all page IDs in the document.
     */
    getPageIds(): NodeId[];
    private wireInputHandlers;
    private handleShortcut;
    private deleteSelection;
    private setupEventForwarding;
    private handleResize;
}
/**
 * Create a DesignLibre runtime.
 */
export declare function createDesignLibreRuntime(options?: RuntimeOptions): DesignLibreRuntime;
//# sourceMappingURL=designlibre-runtime.d.ts.map