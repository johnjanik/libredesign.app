/**
 * Image Tool
 *
 * Places image/video elements by clicking on the canvas.
 * Opens a file picker to select an image or video file.
 */

import type { Point } from '@core/types/geometry';
import type { NodeId } from '@core/types/common';
import { BaseTool, type ToolContext, type PointerEventData, type ToolCursor } from '../base/tool';

/**
 * Image tool options
 */
export interface ImageToolOptions {
  /** Default image width */
  readonly defaultWidth?: number;
  /** Default image height */
  readonly defaultHeight?: number;
  /** Accepted file types */
  readonly acceptedTypes?: string;
}

const DEFAULT_OPTIONS: Required<ImageToolOptions> = {
  defaultWidth: 200,
  defaultHeight: 200,
  acceptedTypes: 'image/*,video/*',
};

/**
 * Image placement data
 */
export interface ImagePlacementData {
  /** Position where the image should be placed */
  readonly position: Point;
  /** File that was selected */
  readonly file: File;
  /** Image dimensions (if loaded) */
  readonly naturalWidth?: number;
  readonly naturalHeight?: number;
  /** Data URL of the image */
  readonly dataUrl: string;
}

/**
 * Image tool for placing images/videos
 */
export class ImageTool extends BaseTool {
  readonly name = 'image';
  cursor: ToolCursor = 'crosshair';

  private options: Required<ImageToolOptions>;
  private pendingPosition: Point | null = null;
  private createdNodeId: NodeId | null = null;
  private fileInput: HTMLInputElement | null = null;

  // Callbacks
  private onImagePlace?: (data: ImagePlacementData) => NodeId | null;

  constructor(options: ImageToolOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Set callback for when image is placed.
   */
  setOnImagePlace(callback: (data: ImagePlacementData) => NodeId | null): void {
    this.onImagePlace = callback;
  }

  override activate(context: ToolContext): void {
    super.activate(context);
    this.pendingPosition = null;
  }

  override deactivate(): void {
    this.pendingPosition = null;
    this.cleanupFileInput();
    super.deactivate();
  }

  override onPointerDown(event: PointerEventData, _context: ToolContext): boolean {
    // Store the click position
    this.pendingPosition = { x: event.worldX, y: event.worldY };

    // Open file picker
    this.openFilePicker();

    return true;
  }

  /**
   * Create and open file picker.
   */
  private openFilePicker(): void {
    this.cleanupFileInput();

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = this.options.acceptedTypes;
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);

    this.fileInput.addEventListener('change', this.handleFileSelect);
    this.fileInput.click();
  }

  /**
   * Handle file selection.
   */
  private handleFileSelect = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || !this.pendingPosition) {
      this.cleanupFileInput();
      return;
    }

    try {
      // Read file as data URL
      const dataUrl = await this.readFileAsDataUrl(file);

      // Get image dimensions
      let naturalWidth = this.options.defaultWidth;
      let naturalHeight = this.options.defaultHeight;

      if (file.type.startsWith('image/')) {
        const dimensions = await this.getImageDimensions(dataUrl);
        naturalWidth = dimensions.width;
        naturalHeight = dimensions.height;
      }

      // Call the callback
      if (this.onImagePlace) {
        this.createdNodeId = this.onImagePlace({
          position: this.pendingPosition,
          file,
          naturalWidth,
          naturalHeight,
          dataUrl,
        });
      }
    } catch (err) {
      console.error('Failed to load image:', err);
    } finally {
      this.pendingPosition = null;
      this.cleanupFileInput();
    }
  };

  /**
   * Read file as data URL.
   */
  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get image dimensions from data URL.
   */
  private getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  /**
   * Cleanup file input element.
   */
  private cleanupFileInput(): void {
    if (this.fileInput) {
      this.fileInput.removeEventListener('change', this.handleFileSelect);
      this.fileInput.remove();
      this.fileInput = null;
    }
  }

  /**
   * Get the ID of the last created node.
   */
  getCreatedNodeId(): NodeId | null {
    return this.createdNodeId;
  }
}

/**
 * Create an image tool.
 */
export function createImageTool(options?: ImageToolOptions): ImageTool {
  return new ImageTool(options);
}
