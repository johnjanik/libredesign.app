/**
 * Text Edit Tool
 *
 * Handles text editing within text nodes.
 * Supports cursor positioning, selection, and keyboard input.
 */
import { BaseTool } from '../base/tool';
import { createTextCursor } from './text-cursor';
import { createTextInputHandler } from './text-input-handler';
const DEFAULT_OPTIONS = {
    blinkInterval: 530,
    cursorWidth: 2,
    selectionColor: 'rgba(0, 102, 255, 0.3)',
    cursorColor: '#0066FF',
};
/**
 * Text edit tool for editing text nodes
 */
export class TextEditTool extends BaseTool {
    name = 'text-edit';
    cursor = 'text';
    options;
    state = 'INACTIVE';
    editingNodeId = null;
    textCursor;
    inputHandler = null;
    currentText = '';
    cursorVisible = true;
    // Layout query for hit testing (set by external system)
    layoutQuery = null;
    // Callbacks
    onTextUpdate;
    onEditStart;
    onEditEnd;
    onRequestRedraw;
    constructor(options = {}) {
        super();
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.textCursor = createTextCursor({
            blinkInterval: this.options.blinkInterval,
            cursorWidth: this.options.cursorWidth,
        });
    }
    /**
     * Set callback for text updates.
     */
    setOnTextUpdate(callback) {
        this.onTextUpdate = callback;
    }
    /**
     * Set callback for edit start.
     */
    setOnEditStart(callback) {
        this.onEditStart = callback;
    }
    /**
     * Set callback for edit end.
     */
    setOnEditEnd(callback) {
        this.onEditEnd = callback;
    }
    /**
     * Set callback for redraw requests.
     */
    setOnRequestRedraw(callback) {
        this.onRequestRedraw = callback;
    }
    /**
     * Set the layout query for hit testing.
     */
    setLayoutQuery(query) {
        this.layoutQuery = query;
    }
    /**
     * Get current tool state.
     */
    getState() {
        return this.state;
    }
    /**
     * Get the currently editing node ID.
     */
    getEditingNodeId() {
        return this.editingNodeId;
    }
    /**
     * Check if currently editing.
     */
    isEditing() {
        return this.state !== 'INACTIVE';
    }
    /**
     * Get current cursor position.
     */
    getCursorPosition() {
        return this.textCursor.position;
    }
    /**
     * Get current selection.
     */
    getSelection() {
        return this.textCursor.getSelection();
    }
    /**
     * Start editing a text node.
     */
    startEditing(nodeId, text, cursorPosition) {
        if (this.state !== 'INACTIVE') {
            this.stopEditing();
        }
        this.editingNodeId = nodeId;
        this.currentText = text;
        this.state = 'EDITING';
        // Set cursor position
        const position = cursorPosition ?? text.length;
        this.textCursor.setPosition(position, text.length);
        // Create input handler
        this.inputHandler = createTextInputHandler(this.textCursor, text, {
            multiline: true,
        });
        this.inputHandler.setOnTextChange((change, newText) => {
            this.currentText = newText;
            if (this.editingNodeId) {
                this.onTextUpdate?.(this.editingNodeId, newText, change);
            }
            this.onRequestRedraw?.();
        });
        this.inputHandler.setOnExit(() => {
            this.stopEditing();
        });
        // Start cursor blinking
        this.textCursor.startBlinking((visible) => {
            this.cursorVisible = visible;
            this.onRequestRedraw?.();
        });
        this.onEditStart?.(nodeId);
        this.onRequestRedraw?.();
    }
    /**
     * Stop editing.
     */
    stopEditing() {
        if (this.state === 'INACTIVE')
            return;
        const nodeId = this.editingNodeId;
        this.textCursor.stopBlinking();
        this.inputHandler?.dispose();
        this.inputHandler = null;
        this.editingNodeId = null;
        this.currentText = '';
        this.state = 'INACTIVE';
        this.layoutQuery = null;
        if (nodeId) {
            this.onEditEnd?.(nodeId);
        }
        this.onRequestRedraw?.();
    }
    activate(context) {
        super.activate(context);
    }
    deactivate() {
        this.stopEditing();
        super.deactivate();
    }
    onPointerDown(event, context) {
        const worldPoint = { x: event.worldX, y: event.worldY };
        if (this.state !== 'INACTIVE') {
            // Check if clicking outside the editing node
            if (this.editingNodeId) {
                const node = context.sceneGraph.getNode(this.editingNodeId);
                if (node && !this.isPointInNode(worldPoint, node, context)) {
                    this.stopEditing();
                    return false;
                }
            }
            // Position cursor at click point
            if (this.layoutQuery) {
                const hit = this.layoutQuery.hitTestPoint(worldPoint);
                const position = hit.trailing ? hit.index + 1 : hit.index;
                if (event.shiftKey) {
                    // Extend selection
                    this.textCursor.move(position - this.textCursor.position, this.currentText.length, true);
                }
                else {
                    // Set cursor position
                    this.textCursor.setPosition(position, this.currentText.length);
                }
                this.state = 'SELECTING';
                this.onRequestRedraw?.();
            }
            return true;
        }
        return false;
    }
    onPointerMove(event, _context) {
        if (this.state === 'SELECTING' && this.layoutQuery) {
            const worldPoint = { x: event.worldX, y: event.worldY };
            const hit = this.layoutQuery.hitTestPoint(worldPoint);
            const position = hit.trailing ? hit.index + 1 : hit.index;
            // Extend selection to current position
            this.textCursor.move(position - this.textCursor.position, this.currentText.length, true);
            this.onRequestRedraw?.();
        }
    }
    onPointerUp(_event, _context) {
        if (this.state === 'SELECTING') {
            this.state = 'EDITING';
        }
    }
    onDoubleClick(event, context) {
        const worldPoint = { x: event.worldX, y: event.worldY };
        if (this.state === 'INACTIVE') {
            // Find text node at click position
            const hitNode = this.findTextNodeAt(worldPoint, context);
            if (hitNode) {
                const nodeData = context.sceneGraph.getNode(hitNode);
                if (nodeData?.type === 'TEXT') {
                    this.startEditing(hitNode, nodeData.characters);
                    // Select word at double-click position
                    if (this.layoutQuery) {
                        const hit = this.layoutQuery.hitTestPoint(worldPoint);
                        this.textCursor.selectWordAt(this.currentText, hit.index);
                        this.onRequestRedraw?.();
                    }
                }
            }
        }
        else if (this.layoutQuery) {
            // Double-click while editing: select word
            const hit = this.layoutQuery.hitTestPoint(worldPoint);
            this.textCursor.selectWordAt(this.currentText, hit.index);
            this.onRequestRedraw?.();
        }
    }
    onKeyDown(event, _context) {
        if (this.state === 'INACTIVE') {
            return false;
        }
        if (this.inputHandler) {
            return this.inputHandler.handleKeyDown(event);
        }
        return false;
    }
    getCursor(_point, _context) {
        return 'text';
    }
    render(ctx, context) {
        if (this.state === 'INACTIVE' || !this.editingNodeId)
            return;
        const node = context.sceneGraph.getNode(this.editingNodeId);
        if (!node)
            return;
        const viewport = context.viewport;
        void viewport; // Used for zoom-adjusted rendering
        ctx.save();
        // Canvas container already applies viewport transform, so we render in world coords
        // Draw selection
        const selection = this.textCursor.getSelection();
        if (selection && this.layoutQuery) {
            const positions = this.layoutQuery.getCharacterPositions(selection.start, selection.end);
            ctx.fillStyle = this.options.selectionColor;
            // Group characters by line for contiguous selection rectangles
            let currentLineY = null;
            let lineStartX = 0;
            let lineWidth = 0;
            let lineHeight = 0;
            for (const pos of positions) {
                if (currentLineY === null || pos.y !== currentLineY) {
                    // Draw previous line's selection
                    if (currentLineY !== null && lineWidth > 0) {
                        ctx.fillRect(lineStartX, currentLineY, lineWidth, lineHeight);
                    }
                    // Start new line
                    currentLineY = pos.y;
                    lineStartX = pos.x;
                    lineWidth = pos.width;
                    lineHeight = pos.height;
                }
                else {
                    // Extend current line
                    lineWidth = (pos.x + pos.width) - lineStartX;
                    lineHeight = Math.max(lineHeight, pos.height);
                }
            }
            // Draw last line's selection
            if (currentLineY !== null && lineWidth > 0) {
                ctx.fillRect(lineStartX, currentLineY, lineWidth, lineHeight);
            }
        }
        // Draw cursor
        if (this.cursorVisible && this.layoutQuery && !selection) {
            const cursorPos = this.textCursor.position;
            let cursorX;
            let cursorY;
            let cursorHeight;
            if (this.currentText.length === 0) {
                // Empty text - use first line info
                const lineInfo = this.layoutQuery.getLineInfo(0);
                if (lineInfo) {
                    cursorX = 0; // TODO: get from text node bounds
                    cursorY = lineInfo.y;
                    cursorHeight = lineInfo.height;
                }
                else {
                    cursorX = 0;
                    cursorY = 0;
                    cursorHeight = 16;
                }
            }
            else if (cursorPos >= this.currentText.length) {
                // Cursor at end
                const lastPos = this.layoutQuery.getCharacterPosition(this.currentText.length - 1);
                if (lastPos) {
                    cursorX = lastPos.x + lastPos.width;
                    cursorY = lastPos.y;
                    cursorHeight = lastPos.height;
                }
                else {
                    cursorX = 0;
                    cursorY = 0;
                    cursorHeight = 16;
                }
            }
            else {
                // Cursor before a character
                const charPos = this.layoutQuery.getCharacterPosition(cursorPos);
                if (charPos) {
                    cursorX = charPos.x;
                    cursorY = charPos.y;
                    cursorHeight = charPos.height;
                }
                else {
                    cursorX = 0;
                    cursorY = 0;
                    cursorHeight = 16;
                }
            }
            ctx.fillStyle = this.options.cursorColor;
            ctx.fillRect(cursorX, cursorY, this.options.cursorWidth / viewport.getZoom(), cursorHeight);
        }
        ctx.restore();
    }
    /**
     * Find a text node at the given point.
     */
    findTextNodeAt(point, context) {
        // Simple hit test - iterate through pages and their children
        // In a real implementation, this would use a spatial index
        const pages = context.sceneGraph.getPages();
        for (const page of pages) {
            const result = this.hitTestNode(page.id, point, context);
            if (result)
                return result;
        }
        return null;
    }
    /**
     * Recursively hit test a node and its children.
     */
    hitTestNode(nodeId, point, context) {
        const data = context.sceneGraph.getNode(nodeId);
        if (!data)
            return null;
        // Check children first (they're on top)
        const childIds = context.sceneGraph.getChildIds(nodeId);
        for (let i = childIds.length - 1; i >= 0; i--) {
            const result = this.hitTestNode(childIds[i], point, context);
            if (result)
                return result;
        }
        // Check this node if it's a text node
        if (data.type === 'TEXT') {
            if (this.isPointInNode(point, data, context)) {
                return nodeId;
            }
        }
        return null;
    }
    /**
     * Check if a point is inside a node's bounds.
     * Note: This is a simplified implementation that assumes no rotation.
     * A full implementation would compute world transform from ancestors.
     */
    isPointInNode(point, data, context) {
        const nodeData = context.sceneGraph.getNode(data.id);
        if (!nodeData)
            return false;
        // Get position from node data (simplified - no rotation support)
        const nodeWithPos = nodeData;
        // Compute world position by accumulating ancestor transforms
        let worldX = nodeWithPos.x ?? 0;
        let worldY = nodeWithPos.y ?? 0;
        const ancestors = context.sceneGraph.getAncestors(data.id);
        for (const ancestor of ancestors) {
            const ancestorWithPos = ancestor;
            worldX += ancestorWithPos.x ?? 0;
            worldY += ancestorWithPos.y ?? 0;
        }
        const bounds = {
            x: worldX,
            y: worldY,
            width: nodeWithPos.width ?? 0,
            height: nodeWithPos.height ?? 0,
        };
        return (point.x >= bounds.x &&
            point.x <= bounds.x + bounds.width &&
            point.y >= bounds.y &&
            point.y <= bounds.y + bounds.height);
    }
    /**
     * Dispose of resources.
     */
    dispose() {
        this.stopEditing();
        this.textCursor.dispose();
    }
}
/**
 * Create a text edit tool.
 */
export function createTextEditTool(options) {
    return new TextEditTool(options);
}
//# sourceMappingURL=text-edit-tool.js.map