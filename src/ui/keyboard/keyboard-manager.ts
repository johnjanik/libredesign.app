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
 * Clipboard data for copy/paste operations
 */
interface ClipboardItem {
  type: string;
  props: Record<string, unknown>;
}

/**
 * KeyboardManager - handles all keyboard shortcuts
 */
export class KeyboardManager {
  private runtime: DesignLibreRuntime;
  private shortcuts: Map<string, ShortcutDefinition> = new Map();
  private clipboard: ClipboardItem[] = [];
  private pasteOffset = 0;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;

  constructor(runtime: DesignLibreRuntime) {
    this.runtime = runtime;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.registerAllShortcuts();
    document.addEventListener('keydown', this.boundHandleKeyDown);
  }

  /**
   * Generate a unique key for a shortcut combination
   */
  private getShortcutKey(key: string, ctrl = false, shift = false, alt = false, meta = false): string {
    const parts: string[] = [];
    if (ctrl || meta) parts.push('ctrl');
    if (shift) parts.push('shift');
    if (alt) parts.push('alt');
    parts.push(key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Register a shortcut
   */
  register(def: ShortcutDefinition): void {
    const key = this.getShortcutKey(def.key, def.ctrl, def.shift, def.alt, def.meta);
    this.shortcuts.set(key, def);
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Ignore if in input field
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow Escape to blur input
      if (e.key === 'Escape') {
        target.blur();
        e.preventDefault();
      }
      return;
    }

    const shortcutKey = this.getShortcutKey(
      e.key,
      e.ctrlKey || e.metaKey,
      e.shiftKey,
      e.altKey
    );

    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      e.preventDefault();
      shortcut.action(this);
    }
  }

  /**
   * Get all registered shortcuts grouped by category
   */
  getShortcutsByCategory(): Map<string, ShortcutDefinition[]> {
    const categories = new Map<string, ShortcutDefinition[]>();
    for (const shortcut of this.shortcuts.values()) {
      const list = categories.get(shortcut.category) ?? [];
      list.push(shortcut);
      categories.set(shortcut.category, list);
    }
    return categories;
  }

  /**
   * Get runtime instance
   */
  getRuntime(): DesignLibreRuntime {
    return this.runtime;
  }

  // =========================================================================
  // Helper Methods for Actions
  // =========================================================================

  getSceneGraph() {
    return this.runtime.getSceneGraph();
  }

  getSelectionManager() {
    return this.runtime.getSelectionManager();
  }

  getSelectedNodes(): NodeData[] {
    const sceneGraph = this.getSceneGraph();
    const selectionManager = this.getSelectionManager();
    if (!sceneGraph || !selectionManager) return [];

    const ids = selectionManager.getSelectedNodeIds();
    const nodes: NodeData[] = [];
    for (const id of ids) {
      const node = sceneGraph.getNode(id);
      if (node) nodes.push(node);
    }
    return nodes;
  }

  getSelectedNodeIds(): NodeId[] {
    return this.getSelectionManager()?.getSelectedNodeIds() ?? [];
  }

  /**
   * Deep clone a node's properties
   */
  cloneNodeProps(node: NodeData): Record<string, unknown> {
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
    return props;
  }

  /**
   * Create a node with full property support
   */
  createNodeWithProps(type: string, parentId: NodeId, props: Record<string, unknown>): NodeId | null {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return null;

    // Create with basic options
    const createOptions: Record<string, unknown> = {
      name: props['name'],
      x: props['x'],
      y: props['y'],
      width: props['width'],
      height: props['height'],
    };

    // Add type-specific creation options
    if (type === 'VECTOR') {
      createOptions['vectorPaths'] = props['vectorPaths'];
      createOptions['fills'] = props['fills'];
      createOptions['strokes'] = props['strokes'];
      createOptions['strokeWeight'] = props['strokeWeight'];
    } else if (type === 'TEXT') {
      createOptions['characters'] = props['characters'];
    } else if (type === 'IMAGE') {
      createOptions['imageRef'] = props['imageRef'];
      createOptions['naturalWidth'] = props['naturalWidth'];
      createOptions['naturalHeight'] = props['naturalHeight'];
      createOptions['scaleMode'] = props['scaleMode'];
    }

    const newNodeId = sceneGraph.createNode(
      type as 'FRAME' | 'GROUP' | 'VECTOR' | 'TEXT' | 'IMAGE' | 'COMPONENT' | 'INSTANCE',
      parentId,
      -1,
      createOptions as Parameters<typeof sceneGraph.createNode>[3]
    );

    // Apply remaining properties via updateNode
    const updateProps: Record<string, unknown> = {};
    const skipKeys = ['id', 'type', 'parentId', 'childIds', 'pluginData', 'name', 'x', 'y', 'width', 'height'];

    for (const key of Object.keys(props)) {
      if (!skipKeys.includes(key)) {
        updateProps[key] = props[key];
      }
    }

    if (Object.keys(updateProps).length > 0) {
      sceneGraph.updateNode(newNodeId, updateProps as Partial<NodeData>);
    }

    return newNodeId;
  }

  // =========================================================================
  // Clipboard Operations
  // =========================================================================

  copyToClipboard(nodes: NodeData[]): void {
    this.clipboard = [];
    this.pasteOffset = 0;
    for (const node of nodes) {
      if (node.type === 'PAGE' || node.type === 'DOCUMENT') continue;
      this.clipboard.push({
        type: node.type,
        props: this.cloneNodeProps(node),
      });
    }
  }

  pasteFromClipboard(): NodeId[] {
    if (this.clipboard.length === 0) return [];

    const sceneGraph = this.getSceneGraph();
    const currentPageId = this.runtime.getCurrentPageId();
    if (!sceneGraph || !currentPageId) return [];

    this.pasteOffset += 20;
    const newNodeIds: NodeId[] = [];

    for (const item of this.clipboard) {
      const props = { ...item.props };
      if (typeof props['x'] === 'number') {
        props['x'] = (props['x'] as number) + this.pasteOffset;
      }
      if (typeof props['y'] === 'number') {
        props['y'] = (props['y'] as number) + this.pasteOffset;
      }

      const newId = this.createNodeWithProps(item.type, currentPageId, props);
      if (newId) newNodeIds.push(newId);
    }

    return newNodeIds;
  }

  hasClipboardContent(): boolean {
    return this.clipboard.length > 0;
  }

  // =========================================================================
  // Register All Shortcuts
  // =========================================================================

  private registerAllShortcuts(): void {
    // File Operations
    this.register({
      key: 'n', ctrl: true,
      action: () => this.runtime.emit('command:newDocument', {}),
      description: 'New document',
      category: 'File',
    });

    this.register({
      key: 'o', ctrl: true,
      action: () => this.runtime.emit('command:openFile', {}),
      description: 'Open file',
      category: 'File',
    });

    this.register({
      key: 's', ctrl: true,
      action: () => this.runtime.saveDocument(),
      description: 'Save',
      category: 'File',
    });

    this.register({
      key: 's', ctrl: true, shift: true,
      action: () => this.runtime.emit('command:saveAs', {}),
      description: 'Save as',
      category: 'File',
    });

    this.register({
      key: 'e', ctrl: true,
      action: () => this.runtime.emit('command:export', {}),
      description: 'Export selection',
      category: 'File',
    });

    // Edit / History
    this.register({
      key: 'z', ctrl: true,
      action: () => this.actionUndo(),
      description: 'Undo',
      category: 'Edit',
    });

    this.register({
      key: 'z', ctrl: true, shift: true,
      action: () => this.actionRedo(),
      description: 'Redo',
      category: 'Edit',
    });

    this.register({
      key: 'y', ctrl: true,
      action: () => this.actionRedo(),
      description: 'Redo',
      category: 'Edit',
    });

    this.register({
      key: 'a', ctrl: true,
      action: () => this.actionSelectAll(),
      description: 'Select all',
      category: 'Edit',
    });

    this.register({
      key: 'a', ctrl: true, shift: true,
      action: () => this.getSelectionManager()?.clear(),
      description: 'Deselect all',
      category: 'Edit',
    });

    this.register({
      key: 'Escape',
      action: () => this.actionEscape(),
      description: 'Deselect / Cancel',
      category: 'Edit',
    });

    // Clipboard
    this.register({
      key: 'c', ctrl: true,
      action: () => this.actionCopy(),
      description: 'Copy',
      category: 'Edit',
    });

    this.register({
      key: 'x', ctrl: true,
      action: () => this.actionCut(),
      description: 'Cut',
      category: 'Edit',
    });

    this.register({
      key: 'v', ctrl: true,
      action: () => this.actionPaste(),
      description: 'Paste',
      category: 'Edit',
    });

    this.register({
      key: 'd', ctrl: true,
      action: () => this.actionDuplicate(),
      description: 'Duplicate',
      category: 'Edit',
    });

    this.register({
      key: 'Delete',
      action: () => this.actionDelete(),
      description: 'Delete selected',
      category: 'Edit',
    });

    this.register({
      key: 'Backspace',
      action: () => this.actionDelete(),
      description: 'Delete selected',
      category: 'Edit',
    });

    this.register({
      key: 'F2',
      action: () => this.runtime.emit('command:rename', {}),
      description: 'Rename selected',
      category: 'Edit',
    });

    // Selection & Navigation
    this.register({
      key: 'Tab',
      action: () => this.actionSelectNextSibling(),
      description: 'Select next sibling',
      category: 'Selection',
    });

    this.register({
      key: 'Tab', shift: true,
      action: () => this.actionSelectPrevSibling(),
      description: 'Select previous sibling',
      category: 'Selection',
    });

    this.register({
      key: 'Enter',
      action: () => this.actionSelectChild(),
      description: 'Select first child',
      category: 'Selection',
    });

    this.register({
      key: 'Enter', shift: true,
      action: () => this.actionSelectParent(),
      description: 'Select parent',
      category: 'Selection',
    });

    this.register({
      key: '\\',
      action: () => this.actionSelectParent(),
      description: 'Select parent',
      category: 'Selection',
    });

    this.register({
      key: 'g', ctrl: true,
      action: () => this.actionGroup(),
      description: 'Group selection',
      category: 'Selection',
    });

    this.register({
      key: 'g', ctrl: true, shift: true,
      action: () => this.actionUngroup(),
      description: 'Ungroup',
      category: 'Selection',
    });

    // View / Canvas
    this.register({
      key: '0', ctrl: true,
      action: () => this.actionZoomTo100(),
      description: 'Zoom to 100%',
      category: 'View',
    });

    this.register({
      key: '1', ctrl: true,
      action: () => this.actionZoomToFit(),
      description: 'Zoom to fit',
      category: 'View',
    });

    this.register({
      key: '2', ctrl: true,
      action: () => this.actionZoomToSelection(),
      description: 'Zoom to selection',
      category: 'View',
    });

    this.register({
      key: '=', ctrl: true,
      action: () => this.actionZoomIn(),
      description: 'Zoom in',
      category: 'View',
    });

    this.register({
      key: '+', ctrl: true,
      action: () => this.actionZoomIn(),
      description: 'Zoom in',
      category: 'View',
    });

    this.register({
      key: '-', ctrl: true,
      action: () => this.actionZoomOut(),
      description: 'Zoom out',
      category: 'View',
    });

    this.register({
      key: '\'', ctrl: true,
      action: () => this.runtime.emit('command:togglePixelGrid', {}),
      description: 'Show/hide pixel grid',
      category: 'View',
    });

    this.register({
      key: '\\', ctrl: true,
      action: () => this.runtime.emit('command:toggleUI', {}),
      description: 'Show/hide UI',
      category: 'View',
    });

    this.register({
      key: '\\', ctrl: true, shift: true,
      action: () => this.runtime.emit('command:toggleRulers', {}),
      description: 'Show/hide rulers',
      category: 'View',
    });

    // Tools
    this.register({
      key: 'v',
      action: () => this.actionSetTool('select'),
      description: 'Move/Select tool',
      category: 'Tools',
    });

    this.register({
      key: 'k',
      action: () => this.actionSetTool('scale'),
      description: 'Scale tool',
      category: 'Tools',
    });

    this.register({
      key: 'h',
      action: () => this.actionSetTool('hand'),
      description: 'Hand (pan) tool',
      category: 'Tools',
    });

    this.register({
      key: 'r',
      action: () => this.actionSetTool('rectangle'),
      description: 'Rectangle tool',
      category: 'Tools',
    });

    this.register({
      key: 'o',
      action: () => this.actionSetTool('ellipse'),
      description: 'Ellipse tool',
      category: 'Tools',
    });

    this.register({
      key: 'l',
      action: () => this.actionSetTool('line'),
      description: 'Line tool',
      category: 'Tools',
    });

    this.register({
      key: 'l', shift: true,
      action: () => this.actionSetTool('arrow'),
      description: 'Arrow tool',
      category: 'Tools',
    });

    this.register({
      key: 'p',
      action: () => this.actionSetTool('pen'),
      description: 'Pen tool',
      category: 'Tools',
    });

    this.register({
      key: 'p', shift: true,
      action: () => this.actionSetTool('pencil'),
      description: 'Pencil tool',
      category: 'Tools',
    });

    this.register({
      key: 't',
      action: () => this.actionSetTool('text'),
      description: 'Text tool',
      category: 'Tools',
    });

    this.register({
      key: 'f',
      action: () => this.actionSetTool('frame'),
      description: 'Frame tool',
      category: 'Tools',
    });

    this.register({
      key: 's',
      action: () => this.actionSetTool('slice'),
      description: 'Slice tool',
      category: 'Tools',
    });

    this.register({
      key: 'i',
      action: () => this.actionSetTool('eyedropper'),
      description: 'Eyedropper tool',
      category: 'Tools',
    });

    this.register({
      key: 'c',
      action: () => this.actionSetTool('comment'),
      description: 'Comment tool',
      category: 'Tools',
    });

    // Transform - Arrow keys
    this.register({
      key: 'ArrowUp',
      action: () => this.actionNudge(0, -1),
      description: 'Nudge up 1px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowDown',
      action: () => this.actionNudge(0, 1),
      description: 'Nudge down 1px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowLeft',
      action: () => this.actionNudge(-1, 0),
      description: 'Nudge left 1px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowRight',
      action: () => this.actionNudge(1, 0),
      description: 'Nudge right 1px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowUp', shift: true,
      action: () => this.actionNudge(0, -10),
      description: 'Nudge up 10px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowDown', shift: true,
      action: () => this.actionNudge(0, 10),
      description: 'Nudge down 10px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowLeft', shift: true,
      action: () => this.actionNudge(-10, 0),
      description: 'Nudge left 10px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowRight', shift: true,
      action: () => this.actionNudge(10, 0),
      description: 'Nudge right 10px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowUp', ctrl: true,
      action: () => this.actionResize(0, -1),
      description: 'Resize height -1px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowDown', ctrl: true,
      action: () => this.actionResize(0, 1),
      description: 'Resize height +1px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowLeft', ctrl: true,
      action: () => this.actionResize(-1, 0),
      description: 'Resize width -1px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowRight', ctrl: true,
      action: () => this.actionResize(1, 0),
      description: 'Resize width +1px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowUp', ctrl: true, shift: true,
      action: () => this.actionResize(0, -10),
      description: 'Resize height -10px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowDown', ctrl: true, shift: true,
      action: () => this.actionResize(0, 10),
      description: 'Resize height +10px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowLeft', ctrl: true, shift: true,
      action: () => this.actionResize(-10, 0),
      description: 'Resize width -10px',
      category: 'Transform',
    });

    this.register({
      key: 'ArrowRight', ctrl: true, shift: true,
      action: () => this.actionResize(10, 0),
      description: 'Resize width +10px',
      category: 'Transform',
    });

    // Arrange / Layer Order
    this.register({
      key: ']', ctrl: true,
      action: () => this.actionBringForward(),
      description: 'Bring forward',
      category: 'Arrange',
    });

    this.register({
      key: '[', ctrl: true,
      action: () => this.actionSendBackward(),
      description: 'Send backward',
      category: 'Arrange',
    });

    this.register({
      key: ']', ctrl: true, shift: true,
      action: () => this.actionBringToFront(),
      description: 'Bring to front',
      category: 'Arrange',
    });

    this.register({
      key: '[', ctrl: true, shift: true,
      action: () => this.actionSendToBack(),
      description: 'Send to back',
      category: 'Arrange',
    });

    this.register({
      key: 'k', ctrl: true, alt: true,
      action: () => this.actionFlipHorizontal(),
      description: 'Flip horizontal',
      category: 'Arrange',
    });

    this.register({
      key: 'l', ctrl: true, alt: true,
      action: () => this.actionFlipVertical(),
      description: 'Flip vertical',
      category: 'Arrange',
    });

    // Alignment
    this.register({
      key: 'a', alt: true,
      action: () => this.actionAlign('left'),
      description: 'Align left',
      category: 'Alignment',
    });

    this.register({
      key: 'd', alt: true,
      action: () => this.actionAlign('right'),
      description: 'Align right',
      category: 'Alignment',
    });

    this.register({
      key: 'h', alt: true,
      action: () => this.actionAlign('centerH'),
      description: 'Align horizontal center',
      category: 'Alignment',
    });

    this.register({
      key: 'w', alt: true,
      action: () => this.actionAlign('top'),
      description: 'Align top',
      category: 'Alignment',
    });

    this.register({
      key: 's', alt: true,
      action: () => this.actionAlign('bottom'),
      description: 'Align bottom',
      category: 'Alignment',
    });

    this.register({
      key: 'v', alt: true,
      action: () => this.actionAlign('centerV'),
      description: 'Align vertical center',
      category: 'Alignment',
    });

    this.register({
      key: 'h', ctrl: true, alt: true,
      action: () => this.actionDistribute('horizontal'),
      description: 'Distribute horizontal',
      category: 'Alignment',
    });

    this.register({
      key: 'v', ctrl: true, alt: true,
      action: () => this.actionDistribute('vertical'),
      description: 'Distribute vertical',
      category: 'Alignment',
    });

    // Text Editing
    this.register({
      key: 'b', ctrl: true,
      action: () => this.actionTextStyle('bold'),
      description: 'Bold',
      category: 'Text',
    });

    this.register({
      key: 'i', ctrl: true,
      action: () => this.actionTextStyle('italic'),
      description: 'Italic',
      category: 'Text',
    });

    this.register({
      key: 'u', ctrl: true,
      action: () => this.actionTextStyle('underline'),
      description: 'Underline',
      category: 'Text',
    });

    this.register({
      key: 'k', ctrl: true, shift: true,
      action: () => this.actionTextStyle('strikethrough'),
      description: 'Strikethrough',
      category: 'Text',
    });

    this.register({
      key: '<', ctrl: true, shift: true,
      action: () => this.actionFontSize(-1),
      description: 'Decrease font size',
      category: 'Text',
    });

    this.register({
      key: '>', ctrl: true, shift: true,
      action: () => this.actionFontSize(1),
      description: 'Increase font size',
      category: 'Text',
    });

    this.register({
      key: 'l', ctrl: true, alt: true,
      action: () => this.actionTextAlign('left'),
      description: 'Align text left',
      category: 'Text',
    });

    this.register({
      key: 't', ctrl: true, alt: true,
      action: () => this.actionTextAlign('center'),
      description: 'Align text center',
      category: 'Text',
    });

    this.register({
      key: 'r', ctrl: true, alt: true,
      action: () => this.actionTextAlign('right'),
      description: 'Align text right',
      category: 'Text',
    });

    this.register({
      key: 'j', ctrl: true, alt: true,
      action: () => this.actionTextAlign('justify'),
      description: 'Justify text',
      category: 'Text',
    });

    // Components
    this.register({
      key: 'k', ctrl: true, alt: true,
      action: () => this.actionCreateComponent(),
      description: 'Create component',
      category: 'Components',
    });

    this.register({
      key: 'b', ctrl: true, alt: true,
      action: () => this.actionDetachInstance(),
      description: 'Detach instance',
      category: 'Components',
    });

    this.register({
      key: 'o', ctrl: true, alt: true,
      action: () => this.actionGoToMainComponent(),
      description: 'Go to main component',
      category: 'Components',
    });

    // Boolean Operations
    this.register({
      key: 'e', ctrl: true,
      action: () => this.actionFlatten(),
      description: 'Flatten selection',
      category: 'Boolean',
    });

    this.register({
      key: 'u', ctrl: true, alt: true,
      action: () => this.actionBooleanOperation('union'),
      description: 'Union',
      category: 'Boolean',
    });

    this.register({
      key: 's', ctrl: true, alt: true,
      action: () => this.actionBooleanOperation('subtract'),
      description: 'Subtract',
      category: 'Boolean',
    });

    this.register({
      key: 'i', ctrl: true, alt: true,
      action: () => this.actionBooleanOperation('intersect'),
      description: 'Intersect',
      category: 'Boolean',
    });

    this.register({
      key: 'x', ctrl: true, alt: true,
      action: () => this.actionBooleanOperation('exclude'),
      description: 'Exclude',
      category: 'Boolean',
    });

    // Miscellaneous
    this.register({
      key: '/',  ctrl: true,
      action: () => this.runtime.emit('command:quickActions', {}),
      description: 'Quick actions',
      category: 'Misc',
    });

    this.register({
      key: 'p', ctrl: true,
      action: () => this.runtime.emit('command:quickActions', {}),
      description: 'Quick actions',
      category: 'Misc',
    });

    this.register({
      key: '?',
      action: () => this.runtime.emit('command:showShortcuts', {}),
      description: 'Show keyboard shortcuts',
      category: 'Misc',
    });

    this.register({
      key: 'l', ctrl: true,
      action: () => this.actionToggleLock(),
      description: 'Lock/unlock selection',
      category: 'Misc',
    });

    this.register({
      key: 'h', ctrl: true, shift: true,
      action: () => this.actionToggleVisibility(),
      description: 'Show/hide selection',
      category: 'Misc',
    });

    this.register({
      key: 'c', ctrl: true, alt: true,
      action: () => this.actionCopyProperties(),
      description: 'Copy properties',
      category: 'Misc',
    });

    this.register({
      key: 'v', ctrl: true, alt: true,
      action: () => this.actionPasteProperties(),
      description: 'Paste properties',
      category: 'Misc',
    });

    this.register({
      key: 'o', ctrl: true, shift: true,
      action: () => this.actionOutlineStroke(),
      description: 'Outline stroke',
      category: 'Misc',
    });

    this.register({
      key: 'j', ctrl: true,
      action: () => this.actionFlattenToImage(),
      description: 'Flatten to image',
      category: 'Misc',
    });
  }

  // =========================================================================
  // Action Implementations
  // =========================================================================

  private actionUndo(): void {
    // TODO: Implement undo system
    this.runtime.emit('command:undo', {});
  }

  private actionRedo(): void {
    // TODO: Implement redo system
    this.runtime.emit('command:redo', {});
  }

  private actionSelectAll(): void {
    const sceneGraph = this.getSceneGraph();
    const selectionManager = this.getSelectionManager();
    const currentPageId = this.runtime.getCurrentPageId();
    if (!sceneGraph || !selectionManager || !currentPageId) return;

    const childIds = sceneGraph.getChildIds(currentPageId);
    if (childIds.length > 0) {
      selectionManager.select(childIds, 'replace');
    }
  }

  private actionEscape(): void {
    const selectionManager = this.getSelectionManager();
    selectionManager?.clear();
    this.runtime.emit('command:cancel', {});
  }

  private actionCopy(): void {
    const nodes = this.getSelectedNodes();
    if (nodes.length > 0) {
      this.copyToClipboard(nodes);
    }
  }

  private actionCut(): void {
    this.actionCopy();
    this.actionDelete();
  }

  private actionPaste(): void {
    const newIds = this.pasteFromClipboard();
    if (newIds.length > 0) {
      this.getSelectionManager()?.select(newIds, 'replace');
    }
  }

  private actionDuplicate(): void {
    const nodes = this.getSelectedNodes();
    if (nodes.length === 0) return;

    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    const newIds: NodeId[] = [];
    const offset = 10;

    for (const node of nodes) {
      if (node.type === 'PAGE' || node.type === 'DOCUMENT') continue;

      const parent = sceneGraph.getParent(node.id);
      if (!parent) continue;

      const props = this.cloneNodeProps(node);
      props['name'] = `${node.name} copy`;
      if (typeof props['x'] === 'number') props['x'] = (props['x'] as number) + offset;
      if (typeof props['y'] === 'number') props['y'] = (props['y'] as number) + offset;

      const newId = this.createNodeWithProps(node.type, parent.id, props);
      if (newId) newIds.push(newId);
    }

    if (newIds.length > 0) {
      this.getSelectionManager()?.select(newIds, 'replace');
    }
  }

  private actionDelete(): void {
    const sceneGraph = this.getSceneGraph();
    const selectionManager = this.getSelectionManager();
    if (!sceneGraph || !selectionManager) return;

    const selectedIds = this.getSelectedNodeIds();
    const deletableIds = selectedIds.filter(id => {
      const node = sceneGraph.getNode(id);
      return node && node.type !== 'PAGE' && node.type !== 'DOCUMENT';
    });

    for (const id of deletableIds) {
      sceneGraph.deleteNode(id);
    }

    selectionManager.clear();
  }

  private actionSelectNextSibling(): void {
    this.getSelectionManager()?.selectNextSibling();
  }

  private actionSelectPrevSibling(): void {
    this.getSelectionManager()?.selectPreviousSibling();
  }

  private actionSelectChild(): void {
    this.getSelectionManager()?.selectChildren();
  }

  private actionSelectParent(): void {
    this.getSelectionManager()?.selectParent();
  }

  private actionGroup(): void {
    const sceneGraph = this.getSceneGraph();
    const selectionManager = this.getSelectionManager();
    if (!sceneGraph || !selectionManager) return;

    const selectedIds = this.getSelectedNodeIds();
    if (selectedIds.length < 2) return;

    // Get the parent of the first selected node
    const firstNode = sceneGraph.getNode(selectedIds[0]!);
    if (!firstNode) return;
    const parent = sceneGraph.getParent(selectedIds[0]!);
    if (!parent) return;

    // Create a group
    const groupId = sceneGraph.createNode('GROUP', parent.id, -1, { name: 'Group' });

    // Move all selected nodes into the group
    for (const nodeId of selectedIds) {
      sceneGraph.moveNode(nodeId, groupId, -1);
    }

    selectionManager.select([groupId], 'replace');
  }

  private actionUngroup(): void {
    const sceneGraph = this.getSceneGraph();
    const selectionManager = this.getSelectionManager();
    if (!sceneGraph || !selectionManager) return;

    const selectedIds = this.getSelectedNodeIds();
    const newSelection: NodeId[] = [];

    for (const groupId of selectedIds) {
      const node = sceneGraph.getNode(groupId);
      if (!node || node.type !== 'GROUP') continue;

      const parent = sceneGraph.getParent(groupId);
      if (!parent) continue;

      const childIds = sceneGraph.getChildIds(groupId);

      // Move children out of group
      for (const childId of childIds) {
        sceneGraph.moveNode(childId, parent.id, -1);
        newSelection.push(childId);
      }

      // Delete the empty group
      sceneGraph.deleteNode(groupId);
    }

    if (newSelection.length > 0) {
      selectionManager.select(newSelection, 'replace');
    }
  }

  private actionZoomTo100(): void {
    const viewport = this.runtime.getRenderer()?.getViewport();
    viewport?.setZoom(1);
  }

  private actionZoomToFit(): void {
    // Emit event for renderer to handle zoom to fit
    this.runtime.emit('command:zoomToFit', {});
  }

  private actionZoomToSelection(): void {
    const selectedIds = this.getSelectedNodeIds();
    if (selectedIds.length > 0) {
      this.runtime.emit('command:zoomToSelection', { nodeIds: selectedIds });
    }
  }

  private actionZoomIn(): void {
    const viewport = this.runtime.getRenderer()?.getViewport();
    if (viewport) {
      viewport.setZoom(viewport.getZoom() * 1.2);
    }
  }

  private actionZoomOut(): void {
    const viewport = this.runtime.getRenderer()?.getViewport();
    if (viewport) {
      viewport.setZoom(viewport.getZoom() / 1.2);
    }
  }

  private actionSetTool(tool: string): void {
    this.runtime.setTool(tool);
  }

  private actionNudge(dx: number, dy: number): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    for (const nodeId of this.getSelectedNodeIds()) {
      const node = sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node) {
        sceneGraph.updateNode(nodeId, {
          x: (node.x as number) + dx,
          y: (node.y as number) + dy,
        } as Partial<NodeData>);
      }
    }
  }

  private actionResize(dw: number, dh: number): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    for (const nodeId of this.getSelectedNodeIds()) {
      const node = sceneGraph.getNode(nodeId);
      if (node && 'width' in node && 'height' in node) {
        const newWidth = Math.max(1, (node.width as number) + dw);
        const newHeight = Math.max(1, (node.height as number) + dh);
        sceneGraph.updateNode(nodeId, {
          width: newWidth,
          height: newHeight,
        } as Partial<NodeData>);
      }
    }
  }

  private actionBringForward(): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    for (const nodeId of this.getSelectedNodeIds()) {
      sceneGraph.reorderNode(nodeId, 1);
    }
  }

  private actionSendBackward(): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    for (const nodeId of this.getSelectedNodeIds()) {
      sceneGraph.reorderNode(nodeId, -1);
    }
  }

  private actionBringToFront(): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    for (const nodeId of this.getSelectedNodeIds()) {
      const parent = sceneGraph.getParent(nodeId);
      if (parent) {
        const siblings = sceneGraph.getChildIds(parent.id);
        sceneGraph.moveNode(nodeId, parent.id, siblings.length);
      }
    }
  }

  private actionSendToBack(): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    for (const nodeId of this.getSelectedNodeIds()) {
      const parent = sceneGraph.getParent(nodeId);
      if (parent) {
        sceneGraph.moveNode(nodeId, parent.id, 0);
      }
    }
  }

  private actionFlipHorizontal(): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    for (const nodeId of this.getSelectedNodeIds()) {
      const node = sceneGraph.getNode(nodeId);
      if (node && 'rotation' in node) {
        // Flip by adjusting scale (would need scaleX property) or rotation
        // For now, emit event for renderer to handle
        this.runtime.emit('command:flipHorizontal', { nodeId });
      }
    }
  }

  private actionFlipVertical(): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    for (const nodeId of this.getSelectedNodeIds()) {
      this.runtime.emit('command:flipVertical', { nodeId });
    }
  }

  private actionAlign(alignment: 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV'): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    const selectedIds = this.getSelectedNodeIds();
    if (selectedIds.length === 0) return;

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const nodesBounds: { id: NodeId; x: number; y: number; w: number; h: number }[] = [];

    for (const id of selectedIds) {
      const node = sceneGraph.getNode(id);
      if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
        const x = node.x as number;
        const y = node.y as number;
        const w = node.width as number;
        const h = node.height as number;
        nodesBounds.push({ id, x, y, w, h });
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      }
    }

    for (const { id, x, y, w, h } of nodesBounds) {
      let newX = x, newY = y;
      switch (alignment) {
        case 'left': newX = minX; break;
        case 'right': newX = maxX - w; break;
        case 'top': newY = minY; break;
        case 'bottom': newY = maxY - h; break;
        case 'centerH': newX = minX + (maxX - minX - w) / 2; break;
        case 'centerV': newY = minY + (maxY - minY - h) / 2; break;
      }
      if (newX !== x || newY !== y) {
        sceneGraph.updateNode(id, { x: newX, y: newY } as Partial<NodeData>);
      }
    }
  }

  private actionDistribute(direction: 'horizontal' | 'vertical'): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    const selectedIds = this.getSelectedNodeIds();
    if (selectedIds.length < 3) return;

    const nodesBounds: { id: NodeId; x: number; y: number; w: number; h: number }[] = [];

    for (const id of selectedIds) {
      const node = sceneGraph.getNode(id);
      if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
        nodesBounds.push({
          id,
          x: node.x as number,
          y: node.y as number,
          w: node.width as number,
          h: node.height as number,
        });
      }
    }

    if (direction === 'horizontal') {
      nodesBounds.sort((a, b) => a.x - b.x);
      const totalWidth = nodesBounds.reduce((sum, n) => sum + n.w, 0);
      const minX = nodesBounds[0]!.x;
      const maxX = nodesBounds[nodesBounds.length - 1]!.x + nodesBounds[nodesBounds.length - 1]!.w;
      const spacing = (maxX - minX - totalWidth) / (nodesBounds.length - 1);

      let currentX = minX;
      for (const bounds of nodesBounds) {
        sceneGraph.updateNode(bounds.id, { x: currentX } as Partial<NodeData>);
        currentX += bounds.w + spacing;
      }
    } else {
      nodesBounds.sort((a, b) => a.y - b.y);
      const totalHeight = nodesBounds.reduce((sum, n) => sum + n.h, 0);
      const minY = nodesBounds[0]!.y;
      const maxY = nodesBounds[nodesBounds.length - 1]!.y + nodesBounds[nodesBounds.length - 1]!.h;
      const spacing = (maxY - minY - totalHeight) / (nodesBounds.length - 1);

      let currentY = minY;
      for (const bounds of nodesBounds) {
        sceneGraph.updateNode(bounds.id, { y: currentY } as Partial<NodeData>);
        currentY += bounds.h + spacing;
      }
    }
  }

  private actionTextStyle(style: 'bold' | 'italic' | 'underline' | 'strikethrough'): void {
    this.runtime.emit('command:textStyle', { style });
  }

  private actionFontSize(delta: number): void {
    this.runtime.emit('command:fontSize', { delta });
  }

  private actionTextAlign(align: 'left' | 'center' | 'right' | 'justify'): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    for (const nodeId of this.getSelectedNodeIds()) {
      const node = sceneGraph.getNode(nodeId);
      if (node && node.type === 'TEXT') {
        const alignMap = { left: 'LEFT', center: 'CENTER', right: 'RIGHT', justify: 'JUSTIFIED' };
        sceneGraph.updateNode(nodeId, {
          textAlignHorizontal: alignMap[align],
        } as Partial<NodeData>);
      }
    }
  }

  private actionCreateComponent(): void {
    this.runtime.emit('command:createComponent', {});
  }

  private actionDetachInstance(): void {
    this.runtime.emit('command:detachInstance', {});
  }

  private actionGoToMainComponent(): void {
    this.runtime.emit('command:goToMainComponent', {});
  }

  private actionFlatten(): void {
    this.runtime.emit('command:flatten', {});
  }

  private actionBooleanOperation(operation: 'union' | 'subtract' | 'intersect' | 'exclude'): void {
    this.runtime.emit('command:booleanOperation', { operation });
  }

  private actionToggleLock(): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    for (const nodeId of this.getSelectedNodeIds()) {
      const node = sceneGraph.getNode(nodeId);
      if (node) {
        sceneGraph.updateNode(nodeId, { locked: !node.locked } as Partial<NodeData>);
      }
    }
  }

  private actionToggleVisibility(): void {
    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    for (const nodeId of this.getSelectedNodeIds()) {
      const node = sceneGraph.getNode(nodeId);
      if (node) {
        sceneGraph.updateNode(nodeId, { visible: !node.visible } as Partial<NodeData>);
      }
    }
  }

  private propertiesClipboard: Record<string, unknown> | null = null;

  private actionCopyProperties(): void {
    const nodes = this.getSelectedNodes();
    if (nodes.length === 1) {
      this.propertiesClipboard = this.cloneNodeProps(nodes[0]!);
      // Remove transform properties - we only want appearance
      delete this.propertiesClipboard['x'];
      delete this.propertiesClipboard['y'];
      delete this.propertiesClipboard['width'];
      delete this.propertiesClipboard['height'];
      delete this.propertiesClipboard['name'];
      delete this.propertiesClipboard['type'];
    }
  }

  private actionPasteProperties(): void {
    if (!this.propertiesClipboard) return;

    const sceneGraph = this.getSceneGraph();
    if (!sceneGraph) return;

    for (const nodeId of this.getSelectedNodeIds()) {
      sceneGraph.updateNode(nodeId, this.propertiesClipboard as Partial<NodeData>);
    }
  }

  private actionOutlineStroke(): void {
    this.runtime.emit('command:outlineStroke', {});
  }

  private actionFlattenToImage(): void {
    this.runtime.emit('command:flattenToImage', {});
  }

  /**
   * Dispose of the keyboard manager
   */
  dispose(): void {
    document.removeEventListener('keydown', this.boundHandleKeyDown);
  }
}

/**
 * Create a keyboard manager
 */
export function createKeyboardManager(runtime: DesignLibreRuntime): KeyboardManager {
  return new KeyboardManager(runtime);
}
