/**
 * Kotlin Compose Importer Types
 *
 * Type definitions for parsing and importing Jetpack Compose code.
 */

import type { NodeId } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type {
  SourceLocation,
  PropertySource,
  SemanticAnchor,
} from '@core/types/code-source-metadata';

// ============================================================================
// Import Options & Results
// ============================================================================

/**
 * Options for importing Compose code
 */
export interface ComposeImportOptions {
  /** Parent node ID to import into */
  parentId?: NodeId;
  /** X position for imported content */
  x?: number;
  /** Y position for imported content */
  y?: number;
  /** Scale factor (default: 1) */
  scale?: number;
  /** Resolve MaterialTheme references (default: true) */
  resolveTheme?: boolean;
  /** Theme variant for resolution */
  themeVariant?: 'light' | 'dark';
  /** Expand LazyColumn/LazyRow items (default: false) */
  expandLazyLists?: boolean;
  /** Number of lazy items to expand (default: 3) */
  lazyExpansionCount?: number;
  /** Include all conditional branches (default: true) */
  includeConditionals?: boolean;
  /** Preserve source metadata for sync (default: true) */
  preserveSourceMetadata?: boolean;
}

/**
 * Result of importing Compose code
 */
export interface ComposeImportResult {
  /** Root node ID of imported content */
  readonly rootId: NodeId;
  /** Number of nodes created */
  readonly nodeCount: number;
  /** Source file path */
  readonly sourceFile: string;
  /** Composables found */
  readonly composablesFound: readonly string[];
  /** Custom composables that could not be resolved */
  readonly unresolvedComposables: readonly string[];
  /** Properties marked as code-controlled */
  readonly codeControlledCount: number;
  /** Warnings during import */
  readonly warnings: readonly string[];
  /** Processing time in milliseconds */
  readonly processingTime: number;
}

/**
 * Options for importing Android project
 */
export interface AndroidProjectImportOptions extends ComposeImportOptions {
  /** Only import files matching these patterns */
  filePatterns?: readonly string[];
  /** Exclude files matching these patterns */
  excludePatterns?: readonly string[];
  /** Preserve folder structure as node groups (default: true) */
  preserveFolderStructure?: boolean;
  /** Parse theme colors from resources (default: true) */
  parseThemeColors?: boolean;
}

/**
 * Result of importing Android project
 */
export interface AndroidProjectImportResult {
  /** Root node ID */
  readonly rootId: NodeId;
  /** Individual file import results */
  readonly files: readonly ComposeImportResult[];
  /** Theme colors resolved */
  readonly themeColors: ReadonlyMap<string, RGBA>;
  /** Custom composable definitions found */
  readonly customComposables: ReadonlyMap<string, SourceLocation>;
  /** Total node count */
  readonly totalNodeCount: number;
  /** Total warnings */
  readonly warnings: readonly string[];
}

// ============================================================================
// Parsed AST Types
// ============================================================================

/**
 * Parsed Compose composable
 */
export interface ParsedComposable {
  /** Composable name (Column, Text, etc.) */
  readonly name: string;
  /** Source location */
  readonly location: SourceLocation;
  /** Modifier chain */
  readonly modifiers: readonly ParsedComposeModifier[];
  /** Child composables (content lambda) */
  readonly children: readonly ParsedComposable[];
  /** Named parameters */
  readonly parameters: ReadonlyMap<string, ParsedParameterValue>;
  /** Whether inside conditional */
  readonly isConditional: boolean;
  /** Condition expression if conditional */
  readonly conditionExpression?: string;
  /** Lazy list context if inside LazyColumn/LazyRow items */
  readonly lazyContext?: LazyListContext;
  /** Semantic anchor for sync */
  readonly anchor: SemanticAnchor;
}

/**
 * Parsed Compose modifier
 */
export interface ParsedComposeModifier {
  /** Modifier name (padding, background, size, etc.) */
  readonly name: string;
  /** Arguments */
  readonly arguments: readonly ParsedModifierArgument[];
  /** Source location */
  readonly location: SourceLocation;
}

/**
 * Parsed modifier argument
 */
export interface ParsedModifierArgument {
  /** Parameter name (e.g., "all" in padding(all = 16.dp)) */
  readonly name?: string;
  /** Parsed value */
  readonly value: ParsedParameterValue;
  /** Source location */
  readonly location: SourceLocation;
}

/**
 * Parsed parameter value with editability tracking
 */
export interface ParsedParameterValue {
  /** Value type */
  readonly type: 'number' | 'string' | 'color' | 'dp' | 'sp' | 'boolean' | 'enum' | 'expression';
  /** Parsed value (null if expression) */
  readonly value: number | string | RGBA | boolean | null;
  /** Raw code expression */
  readonly rawExpression: string;
  /** Source information */
  readonly source: PropertySource;
}

/**
 * Lazy list context
 */
export interface LazyListContext {
  /** Collection expression (e.g., "items" in items(items)) */
  readonly collectionExpression: string;
  /** Item variable name */
  readonly itemVariable: string;
  /** Key lambda if specified */
  readonly keyExpression?: string;
  /** Source location */
  readonly location: SourceLocation;
}

// ============================================================================
// Compose Element Types
// ============================================================================

/**
 * Known Compose composable types
 */
export type ComposeComposableType =
  // Layout
  | 'Column'
  | 'Row'
  | 'Box'
  | 'LazyColumn'
  | 'LazyRow'
  | 'LazyVerticalGrid'
  | 'FlowRow'
  | 'FlowColumn'
  | 'ConstraintLayout'
  // Foundation
  | 'Text'
  | 'BasicText'
  | 'Image'
  | 'Icon'
  | 'Canvas'
  | 'Spacer'
  | 'Divider'
  // Material
  | 'Surface'
  | 'Card'
  | 'Button'
  | 'TextButton'
  | 'OutlinedButton'
  | 'IconButton'
  | 'FloatingActionButton'
  | 'TextField'
  | 'OutlinedTextField'
  | 'Checkbox'
  | 'RadioButton'
  | 'Switch'
  | 'Slider'
  | 'CircularProgressIndicator'
  | 'LinearProgressIndicator'
  // Scaffold
  | 'Scaffold'
  | 'TopAppBar'
  | 'BottomAppBar'
  | 'NavigationBar'
  | 'NavigationRail'
  | 'ModalBottomSheet'
  | 'ModalDrawer';

/**
 * Known Compose modifiers
 */
export type ComposeModifierType =
  // Size
  | 'size'
  | 'width'
  | 'height'
  | 'fillMaxSize'
  | 'fillMaxWidth'
  | 'fillMaxHeight'
  | 'wrapContentSize'
  | 'requiredSize'
  // Padding
  | 'padding'
  // Background & colors
  | 'background'
  | 'border'
  // Shape
  | 'clip'
  // Transform
  | 'rotate'
  | 'scale'
  | 'offset'
  | 'alpha'
  // Shadow
  | 'shadow'
  // Interaction
  | 'clickable'
  | 'combinedClickable'
  | 'selectable'
  | 'toggleable'
  // Other
  | 'weight'
  | 'align'
  | 'zIndex';

// ============================================================================
// Color Types
// ============================================================================

/**
 * Compose color types
 */
export type ComposeColorType =
  | 'named'          // Color.Red, Color.Blue
  | 'hex'            // Color(0xFF123456)
  | 'rgb'            // Color(red, green, blue)
  | 'theme'          // MaterialTheme.colorScheme.primary
  | 'compositionLocal';  // LocalContentColor.current

/**
 * Parsed Compose color
 */
export interface ParsedComposeColor {
  readonly type: ComposeColorType;
  /** Resolved RGBA value (if resolvable) */
  readonly rgba?: RGBA;
  /** Original expression */
  readonly expression: string;
  /** Theme color name (for theme colors) */
  readonly themeColorName?: string;
  /** Is editable */
  readonly isEditable: boolean;
}

// ============================================================================
// Dimension Types
// ============================================================================

/**
 * Compose dimension unit
 */
export type ComposeDimensionUnit = 'dp' | 'sp' | 'px';

/**
 * Parsed dimension value
 */
export interface ParsedDimension {
  readonly value: number;
  readonly unit: ComposeDimensionUnit;
  readonly expression: string;
  readonly isEditable: boolean;
}

// ============================================================================
// Mapping Types
// ============================================================================

/**
 * Mapping from Compose composable to DesignLibre node type
 */
export interface ComposableToNodeMapping {
  /** DesignLibre node type */
  readonly nodeType: 'FRAME' | 'TEXT' | 'IMAGE' | 'VECTOR' | 'GROUP';
  /** Auto layout mode for containers */
  readonly autoLayoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  /** Additional default properties */
  readonly defaultProps?: Readonly<Record<string, unknown>>;
  /** Whether this composable has children */
  readonly hasChildren: boolean;
}

// ============================================================================
// Project Types
// ============================================================================

/**
 * Android project structure
 */
export interface AndroidProject {
  /** Project root path */
  readonly rootPath: string;
  /** Project/module name */
  readonly name: string;
  /** Kotlin Compose files found */
  readonly composeFiles: readonly string[];
  /** Theme file paths */
  readonly themeFiles: readonly string[];
  /** Package name */
  readonly packageName?: string;
}

/**
 * Kotlin file info
 */
export interface KotlinFileInfo {
  /** File path */
  readonly path: string;
  /** File name */
  readonly name: string;
  /** Composable functions defined */
  readonly composables: readonly string[];
  /** Imports */
  readonly imports: readonly string[];
  /** Is Compose file */
  readonly isCompose: boolean;
}

// ============================================================================
// Material Theme Types
// ============================================================================

/**
 * Material 3 color scheme
 */
export interface MaterialColorScheme {
  readonly primary: RGBA;
  readonly onPrimary: RGBA;
  readonly primaryContainer: RGBA;
  readonly onPrimaryContainer: RGBA;
  readonly secondary: RGBA;
  readonly onSecondary: RGBA;
  readonly secondaryContainer: RGBA;
  readonly onSecondaryContainer: RGBA;
  readonly tertiary: RGBA;
  readonly onTertiary: RGBA;
  readonly tertiaryContainer: RGBA;
  readonly onTertiaryContainer: RGBA;
  readonly error: RGBA;
  readonly onError: RGBA;
  readonly errorContainer: RGBA;
  readonly onErrorContainer: RGBA;
  readonly background: RGBA;
  readonly onBackground: RGBA;
  readonly surface: RGBA;
  readonly onSurface: RGBA;
  readonly surfaceVariant: RGBA;
  readonly onSurfaceVariant: RGBA;
  readonly outline: RGBA;
  readonly outlineVariant: RGBA;
}

/**
 * Default Material 3 light theme colors
 */
export const DEFAULT_LIGHT_COLOR_SCHEME: MaterialColorScheme = {
  primary: { r: 0.4, g: 0.31, b: 0.64, a: 1 },
  onPrimary: { r: 1, g: 1, b: 1, a: 1 },
  primaryContainer: { r: 0.91, g: 0.85, b: 1, a: 1 },
  onPrimaryContainer: { r: 0.13, g: 0.03, b: 0.35, a: 1 },
  secondary: { r: 0.38, g: 0.36, b: 0.44, a: 1 },
  onSecondary: { r: 1, g: 1, b: 1, a: 1 },
  secondaryContainer: { r: 0.91, g: 0.87, b: 0.98, a: 1 },
  onSecondaryContainer: { r: 0.11, g: 0.09, b: 0.17, a: 1 },
  tertiary: { r: 0.49, g: 0.31, b: 0.36, a: 1 },
  onTertiary: { r: 1, g: 1, b: 1, a: 1 },
  tertiaryContainer: { r: 1, g: 0.85, b: 0.89, a: 1 },
  onTertiaryContainer: { r: 0.19, g: 0.04, b: 0.09, a: 1 },
  error: { r: 0.73, g: 0.11, b: 0.11, a: 1 },
  onError: { r: 1, g: 1, b: 1, a: 1 },
  errorContainer: { r: 0.98, g: 0.87, b: 0.86, a: 1 },
  onErrorContainer: { r: 0.25, g: 0, b: 0.02, a: 1 },
  background: { r: 1, g: 0.98, b: 1, a: 1 },
  onBackground: { r: 0.11, g: 0.1, b: 0.13, a: 1 },
  surface: { r: 1, g: 0.98, b: 1, a: 1 },
  onSurface: { r: 0.11, g: 0.1, b: 0.13, a: 1 },
  surfaceVariant: { r: 0.9, g: 0.87, b: 0.94, a: 1 },
  onSurfaceVariant: { r: 0.28, g: 0.26, b: 0.32, a: 1 },
  outline: { r: 0.47, g: 0.44, b: 0.51, a: 1 },
  outlineVariant: { r: 0.79, g: 0.76, b: 0.84, a: 1 },
};
