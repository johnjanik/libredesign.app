/**
 * History Panel
 *
 * UI component for displaying and navigating version history.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { HistoryEntry, HistoryState } from '@core/types/history';

/**
 * History panel options
 */
export interface HistoryPanelOptions {
  /** Maximum entries to display */
  maxEntries?: number;
}

/**
 * SVG Icons for history panel
 */
const ICONS = {
  undo: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
  </svg>`,
  redo: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
  </svg>`,
  checkpoint: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>`,
  action: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"/>
  </svg>`,
  clear: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>`,
  current: `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="6"/>
  </svg>`,
  move: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/>
    <line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
  </svg>`,
  create: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,
  delete: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,
  change: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`,
  resize: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 21l-6-6m6 6v-4.8m0 4.8h-4.8"/>
    <path d="M3 16.2V21m0 0h4.8M3 21l6-6"/>
    <path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"/>
    <path d="M3 7.8V3m0 0h4.8M3 3l6 6"/>
  </svg>`,
};

/**
 * Get icon for operation description
 */
function getIconForDescription(description: string): string {
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes('move')) return ICONS.move;
  if (lowerDesc.includes('create') || lowerDesc.includes('add')) return ICONS.create;
  if (lowerDesc.includes('delete') || lowerDesc.includes('remove')) return ICONS.delete;
  if (lowerDesc.includes('resize') || lowerDesc.includes('scale')) return ICONS.resize;
  if (lowerDesc.includes('change') || lowerDesc.includes('update') || lowerDesc.includes('set')) return ICONS.change;
  return ICONS.action;
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 5000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/**
 * History Panel
 */
export class HistoryPanel {
  private runtime: DesignLibreRuntime;
  private element: HTMLElement | null = null;
  private _maxEntries: number;
  private listContainer: HTMLElement | null = null;
  private updateInterval: number | null = null;

  constructor(runtime: DesignLibreRuntime, options: HistoryPanelOptions = {}) {
    this.runtime = runtime;
    this._maxEntries = options.maxEntries ?? 100;
  }

  /**
   * Create the history panel element
   */
  create(): HTMLElement {
    this.element = document.createElement('div');
    this.element.className = 'designlibre-history-panel';
    this.element.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    // Header with actions
    this.element.appendChild(this.createHeader());

    // History list
    this.listContainer = document.createElement('div');
    this.listContainer.className = 'history-list';
    this.listContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    `;
    this.element.appendChild(this.listContainer);

    // Initial render
    this.render();

    // Subscribe to history changes
    this.subscribeToHistoryChanges();

    // Update relative times every 30 seconds
    this.updateInterval = window.setInterval(() => {
      this.updateRelativeTimes();
    }, 30000);

    return this.element;
  }

  /**
   * Create header with undo/redo buttons and actions
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'history-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    // Title
    const title = document.createElement('div');
    title.textContent = 'History';
    title.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    header.appendChild(title);

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = `
      display: flex;
      gap: 4px;
    `;

    // Undo button
    const undoBtn = this.createHeaderButton(ICONS.undo, 'Undo (Ctrl+Z)', () => {
      this.runtime.undo();
    });
    undoBtn.id = 'history-undo-btn';
    actions.appendChild(undoBtn);

    // Redo button
    const redoBtn = this.createHeaderButton(ICONS.redo, 'Redo (Ctrl+Shift+Z)', () => {
      this.runtime.redo();
    });
    redoBtn.id = 'history-redo-btn';
    actions.appendChild(redoBtn);

    // Separator
    const sep = document.createElement('div');
    sep.style.cssText = `
      width: 1px;
      height: 16px;
      background: var(--designlibre-border, #3d3d3d);
      margin: 0 4px;
    `;
    actions.appendChild(sep);

    // Add checkpoint button
    const checkpointBtn = this.createHeaderButton(ICONS.checkpoint, 'Create Checkpoint', () => {
      this.showCreateCheckpointDialog();
    });
    actions.appendChild(checkpointBtn);

    header.appendChild(actions);

    return header;
  }

  /**
   * Create a header action button
   */
  private createHeaderButton(icon: string, title: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.innerHTML = icon;
    button.title = title;
    button.style.cssText = `
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-secondary, #888);
      transition: all 0.15s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
      button.style.color = 'var(--designlibre-text-secondary, #888)';
    });

    button.addEventListener('click', onClick);

    return button;
  }

  /**
   * Render the history list
   */
  private render(): void {
    if (!this.listContainer) return;

    this.listContainer.innerHTML = '';

    const entries = this.getHistoryEntries();
    const state = this.getHistoryState();

    // Update undo/redo button states
    this.updateButtonStates(state);

    if (entries.length === 0) {
      this.listContainer.appendChild(this.createEmptyState());
      return;
    }

    // Create entries
    for (const entry of entries) {
      const entryEl = this.createEntryElement(entry);
      this.listContainer.appendChild(entryEl);
    }
  }

  /**
   * Create empty state message
   */
  private createEmptyState(): HTMLElement {
    const empty = document.createElement('div');
    empty.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      color: var(--designlibre-text-secondary, #888);
      text-align: center;
    `;

    const icon = document.createElement('div');
    icon.innerHTML = ICONS.action;
    icon.style.cssText = `
      opacity: 0.5;
      margin-bottom: 12px;
      transform: scale(2);
    `;
    empty.appendChild(icon);

    const text = document.createElement('div');
    text.textContent = 'No history yet';
    text.style.cssText = `
      font-size: 12px;
    `;
    empty.appendChild(text);

    const hint = document.createElement('div');
    hint.textContent = 'Make some changes to see them here';
    hint.style.cssText = `
      font-size: 11px;
      margin-top: 4px;
      opacity: 0.7;
    `;
    empty.appendChild(hint);

    return empty;
  }

  /**
   * Create a history entry element
   */
  private createEntryElement(entry: HistoryEntry): HTMLElement {
    const el = document.createElement('div');
    el.className = 'history-entry';
    el.dataset['entryId'] = entry.id;
    el.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.15s;
      ${entry.isCurrent ? 'background: var(--designlibre-accent-light, #1a3a5c);' : ''}
      ${entry.isUndone ? 'opacity: 0.5;' : ''}
    `;

    // Current indicator
    if (entry.isCurrent) {
      const indicator = document.createElement('div');
      indicator.innerHTML = ICONS.current;
      indicator.style.cssText = `
        color: var(--designlibre-accent, #4dabff);
        flex-shrink: 0;
      `;
      el.appendChild(indicator);
    } else {
      // Icon based on action type
      const icon = document.createElement('div');
      icon.innerHTML = entry.type === 'checkpoint' ? ICONS.checkpoint : getIconForDescription(entry.description);
      icon.style.cssText = `
        color: ${entry.type === 'checkpoint' ? 'var(--designlibre-warning, #f59e0b)' : 'var(--designlibre-text-secondary, #888)'};
        flex-shrink: 0;
      `;
      el.appendChild(icon);
    }

    // Description
    const desc = document.createElement('div');
    desc.textContent = entry.description;
    desc.style.cssText = `
      flex: 1;
      font-size: 12px;
      color: ${entry.isCurrent ? 'var(--designlibre-accent, #4dabff)' : 'var(--designlibre-text-primary, #e4e4e4)'};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    el.appendChild(desc);

    // Timestamp
    const time = document.createElement('div');
    time.className = 'history-entry-time';
    time.textContent = formatRelativeTime(entry.timestamp);
    time.dataset['timestamp'] = String(entry.timestamp);
    time.style.cssText = `
      font-size: 10px;
      color: var(--designlibre-text-muted, #666);
      flex-shrink: 0;
    `;
    el.appendChild(time);

    // Hover effects
    el.addEventListener('mouseenter', () => {
      if (!entry.isCurrent) {
        el.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    el.addEventListener('mouseleave', () => {
      if (!entry.isCurrent) {
        el.style.backgroundColor = 'transparent';
      }
    });

    // Click to jump to state
    el.addEventListener('click', () => {
      this.jumpToEntry(entry);
    });

    return el;
  }

  /**
   * Get history entries from the undo manager
   */
  private getHistoryEntries(): HistoryEntry[] {
    const entries: HistoryEntry[] = [];
    const undoHistory = this.runtime.getUndoHistory();
    const redoHistory = this.runtime.getRedoHistory();
    const checkpoints = this.runtime.getCheckpoints();

    // Current state indicator (always at top)
    entries.push({
      id: 'current',
      description: 'Current State',
      timestamp: Date.now(),
      type: 'action',
      isCurrent: true,
      isUndone: false,
    });

    // Add checkpoints (these are separate from undo/redo history)
    for (const checkpoint of checkpoints) {
      entries.push({
        id: checkpoint.id,
        description: `★ ${checkpoint.name}`,
        timestamp: checkpoint.timestamp,
        type: 'checkpoint',
        isCurrent: false,
        isUndone: false,
      });
    }

    // Add undo history (most recent first, these are past states)
    for (const group of undoHistory) {
      entries.push({
        id: group.id,
        description: group.description,
        timestamp: group.timestamp,
        type: 'action',
        isCurrent: false,
        isUndone: false,
      });
    }

    // Add redo history (these are undone states, shown dimmed)
    for (const group of redoHistory) {
      entries.push({
        id: group.id,
        description: group.description,
        timestamp: group.timestamp,
        type: 'action',
        isCurrent: false,
        isUndone: true,
      });
    }

    // Sort by timestamp (newest first), keeping current at top
    entries.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return b.timestamp - a.timestamp;
    });

    // Limit entries to maxEntries
    return entries.slice(0, this._maxEntries);
  }

  /**
   * Get current history state
   */
  private getHistoryState(): HistoryState {
    return {
      canUndo: this.runtime.canUndo(),
      canRedo: this.runtime.canRedo(),
      undoDescription: this.runtime.getUndoDescription(),
      redoDescription: this.runtime.getRedoDescription(),
      undoCount: this.runtime.getUndoHistory().length,
      redoCount: this.runtime.getRedoHistory().length,
    };
  }

  /**
   * Update undo/redo button states
   */
  private updateButtonStates(state: HistoryState): void {
    const undoBtn = this.element?.querySelector('#history-undo-btn') as HTMLButtonElement | null;
    const redoBtn = this.element?.querySelector('#history-redo-btn') as HTMLButtonElement | null;

    if (undoBtn) {
      undoBtn.disabled = !state.canUndo;
      undoBtn.style.opacity = state.canUndo ? '1' : '0.3';
      undoBtn.style.cursor = state.canUndo ? 'pointer' : 'not-allowed';
      undoBtn.title = state.undoDescription
        ? `Undo: ${state.undoDescription} (Ctrl+Z)`
        : 'Undo (Ctrl+Z)';
    }

    if (redoBtn) {
      redoBtn.disabled = !state.canRedo;
      redoBtn.style.opacity = state.canRedo ? '1' : '0.3';
      redoBtn.style.cursor = state.canRedo ? 'pointer' : 'not-allowed';
      redoBtn.title = state.redoDescription
        ? `Redo: ${state.redoDescription} (Ctrl+Shift+Z)`
        : 'Redo (Ctrl+Shift+Z)';
    }
  }

  /**
   * Jump to a specific history entry
   */
  private jumpToEntry(entry: HistoryEntry): void {
    if (entry.isCurrent) return;

    // Handle checkpoint restoration
    if (entry.type === 'checkpoint') {
      const success = this.runtime.restoreCheckpoint(entry.id);
      if (success) {
        this.showToast(`Restored checkpoint: ${entry.description.replace('★ ', '')}`);
        this.render();
      }
      return;
    }

    // Count how many undos/redos needed
    const undoHistory = this.runtime.getUndoHistory();
    const redoHistory = this.runtime.getRedoHistory();

    // Find entry in undo stack
    const undoIndex = undoHistory.findIndex(g => g.id === entry.id);
    if (undoIndex !== -1) {
      // Need to undo (undoIndex + 1) times
      const undoCount = undoIndex + 1;
      for (let i = 0; i < undoCount; i++) {
        this.runtime.undo();
      }
      return;
    }

    // Find entry in redo stack
    const redoIndex = redoHistory.findIndex(g => g.id === entry.id);
    if (redoIndex !== -1) {
      // Need to redo (redoIndex + 1) times
      const redoCount = redoIndex + 1;
      for (let i = 0; i < redoCount; i++) {
        this.runtime.redo();
      }
    }
  }

  /**
   * Subscribe to history change events
   */
  private subscribeToHistoryChanges(): void {
    // Listen for undo manager events via runtime
    this.runtime.on('history:changed', () => {
      this.render();
    });
  }

  /**
   * Update relative times in the UI
   */
  private updateRelativeTimes(): void {
    if (!this.listContainer) return;

    const timeElements = this.listContainer.querySelectorAll('.history-entry-time');
    timeElements.forEach(el => {
      const timestamp = parseInt((el as HTMLElement).dataset['timestamp'] || '0', 10);
      if (timestamp > 0) {
        el.textContent = formatRelativeTime(timestamp);
      }
    });
  }

  /**
   * Show a toast message
   */
  private showToast(message: string): void {
    // Use runtime toast if available, otherwise console
    if (typeof (this.runtime as unknown as { showToast: (msg: string) => void }).showToast === 'function') {
      (this.runtime as unknown as { showToast: (msg: string) => void }).showToast(message);
    } else {
      console.log('[History]', message);
    }
  }

  /**
   * Show dialog to create a new checkpoint
   */
  private showCreateCheckpointDialog(): void {
    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      padding: 20px;
      min-width: 300px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

    // Title
    const title = document.createElement('div');
    title.textContent = 'Create Checkpoint';
    title.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
      margin-bottom: 16px;
    `;
    dialog.appendChild(title);

    // Name input
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name';
    nameLabel.style.cssText = `
      display: block;
      font-size: 12px;
      color: var(--designlibre-text-secondary, #888);
      margin-bottom: 4px;
    `;
    dialog.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Checkpoint name...';
    nameInput.value = `Checkpoint ${new Date().toLocaleTimeString()}`;
    nameInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 13px;
      margin-bottom: 12px;
      box-sizing: border-box;
    `;
    dialog.appendChild(nameInput);

    // Description input
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Description (optional)';
    descLabel.style.cssText = `
      display: block;
      font-size: 12px;
      color: var(--designlibre-text-secondary, #888);
      margin-bottom: 4px;
    `;
    dialog.appendChild(descLabel);

    const descInput = document.createElement('textarea');
    descInput.placeholder = 'Add a description...';
    descInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 13px;
      margin-bottom: 16px;
      resize: vertical;
      min-height: 60px;
      box-sizing: border-box;
    `;
    dialog.appendChild(descInput);

    // Buttons
    const buttons = document.createElement('div');
    buttons.style.cssText = `
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 4px;
      background: transparent;
      color: var(--designlibre-text-primary, #e4e4e4);
      cursor: pointer;
      font-size: 13px;
    `;
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
    });

    const createBtn = document.createElement('button');
    createBtn.textContent = 'Create';
    createBtn.style.cssText = `
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background: var(--designlibre-accent, #4dabff);
      color: white;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    `;
    createBtn.addEventListener('click', () => {
      const name = nameInput.value.trim() || 'Unnamed Checkpoint';
      const description = descInput.value.trim() || undefined;

      this.runtime.createCheckpoint(name, description);
      this.showToast(`Checkpoint "${name}" created`);
      this.render();
      overlay.remove();
    });

    buttons.appendChild(cancelBtn);
    buttons.appendChild(createBtn);
    dialog.appendChild(buttons);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Focus name input
    nameInput.focus();
    nameInput.select();

    // Close on escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        createBtn.click();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  /**
   * Dispose the panel
   */
  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    this.listContainer = null;
  }
}

/**
 * Create a history panel
 */
export function createHistoryPanel(
  runtime: DesignLibreRuntime,
  options?: HistoryPanelOptions
): HistoryPanel {
  return new HistoryPanel(runtime, options);
}
