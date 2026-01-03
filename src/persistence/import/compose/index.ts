/**
 * Compose Importer Module
 *
 * Exports for importing Kotlin Compose code and Android projects.
 */

// Main importer
export { ComposeImporter, createComposeImporter, analyzeKotlinFile } from './compose-importer';

// Parser
export { KotlinComposeParser, createKotlinComposeParser } from './kotlin-parser';

// Composable mapper
export { ComposeMapper, createComposeMapper } from './composable-mapper';

// Types
export type {
  // Import options & results
  ComposeImportOptions,
  ComposeImportResult,
  AndroidProjectImportOptions,
  AndroidProjectImportResult,
  // Parsed types
  ParsedComposable,
  ParsedComposeModifier,
  ParsedModifierArgument,
  ParsedParameterValue,
  LazyListContext,
  // Color & dimension
  ParsedComposeColor,
  ParsedDimension,
  ComposeColorType,
  ComposeDimensionUnit,
  // Mapping types
  ComposableToNodeMapping,
  // Project types
  AndroidProject,
  KotlinFileInfo,
  // Material theme
  MaterialColorScheme,
  // Composable types
  ComposeComposableType,
  ComposeModifierType,
} from './types';

// Default theme colors
export { DEFAULT_LIGHT_COLOR_SCHEME } from './types';
