/**
 * Tool - Base interface for interaction tools
 */
/**
 * Abstract base tool with common functionality
 */
export class BaseTool {
    cursor = 'default';
    isActive = false;
    isDragging = false;
    dragStartPoint = null;
    lastPoint = null;
    activate(_context) {
        this.isActive = true;
    }
    deactivate() {
        this.isActive = false;
        this.isDragging = false;
        this.dragStartPoint = null;
        this.lastPoint = null;
    }
    onPointerDown(event, _context) {
        this.isDragging = true;
        this.dragStartPoint = { x: event.worldX, y: event.worldY };
        this.lastPoint = this.dragStartPoint;
        return false;
    }
    onPointerMove(event, _context) {
        this.lastPoint = { x: event.worldX, y: event.worldY };
    }
    onPointerUp(_event, _context) {
        this.isDragging = false;
        this.dragStartPoint = null;
    }
    onKeyDown(_event, _context) {
        return false;
    }
    getCursor(_point, _context) {
        return this.cursor;
    }
    onKeyUp(_event, _context) {
        // Override in subclasses
    }
    onDoubleClick(_event, _context) {
        // Override in subclasses
    }
    render(_ctx, _context) {
        // Override in subclasses
    }
}
//# sourceMappingURL=tool.js.map