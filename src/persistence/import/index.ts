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
  analyzeKotlinFile,
  KotlinComposeParser,
  createKotlinComposeParser,
  ComposeMapper,
  createComposeMapper,
  DEFAULT_LIGHT_COLOR_SCHEME,
} from './compose';

export type {
  ComposeImportOptions,
  ComposeImportResult,
  AndroidProjectImportOptions,
  AndroidProjectImportResult,
  ParsedComposable,
  ParsedComposeModifier,
  ParsedModifierArgument as ComposeParsedModifierArgument,
  ParsedParameterValue,
  LazyListContext as ComposeLazyListContext,
  ParsedComposeColor,
  ParsedDimension,
  ComposeColorType,
  ComposeDimensionUnit,
  ComposableToNodeMapping,
  AndroidProject,
  KotlinFileInfo,
  MaterialColorScheme,
  ComposeComposableType,
  ComposeModifierType,
} from './compose';
