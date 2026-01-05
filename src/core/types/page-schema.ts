/**
 * DesignLibre Page Schema
 *
 * Defines the JSON structure for individual page files.
 * Pages are stored as separate files for git-friendly diffs.
 *
 * @version 1.0.0
 * @license MIT
 */

import type { BlendMode, LayoutConstraints, BooleanOperation, ExportSetting } from './common';
import type { RGBA } from './color';

// =============================================================================
// Page File Structure
// =============================================================================

/**
 * Root structure of a page JSON file
 */
export interface PageFile {
  /**
   * Schema reference for validation
   */
  readonly $schema: 'https://designlibre.app/schemas/page-v1.json';

  /**
   * Page format version
   */
  readonly version: '1.0.0';

  /**
   * Page metadata
   */
  readonly page: PageMetadata;

  /**
   * Canvas configuration
   */
  readonly canvas: CanvasSettings;

  /**
   * All nodes in the page (flat map for efficient lookup)
   * Key is NodeId, value is the node data
   */
  readonly nodes: Record<string, SerializedNode>;

  /**
   * Root node IDs (top-level frames/groups on the canvas)
   * Order matters - determines layer stacking
   */
  readonly rootNodeIds: string[];

  /**
   * Prototyping flows and interactions
   */
  readonly prototype?: PrototypeConfig;

  /**
   * Annotations and comments
   */
  readonly annotations?: Annotation[];

  /**
   * Layout guides
   */
  readonly guides?: Guide[];

  /**
   * Page-level export presets
   */
  readonly exportPresets?: ExportPreset[];

  /**
   * Component instances referenced from external libraries
   */
  readonly externalReferences?: ExternalReference[];

  /**
   * Custom metadata (for plugins, migrations, etc.)
   */
  readonly meta?: Record<string, unknown>;
}

// =============================================================================
// Page Metadata
// =============================================================================

export interface PageMetadata {
  /**
   * Unique page identifier (matches manifest)
   */
  readonly id: string;

  /**
   * Display name
   */
  readonly name: string;

  /**
   * Page description (supports markdown)
   */
  readonly description?: string;

  /**
   * Page type
   */
  readonly type: PageType;

  /**
   * Workflow status
   */
  readonly status: PageStatus;

  /**
   * Creation timestamp (ISO 8601)
   */
  readonly createdAt: string;

  /**
   * Last modification timestamp (ISO 8601)
   */
  readonly updatedAt: string;

  /**
   * Author of last modification
   */
  readonly updatedBy?: string;

  /**
   * Tags for organization
   */
  readonly tags?: string[];

  /**
   * Cover image for thumbnails (relative path)
   */
  readonly coverImage?: string;
}

export type PageType =
  | 'canvas'      // Free-form design canvas
  | 'component'   // Component documentation
  | 'prototype'   // Interactive prototype
  | 'specs'       // Developer specifications
  | 'archive';    // Archived content

export type PageStatus =
  | 'draft'       // Work in progress
  | 'in-review'   // Ready for review
  | 'approved'    // Approved for use
  | 'archived';   // No longer active

// =============================================================================
// Canvas Settings
// =============================================================================

export interface CanvasSettings {
  /**
   * Canvas background color
   */
  readonly backgroundColor: RGBA;

  /**
   * Show grid overlay
   */
  readonly showGrid: boolean;

  /**
   * Grid size in pixels
   */
  readonly gridSize: number;

  /**
   * Grid color
   */
  readonly gridColor?: RGBA;

  /**
   * Show layout grid (columns/rows)
   */
  readonly showLayoutGrid: boolean;

  /**
   * Layout grid configuration
   */
  readonly layoutGrid?: LayoutGridConfig;

  /**
   * Initial viewport position
   */
  readonly viewportCenter?: { x: number; y: number };

  /**
   * Initial zoom level
   */
  readonly viewportZoom?: number;
}

export interface LayoutGridConfig {
  /**
   * Column configuration
   */
  readonly columns?: GridColumns;

  /**
   * Row configuration
   */
  readonly rows?: GridRows;
}

export interface GridColumns {
  readonly count: number;
  readonly width: number | 'stretch';
  readonly offset: number;
  readonly gutter: number;
  readonly margin: number;
  readonly color: RGBA;
}

export interface GridRows {
  readonly count: number | 'auto';
  readonly height: number;
  readonly offset: number;
  readonly gutter: number;
  readonly color: RGBA;
}

// =============================================================================
// Serialized Node Types
// =============================================================================

/**
 * Base properties for all serialized nodes
 */
export interface SerializedBaseNode {
  readonly id: string;
  readonly type: SerializedNodeType;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly parentId: string | null;
  readonly childIds: string[];
  readonly pluginData?: Record<string, unknown>;
}

export type SerializedNodeType =
  | 'FRAME'
  | 'GROUP'
  | 'VECTOR'
  | 'TEXT'
  | 'IMAGE'
  | 'COMPONENT'
  | 'INSTANCE'
  | 'BOOLEAN_OPERATION'
  | 'SLICE'
  | 'LINE'
  | 'ELLIPSE'
  | 'RECTANGLE'
  | 'POLYGON'
  | 'STAR';

/**
 * Transform properties
 */
export interface SerializedTransform {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

/**
 * Appearance properties
 */
export interface SerializedAppearance {
  readonly opacity: number;
  readonly blendMode: BlendMode;
  readonly fills: SerializedPaint[];
  readonly strokes: SerializedPaint[];
  readonly strokeWeight: number;
  readonly strokeAlign: 'INSIDE' | 'CENTER' | 'OUTSIDE';
  readonly strokeCap: 'NONE' | 'ROUND' | 'SQUARE';
  readonly strokeJoin: 'MITER' | 'BEVEL' | 'ROUND';
  readonly strokeMiterLimit?: number;
  readonly dashPattern?: number[];
  readonly dashOffset?: number;
  readonly effects: SerializedEffect[];
}

/**
 * Serialized paint (fill/stroke)
 */
export type SerializedPaint =
  | SerializedSolidPaint
  | SerializedGradientPaint
  | SerializedImagePaint;

export interface SerializedSolidPaint {
  readonly type: 'SOLID';
  readonly visible: boolean;
  readonly opacity: number;
  readonly color: RGBA;
}

export interface SerializedGradientPaint {
  readonly type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  readonly visible: boolean;
  readonly opacity: number;
  readonly stops: Array<{
    readonly position: number;
    readonly color: RGBA;
  }>;
  /**
   * 2x3 affine transform matrix [a, b, c, d, tx, ty]
   */
  readonly transform: [number, number, number, number, number, number];
}

export interface SerializedImagePaint {
  readonly type: 'IMAGE';
  readonly visible: boolean;
  readonly opacity: number;
  /**
   * Reference to asset (relative path or hash)
   */
  readonly imageRef: string;
  readonly scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  readonly transform?: [number, number, number, number, number, number];
}

/**
 * Serialized effect
 */
export type SerializedEffect =
  | SerializedDropShadow
  | SerializedInnerShadow
  | SerializedBlur
  | SerializedBackgroundBlur;

export interface SerializedDropShadow {
  readonly type: 'DROP_SHADOW';
  readonly visible: boolean;
  readonly color: RGBA;
  readonly offset: { x: number; y: number };
  readonly radius: number;
  readonly spread: number;
}

export interface SerializedInnerShadow {
  readonly type: 'INNER_SHADOW';
  readonly visible: boolean;
  readonly color: RGBA;
  readonly offset: { x: number; y: number };
  readonly radius: number;
  readonly spread: number;
}

export interface SerializedBlur {
  readonly type: 'BLUR';
  readonly visible: boolean;
  readonly radius: number;
}

export interface SerializedBackgroundBlur {
  readonly type: 'BACKGROUND_BLUR';
  readonly visible: boolean;
  readonly radius: number;
}

/**
 * Corner radius (single value or per-corner)
 */
export type CornerRadius =
  | number
  | {
      readonly topLeft: number;
      readonly topRight: number;
      readonly bottomRight: number;
      readonly bottomLeft: number;
    };

// =============================================================================
// Specific Node Types
// =============================================================================

/**
 * Frame node (container with layout)
 */
export interface SerializedFrameNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'FRAME';
  readonly clipsContent: boolean;
  readonly constraints: LayoutConstraints;
  readonly cornerRadius: CornerRadius;
  readonly autoLayout?: SerializedAutoLayout;
}

export interface SerializedAutoLayout {
  readonly mode: 'HORIZONTAL' | 'VERTICAL';
  readonly itemSpacing: number;
  readonly padding: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  readonly primaryAxisAlign: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  readonly counterAxisAlign: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  readonly primaryAxisSizing: 'FIXED' | 'AUTO';
  readonly counterAxisSizing: 'FIXED' | 'AUTO';
  readonly wrap: boolean;
}

/**
 * Rectangle node
 */
export interface SerializedRectangleNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'RECTANGLE';
  readonly constraints: LayoutConstraints;
  readonly cornerRadius: CornerRadius;
}

/**
 * Ellipse node
 */
export interface SerializedEllipseNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'ELLIPSE';
  readonly constraints: LayoutConstraints;
  /**
   * Arc settings for partial ellipses
   */
  readonly arcData?: {
    readonly startingAngle: number;
    readonly endingAngle: number;
    readonly innerRadius: number;
  };
}

/**
 * Line node
 */
export interface SerializedLineNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'LINE';
  readonly constraints: LayoutConstraints;
}

/**
 * Polygon node
 */
export interface SerializedPolygonNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'POLYGON';
  readonly constraints: LayoutConstraints;
  readonly pointCount: number;
}

/**
 * Star node
 */
export interface SerializedStarNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'STAR';
  readonly constraints: LayoutConstraints;
  readonly pointCount: number;
  readonly innerRadius: number;
}

/**
 * Vector/path node
 */
export interface SerializedVectorNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'VECTOR';
  readonly constraints: LayoutConstraints;
  readonly vectorPaths: SerializedVectorPath[];
}

export interface SerializedVectorPath {
  /**
   * SVG path data string
   */
  readonly data: string;
  /**
   * Winding rule
   */
  readonly windingRule: 'NONZERO' | 'EVENODD';
}

/**
 * Group node
 */
export interface SerializedGroupNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'GROUP';
  readonly constraints: LayoutConstraints;
}

/**
 * Text node
 */
export interface SerializedTextNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'TEXT';
  readonly constraints: LayoutConstraints;
  /**
   * Text content
   */
  readonly characters: string;
  /**
   * Text style ranges (for mixed formatting)
   */
  readonly styleRanges: SerializedTextStyleRange[];
  /**
   * Auto-resize behavior
   */
  readonly textAutoResize: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT';
  /**
   * Horizontal alignment
   */
  readonly textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  /**
   * Vertical alignment
   */
  readonly textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
  /**
   * Paragraph spacing
   */
  readonly paragraphSpacing?: number;
}

export interface SerializedTextStyleRange {
  readonly start: number;
  readonly end: number;
  readonly fontFamily: string;
  readonly fontWeight: number;
  readonly fontStyle?: 'normal' | 'italic';
  readonly fontSize: number;
  readonly lineHeight: number | { unit: 'PERCENT' | 'PIXELS'; value: number } | 'AUTO';
  readonly letterSpacing: number | { unit: 'PERCENT' | 'PIXELS'; value: number };
  readonly fills?: SerializedPaint[];
  readonly textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  readonly textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  /**
   * OpenType features
   */
  readonly openTypeFeatures?: Record<string, boolean>;
}

/**
 * Image node
 */
export interface SerializedImageNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'IMAGE';
  readonly constraints: LayoutConstraints;
  /**
   * Reference to image asset
   */
  readonly imageRef: string;
  /**
   * Original image dimensions
   */
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  /**
   * Scale mode
   */
  readonly scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  /**
   * Corner radius
   */
  readonly cornerRadius?: CornerRadius;
}

/**
 * Component definition node
 */
export interface SerializedComponentNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'COMPONENT';
  readonly constraints: LayoutConstraints;
  readonly clipsContent: boolean;
  readonly cornerRadius?: CornerRadius;
  readonly autoLayout?: SerializedAutoLayout;
  /**
   * Component properties (for variants)
   */
  readonly componentProperties?: Record<string, ComponentProperty>;
  /**
   * Component set this belongs to (for variants)
   */
  readonly componentSetId?: string;
  /**
   * Variant properties (for components in a set)
   */
  readonly variantProperties?: Record<string, string>;
}

export interface ComponentProperty {
  readonly type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
  readonly defaultValue: unknown;
  readonly preferredValues?: unknown[];
  /**
   * For INSTANCE_SWAP, component IDs that can be swapped
   */
  readonly swapCandidates?: string[];
}

/**
 * Component instance node
 */
export interface SerializedInstanceNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'INSTANCE';
  readonly constraints: LayoutConstraints;
  readonly clipsContent: boolean;
  readonly cornerRadius?: CornerRadius;
  readonly autoLayout?: SerializedAutoLayout;
  /**
   * ID of the main component
   */
  readonly componentId: string;
  /**
   * Property overrides
   */
  readonly overrides: SerializedOverride[];
  /**
   * Exposed instances (for nested overrides)
   */
  readonly exposedInstances?: string[];
}

export interface SerializedOverride {
  /**
   * Path to the overridden property
   * e.g., ["fills", "0", "color"] or ["children", "button-text", "characters"]
   */
  readonly path: string[];
  /**
   * Override value
   */
  readonly value: unknown;
}

/**
 * Boolean operation node
 */
export interface SerializedBooleanOperationNode extends SerializedBaseNode, SerializedTransform, SerializedAppearance {
  readonly type: 'BOOLEAN_OPERATION';
  readonly constraints: LayoutConstraints;
  readonly booleanOperation: BooleanOperation;
}

/**
 * Slice (export region) node
 */
export interface SerializedSliceNode extends SerializedBaseNode, SerializedTransform {
  readonly type: 'SLICE';
  readonly exportSettings: ExportSetting[];
}

/**
 * Union of all serialized node types
 */
export type SerializedNode =
  | SerializedFrameNode
  | SerializedRectangleNode
  | SerializedEllipseNode
  | SerializedLineNode
  | SerializedPolygonNode
  | SerializedStarNode
  | SerializedVectorNode
  | SerializedGroupNode
  | SerializedTextNode
  | SerializedImageNode
  | SerializedComponentNode
  | SerializedInstanceNode
  | SerializedBooleanOperationNode
  | SerializedSliceNode;

// =============================================================================
// Prototyping
// =============================================================================

export interface PrototypeConfig {
  /**
   * Starting frame for prototype
   */
  readonly startingFrameId?: string;

  /**
   * Device frame preset
   */
  readonly device?: PrototypeDevice;

  /**
   * All prototype flows
   */
  readonly flows: PrototypeFlow[];

  /**
   * Prototype settings
   */
  readonly settings?: PrototypeSettings;
}

export interface PrototypeDevice {
  readonly type: 'PHONE' | 'TABLET' | 'DESKTOP' | 'WATCH' | 'CUSTOM';
  readonly name?: string;
  readonly width: number;
  readonly height: number;
  readonly presetId?: string;
}

export interface PrototypeSettings {
  readonly backgroundColor?: RGBA;
  readonly showDeviceFrame?: boolean;
  readonly showHotspots?: boolean;
  readonly showCursor?: boolean;
}

export interface PrototypeFlow {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly startingFrameId: string;
  readonly interactions: PrototypeInteraction[];
}

export interface PrototypeInteraction {
  readonly id: string;
  /**
   * Node that triggers the interaction
   */
  readonly triggerNodeId: string;
  /**
   * Trigger type
   */
  readonly trigger: InteractionTrigger;
  /**
   * Actions to perform
   */
  readonly actions: InteractionAction[];
}

export type InteractionTrigger =
  | { readonly type: 'ON_CLICK' }
  | { readonly type: 'ON_HOVER' }
  | { readonly type: 'ON_PRESS' }
  | { readonly type: 'ON_DRAG' }
  | { readonly type: 'MOUSE_ENTER' }
  | { readonly type: 'MOUSE_LEAVE' }
  | { readonly type: 'MOUSE_DOWN' }
  | { readonly type: 'MOUSE_UP' }
  | { readonly type: 'AFTER_TIMEOUT'; readonly timeout: number }
  | { readonly type: 'ON_KEY_DOWN'; readonly keyCodes: number[] };

export type InteractionAction =
  | NavigateAction
  | OpenOverlayAction
  | SwapOverlayAction
  | CloseOverlayAction
  | BackAction
  | OpenUrlAction
  | SetVariableAction
  | ConditionalAction;

export interface NavigateAction {
  readonly type: 'NAVIGATE';
  readonly destinationId: string;
  readonly transition: Transition;
  readonly preserveScrollPosition?: boolean;
}

export interface OpenOverlayAction {
  readonly type: 'OPEN_OVERLAY';
  readonly overlayId: string;
  readonly transition: Transition;
  readonly overlayBackground?: RGBA;
  readonly closeOnClickOutside?: boolean;
  readonly position?: OverlayPosition;
}

export interface SwapOverlayAction {
  readonly type: 'SWAP_OVERLAY';
  readonly overlayId: string;
  readonly transition: Transition;
}

export interface CloseOverlayAction {
  readonly type: 'CLOSE_OVERLAY';
  readonly transition: Transition;
}

export interface BackAction {
  readonly type: 'BACK';
  readonly transition: Transition;
}

export interface OpenUrlAction {
  readonly type: 'OPEN_URL';
  readonly url: string;
  readonly openInNewTab: boolean;
}

export interface SetVariableAction {
  readonly type: 'SET_VARIABLE';
  readonly variableId: string;
  readonly operation: 'SET' | 'TOGGLE' | 'INCREMENT' | 'DECREMENT';
  readonly value?: string | number | boolean;
}

export interface ConditionalAction {
  readonly type: 'CONDITIONAL';
  readonly conditions: Array<{
    readonly expression: string;
    readonly actions: InteractionAction[];
  }>;
  readonly elseActions?: InteractionAction[];
}

export type OverlayPosition =
  | { readonly type: 'CENTER' }
  | { readonly type: 'TOP_LEFT' }
  | { readonly type: 'TOP_CENTER' }
  | { readonly type: 'TOP_RIGHT' }
  | { readonly type: 'BOTTOM_LEFT' }
  | { readonly type: 'BOTTOM_CENTER' }
  | { readonly type: 'BOTTOM_RIGHT' }
  | { readonly type: 'MANUAL'; readonly x: number; readonly y: number };

export interface Transition {
  readonly type: TransitionType;
  readonly duration: number;
  readonly easing: EasingType;
  readonly direction?: TransitionDirection;
}

export type TransitionType =
  | 'INSTANT'
  | 'DISSOLVE'
  | 'SMART_ANIMATE'
  | 'SLIDE_IN'
  | 'SLIDE_OUT'
  | 'PUSH'
  | 'MOVE_IN'
  | 'MOVE_OUT';

export type TransitionDirection = 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM';

export type EasingType =
  | 'LINEAR'
  | 'EASE_IN'
  | 'EASE_OUT'
  | 'EASE_IN_OUT'
  | 'EASE_IN_BACK'
  | 'EASE_OUT_BACK'
  | 'EASE_IN_OUT_BACK'
  | 'CUSTOM';

// =============================================================================
// Annotations
// =============================================================================

export interface Annotation {
  readonly id: string;
  /**
   * Annotation type
   */
  readonly type: AnnotationType;
  /**
   * Content (supports markdown)
   */
  readonly content: string;
  /**
   * Node this annotation is attached to (if any)
   */
  readonly attachedToNodeId?: string;
  /**
   * Position on canvas (if not attached)
   */
  readonly position?: { x: number; y: number };
  /**
   * Visibility settings
   */
  readonly visibility: 'always' | 'hover' | 'hidden';
  /**
   * Author
   */
  readonly author: string;
  /**
   * Created timestamp
   */
  readonly createdAt: string;
  /**
   * Updated timestamp
   */
  readonly updatedAt: string;
  /**
   * Resolution status (for questions/todos)
   */
  readonly resolved?: boolean;
  /**
   * Replies (threaded comments)
   */
  readonly replies?: AnnotationReply[];
  /**
   * Category/label
   */
  readonly category?: string;
  /**
   * Priority level
   */
  readonly priority?: 'low' | 'medium' | 'high' | 'critical';
  /**
   * Pin color
   */
  readonly pinColor?: RGBA;
}

export type AnnotationType =
  | 'note'       // General note
  | 'comment'    // Discussion comment
  | 'todo'       // Action item
  | 'question'   // Question for team
  | 'spec'       // Developer specification
  | 'decision'   // Design decision documentation
  | 'feedback';  // Review feedback

export interface AnnotationReply {
  readonly id: string;
  readonly content: string;
  readonly author: string;
  readonly createdAt: string;
}

// =============================================================================
// Guides
// =============================================================================

export interface Guide {
  readonly id: string;
  readonly type: 'horizontal' | 'vertical';
  /**
   * Position in pixels
   */
  readonly position: number;
  /**
   * Guide color
   */
  readonly color?: RGBA;
  /**
   * Locked (cannot be moved)
   */
  readonly locked?: boolean;
}

// =============================================================================
// Export Presets
// =============================================================================

export interface ExportPreset {
  readonly id: string;
  readonly name: string;
  readonly settings: ExportSetting[];
}

// =============================================================================
// External References
// =============================================================================

export interface ExternalReference {
  /**
   * Node ID in this page that references external component
   */
  readonly instanceNodeId: string;
  /**
   * Library identifier (from manifest)
   */
  readonly libraryId: string;
  /**
   * Component key in the library
   */
  readonly componentKey: string;
  /**
   * Version pinning
   */
  readonly version?: string;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an empty page file
 */
export function createEmptyPage(
  id: string,
  name: string,
  type: PageType = 'canvas'
): PageFile {
  const now = new Date().toISOString();

  return {
    $schema: 'https://designlibre.app/schemas/page-v1.json',
    version: '1.0.0',
    page: {
      id,
      name,
      type,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    },
    canvas: {
      backgroundColor: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
      showGrid: true,
      gridSize: 8,
      showLayoutGrid: false,
    },
    nodes: {},
    rootNodeIds: [],
  };
}

/**
 * Create a frame node
 */
export function createFrameNode(
  id: string,
  name: string,
  options: Partial<Omit<SerializedFrameNode, 'id' | 'type' | 'name'>> = {}
): SerializedFrameNode {
  return {
    id,
    type: 'FRAME',
    name,
    visible: true,
    locked: false,
    parentId: null,
    childIds: [],
    x: 0,
    y: 0,
    width: 375,
    height: 812,
    rotation: 0,
    opacity: 1,
    blendMode: 'NORMAL',
    fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 1, b: 1, a: 1 } }],
    strokes: [],
    strokeWeight: 1,
    strokeAlign: 'INSIDE',
    strokeCap: 'NONE',
    strokeJoin: 'MITER',
    effects: [],
    clipsContent: true,
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
    cornerRadius: 0,
    ...options,
  };
}

/**
 * Create a text node
 */
export function createTextNode(
  id: string,
  name: string,
  characters: string,
  options: Partial<Omit<SerializedTextNode, 'id' | 'type' | 'name' | 'characters'>> = {}
): SerializedTextNode {
  return {
    id,
    type: 'TEXT',
    name,
    characters,
    visible: true,
    locked: false,
    parentId: null,
    childIds: [],
    x: 0,
    y: 0,
    width: 100,
    height: 24,
    rotation: 0,
    opacity: 1,
    blendMode: 'NORMAL',
    fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0, a: 1 } }],
    strokes: [],
    strokeWeight: 0,
    strokeAlign: 'OUTSIDE',
    strokeCap: 'NONE',
    strokeJoin: 'MITER',
    effects: [],
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
    styleRanges: [{
      start: 0,
      end: characters.length,
      fontFamily: 'Inter',
      fontWeight: 400,
      fontSize: 16,
      lineHeight: 'AUTO',
      letterSpacing: 0,
    }],
    textAutoResize: 'WIDTH_AND_HEIGHT',
    textAlignHorizontal: 'LEFT',
    textAlignVertical: 'TOP',
    ...options,
  };
}

/**
 * Validate a page file
 */
export function validatePageFile(
  page: unknown
): { valid: true; page: PageFile } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!page || typeof page !== 'object') {
    return { valid: false, errors: ['Page must be an object'] };
  }

  const p = page as Record<string, unknown>;

  // Required fields
  if (!p['$schema']) errors.push('Missing $schema');
  if (!p['version']) errors.push('Missing version');
  if (!p['page']) errors.push('Missing page metadata');
  if (!p['canvas']) errors.push('Missing canvas settings');
  if (!p['nodes']) errors.push('Missing nodes');
  if (!p['rootNodeIds']) errors.push('Missing rootNodeIds');

  // Page metadata validation
  if (p['page'] && typeof p['page'] === 'object') {
    const meta = p['page'] as Record<string, unknown>;
    if (!meta['id']) errors.push('Missing page.id');
    if (!meta['name']) errors.push('Missing page.name');
    if (!meta['type']) errors.push('Missing page.type');
    if (!meta['status']) errors.push('Missing page.status');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, page: page as PageFile };
}
