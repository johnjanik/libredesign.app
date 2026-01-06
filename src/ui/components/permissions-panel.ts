/**
 * Permissions Panel Component
 *
 * Panel for viewing and managing document/element permissions.
 * Features:
 * - View current participants and their roles
 * - Change participant roles (owner only)
 * - View element-level permissions
 * - View active locks
 */

import { EventEmitter } from '@core/events/event-emitter';
import type {
  CollaborationRole,
  DocumentId,
  UserId,
} from '../../collaboration/types';
import type { PermissionManager } from '../../collaboration/permissions/permission-manager';
import type { ElementLock } from '../../collaboration/realtime/permission-aware-crdt';

// =============================================================================
// Types
// =============================================================================

export interface Participant {
  readonly userId: UserId;
  readonly userName: string;
  readonly email?: string;
  readonly role: CollaborationRole;
  readonly avatarUrl?: string;
  readonly isOnline?: boolean;
  readonly joinedAt?: number;
}

export interface PermissionsPanelOptions {
  /** Container element to render into */
  readonly container: HTMLElement;
  /** Document ID */
  readonly documentId: DocumentId;
  /** Current user ID */
  readonly userId: UserId;
  /** Permission manager instance */
  readonly permissionManager: PermissionManager;
  /** Initial participants list */
  readonly participants?: readonly Participant[];
  /** Callback when role is changed */
  readonly onRoleChange?: (userId: UserId, newRole: CollaborationRole) => void;
  /** Callback when participant is removed */
  readonly onRemoveParticipant?: (userId: UserId) => void;
  /** Callback to open share dialog */
  readonly onShareClick?: () => void;
}

export interface PermissionsPanelEvents {
  'role:changed': { userId: UserId; role: CollaborationRole };
  'participant:removed': { userId: UserId };
  [key: string]: unknown;
}

// =============================================================================
// Icons
// =============================================================================

const ICONS = {
  users: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>`,
  lock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`,
  shield: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>`,
  crown: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
    <path d="M3 16h18v2H3z"/>
  </svg>`,
  edit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`,
  eye: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`,
  comment: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>`,
  code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>`,
  share: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>`,
  x: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,
  online: `<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#22c55e"/></svg>`,
  offline: `<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#6b7280"/></svg>`,
};

// =============================================================================
// Role Configuration
// =============================================================================

const ROLE_CONFIG: Record<
  CollaborationRole,
  { label: string; icon: string; color: string; description: string }
> = {
  owner: {
    label: 'Owner',
    icon: ICONS.crown,
    color: '#f59e0b',
    description: 'Full control over document and permissions',
  },
  editor: {
    label: 'Editor',
    icon: ICONS.edit,
    color: '#0d99ff',
    description: 'Can edit design, export, and comment',
  },
  commenter: {
    label: 'Commenter',
    icon: ICONS.comment,
    color: '#22c55e',
    description: 'Can view and add comments only',
  },
  viewer: {
    label: 'Viewer',
    icon: ICONS.eye,
    color: '#6b7280',
    description: 'View only access',
  },
  developer: {
    label: 'Developer',
    icon: ICONS.code,
    color: '#a855f7',
    description: 'Can inspect and export code',
  },
};

// =============================================================================
// Permissions Panel
// =============================================================================

export class PermissionsPanel extends EventEmitter<PermissionsPanelEvents> {
  private options: PermissionsPanelOptions;
  private participants: Map<UserId, Participant> = new Map();
  private locks: ElementLock[] = [];
  private element: HTMLElement | null = null;
  private currentTab: 'participants' | 'permissions' | 'locks' = 'participants';

  constructor(options: PermissionsPanelOptions) {
    super();
    this.options = options;

    // Initialize participants
    if (options.participants) {
      for (const p of options.participants) {
        this.participants.set(p.userId, p);
      }
    }
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Render the panel
   */
  render(): void {
    this.options.container.innerHTML = '';
    this.element = this.createPanel();
    this.options.container.appendChild(this.element);
  }

  /**
   * Update participants list
   */
  updateParticipants(participants: readonly Participant[]): void {
    this.participants.clear();
    for (const p of participants) {
      this.participants.set(p.userId, p);
    }
    this.renderTabContent();
  }

  /**
   * Add a participant
   */
  addParticipant(participant: Participant): void {
    this.participants.set(participant.userId, participant);
    this.renderTabContent();
  }

  /**
   * Remove a participant
   */
  removeParticipant(userId: UserId): void {
    this.participants.delete(userId);
    this.renderTabContent();
  }

  /**
   * Update a participant's role
   */
  updateParticipantRole(userId: UserId, role: CollaborationRole): void {
    const participant = this.participants.get(userId);
    if (participant) {
      this.participants.set(userId, { ...participant, role });
      this.renderTabContent();
    }
  }

  /**
   * Update locks display
   */
  updateLocks(locks: ElementLock[]): void {
    this.locks = locks;
    if (this.currentTab === 'locks') {
      this.renderTabContent();
    }
  }

  /**
   * Dispose of the panel
   */
  dispose(): void {
    this.element?.remove();
    this.element = null;
  }

  // ===========================================================================
  // Private Methods - Rendering
  // ===========================================================================

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'permissions-panel';
    panel.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--designlibre-bg-primary, #1e1e1e);
      color: var(--designlibre-text-primary, #e4e4e4);
    `;

    // Header
    const header = this.createHeader();
    panel.appendChild(header);

    // Tabs
    const tabs = this.createTabs();
    panel.appendChild(tabs);

    // Content
    const content = document.createElement('div');
    content.className = 'permissions-content';
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    `;
    panel.appendChild(content);

    this.renderTabContent();

    return panel;
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
    `;
    title.innerHTML = `${ICONS.shield} Permissions`;
    header.appendChild(title);

    // Share button
    if (this.options.onShareClick) {
      const shareBtn = document.createElement('button');
      shareBtn.innerHTML = `${ICONS.share} Share`;
      shareBtn.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border: 1px solid var(--designlibre-accent, #0d99ff);
        border-radius: 6px;
        background: var(--designlibre-accent, #0d99ff);
        color: white;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      `;
      shareBtn.addEventListener('click', () => this.options.onShareClick?.());
      header.appendChild(shareBtn);
    }

    return header;
  }

  private createTabs(): HTMLElement {
    const tabs = document.createElement('div');
    tabs.style.cssText = `
      display: flex;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      padding: 0 16px;
    `;

    const tabDefs = [
      { id: 'participants', label: 'People', icon: ICONS.users },
      { id: 'permissions', label: 'Permissions', icon: ICONS.shield },
      { id: 'locks', label: 'Locks', icon: ICONS.lock },
    ] as const;

    for (const tab of tabDefs) {
      const tabBtn = document.createElement('button');
      tabBtn.className = `tab-${tab.id}`;
      tabBtn.innerHTML = `${tab.icon} ${tab.label}`;
      tabBtn.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 12px 16px;
        border: none;
        border-bottom: 2px solid transparent;
        background: none;
        color: var(--designlibre-text-secondary, #888);
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s;
      `;

      if (tab.id === this.currentTab) {
        tabBtn.style.borderBottomColor = 'var(--designlibre-accent, #0d99ff)';
        tabBtn.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
      }

      tabBtn.addEventListener('click', () => {
        this.currentTab = tab.id;
        this.updateTabStyles();
        this.renderTabContent();
      });

      tabs.appendChild(tabBtn);
    }

    return tabs;
  }

  private updateTabStyles(): void {
    const tabs = this.element?.querySelectorAll('[class^="tab-"]');
    if (!tabs) return;

    tabs.forEach((tab) => {
      const tabEl = tab as HTMLElement;
      const tabId = tabEl.className.replace('tab-', '');
      if (tabId === this.currentTab) {
        tabEl.style.borderBottomColor = 'var(--designlibre-accent, #0d99ff)';
        tabEl.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
      } else {
        tabEl.style.borderBottomColor = 'transparent';
        tabEl.style.color = 'var(--designlibre-text-secondary, #888)';
      }
    });
  }

  private renderTabContent(): void {
    const content = this.element?.querySelector('.permissions-content');
    if (!content) return;

    content.innerHTML = '';

    switch (this.currentTab) {
      case 'participants':
        this.renderParticipantsTab(content as HTMLElement);
        break;
      case 'permissions':
        this.renderPermissionsTab(content as HTMLElement);
        break;
      case 'locks':
        this.renderLocksTab(content as HTMLElement);
        break;
    }
  }

  private renderParticipantsTab(container: HTMLElement): void {
    // Current user's permissions
    const canManage = this.options.permissionManager.canManagePermissions();

    if (this.participants.size === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--designlibre-text-secondary, #888);">
          <div style="margin-bottom: 12px;">${ICONS.users}</div>
          <p style="margin: 0;">No other participants</p>
          <p style="margin: 8px 0 0; font-size: 12px;">Share the document to invite others</p>
        </div>
      `;
      return;
    }

    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

    // Sort: owner first, then by name
    const sorted = Array.from(this.participants.values()).sort((a, b) => {
      if (a.role === 'owner') return -1;
      if (b.role === 'owner') return 1;
      return (a.userName || '').localeCompare(b.userName || '');
    });

    for (const participant of sorted) {
      list.appendChild(this.renderParticipantCard(participant, canManage));
    }

    container.appendChild(list);
  }

  private renderParticipantCard(participant: Participant, canManage: boolean): HTMLElement {
    const card = document.createElement('div');
    card.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 8px;
    `;

    // Avatar
    const avatar = document.createElement('div');
    avatar.style.cssText = `
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--designlibre-accent, #0d99ff);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      color: white;
      position: relative;
    `;
    avatar.textContent = (participant.userName || 'U').charAt(0).toUpperCase();

    // Online indicator
    const statusIndicator = document.createElement('span');
    statusIndicator.innerHTML = participant.isOnline ? ICONS.online : ICONS.offline;
    statusIndicator.style.cssText = `
      position: absolute;
      bottom: 0;
      right: 0;
    `;
    avatar.appendChild(statusIndicator);

    card.appendChild(avatar);

    // Info
    const info = document.createElement('div');
    info.style.cssText = 'flex: 1; min-width: 0;';

    const name = document.createElement('div');
    name.style.cssText = `
      font-weight: 500;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    name.textContent = participant.userName || 'Unknown';
    if (participant.userId === this.options.userId) {
      name.textContent += ' (you)';
    }
    info.appendChild(name);

    if (participant.email) {
      const email = document.createElement('div');
      email.style.cssText = `
        font-size: 11px;
        color: var(--designlibre-text-secondary, #888);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      email.textContent = participant.email;
      info.appendChild(email);
    }

    card.appendChild(info);

    // Role badge/selector
    const roleConfig = ROLE_CONFIG[participant.role];

    if (canManage && participant.role !== 'owner' && participant.userId !== this.options.userId) {
      // Role selector
      const select = document.createElement('select');
      select.style.cssText = `
        padding: 4px 8px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-primary, #1e1e1e);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: 12px;
        cursor: pointer;
      `;

      for (const [role, config] of Object.entries(ROLE_CONFIG)) {
        if (role === 'owner') continue; // Can't assign owner
        const option = document.createElement('option');
        option.value = role;
        option.textContent = config.label;
        option.selected = role === participant.role;
        select.appendChild(option);
      }

      select.addEventListener('change', () => {
        const newRole = select.value as CollaborationRole;
        this.options.onRoleChange?.(participant.userId, newRole);
        this.emit('role:changed', { userId: participant.userId, role: newRole });
      });

      card.appendChild(select);

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = ICONS.x;
      removeBtn.title = 'Remove participant';
      removeBtn.style.cssText = `
        padding: 4px;
        border: none;
        background: none;
        color: var(--designlibre-text-secondary, #888);
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.15s;
      `;
      removeBtn.addEventListener('click', () => {
        this.options.onRemoveParticipant?.(participant.userId);
        this.emit('participant:removed', { userId: participant.userId });
      });
      card.appendChild(removeBtn);
    } else {
      // Static badge
      const badge = document.createElement('span');
      badge.innerHTML = `${roleConfig.icon} ${roleConfig.label}`;
      badge.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        background: ${roleConfig.color}20;
        color: ${roleConfig.color};
      `;
      card.appendChild(badge);
    }

    return card;
  }

  private renderPermissionsTab(container: HTMLElement): void {
    const summary = this.options.permissionManager.getPermissionSummary();
    const role = this.options.permissionManager.getRole();
    const roleConfig = ROLE_CONFIG[role];

    // Current role header
    const roleHeader = document.createElement('div');
    roleHeader.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: ${roleConfig.color}10;
      border: 1px solid ${roleConfig.color}30;
      border-radius: 8px;
      margin-bottom: 20px;
    `;
    roleHeader.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 8px; background: ${roleConfig.color}20; color: ${roleConfig.color};">
        ${roleConfig.icon}
      </div>
      <div>
        <div style="font-weight: 600; font-size: 14px; color: ${roleConfig.color};">Your Role: ${roleConfig.label}</div>
        <div style="font-size: 12px; color: var(--designlibre-text-secondary, #888);">${roleConfig.description}</div>
      </div>
    `;
    container.appendChild(roleHeader);

    // Permission list
    const permissionsList = document.createElement('div');
    permissionsList.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

    const permissions = [
      { key: 'canView', label: 'View document', icon: ICONS.eye },
      { key: 'canEdit', label: 'Edit design', icon: ICONS.edit },
      { key: 'canComment', label: 'Add comments', icon: ICONS.comment },
      { key: 'canExport', label: 'Export assets', icon: ICONS.share },
      { key: 'canExportCode', label: 'Export code', icon: ICONS.code },
      { key: 'canManage', label: 'Manage permissions', icon: ICONS.shield },
    ] as const;

    for (const perm of permissions) {
      const hasPermission = summary[perm.key];
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        border-radius: 6px;
        opacity: ${hasPermission ? 1 : 0.5};
      `;
      item.innerHTML = `
        <span style="color: ${hasPermission ? 'var(--designlibre-success, #22c55e)' : 'var(--designlibre-text-secondary, #888)'}">${perm.icon}</span>
        <span style="flex: 1; font-size: 13px;">${perm.label}</span>
        <span style="font-size: 12px; color: ${hasPermission ? 'var(--designlibre-success, #22c55e)' : 'var(--designlibre-text-secondary, #888)'};">
          ${hasPermission ? 'Allowed' : 'Not allowed'}
        </span>
      `;
      permissionsList.appendChild(item);
    }

    container.appendChild(permissionsList);
  }

  private renderLocksTab(container: HTMLElement): void {
    if (this.locks.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--designlibre-text-secondary, #888);">
          <div style="margin-bottom: 12px;">${ICONS.lock}</div>
          <p style="margin: 0;">No active locks</p>
          <p style="margin: 8px 0 0; font-size: 12px;">Elements are locked when being edited</p>
        </div>
      `;
      return;
    }

    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

    for (const lock of this.locks) {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        border-radius: 8px;
      `;

      const icon = document.createElement('span');
      icon.innerHTML = ICONS.lock;
      icon.style.color = 'var(--designlibre-warning, #f59e0b)';
      item.appendChild(icon);

      const info = document.createElement('div');
      info.style.cssText = 'flex: 1;';

      const nodeName = document.createElement('div');
      nodeName.style.cssText = 'font-size: 13px; font-weight: 500;';
      nodeName.textContent = `Element: ${lock.nodeId.slice(0, 8)}...`;
      info.appendChild(nodeName);

      const lockInfo = document.createElement('div');
      lockInfo.style.cssText = 'font-size: 11px; color: var(--designlibre-text-secondary, #888);';
      lockInfo.textContent = `Locked by: ${lock.userName ?? lock.userId}`;
      if (lock.expiresAt) {
        const remaining = Math.max(0, lock.expiresAt - Date.now());
        const minutes = Math.ceil(remaining / 60000);
        lockInfo.textContent += ` | ${minutes}m remaining`;
      }
      info.appendChild(lockInfo);

      item.appendChild(info);

      // Show release button if owned by current user
      if (lock.userId === this.options.userId) {
        const releaseBtn = document.createElement('button');
        releaseBtn.textContent = 'Release';
        releaseBtn.style.cssText = `
          padding: 4px 8px;
          border: 1px solid var(--designlibre-border, #3d3d3d);
          border-radius: 4px;
          background: none;
          color: var(--designlibre-text-secondary, #888);
          font-size: 11px;
          cursor: pointer;
        `;
        item.appendChild(releaseBtn);
      }

      list.appendChild(item);
    }

    container.appendChild(list);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a permissions panel
 */
export function createPermissionsPanel(options: PermissionsPanelOptions): PermissionsPanel {
  const panel = new PermissionsPanel(options);
  panel.render();
  return panel;
}
