/**
 * Base node types for the scene graph
 */
import type { NodeId, NodeType, BlendMode, LayoutConstraints, AutoLayoutProps, BooleanOperation, ExportSetting } from '@core/types/common';
import type { Paint } from '@core/types/paint';
import type { Effect } from '@core/types/effect';
import type { VectorPath } from '@core/types/geometry';
import type { RGBA } from '@core/types/color';
/**
 * Base properties shared by all nodes
 */
export interface BaseNodeData {
    readonly id: NodeId;
    readonly type: NodeType;
    readonly name: string;
    readonly visible: boolean;
    readonly locked: boolean;
    readonly parentId: NodeId | null;
    readonly childIds: readonly NodeId[];
    readonly pluginData: Readonly<Record<string, unknown>>;
}
/**
 * Transform properties for renderable nodes
 */
export interface TransformProps {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly rotation: number;
}
/**
 * Appearance properties for styled nodes
 */
export interface AppearanceProps {
    readonly opacity: number;
    readonly blendMode: BlendMode;
    readonly fills: readonly Paint[];
    readonly strokes: readonly Paint[];
    readonly strokeWeight: number;
    readonly strokeAlign: 'INSIDE' | 'CENTER' | 'OUTSIDE';
    readonly strokeCap: 'NONE' | 'ROUND' | 'SQUARE';
    readonly strokeJoin: 'MITER' | 'BEVEL' | 'ROUND';
    readonly strokeMiterLimit: number;
    readonly dashPattern: readonly number[];
    readonly dashOffset: number;
    readonly effects: readonly Effect[];
}
/**
 * Scene node - base for all visual nodes
 */
export interface SceneNodeData extends BaseNodeData, TransformProps, AppearanceProps {
    readonly constraints: LayoutConstraints;
    readonly clipsContent: boolean;
}
/**
 * Document node - root of the document tree
 */
export interface DocumentNodeData extends BaseNodeData {
    readonly type: 'DOCUMENT';
}
/**
 * Page node - canvas page
 */
export interface PageNodeData extends BaseNodeData, TransformProps {
    readonly type: 'PAGE';
    readonly backgroundColor: RGBA;
}
/**
 * Frame node - container with layout
 */
export interface FrameNodeData extends SceneNodeData {
    readonly type: 'FRAME';
    readonly autoLayout: AutoLayoutProps;
}
/**
 * Group node - logical grouping
 */
export interface GroupNodeData extends SceneNodeData {
    readonly type: 'GROUP';
}
/**
 * Vector node - path-based shape
 */
export interface VectorNodeData extends SceneNodeData {
    readonly type: 'VECTOR';
    readonly vectorPaths: readonly VectorPath[];
}
/**
 * Image scale mode
 */
export type ImageScaleMode = 'FILL' | 'FIT' | 'CROP' | 'TILE';
/**
 * Image node - raster image
 */
export interface ImageNodeData extends SceneNodeData {
    readonly type: 'IMAGE';
    /** Data URL or image reference */
    readonly imageRef: string;
    /** Original image width */
    readonly naturalWidth: number;
    /** Original image height */
    readonly naturalHeight: number;
    /** Scale mode for the image */
    readonly scaleMode: ImageScaleMode;
}
/**
 * Text style range
 */
export interface TextStyleRange {
    readonly start: number;
    readonly end: number;
    readonly fontFamily: string;
    readonly fontWeight: number;
    readonly fontSize: number;
    readonly fills: readonly Paint[];
    readonly textDecoration: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
    readonly letterSpacing: number;
    readonly lineHeight: number | 'AUTO';
}
/**
 * Text node - text content
 */
export interface TextNodeData extends SceneNodeData {
    readonly type: 'TEXT';
    readonly characters: string;
    readonly textStyles: readonly TextStyleRange[];
    readonly textAutoResize: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT';
    readonly textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
    readonly textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
    readonly paragraphSpacing: number;
}
/**
 * Property definition for components
 */
export interface PropertyDefinition {
    readonly type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
    readonly defaultValue: unknown;
    readonly preferredValues?: readonly unknown[];
}
/**
 * Component node - reusable definition
 */
export interface ComponentNodeData extends SceneNodeData {
    readonly type: 'COMPONENT';
    readonly propertyDefinitions: Readonly<Record<string, PropertyDefinition>>;
}
/**
 * Property override for instances
 */
export interface PropertyOverride {
    readonly path: readonly string[];
    readonly value: unknown;
}
/**
 * Instance node - component reference
 */
export interface InstanceNodeData extends SceneNodeData {
    readonly type: 'INSTANCE';
    readonly componentId: NodeId;
    readonly overrides: readonly PropertyOverride[];
    readonly exposedInstances: readonly NodeId[];
}
/**
 * Boolean operation node
 */
export interface BooleanOperationNodeData extends SceneNodeData {
    readonly type: 'BOOLEAN_OPERATION';
    readonly booleanOperation: BooleanOperation;
}
/**
 * Slice node - export region
 */
export interface SliceNodeData extends BaseNodeData, TransformProps {
    readonly type: 'SLICE';
    readonly exportSettings: readonly ExportSetting[];
}
/**
 * Union of all node types
 */
export type NodeData = DocumentNodeData | PageNodeData | FrameNodeData | GroupNodeData | VectorNodeData | ImageNodeData | TextNodeData | ComponentNodeData | InstanceNodeData | BooleanOperationNodeData | SliceNodeData;
/**
 * Type guard for scene nodes (have transform and appearance)
 */
export declare function isSceneNode(node: NodeData): node is FrameNodeData | GroupNodeData | VectorNodeData | ImageNodeData | TextNodeData | ComponentNodeData | InstanceNodeData | BooleanOperationNodeData;
/**
 * Type guard for container nodes (can have children rendered)
 */
export declare function isContainerNode(node: NodeData): node is FrameNodeData | GroupNodeData | ComponentNodeData | BooleanOperationNodeData;
/**
 * Check if a node type can have children
 */
export declare function canHaveChildren(type: NodeType): boolean;
//# sourceMappingURL=base-node.d.ts.map