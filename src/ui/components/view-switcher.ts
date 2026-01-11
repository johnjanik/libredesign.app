/**
 * View Switcher Component
 *
 * Provides switching between Design view, Code view, and Split view.
 * Supports resizable split with persistent preferences.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import { createCodeView, type CodeView, type CodeLanguage } from './code-view';
import { createPreviewPanel, type PreviewPanel } from './preview-panel';

/** View mode */
export type ViewMode = 'design' | 'code' | 'split' | 'preview' | 'design-preview';

/** View switcher options */
export interface ViewSwitcherOptions {
  defaultMode?: ViewMode;
  defaultSplitRatio?: number;
  minPanelWidth?: number;
  defaultLanguage?: CodeLanguage;
}

/** Toolbar mode (from toolbar.ts) */
export type ToolbarMode = 'design' | 'cad' | 'schematic' | 'pcb';

const STORAGE_KEY_MODE = 'designlibre-view-mode';
const STORAGE_KEY_SPLIT = 'designlibre-split-ratio';
const STORAGE_KEY_LANG = 'designlibre-code-language';

/**
 * View Switcher
 *
 * Manages switching between Design, Code, and Split views.
 */
export class ViewSwitcher {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private element: HTMLElement;
  private designContainer: HTMLElement;
  private codeContainer: HTMLElement;
  private previewContainer: HTMLElement;
  private divider: HTMLElement;
  private divider2: HTMLElement;
  private toolbar: HTMLElement;
  private tabsContainer: HTMLElement;
  private modeLabel: HTMLElement;
  private codeView: CodeView | null = null;
  private previewPanel: PreviewPanel | null = null;
  private currentMode: ViewMode;
  private currentToolbarMode: ToolbarMode = 'design';
  private splitRatio: number;
  private minPanelWidth: number;
  private isDragging = false;
  private originalDesignContent: HTMLElement | null = null;
  private toolbarModeUnsubscribe: (() => void) | null = null;

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: ViewSwitcherOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    this.minPanelWidth = options.minPanelWidth ?? 200;

    // Load persisted preferences
    this.currentMode = this.loadMode(options.defaultMode ?? 'design');
    this.splitRatio = this.loadSplitRatio(options.defaultSplitRatio ?? 0.5);
    const defaultLanguage = this.loadLanguage(options.defaultLanguage ?? 'typescript');

    // Create the view structure
    this.element = this.createViewStructure();
    this.designContainer = this.element.querySelector('.view-switcher-design')!;
    this.codeContainer = this.element.querySelector('.view-switcher-code')!;
    this.previewContainer = this.element.querySelector('.view-switcher-preview')!;
    this.divider = this.element.querySelector('.view-switcher-divider')!;
    this.divider2 = this.element.querySelector('.view-switcher-divider-2')!;
    this.toolbar = this.element.querySelector('.view-switcher-toolbar')!;
    this.tabsContainer = this.element.querySelector('.view-switcher-tabs')!;
    this.modeLabel = this.element.querySelector('.view-switcher-mode-label')!;

    // Insert view structure into container
    this.container.appendChild(this.element);

    // Listen for toolbar mode changes
    this.toolbarModeUnsubscribe = this.runtime.on('toolbar:mode-changed', (data) => {
      const { mode } = data as { mode: ToolbarMode };
      this.setToolbarMode(mode);
    });

    // Move existing canvas content to design container (if any exists)
    this.captureDesignContent();

    // Create code view
    this.codeView = createCodeView(this.runtime, this.codeContainer, {
      defaultLanguage,
    });

    // Create preview panel
    this.previewPanel = createPreviewPanel(this.runtime, this.previewContainer, {
      autoRefresh: true,
    });

    // Setup event listeners
    this.setupEventListeners();

    // Apply initial mode
    this.applyMode();
  }

  private createViewStructure(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'view-switcher';
    wrapper.innerHTML = `
      <div class="view-switcher-toolbar">
        <div class="view-switcher-mode-label" style="display: none;">
          <span class="mode-name">CAD</span>
        </div>
        <div class="view-switcher-tabs">
          <button class="view-switcher-tab" data-mode="design" title="Design view (Cmd+1)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h12v12H2V2zm1 1v10h10V3H3z"/>
              <rect x="5" y="5" width="6" height="6" rx="1"/>
            </svg>
            <span>Design</span>
          </button>
          <button class="view-switcher-tab" data-mode="code" title="Code view (Cmd+2)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.854 4.146a.5.5 0 0 1 0 .708L2.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm4.292 0a.5.5 0 0 0 0 .708L13.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z"/>
            </svg>
            <span>Code</span>
          </button>
          <button class="view-switcher-tab" data-mode="preview" title="Preview view (Cmd+3)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8zm7-5.9A5.9 5.9 0 1 0 8 13.9 5.9 5.9 0 0 0 8 2.1z"/>
              <path d="M6.5 5.5l4 2.5-4 2.5V5.5z"/>
            </svg>
            <span>Preview</span>
          </button>
          <button class="view-switcher-tab" data-mode="split" title="Design + Code split (Cmd+4)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h5v12H2V2zm1 1v10h3V3H3zm5-1h6v12H8V2zm1 1v10h4V3H9z"/>
            </svg>
            <span>Split</span>
          </button>
          <button class="view-switcher-tab" data-mode="design-preview" title="Design + Preview split (Cmd+5)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h5v12H2V2zm1 1v10h3V3H3z"/>
              <circle cx="11.5" cy="8" r="3.5"/>
              <path d="M10 6.5l2.5 1.5-2.5 1.5V6.5z" fill="white"/>
            </svg>
            <span>Design+Preview</span>
          </button>
        </div>
      </div>
      <div class="view-switcher-content">
        <div class="view-switcher-design"></div>
        <div class="view-switcher-divider" title="Drag to resize, double-click to reset">
          <div class="view-switcher-divider-handle"></div>
        </div>
        <div class="view-switcher-code"></div>
        <div class="view-switcher-divider-2" title="Drag to resize, double-click to reset">
          <div class="view-switcher-divider-handle"></div>
        </div>
        <div class="view-switcher-preview"></div>
      </div>
    `;

    // Style the mode label
    const modeLabel = wrapper.querySelector('.view-switcher-mode-label') as HTMLElement;
    modeLabel.style.cssText = `
      display: none;
      align-items: center;
      padding: 0 16px;
      height: 36px;
      font-size: 14px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    return wrapper;
  }

  /**
   * Set the toolbar mode (Design, CAD, Schematic, PCB)
   * This controls whether view tabs are shown or just a mode label
   */
  setToolbarMode(mode: ToolbarMode): void {
    this.currentToolbarMode = mode;

    if (mode === 'design') {
      // Show view tabs, hide mode label
      this.tabsContainer.style.display = 'flex';
      this.modeLabel.style.display = 'none';
    } else {
      // Hide view tabs, show mode label
      this.tabsContainer.style.display = 'none';
      this.modeLabel.style.display = 'flex';

      // Update mode label text
      const modeNames: Record<ToolbarMode, string> = {
        design: 'Design',
        cad: 'CAD',
        schematic: 'Schematic',
        pcb: 'PCB',
      };
      const modeNameEl = this.modeLabel.querySelector('.mode-name');
      if (modeNameEl) {
        modeNameEl.textContent = modeNames[mode];
      }

      // When switching away from design mode, ensure we're in design view
      if (this.currentMode !== 'design') {
        this.setMode('design');
      }
    }
  }

  /**
   * Get the current toolbar mode
   */
  getToolbarMode(): ToolbarMode {
    return this.currentToolbarMode;
  }

  private captureDesignContent(): void {
    // Find the canvas container within our container
    const canvasContainer = this.container.querySelector('.designlibre-canvas-container');
    if (canvasContainer) {
      this.originalDesignContent = canvasContainer as HTMLElement;
      this.designContainer.appendChild(canvasContainer);
    }
  }

  private setupEventListeners(): void {
    // Tab clicks
    const tabs = this.toolbar.querySelectorAll('.view-switcher-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-mode') as ViewMode;
        this.setMode(mode);
      });
    });

    // Divider drag
    this.divider.addEventListener('mousedown', (e) => this.startDrag(e, 'first'));
    this.divider2.addEventListener('mousedown', (e) => this.startDrag(e, 'second'));
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.endDrag.bind(this));

    // Double-click divider to reset
    this.divider.addEventListener('dblclick', () => {
      this.splitRatio = 0.5;
      this.saveSplitRatio();
      this.applyMode();
    });
    this.divider2.addEventListener('dblclick', () => {
      this.splitRatio = 0.5;
      this.saveSplitRatio();
      this.applyMode();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboard.bind(this));

    // Save language preference when it changes
    if (this.codeView) {
      const originalSetLang = this.codeView.setLanguage.bind(this.codeView);
      this.codeView.setLanguage = (lang: CodeLanguage) => {
        originalSetLang(lang);
        this.saveLanguage(lang);
      };
    }
  }

  private handleKeyboard(e: KeyboardEvent): void {
    // Cmd/Ctrl + 1/2/3/4/5 for view switching
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      if (e.key === '1') {
        e.preventDefault();
        this.setMode('design');
      } else if (e.key === '2') {
        e.preventDefault();
        this.setMode('code');
      } else if (e.key === '3') {
        e.preventDefault();
        this.setMode('preview');
      } else if (e.key === '4') {
        e.preventDefault();
        this.setMode('split');
      } else if (e.key === '5') {
        e.preventDefault();
        this.setMode('design-preview');
      }
    }
  }

  private startDrag(e: MouseEvent, _divider: 'first' | 'second'): void {
    if (this.currentMode !== 'split' && this.currentMode !== 'design-preview') return;
    e.preventDefault();
    this.isDragging = true;
    this.element.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
  }

  private onDrag(e: MouseEvent): void {
    if (!this.isDragging) return;

    const contentEl = this.element.querySelector('.view-switcher-content') as HTMLElement;
    const rect = contentEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const totalWidth = rect.width;

    // Calculate ratio with min width constraints
    let ratio = x / totalWidth;
    const minRatio = this.minPanelWidth / totalWidth;
    const maxRatio = 1 - minRatio;

    ratio = Math.max(minRatio, Math.min(maxRatio, ratio));
    this.splitRatio = ratio;

    this.applyMode();
  }

  private endDrag(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.element.classList.remove('dragging');
    document.body.style.cursor = '';
    this.saveSplitRatio();
  }

  private applyMode(): void {
    // Update tab states
    const tabs = this.toolbar.querySelectorAll('.view-switcher-tab');
    tabs.forEach(tab => {
      const mode = tab.getAttribute('data-mode');
      tab.classList.toggle('active', mode === this.currentMode);
    });

    // Update element class
    this.element.setAttribute('data-mode', this.currentMode);

    // Hide all containers and dividers by default
    this.designContainer.style.display = 'none';
    this.codeContainer.style.display = 'none';
    this.previewContainer.style.display = 'none';
    this.divider.style.display = 'none';
    this.divider2.style.display = 'none';

    // Apply layout based on mode
    switch (this.currentMode) {
      case 'design':
        this.designContainer.style.display = 'flex';
        this.designContainer.style.width = '100%';
        break;

      case 'code':
        this.codeContainer.style.display = 'flex';
        this.codeContainer.style.width = '100%';
        break;

      case 'preview':
        this.previewContainer.style.display = 'flex';
        this.previewContainer.style.width = '100%';
        // Trigger refresh on preview panel
        if (this.previewPanel) {
          this.previewPanel.refresh();
        }
        break;

      case 'split':
        this.designContainer.style.display = 'flex';
        this.codeContainer.style.display = 'flex';
        this.divider.style.display = 'flex';

        // Apply split ratio
        const designWidthSplit = `${this.splitRatio * 100}%`;
        const codeWidthSplit = `${(1 - this.splitRatio) * 100}%`;
        this.designContainer.style.width = `calc(${designWidthSplit} - 4px)`;
        this.codeContainer.style.width = `calc(${codeWidthSplit} - 4px)`;
        break;

      case 'design-preview':
        this.designContainer.style.display = 'flex';
        this.previewContainer.style.display = 'flex';
        this.divider2.style.display = 'flex';

        // Apply split ratio
        const designWidthPreview = `${this.splitRatio * 100}%`;
        const previewWidth = `${(1 - this.splitRatio) * 100}%`;
        this.designContainer.style.width = `calc(${designWidthPreview} - 4px)`;
        this.previewContainer.style.width = `calc(${previewWidth} - 4px)`;

        // Trigger refresh on preview panel
        if (this.previewPanel) {
          this.previewPanel.refresh();
        }
        break;
    }

    // Trigger resize event for canvas to adjust
    window.dispatchEvent(new Event('resize'));
  }

  // Persistence methods
  private loadMode(defaultMode: ViewMode): ViewMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MODE);
      if (stored && ['design', 'code', 'split', 'preview', 'design-preview'].includes(stored)) {
        return stored as ViewMode;
      }
    } catch {
      // localStorage not available
    }
    return defaultMode;
  }

  private saveMode(): void {
    try {
      localStorage.setItem(STORAGE_KEY_MODE, this.currentMode);
    } catch {
      // localStorage not available
    }
  }

  private loadSplitRatio(defaultRatio: number): number {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SPLIT);
      if (stored) {
        const ratio = parseFloat(stored);
        if (!isNaN(ratio) && ratio >= 0.1 && ratio <= 0.9) {
          return ratio;
        }
      }
    } catch {
      // localStorage not available
    }
    return defaultRatio;
  }

  private saveSplitRatio(): void {
    try {
      localStorage.setItem(STORAGE_KEY_SPLIT, this.splitRatio.toString());
    } catch {
      // localStorage not available
    }
  }

  private loadLanguage(defaultLang: CodeLanguage): CodeLanguage {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LANG);
      if (stored && ['typescript', 'swift', 'kotlin'].includes(stored)) {
        return stored as CodeLanguage;
      }
    } catch {
      // localStorage not available
    }
    return defaultLang;
  }

  private saveLanguage(lang: CodeLanguage): void {
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch {
      // localStorage not available
    }
  }

  /**
   * Set the current view mode.
   */
  setMode(mode: ViewMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.saveMode();
    this.applyMode();
  }

  /**
   * Get the current view mode.
   */
  getMode(): ViewMode {
    return this.currentMode;
  }

  /**
   * Get the code view instance.
   */
  getCodeView(): CodeView | null {
    return this.codeView;
  }

  /**
   * Get the preview panel instance.
   */
  getPreviewPanel(): PreviewPanel | null {
    return this.previewPanel;
  }

  /**
   * Get the design container element.
   */
  getDesignContainer(): HTMLElement {
    return this.designContainer;
  }

  /**
   * Dispose of the view switcher.
   */
  dispose(): void {
    document.removeEventListener('keydown', this.handleKeyboard.bind(this));
    document.removeEventListener('mousemove', this.onDrag.bind(this));
    document.removeEventListener('mouseup', this.endDrag.bind(this));

    // Unsubscribe from toolbar mode changes
    if (this.toolbarModeUnsubscribe) {
      this.toolbarModeUnsubscribe();
      this.toolbarModeUnsubscribe = null;
    }

    if (this.codeView) {
      this.codeView.dispose();
      this.codeView = null;
    }

    if (this.previewPanel) {
      this.previewPanel.dispose();
      this.previewPanel = null;
    }

    // Move design content back
    if (this.originalDesignContent && this.originalDesignContent.parentElement) {
      this.container.appendChild(this.originalDesignContent);
    }

    this.element.remove();
  }
}

/**
 * Create a view switcher.
 */
export function createViewSwitcher(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: ViewSwitcherOptions
): ViewSwitcher {
  return new ViewSwitcher(runtime, container, options);
}
