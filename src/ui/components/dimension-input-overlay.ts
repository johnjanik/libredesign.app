/**
 * Dimension Input Overlay
 *
 * Shows a floating input field during drawing operations to allow
 * users to type exact dimensions (e.g., "200", "200x100", "200,100").
 *
 * Features:
 * - Appears when user starts typing numbers during drawing
 * - Supports single value (W=H) or WxH format
 * - Enter confirms, Escape cancels
 * - Tab toggles between width and height inputs
 */

import type { Point } from '@core/types/geometry';

/**
 * Parsed dimension values
 */
export interface DimensionValues {
  readonly width: number;
  readonly height: number;
}

/**
 * Dimension input overlay options
 */
export interface DimensionInputOverlayOptions {
  /** Callback when dimensions are confirmed */
  readonly onConfirm?: (dimensions: DimensionValues) => void;
  /** Callback when input is cancelled */
  readonly onCancel?: () => void;
  /** Callback when input changes (live preview) */
  readonly onChange?: (dimensions: DimensionValues | null) => void;
  /** Initial width value */
  readonly initialWidth?: number;
  /** Initial height value */
  readonly initialHeight?: number;
  /** Whether to constrain proportions */
  readonly constrainProportions?: boolean;
}

/**
 * DimensionInputOverlay class
 *
 * Manages a floating dimension input UI during drawing operations.
 */
export class DimensionInputOverlay {
  private element: HTMLElement | null = null;
  private widthInput: HTMLInputElement | null = null;
  private heightInput: HTMLInputElement | null = null;
  private linkButton: HTMLElement | null = null;
  private isVisible = false;
  private constrainProportions = false;
  private aspectRatio = 1;
  private currentPosition: Point = { x: 0, y: 0 };

  private onConfirm: ((dimensions: DimensionValues) => void) | null = null;
  private onCancel: (() => void) | null = null;
  private onChange: ((dimensions: DimensionValues | null) => void) | null = null;

  constructor(options: DimensionInputOverlayOptions = {}) {
    this.onConfirm = options.onConfirm ?? null;
    this.onCancel = options.onCancel ?? null;
    this.onChange = options.onChange ?? null;
    this.constrainProportions = options.constrainProportions ?? false;

    this.createElement();
  }

  private createElement(): void {
    // Create main container
    this.element = document.createElement('div');
    this.element.className = 'designlibre-dimension-input-overlay';
    this.element.style.cssText = `
      position: fixed;
      z-index: 10000;
      display: none;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-size: 12px;
      pointer-events: auto;
    `;

    // Input row container
    const inputRow = document.createElement('div');
    inputRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
    `;

    // Width input
    const widthContainer = this.createInputContainer('W');
    this.widthInput = widthContainer.querySelector('input')!;
    inputRow.appendChild(widthContainer);

    // Link button (constrain proportions)
    this.linkButton = document.createElement('button');
    this.linkButton.style.cssText = `
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: var(--designlibre-text-secondary, #a0a0a0);
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      border-radius: 2px;
      transition: all 0.15s;
    `;
    this.linkButton.innerHTML = this.constrainProportions ? '🔗' : '⛓';
    this.linkButton.title = 'Constrain proportions';
    this.linkButton.addEventListener('click', () => {
      this.toggleConstrainProportions();
    });
    inputRow.appendChild(this.linkButton);

    // Height input
    const heightContainer = this.createInputContainer('H');
    this.heightInput = heightContainer.querySelector('input')!;
    inputRow.appendChild(heightContainer);

    this.element.appendChild(inputRow);

    // Hint text
    const hint = document.createElement('div');
    hint.style.cssText = `
      font-size: 10px;
      color: var(--designlibre-text-secondary, #666);
      margin-top: 6px;
      text-align: center;
    `;
    hint.textContent = 'Enter to confirm • Esc to cancel';
    this.element.appendChild(hint);

    // Set up event listeners
    this.setupEventListeners();

    // Add to document
    document.body.appendChild(this.element);
  }

  private createInputContainer(label: string): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 2px;
    `;

    const labelEl = document.createElement('span');
    labelEl.style.cssText = `
      font-size: 10px;
      color: var(--designlibre-text-secondary, #a0a0a0);
      width: 12px;
    `;
    labelEl.textContent = label;
    container.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'number';
    input.style.cssText = `
      width: 60px;
      padding: 4px 6px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 12px;
      text-align: center;
      outline: none;
      -moz-appearance: textfield;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--designlibre-accent, #4dabff)';
      input.select();
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
    });
    container.appendChild(input);

    return container;
  }

  private setupEventListeners(): void {
    if (!this.widthInput || !this.heightInput) return;

    // Width input changes
    this.widthInput.addEventListener('input', () => {
      if (this.constrainProportions && this.widthInput && this.heightInput) {
        const width = parseFloat(this.widthInput.value) || 0;
        this.heightInput.value = String(Math.round(width / this.aspectRatio));
      }
      this.emitChange();
    });

    // Height input changes
    this.heightInput.addEventListener('input', () => {
      if (this.constrainProportions && this.widthInput && this.heightInput) {
        const height = parseFloat(this.heightInput.value) || 0;
        this.widthInput.value = String(Math.round(height * this.aspectRatio));
      }
      this.emitChange();
    });

    // Keyboard handling
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.confirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancel();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Toggle between width and height inputs
        if (document.activeElement === this.widthInput) {
          this.heightInput?.focus();
        } else {
          this.widthInput?.focus();
        }
      }
    };

    this.widthInput.addEventListener('keydown', handleKeyDown);
    this.heightInput.addEventListener('keydown', handleKeyDown);
  }

  private toggleConstrainProportions(): void {
    this.constrainProportions = !this.constrainProportions;
    if (this.linkButton) {
      this.linkButton.innerHTML = this.constrainProportions ? '🔗' : '⛓';
      this.linkButton.style.color = this.constrainProportions
        ? 'var(--designlibre-accent, #4dabff)'
        : 'var(--designlibre-text-secondary, #a0a0a0)';
    }
    // Update aspect ratio from current values
    if (this.constrainProportions && this.widthInput && this.heightInput) {
      const width = parseFloat(this.widthInput.value) || 1;
      const height = parseFloat(this.heightInput.value) || 1;
      this.aspectRatio = width / height;
    }
  }

  private emitChange(): void {
    const dimensions = this.getDimensions();
    this.onChange?.(dimensions);
  }

  private getDimensions(): DimensionValues | null {
    if (!this.widthInput || !this.heightInput) return null;

    const width = parseFloat(this.widthInput.value);
    const height = parseFloat(this.heightInput.value);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      return null;
    }

    return { width, height };
  }

  /**
   * Show the overlay at a position
   */
  show(position: Point, initialWidth?: number, initialHeight?: number): void {
    if (!this.element || !this.widthInput || !this.heightInput) return;

    this.currentPosition = position;

    // Set initial values
    if (initialWidth !== undefined) {
      this.widthInput.value = String(Math.round(initialWidth));
    }
    if (initialHeight !== undefined) {
      this.heightInput.value = String(Math.round(initialHeight));
    }

    // Calculate aspect ratio
    const w = parseFloat(this.widthInput.value) || 1;
    const h = parseFloat(this.heightInput.value) || 1;
    this.aspectRatio = w / h;

    // Position the overlay (offset from cursor)
    this.element.style.left = `${position.x + 20}px`;
    this.element.style.top = `${position.y + 20}px`;
    this.element.style.display = 'block';

    this.isVisible = true;

    // Focus width input and select all
    setTimeout(() => {
      this.widthInput?.focus();
      this.widthInput?.select();
    }, 0);
  }

  /**
   * Hide the overlay
   */
  hide(): void {
    if (!this.element) return;
    this.element.style.display = 'none';
    this.isVisible = false;
  }

  /**
   * Update overlay position (follow cursor)
   */
  updatePosition(position: Point): void {
    if (!this.element || !this.isVisible) return;
    this.currentPosition = position;
    this.element.style.left = `${position.x + 20}px`;
    this.element.style.top = `${position.y + 20}px`;
  }

  /**
   * Confirm the current dimensions
   */
  confirm(): void {
    const dimensions = this.getDimensions();
    if (dimensions) {
      this.onConfirm?.(dimensions);
    }
    this.hide();
  }

  /**
   * Cancel input
   */
  cancel(): void {
    this.onCancel?.();
    this.hide();
  }

  /**
   * Check if overlay is currently visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get the current position of the overlay
   */
  getPosition(): Point {
    return this.currentPosition;
  }

  /**
   * Set callbacks
   */
  setCallbacks(options: Pick<DimensionInputOverlayOptions, 'onConfirm' | 'onCancel' | 'onChange'>): void {
    if (options.onConfirm !== undefined) this.onConfirm = options.onConfirm ?? null;
    if (options.onCancel !== undefined) this.onCancel = options.onCancel ?? null;
    if (options.onChange !== undefined) this.onChange = options.onChange ?? null;
  }

  /**
   * Handle keyboard input to detect dimension entry
   * Returns true if the key was handled (a number key)
   */
  handleKeyPress(key: string, position: Point): boolean {
    // Check if this is a numeric key
    if (/^[0-9]$/.test(key)) {
      if (!this.isVisible) {
        // Show the overlay and start with this digit
        this.show(position, 0, 0);
        if (this.widthInput) {
          this.widthInput.value = key;
          this.widthInput.focus();
          // Move cursor to end
          this.widthInput.setSelectionRange(1, 1);
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Dispose of the overlay
   */
  dispose(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.widthInput = null;
    this.heightInput = null;
    this.linkButton = null;
  }
}

/**
 * Create a dimension input overlay instance
 */
export function createDimensionInputOverlay(options?: DimensionInputOverlayOptions): DimensionInputOverlay {
  return new DimensionInputOverlay(options);
}

/**
 * Parse a dimension string (e.g., "200", "200x100", "200,100")
 */
export function parseDimensionString(input: string): DimensionValues | null {
  const trimmed = input.trim();

  // Single number - use for both width and height
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const value = parseFloat(trimmed);
    if (value > 0) {
      return { width: value, height: value };
    }
  }

  // WxH format
  const xMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)$/);
  if (xMatch) {
    const width = parseFloat(xMatch[1]!);
    const height = parseFloat(xMatch[2]!);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  // W,H format
  const commaMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)$/);
  if (commaMatch) {
    const width = parseFloat(commaMatch[1]!);
    const height = parseFloat(commaMatch[2]!);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  return null;
}
