/**
 * Canvas Container
 *
 * UI component that manages the canvas element and overlay layers.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';

/**
 * Canvas container options
 */
export interface CanvasContainerOptions {
  /** Background color (CSS color) */
  backgroundColor?: string | undefined;
  /** Show pixel grid at high zoom */
  showPixelGrid?: boolean | undefined;
  /** Grid color */
  gridColor?: string | undefined;
  /** Show origin marker at world (0,0) for debugging */
  showOrigin?: boolean | undefined;
  /** Origin marker color */
  originColor?: string | undefined;
}

/**
 * Resolved canvas container options (all values defined)
 */
interface ResolvedCanvasContainerOptions {
  backgroundColor: string;
  showPixelGrid: boolean;
  gridColor: string;
  showOrigin: boolean;
  originColor: string;
}

/**
 * Canvas Container
 */
export class CanvasContainer {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private options: ResolvedCanvasContainerOptions;
  private animationFrameId: number | null = null;
  private isRunning = false;

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: CanvasContainerOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    this.options = {
      backgroundColor: options.backgroundColor ?? '#141414',
      showPixelGrid: options.showPixelGrid ?? true,
      gridColor: options.gridColor ?? 'rgba(255, 255, 255, 0.1)',
      showOrigin: options.showOrigin ?? true,  // Default ON for debugging
      originColor: options.originColor ?? '#ff0000',
    };

    this.setup();
  }

  private setup(): void {
    // Style container
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    this.container.style.backgroundColor = this.options.backgroundColor;

    // Main canvas (created by runtime)
    this.canvas = this.container.querySelector('canvas');
    if (this.canvas) {
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
    }

    // Create overlay canvas for UI elements
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.style.position = 'absolute';
    this.overlayCanvas.style.top = '0';
    this.overlayCanvas.style.left = '0';
    this.overlayCanvas.style.pointerEvents = 'none';
    this.container.appendChild(this.overlayCanvas);

    // Handle resize
    this.handleResize();
    window.addEventListener('resize', this.handleResize);

    // Start render loop
    this.startRenderLoop();
  }

  /**
   * Start the overlay render loop.
   */
  private startRenderLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = (): void => {
      if (!this.isRunning) return;
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop the overlay render loop.
   */
  private stopRenderLoop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private handleResize = (): void => {
    if (!this.overlayCanvas) return;

    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio;

    this.overlayCanvas.width = rect.width * dpr;
    this.overlayCanvas.height = rect.height * dpr;
    this.overlayCanvas.style.width = `${rect.width}px`;
    this.overlayCanvas.style.height = `${rect.height}px`;

    this.render();
  };

  /**
   * Render overlay elements.
   *
   * Uses the universal coordinate transformation pipeline to ensure
   * consistency with pointer input handling.
   */
  render(): void {
    if (!this.overlayCanvas) return;

    const ctx = this.overlayCanvas.getContext('2d');
    if (!ctx) return;

    const viewport = this.runtime.getViewport();
    if (!viewport) return;

    const canvasWidth = this.overlayCanvas.width;
    const canvasHeight = this.overlayCanvas.height;
    const cssWidth = parseFloat(this.overlayCanvas.style.width);
    const cssHeight = parseFloat(this.overlayCanvas.style.height);

    // Calculate scale factor (same as pointer handler uses)
    const scaleX = canvasWidth / cssWidth;
    const scaleY = canvasHeight / cssHeight;

    // Clear with identity transform first
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Scale for DPR (coordinates will be in CSS pixels after this)
    ctx.scale(scaleX, scaleY);

    // Draw pixel grid at high zoom
    if (this.options.showPixelGrid) {
      this.drawPixelGrid(ctx);
    }

    // Draw crosshairs at canvas center
    this.drawCrosshairs(ctx);

    // Render tool overlays and origin marker
    const toolManager = this.runtime.getToolManager();
    const offset = viewport.getOffset();
    const zoom = viewport.getZoom();

    if (toolManager) {
      ctx.save();

      // Apply viewport transform directly in buffer pixel space
      // This must match WebGL's view matrix: world * zoom + offset
      // Using setTransform to bypass the DPR scale applied earlier
      ctx.setTransform(zoom, 0, 0, zoom, offset.x, offset.y);

      // Draw origin marker at world (0,0)
      if (this.options.showOrigin) {
        this.drawOrigin(ctx, zoom);
      }

      toolManager.render(ctx);
      ctx.restore();
    }

    // Render dimension label for selected objects
    this.renderSelectionOverlay(ctx, scaleX, scaleY);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Render selection overlay with bounding box and handles.
   *
   * @param ctx - Canvas 2D rendering context
   * @param scaleX - X scale factor (canvas.width / cssWidth)
   * @param scaleY - Y scale factor (canvas.height / cssHeight)
   */
  private renderSelectionOverlay(
    ctx: CanvasRenderingContext2D,
    scaleX: number,
    scaleY: number
  ): void {
    const selectionManager = this.runtime.getSelectionManager();
    const sceneGraph = this.runtime.getSceneGraph();
    const viewport = this.runtime.getViewport();

    if (!selectionManager || !sceneGraph || !viewport) return;

    const selectedIds = selectionManager.getSelectedNodeIds();
    if (selectedIds.length === 0) return;

    // Get combined bounds of all selected nodes
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const nodeId of selectedIds) {
      const node = sceneGraph.getNode(nodeId);
      if (!node) continue;

      // Skip nodes without position/size (DOCUMENT, PAGE, etc.)
      if (!('x' in node) || !('y' in node) || !('width' in node) || !('height' in node)) {
        continue;
      }

      const x = (node.x ?? 0);
      const y = (node.y ?? 0);
      const width = (node.width ?? 0);
      const height = (node.height ?? 0);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    }

    if (!isFinite(minX)) return;

    // Convert to screen coordinates
    // worldToCanvas returns canvas pixels, divide by scale to get CSS pixels
    const screenTopLeft = viewport.worldToCanvas(minX, minY);
    const screenBottomRight = viewport.worldToCanvas(maxX, maxY);

    const screenX = screenTopLeft.x / scaleX;
    const screenY = screenTopLeft.y / scaleY;
    const screenWidth = (screenBottomRight.x - screenTopLeft.x) / scaleX;

    // Draw dimension label above the selection
    const worldWidth = Math.round(maxX - minX);
    const worldHeight = Math.round(maxY - minY);
    const dimensionText = `${worldWidth} × ${worldHeight}`;

    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const textMetrics = ctx.measureText(dimensionText);
    const labelPadding = 4;
    const labelHeight = 16;
    const labelWidth = textMetrics.width + labelPadding * 2;
    const labelX = screenX + screenWidth / 2 - labelWidth / 2;
    const labelY = screenY - 4 - labelHeight;

    // Label background
    ctx.fillStyle = '#0d99ff';
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 3);
    ctx.fill();

    // Label text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(dimensionText, screenX + screenWidth / 2, screenY - 6);
  }

  private drawPixelGrid(ctx: CanvasRenderingContext2D): void {
    const zoom = this.runtime.getZoom();
    if (zoom < 8) return; // Only show grid at high zoom

    const gridSize = zoom;
    const width = this.overlayCanvas!.width / window.devicePixelRatio;
    const height = this.overlayCanvas!.height / window.devicePixelRatio;

    ctx.strokeStyle = this.options.gridColor;
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  private drawCrosshairs(ctx: CanvasRenderingContext2D): void {
    const width = this.overlayCanvas!.width / window.devicePixelRatio;
    const height = this.overlayCanvas!.height / window.devicePixelRatio;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  /**
   * Draw origin marker at world (0,0).
   * This is rendered in world coordinates (viewport transform already applied).
   */
  private drawOrigin(ctx: CanvasRenderingContext2D, zoom: number): void {
    // Draw crosshairs at world origin (0, 0)
    // Line length is constant screen size (50 CSS pixels)
    const lineLength = 50 / zoom;
    const lineWidth = 2 / zoom;

    ctx.save();
    ctx.strokeStyle = this.options.originColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(-lineLength, 0);
    ctx.lineTo(lineLength, 0);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(0, -lineLength);
    ctx.lineTo(0, lineLength);
    ctx.stroke();

    // Draw a small circle at the exact origin
    const circleRadius = 4 / zoom;
    ctx.fillStyle = this.options.originColor;
    ctx.beginPath();
    ctx.arc(0, 0, circleRadius, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.font = `${12 / zoom}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = this.options.originColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('(0, 0)', 8 / zoom, 8 / zoom);

    ctx.restore();
  }

  /**
   * Set background color.
   */
  setBackgroundColor(color: string): void {
    this.options.backgroundColor = color;
    this.container.style.backgroundColor = color;
  }

  /**
   * Toggle pixel grid.
   */
  setShowPixelGrid(show: boolean): void {
    this.options.showPixelGrid = show;
    this.render();
  }

  /**
   * Toggle origin marker (for debugging coordinate systems).
   */
  setShowOrigin(show: boolean): void {
    this.options.showOrigin = show;
    this.render();
  }

  /**
   * Dispose of the container.
   */
  dispose(): void {
    this.stopRenderLoop();
    window.removeEventListener('resize', this.handleResize);

    if (this.overlayCanvas) {
      this.container.removeChild(this.overlayCanvas);
    }
  }
}

/**
 * Create a canvas container.
 */
export function createCanvasContainer(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: CanvasContainerOptions
): CanvasContainer {
  return new CanvasContainer(runtime, container, options);
}
