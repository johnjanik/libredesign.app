/**
 * Property Extractor
 *
 * Extracts displayable properties from nodes for the inspector panel.
 */
import type { NodeData } from '@scene/nodes/base-node';
import type { RGBA } from '@core/types/color';
/** Property category */
export type PropertyCategory = 'identity' | 'transform' | 'appearance' | 'layout' | 'typography' | 'effects';
/** Single property display info */
export interface PropertyDisplay {
    readonly name: string;
    readonly label: string;
    readonly category: PropertyCategory;
    readonly value: unknown;
    readonly displayValue: string;
    readonly copyValue: string;
    readonly editable: boolean;
    readonly type: 'string' | 'number' | 'boolean' | 'color' | 'enum' | 'complex';
    readonly unit?: string;
    readonly options?: readonly string[];
}
/** Color swatch info for display */
export interface ColorSwatchInfo {
    readonly color: RGBA;
    readonly hex: string;
    readonly opacity: number;
}
/** Extracted properties grouped by category */
export interface ExtractedProperties {
    readonly nodeId: string;
    readonly nodeName: string;
    readonly nodeType: string;
    readonly categories: Record<PropertyCategory, readonly PropertyDisplay[]>;
    readonly colors: readonly ColorSwatchInfo[];
}
/**
 * Extract all displayable properties from a node.
 */
export declare function extractProperties(node: NodeData): ExtractedProperties;
/**
 * Extract properties from multiple selected nodes.
 * Returns only properties that are common across all nodes.
 */
export declare function extractSharedProperties(nodes: NodeData[]): ExtractedProperties | null;
//# sourceMappingURL=property-extractor.d.ts.map