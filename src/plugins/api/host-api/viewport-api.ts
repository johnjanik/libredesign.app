/**
 * Viewport API
 *
 * Host API for controlling the canvas viewport.
 */

import type { SerializableValue } from '../../types/serialization';
import type { Point, Bounds } from '../../types/api-types';

/**
 * Viewport adapter interface
 */
export interface ViewportAdapter {
  /** Get current zoom level */
  getZoom(): number;
  /** Set zoom level */
  setZoom(zoom: number): void;
  /** Get viewport center point */
  getCenter(): Point;
  /** Set viewport center point */
  setCenter(point: Point): void;
  /** Get viewport bounds */
  getViewportBounds(): Bounds;
  /** Zoom to fit specific nodes */
  zoomToFit(nodeIds?: string[]): void;
  /** Zoom to fit all content */
  zoomToFitAll(): void;
  /** Pan by a delta */
  pan(deltaX: number, deltaY: number): void;
  /** Get the visible area in world coordinates */
  getVisibleArea(): Bounds;
  /** Convert screen coordinates to world coordinates */
  screenToWorld(screenX: number, screenY: number): Point;
  /** Convert world coordinates to screen coordinates */
  worldToScreen(worldX: number, worldY: number): Point;
}

/**
 * Create the Viewport API handlers
 */
export function createViewportAPI(adapter: ViewportAdapter) {
  return {
    /**
     * Get current zoom level
     */
    'viewport.getZoom': async (): Promise<number> => {
      return adapter.getZoom();
    },

    /**
     * Set zoom level
     */
    'viewport.setZoom': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const zoom = args[0];
      if (typeof zoom !== 'number') {
        throw new Error('Invalid zoom level: expected number');
      }
      if (zoom <= 0) {
        throw new Error('Zoom level must be positive');
      }
      if (zoom > 256) {
        throw new Error('Zoom level too high (max 256)');
      }
      adapter.setZoom(zoom);
    },

    /**
     * Get viewport center
     */
    'viewport.getCenter': async (): Promise<Point> => {
      return adapter.getCenter();
    },

    /**
     * Set viewport center
     */
    'viewport.setCenter': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const pointArg = args[0];
      if (typeof pointArg !== 'object' || pointArg === null) {
        throw new Error('Invalid point');
      }
      const point = pointArg as unknown as Point;
      if (typeof point.x !== 'number' || typeof point.y !== 'number') {
        throw new Error('Point must have numeric x and y properties');
      }
      adapter.setCenter(point);
    },

    /**
     * Zoom to fit nodes
     */
    'viewport.zoomToFit': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const ids = args[0];
      if (ids === undefined || ids === null) {
        adapter.zoomToFitAll();
        return;
      }
      if (!Array.isArray(ids)) {
        throw new Error('Invalid node IDs: expected array');
      }
      if (!ids.every((id) => typeof id === 'string')) {
        throw new Error('Invalid node IDs: all items must be strings');
      }
      if (ids.length === 0) {
        adapter.zoomToFitAll();
      } else {
        adapter.zoomToFit(ids as string[]);
      }
    },

    /**
     * Get viewport bounds
     */
    'viewport.getBounds': async (): Promise<Bounds> => {
      return adapter.getViewportBounds();
    },

    /**
     * Get visible area in world coordinates
     */
    'viewport.getVisibleArea': async (): Promise<Bounds> => {
      return adapter.getVisibleArea();
    },

    /**
     * Pan the viewport
     */
    'viewport.pan': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<void> => {
      const deltaX = args[0];
      const deltaY = args[1];
      if (typeof deltaX !== 'number' || typeof deltaY !== 'number') {
        throw new Error('Pan delta must be numbers');
      }
      adapter.pan(deltaX, deltaY);
    },

    /**
     * Convert screen to world coordinates
     */
    'viewport.screenToWorld': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<Point> => {
      const screenX = args[0];
      const screenY = args[1];
      if (typeof screenX !== 'number' || typeof screenY !== 'number') {
        throw new Error('Screen coordinates must be numbers');
      }
      return adapter.screenToWorld(screenX, screenY);
    },

    /**
     * Convert world to screen coordinates
     */
    'viewport.worldToScreen': async (
      _pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<Point> => {
      const worldX = args[0];
      const worldY = args[1];
      if (typeof worldX !== 'number' || typeof worldY !== 'number') {
        throw new Error('World coordinates must be numbers');
      }
      return adapter.worldToScreen(worldX, worldY);
    },
  };
}

export type ViewportAPIHandlers = ReturnType<typeof createViewportAPI>;
