/**
 * View Switcher Component
 *
 * Provides switching between Design view, Code view, and Split view.
 * Supports resizable split with persistent preferences.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import { createCodeView, type CodeView, type CodeLanguage } from './code-view';

/** View mode */
export type ViewMode = 'design' | 'code' | 'split';

/** View switcher options */
export interface ViewSwitcherOptions {
  defaultMode?: ViewMode;
  defaultSplitRatio?: number;
  minPanelWidth?: number;
  defaultLanguage?: CodeLanguage;
}

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
  private divider: HTMLElement;
  private toolbar: HTMLElement;
  private codeView: CodeView | null = null;
  private currentMode: ViewMode;
  private splitRatio: number;
  private minPanelWidth: number;
  private isDragging = false;
  private originalDesignContent: HTMLElement | null = null;

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
    this.divider = this.element.querySelector('.view-switcher-divider')!;
    this.toolbar = this.element.querySelector('.view-switcher-toolbar')!;

    // Insert view structure into container
    this.container.appendChild(this.element);

    // Move existing canvas content to design container (if any exists)
    this.captureDesignContent();

    // Create code view
    this.codeView = createCodeView(this.runtime, this.codeContainer, {
      defaultLanguage,
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
          <button class="view-switcher-tab" data-mode="split" title="Split view (Cmd+3)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h5v12H2V2zm1 1v10h3V3H3zm5-1h6v12H8V2zm1 1v10h4V3H9z"/>
            </svg>
            <span>Split</span>
          </button>
        </div>
      </div>
      <div class="view-switcher-content">
        <div class="view-switcher-design"></div>
        <div class="view-switcher-divider" title="Drag to resize, double-click to reset">
          <div class="view-switcher-divider-handle"></div>
        </div>
        <div class="view-switcher-code"></div>
      </div>
    `;

    return wrapper;
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
    this.divider.addEventListener('mousedown', this.startDrag.bind(this));
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.endDrag.bind(this));

    // Double-click divider to reset
    this.divider.addEventListener('dblclick', () => {
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
    // Cmd/Ctrl + 1/2/3 for view switching
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      if (e.key === '1') {
        e.preventDefault();
        this.setMode('design');
      } else if (e.key === '2') {
        e.preventDefault();
        this.setMode('code');
      } else if (e.key === '3') {
        e.preventDefault();
        this.setMode('split');
      }
    }
  }

  private startDrag(e: MouseEvent): void {
    if (this.currentMode !== 'split') return;
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

    // Apply layout based on mode
    switch (this.currentMode) {
      case 'design':
        this.designContainer.style.display = 'flex';
        this.designContainer.style.width = '100%';
        this.codeContainer.style.display = 'none';
        this.divider.style.display = 'none';
        break;

      case 'code':
        this.designContainer.style.display = 'none';
        this.codeContainer.style.display = 'flex';
        this.codeContainer.style.width = '100%';
        this.divider.style.display = 'none';
        break;

      case 'split':
        this.designContainer.style.display = 'flex';
        this.codeContainer.style.display = 'flex';
        this.divider.style.display = 'flex';

        // Apply split ratio
        const designWidth = `${this.splitRatio * 100}%`;
        const codeWidth = `${(1 - this.splitRatio) * 100}%`;
        this.designContainer.style.width = `calc(${designWidth} - 4px)`;
        this.codeContainer.style.width = `calc(${codeWidth} - 4px)`;
        break;
    }

    // Trigger resize event for canvas to adjust
    window.dispatchEvent(new Event('resize'));
  }

  // Persistence methods
  private loadMode(defaultMode: ViewMode): ViewMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MODE);
      if (stored && ['design', 'code', 'split'].includes(stored)) {
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

    if (this.codeView) {
      this.codeView.dispose();
      this.codeView = null;
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
