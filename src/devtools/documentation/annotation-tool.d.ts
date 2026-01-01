/**
 * Annotation Tool
 *
 * Add developer notes/annotations to elements.
 */
import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import type { SceneGraph } from '@scene/graph/scene-graph';
import { BaseTool, type ToolContext, type PointerEventData, type ToolCursor } from '@tools/base/tool';
/** Annotation data */
export interface Annotation {
    readonly id: string;
    readonly nodeId: NodeId;
    readonly position: Point;
    readonly content: string;
    readonly author?: string;
    readonly createdAt: Date;
    readonly resolved: boolean;
}
/** Plugin data key for annotations */
export declare const ANNOTATIONS_PLUGIN_KEY = "designlibre:annotations";
/** Annotation tool options */
export interface AnnotationToolOptions {
    /** Default author name */
    defaultAuthor?: string;
    /** Marker color */
    markerColor?: string;
    /** Resolved marker color */
    resolvedColor?: string;
}
/**
 * Annotation Tool
 *
 * Creates and manages annotations on design elements.
 */
export declare class AnnotationTool extends BaseTool {
    readonly name = "annotate";
    cursor: ToolCursor;
    private options;
    private pendingAnnotation;
    private onAnnotationCreate?;
    constructor(options?: AnnotationToolOptions);
    /**
     * Set callback for when an annotation is created.
     */
    setOnAnnotationCreate(callback: (annotation: Annotation) => void): void;
    onPointerDown(event: PointerEventData, context: ToolContext): boolean;
    onPointerUp(event: PointerEventData, context: ToolContext): void;
    render(ctx: CanvasRenderingContext2D, context: ToolContext): void;
    /**
     * Create an annotation on a node.
     */
    createAnnotation(nodeId: NodeId, position: Point, content: string, sceneGraph: SceneGraph): Annotation | null;
    /**
     * Get annotations for a node.
     */
    getAnnotations(nodeId: NodeId, sceneGraph: SceneGraph): Annotation[];
    /**
     * Update an annotation.
     */
    updateAnnotation(nodeId: NodeId, annotationId: string, updates: Partial<Pick<Annotation, 'content' | 'resolved'>>, sceneGraph: SceneGraph): boolean;
    /**
     * Delete an annotation.
     */
    deleteAnnotation(nodeId: NodeId, annotationId: string, sceneGraph: SceneGraph): boolean;
    /**
     * Get all annotations in the document.
     */
    getAllAnnotations(sceneGraph: SceneGraph): Array<{
        annotation: Annotation;
        worldPosition: Point;
    }>;
    private saveAnnotations;
    private hitTest;
    private renderMarker;
}
/**
 * Create an annotation tool.
 */
export declare function createAnnotationTool(options?: AnnotationToolOptions): AnnotationTool;
//# sourceMappingURL=annotation-tool.d.ts.map