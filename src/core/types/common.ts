/**
 * Common types used throughout DesignLibre
 */

/** Branded type helper for nominal typing */
export type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

/** UUID v7 node identifier */
export type NodeId = Branded<string, 'NodeId'>;

/** Operation identifier (Lamport timestamp + client ID) */
export type OperationId = Branded<string, 'OperationId'>;

/** Property path for nested property access */
export type PropertyPath = readonly string[];

/** Node types in the scene graph */
export const NodeType = {
  DOCUMENT: 'DOCUMENT',
  PAGE: 'PAGE',
  FRAME: 'FRAME',
  GROUP: 'GROUP',
  VECTOR: 'VECTOR',
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  COMPONENT: 'COMPONENT',
  INSTANCE: 'INSTANCE',
  BOOLEAN_OPERATION: 'BOOLEAN_OPERATION',
  SLICE: 'SLICE',
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

/** Blend modes for compositing */
export type BlendMode =
  | 'PASS_THROUGH'
  | 'NORMAL'
  // Darken
  | 'DARKEN'
  | 'MULTIPLY'
  | 'COLOR_BURN'
  // Lighten
  | 'LIGHTEN'
  | 'SCREEN'
  | 'COLOR_DODGE'
  // Contrast
  | 'OVERLAY'
  | 'SOFT_LIGHT'
  | 'HARD_LIGHT'
  // Inversion
  | 'DIFFERENCE'
  | 'EXCLUSION'
  // Component
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY';

/** Layout constraint types */
export type ConstraintType = 'MIN' | 'MAX' | 'CENTER' | 'STRETCH' | 'SCALE';

/** Layout constraints for a node */
export interface LayoutConstraints {
  readonly horizontal: ConstraintType;
  readonly vertical: ConstraintType;
}

/** Auto layout mode */
export type AutoLayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL';

/** Primary/counter axis alignment */
export type AxisAlign = 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
export type CounterAxisAlign = 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';

/** Sizing mode for auto layout */
export type SizingMode = 'FIXED' | 'AUTO';

/** Auto layout properties */
export interface AutoLayoutProps {
  readonly mode: AutoLayoutMode;
  readonly itemSpacing: number;
  readonly paddingTop: number;
  readonly paddingRight: number;
  readonly paddingBottom: number;
  readonly paddingLeft: number;
  readonly primaryAxisAlignItems: AxisAlign;
  readonly counterAxisAlignItems: CounterAxisAlign;
  readonly primaryAxisSizingMode: SizingMode;
  readonly counterAxisSizingMode: SizingMode;
  readonly wrap: boolean;
}

/** Boolean operation types */
export type BooleanOperation = 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';

/** Export format */
export type ExportFormat = 'PNG' | 'JPG' | 'SVG' | 'PDF';

/** Export constraint type */
export type ExportConstraintType = 'SCALE' | 'WIDTH' | 'HEIGHT';

/** Export setting */
export interface ExportSetting {
  readonly format: ExportFormat;
  readonly suffix: string;
  readonly constraint: {
    readonly type: ExportConstraintType;
    readonly value: number;
  };
}
