/**
 * Preview Panel
 *
 * Live web preview of designs using an iframe sandbox.
 * Shows real browser rendering of exported HTML with utility classes.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import { createHTMLExporter, type HTMLExportOptions } from '@persistence/export/html-exporter';

/** Device preset for responsive preview */
export interface DevicePreset {
  name: string;
  width: number;
  height: number;
  icon: string;
  scale?: number;
}

/** Built-in device presets */
export const DEVICE_PRESETS: DevicePreset[] = [
  { name: 'Responsive', width: 0, height: 0, icon: 'responsive' },
  { name: 'iPhone SE', width: 375, height: 667, icon: 'phone' },
  { name: 'iPhone 14', width: 390, height: 844, icon: 'phone' },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932, icon: 'phone' },
  { name: 'iPad Mini', width: 768, height: 1024, icon: 'tablet' },
  { name: 'iPad Pro 11"', width: 834, height: 1194, icon: 'tablet' },
  { name: 'Desktop', width: 1440, height: 900, icon: 'desktop' },
  { name: 'Desktop HD', width: 1920, height: 1080, icon: 'desktop' },
];

/** Preview panel options */
export interface PreviewPanelOptions {
  /** Default device preset */
  defaultDevice?: string;
  /** Show device frame */
  showDeviceFrame?: boolean;
  /** Auto-refresh on selection change */
  autoRefresh?: boolean;
  /** Background color for preview area */
  backgroundColor?: string;
}

const DEFAULT_OPTIONS: PreviewPanelOptions = {
  defaultDevice: 'Responsive',
  showDeviceFrame: true,
  autoRefresh: true,
  backgroundColor: '#f0f0f0',
};

/** Icons for the preview panel */
const ICONS = {
  refresh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>`,
  phone: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>`,
  tablet: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>`,
  desktop: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>`,
  responsive: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
    <path d="M17 8h3"/><path d="M17 11h3"/>
  </svg>`,
  rotate: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 12a9 9 0 11-6.219-8.56"/>
    <polyline points="21 3 21 9 15 9"/>
  </svg>`,
  zoom: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M8 11h6"/><path d="M11 8v6"/>
  </svg>`,
  newWindow: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`,
  hover: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12l8-8"/>
  </svg>`,
};

/**
 * Preview Panel class
 */
export class PreviewPanel {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private element: HTMLElement;
  private iframe: HTMLIFrameElement;
  private deviceSelector: HTMLSelectElement;
  private zoomSelector: HTMLSelectElement;
  private iframeContainer: HTMLElement;
  private options: PreviewPanelOptions;
  private currentDevice: DevicePreset;
  private currentZoom = 100;
  private isLandscape = false;
  private selectedNodeIds: NodeId[] = [];
  private unsubscribers: Array<() => void> = [];
  private refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: PreviewPanelOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Find initial device
    this.currentDevice = DEVICE_PRESETS.find(d => d.name === this.options.defaultDevice) ?? DEVICE_PRESETS[0]!;

    // Create structure
    this.element = this.createStructure();
    this.deviceSelector = this.element.querySelector('.preview-device-selector')!;
    this.zoomSelector = this.element.querySelector('.preview-zoom-selector')!;
    this.iframeContainer = this.element.querySelector('.preview-iframe-container')!;
    this.iframe = this.element.querySelector('.preview-iframe')!;

    // Mount to container
    this.container.appendChild(this.element);

    // Setup event listeners
    this.setupEventListeners();

    // Initial render
    this.refresh();
  }

  private createStructure(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'preview-panel';
    panel.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border-left: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    panel.innerHTML = `
      <div class="preview-panel-toolbar" style="
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--designlibre-bg-tertiary, #252525);
        border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
        flex-shrink: 0;
      ">
        <!-- Device selector -->
        <select class="preview-device-selector" style="
          padding: 4px 8px;
          background: var(--designlibre-bg-secondary, #2d2d2d);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 4px;
          color: var(--designlibre-text-primary, #e4e4e4);
          font-size: 11px;
          cursor: pointer;
          min-width: 120px;
        ">
          ${DEVICE_PRESETS.map(d => `<option value="${d.name}">${d.name}${d.width ? ` (${d.width}×${d.height})` : ''}</option>`).join('')}
        </select>

        <!-- Rotate button -->
        <button class="preview-rotate-btn" title="Rotate device" style="
          padding: 4px 6px;
          background: var(--designlibre-bg-secondary, #2d2d2d);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 4px;
          color: var(--designlibre-text-secondary, #a0a0a0);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        ">${ICONS.rotate}</button>

        <!-- Zoom selector -->
        <select class="preview-zoom-selector" style="
          padding: 4px 8px;
          background: var(--designlibre-bg-secondary, #2d2d2d);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 4px;
          color: var(--designlibre-text-primary, #e4e4e4);
          font-size: 11px;
          cursor: pointer;
          width: 70px;
        ">
          <option value="50">50%</option>
          <option value="75">75%</option>
          <option value="100" selected>100%</option>
          <option value="125">125%</option>
          <option value="150">150%</option>
        </select>

        <div style="flex: 1;"></div>

        <!-- Hover state toggle -->
        <button class="preview-hover-btn" title="Preview hover state" style="
          padding: 4px 6px;
          background: var(--designlibre-bg-secondary, #2d2d2d);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 4px;
          color: var(--designlibre-text-secondary, #a0a0a0);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        ">${ICONS.hover}</button>

        <!-- Refresh button -->
        <button class="preview-refresh-btn" title="Refresh preview" style="
          padding: 4px 6px;
          background: var(--designlibre-bg-secondary, #2d2d2d);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 4px;
          color: var(--designlibre-text-secondary, #a0a0a0);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        ">${ICONS.refresh}</button>

        <!-- Open in new window -->
        <button class="preview-newwindow-btn" title="Open in new window" style="
          padding: 4px 6px;
          background: var(--designlibre-bg-secondary, #2d2d2d);
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 4px;
          color: var(--designlibre-text-secondary, #a0a0a0);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        ">${ICONS.newWindow}</button>
      </div>

      <div class="preview-viewport" style="
        flex: 1;
        overflow: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: ${this.options.backgroundColor};
      ">
        <div class="preview-iframe-container" style="
          position: relative;
          transition: all 0.2s ease;
        ">
          <iframe
            class="preview-iframe"
            sandbox="allow-scripts allow-same-origin"
            style="
              border: none;
              background: white;
              box-shadow: 0 4px 20px rgba(0,0,0,0.15);
              border-radius: 4px;
            "
          ></iframe>
        </div>
      </div>

      <div class="preview-status-bar" style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        background: var(--designlibre-bg-tertiary, #252525);
        border-top: 1px solid var(--designlibre-border, #3d3d3d);
        font-size: 10px;
        color: var(--designlibre-text-secondary, #a0a0a0);
      ">
        <span class="preview-status-text">Ready</span>
        <span class="preview-dimensions-text"></span>
      </div>
    `;

    return panel;
  }

  private setupEventListeners(): void {
    // Prevent wheel events from bubbling to canvas (which would zoom)
    this.element.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: true });

    // Device selector
    this.deviceSelector.addEventListener('change', () => {
      const deviceName = this.deviceSelector.value;
      const device = DEVICE_PRESETS.find(d => d.name === deviceName);
      if (device) {
        this.currentDevice = device;
        this.isLandscape = false;
        this.updateIframeSize();
      }
    });

    // Zoom selector
    this.zoomSelector.addEventListener('change', () => {
      this.currentZoom = parseInt(this.zoomSelector.value, 10);
      this.updateIframeSize();
    });

    // Rotate button
    const rotateBtn = this.element.querySelector('.preview-rotate-btn');
    rotateBtn?.addEventListener('click', () => {
      if (this.currentDevice.width > 0) {
        this.isLandscape = !this.isLandscape;
        this.updateIframeSize();
      }
    });
    this.setupButtonHover(rotateBtn as HTMLElement);

    // Refresh button
    const refreshBtn = this.element.querySelector('.preview-refresh-btn');
    refreshBtn?.addEventListener('click', () => this.refresh());
    this.setupButtonHover(refreshBtn as HTMLElement);

    // Hover state toggle
    const hoverBtn = this.element.querySelector('.preview-hover-btn');
    let hoverActive = false;
    hoverBtn?.addEventListener('click', () => {
      hoverActive = !hoverActive;
      (hoverBtn as HTMLElement).style.background = hoverActive
        ? 'var(--designlibre-accent, #4dabff)'
        : 'var(--designlibre-bg-secondary, #2d2d2d)';
      (hoverBtn as HTMLElement).style.color = hoverActive
        ? 'white'
        : 'var(--designlibre-text-secondary, #a0a0a0)';
      this.toggleHoverState(hoverActive);
    });
    this.setupButtonHover(hoverBtn as HTMLElement);

    // Open in new window
    const newWindowBtn = this.element.querySelector('.preview-newwindow-btn');
    newWindowBtn?.addEventListener('click', () => this.openInNewWindow());
    this.setupButtonHover(newWindowBtn as HTMLElement);

    // Subscribe to selection changes
    if (this.options.autoRefresh) {
      const unsubSelection = this.runtime.on('selection:changed', ({ nodeIds }) => {
        this.selectedNodeIds = nodeIds;
        this.debouncedRefresh();
      });
      this.unsubscribers.push(unsubSelection);

      // Subscribe to property changes
      const sceneGraph = this.runtime.getSceneGraph();
      const unsubProperty = sceneGraph.on('node:propertyChanged', ({ nodeId }) => {
        if (this.selectedNodeIds.includes(nodeId)) {
          this.debouncedRefresh();
        }
      });
      this.unsubscribers.push(unsubProperty);
    }

    // Initial iframe size
    this.updateIframeSize();
  }

  private setupButtonHover(btn: HTMLElement | null): void {
    if (!btn) return;
    const originalBg = btn.style.background;
    const originalColor = btn.style.color;
    btn.addEventListener('mouseenter', () => {
      if (!btn.classList.contains('active')) {
        btn.style.background = 'var(--designlibre-bg-tertiary, #353535)';
        btn.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (!btn.classList.contains('active')) {
        btn.style.background = originalBg;
        btn.style.color = originalColor;
      }
    });
  }

  private updateIframeSize(): void {
    let width: number;
    let height: number;

    if (this.currentDevice.width === 0) {
      // Responsive mode - fill container
      width = this.iframeContainer.parentElement?.clientWidth ?? 800;
      height = this.iframeContainer.parentElement?.clientHeight ?? 600;
      width = Math.max(320, width - 48);
      height = Math.max(240, height - 48);
    } else {
      // Fixed device size
      width = this.isLandscape ? this.currentDevice.height : this.currentDevice.width;
      height = this.isLandscape ? this.currentDevice.width : this.currentDevice.height;
    }

    // Apply zoom
    const scale = this.currentZoom / 100;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    this.iframe.style.width = `${width}px`;
    this.iframe.style.height = `${height}px`;
    this.iframe.style.transform = `scale(${scale})`;
    this.iframe.style.transformOrigin = 'top left';

    // Container size for proper centering
    this.iframeContainer.style.width = `${scaledWidth}px`;
    this.iframeContainer.style.height = `${scaledHeight}px`;

    // Update dimensions display
    const dimensionsEl = this.element.querySelector('.preview-dimensions-text');
    if (dimensionsEl) {
      dimensionsEl.textContent = `${width} × ${height}`;
    }
  }

  private debouncedRefresh(): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
    }
    this.refreshDebounceTimer = setTimeout(() => {
      this.refresh();
    }, 150);
  }

  /**
   * Refresh the preview with current selection
   */
  refresh(): void {
    const statusEl = this.element.querySelector('.preview-status-text');
    if (statusEl) {
      statusEl.textContent = 'Rendering...';
    }

    // Get nodes to render
    let nodeIds = this.selectedNodeIds;
    if (nodeIds.length === 0) {
      // If no selection, try to get page children
      const currentPageId = this.runtime.getCurrentPageId();
      if (currentPageId) {
        nodeIds = this.runtime.getSceneGraph().getChildIds(currentPageId);
      }
    }

    if (nodeIds.length === 0) {
      this.renderEmpty();
      return;
    }

    // Export to HTML
    const exportOptions: Partial<HTMLExportOptions> = {
      styleMode: 'both',
      framework: 'tailwind',
      fullDocument: true,
      includeReset: true,
      includeGeneratedCSS: true,
    };

    const exporter = createHTMLExporter(this.runtime.getSceneGraph(), exportOptions);
    const result = exporter.export(nodeIds);

    // Update iframe
    this.iframe.srcdoc = result.html;

    // Update status
    if (statusEl) {
      const classCount = result.classes.length;
      statusEl.textContent = `${classCount} classes`;
      if (result.warnings.length > 0) {
        statusEl.textContent += ` • ${result.warnings.length} warnings`;
      }
    }
  }

  private renderEmpty(): void {
    const emptyHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            font-family: system-ui, sans-serif;
            background: #f5f5f5;
            color: #666;
          }
          .empty-state {
            text-align: center;
            padding: 40px;
          }
          .empty-state svg {
            width: 64px;
            height: 64px;
            stroke: #ccc;
            margin-bottom: 16px;
          }
          .empty-state p {
            margin: 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18"/>
            <path d="M9 21V9"/>
          </svg>
          <p>Select elements to preview</p>
        </div>
      </body>
      </html>
    `;
    this.iframe.srcdoc = emptyHTML;

    const statusEl = this.element.querySelector('.preview-status-text');
    if (statusEl) {
      statusEl.textContent = 'No selection';
    }
  }

  private toggleHoverState(enabled: boolean): void {
    // Inject hover state simulation CSS
    const iframeDoc = this.iframe.contentDocument;
    if (!iframeDoc) return;

    const existingStyle = iframeDoc.getElementById('preview-hover-simulation');
    if (existingStyle) {
      existingStyle.remove();
    }

    if (enabled) {
      const style = iframeDoc.createElement('style');
      style.id = 'preview-hover-simulation';
      style.textContent = `
        /* Simulate hover states */
        *:hover { }
        button, [role="button"], a {
          filter: brightness(1.1);
          transition: filter 0.15s;
        }
      `;
      iframeDoc.head.appendChild(style);
    }
  }

  private openInNewWindow(): void {
    const iframeDoc = this.iframe.contentDocument;
    if (!iframeDoc) return;

    const html = iframeDoc.documentElement.outerHTML;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const newWindow = window.open(url, '_blank', `width=${this.currentDevice.width || 800},height=${this.currentDevice.height || 600}`);
    if (newWindow) {
      newWindow.addEventListener('load', () => {
        URL.revokeObjectURL(url);
      });
    }
  }

  /**
   * Set the preview content directly (for external use)
   */
  setContent(html: string): void {
    this.iframe.srcdoc = html;
  }

  /**
   * Get the current HTML content
   */
  getContent(): string {
    return this.iframe.contentDocument?.documentElement.outerHTML ?? '';
  }

  /**
   * Set device preset by name
   */
  setDevice(deviceName: string): void {
    const device = DEVICE_PRESETS.find(d => d.name === deviceName);
    if (device) {
      this.currentDevice = device;
      this.deviceSelector.value = deviceName;
      this.updateIframeSize();
    }
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.currentZoom = zoom;
    this.zoomSelector.value = String(zoom);
    this.updateIframeSize();
  }

  /**
   * Get the iframe element (for advanced use)
   */
  getIframe(): HTMLIFrameElement {
    return this.iframe;
  }

  /**
   * Show the panel
   */
  show(): void {
    this.element.style.display = 'flex';
  }

  /**
   * Hide the panel
   */
  hide(): void {
    this.element.style.display = 'none';
  }

  /**
   * Dispose of the panel
   */
  dispose(): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
    }

    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    this.element.remove();
  }
}

/**
 * Create a preview panel
 */
export function createPreviewPanel(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: PreviewPanelOptions
): PreviewPanel {
  return new PreviewPanel(runtime, container, options);
}
