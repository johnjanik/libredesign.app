/**
 * Pivot Manager
 *
 * Manages transform pivot point for rotation and scale operations.
 * Supports preset positions (9-point grid) and custom click-to-set pivot.
 */

import type { Point, Rect } from '@core/types/geometry';

/**
 * Preset pivot positions on a 9-point grid
 */
export type PivotPreset =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

/**
 * Pivot mode - preset position or custom
 */
export type PivotMode = PivotPreset | 'custom';

/**
 * Pivot state for a selection
 */
export interface PivotState {
  /** Current pivot mode */
  readonly mode: PivotMode;
  /** Custom pivot point (only used when mode is 'custom') */
  readonly customPoint: Point | null;
  /** Whether pivot is locked (persists across selection changes) */
  readonly locked: boolean;
}

/**
 * Pivot manager events
 */
export interface PivotManagerEvents {
  'pivot:changed': { pivot: Point; mode: PivotMode };
}

/**
 * Pivot manager options
 */
export interface PivotManagerOptions {
  /** Default pivot mode */
  readonly defaultMode?: PivotMode;
  /** Callback when pivot changes */
  readonly onPivotChange?: (pivot: Point, mode: PivotMode) => void;
}

const DEFAULT_OPTIONS: Required<Omit<PivotManagerOptions, 'onPivotChange'>> = {
  defaultMode: 'center',
};

/**
 * PivotManager class
 *
 * Manages the transform pivot point for selected nodes.
 */
export class PivotManager {
  private state: PivotState;
  private onPivotChange: ((pivot: Point, mode: PivotMode) => void) | null;

  constructor(options: PivotManagerOptions = {}) {
    this.state = {
      mode: options.defaultMode ?? DEFAULT_OPTIONS.defaultMode,
      customPoint: null,
      locked: false,
    };
    this.onPivotChange = options.onPivotChange ?? null;
  }

  /**
   * Get current pivot mode
   */
  getMode(): PivotMode {
    return this.state.mode;
  }

  /**
   * Get current pivot state
   */
  getState(): Readonly<PivotState> {
    return this.state;
  }

  /**
   * Set pivot mode to a preset position
   */
  setPreset(preset: PivotPreset): void {
    this.state = {
      ...this.state,
      mode: preset,
      customPoint: null,
    };
  }

  /**
   * Set custom pivot point
   */
  setCustomPivot(point: Point): void {
    this.state = {
      ...this.state,
      mode: 'custom',
      customPoint: point,
    };
  }

  /**
   * Lock/unlock pivot (persists across selection changes)
   */
  setLocked(locked: boolean): void {
    this.state = {
      ...this.state,
      locked,
    };
  }

  /**
   * Reset pivot to default (center)
   */
  reset(): void {
    this.state = {
      mode: 'center',
      customPoint: null,
      locked: false,
    };
  }

  /**
   * Calculate the actual pivot point for a given bounds
   */
  getPivotPoint(bounds: Rect): Point {
    if (this.state.mode === 'custom' && this.state.customPoint) {
      return this.state.customPoint;
    }

    return this.getPresetPoint(bounds, this.state.mode as PivotPreset);
  }

  /**
   * Get pivot point for a preset position
   */
  getPresetPoint(bounds: Rect, preset: PivotPreset): Point {
    const { x, y, width, height } = bounds;

    switch (preset) {
      case 'top-left':
        return { x, y };
      case 'top-center':
        return { x: x + width / 2, y };
      case 'top-right':
        return { x: x + width, y };
      case 'middle-left':
        return { x, y: y + height / 2 };
      case 'center':
        return { x: x + width / 2, y: y + height / 2 };
      case 'middle-right':
        return { x: x + width, y: y + height / 2 };
      case 'bottom-left':
        return { x, y: y + height };
      case 'bottom-center':
        return { x: x + width / 2, y: y + height };
      case 'bottom-right':
        return { x: x + width, y: y + height };
      default:
        return { x: x + width / 2, y: y + height / 2 };
    }
  }

  /**
   * Get all 9 preset positions for a bounds (for UI rendering)
   */
  getAllPresetPoints(bounds: Rect): Record<PivotPreset, Point> {
    return {
      'top-left': this.getPresetPoint(bounds, 'top-left'),
      'top-center': this.getPresetPoint(bounds, 'top-center'),
      'top-right': this.getPresetPoint(bounds, 'top-right'),
      'middle-left': this.getPresetPoint(bounds, 'middle-left'),
      'center': this.getPresetPoint(bounds, 'center'),
      'middle-right': this.getPresetPoint(bounds, 'middle-right'),
      'bottom-left': this.getPresetPoint(bounds, 'bottom-left'),
      'bottom-center': this.getPresetPoint(bounds, 'bottom-center'),
      'bottom-right': this.getPresetPoint(bounds, 'bottom-right'),
    };
  }

  /**
   * Hit test pivot presets on canvas
   */
  hitTestPresets(point: Point, bounds: Rect, threshold: number): PivotPreset | null {
    const presets = this.getAllPresetPoints(bounds);

    for (const [preset, presetPoint] of Object.entries(presets)) {
      const dx = point.x - presetPoint.x;
      const dy = point.y - presetPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= threshold) {
        return preset as PivotPreset;
      }
    }

    return null;
  }

  /**
   * Notify listeners of pivot change
   */
  notifyChange(bounds: Rect): void {
    const pivot = this.getPivotPoint(bounds);
    this.onPivotChange?.(pivot, this.state.mode);
  }
}

/**
 * Create a pivot manager instance
 */
export function createPivotManager(options?: PivotManagerOptions): PivotManager {
  return new PivotManager(options);
}

/**
 * Rotate a point around a pivot
 */
export function rotatePoint(point: Point, pivot: Point, angleDegrees: number): Point {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);

  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;

  return {
    x: pivot.x + dx * cos - dy * sin,
    y: pivot.y + dx * sin + dy * cos,
  };
}

/**
 * Scale a point relative to a pivot
 */
export function scalePoint(point: Point, pivot: Point, scaleX: number, scaleY: number): Point {
  return {
    x: pivot.x + (point.x - pivot.x) * scaleX,
    y: pivot.y + (point.y - pivot.y) * scaleY,
  };
}

/**
 * Transform bounds by rotating around a pivot
 */
export function rotateBoundsAroundPivot(
  bounds: Rect,
  pivot: Point,
  angleDegrees: number
): { corners: Point[]; center: Point } {
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];

  const rotatedCorners = corners.map(c => rotatePoint(c, pivot, angleDegrees));
  const center = rotatePoint(
    { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    pivot,
    angleDegrees
  );

  return { corners: rotatedCorners, center };
}
