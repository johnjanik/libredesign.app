/**
 * Runtime Bridge
 *
 * Bridge interface between AI tools and DesignLibre runtime.
 * Uses dependency injection pattern with global fallback.
 */

/**
 * Color value specification
 */
export interface ColorValue {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1
}

/**
 * Bounds/Rectangle specification
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Layer summary for state reporting
 */
export interface LayerSummary {
  id: string;
  name: string;
  type: string;
  bounds: Bounds;
  visible: boolean;
  locked: boolean;
  parentId: string | null;
}

/**
 * Viewport state
 */
export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

/**
 * Canvas state summary for LLM context
 */
export interface CanvasState {
  selection: LayerSummary[];
  viewport: ViewportState;
  activePage: string;
  pageCount: number;
  stats: {
    totalLayers: number;
    selectedCount: number;
  };
}

/**
 * Rectangle creation options
 */
export interface RectangleOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth?: number;
  cornerRadius?: number;
  name?: string;
}

/**
 * Ellipse creation options
 */
export interface EllipseOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: ColorValue;
  stroke?: ColorValue;
  strokeWidth?: number;
  name?: string;
}

/**
 * Text creation options
 */
export interface TextOptions {
  x: number;
  y: number;
  content: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: ColorValue;
  name?: string;
}

/**
 * Frame creation options
 */
export interface FrameOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: ColorValue;
  name?: string;
}

/**
 * Line creation options
 */
export interface LineOptions {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  stroke?: ColorValue;
  strokeWidth?: number;
  name?: string;
}

/**
 * Alignment type
 */
export type AlignmentType =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom';

/**
 * Distribution type
 */
export type DistributionType = 'horizontal' | 'vertical';

/**
 * Runtime bridge interface
 * Abstracts the DesignLibre runtime for tool access
 */
export interface RuntimeBridge {
  // =========================================================================
  // Selection Operations
  // =========================================================================

  /** Select all layers on current page */
  selectAll(): Promise<string[]>;

  /** Select layers by IDs */
  selectByIds(ids: string[]): Promise<void>;

  /** Select layers by name (supports wildcards) */
  selectByName(pattern: string): Promise<string[]>;

  /** Select layers by type */
  selectByType(type: string): Promise<string[]>;

  /** Get current selection */
  getSelection(): Promise<string[]>;

  /** Clear selection */
  clearSelection(): Promise<void>;

  // =========================================================================
  // Layer Operations
  // =========================================================================

  /** Group selected layers */
  groupLayers(layerIds: string[]): Promise<string>;

  /** Ungroup a group */
  ungroupLayers(groupId: string): Promise<string[]>;

  /** Lock a layer */
  lockLayer(layerId: string): Promise<void>;

  /** Unlock a layer */
  unlockLayer(layerId: string): Promise<void>;

  /** Hide a layer */
  hideLayer(layerId: string): Promise<void>;

  /** Show a layer */
  showLayer(layerId: string): Promise<void>;

  /** Delete layers */
  deleteLayers(layerIds: string[]): Promise<void>;

  /** Rename a layer */
  renameLayer(layerId: string, name: string): Promise<void>;

  /** Duplicate a layer */
  duplicateLayer(layerId: string): Promise<string>;

  // =========================================================================
  // Creation Operations
  // =========================================================================

  /** Create a rectangle */
  createRectangle(options: RectangleOptions): Promise<string>;

  /** Create an ellipse */
  createEllipse(options: EllipseOptions): Promise<string>;

  /** Create text */
  createText(options: TextOptions): Promise<string>;

  /** Create a frame */
  createFrame(options: FrameOptions): Promise<string>;

  /** Create a line */
  createLine(options: LineOptions): Promise<string>;

  // =========================================================================
  // Styling Operations
  // =========================================================================

  /** Set fill color */
  setFillColor(layerId: string, color: ColorValue): Promise<void>;

  /** Set stroke color */
  setStrokeColor(layerId: string, color: ColorValue): Promise<void>;

  /** Set stroke width */
  setStrokeWidth(layerId: string, width: number): Promise<void>;

  /** Set opacity */
  setOpacity(layerId: string, opacity: number): Promise<void>;

  /** Set corner radius */
  setCornerRadius(layerId: string, radius: number): Promise<void>;

  /** Set blend mode */
  setBlendMode(layerId: string, blendMode: string): Promise<void>;

  /** Add drop shadow effect */
  addDropShadow(
    layerId: string,
    options: {
      color?: ColorValue;
      offsetX?: number;
      offsetY?: number;
      radius?: number;
      spread?: number;
    }
  ): Promise<void>;

  /** Add blur effect */
  addBlur(layerId: string, radius: number): Promise<void>;

  /** Remove all effects from a layer */
  removeEffects(layerId: string): Promise<void>;

  // =========================================================================
  // Typography Operations
  // =========================================================================

  /** Set font family for text node */
  setFontFamily(layerId: string, fontFamily: string): Promise<void>;

  /** Set font size for text node */
  setFontSize(layerId: string, fontSize: number): Promise<void>;

  /** Set font weight for text node (100-900) */
  setFontWeight(layerId: string, fontWeight: number): Promise<void>;

  /** Set text alignment */
  setTextAlignment(layerId: string, alignment: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'): Promise<void>;

  /** Set line height for text node */
  setLineHeight(layerId: string, lineHeight: number | 'AUTO'): Promise<void>;

  /** Set letter spacing for text node */
  setLetterSpacing(layerId: string, letterSpacing: number): Promise<void>;

  /** Set text content (replace text) */
  setTextContent(layerId: string, content: string): Promise<void>;

  // =========================================================================
  // Layout Operations
  // =========================================================================

  /** Align layers */
  alignLayers(layerIds: string[], alignment: AlignmentType): Promise<void>;

  /** Distribute layers */
  distributeLayers(layerIds: string[], distribution: DistributionType): Promise<void>;

  /** Set position */
  setPosition(layerId: string, x: number, y: number): Promise<void>;

  /** Set size */
  setSize(layerId: string, width: number, height: number): Promise<void>;

  /** Set rotation */
  setRotation(layerId: string, degrees: number): Promise<void>;

  // =========================================================================
  // Transform Operations
  // =========================================================================

  /** Scale layer by factor */
  scaleLayers(layerIds: string[], factor: number, origin?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'): Promise<void>;

  /** Move layer by relative offset */
  moveBy(layerId: string, dx: number, dy: number): Promise<void>;

  /** Flip layer horizontally */
  flipHorizontal(layerId: string): Promise<void>;

  /** Flip layer vertically */
  flipVertical(layerId: string): Promise<void>;

  /** Distribute layers horizontally */
  distributeHorizontal(layerIds: string[], spacing?: number): Promise<void>;

  /** Distribute layers vertically */
  distributeVertical(layerIds: string[], spacing?: number): Promise<void>;

  /** Tidy up layers in a grid */
  tidyUp(layerIds: string[], columns?: number, spacing?: number): Promise<void>;

  // =========================================================================
  // Query Operations
  // =========================================================================

  /** Get layer properties */
  getLayerProperties(layerId: string): Promise<LayerSummary | null>;

  /** Get canvas state summary */
  getCanvasState(): Promise<CanvasState>;

  /** Get all layers on current page */
  getAllLayers(): Promise<LayerSummary[]>;

  // =========================================================================
  // Viewport Operations
  // =========================================================================

  /** Zoom to selection */
  zoomToSelection(): Promise<void>;

  /** Zoom to fit all content */
  zoomToFit(): Promise<void>;

  /** Set zoom level */
  setZoom(level: number): Promise<void>;

  /** Get current zoom */
  getZoom(): Promise<number>;

  // =========================================================================
  // Export Operations
  // =========================================================================

  /** Export to PNG */
  exportPNG(layerId: string, scale?: number): Promise<Blob>;

  /** Export to SVG */
  exportSVG(layerId: string): Promise<string>;

  /** Export layer data to JSON */
  exportToJSON(layerId: string, includeChildren?: boolean): Promise<string>;

  /** Batch export multiple layers */
  batchExport(layerIds: string[], format: 'png' | 'jpg' | 'svg' | 'pdf', scale?: number): Promise<{ exportedCount: number; files: string[] }>;

  // =========================================================================
  // Editing Operations
  // =========================================================================

  /** Undo the last action */
  undo(): Promise<void>;

  /** Redo the last undone action */
  redo(): Promise<void>;

  /** Copy selected layers to clipboard */
  copyLayers(layerIds: string[]): Promise<void>;

  /** Paste from clipboard */
  paste(): Promise<string[]>;

  /** Paste at a specific position */
  pasteHere(x: number, y: number): Promise<string[]>;

  // =========================================================================
  // Code Generation Operations
  // =========================================================================

  /** Generate CSS for a layer */
  generateCSS(layerId: string, options?: { includeLayout?: boolean; useVariables?: boolean }): Promise<string>;

  /** Generate Tailwind classes for a layer */
  generateTailwind(layerId: string): Promise<{ classes: string; html: string }>;

  /** Generate SwiftUI code for a layer */
  generateSwift(layerId: string, componentName?: string): Promise<string>;

  /** Generate Jetpack Compose code for a layer */
  generateAndroid(layerId: string, componentName?: string): Promise<string>;

  /** Generate React component for a layer */
  generateReact(layerId: string, componentName?: string, styleFormat?: 'inline' | 'css' | 'styled-components' | 'tailwind'): Promise<string>;

  /** Generate HTML/CSS for a layer */
  generateHTML(layerId: string, inlineStyles?: boolean): Promise<{ html: string; css: string }>;

  // =========================================================================
  // Component Operations
  // =========================================================================

  /** Create a component from an existing layer */
  createComponent(layerId: string, name?: string, description?: string): Promise<string>;

  /** Create a component set from multiple components */
  createComponentSet(componentIds: string[], name?: string): Promise<string>;

  /** Create an instance of a component */
  createInstance(componentId: string, x?: number, y?: number): Promise<string>;

  /** Detach an instance from its component */
  detachInstance(instanceId: string): Promise<string>;

  /** Reset instance overrides */
  resetInstance(instanceId: string): Promise<void>;

  /** Push instance overrides to main component */
  pushOverridesToMain(instanceId: string): Promise<void>;

  /** Swap instance to use a different component */
  swapComponent(instanceId: string, newComponentId: string): Promise<void>;

  /** Navigate to main component of an instance */
  goToMainComponent(instanceId: string): Promise<string>;

  /** List all instances of a component */
  listComponentInstances(componentId: string): Promise<{ id: string; name: string }[]>;

  /** Add a property to a component */
  addComponentProperty(componentId: string, propertyName: string, propertyType: string, defaultValue?: string): Promise<void>;

  /** Set component description */
  setComponentDescription(componentId: string, description: string): Promise<void>;

  // =========================================================================
  // Style Operations
  // =========================================================================

  /** Create a color style */
  createColorStyle(name: string, color: ColorValue, description?: string): Promise<string>;

  /** Create a text style */
  createTextStyle(name: string, fontFamily: string, fontSize: number, fontWeight?: string, lineHeight?: number, letterSpacing?: number): Promise<string>;

  /** Create an effect style */
  createEffectStyle(name: string, effects: unknown[]): Promise<string>;

  /** Apply a style to layers */
  applyStyle(styleId: string, layerIds: string[]): Promise<void>;

  /** Detach styles from layers */
  detachStyle(layerIds: string[], styleType?: 'fill' | 'stroke' | 'text' | 'effect' | 'all'): Promise<void>;

  /** List all local styles */
  listLocalStyles(styleType?: 'color' | 'text' | 'effect' | 'all'): Promise<{ id: string; name: string; type: string }[]>;

  /** Find unused styles */
  findUnusedStyles(): Promise<{ id: string; name: string; type: string }[]>;

  // =========================================================================
  // Fill & Stroke Operations
  // =========================================================================

  /** Set a gradient fill on a layer */
  setFillGradient(
    layerId: string,
    type: 'linear' | 'radial' | 'angular' | 'diamond',
    stops: Array<{ position: number; color: ColorValue }>,
    angle?: number
  ): Promise<void>;

  /** Remove fill from a layer */
  removeFill(layerId: string): Promise<void>;

  /** Remove stroke from a layer */
  removeStroke(layerId: string): Promise<void>;

  /** Swap fill and stroke colors */
  swapFillStroke(layerId: string): Promise<void>;

  /** Copy style from a layer (stores in internal clipboard) */
  copyStyle(layerId: string): Promise<void>;

  /** Paste style to layers */
  pasteStyle(layerIds: string[]): Promise<void>;

  // =========================================================================
  // Prototyping Operations
  // =========================================================================

  /** Add a prototype interaction to a layer */
  addInteraction(
    layerId: string,
    trigger: 'on_click' | 'on_hover' | 'on_press' | 'on_drag' | 'after_delay' | 'mouse_enter' | 'mouse_leave',
    action: 'navigate' | 'open_overlay' | 'close_overlay' | 'back' | 'scroll_to' | 'open_url',
    destinationId?: string
  ): Promise<string>;

  /** Remove all prototype interactions from a layer */
  removeInteractions(layerId: string): Promise<void>;

  /** Set the transition animation for an interaction */
  setTransition(
    layerId: string,
    transitionType: 'instant' | 'dissolve' | 'smart_animate' | 'move_in' | 'move_out' | 'push' | 'slide_in' | 'slide_out',
    duration?: number,
    easing?: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'ease_in_back' | 'ease_out_back' | 'spring'
  ): Promise<void>;

  /** List all prototype interactions in the file */
  listAllInteractions(pageId?: string): Promise<{ interactions: unknown[]; count: number }>;

  /** Set the starting frame for a prototype flow */
  setStartingFrame(frameId: string): Promise<void>;

  /** Set the device frame for prototyping */
  setDeviceFrame(device: 'iphone_14' | 'iphone_14_pro' | 'iphone_se' | 'android_small' | 'android_large' | 'ipad' | 'desktop' | 'none'): Promise<void>;

  /** Start prototype preview mode */
  previewPrototype(frameId?: string): Promise<void>;

  // =========================================================================
  // Auto-Layout Operations
  // =========================================================================

  /** Add auto layout to a frame */
  addAutoLayout(
    layerId: string,
    direction?: 'horizontal' | 'vertical',
    gap?: number,
    padding?: number
  ): Promise<void>;

  /** Remove auto layout from a frame */
  removeAutoLayout(layerId: string): Promise<void>;

  /** Set the direction of an auto layout frame */
  setLayoutDirection(layerId: string, direction: 'horizontal' | 'vertical'): Promise<void>;

  /** Set the gap between items in an auto layout frame */
  setLayoutGap(layerId: string, gap: number): Promise<void>;

  /** Set the padding of an auto layout frame */
  setLayoutPadding(
    layerId: string,
    padding: { top?: number; right?: number; bottom?: number; left?: number; all?: number }
  ): Promise<void>;

  // =========================================================================
  // Variable Operations
  // =========================================================================

  /** Create a design variable */
  createVariable(
    name: string,
    type: 'boolean' | 'number' | 'string' | 'color',
    defaultValue: boolean | number | string,
    options?: { group?: string; description?: string; scope?: 'document' | 'page' | 'component' }
  ): Promise<string>;

  /** Set the value of a variable */
  setVariableValue(variableId: string, value: boolean | number | string): Promise<void>;

  /** Bind a layer property to a variable */
  bindToVariable(
    layerId: string,
    propertyName: string,
    variableId: string
  ): Promise<void>;

  /** List all variables in the document */
  listVariables(options?: {
    type?: 'boolean' | 'number' | 'string' | 'color' | 'all';
    group?: string;
  }): Promise<Array<{
    id: string;
    name: string;
    type: string;
    value: boolean | number | string;
    defaultValue: boolean | number | string;
    group?: string;
  }>>;

  /** Switch variable mode (for variables with multiple modes like light/dark) */
  switchVariableMode(modeId: string): Promise<void>;

  // =========================================================================
  // AI-Powered Operations
  // =========================================================================

  /** Generate an image using AI */
  generateImage(
    prompt: string,
    options?: {
      width?: number;
      height?: number;
      style?: 'realistic' | 'artistic' | 'illustration' | 'icon';
    }
  ): Promise<{ imageId: string; url?: string }>;

  /** Remove background from an image layer */
  removeBackground(layerId: string): Promise<void>;

  /** Generate marketing/UI copy using AI */
  generateCopy(
    context: string,
    options?: {
      type?: 'headline' | 'body' | 'cta' | 'tagline';
      tone?: 'professional' | 'casual' | 'playful' | 'urgent';
      maxLength?: number;
    }
  ): Promise<{ copy: string; alternatives: string[] }>;

  /** Rewrite text to change tone or style */
  rewriteText(
    layerId: string,
    options?: {
      tone?: 'formal' | 'casual' | 'friendly' | 'professional';
      action?: 'shorten' | 'expand' | 'simplify' | 'rephrase';
    }
  ): Promise<{ newText: string }>;

  /** Translate text to another language */
  translateText(
    layerId: string,
    targetLanguage: string
  ): Promise<{ translatedText: string; sourceLanguage: string }>;

  /** Get AI suggestions for layout improvements */
  suggestLayout(
    layerIds: string[]
  ): Promise<{ suggestions: Array<{ description: string; changes: unknown[] }> }>;

  /** Automatically rename layers based on their content */
  autoRenameLayers(layerIds: string[]): Promise<{ renamedCount: number; changes: Array<{ id: string; oldName: string; newName: string }> }>;

  // =========================================================================
  // Selection Navigation Operations
  // =========================================================================

  /** Select all children of a layer */
  selectChildren(layerId: string): Promise<string[]>;

  /** Select the parent of a layer */
  selectParent(layerId: string): Promise<string | null>;

  /** Select all siblings of a layer */
  selectSiblings(layerId: string): Promise<string[]>;

  /** Select layers similar to the current selection (by type, size, color, etc.) */
  selectSimilar(
    layerId: string,
    matchProperties?: ('type' | 'fill' | 'stroke' | 'font' | 'size')[]
  ): Promise<string[]>;

  /** Invert the current selection (select all unselected, deselect selected) */
  invertSelection(): Promise<string[]>;

  // =========================================================================
  // Layer Management Operations
  // =========================================================================

  /** Bulk rename layers with pattern */
  renameLayersBulk(layerIds: string[], pattern: string): Promise<Array<{ id: string; oldName: string; newName: string }>>;

  /** Flatten multiple layers into a single rasterized layer */
  flattenLayers(layerIds: string[]): Promise<string>;

  /** Reorder layers within their parent */
  reorderLayers(layerIds: string[], direction: 'up' | 'down' | 'top' | 'bottom'): Promise<void>;

  // =========================================================================
  // Shape Creation Operations
  // =========================================================================

  /** Create a polygon */
  createPolygon(x: number, y: number, radius: number, sides: number, options?: { fill?: ColorValue; stroke?: ColorValue; name?: string }): Promise<string>;

  /** Create a star shape */
  createStar(x: number, y: number, outerRadius: number, innerRadius: number, points: number, options?: { fill?: ColorValue; stroke?: ColorValue; name?: string }): Promise<string>;

  /** Create an arrow */
  createArrow(startX: number, startY: number, endX: number, endY: number, options?: { stroke?: ColorValue; strokeWidth?: number; headSize?: number; name?: string }): Promise<string>;

  // =========================================================================
  // Appearance Operations
  // =========================================================================

  /** Set individual corner radii */
  setIndividualCorners(layerId: string, corners: { topLeft?: number; topRight?: number; bottomRight?: number; bottomLeft?: number }): Promise<void>;

  /** Get all colors used in selection */
  getSelectionColors(layerIds: string[]): Promise<Array<{ color: ColorValue; count: number; type: 'fill' | 'stroke' }>>;

  /** Replace a color throughout the document or selection */
  replaceColor(oldColor: ColorValue, newColor: ColorValue, options?: { scope?: 'selection' | 'page' | 'document' }): Promise<number>;

  // =========================================================================
  // Viewport Operations (Additional)
  // =========================================================================

  /** Zoom to 100% */
  zoomTo100(): Promise<void>;

  /** Zoom in by a step */
  zoomIn(): Promise<void>;

  /** Zoom out by a step */
  zoomOut(): Promise<void>;

  // =========================================================================
  // Query Operations (Additional)
  // =========================================================================

  /** Get detailed properties of a layer including computed values */
  inspectProperties(layerId: string): Promise<Record<string, unknown>>;

  // =========================================================================
  // Page Management Operations
  // =========================================================================

  /** Create a new page */
  createPage(name?: string): Promise<string>;

  /** Rename a page */
  renamePage(pageId: string, name: string): Promise<void>;

  /** Delete a page */
  deletePage(pageId: string): Promise<void>;

  /** Duplicate a page */
  duplicatePage(pageId: string, name?: string): Promise<string>;

  /** Navigate to a page */
  goToPage(pageId: string): Promise<void>;

  /** List all pages */
  listPages(): Promise<Array<{ id: string; name: string }>>;

  /** Set page background color */
  setPageBackground(pageId: string, color: ColorValue): Promise<void>;

  // =========================================================================
  // File Operations
  // =========================================================================

  /** Get file information */
  getFileInfo(): Promise<{ name: string; lastModified: Date; size?: number; path?: string }>;

  /** Get version history */
  getVersionHistory(): Promise<Array<{ id: string; timestamp: Date; description: string; author?: string }>>;

  /** Save a named version */
  saveVersion(description: string): Promise<string>;

  /** Get file statistics */
  getFileStats(): Promise<{ layerCount: number; pageCount: number; componentCount: number; styleCount: number }>;

  // =========================================================================
  // Collaboration Operations
  // =========================================================================

  /** Add a comment to a layer */
  addComment(layerId: string, text: string, x?: number, y?: number): Promise<string>;

  /** Reply to an existing comment */
  replyToComment(commentId: string, text: string): Promise<string>;

  /** Resolve a comment */
  resolveComment(commentId: string): Promise<void>;

  /** List all comments */
  listComments(options?: { resolved?: boolean; layerId?: string }): Promise<Array<{ id: string; text: string; author?: string; timestamp: Date; resolved: boolean; layerId?: string; replies: Array<{ id: string; text: string; author?: string; timestamp: Date }> }>>;

  // =========================================================================
  // Analysis Operations
  // =========================================================================

  /** Run accessibility audit */
  accessibilityAudit(layerIds?: string[]): Promise<Array<{ layerId: string; issue: string; severity: 'error' | 'warning' | 'info'; suggestion: string }>>;

  /** Check contrast ratios */
  contrastCheck(layerIds?: string[]): Promise<Array<{ layerId: string; foreground: ColorValue; background: ColorValue; ratio: number; passes: { aa: boolean; aaa: boolean } }>>;

  /** Run consistency audit */
  consistencyAudit(): Promise<Array<{ type: 'spacing' | 'color' | 'font' | 'size'; issue: string; affectedLayers: string[] }>>;

  /** Find all fonts used in the document */
  listFontsUsed(): Promise<Array<{ fontFamily: string; fontWeight: number; count: number }>>;

  /** Find missing fonts */
  findMissingFonts(): Promise<Array<{ fontFamily: string; fontWeight: number; layerIds: string[] }>>;

  /** Replace a font throughout the document */
  replaceFont(oldFont: string, newFont: string): Promise<number>;

  // =========================================================================
  // UI Toggle Operations
  // =========================================================================

  /** Toggle rulers visibility */
  toggleRulers(): Promise<boolean>;

  /** Toggle grid visibility */
  toggleGrid(): Promise<boolean>;

  /** Toggle guides visibility */
  toggleGuides(): Promise<boolean>;

  /** Toggle outline mode */
  toggleOutlines(): Promise<boolean>;

  /** Collapse all layers in the tree */
  collapseAllLayers(): Promise<void>;

  /** Expand all layers in the tree */
  expandAllLayers(): Promise<void>;

  // =========================================================================
  // Events
  // =========================================================================

  /** Subscribe to runtime events */
  on(event: string, callback: (data: unknown) => void): void;

  /** Unsubscribe from runtime events */
  off(event: string, callback: (data: unknown) => void): void;
}

/**
 * Global bridge singleton
 */
let globalBridge: RuntimeBridge | null = null;

/**
 * Set the global runtime bridge
 */
export function setGlobalBridge(bridge: RuntimeBridge): void {
  globalBridge = bridge;
}

/**
 * Get the global runtime bridge
 * @throws Error if bridge not initialized
 */
export function getGlobalBridge(): RuntimeBridge {
  if (!globalBridge) {
    throw new Error('Runtime bridge not initialized. Call setGlobalBridge() first.');
  }
  return globalBridge;
}

/**
 * Check if bridge is initialized
 */
export function isBridgeInitialized(): boolean {
  return globalBridge !== null;
}

/**
 * Parse hex color to ColorValue
 */
export function parseHexColor(hex: string): ColorValue {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle shorthand (e.g., #fff)
  if (hex.length === 3) {
    hex = hex[0]! + hex[0] + hex[1]! + hex[1] + hex[2]! + hex[2];
  }

  // Handle 8-digit hex (with alpha)
  if (hex.length === 8) {
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255,
      a: parseInt(hex.slice(6, 8), 16) / 255,
    };
  }

  // Handle 6-digit hex
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
    a: 1,
  };
}

/**
 * Convert ColorValue to hex string
 */
export function colorToHex(color: ColorValue): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}
