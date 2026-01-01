/**
 * Default values for node properties
 */
import type { NodeType, LayoutConstraints, AutoLayoutProps } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { TransformProps, AppearanceProps, TextStyleRange } from './base-node';
/** Default transform properties */
export declare const DEFAULT_TRANSFORM: TransformProps;
/** Default appearance properties */
export declare const DEFAULT_APPEARANCE: AppearanceProps;
/** Default layout constraints */
export declare const DEFAULT_CONSTRAINTS: LayoutConstraints;
/** Default auto layout properties */
export declare const DEFAULT_AUTO_LAYOUT: AutoLayoutProps;
/** Default page background color - dark grey (#1a1a1a) */
export declare const DEFAULT_PAGE_BACKGROUND: RGBA;
/** Default text style */
export declare const DEFAULT_TEXT_STYLE: Omit<TextStyleRange, 'start' | 'end'>;
/** Get default node name for a type */
export declare function getDefaultNodeName(type: NodeType): string;
//# sourceMappingURL=defaults.d.ts.map