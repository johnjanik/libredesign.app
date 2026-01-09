/**
 * Rulers Component
 *
 * Horizontal and vertical rulers showing pixel measurements along canvas edges.
 * Updates automatically on pan/zoom.
 */

import type { Viewport } from '@renderer/core/viewport';

const RULER_SIZE = 20; // pixels
const TICK_COLOR = '#888';
const LABEL_COLOR = '#aaa';
const BACKGROUND_COLOR = '#1e1e1e';
const BORDER_COLOR = '#333';

/**
 * Calculate adaptive tick spacing based on zoom level
 */
function calculateTickSpacing(zoom: number): { minor: number; labelEvery: number } {
  if (zoom >= 8) return { minor: 1, labelEvery: 10 };
  if (zoom >= 4) return { minor: 2, labelEvery: 5 };
  if (zoom >= 2) return { minor: 5, labelEvery: 2 };
  if (zoom >= 1) return { minor: 10, labelEvery: 1 };
  if (zoom >= 0.5) return { minor: 20, labelEvery: 1 };
  if (zoom >= 0.25) return { minor: 50, labelEvery: 1 };
  return { minor: 100, labelEvery: 1 };
}

export interface RulersOptions {
  viewport: Viewport;
  container: HTMLElement;
}

export class Rulers {
  private viewport: Viewport;
  private container: HTMLElement;

  private cornerBox: HTMLElement;
  private horizontalRuler: HTMLCanvasElement;
  private verticalRuler: HTMLCanvasElement;
  private hCtx: CanvasRenderingContext2D;
  private vCtx: CanvasRenderingContext2D;

  private visible: boolean = true;
  private disposed: boolean = false;
  private unsubscribeViewport: (() => void) | null = null;

  constructor(options: RulersOptions) {
    this.viewport = options.viewport;
    this.container = options.container;

    // Create corner box
    this.cornerBox = document.createElement('div');
    this.cornerBox.className = 'designlibre-rulers-corner';
    this.cornerBox.textContent = 'px';

    // Create horizontal ruler canvas
    this.horizontalRuler = document.createElement('canvas');
    this.horizontalRuler.className = 'designlibre-ruler-horizontal';

    // Create vertical ruler canvas
    this.verticalRuler = document.createElement('canvas');
    this.verticalRuler.className = 'designlibre-ruler-vertical';

    // Get contexts
    this.hCtx = this.horizontalRuler.getContext('2d')!;
    this.vCtx = this.verticalRuler.getContext('2d')!;

    // Add to container
    this.container.appendChild(this.cornerBox);
    this.container.appendChild(this.horizontalRuler);
    this.container.appendChild(this.verticalRuler);

    // Listen for viewport changes
    this.unsubscribeViewport = this.viewport.on('changed', this.handleViewportChange);

    // Listen for resize
    window.addEventListener('resize', this.handleResize);

    // Initial render
    this.updateSize();
    this.render();
  }

  private handleViewportChange = (): void => {
    if (!this.disposed && this.visible) {
      this.render();
    }
  };

  private handleResize = (): void => {
    if (!this.disposed && this.visible) {
      this.updateSize();
      this.render();
    }
  };

  /**
   * Update canvas sizes to match container
   */
  private updateSize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Horizontal ruler
    const hWidth = rect.width - RULER_SIZE;
    const hHeight = RULER_SIZE;
    this.horizontalRuler.width = hWidth * dpr;
    this.horizontalRuler.height = hHeight * dpr;
    this.horizontalRuler.style.width = `${hWidth}px`;
    this.horizontalRuler.style.height = `${hHeight}px`;

    // Vertical ruler
    const vWidth = RULER_SIZE;
    const vHeight = rect.height - RULER_SIZE;
    this.verticalRuler.width = vWidth * dpr;
    this.verticalRuler.height = vHeight * dpr;
    this.verticalRuler.style.width = `${vWidth}px`;
    this.verticalRuler.style.height = `${vHeight}px`;
  }

  /**
   * Render both rulers
   */
  render(): void {
    if (!this.visible) return;

    const dpr = window.devicePixelRatio || 1;
    const zoom = this.viewport.getZoom();
    const offset = this.viewport.getOffset();
    const { minor, labelEvery } = calculateTickSpacing(zoom);

    this.renderHorizontalRuler(dpr, zoom, offset.x, minor, labelEvery);
    this.renderVerticalRuler(dpr, zoom, offset.y, minor, labelEvery);
  }

  private renderHorizontalRuler(
    dpr: number,
    zoom: number,
    offsetX: number,
    minor: number,
    labelEvery: number
  ): void {
    const ctx = this.hCtx;
    const width = this.horizontalRuler.width;
    const height = this.horizontalRuler.height;

    // Clear and fill background
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, width, height);

    // Draw border
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.moveTo(0, height - 0.5 * dpr);
    ctx.lineTo(width, height - 0.5 * dpr);
    ctx.stroke();

    // Scale for DPR
    ctx.scale(dpr, dpr);

    const cssWidth = width / dpr;

    // Calculate visible world range
    // Canvas position 0 in ruler corresponds to canvas position RULER_SIZE in the main canvas
    // So world position at ruler 0 = (RULER_SIZE - offsetX) / zoom
    const worldStart = (RULER_SIZE - offsetX) / zoom;
    const worldEnd = (RULER_SIZE + cssWidth - offsetX) / zoom;

    // Round to nearest tick
    const firstTick = Math.floor(worldStart / minor) * minor;

    // Draw ticks
    ctx.strokeStyle = TICK_COLOR;
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 1;

    for (let worldX = firstTick; worldX <= worldEnd; worldX += minor) {
      // Convert world to ruler canvas position
      const rulerX = (worldX * zoom + offsetX) - RULER_SIZE;

      if (rulerX < 0 || rulerX > cssWidth) continue;

      // Determine tick size
      const tickIndex = Math.round(worldX / minor);
      const isMajor = tickIndex % (labelEvery * 10) === 0;
      const isLabel = tickIndex % labelEvery === 0;

      let tickHeight: number;
      if (isMajor) {
        tickHeight = RULER_SIZE;
      } else if (isLabel) {
        tickHeight = RULER_SIZE * 0.6;
      } else {
        tickHeight = RULER_SIZE * 0.3;
      }

      // Draw tick
      ctx.beginPath();
      ctx.moveTo(rulerX, RULER_SIZE);
      ctx.lineTo(rulerX, RULER_SIZE - tickHeight);
      ctx.stroke();

      // Draw label at major ticks
      if (isMajor) {
        ctx.fillText(String(Math.round(worldX)), rulerX, 10);
      }
    }
  }

  private renderVerticalRuler(
    dpr: number,
    zoom: number,
    offsetY: number,
    minor: number,
    labelEvery: number
  ): void {
    const ctx = this.vCtx;
    const width = this.verticalRuler.width;
    const height = this.verticalRuler.height;

    // Clear and fill background
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, width, height);

    // Draw border
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.moveTo(width - 0.5 * dpr, 0);
    ctx.lineTo(width - 0.5 * dpr, height);
    ctx.stroke();

    // Scale for DPR
    ctx.scale(dpr, dpr);

    const cssHeight = height / dpr;
    const cssWidth = width / dpr;

    // Calculate visible world range
    const worldStart = (RULER_SIZE - offsetY) / zoom;
    const worldEnd = (RULER_SIZE + cssHeight - offsetY) / zoom;

    // Round to nearest tick
    const firstTick = Math.floor(worldStart / minor) * minor;

    // Draw ticks
    ctx.strokeStyle = TICK_COLOR;
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.lineWidth = 1;

    for (let worldY = firstTick; worldY <= worldEnd; worldY += minor) {
      // Convert world to ruler canvas position
      const rulerY = (worldY * zoom + offsetY) - RULER_SIZE;

      if (rulerY < 0 || rulerY > cssHeight) continue;

      // Determine tick size
      const tickIndex = Math.round(worldY / minor);
      const isMajor = tickIndex % (labelEvery * 10) === 0;
      const isLabel = tickIndex % labelEvery === 0;

      let tickWidth: number;
      if (isMajor) {
        tickWidth = cssWidth;
      } else if (isLabel) {
        tickWidth = cssWidth * 0.6;
      } else {
        tickWidth = cssWidth * 0.3;
      }

      // Draw tick
      ctx.beginPath();
      ctx.moveTo(cssWidth, rulerY);
      ctx.lineTo(cssWidth - tickWidth, rulerY);
      ctx.stroke();

      // Draw label at major ticks (rotated)
      if (isMajor) {
        ctx.save();
        ctx.translate(10, rulerY);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(String(Math.round(worldY)), 0, 0);
        ctx.restore();
      }
    }
  }

  /**
   * Show rulers
   */
  show(): void {
    this.visible = true;
    this.cornerBox.style.display = '';
    this.horizontalRuler.style.display = '';
    this.verticalRuler.style.display = '';
    this.container.classList.add('with-rulers');
    this.updateSize();
    this.render();
  }

  /**
   * Hide rulers
   */
  hide(): void {
    this.visible = false;
    this.cornerBox.style.display = 'none';
    this.horizontalRuler.style.display = 'none';
    this.verticalRuler.style.display = 'none';
    this.container.classList.remove('with-rulers');
  }

  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    if (visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Check if rulers are visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Clean up
   */
  dispose(): void {
    this.disposed = true;
    this.unsubscribeViewport?.();
    window.removeEventListener('resize', this.handleResize);
    this.cornerBox.remove();
    this.horizontalRuler.remove();
    this.verticalRuler.remove();
  }
}
