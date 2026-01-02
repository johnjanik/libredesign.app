/**
 * Keyboard Shortcut Manager
 *
 * Centralized handling of all keyboard shortcuts for DesignLibre.
 */
import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
export interface ShortcutDefinition {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
    action: (manager: KeyboardManager) => void;
    description: string;
    category: string;
}
/**
 * KeyboardManager - handles all keyboard shortcuts
 */
export declare class KeyboardManager {
    private runtime;
    private shortcuts;
    private clipboard;
    private pasteOffset;
    private boundHandleKeyDown;
    constructor(runtime: DesignLibreRuntime);
    /**
     * Generate a unique key for a shortcut combination
     */
    private getShortcutKey;
    /**
     * Register a shortcut
     */
    register(def: ShortcutDefinition): void;
    /**
     * Handle keydown events
     */
    private handleKeyDown;
    /**
     * Get all registered shortcuts grouped by category
     */
    getShortcutsByCategory(): Map<string, ShortcutDefinition[]>;
    /**
     * Get runtime instance
     */
    getRuntime(): DesignLibreRuntime;
    getSceneGraph(): import("../../scene").SceneGraph;
    getSelectionManager(): import("../../scene/selection/selection-manager").SelectionManager;
    getSelectedNodes(): NodeData[];
    getSelectedNodeIds(): NodeId[];
    /**
     * Deep clone a node's properties
     */
    cloneNodeProps(node: NodeData): Record<string, unknown>;
    /**
     * Create a node with full property support
     */
    createNodeWithProps(type: string, parentId: NodeId, props: Record<string, unknown>): NodeId | null;
    copyToClipboard(nodes: NodeData[]): void;
    pasteFromClipboard(): NodeId[];
    hasClipboardContent(): boolean;
    private registerAllShortcuts;
    private actionUndo;
    private actionRedo;
    private actionSelectAll;
    private actionEscape;
    actionCopy(): void;
    actionCut(): void;
    actionPaste(): void;
    actionDuplicate(): void;
    actionDelete(): void;
    private actionSelectNextSibling;
    private actionSelectPrevSibling;
    private actionSelectChild;
    private actionSelectParent;
    actionGroup(): void;
    actionUngroup(): void;
    private actionZoomTo100;
    actionZoomToFit(): void;
    actionZoomToSelection(): void;
    private actionZoomIn;
    private actionZoomOut;
    private actionSetTool;
    private actionNudge;
    private actionResize;
    actionBringForward(): void;
    actionSendBackward(): void;
    actionBringToFront(): void;
    actionSendToBack(): void;
    private actionFlipHorizontal;
    private actionFlipVertical;
    private actionAlign;
    private actionDistribute;
    private actionTextStyle;
    private actionFontSize;
    private actionTextAlign;
    private actionCreateComponent;
    private actionDetachInstance;
    private actionGoToMainComponent;
    private actionFlatten;
    private actionBooleanOperation;
    actionLock(): void;
    actionHide(): void;
    private propertiesClipboard;
    private actionCopyProperties;
    private actionPasteProperties;
    private actionOutlineStroke;
    private actionFlattenToImage;
    /**
     * Dispose of the keyboard manager
     */
    dispose(): void;
}
/**
 * Create a keyboard manager
 */
export declare function createKeyboardManager(runtime: DesignLibreRuntime): KeyboardManager;
//# sourceMappingURL=keyboard-manager.d.ts.map