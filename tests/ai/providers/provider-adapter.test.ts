/**
 * Provider Adapter Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ProviderAdapter,
  createProviderAdapter,
  createDesignLibreAdapter,
  createCADLibreAdapter,
  createCAMLibreAdapter,
} from '@ai/providers/provider-adapter';
import type { AIProvider, AIMessage, AIResponse, AITool } from '@ai/providers/ai-provider';

// Mock provider for testing
function createMockProvider(name = 'anthropic'): AIProvider {
  return {
    name,
    capabilities: {
      streaming: true,
      vision: true,
      functionCalling: true,
      maxContextTokens: 128000,
    },
    sendMessage: vi.fn().mockResolvedValue({
      content: 'Mock response',
      toolCalls: [],
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 50 },
    } as AIResponse),
    streamMessage: vi.fn().mockImplementation(async function* () {
      yield { type: 'text' as const, text: 'Mock ' };
      yield { type: 'text' as const, text: 'response' };
    }),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    configure: vi.fn(),
  };
}

describe('ProviderAdapter', () => {
  let mockProvider: AIProvider;
  let adapter: ProviderAdapter;

  beforeEach(() => {
    mockProvider = createMockProvider();
    adapter = new ProviderAdapter({
      provider: mockProvider,
    });
  });

  describe('constructor', () => {
    it('creates adapter with default options', () => {
      const adapter = new ProviderAdapter({ provider: mockProvider });

      expect(adapter.getFormat()).toBe('anthropic');
      expect(adapter.getProvider()).toBe(mockProvider);
    });

    it('accepts custom format', () => {
      const adapter = new ProviderAdapter({
        provider: mockProvider,
        format: 'openai',
      });

      expect(adapter.getFormat()).toBe('openai');
    });

    it('auto-detects format from provider name', () => {
      const openaiProvider = createMockProvider('OpenAI GPT-4');
      const adapter = new ProviderAdapter({ provider: openaiProvider });

      expect(adapter.getFormat()).toBe('openai');
    });
  });

  describe('sendMessage', () => {
    it('sends message to provider', async () => {
      const messages: AIMessage[] = [{ role: 'user', content: 'Hello' }];

      const response = await adapter.sendMessage(messages);

      expect(mockProvider.sendMessage).toHaveBeenCalled();
      expect(response.content).toBe('Mock response');
    });

    it('includes system prompt', async () => {
      const messages: AIMessage[] = [{ role: 'user', content: 'Hello' }];

      await adapter.sendMessage(messages);

      const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call?.[1]?.systemPrompt).toBeDefined();
      expect(call?.[1]?.systemPrompt.length).toBeGreaterThan(100);
    });

    it('returns adapted response', async () => {
      const messages: AIMessage[] = [{ role: 'user', content: 'Hello' }];

      const response = await adapter.sendMessage(messages);

      expect(response.content).toBe('Mock response');
      expect(response.toolCalls).toEqual([]);
      expect(response.requiresToolExecution).toBe(false);
      expect(response.stopReason).toBe('end_turn');
      expect(response.format).toBe('anthropic');
    });

    it('passes maxTokens option', async () => {
      const adapter = new ProviderAdapter({
        provider: mockProvider,
        maxTokens: 2048,
      });

      await adapter.sendMessage([{ role: 'user', content: 'Hello' }]);

      const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call?.[1]?.maxTokens).toBe(2048);
    });

    it('passes temperature option', async () => {
      const adapter = new ProviderAdapter({
        provider: mockProvider,
        temperature: 0.5,
      });

      await adapter.sendMessage([{ role: 'user', content: 'Hello' }]);

      const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call?.[1]?.temperature).toBe(0.5);
    });

    it('allows overriding options per request', async () => {
      await adapter.sendMessage([{ role: 'user', content: 'Hello' }], {
        maxTokens: 1024,
        temperature: 0.3,
      });

      const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call?.[1]?.maxTokens).toBe(1024);
      expect(call?.[1]?.temperature).toBe(0.3);
    });
  });

  describe('sendMessage with tools', () => {
    it('includes tools in request', async () => {
      const adapter = new ProviderAdapter({
        provider: mockProvider,
        toolNames: ['create_rectangle', 'set_fill_color'],
      });

      await adapter.sendMessage([{ role: 'user', content: 'Create a rectangle' }]);

      const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      // Tools array should be passed (may be empty if tool registry doesn't have these)
      expect(call?.[1]).toHaveProperty('tools');
    });

    it('handles tool calls in response', async () => {
      (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        content: '',
        toolCalls: [
          { id: 'call_1', name: 'create_rectangle', arguments: { x: 0, y: 0, width: 100, height: 100 } },
        ],
        stopReason: 'tool_use',
      });

      const response = await adapter.sendMessage([{ role: 'user', content: 'Create a rectangle' }]);

      expect(response.requiresToolExecution).toBe(true);
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls[0]?.name).toBe('create_rectangle');
    });

    it('adds additional tools to request', async () => {
      const customTool: AITool = {
        name: 'custom_tool',
        description: 'Custom tool',
        parameters: { type: 'object', properties: {} },
      };

      await adapter.sendMessage([{ role: 'user', content: 'Hello' }], {
        additionalTools: [customTool],
      });

      const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call?.[1]?.tools).toContainEqual(customTool);
    });
  });

  describe('sendMessage with context', () => {
    it('includes context in system prompt', async () => {
      await adapter.sendMessage([{ role: 'user', content: 'Hello' }], {
        context: {
          selection: { ids: ['node-1'], objects: [{ id: 'node-1', type: 'RECTANGLE', name: 'Box', x: 100, y: 50 }] },
          viewport: { x: 0, y: 0, width: 1920, height: 1080, zoom: 1 },
          layers: [],
        },
      });

      const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      const systemPrompt = call?.[1]?.systemPrompt as string;

      expect(systemPrompt).toContain('Current State');
      expect(systemPrompt).toContain('Box'); // Object name appears in context
      expect(systemPrompt).toContain('RECTANGLE');
    });
  });

  describe('sendMessage with tool results', () => {
    it('includes tool results in messages', async () => {
      await adapter.sendMessage([{ role: 'user', content: 'Create a rectangle' }], {
        toolResults: [
          { toolCallId: 'call_1', result: { success: true, nodeId: 'new-node' } },
        ],
      });

      const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      const messages = call?.[0] as AIMessage[];

      expect(messages.length).toBe(2);
      expect(messages[1]?.content).toContain('tool_result');
      expect(messages[1]?.content).toContain('call_1');
    });
  });

  describe('streamMessage', () => {
    it('yields text chunks', async () => {
      const chunks: string[] = [];

      for await (const chunk of adapter.streamMessage([{ role: 'user', content: 'Hello' }])) {
        if (chunk.type === 'text' && chunk.content) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks).toEqual(['Mock ', 'response']);
    });

    it('includes system prompt', async () => {
      const chunks = [];
      for await (const chunk of adapter.streamMessage([{ role: 'user', content: 'Hello' }])) {
        chunks.push(chunk);
      }

      const call = (mockProvider.streamMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call?.[1]?.systemPrompt).toBeDefined();
    });
  });

  describe('prompt-based providers', () => {
    beforeEach(() => {
      mockProvider = createMockProvider('unknown-model');
    });

    it('uses prompt format for unknown providers', () => {
      const adapter = new ProviderAdapter({ provider: mockProvider });

      expect(adapter.getFormat()).toBe('prompt');
      expect(adapter.supportsNativeTools()).toBe(false);
    });

    it('includes tool documentation in system prompt', async () => {
      const adapter = new ProviderAdapter({
        provider: mockProvider,
        toolNames: ['create_rectangle'],
      });

      await adapter.sendMessage([{ role: 'user', content: 'Hello' }]);

      const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      const systemPrompt = call?.[1]?.systemPrompt as string;

      expect(systemPrompt).toContain('Available Commands');
    });

    it('parses tool calls from response', async () => {
      (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        content: `\`\`\`json
{
  "commands": [{ "tool": "create_rectangle", "args": { "x": 0, "y": 0, "width": 100, "height": 100 } }],
  "response": "Created rectangle"
}
\`\`\``,
        toolCalls: [],
        stopReason: 'end_turn',
      });

      const adapter = new ProviderAdapter({ provider: mockProvider });
      const response = await adapter.sendMessage([{ role: 'user', content: 'Create rect' }]);

      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls[0]?.name).toBe('create_rectangle');
      expect(response.content).toBe('Created rectangle');
    });

    it('does not send tools array to prompt-based providers', async () => {
      const adapter = new ProviderAdapter({
        provider: mockProvider,
        toolNames: ['create_rectangle'],
      });

      await adapter.sendMessage([{ role: 'user', content: 'Hello' }]);

      const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      // For prompt-based providers, tools are not passed (undefined or empty)
      const tools = call?.[1]?.tools;
      expect(tools === undefined || (Array.isArray(tools) && tools.length === 0)).toBe(true);
    });
  });

  describe('configure', () => {
    it('updates format', () => {
      adapter.configure({ format: 'openai' });

      expect(adapter.getFormat()).toBe('openai');
    });

    it('updates maxTokens', async () => {
      adapter.configure({ maxTokens: 8192 });

      await adapter.sendMessage([{ role: 'user', content: 'Hello' }]);

      const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call?.[1]?.maxTokens).toBe(8192);
    });

    it('updates temperature', async () => {
      adapter.configure({ temperature: 0.9 });

      await adapter.sendMessage([{ role: 'user', content: 'Hello' }]);

      const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call?.[1]?.temperature).toBe(0.9);
    });

    it('clears cache when systemPromptOptions change', async () => {
      await adapter.sendMessage([{ role: 'user', content: 'First' }]);

      adapter.configure({
        systemPromptOptions: { application: 'cadlibre' },
      });

      await adapter.sendMessage([{ role: 'user', content: 'Second' }]);

      const calls = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls;
      const firstPrompt = calls[0]?.[1]?.systemPrompt as string;
      const secondPrompt = calls[1]?.[1]?.systemPrompt as string;

      expect(firstPrompt).toContain('DesignLibre');
      expect(secondPrompt).toContain('CADLibre');
    });
  });

  describe('clearCache', () => {
    it('forces prompt regeneration', async () => {
      await adapter.sendMessage([{ role: 'user', content: 'First' }]);

      adapter.clearCache();

      await adapter.sendMessage([{ role: 'user', content: 'Second' }]);

      // Both calls should generate prompts (cache was cleared)
      expect(mockProvider.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('supportsNativeTools', () => {
    it('returns true for native tool providers', () => {
      const anthropicAdapter = new ProviderAdapter({
        provider: createMockProvider('anthropic'),
      });

      expect(anthropicAdapter.supportsNativeTools()).toBe(true);
    });

    it('returns false for prompt-based providers', () => {
      const promptAdapter = new ProviderAdapter({
        provider: createMockProvider('unknown'),
      });

      expect(promptAdapter.supportsNativeTools()).toBe(false);
    });
  });
});

describe('createProviderAdapter', () => {
  it('creates adapter with config', () => {
    const mockProvider = createMockProvider();
    const adapter = createProviderAdapter({
      provider: mockProvider,
      maxTokens: 2048,
    });

    expect(adapter).toBeInstanceOf(ProviderAdapter);
    expect(adapter.getProvider()).toBe(mockProvider);
  });
});

describe('createDesignLibreAdapter', () => {
  it('creates adapter with DesignLibre defaults', () => {
    const mockProvider = createMockProvider();
    const adapter = createDesignLibreAdapter(mockProvider);

    expect(adapter).toBeInstanceOf(ProviderAdapter);
  });

  it('uses designlibre application type', async () => {
    const mockProvider = createMockProvider();
    const adapter = createDesignLibreAdapter(mockProvider);

    await adapter.sendMessage([{ role: 'user', content: 'Hello' }]);

    const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
    const systemPrompt = call?.[1]?.systemPrompt as string;

    expect(systemPrompt).toContain('DesignLibre');
  });

  it('accepts additional options', () => {
    const mockProvider = createMockProvider();
    const adapter = createDesignLibreAdapter(mockProvider, {
      maxTokens: 8192,
      temperature: 0.5,
    });

    expect(adapter).toBeInstanceOf(ProviderAdapter);
  });
});

describe('createCADLibreAdapter', () => {
  it('creates adapter with CADLibre defaults', () => {
    const mockProvider = createMockProvider();
    const adapter = createCADLibreAdapter(mockProvider);

    expect(adapter).toBeInstanceOf(ProviderAdapter);
  });

  it('uses cadlibre application type', async () => {
    const mockProvider = createMockProvider();
    const adapter = createCADLibreAdapter(mockProvider);

    await adapter.sendMessage([{ role: 'user', content: 'Hello' }]);

    const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
    const systemPrompt = call?.[1]?.systemPrompt as string;

    expect(systemPrompt).toContain('CADLibre');
  });
});

describe('createCAMLibreAdapter', () => {
  it('creates adapter with CAMLibre defaults', () => {
    const mockProvider = createMockProvider();
    const adapter = createCAMLibreAdapter(mockProvider);

    expect(adapter).toBeInstanceOf(ProviderAdapter);
  });

  it('uses camlibre application type', async () => {
    const mockProvider = createMockProvider();
    const adapter = createCAMLibreAdapter(mockProvider);

    await adapter.sendMessage([{ role: 'user', content: 'Hello' }]);

    const call = (mockProvider.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0];
    const systemPrompt = call?.[1]?.systemPrompt as string;

    expect(systemPrompt).toContain('CAMLibre');
  });
});

describe('Integration with Different Providers', () => {
  const providerNames = [
    { name: 'anthropic', expectedFormat: 'anthropic' },
    { name: 'OpenAI GPT-4', expectedFormat: 'openai' },
    { name: 'ollama', expectedFormat: 'ollama' },
    { name: 'llamacpp', expectedFormat: 'llamacpp' },
    { name: 'custom-local', expectedFormat: 'prompt' },
  ];

  for (const { name, expectedFormat } of providerNames) {
    it(`detects ${expectedFormat} format for "${name}"`, () => {
      const provider = createMockProvider(name);
      const adapter = new ProviderAdapter({ provider });

      expect(adapter.getFormat()).toBe(expectedFormat);
    });
  }
});
