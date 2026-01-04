/**
 * Import Module
 *
 * File import functionality for various formats.
 */

export * from './svg-importer';
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
