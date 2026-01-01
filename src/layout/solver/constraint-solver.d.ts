/**
 * Constraint solver wrapper using Kiwi.js
 *
 * Provides a simplified API for creating and solving layout constraints
 * using the Cassowary-style constraint solver.
 */
import * as kiwi from 'kiwi.js';
import type { NodeId } from '@core/types/common';
/**
 * Constraint strength levels
 */
export type ConstraintStrength = 'required' | 'strong' | 'medium' | 'weak';
/**
 * Variable representing a layout property
 */
export interface LayoutVariable {
    readonly nodeId: NodeId;
    readonly property: 'x' | 'y' | 'width' | 'height';
    readonly variable: kiwi.Variable;
}
/**
 * Constraint definition
 */
export interface ConstraintDef {
    readonly id: string;
    readonly expression: kiwi.Expression;
    readonly operator: 'eq' | 'le' | 'ge';
    readonly strength: ConstraintStrength;
}
/**
 * Node layout result
 */
export interface LayoutResult {
    readonly nodeId: NodeId;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}
/**
 * Constraint solver - wraps Kiwi.js for layout calculations
 */
export declare class ConstraintSolver {
    private solver;
    private variables;
    private constraints;
    constructor();
    /**
     * Get or create a variable for a node property.
     */
    getVariable(nodeId: NodeId, property: 'x' | 'y' | 'width' | 'height'): kiwi.Variable;
    /**
     * Get the X variable for a node.
     */
    x(nodeId: NodeId): kiwi.Variable;
    /**
     * Get the Y variable for a node.
     */
    y(nodeId: NodeId): kiwi.Variable;
    /**
     * Get the width variable for a node.
     */
    width(nodeId: NodeId): kiwi.Variable;
    /**
     * Get the height variable for a node.
     */
    height(nodeId: NodeId): kiwi.Variable;
    /**
     * Get the right edge (x + width) expression for a node.
     */
    right(nodeId: NodeId): kiwi.Expression;
    /**
     * Get the bottom edge (y + height) expression for a node.
     */
    bottom(nodeId: NodeId): kiwi.Expression;
    /**
     * Get the center X (x + width/2) expression for a node.
     */
    centerX(nodeId: NodeId): kiwi.Expression;
    /**
     * Get the center Y (y + height/2) expression for a node.
     */
    centerY(nodeId: NodeId): kiwi.Expression;
    /**
     * Add an equality constraint: expression == 0
     */
    addEquality(id: string, expression: kiwi.Expression, strength?: ConstraintStrength): void;
    /**
     * Add a less-than-or-equal constraint: expression <= 0
     */
    addLessOrEqual(id: string, expression: kiwi.Expression, strength?: ConstraintStrength): void;
    /**
     * Add a greater-than-or-equal constraint: expression >= 0
     */
    addGreaterOrEqual(id: string, expression: kiwi.Expression, strength?: ConstraintStrength): void;
    /**
     * Add a constraint that a variable equals a constant.
     */
    addValueConstraint(id: string, variable: kiwi.Variable, value: number, strength?: ConstraintStrength): void;
    /**
     * Add a constraint that variable1 == variable2 + offset.
     */
    addRelationConstraint(id: string, variable1: kiwi.Variable, variable2: kiwi.Variable, offset?: number, strength?: ConstraintStrength): void;
    /**
     * Remove a constraint by ID.
     */
    removeConstraint(id: string): void;
    /**
     * Check if a constraint exists.
     */
    hasConstraint(id: string): boolean;
    /**
     * Internal method to add a constraint.
     */
    private addConstraintInternal;
    /**
     * Suggest a value for a variable (for interactive editing).
     */
    suggestValue(variable: kiwi.Variable, value: number): void;
    /**
     * Remove an edit variable.
     */
    removeEditVariable(variable: kiwi.Variable): void;
    /**
     * Update the solver and calculate new values.
     */
    solve(): void;
    /**
     * Get the solved value for a variable.
     */
    getValue(variable: kiwi.Variable): number;
    /**
     * Get the layout result for a node.
     */
    getNodeLayout(nodeId: NodeId): LayoutResult;
    /**
     * Get layout results for all nodes with variables.
     */
    getAllLayouts(): Map<NodeId, LayoutResult>;
    /**
     * Clear all constraints and variables.
     */
    clear(): void;
    /**
     * Reset the solver completely.
     */
    reset(): void;
    /**
     * Get the number of constraints.
     */
    get constraintCount(): number;
    /**
     * Get the number of variables.
     */
    get variableCount(): number;
}
/**
 * Create a new constraint solver.
 */
export declare function createConstraintSolver(): ConstraintSolver;
/**
 * Create constraints to contain a child within a parent with padding.
 */
export declare function createContainmentConstraints(solver: ConstraintSolver, parentId: NodeId, childId: NodeId, padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
}): void;
/**
 * Create constraints to align a child within a parent.
 */
export declare function createAlignmentConstraints(solver: ConstraintSolver, parentId: NodeId, childId: NodeId, horizontalAlign: 'left' | 'center' | 'right' | 'stretch', verticalAlign: 'top' | 'center' | 'bottom' | 'stretch', strength?: ConstraintStrength): void;
/**
 * Create constraints for fixed dimensions.
 */
export declare function createSizeConstraints(solver: ConstraintSolver, nodeId: NodeId, size: Partial<{
    width: number;
    height: number;
}>, strength?: ConstraintStrength): void;
/**
 * Create constraints for fixed position.
 */
export declare function createPositionConstraints(solver: ConstraintSolver, nodeId: NodeId, position: Partial<{
    x: number;
    y: number;
}>, strength?: ConstraintStrength): void;
//# sourceMappingURL=constraint-solver.d.ts.map