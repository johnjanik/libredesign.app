/**
 * State Timeline Component
 *
 * Horizontal timeline for scrubbing through prototype state changes.
 * Shows state keyframes with thumbnails and supports playback control.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { VariableDefinition, VariableValue } from '@prototype/variable-manager';

// =============================================================================
// Types
// =============================================================================

/**
 * State keyframe - a snapshot of variable values at a point in time
 */
export interface StateKeyframe {
  /** Unique keyframe ID */
  id: string;
  /** Label for this keyframe */
  label: string;
  /** Variable values at this keyframe */
  values: Map<string, VariableValue>;
  /** Thumbnail image (data URL) */
  thumbnail?: string;
  /** Position on timeline (0-1) */
  position: number;
}

/**
 * State timeline options
 */
export interface StateTimelineOptions {
  /** Show variable value overlay on canvas */
  showOverlay?: boolean;
  /** Animation duration between keyframes (ms) */
  animationDuration?: number;
  /** Auto-loop playback */
  loop?: boolean;
  /** Overlay position */
  overlayPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const DEFAULT_OPTIONS: StateTimelineOptions = {
  showOverlay: true,
  animationDuration: 300,
  loop: true,
  overlayPosition: 'top-right',
};

/** Icons for the timeline */
const ICONS = {
  play: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21"/>
  </svg>`,
  pause: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
  </svg>`,
  stepBack: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 20L9 12L19 4V20Z"/><rect x="5" y="4" width="3" height="16"/>
  </svg>`,
  stepForward: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 4L15 12L5 20V4Z"/><rect x="16" y="4" width="3" height="16"/>
  </svg>`,
  add: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,
  delete: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
  </svg>`,
  capture: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/>
  </svg>`,
  loop: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>`,
  settings: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,
};

// =============================================================================
// State Timeline Class
// =============================================================================

/**
 * State Timeline - UI for scrubbing through state keyframes
 */
export class StateTimeline {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private element!: HTMLElement;
  private options: StateTimelineOptions;

  // State
  private keyframes: StateKeyframe[] = [];
  private currentKeyframeIndex = 0;
  private isPlaying = false;
  private playbackTimer: ReturnType<typeof setInterval> | null = null;

  // Elements
  private trackElement!: HTMLElement;
  private playheadElement!: HTMLElement;
  private keyframeContainer!: HTMLElement;
  private playPauseButton!: HTMLButtonElement;
  private positionLabel!: HTMLElement;
  private overlayElement: HTMLElement | null = null;

  // Drag state
  private isDraggingPlayhead = false;
  private isDraggingKeyframe = false;
  private draggedKeyframeIndex = -1;

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: StateTimelineOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.render();
    this.setupEventListeners();
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  private render(): void {
    this.element = document.createElement('div');
    this.element.className = 'state-timeline';
    this.element.innerHTML = `
      <div class="state-timeline-header">
        <span class="state-timeline-title">State Timeline</span>
        <div class="state-timeline-controls">
          <button class="timeline-btn" data-action="step-back" title="Previous keyframe">
            ${ICONS.stepBack}
          </button>
          <button class="timeline-btn play-pause" data-action="play-pause" title="Play/Pause">
            ${ICONS.play}
          </button>
          <button class="timeline-btn" data-action="step-forward" title="Next keyframe">
            ${ICONS.stepForward}
          </button>
          <button class="timeline-btn loop-toggle ${this.options.loop ? 'active' : ''}" data-action="toggle-loop" title="Toggle loop">
            ${ICONS.loop}
          </button>
          <span class="timeline-separator"></span>
          <button class="timeline-btn" data-action="capture" title="Capture current state">
            ${ICONS.capture}
          </button>
          <button class="timeline-btn" data-action="delete-keyframe" title="Delete selected keyframe">
            ${ICONS.delete}
          </button>
        </div>
      </div>
      <div class="state-timeline-body">
        <div class="timeline-track-container">
          <div class="timeline-track">
            <div class="timeline-keyframes"></div>
            <div class="timeline-playhead">
              <div class="playhead-handle"></div>
              <div class="playhead-line"></div>
            </div>
          </div>
        </div>
        <div class="timeline-position">0 / 0</div>
      </div>
    `;

    // Get element references
    this.trackElement = this.element.querySelector('.timeline-track')!;
    this.playheadElement = this.element.querySelector('.timeline-playhead')!;
    this.keyframeContainer = this.element.querySelector('.timeline-keyframes')!;
    this.playPauseButton = this.element.querySelector('.play-pause')!;
    this.positionLabel = this.element.querySelector('.timeline-position')!;

    this.container.appendChild(this.element);
    this.injectStyles();
    this.updatePositionLabel();
  }

  private injectStyles(): void {
    const styleId = 'state-timeline-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .state-timeline {
        background: var(--panel-bg, #1e1e1e);
        border-top: 1px solid var(--border-color, #333);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        color: var(--text-primary, #e0e0e0);
      }

      .state-timeline-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-bottom: 1px solid var(--border-color, #333);
      }

      .state-timeline-title {
        font-weight: 500;
        color: var(--text-secondary, #999);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 10px;
      }

      .state-timeline-controls {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .timeline-btn {
        background: transparent;
        border: none;
        color: var(--text-secondary, #999);
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, color 0.15s;
      }

      .timeline-btn:hover {
        background: var(--hover-bg, #333);
        color: var(--text-primary, #fff);
      }

      .timeline-btn.active {
        color: var(--accent-color, #0a84ff);
      }

      .timeline-separator {
        width: 1px;
        height: 16px;
        background: var(--border-color, #333);
        margin: 0 4px;
      }

      .state-timeline-body {
        padding: 12px;
      }

      .timeline-track-container {
        position: relative;
        padding: 16px 0;
      }

      .timeline-track {
        position: relative;
        height: 40px;
        background: var(--track-bg, #2a2a2a);
        border-radius: 4px;
        cursor: pointer;
      }

      .timeline-keyframes {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        pointer-events: none;
      }

      .timeline-keyframe {
        position: absolute;
        width: 48px;
        height: 32px;
        background: var(--keyframe-bg, #3a3a3a);
        border: 2px solid var(--border-color, #555);
        border-radius: 4px;
        transform: translateX(-50%);
        cursor: grab;
        pointer-events: all;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        transition: border-color 0.15s, transform 0.15s;
      }

      .timeline-keyframe:hover {
        border-color: var(--accent-color, #0a84ff);
      }

      .timeline-keyframe.selected {
        border-color: var(--accent-color, #0a84ff);
        transform: translateX(-50%) scale(1.05);
      }

      .timeline-keyframe.dragging {
        cursor: grabbing;
        opacity: 0.8;
      }

      .timeline-keyframe-label {
        font-size: 9px;
        color: var(--text-secondary, #999);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 4px;
      }

      .timeline-keyframe-thumbnail {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .timeline-playhead {
        position: absolute;
        top: -8px;
        bottom: -8px;
        width: 2px;
        background: var(--playhead-color, #ff3b30);
        left: 0;
        transform: translateX(-50%);
        pointer-events: none;
        z-index: 10;
      }

      .playhead-handle {
        position: absolute;
        top: -4px;
        left: 50%;
        transform: translateX(-50%);
        width: 12px;
        height: 12px;
        background: var(--playhead-color, #ff3b30);
        border-radius: 50%;
        cursor: ew-resize;
        pointer-events: all;
      }

      .playhead-line {
        position: absolute;
        top: 8px;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--playhead-color, #ff3b30);
      }

      .timeline-position {
        text-align: center;
        color: var(--text-secondary, #999);
        font-size: 11px;
        margin-top: 8px;
      }

      /* State overlay on canvas */
      .state-overlay {
        position: fixed;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: ui-monospace, monospace;
        font-size: 11px;
        z-index: 1000;
        max-width: 280px;
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .state-overlay.top-left { top: 16px; left: 16px; }
      .state-overlay.top-right { top: 16px; right: 16px; }
      .state-overlay.bottom-left { bottom: 16px; left: 16px; }
      .state-overlay.bottom-right { bottom: 16px; right: 16px; }

      .state-overlay-title {
        font-size: 10px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .state-overlay-item {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .state-overlay-item:last-child {
        border-bottom: none;
      }

      .state-overlay-name {
        color: #aaa;
      }

      .state-overlay-value {
        color: #fff;
        font-weight: 500;
      }

      .state-overlay-value.boolean-true { color: #30d158; }
      .state-overlay-value.boolean-false { color: #ff453a; }
      .state-overlay-value.number { color: #64d2ff; }
      .state-overlay-value.color {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .state-overlay-color-swatch {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
    `;
    document.head.appendChild(style);
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  private setupEventListeners(): void {
    // Control buttons
    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-action]') as HTMLElement | null;
      if (!button) return;

      const action = button.dataset['action'];
      switch (action) {
        case 'play-pause':
          this.togglePlayback();
          break;
        case 'step-back':
          this.stepBack();
          break;
        case 'step-forward':
          this.stepForward();
          break;
        case 'toggle-loop':
          this.toggleLoop();
          button.classList.toggle('active');
          break;
        case 'capture':
          this.captureKeyframe();
          break;
        case 'delete-keyframe':
          this.deleteCurrentKeyframe();
          break;
      }
    });

    // Track click to seek
    this.trackElement.addEventListener('click', (e) => {
      if (e.target !== this.trackElement) return;
      const rect = this.trackElement.getBoundingClientRect();
      const position = (e.clientX - rect.left) / rect.width;
      this.seekToPosition(Math.max(0, Math.min(1, position)));
    });

    // Playhead drag
    const playheadHandle = this.playheadElement.querySelector('.playhead-handle')!;
    playheadHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDraggingPlayhead = true;
      if (this.isPlaying) this.pause();
      this.setupDragListeners();
    });

    // Keyframe interaction
    this.keyframeContainer.addEventListener('mousedown', (e) => {
      const keyframeEl = (e.target as HTMLElement).closest('.timeline-keyframe') as HTMLElement | null;
      if (!keyframeEl) return;

      const index = parseInt(keyframeEl.dataset['index'] || '0', 10);
      this.selectKeyframe(index);

      // Start drag if holding
      this.isDraggingKeyframe = true;
      this.draggedKeyframeIndex = index;
      keyframeEl.classList.add('dragging');
      this.setupDragListeners();
    });
  }

  private setupDragListeners(): void {
    const onMouseMove = (e: MouseEvent) => {
      const rect = this.trackElement.getBoundingClientRect();
      const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      if (this.isDraggingPlayhead) {
        this.updatePlayheadPosition(position);
      } else if (this.isDraggingKeyframe && this.draggedKeyframeIndex >= 0) {
        this.moveKeyframe(this.draggedKeyframeIndex, position);
      }
    };

    const onMouseUp = () => {
      if (this.isDraggingKeyframe && this.draggedKeyframeIndex >= 0) {
        const keyframeEl = this.keyframeContainer.querySelector(
          `[data-index="${this.draggedKeyframeIndex}"]`
        );
        keyframeEl?.classList.remove('dragging');
      }

      this.isDraggingPlayhead = false;
      this.isDraggingKeyframe = false;
      this.draggedKeyframeIndex = -1;

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // ===========================================================================
  // Keyframe Management
  // ===========================================================================

  /**
   * Add a new keyframe
   */
  addKeyframe(keyframe: Omit<StateKeyframe, 'id'>): StateKeyframe {
    const id = `kf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newKeyframe: StateKeyframe = { ...keyframe, id };

    this.keyframes.push(newKeyframe);
    this.keyframes.sort((a, b) => a.position - b.position);

    this.renderKeyframes();
    this.updatePositionLabel();

    return newKeyframe;
  }

  /**
   * Remove a keyframe by index
   */
  removeKeyframe(index: number): void {
    if (index < 0 || index >= this.keyframes.length) return;

    this.keyframes.splice(index, 1);

    if (this.currentKeyframeIndex >= this.keyframes.length) {
      this.currentKeyframeIndex = Math.max(0, this.keyframes.length - 1);
    }

    this.renderKeyframes();
    this.updatePositionLabel();
  }

  /**
   * Select a keyframe
   */
  selectKeyframe(index: number): void {
    if (index < 0 || index >= this.keyframes.length) return;

    this.currentKeyframeIndex = index;
    this.applyKeyframe(index);
    this.updateKeyframeSelection();
    this.updatePositionLabel();
  }

  /**
   * Move a keyframe to a new position
   */
  private moveKeyframe(index: number, newPosition: number): void {
    const keyframe = this.keyframes[index];
    if (!keyframe) return;

    keyframe.position = Math.max(0, Math.min(1, newPosition));
    this.keyframes.sort((a, b) => a.position - b.position);

    // Update current index after sort
    this.currentKeyframeIndex = this.keyframes.findIndex((kf) => kf.id === keyframe.id);

    this.renderKeyframes();
  }

  /**
   * Capture current state as a keyframe
   */
  captureKeyframe(): void {
    const variableManager = this.runtime.getVariableManager?.();
    if (!variableManager) return;

    const values = new Map<string, VariableValue>();
    const allVariables = variableManager.getAllDefinitions();

    for (const variable of allVariables) {
      const value = variableManager.getValue(variable.id);
      if (value !== undefined) {
        values.set(variable.id, value);
      }
    }

    // Calculate position - place after current keyframe
    let position = 0;
    if (this.keyframes.length > 0) {
      const lastPosition = this.keyframes[this.keyframes.length - 1]?.position ?? 0;
      position = Math.min(1, lastPosition + 0.1);
    }

    const keyframe = this.addKeyframe({
      label: `State ${this.keyframes.length + 1}`,
      values,
      position,
    });

    this.selectKeyframe(this.keyframes.indexOf(keyframe));
  }

  /**
   * Delete the currently selected keyframe
   */
  deleteCurrentKeyframe(): void {
    if (this.keyframes.length === 0) return;
    this.removeKeyframe(this.currentKeyframeIndex);
  }

  // ===========================================================================
  // Playback
  // ===========================================================================

  /**
   * Start playback
   */
  play(): void {
    if (this.keyframes.length < 2) return;

    this.isPlaying = true;
    this.playPauseButton.innerHTML = ICONS.pause;

    this.playbackTimer = setInterval(() => {
      this.stepForward();

      if (this.currentKeyframeIndex === 0 && !this.options.loop) {
        this.pause();
      }
    }, this.options.animationDuration);
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.isPlaying = false;
    this.playPauseButton.innerHTML = ICONS.play;

    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  /**
   * Toggle playback
   */
  togglePlayback(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Toggle loop mode
   */
  toggleLoop(): void {
    this.options.loop = !this.options.loop;
  }

  /**
   * Step to previous keyframe
   */
  stepBack(): void {
    if (this.keyframes.length === 0) return;

    this.currentKeyframeIndex--;
    if (this.currentKeyframeIndex < 0) {
      this.currentKeyframeIndex = this.options.loop ? this.keyframes.length - 1 : 0;
    }

    this.applyKeyframe(this.currentKeyframeIndex);
    this.updateKeyframeSelection();
    this.updatePositionLabel();
  }

  /**
   * Step to next keyframe
   */
  stepForward(): void {
    if (this.keyframes.length === 0) return;

    this.currentKeyframeIndex++;
    if (this.currentKeyframeIndex >= this.keyframes.length) {
      this.currentKeyframeIndex = this.options.loop ? 0 : this.keyframes.length - 1;
    }

    this.applyKeyframe(this.currentKeyframeIndex);
    this.updateKeyframeSelection();
    this.updatePositionLabel();
  }

  /**
   * Seek to a position on the timeline
   */
  private seekToPosition(position: number): void {
    // Find nearest keyframe
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < this.keyframes.length; i++) {
      const keyframe = this.keyframes[i];
      if (!keyframe) continue;
      const distance = Math.abs(keyframe.position - position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    this.selectKeyframe(nearestIndex);
  }

  // ===========================================================================
  // State Application
  // ===========================================================================

  /**
   * Apply keyframe values to variables
   */
  private applyKeyframe(index: number): void {
    const keyframe = this.keyframes[index];
    if (!keyframe) return;

    const variableManager = this.runtime.getVariableManager?.();
    if (!variableManager) return;

    for (const [variableId, value] of keyframe.values) {
      variableManager.setValue(variableId, value);
    }

    // Update playhead position
    this.updatePlayheadPosition(keyframe.position);

    // Update overlay if enabled
    if (this.options.showOverlay) {
      this.updateOverlay(keyframe);
    }
  }

  // ===========================================================================
  // UI Updates
  // ===========================================================================

  private renderKeyframes(): void {
    this.keyframeContainer.innerHTML = '';

    for (let i = 0; i < this.keyframes.length; i++) {
      const keyframe = this.keyframes[i];
      if (!keyframe) continue;

      const el = document.createElement('div');
      el.className = 'timeline-keyframe';
      if (i === this.currentKeyframeIndex) {
        el.classList.add('selected');
      }
      el.dataset['index'] = String(i);
      el.style.left = `${keyframe.position * 100}%`;

      if (keyframe.thumbnail) {
        el.innerHTML = `<img class="timeline-keyframe-thumbnail" src="${keyframe.thumbnail}" alt="${keyframe.label}">`;
      } else {
        el.innerHTML = `<span class="timeline-keyframe-label">${keyframe.label}</span>`;
      }

      this.keyframeContainer.appendChild(el);
    }
  }

  private updateKeyframeSelection(): void {
    const keyframeEls = this.keyframeContainer.querySelectorAll('.timeline-keyframe');
    keyframeEls.forEach((el, i) => {
      el.classList.toggle('selected', i === this.currentKeyframeIndex);
    });
  }

  private updatePlayheadPosition(position: number): void {
    this.playheadElement.style.left = `${position * 100}%`;
  }

  private updatePositionLabel(): void {
    if (this.keyframes.length === 0) {
      this.positionLabel.textContent = '0 / 0';
    } else {
      this.positionLabel.textContent = `${this.currentKeyframeIndex + 1} / ${this.keyframes.length}`;
    }
  }

  /**
   * Update the state overlay
   */
  private updateOverlay(keyframe: StateKeyframe): void {
    const variableManager = this.runtime.getVariableManager?.();
    if (!variableManager) return;

    if (!this.overlayElement) {
      this.overlayElement = document.createElement('div');
      this.overlayElement.className = `state-overlay ${this.options.overlayPosition}`;
      document.body.appendChild(this.overlayElement);
    }

    const allVariables = variableManager.getAllDefinitions();
    const variableMap = new Map<string, VariableDefinition>();
    for (const v of allVariables) {
      variableMap.set(v.id, v);
    }

    let html = `<div class="state-overlay-title">${keyframe.label}</div>`;

    for (const [variableId, value] of keyframe.values) {
      const variable = variableMap.get(variableId);
      if (!variable) continue;

      let valueClass = '';
      let valueHtml = String(value);

      if (variable.type === 'boolean') {
        valueClass = value ? 'boolean-true' : 'boolean-false';
        valueHtml = value ? 'true' : 'false';
      } else if (variable.type === 'number') {
        valueClass = 'number';
      } else if (variable.type === 'color') {
        valueClass = 'color';
        valueHtml = `<span class="state-overlay-color-swatch" style="background:${value}"></span>${value}`;
      }

      html += `
        <div class="state-overlay-item">
          <span class="state-overlay-name">${variable.name}</span>
          <span class="state-overlay-value ${valueClass}">${valueHtml}</span>
        </div>
      `;
    }

    this.overlayElement.innerHTML = html;
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Get all keyframes
   */
  getKeyframes(): StateKeyframe[] {
    return [...this.keyframes];
  }

  /**
   * Load keyframes
   */
  loadKeyframes(keyframes: StateKeyframe[]): void {
    this.keyframes = [...keyframes];
    this.keyframes.sort((a, b) => a.position - b.position);
    this.currentKeyframeIndex = 0;
    this.renderKeyframes();
    this.updatePositionLabel();

    if (this.keyframes.length > 0) {
      this.applyKeyframe(0);
    }
  }

  /**
   * Clear all keyframes
   */
  clear(): void {
    this.keyframes = [];
    this.currentKeyframeIndex = 0;
    this.renderKeyframes();
    this.updatePositionLabel();
    this.hideOverlay();
  }

  /**
   * Hide the state overlay
   */
  hideOverlay(): void {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }

  /**
   * Show/hide timeline
   */
  setVisible(visible: boolean): void {
    this.element.style.display = visible ? '' : 'none';
    if (!visible) {
      this.pause();
      this.hideOverlay();
    }
  }

  /**
   * Destroy the timeline
   */
  destroy(): void {
    this.pause();
    this.hideOverlay();
    this.element.remove();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a state timeline instance
 */
export function createStateTimeline(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: StateTimelineOptions
): StateTimeline {
  return new StateTimeline(runtime, container, options);
}
