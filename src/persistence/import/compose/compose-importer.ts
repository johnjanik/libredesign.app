/**
 * Compose Importer
 *
 * Import Kotlin Compose code files and Android Studio projects into DesignLibre.
 * Parses Jetpack Compose source code and creates corresponding scene graph nodes.
 */

import type { NodeId } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { SceneGraph, CreateNodeOptions } from '@scene/graph/scene-graph';
import { KotlinComposeParser } from './kotlin-parser';
import { ComposeMapper } from './composable-mapper';
import type {
  ComposeImportOptions,
  ComposeImportResult,
  AndroidProjectImportOptions,
  AndroidProjectImportResult,
  AndroidProject,
  KotlinFileInfo,
} from './types';

// ============================================================================
// Compose Importer Class
// ============================================================================

/**
 * Imports Kotlin Compose code into DesignLibre scene graph
 */
export class ComposeImporter {
  private sceneGraph: SceneGraph;
  private parser: KotlinComposeParser;
  private mapper: ComposeMapper;
  private warnings: string[] = [];

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
    this.parser = new KotlinComposeParser();
    this.mapper = new ComposeMapper(sceneGraph);
  }

  /**
   * Import Compose code from a string
   */
  async import(
    code: string,
    filePath: string,
    options: ComposeImportOptions = {}
  ): Promise<ComposeImportResult> {
    const startTime = performance.now();
    this.warnings = [];
    this.mapper.reset();

    // Set theme colors if specified
    if (options.themeVariant) {
      this.parser.setThemeColors(options.themeVariant);
    }

    // Get or create parent
    const parentId = options.parentId ?? this.getDefaultParent();

    // Parse the Compose code
    const parsedComposables = this.parser.parse(code, filePath);

    if (parsedComposables.length === 0) {
      this.warnings.push('No Compose composables found in source file');
      // Create empty container
      const rootId = this.sceneGraph.createNode('FRAME', parentId, -1, {
        name: this.getFileName(filePath),
        x: options.x ?? 0,
        y: options.y ?? 0,
        width: 360,
        height: 800,
      } as CreateNodeOptions);

      return {
        rootId,
        nodeCount: 1,
        sourceFile: filePath,
        composablesFound: [],
        unresolvedComposables: [],
        codeControlledCount: 0,
        warnings: this.warnings,
        processingTime: performance.now() - startTime,
      };
    }

    // Create root container for the file
    const rootId = this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: this.getFileName(filePath),
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: 360,
      height: 800,
      fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 0.98, b: 1, a: 1 }, opacity: 1 }],
    } as CreateNodeOptions);

    // Map each parsed composable to nodes
    const composablesFound: string[] = [];
    const unresolvedComposables: string[] = [];

    for (const composable of parsedComposables) {
      composablesFound.push(composable.name);

      this.mapper.mapComposable(composable, rootId, {
        x: 0,
        y: 0,
        scale: options.scale ?? 1,
        preserveMetadata: options.preserveSourceMetadata ?? true,
      });
    }

    const stats = this.mapper.getStats();
    this.warnings.push(...stats.warnings);

    // Collect unresolved (custom) composables from warnings
    for (const warning of stats.warnings) {
      const match = warning.match(/Unknown composable: (\w+)/);
      if (match) {
        unresolvedComposables.push(match[1]!);
      }
    }

    return {
      rootId,
      nodeCount: stats.nodeCount + 1, // +1 for root
      sourceFile: filePath,
      composablesFound,
      unresolvedComposables,
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
    options: ComposeImportOptions = {}
  ): Promise<ComposeImportResult> {
    const code = await file.text();
    return this.import(code, file.name, options);
  }

  /**
   * Import from a FileSystemFileHandle (File System Access API)
   */
  async importFromHandle(
    handle: FileSystemFileHandle,
    options: ComposeImportOptions = {}
  ): Promise<ComposeImportResult> {
    const file = await handle.getFile();
    const code = await file.text();
    const path = (handle as { fullPath?: string }).fullPath ?? handle.name;
    return this.import(code, path, options);
  }

  /**
   * Import an entire Android project
   */
  async importAndroidProject(
    directoryHandle: FileSystemDirectoryHandle,
    options: AndroidProjectImportOptions = {}
  ): Promise<AndroidProjectImportResult> {
    this.warnings = [];

    // Scan for Kotlin files
    const project = await this.scanAndroidProject(directoryHandle);

    if (project.composeFiles.length === 0) {
      throw new Error('No Compose files found in project');
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

    // Import each Compose file
    const fileResults: ComposeImportResult[] = [];
    const themeColors = new Map<string, RGBA>();
    let offsetY = 0;

    for (const filePath of project.composeFiles) {
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

        // Check if it's a Compose file
        if (!this.isComposeFile(code)) {
          continue;
        }

        const result = await this.import(code, filePath, {
          ...options,
          parentId: rootId,
          y: offsetY,
        });

        fileResults.push(result);
        offsetY += 900;
      } catch (error) {
        this.warnings.push(`Failed to import ${filePath}: ${error}`);
      }
    }

    // Parse theme colors if requested
    if (options.parseThemeColors !== false) {
      for (const themePath of project.themeFiles) {
        try {
          const themeCode = await this.readFileFromProject(directoryHandle, themePath);
          const colors = this.parseThemeColors(themeCode);
          for (const [name, color] of colors) {
            themeColors.set(name, color);
          }
        } catch {
          this.warnings.push(`Failed to parse theme: ${themePath}`);
        }
      }
    }

    return {
      rootId,
      files: fileResults,
      themeColors,
      customComposables: new Map(),
      totalNodeCount: fileResults.reduce((sum, r) => sum + r.nodeCount, 0) + 1,
      warnings: this.warnings,
    };
  }

  /**
   * Scan Android project structure
   */
  private async scanAndroidProject(
    directoryHandle: FileSystemDirectoryHandle
  ): Promise<AndroidProject> {
    const composeFiles: string[] = [];
    const themeFiles: string[] = [];
    let projectName = directoryHandle.name;

    // Look for build.gradle to get project name
    try {
      const buildGradle = await directoryHandle.getFileHandle('build.gradle.kts');
      const file = await buildGradle.getFile();
      const content = await file.text();
      const nameMatch = content.match(/rootProject\.name\s*=\s*"([^"]+)"/);
      if (nameMatch) {
        projectName = nameMatch[1]!;
      }
    } catch {
      // Try settings.gradle
      try {
        const settingsGradle = await directoryHandle.getFileHandle('settings.gradle.kts');
        const file = await settingsGradle.getFile();
        const content = await file.text();
        const nameMatch = content.match(/rootProject\.name\s*=\s*"([^"]+)"/);
        if (nameMatch) {
          projectName = nameMatch[1]!;
        }
      } catch {
        // Use directory name
      }
    }

    // Recursively find Kotlin files
    await this.scanDirectory(directoryHandle, '', composeFiles, themeFiles);

    return {
      rootPath: '',
      name: projectName,
      composeFiles,
      themeFiles,
    };
  }

  /**
   * Recursively scan directory for Kotlin files
   */
  private async scanDirectory(
    handle: FileSystemDirectoryHandle,
    path: string,
    composeFiles: string[],
    themeFiles: string[]
  ): Promise<void> {
    // Use type assertion for FileSystemDirectoryHandle.values() which isn't in default TS types
    const entries = (handle as unknown as { values(): AsyncIterable<FileSystemHandle> }).values();
    for await (const entry of entries) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.kind === 'file' && entry.name.endsWith('.kt')) {
        // Skip test files
        if (!entry.name.includes('Test') && !entryPath.includes('test/')) {
          composeFiles.push(entryPath);

          // Check for theme files
          if (entry.name.includes('Theme') || entry.name.includes('Color')) {
            themeFiles.push(entryPath);
          }
        }
      } else if (entry.kind === 'directory') {
        if (
          !entry.name.startsWith('.') &&
          !entry.name.includes('test') &&
          !entry.name.includes('build') &&
          entry.name !== 'node_modules'
        ) {
          const subHandle = await handle.getDirectoryHandle(entry.name);
          await this.scanDirectory(subHandle, entryPath, composeFiles, themeFiles);
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

    for (let i = 0; i < parts.length - 1; i++) {
      currentHandle = await currentHandle.getDirectoryHandle(parts[i]!);
    }

    const fileName = parts[parts.length - 1]!;
    const fileHandle = await currentHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return file.text();
  }

  /**
   * Check if code is a Compose file
   */
  private isComposeFile(code: string): boolean {
    return (
      code.includes('import androidx.compose') ||
      code.includes('@Composable') ||
      code.includes('Modifier.')
    );
  }

  /**
   * Parse theme colors from Kotlin code
   */
  private parseThemeColors(code: string): Map<string, RGBA> {
    const colors = new Map<string, RGBA>();

    // Match val colorName = Color(0xFFRRGGBB)
    const colorMatches = code.matchAll(/val\s+(\w+)\s*=\s*Color\s*\(\s*0x([0-9A-Fa-f]{6,8})\s*\)/g);

    for (const match of colorMatches) {
      const name = match[1]!;
      const hex = match[2]!;

      let r: number, g: number, b: number, a: number;
      if (hex.length === 8) {
        a = parseInt(hex.slice(0, 2), 16) / 255;
        r = parseInt(hex.slice(2, 4), 16) / 255;
        g = parseInt(hex.slice(4, 6), 16) / 255;
        b = parseInt(hex.slice(6, 8), 16) / 255;
      } else {
        a = 1;
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
      }

      colors.set(name, { r, g, b, a });
    }

    return colors;
  }

  /**
   * Check if a path matches a glob pattern
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
    return fileName.replace('.kt', '');
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
// Factory Functions
// ============================================================================

/**
 * Create a Compose importer
 */
export function createComposeImporter(sceneGraph: SceneGraph): ComposeImporter {
  return new ComposeImporter(sceneGraph);
}

/**
 * Analyze a Kotlin file without importing
 */
export function analyzeKotlinFile(code: string, filePath: string): KotlinFileInfo {
  const parser = new KotlinComposeParser();
  const composables = parser.parse(code, filePath);

  return {
    path: filePath,
    name: filePath.split('/').pop()?.replace('.kt', '') ?? filePath,
    composables: composables.map(c => c.name),
    imports: extractImports(code),
    isCompose: code.includes('import androidx.compose') || composables.length > 0,
  };
}

/**
 * Extract import statements from Kotlin code
 */
function extractImports(code: string): string[] {
  const imports: string[] = [];
  const importMatches = code.matchAll(/import\s+([\w.]+)/g);
  for (const match of importMatches) {
    imports.push(match[1]!);
  }
  return imports;
}
