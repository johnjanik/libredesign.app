/**
 * Semantic Presets
 *
 * Pre-configured semantic metadata for library components.
 * Provides platform-aware defaults for accessibility, event handlers,
 * and code generation hints.
 */

import type {
  SemanticNodeType,
  SemanticMetadata,
  AccessibilityConfig,
  SemanticEventHandler,
  EventType,
  ActionType,
} from '@core/types/semantic-schema';

// =============================================================================
// Types
// =============================================================================

/**
 * Semantic preset with all configurations
 */
export interface SemanticPreset {
  /** Semantic type */
  semanticType: SemanticNodeType;
  /** Default accessibility config */
  accessibility: AccessibilityConfig;
  /** Common event handlers */
  eventHandlers: SemanticEventHandler[];
  /** Platform-specific hints */
  platformHints: {
    ios?: { swiftUIView: string; modifiers?: string[] };
    android?: { composeType: string; modifiers?: string[] };
    web?: { htmlElement: string; ariaRole?: string };
  };
  /** Suggested props for code generation */
  suggestedProps?: string[];
  /** Common state bindings */
  commonBindings?: string[];
}

// =============================================================================
// Event Handler Templates
// =============================================================================

/**
 * Create an event handler template
 */
function createEventHandler(
  event: EventType,
  actionType: ActionType,
  config: Record<string, unknown> = {}
): SemanticEventHandler {
  return {
    event,
    actionType,
    actionConfig: config,
    handlerName: `on${event.charAt(0).toUpperCase() + event.slice(1).replace(/^on/, '')}`,
  };
}

const PRESS_HANDLER = createEventHandler('onPress', 'custom', { placeholder: true });
const CHANGE_HANDLER = createEventHandler('onChange', 'setVariable', { placeholder: true });
const FOCUS_HANDLER = createEventHandler('onFocus', 'custom', { placeholder: true });
const BLUR_HANDLER = createEventHandler('onBlur', 'custom', { placeholder: true });

// =============================================================================
// Semantic Presets
// =============================================================================

/**
 * Pre-configured semantic presets for common component types
 */
export const SEMANTIC_PRESETS: Record<SemanticNodeType, SemanticPreset> = {
  // ---------------------------------------------------------------------------
  // Interactive Controls
  // ---------------------------------------------------------------------------

  Button: {
    semanticType: 'Button',
    accessibility: {
      role: 'button',
      focusable: true,
    },
    eventHandlers: [PRESS_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'Button', modifiers: ['.buttonStyle(.borderedProminent)'] },
      android: { composeType: 'Button', modifiers: ['onClick'] },
      web: { htmlElement: 'button', ariaRole: 'button' },
    },
    suggestedProps: ['label', 'isLoading', 'isDisabled', 'variant'],
    commonBindings: ['isLoading', 'isDisabled'],
  },

  IconButton: {
    semanticType: 'IconButton',
    accessibility: {
      role: 'button',
      focusable: true,
    },
    eventHandlers: [PRESS_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'Button', modifiers: ['.buttonStyle(.borderless)'] },
      android: { composeType: 'IconButton', modifiers: ['onClick'] },
      web: { htmlElement: 'button', ariaRole: 'button' },
    },
    suggestedProps: ['icon', 'ariaLabel', 'isDisabled'],
  },

  TextField: {
    semanticType: 'TextField',
    accessibility: {
      role: 'textbox',
      focusable: true,
    },
    eventHandlers: [CHANGE_HANDLER, FOCUS_HANDLER, BLUR_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'TextField', modifiers: ['.textFieldStyle(.roundedBorder)'] },
      android: { composeType: 'TextField', modifiers: ['onValueChange'] },
      web: { htmlElement: 'input', ariaRole: 'textbox' },
    },
    suggestedProps: ['value', 'placeholder', 'isDisabled', 'isError', 'helperText'],
    commonBindings: ['value', 'isError'],
  },

  TextArea: {
    semanticType: 'TextArea',
    accessibility: {
      role: 'textbox',
      focusable: true,
    },
    eventHandlers: [CHANGE_HANDLER, FOCUS_HANDLER, BLUR_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'TextEditor', modifiers: ['.frame(minHeight: 100)'] },
      android: { composeType: 'TextField', modifiers: ['singleLine = false'] },
      web: { htmlElement: 'textarea', ariaRole: 'textbox' },
    },
    suggestedProps: ['value', 'placeholder', 'rows', 'maxLength'],
  },

  Checkbox: {
    semanticType: 'Checkbox',
    accessibility: {
      role: 'checkbox',
      focusable: true,
    },
    eventHandlers: [CHANGE_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'Toggle', modifiers: ['.toggleStyle(.checkbox)'] },
      android: { composeType: 'Checkbox', modifiers: ['onCheckedChange'] },
      web: { htmlElement: 'input', ariaRole: 'checkbox' },
    },
    suggestedProps: ['isChecked', 'label', 'isDisabled'],
    commonBindings: ['isChecked'],
  },

  Toggle: {
    semanticType: 'Toggle',
    accessibility: {
      role: 'switch',
      focusable: true,
    },
    eventHandlers: [CHANGE_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'Toggle', modifiers: ['.toggleStyle(.switch)'] },
      android: { composeType: 'Switch', modifiers: ['onCheckedChange'] },
      web: { htmlElement: 'input', ariaRole: 'switch' },
    },
    suggestedProps: ['isOn', 'label', 'isDisabled'],
    commonBindings: ['isOn'],
  },

  RadioButton: {
    semanticType: 'RadioButton',
    accessibility: {
      role: 'radio',
      focusable: true,
    },
    eventHandlers: [CHANGE_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'Picker', modifiers: ['.pickerStyle(.inline)'] },
      android: { composeType: 'RadioButton', modifiers: ['onClick'] },
      web: { htmlElement: 'input', ariaRole: 'radio' },
    },
    suggestedProps: ['isSelected', 'value', 'groupValue'],
  },

  Slider: {
    semanticType: 'Slider',
    accessibility: {
      role: 'slider',
      focusable: true,
    },
    eventHandlers: [CHANGE_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'Slider', modifiers: [] },
      android: { composeType: 'Slider', modifiers: ['onValueChange'] },
      web: { htmlElement: 'input', ariaRole: 'slider' },
    },
    suggestedProps: ['value', 'min', 'max', 'step', 'isDisabled'],
    commonBindings: ['value'],
  },

  Picker: {
    semanticType: 'Picker',
    accessibility: {
      role: 'listbox',
      focusable: true,
    },
    eventHandlers: [CHANGE_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'Picker', modifiers: ['.pickerStyle(.menu)'] },
      android: { composeType: 'DropdownMenu', modifiers: ['onDismissRequest'] },
      web: { htmlElement: 'select', ariaRole: 'listbox' },
    },
    suggestedProps: ['selectedValue', 'options', 'placeholder'],
    commonBindings: ['selectedValue'],
  },

  DatePicker: {
    semanticType: 'DatePicker',
    accessibility: {
      role: 'textbox',
      focusable: true,
    },
    eventHandlers: [CHANGE_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'DatePicker', modifiers: ['.datePickerStyle(.compact)'] },
      android: { composeType: 'DatePicker', modifiers: ['onDateChange'] },
      web: { htmlElement: 'input', ariaRole: 'textbox' },
    },
    suggestedProps: ['selectedDate', 'minDate', 'maxDate'],
    commonBindings: ['selectedDate'],
  },

  // ---------------------------------------------------------------------------
  // Typography
  // ---------------------------------------------------------------------------

  Text: {
    semanticType: 'Text',
    accessibility: {
      hidden: false,
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'Text', modifiers: [] },
      android: { composeType: 'Text', modifiers: [] },
      web: { htmlElement: 'span' },
    },
    suggestedProps: ['content', 'style'],
  },

  Label: {
    semanticType: 'Label',
    accessibility: {
      hidden: false,
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'Text', modifiers: [] },
      android: { composeType: 'Text', modifiers: [] },
      web: { htmlElement: 'label' },
    },
    suggestedProps: ['text', 'htmlFor'],
  },

  Heading: {
    semanticType: 'Heading',
    accessibility: {
      role: 'heading',
      headingLevel: 2,
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'Text', modifiers: ['.font(.title)'] },
      android: { composeType: 'Text', modifiers: ['style = MaterialTheme.typography.headlineMedium'] },
      web: { htmlElement: 'h2', ariaRole: 'heading' },
    },
    suggestedProps: ['content', 'level'],
  },

  Link: {
    semanticType: 'Link',
    accessibility: {
      role: 'link',
      focusable: true,
    },
    eventHandlers: [PRESS_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'Link', modifiers: [] },
      android: { composeType: 'ClickableText', modifiers: ['onClick'] },
      web: { htmlElement: 'a', ariaRole: 'link' },
    },
    suggestedProps: ['href', 'text', 'isExternal'],
  },

  // ---------------------------------------------------------------------------
  // Media
  // ---------------------------------------------------------------------------

  Image: {
    semanticType: 'Image',
    accessibility: {
      role: 'img',
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'Image', modifiers: ['.resizable()', '.scaledToFit()'] },
      android: { composeType: 'Image', modifiers: ['contentScale = ContentScale.Fit'] },
      web: { htmlElement: 'img', ariaRole: 'img' },
    },
    suggestedProps: ['src', 'alt', 'width', 'height'],
  },

  Icon: {
    semanticType: 'Icon',
    accessibility: {
      role: 'img',
      hidden: true, // Icons are typically decorative
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'Image', modifiers: ['.font(.system(size: 24))'] },
      android: { composeType: 'Icon', modifiers: [] },
      web: { htmlElement: 'svg', ariaRole: 'img' },
    },
    suggestedProps: ['name', 'size', 'color'],
  },

  Avatar: {
    semanticType: 'Avatar',
    accessibility: {
      role: 'img',
    },
    eventHandlers: [PRESS_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'Image', modifiers: ['.clipShape(Circle())'] },
      android: { composeType: 'Image', modifiers: ['modifier = Modifier.clip(CircleShape)'] },
      web: { htmlElement: 'img', ariaRole: 'img' },
    },
    suggestedProps: ['src', 'alt', 'size', 'fallback'],
  },

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  Card: {
    semanticType: 'Card',
    accessibility: {
      role: 'article',
    },
    eventHandlers: [PRESS_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'VStack', modifiers: ['.background()', '.cornerRadius(12)', '.shadow()'] },
      android: { composeType: 'Card', modifiers: ['elevation = CardDefaults.cardElevation()'] },
      web: { htmlElement: 'article', ariaRole: 'article' },
    },
    suggestedProps: ['padding', 'elevation', 'isClickable'],
  },

  List: {
    semanticType: 'List',
    accessibility: {
      role: 'list',
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'List', modifiers: [] },
      android: { composeType: 'LazyColumn', modifiers: [] },
      web: { htmlElement: 'ul', ariaRole: 'list' },
    },
    suggestedProps: ['items', 'renderItem', 'keyExtractor'],
    commonBindings: ['items'],
  },

  ListItem: {
    semanticType: 'ListItem',
    accessibility: {
      role: 'listitem',
    },
    eventHandlers: [PRESS_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'HStack', modifiers: [] },
      android: { composeType: 'ListItem', modifiers: [] },
      web: { htmlElement: 'li', ariaRole: 'listitem' },
    },
    suggestedProps: ['title', 'subtitle', 'leading', 'trailing'],
  },

  Grid: {
    semanticType: 'Grid',
    accessibility: {
      role: 'grid',
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'LazyVGrid', modifiers: ['columns: [GridItem]'] },
      android: { composeType: 'LazyVerticalGrid', modifiers: ['columns = GridCells.Fixed(2)'] },
      web: { htmlElement: 'div', ariaRole: 'grid' },
    },
    suggestedProps: ['columns', 'gap', 'items'],
  },

  Stack: {
    semanticType: 'Stack',
    accessibility: {},
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'VStack', modifiers: ['spacing'] },
      android: { composeType: 'Column', modifiers: ['verticalArrangement'] },
      web: { htmlElement: 'div' },
    },
    suggestedProps: ['direction', 'spacing', 'align'],
  },

  Container: {
    semanticType: 'Container',
    accessibility: {},
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'ZStack', modifiers: [] },
      android: { composeType: 'Box', modifiers: [] },
      web: { htmlElement: 'div' },
    },
    suggestedProps: ['padding', 'maxWidth', 'center'],
  },

  Divider: {
    semanticType: 'Divider',
    accessibility: {
      role: 'separator',
      hidden: true,
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'Divider', modifiers: [] },
      android: { composeType: 'Divider', modifiers: [] },
      web: { htmlElement: 'hr', ariaRole: 'separator' },
    },
  },

  Spacer: {
    semanticType: 'Spacer',
    accessibility: {
      hidden: true,
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'Spacer', modifiers: [] },
      android: { composeType: 'Spacer', modifiers: [] },
      web: { htmlElement: 'div' },
    },
    suggestedProps: ['size'],
  },

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  NavigationBar: {
    semanticType: 'NavigationBar',
    accessibility: {
      role: 'navigation',
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'NavigationStack', modifiers: ['.navigationTitle()'] },
      android: { composeType: 'TopAppBar', modifiers: [] },
      web: { htmlElement: 'nav', ariaRole: 'navigation' },
    },
    suggestedProps: ['title', 'leading', 'trailing'],
  },

  TabBar: {
    semanticType: 'TabBar',
    accessibility: {
      role: 'tablist',
    },
    eventHandlers: [CHANGE_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'TabView', modifiers: [] },
      android: { composeType: 'TabRow', modifiers: [] },
      web: { htmlElement: 'nav', ariaRole: 'tablist' },
    },
    suggestedProps: ['selectedIndex', 'tabs'],
    commonBindings: ['selectedIndex'],
  },

  TabItem: {
    semanticType: 'TabItem',
    accessibility: {
      role: 'tab',
      focusable: true,
    },
    eventHandlers: [PRESS_HANDLER],
    platformHints: {
      ios: { swiftUIView: 'Tab', modifiers: [] },
      android: { composeType: 'Tab', modifiers: ['onClick'] },
      web: { htmlElement: 'button', ariaRole: 'tab' },
    },
    suggestedProps: ['label', 'icon', 'isSelected'],
  },

  Toolbar: {
    semanticType: 'Toolbar',
    accessibility: {
      role: 'toolbar',
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'ToolbarItemGroup', modifiers: [] },
      android: { composeType: 'TopAppBar', modifiers: [] },
      web: { htmlElement: 'div', ariaRole: 'toolbar' },
    },
    suggestedProps: ['items'],
  },

  // ---------------------------------------------------------------------------
  // Overlays
  // ---------------------------------------------------------------------------

  Modal: {
    semanticType: 'Modal',
    accessibility: {
      role: 'dialog',
      focusable: true,
    },
    eventHandlers: [createEventHandler('onDisappear', 'hideModal')],
    platformHints: {
      ios: { swiftUIView: 'sheet', modifiers: ['.sheet(isPresented:)'] },
      android: { composeType: 'Dialog', modifiers: ['onDismissRequest'] },
      web: { htmlElement: 'dialog', ariaRole: 'dialog' },
    },
    suggestedProps: ['isOpen', 'title', 'onClose'],
    commonBindings: ['isOpen'],
  },

  Sheet: {
    semanticType: 'Sheet',
    accessibility: {
      role: 'dialog',
      focusable: true,
    },
    eventHandlers: [createEventHandler('onDisappear', 'hideModal')],
    platformHints: {
      ios: { swiftUIView: 'sheet', modifiers: ['.sheet(isPresented:)'] },
      android: { composeType: 'BottomSheet', modifiers: ['sheetState'] },
      web: { htmlElement: 'div', ariaRole: 'dialog' },
    },
    suggestedProps: ['isOpen', 'detent'],
    commonBindings: ['isOpen'],
  },

  Alert: {
    semanticType: 'Alert',
    accessibility: {
      role: 'alertdialog',
      liveRegion: 'assertive',
    },
    eventHandlers: [createEventHandler('onDisappear', 'hideModal')],
    platformHints: {
      ios: { swiftUIView: 'alert', modifiers: ['.alert(isPresented:)'] },
      android: { composeType: 'AlertDialog', modifiers: ['onDismissRequest'] },
      web: { htmlElement: 'div', ariaRole: 'alertdialog' },
    },
    suggestedProps: ['isOpen', 'title', 'message', 'actions'],
  },

  Toast: {
    semanticType: 'Toast',
    accessibility: {
      role: 'status',
      liveRegion: 'polite',
    },
    eventHandlers: [createEventHandler('onDisappear', 'custom')],
    platformHints: {
      ios: { swiftUIView: 'overlay', modifiers: [] },
      android: { composeType: 'Snackbar', modifiers: [] },
      web: { htmlElement: 'div', ariaRole: 'status' },
    },
    suggestedProps: ['message', 'type', 'duration'],
  },

  // ---------------------------------------------------------------------------
  // Feedback
  // ---------------------------------------------------------------------------

  Badge: {
    semanticType: 'Badge',
    accessibility: {
      role: 'status',
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'badge', modifiers: ['.badge()'] },
      android: { composeType: 'Badge', modifiers: [] },
      web: { htmlElement: 'span', ariaRole: 'status' },
    },
    suggestedProps: ['count', 'variant'],
  },

  ProgressBar: {
    semanticType: 'ProgressBar',
    accessibility: {
      role: 'progressbar',
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'ProgressView', modifiers: ['.progressViewStyle(.linear)'] },
      android: { composeType: 'LinearProgressIndicator', modifiers: [] },
      web: { htmlElement: 'progress', ariaRole: 'progressbar' },
    },
    suggestedProps: ['value', 'max', 'indeterminate'],
    commonBindings: ['value'],
  },

  Spinner: {
    semanticType: 'Spinner',
    accessibility: {
      role: 'progressbar',
      label: 'Loading',
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'ProgressView', modifiers: ['.progressViewStyle(.circular)'] },
      android: { composeType: 'CircularProgressIndicator', modifiers: [] },
      web: { htmlElement: 'div', ariaRole: 'progressbar' },
    },
    suggestedProps: ['size', 'color'],
  },

  Skeleton: {
    semanticType: 'Skeleton',
    accessibility: {
      hidden: true,
    },
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'Rectangle', modifiers: ['.redacted(reason: .placeholder)'] },
      android: { composeType: 'Box', modifiers: ['placeholder()'] },
      web: { htmlElement: 'div' },
    },
    suggestedProps: ['width', 'height', 'variant'],
  },

  Custom: {
    semanticType: 'Custom',
    accessibility: {},
    eventHandlers: [],
    platformHints: {
      ios: { swiftUIView: 'View', modifiers: [] },
      android: { composeType: 'Box', modifiers: [] },
      web: { htmlElement: 'div' },
    },
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get semantic preset for a semantic type
 */
export function getSemanticPreset(type: SemanticNodeType): SemanticPreset {
  return SEMANTIC_PRESETS[type] ?? SEMANTIC_PRESETS.Custom;
}

/**
 * Create SemanticMetadata from a preset
 */
export function createSemanticMetadataFromPreset(type: SemanticNodeType): SemanticMetadata {
  const preset = getSemanticPreset(type);

  return {
    semanticType: type,
    accessibility: { ...preset.accessibility },
    eventHandlers: preset.eventHandlers.map(h => ({ ...h })),
    schemaVersion: 1,
  };
}

/**
 * Get suggested event handlers for a semantic type
 */
export function getSuggestedEventHandlers(type: SemanticNodeType): SemanticEventHandler[] {
  return getSemanticPreset(type).eventHandlers;
}

/**
 * Get platform-specific code hints
 */
export function getPlatformHints(
  type: SemanticNodeType,
  platform: 'ios' | 'android' | 'web'
): { view: string; modifiers?: string[]; role?: string } | null {
  const preset = getSemanticPreset(type);
  const hints = preset.platformHints[platform];

  if (!hints) return null;

  if (platform === 'ios') {
    const iosHints = hints as { swiftUIView: string; modifiers?: string[] };
    const result: { view: string; modifiers?: string[] } = { view: iosHints.swiftUIView };
    if (iosHints.modifiers) result.modifiers = iosHints.modifiers;
    return result;
  } else if (platform === 'android') {
    const androidHints = hints as { composeType: string; modifiers?: string[] };
    const result: { view: string; modifiers?: string[] } = { view: androidHints.composeType };
    if (androidHints.modifiers) result.modifiers = androidHints.modifiers;
    return result;
  } else {
    const webHints = hints as { htmlElement: string; ariaRole?: string };
    const result: { view: string; role?: string } = { view: webHints.htmlElement };
    if (webHints.ariaRole) result.role = webHints.ariaRole;
    return result;
  }
}

/**
 * Map library component category to suggested semantic type
 */
export function suggestSemanticType(
  category: string,
  componentName: string
): SemanticNodeType {
  const nameLower = componentName.toLowerCase();

  // Direct name mappings
  if (nameLower.includes('button')) return 'Button';
  if (nameLower.includes('input') || nameLower.includes('field') || nameLower.includes('text')) return 'TextField';
  if (nameLower.includes('checkbox')) return 'Checkbox';
  if (nameLower.includes('toggle') || nameLower.includes('switch')) return 'Toggle';
  if (nameLower.includes('radio')) return 'RadioButton';
  if (nameLower.includes('slider')) return 'Slider';
  if (nameLower.includes('picker') || nameLower.includes('select')) return 'Picker';
  if (nameLower.includes('card')) return 'Card';
  if (nameLower.includes('list')) return 'List';
  if (nameLower.includes('image') || nameLower.includes('avatar')) return 'Image';
  if (nameLower.includes('icon')) return 'Icon';
  if (nameLower.includes('modal') || nameLower.includes('dialog')) return 'Modal';
  if (nameLower.includes('alert')) return 'Alert';
  if (nameLower.includes('toast') || nameLower.includes('snackbar')) return 'Toast';
  if (nameLower.includes('tab')) return category === 'navigation' ? 'TabBar' : 'TabItem';
  if (nameLower.includes('nav')) return 'NavigationBar';
  if (nameLower.includes('progress')) return 'ProgressBar';
  if (nameLower.includes('spinner') || nameLower.includes('loading')) return 'Spinner';
  if (nameLower.includes('badge')) return 'Badge';
  if (nameLower.includes('heading') || nameLower.includes('title')) return 'Heading';
  if (nameLower.includes('link')) return 'Link';

  // Category-based fallbacks
  switch (category) {
    case 'buttons': return 'Button';
    case 'forms': return 'TextField';
    case 'typography': return 'Text';
    case 'navigation': return 'NavigationBar';
    case 'data-display': return 'Card';
    case 'feedback': return 'Toast';
    case 'overlays': return 'Modal';
    case 'media': return 'Image';
    case 'icons': return 'Icon';
    case 'layout': return 'Container';
    default: return 'Custom';
  }
}

/**
 * Get all available semantic types
 */
export function getAllSemanticTypes(): SemanticNodeType[] {
  return Object.keys(SEMANTIC_PRESETS) as SemanticNodeType[];
}

/**
 * Group semantic types by category
 */
export function getSemanticTypesByCategory(): Record<string, SemanticNodeType[]> {
  return {
    'Interactive Controls': ['Button', 'IconButton', 'TextField', 'TextArea', 'Checkbox', 'Toggle', 'RadioButton', 'Slider', 'Picker', 'DatePicker'],
    'Typography': ['Text', 'Label', 'Heading', 'Link'],
    'Media': ['Image', 'Icon', 'Avatar'],
    'Layout': ['Card', 'List', 'ListItem', 'Grid', 'Stack', 'Container', 'Divider', 'Spacer'],
    'Navigation': ['NavigationBar', 'TabBar', 'TabItem', 'Toolbar'],
    'Overlays': ['Modal', 'Sheet', 'Alert', 'Toast'],
    'Feedback': ['Badge', 'ProgressBar', 'Spinner', 'Skeleton'],
    'Other': ['Custom'],
  };
}
