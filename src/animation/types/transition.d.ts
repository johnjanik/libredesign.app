/**
 * Transition Types
 *
 * Defines transitions between states for prototyping.
 */
import type { NodeId } from '@core/types/common';
import type { EasingPreset, EasingDefinition } from './easing';
/**
 * Trigger types for prototype interactions.
 */
export type TriggerType = 'ON_CLICK' | 'ON_TAP' | 'ON_DOUBLE_CLICK' | 'ON_HOVER' | 'ON_PRESS' | 'ON_DRAG' | 'MOUSE_ENTER' | 'MOUSE_LEAVE' | 'MOUSE_DOWN' | 'MOUSE_UP' | 'AFTER_TIMEOUT' | 'KEY_PRESS';
/**
 * Transition types for frame-to-frame navigation.
 */
export type TransitionType = 'INSTANT' | 'DISSOLVE' | 'SMART_ANIMATE' | 'MOVE_IN' | 'MOVE_OUT' | 'PUSH' | 'SLIDE_IN' | 'SLIDE_OUT';
/**
 * Direction for directional transitions.
 */
export type TransitionDirection = 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM';
/**
 * Prototype link between nodes.
 */
export interface PrototypeLink {
    /** Unique ID for this link */
    readonly id: string;
    /** Source node that triggers the transition */
    readonly sourceNodeId: NodeId;
    /** Target node (frame) to navigate to */
    readonly targetNodeId: NodeId;
    /** Trigger type */
    readonly trigger: TriggerType;
    /** Transition type */
    readonly transition: TransitionType;
    /** Transition duration in milliseconds */
    readonly duration: number;
    /** Easing for the transition */
    readonly easing: EasingPreset | EasingDefinition;
    /** Direction for directional transitions */
    readonly direction?: TransitionDirection;
    /** Delay before transition starts (for AFTER_TIMEOUT) */
    readonly delay?: number;
    /** Whether to preserve scroll position */
    readonly preserveScrollPosition?: boolean;
    /** Overlay settings (for opening overlays) */
    readonly overlay?: OverlaySettings;
}
/**
 * Overlay settings for modal/popup transitions.
 */
export interface OverlaySettings {
    /** Position of overlay relative to trigger */
    readonly position: 'CENTER' | 'TOP_LEFT' | 'TOP_CENTER' | 'TOP_RIGHT' | 'CENTER_LEFT' | 'CENTER_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_CENTER' | 'BOTTOM_RIGHT' | 'MANUAL';
    /** Manual position offset */
    readonly offsetX?: number;
    readonly offsetY?: number;
    /** Background behind overlay */
    readonly background?: 'NONE' | 'DIM' | 'BLUR';
    /** Background opacity (0-1) */
    readonly backgroundOpacity?: number;
    /** Close when clicking outside */
    readonly closeOnOutsideClick?: boolean;
}
/**
 * Scroll behavior settings.
 */
export interface ScrollBehavior {
    /** Scroll type */
    readonly type: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'BOTH';
    /** Show scrollbars */
    readonly showScrollbars?: boolean;
    /** Scroll position animation */
    readonly animateScroll?: boolean;
}
/**
 * Create a prototype link.
 */
export declare function createPrototypeLink(sourceNodeId: NodeId, targetNodeId: NodeId, options?: {
    trigger?: TriggerType;
    transition?: TransitionType;
    duration?: number;
    easing?: EasingPreset | EasingDefinition;
    direction?: TransitionDirection;
    delay?: number;
}): PrototypeLink;
//# sourceMappingURL=transition.d.ts.map