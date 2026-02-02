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
      this.overlay.style.opacity = '0';
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
    this.overlay.className = 'designlibre-help-overlay';
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
    this.modal.className = 'designlibre-help-modal';
    this.modal.style.cssText = `
      width: 360px;
      max-width: calc(100vw - 48px);
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 16px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
      overflow: hidden;
      text-align: center;
    `;

    // Header with close button
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: flex-end;
      padding: 12px 16px 0;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
    closeBtn.title = 'Close (Escape)';
    closeBtn.style.cssText = `
      display: flex;
      padding: 6px;
      border: none;
      background: transparent;
      color: var(--designlibre-text-secondary, #888);
      cursor: pointer;
      border-radius: 4px;
      transition: color 0.15s;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = 'var(--designlibre-text-secondary, #888)';
    });
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);
    this.modal.appendChild(header);

    // Logo container - shows one quadrant of the 2x2 grid
    const logoContainer = document.createElement('div');
    logoContainer.style.cssText = `
      width: 120px;
      height: 120px;
      margin: 8px auto 20px;
      border-radius: 16px;
      background-image: url('/images/designlibre-logos.png');
      background-size: 200% 200%;
      background-position: ${quadrant.x}% ${quadrant.y}%;
    `;
    this.modal.appendChild(logoContainer);

    // App name
    const appName = document.createElement('h1');
    appName.textContent = 'DesignLibre';
    appName.style.cssText = `
      margin: 0 0 8px;
      font-size: 42px;
      font-weight: 700;
      color: var(--designlibre-text-primary, #e4e4e4);
      letter-spacing: -0.5px;
    `;
    this.modal.appendChild(appName);

    // Version
    const version = document.createElement('div');
    version.textContent = 'Version 0.1.0';
    version.style.cssText = `
      font-size: 18px;
      color: var(--designlibre-text-muted, #6a6a6a);
      margin-bottom: 24px;
    `;
    this.modal.appendChild(version);

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = `
      height: 1px;
      background: var(--designlibre-border, #3d3d3d);
      margin: 0 24px;
    `;
    this.modal.appendChild(divider);

    // Help section
    const helpSection = document.createElement('div');
    helpSection.style.cssText = `
      padding: 24px;
    `;

    const helpTitle = document.createElement('div');
    helpTitle.textContent = 'Official Help Site';
    helpTitle.style.cssText = `
      font-size: 21px;
      font-weight: 500;
      color: var(--designlibre-text-primary, #e4e4e4);
      margin-bottom: 8px;
    `;
    helpSection.appendChild(helpTitle);

    const helpDesc = document.createElement('div');
    helpDesc.textContent = 'Documentation, tutorials, and community resources';
    helpDesc.style.cssText = `
      font-size: 20px;
      color: var(--designlibre-text-secondary, #888);
      margin-bottom: 16px;
    `;
    helpSection.appendChild(helpDesc);

    const visitBtn = document.createElement('button');
    visitBtn.textContent = 'Visit';
    visitBtn.style.cssText = `
      padding: 10px 32px;
      background: var(--designlibre-accent, #4dabff);
      border: none;
      border-radius: 8px;
      font-size: 21px;
      font-weight: 500;
      color: white;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
    `;
    visitBtn.addEventListener('mouseenter', () => {
      visitBtn.style.background = 'var(--designlibre-accent-hover, #3d9aee)';
    });
    visitBtn.addEventListener('mouseleave', () => {
      visitBtn.style.background = 'var(--designlibre-accent, #4dabff)';
    });
    visitBtn.addEventListener('mousedown', () => {
      visitBtn.style.transform = 'scale(0.98)';
    });
    visitBtn.addEventListener('mouseup', () => {
      visitBtn.style.transform = 'scale(1)';
    });
    visitBtn.addEventListener('click', () => {
      // TBD - will be replaced with actual help site URL
      window.open('https://designlibre.app.practicallyzen.com/help', '_blank');
    });
    helpSection.appendChild(visitBtn);

    this.modal.appendChild(helpSection);

    // Divider
    const divider2 = document.createElement('div');
    divider2.style.cssText = `
      height: 1px;
      background: var(--designlibre-border, #3d3d3d);
      margin: 0 24px;
    `;
    this.modal.appendChild(divider2);

    // Additional links
    const linksSection = document.createElement('div');
    linksSection.style.cssText = `
      padding: 16px 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    const links = [
      { label: 'Keyboard Shortcuts', action: () => this.openShortcuts() },
      { label: 'Report an Issue', url: 'https://github.com/designlibre-app' },
      { label: 'Join Community', url: 'https://discord.com/channels/1459794666848387156/1459794667565748388' },
    ];

    for (const link of links) {
      const linkBtn = document.createElement('button');
      linkBtn.textContent = link.label;
      linkBtn.style.cssText = `
        padding: 8px 16px;
        background: transparent;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 6px;
        font-size: 20px;
        color: var(--designlibre-text-primary, #e4e4e4);
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
      `;
      linkBtn.addEventListener('mouseenter', () => {
        linkBtn.style.background = 'var(--designlibre-bg-secondary, #2d2d2d)';
        linkBtn.style.borderColor = 'var(--designlibre-border-light, #4d4d4d)';
      });
      linkBtn.addEventListener('mouseleave', () => {
        linkBtn.style.background = 'transparent';
        linkBtn.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      });
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
    footer.style.cssText = `
      padding: 16px 24px;
      background: var(--designlibre-bg-secondary, #252525);
      font-size: 17px;
      color: var(--designlibre-text-muted, #6a6a6a);
    `;
    footer.innerHTML = 'Open-source design tool for everyone<br>Made with care';
    this.modal.appendChild(footer);

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
