/**
 * Prototype Link Overlay
 *
 * Visual overlay that draws arrows between connected frames
 * in prototype mode. Shows interaction links as bezier curves.
 */

import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { Viewport } from '@renderer/core/viewport';
import type { InteractionManager } from '@prototype/interaction-manager';

/**
 * Link visual data for rendering
 */
interface LinkVisual {
  id: string;
  sourceId: NodeId;
  targetId: NodeId;
  trigger: string;
  isSelected: boolean;
}

/**
 * Prototype link overlay options
 */
export interface PrototypeLinkOverlayOptions {
  sceneGraph: SceneGraph;
  viewport: Viewport;
  interactionManager: InteractionManager;
  container: HTMLElement;
}

/**
 * Prototype Link Overlay
 */
export class PrototypeLinkOverlay {
  private sceneGraph: SceneGraph;
  private viewport: Viewport;
  private interactionManager: InteractionManager;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private resizeObserver: ResizeObserver;
  private animationFrameId: number | null = null;
  private isVisible = false;
  private selectedNodeId: NodeId | null = null;
  private hoveredLinkId: string | null = null;

  // Colors
  private readonly LINK_COLOR = '#3b82f6';
  private readonly LINK_COLOR_HOVER = '#60a5fa';
  private readonly LINK_COLOR_SELECTED = '#2563eb';
  private readonly ARROW_SIZE = 8;

  constructor(options: PrototypeLinkOverlayOptions) {
    this.sceneGraph = options.sceneGraph;
    this.viewport = options.viewport;
    this.interactionManager = options.interactionManager;
    this.container = options.container;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    `;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.container.appendChild(this.canvas);

    // Handle resize
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    this.handleResize();
  }

  /**
   * Show the overlay
   */
  show(): void {
    this.isVisible = true;
    this.canvas.style.display = 'block';
    this.startRenderLoop();
  }

  /**
   * Hide the overlay
   */
  hide(): void {
    this.isVisible = false;
    this.canvas.style.display = 'none';
    this.stopRenderLoop();
  }

  /**
   * Set selected node for highlighting its links
   */
  setSelectedNode(nodeId: NodeId | null): void {
    this.selectedNodeId = nodeId;
  }

  /**
   * Set hovered link ID
   */
  setHoveredLink(linkId: string | null): void {
    this.hoveredLinkId = linkId;
  }

  /**
   * Handle resize
   */
  private handleResize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.scale(dpr, dpr);
  }

  /**
   * Start render loop
   */
  private startRenderLoop(): void {
    if (this.animationFrameId !== null) return;

    const loop = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop render loop
   */
  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main render method
   */
  private render(): void {
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;

    // Clear
    this.ctx.clearRect(0, 0, width, height);

    if (!this.isVisible) return;

    // Get all links to render
    const links = this.getLinksToRender();

    // Render each link
    for (const link of links) {
      this.renderLink(link);
    }
  }

  /**
   * Get links to render
   */
  private getLinksToRender(): LinkVisual[] {
    const links: LinkVisual[] = [];
    const interactions = this.interactionManager.getAllInteractions();

    for (const interaction of interactions) {
      for (const action of interaction.actions) {
        let targetId: string | null = null;

        if (action.type === 'NAVIGATE') {
          targetId = action.destinationId;
        } else if (action.type === 'OPEN_OVERLAY' || action.type === 'SWAP_OVERLAY') {
          targetId = action.overlayId;
        }

        if (targetId) {
          links.push({
            id: `${interaction.id}_${action.type}`,
            sourceId: interaction.triggerNodeId as NodeId,
            targetId: targetId as NodeId,
            trigger: interaction.trigger.type,
            isSelected: this.selectedNodeId === interaction.triggerNodeId ||
                       this.selectedNodeId === targetId,
          });
        }
      }
    }

    return links;
  }

  /**
   * Render a single link
   */
  private renderLink(link: LinkVisual): void {
    // Get node bounds
    const sourceBounds = this.sceneGraph.getWorldBounds(link.sourceId);
    const targetBounds = this.sceneGraph.getWorldBounds(link.targetId);

    if (!sourceBounds || !targetBounds) return;

    // Convert to screen coordinates
    const sourceCenter = this.viewport.worldToCanvas(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    const targetCenter = this.viewport.worldToCanvas(
      targetBounds.x + targetBounds.width / 2,
      targetBounds.y + targetBounds.height / 2
    );

    // Adjust for device pixel ratio
    const dpr = window.devicePixelRatio;
    const sx = sourceCenter.x / dpr;
    const sy = sourceCenter.y / dpr;
    const tx = targetCenter.x / dpr;
    const ty = targetCenter.y / dpr;

    // Determine connection points (right side of source, left side of target)
    const sourceWidth = (sourceBounds.width * this.viewport.getZoom()) / dpr;
    const targetWidth = (targetBounds.width * this.viewport.getZoom()) / dpr;

    // Calculate edge points
    const startX = sx + sourceWidth / 2;
    const startY = sy;
    const endX = tx - targetWidth / 2;
    const endY = ty;

    // Choose color
    let color = this.LINK_COLOR;
    if (this.hoveredLinkId === link.id) {
      color = this.LINK_COLOR_HOVER;
    } else if (link.isSelected) {
      color = this.LINK_COLOR_SELECTED;
    }

    // Draw bezier curve
    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';

    // Control point offset for smooth curve
    const cpOffset = Math.min(Math.abs(endX - startX) / 2, 100);

    this.ctx.moveTo(startX, startY);
    this.ctx.bezierCurveTo(
      startX + cpOffset, startY,
      endX - cpOffset, endY,
      endX, endY
    );
    this.ctx.stroke();

    // Draw arrow at end
    this.drawArrow(endX, endY, Math.atan2(endY - (endY), endX - (endX - cpOffset)), color);

    // Draw trigger indicator at start
    this.drawTriggerIndicator(startX, startY, link.trigger, color);
  }

  /**
   * Draw arrow head
   */
  private drawArrow(x: number, y: number, angle: number, color: string): void {
    const size = this.ARROW_SIZE;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);

    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(-size, -size / 2);
    this.ctx.lineTo(-size, size / 2);
    this.ctx.closePath();

    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * Draw trigger indicator (small circle with icon)
   */
  private drawTriggerIndicator(x: number, y: number, trigger: string, color: string): void {
    const radius = 10;

    // Draw circle background
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    // Draw trigger icon
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '10px system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const icon = this.getTriggerIcon(trigger);
    this.ctx.fillText(icon, x, y);
  }

  /**
   * Get icon character for trigger type
   */
  private getTriggerIcon(trigger: string): string {
    switch (trigger) {
      case 'ON_CLICK':
      case 'ON_TAP':
        return '\u2022'; // bullet
      case 'ON_HOVER':
      case 'MOUSE_ENTER':
        return '\u2192'; // arrow
      case 'ON_DRAG':
        return '\u2194'; // double arrow
      case 'AFTER_TIMEOUT':
        return '\u23F1'; // stopwatch
      default:
        return '\u2022';
    }
  }

  /**
   * Hit test for link at position (for hover/click)
   */
  hitTest(x: number, y: number): string | null {
    const links = this.getLinksToRender();

    for (const link of links) {
      if (this.isPointNearLink(x, y, link)) {
        return link.id;
      }
    }

    return null;
  }

  /**
   * Check if point is near a link curve
   */
  private isPointNearLink(px: number, py: number, link: LinkVisual): boolean {
    const sourceBounds = this.sceneGraph.getWorldBounds(link.sourceId);
    const targetBounds = this.sceneGraph.getWorldBounds(link.targetId);

    if (!sourceBounds || !targetBounds) return false;

    const sourceCenter = this.viewport.worldToCanvas(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    const targetCenter = this.viewport.worldToCanvas(
      targetBounds.x + targetBounds.width / 2,
      targetBounds.y + targetBounds.height / 2
    );

    const dpr = window.devicePixelRatio;
    const sx = sourceCenter.x / dpr;
    const sy = sourceCenter.y / dpr;
    const tx = targetCenter.x / dpr;
    const ty = targetCenter.y / dpr;

    // Simple distance check to line segment
    const dist = this.pointToLineDistance(px, py, sx, sy, tx, ty);
    return dist < 10;
  }

  /**
   * Calculate distance from point to line segment
   */
  private pointToLineDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;

    return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.stopRenderLoop();
    this.resizeObserver.disconnect();
    this.canvas.remove();
  }
}

/**
 * Create a prototype link overlay
 */
export function createPrototypeLinkOverlay(
  options: PrototypeLinkOverlayOptions
): PrototypeLinkOverlay {
  return new PrototypeLinkOverlay(options);
}
