/**
 * SwiftUI Importer
 *
 * Import SwiftUI code files and Xcode projects into DesignLibre.
 * Parses Swift/SwiftUI source code and creates corresponding scene graph nodes.
 */

import type { NodeId } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { SceneGraph, CreateNodeOptions } from '@scene/graph/scene-graph';
import { SwiftParser } from './swift-parser';
import { SwiftUIViewMapper } from './view-mapper';
import type {
  SwiftUIImportOptions,
  SwiftUIImportResult,
  XcodeProjectImportOptions,
  XcodeProjectImportResult,
  XcodeProject,
  SwiftFileInfo,
} from './types';

// ============================================================================
// SwiftUI Importer Class
// ============================================================================

/**
 * Imports SwiftUI code into DesignLibre scene graph
 */
export class SwiftUIImporter {
  private sceneGraph: SceneGraph;
  private parser: SwiftParser;
  private mapper: SwiftUIViewMapper;
  private warnings: string[] = [];

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
    this.parser = new SwiftParser();
    this.mapper = new SwiftUIViewMapper(sceneGraph);
  }

  /**
   * Import SwiftUI code from a string
   */
  async import(
    code: string,
    filePath: string,
    options: SwiftUIImportOptions = {}
  ): Promise<SwiftUIImportResult> {
    const startTime = performance.now();
    this.warnings = [];
    this.mapper.reset();

    // Get or create parent
    const parentId = options.parentId ?? this.getDefaultParent();

    // Parse the SwiftUI code
    const parsedViews = this.parser.parse(code, filePath);

    if (parsedViews.length === 0) {
      this.warnings.push('No SwiftUI views found in source file');
      // Create empty container
      const rootId = this.sceneGraph.createNode('FRAME', parentId, -1, {
        name: this.getFileName(filePath),
        x: options.x ?? 0,
        y: options.y ?? 0,
        width: 375,
        height: 812,
      } as CreateNodeOptions);

      return {
        rootId,
        nodeCount: 1,
        sourceFile: filePath,
        viewsFound: [],
        unresolvedViews: [],
        codeControlledCount: 0,
        warnings: this.warnings,
        processingTime: performance.now() - startTime,
      };
    }

    // Create root container for the file (transparent to show child colors)
    const rootId = this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: this.getFileName(filePath),
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: 375,
      height: 812,
      fills: [], // Transparent - child elements will show their own colors
    } as CreateNodeOptions);

    // Map each parsed view to nodes
    const viewsFound: string[] = [];
    const unresolvedViews: string[] = [];

    for (const view of parsedViews) {
      viewsFound.push(view.viewType);
      if (view.customViewName) {
        unresolvedViews.push(view.customViewName);
      }

      this.mapper.mapView(view, rootId, {
        x: 0,
        y: 0,
        scale: options.scale ?? 1,
        preserveMetadata: options.preserveSourceMetadata ?? true,
      });
    }

    const stats = this.mapper.getStats();
    this.warnings.push(...stats.warnings);

    return {
      rootId,
      nodeCount: stats.nodeCount + 1, // +1 for root
      sourceFile: filePath,
      viewsFound,
      unresolvedViews,
      codeControlledCount: stats.codeControlledCount,
      warnings: this.warnings,
      processingTime: performance.now() - startTime,
    };
  }

  /**
   * Import from a File object
   */
  async importFile(
    file: File,
    options: SwiftUIImportOptions = {}
  ): Promise<SwiftUIImportResult> {
    const code = await file.text();
    return this.import(code, file.name, options);
  }

  /**
   * Import from a FileSystemFileHandle (File System Access API)
   */
  async importFromHandle(
    handle: FileSystemFileHandle,
    options: SwiftUIImportOptions = {}
  ): Promise<SwiftUIImportResult> {
    const file = await handle.getFile();
    const code = await file.text();
    // Get full path if available
    const path = (handle as { fullPath?: string }).fullPath ?? handle.name;
    return this.import(code, path, options);
  }

  /**
   * Import an entire Xcode project
   */
  async importXcodeProject(
    directoryHandle: FileSystemDirectoryHandle,
    options: XcodeProjectImportOptions = {}
  ): Promise<XcodeProjectImportResult> {
    this.warnings = [];

    // Scan for Swift files
    const project = await this.scanXcodeProject(directoryHandle);

    if (project.swiftFiles.length === 0) {
      throw new Error('No Swift files found in project');
    }

    // Get or create parent
    const parentId = options.parentId ?? this.getDefaultParent();

    // Create project root node
    const rootId = this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: project.name,
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: 1200,
      height: 900,
    } as CreateNodeOptions);

    // Import each Swift file
    const fileResults: SwiftUIImportResult[] = [];
    const assetColors = new Map<string, RGBA>();
    const _customViews = new Map<string, unknown>();
    void _customViews; // Future use: track custom view definitions
    let offsetY = 0;

    for (const filePath of project.swiftFiles) {
      // Check file patterns
      if (options.filePatterns && options.filePatterns.length > 0) {
        const matches = options.filePatterns.some(pattern =>
          this.matchesPattern(filePath, pattern as string)
        );
        if (!matches) continue;
      }

      if (options.excludePatterns && options.excludePatterns.length > 0) {
        const excluded = options.excludePatterns.some(pattern =>
          this.matchesPattern(filePath, pattern as string)
        );
        if (excluded) continue;
      }

      // Read and import the file
      try {
        const code = await this.readFileFromProject(directoryHandle, filePath);

        // Check if it's a SwiftUI file
        if (!this.isSwiftUIFile(code)) {
          continue;
        }

        const result = await this.import(code, filePath, {
          ...options,
          parentId: rootId,
          y: offsetY,
        });

        fileResults.push(result);
        offsetY += 900; // Stack files vertically
      } catch (error) {
        this.warnings.push(`Failed to import ${filePath}: ${error}`);
      }
    }

    // Parse asset catalogs for colors
    if (options.parseAssetCatalogs !== false) {
      for (const catalogPath of project.assetCatalogs) {
        try {
          const colors = await this.parseAssetCatalog(directoryHandle, catalogPath);
          for (const [name, color] of colors) {
            assetColors.set(name, color);
          }
        } catch {
          this.warnings.push(`Failed to parse asset catalog: ${catalogPath}`);
        }
      }
    }

    return {
      rootId,
      files: fileResults,
      assetColors,
      customViews: new Map(),
      totalNodeCount: fileResults.reduce((sum, r) => sum + r.nodeCount, 0) + 1,
      warnings: this.warnings,
    };
  }

  /**
   * Scan Xcode project structure
   */
  private async scanXcodeProject(
    directoryHandle: FileSystemDirectoryHandle
  ): Promise<XcodeProject> {
    const swiftFiles: string[] = [];
    const assetCatalogs: string[] = [];
    let projectName = directoryHandle.name;

    // Look for .xcodeproj to get project name
    // Use type assertion for FileSystemDirectoryHandle.values() which isn't in default TS types
    const rootEntries = (directoryHandle as unknown as { values(): AsyncIterable<FileSystemHandle> }).values();
    for await (const entry of rootEntries) {
      if (entry.name.endsWith('.xcodeproj') && entry.kind === 'directory') {
        projectName = entry.name.replace('.xcodeproj', '');
      }
    }

    // Recursively find Swift files and asset catalogs
    await this.scanDirectory(directoryHandle, '', swiftFiles, assetCatalogs);

    return {
      rootPath: '',
      name: projectName,
      swiftFiles,
      assetCatalogs,
    };
  }

  /**
   * Recursively scan directory for Swift files
   */
  private async scanDirectory(
    handle: FileSystemDirectoryHandle,
    path: string,
    swiftFiles: string[],
    assetCatalogs: string[]
  ): Promise<void> {
    // Use type assertion for FileSystemDirectoryHandle.values() which isn't in default TS types
    const entries = (handle as unknown as { values(): AsyncIterable<FileSystemHandle> }).values();
    for await (const entry of entries) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.kind === 'file' && entry.name.endsWith('.swift')) {
        // Skip test files
        if (!entry.name.includes('Tests') && !entryPath.includes('Tests/')) {
          swiftFiles.push(entryPath);
        }
      } else if (entry.kind === 'directory') {
        if (entry.name.endsWith('.xcassets')) {
          assetCatalogs.push(entryPath);
        } else if (
          !entry.name.startsWith('.') &&
          !entry.name.endsWith('.xcodeproj') &&
          !entry.name.includes('Tests')
        ) {
          const subHandle = await handle.getDirectoryHandle(entry.name);
          await this.scanDirectory(subHandle, entryPath, swiftFiles, assetCatalogs);
        }
      }
    }
  }

  /**
   * Read a file from the project
   */
  private async readFileFromProject(
    rootHandle: FileSystemDirectoryHandle,
    filePath: string
  ): Promise<string> {
    const parts = filePath.split('/');
    let currentHandle: FileSystemDirectoryHandle = rootHandle;

    // Navigate to parent directory
    for (let i = 0; i < parts.length - 1; i++) {
      currentHandle = await currentHandle.getDirectoryHandle(parts[i]!);
    }

    // Get the file
    const fileName = parts[parts.length - 1]!;
    const fileHandle = await currentHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return file.text();
  }

  /**
   * Check if code is a SwiftUI file
   */
  private isSwiftUIFile(code: string): boolean {
    return (
      code.includes('import SwiftUI') ||
      code.includes(': View') ||
      code.includes('@ViewBuilder')
    );
  }

  /**
   * Parse asset catalog for colors
   */
  private async parseAssetCatalog(
    rootHandle: FileSystemDirectoryHandle,
    catalogPath: string
  ): Promise<Map<string, RGBA>> {
    const colors = new Map<string, RGBA>();

    try {
      const parts = catalogPath.split('/');
      let currentHandle: FileSystemDirectoryHandle = rootHandle;

      for (const part of parts) {
        currentHandle = await currentHandle.getDirectoryHandle(part);
      }

      // Find .colorset directories
      // Use type assertion for FileSystemDirectoryHandle.values() which isn't in default TS types
      const colorEntries = (currentHandle as unknown as { values(): AsyncIterable<FileSystemHandle> }).values();
      for await (const entry of colorEntries) {
        if (entry.kind === 'directory' && entry.name.endsWith('.colorset')) {
          const colorName = entry.name.replace('.colorset', '');
          const colorHandle = await currentHandle.getDirectoryHandle(entry.name);

          try {
            const contentsHandle = await colorHandle.getFileHandle('Contents.json');
            const contentsFile = await contentsHandle.getFile();
            const contents = JSON.parse(await contentsFile.text()) as {
              colors?: Array<{
                color?: {
                  components?: {
                    red?: string;
                    green?: string;
                    blue?: string;
                    alpha?: string;
                  };
                };
              }>;
            };

            // Extract color from Contents.json
            const colorData = contents.colors?.[0]?.color?.components;
            if (colorData) {
              colors.set(colorName, {
                r: this.parseColorComponent(colorData.red ?? '0'),
                g: this.parseColorComponent(colorData.green ?? '0'),
                b: this.parseColorComponent(colorData.blue ?? '0'),
                a: this.parseColorComponent(colorData.alpha ?? '1'),
              });
            }
          } catch {
            // Ignore individual color parsing errors
          }
        }
      }
    } catch {
      // Ignore catalog parsing errors
    }

    return colors;
  }

  /**
   * Parse a color component (can be 0-1 float or 0-255 int or hex)
   */
  private parseColorComponent(value: string): number {
    if (value.startsWith('0x') || value.startsWith('#')) {
      return parseInt(value.replace(/^(0x|#)/, ''), 16) / 255;
    }
    const num = parseFloat(value);
    return num > 1 ? num / 255 : num;
  }

  /**
   * Check if a path matches a glob pattern (simplified)
   */
  private matchesPattern(path: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');
    return new RegExp(regex).test(path);
  }

  /**
   * Get file name from path
   */
  private getFileName(path: string): string {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1] ?? path;
    return fileName.replace('.swift', '');
  }

  /**
   * Get default parent node
   */
  private getDefaultParent(): NodeId {
    const doc = this.sceneGraph.getDocument();
    if (!doc) {
      throw new Error('No document in scene graph');
    }

    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) {
      throw new Error('No pages in document');
    }

    return pageIds[0]!;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a SwiftUI importer
 */
export function createSwiftUIImporter(sceneGraph: SceneGraph): SwiftUIImporter {
  return new SwiftUIImporter(sceneGraph);
}

/**
 * Analyze a Swift file without importing
 */
export function analyzeSwiftFile(code: string, filePath: string): SwiftFileInfo {
  const parser = new SwiftParser();
  const views = parser.parse(code, filePath);

  return {
    path: filePath,
    name: filePath.split('/').pop()?.replace('.swift', '') ?? filePath,
    views: views.map(v => v.viewType),
    imports: extractImports(code),
    isSwiftUI: code.includes('import SwiftUI') || views.length > 0,
  };
}

/**
 * Extract import statements from Swift code
 */
function extractImports(code: string): string[] {
  const imports: string[] = [];
  const importMatches = code.matchAll(/import\s+(\w+)/g);
  for (const match of importMatches) {
    imports.push(match[1]!);
  }
  return imports;
}
