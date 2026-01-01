/**
 * DesignLibre - Main Entry Point
 *
 * A distributed, GPU-accelerated vector CAD system.
 */

import { createDesignLibreRuntime } from '@runtime/designlibre-runtime';
import { createToolbar } from '@ui/components/toolbar';
import { createCanvasContainer } from '@ui/components/canvas-container';
import { createInspectorPanel } from '@ui/components/inspector-panel';
// Available for UI toggle - currently hidden by default
import { createCodePanel as _createCodePanel } from '@ui/components/code-panel';
import { createTokensPanel as _createTokensPanel } from '@ui/components/tokens-panel';
import { createTokenRegistry, createTokenExporter } from '@devtools/tokens';
import './ui/styles/main.css';

// Re-export for external use
export { _createCodePanel as createCodePanel, _createTokensPanel as createTokensPanel };

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

  // Header
  const header = document.createElement('header');
  header.className = 'designlibre-header';
  header.innerHTML = `
    <div class="designlibre-header-left">
      <span class="designlibre-logo">DesignLibre</span>
    </div>
    <div class="designlibre-header-center">
      <span class="designlibre-document-title">${config.documentName ?? 'Untitled'}</span>
    </div>
    <div class="designlibre-header-right">
      <button class="designlibre-button" id="btn-save">Save</button>
      <button class="designlibre-button" id="btn-export">Export</button>
    </div>
  `;

  // Main content area
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
  appContainer.appendChild(header);
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

  // Create toolbar
  createToolbar(runtime, canvasContainer, { position: 'left' });

  // Create design token system (available for TokensPanel when enabled)
  const tokenRegistry = createTokenRegistry();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tokenExporter = createTokenExporter(tokenRegistry);
  void tokenExporter; // Available for TokensPanel toggle

  // Create inspector panel (right side)
  createInspectorPanel(runtime, main, { position: 'right', width: 280 });

  // Note: CodePanel and TokensPanel can be toggled via UI buttons
  // They're available but hidden by default to avoid cluttering the interface
  // Uncomment below to show them:
  // _createCodePanel(runtime, main, { position: 'right' });
  // _createTokensPanel(runtime, tokenRegistry, tokenExporter, main, { position: 'right' });

  // Wire up header buttons
  const saveBtn = document.getElementById('btn-save');
  saveBtn?.addEventListener('click', async () => {
    try {
      await runtime.saveDocument();
      showNotification('Document saved');
    } catch (err) {
      console.error('Save failed:', err);
      showNotification('Save failed', 'error');
    }
  });

  const exportBtn = document.getElementById('btn-export');
  exportBtn?.addEventListener('click', async () => {
    const selection = runtime.getSelection();
    if (selection.length === 0) {
      showNotification('Select something to export', 'warning');
      return;
    }

    try {
      await runtime.downloadPNG(selection[0]!);
      showNotification('Export complete');
    } catch (err) {
      console.error('Export failed:', err);
      showNotification('Export failed', 'error');
    }
  });

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

/**
 * Show notification.
 */
function showNotification(
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'success'
): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    background: ${type === 'error' ? '#ff1744' : type === 'warning' ? '#ffab00' : '#00c853'};
    color: white;
    border-radius: 4px;
    font-size: 14px;
    z-index: 1000;
    animation: slideUp 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
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
