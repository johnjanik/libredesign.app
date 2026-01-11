/**
 * UI Sandbox
 *
 * Creates and manages sandboxed iframes for plugin UI rendering.
 */

import type { UIDescription } from '../types/ui-types';
import type { SerializableValue } from '../types/serialization';

/**
 * UI sandbox configuration
 */
export interface UISandboxConfig {
  /** Maximum iframe width */
  readonly maxWidth: number;
  /** Maximum iframe height */
  readonly maxHeight: number;
  /** CSP policy for iframe */
  readonly cspPolicy: string;
  /** Whether to allow same-origin access (should be false in production) */
  readonly allowSameOrigin: boolean;
}

/**
 * Default UI sandbox configuration
 */
export const DEFAULT_UI_SANDBOX_CONFIG: UISandboxConfig = {
  maxWidth: 800,
  maxHeight: 600,
  cspPolicy: "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';",
  allowSameOrigin: false,
};

/**
 * Message types for iframe communication
 */
export type UIMessageType =
  | 'init'
  | 'render'
  | 'update'
  | 'event'
  | 'ready'
  | 'error'
  | 'resize'
  | 'destroy';

/**
 * Message from host to iframe
 */
export interface UIHostMessage {
  readonly type: UIMessageType;
  readonly id: string;
  readonly payload?: SerializableValue;
}

/**
 * Message from iframe to host
 */
export interface UIIframeMessage {
  readonly type: UIMessageType;
  readonly id: string;
  readonly componentId?: string;
  readonly eventType?: string;
  readonly value?: SerializableValue;
  readonly error?: string;
  readonly size?: { width: number; height: number };
}

/**
 * Event handler for UI events from plugins
 */
export type UIEventHandler = (
  componentId: string,
  eventType: string,
  value: SerializableValue
) => void;

/**
 * UI Sandbox instance
 */
export interface UISandboxInstance {
  readonly id: string;
  readonly pluginId: string;
  readonly iframe: HTMLIFrameElement;
  readonly container: HTMLElement;
  isReady: boolean;
  eventHandler: UIEventHandler | null;
  pendingMessages: UIHostMessage[];
}

/**
 * Generate the iframe runtime script
 */
function generateRuntimeScript(): string {
  return `
(function() {
  'use strict';

  // Prevent access to parent window
  delete window.parent;
  delete window.top;
  delete window.opener;
  delete window.frameElement;

  // Message handling
  const messageHandlers = new Map();
  let isReady = false;

  // Send message to host
  function sendToHost(message) {
    window.parent.postMessage(message, '*');
  }

  // Handle messages from host
  window.addEventListener('message', function(event) {
    const message = event.data;
    if (!message || typeof message.type !== 'string') return;

    switch (message.type) {
      case 'init':
        isReady = true;
        sendToHost({ type: 'ready', id: message.id });
        break;

      case 'render':
        try {
          renderUI(message.payload);
          sendToHost({ type: 'ready', id: message.id });
        } catch (error) {
          sendToHost({ type: 'error', id: message.id, error: error.message });
        }
        break;

      case 'update':
        try {
          updateComponent(message.payload.id, message.payload.properties);
        } catch (error) {
          sendToHost({ type: 'error', id: message.id, error: error.message });
        }
        break;

      case 'destroy':
        document.body.innerHTML = '';
        break;
    }
  });

  // Render UI from description
  function renderUI(desc) {
    document.body.innerHTML = '';
    if (desc) {
      const element = createComponent(desc);
      if (element) {
        document.body.appendChild(element);
        notifyResize();
      }
    }
  }

  // Create a component from description
  function createComponent(desc) {
    if (!desc || !desc.type) return null;

    const element = document.createElement('div');
    element.id = desc.id || '';
    element.dataset.type = desc.type;
    element.className = 'ui-component ui-' + desc.type;

    // Apply styles
    if (desc.style) {
      applyStyles(element, desc.style);
    }

    // Apply properties and create content based on type
    const content = createComponentContent(desc);
    if (content) {
      if (typeof content === 'string') {
        element.innerHTML = content;
      } else {
        element.appendChild(content);
      }
    }

    // Bind events
    if (desc.events) {
      bindEvents(element, desc.id, desc.events);
    }

    // Render children
    if (desc.children && Array.isArray(desc.children)) {
      for (const child of desc.children) {
        const childElement = createComponent(child);
        if (childElement) {
          element.appendChild(childElement);
        }
      }
    }

    return element;
  }

  // Create component-specific content
  function createComponentContent(desc) {
    const props = desc.properties || {};

    switch (desc.type) {
      case 'text':
        return escapeHtml(props.content || '');

      case 'button':
        const btn = document.createElement('button');
        btn.textContent = props.label || '';
        btn.disabled = !!props.disabled;
        if (props.variant) btn.dataset.variant = props.variant;
        return btn;

      case 'input':
        const input = document.createElement('input');
        input.type = props.type || 'text';
        input.value = props.value || '';
        input.placeholder = props.placeholder || '';
        input.disabled = !!props.disabled;
        input.readOnly = !!props.readonly;
        if (props.min !== undefined) input.min = String(props.min);
        if (props.max !== undefined) input.max = String(props.max);
        if (props.step !== undefined) input.step = String(props.step);
        return input;

      case 'textarea':
        const textarea = document.createElement('textarea');
        textarea.value = props.value || '';
        textarea.placeholder = props.placeholder || '';
        textarea.disabled = !!props.disabled;
        textarea.readOnly = !!props.readonly;
        if (props.rows) textarea.rows = props.rows;
        return textarea;

      case 'select':
        const select = document.createElement('select');
        select.disabled = !!props.disabled;
        if (props.multiple) select.multiple = true;
        if (props.options && Array.isArray(props.options)) {
          for (const opt of props.options) {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            option.disabled = !!opt.disabled;
            if (props.value === opt.value ||
                (Array.isArray(props.value) && props.value.includes(opt.value))) {
              option.selected = true;
            }
            select.appendChild(option);
          }
        }
        return select;

      case 'checkbox':
        const cbContainer = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!props.checked;
        cb.disabled = !!props.disabled;
        cbContainer.appendChild(cb);
        if (props.label) {
          const span = document.createElement('span');
          span.textContent = props.label;
          cbContainer.appendChild(span);
        }
        return cbContainer;

      case 'slider':
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.value = String(props.value || 0);
        slider.min = String(props.min || 0);
        slider.max = String(props.max || 100);
        slider.step = String(props.step || 1);
        slider.disabled = !!props.disabled;
        return slider;

      case 'color-picker':
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = props.value || '#000000';
        colorInput.disabled = !!props.disabled;
        return colorInput;

      case 'image':
        const img = document.createElement('img');
        if (props.src) img.src = props.src;
        if (props.alt) img.alt = props.alt;
        if (props.fit) img.style.objectFit = props.fit;
        return img;

      case 'divider':
        return document.createElement('hr');

      case 'spacer':
        const spacer = document.createElement('div');
        spacer.style.flexGrow = '1';
        return spacer;

      case 'progress':
        const progress = document.createElement('progress');
        if (props.value !== undefined) progress.value = props.value;
        if (props.max !== undefined) progress.max = props.max;
        return progress;

      case 'spinner':
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        return spinner;

      case 'row':
      case 'column':
      case 'container':
      case 'grid':
      case 'panel':
        // Layout containers - content comes from children
        return null;

      default:
        return null;
    }
  }

  // Apply styles to element
  function applyStyles(element, styles) {
    for (const [key, value] of Object.entries(styles)) {
      if (value !== undefined && value !== null) {
        // Convert camelCase to kebab-case
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        const cssValue = typeof value === 'number' ? value + 'px' : value;
        element.style[key] = cssValue;
      }
    }
  }

  // Bind events to element
  function bindEvents(element, componentId, events) {
    for (const [eventName, callbackId] of Object.entries(events)) {
      element.addEventListener(eventName, function(e) {
        let value = undefined;

        // Extract value based on element type
        if (e.target.tagName === 'INPUT') {
          if (e.target.type === 'checkbox') {
            value = e.target.checked;
          } else if (e.target.type === 'number' || e.target.type === 'range') {
            value = parseFloat(e.target.value);
          } else {
            value = e.target.value;
          }
        } else if (e.target.tagName === 'SELECT') {
          if (e.target.multiple) {
            value = Array.from(e.target.selectedOptions).map(o => o.value);
          } else {
            value = e.target.value;
          }
        } else if (e.target.tagName === 'TEXTAREA') {
          value = e.target.value;
        }

        sendToHost({
          type: 'event',
          id: componentId,
          componentId: componentId,
          eventType: eventName,
          value: value
        });
      });
    }
  }

  // Update a component
  function updateComponent(id, properties) {
    const element = document.getElementById(id);
    if (!element) return;

    // Update based on component type
    const type = element.dataset.type;
    const input = element.querySelector('input, select, textarea, button');

    if (input) {
      if (properties.value !== undefined) {
        if (input.type === 'checkbox') {
          input.checked = !!properties.value;
        } else {
          input.value = properties.value;
        }
      }
      if (properties.disabled !== undefined) {
        input.disabled = !!properties.disabled;
      }
      if (properties.label !== undefined && input.tagName === 'BUTTON') {
        input.textContent = properties.label;
      }
    }

    if (type === 'text' && properties.content !== undefined) {
      element.textContent = properties.content;
    }
  }

  // Notify host of size change
  function notifyResize() {
    const width = document.body.scrollWidth;
    const height = document.body.scrollHeight;
    sendToHost({
      type: 'resize',
      id: 'resize',
      size: { width, height }
    });
  }

  // Observe size changes
  const resizeObserver = new ResizeObserver(notifyResize);
  resizeObserver.observe(document.body);

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Base styles
  const style = document.createElement('style');
  style.textContent = \`
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      color: var(--text-color, #333);
      background: var(--bg-color, transparent);
    }
    .ui-component {
      display: flex;
      flex-direction: column;
    }
    .ui-row {
      flex-direction: row;
    }
    .ui-column {
      flex-direction: column;
    }
    .ui-grid {
      display: grid;
    }
    .ui-text {
      display: block;
    }
    .ui-button button {
      padding: 6px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
    }
    .ui-button button:hover {
      background: #f0f0f0;
    }
    .ui-button button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .ui-button button[data-variant="primary"] {
      background: #0066cc;
      color: white;
      border-color: #0066cc;
    }
    .ui-button button[data-variant="danger"] {
      background: #cc0000;
      color: white;
      border-color: #cc0000;
    }
    .ui-input input,
    .ui-textarea textarea,
    .ui-select select {
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 13px;
    }
    .ui-input input:focus,
    .ui-textarea textarea:focus,
    .ui-select select:focus {
      outline: none;
      border-color: #0066cc;
    }
    .ui-checkbox label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .ui-slider input {
      width: 100%;
    }
    .ui-color-picker input {
      width: 40px;
      height: 30px;
      padding: 0;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .ui-divider hr {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 8px 0;
    }
    .ui-image img {
      max-width: 100%;
      height: auto;
    }
    .ui-progress progress {
      width: 100%;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e0e0e0;
      border-top-color: #0066cc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  \`;
  document.head.appendChild(style);
})();
`;
}

/**
 * Generate iframe HTML content
 */
function generateIframeHTML(config: UISandboxConfig): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="${config.cspPolicy}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Plugin UI</title>
</head>
<body>
  <script>${generateRuntimeScript()}</script>
</body>
</html>`;
}

/**
 * Create a UI sandbox for a plugin
 */
export function createUISandbox(
  pluginId: string,
  container: HTMLElement,
  config: UISandboxConfig = DEFAULT_UI_SANDBOX_CONFIG
): UISandboxInstance {
  const id = `ui-sandbox-${pluginId}-${Date.now()}`;

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.id = id;
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.maxWidth = `${config.maxWidth}px`;
  iframe.style.maxHeight = `${config.maxHeight}px`;

  // Set sandbox attributes
  const sandboxAttrs = ['allow-scripts'];
  if (config.allowSameOrigin) {
    sandboxAttrs.push('allow-same-origin');
  }
  iframe.sandbox.add(...sandboxAttrs);

  // Create instance
  const instance: UISandboxInstance = {
    id,
    pluginId,
    iframe,
    container,
    isReady: false,
    eventHandler: null,
    pendingMessages: [],
  };

  // Set up message listener
  const messageListener = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return;

    const message = event.data as UIIframeMessage;
    if (!message || typeof message.type !== 'string') return;

    switch (message.type) {
      case 'ready':
        instance.isReady = true;
        // Flush pending messages
        for (const pending of instance.pendingMessages) {
          sendMessage(instance, pending);
        }
        instance.pendingMessages = [];
        break;

      case 'event':
        if (instance.eventHandler && message.componentId && message.eventType) {
          instance.eventHandler(
            message.componentId,
            message.eventType,
            message.value ?? null
          );
        }
        break;

      case 'resize':
        if (message.size) {
          iframe.style.height = `${Math.min(message.size.height, config.maxHeight)}px`;
        }
        break;

      case 'error':
        console.error(`[Plugin UI Error: ${pluginId}]`, message.error);
        break;
    }
  };

  window.addEventListener('message', messageListener);

  // Store cleanup function
  const iframeWithCleanup = iframe as unknown as Record<string, unknown>;
  iframeWithCleanup['_cleanup'] = () => {
    window.removeEventListener('message', messageListener);
  };

  // Load content using srcdoc
  iframe.srcdoc = generateIframeHTML(config);

  // Add to container
  container.appendChild(iframe);

  // Send init message when loaded
  iframe.onload = () => {
    sendMessage(instance, { type: 'init', id: 'init' });
  };

  return instance;
}

/**
 * Send a message to the sandbox
 */
export function sendMessage(
  instance: UISandboxInstance,
  message: UIHostMessage
): void {
  if (!instance.isReady) {
    instance.pendingMessages.push(message);
    return;
  }

  instance.iframe.contentWindow?.postMessage(message, '*');
}

/**
 * Render UI in the sandbox
 */
export function renderUI(
  instance: UISandboxInstance,
  ui: UIDescription
): void {
  sendMessage(instance, {
    type: 'render',
    id: `render-${Date.now()}`,
    payload: ui as unknown as SerializableValue,
  });
}

/**
 * Update a component in the sandbox
 */
export function updateComponent(
  instance: UISandboxInstance,
  componentId: string,
  properties: Record<string, SerializableValue>
): void {
  sendMessage(instance, {
    type: 'update',
    id: `update-${Date.now()}`,
    payload: { id: componentId, properties } as unknown as SerializableValue,
  });
}

/**
 * Set event handler for the sandbox
 */
export function setEventHandler(
  instance: UISandboxInstance,
  handler: UIEventHandler
): void {
  instance.eventHandler = handler;
}

/**
 * Destroy the sandbox
 */
export function destroySandbox(instance: UISandboxInstance): void {
  // Send destroy message
  sendMessage(instance, { type: 'destroy', id: 'destroy' });

  // Clean up listener
  const iframeRecord = instance.iframe as unknown as Record<string, unknown>;
  const cleanup = iframeRecord['_cleanup'];
  if (typeof cleanup === 'function') {
    cleanup();
  }

  // Remove from DOM
  instance.iframe.remove();
}
