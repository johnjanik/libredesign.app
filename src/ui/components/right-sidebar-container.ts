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
    this.element.className = 'designlibre-right-sidebar-container flex flex-row h-full flex-shrink-0 relative';

    // Create inspector panel wrapper
    const inspectorWrapper = document.createElement('div');
    inspectorWrapper.className = 'designlibre-inspector-wrapper flex flex-row h-full relative';

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
      aiPanelWrapper.className = `designlibre-ai-panel-wrapper ${this.aiPanelVisible ? 'flex' : 'hidden'} flex-col h-full border-l border-border relative`;
      aiPanelWrapper.style.width = `${this.options.aiPanelWidth}px`;

      // Create AI panel content area
      const aiPanelContent = document.createElement('div');
      aiPanelContent.className = 'designlibre-ai-panel-content flex-1 flex flex-col overflow-hidden';

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
    button.className = `designlibre-ai-toggle-btn absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 border-none bg-accent text-white cursor-pointer ${this.aiPanelVisible ? 'hidden' : 'flex'} items-center justify-center rounded-l-lg shadow-lg z-101 transition-colors hover:bg-purple-700`;
    button.title = 'Open AI Assistant';
    button.innerHTML = ICONS.ai;

    button.addEventListener('click', () => this.showAIPanel());

    return button;
  }

  private updateAIToggleButtonVisibility(): void {
    if (this.aiToggleButton) {
      if (this.aiPanelVisible) {
        this.aiToggleButton.classList.add('hidden');
        this.aiToggleButton.classList.remove('flex');
      } else {
        this.aiToggleButton.classList.remove('hidden');
        this.aiToggleButton.classList.add('flex');
      }
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
      aiPanelWrapper.classList.remove('hidden');
      aiPanelWrapper.classList.add('flex');
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
      aiPanelWrapper.classList.add('hidden');
      aiPanelWrapper.classList.remove('flex');
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
