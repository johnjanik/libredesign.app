/**
 * Help & Support Popup
 *
 * Displays help information with a random logo variant.
 */

// Logo quadrant positions (2x2 grid) - background-position percentages
// With background-size: 200%, 0% shows first half, 100% shows second half
const QUADRANTS = [
  { x: 0, y: 0 },       // Top-left
  { x: 100, y: 0 },     // Top-right
  { x: 0, y: 100 },     // Bottom-left
  { x: 100, y: 100 },   // Bottom-right
] as const;

/**
 * Help popup options
 */
export interface HelpPopupOptions {
  onClose?: () => void;
}

/**
 * Help & Support Popup
 */
export class HelpPopup {
  private overlay: HTMLElement | null = null;
  private modal: HTMLElement | null = null;
  private options: Required<HelpPopupOptions>;
  private quadrantIndex: number;

  constructor(options: HelpPopupOptions = {}) {
    this.options = {
      onClose: options.onClose ?? (() => {}),
    };
    // Pick a random quadrant
    this.quadrantIndex = Math.floor(Math.random() * 4);
  }

  /**
   * Show the help popup
   */
  show(): void {
    this.render();
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the popup
   */
  close(): void {
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this.handleKeyDown);

    if (this.overlay) {
      this.overlay.classList.remove('opacity-100');
      this.overlay.classList.add('opacity-0');
      setTimeout(() => {
        this.overlay?.remove();
        this.overlay = null;
        this.modal = null;
        this.options.onClose();
      }, 150);
    }
  }

  private render(): void {
    const quadrant = QUADRANTS[this.quadrantIndex]!;

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'designlibre-help-overlay fixed inset-0 bg-black/70 flex items-center justify-center z-10000 opacity-0 transition-opacity';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'designlibre-help-modal w-90 max-w-[calc(100vw-48px)] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden text-center';

    // Header with close button
    const header = document.createElement('div');
    header.className = 'flex justify-end px-4 pt-3';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
    closeBtn.title = 'Close (Escape)';
    closeBtn.className = 'flex p-1.5 border-none bg-transparent text-content-secondary cursor-pointer rounded transition-colors hover:text-content';
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);
    this.modal.appendChild(header);

    // Logo container - shows one quadrant of the 2x2 grid
    const logoContainer = document.createElement('div');
    logoContainer.className = 'w-30 h-30 mx-auto mt-2 mb-5 rounded-2xl bg-cover';
    logoContainer.style.backgroundImage = "url('/images/designlibre-logos.png')";
    logoContainer.style.backgroundSize = '200% 200%';
    logoContainer.style.backgroundPosition = `${quadrant.x}% ${quadrant.y}%`;
    this.modal.appendChild(logoContainer);

    // App name
    const appName = document.createElement('h1');
    appName.textContent = 'DesignLibre';
    appName.className = 'm-0 mb-2 text-[28px] font-bold text-content tracking-tight';
    this.modal.appendChild(appName);

    // Version
    const version = document.createElement('div');
    version.textContent = 'Version 0.1.0';
    version.className = 'text-xs text-content-muted mb-6';
    this.modal.appendChild(version);

    // Divider
    const divider = document.createElement('div');
    divider.className = 'h-px bg-border mx-6';
    this.modal.appendChild(divider);

    // Help section
    const helpSection = document.createElement('div');
    helpSection.className = 'p-6';

    const helpTitle = document.createElement('div');
    helpTitle.textContent = 'Official Help Site';
    helpTitle.className = 'text-sm font-medium text-content mb-2';
    helpSection.appendChild(helpTitle);

    const helpDesc = document.createElement('div');
    helpDesc.textContent = 'Documentation, tutorials, and community resources';
    helpDesc.className = 'text-[13px] text-content-secondary mb-4';
    helpSection.appendChild(helpDesc);

    const visitBtn = document.createElement('button');
    visitBtn.textContent = 'Visit';
    visitBtn.className = 'px-8 py-2.5 bg-accent border-none rounded-lg text-sm font-medium text-white cursor-pointer transition-all hover:bg-accent-hover active:scale-98';
    visitBtn.addEventListener('click', () => {
      window.open('https://designlibre.app/help', '_blank');
    });
    helpSection.appendChild(visitBtn);

    this.modal.appendChild(helpSection);

    // Divider
    const divider2 = document.createElement('div');
    divider2.className = 'h-px bg-border mx-6';
    this.modal.appendChild(divider2);

    // Additional links
    const linksSection = document.createElement('div');
    linksSection.className = 'px-6 pt-4 pb-6 flex flex-col gap-3';

    const links = [
      { label: 'Keyboard Shortcuts', action: () => this.openShortcuts() },
      { label: 'Report an Issue', url: 'https://github.com/designlibre/designlibre/issues' },
      { label: 'Join Community', url: 'https://discord.gg/designlibre' },
    ];

    for (const link of links) {
      const linkBtn = document.createElement('button');
      linkBtn.textContent = link.label;
      linkBtn.className = 'px-4 py-2 bg-transparent border border-border rounded-md text-[13px] text-content cursor-pointer transition-colors hover:bg-surface-secondary hover:border-border-hover';
      linkBtn.addEventListener('click', () => {
        if (link.url) {
          window.open(link.url, '_blank');
        } else if (link.action) {
          this.close();
          link.action();
        }
      });
      linksSection.appendChild(linkBtn);
    }

    this.modal.appendChild(linksSection);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'px-6 py-4 bg-surface-secondary text-[11px] text-content-muted';
    footer.innerHTML = 'Open-source design tool for everyone<br>Made with care';
    this.modal.appendChild(footer);

    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);

    // Animate in
    requestAnimationFrame(() => {
      if (this.overlay) {
        this.overlay.classList.remove('opacity-0');
        this.overlay.classList.add('opacity-100');
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

  private openShortcuts(): void {
    // Import dynamically to avoid circular dependency
    import('./shortcuts-help').then(({ showShortcutsHelp }) => {
      showShortcutsHelp();
    });
  }
}

/**
 * Show the help popup
 */
export function showHelpPopup(options?: HelpPopupOptions): HelpPopup {
  const popup = new HelpPopup(options);
  popup.show();
  return popup;
}
