# AI Model-Agnostic Integration Plan for 2D CAD Design Application

## 1. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Design Application                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────────────────┐  │
│  │   Vision     │    │   Chat/Text  │    │       Command Bus           │  │
│  │   Model      │    │    Model     │    │  • Routes structured calls  │  │
│  │  (Ollama)    │    │ (Ollama/API) │    │  • Validates schemas        │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┬──────────────┘  │
│         │                   │                            │                 │
│  ┌──────▼───────┐    ┌──────▼───────┐    ┌──────────────▼──────────────┐  │
│  │ Vision Adapter│    │   Text Adapter│    │     Tool Dispatcher        │  │
│  │ • Extracts    │    │ • Parses      │    │ • Maps calls to functions  │  │
│  │   canvas info │    │   structured  │    │ • Executes commands        │  │
│  │ • Formats     │    │   commands    │    │ • Returns results          │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┬──────────────┘  │
│         │                   │                            │                 │
├─────────┼───────────────────┼────────────────────────────┼─────────────────┤
│  ┌──────▼───────────────────▼───────┐    ┌──────────────▼──────────────┐  │
│  │      Universal Priming Layer       │    │     Document State          │  │
│  │ • Tool definitions (JSON Schema)   │    │ • Selection, layers,        │  │
│  │ • Domain objects (TypeScript)      │    │   viewport, etc.            │  │
│  │ • System prompt templates          │    │ • Real-time updates         │  │
│  └────────────────────────────────────┘    └─────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                   Implementation Layer                               │  │
│  │   • 172 tools (39 implemented)                                      │  │
│  │   • Tool-specific business logic                                    │  │
│  │   • Result formatting                                               │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. UNIVERSAL TOOL DEFINITION SCHEMA

```typescript
// Universal tool definition format (model-agnostic)
interface UniversalToolDefinition {
  id: string;                    // Unique identifier (e.g., "select_all")
  name: string;                  // Human-readable name
  category: string;              // From your 26 categories
  description: string;           // Detailed description for AI
  parameters: JSONSchema;        // JSON Schema for inputs
  returns?: JSONSchema;          // JSON Schema for return value
  requiresSelection: boolean;    // Whether tool needs selection
  implemented: boolean;          // From your status column
  priority: number;              // 1-4 based on your tiers
}

// Universal parameter schema
interface JSONSchema {
  type: "object" | "array" | "string" | "number" | "boolean" | "null";
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: any[];
  description?: string;
  default?: any;
  minimum?: number;
  maximum?: number;
}

// Example: select_by_name tool
const selectByNameTool: UniversalToolDefinition = {
  id: "select_by_name",
  name: "Select by Name Pattern",
  category: "SELECTION_TOOLS",
  description: "Select objects whose names match a pattern (supports wildcards: * for multiple chars, ? for single char)",
  parameters: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Pattern to match (e.g., 'button_*', '*header*', 'icon_??')"
      },
      caseSensitive: {
        type: "boolean",
        default: false
      }
    },
    required: ["pattern"]
  },
  requiresSelection: false,
  implemented: true,
  priority: 1
};
```

## 3. DOMAIN OBJECT SCHEMAS

```typescript
// Core domain objects (shared across all models)
interface Point2D {
  x: number;
  y: number;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Transform {
  position: Point2D;
  rotation: number;  // degrees
  scale: Point2D;
  pivot: Point2D;
}

interface Color {
  hex: string;
  rgb?: { r: number; g: number; b: number; a?: number };
  hsl?: { h: number; s: number; l: number; a?: number };
}

interface DesignObject {
  id: string;
  type: "rectangle" | "ellipse" | "text" | "line" | "path" | "group" | "frame";
  name: string;
  bounds: Bounds;
  transform: Transform;
  visible: boolean;
  locked: boolean;
  opacity: number;
  parentId: string | null;
  children: string[];
  metadata: Record<string, any>;
}

interface DocumentState {
  objects: Record<string, DesignObject>;
  selection: string[];
  layers: Layer[];
  viewport: Viewport;
  artboards: Artboard[];
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  objectIds: string[];
  zIndex: number;
}

interface Viewport {
  center: Point2D;
  zoom: number;
  bounds: Bounds;
}

interface Artboard {
  id: string;
  name: string;
  bounds: Bounds;
  backgroundColor: Color;
}
```

## 4. MODEL ADAPTERS PATTERN

```typescript
// Base adapter interface
interface AIModelAdapter {
  name: string;
  capabilities: ("vision" | "tool_calling" | "structured_output")[];
  
  // Convert universal tools to model-specific format
  formatTools(tools: UniversalToolDefinition[]): any;
  
  // Format system prompt
  formatSystemPrompt(prompt: string): any;
  
  // Format user message with context
  formatUserMessage(
    text: string, 
    context: DocumentState, 
    image?: Buffer
  ): any;
  
  // Parse model response to universal format
  parseResponse(response: any): AIModelResponse;
}

// Universal response format
interface AIModelResponse {
  text: string;
  toolCalls: ToolCall[];
  confidence: number;
  reasoning?: string;
}

interface ToolCall {
  toolId: string;
  parameters: Record<string, any>;
  confidence?: number;
}

// Example adapters
class ClaudeAdapter implements AIModelAdapter {
  name = "claude";
  capabilities = ["tool_calling", "structured_output"];
  
  formatTools(tools: UniversalToolDefinition[]) {
    return tools.map(tool => ({
      name: tool.id,
      description: tool.description,
      input_schema: tool.parameters
    }));
  }
  
  formatSystemPrompt(prompt: string) {
    return prompt;
  }
  
  parseResponse(response: any): AIModelResponse {
    // Parse Claude's tool_use blocks
    const toolCalls: ToolCall[] = [];
    let text = "";
    
    for (const block of response.content) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          toolId: block.name,
          parameters: block.input
        });
      }
    }
    
    return { text, toolCalls };
  }
}

class OllamaAdapter implements AIModelAdapter {
  name = "ollama";
  capabilities = ["vision", "structured_output"];
  
  formatTools(tools: UniversalToolDefinition[]) {
    // Ollama doesn't have native tool calling, use structured prompt
    return tools.map(tool => ({
      name: tool.id,
      parameters: JSON.stringify(tool.parameters, null, 2)
    }));
  }
  
  formatSystemPrompt(prompt: string) {
    return `${prompt}

## Response Format
You MUST respond with a JSON object in this exact format:
{
  "thinking": "Your step-by-step reasoning",
  "commands": [
    {"tool": "tool_id", "params": {...}},
    ...
  ],
  "response": "Text to show user"
}`;
  }
  
  parseResponse(response: any): AIModelResponse {
    try {
      const parsed = JSON.parse(response.response);
      return {
        text: parsed.response,
        toolCalls: parsed.commands?.map((cmd: any) => ({
          toolId: cmd.tool,
          parameters: cmd.params
        })) || [],
        reasoning: parsed.thinking
      };
    } catch (e) {
      // Fallback to text-only
      return {
        text: response.response,
        toolCalls: []
      };
    }
  }
}

class OpenAIAdapter implements AIModelAdapter {
  name = "openai";
  capabilities = ["vision", "tool_calling", "structured_output"];
  
  formatTools(tools: UniversalToolDefinition[]) {
    return tools.map(tool => ({
      type: "function",
      function: {
        name: tool.id,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }
  
  parseResponse(response: any): AIModelResponse {
    const toolCalls: ToolCall[] = [];
    
    if (response.choices[0].message.tool_calls) {
      response.choices[0].message.tool_calls.forEach((call: any) => {
        toolCalls.push({
          toolId: call.function.name,
          parameters: JSON.parse(call.function.arguments)
        });
      });
    }
    
    return {
      text: response.choices[0].message.content || "",
      toolCalls
    };
  }
}
```

## 5. UNIVERSAL SYSTEM PROMPT TEMPLATE

```typescript
const UNIVERSAL_SYSTEM_PROMPT = `
# 2D CAD Design Assistant

## Role
You are an expert 2D CAD design assistant. You help users create, edit, and manage 2D vector designs through natural language and visual understanding.

## Coordinate System
- Origin: Top-left corner (0, 0)
- X-axis: Increases to the RIGHT
- Y-axis: Increases DOWNWARD
- Units: Pixels (px) unless specified
- Rotation: Clockwise degrees, centered on object pivot

## Available Tools
{{TOOLS_SUMMARY}}

## Current Context
{{CONTEXT_SUMMARY}}

## Response Guidelines

### For Text-Only Models (like Ollama):
Respond with a JSON object:
\`\`\`json
{
  "thinking": "Analyze the request and plan steps",
  "commands": [
    {"tool": "select_all", "params": {}},
    {"tool": "move_objects", "params": {"dx": 10}}
  ],
  "response": "I've moved all objects 10px to the right."
}
\`\`\`

### For Tool-Calling Models (like Claude/OpenAI):
Use the provided tool calling functions directly.

### General Rules:
1. Always check if operations need selection
2. Use descriptive names for new objects
3. Maintain design consistency
4. Group related objects
5. Preserve alignment and spacing
6. Report errors clearly

## Error Handling
If a tool fails, analyze why and try alternative approach.

## Design Principles
- Follow 8px grid system
- Use consistent color palette
- Maintain typographic hierarchy
- Ensure adequate contrast
- Group logical elements
`;
```

## 6. CONTEXT BUILDER

```typescript
class ContextBuilder {
  constructor(private documentState: DocumentState) {}
  
  buildSummary(): string {
    return `
### Document State
- Objects: ${Object.keys(this.documentState.objects).length}
- Selected: ${this.documentState.selection.length}
- Layers: ${this.documentState.layers.length}
- Artboards: ${this.documentState.artboards.length}

### Selection
${this.buildSelectionSummary()}

### Viewport
Zoom: ${(this.documentState.viewport.zoom * 100).toFixed(0)}%
Visible: ${Math.round(this.documentState.viewport.bounds.width)}×${Math.round(this.documentState.viewport.bounds.height)}
`;

  }
  
  buildSelectionSummary(): string {
    if (this.documentState.selection.length === 0) {
      return "Nothing selected.";
    }
    
    const selectedObjects = this.documentState.selection.map(id => 
      this.documentState.objects[id]
    ).filter(Boolean);
    
    return selectedObjects.map(obj => 
      `- ${obj.name} (${obj.type}) at (${Math.round(obj.bounds.x)}, ${Math.round(obj.bounds.y)})`
    ).join('\n');
  }
  
  buildToolSummary(tools: UniversalToolDefinition[]): string {
    const byCategory = tools.reduce((acc, tool) => {
      if (!acc[tool.category]) acc[tool.category] = [];
      acc[tool.category].push(tool);
      return acc;
    }, {} as Record<string, UniversalToolDefinition[]>);
    
    let summary = "## Available Tools by Category\n\n";
    
    for (const [category, categoryTools] of Object.entries(byCategory)) {
      summary += `### ${category}\n`;
      categoryTools.forEach(tool => {
        summary += `- **${tool.name}** (${tool.id})${tool.implemented ? '' : ' [NOT IMPLEMENTED]'}\n`;
        summary += `  ${tool.description.split('\n')[0]}\n`;
      });
      summary += '\n';
    }
    
    return summary;
  }
}
```

## 7. TOOL DISPATCHER & EXECUTION ENGINE

```typescript
class ToolDispatcher {
  private toolRegistry = new Map<string, ToolImplementation>();
  
  registerTool(tool: UniversalToolDefinition, implementation: ToolImplementation) {
    this.toolRegistry.set(tool.id, implementation);
  }
  
  async execute(call: ToolCall, context: DocumentState): Promise<ToolResult> {
    const implementation = this.toolRegistry.get(call.toolId);
    
    if (!implementation) {
      return {
        success: false,
        error: `Tool '${call.toolId}' not implemented`
      };
    }
    
    // Validate parameters against schema
    const validation = this.validateParameters(
      call.toolId, 
      call.parameters, 
      implementation.schema
    );
    
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid parameters: ${validation.errors.join(', ')}`
      };
    }
    
    try {
      // Execute with context
      const result = await implementation.execute(
        call.parameters, 
        context
      );
      
      // Update document state
      this.updateDocumentState(context, result);
      
      return {
        success: true,
        data: result.data,
        affectedIds: result.affectedIds,
        metadata: result.metadata
      };
      
    } catch (error) {
      return {
        success: false,
        error: String(error)
      };
    }
  }
  
  private validateParameters(
    toolId: string, 
    params: any, 
    schema: JSONSchema
  ): ValidationResult {
    // Implement JSON Schema validation
    // Return validation result
  }
  
  private updateDocumentState(
    context: DocumentState, 
    result: ExecutionResult
  ) {
    // Update selection if tool changed it
    // Update object properties
    // Trigger UI updates
  }
}

interface ToolImplementation {
  schema: JSONSchema;
  execute: (params: any, context: DocumentState) => Promise<ExecutionResult>;
}

interface ExecutionResult {
  data?: any;
  affectedIds: string[];
  metadata?: Record<string, any>;
}

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  affectedIds?: string[];
}
```

## 8. IMPLEMENTATION PRIORITY PLAN

Based on your tool list (39/172 implemented), here's a phased approach:

### Phase 1: Core Foundation (Weeks 1-2)
1. **Essential Tools** (Tier 1 from your list)
   - Typography tools (7 tools)
   - Transform tools (scale, move_by, flip) 
   - Effects (shadows, blur)
   - Editing (undo, redo, copy, paste)
   
2. **Model Adapters**
   - Ollama adapter with structured JSON output
   - Claude/OpenAI adapters with native tool calling

### Phase 2: Productivity Boost (Weeks 3-4)
1. **Export Tools** (4 tools) - PNG, SVG, JSON, batch
2. **Query Tools** (2 tools) - property inspection
3. **Viewport Tools** (3 tools) - zoom controls
4. **Fill & Stroke** (5 tools) - gradients, style copy/paste

### Phase 3: Advanced Features (Weeks 5-8)
1. **Component Tools** (11 tools) - design system support
2. **Style Tools** (7 tools) - reusable styles
3. **Auto-Layout** (5 tools) - responsive design
4. **Code Generation** (7 tools) - export to code

### Phase 4: Polish & AI (Weeks 9-12)
1. **AI-Powered Tools** (7 tools) - image generation, background removal
2. **Analysis Tools** (8 tools) - accessibility, contrast checks
3. **Batch Tools** (4 tools) - bulk operations
4. **Collaboration Tools** (4 tools) - comments

## 9. INTEGRATION EXAMPLE

```typescript
class DesignAIAssistant {
  private adapter: AIModelAdapter;
  private dispatcher: ToolDispatcher;
  private contextBuilder: ContextBuilder;
  
  constructor(
    private modelType: "ollama" | "claude" | "openai",
    private tools: UniversalToolDefinition[]
  ) {
    this.adapter = this.createAdapter(modelType);
    this.dispatcher = new ToolDispatcher();
    this.contextBuilder = new ContextBuilder();
    
    // Register implemented tools
    tools.filter(t => t.implemented).forEach(tool => {
      this.dispatcher.registerTool(tool, this.getImplementation(tool.id));
    });
  }
  
  async processRequest(
    userMessage: string,
    documentState: DocumentState,
    screenshot?: Buffer
  ): Promise<AssistantResponse> {
    
    // 1. Build context
    const context = this.contextBuilder.buildSummary();
    const toolSummary = this.contextBuilder.buildToolSummary(this.tools);
    
    // 2. Format system prompt
    const systemPrompt = UNIVERSAL_SYSTEM_PROMPT
      .replace("{{TOOLS_SUMMARY}}", toolSummary)
      .replace("{{CONTEXT_SUMMARY}}", context);
    
    // 3. Call AI model
    const modelResponse = await this.callModel(
      systemPrompt,
      userMessage,
      documentState,
      screenshot
    );
    
    // 4. Execute tool calls
    const results: ToolResult[] = [];
    for (const call of modelResponse.toolCalls) {
      const result = await this.dispatcher.execute(call, documentState);
      results.push(result);
      
      // If tool failed, stop execution chain
      if (!result.success) {
        return {
          text: `Error: ${result.error}\n${modelResponse.text}`,
          results,
          success: false
        };
      }
    }
    
    // 5. Return final response
    return {
      text: modelResponse.text,
      results,
      success: true
    };
  }
  
  private async callModel(
    systemPrompt: string,
    userMessage: string,
    documentState: DocumentState,
    screenshot?: Buffer
  ): Promise<AIModelResponse> {
    
    // Format for specific model
    const formatted = this.adapter.formatUserMessage(
      userMessage,
      documentState,
      screenshot
    );
    
    // Call appropriate API
    switch (this.modelType) {
      case "ollama":
        return this.callOllama(systemPrompt, formatted);
      case "claude":
        return this.callClaude(systemPrompt, formatted);
      case "openai":
        return this.callOpenAI(systemPrompt, formatted);
    }
  }
  
  private getImplementation(toolId: string): ToolImplementation {
    // Map tool IDs to actual implementations
    const implementations: Record<string, ToolImplementation> = {
      "select_all": {
        schema: { type: "object", properties: {} },
        async execute(params, context) {
          // Implementation
          return { affectedIds: [] };
        }
      },
      // ... other tool implementations
    };
    
    return implementations[toolId];
  }
}
```

## 10. ERROR HANDLING & FALLBACKS

```typescript
class ErrorHandler {
  static handleToolError(error: any, toolId: string): string {
    const errorMap: Record<string, string> = {
      "not_implemented": `Tool '${toolId}' is not yet implemented.`,
      "invalid_params": `Invalid parameters for '${toolId}'.`,
      "no_selection": `'${toolId}' requires a selection.`,
      "locked_object": `Cannot modify locked objects.`
    };
    
    return errorMap[error.code] || `Error with '${toolId}': ${error.message}`;
  }
  
  static createFallbackPlan(
    failedTool: ToolCall,
    context: DocumentState
  ): ToolCall[] {
    // Generate alternative approach when a tool fails
    // Example: If "align_center" fails, suggest manual positioning
  }
}
```

## 11. DEPLOYMENT & SCALING

### Development Phase:
1. Start with Ollama + local models for rapid iteration
2. Use JSON structured output for simple tool calling
3. Implement 5-10 tools per week based on priority

### Production Phase:
1. Add Claude/OpenAI adapters for better tool calling
2. Implement caching for expensive operations
3. Add rate limiting and error recovery
4. Create user preference profiles for AI behavior

### Monitoring:
```typescript
interface AnalyticsEvent {
  timestamp: Date;
  model: string;
  tool: string;
  success: boolean;
  latency: number;
  error?: string;
}

// Track to improve tool implementations
```

## 12. KEY DECISIONS

1. **Single Source of Truth**: Your `ai-tools-complete-list.md` drives everything
2. **JSON Schema First**: All tools defined with JSON Schema for validation
3. **Adapter Pattern**: Each AI model gets its own adapter
4. **Structured Output Fallback**: Even models without tool calling use JSON
5. **Incremental Rollout**: Start with 39 implemented tools, add others weekly
6. **User Feedback Loop**: Track which tools users actually use

This plan provides a model-agnostic architecture that can grow from 39 to 172 tools while maintaining compatibility with local (Ollama) and cloud (Claude/OpenAI) AI models.
