/**
 * Node factory functions
 */
import type { NodeId } from '@core/types/common';
import type { VectorPath } from '@core/types/geometry';
import type { Paint } from '@core/types/paint';
import type { DocumentNodeData, PageNodeData, FrameNodeData, GroupNodeData, VectorNodeData, ImageNodeData, ImageScaleMode, TextNodeData, ComponentNodeData, InstanceNodeData, BooleanOperationNodeData, SliceNodeData } from './base-node';
/** Options for creating a document node */
export interface CreateDocumentOptions {
    id?: NodeId;
    name?: string;
}
/** Create a document node */
export declare function createDocument(options?: CreateDocumentOptions): DocumentNodeData;
/** Options for creating a page node */
export interface CreatePageOptions {
    id?: NodeId;
    name?: string;
    width?: number;
    height?: number;
    backgroundColor?: {
        r: number;
        g: number;
        b: number;
        a: number;
    };
}
/** Create a page node */
export declare function createPage(options?: CreatePageOptions): PageNodeData;
/** Options for creating a frame node */
export interface CreateFrameOptions {
    id?: NodeId;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}
/** Create a frame node */
export declare function createFrame(options?: CreateFrameOptions): FrameNodeData;
/** Options for creating a group node */
export interface CreateGroupOptions {
    id?: NodeId;
    name?: string;
}
/** Create a group node */
export declare function createGroup(options?: CreateGroupOptions): GroupNodeData;
/** Options for creating a vector node */
export interface CreateVectorOptions {
    id?: NodeId;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    vectorPaths?: VectorPath[];
    fills?: Paint[];
    strokes?: Paint[];
    strokeWeight?: number;
}
/** Create a vector node */
export declare function createVector(options?: CreateVectorOptions): VectorNodeData;
/** Options for creating an image node */
export interface CreateImageOptions {
    id?: NodeId;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    imageRef: string;
    naturalWidth?: number;
    naturalHeight?: number;
    scaleMode?: ImageScaleMode;
}
/** Create an image node */
export declare function createImage(options: CreateImageOptions): ImageNodeData;
/** Options for creating a text node */
export interface CreateTextOptions {
    id?: NodeId;
    name?: string;
    x?: number;
    y?: number;
    characters?: string;
}
/** Create a text node */
export declare function createText(options?: CreateTextOptions): TextNodeData;
/** Options for creating a component node */
export interface CreateComponentOptions {
    id?: NodeId;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}
/** Create a component node */
export declare function createComponent(options?: CreateComponentOptions): ComponentNodeData;
/** Options for creating an instance node */
export interface CreateInstanceOptions {
    id?: NodeId;
    name?: string;
    componentId: NodeId;
    x?: number;
    y?: number;
}
/** Create an instance node */
export declare function createInstance(options: CreateInstanceOptions): InstanceNodeData;
/** Options for creating a boolean operation node */
export interface CreateBooleanOperationOptions {
    id?: NodeId;
    name?: string;
    operation?: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';
}
/** Create a boolean operation node */
export declare function createBooleanOperation(options?: CreateBooleanOperationOptions): BooleanOperationNodeData;
/** Options for creating a slice node */
export interface CreateSliceOptions {
    id?: NodeId;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}
/** Create a slice node */
export declare function createSlice(options?: CreateSliceOptions): SliceNodeData;
//# sourceMappingURL=factory.d.ts.map