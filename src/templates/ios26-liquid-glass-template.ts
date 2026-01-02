/**
 * iOS 26 Liquid Glass Template Generator
 *
 * Creates a comprehensive .preserve template file containing all iOS 26
 * Liquid Glass design elements with 1:1 WYSIWYG mapping to SwiftUI code.
 *
 * Based on Apple's iOS 26 Human Interface Guidelines and Liquid Glass design system.
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
// iOS 26 Design Tokens
// =============================================================================

/** iOS 26 System Colors (Light Mode) */
export const iOS26Colors = {
  // Primary System Colors
  systemBlue: { r: 0, g: 0.478, b: 1, a: 1 } as RGBA,
  systemGreen: { r: 0.204, g: 0.78, b: 0.349, a: 1 } as RGBA,
  systemOrange: { r: 1, g: 0.584, b: 0, a: 1 } as RGBA,
  systemRed: { r: 1, g: 0.231, b: 0.188, a: 1 } as RGBA,
  systemYellow: { r: 1, g: 0.8, b: 0, a: 1 } as RGBA,
  systemPink: { r: 1, g: 0.176, b: 0.333, a: 1 } as RGBA,
  systemPurple: { r: 0.686, g: 0.322, b: 0.871, a: 1 } as RGBA,
  systemTeal: { r: 0.188, g: 0.69, b: 0.78, a: 1 } as RGBA,
  systemCyan: { r: 0.196, g: 0.678, b: 0.902, a: 1 } as RGBA,
  systemMint: { r: 0, g: 0.78, b: 0.745, a: 1 } as RGBA,
  systemIndigo: { r: 0.345, g: 0.337, b: 0.839, a: 1 } as RGBA,
  systemBrown: { r: 0.635, g: 0.518, b: 0.369, a: 1 } as RGBA,

  // Liquid Glass Materials
  glassRegular: { r: 0.97, g: 0.97, b: 0.98, a: 0.7 } as RGBA,
  glassThick: { r: 0.95, g: 0.95, b: 0.97, a: 0.85 } as RGBA,
  glassThin: { r: 0.98, g: 0.98, b: 0.99, a: 0.5 } as RGBA,
  glassUltraThin: { r: 0.99, g: 0.99, b: 1, a: 0.3 } as RGBA,

  // Semantic Colors
  labelPrimary: { r: 0, g: 0, b: 0, a: 1 } as RGBA,
  labelSecondary: { r: 0.235, g: 0.235, b: 0.263, a: 0.6 } as RGBA,
  labelTertiary: { r: 0.235, g: 0.235, b: 0.263, a: 0.3 } as RGBA,
  labelQuaternary: { r: 0.235, g: 0.235, b: 0.263, a: 0.18 } as RGBA,

  // Background Colors
  systemBackground: { r: 1, g: 1, b: 1, a: 1 } as RGBA,
  secondarySystemBackground: { r: 0.949, g: 0.949, b: 0.969, a: 1 } as RGBA,
  tertiarySystemBackground: { r: 1, g: 1, b: 1, a: 1 } as RGBA,

  // Grouped Background
  systemGroupedBackground: { r: 0.949, g: 0.949, b: 0.969, a: 1 } as RGBA,
  secondaryGroupedBackground: { r: 1, g: 1, b: 1, a: 1 } as RGBA,

  // Fill Colors
  systemFill: { r: 0.471, g: 0.471, b: 0.502, a: 0.2 } as RGBA,
  secondaryFill: { r: 0.471, g: 0.471, b: 0.502, a: 0.16 } as RGBA,
  tertiaryFill: { r: 0.463, g: 0.463, b: 0.502, a: 0.12 } as RGBA,
  quaternaryFill: { r: 0.455, g: 0.455, b: 0.502, a: 0.08 } as RGBA,

  // Separator
  separator: { r: 0.235, g: 0.235, b: 0.263, a: 0.29 } as RGBA,
  opaqueSeparator: { r: 0.776, g: 0.776, b: 0.784, a: 1 } as RGBA,
};

/** iOS 26 Typography Scale */
export const iOS26Typography = {
  largeTitle: { fontFamily: 'SF Pro Display', fontWeight: 700, fontSize: 34, lineHeight: 41 },
  title1: { fontFamily: 'SF Pro Display', fontWeight: 700, fontSize: 28, lineHeight: 34 },
  title2: { fontFamily: 'SF Pro Display', fontWeight: 700, fontSize: 22, lineHeight: 28 },
  title3: { fontFamily: 'SF Pro Display', fontWeight: 600, fontSize: 20, lineHeight: 25 },
  headline: { fontFamily: 'SF Pro Text', fontWeight: 600, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: 'SF Pro Text', fontWeight: 400, fontSize: 17, lineHeight: 22 },
  callout: { fontFamily: 'SF Pro Text', fontWeight: 400, fontSize: 16, lineHeight: 21 },
  subheadline: { fontFamily: 'SF Pro Text', fontWeight: 400, fontSize: 15, lineHeight: 20 },
  footnote: { fontFamily: 'SF Pro Text', fontWeight: 400, fontSize: 13, lineHeight: 18 },
  caption1: { fontFamily: 'SF Pro Text', fontWeight: 400, fontSize: 12, lineHeight: 16 },
  caption2: { fontFamily: 'SF Pro Text', fontWeight: 400, fontSize: 11, lineHeight: 13 },
};

/** iOS 26 Spacing Scale */
export const iOS26Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

/** iOS 26 Corner Radius */
export const iOS26Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 9999,
  // Concentric radius calculation
  containerConcentric: (parentRadius: number, padding: number) => Math.max(0, parentRadius - padding),
};

/** iOS 26 Device Dimensions */
export const iOS26Devices = {
  iPhone16Pro: { width: 393, height: 852, safeAreaTop: 59, safeAreaBottom: 34 },
  iPhone16ProMax: { width: 430, height: 932, safeAreaTop: 59, safeAreaBottom: 34 },
  iPadPro11: { width: 834, height: 1194, safeAreaTop: 24, safeAreaBottom: 20 },
  iPadPro13: { width: 1024, height: 1366, safeAreaTop: 24, safeAreaBottom: 20 },
};

// =============================================================================
// Component Generators
// =============================================================================

let nodeIdCounter = 0;
function generateNodeId(): string {
  return `node-${++nodeIdCounter}`;
}

/**
 * Create a Liquid Glass container (maps to .glassEffect())
 */
function createGlassContainer(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    material?: 'regular' | 'thick' | 'thin' | 'ultraThin';
    cornerRadius?: number;
    tint?: RGBA;
    children?: PreserveNode[];
  } = {}
): PreserveFrameNode {
  const material = options.material ?? 'regular';
  const materialColors = {
    regular: iOS26Colors.glassRegular,
    thick: iOS26Colors.glassThick,
    thin: iOS26Colors.glassThin,
    ultraThin: iOS26Colors.glassUltraThin,
  };

  const baseColor = materialColors[material];
  const fillColor = options.tint
    ? { r: (baseColor.r + options.tint.r) / 2, g: (baseColor.g + options.tint.g) / 2, b: (baseColor.b + options.tint.b) / 2, a: baseColor.a }
    : baseColor;

  const node: PreserveFrameNode = {
    id: generateNodeId(),
    type: 'FRAME',
    name,
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: fillColor, opacity: 1, visible: true }],
      cornerRadius: options.cornerRadius ?? iOS26Radius.lg,
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.1 },
          offset: { x: 0, y: 2 },
          blur: 8,
          spread: 0,
          visible: true,
        },
        {
          type: 'BACKGROUND_BLUR',
          radius: 20,
          visible: true,
        },
      ],
    },
    layout: {
      autoLayout: 'VERTICAL',
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      gap: 8,
      alignItems: 'STRETCH',
    },
  };

  if (options.children) {
    node.children = options.children;
  }

  return node;
}

/**
 * Create a text label (maps to Text() in SwiftUI)
 */
function createTextLabel(
  name: string,
  text: string,
  x: number,
  y: number,
  style: keyof typeof iOS26Typography,
  color: RGBA = iOS26Colors.labelPrimary
): PreserveTextNode {
  const typo = iOS26Typography[style];
  return {
    id: generateNodeId(),
    type: 'TEXT',
    name,
    visible: true,
    transform: { x, y, width: 200, height: typo.lineHeight, rotation: 0 },
    characters: text,
    styles: [{
      start: 0,
      end: text.length,
      fontFamily: typo.fontFamily,
      fontWeight: typo.fontWeight,
      fontSize: typo.fontSize,
      lineHeight: { unit: 'PIXELS', value: typo.lineHeight },
      fills: [{ type: 'SOLID', color, visible: true }],
    }],
    textAlignHorizontal: 'LEFT',
    textAlignVertical: 'TOP',
    textAutoResize: 'WIDTH_AND_HEIGHT',
  };
}

/**
 * Create a button (maps to Button in SwiftUI with .glassEffect)
 */
function createButton(
  name: string,
  label: string,
  x: number,
  y: number,
  style: 'primary' | 'secondary' | 'bordered' | 'glass' = 'primary'
): PreserveFrameNode {
  const height = 50;
  const padding = 20;
  const width = label.length * 10 + padding * 2;

  let fill: RGBA;
  let textColor: RGBA;

  switch (style) {
    case 'primary':
      fill = iOS26Colors.systemBlue;
      textColor = { r: 1, g: 1, b: 1, a: 1 };
      break;
    case 'secondary':
      fill = iOS26Colors.secondaryFill;
      textColor = iOS26Colors.systemBlue;
      break;
    case 'bordered':
      fill = { r: 0, g: 0, b: 0, a: 0 };
      textColor = iOS26Colors.systemBlue;
      break;
    case 'glass':
      fill = iOS26Colors.glassRegular;
      textColor = iOS26Colors.labelPrimary;
      break;
  }

  const appearance: PreserveFrameNode['appearance'] = {
    fills: [{ type: 'SOLID', color: fill, visible: true }],
    cornerRadius: iOS26Radius.pill,
  };

  if (style === 'bordered') {
    appearance.strokes = [{ type: 'SOLID', color: iOS26Colors.systemBlue, visible: true }];
    appearance.strokeWeight = 1;
  }

  if (style === 'glass') {
    appearance.effects = [{
      type: 'BACKGROUND_BLUR',
      radius: 20,
      visible: true,
    }];
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
      padding: { top: 0, right: padding, bottom: 0, left: padding },
      alignItems: 'CENTER',
      justifyContent: 'CENTER',
    },
    children: [createTextLabel(`${name}-label`, label, 0, 0, 'headline', textColor)],
  };
}

/**
 * Create a navigation bar (maps to NavigationStack with .toolbar)
 */
function createNavigationBar(
  title: string,
  x: number,
  y: number,
  width: number,
  options: {
    hasBackButton?: boolean;
    rightButtons?: string[];
    style?: 'inline' | 'large';
  } = {}
): PreserveFrameNode {
  const height = options.style === 'large' ? 96 : 44;
  const children: PreserveNode[] = [];

  // Back button
  if (options.hasBackButton) {
    children.push(createSFSymbol('chevron.left', 0, 0, 22, iOS26Colors.systemBlue));
  }

  // Title
  const titleStyle = options.style === 'large' ? 'largeTitle' : 'headline';
  children.push(createTextLabel('nav-title', title, options.hasBackButton ? 32 : 16, options.style === 'large' ? 52 : 11, titleStyle));

  // Right buttons
  if (options.rightButtons) {
    let rightX = width - 16;
    for (const btn of options.rightButtons.reverse()) {
      rightX -= 24;
      children.push(createSFSymbol(btn, rightX, 10, 22, iOS26Colors.systemBlue));
    }
  }

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Navigation Bar',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: iOS26Colors.glassThick, visible: true }],
      effects: [{
        type: 'BACKGROUND_BLUR',
        radius: 30,
        visible: true,
      }],
    },
    layout: {
      autoLayout: 'HORIZONTAL',
      padding: { top: 0, right: 16, bottom: 0, left: 16 },
      alignItems: 'CENTER',
    },
    children,
  };
}

/**
 * Create a tab bar (maps to TabView with .tabViewStyle(.tabBarOnly))
 */
function createTabBar(
  x: number,
  y: number,
  width: number,
  tabs: Array<{ icon: string; label: string; selected?: boolean }>
): PreserveFrameNode {
  const height = 83; // Standard tab bar height with safe area
  const tabWidth = width / tabs.length;
  const children: PreserveNode[] = [];

  tabs.forEach((tab, index) => {
    const color = tab.selected ? iOS26Colors.systemBlue : iOS26Colors.labelSecondary;
    const tabX = index * tabWidth + tabWidth / 2 - 20;

    // Icon
    children.push(createSFSymbol(tab.icon, tabX, 8, 24, color));

    // Label
    children.push(createTextLabel(`tab-${index}-label`, tab.label, tabX - 10, 36, 'caption2', color));
  });

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Tab Bar',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: iOS26Colors.glassThick, visible: true }],
      effects: [{
        type: 'BACKGROUND_BLUR',
        radius: 30,
        visible: true,
      }],
    },
    children,
  };
}

/**
 * Create an SF Symbol placeholder (simplified representation)
 */
function createSFSymbol(
  symbolName: string,
  x: number,
  y: number,
  size: number,
  color: RGBA
): PreserveVectorNode {
  // Create a simple placeholder shape for the symbol
  // In a real implementation, we'd use actual SF Symbol paths
  return {
    id: generateNodeId(),
    type: 'VECTOR',
    name: `SF Symbol: ${symbolName}`,
    visible: true,
    transform: { x, y, width: size, height: size, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color, visible: true }],
    },
    paths: [{
      windingRule: 'NONZERO',
      commands: [
        { type: 'M', x: size / 2, y: 0 },
        { type: 'L', x: size, y: size / 2 },
        { type: 'L', x: size / 2, y: size },
        { type: 'L', x: 0, y: size / 2 },
        { type: 'Z' },
      ],
    }],
  };
}

/**
 * Create a list row (maps to List row in SwiftUI)
 */
function createListRow(
  title: string,
  subtitle: string | null,
  x: number,
  y: number,
  width: number,
  options: {
    hasChevron?: boolean;
    hasSwitch?: boolean;
    leadingIcon?: string;
  } = {}
): PreserveFrameNode {
  const height = subtitle ? 72 : 44;
  const children: PreserveNode[] = [];

  let contentX = 16;

  // Leading icon
  if (options.leadingIcon) {
    children.push(createSFSymbol(options.leadingIcon, contentX, (height - 24) / 2, 24, iOS26Colors.systemBlue));
    contentX += 40;
  }

  // Title
  children.push(createTextLabel('row-title', title, contentX, subtitle ? 12 : (height - 22) / 2, 'body'));

  // Subtitle
  if (subtitle) {
    children.push(createTextLabel('row-subtitle', subtitle, contentX, 36, 'subheadline', iOS26Colors.labelSecondary));
  }

  // Chevron
  if (options.hasChevron) {
    children.push(createSFSymbol('chevron.right', width - 32, (height - 16) / 2, 16, iOS26Colors.labelTertiary));
  }

  // Switch
  if (options.hasSwitch) {
    children.push(createSwitch(width - 67, (height - 31) / 2, true));
  }

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: `List Row: ${title}`,
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: iOS26Colors.secondaryGroupedBackground, visible: true }],
    },
    children,
  };
}

/**
 * Create a toggle switch (maps to Toggle in SwiftUI)
 */
function createSwitch(x: number, y: number, isOn: boolean): PreserveFrameNode {
  const width = 51;
  const height = 31;

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Toggle Switch',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: isOn ? iOS26Colors.systemGreen : iOS26Colors.systemFill, visible: true }],
      cornerRadius: height / 2,
    },
    children: [{
      id: generateNodeId(),
      type: 'FRAME',
      name: 'Toggle Thumb',
      visible: true,
      transform: { x: isOn ? 22 : 2, y: 2, width: 27, height: 27, rotation: 0 },
      appearance: {
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }],
        cornerRadius: 13.5,
        effects: [{
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.15 },
          offset: { x: 0, y: 3 },
          blur: 8,
          spread: 0,
          visible: true,
        }],
      },
    } as PreserveFrameNode],
  };
}

/**
 * Create a text field (maps to TextField in SwiftUI)
 */
function createTextField(
  placeholder: string,
  x: number,
  y: number,
  width: number
): PreserveFrameNode {
  const height = 44;

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Text Field',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: iOS26Colors.tertiaryFill, visible: true }],
      cornerRadius: iOS26Radius.md,
    },
    layout: {
      autoLayout: 'HORIZONTAL',
      padding: { top: 0, right: 12, bottom: 0, left: 12 },
      alignItems: 'CENTER',
    },
    children: [createTextLabel('placeholder', placeholder, 0, 0, 'body', iOS26Colors.labelTertiary)],
  };
}

/**
 * Create a card component (maps to GroupBox or custom card in SwiftUI)
 */
function createCard(
  title: string,
  content: string,
  x: number,
  y: number,
  width: number
): PreserveFrameNode {
  const contentHeight = Math.ceil(content.length / 40) * 22;
  const height = 16 + 22 + 8 + contentHeight + 16;

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: `Card: ${title}`,
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: iOS26Colors.secondaryGroupedBackground, visible: true }],
      cornerRadius: iOS26Radius.lg,
      effects: [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.05 },
        offset: { x: 0, y: 1 },
        blur: 4,
        spread: 0,
        visible: true,
      }],
    },
    layout: {
      autoLayout: 'VERTICAL',
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      gap: 8,
    },
    children: [
      createTextLabel('card-title', title, 0, 0, 'headline'),
      createTextLabel('card-content', content, 0, 0, 'body', iOS26Colors.labelSecondary),
    ],
  };
}

/**
 * Create a segmented control (maps to Picker with .pickerStyle(.segmented))
 */
function createSegmentedControl(
  segments: string[],
  selectedIndex: number,
  x: number,
  y: number,
  width: number
): PreserveFrameNode {
  const height = 32;
  const segmentWidth = (width - 4) / segments.length;
  const children: PreserveNode[] = [];

  segments.forEach((segment, index) => {
    const isSelected = index === selectedIndex;
    const segmentX = 2 + index * segmentWidth;

    const segmentAppearance: PreserveFrameNode['appearance'] = {
      cornerRadius: iOS26Radius.sm,
    };

    if (isSelected) {
      segmentAppearance.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }];
      segmentAppearance.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 1 },
        blur: 3,
        spread: 0,
        visible: true,
      }];
    }

    const segmentFrame: PreserveFrameNode = {
      id: generateNodeId(),
      type: 'FRAME',
      name: `Segment: ${segment}`,
      visible: true,
      transform: { x: segmentX, y: 2, width: segmentWidth, height: height - 4, rotation: 0 },
      appearance: segmentAppearance,
      layout: {
        autoLayout: 'HORIZONTAL',
        alignItems: 'CENTER',
        justifyContent: 'CENTER',
      },
      children: [createTextLabel(`seg-${index}`, segment, 0, 0, 'subheadline', isSelected ? iOS26Colors.labelPrimary : iOS26Colors.labelSecondary)],
    };

    children.push(segmentFrame);
  });

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Segmented Control',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: iOS26Colors.tertiaryFill, visible: true }],
      cornerRadius: iOS26Radius.md,
    },
    children,
  };
}

/**
 * Create a slider (maps to Slider in SwiftUI)
 */
function createSlider(
  x: number,
  y: number,
  width: number,
  value: number // 0-1
): PreserveFrameNode {
  const height = 28;
  const trackHeight = 4;
  const thumbSize = 28;
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
        name: 'Slider Track',
        visible: true,
        transform: { x: 0, y: (height - trackHeight) / 2, width, height: trackHeight, rotation: 0 },
        appearance: {
          fills: [{ type: 'SOLID', color: iOS26Colors.systemFill, visible: true }],
          cornerRadius: trackHeight / 2,
        },
      } as PreserveFrameNode,
      // Track fill
      {
        id: generateNodeId(),
        type: 'FRAME',
        name: 'Slider Fill',
        visible: true,
        transform: { x: 0, y: (height - trackHeight) / 2, width: thumbX + thumbSize / 2, height: trackHeight, rotation: 0 },
        appearance: {
          fills: [{ type: 'SOLID', color: iOS26Colors.systemBlue, visible: true }],
          cornerRadius: trackHeight / 2,
        },
      } as PreserveFrameNode,
      // Thumb
      {
        id: generateNodeId(),
        type: 'FRAME',
        name: 'Slider Thumb',
        visible: true,
        transform: { x: thumbX, y: 0, width: thumbSize, height: thumbSize, rotation: 0 },
        appearance: {
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }],
          cornerRadius: thumbSize / 2,
          effects: [{
            type: 'DROP_SHADOW',
            color: { r: 0, g: 0, b: 0, a: 0.15 },
            offset: { x: 0, y: 2 },
            blur: 6,
            spread: 0,
            visible: true,
          }],
        },
      } as PreserveFrameNode,
    ],
  };
}

/**
 * Create an alert dialog (maps to .alert() in SwiftUI)
 */
function createAlert(
  title: string,
  message: string,
  x: number,
  y: number,
  buttons: Array<{ label: string; style?: 'default' | 'cancel' | 'destructive' }>
): PreserveFrameNode {
  const width = 270;
  const buttonHeight = 44;
  const contentPadding = 16;
  const messageHeight = Math.ceil(message.length / 35) * 20;
  const height = contentPadding + 22 + 8 + messageHeight + contentPadding + buttons.length * buttonHeight;

  const children: PreserveNode[] = [
    createTextLabel('alert-title', title, contentPadding, contentPadding, 'headline'),
    createTextLabel('alert-message', message, contentPadding, contentPadding + 30, 'footnote', iOS26Colors.labelSecondary),
  ];

  // Buttons
  let buttonY = height - buttons.length * buttonHeight;
  buttons.forEach((btn, index) => {
    let textColor = iOS26Colors.systemBlue;
    if (btn.style === 'destructive') textColor = iOS26Colors.systemRed;

    const buttonFrame: PreserveFrameNode = {
      id: generateNodeId(),
      type: 'FRAME',
      name: `Alert Button: ${btn.label}`,
      visible: true,
      transform: { x: 0, y: buttonY, width, height: buttonHeight, rotation: 0 },
      appearance: {
        strokes: [{ type: 'SOLID', color: iOS26Colors.separator, visible: true }],
        strokeWeight: 0.5,
      },
      layout: {
        autoLayout: 'HORIZONTAL',
        alignItems: 'CENTER',
        justifyContent: 'CENTER',
      },
      children: [createTextLabel(`btn-${index}`, btn.label, 0, 0, btn.style === 'cancel' ? 'headline' : 'body', textColor)],
    };
    children.push(buttonFrame);
    buttonY += buttonHeight;
  });

  return {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Alert Dialog',
    visible: true,
    transform: { x, y, width, height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: iOS26Colors.glassThick, visible: true }],
      cornerRadius: iOS26Radius.xl,
      effects: [{
        type: 'BACKGROUND_BLUR',
        radius: 40,
        visible: true,
      }, {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.2 },
        offset: { x: 0, y: 10 },
        blur: 30,
        spread: 0,
        visible: true,
      }],
    },
    children,
  };
}

// =============================================================================
// Page Generators
// =============================================================================

/**
 * Create the iOS 26 Component Library page
 */
function createComponentLibraryPage(): PreservePage {
  const device = iOS26Devices.iPhone16Pro;
  const nodes: PreserveNode[] = [];

  // Device frame
  const deviceFrame: PreserveFrameNode = {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'iPhone 16 Pro - Component Library',
    visible: true,
    transform: { x: 100, y: 100, width: device.width, height: device.height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: iOS26Colors.systemGroupedBackground, visible: true }],
      cornerRadius: 55,
    },
    clipContent: true,
    children: [
      // Navigation bar
      createNavigationBar('Components', 0, device.safeAreaTop, device.width, { style: 'large' }),

      // Buttons section
      createTextLabel('buttons-header', 'Buttons', 16, 160, 'title3'),
      createButton('Primary Button', 'Primary', 16, 195, 'primary'),
      createButton('Secondary Button', 'Secondary', 130, 195, 'secondary'),
      createButton('Glass Button', 'Glass', 16, 255, 'glass'),
      createButton('Bordered Button', 'Bordered', 110, 255, 'bordered'),

      // Controls section
      createTextLabel('controls-header', 'Controls', 16, 320, 'title3'),
      createSwitch(16, 355, true),
      createSwitch(85, 355, false),
      createSegmentedControl(['Day', 'Week', 'Month'], 1, 16, 400, device.width - 32),
      createSlider(16, 450, device.width - 32, 0.6),

      // Text fields section
      createTextLabel('inputs-header', 'Text Fields', 16, 500, 'title3'),
      createTextField('Enter your name...', 16, 535, device.width - 32),
      createTextField('Search', 16, 590, device.width - 32),

      // Cards section
      createTextLabel('cards-header', 'Cards', 16, 650, 'title3'),
      createCard('Welcome to iOS 26', 'Experience the new Liquid Glass design language with translucent materials and depth.', 16, 685, device.width - 32),

      // Tab bar
      createTabBar(0, device.height - 83, device.width, [
        { icon: 'house.fill', label: 'Home', selected: true },
        { icon: 'magnifyingglass', label: 'Search' },
        { icon: 'bell.fill', label: 'Notifications' },
        { icon: 'person.fill', label: 'Profile' },
      ]),
    ],
  };

  nodes.push(deviceFrame);

  // iPad frame with same components
  const iPadDevice = iOS26Devices.iPadPro11;
  const iPadFrame: PreserveFrameNode = {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'iPad Pro 11" - Component Library',
    visible: true,
    transform: { x: 600, y: 100, width: iPadDevice.width, height: iPadDevice.height, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: iOS26Colors.systemGroupedBackground, visible: true }],
      cornerRadius: 18,
    },
    clipContent: true,
    children: [
      createNavigationBar('iOS 26 Components', 0, iPadDevice.safeAreaTop, iPadDevice.width, { style: 'large', rightButtons: ['gear', 'plus'] }),

      // Liquid Glass showcase
      createGlassContainer('Glass Regular', 24, 140, 250, 150, { material: 'regular', children: [
        createTextLabel('glass-title', 'Regular Material', 0, 0, 'headline'),
        createTextLabel('glass-desc', '.regularMaterial', 0, 0, 'caption1', iOS26Colors.labelSecondary),
      ]}),
      createGlassContainer('Glass Thick', 290, 140, 250, 150, { material: 'thick', children: [
        createTextLabel('glass-title', 'Thick Material', 0, 0, 'headline'),
        createTextLabel('glass-desc', '.thickMaterial', 0, 0, 'caption1', iOS26Colors.labelSecondary),
      ]}),
      createGlassContainer('Glass Thin', 556, 140, 250, 150, { material: 'thin', children: [
        createTextLabel('glass-title', 'Thin Material', 0, 0, 'headline'),
        createTextLabel('glass-desc', '.thinMaterial', 0, 0, 'caption1', iOS26Colors.labelSecondary),
      ]}),

      // Tinted glass
      createGlassContainer('Tinted Blue', 24, 310, 185, 120, { material: 'regular', tint: iOS26Colors.systemBlue }),
      createGlassContainer('Tinted Green', 225, 310, 185, 120, { material: 'regular', tint: iOS26Colors.systemGreen }),
      createGlassContainer('Tinted Orange', 426, 310, 185, 120, { material: 'regular', tint: iOS26Colors.systemOrange }),
      createGlassContainer('Tinted Purple', 627, 310, 185, 120, { material: 'regular', tint: iOS26Colors.systemPurple }),

      // List rows
      createTextLabel('list-header', 'List Rows', 24, 450, 'title2'),
      createListRow('Wi-Fi', 'Connected', 24, 490, iPadDevice.width - 48, { hasChevron: true, leadingIcon: 'wifi' }),
      createListRow('Bluetooth', 'On', 24, 562, iPadDevice.width - 48, { hasSwitch: true, leadingIcon: 'antenna.radiowaves.left.and.right' }),
      createListRow('Notifications', null, 24, 606, iPadDevice.width - 48, { hasChevron: true, leadingIcon: 'bell.fill' }),

      // Alert preview
      createAlert('Delete Item?', 'This action cannot be undone. Are you sure you want to delete this item?', (iPadDevice.width - 270) / 2, 700, [
        { label: 'Cancel', style: 'cancel' },
        { label: 'Delete', style: 'destructive' },
      ]),
    ],
  };

  nodes.push(iPadFrame);

  return {
    $schema: 'https://designlibre.app/schemas/preserve/1.0/page.json',
    id: 'page-components',
    name: 'Component Library',
    backgroundColor: { r: 0.1, g: 0.1, b: 0.12, a: 1 },
    nodes,
  };
}

/**
 * Create the iOS 26 Typography page
 */
function createTypographyPage(): PreservePage {
  const nodes: PreserveNode[] = [];
  let y = 100;

  // Typography scale showcase
  const frame: PreserveFrameNode = {
    id: generateNodeId(),
    type: 'FRAME',
    name: 'Typography Scale',
    visible: true,
    transform: { x: 100, y: 100, width: 600, height: 700, rotation: 0 },
    appearance: {
      fills: [{ type: 'SOLID', color: iOS26Colors.systemBackground, visible: true }],
      cornerRadius: iOS26Radius.xl,
    },
    layout: {
      autoLayout: 'VERTICAL',
      padding: { top: 32, right: 32, bottom: 32, left: 32 },
      gap: 24,
    },
    children: [],
  };

  const styles: Array<[string, keyof typeof iOS26Typography]> = [
    ['Large Title', 'largeTitle'],
    ['Title 1', 'title1'],
    ['Title 2', 'title2'],
    ['Title 3', 'title3'],
    ['Headline', 'headline'],
    ['Body', 'body'],
    ['Callout', 'callout'],
    ['Subheadline', 'subheadline'],
    ['Footnote', 'footnote'],
    ['Caption 1', 'caption1'],
    ['Caption 2', 'caption2'],
  ];

  styles.forEach(([name, style]) => {
    const typo = iOS26Typography[style];
    const row: PreserveFrameNode = {
      id: generateNodeId(),
      type: 'FRAME',
      name: `Typography: ${name}`,
      visible: true,
      transform: { x: 0, y, width: 536, height: typo.lineHeight + 20, rotation: 0 },
      layout: {
        autoLayout: 'HORIZONTAL',
        gap: 16,
        alignItems: 'CENTER',
      },
      children: [
        createTextLabel(`typo-${style}`, name, 0, 0, style),
        createTextLabel(`typo-${style}-meta`, `${typo.fontSize}pt ${typo.fontWeight >= 600 ? 'Bold' : 'Regular'}`, 200, 0, 'caption1', iOS26Colors.labelSecondary),
      ],
    };
    frame.children!.push(row);
    y += typo.lineHeight + 24;
  });

  nodes.push(frame);

  return {
    $schema: 'https://designlibre.app/schemas/preserve/1.0/page.json',
    id: 'page-typography',
    name: 'Typography',
    backgroundColor: { r: 0.1, g: 0.1, b: 0.12, a: 1 },
    nodes,
  };
}

/**
 * Create the iOS 26 Colors page
 */
function createColorsPage(): PreservePage {
  const nodes: PreserveNode[] = [];

  // System colors grid
  const colorEntries = Object.entries(iOS26Colors);
  const swatchSize = 80;
  const gap = 16;
  const columns = 6;

  let x = 100;
  let y = 100;

  colorEntries.forEach(([name, color], index) => {
    if (index > 0 && index % columns === 0) {
      x = 100;
      y += swatchSize + gap + 24;
    }

    const swatch: PreserveFrameNode = {
      id: generateNodeId(),
      type: 'FRAME',
      name: `Color: ${name}`,
      visible: true,
      transform: { x, y, width: swatchSize, height: swatchSize + 24, rotation: 0 },
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
            cornerRadius: iOS26Radius.md,
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
        createTextLabel(`color-${name}`, name.replace(/([A-Z])/g, ' $1').trim(), 0, 0, 'caption2', iOS26Colors.labelPrimary),
      ],
    };

    nodes.push(swatch);
    x += swatchSize + gap;
  });

  return {
    $schema: 'https://designlibre.app/schemas/preserve/1.0/page.json',
    id: 'page-colors',
    name: 'Color Palette',
    backgroundColor: { r: 0.95, g: 0.95, b: 0.97, a: 1 },
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
    name: 'iOS 26 System Colors',
    tokens: Object.entries(iOS26Colors).map(([name, value]) => ({
      id: `color-${name}`,
      name: `ios26/${name}`,
      type: 'COLOR' as const,
      value,
      description: `iOS 26 ${name.replace(/([A-Z])/g, ' $1').trim()} color`,
    })),
  });

  // Typography tokens
  groups.push({
    name: 'iOS 26 Typography',
    tokens: Object.entries(iOS26Typography).map(([name, value]) => ({
      id: `typography-${name}`,
      name: `ios26/typography/${name}`,
      type: 'TYPOGRAPHY' as const,
      value: {
        fontFamily: value.fontFamily,
        fontWeight: value.fontWeight,
        fontSize: value.fontSize,
        lineHeight: { unit: 'PIXELS' as const, value: value.lineHeight },
      },
      description: `iOS 26 ${name} text style`,
    })),
  });

  // Spacing tokens
  groups.push({
    name: 'iOS 26 Spacing',
    tokens: Object.entries(iOS26Spacing).map(([name, value]) => ({
      id: `spacing-${name}`,
      name: `ios26/spacing/${name}`,
      type: 'SPACING' as const,
      value,
      description: `iOS 26 ${name} spacing (${value}pt)`,
    })),
  });

  // Radius tokens
  const radiusEntries = Object.entries(iOS26Radius).filter(([, v]) => typeof v === 'number');
  groups.push({
    name: 'iOS 26 Corner Radius',
    tokens: radiusEntries.map(([name, value]) => ({
      id: `radius-${name}`,
      name: `ios26/radius/${name}`,
      type: 'RADIUS' as const,
      value: value as number,
      description: `iOS 26 ${name} corner radius`,
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
 * Generate the complete iOS 26 Liquid Glass template archive
 */
export function generateiOS26Template(): PreserveArchive {
  nodeIdCounter = 0; // Reset counter

  const now = new Date().toISOString();

  // Create pages
  const componentLibraryPage = createComponentLibraryPage();
  const typographyPage = createTypographyPage();
  const colorsPage = createColorsPage();

  const pages = new Map<string, PreservePage>();
  pages.set('page-components', componentLibraryPage);
  pages.set('page-typography', typographyPage);
  pages.set('page-colors', colorsPage);

  // Create document
  const document: PreserveDocument = {
    $schema: 'https://designlibre.app/schemas/preserve/1.0/document.json',
    id: 'doc-ios26-template',
    name: 'iOS 26 Liquid Glass Template',
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
      colorSpace: 'Display P3',
      defaultUnit: 'pt',
    },
  };

  // Create component registry
  const components: PreserveComponentRegistry = {
    $schema: 'https://designlibre.app/schemas/preserve/1.0/components.json',
    components: [],
    componentSets: [],
  };

  // Create tokens
  const tokens = generateDesignTokens();

  // Create manifest
  const manifest = {
    version: '1.0.0',
    generator: 'DesignLibre iOS 26 Template Generator',
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
 * Export helper for Swift code comments
 */
export const iOS26SwiftMappings = {
  glassContainer: '// SwiftUI: .glassEffect(.regular)',
  button: '// SwiftUI: Button("Label") { }.buttonStyle(.borderedProminent)',
  navigationBar: '// SwiftUI: NavigationStack { }.toolbar { }',
  tabBar: '// SwiftUI: TabView { }.tabViewStyle(.tabBarOnly)',
  toggle: '// SwiftUI: Toggle("Label", isOn: $value)',
  textField: '// SwiftUI: TextField("Placeholder", text: $text)',
  slider: '// SwiftUI: Slider(value: $value)',
  segmentedControl: '// SwiftUI: Picker("", selection: $selection) { }.pickerStyle(.segmented)',
  alert: '// SwiftUI: .alert("Title", isPresented: $showing) { }',
  listRow: '// SwiftUI: List { ForEach { } }',
  card: '// SwiftUI: GroupBox("Title") { } or custom Card view',
};
