/**
 * AI Chat Panel
 *
 * Collapsible side panel for AI chat interface.
 */

import type { AIController } from '../ai-controller';
import type { AIStreamChunk } from '../providers/ai-provider';
import { createMarkdownRenderer } from './components/markdown-renderer';
import { showAISettingsPanel } from './ai-settings-panel';
import { createMessageInput, type MessageInput, type MessageAttachment } from './components/message-input';

/**
 * AI Panel options
 */
export interface AIPanelOptions {
  /** Initial width */
  width?: number | undefined;
  /** Initially collapsed */
  collapsed?: boolean | undefined;
  /** Position */
  position?: 'left' | 'right' | undefined;
  /** Callback when close button is clicked */
  onClose?: (() => void) | undefined;
}

/**
 * Required AI Panel options (internal)
 */
interface RequiredAIPanelOptions {
  width: number;
  collapsed: boolean;
  position: 'left' | 'right';
  onClose: (() => void) | null;
}

/**
 * Message in the chat
 */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  hasScreenshot?: boolean | undefined;
  attachments?: MessageAttachment[] | undefined;
}

/**
 * SVG Icons
 */
const ICONS = {
  send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>`,
  screenshot: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>`,
  collapse: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
  </svg>`,
  expand: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
  </svg>`,
  ai: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>`,
  clear: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>`,
  settings: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,
  stop: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>`,
  close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,
};

/**
 * AI Chat Panel
 */
export class AIPanel {
  private aiController: AIController;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private messagesContainer: HTMLElement | null = null;
  private messageInput: MessageInput | null = null;
  private options: RequiredAIPanelOptions;
  private collapsed = false;
  private messages: ChatMessage[] = [];
  private isStreaming = false;
  private currentStreamContent = '';
  private streamingMessageIndex: number | null = null;
  private currentAttachments: MessageAttachment[] = [];
  private currentHasScreenshot = false;
  private unsubscribers: Array<() => void> = [];

  constructor(
    aiController: AIController,
    container: HTMLElement,
    options: AIPanelOptions = {}
  ) {
    this.aiController = aiController;
    this.container = container;
    this.options = {
      width: options.width ?? 320,
      collapsed: options.collapsed ?? false,
      position: options.position ?? 'right',
      onClose: options.onClose ?? null,
    };
    this.collapsed = this.options.collapsed;

    this.setup();
  }

  private setup(): void {
    this.element = document.createElement('div');
    this.element.className = 'designlibre-ai-panel';
    this.updateStyles();
    this.render();
    this.container.appendChild(this.element);

    // Subscribe to AI events
    const unsubChunk = this.aiController.on('ai:stream:chunk', ({ chunk }) => {
      this.handleStreamChunk(chunk);
    });
    this.unsubscribers.push(unsubChunk);

    const unsubComplete = this.aiController.on('ai:message:complete', () => {
      this.handleMessageComplete();
    });
    this.unsubscribers.push(unsubComplete);

    const unsubError = this.aiController.on('ai:message:error', ({ error }) => {
      this.handleError(error);
    });
    this.unsubscribers.push(unsubError);

    const unsubStatus = this.aiController.on('ai:status:change', ({ status }) => {
      this.updateStatusIndicator(status);
    });
    this.unsubscribers.push(unsubStatus);

    // Handle tool execution - replace raw JSON with friendly message
    const unsubToolStart = this.aiController.on('ai:tool:start', ({ toolCall }) => {
      this.handleToolStart(toolCall);
    });
    this.unsubscribers.push(unsubToolStart);

    const unsubToolComplete = this.aiController.on('ai:tool:complete', ({ toolCall, result }) => {
      this.handleToolComplete(toolCall, result);
    });
    this.unsubscribers.push(unsubToolComplete);
  }

  private updateStyles(): void {
    if (!this.element) return;

    const isRight = this.options.position === 'right';
    this.element.className = `designlibre-ai-panel absolute top-0 h-full bg-surface flex flex-col text-xs text-content z-100 transition-[width] duration-200 ${isRight ? 'right-0 border-l' : 'left-0 border-r'} border-border`;
    this.element.style.width = this.collapsed ? '48px' : `${this.options.width}px`;
  }

  private render(): void {
    if (!this.element) return;
    this.element.innerHTML = '';

    if (this.collapsed) {
      this.renderCollapsedState();
    } else {
      this.renderExpandedState();
    }
  }

  private renderCollapsedState(): void {
    if (!this.element) return;

    const expandBtn = document.createElement('button');
    expandBtn.className = 'designlibre-ai-expand-btn w-full h-12 border-none bg-transparent cursor-pointer flex items-center justify-center text-accent hover:bg-surface-secondary';
    expandBtn.innerHTML = ICONS.ai;
    expandBtn.title = 'Open AI Chat';
    expandBtn.addEventListener('click', () => this.toggleCollapse());

    this.element.appendChild(expandBtn);
  }

  private renderExpandedState(): void {
    if (!this.element) return;

    // Header
    this.element.appendChild(this.createHeader());

    // Messages area
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'designlibre-ai-messages flex-1 overflow-y-auto p-3 flex flex-col gap-3';
    this.renderMessages();
    this.element.appendChild(this.messagesContainer);

    // Input area
    this.element.appendChild(this.createInputArea());
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'designlibre-ai-header flex items-center justify-between p-3 border-b border-border bg-surface-tertiary';

    // Title with AI icon
    const titleArea = document.createElement('div');
    titleArea.className = 'flex items-center gap-2';

    const icon = document.createElement('span');
    icon.innerHTML = ICONS.ai;
    icon.className = 'flex text-accent';
    titleArea.appendChild(icon);

    const title = document.createElement('span');
    title.textContent = 'AI Assistant';
    title.className = 'font-semibold text-[13px]';
    titleArea.appendChild(title);

    // Status indicator
    const status = document.createElement('span');
    status.className = 'ai-status-indicator w-2 h-2 rounded-full bg-content-muted ml-2';
    titleArea.appendChild(status);

    header.appendChild(titleArea);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'flex gap-1';

    // Provider selector
    const providerSelect = document.createElement('select');
    providerSelect.className = 'py-1 px-2 bg-surface-secondary border border-border rounded text-content text-[11px] cursor-pointer';
    const providers = this.aiController.getProviderNames();
    const activeProvider = this.aiController.getProviderName();
    for (const name of providers) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      option.selected = name === activeProvider;
      providerSelect.appendChild(option);
    }
    providerSelect.addEventListener('change', () => {
      this.aiController.setProvider(providerSelect.value);
    });
    actions.appendChild(providerSelect);

    // Settings button
    const settingsBtn = this.createIconButton(ICONS.settings, 'AI Settings', () => {
      showAISettingsPanel({
        onSave: () => {
          // Refresh provider selector
          this.render();
        },
      });
    });
    actions.appendChild(settingsBtn);

    // Clear button
    const clearBtn = this.createIconButton(ICONS.clear, 'Clear conversation', () => {
      this.messages = [];
      this.aiController.clearConversation();
      this.renderMessages();
    });
    actions.appendChild(clearBtn);

    // Close button (only if onClose callback provided)
    if (this.options.onClose) {
      const closeBtn = this.createIconButton(ICONS.close, 'Close panel', () => {
        this.options.onClose?.();
      });
      actions.appendChild(closeBtn);
    }

    header.appendChild(actions);

    return header;
  }

  private createInputArea(): HTMLElement {
    const inputArea = document.createElement('div');
    inputArea.className = 'designlibre-ai-input-area';

    // Create enhanced message input
    this.messageInput = createMessageInput(
      inputArea,
      {
        placeholder: 'Ask the AI to help with your design...',
        maxHeight: 150,
        minHeight: 60,
        enableAttachments: true,
        enableScreenshot: true,
        showCharCount: true,
      },
      {
        onSend: (message, attachments, includeScreenshot) => {
          this.currentAttachments = attachments;
          this.currentHasScreenshot = includeScreenshot;
          this.sendMessage(message);
        },
        onCancel: () => {
          this.cancelStreaming();
        },
        onChange: (message) => {
          // Could be used for typing indicators or slash commands
          if (message.startsWith('/')) {
            // Trigger command palette if needed
          }
        },
      }
    );

    return inputArea;
  }

  private cancelStreaming(): void {
    if (this.isStreaming) {
      // The AI controller should support cancellation
      // For now, just update the UI state
      this.isStreaming = false;
      this.streamingMessageIndex = null;
      this.messageInput?.setStreaming(false);
      this.currentStreamContent = '';
    }
  }

  private renderMessages(): void {
    if (!this.messagesContainer) return;
    this.messagesContainer.innerHTML = '';

    if (this.messages.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-center py-10 px-5 text-content-muted';
      empty.innerHTML = `
        <div class="text-[32px] mb-3">${ICONS.ai}</div>
        <div class="text-sm font-medium mb-1">AI Design Assistant</div>
        <div class="text-xs">Ask me to create shapes, modify elements, or help with your design.</div>
      `;
      this.messagesContainer.appendChild(empty);
      return;
    }

    for (const msg of this.messages) {
      this.messagesContainer.appendChild(this.createMessageBubble(msg));
    }

    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private createMessageBubble(message: ChatMessage): HTMLElement {
    const bubble = document.createElement('div');
    const isUser = message.role === 'user';
    bubble.className = `message-bubble ${message.role} max-w-[85%] py-2.5 px-3.5 rounded-xl break-words ${isUser ? 'bg-accent text-white self-end' : 'bg-surface-secondary text-content self-start'}`;

    // Attachments preview (for user messages with images)
    if (isUser && message.attachments && message.attachments.length > 0) {
      const attachmentsRow = document.createElement('div');
      attachmentsRow.className = 'flex flex-wrap gap-1.5 mb-2';

      for (const attachment of message.attachments) {
        if (attachment.type === 'image' && attachment.data) {
          const img = document.createElement('img');
          img.src = `data:${attachment.mimeType};base64,${attachment.data}`;
          img.alt = attachment.name;
          img.className = 'max-w-25 max-h-20 rounded-md object-cover opacity-90';
          attachmentsRow.appendChild(img);
        }
      }

      bubble.appendChild(attachmentsRow);
    }

    // Content
    const content = document.createElement('div');
    content.className = 'message-content text-xs leading-normal';

    if (isUser) {
      // User messages: simple text
      content.style.whiteSpace = 'pre-wrap';
      content.textContent = message.content;
    } else {
      // Assistant messages: render markdown
      const renderer = createMarkdownRenderer(content, {
        codeLineNumbers: false,
        codeCollapsible: true,
      });
      renderer.render(message.content);
    }

    bubble.appendChild(content);

    // Metadata
    const meta = document.createElement('div');
    meta.className = `text-[10px] opacity-70 mt-1 ${isUser ? 'text-right' : 'text-left'}`;
    const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const extras: string[] = [];
    if (message.hasScreenshot) extras.push('screenshot');
    if (message.attachments && message.attachments.length > 0) {
      extras.push(`${message.attachments.length} file${message.attachments.length > 1 ? 's' : ''}`);
    }
    meta.textContent = time + (extras.length > 0 ? ` (${extras.join(', ')})` : '');
    bubble.appendChild(meta);

    return bubble;
  }

  private async sendMessage(content?: string): Promise<void> {
    if (this.isStreaming) return;

    const message = content?.trim() || '';
    if (!message && this.currentAttachments.length === 0) return;

    // Add user message
    this.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
      hasScreenshot: this.currentHasScreenshot,
      attachments: this.currentAttachments.length > 0 ? [...this.currentAttachments] : undefined,
    });

    // Update UI state
    this.isStreaming = true;
    this.messageInput?.setStreaming(true);
    this.currentStreamContent = '';
    this.renderMessages();

    try {
      // Build attachments for AI controller
      const attachments = this.currentAttachments
        .filter(a => a.type === 'image' && a.data && a.mimeType)
        .map(a => ({
          data: a.data!,
          mimeType: a.mimeType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
        }));

      // Use streaming - only include attachments if there are any
      const chatOptions: Parameters<typeof this.aiController.streamChat>[1] = {
        screenshot: this.currentHasScreenshot,
        stream: true,
      };
      if (attachments.length > 0) {
        chatOptions.attachments = attachments;
      }

      for await (const _chunk of this.aiController.streamChat(message, chatOptions)) {
        // Chunks are handled by event listener
      }
    } catch (error) {
      console.error('AI chat error:', error);
    } finally {
      // Reset streaming state
      this.isStreaming = false;
      this.streamingMessageIndex = null;
      this.messageInput?.setStreaming(false);
      this.currentAttachments = [];
      this.currentHasScreenshot = false;
    }
  }

  private handleStreamChunk(chunk: AIStreamChunk): void {
    if (chunk.type === 'text' && chunk.text) {
      this.currentStreamContent += chunk.text;

      // Update existing streaming message or create new one
      if (this.streamingMessageIndex !== null) {
        // Update existing message in place
        const msg = this.messages[this.streamingMessageIndex];
        if (msg) {
          msg.content = this.currentStreamContent;
        }
      } else {
        // Create new assistant message and track its index
        this.streamingMessageIndex = this.messages.length;
        this.messages.push({
          role: 'assistant',
          content: this.currentStreamContent,
          timestamp: new Date(),
        });
      }
      this.renderMessages();
    }
  }

  private handleMessageComplete(): void {
    this.isStreaming = false;
    this.currentStreamContent = '';
    this.streamingMessageIndex = null;
    this.messageInput?.setStreaming(false);
    this.renderMessages();
  }

  private handleToolStart(toolCall: { name: string }): void {
    // Replace any JSON tool call in the current message with a friendly status
    const friendlyNames: Record<string, string> = {
      'import_image_as_leaf': 'Importing image and analyzing with vision...',
      'create_rectangle': 'Creating rectangle...',
      'create_ellipse': 'Creating ellipse...',
      'create_text': 'Creating text...',
      'create_frame': 'Creating frame...',
    };

    const statusMessage = friendlyNames[toolCall.name] || `Executing ${toolCall.name.replace(/_/g, ' ')}...`;

    // If we have a streaming message, check if it contains JSON tool call and replace
    if (this.streamingMessageIndex !== null) {
      const msg = this.messages[this.streamingMessageIndex];
      if (msg) {
        // Check if content looks like a JSON tool call
        const content = msg.content.trim();
        if (content.startsWith('{') && content.includes('"name"') && content.includes('"arguments"')) {
          // Replace JSON with friendly message
          msg.content = statusMessage;
          this.currentStreamContent = statusMessage;
        } else if (content === '' || !content) {
          // Empty content, just set the status
          msg.content = statusMessage;
          this.currentStreamContent = statusMessage;
        } else {
          // Append status to existing content
          msg.content = content + '\n\n' + statusMessage;
          this.currentStreamContent = msg.content;
        }
        this.renderMessages();
      }
    }
  }

  private handleToolComplete(_toolCall: { name: string }, result: { success: boolean; message: string }): void {
    // Update message with completion status
    if (this.streamingMessageIndex !== null) {
      const msg = this.messages[this.streamingMessageIndex];
      if (msg) {
        const statusEmoji = result.success ? '✓' : '✗';
        const statusText = result.success ? result.message : `Failed: ${result.message}`;

        // Replace "...ing" messages with completion
        if (msg.content.includes('...')) {
          msg.content = `${statusEmoji} ${statusText}`;
        } else {
          msg.content += `\n${statusEmoji} ${statusText}`;
        }
        this.currentStreamContent = msg.content;
        this.renderMessages();
      }
    }
  }

  private handleError(error: Error): void {
    this.isStreaming = false;
    this.streamingMessageIndex = null;
    this.messageInput?.setStreaming(false);
    this.messages.push({
      role: 'assistant',
      content: `Error: ${error.message}`,
      timestamp: new Date(),
    });
    this.renderMessages();
  }

  private updateStatusIndicator(status: string): void {
    const indicator = this.element?.querySelector('.ai-status-indicator') as HTMLElement;
    if (!indicator) return;

    const colors: Record<string, string> = {
      idle: 'var(--designlibre-text-muted, #6a6a6a)',
      thinking: 'var(--designlibre-warning, #f59e0b)',
      executing: 'var(--designlibre-accent, #a855f7)',
      error: 'var(--designlibre-error, #ef4444)',
    };

    indicator.style.background = colors[status] ?? colors['idle']!;

    // Add pulse animation for active states
    if (status === 'thinking' || status === 'executing') {
      indicator.style.animation = 'pulse 1s infinite';
    } else {
      indicator.style.animation = 'none';
    }
  }

  private createIconButton(icon: string, title: string, onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.innerHTML = icon;
    btn.title = title;
    btn.className = 'w-7 h-7 border-none bg-transparent cursor-pointer flex items-center justify-center text-content-secondary rounded hover:bg-surface-secondary hover:text-content';
    btn.addEventListener('click', onClick);
    return btn;
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.updateStyles();
    this.render();
  }

  /**
   * Show the panel.
   */
  show(): void {
    if (this.collapsed) {
      this.toggleCollapse();
    }
    if (this.element) {
      this.element.style.display = 'flex';
    }
  }

  /**
   * Hide the panel.
   */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /**
   * Focus the input field.
   */
  focus(): void {
    this.messageInput?.focus();
  }

  /**
   * Check if panel is collapsed.
   */
  isCollapsed(): boolean {
    return this.collapsed;
  }

  /**
   * Dispose of the panel.
   */
  dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    this.messageInput?.dispose();
    this.messageInput = null;

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.messagesContainer = null;
  }
}

/**
 * Create an AI panel.
 */
export function createAIPanel(
  aiController: AIController,
  container: HTMLElement,
  options?: AIPanelOptions
): AIPanel {
  return new AIPanel(aiController, container, options);
}
