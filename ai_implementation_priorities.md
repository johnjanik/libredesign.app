## **1. Tool Prioritization & Organization**

```typescript
// tools/tool-categories.ts
export const TOOL_CATEGORIES = {
	// P0: Foundational (Week 1)
	SELECTION: {
		id: 'selection',
		priority: 0,
		description: 'Layer selection & basic operations',
		tools: [
		'select_all',
		'select_by_name', 
		'select_by_type',
		'deselect_all',
		'group_layers',
		'ungroup_layers',
		'lock_layer',
		'unlock_layer',
		'hide_layer',
		'show_layer'
		]
	},
	
	// P1: Basic Creation (Week 1-2)
	CREATION: {
		id: 'creation',
		priority: 1,
		description: 'Shape and element creation',
		tools: [
		'create_rectangle',
		'create_ellipse',
		'create_text',
		'create_frame',
		'insert_image',
		'create_component'
		]
	},
	
	// P2: Styling & Appearance (Week 2)
	STYLING: {
		id: 'styling', 
		priority: 2,
		description: 'Colors, fills, strokes, effects',
		tools: [
		'set_fill_color',
		'set_stroke_color',
		'set_stroke_width',
		'add_drop_shadow',
		'set_opacity',
		'set_corner_radius'
		]
	},
	
	// P3: Layout & Positioning (Week 2-3)
	LAYOUT: {
		id: 'layout',
		priority: 3,
		description: 'Alignment, distribution, positioning',
		tools: [
		'align_left',
		'align_center_h',
		'align_center_v',
		'distribute_horizontal',
		'distribute_vertical',
		'set_position',
		'resize',
		'rotate'
		]
	},
	
	// P4: Advanced Operations (Week 3-4)
	ADVANCED: {
		id: 'advanced',
		priority: 4,
		description: 'Auto-layout, components, prototyping',
		tools: [
		'add_auto_layout',
		'remove_auto_layout',
		'create_component_set',
		'create_instance',
		'add_interaction',
		'set_constraints'
		]
	},
	
	// P5: Utility & AI (Week 4-5)
	UTILITY: {
		id: 'utility',
		priority: 5,
		description: 'Export, analysis, AI features',
		tools: [
		'export_png',
		'export_svg',
		'generate_css',
		'accessibility_audit',
		'generate_image',
		'rewrite_text'
		]
	}
} as const;

// Build tool definitions by priority order
export const TOOLS_BY_PRIORITY = Object.values(TOOL_CATEGORIES)
.sort((a, b) => a.priority - b.priority)
.flatMap(category => category.tools);

// Progressive tool loading based on LLM capability
export function getToolsForCapability(level: 0 | 1 | 2 | 3 | 4 | 5): string[] {
	return Object.values(TOOL_CATEGORIES)
	.filter(category => category.priority <= level)
	.flatMap(category => category.tools);
}
```

## **2. Bridge Pattern Implementation**

```typescript
// bridge/runtime-bridge.ts

// Option 1: Dependency Injection (Recommended)
export interface DesignLibreRuntime {
	// Selection
	selectAll(): Promise<string[]>; // Returns selected IDs
	selectByIds(ids: string[]): Promise<void>;
	getSelection(): Promise<string[]>;
	
	// Creation
	createRectangle(options: RectangleOptions): Promise<string>; // Returns layer ID
	createText(options: TextOptions): Promise<string>;
	createFrame(options: FrameOptions): Promise<string>;
	
	// Styling
	setFillColor(layerId: string, color: ColorValue): Promise<void>;
	setStrokeColor(layerId: string, color: ColorValue): Promise<void>;
	
	// Layout
	alignLayers(layerIds: string[], alignment: Alignment): Promise<void>;
	setPosition(layerId: string, x: number, y: number): Promise<void>;
	
	// Events
	on(event: string, callback: (data: any) => void): void;
	off(event: string, callback: (data: any) => void): void;
}

// Option 2: Global Bridge with Type Safety
export class GlobalRuntimeBridge {
	private static instance: DesignLibreRuntime | null = null;
	private static proxy = new Proxy({}, {
		get(target, prop) {
			if (!GlobalRuntimeBridge.instance) {
				throw new Error('Runtime not initialized. Call setRuntime() first.');
			}
			return (GlobalRuntimeBridge.instance as any)[prop];
		}
	});
	
	static setRuntime(runtime: DesignLibreRuntime) {
		this.instance = runtime;
	}
	
	static getRuntime(): DesignLibreRuntime {
		if (!this.instance) {
			throw new Error('Runtime not initialized');
		}
		return this.instance;
	}
	
	// Convenience methods with validation
	static async safeSelectAll(): Promise<string[]> {
		const runtime = this.getRuntime();
		try {
			return await runtime.selectAll();
		} catch (error) {
			console.error('selectAll failed:', error);
			return [];
		}
	}
}

// Option 3: Event-based Bridge (for Web Workers)
export class MessageBridge {
	private eventTarget = new EventTarget();
	private worker: Worker | null = null;
	
	constructor() {
		// Setup message passing to/from worker or iframe
		window.addEventListener('message', this.handleIncomingMessage);
	}
	
	private handleIncomingMessage = (event: MessageEvent) => {
		if (event.data?.type?.startsWith('designlibre-')) {
			this.eventTarget.dispatchEvent(new CustomEvent(
			event.data.type,
			{ detail: event.data.payload }
			));
		}
	};
	
	async callRuntime<T>(method: string, args: any[]): Promise<T> {
		return new Promise((resolve, reject) => {
			const messageId = Math.random().toString(36).slice(2);
			
			// Send to runtime (could be iframe, worker, or parent window)
			window.parent.postMessage({
				type: 'designlibre-call',
				method,
				args,
				messageId
			}, '*');
			
			// Listen for response
			const handler = (event: MessageEvent) => {
				if (event.data?.messageId === messageId) {
					window.removeEventListener('message', handler);
					if (event.data.success) {
						resolve(event.data.result);
					} else {
						reject(new Error(event.data.error));
					}
				}
			};
			
			window.addEventListener('message', handler);
			
			// Timeout
			setTimeout(() => {
				window.removeEventListener('message', handler);
				reject(new Error(`Runtime call timeout: ${method}`));
			}, 5000);
		});
	}
}

// Usage example with dependency injection
export class ToolExecutor {
	constructor(private runtime: DesignLibreRuntime) {}
	
	async executeTool(toolName: string, args: any): Promise<ToolResult> {
		switch (toolName) {
			case 'select_all':
			const selectedIds = await this.runtime.selectAll();
			return {
				success: true,
				data: { selectedCount: selectedIds.length },
				message: `Selected ${selectedIds.length} layers`
			};
			
			case 'create_rectangle':
			const layerId = await this.runtime.createRectangle(args);
			return {
				success: true,
				data: { layerId },
				message: `Created rectangle at (${args.x}, ${args.y})`
			};
			
			default:
			throw new Error(`Tool not implemented: ${toolName}`);
		}
	}
}
```

## **3. Error Handling Strategy**

```typescript
// error/error-handler.ts
export enum ErrorSeverity {
	LOW = 'low',      // Can skip and continue
	MEDIUM = 'medium', // Try recovery, then skip
	HIGH = 'high',    // Stop chain and report
	CRITICAL = 'critical' // Stop everything
}

export interface ToolError {
	tool: string;
	error: Error;
	severity: ErrorSeverity;
	timestamp: number;
	context: ExecutionContext;
}

export class ErrorHandler {
	private recoveryAttempts = new Map<string, number>();
	private readonly MAX_RECOVERY_ATTEMPTS = 2;
	
	async handleToolError(
	toolError: ToolError,
	chain: ToolCall[]
	): Promise<RecoveryDecision> {
		
		// Determine severity if not specified
		const severity = this.assessSeverity(toolError);
		
		switch (severity) {
			case ErrorSeverity.LOW:
			return this.handleLowSeverityError(toolError, chain);
			
			case ErrorSeverity.MEDIUM:
			return this.handleMediumSeverityError(toolError, chain);
			
			case ErrorSeverity.HIGH:
			return this.handleHighSeverityError(toolError, chain);
			
			case ErrorSeverity.CRITICAL:
			return this.handleCriticalError(toolError, chain);
		}
	}
	
	private assessSeverity(error: ToolError): ErrorSeverity {
		const errorMsg = error.error.message.toLowerCase();
		
		// Critical errors
		if (errorMsg.includes('invalid selection') || 
		errorMsg.includes('no parent') ||
		errorMsg.includes('runtime not ready')) {
			return ErrorSeverity.CRITICAL;
		}
		
		// High severity - can't continue without this tool
		if (error.tool.startsWith('select_') && 
		error.context.state.selection.length === 0) {
			return ErrorSeverity.HIGH;
		}
		
		// Medium severity - might have alternatives
		if (errorMsg.includes('not found') ||
		errorMsg.includes('missing font') ||
		errorMsg.includes('invalid color')) {
			return ErrorSeverity.MEDIUM;
		}
		
		// Low severity - cosmetic or optional tools
		if (error.tool.includes('style') ||
		error.tool.includes('effect') ||
		error.tool.includes('rename')) {
			return ErrorSeverity.LOW;
		}
		
		return ErrorSeverity.MEDIUM;
	}
	
	private async handleLowSeverityError(
	error: ToolError,
	chain: ToolCall[]
	): Promise<RecoveryDecision> {
		console.warn(`Skipping low-severity tool: ${error.tool}`, error.error);
		return {
			action: 'skip',
			continueChain: true,
			message: `Skipped ${error.tool}: ${error.error.message}`
		};
	}
	
	private async handleMediumSeverityError(
	error: ToolError,
	chain: ToolCall[]
	): Promise<RecoveryDecision> {
		// Try recovery first
		const recoveryResult = await this.attemptRecovery(error);
		
		if (recoveryResult.success) {
			return {
				action: 'retry',
				continueChain: true,
				message: `Recovered and retried ${error.tool}`
			};
		}
		
		// Find alternative tool
		const alternative = this.findAlternativeTool(error, chain);
		if (alternative) {
			return {
				action: 'alternative',
				alternativeTool: alternative,
				continueChain: true,
				message: `Using alternative: ${alternative} instead of ${error.tool}`
			};
		}
		
		// Skip if no alternative
		return {
			action: 'skip',
			continueChain: true,
			message: `Skipped ${error.tool} after recovery failed`
		};
	}
	
	private async handleHighSeverityError(
	error: ToolError,
	chain: ToolCall[]
	): Promise<RecoveryDecision> {
		// Try to fix the preconditions
		const fixed = await this.fixPreconditions(error);
		
		if (fixed) {
			return {
				action: 'retry',
				continueChain: true,
				message: 'Fixed preconditions, retrying...'
			};
		}
		
		// Can't continue without this tool
		return {
			action: 'stop',
			continueChain: false,
			message: `Stopping chain: ${error.tool} failed and is required`
		};
	}
	
	private handleCriticalError(
	error: ToolError,
	chain: ToolCall[]
	): RecoveryDecision {
		// Critical error - abort everything
		return {
			action: 'abort',
			continueChain: false,
			message: `Critical error: ${error.error.message}. Aborting.`
		};
	}
	
	private async attemptRecovery(error: ToolError): Promise<RecoveryAttempt> {
		const attempts = this.recoveryAttempts.get(error.tool) || 0;
		
		if (attempts >= this.MAX_RECOVERY_ATTEMPTS) {
			return { success: false, reason: 'Max attempts reached' };
		}
		
		this.recoveryAttempts.set(error.tool, attempts + 1);
		
		// Attempt specific recoveries based on error type
		const errorMsg = error.error.message.toLowerCase();
		
		if (errorMsg.includes('layer not found')) {
			return await this.recoverMissingLayer(error);
		}
		
		if (errorMsg.includes('invalid color')) {
			return await this.recoverInvalidColor(error);
		}
		
		if (errorMsg.includes('out of bounds')) {
			return await this.recoverOutOfBounds(error);
		}
		
		return { success: false, reason: 'No recovery strategy' };
	}
	
	private findAlternativeTool(error: ToolError, chain: ToolCall[]): string | null {
		// Map of tools to their alternatives
		const alternatives: Record<string, string[]> = {
			'set_fill_color': ['set_stroke_color', 'set_opacity'],
			'create_rectangle': ['create_frame', 'create_vector'],
			'align_center_h': ['align_left', 'align_right'],
			'group_layers': ['create_frame', 'create_component']
		};
		
		const altList = alternatives[error.tool];
		if (!altList) return null;
		
		// Check if alternative is in the available tools
		for (const alt of altList) {
			if (chain.some(call => call.tool === alt)) {
				return alt;
			}
		}
		
		return null;
	}
}
```

## **4. State Sync Strategy**

```typescript
// state/state-sync.ts
export interface CanvasStateSummary {
	// Always included (minimal)
	selection: LayerSummary[];
	viewport: ViewportState;
	activePage: string;
	
	// Included based on detail level
	visibleLayers?: LayerSummary[];
	nearbyLayers?: LayerSummary[];
	artboardBounds?: Bounds;
	
	// Computed properties
	stats: {
		totalLayers: number;
		selectedCount: number;
		componentCount: number;
		textLayerCount: number;
	};
}

export class StateSummarizer {
	private detailLevel: DetailLevel = 'minimal';
	
	constructor(private runtime: DesignLibreRuntime) {}
	
	setDetailLevel(level: DetailLevel) {
		this.detailLevel = level;
	}
	
	async getStateSummary(): Promise<CanvasStateSummary> {
		const selection = await this.runtime.getSelection();
		const viewport = await this.runtime.getViewport();
		const activePage = await this.runtime.getActivePage();
		
		const baseSummary: CanvasStateSummary = {
			selection: await this.summarizeLayers(selection),
			viewport,
			activePage,
			stats: await this.getStats()
		};
		
		// Add detail based on level
		switch (this.detailLevel) {
			case 'minimal':
			return baseSummary;
			
			case 'standard':
			return {
				...baseSummary,
				visibleLayers: await this.getVisibleLayers(),
				artboardBounds: await this.getArtboardBounds()
			};
			
			case 'detailed':
			return {
				...baseSummary,
				visibleLayers: await this.getVisibleLayers(),
				nearbyLayers: await this.getNearbyLayers(viewport),
				artboardBounds: await this.getArtboardBounds(),
				// Include more context for complex operations
				autoLayoutAreas: await this.getAutoLayoutAreas(),
				componentInstances: await this.getComponentInstances()
			};
			
			case 'full':
			// For debugging or complex AI operations
			return {
				...baseSummary,
				visibleLayers: await this.getVisibleLayers(),
				nearbyLayers: await this.getNearbyLayers(viewport),
				artboardBounds: await this.getArtboardBounds(),
				autoLayoutAreas: await this.getAutoLayoutAreas(),
				componentInstances: await this.getComponentInstances(),
				styleUsage: await this.getStyleUsage(),
				accessibilityIssues: await this.getAccessibilityIssues()
			};
		}
	}
	
	private async summarizeLayers(layerIds: string[]): Promise<LayerSummary[]> {
		const summaries: LayerSummary[] = [];
		
		for (const id of layerIds.slice(0, 10)) { // Limit to 10 layers
			try {
				const layer = await this.runtime.getLayerProperties(id);
				summaries.push({
					id,
					name: layer.name,
					type: layer.type,
					bounds: layer.bounds,
					isVisible: layer.visible,
					isLocked: layer.locked,
					// Include only essential properties
					properties: {
						fill: layer.fill?.color ? 'has-fill' : 'no-fill',
						stroke: layer.stroke?.width > 0 ? 'has-stroke' : 'no-stroke',
						text: layer.textContent?.slice(0, 50) || null
					}
				});
			} catch (error) {
				// Skip layers we can't access
			}
		}
		
		return summaries;
	}
	
	// Smart state for LLM context (adaptive detail)
	async getSmartStateForPrompt(prompt: string): Promise<CanvasStateSummary> {
		// Analyze prompt to determine needed detail
		const promptAnalysis = this.analyzePrompt(prompt);
		
		// Adjust detail level based on prompt complexity
		if (promptAnalysis.complexity === 'simple') {
			this.setDetailLevel('minimal');
		} else if (promptAnalysis.complexity === 'moderate') {
			this.setDetailLevel('standard');
		} else {
			this.setDetailLevel('detailed');
		}
		
		// Add prompt-specific context
		const summary = await this.getStateSummary();
		
		if (promptAnalysis.mentionsColor) {
			summary.colorPalette = await this.extractColorPalette();
		}
		
		if (promptAnalysis.mentionsLayout) {
			summary.layoutGrid = await this.getLayoutGrid();
		}
		
		if (promptAnalysis.mentionsComponents) {
			summary.componentHierarchy = await this.getComponentHierarchy();
		}
		
		return summary;
	}
	
	private analyzePrompt(prompt: string): PromptAnalysis {
		const lower = prompt.toLowerCase();
		
		return {
			complexity: this.assessComplexity(prompt),
			mentionsColor: /\b(color|fill|stroke|rgb|hex|hsl|gradient)\b/i.test(prompt),
			mentionsLayout: /\b(layout|align|distribute|position|grid|frame)\b/i.test(prompt),
			mentionsComponents: /\b(component|instance|variant|library)\b/i.test(prompt),
			mentionsText: /\b(text|font|typography|copy|content)\b/i.test(prompt),
			mentionsEffects: /\b(shadow|blur|opacity|effect|blend)\b/i.test(prompt)
		};
	}
	
	private assessComplexity(prompt: string): 'simple' | 'moderate' | 'complex' {
		const wordCount = prompt.split(/\s+/).length;
		const hasMultipleClauses = prompt.split(/[,;]|and|then/).length > 2;
		
		if (wordCount < 5 && !hasMultipleClauses) return 'simple';
		if (wordCount < 15 && !hasMultipleClauses) return 'moderate';
		return 'complex';
	}
}

// Usage in LLM context
export function buildLLMPrompt(
userRequest: string,
stateSummary: CanvasStateSummary,
availableTools: string[]
): string {
	return `
	You are a design assistant for DesignLibre. You have access to tools that can manipulate the canvas.
	
	CURRENT CANVAS STATE:
	${JSON.stringify(stateSummary, null, 2)}
	
	AVAILABLE TOOLS (${availableTools.length} total):
	${availableTools.map(t => `- ${t}`).join('\n')}
	
	USER REQUEST: ${userRequest}
	
	INSTRUCTIONS:
	1. Analyze the current canvas state
	2. Determine which tools to use to fulfill the request
	3. Return a JSON array of tool calls in order
	4. Only use tools that are available
	5. Consider the current selection and visible layers
	
	Respond with JSON only:
	[
	{ "tool": "tool_name", "args": {...} },
	...
	]
	`;
}
```

## **Recommended Implementation Order**

```typescript
// Week 1 Implementation Plan
export const WEEK1_PLAN = {
	// Phase 1: Bridge & Core Infrastructure
	day1: [
	'Define DesignLibreRuntime interface',
	'Implement GlobalRuntimeBridge',
	'Set up basic error types',
	'Create StateSummarizer with minimal detail'
	],
	
	// Phase 2: Foundational Tools (Selection/Layer Ops)
	day2_3: [
	'Implement select_all, deselect_all',
	'Implement group_layers, ungroup_layers',
	'Implement lock_layer, unlock_layer',
	'Implement hide_layer, show_layer'
	],
	
	// Phase 3: Basic Creation Tools
	day4_5: [
	'Implement create_rectangle, create_ellipse',
	'Implement create_text',
	'Implement create_frame',
	'Set up tool chaining with error handling'
	]
};

// Bridge initialization example
export function initializeBridge(): DesignLibreRuntime {
	// Check for global runtime
	if (window.designLibre) {
		const runtime: DesignLibreRuntime = {
			selectAll: () => window.designLibre.selectAll(),
			selectByIds: (ids) => window.designLibre.selectByIds(ids),
			getSelection: () => window.designLibre.getSelection(),
			createRectangle: (opts) => window.designLibre.createRectangle(opts),
			createText: (opts) => window.designLibre.createText(opts),
			createFrame: (opts) => window.designLibre.createFrame(opts),
			setFillColor: (id, color) => window.designLibre.setFillColor(id, color),
			setStrokeColor: (id, color) => window.designLibre.setStrokeColor(id, color),
			alignLayers: (ids, alignment) => window.designLibre.alignLayers(ids, alignment),
			setPosition: (id, x, y) => window.designLibre.setPosition(id, x, y),
			on: (event, callback) => window.designLibre.on(event, callback),
			off: (event, callback) => window.designLibre.off(event, callback)
		};
		
		GlobalRuntimeBridge.setRuntime(runtime);
		return runtime;
	}
	
	throw new Error('DesignLibre runtime not found');
}
```

**Key Decisions Summary:**
1. **Tool Priority**: Selection → Creation → Styling → Layout → Advanced
2. **Bridge Pattern**: Dependency injection + global fallback
3. **Error Handling**: Severity-based with recovery attempts
4. **State Sync**: Smart adaptive detail based on prompt complexity
