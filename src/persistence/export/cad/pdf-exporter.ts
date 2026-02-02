/**
 * PDF Exporter
 *
 * Exports DesignLibre scene nodes to PDF format.
 * Generates PDF 1.4 compatible files with vector graphics.
 */

import type { NodeId } from '@core/types/common';
import type { VectorPath } from '@core/types/geometry';
import type { Paint } from '@core/types/paint';

/**
 * Node data for export
 */
export interface PDFExportableNode {
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
  cornerRadius?: number;
  childIds?: readonly NodeId[];
  // Text properties
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
}

/**
 * PDF export options
 */
export interface PDFExportOptions {
  /** Page width in points (72 points = 1 inch) */
  pageWidth?: number;
  /** Page height in points */
  pageHeight?: number;
  /** Page size preset */
  pageSize?: 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'LETTER' | 'LEGAL' | 'TABLOID' | 'CUSTOM';
  /** Page orientation */
  orientation?: 'portrait' | 'landscape';
  /** Scale factor */
  scale?: number;
  /** Margin in points */
  margin?: number;
  /** PDF title */
  title?: string;
  /** PDF author */
  author?: string;
  /** Include stroke */
  includeStrokes?: boolean;
  /** Include fills */
  includeFills?: boolean;
  /** Export as grayscale */
  grayscale?: boolean;
  /** Convert units */
  sourceUnit?: 'px' | 'mm' | 'in';
}

/**
 * Page size presets in points (1 point = 1/72 inch)
 */
const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  A3: { width: 841.89, height: 1190.55 },
  A2: { width: 1190.55, height: 1683.78 },
  A1: { width: 1683.78, height: 2383.94 },
  A0: { width: 2383.94, height: 3370.39 },
  LETTER: { width: 612, height: 792 },
  LEGAL: { width: 612, height: 1008 },
  TABLOID: { width: 792, height: 1224 },
  CUSTOM: { width: 612, height: 792 },
} as const;

/**
 * PDF Exporter class
 */
export class PDFExporter {
  private options: Required<PDFExportOptions>;
  private objects: string[] = [];
  private objectOffsets: number[] = [];
  private currentOffset = 0;
  private content: string[] = [];
  private pageWidth = 612;
  private pageHeight = 792;
  private scale = 1;
  private margin = 36; // 0.5 inch

  constructor(options: PDFExportOptions = {}) {
    const pageSize = options.pageSize ?? 'A4';
    const orientation = options.orientation ?? 'portrait';

    const size = PAGE_SIZES[pageSize];
    let width: number = size.width;
    let height: number = size.height;
    if (orientation === 'landscape') {
      const tmp = width;
      width = height;
      height = tmp;
    }

    this.options = {
      pageWidth: options.pageWidth ?? width,
      pageHeight: options.pageHeight ?? height,
      pageSize,
      orientation,
      scale: options.scale ?? 1,
      margin: options.margin ?? 36,
      title: options.title ?? 'DesignLibre Export',
      author: options.author ?? 'DesignLibre',
      includeStrokes: options.includeStrokes ?? true,
      includeFills: options.includeFills ?? true,
      grayscale: options.grayscale ?? false,
      sourceUnit: options.sourceUnit ?? 'px',
    };

    this.pageWidth = this.options.pageWidth;
    this.pageHeight = this.options.pageHeight;
    this.margin = this.options.margin;
    this.scale = this.options.scale * this.getUnitScale();
  }

  /**
   * Get unit conversion scale (to points)
   */
  private getUnitScale(): number {
    switch (this.options.sourceUnit) {
      case 'mm': return 72 / 25.4;
      case 'in': return 72;
      default: return 72 / 96; // px to points (96 DPI)
    }
  }

  /**
   * Export nodes to PDF string
   */
  export(nodes: PDFExportableNode[], getNode?: (id: NodeId) => PDFExportableNode | null): string {
    this.objects = [];
    this.objectOffsets = [];
    this.currentOffset = 0;
    this.content = [];

    // Calculate bounds
    const bounds = this.calculateBounds(nodes);

    // Build PDF content stream
    this.buildContentStream(nodes, bounds, getNode);

    // Build PDF structure
    return this.buildPDF();
  }

  /**
   * Calculate drawing bounds
   */
  private calculateBounds(nodes: PDFExportableNode[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const node of nodes) {
      if (!node.visible) continue;
      const x = node.x * this.scale;
      const y = node.y * this.scale;
      const w = node.width * this.scale;
      const h = node.height * this.scale;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    if (!isFinite(minX)) {
      minX = minY = 0;
      maxX = maxY = 100;
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Build PDF content stream
   */
  private buildContentStream(
    nodes: PDFExportableNode[],
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    getNode?: (id: NodeId) => PDFExportableNode | null
  ): void {
    // Save graphics state
    this.content.push('q');

    // Calculate offset to center drawing on page
    const drawingWidth = bounds.maxX - bounds.minX;
    const drawingHeight = bounds.maxY - bounds.minY;
    const availWidth = this.pageWidth - 2 * this.margin;
    const availHeight = this.pageHeight - 2 * this.margin;

    // Fit drawing to page if needed
    let fitScale = 1;
    if (drawingWidth > availWidth || drawingHeight > availHeight) {
      fitScale = Math.min(availWidth / drawingWidth, availHeight / drawingHeight);
    }

    // Translate to margin and flip Y axis (PDF origin is bottom-left)
    const offsetX = this.margin + (availWidth - drawingWidth * fitScale) / 2 - bounds.minX * fitScale;
    const offsetY = this.pageHeight - this.margin - (availHeight - drawingHeight * fitScale) / 2;

    // Apply transform: translate, scale, flip Y
    this.content.push(`1 0 0 -1 ${this.f(offsetX)} ${this.f(offsetY)} cm`);
    this.content.push(`${this.f(fitScale)} 0 0 ${this.f(fitScale)} 0 0 cm`);

    // Draw nodes
    for (const node of nodes) {
      this.drawNode(node, getNode);
    }

    // Restore graphics state
    this.content.push('Q');
  }

  /**
   * Draw a single node
   */
  private drawNode(node: PDFExportableNode, getNode?: (id: NodeId) => PDFExportableNode | null): void {
    if (!node.visible) return;

    switch (node.type) {
      case 'VECTOR':
      case 'LINE':
      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'POLYGON':
      case 'STAR':
        this.drawVectorNode(node);
        break;
      case 'FRAME':
        this.drawFrameNode(node);
        if (node.childIds && getNode) {
          for (const childId of node.childIds) {
            const child = getNode(childId);
            if (child) this.drawNode(child, getNode);
          }
        }
        break;
      case 'TEXT':
        this.drawTextNode(node);
        break;
      case 'GROUP':
        if (node.childIds && getNode) {
          for (const childId of node.childIds) {
            const child = getNode(childId);
            if (child) this.drawNode(child, getNode);
          }
        }
        break;
    }
  }

  /**
   * Draw vector node
   */
  private drawVectorNode(node: PDFExportableNode): void {
    if (!node.vectorPaths || node.vectorPaths.length === 0) return;

    this.content.push('q'); // Save state

    // Apply rotation if needed
    if (node.rotation !== 0) {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      const rad = (node.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      this.content.push(`1 0 0 1 ${this.f(cx * this.scale)} ${this.f(cy * this.scale)} cm`);
      this.content.push(`${this.f(cos)} ${this.f(sin)} ${this.f(-sin)} ${this.f(cos)} 0 0 cm`);
      this.content.push(`1 0 0 1 ${this.f(-cx * this.scale)} ${this.f(-cy * this.scale)} cm`);
    }

    // Build path
    for (const path of node.vectorPaths) {
      this.drawPath(path, node);
    }

    // Set colors and stroke/fill
    this.applyStyle(node);

    this.content.push('Q'); // Restore state
  }

  /**
   * Draw frame node (rectangle with optional corner radius)
   */
  private drawFrameNode(node: PDFExportableNode): void {
    this.content.push('q');

    const x = node.x * this.scale;
    const y = node.y * this.scale;
    const w = node.width * this.scale;
    const h = node.height * this.scale;
    const r = Math.min((node.cornerRadius ?? 0) * this.scale, Math.min(w, h) / 2);

    if (r > 0) {
      // Rounded rectangle
      const k = 0.5522847498 * r;
      this.content.push(`${this.f(x + r)} ${this.f(y)} m`);
      this.content.push(`${this.f(x + w - r)} ${this.f(y)} l`);
      this.content.push(`${this.f(x + w - r + k)} ${this.f(y)} ${this.f(x + w)} ${this.f(y + r - k)} ${this.f(x + w)} ${this.f(y + r)} c`);
      this.content.push(`${this.f(x + w)} ${this.f(y + h - r)} l`);
      this.content.push(`${this.f(x + w)} ${this.f(y + h - r + k)} ${this.f(x + w - r + k)} ${this.f(y + h)} ${this.f(x + w - r)} ${this.f(y + h)} c`);
      this.content.push(`${this.f(x + r)} ${this.f(y + h)} l`);
      this.content.push(`${this.f(x + r - k)} ${this.f(y + h)} ${this.f(x)} ${this.f(y + h - r + k)} ${this.f(x)} ${this.f(y + h - r)} c`);
      this.content.push(`${this.f(x)} ${this.f(y + r)} l`);
      this.content.push(`${this.f(x)} ${this.f(y + r - k)} ${this.f(x + r - k)} ${this.f(y)} ${this.f(x + r)} ${this.f(y)} c`);
      this.content.push('h');
    } else {
      // Simple rectangle
      this.content.push(`${this.f(x)} ${this.f(y)} ${this.f(w)} ${this.f(h)} re`);
    }

    this.applyStyle(node);
    this.content.push('Q');
  }

  /**
   * Draw text node
   */
  private drawTextNode(node: PDFExportableNode): void {
    if (!node.characters) return;

    this.content.push('q');

    const x = node.x * this.scale;
    const y = node.y * this.scale;
    const fontSize = (node.fontSize ?? 12) * this.scale;

    // Get fill color
    const fillColor = this.getFillColor(node);
    if (fillColor) {
      if (this.options.grayscale) {
        const gray = fillColor.r * 0.299 + fillColor.g * 0.587 + fillColor.b * 0.114;
        this.content.push(`${this.f(gray)} g`);
      } else {
        this.content.push(`${this.f(fillColor.r)} ${this.f(fillColor.g)} ${this.f(fillColor.b)} rg`);
      }
    }

    // Begin text
    this.content.push('BT');
    this.content.push(`/F1 ${this.f(fontSize)} Tf`);
    this.content.push(`${this.f(x)} ${this.f(y + fontSize)} Td`);

    // Escape text for PDF
    const escapedText = this.escapeText(node.characters);
    this.content.push(`(${escapedText}) Tj`);

    this.content.push('ET');
    this.content.push('Q');
  }

  /**
   * Draw a vector path
   */
  private drawPath(path: VectorPath, node: PDFExportableNode): void {
    const offsetX = node.x * this.scale;
    const offsetY = node.y * this.scale;

    for (const cmd of path.commands) {
      switch (cmd.type) {
        case 'M':
          this.content.push(`${this.f(offsetX + cmd.x * this.scale)} ${this.f(offsetY + cmd.y * this.scale)} m`);
          break;
        case 'L':
          this.content.push(`${this.f(offsetX + cmd.x * this.scale)} ${this.f(offsetY + cmd.y * this.scale)} l`);
          break;
        case 'C':
          this.content.push(
            `${this.f(offsetX + cmd.x1 * this.scale)} ${this.f(offsetY + cmd.y1 * this.scale)} ` +
            `${this.f(offsetX + cmd.x2 * this.scale)} ${this.f(offsetY + cmd.y2 * this.scale)} ` +
            `${this.f(offsetX + cmd.x * this.scale)} ${this.f(offsetY + cmd.y * this.scale)} c`
          );
          break;
        case 'Z':
          this.content.push('h');
          break;
      }
    }
  }

  /**
   * Apply stroke and fill style
   */
  private applyStyle(node: PDFExportableNode): void {
    const hasStroke = this.options.includeStrokes && node.strokes && node.strokes.length > 0;
    const hasFill = this.options.includeFills && node.fills && node.fills.length > 0;

    if (hasFill) {
      const fillColor = this.getFillColor(node);
      if (fillColor) {
        if (this.options.grayscale) {
          const gray = fillColor.r * 0.299 + fillColor.g * 0.587 + fillColor.b * 0.114;
          this.content.push(`${this.f(gray)} g`);
        } else {
          this.content.push(`${this.f(fillColor.r)} ${this.f(fillColor.g)} ${this.f(fillColor.b)} rg`);
        }
      }
    }

    if (hasStroke) {
      const strokeColor = this.getStrokeColor(node);
      if (strokeColor) {
        if (this.options.grayscale) {
          const gray = strokeColor.r * 0.299 + strokeColor.g * 0.587 + strokeColor.b * 0.114;
          this.content.push(`${this.f(gray)} G`);
        } else {
          this.content.push(`${this.f(strokeColor.r)} ${this.f(strokeColor.g)} ${this.f(strokeColor.b)} RG`);
        }
      }
      this.content.push(`${this.f((node.strokeWeight ?? 1) * this.scale)} w`);
    }

    // Paint operator
    if (hasFill && hasStroke) {
      this.content.push('B'); // Fill and stroke
    } else if (hasFill) {
      this.content.push('f'); // Fill
    } else if (hasStroke) {
      this.content.push('S'); // Stroke
    } else {
      this.content.push('n'); // No paint (just define path)
    }
  }

  /**
   * Get fill color from node
   */
  private getFillColor(node: PDFExportableNode): { r: number; g: number; b: number } | null {
    if (!node.fills || node.fills.length === 0) return null;

    const fill = node.fills[0];
    if (!fill || fill.type !== 'SOLID' || !('color' in fill)) return null;

    return { r: fill.color.r, g: fill.color.g, b: fill.color.b };
  }

  /**
   * Get stroke color from node
   */
  private getStrokeColor(node: PDFExportableNode): { r: number; g: number; b: number } | null {
    if (!node.strokes || node.strokes.length === 0) return null;

    const stroke = node.strokes[0];
    if (!stroke || stroke.type !== 'SOLID' || !('color' in stroke)) return null;

    return { r: stroke.color.r, g: stroke.color.g, b: stroke.color.b };
  }

  /**
   * Build complete PDF document
   */
  private buildPDF(): string {
    const pdf: string[] = [];

    // Header
    pdf.push('%PDF-1.4');
    pdf.push('%\xE2\xE3\xCF\xD3'); // Binary comment to indicate binary content

    this.currentOffset = pdf.join('\n').length + 1;

    // Object 1: Catalog
    this.addObject(pdf, `<< /Type /Catalog /Pages 2 0 R >>`);

    // Object 2: Pages
    this.addObject(pdf, `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);

    // Object 3: Page
    this.addObject(pdf, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.f(this.pageWidth)} ${this.f(this.pageHeight)}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`);

    // Object 4: Content stream
    const contentStream = this.content.join('\n');
    this.addObject(pdf, `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`);

    // Object 5: Font (Helvetica, built-in)
    this.addObject(pdf, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

    // Object 6: Info
    const createDate = this.formatPDFDate(new Date());
    this.addObject(pdf, `<< /Title (${this.escapeText(this.options.title)}) /Author (${this.escapeText(this.options.author)}) /Creator (DesignLibre) /Producer (DesignLibre PDF Exporter) /CreationDate (${createDate}) >>`);

    // Cross-reference table
    const xrefOffset = this.currentOffset;
    pdf.push('xref');
    pdf.push(`0 ${this.objects.length + 1}`);
    pdf.push('0000000000 65535 f ');
    for (const offset of this.objectOffsets) {
      pdf.push(`${offset.toString().padStart(10, '0')} 00000 n `);
    }

    // Trailer
    pdf.push('trailer');
    pdf.push(`<< /Size ${this.objects.length + 1} /Root 1 0 R /Info 6 0 R >>`);
    pdf.push('startxref');
    pdf.push(xrefOffset.toString());
    pdf.push('%%EOF');

    return pdf.join('\n');
  }

  /**
   * Add an object to the PDF
   */
  private addObject(pdf: string[], content: string): void {
    this.objectOffsets.push(this.currentOffset);
    const objNum = this.objects.length + 1;
    const obj = `${objNum} 0 obj\n${content}\nendobj`;
    pdf.push(obj);
    this.objects.push(obj);
    this.currentOffset += obj.length + 1;
  }

  /**
   * Format number for PDF
   */
  private f(n: number): string {
    return n.toFixed(4).replace(/\.?0+$/, '');
  }

  /**
   * Escape text for PDF string
   */
  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  /**
   * Format date for PDF
   */
  private formatPDFDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    const tz = date.getTimezoneOffset();
    const tzSign = tz <= 0 ? '+' : '-';
    const tzH = pad(Math.abs(Math.floor(tz / 60)));
    const tzM = pad(Math.abs(tz % 60));
    return `D:${y}${m}${d}${h}${min}${s}${tzSign}${tzH}'${tzM}'`;
  }
}

/**
 * Export nodes to PDF string
 */
export function exportPDF(
  nodes: PDFExportableNode[],
  options?: PDFExportOptions,
  getNode?: (id: NodeId) => PDFExportableNode | null
): string {
  const exporter = new PDFExporter(options);
  return exporter.export(nodes, getNode);
}

/**
 * Export nodes to PDF blob (for download)
 */
export function exportPDFBlob(
  nodes: PDFExportableNode[],
  options?: PDFExportOptions,
  getNode?: (id: NodeId) => PDFExportableNode | null
): Blob {
  const pdfString = exportPDF(nodes, options, getNode);
  return new Blob([pdfString], { type: 'application/pdf' });
}
