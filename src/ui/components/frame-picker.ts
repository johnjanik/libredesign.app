/**
 * Frame Picker
 *
 * A dropdown component for selecting destination frames in prototype interactions.
 * Shows a searchable list of frames in the document.
 */

import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';

/**
 * Frame picker options
 */
export interface FramePickerOptions {
  /** Scene graph for frame lookup */
  sceneGraph: SceneGraph;
  /** Currently selected frame ID */
  selectedFrameId?: NodeId | null;
  /** Callback when frame is selected */
  onSelect: (frameId: NodeId) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Exclude these frame IDs from the list */
  excludeIds?: NodeId[];
}

/**
 * Frame info for display
 */
interface FrameInfo {
  id: NodeId;
  name: string;
  parentName: string | undefined;
}

/**
 * Frame Picker component
 */
export class FramePicker {
  private options: FramePickerOptions;
  private element: HTMLElement | null = null;
  private dropdown: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private isOpen = false;
  private frames: FrameInfo[] = [];
  private filteredFrames: FrameInfo[] = [];
  private selectedIndex = -1;
  private clickOutsideHandler: ((e: MouseEvent) => void) | null = null;

  constructor(options: FramePickerOptions) {
    this.options = options;
    this.loadFrames();
  }

  /**
   * Load frames from the scene graph
   */
  private loadFrames(): void {
    const sceneGraph = this.options.sceneGraph;
    const excludeSet = new Set(this.options.excludeIds ?? []);

    this.frames = [];

    // Get all frame nodes
    const allNodeIds = sceneGraph.getAllNodeIds();
    for (const nodeId of allNodeIds) {
      const node = sceneGraph.getNode(nodeId);
      if (!node) continue;

      if (node.type === 'FRAME' && !excludeSet.has(node.id)) {
        // Get parent name for context
        let parentName: string | undefined;
        if (node.parentId) {
          const parent = sceneGraph.getNode(node.parentId);
          if (parent && parent.type === 'FRAME') {
            parentName = parent.name;
          }
        }

        this.frames.push({
          id: node.id,
          name: node.name,
          parentName,
        });
      }
    }

    // Sort by name
    this.frames.sort((a, b) => a.name.localeCompare(b.name));
    this.filteredFrames = [...this.frames];
  }

  /**
   * Create the picker element
   */
  createElement(): HTMLElement {
    this.element = document.createElement('div');
    this.element.className = 'designlibre-frame-picker';
    this.element.style.cssText = `
      position: relative;
      width: 100%;
    `;

    // Create trigger button
    const trigger = document.createElement('button');
    trigger.className = 'designlibre-frame-picker-trigger';
    trigger.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: var(--designlibre-input-bg, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      color: var(--designlibre-text, #ffffff);
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    `;

    // Update trigger text
    this.updateTriggerText(trigger);

    // Dropdown arrow
    const arrow = document.createElement('span');
    arrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>`;
    arrow.style.cssText = `opacity: 0.6; flex-shrink: 0;`;
    trigger.appendChild(arrow);

    trigger.addEventListener('click', () => this.toggle());

    this.element.appendChild(trigger);

    return this.element;
  }

  /**
   * Update the trigger button text
   */
  private updateTriggerText(trigger?: HTMLElement): void {
    const btn = trigger ?? this.element?.querySelector('.designlibre-frame-picker-trigger');
    if (!btn) return;

    const textSpan = btn.querySelector('.picker-text') ?? document.createElement('span');
    textSpan.className = 'picker-text';
    (textSpan as HTMLElement).style.cssText = `
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    `;

    if (this.options.selectedFrameId) {
      const frame = this.frames.find(f => f.id === this.options.selectedFrameId);
      if (frame) {
        textSpan.textContent = frame.parentName
          ? `${frame.parentName} / ${frame.name}`
          : frame.name;
        (textSpan as HTMLElement).style.color = 'var(--designlibre-text, #ffffff)';
      } else {
        textSpan.textContent = this.options.placeholder ?? 'Select frame...';
        (textSpan as HTMLElement).style.color = 'var(--designlibre-text-muted, #888888)';
      }
    } else {
      textSpan.textContent = this.options.placeholder ?? 'Select frame...';
      (textSpan as HTMLElement).style.color = 'var(--designlibre-text-muted, #888888)';
    }

    if (!btn.contains(textSpan)) {
      btn.insertBefore(textSpan, btn.firstChild);
    }
  }

  /**
   * Toggle dropdown
   */
  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open dropdown
   */
  private open(): void {
    if (this.isOpen || !this.element) return;

    this.isOpen = true;
    this.selectedIndex = -1;
    this.filteredFrames = [...this.frames];

    // Create dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'designlibre-frame-picker-dropdown';
    this.dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: var(--designlibre-panel-bg, #252525);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      max-height: 300px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    // Search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search frames...';
    this.searchInput.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      color: var(--designlibre-text, #ffffff);
      font-size: 13px;
      outline: none;
    `;

    this.searchInput.addEventListener('input', () => this.filterFrames());
    this.searchInput.addEventListener('keydown', (e) => this.handleKeyDown(e));

    this.dropdown.appendChild(this.searchInput);

    // Frame list
    const list = document.createElement('div');
    list.className = 'designlibre-frame-picker-list';
    list.style.cssText = `
      overflow-y: auto;
      flex: 1;
    `;

    this.renderFrameList(list);
    this.dropdown.appendChild(list);

    this.element.appendChild(this.dropdown);

    // Focus search
    setTimeout(() => this.searchInput?.focus(), 0);

    // Click outside handler
    this.clickOutsideHandler = (e: MouseEvent) => {
      if (!this.element?.contains(e.target as Node)) {
        this.close();
      }
    };
    document.addEventListener('click', this.clickOutsideHandler);
  }

  /**
   * Close dropdown
   */
  private close(): void {
    if (!this.isOpen) return;

    this.isOpen = false;

    if (this.dropdown) {
      this.dropdown.remove();
      this.dropdown = null;
    }

    if (this.clickOutsideHandler) {
      document.removeEventListener('click', this.clickOutsideHandler);
      this.clickOutsideHandler = null;
    }
  }

  /**
   * Filter frames by search query
   */
  private filterFrames(): void {
    const query = this.searchInput?.value.toLowerCase().trim() ?? '';

    if (!query) {
      this.filteredFrames = [...this.frames];
    } else {
      this.filteredFrames = this.frames.filter(f =>
        f.name.toLowerCase().includes(query) ||
        (f.parentName?.toLowerCase().includes(query) ?? false)
      );
    }

    this.selectedIndex = -1;
    const list = this.dropdown?.querySelector('.designlibre-frame-picker-list');
    if (list) {
      this.renderFrameList(list as HTMLElement);
    }
  }

  /**
   * Render the frame list
   */
  private renderFrameList(container: HTMLElement): void {
    container.innerHTML = '';

    if (this.filteredFrames.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `
        padding: 20px;
        text-align: center;
        color: var(--designlibre-text-muted, #888888);
        font-size: 13px;
      `;
      empty.textContent = 'No frames found';
      container.appendChild(empty);
      return;
    }

    for (let i = 0; i < this.filteredFrames.length; i++) {
      const frame = this.filteredFrames[i];
      if (!frame) continue;

      const item = document.createElement('button');
      item.className = 'designlibre-frame-picker-item';
      item.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
        padding: 8px 12px;
        background: ${i === this.selectedIndex ? 'var(--designlibre-selection, #3b82f6)' : 'transparent'};
        border: none;
        color: var(--designlibre-text, #ffffff);
        cursor: pointer;
        text-align: left;
      `;

      const name = document.createElement('span');
      name.textContent = frame.name;
      name.style.cssText = `font-size: 13px;`;
      item.appendChild(name);

      if (frame.parentName) {
        const parent = document.createElement('span');
        parent.textContent = `in ${frame.parentName}`;
        parent.style.cssText = `
          font-size: 11px;
          color: var(--designlibre-text-muted, #888888);
          margin-top: 2px;
        `;
        item.appendChild(parent);
      }

      item.addEventListener('click', () => this.selectFrame(frame.id));
      item.addEventListener('mouseenter', () => {
        this.selectedIndex = i;
        this.updateSelection();
      });

      container.appendChild(item);
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(
          this.selectedIndex + 1,
          this.filteredFrames.length - 1
        );
        this.updateSelection();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
        break;

      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredFrames.length) {
          const selectedFrame = this.filteredFrames[this.selectedIndex];
          if (selectedFrame) {
            this.selectFrame(selectedFrame.id);
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }

  /**
   * Update selection highlighting
   */
  private updateSelection(): void {
    const items = this.dropdown?.querySelectorAll('.designlibre-frame-picker-item');
    if (!items) return;

    items.forEach((item, i) => {
      (item as HTMLElement).style.background = i === this.selectedIndex
        ? 'var(--designlibre-selection, #3b82f6)'
        : 'transparent';
    });

    // Scroll into view
    if (this.selectedIndex >= 0) {
      items[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * Select a frame
   */
  private selectFrame(frameId: NodeId): void {
    this.options.selectedFrameId = frameId;
    this.options.onSelect(frameId);
    this.updateTriggerText();
    this.close();
  }

  /**
   * Refresh the frame list
   */
  refresh(): void {
    this.loadFrames();
    this.updateTriggerText();
  }

  /**
   * Set selected frame
   */
  setSelected(frameId: NodeId | null): void {
    this.options.selectedFrameId = frameId;
    this.updateTriggerText();
  }

  /**
   * Dispose the picker
   */
  dispose(): void {
    this.close();
    this.element?.remove();
  }
}

/**
 * Create a frame picker
 */
export function createFramePicker(options: FramePickerOptions): FramePicker {
  return new FramePicker(options);
}
