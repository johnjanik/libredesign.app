/**
 * Layout constraints for Figma-style constraint system
 *
 * Constraints define how a child node is positioned and sized
 * relative to its parent when the parent resizes.
 */

import type { NodeId, ConstraintType } from '@core/types/common';
import type { ConstraintSolver, ConstraintStrength } from '../solver/constraint-solver';
import * as kiwi from 'kiwi.js';

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
export const DEFAULT_CONSTRAINTS: LayoutConstraints = {
  horizontal: 'MIN',
  vertical: 'MIN',
};

/**
 * Apply horizontal constraint between parent and child.
 */
export function applyHorizontalConstraint(
  solver: ConstraintSolver,
  parentId: NodeId,
  childId: NodeId,
  constraint: ConstraintType,
  originalOffset: { left: number; right: number; width: number },
  strength: ConstraintStrength = 'strong'
): void {
  const prefix = `hconstraint:${parentId}:${childId}`;

  // Remove existing constraints
  solver.removeConstraint(`${prefix}:min`);
  solver.removeConstraint(`${prefix}:max`);
  solver.removeConstraint(`${prefix}:center`);
  solver.removeConstraint(`${prefix}:scale`);
  solver.removeConstraint(`${prefix}:stretch:left`);
  solver.removeConstraint(`${prefix}:stretch:right`);

  switch (constraint) {
    case 'MIN':
      // Pin to left edge
      solver.addValueConstraint(
        `${prefix}:min`,
        solver.x(childId),
        solver.x(parentId).value() + originalOffset.left,
        strength
      );
      break;

    case 'MAX':
      // Pin to right edge
      solver.addEquality(
        `${prefix}:max`,
        new kiwi.Expression(
          solver.right(childId),
          new kiwi.Expression([-1], solver.right(parentId)),
          originalOffset.right
        ),
        strength
      );
      break;

    case 'CENTER':
      // Center horizontally (maintain center offset)
      solver.addEquality(
        `${prefix}:center`,
        new kiwi.Expression(
          solver.centerX(childId),
          new kiwi.Expression([-1], solver.centerX(parentId))
        ),
        strength
      );
      break;

    case 'SCALE':
      // Scale with parent (maintain proportional position)
      // x = parentX + (originalOffset.left / originalParentWidth) * parentWidth
      // This requires knowing original parent width, simplified here
      solver.addEquality(
        `${prefix}:scale`,
        new kiwi.Expression(
          solver.x(childId),
          [-1, solver.x(parentId)],
          -originalOffset.left
        ),
        strength
      );
      break;

    case 'STRETCH':
      // Pin to both edges (stretch width)
      solver.addEquality(
        `${prefix}:stretch:left`,
        new kiwi.Expression(
          solver.x(childId),
          [-1, solver.x(parentId)],
          -originalOffset.left
        ),
        strength
      );
      solver.addEquality(
        `${prefix}:stretch:right`,
        new kiwi.Expression(
          solver.right(childId),
          new kiwi.Expression([-1], solver.right(parentId)),
          originalOffset.right
        ),
        strength
      );
      break;
  }
}

/**
 * Apply vertical constraint between parent and child.
 */
export function applyVerticalConstraint(
  solver: ConstraintSolver,
  parentId: NodeId,
  childId: NodeId,
  constraint: ConstraintType,
  originalOffset: { top: number; bottom: number; height: number },
  strength: ConstraintStrength = 'strong'
): void {
  const prefix = `vconstraint:${parentId}:${childId}`;

  // Remove existing constraints
  solver.removeConstraint(`${prefix}:min`);
  solver.removeConstraint(`${prefix}:max`);
  solver.removeConstraint(`${prefix}:center`);
  solver.removeConstraint(`${prefix}:scale`);
  solver.removeConstraint(`${prefix}:stretch:top`);
  solver.removeConstraint(`${prefix}:stretch:bottom`);

  switch (constraint) {
    case 'MIN':
      // Pin to top edge
      solver.addValueConstraint(
        `${prefix}:min`,
        solver.y(childId),
        solver.y(parentId).value() + originalOffset.top,
        strength
      );
      break;

    case 'MAX':
      // Pin to bottom edge
      solver.addEquality(
        `${prefix}:max`,
        new kiwi.Expression(
          solver.bottom(childId),
          new kiwi.Expression([-1], solver.bottom(parentId)),
          originalOffset.bottom
        ),
        strength
      );
      break;

    case 'CENTER':
      // Center vertically (maintain center offset)
      solver.addEquality(
        `${prefix}:center`,
        new kiwi.Expression(
          solver.centerY(childId),
          new kiwi.Expression([-1], solver.centerY(parentId))
        ),
        strength
      );
      break;

    case 'SCALE':
      // Scale with parent (maintain proportional position)
      solver.addEquality(
        `${prefix}:scale`,
        new kiwi.Expression(
          solver.y(childId),
          [-1, solver.y(parentId)],
          -originalOffset.top
        ),
        strength
      );
      break;

    case 'STRETCH':
      // Pin to both edges (stretch height)
      solver.addEquality(
        `${prefix}:stretch:top`,
        new kiwi.Expression(
          solver.y(childId),
          [-1, solver.y(parentId)],
          -originalOffset.top
        ),
        strength
      );
      solver.addEquality(
        `${prefix}:stretch:bottom`,
        new kiwi.Expression(
          solver.bottom(childId),
          new kiwi.Expression([-1], solver.bottom(parentId)),
          originalOffset.bottom
        ),
        strength
      );
      break;
  }
}

/**
 * Calculate original offsets from parent for constraint calculations.
 */
export function calculateOffsets(
  parentBounds: { x: number; y: number; width: number; height: number },
  childBounds: { x: number; y: number; width: number; height: number }
): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
} {
  return {
    left: childBounds.x - parentBounds.x,
    right: (parentBounds.x + parentBounds.width) - (childBounds.x + childBounds.width),
    top: childBounds.y - parentBounds.y,
    bottom: (parentBounds.y + parentBounds.height) - (childBounds.y + childBounds.height),
    width: childBounds.width,
    height: childBounds.height,
  };
}

/**
 * Apply both horizontal and vertical constraints.
 */
export function applyConstraints(
  solver: ConstraintSolver,
  parentId: NodeId,
  childId: NodeId,
  constraints: LayoutConstraints,
  parentBounds: { x: number; y: number; width: number; height: number },
  childBounds: { x: number; y: number; width: number; height: number },
  strength: ConstraintStrength = 'strong'
): void {
  const offsets = calculateOffsets(parentBounds, childBounds);

  applyHorizontalConstraint(
    solver,
    parentId,
    childId,
    constraints.horizontal,
    { left: offsets.left, right: offsets.right, width: offsets.width },
    strength
  );

  applyVerticalConstraint(
    solver,
    parentId,
    childId,
    constraints.vertical,
    { top: offsets.top, bottom: offsets.bottom, height: offsets.height },
    strength
  );
}

/**
 * Remove all constraints between parent and child.
 */
export function removeConstraints(
  solver: ConstraintSolver,
  parentId: NodeId,
  childId: NodeId
): void {
  const hPrefix = `hconstraint:${parentId}:${childId}`;
  const vPrefix = `vconstraint:${parentId}:${childId}`;

  // Remove horizontal constraints
  solver.removeConstraint(`${hPrefix}:min`);
  solver.removeConstraint(`${hPrefix}:max`);
  solver.removeConstraint(`${hPrefix}:center`);
  solver.removeConstraint(`${hPrefix}:scale`);
  solver.removeConstraint(`${hPrefix}:stretch:left`);
  solver.removeConstraint(`${hPrefix}:stretch:right`);

  // Remove vertical constraints
  solver.removeConstraint(`${vPrefix}:min`);
  solver.removeConstraint(`${vPrefix}:max`);
  solver.removeConstraint(`${vPrefix}:center`);
  solver.removeConstraint(`${vPrefix}:scale`);
  solver.removeConstraint(`${vPrefix}:stretch:top`);
  solver.removeConstraint(`${vPrefix}:stretch:bottom`);
}
