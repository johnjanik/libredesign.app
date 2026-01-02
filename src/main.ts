/**
 * DesignLibre - Main Entry Point
 *
 * A distributed, GPU-accelerated vector CAD system.
 */

import { createDesignLibreRuntime } from '@runtime/designlibre-runtime';
import { createToolbar } from '@ui/components/toolbar';
import { createCanvasContainer } from '@ui/components/canvas-container';
import { createInspectorPanel } from '@ui/components/inspector-panel';
import { createLeftSidebar } from '@ui/components/left-sidebar';
import { createViewSwitcher } from '@ui/components/view-switcher';
// Available for UI toggle - currently hidden by default
import { createCodePanel as _createCodePanel } from '@ui/components/code-panel';
import { createTokensPanel as _createTokensPanel } from '@ui/components/tokens-panel';
import { createTokenRegistry, createTokenExporter } from '@devtools/tokens';
import './ui/styles/main.css';

// Re-export for external use
export { _createCodePanel as createCodePanel, _createTokensPanel as createTokensPanel };
export { createViewSwitcher } from '@ui/components/view-switcher';

/**
 * Application configuration
 */
interface AppConfig {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Document name for new documents */
  documentName?: string;
  /** Enable autosave */
  autosave?: boolean;
  /** Autosave interval in ms */
  autosaveInterval?: number;
  /** Enable debug mode */
  debug?: boolean;
}

/**
 * Initialize DesignLibre application.
 */
async function initializeApp(config: AppConfig): Promise<void> {
  // Get container element
  const container = typeof config.container === 'string'
    ? document.querySelector(config.container) as HTMLElement
    : config.container;

  if (!container) {
    throw new Error('Container element not found');
  }

  // Clear loading message
  container.innerHTML = '';

  // Create app structure
  const appContainer = document.createElement('div');
  appContainer.className = 'designlibre-app';
  appContainer.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column;';

  // Main content area (full height, no header)
  const main = document.createElement('main');
  main.className = 'designlibre-main';

  // Canvas container
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'designlibre-canvas-container';

  // Status bar
  const statusBar = document.createElement('footer');
  statusBar.className = 'designlibre-status-bar';
  statusBar.innerHTML = `
    <div class="designlibre-status-left">
      <span id="status-selection">No selection</span>
    </div>
    <div class="designlibre-status-right">
      <span id="status-zoom">100%</span>
    </div>
  `;

  main.appendChild(canvasContainer);
  appContainer.appendChild(main);
  appContainer.appendChild(statusBar);
  container.appendChild(appContainer);

  // Create runtime
  const runtime = createDesignLibreRuntime({
    autosaveInterval: config.autosave ? (config.autosaveInterval ?? 30000) : 0,
    debug: config.debug ?? false,
  });

  // Initialize runtime
  await runtime.initialize(canvasContainer);

  // Create document
  runtime.createDocument(config.documentName ?? 'Untitled');

  // Create canvas container UI
  createCanvasContainer(runtime, canvasContainer);

  // Create toolbar FIRST (before view switcher captures canvas)
  createToolbar(runtime, canvasContainer, { position: 'bottom' });

  // Create left sidebar (added to main first for proper ordering)
  const leftSidebar = createLeftSidebar(runtime, main, { width: 240 });
  leftSidebar.setDocumentName(config.documentName ?? 'Untitled');

  // Create view switcher (captures canvasContainer and adds code view)
  const viewSwitcher = createViewSwitcher(runtime, main);
  void viewSwitcher; // Mounted to DOM, reference not needed

  // Create inspector panel (right side)
  createInspectorPanel(runtime, main, { position: 'right', width: 280 });

  // Create design token system (available for TokensPanel when enabled)
  const tokenRegistry = createTokenRegistry();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tokenExporter = createTokenExporter(tokenRegistry);
  void tokenExporter; // Available for TokensPanel toggle

  // Note: CodePanel and TokensPanel can be toggled via UI buttons
  // They're available but hidden by default to avoid cluttering the interface
  // Uncomment below to show them:
  // _createCodePanel(runtime, main, { position: 'right' });
  // _createTokensPanel(runtime, tokenRegistry, tokenExporter, main, { position: 'right' });

  // Update status bar
  runtime.on('selection:changed', ({ nodeIds }) => {
    const statusSelection = document.getElementById('status-selection');
    if (statusSelection) {
      statusSelection.textContent = nodeIds.length === 0
        ? 'No selection'
        : `${nodeIds.length} item${nodeIds.length > 1 ? 's' : ''} selected`;
    }
  });

  // Log initialization
  if (config.debug) {
    console.log('DesignLibre initialized', { runtime });
  }
}

// Auto-initialize if #app exists
document.addEventListener('DOMContentLoaded', () => {
  const appElement = document.getElementById('app');
  if (appElement) {
    initializeApp({
      container: appElement,
      documentName: 'New Document',
      autosave: true,
      debug: import.meta.env.DEV,
    }).catch(console.error);
  }
});

// Export for programmatic use
export { initializeApp, createDesignLibreRuntime };
export type { AppConfig };
