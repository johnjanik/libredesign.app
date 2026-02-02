/**
 * Project Import Types
 *
 * Type definitions for importing entire project folders (React, etc.)
 */

import type { NodeId } from '@core/types/common';

/** Options for project import */
export interface ProjectImportOptions {
  /** Parent node to add imports to */
  parentId?: NodeId;
  /** Number of columns in grid layout (default: 4) */
  gridColumns?: number;
  /** Width of each cell in grid (default: 375) */
  cellWidth?: number;
  /** Height of each cell in grid (default: 812) */
  cellHeight?: number;
  /** Spacing between cells (default: 100) */
  spacing?: number;
  /** Starting X position (default: 0) */
  startX?: number;
  /** Starting Y position (default: 0) */
  startY?: number;
  /** Scale factor for imported content */
  scale?: number;
}

/** Result of importing a project */
export interface ProjectImportResult {
  /** Root container frame ID */
  rootId: NodeId;
  /** Information about each imported file */
  importedFiles: ImportedFileInfo[];
  /** Total number of nodes created */
  totalNodeCount: number;
  /** Warnings encountered during import */
  warnings: string[];
  /** Processing time in milliseconds */
  processingTime: number;
}

/** Information about a single imported file */
export interface ImportedFileInfo {
  /** Original filename */
  filename: string;
  /** Relative path from project root */
  relativePath: string;
  /** Root node ID for this file's content */
  rootId: NodeId;
  /** Number of nodes created for this file */
  nodeCount: number;
  /** Position in grid layout */
  position: { x: number; y: number };
}
