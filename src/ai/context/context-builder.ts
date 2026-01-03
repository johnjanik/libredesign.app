/**
 * Context Builder
 *
 * Builds context information for AI prompts from the current design state.
 * Includes token counting, smart truncation, and custom instructions.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import type { CoordinateCalibrator } from '../calibration/coordinate-calibrator';
import type { AITool, AIToolParameter } from '../providers/ai-provider';
import type { ToolTierConfig } from '../config/provider-config';
import { getAllToolDefinitions, getToolDefinitions } from '../tools/tool-registry';
import type { ToolDefinition, JSONSchema } from '../tools/tool-registry';
import { getToolsForTier } from '../tools/tool-categories';

/**
 * Built context for AI
 */
export interface AIContext {
  /** System prompt */
  systemPrompt: string;
  /** Available tools */
  tools: AITool[];
  /** Current state description */
  stateDescription: string;
  /** Estimated token count */
  estimatedTokens: number;
}

/**
 * Token budget configuration
 */
export interface TokenBudget {
  /** Maximum total tokens for context */
  maxTokens: number;
  /** Reserve tokens for response */
  reserveForResponse: number;
  /** Priority order for truncation */
  truncationPriority: ('sceneGraph' | 'stateDescription' | 'customInstructions')[];
}

/**
 * Context builder options
 */
export interface ContextBuilderOptions {
  /** Include full scene graph in context */
  includeSceneGraph?: boolean | undefined;
  /** Maximum nodes to include in scene description */
  maxNodes?: number | undefined;
  /** Custom instructions to include in system prompt */
  customInstructions?: string | undefined;
  /** Token budget for context management */
  tokenBudget?: TokenBudget | undefined;
  /** Include detailed selection info */
  detailedSelection?: boolean | undefined;
  /** Project name for context */
  projectName?: string | undefined;
  /** Tool tier to filter available tools */
  toolTier?: ToolTierConfig | undefined;
}

/**
 * Default token budget
 */
export const DEFAULT_TOKEN_BUDGET: TokenBudget = {
  maxTokens: 100000,
  reserveForResponse: 4096,
  truncationPriority: ['sceneGraph', 'stateDescription', 'customInstructions'],
};

/**
 * Approximate token count from text
 * Uses a simple heuristic: ~4 characters per token for English text
 */
function estimateTokenCount(text: string): number {
  // More accurate estimation for code and mixed content
  // Average 4 chars per token for English, but code has more tokens per char
  const wordCount = text.split(/\s+/).length;
  const charCount = text.length;

  // Blend of character and word-based estimation
  const charBasedEstimate = charCount / 4;
  const wordBasedEstimate = wordCount * 1.3;

  return Math.ceil((charBasedEstimate + wordBasedEstimate) / 2);
}

/**
 * Context Builder
 */
export class ContextBuilder {
  private runtime: DesignLibreRuntime;
  private calibrator: CoordinateCalibrator;
  private customInstructions: string | undefined;

  constructor(runtime: DesignLibreRuntime, calibrator: CoordinateCalibrator) {
    this.runtime = runtime;
    this.calibrator = calibrator;
  }

  /**
   * Set custom instructions to include in the context.
   */
  setCustomInstructions(instructions: string | undefined): void {
    this.customInstructions = instructions;
  }

  /**
   * Get current custom instructions.
   */
  getCustomInstructions(): string | undefined {
    return this.customInstructions;
  }

  /**
   * Build the full AI context with token management.
   */
  build(options: ContextBuilderOptions = {}): AIContext {
    const budget = options.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
    const maxAvailable = budget.maxTokens - budget.reserveForResponse;

    // Build components
    let systemPrompt = this.buildSystemPrompt(options);
    let stateDescription = this.buildStateDescription(options);
    const tools = this.getTools(options.toolTier);

    // Estimate tokens for tools (they're always included)
    const toolsJson = JSON.stringify(tools);
    const toolsTokens = estimateTokenCount(toolsJson);

    // Calculate remaining budget
    let remaining = maxAvailable - toolsTokens;

    // Estimate tokens for each component
    let systemTokens = estimateTokenCount(systemPrompt);
    let stateTokens = estimateTokenCount(stateDescription);

    // Smart truncation if needed
    if (systemTokens + stateTokens > remaining) {
      const result = this.smartTruncate(
        systemPrompt,
        stateDescription,
        remaining,
        budget.truncationPriority,
        options
      );
      systemPrompt = result.systemPrompt;
      stateDescription = result.stateDescription;
      systemTokens = estimateTokenCount(systemPrompt);
      stateTokens = estimateTokenCount(stateDescription);
    }

    const totalTokens = toolsTokens + systemTokens + stateTokens;

    return {
      systemPrompt,
      tools,
      stateDescription,
      estimatedTokens: totalTokens,
    };
  }

  /**
   * Smart truncation to fit within token budget.
   */
  private smartTruncate(
    systemPrompt: string,
    stateDescription: string,
    maxTokens: number,
    priority: ('sceneGraph' | 'stateDescription' | 'customInstructions')[],
    options: ContextBuilderOptions
  ): { systemPrompt: string; stateDescription: string } {
    let currentSystem = systemPrompt;
    let currentState = stateDescription;

    for (const item of priority) {
      const currentTokens = estimateTokenCount(currentSystem) + estimateTokenCount(currentState);
      if (currentTokens <= maxTokens) break;

      if (item === 'sceneGraph') {
        // Remove or reduce scene graph from state description
        const sceneMarker = 'SCENE CONTENTS:';
        const sceneIndex = currentState.indexOf(sceneMarker);
        if (sceneIndex !== -1) {
          // Truncate scene graph section
          const beforeScene = currentState.substring(0, sceneIndex);
          currentState = beforeScene + '[Scene graph truncated due to context limits]';
        }
      } else if (item === 'stateDescription') {
        // Reduce state description to essentials
        const lines = currentState.split('\n');
        // Keep first 10 lines (viewport, selection, tool info)
        currentState = lines.slice(0, 10).join('\n');
        if (lines.length > 10) {
          currentState += '\n[Additional state information truncated]';
        }
      } else if (item === 'customInstructions') {
        // Remove custom instructions from system prompt
        if (options.customInstructions || this.customInstructions) {
          const customSection = '\n\nCUSTOM INSTRUCTIONS:';
          const customIndex = currentSystem.indexOf(customSection);
          if (customIndex !== -1) {
            currentSystem = currentSystem.substring(0, customIndex);
          }
        }
      }
    }

    return { systemPrompt: currentSystem, stateDescription: currentState };
  }

  /**
   * Estimate tokens for a potential message.
   */
  estimateTokens(text: string): number {
    return estimateTokenCount(text);
  }

  /**
   * Get a preview of the context (useful for UI display).
   */
  getContextPreview(options: ContextBuilderOptions = {}): {
    systemPromptPreview: string;
    statePreview: string;
    toolCount: number;
    estimatedTokens: number;
  } {
    const context = this.build(options);
    return {
      systemPromptPreview: context.systemPrompt.substring(0, 500) + '...',
      statePreview: context.stateDescription.substring(0, 300) + '...',
      toolCount: context.tools.length,
      estimatedTokens: context.estimatedTokens,
    };
  }

  /**
   * Build the system prompt.
   */
  buildSystemPrompt(options: ContextBuilderOptions = {}): string {
    const calibration = this.calibrator.getCalibrationPrompt();
    const tools = this.getToolDescriptions();
    const projectInfo = options.projectName ? `\nPROJECT: ${options.projectName}\n` : '';
    const customInstructions = options.customInstructions || this.customInstructions;

    let prompt = `You are an AI design assistant for DesignLibre, a professional vector graphics editor.
${projectInfo}
${calibration}

CAPABILITIES:
- You can CREATE shapes (rectangles, ellipses, lines, text, frames)
- You can SELECT, MOVE, RESIZE, ROTATE, and DELETE elements
- You can change COLORS, OPACITY, and other style properties
- You can GROUP and UNGROUP elements
- You can control the VIEWPORT (pan, zoom)
- You can UNDO and REDO changes

AVAILABLE TOOLS:
${tools}

GUIDELINES:
1. Be precise with coordinates - the red crosshair marks (0,0)
2. When creating elements, place them in visible areas
3. Use descriptive names for created elements
4. Confirm your actions by describing what you did
5. If asked to modify something, first identify it by name or position
6. For colors, use hex codes (#ff0000) or color names (red, blue, etc.)

When you receive a screenshot, analyze it to understand:
- What elements exist and where they are positioned
- The current selection state
- The overall layout and composition

Respond naturally and execute design requests using the provided tools.`;

    // Add custom instructions if provided
    if (customInstructions) {
      prompt += `\n\nCUSTOM INSTRUCTIONS:\n${customInstructions}`;
    }

    return prompt;
  }

  /**
   * Build a description of the current state.
   */
  buildStateDescription(options: ContextBuilderOptions = {}): string {
    const parts: string[] = [];

    // Viewport state
    const viewport = this.runtime.getViewport();
    if (viewport) {
      const zoom = viewport.getZoom();
      const bounds = viewport.getVisibleBounds();
      parts.push(`Viewport: ${Math.round(zoom * 100)}% zoom`);
      parts.push(`Visible area: (${Math.round(bounds.minX)}, ${Math.round(bounds.minY)}) to (${Math.round(bounds.maxX)}, ${Math.round(bounds.maxY)})`);
    }

    // Selection state
    const selection = this.runtime.getSelectionManager();
    if (selection) {
      const selectedIds = selection.getSelectedNodeIds();
      if (selectedIds.length === 0) {
        parts.push('Selection: none');
      } else {
        parts.push(`Selection: ${selectedIds.length} element(s)`);

        // Describe selected elements
        const sceneGraph = this.runtime.getSceneGraph();
        const maxToShow = options.detailedSelection ? 10 : 5;

        if (sceneGraph && selectedIds.length <= maxToShow) {
          for (const id of selectedIds) {
            const node = sceneGraph.getNode(id);
            if (node) {
              const x = 'x' in node ? Math.round(node.x as number) : 0;
              const y = 'y' in node ? Math.round(node.y as number) : 0;
              const w = 'width' in node ? Math.round(node.width as number) : 0;
              const h = 'height' in node ? Math.round(node.height as number) : 0;

              // Basic info
              let desc = `  - "${node.name}" (${node.type}) at (${x}, ${y})`;

              // Add dimensions for detailed selection
              if (options.detailedSelection && w > 0 && h > 0) {
                desc += ` size ${w}x${h}`;
              }

              // Add style info for detailed selection
              if (options.detailedSelection) {
                const fill = 'fills' in node && Array.isArray(node.fills) && node.fills.length > 0
                  ? (node.fills[0] as { color?: { hex?: string } })?.color?.hex
                  : undefined;
                if (fill) {
                  desc += ` fill:${fill}`;
                }
              }

              parts.push(desc);
            }
          }
        } else if (selectedIds.length > maxToShow) {
          parts.push(`  (${selectedIds.length} elements selected - showing first ${maxToShow})`);
          // Show first few
          const sceneGraphInstance = this.runtime.getSceneGraph();
          if (sceneGraphInstance) {
            for (let i = 0; i < maxToShow && i < selectedIds.length; i++) {
              const id = selectedIds[i];
              if (id) {
                const node = sceneGraphInstance.getNode(id);
                if (node) {
                  const x = 'x' in node ? Math.round(node.x as number) : 0;
                  const y = 'y' in node ? Math.round(node.y as number) : 0;
                  parts.push(`  - "${node.name}" (${node.type}) at (${x}, ${y})`);
                }
              }
            }
          }
        }
      }
    }

    // Active tool
    const toolManager = this.runtime.getToolManager();
    if (toolManager) {
      const activeTool = toolManager.getActiveTool();
      parts.push(`Active tool: ${activeTool?.name ?? 'none'}`);
    }

    // Scene overview (if requested)
    if (options.includeSceneGraph) {
      const sceneDescription = this.buildSceneDescription(options.maxNodes ?? 20);
      if (sceneDescription) {
        parts.push('');
        parts.push('SCENE CONTENTS:');
        parts.push(sceneDescription);
      }
    }

    return parts.join('\n');
  }

  /**
   * Build a description of the scene graph.
   */
  buildSceneDescription(maxNodes: number): string {
    const sceneGraph = this.runtime.getSceneGraph();
    const pageId = this.runtime.getCurrentPageId();
    if (!sceneGraph || !pageId) return '';

    const lines: string[] = [];
    let nodeCount = 0;

    const describeNode = (nodeId: NodeId, indent: number): void => {
      if (nodeCount >= maxNodes) return;

      const node = sceneGraph.getNode(nodeId);
      if (!node) return;

      const prefix = '  '.repeat(indent);
      const x = 'x' in node ? Math.round(node.x as number) : 0;
      const y = 'y' in node ? Math.round(node.y as number) : 0;
      const w = 'width' in node ? Math.round(node.width as number) : 0;
      const h = 'height' in node ? Math.round(node.height as number) : 0;

      lines.push(`${prefix}- ${node.id.slice(0, 8)}: "${node.name}" (${node.type}) at (${x},${y}) size ${w}x${h}`);
      nodeCount++;

      // Recurse into children
      const children = sceneGraph.getChildIds(nodeId);
      for (const childId of children) {
        describeNode(childId, indent + 1);
      }
    };

    // Start from page children
    const pageChildren = sceneGraph.getChildIds(pageId);
    for (const childId of pageChildren) {
      describeNode(childId, 0);
    }

    if (nodeCount >= maxNodes) {
      lines.push(`... and more elements (showing first ${maxNodes})`);
    }

    return lines.join('\n');
  }

  /**
   * Get tool definitions for function calling.
   * Uses the comprehensive tool registry and filters by tier if specified.
   */
  getTools(tier?: ToolTierConfig): AITool[] {
    // Get all definitions or filter by tier
    let definitions: ToolDefinition[];
    if (tier) {
      const tierTools = getToolsForTier(tier);
      definitions = getToolDefinitions(tierTools);
    } else {
      definitions = getAllToolDefinitions();
    }
    return definitions.map((def) => this.toolDefinitionToAITool(def));
  }

  /**
   * Convert a ToolDefinition to an AITool
   */
  private toolDefinitionToAITool(def: ToolDefinition): AITool {
    const params: AITool['parameters'] = {
      type: 'object',
      properties: this.convertSchemaProperties(def.parameters.properties || {}),
    };
    // Only add required if it exists and is not empty
    if (def.parameters.required && def.parameters.required.length > 0) {
      params.required = def.parameters.required;
    }
    return {
      name: def.name,
      description: def.description,
      parameters: params,
    };
  }

  /**
   * Convert JSONSchema properties to AIToolParameter properties
   */
  private convertSchemaProperties(
    props: Record<string, JSONSchema & { description?: string }>
  ): Record<string, AIToolParameter> {
    const result: Record<string, AIToolParameter> = {};

    for (const [key, schema] of Object.entries(props)) {
      result[key] = this.jsonSchemaToAIToolParameter(schema);
    }

    return result;
  }

  /**
   * Convert a JSONSchema to an AIToolParameter
   */
  private jsonSchemaToAIToolParameter(schema: JSONSchema): AIToolParameter {
    const param: AIToolParameter = {
      type: schema.type as AIToolParameter['type'],
    };

    // Only add description if it exists
    if (schema.description) {
      param.description = schema.description;
    }

    if (schema.enum) {
      param.enum = schema.enum;
    }

    if (schema.items) {
      param.items = this.jsonSchemaToAIToolParameter(schema.items);
    }

    if (schema.properties) {
      param.properties = this.convertSchemaProperties(schema.properties);
      // Only add required if it exists and is not empty
      if (schema.required && schema.required.length > 0) {
        param.required = schema.required;
      }
    }

    if (schema.minimum !== undefined) {
      param.minimum = schema.minimum;
    }

    if (schema.maximum !== undefined) {
      param.maximum = schema.maximum;
    }

    if (schema.default !== undefined) {
      param.default = schema.default;
    }

    return param;
  }

  /**
   * Get tool descriptions as a string for the system prompt.
   */
  private getToolDescriptions(): string {
    const tools = this.getTools();
    return tools
      .map((tool) => {
        const params = Object.entries(tool.parameters.properties)
          .map(([name, prop]) => {
            const p = prop as { type: string; description?: string };
            return `    ${name}: ${p.type}${p.description ? ` - ${p.description}` : ''}`;
          })
          .join('\n');
        return `- ${tool.name}: ${tool.description}\n${params}`;
      })
      .join('\n\n');
  }
}

/**
 * Create a context builder instance.
 */
export function createContextBuilder(
  runtime: DesignLibreRuntime,
  calibrator: CoordinateCalibrator
): ContextBuilder {
  return new ContextBuilder(runtime, calibrator);
}
