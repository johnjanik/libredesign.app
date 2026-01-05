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
    this.overlay.className = 'designlibre-export-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-10000 opacity-0 transition-opacity';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'designlibre-export-modal flex w-175 max-w-[calc(100vw-64px)] h-125 max-h-[calc(100vh-64px)] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden';

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
    panel.className = 'flex-1 flex flex-col bg-surface-tertiary border-r border-border';

    // Preview header
    const header = document.createElement('div');
    header.className = 'p-4 border-b border-border font-semibold text-content';
    header.textContent = 'Preview';
    panel.appendChild(header);

    // Preview container
    this.previewContainer = document.createElement('div');
    this.previewContainer.className = 'flex-1 flex items-center justify-center p-5 overflow-hidden';
    panel.appendChild(this.previewContainer);

    return panel;
  }

  private createOptionsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'w-70 flex flex-col bg-surface';

    // Header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between p-4 border-b border-border';

    const title = document.createElement('span');
    title.textContent = 'Export';
    title.className = 'font-semibold text-base text-content';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = ICONS.close;
    closeBtn.title = 'Close';
    closeBtn.className = 'flex p-1.5 border-none bg-transparent text-content-secondary cursor-pointer rounded hover:bg-surface-secondary hover:text-content transition-colors';
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Options content
    const content = document.createElement('div');
    content.className = 'flex-1 overflow-y-auto p-4';

    // Format selector
    content.appendChild(this.createFormatSelector());

    // Filename input
    content.appendChild(this.createFilenameInput());

    // Format-specific options
    content.appendChild(this.createFormatOptions());

    panel.appendChild(content);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'p-4 border-t border-border';

    const exportBtn = document.createElement('button');
    exportBtn.innerHTML = `${ICONS.download} Export`;
    exportBtn.className = 'w-full flex items-center justify-center gap-2 py-3 px-4 bg-accent border-none rounded-md text-white text-sm font-semibold cursor-pointer hover:bg-accent-hover transition-colors';
    exportBtn.addEventListener('click', () => this.doExport());
    footer.appendChild(exportBtn);

    panel.appendChild(footer);

    return panel;
  }

  private createFormatSelector(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'mb-5';

    const label = document.createElement('div');
    label.textContent = 'Format';
    label.className = 'text-xs font-medium text-content-secondary mb-2';
    section.appendChild(label);

    const buttons = document.createElement('div');
    buttons.className = 'flex gap-2';

    const formats: ExportFormat[] = ['png', 'svg', 'pdf'];
    for (const format of formats) {
      const btn = document.createElement('button');
      btn.textContent = format.toUpperCase();
      btn.dataset['format'] = format;
      const isActive = format === this.selectedFormat;
      btn.className = `flex-1 py-2.5 border rounded-md text-xs font-semibold cursor-pointer transition-colors ${isActive ? 'border-accent bg-accent text-white' : 'border-border bg-surface-secondary text-content'}`;
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
      if (isActive) {
        btn.classList.remove('border-border', 'bg-surface-secondary', 'text-content');
        btn.classList.add('border-accent', 'bg-accent', 'text-white');
      } else {
        btn.classList.remove('border-accent', 'bg-accent', 'text-white');
        btn.classList.add('border-border', 'bg-surface-secondary', 'text-content');
      }
    });
  }

  private createFilenameInput(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'mb-5';

    const label = document.createElement('label');
    label.textContent = 'Filename';
    label.className = 'block text-xs font-medium text-content-secondary mb-2';
    section.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.filename;
    input.placeholder = 'export';
    input.className = 'w-full py-2.5 px-3 border border-border rounded-md bg-surface-secondary text-content text-sm box-border';
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
    note.className = 'p-4 bg-surface-secondary rounded-md text-content-secondary text-xs text-center';
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
    section.className = 'mb-4';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.className = 'text-xs font-medium text-content-secondary';
    header.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.textContent = format(value);
    valueEl.className = 'text-xs text-accent';
    header.appendChild(valueEl);

    section.appendChild(header);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.className = 'w-full h-1 appearance-none bg-[#444] rounded-sm cursor-pointer accent-accent';
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
    section.className = 'mb-4';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.className = 'block text-xs font-medium text-content-secondary mb-2';
    section.appendChild(labelEl);

    const select = document.createElement('select');
    select.className = 'w-full py-2.5 px-3 border border-border rounded-md bg-surface-secondary text-content text-sm';
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
        previewWrapper.className = 'max-w-full max-h-full flex items-center justify-center rounded-lg p-5';
        previewWrapper.style.background = this.getPreviewBackground();
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
        img.className = 'max-w-full max-h-75 rounded-lg';
        img.style.background = this.getPreviewBackground();
        this.previewContainer.appendChild(img);
      } else {
        this.previewContainer.innerHTML = `
          <div class="text-center text-content-muted">
            PDF preview not available
          </div>
        `;
      }
    } catch (error) {
      console.error('Preview error:', error);
      if (this.previewContainer) {
        this.previewContainer.innerHTML = `
          <div class="text-center text-red-500">
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
