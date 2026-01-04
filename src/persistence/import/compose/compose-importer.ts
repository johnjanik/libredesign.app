/**
 * Kotlin/Compose Importer
 *
 * Import Kotlin/Compose code into DesignLibre scene graph.
 */

import type { NodeId, NodeType } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { SceneGraph, CreateNodeOptions } from '@scene/graph/scene-graph';
import { ComposeParser } from './compose-parser';
import type {
  ParsedComposable,
  ParsedComposeModifier,
  ParsedParamValue,
  ComposeImportOptions,
  ComposeImportResult,
  AndroidProjectImportOptions,
  AndroidProjectImportResult,
} from './types';

// ============================================================================
// Component to Node Mappings
// ============================================================================

interface ComponentMapping {
  nodeType: NodeType;
  layoutMode?: 'HORIZONTAL' | 'VERTICAL';
  defaultWidth?: number;
  defaultHeight?: number;
  defaultCornerRadius?: number;
  defaultFillColor?: RGBA;
  defaultStrokeColor?: RGBA;
  defaultStrokeWeight?: number;
}

const COMPONENT_MAPPINGS: Record<string, ComponentMapping> = {
  // Layout
  Column: { nodeType: 'FRAME', layoutMode: 'VERTICAL' },
  Row: { nodeType: 'FRAME', layoutMode: 'HORIZONTAL' },
  Box: { nodeType: 'FRAME' },
  LazyColumn: { nodeType: 'FRAME', layoutMode: 'VERTICAL' },
  LazyRow: { nodeType: 'FRAME', layoutMode: 'HORIZONTAL' },
  Surface: { nodeType: 'FRAME' },
  Card: {
    nodeType: 'FRAME',
    defaultCornerRadius: 8,
    defaultFillColor: { r: 1, g: 1, b: 1, a: 1 },
  },
  Scaffold: { nodeType: 'FRAME' },

  // Text
  Text: { nodeType: 'TEXT' },

  // Interactive
  Button: {
    nodeType: 'FRAME',
    defaultFillColor: { r: 0.384, g: 0.51, b: 0.965, a: 1 },
    defaultCornerRadius: 4,
  },
  IconButton: {
    nodeType: 'FRAME',
    defaultWidth: 48,
    defaultHeight: 48,
    defaultCornerRadius: 24,
  },
  TextButton: { nodeType: 'FRAME' },
  OutlinedButton: {
    nodeType: 'FRAME',
    defaultStrokeColor: { r: 0.384, g: 0.51, b: 0.965, a: 1 },
    defaultStrokeWeight: 1,
    defaultCornerRadius: 4,
  },
  TextField: {
    nodeType: 'FRAME',
    defaultWidth: 280,
    defaultHeight: 56,
    defaultFillColor: { r: 0.96, g: 0.96, b: 0.96, a: 1 },
    defaultCornerRadius: 4,
  },
  OutlinedTextField: {
    nodeType: 'FRAME',
    defaultWidth: 280,
    defaultHeight: 56,
    defaultStrokeColor: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
    defaultStrokeWeight: 1,
    defaultCornerRadius: 4,
  },

  // Media
  Image: { nodeType: 'FRAME' },
  Icon: { nodeType: 'FRAME', defaultWidth: 24, defaultHeight: 24 },

  // Spacing
  Spacer: { nodeType: 'FRAME' },
  Divider: {
    nodeType: 'FRAME',
    defaultHeight: 1,
    defaultFillColor: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
  },

  // Default
  _default: { nodeType: 'FRAME' },
};

// ============================================================================
// Compose Importer Class
// ============================================================================

/**
 * Imports Kotlin/Compose code into DesignLibre scene graph
 */
export class ComposeImporter {
  private sceneGraph: SceneGraph;
  private parser: ComposeParser;
  private warnings: string[] = [];
  private nodeCount: number = 0;
  private composablesFound: string[] = [];

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
    this.parser = new ComposeParser();
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
    this.nodeCount = 0;
    this.composablesFound = [];

    const parentId = options.parentId ?? this.getDefaultParent();
    const composables = this.parser.parse(code, filePath);

    if (composables.length === 0) {
      this.warnings.push('No Composable elements found in source file');
      const rootId = this.sceneGraph.createNode('FRAME', parentId as NodeId, -1, {
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
        warnings: this.warnings,
        processingTime: performance.now() - startTime,
      };
    }

    // Create root container
    const rootId = this.sceneGraph.createNode('FRAME', parentId as NodeId, -1, {
      name: this.getFileName(filePath),
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: 360,
      height: 800,
      fills: [],
    } as CreateNodeOptions);
    this.nodeCount++;

    // Map each Composable to nodes
    for (const composable of composables) {
      this.mapComposable(composable, rootId, options.scale ?? 1);
    }

    return {
      rootId,
      nodeCount: this.nodeCount,
      sourceFile: filePath,
      composablesFound: [...new Set(this.composablesFound)],
      warnings: this.warnings,
      processingTime: performance.now() - startTime,
    };
  }

  /**
   * Import an Android project directory
   */
  async importAndroidProject(
    directoryHandle: FileSystemDirectoryHandle,
    options: AndroidProjectImportOptions = {}
  ): Promise<AndroidProjectImportResult> {
    const startTime = performance.now();
    const warnings: string[] = [];
    const files: ComposeImportResult[] = [];
    let totalNodeCount = 0;

    const parentId = options.parentId ?? this.getDefaultParent();

    // Create root container for the project
    const rootId = this.sceneGraph.createNode('FRAME', parentId as NodeId, -1, {
      name: directoryHandle.name,
      x: options.x ?? 0,
      y: options.y ?? 0,
      width: 360,
      height: 800,
      fills: [],
    } as CreateNodeOptions);
    totalNodeCount++;

    // Find and import all .kt files
    const ktFiles = await this.findKotlinFiles(directoryHandle, options);

    let yOffset = 0;
    for (const { path, content } of ktFiles) {
      try {
        const importOptions: ComposeImportOptions = {
          parentId: rootId as unknown as string,
          x: 0,
          y: yOffset,
        };
        if (options.scale !== undefined) importOptions.scale = options.scale;
        if (options.preserveSourceMetadata !== undefined) importOptions.preserveSourceMetadata = options.preserveSourceMetadata;
        const result = await this.import(content, path, importOptions);
        files.push(result);
        totalNodeCount += result.nodeCount;
        yOffset += 850; // Space between screens
      } catch (error) {
        warnings.push(`Failed to import ${path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (ktFiles.length === 0) {
      warnings.push('No Kotlin files found in project');
    }

    return {
      rootId: rootId as unknown as string,
      files,
      totalNodeCount,
      processingTime: performance.now() - startTime,
      warnings,
      themeColors: new Map(), // Theme colors not yet parsed from Android projects
    };
  }

  /**
   * Find all Kotlin files in directory
   */
  private async findKotlinFiles(
    directoryHandle: FileSystemDirectoryHandle,
    options: AndroidProjectImportOptions,
    basePath: string = ''
  ): Promise<Array<{ path: string; content: string }>> {
    const files: Array<{ path: string; content: string }> = [];
    const filePatterns = options.filePatterns ?? ['**/*.kt'];
    const excludePatterns = options.excludePatterns ?? ['**/build/**', '**/test/**'];

    // Use async iterator directly on directory handle
    const entries: FileSystemHandle[] = [];
    // @ts-expect-error - File System API iteration
    for await (const [, entry] of directoryHandle.entries()) {
      entries.push(entry as FileSystemHandle);
    }

    for (const entry of entries) {
      const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;

      // Check exclude patterns
      if (excludePatterns.some(pattern => this.matchesPattern(currentPath, pattern))) {
        continue;
      }

      if (entry.kind === 'directory') {
        const subFiles = await this.findKotlinFiles(
          await directoryHandle.getDirectoryHandle(entry.name),
          options,
          currentPath
        );
        files.push(...subFiles);
      } else if (entry.kind === 'file' && entry.name.endsWith('.kt')) {
        // Check file patterns
        if (filePatterns.some(pattern => this.matchesPattern(currentPath, pattern))) {
          const fileHandle = await directoryHandle.getFileHandle(entry.name);
          const file = await fileHandle.getFile();
          const content = await file.text();
          files.push({ path: currentPath, content });
        }
      }
    }

    return files;
  }

  /**
   * Simple pattern matching
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regexPattern}$`).test(path);
  }

  /**
   * Map a Composable to scene graph nodes
   */
  private mapComposable(composable: ParsedComposable, parentId: NodeId, scale: number): NodeId | null {
    const mapping = COMPONENT_MAPPINGS[composable.name] ?? COMPONENT_MAPPINGS['_default']!;
    this.composablesFound.push(composable.name);

    // Build node options
    const nodeOptions = this.buildNodeOptions(composable, mapping, scale);

    // Create the node
    const nodeId = this.sceneGraph.createNode(mapping.nodeType, parentId, -1, nodeOptions);
    this.nodeCount++;

    // Handle text content for Text nodes
    if (mapping.nodeType === 'TEXT') {
      const textParam = composable.parameters.get('_arg0') ?? composable.parameters.get('text');
      const text = textParam?.type === 'string' ? textParam.value as string : composable.textContent;
      if (text) {
        // Set text through options during creation - already done above via nodeOptions
      }
    }

    // Handle button text
    if (composable.name === 'Button' && composable.textContent) {
      const textId = this.sceneGraph.createNode('TEXT', nodeId, -1, {
        name: 'Button Text',
        characters: composable.textContent,
        fontSize: 14,
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
      } as CreateNodeOptions);
      this.nodeCount++;
      void textId;
    }

    // Process children
    for (const child of composable.children) {
      this.mapComposable(child, nodeId, scale);
    }

    return nodeId;
  }

  /**
   * Build node options from composable
   */
  private buildNodeOptions(
    composable: ParsedComposable,
    mapping: ComponentMapping,
    scale: number
  ): CreateNodeOptions {
    const options: Record<string, unknown> = {
      name: composable.name,
    };

    // Apply defaults from mapping
    if (mapping.defaultWidth) options['width'] = mapping.defaultWidth * scale;
    if (mapping.defaultHeight) options['height'] = mapping.defaultHeight * scale;
    if (mapping.defaultCornerRadius) options['cornerRadius'] = mapping.defaultCornerRadius * scale;
    if (mapping.defaultFillColor) {
      options['fills'] = [{ type: 'SOLID', color: mapping.defaultFillColor }];
    }
    if (mapping.defaultStrokeColor) {
      options['strokes'] = [{ type: 'SOLID', color: mapping.defaultStrokeColor }];
      options['strokeWeight'] = mapping.defaultStrokeWeight ?? 1;
    }

    // Apply layout mode
    if (mapping.layoutMode) {
      options['layoutMode'] = mapping.layoutMode;
    }

    // Handle text content for TEXT nodes
    if (mapping.nodeType === 'TEXT') {
      const textParam = composable.parameters.get('_arg0') ?? composable.parameters.get('text');
      if (textParam?.type === 'string') {
        options['characters'] = textParam.value as string;
      } else if (composable.textContent) {
        options['characters'] = composable.textContent;
      }
    }

    // Apply modifiers
    for (const modifier of composable.modifiers) {
      this.applyModifier(modifier, options, scale);
    }

    // Check for arrangement/alignment in parameters
    const arrangement = composable.parameters.get('horizontalArrangement') ?? composable.parameters.get('verticalArrangement');
    if (arrangement?.type === 'expression') {
      const expr = arrangement.rawExpression;
      if (expr.includes('SpacedBy')) {
        const match = expr.match(/(\d+)/);
        if (match) {
          options['itemSpacing'] = parseFloat(match[1]!) * scale;
        }
      } else if (expr.includes('SpaceBetween')) {
        options['primaryAxisAlignItems'] = 'SPACE_BETWEEN';
      } else if (expr.includes('Center')) {
        options['primaryAxisAlignItems'] = 'CENTER';
      }
    }

    return options as CreateNodeOptions;
  }

  /**
   * Apply a modifier to node options
   */
  private applyModifier(modifier: ParsedComposeModifier, options: Record<string, unknown>, scale: number): void {
    switch (modifier.name) {
      case 'size': {
        const size = this.getDpValue(modifier.arguments.get('_arg0'));
        if (size !== null) {
          options['width'] = size * scale;
          options['height'] = size * scale;
        }
        break;
      }

      case 'width': {
        const width = this.getDpValue(modifier.arguments.get('_arg0'));
        if (width !== null) options['width'] = width * scale;
        break;
      }

      case 'height': {
        const height = this.getDpValue(modifier.arguments.get('_arg0'));
        if (height !== null) options['height'] = height * scale;
        break;
      }

      case 'fillMaxWidth':
        options['layoutGrow'] = 1;
        break;

      case 'fillMaxHeight':
        options['layoutGrow'] = 1;
        break;

      case 'padding': {
        const all = this.getDpValue(modifier.arguments.get('_arg0') ?? modifier.arguments.get('all'));
        if (all !== null) {
          options['paddingTop'] = all * scale;
          options['paddingRight'] = all * scale;
          options['paddingBottom'] = all * scale;
          options['paddingLeft'] = all * scale;
        }
        const horizontal = this.getDpValue(modifier.arguments.get('horizontal'));
        if (horizontal !== null) {
          options['paddingLeft'] = horizontal * scale;
          options['paddingRight'] = horizontal * scale;
        }
        const vertical = this.getDpValue(modifier.arguments.get('vertical'));
        if (vertical !== null) {
          options['paddingTop'] = vertical * scale;
          options['paddingBottom'] = vertical * scale;
        }
        break;
      }

      case 'background': {
        const colorArg = modifier.arguments.get('_arg0') ?? modifier.arguments.get('color');
        const color = this.parseColor(colorArg);
        if (color) {
          options['fills'] = [{ type: 'SOLID', color }];
        }
        break;
      }

      case 'clip': {
        const shapeArg = modifier.arguments.get('_arg0');
        if (shapeArg?.rawExpression.includes('RoundedCornerShape')) {
          const match = shapeArg.rawExpression.match(/(\d+)/);
          if (match) {
            options['cornerRadius'] = parseFloat(match[1]!) * scale;
          }
        } else if (shapeArg?.rawExpression.includes('CircleShape')) {
          options['cornerRadius'] = 9999;
        }
        break;
      }

      case 'border': {
        const width = this.getDpValue(modifier.arguments.get('width') ?? modifier.arguments.get('_arg0'));
        const colorArg = modifier.arguments.get('color') ?? modifier.arguments.get('_arg1');
        if (width !== null) {
          options['strokeWeight'] = width * scale;
          const color = this.parseColor(colorArg);
          if (color) {
            options['strokes'] = [{ type: 'SOLID', color }];
          }
        }
        break;
      }

      case 'alpha': {
        const alpha = modifier.arguments.get('_arg0');
        if (alpha?.type === 'number') {
          options['opacity'] = alpha.value as number;
        }
        break;
      }
    }
  }

  /**
   * Get dp value from parameter
   */
  private getDpValue(param?: ParsedParamValue): number | null {
    if (!param) return null;
    if (param.type === 'dp' || param.type === 'number') {
      return param.value as number;
    }
    return null;
  }

  /**
   * Parse color from parameter
   */
  private parseColor(param?: ParsedParamValue): RGBA | null {
    if (!param) return null;

    if (param.type === 'color') {
      const value = param.value as string;

      // Hex color: 0xFFRRGGBB or 0xRRGGBB
      const hexMatch = value.match(/0x([A-Fa-f0-9]{6,8})/);
      if (hexMatch) {
        const hex = hexMatch[1]!;
        if (hex.length === 8) {
          return {
            a: parseInt(hex.slice(0, 2), 16) / 255,
            r: parseInt(hex.slice(2, 4), 16) / 255,
            g: parseInt(hex.slice(4, 6), 16) / 255,
            b: parseInt(hex.slice(6, 8), 16) / 255,
          };
        }
        return {
          r: parseInt(hex.slice(0, 2), 16) / 255,
          g: parseInt(hex.slice(2, 4), 16) / 255,
          b: parseInt(hex.slice(4, 6), 16) / 255,
          a: 1,
        };
      }

      // Named colors
      const namedColors: Record<string, RGBA> = {
        Red: { r: 0.957, g: 0.263, b: 0.212, a: 1 },
        Green: { r: 0.298, g: 0.686, b: 0.314, a: 1 },
        Blue: { r: 0.129, g: 0.588, b: 0.953, a: 1 },
        Yellow: { r: 1, g: 0.922, b: 0.231, a: 1 },
        Cyan: { r: 0, g: 0.737, b: 0.831, a: 1 },
        Magenta: { r: 0.914, g: 0.118, b: 0.388, a: 1 },
        White: { r: 1, g: 1, b: 1, a: 1 },
        Black: { r: 0, g: 0, b: 0, a: 1 },
        Gray: { r: 0.62, g: 0.62, b: 0.62, a: 1 },
        LightGray: { r: 0.827, g: 0.827, b: 0.827, a: 1 },
        DarkGray: { r: 0.412, g: 0.412, b: 0.412, a: 1 },
        Transparent: { r: 0, g: 0, b: 0, a: 0 },
      };

      for (const [name, color] of Object.entries(namedColors)) {
        if (value.includes(name)) return color;
      }
    }

    return null;
  }

  /**
   * Get file name from path
   */
  private getFileName(path: string): string {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1] ?? path;
    return fileName.replace(/\.kt$/, '');
  }

  /**
   * Get default parent node
   */
  private getDefaultParent(): string {
    const doc = this.sceneGraph.getDocument();
    if (!doc) throw new Error('No document in scene graph');
    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) throw new Error('No pages in document');
    return pageIds[0] as unknown as string;
  }
}

/**
 * Create a Compose importer
 */
export function createComposeImporter(sceneGraph: SceneGraph): ComposeImporter {
  return new ComposeImporter(sceneGraph);
}
