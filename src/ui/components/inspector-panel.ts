/**
 * Inspector Panel
 *
 * Property inspection panel for the developer handoff feature.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import type { NodeData } from '@scene/nodes/base-node';
import {
  extractProperties,
  extractSharedProperties,
  type ExtractedProperties,
  type PropertyDisplay,
  type PropertyCategory,
} from '@devtools/inspection/property-extractor';
import { copyToClipboard, showCopyFeedback } from '@devtools/code-export/clipboard';

/** Inspector panel options */
export interface InspectorPanelOptions {
  position?: 'left' | 'right';
  width?: number;
  collapsed?: boolean;
}

/** Inspector panel */
export class InspectorPanel {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private contentElement: HTMLElement | null = null;
  private options: Required<InspectorPanelOptions>;
  private selectedNodeIds: NodeId[] = [];
  private collapsed: boolean;
  private unsubscribers: Array<() => void> = [];

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: InspectorPanelOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    this.options = {
      position: options.position ?? 'right',
      width: options.width ?? 280,
      collapsed: options.collapsed ?? false,
    };
    this.collapsed = this.options.collapsed;

    this.setup();
  }

  private setup(): void {
    // Create panel element
    this.element = document.createElement('div');
    this.element.className = 'designlibre-inspector-panel';
    this.element.style.cssText = this.getPanelStyles();

    // Create header
    const header = this.createHeader();
    this.element.appendChild(header);

    // Create content area
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'designlibre-inspector-content';
    this.contentElement.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    `;
    this.element.appendChild(this.contentElement);

    // Add to container
    this.container.appendChild(this.element);

    // Subscribe to selection changes
    const unsubSelection = this.runtime.on('selection:changed', ({ nodeIds }) => {
      this.selectedNodeIds = nodeIds;
      this.updateContent();
    });
    this.unsubscribers.push(unsubSelection);

    // Subscribe to property changes
    const sceneGraph = this.runtime.getSceneGraph();
    const unsubProperty = sceneGraph.on('node:propertyChanged', ({ nodeId }) => {
      if (this.selectedNodeIds.includes(nodeId)) {
        this.updateContent();
      }
    });
    this.unsubscribers.push(unsubProperty);

    // Initial update
    this.updateContent();
  }

  private getPanelStyles(): string {
    const position = this.options.position === 'right' ? 'right: 0;' : 'left: 0;';

    return `
      position: absolute;
      top: 0;
      ${position}
      width: ${this.options.width}px;
      height: 100%;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border-${this.options.position === 'right' ? 'left' : 'right'}: 1px solid var(--designlibre-border, #3d3d3d);
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      color: var(--designlibre-text-primary, #e4e4e4);
      z-index: 100;
      box-shadow: var(--designlibre-shadow, 0 4px 12px rgba(0, 0, 0, 0.4));
    `;
  }

  private headerTitle: HTMLElement | null = null;
  private toggleBtn: HTMLButtonElement | null = null;

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'designlibre-inspector-header';
    header.style.cssText = `
      padding: 12px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 600;
      user-select: none;
      min-height: 44px;
    `;

    this.headerTitle = document.createElement('span');
    this.headerTitle.textContent = 'Inspector';
    this.headerTitle.style.cssText = `
      overflow: hidden;
      white-space: nowrap;
    `;
    header.appendChild(this.headerTitle);

    // Toggle button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'designlibre-inspector-toggle';
    this.toggleBtn.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      opacity: 0.6;
      font-size: 14px;
      flex-shrink: 0;
      transition: opacity 0.15s;
    `;
    this.toggleBtn.innerHTML = this.collapsed
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
    this.toggleBtn.title = this.collapsed ? 'Expand Inspector' : 'Collapse Inspector';
    this.toggleBtn.addEventListener('click', () => this.toggleCollapsed());
    this.toggleBtn.addEventListener('mouseenter', () => {
      if (this.toggleBtn) this.toggleBtn.style.opacity = '1';
    });
    this.toggleBtn.addEventListener('mouseleave', () => {
      if (this.toggleBtn) this.toggleBtn.style.opacity = '0.6';
    });
    header.appendChild(this.toggleBtn);

    return header;
  }

  private toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    if (this.element) {
      this.element.style.width = this.collapsed ? '40px' : `${this.options.width}px`;
    }
    if (this.contentElement) {
      this.contentElement.style.display = this.collapsed ? 'none' : 'block';
    }
    if (this.headerTitle) {
      this.headerTitle.style.display = this.collapsed ? 'none' : 'block';
    }
    if (this.toggleBtn) {
      this.toggleBtn.innerHTML = this.collapsed
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
      this.toggleBtn.title = this.collapsed ? 'Expand Inspector' : 'Collapse Inspector';
    }
  }

  private updateContent(): void {
    if (!this.contentElement) return;

    // Clear content
    this.contentElement.innerHTML = '';

    if (this.selectedNodeIds.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Get nodes
    const nodes: NodeData[] = [];
    for (const nodeId of this.selectedNodeIds) {
      const node = this.runtime.getNode(nodeId);
      if (node) {
        nodes.push(node);
      }
    }

    if (nodes.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Extract properties
    const properties = nodes.length === 1
      ? extractProperties(nodes[0]!)
      : extractSharedProperties(nodes);

    if (properties) {
      this.renderProperties(properties);
    }
  }

  private renderEmptyState(): void {
    if (!this.contentElement) return;

    const empty = document.createElement('div');
    empty.style.cssText = `
      color: var(--designlibre-text-secondary, #a0a0a0);
      text-align: center;
      padding: 40px 20px;
    `;
    empty.textContent = 'Select an element to inspect';
    this.contentElement.appendChild(empty);
  }

  private renderProperties(props: ExtractedProperties): void {
    if (!this.contentElement) return;

    // Node header
    const nodeHeader = document.createElement('div');
    nodeHeader.style.cssText = `
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--designlibre-border, #e0e0e0);
    `;

    const nodeName = document.createElement('div');
    nodeName.style.cssText = `
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
    `;
    nodeName.textContent = props.nodeName;
    nodeHeader.appendChild(nodeName);

    const nodeType = document.createElement('div');
    nodeType.style.cssText = `
      font-size: 11px;
      color: var(--designlibre-text-secondary, #666666);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    nodeType.textContent = props.nodeType;
    nodeHeader.appendChild(nodeType);

    this.contentElement.appendChild(nodeHeader);

    // Color swatches
    if (props.colors.length > 0) {
      const swatchContainer = document.createElement('div');
      swatchContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 16px;
      `;

      for (const colorInfo of props.colors) {
        const swatch = this.createColorSwatch(colorInfo.hex, colorInfo.color);
        swatchContainer.appendChild(swatch);
      }

      this.contentElement.appendChild(swatchContainer);
    }

    // Property sections
    const categories: PropertyCategory[] = ['transform', 'appearance', 'layout', 'typography', 'effects'];

    for (const category of categories) {
      const categoryProps = props.categories[category];
      if (categoryProps && categoryProps.length > 0) {
        const section = this.createPropertySection(category, categoryProps);
        this.contentElement.appendChild(section);
      }
    }

    // Copy all button
    const copyAllBtn = document.createElement('button');
    copyAllBtn.className = 'designlibre-button designlibre-button-secondary';
    copyAllBtn.style.cssText = `
      width: 100%;
      margin-top: 16px;
      padding: 8px;
      background: var(--designlibre-bg-secondary, #f5f5f5);
      border: 1px solid var(--designlibre-border, #e0e0e0);
      border-radius: var(--designlibre-radius-sm, 4px);
      cursor: pointer;
      font-size: 12px;
    `;
    copyAllBtn.textContent = 'Copy All Properties';
    copyAllBtn.addEventListener('click', async () => {
      const allProps = this.formatAllProperties(props);
      const result = await copyToClipboard(allProps);
      showCopyFeedback(copyAllBtn, result.success);
    });
    this.contentElement.appendChild(copyAllBtn);
  }

  private createPropertySection(
    category: PropertyCategory,
    properties: readonly PropertyDisplay[]
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = 'designlibre-inspector-section';
    section.style.cssText = `margin-bottom: 16px;`;

    // Section header
    const header = document.createElement('div');
    header.style.cssText = `
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--designlibre-text-secondary, #666666);
      margin-bottom: 8px;
    `;
    header.textContent = this.formatCategoryName(category);
    section.appendChild(header);

    // Properties
    for (const prop of properties) {
      const row = this.createPropertyRow(prop);
      section.appendChild(row);
    }

    return section;
  }

  private createPropertyRow(prop: PropertyDisplay): HTMLElement {
    const row = document.createElement('div');
    row.className = 'designlibre-inspector-row';
    row.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 0;
      gap: 8px;
    `;

    // Label
    const label = document.createElement('span');
    label.style.cssText = `
      color: var(--designlibre-text-secondary, #a0a0a0);
      flex-shrink: 0;
      font-size: 12px;
    `;
    label.textContent = prop.label;
    row.appendChild(label);

    // Value container
    const valueContainer = document.createElement('div');
    valueContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      justify-content: flex-end;
    `;

    // Create editable or read-only value based on property
    if (prop.editable && this.selectedNodeIds.length === 1) {
      this.createEditableValue(prop, valueContainer);
    } else {
      this.createReadOnlyValue(prop, valueContainer);
    }

    row.appendChild(valueContainer);

    return row;
  }

  private createReadOnlyValue(prop: PropertyDisplay, container: HTMLElement): void {
    // Color swatch for color type
    if (prop.type === 'color' && typeof prop.value === 'object') {
      const swatch = document.createElement('div');
      swatch.style.cssText = `
        width: 14px;
        height: 14px;
        border-radius: 3px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        background: ${prop.displayValue};
        cursor: pointer;
      `;
      swatch.title = `Click to copy: ${prop.displayValue}`;
      swatch.addEventListener('click', async () => {
        const result = await copyToClipboard(prop.displayValue);
        if (result.success) {
          swatch.style.transform = 'scale(1.1)';
          setTimeout(() => { swatch.style.transform = ''; }, 150);
        }
      });
      container.appendChild(swatch);
    }

    const value = document.createElement('span');
    value.style.cssText = `
      font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
      font-size: 12px;
      color: var(--designlibre-text-primary, #e4e4e4);
      cursor: pointer;
    `;
    value.textContent = prop.displayValue;
    if (prop.unit) {
      value.textContent += prop.unit;
    }
    value.title = `Click to copy: ${prop.copyValue}`;
    value.addEventListener('click', async () => {
      const result = await copyToClipboard(prop.copyValue);
      if (result.success) {
        value.style.color = 'var(--designlibre-accent, #4dabff)';
        setTimeout(() => { value.style.color = ''; }, 300);
      }
    });
    container.appendChild(value);
  }

  private createEditableValue(prop: PropertyDisplay, container: HTMLElement): void {
    const nodeId = this.selectedNodeIds[0];
    if (!nodeId) return;

    switch (prop.type) {
      case 'number':
        this.createNumberInput(prop, container, nodeId);
        break;
      case 'color':
        this.createColorInput(prop, container, nodeId);
        break;
      case 'boolean':
        this.createBooleanInput(prop, container, nodeId);
        break;
      case 'string':
        this.createStringInput(prop, container, nodeId);
        break;
      case 'enum':
        this.createEnumInput(prop, container, nodeId);
        break;
      default:
        this.createReadOnlyValue(prop, container);
    }
  }

  private createNumberInput(prop: PropertyDisplay, container: HTMLElement, nodeId: NodeId): void {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = String(prop.value);
    input.style.cssText = `
      width: 60px;
      height: 24px;
      padding: 0 6px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
      font-size: 12px;
      text-align: right;
    `;

    input.addEventListener('change', () => {
      const newValue = parseFloat(input.value);
      if (!isNaN(newValue)) {
        this.updateNodeProperty(nodeId, prop.name, newValue);
      }
    });

    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--designlibre-accent, #4dabff)';
    });

    input.addEventListener('blur', () => {
      input.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
    });

    container.appendChild(input);

    if (prop.unit) {
      const unit = document.createElement('span');
      unit.style.cssText = `
        font-size: 11px;
        color: var(--designlibre-text-secondary, #a0a0a0);
      `;
      unit.textContent = prop.unit;
      container.appendChild(unit);
    }
  }

  private createColorInput(prop: PropertyDisplay, container: HTMLElement, nodeId: NodeId): void {
    const colorValue = prop.value as { r: number; g: number; b: number; a: number };
    const hexColor = prop.displayValue;

    // Color swatch (clickable for picker)
    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.value = hexColor.slice(0, 7); // Remove alpha for color input
    swatch.style.cssText = `
      width: 24px;
      height: 24px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      cursor: pointer;
      padding: 0;
      background: transparent;
    `;

    swatch.addEventListener('change', () => {
      const hex = swatch.value;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      this.updateNodeColor(nodeId, prop.name, { r, g, b, a: colorValue.a });
    });

    container.appendChild(swatch);

    // Hex display
    const hexDisplay = document.createElement('span');
    hexDisplay.style.cssText = `
      font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
      font-size: 11px;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    hexDisplay.textContent = hexColor;
    container.appendChild(hexDisplay);
  }

  private createBooleanInput(prop: PropertyDisplay, container: HTMLElement, nodeId: NodeId): void {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = prop.value as boolean;
    checkbox.style.cssText = `
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--designlibre-accent, #4dabff);
    `;

    checkbox.addEventListener('change', () => {
      this.updateNodeProperty(nodeId, prop.name, checkbox.checked);
    });

    container.appendChild(checkbox);
  }

  private createStringInput(prop: PropertyDisplay, container: HTMLElement, nodeId: NodeId): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = String(prop.value);
    input.style.cssText = `
      width: 100px;
      height: 24px;
      padding: 0 6px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 12px;
    `;

    input.addEventListener('change', () => {
      this.updateNodeProperty(nodeId, prop.name, input.value);
    });

    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--designlibre-accent, #4dabff)';
    });

    input.addEventListener('blur', () => {
      input.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
    });

    container.appendChild(input);
  }

  private createEnumInput(prop: PropertyDisplay, container: HTMLElement, nodeId: NodeId): void {
    const select = document.createElement('select');
    select.style.cssText = `
      height: 24px;
      padding: 0 6px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 12px;
      cursor: pointer;
    `;

    if (prop.options) {
      for (const option of prop.options) {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        opt.selected = option === prop.value;
        select.appendChild(opt);
      }
    }

    select.addEventListener('change', () => {
      this.updateNodeProperty(nodeId, prop.name, select.value);
    });

    container.appendChild(select);
  }

  private updateNodeProperty(nodeId: NodeId, propName: string, value: unknown): void {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(nodeId, { [propName]: value });
  }

  private updateNodeColor(nodeId: NodeId, propName: string, color: { r: number; g: number; b: number; a: number }): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const node = sceneGraph.getNode(nodeId);
    if (!node) return;

    // Parse property name like "fills[0].color" or "strokes[1].color"
    const fillMatch = propName.match(/^fills\[(\d+)\]\.color$/);
    const strokeMatch = propName.match(/^strokes\[(\d+)\]\.color$/);

    if (fillMatch && 'fills' in node) {
      const index = parseInt(fillMatch[1]!, 10);
      const fills = [...(node.fills || [])];
      if (fills[index]?.type === 'SOLID') {
        fills[index] = { ...fills[index], color };
        sceneGraph.updateNode(nodeId, { fills });
      }
    } else if (strokeMatch && 'strokes' in node) {
      const index = parseInt(strokeMatch[1]!, 10);
      const strokes = [...(node.strokes || [])];
      if (strokes[index]?.type === 'SOLID') {
        strokes[index] = { ...strokes[index], color };
        sceneGraph.updateNode(nodeId, { strokes });
      }
    }
  }

  private createColorSwatch(hex: string, _color: { r: number; g: number; b: number; a: number }): HTMLElement {
    const swatch = document.createElement('div');
    swatch.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid var(--designlibre-border, #e0e0e0);
      background: ${hex};
      cursor: pointer;
    `;
    swatch.title = `Click to copy: ${hex}`;

    swatch.addEventListener('click', async () => {
      const result = await copyToClipboard(hex);
      if (result.success) {
        swatch.style.transform = 'scale(1.1)';
        setTimeout(() => {
          swatch.style.transform = '';
        }, 150);
      }
    });

    return swatch;
  }

  private formatCategoryName(category: PropertyCategory): string {
    const names: Record<PropertyCategory, string> = {
      identity: 'Identity',
      transform: 'Transform',
      appearance: 'Appearance',
      layout: 'Layout',
      typography: 'Typography',
      effects: 'Effects',
    };
    return names[category];
  }

  private formatAllProperties(props: ExtractedProperties): string {
    const lines: string[] = [];
    lines.push(`/* ${props.nodeName} (${props.nodeType}) */`);

    for (const [category, properties] of Object.entries(props.categories)) {
      if (properties.length === 0) continue;

      lines.push('');
      lines.push(`/* ${this.formatCategoryName(category as PropertyCategory)} */`);

      for (const prop of properties) {
        lines.push(`${prop.label}: ${prop.copyValue};`);
      }
    }

    return lines.join('\n');
  }

  /** Show the panel */
  show(): void {
    if (this.element) {
      this.element.style.display = 'flex';
    }
  }

  /** Hide the panel */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /** Dispose of the panel */
  dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.contentElement = null;
  }
}

/**
 * Create an inspector panel.
 */
export function createInspectorPanel(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: InspectorPanelOptions
): InspectorPanel {
  return new InspectorPanel(runtime, container, options);
}
