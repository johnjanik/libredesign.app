/**
 * .preserve File Format Type Definitions
 *
 * The .preserve format is an open-source, LLM-friendly design document format.
 * It is a ZIP archive containing JSON files for all structured data.
 */

import type { RGBA } from '@core/types/color';

// =============================================================================
// Format Constants
// =============================================================================

export const PRESERVE_MIMETYPE = 'application/vnd.designlibre.preserve+zip';
export const PRESERVE_EXTENSION = '.preserve';
export const PRESERVE_FORMAT_VERSION = '1.0.0';

// =============================================================================
// Manifest Types
// =============================================================================

export interface PreserveManifestEntry {
  path: string;
  type: 'document' | 'page' | 'component' | 'tokens' | 'prototypes' | 'asset' | 'history';
  size: number;
  mediaType?: string;
}

export interface PreserveManifest {
  version: string;
  generator: string;
  created: string;
  modified: string;
  entries: PreserveManifestEntry[];
}

// =============================================================================
// Document Types
// =============================================================================

export interface PreserveDocumentSettings {
  colorSpace: 'sRGB' | 'Display P3';
  defaultUnit: 'px' | 'pt' | 'rem';
}

export interface PreservePageRef {
  id: string;
  name: string;
  path: string;
}

export interface PreserveAuthor {
  name: string;
  email?: string;
}

export interface PreserveDocument {
  $schema?: string;
  id: string;
  name: string;
  formatVersion: string;
  created: string;
  modified: string;
  authors?: PreserveAuthor[];
  pages: PreservePageRef[];
  settings: PreserveDocumentSettings;
}

// =============================================================================
// Node Types
// =============================================================================

export interface PreserveTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface PreserveSolidPaint {
  type: 'SOLID';
  color: RGBA;
  opacity?: number;
  visible?: boolean;
}

export interface PreserveGradientStop {
  position: number;
  color: RGBA;
}

export interface PreserveGradientPaint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR';
  stops: PreserveGradientStop[];
  opacity?: number;
  visible?: boolean;
}

export interface PreserveImagePaint {
  type: 'IMAGE';
  assetRef: string;
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  opacity?: number;
  visible?: boolean;
}

export type PreservePaint = PreserveSolidPaint | PreserveGradientPaint | PreserveImagePaint;

export interface PreserveShadowEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  color: RGBA;
  offset: { x: number; y: number };
  blur: number;
  spread: number;
  visible?: boolean;
}

export interface PreserveBlurEffect {
  type: 'BLUR' | 'BACKGROUND_BLUR';
  radius: number;
  visible?: boolean;
}

export type PreserveEffect = PreserveShadowEffect | PreserveBlurEffect;

export interface PreserveAppearance {
  opacity?: number;
  blendMode?: string;
  fills?: PreservePaint[];
  strokes?: PreservePaint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'CENTER' | 'OUTSIDE';
  strokeCap?: 'NONE' | 'ROUND' | 'SQUARE';
  strokeJoin?: 'MITER' | 'BEVEL' | 'ROUND';
  dashPattern?: number[];
  effects?: PreserveEffect[];
  cornerRadius?: number | [number, number, number, number];
}

export interface PreserveLayout {
  autoLayout?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  padding?: { top: number; right: number; bottom: number; left: number };
  gap?: number;
  alignItems?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
  justifyContent?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
}

export interface PreserveConstraints {
  horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
}

export interface PreservePathCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface PreserveVectorPath {
  windingRule: 'NONZERO' | 'EVENODD';
  commands: PreservePathCommand[];
}

export interface PreserveTextStyle {
  start: number;
  end: number;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight?: { unit: 'PERCENT' | 'PIXELS' | 'AUTO'; value?: number };
  letterSpacing?: { unit: 'PERCENT' | 'PIXELS'; value: number };
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  fills?: PreservePaint[];
}

export interface PreserveOverride {
  path: string[];
  value: unknown;
}

// Base node structure
export interface PreserveNodeBase {
  id: string;
  type: string;
  name: string;
  visible?: boolean;
  locked?: boolean;
}

// Frame/Group node
export interface PreserveFrameNode extends PreserveNodeBase {
  type: 'FRAME' | 'GROUP';
  transform: PreserveTransform;
  appearance?: PreserveAppearance;
  layout?: PreserveLayout;
  constraints?: PreserveConstraints;
  clipContent?: boolean;
  children?: PreserveNode[];
}

// Vector node
export interface PreserveVectorNode extends PreserveNodeBase {
  type: 'VECTOR';
  transform: PreserveTransform;
  appearance?: PreserveAppearance;
  constraints?: PreserveConstraints;
  paths: PreserveVectorPath[];
}

// Text node
export interface PreserveTextNode extends PreserveNodeBase {
  type: 'TEXT';
  transform: PreserveTransform;
  appearance?: PreserveAppearance;
  constraints?: PreserveConstraints;
  characters: string;
  styles: PreserveTextStyle[];
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  textAutoResize?: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT';
}

// Image node
export interface PreserveImageNode extends PreserveNodeBase {
  type: 'IMAGE';
  transform: PreserveTransform;
  appearance?: PreserveAppearance;
  constraints?: PreserveConstraints;
  assetRef: string;
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  naturalWidth: number;
  naturalHeight: number;
}

// Component node
export interface PreserveComponentNode extends PreserveNodeBase {
  type: 'COMPONENT';
  transform: PreserveTransform;
  appearance?: PreserveAppearance;
  layout?: PreserveLayout;
  constraints?: PreserveConstraints;
  propertyDefinitions?: Record<string, PreservePropertyDefinition>;
  children?: PreserveNode[];
}

// Instance node
export interface PreserveInstanceNode extends PreserveNodeBase {
  type: 'INSTANCE';
  transform: PreserveTransform;
  constraints?: PreserveConstraints;
  componentRef: string;
  overrides?: PreserveOverride[];
}

// Boolean operation node
export interface PreserveBooleanNode extends PreserveNodeBase {
  type: 'BOOLEAN_OPERATION';
  transform: PreserveTransform;
  appearance?: PreserveAppearance;
  constraints?: PreserveConstraints;
  booleanOperation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';
  children?: PreserveNode[];
}

// Slice node
export interface PreserveSliceNode extends PreserveNodeBase {
  type: 'SLICE';
  transform: PreserveTransform;
  exportSettings?: PreserveExportSetting[];
}

export interface PreserveExportSetting {
  format: 'PNG' | 'JPG' | 'SVG' | 'PDF';
  suffix?: string;
  scale?: number;
}

export type PreserveNode =
  | PreserveFrameNode
  | PreserveVectorNode
  | PreserveTextNode
  | PreserveImageNode
  | PreserveComponentNode
  | PreserveInstanceNode
  | PreserveBooleanNode
  | PreserveSliceNode;

// =============================================================================
// Page Types
// =============================================================================

export interface PreservePage {
  $schema?: string;
  id: string;
  name: string;
  backgroundColor?: RGBA;
  nodes: PreserveNode[];
}

// =============================================================================
// Component Types
// =============================================================================

export interface PreservePropertyDefinition {
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
  defaultValue: unknown;
  preferredValues?: unknown[];
}

export interface PreserveComponentEntry {
  id: string;
  name: string;
  path: string;
  description?: string;
  created: string;
  modified: string;
}

export interface PreserveComponentSet {
  id: string;
  name: string;
  components: string[];
  variantProperties: string[];
}

export interface PreserveComponentRegistry {
  $schema?: string;
  components: PreserveComponentEntry[];
  componentSets: PreserveComponentSet[];
}

export interface PreserveComponent {
  $schema?: string;
  id: string;
  name: string;
  description?: string;
  propertyDefinitions?: Record<string, PreservePropertyDefinition>;
  nodes: PreserveNode[];
}

// =============================================================================
// Token Types
// =============================================================================

export interface PreserveColorToken {
  id: string;
  name: string;
  type: 'COLOR';
  value: RGBA;
  variants?: Record<string, RGBA>;
  description?: string;
}

export interface PreserveTypographyValue {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight?: { unit: 'PERCENT' | 'PIXELS' | 'AUTO'; value?: number };
  letterSpacing?: { unit: 'PERCENT' | 'PIXELS'; value: number };
}

export interface PreserveTypographyToken {
  id: string;
  name: string;
  type: 'TYPOGRAPHY';
  value: PreserveTypographyValue;
  description?: string;
}

export interface PreserveSpacingToken {
  id: string;
  name: string;
  type: 'SPACING';
  value: number;
  description?: string;
}

export interface PreserveShadowValue {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  color: RGBA;
  offset: { x: number; y: number };
  blur: number;
  spread: number;
}

export interface PreserveShadowToken {
  id: string;
  name: string;
  type: 'SHADOW';
  value: PreserveShadowValue;
  description?: string;
}

export interface PreserveRadiusToken {
  id: string;
  name: string;
  type: 'RADIUS';
  value: number | [number, number, number, number];
  description?: string;
}

export type PreserveToken =
  | PreserveColorToken
  | PreserveTypographyToken
  | PreserveSpacingToken
  | PreserveShadowToken
  | PreserveRadiusToken;

export interface PreserveTokenGroup {
  name: string;
  tokens: PreserveToken[];
}

export interface PreserveTokens {
  $schema?: string;
  version: string;
  groups: PreserveTokenGroup[];
}

// =============================================================================
// Prototype Types
// =============================================================================

export interface PreserveFlow {
  id: string;
  name: string;
  startingPoint: string;
  description?: string;
}

export interface PreserveTrigger {
  type: 'ON_CLICK' | 'ON_HOVER' | 'ON_PRESS' | 'ON_DRAG' | 'AFTER_TIMEOUT' | 'MOUSE_ENTER' | 'MOUSE_LEAVE';
  delay?: number;
}

export interface PreserveTransition {
  type: 'INSTANT' | 'DISSOLVE' | 'SMART_ANIMATE' | 'MOVE_IN' | 'MOVE_OUT' | 'PUSH' | 'SLIDE_IN' | 'SLIDE_OUT';
  duration?: number;
  easing?: 'LINEAR' | 'EASE_IN' | 'EASE_OUT' | 'EASE_IN_OUT' | 'SPRING';
  direction?: 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM';
}

export interface PreserveNavigateAction {
  type: 'NAVIGATE';
  destinationPageId: string;
  transition?: PreserveTransition;
}

export interface PreserveOverlayAction {
  type: 'OPEN_OVERLAY' | 'CLOSE_OVERLAY';
  overlayNodeId?: string;
  position?: 'CENTER' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'MANUAL';
  offset?: { x: number; y: number };
}

export interface PreserveUrlAction {
  type: 'OPEN_URL';
  url: string;
  openInNewTab?: boolean;
}

export type PreserveAction = PreserveNavigateAction | PreserveOverlayAction | PreserveUrlAction;

export interface PreserveInteraction {
  id: string;
  sourceNodeId: string;
  trigger: PreserveTrigger;
  actions: PreserveAction[];
}

export interface PreservePrototypes {
  $schema?: string;
  flows: PreserveFlow[];
  interactions: PreserveInteraction[];
}

// =============================================================================
// Asset Types
// =============================================================================

export interface PreserveAsset {
  id: string;
  name: string;
  path: string;
  type: 'image' | 'font' | 'video' | 'other';
  mediaType: string;
  size: number;
  width?: number;
  height?: number;
  hash?: string;
}

export interface PreserveExternalRef {
  id: string;
  name: string;
  type: 'image' | 'font' | 'video' | 'other';
  url: string;
  mediaType: string;
  size?: number;
}

export interface PreserveAssetManifest {
  $schema?: string;
  assets: PreserveAsset[];
  externalRefs?: PreserveExternalRef[];
}

// =============================================================================
// History Types
// =============================================================================

export interface PreserveChangelogEntry {
  version: string;
  date: string;
  author?: string;
  message: string;
}

export interface PreserveCommentMessage {
  author: string;
  text: string;
  timestamp: string;
}

export interface PreserveComment {
  id: string;
  nodeId: string;
  author: string;
  created: string;
  resolved: boolean;
  thread: PreserveCommentMessage[];
}

export interface PreserveHistory {
  $schema?: string;
  currentVersion: string;
  changelog: PreserveChangelogEntry[];
  comments: PreserveComment[];
}

// =============================================================================
// Writer/Reader Options
// =============================================================================

export interface PreserveWriteOptions {
  includeThumbnail?: boolean;
  thumbnailSize?: number;
  includeHistory?: boolean;
  compression?: 'STORE' | 'DEFLATE';
}

export interface PreserveReadOptions {
  validateSchema?: boolean;
  loadAssets?: boolean;
}

// =============================================================================
// Full Archive Structure
// =============================================================================

export interface PreserveArchive {
  manifest: PreserveManifest;
  document: PreserveDocument;
  pages: Map<string, PreservePage>;
  components?: PreserveComponentRegistry;
  componentData?: Map<string, PreserveComponent>;
  tokens?: PreserveTokens;
  prototypes?: PreservePrototypes;
  assets?: PreserveAssetManifest;
  assetData?: Map<string, Blob>;
  history?: PreserveHistory;
  thumbnail?: Blob;
}
