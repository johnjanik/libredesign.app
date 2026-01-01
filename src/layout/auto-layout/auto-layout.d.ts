/**
 * Auto Layout - Flexbox-like layout for DesignLibre
 *
 * Implements automatic layout similar to Figma's Auto Layout,
 * which is based on flexbox concepts.
 */
import type { NodeId, AutoLayoutProps, AutoLayoutMode, AxisAlign, CounterAxisAlign } from '@core/types/common';
import type { ConstraintSolver, ConstraintStrength } from '../solver/constraint-solver';
/**
 * Child item in auto layout
 */
export interface AutoLayoutChild {
    readonly nodeId: NodeId;
    readonly width: number;
    readonly height: number;
    readonly flexGrow?: number;
    readonly flexShrink?: number;
    readonly alignSelf?: CounterAxisAlign;
}
/**
 * Auto layout configuration
 */
export interface AutoLayoutConfig {
    readonly mode: AutoLayoutMode;
    readonly itemSpacing: number;
    readonly paddingTop: number;
    readonly paddingRight: number;
    readonly paddingBottom: number;
    readonly paddingLeft: number;
    readonly primaryAxisAlignItems: AxisAlign;
    readonly counterAxisAlignItems: CounterAxisAlign;
    readonly children: readonly AutoLayoutChild[];
    readonly containerWidth?: number | undefined;
    readonly containerHeight?: number | undefined;
}
/**
 * Result of auto layout calculation
 */
export interface AutoLayoutResult {
    readonly nodeId: NodeId;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}
/**
 * Calculate auto layout positions and sizes.
 * This is a pure calculation without using the constraint solver.
 */
export declare function calculateAutoLayout(config: AutoLayoutConfig): AutoLayoutResult[];
/**
 * Apply auto layout constraints to the solver.
 */
export declare function applyAutoLayoutConstraints(solver: ConstraintSolver, containerId: NodeId, config: AutoLayoutConfig, strength?: ConstraintStrength): void;
/**
 * Calculate the minimum size needed for an auto layout container.
 */
export declare function calculateAutoLayoutMinSize(config: AutoLayoutConfig): {
    width: number;
    height: number;
};
/**
 * Determine if resizing a container would require re-layout.
 */
export declare function needsRelayout(config: AutoLayoutConfig, oldSize: {
    width: number;
    height: number;
}, newSize: {
    width: number;
    height: number;
}): boolean;
/**
 * Create AutoLayoutConfig from AutoLayoutProps.
 */
export declare function createAutoLayoutConfig(props: AutoLayoutProps, children: readonly AutoLayoutChild[], containerWidth?: number, containerHeight?: number): AutoLayoutConfig;
//# sourceMappingURL=auto-layout.d.ts.map