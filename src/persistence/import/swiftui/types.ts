/**
 * SwiftUI Importer Types
 *
 * Type definitions for parsing and importing SwiftUI code.
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
 * Options for importing SwiftUI code
 */
export interface SwiftUIImportOptions {
  /** Parent node ID to import into */
  parentId?: NodeId;
  /** X position for imported content */
  x?: number;
  /** Y position for imported content */
  y?: number;
  /** Scale factor (default: 1) */
  scale?: number;
  /** Expand ForEach loops to show multiple items (default: false) */
  expandLoops?: boolean;
  /** Number of loop iterations to expand (default: 3) */
  loopExpansionCount?: number;
  /** Include all conditional branches (default: true) */
  includeConditionals?: boolean;
  /** Resolve custom view references (default: true) */
  resolveCustomViews?: boolean;
  /** Use AI for complex parsing (default: false) */
  useAIFallback?: boolean;
  /** AI model for fallback parsing */
  aiModel?: string;
  /** Preserve source metadata for sync (default: true) */
  preserveSourceMetadata?: boolean;
}

/**
 * Result of importing SwiftUI code
 */
export interface SwiftUIImportResult {
  /** Root node ID of imported content */
  readonly rootId: NodeId;
  /** Number of nodes created */
  readonly nodeCount: number;
  /** Source file path */
  readonly sourceFile: string;
  /** SwiftUI views found */
  readonly viewsFound: readonly string[];
  /** Custom views that could not be resolved */
  readonly unresolvedViews: readonly string[];
  /** Properties marked as code-controlled */
  readonly codeControlledCount: number;
  /** Warnings during import */
  readonly warnings: readonly string[];
  /** Processing time in milliseconds */
  readonly processingTime: number;
}

/**
 * Options for importing Xcode project
 */
export interface XcodeProjectImportOptions extends SwiftUIImportOptions {
  /** Only import files matching these patterns */
  filePatterns?: readonly string[];
  /** Exclude files matching these patterns */
  excludePatterns?: readonly string[];
  /** Preserve folder structure as node groups (default: true) */
  preserveFolderStructure?: boolean;
  /** Parse xcassets for colors (default: true) */
  parseAssetCatalogs?: boolean;
}

/**
 * Result of importing Xcode project
 */
export interface XcodeProjectImportResult {
  /** Root node ID */
  readonly rootId: NodeId;
  /** Individual file import results */
  readonly files: readonly SwiftUIImportResult[];
  /** Colors from asset catalogs */
  readonly assetColors: ReadonlyMap<string, RGBA>;
  /** Custom view definitions found */
  readonly customViews: ReadonlyMap<string, SourceLocation>;
  /** Total node count */
  readonly totalNodeCount: number;
  /** Total warnings */
  readonly warnings: readonly string[];
}

// ============================================================================
// Parsed AST Types
// ============================================================================

/**
 * Parsed SwiftUI view
 */
export interface ParsedSwiftUIView {
  /** View type (VStack, Text, Image, etc.) */
  readonly viewType: string;
  /** Source location */
  readonly location: SourceLocation;
  /** Modifiers applied to this view */
  readonly modifiers: readonly ParsedModifier[];
  /** Child views (for containers) */
  readonly children: readonly ParsedSwiftUIView[];
  /** Properties extracted from view constructor */
  readonly properties: ReadonlyMap<string, ParsedPropertyValue>;
  /** Name if custom view */
  readonly customViewName?: string;
  /** Whether inside conditional */
  readonly isConditional: boolean;
  /** Condition expression if conditional */
  readonly conditionExpression?: string;
  /** Loop context if inside ForEach */
  readonly loopContext?: LoopContext;
  /** Semantic anchor for sync */
  readonly anchor: SemanticAnchor;
}

/**
 * Parsed modifier (e.g., .frame, .padding, .background)
 */
export interface ParsedModifier {
  /** Modifier name */
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
  /** Parameter label (e.g., "width" in .frame(width: 100)) */
  readonly label?: string;
  /** Parsed value */
  readonly value: ParsedPropertyValue;
  /** Source location */
  readonly location: SourceLocation;
}

/**
 * Parsed property value with editability tracking
 */
export interface ParsedPropertyValue {
  /** Value type */
  readonly type: 'number' | 'string' | 'color' | 'enum' | 'boolean' | 'expression' | 'font';
  /** Parsed value (null if expression) */
  readonly value: number | string | RGBA | boolean | null;
  /** Raw code expression */
  readonly rawExpression: string;
  /** Source information */
  readonly source: PropertySource;
}

/**
 * Loop context for ForEach
 */
export interface LoopContext {
  /** Collection being iterated */
  readonly collectionExpression: string;
  /** Iterator variable name */
  readonly iteratorName: string;
  /** ID key path if specified */
  readonly idKeyPath?: string;
  /** Source location */
  readonly location: SourceLocation;
}

// ============================================================================
// SwiftUI Element Types
// ============================================================================

/**
 * Known SwiftUI view types
 */
export type SwiftUIViewType =
  // Layout containers
  | 'VStack'
  | 'HStack'
  | 'ZStack'
  | 'LazyVStack'
  | 'LazyHStack'
  | 'ScrollView'
  | 'List'
  | 'Form'
  | 'Group'
  | 'Section'
  | 'NavigationStack'
  | 'NavigationView'
  | 'TabView'
  // Basic views
  | 'Text'
  | 'Image'
  | 'Rectangle'
  | 'RoundedRectangle'
  | 'Circle'
  | 'Ellipse'
  | 'Capsule'
  | 'Path'
  // Controls
  | 'Button'
  | 'Toggle'
  | 'Slider'
  | 'TextField'
  | 'TextEditor'
  | 'Picker'
  | 'DatePicker'
  | 'Stepper'
  | 'Link'
  // Containers
  | 'Spacer'
  | 'Divider'
  | 'Color'
  | 'GeometryReader'
  // Other
  | 'ForEach'
  | 'EmptyView'
  | 'AnyView';

/**
 * Known SwiftUI modifiers
 */
export type SwiftUIModifier =
  // Frame & sizing
  | 'frame'
  | 'fixedSize'
  | 'layoutPriority'
  // Padding & spacing
  | 'padding'
  | 'spacing'
  // Background & foreground
  | 'background'
  | 'foregroundColor'
  | 'foregroundStyle'
  | 'tint'
  // Shape & clipping
  | 'cornerRadius'
  | 'clipShape'
  | 'mask'
  // Effects
  | 'opacity'
  | 'blur'
  | 'shadow'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'grayscale'
  // Transform
  | 'rotationEffect'
  | 'rotation3DEffect'
  | 'scaleEffect'
  | 'offset'
  | 'position'
  // Text
  | 'font'
  | 'fontWeight'
  | 'lineLimit'
  | 'multilineTextAlignment'
  | 'truncationMode'
  | 'minimumScaleFactor'
  // Border & stroke
  | 'border'
  | 'overlay'
  // Other
  | 'zIndex'
  | 'blendMode'
  | 'compositingGroup'
  | 'drawingGroup'
  | 'allowsHitTesting'
  | 'contentShape';

// ============================================================================
// Mapping Types
// ============================================================================

/**
 * Mapping from SwiftUI view to DesignLibre node type
 */
export interface ViewToNodeMapping {
  /** DesignLibre node type */
  readonly nodeType: 'FRAME' | 'TEXT' | 'IMAGE' | 'VECTOR' | 'GROUP';
  /** Auto layout mode for containers */
  readonly autoLayoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  /** Additional default properties */
  readonly defaultProps?: Readonly<Record<string, unknown>>;
  /** Whether this view has children */
  readonly hasChildren: boolean;
}

/**
 * Mapping from SwiftUI modifier to DesignLibre property
 */
export interface ModifierToPropertyMapping {
  /** Target property path(s) in DesignLibre node */
  readonly propertyPaths: readonly string[];
  /** Value transformer */
  readonly transform?: (value: ParsedPropertyValue) => unknown;
  /** Whether this modifier is design-editable */
  readonly editable: boolean;
}

// ============================================================================
// Color Types
// ============================================================================

/**
 * SwiftUI color reference types
 */
export type SwiftUIColorType =
  | 'named'     // Color.red, Color.blue
  | 'rgb'       // Color(red: 1, green: 0, blue: 0)
  | 'hsb'       // Color(hue: 0.5, saturation: 0.5, brightness: 0.5)
  | 'hex'       // Color(hex: "FF0000")
  | 'uiColor'   // Color(uiColor: .systemRed)
  | 'asset'     // Color("AccentColor")
  | 'semantic'  // Color.primary, Color.secondary
  | 'dynamic';  // Different colors for light/dark mode

/**
 * Parsed SwiftUI color
 */
export interface ParsedSwiftUIColor {
  readonly type: SwiftUIColorType;
  /** Resolved RGBA value (if resolvable) */
  readonly rgba?: RGBA;
  /** Original expression */
  readonly expression: string;
  /** Asset name (for asset colors) */
  readonly assetName?: string;
  /** Is editable */
  readonly isEditable: boolean;
}

// ============================================================================
// Font Types
// ============================================================================

/**
 * SwiftUI font types
 */
export type SwiftUIFontType =
  | 'system'     // .system(size:weight:design:)
  | 'custom'     // .custom("FontName", size:)
  | 'semantic'   // .title, .body, .caption
  | 'dynamic';   // Dynamic type

/**
 * Parsed SwiftUI font
 */
export interface ParsedSwiftUIFont {
  readonly type: SwiftUIFontType;
  /** Font family */
  readonly family?: string;
  /** Font size in points */
  readonly size?: number;
  /** Font weight (100-900) */
  readonly weight?: number;
  /** Font design (default, rounded, serif, monospaced) */
  readonly design?: string;
  /** Original expression */
  readonly expression: string;
  /** Is editable */
  readonly isEditable: boolean;
}

// ============================================================================
// Xcode Project Types
// ============================================================================

/**
 * Xcode project structure
 */
export interface XcodeProject {
  /** Project root path */
  readonly rootPath: string;
  /** Project name */
  readonly name: string;
  /** Swift files found */
  readonly swiftFiles: readonly string[];
  /** Asset catalogs */
  readonly assetCatalogs: readonly string[];
  /** Main target name */
  readonly mainTarget?: string;
  /** Deployment target (iOS version) */
  readonly deploymentTarget?: string;
}

/**
 * Swift file info
 */
export interface SwiftFileInfo {
  /** File path */
  readonly path: string;
  /** File name */
  readonly name: string;
  /** SwiftUI views defined in file */
  readonly views: readonly string[];
  /** Imports */
  readonly imports: readonly string[];
  /** Is SwiftUI file */
  readonly isSwiftUI: boolean;
}
