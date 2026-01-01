/**
 * Constraint solver tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ConstraintSolver, createConstraintSolver, } from '@layout/solver/constraint-solver';
import { generateNodeId } from '@core/utils/uuid';
describe('ConstraintSolver', () => {
    let solver;
    beforeEach(() => {
        solver = createConstraintSolver();
    });
    describe('variable management', () => {
        it('creates variables on demand', () => {
            const id = generateNodeId();
            const x = solver.x(id);
            expect(x).toBeDefined();
            expect(solver.variableCount).toBe(1);
        });
        it('reuses existing variables', () => {
            const id = generateNodeId();
            const x1 = solver.x(id);
            const x2 = solver.x(id);
            expect(x1).toBe(x2);
            expect(solver.variableCount).toBe(1);
        });
        it('creates separate variables for different properties', () => {
            const id = generateNodeId();
            solver.x(id);
            solver.y(id);
            solver.width(id);
            solver.height(id);
            expect(solver.variableCount).toBe(4);
        });
        it('creates separate variables for different nodes', () => {
            const id1 = generateNodeId();
            const id2 = generateNodeId();
            solver.x(id1);
            solver.x(id2);
            expect(solver.variableCount).toBe(2);
        });
    });
    describe('expressions', () => {
        it('creates right expression (x + width)', () => {
            const id = generateNodeId();
            const right = solver.right(id);
            expect(right).toBeDefined();
            // Should have created 2 variables
            expect(solver.variableCount).toBe(2);
        });
        it('creates bottom expression (y + height)', () => {
            const id = generateNodeId();
            const bottom = solver.bottom(id);
            expect(bottom).toBeDefined();
            expect(solver.variableCount).toBe(2);
        });
        it('creates centerX expression', () => {
            const id = generateNodeId();
            const center = solver.centerX(id);
            expect(center).toBeDefined();
        });
        it('creates centerY expression', () => {
            const id = generateNodeId();
            const center = solver.centerY(id);
            expect(center).toBeDefined();
        });
    });
    describe('constraint management', () => {
        it('hasConstraint returns correct status', () => {
            const id = generateNodeId();
            expect(solver.hasConstraint('test')).toBe(false);
            solver.addValueConstraint('test', solver.x(id), 50);
            expect(solver.hasConstraint('test')).toBe(true);
        });
        it('removeConstraint removes constraint', () => {
            const id = generateNodeId();
            solver.addValueConstraint('test', solver.x(id), 50);
            expect(solver.constraintCount).toBe(1);
            solver.removeConstraint('test');
            expect(solver.constraintCount).toBe(0);
            expect(solver.hasConstraint('test')).toBe(false);
        });
        it('adding constraint with same ID replaces previous', () => {
            const id = generateNodeId();
            solver.addValueConstraint('test', solver.x(id), 50);
            solver.addValueConstraint('test', solver.x(id), 100);
            expect(solver.constraintCount).toBe(1);
        });
    });
    describe('getNodeLayout', () => {
        it('returns layout result structure', () => {
            const id = generateNodeId();
            // Create variables for all layout properties
            solver.x(id);
            solver.y(id);
            solver.width(id);
            solver.height(id);
            const layout = solver.getNodeLayout(id);
            expect(layout.nodeId).toBe(id);
            expect(typeof layout.x).toBe('number');
            expect(typeof layout.y).toBe('number');
            expect(typeof layout.width).toBe('number');
            expect(typeof layout.height).toBe('number');
        });
    });
    describe('getAllLayouts', () => {
        it('returns layouts for all nodes with variables', () => {
            const n1 = generateNodeId();
            const n2 = generateNodeId();
            solver.x(n1);
            solver.y(n1);
            solver.width(n1);
            solver.height(n1);
            solver.x(n2);
            solver.y(n2);
            solver.width(n2);
            solver.height(n2);
            const layouts = solver.getAllLayouts();
            expect(layouts.size).toBe(2);
            expect(layouts.has(n1)).toBe(true);
            expect(layouts.has(n2)).toBe(true);
        });
    });
    describe('clear and reset', () => {
        it('clear removes all constraints and variables', () => {
            const id = generateNodeId();
            solver.addValueConstraint('test', solver.x(id), 10);
            expect(solver.constraintCount).toBeGreaterThan(0);
            expect(solver.variableCount).toBeGreaterThan(0);
            solver.clear();
            expect(solver.constraintCount).toBe(0);
            expect(solver.variableCount).toBe(0);
        });
        it('reset creates fresh solver', () => {
            const id = generateNodeId();
            solver.addValueConstraint('test', solver.x(id), 10);
            solver.reset();
            expect(solver.constraintCount).toBe(0);
            expect(solver.variableCount).toBe(0);
        });
    });
    describe('factory function', () => {
        it('createConstraintSolver creates a new solver', () => {
            const newSolver = createConstraintSolver();
            expect(newSolver).toBeInstanceOf(ConstraintSolver);
            expect(newSolver.constraintCount).toBe(0);
            expect(newSolver.variableCount).toBe(0);
        });
    });
});
//# sourceMappingURL=constraint-solver.test.js.map