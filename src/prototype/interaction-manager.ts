/**
 * Interaction Manager
 *
 * Manages prototype interactions for the current document.
 * Bridges page schema interaction types with the prototype player.
 */

import type { NodeId } from '@core/types/common';
import type {
  PrototypeInteraction,
  InteractionTrigger,
  InteractionAction,
  Transition,
} from '@core/types/page-schema';
import type { PrototypeLink, TriggerType, TransitionType, OverlaySettings } from '@animation/types/transition';
import type { EasingPreset } from '@animation/types/easing';
import { EventEmitter } from '@core/events/event-emitter';

// =============================================================================
// Types
// =============================================================================

/**
 * Interaction manager events
 */
export type InteractionManagerEvents = {
  'interaction:added': { interaction: PrototypeInteraction };
  'interaction:updated': { interaction: PrototypeInteraction };
  'interaction:removed': { id: string };
  'interactions:cleared': undefined;
  [key: string]: unknown;
};

/**
 * Interaction with additional metadata for editing
 */
export interface EditableInteraction extends PrototypeInteraction {
  /** Source node name for display */
  sourceNodeName?: string;
  /** Destination node name for display */
  destinationNodeName?: string;
}

// =============================================================================
// Interaction Manager
// =============================================================================

/**
 * Manages prototype interactions for a document
 */
export class InteractionManager extends EventEmitter<InteractionManagerEvents> {
  /** All interactions indexed by ID */
  private interactions = new Map<string, PrototypeInteraction>();

  /** Interactions indexed by source node for quick lookup */
  private bySourceNode = new Map<NodeId, Set<string>>();

  /** Interactions indexed by destination for reverse lookup */
  private byDestination = new Map<NodeId, Set<string>>();

  constructor() {
    super();
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  /**
   * Add an interaction
   */
  addInteraction(interaction: PrototypeInteraction): void {
    this.interactions.set(interaction.id, interaction);
    this.indexInteraction(interaction);
    this.emit('interaction:added', { interaction });
  }

  /**
   * Update an interaction
   */
  updateInteraction(id: string, updates: Partial<Omit<PrototypeInteraction, 'id'>>): void {
    const existing = this.interactions.get(id);
    if (!existing) return;

    // Remove old indexes
    this.unindexInteraction(existing);

    // Create updated interaction
    const updated: PrototypeInteraction = {
      ...existing,
      ...updates,
    };

    this.interactions.set(id, updated);
    this.indexInteraction(updated);
    this.emit('interaction:updated', { interaction: updated });
  }

  /**
   * Remove an interaction
   */
  removeInteraction(id: string): void {
    const interaction = this.interactions.get(id);
    if (!interaction) return;

    this.unindexInteraction(interaction);
    this.interactions.delete(id);
    this.emit('interaction:removed', { id });
  }

  /**
   * Get an interaction by ID
   */
  getInteraction(id: string): PrototypeInteraction | undefined {
    return this.interactions.get(id);
  }

  /**
   * Get all interactions
   */
  getAllInteractions(): PrototypeInteraction[] {
    return Array.from(this.interactions.values());
  }

  /**
   * Get interactions for a source node
   */
  getInteractionsForNode(nodeId: NodeId): PrototypeInteraction[] {
    const ids = this.bySourceNode.get(nodeId);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.interactions.get(id))
      .filter((i): i is PrototypeInteraction => i !== undefined);
  }

  /**
   * Get interactions targeting a node
   */
  getInteractionsTargeting(nodeId: NodeId): PrototypeInteraction[] {
    const ids = this.byDestination.get(nodeId);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.interactions.get(id))
      .filter((i): i is PrototypeInteraction => i !== undefined);
  }

  /**
   * Check if a node has any interactions
   */
  hasInteractions(nodeId: NodeId): boolean {
    return (this.bySourceNode.get(nodeId)?.size ?? 0) > 0;
  }

  /**
   * Clear all interactions
   */
  clear(): void {
    this.interactions.clear();
    this.bySourceNode.clear();
    this.byDestination.clear();
    this.emit('interactions:cleared');
  }

  /**
   * Load interactions from page data
   */
  loadFromPage(interactions: PrototypeInteraction[]): void {
    this.clear();
    for (const interaction of interactions) {
      this.interactions.set(interaction.id, interaction);
      this.indexInteraction(interaction);
    }
  }

  /**
   * Export interactions for page serialization
   */
  exportForPage(): PrototypeInteraction[] {
    return this.getAllInteractions();
  }

  // ===========================================================================
  // Conversion to PrototypeLink for Player
  // ===========================================================================

  /**
   * Get prototype links for a node (for use with PrototypePlayer)
   */
  getLinksForNode(nodeId: NodeId): PrototypeLink[] {
    const interactions = this.getInteractionsForNode(nodeId);
    const links: PrototypeLink[] = [];

    for (const interaction of interactions) {
      for (const action of interaction.actions) {
        const link = this.actionToLink(interaction, action);
        if (link) {
          links.push(link);
        }
      }
    }

    return links;
  }

  /**
   * Convert an interaction action to a PrototypeLink
   */
  private actionToLink(
    interaction: PrototypeInteraction,
    action: InteractionAction
  ): PrototypeLink | null {
    if (action.type !== 'NAVIGATE' && action.type !== 'OPEN_OVERLAY') {
      return null;
    }

    const triggerType = this.convertTriggerType(interaction.trigger);
    const destinationId = action.type === 'NAVIGATE'
      ? action.destinationId
      : action.overlayId;

    const link: PrototypeLink = {
      id: `${interaction.id}_${action.type}`,
      sourceNodeId: interaction.triggerNodeId as NodeId,
      targetNodeId: destinationId as NodeId,
      trigger: triggerType,
      transition: this.convertTransitionType(action.transition.type),
      duration: action.transition.duration,
      easing: this.convertEasing(action.transition.easing),
    };

    if (action.transition.direction) {
      (link as { direction: typeof action.transition.direction }).direction = action.transition.direction;
    }

    if (action.type === 'OPEN_OVERLAY') {
      const overlaySettings: OverlaySettings = {
        position: this.convertOverlayPosition(action.position),
        background: action.overlayBackground ? 'DIM' : 'NONE',
        closeOnOutsideClick: action.closeOnClickOutside ?? false,
      };
      (link as { overlay: OverlaySettings }).overlay = overlaySettings;
    }

    return link;
  }

  private convertTriggerType(trigger: InteractionTrigger): TriggerType {
    switch (trigger.type) {
      case 'ON_CLICK': return 'ON_CLICK';
      case 'ON_HOVER': return 'ON_HOVER';
      case 'ON_PRESS': return 'ON_PRESS';
      case 'ON_DRAG': return 'ON_DRAG';
      case 'MOUSE_ENTER': return 'MOUSE_ENTER';
      case 'MOUSE_LEAVE': return 'MOUSE_LEAVE';
      case 'MOUSE_DOWN': return 'MOUSE_DOWN';
      case 'MOUSE_UP': return 'MOUSE_UP';
      case 'AFTER_TIMEOUT': return 'AFTER_TIMEOUT';
      case 'ON_KEY_DOWN': return 'KEY_PRESS';
      default: return 'ON_CLICK';
    }
  }

  private convertTransitionType(type: string): TransitionType {
    const mapping: Record<string, TransitionType> = {
      'INSTANT': 'INSTANT',
      'DISSOLVE': 'DISSOLVE',
      'SMART_ANIMATE': 'SMART_ANIMATE',
      'SLIDE_IN': 'SLIDE_IN',
      'SLIDE_OUT': 'SLIDE_OUT',
      'PUSH': 'PUSH',
      'MOVE_IN': 'MOVE_IN',
      'MOVE_OUT': 'MOVE_OUT',
    };
    return mapping[type] ?? 'INSTANT';
  }

  private convertEasing(easing: string): EasingPreset {
    const mapping: Record<string, EasingPreset> = {
      'LINEAR': 'linear',
      'EASE_IN': 'ease-in',
      'EASE_OUT': 'ease-out',
      'EASE_IN_OUT': 'ease-in-out',
      'EASE_IN_BACK': 'ease-in-back',
      'EASE_OUT_BACK': 'ease-out-back',
    };
    return mapping[easing] ?? 'ease-out';
  }

  private convertOverlayPosition(
    position?: { type: string; x?: number; y?: number }
  ): 'CENTER' | 'TOP_LEFT' | 'TOP_CENTER' | 'TOP_RIGHT' |
     'CENTER_LEFT' | 'CENTER_RIGHT' |
     'BOTTOM_LEFT' | 'BOTTOM_CENTER' | 'BOTTOM_RIGHT' | 'MANUAL' {
    if (!position) return 'CENTER';
    if (position.type === 'MANUAL') return 'MANUAL';
    return position.type as 'CENTER';
  }

  // ===========================================================================
  // Indexing
  // ===========================================================================

  private indexInteraction(interaction: PrototypeInteraction): void {
    const sourceId = interaction.triggerNodeId as NodeId;

    // Index by source
    if (!this.bySourceNode.has(sourceId)) {
      this.bySourceNode.set(sourceId, new Set());
    }
    this.bySourceNode.get(sourceId)!.add(interaction.id);

    // Index by destination
    for (const action of interaction.actions) {
      const destId = this.getDestinationFromAction(action);
      if (destId) {
        if (!this.byDestination.has(destId)) {
          this.byDestination.set(destId, new Set());
        }
        this.byDestination.get(destId)!.add(interaction.id);
      }
    }
  }

  private unindexInteraction(interaction: PrototypeInteraction): void {
    const sourceId = interaction.triggerNodeId as NodeId;
    this.bySourceNode.get(sourceId)?.delete(interaction.id);

    for (const action of interaction.actions) {
      const destId = this.getDestinationFromAction(action);
      if (destId) {
        this.byDestination.get(destId)?.delete(interaction.id);
      }
    }
  }

  private getDestinationFromAction(action: InteractionAction): NodeId | null {
    switch (action.type) {
      case 'NAVIGATE':
        return action.destinationId as NodeId;
      case 'OPEN_OVERLAY':
      case 'SWAP_OVERLAY':
        return action.overlayId as NodeId;
      default:
        return null;
    }
  }

  // ===========================================================================
  // Factory Helpers
  // ===========================================================================

  /**
   * Create a new interaction with defaults
   */
  static createInteraction(
    triggerNodeId: NodeId,
    destinationId: NodeId,
    options: {
      trigger?: InteractionTrigger['type'];
      transition?: Transition['type'];
      duration?: number;
    } = {}
  ): PrototypeInteraction {
    const id = `interaction_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    return {
      id,
      triggerNodeId: triggerNodeId as string,
      trigger: { type: options.trigger ?? 'ON_CLICK' } as InteractionTrigger,
      actions: [{
        type: 'NAVIGATE',
        destinationId: destinationId as string,
        transition: {
          type: options.transition ?? 'DISSOLVE',
          duration: options.duration ?? 300,
          easing: 'EASE_OUT',
        },
      }],
    };
  }

  /**
   * Create an overlay interaction
   */
  static createOverlayInteraction(
    triggerNodeId: NodeId,
    overlayId: NodeId,
    options: {
      trigger?: InteractionTrigger['type'];
      position?: 'CENTER' | 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT';
    } = {}
  ): PrototypeInteraction {
    const id = `interaction_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    return {
      id,
      triggerNodeId: triggerNodeId as string,
      trigger: { type: options.trigger ?? 'ON_CLICK' } as InteractionTrigger,
      actions: [{
        type: 'OPEN_OVERLAY',
        overlayId: overlayId as string,
        transition: {
          type: 'DISSOLVE',
          duration: 200,
          easing: 'EASE_OUT',
        },
        closeOnClickOutside: true,
        position: { type: options.position ?? 'CENTER' },
      }],
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an interaction manager
 */
export function createInteractionManager(): InteractionManager {
  return new InteractionManager();
}
