/**
 * Advanced JSON Parser Configuration
 *
 * Configuration options and defaults for the production-grade JSON parser.
 */

import type {
  ModelType,
  ModelCapabilities,
  KnownIssue,
  RecoveryStrategy,
  ExtractionMethod,
} from './types';

// =============================================================================
// Parser Configuration
// =============================================================================

/**
 * Main parser configuration
 */
export interface ParserConfig {
  // Parsing behavior
  /** Reject on any validation error (vs. try to proceed) */
  strictMode: boolean;
  /** Accept partial/incomplete tool calls */
  allowPartial: boolean;
  /** Attempt to repair malformed JSON */
  attemptRepairs: boolean;
  /** Use fallback strategies on failure */
  useFallbacks: boolean;
  /** Maximum repair iterations */
  maxRepairAttempts: number;
  /** Parsing timeout in ms */
  timeoutMs: number;

  // Enhanced parsing features
  /** Enable JSON5 parsing (trailing commas, unquoted keys, etc.) */
  enableJson5: boolean;
  /** Enable fuzzy tool name matching */
  fuzzyToolMatching: boolean;
  /** Minimum similarity for fuzzy matching (0-1) */
  fuzzyMatchThreshold: number;
  /** Enable semantic parameter name mapping */
  semanticParamMapping: boolean;
  /** Enable intelligent type coercion */
  typeCoercion: boolean;

  // Extraction preferences
  /** Extraction methods to use, in priority order */
  extractionMethods: ExtractionMethod[];
  /** Minimum confidence to accept an extraction */
  minExtractionConfidence: number;

  // Validation options
  /** Inject default values for missing optional parameters */
  injectDefaults: boolean;
  /** Validate parameter values against schema */
  validateSchema: boolean;
  /** Coerce types to match schema */
  coerceTypes: boolean;

  // Caching
  /** Enable caching of parse results */
  enableCache: boolean;
  /** Maximum cache size */
  maxCacheSize: number;
  /** Cache TTL in ms */
  cacheTtlMs: number;

  // Logging and debugging
  /** Log parsing details */
  verbose: boolean;
  /** Include raw output snippets in results */
  includeRawSnippets: boolean;
  /** Maximum snippet length */
  maxSnippetLength: number;
}

/**
 * Default parser configuration
 */
export const DEFAULT_PARSER_CONFIG: ParserConfig = {
  // Parsing behavior
  strictMode: false,
  allowPartial: true,
  attemptRepairs: true,
  useFallbacks: true,
  maxRepairAttempts: 3,
  timeoutMs: 5000,

  // Enhanced parsing features
  enableJson5: true,
  fuzzyToolMatching: true,
  fuzzyMatchThreshold: 0.7,
  semanticParamMapping: true,
  typeCoercion: true,

  // Extraction preferences
  extractionMethods: [
    'markdown_codeblock',
    'ast_balanced',
    'json5_parse',
    'regex_full_json',
    'inline_json',
    'regex_partial',
  ],
  minExtractionConfidence: 0.5,

  // Validation options
  injectDefaults: true,
  validateSchema: true,
  coerceTypes: true,

  // Caching
  enableCache: true,
  maxCacheSize: 1000,
  cacheTtlMs: 300000, // 5 minutes

  // Logging and debugging
  verbose: false,
  includeRawSnippets: true,
  maxSnippetLength: 200,
};

/**
 * Strict configuration preset - for production with high reliability requirements
 */
export const STRICT_PARSER_CONFIG: Partial<ParserConfig> = {
  strictMode: true,
  allowPartial: false,
  minExtractionConfidence: 0.8,
  fuzzyMatchThreshold: 0.85,
};

/**
 * Lenient configuration preset - for local models with variable output quality
 */
export const LENIENT_PARSER_CONFIG: Partial<ParserConfig> = {
  strictMode: false,
  allowPartial: true,
  attemptRepairs: true,
  useFallbacks: true,
  minExtractionConfidence: 0.4,
  fuzzyMatchThreshold: 0.6,
  maxRepairAttempts: 5,
};

// =============================================================================
// Model Capabilities Database
// =============================================================================

/**
 * Known issues for various models
 */
const QWEN_KNOWN_ISSUES: KnownIssue[] = [
  {
    issue: 'Unquoted object keys',
    pattern: /([{,]\s*)(\w+)(\s*:)/g,
    fix: (text) => text.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'),
    frequency: 0.3,
  },
  {
    issue: 'Trailing commas in objects',
    pattern: /,(\s*[}\]])/g,
    fix: (text) => text.replace(/,(\s*[}\]])/g, '$1'),
    frequency: 0.2,
  },
  {
    issue: 'Single quotes instead of double',
    pattern: /'([^']*)'(\s*:)/g,
    fix: (text) => text.replace(/'([^']*)'(\s*:)/g, '"$1"$2'),
    frequency: 0.15,
  },
];

const LLAMA_KNOWN_ISSUES: KnownIssue[] = [
  {
    issue: 'Python-style booleans',
    pattern: /\b(True|False|None)\b/g,
    fix: (text) => text.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null'),
    frequency: 0.25,
  },
  {
    issue: 'Missing commas between properties',
    pattern: /}(\s*){/g,
    fix: (text) => text.replace(/}(\s*){/g, '}, {'),
    frequency: 0.1,
  },
];

const MISTRAL_KNOWN_ISSUES: KnownIssue[] = [
  {
    issue: 'Incomplete JSON at end',
    pattern: /\{[^}]*$/,
    fix: (text) => {
      // Attempt to close unclosed braces
      const openBraces = (text.match(/{/g) || []).length;
      const closeBraces = (text.match(/}/g) || []).length;
      return text + '}'.repeat(openBraces - closeBraces);
    },
    frequency: 0.15,
  },
];

/**
 * Default model capabilities
 */
export const MODEL_CAPABILITIES: Record<ModelType, ModelCapabilities> = {
  claude: {
    supportsNativeToolCalls: true,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxOutputTokens: 4096,
    knownFormats: ['claude_tool_use', 'anthropic_beta_tools'],
    knownIssues: [],
  },
  openai: {
    supportsNativeToolCalls: true,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxOutputTokens: 4096,
    knownFormats: ['openai_function_call'],
    knownIssues: [],
  },
  anthropic: {
    supportsNativeToolCalls: true,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxOutputTokens: 4096,
    knownFormats: ['claude_tool_use', 'anthropic_beta_tools'],
    knownIssues: [],
  },
  ollama: {
    supportsNativeToolCalls: false,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxOutputTokens: 8192,
    knownFormats: ['ollama_json', 'custom_structured', 'markdown_json'],
    knownIssues: [...QWEN_KNOWN_ISSUES, ...LLAMA_KNOWN_ISSUES],
  },
  llama: {
    supportsNativeToolCalls: false,
    supportsStructuredOutput: true,
    supportsVision: false,
    maxOutputTokens: 8192,
    knownFormats: ['custom_structured', 'markdown_json', 'inline_json'],
    knownIssues: LLAMA_KNOWN_ISSUES,
  },
  qwen: {
    supportsNativeToolCalls: false,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxOutputTokens: 8192,
    knownFormats: ['qwen_structured', 'ollama_json', 'markdown_json'],
    knownIssues: QWEN_KNOWN_ISSUES,
  },
  mistral: {
    supportsNativeToolCalls: false,
    supportsStructuredOutput: true,
    supportsVision: false,
    maxOutputTokens: 8192,
    knownFormats: ['custom_structured', 'markdown_json'],
    knownIssues: MISTRAL_KNOWN_ISSUES,
  },
  gemini: {
    supportsNativeToolCalls: true,
    supportsStructuredOutput: true,
    supportsVision: true,
    maxOutputTokens: 8192,
    knownFormats: ['gemini_function_call'],
    knownIssues: [],
  },
  llamacpp: {
    supportsNativeToolCalls: false,
    supportsStructuredOutput: true,
    supportsVision: false,
    maxOutputTokens: 4096,
    knownFormats: ['custom_structured', 'markdown_json', 'inline_json'],
    knownIssues: LLAMA_KNOWN_ISSUES,
  },
  unknown: {
    supportsNativeToolCalls: false,
    supportsStructuredOutput: false,
    supportsVision: false,
    maxOutputTokens: 4096,
    knownFormats: ['custom_structured', 'markdown_json', 'inline_json', 'unknown'],
    knownIssues: [...QWEN_KNOWN_ISSUES, ...LLAMA_KNOWN_ISSUES],
  },
};

// =============================================================================
// Extraction Method Configuration
// =============================================================================

/**
 * Base confidence scores for each extraction method
 */
export const EXTRACTION_CONFIDENCE: Record<ExtractionMethod, number> = {
  markdown_codeblock: 0.95,
  ast_balanced: 0.85,
  json5_parse: 0.80,
  regex_full_json: 0.75,
  inline_json: 0.70,
  regex_partial: 0.50,
  repaired: 0.60,
};

// =============================================================================
// Fallback Configuration
// =============================================================================

/**
 * Fallback strategy configuration
 */
export interface FallbackConfig {
  /** Strategies to try in order */
  strategies: RecoveryStrategy[];
  /** Maximum fallback attempts per strategy */
  maxAttemptsPerStrategy: number;
  /** Timeout for each fallback attempt */
  timeoutPerAttemptMs: number;
  /** Whether to try LLM-assisted repair */
  enableLLMRepair: boolean;
}

/**
 * Default fallback configuration
 */
export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  strategies: [
    'json5_parse',
    'auto_repair',
    'partial_execution',
    'intent_extraction',
  ],
  maxAttemptsPerStrategy: 2,
  timeoutPerAttemptMs: 1000,
  enableLLMRepair: false, // Disabled by default (requires additional LLM call)
};

// =============================================================================
// Tool Alias Database
// =============================================================================

/**
 * Common tool name aliases for fuzzy matching
 */
export const TOOL_ALIASES: Record<string, string[]> = {
  // Creation tools
  create_rectangle: ['create_rect', 'make_rectangle', 'add_rectangle', 'rectangle', 'rect', 'draw_rectangle', 'new_rectangle'],
  create_ellipse: ['create_circle', 'create_oval', 'make_circle', 'add_circle', 'circle', 'ellipse', 'oval'],
  create_text: ['add_text', 'make_text', 'text', 'create_label', 'add_label'],
  create_frame: ['add_frame', 'make_frame', 'frame', 'create_artboard', 'artboard'],
  create_line: ['add_line', 'make_line', 'line', 'draw_line'],
  create_polygon: ['add_polygon', 'make_polygon', 'polygon'],
  create_star: ['add_star', 'make_star', 'star'],
  create_image: ['add_image', 'insert_image', 'image'],

  // Selection tools
  select_all: ['selectall', 'select_everything', 'select_all_layers'],
  select_by_name: ['find_by_name', 'search_by_name', 'select_named'],
  deselect_all: ['deselect', 'clear_selection', 'unselect_all', 'unselect'],
  get_selection: ['selection', 'get_selected', 'current_selection'],

  // Style tools
  set_fill_color: ['set_fill', 'fill_color', 'set_color', 'fill', 'set_background', 'background_color'],
  set_stroke_color: ['set_stroke', 'stroke_color', 'border_color', 'outline_color', 'stroke'],
  set_stroke_width: ['stroke_width', 'border_width', 'line_width', 'set_border_width'],
  set_opacity: ['opacity', 'set_alpha', 'alpha', 'transparency'],
  set_corner_radius: ['corner_radius', 'border_radius', 'rounded_corners', 'radius', 'set_radius'],

  // Transform tools
  set_position: ['move_to', 'position', 'set_location', 'set_pos', 'move'],
  set_size: ['resize', 'set_dimensions', 'size', 'set_width_height'],
  rotate: ['set_rotation', 'rotation', 'rotate_by'],
  scale: ['set_scale', 'resize_by', 'scale_by'],

  // Layer tools
  group_layers: ['group', 'create_group', 'make_group', 'group_selection'],
  ungroup_layers: ['ungroup', 'ungroup_selection', 'break_group'],
  lock_layer: ['lock', 'lock_selection'],
  unlock_layer: ['unlock', 'unlock_selection'],
  hide_layer: ['hide', 'set_visible_false', 'make_invisible'],
  show_layer: ['show', 'set_visible_true', 'make_visible'],
  delete_layer: ['delete', 'remove', 'remove_layer', 'delete_selection'],
  duplicate_layer: ['duplicate', 'copy_layer', 'clone', 'clone_layer'],

  // Viewport tools
  zoom_to_fit: ['fit_view', 'zoom_fit', 'fit_all', 'view_all'],
  zoom_to_selection: ['zoom_selection', 'focus_selection', 'fit_selection'],
  set_zoom: ['zoom', 'set_zoom_level', 'zoom_level'],

  // Effect tools
  add_drop_shadow: ['drop_shadow', 'shadow', 'add_shadow', 'set_shadow'],
  set_blend_mode: ['blend_mode', 'blending', 'set_blending'],

  // Alignment tools
  align_left: ['left_align', 'align_to_left'],
  align_right: ['right_align', 'align_to_right'],
  align_center: ['center_align', 'align_to_center', 'center_horizontal'],
  align_top: ['top_align', 'align_to_top'],
  align_bottom: ['bottom_align', 'align_to_bottom'],
  align_middle: ['middle_align', 'align_to_middle', 'center_vertical'],
};

// =============================================================================
// Parameter Alias Database
// =============================================================================

/**
 * Common parameter name aliases for semantic mapping
 */
export const PARAMETER_ALIASES: Record<string, string[]> = {
  // Position
  x: ['posX', 'pos_x', 'left', 'xPos', 'xPosition', 'x_position', 'horizontal'],
  y: ['posY', 'pos_y', 'top', 'yPos', 'yPosition', 'y_position', 'vertical'],

  // Size
  width: ['w', 'sizeX', 'size_x', 'xSize', 'x_size', 'horizontal_size'],
  height: ['h', 'sizeY', 'size_y', 'ySize', 'y_size', 'vertical_size'],

  // Style
  fill: ['color', 'backgroundColor', 'background', 'bg', 'fillColor', 'fill_color', 'bgColor'],
  stroke: ['border', 'outline', 'strokeColor', 'stroke_color', 'borderColor', 'border_color'],
  strokeWidth: ['borderWidth', 'border_width', 'lineWidth', 'line_width', 'stroke_width'],
  opacity: ['alpha', 'transparency', 'a'],

  // Corners
  cornerRadius: ['radius', 'borderRadius', 'border_radius', 'rounded', 'corners', 'corner_radius', 'roundedCorners'],

  // Text
  text: ['content', 'value', 'label', 'string', 'textContent', 'text_content'],
  fontSize: ['size', 'font_size', 'textSize', 'text_size'],
  fontFamily: ['font', 'font_family', 'typeface'],
  fontWeight: ['weight', 'font_weight', 'bold'],

  // Shadow
  offsetX: ['shadowX', 'shadow_x', 'xOffset', 'x_offset', 'dx'],
  offsetY: ['shadowY', 'shadow_y', 'yOffset', 'y_offset', 'dy'],
  blur: ['blurRadius', 'blur_radius', 'shadowBlur', 'shadow_blur'],
  spread: ['spreadRadius', 'spread_radius', 'shadowSpread', 'shadow_spread'],

  // Layer
  layerId: ['id', 'nodeId', 'node_id', 'layer', 'elementId', 'element_id', 'target'],
  name: ['layerName', 'layer_name', 'nodeName', 'node_name', 'label'],
};

// =============================================================================
// Color Name Database
// =============================================================================

/**
 * Named colors (CSS color names)
 */
export const NAMED_COLORS: Record<string, { r: number; g: number; b: number }> = {
  // Basic colors
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 128, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  cyan: { r: 0, g: 255, b: 255 },
  magenta: { r: 255, g: 0, b: 255 },

  // Extended colors
  orange: { r: 255, g: 165, b: 0 },
  purple: { r: 128, g: 0, b: 128 },
  pink: { r: 255, g: 192, b: 203 },
  brown: { r: 165, g: 42, b: 42 },
  gray: { r: 128, g: 128, b: 128 },
  grey: { r: 128, g: 128, b: 128 },

  // Light variants
  lightgray: { r: 211, g: 211, b: 211 },
  lightgrey: { r: 211, g: 211, b: 211 },
  lightblue: { r: 173, g: 216, b: 230 },
  lightgreen: { r: 144, g: 238, b: 144 },
  lightyellow: { r: 255, g: 255, b: 224 },
  lightpink: { r: 255, g: 182, b: 193 },

  // Dark variants
  darkgray: { r: 169, g: 169, b: 169 },
  darkgrey: { r: 169, g: 169, b: 169 },
  darkblue: { r: 0, g: 0, b: 139 },
  darkgreen: { r: 0, g: 100, b: 0 },
  darkred: { r: 139, g: 0, b: 0 },

  // Web colors
  navy: { r: 0, g: 0, b: 128 },
  teal: { r: 0, g: 128, b: 128 },
  maroon: { r: 128, g: 0, b: 0 },
  olive: { r: 128, g: 128, b: 0 },
  silver: { r: 192, g: 192, b: 192 },
  aqua: { r: 0, g: 255, b: 255 },
  fuchsia: { r: 255, g: 0, b: 255 },
  lime: { r: 0, g: 255, b: 0 },

  // Modern web colors
  coral: { r: 255, g: 127, b: 80 },
  salmon: { r: 250, g: 128, b: 114 },
  tomato: { r: 255, g: 99, b: 71 },
  gold: { r: 255, g: 215, b: 0 },
  khaki: { r: 240, g: 230, b: 140 },
  violet: { r: 238, g: 130, b: 238 },
  indigo: { r: 75, g: 0, b: 130 },
  turquoise: { r: 64, g: 224, b: 208 },
  skyblue: { r: 135, g: 206, b: 235 },
  steelblue: { r: 70, g: 130, b: 180 },
  slategray: { r: 112, g: 128, b: 144 },
  slategrey: { r: 112, g: 128, b: 144 },

  // Transparent
  transparent: { r: 0, g: 0, b: 0 }, // Alpha handled separately
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a parser config by merging with defaults
 */
export function createParserConfig(overrides: Partial<ParserConfig> = {}): ParserConfig {
  return {
    ...DEFAULT_PARSER_CONFIG,
    ...overrides,
  };
}

/**
 * Get model capabilities, with fallback to unknown
 */
export function getModelCapabilities(modelType: ModelType): ModelCapabilities {
  return MODEL_CAPABILITIES[modelType] || MODEL_CAPABILITIES.unknown;
}

/**
 * Check if a model supports native tool calling
 */
export function supportsNativeToolCalls(modelType: ModelType): boolean {
  return getModelCapabilities(modelType).supportsNativeToolCalls;
}

/**
 * Get known issues for a model type
 */
export function getKnownIssues(modelType: ModelType): KnownIssue[] {
  return getModelCapabilities(modelType).knownIssues;
}

/**
 * Get the canonical tool name from an alias
 */
export function getCanonicalToolName(alias: string): string | null {
  const lowerAlias = alias.toLowerCase();

  for (const [canonical, aliases] of Object.entries(TOOL_ALIASES)) {
    if (canonical === lowerAlias) {
      return canonical;
    }
    if (aliases.map((a) => a.toLowerCase()).includes(lowerAlias)) {
      return canonical;
    }
  }

  return null;
}

/**
 * Get the canonical parameter name from an alias
 */
export function getCanonicalParamName(alias: string): string | null {
  const lowerAlias = alias.toLowerCase();

  for (const [canonical, aliases] of Object.entries(PARAMETER_ALIASES)) {
    if (canonical.toLowerCase() === lowerAlias) {
      return canonical;
    }
    if (aliases.map((a) => a.toLowerCase()).includes(lowerAlias)) {
      return canonical;
    }
  }

  return null;
}
