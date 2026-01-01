/**
 * Layout constraints for Figma-style constraint system
 *
 * Constraints define how a child node is positioned and sized
 * relative to its parent when the parent resizes.
 */
import type { NodeId, ConstraintType } from '@core/types/common';
import type { ConstraintSolver, ConstraintStrength } from '../solver/constraint-solver';
/**
 * Constraint configuration for a node
 */
export interface LayoutConstraints {
    readonly horizontal: ConstraintType;
    readonly vertical: ConstraintType;
}
/**
 * Default constraints (top-left pinned)
 */
export declare const DEFAULT_CONSTRAINTS: LayoutConstraints;
/**
 * Apply horizontal constraint between parent and child.
 */
export declare function applyHorizontalConstraint(solver: ConstraintSolver, parentId: NodeId, childId: NodeId, constraint: ConstraintType, originalOffset: {
    left: number;
    right: number;
    width: number;
}, strength?: ConstraintStrength): void;
/**
 * Apply vertical constraint between parent and child.
 */
export declare function applyVerticalConstraint(solver: ConstraintSolver, parentId: NodeId, childId: NodeId, constraint: ConstraintType, originalOffset: {
    top: number;
    bottom: number;
    height: number;
}, strength?: ConstraintStrength): void;
/**
 * Calculate original offsets from parent for constraint calculations.
 */
export declare function calculateOffsets(parentBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
}, childBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
}): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
};
/**
 * Apply both horizontal and vertical constraints.
 */
export declare function applyConstraints(solver: ConstraintSolver, parentId: NodeId, childId: NodeId, constraints: LayoutConstraints, parentBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
}, childBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
}, strength?: ConstraintStrength): void;
/**
 * Remove all constraints between parent and child.
 */
export declare function removeConstraints(solver: ConstraintSolver, parentId: NodeId, childId: NodeId): void;
//# sourceMappingURL=layout-constraints.d.ts.map