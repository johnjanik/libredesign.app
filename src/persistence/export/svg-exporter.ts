/**
 * SVG Exporter
 *
 * Export scene graph nodes to SVG format.
 */

import type { NodeId } from '@core/types/common';
import type { Rect, VectorPath, PathCommand } from '@core/types/geometry';
import type { RGBA } from '@core/types/color';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeData, FrameNodeData, VectorNodeData, TextNodeData } from '@scene/nodes/base-node';

/**
 * SVG export options
 */
export interface SVGExportOptions {
  /** Whether to include XML declaration (default: true) */
  includeXmlDeclaration?: boolean | undefined;
  /** Whether to include viewBox attribute (default: true) */
  includeViewBox?: boolean | undefined;
  /** Whether to embed fonts (default: false) */
  embedFonts?: boolean | undefined;
  /** Padding around content (default: 0) */
  padding?: number | undefined;
  /** Number of decimal places for coordinates (default: 2) */
  precision?: number | undefined;
  /** Whether to minify output (default: false) */
  minify?: boolean | undefined;
}

/**
 * SVG export result
 */
export interface SVGExportResult {
  readonly svg: string;
  readonly width: number;
  readonly height: number;
  readonly blob: Blob;
  readonly url: string;
}

/**
 * SVG Exporter
 */
export class SVGExporter {
  private sceneGraph: SceneGraph;

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  /**
   * Export a node to SVG.
   */
  export(nodeId: NodeId, options: SVGExportOptions = {}): SVGExportResult {
    const includeXmlDeclaration = options.includeXmlDeclaration ?? true;
    const includeViewBox = options.includeViewBox ?? true;
    const padding = options.padding ?? 0;
    const precision = options.precision ?? 2;
    const minify = options.minify ?? false;

    // Get node bounds
    const bounds = this.getNodeBounds(nodeId);
    if (!bounds) {
      throw new Error(`Cannot get bounds for node: ${nodeId}`);
    }

    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;

    const nl = minify ? '' : '\n';
    const indent = minify ? '' : '  ';

    // Build SVG
    const parts: string[] = [];

    if (includeXmlDeclaration) {
      parts.push(`<?xml version="1.0" encoding="UTF-8"?>${nl}`);
    }

    const viewBox = includeViewBox
      ? ` viewBox="${bounds.x - padding} ${bounds.y - padding} ${width} ${height}"`
      : '';

    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"${viewBox}>${nl}`);

    // Add definitions (gradients, patterns, etc.)
    const defs = this.collectDefinitions(nodeId);
    if (defs.length > 0) {
      parts.push(`${indent}<defs>${nl}`);
      for (const def of defs) {
        parts.push(`${indent}${indent}${def}${nl}`);
      }
      parts.push(`${indent}</defs>${nl}`);
    }

    // Render node content
    const content = this.renderNode(nodeId, precision, indent);
    parts.push(content);

    parts.push(`</svg>`);

    const svg = parts.join('');
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    return {
      svg,
      width,
      height,
      blob,
      url,
    };
  }

  /**
   * Export multiple nodes to SVG.
   */
  exportMultiple(nodeIds: NodeId[], options: SVGExportOptions = {}): SVGExportResult {
    if (nodeIds.length === 0) {
      throw new Error('No nodes to export');
    }

    if (nodeIds.length === 1) {
      return this.export(nodeIds[0]!, options);
    }

    const includeXmlDeclaration = options.includeXmlDeclaration ?? true;
    const includeViewBox = options.includeViewBox ?? true;
    const padding = options.padding ?? 0;
    const precision = options.precision ?? 2;
    const minify = options.minify ?? false;

    // Calculate combined bounds
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const nodeId of nodeIds) {
      const bounds = this.getNodeBounds(nodeId);
      if (bounds) {
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }
    }

    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const nl = minify ? '' : '\n';
    const indent = minify ? '' : '  ';

    // Build SVG
    const parts: string[] = [];

    if (includeXmlDeclaration) {
      parts.push(`<?xml version="1.0" encoding="UTF-8"?>${nl}`);
    }

    const viewBox = includeViewBox
      ? ` viewBox="${minX - padding} ${minY - padding} ${width} ${height}"`
      : '';

    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"${viewBox}>${nl}`);

    // Render nodes
    for (const nodeId of nodeIds) {
      const content = this.renderNode(nodeId, precision, indent);
      parts.push(content);
    }

    parts.push(`</svg>`);

    const svg = parts.join('');
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    return {
      svg,
      width,
      height,
      blob,
      url,
    };
  }

  /**
   * Export current page to SVG.
   */
  exportPage(options: SVGExportOptions = {}): SVGExportResult {
    const doc = this.sceneGraph.getDocument();
    if (!doc) {
      throw new Error('No document in scene graph');
    }

    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) {
      throw new Error('No pages in document');
    }

    return this.export(pageIds[0]!, options);
  }

  /**
   * Download the exported SVG.
   */
  download(
    nodeId: NodeId,
    filename: string = 'export.svg',
    options: SVGExportOptions = {}
  ): void {
    const result = this.export(nodeId, options);

    const link = document.createElement('a');
    link.href = result.url;
    link.download = filename;
    link.click();

    // Clean up
    URL.revokeObjectURL(result.url);
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private getNodeBounds(nodeId: NodeId): Rect | null {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return null;

    if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
      const n = node as { x: number; y: number; width: number; height: number };
      return { x: n.x, y: n.y, width: n.width, height: n.height };
    }

    // For containers, calculate bounds from children
    const childIds = this.sceneGraph.getChildIds(nodeId);
    if (childIds.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const childId of childIds) {
      const childBounds = this.getNodeBounds(childId);
      if (childBounds) {
        minX = Math.min(minX, childBounds.x);
        minY = Math.min(minY, childBounds.y);
        maxX = Math.max(maxX, childBounds.x + childBounds.width);
        maxY = Math.max(maxY, childBounds.y + childBounds.height);
      }
    }

    if (minX === Infinity) return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private collectDefinitions(_nodeId: NodeId): string[] {
    // Collect gradient and pattern definitions
    // For now, return empty array - will add gradient support later
    return [];
  }

  private renderNode(nodeId: NodeId, precision: number, indent: string): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '';

    // Skip invisible nodes
    if ('visible' in node && !(node as { visible: boolean }).visible) {
      return '';
    }

    const parts: string[] = [];

    // Render based on node type
    switch (node.type) {
      case 'FRAME':
        parts.push(this.renderFrame(node as FrameNodeData, precision, indent));
        break;
      case 'VECTOR':
        parts.push(this.renderVector(node as VectorNodeData, precision, indent));
        break;
      case 'TEXT':
        parts.push(this.renderText(node as TextNodeData, precision, indent));
        break;
      case 'GROUP':
        parts.push(this.renderGroup(nodeId, node, precision, indent));
        break;
    }

    // Render children for container nodes
    if (node.type === 'FRAME' || node.type === 'PAGE') {
      const childIds = this.sceneGraph.getChildIds(nodeId);
      for (const childId of childIds) {
        parts.push(this.renderNode(childId, precision, indent));
      }
    }

    return parts.join('');
  }

  private renderFrame(node: FrameNodeData, precision: number, indent: string): string {
    const x = this.round(node.x, precision);
    const y = this.round(node.y, precision);
    const width = this.round(node.width, precision);
    const height = this.round(node.height, precision);

    const fill = this.getFillAttribute(node.fills);
    const opacity = this.getOpacityAttribute(node.opacity);
    const transform = this.getTransformAttribute(node);

    return `${indent}<rect x="${x}" y="${y}" width="${width}" height="${height}"${fill}${opacity}${transform}/>\n`;
  }

  private renderVector(node: VectorNodeData, precision: number, indent: string): string {
    const path = node.vectorPaths?.[0];
    if (!path) return '';

    const d = this.pathToSVG(path, precision);
    const fill = this.getFillAttribute(node.fills);
    const stroke = this.getStrokeAttribute(node.strokes, node.strokeWeight);
    const opacity = this.getOpacityAttribute(node.opacity);
    const transform = this.getTransformAttribute(node);

    return `${indent}<path d="${d}"${fill}${stroke}${opacity}${transform}/>\n`;
  }

  private renderText(node: TextNodeData, precision: number, indent: string): string {
    // Get font info from first text style
    const firstStyle = node.textStyles[0];
    const fontSize = firstStyle?.fontSize ?? 12;
    const fontFamily = firstStyle?.fontFamily ?? 'sans-serif';
    const fontWeight = firstStyle?.fontWeight ?? 400;

    const x = this.round(node.x, precision);
    const y = this.round(node.y + fontSize, precision); // Baseline adjustment
    const fill = this.getFillAttribute(node.fills);
    const opacity = this.getOpacityAttribute(node.opacity);
    const transform = this.getTransformAttribute(node);

    const style = ` style="font-size:${fontSize}px;font-family:${fontFamily};font-weight:${fontWeight}"`;
    const escapedText = this.escapeXml(node.characters);

    return `${indent}<text x="${x}" y="${y}"${fill}${opacity}${transform}${style}>${escapedText}</text>\n`;
  }

  private renderGroup(nodeId: NodeId, node: NodeData, precision: number, indent: string): string {
    const opacity = this.getOpacityAttribute((node as { opacity?: number }).opacity);
    const transform = this.getTransformAttribute(node);

    const parts: string[] = [];
    parts.push(`${indent}<g${opacity}${transform}>\n`);

    const childIds = this.sceneGraph.getChildIds(nodeId);
    for (const childId of childIds) {
      parts.push(this.renderNode(childId, precision, indent + '  '));
    }

    parts.push(`${indent}</g>\n`);
    return parts.join('');
  }

  private pathToSVG(path: VectorPath, precision: number): string {
    const parts: string[] = [];

    for (const cmd of path.commands) {
      parts.push(this.commandToSVG(cmd, precision));
    }

    return parts.join(' ');
  }

  private commandToSVG(cmd: PathCommand, precision: number): string {
    switch (cmd.type) {
      case 'M':
        return `M ${this.round(cmd.x, precision)} ${this.round(cmd.y, precision)}`;
      case 'L':
        return `L ${this.round(cmd.x, precision)} ${this.round(cmd.y, precision)}`;
      case 'C':
        return `C ${this.round(cmd.x1, precision)} ${this.round(cmd.y1, precision)} ${this.round(cmd.x2, precision)} ${this.round(cmd.y2, precision)} ${this.round(cmd.x, precision)} ${this.round(cmd.y, precision)}`;
      case 'Z':
        return 'Z';
    }
  }

  private getFillAttribute(fills: FrameNodeData['fills']): string {
    if (!fills || fills.length === 0) {
      return ' fill="none"';
    }

    const solidFill = fills.find(f => f.type === 'SOLID' && f.visible !== false);
    if (solidFill && solidFill.type === 'SOLID') {
      const color = this.colorToCSS(solidFill.color, solidFill.opacity);
      return ` fill="${color}"`;
    }

    return ' fill="none"';
  }

  private getStrokeAttribute(
    strokes: VectorNodeData['strokes'],
    strokeWeight: number | undefined
  ): string {
    if (!strokes || strokes.length === 0) {
      return '';
    }

    const solidStroke = strokes.find(s => s.type === 'SOLID' && s.visible !== false);
    if (solidStroke && solidStroke.type === 'SOLID') {
      const color = this.colorToCSS(solidStroke.color, solidStroke.opacity);
      const width = strokeWeight ?? 1;
      return ` stroke="${color}" stroke-width="${width}"`;
    }

    return '';
  }

  private getOpacityAttribute(opacity: number | undefined): string {
    if (opacity === undefined || opacity === 1) {
      return '';
    }
    return ` opacity="${opacity}"`;
  }

  private getTransformAttribute(node: NodeData): string {
    if (!('rotation' in node)) return '';

    const rotation = (node as { rotation?: number }).rotation;
    if (!rotation || rotation === 0) return '';

    // Get center point for rotation
    if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
      const n = node as { x: number; y: number; width: number; height: number };
      const cx = n.x + n.width / 2;
      const cy = n.y + n.height / 2;
      return ` transform="rotate(${rotation} ${cx} ${cy})"`;
    }

    return '';
  }

  private colorToCSS(color: RGBA, opacity?: number): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a * (opacity ?? 1);

    if (a === 1) {
      return `rgb(${r},${g},${b})`;
    }
    return `rgba(${r},${g},${b},${a.toFixed(2)})`;
  }

  private round(value: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * Create an SVG exporter.
 */
export function createSVGExporter(sceneGraph: SceneGraph): SVGExporter {
  return new SVGExporter(sceneGraph);
}
