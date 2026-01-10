/**
 * Semantic Schema Types
 *
 * Defines semantic metadata for design nodes that enables intelligent
 * code generation with platform-specific components, accessibility,
 * state management, and LLM context.
 *
 * Semantic metadata is stored in node.pluginData[SEMANTIC_PLUGIN_KEY]
 */

// Plugin data key for semantic metadata storage
export const SEMANTIC_PLUGIN_KEY = 'designlibre:semantic';

/**
 * Semantic node types for code generation
 * Maps to platform-native UI components
 */
export type SemanticNodeType =
  | 'Button'
  | 'IconButton'
  | 'TextField'
  | 'TextArea'
  | 'Checkbox'
  | 'Toggle'
  | 'RadioButton'
  | 'Slider'
  | 'Picker'
  | 'DatePicker'
  | 'Text'
  | 'Label'
  | 'Heading'
  | 'Link'
  | 'Image'
  | 'Icon'
  | 'Avatar'
  | 'Card'
  | 'List'
  | 'ListItem'
  | 'Grid'
  | 'Stack'
  | 'Container'
  | 'Divider'
  | 'Spacer'
  | 'NavigationBar'
  | 'TabBar'
  | 'TabItem'
  | 'Toolbar'
  | 'Modal'
  | 'Sheet'
  | 'Alert'
  | 'Toast'
  | 'Badge'
  | 'ProgressBar'
  | 'Spinner'
  | 'Skeleton'
  | 'Custom';

/**
 * iOS/SwiftUI-specific semantics
 */
export interface IOSSemantics {
  /** UIKit class name (e.g., 'UIButton', 'UILabel') */
  uiKitClass?: string;
  /** SwiftUI view type (e.g., 'Button', 'Text', 'VStack') */
  swiftUIView?: string;
  /** Accessibility traits for VoiceOver */
  accessibilityTraits?: AccessibilityTrait[];
  /** SF Symbol name for icons */
  sfSymbol?: string;
  /** Haptic feedback type */
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';
}

/**
 * Android/Compose-specific semantics
 */
export interface AndroidSemantics {
  /** View system class (e.g., 'Button', 'TextView') */
  viewClass?: string;
  /** Jetpack Compose composable (e.g., 'Button', 'Text', 'Column') */
  composeType?: string;
  /** Semantics role for TalkBack */
  semanticsRole?: string;
  /** Material icon name */
  materialIcon?: string;
  /** Ripple effect enabled */
  rippleEffect?: boolean;
}

/**
 * Web/React-specific semantics
 */
export interface WebSemantics {
  /** HTML element tag (e.g., 'button', 'input', 'div') */
  htmlElement?: string;
  /** ARIA role attribute */
  ariaRole?: string;
  /** React component name for custom components */
  reactComponent?: string;
  /** CSS class names to apply */
  cssClasses?: string[];
  /** Web component tag name */
  webComponent?: string;
}

/**
 * Platform-specific semantics container
 */
export interface PlatformSemantics {
  ios?: IOSSemantics;
  android?: AndroidSemantics;
  web?: WebSemantics;
}

/**
 * Accessibility traits (iOS-style, mapped to other platforms)
 */
export type AccessibilityTrait =
  | 'button'
  | 'link'
  | 'header'
  | 'searchField'
  | 'image'
  | 'selected'
  | 'playsSound'
  | 'keyboardKey'
  | 'staticText'
  | 'summaryElement'
  | 'notEnabled'
  | 'updatesFrequently'
  | 'startsMediaSession'
  | 'adjustable'
  | 'allowsDirectInteraction'
  | 'causesPageTurn'
  | 'tabBar';

/**
 * Live region announcement behavior
 */
export type LiveRegionMode = 'off' | 'polite' | 'assertive';

/**
 * Accessibility configuration for a node
 */
export interface AccessibilityConfig {
  /** Semantic role for assistive technologies */
  role?: string;
  /** Accessible label (read by screen readers) */
  label?: string;
  /** Extended description for more context */
  description?: string;
  /** Hint about what happens when activated */
  hint?: string;
  /** Whether this is a heading (and what level) */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Whether element can receive focus */
  focusable?: boolean;
  /** Whether element is currently disabled */
  disabled?: boolean;
  /** Live region mode for dynamic content */
  liveRegion?: LiveRegionMode;
  /** Group related elements together */
  accessibilityGroup?: boolean;
  /** Hide from accessibility tree */
  hidden?: boolean;
  /** Custom accessibility actions */
  customActions?: AccessibilityAction[];
}

/**
 * Custom accessibility action
 */
export interface AccessibilityAction {
  name: string;
  label: string;
  handler?: string; // Function name to call
}

/**
 * Supported event types for handlers
 */
export type EventType =
  | 'onPress'
  | 'onLongPress'
  | 'onDoublePress'
  | 'onHoverEnter'
  | 'onHoverExit'
  | 'onFocus'
  | 'onBlur'
  | 'onChange'
  | 'onSubmit'
  | 'onScroll'
  | 'onSwipe'
  | 'onDrag'
  | 'onDrop'
  | 'onAppear'
  | 'onDisappear'
  | 'onRefresh';

/**
 * Action types for event handlers
 */
export type ActionType =
  | 'navigate'
  | 'setVariable'
  | 'toggleVariable'
  | 'incrementVariable'
  | 'apiCall'
  | 'openUrl'
  | 'share'
  | 'copy'
  | 'playSound'
  | 'hapticFeedback'
  | 'showModal'
  | 'hideModal'
  | 'showToast'
  | 'custom';

/**
 * Logical operator for condition groups
 */
export type LogicalOperator = 'and' | 'or';

/**
 * Comparison operator for conditions
 */
export type ComparisonOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEquals'
  | 'lessThanOrEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty';

/**
 * Single condition
 */
export interface Condition {
  variableId: string;
  operator: ComparisonOperator;
  value: unknown;
}

/**
 * Group of conditions with logical operator
 */
export interface ConditionGroup {
  operator: LogicalOperator;
  conditions: (Condition | ConditionGroup)[];
}

/**
 * Semantic event handler definition
 */
export interface SemanticEventHandler {
  /** Event that triggers this handler */
  event: EventType;
  /** Type of action to perform */
  actionType: ActionType;
  /** Configuration for the action */
  actionConfig: Record<string, unknown>;
  /** Optional conditions for when to execute */
  conditions?: ConditionGroup;
  /** Generated function name */
  handlerName?: string;
}

/**
 * Transform type for state bindings
 */
export type BindingTransform =
  | 'direct'       // Use value as-is
  | 'not'          // Boolean negation
  | 'equals'       // Compare to specific value
  | 'notEquals'    // Not equal to specific value
  | 'expression'   // Custom expression
  | 'format'       // String formatting
  | 'map';         // Map to different values

/**
 * State binding - connects a node property to a state variable
 */
export interface StateBinding {
  /** Path to the property on the node (e.g., ['fills', '0', 'color']) */
  propertyPath: string[];
  /** ID of the variable to bind to */
  variableId: string;
  /** How to transform the variable value */
  transform: BindingTransform;
  /** Value to compare against (for equals/notEquals) */
  compareValue?: unknown;
  /** Custom expression (for expression transform) */
  expression?: string;
  /** Value mapping (for map transform) */
  valueMap?: Record<string, unknown>;
  /** Format string (for format transform) */
  formatString?: string;
}

/**
 * Data source types
 */
export type DataSourceType = 'rest' | 'graphql' | 'local' | 'mock' | 'websocket';

/**
 * Data source configuration
 */
export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  endpoint?: string;
  headers?: Record<string, string>;
  /** JSON Schema for the data structure */
  schema?: Record<string, unknown>;
  /** Mock data for preview */
  mockData?: unknown;
  /** Polling interval in ms (for real-time) */
  pollingInterval?: number;
  /** Transform function name */
  transformFunction?: string;
}

/**
 * Data binding - connects a property to a data source path
 */
export interface DataBinding {
  /** ID of the data source */
  dataSourceId: string;
  /** Path within the data (e.g., "users[0].name") */
  dataPath: string;
  /** Path to the property on the node */
  propertyPath: string[];
  /** Fallback value if data is unavailable */
  fallbackValue: unknown;
  /** Transform expression */
  transform?: string;
}

/**
 * LLM context hints for AI-assisted code completion
 */
export interface LLMContextHints {
  /** High-level purpose of this element */
  purpose?: string;
  /** Business logic notes for implementation */
  businessLogicNotes?: string[];
  /** Related API endpoints */
  apiEndpoints?: string[];
  /** Validation rules to implement */
  validationRules?: string[];
  /** Suggested TODO items for developers */
  todoSuggestions?: string[];
  /** Example usage scenarios */
  usageExamples?: string[];
  /** Related components or screens */
  relatedComponents?: string[];
  /** Data dependencies */
  dataDependencies?: string[];
}

/**
 * Complete semantic metadata for a node
 * Stored in pluginData[SEMANTIC_PLUGIN_KEY]
 */
export interface SemanticMetadata {
  /** Primary semantic type */
  semanticType: SemanticNodeType;
  /** Platform-specific overrides */
  platformSemantics?: PlatformSemantics;
  /** Accessibility configuration */
  accessibility: AccessibilityConfig;
  /** State variable bindings */
  stateBindings?: StateBinding[];
  /** Event handlers */
  eventHandlers?: SemanticEventHandler[];
  /** Data bindings */
  dataBindings?: DataBinding[];
  /** LLM context for code generation */
  llmContext?: LLMContextHints;
  /** Whether this node is a component root */
  isComponentRoot?: boolean;
  /** Custom properties exposed for code generation */
  exposedProperties?: string[];
  /** Version for migration support */
  schemaVersion: number;
}

/**
 * Current schema version
 */
export const SEMANTIC_SCHEMA_VERSION = 1;

/**
 * Default accessibility config
 */
export const DEFAULT_ACCESSIBILITY: AccessibilityConfig = {
  focusable: false,
  disabled: false,
  hidden: false,
};

/**
 * Create default semantic metadata for a given type
 */
export function createSemanticMetadata(
  semanticType: SemanticNodeType,
  overrides?: Partial<SemanticMetadata>
): SemanticMetadata {
  return {
    semanticType,
    accessibility: { ...DEFAULT_ACCESSIBILITY },
    schemaVersion: SEMANTIC_SCHEMA_VERSION,
    ...overrides,
  };
}

/**
 * Default semantic mappings for common types
 */
export const SEMANTIC_TYPE_DEFAULTS: Record<SemanticNodeType, Partial<PlatformSemantics>> = {
  Button: {
    ios: { swiftUIView: 'Button', accessibilityTraits: ['button'] },
    android: { composeType: 'Button', rippleEffect: true },
    web: { htmlElement: 'button', ariaRole: 'button' },
  },
  IconButton: {
    ios: { swiftUIView: 'Button', accessibilityTraits: ['button'] },
    android: { composeType: 'IconButton', rippleEffect: true },
    web: { htmlElement: 'button', ariaRole: 'button' },
  },
  TextField: {
    ios: { swiftUIView: 'TextField', accessibilityTraits: ['searchField'] },
    android: { composeType: 'TextField' },
    web: { htmlElement: 'input', ariaRole: 'textbox' },
  },
  TextArea: {
    ios: { swiftUIView: 'TextEditor' },
    android: { composeType: 'TextField' },
    web: { htmlElement: 'textarea', ariaRole: 'textbox' },
  },
  Checkbox: {
    ios: { swiftUIView: 'Toggle' },
    android: { composeType: 'Checkbox' },
    web: { htmlElement: 'input', ariaRole: 'checkbox' },
  },
  Toggle: {
    ios: { swiftUIView: 'Toggle' },
    android: { composeType: 'Switch' },
    web: { htmlElement: 'input', ariaRole: 'switch' },
  },
  RadioButton: {
    ios: { swiftUIView: 'Picker' },
    android: { composeType: 'RadioButton' },
    web: { htmlElement: 'input', ariaRole: 'radio' },
  },
  Slider: {
    ios: { swiftUIView: 'Slider', accessibilityTraits: ['adjustable'] },
    android: { composeType: 'Slider' },
    web: { htmlElement: 'input', ariaRole: 'slider' },
  },
  Picker: {
    ios: { swiftUIView: 'Picker' },
    android: { composeType: 'DropdownMenu' },
    web: { htmlElement: 'select', ariaRole: 'listbox' },
  },
  DatePicker: {
    ios: { swiftUIView: 'DatePicker' },
    android: { composeType: 'DatePicker' },
    web: { htmlElement: 'input', ariaRole: 'textbox' },
  },
  Text: {
    ios: { swiftUIView: 'Text', accessibilityTraits: ['staticText'] },
    android: { composeType: 'Text' },
    web: { htmlElement: 'span' },
  },
  Label: {
    ios: { swiftUIView: 'Text', accessibilityTraits: ['staticText'] },
    android: { composeType: 'Text' },
    web: { htmlElement: 'label' },
  },
  Heading: {
    ios: { swiftUIView: 'Text', accessibilityTraits: ['header'] },
    android: { composeType: 'Text' },
    web: { htmlElement: 'h2', ariaRole: 'heading' },
  },
  Link: {
    ios: { swiftUIView: 'Link', accessibilityTraits: ['link'] },
    android: { composeType: 'ClickableText' },
    web: { htmlElement: 'a', ariaRole: 'link' },
  },
  Image: {
    ios: { swiftUIView: 'Image', accessibilityTraits: ['image'] },
    android: { composeType: 'Image' },
    web: { htmlElement: 'img', ariaRole: 'img' },
  },
  Icon: {
    ios: { swiftUIView: 'Image', accessibilityTraits: ['image'] },
    android: { composeType: 'Icon' },
    web: { htmlElement: 'svg', ariaRole: 'img' },
  },
  Avatar: {
    ios: { swiftUIView: 'Image', accessibilityTraits: ['image'] },
    android: { composeType: 'Image' },
    web: { htmlElement: 'img', ariaRole: 'img' },
  },
  Card: {
    ios: { swiftUIView: 'VStack' },
    android: { composeType: 'Card' },
    web: { htmlElement: 'article', ariaRole: 'article' },
  },
  List: {
    ios: { swiftUIView: 'List' },
    android: { composeType: 'LazyColumn' },
    web: { htmlElement: 'ul', ariaRole: 'list' },
  },
  ListItem: {
    ios: { swiftUIView: 'HStack' },
    android: { composeType: 'ListItem' },
    web: { htmlElement: 'li', ariaRole: 'listitem' },
  },
  Grid: {
    ios: { swiftUIView: 'LazyVGrid' },
    android: { composeType: 'LazyVerticalGrid' },
    web: { htmlElement: 'div', ariaRole: 'grid' },
  },
  Stack: {
    ios: { swiftUIView: 'VStack' },
    android: { composeType: 'Column' },
    web: { htmlElement: 'div' },
  },
  Container: {
    ios: { swiftUIView: 'ZStack' },
    android: { composeType: 'Box' },
    web: { htmlElement: 'div' },
  },
  Divider: {
    ios: { swiftUIView: 'Divider' },
    android: { composeType: 'Divider' },
    web: { htmlElement: 'hr', ariaRole: 'separator' },
  },
  Spacer: {
    ios: { swiftUIView: 'Spacer' },
    android: { composeType: 'Spacer' },
    web: { htmlElement: 'div' },
  },
  NavigationBar: {
    ios: { swiftUIView: 'NavigationStack' },
    android: { composeType: 'TopAppBar' },
    web: { htmlElement: 'nav', ariaRole: 'navigation' },
  },
  TabBar: {
    ios: { swiftUIView: 'TabView', accessibilityTraits: ['tabBar'] },
    android: { composeType: 'TabRow' },
    web: { htmlElement: 'nav', ariaRole: 'tablist' },
  },
  TabItem: {
    ios: { swiftUIView: 'Tab' },
    android: { composeType: 'Tab' },
    web: { htmlElement: 'button', ariaRole: 'tab' },
  },
  Toolbar: {
    ios: { swiftUIView: 'ToolbarItemGroup' },
    android: { composeType: 'TopAppBar' },
    web: { htmlElement: 'div', ariaRole: 'toolbar' },
  },
  Modal: {
    ios: { swiftUIView: 'sheet' },
    android: { composeType: 'Dialog' },
    web: { htmlElement: 'dialog', ariaRole: 'dialog' },
  },
  Sheet: {
    ios: { swiftUIView: 'sheet' },
    android: { composeType: 'BottomSheet' },
    web: { htmlElement: 'div', ariaRole: 'dialog' },
  },
  Alert: {
    ios: { swiftUIView: 'alert' },
    android: { composeType: 'AlertDialog' },
    web: { htmlElement: 'div', ariaRole: 'alertdialog' },
  },
  Toast: {
    ios: { swiftUIView: 'overlay' },
    android: { composeType: 'Snackbar' },
    web: { htmlElement: 'div', ariaRole: 'status' },
  },
  Badge: {
    ios: { swiftUIView: 'badge' },
    android: { composeType: 'Badge' },
    web: { htmlElement: 'span', ariaRole: 'status' },
  },
  ProgressBar: {
    ios: { swiftUIView: 'ProgressView' },
    android: { composeType: 'LinearProgressIndicator' },
    web: { htmlElement: 'progress', ariaRole: 'progressbar' },
  },
  Spinner: {
    ios: { swiftUIView: 'ProgressView' },
    android: { composeType: 'CircularProgressIndicator' },
    web: { htmlElement: 'div', ariaRole: 'progressbar' },
  },
  Skeleton: {
    ios: { swiftUIView: 'Rectangle' },
    android: { composeType: 'Box' },
    web: { htmlElement: 'div' },
  },
  Custom: {
    ios: { swiftUIView: 'View' },
    android: { composeType: 'Box' },
    web: { htmlElement: 'div' },
  },
};

/**
 * Get semantic metadata from a node's pluginData
 */
export function getSemanticMetadata(
  pluginData: Record<string, unknown> | undefined
): SemanticMetadata | null {
  if (!pluginData) return null;
  const data = pluginData[SEMANTIC_PLUGIN_KEY];
  if (!data || typeof data !== 'object') return null;
  return data as SemanticMetadata;
}

/**
 * Set semantic metadata in pluginData
 */
export function setSemanticMetadata(
  pluginData: Record<string, unknown>,
  metadata: SemanticMetadata
): Record<string, unknown> {
  return {
    ...pluginData,
    [SEMANTIC_PLUGIN_KEY]: metadata,
  };
}

/**
 * Remove semantic metadata from pluginData
 */
export function removeSemanticMetadata(
  pluginData: Record<string, unknown>
): Record<string, unknown> {
  const { [SEMANTIC_PLUGIN_KEY]: _, ...rest } = pluginData;
  return rest;
}

/**
 * Check if a node has semantic metadata
 */
export function hasSemanticMetadata(
  pluginData: Record<string, unknown> | undefined
): boolean {
  return pluginData !== undefined && SEMANTIC_PLUGIN_KEY in pluginData;
}
