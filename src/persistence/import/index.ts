/**
 * Import Module
 *
 * File import functionality for various formats.
 */

export * from './svg-importer';
export * from './svg-cad-importer';
export * from './figma-importer';
export * from './sketch-importer';
export * from './designlibre-bundler';
export * from './image-importer';
export * from './ai-png-importer';
export * from './font-handler';

// Mobile project importers
// Re-export explicitly to avoid duplicate 'ParsedModifierArgument' name conflict
export {
  SwiftUIImporter,
  createSwiftUIImporter,
  analyzeSwiftFile,
  SwiftParser,
  createSwiftParser,
  SwiftUIViewMapper,
  createSwiftUIViewMapper,
} from './swiftui';

export type {
  SwiftUIImportOptions,
  SwiftUIImportResult,
  XcodeProjectImportOptions,
  XcodeProjectImportResult,
  ParsedSwiftUIView,
  ParsedModifier,
  ParsedModifierArgument as SwiftParsedModifierArgument,
  ParsedPropertyValue,
  LoopContext as SwiftLoopContext,
  ParsedSwiftUIColor,
  ParsedSwiftUIFont,
  SwiftUIColorType,
  SwiftUIFontType,
  ViewToNodeMapping,
  ModifierToPropertyMapping,
  XcodeProject,
  SwiftFileInfo,
  SwiftUIViewType,
  SwiftUIModifier,
} from './swiftui';

export {
  ComposeImporter,
  createComposeImporter,
  ComposeParser,
  createComposeParser,
} from './compose';

export type {
  ComposeImportOptions,
  ComposeImportResult,
  ParsedComposable,
  ParsedComposeModifier,
  ParsedParamValue,
  AndroidProjectImportOptions,
  AndroidProjectImportResult,
} from './compose';

// React/JSX importer
export {
  ReactImporter,
  createReactImporter,
  ReactParser,
  createReactParser,
} from './react';

export type {
  ReactImportOptions,
  ReactImportResult,
  ParsedJSXElement,
  ParsedPropValue,
  ParsedStyle,
} from './react';

// Project Import (folder import)
export {
  ProjectImporter,
  createProjectImporter,
} from './project';

export type {
  ProjectImportOptions,
  ProjectImportResult,
  ImportedFileInfo,
} from './project';

// DXF Import (CAD format)
export { DXFParser, parseDXF } from './dxf-parser';
export { DXFImporter, importDXF } from './dxf-importer';
export type { DXFImportResult, DXFLayerInfo, ImportedNode, DXFImportOptions } from './dxf-importer';
export { ACI_COLORS, DXF_UNITS, getUnitConversionToMM } from './dxf-types';
export type {
  DXFFile,
  DXFHeader,
  DXFTables,
  DXFLayer,
  DXFLinetype,
  DXFTextStyle,
  DXFDimStyle,
  DXFBlock,
  DXFEntity,
  DXFLine,
  DXFCircle,
  DXFArc,
  DXFEllipse,
  DXFPolyline,
  DXFSpline,
  DXFText,
  DXFMText,
  DXFDimension,
  DXFHatch,
  DXFInsert,
  DXFSolid,
  DXFPointEntity,
  DXFPoint,
  DXFVertex,
  DXFColor,
} from './dxf-types';

// KiCad Import (PCB format)
export { KiCadParser, parseKiCad } from './kicad-parser';
export { KiCadImporter, importKiCad, createKiCadImporter } from './kicad-importer';
export type { KiCadImportOptions, KiCadImportResult } from './kicad-importer';
export type {
  SExpr,
  ParsedSExpr,
  KiCadPCB,
  KiCadLayer,
  KiCadNet,
  KiCadNetClass,
  KiCadFootprint,
  KiCadPad,
  KiCadSegment,
  KiCadArc,
  KiCadVia,
  KiCadZone,
  KiCadGraphic,
  KiCadPoint,
  KiCadPosition,
  KiCadSize,
  KiCadStroke,
} from './kicad-types';
