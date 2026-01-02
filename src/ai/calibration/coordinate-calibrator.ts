/**
 * Coordinate Calibrator
 *
 * Calibrates coordinate systems between AI vision and the design canvas.
 * Uses the red crosshair at world origin (0,0) as a reference point.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { Point } from '@core/types/geometry';

/**
 * Calibration result
 */
export interface CalibrationResult {
  /** Canvas position of world origin (0,0) */
  originCanvas: Point;
  /** Current zoom level */
  zoom: number;
  /** Viewport offset */
  offset: Point;
  /** Canvas dimensions */
  canvasSize: { width: number; height: number };
  /** Timestamp of calibration */
  timestamp: number;
  /** Whether calibration is valid */
  isValid: boolean;
}

/**
 * Spatial description
 */
export interface SpatialDescription {
  /** Relative position (0-1 range) */
  relativeX: number;
  relativeY: number;
  /** Human-readable description */
  description: string;
  /** Quadrant */
  quadrant: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

/**
 * Coordinate Calibrator
 */
export class CoordinateCalibrator {
  private runtime: DesignLibreRuntime;
  private lastCalibration: CalibrationResult | null = null;

  constructor(runtime: DesignLibreRuntime) {
    this.runtime = runtime;
  }

  /**
   * Perform calibration using the origin crosshair.
   * The red crosshair at world (0,0) serves as the reference point.
   */
  calibrate(): CalibrationResult {
    const viewport = this.runtime.getViewport();
    if (!viewport) {
      return {
        originCanvas: { x: 0, y: 0 },
        zoom: 1,
        offset: { x: 0, y: 0 },
        canvasSize: { width: 0, height: 0 },
        timestamp: Date.now(),
        isValid: false,
      };
    }

    // Get the canvas position of world origin (0, 0)
    const originCanvas = viewport.worldToCanvas(0, 0);

    // Get viewport parameters
    const zoom = viewport.getZoom();
    const offset = viewport.getOffset();
    const canvasSize = viewport.getCanvasSize();

    this.lastCalibration = {
      originCanvas,
      zoom,
      offset,
      canvasSize,
      timestamp: Date.now(),
      isValid: true,
    };

    return this.lastCalibration;
  }

  /**
   * Get the last calibration result.
   */
  getCalibration(): CalibrationResult | null {
    return this.lastCalibration;
  }

  /**
   * Check if calibration is still valid (viewport hasn't changed significantly).
   */
  isCalibrationValid(): boolean {
    if (!this.lastCalibration) return false;

    const viewport = this.runtime.getViewport();
    if (!viewport) return false;

    const currentZoom = viewport.getZoom();
    const currentOffset = viewport.getOffset();

    // Check if zoom or offset has changed
    return (
      Math.abs(currentZoom - this.lastCalibration.zoom) < 0.001 &&
      Math.abs(currentOffset.x - this.lastCalibration.offset.x) < 1 &&
      Math.abs(currentOffset.y - this.lastCalibration.offset.y) < 1
    );
  }

  /**
   * Convert vision/screenshot pixel coordinates to world coordinates.
   * Vision coordinates are the pixel positions in the captured screenshot.
   */
  visionToWorld(visionX: number, visionY: number): Point {
    const viewport = this.runtime.getViewport();
    if (!viewport) {
      return { x: visionX, y: visionY };
    }

    // Vision coordinates are essentially canvas pixel coordinates
    // (assuming the screenshot was taken at native resolution)
    return viewport.canvasToWorld(visionX, visionY);
  }

  /**
   * Convert world coordinates to vision/screenshot pixel coordinates.
   */
  worldToVision(worldX: number, worldY: number): Point {
    const viewport = this.runtime.getViewport();
    if (!viewport) {
      return { x: worldX, y: worldY };
    }

    return viewport.worldToCanvas(worldX, worldY);
  }

  /**
   * Convert vision coordinates relative to a scaled screenshot.
   * Use this when the screenshot was scaled down for the AI.
   */
  scaledVisionToWorld(
    visionX: number,
    visionY: number,
    screenshotWidth: number,
    screenshotHeight: number
  ): Point {
    const viewport = this.runtime.getViewport();
    if (!viewport) {
      return { x: visionX, y: visionY };
    }

    const canvasSize = viewport.getCanvasSize();

    // Scale vision coordinates to canvas coordinates
    const canvasX = (visionX / screenshotWidth) * canvasSize.width;
    const canvasY = (visionY / screenshotHeight) * canvasSize.height;

    return viewport.canvasToWorld(canvasX, canvasY);
  }

  /**
   * Generate a human-readable description of a world position.
   * Useful for describing locations to the AI.
   */
  describePosition(worldX: number, worldY: number): SpatialDescription {
    const viewport = this.runtime.getViewport();
    if (!viewport) {
      return {
        relativeX: 0.5,
        relativeY: 0.5,
        description: 'center of canvas',
        quadrant: 'center',
      };
    }

    const canvasPos = viewport.worldToCanvas(worldX, worldY);
    const canvasSize = viewport.getCanvasSize();

    const relativeX = canvasPos.x / canvasSize.width;
    const relativeY = canvasPos.y / canvasSize.height;

    // Determine quadrant
    let quadrant: SpatialDescription['quadrant'];
    if (relativeX < 0.33 && relativeY < 0.33) {
      quadrant = 'top-left';
    } else if (relativeX > 0.66 && relativeY < 0.33) {
      quadrant = 'top-right';
    } else if (relativeX < 0.33 && relativeY > 0.66) {
      quadrant = 'bottom-left';
    } else if (relativeX > 0.66 && relativeY > 0.66) {
      quadrant = 'bottom-right';
    } else {
      quadrant = 'center';
    }

    // Generate description
    const xDesc = relativeX < 0.33 ? 'left' : relativeX > 0.66 ? 'right' : 'center';
    const yDesc = relativeY < 0.33 ? 'top' : relativeY > 0.66 ? 'bottom' : 'middle';

    let description: string;
    if (xDesc === 'center' && yDesc === 'middle') {
      description = 'center of canvas';
    } else if (xDesc === 'center') {
      description = `${yDesc} center`;
    } else if (yDesc === 'middle') {
      description = `${xDesc} side`;
    } else {
      description = `${yDesc}-${xDesc} area`;
    }

    // Add distance from origin
    const distFromOrigin = Math.sqrt(worldX * worldX + worldY * worldY);
    if (distFromOrigin < 50) {
      description = `near origin (${description})`;
    }

    return {
      relativeX,
      relativeY,
      description,
      quadrant,
    };
  }

  /**
   * Get calibration info as a string for the AI system prompt.
   */
  getCalibrationPrompt(): string {
    const calibration = this.calibrate();

    if (!calibration.isValid) {
      return 'Calibration unavailable. Coordinates may be inaccurate.';
    }

    return `COORDINATE CALIBRATION:
- Origin (0,0) is at canvas position (${Math.round(calibration.originCanvas.x)}, ${Math.round(calibration.originCanvas.y)})
- Current zoom: ${Math.round(calibration.zoom * 100)}%
- Canvas size: ${calibration.canvasSize.width} x ${calibration.canvasSize.height} pixels
- The RED CROSSHAIR marks the world origin (0,0)
- X increases to the right, Y increases downward
- All coordinates in the scene graph are in world units`;
  }

  /**
   * Find where a percentage position maps to in world coordinates.
   * Useful for commands like "center of canvas" → world coordinates.
   */
  percentToWorld(percentX: number, percentY: number): Point {
    const viewport = this.runtime.getViewport();
    if (!viewport) {
      return { x: 0, y: 0 };
    }

    const canvasSize = viewport.getCanvasSize();
    const canvasX = (percentX / 100) * canvasSize.width;
    const canvasY = (percentY / 100) * canvasSize.height;

    return viewport.canvasToWorld(canvasX, canvasY);
  }

  /**
   * Get the center of the visible canvas in world coordinates.
   */
  getVisibleCenter(): Point {
    return this.percentToWorld(50, 50);
  }

  /**
   * Get the visible bounds in world coordinates.
   */
  getVisibleBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const viewport = this.runtime.getViewport();
    if (!viewport) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    }

    return viewport.getVisibleBounds();
  }
}

/**
 * Create a coordinate calibrator instance.
 */
export function createCoordinateCalibrator(runtime: DesignLibreRuntime): CoordinateCalibrator {
  return new CoordinateCalibrator(runtime);
}
