/**
 * Tool Options Panel
 *
 * Floating panel that shows context-sensitive options for the active tool.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';

/**
 * Tool options configuration
 */
interface ToolOptionConfig {
  id: string;
  label: string;
  type: 'number' | 'select' | 'checkbox';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  default: number | string | boolean;
}

/**
 * Tool-specific options definitions
 */
const TOOL_OPTIONS: Record<string, ToolOptionConfig[]> = {
  fillet: [
    { id: 'radius', label: 'Radius', type: 'number', min: 1, max: 100, step: 1, default: 10 },
  ],
  chamfer: [
    { id: 'distance1', label: 'Distance 1', type: 'number', min: 1, max: 100, step: 1, default: 10 },
    { id: 'distance2', label: 'Distance 2', type: 'number', min: 1, max: 100, step: 1, default: 10 },
    {
      id: 'mode',
      label: 'Mode',
      type: 'select',
      options: [
        { value: 'equal', label: 'Equal' },
        { value: 'asymmetric', label: 'Asymmetric' },
      ],
      default: 'equal',
    },
  ],
  array: [
    {
      id: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'rectangular', label: 'Rectangular' },
        { value: 'polar', label: 'Polar' },
      ],
      default: 'rectangular',
    },
    { id: 'rows', label: 'Rows', type: 'number', min: 1, max: 20, step: 1, default: 3 },
    { id: 'columns', label: 'Columns', type: 'number', min: 1, max: 20, step: 1, default: 3 },
    { id: 'spacingX', label: 'Spacing X', type: 'number', min: 0, max: 500, step: 10, default: 50 },
    { id: 'spacingY', label: 'Spacing Y', type: 'number', min: 0, max: 500, step: 10, default: 50 },
  ],
  'track-routing': [
    { id: 'width', label: 'Track Width', type: 'number', min: 0.1, max: 10, step: 0.1, default: 0.25 },
    {
      id: 'mode',
      label: 'Routing Mode',
      type: 'select',
      options: [
        { value: '45degree', label: '45 Degree' },
        { value: 'orthogonal', label: 'Orthogonal' },
        { value: 'any_angle', label: 'Any Angle' },
      ],
      default: '45degree',
    },
  ],
  via: [
    { id: 'drill', label: 'Drill Size', type: 'number', min: 0.1, max: 2, step: 0.05, default: 0.3 },
    { id: 'diameter', label: 'Diameter', type: 'number', min: 0.2, max: 3, step: 0.05, default: 0.6 },
  ],
  polygon: [
    { id: 'sides', label: 'Sides', type: 'number', min: 3, max: 12, step: 1, default: 5 },
  ],
  star: [
    { id: 'points', label: 'Points', type: 'number', min: 3, max: 12, step: 1, default: 5 },
    { id: 'innerRadius', label: 'Inner Radius', type: 'number', min: 0.1, max: 0.9, step: 0.1, default: 0.5 },
  ],
  hatch: [
    {
      id: 'pattern',
      label: 'Pattern',
      type: 'select',
      options: [
        { value: 'lines', label: 'Lines' },
        { value: 'crosshatch', label: 'Crosshatch' },
        { value: 'dots', label: 'Dots' },
        { value: 'solid', label: 'Solid' },
      ],
      default: 'lines',
    },
    { id: 'angle', label: 'Angle', type: 'number', min: 0, max: 360, step: 15, default: 45 },
    { id: 'scale', label: 'Scale', type: 'number', min: 0.1, max: 5, step: 0.1, default: 1 },
  ],
  'construction-line': [
    {
      id: 'mode',
      label: 'Mode',
      type: 'select',
      options: [
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'vertical', label: 'Vertical' },
        { value: 'angle', label: 'At Angle' },
        { value: 'twoPoint', label: 'Two Point' },
      ],
      default: 'twoPoint',
    },
    { id: 'angle', label: 'Angle', type: 'number', min: 0, max: 360, step: 5, default: 0 },
  ],
  wire: [
    {
      id: 'mode',
      label: 'Routing',
      type: 'select',
      options: [
        { value: 'orthogonal', label: 'Orthogonal' },
        { value: 'diagonal', label: 'Diagonal' },
        { value: 'free', label: 'Free' },
      ],
      default: 'orthogonal',
    },
  ],
};

/**
 * Tool Options Panel
 */
export class ToolOptionsPanel {
  private runtime: DesignLibreRuntime;
  private element: HTMLElement | null = null;
  private currentTool: string | null = null;
  private values: Map<string, number | string | boolean> = new Map();

  constructor(runtime: DesignLibreRuntime) {
    this.runtime = runtime;
    this.setup();
  }

  private setup(): void {
    // Create panel element
    this.element = document.createElement('div');
    this.element.className = 'designlibre-tool-options-panel';
    this.element.style.cssText = `
      position: absolute;
      top: 12px;
      left: 70px;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      padding: 8px 12px;
      box-shadow: var(--designlibre-shadow, 0 4px 12px rgba(0, 0, 0, 0.4));
      z-index: 99;
      display: none;
      min-width: 180px;
    `;

    document.body.appendChild(this.element);

    // Listen for tool changes
    this.runtime.on('tool:changed', ({ tool }) => {
      this.onToolChanged(tool);
    });
  }

  private onToolChanged(toolName: string): void {
    const options = TOOL_OPTIONS[toolName];

    if (!options || options.length === 0) {
      this.hide();
      return;
    }

    this.currentTool = toolName;
    this.render(options);
    this.show();
  }

  private render(options: ToolOptionConfig[]): void {
    if (!this.element) return;

    this.element.innerHTML = '';

    // Tool name header
    const header = document.createElement('div');
    header.style.cssText = `
      font-size: 11px;
      font-weight: 600;
      color: var(--designlibre-text-secondary, #a0a0a0);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    header.textContent = this.currentTool?.replace(/-/g, ' ') ?? 'Options';
    this.element.appendChild(header);

    // Options grid
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 6px 12px;
      align-items: center;
    `;

    for (const option of options) {
      // Label
      const label = document.createElement('label');
      label.style.cssText = `
        font-size: 12px;
        color: var(--designlibre-text-primary, #e4e4e4);
      `;
      label.textContent = option.label;
      grid.appendChild(label);

      // Input
      const input = this.createInput(option);
      grid.appendChild(input);
    }

    this.element.appendChild(grid);
  }

  private createInput(option: ToolOptionConfig): HTMLElement {
    const currentValue = this.values.get(option.id) ?? option.default;

    if (option.type === 'number') {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = String(option.min ?? 0);
      input.max = String(option.max ?? 100);
      input.step = String(option.step ?? 1);
      input.value = String(currentValue);
      input.style.cssText = `
        width: 70px;
        padding: 4px 6px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: 12px;
      `;

      input.addEventListener('change', () => {
        const value = parseFloat(input.value);
        this.values.set(option.id, value);
        this.applyOption(option.id, value);
      });

      return input;
    }

    if (option.type === 'select') {
      const select = document.createElement('select');
      select.style.cssText = `
        width: 100%;
        padding: 4px 6px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: 12px;
      `;

      for (const opt of option.options ?? []) {
        const optEl = document.createElement('option');
        optEl.value = opt.value;
        optEl.textContent = opt.label;
        if (opt.value === currentValue) {
          optEl.selected = true;
        }
        select.appendChild(optEl);
      }

      select.addEventListener('change', () => {
        this.values.set(option.id, select.value);
        this.applyOption(option.id, select.value);
      });

      return select;
    }

    if (option.type === 'checkbox') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = currentValue as boolean;
      checkbox.style.cssText = `
        width: 16px;
        height: 16px;
        cursor: pointer;
      `;

      checkbox.addEventListener('change', () => {
        this.values.set(option.id, checkbox.checked);
        this.applyOption(option.id, checkbox.checked);
      });

      return checkbox;
    }

    // Fallback
    const span = document.createElement('span');
    span.textContent = String(currentValue);
    return span;
  }

  private applyOption(optionId: string, value: number | string | boolean): void {
    // Apply option to the current tool
    switch (this.currentTool) {
      case 'fillet':
        if (optionId === 'radius') {
          const filletTool = this.runtime.getFilletTool?.();
          filletTool?.setRadius?.(value as number);
        }
        break;

      case 'chamfer': {
        const chamferTool = this.runtime.getChamferTool?.();
        if (chamferTool) {
          // Get current values and update
          const d1 = optionId === 'distance1' ? (value as number) : (this.values.get('distance1') as number) ?? 10;
          const d2 = optionId === 'distance2' ? (value as number) : (this.values.get('distance2') as number) ?? 10;
          chamferTool.setDistance(d1, d2);
        }
        break;
      }

      case 'polygon':
        if (optionId === 'sides') {
          const polygonTool = this.runtime.getPolygonTool?.();
          polygonTool?.setSides?.(value as number);
        }
        break;

      case 'star': {
        const starTool = this.runtime.getStarTool?.();
        if (optionId === 'points') {
          starTool?.setPoints?.(value as number);
        } else if (optionId === 'innerRadius') {
          starTool?.setInnerRadiusRatio?.(value as number);
        }
        break;
      }

      case 'track-routing': {
        const trackTool = this.runtime.getTrackRoutingTool?.();
        if (optionId === 'width') {
          trackTool?.setTrackWidth?.(value as number);
        } else if (optionId === 'mode') {
          // Cast to the correct RoutingMode type
          trackTool?.setRoutingMode?.(value as '45degree' | 'orthogonal' | 'any_angle');
        }
        break;
      }

      case 'via': {
        const viaTool = this.runtime.getViaTool?.();
        if (optionId === 'drill') {
          viaTool?.setDrill?.(value as number);
        } else if (optionId === 'diameter') {
          viaTool?.setDiameter?.(value as number);
        }
        break;
      }

      default:
        console.log(`Tool option changed: ${this.currentTool}.${optionId} = ${value}`);
    }
  }

  show(): void {
    if (this.element) {
      this.element.style.display = 'block';
    }
  }

  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
    this.currentTool = null;
  }

  isVisible(): boolean {
    return this.element?.style.display !== 'none';
  }

  dispose(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

/**
 * Create a tool options panel
 */
export function createToolOptionsPanel(runtime: DesignLibreRuntime): ToolOptionsPanel {
  return new ToolOptionsPanel(runtime);
}
