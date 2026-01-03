/**
 * Enhanced Message Input Component
 *
 * Auto-resizing textarea with file attachments, character count,
 * and streaming control.
 */

/**
 * SVG Icons for message input
 */
const ICONS = {
  send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>`,
  stop: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>`,
  attach: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
  </svg>`,
  screenshot: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>`,
  close: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,
  image: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>`,
};

/**
 * Attachment type
 */
export interface MessageAttachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  /** Base64 data for images */
  data?: string;
  /** MIME type */
  mimeType?: string;
  /** File size in bytes */
  size: number;
}

/**
 * Message input options
 */
export interface MessageInputOptions {
  /** Placeholder text */
  placeholder?: string;
  /** Maximum height for auto-resize */
  maxHeight?: number;
  /** Minimum height */
  minHeight?: number;
  /** Enable file attachments */
  enableAttachments?: boolean;
  /** Enable screenshot toggle */
  enableScreenshot?: boolean;
  /** Maximum file size (bytes) */
  maxFileSize?: number;
  /** Allowed file types */
  allowedFileTypes?: string[];
  /** Show character count */
  showCharCount?: boolean;
  /** Max characters (0 = unlimited) */
  maxChars?: number;
}

/**
 * Message input events
 */
export interface MessageInputEvents {
  onSend?: (message: string, attachments: MessageAttachment[], includeScreenshot: boolean) => void;
  onCancel?: () => void;
  onChange?: (message: string) => void;
  onSlashCommand?: (command: string) => void;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<MessageInputOptions> = {
  placeholder: 'Ask the AI to help with your design...',
  maxHeight: 200,
  minHeight: 60,
  enableAttachments: true,
  enableScreenshot: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  showCharCount: true,
  maxChars: 0,
};

/**
 * Enhanced Message Input Component
 */
export class MessageInput {
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;
  private sendButton: HTMLButtonElement | null = null;
  private charCountEl: HTMLElement | null = null;
  private attachmentsContainer: HTMLElement | null = null;
  private fileInput: HTMLInputElement | null = null;

  private options: Required<MessageInputOptions>;
  private events: MessageInputEvents;
  private attachments: MessageAttachment[] = [];
  private includeScreenshot = false;
  private isStreaming = false;
  private isDisabled = false;

  constructor(
    container: HTMLElement,
    options: MessageInputOptions = {},
    events: MessageInputEvents = {}
  ) {
    this.container = container;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.events = events;

    this.setup();
  }

  private setup(): void {
    this.element = document.createElement('div');
    this.element.className = 'designlibre-message-input';
    this.applyStyles();
    this.render();
    this.container.appendChild(this.element);
  }

  private applyStyles(): void {
    if (document.getElementById('message-input-styles')) return;

    const style = document.createElement('style');
    style.id = 'message-input-styles';
    style.textContent = `
      .designlibre-message-input {
        padding: 12px;
        border-top: 1px solid var(--designlibre-border, #3d3d3d);
        background: var(--designlibre-bg-tertiary, #252525);
      }

      .message-input-attachments {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;
      }

      .message-input-attachments:empty {
        display: none;
      }

      .attachment-preview {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 6px;
        font-size: 11px;
        color: var(--designlibre-text-secondary, #a0a0a0);
        max-width: 150px;
      }

      .attachment-preview-image {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        object-fit: cover;
      }

      .attachment-preview-name {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .attachment-remove {
        width: 16px;
        height: 16px;
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--designlibre-text-muted, #6a6a6a);
        border-radius: 50%;
        transition: all 0.15s;
      }

      .attachment-remove:hover {
        background: var(--designlibre-error, #ef4444);
        color: white;
      }

      .message-input-options {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .message-input-row {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }

      .message-input-textarea {
        flex: 1;
        padding: 10px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 6px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: 12px;
        font-family: inherit;
        resize: none;
        outline: none;
        line-height: 1.5;
        transition: border-color 0.15s;
      }

      .message-input-textarea:focus {
        border-color: var(--designlibre-accent, #a855f7);
      }

      .message-input-textarea:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .message-input-textarea::placeholder {
        color: var(--designlibre-text-muted, #6a6a6a);
      }

      .message-input-btn {
        width: 40px;
        height: 40px;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.15s;
      }

      .message-input-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .message-input-send {
        background: var(--designlibre-accent, #a855f7);
        color: white;
      }

      .message-input-send:hover:not(:disabled) {
        background: #9333ea;
      }

      .message-input-send.streaming {
        background: var(--designlibre-error, #ef4444);
      }

      .message-input-send.streaming:hover:not(:disabled) {
        background: #dc2626;
      }

      .message-input-option-btn {
        width: 28px;
        height: 28px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        background: transparent;
        color: var(--designlibre-text-secondary, #a0a0a0);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.15s;
      }

      .message-input-option-btn:hover {
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
      }

      .message-input-option-btn.active {
        border-color: var(--designlibre-accent, #a855f7);
        background: var(--designlibre-accent-light, #3b1f5c);
        color: var(--designlibre-accent, #a855f7);
      }

      .message-input-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 6px;
        font-size: 10px;
        color: var(--designlibre-text-muted, #6a6a6a);
      }

      .message-input-char-count {
        font-variant-numeric: tabular-nums;
      }

      .message-input-char-count.warning {
        color: var(--designlibre-warning, #f59e0b);
      }

      .message-input-char-count.error {
        color: var(--designlibre-error, #ef4444);
      }

      .message-input-hint {
        opacity: 0.7;
      }

      @keyframes pulse-send {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      .message-input-send.loading {
        animation: pulse-send 1s infinite;
      }
    `;
    document.head.appendChild(style);
  }

  private render(): void {
    if (!this.element) return;
    this.element.innerHTML = '';

    // Attachments preview area
    this.attachmentsContainer = document.createElement('div');
    this.attachmentsContainer.className = 'message-input-attachments';
    this.element.appendChild(this.attachmentsContainer);

    // Options row
    const optionsRow = document.createElement('div');
    optionsRow.className = 'message-input-options';

    // Screenshot toggle
    if (this.options.enableScreenshot) {
      const screenshotBtn = this.createOptionButton(
        ICONS.screenshot,
        'Include canvas screenshot',
        () => {
          this.includeScreenshot = !this.includeScreenshot;
          screenshotBtn.classList.toggle('active', this.includeScreenshot);
        }
      );
      optionsRow.appendChild(screenshotBtn);
    }

    // Attachment button
    if (this.options.enableAttachments) {
      const attachBtn = this.createOptionButton(
        ICONS.attach,
        'Attach file',
        () => this.openFilePicker()
      );
      optionsRow.appendChild(attachBtn);

      // Hidden file input
      this.fileInput = document.createElement('input');
      this.fileInput.type = 'file';
      this.fileInput.multiple = true;
      this.fileInput.accept = this.options.allowedFileTypes.join(',');
      this.fileInput.style.display = 'none';
      this.fileInput.addEventListener('change', () => this.handleFileSelect());
      this.element.appendChild(this.fileInput);
    }

    // Hint text
    const hint = document.createElement('span');
    hint.className = 'message-input-hint';
    hint.textContent = 'Shift+Enter for new line';
    hint.style.marginLeft = 'auto';
    optionsRow.appendChild(hint);

    this.element.appendChild(optionsRow);

    // Input row
    const inputRow = document.createElement('div');
    inputRow.className = 'message-input-row';

    // Textarea
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'message-input-textarea';
    this.textarea.placeholder = this.options.placeholder;
    this.textarea.style.minHeight = `${this.options.minHeight}px`;
    this.textarea.style.maxHeight = `${this.options.maxHeight}px`;

    this.textarea.addEventListener('input', () => this.handleInput());
    this.textarea.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.textarea.addEventListener('paste', (e) => this.handlePaste(e));

    inputRow.appendChild(this.textarea);

    // Send/Cancel button
    this.sendButton = document.createElement('button');
    this.sendButton.className = 'message-input-btn message-input-send';
    this.sendButton.innerHTML = ICONS.send;
    this.sendButton.title = 'Send message (Enter)';
    this.sendButton.addEventListener('click', () => this.handleSendOrCancel());
    inputRow.appendChild(this.sendButton);

    this.element.appendChild(inputRow);

    // Footer with char count
    if (this.options.showCharCount) {
      const footer = document.createElement('div');
      footer.className = 'message-input-footer';

      this.charCountEl = document.createElement('span');
      this.charCountEl.className = 'message-input-char-count';
      this.updateCharCount();
      footer.appendChild(this.charCountEl);

      const shortcuts = document.createElement('span');
      shortcuts.textContent = 'Enter to send';
      footer.appendChild(shortcuts);

      this.element.appendChild(footer);
    }

    // Enable drag and drop
    this.setupDragDrop();
  }

  private createOptionButton(
    icon: string,
    title: string,
    onClick: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'message-input-option-btn';
    btn.innerHTML = icon;
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private setupDragDrop(): void {
    if (!this.element || !this.options.enableAttachments) return;

    this.element.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.element!.style.borderColor = 'var(--designlibre-accent, #a855f7)';
    });

    this.element.addEventListener('dragleave', () => {
      this.element!.style.borderColor = '';
    });

    this.element.addEventListener('drop', (e) => {
      e.preventDefault();
      this.element!.style.borderColor = '';

      const files = e.dataTransfer?.files;
      if (files) {
        this.processFiles(Array.from(files));
      }
    });
  }

  private handleInput(): void {
    this.autoResize();
    this.updateCharCount();

    const value = this.textarea?.value || '';

    // Check for slash commands
    if (value.startsWith('/') && !value.includes(' ')) {
      this.events.onSlashCommand?.(value);
    }

    this.events.onChange?.(value);
  }

  private autoResize(): void {
    if (!this.textarea) return;

    // Reset height to measure content
    this.textarea.style.height = 'auto';

    // Calculate new height within bounds
    const scrollHeight = this.textarea.scrollHeight;
    const newHeight = Math.min(
      Math.max(scrollHeight, this.options.minHeight),
      this.options.maxHeight
    );

    this.textarea.style.height = `${newHeight}px`;

    // Show scrollbar if content exceeds max
    this.textarea.style.overflowY = scrollHeight > this.options.maxHeight ? 'auto' : 'hidden';
  }

  private updateCharCount(): void {
    if (!this.charCountEl || !this.textarea) return;

    const length = this.textarea.value.length;
    const maxChars = this.options.maxChars;

    if (maxChars > 0) {
      this.charCountEl.textContent = `${length}/${maxChars}`;
      this.charCountEl.classList.remove('warning', 'error');

      if (length >= maxChars) {
        this.charCountEl.classList.add('error');
      } else if (length >= maxChars * 0.9) {
        this.charCountEl.classList.add('warning');
      }
    } else {
      this.charCountEl.textContent = `${length} chars`;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!this.isStreaming) {
        this.send();
      }
    }

    // Escape to cancel streaming
    if (e.key === 'Escape' && this.isStreaming) {
      this.cancel();
    }
  }

  private handlePaste(e: ClipboardEvent): void {
    if (!this.options.enableAttachments) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems: DataTransferItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.type.startsWith('image/')) {
        imageItems.push(item);
      }
    }

    if (imageItems.length > 0) {
      e.preventDefault();
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          this.processFiles([file]);
        }
      }
    }
  }

  private handleSendOrCancel(): void {
    if (this.isStreaming) {
      this.cancel();
    } else {
      this.send();
    }
  }

  private openFilePicker(): void {
    this.fileInput?.click();
  }

  private handleFileSelect(): void {
    const files = this.fileInput?.files;
    if (files) {
      this.processFiles(Array.from(files));
    }
    // Reset input for same file selection
    if (this.fileInput) {
      this.fileInput.value = '';
    }
  }

  private processFiles(files: File[]): void {
    for (const file of files) {
      // Check file size
      if (file.size > this.options.maxFileSize) {
        console.warn(`File ${file.name} exceeds maximum size`);
        continue;
      }

      // Check file type
      if (!this.options.allowedFileTypes.includes(file.type)) {
        console.warn(`File type ${file.type} not allowed`);
        continue;
      }

      // Read file
      if (file.type.startsWith('image/')) {
        this.readImageFile(file);
      }
    }
  }

  private readImageFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      // Extract base64 from data URL
      const base64 = data.split(',')[1];

      if (base64) {
        const attachment: MessageAttachment = {
          id: crypto.randomUUID(),
          type: 'image',
          name: file.name,
          data: base64,
          mimeType: file.type,
          size: file.size,
        };

        this.attachments.push(attachment);
        this.renderAttachments();
      }
    };
    reader.readAsDataURL(file);
  }

  private renderAttachments(): void {
    if (!this.attachmentsContainer) return;
    this.attachmentsContainer.innerHTML = '';

    for (const attachment of this.attachments) {
      const preview = document.createElement('div');
      preview.className = 'attachment-preview';

      // Thumbnail for images
      if (attachment.type === 'image' && attachment.data) {
        const img = document.createElement('img');
        img.className = 'attachment-preview-image';
        img.src = `data:${attachment.mimeType};base64,${attachment.data}`;
        img.alt = attachment.name;
        preview.appendChild(img);
      } else {
        const icon = document.createElement('span');
        icon.innerHTML = ICONS.image;
        preview.appendChild(icon);
      }

      // Filename
      const name = document.createElement('span');
      name.className = 'attachment-preview-name';
      name.textContent = attachment.name;
      name.title = attachment.name;
      preview.appendChild(name);

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'attachment-remove';
      removeBtn.innerHTML = ICONS.close;
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('click', () => {
        this.removeAttachment(attachment.id);
      });
      preview.appendChild(removeBtn);

      this.attachmentsContainer.appendChild(preview);
    }
  }

  private removeAttachment(id: string): void {
    this.attachments = this.attachments.filter((a) => a.id !== id);
    this.renderAttachments();
  }

  private send(): void {
    if (!this.textarea || this.isDisabled) return;

    const message = this.textarea.value.trim();
    if (!message && this.attachments.length === 0) return;

    // Check max chars
    if (this.options.maxChars > 0 && message.length > this.options.maxChars) {
      return;
    }

    this.events.onSend?.(message, [...this.attachments], this.includeScreenshot);

    // Clear input
    this.textarea.value = '';
    this.attachments = [];
    this.renderAttachments();
    this.autoResize();
    this.updateCharCount();
  }

  private cancel(): void {
    this.events.onCancel?.();
  }

  /**
   * Set streaming state
   */
  setStreaming(streaming: boolean): void {
    this.isStreaming = streaming;
    if (this.sendButton) {
      this.sendButton.classList.toggle('streaming', streaming);
      this.sendButton.innerHTML = streaming ? ICONS.stop : ICONS.send;
      this.sendButton.title = streaming ? 'Stop generating (Escape)' : 'Send message (Enter)';
    }
    if (this.textarea) {
      this.textarea.disabled = streaming;
    }
  }

  /**
   * Set disabled state
   */
  setDisabled(disabled: boolean): void {
    this.isDisabled = disabled;
    if (this.textarea) {
      this.textarea.disabled = disabled;
    }
    if (this.sendButton) {
      this.sendButton.disabled = disabled;
    }
  }

  /**
   * Set loading state on send button
   */
  setLoading(loading: boolean): void {
    if (this.sendButton) {
      this.sendButton.classList.toggle('loading', loading);
    }
  }

  /**
   * Focus the input
   */
  focus(): void {
    this.textarea?.focus();
  }

  /**
   * Get current value
   */
  getValue(): string {
    return this.textarea?.value || '';
  }

  /**
   * Set value
   */
  setValue(value: string): void {
    if (this.textarea) {
      this.textarea.value = value;
      this.autoResize();
      this.updateCharCount();
    }
  }

  /**
   * Clear input and attachments
   */
  clear(): void {
    if (this.textarea) {
      this.textarea.value = '';
      this.autoResize();
      this.updateCharCount();
    }
    this.attachments = [];
    this.renderAttachments();
    this.includeScreenshot = false;

    // Update screenshot button state
    const screenshotBtn = this.element?.querySelector('.message-input-option-btn');
    screenshotBtn?.classList.remove('active');
  }

  /**
   * Get current attachments
   */
  getAttachments(): MessageAttachment[] {
    return [...this.attachments];
  }

  /**
   * Check if screenshot is enabled
   */
  hasScreenshot(): boolean {
    return this.includeScreenshot;
  }

  /**
   * Dispose the component
   */
  dispose(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.textarea = null;
    this.sendButton = null;
    this.charCountEl = null;
    this.attachmentsContainer = null;
    this.fileInput = null;
    this.attachments = [];
  }
}

/**
 * Create a message input component
 */
export function createMessageInput(
  container: HTMLElement,
  options?: MessageInputOptions,
  events?: MessageInputEvents
): MessageInput {
  return new MessageInput(container, options, events);
}
