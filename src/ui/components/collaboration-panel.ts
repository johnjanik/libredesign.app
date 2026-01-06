/**
 * Collaboration Panel
 *
 * UI component showing:
 * - Connection status indicator
 * - Active participants list with avatars
 * - Share/invite button
 * - Permission level indicator
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { CollaborationManager } from '@collaboration/collaboration-manager';
import type { ConnectionState } from '@collaboration/network/websocket-adapter';

// =============================================================================
// Types
// =============================================================================

export interface CollaborationPanelOptions {
  /** Maximum participants to show before collapsing */
  readonly maxVisibleParticipants?: number;
  /** Show share button */
  readonly showShareButton?: boolean;
  /** Compact mode for toolbar integration */
  readonly compact?: boolean;
}

interface ParticipantInfo {
  clientId: string;
  userName: string;
  color: string;
  isActive: boolean;
  activeTool?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OPTIONS: Required<CollaborationPanelOptions> = {
  maxVisibleParticipants: 4,
  showShareButton: true,
  compact: false,
};

const STATUS_ICONS: Record<ConnectionState, string> = {
  disconnected: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>`,
  connecting: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>`,
  connected: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>`,
  reconnecting: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>`,
};

const STATUS_LABELS: Record<ConnectionState, string> = {
  disconnected: 'Offline',
  connecting: 'Connecting...',
  connected: 'Online',
  reconnecting: 'Reconnecting...',
};

const STATUS_COLORS: Record<ConnectionState, string> = {
  disconnected: '#6b7280',
  connecting: '#f59e0b',
  connected: '#10b981',
  reconnecting: '#f59e0b',
};

// =============================================================================
// Collaboration Panel
// =============================================================================

export class CollaborationPanel {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private options: Required<CollaborationPanelOptions>;
  private element: HTMLElement | null = null;

  // Sub-elements
  private statusIndicator: HTMLElement | null = null;
  private participantsContainer: HTMLElement | null = null;

  // State
  private currentState: ConnectionState = 'disconnected';
  private participants: Map<string, ParticipantInfo> = new Map();
  private unsubscribers: Array<() => void> = [];

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: CollaborationPanelOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Initialize and render the panel
   */
  render(): HTMLElement {
    this.element = document.createElement('div');
    this.element.className = 'collaboration-panel';
    this.element.style.cssText = this.options.compact
      ? `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        background: var(--panel-bg, #1e1e1e);
        border-radius: 6px;
      `
      : `
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
        background: var(--panel-bg, #1e1e1e);
        border-radius: 8px;
        min-width: 200px;
      `;

    // Status indicator
    this.statusIndicator = this.createStatusIndicator();
    this.element.appendChild(this.statusIndicator);

    // Participants container
    this.participantsContainer = this.createParticipantsContainer();
    this.element.appendChild(this.participantsContainer);

    // Share button (if enabled and not compact)
    if (this.options.showShareButton && !this.options.compact) {
      const shareButton = this.createShareButton();
      this.element.appendChild(shareButton);
    }

    this.container.appendChild(this.element);

    // Set up event listeners if collaboration manager exists
    this.setupEventListeners();

    return this.element;
  }

  /**
   * Update connection state
   */
  updateConnectionState(state: ConnectionState): void {
    this.currentState = state;
    this.renderStatusIndicator();
  }

  /**
   * Update participant presence
   */
  updateParticipant(info: ParticipantInfo): void {
    this.participants.set(info.clientId, info);
    this.renderParticipants();
  }

  /**
   * Remove a participant
   */
  removeParticipant(clientId: string): void {
    this.participants.delete(clientId);
    this.renderParticipants();
  }

  /**
   * Clear all participants
   */
  clearParticipants(): void {
    this.participants.clear();
    this.renderParticipants();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.participants.clear();
    this.element?.remove();
    this.element = null;
  }

  // ===========================================================================
  // Private Methods - Rendering
  // ===========================================================================

  private createStatusIndicator(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'collab-status';
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    `;

    container.addEventListener('click', () => {
      this.handleStatusClick();
    });

    this.renderStatusIndicatorContent(container);
    return container;
  }

  private renderStatusIndicator(): void {
    if (this.statusIndicator) {
      this.renderStatusIndicatorContent(this.statusIndicator);
    }
  }

  private renderStatusIndicatorContent(container: HTMLElement): void {
    const icon = STATUS_ICONS[this.currentState];
    const label = STATUS_LABELS[this.currentState];
    const color = STATUS_COLORS[this.currentState];

    container.innerHTML = `
      <span class="status-icon" style="color: ${color}; display: flex; align-items: center;">
        ${icon}
      </span>
      ${!this.options.compact ? `<span class="status-label" style="
        font-size: 12px;
        color: ${color};
        font-weight: 500;
      ">${label}</span>` : ''}
    `;

    // Add pulse animation for connecting states
    if (this.currentState === 'connecting' || this.currentState === 'reconnecting') {
      const iconEl = container.querySelector('.status-icon') as HTMLElement;
      if (iconEl) {
        iconEl.style.animation = 'pulse 1.5s ease-in-out infinite';
      }
    }
  }

  private createParticipantsContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'collab-participants';
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: ${this.options.compact ? '4px' : '8px'};
      ${!this.options.compact ? 'flex-wrap: wrap;' : ''}
    `;

    return container;
  }

  private renderParticipants(): void {
    if (!this.participantsContainer) return;

    this.participantsContainer.innerHTML = '';

    const participantList = Array.from(this.participants.values());
    const visibleParticipants = participantList.slice(0, this.options.maxVisibleParticipants);
    const overflow = participantList.length - this.options.maxVisibleParticipants;

    // Render visible participant avatars
    for (const participant of visibleParticipants) {
      const avatar = this.createParticipantAvatar(participant);
      this.participantsContainer.appendChild(avatar);
    }

    // Render overflow indicator if needed
    if (overflow > 0) {
      const overflowEl = document.createElement('div');
      overflowEl.className = 'participant-overflow';
      overflowEl.style.cssText = `
        width: ${this.options.compact ? '24px' : '32px'};
        height: ${this.options.compact ? '24px' : '32px'};
        border-radius: 50%;
        background: var(--surface-secondary, #333);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${this.options.compact ? '10px' : '12px'};
        font-weight: 600;
        color: var(--text-secondary, #888);
        cursor: pointer;
      `;
      overflowEl.textContent = `+${overflow}`;
      overflowEl.title = `${overflow} more participant${overflow > 1 ? 's' : ''}`;
      this.participantsContainer.appendChild(overflowEl);
    }

    // Show empty state if no participants
    if (participantList.length === 0 && !this.options.compact) {
      const emptyState = document.createElement('span');
      emptyState.style.cssText = `
        font-size: 12px;
        color: var(--text-tertiary, #666);
      `;
      emptyState.textContent = 'No one else is here';
      this.participantsContainer.appendChild(emptyState);
    }
  }

  private createParticipantAvatar(participant: ParticipantInfo): HTMLElement {
    const size = this.options.compact ? 24 : 32;
    const avatar = document.createElement('div');
    avatar.className = 'participant-avatar';
    avatar.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${participant.color};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.4}px;
      font-weight: 600;
      color: ${this.getContrastColor(participant.color)};
      border: 2px solid ${participant.isActive ? participant.color : 'transparent'};
      opacity: ${participant.isActive ? 1 : 0.5};
      cursor: pointer;
      position: relative;
      transition: transform 0.15s ease;
    `;

    // Get initials
    const initials = this.getInitials(participant.userName);
    avatar.textContent = initials;
    avatar.title = participant.userName + (participant.activeTool ? ` (${participant.activeTool})` : '');

    // Hover effect
    avatar.addEventListener('mouseenter', () => {
      avatar.style.transform = 'scale(1.1)';
    });
    avatar.addEventListener('mouseleave', () => {
      avatar.style.transform = 'scale(1)';
    });

    // Active indicator dot
    if (participant.isActive) {
      const activeIndicator = document.createElement('div');
      activeIndicator.style.cssText = `
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        background: #10b981;
        border-radius: 50%;
        border: 2px solid var(--panel-bg, #1e1e1e);
      `;
      avatar.appendChild(activeIndicator);
    }

    return avatar;
  }

  private createShareButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'collab-share-btn';
    button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--accent-color, #3b82f6);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
      width: 100%;
    `;

    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      <span>Share</span>
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = 'var(--accent-hover, #2563eb)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'var(--accent-color, #3b82f6)';
    });

    button.addEventListener('click', () => {
      this.handleShareClick();
    });

    return button;
  }

  // ===========================================================================
  // Private Methods - Event Handling
  // ===========================================================================

  private setupEventListeners(): void {
    // Check if runtime has collaboration manager
    const collabManager = (this.runtime as unknown as { collaborationManager?: CollaborationManager })
      .collaborationManager;

    if (collabManager) {
      // Listen for connection state changes
      this.unsubscribers.push(
        collabManager.on('connection:stateChange', ({ state }) => {
          this.updateConnectionState(state);
        })
      );

      // Listen for presence updates
      this.unsubscribers.push(
        collabManager.on('presence:updated', ({ clientId, presence }) => {
          const cursors = collabManager.getRemoteCursors();
          const cursor = cursors.find(c => c.clientId === clientId);
          this.updateParticipant({
            clientId,
            userName: presence.userName,
            color: cursor?.color ?? '#888888',
            isActive: presence.isActive ?? true,
            activeTool: presence.activeTool,
          });
        })
      );

      // Listen for participant leaving
      this.unsubscribers.push(
        collabManager.on('participant:left', ({ clientId }) => {
          this.removeParticipant(clientId);
        })
      );

      // Initialize current state
      this.updateConnectionState(collabManager.getConnectionState());
    }
  }

  private handleStatusClick(): void {
    // Toggle connection or show status details
    const collabManager = (this.runtime as unknown as { collaborationManager?: CollaborationManager })
      .collaborationManager;

    if (!collabManager) {
      console.log('[CollaborationPanel] No collaboration manager available');
      return;
    }

    if (this.currentState === 'disconnected') {
      // Try to reconnect
      collabManager.connect().catch((error) => {
        console.error('[CollaborationPanel] Failed to connect:', error);
      });
    } else if (this.currentState === 'connected') {
      // Show participants panel or disconnect
      console.log('[CollaborationPanel] Currently connected with', this.participants.size, 'participants');
    }
  }

  private handleShareClick(): void {
    // TODO: Show share dialog with invite link
    console.log('[CollaborationPanel] Share clicked');

    // For now, copy a placeholder link
    const documentId = 'test-doc-id'; // Would come from runtime
    const shareUrl = `${window.location.origin}/join/${documentId}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      // Show toast notification
      this.showToast('Share link copied to clipboard');
    }).catch(() => {
      console.error('[CollaborationPanel] Failed to copy share link');
    });
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--surface-primary, #333);
      color: var(--text-primary, #fff);
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ===========================================================================
  // Private Methods - Utilities
  // ===========================================================================

  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0]?.[0] ?? '';
      const second = parts[1]?.[0] ?? '';
      return (first + second).toUpperCase();
    }
    return (name.slice(0, 2) || '??').toUpperCase();
  }

  private getContrastColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a collaboration panel
 */
export function createCollaborationPanel(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: CollaborationPanelOptions
): CollaborationPanel {
  return new CollaborationPanel(runtime, container, options);
}

// =============================================================================
// CSS Animations (inject once)
// =============================================================================

const styleId = 'collaboration-panel-styles';
if (!document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    @keyframes slideDown {
      from {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      to {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
    }
  `;
  document.head.appendChild(style);
}
