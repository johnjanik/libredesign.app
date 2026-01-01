/**
 * PDF Exporter
 *
 * Export scene graph nodes to PDF format for print.
 * Uses a lightweight PDF generation approach without external dependencies.
 */

import type { NodeId } from '@core/types/common';
import type { Rect, VectorPath } from '@core/types/geometry';
import type { RGBA } from '@core/types/color';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { FrameNodeData, VectorNodeData, TextNodeData } from '@scene/nodes/base-node';

/**
 * PDF export options
 */
export interface PDFExportOptions {
  /** Page width in points (default: 612 = US Letter) */
  pageWidth?: number | undefined;
  /** Page height in points (default: 792 = US Letter) */
  pageHeight?: number | undefined;
  /** Page orientation (default: 'portrait') */
  orientation?: 'portrait' | 'landscape' | undefined;
  /** Scale factor (default: 1) */
  scale?: number | undefined;
  /** Padding in points (default: 36 = 0.5 inch) */
  padding?: number | undefined;
  /** Title metadata */
  title?: string | undefined;
  /** Author metadata */
  author?: string | undefined;
  /** Whether to include bleed marks (default: false) */
  includeBleedMarks?: boolean | undefined;
  /** Bleed size in points (default: 9 = 1/8 inch) */
  bleedSize?: number | undefined;
  /** Color space (default: 'RGB') */
  colorSpace?: 'RGB' | 'CMYK' | undefined;
}

/**
 * PDF export result
 */
export interface PDFExportResult {
  readonly blob: Blob;
  readonly pageCount: number;
  readonly url: string;
}

/**
 * Standard page sizes in points (1 point = 1/72 inch)
 */
export const PageSizes = {
  LETTER: { width: 612, height: 792 },
  LEGAL: { width: 612, height: 1008 },
  TABLOID: { width: 792, height: 1224 },
  A4: { width: 595.28, height: 841.89 },
  A3: { width: 841.89, height: 1190.55 },
  A5: { width: 419.53, height: 595.28 },
} as const;

/**
 * PDF Writer - low-level PDF generation
 */
class PDFWriter {
  private objects: string[] = [];
  private objectOffsets: number[] = [];
  private pageObjectIds: number[] = [];
  private contentStreamIds: number[] = [];
  private resourcesId = 0;
  private catalogId = 0;
  private pagesId = 0;
  private fontIds: Map<string, number> = new Map();

  constructor(_options: { title?: string; author?: string } = {}) {}

  /**
   * Create a new PDF object and return its ID
   */
  private addObject(content: string): number {
    const id = this.objects.length + 1;
    this.objects.push(content);
    return id;
  }

  /**
   * Initialize the PDF structure
   */
  init(): void {
    // Reserve IDs for catalog and pages
    this.catalogId = this.addObject(''); // placeholder
    this.pagesId = this.addObject(''); // placeholder
    this.resourcesId = this.addObject(''); // placeholder

    // Add base fonts
    this.fontIds.set('sans-serif', this.addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`));
    this.fontIds.set('serif', this.addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>`));
    this.fontIds.set('monospace', this.addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>`));
  }

  /**
   * Add a page with content
   */
  addPage(
    width: number,
    height: number,
    contentStream: string
  ): void {
    // Create content stream object
    const streamData = `stream\n${contentStream}\nendstream`;
    const contentId = this.addObject(
      `<< /Length ${contentStream.length} >>\n${streamData}`
    );
    this.contentStreamIds.push(contentId);

    // Create page object
    const pageId = this.addObject(
      `<< /Type /Page /Parent ${this.pagesId} 0 R /MediaBox [0 0 ${width} ${height}] /Contents ${contentId} 0 R /Resources ${this.resourcesId} 0 R >>`
    );
    this.pageObjectIds.push(pageId);
  }

  /**
   * Finalize and generate the PDF data
   */
  finalize(): Uint8Array {
    // Update placeholder objects
    const fontRefs = Array.from(this.fontIds.entries())
      .map(([_name, id], index) => `/F${index + 1} ${id} 0 R`)
      .join(' ');

    this.objects[this.resourcesId - 1] = `<< /Font << ${fontRefs} >> >>`;

    const pageRefs = this.pageObjectIds.map(id => `${id} 0 R`).join(' ');
    this.objects[this.pagesId - 1] = `<< /Type /Pages /Kids [${pageRefs}] /Count ${this.pageObjectIds.length} >>`;
    this.objects[this.catalogId - 1] = `<< /Type /Catalog /Pages ${this.pagesId} 0 R >>`;

    // Build the PDF
    const parts: string[] = [];

    // Header
    parts.push('%PDF-1.4\n');
    parts.push('%\xE2\xE3\xCF\xD3\n'); // Binary marker

    // Objects
    this.objectOffsets = [];
    let offset = parts.join('').length;

    for (let i = 0; i < this.objects.length; i++) {
      this.objectOffsets.push(offset);
      const objStr = `${i + 1} 0 obj\n${this.objects[i]}\nendobj\n`;
      parts.push(objStr);
      offset += objStr.length;
    }

    // Cross-reference table
    const xrefOffset = offset;
    parts.push('xref\n');
    parts.push(`0 ${this.objects.length + 1}\n`);
    parts.push('0000000000 65535 f \n');

    for (const objOffset of this.objectOffsets) {
      parts.push(`${objOffset.toString().padStart(10, '0')} 00000 n \n`);
    }

    // Trailer
    parts.push('trailer\n');
    parts.push(`<< /Size ${this.objects.length + 1} /Root ${this.catalogId} 0 R >>\n`);
    parts.push('startxref\n');
    parts.push(`${xrefOffset}\n`);
    parts.push('%%EOF\n');

    const pdfString = parts.join('');
    const encoder = new TextEncoder();
    return encoder.encode(pdfString);
  }

  /**
   * Get font ID for a font family
   */
  getFontId(fontFamily: string): number {
    if (fontFamily.includes('mono') || fontFamily.includes('courier')) {
      return 3;
    }
    if (fontFamily.includes('serif') && !fontFamily.includes('sans')) {
      return 2;
    }
    return 1; // Default to Helvetica
  }
}

/**
 * PDF content stream builder
 */
class PDFContentBuilder {
  private commands: string[] = [];
  private precision = 2;

  /**
   * Save graphics state
   */
  save(): this {
    this.commands.push('q');
    return this;
  }

  /**
   * Restore graphics state
   */
  restore(): this {
    this.commands.push('Q');
    return this;
  }

  /**
   * Set transformation matrix
   */
  transform(a: number, b: number, c: number, d: number, e: number, f: number): this {
    this.commands.push(
      `${this.round(a)} ${this.round(b)} ${this.round(c)} ${this.round(d)} ${this.round(e)} ${this.round(f)} cm`
    );
    return this;
  }

  /**
   * Translate
   */
  translate(x: number, y: number): this {
    return this.transform(1, 0, 0, 1, x, y);
  }

  /**
   * Scale
   */
  scale(sx: number, sy: number): this {
    return this.transform(sx, 0, 0, sy, 0, 0);
  }

  /**
   * Rotate (degrees)
   */
  rotate(degrees: number): this {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return this.transform(cos, sin, -sin, cos, 0, 0);
  }

  /**
   * Set fill color (RGB)
   */
  setFillColor(r: number, g: number, b: number): this {
    this.commands.push(`${this.round(r)} ${this.round(g)} ${this.round(b)} rg`);
    return this;
  }

  /**
   * Set stroke color (RGB)
   */
  setStrokeColor(r: number, g: number, b: number): this {
    this.commands.push(`${this.round(r)} ${this.round(g)} ${this.round(b)} RG`);
    return this;
  }

  /**
   * Set line width
   */
  setLineWidth(width: number): this {
    this.commands.push(`${this.round(width)} w`);
    return this;
  }

  /**
   * Set line cap style
   */
  setLineCap(cap: 0 | 1 | 2): this {
    this.commands.push(`${cap} J`);
    return this;
  }

  /**
   * Set line join style
   */
  setLineJoin(join: 0 | 1 | 2): this {
    this.commands.push(`${join} j`);
    return this;
  }

  /**
   * Draw a rectangle
   */
  rect(x: number, y: number, w: number, h: number): this {
    this.commands.push(`${this.round(x)} ${this.round(y)} ${this.round(w)} ${this.round(h)} re`);
    return this;
  }

  /**
   * Move to point
   */
  moveTo(x: number, y: number): this {
    this.commands.push(`${this.round(x)} ${this.round(y)} m`);
    return this;
  }

  /**
   * Line to point
   */
  lineTo(x: number, y: number): this {
    this.commands.push(`${this.round(x)} ${this.round(y)} l`);
    return this;
  }

  /**
   * Cubic bezier curve
   */
  curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): this {
    this.commands.push(
      `${this.round(x1)} ${this.round(y1)} ${this.round(x2)} ${this.round(y2)} ${this.round(x)} ${this.round(y)} c`
    );
    return this;
  }

  /**
   * Close path
   */
  closePath(): this {
    this.commands.push('h');
    return this;
  }

  /**
   * Fill the path
   */
  fill(): this {
    this.commands.push('f');
    return this;
  }

  /**
   * Stroke the path
   */
  stroke(): this {
    this.commands.push('S');
    return this;
  }

  /**
   * Fill and stroke the path
   */
  fillStroke(): this {
    this.commands.push('B');
    return this;
  }

  /**
   * Clip to current path
   */
  clip(): this {
    this.commands.push('W n');
    return this;
  }

  /**
   * Begin text object
   */
  beginText(): this {
    this.commands.push('BT');
    return this;
  }

  /**
   * End text object
   */
  endText(): this {
    this.commands.push('ET');
    return this;
  }

  /**
   * Set font
   */
  setFont(fontId: number, size: number): this {
    this.commands.push(`/F${fontId} ${this.round(size)} Tf`);
    return this;
  }

  /**
   * Set text position
   */
  textPosition(x: number, y: number): this {
    this.commands.push(`${this.round(x)} ${this.round(y)} Td`);
    return this;
  }

  /**
   * Show text
   */
  showText(text: string): this {
    // Escape special characters
    const escaped = text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    this.commands.push(`(${escaped}) Tj`);
    return this;
  }

  /**
   * Set transparency (alpha)
   */
  setAlpha(_alpha: number): this {
    // Note: This requires ExtGState resources, simplified for now
    return this;
  }

  /**
   * Draw vector path
   */
  drawPath(path: VectorPath): this {
    for (const cmd of path.commands) {
      switch (cmd.type) {
        case 'M':
          this.moveTo(cmd.x, cmd.y);
          break;
        case 'L':
          this.lineTo(cmd.x, cmd.y);
          break;
        case 'C':
          this.curveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
          break;
        case 'Z':
          this.closePath();
          break;
      }
    }
    return this;
  }

  /**
   * Build the content stream string
   */
  build(): string {
    return this.commands.join('\n');
  }

  private round(value: number): string {
    return value.toFixed(this.precision);
  }
}

/**
 * PDF Exporter
 */
export class PDFExporter {
  private sceneGraph: SceneGraph;

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  /**
   * Export a node to PDF.
   */
  export(nodeId: NodeId, options: PDFExportOptions = {}): PDFExportResult {
    let pageWidth = options.pageWidth ?? PageSizes.LETTER.width;
    let pageHeight = options.pageHeight ?? PageSizes.LETTER.height;
    const orientation = options.orientation ?? 'portrait';
    const scale = options.scale ?? 1;
    const padding = options.padding ?? 36;
    const includeBleedMarks = options.includeBleedMarks ?? false;
    const bleedSize = options.bleedSize ?? 9;

    // Swap dimensions for landscape
    if (orientation === 'landscape') {
      [pageWidth, pageHeight] = [pageHeight, pageWidth];
    }

    // Get node bounds
    const bounds = this.getNodeBounds(nodeId);
    if (!bounds) {
      throw new Error(`Cannot get bounds for node: ${nodeId}`);
    }

    // Calculate scaling to fit content
    const contentWidth = pageWidth - padding * 2;
    const contentHeight = pageHeight - padding * 2;
    const fitScale = Math.min(
      contentWidth / bounds.width,
      contentHeight / bounds.height,
      scale
    );

    // Create PDF writer
    const writer = new PDFWriter();
    writer.init();

    // Build content stream
    const content = new PDFContentBuilder();

    // PDF coordinate system is bottom-left origin, flip Y
    content.save();
    content.translate(0, pageHeight);
    content.scale(1, -1);

    // Apply padding and scaling
    content.translate(padding, padding);
    content.scale(fitScale, fitScale);
    content.translate(-bounds.x, -bounds.y);

    // Render bleed marks if requested
    if (includeBleedMarks) {
      this.renderBleedMarks(content, pageWidth, pageHeight, bleedSize);
    }

    // Render the node tree
    this.renderNode(content, nodeId, writer);

    content.restore();

    // Add page to PDF
    writer.addPage(pageWidth, pageHeight, content.build());

    // Generate PDF data
    const pdfData = writer.finalize();
    const blob = new Blob([pdfData as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    return {
      blob,
      pageCount: 1,
      url,
    };
  }

  /**
   * Export multiple pages to PDF.
   */
  exportMultiPage(
    nodeIds: NodeId[],
    options: PDFExportOptions = {}
  ): PDFExportResult {
    if (nodeIds.length === 0) {
      throw new Error('No nodes to export');
    }

    if (nodeIds.length === 1) {
      return this.export(nodeIds[0]!, options);
    }

    let pageWidth = options.pageWidth ?? PageSizes.LETTER.width;
    let pageHeight = options.pageHeight ?? PageSizes.LETTER.height;
    const orientation = options.orientation ?? 'portrait';
    const scale = options.scale ?? 1;
    const padding = options.padding ?? 36;

    if (orientation === 'landscape') {
      [pageWidth, pageHeight] = [pageHeight, pageWidth];
    }

    const writer = new PDFWriter();
    writer.init();

    for (const nodeId of nodeIds) {
      const bounds = this.getNodeBounds(nodeId);
      if (!bounds) continue;

      const contentWidth = pageWidth - padding * 2;
      const contentHeight = pageHeight - padding * 2;
      const fitScale = Math.min(
        contentWidth / bounds.width,
        contentHeight / bounds.height,
        scale
      );

      const content = new PDFContentBuilder();
      content.save();
      content.translate(0, pageHeight);
      content.scale(1, -1);
      content.translate(padding, padding);
      content.scale(fitScale, fitScale);
      content.translate(-bounds.x, -bounds.y);

      this.renderNode(content, nodeId, writer);

      content.restore();
      writer.addPage(pageWidth, pageHeight, content.build());
    }

    const pdfData = writer.finalize();
    const blob = new Blob([pdfData as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    return {
      blob,
      pageCount: nodeIds.length,
      url,
    };
  }

  /**
   * Export all pages in the document.
   */
  exportDocument(options: PDFExportOptions = {}): PDFExportResult {
    const doc = this.sceneGraph.getDocument();
    if (!doc) {
      throw new Error('No document in scene graph');
    }

    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) {
      throw new Error('No pages in document');
    }

    return this.exportMultiPage(pageIds, options);
  }

  /**
   * Download the exported PDF.
   */
  download(
    nodeId: NodeId,
    filename: string = 'export.pdf',
    options: PDFExportOptions = {}
  ): void {
    const result = this.export(nodeId, options);

    const link = document.createElement('a');
    link.href = result.url;
    link.download = filename;
    link.click();

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

  private renderBleedMarks(
    content: PDFContentBuilder,
    pageWidth: number,
    pageHeight: number,
    bleedSize: number
  ): void {
    content.save();
    content.setStrokeColor(0, 0, 0);
    content.setLineWidth(0.5);

    const markLength = 12;

    // Top-left corner marks
    content.moveTo(bleedSize, 0);
    content.lineTo(bleedSize, markLength);
    content.moveTo(0, bleedSize);
    content.lineTo(markLength, bleedSize);

    // Top-right corner marks
    content.moveTo(pageWidth - bleedSize, 0);
    content.lineTo(pageWidth - bleedSize, markLength);
    content.moveTo(pageWidth, bleedSize);
    content.lineTo(pageWidth - markLength, bleedSize);

    // Bottom-left corner marks
    content.moveTo(bleedSize, pageHeight);
    content.lineTo(bleedSize, pageHeight - markLength);
    content.moveTo(0, pageHeight - bleedSize);
    content.lineTo(markLength, pageHeight - bleedSize);

    // Bottom-right corner marks
    content.moveTo(pageWidth - bleedSize, pageHeight);
    content.lineTo(pageWidth - bleedSize, pageHeight - markLength);
    content.moveTo(pageWidth, pageHeight - bleedSize);
    content.lineTo(pageWidth - markLength, pageHeight - bleedSize);

    content.stroke();
    content.restore();
  }

  private renderNode(
    content: PDFContentBuilder,
    nodeId: NodeId,
    writer: PDFWriter
  ): void {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return;

    if ('visible' in node && !(node as { visible: boolean }).visible) {
      return;
    }

    content.save();

    // Apply node transform
    if ('x' in node && 'y' in node) {
      const n = node as { x: number; y: number; rotation?: number };
      content.translate(n.x, n.y);

      if (n.rotation) {
        if ('width' in node && 'height' in node) {
          const dims = node as { width: number; height: number };
          content.translate(dims.width / 2, dims.height / 2);
          content.rotate(n.rotation);
          content.translate(-dims.width / 2, -dims.height / 2);
        } else {
          content.rotate(n.rotation);
        }
      }
    }

    // Render based on node type
    switch (node.type) {
      case 'FRAME':
        this.renderFrame(content, node as FrameNodeData);
        break;
      case 'VECTOR':
        this.renderVector(content, node as VectorNodeData);
        break;
      case 'TEXT':
        this.renderText(content, node as TextNodeData, writer);
        break;
    }

    // Render children
    const childIds = this.sceneGraph.getChildIds(nodeId);
    for (const childId of childIds) {
      content.save();
      if ('x' in node && 'y' in node) {
        const n = node as { x: number; y: number };
        content.translate(-n.x, -n.y);
      }
      this.renderNode(content, childId, writer);
      content.restore();
    }

    content.restore();
  }

  private renderFrame(content: PDFContentBuilder, node: FrameNodeData): void {
    const fills = node.fills ?? [];

    for (const fill of fills) {
      if (fill.visible === false || fill.type !== 'SOLID') continue;
      if (!('color' in fill)) continue;

      const solidFill = fill as { type: 'SOLID'; color: RGBA };
      content.setFillColor(solidFill.color.r, solidFill.color.g, solidFill.color.b);
      content.rect(0, 0, node.width, node.height);
      content.fill();
    }
  }

  private renderVector(content: PDFContentBuilder, node: VectorNodeData): void {
    const path = node.vectorPaths?.[0];
    if (!path) return;

    const fills = node.fills ?? [];
    const strokes = node.strokes ?? [];

    // Draw fill
    for (const fill of fills) {
      if (fill.visible === false || fill.type !== 'SOLID') continue;
      if (!('color' in fill)) continue;

      const solidFill = fill as { type: 'SOLID'; color: RGBA };
      content.setFillColor(solidFill.color.r, solidFill.color.g, solidFill.color.b);
      content.drawPath(path);
      content.fill();
    }

    // Draw stroke
    for (const stroke of strokes) {
      if (stroke.visible === false || stroke.type !== 'SOLID') continue;
      if (!('color' in stroke)) continue;

      const solidStroke = stroke as { type: 'SOLID'; color: RGBA };
      content.setStrokeColor(solidStroke.color.r, solidStroke.color.g, solidStroke.color.b);
      content.setLineWidth(node.strokeWeight ?? 1);
      content.drawPath(path);
      content.stroke();
    }
  }

  private renderText(
    content: PDFContentBuilder,
    node: TextNodeData,
    writer: PDFWriter
  ): void {
    const firstStyle = node.textStyles[0];
    const fontSize = firstStyle?.fontSize ?? 12;
    const fontFamily = firstStyle?.fontFamily ?? 'sans-serif';
    const fontId = writer.getFontId(fontFamily);

    // Get fill color
    const fills = node.fills as unknown as { type: string; visible?: boolean; color: RGBA }[] | undefined;
    const solidFill = fills?.find(f => f.type === 'SOLID' && f.visible !== false);

    if (solidFill && solidFill.type === 'SOLID') {
      const c = solidFill.color;
      content.setFillColor(c.r, c.g, c.b);
    }

    content.beginText();
    content.setFont(fontId, fontSize);
    content.textPosition(0, fontSize); // Baseline adjustment
    content.showText(node.characters);
    content.endText();
  }
}

/**
 * Create a PDF exporter.
 */
export function createPDFExporter(sceneGraph: SceneGraph): PDFExporter {
  return new PDFExporter(sceneGraph);
}
