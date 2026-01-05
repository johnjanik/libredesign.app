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
        padding: 10px 8px;
        border: none;
        background: ${tabDef.id === this.activeTab ? 'var(--designlibre-bg-primary, #1e1e1e)' : 'transparent'};
        color: ${tabDef.id === this.activeTab ? 'var(--designlibre-text-primary, #e4e4e4)' : 'var(--designlibre-text-secondary, #a0a0a0)'};
        font-size: var(--designlibre-sidebar-font-size-xs, 11px);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        border-bottom: 2px solid ${tabDef.id === this.activeTab ? 'var(--designlibre-accent, #4dabff)' : 'transparent'};
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

    const empty = document.createElement('div');
    empty.style.cssText = `
      color: var(--designlibre-text-secondary, #a0a0a0);
      text-align: center;
      padding: 40px 20px;
    `;
    empty.textContent = 'Select an element to inspect';
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

    // Fill section
    if ('fills' in node) {
      this.renderFillSection(node as FrameNodeData | VectorNodeData, nodeId);
    }

    // Stroke section
    if ('strokes' in node) {
      this.renderStrokeSection(node as VectorNodeData, nodeId);
    }

    // Effects section
    if ('effects' in node) {
      this.renderEffectsSection(node as FrameNodeData, nodeId);
    }

    // Text section (only for text nodes)
    if (node.type === 'TEXT') {
      this.renderTextSection(node as TextNodeData, nodeId);
    }
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

    // Font Family
    section.appendChild(this.createLabeledDropdown('Font', fontFamily, ['Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New'], (_v) => {
      // Text style updates require updating the textStyles array
    }));

    // Font Weight
    section.appendChild(this.createLabeledDropdown('Weight', String(fontWeight), ['100', '200', '300', '400', '500', '600', '700', '800', '900'], (_v) => {
      // Text style updates require updating the textStyles array
    }));

    // Font Size
    section.appendChild(this.createLabeledNumberField('Size', fontSize, 'px', (_v) => {
      // Text style updates require updating the textStyles array
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

    const section = this.createSection('Interactions');

    // Interaction Trigger
    section.appendChild(this.createLabeledDropdown('Trigger', 'None', ['None', 'On Click', 'On Hover', 'On Drag', 'After Delay', 'Mouse Enter', 'Mouse Leave'], (_v) => {
      // TODO: Implement prototype interactions
    }));

    // Destination
    section.appendChild(this.createLabeledDropdown('Destination', 'None', ['None', '(Select Frame...)'], (_v) => {
      // TODO: Implement destination selection
    }));

    // Animation
    section.appendChild(this.createLabeledDropdown('Animation', 'Instant', ['Instant', 'Smart Animate', 'Dissolve', 'Move In', 'Move Out', 'Push', 'Slide In', 'Slide Out'], (_v) => {
      // TODO: Implement animation type
    }));

    // Easing
    section.appendChild(this.createLabeledDropdown('Easing', 'Ease In-Out', ['Linear', 'Ease In', 'Ease Out', 'Ease In-Out', 'Spring'], (_v) => {
      // TODO: Implement easing
    }));

    // Duration
    section.appendChild(this.createLabeledNumberField('Duration', 300, 'ms', (_v) => {
      // TODO: Implement duration
    }));

    this.contentElement.appendChild(section);

    // Placeholder message
    const note = document.createElement('div');
    note.style.cssText = `
      margin-top: 16px;
      padding: 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;
    note.textContent = 'Prototype interactions will be available in a future update.';
    this.contentElement.appendChild(note);
  }

  // =========================================================================
  // Inspect / Dev Mode Panel
  // =========================================================================

  private renderInspectPanel(nodes: NodeData[]): void {
    if (!this.contentElement) return;
    const node = nodes[0]!;

    this.renderNodeHeader(node);

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
    const container = document.createElement('div');
    container.style.cssText = `display: flex; align-items: center; gap: 8px; margin-bottom: 8px;`;

    const hex = rgbaToHex(color);

    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.value = hex.slice(0, 7);
    swatch.style.cssText = `
      width: 32px;
      height: 26px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      cursor: pointer;
      padding: 0;
    `;
    swatch.addEventListener('change', () => {
      const h = swatch.value;
      const r = parseInt(h.slice(1, 3), 16) / 255;
      const g = parseInt(h.slice(3, 5), 16) / 255;
      const b = parseInt(h.slice(5, 7), 16) / 255;
      onChange({ r, g, b, a: color.a });
    });
    container.appendChild(swatch);

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.value = hex;
    hexInput.style.cssText = `
      flex: 1;
      height: 26px;
      padding: 0 6px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-family: 'SF Mono', monospace;
      font-size: var(--designlibre-sidebar-font-size-xs, 11px);
    `;
    container.appendChild(hexInput);

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
