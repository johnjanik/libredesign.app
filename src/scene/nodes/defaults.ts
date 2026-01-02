/**
 * Default values for node properties
 */

import type { NodeType, LayoutConstraints, AutoLayoutProps } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import { rgba } from '@core/types/color';
import type { TransformProps, AppearanceProps, TextStyleRange } from './base-node';

/** Default transform properties */
export const DEFAULT_TRANSFORM: TransformProps = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
};

/** Default appearance properties */
export const DEFAULT_APPEARANCE: AppearanceProps = {
  opacity: 1,
  blendMode: 'PASS_THROUGH',
  fills: [],
  strokes: [],
  strokeWeight: 1,
  strokeAlign: 'CENTER',
  strokeCap: 'NONE',
  strokeJoin: 'MITER',
  strokeMiterLimit: 4,
  dashPattern: [],
  dashOffset: 0,
  effects: [],
};

/** Default layout constraints */
export const DEFAULT_CONSTRAINTS: LayoutConstraints = {
  horizontal: 'MIN',
  vertical: 'MIN',
};

/** Default auto layout properties */
export const DEFAULT_AUTO_LAYOUT: AutoLayoutProps = {
  mode: 'NONE',
  itemSpacing: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  primaryAxisAlignItems: 'MIN',
  counterAxisAlignItems: 'MIN',
  primaryAxisSizingMode: 'FIXED',
  counterAxisSizingMode: 'FIXED',
  wrap: false,
};

/** Default page background color - dark grey (#1a1a1a) */
export const DEFAULT_PAGE_BACKGROUND: RGBA = rgba(0.102, 0.102, 0.102, 1);

/** Default text style */
export const DEFAULT_TEXT_STYLE: Omit<TextStyleRange, 'start' | 'end'> = {
  fontFamily: 'Inter',
  fontWeight: 400,
  fontSize: 14,
  fills: [{ type: 'SOLID', visible: true, opacity: 1, color: rgba(0, 0, 0, 1) }],
  textDecoration: 'NONE',
  letterSpacing: 0,
  lineHeight: 'AUTO',
};

/** Get default node name for a type */
export function getDefaultNodeName(type: NodeType): string {
  switch (type) {
    case 'DOCUMENT':
      return 'Untitled';
    case 'PAGE':
      return 'Leaf 1';
    case 'FRAME':
      return 'Frame';
    case 'GROUP':
      return 'Group';
    case 'VECTOR':
      return 'Vector';
    case 'IMAGE':
      return 'Image';
    case 'TEXT':
      return 'Text';
    case 'COMPONENT':
      return 'Component';
    case 'INSTANCE':
      return 'Instance';
    case 'BOOLEAN_OPERATION':
      return 'Boolean';
    case 'SLICE':
      return 'Slice';
    default:
      return 'Node';
  }
}
