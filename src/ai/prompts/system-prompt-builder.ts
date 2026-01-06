/**
 * System Prompt Builder
 *
 * Generates comprehensive system prompts for AI models.
 * Model-agnostic design that works with any provider (Claude, OpenAI, Ollama, LlamaCPP).
 *
 * This module is designed for extensibility to support:
 * - DesignLibre (vector design) - current
 * - CADLibre (2D/3D CAD) - future
 * - CAMLibre (additive/subtractive CAM) - future
 */

import { generateTypeSchemaPrompt } from '../schemas/type-schemas';
import { generateToolPrompt, generateToolQuickReference, PRIORITY_1_TOOLS } from '../schemas/tool-documentation';

// =============================================================================
// Types
// =============================================================================

/**
 * Application type for domain-specific prompts
 */
export type ApplicationType = 'designlibre' | 'cadlibre' | 'camlibre';

/**
 * Verbosity level for prompts
 */
export type PromptVerbosity = 'minimal' | 'standard' | 'detailed';

/**
 * Options for building system prompts
 */
export interface SystemPromptOptions {
  /** Application type for domain-specific content */
  application?: ApplicationType;
  /** Include type schemas in prompt */
  includeTypeSchemas?: boolean;
  /** Include tool summaries */
  includeToolSummary?: boolean;
  /** Include coordinate system explanation */
  includeCoordinateSystem?: boolean;
  /** Include best practices */
  includeBestPractices?: boolean;
  /** Include quick reference card */
  includeQuickReference?: boolean;
  /** Custom instructions to append */
  customInstructions?: string;
  /** Verbosity level */
  verbosity?: PromptVerbosity;
  /** Tool list to document (defaults to PRIORITY_1_TOOLS) */
  tools?: string[];
  /** Project name for context */
  projectName?: string;
}

/**
 * Current design context for context-aware prompts
 */
export interface DesignContext {
  /** Current selection state */
  selection: {
    ids: string[];
    objects: Array<{
      id: string;
      type: string;
      name: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
    }>;
  };
  /** Current viewport */
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;
  };
  /** Layer information */
  layers: Array<{
    id: string;
    name: string;
    objectCount: number;
  }>;
  /** Active layer ID */
  activeLayerId?: string;
  /** Recently created object IDs */
  recentlyCreated?: string[];
  /** Active tool name */
  activeTool?: string;
  /** Undo stack depth */
  undoDepth?: number;
  /** Redo stack depth */
  redoDepth?: number;
}

/**
 * Built system prompt result
 */
export interface SystemPromptResult {
  /** The complete system prompt */
  prompt: string;
  /** Estimated token count */
  estimatedTokens: number;
  /** Sections included */
  sections: string[];
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OPTIONS: Required<Omit<SystemPromptOptions, 'customInstructions' | 'tools' | 'projectName'>> = {
  application: 'designlibre',
  includeTypeSchemas: true,
  includeToolSummary: true,
  includeCoordinateSystem: true,
  includeBestPractices: true,
  includeQuickReference: false,
  verbosity: 'standard',
};

// =============================================================================
// Application Domains
// =============================================================================

/**
 * Application-specific domain introductions
 */
const APPLICATION_DOMAINS: Record<ApplicationType, string> = {
  designlibre: `You are an AI design assistant for DesignLibre, a professional 2D vector graphics editor.
You help users create, modify, and organize designs through natural language commands.
You can create shapes, apply styles, manage layers, and control the viewport.

Your role is to:
- Understand design intent from natural language
- Execute precise design operations using tools
- Provide helpful feedback about what you've done
- Suggest improvements when appropriate

CRITICAL: When creating designs, you MUST output ALL tool calls in a single response. Do not wait for intermediate results.
For example, to create a login screen, you should output ALL tool calls at once:
1. create_frame for the screen container
2. create_rectangle for input field backgrounds
3. create_text for labels, placeholders, and button text
4. Additional shapes and elements as needed

Output all necessary tool calls in ONE response - do not stop after creating just the frame.`,

  cadlibre: `You are an AI CAD assistant for CADLibre, a professional 2D and 3D CAD application.
You help users create technical drawings, 3D models, and engineering designs.
You can create geometry, apply constraints, manage layers, and control views.

Your role is to:
- Understand engineering and design requirements
- Create precise geometric constructions
- Apply and manage constraints
- Assist with dimensioning and annotations`,

  camlibre: `You are an AI CAM assistant for CAMLibre, an additive and subtractive manufacturing application.
You help users create toolpaths, set up operations, and optimize manufacturing processes.
You can define operations, select tools, configure parameters, and simulate processes.

Your role is to:
- Understand manufacturing requirements
- Generate efficient toolpaths
- Optimize cutting parameters
- Ensure safe and effective operations`,
};

/**
 * Minimal domain descriptions for token-constrained contexts
 */
const APPLICATION_DOMAINS_MINIMAL: Record<ApplicationType, string> = {
  designlibre: 'AI design assistant for DesignLibre vector graphics editor. Create shapes, apply styles, manage layers.',
  cadlibre: 'AI CAD assistant for CADLibre. Create geometry, apply constraints, manage drawings.',
  camlibre: 'AI CAM assistant for CAMLibre. Create toolpaths, configure operations, optimize manufacturing.',
};

// =============================================================================
// Coordinate System Documentation
// =============================================================================

const COORDINATE_SYSTEM_STANDARD = `## Coordinate System

- **Origin**: Top-left corner of the canvas at (0, 0)
- **X-axis**: Positive direction is RIGHT
- **Y-axis**: Positive direction is DOWN
- **Units**: Pixels (px) by default
- **Rotation**: Clockwise in degrees, pivot at object center

Example positions:
- (0, 0) = top-left corner
- (100, 0) = 100px to the right of origin
- (0, 100) = 100px below origin
- (100, 100) = diagonal from origin

Typical canvas areas:
- Small icons: 24×24 to 64×64
- UI components: 100×40 to 400×300
- Mobile screens: 375×812 (iPhone), 360×800 (Android)
- Desktop: 1440×900, 1920×1080
`;

const COORDINATE_SYSTEM_MINIMAL = `**Coordinates**: Origin (0,0) at top-left. X+ right, Y+ down. Units: pixels. Rotation: clockwise degrees.`;

// =============================================================================
// Best Practices
// =============================================================================

const BEST_PRACTICES_STANDARD = `## Best Practices

### Positioning
1. **Be precise with coordinates** - Place objects at exact pixel values
2. **Use reasonable sizes** - Typical objects are 50-500px, not 1px or 10000px
3. **Consider the viewport** - Place objects where they'll be visible

### Naming
4. **Name objects descriptively** - "Header Background" not "Rectangle 1"
5. **Use consistent naming** - Follow patterns like "Button/Primary", "Icon/Search"

### Workflow
6. **Work incrementally** - Create → Position → Style → Refine
7. **Group related objects** - Keep logical elements together
8. **Confirm actions** - Describe what you did after each operation

### Error Handling
9. **Handle errors gracefully** - If a tool fails, explain why and suggest alternatives
10. **Validate inputs** - Check that selections exist before modifying

### Design Quality
11. **Maintain alignment** - Use align tools to keep elements tidy
12. **Use consistent spacing** - Apply uniform gaps between related elements
13. **Consider hierarchy** - Make important elements larger or more prominent
`;

const BEST_PRACTICES_MINIMAL = `**Best Practices**: Be precise with coordinates. Use descriptive names. Work incrementally (create→position→style). Confirm actions. Handle errors gracefully.`;

const BEST_PRACTICES_DETAILED = BEST_PRACTICES_STANDARD + `
### Advanced Techniques
14. **Create reusable components** - Extract repeated patterns into components
15. **Use auto-layout** - Enable auto-layout for responsive containers
16. **Apply styles consistently** - Use color and text styles for uniformity
17. **Organize layers** - Use frames and groups to maintain hierarchy
18. **Export considerations** - Name layers for clean export output

### Common Patterns
- **Button**: Frame with auto-layout, text child, padding, corner radius
- **Card**: Frame with vertical auto-layout, image, text, gap
- **List**: Frame with vertical auto-layout, repeated items
- **Navigation**: Frame with horizontal auto-layout, icon+text items
`;

// =============================================================================
// Response Guidelines
// =============================================================================

const RESPONSE_GUIDELINES = `## Response Guidelines

**CRITICAL: You MUST use the tool/function calling mechanism to execute design operations.**
Do NOT describe tool calls in JSON format in your text response. Actually invoke the tools.

When executing design tasks:

1. **Acknowledge the request** - Briefly confirm what you'll do
2. **Execute tools immediately** - Use the tool_use mechanism to call tools with correct parameters
3. **Report results** - After tools execute, describe what was created or modified
4. **Offer next steps** - Suggest related actions if helpful

Example workflow:
User: "Create a blue rectangle"
Assistant:
1. CALL create_rectangle tool with {x: 100, y: 100, width: 200, height: 100, fill: {r: 0, g: 0, b: 1, a: 1}}
2. After tool executes, respond: "I've created a 200×100px blue rectangle at position (100, 100)."

DO NOT write JSON like {"tool": "create_rectangle", ...} in your text response.
Instead, USE the function calling feature to actually execute the tool.
`;

// =============================================================================
// Main Builder Functions
// =============================================================================

/**
 * Build a complete system prompt
 */
export function buildSystemPrompt(options: SystemPromptOptions = {}): SystemPromptResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sections: string[] = [];
  const parts: string[] = [];

  // 1. Application domain introduction
  const domainText = opts.verbosity === 'minimal'
    ? APPLICATION_DOMAINS_MINIMAL[opts.application]
    : APPLICATION_DOMAINS[opts.application];
  parts.push(domainText);
  sections.push('domain');

  // 2. Project context
  if (opts.projectName) {
    parts.push(`\n**Project**: ${opts.projectName}`);
    sections.push('project');
  }

  // 3. Coordinate system
  if (opts.includeCoordinateSystem) {
    parts.push('');
    parts.push(opts.verbosity === 'minimal' ? COORDINATE_SYSTEM_MINIMAL : COORDINATE_SYSTEM_STANDARD);
    sections.push('coordinates');
  }

  // 4. Type schemas
  if (opts.includeTypeSchemas) {
    parts.push('');
    parts.push(generateTypeSchemaPrompt());
    sections.push('types');
  }

  // 5. Tool summary
  if (opts.includeToolSummary) {
    parts.push('');
    const tools = opts.tools ?? PRIORITY_1_TOOLS;
    parts.push(generateToolPrompt(tools));
    sections.push('tools');
  }

  // 6. Quick reference (optional, for detailed mode)
  if (opts.includeQuickReference || opts.verbosity === 'detailed') {
    parts.push('');
    parts.push(generateToolQuickReference());
    sections.push('quickref');
  }

  // 7. Best practices
  if (opts.includeBestPractices) {
    parts.push('');
    let practices: string;
    switch (opts.verbosity) {
      case 'minimal':
        practices = BEST_PRACTICES_MINIMAL;
        break;
      case 'detailed':
        practices = BEST_PRACTICES_DETAILED;
        break;
      default:
        practices = BEST_PRACTICES_STANDARD;
    }
    parts.push(practices);
    sections.push('practices');
  }

  // 8. Response guidelines (standard and detailed only)
  if (opts.verbosity !== 'minimal') {
    parts.push('');
    parts.push(RESPONSE_GUIDELINES);
    sections.push('guidelines');
  }

  // 9. Custom instructions
  if (opts.customInstructions) {
    parts.push('');
    parts.push(`## Custom Instructions\n\n${opts.customInstructions}`);
    sections.push('custom');
  }

  const prompt = parts.join('\n');

  return {
    prompt,
    estimatedTokens: estimateTokenCount(prompt),
    sections,
  };
}

/**
 * Build context prompt from current design state
 */
export function buildContextPrompt(context: DesignContext): string {
  const parts: string[] = ['## Current State'];

  // Selection
  if (context.selection.ids.length === 0) {
    parts.push('\n**Selection**: Nothing selected');
  } else {
    parts.push(`\n**Selection**: ${context.selection.ids.length} object(s)`);

    // Show up to 5 selected objects
    const maxToShow = 5;
    for (const obj of context.selection.objects.slice(0, maxToShow)) {
      const size = obj.width && obj.height ? ` (${obj.width}×${obj.height})` : '';
      parts.push(`  - "${obj.name}" (${obj.type}) at (${obj.x}, ${obj.y})${size}`);
    }

    if (context.selection.objects.length > maxToShow) {
      parts.push(`  - ... and ${context.selection.objects.length - maxToShow} more`);
    }
  }

  // Viewport
  const zoom = Math.round(context.viewport.zoom * 100);
  parts.push(`\n**Viewport**: (${Math.round(context.viewport.x)}, ${Math.round(context.viewport.y)}) at ${zoom}% zoom`);
  parts.push(`**Visible area**: ${Math.round(context.viewport.width)}×${Math.round(context.viewport.height)} px`);

  // Active tool
  if (context.activeTool) {
    parts.push(`**Active tool**: ${context.activeTool}`);
  }

  // Layers
  if (context.layers.length > 0) {
    parts.push(`\n**Layers**: ${context.layers.length}`);
    for (const layer of context.layers.slice(0, 5)) {
      const active = layer.id === context.activeLayerId ? ' [ACTIVE]' : '';
      parts.push(`  - "${layer.name}" (${layer.objectCount} objects)${active}`);
    }
    if (context.layers.length > 5) {
      parts.push(`  - ... and ${context.layers.length - 5} more`);
    }
  }

  // Recently created
  if (context.recentlyCreated && context.recentlyCreated.length > 0) {
    parts.push(`\n**Recently created**: ${context.recentlyCreated.slice(0, 5).join(', ')}`);
  }

  // Undo/Redo availability
  if (context.undoDepth !== undefined || context.redoDepth !== undefined) {
    const undo = context.undoDepth ?? 0;
    const redo = context.redoDepth ?? 0;
    parts.push(`**History**: ${undo} undo${undo !== 1 ? 's' : ''}, ${redo} redo${redo !== 1 ? 's' : ''} available`);
  }

  return parts.join('\n');
}

/**
 * Build a combined prompt with system and context
 */
export function buildCombinedPrompt(
  systemOptions: SystemPromptOptions = {},
  context?: DesignContext
): string {
  const system = buildSystemPrompt(systemOptions);

  if (context) {
    return system.prompt + '\n\n---\n\n' + buildContextPrompt(context);
  }

  return system.prompt;
}

// =============================================================================
// Preset Configurations
// =============================================================================

/**
 * Minimal prompt for token-constrained contexts
 * Approximately 500-800 tokens
 */
export function buildMinimalPrompt(application: ApplicationType = 'designlibre'): SystemPromptResult {
  return buildSystemPrompt({
    application,
    verbosity: 'minimal',
    includeQuickReference: false,
  });
}

/**
 * Standard prompt for most use cases
 * Approximately 1500-2000 tokens
 */
export function buildStandardPrompt(application: ApplicationType = 'designlibre'): SystemPromptResult {
  return buildSystemPrompt({
    application,
    verbosity: 'standard',
  });
}

/**
 * Detailed prompt for comprehensive AI assistance
 * Approximately 2500-3500 tokens
 */
export function buildDetailedPrompt(application: ApplicationType = 'designlibre'): SystemPromptResult {
  return buildSystemPrompt({
    application,
    verbosity: 'detailed',
    includeQuickReference: true,
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Estimate token count from text
 * Uses heuristic: ~4 characters per token for English text
 */
function estimateTokenCount(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const charCount = text.length;

  // Blend of character and word-based estimation
  const charBasedEstimate = charCount / 4;
  const wordBasedEstimate = wordCount * 1.3;

  return Math.ceil((charBasedEstimate + wordBasedEstimate) / 2);
}

/**
 * Get all available application types
 */
export function getApplicationTypes(): ApplicationType[] {
  return ['designlibre', 'cadlibre', 'camlibre'];
}

/**
 * Get the domain description for an application
 */
export function getApplicationDomain(
  application: ApplicationType,
  minimal = false
): string {
  return minimal
    ? APPLICATION_DOMAINS_MINIMAL[application]
    : APPLICATION_DOMAINS[application];
}

/**
 * Validate system prompt options
 */
export function validatePromptOptions(options: SystemPromptOptions): string[] {
  const errors: string[] = [];

  if (options.application && !getApplicationTypes().includes(options.application)) {
    errors.push(`Invalid application type: ${options.application}`);
  }

  if (options.verbosity && !['minimal', 'standard', 'detailed'].includes(options.verbosity)) {
    errors.push(`Invalid verbosity level: ${options.verbosity}`);
  }

  return errors;
}

/**
 * Get prompt size category
 */
export function getPromptSizeCategory(tokens: number): 'small' | 'medium' | 'large' | 'xlarge' {
  if (tokens < 1000) return 'small';
  if (tokens < 2000) return 'medium';
  if (tokens < 3500) return 'large';
  return 'xlarge';
}
