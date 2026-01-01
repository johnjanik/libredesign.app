/**
 * Cursor Overlay
 *
 * Renders remote user cursors with labels showing user name and color.
 * Uses HTML/CSS for cursor rendering to avoid WebGL complexity for UI elements.
 */
import type { CursorPosition } from './presence-types';
/**
 * Cursor display data
 */
export interface CursorDisplayData {
    readonly clientId: string;
    readonly cursor: CursorPosition;
    readonly color: string;
    readonly userName: string;
    readonly activeTool?: string;
}
/**
 * Cursor overlay configuration
 */
export interface CursorOverlayConfig {
    /** Container element for the overlay */
    readonly container: HTMLElement;
    /** Cursor size in pixels */
    readonly cursorSize?: number;
    /** Label font size in pixels */
    readonly labelFontSize?: number;
    /** Label padding in pixels */
    readonly labelPadding?: number;
    /** Fade out duration for inactive cursors (ms) */
    readonly fadeOutDuration?: number;
    /** Show tool indicator */
    readonly showToolIndicator?: boolean;
}
/**
 * Cursor overlay renderer
 */
export declare class CursorOverlay {
    private config;
    private overlayContainer;
    private cursorElements;
    private viewportOffset;
    private viewportZoom;
    constructor(config: CursorOverlayConfig);
    /**
     * Create the main overlay container.
     */
    private createOverlayContainer;
    /**
     * Create a cursor element.
     */
    private createCursorElement;
    /**
     * Create cursor arrow SVG.
     */
    private createCursorSVG;
    /**
     * Get contrasting text color for background.
     */
    private getContrastColor;
    /**
     * Update the viewport transform.
     */
    updateViewport(offsetX: number, offsetY: number, zoom: number): void;
    /**
     * Convert world coordinates to screen coordinates.
     */
    private worldToScreen;
    /**
     * Update cursor position.
     */
    private updateCursorPosition;
    /**
     * Update a cursor.
     */
    updateCursor(data: CursorDisplayData): void;
    /**
     * Update multiple cursors.
     */
    updateCursors(cursors: CursorDisplayData[]): void;
    /**
     * Remove a cursor.
     */
    removeCursor(clientId: string): void;
    /**
     * Remove all cursors.
     */
    clear(): void;
    /**
     * Get cursor count.
     */
    getCursorCount(): number;
    /**
     * Show or hide all cursors.
     */
    setVisible(visible: boolean): void;
    /**
     * Dispose of resources.
     */
    dispose(): void;
}
/**
 * Create a cursor overlay.
 */
export declare function createCursorOverlay(config: CursorOverlayConfig): CursorOverlay;
//# sourceMappingURL=cursor-overlay.d.ts.map