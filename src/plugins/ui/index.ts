/**
 * Plugin UI Module
 *
 * Provides sandboxed UI rendering for plugins.
 */

export {
  createUISandbox,
  renderUI,
  updateComponent,
  setEventHandler,
  destroySandbox,
  DEFAULT_UI_SANDBOX_CONFIG,
  type UISandboxConfig,
  type UISandboxInstance,
  type UIMessageType,
  type UIHostMessage,
  type UIIframeMessage,
  type UIEventHandler,
} from './ui-sandbox';

export { UIBridge } from './ui-bridge';

export { UIRenderer, type UIRendererConfig } from './ui-renderer';
