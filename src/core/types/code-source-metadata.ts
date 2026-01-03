/**
 * Code Source Metadata Types
 *
 * Types for tracking source code locations and editability
 * when importing SwiftUI or Kotlin Compose projects.
 */

/**
 * Supported code frameworks
 */
export type CodeFramework = 'swiftui' | 'compose';

/**
 * Source location in a code file
 */
export interface SourceLocation {
  /** Absolute file path */
  readonly filePath: string;
  /** 1-based line number */
  readonly startLine: number;
  /** 1-based column number */
  readonly startColumn: number;
  /** 1-based end line number */
  readonly endLine: number;
  /** 1-based end column number */
  readonly endColumn: number;
  /** Byte offset from start of file */
  readonly startOffset: number;
  /** Byte offset of end position */
  readonly endOffset: number;
}

/**
 * Property binding type - determines if a property is editable
 */
export type PropertyBindingType =
  | 'literal'      // Direct value: Color.red, 16.dp, 100
  | 'constant'     // Named constant: let width = 100
  | 'state'        // @State var, by remember { }
  | 'binding'      // @Binding, passed parameter
  | 'computed'     // Computed property or geometry-based
  | 'function'     // Result of function call
  | 'conditional'  // Ternary or if expression
  | 'environment'  // @Environment, CompositionLocal
  | 'unknown';     // Cannot determine

/**
 * Source information for a single property
 */
export interface PropertySource {
  /** Location in source code */
  readonly sourceLocation: SourceLocation;
  /** How this property is bound */
  readonly bindingType: PropertyBindingType;
  /** Original code expression */
  readonly originalExpression: string;
  /** Whether designers can edit this property */
  readonly isEditable: boolean;
  /** Reason if not editable */
  readonly editabilityReason?: string;
  /** Related properties for conditional values */
  readonly relatedProperties?: readonly string[];
}

/**
 * Semantic anchor for locating views in code
 * Used instead of line numbers to survive reformatting
 */
export interface SemanticAnchor {
  /** View/composable name (e.g., "VStack", "Column") */
  readonly viewType: string;
  /** Containing struct/function name (e.g., "ContentView", "MainScreen") */
  readonly containingScope: string;
  /** Parent scope for nested views */
  readonly parentScope?: string;
  /** Index among siblings of same type */
  readonly siblingIndex: number;
  /** Hash of structure for validation */
  readonly structureHash: string;
}

/**
 * Code block that must be preserved (not editable)
 */
export interface PreservedCodeBlock {
  readonly type: 'function' | 'lambda' | 'state' | 'effect' | 'comment' | 'import';
  readonly location: SourceLocation;
  readonly content: string;
}

/**
 * Metadata stored in node's pluginData for code sync
 */
export interface CodeSourceMetadata {
  /** Framework this node was imported from */
  readonly framework: CodeFramework;
  /** Source file path */
  readonly sourceFile: string;
  /** Location of the view in source */
  readonly viewLocation: SourceLocation;
  /** Original view/composable type */
  readonly viewType: string;
  /** Semantic anchor for relocation */
  readonly anchor: SemanticAnchor;
  /** Property sources for each design property */
  readonly propertySources: Readonly<Record<string, PropertySource>>;
  /** Code blocks that must not be modified */
  readonly preservedBlocks: readonly PreservedCodeBlock[];
  /** Hash of source file for change detection */
  readonly codeHash: string;
  /** Last sync timestamp */
  readonly lastSync: number;
  /** Version counter for conflict detection */
  readonly version: number;
}

/**
 * Check if a property binding type is editable
 */
export function isEditableBindingType(bindingType: PropertyBindingType): boolean {
  return bindingType === 'literal' || bindingType === 'constant';
}

/**
 * Create a source location from line/column info
 */
export function createSourceLocation(
  filePath: string,
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
  startOffset: number,
  endOffset: number
): SourceLocation {
  return {
    filePath,
    startLine,
    startColumn,
    endLine,
    endColumn,
    startOffset,
    endOffset,
  };
}

/**
 * Create a property source
 */
export function createPropertySource(
  location: SourceLocation,
  bindingType: PropertyBindingType,
  originalExpression: string
): PropertySource {
  const isEditable = isEditableBindingType(bindingType);
  const base = {
    sourceLocation: location,
    bindingType,
    originalExpression,
    isEditable,
  };

  if (!isEditable) {
    return {
      ...base,
      editabilityReason: `Property is ${bindingType} (code-controlled)`,
    };
  }

  return base;
}

/**
 * Plugin data key for code source metadata
 */
export const CODE_SOURCE_PLUGIN_KEY = 'codeSource';

/**
 * Get code source metadata from a node's pluginData
 */
export function getCodeSourceMetadata(
  pluginData: Readonly<Record<string, unknown>>
): CodeSourceMetadata | null {
  const data = pluginData[CODE_SOURCE_PLUGIN_KEY];
  if (!data || typeof data !== 'object') {
    return null;
  }
  return data as CodeSourceMetadata;
}

/**
 * Check if a node has code source metadata
 */
export function hasCodeSource(
  pluginData: Readonly<Record<string, unknown>>
): boolean {
  return getCodeSourceMetadata(pluginData) !== null;
}

/**
 * Check if a specific property is editable on a code-sourced node
 */
export function isPropertyEditable(
  metadata: CodeSourceMetadata,
  propertyPath: string
): boolean {
  const source = metadata.propertySources[propertyPath];
  return source?.isEditable ?? true; // Default to editable if not tracked
}
