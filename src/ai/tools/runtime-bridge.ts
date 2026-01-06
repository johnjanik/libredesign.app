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
