/**
 * Dynamic Input Component
 *
 * Floating input field that appears near the cursor during drawing operations.
 * Provides CAD-style numeric input for precise drawing:
 * - Coordinate entry (x,y or @x,y for relative)
 * - Polar coordinates (distance<angle)
 * - Dimension entry (width, height, radius)
 * - Tab to switch between fields
 * - Enter to confirm
 */

import {
  parseCoordinate,
  parseDimension,
  parseSize,
  type ParsedCoordinate,
  type CoordinateParserOptions,
} from '@core/input/coordinate-parser';
import type { Point } from '@core/types/geometry';

/**
 * Input mode for dynamic input
 */
export type DynamicInputMode =
  | 'coordinate'    // X,Y input
  | 'dimension'     // Single value (radius, length)
  | 'size'          // Width x Height
  | 'angle'         // Angle input
  | 'distance';     // Distance input

/**
 * Dynamic input field configuration
 */
export interface DynamicInputField {
  /** Field label */
  readonly label: string;
  /** Field placeholder */
  readonly placeholder: string;
  /** Current value */
  value: string;
  /** Whether this field is active */
  active: boolean;
}

/**
 * Dynamic input options
 */
export interface DynamicInputOptions {
  /** Input mode */
  readonly mode?: DynamicInputMode;
  /** Initial position (screen coordinates) */
  readonly position?: Point;
  /** Offset from cursor */
  readonly offset?: Point;
  /** Parser options */
  readonly parserOptions?: CoordinateParserOptions;
  /** Show immediately */
  readonly autoShow?: boolean;
  /** Custom fields */
  readonly fields?: DynamicInputField[];
}

/**
 * Dynamic input result
 */
export interface DynamicInputResult {
  /** Whether input was confirmed */
  readonly confirmed: boolean;
  /** Parsed coordinate (if mode is coordinate) */
  readonly coordinate?: ParsedCoordinate;
  /** Parsed dimension (if mode is dimension) */
  readonly dimension?: number;
  /** Parsed size (if mode is size) */
  readonly size?: { width: number; height: number };
  /** Raw field values */
  readonly values: Record<string, string>;
}

/**
 * Dynamic Input Component
 */
export class DynamicInput {
  private container: HTMLElement | null = null;
  private fields: DynamicInputField[] = [];
  private mode: DynamicInputMode = 'coordinate';
  private parserOptions: CoordinateParserOptions = {};
  private visible = false;

  // Callbacks
  private onConfirm?: (result: DynamicInputResult) => void;
  private onCancel?: () => void;
  private onValueChange?: (values: Record<string, string>) => void;

  constructor(options: DynamicInputOptions = {}) {
    this.mode = options.mode ?? 'coordinate';
    this.parserOptions = options.parserOptions ?? {};

    if (options.fields) {
      this.fields = options.fields;
    } else {
      this.initDefaultFields();
    }

    if (options.autoShow) {
      this.show(options.position ?? { x: 100, y: 100 });
    }
  }

  /**
   * Initialize default fields based on mode
   */
  private initDefaultFields(): void {
    switch (this.mode) {
      case 'coordinate':
        this.fields = [
          { label: 'X', placeholder: '0', value: '', active: true },
          { label: 'Y', placeholder: '0', value: '', active: false },
        ];
        break;
      case 'dimension':
        this.fields = [
          { label: 'Value', placeholder: '0', value: '', active: true },
        ];
        break;
      case 'size':
        this.fields = [
          { label: 'W', placeholder: '100', value: '', active: true },
          { label: 'H', placeholder: '100', value: '', active: false },
        ];
        break;
      case 'angle':
        this.fields = [
          { label: 'Angle', placeholder: '0°', value: '', active: true },
        ];
        break;
      case 'distance':
        this.fields = [
          { label: 'Distance', placeholder: '0', value: '', active: true },
        ];
        break;
    }
  }

  /**
   * Set callbacks
   */
  setOnConfirm(callback: (result: DynamicInputResult) => void): void {
    this.onConfirm = callback;
  }

  setOnCancel(callback: () => void): void {
    this.onCancel = callback;
  }

  setOnValueChange(callback: (values: Record<string, string>) => void): void {
    this.onValueChange = callback;
  }

  /**
   * Set reference point for relative coordinates
   * (Reserved for future use with relative coordinate parsing)
   */
  setReferencePoint(_point: Point): void {
    // Reserved for future relative coordinate support
  }

  /**
   * Show the input at a position
   */
  show(position: Point): void {
    if (!this.container) {
      this.createContainer();
    }

    if (this.container) {
      this.container.style.left = `${position.x + 20}px`;
      this.container.style.top = `${position.y + 20}px`;
      this.container.style.display = 'flex';
      this.visible = true;

      // Focus first input
      this.focusField(0);
    }
  }

  /**
   * Hide the input
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.visible = false;
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Update position
   */
  updatePosition(position: Point): void {
    if (this.container && this.visible) {
      this.container.style.left = `${position.x + 20}px`;
      this.container.style.top = `${position.y + 20}px`;
    }
  }

  /**
   * Set mode and reinitialize fields
   */
  setMode(mode: DynamicInputMode): void {
    this.mode = mode;
    this.initDefaultFields();
    if (this.container) {
      this.updateContainerContent();
    }
  }

  /**
   * Get current values
   */
  getValues(): Record<string, string> {
    const values: Record<string, string> = {};
    for (const field of this.fields) {
      values[field.label] = field.value;
    }
    return values;
  }

  /**
   * Set a field value
   */
  setFieldValue(label: string, value: string): void {
    const field = this.fields.find(f => f.label === label);
    if (field) {
      field.value = value;
      this.updateFieldInput(field);
    }
  }

  /**
   * Create the container element
   */
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = 'dynamic-input';
    this.container.style.cssText = `
      position: fixed;
      display: none;
      flex-direction: row;
      align-items: center;
      gap: 4px;
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
      padding: 4px 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      color: #cccccc;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 10000;
      user-select: none;
    `;

    this.updateContainerContent();
    document.body.appendChild(this.container);

    // Global keyboard handler
    document.addEventListener('keydown', this.handleGlobalKeydown);
  }

  /**
   * Update container content based on fields
   */
  private updateContainerContent(): void {
    if (!this.container) return;

    this.container.innerHTML = '';

    for (let i = 0; i < this.fields.length; i++) {
      const field = this.fields[i]!;

      // Label
      const label = document.createElement('span');
      label.textContent = field.label + ':';
      label.style.cssText = `
        color: #888888;
        font-size: 11px;
        margin-right: 2px;
      `;
      this.container.appendChild(label);

      // Input
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = field.placeholder;
      input.value = field.value;
      input.dataset['fieldIndex'] = String(i);
      input.style.cssText = `
        width: 60px;
        background: #2d2d2d;
        border: 1px solid ${field.active ? '#0078d4' : '#3c3c3c'};
        border-radius: 3px;
        padding: 3px 6px;
        color: #ffffff;
        font-size: 12px;
        font-family: monospace;
        outline: none;
      `;

      input.addEventListener('input', () => this.handleInput(i, input.value));
      input.addEventListener('focus', () => this.handleFocus(i));
      input.addEventListener('keydown', (e) => this.handleKeydown(e, i));

      this.container.appendChild(input);

      // Separator (except last)
      if (i < this.fields.length - 1) {
        const sep = document.createElement('span');
        sep.textContent = ',';
        sep.style.cssText = 'color: #666666; margin: 0 2px;';
        this.container.appendChild(sep);
      }
    }

    // Hint text
    const hint = document.createElement('span');
    hint.textContent = 'Enter';
    hint.style.cssText = `
      color: #666666;
      font-size: 10px;
      margin-left: 8px;
      padding: 2px 4px;
      background: #2d2d2d;
      border-radius: 2px;
    `;
    this.container.appendChild(hint);
  }

  /**
   * Update a specific field's input element
   */
  private updateFieldInput(field: DynamicInputField): void {
    if (!this.container) return;

    const index = this.fields.indexOf(field);
    const input = this.container.querySelector(`input[data-field-index="${index}"]`) as HTMLInputElement | null;
    if (input) {
      input.value = field.value;
    }
  }

  /**
   * Handle input change
   */
  private handleInput(index: number, value: string): void {
    const field = this.fields[index];
    if (field) {
      field.value = value;
      this.onValueChange?.(this.getValues());
    }
  }

  /**
   * Handle focus
   */
  private handleFocus(index: number): void {
    for (let i = 0; i < this.fields.length; i++) {
      this.fields[i]!.active = i === index;
    }
    this.updateFieldStyles();
  }

  /**
   * Handle keydown in input
   */
  private handleKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const nextIndex = event.shiftKey
        ? (index - 1 + this.fields.length) % this.fields.length
        : (index + 1) % this.fields.length;
      this.focusField(nextIndex);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.confirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    }
  }

  /**
   * Handle global keydown (for when input might not be focused)
   */
  private handleGlobalKeydown = (event: KeyboardEvent): void => {
    if (!this.visible) return;

    if (event.key === 'Escape') {
      this.cancel();
    }
  };

  /**
   * Focus a specific field
   */
  private focusField(index: number): void {
    if (!this.container) return;

    const input = this.container.querySelector(`input[data-field-index="${index}"]`) as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.select();
    }
  }

  /**
   * Update field styles based on active state
   */
  private updateFieldStyles(): void {
    if (!this.container) return;

    const inputs = this.container.querySelectorAll('input');
    inputs.forEach((input, i) => {
      const field = this.fields[i];
      if (field) {
        input.style.borderColor = field.active ? '#0078d4' : '#3c3c3c';
      }
    });
  }

  /**
   * Confirm input
   */
  private confirm(): void {
    const values = this.getValues();
    let result: DynamicInputResult;

    switch (this.mode) {
      case 'coordinate': {
        const inputStr = `${values['X'] || '0'},${values['Y'] || '0'}`;
        const parsed = parseCoordinate(inputStr, this.parserOptions);
        result = {
          confirmed: true,
          coordinate: parsed,
          values,
        };
        break;
      }
      case 'dimension': {
        const inputStr = values['Value'] || '0';
        const parsed = parseDimension(inputStr, this.parserOptions);
        result = {
          confirmed: true,
          dimension: parsed.success ? parsed.value : 0,
          values,
        };
        break;
      }
      case 'size': {
        const inputStr = `${values['W'] || '0'},${values['H'] || '0'}`;
        const parsed = parseSize(inputStr, this.parserOptions);
        result = {
          confirmed: true,
          ...(parsed.success ? { size: { width: parsed.width, height: parsed.height } } : {}),
          values,
        };
        break;
      }
      case 'angle': {
        const angleStr = values['Angle'] || '0';
        const parsed = parseDimension(angleStr, this.parserOptions);
        result = {
          confirmed: true,
          dimension: parsed.success ? parsed.value : 0,
          values,
        };
        break;
      }
      case 'distance': {
        const distStr = values['Distance'] || '0';
        const parsed = parseDimension(distStr, this.parserOptions);
        result = {
          confirmed: true,
          dimension: parsed.success ? parsed.value : 0,
          values,
        };
        break;
      }
      default:
        result = { confirmed: true, values };
    }

    this.hide();
    this.onConfirm?.(result);
  }

  /**
   * Cancel input
   */
  private cancel(): void {
    this.hide();
    this.onCancel?.();
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleGlobalKeydown);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }
}

/**
 * Create a dynamic input instance
 */
export function createDynamicInput(options?: DynamicInputOptions): DynamicInput {
  return new DynamicInput(options);
}
