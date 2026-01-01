/**
 * Annotation Tool
 *
 * Add developer notes/annotations to elements.
 */
import { BaseTool, } from '@tools/base/tool';
/** Plugin data key for annotations */
export const ANNOTATIONS_PLUGIN_KEY = 'designlibre:annotations';
/**
 * Annotation Tool
 *
 * Creates and manages annotations on design elements.
 */
export class AnnotationTool extends BaseTool {
    name = 'annotate';
    cursor = 'crosshair';
    options;
    pendingAnnotation = null;
    onAnnotationCreate;
    constructor(options = {}) {
        super();
        this.options = {
            defaultAuthor: options.defaultAuthor ?? '',
            markerColor: options.markerColor ?? '#ff6b6b',
            resolvedColor: options.resolvedColor ?? '#51cf66',
        };
    }
    /**
     * Set callback for when an annotation is created.
     */
    setOnAnnotationCreate(callback) {
        this.onAnnotationCreate = callback;
    }
    onPointerDown(event, context) {
        super.onPointerDown(event, context);
        // Find node under cursor
        const nodeId = this.hitTest(event.worldX, event.worldY, context);
        if (!nodeId)
            return false;
        // Store pending annotation position
        const node = context.sceneGraph.getNode(nodeId);
        if (!node || !('x' in node))
            return false;
        const n = node;
        this.pendingAnnotation = {
            nodeId,
            position: {
                x: event.worldX - n.x,
                y: event.worldY - n.y,
            },
        };
        return true;
    }
    onPointerUp(event, context) {
        super.onPointerUp(event, context);
        if (this.pendingAnnotation) {
            // Prompt for annotation content
            const content = prompt('Enter annotation:');
            if (content && content.trim()) {
                const annotation = this.createAnnotation(this.pendingAnnotation.nodeId, this.pendingAnnotation.position, content.trim(), context.sceneGraph);
                if (annotation && this.onAnnotationCreate) {
                    this.onAnnotationCreate(annotation);
                }
            }
            this.pendingAnnotation = null;
        }
    }
    render(ctx, context) {
        // Render all annotation markers
        const allAnnotations = this.getAllAnnotations(context.sceneGraph);
        for (const { annotation, worldPosition } of allAnnotations) {
            this.renderMarker(ctx, worldPosition, annotation.resolved, context);
        }
        // Render pending annotation position
        if (this.pendingAnnotation) {
            const node = context.sceneGraph.getNode(this.pendingAnnotation.nodeId);
            if (node && 'x' in node) {
                const n = node;
                const worldPos = {
                    x: n.x + this.pendingAnnotation.position.x,
                    y: n.y + this.pendingAnnotation.position.y,
                };
                const screenPos = context.viewport.worldToCanvas(worldPos.x, worldPos.y);
                ctx.save();
                ctx.fillStyle = this.options.markerColor;
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }
    /**
     * Create an annotation on a node.
     */
    createAnnotation(nodeId, position, content, sceneGraph) {
        const node = sceneGraph.getNode(nodeId);
        if (!node)
            return null;
        const annotation = {
            id: `annotation_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            nodeId,
            position,
            content,
            createdAt: new Date(),
            resolved: false,
        };
        if (this.options.defaultAuthor) {
            annotation.author = this.options.defaultAuthor;
        }
        // Get existing annotations
        const existing = this.getAnnotations(nodeId, sceneGraph);
        existing.push(annotation);
        // Save to plugin data
        this.saveAnnotations(nodeId, existing, sceneGraph);
        return annotation;
    }
    /**
     * Get annotations for a node.
     */
    getAnnotations(nodeId, sceneGraph) {
        const node = sceneGraph.getNode(nodeId);
        if (!node)
            return [];
        const pluginData = node.pluginData[ANNOTATIONS_PLUGIN_KEY];
        if (!pluginData || !Array.isArray(pluginData))
            return [];
        // Parse dates
        return pluginData.map((a) => ({
            ...a,
            createdAt: new Date(a.createdAt),
        }));
    }
    /**
     * Update an annotation.
     */
    updateAnnotation(nodeId, annotationId, updates, sceneGraph) {
        const annotations = this.getAnnotations(nodeId, sceneGraph);
        const index = annotations.findIndex(a => a.id === annotationId);
        if (index === -1)
            return false;
        annotations[index] = { ...annotations[index], ...updates };
        this.saveAnnotations(nodeId, annotations, sceneGraph);
        return true;
    }
    /**
     * Delete an annotation.
     */
    deleteAnnotation(nodeId, annotationId, sceneGraph) {
        const annotations = this.getAnnotations(nodeId, sceneGraph);
        const filtered = annotations.filter(a => a.id !== annotationId);
        if (filtered.length === annotations.length)
            return false;
        this.saveAnnotations(nodeId, filtered, sceneGraph);
        return true;
    }
    /**
     * Get all annotations in the document.
     */
    getAllAnnotations(sceneGraph) {
        const result = [];
        const doc = sceneGraph.getDocument();
        if (!doc)
            return result;
        const collectFromNode = (nodeId) => {
            const node = sceneGraph.getNode(nodeId);
            if (!node)
                return;
            const annotations = this.getAnnotations(nodeId, sceneGraph);
            for (const annotation of annotations) {
                if ('x' in node) {
                    const n = node;
                    result.push({
                        annotation,
                        worldPosition: {
                            x: n.x + annotation.position.x,
                            y: n.y + annotation.position.y,
                        },
                    });
                }
            }
            const childIds = sceneGraph.getChildIds(nodeId);
            for (const childId of childIds) {
                collectFromNode(childId);
            }
        };
        collectFromNode(doc.id);
        return result;
    }
    // ===========================================================================
    // Private Helpers
    // ===========================================================================
    saveAnnotations(nodeId, annotations, sceneGraph) {
        const node = sceneGraph.getNode(nodeId);
        if (!node)
            return;
        // Serialize annotations (dates to ISO strings)
        const serialized = annotations.map(a => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
        }));
        // Update plugin data
        sceneGraph.updateNode(nodeId, {
            pluginData: {
                ...node.pluginData,
                [ANNOTATIONS_PLUGIN_KEY]: serialized,
            },
        });
    }
    hitTest(worldX, worldY, context) {
        const doc = context.sceneGraph.getDocument();
        if (!doc)
            return null;
        // Simple AABB hit test - find topmost node
        let hitNode = null;
        const testNode = (nodeId) => {
            const node = context.sceneGraph.getNode(nodeId);
            if (!node)
                return;
            if ('x' in node && 'width' in node) {
                const n = node;
                if (worldX >= n.x &&
                    worldX <= n.x + n.width &&
                    worldY >= n.y &&
                    worldY <= n.y + n.height) {
                    hitNode = nodeId;
                }
            }
            const childIds = context.sceneGraph.getChildIds(nodeId);
            for (const childId of childIds) {
                testNode(childId);
            }
        };
        const pages = context.sceneGraph.getChildIds(doc.id);
        for (const pageId of pages) {
            testNode(pageId);
        }
        return hitNode;
    }
    renderMarker(ctx, worldPosition, resolved, context) {
        const screenPos = context.viewport.worldToCanvas(worldPosition.x, worldPosition.y);
        const color = resolved ? this.options.resolvedColor : this.options.markerColor;
        ctx.save();
        // Outer circle
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        // Inner icon (exclamation or check)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(resolved ? '✓' : '!', screenPos.x, screenPos.y);
        ctx.restore();
    }
}
/**
 * Create an annotation tool.
 */
export function createAnnotationTool(options) {
    return new AnnotationTool(options);
}
//# sourceMappingURL=annotation-tool.js.map