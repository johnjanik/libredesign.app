/**
 * .seed File Format Type Definitions
 *
 * The .seed format is an open-source, LLM-friendly design document format.
 * It is a ZIP archive containing JSON files for all structured data.
 */

import type { RGBA } from '@core/types/color';

// =============================================================================
// Format Constants
// =============================================================================

export const SEED_MIMETYPE = 'application/vnd.designlibre.seed+zip';
export const SEED_EXTENSION = '.seed';
export const SEED_FORMAT_VERSION = '1.0.0';

// =============================================================================
// Manifest Types
// =============================================================================

export interface SeedManifestEntry {
  path: string;
  type: 'document' | 'page' | 'component' | 'tokens' | 'prototypes' | 'asset' | 'history';
  size: number;
  mediaType?: string;
}

export interface SeedManifest {
  version: string;
  generator: string;
  created: string;
  modified: string;
  entries: SeedManifestEntry[];
}

// =============================================================================
// Document Types
// =============================================================================

export interface SeedDocumentSettings {
  colorSpace: 'sRGB' | 'Display P3';
  defaultUnit: 'px' | 'pt' | 'rem';
}

export interface SeedPageRef {
  id: string;
  name: string;
  path: string;
}

export interface SeedAuthor {
  name: string;
  email?: string;
}

export interface SeedDocument {
  $schema?: string;
  id: string;
  name: string;
  formatVersion: string;
  created: string;
  modified: string;
  authors?: SeedAuthor[];
  pages: SeedPageRef[];
  settings: SeedDocumentSettings;
}

// =============================================================================
// Node Types
// =============================================================================

export interface SeedTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface SeedSolidPaint {
  type: 'SOLID';
  color: RGBA;
  opacity?: number;
  visible?: boolean;
}

export interface SeedGradientStop {
  position: number;
  color: RGBA;
}

export interface SeedGradientPaint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR';
  stops: SeedGradientStop[];
  opacity?: number;
  visible?: boolean;
}

export interface SeedImagePaint {
  type: 'IMAGE';
  assetRef: string;
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  opacity?: number;
  visible?: boolean;
}

export type SeedPaint = SeedSolidPaint | SeedGradientPaint | SeedImagePaint;

export interface SeedShadowEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  color: RGBA;
  offset: { x: number; y: number };
  blur: number;
  spread: number;
  visible?: boolean;
}

export interface SeedBlurEffect {
  type: 'BLUR' | 'BACKGROUND_BLUR';
  radius: number;
  visible?: boolean;
}

export type SeedEffect = SeedShadowEffect | SeedBlurEffect;

export interface SeedAppearance {
  opacity?: number;
  blendMode?: string;
  fills?: SeedPaint[];
  strokes?: SeedPaint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'CENTER' | 'OUTSIDE';
  strokeCap?: 'NONE' | 'ROUND' | 'SQUARE';
  strokeJoin?: 'MITER' | 'BEVEL' | 'ROUND';
  dashPattern?: number[];
  effects?: SeedEffect[];
  cornerRadius?: number | [number, number, number, number];
}

export interface SeedLayout {
  autoLayout?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  padding?: { top: number; right: number; bottom: number; left: number };
  gap?: number;
  alignItems?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
  justifyContent?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
}

export interface SeedConstraints {
  horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
}

export interface SeedPathCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface SeedVectorPath {
  windingRule: 'NONZERO' | 'EVENODD';
  commands: SeedPathCommand[];
}

export interface SeedTextStyle {
  start: number;
  end: number;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight?: { unit: 'PERCENT' | 'PIXELS' | 'AUTO'; value?: number };
  letterSpacing?: { unit: 'PERCENT' | 'PIXELS'; value: number };
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  fills?: SeedPaint[];
}

export interface SeedOverride {
  path: string[];
  value: unknown;
}

// Base node structure
export interface SeedNodeBase {
  id: string;
  type: string;
  name: string;
  visible?: boolean;
  locked?: boolean;
}

// Frame/Group node
export interface SeedFrameNode extends SeedNodeBase {
  type: 'FRAME' | 'GROUP';
  transform: SeedTransform;
  appearance?: SeedAppearance;
  layout?: SeedLayout;
  constraints?: SeedConstraints;
  clipContent?: boolean;
  children?: SeedNode[];
}

// Vector node
export interface SeedVectorNode extends SeedNodeBase {
  type: 'VECTOR';
  transform: SeedTransform;
  appearance?: SeedAppearance;
  constraints?: SeedConstraints;
  paths: SeedVectorPath[];
}

// Text node
export interface SeedTextNode extends SeedNodeBase {
  type: 'TEXT';
  transform: SeedTransform;
  appearance?: SeedAppearance;
  constraints?: SeedConstraints;
  characters: string;
  styles: SeedTextStyle[];
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  textAutoResize?: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT';
}

// Image node
export interface SeedImageNode extends SeedNodeBase {
  type: 'IMAGE';
  transform: SeedTransform;
  appearance?: SeedAppearance;
  constraints?: SeedConstraints;
  assetRef: string;
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  naturalWidth: number;
  naturalHeight: number;
}

// Component node
export interface SeedComponentNode extends SeedNodeBase {
  type: 'COMPONENT';
  transform: SeedTransform;
  appearance?: SeedAppearance;
  layout?: SeedLayout;
  constraints?: SeedConstraints;
  propertyDefinitions?: Record<string, SeedPropertyDefinition>;
  children?: SeedNode[];
}

// Instance node
export interface SeedInstanceNode extends SeedNodeBase {
  type: 'INSTANCE';
  transform: SeedTransform;
  constraints?: SeedConstraints;
  componentRef: string;
  overrides?: SeedOverride[];
}

// Boolean operation node
export interface SeedBooleanNode extends SeedNodeBase {
  type: 'BOOLEAN_OPERATION';
  transform: SeedTransform;
  appearance?: SeedAppearance;
  constraints?: SeedConstraints;
  booleanOperation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';
  children?: SeedNode[];
}

// Slice node
export interface SeedSliceNode extends SeedNodeBase {
  type: 'SLICE';
  transform: SeedTransform;
  exportSettings?: SeedExportSetting[];
}

export interface SeedExportSetting {
  format: 'PNG' | 'JPG' | 'SVG' | 'PDF';
  suffix?: string;
  scale?: number;
}

export type SeedNode =
  | SeedFrameNode
  | SeedVectorNode
  | SeedTextNode
  | SeedImageNode
  | SeedComponentNode
  | SeedInstanceNode
  | SeedBooleanNode
  | SeedSliceNode;

// =============================================================================
// Page Types
// =============================================================================

export interface SeedPage {
  $schema?: string;
  id: string;
  name: string;
  backgroundColor?: RGBA;
  nodes: SeedNode[];
}

// =============================================================================
// Component Types
// =============================================================================

export interface SeedPropertyDefinition {
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
  defaultValue: unknown;
  preferredValues?: unknown[];
}

export interface SeedComponentEntry {
  id: string;
  name: string;
  path: string;
  description?: string;
  created: string;
  modified: string;
}

export interface SeedComponentSet {
  id: string;
  name: string;
  components: string[];
  variantProperties: string[];
}

export interface SeedComponentRegistry {
  $schema?: string;
  components: SeedComponentEntry[];
  componentSets: SeedComponentSet[];
}

export interface SeedComponent {
  $schema?: string;
  id: string;
  name: string;
  description?: string;
  propertyDefinitions?: Record<string, SeedPropertyDefinition>;
  nodes: SeedNode[];
}

// =============================================================================
// Token Types
// =============================================================================

export interface SeedColorToken {
  id: string;
  name: string;
  type: 'COLOR';
  value: RGBA;
  variants?: Record<string, RGBA>;
  description?: string;
}

export interface SeedTypographyValue {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight?: { unit: 'PERCENT' | 'PIXELS' | 'AUTO'; value?: number };
  letterSpacing?: { unit: 'PERCENT' | 'PIXELS'; value: number };
}

export interface SeedTypographyToken {
  id: string;
  name: string;
  type: 'TYPOGRAPHY';
  value: SeedTypographyValue;
  description?: string;
}

export interface SeedSpacingToken {
  id: string;
  name: string;
  type: 'SPACING';
  value: number;
  description?: string;
}

export interface SeedShadowValue {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  color: RGBA;
  offset: { x: number; y: number };
  blur: number;
  spread: number;
}

export interface SeedShadowToken {
  id: string;
  name: string;
  type: 'SHADOW';
  value: SeedShadowValue;
  description?: string;
}

export interface SeedRadiusToken {
  id: string;
  name: string;
  type: 'RADIUS';
  value: number | [number, number, number, number];
  description?: string;
}

export type SeedToken =
  | SeedColorToken
  | SeedTypographyToken
  | SeedSpacingToken
  | SeedShadowToken
  | SeedRadiusToken;

export interface SeedTokenGroup {
  name: string;
  tokens: SeedToken[];
}

export interface SeedTokens {
  $schema?: string;
  version: string;
  groups: SeedTokenGroup[];
}

// =============================================================================
// Prototype Types
// =============================================================================

export interface SeedFlow {
  id: string;
  name: string;
  startingPoint: string;
  description?: string;
}

export interface SeedTrigger {
  type: 'ON_CLICK' | 'ON_HOVER' | 'ON_PRESS' | 'ON_DRAG' | 'AFTER_TIMEOUT' | 'MOUSE_ENTER' | 'MOUSE_LEAVE';
  delay?: number;
}

export interface SeedTransition {
  type: 'INSTANT' | 'DISSOLVE' | 'SMART_ANIMATE' | 'MOVE_IN' | 'MOVE_OUT' | 'PUSH' | 'SLIDE_IN' | 'SLIDE_OUT';
  duration?: number;
  easing?: 'LINEAR' | 'EASE_IN' | 'EASE_OUT' | 'EASE_IN_OUT' | 'SPRING';
  direction?: 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM';
}

export interface SeedNavigateAction {
  type: 'NAVIGATE';
  destinationPageId: string;
  transition?: SeedTransition;
}

export interface SeedOverlayAction {
  type: 'OPEN_OVERLAY' | 'CLOSE_OVERLAY';
  overlayNodeId?: string;
  position?: 'CENTER' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'MANUAL';
  offset?: { x: number; y: number };
}

export interface SeedUrlAction {
  type: 'OPEN_URL';
  url: string;
  openInNewTab?: boolean;
}

export type SeedAction = SeedNavigateAction | SeedOverlayAction | SeedUrlAction;

export interface SeedInteraction {
  id: string;
  sourceNodeId: string;
  trigger: SeedTrigger;
  actions: SeedAction[];
}

export interface SeedPrototypes {
  $schema?: string;
  flows: SeedFlow[];
  interactions: SeedInteraction[];
}

// =============================================================================
// Asset Types
// =============================================================================

export interface SeedAsset {
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

export interface SeedExternalRef {
  id: string;
  name: string;
  type: 'image' | 'font' | 'video' | 'other';
  url: string;
  mediaType: string;
  size?: number;
}

export interface SeedAssetManifest {
  $schema?: string;
  assets: SeedAsset[];
  externalRefs?: SeedExternalRef[];
}

// =============================================================================
// History Types
// =============================================================================

export interface SeedChangelogEntry {
  version: string;
  date: string;
  author?: string;
  message: string;
}

export interface SeedCommentMessage {
  author: string;
  text: string;
  timestamp: string;
}

export interface SeedComment {
  id: string;
  nodeId: string;
  author: string;
  created: string;
  resolved: boolean;
  thread: SeedCommentMessage[];
}

export interface SeedHistory {
  $schema?: string;
  currentVersion: string;
  changelog: SeedChangelogEntry[];
  comments: SeedComment[];
}

// =============================================================================
// Writer/Reader Options
// =============================================================================

export interface SeedWriteOptions {
  includeThumbnail?: boolean;
  thumbnailSize?: number;
  includeHistory?: boolean;
  compression?: 'STORE' | 'DEFLATE';
}

export interface SeedReadOptions {
  validateSchema?: boolean;
  loadAssets?: boolean;
}

// =============================================================================
// Full Archive Structure
// =============================================================================

export interface SeedArchive {
  manifest: SeedManifest;
  document: SeedDocument;
  pages: Map<string, SeedPage>;
  components?: SeedComponentRegistry;
  componentData?: Map<string, SeedComponent>;
  tokens?: SeedTokens;
  prototypes?: SeedPrototypes;
  assets?: SeedAssetManifest;
  assetData?: Map<string, Blob>;
  history?: SeedHistory;
  thumbnail?: Blob;
}
