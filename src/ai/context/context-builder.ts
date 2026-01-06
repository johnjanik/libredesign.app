/**
 * Context Builder
 *
 * Builds context information for AI prompts from the current design state.
 * Includes token counting, smart truncation, and custom instructions.
 *
 * Integrates with the system-prompt-builder for model-agnostic prompts.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import type { CoordinateCalibrator } from '../calibration/coordinate-calibrator';
import type { AITool, AIToolParameter } from '../providers/ai-provider';
import type { ToolTierConfig } from '../config/provider-config';
import { getAllToolDefinitions, getToolDefinitions } from '../tools/tool-registry';
import type { ToolDefinition, JSONSchema } from '../tools/tool-registry';
import { getToolsForTier } from '../tools/tool-categories';
import {
  buildSystemPrompt as buildSystemPromptFromBuilder,
  buildContextPrompt as buildContextPromptFromBuilder,
  type SystemPromptOptions,
  type DesignContext,
} from '../prompts/system-prompt-builder';

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
   * Get the coordinate calibrator.
   * @deprecated No longer used internally, kept for backwards compatibility.
   */
  getCalibrator(): CoordinateCalibrator {
    return this.calibrator;
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
   * Build the system prompt using the new model-agnostic builder.
   */
  buildSystemPrompt(options: ContextBuilderOptions = {}): string {
    const customInstructions = options.customInstructions || this.customInstructions;

    // Build prompt options for the new system prompt builder
    const promptOptions: SystemPromptOptions = {
      application: 'designlibre',
      verbosity: 'standard',
      includeTypeSchemas: true,
      includeToolSummary: true,
      includeCoordinateSystem: true,
      includeBestPractices: true,
    };

    // Only add optional properties if they have values
    if (options.projectName) {
      promptOptions.projectName = options.projectName;
    }
    if (customInstructions) {
      promptOptions.customInstructions = customInstructions;
    }

    // Use the new system prompt builder
    const result = buildSystemPromptFromBuilder(promptOptions);
    return result.prompt;
  }

  /**
   * Build a DesignContext from the current runtime state.
   * Used for context-aware prompts.
   */
  buildDesignContext(): DesignContext {
    const context: DesignContext = {
      selection: { ids: [], objects: [] },
      viewport: { x: 0, y: 0, width: 1920, height: 1080, zoom: 1 },
      layers: [],
    };

    // Selection state
    const selection = this.runtime.getSelectionManager();
    if (selection) {
      const selectedIds = selection.getSelectedNodeIds();
      context.selection.ids = selectedIds;

      const sceneGraph = this.runtime.getSceneGraph();
      if (sceneGraph) {
        for (const id of selectedIds.slice(0, 10)) {
          const node = sceneGraph.getNode(id);
          if (node) {
            const obj: DesignContext['selection']['objects'][0] = {
              id: node.id,
              type: node.type,
              name: node.name,
              x: 'x' in node ? Math.round(node.x as number) : 0,
              y: 'y' in node ? Math.round(node.y as number) : 0,
            };
            // Only add width/height if they exist
            if ('width' in node) {
              obj.width = Math.round(node.width as number);
            }
            if ('height' in node) {
              obj.height = Math.round(node.height as number);
            }
            context.selection.objects.push(obj);
          }
        }
      }
    }

    // Viewport state
    const viewport = this.runtime.getViewport();
    if (viewport) {
      const bounds = viewport.getVisibleBounds();
      context.viewport = {
        x: Math.round(bounds.minX),
        y: Math.round(bounds.minY),
        width: Math.round(bounds.maxX - bounds.minX),
        height: Math.round(bounds.maxY - bounds.minY),
        zoom: viewport.getZoom(),
      };
    }

    // Active tool
    const toolManager = this.runtime.getToolManager();
    if (toolManager) {
      const activeTool = toolManager.getActiveTool();
      if (activeTool?.name) {
        context.activeTool = activeTool.name;
      }
    }

    return context;
  }

  /**
   * Build a description of the current state.
   * Uses the new context prompt builder for consistent formatting.
   */
  buildStateDescription(options: ContextBuilderOptions = {}): string {
    // Build the design context from runtime state
    const designContext = this.buildDesignContext();

    // Use the new context prompt builder for consistent formatting
    let stateDescription = buildContextPromptFromBuilder(designContext);

    // Scene overview (if requested) - append to the context description
    if (options.includeSceneGraph) {
      const sceneDescription = this.buildSceneDescription(options.maxNodes ?? 20);
      if (sceneDescription) {
        stateDescription += '\n\nSCENE CONTENTS:\n' + sceneDescription;
      }
    }

    return stateDescription;
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
