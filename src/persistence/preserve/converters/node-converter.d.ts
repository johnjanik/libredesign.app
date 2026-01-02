/**
 * Node Converter
 *
 * Converts between internal NodeData and PreserveNode formats.
 */
import type { NodeData } from '@scene/nodes/base-node';
import type { PreserveNode } from '../preserve-types';
/**
 * Convert internal NodeData to PreserveNode format.
 */
export declare function nodeToPreserve(node: NodeData, children?: PreserveNode[]): PreserveNode;
/**
 * Convert PreserveNode back to internal NodeData format.
 * This is used when importing .preserve files.
 */
export declare function preserveToNode(preserve: PreserveNode): Partial<NodeData>;
//# sourceMappingURL=node-converter.d.ts.map