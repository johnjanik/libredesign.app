/**
 * Kotlin/Compose Import Types
 */

import type { SourceLocation } from '@core/types/code-source-metadata';

/** Compose component types */
export type ComposeComponentType =
  | 'Column' | 'Row' | 'Box' | 'LazyColumn' | 'LazyRow'
  | 'Text' | 'Image' | 'Icon'
  | 'Button' | 'IconButton' | 'TextButton' | 'OutlinedButton'
  | 'TextField' | 'OutlinedTextField'
  | 'Card' | 'Surface'
  | 'Spacer' | 'Divider'
  | 'Scaffold' | 'TopAppBar' | 'BottomNavigation'
  | string;

/** Parsed Composable element */
export interface ParsedComposable {
  name: string;
  location: SourceLocation;
  modifiers: ParsedComposeModifier[];
  parameters: Map<string, ParsedParamValue>;
  children: ParsedComposable[];
  textContent?: string;
}

/** Parsed modifier */
export interface ParsedComposeModifier {
  name: string;
  arguments: Map<string, ParsedParamValue>;
}

/** Parsed parameter value */
export interface ParsedParamValue {
  type: 'string' | 'number' | 'boolean' | 'dp' | 'sp' | 'color' | 'expression';
  value: unknown;
  rawExpression: string;
}

/** Compose import options */
export interface ComposeImportOptions {
  parentId?: string;
  x?: number;
  y?: number;
  scale?: number;
  preserveSourceMetadata?: boolean;
}

/** Compose import result */
export interface ComposeImportResult {
  rootId: string;
  nodeCount: number;
  sourceFile: string;
  composablesFound: string[];
  warnings: string[];
  processingTime: number;
}

/** Android project import options */
export interface AndroidProjectImportOptions extends ComposeImportOptions {
  /** Only import files matching these patterns */
  filePatterns?: readonly string[];
  /** Exclude files matching these patterns */
  excludePatterns?: readonly string[];
  /** Preserve folder structure as node groups (default: true) */
  preserveFolderStructure?: boolean;
}

/** Android project import result */
export interface AndroidProjectImportResult {
  /** Root node ID */
  readonly rootId: string;
  /** Individual file import results */
  readonly files: readonly ComposeImportResult[];
  /** Total node count */
  readonly totalNodeCount: number;
  /** Processing time */
  readonly processingTime: number;
  /** Warnings */
  readonly warnings: readonly string[];
  /** Theme colors from the project */
  readonly themeColors: ReadonlyMap<string, { r: number; g: number; b: number; a: number }>;
}
