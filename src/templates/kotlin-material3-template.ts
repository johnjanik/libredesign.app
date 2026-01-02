/**
 * Kotlin/Android Material Design 3 Template Generator
 *
 * Creates a comprehensive .preserve template file containing all Material Design 3
 * components with 1:1 WYSIWYG mapping to Jetpack Compose code.
 *
 * Based on Material Design 3 guidelines and Compose component library.
 */

import type {
  PreserveArchive,
  PreserveDocument,
  PreservePage,
  PreserveNode,
  PreserveFrameNode,
  PreserveTextNode,
  PreserveVectorNode,
  PreserveTokens,
  PreserveTokenGroup,
  PreserveComponentRegistry,
} from '../persistence/preserve/preserve-types';
import type { RGBA } from '@core/types/color';

// =============================================================================
// Material Design 3 Color Tokens
// =============================================================================

/** Material 3 Baseline Colors (Light Theme) */
export const M3Colors = {
  // Primary
  primary: { r: 0.404, g: 0.318, b: 0.643, a: 1 } as RGBA, // #6750A4
  onPrimary: { r: 1, g: 1, b: 1, a: 1 } as RGBA,
  primaryContainer: { r: 0.918, g: 0.859, b: 1, a: 1 } as RGBA, // #EADDFF
  onPrimaryContainer: { r: 0.129, g: 0.063, b: 0.294, a: 1 } as RGBA, // #21005D

  // Secondary
  secondary: { r: 0.388, g: 0.365, b: 0.451, a: 1 } as RGBA, // #625B71
  onSecondary: { r: 1, g: 1, b: 1, a: 1 } as RGBA,
  secondaryContainer: { r: 0.906, g: 0.855, b: 0.969, a: 1 } as RGBA, // #E8DEF8
  onSecondaryContainer: { r: 0.114, g: 0.071, b: 0.173, a: 1 } as RGBA, // #1D192B

  // Tertiary
  tertiary: { r: 0.486, g: 0.341, b: 0.388, a: 1 } as RGBA, // #7D5260
  onTertiary: { r: 1, g: 1, b: 1, a: 1 } as RGBA,
  tertiaryContainer: { r: 1, g: 0.847, b: 0.886, a: 1 } as RGBA, // #FFD8E4
  onTertiaryContainer: { r: 0.192, g: 0.059, b: 0.114, a: 1 } as RGBA, // #31111D

  // Error
  error: { r: 0.729, g: 0.169, b: 0.184, a: 1 } as RGBA, // #B3261E
  onError: { r: 1, g: 1, b: 1, a: 1 } as RGBA,
  errorContainer: { r: 0.976, g: 0.871, b: 0.859, a: 1 } as RGBA, // #F9DEDC
  onErrorContainer: { r: 0.255, g: 0.024, b: 0.024, a: 1 } as RGBA, // #410E0B

  // Surface
  surface: { r: 0.992, g: 0.957, b: 1, a: 1 } as RGBA, // #FEF7FF
  onSurface: { r: 0.114, g: 0.071, b: 0.173, a: 1 } as RGBA, // #1D1B20
  surfaceVariant: { r: 0.906, g: 0.894, b: 0.925, a: 1 } as RGBA, // #E7E0EC
  onSurfaceVariant: { r: 0.286, g: 0.267, b: 0.322, a: 1 } as RGBA, // #49454F

  // Surface Containers (M3 new)
  surfaceContainerLowest: { r: 1, g: 1, b: 1, a: 1 } as RGBA,
  surfaceContainerLow: { r: 0.969, g: 0.937, b: 0.988, a: 1 } as RGBA,
  surfaceContainer: { r: 0.949, g: 0.918, b: 0.969, a: 1 } as RGBA,
  surfaceContainerHigh: { r: 0.929, g: 0.898, b: 0.949, a: 1 } as RGBA,
  surfaceContainerHighest: { r: 0.906, g: 0.875, b: 0.925, a: 1 } as RGBA,

  // Outline
  outline: { r: 0.467, g: 0.447, b: 0.498, a: 1 } as RGBA, // #79747E
  outlineVariant: { r: 0.792, g: 0.773, b: 0.82, a: 1 } as RGBA, // #CAC4D0

  // Inverse
  inverseSurface: { r: 0.196, g: 0.176, b: 0.227, a: 1 } as RGBA, // #322F35
  inverseOnSurface: { r: 0.957, g: 0.937, b: 0.976, a: 1 } as RGBA, // #F5EFF7
  inversePrimary: { r: 0.82, g: 0.773, b: 1, a: 1 } as RGBA, // #D0BCFF

  // Background
  background: { r: 0.992, g: 0.957, b: 1, a: 1 } as RGBA, // #FEF7FF
  onBackground: { r: 0.114, g: 0.071, b: 0.173, a: 1 } as RGBA, // #1D1B20

  // Scrim
  scrim: { r: 0, g: 0, b: 0, a: 1 } as RGBA,

  // Shadow
  shadow: { r: 0, g: 0, b: 0, a: 1 } as RGBA,
};

/** Material 3 Dark Theme Colors */
export const M3ColorsDark = {
  // Primary
  primary: { r: 0.82, g: 0.773, b: 1, a: 1 } as RGBA, // #D0BCFF
  onPrimary: { r: 0.227, g: 0.141, b: 0.431, a: 1 } as RGBA, // #381E72
  primaryContainer: { r: 0.31, g: 0.227, b: 0.537, a: 1 } as RGBA, // #4F378B
  onPrimaryContainer: { r: 0.918, g: 0.859, b: 1, a: 1 } as RGBA,

  // Secondary
  secondary: { r: 0.8, g: 0.769, b: 0.867, a: 1 } as RGBA, // #CCC2DC
  onSecondary: { r: 0.192, g: 0.169, b: 0.271, a: 1 } as RGBA, // #332D41
  secondaryContainer: { r: 0.286, g: 0.259, b: 0.365, a: 1 } as RGBA, // #4A4458
  onSecondaryContainer: { r: 0.906, g: 0.855, b: 0.969, a: 1 } as RGBA,

  // Surface (Dark)
  surface: { r: 0.082, g: 0.071, b: 0.098, a: 1 } as RGBA, // #141218
  onSurface: { r: 0.906, g: 0.875, b: 0.925, a: 1 } as RGBA,
  surfaceVariant: { r: 0.286, g: 0.267, b: 0.322, a: 1 } as RGBA,
  onSurfaceVariant: { r: 0.792, g: 0.773, b: 0.82, a: 1 } as RGBA,
};

/** Material 3 Extended Colors (Semantic) */
export const M3ExtendedColors = {
  success: { r: 0.275, g: 0.651, b: 0.396, a: 1 } as RGBA, // Green
  warning: { r: 1, g: 0.682, b: 0.259, a: 1 } as RGBA, // Amber
  info: { r: 0.129, g: 0.588, b: 0.953, a: 1 } as RGBA, // Blue
};

/** Material 3 Typography Scale */
export const M3Typography = {
  displayLarge: { fontFamily: 'Roboto', fontWeight: 400, fontSize: 57, lineHeight: 64, letterSpacing: -0.25 },
  displayMedium: { fontFamily: 'Roboto', fontWeight: 400, fontSize: 45, lineHeight: 52, letterSpacing: 0 },
  displaySmall: { fontFamily: 'Roboto', fontWeight: 400, fontSize: 36, lineHeight: 44, letterSpacing: 0 },
  headlineLarge: { fontFamily: 'Roboto', fontWeight: 400, fontSize: 32, lineHeight: 40, letterSpacing: 0 },
  headlineMedium: { fontFamily: 'Roboto', fontWeight: 400, fontSize: 28, lineHeight: 36, letterSpacing: 0 },
  headlineSmall: { fontFamily: 'Roboto', fontWeight: 400, fontSize: 24, lineHeight: 32, letterSpacing: 0 },
  titleLarge: { fontFamily: 'Roboto', fontWeight: 400, fontSize: 22, lineHeight: 28, letterSpacing: 0 },
  titleMedium: { fontFamily: 'Roboto', fontWeight: 500, fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  titleSmall: { fontFamily: 'Roboto', fontWeight: 500, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  bodyLarge: { fontFamily: 'Roboto', fontWeight: 400, fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
  bodyMedium: { fontFamily: 'Roboto', fontWeight: 400, fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  bodySmall: { fontFamily: 'Roboto', fontWeight: 400, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  labelLarge: { fontFamily: 'Roboto', fontWeight: 500, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  labelMedium: { fontFamily: 'Roboto', fontWeight: 500, fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
  labelSmall: { fontFamily: 'Roboto', fontWeight: 500, fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
};

/** Material 3 Spacing Scale (based on 4dp grid) */
export const M3Spacing = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 16,
  large: 24,
  extraLarge: 32,
  xxl: 48,
  xxxl: 64,
};

/** Material 3 Corner Radius (Shape) */
export const M3Shape = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 9999,
};

/** Android Device Dimensions */
export const AndroidDevices = {
  pixelPhone: { width: 393, height: 851, statusBarHeight: 24, navBarHeight: 48 },
  pixel8Pro: { width: 412, height: 915, statusBarHeight: 24, navBarHeight: 48 },
  pixelTablet: { width: 600, height: 960, statusBarHeight: 24, navBarHeight: 48 },
  galaxyS24: { width: 360, height: 780, statusBarHeight: 24, navBarHeight: 48 },
};

// =============================================================================
// Component Generators
// =============================================================================

let nodeIdCounter = 0;
function generateNodeId(): string {
  return `node-${++nodeIdCounter}`;
}

/**
 * Create a text label
 */
function createTextLabel(
  name: string,
  text: string,
  x: number,
  y: number,
  style: keyof typeof M3Typography,
  color: RGBA = M3Colors.onSurface
): PreserveTextNode {
  const typo = M3Typography[style];
  return {
    id: generateNodeId(),
    type: 'TEXT',
    name,
    visible: true,
    transform: { x, y, width: 300, height: typo.lineHeight, rotation: 0 },
    characters: text,
    styles: [{
      start: 0,
      end: text.length,
      fontFamily: typo.fontFamily,
      fontWeight: typo.fontWeight,
      fontSize: typo.fontSize,
      lineHeight: { unit: 'PIXELS', value: typo.lineHeight },
      letterSpacing: { unit: 'PIXELS', value: typo.letterSpacing },
      fills: [{ type: 'SOLID', color, visible: true }],
    }],
    textAlignHorizontal: 'LEFT',
    textAlignVertical: 'TOP',
    textAutoResize: 'WIDTH_AND_HEIGHT',
  };
}

/**
 * Create a Material icon placeholder
 */
function createMaterialIcon(
  iconName: string,
  x: number,
  y: number,
  size: number,
  color: RGBA
): PreserveVectorNode {
  return {
    id: generateNodeId(),
    type: 'VECTOR',
    name: `Icon: ${iconName}`,
    visible: true,
    transform: { x, y, width: size, height: size, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color, visible: true }],
    },
    paths: [{
      windingRule: 'NONZERO',
      commands: [
        { type: 'M', x: size / 2, y: 2 },
        { type: 'L', x: size - 2, y: size / 2 },
        { type: 'L', x: size / 2, y: size - 2 },
        { type: 'L', x: 2, y: size / 2 },
        { type: 'Z' },
      ],
    }],
  };
}

/**
 * Create a filled button (primary)
 */
function createFilledButton(
  name: string,
  label: string,
  x: number,
  y: number,
  options: { icon?: string; disabled?: boolean } = {}
): PreserveFrameNode {
  const height = 40;
  const paddingH = options.icon ? 16 : 24;
  const width = label.length * 9 + paddingH * 2 + (options.icon ? 24 : 0);
  const bgColor = options.disabled ? M3Colors.surfaceVariant : M3Colors.primary;
  const textColor = options.disabled ? M3Colors.onSurfaceVariant : M3Colors.onPrimary;

  const children: PreserveNode[] = [];
  let contentX = paddingH;

  if (options.icon) {
    children.push(createMaterialIcon(options.icon, 16, 8, 18, textColor));
    contentX += 26;
  }

  children.push(createTextLabel(`${name}-label`, label, contentX, 10, 'labelLarge', textColor));

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name,
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: bgColor, visible: true }],
      cornerRadius: M3Shape.full,
    },
    layout: {
      autoLayout: 'HORIZONTAL',
      padding: { top: 0, right: paddingH, bottom: 0, left: paddingH },
      gap: 8,
      alignItems: 'CENTER',
      justifyContent: 'CENTER',
    },
    children,
  };
}

/**
 * Create an outlined button
 */
function createOutlinedButton(
  name: string,
  label: string,
  x: number,
  y: number
): PreserveFrameNode {
  const height = 40;
  const paddingH = 24;
  const width = label.length * 9 + paddingH * 2;

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name,
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [],
      strokes: [{ type: 'SOLID', color: M3Colors.outline, visible: true }],
      strokeWeight: 1,
      cornerRadius: M3Shape.full,
    },
    layout: {
      autoLayout: 'HORIZONTAL',
      padding: { top: 0, right: paddingH, bottom: 0, left: paddingH },
      alignItems: 'CENTER',
      justifyContent: 'CENTER',
    },
    children: [createTextLabel(`${name}-label`, label, 0, 0, 'labelLarge', M3Colors.primary)],
  };
}

/**
 * Create a tonal button
 */
function createTonalButton(
  name: string,
  label: string,
  x: number,
  y: number
): PreserveFrameNode {
  const height = 40;
  const paddingH = 24;
  const width = label.length * 9 + paddingH * 2;

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name,
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: M3Colors.secondaryContainer, visible: true }],
      cornerRadius: M3Shape.full,
    },
    layout: {
      autoLayout: 'HORIZONTAL',
      padding: { top: 0, right: paddingH, bottom: 0, left: paddingH },
      alignItems: 'CENTER',
      justifyContent: 'CENTER',
    },
    children: [createTextLabel(`${name}-label`, label, 0, 0, 'labelLarge', M3Colors.onSecondaryContainer)],
  };
}

/**
 * Create a text button
 */
function createTextButton(
  name: string,
  label: string,
  x: number,
  y: number
): PreserveFrameNode {
  const height = 40;
  const paddingH = 12;
  const width = label.length * 9 + paddingH * 2;

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name,
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [],
      cornerRadius: M3Shape.full,
    },
    layout: {
      autoLayout: 'HORIZONTAL',
      padding: { top: 0, right: paddingH, bottom: 0, left: paddingH },
      alignItems: 'CENTER',
      justifyContent: 'CENTER',
    },
    children: [createTextLabel(`${name}-label`, label, 0, 0, 'labelLarge', M3Colors.primary)],
  };
}

/**
 * Create a FAB (Floating Action Button)
 */
function createFAB(
  name: string,
  icon: string,
  x: number,
  y: number,
  size: 'small' | 'regular' | 'large' | 'extended' = 'regular',
  label?: string
): PreserveFrameNode {
  const sizes = {
    small: 40,
    regular: 56,
    large: 96,
    extended: 56,
  };
  const iconSizes = {
    small: 24,
    regular: 24,
    large: 36,
    extended: 24,
  };

  const dim = sizes[size];
  const iconSize = iconSizes[size];
  const width = size === 'extended' && label ? 56 + label.length * 8 : dim;

  const children: PreserveNode[] = [
    createMaterialIcon(icon, (width - iconSize) / 2, (dim - iconSize) / 2, iconSize, M3Colors.onPrimaryContainer),
  ];

  if (size === 'extended' && label) {
    children.push(createTextLabel(`${name}-label`, label, iconSize + 16, (dim - 20) / 2, 'labelLarge', M3Colors.onPrimaryContainer));
  }

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name,
    visible: true,
    transform: { x, y, width, height: dim, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: M3Colors.primaryContainer, visible: true }],
      cornerRadius: size === 'large' ? M3Shape.extraLarge : M3Shape.large,
      effects: [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.15 },
        offset: { x: 0, y: 3 },
        blur: 8,
        spread: 0,
        visible: true,
      }],
    },
    children,
  };
}

/**
 * Create a Card
 */
function createCard(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  variant: 'elevated' | 'filled' | 'outlined' = 'elevated'
): PreserveFrameNode {
  const appearance: PreserveFrameNode['appearance'] = {
    cornerRadius: M3Shape.medium,
  };

  switch (variant) {
    case 'elevated':
      appearance.fills = [{ type: 'SOLID', color: M3Colors.surfaceContainerLow, visible: true }];
      appearance.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 1 },
        blur: 3,
        spread: 0,
        visible: true,
      }];
      break;
    case 'filled':
      appearance.fills = [{ type: 'SOLID', color: M3Colors.surfaceContainerHighest, visible: true }];
      break;
    case 'outlined':
      appearance.fills = [{ type: 'SOLID', color: M3Colors.surface, visible: true }];
      appearance.strokes = [{ type: 'SOLID', color: M3Colors.outlineVariant, visible: true }];
      appearance.strokeWeight = 1;
      break;
  }

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name,
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance,
    layout: {
      autoLayout: 'VERTICAL',
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      gap: 8,
    },
  };
}

/**
 * Create a TextField (Outlined)
 */
function createTextField(
  name: string,
  label: string,
  x: number,
  y: number,
  width: number,
  options: { supportingText?: string; hasError?: boolean; leadingIcon?: string; trailingIcon?: string } = {}
): PreserveFrameNode {
  const height = 56;
  const borderColor = options.hasError ? M3Colors.error : M3Colors.outline;

  const children: PreserveNode[] = [];

  // Label (positioned at top)
  children.push(createTextLabel(`${name}-label`, label, 16, 16, 'bodyLarge', M3Colors.onSurfaceVariant));

  if (options.leadingIcon) {
    children.push(createMaterialIcon(options.leadingIcon, 12, 16, 24, M3Colors.onSurfaceVariant));
  }

  if (options.trailingIcon) {
    children.push(createMaterialIcon(options.trailingIcon, width - 40, 16, 24, M3Colors.onSurfaceVariant));
  }

  const container: PreserveFrameNode = {
    id: generateNodeId(),
    type: 'FRAME',
    name,
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [],
      strokes: [{ type: 'SOLID', color: borderColor, visible: true }],
      strokeWeight: 1,
      cornerRadius: M3Shape.extraSmall,
    },
    children,
  };

  // Add supporting text if provided
  if (options.supportingText) {
    return {
      id: generateNodeId(),
      type: 'FRAME',
      name: `${name}-wrapper`,
      visible: true,
      transform: { x, y, width, height: height + 20, rotation: 0 },
      layout: {
        autoLayout: 'VERTICAL',
        gap: 4,
      },
      children: [
        container,
        createTextLabel(`${name}-supporting`, options.supportingText, 16, 0, 'bodySmall', options.hasError ? M3Colors.error : M3Colors.onSurfaceVariant),
      ],
    };
  }

  return container;
}

/**
 * Create a Chip
 */
function createChip(
  name: string,
  label: string,
  x: number,
  y: number,
  variant: 'assist' | 'filter' | 'input' | 'suggestion' = 'assist',
  selected?: boolean
): PreserveFrameNode {
  const height = 32;
  const width = label.length * 8 + 32;

  let bgColor: RGBA = { r: 0, g: 0, b: 0, a: 0 };
  let textColor = M3Colors.onSurfaceVariant;
  const hasStroke = variant === 'assist' || variant === 'suggestion' || (variant === 'filter' && !selected);

  if (selected && (variant === 'filter' || variant === 'input')) {
    bgColor = M3Colors.secondaryContainer;
    textColor = M3Colors.onSecondaryContainer;
  }

  const appearance: PreserveFrameNode['appearance'] = {
    fills: bgColor.a > 0 ? [{ type: 'SOLID', color: bgColor, visible: true }] : [],
    cornerRadius: M3Shape.small,
  };

  if (hasStroke) {
    appearance.strokes = [{ type: 'SOLID', color: M3Colors.outline, visible: true }];
    appearance.strokeWeight = 1;
  }

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name,
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance,
    layout: {
      autoLayout: 'HORIZONTAL',
      padding: { top: 0, right: 16, bottom: 0, left: 16 },
      alignItems: 'CENTER',
      justifyContent: 'CENTER',
    },
    children: [createTextLabel(`${name}-label`, label, 0, 0, 'labelLarge', textColor)],
  };
}

/**
 * Create a Switch
 */
function createSwitch(
  x: number,
  y: number,
  checked: boolean
): PreserveFrameNode {
  const width = 52;
  const height = 32;
  const trackColor = checked ? M3Colors.primary : M3Colors.surfaceContainerHighest;
  const thumbColor = checked ? M3Colors.onPrimary : M3Colors.outline;
  const thumbSize = checked ? 24 : 16;
  const thumbX = checked ? 24 : 4;
  const thumbY = (height - thumbSize) / 2;

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Switch',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: trackColor, visible: true }],
      strokes: checked ? [] : [{ type: 'SOLID', color: M3Colors.outline, visible: true }],
      strokeWeight: checked ? 0 : 2,
      cornerRadius: height / 2,
    },
    children: [{
      id: generateNodeId(),
      type: 'FRAME',
      name: 'Thumb',
      visible: true,
      transform: { x: thumbX, y: thumbY, width: thumbSize, height: thumbSize, rotation: 0 },
      appearance: {
        fills: [{ type: 'SOLID', color: thumbColor, visible: true }],
        cornerRadius: thumbSize / 2,
        effects: checked ? [{
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.15 },
          offset: { x: 0, y: 1 },
          blur: 3,
          spread: 0,
          visible: true,
        }] : [],
      },
    } as PreserveFrameNode],
  };
}

/**
 * Create a Checkbox
 */
function createCheckbox(
  x: number,
  y: number,
  checked: boolean
): PreserveFrameNode {
  const size = 18;

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Checkbox',
    visible: true,
    transform: { x, y, width: size, height: size, rotation: 0 },
    appearance: {
      fills: checked ? [{ type: 'SOLID', color: M3Colors.primary, visible: true }] : [],
      strokes: checked ? [] : [{ type: 'SOLID', color: M3Colors.onSurfaceVariant, visible: true }],
      strokeWeight: 2,
      cornerRadius: 2,
    },
    children: checked ? [
      createMaterialIcon('check', 3, 3, 12, M3Colors.onPrimary),
    ] : [],
  };
}

/**
 * Create a Radio Button
 */
function createRadioButton(
  x: number,
  y: number,
  selected: boolean
): PreserveFrameNode {
  const size = 20;

  const children: PreserveNode[] = [];
  if (selected) {
    children.push({
      id: generateNodeId(),
      type: 'FRAME',
      name: 'Radio Inner',
      visible: true,
      transform: { x: 4, y: 4, width: 12, height: 12, rotation: 0 },
      appearance: {
        fills: [{ type: 'SOLID', color: M3Colors.primary, visible: true }],
        cornerRadius: 6,
      },
    } as PreserveFrameNode);
  }

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Radio Button',
    visible: true,
    transform: { x, y, width: size, height: size, rotation: 0 },
    appearance: {
      fills: [],
      strokes: [{ type: 'SOLID', color: selected ? M3Colors.primary : M3Colors.onSurfaceVariant, visible: true }],
      strokeWeight: 2,
      cornerRadius: size / 2,
    },
    children,
  };
}

/**
 * Create a Slider
 */
function createSlider(
  x: number,
  y: number,
  width: number,
  value: number // 0-1
): PreserveFrameNode {
  const height = 44;
  const trackHeight = 4;
  const thumbSize = 20;
  const thumbX = value * (width - thumbSize);

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Slider',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    children: [
      // Track background
      {
        id: generateNodeId(),
        type: 'FRAME',
        name: 'Track',
        visible: true,
        transform: { x: 0, y: (height - trackHeight) / 2, width, height: trackHeight, rotation: 0 },
        appearance: {
          fills: [{ type: 'SOLID', color: M3Colors.surfaceContainerHighest, visible: true }],
          cornerRadius: trackHeight / 2,
        },
      } as PreserveFrameNode,
      // Active track
      {
        id: generateNodeId(),
        type: 'FRAME',
        name: 'Active Track',
        visible: true,
        transform: { x: 0, y: (height - trackHeight) / 2, width: thumbX + thumbSize / 2, height: trackHeight, rotation: 0 },
        appearance: {
          fills: [{ type: 'SOLID', color: M3Colors.primary, visible: true }],
          cornerRadius: trackHeight / 2,
        },
      } as PreserveFrameNode,
      // Thumb
      {
        id: generateNodeId(),
        type: 'FRAME',
        name: 'Thumb',
        visible: true,
        transform: { x: thumbX, y: (height - thumbSize) / 2, width: thumbSize, height: thumbSize, rotation: 0 },
        appearance: {
          fills: [{ type: 'SOLID', color: M3Colors.primary, visible: true }],
          cornerRadius: thumbSize / 2,
          effects: [{
            type: 'DROP_SHADOW',
            color: { r: 0, g: 0, b: 0, a: 0.15 },
            offset: { x: 0, y: 1 },
            blur: 3,
            spread: 0,
            visible: true,
          }],
        },
      } as PreserveFrameNode,
    ],
  };
}

/**
 * Create a Top App Bar
 */
function createTopAppBar(
  title: string,
  x: number,
  y: number,
  width: number,
  variant: 'small' | 'medium' | 'large' = 'small'
): PreserveFrameNode {
  const heights = { small: 64, medium: 112, large: 152 };
  const height = heights[variant];

  const children: PreserveNode[] = [];

  // Navigation icon
  children.push(createMaterialIcon('arrow_back', 16, (variant === 'small' ? height : 16) - 40, 24, M3Colors.onSurface));

  // Title
  const titleY = variant === 'small' ? (height - 28) / 2 : height - 44;
  const titleStyle = variant === 'large' ? 'headlineMedium' : variant === 'medium' ? 'headlineSmall' : 'titleLarge';
  children.push(createTextLabel('topbar-title', title, variant === 'small' ? 56 : 16, titleY, titleStyle, M3Colors.onSurface));

  // Action icons
  children.push(createMaterialIcon('more_vert', width - 40, (variant === 'small' ? height : 16) - 40, 24, M3Colors.onSurfaceVariant));

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Top App Bar',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: M3Colors.surface, visible: true }],
    },
    children,
  };
}

/**
 * Create a Bottom Navigation Bar
 */
function createBottomNavBar(
  x: number,
  y: number,
  width: number,
  items: Array<{ icon: string; label: string; selected?: boolean }>
): PreserveFrameNode {
  const height = 80;
  const itemWidth = width / items.length;
  const children: PreserveNode[] = [];

  items.forEach((item, index) => {
    const itemX = index * itemWidth;
    const color = item.selected ? M3Colors.onSecondaryContainer : M3Colors.onSurfaceVariant;
    const bgColor = item.selected ? M3Colors.secondaryContainer : { r: 0, g: 0, b: 0, a: 0 };

    // Icon container with pill background if selected
    const iconContainer: PreserveFrameNode = {
      id: generateNodeId(),
      type: 'FRAME',
      name: `Nav Item ${index}`,
      visible: true,
      transform: { x: itemX + (itemWidth - 64) / 2, y: 12, width: 64, height: 32, rotation: 0 },
      appearance: {
        fills: item.selected ? [{ type: 'SOLID', color: bgColor, visible: true }] : [],
        cornerRadius: 16,
      },
      layout: {
        autoLayout: 'HORIZONTAL',
        alignItems: 'CENTER',
        justifyContent: 'CENTER',
      },
      children: [createMaterialIcon(item.icon, 20, 4, 24, color)],
    };
    children.push(iconContainer);

    // Label
    children.push(createTextLabel(`nav-label-${index}`, item.label, itemX + (itemWidth - item.label.length * 6) / 2, 50, 'labelMedium', color));
  });

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Bottom Navigation',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: M3Colors.surfaceContainer, visible: true }],
    },
    children,
  };
}

/**
 * Create a Navigation Drawer item
 */
function createNavDrawerItem(
  icon: string,
  label: string,
  x: number,
  y: number,
  width: number,
  selected?: boolean
): PreserveFrameNode {
  const height = 56;
  const bgColor = selected ? M3Colors.secondaryContainer : { r: 0, g: 0, b: 0, a: 0 };
  const textColor = selected ? M3Colors.onSecondaryContainer : M3Colors.onSurfaceVariant;

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: `Drawer Item: ${label}`,
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: bgColor, visible: selected || false }],
      cornerRadius: M3Shape.full,
    },
    layout: {
      autoLayout: 'HORIZONTAL',
      padding: { top: 0, right: 24, bottom: 0, left: 16 },
      gap: 12,
      alignItems: 'CENTER',
    },
    children: [
      createMaterialIcon(icon, 0, 0, 24, textColor),
      createTextLabel('drawer-label', label, 0, 0, 'labelLarge', textColor),
    ],
  };
}

/**
 * Create a List Item
 */
function createListItem(
  headline: string,
  x: number,
  y: number,
  width: number,
  options: {
    supportingText?: string;
    leadingIcon?: string;
    trailingIcon?: string;
    trailingSwitch?: boolean;
  } = {}
): PreserveFrameNode {
  const height = options.supportingText ? 72 : 56;
  const children: PreserveNode[] = [];

  let contentX = 16;

  if (options.leadingIcon) {
    children.push(createMaterialIcon(options.leadingIcon, 16, (height - 24) / 2, 24, M3Colors.onSurfaceVariant));
    contentX = 56;
  }

  children.push(createTextLabel('headline', headline, contentX, options.supportingText ? 8 : (height - 24) / 2, 'bodyLarge', M3Colors.onSurface));

  if (options.supportingText) {
    children.push(createTextLabel('supporting', options.supportingText, contentX, 32, 'bodyMedium', M3Colors.onSurfaceVariant));
  }

  if (options.trailingIcon) {
    children.push(createMaterialIcon(options.trailingIcon, width - 40, (height - 24) / 2, 24, M3Colors.onSurfaceVariant));
  }

  if (options.trailingSwitch) {
    children.push(createSwitch(width - 68, (height - 32) / 2, true));
  }

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: `List Item: ${headline}`,
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: M3Colors.surface, visible: true }],
    },
    children,
  };
}

/**
 * Create a Dialog
 */
function createDialog(
  title: string,
  content: string,
  x: number,
  y: number,
  buttons: Array<{ label: string; style?: 'text' | 'filled' }>
): PreserveFrameNode {
  const width = 312;
  const contentHeight = Math.ceil(content.length / 40) * 20;
  const height = 24 + 28 + 16 + contentHeight + 24 + 40 + 24;

  const children: PreserveNode[] = [
    createTextLabel('dialog-title', title, 24, 24, 'headlineSmall', M3Colors.onSurface),
    createTextLabel('dialog-content', content, 24, 68, 'bodyMedium', M3Colors.onSurfaceVariant),
  ];

  // Buttons
  let buttonX = width - 24;
  for (let i = buttons.length - 1; i >= 0; i--) {
    const btn = buttons[i]!;
    const btnWidth = btn.label.length * 9 + 24;
    buttonX -= btnWidth;

    if (btn.style === 'filled') {
      children.push(createFilledButton(`btn-${i}`, btn.label, buttonX, height - 64, {}));
    } else {
      children.push(createTextButton(`btn-${i}`, btn.label, buttonX, height - 64));
    }
    buttonX -= 8;
  }

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Dialog',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: M3Colors.surfaceContainerHigh, visible: true }],
      cornerRadius: M3Shape.extraLarge,
      effects: [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.25 },
        offset: { x: 0, y: 8 },
        blur: 24,
        spread: 0,
        visible: true,
      }],
    },
    children,
  };
}

/**
 * Create a Snackbar
 */
function createSnackbar(
  message: string,
  x: number,
  y: number,
  width: number,
  action?: string
): PreserveFrameNode {
  const height = 48;

  const children: PreserveNode[] = [
    createTextLabel('snackbar-message', message, 16, 14, 'bodyMedium', M3Colors.inversePrimary),
  ];

  if (action) {
    children.push(createTextButton('snackbar-action', action, width - action.length * 9 - 28, 4));
  }

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Snackbar',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: M3Colors.inverseSurface, visible: true }],
      cornerRadius: M3Shape.extraSmall,
      effects: [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.2 },
        offset: { x: 0, y: 4 },
        blur: 8,
        spread: 0,
        visible: true,
      }],
    },
    children,
  };
}

/**
 * Create a Progress Indicator (linear)
 */
function createLinearProgress(
  x: number,
  y: number,
  width: number,
  progress: number // 0-1
): PreserveFrameNode {
  const height = 4;

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Linear Progress',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: M3Colors.surfaceContainerHighest, visible: true }],
      cornerRadius: height / 2,
    },
    children: [{
      id: generateNodeId(),
      type: 'FRAME',
      name: 'Progress Fill',
      visible: true,
      transform: { x: 0, y: 0, width: width * progress, height, rotation: 0 },
      appearance: {
        fills: [{ type: 'SOLID', color: M3Colors.primary, visible: true }],
        cornerRadius: height / 2,
      },
    } as PreserveFrameNode],
  };
}

/**
 * Create a Circular Progress Indicator
 */
function createCircularProgress(
  x: number,
  y: number,
  size: number
): PreserveFrameNode {
  // Simplified representation - a ring with a partial fill
  const strokeWidth = 4;
  const innerSize = size - strokeWidth * 2;

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Circular Progress',
    visible: true,
    transform: { x, y, width: size, height: size, rotation: 0 },
    appearance: {
      fills: [],
      strokes: [{ type: 'SOLID', color: M3Colors.surfaceContainerHighest, visible: true }],
      strokeWeight: strokeWidth,
      cornerRadius: size / 2,
    },
    children: [{
      id: generateNodeId(),
      type: 'FRAME',
      name: 'Progress Arc',
      visible: true,
      transform: { x: strokeWidth, y: strokeWidth, width: innerSize, height: innerSize, rotation: 0 },
      appearance: {
        fills: [],
        strokes: [{ type: 'SOLID', color: M3Colors.primary, visible: true }],
        strokeWeight: strokeWidth,
        cornerRadius: innerSize / 2,
      },
    } as PreserveFrameNode],
  };
}

// =============================================================================
// Page Generators
// =============================================================================

/**
 * Create the Component Library page
 */
function createComponentLibraryPage(): PreservePage {
  const device = AndroidDevices.pixel8Pro;
  const nodes: PreserveNode[] = [];

  // Phone frame
  const phoneFrame: PreserveFrameNode = {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Pixel 8 Pro - Components',
    visible: true,
    transform: { x: 100, y: 100, width: device.width, height: device.height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: M3Colors.surface, visible: true }],
      cornerRadius: 32,
    },
    clipContent: true,
    children: [
      // Top App Bar
      createTopAppBar('Components', 0, 0, device.width, 'small'),

      // Buttons section
      createTextLabel('buttons-header', 'Buttons', 16, 80, 'titleMedium', M3Colors.onSurface),
      createFilledButton('btn-filled', 'Filled', 16, 112, {}),
      createFilledButton('btn-icon', 'With Icon', 110, 112, { icon: 'add' }),
      createOutlinedButton('btn-outlined', 'Outlined', 16, 164),
      createTonalButton('btn-tonal', 'Tonal', 140, 164),
      createTextButton('btn-text', 'Text', 250, 164),

      // FAB section
      createTextLabel('fab-header', 'FAB', 16, 220, 'titleMedium', M3Colors.onSurface),
      createFAB('fab-small', 'add', 16, 252, 'small'),
      createFAB('fab-regular', 'edit', 72, 244, 'regular'),
      createFAB('fab-extended', 'create', 144, 244, 'extended', 'Create'),

      // Chips section
      createTextLabel('chips-header', 'Chips', 16, 316, 'titleMedium', M3Colors.onSurface),
      createChip('chip-assist', 'Assist', 16, 348, 'assist'),
      createChip('chip-filter', 'Filter', 92, 348, 'filter', true),
      createChip('chip-input', 'Input', 172, 348, 'input', false),
      createChip('chip-suggestion', 'Suggestion', 244, 348, 'suggestion'),

      // Controls section
      createTextLabel('controls-header', 'Controls', 16, 396, 'titleMedium', M3Colors.onSurface),
      createSwitch(16, 428, true),
      createSwitch(84, 428, false),
      createCheckbox(152, 434, true),
      createCheckbox(186, 434, false),
      createRadioButton(220, 432, true),
      createRadioButton(254, 432, false),

      // Slider
      createSlider(16, 480, device.width - 32, 0.6),

      // Text Fields
      createTextLabel('fields-header', 'Text Fields', 16, 540, 'titleMedium', M3Colors.onSurface),
      createTextField('email-field', 'Email', 16, 572, device.width - 32, { leadingIcon: 'email' }),
      createTextField('error-field', 'Password', 16, 644, device.width - 32, { hasError: true, supportingText: 'Password is required', trailingIcon: 'visibility' }),

      // Cards
      createTextLabel('cards-header', 'Cards', 16, 730, 'titleMedium', M3Colors.onSurface),
      (() => {
        const card = createCard('Elevated Card', 16, 762, device.width / 2 - 24, 100, 'elevated');
        card.children = [createTextLabel('card-text', 'Elevated', 0, 0, 'bodyMedium', M3Colors.onSurface)];
        return card;
      })(),
      (() => {
        const card = createCard('Filled Card', device.width / 2 + 8, 762, device.width / 2 - 24, 100, 'filled');
        card.children = [createTextLabel('card-text', 'Filled', 0, 0, 'bodyMedium', M3Colors.onSurface)];
        return card;
      })(),

      // Bottom Navigation
      createBottomNavBar(0, device.height - 80, device.width, [
        { icon: 'home', label: 'Home', selected: true },
        { icon: 'search', label: 'Search' },
        { icon: 'notifications', label: 'Alerts' },
        { icon: 'person', label: 'Profile' },
      ]),
    ],
  };

  nodes.push(phoneFrame);

  // Tablet frame
  const tabletDevice = AndroidDevices.pixelTablet;
  const tabletFrame: PreserveFrameNode = {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Pixel Tablet - Components',
    visible: true,
    transform: { x: 600, y: 100, width: tabletDevice.width, height: tabletDevice.height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: M3Colors.surface, visible: true }],
      cornerRadius: 24,
    },
    clipContent: true,
    children: [
      createTopAppBar('Material Design 3', 0, 0, tabletDevice.width, 'large'),

      // Navigation Drawer items
      createNavDrawerItem('home', 'Home', 16, 168, 280, true),
      createNavDrawerItem('settings', 'Settings', 16, 224, 280),
      createNavDrawerItem('info', 'About', 16, 280, 280),

      // List Items
      createTextLabel('list-header', 'List Items', 320, 168, 'titleMedium', M3Colors.onSurface),
      createListItem('Single-line item', 320, 200, tabletDevice.width - 336, { leadingIcon: 'person' }),
      createListItem('Two-line item', 320, 256, tabletDevice.width - 336, { supportingText: 'Supporting text', leadingIcon: 'email', trailingIcon: 'chevron_right' }),
      createListItem('With switch', 320, 328, tabletDevice.width - 336, { leadingIcon: 'notifications', trailingSwitch: true }),

      // Dialog
      createDialog('Discard draft?', 'Your changes will be lost. Are you sure you want to discard this draft?', (tabletDevice.width - 312) / 2, 420, [
        { label: 'Cancel', style: 'text' },
        { label: 'Discard', style: 'filled' },
      ]),

      // Snackbar
      createSnackbar('Message sent successfully', 16, tabletDevice.height - 120, tabletDevice.width - 32, 'Undo'),

      // Progress indicators
      createTextLabel('progress-header', 'Progress', 320, 650, 'titleMedium', M3Colors.onSurface),
      createLinearProgress(320, 690, 240, 0.7),
      createCircularProgress(320, 720, 48),
    ],
  };

  nodes.push(tabletFrame);

  return {
    $schema: 'https://designlibre.app/schemas/preserve/1.0/page.json',
    id: 'page-components',
    name: 'Component Library',
    backgroundColor: { r: 0.12, g: 0.11, b: 0.14, a: 1 },
    nodes,
  };
}

/**
 * Create Typography page
 */
function createTypographyPage(): PreservePage {
  const nodes: PreserveNode[] = [];

  const frame: PreserveFrameNode = {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Typography Scale',
    visible: true,
    transform: { x: 100, y: 100, width: 700, height: 900, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: M3Colors.surface, visible: true }],
      cornerRadius: M3Shape.large,
    },
    layout: {
      autoLayout: 'VERTICAL',
      padding: { top: 32, right: 32, bottom: 32, left: 32 },
      gap: 16,
    },
    children: [],
  };

  const styles: Array<[string, keyof typeof M3Typography]> = [
    ['Display Large', 'displayLarge'],
    ['Display Medium', 'displayMedium'],
    ['Display Small', 'displaySmall'],
    ['Headline Large', 'headlineLarge'],
    ['Headline Medium', 'headlineMedium'],
    ['Headline Small', 'headlineSmall'],
    ['Title Large', 'titleLarge'],
    ['Title Medium', 'titleMedium'],
    ['Title Small', 'titleSmall'],
    ['Body Large', 'bodyLarge'],
    ['Body Medium', 'bodyMedium'],
    ['Body Small', 'bodySmall'],
    ['Label Large', 'labelLarge'],
    ['Label Medium', 'labelMedium'],
    ['Label Small', 'labelSmall'],
  ];

  styles.forEach(([name, style]) => {
    const typo = M3Typography[style];
    const row: PreserveFrameNode = {
      id: generateNodeId(),
      type: 'FRAME',
      name: `Typography: ${name}`,
      visible: true,
      transform: { x: 0, y: 0, width: 636, height: typo.lineHeight + 8, rotation: 0 },
      layout: {
        autoLayout: 'HORIZONTAL',
        gap: 24,
        alignItems: 'CENTER',
      },
      children: [
        createTextLabel(`typo-${style}`, name, 0, 0, style, M3Colors.onSurface),
        createTextLabel(`typo-${style}-meta`, `${typo.fontSize}sp / ${typo.fontWeight}`, 300, 0, 'labelSmall', M3Colors.onSurfaceVariant),
      ],
    };
    frame.children!.push(row);
  });

  nodes.push(frame);

  return {
    $schema: 'https://designlibre.app/schemas/preserve/1.0/page.json',
    id: 'page-typography',
    name: 'Typography',
    backgroundColor: { r: 0.12, g: 0.11, b: 0.14, a: 1 },
    nodes,
  };
}

/**
 * Create Color Palette page
 */
function createColorsPage(): PreservePage {
  const nodes: PreserveNode[] = [];

  const colorGroups = [
    { name: 'Primary', colors: ['primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer'] },
    { name: 'Secondary', colors: ['secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer'] },
    { name: 'Tertiary', colors: ['tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer'] },
    { name: 'Error', colors: ['error', 'onError', 'errorContainer', 'onErrorContainer'] },
    { name: 'Surface', colors: ['surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant'] },
    { name: 'Outline', colors: ['outline', 'outlineVariant'] },
  ];

  let groupY = 100;
  const swatchSize = 80;
  const gap = 12;

  colorGroups.forEach(group => {
    // Group label
    nodes.push(createTextLabel(`group-${group.name}`, group.name, 100, groupY, 'titleMedium', M3Colors.onSurface));
    groupY += 32;

    let x = 100;
    group.colors.forEach(colorName => {
      const color = M3Colors[colorName as keyof typeof M3Colors];
      if (!color) return;

      const swatch: PreserveFrameNode = {
        id: generateNodeId(),
        type: 'FRAME',
        name: `Color: ${colorName}`,
        visible: true,
        transform: { x, y: groupY, width: swatchSize, height: swatchSize + 32, rotation: 0 },
        layout: {
          autoLayout: 'VERTICAL',
          gap: 4,
          alignItems: 'CENTER',
        },
        children: [
          {
            id: generateNodeId(),
            type: 'FRAME',
            name: 'Swatch',
            visible: true,
            transform: { x: 0, y: 0, width: swatchSize, height: swatchSize, rotation: 0 },
            appearance: {
              fills: [{ type: 'SOLID', color, visible: true }],
              cornerRadius: M3Shape.medium,
              effects: [{
                type: 'DROP_SHADOW',
                color: { r: 0, g: 0, b: 0, a: 0.1 },
                offset: { x: 0, y: 2 },
                blur: 4,
                spread: 0,
                visible: true,
              }],
            },
          } as PreserveFrameNode,
          createTextLabel(`label-${colorName}`, colorName.replace(/([A-Z])/g, '\n$1').trim(), 0, 0, 'labelSmall', M3Colors.onSurface),
        ],
      };

      nodes.push(swatch);
      x += swatchSize + gap;
    });

    groupY += swatchSize + gap + 48;
  });

  return {
    $schema: 'https://designlibre.app/schemas/preserve/1.0/page.json',
    id: 'page-colors',
    name: 'Color Palette',
    backgroundColor: M3Colors.surface,
    nodes,
  };
}

// =============================================================================
// Token Generation
// =============================================================================

function generateDesignTokens(): PreserveTokens {
  const groups: PreserveTokenGroup[] = [];

  // Color tokens
  groups.push({
    name: 'Material 3 Colors',
    tokens: Object.entries(M3Colors).map(([name, value]) => ({
      id: `color-${name}`,
      name: `m3/${name}`,
      type: 'COLOR' as const,
      value,
      description: `Material 3 ${name.replace(/([A-Z])/g, ' $1').trim()}`,
    })),
  });

  // Typography tokens
  groups.push({
    name: 'Material 3 Typography',
    tokens: Object.entries(M3Typography).map(([name, value]) => ({
      id: `typography-${name}`,
      name: `m3/typography/${name}`,
      type: 'TYPOGRAPHY' as const,
      value: {
        fontFamily: value.fontFamily,
        fontWeight: value.fontWeight,
        fontSize: value.fontSize,
        lineHeight: { unit: 'PIXELS' as const, value: value.lineHeight },
        letterSpacing: { unit: 'PIXELS' as const, value: value.letterSpacing },
      },
      description: `Material 3 ${name} text style`,
    })),
  });

  // Spacing tokens
  groups.push({
    name: 'Material 3 Spacing',
    tokens: Object.entries(M3Spacing).map(([name, value]) => ({
      id: `spacing-${name}`,
      name: `m3/spacing/${name}`,
      type: 'SPACING' as const,
      value,
      description: `Material 3 ${name} spacing (${value}dp)`,
    })),
  });

  // Shape tokens
  groups.push({
    name: 'Material 3 Shape',
    tokens: Object.entries(M3Shape).map(([name, value]) => ({
      id: `shape-${name}`,
      name: `m3/shape/${name}`,
      type: 'RADIUS' as const,
      value,
      description: `Material 3 ${name} corner radius`,
    })),
  });

  return {
    $schema: 'https://designlibre.app/schemas/preserve/1.0/tokens.json',
    version: '1.0.0',
    groups,
  };
}

// =============================================================================
// Main Template Generator
// =============================================================================

/**
 * Generate the complete Kotlin/Android Material Design 3 template archive
 */
export function generateKotlinMaterial3Template(): PreserveArchive {
  nodeIdCounter = 0;

  const now = new Date().toISOString();

  const componentLibraryPage = createComponentLibraryPage();
  const typographyPage = createTypographyPage();
  const colorsPage = createColorsPage();

  const pages = new Map<string, PreservePage>();
  pages.set('page-components', componentLibraryPage);
  pages.set('page-typography', typographyPage);
  pages.set('page-colors', colorsPage);

  const document: PreserveDocument = {
    $schema: 'https://designlibre.app/schemas/preserve/1.0/document.json',
    id: 'doc-kotlin-m3-template',
    name: 'Kotlin Material Design 3 Template',
    formatVersion: '1.0.0',
    created: now,
    modified: now,
    authors: [{ name: 'DesignLibre', email: 'templates@designlibre.app' }],
    pages: [
      { id: 'page-components', name: 'Component Library', path: 'pages/page-components.json' },
      { id: 'page-typography', name: 'Typography', path: 'pages/page-typography.json' },
      { id: 'page-colors', name: 'Color Palette', path: 'pages/page-colors.json' },
    ],
    settings: {
      colorSpace: 'sRGB',
      defaultUnit: 'px',
    },
  };

  const components: PreserveComponentRegistry = {
    $schema: 'https://designlibre.app/schemas/preserve/1.0/components.json',
    components: [],
    componentSets: [],
  };

  const tokens = generateDesignTokens();

  const manifest = {
    version: '1.0.0',
    generator: 'DesignLibre Kotlin M3 Template Generator',
    created: now,
    modified: now,
    entries: [
      { path: 'document.json', type: 'document' as const, size: 0 },
      { path: 'pages/page-components.json', type: 'page' as const, size: 0 },
      { path: 'pages/page-typography.json', type: 'page' as const, size: 0 },
      { path: 'pages/page-colors.json', type: 'page' as const, size: 0 },
      { path: 'tokens/tokens.json', type: 'tokens' as const, size: 0 },
      { path: 'components/registry.json', type: 'component' as const, size: 0 },
    ],
  };

  return {
    manifest,
    document,
    pages,
    components,
    tokens,
  };
}

/**
 * Export helper for Compose code comments
 */
export const KotlinComposeMappings = {
  filledButton: '// Compose: Button(onClick = {}) { Text("Label") }',
  outlinedButton: '// Compose: OutlinedButton(onClick = {}) { Text("Label") }',
  tonalButton: '// Compose: FilledTonalButton(onClick = {}) { Text("Label") }',
  textButton: '// Compose: TextButton(onClick = {}) { Text("Label") }',
  fab: '// Compose: FloatingActionButton(onClick = {}) { Icon(...) }',
  extendedFab: '// Compose: ExtendedFloatingActionButton(onClick = {}, icon = {...}, text = {...})',
  card: '// Compose: Card { ... } or ElevatedCard { ... } or OutlinedCard { ... }',
  textField: '// Compose: OutlinedTextField(value = ..., onValueChange = ..., label = {...})',
  switch: '// Compose: Switch(checked = ..., onCheckedChange = ...)',
  checkbox: '// Compose: Checkbox(checked = ..., onCheckedChange = ...)',
  radioButton: '// Compose: RadioButton(selected = ..., onClick = ...)',
  slider: '// Compose: Slider(value = ..., onValueChange = ...)',
  chip: '// Compose: AssistChip { ... } or FilterChip { ... } or InputChip { ... }',
  topAppBar: '// Compose: TopAppBar(title = {...}, navigationIcon = {...}, actions = {...})',
  bottomNavBar: '// Compose: NavigationBar { NavigationBarItem(...) }',
  dialog: '// Compose: AlertDialog(onDismissRequest = ..., confirmButton = ..., dismissButton = ...)',
  snackbar: '// Compose: Snackbar { Text("Message") }',
  listItem: '// Compose: ListItem(headlineContent = {...}, supportingContent = {...})',
  linearProgress: '// Compose: LinearProgressIndicator(progress = ...)',
  circularProgress: '// Compose: CircularProgressIndicator()',
};
