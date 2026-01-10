/**
 * Inspector Panel
 *
 * Three-panel inspector with Design, Prototype, and Inspect/Dev Mode tabs.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { NodeData, FrameNodeData, TextNodeData, VectorNodeData } from '@scene/nodes/base-node';
import type { SolidPaint } from '@core/types/paint';
import type { ColorStyle, StyleId } from '@core/types/style';
import { rgbaToHex } from '@core/types/color';
import { copyToClipboard, showCopyFeedback } from '@devtools/code-export/clipboard';
import { nodeToUtilityClasses, type UtilityClassOptions } from '@persistence/export/utility-class-generator';
import { createTokenExtractor, type TokenOutputFormat, type ExtractedTokens } from '@persistence/export/token-extractor';
import type {
  PrototypeInteraction,
  InteractionTrigger,
  InteractionAction,
  OverlayPosition,
  TransitionType,
} from '@core/types/page-schema';
import type { VariableDefinition, VariableType } from '@prototype/variable-manager';
import { FramePicker } from './frame-picker';
import { VariablePicker } from './variable-picker';
import {
  reversePath,
  simplifyPath,
  flattenPath,
  outlineStroke,
  closePath,
  openPath,
  getPathStats,
} from '@core/geometry/path-operations';
import { breakPathAtAnchor } from '@tools/path/join-split-tool';
import {
  type SemanticNodeType,
  type SemanticMetadata,
  type AccessibilityConfig,
  type StateBinding,
  type BindingTransform,
  type LLMContextHints,
  type DataBinding,
  type SemanticEventHandler,
  type EventType,
  type ActionType,
  SEMANTIC_PLUGIN_KEY,
  SEMANTIC_TYPE_DEFAULTS,
  getSemanticMetadata,
  setSemanticMetadata,
  createSemanticMetadata,
} from '@core/types/semantic-schema';

/** Inspector panel options */
export interface InspectorPanelOptions {
  position?: 'left' | 'right';
  width?: number;
  collapsed?: boolean;
  defaultTab?: 'design' | 'prototype' | 'inspect';
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
}

type InspectorTab = 'design' | 'prototype' | 'inspect';

/** Collapse button width */
const COLLAPSE_BUTTON_WIDTH = 24;

/** SVG Icons for inspector */
const INSPECTOR_ICONS = {
  collapseRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="9 18 15 12 9 6"/>
  </svg>`,
  collapseLeft: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="15 18 9 12 15 6"/>
  </svg>`,
};

/** Inspector panel */
export class InspectorPanel {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private collapseButton: HTMLElement | null = null;
  private mainContent: HTMLElement | null = null;
  private tabsElement: HTMLElement | null = null;
  private contentElement: HTMLElement | null = null;
  private options: {
    position: 'left' | 'right';
    width: number;
    collapsed: boolean;
    defaultTab: 'design' | 'prototype' | 'inspect';
    onCollapseChange: ((collapsed: boolean) => void) | null;
  };
  private selectedNodeIds: NodeId[] = [];
  private activeTab: InspectorTab = 'design';
  private collapsed = false;
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
      defaultTab: options.defaultTab ?? 'design',
      onCollapseChange: options.onCollapseChange ?? null,
    };
    this.activeTab = this.options.defaultTab;
    this.collapsed = this.options.collapsed;

    this.setup();
  }

  private setup(): void {
    // Create panel element
    this.element = document.createElement('div');
    this.element.className = 'designlibre-inspector-panel';
    this.element.style.cssText = this.getPanelStyles();

    // Create collapse button (arrow toggle)
    this.collapseButton = this.createCollapseButton();
    this.element.appendChild(this.collapseButton);

    // Create main content wrapper (tabs + content)
    this.mainContent = document.createElement('div');
    this.mainContent.className = 'designlibre-inspector-main';
    this.mainContent.style.cssText = `
      flex: 1;
      display: ${this.collapsed ? 'none' : 'flex'};
      flex-direction: column;
      overflow: hidden;
    `;

    // Create tabs
    this.tabsElement = this.createTabs();
    this.mainContent.appendChild(this.tabsElement);

    // Create content area
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'designlibre-inspector-content';
    this.contentElement.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    `;
    this.mainContent.appendChild(this.contentElement);
    this.element.appendChild(this.mainContent);

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
    const width = this.collapsed ? COLLAPSE_BUTTON_WIDTH : this.options.width;

    return `
      position: relative;
      width: ${width}px;
      height: 100%;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border-left: 1px solid var(--designlibre-border, #3d3d3d);
      display: flex;
      flex-direction: row;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      color: var(--designlibre-text-primary, #e4e4e4);
      flex-shrink: 0;
      transition: width 0.2s ease;
    `;
  }

  private createCollapseButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'designlibre-inspector-collapse-btn';
    button.title = this.collapsed ? 'Expand panel' : 'Collapse panel';
    button.innerHTML = this.collapsed
      ? INSPECTOR_ICONS.collapseLeft
      : INSPECTOR_ICONS.collapseRight;
    button.style.cssText = `
      width: ${COLLAPSE_BUTTON_WIDTH}px;
      height: 100%;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-secondary, #a0a0a0);
      flex-shrink: 0;
      border-right: ${this.collapsed ? 'none' : '1px solid var(--designlibre-border, #3d3d3d)'};
      transition: background-color 0.15s;
    `;

    button.addEventListener('click', () => this.toggleCollapse());
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
      button.style.color = 'var(--designlibre-text-secondary, #a0a0a0)';
    });

    return button;
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;

    // Update element width
    if (this.element) {
      this.element.style.width = `${this.collapsed ? COLLAPSE_BUTTON_WIDTH : this.options.width}px`;
    }

    // Update collapse button
    if (this.collapseButton) {
      this.collapseButton.title = this.collapsed ? 'Expand panel' : 'Collapse panel';
      this.collapseButton.innerHTML = this.collapsed
        ? INSPECTOR_ICONS.collapseLeft
        : INSPECTOR_ICONS.collapseRight;
      this.collapseButton.style.borderRight = this.collapsed
        ? 'none'
        : '1px solid var(--designlibre-border, #3d3d3d)';
    }

    // Show/hide main content
    if (this.mainContent) {
      this.mainContent.style.display = this.collapsed ? 'none' : 'flex';
    }

    // Notify callback
    if (this.options.onCollapseChange) {
      this.options.onCollapseChange(this.collapsed);
    }
  }

  /** Check if panel is collapsed */
  isCollapsed(): boolean {
    return this.collapsed;
  }

  /** Programmatically set collapsed state */
  setCollapsed(collapsed: boolean): void {
    if (this.collapsed !== collapsed) {
      this.toggleCollapse();
    }
  }

  private createTabs(): HTMLElement {
    const tabs = document.createElement('div');
    tabs.className = 'designlibre-inspector-tabs';
    tabs.style.cssText = `
      display: flex;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      background: var(--designlibre-bg-tertiary, #252525);
    `;

    const tabDefs: { id: InspectorTab; label: string }[] = [
      { id: 'design', label: 'Design' },
      { id: 'prototype', label: 'Prototype' },
      { id: 'inspect', label: 'Inspect' },
    ];

    for (const tabDef of tabDefs) {
      const tab = document.createElement('button');
      tab.className = 'designlibre-inspector-tab';
      tab.setAttribute('data-tab', tabDef.id);
      tab.textContent = tabDef.label;
      tab.style.cssText = `
        flex: 1;
        padding: 6px 4px;
        border: none;
        background: ${tabDef.id === this.activeTab ? 'var(--designlibre-bg-primary, #1e1e1e)' : 'transparent'};
        color: ${tabDef.id === this.activeTab ? 'var(--designlibre-text-primary, #e4e4e4)' : 'var(--designlibre-text-secondary, #a0a0a0)'};
        font-size: var(--designlibre-sidebar-font-size-xs, 11px);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        border-bottom: 2px solid ${tabDef.id === this.activeTab ? 'var(--designlibre-accent, #4dabff)' : 'transparent'};
        white-space: nowrap;
      `;

      tab.addEventListener('click', () => this.switchTab(tabDef.id));
      tab.addEventListener('mouseenter', () => {
        if (tabDef.id !== this.activeTab) {
          tab.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
        }
      });
      tab.addEventListener('mouseleave', () => {
        if (tabDef.id !== this.activeTab) {
          tab.style.color = 'var(--designlibre-text-secondary, #a0a0a0)';
        }
      });

      tabs.appendChild(tab);
    }

    return tabs;
  }

  private switchTab(tab: InspectorTab): void {
    this.activeTab = tab;

    // Update tab styles
    if (this.tabsElement) {
      const tabs = this.tabsElement.querySelectorAll('.designlibre-inspector-tab');
      tabs.forEach((t) => {
        const tabEl = t as HTMLElement;
        const isActive = tabEl.getAttribute('data-tab') === tab;
        tabEl.style.background = isActive ? 'var(--designlibre-bg-primary, #1e1e1e)' : 'transparent';
        tabEl.style.color = isActive ? 'var(--designlibre-text-primary, #e4e4e4)' : 'var(--designlibre-text-secondary, #a0a0a0)';
        tabEl.style.borderBottom = isActive ? '2px solid var(--designlibre-accent, #4dabff)' : '2px solid transparent';
      });
    }

    this.updateContent();
  }

  private updateContent(): void {
    if (!this.contentElement) return;
    this.contentElement.innerHTML = '';

    if (this.selectedNodeIds.length === 0) {
      this.renderEmptyState();
      return;
    }

    const nodes: NodeData[] = [];
    for (const nodeId of this.selectedNodeIds) {
      const node = this.runtime.getNode(nodeId);
      if (node) nodes.push(node);
    }

    if (nodes.length === 0) {
      this.renderEmptyState();
      return;
    }

    switch (this.activeTab) {
      case 'design':
        this.renderDesignPanel(nodes);
        break;
      case 'prototype':
        this.renderPrototypePanel(nodes);
        break;
      case 'inspect':
        this.renderInspectPanel(nodes);
        break;
    }
  }

  private renderEmptyState(): void {
    if (!this.contentElement) return;

    // Show different empty states based on active tab
    switch (this.activeTab) {
      case 'design':
        this.renderDesignEmptyState();
        break;
      case 'prototype':
        this.renderPrototypeEmptyState();
        break;
      case 'inspect':
        this.renderInspectEmptyState();
        break;
    }
  }

  /**
   * Render Design tab empty state with color picker.
   */
  private renderDesignEmptyState(): void {
    if (!this.contentElement) return;

    // Color Picker section
    const colorSection = this.createSection('Color');

    // Get current fill color from runtime
    const lastFill = this.runtime.getLastUsedFillColor();
    const initRgb: [number, number, number] = [
      Math.round(lastFill.r * 255),
      Math.round(lastFill.g * 255),
      Math.round(lastFill.b * 255),
    ];

    // Current color state (HSV) - initialize from runtime
    const rgbToHsvInit = (r: number, g: number, b: number): [number, number, number] => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      let h = 0;
      const s = max === 0 ? 0 : d / max;
      const v = max;
      if (d !== 0) {
        if (max === r) h = 60 * (((g - b) / d) % 6);
        else if (max === g) h = 60 * ((b - r) / d + 2);
        else h = 60 * ((r - g) / d + 4);
      }
      if (h < 0) h += 360;
      return [h, s, v];
    };
    const [initH, initS, initV] = rgbToHsvInit(initRgb[0], initRgb[1], initRgb[2]);
    let currentHue = initH;
    let currentSat = initS;
    let currentVal = initV;

    // Helper functions for color conversion
    const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
      const c = v * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = v - c;
      let r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255),
      ];
    };

    const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      let h = 0;
      const s = max === 0 ? 0 : d / max;
      const v = max;
      if (d !== 0) {
        if (max === r) h = 60 * (((g - b) / d) % 6);
        else if (max === g) h = 60 * ((b - r) / d + 2);
        else h = 60 * ((r - g) / d + 4);
      }
      if (h < 0) h += 360;
      return [h, s, v];
    };

    const rgbToHex = (r: number, g: number, b: number): string => {
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    };

    const hexToRgb = (hex: string): [number, number, number] | null => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return null;
      return [parseInt(result[1]!, 16), parseInt(result[2]!, 16), parseInt(result[3]!, 16)];
    };

    // Saturation-Value plane container
    const svContainer = document.createElement('div');
    svContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: 150px;
      border-radius: 6px;
      margin-bottom: 10px;
      cursor: crosshair;
      overflow: hidden;
    `;

    // SV plane canvas
    const svCanvas = document.createElement('canvas');
    svCanvas.width = 256;
    svCanvas.height = 150;
    svCanvas.style.cssText = `
      width: 100%;
      height: 100%;
      border-radius: 6px;
    `;

    // SV cursor
    const svCursor = document.createElement('div');
    svCursor.style.cssText = `
      position: absolute;
      width: 14px;
      height: 14px;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.3);
      pointer-events: none;
      transform: translate(-50%, -50%);
    `;

    svContainer.appendChild(svCanvas);
    svContainer.appendChild(svCursor);

    // Draw SV plane
    const drawSVPlane = () => {
      const ctx = svCanvas.getContext('2d')!;
      const width = svCanvas.width;
      const height = svCanvas.height;

      // Base hue color
      const [hr, hg, hb] = hsvToRgb(currentHue, 1, 1);

      // Create horizontal gradient (white to hue color)
      const gradH = ctx.createLinearGradient(0, 0, width, 0);
      gradH.addColorStop(0, 'white');
      gradH.addColorStop(1, `rgb(${hr},${hg},${hb})`);
      ctx.fillStyle = gradH;
      ctx.fillRect(0, 0, width, height);

      // Create vertical gradient (transparent to black)
      const gradV = ctx.createLinearGradient(0, 0, 0, height);
      gradV.addColorStop(0, 'rgba(0,0,0,0)');
      gradV.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = gradV;
      ctx.fillRect(0, 0, width, height);
    };

    // Update SV cursor position
    const updateSVCursor = () => {
      svCursor.style.left = `${currentSat * 100}%`;
      svCursor.style.top = `${(1 - currentVal) * 100}%`;
    };

    // Hue slider container
    const hueContainer = document.createElement('div');
    hueContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: 14px;
      border-radius: 7px;
      margin-bottom: 12px;
      cursor: pointer;
      background: linear-gradient(to right,
        hsl(0, 100%, 50%),
        hsl(60, 100%, 50%),
        hsl(120, 100%, 50%),
        hsl(180, 100%, 50%),
        hsl(240, 100%, 50%),
        hsl(300, 100%, 50%),
        hsl(360, 100%, 50%)
      );
    `;

    // Hue cursor
    const hueCursor = document.createElement('div');
    hueCursor.style.cssText = `
      position: absolute;
      width: 6px;
      height: 18px;
      background: white;
      border-radius: 3px;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
      pointer-events: none;
      transform: translate(-50%, -2px);
      top: 0;
    `;
    hueContainer.appendChild(hueCursor);

    // Update hue cursor position
    const updateHueCursor = () => {
      hueCursor.style.left = `${(currentHue / 360) * 100}%`;
    };

    // Update all displays and set runtime fill color
    const updateDisplays = () => {
      const [r, g, b] = hsvToRgb(currentHue, currentSat, currentVal);
      const hex = rgbToHex(r, g, b);
      hexInput.value = hex;
      (rInput.querySelector('input') as HTMLInputElement).value = r.toString();
      (gInput.querySelector('input') as HTMLInputElement).value = g.toString();
      (bInput.querySelector('input') as HTMLInputElement).value = b.toString();
      previewSwatch.style.background = hex;
      // Update runtime fill color so new shapes use this color
      this.runtime.setLastUsedFillColor({ r: r / 255, g: g / 255, b: b / 255, a: 1 });
    };

    // SV plane interaction
    let svDragging = false;
    const handleSVInteraction = (e: MouseEvent | TouchEvent) => {
      const rect = svContainer.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
      currentSat = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      currentVal = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      updateSVCursor();
      updateDisplays();
    };

    svContainer.addEventListener('mousedown', (e) => {
      svDragging = true;
      handleSVInteraction(e);
    });
    svContainer.addEventListener('touchstart', (e) => {
      svDragging = true;
      handleSVInteraction(e);
      e.preventDefault();
    });

    // Hue slider interaction
    let hueDragging = false;
    const handleHueInteraction = (e: MouseEvent | TouchEvent) => {
      const rect = hueContainer.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
      currentHue = Math.max(0, Math.min(360, ((clientX - rect.left) / rect.width) * 360));
      updateHueCursor();
      drawSVPlane();
      updateDisplays();
    };

    hueContainer.addEventListener('mousedown', (e) => {
      hueDragging = true;
      handleHueInteraction(e);
    });
    hueContainer.addEventListener('touchstart', (e) => {
      hueDragging = true;
      handleHueInteraction(e);
      e.preventDefault();
    });

    // Global mouse/touch move and up
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (svDragging) handleSVInteraction(e);
      if (hueDragging) handleHueInteraction(e);
    };
    const handleGlobalUp = () => {
      svDragging = false;
      hueDragging = false;
    };

    document.addEventListener('mousemove', handleGlobalMove);
    document.addEventListener('mouseup', handleGlobalUp);
    document.addEventListener('touchmove', handleGlobalMove);
    document.addEventListener('touchend', handleGlobalUp);

    // Preview swatch and hex input row
    const inputRow = document.createElement('div');
    inputRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    `;

    // Preview swatch
    const previewSwatch = document.createElement('div');
    const [initR, initG, initB] = hsvToRgb(currentHue, currentSat, currentVal);
    previewSwatch.style.cssText = `
      width: 36px;
      height: 36px;
      border-radius: 6px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      background: ${rgbToHex(initR, initG, initB)};
      flex-shrink: 0;
    `;

    // Hex input
    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.value = rgbToHex(initR, initG, initB);
    hexInput.placeholder = '#000000';
    hexInput.style.cssText = `
      flex: 1;
      height: 32px;
      padding: 0 10px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-family: monospace;
      font-size: 13px;
    `;

    hexInput.addEventListener('blur', () => {
      let val = hexInput.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      const rgb = hexToRgb(val);
      if (rgb) {
        hexInput.value = val.toUpperCase();
        const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
        currentHue = h;
        currentSat = s;
        currentVal = v;
        drawSVPlane();
        updateSVCursor();
        updateHueCursor();
        updateDisplays();
      } else {
        updateDisplays();
      }
    });

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.style.cssText = `
      height: 32px;
      padding: 0 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    `;
    copyBtn.addEventListener('mouseenter', () => {
      copyBtn.style.background = 'var(--designlibre-bg-tertiary, #3d3d3d)';
    });
    copyBtn.addEventListener('mouseleave', () => {
      copyBtn.style.background = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });
    copyBtn.addEventListener('click', () => {
      copyToClipboard(hexInput.value);
      this.showToast(`Copied ${hexInput.value}`);
    });

    inputRow.appendChild(previewSwatch);
    inputRow.appendChild(hexInput);
    inputRow.appendChild(copyBtn);

    // RGB display
    const formatRow = document.createElement('div');
    formatRow.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
    `;

    const createValueInput = (label: string, value: string): HTMLElement => {
      const wrapper = document.createElement('div');
      const labelEl = document.createElement('div');
      labelEl.textContent = label;
      labelEl.style.cssText = `
        font-size: 10px;
        color: var(--designlibre-text-muted, #6a6a6a);
        margin-bottom: 4px;
      `;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.readOnly = true;
      input.style.cssText = `
        width: 100%;
        height: 28px;
        padding: 0 8px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-secondary, #a0a0a0);
        font-family: monospace;
        font-size: 11px;
        box-sizing: border-box;
      `;
      wrapper.appendChild(labelEl);
      wrapper.appendChild(input);
      return wrapper;
    };

    const rInput = createValueInput('R', initR.toString());
    const gInput = createValueInput('G', initG.toString());
    const bInput = createValueInput('B', initB.toString());
    formatRow.appendChild(rInput);
    formatRow.appendChild(gInput);
    formatRow.appendChild(bInput);

    // Add all elements to section
    colorSection.appendChild(svContainer);
    colorSection.appendChild(hueContainer);
    colorSection.appendChild(inputRow);
    colorSection.appendChild(formatRow);
    this.contentElement.appendChild(colorSection);

    // Initial draw
    drawSVPlane();
    updateSVCursor();
    updateHueCursor();

    // Document Color Styles section (if any exist)
    const styleManager = this.runtime.getStyleManager();
    const colorStyles = styleManager.getColorStyles();

    if (colorStyles.length > 0) {
      const stylesSection = this.createSection('Document Colors');
      const stylesGrid = document.createElement('div');
      stylesGrid.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      `;

      for (const style of colorStyles) {
        const swatch = this.createColorSwatch(style.color, style.name, () => {
          const r = Math.round(style.color.r * 255);
          const g = Math.round(style.color.g * 255);
          const b = Math.round(style.color.b * 255);
          const [h, s, v] = rgbToHsv(r, g, b);
          currentHue = h;
          currentSat = s;
          currentVal = v;
          drawSVPlane();
          updateSVCursor();
          updateHueCursor();
          updateDisplays();
        });
        stylesGrid.appendChild(swatch);
      }

      stylesSection.appendChild(stylesGrid);
      this.contentElement.appendChild(stylesSection);
    }

    // Quick tip
    const tip = document.createElement('div');
    tip.style.cssText = `
      margin-top: 16px;
      padding: 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
      font-size: 11px;
      color: var(--designlibre-text-secondary, #a0a0a0);
      line-height: 1.4;
    `;
    tip.textContent = 'Select an element to edit its fill and stroke colors.';
    this.contentElement.appendChild(tip);
  }

  /**
   * Create a color swatch element.
   */
  private createColorSwatch(
    color: RGBA,
    tooltip: string,
    onClick: () => void
  ): HTMLElement {
    const swatch = document.createElement('button');
    const hex = rgbaToHex(color);
    swatch.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 4px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      background: ${hex};
      cursor: pointer;
      position: relative;
      transition: transform 0.1s, box-shadow 0.1s;
    `;
    swatch.title = `${tooltip}\n${hex}`;

    swatch.addEventListener('mouseenter', () => {
      swatch.style.transform = 'scale(1.1)';
      swatch.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      swatch.style.zIndex = '10';
    });
    swatch.addEventListener('mouseleave', () => {
      swatch.style.transform = 'scale(1)';
      swatch.style.boxShadow = 'none';
      swatch.style.zIndex = '0';
    });
    swatch.addEventListener('click', onClick);

    return swatch;
  }

  /**
   * Show a temporary toast notification.
   */
  private showToast(message: string, duration: number = 1500): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--designlibre-bg-primary, #1e1e1e);
      color: var(--designlibre-text-primary, #e4e4e4);
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      z-index: 10000;
      animation: fadeInUp 0.2s ease-out;
    `;
    toast.textContent = message;

    // Add animation keyframes if not already present
    if (!document.getElementById('designlibre-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'designlibre-toast-styles';
      style.textContent = `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeOutDown {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(10px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOutDown 0.2s ease-out forwards';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  /**
   * Render Prototype tab empty state.
   */
  private renderPrototypeEmptyState(): void {
    if (!this.contentElement) return;

    const empty = document.createElement('div');
    empty.style.cssText = `
      color: var(--designlibre-text-secondary, #a0a0a0);
      text-align: center;
      padding: 40px 20px;
    `;
    empty.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 12px;">🔗</div>
      <div style="font-weight: 500; margin-bottom: 8px;">No element selected</div>
      <div style="font-size: 11px; color: var(--designlibre-text-muted, #6a6a6a);">
        Select a frame or element to add prototype interactions
      </div>
    `;
    this.contentElement.appendChild(empty);
  }

  /**
   * Render Inspect tab empty state.
   */
  private renderInspectEmptyState(): void {
    if (!this.contentElement) return;

    const empty = document.createElement('div');
    empty.style.cssText = `
      color: var(--designlibre-text-secondary, #a0a0a0);
      text-align: center;
      padding: 40px 20px;
    `;
    empty.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 12px;">🔍</div>
      <div style="font-weight: 500; margin-bottom: 8px;">No element selected</div>
      <div style="font-size: 11px; color: var(--designlibre-text-muted, #6a6a6a);">
        Select an element to view code and export options
      </div>
    `;
    this.contentElement.appendChild(empty);
  }

  // =========================================================================
  // Design Panel
  // =========================================================================

  private renderDesignPanel(nodes: NodeData[]): void {
    if (!this.contentElement) return;
    const node = nodes[0]!;
    const nodeId = this.selectedNodeIds[0]!;

    // Page/Leaf specific panel
    if (node.type === 'PAGE') {
      this.renderPagePanel(node, nodeId);
      return;
    }

    // Node header
    this.renderNodeHeader(node);

    // Layout & Position section
    this.renderLayoutSection(node, nodeId);

    // Appearance section (Opacity, Corner Radius)
    this.renderAppearanceSection(node, nodeId);

    // Fill section
    if ('fills' in node) {
      this.renderFillSection(node as FrameNodeData | VectorNodeData, nodeId);
    }

    // Stroke section
    if ('strokes' in node) {
      this.renderStrokeSection(node as VectorNodeData, nodeId);
    }

    // Path operations section (for vector nodes)
    if (node.type === 'VECTOR') {
      this.renderPathOperationsSection(node as VectorNodeData, nodeId);
    }

    // Effects section
    if ('effects' in node) {
      this.renderEffectsSection(node as FrameNodeData, nodeId);
    }

    // Text section (only for text nodes)
    if (node.type === 'TEXT') {
      this.renderTextSection(node as TextNodeData, nodeId);
    }

    // Semantic Properties section (for code-ready design)
    this.renderSemanticSection(node, nodeId);
  }

  /**
   * Render page-specific properties panel.
   */
  private renderPagePanel(node: NodeData, nodeId: NodeId): void {
    if (!this.contentElement) return;

    // Page header
    const header = document.createElement('div');
    header.style.cssText = `
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    const name = document.createElement('div');
    name.style.cssText = `font-weight: 600; font-size: var(--designlibre-sidebar-font-size-lg, 14px); margin-bottom: 4px;`;
    name.textContent = node.name || 'Leaf 1';
    header.appendChild(name);

    const type = document.createElement('div');
    type.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    type.textContent = 'LEAF';
    header.appendChild(type);

    this.contentElement.appendChild(header);

    // Page properties section
    const propsSection = this.createSection('Properties');

    // Background Color
    const colorRow = this.createPropertyRow();
    const colorLabel = document.createElement('span');
    colorLabel.textContent = 'Color';
    colorLabel.style.cssText = `width: 80px; font-size: var(--designlibre-sidebar-font-size-sm, 12px); color: var(--designlibre-text-secondary, #a0a0a0);`;

    const pageNode = node as { backgroundColor?: RGBA };
    const bgColor = pageNode.backgroundColor ?? { r: 0.102, g: 0.102, b: 0.102, a: 1 };

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = rgbaToHex(bgColor);
    colorPicker.style.cssText = `
      width: 32px;
      height: 24px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      cursor: pointer;
      background: none;
      padding: 0;
    `;

    // Hex code input
    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.value = rgbaToHex(bgColor).toUpperCase();
    hexInput.style.cssText = `
      flex: 1;
      padding: 4px 8px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      font-family: monospace;
    `;

    colorPicker.addEventListener('input', () => {
      const hex = colorPicker.value;
      hexInput.value = hex.toUpperCase();
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      this.updateNode(nodeId, { backgroundColor: { r, g, b, a: 1 } });
    });

    hexInput.addEventListener('change', () => {
      let hex = hexInput.value.trim();
      if (!hex.startsWith('#')) hex = '#' + hex;
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        colorPicker.value = hex;
        hexInput.value = hex.toUpperCase();
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        this.updateNode(nodeId, { backgroundColor: { r, g, b, a: 1 } });
      }
    });

    colorRow.appendChild(colorLabel);
    colorRow.appendChild(colorPicker);
    colorRow.appendChild(hexInput);
    propsSection.appendChild(colorRow);

    // Transparency/Opacity
    const opacityRow = this.createPropertyRow();
    const opacityLabel = document.createElement('span');
    opacityLabel.textContent = 'Transparency';
    opacityLabel.style.cssText = `width: 80px; font-size: var(--designlibre-sidebar-font-size-sm, 12px); color: var(--designlibre-text-secondary, #a0a0a0);`;

    const opacity = (node as { opacity?: number }).opacity ?? 1;
    const opacityInput = document.createElement('input');
    opacityInput.type = 'number';
    opacityInput.min = '0';
    opacityInput.max = '100';
    opacityInput.value = String(Math.round(opacity * 100));
    opacityInput.style.cssText = `
      flex: 1;
      padding: 4px 8px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      text-align: right;
    `;
    opacityInput.addEventListener('change', () => {
      const val = Math.max(0, Math.min(100, parseInt(opacityInput.value) || 100));
      this.updateNode(nodeId, { opacity: val / 100 });
    });

    const opacityUnit = document.createElement('span');
    opacityUnit.textContent = '%';
    opacityUnit.style.cssText = `margin-left: 4px; font-size: var(--designlibre-sidebar-font-size-sm, 12px); color: var(--designlibre-text-muted, #6a6a6a);`;

    opacityRow.appendChild(opacityLabel);
    opacityRow.appendChild(opacityInput);
    opacityRow.appendChild(opacityUnit);
    propsSection.appendChild(opacityRow);

    // Visibility toggle
    const visibilityRow = this.createPropertyRow();
    const visibilityLabel = document.createElement('span');
    visibilityLabel.textContent = 'Visibility';
    visibilityLabel.style.cssText = `width: 80px; font-size: var(--designlibre-sidebar-font-size-sm, 12px); color: var(--designlibre-text-secondary, #a0a0a0);`;

    const visible = (node as { visible?: boolean }).visible !== false;
    const eyeBtn = document.createElement('button');
    eyeBtn.innerHTML = visible
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    eyeBtn.style.cssText = `
      width: 32px;
      height: 24px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: ${visible ? 'var(--designlibre-bg-secondary, #2d2d2d)' : 'var(--designlibre-bg-tertiary, #252525)'};
      color: ${visible ? 'var(--designlibre-text-primary, #e4e4e4)' : 'var(--designlibre-text-muted, #6a6a6a)'};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    eyeBtn.addEventListener('click', () => {
      this.updateNode(nodeId, { visible: !visible });
    });

    visibilityRow.appendChild(visibilityLabel);
    visibilityRow.appendChild(eyeBtn);
    propsSection.appendChild(visibilityRow);

    this.contentElement.appendChild(propsSection);

    // Separator
    const sep1 = document.createElement('div');
    sep1.style.cssText = `height: 1px; background: var(--designlibre-border, #3d3d3d); margin: 16px 0;`;
    this.contentElement.appendChild(sep1);

    // Styles section
    this.renderPageStylesSection(nodeId);

    // Separator
    const sep2 = document.createElement('div');
    sep2.style.cssText = `height: 1px; background: var(--designlibre-border, #3d3d3d); margin: 16px 0;`;
    this.contentElement.appendChild(sep2);

    // Export section
    this.renderPageExportSection(nodeId);
  }

  /**
   * Render page styles section.
   */
  private renderPageStylesSection(nodeId: NodeId): void {
    if (!this.contentElement) return;

    const styleManager = this.runtime.getStyleManager();
    const colorStyles = styleManager.getColorStyles();
    const node = this.runtime.getSceneGraph().getNode(nodeId);
    const appliedStyleId = (node as { colorStyleId?: StyleId })?.colorStyleId;

    const section = document.createElement('div');
    section.style.cssText = `margin-bottom: 16px;`;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    `;

    const title = document.createElement('div');
    title.textContent = 'Styles';
    title.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      font-weight: 600;
      text-transform: uppercase;
      color: var(--designlibre-text-secondary, #a0a0a0);
      letter-spacing: 0.5px;
    `;

    const addBtn = document.createElement('button');
    addBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    addBtn.title = 'Create style from current color';
    addBtn.style.cssText = `
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: var(--designlibre-text-secondary, #a0a0a0);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    `;
    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.backgroundColor = 'transparent';
    });
    addBtn.addEventListener('click', () => {
      this.showCreateStyleDialog(nodeId);
    });

    header.appendChild(title);
    header.appendChild(addBtn);
    section.appendChild(header);

    // Show applied style or style picker
    if (appliedStyleId) {
      const appliedStyle = styleManager.getStyle(appliedStyleId) as ColorStyle | null;
      if (appliedStyle) {
        const styleItem = this.createAppliedStyleItem(appliedStyle, nodeId);
        section.appendChild(styleItem);
      }
    }

    // Show existing color styles
    if (colorStyles.length > 0) {
      const stylesLabel = document.createElement('div');
      stylesLabel.textContent = 'Color Styles';
      stylesLabel.style.cssText = `
        font-size: 10px;
        color: var(--designlibre-text-muted, #6a6a6a);
        margin: 8px 0 4px 0;
      `;
      section.appendChild(stylesLabel);

      const stylesList = document.createElement('div');
      stylesList.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      `;

      for (const style of colorStyles) {
        const styleBtn = this.createStyleButton(style, nodeId, appliedStyleId === style.id);
        stylesList.appendChild(styleBtn);
      }

      section.appendChild(stylesList);
    } else if (!appliedStyleId) {
      // Placeholder when no styles exist
      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        padding: 12px;
        text-align: center;
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        color: var(--designlibre-text-muted, #6a6a6a);
        background: var(--designlibre-bg-secondary, #2d2d2d);
        border-radius: 4px;
      `;
      placeholder.textContent = 'No styles yet. Click + to create one.';
      section.appendChild(placeholder);
    }

    this.contentElement.appendChild(section);
  }

  /**
   * Create a style button for the styles list.
   */
  private createStyleButton(style: ColorStyle, nodeId: NodeId, isApplied: boolean): HTMLElement {
    const btn = document.createElement('button');
    btn.title = style.name;
    btn.style.cssText = `
      width: 24px;
      height: 24px;
      border: 2px solid ${isApplied ? 'var(--designlibre-accent, #4dabff)' : 'transparent'};
      background: ${rgbaToHex(style.color)};
      cursor: pointer;
      border-radius: 4px;
      transition: border-color 0.15s;
    `;

    btn.addEventListener('mouseenter', () => {
      if (!isApplied) {
        btn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (!isApplied) {
        btn.style.borderColor = 'transparent';
      }
    });

    btn.addEventListener('click', () => {
      // Apply this style to the node
      this.applyColorStyle(style, nodeId);
    });

    return btn;
  }

  /**
   * Create an applied style item with detach option.
   */
  private createAppliedStyleItem(style: ColorStyle, nodeId: NodeId): HTMLElement {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 4px;
      margin-bottom: 8px;
    `;

    const colorSwatch = document.createElement('div');
    colorSwatch.style.cssText = `
      width: 20px;
      height: 20px;
      background: ${rgbaToHex(style.color)};
      border-radius: 4px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    const name = document.createElement('span');
    name.textContent = style.name;
    name.style.cssText = `
      flex: 1;
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      color: var(--designlibre-text-primary, #e4e4e4);
    `;

    const detachBtn = document.createElement('button');
    detachBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    detachBtn.title = 'Detach style';
    detachBtn.style.cssText = `
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: var(--designlibre-text-muted, #6a6a6a);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    `;
    detachBtn.addEventListener('mouseenter', () => {
      detachBtn.style.backgroundColor = 'var(--designlibre-bg-tertiary, #252525)';
      detachBtn.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
    });
    detachBtn.addEventListener('mouseleave', () => {
      detachBtn.style.backgroundColor = 'transparent';
      detachBtn.style.color = 'var(--designlibre-text-muted, #6a6a6a)';
    });
    detachBtn.addEventListener('click', () => {
      this.detachColorStyle(nodeId);
    });

    item.appendChild(colorSwatch);
    item.appendChild(name);
    item.appendChild(detachBtn);

    return item;
  }

  /**
   * Show dialog to create a new style.
   */
  private showCreateStyleDialog(nodeId: NodeId): void {
    const node = this.runtime.getSceneGraph().getNode(nodeId);
    const bgColor = (node as { backgroundColor?: RGBA })?.backgroundColor ?? { r: 0.102, g: 0.102, b: 0.102, a: 1 };

    const name = prompt('Enter style name:', `Color ${this.runtime.getStyleManager().getColorStyles().length + 1}`);
    if (!name) return;

    const styleManager = this.runtime.getStyleManager();
    const style = styleManager.createColorStyle(name, bgColor);

    // Apply the style to the node
    this.applyColorStyle(style, nodeId);
  }

  /**
   * Apply a color style to a node.
   */
  private applyColorStyle(style: ColorStyle, nodeId: NodeId): void {
    this.updateNode(nodeId, {
      backgroundColor: style.color,
      colorStyleId: style.id,
    });
  }

  /**
   * Detach a color style from a node (keeps the color but removes style link).
   */
  private detachColorStyle(nodeId: NodeId): void {
    this.updateNode(nodeId, { colorStyleId: undefined });
  }

  /**
   * Render page export section.
   */
  private renderPageExportSection(nodeId: NodeId): void {
    if (!this.contentElement) return;

    const section = document.createElement('div');
    section.style.cssText = `margin-bottom: 16px;`;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    `;

    const title = document.createElement('div');
    title.textContent = 'Export';
    title.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      font-weight: 600;
      text-transform: uppercase;
      color: var(--designlibre-text-secondary, #a0a0a0);
      letter-spacing: 0.5px;
    `;

    const addBtn = document.createElement('button');
    addBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    addBtn.title = 'Add export preset';
    addBtn.style.cssText = `
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: var(--designlibre-text-secondary, #a0a0a0);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    `;
    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.backgroundColor = 'transparent';
    });
    addBtn.addEventListener('click', () => {
      // Add a new export preset
      this.addExportPreset(section, nodeId);
    });

    header.appendChild(title);
    header.appendChild(addBtn);
    section.appendChild(header);

    // Export presets container
    const presetsContainer = document.createElement('div');
    presetsContainer.className = 'export-presets-container';
    section.appendChild(presetsContainer);

    // Default export buttons
    const exportButtons = document.createElement('div');
    exportButtons.style.cssText = `display: flex; gap: 8px; margin-top: 8px;`;

    const pngBtn = this.createExportButton('PNG', () => {
      this.runtime.downloadPNG(nodeId).catch(console.error);
    });
    const svgBtn = this.createExportButton('SVG', () => {
      try {
        this.runtime.downloadSVG(nodeId);
      } catch (err) {
        console.error(err);
      }
    });

    exportButtons.appendChild(pngBtn);
    exportButtons.appendChild(svgBtn);
    section.appendChild(exportButtons);

    this.contentElement.appendChild(section);
  }

  private createExportButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      flex: 1;
      padding: 8px 16px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      cursor: pointer;
      transition: background 0.15s;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = 'var(--designlibre-bg-tertiary, #252525)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  private addExportPreset(section: HTMLElement, _nodeId: NodeId): void {
    const container = section.querySelector('.export-presets-container');
    if (!container) return;

    const preset = document.createElement('div');
    preset.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 4px;
      margin-bottom: 8px;
    `;

    // Scale selector
    const scaleSelect = document.createElement('select');
    scaleSelect.style.cssText = `
      padding: 4px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-primary, #1e1e1e);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
    `;
    ['1x', '2x', '3x', '4x'].forEach(scale => {
      const opt = document.createElement('option');
      opt.value = scale;
      opt.textContent = scale;
      scaleSelect.appendChild(opt);
    });

    // Format selector
    const formatSelect = document.createElement('select');
    formatSelect.style.cssText = scaleSelect.style.cssText;
    ['PNG', 'SVG', 'PDF', 'JPG'].forEach(format => {
      const opt = document.createElement('option');
      opt.value = format.toLowerCase();
      opt.textContent = format;
      formatSelect.appendChild(opt);
    });

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '×';
    removeBtn.style.cssText = `
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: var(--designlibre-text-muted, #6a6a6a);
      cursor: pointer;
      font-size: 16px;
      margin-left: auto;
    `;
    removeBtn.addEventListener('click', () => preset.remove());

    preset.appendChild(scaleSelect);
    preset.appendChild(formatSelect);
    preset.appendChild(removeBtn);
    container.appendChild(preset);
  }

  private renderNodeHeader(node: NodeData): void {
    if (!this.contentElement) return;

    const header = document.createElement('div');
    header.style.cssText = `
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    const name = document.createElement('div');
    name.style.cssText = `font-weight: 600; font-size: var(--designlibre-sidebar-font-size-lg, 14px); margin-bottom: 4px;`;
    name.textContent = node.name || 'Unnamed';
    header.appendChild(name);

    const type = document.createElement('div');
    type.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    type.textContent = node.type;
    header.appendChild(type);

    this.contentElement.appendChild(header);
  }

  private renderLayoutSection(node: NodeData, nodeId: NodeId): void {
    const section = this.createSection('Layout & Position');

    // X / Y Position
    if ('x' in node && 'y' in node) {
      const posRow = this.createPropertyRow2Col();
      posRow.appendChild(this.createNumberField('X', (node as FrameNodeData).x ?? 0, (v) => this.updateNode(nodeId, { x: v })));
      posRow.appendChild(this.createNumberField('Y', (node as FrameNodeData).y ?? 0, (v) => this.updateNode(nodeId, { y: v })));
      section.appendChild(posRow);
    }

    // Width / Height
    if ('width' in node && 'height' in node) {
      const sizeRow = this.createPropertyRow2Col();
      sizeRow.appendChild(this.createNumberField('W', (node as FrameNodeData).width ?? 0, (v) => this.updateNode(nodeId, { width: v })));
      sizeRow.appendChild(this.createNumberField('H', (node as FrameNodeData).height ?? 0, (v) => this.updateNode(nodeId, { height: v })));
      section.appendChild(sizeRow);
    }

    // Rotation
    if ('rotation' in node) {
      section.appendChild(this.createLabeledNumberField('Rotation', (node as FrameNodeData).rotation ?? 0, '°', (v) => this.updateNode(nodeId, { rotation: v })));
    }

    // Constraints
    if ('constraints' in node) {
      const constraints = (node as FrameNodeData).constraints;
      section.appendChild(this.createLabeledDropdown('Horizontal', constraints?.horizontal ?? 'MIN', ['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE'], (v) => {
        this.updateNode(nodeId, { constraints: { ...constraints, horizontal: v } });
      }));
      section.appendChild(this.createLabeledDropdown('Vertical', constraints?.vertical ?? 'MIN', ['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE'], (v) => {
        this.updateNode(nodeId, { constraints: { ...constraints, vertical: v } });
      }));
    }

    this.contentElement!.appendChild(section);
  }

  /**
   * Render appearance section with Opacity and Corner Radius controls.
   */
  private renderAppearanceSection(node: NodeData, nodeId: NodeId): void {
    const section = this.createSection('Appearance');

    // Opacity/Transparency control (for all scene nodes)
    if ('opacity' in node) {
      const opacityRow = this.createPropertyRow();

      const opacityLabel = document.createElement('span');
      opacityLabel.textContent = 'Opacity';
      opacityLabel.style.cssText = `
        width: 80px;
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        color: var(--designlibre-text-secondary, #a0a0a0);
      `;

      const opacity = (node as { opacity?: number }).opacity ?? 1;
      const opacityInput = document.createElement('input');
      opacityInput.type = 'number';
      opacityInput.min = '0';
      opacityInput.max = '100';
      opacityInput.value = String(Math.round(opacity * 100));
      opacityInput.style.cssText = `
        flex: 1;
        padding: 4px 8px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        text-align: right;
      `;
      opacityInput.addEventListener('change', () => {
        const val = Math.max(0, Math.min(100, parseInt(opacityInput.value) || 100));
        opacityInput.value = String(val);
        this.updateNode(nodeId, { opacity: val / 100 });
      });

      const opacityUnit = document.createElement('span');
      opacityUnit.textContent = '%';
      opacityUnit.style.cssText = `
        margin-left: 4px;
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        color: var(--designlibre-text-muted, #6a6a6a);
      `;

      opacityRow.appendChild(opacityLabel);
      opacityRow.appendChild(opacityInput);
      opacityRow.appendChild(opacityUnit);
      section.appendChild(opacityRow);
    }

    // Corner Radius control (for FRAME nodes only)
    if ('cornerRadius' in node) {
      const radiusRow = this.createPropertyRow();

      // Corner radius icon (rounded corner)
      const radiusIcon = document.createElement('span');
      radiusIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 20h4a8 8 0 0 0 8-8V4"/>
      </svg>`;
      radiusIcon.style.cssText = `
        display: flex;
        align-items: center;
        color: var(--designlibre-text-secondary, #a0a0a0);
        margin-right: 4px;
      `;

      const radiusLabel = document.createElement('span');
      radiusLabel.textContent = 'Radius';
      radiusLabel.style.cssText = `
        flex: 1;
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        color: var(--designlibre-text-secondary, #a0a0a0);
      `;

      const cornerRadius = (node as { cornerRadius?: number }).cornerRadius ?? 0;
      const radiusInput = document.createElement('input');
      radiusInput.type = 'number';
      radiusInput.min = '0';
      radiusInput.value = String(Math.round(cornerRadius));
      radiusInput.style.cssText = `
        width: 60px;
        padding: 4px 8px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        text-align: right;
      `;
      radiusInput.addEventListener('change', () => {
        const val = Math.max(0, parseInt(radiusInput.value) || 0);
        radiusInput.value = String(val);
        this.updateNode(nodeId, { cornerRadius: val });
      });

      const radiusUnit = document.createElement('span');
      radiusUnit.textContent = 'px';
      radiusUnit.style.cssText = `
        margin-left: 4px;
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        color: var(--designlibre-text-muted, #6a6a6a);
      `;

      radiusRow.appendChild(radiusIcon);
      radiusRow.appendChild(radiusLabel);
      radiusRow.appendChild(radiusInput);
      radiusRow.appendChild(radiusUnit);
      section.appendChild(radiusRow);
    }

    // Only append section if it has content
    if (section.children.length > 1) { // > 1 because section always has the header
      this.contentElement!.appendChild(section);
    }
  }

  private renderFillSection(node: FrameNodeData | VectorNodeData, nodeId: NodeId): void {
    const section = this.createSection('Fill');
    const fills = node.fills ?? [];

    if (fills.length === 0) {
      const noFill = document.createElement('div');
      noFill.style.cssText = `color: var(--designlibre-text-secondary); font-size: var(--designlibre-sidebar-font-size-xs, 11px); margin-bottom: 8px;`;
      noFill.textContent = 'No fill';
      section.appendChild(noFill);
    } else {
      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i]!;
        const fillRow = document.createElement('div');
        fillRow.style.cssText = `margin-bottom: 8px;`;

        if (fill.type === 'SOLID') {
          const solidFill = fill as SolidPaint;
          fillRow.appendChild(this.createColorField(
            solidFill.color,
            (color) => {
              const newFills = [...fills];
              newFills[i] = { ...solidFill, color } as SolidPaint;
              this.updateNode(nodeId, { fills: newFills });
              // Update last used fill color for new shapes
              this.runtime.setLastUsedFillColor(color);
            }
          ));

          // Opacity slider
          fillRow.appendChild(this.createSliderField('Opacity', (solidFill.opacity ?? 1) * 100, 0, 100, '%', (v) => {
            const newFills = [...fills];
            newFills[i] = { ...solidFill, opacity: v / 100 } as SolidPaint;
            this.updateNode(nodeId, { fills: newFills });
          }));
        }

        // Fill type dropdown
        fillRow.appendChild(this.createLabeledDropdown('Type', fill.type, ['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'IMAGE'], (_v) => {
          // Type changes require restructuring the paint object - skip for now
        }));

        section.appendChild(fillRow);
      }
    }

    // Add fill button
    section.appendChild(this.createButton('+ Add Fill', () => {
      const lastColor = this.runtime.getLastUsedFillColor();
      const newFills = [...fills, { type: 'SOLID' as const, visible: true, opacity: 1, color: lastColor }];
      this.updateNode(nodeId, { fills: newFills });
    }));

    this.contentElement!.appendChild(section);
  }

  private renderStrokeSection(node: VectorNodeData, nodeId: NodeId): void {
    const section = this.createSection('Stroke');
    const strokes = node.strokes ?? [];

    if (strokes.length === 0) {
      const noStroke = document.createElement('div');
      noStroke.style.cssText = `color: var(--designlibre-text-secondary); font-size: var(--designlibre-sidebar-font-size-xs, 11px); margin-bottom: 8px;`;
      noStroke.textContent = 'No stroke';
      section.appendChild(noStroke);
    } else {
      for (let i = 0; i < strokes.length; i++) {
        const stroke = strokes[i]!;
        const strokeRow = document.createElement('div');
        strokeRow.style.cssText = `margin-bottom: 8px;`;

        if (stroke.type === 'SOLID') {
          const solidStroke = stroke as SolidPaint;
          strokeRow.appendChild(this.createColorField(
            solidStroke.color,
            (color) => {
              const newStrokes = [...strokes];
              newStrokes[i] = { ...solidStroke, color } as SolidPaint;
              this.updateNode(nodeId, { strokes: newStrokes });
            }
          ));
        }

        section.appendChild(strokeRow);
      }
    }

    // Stroke weight
    section.appendChild(this.createLabeledNumberField('Weight', node.strokeWeight ?? 1, 'px', (v) => {
      this.updateNode(nodeId, { strokeWeight: v });
    }));

    // Stroke style (dash pattern)
    const hasDash = node.dashPattern && node.dashPattern.length > 0;
    section.appendChild(this.createLabeledDropdown('Style', hasDash ? 'Dashed' : 'Solid', ['Solid', 'Dashed', 'Dotted'], (v) => {
      let dashPattern: number[] = [];
      if (v === 'Dashed') dashPattern = [8, 4];
      else if (v === 'Dotted') dashPattern = [2, 2];
      this.updateNode(nodeId, { dashPattern });
    }));

    // Stroke position
    section.appendChild(this.createLabeledDropdown('Position', node.strokeAlign ?? 'CENTER', ['INSIDE', 'CENTER', 'OUTSIDE'], (v) => {
      this.updateNode(nodeId, { strokeAlign: v as 'INSIDE' | 'CENTER' | 'OUTSIDE' });
    }));

    this.contentElement!.appendChild(section);
  }

  private renderPathOperationsSection(node: VectorNodeData, nodeId: NodeId): void {
    const section = this.createSection('Path Operations');
    const paths = node.vectorPaths ?? [];

    if (paths.length === 0) {
      const noPath = document.createElement('div');
      noPath.style.cssText = `color: var(--designlibre-text-secondary); font-size: var(--designlibre-sidebar-font-size-xs, 11px); margin-bottom: 8px;`;
      noPath.textContent = 'No path data';
      section.appendChild(noPath);
      this.contentElement!.appendChild(section);
      return;
    }

    // Path stats
    const primaryPath = paths[0]!;
    const stats = getPathStats(primaryPath);
    const statsRow = document.createElement('div');
    statsRow.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
      margin-bottom: 12px;
      line-height: 1.4;
    `;
    statsRow.textContent = `${stats.anchorCount} anchors • ${stats.segmentCount} ${stats.segmentCount === 1 ? 'segment' : 'segments'} • ${stats.isClosed ? 'Closed' : 'Open'}`;
    section.appendChild(statsRow);

    // Operation buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 12px;
    `;

    // Reverse path button
    buttonsContainer.appendChild(this.createPathOpButton('Reverse', '↻', () => {
      const newPaths = paths.map(p => reversePath(p));
      this.updateNode(nodeId, { vectorPaths: newPaths });
    }));

    // Close/Open path button
    const closeOpenLabel = stats.isClosed ? 'Open' : 'Close';
    const closeOpenIcon = stats.isClosed ? '⊏' : '○';
    buttonsContainer.appendChild(this.createPathOpButton(closeOpenLabel, closeOpenIcon, () => {
      const newPaths = paths.map(p => stats.isClosed ? openPath(p) : closePath(p));
      this.updateNode(nodeId, { vectorPaths: newPaths });
    }));

    // Simplify button
    buttonsContainer.appendChild(this.createPathOpButton('Simplify', '⊟', () => {
      const newPaths = paths.map(p => simplifyPath(p, { tolerance: 2, cornerThreshold: 45 }));
      this.updateNode(nodeId, { vectorPaths: newPaths });
    }));

    // Flatten button
    buttonsContainer.appendChild(this.createPathOpButton('Flatten', '⊞', () => {
      const newPaths = paths.map(p => flattenPath(p, { tolerance: 1, maxSegmentLength: 20 }));
      this.updateNode(nodeId, { vectorPaths: newPaths });
    }));

    // Break button (break closed path at first anchor)
    if (stats.isClosed) {
      buttonsContainer.appendChild(this.createPathOpButton('Break', '✂', () => {
        const newPaths = paths.map(p => breakPathAtAnchor(p, 0));
        this.updateNode(nodeId, { vectorPaths: newPaths });
      }));
    }

    section.appendChild(buttonsContainer);

    // Outline Stroke button (full width)
    const outlineBtn = document.createElement('button');
    outlineBtn.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    `;
    outlineBtn.innerHTML = `<span style="font-size: 14px;">◇</span> Outline Stroke`;
    outlineBtn.title = 'Convert stroke to filled paths';
    outlineBtn.addEventListener('mouseenter', () => {
      outlineBtn.style.borderColor = 'var(--designlibre-accent, #4dabff)';
      outlineBtn.style.background = 'var(--designlibre-bg-hover, #3d3d3d)';
    });
    outlineBtn.addEventListener('mouseleave', () => {
      outlineBtn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      outlineBtn.style.background = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });
    outlineBtn.addEventListener('click', () => {
      const strokeWeight = node.strokeWeight ?? 1;
      // Outline all paths and flatten results
      const outlinedPaths = paths.flatMap(p =>
        outlineStroke(p, {
          strokeWeight,
          cap: 'round',
          join: 'round',
          miterLimit: 4,
        })
      );
      // Create new vector node with outlined paths and no stroke
      this.updateNode(nodeId, {
        vectorPaths: outlinedPaths,
        strokes: [],
        strokeWeight: 0,
      });
    });
    section.appendChild(outlineBtn);

    // Simplify tolerance slider
    const toleranceRow = document.createElement('div');
    toleranceRow.style.cssText = `
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    const toleranceLabel = document.createElement('div');
    toleranceLabel.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
    `;
    const toleranceLabelText = document.createElement('span');
    toleranceLabelText.textContent = 'Simplify Tolerance';
    const toleranceValue = document.createElement('span');
    toleranceValue.textContent = '2px';
    toleranceLabel.appendChild(toleranceLabelText);
    toleranceLabel.appendChild(toleranceValue);
    toleranceRow.appendChild(toleranceLabel);

    const toleranceSlider = document.createElement('input');
    toleranceSlider.type = 'range';
    toleranceSlider.min = '0.5';
    toleranceSlider.max = '10';
    toleranceSlider.step = '0.5';
    toleranceSlider.value = '2';
    toleranceSlider.style.cssText = `
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    `;
    toleranceSlider.addEventListener('input', () => {
      toleranceValue.textContent = `${toleranceSlider.value}px`;
    });
    toleranceSlider.addEventListener('change', () => {
      const tolerance = parseFloat(toleranceSlider.value);
      const newPaths = paths.map(p => simplifyPath(p, { tolerance, cornerThreshold: 45 }));
      this.updateNode(nodeId, { vectorPaths: newPaths });
    });
    toleranceRow.appendChild(toleranceSlider);
    section.appendChild(toleranceRow);

    this.contentElement!.appendChild(section);
  }

  private createPathOpButton(label: string, icon: string, onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.style.cssText = `
      padding: 8px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    `;
    btn.innerHTML = `<span style="font-size: 12px;">${icon}</span> ${label}`;
    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = 'var(--designlibre-accent, #4dabff)';
      btn.style.background = 'var(--designlibre-bg-hover, #3d3d3d)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      btn.style.background = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  private renderEffectsSection(node: FrameNodeData, nodeId: NodeId): void {
    const section = this.createSection('Effects');
    const effects = node.effects ?? [];

    // Drop Shadow
    const dropShadow = effects.find(e => e.type === 'DROP_SHADOW');
    section.appendChild(this.createToggleWithFields('Drop Shadow', !!dropShadow, (enabled) => {
      if (enabled) {
        const newEffects = [...effects, { type: 'DROP_SHADOW' as const, visible: true, color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 8, spread: 0 }];
        this.updateNode(nodeId, { effects: newEffects });
      } else {
        const newEffects = effects.filter(e => e.type !== 'DROP_SHADOW');
        this.updateNode(nodeId, { effects: newEffects });
      }
    }));

    // Inner Shadow
    const innerShadow = effects.find(e => e.type === 'INNER_SHADOW');
    section.appendChild(this.createToggleWithFields('Inner Shadow', !!innerShadow, (enabled) => {
      if (enabled) {
        const newEffects = [...effects, { type: 'INNER_SHADOW' as const, visible: true, color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0 }];
        this.updateNode(nodeId, { effects: newEffects });
      } else {
        const newEffects = effects.filter(e => e.type !== 'INNER_SHADOW');
        this.updateNode(nodeId, { effects: newEffects });
      }
    }));

    // Layer Blur
    const layerBlur = effects.find(e => e.type === 'BLUR');
    section.appendChild(this.createToggleWithFields('Layer Blur', !!layerBlur, (enabled) => {
      if (enabled) {
        const newEffects = [...effects, { type: 'BLUR' as const, visible: true, radius: 10 }];
        this.updateNode(nodeId, { effects: newEffects });
      } else {
        const newEffects = effects.filter(e => e.type !== 'BLUR');
        this.updateNode(nodeId, { effects: newEffects });
      }
    }));

    // Background Blur
    const bgBlur = effects.find(e => e.type === 'BACKGROUND_BLUR');
    section.appendChild(this.createToggleWithFields('Background Blur', !!bgBlur, (enabled) => {
      if (enabled) {
        const newEffects = [...effects, { type: 'BACKGROUND_BLUR' as const, visible: true, radius: 10 }];
        this.updateNode(nodeId, { effects: newEffects });
      } else {
        const newEffects = effects.filter(e => e.type !== 'BACKGROUND_BLUR');
        this.updateNode(nodeId, { effects: newEffects });
      }
    }));

    this.contentElement!.appendChild(section);
  }

  private renderTextSection(node: TextNodeData, nodeId: NodeId): void {
    const section = this.createSection('Text');

    // Get first text style for display (simplified - real impl would be more complex)
    const firstStyle = node.textStyles?.[0];
    const fontFamily = firstStyle?.fontFamily ?? 'Inter';
    const fontWeight = firstStyle?.fontWeight ?? 400;
    const fontSize = firstStyle?.fontSize ?? 14;

    // Text Fill Color
    const textFills = firstStyle?.fills ?? [];
    const solidFill = textFills.find(f => f.type === 'SOLID' && f.visible !== false) as SolidPaint | undefined;
    if (solidFill) {
      section.appendChild(this.createColorField(
        solidFill.color,
        (color) => {
          // Update the text style fills
          const newTextStyles = node.textStyles?.map(style => ({
            ...style,
            fills: style.fills?.map(fill =>
              fill.type === 'SOLID' ? { ...fill, color } as SolidPaint : fill
            ) ?? [{ type: 'SOLID' as const, color, visible: true, opacity: 1 }],
          })) ?? [{
            start: 0,
            end: node.characters?.length ?? 0,
            fontSize: 14,
            fontWeight: 400,
            fontFamily: 'Inter',
            lineHeight: 18,
            letterSpacing: 0,
            textDecoration: 'NONE' as const,
            fills: [{ type: 'SOLID' as const, color, visible: true, opacity: 1 }],
          }];
          this.updateNode(nodeId, { textStyles: newTextStyles });
        }
      ));
    } else {
      // No fill yet, add a button to add one
      section.appendChild(this.createButton('+ Add Text Color', () => {
        const lastColor = this.runtime.getLastUsedFillColor();
        const newTextStyles = node.textStyles?.map(style => ({
          ...style,
          fills: [{ type: 'SOLID' as const, color: lastColor, visible: true, opacity: 1 }],
        })) ?? [{
          start: 0,
          end: node.characters?.length ?? 0,
          fontSize: 14,
          fontWeight: 400,
          fontFamily: 'Inter',
          lineHeight: 18,
          letterSpacing: 0,
          textDecoration: 'NONE' as const,
          fills: [{ type: 'SOLID' as const, color: lastColor, visible: true, opacity: 1 }],
        }];
        this.updateNode(nodeId, { textStyles: newTextStyles });
      }));
    }

    // Font Family
    section.appendChild(this.createLabeledDropdown('Font', fontFamily, ['Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New'], (v) => {
      const newTextStyles = node.textStyles?.map(style => ({
        ...style,
        fontFamily: v,
      }));
      this.updateNode(nodeId, { textStyles: newTextStyles });
    }));

    // Font Weight
    section.appendChild(this.createLabeledDropdown('Weight', String(fontWeight), ['100', '200', '300', '400', '500', '600', '700', '800', '900'], (v) => {
      const newTextStyles = node.textStyles?.map(style => ({
        ...style,
        fontWeight: parseInt(v, 10),
      }));
      this.updateNode(nodeId, { textStyles: newTextStyles });
    }));

    // Font Size
    section.appendChild(this.createLabeledNumberField('Size', fontSize, 'px', (v) => {
      const newTextStyles = node.textStyles?.map(style => ({
        ...style,
        fontSize: v,
        lineHeight: v * 1.2,
      }));
      this.updateNode(nodeId, { textStyles: newTextStyles });
    }));

    // Text Align
    section.appendChild(this.createLabeledDropdown('Align', node.textAlignHorizontal ?? 'LEFT', ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'], (v) => {
      this.updateNode(nodeId, { textAlignHorizontal: v as 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED' });
    }));

    this.contentElement!.appendChild(section);
  }

  // =========================================================================
  // Prototype Panel
  // =========================================================================

  private renderPrototypePanel(nodes: NodeData[]): void {
    if (!this.contentElement) return;
    const node = nodes[0]!;

    this.renderNodeHeader(node);

    // Get interaction manager from runtime
    const interactionManager = this.runtime.getInteractionManager?.();
    const existingInteractions = interactionManager?.getInteractionsForNode(node.id) ?? [];

    // Interactions section
    const section = this.createSection('Interactions');

    // Render existing interactions
    if (existingInteractions.length > 0) {
      for (const interaction of existingInteractions) {
        section.appendChild(this.renderInteractionRow(node.id, interaction));
      }
    }

    // Add interaction button
    const addBtn = document.createElement('button');
    addBtn.className = 'designlibre-add-interaction-btn';
    addBtn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 10px 12px;
      margin-top: 8px;
      background: transparent;
      border: 1px dashed var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      color: var(--designlibre-text-muted, #888888);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    addBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add interaction
    `;
    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.borderColor = 'var(--designlibre-primary, #3b82f6)';
      addBtn.style.color = 'var(--designlibre-primary, #3b82f6)';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      addBtn.style.color = 'var(--designlibre-text-muted, #888888)';
    });
    addBtn.addEventListener('click', () => {
      this.showAddInteractionUI(node.id, section, addBtn);
    });

    section.appendChild(addBtn);
    this.contentElement.appendChild(section);

    // Prototype tips
    if (existingInteractions.length === 0) {
      const tip = document.createElement('div');
      tip.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        border-radius: 6px;
        font-size: 12px;
        color: var(--designlibre-text-muted, #888888);
        line-height: 1.5;
      `;
      tip.innerHTML = `
        <strong style="color: var(--designlibre-text, #ffffff);">Tip:</strong>
        Click "Add interaction" to create clickable hotspots that navigate between frames.
      `;
      this.contentElement.appendChild(tip);
    }

    // Variables section
    this.renderVariablesSection();

    // State bindings section (for connecting properties to variables)
    this.renderStateBindingsSection(node);

    // Event handlers section (for code generation)
    this.renderEventHandlersSection(node);
  }

  /**
   * Render the Variables section in the Prototype panel
   */
  private renderVariablesSection(): void {
    if (!this.contentElement) return;

    const variableManager = this.runtime.getVariableManager?.();
    if (!variableManager) return;

    const section = this.createSection('Variables');

    const allVariables = variableManager.getAllDefinitions();

    // Render existing variables
    if (allVariables.length > 0) {
      const variablesList = document.createElement('div');
      variablesList.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 6px;
      `;

      for (const variable of allVariables) {
        variablesList.appendChild(this.renderVariableRow(variable));
      }

      section.appendChild(variablesList);
    }

    // Add variable button
    const addBtn = document.createElement('button');
    addBtn.className = 'designlibre-add-variable-btn';
    addBtn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 10px 12px;
      margin-top: 8px;
      background: transparent;
      border: 1px dashed var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      color: var(--designlibre-text-muted, #888888);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    addBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add variable
    `;
    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.borderColor = 'var(--designlibre-primary, #3b82f6)';
      addBtn.style.color = 'var(--designlibre-primary, #3b82f6)';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      addBtn.style.color = 'var(--designlibre-text-muted, #888888)';
    });
    addBtn.addEventListener('click', () => {
      this.showAddVariableUI(section, addBtn);
    });

    section.appendChild(addBtn);
    this.contentElement.appendChild(section);
  }

  /**
   * Render the State Bindings section - connects node properties to variables
   */
  private renderStateBindingsSection(node: NodeData): void {
    if (!this.contentElement) return;

    const variableManager = this.runtime.getVariableManager?.();
    const allVariables = variableManager?.getAllDefinitions() ?? [];

    // Skip if no variables defined
    if (allVariables.length === 0) return;

    const section = this.createSection('State Bindings');

    // Get existing state bindings from semantic metadata
    const pluginData = (node as NodeData & { pluginData?: Record<string, unknown> }).pluginData ?? {};
    const semanticData = getSemanticMetadata(pluginData);
    const stateBindings = semanticData?.stateBindings ?? [];

    // Bindable properties based on node type
    const bindableProperties = this.getBindableProperties(node);

    // Render existing bindings
    if (stateBindings.length > 0) {
      const bindingsList = document.createElement('div');
      bindingsList.style.cssText = `display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;`;

      for (const binding of stateBindings) {
        bindingsList.appendChild(this.renderStateBindingRow(node, binding, allVariables));
      }
      section.appendChild(bindingsList);
    }

    // Add binding button
    const addBtn = document.createElement('button');
    addBtn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 8px 10px;
      background: transparent;
      border: 1px dashed var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      color: var(--designlibre-text-muted, #888888);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    addBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Bind property to variable
    `;
    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.borderColor = 'var(--designlibre-primary, #3b82f6)';
      addBtn.style.color = 'var(--designlibre-primary, #3b82f6)';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      addBtn.style.color = 'var(--designlibre-text-muted, #888888)';
    });
    addBtn.addEventListener('click', () => {
      this.showAddStateBindingUI(node, section, addBtn, bindableProperties, allVariables);
    });

    section.appendChild(addBtn);
    this.contentElement.appendChild(section);
  }

  /**
   * Get bindable properties for a node based on its type
   */
  private getBindableProperties(node: NodeData): Array<{ path: string[]; label: string; type: 'string' | 'number' | 'boolean' | 'color' }> {
    const properties: Array<{ path: string[]; label: string; type: 'string' | 'number' | 'boolean' | 'color' }> = [];

    // Common properties
    properties.push(
      { path: ['visible'], label: 'Visible', type: 'boolean' },
      { path: ['opacity'], label: 'Opacity', type: 'number' },
      { path: ['x'], label: 'X Position', type: 'number' },
      { path: ['y'], label: 'Y Position', type: 'number' },
      { path: ['width'], label: 'Width', type: 'number' },
      { path: ['height'], label: 'Height', type: 'number' },
      { path: ['rotation'], label: 'Rotation', type: 'number' }
    );

    // Text-specific properties
    if (node.type === 'TEXT') {
      properties.push(
        { path: ['characters'], label: 'Text Content', type: 'string' },
        { path: ['fontSize'], label: 'Font Size', type: 'number' }
      );
    }

    // Fill color (if node has fills)
    if ('fills' in node) {
      properties.push(
        { path: ['fills', '0', 'color'], label: 'Fill Color', type: 'color' }
      );
    }

    // Stroke color
    if ('strokes' in node) {
      properties.push(
        { path: ['strokes', '0', 'color'], label: 'Stroke Color', type: 'color' },
        { path: ['strokeWeight'], label: 'Stroke Weight', type: 'number' }
      );
    }

    // Corner radius
    if ('cornerRadius' in node) {
      properties.push(
        { path: ['cornerRadius'], label: 'Corner Radius', type: 'number' }
      );
    }

    return properties;
  }

  /**
   * Render a single state binding row
   */
  private renderStateBindingRow(
    node: NodeData,
    binding: StateBinding,
    allVariables: VariableDefinition[]
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
      font-size: 11px;
    `;

    // Property label
    const propertyLabel = document.createElement('span');
    propertyLabel.style.cssText = `
      color: var(--designlibre-text-muted, #888888);
      flex-shrink: 0;
    `;
    propertyLabel.textContent = binding.propertyPath.join('.');
    row.appendChild(propertyLabel);

    // Arrow
    const arrow = document.createElement('span');
    arrow.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    `;
    arrow.style.cssText = `opacity: 0.5; flex-shrink: 0;`;
    row.appendChild(arrow);

    // Variable name
    const variable = allVariables.find(v => v.id === binding.variableId);
    const variableName = document.createElement('span');
    variableName.style.cssText = `
      color: var(--designlibre-primary, #3b82f6);
      font-weight: 500;
      flex: 1;
    `;
    variableName.textContent = variable?.name ?? binding.variableId;
    row.appendChild(variableName);

    // Transform badge
    if (binding.transform !== 'direct') {
      const transformBadge = document.createElement('span');
      transformBadge.style.cssText = `
        padding: 2px 6px;
        background: var(--designlibre-bg-tertiary, #3d3d3d);
        border-radius: 4px;
        font-size: 10px;
        color: var(--designlibre-text-muted, #888888);
      `;
      transformBadge.textContent = binding.transform;
      row.appendChild(transformBadge);
    }

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.style.cssText = `
      padding: 2px;
      background: transparent;
      border: none;
      color: var(--designlibre-text-muted, #888888);
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.15s;
    `;
    deleteBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.opacity = '1'; });
    deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.opacity = '0.6'; });
    deleteBtn.addEventListener('click', () => {
      this.removeStateBinding(node, binding);
    });
    row.appendChild(deleteBtn);

    return row;
  }

  /**
   * Show UI for adding a new state binding
   */
  private showAddStateBindingUI(
    node: NodeData,
    container: HTMLElement,
    addBtn: HTMLElement,
    bindableProperties: Array<{ path: string[]; label: string; type: 'string' | 'number' | 'boolean' | 'color' }>,
    allVariables: VariableDefinition[]
  ): void {
    addBtn.style.display = 'none';

    const form = document.createElement('div');
    form.style.cssText = `
      padding: 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;

    // Property selector
    const propertyLabel = document.createElement('label');
    propertyLabel.textContent = 'Property';
    propertyLabel.style.cssText = `font-size: 11px; color: var(--designlibre-text-muted, #888888);`;
    form.appendChild(propertyLabel);

    const propertySelect = document.createElement('select');
    propertySelect.style.cssText = `
      padding: 6px 8px;
      background: var(--designlibre-bg-tertiary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #ffffff);
      font-size: 12px;
    `;
    for (const prop of bindableProperties) {
      const option = document.createElement('option');
      option.value = prop.path.join('.');
      option.textContent = prop.label;
      option.dataset['type'] = prop.type;
      propertySelect.appendChild(option);
    }
    form.appendChild(propertySelect);

    // Variable selector
    const variableLabel = document.createElement('label');
    variableLabel.textContent = 'Variable';
    variableLabel.style.cssText = `font-size: 11px; color: var(--designlibre-text-muted, #888888);`;
    form.appendChild(variableLabel);

    const variableSelect = document.createElement('select');
    variableSelect.style.cssText = `
      padding: 6px 8px;
      background: var(--designlibre-bg-tertiary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #ffffff);
      font-size: 12px;
    `;
    for (const variable of allVariables) {
      const option = document.createElement('option');
      option.value = variable.id;
      option.textContent = `${variable.name} (${variable.type})`;
      variableSelect.appendChild(option);
    }
    form.appendChild(variableSelect);

    // Transform selector
    const transformLabel = document.createElement('label');
    transformLabel.textContent = 'Transform';
    transformLabel.style.cssText = `font-size: 11px; color: var(--designlibre-text-muted, #888888);`;
    form.appendChild(transformLabel);

    const transformSelect = document.createElement('select');
    transformSelect.style.cssText = `
      padding: 6px 8px;
      background: var(--designlibre-bg-tertiary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #ffffff);
      font-size: 12px;
    `;
    const transforms: Array<{ value: BindingTransform; label: string }> = [
      { value: 'direct', label: 'Direct (use value as-is)' },
      { value: 'not', label: 'Not (boolean negation)' },
      { value: 'equals', label: 'Equals (compare to value)' },
      { value: 'notEquals', label: 'Not Equals' },
      { value: 'expression', label: 'Expression' },
      { value: 'format', label: 'Format string' },
    ];
    for (const t of transforms) {
      const option = document.createElement('option');
      option.value = t.value;
      option.textContent = t.label;
      transformSelect.appendChild(option);
    }
    form.appendChild(transformSelect);

    // Compare value input (shown for equals/notEquals)
    const compareValueContainer = document.createElement('div');
    compareValueContainer.style.cssText = `display: none; flex-direction: column; gap: 4px;`;
    const compareValueLabel = document.createElement('label');
    compareValueLabel.textContent = 'Compare Value';
    compareValueLabel.style.cssText = `font-size: 11px; color: var(--designlibre-text-muted, #888888);`;
    compareValueContainer.appendChild(compareValueLabel);
    const compareValueInput = document.createElement('input');
    compareValueInput.type = 'text';
    compareValueInput.style.cssText = `
      padding: 6px 8px;
      background: var(--designlibre-bg-tertiary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #ffffff);
      font-size: 12px;
    `;
    compareValueContainer.appendChild(compareValueInput);
    form.appendChild(compareValueContainer);

    // Expression input (shown for expression transform)
    const expressionContainer = document.createElement('div');
    expressionContainer.style.cssText = `display: none; flex-direction: column; gap: 4px;`;
    const expressionLabel = document.createElement('label');
    expressionLabel.textContent = 'Expression';
    expressionLabel.style.cssText = `font-size: 11px; color: var(--designlibre-text-muted, #888888);`;
    expressionContainer.appendChild(expressionLabel);
    const expressionInput = document.createElement('input');
    expressionInput.type = 'text';
    expressionInput.placeholder = 'e.g., value * 100';
    expressionInput.style.cssText = `
      padding: 6px 8px;
      background: var(--designlibre-bg-tertiary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #ffffff);
      font-size: 12px;
    `;
    expressionContainer.appendChild(expressionInput);
    form.appendChild(expressionContainer);

    // Show/hide compare/expression based on transform
    transformSelect.addEventListener('change', () => {
      const val = transformSelect.value as BindingTransform;
      compareValueContainer.style.display = (val === 'equals' || val === 'notEquals') ? 'flex' : 'none';
      expressionContainer.style.display = val === 'expression' ? 'flex' : 'none';
    });

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = `display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;`;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 6px 12px;
      background: transparent;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #ffffff);
      font-size: 12px;
      cursor: pointer;
    `;
    cancelBtn.addEventListener('click', () => {
      form.remove();
      addBtn.style.display = 'flex';
    });
    btnRow.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Add Binding';
    saveBtn.style.cssText = `
      padding: 6px 12px;
      background: var(--designlibre-primary, #3b82f6);
      border: none;
      border-radius: 4px;
      color: white;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    `;
    saveBtn.addEventListener('click', () => {
      const selectedProp = bindableProperties.find(p => p.path.join('.') === propertySelect.value);
      if (!selectedProp) return;

      const transform = transformSelect.value as BindingTransform;
      const binding: StateBinding = {
        propertyPath: selectedProp.path,
        variableId: variableSelect.value,
        transform,
      };

      if (transform === 'equals' || transform === 'notEquals') {
        binding.compareValue = compareValueInput.value;
      }
      if (transform === 'expression') {
        binding.expression = expressionInput.value;
      }

      this.addStateBinding(node, binding);
      form.remove();
      addBtn.style.display = 'flex';
    });
    btnRow.appendChild(saveBtn);

    form.appendChild(btnRow);
    container.insertBefore(form, addBtn);
  }

  /**
   * Add a state binding to a node
   */
  private addStateBinding(node: NodeData, binding: StateBinding): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const pluginData = (node as NodeData & { pluginData?: Record<string, unknown> }).pluginData ?? {};
    let semanticData = getSemanticMetadata(pluginData);

    if (!semanticData) {
      semanticData = createSemanticMetadata('Custom');
    }

    const existingBindings = semanticData.stateBindings ?? [];
    const updatedBindings = [...existingBindings, binding];

    const updatedMetadata: SemanticMetadata = {
      ...semanticData,
      stateBindings: updatedBindings,
    };

    const updatedPluginData = setSemanticMetadata(pluginData, updatedMetadata);
    sceneGraph.updateNode(node.id, { pluginData: updatedPluginData } as Partial<NodeData>);
    this.updateContent();
  }

  /**
   * Remove a state binding from a node
   */
  private removeStateBinding(node: NodeData, bindingToRemove: StateBinding): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const pluginData = (node as NodeData & { pluginData?: Record<string, unknown> }).pluginData ?? {};
    const semanticData = getSemanticMetadata(pluginData);

    if (!semanticData || !semanticData.stateBindings) return;

    const updatedBindings = semanticData.stateBindings.filter(
      b => !(b.propertyPath.join('.') === bindingToRemove.propertyPath.join('.') &&
             b.variableId === bindingToRemove.variableId)
    );

    let updatedMetadata: SemanticMetadata = { ...semanticData };
    if (updatedBindings.length > 0) {
      updatedMetadata = { ...updatedMetadata, stateBindings: updatedBindings };
    } else {
      // Remove stateBindings property entirely
      const { stateBindings: _, ...rest } = updatedMetadata;
      updatedMetadata = rest as SemanticMetadata;
    }

    const updatedPluginData = setSemanticMetadata(pluginData, updatedMetadata);
    sceneGraph.updateNode(node.id, { pluginData: updatedPluginData } as Partial<NodeData>);
    this.updateContent();
  }

  // =========================================================================
  // Event Handlers Section
  // =========================================================================

  /**
   * Render the Event Handlers section in the Prototype panel
   */
  private renderEventHandlersSection(node: NodeData): void {
    if (!this.contentElement) return;

    const section = this.createSection('Event Handlers');

    // Info text
    const info = document.createElement('div');
    info.style.cssText = `
      font-size: 11px;
      color: var(--designlibre-text-muted, #888888);
      margin-bottom: 8px;
      line-height: 1.4;
    `;
    info.textContent = 'Configure event handlers for code generation. These define the interactive behavior of this component.';
    section.appendChild(info);

    // Get existing event handlers from semantic metadata
    const pluginData = (node as NodeData & { pluginData?: Record<string, unknown> }).pluginData ?? {};
    const semanticData = getSemanticMetadata(pluginData);
    const eventHandlers = semanticData?.eventHandlers ?? [];

    // Render existing handlers
    if (eventHandlers.length > 0) {
      const handlersList = document.createElement('div');
      handlersList.style.cssText = `display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;`;

      for (let i = 0; i < eventHandlers.length; i++) {
        const handler = eventHandlers[i]!;
        handlersList.appendChild(this.renderEventHandlerRow(node, handler, i));
      }
      section.appendChild(handlersList);
    }

    // Add handler button
    const addBtn = document.createElement('button');
    addBtn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 8px 10px;
      background: transparent;
      border: 1px dashed var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      color: var(--designlibre-text-muted, #888888);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    addBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add event handler
    `;
    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.borderColor = 'var(--designlibre-primary, #3b82f6)';
      addBtn.style.color = 'var(--designlibre-primary, #3b82f6)';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      addBtn.style.color = 'var(--designlibre-text-muted, #888888)';
    });
    addBtn.addEventListener('click', () => {
      this.showAddEventHandlerUI(node, section, addBtn);
    });

    section.appendChild(addBtn);
    this.contentElement.appendChild(section);
  }

  /**
   * Render a single event handler row
   */
  private renderEventHandlerRow(
    node: NodeData,
    handler: SemanticEventHandler,
    index: number
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
      font-size: 11px;
    `;

    // Event type badge
    const eventBadge = document.createElement('span');
    eventBadge.style.cssText = `
      padding: 2px 6px;
      background: var(--designlibre-primary-muted, #1d4ed8);
      border-radius: 4px;
      color: var(--designlibre-primary, #3b82f6);
      font-size: 10px;
      font-weight: 500;
    `;
    eventBadge.textContent = handler.event;
    row.appendChild(eventBadge);

    // Arrow
    const arrow = document.createElement('span');
    arrow.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    `;
    arrow.style.cssText = `opacity: 0.5; flex-shrink: 0;`;
    row.appendChild(arrow);

    // Action type
    const actionSpan = document.createElement('span');
    actionSpan.style.cssText = `
      color: var(--designlibre-text, #ffffff);
      flex: 1;
    `;
    actionSpan.textContent = this.formatActionType(handler.actionType, handler.actionConfig);
    row.appendChild(actionSpan);

    // Handler name (if custom)
    if (handler.handlerName) {
      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = `
        color: var(--designlibre-text-muted, #888888);
        font-family: monospace;
        font-size: 10px;
      `;
      nameSpan.textContent = handler.handlerName;
      row.appendChild(nameSpan);
    }

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.style.cssText = `
      padding: 2px;
      background: transparent;
      border: none;
      color: var(--designlibre-text-muted, #888888);
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.15s;
    `;
    deleteBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.opacity = '1'; });
    deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.opacity = '0.6'; });
    deleteBtn.addEventListener('click', () => {
      this.removeEventHandler(node, index);
    });
    row.appendChild(deleteBtn);

    return row;
  }

  /**
   * Format action type for display
   */
  private formatActionType(actionType: ActionType, config: Record<string, unknown>): string {
    switch (actionType) {
      case 'navigate':
        return `Navigate to ${config['destination'] ?? 'screen'}`;
      case 'setVariable':
        return `Set ${config['variableId'] ?? 'variable'}`;
      case 'toggleVariable':
        return `Toggle ${config['variableId'] ?? 'variable'}`;
      case 'incrementVariable':
        return `Increment ${config['variableId'] ?? 'variable'}`;
      case 'apiCall':
        return `API: ${config['method'] ?? 'GET'} ${config['endpoint'] ?? '/api'}`;
      case 'openUrl':
        return `Open ${config['url'] ?? 'URL'}`;
      case 'showModal':
        return `Show modal`;
      case 'hideModal':
        return `Hide modal`;
      case 'showToast':
        return `Show toast: ${config['message'] ?? '...'}`;
      case 'custom':
        return config['description'] as string ?? 'Custom action';
      default:
        return actionType;
    }
  }

  /**
   * Show UI for adding a new event handler
   */
  private showAddEventHandlerUI(
    node: NodeData,
    container: HTMLElement,
    addBtn: HTMLElement
  ): void {
    addBtn.style.display = 'none';

    const form = document.createElement('div');
    form.style.cssText = `
      padding: 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;

    // Event type selector
    const eventLabel = document.createElement('label');
    eventLabel.textContent = 'Event';
    eventLabel.style.cssText = `font-size: 11px; color: var(--designlibre-text-muted, #888888);`;
    form.appendChild(eventLabel);

    const eventSelect = document.createElement('select');
    eventSelect.style.cssText = `
      padding: 6px 8px;
      background: var(--designlibre-bg-tertiary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #ffffff);
      font-size: 12px;
    `;
    const events: Array<{ value: EventType; label: string }> = [
      { value: 'onPress', label: 'On Press (tap/click)' },
      { value: 'onLongPress', label: 'On Long Press' },
      { value: 'onDoublePress', label: 'On Double Press' },
      { value: 'onHoverEnter', label: 'On Hover Enter' },
      { value: 'onHoverExit', label: 'On Hover Exit' },
      { value: 'onFocus', label: 'On Focus' },
      { value: 'onBlur', label: 'On Blur' },
      { value: 'onChange', label: 'On Change' },
      { value: 'onSubmit', label: 'On Submit' },
      { value: 'onScroll', label: 'On Scroll' },
      { value: 'onSwipe', label: 'On Swipe' },
      { value: 'onAppear', label: 'On Appear' },
      { value: 'onDisappear', label: 'On Disappear' },
      { value: 'onRefresh', label: 'On Refresh' },
    ];
    for (const evt of events) {
      const option = document.createElement('option');
      option.value = evt.value;
      option.textContent = evt.label;
      eventSelect.appendChild(option);
    }
    form.appendChild(eventSelect);

    // Action type selector
    const actionLabel = document.createElement('label');
    actionLabel.textContent = 'Action';
    actionLabel.style.cssText = `font-size: 11px; color: var(--designlibre-text-muted, #888888);`;
    form.appendChild(actionLabel);

    const actionSelect = document.createElement('select');
    actionSelect.style.cssText = `
      padding: 6px 8px;
      background: var(--designlibre-bg-tertiary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #ffffff);
      font-size: 12px;
    `;
    const actions: Array<{ value: ActionType; label: string }> = [
      { value: 'custom', label: 'Custom (placeholder)' },
      { value: 'navigate', label: 'Navigate to screen' },
      { value: 'setVariable', label: 'Set variable' },
      { value: 'toggleVariable', label: 'Toggle variable' },
      { value: 'incrementVariable', label: 'Increment variable' },
      { value: 'apiCall', label: 'API call' },
      { value: 'openUrl', label: 'Open URL' },
      { value: 'showModal', label: 'Show modal' },
      { value: 'hideModal', label: 'Hide modal' },
      { value: 'showToast', label: 'Show toast' },
    ];
    for (const action of actions) {
      const option = document.createElement('option');
      option.value = action.value;
      option.textContent = action.label;
      actionSelect.appendChild(option);
    }
    form.appendChild(actionSelect);

    // Handler name input
    const handlerLabel = document.createElement('label');
    handlerLabel.textContent = 'Handler Name (optional)';
    handlerLabel.style.cssText = `font-size: 11px; color: var(--designlibre-text-muted, #888888);`;
    form.appendChild(handlerLabel);

    const handlerInput = document.createElement('input');
    handlerInput.type = 'text';
    handlerInput.placeholder = 'e.g., handleSubmit';
    handlerInput.style.cssText = `
      padding: 6px 8px;
      background: var(--designlibre-bg-tertiary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #ffffff);
      font-size: 12px;
      font-family: monospace;
    `;
    form.appendChild(handlerInput);

    // Description input (for custom actions)
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Description / TODO';
    descLabel.style.cssText = `font-size: 11px; color: var(--designlibre-text-muted, #888888);`;
    form.appendChild(descLabel);

    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.placeholder = 'e.g., Validate form and submit to API';
    descInput.style.cssText = `
      padding: 6px 8px;
      background: var(--designlibre-bg-tertiary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #ffffff);
      font-size: 12px;
    `;
    form.appendChild(descInput);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = `display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;`;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 6px 12px;
      background: transparent;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #ffffff);
      font-size: 12px;
      cursor: pointer;
    `;
    cancelBtn.addEventListener('click', () => {
      form.remove();
      addBtn.style.display = 'flex';
    });
    btnRow.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Add Handler';
    saveBtn.style.cssText = `
      padding: 6px 12px;
      background: var(--designlibre-primary, #3b82f6);
      border: none;
      border-radius: 4px;
      color: white;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    `;
    saveBtn.addEventListener('click', () => {
      const handler: SemanticEventHandler = {
        event: eventSelect.value as EventType,
        actionType: actionSelect.value as ActionType,
        actionConfig: {
          placeholder: true,
          description: descInput.value || undefined,
        },
      };

      if (handlerInput.value.trim()) {
        handler.handlerName = handlerInput.value.trim();
      }

      this.addEventHandler(node, handler);
      form.remove();
      addBtn.style.display = 'flex';
    });
    btnRow.appendChild(saveBtn);

    form.appendChild(btnRow);
    container.insertBefore(form, addBtn);
  }

  /**
   * Add an event handler to a node
   */
  private addEventHandler(node: NodeData, handler: SemanticEventHandler): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const pluginData = (node as NodeData & { pluginData?: Record<string, unknown> }).pluginData ?? {};
    let semanticData = getSemanticMetadata(pluginData);

    if (!semanticData) {
      semanticData = createSemanticMetadata('Custom');
    }

    const existingHandlers = semanticData.eventHandlers ?? [];
    const updatedHandlers = [...existingHandlers, handler];

    const updatedMetadata: SemanticMetadata = {
      ...semanticData,
      eventHandlers: updatedHandlers,
    };

    const updatedPluginData = setSemanticMetadata(pluginData, updatedMetadata);
    sceneGraph.updateNode(node.id, { pluginData: updatedPluginData } as Partial<NodeData>);
    this.updateContent();
  }

  /**
   * Remove an event handler from a node
   */
  private removeEventHandler(node: NodeData, index: number): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const pluginData = (node as NodeData & { pluginData?: Record<string, unknown> }).pluginData ?? {};
    const semanticData = getSemanticMetadata(pluginData);

    if (!semanticData || !semanticData.eventHandlers) return;

    const updatedHandlers = semanticData.eventHandlers.filter((_, i) => i !== index);

    let updatedMetadata: SemanticMetadata = { ...semanticData };
    if (updatedHandlers.length > 0) {
      updatedMetadata = { ...updatedMetadata, eventHandlers: updatedHandlers };
    } else {
      // Remove eventHandlers property entirely
      const { eventHandlers: _, ...rest } = updatedMetadata;
      updatedMetadata = rest as SemanticMetadata;
    }

    const updatedPluginData = setSemanticMetadata(pluginData, updatedMetadata);
    sceneGraph.updateNode(node.id, { pluginData: updatedPluginData } as Partial<NodeData>);
    this.updateContent();
  }

  /**
   * Render a single variable row
   */
  private renderVariableRow(variable: VariableDefinition): HTMLElement {
    const variableManager = this.runtime.getVariableManager?.();

    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
    `;

    // Type icon
    const iconSpan = document.createElement('span');
    iconSpan.innerHTML = this.getVariableTypeIcon(variable.type);
    iconSpan.style.cssText = `opacity: 0.7; flex-shrink: 0;`;
    row.appendChild(iconSpan);

    // Name
    const nameSpan = document.createElement('span');
    nameSpan.textContent = variable.name;
    nameSpan.style.cssText = `
      flex: 1;
      font-size: 12px;
      color: var(--designlibre-text, #ffffff);
    `;
    row.appendChild(nameSpan);

    // Value input/toggle based on type
    const currentValue = variableManager?.getValue(variable.id) ?? variable.defaultValue;

    if (variable.type === 'boolean') {
      const toggle = document.createElement('button');
      toggle.style.cssText = `
        width: 32px;
        height: 18px;
        padding: 2px;
        background: ${currentValue ? 'var(--designlibre-primary, #3b82f6)' : 'var(--designlibre-border, #3d3d3d)'};
        border: none;
        border-radius: 9px;
        cursor: pointer;
        position: relative;
        transition: background 0.2s ease;
      `;
      const knob = document.createElement('span');
      knob.style.cssText = `
        display: block;
        width: 14px;
        height: 14px;
        background: white;
        border-radius: 50%;
        transform: translateX(${currentValue ? '14px' : '0'});
        transition: transform 0.2s ease;
      `;
      toggle.appendChild(knob);
      toggle.addEventListener('click', () => {
        variableManager?.toggleBoolean(variable.id);
        this.updateContent();
      });
      row.appendChild(toggle);
    } else if (variable.type === 'number') {
      const input = document.createElement('input');
      input.type = 'number';
      input.value = String(currentValue);
      input.style.cssText = `
        width: 60px;
        padding: 4px 6px;
        background: var(--designlibre-input-bg, #1a1a1a);
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        color: var(--designlibre-text, #ffffff);
        font-size: 11px;
        text-align: right;
      `;
      input.addEventListener('change', () => {
        variableManager?.setValue(variable.id, parseFloat(input.value) || 0);
      });
      row.appendChild(input);
    } else if (variable.type === 'string') {
      const valueSpan = document.createElement('span');
      valueSpan.textContent = String(currentValue).slice(0, 15) + (String(currentValue).length > 15 ? '...' : '');
      valueSpan.style.cssText = `
        font-size: 11px;
        color: var(--designlibre-text-muted, #888888);
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      row.appendChild(valueSpan);
    } else if (variable.type === 'color') {
      const colorSwatch = document.createElement('div');
      colorSwatch.style.cssText = `
        width: 18px;
        height: 18px;
        background: ${String(currentValue)};
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
      `;
      row.appendChild(colorSwatch);
    }

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.style.cssText = `
      padding: 2px;
      background: transparent;
      border: none;
      color: var(--designlibre-text-muted, #666666);
      cursor: pointer;
      opacity: 0.6;
    `;
    deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
    deleteBtn.addEventListener('click', () => {
      variableManager?.removeVariable(variable.id);
      this.updateContent();
    });
    row.appendChild(deleteBtn);

    return row;
  }

  /**
   * Get icon for variable type
   */
  private getVariableTypeIcon(type: VariableType): string {
    const icons: Record<VariableType, string> = {
      boolean: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect>
        <circle cx="16" cy="12" r="3"></circle>
      </svg>`,
      number: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <text x="4" y="17" font-size="14" font-weight="bold">#</text>
      </svg>`,
      string: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <text x="5" y="17" font-size="14">T</text>
      </svg>`,
      color: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="4" fill="currentColor"></circle>
      </svg>`,
    };
    return icons[type] ?? '';
  }

  /**
   * Show UI to add a new variable
   */
  private showAddVariableUI(section: HTMLElement, addBtn: HTMLElement): void {
    addBtn.style.display = 'none';

    const form = document.createElement('div');
    form.style.cssText = `
      padding: 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-primary, #3b82f6);
      border-radius: 8px;
      margin-top: 8px;
    `;

    // Name input
    const nameRow = document.createElement('div');
    nameRow.style.cssText = `margin-bottom: 12px;`;
    const nameLabel = document.createElement('label');
    nameLabel.style.cssText = `
      display: block;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 500;
      color: var(--designlibre-text-muted, #888888);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    nameLabel.textContent = 'Name';
    nameRow.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'e.g. isLoggedIn, counter';
    nameInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: var(--designlibre-input-bg, #1a1a1a);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      color: var(--designlibre-text, #ffffff);
      font-size: 13px;
    `;
    nameRow.appendChild(nameInput);
    form.appendChild(nameRow);

    // Type selector
    const typeRow = document.createElement('div');
    typeRow.style.cssText = `margin-bottom: 12px;`;
    let selectedType: VariableType = 'boolean';
    typeRow.appendChild(this.createLabeledDropdown(
      'Type',
      'Boolean',
      ['Boolean', 'Number', 'String', 'Color'],
      (v) => {
        selectedType = v.toLowerCase() as VariableType;
        updateDefaultValueInput();
      }
    ));
    form.appendChild(typeRow);

    // Default value input (dynamic based on type)
    const defaultValueRow = document.createElement('div');
    defaultValueRow.style.cssText = `margin-bottom: 12px;`;
    form.appendChild(defaultValueRow);

    let defaultValue: boolean | number | string = false;

    const updateDefaultValueInput = () => {
      defaultValueRow.innerHTML = '';
      const label = document.createElement('label');
      label.style.cssText = `
        display: block;
        margin-bottom: 6px;
        font-size: 11px;
        font-weight: 500;
        color: var(--designlibre-text-muted, #888888);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      label.textContent = 'Default Value';
      defaultValueRow.appendChild(label);

      if (selectedType === 'boolean') {
        const toggle = document.createElement('button');
        defaultValue = false;
        toggle.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--designlibre-input-bg, #1a1a1a);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 6px;
          color: var(--designlibre-text, #ffffff);
          font-size: 13px;
          cursor: pointer;
        `;
        toggle.innerHTML = `<span class="bool-value">false</span>`;
        toggle.addEventListener('click', () => {
          defaultValue = !defaultValue;
          toggle.querySelector('.bool-value')!.textContent = defaultValue ? 'true' : 'false';
        });
        defaultValueRow.appendChild(toggle);

      } else if (selectedType === 'number') {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = '0';
        defaultValue = 0;
        input.style.cssText = `
          width: 100%;
          padding: 8px 12px;
          background: var(--designlibre-input-bg, #1a1a1a);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 6px;
          color: var(--designlibre-text, #ffffff);
          font-size: 13px;
        `;
        input.addEventListener('input', () => {
          defaultValue = parseFloat(input.value) || 0;
        });
        defaultValueRow.appendChild(input);

      } else if (selectedType === 'string') {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Default text...';
        defaultValue = '';
        input.style.cssText = `
          width: 100%;
          padding: 8px 12px;
          background: var(--designlibre-input-bg, #1a1a1a);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 6px;
          color: var(--designlibre-text, #ffffff);
          font-size: 13px;
        `;
        input.addEventListener('input', () => {
          defaultValue = input.value;
        });
        defaultValueRow.appendChild(input);

      } else if (selectedType === 'color') {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = '#3b82f6';
        defaultValue = '#3b82f6';
        input.style.cssText = `
          width: 100%;
          height: 36px;
          padding: 2px;
          background: var(--designlibre-input-bg, #1a1a1a);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 6px;
          cursor: pointer;
        `;
        input.addEventListener('input', () => {
          defaultValue = input.value;
        });
        defaultValueRow.appendChild(input);
      }
    };

    updateDefaultValueInput();

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = `
      display: flex;
      gap: 8px;
      margin-top: 16px;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      flex: 1;
      padding: 8px;
      background: transparent;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      color: var(--designlibre-text, #ffffff);
      font-size: 13px;
      cursor: pointer;
    `;
    cancelBtn.addEventListener('click', () => {
      form.remove();
      addBtn.style.display = 'flex';
    });

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Add';
    saveBtn.style.cssText = `
      flex: 1;
      padding: 8px;
      background: var(--designlibre-primary, #3b82f6);
      border: none;
      border-radius: 6px;
      color: #ffffff;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    `;
    saveBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) return;

      const variableManager = this.runtime.getVariableManager?.();
      if (variableManager) {
        const definition: VariableDefinition = {
          id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          name,
          type: selectedType,
          kind: 'state',
          defaultValue,
          scope: 'document',
        };
        variableManager.defineVariable(definition);
      }

      form.remove();
      this.updateContent();
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    form.appendChild(btnRow);

    section.appendChild(form);
    nameInput.focus();
  }

  /**
   * Render a single interaction row
   */
  private renderInteractionRow(nodeId: NodeId, interaction: PrototypeInteraction): HTMLElement {
    const row = document.createElement('div');
    row.className = 'designlibre-interaction-row';
    row.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 8px;
      margin-bottom: 8px;
    `;

    // Header with trigger type and delete button
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;

    const triggerLabel = document.createElement('span');
    triggerLabel.style.cssText = `
      font-size: 12px;
      font-weight: 500;
      color: var(--designlibre-text, #ffffff);
    `;
    triggerLabel.textContent = this.getTriggerDisplayName(interaction.trigger.type);
    header.appendChild(triggerLabel);

    const deleteBtn = document.createElement('button');
    deleteBtn.style.cssText = `
      padding: 4px;
      background: transparent;
      border: none;
      color: var(--designlibre-text-muted, #888888);
      cursor: pointer;
      opacity: 0.6;
    `;
    deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
    deleteBtn.addEventListener('click', () => {
      const interactionManager = this.runtime.getInteractionManager?.();
      interactionManager?.removeInteraction(interaction.id);
      this.updateContent();
    });
    header.appendChild(deleteBtn);

    row.appendChild(header);

    // Render all actions (supports multiple actions per interaction)
    const actionsContainer = document.createElement('div');
    actionsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    for (let i = 0; i < interaction.actions.length; i++) {
      const action = interaction.actions[i];
      if (!action) continue;

      const actionRow = this.renderActionItem(action, i, interaction.actions.length, () => {
        // Remove this action
        const interactionManager = this.runtime.getInteractionManager?.();
        if (interactionManager) {
          const newActions = [...interaction.actions];
          newActions.splice(i, 1);
          if (newActions.length === 0) {
            interactionManager.removeInteraction(interaction.id);
          } else {
            interactionManager.updateInteraction(interaction.id, { actions: newActions });
          }
          this.updateContent();
        }
      });
      actionsContainer.appendChild(actionRow);
    }

    row.appendChild(actionsContainer);

    // Add action button (for adding more actions to this interaction)
    const addActionBtn = document.createElement('button');
    addActionBtn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 6px;
      background: transparent;
      border: 1px dashed var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text-muted, #888888);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    addActionBtn.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add action
    `;
    addActionBtn.addEventListener('mouseenter', () => {
      addActionBtn.style.borderColor = 'var(--designlibre-primary, #3b82f6)';
      addActionBtn.style.color = 'var(--designlibre-primary, #3b82f6)';
    });
    addActionBtn.addEventListener('mouseleave', () => {
      addActionBtn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      addActionBtn.style.color = 'var(--designlibre-text-muted, #888888)';
    });
    addActionBtn.addEventListener('click', () => {
      this.showAddActionToInteractionUI(nodeId, interaction, row);
    });

    row.appendChild(addActionBtn);

    return row;
  }

  /**
   * Render a single action item within an interaction
   */
  private renderActionItem(
    action: InteractionAction,
    index: number,
    total: number,
    onRemove: () => void
  ): HTMLElement {
    const actionRow = document.createElement('div');
    actionRow.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      background: var(--designlibre-bg-tertiary, #1a1a1a);
      border-radius: 4px;
    `;

    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    `;

    // Action number indicator for multiple actions
    const actionLabel = document.createElement('span');
    actionLabel.style.cssText = `
      font-size: 10px;
      color: var(--designlibre-text-muted, #666666);
    `;
    actionLabel.textContent = total > 1 ? `Action ${index + 1}` : '';

    const actionInfo = document.createElement('div');
    actionInfo.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--designlibre-text, #ffffff);
    `;

    if (action.type === 'NAVIGATE' || action.type === 'OPEN_OVERLAY') {
      const destId = action.type === 'NAVIGATE' ? action.destinationId : action.overlayId;
      const destNode = this.runtime.getSceneGraph().getNode(destId as NodeId);
      const label = action.type === 'NAVIGATE' ? 'Navigate' : 'Overlay';

      actionInfo.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${label}: ${destNode?.name ?? 'Unknown'}
        </span>
      `;
    } else if (action.type === 'CLOSE_OVERLAY') {
      actionInfo.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <span>Close overlay</span>
      `;
    } else if (action.type === 'BACK') {
      actionInfo.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Go back</span>
      `;
    } else if (action.type === 'OPEN_URL') {
      actionInfo.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          URL: ${action.url}
        </span>
      `;
    } else if (action.type === 'SET_VARIABLE') {
      const variableManager = this.runtime.getVariableManager?.();
      const varDef = variableManager?.getDefinition(action.variableId);
      const opLabels: Record<string, string> = {
        'SET': 'Set',
        'TOGGLE': 'Toggle',
        'INCREMENT': 'Increment',
        'DECREMENT': 'Decrement',
      };
      const opLabel = opLabels[action.operation] ?? 'Set';

      actionInfo.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect>
          <circle cx="16" cy="12" r="3"></circle>
        </svg>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${opLabel}: ${varDef?.name ?? action.variableId}
        </span>
      `;
    } else if (action.type === 'CONDITIONAL') {
      const condCount = action.conditions?.length ?? 0;
      actionInfo.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 3h5v5"></path>
          <line x1="21" y1="3" x2="14" y2="10"></line>
          <path d="M21 14v5h-5"></path>
          <line x1="21" y1="21" x2="14" y2="14"></line>
          <path d="M3 16v5h5"></path>
          <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          Conditional (${condCount} ${condCount === 1 ? 'condition' : 'conditions'})
        </span>
      `;
    }

    if (total > 1 && actionLabel.textContent) {
      contentDiv.appendChild(actionLabel);
    }
    contentDiv.appendChild(actionInfo);
    actionRow.appendChild(contentDiv);

    // Remove action button (only show if multiple actions)
    if (total > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.style.cssText = `
        padding: 2px;
        background: transparent;
        border: none;
        color: var(--designlibre-text-muted, #666666);
        cursor: pointer;
        opacity: 0.6;
        flex-shrink: 0;
      `;
      removeBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`;
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove();
      });
      actionRow.appendChild(removeBtn);
    }

    return actionRow;
  }

  /**
   * Show UI to add another action to an existing interaction
   */
  private showAddActionToInteractionUI(
    nodeId: NodeId,
    interaction: PrototypeInteraction,
    parentRow: HTMLElement
  ): void {
    // Create a mini form to add an action
    const form = document.createElement('div');
    form.style.cssText = `
      padding: 10px;
      margin-top: 8px;
      background: var(--designlibre-bg-tertiary, #1a1a1a);
      border: 1px solid var(--designlibre-primary, #3b82f6);
      border-radius: 6px;
    `;

    // Action type selector
    const actionTypeRow = document.createElement('div');
    actionTypeRow.style.cssText = `margin-bottom: 10px;`;
    let selectedActionType = 'NAVIGATE';
    actionTypeRow.appendChild(this.createLabeledDropdown(
      'Action',
      'Navigate',
      ['Navigate', 'Open Overlay', 'Close Overlay', 'Back', 'Open URL'],
      (v) => {
        const mapping: Record<string, string> = {
          'Navigate': 'NAVIGATE',
          'Open Overlay': 'OPEN_OVERLAY',
          'Close Overlay': 'CLOSE_OVERLAY',
          'Back': 'BACK',
          'Open URL': 'OPEN_URL',
        };
        selectedActionType = mapping[v] ?? 'NAVIGATE';
        updateMiniForm();
      }
    ));
    form.appendChild(actionTypeRow);

    // Container for action-specific options
    const optionsContainer = document.createElement('div');
    form.appendChild(optionsContainer);

    let selectedDestId: NodeId | null = null;
    let selectedAnimation = 'DISSOLVE';
    let duration = 300;
    let openUrl = '';
    let openInNewTab = true;
    let framePicker: FramePicker | null = null;

    const updateMiniForm = () => {
      optionsContainer.innerHTML = '';
      framePicker?.dispose();
      framePicker = null;

      if (selectedActionType === 'NAVIGATE' || selectedActionType === 'OPEN_OVERLAY') {
        framePicker = new FramePicker({
          sceneGraph: this.runtime.getSceneGraph(),
          selectedFrameId: null,
          excludeIds: [nodeId],
          onSelect: (frameId) => {
            selectedDestId = frameId;
          },
        });
        optionsContainer.appendChild(framePicker.createElement());
      } else if (selectedActionType === 'OPEN_URL') {
        const urlInput = document.createElement('input');
        urlInput.type = 'url';
        urlInput.placeholder = 'https://example.com';
        urlInput.style.cssText = `
          width: 100%;
          padding: 6px 8px;
          background: var(--designlibre-input-bg, #2d2d2d);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 4px;
          color: var(--designlibre-text, #ffffff);
          font-size: 12px;
        `;
        urlInput.addEventListener('input', () => {
          openUrl = urlInput.value;
        });
        optionsContainer.appendChild(urlInput);
      }
    };

    updateMiniForm();

    // Button row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = `
      display: flex;
      gap: 6px;
      margin-top: 10px;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      flex: 1;
      padding: 6px;
      background: transparent;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text, #ffffff);
      font-size: 11px;
      cursor: pointer;
    `;
    cancelBtn.addEventListener('click', () => {
      form.remove();
      framePicker?.dispose();
    });

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add';
    addBtn.style.cssText = `
      flex: 1;
      padding: 6px;
      background: var(--designlibre-primary, #3b82f6);
      border: none;
      border-radius: 4px;
      color: #ffffff;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
    `;
    addBtn.addEventListener('click', () => {
      // Validate
      if ((selectedActionType === 'NAVIGATE' || selectedActionType === 'OPEN_OVERLAY') && !selectedDestId) {
        return;
      }
      if (selectedActionType === 'OPEN_URL' && !openUrl) {
        return;
      }

      // Create the action
      let newAction: InteractionAction;

      if (selectedActionType === 'NAVIGATE') {
        newAction = {
          type: 'NAVIGATE',
          destinationId: selectedDestId as string,
          transition: { type: selectedAnimation as TransitionType, duration, easing: 'EASE_OUT' },
        };
      } else if (selectedActionType === 'OPEN_OVERLAY') {
        newAction = {
          type: 'OPEN_OVERLAY',
          overlayId: selectedDestId as string,
          transition: { type: selectedAnimation as TransitionType, duration, easing: 'EASE_OUT' },
          closeOnClickOutside: true,
          position: { type: 'CENTER' },
        };
      } else if (selectedActionType === 'CLOSE_OVERLAY') {
        newAction = {
          type: 'CLOSE_OVERLAY',
          transition: { type: 'DISSOLVE', duration: 200, easing: 'EASE_OUT' },
        };
      } else if (selectedActionType === 'BACK') {
        newAction = {
          type: 'BACK',
          transition: { type: 'DISSOLVE', duration: 200, easing: 'EASE_OUT' },
        };
      } else {
        newAction = {
          type: 'OPEN_URL',
          url: openUrl,
          openInNewTab,
        };
      }

      // Add to interaction
      const interactionManager = this.runtime.getInteractionManager?.();
      if (interactionManager) {
        const newActions = [...interaction.actions, newAction];
        interactionManager.updateInteraction(interaction.id, { actions: newActions });
      }

      form.remove();
      framePicker?.dispose();
      this.updateContent();
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(addBtn);
    form.appendChild(btnRow);

    parentRow.appendChild(form);
  }

  /**
   * Show UI to add a new interaction
   */
  private showAddInteractionUI(nodeId: NodeId, section: HTMLElement, addBtn: HTMLElement): void {
    // Hide the add button temporarily
    addBtn.style.display = 'none';

    // Create inline form
    const form = document.createElement('div');
    form.className = 'designlibre-add-interaction-form';
    form.style.cssText = `
      padding: 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-primary, #3b82f6);
      border-radius: 8px;
      margin-top: 8px;
    `;

    // Trigger selector
    const triggerRow = document.createElement('div');
    triggerRow.style.cssText = `margin-bottom: 12px;`;
    triggerRow.appendChild(this.createLabeledDropdown(
      'Trigger',
      'On Click',
      ['On Click', 'On Hover', 'On Drag', 'Mouse Enter', 'Mouse Leave', 'Mouse Down', 'Mouse Up', 'After Delay', 'Key Press'],
      () => {}
    ));
    form.appendChild(triggerRow);

    // Action type selector
    const actionTypeRow = document.createElement('div');
    actionTypeRow.style.cssText = `margin-bottom: 12px;`;
    let selectedActionType = 'NAVIGATE';
    actionTypeRow.appendChild(this.createLabeledDropdown(
      'Action',
      'Navigate',
      ['Navigate', 'Open Overlay', 'Close Overlay', 'Back', 'Open URL', 'Set Variable', 'Conditional'],
      (v) => {
        const mapping: Record<string, string> = {
          'Navigate': 'NAVIGATE',
          'Open Overlay': 'OPEN_OVERLAY',
          'Close Overlay': 'CLOSE_OVERLAY',
          'Back': 'BACK',
          'Open URL': 'OPEN_URL',
          'Set Variable': 'SET_VARIABLE',
          'Conditional': 'CONDITIONAL',
        };
        selectedActionType = mapping[v] ?? 'NAVIGATE';
        updateFormForActionType();
      }
    ));
    form.appendChild(actionTypeRow);

    // Container for dynamic action options
    const actionOptionsContainer = document.createElement('div');
    actionOptionsContainer.className = 'action-options';
    form.appendChild(actionOptionsContainer);

    // State for form values
    let selectedDestId: NodeId | null = null;
    let selectedAnimation = 'DISSOLVE';
    let duration = 300;
    let overlayPosition = 'CENTER';
    let overlayBackdrop = 'DIM';
    let closeOnClickOutside = true;
    let openUrl = '';
    let openInNewTab = true;
    let framePicker: FramePicker | null = null;
    let variablePicker: VariablePicker | null = null;
    let selectedVariableId: string | null = null;
    let variableOperation = 'SET';
    let variableValue: string | number | boolean = '';
    // Conditional action state
    let conditionVariableId: string | null = null;
    let conditionOperator: string = 'equals';
    let conditionValue: string | number | boolean = '';
    let conditionalThenDestId: NodeId | null = null;

    const updateFormForActionType = () => {
      actionOptionsContainer.innerHTML = '';
      framePicker?.dispose();
      framePicker = null;
      variablePicker?.dispose();
      variablePicker = null;

      if (selectedActionType === 'NAVIGATE' || selectedActionType === 'OPEN_OVERLAY') {
        // Frame picker for destination
        const destLabel = document.createElement('label');
        destLabel.style.cssText = `
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 500;
          color: var(--designlibre-text-muted, #888888);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        `;
        destLabel.textContent = selectedActionType === 'NAVIGATE' ? 'Navigate to' : 'Open overlay';
        actionOptionsContainer.appendChild(destLabel);

        framePicker = new FramePicker({
          sceneGraph: this.runtime.getSceneGraph(),
          selectedFrameId: selectedDestId,
          excludeIds: [nodeId],
          onSelect: (frameId) => {
            selectedDestId = frameId;
          },
        });
        actionOptionsContainer.appendChild(framePicker.createElement());

        // Overlay-specific options
        if (selectedActionType === 'OPEN_OVERLAY') {
          // Position selector
          const posRow = document.createElement('div');
          posRow.style.cssText = `margin-top: 12px;`;
          posRow.appendChild(this.createLabeledDropdown(
            'Position',
            'Center',
            ['Center', 'Top Left', 'Top Center', 'Top Right', 'Bottom Left', 'Bottom Center', 'Bottom Right'],
            (v) => {
              const mapping: Record<string, string> = {
                'Center': 'CENTER',
                'Top Left': 'TOP_LEFT',
                'Top Center': 'TOP_CENTER',
                'Top Right': 'TOP_RIGHT',
                'Bottom Left': 'BOTTOM_LEFT',
                'Bottom Center': 'BOTTOM_CENTER',
                'Bottom Right': 'BOTTOM_RIGHT',
              };
              overlayPosition = mapping[v] ?? 'CENTER';
            }
          ));
          actionOptionsContainer.appendChild(posRow);

          // Backdrop selector
          const backdropRow = document.createElement('div');
          backdropRow.style.cssText = `margin-top: 12px;`;
          backdropRow.appendChild(this.createLabeledDropdown(
            'Backdrop',
            'Dim',
            ['None', 'Dim', 'Blur'],
            (v) => {
              overlayBackdrop = v.toUpperCase();
            }
          ));
          actionOptionsContainer.appendChild(backdropRow);

          // Close on click outside checkbox
          const closeRow = document.createElement('div');
          closeRow.style.cssText = `
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          `;
          const closeCheckbox = document.createElement('input');
          closeCheckbox.type = 'checkbox';
          closeCheckbox.id = 'close-on-outside';
          closeCheckbox.checked = closeOnClickOutside;
          closeCheckbox.addEventListener('change', () => {
            closeOnClickOutside = closeCheckbox.checked;
          });
          const closeLabel = document.createElement('label');
          closeLabel.htmlFor = 'close-on-outside';
          closeLabel.style.cssText = `
            font-size: 12px;
            color: var(--designlibre-text, #ffffff);
            cursor: pointer;
          `;
          closeLabel.textContent = 'Close on click outside';
          closeRow.appendChild(closeCheckbox);
          closeRow.appendChild(closeLabel);
          actionOptionsContainer.appendChild(closeRow);
        }

        // Animation selector
        const animRow = document.createElement('div');
        animRow.style.cssText = `margin-top: 12px;`;
        const animations = selectedActionType === 'OPEN_OVERLAY'
          ? ['Instant', 'Dissolve', 'Move In', 'Slide In']
          : ['Instant', 'Dissolve', 'Smart Animate', 'Slide In', 'Slide Out', 'Push', 'Move In', 'Move Out'];
        animRow.appendChild(this.createLabeledDropdown(
          'Animation',
          'Dissolve',
          animations,
          (v) => {
            const mapping: Record<string, string> = {
              'Instant': 'INSTANT',
              'Dissolve': 'DISSOLVE',
              'Smart Animate': 'SMART_ANIMATE',
              'Slide In': 'SLIDE_IN',
              'Slide Out': 'SLIDE_OUT',
              'Push': 'PUSH',
              'Move In': 'MOVE_IN',
              'Move Out': 'MOVE_OUT',
            };
            selectedAnimation = mapping[v] ?? 'DISSOLVE';
          }
        ));
        actionOptionsContainer.appendChild(animRow);

        // Duration
        const durationRow = document.createElement('div');
        durationRow.style.cssText = `margin-top: 12px;`;
        durationRow.appendChild(this.createLabeledNumberField('Duration', 300, 'ms', (v) => {
          duration = v;
        }));
        actionOptionsContainer.appendChild(durationRow);

      } else if (selectedActionType === 'CLOSE_OVERLAY' || selectedActionType === 'BACK') {
        // Animation selector for close/back
        const animRow = document.createElement('div');
        animRow.style.cssText = `margin-top: 12px;`;
        animRow.appendChild(this.createLabeledDropdown(
          'Animation',
          'Dissolve',
          ['Instant', 'Dissolve', 'Slide Out', 'Move Out'],
          (v) => {
            const mapping: Record<string, string> = {
              'Instant': 'INSTANT',
              'Dissolve': 'DISSOLVE',
              'Slide Out': 'SLIDE_OUT',
              'Move Out': 'MOVE_OUT',
            };
            selectedAnimation = mapping[v] ?? 'DISSOLVE';
          }
        ));
        actionOptionsContainer.appendChild(animRow);

        // Duration
        const durationRow = document.createElement('div');
        durationRow.style.cssText = `margin-top: 12px;`;
        durationRow.appendChild(this.createLabeledNumberField('Duration', 300, 'ms', (v) => {
          duration = v;
        }));
        actionOptionsContainer.appendChild(durationRow);

        // Info text
        const infoText = document.createElement('div');
        infoText.style.cssText = `
          margin-top: 12px;
          padding: 8px;
          background: var(--designlibre-bg-tertiary, #1a1a1a);
          border-radius: 4px;
          font-size: 11px;
          color: var(--designlibre-text-muted, #888888);
        `;
        infoText.textContent = selectedActionType === 'CLOSE_OVERLAY'
          ? 'Closes the topmost overlay'
          : 'Navigates to the previous frame in history';
        actionOptionsContainer.appendChild(infoText);

      } else if (selectedActionType === 'OPEN_URL') {
        // URL input
        const urlRow = document.createElement('div');
        urlRow.style.cssText = `margin-bottom: 12px;`;
        const urlLabel = document.createElement('label');
        urlLabel.style.cssText = `
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 500;
          color: var(--designlibre-text-muted, #888888);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        `;
        urlLabel.textContent = 'URL';
        urlRow.appendChild(urlLabel);

        const urlInput = document.createElement('input');
        urlInput.type = 'url';
        urlInput.placeholder = 'https://example.com';
        urlInput.style.cssText = `
          width: 100%;
          padding: 8px 12px;
          background: var(--designlibre-input-bg, #1a1a1a);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 6px;
          color: var(--designlibre-text, #ffffff);
          font-size: 13px;
        `;
        urlInput.addEventListener('input', () => {
          openUrl = urlInput.value;
        });
        urlRow.appendChild(urlInput);
        actionOptionsContainer.appendChild(urlRow);

        // New tab checkbox
        const newTabRow = document.createElement('div');
        newTabRow.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
        `;
        const newTabCheckbox = document.createElement('input');
        newTabCheckbox.type = 'checkbox';
        newTabCheckbox.id = 'open-new-tab';
        newTabCheckbox.checked = openInNewTab;
        newTabCheckbox.addEventListener('change', () => {
          openInNewTab = newTabCheckbox.checked;
        });
        const newTabLabel = document.createElement('label');
        newTabLabel.htmlFor = 'open-new-tab';
        newTabLabel.style.cssText = `
          font-size: 12px;
          color: var(--designlibre-text, #ffffff);
          cursor: pointer;
        `;
        newTabLabel.textContent = 'Open in new tab';
        newTabRow.appendChild(newTabCheckbox);
        newTabRow.appendChild(newTabLabel);
        actionOptionsContainer.appendChild(newTabRow);

      } else if (selectedActionType === 'SET_VARIABLE') {
        // Variable picker
        const variableManager = this.runtime.getVariableManager?.();
        if (!variableManager) {
          const noVarsMsg = document.createElement('div');
          noVarsMsg.style.cssText = `
            padding: 12px;
            text-align: center;
            color: var(--designlibre-text-muted, #888888);
            font-size: 12px;
          `;
          noVarsMsg.textContent = 'Variable manager not available';
          actionOptionsContainer.appendChild(noVarsMsg);
          return;
        }

        const allVars = variableManager.getAllDefinitions();
        if (allVars.length === 0) {
          const noVarsMsg = document.createElement('div');
          noVarsMsg.style.cssText = `
            padding: 12px;
            text-align: center;
            color: var(--designlibre-text-muted, #888888);
            font-size: 12px;
          `;
          noVarsMsg.textContent = 'No variables defined. Add variables in the Variables section above.';
          actionOptionsContainer.appendChild(noVarsMsg);
          return;
        }

        // Variable picker label
        const varLabel = document.createElement('label');
        varLabel.style.cssText = `
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 500;
          color: var(--designlibre-text-muted, #888888);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        `;
        varLabel.textContent = 'Variable';
        actionOptionsContainer.appendChild(varLabel);

        variablePicker = new VariablePicker({
          variableManager,
          selectedVariableId,
          onSelect: (varId) => {
            selectedVariableId = varId;
            updateValueInput();
          },
          placeholder: 'Select variable...',
        });
        actionOptionsContainer.appendChild(variablePicker.createElement());

        // Operation selector
        const opRow = document.createElement('div');
        opRow.style.cssText = `margin-top: 12px;`;
        opRow.appendChild(this.createLabeledDropdown(
          'Operation',
          'Set to',
          ['Set to', 'Toggle', 'Increment', 'Decrement'],
          (v) => {
            const mapping: Record<string, string> = {
              'Set to': 'SET',
              'Toggle': 'TOGGLE',
              'Increment': 'INCREMENT',
              'Decrement': 'DECREMENT',
            };
            variableOperation = mapping[v] ?? 'SET';
            updateValueInput();
          }
        ));
        actionOptionsContainer.appendChild(opRow);

        // Value input container (dynamic based on operation and variable type)
        const valueContainer = document.createElement('div');
        valueContainer.className = 'variable-value-container';
        valueContainer.style.cssText = `margin-top: 12px;`;
        actionOptionsContainer.appendChild(valueContainer);

        const updateValueInput = () => {
          valueContainer.innerHTML = '';

          // No value needed for toggle
          if (variableOperation === 'TOGGLE') {
            const info = document.createElement('div');
            info.style.cssText = `
              padding: 8px;
              background: var(--designlibre-bg-tertiary, #1a1a1a);
              border-radius: 4px;
              font-size: 11px;
              color: var(--designlibre-text-muted, #888888);
            `;
            info.textContent = 'Toggles the boolean value';
            valueContainer.appendChild(info);
            return;
          }

          const selectedVar = selectedVariableId
            ? variableManager.getDefinition(selectedVariableId)
            : null;

          // Label
          const valueLabel = document.createElement('label');
          valueLabel.style.cssText = `
            display: block;
            margin-bottom: 6px;
            font-size: 11px;
            font-weight: 500;
            color: var(--designlibre-text-muted, #888888);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          `;
          valueLabel.textContent = variableOperation === 'INCREMENT' || variableOperation === 'DECREMENT'
            ? 'Amount'
            : 'Value';
          valueContainer.appendChild(valueLabel);

          if (!selectedVar) {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = `
              padding: 8px;
              background: var(--designlibre-bg-tertiary, #1a1a1a);
              border-radius: 4px;
              font-size: 11px;
              color: var(--designlibre-text-muted, #888888);
            `;
            placeholder.textContent = 'Select a variable first';
            valueContainer.appendChild(placeholder);
            return;
          }

          // Create input based on variable type and operation
          if (selectedVar.type === 'boolean' && variableOperation === 'SET') {
            // Boolean dropdown
            const boolSelect = document.createElement('select');
            boolSelect.style.cssText = `
              width: 100%;
              padding: 8px 12px;
              background: var(--designlibre-input-bg, #1a1a1a);
              border: 1px solid var(--designlibre-border, #3d3d3d);
              border-radius: 6px;
              color: var(--designlibre-text, #ffffff);
              font-size: 13px;
            `;
            const trueOpt = document.createElement('option');
            trueOpt.value = 'true';
            trueOpt.textContent = 'True';
            const falseOpt = document.createElement('option');
            falseOpt.value = 'false';
            falseOpt.textContent = 'False';
            boolSelect.appendChild(trueOpt);
            boolSelect.appendChild(falseOpt);
            boolSelect.value = String(variableValue === true || variableValue === 'true');
            boolSelect.addEventListener('change', () => {
              variableValue = boolSelect.value === 'true';
            });
            valueContainer.appendChild(boolSelect);
          } else if (selectedVar.type === 'number' || variableOperation === 'INCREMENT' || variableOperation === 'DECREMENT') {
            // Number input
            const numInput = document.createElement('input');
            numInput.type = 'number';
            numInput.value = typeof variableValue === 'number' ? String(variableValue) : '1';
            numInput.style.cssText = `
              width: 100%;
              padding: 8px 12px;
              background: var(--designlibre-input-bg, #1a1a1a);
              border: 1px solid var(--designlibre-border, #3d3d3d);
              border-radius: 6px;
              color: var(--designlibre-text, #ffffff);
              font-size: 13px;
            `;
            numInput.addEventListener('input', () => {
              variableValue = parseFloat(numInput.value) || 0;
            });
            variableValue = parseFloat(numInput.value) || 1;
            valueContainer.appendChild(numInput);
          } else if (selectedVar.type === 'color') {
            // Color input
            const colorRow = document.createElement('div');
            colorRow.style.cssText = `display: flex; gap: 8px; align-items: center;`;

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = typeof variableValue === 'string' && variableValue.startsWith('#')
              ? variableValue
              : '#3b82f6';
            colorInput.style.cssText = `
              width: 40px;
              height: 32px;
              padding: 0;
              border: 1px solid var(--designlibre-border, #3d3d3d);
              border-radius: 4px;
              cursor: pointer;
            `;

            const hexInput = document.createElement('input');
            hexInput.type = 'text';
            hexInput.value = colorInput.value;
            hexInput.style.cssText = `
              flex: 1;
              padding: 8px 12px;
              background: var(--designlibre-input-bg, #1a1a1a);
              border: 1px solid var(--designlibre-border, #3d3d3d);
              border-radius: 6px;
              color: var(--designlibre-text, #ffffff);
              font-size: 13px;
            `;

            colorInput.addEventListener('input', () => {
              hexInput.value = colorInput.value;
              variableValue = colorInput.value;
            });
            hexInput.addEventListener('input', () => {
              if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) {
                colorInput.value = hexInput.value;
                variableValue = hexInput.value;
              }
            });
            variableValue = colorInput.value;

            colorRow.appendChild(colorInput);
            colorRow.appendChild(hexInput);
            valueContainer.appendChild(colorRow);
          } else {
            // String input
            const strInput = document.createElement('input');
            strInput.type = 'text';
            strInput.value = typeof variableValue === 'string' ? variableValue : '';
            strInput.placeholder = 'Enter value...';
            strInput.style.cssText = `
              width: 100%;
              padding: 8px 12px;
              background: var(--designlibre-input-bg, #1a1a1a);
              border: 1px solid var(--designlibre-border, #3d3d3d);
              border-radius: 6px;
              color: var(--designlibre-text, #ffffff);
              font-size: 13px;
            `;
            strInput.addEventListener('input', () => {
              variableValue = strInput.value;
            });
            valueContainer.appendChild(strInput);
          }
        };

        updateValueInput();

      } else if (selectedActionType === 'CONDITIONAL') {
        // Condition builder
        const variableManager = this.runtime.getVariableManager?.();
        if (!variableManager) {
          const noVarsMsg = document.createElement('div');
          noVarsMsg.style.cssText = `
            padding: 12px;
            text-align: center;
            color: var(--designlibre-text-muted, #888888);
            font-size: 12px;
          `;
          noVarsMsg.textContent = 'Variable manager not available';
          actionOptionsContainer.appendChild(noVarsMsg);
          return;
        }

        const allVars = variableManager.getAllDefinitions();
        if (allVars.length === 0) {
          const noVarsMsg = document.createElement('div');
          noVarsMsg.style.cssText = `
            padding: 12px;
            text-align: center;
            color: var(--designlibre-text-muted, #888888);
            font-size: 12px;
          `;
          noVarsMsg.textContent = 'No variables defined. Add variables to use conditional actions.';
          actionOptionsContainer.appendChild(noVarsMsg);
          return;
        }

        // Condition section header
        const condHeader = document.createElement('div');
        condHeader.style.cssText = `
          font-size: 11px;
          font-weight: 600;
          color: var(--designlibre-text-muted, #888888);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        `;
        condHeader.textContent = 'IF';
        actionOptionsContainer.appendChild(condHeader);

        // Condition variable picker
        const condVarPicker = new VariablePicker({
          variableManager,
          selectedVariableId: conditionVariableId,
          onSelect: (varId) => {
            conditionVariableId = varId;
            updateConditionValueInput();
          },
          placeholder: 'Select variable...',
        });
        actionOptionsContainer.appendChild(condVarPicker.createElement());

        // Operator dropdown
        const opRow = document.createElement('div');
        opRow.style.cssText = `margin-top: 8px;`;
        const operatorOptions = ['Equals', 'Not equals', 'Greater than', 'Less than', 'Is true', 'Is false'];
        opRow.appendChild(this.createLabeledDropdown(
          'Condition',
          'Equals',
          operatorOptions,
          (v) => {
            const mapping: Record<string, string> = {
              'Equals': 'equals',
              'Not equals': 'not_equals',
              'Greater than': 'greater_than',
              'Less than': 'less_than',
              'Is true': 'is_true',
              'Is false': 'is_false',
            };
            conditionOperator = mapping[v] ?? 'equals';
            updateConditionValueInput();
          }
        ));
        actionOptionsContainer.appendChild(opRow);

        // Condition value container
        const condValueContainer = document.createElement('div');
        condValueContainer.className = 'condition-value-container';
        condValueContainer.style.cssText = `margin-top: 8px;`;
        actionOptionsContainer.appendChild(condValueContainer);

        const updateConditionValueInput = () => {
          condValueContainer.innerHTML = '';

          // No value needed for is_true / is_false
          if (conditionOperator === 'is_true' || conditionOperator === 'is_false') {
            return;
          }

          const selectedVar = conditionVariableId
            ? variableManager.getDefinition(conditionVariableId)
            : null;

          if (!selectedVar) {
            return;
          }

          const valueLabel = document.createElement('label');
          valueLabel.style.cssText = `
            display: block;
            margin-bottom: 6px;
            font-size: 11px;
            font-weight: 500;
            color: var(--designlibre-text-muted, #888888);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          `;
          valueLabel.textContent = 'Value';
          condValueContainer.appendChild(valueLabel);

          if (selectedVar.type === 'boolean') {
            const boolSelect = document.createElement('select');
            boolSelect.style.cssText = `
              width: 100%;
              padding: 8px 12px;
              background: var(--designlibre-input-bg, #1a1a1a);
              border: 1px solid var(--designlibre-border, #3d3d3d);
              border-radius: 6px;
              color: var(--designlibre-text, #ffffff);
              font-size: 13px;
            `;
            boolSelect.innerHTML = `<option value="true">True</option><option value="false">False</option>`;
            boolSelect.value = String(conditionValue);
            boolSelect.addEventListener('change', () => {
              conditionValue = boolSelect.value === 'true';
            });
            condValueContainer.appendChild(boolSelect);
          } else if (selectedVar.type === 'number') {
            const numInput = document.createElement('input');
            numInput.type = 'number';
            numInput.value = typeof conditionValue === 'number' ? String(conditionValue) : '0';
            numInput.style.cssText = `
              width: 100%;
              padding: 8px 12px;
              background: var(--designlibre-input-bg, #1a1a1a);
              border: 1px solid var(--designlibre-border, #3d3d3d);
              border-radius: 6px;
              color: var(--designlibre-text, #ffffff);
              font-size: 13px;
            `;
            numInput.addEventListener('input', () => {
              conditionValue = parseFloat(numInput.value) || 0;
            });
            condValueContainer.appendChild(numInput);
          } else {
            const strInput = document.createElement('input');
            strInput.type = 'text';
            strInput.value = typeof conditionValue === 'string' ? conditionValue : '';
            strInput.placeholder = 'Enter value...';
            strInput.style.cssText = `
              width: 100%;
              padding: 8px 12px;
              background: var(--designlibre-input-bg, #1a1a1a);
              border: 1px solid var(--designlibre-border, #3d3d3d);
              border-radius: 6px;
              color: var(--designlibre-text, #ffffff);
              font-size: 13px;
            `;
            strInput.addEventListener('input', () => {
              conditionValue = strInput.value;
            });
            condValueContainer.appendChild(strInput);
          }
        };

        updateConditionValueInput();

        // THEN section header
        const thenHeader = document.createElement('div');
        thenHeader.style.cssText = `
          font-size: 11px;
          font-weight: 600;
          color: var(--designlibre-text-muted, #888888);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 16px;
          margin-bottom: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--designlibre-border, #3d3d3d);
        `;
        thenHeader.textContent = 'THEN Navigate to';
        actionOptionsContainer.appendChild(thenHeader);

        // Then destination frame picker
        const thenFramePicker = new FramePicker({
          sceneGraph: this.runtime.getSceneGraph(),
          selectedFrameId: conditionalThenDestId,
          excludeIds: [nodeId],
          onSelect: (frameId) => {
            conditionalThenDestId = frameId;
          },
        });
        actionOptionsContainer.appendChild(thenFramePicker.createElement());
      }
    };

    // Initialize form for default action type
    updateFormForActionType();

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = `
      display: flex;
      gap: 8px;
      margin-top: 16px;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      flex: 1;
      padding: 8px;
      background: transparent;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      color: var(--designlibre-text, #ffffff);
      font-size: 13px;
      cursor: pointer;
    `;
    cancelBtn.addEventListener('click', () => {
      form.remove();
      addBtn.style.display = 'flex';
      framePicker?.dispose();
      variablePicker?.dispose();
    });

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Add';
    saveBtn.style.cssText = `
      flex: 1;
      padding: 8px;
      background: var(--designlibre-primary, #3b82f6);
      border: none;
      border-radius: 6px;
      color: #ffffff;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    `;
    saveBtn.addEventListener('click', () => {
      // Validate based on action type
      if ((selectedActionType === 'NAVIGATE' || selectedActionType === 'OPEN_OVERLAY') && !selectedDestId) {
        return;
      }
      if (selectedActionType === 'OPEN_URL' && !openUrl) {
        return;
      }
      if (selectedActionType === 'SET_VARIABLE' && !selectedVariableId) {
        return;
      }
      if (selectedActionType === 'CONDITIONAL' && (!conditionVariableId || !conditionalThenDestId)) {
        return;
      }

      // Create the interaction
      const interactionManager = this.runtime.getInteractionManager?.();
      if (interactionManager) {
        const triggerSelect = triggerRow.querySelector('select') as HTMLSelectElement;
        const triggerValue = triggerSelect?.value ?? 'On Click';
        const triggerType = this.getTriggerType(triggerValue);

        let action: InteractionAction;

        if (selectedActionType === 'NAVIGATE') {
          action = {
            type: 'NAVIGATE',
            destinationId: selectedDestId as string,
            transition: {
              type: selectedAnimation as TransitionType,
              duration,
              easing: 'EASE_OUT',
            },
          };
        } else if (selectedActionType === 'OPEN_OVERLAY') {
          const overlayAction: InteractionAction = {
            type: 'OPEN_OVERLAY',
            overlayId: selectedDestId as string,
            transition: {
              type: selectedAnimation as TransitionType,
              duration,
              easing: 'EASE_OUT',
            },
            closeOnClickOutside,
            position: { type: overlayPosition } as OverlayPosition,
          };
          // Only add overlayBackground if not NONE
          if (overlayBackdrop === 'DIM') {
            (overlayAction as { overlayBackground: RGBA }).overlayBackground = { r: 0, g: 0, b: 0, a: 0.5 };
          } else if (overlayBackdrop === 'BLUR') {
            (overlayAction as { overlayBackground: RGBA }).overlayBackground = { r: 0, g: 0, b: 0, a: 0.3 };
          }
          action = overlayAction;
        } else if (selectedActionType === 'CLOSE_OVERLAY') {
          action = {
            type: 'CLOSE_OVERLAY',
            transition: {
              type: selectedAnimation as TransitionType,
              duration,
              easing: 'EASE_OUT',
            },
          };
        } else if (selectedActionType === 'BACK') {
          action = {
            type: 'BACK',
            transition: {
              type: selectedAnimation as TransitionType,
              duration,
              easing: 'EASE_OUT',
            },
          };
        } else if (selectedActionType === 'SET_VARIABLE') {
          action = {
            type: 'SET_VARIABLE',
            variableId: selectedVariableId as string,
            operation: variableOperation as 'SET' | 'TOGGLE' | 'INCREMENT' | 'DECREMENT',
            value: variableValue,
          };
        } else if (selectedActionType === 'CONDITIONAL') {
          // Build the expression string for the condition
          let expression: string;
          if (conditionOperator === 'is_true') {
            expression = `\${${conditionVariableId}} == true`;
          } else if (conditionOperator === 'is_false') {
            expression = `\${${conditionVariableId}} == false`;
          } else {
            const opSymbols: Record<string, string> = {
              'equals': '==',
              'not_equals': '!=',
              'greater_than': '>',
              'less_than': '<',
            };
            const opSymbol = opSymbols[conditionOperator] ?? '==';
            const valueStr = typeof conditionValue === 'string' ? `"${conditionValue}"` : String(conditionValue);
            expression = `\${${conditionVariableId}} ${opSymbol} ${valueStr}`;
          }

          action = {
            type: 'CONDITIONAL',
            conditions: [{
              expression,
              actions: [{
                type: 'NAVIGATE',
                destinationId: conditionalThenDestId as string,
                transition: {
                  type: 'DISSOLVE' as TransitionType,
                  duration: 300,
                  easing: 'EASE_OUT',
                },
              }],
            }],
          };
        } else {
          action = {
            type: 'OPEN_URL',
            url: openUrl,
            openInNewTab,
          };
        }

        const interaction: PrototypeInteraction = {
          id: `interaction_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          triggerNodeId: nodeId as string,
          trigger: { type: triggerType } as InteractionTrigger,
          actions: [action],
        };

        interactionManager.addInteraction(interaction);
      }

      form.remove();
      framePicker?.dispose();
      variablePicker?.dispose();
      this.updateContent();
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    form.appendChild(btnRow);

    section.appendChild(form);
  }

  /**
   * Get trigger display name
   */
  private getTriggerDisplayName(type: string): string {
    const names: Record<string, string> = {
      'ON_CLICK': 'On Click',
      'ON_TAP': 'On Tap',
      'ON_HOVER': 'On Hover',
      'ON_DRAG': 'On Drag',
      'MOUSE_ENTER': 'Mouse Enter',
      'MOUSE_LEAVE': 'Mouse Leave',
      'MOUSE_DOWN': 'Mouse Down',
      'MOUSE_UP': 'Mouse Up',
      'AFTER_TIMEOUT': 'After Delay',
      'ON_KEY_DOWN': 'Key Press',
    };
    return names[type] ?? type;
  }

  /**
   * Get trigger type from display name
   */
  private getTriggerType(displayName: string): InteractionTrigger['type'] {
    const types: Record<string, InteractionTrigger['type']> = {
      'On Click': 'ON_CLICK',
      'On Hover': 'ON_HOVER',
      'On Drag': 'ON_DRAG',
      'Mouse Enter': 'MOUSE_ENTER',
      'Mouse Leave': 'MOUSE_LEAVE',
      'Mouse Down': 'MOUSE_DOWN',
      'Mouse Up': 'MOUSE_UP',
      'After Delay': 'AFTER_TIMEOUT',
      'Key Press': 'ON_KEY_DOWN',
    };
    return types[displayName] ?? 'ON_CLICK';
  }

  // =========================================================================
  // Inspect / Dev Mode Panel
  // =========================================================================

  private renderInspectPanel(nodes: NodeData[]): void {
    if (!this.contentElement) return;
    const node = nodes[0]!;

    this.renderNodeHeader(node);

    // LLM Context section (for AI-assisted code generation)
    this.renderLLMContextSection(node);

    // Data Bindings section
    this.renderDataBindingsSection(node);

    // Utility Classes section (new)
    this.renderUtilityClassesSection(node);

    // Export Tokens section
    this.renderExportTokensSection();

    // CSS Code section
    const cssSection = this.createSection('CSS');
    const cssCode = this.generateCSS(node);
    cssSection.appendChild(this.createCodeBlock(cssCode, 'css'));
    this.contentElement.appendChild(cssSection);

    // Measurements section
    const measureSection = this.createSection('Measurements');
    if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
      const n = node as FrameNodeData;
      measureSection.appendChild(this.createMeasurementRow('Position', `${n.x ?? 0}, ${n.y ?? 0}`));
      measureSection.appendChild(this.createMeasurementRow('Size', `${n.width ?? 0} × ${n.height ?? 0}`));
      if (n.rotation) {
        measureSection.appendChild(this.createMeasurementRow('Rotation', `${n.rotation}°`));
      }
    }
    this.contentElement.appendChild(measureSection);

    // Export section
    const exportSection = this.createSection('Export');
    const exportButtons = document.createElement('div');
    exportButtons.style.cssText = `display: flex; gap: 8px; flex-wrap: wrap;`;

    const formats = ['PNG', 'JPG', 'SVG', 'PDF'];
    for (const format of formats) {
      const btn = document.createElement('button');
      btn.style.cssText = `
        flex: 1;
        min-width: 60px;
        padding: 8px 12px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: var(--designlibre-sidebar-font-size-xs, 11px);
        cursor: pointer;
        transition: all 0.15s;
      `;
      btn.textContent = format;
      btn.addEventListener('click', async () => {
        try {
          if (format === 'PNG') {
            await this.runtime.downloadPNG(this.selectedNodeIds[0]!);
          } else if (format === 'SVG') {
            await this.runtime.downloadSVG(this.selectedNodeIds[0]!);
          }
          showCopyFeedback(btn, true);
        } catch (e) {
          console.error('Export failed:', e);
        }
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'var(--designlibre-accent, #4dabff)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'var(--designlibre-bg-secondary, #2d2d2d)';
      });
      exportButtons.appendChild(btn);
    }
    exportSection.appendChild(exportButtons);
    this.contentElement.appendChild(exportSection);
  }

  /**
   * Render utility classes section in Inspect panel.
   * Shows Tailwind-compatible utility classes for the selected node.
   */
  private renderUtilityClassesSection(node: NodeData): void {
    if (!this.contentElement) return;

    const section = this.createSection('Utility Classes');

    // Generate utility classes
    const options: UtilityClassOptions = {
      includePosition: false, // Position typically not in utility classes
      includeDimensions: true,
      useArbitraryValues: true,
      classPrefix: '',
    };
    const classes = nodeToUtilityClasses(node, options);
    const classString = classes.join(' ');

    // Class string display with copy button
    if (classes.length > 0) {
      const classStringContainer = document.createElement('div');
      classStringContainer.style.cssText = `
        position: relative;
        margin-bottom: 12px;
      `;

      const classStringDisplay = document.createElement('div');
      classStringDisplay.style.cssText = `
        padding: 10px 12px;
        padding-right: 70px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        border-radius: 6px;
        font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
        font-size: var(--designlibre-sidebar-font-size-xs, 11px);
        line-height: 1.6;
        color: var(--designlibre-text-primary, #e4e4e4);
        word-break: break-word;
        cursor: text;
        user-select: all;
      `;
      classStringDisplay.textContent = classString;
      classStringContainer.appendChild(classStringDisplay);

      // Copy button
      const copyAllBtn = document.createElement('button');
      copyAllBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 4px 10px;
        background: var(--designlibre-bg-tertiary, #252525);
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        color: var(--designlibre-text-secondary, #a0a0a0);
        font-size: 10px;
        cursor: pointer;
        transition: all 0.15s;
      `;
      copyAllBtn.textContent = 'Copy';
      copyAllBtn.addEventListener('click', async () => {
        const result = await copyToClipboard(classString);
        showCopyFeedback(copyAllBtn, result.success);
      });
      copyAllBtn.addEventListener('mouseenter', () => {
        copyAllBtn.style.background = 'var(--designlibre-accent, #4dabff)';
        copyAllBtn.style.color = 'white';
        copyAllBtn.style.borderColor = 'var(--designlibre-accent, #4dabff)';
      });
      copyAllBtn.addEventListener('mouseleave', () => {
        copyAllBtn.style.background = 'var(--designlibre-bg-tertiary, #252525)';
        copyAllBtn.style.color = 'var(--designlibre-text-secondary, #a0a0a0)';
        copyAllBtn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      });
      classStringContainer.appendChild(copyAllBtn);

      section.appendChild(classStringContainer);

      // Individual class chips
      const chipsContainer = document.createElement('div');
      chipsContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      `;

      // Group classes by category for better organization
      const categoryColors: Record<string, string> = {
        layout: '#8b5cf6',     // purple - flex, grid, gap
        spacing: '#06b6d4',    // cyan - p, m, w, h
        color: '#f59e0b',      // amber - bg, text, border colors
        typography: '#10b981', // emerald - font, text
        effects: '#ec4899',    // pink - shadow, opacity, blur
        border: '#6366f1',     // indigo - rounded, border
      };

      for (const cls of classes) {
        const chip = document.createElement('button');

        // Determine category for color coding
        let category = 'effects';
        if (cls.startsWith('flex') || cls.startsWith('grid') || cls.startsWith('gap') || cls.startsWith('items-') || cls.startsWith('justify-')) {
          category = 'layout';
        } else if (cls.startsWith('p-') || cls.startsWith('px-') || cls.startsWith('py-') || cls.startsWith('pt-') || cls.startsWith('pb-') || cls.startsWith('pl-') || cls.startsWith('pr-') || cls.startsWith('m-') || cls.startsWith('w-') || cls.startsWith('h-') || cls.startsWith('min-') || cls.startsWith('max-')) {
          category = 'spacing';
        } else if (cls.startsWith('bg-') || cls.startsWith('text-[#') || cls.startsWith('border-[#')) {
          category = 'color';
        } else if (cls.startsWith('font-') || cls.startsWith('text-') || cls.startsWith('leading-') || cls.startsWith('tracking-')) {
          category = 'typography';
        } else if (cls.startsWith('rounded') || cls.startsWith('border')) {
          category = 'border';
        }

        const chipColor = categoryColors[category] ?? '#6b7280';

        chip.style.cssText = `
          padding: 3px 8px;
          background: ${chipColor}20;
          border: 1px solid ${chipColor}40;
          border-radius: 4px;
          color: ${chipColor};
          font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        `;
        chip.textContent = cls;
        chip.title = `Click to copy: ${cls}`;

        chip.addEventListener('click', async () => {
          const result = await copyToClipboard(cls);
          showCopyFeedback(chip, result.success);
        });
        chip.addEventListener('mouseenter', () => {
          chip.style.background = `${chipColor}40`;
          chip.style.borderColor = chipColor;
        });
        chip.addEventListener('mouseleave', () => {
          chip.style.background = `${chipColor}20`;
          chip.style.borderColor = `${chipColor}40`;
        });

        chipsContainer.appendChild(chip);
      }

      section.appendChild(chipsContainer);

      // Category legend
      const legend = document.createElement('div');
      legend.style.cssText = `
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid var(--designlibre-border, #3d3d3d);
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        font-size: 9px;
        color: var(--designlibre-text-muted, #6a6a6a);
      `;

      const legendItems = [
        { label: 'Layout', color: categoryColors['layout'] },
        { label: 'Spacing', color: categoryColors['spacing'] },
        { label: 'Color', color: categoryColors['color'] },
        { label: 'Typography', color: categoryColors['typography'] },
        { label: 'Border', color: categoryColors['border'] },
        { label: 'Effects', color: categoryColors['effects'] },
      ];

      for (const item of legendItems) {
        const legendItem = document.createElement('span');
        legendItem.style.cssText = `display: flex; align-items: center; gap: 4px;`;

        const dot = document.createElement('span');
        dot.style.cssText = `width: 8px; height: 8px; border-radius: 2px; background: ${item.color};`;
        legendItem.appendChild(dot);

        const label = document.createElement('span');
        label.textContent = item.label;
        legendItem.appendChild(label);

        legend.appendChild(legendItem);
      }

      section.appendChild(legend);
    } else {
      // No utility classes generated
      const noClasses = document.createElement('div');
      noClasses.style.cssText = `
        padding: 16px;
        text-align: center;
        color: var(--designlibre-text-muted, #6a6a6a);
        font-size: var(--designlibre-sidebar-font-size-xs, 11px);
        background: var(--designlibre-bg-secondary, #2d2d2d);
        border-radius: 6px;
      `;
      noClasses.textContent = 'No utility classes for this element';
      section.appendChild(noClasses);
    }

    this.contentElement.appendChild(section);
  }

  /**
   * Render export tokens section in Inspect panel.
   * Allows extracting design tokens and exporting in various formats.
   */
  private renderExportTokensSection(): void {
    if (!this.contentElement) return;

    const section = this.createSection('Design Tokens');

    // Description
    const description = document.createElement('div');
    description.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
      margin-bottom: 12px;
      line-height: 1.4;
    `;
    description.textContent = 'Extract design tokens from your design and export as configuration files.';
    section.appendChild(description);

    // Format selector
    const formatRow = document.createElement('div');
    formatRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    `;

    const formatLabel = document.createElement('span');
    formatLabel.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;
    formatLabel.textContent = 'Format:';
    formatRow.appendChild(formatLabel);

    const formatSelect = document.createElement('select');
    formatSelect.style.cssText = `
      flex: 1;
      height: 28px;
      padding: 0 8px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      cursor: pointer;
    `;

    const formats: { value: TokenOutputFormat; label: string; ext: string }[] = [
      { value: 'css', label: 'CSS Custom Properties', ext: '.css' },
      { value: 'scss', label: 'SCSS Variables', ext: '.scss' },
      { value: 'tailwind', label: 'Tailwind Config', ext: '.js' },
      { value: 'unocss', label: 'UnoCSS Config', ext: '.ts' },
      { value: 'dtcg', label: 'Design Tokens (DTCG)', ext: '.json' },
    ];

    for (const format of formats) {
      const option = document.createElement('option');
      option.value = format.value;
      option.textContent = `${format.label} (${format.ext})`;
      formatSelect.appendChild(option);
    }
    formatRow.appendChild(formatSelect);
    section.appendChild(formatRow);

    // Scope selector
    const scopeRow = document.createElement('div');
    scopeRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    `;

    const scopeLabel = document.createElement('span');
    scopeLabel.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;
    scopeLabel.textContent = 'Scope:';
    scopeRow.appendChild(scopeLabel);

    const scopeSelect = document.createElement('select');
    scopeSelect.style.cssText = formatSelect.style.cssText;

    const scopes = [
      { value: 'selected', label: 'Selected Element' },
      { value: 'page', label: 'Current Page' },
      { value: 'all', label: 'Entire Document' },
    ];

    for (const scope of scopes) {
      const option = document.createElement('option');
      option.value = scope.value;
      option.textContent = scope.label;
      scopeSelect.appendChild(option);
    }
    scopeRow.appendChild(scopeSelect);
    section.appendChild(scopeRow);

    // Action buttons
    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `display: flex; gap: 8px;`;

    // Copy to clipboard button
    const copyBtn = document.createElement('button');
    copyBtn.style.cssText = `
      flex: 1;
      padding: 10px 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    `;
    copyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      <span>Copy</span>
    `;
    copyBtn.addEventListener('click', async () => {
      const result = this.extractTokens(
        formatSelect.value as TokenOutputFormat,
        scopeSelect.value as 'selected' | 'page' | 'all'
      );
      if (result) {
        const copyResult = await copyToClipboard(result.output);
        showCopyFeedback(copyBtn, copyResult.success);
      }
    });
    copyBtn.addEventListener('mouseenter', () => {
      copyBtn.style.background = 'var(--designlibre-accent, #4dabff)';
      copyBtn.style.borderColor = 'var(--designlibre-accent, #4dabff)';
    });
    copyBtn.addEventListener('mouseleave', () => {
      copyBtn.style.background = 'var(--designlibre-bg-secondary, #2d2d2d)';
      copyBtn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
    });
    buttonRow.appendChild(copyBtn);

    // Download button
    const downloadBtn = document.createElement('button');
    downloadBtn.style.cssText = copyBtn.style.cssText;
    downloadBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Download</span>
    `;
    downloadBtn.addEventListener('click', () => {
      const result = this.extractTokens(
        formatSelect.value as TokenOutputFormat,
        scopeSelect.value as 'selected' | 'page' | 'all'
      );
      if (result) {
        this.downloadFile(result.output, result.fileName);
        showCopyFeedback(downloadBtn, true);
      }
    });
    downloadBtn.addEventListener('mouseenter', () => {
      downloadBtn.style.background = 'var(--designlibre-accent, #4dabff)';
      downloadBtn.style.borderColor = 'var(--designlibre-accent, #4dabff)';
    });
    downloadBtn.addEventListener('mouseleave', () => {
      downloadBtn.style.background = 'var(--designlibre-bg-secondary, #2d2d2d)';
      downloadBtn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
    });
    buttonRow.appendChild(downloadBtn);

    section.appendChild(buttonRow);

    // Token summary (will update when extracted)
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'token-summary';
    summaryContainer.style.cssText = `
      margin-top: 12px;
      padding: 10px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;

    // Show a preview of what will be extracted
    const previewResult = this.extractTokens('css', 'selected');
    if (previewResult) {
      const { tokens } = previewResult;
      const counts = [
        tokens.colors.length > 0 ? `${tokens.colors.length} colors` : null,
        tokens.spacing.length > 0 ? `${tokens.spacing.length} spacing` : null,
        tokens.typography.length > 0 ? `${tokens.typography.length} typography` : null,
        tokens.shadows.length > 0 ? `${tokens.shadows.length} shadows` : null,
        tokens.radii.length > 0 ? `${tokens.radii.length} radii` : null,
      ].filter(Boolean);

      if (counts.length > 0) {
        summaryContainer.innerHTML = `
          <div style="font-weight: 500; color: var(--designlibre-text-primary, #e4e4e4); margin-bottom: 4px;">
            Tokens found:
          </div>
          <div>${counts.join(' • ')}</div>
        `;
      } else {
        summaryContainer.textContent = 'No tokens found in selection. Try selecting more elements or changing scope.';
      }
    } else {
      summaryContainer.textContent = 'Select elements to extract design tokens.';
    }
    section.appendChild(summaryContainer);

    this.contentElement.appendChild(section);
  }

  /**
   * Extract tokens from the design based on scope.
   */
  private extractTokens(
    format: TokenOutputFormat,
    scope: 'selected' | 'page' | 'all'
  ): { output: string; fileName: string; tokens: ExtractedTokens } | null {
    const sceneGraph = this.runtime.getSceneGraph();
    const extractor = createTokenExtractor(sceneGraph, {
      scope,
      deduplicate: true,
      generateNames: true,
    });

    let nodeIds: NodeId[] | undefined;
    if (scope === 'selected' && this.selectedNodeIds.length > 0) {
      nodeIds = this.selectedNodeIds;
    }

    const result = extractor.extractAndExport(format, nodeIds);
    return {
      output: result.output,
      fileName: result.fileName,
      tokens: result.tokens,
    };
  }

  /**
   * Download a file with the given content.
   */
  private downloadFile(content: string, fileName: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private generateCSS(node: NodeData): string {
    const lines: string[] = [];

    if ('width' in node && 'height' in node) {
      const n = node as FrameNodeData;
      lines.push(`width: ${n.width}px;`);
      lines.push(`height: ${n.height}px;`);
    }

    if ('rotation' in node && (node as FrameNodeData).rotation) {
      lines.push(`transform: rotate(${(node as FrameNodeData).rotation}deg);`);
    }

    if ('fills' in node) {
      const fills = (node as FrameNodeData).fills ?? [];
      const solidFill = fills.find(f => f.type === 'SOLID');
      if (solidFill && solidFill.type === 'SOLID') {
        const color = (solidFill as SolidPaint).color;
        lines.push(`background-color: ${rgbaToHex(color)};`);
      }
    }

    if ('strokes' in node) {
      const strokes = (node as VectorNodeData).strokes ?? [];
      const solidStroke = strokes.find(s => s.type === 'SOLID');
      if (solidStroke && solidStroke.type === 'SOLID') {
        const weight = (node as VectorNodeData).strokeWeight ?? 1;
        const color = (solidStroke as SolidPaint).color;
        lines.push(`border: ${weight}px solid ${rgbaToHex(color)};`);
      }
    }

    // Check for cornerRadius using 'in' operator since it may not be in the base type
    if ('cornerRadius' in node) {
      const radius = (node as { cornerRadius?: number }).cornerRadius;
      if (radius) {
        lines.push(`border-radius: ${radius}px;`);
      }
    }

    if ('opacity' in node && (node as FrameNodeData).opacity !== undefined && (node as FrameNodeData).opacity !== 1) {
      lines.push(`opacity: ${(node as FrameNodeData).opacity};`);
    }

    return lines.join('\n') || '/* No styles */';
  }

  private createCodeBlock(code: string, _language: string): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `position: relative;`;

    const pre = document.createElement('pre');
    pre.style.cssText = `
      margin: 0;
      padding: 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
      font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      line-height: 1.5;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    `;
    pre.textContent = code;
    container.appendChild(pre);

    const copyBtn = document.createElement('button');
    copyBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 8px;
      background: var(--designlibre-bg-tertiary, #252525);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text-secondary, #a0a0a0);
      font-size: 10px;
      cursor: pointer;
    `;
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', async () => {
      const result = await copyToClipboard(code);
      showCopyFeedback(copyBtn, result.success);
    });
    container.appendChild(copyBtn);

    return container;
  }

  private createMeasurementRow(label: string, value: string): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    `;

    const labelEl = document.createElement('span');
    labelEl.style.cssText = `color: var(--designlibre-text-secondary, #a0a0a0);`;
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.style.cssText = `font-family: 'SF Mono', monospace; font-size: var(--designlibre-sidebar-font-size-xs, 11px);`;
    valueEl.textContent = value;
    row.appendChild(valueEl);

    return row;
  }

  // =========================================================================
  // UI Helper Methods
  // =========================================================================

  private createSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `margin-bottom: 20px;`;

    const header = document.createElement('div');
    header.style.cssText = `
      font-weight: 600;
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--designlibre-text-secondary, #a0a0a0);
      margin-bottom: 10px;
    `;
    header.textContent = title;
    section.appendChild(header);

    return section;
  }

  private createPropertyRow(): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; align-items: center; gap: 8px; margin-bottom: 8px;`;
    return row;
  }

  private createPropertyRow2Col(): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; gap: 8px; margin-bottom: 8px;`;
    return row;
  }

  private createNumberField(label: string, value: number, onChange: (v: number) => void): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `flex: 1; display: flex; align-items: center; gap: 4px;`;

    const labelEl = document.createElement('span');
    labelEl.style.cssText = `color: var(--designlibre-text-secondary); font-size: var(--designlibre-sidebar-font-size-xs, 11px); width: 14px;`;
    labelEl.textContent = label;
    container.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'number';
    input.value = String(Math.round(value * 100) / 100);
    input.style.cssText = `
      flex: 1;
      width: 100%;
      height: 26px;
      padding: 0 6px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-family: 'SF Mono', monospace;
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
    `;
    input.addEventListener('change', () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) onChange(v);
    });
    container.appendChild(input);

    return container;
  }

  private createLabeledNumberField(label: string, value: number, unit: string, onChange: (v: number) => void): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;`;

    const labelEl = document.createElement('span');
    labelEl.style.cssText = `color: var(--designlibre-text-secondary); font-size: var(--designlibre-sidebar-font-size-sm, 12px);`;
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const inputWrap = document.createElement('div');
    inputWrap.style.cssText = `display: flex; align-items: center; gap: 4px;`;

    const input = document.createElement('input');
    input.type = 'number';
    input.value = String(Math.round(value * 100) / 100);
    input.style.cssText = `
      width: 60px;
      height: 26px;
      padding: 0 6px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-family: 'SF Mono', monospace;
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      text-align: right;
    `;
    input.addEventListener('change', () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) onChange(v);
    });
    inputWrap.appendChild(input);

    if (unit) {
      const unitEl = document.createElement('span');
      unitEl.style.cssText = `color: var(--designlibre-text-secondary); font-size: var(--designlibre-sidebar-font-size-xs, 11px);`;
      unitEl.textContent = unit;
      inputWrap.appendChild(unitEl);
    }

    row.appendChild(inputWrap);
    return row;
  }

  private createLabeledDropdown(label: string, value: string, options: string[], onChange: (v: string) => void): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;`;

    const labelEl = document.createElement('span');
    labelEl.style.cssText = `color: var(--designlibre-text-secondary); font-size: var(--designlibre-sidebar-font-size-sm, 12px);`;
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100px;
      height: 26px;
      padding: 0 6px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      cursor: pointer;
    `;
    for (const opt of options) {
      const optEl = document.createElement('option');
      optEl.value = opt;
      optEl.textContent = opt;
      optEl.selected = opt === value;
      select.appendChild(optEl);
    }
    select.addEventListener('change', () => onChange(select.value));
    row.appendChild(select);

    return row;
  }

  private createColorField(color: RGBA, onChange: (c: RGBA) => void): HTMLElement {
    return this.createHSVColorPicker(color, onChange);
  }

  /**
   * Create an HSV color picker with saturation-value plane and hue slider.
   */
  private createHSVColorPicker(initialColor: RGBA, onChange: (c: RGBA) => void): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `margin-bottom: 8px;`;

    // Convert initial RGBA to RGB (0-255)
    const initRgb: [number, number, number] = [
      Math.round(initialColor.r * 255),
      Math.round(initialColor.g * 255),
      Math.round(initialColor.b * 255),
    ];

    // HSV conversion functions
    const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
      const c = v * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = v - c;
      let r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255),
      ];
    };

    const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      let h = 0;
      const s = max === 0 ? 0 : d / max;
      const v = max;
      if (d !== 0) {
        if (max === r) h = 60 * (((g - b) / d) % 6);
        else if (max === g) h = 60 * ((b - r) / d + 2);
        else h = 60 * ((r - g) / d + 4);
      }
      if (h < 0) h += 360;
      return [h, s, v];
    };

    const rgbToHex = (r: number, g: number, b: number): string => {
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    };

    const hexToRgb = (hex: string): [number, number, number] | null => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return null;
      return [parseInt(result[1]!, 16), parseInt(result[2]!, 16), parseInt(result[3]!, 16)];
    };

    // Initialize HSV from color
    const [initH, initS, initV] = rgbToHsv(initRgb[0], initRgb[1], initRgb[2]);
    let currentHue = initH;
    let currentSat = initS;
    let currentVal = initV;

    // Saturation-Value plane
    const svContainer = document.createElement('div');
    svContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: 120px;
      border-radius: 6px;
      margin-bottom: 8px;
      cursor: crosshair;
      overflow: hidden;
    `;

    const svCanvas = document.createElement('canvas');
    svCanvas.width = 256;
    svCanvas.height = 120;
    svCanvas.style.cssText = `width: 100%; height: 100%; border-radius: 6px;`;

    const svCursor = document.createElement('div');
    svCursor.style.cssText = `
      position: absolute;
      width: 12px;
      height: 12px;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.3);
      pointer-events: none;
      transform: translate(-50%, -50%);
    `;

    svContainer.appendChild(svCanvas);
    svContainer.appendChild(svCursor);

    // Draw SV plane
    const drawSVPlane = () => {
      const ctx = svCanvas.getContext('2d')!;
      const width = svCanvas.width;
      const height = svCanvas.height;
      const [hr, hg, hb] = hsvToRgb(currentHue, 1, 1);
      const gradH = ctx.createLinearGradient(0, 0, width, 0);
      gradH.addColorStop(0, 'white');
      gradH.addColorStop(1, `rgb(${hr},${hg},${hb})`);
      ctx.fillStyle = gradH;
      ctx.fillRect(0, 0, width, height);
      const gradV = ctx.createLinearGradient(0, 0, 0, height);
      gradV.addColorStop(0, 'rgba(0,0,0,0)');
      gradV.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = gradV;
      ctx.fillRect(0, 0, width, height);
    };

    const updateSVCursor = () => {
      svCursor.style.left = `${currentSat * 100}%`;
      svCursor.style.top = `${(1 - currentVal) * 100}%`;
    };

    // Hue slider
    const hueContainer = document.createElement('div');
    hueContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: 12px;
      border-radius: 6px;
      margin-bottom: 8px;
      cursor: pointer;
      background: linear-gradient(to right,
        hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%),
        hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%)
      );
    `;

    const hueCursor = document.createElement('div');
    hueCursor.style.cssText = `
      position: absolute;
      width: 6px;
      height: 16px;
      background: white;
      border-radius: 3px;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
      pointer-events: none;
      transform: translate(-50%, -2px);
      top: 0;
    `;
    hueContainer.appendChild(hueCursor);

    const updateHueCursor = () => {
      hueCursor.style.left = `${(currentHue / 360) * 100}%`;
    };

    // Preview and hex input row
    const inputRow = document.createElement('div');
    inputRow.style.cssText = `display: flex; align-items: center; gap: 8px;`;

    const [iR, iG, iB] = hsvToRgb(currentHue, currentSat, currentVal);
    const previewSwatch = document.createElement('div');
    previewSwatch.style.cssText = `
      width: 32px;
      height: 32px;
      border-radius: 4px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      background: ${rgbToHex(iR, iG, iB)};
      flex-shrink: 0;
    `;

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.value = rgbToHex(iR, iG, iB);
    hexInput.style.cssText = `
      flex: 1;
      height: 28px;
      padding: 0 8px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-family: monospace;
      font-size: 11px;
    `;

    inputRow.appendChild(previewSwatch);
    inputRow.appendChild(hexInput);

    // Update displays and call onChange
    const updateDisplays = () => {
      const [r, g, b] = hsvToRgb(currentHue, currentSat, currentVal);
      const hex = rgbToHex(r, g, b);
      hexInput.value = hex;
      previewSwatch.style.background = hex;
      onChange({ r: r / 255, g: g / 255, b: b / 255, a: initialColor.a });
    };

    // SV interaction
    let svDragging = false;
    const handleSV = (e: MouseEvent | TouchEvent) => {
      const rect = svContainer.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
      currentSat = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      currentVal = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      updateSVCursor();
      updateDisplays();
    };

    svContainer.addEventListener('mousedown', (e) => { svDragging = true; handleSV(e); });
    svContainer.addEventListener('touchstart', (e) => { svDragging = true; handleSV(e); e.preventDefault(); });

    // Hue interaction
    let hueDragging = false;
    const handleHue = (e: MouseEvent | TouchEvent) => {
      const rect = hueContainer.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
      currentHue = Math.max(0, Math.min(360, ((clientX - rect.left) / rect.width) * 360));
      updateHueCursor();
      drawSVPlane();
      updateDisplays();
    };

    hueContainer.addEventListener('mousedown', (e) => { hueDragging = true; handleHue(e); });
    hueContainer.addEventListener('touchstart', (e) => { hueDragging = true; handleHue(e); e.preventDefault(); });

    // Global move/up handlers
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (svDragging) handleSV(e);
      if (hueDragging) handleHue(e);
    };
    const handleUp = () => { svDragging = false; hueDragging = false; };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleUp);

    // Hex input change
    hexInput.addEventListener('blur', () => {
      let val = hexInput.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      const rgb = hexToRgb(val);
      if (rgb) {
        hexInput.value = val.toUpperCase();
        const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
        currentHue = h;
        currentSat = s;
        currentVal = v;
        drawSVPlane();
        updateSVCursor();
        updateHueCursor();
        updateDisplays();
      } else {
        updateDisplays();
      }
    });

    container.appendChild(svContainer);
    container.appendChild(hueContainer);
    container.appendChild(inputRow);

    // Initial draw
    drawSVPlane();
    updateSVCursor();
    updateHueCursor();

    return container;
  }

  private createSliderField(label: string, value: number, min: number, max: number, unit: string, onChange: (v: number) => void): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; align-items: center; gap: 8px; margin-bottom: 8px;`;

    const labelEl = document.createElement('span');
    labelEl.style.cssText = `color: var(--designlibre-text-secondary); font-size: var(--designlibre-sidebar-font-size-xs, 11px); width: 50px;`;
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.style.cssText = `flex: 1; accent-color: var(--designlibre-accent, #4dabff);`;
    row.appendChild(slider);

    const valueEl = document.createElement('span');
    valueEl.style.cssText = `font-size: var(--designlibre-sidebar-font-size-xs, 11px); width: 40px; text-align: right;`;
    valueEl.textContent = `${Math.round(value)}${unit}`;
    row.appendChild(valueEl);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueEl.textContent = `${Math.round(v)}${unit}`;
      onChange(v);
    });

    return row;
  }

  private createToggleWithFields(label: string, enabled: boolean, onChange: (enabled: boolean) => void): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;`;

    const labelEl = document.createElement('span');
    labelEl.style.cssText = `color: var(--designlibre-text-primary); font-size: var(--designlibre-sidebar-font-size-sm, 12px);`;
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = enabled;
    toggle.style.cssText = `
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--designlibre-accent, #4dabff);
    `;
    toggle.addEventListener('change', () => onChange(toggle.checked));
    row.appendChild(toggle);

    return row;
  }

  private createButton(text: string, onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.style.cssText = `
      width: 100%;
      padding: 8px;
      background: transparent;
      border: 1px dashed var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text-secondary, #a0a0a0);
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      cursor: pointer;
      transition: all 0.15s;
    `;
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = 'var(--designlibre-accent, #4dabff)';
      btn.style.color = 'var(--designlibre-accent, #4dabff)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      btn.style.color = 'var(--designlibre-text-secondary, #a0a0a0)';
    });
    return btn;
  }

  private updateNode(nodeId: NodeId, props: Record<string, unknown>): void {
    const sceneGraph = this.runtime.getSceneGraph();
    sceneGraph.updateNode(nodeId, props);
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
  // =========================================================================
  // Semantic Properties Section (Code-Ready Design)
  // =========================================================================

  /**
   * All available semantic node types for the dropdown
   */
  private static readonly SEMANTIC_TYPES: SemanticNodeType[] = [
    'Button',
    'IconButton',
    'TextField',
    'TextArea',
    'Checkbox',
    'Toggle',
    'RadioButton',
    'Slider',
    'Picker',
    'DatePicker',
    'Text',
    'Label',
    'Heading',
    'Link',
    'Image',
    'Icon',
    'Avatar',
    'Card',
    'List',
    'ListItem',
    'Grid',
    'Stack',
    'Container',
    'Divider',
    'Spacer',
    'NavigationBar',
    'TabBar',
    'TabItem',
    'Toolbar',
    'Modal',
    'Sheet',
    'Alert',
    'Toast',
    'Badge',
    'ProgressBar',
    'Spinner',
    'Skeleton',
    'Custom',
  ];

  /**
   * Render semantic properties section for code-ready design.
   * Allows assigning semantic types and accessibility properties.
   */
  private renderSemanticSection(node: NodeData, nodeId: NodeId): void {
    if (!this.contentElement) return;

    // Get existing semantic metadata from pluginData
    const pluginData = (node as { pluginData?: Record<string, unknown> }).pluginData ?? {};
    const semanticData = getSemanticMetadata(pluginData);

    // Create collapsible section
    const section = document.createElement('div');
    section.style.cssText = `margin-bottom: 20px;`;

    // Section header with collapse toggle
    const headerRow = document.createElement('div');
    headerRow.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      margin-bottom: 10px;
    `;

    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = `display: flex; align-items: center; gap: 6px;`;

    const expandIcon = document.createElement('span');
    expandIcon.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="6 9 12 15 18 9"/>
    </svg>`;
    expandIcon.style.cssText = `
      color: var(--designlibre-text-secondary, #a0a0a0);
      transition: transform 0.15s ease;
    `;
    headerLeft.appendChild(expandIcon);

    const header = document.createElement('span');
    header.style.cssText = `
      font-weight: 600;
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;
    header.textContent = 'Semantic';
    headerLeft.appendChild(header);

    // Badge showing semantic type if set
    if (semanticData) {
      const badge = document.createElement('span');
      badge.style.cssText = `
        padding: 2px 6px;
        font-size: 9px;
        background: var(--designlibre-accent, #0d99ff);
        color: white;
        border-radius: 4px;
        font-weight: 500;
      `;
      badge.textContent = semanticData.semanticType;
      headerLeft.appendChild(badge);
    }

    headerRow.appendChild(headerLeft);

    // Expand/collapse content area
    const content = document.createElement('div');
    content.style.cssText = `display: block;`;

    // Toggle expand/collapse
    let expanded = true;
    headerRow.addEventListener('click', () => {
      expanded = !expanded;
      content.style.display = expanded ? 'block' : 'none';
      expandIcon.style.transform = expanded ? 'rotate(0deg)' : 'rotate(-90deg)';
    });

    section.appendChild(headerRow);

    // Semantic Type dropdown
    const typeRow = this.createPropertyRow();
    const typeLabel = document.createElement('span');
    typeLabel.textContent = 'Type';
    typeLabel.style.cssText = `
      width: 80px;
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;

    const typeSelect = document.createElement('select');
    typeSelect.style.cssText = `
      flex: 1;
      padding: 4px 8px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      cursor: pointer;
    `;

    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '— None —';
    typeSelect.appendChild(emptyOption);

    // Add all semantic types
    for (const type of InspectorPanel.SEMANTIC_TYPES) {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      if (semanticData?.semanticType === type) {
        option.selected = true;
      }
      typeSelect.appendChild(option);
    }

    typeSelect.addEventListener('change', () => {
      const selectedType = typeSelect.value as SemanticNodeType | '';
      if (selectedType === '') {
        // Remove semantic metadata
        const newPluginData = { ...pluginData };
        delete newPluginData[SEMANTIC_PLUGIN_KEY];
        this.updateNode(nodeId, { pluginData: newPluginData });
      } else {
        // Create or update semantic metadata
        const newMetadata = createSemanticMetadata(selectedType, {
          platformSemantics: SEMANTIC_TYPE_DEFAULTS[selectedType],
          accessibility: semanticData?.accessibility ?? { focusable: false },
        });
        const newPluginData = setSemanticMetadata(pluginData, newMetadata);
        this.updateNode(nodeId, { pluginData: newPluginData });
      }
    });

    typeRow.appendChild(typeLabel);
    typeRow.appendChild(typeSelect);
    content.appendChild(typeRow);

    // Only show accessibility properties if semantic type is set
    if (semanticData) {
      const a11yHeader = document.createElement('div');
      a11yHeader.style.cssText = `
        font-size: var(--designlibre-sidebar-font-size-xs, 11px);
        color: var(--designlibre-text-muted, #6a6a6a);
        margin: 12px 0 8px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      a11yHeader.textContent = 'Accessibility';
      content.appendChild(a11yHeader);

      // Role dropdown
      const roleRow = this.createPropertyRow();
      const roleLabel = document.createElement('span');
      roleLabel.textContent = 'Role';
      roleLabel.style.cssText = `
        width: 80px;
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        color: var(--designlibre-text-secondary, #a0a0a0);
      `;

      const roleInput = document.createElement('input');
      roleInput.type = 'text';
      roleInput.value = semanticData.accessibility.role ?? '';
      roleInput.placeholder = 'button, link, heading...';
      roleInput.style.cssText = `
        flex: 1;
        padding: 4px 8px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      `;
      roleInput.addEventListener('change', () => {
        const value = roleInput.value.trim();
        this.updateSemanticAccessibility(nodeId, pluginData, semanticData, 'role', value || null);
      });

      roleRow.appendChild(roleLabel);
      roleRow.appendChild(roleInput);
      content.appendChild(roleRow);

      // Label input
      const labelRow = this.createPropertyRow();
      const labelLabel = document.createElement('span');
      labelLabel.textContent = 'Label';
      labelLabel.style.cssText = `
        width: 80px;
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        color: var(--designlibre-text-secondary, #a0a0a0);
      `;

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.value = semanticData.accessibility.label ?? '';
      labelInput.placeholder = 'Screen reader label';
      labelInput.style.cssText = `
        flex: 1;
        padding: 4px 8px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      `;
      labelInput.addEventListener('change', () => {
        const value = labelInput.value.trim();
        this.updateSemanticAccessibility(nodeId, pluginData, semanticData, 'label', value || null);
      });

      labelRow.appendChild(labelLabel);
      labelRow.appendChild(labelInput);
      content.appendChild(labelRow);

      // Description input
      const descRow = this.createPropertyRow();
      const descLabel = document.createElement('span');
      descLabel.textContent = 'Desc';
      descLabel.style.cssText = `
        width: 80px;
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        color: var(--designlibre-text-secondary, #a0a0a0);
      `;

      const descInput = document.createElement('input');
      descInput.type = 'text';
      descInput.value = semanticData.accessibility.description ?? '';
      descInput.placeholder = 'Extended description';
      descInput.style.cssText = `
        flex: 1;
        padding: 4px 8px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      `;
      descInput.addEventListener('change', () => {
        const value = descInput.value.trim();
        this.updateSemanticAccessibility(nodeId, pluginData, semanticData, 'description', value || null);
      });

      descRow.appendChild(descLabel);
      descRow.appendChild(descInput);
      content.appendChild(descRow);

      // Focusable toggle
      const focusRow = this.createPropertyRow();
      const focusLabel = document.createElement('span');
      focusLabel.textContent = 'Focusable';
      focusLabel.style.cssText = `
        flex: 1;
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        color: var(--designlibre-text-secondary, #a0a0a0);
      `;

      const focusToggle = document.createElement('button');
      focusToggle.style.cssText = `
        width: 40px;
        height: 22px;
        border-radius: 11px;
        border: none;
        cursor: pointer;
        position: relative;
        transition: background-color 0.2s;
        background: ${semanticData.accessibility.focusable ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-bg-tertiary, #3d3d3d)'};
      `;

      const focusKnob = document.createElement('span');
      focusKnob.style.cssText = `
        position: absolute;
        top: 2px;
        left: ${semanticData.accessibility.focusable ? '20px' : '2px'};
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        transition: left 0.2s;
      `;
      focusToggle.appendChild(focusKnob);

      focusToggle.addEventListener('click', () => {
        const newFocusable = !semanticData.accessibility.focusable;
        focusToggle.style.background = newFocusable
          ? 'var(--designlibre-accent, #0d99ff)'
          : 'var(--designlibre-bg-tertiary, #3d3d3d)';
        focusKnob.style.left = newFocusable ? '20px' : '2px';
        this.updateSemanticAccessibility(nodeId, pluginData, semanticData, 'focusable', newFocusable);
      });

      focusRow.appendChild(focusLabel);
      focusRow.appendChild(focusToggle);
      content.appendChild(focusRow);

      // Hint input (for screen readers)
      const hintRow = this.createPropertyRow();
      const hintLabel = document.createElement('span');
      hintLabel.textContent = 'Hint';
      hintLabel.style.cssText = `
        width: 80px;
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
        color: var(--designlibre-text-secondary, #a0a0a0);
      `;

      const hintInput = document.createElement('input');
      hintInput.type = 'text';
      hintInput.value = semanticData.accessibility.hint ?? '';
      hintInput.placeholder = 'Activation hint';
      hintInput.style.cssText = `
        flex: 1;
        padding: 4px 8px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: var(--designlibre-sidebar-font-size-sm, 12px);
      `;
      hintInput.addEventListener('change', () => {
        const value = hintInput.value.trim();
        this.updateSemanticAccessibility(nodeId, pluginData, semanticData, 'hint', value || null);
      });

      hintRow.appendChild(hintLabel);
      hintRow.appendChild(hintInput);
      content.appendChild(hintRow);
    }

    section.appendChild(content);
    this.contentElement.appendChild(section);
  }

  /**
   * Helper to update accessibility properties in semantic metadata
   */
  private updateSemanticAccessibility(
    nodeId: NodeId,
    pluginData: Record<string, unknown>,
    currentMetadata: SemanticMetadata,
    key: keyof AccessibilityConfig,
    value: string | boolean | number | null
  ): void {
    // Build new accessibility config, removing key if value is null
    const newAccessibility: AccessibilityConfig = { ...currentMetadata.accessibility };
    if (value === null) {
      delete newAccessibility[key];
    } else {
      (newAccessibility as Record<string, unknown>)[key] = value;
    }

    const newMetadata: SemanticMetadata = {
      ...currentMetadata,
      accessibility: newAccessibility,
    };
    const newPluginData = setSemanticMetadata(pluginData, newMetadata);
    this.updateNode(nodeId, { pluginData: newPluginData });
  }

  // =========================================================================
  // LLM Context Section (Inspect Tab)
  // =========================================================================

  /**
   * Render LLM context section for AI-assisted code generation
   */
  private renderLLMContextSection(node: NodeData): void {
    if (!this.contentElement) return;

    const section = this.createSection('AI Context');
    const nodeId = node.id;

    // Get existing semantic metadata
    const pluginData = (node as { pluginData?: Record<string, unknown> }).pluginData ?? {};
    const semantic = getSemanticMetadata(pluginData);
    const llmContext = semantic?.llmContext ?? {};

    // Description
    const description = document.createElement('div');
    description.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
      margin-bottom: 12px;
      line-height: 1.4;
    `;
    description.textContent = 'Add context to help AI understand this element for code generation.';
    section.appendChild(description);

    // Purpose field
    const purposeRow = this.createLLMContextField(
      'Purpose',
      'What is this element for?',
      llmContext.purpose ?? '',
      (value) => this.updateLLMContext(nodeId, pluginData, semantic, 'purpose', value)
    );
    section.appendChild(purposeRow);

    // Business Logic Notes (multi-line)
    const businessNotesRow = this.createLLMContextListField(
      'Business Logic',
      'Add implementation notes...',
      llmContext.businessLogicNotes ?? [],
      (notes) => this.updateLLMContext(nodeId, pluginData, semantic, 'businessLogicNotes', notes)
    );
    section.appendChild(businessNotesRow);

    // API Endpoints
    const apiEndpointsRow = this.createLLMContextListField(
      'API Endpoints',
      'POST /api/users, GET /api/data...',
      llmContext.apiEndpoints ?? [],
      (endpoints) => this.updateLLMContext(nodeId, pluginData, semantic, 'apiEndpoints', endpoints)
    );
    section.appendChild(apiEndpointsRow);

    // Validation Rules
    const validationRow = this.createLLMContextListField(
      'Validation Rules',
      'Required, min length 8, email format...',
      llmContext.validationRules ?? [],
      (rules) => this.updateLLMContext(nodeId, pluginData, semantic, 'validationRules', rules)
    );
    section.appendChild(validationRow);

    // TODO Suggestions
    const todoRow = this.createLLMContextListField(
      'TODO Suggestions',
      'Implement error handling, Add analytics...',
      llmContext.todoSuggestions ?? [],
      (todos) => this.updateLLMContext(nodeId, pluginData, semantic, 'todoSuggestions', todos)
    );
    section.appendChild(todoRow);

    // Data Dependencies
    const dataDepsRow = this.createLLMContextListField(
      'Data Dependencies',
      'User profile, Cart items, Auth state...',
      llmContext.dataDependencies ?? [],
      (deps) => this.updateLLMContext(nodeId, pluginData, semantic, 'dataDependencies', deps)
    );
    section.appendChild(dataDepsRow);

    this.contentElement.appendChild(section);
  }

  /**
   * Create a single-line LLM context field
   */
  private createLLMContextField(
    label: string,
    placeholder: string,
    value: string,
    onChange: (value: string) => void
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `margin-bottom: 12px;`;

    const labelEl = document.createElement('div');
    labelEl.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
      margin-bottom: 4px;
    `;
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.value = value;
    input.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
    `;
    input.addEventListener('change', () => {
      onChange(input.value.trim());
    });
    row.appendChild(input);

    return row;
  }

  /**
   * Create a list-based LLM context field with add/remove
   */
  private createLLMContextListField(
    label: string,
    placeholder: string,
    items: string[],
    onChange: (items: string[]) => void
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `margin-bottom: 12px;`;

    const labelEl = document.createElement('div');
    labelEl.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
      margin-bottom: 4px;
    `;
    labelEl.textContent = label;
    row.appendChild(labelEl);

    // Items container
    const itemsContainer = document.createElement('div');
    itemsContainer.style.cssText = `margin-bottom: 8px;`;

    const renderItems = () => {
      itemsContainer.innerHTML = '';
      for (let i = 0; i < items.length; i++) {
        const itemRow = document.createElement('div');
        itemRow.style.cssText = `
          display: flex;
          gap: 4px;
          margin-bottom: 4px;
        `;

        const itemInput = document.createElement('input');
        itemInput.type = 'text';
        itemInput.value = items[i] ?? '';
        itemInput.style.cssText = `
          flex: 1;
          padding: 6px 8px;
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 4px;
          background: var(--designlibre-bg-secondary, #2d2d2d);
          color: var(--designlibre-text-primary, #e4e4e4);
          font-size: var(--designlibre-sidebar-font-size-xs, 11px);
        `;
        itemInput.addEventListener('change', () => {
          items[i] = itemInput.value.trim();
          onChange(items.filter(item => item.length > 0));
        });

        const removeBtn = document.createElement('button');
        removeBtn.style.cssText = `
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--designlibre-text-secondary, #a0a0a0);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        removeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        removeBtn.addEventListener('click', () => {
          items.splice(i, 1);
          onChange(items);
          renderItems();
        });
        removeBtn.addEventListener('mouseenter', () => {
          removeBtn.style.color = '#ff453a';
        });
        removeBtn.addEventListener('mouseleave', () => {
          removeBtn.style.color = 'var(--designlibre-text-secondary, #a0a0a0)';
        });

        itemRow.appendChild(itemInput);
        itemRow.appendChild(removeBtn);
        itemsContainer.appendChild(itemRow);
      }
    };

    renderItems();
    row.appendChild(itemsContainer);

    // Add new item row
    const addRow = document.createElement('div');
    addRow.style.cssText = `display: flex; gap: 4px;`;

    const addInput = document.createElement('input');
    addInput.type = 'text';
    addInput.placeholder = placeholder;
    addInput.style.cssText = `
      flex: 1;
      padding: 6px 8px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-tertiary, #252525);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
    `;

    const addBtn = document.createElement('button');
    addBtn.style.cssText = `
      padding: 6px 10px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      cursor: pointer;
    `;
    addBtn.textContent = 'Add';
    addBtn.addEventListener('click', () => {
      const value = addInput.value.trim();
      if (value) {
        items.push(value);
        onChange(items);
        addInput.value = '';
        renderItems();
      }
    });
    addInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });

    addRow.appendChild(addInput);
    addRow.appendChild(addBtn);
    row.appendChild(addRow);

    return row;
  }

  /**
   * Update LLM context in semantic metadata
   */
  private updateLLMContext(
    nodeId: NodeId,
    pluginData: Record<string, unknown>,
    currentMetadata: SemanticMetadata | null,
    key: keyof LLMContextHints,
    value: string | string[]
  ): void {
    const baseMeta = currentMetadata ?? createSemanticMetadata('Custom');
    const currentLLM = baseMeta.llmContext ?? {};

    // Handle empty values - remove the key
    const isEmpty = typeof value === 'string' ? value.length === 0 : value.length === 0;

    let newLLM: LLMContextHints;
    if (isEmpty) {
      const { [key]: _, ...rest } = currentLLM;
      newLLM = rest;
    } else {
      newLLM = { ...currentLLM, [key]: value };
    }

    // Remove llmContext entirely if empty
    const hasLLMContext = Object.keys(newLLM).length > 0;

    const newMetadata: SemanticMetadata = {
      ...baseMeta,
    };

    if (hasLLMContext) {
      newMetadata.llmContext = newLLM;
    } else {
      delete newMetadata.llmContext;
    }

    const newPluginData = setSemanticMetadata(pluginData, newMetadata);
    this.updateNode(nodeId, { pluginData: newPluginData });
  }

  // =========================================================================
  // Data Bindings Section (Inspect Tab)
  // =========================================================================

  /**
   * Render data bindings section for connecting properties to data sources
   */
  private renderDataBindingsSection(node: NodeData): void {
    if (!this.contentElement) return;

    const section = this.createSection('Data Bindings');
    const nodeId = node.id;

    // Get existing semantic metadata
    const pluginData = (node as { pluginData?: Record<string, unknown> }).pluginData ?? {};
    const semantic = getSemanticMetadata(pluginData);
    const dataBindings = semantic?.dataBindings ?? [];

    // Description
    const description = document.createElement('div');
    description.style.cssText = `
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
      margin-bottom: 12px;
      line-height: 1.4;
    `;
    description.textContent = 'Connect properties to data sources for dynamic content.';
    section.appendChild(description);

    // Existing bindings
    const bindingsContainer = document.createElement('div');
    bindingsContainer.style.cssText = `margin-bottom: 12px;`;

    if (dataBindings.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.cssText = `
        padding: 16px;
        text-align: center;
        color: var(--designlibre-text-tertiary, #666);
        font-size: var(--designlibre-sidebar-font-size-xs, 11px);
        background: var(--designlibre-bg-secondary, #2d2d2d);
        border-radius: 6px;
      `;
      emptyState.textContent = 'No data bindings configured';
      bindingsContainer.appendChild(emptyState);
    } else {
      for (let i = 0; i < dataBindings.length; i++) {
        const binding = dataBindings[i];
        if (!binding) continue;
        const bindingRow = this.renderDataBindingRow(binding, i, () => {
          this.removeDataBinding(nodeId, pluginData, semantic, i);
        });
        bindingsContainer.appendChild(bindingRow);
      }
    }
    section.appendChild(bindingsContainer);

    // Add binding button
    const addBtn = document.createElement('button');
    addBtn.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px dashed var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: transparent;
      color: var(--designlibre-text-secondary, #a0a0a0);
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      cursor: pointer;
      transition: all 0.15s;
    `;
    addBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Add Data Binding
    `;
    addBtn.addEventListener('click', () => {
      this.showAddDataBindingUI(node, pluginData, semantic);
    });
    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.borderColor = 'var(--designlibre-accent, #4dabff)';
      addBtn.style.color = 'var(--designlibre-accent, #4dabff)';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      addBtn.style.color = 'var(--designlibre-text-secondary, #a0a0a0)';
    });
    section.appendChild(addBtn);

    this.contentElement.appendChild(section);
  }

  /**
   * Render a single data binding row
   */
  private renderDataBindingRow(
    binding: DataBinding,
    _index: number,
    onRemove: () => void
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
      margin-bottom: 6px;
    `;

    // Property badge
    const propertyBadge = document.createElement('span');
    propertyBadge.style.cssText = `
      padding: 2px 8px;
      background: var(--designlibre-accent, #4dabff)20;
      color: var(--designlibre-accent, #4dabff);
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
    `;
    propertyBadge.textContent = binding.propertyPath.join('.');
    row.appendChild(propertyBadge);

    // Arrow
    const arrow = document.createElement('span');
    arrow.style.cssText = `color: var(--designlibre-text-tertiary, #666); font-size: 12px;`;
    arrow.textContent = '←';
    row.appendChild(arrow);

    // Data path
    const dataPath = document.createElement('span');
    dataPath.style.cssText = `
      flex: 1;
      font-family: 'SF Mono', monospace;
      font-size: 10px;
      color: var(--designlibre-text-primary, #e4e4e4);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    dataPath.textContent = binding.dataPath;
    dataPath.title = `${binding.dataSourceId}:${binding.dataPath}`;
    row.appendChild(dataPath);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.style.cssText = `
      width: 20px;
      height: 20px;
      padding: 0;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--designlibre-text-tertiary, #666);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    removeBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    removeBtn.addEventListener('click', onRemove);
    removeBtn.addEventListener('mouseenter', () => {
      removeBtn.style.color = '#ff453a';
    });
    removeBtn.addEventListener('mouseleave', () => {
      removeBtn.style.color = 'var(--designlibre-text-tertiary, #666)';
    });
    row.appendChild(removeBtn);

    return row;
  }

  /**
   * Show UI to add a new data binding
   */
  private showAddDataBindingUI(
    node: NodeData,
    pluginData: Record<string, unknown>,
    semantic: SemanticMetadata | null
  ): void {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      width: 360px;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      padding: 20px;
    `;

    // Title
    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    title.textContent = 'Add Data Binding';
    modal.appendChild(title);

    // Property path field
    const propertyLabel = document.createElement('label');
    propertyLabel.style.cssText = `
      display: block;
      font-size: 11px;
      color: var(--designlibre-text-secondary, #a0a0a0);
      margin-bottom: 4px;
    `;
    propertyLabel.textContent = 'Property Path';
    modal.appendChild(propertyLabel);

    const propertyInput = document.createElement('input');
    propertyInput.type = 'text';
    propertyInput.placeholder = 'e.g., characters, fills.0.color';
    propertyInput.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      margin-bottom: 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 12px;
    `;
    modal.appendChild(propertyInput);

    // Data source ID field
    const sourceLabel = document.createElement('label');
    sourceLabel.style.cssText = propertyLabel.style.cssText;
    sourceLabel.textContent = 'Data Source ID';
    modal.appendChild(sourceLabel);

    const sourceInput = document.createElement('input');
    sourceInput.type = 'text';
    sourceInput.placeholder = 'e.g., userApi, localData';
    sourceInput.style.cssText = propertyInput.style.cssText;
    modal.appendChild(sourceInput);

    // Data path field
    const dataPathLabel = document.createElement('label');
    dataPathLabel.style.cssText = propertyLabel.style.cssText;
    dataPathLabel.textContent = 'Data Path';
    modal.appendChild(dataPathLabel);

    const dataPathInput = document.createElement('input');
    dataPathInput.type = 'text';
    dataPathInput.placeholder = 'e.g., user.name, items[0].title';
    dataPathInput.style.cssText = propertyInput.style.cssText;
    modal.appendChild(dataPathInput);

    // Fallback value field
    const fallbackLabel = document.createElement('label');
    fallbackLabel.style.cssText = propertyLabel.style.cssText;
    fallbackLabel.textContent = 'Fallback Value';
    modal.appendChild(fallbackLabel);

    const fallbackInput = document.createElement('input');
    fallbackInput.type = 'text';
    fallbackInput.placeholder = 'Value when data is unavailable';
    fallbackInput.style.cssText = propertyInput.style.cssText;
    modal.appendChild(fallbackInput);

    // Buttons
    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `display: flex; gap: 8px; margin-top: 8px;`;

    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = `
      flex: 1;
      padding: 10px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: transparent;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 12px;
      cursor: pointer;
    `;
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const addBtn = document.createElement('button');
    addBtn.style.cssText = `
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 6px;
      background: var(--designlibre-accent, #4dabff);
      color: white;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    `;
    addBtn.textContent = 'Add Binding';
    addBtn.addEventListener('click', () => {
      const propertyPath = propertyInput.value.trim().split('.');
      const dataSourceId = sourceInput.value.trim();
      const dataPath = dataPathInput.value.trim();
      const fallbackValue = fallbackInput.value.trim();

      if (propertyPath.length === 0 || !dataSourceId || !dataPath) {
        return; // TODO: show validation error
      }

      const newBinding: DataBinding = {
        propertyPath,
        dataSourceId,
        dataPath,
        fallbackValue,
      };

      this.addDataBinding(node.id, pluginData, semantic, newBinding);
      overlay.remove();
    });

    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(addBtn);
    modal.appendChild(buttonRow);

    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
    propertyInput.focus();
  }

  /**
   * Add a data binding to semantic metadata
   */
  private addDataBinding(
    nodeId: NodeId,
    pluginData: Record<string, unknown>,
    currentMetadata: SemanticMetadata | null,
    binding: DataBinding
  ): void {
    const baseMeta = currentMetadata ?? createSemanticMetadata('Custom');
    const currentBindings = baseMeta.dataBindings ?? [];

    const newMetadata: SemanticMetadata = {
      ...baseMeta,
      dataBindings: [...currentBindings, binding],
    };

    const newPluginData = setSemanticMetadata(pluginData, newMetadata);
    this.updateNode(nodeId, { pluginData: newPluginData });
    this.updateContent();
  }

  /**
   * Remove a data binding from semantic metadata
   */
  private removeDataBinding(
    nodeId: NodeId,
    pluginData: Record<string, unknown>,
    currentMetadata: SemanticMetadata | null,
    index: number
  ): void {
    if (!currentMetadata?.dataBindings) return;

    const newBindings = [...currentMetadata.dataBindings];
    newBindings.splice(index, 1);

    // Build new metadata without undefined dataBindings
    let newMetadata: SemanticMetadata;
    if (newBindings.length > 0) {
      newMetadata = {
        ...currentMetadata,
        dataBindings: newBindings,
      };
    } else {
      // Remove dataBindings entirely
      const { dataBindings: _, ...rest } = currentMetadata;
      newMetadata = rest as SemanticMetadata;
    }

    const newPluginData = setSemanticMetadata(pluginData, newMetadata);
    this.updateNode(nodeId, { pluginData: newPluginData });
    this.updateContent();
  }

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
