/**
 * DesignLibre Plugin API Type Definitions
 *
 * This file provides TypeScript types for the DesignLibre plugin API.
 * The `designtool` global is injected by the plugin sandbox runtime.
 */

declare global {
  /**
   * The main DesignLibre plugin API object
   */
  const designtool: DesignToolAPI;
}

/**
 * Complete DesignLibre Plugin API
 */
export interface DesignToolAPI {
  /** Design manipulation API */
  readonly design: DesignAPI;
  /** Selection management API */
  readonly selection: SelectionAPI;
  /** Viewport control API */
  readonly viewport: ViewportAPI;
  /** History (undo/redo) API */
  readonly history: HistoryAPI;
  /** Event subscription API */
  readonly events: EventsAPI;
  /** Data storage and clipboard API */
  readonly data: DataAPI;
  /** UI display API */
  readonly ui: UIAPI;
  /** Console logging API */
  readonly console: ConsoleAPI;
  /** Utility functions */
  readonly utils: UtilsAPI;
}

// ============================================================================
// Design API
// ============================================================================

export interface DesignAPI {
  /** Get currently selected nodes */
  getSelection(): Promise<SerializedNode[]>;
  /** Get a node by ID */
  getNode(id: string): Promise<SerializedNode | null>;
  /** Get children of a node */
  getChildren(id: string): Promise<SerializedNode[]>;
  /** Get parent of a node */
  getParent(id: string): Promise<SerializedNode | null>;
  /** Find nodes matching a query */
  findNodes(query: NodeQuery): Promise<SerializedNode[]>;
  /** Create a new node */
  createNode(type: NodeType, properties?: Partial<NodeProperties>): Promise<string>;
  /** Update a node's properties */
  updateNode(id: string, changes: Partial<NodeProperties>): Promise<void>;
  /** Delete a node */
  deleteNode(id: string): Promise<void>;
  /** Duplicate a node */
  duplicateNode(id: string): Promise<string>;
  /** Group nodes together */
  groupNodes(ids: string[]): Promise<string>;
  /** Ungroup a group node */
  ungroupNode(id: string): Promise<string[]>;
}

export interface SerializedNode {
  readonly id: string;
  readonly type: NodeType;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly opacity: number;
  readonly rotation: number;
  readonly fills?: readonly Fill[];
  readonly strokes?: readonly Stroke[];
  readonly effects?: readonly Effect[];
  readonly cornerRadius?: number;
  readonly children?: readonly string[];
  readonly parent?: string;
  readonly [key: string]: unknown;
}

export type NodeType =
  | 'FRAME'
  | 'GROUP'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'POLYGON'
  | 'STAR'
  | 'VECTOR'
  | 'TEXT'
  | 'IMAGE'
  | 'COMPONENT'
  | 'INSTANCE'
  | 'LINE';

export interface NodeProperties {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  rotation: number;
  fills: Fill[];
  strokes: Stroke[];
  effects: Effect[];
  cornerRadius: number;
  [key: string]: unknown;
}

export interface NodeQuery {
  type?: NodeType | NodeType[];
  name?: string | RegExp;
  visible?: boolean;
  locked?: boolean;
}

export interface Fill {
  readonly type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  readonly visible: boolean;
  readonly opacity: number;
  readonly color?: RGBA;
  readonly gradientStops?: readonly GradientStop[];
}

export interface Stroke {
  readonly type: 'SOLID' | 'GRADIENT_LINEAR';
  readonly visible: boolean;
  readonly opacity: number;
  readonly color?: RGBA;
  readonly weight: number;
}

export interface Effect {
  readonly type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'BLUR';
  readonly visible: boolean;
  readonly radius: number;
  readonly color?: RGBA;
  readonly offset?: Point;
}

export interface RGBA {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface GradientStop {
  readonly position: number;
  readonly color: RGBA;
}

// ============================================================================
// Selection API
// ============================================================================

export interface SelectionAPI {
  /** Get selected node IDs */
  get(): Promise<string[]>;
  /** Set selection to specific nodes */
  set(ids: string[]): Promise<void>;
  /** Add nodes to selection */
  add(ids: string[]): Promise<void>;
  /** Remove nodes from selection */
  remove(ids: string[]): Promise<void>;
  /** Clear selection */
  clear(): Promise<void>;
}

// ============================================================================
// Viewport API
// ============================================================================

export interface ViewportAPI {
  /** Get current zoom level */
  getZoom(): Promise<number>;
  /** Set zoom level */
  setZoom(zoom: number): Promise<void>;
  /** Get viewport center */
  getCenter(): Promise<Point>;
  /** Set viewport center */
  setCenter(point: Point): Promise<void>;
  /** Zoom to fit specific nodes (or all if no IDs provided) */
  zoomToFit(ids?: string[]): Promise<void>;
}

// ============================================================================
// History API
// ============================================================================

export interface HistoryAPI {
  /** Undo last action */
  undo(): Promise<void>;
  /** Redo last undone action */
  redo(): Promise<void>;
  /** Check if undo is available */
  canUndo(): Promise<boolean>;
  /** Check if redo is available */
  canRedo(): Promise<boolean>;
  /** Start a batch operation (groups multiple changes into one undo step) */
  startBatch(name: string): Promise<void>;
  /** End a batch operation */
  endBatch(): Promise<void>;
}

// ============================================================================
// Events API
// ============================================================================

export interface EventsAPI {
  /** Subscribe to an event */
  on(event: PluginEvent, callback: EventCallback): Promise<string>;
  /** Unsubscribe from an event */
  off(listenerId: string): Promise<void>;
}

export type PluginEvent =
  | 'selection:changed'
  | 'document:changed'
  | 'viewport:changed'
  | 'node:created'
  | 'node:updated'
  | 'node:deleted';

export type EventCallback = (data: unknown) => void | Promise<void>;

// ============================================================================
// Data API
// ============================================================================

export interface DataAPI {
  /** Persistent storage */
  readonly storage: StorageAPI;
  /** Clipboard access */
  readonly clipboard: ClipboardAPI;
}

export interface StorageAPI {
  /** Get a value by key */
  get(key: string): Promise<unknown>;
  /** Set a value */
  set(key: string, value: unknown): Promise<void>;
  /** Delete a value */
  delete(key: string): Promise<void>;
  /** List all keys */
  list(): Promise<string[]>;
  /** Get storage quota info */
  getQuota(): Promise<{ used: number; total: number }>;
}

export interface ClipboardAPI {
  /** Read text from clipboard */
  readText(): Promise<string>;
  /** Write text to clipboard */
  writeText(text: string): Promise<void>;
}

// ============================================================================
// UI API
// ============================================================================

export interface UIAPI {
  /** Show a toast notification */
  showToast(message: string, type?: ToastType): Promise<void>;
  /** Show a panel */
  showPanel(options: PanelOptions): Promise<PanelHandle>;
  /** Show a modal dialog */
  showModal(options: ModalOptions): Promise<ModalResult>;
  /** Close a panel */
  closePanel(handle: PanelHandle): Promise<void>;
}

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface PanelOptions {
  readonly title: string;
  readonly width?: number;
  readonly height?: number;
  readonly position?: 'left' | 'right';
}

export interface PanelHandle {
  readonly id: string;
}

export interface ModalOptions {
  readonly title: string;
  readonly message?: string;
  readonly buttons?: readonly ModalButton[];
  readonly width?: number;
  readonly height?: number;
}

export interface ModalButton {
  readonly label: string;
  readonly value: string;
  readonly primary?: boolean;
}

export interface ModalResult {
  readonly button: string;
  readonly data?: unknown;
}

// ============================================================================
// Console API
// ============================================================================

export interface ConsoleAPI {
  /** Log a message */
  log(...args: unknown[]): void;
  /** Log a debug message */
  debug(...args: unknown[]): void;
  /** Log an info message */
  info(...args: unknown[]): void;
  /** Log a warning */
  warn(...args: unknown[]): void;
  /** Log an error */
  error(...args: unknown[]): void;
  /** Clear the console */
  clear(): void;
}

// ============================================================================
// Utils API
// ============================================================================

export interface UtilsAPI {
  /** Color utilities */
  readonly color: ColorUtils;
}

export interface ColorUtils {
  /** Parse a color string */
  parse(color: string): Promise<RGBA>;
  /** Convert RGBA to hex string */
  toHex(color: RGBA): Promise<string>;
  /** Convert RGBA to HSL */
  toHSL(color: RGBA): Promise<{ h: number; s: number; l: number; a: number }>;
}

export {};
