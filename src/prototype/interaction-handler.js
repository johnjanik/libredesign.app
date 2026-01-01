/**
 * Interaction Handler
 *
 * Handles user interactions during prototype playback.
 * Maps user input to prototype triggers.
 */
const DEFAULT_OPTIONS = {
    doubleClickThreshold: 300,
    dragThreshold: 5,
    pressThreshold: 500,
};
/**
 * Interaction handler for prototype playback.
 */
export class InteractionHandler {
    state;
    listeners = new Set();
    hitTest;
    lookupLink;
    options;
    pressTimers = new Map();
    timeoutTimers = new Map();
    constructor(hitTest, lookupLink, options = {}) {
        this.hitTest = hitTest;
        this.lookupLink = lookupLink;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.state = {
            hoveredNodes: new Set(),
            pressedNodes: new Set(),
            dragState: null,
            lastClickTime: 0,
            lastClickedNode: null,
        };
    }
    /**
     * Handle pointer down event.
     */
    onPointerDown(event) {
        const nodeId = this.hitTest(event.x, event.y);
        if (!nodeId)
            return;
        // Track pressed state
        this.state.pressedNodes.add(nodeId);
        // Emit MOUSE_DOWN
        this.emitTrigger('MOUSE_DOWN', nodeId, event);
        // Start press timer for ON_PRESS
        const timer = window.setTimeout(() => {
            if (this.state.pressedNodes.has(nodeId)) {
                this.emitTrigger('ON_PRESS', nodeId, event);
            }
            this.pressTimers.delete(nodeId);
        }, this.options.pressThreshold);
        this.pressTimers.set(nodeId, timer);
        // Initialize drag state
        this.state = {
            ...this.state,
            dragState: {
                startX: event.x,
                startY: event.y,
                currentX: event.x,
                currentY: event.y,
                deltaX: 0,
                deltaY: 0,
                isDragging: false,
            },
        };
    }
    /**
     * Handle pointer move event.
     */
    onPointerMove(event) {
        // Handle hover
        const hoveredNodeId = this.hitTest(event.x, event.y);
        this.updateHoverState(hoveredNodeId, event);
        // Handle drag
        if (this.state.dragState && this.state.pressedNodes.size > 0) {
            const dx = event.x - this.state.dragState.startX;
            const dy = event.y - this.state.dragState.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const isDragging = distance > this.options.dragThreshold;
            this.state = {
                ...this.state,
                dragState: {
                    ...this.state.dragState,
                    currentX: event.x,
                    currentY: event.y,
                    deltaX: dx,
                    deltaY: dy,
                    isDragging,
                },
            };
            if (isDragging) {
                // Emit ON_DRAG for all pressed nodes
                for (const nodeId of this.state.pressedNodes) {
                    this.emitTrigger('ON_DRAG', nodeId, event);
                }
            }
        }
    }
    /**
     * Handle pointer up event.
     */
    onPointerUp(event) {
        const nodeId = this.hitTest(event.x, event.y);
        // Clear press timers
        for (const [id, timer] of this.pressTimers) {
            window.clearTimeout(timer);
            this.pressTimers.delete(id);
        }
        // Emit MOUSE_UP
        if (nodeId) {
            this.emitTrigger('MOUSE_UP', nodeId, event);
        }
        // Check for click vs drag
        const wasDragging = this.state.dragState?.isDragging ?? false;
        if (!wasDragging && nodeId && this.state.pressedNodes.has(nodeId)) {
            // Determine click type
            const now = Date.now();
            const isDoubleClick = this.state.lastClickedNode === nodeId &&
                now - this.state.lastClickTime < this.options.doubleClickThreshold;
            if (isDoubleClick) {
                this.emitTrigger('ON_DOUBLE_CLICK', nodeId, event);
                this.state = {
                    ...this.state,
                    lastClickTime: 0,
                    lastClickedNode: null,
                };
            }
            else {
                // Single click or tap
                if (event.pointerType === 'touch') {
                    this.emitTrigger('ON_TAP', nodeId, event);
                }
                else {
                    this.emitTrigger('ON_CLICK', nodeId, event);
                }
                this.state = {
                    ...this.state,
                    lastClickTime: now,
                    lastClickedNode: nodeId,
                };
            }
        }
        // Clear pressed state
        this.state = {
            ...this.state,
            pressedNodes: new Set(),
            dragState: null,
        };
    }
    /**
     * Handle key down event.
     */
    onKeyDown(_event, focusedNodeId) {
        if (focusedNodeId) {
            this.emitTrigger('KEY_PRESS', focusedNodeId, null);
        }
    }
    /**
     * Schedule a timeout trigger.
     */
    scheduleTimeout(nodeId, delay) {
        // Clear existing timer
        const existing = this.timeoutTimers.get(nodeId);
        if (existing) {
            window.clearTimeout(existing);
        }
        const timer = window.setTimeout(() => {
            this.emitTrigger('AFTER_TIMEOUT', nodeId, null);
            this.timeoutTimers.delete(nodeId);
        }, delay);
        this.timeoutTimers.set(nodeId, timer);
    }
    /**
     * Clear a timeout trigger.
     */
    clearTimeout(nodeId) {
        const timer = this.timeoutTimers.get(nodeId);
        if (timer) {
            window.clearTimeout(timer);
            this.timeoutTimers.delete(nodeId);
        }
    }
    /**
     * Clear all timers.
     */
    clearAllTimers() {
        for (const timer of this.pressTimers.values()) {
            window.clearTimeout(timer);
        }
        this.pressTimers.clear();
        for (const timer of this.timeoutTimers.values()) {
            window.clearTimeout(timer);
        }
        this.timeoutTimers.clear();
    }
    /**
     * Add trigger event listener.
     */
    addListener(listener) {
        this.listeners.add(listener);
    }
    /**
     * Remove trigger event listener.
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }
    /**
     * Dispose the handler.
     */
    dispose() {
        this.clearAllTimers();
        this.listeners.clear();
    }
    /**
     * Update hover state and emit events.
     */
    updateHoverState(currentNodeId, event) {
        const prevHovered = this.state.hoveredNodes;
        const newHovered = new Set();
        if (currentNodeId) {
            newHovered.add(currentNodeId);
        }
        // Check for mouse leave
        for (const nodeId of prevHovered) {
            if (!newHovered.has(nodeId)) {
                this.emitTrigger('MOUSE_LEAVE', nodeId, event);
            }
        }
        // Check for mouse enter
        for (const nodeId of newHovered) {
            if (!prevHovered.has(nodeId)) {
                this.emitTrigger('MOUSE_ENTER', nodeId, event);
                this.emitTrigger('ON_HOVER', nodeId, event);
            }
        }
        this.state = { ...this.state, hoveredNodes: newHovered };
    }
    /**
     * Emit a trigger event.
     */
    emitTrigger(trigger, sourceNodeId, eventData) {
        const link = this.lookupLink(sourceNodeId, trigger);
        const event = {
            trigger,
            sourceNodeId,
            link,
            eventData,
        };
        this.listeners.forEach((listener) => listener(event));
    }
}
/**
 * Create an interaction handler.
 */
export function createInteractionHandler(hitTest, lookupLink, options) {
    return new InteractionHandler(hitTest, lookupLink, options);
}
//# sourceMappingURL=interaction-handler.js.map