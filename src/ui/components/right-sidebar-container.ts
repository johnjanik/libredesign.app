/**
 * Right Sidebar Container
 *
 * Container component that holds the collapsible inspector panel
 * and the AI chat panel side by side.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { AIController } from '@ai/ai-controller';
import { createInspectorPanel, InspectorPanel } from './inspector-panel';
import { createAIPanel, AIPanel } from '@ai/ui/ai-panel';

/**
 * Right sidebar container options
 */
export interface RightSidebarContainerOptions {
  /** Inspector panel width */
  inspectorWidth?: number;
  /** AI panel width */
  aiPanelWidth?: number;
  /** Show AI panel by default */
  showAIPanel?: boolean;
}

/**
 * SVG Icons for the sidebar
 */
const ICONS = {
  ai: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>`,
};

/**
 * Right Sidebar Container
 */
export class RightSidebarContainer {
  private runtime: DesignLibreRuntime;
  private aiController: AIController | null;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private inspectorPanel: InspectorPanel | null = null;
  private aiPanel: AIPanel | null = null;
  private aiToggleButton: HTMLElement | null = null;
  private options: Required<RightSidebarContainerOptions>;
  private aiPanelVisible = false;

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    aiController: AIController | null = null,
    options: RightSidebarContainerOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    this.aiController = aiController;
    this.options = {
      inspectorWidth: options.inspectorWidth ?? 280,
      aiPanelWidth: options.aiPanelWidth ?? 360,
      showAIPanel: options.showAIPanel ?? false,
    };
    this.aiPanelVisible = this.options.showAIPanel;

    this.setup();
  }

  private setup(): void {
    // Create container element
    this.element = document.createElement('div');
    this.element.className = 'designlibre-right-sidebar-container';
    this.element.style.cssText = `
      display: flex;
      flex-direction: row;
      height: 100%;
      flex-shrink: 0;
      position: relative;
    `;

    // Create inspector panel wrapper
    const inspectorWrapper = document.createElement('div');
    inspectorWrapper.className = 'designlibre-inspector-wrapper';
    inspectorWrapper.style.cssText = `
      display: flex;
      flex-direction: row;
      height: 100%;
      position: relative;
    `;

    // Create inspector panel
    this.inspectorPanel = createInspectorPanel(this.runtime, inspectorWrapper, {
      position: 'right',
      width: this.options.inspectorWidth,
    });

    this.element.appendChild(inspectorWrapper);

    // Create AI toggle button (when AI panel is hidden)
    this.aiToggleButton = this.createAIToggleButton();
    this.element.appendChild(this.aiToggleButton);

    // Create AI panel if controller is available
    if (this.aiController) {
      const aiPanelWrapper = document.createElement('div');
      aiPanelWrapper.className = 'designlibre-ai-panel-wrapper';
      aiPanelWrapper.style.cssText = `
        display: ${this.aiPanelVisible ? 'flex' : 'none'};
        flex-direction: column;
        height: 100%;
        width: ${this.options.aiPanelWidth}px;
        border-left: 1px solid var(--designlibre-border, #3d3d3d);
        position: relative;
      `;

      // Create AI panel content area
      const aiPanelContent = document.createElement('div');
      aiPanelContent.className = 'designlibre-ai-panel-content';
      aiPanelContent.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `;

      this.aiPanel = createAIPanel(this.aiController, aiPanelContent, {
        position: 'right',
        width: this.options.aiPanelWidth,
        collapsed: false,
        onClose: () => this.hideAIPanel(),
      });

      aiPanelWrapper.appendChild(aiPanelContent);
      this.element.appendChild(aiPanelWrapper);

      // Update toggle button visibility
      this.updateAIToggleButtonVisibility();
    }

    // Add to container
    this.container.appendChild(this.element);
  }

  private createAIToggleButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'designlibre-ai-toggle-btn';
    button.title = 'Open AI Assistant';
    button.innerHTML = ICONS.ai;
    button.style.cssText = `
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      border: none;
      background: var(--designlibre-accent, #a855f7);
      color: white;
      cursor: pointer;
      display: ${this.aiPanelVisible ? 'none' : 'flex'};
      align-items: center;
      justify-content: center;
      border-radius: 8px 0 0 8px;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);
      z-index: 101;
      transition: background-color 0.15s;
    `;

    button.addEventListener('click', () => this.showAIPanel());
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#9333ea';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'var(--designlibre-accent, #a855f7)';
    });

    return button;
  }

  private updateAIToggleButtonVisibility(): void {
    if (this.aiToggleButton) {
      this.aiToggleButton.style.display = this.aiPanelVisible ? 'none' : 'flex';
    }
  }

  /**
   * Show the AI panel
   */
  showAIPanel(): void {
    if (!this.aiController) return;

    this.aiPanelVisible = true;
    const aiPanelWrapper = this.element?.querySelector('.designlibre-ai-panel-wrapper') as HTMLElement;
    if (aiPanelWrapper) {
      aiPanelWrapper.style.display = 'flex';
    }
    this.updateAIToggleButtonVisibility();
  }

  /**
   * Hide the AI panel
   */
  hideAIPanel(): void {
    this.aiPanelVisible = false;
    const aiPanelWrapper = this.element?.querySelector('.designlibre-ai-panel-wrapper') as HTMLElement;
    if (aiPanelWrapper) {
      aiPanelWrapper.style.display = 'none';
    }
    this.updateAIToggleButtonVisibility();
  }

  /**
   * Toggle AI panel visibility
   */
  toggleAIPanel(): void {
    if (this.aiPanelVisible) {
      this.hideAIPanel();
    } else {
      this.showAIPanel();
    }
  }

  /**
   * Check if AI panel is visible
   */
  isAIPanelVisible(): boolean {
    return this.aiPanelVisible;
  }

  /**
   * Get the inspector panel
   */
  getInspectorPanel(): InspectorPanel | null {
    return this.inspectorPanel;
  }

  /**
   * Get the AI panel
   */
  getAIPanel(): AIPanel | null {
    return this.aiPanel;
  }

  /**
   * Dispose of the container and all child components
   */
  dispose(): void {
    this.aiPanel?.dispose();
    this.inspectorPanel?.dispose();

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

/**
 * Create a right sidebar container
 */
export function createRightSidebarContainer(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  aiController?: AIController | null,
  options?: RightSidebarContainerOptions
): RightSidebarContainer {
  return new RightSidebarContainer(runtime, container, aiController ?? null, options);
}
