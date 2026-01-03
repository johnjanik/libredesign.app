/**
 * Source Mapping
 *
 * Tracks mappings between DesignLibre nodes and source code locations.
 * Uses semantic anchors to survive code reformatting.
 */

import type { NodeId } from '@core/types/common';
import type {
  CodeFramework,
  SemanticAnchor,
  PropertySource,
} from '@core/types/code-source-metadata';
import { getCodeSourceMetadata } from '@core/types/code-source-metadata';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeData } from '@scene/nodes/base-node';

// ============================================================================
// Source Mapping Types
// ============================================================================

/**
 * Mapping entry for a node
 */
export interface SourceMappingEntry {
  /** Node ID in DesignLibre */
  readonly nodeId: NodeId;
  /** Source file path */
  readonly filePath: string;
  /** Framework (swiftui or compose) */
  readonly framework: CodeFramework;
  /** Semantic anchor for relocating the view */
  readonly anchor: SemanticAnchor;
  /** Property mappings */
  readonly propertyMappings: Map<string, PropertyAnchor>;
  /** File version when last synced */
  readonly fileVersion: number;
  /** Last sync timestamp */
  readonly lastSync: number;
}

/**
 * Anchor for a specific property in source code
 */
export interface PropertyAnchor {
  /** Property path in DesignLibre (e.g., "fills[0].color") */
  readonly propertyPath: string;
  /** Original code expression */
  readonly codeExpression: string;
  /** Approximate line number (hint for faster lookup) */
  readonly lineHint: number;
  /** Character offset in file */
  readonly charOffset: number;
  /** Length of the expression */
  readonly charLength: number;
  /** Is this property editable */
  readonly isEditable: boolean;
}

/**
 * File tracking info
 */
export interface TrackedFile {
  readonly path: string;
  readonly framework: CodeFramework;
  readonly lastModified: number;
  readonly checksum: string;
  readonly nodeIds: Set<NodeId>;
}

// ============================================================================
// Source Mapping Manager
// ============================================================================

/**
 * Manages source code mappings for bidirectional sync
 */
export class SourceMappingManager {
  private sceneGraph: SceneGraph;
  private mappings: Map<NodeId, SourceMappingEntry> = new Map();
  private fileIndex: Map<string, TrackedFile> = new Map();
  private anchorIndex: Map<string, NodeId> = new Map(); // anchor key -> nodeId

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  /**
   * Register a mapping for a node
   */
  registerMapping(
    nodeId: NodeId,
    filePath: string,
    framework: CodeFramework,
    anchor: SemanticAnchor,
    propertySources: Record<string, PropertySource>
  ): void {
    // Create property mappings
    const propertyMappings = new Map<string, PropertyAnchor>();
    for (const [propPath, source] of Object.entries(propertySources)) {
      propertyMappings.set(propPath, {
        propertyPath: propPath,
        codeExpression: source.originalExpression,
        lineHint: source.sourceLocation.startLine,
        charOffset: source.sourceLocation.startOffset,
        charLength: source.sourceLocation.endOffset - source.sourceLocation.startOffset,
        isEditable: source.isEditable,
      });
    }

    const entry: SourceMappingEntry = {
      nodeId,
      filePath,
      framework,
      anchor,
      propertyMappings,
      fileVersion: 0,
      lastSync: Date.now(),
    };

    this.mappings.set(nodeId, entry);

    // Update file index
    let fileInfo = this.fileIndex.get(filePath);
    if (!fileInfo) {
      fileInfo = {
        path: filePath,
        framework,
        lastModified: Date.now(),
        checksum: '',
        nodeIds: new Set(),
      };
      this.fileIndex.set(filePath, fileInfo);
    }
    fileInfo.nodeIds.add(nodeId);

    // Update anchor index
    const anchorKey = this.computeAnchorKey(filePath, anchor);
    this.anchorIndex.set(anchorKey, nodeId);
  }

  /**
   * Get mapping for a node
   */
  getMapping(nodeId: NodeId): SourceMappingEntry | null {
    return this.mappings.get(nodeId) ?? null;
  }

  /**
   * Get node ID by anchor
   */
  getNodeByAnchor(filePath: string, anchor: SemanticAnchor): NodeId | null {
    const anchorKey = this.computeAnchorKey(filePath, anchor);
    return this.anchorIndex.get(anchorKey) ?? null;
  }

  /**
   * Get all nodes for a file
   */
  getNodesForFile(filePath: string): NodeId[] {
    const fileInfo = this.fileIndex.get(filePath);
    return fileInfo ? Array.from(fileInfo.nodeIds) : [];
  }

  /**
   * Get all tracked files
   */
  getTrackedFiles(): string[] {
    return Array.from(this.fileIndex.keys());
  }

  /**
   * Check if a property is editable
   */
  isPropertyEditable(nodeId: NodeId, propertyPath: string): boolean {
    const mapping = this.mappings.get(nodeId);
    if (!mapping) return true; // Not mapped, allow editing

    const propAnchor = mapping.propertyMappings.get(propertyPath);
    return propAnchor?.isEditable ?? true;
  }

  /**
   * Get property anchor for a node property
   */
  getPropertyAnchor(nodeId: NodeId, propertyPath: string): PropertyAnchor | null {
    const mapping = this.mappings.get(nodeId);
    if (!mapping) return null;

    return mapping.propertyMappings.get(propertyPath) ?? null;
  }

  /**
   * Update property anchor after sync
   */
  updatePropertyAnchor(
    nodeId: NodeId,
    propertyPath: string,
    newOffset: number,
    newLength: number,
    newExpression: string
  ): void {
    const mapping = this.mappings.get(nodeId);
    if (!mapping) return;

    const existing = mapping.propertyMappings.get(propertyPath);
    if (!existing) return;

    mapping.propertyMappings.set(propertyPath, {
      ...existing,
      charOffset: newOffset,
      charLength: newLength,
      codeExpression: newExpression,
    });
  }

  /**
   * Update file checksum
   */
  updateFileChecksum(filePath: string, checksum: string): void {
    const fileInfo = this.fileIndex.get(filePath);
    if (fileInfo) {
      (fileInfo as { checksum: string }).checksum = checksum;
      (fileInfo as { lastModified: number }).lastModified = Date.now();
    }
  }

  /**
   * Remove mapping for a node
   */
  removeMapping(nodeId: NodeId): void {
    const mapping = this.mappings.get(nodeId);
    if (!mapping) return;

    // Remove from file index
    const fileInfo = this.fileIndex.get(mapping.filePath);
    if (fileInfo) {
      fileInfo.nodeIds.delete(nodeId);
      if (fileInfo.nodeIds.size === 0) {
        this.fileIndex.delete(mapping.filePath);
      }
    }

    // Remove from anchor index
    const anchorKey = this.computeAnchorKey(mapping.filePath, mapping.anchor);
    this.anchorIndex.delete(anchorKey);

    // Remove mapping
    this.mappings.delete(nodeId);
  }

  /**
   * Scan scene graph and build mappings from existing nodes
   */
  scanSceneGraph(): void {
    const doc = this.sceneGraph.getDocument();
    if (!doc) return;

    this.sceneGraph.traverse((node: NodeData) => {
      const metadata = getCodeSourceMetadata(node.pluginData);
      if (metadata) {
        this.registerMapping(
          node.id,
          metadata.sourceFile,
          metadata.framework,
          metadata.anchor,
          metadata.propertySources
        );
      }
    });
  }

  /**
   * Clear all mappings
   */
  clear(): void {
    this.mappings.clear();
    this.fileIndex.clear();
    this.anchorIndex.clear();
  }

  /**
   * Compute a unique key for an anchor
   */
  private computeAnchorKey(filePath: string, anchor: SemanticAnchor): string {
    return `${filePath}:${anchor.containingScope}:${anchor.viewType}:${anchor.siblingIndex}`;
  }
}

/**
 * Create a source mapping manager
 */
export function createSourceMappingManager(sceneGraph: SceneGraph): SourceMappingManager {
  return new SourceMappingManager(sceneGraph);
}
