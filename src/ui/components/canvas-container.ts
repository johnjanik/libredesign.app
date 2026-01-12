/**
 * Canvas Container
 *
 * UI component that manages the canvas element and overlay layers.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import { Rulers } from './rulers';
import { getSetting } from '@core/settings/app-settings';

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
  /** Show design grid */
  showGrid?: boolean | undefined;
  /** Show rulers */
  showRulers?: boolean | undefined;
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
  showGrid: boolean;
  showRulers: boolean;
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
  private rulers: Rulers | null = null;
  private options: ResolvedCanvasContainerOptions;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private resizeObserver: ResizeObserver | null = null;
  private settingsHandler: ((e: Event) => void) | null = null;
  private dprMediaQuery: MediaQueryList | null = null;
  private dprChangeHandler: (() => void) | null = null;

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: CanvasContainerOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    this.options = {
      backgroundColor: options.backgroundColor ?? this.loadCanvasBackgroundSetting(),
      showPixelGrid: options.showPixelGrid ?? true,
      gridColor: options.gridColor ?? 'rgba(255, 255, 255, 0.1)',
      showGrid: options.showGrid ?? getSetting('showGrid'),
      showRulers: options.showRulers ?? getSetting('showRulers'),
      showOrigin: options.showOrigin ?? this.loadShowOriginSetting(),
      originColor: options.originColor ?? '#ff0000',
    };

    this.setup();
  }

  /**
   * Load showOrigin setting from localStorage.
   */
  private loadShowOriginSetting(): boolean {
    try {
      const stored = localStorage.getItem('designlibre-show-origin');
      if (stored !== null) {
        return stored === 'true';
      }
    } catch {
      // localStorage not available
    }
    return false; // Default OFF (still available via API for AI orientation)
  }

  /**
   * Load canvas background setting from localStorage.
   */
  private loadCanvasBackgroundSetting(): string {
    try {
      const stored = localStorage.getItem('designlibre-canvas-background');
      if (stored) {
        const colorMap: Record<string, string> = {
          'dark': '#0a0a0a',
          'light': '#f5f5f5',
          'transparent': 'transparent',
        };
        return colorMap[stored] ?? '#0a0a0a';
      }
    } catch {
      // localStorage not available
    }
    return '#0a0a0a'; // Default dark
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

    // Handle resize using ResizeObserver to catch sidebar collapse/expand
    this.handleResize();
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);

    // Listen for devicePixelRatio changes (browser zoom)
    // ResizeObserver doesn't fire when only DPR changes, so we need this
    this.setupDprChangeListener();

    // Listen for settings changes
    this.settingsHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        showOrigin?: boolean;
        canvasBackground?: string;
        showGrid?: boolean;
        showRulers?: boolean;
      };
      if (detail.showOrigin !== undefined) {
        this.setShowOrigin(detail.showOrigin);
      }
      if (detail.canvasBackground !== undefined) {
        this.setBackgroundColor(detail.canvasBackground);
      }
      if (detail.showGrid !== undefined) {
        this.setShowGrid(detail.showGrid);
      }
      if (detail.showRulers !== undefined) {
        this.setShowRulers(detail.showRulers);
      }
    };
    window.addEventListener('designlibre-settings-changed', this.settingsHandler);

    // Initialize rulers
    const viewport = this.runtime.getViewport();
    if (viewport) {
      this.rulers = new Rulers({
        viewport,
        container: this.container,
      });
      this.rulers.setVisible(this.options.showRulers);
    }

    // Set up drag-drop for library components
    this.setupLibraryDragDrop();

    // Start render loop
    this.startRenderLoop();
  }

  /**
   * Set up drag-drop handling for library components
   */
  private setupLibraryDragDrop(): void {
    // Drag over - allow drop
    this.container.addEventListener('dragover', (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('application/x-designlibre-library-component')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        this.container.style.outline = '2px solid #3b82f6';
        this.container.style.outlineOffset = '-2px';
      }
    });

    // Drag leave - reset visual
    this.container.addEventListener('dragleave', (e: DragEvent) => {
      // Only reset if leaving the container, not entering a child
      if (e.relatedTarget && this.container.contains(e.relatedTarget as Node)) {
        return;
      }
      this.container.style.outline = '';
      this.container.style.outlineOffset = '';
    });

    // Drop - create component instance
    this.container.addEventListener('drop', (e: DragEvent) => {
      this.container.style.outline = '';
      this.container.style.outlineOffset = '';

      const componentId = e.dataTransfer?.getData('application/x-designlibre-library-component');
      if (!componentId) return;

      e.preventDefault();

      // Get drop position in canvas coordinates (CSS pixels relative to container)
      const rect = this.container.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;

      // Convert CSS pixels to canvas pixels (multiply by device pixel ratio)
      const dpr = window.devicePixelRatio || 1;
      const canvasX = cssX * dpr;
      const canvasY = cssY * dpr;

      // Convert to world coordinates using the viewport
      const viewport = this.runtime.getViewport();
      if (!viewport) return;
      const worldPos = viewport.canvasToWorld(canvasX, canvasY);

      // Emit event for runtime to handle component creation
      window.dispatchEvent(new CustomEvent('designlibre-library-drop', {
        detail: {
          componentId,
          x: worldPos.x,
          y: worldPos.y,
          canvasX,
          canvasY,
        },
      }));
    });
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

  /**
   * Set up a listener for devicePixelRatio changes (browser zoom).
   * This is needed because ResizeObserver doesn't fire when only DPR changes.
   */
  private setupDprChangeListener(): void {
    // Clean up existing listener if any
    if (this.dprMediaQuery && this.dprChangeHandler) {
      this.dprMediaQuery.removeEventListener('change', this.dprChangeHandler);
    }

    // Create media query for current DPR
    const dpr = window.devicePixelRatio;
    this.dprMediaQuery = window.matchMedia(`(resolution: ${dpr}dppx)`);

    // Handler that re-sets up the listener with new DPR and triggers resize
    this.dprChangeHandler = () => {
      // DPR changed, trigger resize and re-setup listener with new DPR
      this.handleResize();
      // Re-setup listener with new DPR value
      this.setupDprChangeListener();
    };

    this.dprMediaQuery.addEventListener('change', this.dprChangeHandler);
  }

  private handleResize = (): void => {
    if (!this.overlayCanvas) return;

    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio;

    this.overlayCanvas.width = rect.width * dpr;
    this.overlayCanvas.height = rect.height * dpr;
    this.overlayCanvas.style.width = `${rect.width}px`;
    this.overlayCanvas.style.height = `${rect.height}px`;

    // Also trigger the WebGL renderer's resize to update viewport
    const renderer = this.runtime.getRenderer();
    if (renderer) {
      // Update pixel ratio if it changed (handles browser zoom)
      const oldDpr = renderer.getPixelRatio();
      if (oldDpr !== dpr) {
        renderer.setPixelRatio(dpr);
      }
      renderer.resize();
    }

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

    // Draw design grid
    if (this.options.showGrid) {
      this.drawGrid(ctx);
    }

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

      // Render text nodes (WebGL renderer doesn't handle text yet)
      this.renderTextNodes(ctx, zoom);

      toolManager.render(ctx);
      ctx.restore();
    }

    // Render dimension label for selected objects
    // Use the same viewport transform as WebGL to ensure alignment
    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, offset.x, offset.y);
    this.renderSelectionOverlay(ctx, zoom);
    ctx.restore();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Render selection overlay with bounding box and handles.
   *
   * The context already has the viewport transform applied (zoom + offset),
   * so we draw in world coordinates directly.
   *
   * @param ctx - Canvas 2D rendering context (with viewport transform)
   * @param zoom - Current zoom level (for scaling UI elements)
   */
  private renderSelectionOverlay(
    ctx: CanvasRenderingContext2D,
    zoom: number
  ): void {
    const selectionManager = this.runtime.getSelectionManager();
    const sceneGraph = this.runtime.getSceneGraph();

    if (!selectionManager || !sceneGraph) return;

    const selectedIds = selectionManager.getSelectedNodeIds();
    if (selectedIds.length === 0) return;

    // Get combined bounds of all selected nodes in world coordinates
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const nodeId of selectedIds) {
      // Use getWorldBounds to account for parent transforms
      const worldBounds = sceneGraph.getWorldBounds(nodeId);
      if (!worldBounds) continue;

      minX = Math.min(minX, worldBounds.x);
      minY = Math.min(minY, worldBounds.y);
      maxX = Math.max(maxX, worldBounds.x + worldBounds.width);
      maxY = Math.max(maxY, worldBounds.y + worldBounds.height);
    }

    if (!isFinite(minX)) return;

    // Draw in world coordinates - the viewport transform is already applied
    const worldWidth = maxX - minX;
    const worldHeight = maxY - minY;
    const dimensionText = `${Math.round(worldWidth)} × ${Math.round(worldHeight)}`;

    // Scale UI elements inversely to zoom so they appear consistent size on screen
    const uiScale = 1 / zoom;

    ctx.font = `${11 * uiScale}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const textMetrics = ctx.measureText(dimensionText);
    const labelPadding = 4 * uiScale;
    const labelHeight = 16 * uiScale;
    const labelWidth = textMetrics.width + labelPadding * 2;
    const labelX = minX + worldWidth / 2 - labelWidth / 2;
    const labelY = minY - 4 * uiScale - labelHeight;

    // Label background
    ctx.fillStyle = '#0d99ff';
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 3 * uiScale);
    ctx.fill();

    // Label text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(dimensionText, minX + worldWidth / 2, minY - 6 * uiScale);
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

  /**
   * Draw design grid based on gridSize setting.
   * Visible at all zoom levels (with adaptive rendering).
   */
  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const viewport = this.runtime.getViewport();
    if (!viewport) return;

    const zoom = viewport.getZoom();
    const offset = viewport.getOffset();
    const gridSize = getSetting('gridSize');

    // Calculate screen-space grid spacing
    const screenGridSize = gridSize * zoom;

    // Don't render if grid lines would be too dense (< 4 pixels apart)
    if (screenGridSize < 4) return;

    const cssWidth = this.overlayCanvas!.width / window.devicePixelRatio;
    const cssHeight = this.overlayCanvas!.height / window.devicePixelRatio;

    // Get visible world bounds
    const bounds = viewport.getVisibleBounds();

    // Round to nearest grid line
    const startX = Math.floor(bounds.minX / gridSize) * gridSize;
    const startY = Math.floor(bounds.minY / gridSize) * gridSize;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let worldX = startX; worldX <= bounds.maxX; worldX += gridSize) {
      const screenX = worldX * zoom + offset.x;
      if (screenX < 0 || screenX > cssWidth) continue;

      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, cssHeight);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let worldY = startY; worldY <= bounds.maxY; worldY += gridSize) {
      const screenY = worldY * zoom + offset.y;
      if (screenY < 0 || screenY > cssHeight) continue;

      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(cssWidth, screenY);
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
   * Render all text nodes on the canvas.
   * This is necessary because WebGL renderer doesn't handle text yet.
   * Rendered in world coordinates (viewport transform already applied).
   */
  private renderTextNodes(ctx: CanvasRenderingContext2D, _zoom: number): void {
    const sceneGraph = this.runtime.getSceneGraph();
    if (!sceneGraph) return;

    // Get all nodes and filter for text nodes
    const allNodeIds = sceneGraph.getAllNodeIds();
    const textNodeIds = allNodeIds.filter(id => {
      const node = sceneGraph.getNode(id);
      return node !== null && node.type === 'TEXT';
    });

    for (const nodeId of textNodeIds) {
      const node = sceneGraph.getNode(nodeId);
      if (!node) continue;

      const textNode = node as unknown as {
        id: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        characters?: string;
        fills?: Array<{
          type: string;
          color?: { r: number; g: number; b: number; a: number };
          visible?: boolean;
        }>;
        textStyles?: Array<{
          fontSize?: number;
          fontFamily?: string;
          fontWeight?: number;
          lineHeight?: number;
        }>;
        visible?: boolean;
        opacity?: number;
      };

      // Skip invisible nodes or nodes with no text
      if (textNode.visible === false) continue;
      if (!textNode.characters || textNode.characters.length === 0) continue;

      // Get world bounds to render at correct position (accounting for parent transforms)
      const worldBounds = sceneGraph.getWorldBounds(nodeId);
      if (!worldBounds) continue;

      const x = worldBounds.x;
      const y = worldBounds.y;
      const opacity = textNode.opacity ?? 1;

      // Get text style
      const fontSize = textNode.textStyles?.[0]?.fontSize ?? 16;
      const fontFamily = textNode.textStyles?.[0]?.fontFamily ?? 'Inter, sans-serif';
      const fontWeight = textNode.textStyles?.[0]?.fontWeight ?? 400;
      const lineHeight = textNode.textStyles?.[0]?.lineHeight ?? fontSize * 1.2;

      // Get fill color
      let fillColor = 'black';
      const fill = textNode.fills?.find(f => f.visible !== false && f.type === 'SOLID');
      if (fill?.color) {
        const c = fill.color;
        fillColor = `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a * opacity})`;
      }

      ctx.save();
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = fillColor;
      ctx.textBaseline = 'top';

      // Render text line by line
      const lines = textNode.characters.split('\n');
      let currentY = y;

      for (const line of lines) {
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
      }

      ctx.restore();
    }
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
   * Toggle design grid.
   */
  setShowGrid(show: boolean): void {
    this.options.showGrid = show;
    this.render();
  }

  /**
   * Toggle rulers.
   */
  setShowRulers(show: boolean): void {
    this.options.showRulers = show;
    this.rulers?.setVisible(show);
  }

  /**
   * Dispose of the container.
   */
  dispose(): void {
    this.stopRenderLoop();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.dprMediaQuery && this.dprChangeHandler) {
      this.dprMediaQuery.removeEventListener('change', this.dprChangeHandler);
      this.dprMediaQuery = null;
      this.dprChangeHandler = null;
    }

    if (this.settingsHandler) {
      window.removeEventListener('designlibre-settings-changed', this.settingsHandler);
      this.settingsHandler = null;
    }

    if (this.rulers) {
      this.rulers.dispose();
      this.rulers = null;
    }

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
