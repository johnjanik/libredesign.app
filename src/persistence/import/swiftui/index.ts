/**
 * SwiftUI Importer Module
 *
 * Exports for importing SwiftUI code and Xcode projects.
 */

// Main importer
export { SwiftUIImporter, createSwiftUIImporter, analyzeSwiftFile } from './swiftui-importer';

// Parser
export { SwiftParser, createSwiftParser } from './swift-parser';

// View mapper
export { SwiftUIViewMapper, createSwiftUIViewMapper } from './view-mapper';

// Types
export type {
  // Import options & results
  SwiftUIImportOptions,
  SwiftUIImportResult,
  XcodeProjectImportOptions,
  XcodeProjectImportResult,
  // Parsed types
  ParsedSwiftUIView,
  ParsedModifier,
  ParsedModifierArgument,
  ParsedPropertyValue,
  LoopContext,
  // Color & font
  ParsedSwiftUIColor,
  ParsedSwiftUIFont,
  SwiftUIColorType,
  SwiftUIFontType,
  // Mapping types
  ViewToNodeMapping,
  ModifierToPropertyMapping,
  // Project types
  XcodeProject,
  SwiftFileInfo,
  // View & modifier types
  SwiftUIViewType,
  SwiftUIModifier,
} from './types';
