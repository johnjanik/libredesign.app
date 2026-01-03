DesignLibre AI Implementation 

## **Architecture: Browser-First TypeScript Tool Layer**

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │           DesignLibre Web App                       │   │
│  │  (Canvas, UI, Graphics Engine)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │        Tool Execution Layer (Web Worker)            │   │
│  │  • Tool Registry & Discovery                       │   │
│  │  • Tool Chaining & Planning                        │   │
│  │  • State Management                                │   │
│  │  • Error Recovery                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           LLM Adapter (Web Worker)                  │   │
│  │  • Local LLM via WebGPU/WebAssembly                │   │
│  │  • API calls to cloud LLMs                         │   │
│  │  • Tool call parsing & formatting                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## **Phase 1: Core Infrastructure (Week 1)**

### **1.1 Tool Registry & Definition System**
```typescript
// tool-registry.ts - Pure TypeScript, no dependencies
export type ToolCategory = 'selection' | 'creation' | 'styling' | 'layout' | 'components' | 'prototyping';

export interface ToolDefinition {
	id: string;
	name: string;
	description: string;
	category: ToolCategory;
	complexity: number; // 1-10 scale
	
	// OpenAI-compatible schema
	parameters: {
		type: 'object';
		properties: Record<string, {
			type: 'string' | 'number' | 'boolean' | 'object' | 'array';
			description: string;
			enum?: string[];
		}>;
		required?: string[];
	};
	
	// Execution metadata
	executionMode: 'sync' | 'async' | 'streaming';
	estimatedDuration?: number; // ms
	dependencies?: string[]; // Other tools needed
	
	// Context requirements
	requiresSelection?: boolean;
	requiresParentFrame?: boolean;
	requiresArtboard?: boolean;
}

export class ToolRegistry {
	private tools = new Map<string, ToolDefinition>();
	private toolImplementations = new Map<string, ToolImplementation>();
	
	register(definition: ToolDefinition, implementation: ToolImplementation) {
		this.tools.set(definition.id, definition);
		this.toolImplementations.set(definition.id, implementation);
	}
	
	// Get tools filtered by complexity
	getToolsForCapability(maxComplexity: number = 10): ToolDefinition[] {
		return Array.from(this.tools.values())
		.filter(tool => tool.complexity <= maxComplexity);
	}
	
	// Convert to OpenAI format
	toOpenAIFunctions(): Array<{
		type: 'function';
		function: {
			name: string;
			description: string;
			parameters: any;
		}
	}> {
		return Array.from(this.tools.values()).map(tool => ({
			type: 'function',
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.parameters
			}
		}));
	}
	
	async execute(toolId: string, args: any, context: ExecutionContext): Promise<ToolResult> {
		const implementation = this.toolImplementations.get(toolId);
		if (!implementation) throw new Error(`Tool ${toolId} not implemented`);
		
		return implementation(args, context);
	}
}
```

### **1.2 DesignLibre Bridge (In-App Communication)**
```typescript
// bridge/designlibre-bridge.ts
export class DesignLibreBridge {
	private eventBus = new EventTarget();
	
	// Methods to call DesignLibre runtime directly
	async selectAll(): Promise<void> {
		// Assuming DesignLibre exposes a global API
		return window.designLibre?.selectAll();
	}
	
	async createRectangle(x: number, y: number, width: number, height: number): Promise<string> {
		return window.designLibre?.createRectangle({ x, y, width, height });
	}
	
	// Listen for DesignLibre events
	setupEventListeners() {
		// Canvas state changes
		window.designLibre?.on('selectionChanged', (selection: string[]) => {
			this.eventBus.dispatchEvent(new CustomEvent('selection-changed', { 
				detail: { selection }
			}));
		});
		
		// Layer updates
		window.designLibre?.on('layerUpdated', (layerId: string, updates: any) => {
			this.eventBus.dispatchEvent(new CustomEvent('layer-updated', {
				detail: { layerId, updates }
			}));
		});
	}
	
	// Subscribe to events
	subscribe(event: string, callback: (data: any) => void) {
		this.eventBus.addEventListener(event, (e: any) => callback(e.detail));
	}
}
```

### **1.3 State Management with IndexedDB**
```typescript
// state/state-manager.ts
export class CanvasStateManager {
	private db: IDBDatabase | null = null;
	private currentState: CanvasState = {
		selection: [],
		activePage: '',
		viewport: { x: 0, y: 0, zoom: 1 },
		layers: new Map(),
		history: []
	};
	
	async initialize(): Promise<void> {
		// Open IndexedDB for persistent state
		return new Promise((resolve, reject) => {
			const request = indexedDB.open('DesignLibreState', 1);
			
			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				db.createObjectStore('canvasState', { keyPath: 'id' });
				db.createObjectStore('toolHistory', { autoIncrement: true });
				db.createObjectStore('userPreferences');
			};
			
			request.onsuccess = (event) => {
				this.db = (event.target as IDBOpenDBRequest).result;
				this.loadState().then(resolve);
			};
			
			request.onerror = reject;
		});
	}
	
	async updateState(updates: Partial<CanvasState>): Promise<void> {
		Object.assign(this.currentState, updates);
		
		// Save to IndexedDB
		if (this.db) {
			const transaction = this.db.transaction(['canvasState'], 'readwrite');
			const store = transaction.objectStore('canvasState');
			store.put({ id: 'current', ...this.currentState });
		}
		
		// Notify listeners
		this.dispatchEvent(new CustomEvent('state-changed', {
			detail: { state: this.currentState }
		}));
	}
	
	// Get state summary for LLM context
	getStateSummary(): string {
		return `
		Canvas State:
		- Active page: ${this.currentState.activePage}
		- Selected layers: ${this.currentState.selection.length}
		- Total layers: ${this.currentState.layers.size}
		- Viewport: ${JSON.stringify(this.currentState.viewport)}
		`;
	}
}
```

## **Phase 2: Web Worker Execution Engine (Week 2)**

### **2.1 Main Tool Execution Worker**
```typescript
// workers/tool-worker.ts
class ToolExecutionWorker {
	private registry: ToolRegistry;
	private bridge: DesignLibreBridge;
	private state: CanvasStateManager;
	private isExecuting = false;
	private executionQueue: ExecutionJob[] = [];
	
	constructor() {
		this.registry = new ToolRegistry();
		this.bridge = new DesignLibreBridge();
		this.state = new CanvasStateManager();
		
		// Register all 200+ tools
		this.registerAllTools();
		
		// Listen for messages from main thread
		self.onmessage = this.handleMessage.bind(this);
	}
	
	private async handleMessage(event: MessageEvent) {
		const { type, data } = event.data;
		
		switch (type) {
			case 'execute-tool':
			await this.executeTool(data.tool, data.args);
			break;
			
			case 'execute-chain':
			await this.executeToolChain(data.tools);
			break;
			
			case 'get-tools':
			this.sendTools();
			break;
			
			case 'get-state':
			this.sendState();
			break;
		}
	}
	
	private async executeToolChain(tools: Array<{ tool: string; args: any }>) {
		const results = [];
		const errors = [];
		
		for (const call of tools) {
			try {
				// Validate tool exists
				const toolDef = this.registry.getToolDefinition(call.tool);
				if (!toolDef) {
					throw new Error(`Tool ${call.tool} not found`);
				}
				
				// Check preconditions
				const canExecute = await this.validatePreconditions(toolDef);
				if (!canExecute) {
					// Try to fix preconditions
					await this.attemptPreconditionFix(toolDef);
				}
				
				// Execute
				const result = await this.registry.execute(call.tool, call.args, {
					state: this.state.getCurrentState(),
					bridge: this.bridge
				});
				
				results.push(result);
				
				// Update state
				await this.state.updateFromToolResult(result);
				
				// Send progress update
				self.postMessage({
					type: 'tool-progress',
					data: { tool: call.tool, success: true, result }
				});
				
			} catch (error) {
				errors.push({ tool: call.tool, error: error.message });
				
				// Attempt recovery
				const shouldContinue = await this.handleToolError(call, error);
				if (!shouldContinue) break;
			}
		}
		
		self.postMessage({
			type: 'chain-complete',
			data: { results, errors }
		});
	}
	
	private sendTools() {
		const tools = this.registry.getToolsForCapability();
		self.postMessage({
			type: 'tools-list',
			data: { tools: this.registry.toOpenAIFunctions() }
		});
	}
}

// Initialize worker
new ToolExecutionWorker();
```

### **2.2 Tool Implementation Examples**
```typescript
// tools/selection-tools.ts
export const selectionTools: Record<string, ToolImplementation> = {
	select_all: async (args, context) => {
		await context.bridge.selectAll();
		const newSelection = await context.bridge.getSelection();
		return { 
			success: true, 
			selection: newSelection,
			message: `Selected ${newSelection.length} layers`
		};
	},
	
	select_by_name: async (args: { pattern: string }, context) => {
		const allLayers = await context.bridge.getAllLayers();
		const matched = allLayers.filter(layer => 
		layer.name.includes(args.pattern)
		);
		
		await context.bridge.setSelection(matched.map(l => l.id));
		return {
			success: true,
			selection: matched.map(l => l.id),
			count: matched.length
		};
	},
	
	select_similar: async (args: { property: string }, context) => {
		const current = await context.bridge.getSelectedLayers();
		if (current.length === 0) {
			return { success: false, error: 'No selection to match' };
		}
		
		const reference = current[0];
		const allLayers = await context.bridge.getAllLayers();
		
		// Find layers with similar properties
		const similar = allLayers.filter(layer => {
			return this.compareProperties(reference, layer, args.property);
		});
		
		await context.bridge.setSelection(similar.map(l => l.id));
		return {
			success: true,
			selection: similar.map(l => l.id),
			count: similar.length
		};
	}
};
```

## **Phase 3: LLM Integration Layer (Week 3)**

### **3.1 Universal LLM Adapter**
```typescript
// llm/llm-adapter.ts
export class LLMAdapter {
	private llmType: 'local' | 'openai' | 'anthropic' | 'ollama';
	private config: LLMConfig;
	
	constructor(type: 'local' | 'openai' | 'anthropic' | 'ollama', config: LLMConfig) {
		this.llmType = type;
		this.config = config;
	}
	
	async generateToolCalls(
	prompt: string, 
	availableTools: ToolDefinition[],
	context: LLMContext
	): Promise<ToolCall[]> {
		
		switch (this.llmType) {
			case 'local':
			return this.generateWithLocalLLM(prompt, availableTools, context);
			
			case 'openai':
			return this.generateWithOpenAI(prompt, availableTools, context);
			
			case 'ollama':
			return this.generateWithOllama(prompt, availableTools, context);
			
			default:
			throw new Error(`LLM type ${this.llmType} not supported`);
		}
	}
	
	private async generateWithLocalLLM(
	prompt: string,
	availableTools: ToolDefinition[],
	context: LLMContext
	): Promise<ToolCall[]> {
		// Use WebLLM (web-llm npm package) or transformers.js
		// or llama.cpp compiled to WebAssembly
		
		const systemPrompt = this.buildSystemPrompt(availableTools, context);
		
		// Convert tools to function descriptions
		const toolDescriptions = availableTools.map(tool => 
		`${tool.name}: ${tool.description}\nParameters: ${JSON.stringify(tool.parameters)}`
		).join('\n\n');
		
		const fullPrompt = `
		${systemPrompt}
		
		Available tools:
		${toolDescriptions}
		
		Current canvas state:
		${context.canvasState}
		
		User request: ${prompt}
		
		Respond with a JSON array of tool calls:
		[{ "tool": "tool_name", "args": {...} }]
		`;
		
		// Use WebGPU/WebAssembly LLM inference
		const response = await this.inferLocalLLM(fullPrompt);
		return JSON.parse(response);
	}
	
	private async inferLocalLLM(prompt: string): Promise<string> {
		// Example using transformers.js (runs in browser)
		const { pipeline } = await import('@huggingface/transformers');
		
		const generator = await pipeline('text-generation', 'Qwen/Qwen2.5-3B-Instruct', {
			device: 'webgpu' // or 'cpu'
		});
		
		const output = await generator(prompt, {
			max_new_tokens: 500,
			temperature: 0.1,
			return_full_text: false
		});
		
		return output[0].generated_text;
	}
}
```

### **3.2 Local LLM with WebGPU**
```typescript
// llm/webgpu-llm.ts
export class WebGPUModel {
	private model: any;
	private tokenizer: any;
	
	async loadModel(modelName: string = 'Qwen/Qwen2.5-3B-Instruct'): Promise<void> {
		// Load model weights from IndexedDB cache or download
		const modelUrl = `https://huggingface.co/${modelName}/resolve/main/model.safetensors`;
		
		// Use ONNX Runtime Web for inference
		const { InferenceSession } = await import('onnxruntime-web');
		
		// Download and cache model
		const modelData = await this.downloadAndCacheModel(modelUrl);
		
		// Create inference session
		this.model = await InferenceSession.create(modelData, {
			executionProviders: ['webgpu', 'wasm'],
			graphOptimizationLevel: 'all'
		});
	}
	
	async generate(prompt: string, tools: any[]): Promise<string> {
		// Tokenize input
		const tokens = await this.tokenizer.encode(prompt);
		
		// Run inference
		const feeds = { input: new ort.Tensor('int64', tokens, [1, tokens.length]) };
		const results = await this.model.run(feeds);
		
		// Decode output
		const outputTokens = Array.from(results.output.data);
		return await this.tokenizer.decode(outputTokens);
	}
	
	private async downloadAndCacheModel(url: string): Promise<ArrayBuffer> {
		// Check IndexedDB cache first
		const cached = await this.getCachedModel(url);
		if (cached) return cached;
		
		// Download with progress
		const response = await fetch(url);
		const buffer = await response.arrayBuffer();
		
		// Cache in IndexedDB
		await this.cacheModel(url, buffer);
		
		return buffer;
	}
}
```

## **Phase 4: Main Application Orchestrator (Week 4)**

### **4.1 Main Application Controller**
```typescript
// app-controller.ts
export class DesignLibreAI {
	private toolWorker: Worker;
	private llmWorker: Worker;
	private stateManager: CanvasStateManager;
	private bridge: DesignLibreBridge;
	
	private toolCallbacks = new Map<string, (result: any) => void>();
	private currentSessionId: string = '';
	
	constructor() {
		// Initialize Web Workers
		this.toolWorker = new Worker('./workers/tool-worker.js', { type: 'module' });
		this.llmWorker = new Worker('./workers/llm-worker.js', { type: 'module' });
		
		this.stateManager = new CanvasStateManager();
		this.bridge = new DesignLibreBridge();
		
		this.setupMessageHandlers();
		this.setupBridgeEvents();
	}
	
	private setupMessageHandlers() {
		// Tool worker messages
		this.toolWorker.onmessage = (event) => {
			const { type, data, sessionId } = event.data;
			
			switch (type) {
				case 'tools-list':
				this.cacheTools(data.tools);
				break;
				
				case 'tool-progress':
				this.emit('tool-progress', data);
				break;
				
				case 'chain-complete':
				this.emit('chain-complete', data);
				this.resolveSession(sessionId, data);
				break;
			}
		};
		
		// LLM worker messages
		this.llmWorker.onmessage = (event) => {
			const { type, data, sessionId } = event.data;
			
			if (type === 'tool-calls-generated') {
				// Execute the tool chain
				this.toolWorker.postMessage({
					type: 'execute-chain',
					data: { tools: data.tools },
					sessionId
				});
			}
		};
	}
	
	async processNaturalLanguage(request: string): Promise<SessionResult> {
		const sessionId = this.generateSessionId();
		
		// Get current canvas state
		const canvasState = await this.stateManager.getStateSummary();
		
		// Get available tools
		const tools = await this.getAvailableTools();
		
		// Send to LLM worker for tool call generation
		this.llmWorker.postMessage({
			type: 'generate-tool-calls',
			data: {
				prompt: request,
				tools,
				canvasState
			},
			sessionId
		});
		
		// Return promise that resolves when chain completes
		return new Promise((resolve) => {
			this.toolCallbacks.set(sessionId, resolve);
		});
	}
	
	async executeDirectToolCall(toolName: string, args: any): Promise<ToolResult> {
		return new Promise((resolve, reject) => {
			const sessionId = this.generateSessionId();
			
			this.toolCallbacks.set(sessionId, resolve);
			
			this.toolWorker.postMessage({
				type: 'execute-tool',
				data: { tool: toolName, args },
				sessionId
			});
		});
	}
	
	// Quick actions menu (common tool chains)
	async quickAction(action: QuickAction, targetIds?: string[]): Promise<void> {
		const presets = {
			'clean-up-layers': [
			{ tool: 'select_all', args: {} },
			{ tool: 'auto_rename_layers', args: {} },
			{ tool: 'sort_layers_alphabetically', args: {} },
			{ tool: 'remove_hidden_layers', args: {} }
			],
			'create-button': [
			{ tool: 'create_rectangle', args: { width: 120, height: 48 } },
			{ tool: 'set_corner_radius', args: { radius: 8 } },
			{ tool: 'set_fill_color', args: { color: '#3B82F6' } },
			{ tool: 'create_text', args: { text: 'Button', fontSize: 16 } },
			{ tool: 'align_center_h', args: {} },
			{ tool: 'align_center_v', args: {} },
			{ tool: 'group_layers', args: { name: 'Button' } }
			]
		};
		
		const chain = presets[action];
		if (chain) {
			await this.executeToolChain(chain);
		}
	}
}
```

### **4.2 Browser Storage & Caching**
```typescript
// storage/browser-storage.ts
export class BrowserStorage {
	private db: IDBDatabase;
	
	async initialize(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open('DesignLibreAI', 3);
			
			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				
				if (!db.objectStoreNames.contains('tools')) {
					db.createObjectStore('tools', { keyPath: 'id' });
				}
				
				if (!db.objectStoreNames.contains('llm-cache')) {
					const store = db.createObjectStore('llm-cache', { keyPath: 'key' });
					store.createIndex('timestamp', 'timestamp');
				}
				
				if (!db.objectStoreNames.contains('model-weights')) {
					db.createObjectStore('model-weights', { keyPath: 'modelName' });
				}
			};
			
			request.onsuccess = (event) => {
				this.db = (event.target as IDBOpenDBRequest).result;
				resolve();
			};
			
			request.onerror = reject;
		});
	}
	
	async cacheLLMResponse(prompt: string, response: any): Promise<void> {
		const key = await this.hashString(prompt);
		const transaction = this.db.transaction(['llm-cache'], 'readwrite');
		const store = transaction.objectStore('llm-cache');
		
		await store.put({
			key,
			response,
			timestamp: Date.now(),
			promptHash: key
		});
		
		// Clean old cache entries (keep last 1000)
		await this.cleanOldCache();
	}
	
	async getCachedLLMResponse(prompt: string): Promise<any> {
		const key = await this.hashString(prompt);
		const transaction = this.db.transaction(['llm-cache'], 'readonly');
		const store = transaction.objectStore('llm-cache');
		
		return new Promise((resolve) => {
			const request = store.get(key);
			request.onsuccess = () => resolve(request.result?.response);
			request.onerror = () => resolve(null);
		});
	}
	
	async cacheModelWeights(modelName: string, weights: ArrayBuffer): Promise<void> {
		const transaction = this.db.transaction(['model-weights'], 'readwrite');
		const store = transaction.objectStore('model-weights');
		
		await store.put({
			modelName,
			weights,
			timestamp: Date.now()
		});
	}
}
```

## **Phase 5: UI Integration & Developer Tools (Week 5)**

### **5.1 Chat Interface Component**
```typescript
// ui/chat-interface.ts
export class ChatInterface extends HTMLElement {
	private messages: ChatMessage[] = [];
	private input: HTMLTextAreaElement;
	private messagesContainer: HTMLElement;
	private ai: DesignLibreAI;
	
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.ai = new DesignLibreAI();
		this.render();
	}
	
	render() {
		this.shadowRoot!.innerHTML = `
		<style>
		:host {
			display: block;
			font-family: -apple-system, BlinkMacSystemFont, sans-serif;
		}
		
		.chat-container {
			display: flex;
			flex-direction: column;
			height: 500px;
			border: 1px solid #e5e7eb;
			border-radius: 8px;
			overflow: hidden;
		}
		
		.messages {
			flex: 1;
			overflow-y: auto;
			padding: 16px;
			background: #f9fafb;
		}
		
		.message {
			margin-bottom: 12px;
			padding: 8px 12px;
			border-radius: 6px;
			max-width: 80%;
		}
		
		.user-message {
			background: #3b82f6;
			color: white;
			margin-left: auto;
		}
		
		.ai-message {
			background: white;
			border: 1px solid #e5e7eb;
			margin-right: auto;
		}
		
		.tool-call {
			background: #fef3c7;
			border-left: 3px solid #f59e0b;
			padding: 8px;
			margin: 4px 0;
			font-family: monospace;
			font-size: 12px;
		}
		
		.input-area {
			display: flex;
			border-top: 1px solid #e5e7eb;
			background: white;
		}
		
		textarea {
			flex: 1;
			border: none;
			padding: 12px;
			font-size: 14px;
			resize: none;
			outline: none;
		}
		
		button {
			background: #3b82f6;
			color: white;
			border: none;
			padding: 0 20px;
			cursor: pointer;
		}
		</style>
		
		<div class="chat-container">
		<div class="messages" id="messages"></div>
		<div class="input-area">
		<textarea 
		id="input" 
		placeholder="What would you like to design? (e.g., 'Create a login form with email and password fields')"
		rows="2"
		></textarea>
		<button id="send">Send</button>
		</div>
		</div>
		`;
		
		this.input = this.shadowRoot!.getElementById('input') as HTMLTextAreaElement;
		this.messagesContainer = this.shadowRoot!.getElementById('messages')!;
		
		this.setupEventListeners();
	}
	
	private async handleSend() {
		const message = this.input.value.trim();
		if (!message) return;
		
		// Add user message
		this.addMessage('user', message);
		this.input.value = '';
		
		// Show thinking indicator
		this.addMessage('ai', 'Thinking...', true);
		
		try {
			// Process with AI
			const result = await this.ai.processNaturalLanguage(message);
			
			// Update AI message with result
			this.updateLastMessage(`
			${result.summary}
			
			${result.toolsExecuted.map(t => `
				<div class="tool-call">
				✓ ${t.tool}: ${t.result}
				</div>
				`).join('')}
			`);
			
		} catch (error) {
			this.updateLastMessage(`Error: ${error.message}`);
		}
	}
	
	private addMessage(role: 'user' | 'ai', content: string, isTemp = false) {
		const message: ChatMessage = { role, content, timestamp: Date.now(), isTemp };
		this.messages.push(message);
		this.renderMessages();
	}
}
```

### **5.2 Tool Palette & Quick Actions**
```typescript
// ui/tool-palette.ts
export class ToolPalette extends HTMLElement {
	private toolsByCategory: Map<ToolCategory, ToolDefinition[]> = new Map();
	private ai: DesignLibreAI;
	
	constructor() {
		super();
		this.ai = new DesignLibreAI();
		this.loadTools();
	}
	
	async loadTools() {
		// Fetch tools from worker
		const tools = await this.ai.getAvailableTools();
		
		// Organize by category
		tools.forEach(tool => {
			if (!this.toolsByCategory.has(tool.category)) {
				this.toolsByCategory.set(tool.category, []);
			}
			this.toolsByCategory.get(tool.category)!.push(tool);
		});
		
		this.render();
	}
	
	render() {
		this.innerHTML = `
		<style>
		.palette {
			display: flex;
			flex-direction: column;
			gap: 8px;
			padding: 12px;
			background: white;
			border-right: 1px solid #e5e7eb;
			height: 100%;
		}
		
		.category {
			margin-bottom: 12px;
		}
		
		.category-header {
			font-weight: 600;
			color: #4b5563;
			margin-bottom: 4px;
			font-size: 12px;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
		
		.tool-button {
			display: block;
			width: 100%;
			text-align: left;
			padding: 6px 8px;
			border: none;
			background: transparent;
			border-radius: 4px;
			font-size: 13px;
			cursor: pointer;
			color: #374151;
		}
		
		.tool-button:hover {
			background: #f3f4f6;
		}
		
		.tool-button:active {
			background: #e5e7eb;
		}
		
		.quick-actions {
			margin-top: auto;
			padding-top: 16px;
			border-top: 1px solid #e5e7eb;
		}
		
		.quick-action {
			background: #3b82f6;
			color: white;
			border: none;
			padding: 8px 12px;
			border-radius: 6px;
			cursor: pointer;
			font-size: 13px;
			width: 100%;
			margin-bottom: 8px;
		}
		</style>
		
		<div class="palette">
		${Array.from(this.toolsByCategory.entries()).map(([category, tools]) => `
			<div class="category">
			<div class="category-header">${category}</div>
			${tools.slice(0, 5).map(tool => `
				<button class="tool-button" data-tool="${tool.name}">
				${tool.name.replace(/_/g, ' ')}
				</button>
				`).join('')}
			</div>
			`).join('')}
		
		<div class="quick-actions">
		<button class="quick-action" data-action="clean-up-layers">
		🧹 Clean Up Layers
		</button>
		<button class="quick-action" data-action="create-button">
		🎨 Create Button
		</button>
		<button class="quick-action" data-action="export-assets">
		📤 Export Assets
		</button>
		</div>
		</div>
		`;
		
		this.setupEventListeners();
	}
	
	private setupEventListeners() {
		// Tool buttons
		this.querySelectorAll('.tool-button').forEach(button => {
			button.addEventListener('click', async (e) => {
				const toolName = (e.target as HTMLElement).dataset.tool!;
				await this.ai.executeDirectToolCall(toolName, {});
			});
		});
		
		// Quick actions
		this.querySelectorAll('.quick-action').forEach(button => {
			button.addEventListener('click', async (e) => {
				const action = (e.target as HTMLElement).dataset.action! as QuickAction;
				await this.ai.quickAction(action);
			});
		});
	}
}
```

## **Deployment & Build Process**

### **Build with Vite (vite.config.ts)**
```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	build: {
		target: 'es2022',
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				'tool-worker': resolve(__dirname, 'src/workers/tool-worker.ts'),
				'llm-worker': resolve(__dirname, 'src/workers/llm-worker.ts')
			},
			output: {
				entryFileNames: (chunkInfo) => {
					return chunkInfo.name === 'tool-worker' || chunkInfo.name === 'llm-worker'
					? 'workers/[name].js'
					: 'assets/[name]-[hash].js';
				}
			}
		}
	},
	optimizeDeps: {
		exclude: ['@huggingface/transformers', 'onnxruntime-web']
	},
	worker: {
		format: 'es'
	}
});
```

### **Package.json Dependencies**
```json
{
	"name": "designlibre-ai",
	"type": "module",
	"dependencies": {
		"@huggingface/transformers": "^3.0.0",
		"onnxruntime-web": "^1.17.0",
		"idb": "^8.0.0",
		"uuid": "^9.0.0"
	},
	"devDependencies": {
		"typescript": "^5.0.0",
		"vite": "^5.0.0",
		"@types/web": "^0.0.100"
	}
}
```

## **Local LLM Options for Browser**

1. **WebLLM** (MLC LLM) - Runs 3B models in browser
2. **Transformers.js** - Hugging Face models via ONNX
3. **llama.cpp compiled to WebAssembly**
4. **Ollama with CORS proxy** (if local network)

## **Key Advantages of This Approach**

1. **Zero Server Dependencies** - Runs entirely in browser
2. **Offline Capable** - Tools work without internet
3. **Privacy** - All data stays in browser
4. **Performance** - WebGPU acceleration for LLMs
5. **Portability** - Single HTML file deployment possible


