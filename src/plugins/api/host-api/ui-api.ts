/**
 * UI API
 *
 * Host API for managing plugin UI panels, modals, and toasts.
 */

import type { SerializableValue } from '../../types/serialization';
import type { UIDescription, PanelOptions, ModalOptions, ToastType } from '../../types/ui-types';

/**
 * Panel handle for managing open panels
 */
export interface PanelHandle {
  readonly id: string;
  readonly pluginId: string;
  readonly title: string;
  readonly createdAt: number;
}

/**
 * Modal result when closed
 */
export interface ModalResult {
  readonly action: 'confirm' | 'cancel' | 'close';
  readonly data?: SerializableValue;
}

/**
 * UI adapter interface for the host application
 */
export interface UIAdapter {
  /** Show a plugin panel */
  showPanel(pluginId: string, options: PanelOptions): string;
  /** Close a panel */
  closePanel(panelId: string): boolean;
  /** Update panel content */
  updatePanel(panelId: string, content: UIDescription): boolean;
  /** Show a modal dialog */
  showModal(pluginId: string, options: ModalOptions): Promise<ModalResult>;
  /** Show a toast notification */
  showToast(message: string, type: ToastType, duration?: number): void;
  /** Check if a panel is open */
  isPanelOpen(panelId: string): boolean;
  /** Get panel info */
  getPanelInfo(panelId: string): PanelHandle | null;
}

/**
 * UI configuration
 */
export interface UIConfig {
  /** Maximum panels per plugin */
  readonly maxPanelsPerPlugin: number;
  /** Maximum toast duration in milliseconds */
  readonly maxToastDuration: number;
  /** Default toast duration in milliseconds */
  readonly defaultToastDuration: number;
}

/**
 * Default UI configuration
 */
export const DEFAULT_UI_CONFIG: UIConfig = {
  maxPanelsPerPlugin: 5,
  maxToastDuration: 10000,
  defaultToastDuration: 3000,
};

/**
 * Plugin UI state
 */
interface PluginUIState {
  readonly pluginId: string;
  panels: Map<string, PanelHandle>;
}

/**
 * Generate a unique panel ID
 */
function generatePanelId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `panel_${timestamp}_${random}`;
}

/**
 * Create the UI API handlers
 */
export function createUIAPI(
  adapter: UIAdapter,
  config: UIConfig = DEFAULT_UI_CONFIG
) {
  const pluginStates = new Map<string, PluginUIState>();

  // Get or create plugin UI state
  function getPluginState(pluginId: string): PluginUIState {
    let state = pluginStates.get(pluginId);
    if (!state) {
      state = {
        pluginId,
        panels: new Map(),
      };
      pluginStates.set(pluginId, state);
    }
    return state;
  }

  // Validate UI description
  function validateUIDescription(ui: unknown): UIDescription {
    if (typeof ui !== 'object' || ui === null) {
      throw new Error('UI description must be an object');
    }

    const desc = ui as Record<string, unknown>;
    const descType = desc['type'];
    const descId = desc['id'];
    const descChildren = desc['children'];

    if (typeof descType !== 'string') {
      throw new Error('UI description must have a type');
    }

    if (typeof descId !== 'string') {
      throw new Error('UI description must have an id');
    }

    const validTypes = [
      'panel',
      'button',
      'input',
      'select',
      'checkbox',
      'radio',
      'slider',
      'color-picker',
      'grid',
      'text',
      'divider',
      'spacer',
      'image',
      'icon',
      'container',
      'row',
      'column',
    ];

    if (!validTypes.includes(descType)) {
      throw new Error(`Invalid UI component type: ${descType}`);
    }

    // Recursively validate children
    if (Array.isArray(descChildren)) {
      for (const child of descChildren) {
        validateUIDescription(child);
      }
    }

    return ui as UIDescription;
  }

  // Validate panel options
  function validatePanelOptions(options: unknown): PanelOptions {
    if (typeof options !== 'object' || options === null) {
      throw new Error('Panel options must be an object');
    }

    const opts = options as Record<string, unknown>;
    const title = opts['title'];
    const content = opts['content'];
    const position = opts['position'];
    const width = opts['width'];
    const height = opts['height'];

    if (typeof title !== 'string') {
      throw new Error('Panel must have a title');
    }

    if (title.length > 100) {
      throw new Error('Panel title too long (max 100 characters)');
    }

    if (content !== undefined) {
      validateUIDescription(content);
    }

    // Validate position if provided
    if (position !== undefined) {
      const validPositions = ['left', 'right', 'bottom', 'float'];
      if (!validPositions.includes(position as string)) {
        throw new Error(`Invalid panel position: ${position}`);
      }
    }

    // Validate size if provided
    if (width !== undefined && typeof width !== 'number') {
      throw new Error('Panel width must be a number');
    }
    if (height !== undefined && typeof height !== 'number') {
      throw new Error('Panel height must be a number');
    }

    return options as PanelOptions;
  }

  // Validate modal options
  function validateModalOptions(options: unknown): ModalOptions {
    if (typeof options !== 'object' || options === null) {
      throw new Error('Modal options must be an object');
    }

    const opts = options as Record<string, unknown>;
    const title = opts['title'];
    const content = opts['content'];

    if (typeof title !== 'string') {
      throw new Error('Modal must have a title');
    }

    if (title.length > 100) {
      throw new Error('Modal title too long (max 100 characters)');
    }

    if (content !== undefined) {
      validateUIDescription(content);
    }

    return options as ModalOptions;
  }

  return {
    /**
     * Show a panel
     */
    'ui.showPanel': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<PanelHandle> => {
      const options = validatePanelOptions(args[0]);
      const state = getPluginState(pluginId);

      // Check panel limit
      if (state.panels.size >= config.maxPanelsPerPlugin) {
        throw new Error(
          `Maximum panels exceeded (${config.maxPanelsPerPlugin})`
        );
      }

      const panelId = generatePanelId();

      // Show the panel via adapter
      adapter.showPanel(pluginId, { ...options, id: panelId });

      // Track the panel
      const handle: PanelHandle = {
        id: panelId,
        pluginId,
        title: options.title,
        createdAt: Date.now(),
      };
      state.panels.set(panelId, handle);

      return handle;
    },

    /**
     * Close a panel
     */
    'ui.closePanel': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<boolean> => {
      const panelId = args[0];
      if (typeof panelId !== 'string') {
        throw new Error('Panel ID must be a string');
      }

      const state = getPluginState(pluginId);
      const handle = state.panels.get(panelId);

      if (!handle) {
        return false;
      }

      // Verify ownership
      if (handle.pluginId !== pluginId) {
        throw new Error('Cannot close panel owned by another plugin');
      }

      // Close via adapter
      const closed = adapter.closePanel(panelId);

      if (closed) {
        state.panels.delete(panelId);
      }

      return closed;
    },

    /**
     * Update panel content
     */
    'ui.updatePanel': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<boolean> => {
      const panelId = args[0];
      const content = args[1];

      if (typeof panelId !== 'string') {
        throw new Error('Panel ID must be a string');
      }

      const state = getPluginState(pluginId);
      const handle = state.panels.get(panelId);

      if (!handle) {
        return false;
      }

      // Verify ownership
      if (handle.pluginId !== pluginId) {
        throw new Error('Cannot update panel owned by another plugin');
      }

      // Validate and update
      const validContent = validateUIDescription(content);
      return adapter.updatePanel(panelId, validContent);
    },

    /**
     * Show a modal dialog
     */
    'ui.showModal': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<ModalResult> => {
      const options = validateModalOptions(args[0]);

      // Show modal and wait for result
      return adapter.showModal(pluginId, options);
    },

    /**
     * Show a toast notification
     */
    'ui.showToast': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const message = args[0];
      const type = (args[1] ?? 'info') as ToastType;
      const duration = args[2] as number | undefined;

      if (typeof message !== 'string') {
        throw new Error('Toast message must be a string');
      }

      if (message.length > 500) {
        throw new Error('Toast message too long (max 500 characters)');
      }

      const validTypes: ToastType[] = ['info', 'success', 'warning', 'error'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid toast type: ${type}`);
      }

      let finalDuration = config.defaultToastDuration;
      if (typeof duration === 'number') {
        finalDuration = Math.min(duration, config.maxToastDuration);
      }

      adapter.showToast(message, type, finalDuration);
    },

    /**
     * Get all open panels for this plugin
     */
    'ui.getPanels': async (pluginId: string): Promise<PanelHandle[]> => {
      const state = getPluginState(pluginId);
      return Array.from(state.panels.values());
    },

    /**
     * Close all panels for this plugin
     */
    'ui.closeAllPanels': async (pluginId: string): Promise<number> => {
      const state = getPluginState(pluginId);
      let closedCount = 0;

      for (const [panelId] of state.panels) {
        if (adapter.closePanel(panelId)) {
          closedCount++;
        }
      }

      state.panels.clear();
      return closedCount;
    },

    /**
     * Check if a panel is open
     */
    'ui.isPanelOpen': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<boolean> => {
      const panelId = args[0];
      if (typeof panelId !== 'string') {
        return false;
      }

      const state = getPluginState(pluginId);
      return state.panels.has(panelId) && adapter.isPanelOpen(panelId);
    },

    /**
     * Clean up all UI for a plugin (called on unload)
     */
    _cleanup: (pluginId: string): void => {
      const state = pluginStates.get(pluginId);
      if (state) {
        for (const [panelId] of state.panels) {
          adapter.closePanel(panelId);
        }
        pluginStates.delete(pluginId);
      }
    },
  };
}

export type UIAPIHandlers = ReturnType<typeof createUIAPI>;
