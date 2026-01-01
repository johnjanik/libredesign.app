/**
 * Document Serializer
 *
 * Serializes and deserializes scene graphs to/from JSON.
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeData } from '@scene/nodes/base-node';
/**
 * Serialized document format
 */
export interface SerializedDocument {
    readonly version: string;
    readonly name: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly nodes: readonly SerializedNode[];
    readonly rootId: NodeId;
}
/**
 * Serialized node format
 */
export interface SerializedNode {
    readonly id: NodeId;
    readonly parentId: NodeId | null;
    readonly childIndex: number;
    readonly data: NodeData;
}
/**
 * Serialization options
 */
export interface SerializationOptions {
    /** Include metadata like timestamps */
    includeMetadata?: boolean | undefined;
    /** Pretty print JSON output */
    prettyPrint?: boolean | undefined;
    /** Custom version string */
    version?: string | undefined;
}
/**
 * Deserialization options
 */
export interface DeserializationOptions {
    /** Whether to validate the structure */
    validate?: boolean | undefined;
    /** Whether to generate new IDs */
    generateNewIds?: boolean | undefined;
}
/**
 * Document Serializer
 */
export declare class DocumentSerializer {
    private version;
    constructor(options?: {
        version?: string | undefined;
    });
    /**
     * Serialize a scene graph to JSON.
     */
    serialize(sceneGraph: SceneGraph, options?: SerializationOptions): string;
    /**
     * Deserialize JSON to a scene graph.
     */
    deserialize(json: string, sceneGraph: SceneGraph, options?: DeserializationOptions): void;
    /**
     * Serialize to a blob for download.
     */
    toBlob(sceneGraph: SceneGraph, options?: SerializationOptions): Blob;
    /**
     * Create download URL for the document.
     */
    toDownloadUrl(sceneGraph: SceneGraph, options?: SerializationOptions): string;
    /**
     * Parse and validate JSON without applying to scene graph.
     */
    parse(json: string): SerializedDocument;
    private serializeNode;
    private sortNodesByDepth;
    private restoreNode;
    private deleteNodeRecursive;
    private validateDocument;
    private validateNode;
}
/**
 * Create a document serializer.
 */
export declare function createDocumentSerializer(options?: {
    version?: string | undefined;
}): DocumentSerializer;
//# sourceMappingURL=document-serializer.d.ts.map