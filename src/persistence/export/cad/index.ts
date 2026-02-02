/**
 * CAD Export Module
 *
 * Exporters for CAD interchange formats.
 */

// DXF Export
export { DXFExporter, exportDXF } from './dxf-exporter';
export type { ExportableNode, DXFExportOptions } from './dxf-exporter';

// PDF Export
export { PDFExporter, exportPDF, exportPDFBlob } from './pdf-exporter';
export type { PDFExportableNode, PDFExportOptions } from './pdf-exporter';

// BOM Export
export { BOMExporter, exportBOM, exportBOMBlob, createBOMItem, DEFAULT_BOM_COLUMNS } from './bom-exporter';
export type { BOMItem, BOMExportableNode, BOMExportOptions, BOMColumn } from './bom-exporter';

// Gerber/Excellon Export (PCB)
export { GerberExporter, exportGerber, exportGerberLayer, exportExcellon, GERBER_EXTENSIONS } from './gerber-exporter';
export type {
  GerberExportableNode,
  GerberExportOptions,
  ExcellonExportOptions,
  GerberExportResult,
  PCBLayerType,
  ApertureType,
  Aperture,
  PCBPad,
  PCBTrace,
  PCBRegion,
} from './gerber-exporter';
