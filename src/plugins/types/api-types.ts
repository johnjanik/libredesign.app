/**
 * Plugin API Types
 *
 * Type definitions for the DesignToolAPI exposed to plugins.
 */

import type { SerializableValue } from './serialization';

/**
 * RGBA color structure
 */
export interface RGBA {
  readonly r: number; // 0-1
  readonly g: number; // 0-1
  readonly b: number; // 0-1
  readonly a: number; // 0-1
}

/**
 * Point in 2D space
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Rectangle bounds
 */
export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Transform matrix (2D affine)
 */
export interface Transform {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly tx: number;
  readonly ty: number;
}

/**
 * Serialized node for plugin consumption
 * Contains only serializable data, no methods
 */
export interface SerializedNode {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly opacity: number;
  readonly bounds: Bounds;
  readonly transform: Transform;
  readonly parentId: string | null;
  readonly childIds: readonly string[];
  readonly properties: Record<string, SerializableValue>;
}

/**
 * Query for finding nodes
 */
export interface NodeQuery {
  /** Filter by node type */
  readonly type?: string | readonly string[];
  /** Filter by name (supports wildcards) */
  readonly name?: string;
  /** Filter by visibility */
  readonly visible?: boolean;
  /** Filter by locked state */
  readonly locked?: boolean;
  /** Filter by parent ID */
  readonly parentId?: string;
  /** Maximum results */
  readonly limit?: number;
}

/**
 * Node creation options
 */
export interface CreateNodeOptions {
  readonly type: string;
  readonly name?: string;
  readonly bounds?: Partial<Bounds>;
  readonly properties?: Record<string, SerializableValue>;
}

/**
 * Node update changes
 */
export interface NodeChanges {
  readonly name?: string;
  readonly visible?: boolean;
  readonly locked?: boolean;
  readonly opacity?: number;
  readonly bounds?: Partial<Bounds>;
  readonly properties?: Record<string, SerializableValue>;
}

/**
 * Toast notification types
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * Panel position options
 */
export type PanelPosition = 'left' | 'right' | 'bottom';

/**
 * Panel options for showing a panel
 */
export interface PanelOptions {
  /** Panel title */
  readonly title: string;
  /** Panel width (or height for bottom) */
  readonly size?: number;
  /** Panel position */
  readonly position?: PanelPosition;
  /** Allow resize */
  readonly resizable?: boolean;
}

/**
 * Panel handle returned when showing a panel
 */
export interface PanelHandle {
  readonly panelId: string;
}

/**
 * Modal options
 */
export interface ModalOptions {
  /** Modal title */
  readonly title: string;
  /** Modal width */
  readonly width?: number;
  /** Modal height */
  readonly height?: number;
  /** Show close button */
  readonly closable?: boolean;
}

/**
 * Modal result
 */
export interface ModalResult {
  /** Whether modal was confirmed */
  readonly confirmed: boolean;
  /** Data returned from modal */
  readonly data?: Record<string, SerializableValue>;
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  /** Bytes used */
  readonly used: number;
  /** Total bytes available */
  readonly total: number;
}

/**
 * Design Tool API v1 (Read-only operations)
 */
export interface DesignToolAPI_v1 {
  readonly design: {
    getSelection(): Promise<SerializedNode[]>;
    getNode(id: string): Promise<SerializedNode | null>;
    getChildren(id: string): Promise<SerializedNode[]>;
    getParent(id: string): Promise<SerializedNode | null>;
    findNodes(query: NodeQuery): Promise<SerializedNode[]>;
  };

  readonly utils: {
    readonly color: {
      parse(color: string): Promise<RGBA>;
      toHex(color: RGBA): Promise<string>;
      toRgb(color: RGBA): Promise<string>;
      toHsl(color: RGBA): Promise<{ h: number; s: number; l: number }>;
    };
  };

  readonly console: {
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    info(...args: unknown[]): void;
    debug(...args: unknown[]): void;
  };
}

/**
 * Design Tool API v2 (Read + Write operations)
 */
export interface DesignToolAPI_v2 extends DesignToolAPI_v1 {
  readonly design: DesignToolAPI_v1['design'] & {
    createNode(options: CreateNodeOptions): Promise<string>;
    updateNode(id: string, changes: NodeChanges): Promise<void>;
    deleteNode(id: string): Promise<void>;
    duplicateNode(id: string): Promise<string>;
    groupNodes(ids: readonly string[]): Promise<string>;
    ungroupNode(id: string): Promise<string[]>;
  };

  readonly selection: {
    get(): Promise<string[]>;
    set(ids: readonly string[]): Promise<void>;
    add(ids: readonly string[]): Promise<void>;
    remove(ids: readonly string[]): Promise<void>;
    clear(): Promise<void>;
  };

  readonly viewport: {
    getZoom(): Promise<number>;
    setZoom(zoom: number): Promise<void>;
    getCenter(): Promise<Point>;
    setCenter(point: Point): Promise<void>;
    zoomToFit(ids?: readonly string[]): Promise<void>;
  };

  readonly history: {
    undo(): Promise<void>;
    redo(): Promise<void>;
    canUndo(): Promise<boolean>;
    canRedo(): Promise<boolean>;
    startBatch(name: string): Promise<void>;
    endBatch(): Promise<void>;
  };

  readonly events: {
    on(event: string, callback: (data: unknown) => void): Promise<string>;
    off(listenerId: string): Promise<void>;
  };
}

/**
 * Design Tool API v3 (Full API with storage, network, UI)
 */
export interface DesignToolAPI_v3 extends DesignToolAPI_v2 {
  readonly data: {
    readonly storage: {
      get(key: string): Promise<unknown>;
      set(key: string, value: SerializableValue): Promise<void>;
      delete(key: string): Promise<void>;
      list(): Promise<string[]>;
      getQuota(): Promise<StorageQuota>;
    };
    readonly clipboard: {
      readText(): Promise<string>;
      writeText(text: string): Promise<void>;
    };
  };

  readonly network: {
    fetch(url: string, options?: RequestInit): Promise<Response>;
  };

  readonly ui: {
    showPanel(options: PanelOptions): Promise<PanelHandle>;
    showModal(options: ModalOptions): Promise<ModalResult>;
    showToast(message: string, type?: ToastType): Promise<void>;
    closePanel(handle: PanelHandle): Promise<void>;
  };
}

/**
 * Current API version alias
 */
export type DesignToolAPI = DesignToolAPI_v3;
