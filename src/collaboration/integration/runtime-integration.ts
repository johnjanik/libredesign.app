/**
 * Runtime Integration for Collaboration
 *
 * Provides helper functions to integrate the collaboration system
 * with the DesignLibre runtime. This module handles:
 * - Initializing collaboration components
 * - Connecting overlays to the canvas
 * - Syncing presence with runtime events
 */

import type { SceneGraph } from '@scene/graph/scene-graph';
import type { SelectionManager } from '@scene/selection/selection-manager';
import type { NodeId } from '@core/types/common';
import { CollaborationManager, createCollaborationManager } from '../collaboration-manager';
import { CursorOverlay, createCursorOverlay } from '../presence/cursor-overlay';
import { SelectionOverlay, createSelectionOverlay, type NodeBoundsProvider } from '../presence/selection-overlay';
import type { CollaborationRole } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface CollaborationIntegrationOptions {
  /** WebSocket server URL */
  readonly serverUrl: string;
  /** User ID */
  readonly userId: string;
  /** User display name */
  readonly userName: string;
  /** Document ID to collaborate on */
  readonly documentId: string;
  /** Initial role (default: editor) */
  readonly role?: CollaborationRole;
  /** Canvas container element for overlays */
  readonly canvasContainer: HTMLElement;
  /** Scene graph instance */
  readonly sceneGraph: SceneGraph;
  /** Selection manager instance */
  readonly selectionManager: SelectionManager;
  /** Auto-connect on initialization (default: true) */
  readonly autoConnect?: boolean;
}

export interface CollaborationIntegration {
  /** The collaboration manager */
  readonly manager: CollaborationManager;
  /** The cursor overlay */
  readonly cursorOverlay: CursorOverlay;
  /** The selection overlay */
  readonly selectionOverlay: SelectionOverlay;
  /** Connect to the collaboration server */
  connect(): Promise<void>;
  /** Disconnect from the collaboration server */
  disconnect(): void;
  /** Update cursor position (call on mouse move) */
  updateCursor(x: number, y: number): void;
  /** Clear cursor (call on mouse leave) */
  clearCursor(): void;
  /** Update viewport (call on pan/zoom) */
  updateViewport(offsetX: number, offsetY: number, zoom: number): void;
  /** Dispose of all resources */
  dispose(): void;
}

// =============================================================================
// Integration Factory
// =============================================================================

/**
 * Create and initialize collaboration integration
 */
export function createCollaborationIntegration(
  options: CollaborationIntegrationOptions
): CollaborationIntegration {
  const {
    serverUrl,
    userId,
    userName,
    documentId,
    role = 'editor',
    canvasContainer,
    sceneGraph,
    selectionManager,
    autoConnect = true,
  } = options;

  // Create collaboration manager
  const manager = createCollaborationManager({
    serverUrl,
    userId,
    userName,
    documentId,
    role,
    sceneGraph,
    selectionManager,
  });

  // Create bounds provider that queries scene graph
  const boundsProvider: NodeBoundsProvider = {
    getNodeBounds(nodeId: NodeId) {
      const node = sceneGraph.getNode(nodeId);
      if (!node) return null;

      // Get node bounds - assuming nodes have x, y, width, height
      const nodeData = node as unknown as {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      };

      if (
        nodeData.x === undefined ||
        nodeData.y === undefined ||
        nodeData.width === undefined ||
        nodeData.height === undefined
      ) {
        return null;
      }

      return {
        x: nodeData.x,
        y: nodeData.y,
        width: nodeData.width,
        height: nodeData.height,
      };
    },
  };

  // Create overlays
  const cursorOverlay = createCursorOverlay({
    container: canvasContainer,
    showToolIndicator: true,
  });

  const selectionOverlay = createSelectionOverlay({
    container: canvasContainer,
    boundsProvider,
    showUserLabel: true,
  });

  // Track event unsubscribers
  const unsubscribers: Array<() => void> = [];

  // Wire up cursor updates from collaboration manager to overlay
  unsubscribers.push(
    manager.on('cursor:moved', ({ clientId, cursor }) => {
      const cursors = manager.getRemoteCursors();
      const cursorData = cursors.find((c) => c.clientId === clientId);
      if (cursorData) {
        cursorOverlay.updateCursor({
          clientId,
          cursor,
          color: cursorData.color,
          userName: cursorData.userName,
        });
      }
    })
  );

  // Wire up selection updates from collaboration manager to overlay
  unsubscribers.push(
    manager.on('selection:changed', ({ clientId, selection }) => {
      const selections = manager.getRemoteSelections();
      const selData = selections.find((s) => s.clientId === clientId);
      if (selData) {
        selectionOverlay.updateSelection({
          clientId,
          selection,
          color: selData.color,
        });
      }
    })
  );

  // Wire up participant removal
  unsubscribers.push(
    manager.on('participant:left', ({ clientId }) => {
      cursorOverlay.removeCursor(clientId);
      selectionOverlay.removeSelection(clientId);
    })
  );

  // Wire up local selection changes to broadcast
  unsubscribers.push(
    selectionManager.on('selection:changed', ({ nodeIds }) => {
      manager.updateSelection(nodeIds);
    })
  );

  // Track current viewport for coordinate transforms
  let currentViewport = { offsetX: 0, offsetY: 0, zoom: 1 };

  // Create integration object
  const integration: CollaborationIntegration = {
    manager,
    cursorOverlay,
    selectionOverlay,

    async connect() {
      await manager.connect();
      // Initialize CRDT from local state
      manager.initializeFromLocal();
    },

    disconnect() {
      manager.disconnect();
      cursorOverlay.clear();
      selectionOverlay.clear();
    },

    updateCursor(x: number, y: number) {
      // Convert screen to world coordinates
      const worldX = x / currentViewport.zoom - currentViewport.offsetX;
      const worldY = y / currentViewport.zoom - currentViewport.offsetY;

      manager.updateCursor({
        x: worldX,
        y: worldY,
      });
    },

    clearCursor() {
      manager.updateCursor(null);
    },

    updateViewport(offsetX: number, offsetY: number, zoom: number) {
      currentViewport = { offsetX, offsetY, zoom };
      cursorOverlay.updateViewport(offsetX, offsetY, zoom);
      selectionOverlay.updateViewport(offsetX, offsetY, zoom);
    },

    dispose() {
      // Unsubscribe from events
      for (const unsub of unsubscribers) {
        unsub();
      }

      // Disconnect and clean up
      manager.disconnect();
      cursorOverlay.dispose();
      selectionOverlay.dispose();
    },
  };

  // Auto-connect if enabled
  if (autoConnect) {
    integration.connect().catch((error) => {
      console.error('[CollaborationIntegration] Failed to auto-connect:', error);
    });
  }

  return integration;
}

// =============================================================================
// Export
// =============================================================================

export type { CollaborationManager } from '../collaboration-manager';
