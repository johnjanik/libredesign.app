/**
 * Default values for node properties
 */
import { rgba } from '@core/types/color';
/** Default transform properties */
export const DEFAULT_TRANSFORM = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
};
/** Default appearance properties */
export const DEFAULT_APPEARANCE = {
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
export const DEFAULT_CONSTRAINTS = {
    horizontal: 'MIN',
    vertical: 'MIN',
};
/** Default auto layout properties */
export const DEFAULT_AUTO_LAYOUT = {
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
export const DEFAULT_PAGE_BACKGROUND = rgba(0.102, 0.102, 0.102, 1);
/** Default text style */
export const DEFAULT_TEXT_STYLE = {
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 14,
    fills: [{ type: 'SOLID', visible: true, opacity: 1, color: rgba(0, 0, 0, 1) }],
    textDecoration: 'NONE',
    letterSpacing: 0,
    lineHeight: 'AUTO',
};
/** Get default node name for a type */
export function getDefaultNodeName(type) {
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
//# sourceMappingURL=defaults.js.map