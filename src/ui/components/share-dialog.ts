/**
 * Share Dialog Component
 *
 * Modal dialog for creating and managing share links.
 * Features:
 * - Create new share links with various options
 * - View and manage existing links
 * - Copy link to clipboard
 * - Set password, expiration, domain restrictions
 */

import { Modal } from './modal';
import type {
  ShareLinkManager,
  ShareLink,
  ShareLinkOptions,
} from '../../collaboration/sharing/share-link-manager';
import type { CollaborationRole, DocumentId } from '../../collaboration/types';

// =============================================================================
// Types
// =============================================================================

export interface ShareDialogOptions {
  /** Document ID to share */
  readonly documentId: DocumentId;
  /** Share link manager instance */
  readonly shareManager: ShareLinkManager;
  /** Current user ID */
  readonly userId: string;
  /** Base URL for share links */
  readonly baseUrl: string;
  /** Available roles for sharing */
  readonly availableRoles?: readonly CollaborationRole[];
  /** Callback when a link is created */
  readonly onLinkCreated?: (link: ShareLink) => void;
  /** Callback when a link is revoked */
  readonly onLinkRevoked?: (linkId: string) => void;
}

// =============================================================================
// Icons
// =============================================================================

const ICONS = {
  link: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>`,
  copy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>`,
  lock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`,
  globe: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>`,
  clock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,
};

// =============================================================================
// Share Dialog
// =============================================================================

export class ShareDialog {
  private modal: Modal | null = null;
  private options: ShareDialogOptions;
  private currentView: 'list' | 'create' = 'list';
  private existingLinks: ShareLink[] = [];

  constructor(options: ShareDialogOptions) {
    this.options = {
      ...options,
      availableRoles: options.availableRoles ?? ['editor', 'commenter', 'viewer'],
    };
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Open the share dialog
   */
  open(): void {
    this.loadExistingLinks();

    this.modal = new Modal({
      title: 'Share Document',
      size: 'medium',
    });

    this.modal.open(() => {
      this.modal = null;
    });

    this.renderContent();
  }

  /**
   * Close the share dialog
   */
  close(): void {
    this.modal?.close();
    this.modal = null;
  }

  // ===========================================================================
  // Private Methods - Rendering
  // ===========================================================================

  private loadExistingLinks(): void {
    this.existingLinks = this.options.shareManager.getActiveLinksForDocument(
      this.options.documentId
    );
  }

  private renderContent(): void {
    if (this.currentView === 'create') {
      this.renderCreateView();
    } else {
      this.renderListView();
    }
  }

  private renderListView(): void {
    const container = this.modal?.getContentContainer();
    if (!container) return;

    container.innerHTML = '';

    // Create link button
    const createBtn = this.createButton('Create Share Link', 'primary', () => {
      this.currentView = 'create';
      this.renderContent();
    });
    createBtn.style.marginBottom = '20px';
    createBtn.innerHTML = `${ICONS.plus} Create Share Link`;
    createBtn.style.display = 'flex';
    createBtn.style.alignItems = 'center';
    createBtn.style.gap = '8px';
    container.appendChild(createBtn);

    // Existing links
    if (this.existingLinks.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.cssText = `
        text-align: center;
        padding: 40px 20px;
        color: var(--designlibre-text-secondary, #888);
      `;
      emptyState.innerHTML = `
        <div style="margin-bottom: 12px;">${ICONS.link}</div>
        <p style="margin: 0;">No share links yet</p>
        <p style="margin: 8px 0 0; font-size: 12px;">Create a link to share this document with others</p>
      `;
      container.appendChild(emptyState);
    } else {
      const linksContainer = document.createElement('div');
      linksContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 12px;
      `;

      for (const link of this.existingLinks) {
        linksContainer.appendChild(this.renderLinkCard(link));
      }

      container.appendChild(linksContainer);
    }
  }

  private renderLinkCard(link: ShareLink): HTMLElement {
    const card = document.createElement('div');
    card.style.cssText = `
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      padding: 16px;
    `;

    // Header row
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-weight: 500;
    `;
    title.innerHTML = `${ICONS.link} ${link.name ?? 'Share Link'}`;
    header.appendChild(title);

    const roleBadge = document.createElement('span');
    roleBadge.textContent = this.formatRole(link.role);
    roleBadge.style.cssText = `
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: var(--designlibre-accent-subtle, rgba(13, 153, 255, 0.1));
      color: var(--designlibre-accent, #0d99ff);
    `;
    header.appendChild(roleBadge);

    card.appendChild(header);

    // Details
    const details = document.createElement('div');
    details.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 12px;
      color: var(--designlibre-text-secondary, #888);
      margin-bottom: 12px;
    `;

    if (link.passwordProtected) {
      const pwdBadge = document.createElement('span');
      pwdBadge.innerHTML = `${ICONS.lock} Password protected`;
      pwdBadge.style.cssText = 'display: flex; align-items: center; gap: 4px;';
      details.appendChild(pwdBadge);
    }

    if (link.allowedDomains.length > 0) {
      const domainBadge = document.createElement('span');
      domainBadge.innerHTML = `${ICONS.globe} ${link.allowedDomains.join(', ')}`;
      domainBadge.style.cssText = 'display: flex; align-items: center; gap: 4px;';
      details.appendChild(domainBadge);
    }

    if (link.expiresAt) {
      const expBadge = document.createElement('span');
      const expiresDate = new Date(link.expiresAt).toLocaleDateString();
      expBadge.innerHTML = `${ICONS.clock} Expires ${expiresDate}`;
      expBadge.style.cssText = 'display: flex; align-items: center; gap: 4px;';
      details.appendChild(expBadge);
    }

    if (link.maxUses !== undefined) {
      const usesBadge = document.createElement('span');
      usesBadge.textContent = `${link.useCount}/${link.maxUses} uses`;
      details.appendChild(usesBadge);
    }

    card.appendChild(details);

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    const copyBtn = this.createButton('Copy Link', 'secondary', async () => {
      const url = this.options.shareManager.generateShareUrl(link, this.options.baseUrl);
      await navigator.clipboard.writeText(url);
      copyBtn.innerHTML = `${ICONS.check} Copied!`;
      setTimeout(() => {
        copyBtn.innerHTML = `${ICONS.copy} Copy Link`;
      }, 2000);
    });
    copyBtn.innerHTML = `${ICONS.copy} Copy Link`;
    copyBtn.style.cssText += 'display: flex; align-items: center; gap: 4px; font-size: 12px;';
    actions.appendChild(copyBtn);

    const revokeBtn = this.createButton('Revoke', 'danger', () => {
      this.options.shareManager.revokeLink(link.id);
      this.options.onLinkRevoked?.(link.id);
      this.loadExistingLinks();
      this.renderContent();
    });
    revokeBtn.innerHTML = `${ICONS.trash} Revoke`;
    revokeBtn.style.cssText += 'display: flex; align-items: center; gap: 4px; font-size: 12px;';
    actions.appendChild(revokeBtn);

    card.appendChild(actions);

    return card;
  }

  private renderCreateView(): void {
    const container = this.modal?.getContentContainer();
    if (!container) return;

    container.innerHTML = '';

    // Back button
    const backBtn = document.createElement('button');
    backBtn.textContent = '< Back to Links';
    backBtn.style.cssText = `
      background: none;
      border: none;
      color: var(--designlibre-accent, #0d99ff);
      cursor: pointer;
      font-size: 13px;
      padding: 0;
      margin-bottom: 20px;
    `;
    backBtn.addEventListener('click', () => {
      this.currentView = 'list';
      this.renderContent();
    });
    container.appendChild(backBtn);

    // Form
    const form = document.createElement('div');
    form.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 20px;
    `;

    // Link name
    const nameGroup = this.createInputGroup('Link Name (optional)', 'text', 'link-name');
    const nameInput = nameGroup.querySelector('input') as HTMLInputElement;
    nameInput.placeholder = 'e.g., "Review Team" or "Client Preview"';
    form.appendChild(nameGroup);

    // Role selector
    const roleGroup = this.createSelectGroup('Access Level', 'role', [
      { value: 'editor', label: 'Can Edit - Full editing access' },
      { value: 'commenter', label: 'Can Comment - View and comment only' },
      { value: 'viewer', label: 'Can View - View only' },
      { value: 'developer', label: 'Developer - Inspect and export code' },
    ]);
    form.appendChild(roleGroup);

    // Password protection
    const passwordToggle = this.createToggle('Require password', 'password-toggle');
    const passwordInput = this.createInputGroup('Password', 'password', 'password');
    const pwdInputEl = passwordInput.querySelector('input') as HTMLInputElement;
    pwdInputEl.placeholder = 'Enter a secure password';
    passwordInput.style.display = 'none';

    const passwordContainer = document.createElement('div');
    passwordContainer.appendChild(passwordToggle);
    passwordContainer.appendChild(passwordInput);

    const pwdToggleEl = passwordToggle.querySelector('input') as HTMLInputElement;
    pwdToggleEl.addEventListener('change', () => {
      passwordInput.style.display = pwdToggleEl.checked ? 'block' : 'none';
    });
    form.appendChild(passwordContainer);

    // Domain restrictions
    const domainGroup = this.createInputGroup('Allowed Domains (optional)', 'text', 'domains');
    const domainInput = domainGroup.querySelector('input') as HTMLInputElement;
    domainInput.placeholder = 'company.com, partner.org (comma-separated)';
    form.appendChild(domainGroup);

    // Expiration
    const expirationGroup = this.createSelectGroup('Expiration', 'expiration', [
      { value: 'never', label: 'Never expires' },
      { value: '1d', label: '1 day' },
      { value: '7d', label: '7 days' },
      { value: '30d', label: '30 days' },
      { value: '90d', label: '90 days' },
    ]);
    form.appendChild(expirationGroup);

    // Max uses
    const maxUsesGroup = this.createInputGroup('Maximum Uses (optional)', 'number', 'max-uses');
    const maxUsesInput = maxUsesGroup.querySelector('input') as HTMLInputElement;
    maxUsesInput.placeholder = 'Leave empty for unlimited';
    maxUsesInput.min = '1';
    form.appendChild(maxUsesGroup);

    container.appendChild(form);

    // Footer buttons
    this.modal?.addFooter([
      {
        label: 'Cancel',
        variant: 'secondary',
        onClick: () => {
          this.currentView = 'list';
          this.renderContent();
        },
      },
      {
        label: 'Create Link',
        variant: 'primary',
        onClick: async () => {
          // Build form data with defined values only
          const formData: Parameters<typeof this.createLink>[0] = {
            role: (roleGroup.querySelector('select') as HTMLSelectElement).value as CollaborationRole,
            expiration: (expirationGroup.querySelector('select') as HTMLSelectElement).value,
          };

          if (nameInput.value) {
            formData.name = nameInput.value;
          }
          if (pwdToggleEl.checked && pwdInputEl.value) {
            formData.password = pwdInputEl.value;
          }
          if (domainInput.value) {
            formData.domains = domainInput.value.split(',').map((d) => d.trim());
          }
          if (maxUsesInput.value) {
            formData.maxUses = parseInt(maxUsesInput.value, 10);
          }

          await this.createLink(formData);
        },
      },
    ]);
  }

  // ===========================================================================
  // Private Methods - Link Creation
  // ===========================================================================

  private async createLink(formData: {
    name?: string;
    role: CollaborationRole;
    password?: string;
    domains?: string[];
    expiration: string;
    maxUses?: number;
  }): Promise<void> {
    let expiresAt: Date | undefined;
    switch (formData.expiration) {
      case '1d':
        expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
        break;
      case '7d':
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        break;
    }

    // Build options with only defined properties
    const baseOptions = {
      documentId: this.options.documentId,
      role: formData.role,
      createdBy: this.options.userId,
    };

    const options: ShareLinkOptions = {
      ...baseOptions,
      ...(formData.name !== undefined ? { name: formData.name } : {}),
      ...(formData.password !== undefined ? { password: formData.password } : {}),
      ...(formData.domains !== undefined ? { allowedDomains: formData.domains } : {}),
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      ...(formData.maxUses !== undefined ? { maxUses: formData.maxUses } : {}),
    };

    const link = await this.options.shareManager.createLink(options);
    this.options.onLinkCreated?.(link);

    // Show success and copy link
    const url = this.options.shareManager.generateShareUrl(link, this.options.baseUrl);
    await navigator.clipboard.writeText(url);

    // Switch back to list view
    this.currentView = 'list';
    this.loadExistingLinks();
    this.renderContent();

    // Show toast (if available)
    this.showToast('Share link created and copied to clipboard!');
  }

  // ===========================================================================
  // Private Methods - UI Helpers
  // ===========================================================================

  private createButton(
    label: string,
    variant: 'primary' | 'secondary' | 'danger',
    onClick: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;

    const isPrimary = variant === 'primary';
    const isDanger = variant === 'danger';

    btn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid ${isDanger ? 'var(--designlibre-error, #ff6b6b)' : isPrimary ? 'var(--designlibre-accent, #0d99ff)' : 'var(--designlibre-border, #3d3d3d)'};
      border-radius: 6px;
      background: ${isPrimary ? 'var(--designlibre-accent, #0d99ff)' : isDanger ? 'transparent' : 'transparent'};
      color: ${isPrimary ? 'white' : isDanger ? 'var(--designlibre-error, #ff6b6b)' : 'var(--designlibre-text-primary, #e4e4e4)'};
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    `;

    btn.addEventListener('click', onClick);
    return btn;
  }

  private createInputGroup(label: string, type: string, id: string): HTMLElement {
    const group = document.createElement('div');
    group.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.htmlFor = id;
    labelEl.style.cssText = `
      font-size: 13px;
      font-weight: 500;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    group.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.style.cssText = `
      padding: 10px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--designlibre-accent, #0d99ff)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
    });
    group.appendChild(input);

    return group;
  }

  private createSelectGroup(
    label: string,
    id: string,
    options: Array<{ value: string; label: string }>
  ): HTMLElement {
    const group = document.createElement('div');
    group.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.htmlFor = id;
    labelEl.style.cssText = `
      font-size: 13px;
      font-weight: 500;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    group.appendChild(labelEl);

    const select = document.createElement('select');
    select.id = id;
    select.style.cssText = `
      padding: 10px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 14px;
      outline: none;
      cursor: pointer;
    `;

    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    }

    group.appendChild(select);
    return group;
  }

  private createToggle(label: string, id: string): HTMLElement {
    const group = document.createElement('div');
    group.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    `;

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.id = id;
    toggle.style.cssText = `
      width: 18px;
      height: 18px;
      cursor: pointer;
    `;
    group.appendChild(toggle);

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.htmlFor = id;
    labelEl.style.cssText = `
      font-size: 13px;
      color: var(--designlibre-text-primary, #e4e4e4);
      cursor: pointer;
    `;
    group.appendChild(labelEl);

    return group;
  }

  private formatRole(role: CollaborationRole): string {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'editor':
        return 'Editor';
      case 'commenter':
        return 'Commenter';
      case 'viewer':
        return 'Viewer';
      case 'developer':
        return 'Developer';
      default:
        return role;
    }
  }

  private showToast(message: string): void {
    // Create simple toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--designlibre-accent, #0d99ff);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10001;
      animation: fadeInUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Open a share dialog
 */
export function openShareDialog(options: ShareDialogOptions): ShareDialog {
  const dialog = new ShareDialog(options);
  dialog.open();
  return dialog;
}
