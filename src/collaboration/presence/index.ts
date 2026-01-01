/**
 * Presence Module
 *
 * Exports for presence management and rendering.
 */

export {
  createDefaultPresence,
  generateUserColor,
  isPresenceExpired,
} from './presence-types';
export type {
  CursorPosition,
  PresenceData,
} from './presence-types';

export { PresenceManager, createPresenceManager } from './presence-manager';
export type {
  PresenceManagerEvents,
  PresenceManagerConfig,
} from './presence-manager';

export { CursorOverlay, createCursorOverlay } from './cursor-overlay';
export type {
  CursorDisplayData,
  CursorOverlayConfig,
} from './cursor-overlay';

export { SelectionOverlay, createSelectionOverlay } from './selection-overlay';
export type {
  NodeBounds,
  NodeBoundsProvider,
  SelectionDisplayData,
  SelectionOverlayConfig,
} from './selection-overlay';
