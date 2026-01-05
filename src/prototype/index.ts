/**
 * Prototype Module
 *
 * Provides prototype playback functionality for interactive
 * design presentations and user testing.
 */

// State Management
export {
  PrototypeStateManager,
  createStateManager,
} from './state-manager';
export type {
  NavigationEntry,
  OverlayEntry,
  PrototypeState,
  StateChangeEvent,
  StateChangeListener,
} from './state-manager';

// Interaction Handling
export {
  InteractionHandler,
  createInteractionHandler,
} from './interaction-handler';
export type {
  PointerEventData,
  KeyboardEventData,
  DragEventData,
  InteractionState,
  TriggerEvent,
  TriggerEventListener,
  HitTestFunction,
  LinkLookupFunction,
  InteractionHandlerOptions,
} from './interaction-handler';

// Prototype Player
export {
  PrototypePlayer,
  createPrototypePlayer,
  getTransitionInfo,
} from './prototype-player';
export type {
  PrototypePlayerEventType,
  PrototypePlayerEvent,
  PrototypePlayerEventListener,
  PrototypePlayerOptions,
} from './prototype-player';

// Interaction Manager
export {
  InteractionManager,
  createInteractionManager,
} from './interaction-manager';
export type {
  InteractionManagerEvents,
  EditableInteraction,
} from './interaction-manager';
