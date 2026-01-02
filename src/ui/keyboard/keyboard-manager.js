/**
 * Keyboard Shortcut Manager
 *
 * Centralized handling of all keyboard shortcuts for DesignLibre.
 */
/**
 * KeyboardManager - handles all keyboard shortcuts
 */
export class KeyboardManager {
    runtime;
    shortcuts = new Map();
    clipboard = [];
    pasteOffset = 0;
    boundHandleKeyDown;
    constructor(runtime) {
        this.runtime = runtime;
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.registerAllShortcuts();
        document.addEventListener('keydown', this.boundHandleKeyDown);
    }
    /**
     * Generate a unique key for a shortcut combination
     */
    getShortcutKey(key, ctrl = false, shift = false, alt = false, meta = false) {
        const parts = [];
        if (ctrl || meta)
            parts.push('ctrl');
        if (shift)
            parts.push('shift');
        if (alt)
            parts.push('alt');
        parts.push(key.toLowerCase());
        return parts.join('+');
    }
    /**
     * Register a shortcut
     */
    register(def) {
        const key = this.getShortcutKey(def.key, def.ctrl, def.shift, def.alt, def.meta);
        this.shortcuts.set(key, def);
    }
    /**
     * Handle keydown events
     */
    handleKeyDown(e) {
        // Ignore if in input field
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            // Allow Escape to blur input
            if (e.key === 'Escape') {
                target.blur();
                e.preventDefault();
            }
            return;
        }
        const shortcutKey = this.getShortcutKey(e.key, e.ctrlKey || e.metaKey, e.shiftKey, e.altKey);
        const shortcut = this.shortcuts.get(shortcutKey);
        if (shortcut) {
            e.preventDefault();
            shortcut.action(this);
        }
    }
    /**
     * Get all registered shortcuts grouped by category
     */
    getShortcutsByCategory() {
        const categories = new Map();
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
    getRuntime() {
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
    getSelectedNodes() {
        const sceneGraph = this.getSceneGraph();
        const selectionManager = this.getSelectionManager();
        if (!sceneGraph || !selectionManager)
            return [];
        const ids = selectionManager.getSelectedNodeIds();
        const nodes = [];
        for (const id of ids) {
            const node = sceneGraph.getNode(id);
            if (node)
                nodes.push(node);
        }
        return nodes;
    }
    getSelectedNodeIds() {
        return this.getSelectionManager()?.getSelectedNodeIds() ?? [];
    }
    /**
     * Deep clone a node's properties
     */
    cloneNodeProps(node) {
        const props = {};
        for (const key of Object.keys(node)) {
            if (key === 'id' || key === 'parentId' || key === 'childIds')
                continue;
            const value = node[key];
            if (value !== null && typeof value === 'object') {
                props[key] = JSON.parse(JSON.stringify(value));
            }
            else {
                props[key] = value;
            }
        }
        return props;
    }
    /**
     * Create a node with full property support
     */
    createNodeWithProps(type, parentId, props) {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return null;
        // Create with basic options
        const createOptions = {
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
        }
        else if (type === 'TEXT') {
            createOptions['characters'] = props['characters'];
        }
        else if (type === 'IMAGE') {
            createOptions['imageRef'] = props['imageRef'];
            createOptions['naturalWidth'] = props['naturalWidth'];
            createOptions['naturalHeight'] = props['naturalHeight'];
            createOptions['scaleMode'] = props['scaleMode'];
        }
        const newNodeId = sceneGraph.createNode(type, parentId, -1, createOptions);
        // Apply remaining properties via updateNode
        const updateProps = {};
        const skipKeys = ['id', 'type', 'parentId', 'childIds', 'pluginData', 'name', 'x', 'y', 'width', 'height'];
        for (const key of Object.keys(props)) {
            if (!skipKeys.includes(key)) {
                updateProps[key] = props[key];
            }
        }
        if (Object.keys(updateProps).length > 0) {
            sceneGraph.updateNode(newNodeId, updateProps);
        }
        return newNodeId;
    }
    // =========================================================================
    // Clipboard Operations
    // =========================================================================
    copyToClipboard(nodes) {
        this.clipboard = [];
        this.pasteOffset = 0;
        for (const node of nodes) {
            if (node.type === 'PAGE' || node.type === 'DOCUMENT')
                continue;
            this.clipboard.push({
                type: node.type,
                props: this.cloneNodeProps(node),
            });
        }
    }
    pasteFromClipboard() {
        if (this.clipboard.length === 0)
            return [];
        const sceneGraph = this.getSceneGraph();
        const currentPageId = this.runtime.getCurrentPageId();
        if (!sceneGraph || !currentPageId)
            return [];
        this.pasteOffset += 20;
        const newNodeIds = [];
        for (const item of this.clipboard) {
            const props = { ...item.props };
            if (typeof props['x'] === 'number') {
                props['x'] = props['x'] + this.pasteOffset;
            }
            if (typeof props['y'] === 'number') {
                props['y'] = props['y'] + this.pasteOffset;
            }
            const newId = this.createNodeWithProps(item.type, currentPageId, props);
            if (newId)
                newNodeIds.push(newId);
        }
        return newNodeIds;
    }
    hasClipboardContent() {
        return this.clipboard.length > 0;
    }
    // =========================================================================
    // Register All Shortcuts
    // =========================================================================
    registerAllShortcuts() {
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
        this.register({
            key: 'Home',
            action: () => this.actionZoomToFit(),
            description: 'Zoom to fit all',
            category: 'View',
        });
        this.register({
            key: '.',
            action: () => this.actionZoomToSelection(),
            description: 'Zoom to selection',
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
            key: '/', ctrl: true,
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
    actionUndo() {
        // TODO: Implement undo system
        this.runtime.emit('command:undo', {});
    }
    actionRedo() {
        // TODO: Implement redo system
        this.runtime.emit('command:redo', {});
    }
    actionSelectAll() {
        const sceneGraph = this.getSceneGraph();
        const selectionManager = this.getSelectionManager();
        const currentPageId = this.runtime.getCurrentPageId();
        if (!sceneGraph || !selectionManager || !currentPageId)
            return;
        const childIds = sceneGraph.getChildIds(currentPageId);
        if (childIds.length > 0) {
            selectionManager.select(childIds, 'replace');
        }
    }
    actionEscape() {
        const selectionManager = this.getSelectionManager();
        selectionManager?.clear();
        this.runtime.emit('command:cancel', {});
    }
    actionCopy() {
        const nodes = this.getSelectedNodes();
        if (nodes.length > 0) {
            this.copyToClipboard(nodes);
        }
    }
    actionCut() {
        this.actionCopy();
        this.actionDelete();
    }
    actionPaste() {
        const newIds = this.pasteFromClipboard();
        if (newIds.length > 0) {
            this.getSelectionManager()?.select(newIds, 'replace');
        }
    }
    actionDuplicate() {
        const nodes = this.getSelectedNodes();
        if (nodes.length === 0)
            return;
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        const newIds = [];
        const offset = 10;
        for (const node of nodes) {
            if (node.type === 'PAGE' || node.type === 'DOCUMENT')
                continue;
            const parent = sceneGraph.getParent(node.id);
            if (!parent)
                continue;
            const props = this.cloneNodeProps(node);
            props['name'] = `${node.name} copy`;
            if (typeof props['x'] === 'number')
                props['x'] = props['x'] + offset;
            if (typeof props['y'] === 'number')
                props['y'] = props['y'] + offset;
            const newId = this.createNodeWithProps(node.type, parent.id, props);
            if (newId)
                newIds.push(newId);
        }
        if (newIds.length > 0) {
            this.getSelectionManager()?.select(newIds, 'replace');
        }
    }
    actionDelete() {
        const sceneGraph = this.getSceneGraph();
        const selectionManager = this.getSelectionManager();
        if (!sceneGraph || !selectionManager)
            return;
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
    actionSelectNextSibling() {
        this.getSelectionManager()?.selectNextSibling();
    }
    actionSelectPrevSibling() {
        this.getSelectionManager()?.selectPreviousSibling();
    }
    actionSelectChild() {
        this.getSelectionManager()?.selectChildren();
    }
    actionSelectParent() {
        this.getSelectionManager()?.selectParent();
    }
    actionGroup() {
        const sceneGraph = this.getSceneGraph();
        const selectionManager = this.getSelectionManager();
        if (!sceneGraph || !selectionManager)
            return;
        const selectedIds = this.getSelectedNodeIds();
        if (selectedIds.length < 2)
            return;
        // Get the parent of the first selected node
        const firstNode = sceneGraph.getNode(selectedIds[0]);
        if (!firstNode)
            return;
        const parent = sceneGraph.getParent(selectedIds[0]);
        if (!parent)
            return;
        // Create a group
        const groupId = sceneGraph.createNode('GROUP', parent.id, -1, { name: 'Group' });
        // Move all selected nodes into the group
        for (const nodeId of selectedIds) {
            sceneGraph.moveNode(nodeId, groupId, -1);
        }
        selectionManager.select([groupId], 'replace');
    }
    actionUngroup() {
        const sceneGraph = this.getSceneGraph();
        const selectionManager = this.getSelectionManager();
        if (!sceneGraph || !selectionManager)
            return;
        const selectedIds = this.getSelectedNodeIds();
        const newSelection = [];
        for (const groupId of selectedIds) {
            const node = sceneGraph.getNode(groupId);
            if (!node || node.type !== 'GROUP')
                continue;
            const parent = sceneGraph.getParent(groupId);
            if (!parent)
                continue;
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
    actionZoomTo100() {
        const viewport = this.runtime.getRenderer()?.getViewport();
        viewport?.setZoom(1);
    }
    actionZoomToFit() {
        // Emit event for renderer to handle zoom to fit
        this.runtime.emit('command:zoomToFit', {});
    }
    actionZoomToSelection() {
        const selectedIds = this.getSelectedNodeIds();
        if (selectedIds.length > 0) {
            this.runtime.emit('command:zoomToSelection', { nodeIds: selectedIds });
        }
    }
    actionZoomIn() {
        const viewport = this.runtime.getRenderer()?.getViewport();
        if (viewport) {
            viewport.setZoom(viewport.getZoom() * 1.2);
        }
    }
    actionZoomOut() {
        const viewport = this.runtime.getRenderer()?.getViewport();
        if (viewport) {
            viewport.setZoom(viewport.getZoom() / 1.2);
        }
    }
    actionSetTool(tool) {
        this.runtime.setTool(tool);
    }
    actionNudge(dx, dy) {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        for (const nodeId of this.getSelectedNodeIds()) {
            const node = sceneGraph.getNode(nodeId);
            if (node && 'x' in node && 'y' in node) {
                sceneGraph.updateNode(nodeId, {
                    x: node.x + dx,
                    y: node.y + dy,
                });
            }
        }
    }
    actionResize(dw, dh) {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        for (const nodeId of this.getSelectedNodeIds()) {
            const node = sceneGraph.getNode(nodeId);
            if (node && 'width' in node && 'height' in node) {
                const newWidth = Math.max(1, node.width + dw);
                const newHeight = Math.max(1, node.height + dh);
                sceneGraph.updateNode(nodeId, {
                    width: newWidth,
                    height: newHeight,
                });
            }
        }
    }
    actionBringForward() {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        for (const nodeId of this.getSelectedNodeIds()) {
            sceneGraph.reorderNode(nodeId, 1);
        }
    }
    actionSendBackward() {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        for (const nodeId of this.getSelectedNodeIds()) {
            sceneGraph.reorderNode(nodeId, -1);
        }
    }
    actionBringToFront() {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        for (const nodeId of this.getSelectedNodeIds()) {
            const parent = sceneGraph.getParent(nodeId);
            if (parent) {
                const siblings = sceneGraph.getChildIds(parent.id);
                sceneGraph.moveNode(nodeId, parent.id, siblings.length);
            }
        }
    }
    actionSendToBack() {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        for (const nodeId of this.getSelectedNodeIds()) {
            const parent = sceneGraph.getParent(nodeId);
            if (parent) {
                sceneGraph.moveNode(nodeId, parent.id, 0);
            }
        }
    }
    actionFlipHorizontal() {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        for (const nodeId of this.getSelectedNodeIds()) {
            const node = sceneGraph.getNode(nodeId);
            if (node && 'rotation' in node) {
                // Flip by adjusting scale (would need scaleX property) or rotation
                // For now, emit event for renderer to handle
                this.runtime.emit('command:flipHorizontal', { nodeId });
            }
        }
    }
    actionFlipVertical() {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        for (const nodeId of this.getSelectedNodeIds()) {
            this.runtime.emit('command:flipVertical', { nodeId });
        }
    }
    actionAlign(alignment) {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        const selectedIds = this.getSelectedNodeIds();
        if (selectedIds.length === 0)
            return;
        // Calculate bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const nodesBounds = [];
        for (const id of selectedIds) {
            const node = sceneGraph.getNode(id);
            if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
                const x = node.x;
                const y = node.y;
                const w = node.width;
                const h = node.height;
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
                case 'left':
                    newX = minX;
                    break;
                case 'right':
                    newX = maxX - w;
                    break;
                case 'top':
                    newY = minY;
                    break;
                case 'bottom':
                    newY = maxY - h;
                    break;
                case 'centerH':
                    newX = minX + (maxX - minX - w) / 2;
                    break;
                case 'centerV':
                    newY = minY + (maxY - minY - h) / 2;
                    break;
            }
            if (newX !== x || newY !== y) {
                sceneGraph.updateNode(id, { x: newX, y: newY });
            }
        }
    }
    actionDistribute(direction) {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        const selectedIds = this.getSelectedNodeIds();
        if (selectedIds.length < 3)
            return;
        const nodesBounds = [];
        for (const id of selectedIds) {
            const node = sceneGraph.getNode(id);
            if (node && 'x' in node && 'y' in node && 'width' in node && 'height' in node) {
                nodesBounds.push({
                    id,
                    x: node.x,
                    y: node.y,
                    w: node.width,
                    h: node.height,
                });
            }
        }
        if (direction === 'horizontal') {
            nodesBounds.sort((a, b) => a.x - b.x);
            const totalWidth = nodesBounds.reduce((sum, n) => sum + n.w, 0);
            const minX = nodesBounds[0].x;
            const maxX = nodesBounds[nodesBounds.length - 1].x + nodesBounds[nodesBounds.length - 1].w;
            const spacing = (maxX - minX - totalWidth) / (nodesBounds.length - 1);
            let currentX = minX;
            for (const bounds of nodesBounds) {
                sceneGraph.updateNode(bounds.id, { x: currentX });
                currentX += bounds.w + spacing;
            }
        }
        else {
            nodesBounds.sort((a, b) => a.y - b.y);
            const totalHeight = nodesBounds.reduce((sum, n) => sum + n.h, 0);
            const minY = nodesBounds[0].y;
            const maxY = nodesBounds[nodesBounds.length - 1].y + nodesBounds[nodesBounds.length - 1].h;
            const spacing = (maxY - minY - totalHeight) / (nodesBounds.length - 1);
            let currentY = minY;
            for (const bounds of nodesBounds) {
                sceneGraph.updateNode(bounds.id, { y: currentY });
                currentY += bounds.h + spacing;
            }
        }
    }
    actionTextStyle(style) {
        this.runtime.emit('command:textStyle', { style });
    }
    actionFontSize(delta) {
        this.runtime.emit('command:fontSize', { delta });
    }
    actionTextAlign(align) {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        for (const nodeId of this.getSelectedNodeIds()) {
            const node = sceneGraph.getNode(nodeId);
            if (node && node.type === 'TEXT') {
                const alignMap = { left: 'LEFT', center: 'CENTER', right: 'RIGHT', justify: 'JUSTIFIED' };
                sceneGraph.updateNode(nodeId, {
                    textAlignHorizontal: alignMap[align],
                });
            }
        }
    }
    actionCreateComponent() {
        this.runtime.emit('command:createComponent', {});
    }
    actionDetachInstance() {
        this.runtime.emit('command:detachInstance', {});
    }
    actionGoToMainComponent() {
        this.runtime.emit('command:goToMainComponent', {});
    }
    actionFlatten() {
        this.runtime.emit('command:flatten', {});
    }
    actionBooleanOperation(operation) {
        this.runtime.emit('command:booleanOperation', { operation });
    }
    actionToggleLock() {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        for (const nodeId of this.getSelectedNodeIds()) {
            const node = sceneGraph.getNode(nodeId);
            if (node) {
                sceneGraph.updateNode(nodeId, { locked: !node.locked });
            }
        }
    }
    actionToggleVisibility() {
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        for (const nodeId of this.getSelectedNodeIds()) {
            const node = sceneGraph.getNode(nodeId);
            if (node) {
                sceneGraph.updateNode(nodeId, { visible: !node.visible });
            }
        }
    }
    propertiesClipboard = null;
    actionCopyProperties() {
        const nodes = this.getSelectedNodes();
        if (nodes.length === 1) {
            this.propertiesClipboard = this.cloneNodeProps(nodes[0]);
            // Remove transform properties - we only want appearance
            delete this.propertiesClipboard['x'];
            delete this.propertiesClipboard['y'];
            delete this.propertiesClipboard['width'];
            delete this.propertiesClipboard['height'];
            delete this.propertiesClipboard['name'];
            delete this.propertiesClipboard['type'];
        }
    }
    actionPasteProperties() {
        if (!this.propertiesClipboard)
            return;
        const sceneGraph = this.getSceneGraph();
        if (!sceneGraph)
            return;
        for (const nodeId of this.getSelectedNodeIds()) {
            sceneGraph.updateNode(nodeId, this.propertiesClipboard);
        }
    }
    actionOutlineStroke() {
        this.runtime.emit('command:outlineStroke', {});
    }
    actionFlattenToImage() {
        this.runtime.emit('command:flattenToImage', {});
    }
    /**
     * Dispose of the keyboard manager
     */
    dispose() {
        document.removeEventListener('keydown', this.boundHandleKeyDown);
    }
}
/**
 * Create a keyboard manager
 */
export function createKeyboardManager(runtime) {
    return new KeyboardManager(runtime);
}
//# sourceMappingURL=keyboard-manager.js.map