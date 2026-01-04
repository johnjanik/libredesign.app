/**
 * Auto Layout - Flexbox-like layout for DesignLibre
 *
 * Implements automatic layout similar to Figma's Auto Layout,
 * which is based on flexbox concepts.
 */

import type { NodeId, AutoLayoutProps, AutoLayoutMode, AxisAlign, CounterAxisAlign } from '@core/types/common';
import type { ConstraintSolver, ConstraintStrength } from '../solver/constraint-solver';
import * as kiwi from 'kiwi.js';

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
export function calculateAutoLayout(config: AutoLayoutConfig): AutoLayoutResult[] {
  const {
    mode,
    itemSpacing,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    primaryAxisAlignItems,
    counterAxisAlignItems,
    children,
    containerWidth,
    containerHeight,
  } = config;

  console.log('[DEBUG calculateAutoLayout] mode:', mode, 'container:', containerWidth, 'x', containerHeight);
  console.log('[DEBUG calculateAutoLayout] children:', children.map(c => ({ id: c.nodeId, w: c.width, h: c.height })));

  if (children.length === 0 || mode === 'NONE') {
    return [];
  }

  const isHorizontal = mode === 'HORIZONTAL';

  // Calculate content dimensions
  let totalMainSize = 0;
  let maxCrossSize = 0;

  for (const child of children) {
    const mainSize = isHorizontal ? child.width : child.height;
    const crossSize = isHorizontal ? child.height : child.width;
    totalMainSize += mainSize;
    maxCrossSize = Math.max(maxCrossSize, crossSize);
  }

  // Add gaps
  totalMainSize += itemSpacing * (children.length - 1);

  // Determine container dimensions
  const availableWidth = containerWidth !== undefined
    ? containerWidth - paddingLeft - paddingRight
    : totalMainSize;
  const availableHeight = containerHeight !== undefined
    ? containerHeight - paddingTop - paddingBottom
    : maxCrossSize;

  const availableMainSize = isHorizontal ? availableWidth : availableHeight;
  const availableCrossSize = isHorizontal ? availableHeight : availableWidth;

  // Calculate flex distribution
  let totalFlexGrow = 0;
  let totalFlexShrink = 0;
  let fixedMainSize = 0;

  for (const child of children) {
    const mainSize = isHorizontal ? child.width : child.height;
    const flexGrow = child.flexGrow ?? 0;
    const flexShrink = child.flexShrink ?? 1;

    if (flexGrow > 0) {
      totalFlexGrow += flexGrow;
    } else {
      fixedMainSize += mainSize;
    }
    totalFlexShrink += flexShrink;
  }

  fixedMainSize += itemSpacing * (children.length - 1);

  // Calculate remaining space
  const remainingSpace = availableMainSize - fixedMainSize;
  const isGrowing = remainingSpace > 0 && totalFlexGrow > 0;
  const isShrinking = remainingSpace < 0 && totalFlexShrink > 0;

  // Calculate sizes for each child
  const childSizes: { main: number; cross: number }[] = [];

  for (const child of children) {
    const baseMainSize = isHorizontal ? child.width : child.height;
    const baseCrossSize = isHorizontal ? child.height : child.width;
    const flexGrow = child.flexGrow ?? 0;
    const flexShrink = child.flexShrink ?? 1;

    let mainSize = baseMainSize;

    if (isGrowing && flexGrow > 0) {
      // Distribute extra space based on flex-grow
      mainSize = (flexGrow / totalFlexGrow) * availableMainSize;
    } else if (isShrinking && flexShrink > 0) {
      // Shrink based on flex-shrink
      const shrinkAmount = (-remainingSpace * flexShrink) / totalFlexShrink;
      mainSize = Math.max(0, baseMainSize - shrinkAmount);
    }

    childSizes.push({ main: mainSize, cross: baseCrossSize });
  }

  // Calculate total size after flex
  const totalMainAfterFlex = childSizes.reduce((sum, s) => sum + s.main, 0) + itemSpacing * (children.length - 1);

  // Calculate starting position based on primary alignment
  let mainPosition: number;
  let mainGap = itemSpacing;

  switch (primaryAxisAlignItems) {
    case 'MIN':
      mainPosition = isHorizontal ? paddingLeft : paddingTop;
      break;
    case 'MAX':
      mainPosition = (isHorizontal ? paddingLeft : paddingTop) + availableMainSize - totalMainAfterFlex;
      break;
    case 'CENTER':
      mainPosition = (isHorizontal ? paddingLeft : paddingTop) + (availableMainSize - totalMainAfterFlex) / 2;
      break;
    case 'SPACE_BETWEEN':
      mainPosition = isHorizontal ? paddingLeft : paddingTop;
      if (children.length > 1) {
        const totalChildMain = childSizes.reduce((sum, s) => sum + s.main, 0);
        mainGap = (availableMainSize - totalChildMain) / (children.length - 1);
      }
      break;
    default:
      mainPosition = isHorizontal ? paddingLeft : paddingTop;
  }

  // Position children
  const results: AutoLayoutResult[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    const size = childSizes[i]!;
    const alignSelf = child.alignSelf ?? counterAxisAlignItems;

    // Calculate cross position based on alignment
    let crossPosition: number;
    let crossSize = size.cross;

    switch (alignSelf) {
      case 'MIN':
        crossPosition = isHorizontal ? paddingTop : paddingLeft;
        break;
      case 'MAX':
        crossPosition = (isHorizontal ? paddingTop : paddingLeft) + availableCrossSize - crossSize;
        break;
      case 'CENTER':
        crossPosition = (isHorizontal ? paddingTop : paddingLeft) + (availableCrossSize - crossSize) / 2;
        break;
      case 'BASELINE':
        // For baseline, just align to top for now (proper baseline needs text metrics)
        crossPosition = isHorizontal ? paddingTop : paddingLeft;
        break;
      default:
        crossPosition = isHorizontal ? paddingTop : paddingLeft;
    }

    // Create result based on direction
    if (isHorizontal) {
      results.push({
        nodeId: child.nodeId,
        x: mainPosition,
        y: crossPosition,
        width: size.main,
        height: crossSize,
      });
    } else {
      results.push({
        nodeId: child.nodeId,
        x: crossPosition,
        y: mainPosition,
        width: crossSize,
        height: size.main,
      });
    }

    mainPosition += size.main + mainGap;
  }

  console.log('[DEBUG calculateAutoLayout] results:', results.map(r => ({ id: r.nodeId, x: r.x, y: r.y, w: r.width, h: r.height })));
  return results;
}

/**
 * Apply auto layout constraints to the solver.
 */
export function applyAutoLayoutConstraints(
  solver: ConstraintSolver,
  containerId: NodeId,
  config: AutoLayoutConfig,
  strength: ConstraintStrength = 'strong'
): void {
  const results = calculateAutoLayout(config);
  const prefix = `autolayout:${containerId}`;

  // Clear existing auto layout constraints
  for (const child of config.children) {
    solver.removeConstraint(`${prefix}:${child.nodeId}:x`);
    solver.removeConstraint(`${prefix}:${child.nodeId}:y`);
    solver.removeConstraint(`${prefix}:${child.nodeId}:w`);
    solver.removeConstraint(`${prefix}:${child.nodeId}:h`);
  }

  // Apply calculated positions and sizes
  for (const result of results) {
    const nodePrefix = `${prefix}:${result.nodeId}`;

    // Position relative to container
    solver.addEquality(
      `${nodePrefix}:x`,
      new kiwi.Expression(
        solver.x(result.nodeId),
        [-1, solver.x(containerId)],
        -result.x
      ),
      strength
    );

    solver.addEquality(
      `${nodePrefix}:y`,
      new kiwi.Expression(
        solver.y(result.nodeId),
        [-1, solver.y(containerId)],
        -result.y
      ),
      strength
    );

    // Size constraints
    solver.addValueConstraint(
      `${nodePrefix}:w`,
      solver.width(result.nodeId),
      result.width,
      strength
    );

    solver.addValueConstraint(
      `${nodePrefix}:h`,
      solver.height(result.nodeId),
      result.height,
      strength
    );
  }
}

/**
 * Calculate the minimum size needed for an auto layout container.
 */
export function calculateAutoLayoutMinSize(config: AutoLayoutConfig): { width: number; height: number } {
  const {
    mode,
    itemSpacing,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    children,
  } = config;

  if (children.length === 0 || mode === 'NONE') {
    return {
      width: paddingLeft + paddingRight,
      height: paddingTop + paddingBottom,
    };
  }

  const isHorizontal = mode === 'HORIZONTAL';

  let totalMainSize = 0;
  let maxCrossSize = 0;

  for (const child of children) {
    const mainSize = isHorizontal ? child.width : child.height;
    const crossSize = isHorizontal ? child.height : child.width;
    totalMainSize += mainSize;
    maxCrossSize = Math.max(maxCrossSize, crossSize);
  }

  totalMainSize += itemSpacing * (children.length - 1);

  if (isHorizontal) {
    return {
      width: paddingLeft + totalMainSize + paddingRight,
      height: paddingTop + maxCrossSize + paddingBottom,
    };
  } else {
    return {
      width: paddingLeft + maxCrossSize + paddingRight,
      height: paddingTop + totalMainSize + paddingBottom,
    };
  }
}

/**
 * Determine if resizing a container would require re-layout.
 */
export function needsRelayout(
  config: AutoLayoutConfig,
  oldSize: { width: number; height: number },
  newSize: { width: number; height: number }
): boolean {
  const isHorizontal = config.mode === 'HORIZONTAL';

  // Check if main axis changed
  if (isHorizontal && oldSize.width !== newSize.width) {
    return true;
  }
  if (!isHorizontal && oldSize.height !== newSize.height) {
    return true;
  }

  // Check if cross axis changed and any child uses stretch
  const crossAxisChanged = isHorizontal
    ? oldSize.height !== newSize.height
    : oldSize.width !== newSize.width;

  if (crossAxisChanged) {
    // Baseline doesn't stretch, so check for it
    const hasStretchChild = config.children.some(
      (c) => {
        const align = c.alignSelf ?? config.counterAxisAlignItems;
        // There's no STRETCH in CounterAxisAlign, items fill available space by default
        return align !== 'BASELINE';
      }
    );
    if (hasStretchChild) {
      return true;
    }
  }

  return false;
}

/**
 * Create AutoLayoutConfig from AutoLayoutProps.
 */
export function createAutoLayoutConfig(
  props: AutoLayoutProps,
  children: readonly AutoLayoutChild[],
  containerWidth?: number,
  containerHeight?: number
): AutoLayoutConfig {
  return {
    mode: props.mode,
    itemSpacing: props.itemSpacing,
    paddingTop: props.paddingTop,
    paddingRight: props.paddingRight,
    paddingBottom: props.paddingBottom,
    paddingLeft: props.paddingLeft,
    primaryAxisAlignItems: props.primaryAxisAlignItems,
    counterAxisAlignItems: props.counterAxisAlignItems,
    children,
    containerWidth,
    containerHeight,
  };
}
