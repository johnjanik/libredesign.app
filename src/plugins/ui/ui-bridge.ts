/**
 * UI Bridge
 *
 * Manages communication between plugins and their UI sandboxes.
 */

import type { SerializableValue } from '../types/serialization';
import type { UIDescription } from '../types/ui-types';
import {
  createUISandbox,
  renderUI,
  updateComponent,
  setEventHandler,
  destroySandbox,
  type UISandboxInstance,
  type UISandboxConfig,
  DEFAULT_UI_SANDBOX_CONFIG,
} from './ui-sandbox';

/**
 * Callback ID to handler mapping
 */
type CallbackHandler = (value: SerializableValue) => void;

/**
 * Plugin UI context
 */
interface PluginUIContext {
  readonly pluginId: string;
  readonly sandboxes: Map<string, UISandboxInstance>;
  readonly callbacks: Map<string, CallbackHandler>;
}

/**
 * UI Bridge for managing plugin UIs
 */
export class UIBridge {
  private readonly config: UISandboxConfig;
  private readonly contexts: Map<string, PluginUIContext>;
  private readonly sendToPlugin: (
    pluginId: string,
    callbackId: string,
    data: SerializableValue
  ) => void;

  constructor(
    sendToPlugin: (
      pluginId: string,
      callbackId: string,
      data: SerializableValue
    ) => void,
    config: UISandboxConfig = DEFAULT_UI_SANDBOX_CONFIG
  ) {
    this.config = config;
    this.contexts = new Map();
    this.sendToPlugin = sendToPlugin;
  }

  /**
   * Get or create plugin context
   */
  private getContext(pluginId: string): PluginUIContext {
    let context = this.contexts.get(pluginId);
    if (!context) {
      context = {
        pluginId,
        sandboxes: new Map(),
        callbacks: new Map(),
      };
      this.contexts.set(pluginId, context);
    }
    return context;
  }

  /**
   * Create a sandbox for a plugin panel/modal
   */
  createSandbox(
    pluginId: string,
    sandboxId: string,
    container: HTMLElement
  ): UISandboxInstance {
    const context = this.getContext(pluginId);

    // Check if sandbox already exists
    const existing = context.sandboxes.get(sandboxId);
    if (existing) {
      return existing;
    }

    // Create new sandbox
    const sandbox = createUISandbox(pluginId, container, this.config);
    context.sandboxes.set(sandboxId, sandbox);

    // Set up event handler
    setEventHandler(sandbox, (componentId, eventType, value) => {
      this.handleUIEvent(pluginId, sandboxId, componentId, eventType, value);
    });

    return sandbox;
  }

  /**
   * Render UI in a sandbox
   */
  render(pluginId: string, sandboxId: string, ui: UIDescription): boolean {
    const context = this.contexts.get(pluginId);
    const sandbox = context?.sandboxes.get(sandboxId);

    if (!sandbox) {
      return false;
    }

    // Extract callbacks from UI description
    this.extractCallbacks(pluginId, ui);

    // Render in sandbox
    renderUI(sandbox, ui);
    return true;
  }

  /**
   * Update a component in a sandbox
   */
  update(
    pluginId: string,
    sandboxId: string,
    componentId: string,
    properties: Record<string, SerializableValue>
  ): boolean {
    const context = this.contexts.get(pluginId);
    const sandbox = context?.sandboxes.get(sandboxId);

    if (!sandbox) {
      return false;
    }

    updateComponent(sandbox, componentId, properties);
    return true;
  }

  /**
   * Destroy a sandbox
   */
  destroySandbox(pluginId: string, sandboxId: string): boolean {
    const context = this.contexts.get(pluginId);
    if (!context) {
      return false;
    }

    const sandbox = context.sandboxes.get(sandboxId);
    if (!sandbox) {
      return false;
    }

    destroySandbox(sandbox);
    context.sandboxes.delete(sandboxId);
    return true;
  }

  /**
   * Register a callback handler
   */
  registerCallback(
    pluginId: string,
    callbackId: string,
    handler: CallbackHandler
  ): void {
    const context = this.getContext(pluginId);
    context.callbacks.set(callbackId, handler);
  }

  /**
   * Unregister a callback
   */
  unregisterCallback(pluginId: string, callbackId: string): boolean {
    const context = this.contexts.get(pluginId);
    if (!context) {
      return false;
    }
    return context.callbacks.delete(callbackId);
  }

  /**
   * Handle UI event from sandbox
   */
  private handleUIEvent(
    pluginId: string,
    _sandboxId: string,
    componentId: string,
    eventType: string,
    value: SerializableValue
  ): void {
    const context = this.contexts.get(pluginId);
    if (!context) {
      return;
    }

    // Look for callback by component ID + event type
    const callbackId = `${componentId}:${eventType}`;

    // Try direct callback first
    const directHandler = context.callbacks.get(callbackId);
    if (directHandler) {
      directHandler(value);
      return;
    }

    // Send event to plugin
    this.sendToPlugin(pluginId, callbackId, {
      componentId,
      eventType,
      value,
    });
  }

  /**
   * Extract callback IDs from UI description
   */
  private extractCallbacks(pluginId: string, ui: UIDescription): void {
    if (ui.events) {
      // Callbacks are stored in the UI description
      // They will be handled via the event system
    }

    // Recursively process children
    if (ui.children) {
      for (const child of ui.children) {
        this.extractCallbacks(pluginId, child);
      }
    }
  }

  /**
   * Clean up all resources for a plugin
   */
  cleanup(pluginId: string): void {
    const context = this.contexts.get(pluginId);
    if (!context) {
      return;
    }

    // Destroy all sandboxes
    for (const [, sandbox] of context.sandboxes) {
      destroySandbox(sandbox);
    }

    // Clear context
    this.contexts.delete(pluginId);
  }

  /**
   * Get sandbox count for a plugin
   */
  getSandboxCount(pluginId: string): number {
    const context = this.contexts.get(pluginId);
    return context?.sandboxes.size ?? 0;
  }

  /**
   * Check if a sandbox exists
   */
  hasSandbox(pluginId: string, sandboxId: string): boolean {
    const context = this.contexts.get(pluginId);
    return context?.sandboxes.has(sandboxId) ?? false;
  }
}
