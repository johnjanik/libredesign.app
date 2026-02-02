/**
 * SVG CAD Importer
 *
 * Enhanced SVG importer with proper arc support and CAD-specific features.
 * Extends base SVG importer with:
 * - Proper SVG arc to bezier conversion
 * - Gradient support
 * - More complete transform support
 * - Better text handling
 */

import type { NodeId } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { VectorPath, PathCommand, WindingRule } from '@core/types/geometry';
import type { Paint } from '@core/types/paint';
import type { SceneGraph, CreateNodeOptions } from '@scene/graph/scene-graph';

/**
 * SVG CAD import options
 */
export interface SVGCADImportOptions {
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
  /** Units (for CAD dimension interpretation) */
  units?: 'px' | 'mm' | 'in' | 'pt' | undefined;
  /** Arc segments for arc-to-bezier conversion (default: 4) */
  arcSegments?: number | undefined;
  /** Import markers (arrow heads, etc.) */
  importMarkers?: boolean | undefined;
}

/**
 * SVG CAD import result
 */
export interface SVGCADImportResult {
  /** Root node ID of imported content */
  readonly rootId: NodeId;
  /** Number of nodes created */
  readonly nodeCount: number;
  /** Original SVG dimensions */
  readonly dimensions: { width: number; height: number };
  /** Warnings during import */
  readonly warnings: readonly string[];
  /** Extracted gradients */
  readonly gradients: Map<string, GradientDef>;
  /** Extracted patterns */
  readonly patterns: Map<string, PatternDef>;
}

/**
 * Gradient definition
 */
export interface GradientDef {
  type: 'linear' | 'radial';
  stops: Array<{ offset: number; color: RGBA }>;
  // Linear gradient specific
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // Radial gradient specific
  cx?: number;
  cy?: number;
  r?: number;
  fx?: number;
  fy?: number;
}

/**
 * Pattern definition
 */
export interface PatternDef {
  id: string;
  width: number;
  height: number;
  viewBox?: { x: number; y: number; width: number; height: number };
  // Content is stored as paths for now
  content: VectorPath[];
}

/**
 * Transform matrix
 */
interface TransformMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/**
 * Resolved options with defaults applied
 */
interface ResolvedOptions {
  parentId: NodeId | undefined;
  flattenGroups: boolean;
  strokesAsOutlines: boolean;
  preserveViewBox: boolean;
  importHidden: boolean;
  scale: number;
  units: 'px' | 'mm' | 'in' | 'pt';
  arcSegments: number;
  importMarkers: boolean;
}

/**
 * SVG CAD Importer with enhanced arc and transform support
 */
export class SVGCADImporter {
  private sceneGraph: SceneGraph;
  private warnings: string[] = [];
  private nodeCount = 0;
  private gradients = new Map<string, GradientDef>();
  private patterns = new Map<string, PatternDef>();
  private options!: ResolvedOptions;

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  /**
   * Import SVG from string.
   */
  import(svgContent: string, options: SVGCADImportOptions = {}): SVGCADImportResult {
    this.warnings = [];
    this.nodeCount = 0;
    this.gradients.clear();
    this.patterns.clear();

    this.options = {
      parentId: options.parentId,
      flattenGroups: options.flattenGroups ?? false,
      strokesAsOutlines: options.strokesAsOutlines ?? false,
      preserveViewBox: options.preserveViewBox ?? true,
      importHidden: options.importHidden ?? false,
      scale: options.scale ?? 1,
      units: options.units ?? 'px',
      arcSegments: options.arcSegments ?? 4,
      importMarkers: options.importMarkers ?? true,
    };

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

    // Extract defs (gradients, patterns, etc.)
    this.extractDefs(svgElement);

    // Get dimensions
    const dimensions = this.getSVGDimensions(svgElement);

    // Get or create parent
    const parentId = options.parentId ?? this.getDefaultParent();

    // Create a group for the imported content
    const groupId = this.sceneGraph.createNode('GROUP', parentId, -1, {
      name: 'Imported SVG',
      x: 0,
      y: 0,
      width: dimensions.width * this.options.scale,
      height: dimensions.height * this.options.scale,
    } as CreateNodeOptions);
    this.nodeCount++;

    // Get viewBox transform
    const viewBox = this.parseViewBox(svgElement);
    const matrix = this.calculateViewBoxMatrix(viewBox, dimensions, this.options.scale);

    // Import all children
    this.importChildren(svgElement, groupId, matrix);

    return {
      rootId: groupId,
      nodeCount: this.nodeCount,
      dimensions,
      warnings: this.warnings,
      gradients: this.gradients,
      patterns: this.patterns,
    };
  }

  /**
   * Import SVG from file.
   */
  async importFile(file: File, options: SVGCADImportOptions = {}): Promise<SVGCADImportResult> {
    const content = await file.text();
    return this.import(content, options);
  }

  // =========================================================================
  // Defs Extraction
  // =========================================================================

  private extractDefs(svg: Element): void {
    const defs = svg.querySelector('defs');
    if (!defs) return;

    // Extract linear gradients
    for (const lg of Array.from(defs.querySelectorAll('linearGradient'))) {
      const id = lg.getAttribute('id');
      if (!id) continue;

      const gradient: GradientDef = {
        type: 'linear',
        x1: parseFloat(lg.getAttribute('x1') ?? '0'),
        y1: parseFloat(lg.getAttribute('y1') ?? '0'),
        x2: parseFloat(lg.getAttribute('x2') ?? '1'),
        y2: parseFloat(lg.getAttribute('y2') ?? '0'),
        stops: [],
      };

      for (const stop of Array.from(lg.querySelectorAll('stop'))) {
        const offset = parseFloat(stop.getAttribute('offset') ?? '0');
        const color = this.parseColor(
          stop.getAttribute('stop-color') ?? '#000000'
        ) ?? { r: 0, g: 0, b: 0, a: 1 };
        const opacity = parseFloat(stop.getAttribute('stop-opacity') ?? '1');
        gradient.stops.push({ offset, color: { ...color, a: color.a * opacity } });
      }

      this.gradients.set(id, gradient);
    }

    // Extract radial gradients
    for (const rg of Array.from(defs.querySelectorAll('radialGradient'))) {
      const id = rg.getAttribute('id');
      if (!id) continue;

      const gradient: GradientDef = {
        type: 'radial',
        cx: parseFloat(rg.getAttribute('cx') ?? '0.5'),
        cy: parseFloat(rg.getAttribute('cy') ?? '0.5'),
        r: parseFloat(rg.getAttribute('r') ?? '0.5'),
        fx: parseFloat(rg.getAttribute('fx') ?? rg.getAttribute('cx') ?? '0.5'),
        fy: parseFloat(rg.getAttribute('fy') ?? rg.getAttribute('cy') ?? '0.5'),
        stops: [],
      };

      for (const stop of Array.from(rg.querySelectorAll('stop'))) {
        const offset = parseFloat(stop.getAttribute('offset') ?? '0');
        const color = this.parseColor(
          stop.getAttribute('stop-color') ?? '#000000'
        ) ?? { r: 0, g: 0, b: 0, a: 1 };
        const opacity = parseFloat(stop.getAttribute('stop-opacity') ?? '1');
        gradient.stops.push({ offset, color: { ...color, a: color.a * opacity } });
      }

      this.gradients.set(id, gradient);
    }
  }

  // =========================================================================
  // Dimension Parsing
  // =========================================================================

  private getSVGDimensions(svg: Element): { width: number; height: number } {
    let width = 300;
    let height = 150;

    const widthAttr = svg.getAttribute('width');
    const heightAttr = svg.getAttribute('height');
    const viewBox = svg.getAttribute('viewBox');

    if (widthAttr) width = this.parseLength(widthAttr);
    if (heightAttr) height = this.parseLength(heightAttr);

    if ((!widthAttr || !heightAttr) && viewBox) {
      const parts = viewBox.split(/\s+|,/).map(Number);
      if (parts.length >= 4 && parts[2] !== undefined && parts[3] !== undefined) {
        if (!widthAttr) width = parts[2];
        if (!heightAttr) height = parts[3];
      }
    }

    return { width, height };
  }

  private parseViewBox(svg: Element): { x: number; y: number; width: number; height: number } | null {
    const viewBox = svg.getAttribute('viewBox');
    if (!viewBox) return null;

    const parts = viewBox.split(/\s+|,/).map(Number);
    if (parts.length < 4) return null;

    const x = parts[0];
    const y = parts[1];
    const w = parts[2];
    const h = parts[3];
    if (x === undefined || y === undefined || w === undefined || h === undefined) return null;

    return { x, y, width: w, height: h };
  }

  private calculateViewBoxMatrix(
    viewBox: { x: number; y: number; width: number; height: number } | null,
    dimensions: { width: number; height: number },
    scale: number
  ): TransformMatrix {
    if (!viewBox) {
      return this.scaleMatrix(scale, scale);
    }

    const scaleX = (dimensions.width / viewBox.width) * scale;
    const scaleY = (dimensions.height / viewBox.height) * scale;

    return this.multiplyMatrix(
      this.translateMatrix(-viewBox.x, -viewBox.y),
      this.scaleMatrix(scaleX, scaleY)
    );
  }

  private parseLength(value: string): number {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;

    // Convert to pixels based on units
    if (value.endsWith('px')) return num;
    if (value.endsWith('pt')) return num * 1.333;
    if (value.endsWith('pc')) return num * 16;
    if (value.endsWith('mm')) return num * 3.7795;
    if (value.endsWith('cm')) return num * 37.795;
    if (value.endsWith('in')) return num * 96;
    if (value.endsWith('em')) return num * 16;
    if (value.endsWith('%')) return num; // Context-dependent

    return num;
  }

  // =========================================================================
  // Import Logic
  // =========================================================================

  private importChildren(element: Element, parentId: NodeId, matrix: TransformMatrix): void {
    for (const child of Array.from(element.children)) {
      this.importElement(child, parentId, matrix);
    }
  }

  private importElement(element: Element, parentId: NodeId, matrix: TransformMatrix): void {
    const tag = element.tagName.toLowerCase();

    // Skip hidden elements
    if (!this.options.importHidden) {
      const display = element.getAttribute('display');
      const visibility = element.getAttribute('visibility');
      if (display === 'none' || visibility === 'hidden') return;
    }

    // Apply element's transform
    const elementMatrix = this.parseTransformAttribute(element.getAttribute('transform'));
    const combinedMatrix = this.multiplyMatrix(matrix, elementMatrix);

    switch (tag) {
      case 'g':
        this.importGroup(element, parentId, combinedMatrix);
        break;
      case 'rect':
        this.importRect(element, parentId, combinedMatrix);
        break;
      case 'circle':
        this.importCircle(element, parentId, combinedMatrix);
        break;
      case 'ellipse':
        this.importEllipse(element, parentId, combinedMatrix);
        break;
      case 'line':
        this.importLine(element, parentId, combinedMatrix);
        break;
      case 'polyline':
        this.importPolyline(element, parentId, combinedMatrix, false);
        break;
      case 'polygon':
        this.importPolyline(element, parentId, combinedMatrix, true);
        break;
      case 'path':
        this.importPath(element, parentId, combinedMatrix);
        break;
      case 'text':
        this.importText(element, parentId, combinedMatrix);
        break;
      case 'image':
        this.importImage(element, parentId, combinedMatrix);
        break;
      case 'use':
        this.warnings.push('use elements are not fully supported');
        break;
      case 'defs':
      case 'style':
      case 'title':
      case 'desc':
      case 'clipPath':
      case 'mask':
      case 'marker':
        // Skip these
        break;
      default:
        this.warnings.push(`Unknown element: ${tag}`);
    }
  }

  private importGroup(element: Element, parentId: NodeId, matrix: TransformMatrix): void {
    if (this.options.flattenGroups) {
      this.importChildren(element, parentId, matrix);
    } else {
      const groupId = this.sceneGraph.createNode('GROUP', parentId, -1, {
        name: element.getAttribute('id') || 'Group',
        x: 0,
        y: 0,
        opacity: this.parseOpacity(element),
      } as CreateNodeOptions);
      this.nodeCount++;
      this.importChildren(element, groupId, matrix);
    }
  }

  private importRect(element: Element, parentId: NodeId, matrix: TransformMatrix): void {
    const x = this.parseLength(element.getAttribute('x') ?? '0');
    const y = this.parseLength(element.getAttribute('y') ?? '0');
    const width = this.parseLength(element.getAttribute('width') ?? '0');
    const height = this.parseLength(element.getAttribute('height') ?? '0');
    const rx = this.parseLength(element.getAttribute('rx') ?? '0');

    // Transform corners
    const corners = [
      this.transformPoint(x, y, matrix),
      this.transformPoint(x + width, y, matrix),
      this.transformPoint(x + width, y + height, matrix),
      this.transformPoint(x, y + height, matrix),
    ];

    const bounds = this.getBounds(corners);
    const { fills, strokes, strokeWeight } = this.parseStyle(element, matrix);

    this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: element.getAttribute('id') || 'Rectangle',
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
      cornerRadius: rx * Math.abs(matrix.a),
      fills,
      strokes,
      strokeWeight,
      opacity: this.parseOpacity(element),
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importCircle(element: Element, parentId: NodeId, matrix: TransformMatrix): void {
    const cx = this.parseLength(element.getAttribute('cx') ?? '0');
    const cy = this.parseLength(element.getAttribute('cy') ?? '0');
    const r = this.parseLength(element.getAttribute('r') ?? '0');

    const center = this.transformPoint(cx, cy, matrix);
    const rx = r * Math.abs(matrix.a);
    const ry = r * Math.abs(matrix.d);

    const path = this.createEllipsePath(rx, ry);
    const { fills, strokes, strokeWeight } = this.parseStyle(element, matrix);

    this.sceneGraph.createNode('VECTOR', parentId, -1, {
      name: element.getAttribute('id') || 'Circle',
      x: center.x - rx,
      y: center.y - ry,
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

  private importEllipse(element: Element, parentId: NodeId, matrix: TransformMatrix): void {
    const cx = this.parseLength(element.getAttribute('cx') ?? '0');
    const cy = this.parseLength(element.getAttribute('cy') ?? '0');
    const rx = this.parseLength(element.getAttribute('rx') ?? '0');
    const ry = this.parseLength(element.getAttribute('ry') ?? '0');

    const center = this.transformPoint(cx, cy, matrix);
    const scaledRx = rx * Math.abs(matrix.a);
    const scaledRy = ry * Math.abs(matrix.d);

    const path = this.createEllipsePath(scaledRx, scaledRy);
    const { fills, strokes, strokeWeight } = this.parseStyle(element, matrix);

    this.sceneGraph.createNode('VECTOR', parentId, -1, {
      name: element.getAttribute('id') || 'Ellipse',
      x: center.x - scaledRx,
      y: center.y - scaledRy,
      width: scaledRx * 2,
      height: scaledRy * 2,
      vectorPaths: [path],
      fills,
      strokes,
      strokeWeight,
      opacity: this.parseOpacity(element),
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importLine(element: Element, parentId: NodeId, matrix: TransformMatrix): void {
    const x1 = this.parseLength(element.getAttribute('x1') ?? '0');
    const y1 = this.parseLength(element.getAttribute('y1') ?? '0');
    const x2 = this.parseLength(element.getAttribute('x2') ?? '0');
    const y2 = this.parseLength(element.getAttribute('y2') ?? '0');

    const p1 = this.transformPoint(x1, y1, matrix);
    const p2 = this.transformPoint(x2, y2, matrix);

    const minX = Math.min(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);

    const path: VectorPath = {
      windingRule: 'NONZERO',
      commands: [
        { type: 'M', x: p1.x - minX, y: p1.y - minY },
        { type: 'L', x: p2.x - minX, y: p2.y - minY },
      ],
    };

    const { strokes, strokeWeight } = this.parseStyle(element, matrix);

    this.sceneGraph.createNode('VECTOR', parentId, -1, {
      name: element.getAttribute('id') || 'Line',
      x: minX,
      y: minY,
      width: Math.abs(p2.x - p1.x) || 1,
      height: Math.abs(p2.y - p1.y) || 1,
      vectorPaths: [path],
      fills: [],
      strokes,
      strokeWeight,
      opacity: this.parseOpacity(element),
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importPolyline(element: Element, parentId: NodeId, matrix: TransformMatrix, closed: boolean): void {
    const points = this.parsePoints(element.getAttribute('points') ?? '');
    if (points.length < 2) return;

    const transformedPoints = points.map(p => this.transformPoint(p.x, p.y, matrix));
    const bounds = this.getBounds(transformedPoints);

    const commands: PathCommand[] = [];
    const first = transformedPoints[0];
    if (first) {
      commands.push({ type: 'M', x: first.x - bounds.minX, y: first.y - bounds.minY });
    }
    for (let i = 1; i < transformedPoints.length; i++) {
      const pt = transformedPoints[i];
      if (pt) {
        commands.push({ type: 'L', x: pt.x - bounds.minX, y: pt.y - bounds.minY });
      }
    }
    if (closed) commands.push({ type: 'Z' });

    const path: VectorPath = { windingRule: 'NONZERO', commands };
    const { fills, strokes, strokeWeight } = this.parseStyle(element, matrix);

    this.sceneGraph.createNode('VECTOR', parentId, -1, {
      name: element.getAttribute('id') || (closed ? 'Polygon' : 'Polyline'),
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.maxX - bounds.minX || 1,
      height: bounds.maxY - bounds.minY || 1,
      vectorPaths: [path],
      fills: closed ? fills : [],
      strokes,
      strokeWeight,
      opacity: this.parseOpacity(element),
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importPath(element: Element, parentId: NodeId, matrix: TransformMatrix): void {
    const d = element.getAttribute('d');
    if (!d) return;

    const { commands, bounds } = this.parseSVGPath(d, matrix);
    if (commands.length === 0) return;

    const fillRule = element.getAttribute('fill-rule') ?? 'nonzero';
    const windingRule: WindingRule = fillRule === 'evenodd' ? 'EVENODD' : 'NONZERO';

    // Normalize commands
    const normalizedCommands = this.normalizeCommands(commands, bounds.minX, bounds.minY);

    const path: VectorPath = { windingRule, commands: normalizedCommands };
    const { fills, strokes, strokeWeight } = this.parseStyle(element, matrix);

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

  private importText(element: Element, parentId: NodeId, matrix: TransformMatrix): void {
    const x = this.parseLength(element.getAttribute('x') ?? '0');
    const y = this.parseLength(element.getAttribute('y') ?? '0');
    const text = element.textContent ?? '';

    const pos = this.transformPoint(x, y, matrix);
    const fontSize = this.parseFontSize(element) * Math.abs(matrix.a);
    const fontFamily = element.getAttribute('font-family') ?? 'sans-serif';
    const fontWeight = parseInt(element.getAttribute('font-weight') ?? '400', 10);

    const { fills } = this.parseStyle(element, matrix);

    const estimatedWidth = text.length * fontSize * 0.6;
    const estimatedHeight = fontSize * 1.2;

    this.sceneGraph.createNode('TEXT', parentId, -1, {
      name: element.getAttribute('id') || 'Text',
      x: pos.x,
      y: pos.y - fontSize,
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

  private importImage(element: Element, parentId: NodeId, matrix: TransformMatrix): void {
    const x = this.parseLength(element.getAttribute('x') ?? '0');
    const y = this.parseLength(element.getAttribute('y') ?? '0');
    const width = this.parseLength(element.getAttribute('width') ?? '0');
    const height = this.parseLength(element.getAttribute('height') ?? '0');
    const href = element.getAttribute('href') ?? element.getAttributeNS('http://www.w3.org/1999/xlink', 'href');

    const pos = this.transformPoint(x, y, matrix);
    const scaledWidth = width * Math.abs(matrix.a);
    const scaledHeight = height * Math.abs(matrix.d);

    this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: element.getAttribute('id') || 'Image',
      x: pos.x,
      y: pos.y,
      width: scaledWidth,
      height: scaledHeight,
      fills: [{
        type: 'IMAGE',
        visible: true,
        opacity: 1,
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
  // Path Parsing with Proper Arc Support
  // =========================================================================

  private parseSVGPath(
    d: string,
    matrix: TransformMatrix
  ): { commands: PathCommand[]; bounds: { minX: number; minY: number; maxX: number; maxY: number } } {
    const commands: PathCommand[] = [];
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;
    let lastControlX = 0;
    let lastControlY = 0;
    let lastQControlX = 0;
    let lastQControlY = 0;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const updateBounds = (x: number, y: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };

    const tokens = this.tokenizePath(d);
    let i = 0;

    while (i < tokens.length) {
      const cmd = tokens[i];
      if (typeof cmd !== 'string') break;
      i++;

      switch (cmd) {
        case 'M':
        case 'm': {
          const isRelative = cmd === 'm';
          let first = true;
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const rawX = tokens[i++] as number;
            const rawY = tokens[i++] as number;
            const x = isRelative ? currentX + rawX : rawX;
            const y = isRelative ? currentY + rawY : rawY;
            const p = this.transformPoint(x, y, matrix);

            if (first) {
              commands.push({ type: 'M', x: p.x, y: p.y });
              startX = x;
              startY = y;
              first = false;
            } else {
              commands.push({ type: 'L', x: p.x, y: p.y });
            }
            updateBounds(p.x, p.y);
            currentX = x;
            currentY = y;
          }
          break;
        }

        case 'L':
        case 'l': {
          const isRelative = cmd === 'l';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const rawX = tokens[i++] as number;
            const rawY = tokens[i++] as number;
            const x = isRelative ? currentX + rawX : rawX;
            const y = isRelative ? currentY + rawY : rawY;
            const p = this.transformPoint(x, y, matrix);
            commands.push({ type: 'L', x: p.x, y: p.y });
            updateBounds(p.x, p.y);
            currentX = x;
            currentY = y;
          }
          break;
        }

        case 'H':
        case 'h': {
          const isRelative = cmd === 'h';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const rawX = tokens[i++] as number;
            const x = isRelative ? currentX + rawX : rawX;
            const p = this.transformPoint(x, currentY, matrix);
            commands.push({ type: 'L', x: p.x, y: p.y });
            updateBounds(p.x, p.y);
            currentX = x;
          }
          break;
        }

        case 'V':
        case 'v': {
          const isRelative = cmd === 'v';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const rawY = tokens[i++] as number;
            const y = isRelative ? currentY + rawY : rawY;
            const p = this.transformPoint(currentX, y, matrix);
            commands.push({ type: 'L', x: p.x, y: p.y });
            updateBounds(p.x, p.y);
            currentY = y;
          }
          break;
        }

        case 'C':
        case 'c': {
          const isRelative = cmd === 'c';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const x1 = (tokens[i++] as number) + (isRelative ? currentX : 0);
            const y1 = (tokens[i++] as number) + (isRelative ? currentY : 0);
            const x2 = (tokens[i++] as number) + (isRelative ? currentX : 0);
            const y2 = (tokens[i++] as number) + (isRelative ? currentY : 0);
            const x = (tokens[i++] as number) + (isRelative ? currentX : 0);
            const y = (tokens[i++] as number) + (isRelative ? currentY : 0);

            const p1 = this.transformPoint(x1, y1, matrix);
            const p2 = this.transformPoint(x2, y2, matrix);
            const p = this.transformPoint(x, y, matrix);

            commands.push({ type: 'C', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p.x, y: p.y });
            updateBounds(p1.x, p1.y);
            updateBounds(p2.x, p2.y);
            updateBounds(p.x, p.y);
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
            const x2 = (tokens[i++] as number) + (isRelative ? currentX : 0);
            const y2 = (tokens[i++] as number) + (isRelative ? currentY : 0);
            const x = (tokens[i++] as number) + (isRelative ? currentX : 0);
            const y = (tokens[i++] as number) + (isRelative ? currentY : 0);

            const p1 = this.transformPoint(x1, y1, matrix);
            const p2 = this.transformPoint(x2, y2, matrix);
            const p = this.transformPoint(x, y, matrix);

            commands.push({ type: 'C', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p.x, y: p.y });
            updateBounds(p1.x, p1.y);
            updateBounds(p2.x, p2.y);
            updateBounds(p.x, p.y);
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
            const qx = (tokens[i++] as number) + (isRelative ? currentX : 0);
            const qy = (tokens[i++] as number) + (isRelative ? currentY : 0);
            const x = (tokens[i++] as number) + (isRelative ? currentX : 0);
            const y = (tokens[i++] as number) + (isRelative ? currentY : 0);

            // Convert quadratic to cubic
            const x1 = currentX + (2 / 3) * (qx - currentX);
            const y1 = currentY + (2 / 3) * (qy - currentY);
            const x2 = x + (2 / 3) * (qx - x);
            const y2 = y + (2 / 3) * (qy - y);

            const p1 = this.transformPoint(x1, y1, matrix);
            const p2 = this.transformPoint(x2, y2, matrix);
            const p = this.transformPoint(x, y, matrix);

            commands.push({ type: 'C', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p.x, y: p.y });
            updateBounds(p.x, p.y);
            lastQControlX = qx;
            lastQControlY = qy;
            currentX = x;
            currentY = y;
          }
          break;
        }

        case 'T':
        case 't': {
          const isRelative = cmd === 't';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const qx = 2 * currentX - lastQControlX;
            const qy = 2 * currentY - lastQControlY;
            const x = (tokens[i++] as number) + (isRelative ? currentX : 0);
            const y = (tokens[i++] as number) + (isRelative ? currentY : 0);

            const x1 = currentX + (2 / 3) * (qx - currentX);
            const y1 = currentY + (2 / 3) * (qy - currentY);
            const x2 = x + (2 / 3) * (qx - x);
            const y2 = y + (2 / 3) * (qy - y);

            const p1 = this.transformPoint(x1, y1, matrix);
            const p2 = this.transformPoint(x2, y2, matrix);
            const p = this.transformPoint(x, y, matrix);

            commands.push({ type: 'C', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p.x, y: p.y });
            updateBounds(p.x, p.y);
            lastQControlX = qx;
            lastQControlY = qy;
            currentX = x;
            currentY = y;
          }
          break;
        }

        case 'A':
        case 'a': {
          const isRelative = cmd === 'a';
          while (i < tokens.length && typeof tokens[i] === 'number') {
            const rx = tokens[i++] as number;
            const ry = tokens[i++] as number;
            const xRotation = (tokens[i++] as number) * Math.PI / 180;
            const largeArc = (tokens[i++] as number) !== 0;
            const sweep = (tokens[i++] as number) !== 0;
            const x = (tokens[i++] as number) + (isRelative ? currentX : 0);
            const y = (tokens[i++] as number) + (isRelative ? currentY : 0);

            // Convert arc to cubic beziers
            const arcCurves = this.arcToCubicBeziers(
              currentX, currentY,
              rx, ry,
              xRotation,
              largeArc, sweep,
              x, y,
              matrix
            );

            for (const curve of arcCurves) {
              commands.push(curve);
              if (curve.type === 'C') {
                updateBounds(curve.x1, curve.y1);
                updateBounds(curve.x2, curve.y2);
                updateBounds(curve.x, curve.y);
              } else if (curve.type === 'L') {
                updateBounds(curve.x, curve.y);
              }
            }

            currentX = x;
            currentY = y;
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

  /**
   * Convert SVG arc to cubic bezier curves
   */
  private arcToCubicBeziers(
    x1: number, y1: number,
    rx: number, ry: number,
    phi: number,
    largeArc: boolean, sweep: boolean,
    x2: number, y2: number,
    matrix: TransformMatrix
  ): PathCommand[] {
    // Handle degenerate cases
    if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2)) {
      const p = this.transformPoint(x2, y2, matrix);
      return [{ type: 'L', x: p.x, y: p.y }];
    }

    // Ensure radii are positive
    rx = Math.abs(rx);
    ry = Math.abs(ry);

    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    // Step 1: Compute (x1', y1')
    const dx = (x1 - x2) / 2;
    const dy = (y1 - y2) / 2;
    const x1p = cosPhi * dx + sinPhi * dy;
    const y1p = -sinPhi * dx + cosPhi * dy;

    // Step 2: Compute (cx', cy')
    let rxSq = rx * rx;
    let rySq = ry * ry;
    const x1pSq = x1p * x1p;
    const y1pSq = y1p * y1p;

    // Correct out-of-range radii
    const lambda = x1pSq / rxSq + y1pSq / rySq;
    if (lambda > 1) {
      const sqrtLambda = Math.sqrt(lambda);
      rx *= sqrtLambda;
      ry *= sqrtLambda;
      rxSq = rx * rx;
      rySq = ry * ry;
    }

    let sq = Math.max(0, (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq));
    sq = Math.sqrt(sq);
    if (largeArc === sweep) sq = -sq;

    const cxp = sq * rx * y1p / ry;
    const cyp = -sq * ry * x1p / rx;

    // Step 3: Compute (cx, cy)
    const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

    // Step 4: Compute theta1 and dtheta
    const theta1 = this.vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dtheta = this.vectorAngle(
      (x1p - cxp) / rx, (y1p - cyp) / ry,
      (-x1p - cxp) / rx, (-y1p - cyp) / ry
    );

    if (!sweep && dtheta > 0) {
      dtheta -= 2 * Math.PI;
    } else if (sweep && dtheta < 0) {
      dtheta += 2 * Math.PI;
    }

    // Split arc into segments of max 90 degrees
    const segments = Math.ceil(Math.abs(dtheta) / (Math.PI / 2));
    const delta = dtheta / segments;
    const commands: PathCommand[] = [];

    let theta = theta1;
    for (let j = 0; j < segments; j++) {
      const curves = this.arcSegmentToBezier(cx, cy, rx, ry, phi, theta, theta + delta, matrix);
      commands.push(...curves);
      theta += delta;
    }

    return commands;
  }

  /**
   * Convert a single arc segment (< 90 degrees) to cubic bezier
   */
  private arcSegmentToBezier(
    cx: number, cy: number,
    rx: number, ry: number,
    phi: number,
    theta1: number, theta2: number,
    matrix: TransformMatrix
  ): PathCommand[] {
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const dtheta = theta2 - theta1;
    const t = Math.tan(dtheta / 4);
    const alpha = Math.sin(dtheta) * (Math.sqrt(4 + 3 * t * t) - 1) / 3;

    // Calculate endpoint and control points
    const x1 = Math.cos(theta1);
    const y1 = Math.sin(theta1);
    const x2 = Math.cos(theta2);
    const y2 = Math.sin(theta2);

    // Control point 1
    const cp1x = x1 - alpha * y1;
    const cp1y = y1 + alpha * x1;
    // Control point 2
    const cp2x = x2 + alpha * y2;
    const cp2y = y2 - alpha * x2;

    // Transform from ellipse space to user space
    const transform = (ex: number, ey: number) => {
      const px = cx + rx * cosPhi * ex - ry * sinPhi * ey;
      const py = cy + rx * sinPhi * ex + ry * cosPhi * ey;
      return this.transformPoint(px, py, matrix);
    };

    const p1 = transform(cp1x, cp1y);
    const p2 = transform(cp2x, cp2y);
    const end = transform(x2, y2);

    return [{
      type: 'C',
      x1: p1.x, y1: p1.y,
      x2: p2.x, y2: p2.y,
      x: end.x, y: end.y,
    }];
  }

  private vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
    const sign = ux * vy - uy * vx < 0 ? -1 : 1;
    const umag = Math.sqrt(ux * ux + uy * uy);
    const vmag = Math.sqrt(vx * vx + vy * vy);
    const dot = ux * vx + uy * vy;
    let ratio = dot / (umag * vmag);
    ratio = Math.max(-1, Math.min(1, ratio));
    return sign * Math.acos(ratio);
  }

  private tokenizePath(d: string): (string | number)[] {
    const tokens: (string | number)[] = [];
    const regex = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:e[+-]?\d+)?)/gi;
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
  // Transform Matrix Operations
  // =========================================================================

  private identityMatrix(): TransformMatrix {
    return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  }

  private translateMatrix(tx: number, ty: number): TransformMatrix {
    return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
  }

  private scaleMatrix(sx: number, sy: number): TransformMatrix {
    return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
  }

  private rotateMatrix(angle: number): TransformMatrix {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
  }

  private multiplyMatrix(m1: TransformMatrix, m2: TransformMatrix): TransformMatrix {
    return {
      a: m1.a * m2.a + m1.c * m2.b,
      b: m1.b * m2.a + m1.d * m2.b,
      c: m1.a * m2.c + m1.c * m2.d,
      d: m1.b * m2.c + m1.d * m2.d,
      e: m1.a * m2.e + m1.c * m2.f + m1.e,
      f: m1.b * m2.e + m1.d * m2.f + m1.f,
    };
  }

  private transformPoint(x: number, y: number, m: TransformMatrix): { x: number; y: number } {
    return {
      x: m.a * x + m.c * y + m.e,
      y: m.b * x + m.d * y + m.f,
    };
  }

  private parseTransformAttribute(transform: string | null): TransformMatrix {
    if (!transform) return this.identityMatrix();

    let result = this.identityMatrix();
    const regex = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]+)\)/gi;
    let match;

    while ((match = regex.exec(transform)) !== null) {
      const type = match[1]!.toLowerCase();
      const values = match[2]!.split(/[\s,]+/).map(parseFloat);

      let m: TransformMatrix;
      switch (type) {
        case 'matrix':
          m = { a: values[0] ?? 1, b: values[1] ?? 0, c: values[2] ?? 0, d: values[3] ?? 1, e: values[4] ?? 0, f: values[5] ?? 0 };
          break;
        case 'translate':
          m = this.translateMatrix(values[0] ?? 0, values[1] ?? 0);
          break;
        case 'scale':
          m = this.scaleMatrix(values[0] ?? 1, values[1] ?? values[0] ?? 1);
          break;
        case 'rotate': {
          const angle = (values[0] ?? 0) * Math.PI / 180;
          if (values.length === 3) {
            const cx = values[1] ?? 0;
            const cy = values[2] ?? 0;
            m = this.multiplyMatrix(
              this.translateMatrix(cx, cy),
              this.multiplyMatrix(this.rotateMatrix(angle), this.translateMatrix(-cx, -cy))
            );
          } else {
            m = this.rotateMatrix(angle);
          }
          break;
        }
        case 'skewx':
          m = { a: 1, b: 0, c: Math.tan((values[0] ?? 0) * Math.PI / 180), d: 1, e: 0, f: 0 };
          break;
        case 'skewy':
          m = { a: 1, b: Math.tan((values[0] ?? 0) * Math.PI / 180), c: 0, d: 1, e: 0, f: 0 };
          break;
        default:
          m = this.identityMatrix();
      }

      result = this.multiplyMatrix(result, m);
    }

    return result;
  }

  // =========================================================================
  // Style Parsing
  // =========================================================================

  private parseStyle(
    element: Element,
    matrix: TransformMatrix
  ): { fills: Paint[]; strokes: Paint[]; strokeWeight: number } {
    const fills: Paint[] = [];
    const strokes: Paint[] = [];

    // Parse fill
    const fill = this.getStyleValue(element, 'fill');
    if (fill && fill !== 'none') {
      if (fill.startsWith('url(')) {
        const gradientPaint = this.parseGradientReference(fill);
        if (gradientPaint) fills.push(gradientPaint);
      } else {
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
    const strokeWeight = this.parseLength(strokeWidthStr) * Math.abs(matrix.a);

    return { fills, strokes, strokeWeight };
  }

  private parseGradientReference(url: string): Paint | null {
    const match = /url\(#([^)]+)\)/.exec(url);
    if (!match) return null;

    const id = match[1];
    if (!id) return null;
    const gradient = this.gradients.get(id);
    if (!gradient) return null;

    const gradientStops = gradient.stops.map(s => ({
      position: s.offset,
      color: s.color,
    }));

    // Matrix2x3 format: [a, b, c, d, e, f] representing affine transform
    // Identity with translation: [1, 0, 0, 1, tx, ty]
    if (gradient.type === 'linear') {
      return {
        type: 'GRADIENT_LINEAR' as const,
        visible: true,
        opacity: 1,
        gradientStops,
        gradientTransform: [1, 0, 0, 1, gradient.x1 ?? 0, gradient.y1 ?? 0] as const,
      };
    } else {
      return {
        type: 'GRADIENT_RADIAL' as const,
        visible: true,
        opacity: 1,
        gradientStops,
        gradientTransform: [1, 0, 0, 1, gradient.cx ?? 0.5, gradient.cy ?? 0.5] as const,
      };
    }
  }

  private getStyleValue(element: Element, property: string): string | null {
    const style = element.getAttribute('style');
    if (style) {
      const match = new RegExp(`${property}\\s*:\\s*([^;]+)`).exec(style);
      if (match) return match[1]!.trim();
    }
    return element.getAttribute(property);
  }

  private parseColor(colorStr: string): RGBA | null {
    colorStr = colorStr.trim().toLowerCase();

    // Named colors (extended set for CAD)
    const namedColors: Record<string, string> = {
      black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
      blue: '#0000ff', yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff',
      gray: '#808080', grey: '#808080', silver: '#c0c0c0', maroon: '#800000',
      olive: '#808000', lime: '#00ff00', aqua: '#00ffff', teal: '#008080',
      navy: '#000080', fuchsia: '#ff00ff', purple: '#800080', orange: '#ffa500',
      transparent: 'rgba(0,0,0,0)',
    };

    if (namedColors[colorStr]) {
      colorStr = namedColors[colorStr]!;
    }

    if (colorStr.startsWith('#')) {
      return this.parseHexColor(colorStr);
    }

    if (colorStr.startsWith('rgb')) {
      return this.parseRGBColor(colorStr);
    }

    if (colorStr.startsWith('hsl')) {
      return this.parseHSLColor(colorStr);
    }

    return null;
  }

  private parseHexColor(hex: string): RGBA {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }

    return {
      r: parseInt(hex.substring(0, 2), 16) / 255,
      g: parseInt(hex.substring(2, 4), 16) / 255,
      b: parseInt(hex.substring(4, 6), 16) / 255,
      a: hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1,
    };
  }

  private parseRGBColor(rgb: string): RGBA {
    const match = /rgba?\s*\(\s*([\d.]+%?)\s*,?\s*([\d.]+%?)\s*,?\s*([\d.]+%?)\s*(?:,?\s*([\d.]+%?))?\s*\)/.exec(rgb);
    if (!match) return { r: 0, g: 0, b: 0, a: 1 };

    const parseValue = (v: string) => {
      if (v.endsWith('%')) return parseFloat(v) / 100;
      return parseFloat(v) / 255;
    };

    return {
      r: parseValue(match[1] ?? '0'),
      g: parseValue(match[2] ?? '0'),
      b: parseValue(match[3] ?? '0'),
      a: match[4] ? (match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4])) : 1,
    };
  }

  private parseHSLColor(hsl: string): RGBA {
    const match = /hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+))?\s*\)/.exec(hsl);
    if (!match) return { r: 0, g: 0, b: 0, a: 1 };

    const h = parseFloat(match[1] ?? '0') / 360;
    const s = parseFloat(match[2] ?? '0') / 100;
    const l = parseFloat(match[3] ?? '0') / 100;
    const a = match[4] ? parseFloat(match[4]) : 1;

    // HSL to RGB conversion
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return { r, g, b, a };
  }

  private parseOpacity(element: Element): number {
    const opacity = this.getStyleValue(element, 'opacity');
    return opacity ? parseFloat(opacity) : 1;
  }

  private parseFontSize(element: Element): number {
    const fontSize = this.getStyleValue(element, 'font-size');
    return fontSize ? this.parseLength(fontSize) : 16;
  }

  private parsePoints(pointsStr: string): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const values = pointsStr.trim().split(/[\s,]+/).map(Number);

    for (let i = 0; i + 1 < values.length; i += 2) {
      const x = values[i];
      const y = values[i + 1];
      if (x !== undefined && y !== undefined) {
        points.push({ x, y });
      }
    }

    return points;
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private getBounds(points: { x: number; y: number }[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }

  private normalizeCommands(commands: PathCommand[], offsetX: number, offsetY: number): PathCommand[] {
    return commands.map(cmd => {
      switch (cmd.type) {
        case 'M':
          return { type: 'M', x: cmd.x - offsetX, y: cmd.y - offsetY };
        case 'L':
          return { type: 'L', x: cmd.x - offsetX, y: cmd.y - offsetY };
        case 'C':
          return {
            type: 'C',
            x1: cmd.x1 - offsetX, y1: cmd.y1 - offsetY,
            x2: cmd.x2 - offsetX, y2: cmd.y2 - offsetY,
            x: cmd.x - offsetX, y: cmd.y - offsetY,
          };
        case 'Z':
          return { type: 'Z' };
      }
    });
  }

  private createEllipsePath(rx: number, ry: number): VectorPath {
    const k = 0.5522847498;
    return {
      windingRule: 'NONZERO',
      commands: [
        { type: 'M', x: rx * 2, y: ry },
        { type: 'C', x1: rx * 2, y1: ry + ry * k, x2: rx + rx * k, y2: ry * 2, x: rx, y: ry * 2 },
        { type: 'C', x1: rx - rx * k, y1: ry * 2, x2: 0, y2: ry + ry * k, x: 0, y: ry },
        { type: 'C', x1: 0, y1: ry - ry * k, x2: rx - rx * k, y2: 0, x: rx, y: 0 },
        { type: 'C', x1: rx + rx * k, y1: 0, x2: rx * 2, y2: ry - ry * k, x: rx * 2, y: ry },
        { type: 'Z' },
      ],
    };
  }

  private getDefaultParent(): NodeId {
    const doc = this.sceneGraph.getDocument();
    if (!doc) throw new Error('No document in scene graph');
    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) throw new Error('No pages in document');
    const firstId = pageIds[0];
    if (!firstId) throw new Error('No pages in document');
    return firstId;
  }
}

/**
 * Create an enhanced SVG CAD importer.
 */
export function createSVGCADImporter(sceneGraph: SceneGraph): SVGCADImporter {
  return new SVGCADImporter(sceneGraph);
}
