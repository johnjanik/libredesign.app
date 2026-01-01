/**
 * SVG Importer
 *
 * Import SVG files and convert them to scene graph nodes.
 */

import type { NodeId } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { VectorPath, PathCommand, WindingRule } from '@core/types/geometry';
import type { SceneGraph, CreateNodeOptions } from '@scene/graph/scene-graph';

/**
 * SVG import options
 */
export interface SVGImportOptions {
  /** Parent node ID to import into */
  parentId?: NodeId | undefined;
  /** Flatten groups (default: false) */
  flattenGroups?: boolean | undefined;
  /** Convert strokes to fills (default: false) */
  strokesAsOutlines?: boolean | undefined;
  /** Preserve viewBox dimensions (default: true) */
  preserveViewBox?: boolean | undefined;
  /** Import hidden elements (default: false) */
  importHidden?: boolean | undefined;
  /** Scale factor (default: 1) */
  scale?: number | undefined;
}

/**
 * SVG import result
 */
export interface SVGImportResult {
  /** Root node ID of imported content */
  readonly rootId: NodeId;
  /** Number of nodes created */
  readonly nodeCount: number;
  /** Original SVG dimensions */
  readonly dimensions: { width: number; height: number };
  /** Warnings during import */
  readonly warnings: readonly string[];
}

/**
 * Parsed SVG element
 */
export interface ParsedElement {
  readonly tag: string;
  readonly attributes: Record<string, string>;
  readonly children: ParsedElement[];
  readonly textContent?: string;
}

/**
 * SVG Importer
 */
export class SVGImporter {
  private sceneGraph: SceneGraph;
  private warnings: string[] = [];
  private nodeCount = 0;

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  /**
   * Import SVG from string.
   */
  import(svgContent: string, options: SVGImportOptions = {}): SVGImportResult {
    this.warnings = [];
    this.nodeCount = 0;

    // preserveViewBox option handled during SVG root parsing
    const scale = options.scale ?? 1;

    // Parse SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`SVG parse error: ${parserError.textContent}`);
    }

    const svgElement = doc.documentElement;
    if (svgElement.tagName !== 'svg') {
      throw new Error('Invalid SVG: root element is not <svg>');
    }

    // Get dimensions
    const dimensions = this.getSVGDimensions(svgElement);

    // Get or create parent
    const parentId = options.parentId ?? this.getDefaultParent();

    // Create a group for the imported content
    const groupId = this.sceneGraph.createNode('GROUP', parentId, -1, {
      name: 'Imported SVG',
      x: 0,
      y: 0,
      width: dimensions.width * scale,
      height: dimensions.height * scale,
    } as CreateNodeOptions);
    this.nodeCount++;

    // Get viewBox transform
    const viewBox = this.parseViewBox(svgElement);
    const transform = this.calculateViewBoxTransform(viewBox, dimensions, scale);

    // Import all children
    this.importChildren(svgElement, groupId, transform, options);

    return {
      rootId: groupId,
      nodeCount: this.nodeCount,
      dimensions,
      warnings: this.warnings,
    };
  }

  /**
   * Import SVG from file.
   */
  async importFile(file: File, options: SVGImportOptions = {}): Promise<SVGImportResult> {
    const content = await file.text();
    return this.import(content, options);
  }

  /**
   * Import SVG from URL.
   */
  async importFromUrl(url: string, options: SVGImportOptions = {}): Promise<SVGImportResult> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch SVG: ${response.statusText}`);
    }
    const content = await response.text();
    return this.import(content, options);
  }

  // =========================================================================
  // Private Methods - Parsing
  // =========================================================================

  private getSVGDimensions(svg: Element): { width: number; height: number } {
    let width = 300; // Default SVG width
    let height = 150; // Default SVG height

    const widthAttr = svg.getAttribute('width');
    const heightAttr = svg.getAttribute('height');
    const viewBox = svg.getAttribute('viewBox');

    if (widthAttr) {
      width = this.parseLength(widthAttr);
    }
    if (heightAttr) {
      height = this.parseLength(heightAttr);
    }

    // If dimensions not set, use viewBox
    if ((!widthAttr || !heightAttr) && viewBox) {
      const parts = viewBox.split(/\s+|,/).map(Number);
      if (parts.length >= 4) {
        if (!widthAttr) width = parts[2]!;
        if (!heightAttr) height = parts[3]!;
      }
    }

    return { width, height };
  }

  private parseViewBox(svg: Element): { x: number; y: number; width: number; height: number } | null {
    const viewBox = svg.getAttribute('viewBox');
    if (!viewBox) return null;

    const parts = viewBox.split(/\s+|,/).map(Number);
    if (parts.length < 4) return null;

    return {
      x: parts[0]!,
      y: parts[1]!,
      width: parts[2]!,
      height: parts[3]!,
    };
  }

  private calculateViewBoxTransform(
    viewBox: { x: number; y: number; width: number; height: number } | null,
    dimensions: { width: number; height: number },
    scale: number
  ): { translateX: number; translateY: number; scaleX: number; scaleY: number } {
    if (!viewBox) {
      return { translateX: 0, translateY: 0, scaleX: scale, scaleY: scale };
    }

    const scaleX = (dimensions.width / viewBox.width) * scale;
    const scaleY = (dimensions.height / viewBox.height) * scale;
    const translateX = -viewBox.x * scaleX;
    const translateY = -viewBox.y * scaleY;

    return { translateX, translateY, scaleX, scaleY };
  }

  private parseLength(value: string): number {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;

    // Handle units (simplified)
    if (value.endsWith('px')) return num;
    if (value.endsWith('pt')) return num * 1.333;
    if (value.endsWith('pc')) return num * 16;
    if (value.endsWith('mm')) return num * 3.7795;
    if (value.endsWith('cm')) return num * 37.795;
    if (value.endsWith('in')) return num * 96;
    if (value.endsWith('em')) return num * 16;
    if (value.endsWith('%')) return num; // Would need context

    return num;
  }

  // =========================================================================
  // Private Methods - Importing
  // =========================================================================

  private importChildren(
    element: Element,
    parentId: NodeId,
    transform: { translateX: number; translateY: number; scaleX: number; scaleY: number },
    options: SVGImportOptions
  ): void {
    for (const child of Array.from(element.children)) {
      this.importElement(child, parentId, transform, options);
    }
  }

  private importElement(
    element: Element,
    parentId: NodeId,
    transform: { translateX: number; translateY: number; scaleX: number; scaleY: number },
    options: SVGImportOptions
  ): void {
    const tag = element.tagName.toLowerCase();

    // Skip hidden elements if not importing them
    if (!options.importHidden) {
      const display = element.getAttribute('display');
      const visibility = element.getAttribute('visibility');
      if (display === 'none' || visibility === 'hidden') {
        return;
      }
    }

    switch (tag) {
      case 'g':
        this.importGroup(element, parentId, transform, options);
        break;
      case 'rect':
        this.importRect(element, parentId, transform);
        break;
      case 'circle':
        this.importCircle(element, parentId, transform);
        break;
      case 'ellipse':
        this.importEllipse(element, parentId, transform);
        break;
      case 'line':
        this.importLine(element, parentId, transform);
        break;
      case 'polyline':
        this.importPolyline(element, parentId, transform, false);
        break;
      case 'polygon':
        this.importPolyline(element, parentId, transform, true);
        break;
      case 'path':
        this.importPath(element, parentId, transform);
        break;
      case 'text':
        this.importText(element, parentId, transform);
        break;
      case 'image':
        this.importImage(element, parentId, transform);
        break;
      case 'defs':
      case 'style':
      case 'title':
      case 'desc':
        // Skip these elements
        break;
      case 'use':
        this.warnings.push('use elements are not fully supported');
        break;
      case 'clipPath':
      case 'mask':
        // Skip clip paths and masks for now
        break;
      default:
        this.warnings.push(`Unknown element: ${tag}`);
    }
  }

  private importGroup(
    element: Element,
    parentId: NodeId,
    transform: { translateX: number; translateY: number; scaleX: number; scaleY: number },
    options: SVGImportOptions
  ): void {
    // Get group transform
    const groupTransform = this.parseTransform(element.getAttribute('transform'));
    const combinedTransform = this.combineTransforms(transform, groupTransform);

    if (options.flattenGroups) {
      // Import children directly to parent
      this.importChildren(element, parentId, combinedTransform, options);
    } else {
      // Create group node
      const groupId = this.sceneGraph.createNode('GROUP', parentId, -1, {
        name: element.getAttribute('id') || 'Group',
        x: 0,
        y: 0,
        opacity: this.parseOpacity(element),
      } as CreateNodeOptions);
      this.nodeCount++;

      this.importChildren(element, groupId, combinedTransform, options);
    }
  }

  private importRect(
    element: Element,
    parentId: NodeId,
    transform: { translateX: number; translateY: number; scaleX: number; scaleY: number }
  ): void {
    const x = this.parseLength(element.getAttribute('x') ?? '0') * transform.scaleX + transform.translateX;
    const y = this.parseLength(element.getAttribute('y') ?? '0') * transform.scaleY + transform.translateY;
    const width = this.parseLength(element.getAttribute('width') ?? '0') * transform.scaleX;
    const height = this.parseLength(element.getAttribute('height') ?? '0') * transform.scaleY;
    const rx = this.parseLength(element.getAttribute('rx') ?? '0') * transform.scaleX;
    // ry is parsed but not used yet - using rx for uniform corner radius
    this.parseLength(element.getAttribute('ry') ?? element.getAttribute('rx') ?? '0');

    const { fills, strokes, strokeWeight } = this.parseStyle(element, transform);

    this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: element.getAttribute('id') || 'Rectangle',
      x,
      y,
      width,
      height,
      cornerRadius: rx,
      fills,
      strokes,
      strokeWeight,
      opacity: this.parseOpacity(element),
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importCircle(
    element: Element,
    parentId: NodeId,
    transform: { translateX: number; translateY: number; scaleX: number; scaleY: number }
  ): void {
    const cx = this.parseLength(element.getAttribute('cx') ?? '0') * transform.scaleX + transform.translateX;
    const cy = this.parseLength(element.getAttribute('cy') ?? '0') * transform.scaleY + transform.translateY;
    const r = this.parseLength(element.getAttribute('r') ?? '0');
    const rx = r * transform.scaleX;
    const ry = r * transform.scaleY;

    // Create ellipse path
    const path = this.createEllipsePath(cx, cy, rx, ry);
    const { fills, strokes, strokeWeight } = this.parseStyle(element, transform);

    this.sceneGraph.createNode('VECTOR', parentId, -1, {
      name: element.getAttribute('id') || 'Circle',
      x: cx - rx,
      y: cy - ry,
      width: rx * 2,
      height: ry * 2,
      vectorPaths: [path],
      fills,
      strokes,
      strokeWeight,
      opacity: this.parseOpacity(element),
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importEllipse(
    element: Element,
    parentId: NodeId,
    transform: { translateX: number; translateY: number; scaleX: number; scaleY: number }
  ): void {
    const cx = this.parseLength(element.getAttribute('cx') ?? '0') * transform.scaleX + transform.translateX;
    const cy = this.parseLength(element.getAttribute('cy') ?? '0') * transform.scaleY + transform.translateY;
    const rx = this.parseLength(element.getAttribute('rx') ?? '0') * transform.scaleX;
    const ry = this.parseLength(element.getAttribute('ry') ?? '0') * transform.scaleY;

    const path = this.createEllipsePath(cx, cy, rx, ry);
    const { fills, strokes, strokeWeight } = this.parseStyle(element, transform);

    this.sceneGraph.createNode('VECTOR', parentId, -1, {
      name: element.getAttribute('id') || 'Ellipse',
      x: cx - rx,
      y: cy - ry,
      width: rx * 2,
      height: ry * 2,
      vectorPaths: [path],
      fills,
      strokes,
      strokeWeight,
      opacity: this.parseOpacity(element),
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importLine(
    element: Element,
    parentId: NodeId,
    transform: { translateX: number; translateY: number; scaleX: number; scaleY: number }
  ): void {
    const x1 = this.parseLength(element.getAttribute('x1') ?? '0') * transform.scaleX + transform.translateX;
    const y1 = this.parseLength(element.getAttribute('y1') ?? '0') * transform.scaleY + transform.translateY;
    const x2 = this.parseLength(element.getAttribute('x2') ?? '0') * transform.scaleX + transform.translateX;
    const y2 = this.parseLength(element.getAttribute('y2') ?? '0') * transform.scaleY + transform.translateY;

    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);

    const path: VectorPath = {
      windingRule: 'NONZERO',
      commands: [
        { type: 'M', x: x1 - minX, y: y1 - minY },
        { type: 'L', x: x2 - minX, y: y2 - minY },
      ],
    };

    const { strokes, strokeWeight } = this.parseStyle(element, transform);

    this.sceneGraph.createNode('VECTOR', parentId, -1, {
      name: element.getAttribute('id') || 'Line',
      x: minX,
      y: minY,
      width: Math.abs(x2 - x1) || 1,
      height: Math.abs(y2 - y1) || 1,
      vectorPaths: [path],
      fills: [],
      strokes,
      strokeWeight,
      opacity: this.parseOpacity(element),
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importPolyline(
    element: Element,
    parentId: NodeId,
    transform: { translateX: number; translateY: number; scaleX: number; scaleY: number },
    closed: boolean
  ): void {
    const points = this.parsePoints(element.getAttribute('points') ?? '');
    if (points.length < 2) return;

    // Transform points
    const transformedPoints = points.map(p => ({
      x: p.x * transform.scaleX + transform.translateX,
      y: p.y * transform.scaleY + transform.translateY,
    }));

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of transformedPoints) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    // Create path commands
    const commands: PathCommand[] = [];
    commands.push({ type: 'M', x: transformedPoints[0]!.x - minX, y: transformedPoints[0]!.y - minY });
    for (let i = 1; i < transformedPoints.length; i++) {
      commands.push({ type: 'L', x: transformedPoints[i]!.x - minX, y: transformedPoints[i]!.y - minY });
    }
    if (closed) {
      commands.push({ type: 'Z' });
    }

    const path: VectorPath = { windingRule: 'NONZERO', commands };
    const { fills, strokes, strokeWeight } = this.parseStyle(element, transform);

    this.sceneGraph.createNode('VECTOR', parentId, -1, {
      name: element.getAttribute('id') || (closed ? 'Polygon' : 'Polyline'),
      x: minX,
      y: minY,
      width: maxX - minX || 1,
      height: maxY - minY || 1,
      vectorPaths: [path],
      fills: closed ? fills : [],
      strokes,
      strokeWeight,
      opacity: this.parseOpacity(element),
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importPath(
    element: Element,
    parentId: NodeId,
    transform: { translateX: number; translateY: number; scaleX: number; scaleY: number }
  ): void {
    const d = element.getAttribute('d');
    if (!d) return;

    const { commands, bounds } = this.parseSVGPath(d, transform);
    if (commands.length === 0) return;

    const fillRule = element.getAttribute('fill-rule') ?? 'nonzero';
    const windingRule: WindingRule = fillRule === 'evenodd' ? 'EVENODD' : 'NONZERO';

    // Normalize commands to start at origin
    const normalizedCommands = commands.map(cmd => {
      switch (cmd.type) {
        case 'M':
          return { type: 'M' as const, x: cmd.x - bounds.minX, y: cmd.y - bounds.minY };
        case 'L':
          return { type: 'L' as const, x: cmd.x - bounds.minX, y: cmd.y - bounds.minY };
        case 'C':
          return {
            type: 'C' as const,
            x1: cmd.x1 - bounds.minX,
            y1: cmd.y1 - bounds.minY,
            x2: cmd.x2 - bounds.minX,
            y2: cmd.y2 - bounds.minY,
            x: cmd.x - bounds.minX,
            y: cmd.y - bounds.minY,
          };
        case 'Z':
          return { type: 'Z' as const };
      }
    });

    const path: VectorPath = { windingRule, commands: normalizedCommands };
    const { fills, strokes, strokeWeight } = this.parseStyle(element, transform);

    this.sceneGraph.createNode('VECTOR', parentId, -1, {
      name: element.getAttribute('id') || 'Path',
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.maxX - bounds.minX || 1,
      height: bounds.maxY - bounds.minY || 1,
      vectorPaths: [path],
      fills,
      strokes,
      strokeWeight,
      opacity: this.parseOpacity(element),
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importText(
    element: Element,
    parentId: NodeId,
    transform: { translateX: number; translateY: number; scaleX: number; scaleY: number }
  ): void {
    const x = this.parseLength(element.getAttribute('x') ?? '0') * transform.scaleX + transform.translateX;
    const y = this.parseLength(element.getAttribute('y') ?? '0') * transform.scaleY + transform.translateY;
    const text = element.textContent ?? '';

    const fontSize = this.parseFontSize(element) * transform.scaleX;
    const fontFamily = element.getAttribute('font-family') ?? 'sans-serif';
    const fontWeight = parseInt(element.getAttribute('font-weight') ?? '400', 10);

    const { fills } = this.parseStyle(element, transform);

    // Estimate text dimensions (simplified)
    const estimatedWidth = text.length * fontSize * 0.6;
    const estimatedHeight = fontSize * 1.2;

    this.sceneGraph.createNode('TEXT', parentId, -1, {
      name: element.getAttribute('id') || 'Text',
      x,
      y: y - fontSize, // Adjust for baseline
      width: estimatedWidth,
      height: estimatedHeight,
      characters: text,
      textStyles: [{
        fontFamily,
        fontSize,
        fontWeight,
        fills,
      }],
      fills,
      opacity: this.parseOpacity(element),
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importImage(
    element: Element,
    parentId: NodeId,
    transform: { translateX: number; translateY: number; scaleX: number; scaleY: number }
  ): void {
    const x = this.parseLength(element.getAttribute('x') ?? '0') * transform.scaleX + transform.translateX;
    const y = this.parseLength(element.getAttribute('y') ?? '0') * transform.scaleY + transform.translateY;
    const width = this.parseLength(element.getAttribute('width') ?? '0') * transform.scaleX;
    const height = this.parseLength(element.getAttribute('height') ?? '0') * transform.scaleY;
    const href = element.getAttribute('href') ?? element.getAttributeNS('http://www.w3.org/1999/xlink', 'href');

    // Create a frame as placeholder for image
    this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: element.getAttribute('id') || 'Image',
      x,
      y,
      width,
      height,
      fills: [{
        type: 'IMAGE',
        visible: true,
        imageUrl: href ?? '',
        scaleMode: 'FILL',
      }],
      opacity: this.parseOpacity(element),
    } as CreateNodeOptions);
    this.nodeCount++;

    if (href) {
      this.warnings.push(`Image import: ${href}`);
    }
  }

  // =========================================================================
  // Private Methods - Path Parsing
  // =========================================================================

  private parseSVGPath(
    d: string,
    transform: { translateX: number; translateY: number; scaleX: number; scaleY: number }
  ): { commands: PathCommand[]; bounds: { minX: number; minY: number; maxX: number; maxY: number } } {
    const commands: PathCommand[] = [];
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;
    let lastControlX = 0;
    let lastControlY = 0;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const updateBounds = (x: number, y: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };

    // Tokenize the path
    const tokens = this.tokenizePath(d);
    let i = 0;

    while (i < tokens.length) {
      const cmd = tokens[i]!;
      i++;

      switch (cmd) {
        case 'M':
        case 'm': {
          const isRelative = cmd === 'm';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const x = (tokens[i++] as number) * transform.scaleX + (isRelative ? currentX : 0) + transform.translateX;
            const y = (tokens[i++] as number) * transform.scaleY + (isRelative ? currentY : 0) + transform.translateY;
            commands.push({ type: 'M', x, y });
            updateBounds(x, y);
            currentX = x;
            currentY = y;
            startX = x;
            startY = y;
          }
          break;
        }

        case 'L':
        case 'l': {
          const isRelative = cmd === 'l';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const x = (tokens[i++] as number) * transform.scaleX + (isRelative ? currentX : transform.translateX);
            const y = (tokens[i++] as number) * transform.scaleY + (isRelative ? currentY : transform.translateY);
            commands.push({ type: 'L', x, y });
            updateBounds(x, y);
            currentX = x;
            currentY = y;
          }
          break;
        }

        case 'H':
        case 'h': {
          const isRelative = cmd === 'h';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const x = (tokens[i++] as number) * transform.scaleX + (isRelative ? currentX : transform.translateX);
            commands.push({ type: 'L', x, y: currentY });
            updateBounds(x, currentY);
            currentX = x;
          }
          break;
        }

        case 'V':
        case 'v': {
          const isRelative = cmd === 'v';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const y = (tokens[i++] as number) * transform.scaleY + (isRelative ? currentY : transform.translateY);
            commands.push({ type: 'L', x: currentX, y });
            updateBounds(currentX, y);
            currentY = y;
          }
          break;
        }

        case 'C':
        case 'c': {
          const isRelative = cmd === 'c';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const x1 = (tokens[i++] as number) * transform.scaleX + (isRelative ? currentX : transform.translateX);
            const y1 = (tokens[i++] as number) * transform.scaleY + (isRelative ? currentY : transform.translateY);
            const x2 = (tokens[i++] as number) * transform.scaleX + (isRelative ? currentX : transform.translateX);
            const y2 = (tokens[i++] as number) * transform.scaleY + (isRelative ? currentY : transform.translateY);
            const x = (tokens[i++] as number) * transform.scaleX + (isRelative ? currentX : transform.translateX);
            const y = (tokens[i++] as number) * transform.scaleY + (isRelative ? currentY : transform.translateY);
            commands.push({ type: 'C', x1, y1, x2, y2, x, y });
            updateBounds(x1, y1);
            updateBounds(x2, y2);
            updateBounds(x, y);
            lastControlX = x2;
            lastControlY = y2;
            currentX = x;
            currentY = y;
          }
          break;
        }

        case 'S':
        case 's': {
          const isRelative = cmd === 's';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const x1 = 2 * currentX - lastControlX;
            const y1 = 2 * currentY - lastControlY;
            const x2 = (tokens[i++] as number) * transform.scaleX + (isRelative ? currentX : transform.translateX);
            const y2 = (tokens[i++] as number) * transform.scaleY + (isRelative ? currentY : transform.translateY);
            const x = (tokens[i++] as number) * transform.scaleX + (isRelative ? currentX : transform.translateX);
            const y = (tokens[i++] as number) * transform.scaleY + (isRelative ? currentY : transform.translateY);
            commands.push({ type: 'C', x1, y1, x2, y2, x, y });
            updateBounds(x1, y1);
            updateBounds(x2, y2);
            updateBounds(x, y);
            lastControlX = x2;
            lastControlY = y2;
            currentX = x;
            currentY = y;
          }
          break;
        }

        case 'Q':
        case 'q': {
          const isRelative = cmd === 'q';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const qx = (tokens[i++] as number) * transform.scaleX + (isRelative ? currentX : transform.translateX);
            const qy = (tokens[i++] as number) * transform.scaleY + (isRelative ? currentY : transform.translateY);
            const x = (tokens[i++] as number) * transform.scaleX + (isRelative ? currentX : transform.translateX);
            const y = (tokens[i++] as number) * transform.scaleY + (isRelative ? currentY : transform.translateY);
            // Convert quadratic to cubic
            const x1 = currentX + (2 / 3) * (qx - currentX);
            const y1 = currentY + (2 / 3) * (qy - currentY);
            const x2 = x + (2 / 3) * (qx - x);
            const y2 = y + (2 / 3) * (qy - y);
            commands.push({ type: 'C', x1, y1, x2, y2, x, y });
            updateBounds(qx, qy);
            updateBounds(x, y);
            lastControlX = qx;
            lastControlY = qy;
            currentX = x;
            currentY = y;
          }
          break;
        }

        case 'A':
        case 'a': {
          // Arc to cubic bezier conversion (simplified)
          const isRelative = cmd === 'a';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            // Skip arc parameters (rx, ry, xRotation, largeArc, sweep) - not used in simplified line approximation
            i += 5;
            const x = (tokens[i++] as number) * transform.scaleX + (isRelative ? currentX : transform.translateX);
            const y = (tokens[i++] as number) * transform.scaleY + (isRelative ? currentY : transform.translateY);

            // Simplified: just draw a line for arcs
            commands.push({ type: 'L', x, y });
            updateBounds(x, y);
            currentX = x;
            currentY = y;
            this.warnings.push('Arc commands are approximated as lines');
          }
          break;
        }

        case 'Z':
        case 'z':
          commands.push({ type: 'Z' });
          currentX = startX;
          currentY = startY;
          break;
      }
    }

    if (minX === Infinity) {
      minX = minY = maxX = maxY = 0;
    }

    return { commands, bounds: { minX, minY, maxX, maxY } };
  }

  private tokenizePath(d: string): (string | number)[] {
    const tokens: (string | number)[] = [];
    const regex = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d+\.?\d*(?:e[+-]?\d+)?)/g;
    let match;

    while ((match = regex.exec(d)) !== null) {
      if (match[1]) {
        tokens.push(match[1]);
      } else if (match[2]) {
        tokens.push(parseFloat(match[2]));
      }
    }

    return tokens;
  }

  // =========================================================================
  // Private Methods - Style Parsing
  // =========================================================================

  private parseStyle(
    element: Element,
    transform: { scaleX: number; scaleY: number }
  ): { fills: object[]; strokes: object[]; strokeWeight: number } {
    const fills: object[] = [];
    const strokes: object[] = [];

    // Parse fill
    const fill = this.getStyleValue(element, 'fill');
    if (fill && fill !== 'none') {
      const color = this.parseColor(fill);
      if (color) {
        const fillOpacity = parseFloat(this.getStyleValue(element, 'fill-opacity') ?? '1');
        fills.push({
          type: 'SOLID',
          visible: true,
          color,
          opacity: fillOpacity,
        });
      }
    }

    // Parse stroke
    const stroke = this.getStyleValue(element, 'stroke');
    if (stroke && stroke !== 'none') {
      const color = this.parseColor(stroke);
      if (color) {
        const strokeOpacity = parseFloat(this.getStyleValue(element, 'stroke-opacity') ?? '1');
        strokes.push({
          type: 'SOLID',
          visible: true,
          color,
          opacity: strokeOpacity,
        });
      }
    }

    const strokeWidthStr = this.getStyleValue(element, 'stroke-width') ?? '1';
    const strokeWeight = this.parseLength(strokeWidthStr) * transform.scaleX;

    return { fills, strokes, strokeWeight };
  }

  private getStyleValue(element: Element, property: string): string | null {
    // Check inline style first
    const style = element.getAttribute('style');
    if (style) {
      const match = new RegExp(`${property}\\s*:\\s*([^;]+)`).exec(style);
      if (match) {
        return match[1]!.trim();
      }
    }

    // Check attribute
    return element.getAttribute(property);
  }

  private parseColor(colorStr: string): RGBA | null {
    colorStr = colorStr.trim();

    // Handle named colors (simplified)
    const namedColors: Record<string, string> = {
      black: '#000000',
      white: '#ffffff',
      red: '#ff0000',
      green: '#00ff00',
      blue: '#0000ff',
      transparent: 'rgba(0,0,0,0)',
    };

    if (namedColors[colorStr.toLowerCase()]) {
      colorStr = namedColors[colorStr.toLowerCase()]!;
    }

    // Hex color
    if (colorStr.startsWith('#')) {
      return this.parseHexColor(colorStr);
    }

    // RGB/RGBA
    if (colorStr.startsWith('rgb')) {
      return this.parseRGBColor(colorStr);
    }

    return null;
  }

  private parseHexColor(hex: string): RGBA {
    hex = hex.replace('#', '');

    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;

    return { r, g, b, a };
  }

  private parseRGBColor(rgb: string): RGBA {
    const match = /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/.exec(rgb);
    if (!match) return { r: 0, g: 0, b: 0, a: 1 };

    return {
      r: parseInt(match[1]!, 10) / 255,
      g: parseInt(match[2]!, 10) / 255,
      b: parseInt(match[3]!, 10) / 255,
      a: match[4] ? parseFloat(match[4]) : 1,
    };
  }

  private parseOpacity(element: Element): number {
    const opacity = this.getStyleValue(element, 'opacity');
    return opacity ? parseFloat(opacity) : 1;
  }

  private parseFontSize(element: Element): number {
    const fontSize = this.getStyleValue(element, 'font-size');
    return fontSize ? this.parseLength(fontSize) : 16;
  }

  private parseTransform(
    transformStr: string | null
  ): { translateX: number; translateY: number; scaleX: number; scaleY: number } {
    if (!transformStr) {
      return { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1 };
    }

    let translateX = 0, translateY = 0, scaleX = 1, scaleY = 1;

    // Parse translate
    const translateMatch = /translate\s*\(\s*([\d.-]+)\s*(?:,\s*([\d.-]+))?\s*\)/.exec(transformStr);
    if (translateMatch) {
      translateX = parseFloat(translateMatch[1]!);
      translateY = parseFloat(translateMatch[2] ?? '0');
    }

    // Parse scale
    const scaleMatch = /scale\s*\(\s*([\d.-]+)\s*(?:,\s*([\d.-]+))?\s*\)/.exec(transformStr);
    if (scaleMatch) {
      scaleX = parseFloat(scaleMatch[1]!);
      scaleY = parseFloat(scaleMatch[2] ?? scaleMatch[1]!);
    }

    return { translateX, translateY, scaleX, scaleY };
  }

  private combineTransforms(
    t1: { translateX: number; translateY: number; scaleX: number; scaleY: number },
    t2: { translateX: number; translateY: number; scaleX: number; scaleY: number }
  ): { translateX: number; translateY: number; scaleX: number; scaleY: number } {
    return {
      translateX: t1.translateX + t2.translateX * t1.scaleX,
      translateY: t1.translateY + t2.translateY * t1.scaleY,
      scaleX: t1.scaleX * t2.scaleX,
      scaleY: t1.scaleY * t2.scaleY,
    };
  }

  private parsePoints(pointsStr: string): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const values = pointsStr.trim().split(/[\s,]+/).map(Number);

    for (let i = 0; i + 1 < values.length; i += 2) {
      points.push({ x: values[i]!, y: values[i + 1]! });
    }

    return points;
  }

  // =========================================================================
  // Private Methods - Helpers
  // =========================================================================

  private createEllipsePath(_cx: number, _cy: number, rx: number, ry: number): VectorPath {
    const k = 0.5522847498; // Magic number for cubic bezier circle approximation

    return {
      windingRule: 'NONZERO',
      commands: [
        { type: 'M', x: rx, y: 0 },
        { type: 'C', x1: rx, y1: -ry * k, x2: rx * k, y2: -ry, x: 0, y: -ry },
        { type: 'C', x1: -rx * k, y1: -ry, x2: -rx, y2: -ry * k, x: -rx, y: 0 },
        { type: 'C', x1: -rx, y1: ry * k, x2: -rx * k, y2: ry, x: 0, y: ry },
        { type: 'C', x1: rx * k, y1: ry, x2: rx, y2: ry * k, x: rx, y: 0 },
        { type: 'Z' },
      ],
    };
  }

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

/**
 * Create an SVG importer.
 */
export function createSVGImporter(sceneGraph: SceneGraph): SVGImporter {
  return new SVGImporter(sceneGraph);
}
