/**
 * DesignLibre - Main Entry Point
 *
 * A distributed, GPU-accelerated vector CAD system.
 */

import { createDesignLibreRuntime } from '@runtime/designlibre-runtime';
import { createToolbar } from '@ui/components/toolbar';
import { createCanvasContainer } from '@ui/components/canvas-container';
import { createRightSidebarContainer, type RightSidebarContainer } from '@ui/components/right-sidebar-container';
import { createLeftSidebar } from '@ui/components/left-sidebar';
import { createViewSwitcher } from '@ui/components/view-switcher';
// New UI components
import { createNavRail } from '@ui/components/nav-rail';
import { createSidePanel } from '@ui/components/side-panel';
import { createWorkspaceManager } from '@runtime/workspace-manager';
// Available for UI toggle - currently hidden by default
import { createCodePanel as _createCodePanel } from '@ui/components/code-panel';
import { createTokensPanel as _createTokensPanel } from '@ui/components/tokens-panel';
import { createTokenRegistry, createTokenExporter } from '@devtools/tokens';
// AI Integration
import { createAIController, getConfigManager } from '@ai/index';
import type { AIController } from '@ai/index';
// Theme system
import { initializeTheme } from './ui/utils/theme-manager';
// App settings - re-exported below for external use
import { getDefaultExportFormat } from '@core/settings/app-settings';
export type { AppSettings } from '@core/settings/app-settings';
export { getSetting, setSetting, getDefaultExportFormat } from '@core/settings/app-settings';
// Plugin system
import { getPluginManager, registerBuiltInPlugins } from '@core/plugins/plugin-manager';
export { getPluginManager, type Plugin } from '@core/plugins/plugin-manager';
// Keyboard shortcuts help
import { setupShortcutsHelpHotkey } from '@ui/components/shortcuts-help';
// Search panel
import { openSearchPanel } from '@ui/components/search-panel';
// Hotkey system
export { getHotkeyManager, type HotkeyAction, type HotkeyManager } from '@core/hotkeys/hotkey-manager';
// History/Undo system
export {
  getHistoryManager,
  createHistoryManager,
  createPropertyChangeCommand,
  createNodeCreationCommand,
  createNodeDeletionCommand,
  createMoveCommand,
  createResizeCommand,
  type Command,
  type HistoryManager
} from '@core/history/history-manager';
// Silence unused import warning - re-exported items
void getDefaultExportFormat;
import './ui/styles/main.css';
// UnoCSS - atomic utility classes
import 'virtual:uno.css';

// Re-export for external use
export { _createCodePanel as createCodePanel, _createTokensPanel as createTokensPanel };
export { createViewSwitcher } from '@ui/components/view-switcher';
export { createPreviewPanel, DEVICE_PRESETS, type PreviewPanel, type DevicePreset } from '@ui/components/preview-panel';

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
  /** Enable AI integration */
  enableAI?: boolean;
  /** Show AI panel by default */
  showAIPanel?: boolean;
  /** Use new UI layout (NavRail + SidePanel) */
  useNewUI?: boolean;
}

/**
 * Set up global keyboard shortcuts
 */
function setupKeyboardShortcuts(rightSidebar: RightSidebarContainer): void {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + Shift + L - Toggle AI panel
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      rightSidebar.toggleAIPanel();
    }

    // Escape - Close AI panel if open
    if (e.key === 'Escape' && rightSidebar.isAIPanelVisible()) {
      // Only close if not in an input field
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
        // Let the input handle Escape
        return;
      }
      rightSidebar.hideAIPanel();
    }
  });
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

  console.log('[DesignLibre] Creating runtime...');
  // Create runtime
  const runtime = createDesignLibreRuntime({
    autosaveInterval: config.autosave ? (config.autosaveInterval ?? 30000) : 0,
    debug: config.debug ?? false,
  });

  console.log('[DesignLibre] Initializing runtime...');
  // Initialize runtime
  await runtime.initialize(canvasContainer);
  console.log('[DesignLibre] Runtime initialized');

  // Create document
  runtime.createDocument(config.documentName ?? 'Untitled');

  // Create canvas container UI
  createCanvasContainer(runtime, canvasContainer);

  // Create toolbar FIRST (before view switcher captures canvas)
  createToolbar(runtime, canvasContainer, { position: 'bottom' });

  // Create workspace manager for new UI
  const workspaceManager = createWorkspaceManager();

  // Choose UI layout based on config
  if (config.useNewUI) {
    // ========================================
    // NEW UI LAYOUT: NavRail + SidePanel
    // ========================================

    // Create nav rail (leftmost vertical strip)
    const navRail = createNavRail(runtime, main, {
      position: 'left',
      workspaceManager,
    });

    // Create side panel (collapsible, resizable)
    const sidePanel = createSidePanel(runtime, main, {
      width: 280,
      minWidth: 200,
      maxWidth: 480,
    });

    // Get side panel content container
    const sidePanelContent = sidePanel.getContentElement();
    if (sidePanelContent) {
      // Create the existing left sidebar layers inside side panel
      // Workspace/project selection is now in the nav rail dropdowns
      const leftSidebar = createLeftSidebar(runtime, sidePanelContent, {
        width: 0, // Full width of parent
        collapsed: false,
      });
      leftSidebar.setDocumentName(config.documentName ?? 'Untitled');
    }

    // Note: Side panel already listens to designlibre-sidebar-toggle internally

    // Sync nav rail state if side panel is toggled externally
    window.addEventListener('designlibre-side-panel-toggle', ((e: CustomEvent) => {
      navRail.setSidebarOpen(!e.detail.collapsed);
    }) as EventListener);

    // References retained for potential cleanup
    void navRail;
    void sidePanel;
  } else {
    // ========================================
    // CLASSIC UI LAYOUT: Left sidebar only
    // ========================================
    const leftSidebar = createLeftSidebar(runtime, main, { width: 240 });
    leftSidebar.setDocumentName(config.documentName ?? 'Untitled');
  }

  // Workspace manager available for external use
  void workspaceManager;

  // Create view switcher (captures canvasContainer and adds code view)
  const viewSwitcher = createViewSwitcher(runtime, main);
  void viewSwitcher; // Mounted to DOM, reference not needed

  // Initialize AI system (if enabled)
  let aiController: AIController | null = null;
  if (config.enableAI !== false) {
    try {
      // Get config manager for provider settings
      const configManager = getConfigManager();
      const aiConfig = configManager.getConfig();
      const activeProviderConfig = configManager.getActiveProviderConfig();

      // Build provider configurations for the AI controller
      const providers: Record<string, unknown> = {};

      // Add Anthropic if configured
      if (aiConfig.providers.anthropic?.enabled && aiConfig.providers.anthropic.apiKey) {
        providers['anthropic'] = {
          apiKey: aiConfig.providers.anthropic.apiKey,
          model: aiConfig.providers.anthropic.defaultModel,
          maxTokens: aiConfig.providers.anthropic.maxTokens,
          temperature: aiConfig.providers.anthropic.temperature,
        };
      }

      // Add OpenAI if configured
      if (aiConfig.providers.openai?.enabled && aiConfig.providers.openai.apiKey) {
        providers['openai'] = {
          apiKey: aiConfig.providers.openai.apiKey,
          model: aiConfig.providers.openai.defaultModel,
          maxTokens: aiConfig.providers.openai.maxTokens,
          temperature: aiConfig.providers.openai.temperature,
        };
      }

      // Add Ollama if configured
      if (aiConfig.providers.ollama?.enabled) {
        providers['ollama'] = {
          baseUrl: aiConfig.providers.ollama.endpoint,
          model: aiConfig.providers.ollama.defaultModel,
        };
      }

      // Add llama.cpp if configured
      if (aiConfig.providers.llamacpp?.enabled) {
        providers['llamacpp'] = {
          baseUrl: aiConfig.providers.llamacpp.endpoint,
        };
      }

      // Create AI controller with the config
      aiController = createAIController(runtime, {
        providers,
        defaultProvider: activeProviderConfig.type,
        autoConnect: true,
      });

      // Connect to providers with timeout to prevent hanging
      const connectTimeout = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('AI connection timeout')), 5000);
      });
      await Promise.race([aiController.connect(), connectTimeout]);

      if (config.debug) {
        console.log('AI system initialized', {
          activeProvider: activeProviderConfig.type,
          availableProviders: aiController.getProviderNames(),
        });
      }
    } catch (error) {
      console.warn('Failed to initialize AI system:', error);
    }
  }

  // Create right sidebar container (inspector panel + AI chat)
  const rightSidebar = createRightSidebarContainer(runtime, main, aiController, {
    inspectorWidth: 280,
    aiPanelWidth: 360,
    showAIPanel: config.showAIPanel ?? false,
  });

  // Set up keyboard shortcuts for AI panel
  setupKeyboardShortcuts(rightSidebar);

  // Reference retained for potential cleanup/extension
  void aiController;

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

  // Listen for settings changes
  window.addEventListener('designlibre-settings-changed', ((e: CustomEvent) => {
    const detail = e.detail as {
      autosaveEnabled?: boolean;
      autosaveInterval?: number;
      snapToGrid?: boolean;
      gridSize?: number;
    };

    // Handle autosave settings
    if (detail.autosaveEnabled !== undefined) {
      runtime.setAutosaveEnabled(detail.autosaveEnabled);
    }
    if (detail.autosaveInterval !== undefined) {
      runtime.setAutosaveInterval(detail.autosaveInterval);
    }

    // Handle grid snapping settings
    if (detail.snapToGrid !== undefined || detail.gridSize !== undefined) {
      const toolManager = runtime.getToolManager();
      if (toolManager) {
        if (detail.snapToGrid !== undefined) {
          toolManager.setSnapToGrid(detail.snapToGrid);
        }
        if (detail.gridSize !== undefined) {
          toolManager.setGridSize(detail.gridSize);
        }
      }
    }
  }) as EventListener);

  // Listen for search panel toggle events
  window.addEventListener('designlibre-open-search', () => {
    openSearchPanel(runtime);
  });

  // Add Ctrl+F keyboard shortcut for search
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
      // Don't override browser search if in an input field
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
        return;
      }
      e.preventDefault();
      openSearchPanel(runtime);
    }
  });

  // Log initialization
  if (config.debug) {
    console.log('DesignLibre initialized', { runtime });
  }
}

// Auto-initialize if #app exists
console.log('[DesignLibre] Script loaded');

function onReady() {
  console.log('[DesignLibre] DOM ready');
  // Initialize theme system first to prevent flash of wrong theme
  initializeTheme();
  console.log('[DesignLibre] Theme initialized');

  // Initialize plugin system
  registerBuiltInPlugins();
  const pluginManager = getPluginManager();
  pluginManager.initializeAll().catch(console.error);

  // Initialize keyboard shortcuts help (? key)
  setupShortcutsHelpHotkey();

  // Listen for plugin toggle events
  window.addEventListener('designlibre-plugin-toggle', ((e: CustomEvent) => {
    const { pluginId, enabled } = e.detail as { pluginId: string; enabled: boolean };
    if (enabled) {
      pluginManager.enable(pluginId).catch(console.error);
    } else {
      pluginManager.disable(pluginId).catch(console.error);
    }
  }) as EventListener);

  const appElement = document.getElementById('app');
  if (appElement) {
    // Check URL param for UI mode: ?ui=new or ?ui=classic
    const urlParams = new URLSearchParams(window.location.search);
    const uiMode = urlParams.get('ui');
    const useNewUI = uiMode === 'new' || (uiMode !== 'classic' && true); // Default to new UI

    initializeApp({
      container: appElement,
      documentName: 'New Document',
      autosave: true,
      debug: import.meta.env.DEV,
      enableAI: true,
      showAIPanel: false, // Hidden by default, use Cmd/Ctrl+Shift+L to toggle
      useNewUI,
    }).catch(console.error);
  }
}

// Run immediately if DOM already loaded, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}

// Export for programmatic use
export { initializeApp, createDesignLibreRuntime };
export type { AppConfig };

// Export new UI components
export { createNavRail } from '@ui/components/nav-rail';
export { createSidePanel } from '@ui/components/side-panel';
export { createWorkspaceSelector } from '@ui/components/workspace-selector';
export { createProjectSelector } from '@ui/components/project-selector';
export { createLayerTree } from '@ui/components/layer-tree';
export { createWorkspaceManager } from '@runtime/workspace-manager';
export { Modal, openModal, confirm, alert } from '@ui/components/modal';
export { showExportDialog, type ExportFormat, type ExportResult } from '@ui/components/export-dialog';
export { openSettingsModal, closeSettingsModal, getSettingsModal } from '@ui/components/settings-modal';
export { showShortcutsHelp, setupShortcutsHelpHotkey } from '@ui/components/shortcuts-help';
export { initializeTheme, setThemeMode, getThemeManager, type ThemeMode, type ResolvedTheme } from './ui/utils/theme-manager';
