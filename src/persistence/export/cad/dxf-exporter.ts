/**
 * DXF Exporter
 *
 * Exports DesignLibre scene nodes to DXF (Drawing Exchange Format).
 * Generates AutoCAD R2000 compatible DXF files.
 */

import type { NodeId } from '@core/types/common';
import type { VectorPath, PathCommand } from '@core/types/geometry';
import type { Paint } from '@core/types/paint';

/**
 * Node data for export (simplified interface)
 */
export interface ExportableNode {
  id: NodeId;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  vectorPaths?: readonly VectorPath[];
  characters?: string;
  strokes?: readonly Paint[];
  fills?: readonly Paint[];
  strokeWeight?: number;
  childIds?: readonly NodeId[];
}

/**
 * Export options
 */
export interface DXFExportOptions {
  /** DXF version (default: AC1015 = AutoCAD 2000) */
  version?: string;
  /** Units (default: mm) */
  units?: 'mm' | 'in' | 'px';
  /** Pixels per unit for conversion from px */
  pixelsPerUnit?: number;
  /** Layer name for exported entities */
  defaultLayer?: string;
  /** Include text entities */
  includeText?: boolean;
  /** Flatten transforms */
  flattenTransforms?: boolean;
}

/**
 * DXF writer helper
 */
class DXFWriter {
  private lines: string[] = [];
  private handleCounter = 0x100;

  /**
   * Write a group code-value pair
   */
  write(code: number, value: string | number): void {
    this.lines.push(`  ${code}`);
    this.lines.push(typeof value === 'number' ? value.toString() : value);
  }

  /**
   * Get next handle
   */
  nextHandle(): string {
    return (this.handleCounter++).toString(16).toUpperCase();
  }

  /**
   * Get output
   */
  toString(): string {
    return this.lines.join('\n');
  }
}

/**
 * DXF Exporter class
 */
export class DXFExporter {
  private writer: DXFWriter = new DXFWriter();
  private options: Required<DXFExportOptions>;
  private unitScale: number = 1;
  private layers: Set<string> = new Set(['0']);
  private bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

  constructor(options: DXFExportOptions = {}) {
    this.options = {
      version: options.version ?? 'AC1015',
      units: options.units ?? 'mm',
      pixelsPerUnit: options.pixelsPerUnit ?? 3.7795275591,
      defaultLayer: options.defaultLayer ?? '0',
      includeText: options.includeText ?? true,
      flattenTransforms: options.flattenTransforms ?? true,
    };

    // Calculate unit scale (from px to target units)
    if (this.options.units === 'mm') {
      this.unitScale = 1 / this.options.pixelsPerUnit;
    } else if (this.options.units === 'in') {
      this.unitScale = 1 / (this.options.pixelsPerUnit * 25.4);
    } else {
      this.unitScale = 1;
    }
  }

  /**
   * Export nodes to DXF string
   */
  export(nodes: ExportableNode[], getNode?: (id: NodeId) => ExportableNode | null): string {
    this.writer = new DXFWriter();
    this.calculateBounds(nodes);

    // Write sections
    this.writeHeader();
    this.writeTables();
    this.writeBlocks();
    this.writeEntities(nodes, getNode);
    this.writeEOF();

    return this.writer.toString();
  }

  /**
   * Calculate drawing bounds
   */
  private calculateBounds(nodes: ExportableNode[]): void {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const node of nodes) {
      if (!node.visible) continue;

      const x = this.toUnits(node.x);
      const y = this.toUnits(node.y);
      const w = this.toUnits(node.width);
      const h = this.toUnits(node.height);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    if (isFinite(minX)) {
      this.bounds = { minX, minY, maxX, maxY };
    }
  }

  /**
   * Convert pixel value to export units
   */
  private toUnits(value: number): number {
    return value * this.unitScale;
  }

  /**
   * Write HEADER section
   */
  private writeHeader(): void {
    const w = this.writer;

    w.write(0, 'SECTION');
    w.write(2, 'HEADER');

    // Version
    w.write(9, '$ACADVER');
    w.write(1, this.options.version);

    // Units
    w.write(9, '$INSUNITS');
    w.write(70, this.getInsunits());

    // Drawing extents
    w.write(9, '$EXTMIN');
    w.write(10, this.bounds.minX);
    w.write(20, this.bounds.minY);
    w.write(30, 0);

    w.write(9, '$EXTMAX');
    w.write(10, this.bounds.maxX);
    w.write(20, this.bounds.maxY);
    w.write(30, 0);

    // Limits
    w.write(9, '$LIMMIN');
    w.write(10, this.bounds.minX);
    w.write(20, this.bounds.minY);

    w.write(9, '$LIMMAX');
    w.write(10, this.bounds.maxX);
    w.write(20, this.bounds.maxY);

    // Default text size
    w.write(9, '$TEXTSIZE');
    w.write(40, 2.5);

    // Linetype scale
    w.write(9, '$LTSCALE');
    w.write(40, 1);

    w.write(0, 'ENDSEC');
  }

  /**
   * Get INSUNITS value
   */
  private getInsunits(): number {
    switch (this.options.units) {
      case 'in':
        return 1;
      case 'mm':
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Write TABLES section
   */
  private writeTables(): void {
    const w = this.writer;

    w.write(0, 'SECTION');
    w.write(2, 'TABLES');

    // VPORT table
    this.writeVportTable();

    // LTYPE table
    this.writeLinetypeTable();

    // LAYER table
    this.writeLayerTable();

    // STYLE table
    this.writeStyleTable();

    // VIEW table (empty)
    w.write(0, 'TABLE');
    w.write(2, 'VIEW');
    w.write(5, w.nextHandle());
    w.write(70, 0);
    w.write(0, 'ENDTAB');

    // UCS table (empty)
    w.write(0, 'TABLE');
    w.write(2, 'UCS');
    w.write(5, w.nextHandle());
    w.write(70, 0);
    w.write(0, 'ENDTAB');

    // APPID table
    this.writeAppIdTable();

    // DIMSTYLE table
    this.writeDimStyleTable();

    w.write(0, 'ENDSEC');
  }

  /**
   * Write VPORT table
   */
  private writeVportTable(): void {
    const w = this.writer;

    w.write(0, 'TABLE');
    w.write(2, 'VPORT');
    w.write(5, w.nextHandle());
    w.write(70, 1);

    w.write(0, 'VPORT');
    w.write(5, w.nextHandle());
    w.write(2, '*ACTIVE');
    w.write(70, 0);
    w.write(10, 0);
    w.write(20, 0);
    w.write(11, 1);
    w.write(21, 1);
    w.write(12, (this.bounds.minX + this.bounds.maxX) / 2);
    w.write(22, (this.bounds.minY + this.bounds.maxY) / 2);
    w.write(40, this.bounds.maxY - this.bounds.minY);
    w.write(41, 1);

    w.write(0, 'ENDTAB');
  }

  /**
   * Write LTYPE table
   */
  private writeLinetypeTable(): void {
    const w = this.writer;

    w.write(0, 'TABLE');
    w.write(2, 'LTYPE');
    w.write(5, w.nextHandle());
    w.write(70, 3);

    // ByBlock
    w.write(0, 'LTYPE');
    w.write(5, w.nextHandle());
    w.write(2, 'BYBLOCK');
    w.write(70, 0);
    w.write(3, '');
    w.write(72, 65);
    w.write(73, 0);
    w.write(40, 0);

    // ByLayer
    w.write(0, 'LTYPE');
    w.write(5, w.nextHandle());
    w.write(2, 'BYLAYER');
    w.write(70, 0);
    w.write(3, '');
    w.write(72, 65);
    w.write(73, 0);
    w.write(40, 0);

    // Continuous
    w.write(0, 'LTYPE');
    w.write(5, w.nextHandle());
    w.write(2, 'CONTINUOUS');
    w.write(70, 0);
    w.write(3, 'Solid line');
    w.write(72, 65);
    w.write(73, 0);
    w.write(40, 0);

    w.write(0, 'ENDTAB');
  }

  /**
   * Write LAYER table
   */
  private writeLayerTable(): void {
    const w = this.writer;

    w.write(0, 'TABLE');
    w.write(2, 'LAYER');
    w.write(5, w.nextHandle());
    w.write(70, this.layers.size);

    for (const layerName of this.layers) {
      w.write(0, 'LAYER');
      w.write(5, w.nextHandle());
      w.write(2, layerName);
      w.write(70, 0);
      w.write(62, 7); // White
      w.write(6, 'CONTINUOUS');
      w.write(370, -3); // Default lineweight
    }

    w.write(0, 'ENDTAB');
  }

  /**
   * Write STYLE table
   */
  private writeStyleTable(): void {
    const w = this.writer;

    w.write(0, 'TABLE');
    w.write(2, 'STYLE');
    w.write(5, w.nextHandle());
    w.write(70, 1);

    w.write(0, 'STYLE');
    w.write(5, w.nextHandle());
    w.write(2, 'STANDARD');
    w.write(70, 0);
    w.write(40, 0);
    w.write(41, 1);
    w.write(50, 0);
    w.write(71, 0);
    w.write(42, 2.5);
    w.write(3, 'txt');
    w.write(4, '');

    w.write(0, 'ENDTAB');
  }

  /**
   * Write APPID table
   */
  private writeAppIdTable(): void {
    const w = this.writer;

    w.write(0, 'TABLE');
    w.write(2, 'APPID');
    w.write(5, w.nextHandle());
    w.write(70, 1);

    w.write(0, 'APPID');
    w.write(5, w.nextHandle());
    w.write(2, 'ACAD');
    w.write(70, 0);

    w.write(0, 'ENDTAB');
  }

  /**
   * Write DIMSTYLE table
   */
  private writeDimStyleTable(): void {
    const w = this.writer;

    w.write(0, 'TABLE');
    w.write(2, 'DIMSTYLE');
    w.write(5, w.nextHandle());
    w.write(70, 1);

    w.write(0, 'DIMSTYLE');
    w.write(5, w.nextHandle());
    w.write(2, 'STANDARD');
    w.write(70, 0);
    w.write(40, 1); // DIMSCALE

    w.write(0, 'ENDTAB');
  }

  /**
   * Write BLOCKS section
   */
  private writeBlocks(): void {
    const w = this.writer;

    w.write(0, 'SECTION');
    w.write(2, 'BLOCKS');

    // Model space block
    w.write(0, 'BLOCK');
    w.write(5, w.nextHandle());
    w.write(8, '0');
    w.write(2, '*MODEL_SPACE');
    w.write(70, 0);
    w.write(10, 0);
    w.write(20, 0);
    w.write(30, 0);
    w.write(3, '*MODEL_SPACE');
    w.write(0, 'ENDBLK');
    w.write(5, w.nextHandle());
    w.write(8, '0');

    // Paper space block
    w.write(0, 'BLOCK');
    w.write(5, w.nextHandle());
    w.write(8, '0');
    w.write(2, '*PAPER_SPACE');
    w.write(70, 0);
    w.write(10, 0);
    w.write(20, 0);
    w.write(30, 0);
    w.write(3, '*PAPER_SPACE');
    w.write(0, 'ENDBLK');
    w.write(5, w.nextHandle());
    w.write(8, '0');

    w.write(0, 'ENDSEC');
  }

  /**
   * Write ENTITIES section
   */
  private writeEntities(nodes: ExportableNode[], getNode?: (id: NodeId) => ExportableNode | null): void {
    const w = this.writer;

    w.write(0, 'SECTION');
    w.write(2, 'ENTITIES');

    for (const node of nodes) {
      this.writeNode(node, getNode);
    }

    w.write(0, 'ENDSEC');
  }

  /**
   * Write a single node
   */
  private writeNode(node: ExportableNode, getNode?: (id: NodeId) => ExportableNode | null): void {
    if (!node.visible) return;

    // Handle different node types
    switch (node.type) {
      case 'VECTOR':
      case 'LINE':
      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'POLYGON':
      case 'STAR':
        this.writeVectorNode(node);
        break;
      case 'TEXT':
        if (this.options.includeText) {
          this.writeTextNode(node);
        }
        break;
      case 'FRAME':
      case 'GROUP':
        // Recursively write children
        if (node.childIds && getNode) {
          for (const childId of node.childIds) {
            const child = getNode(childId);
            if (child) {
              this.writeNode(child, getNode);
            }
          }
        }
        break;
    }
  }

  /**
   * Write vector node
   */
  private writeVectorNode(node: ExportableNode): void {
    if (!node.vectorPaths || node.vectorPaths.length === 0) {
      // Write as rectangle if no paths
      this.writeRectangle(node);
      return;
    }

    const color = this.getEntityColor(node);

    for (const path of node.vectorPaths) {
      this.writePath(path, node, color);
    }
  }

  /**
   * Write a vector path
   */
  private writePath(path: VectorPath, node: ExportableNode, color: number): void {
    const commands = path.commands;
    if (commands.length === 0) return;

    // Analyze path to determine best entity type
    const analysis = this.analyzePath(commands);

    if (analysis.isPolyline) {
      this.writePolyline(commands, node, color, analysis.isClosed);
    } else {
      // Write as individual line segments and curves
      this.writePathSegments(commands, node, color);
    }
  }

  /**
   * Analyze path commands
   */
  private analyzePath(commands: readonly PathCommand[]): { isPolyline: boolean; isClosed: boolean } {
    let hasOnlyLines = true;
    let isClosed = false;

    for (const cmd of commands) {
      if (cmd.type === 'C') {
        hasOnlyLines = false;
      }
      if (cmd.type === 'Z') {
        isClosed = true;
      }
    }

    return { isPolyline: hasOnlyLines, isClosed };
  }

  /**
   * Write LWPOLYLINE entity
   */
  private writePolyline(
    commands: readonly PathCommand[],
    node: ExportableNode,
    color: number,
    closed: boolean
  ): void {
    const w = this.writer;
    const vertices: { x: number; y: number }[] = [];

    // Collect vertices
    for (const cmd of commands) {
      if (cmd.type === 'M' || cmd.type === 'L') {
        vertices.push({
          x: this.toUnits(node.x + cmd.x),
          y: this.toUnits(node.y + cmd.y),
        });
      }
    }

    if (vertices.length < 2) return;

    w.write(0, 'LWPOLYLINE');
    w.write(5, w.nextHandle());
    w.write(8, this.options.defaultLayer);
    w.write(62, color);
    w.write(90, vertices.length);
    w.write(70, closed ? 1 : 0);

    for (const v of vertices) {
      w.write(10, v.x);
      w.write(20, v.y);
    }
  }

  /**
   * Write path as individual segments
   */
  private writePathSegments(commands: readonly PathCommand[], node: ExportableNode, color: number): void {
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;

    for (const cmd of commands) {
      switch (cmd.type) {
        case 'M':
          currentX = cmd.x;
          currentY = cmd.y;
          startX = cmd.x;
          startY = cmd.y;
          break;
        case 'L':
          this.writeLine(
            this.toUnits(node.x + currentX),
            this.toUnits(node.y + currentY),
            this.toUnits(node.x + cmd.x),
            this.toUnits(node.y + cmd.y),
            color
          );
          currentX = cmd.x;
          currentY = cmd.y;
          break;
        case 'C':
          this.writeSpline(
            node.x + currentX,
            node.y + currentY,
            node.x + cmd.x1,
            node.y + cmd.y1,
            node.x + cmd.x2,
            node.y + cmd.y2,
            node.x + cmd.x,
            node.y + cmd.y,
            color
          );
          currentX = cmd.x;
          currentY = cmd.y;
          break;
        case 'Z':
          if (currentX !== startX || currentY !== startY) {
            this.writeLine(
              this.toUnits(node.x + currentX),
              this.toUnits(node.y + currentY),
              this.toUnits(node.x + startX),
              this.toUnits(node.y + startY),
              color
            );
          }
          break;
      }
    }
  }

  /**
   * Write LINE entity
   */
  private writeLine(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const w = this.writer;

    w.write(0, 'LINE');
    w.write(5, w.nextHandle());
    w.write(8, this.options.defaultLayer);
    w.write(62, color);
    w.write(10, x1);
    w.write(20, y1);
    w.write(30, 0);
    w.write(11, x2);
    w.write(21, y2);
    w.write(31, 0);
  }

  /**
   * Write cubic bezier as SPLINE
   */
  private writeSpline(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    color: number
  ): void {
    const w = this.writer;

    // Convert to DXF units
    const pts = [
      { x: this.toUnits(x0), y: this.toUnits(y0) },
      { x: this.toUnits(x1), y: this.toUnits(y1) },
      { x: this.toUnits(x2), y: this.toUnits(y2) },
      { x: this.toUnits(x3), y: this.toUnits(y3) },
    ];

    w.write(0, 'SPLINE');
    w.write(5, w.nextHandle());
    w.write(8, this.options.defaultLayer);
    w.write(62, color);
    w.write(70, 8); // Planar
    w.write(71, 3); // Degree
    w.write(72, 8); // Number of knots
    w.write(73, 4); // Number of control points
    w.write(74, 0); // Number of fit points

    // Knot values for cubic bezier
    w.write(40, 0);
    w.write(40, 0);
    w.write(40, 0);
    w.write(40, 0);
    w.write(40, 1);
    w.write(40, 1);
    w.write(40, 1);
    w.write(40, 1);

    // Control points
    for (const pt of pts) {
      w.write(10, pt.x);
      w.write(20, pt.y);
      w.write(30, 0);
    }
  }

  /**
   * Write rectangle (when no vector paths)
   */
  private writeRectangle(node: ExportableNode): void {
    const w = this.toUnits(node.width);
    const h = this.toUnits(node.height);
    const color = this.getEntityColor(node);

    this.writePolyline(
      [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: w, y: 0 },
        { type: 'L', x: w, y: h },
        { type: 'L', x: 0, y: h },
        { type: 'Z' },
      ],
      node,
      color,
      true
    );
  }

  /**
   * Write TEXT entity
   */
  private writeTextNode(node: ExportableNode): void {
    if (!node.characters) return;

    const w = this.writer;
    const x = this.toUnits(node.x);
    const y = this.toUnits(node.y);
    const height = this.toUnits(node.height * 0.7); // Approximate text height

    w.write(0, 'TEXT');
    w.write(5, w.nextHandle());
    w.write(8, this.options.defaultLayer);
    w.write(10, x);
    w.write(20, y);
    w.write(30, 0);
    w.write(40, height);
    w.write(1, node.characters);
    w.write(50, node.rotation);
    w.write(7, 'STANDARD');
    w.write(72, 0); // Left aligned
    w.write(73, 0); // Baseline
  }

  /**
   * Get entity color as ACI
   */
  private getEntityColor(node: ExportableNode): number {
    // Try to get color from strokes first, then fills
    const paints = node.strokes?.length ? node.strokes : node.fills;

    if (paints && paints.length > 0) {
      const paint = paints[0];
      if (paint && paint.type === 'SOLID' && 'color' in paint && paint.color) {
        return this.rgbToAci(paint.color.r * 255, paint.color.g * 255, paint.color.b * 255);
      }
    }

    return 7; // White/black
  }

  /**
   * Convert RGB to nearest ACI color
   */
  private rgbToAci(r: number, g: number, b: number): number {
    // Standard ACI colors
    const aciColors = [
      { aci: 1, r: 255, g: 0, b: 0 }, // Red
      { aci: 2, r: 255, g: 255, b: 0 }, // Yellow
      { aci: 3, r: 0, g: 255, b: 0 }, // Green
      { aci: 4, r: 0, g: 255, b: 255 }, // Cyan
      { aci: 5, r: 0, g: 0, b: 255 }, // Blue
      { aci: 6, r: 255, g: 0, b: 255 }, // Magenta
      { aci: 7, r: 255, g: 255, b: 255 }, // White
      { aci: 8, r: 128, g: 128, b: 128 }, // Gray
      { aci: 9, r: 192, g: 192, b: 192 }, // Light gray
    ];

    // Find nearest color
    let bestAci = 7;
    let bestDist = Infinity;

    for (const color of aciColors) {
      const dist = (r - color.r) ** 2 + (g - color.g) ** 2 + (b - color.b) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestAci = color.aci;
      }
    }

    return bestAci;
  }

  /**
   * Write EOF
   */
  private writeEOF(): void {
    this.writer.write(0, 'EOF');
  }
}

/**
 * Export nodes to DXF string
 */
export function exportDXF(
  nodes: ExportableNode[],
  options?: DXFExportOptions,
  getNode?: (id: NodeId) => ExportableNode | null
): string {
  const exporter = new DXFExporter(options);
  return exporter.export(nodes, getNode);
}
