/**
 * Text Tool Parser
 *
 * Parses JSON tool calls from AI text responses.
 * This is needed for local models (Ollama, llama.cpp) that don't support
 * native function calling and instead output JSON in their text response.
 */

import type { AIToolCall } from '../providers/ai-provider';

/**
 * Pattern to match JSON code blocks with tool calls.
 * Matches:
 * - ```json { "tool": "...", ... } ```
 * - { "tool": "...", ... }
 * - { "name": "...", "parameters": ... }
 */
const JSON_BLOCK_PATTERN = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/gi;
const INLINE_JSON_PATTERN = /\{[^{}]*"(?:tool|name)"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/gi;

/**
 * Tool call formats that local models might output
 */
interface TextToolCall {
  // Format 1: { "tool": "create_rectangle", "parameters": { ... } }
  tool?: string;
  parameters?: Record<string, unknown>;

  // Format 2: { "name": "create_rectangle", "arguments": { ... } }
  name?: string;
  arguments?: Record<string, unknown>;

  // Format 3: { "function": "create_rectangle", "args": { ... } }
  function?: string;
  args?: Record<string, unknown>;

  // Format 4: Direct parameters at root level
  // { "tool": "create_rectangle", "x": 100, "y": 100, ... }
  [key: string]: unknown;
}

/**
 * Parse JSON tool calls from text response.
 * Returns an array of AIToolCall objects that can be executed.
 */
export function parseTextToolCalls(text: string): AIToolCall[] {
  const toolCalls: AIToolCall[] = [];
  const seenCalls = new Set<string>(); // Dedupe by stringified call

  // First, try to find JSON in code blocks
  const codeBlockMatches = text.matchAll(JSON_BLOCK_PATTERN);
  for (const match of codeBlockMatches) {
    const jsonStr = match[1];
    if (!jsonStr) continue;
    const calls = parseJsonToolCall(jsonStr);
    for (const call of calls) {
      const key = `${call.name}:${JSON.stringify(call.arguments)}`;
      if (!seenCalls.has(key)) {
        seenCalls.add(key);
        toolCalls.push(call);
      }
    }
  }

  // If no code blocks found, try to find inline JSON
  if (toolCalls.length === 0) {
    const inlineMatches = text.matchAll(INLINE_JSON_PATTERN);
    for (const match of inlineMatches) {
      const jsonStr = match[0];
      const calls = parseJsonToolCall(jsonStr);
      for (const call of calls) {
        const key = `${call.name}:${JSON.stringify(call.arguments)}`;
        if (!seenCalls.has(key)) {
          seenCalls.add(key);
          toolCalls.push(call);
        }
      }
    }
  }

  return toolCalls;
}

/**
 * Parse a single JSON string into tool calls.
 */
function parseJsonToolCall(jsonStr: string): AIToolCall[] {
  try {
    const parsed = JSON.parse(jsonStr) as TextToolCall;
    const call = normalizeToolCall(parsed);
    if (call) {
      return [call];
    }
  } catch {
    // Try to extract multiple JSON objects if the string contains several
    const objects = extractJsonObjects(jsonStr);
    const calls: AIToolCall[] = [];
    for (const obj of objects) {
      try {
        const parsed = JSON.parse(obj) as TextToolCall;
        const call = normalizeToolCall(parsed);
        if (call) {
          calls.push(call);
        }
      } catch {
        // Ignore parse errors
      }
    }
    return calls;
  }
  return [];
}

/**
 * Normalize different tool call formats to AIToolCall.
 */
function normalizeToolCall(parsed: TextToolCall): AIToolCall | null {
  // Get the tool name from various possible fields
  const name = parsed.tool || parsed.name || parsed.function;
  if (!name || typeof name !== 'string') {
    return null;
  }

  // Get parameters from various possible fields
  let args: Record<string, unknown> = {};

  if (parsed.parameters && typeof parsed.parameters === 'object') {
    args = parsed.parameters;
  } else if (parsed.arguments && typeof parsed.arguments === 'object') {
    args = parsed.arguments;
  } else if (parsed.args && typeof parsed.args === 'object') {
    args = parsed.args;
  } else {
    // Parameters might be at the root level
    // Extract all keys except the tool name key
    const { tool, name: _, function: __, parameters, arguments: ___, args: ____, ...rest } = parsed;
    if (Object.keys(rest).length > 0) {
      args = rest as Record<string, unknown>;
    }
  }

  return {
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    arguments: args,
  };
}

/**
 * Extract individual JSON objects from a string that might contain multiple.
 */
function extractJsonObjects(str: string): string[] {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '{') {
      if (depth === 0) {
        start = i;
      }
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        objects.push(str.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return objects;
}

/**
 * Check if text contains potential tool calls.
 * Quick check to avoid expensive parsing when not needed.
 */
export function mayContainToolCalls(text: string): boolean {
  // Look for patterns that suggest JSON tool calls
  const hasJsonBlock = /```(?:json)?\s*\{/.test(text);
  const hasToolField = /"(?:tool|name|function)"\s*:\s*"/.test(text);
  return hasJsonBlock || hasToolField;
}
