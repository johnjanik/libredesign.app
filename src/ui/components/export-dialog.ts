/**
 * Export Dialog
 *
 * Modal dialog for exporting designs to PNG, SVG, or PDF.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import { createSVGExporter, type SVGExportOptions } from '@persistence/export/svg-exporter';
import { createPNGExporter, type PNGExportOptions } from '@persistence/export/png-exporter';
import { getSetting } from '@core/settings/app-settings';

/**
 * Export format
 */
export type ExportFormat = 'png' | 'svg' | 'pdf';

/**
 * Export dialog options
 */
export interface ExportDialogOptions {
  nodeIds?: NodeId[];
  defaultFormat?: ExportFormat;
  onExport?: (result: ExportResult) => void;
  onClose?: () => void;
}

/**
 * Export result
 */
export interface ExportResult {
  format: ExportFormat;
  blob: Blob;
  url: string;
  filename: string;
  width: number;
  height: number;
}

/**
 * SVG Icons
 */
const ICONS = {
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,
  download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`,
};

/**
 * Export Dialog
 */
export class ExportDialog {
  private runtime: DesignLibreRuntime;
  private overlay: HTMLElement | null = null;
  private modal: HTMLElement | null = null;
  private previewContainer: HTMLElement | null = null;
  private options: Required<ExportDialogOptions>;
  private selectedFormat: ExportFormat;
  private exportOptions = {
    scale: 1,
    backgroundColor: 'transparent',
    padding: 0,
    quality: 0.92,
  };
  private filename = 'export';
  private isExporting = false;

  constructor(
    runtime: DesignLibreRuntime,
    options: ExportDialogOptions = {}
  ) {
    this.runtime = runtime;
    this.options = {
      nodeIds: options.nodeIds ?? [...runtime.getToolManager()?.getSelectedNodeIds() ?? []],
      defaultFormat: options.defaultFormat ?? getSetting('defaultExportFormat') as ExportFormat,
      onExport: options.onExport ?? (() => {}),
      onClose: options.onClose ?? (() => {}),
    };
    this.selectedFormat = this.options.defaultFormat;
  }

  /**
   * Show the export dialog
   */
  show(): void {
    this.render();
    this.updatePreview();
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the export dialog
   */
  close(): void {
    document.body.style.overflow = '';
    if (this.overlay) {
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay?.remove();
        this.overlay = null;
        this.modal = null;
        this.previewContainer = null;
        this.options.onClose();
      }, 150);
    }
  }

  private render(): void {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'designlibre-export-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.15s ease;
    `;
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'designlibre-export-modal';
    this.modal.style.cssText = `
      display: flex;
      width: 700px;
      max-width: calc(100vw - 64px);
      height: 500px;
      max-height: calc(100vh - 64px);
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 12px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
      overflow: hidden;
    `;

    // Left panel (preview)
    const previewPanel = this.createPreviewPanel();
    this.modal.appendChild(previewPanel);

    // Right panel (options)
    const optionsPanel = this.createOptionsPanel();
    this.modal.appendChild(optionsPanel);

    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);

    // Animate in
    requestAnimationFrame(() => {
      if (this.overlay) {
        this.overlay.style.opacity = '1';
      }
    });

    // Keyboard handler
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.close();
    }
  };

  private createPreviewPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--designlibre-bg-tertiary, #0a0a0a);
      border-right: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    // Preview header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    header.textContent = 'Preview';
    panel.appendChild(header);

    // Preview container
    this.previewContainer = document.createElement('div');
    this.previewContainer.style.cssText = `
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow: hidden;
    `;
    panel.appendChild(this.previewContainer);

    return panel;
  }

  private createOptionsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 280px;
      display: flex;
      flex-direction: column;
      background: var(--designlibre-bg-primary, #1e1e1e);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    const title = document.createElement('span');
    title.textContent = 'Export';
    title.style.cssText = 'font-weight: 600; font-size: 16px; color: var(--designlibre-text-primary, #e4e4e4);';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = ICONS.close;
    closeBtn.title = 'Close';
    closeBtn.style.cssText = `
      display: flex;
      padding: 6px;
      border: none;
      background: transparent;
      color: var(--designlibre-text-secondary, #888);
      cursor: pointer;
      border-radius: 4px;
    `;
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Options content
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    `;

    // Format selector
    content.appendChild(this.createFormatSelector());

    // Filename input
    content.appendChild(this.createFilenameInput());

    // Format-specific options
    content.appendChild(this.createFormatOptions());

    panel.appendChild(content);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 16px;
      border-top: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    const exportBtn = document.createElement('button');
    exportBtn.innerHTML = `${ICONS.download} Export`;
    exportBtn.style.cssText = `
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--designlibre-accent, #0d99ff);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    `;
    exportBtn.addEventListener('click', () => this.doExport());
    footer.appendChild(exportBtn);

    panel.appendChild(footer);

    return panel;
  }

  private createFormatSelector(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px;';

    const label = document.createElement('div');
    label.textContent = 'Format';
    label.style.cssText = `
      font-size: 12px;
      font-weight: 500;
      color: var(--designlibre-text-secondary, #888);
      margin-bottom: 8px;
    `;
    section.appendChild(label);

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; gap: 8px;';

    const formats: ExportFormat[] = ['png', 'svg', 'pdf'];
    for (const format of formats) {
      const btn = document.createElement('button');
      btn.textContent = format.toUpperCase();
      btn.dataset['format'] = format;
      const isActive = format === this.selectedFormat;
      btn.style.cssText = `
        flex: 1;
        padding: 10px;
        border: 1px solid ${isActive ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-border, #3d3d3d)'};
        background: ${isActive ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-bg-secondary, #2d2d2d)'};
        color: ${isActive ? 'white' : 'var(--designlibre-text-primary, #e4e4e4)'};
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      `;
      btn.addEventListener('click', () => {
        this.selectedFormat = format;
        this.updateFormatButtons(buttons);
        this.updateFormatOptions();
        this.updatePreview();
      });
      buttons.appendChild(btn);
    }

    section.appendChild(buttons);
    return section;
  }

  private updateFormatButtons(container: HTMLElement): void {
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      const format = btn.dataset['format'];
      const isActive = format === this.selectedFormat;
      btn.style.borderColor = isActive ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-border, #3d3d3d)';
      btn.style.background = isActive ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-bg-secondary, #2d2d2d)';
      btn.style.color = isActive ? 'white' : 'var(--designlibre-text-primary, #e4e4e4)';
    });
  }

  private createFilenameInput(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px;';

    const label = document.createElement('label');
    label.textContent = 'Filename';
    label.style.cssText = `
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--designlibre-text-secondary, #888);
      margin-bottom: 8px;
    `;
    section.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.filename;
    input.placeholder = 'export';
    input.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 13px;
      box-sizing: border-box;
    `;
    input.addEventListener('input', () => {
      this.filename = input.value || 'export';
    });
    section.appendChild(input);

    return section;
  }

  private formatOptionsContainer: HTMLElement | null = null;

  private createFormatOptions(): HTMLElement {
    this.formatOptionsContainer = document.createElement('div');
    this.formatOptionsContainer.className = 'format-options';
    this.updateFormatOptions();
    return this.formatOptionsContainer;
  }

  private updateFormatOptions(): void {
    if (!this.formatOptionsContainer) return;
    this.formatOptionsContainer.innerHTML = '';

    switch (this.selectedFormat) {
      case 'png':
        this.formatOptionsContainer.appendChild(this.createPNGOptions());
        break;
      case 'svg':
        this.formatOptionsContainer.appendChild(this.createSVGOptions());
        break;
      case 'pdf':
        this.formatOptionsContainer.appendChild(this.createPDFOptions());
        break;
    }
  }

  private createPNGOptions(): HTMLElement {
    const container = document.createElement('div');

    // Scale
    container.appendChild(this.createSliderOption(
      'Scale',
      this.exportOptions.scale,
      0.5, 4, 0.5,
      (v) => `${v}x`,
      (v) => {
        this.exportOptions.scale = v;
        this.updatePreview();
      }
    ));

    // Background
    container.appendChild(this.createSelectOption(
      'Background',
      this.exportOptions.backgroundColor,
      [
        { value: 'transparent', label: 'Transparent' },
        { value: '#ffffff', label: 'White' },
        { value: '#000000', label: 'Black' },
      ],
      (v) => {
        this.exportOptions.backgroundColor = v;
        this.updatePreview();
      }
    ));

    // Padding
    container.appendChild(this.createSliderOption(
      'Padding',
      this.exportOptions.padding,
      0, 100, 10,
      (v) => `${v}px`,
      (v) => {
        this.exportOptions.padding = v;
        this.updatePreview();
      }
    ));

    return container;
  }

  private createSVGOptions(): HTMLElement {
    const container = document.createElement('div');

    // Padding
    container.appendChild(this.createSliderOption(
      'Padding',
      this.exportOptions.padding,
      0, 100, 10,
      (v) => `${v}px`,
      (v) => {
        this.exportOptions.padding = v;
        this.updatePreview();
      }
    ));

    return container;
  }

  private createPDFOptions(): HTMLElement {
    const container = document.createElement('div');

    const note = document.createElement('div');
    note.textContent = 'PDF export coming soon. For now, export as SVG and convert.';
    note.style.cssText = `
      padding: 16px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
      color: var(--designlibre-text-secondary, #888);
      font-size: 12px;
      text-align: center;
    `;
    container.appendChild(note);

    return container;
  }

  private createSliderOption(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    format: (v: number) => string,
    onChange: (v: number) => void
  ): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 16px;';

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-size: 12px; font-weight: 500; color: var(--designlibre-text-secondary, #888);';
    header.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.textContent = format(value);
    valueEl.style.cssText = 'font-size: 12px; color: var(--designlibre-accent, #0d99ff);';
    header.appendChild(valueEl);

    section.appendChild(header);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.cssText = `
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      background: #444;
      border-radius: 2px;
      cursor: pointer;
    `;
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueEl.textContent = format(v);
      onChange(v);
    });
    section.appendChild(slider);

    return section;
  }

  private createSelectOption(
    label: string,
    value: string,
    options: Array<{ value: string; label: string }>,
    onChange: (v: string) => void
  ): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 16px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--designlibre-text-secondary, #888);
      margin-bottom: 8px;
    `;
    section.appendChild(labelEl);

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 13px;
    `;
    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.selected = opt.value === value;
      select.appendChild(option);
    }
    select.addEventListener('change', () => onChange(select.value));
    section.appendChild(select);

    return section;
  }

  private async updatePreview(): Promise<void> {
    if (!this.previewContainer || this.options.nodeIds.length === 0) {
      if (this.previewContainer) {
        this.previewContainer.innerHTML = `
          <div style="text-align: center; color: var(--designlibre-text-muted, #6a6a6a);">
            No selection to export
          </div>
        `;
      }
      return;
    }

    try {
      const sceneGraph = this.runtime.getSceneGraph();
      const nodeId = this.options.nodeIds[0]!;

      if (this.selectedFormat === 'svg') {
        const exporter = createSVGExporter(sceneGraph);
        const svgOptions: SVGExportOptions = {
          padding: this.exportOptions.padding,
          includeXmlDeclaration: false,
        };
        const result = exporter.export(nodeId, svgOptions);

        this.previewContainer.innerHTML = '';
        const previewWrapper = document.createElement('div');
        previewWrapper.style.cssText = `
          max-width: 100%;
          max-height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${this.getPreviewBackground()};
          border-radius: 8px;
          padding: 20px;
        `;
        previewWrapper.innerHTML = result.svg;

        // Scale SVG to fit
        const svg = previewWrapper.querySelector('svg');
        if (svg) {
          svg.style.maxWidth = '100%';
          svg.style.maxHeight = '300px';
        }

        this.previewContainer.appendChild(previewWrapper);
      } else if (this.selectedFormat === 'png') {
        const exporter = createPNGExporter(sceneGraph);
        const pngOptions: PNGExportOptions = {
          scale: this.exportOptions.scale,
          backgroundColor: this.exportOptions.backgroundColor,
          padding: this.exportOptions.padding,
        };
        const result = await exporter.export(nodeId, pngOptions);

        this.previewContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = result.url;
        img.style.cssText = `
          max-width: 100%;
          max-height: 300px;
          border-radius: 8px;
          background: ${this.getPreviewBackground()};
        `;
        this.previewContainer.appendChild(img);
      } else {
        this.previewContainer.innerHTML = `
          <div style="text-align: center; color: var(--designlibre-text-muted, #6a6a6a);">
            PDF preview not available
          </div>
        `;
      }
    } catch (error) {
      console.error('Preview error:', error);
      if (this.previewContainer) {
        this.previewContainer.innerHTML = `
          <div style="text-align: center; color: var(--designlibre-error, #f44336);">
            Error generating preview
          </div>
        `;
      }
    }
  }

  private getPreviewBackground(): string {
    if (this.exportOptions.backgroundColor === 'transparent') {
      return 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 20px 20px';
    }
    return this.exportOptions.backgroundColor;
  }

  private async doExport(): Promise<void> {
    if (this.isExporting || this.options.nodeIds.length === 0) return;

    this.isExporting = true;

    try {
      const sceneGraph = this.runtime.getSceneGraph();
      const nodeId = this.options.nodeIds[0]!;
      const extension = this.selectedFormat;
      const fullFilename = `${this.filename}.${extension}`;

      let result: ExportResult;

      if (this.selectedFormat === 'svg') {
        const exporter = createSVGExporter(sceneGraph);
        const svgResult = exporter.export(nodeId, {
          padding: this.exportOptions.padding,
        });

        result = {
          format: 'svg',
          blob: svgResult.blob,
          url: svgResult.url,
          filename: fullFilename,
          width: svgResult.width,
          height: svgResult.height,
        };
      } else if (this.selectedFormat === 'png') {
        const exporter = createPNGExporter(sceneGraph);
        const pngResult = await exporter.export(nodeId, {
          scale: this.exportOptions.scale,
          backgroundColor: this.exportOptions.backgroundColor,
          padding: this.exportOptions.padding,
        });

        result = {
          format: 'png',
          blob: pngResult.blob,
          url: pngResult.url,
          filename: fullFilename,
          width: pngResult.width,
          height: pngResult.height,
        };
      } else {
        // PDF not implemented yet
        this.isExporting = false;
        return;
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      link.click();

      // Clean up
      URL.revokeObjectURL(result.url);

      // Notify callback
      this.options.onExport(result);

      // Close dialog
      this.close();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      this.isExporting = false;
    }
  }
}

/**
 * Show the export dialog
 */
export function showExportDialog(
  runtime: DesignLibreRuntime,
  options?: ExportDialogOptions
): ExportDialog {
  const dialog = new ExportDialog(runtime, options);
  dialog.show();
  return dialog;
}
