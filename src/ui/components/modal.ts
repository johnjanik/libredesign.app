/**
 * Modal Component
 *
 * Base modal with focus trapping, escape close, and overlay click.
 * Used for Settings, Help, Workspace Manager, etc.
 */

/**
 * Modal options
 */
export interface ModalOptions {
  /** Modal title */
  title: string;
  /** Modal size */
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  /** Show close button */
  showCloseButton?: boolean;
  /** Close on overlay click */
  closeOnOverlay?: boolean;
  /** Close on Escape key */
  closeOnEscape?: boolean;
  /** Custom CSS class */
  className?: string;
}

/**
 * SVG icons
 */
const ICONS = {
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,
};

/**
 * Size definitions
 */
const SIZES: Record<string, { width: string; maxHeight: string }> = {
  small: { width: '400px', maxHeight: '400px' },
  medium: { width: '560px', maxHeight: '600px' },
  large: { width: '800px', maxHeight: '80vh' },
  fullscreen: { width: '100vw', maxHeight: '100vh' },
};

/**
 * Modal Component
 */
export class Modal {
  private element: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private contentContainer: HTMLElement | null = null;
  private options: Required<ModalOptions>;
  private previousActiveElement: HTMLElement | null = null;
  private onCloseCallback: (() => void) | undefined = undefined;
  private isOpen: boolean = false;

  constructor(options: ModalOptions) {
    this.options = {
      title: options.title,
      size: options.size ?? 'medium',
      showCloseButton: options.showCloseButton ?? true,
      closeOnOverlay: options.closeOnOverlay ?? true,
      closeOnEscape: options.closeOnEscape ?? true,
      className: options.className ?? '',
    };
  }

  /**
   * Open the modal
   */
  open(onClose?: () => void): void {
    if (this.isOpen) return;

    this.onCloseCallback = onClose;
    this.previousActiveElement = document.activeElement as HTMLElement;

    this.render();
    this.isOpen = true;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Focus trap
    this.element?.focus();

    // Escape key handler
    if (this.options.closeOnEscape) {
      document.addEventListener('keydown', this.handleKeyDown);
    }
  }

  /**
   * Close the modal
   */
  close(): void {
    if (!this.isOpen) return;

    this.isOpen = false;

    // Restore body scroll
    document.body.style.overflow = '';

    // Remove escape handler
    document.removeEventListener('keydown', this.handleKeyDown);

    // Remove from DOM
    if (this.overlayElement) {
      // Animate out
      this.overlayElement.style.opacity = '0';
      if (this.element) {
        this.element.style.transform = 'scale(0.95)';
        this.element.style.opacity = '0';
      }

      setTimeout(() => {
        this.overlayElement?.remove();
        this.overlayElement = null;
        this.element = null;
        this.contentContainer = null;
      }, 150);
    }

    // Restore focus
    this.previousActiveElement?.focus();

    // Callback
    this.onCloseCallback?.();
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.close();
    }

    // Focus trap
    if (e.key === 'Tab' && this.element) {
      const focusable = this.element.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };

  private render(): void {
    // Create overlay
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'designlibre-modal-overlay';
    this.overlayElement.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.15s ease;
    `;

    if (this.options.closeOnOverlay) {
      this.overlayElement.addEventListener('click', (e) => {
        if (e.target === this.overlayElement) {
          this.close();
        }
      });
    }

    // Create modal
    const size = SIZES[this.options.size] ?? SIZES['medium']!;

    this.element = document.createElement('div');
    this.element.className = `designlibre-modal ${this.options.className}`;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'modal-title');
    this.element.setAttribute('tabindex', '-1');
    this.element.style.cssText = `
      width: ${size.width};
      max-width: calc(100vw - 32px);
      max-height: ${size.maxHeight};
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: ${this.options.size === 'fullscreen' ? '0' : '12px'};
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: scale(0.95);
      opacity: 0;
      transition: transform 0.15s ease, opacity 0.15s ease;
    `;

    // Header
    const header = document.createElement('header');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      flex-shrink: 0;
    `;

    const title = document.createElement('h2');
    title.id = 'modal-title';
    title.textContent = this.options.title;
    title.style.cssText = `
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    header.appendChild(title);

    if (this.options.showCloseButton) {
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = ICONS.close;
      closeBtn.title = 'Close (Escape)';
      closeBtn.setAttribute('aria-label', 'Close modal');
      closeBtn.style.cssText = `
        display: flex;
        padding: 4px;
        border: none;
        background: transparent;
        color: var(--designlibre-text-secondary, #888);
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.15s;
      `;
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
        closeBtn.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.backgroundColor = 'transparent';
        closeBtn.style.color = 'var(--designlibre-text-secondary, #888)';
      });
      closeBtn.addEventListener('click', () => this.close());
      header.appendChild(closeBtn);
    }

    this.element.appendChild(header);

    // Content container
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'modal-content';
    this.contentContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    `;
    this.element.appendChild(this.contentContainer);

    this.overlayElement.appendChild(this.element);
    document.body.appendChild(this.overlayElement);

    // Animate in
    requestAnimationFrame(() => {
      if (this.overlayElement) {
        this.overlayElement.style.opacity = '1';
      }
      if (this.element) {
        this.element.style.transform = 'scale(1)';
        this.element.style.opacity = '1';
      }
    });
  }

  // ============================================================
  // Public API
  // ============================================================

  /**
   * Get the content container for adding custom content
   */
  getContentContainer(): HTMLElement | null {
    return this.contentContainer;
  }

  /**
   * Set the modal content (replaces existing content)
   */
  setContent(content: HTMLElement | string): void {
    if (!this.contentContainer) return;

    this.contentContainer.innerHTML = '';

    if (typeof content === 'string') {
      this.contentContainer.innerHTML = content;
    } else {
      this.contentContainer.appendChild(content);
    }
  }

  /**
   * Add a footer with action buttons
   */
  addFooter(buttons: Array<{
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
    onClick: () => void;
  }>): void {
    if (!this.element) return;

    const footer = document.createElement('footer');
    footer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 20px;
      border-top: 1px solid var(--designlibre-border, #3d3d3d);
      flex-shrink: 0;
    `;

    for (const btn of buttons) {
      const button = document.createElement('button');
      button.textContent = btn.label;

      const isPrimary = btn.variant === 'primary';
      const isDanger = btn.variant === 'danger';

      button.style.cssText = `
        padding: 8px 16px;
        border: 1px solid ${isDanger ? 'var(--designlibre-error, #ff6b6b)' : isPrimary ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-border, #3d3d3d)'};
        border-radius: 6px;
        background: ${isPrimary ? 'var(--designlibre-accent, #0d99ff)' : isDanger ? 'var(--designlibre-error, #ff6b6b)' : 'transparent'};
        color: ${isPrimary || isDanger ? 'white' : 'var(--designlibre-text-primary, #e4e4e4)'};
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      `;

      button.addEventListener('mouseenter', () => {
        if (!isPrimary && !isDanger) {
          button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
        } else {
          button.style.filter = 'brightness(1.1)';
        }
      });

      button.addEventListener('mouseleave', () => {
        if (!isPrimary && !isDanger) {
          button.style.backgroundColor = 'transparent';
        } else {
          button.style.filter = '';
        }
      });

      button.addEventListener('click', btn.onClick);
      footer.appendChild(button);
    }

    this.element.appendChild(footer);
  }

  /**
   * Update the title
   */
  setTitle(title: string): void {
    const titleEl = this.element?.querySelector('#modal-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * Check if modal is open
   */
  isModalOpen(): boolean {
    return this.isOpen;
  }
}

/**
 * Create and open a modal
 */
export function openModal(
  options: ModalOptions,
  onClose?: () => void
): Modal {
  const modal = new Modal(options);
  modal.open(onClose);
  return modal;
}

/**
 * Create a confirmation dialog
 */
export function confirm(
  message: string,
  options?: {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }
): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = new Modal({
      title: options?.title ?? 'Confirm',
      size: 'small',
    });

    modal.open(() => resolve(false));

    const content = document.createElement('p');
    content.textContent = message;
    content.style.cssText = `
      margin: 0;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 14px;
      line-height: 1.5;
    `;
    modal.setContent(content);

    modal.addFooter([
      {
        label: options?.cancelLabel ?? 'Cancel',
        variant: 'secondary',
        onClick: () => {
          modal.close();
          resolve(false);
        },
      },
      {
        label: options?.confirmLabel ?? 'Confirm',
        variant: 'primary',
        onClick: () => {
          modal.close();
          resolve(true);
        },
      },
    ]);
  });
}

/**
 * Create an alert dialog
 */
export function alert(
  message: string,
  options?: { title?: string }
): Promise<void> {
  return new Promise((resolve) => {
    const modal = new Modal({
      title: options?.title ?? 'Alert',
      size: 'small',
    });

    modal.open(() => resolve());

    const content = document.createElement('p');
    content.textContent = message;
    content.style.cssText = `
      margin: 0;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 14px;
      line-height: 1.5;
    `;
    modal.setContent(content);

    modal.addFooter([
      {
        label: 'OK',
        variant: 'primary',
        onClick: () => {
          modal.close();
          resolve();
        },
      },
    ]);
  });
}
