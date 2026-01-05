/**
 * AI Cursor Overlay
 *
 * Visual overlay showing the AI's cursor position and actions.
 */

import type { AIController } from '../ai-controller';
import type { AIStatus } from '../ai-controller';

/**
 * AI Cursor options
 */
export interface AICursorOverlayOptions {
  /** Cursor color */
  color?: string | undefined;
  /** Cursor size */
  size?: number | undefined;
  /** Show trail while moving */
  showTrail?: boolean | undefined;
  /** Animation duration in ms */
  animationDuration?: number | undefined;
}

/**
 * Required options (internal)
 */
interface RequiredAICursorOverlayOptions {
  color: string;
  size: number;
  showTrail: boolean;
  animationDuration: number;
}

/**
 * Trail point
 */
interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * AI Cursor Overlay
 */
export class AICursorOverlay {
  private aiController: AIController;
  private canvas: HTMLCanvasElement;
  private options: RequiredAICursorOverlayOptions;
  private overlay: HTMLElement | null = null;
  private cursorElement: HTMLElement | null = null;
  private labelElement: HTMLElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private currentX = 0;
  private currentY = 0;
  private targetX = 0;
  private targetY = 0;
  private visible = false;
  private status: AIStatus = 'idle';
  private trail: TrailPoint[] = [];
  private animationFrame: number | null = null;
  private unsubscribers: Array<() => void> = [];

  constructor(
    aiController: AIController,
    canvas: HTMLCanvasElement,
    options: AICursorOverlayOptions = {}
  ) {
    this.aiController = aiController;
    this.canvas = canvas;
    this.options = {
      color: options.color ?? '#a855f7',
      size: options.size ?? 24,
      showTrail: options.showTrail ?? true,
      animationDuration: options.animationDuration ?? 200,
    };

    this.setup();
  }

  private setup(): void {
    this.createOverlay();
    this.subscribeToEvents();
    this.startAnimationLoop();
  }

  private createOverlay(): void {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'designlibre-ai-cursor-overlay';
    this.overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      overflow: hidden;
    `;

    // Create trail canvas (for drawing movement trail)
    if (this.options.showTrail) {
      const trailCanvas = document.createElement('canvas');
      trailCanvas.className = 'ai-cursor-trail';
      trailCanvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      `;
      this.overlay.appendChild(trailCanvas);
      this.ctx = trailCanvas.getContext('2d');
      this.resizeTrailCanvas(trailCanvas);
    }

    // Create cursor element
    this.cursorElement = document.createElement('div');
    this.cursorElement.className = 'ai-cursor';
    this.cursorElement.style.cssText = `
      position: absolute;
      width: ${this.options.size}px;
      height: ${this.options.size}px;
      pointer-events: none;
      transform: translate(-50%, -50%);
      transition: opacity 0.2s;
      opacity: 0;
    `;

    // Inner cursor design
    this.cursorElement.innerHTML = `
      <svg width="${this.options.size}" height="${this.options.size}" viewBox="0 0 24 24" fill="none">
        <!-- Outer ring -->
        <circle cx="12" cy="12" r="10" stroke="${this.options.color}" stroke-width="2" fill="none" class="ai-cursor-ring"/>
        <!-- Inner dot -->
        <circle cx="12" cy="12" r="4" fill="${this.options.color}" class="ai-cursor-dot"/>
        <!-- Pulse effect (animated) -->
        <circle cx="12" cy="12" r="10" stroke="${this.options.color}" stroke-width="1" fill="none" class="ai-cursor-pulse" opacity="0"/>
      </svg>
      <style>
        @keyframes ai-cursor-pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        .ai-cursor-pulse.active {
          animation: ai-cursor-pulse 1s ease-out infinite;
        }
        @keyframes ai-cursor-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .ai-cursor.thinking .ai-cursor-ring {
          stroke-dasharray: 20 10;
          animation: ai-cursor-spin 1s linear infinite;
        }
        .ai-cursor.executing .ai-cursor-dot {
          animation: ai-cursor-pulse 0.5s ease-out infinite;
        }
      </style>
    `;
    this.overlay.appendChild(this.cursorElement);

    // Create label element (shows action being performed)
    this.labelElement = document.createElement('div');
    this.labelElement.className = 'ai-cursor-label';
    this.labelElement.style.cssText = `
      position: absolute;
      padding: 4px 8px;
      background: ${this.options.color};
      color: white;
      font-size: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-weight: 500;
      border-radius: 4px;
      pointer-events: none;
      transform: translate(-50%, 8px);
      opacity: 0;
      transition: opacity 0.2s;
      white-space: nowrap;
    `;
    this.overlay.appendChild(this.labelElement);

    // Add to canvas parent
    const parent = this.canvas.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(this.overlay);
    }

    // Handle resize
    window.addEventListener('resize', this.handleResize);
  }

  private resizeTrailCanvas(canvas: HTMLCanvasElement): void {
    const rect = this.canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
  }

  private handleResize = (): void => {
    const trailCanvas = this.overlay?.querySelector('.ai-cursor-trail') as HTMLCanvasElement;
    if (trailCanvas) {
      this.resizeTrailCanvas(trailCanvas);
    }
  };

  private subscribeToEvents(): void {
    // Subscribe to cursor move events
    const unsubCursor = this.aiController.on('ai:cursor:move', ({ x, y }) => {
      this.moveTo(x, y);
    });
    this.unsubscribers.push(unsubCursor);

    // Subscribe to status changes
    const unsubStatus = this.aiController.on('ai:status:change', ({ status }) => {
      this.setStatus(status);
    });
    this.unsubscribers.push(unsubStatus);

    // Subscribe to tool execution
    const unsubToolStart = this.aiController.on('ai:tool:start', ({ toolCall }) => {
      this.showLabel(toolCall.name);
    });
    this.unsubscribers.push(unsubToolStart);

    const unsubToolComplete = this.aiController.on('ai:tool:complete', () => {
      this.hideLabel();
    });
    this.unsubscribers.push(unsubToolComplete);
  }

  private startAnimationLoop(): void {
    const animate = (): void => {
      this.update();
      this.animationFrame = requestAnimationFrame(animate);
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  private update(): void {
    // Smooth interpolation toward target
    const ease = 0.15;
    this.currentX += (this.targetX - this.currentX) * ease;
    this.currentY += (this.targetY - this.currentY) * ease;

    // Update cursor position
    if (this.cursorElement) {
      this.cursorElement.style.left = `${this.currentX}px`;
      this.cursorElement.style.top = `${this.currentY}px`;
    }

    // Update label position
    if (this.labelElement) {
      this.labelElement.style.left = `${this.currentX}px`;
      this.labelElement.style.top = `${this.currentY + this.options.size / 2}px`;
    }

    // Update trail
    if (this.options.showTrail && this.visible) {
      const now = Date.now();

      // Add current position to trail
      if (Math.abs(this.currentX - this.targetX) > 1 || Math.abs(this.currentY - this.targetY) > 1) {
        this.trail.push({ x: this.currentX, y: this.currentY, timestamp: now });
      }

      // Remove old trail points (older than 500ms)
      const maxAge = 500;
      this.trail = this.trail.filter(p => now - p.timestamp < maxAge);

      // Draw trail
      this.drawTrail();
    }
  }

  private drawTrail(): void {
    if (!this.ctx || this.trail.length < 2) return;

    const trailCanvas = this.overlay?.querySelector('.ai-cursor-trail') as HTMLCanvasElement;
    if (!trailCanvas) return;

    const firstPoint = this.trail[0];
    if (!firstPoint) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, trailCanvas.width / window.devicePixelRatio, trailCanvas.height / window.devicePixelRatio);

    // Draw trail path
    this.ctx.beginPath();
    this.ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < this.trail.length; i++) {
      const point = this.trail[i];
      if (point) {
        this.ctx.lineTo(point.x, point.y);
      }
    }

    // Draw current position
    this.ctx.lineTo(this.currentX, this.currentY);

    // Style
    this.ctx.strokeStyle = this.options.color;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Create gradient along trail
    const gradient = this.ctx.createLinearGradient(
      firstPoint.x, firstPoint.y,
      this.currentX, this.currentY
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, this.options.color);
    this.ctx.strokeStyle = gradient;

    this.ctx.stroke();
  }

  /**
   * Move cursor to position (canvas coordinates).
   */
  moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;

    if (!this.visible) {
      this.show();
    }
  }

  /**
   * Show the cursor.
   */
  show(): void {
    this.visible = true;
    if (this.cursorElement) {
      this.cursorElement.style.opacity = '1';
    }
  }

  /**
   * Hide the cursor.
   */
  hide(): void {
    this.visible = false;
    if (this.cursorElement) {
      this.cursorElement.style.opacity = '0';
    }
    this.hideLabel();
    this.trail = [];
    if (this.ctx) {
      const trailCanvas = this.overlay?.querySelector('.ai-cursor-trail') as HTMLCanvasElement;
      if (trailCanvas) {
        this.ctx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
      }
    }
  }

  /**
   * Set AI status (affects cursor appearance).
   */
  setStatus(status: AIStatus): void {
    this.status = status;

    if (!this.cursorElement) return;

    // Update cursor class
    this.cursorElement.classList.remove('idle', 'thinking', 'executing', 'error');
    this.cursorElement.classList.add(status);

    // Update pulse animation
    const pulseElement = this.cursorElement.querySelector('.ai-cursor-pulse');
    if (pulseElement) {
      if (status === 'thinking' || status === 'executing') {
        pulseElement.classList.add('active');
      } else {
        pulseElement.classList.remove('active');
      }
    }

    // Auto-hide when idle
    if (status === 'idle') {
      setTimeout(() => {
        if (this.status === 'idle') {
          this.hide();
        }
      }, 2000);
    }
  }

  /**
   * Show label with action name.
   */
  showLabel(text: string): void {
    if (!this.labelElement) return;

    // Format action name
    const formattedText = text
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());

    this.labelElement.textContent = formattedText;
    this.labelElement.style.opacity = '1';
  }

  /**
   * Hide the label.
   */
  hideLabel(): void {
    if (this.labelElement) {
      this.labelElement.style.opacity = '0';
    }
  }

  /**
   * Get current cursor position.
   */
  getPosition(): { x: number; y: number } {
    return { x: this.currentX, y: this.currentY };
  }

  /**
   * Check if cursor is visible.
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Dispose of the overlay.
   */
  dispose(): void {
    // Stop animation
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }

    // Unsubscribe
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);

    // Remove DOM elements
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.cursorElement = null;
    this.labelElement = null;
    this.ctx = null;
  }
}

/**
 * Create an AI cursor overlay.
 */
export function createAICursorOverlay(
  aiController: AIController,
  canvas: HTMLCanvasElement,
  options?: AICursorOverlayOptions
): AICursorOverlay {
  return new AICursorOverlay(aiController, canvas, options);
}
