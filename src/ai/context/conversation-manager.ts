/**
 * Conversation Manager
 *
 * Manages the conversation history with the AI.
 */

import type { AIMessage } from '../providers/ai-provider';

/**
 * Conversation entry with metadata
 */
export interface ConversationEntry {
  message: AIMessage;
  /** Whether the message included a screenshot */
  hasScreenshot: boolean;
  /** Timestamp */
  timestamp: number;
  /** Token estimate (rough) */
  tokenEstimate: number;
}

/**
 * Conversation manager options
 */
export interface ConversationManagerOptions {
  /** Maximum history length */
  maxHistory?: number;
  /** Maximum total tokens to keep */
  maxTokens?: number;
}

/**
 * Conversation Manager
 */
export class ConversationManager {
  private history: ConversationEntry[] = [];
  private options: Required<ConversationManagerOptions>;

  constructor(options: ConversationManagerOptions = {}) {
    this.options = {
      maxHistory: options.maxHistory ?? 50,
      maxTokens: options.maxTokens ?? 100000,
    };
  }

  /**
   * Add a message to the conversation.
   */
  addMessage(message: AIMessage, hasScreenshot = false): void {
    const entry: ConversationEntry = {
      message,
      hasScreenshot,
      timestamp: Date.now(),
      tokenEstimate: this.estimateTokens(message, hasScreenshot),
    };

    this.history.push(entry);
    this.prune();
  }

  /**
   * Add a user message.
   */
  addUserMessage(content: string, hasScreenshot = false): void {
    this.addMessage({ role: 'user', content }, hasScreenshot);
  }

  /**
   * Add an assistant message.
   */
  addAssistantMessage(content: string): void {
    this.addMessage({ role: 'assistant', content }, false);
  }

  /**
   * Get messages for sending to the AI.
   */
  getMessages(): AIMessage[] {
    return this.history.map((entry) => entry.message);
  }

  /**
   * Get the conversation history.
   */
  getHistory(): readonly ConversationEntry[] {
    return this.history;
  }

  /**
   * Get the last N messages.
   */
  getLastMessages(count: number): AIMessage[] {
    return this.history.slice(-count).map((entry) => entry.message);
  }

  /**
   * Clear the conversation history.
   */
  clear(): void {
    this.history = [];
  }

  /**
   * Get the total token estimate.
   */
  getTotalTokens(): number {
    return this.history.reduce((sum, entry) => sum + entry.tokenEstimate, 0);
  }

  /**
   * Get the message count.
   */
  getMessageCount(): number {
    return this.history.length;
  }

  /**
   * Prune old messages to stay within limits.
   */
  private prune(): void {
    // Prune by count
    while (this.history.length > this.options.maxHistory) {
      this.history.shift();
    }

    // Prune by tokens (remove oldest messages first)
    while (this.getTotalTokens() > this.options.maxTokens && this.history.length > 2) {
      // Keep at least the last 2 messages
      this.history.shift();
    }
  }

  /**
   * Estimate tokens for a message.
   * This is a rough estimate - actual tokenization varies by model.
   */
  private estimateTokens(message: AIMessage, hasScreenshot: boolean): number {
    let tokens = 0;

    // Text tokens (rough: ~4 chars per token)
    if (typeof message.content === 'string') {
      tokens += Math.ceil(message.content.length / 4);
    } else {
      for (const part of message.content) {
        if (part.type === 'text') {
          tokens += Math.ceil(part.text.length / 4);
        }
      }
    }

    // Screenshots use a lot of tokens (~1000-2000 depending on size)
    if (hasScreenshot) {
      tokens += 1500;
    }

    // Overhead for message structure
    tokens += 10;

    return tokens;
  }

  /**
   * Export conversation as JSON.
   */
  export(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * Import conversation from JSON.
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data)) {
        this.history = data.map((entry) => ({
          message: entry.message,
          hasScreenshot: entry.hasScreenshot ?? false,
          timestamp: entry.timestamp ?? Date.now(),
          tokenEstimate: entry.tokenEstimate ?? this.estimateTokens(entry.message, entry.hasScreenshot),
        }));
      }
    } catch (error) {
      console.error('Failed to import conversation:', error);
    }
  }

  /**
   * Get a summary of the conversation for context.
   */
  getSummary(): string {
    const count = this.history.length;
    const tokens = this.getTotalTokens();
    const screenshotCount = this.history.filter((e) => e.hasScreenshot).length;

    return `Conversation: ${count} messages, ~${tokens} tokens, ${screenshotCount} screenshots`;
  }
}

/**
 * Create a conversation manager instance.
 */
export function createConversationManager(options?: ConversationManagerOptions): ConversationManager {
  return new ConversationManager(options);
}
