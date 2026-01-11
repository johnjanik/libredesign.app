/**
 * Alignment Panel
 *
 * Floating panel for aligning and distributing selected objects.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import {
  alignHorizontal,
  alignVertical,
  distributeHorizontal,
  distributeVertical,
  type AlignTo,
  type DistributeMode,
} from '@core/operations/alignment';

/**
 * SVG icons for alignment operations
 */
const ALIGN_ICONS = {
  alignLeft: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <line x1="2" y1="2" x2="2" y2="14"/>
    <rect x="4" y="3" width="8" height="4" rx="0.5"/>
    <rect x="4" y="9" width="5" height="4" rx="0.5"/>
  </svg>`,
  alignCenterH: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <line x1="8" y1="2" x2="8" y2="14"/>
    <rect x="3" y="3" width="10" height="4" rx="0.5"/>
    <rect x="5" y="9" width="6" height="4" rx="0.5"/>
  </svg>`,
  alignRight: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <line x1="14" y1="2" x2="14" y2="14"/>
    <rect x="4" y="3" width="8" height="4" rx="0.5"/>
    <rect x="7" y="9" width="5" height="4" rx="0.5"/>
  </svg>`,
  alignTop: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <line x1="2" y1="2" x2="14" y2="2"/>
    <rect x="3" y="4" width="4" height="8" rx="0.5"/>
    <rect x="9" y="4" width="4" height="5" rx="0.5"/>
  </svg>`,
  alignCenterV: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <line x1="2" y1="8" x2="14" y2="8"/>
    <rect x="3" y="3" width="4" height="10" rx="0.5"/>
    <rect x="9" y="5" width="4" height="6" rx="0.5"/>
  </svg>`,
  alignBottom: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <line x1="2" y1="14" x2="14" y2="14"/>
    <rect x="3" y="4" width="4" height="8" rx="0.5"/>
    <rect x="9" y="7" width="4" height="5" rx="0.5"/>
  </svg>`,
  distributeH: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="2" y="4" width="3" height="8" rx="0.5"/>
    <rect x="6.5" y="4" width="3" height="8" rx="0.5"/>
    <rect x="11" y="4" width="3" height="8" rx="0.5"/>
  </svg>`,
  distributeV: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="4" y="2" width="8" height="3" rx="0.5"/>
    <rect x="4" y="6.5" width="8" height="3" rx="0.5"/>
    <rect x="4" y="11" width="8" height="3" rx="0.5"/>
  </svg>`,
  spacingH: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="2" y="5" width="4" height="6" rx="0.5"/>
    <rect x="10" y="5" width="4" height="6" rx="0.5"/>
    <line x1="6.5" y1="8" x2="9.5" y2="8" stroke-dasharray="1.5 1"/>
    <path d="M7 6.5L6.5 8L7 9.5" fill="none"/>
    <path d="M9 6.5L9.5 8L9 9.5" fill="none"/>
  </svg>`,
  spacingV: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="5" y="2" width="6" height="4" rx="0.5"/>
    <rect x="5" y="10" width="6" height="4" rx="0.5"/>
    <line x1="8" y1="6.5" x2="8" y2="9.5" stroke-dasharray="1.5 1"/>
    <path d="M6.5 7L8 6.5L9.5 7" fill="none"/>
    <path d="M6.5 9L8 9.5L9.5 9" fill="none"/>
  </svg>`,
};

/**
 * Alignment panel options
 */
export interface AlignmentPanelOptions {
  onClose?: () => void;
}

/**
 * Alignment Panel class
 */
export class AlignmentPanel {
  private runtime: DesignLibreRuntime;
  private element: HTMLElement | null = null;
  private options: AlignmentPanelOptions;
  private alignTo: AlignTo = 'selection';
  private distributeMode: DistributeMode = 'spacing';
  private selectedNodeIds: NodeId[] = [];
  private unsubscribers: Array<() => void> = [];

  constructor(runtime: DesignLibreRuntime, options: AlignmentPanelOptions = {}) {
    this.runtime = runtime;
    this.options = options;
  }

  /**
   * Show the panel at the specified position
   */
  show(x: number, y: number): void {
    this.hide(); // Remove any existing panel

    this.element = this.createPanel();
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;

    document.body.appendChild(this.element);

    // Subscribe to selection changes
    const unsub = this.runtime.on('selection:changed', ({ nodeIds }) => {
      this.selectedNodeIds = nodeIds;
      this.updateButtonStates();
    });
    this.unsubscribers.push(unsub);

    // Get initial selection
    this.selectedNodeIds = this.runtime.getSelection();
    this.updateButtonStates();

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('mousedown', this.handleOutsideClick);
    }, 0);
  }

  /**
   * Hide and destroy the panel
   */
  hide(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    document.removeEventListener('mousedown', this.handleOutsideClick);

    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    this.options.onClose?.();
  }

  /**
   * Check if panel is currently visible
   */
  isVisible(): boolean {
    return this.element !== null;
  }

  private handleOutsideClick = (e: MouseEvent) => {
    if (this.element && !this.element.contains(e.target as Node)) {
      this.hide();
    }
  };

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'designlibre-alignment-panel';
    panel.style.cssText = `
      position: fixed;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      padding: 12px;
      box-shadow: var(--designlibre-shadow, 0 4px 12px rgba(0, 0, 0, 0.4));
      z-index: 1000;
      min-width: 200px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      font-weight: 600;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;
    header.textContent = 'Align & Distribute';
    panel.appendChild(header);

    // Align To selector
    panel.appendChild(this.createAlignToSelector());

    // Alignment section
    panel.appendChild(this.createSection('Align', this.createAlignmentButtons()));

    // Distribution section
    panel.appendChild(this.createSection('Distribute', this.createDistributionButtons()));

    // Spacing section
    panel.appendChild(this.createSection('Spacing', this.createSpacingSection()));

    return panel;
  }

  private createSection(title: string, content: HTMLElement): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 12px;';

    const label = document.createElement('div');
    label.style.cssText = `
      font-size: 10px;
      text-transform: uppercase;
      color: var(--designlibre-text-secondary, #888);
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    `;
    label.textContent = title;
    section.appendChild(label);

    section.appendChild(content);
    return section;
  }

  private createAlignToSelector(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 12px;';

    const label = document.createElement('div');
    label.style.cssText = `
      font-size: 10px;
      text-transform: uppercase;
      color: var(--designlibre-text-secondary, #888);
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    `;
    label.textContent = 'Align To';
    container.appendChild(label);

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 12px;
      cursor: pointer;
    `;

    const options: Array<{ value: AlignTo; label: string }> = [
      { value: 'selection', label: 'Selection Bounds' },
      { value: 'first', label: 'First Selected' },
      { value: 'last', label: 'Last Selected' },
      { value: 'canvas', label: 'Canvas' },
    ];

    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.selected = opt.value === this.alignTo;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      this.alignTo = select.value as AlignTo;
    });

    container.appendChild(select);
    return container;
  }

  private createAlignmentButtons(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
    `;

    const buttons = [
      { icon: ALIGN_ICONS.alignLeft, title: 'Align Left', action: () => this.alignLeft() },
      { icon: ALIGN_ICONS.alignCenterH, title: 'Align Center', action: () => this.alignCenterH() },
      { icon: ALIGN_ICONS.alignRight, title: 'Align Right', action: () => this.alignRight() },
      { icon: ALIGN_ICONS.alignTop, title: 'Align Top', action: () => this.alignTop() },
      { icon: ALIGN_ICONS.alignCenterV, title: 'Align Middle', action: () => this.alignCenterV() },
      { icon: ALIGN_ICONS.alignBottom, title: 'Align Bottom', action: () => this.alignBottom() },
    ];

    for (const btn of buttons) {
      const button = this.createButton(btn.icon, btn.title, btn.action, 'align');
      container.appendChild(button);
    }

    return container;
  }

  private createDistributionButtons(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
    `;

    const buttons = [
      { icon: ALIGN_ICONS.distributeH, title: 'Distribute Horizontally', action: () => this.distributeH() },
      { icon: ALIGN_ICONS.distributeV, title: 'Distribute Vertically', action: () => this.distributeV() },
    ];

    for (const btn of buttons) {
      const button = this.createButton(btn.icon, btn.title, btn.action, 'distribute');
      container.appendChild(button);
    }

    return container;
  }

  private createSpacingSection(): HTMLElement {
    const container = document.createElement('div');

    // Distribute mode selector
    const modeContainer = document.createElement('div');
    modeContainer.style.cssText = 'margin-bottom: 8px;';

    const modeSelect = document.createElement('select');
    modeSelect.style.cssText = `
      width: 100%;
      padding: 4px 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 11px;
      cursor: pointer;
    `;

    const modeOptions: Array<{ value: DistributeMode; label: string }> = [
      { value: 'spacing', label: 'Equal Spacing' },
      { value: 'centers', label: 'Equal Centers' },
    ];

    for (const opt of modeOptions) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.selected = opt.value === this.distributeMode;
      modeSelect.appendChild(option);
    }

    modeSelect.addEventListener('change', () => {
      this.distributeMode = modeSelect.value as DistributeMode;
    });

    modeContainer.appendChild(modeSelect);
    container.appendChild(modeContainer);

    // Quick spacing buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
    `;

    const buttons = [
      { icon: ALIGN_ICONS.spacingH, title: 'Tidy Up Horizontal', action: () => this.tidyUpH() },
      { icon: ALIGN_ICONS.spacingV, title: 'Tidy Up Vertical', action: () => this.tidyUpV() },
    ];

    for (const btn of buttons) {
      const button = this.createButton(btn.icon, btn.title, btn.action, 'distribute');
      buttonsContainer.appendChild(button);
    }

    container.appendChild(buttonsContainer);

    return container;
  }

  private createButton(
    icon: string,
    title: string,
    action: () => void,
    type: 'align' | 'distribute'
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = `alignment-btn alignment-btn-${type}`;
    button.innerHTML = icon;
    button.title = title;
    button.style.cssText = `
      width: 100%;
      height: 32px;
      border: none;
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-primary, #e4e4e4);
      transition: background-color 0.15s, opacity 0.15s;
    `;

    button.addEventListener('mouseenter', () => {
      if (!button.disabled) {
        button.style.backgroundColor = 'var(--designlibre-bg-hover, #3d3d3d)';
      }
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });

    button.addEventListener('click', () => {
      if (!button.disabled) {
        action();
      }
    });

    return button;
  }

  private updateButtonStates(): void {
    if (!this.element) return;

    const alignButtons = this.element.querySelectorAll('.alignment-btn-align');
    const distributeButtons = this.element.querySelectorAll('.alignment-btn-distribute');

    const hasSelection = this.selectedNodeIds.length >= 1;
    const hasMultiple = this.selectedNodeIds.length >= 2;
    const hasThreeOrMore = this.selectedNodeIds.length >= 3;

    // Align requires at least 1 selection (or 2 if not aligning to canvas)
    const canAlign = this.alignTo === 'canvas' ? hasSelection : hasMultiple;

    alignButtons.forEach((btn) => {
      const button = btn as HTMLButtonElement;
      button.disabled = !canAlign;
      button.style.opacity = canAlign ? '1' : '0.4';
      button.style.cursor = canAlign ? 'pointer' : 'not-allowed';
    });

    // Distribute requires at least 3 selections
    distributeButtons.forEach((btn) => {
      const button = btn as HTMLButtonElement;
      button.disabled = !hasThreeOrMore;
      button.style.opacity = hasThreeOrMore ? '1' : '0.4';
      button.style.cursor = hasThreeOrMore ? 'pointer' : 'not-allowed';
    });
  }

  // Helper to capture old positions before alignment
  private capturePositions(): Map<NodeId, { x: number; y: number }> {
    const sceneGraph = this.runtime.getSceneGraph();
    const positions = new Map<NodeId, { x: number; y: number }>();
    for (const nodeId of this.selectedNodeIds) {
      const node = sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node) {
        positions.set(nodeId, { x: (node as { x: number }).x, y: (node as { y: number }).y });
      }
    }
    return positions;
  }

  // Helper to record position changes for undo
  private recordPositionChanges(oldPositions: Map<NodeId, { x: number; y: number }>, description: string): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const undoManager = this.runtime.getUndoManager();

    undoManager.beginGroup(description);
    for (const [nodeId, oldPos] of oldPositions) {
      const node = sceneGraph.getNode(nodeId);
      if (node && 'x' in node && 'y' in node) {
        const newX = (node as { x: number }).x;
        const newY = (node as { y: number }).y;
        if (oldPos.x !== newX) {
          undoManager.push({
            id: `align_${nodeId}_x_${Date.now()}` as import('@core/types/common').OperationId,
            type: 'SET_PROPERTY',
            timestamp: Date.now(),
            clientId: 'local',
            nodeId,
            path: ['x'],
            oldValue: oldPos.x,
            newValue: newX,
          } as import('@operations/operation').SetPropertyOperation);
        }
        if (oldPos.y !== newY) {
          undoManager.push({
            id: `align_${nodeId}_y_${Date.now()}` as import('@core/types/common').OperationId,
            type: 'SET_PROPERTY',
            timestamp: Date.now(),
            clientId: 'local',
            nodeId,
            path: ['y'],
            oldValue: oldPos.y,
            newValue: newY,
          } as import('@operations/operation').SetPropertyOperation);
        }
      }
    }
    undoManager.endGroup();
  }

  // Alignment actions
  private alignLeft(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const oldPositions = this.capturePositions();
    alignHorizontal(sceneGraph, this.selectedNodeIds, 'left', this.alignTo);
    this.recordPositionChanges(oldPositions, 'Align Left');
  }

  private alignCenterH(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const oldPositions = this.capturePositions();
    alignHorizontal(sceneGraph, this.selectedNodeIds, 'center', this.alignTo);
    this.recordPositionChanges(oldPositions, 'Align Center');
  }

  private alignRight(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const oldPositions = this.capturePositions();
    alignHorizontal(sceneGraph, this.selectedNodeIds, 'right', this.alignTo);
    this.recordPositionChanges(oldPositions, 'Align Right');
  }

  private alignTop(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const oldPositions = this.capturePositions();
    alignVertical(sceneGraph, this.selectedNodeIds, 'top', this.alignTo);
    this.recordPositionChanges(oldPositions, 'Align Top');
  }

  private alignCenterV(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const oldPositions = this.capturePositions();
    alignVertical(sceneGraph, this.selectedNodeIds, 'middle', this.alignTo);
    this.recordPositionChanges(oldPositions, 'Align Middle');
  }

  private alignBottom(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const oldPositions = this.capturePositions();
    alignVertical(sceneGraph, this.selectedNodeIds, 'bottom', this.alignTo);
    this.recordPositionChanges(oldPositions, 'Align Bottom');
  }

  // Distribution actions
  private distributeH(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const oldPositions = this.capturePositions();
    distributeHorizontal(sceneGraph, this.selectedNodeIds, this.distributeMode);
    this.recordPositionChanges(oldPositions, 'Distribute Horizontal');
  }

  private distributeV(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const oldPositions = this.capturePositions();
    distributeVertical(sceneGraph, this.selectedNodeIds, this.distributeMode);
    this.recordPositionChanges(oldPositions, 'Distribute Vertical');
  }

  // Tidy up actions (distribute with smart spacing)
  private tidyUpH(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const oldPositions = this.capturePositions();
    distributeHorizontal(sceneGraph, this.selectedNodeIds, 'spacing');
    this.recordPositionChanges(oldPositions, 'Tidy Up Horizontal');
  }

  private tidyUpV(): void {
    const sceneGraph = this.runtime.getSceneGraph();
    const oldPositions = this.capturePositions();
    distributeVertical(sceneGraph, this.selectedNodeIds, 'spacing');
    this.recordPositionChanges(oldPositions, 'Tidy Up Vertical');
  }
}

/**
 * Create an alignment panel instance
 */
export function createAlignmentPanel(
  runtime: DesignLibreRuntime,
  options: AlignmentPanelOptions = {}
): AlignmentPanel {
  return new AlignmentPanel(runtime, options);
}
