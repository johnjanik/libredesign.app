/**
 * Selection Filters
 *
 * Provides filtering and selection utilities for finding nodes based on:
 * - Node type
 * - Fill color
 * - Stroke color
 * - Stroke width
 * - Similarity to a reference node
 * - Custom properties
 */

import type { NodeId, NodeType } from '@core/types/common';
import type { Paint } from '@core/types/paint';

/**
 * RGB color for comparison
 */
export interface RGBColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a?: number;
}

/**
 * Node data for filtering (minimal interface)
 */
export interface FilterableNode {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly fills?: readonly Paint[];
  readonly strokes?: readonly Paint[];
  readonly strokeWeight?: number;
  readonly width?: number;
  readonly height?: number;
  readonly cornerRadius?: number | readonly number[];
  readonly opacity?: number;
}

/**
 * Filter criteria for selecting nodes
 */
export interface SelectionFilterCriteria {
  /** Filter by node type(s) */
  readonly types?: readonly NodeType[];
  /** Filter by fill color (approximate match) */
  readonly fillColor?: RGBColor;
  /** Filter by stroke color (approximate match) */
  readonly strokeColor?: RGBColor;
  /** Filter by stroke weight range */
  readonly strokeWeight?: { min?: number; max?: number };
  /** Filter by visibility */
  readonly visible?: boolean;
  /** Filter by locked state */
  readonly locked?: boolean;
  /** Filter by name pattern (regex) */
  readonly namePattern?: string | RegExp;
  /** Filter by size range */
  readonly size?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  /** Filter by opacity range */
  readonly opacity?: { min?: number; max?: number };
  /** Custom filter function */
  readonly customFilter?: (node: FilterableNode) => boolean;
}

/**
 * Options for similarity matching
 */
export interface SimilarityOptions {
  /** Match node type */
  readonly matchType?: boolean;
  /** Match fill color (within tolerance) */
  readonly matchFillColor?: boolean;
  /** Match stroke color (within tolerance) */
  readonly matchStrokeColor?: boolean;
  /** Match stroke weight (within tolerance) */
  readonly matchStrokeWeight?: boolean;
  /** Match size (within tolerance) */
  readonly matchSize?: boolean;
  /** Color tolerance (0-255) */
  readonly colorTolerance?: number;
  /** Stroke weight tolerance */
  readonly strokeWeightTolerance?: number;
  /** Size tolerance (percentage) */
  readonly sizeTolerance?: number;
}

const DEFAULT_SIMILARITY_OPTIONS: Required<SimilarityOptions> = {
  matchType: true,
  matchFillColor: true,
  matchStrokeColor: true,
  matchStrokeWeight: true,
  matchSize: false,
  colorTolerance: 10,
  strokeWeightTolerance: 0.5,
  sizeTolerance: 0.1,
};

/**
 * Selection filter utility class
 */
export class SelectionFilter {
  /**
   * Filter nodes by criteria
   */
  static filter(
    nodes: readonly FilterableNode[],
    criteria: SelectionFilterCriteria
  ): FilterableNode[] {
    return nodes.filter(node => this.matchesCriteria(node, criteria));
  }

  /**
   * Check if a node matches the given criteria
   */
  static matchesCriteria(
    node: FilterableNode,
    criteria: SelectionFilterCriteria
  ): boolean {
    // Type filter
    if (criteria.types && criteria.types.length > 0) {
      if (!criteria.types.includes(node.type)) {
        return false;
      }
    }

    // Visibility filter
    if (criteria.visible !== undefined && node.visible !== criteria.visible) {
      return false;
    }

    // Locked filter
    if (criteria.locked !== undefined && node.locked !== criteria.locked) {
      return false;
    }

    // Name pattern filter
    if (criteria.namePattern) {
      const pattern = typeof criteria.namePattern === 'string'
        ? new RegExp(criteria.namePattern, 'i')
        : criteria.namePattern;
      if (!pattern.test(node.name)) {
        return false;
      }
    }

    // Fill color filter
    if (criteria.fillColor && node.fills) {
      const hasFillMatch = node.fills.some(fill =>
        this.paintMatchesColor(fill, criteria.fillColor!)
      );
      if (!hasFillMatch) {
        return false;
      }
    }

    // Stroke color filter
    if (criteria.strokeColor && node.strokes) {
      const hasStrokeMatch = node.strokes.some(stroke =>
        this.paintMatchesColor(stroke, criteria.strokeColor!)
      );
      if (!hasStrokeMatch) {
        return false;
      }
    }

    // Stroke weight filter
    if (criteria.strokeWeight && node.strokeWeight !== undefined) {
      if (criteria.strokeWeight.min !== undefined && node.strokeWeight < criteria.strokeWeight.min) {
        return false;
      }
      if (criteria.strokeWeight.max !== undefined && node.strokeWeight > criteria.strokeWeight.max) {
        return false;
      }
    }

    // Size filter
    if (criteria.size) {
      if (criteria.size.minWidth !== undefined && (node.width ?? 0) < criteria.size.minWidth) {
        return false;
      }
      if (criteria.size.maxWidth !== undefined && (node.width ?? 0) > criteria.size.maxWidth) {
        return false;
      }
      if (criteria.size.minHeight !== undefined && (node.height ?? 0) < criteria.size.minHeight) {
        return false;
      }
      if (criteria.size.maxHeight !== undefined && (node.height ?? 0) > criteria.size.maxHeight) {
        return false;
      }
    }

    // Opacity filter
    if (criteria.opacity) {
      const opacity = node.opacity ?? 1;
      if (criteria.opacity.min !== undefined && opacity < criteria.opacity.min) {
        return false;
      }
      if (criteria.opacity.max !== undefined && opacity > criteria.opacity.max) {
        return false;
      }
    }

    // Custom filter
    if (criteria.customFilter && !criteria.customFilter(node)) {
      return false;
    }

    return true;
  }

  /**
   * Check if a paint matches a color (approximately)
   */
  static paintMatchesColor(
    paint: Paint,
    targetColor: RGBColor,
    tolerance: number = 10
  ): boolean {
    if (paint.type !== 'SOLID' || !paint.visible) {
      return false;
    }

    const paintColor = 'color' in paint ? paint.color : null;
    if (!paintColor) return false;

    return this.colorsMatch(
      { r: paintColor.r * 255, g: paintColor.g * 255, b: paintColor.b * 255 },
      { r: targetColor.r * 255, g: targetColor.g * 255, b: targetColor.b * 255 },
      tolerance
    );
  }

  /**
   * Check if two colors match within tolerance
   */
  static colorsMatch(
    color1: RGBColor,
    color2: RGBColor,
    tolerance: number = 10
  ): boolean {
    const dr = Math.abs(color1.r - color2.r);
    const dg = Math.abs(color1.g - color2.g);
    const db = Math.abs(color1.b - color2.b);

    return dr <= tolerance && dg <= tolerance && db <= tolerance;
  }

  /**
   * Find nodes similar to a reference node
   */
  static findSimilar(
    referenceNode: FilterableNode,
    allNodes: readonly FilterableNode[],
    options: SimilarityOptions = {}
  ): FilterableNode[] {
    const opts = { ...DEFAULT_SIMILARITY_OPTIONS, ...options };

    return allNodes.filter(node => {
      if (node.id === referenceNode.id) return false;

      // Type match
      if (opts.matchType && node.type !== referenceNode.type) {
        return false;
      }

      // Fill color match
      if (opts.matchFillColor && referenceNode.fills && referenceNode.fills.length > 0) {
        const refFill = referenceNode.fills[0];
        if (!node.fills || node.fills.length === 0) return false;

        const hasMatch = node.fills.some(fill => {
          if (refFill?.type !== 'SOLID' || fill.type !== 'SOLID') return false;
          const refColor = 'color' in refFill ? refFill.color : null;
          const fillColor = 'color' in fill ? fill.color : null;
          if (!refColor || !fillColor) return false;

          return this.colorsMatch(
            { r: refColor.r * 255, g: refColor.g * 255, b: refColor.b * 255 },
            { r: fillColor.r * 255, g: fillColor.g * 255, b: fillColor.b * 255 },
            opts.colorTolerance
          );
        });

        if (!hasMatch) return false;
      }

      // Stroke color match
      if (opts.matchStrokeColor && referenceNode.strokes && referenceNode.strokes.length > 0) {
        const refStroke = referenceNode.strokes[0];
        if (!node.strokes || node.strokes.length === 0) return false;

        const hasMatch = node.strokes.some(stroke => {
          if (refStroke?.type !== 'SOLID' || stroke.type !== 'SOLID') return false;
          const refColor = 'color' in refStroke ? refStroke.color : null;
          const strokeColor = 'color' in stroke ? stroke.color : null;
          if (!refColor || !strokeColor) return false;

          return this.colorsMatch(
            { r: refColor.r * 255, g: refColor.g * 255, b: refColor.b * 255 },
            { r: strokeColor.r * 255, g: strokeColor.g * 255, b: strokeColor.b * 255 },
            opts.colorTolerance
          );
        });

        if (!hasMatch) return false;
      }

      // Stroke weight match
      if (opts.matchStrokeWeight && referenceNode.strokeWeight !== undefined) {
        if (node.strokeWeight === undefined) return false;
        if (Math.abs(node.strokeWeight - referenceNode.strokeWeight) > opts.strokeWeightTolerance) {
          return false;
        }
      }

      // Size match
      if (opts.matchSize) {
        const refWidth = referenceNode.width ?? 0;
        const refHeight = referenceNode.height ?? 0;
        const nodeWidth = node.width ?? 0;
        const nodeHeight = node.height ?? 0;

        const widthTolerance = refWidth * opts.sizeTolerance;
        const heightTolerance = refHeight * opts.sizeTolerance;

        if (Math.abs(nodeWidth - refWidth) > widthTolerance) return false;
        if (Math.abs(nodeHeight - refHeight) > heightTolerance) return false;
      }

      return true;
    });
  }

  /**
   * Select all nodes of a specific type
   */
  static selectByType(
    nodes: readonly FilterableNode[],
    type: NodeType
  ): FilterableNode[] {
    return nodes.filter(node => node.type === type);
  }

  /**
   * Select all nodes with a specific fill color
   */
  static selectByFillColor(
    nodes: readonly FilterableNode[],
    color: RGBColor,
    tolerance: number = 10
  ): FilterableNode[] {
    return nodes.filter(node =>
      node.fills?.some(fill => this.paintMatchesColor(fill, color, tolerance))
    );
  }

  /**
   * Select all nodes with a specific stroke color
   */
  static selectByStrokeColor(
    nodes: readonly FilterableNode[],
    color: RGBColor,
    tolerance: number = 10
  ): FilterableNode[] {
    return nodes.filter(node =>
      node.strokes?.some(stroke => this.paintMatchesColor(stroke, color, tolerance))
    );
  }

  /**
   * Invert selection
   */
  static invertSelection(
    allNodes: readonly FilterableNode[],
    selectedIds: readonly NodeId[]
  ): NodeId[] {
    const selectedSet = new Set(selectedIds);
    return allNodes
      .filter(node => !selectedSet.has(node.id))
      .map(node => node.id);
  }

  /**
   * Get unique types from a set of nodes
   */
  static getUniqueTypes(nodes: readonly FilterableNode[]): NodeType[] {
    const types = new Set<NodeType>();
    for (const node of nodes) {
      types.add(node.type);
    }
    return Array.from(types);
  }

  /**
   * Get unique fill colors from a set of nodes
   */
  static getUniqueFillColors(nodes: readonly FilterableNode[]): RGBColor[] {
    const colors: RGBColor[] = [];
    const colorSet = new Set<string>();

    for (const node of nodes) {
      if (!node.fills) continue;

      for (const fill of node.fills) {
        if (fill.type !== 'SOLID' || !fill.visible) continue;
        const fillColor = 'color' in fill ? fill.color : null;
        if (!fillColor) continue;

        const key = `${Math.round(fillColor.r * 255)},${Math.round(fillColor.g * 255)},${Math.round(fillColor.b * 255)}`;
        if (!colorSet.has(key)) {
          colorSet.add(key);
          colors.push({
            r: Math.round(fillColor.r * 255),
            g: Math.round(fillColor.g * 255),
            b: Math.round(fillColor.b * 255),
          });
        }
      }
    }

    return colors;
  }

  /**
   * Get unique stroke colors from a set of nodes
   */
  static getUniqueStrokeColors(nodes: readonly FilterableNode[]): RGBColor[] {
    const colors: RGBColor[] = [];
    const colorSet = new Set<string>();

    for (const node of nodes) {
      if (!node.strokes) continue;

      for (const stroke of node.strokes) {
        if (stroke.type !== 'SOLID' || !stroke.visible) continue;
        const strokeColor = 'color' in stroke ? stroke.color : null;
        if (!strokeColor) continue;

        const key = `${Math.round(strokeColor.r * 255)},${Math.round(strokeColor.g * 255)},${Math.round(strokeColor.b * 255)}`;
        if (!colorSet.has(key)) {
          colorSet.add(key);
          colors.push({
            r: Math.round(strokeColor.r * 255),
            g: Math.round(strokeColor.g * 255),
            b: Math.round(strokeColor.b * 255),
          });
        }
      }
    }

    return colors;
  }
}

/**
 * Utility functions for common selection operations
 */
export const SelectionFilters = {
  /**
   * Select all rectangles
   */
  selectRectangles: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.selectByType(nodes, 'RECTANGLE' as NodeType),

  /**
   * Select all ellipses
   */
  selectEllipses: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.selectByType(nodes, 'ELLIPSE' as NodeType),

  /**
   * Select all text nodes
   */
  selectText: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.selectByType(nodes, 'TEXT' as NodeType),

  /**
   * Select all frames
   */
  selectFrames: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.selectByType(nodes, 'FRAME' as NodeType),

  /**
   * Select all groups
   */
  selectGroups: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.selectByType(nodes, 'GROUP' as NodeType),

  /**
   * Select all vectors
   */
  selectVectors: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.selectByType(nodes, 'VECTOR' as NodeType),

  /**
   * Select all images
   */
  selectImages: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.selectByType(nodes, 'IMAGE' as NodeType),

  /**
   * Select all components
   */
  selectComponents: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.selectByType(nodes, 'COMPONENT' as NodeType),

  /**
   * Select all component instances
   */
  selectInstances: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.selectByType(nodes, 'INSTANCE' as NodeType),

  /**
   * Select all lines
   */
  selectLines: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.selectByType(nodes, 'LINE' as NodeType),

  /**
   * Select all polygons
   */
  selectPolygons: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.selectByType(nodes, 'POLYGON' as NodeType),

  /**
   * Select all stars
   */
  selectStars: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.selectByType(nodes, 'STAR' as NodeType),

  /**
   * Select all visible nodes
   */
  selectVisible: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.filter(nodes, { visible: true }),

  /**
   * Select all hidden nodes
   */
  selectHidden: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.filter(nodes, { visible: false }),

  /**
   * Select all unlocked nodes
   */
  selectUnlocked: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.filter(nodes, { locked: false }),

  /**
   * Select all locked nodes
   */
  selectLocked: (nodes: readonly FilterableNode[]) =>
    SelectionFilter.filter(nodes, { locked: true }),
};
