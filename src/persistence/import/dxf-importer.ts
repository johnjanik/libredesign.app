/**
 * DXF Importer
 *
 * Converts parsed DXF files to DesignLibre scene nodes.
 */

import type { NodeId } from '@core/types/common';
import type { VectorPath, PathCommand } from '@core/types/geometry';
import type { Paint } from '@core/types/paint';
import type { VectorNodeData, TextNodeData, GroupNodeData } from '@scene/nodes/base-node';
import { parseDXF } from './dxf-parser';
import type {
  DXFFile,
  DXFEntity,
  DXFLine,
  DXFCircle,
  DXFArc,
  DXFEllipse,
  DXFPolyline,
  DXFSpline,
  DXFText,
  DXFMText,
  DXFPointEntity,
} from './dxf-types';
import { ACI_COLORS, getUnitConversionToMM } from './dxf-types';

/**
 * Import result containing nodes and metadata
 */
export interface DXFImportResult {
  nodes: ImportedNode[];
  layers: Map<string, DXFLayerInfo>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  units: string;
  scale: number;
}

/**
 * Layer information
 */
export interface DXFLayerInfo {
  name: string;
  color: { r: number; g: number; b: number };
  visible: boolean;
  locked: boolean;
}

/**
 * Imported node types
 */
export type ImportedNode =
  | { type: 'vector'; data: Partial<VectorNodeData>; layer: string }
  | { type: 'text'; data: Partial<TextNodeData>; layer: string }
  | { type: 'group'; data: Partial<GroupNodeData>; children: ImportedNode[]; layer: string };

/**
 * Import options
 */
export interface DXFImportOptions {
  /** Target unit (will scale to this unit) */
  targetUnit?: 'mm' | 'px' | 'in';
  /** Pixels per mm (default 3.7795275591 = 96 DPI) */
  pixelsPerMM?: number;
  /** Import specific layers only */
  layerFilter?: string[];
  /** Merge paths on same layer */
  mergePaths?: boolean;
  /** Import blocks as groups */
  importBlocks?: boolean;
}

/**
 * DXF Importer class
 */
export class DXFImporter {
  private nodeIdCounter = 0;
  private options: Required<DXFImportOptions>;
  private unitScale = 1;

  constructor(options: DXFImportOptions = {}) {
    this.options = {
      targetUnit: options.targetUnit ?? 'px',
      pixelsPerMM: options.pixelsPerMM ?? 3.7795275591, // 96 DPI
      layerFilter: options.layerFilter ?? [],
      mergePaths: options.mergePaths ?? false,
      importBlocks: options.importBlocks ?? true,
    };
  }

  /**
   * Import DXF file content
   */
  import(content: string): DXFImportResult {
    const dxf = parseDXF(content);
    return this.convertDXF(dxf);
  }

  /**
   * Convert parsed DXF to import result
   */
  private convertDXF(dxf: DXFFile): DXFImportResult {
    // Calculate unit scale
    const mmScale = getUnitConversionToMM(dxf.header.insunits);
    this.unitScale =
      this.options.targetUnit === 'px'
        ? mmScale * this.options.pixelsPerMM
        : this.options.targetUnit === 'in'
          ? mmScale / 25.4
          : mmScale;

    // Extract layer info
    const layers = new Map<string, DXFLayerInfo>();
    for (const layer of dxf.tables.layers) {
      layers.set(layer.name, {
        name: layer.name,
        color: this.aciToRgb(layer.color),
        visible: !layer.off && !layer.frozen,
        locked: layer.locked,
      });
    }

    // Ensure layer 0 exists
    if (!layers.has('0')) {
      layers.set('0', {
        name: '0',
        color: { r: 255, g: 255, b: 255 },
        visible: true,
        locked: false,
      });
    }

    // Convert entities
    const nodes: ImportedNode[] = [];
    let bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

    for (const entity of dxf.entities) {
      // Check layer filter
      if (this.options.layerFilter.length > 0 && !this.options.layerFilter.includes(entity.layer)) {
        continue;
      }

      const node = this.convertEntity(entity, layers);
      if (node) {
        nodes.push(node);
        bounds = this.expandBounds(bounds, node);
      }
    }

    // Normalize bounds
    if (!isFinite(bounds.minX)) {
      bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    }

    return {
      nodes,
      layers,
      bounds,
      units: this.options.targetUnit,
      scale: this.unitScale,
    };
  }

  /**
   * Convert a single DXF entity
   */
  private convertEntity(entity: DXFEntity, layers: Map<string, DXFLayerInfo>): ImportedNode | null {
    const layerInfo = layers.get(entity.layer) ?? layers.get('0')!;

    switch (entity.type) {
      case 'LINE':
        return this.convertLine(entity, layerInfo);
      case 'CIRCLE':
        return this.convertCircle(entity, layerInfo);
      case 'ARC':
        return this.convertArc(entity, layerInfo);
      case 'ELLIPSE':
        return this.convertEllipse(entity, layerInfo);
      case 'LWPOLYLINE':
      case 'POLYLINE':
        return this.convertPolyline(entity, layerInfo);
      case 'SPLINE':
        return this.convertSpline(entity, layerInfo);
      case 'TEXT':
        return this.convertText(entity, layerInfo);
      case 'MTEXT':
        return this.convertMText(entity, layerInfo);
      case 'POINT':
        return this.convertPoint(entity, layerInfo);
      default:
        return null;
    }
  }

  /**
   * Convert LINE entity
   */
  private convertLine(line: DXFLine, layerInfo: DXFLayerInfo): ImportedNode {
    const x1 = this.scale(line.start.x);
    const y1 = this.scale(line.start.y);
    const x2 = this.scale(line.end.x);
    const y2 = this.scale(line.end.y);

    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const width = Math.abs(x2 - x1) || 1;
    const height = Math.abs(y2 - y1) || 1;

    const path: VectorPath = {
      windingRule: 'NONZERO',
      commands: [
        { type: 'M', x: x1 - minX, y: y1 - minY },
        { type: 'L', x: x2 - minX, y: y2 - minY },
      ],
    };

    return {
      type: 'vector',
      layer: line.layer,
      data: {
        id: this.generateId(),
        type: 'VECTOR',
        name: `Line`,
        x: minX,
        y: minY,
        width,
        height,
        rotation: 0,
        vectorPaths: [path],
        ...this.getAppearance(line, layerInfo),
      },
    };
  }

  /**
   * Convert CIRCLE entity
   */
  private convertCircle(circle: DXFCircle, layerInfo: DXFLayerInfo): ImportedNode {
    const cx = this.scale(circle.center.x);
    const cy = this.scale(circle.center.y);
    const r = this.scale(circle.radius);

    const path = this.createCirclePath(r, r);

    return {
      type: 'vector',
      layer: circle.layer,
      data: {
        id: this.generateId(),
        type: 'VECTOR',
        name: `Circle`,
        x: cx - r,
        y: cy - r,
        width: r * 2,
        height: r * 2,
        rotation: 0,
        vectorPaths: [path],
        ...this.getAppearance(circle, layerInfo),
      },
    };
  }

  /**
   * Convert ARC entity
   */
  private convertArc(arc: DXFArc, layerInfo: DXFLayerInfo): ImportedNode {
    const cx = this.scale(arc.center.x);
    const cy = this.scale(arc.center.y);
    const r = this.scale(arc.radius);

    // Convert angles to radians
    const startRad = (arc.startAngle * Math.PI) / 180;
    const endRad = (arc.endAngle * Math.PI) / 180;

    const path = this.createArcPath(r, r, startRad, endRad);
    const bounds = this.getArcBounds(cx, cy, r, startRad, endRad);

    return {
      type: 'vector',
      layer: arc.layer,
      data: {
        id: this.generateId(),
        type: 'VECTOR',
        name: `Arc`,
        x: bounds.minX,
        y: bounds.minY,
        width: bounds.maxX - bounds.minX || 1,
        height: bounds.maxY - bounds.minY || 1,
        rotation: 0,
        vectorPaths: [this.offsetPath(path, -bounds.minX + cx - r, -bounds.minY + cy - r)],
        ...this.getAppearance(arc, layerInfo),
      },
    };
  }

  /**
   * Convert ELLIPSE entity
   */
  private convertEllipse(ellipse: DXFEllipse, layerInfo: DXFLayerInfo): ImportedNode {
    const cx = this.scale(ellipse.center.x);
    const cy = this.scale(ellipse.center.y);
    const majorAxisLength = Math.sqrt(ellipse.majorAxis.x ** 2 + ellipse.majorAxis.y ** 2);
    const rx = this.scale(majorAxisLength);
    const ry = rx * ellipse.ratio;
    const rotation = (Math.atan2(ellipse.majorAxis.y, ellipse.majorAxis.x) * 180) / Math.PI;

    // Check if full ellipse
    const isFullEllipse =
      Math.abs(ellipse.endParam - ellipse.startParam - Math.PI * 2) < 0.01 ||
      (ellipse.startParam === 0 && Math.abs(ellipse.endParam - Math.PI * 2) < 0.01);

    const path = isFullEllipse
      ? this.createCirclePath(rx, ry)
      : this.createArcPath(rx, ry, ellipse.startParam, ellipse.endParam);

    return {
      type: 'vector',
      layer: ellipse.layer,
      data: {
        id: this.generateId(),
        type: 'VECTOR',
        name: `Ellipse`,
        x: cx - rx,
        y: cy - ry,
        width: rx * 2,
        height: ry * 2,
        rotation,
        vectorPaths: [path],
        ...this.getAppearance(ellipse, layerInfo),
      },
    };
  }

  /**
   * Convert POLYLINE/LWPOLYLINE entity
   */
  private convertPolyline(polyline: DXFPolyline, layerInfo: DXFLayerInfo): ImportedNode {
    if (polyline.vertices.length < 2) {
      return {
        type: 'vector',
        layer: polyline.layer,
        data: {
          id: this.generateId(),
          type: 'VECTOR',
          name: `Polyline`,
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          rotation: 0,
          vectorPaths: [],
          ...this.getAppearance(polyline, layerInfo),
        },
      };
    }

    const commands: PathCommand[] = [];
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    // Scale vertices
    const scaledVertices = polyline.vertices.map((v) => ({
      x: this.scale(v.x),
      y: this.scale(v.y),
      bulge: v.bulge,
    }));

    // Calculate bounds
    for (const v of scaledVertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }

    // Build path commands
    const firstVertex = scaledVertices[0];
    if (firstVertex) {
      commands.push({ type: 'M', x: firstVertex.x - minX, y: firstVertex.y - minY });
    }

    for (let i = 0; i < scaledVertices.length - 1; i++) {
      const v1 = scaledVertices[i];
      const v2 = scaledVertices[i + 1];
      if (!v1 || !v2) continue;

      if (v1.bulge && Math.abs(v1.bulge) > 0.0001) {
        // Arc segment
        const arcCommands = this.bulgeToArc(
          v1.x - minX,
          v1.y - minY,
          v2.x - minX,
          v2.y - minY,
          v1.bulge
        );
        commands.push(...arcCommands);
      } else {
        // Line segment
        commands.push({ type: 'L', x: v2.x - minX, y: v2.y - minY });
      }
    }

    // Close if needed
    if (polyline.closed) {
      const lastV = scaledVertices[scaledVertices.length - 1];
      const firstV = scaledVertices[0];

      if (lastV && firstV && lastV.bulge && Math.abs(lastV.bulge) > 0.0001) {
        const arcCommands = this.bulgeToArc(
          lastV.x - minX,
          lastV.y - minY,
          firstV.x - minX,
          firstV.y - minY,
          lastV.bulge
        );
        commands.push(...arcCommands);
      }
      commands.push({ type: 'Z' });
    }

    const path: VectorPath = {
      windingRule: 'NONZERO',
      commands,
    };

    return {
      type: 'vector',
      layer: polyline.layer,
      data: {
        id: this.generateId(),
        type: 'VECTOR',
        name: `Polyline`,
        x: minX,
        y: minY,
        width: maxX - minX || 1,
        height: maxY - minY || 1,
        rotation: 0,
        vectorPaths: [path],
        ...this.getAppearance(polyline, layerInfo),
      },
    };
  }

  /**
   * Convert SPLINE entity
   */
  private convertSpline(spline: DXFSpline, layerInfo: DXFLayerInfo): ImportedNode {
    const points = spline.controlPoints.length > 0 ? spline.controlPoints : spline.fitPoints;

    if (points.length < 2) {
      return {
        type: 'vector',
        layer: spline.layer,
        data: {
          id: this.generateId(),
          type: 'VECTOR',
          name: `Spline`,
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          rotation: 0,
          vectorPaths: [],
          ...this.getAppearance(spline, layerInfo),
        },
      };
    }

    // Scale points
    const scaledPoints = points.map((p) => ({
      x: this.scale(p.x),
      y: this.scale(p.y),
    }));

    // Calculate bounds
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of scaledPoints) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    // Create cubic bezier approximation
    const commands: PathCommand[] = [];
    const firstPoint = scaledPoints[0];
    if (firstPoint) {
      commands.push({ type: 'M', x: firstPoint.x - minX, y: firstPoint.y - minY });
    }

    // Use Catmull-Rom to cubic bezier conversion
    for (let i = 0; i < scaledPoints.length - 1; i++) {
      const p0 = scaledPoints[Math.max(0, i - 1)];
      const p1 = scaledPoints[i];
      const p2 = scaledPoints[i + 1];
      const p3 = scaledPoints[Math.min(scaledPoints.length - 1, i + 2)];
      if (!p0 || !p1 || !p2 || !p3) continue;

      // Catmull-Rom to Bezier control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      commands.push({
        type: 'C',
        x1: cp1x - minX,
        y1: cp1y - minY,
        x2: cp2x - minX,
        y2: cp2y - minY,
        x: p2.x - minX,
        y: p2.y - minY,
      });
    }

    if (spline.closed) {
      commands.push({ type: 'Z' });
    }

    const path: VectorPath = {
      windingRule: 'NONZERO',
      commands,
    };

    return {
      type: 'vector',
      layer: spline.layer,
      data: {
        id: this.generateId(),
        type: 'VECTOR',
        name: `Spline`,
        x: minX,
        y: minY,
        width: maxX - minX || 1,
        height: maxY - minY || 1,
        rotation: 0,
        vectorPaths: [path],
        ...this.getAppearance(spline, layerInfo),
      },
    };
  }

  /**
   * Convert TEXT entity
   */
  private convertText(text: DXFText, layerInfo: DXFLayerInfo): ImportedNode {
    const x = this.scale(text.position.x);
    const y = this.scale(text.position.y);
    const height = this.scale(text.height);
    const color = this.getEntityColor(text, layerInfo);

    // Estimate width based on text length
    const estimatedWidth = text.text.length * height * 0.6 * (text.widthFactor ?? 1);

    return {
      type: 'text',
      layer: text.layer,
      data: {
        id: this.generateId(),
        type: 'TEXT',
        name: `Text`,
        x,
        y: y - height,
        width: estimatedWidth || 100,
        height: height * 1.2,
        rotation: text.rotation,
        characters: text.text,
        textStyles: [
          {
            start: 0,
            end: text.text.length,
            fontFamily: 'Arial',
            fontWeight: 400,
            fontSize: height,
            fills: [{ type: 'SOLID', color: { ...color, a: 1 }, visible: true, opacity: 1 }],
            textDecoration: 'NONE',
            letterSpacing: 0,
            lineHeight: 'AUTO',
          },
        ],
        textAutoResize: 'WIDTH_AND_HEIGHT',
        textAlignHorizontal: this.getTextHAlign(text.horizontalJustification),
        textAlignVertical: 'TOP',
        paragraphSpacing: 0,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'NORMAL',
        fills: [],
        strokes: [],
        strokeWeight: 0,
        strokeAlign: 'CENTER',
        strokeCap: 'NONE',
        strokeJoin: 'MITER',
        strokeMiterLimit: 4,
        dashPattern: [],
        dashOffset: 0,
        effects: [],
      },
    };
  }

  /**
   * Convert MTEXT entity
   */
  private convertMText(mtext: DXFMText, layerInfo: DXFLayerInfo): ImportedNode {
    const x = this.scale(mtext.position.x);
    const y = this.scale(mtext.position.y);
    const height = this.scale(mtext.height);
    const width = this.scale(mtext.width);
    const color = this.getEntityColor(mtext, layerInfo);

    // Strip MTEXT formatting codes
    const cleanText = this.stripMTextFormatting(mtext.text);
    const lineCount = cleanText.split('\n').length;

    return {
      type: 'text',
      layer: mtext.layer,
      data: {
        id: this.generateId(),
        type: 'TEXT',
        name: `MText`,
        x,
        y,
        width,
        height: height * lineCount * 1.2,
        rotation: mtext.rotation,
        characters: cleanText,
        textStyles: [
          {
            start: 0,
            end: cleanText.length,
            fontFamily: 'Arial',
            fontWeight: 400,
            fontSize: height,
            fills: [{ type: 'SOLID', color: { ...color, a: 1 }, visible: true, opacity: 1 }],
            textDecoration: 'NONE',
            letterSpacing: 0,
            lineHeight: 'AUTO',
          },
        ],
        textAutoResize: 'HEIGHT',
        textAlignHorizontal: this.getMTextHAlign(mtext.attachmentPoint),
        textAlignVertical: this.getMTextVAlign(mtext.attachmentPoint),
        paragraphSpacing: 0,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'NORMAL',
        fills: [],
        strokes: [],
        strokeWeight: 0,
        strokeAlign: 'CENTER',
        strokeCap: 'NONE',
        strokeJoin: 'MITER',
        strokeMiterLimit: 4,
        dashPattern: [],
        dashOffset: 0,
        effects: [],
      },
    };
  }

  /**
   * Convert POINT entity
   */
  private convertPoint(point: DXFPointEntity, layerInfo: DXFLayerInfo): ImportedNode {
    const x = this.scale(point.position.x);
    const y = this.scale(point.position.y);
    const size = 4; // Fixed point size

    // Create a small cross for the point
    const path: VectorPath = {
      windingRule: 'NONZERO',
      commands: [
        { type: 'M', x: 0, y: size / 2 },
        { type: 'L', x: size, y: size / 2 },
        { type: 'M', x: size / 2, y: 0 },
        { type: 'L', x: size / 2, y: size },
      ],
    };

    return {
      type: 'vector',
      layer: point.layer,
      data: {
        id: this.generateId(),
        type: 'VECTOR',
        name: `Point`,
        x: x - size / 2,
        y: y - size / 2,
        width: size,
        height: size,
        rotation: 0,
        vectorPaths: [path],
        ...this.getAppearance(point, layerInfo),
      },
    };
  }

  // ==================== Helper Methods ====================

  /**
   * Generate unique node ID
   */
  private generateId(): NodeId {
    return `dxf-${Date.now()}-${this.nodeIdCounter++}` as NodeId;
  }

  /**
   * Scale a value by unit scale
   */
  private scale(value: number): number {
    return value * this.unitScale;
  }

  /**
   * Convert ACI color to RGB
   */
  private aciToRgb(aci: number): { r: number; g: number; b: number } {
    return ACI_COLORS[aci] ?? { r: 255, g: 255, b: 255 };
  }

  /**
   * Get entity color
   */
  private getEntityColor(
    entity: DXFEntity,
    layerInfo: DXFLayerInfo
  ): { r: number; g: number; b: number } {
    if (entity.color) {
      if (entity.color.rgb) {
        return entity.color.rgb;
      }
      if (entity.color.aci === 256) {
        // BYLAYER
        return layerInfo.color;
      }
      return this.aciToRgb(entity.color.aci);
    }
    return layerInfo.color;
  }

  /**
   * Get appearance properties for entity
   */
  private getAppearance(entity: DXFEntity, layerInfo: DXFLayerInfo): Partial<VectorNodeData> {
    const color = this.getEntityColor(entity, layerInfo);
    const strokePaint: Paint = {
      type: 'SOLID',
      color: { r: color.r / 255, g: color.g / 255, b: color.b / 255, a: 1 },
      visible: true,
      opacity: 1,
    };

    return {
      visible: entity.visible !== false && layerInfo.visible,
      locked: layerInfo.locked,
      opacity: 1,
      blendMode: 'NORMAL',
      fills: [],
      strokes: [strokePaint],
      strokeWeight: 1,
      strokeAlign: 'CENTER',
      strokeCap: 'ROUND',
      strokeJoin: 'ROUND',
      strokeMiterLimit: 4,
      dashPattern: [],
      dashOffset: 0,
      effects: [],
    };
  }

  /**
   * Create a full ellipse/circle path
   */
  private createCirclePath(rx: number, ry: number): VectorPath {
    // Use 4 cubic bezier curves to approximate ellipse
    const k = 0.5522847498; // Magic number for circle approximation

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

  /**
   * Create an arc path
   */
  private createArcPath(rx: number, ry: number, startAngle: number, endAngle: number): VectorPath {
    const commands: PathCommand[] = [];

    // Normalize angles
    while (endAngle < startAngle) {
      endAngle += Math.PI * 2;
    }

    const cx = rx;
    const cy = ry;

    // Start point
    const startX = cx + rx * Math.cos(startAngle);
    const startY = cy - ry * Math.sin(startAngle); // Negate Y for screen coords

    commands.push({ type: 'M', x: startX, y: startY });

    // Break arc into segments of max 90 degrees
    let angle = startAngle;
    while (angle < endAngle) {
      const nextAngle = Math.min(angle + Math.PI / 2, endAngle);
      const arcCommands = this.arcToBezier(cx, cy, rx, ry, angle, nextAngle);
      commands.push(...arcCommands);
      angle = nextAngle;
    }

    return {
      windingRule: 'NONZERO',
      commands,
    };
  }

  /**
   * Convert arc segment to bezier curves
   */
  private arcToBezier(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    startAngle: number,
    endAngle: number
  ): PathCommand[] {
    const delta = endAngle - startAngle;
    const t = Math.tan(delta / 4);
    const alpha = (Math.sin(delta) * (Math.sqrt(4 + 3 * t * t) - 1)) / 3;

    const x1 = cx + rx * Math.cos(startAngle);
    const y1 = cy - ry * Math.sin(startAngle);
    const x2 = cx + rx * Math.cos(endAngle);
    const y2 = cy - ry * Math.sin(endAngle);

    const cp1x = x1 - alpha * rx * (-Math.sin(startAngle));
    const cp1y = y1 - alpha * ry * Math.cos(startAngle);
    const cp2x = x2 + alpha * rx * (-Math.sin(endAngle));
    const cp2y = y2 + alpha * ry * Math.cos(endAngle);

    return [
      {
        type: 'C',
        x1: cp1x,
        y1: cp1y,
        x2: cp2x,
        y2: cp2y,
        x: x2,
        y: y2,
      },
    ];
  }

  /**
   * Convert polyline bulge to bezier arc
   */
  private bulgeToArc(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    bulge: number
  ): PathCommand[] {
    // Calculate arc parameters from bulge
    const dx = x2 - x1;
    const dy = y2 - y1;
    const chord = Math.sqrt(dx * dx + dy * dy);
    // sagitta = (bulge * chord) / 2 - not needed for bezier conversion
    const r = (chord / 2 / Math.sin(2 * Math.atan(bulge))) || chord / 2;

    // Calculate center
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const d = Math.sqrt(r * r - (chord / 2) ** 2) * (bulge < 0 ? -1 : 1);
    const cx = mx - (d * dy) / chord;
    const cy = my + (d * dx) / chord;

    // Calculate angles
    const startAngle = Math.atan2(y1 - cy, x1 - cx);
    const endAngle = Math.atan2(y2 - cy, x2 - cx);

    // Use bezier approximation
    return this.arcToBezier(cx, cy, Math.abs(r), Math.abs(r), startAngle, endAngle);
  }

  /**
   * Get arc bounds
   */
  private getArcBounds(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Math.min(cx + r * Math.cos(startAngle), cx + r * Math.cos(endAngle));
    let maxX = Math.max(cx + r * Math.cos(startAngle), cx + r * Math.cos(endAngle));
    let minY = Math.min(cy - r * Math.sin(startAngle), cy - r * Math.sin(endAngle));
    let maxY = Math.max(cy - r * Math.sin(startAngle), cy - r * Math.sin(endAngle));

    // Check cardinal points
    const checkAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    for (const angle of checkAngles) {
      if (this.angleInRange(angle, startAngle, endAngle)) {
        const x = cx + r * Math.cos(angle);
        const y = cy - r * Math.sin(angle);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Check if angle is in range
   */
  private angleInRange(angle: number, start: number, end: number): boolean {
    // Normalize
    while (angle < start) angle += Math.PI * 2;
    while (end < start) end += Math.PI * 2;
    return angle <= end;
  }

  /**
   * Offset path commands
   */
  private offsetPath(path: VectorPath, dx: number, dy: number): VectorPath {
    return {
      ...path,
      commands: path.commands.map((cmd) => {
        if (cmd.type === 'Z') return cmd;
        if (cmd.type === 'C') {
          return {
            ...cmd,
            x: cmd.x + dx,
            y: cmd.y + dy,
            x1: cmd.x1 + dx,
            y1: cmd.y1 + dy,
            x2: cmd.x2 + dx,
            y2: cmd.y2 + dy,
          };
        }
        return { ...cmd, x: cmd.x + dx, y: cmd.y + dy };
      }),
    };
  }

  /**
   * Expand bounds with node
   */
  private expandBounds(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    node: ImportedNode
  ): { minX: number; minY: number; maxX: number; maxY: number } {
    if (node.type === 'group') {
      for (const child of node.children) {
        bounds = this.expandBounds(bounds, child);
      }
      return bounds;
    }

    const data = node.data;
    if ('x' in data && 'y' in data && 'width' in data && 'height' in data) {
      const x = data.x as number;
      const y = data.y as number;
      const w = data.width as number;
      const h = data.height as number;

      return {
        minX: Math.min(bounds.minX, x),
        minY: Math.min(bounds.minY, y),
        maxX: Math.max(bounds.maxX, x + w),
        maxY: Math.max(bounds.maxY, y + h),
      };
    }

    return bounds;
  }

  /**
   * Get text horizontal alignment
   */
  private getTextHAlign(justification?: number): 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED' {
    switch (justification) {
      case 1:
        return 'CENTER';
      case 2:
        return 'RIGHT';
      default:
        return 'LEFT';
    }
  }

  /**
   * Get MText horizontal alignment from attachment point
   */
  private getMTextHAlign(attachmentPoint: number): 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED' {
    const col = (attachmentPoint - 1) % 3;
    switch (col) {
      case 1:
        return 'CENTER';
      case 2:
        return 'RIGHT';
      default:
        return 'LEFT';
    }
  }

  /**
   * Get MText vertical alignment from attachment point
   */
  private getMTextVAlign(attachmentPoint: number): 'TOP' | 'CENTER' | 'BOTTOM' {
    const row = Math.floor((attachmentPoint - 1) / 3);
    switch (row) {
      case 1:
        return 'CENTER';
      case 2:
        return 'BOTTOM';
      default:
        return 'TOP';
    }
  }

  /**
   * Strip MTEXT formatting codes
   */
  private stripMTextFormatting(text: string): string {
    // Remove common MTEXT formatting codes
    return text
      .replace(/\\P/g, '\n') // Paragraph break
      .replace(/\\N/g, '\n') // New line
      .replace(/\\[\\{}]/g, '') // Escaped characters
      .replace(/\\[A-Za-z][^;]*;/g, '') // Format codes like \fArial;
      .replace(/\{[^}]*\}/g, (match) => match.slice(1, -1)) // Remove braces
      .replace(/%%[cduop]/gi, '') // Special characters
      .trim();
  }
}

/**
 * Import DXF file content
 */
export function importDXF(content: string, options?: DXFImportOptions): DXFImportResult {
  const importer = new DXFImporter(options);
  return importer.import(content);
}
