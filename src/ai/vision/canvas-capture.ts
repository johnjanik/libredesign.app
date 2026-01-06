/**
 * Canvas Capture
 *
 * Captures the canvas for AI vision analysis with multi-resolution support.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';

/**
 * Capture options
 */
export interface CaptureOptions {
  /** Maximum width for the captured image */
  maxWidth?: number;
  /** Maximum height for the captured image */
  maxHeight?: number;
  /** Image format */
  format?: 'png' | 'jpeg' | 'webp';
  /** JPEG/WebP quality (0-1) */
  quality?: number;
  /** Include selection highlights */
  includeSelection?: boolean;
  /** Include origin crosshair */
  includeOrigin?: boolean;
  /** Scale factor for high-DPI capture */
  scaleFactor?: number;
}

/**
 * Multi-resolution capture presets
 */
export interface MultiResolutionPreset {
  /** Name of this resolution tier */
  name: string;
  /** Maximum dimension */
  maxDimension: number;
  /** Quality (0-1) */
  quality: number;
  /** Format */
  format: 'png' | 'jpeg' | 'webp';
}

/**
 * Default multi-resolution presets
 */
export const DEFAULT_RESOLUTION_PRESETS: MultiResolutionPreset[] = [
  { name: 'thumbnail', maxDimension: 256, quality: 0.8, format: 'png' },
  { name: 'standard', maxDimension: 1024, quality: 0.9, format: 'png' },
  { name: 'full', maxDimension: 1920, quality: 1.0, format: 'png' },
  { name: 'highRes', maxDimension: 4096, quality: 1.0, format: 'png' },
];

/**
 * Multi-resolution capture result
 */
export interface MultiResolutionResult {
  /** Results keyed by preset name */
  resolutions: Record<string, CaptureResult>;
  /** Capture timestamp */
  timestamp: number;
  /** Total capture time (ms) */
  captureTimeMs: number;
}

/**
 * Capture result
 */
export interface CaptureResult {
  /** Base64 encoded image data (without data URL prefix) */
  base64: string;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** Image format */
  format: 'png' | 'jpeg' | 'webp';
  /** Media type for API requests */
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Viewport state at capture time */
  viewport: {
    zoom: number;
    offsetX: number;
    offsetY: number;
    canvasWidth: number;
    canvasHeight: number;
  };
}

/**
 * Canvas Capture class
 */
export class CanvasCapture {
  private runtime: DesignLibreRuntime;

  constructor(runtime: DesignLibreRuntime) {
    this.runtime = runtime;
  }

  /**
   * Capture the current canvas state.
   */
  async capture(options: CaptureOptions = {}): Promise<CaptureResult> {
    const {
      maxWidth = 1024,
      maxHeight = 1024,
      format = 'png',
      quality = 0.9,
    } = options;

    // Get the canvas element
    const canvas = this.getCanvas();
    if (!canvas) {
      throw new Error('Canvas not available');
    }

    // Get viewport state
    const viewport = this.runtime.getViewport();
    const viewportState = {
      zoom: viewport?.getZoom() ?? 1,
      offsetX: viewport?.getOffset().x ?? 0,
      offsetY: viewport?.getOffset().y ?? 0,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };

    // Calculate scale to fit within max dimensions
    const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height, 1);
    const targetWidth = Math.round(canvas.width * scale);
    const targetHeight = Math.round(canvas.height * scale);

    // Create a temporary canvas for resizing if needed
    let outputCanvas: HTMLCanvasElement;

    if (scale < 1) {
      outputCanvas = document.createElement('canvas');
      outputCanvas.width = targetWidth;
      outputCanvas.height = targetHeight;

      const ctx = outputCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to create canvas context');
      }

      // Use high-quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    } else {
      outputCanvas = canvas;
    }

    // Convert to data URL
    const mimeType = this.getMimeType(format);
    const dataUrl = outputCanvas.toDataURL(mimeType, quality);

    // Extract base64 data (remove "data:image/png;base64," prefix)
    const base64 = dataUrl.split(',')[1] ?? '';

    return {
      base64,
      width: targetWidth,
      height: targetHeight,
      format,
      mediaType: mimeType,
      viewport: viewportState,
    };
  }

  /**
   * Capture a specific region of the canvas.
   */
  async captureRegion(
    x: number,
    y: number,
    width: number,
    height: number,
    options: CaptureOptions = {}
  ): Promise<CaptureResult> {
    const { format = 'png', quality = 0.9 } = options;

    const canvas = this.getCanvas();
    if (!canvas) {
      throw new Error('Canvas not available');
    }

    const viewport = this.runtime.getViewport();
    if (!viewport) {
      throw new Error('Viewport not available');
    }

    // Convert world coordinates to canvas coordinates
    const topLeft = viewport.worldToCanvas(x, y);
    const bottomRight = viewport.worldToCanvas(x + width, y + height);

    const canvasX = Math.max(0, Math.floor(topLeft.x));
    const canvasY = Math.max(0, Math.floor(topLeft.y));
    const canvasWidth = Math.min(canvas.width - canvasX, Math.ceil(bottomRight.x - topLeft.x));
    const canvasHeight = Math.min(canvas.height - canvasY, Math.ceil(bottomRight.y - topLeft.y));

    // Create a temporary canvas for the region
    const regionCanvas = document.createElement('canvas');
    regionCanvas.width = canvasWidth;
    regionCanvas.height = canvasHeight;

    const ctx = regionCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    ctx.drawImage(
      canvas,
      canvasX,
      canvasY,
      canvasWidth,
      canvasHeight,
      0,
      0,
      canvasWidth,
      canvasHeight
    );

    const mimeType = this.getMimeType(format);
    const dataUrl = regionCanvas.toDataURL(mimeType, quality);
    const base64 = dataUrl.split(',')[1] ?? '';

    return {
      base64,
      width: canvasWidth,
      height: canvasHeight,
      format,
      mediaType: mimeType,
      viewport: {
        zoom: viewport.getZoom(),
        offsetX: viewport.getOffset().x,
        offsetY: viewport.getOffset().y,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
      },
    };
  }

  /**
   * Get a description of what's visible on the canvas.
   */
  getVisibleBoundsDescription(): string {
    const viewport = this.runtime.getViewport();
    if (!viewport) {
      return 'Viewport not available';
    }

    const bounds = viewport.getVisibleBounds();
    const zoom = viewport.getZoom();

    return `Visible area: (${Math.round(bounds.minX)}, ${Math.round(bounds.minY)}) to (${Math.round(bounds.maxX)}, ${Math.round(bounds.maxY)}) at ${Math.round(zoom * 100)}% zoom`;
  }

  /**
   * Capture at multiple resolutions in a single call.
   * Optimized to reuse the source canvas data.
   */
  async captureMultiResolution(
    presets: MultiResolutionPreset[] = DEFAULT_RESOLUTION_PRESETS
  ): Promise<MultiResolutionResult> {
    const startTime = performance.now();
    const timestamp = Date.now();

    const canvas = this.getCanvas();
    if (!canvas) {
      throw new Error('Canvas not available');
    }

    const viewport = this.runtime.getViewport();
    const viewportState = {
      zoom: viewport?.getZoom() ?? 1,
      offsetX: viewport?.getOffset().x ?? 0,
      offsetY: viewport?.getOffset().y ?? 0,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };

    const resolutions: Record<string, CaptureResult> = {};

    // Sort presets by size (largest first) for efficient resampling
    const sortedPresets = [...presets].sort(
      (a, b) => b.maxDimension - a.maxDimension
    );

    // Create a high-quality source canvas at the largest resolution needed
    const largestPreset = sortedPresets[0];
    const sourceScale = Math.min(
      largestPreset.maxDimension / canvas.width,
      largestPreset.maxDimension / canvas.height,
      1
    );
    const sourceWidth = Math.round(canvas.width * sourceScale);
    const sourceHeight = Math.round(canvas.height * sourceScale);

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = sourceWidth;
    sourceCanvas.height = sourceHeight;

    const sourceCtx = sourceCanvas.getContext('2d');
    if (!sourceCtx) {
      throw new Error('Failed to create source canvas context');
    }

    sourceCtx.imageSmoothingEnabled = true;
    sourceCtx.imageSmoothingQuality = 'high';
    sourceCtx.drawImage(canvas, 0, 0, sourceWidth, sourceHeight);

    // Generate each resolution from the source
    for (const preset of sortedPresets) {
      const scale = Math.min(
        preset.maxDimension / sourceWidth,
        preset.maxDimension / sourceHeight,
        1
      );
      const targetWidth = Math.round(sourceWidth * scale);
      const targetHeight = Math.round(sourceHeight * scale);

      let outputCanvas: HTMLCanvasElement;

      if (scale < 1) {
        outputCanvas = document.createElement('canvas');
        outputCanvas.width = targetWidth;
        outputCanvas.height = targetHeight;

        const ctx = outputCanvas.getContext('2d');
        if (!ctx) {
          throw new Error(`Failed to create canvas for ${preset.name}`);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
      } else {
        outputCanvas = sourceCanvas;
      }

      const mimeType = this.getMimeType(preset.format);
      const dataUrl = outputCanvas.toDataURL(mimeType, preset.quality);
      const base64 = dataUrl.split(',')[1] ?? '';

      resolutions[preset.name] = {
        base64,
        width: targetWidth,
        height: targetHeight,
        format: preset.format,
        mediaType: mimeType,
        viewport: viewportState,
      };
    }

    return {
      resolutions,
      timestamp,
      captureTimeMs: performance.now() - startTime,
    };
  }

  /**
   * Capture a specific frame or artboard by ID.
   * Zooms to fit the frame and captures it.
   */
  async captureFrame(
    frameId: string,
    options: CaptureOptions = {}
  ): Promise<CaptureResult> {
    const { maxWidth = 1024, maxHeight = 1024, format = 'png', quality = 0.9 } = options;

    const sceneGraph = this.runtime.getSceneGraph?.();
    const viewport = this.runtime.getViewport?.();

    if (!sceneGraph || !viewport) {
      throw new Error('SceneGraph or Viewport not available');
    }

    // Find the frame
    const frame = sceneGraph.getNodeById?.(frameId);
    if (!frame) {
      throw new Error(`Frame not found: ${frameId}`);
    }

    // Get frame bounds
    const bounds = frame.getBounds?.() ?? {
      x: frame.x ?? 0,
      y: frame.y ?? 0,
      width: frame.width ?? 100,
      height: frame.height ?? 100,
    };

    // Save current viewport state
    const savedZoom = viewport.getZoom();
    const savedOffset = viewport.getOffset();

    try {
      // Zoom to fit the frame with padding
      const padding = 20;
      viewport.zoomToFit?.(
        bounds.x - padding,
        bounds.y - padding,
        bounds.width + padding * 2,
        bounds.height + padding * 2
      );

      // Wait for render
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 50));

      // Capture
      return await this.capture({ maxWidth, maxHeight, format, quality });
    } finally {
      // Restore viewport
      viewport.setZoom?.(savedZoom);
      viewport.setOffset?.(savedOffset.x, savedOffset.y);
    }
  }

  /**
   * Capture with high DPI support.
   * Returns image at specified scale factor (e.g., 2x for retina).
   */
  async captureHighDPI(
    scaleFactor: number = window.devicePixelRatio ?? 2,
    options: CaptureOptions = {}
  ): Promise<CaptureResult> {
    const { maxWidth = 1024, maxHeight = 1024, format = 'png', quality = 0.9 } = options;

    const canvas = this.getCanvas();
    if (!canvas) {
      throw new Error('Canvas not available');
    }

    const viewport = this.runtime.getViewport();
    const viewportState = {
      zoom: viewport?.getZoom() ?? 1,
      offsetX: viewport?.getOffset().x ?? 0,
      offsetY: viewport?.getOffset().y ?? 0,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };

    // Target dimensions at the specified DPI
    const targetWidth = Math.min(canvas.width * scaleFactor, maxWidth * scaleFactor);
    const targetHeight = Math.min(canvas.height * scaleFactor, maxHeight * scaleFactor);

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(scaleFactor, scaleFactor);
    ctx.drawImage(canvas, 0, 0);

    const mimeType = this.getMimeType(format);
    const dataUrl = outputCanvas.toDataURL(mimeType, quality);
    const base64 = dataUrl.split(',')[1] ?? '';

    return {
      base64,
      width: targetWidth,
      height: targetHeight,
      format,
      mediaType: mimeType,
      viewport: viewportState,
    };
  }

  /**
   * Capture all frames/artboards as separate images.
   */
  async captureAllFrames(
    options: CaptureOptions = {}
  ): Promise<Map<string, CaptureResult>> {
    const sceneGraph = this.runtime.getSceneGraph?.();
    if (!sceneGraph) {
      throw new Error('SceneGraph not available');
    }

    const results = new Map<string, CaptureResult>();

    // Get all frame nodes
    const frames = sceneGraph.getNodesByType?.('FRAME') ?? [];

    for (const frame of frames) {
      const frameId = frame.id ?? frame.getId?.();
      if (frameId) {
        try {
          const capture = await this.captureFrame(frameId, options);
          results.set(frameId, capture);
        } catch (error) {
          console.warn(`Failed to capture frame ${frameId}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Get the canvas element.
   */
  private getCanvas(): HTMLCanvasElement | null {
    // Try to access canvas through the runtime
    // The canvas is typically stored in the renderer or canvas container
    const renderer = this.runtime.getRenderer?.() as unknown;
    if (renderer && typeof renderer === 'object' && 'canvas' in renderer) {
      return (renderer as { canvas: HTMLCanvasElement }).canvas;
    }

    // Fallback: try to find canvas in DOM
    const container = document.querySelector('.designlibre-canvas-container canvas');
    if (container instanceof HTMLCanvasElement) {
      return container;
    }

    // Another fallback: main canvas
    const mainCanvas = document.querySelector('canvas#designlibre-canvas');
    if (mainCanvas instanceof HTMLCanvasElement) {
      return mainCanvas;
    }

    return null;
  }

  private getMimeType(format: 'png' | 'jpeg' | 'webp'): 'image/png' | 'image/jpeg' | 'image/webp' {
    switch (format) {
      case 'jpeg':
        return 'image/jpeg';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/png';
    }
  }
}

/**
 * Create a canvas capture instance.
 */
export function createCanvasCapture(runtime: DesignLibreRuntime): CanvasCapture {
  return new CanvasCapture(runtime);
}
