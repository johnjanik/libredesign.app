/**
 * Checkpoint Manager
 *
 * Manages named checkpoints (bookmarks) in the version history.
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { Checkpoint, StateSnapshot } from '@core/types/history';
import type { StateRestorationService } from './state-restoration';

/**
 * Checkpoint manager events
 */
export type CheckpointManagerEvents = {
  'checkpoint:created': { checkpoint: Checkpoint };
  'checkpoint:deleted': { checkpointId: string };
  'checkpoint:renamed': { checkpointId: string; newName: string };
  'checkpoint:restored': { checkpoint: Checkpoint };
  [key: string]: unknown;
};

/**
 * Checkpoint Manager
 */
export class CheckpointManager extends EventEmitter<CheckpointManagerEvents> {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private stateRestoration: StateRestorationService;
  private checkpointCounter = 0;

  constructor(stateRestoration: StateRestorationService) {
    super();
    this.stateRestoration = stateRestoration;
  }

  /**
   * Create a new checkpoint at the current state
   */
  createCheckpoint(name: string, description?: string): Checkpoint {
    const id = `checkpoint-${++this.checkpointCounter}-${Date.now()}`;
    const snapshot = this.stateRestoration.captureSnapshot();

    // Store snapshot
    this.stateRestoration.storeSnapshot(id, snapshot);

    const checkpoint: Checkpoint = {
      id,
      name,
      timestamp: Date.now(),
      groupId: id, // Link to the snapshot
    };

    // Add optional properties only if defined
    if (description) {
      checkpoint.description = description;
    }
    const thumbnail = this.generateThumbnail();
    if (thumbnail) {
      checkpoint.thumbnail = thumbnail;
    }

    this.checkpoints.set(id, checkpoint);
    this.emit('checkpoint:created', { checkpoint });

    return checkpoint;
  }

  /**
   * Delete a checkpoint
   */
  deleteCheckpoint(id: string): boolean {
    const checkpoint = this.checkpoints.get(id);
    if (!checkpoint) return false;

    // Delete associated snapshot
    this.stateRestoration.deleteSnapshot(id);

    this.checkpoints.delete(id);
    this.emit('checkpoint:deleted', { checkpointId: id });

    return true;
  }

  /**
   * Rename a checkpoint
   */
  renameCheckpoint(id: string, newName: string): boolean {
    const checkpoint = this.checkpoints.get(id);
    if (!checkpoint) return false;

    checkpoint.name = newName;
    this.emit('checkpoint:renamed', { checkpointId: id, newName });

    return true;
  }

  /**
   * Update checkpoint description
   */
  updateDescription(id: string, description: string): boolean {
    const checkpoint = this.checkpoints.get(id);
    if (!checkpoint) return false;

    checkpoint.description = description;
    return true;
  }

  /**
   * Get a checkpoint by ID
   */
  getCheckpoint(id: string): Checkpoint | undefined {
    return this.checkpoints.get(id);
  }

  /**
   * Get all checkpoints, sorted by timestamp (newest first)
   */
  getCheckpoints(): Checkpoint[] {
    return Array.from(this.checkpoints.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get checkpoint count
   */
  getCheckpointCount(): number {
    return this.checkpoints.size;
  }

  /**
   * Restore state to a checkpoint
   */
  restoreCheckpoint(id: string): boolean {
    const checkpoint = this.checkpoints.get(id);
    if (!checkpoint) return false;

    const snapshot = this.stateRestoration.getSnapshot(id);
    if (!snapshot) return false;

    this.stateRestoration.restoreSnapshot(snapshot);
    this.emit('checkpoint:restored', { checkpoint });

    return true;
  }

  /**
   * Check if a checkpoint exists
   */
  hasCheckpoint(id: string): boolean {
    return this.checkpoints.has(id);
  }

  /**
   * Clear all checkpoints
   */
  clearCheckpoints(): void {
    for (const id of this.checkpoints.keys()) {
      this.stateRestoration.deleteSnapshot(id);
    }
    this.checkpoints.clear();
  }

  /**
   * Generate a thumbnail of the current canvas state
   * Returns a data URL or undefined if not available
   */
  private generateThumbnail(): string | undefined {
    // Thumbnail generation would require canvas access
    // This is a placeholder - actual implementation would capture
    // a small preview of the canvas
    return undefined;
  }

  /**
   * Export checkpoints for persistence
   */
  exportCheckpoints(): Checkpoint[] {
    return this.getCheckpoints();
  }

  /**
   * Import checkpoints from persistence
   */
  importCheckpoints(checkpoints: Checkpoint[], snapshots: Map<string, StateSnapshot>): void {
    this.clearCheckpoints();

    for (const checkpoint of checkpoints) {
      this.checkpoints.set(checkpoint.id, checkpoint);

      const snapshot = snapshots.get(checkpoint.id);
      if (snapshot) {
        this.stateRestoration.storeSnapshot(checkpoint.id, snapshot);
      }
    }

    // Update counter to avoid ID collisions
    const maxId = Math.max(
      0,
      ...checkpoints.map(c => {
        const match = c.id.match(/checkpoint-(\d+)-/);
        return match && match[1] ? parseInt(match[1], 10) : 0;
      })
    );
    this.checkpointCounter = maxId;
  }
}

/**
 * Create a checkpoint manager
 */
export function createCheckpointManager(
  stateRestoration: StateRestorationService
): CheckpointManager {
  return new CheckpointManager(stateRestoration);
}
