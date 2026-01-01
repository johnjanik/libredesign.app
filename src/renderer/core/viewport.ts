/**
 * Viewport - Camera and view transformation
 *
 * Manages the view transformation for the canvas.
 */

import type { Point, Matrix2x3 } from '@core/types/geometry';
import {
  identity,
  multiply,
  invert,
  translate,
  scale,
} from '@core/math/matrix';
import { EventEmitter } from '@core/events/event-emitter';

/**
 * Viewport events
 */
export type ViewportEvents = {
  'changed': { viewport: Viewport };
  [key: string]: unknown;
};

/**
 * Viewport bounds
 */
export interface ViewportBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Viewport configuration
 */
export interface ViewportConfig {
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly zoomStep?: number;
}

/**
 * Viewport - manages camera position and zoom
 */
export class Viewport extends EventEmitter<ViewportEvents> {
  // Canvas dimensions
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  // Camera position (in canvas coordinates)
  private offsetX: number = 0;
  private offsetY: number = 0;

  // Zoom level
  private zoomLevel: number = 1;

  // Configuration
  private minZoom: number;
  private maxZoom: number;
  private zoomStep: number;

  // Cached matrices
  private viewMatrix: Matrix2x3 = identity();
  private inverseViewMatrix: Matrix2x3 = identity();
  private projectionMatrix: Matrix2x3 = identity();
  private viewProjectionMatrix: Matrix2x3 = identity();
  private matrixDirty: boolean = true;

  constructor(config: ViewportConfig = {}) {
    super();
    this.minZoom = config.minZoom ?? 0.1;
    this.maxZoom = config.maxZoom ?? 64;
    this.zoomStep = config.zoomStep ?? 1.1;
  }

  // =========================================================================
  // Canvas Size
  // =========================================================================

  /**
   * Set canvas dimensions.
   */
  setCanvasSize(width: number, height: number): void {
    if (this.canvasWidth !== width || this.canvasHeight !== height) {
      this.canvasWidth = width;
      this.canvasHeight = height;
      this.matrixDirty = true;
      this.emit('changed', { viewport: this });
    }
  }

  /**
   * Get canvas dimensions.
   */
  getCanvasSize(): { width: number; height: number } {
    return { width: this.canvasWidth, height: this.canvasHeight };
  }

  // =========================================================================
  // Camera Position
  // =========================================================================

  /**
   * Get camera offset.
   */
  getOffset(): Point {
    return { x: this.offsetX, y: this.offsetY };
  }

  /**
   * Set camera offset.
   */
  setOffset(x: number, y: number): void {
    if (this.offsetX !== x || this.offsetY !== y) {
      this.offsetX = x;
      this.offsetY = y;
      this.matrixDirty = true;
      this.emit('changed', { viewport: this });
    }
  }

  /**
   * Pan camera by delta.
   */
  pan(dx: number, dy: number): void {
    this.setOffset(this.offsetX + dx, this.offsetY + dy);
  }

  /**
   * Center view on a point.
   */
  centerOn(x: number, y: number): void {
    this.setOffset(
      this.canvasWidth / 2 - x * this.zoomLevel,
      this.canvasHeight / 2 - y * this.zoomLevel
    );
  }

  // =========================================================================
  // Zoom
  // =========================================================================

  /**
   * Get current zoom level.
   */
  getZoom(): number {
    return this.zoomLevel;
  }

  /**
   * Set zoom level.
   */
  setZoom(zoom: number): void {
    const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    if (this.zoomLevel !== clampedZoom) {
      this.zoomLevel = clampedZoom;
      this.matrixDirty = true;
      this.emit('changed', { viewport: this });
    }
  }

  /**
   * Zoom in.
   */
  zoomIn(factor?: number): void {
    this.setZoom(this.zoomLevel * (factor ?? this.zoomStep));
  }

  /**
   * Zoom out.
   */
  zoomOut(factor?: number): void {
    this.setZoom(this.zoomLevel / (factor ?? this.zoomStep));
  }

  /**
   * Zoom at a specific point (keeps that point fixed).
   */
  zoomAt(zoom: number, canvasX: number, canvasY: number): void {
    const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    if (this.zoomLevel === clampedZoom) return;

    // Calculate the world point under the cursor
    const worldX = (canvasX - this.offsetX) / this.zoomLevel;
    const worldY = (canvasY - this.offsetY) / this.zoomLevel;

    // Update zoom
    this.zoomLevel = clampedZoom;

    // Adjust offset to keep the world point under the cursor
    this.offsetX = canvasX - worldX * this.zoomLevel;
    this.offsetY = canvasY - worldY * this.zoomLevel;

    this.matrixDirty = true;
    this.emit('changed', { viewport: this });
  }

  /**
   * Reset to default view.
   */
  reset(): void {
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoomLevel = 1;
    this.matrixDirty = true;
    this.emit('changed', { viewport: this });
  }

  /**
   * Fit a rectangle in view.
   */
  fitRect(x: number, y: number, width: number, height: number, padding: number = 20): void {
    if (width <= 0 || height <= 0) return;

    const availableWidth = this.canvasWidth - padding * 2;
    const availableHeight = this.canvasHeight - padding * 2;

    const scaleX = availableWidth / width;
    const scaleY = availableHeight / height;
    const zoom = Math.min(scaleX, scaleY, this.maxZoom);

    this.setZoom(zoom);
    this.centerOn(x + width / 2, y + height / 2);
  }

  // =========================================================================
  // Matrices
  // =========================================================================

  private updateMatrices(): void {
    if (!this.matrixDirty) return;

    // View matrix: translate then scale
    this.viewMatrix = multiply(
      translate(this.offsetX, this.offsetY),
      scale(this.zoomLevel, this.zoomLevel)
    );

    // Inverse view matrix
    const inverted = invert(this.viewMatrix);
    this.inverseViewMatrix = inverted ?? identity();

    // Projection matrix: convert to clip space (-1 to 1)
    this.projectionMatrix = multiply(
      translate(-1, 1),
      scale(2 / this.canvasWidth, -2 / this.canvasHeight)
    );

    // Combined view-projection matrix
    this.viewProjectionMatrix = multiply(this.projectionMatrix, this.viewMatrix);

    this.matrixDirty = false;
  }

  /**
   * Get the view matrix.
   */
  getViewMatrix(): Matrix2x3 {
    this.updateMatrices();
    return this.viewMatrix;
  }

  /**
   * Get the inverse view matrix.
   */
  getInverseViewMatrix(): Matrix2x3 {
    this.updateMatrices();
    return this.inverseViewMatrix;
  }

  /**
   * Get the projection matrix.
   */
  getProjectionMatrix(): Matrix2x3 {
    this.updateMatrices();
    return this.projectionMatrix;
  }

  /**
   * Get the combined view-projection matrix.
   */
  getViewProjectionMatrix(): Matrix2x3 {
    this.updateMatrices();
    return this.viewProjectionMatrix;
  }

  // =========================================================================
  // Coordinate Transformation (Universal Graphics Pipeline)
  // =========================================================================

  /**
   * Convert canvas pixel coordinates to world coordinates.
   *
   * Pipeline: Canvas Pixels → NDC → World
   *
   * This follows the universal graphics pipeline used by Three.js, Babylon.js,
   * Unity, and all professional engines.
   *
   * @param pixelX - X position in canvas pixels (from pointer event)
   * @param pixelY - Y position in canvas pixels (from pointer event)
   */
  canvasToWorld(pixelX: number, pixelY: number): Point {
    if (this.canvasWidth === 0 || this.canvasHeight === 0) {
      return { x: 0, y: 0 };
    }

    // Step 1: Canvas pixels to NDC [-1, 1]
    // For 2D canvas (Y=0 at top), we use standard NDC without Y-flip
    // NDC formula: ndc = (pixel / size) * 2 - 1
    const ndcX = (pixelX / this.canvasWidth) * 2 - 1;
    const ndcY = (pixelY / this.canvasHeight) * 2 - 1;

    // Step 2: NDC to World via inverse View-Projection
    // Our VP matrix: Project * View = scale(2/w, -2/h) * translate(-1, 1) * translate(offset) * scale(zoom)
    // For 2D, simplified inverse: world = (ndc * canvasSize/2 - offset) / zoom
    //
    // Derivation:
    //   canvas = world * zoom + offset
    //   ndc = (canvas / canvasSize) * 2 - 1
    //   ndc = ((world * zoom + offset) / canvasSize) * 2 - 1
    //   ndc + 1 = ((world * zoom + offset) / canvasSize) * 2
    //   (ndc + 1) / 2 = (world * zoom + offset) / canvasSize
    //   (ndc + 1) / 2 * canvasSize = world * zoom + offset
    //   world = ((ndc + 1) / 2 * canvasSize - offset) / zoom
    //   world = (ndc * canvasSize/2 + canvasSize/2 - offset) / zoom

    const worldX = ((ndcX + 1) / 2 * this.canvasWidth - this.offsetX) / this.zoomLevel;
    const worldY = ((ndcY + 1) / 2 * this.canvasHeight - this.offsetY) / this.zoomLevel;

    return { x: worldX, y: worldY };
  }

  /**
   * Convert world coordinates to canvas pixel coordinates.
   *
   * Pipeline: World → NDC → Canvas Pixels
   *
   * @param worldX - X position in world coordinates
   * @param worldY - Y position in world coordinates
   */
  worldToCanvas(worldX: number, worldY: number): Point {
    if (this.canvasWidth === 0 || this.canvasHeight === 0) {
      return { x: 0, y: 0 };
    }

    // Step 1: World to canvas pixels
    // canvas = world * zoom + offset
    const canvasX = worldX * this.zoomLevel + this.offsetX;
    const canvasY = worldY * this.zoomLevel + this.offsetY;

    return { x: canvasX, y: canvasY };
  }

  /**
   * Get the visible world bounds.
   */
  getVisibleBounds(): ViewportBounds {
    const topLeft = this.canvasToWorld(0, 0);
    const bottomRight = this.canvasToWorld(this.canvasWidth, this.canvasHeight);

    return {
      minX: topLeft.x,
      minY: topLeft.y,
      maxX: bottomRight.x,
      maxY: bottomRight.y,
    };
  }

  /**
   * Check if a world rectangle is visible.
   */
  isRectVisible(x: number, y: number, width: number, height: number): boolean {
    const bounds = this.getVisibleBounds();
    return !(
      x + width < bounds.minX ||
      x > bounds.maxX ||
      y + height < bounds.minY ||
      y > bounds.maxY
    );
  }
}

/**
 * Create a new viewport.
 */
export function createViewport(config?: ViewportConfig): Viewport {
  return new Viewport(config);
}
