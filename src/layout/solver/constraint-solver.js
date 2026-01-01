/**
 * Constraint solver wrapper using Kiwi.js
 *
 * Provides a simplified API for creating and solving layout constraints
 * using the Cassowary-style constraint solver.
 */
import * as kiwi from 'kiwi.js';
/**
 * Maps our strength levels to Kiwi strengths
 */
const STRENGTH_MAP = {
    required: kiwi.Strength.required,
    strong: kiwi.Strength.strong,
    medium: kiwi.Strength.medium,
    weak: kiwi.Strength.weak,
};
/**
 * Constraint solver - wraps Kiwi.js for layout calculations
 */
export class ConstraintSolver {
    solver;
    variables = new Map();
    constraints = new Map();
    constructor() {
        this.solver = new kiwi.Solver();
    }
    // =========================================================================
    // Variable Management
    // =========================================================================
    /**
     * Get or create a variable for a node property.
     */
    getVariable(nodeId, property) {
        const key = `${nodeId}:${property}`;
        let layoutVar = this.variables.get(key);
        if (!layoutVar) {
            const variable = new kiwi.Variable(key);
            layoutVar = { nodeId, property, variable };
            this.variables.set(key, layoutVar);
        }
        return layoutVar.variable;
    }
    /**
     * Get the X variable for a node.
     */
    x(nodeId) {
        return this.getVariable(nodeId, 'x');
    }
    /**
     * Get the Y variable for a node.
     */
    y(nodeId) {
        return this.getVariable(nodeId, 'y');
    }
    /**
     * Get the width variable for a node.
     */
    width(nodeId) {
        return this.getVariable(nodeId, 'width');
    }
    /**
     * Get the height variable for a node.
     */
    height(nodeId) {
        return this.getVariable(nodeId, 'height');
    }
    /**
     * Get the right edge (x + width) expression for a node.
     */
    right(nodeId) {
        return new kiwi.Expression(this.x(nodeId), this.width(nodeId));
    }
    /**
     * Get the bottom edge (y + height) expression for a node.
     */
    bottom(nodeId) {
        return new kiwi.Expression(this.y(nodeId), this.height(nodeId));
    }
    /**
     * Get the center X (x + width/2) expression for a node.
     */
    centerX(nodeId) {
        return new kiwi.Expression(this.x(nodeId), [0.5, this.width(nodeId)]);
    }
    /**
     * Get the center Y (y + height/2) expression for a node.
     */
    centerY(nodeId) {
        return new kiwi.Expression(this.y(nodeId), [0.5, this.height(nodeId)]);
    }
    // =========================================================================
    // Constraint Management
    // =========================================================================
    /**
     * Add an equality constraint: expression == 0
     */
    addEquality(id, expression, strength = 'required') {
        const constraint = new kiwi.Constraint(expression, kiwi.Operator.Eq, STRENGTH_MAP[strength]);
        this.addConstraintInternal(id, constraint);
    }
    /**
     * Add a less-than-or-equal constraint: expression <= 0
     */
    addLessOrEqual(id, expression, strength = 'required') {
        const constraint = new kiwi.Constraint(expression, kiwi.Operator.Le, STRENGTH_MAP[strength]);
        this.addConstraintInternal(id, constraint);
    }
    /**
     * Add a greater-than-or-equal constraint: expression >= 0
     */
    addGreaterOrEqual(id, expression, strength = 'required') {
        const constraint = new kiwi.Constraint(expression, kiwi.Operator.Ge, STRENGTH_MAP[strength]);
        this.addConstraintInternal(id, constraint);
    }
    /**
     * Add a constraint that a variable equals a constant.
     */
    addValueConstraint(id, variable, value, strength = 'required') {
        // expression: variable - value == 0
        const expression = new kiwi.Expression(variable, -value);
        this.addEquality(id, expression, strength);
    }
    /**
     * Add a constraint that variable1 == variable2 + offset.
     */
    addRelationConstraint(id, variable1, variable2, offset = 0, strength = 'required') {
        // expression: variable1 - variable2 - offset == 0
        const expression = new kiwi.Expression(variable1, [-1, variable2], -offset);
        this.addEquality(id, expression, strength);
    }
    /**
     * Remove a constraint by ID.
     */
    removeConstraint(id) {
        const constraint = this.constraints.get(id);
        if (constraint) {
            try {
                this.solver.removeConstraint(constraint);
            }
            catch {
                // Constraint may not be in solver
            }
            this.constraints.delete(id);
        }
    }
    /**
     * Check if a constraint exists.
     */
    hasConstraint(id) {
        return this.constraints.has(id);
    }
    /**
     * Internal method to add a constraint.
     */
    addConstraintInternal(id, constraint) {
        // Remove existing constraint with same ID
        this.removeConstraint(id);
        this.constraints.set(id, constraint);
        this.solver.addConstraint(constraint);
    }
    // =========================================================================
    // Edit Variables (for dragging)
    // =========================================================================
    /**
     * Suggest a value for a variable (for interactive editing).
     */
    suggestValue(variable, value) {
        try {
            if (!this.solver.hasEditVariable(variable)) {
                this.solver.addEditVariable(variable, kiwi.Strength.strong);
            }
            this.solver.suggestValue(variable, value);
        }
        catch {
            // Variable may not be editable
        }
    }
    /**
     * Remove an edit variable.
     */
    removeEditVariable(variable) {
        try {
            if (this.solver.hasEditVariable(variable)) {
                this.solver.removeEditVariable(variable);
            }
        }
        catch {
            // Variable may not exist
        }
    }
    // =========================================================================
    // Solving
    // =========================================================================
    /**
     * Update the solver and calculate new values.
     */
    solve() {
        this.solver.updateVariables();
    }
    /**
     * Get the solved value for a variable.
     */
    getValue(variable) {
        return variable.value();
    }
    /**
     * Get the layout result for a node.
     */
    getNodeLayout(nodeId) {
        return {
            nodeId,
            x: this.x(nodeId).value(),
            y: this.y(nodeId).value(),
            width: this.width(nodeId).value(),
            height: this.height(nodeId).value(),
        };
    }
    /**
     * Get layout results for all nodes with variables.
     */
    getAllLayouts() {
        const nodeIds = new Set();
        for (const layoutVar of this.variables.values()) {
            nodeIds.add(layoutVar.nodeId);
        }
        const results = new Map();
        for (const nodeId of nodeIds) {
            results.set(nodeId, this.getNodeLayout(nodeId));
        }
        return results;
    }
    // =========================================================================
    // Utility Methods
    // =========================================================================
    /**
     * Clear all constraints and variables.
     */
    clear() {
        // Remove all constraints
        for (const constraint of this.constraints.values()) {
            try {
                this.solver.removeConstraint(constraint);
            }
            catch {
                // Ignore errors
            }
        }
        this.constraints.clear();
        this.variables.clear();
    }
    /**
     * Reset the solver completely.
     */
    reset() {
        this.clear();
        this.solver = new kiwi.Solver();
    }
    /**
     * Get the number of constraints.
     */
    get constraintCount() {
        return this.constraints.size;
    }
    /**
     * Get the number of variables.
     */
    get variableCount() {
        return this.variables.size;
    }
}
/**
 * Create a new constraint solver.
 */
export function createConstraintSolver() {
    return new ConstraintSolver();
}
// ============================================================================
// Helper Functions for Common Constraints
// ============================================================================
/**
 * Create constraints to contain a child within a parent with padding.
 */
export function createContainmentConstraints(solver, parentId, childId, padding) {
    const prefix = `contain:${parentId}:${childId}`;
    // Child left >= parent left + padding
    solver.addGreaterOrEqual(`${prefix}:left`, new kiwi.Expression(solver.x(childId), [-1, solver.x(parentId)], -padding.left));
    // Child top >= parent top + padding
    solver.addGreaterOrEqual(`${prefix}:top`, new kiwi.Expression(solver.y(childId), [-1, solver.y(parentId)], -padding.top));
    // Child right <= parent right - padding
    solver.addLessOrEqual(`${prefix}:right`, new kiwi.Expression(solver.right(childId), new kiwi.Expression([-1, solver.right(parentId)]), padding.right));
    // Child bottom <= parent bottom - padding
    solver.addLessOrEqual(`${prefix}:bottom`, new kiwi.Expression(solver.bottom(childId), new kiwi.Expression([-1, solver.bottom(parentId)]), padding.bottom));
}
/**
 * Create constraints to align a child within a parent.
 */
export function createAlignmentConstraints(solver, parentId, childId, horizontalAlign, verticalAlign, strength = 'medium') {
    const prefix = `align:${parentId}:${childId}`;
    // Horizontal alignment
    switch (horizontalAlign) {
        case 'left':
            solver.addRelationConstraint(`${prefix}:h`, solver.x(childId), solver.x(parentId), 0, strength);
            break;
        case 'center':
            solver.addEquality(`${prefix}:h`, new kiwi.Expression(solver.centerX(childId), new kiwi.Expression([-1], solver.centerX(parentId))), strength);
            break;
        case 'right':
            solver.addEquality(`${prefix}:h`, new kiwi.Expression(solver.right(childId), new kiwi.Expression([-1], solver.right(parentId))), strength);
            break;
        case 'stretch':
            solver.addRelationConstraint(`${prefix}:h:left`, solver.x(childId), solver.x(parentId), 0, strength);
            solver.addEquality(`${prefix}:h:width`, new kiwi.Expression(solver.width(childId), [-1, solver.width(parentId)]), strength);
            break;
    }
    // Vertical alignment
    switch (verticalAlign) {
        case 'top':
            solver.addRelationConstraint(`${prefix}:v`, solver.y(childId), solver.y(parentId), 0, strength);
            break;
        case 'center':
            solver.addEquality(`${prefix}:v`, new kiwi.Expression(solver.centerY(childId), new kiwi.Expression([-1], solver.centerY(parentId))), strength);
            break;
        case 'bottom':
            solver.addEquality(`${prefix}:v`, new kiwi.Expression(solver.bottom(childId), new kiwi.Expression([-1], solver.bottom(parentId))), strength);
            break;
        case 'stretch':
            solver.addRelationConstraint(`${prefix}:v:top`, solver.y(childId), solver.y(parentId), 0, strength);
            solver.addEquality(`${prefix}:v:height`, new kiwi.Expression(solver.height(childId), [-1, solver.height(parentId)]), strength);
            break;
    }
}
/**
 * Create constraints for fixed dimensions.
 */
export function createSizeConstraints(solver, nodeId, size, strength = 'required') {
    const prefix = `size:${nodeId}`;
    if (size.width !== undefined) {
        solver.addValueConstraint(`${prefix}:w`, solver.width(nodeId), size.width, strength);
    }
    if (size.height !== undefined) {
        solver.addValueConstraint(`${prefix}:h`, solver.height(nodeId), size.height, strength);
    }
}
/**
 * Create constraints for fixed position.
 */
export function createPositionConstraints(solver, nodeId, position, strength = 'required') {
    const prefix = `pos:${nodeId}`;
    if (position.x !== undefined) {
        solver.addValueConstraint(`${prefix}:x`, solver.x(nodeId), position.x, strength);
    }
    if (position.y !== undefined) {
        solver.addValueConstraint(`${prefix}:y`, solver.y(nodeId), position.y, strength);
    }
}
//# sourceMappingURL=constraint-solver.js.map