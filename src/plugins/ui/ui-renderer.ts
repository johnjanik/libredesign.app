/**
 * UI Renderer
 *
 * Renders plugin UI components (panels, modals, toasts) in the application.
 */

import type { SerializableValue } from '../types/serialization';
import type {
  UIDescription,
  PanelOptions,
  ModalOptions,
  ToastType,
} from '../types/ui-types';
import { UIBridge } from './ui-bridge';

/**
 * Panel state
 */
interface PanelState {
  readonly id: string;
  readonly pluginId: string;
  readonly options: PanelOptions;
  readonly element: HTMLElement;
  readonly sandboxId: string;
}

/**
 * Modal state
 */
interface ModalState {
  readonly id: string;
  readonly pluginId: string;
  readonly options: ModalOptions;
  readonly element: HTMLElement;
  readonly sandboxId: string;
  resolve: (result: { action: string; data?: SerializableValue }) => void;
}

/**
 * Toast state
 */
interface ToastState {
  readonly id: string;
  readonly element: HTMLElement;
  readonly timeoutId: number;
}

/**
 * UI Renderer configuration
 */
export interface UIRendererConfig {
  /** Container for panels */
  readonly panelContainer: HTMLElement;
  /** Container for modals */
  readonly modalContainer: HTMLElement;
  /** Container for toasts */
  readonly toastContainer: HTMLElement;
}

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * UI Renderer class
 */
export class UIRenderer {
  private readonly config: UIRendererConfig;
  private readonly bridge: UIBridge;
  private readonly panels: Map<string, PanelState>;
  private readonly modals: Map<string, ModalState>;
  private readonly toasts: Map<string, ToastState>;
  private modalStack: string[];

  constructor(
    config: UIRendererConfig,
    sendToPlugin: (
      pluginId: string,
      callbackId: string,
      data: SerializableValue
    ) => void
  ) {
    this.config = config;
    this.bridge = new UIBridge(sendToPlugin);
    this.panels = new Map();
    this.modals = new Map();
    this.toasts = new Map();
    this.modalStack = [];
  }

  /**
   * Show a plugin panel
   */
  showPanel(pluginId: string, options: PanelOptions): string {
    const panelId = options.id || generateId('panel');
    const sandboxId = `panel-${panelId}`;

    // Create panel container
    const element = document.createElement('div');
    element.id = panelId;
    element.className = 'plugin-panel';
    element.dataset['pluginId'] = pluginId;
    element.dataset['position'] = options.position || 'right';

    // Apply sizing
    if (options.width) {
      element.style.width = `${options.width}px`;
    }
    if (options.height) {
      element.style.height = `${options.height}px`;
    }
    if (options.minWidth) {
      element.style.minWidth = `${options.minWidth}px`;
    }
    if (options.minHeight) {
      element.style.minHeight = `${options.minHeight}px`;
    }

    // Create header
    const header = document.createElement('div');
    header.className = 'plugin-panel-header';

    // Icon (optional)
    if (options.icon) {
      const icon = document.createElement('span');
      icon.className = 'plugin-panel-icon';
      icon.textContent = options.icon;
      header.appendChild(icon);
    }

    // Title
    const title = document.createElement('span');
    title.className = 'plugin-panel-title';
    title.textContent = options.title;
    header.appendChild(title);

    // Close button (if closeable)
    if (options.closeable !== false) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'plugin-panel-close';
      closeBtn.textContent = '×';
      closeBtn.onclick = () => this.closePanel(panelId);
      header.appendChild(closeBtn);
    }

    element.appendChild(header);

    // Create content container
    const content = document.createElement('div');
    content.className = 'plugin-panel-content';
    element.appendChild(content);

    // Add to container
    this.config.panelContainer.appendChild(element);

    // Create sandbox
    this.bridge.createSandbox(pluginId, sandboxId, content);

    // Store state
    const state: PanelState = {
      id: panelId,
      pluginId,
      options,
      element,
      sandboxId,
    };
    this.panels.set(panelId, state);

    // Render initial content if provided
    if (options.content) {
      this.bridge.render(pluginId, sandboxId, options.content);
    }

    return panelId;
  }

  /**
   * Close a panel
   */
  closePanel(panelId: string): boolean {
    const state = this.panels.get(panelId);
    if (!state) {
      return false;
    }

    // Destroy sandbox
    this.bridge.destroySandbox(state.pluginId, state.sandboxId);

    // Remove element
    state.element.remove();

    // Remove from tracking
    this.panels.delete(panelId);

    return true;
  }

  /**
   * Update panel content
   */
  updatePanel(panelId: string, content: UIDescription): boolean {
    const state = this.panels.get(panelId);
    if (!state) {
      return false;
    }

    return this.bridge.render(state.pluginId, state.sandboxId, content);
  }

  /**
   * Check if panel is open
   */
  isPanelOpen(panelId: string): boolean {
    return this.panels.has(panelId);
  }

  /**
   * Get panel info
   */
  getPanelInfo(
    panelId: string
  ): { id: string; pluginId: string; title: string; createdAt: number } | null {
    const state = this.panels.get(panelId);
    if (!state) {
      return null;
    }
    return {
      id: state.id,
      pluginId: state.pluginId,
      title: state.options.title,
      createdAt: Date.now(), // Would track actual creation time
    };
  }

  /**
   * Show a modal dialog
   */
  showModal(
    pluginId: string,
    options: ModalOptions
  ): Promise<{ action: string; data?: SerializableValue }> {
    return new Promise((resolve) => {
      const modalId = generateId('modal');
      const sandboxId = `modal-${modalId}`;

      // Create backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'plugin-modal-backdrop';
      if (options.backdrop !== 'static') {
        backdrop.onclick = (e) => {
          if (e.target === backdrop) {
            this.closeModal(modalId, 'close');
          }
        };
      }

      // Create modal container
      const modal = document.createElement('div');
      modal.className = 'plugin-modal';
      modal.dataset['pluginId'] = pluginId;

      // Apply sizing
      if (options.width) {
        modal.style.width = `${options.width}px`;
      }
      if (options.height) {
        modal.style.height = `${options.height}px`;
      }

      // Create header
      const header = document.createElement('div');
      header.className = 'plugin-modal-header';

      const title = document.createElement('span');
      title.className = 'plugin-modal-title';
      title.textContent = options.title;
      header.appendChild(title);

      if (options.closeable !== false) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'plugin-modal-close';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => this.closeModal(modalId, 'close');
        header.appendChild(closeBtn);
      }

      modal.appendChild(header);

      // Create content area
      const content = document.createElement('div');
      content.className = 'plugin-modal-content';

      // Add message if provided
      if (options.message) {
        const message = document.createElement('p');
        message.className = 'plugin-modal-message';
        message.textContent = options.message;
        content.appendChild(message);
      }

      // Content container for sandbox
      const contentContainer = document.createElement('div');
      contentContainer.className = 'plugin-modal-ui';
      content.appendChild(contentContainer);

      modal.appendChild(content);

      // Create footer with buttons
      if (options.buttons && options.buttons.length > 0) {
        const footer = document.createElement('div');
        footer.className = 'plugin-modal-footer';

        for (const btn of options.buttons) {
          const button = document.createElement('button');
          button.className = `plugin-modal-button ${btn.variant || 'secondary'}`;
          button.textContent = btn.label;
          button.disabled = btn.disabled || false;
          button.onclick = () => this.closeModal(modalId, btn.action);
          footer.appendChild(button);
        }

        modal.appendChild(footer);
      }

      backdrop.appendChild(modal);
      this.config.modalContainer.appendChild(backdrop);

      // Create sandbox for custom content
      this.bridge.createSandbox(pluginId, sandboxId, contentContainer);

      // Store state
      const state: ModalState = {
        id: modalId,
        pluginId,
        options,
        element: backdrop,
        sandboxId,
        resolve,
      };
      this.modals.set(modalId, state);
      this.modalStack.push(modalId);

      // Render initial content if provided
      if (options.content) {
        this.bridge.render(pluginId, sandboxId, options.content);
      }

      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && options.closeable !== false) {
          this.closeModal(modalId, 'close');
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
  }

  /**
   * Close a modal
   */
  private closeModal(
    modalId: string,
    action: string,
    data?: SerializableValue
  ): void {
    const state = this.modals.get(modalId);
    if (!state) {
      return;
    }

    // Destroy sandbox
    this.bridge.destroySandbox(state.pluginId, state.sandboxId);

    // Remove element
    state.element.remove();

    // Remove from tracking
    this.modals.delete(modalId);
    this.modalStack = this.modalStack.filter((id) => id !== modalId);

    // Resolve promise
    if (data !== undefined) {
      state.resolve({ action, data });
    } else {
      state.resolve({ action });
    }
  }

  /**
   * Show a toast notification
   */
  showToast(message: string, type: ToastType, duration: number = 3000): void {
    const toastId = generateId('toast');

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `plugin-toast plugin-toast-${type}`;
    toast.dataset['type'] = type;

    // Icon based on type
    const icon = document.createElement('span');
    icon.className = 'plugin-toast-icon';
    switch (type) {
      case 'success':
        icon.textContent = '✓';
        break;
      case 'error':
        icon.textContent = '✗';
        break;
      case 'warning':
        icon.textContent = '⚠';
        break;
      case 'info':
      default:
        icon.textContent = 'ℹ';
        break;
    }
    toast.appendChild(icon);

    // Message
    const messageSpan = document.createElement('span');
    messageSpan.className = 'plugin-toast-message';
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'plugin-toast-close';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => this.hideToast(toastId);
    toast.appendChild(closeBtn);

    // Add to container
    this.config.toastContainer.appendChild(toast);

    // Set timeout for auto-dismiss
    const timeoutId = window.setTimeout(() => {
      this.hideToast(toastId);
    }, duration);

    // Store state
    this.toasts.set(toastId, {
      id: toastId,
      element: toast,
      timeoutId,
    });

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('plugin-toast-visible');
    });
  }

  /**
   * Hide a toast
   */
  private hideToast(toastId: string): void {
    const state = this.toasts.get(toastId);
    if (!state) {
      return;
    }

    // Clear timeout
    clearTimeout(state.timeoutId);

    // Animate out
    state.element.classList.remove('plugin-toast-visible');
    state.element.classList.add('plugin-toast-hiding');

    // Remove after animation
    setTimeout(() => {
      state.element.remove();
      this.toasts.delete(toastId);
    }, 300);
  }

  /**
   * Clean up all resources for a plugin
   */
  cleanup(pluginId: string): void {
    // Close all panels
    for (const [panelId, state] of this.panels) {
      if (state.pluginId === pluginId) {
        this.closePanel(panelId);
      }
    }

    // Close all modals
    for (const [modalId, state] of this.modals) {
      if (state.pluginId === pluginId) {
        this.closeModal(modalId, 'close');
      }
    }

    // Clean up bridge
    this.bridge.cleanup(pluginId);
  }

  /**
   * Get CSS styles for plugin UI components
   */
  static getStyles(): string {
    return `
      /* Plugin Panel */
      .plugin-panel {
        display: flex;
        flex-direction: column;
        background: var(--panel-bg, #fff);
        border: 1px solid var(--panel-border, #e0e0e0);
        border-radius: 4px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .plugin-panel-header {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        background: var(--panel-header-bg, #f5f5f5);
        border-bottom: 1px solid var(--panel-border, #e0e0e0);
        gap: 8px;
      }

      .plugin-panel-title {
        flex: 1;
        font-weight: 500;
        font-size: 13px;
      }

      .plugin-panel-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.6;
        padding: 0 4px;
      }

      .plugin-panel-close:hover {
        opacity: 1;
      }

      .plugin-panel-content {
        flex: 1;
        overflow: auto;
      }

      /* Plugin Modal */
      .plugin-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .plugin-modal {
        background: var(--modal-bg, #fff);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        min-width: 300px;
      }

      .plugin-modal-header {
        display: flex;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid var(--modal-border, #e0e0e0);
      }

      .plugin-modal-title {
        flex: 1;
        font-weight: 600;
        font-size: 16px;
      }

      .plugin-modal-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        opacity: 0.6;
        padding: 0 4px;
      }

      .plugin-modal-close:hover {
        opacity: 1;
      }

      .plugin-modal-content {
        padding: 16px;
        flex: 1;
        overflow: auto;
      }

      .plugin-modal-message {
        margin: 0 0 16px;
        color: var(--text-secondary, #666);
      }

      .plugin-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid var(--modal-border, #e0e0e0);
      }

      .plugin-modal-button {
        padding: 8px 16px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        background: #fff;
      }

      .plugin-modal-button.primary {
        background: #0066cc;
        color: white;
        border-color: #0066cc;
      }

      .plugin-modal-button.danger {
        background: #cc0000;
        color: white;
        border-color: #cc0000;
      }

      .plugin-modal-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Plugin Toast */
      .plugin-toast {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: #333;
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        margin-bottom: 8px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
      }

      .plugin-toast-visible {
        opacity: 1;
        transform: translateX(0);
      }

      .plugin-toast-hiding {
        opacity: 0;
        transform: translateX(100%);
      }

      .plugin-toast-success {
        background: #2e7d32;
      }

      .plugin-toast-error {
        background: #c62828;
      }

      .plugin-toast-warning {
        background: #f57c00;
      }

      .plugin-toast-info {
        background: #1976d2;
      }

      .plugin-toast-icon {
        font-size: 16px;
      }

      .plugin-toast-message {
        flex: 1;
        font-size: 13px;
      }

      .plugin-toast-close {
        background: none;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        opacity: 0.7;
        padding: 0 4px;
      }

      .plugin-toast-close:hover {
        opacity: 1;
      }
    `;
  }
}
