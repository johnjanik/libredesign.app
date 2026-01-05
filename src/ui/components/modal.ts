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
      // Animate out via classes
      this.overlayElement.classList.remove('opacity-100');
      this.overlayElement.classList.add('opacity-0');
      if (this.element) {
        this.element.classList.remove('scale-100', 'opacity-100');
        this.element.classList.add('scale-95', 'opacity-0');
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
    this.overlayElement.className = 'designlibre-modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-10000 opacity-0 transition-opacity';

    if (this.options.closeOnOverlay) {
      this.overlayElement.addEventListener('click', (e) => {
        if (e.target === this.overlayElement) {
          this.close();
        }
      });
    }

    // Create modal
    const size = SIZES[this.options.size] ?? SIZES['medium']!;
    const isFullscreen = this.options.size === 'fullscreen';

    this.element = document.createElement('div');
    this.element.className = `designlibre-modal ${this.options.className} max-w-[calc(100vw-32px)] bg-surface border border-border ${isFullscreen ? 'rounded-none' : 'rounded-xl'} shadow-2xl flex flex-col overflow-hidden scale-95 opacity-0 transition-all`;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'modal-title');
    this.element.setAttribute('tabindex', '-1');
    this.element.style.width = size.width;
    this.element.style.maxHeight = size.maxHeight;

    // Header
    const header = document.createElement('header');
    header.className = 'flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0';

    const title = document.createElement('h2');
    title.id = 'modal-title';
    title.textContent = this.options.title;
    title.className = 'm-0 text-base font-semibold text-content';
    header.appendChild(title);

    if (this.options.showCloseButton) {
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = ICONS.close;
      closeBtn.title = 'Close (Escape)';
      closeBtn.setAttribute('aria-label', 'Close modal');
      closeBtn.className = 'flex p-1 border-none bg-transparent text-content-secondary cursor-pointer rounded transition-all hover:bg-surface-secondary hover:text-content';
      closeBtn.addEventListener('click', () => this.close());
      header.appendChild(closeBtn);
    }

    this.element.appendChild(header);

    // Content container
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'modal-content flex-1 overflow-y-auto p-5';
    this.element.appendChild(this.contentContainer);

    this.overlayElement.appendChild(this.element);
    document.body.appendChild(this.overlayElement);

    // Animate in
    requestAnimationFrame(() => {
      if (this.overlayElement) {
        this.overlayElement.classList.remove('opacity-0');
        this.overlayElement.classList.add('opacity-100');
      }
      if (this.element) {
        this.element.classList.remove('scale-95', 'opacity-0');
        this.element.classList.add('scale-100', 'opacity-100');
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
    footer.className = 'flex justify-end gap-2 px-5 py-4 border-t border-border flex-shrink-0';

    for (const btn of buttons) {
      const button = document.createElement('button');
      button.textContent = btn.label;

      const isPrimary = btn.variant === 'primary';
      const isDanger = btn.variant === 'danger';

      if (isPrimary) {
        button.className = 'px-4 py-2 border border-accent rounded-md bg-accent text-white text-[13px] font-medium cursor-pointer transition-all hover:brightness-110';
      } else if (isDanger) {
        button.className = 'px-4 py-2 border border-red-500 rounded-md bg-red-500 text-white text-[13px] font-medium cursor-pointer transition-all hover:brightness-110';
      } else {
        button.className = 'px-4 py-2 border border-border rounded-md bg-transparent text-content text-[13px] font-medium cursor-pointer transition-all hover:bg-surface-secondary';
      }

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
    content.className = 'm-0 text-content text-sm leading-normal';
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
    content.className = 'm-0 text-content text-sm leading-normal';
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
