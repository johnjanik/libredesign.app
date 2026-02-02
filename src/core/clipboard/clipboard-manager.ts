/**
 * Clipboard Manager
 *
 * Enhanced clipboard functionality for CAD-style operations:
 * - Copy with base point
 * - Paste at specific coordinates
 * - Paste in place
 * - Multiple paste with offset
 * - Clipboard history
 */

import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';

/**
 * Clipboard entry containing node data and metadata
 */
export interface ClipboardEntry {
  /** Unique ID for this clipboard entry */
  readonly id: string;
  /** Timestamp when copied */
  readonly timestamp: number;
  /** Base point used for copy (for precise paste positioning) */
  readonly basePoint: Point;
  /** Node IDs that were copied */
  readonly sourceNodeIds: readonly NodeId[];
  /** Serialized node data */
  readonly nodeData: readonly SerializedNode[];
  /** Original positions relative to base point */
  readonly relativePositions: readonly Point[];
  /** Original bounding box */
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

/**
 * Serialized node for clipboard
 */
export interface SerializedNode {
  readonly type: string;
  readonly name: string;
  readonly properties: Record<string, unknown>;
  readonly children?: readonly SerializedNode[];
}

/**
 * Paste options
 */
export interface PasteOptions {
  /** Target position (world coordinates) */
  readonly position?: Point;
  /** Paste in place (use original positions) */
  readonly inPlace?: boolean;
  /** Offset from base point */
  readonly offset?: Point;
  /** Number of copies for array paste */
  readonly copies?: number;
  /** Offset between copies for array paste */
  readonly copyOffset?: Point;
  /** Target parent node ID */
  readonly parentId?: NodeId;
}

/**
 * Paste result
 */
export interface PasteResult {
  /** Newly created node IDs */
  readonly nodeIds: readonly NodeId[];
  /** Whether paste was successful */
  readonly success: boolean;
  /** Error message if failed */
  readonly error?: string;
}

/**
 * Copy options
 */
export interface CopyOptions {
  /** Base point for positioning */
  readonly basePoint?: Point;
  /** Whether to use center of selection as base point */
  readonly useSelectionCenter?: boolean;
  /** Whether to use first clicked point as base point */
  readonly useClickPoint?: boolean;
}

/**
 * Clipboard Manager
 */
export class ClipboardManager {
  private currentEntry: ClipboardEntry | null = null;
  private history: ClipboardEntry[] = [];
  private maxHistorySize = 10;
  private lastPastePosition: Point | null = null;
  private pasteOffset: Point = { x: 20, y: 20 };

  // Callbacks
  private onCopy?: (entry: ClipboardEntry) => void;
  private onPaste?: (options: PasteOptions) => PasteResult;
  private onSerializeNodes?: (nodeIds: readonly NodeId[]) => SerializedNode[];
  private onGetNodeBounds?: (nodeIds: readonly NodeId[]) => { x: number; y: number; width: number; height: number };
  private onGetNodePositions?: (nodeIds: readonly NodeId[]) => Point[];

  constructor() {
    this.setupSystemClipboard();
  }

  /**
   * Set callbacks
   */
  setOnCopy(callback: (entry: ClipboardEntry) => void): void {
    this.onCopy = callback;
  }

  setOnPaste(callback: (options: PasteOptions) => PasteResult): void {
    this.onPaste = callback;
  }

  setOnSerializeNodes(callback: (nodeIds: readonly NodeId[]) => SerializedNode[]): void {
    this.onSerializeNodes = callback;
  }

  setOnGetNodeBounds(callback: (nodeIds: readonly NodeId[]) => { x: number; y: number; width: number; height: number }): void {
    this.onGetNodeBounds = callback;
  }

  setOnGetNodePositions(callback: (nodeIds: readonly NodeId[]) => Point[]): void {
    this.onGetNodePositions = callback;
  }

  /**
   * Copy nodes with optional base point
   */
  copy(nodeIds: readonly NodeId[], options: CopyOptions = {}): ClipboardEntry | null {
    if (nodeIds.length === 0) return null;

    // Get node data
    const nodeData = this.onSerializeNodes?.(nodeIds) ?? [];
    if (nodeData.length === 0) return null;

    // Get bounds
    const bounds = this.onGetNodeBounds?.(nodeIds) ?? { x: 0, y: 0, width: 0, height: 0 };

    // Determine base point
    let basePoint: Point;
    if (options.basePoint) {
      basePoint = options.basePoint;
    } else if (options.useSelectionCenter) {
      basePoint = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      };
    } else {
      // Default to top-left of bounds
      basePoint = { x: bounds.x, y: bounds.y };
    }

    // Get relative positions
    const positions = this.onGetNodePositions?.(nodeIds) ?? [];
    const relativePositions = positions.map(p => ({
      x: p.x - basePoint.x,
      y: p.y - basePoint.y,
    }));

    // Create entry
    const entry: ClipboardEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      basePoint,
      sourceNodeIds: nodeIds,
      nodeData,
      relativePositions,
      bounds,
    };

    this.currentEntry = entry;
    this.addToHistory(entry);
    this.onCopy?.(entry);

    // Also copy to system clipboard as JSON
    this.copyToSystemClipboard(entry);

    return entry;
  }

  /**
   * Copy with base point (user clicks to specify base point)
   */
  copyWithBasePoint(nodeIds: readonly NodeId[], basePoint: Point): ClipboardEntry | null {
    return this.copy(nodeIds, { basePoint });
  }

  /**
   * Cut nodes
   */
  cut(nodeIds: readonly NodeId[], options: CopyOptions = {}): ClipboardEntry | null {
    const entry = this.copy(nodeIds, options);
    // The actual deletion should be handled by the caller
    return entry;
  }

  /**
   * Paste at position
   */
  paste(options: PasteOptions = {}): PasteResult {
    if (!this.currentEntry) {
      return { nodeIds: [], success: false, error: 'Nothing to paste' };
    }

    if (!this.onPaste) {
      return { nodeIds: [], success: false, error: 'Paste handler not set' };
    }

    // Calculate paste position
    let pasteOptions: PasteOptions;

    if (options.inPlace) {
      // Paste at original positions
      pasteOptions = { ...options, inPlace: true };
    } else if (options.position) {
      // Paste at specific position
      pasteOptions = { ...options };
    } else {
      // Paste with offset from last position or original position
      const basePos = this.lastPastePosition ?? this.currentEntry.basePoint;
      pasteOptions = {
        ...options,
        position: {
          x: basePos.x + this.pasteOffset.x,
          y: basePos.y + this.pasteOffset.y,
        },
      };
    }

    const result = this.onPaste(pasteOptions);

    if (result.success && pasteOptions.position) {
      this.lastPastePosition = pasteOptions.position;
    }

    return result;
  }

  /**
   * Paste in place (at original positions)
   */
  pasteInPlace(): PasteResult {
    return this.paste({ inPlace: true });
  }

  /**
   * Paste at specific coordinates
   */
  pasteAt(position: Point): PasteResult {
    return this.paste({ position });
  }

  /**
   * Paste multiple copies with offset
   */
  pasteMultiple(copies: number, offset: Point): PasteResult[] {
    const results: PasteResult[] = [];

    for (let i = 0; i < copies; i++) {
      const position = this.currentEntry
        ? {
            x: this.currentEntry.basePoint.x + offset.x * (i + 1),
            y: this.currentEntry.basePoint.y + offset.y * (i + 1),
          }
        : { x: offset.x * (i + 1), y: offset.y * (i + 1) };

      const result = this.paste({ position });
      results.push(result);
    }

    return results;
  }

  /**
   * Get current clipboard entry
   */
  getCurrent(): ClipboardEntry | null {
    return this.currentEntry;
  }

  /**
   * Check if clipboard has content
   */
  hasContent(): boolean {
    return this.currentEntry !== null;
  }

  /**
   * Get clipboard history
   */
  getHistory(): readonly ClipboardEntry[] {
    return this.history;
  }

  /**
   * Clear clipboard
   */
  clear(): void {
    this.currentEntry = null;
    this.lastPastePosition = null;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Set paste offset for subsequent pastes
   */
  setPasteOffset(offset: Point): void {
    this.pasteOffset = offset;
  }

  /**
   * Get paste offset
   */
  getPasteOffset(): Point {
    return this.pasteOffset;
  }

  /**
   * Restore entry from history
   */
  restoreFromHistory(entryId: string): boolean {
    const entry = this.history.find(e => e.id === entryId);
    if (entry) {
      this.currentEntry = entry;
      return true;
    }
    return false;
  }

  /**
   * Setup system clipboard integration
   */
  private setupSystemClipboard(): void {
    // Listen for paste events from system clipboard
    document.addEventListener('paste', async (e) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // Try to get DesignLibre data
      const jsonData = clipboardData.getData('application/json');
      if (jsonData) {
        try {
          const entry = JSON.parse(jsonData) as ClipboardEntry;
          if (this.isValidEntry(entry)) {
            this.currentEntry = entry;
          }
        } catch {
          // Not valid JSON, ignore
        }
      }
    });
  }

  /**
   * Copy to system clipboard
   */
  private copyToSystemClipboard(entry: ClipboardEntry): void {
    try {
      const json = JSON.stringify(entry);
      navigator.clipboard.writeText(json).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = json;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      });
    } catch {
      // Clipboard API not available
    }
  }

  /**
   * Validate clipboard entry
   */
  private isValidEntry(entry: unknown): entry is ClipboardEntry {
    if (typeof entry !== 'object' || entry === null) return false;
    const e = entry as Record<string, unknown>;
    return (
      typeof e['id'] === 'string' &&
      typeof e['timestamp'] === 'number' &&
      typeof e['basePoint'] === 'object' &&
      Array.isArray(e['nodeData'])
    );
  }

  /**
   * Add entry to history
   */
  private addToHistory(entry: ClipboardEntry): void {
    // Remove duplicate if exists
    this.history = this.history.filter(e => e.id !== entry.id);

    // Add to front
    this.history.unshift(entry);

    // Trim to max size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create a clipboard manager instance
 */
export function createClipboardManager(): ClipboardManager {
  return new ClipboardManager();
}

/**
 * Global clipboard manager singleton
 */
let globalClipboardManager: ClipboardManager | null = null;

export function getGlobalClipboardManager(): ClipboardManager {
  if (!globalClipboardManager) {
    globalClipboardManager = createClipboardManager();
  }
  return globalClipboardManager;
}
