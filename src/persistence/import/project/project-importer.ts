/**
 * Project Importer
 *
 * Import entire project folders (React/JSX projects) into DesignLibre.
 */

import type { NodeId } from '@core/types/common';
import type { SceneGraph, CreateNodeOptions } from '@scene/graph/scene-graph';
import { ReactImporter } from '../react/react-importer';
import type {
  ProjectImportOptions,
  ProjectImportResult,
  ImportedFileInfo,
} from './types';

// Default grid layout options
const DEFAULT_GRID_COLUMNS = 4;
const DEFAULT_CELL_WIDTH = 375;
const DEFAULT_CELL_HEIGHT = 812;
const DEFAULT_SPACING = 100;

/**
 * Project Importer
 *
 * Imports entire project folders into DesignLibre scene graph,
 * arranging components in a grid layout.
 */
export class ProjectImporter {
  private sceneGraph: SceneGraph;
  private reactImporter: ReactImporter;

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
    this.reactImporter = new ReactImporter(sceneGraph);
  }

  /**
   * Import a project from a FileList (from folder picker)
   */
  async importFromFileList(
    files: FileList,
    options: ProjectImportOptions = {}
  ): Promise<ProjectImportResult> {
    const startTime = performance.now();
    const warnings: string[] = [];

    // Filter for React/JSX files
    const reactFiles = this.filterReactFiles(Array.from(files));

    if (reactFiles.length === 0) {
      warnings.push('No React/JSX files found in the selected folder');
      return {
        rootId: '' as unknown as NodeId,
        importedFiles: [],
        totalNodeCount: 0,
        warnings,
        processingTime: performance.now() - startTime,
      };
    }

    // Get grid layout options
    const columns = options.gridColumns ?? DEFAULT_GRID_COLUMNS;
    const cellWidth = options.cellWidth ?? DEFAULT_CELL_WIDTH;
    const cellHeight = options.cellHeight ?? DEFAULT_CELL_HEIGHT;
    const spacing = options.spacing ?? DEFAULT_SPACING;
    const startX = options.startX ?? 0;
    const startY = options.startY ?? 0;

    // Calculate total container size
    const rows = Math.ceil(reactFiles.length / columns);
    const containerWidth = columns * cellWidth + (columns - 1) * spacing;
    const containerHeight = rows * cellHeight + (rows - 1) * spacing;

    // Get parent for imports
    const parentId = options.parentId ?? this.getDefaultParent();

    // Create container frame
    const containerId = this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: this.getProjectName(reactFiles[0]!),
      x: startX,
      y: startY,
      width: containerWidth,
      height: containerHeight,
      fills: [],
    } as CreateNodeOptions);

    // Import each file
    const importedFiles: ImportedFileInfo[] = [];
    let totalNodeCount = 1; // Start with container

    for (let i = 0; i < reactFiles.length; i++) {
      const file = reactFiles[i]!;
      const position = this.calculateGridPosition(i, columns, cellWidth, cellHeight, spacing);

      try {
        const content = await file.text();
        const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;

        const importOptions: { parentId: string; x: number; y: number; scale?: number } = {
          parentId: containerId as unknown as string,
          x: position.x,
          y: position.y,
        };
        if (options.scale !== undefined) {
          importOptions.scale = options.scale;
        }
        const result = await this.reactImporter.import(content, relativePath, importOptions);

        // Rename the imported root to match the file
        const importedNode = this.sceneGraph.getNode(result.rootId as unknown as NodeId);
        if (importedNode) {
          this.sceneGraph.updateNode(result.rootId as unknown as NodeId, {
            name: this.getComponentName(relativePath),
          });
        }

        importedFiles.push({
          filename: file.name,
          relativePath,
          rootId: result.rootId as unknown as NodeId,
          nodeCount: result.nodeCount,
          position,
        });

        totalNodeCount += result.nodeCount;

        if (result.warnings.length > 0) {
          warnings.push(`${file.name}: ${result.warnings.join(', ')}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Failed to import ${file.name}: ${message}`);
      }
    }

    return {
      rootId: containerId,
      importedFiles,
      totalNodeCount,
      warnings,
      processingTime: performance.now() - startTime,
    };
  }

  /**
   * Filter files to only include React/JSX files
   */
  private filterReactFiles(files: File[]): File[] {
    return files.filter(file => {
      const name = file.name.toLowerCase();

      // Must be a React file
      if (!/\.(tsx?|jsx?)$/.test(name)) {
        return false;
      }

      // Exclude test files
      if (name.includes('.test.') || name.includes('.spec.')) {
        return false;
      }

      // Exclude declaration files
      if (name.endsWith('.d.ts')) {
        return false;
      }

      // Exclude config files
      if (name.includes('config') || name.includes('vite') || name.includes('eslint')) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate grid position for an item
   */
  private calculateGridPosition(
    index: number,
    columns: number,
    cellWidth: number,
    cellHeight: number,
    spacing: number
  ): { x: number; y: number } {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: col * (cellWidth + spacing),
      y: row * (cellHeight + spacing),
    };
  }

  /**
   * Extract project name from file path
   */
  private getProjectName(file: File): string {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    if (relativePath) {
      const parts = relativePath.split('/');
      if (parts.length > 0) {
        return parts[0]!;
      }
    }
    return 'Imported Project';
  }

  /**
   * Extract component name from file path
   */
  private getComponentName(path: string): string {
    const parts = path.split('/');
    const filename = parts[parts.length - 1] ?? path;
    return filename.replace(/\.(tsx?|jsx?)$/, '');
  }

  /**
   * Get default parent node (first page)
   */
  private getDefaultParent(): NodeId {
    const doc = this.sceneGraph.getDocument();
    if (!doc) throw new Error('No document in scene graph');
    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) throw new Error('No pages in document');
    return pageIds[0]!;
  }
}

/**
 * Create a project importer
 */
export function createProjectImporter(sceneGraph: SceneGraph): ProjectImporter {
  return new ProjectImporter(sceneGraph);
}
