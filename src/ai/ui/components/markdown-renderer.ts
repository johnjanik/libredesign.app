/**
 * Markdown Renderer
 *
 * Lightweight markdown to HTML renderer with code block support.
 * Handles common markdown syntax used in AI responses.
 */

import { createCodeBlock, detectLanguage } from './code-block';

/**
 * Markdown renderer options
 */
export interface MarkdownRendererOptions {
  /** Show line numbers in code blocks */
  codeLineNumbers?: boolean;
  /** Make code blocks collapsible */
  codeCollapsible?: boolean;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parse inline markdown (bold, italic, code, links)
 */
function parseInline(text: string): string {
  let result = escapeHtml(text);

  // Code (must be first to prevent other parsing inside)
  result = result.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  result = result.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Strikethrough
  result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Links [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
  );

  return result;
}

/**
 * Extract code blocks from markdown
 */
interface CodeBlockInfo {
  language: string;
  code: string;
  start: number;
  end: number;
  placeholder: string;
}

function extractCodeBlocks(markdown: string): { text: string; blocks: CodeBlockInfo[] } {
  const blocks: CodeBlockInfo[] = [];
  let blockIndex = 0;

  // Match fenced code blocks ```lang\ncode\n```
  const result = markdown.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (match, lang, code, offset) => {
      const placeholder = `__CODE_BLOCK_${blockIndex}__`;
      blocks.push({
        language: lang || 'text',
        code: code.trimEnd(),
        start: offset,
        end: offset + match.length,
        placeholder,
      });
      blockIndex++;
      return placeholder;
    }
  );

  return { text: result, blocks };
}

/**
 * Parse block-level markdown (headers, lists, blockquotes, etc.)
 */
function parseBlocks(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType = '';
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i] ?? '';

    // Check for code block placeholders (don't process these)
    if (line.includes('__CODE_BLOCK_')) {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
      }
      if (inBlockquote) {
        result.push('</blockquote>');
        inBlockquote = false;
      }
      result.push(line);
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
      }
      if (inBlockquote) {
        result.push('</blockquote>');
        inBlockquote = false;
      }
      const level = headerMatch[1]?.length ?? 1;
      const text = headerMatch[2] ?? '';
      result.push(`<h${level} class="md-h${level}">${parseInline(text)}</h${level}>`);
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
      }
      if (inBlockquote) {
        result.push('</blockquote>');
        inBlockquote = false;
      }
      result.push('<hr class="md-hr">');
      continue;
    }

    // Blockquote
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
      }
      if (!inBlockquote) {
        result.push('<blockquote class="md-blockquote">');
        inBlockquote = true;
      }
      const quoteContent = quoteMatch[1] ?? '';
      result.push(`<p>${parseInline(quoteContent)}</p>`);
      continue;
    } else if (inBlockquote) {
      result.push('</blockquote>');
      inBlockquote = false;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inList && listType !== 'ul') {
        result.push(`</${listType}>`);
        inList = false;
      }
      if (!inList) {
        result.push('<ul class="md-ul">');
        inList = true;
        listType = 'ul';
      }
      const listContent = ulMatch[1] ?? '';
      result.push(`<li>${parseInline(listContent)}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList && listType !== 'ol') {
        result.push(`</${listType}>`);
        inList = false;
      }
      if (!inList) {
        result.push('<ol class="md-ol">');
        inList = true;
        listType = 'ol';
      }
      const listContent = olMatch[1] ?? '';
      result.push(`<li>${parseInline(listContent)}</li>`);
      continue;
    }

    // End list if we're no longer in one
    if (inList && line.trim() !== '' && !ulMatch && !olMatch) {
      result.push(`</${listType}>`);
      inList = false;
    }

    // Empty line
    if (line.trim() === '') {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
      }
      continue;
    }

    // Paragraph
    result.push(`<p class="md-p">${parseInline(line)}</p>`);
  }

  // Close any open tags
  if (inList) {
    result.push(`</${listType}>`);
  }
  if (inBlockquote) {
    result.push('</blockquote>');
  }

  return result.join('\n');
}

/**
 * Markdown Renderer class
 */
export class MarkdownRenderer {
  private container: HTMLElement;
  private options: Required<MarkdownRendererOptions>;
  private element: HTMLElement | null = null;
  private codeBlockElements: Map<string, HTMLElement> = new Map();

  constructor(container: HTMLElement, options: MarkdownRendererOptions = {}) {
    this.container = container;
    this.options = {
      codeLineNumbers: options.codeLineNumbers ?? false,
      codeCollapsible: options.codeCollapsible ?? true,
    };

    this.applyStyles();
  }

  /**
   * Render markdown content
   */
  render(markdown: string): void {
    // Clear previous content
    this.clear();

    // Create container
    this.element = document.createElement('div');
    this.element.className = 'md-content';

    // Extract code blocks
    const { text, blocks } = extractCodeBlocks(markdown);

    // Parse remaining markdown
    let html = parseBlocks(text);

    // Replace code block placeholders with actual elements
    for (const block of blocks) {
      const placeholder = block.placeholder;
      const wrapperHtml = `<div class="md-code-wrapper" data-placeholder="${placeholder}"></div>`;
      html = html.replace(placeholder, wrapperHtml);
    }

    this.element.innerHTML = html;

    // Render code blocks
    for (const block of blocks) {
      const wrapper = this.element.querySelector(`[data-placeholder="${block.placeholder}"]`);
      if (wrapper) {
        this.codeBlockElements.set(block.placeholder, wrapper as HTMLElement);
        createCodeBlock(wrapper as HTMLElement, {
          code: block.code,
          language: detectLanguage(block.language),
          lineNumbers: this.options.codeLineNumbers,
          collapsible: this.options.codeCollapsible,
        });
      }
    }

    this.container.appendChild(this.element);
  }

  /**
   * Append more markdown content (for streaming)
   */
  append(markdown: string): void {
    // For streaming, re-render the entire content
    // This is simpler and handles partial code blocks correctly
    this.render(markdown);
  }

  /**
   * Clear the rendered content
   */
  clear(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.codeBlockElements.clear();
  }

  /**
   * Apply markdown styles
   */
  private applyStyles(): void {
    if (document.getElementById('md-styles')) return;

    const style = document.createElement('style');
    style.id = 'md-styles';
    style.textContent = `
      .md-content {
        line-height: 1.6;
        color: var(--designlibre-text-primary, #e4e4e4);
      }

      .md-content > *:first-child {
        margin-top: 0;
      }

      .md-content > *:last-child {
        margin-bottom: 0;
      }

      .md-p {
        margin: 0.5em 0;
      }

      .md-h1, .md-h2, .md-h3, .md-h4, .md-h5, .md-h6 {
        margin: 1em 0 0.5em 0;
        font-weight: 600;
        line-height: 1.3;
      }

      .md-h1 { font-size: 1.5em; }
      .md-h2 { font-size: 1.3em; }
      .md-h3 { font-size: 1.2em; }
      .md-h4 { font-size: 1.1em; }
      .md-h5 { font-size: 1em; }
      .md-h6 { font-size: 0.9em; }

      .md-ul, .md-ol {
        margin: 0.5em 0;
        padding-left: 1.5em;
      }

      .md-ul li, .md-ol li {
        margin: 0.25em 0;
      }

      .md-blockquote {
        margin: 0.5em 0;
        padding: 0.5em 1em;
        border-left: 3px solid var(--designlibre-accent, #4dabff);
        background: var(--designlibre-bg-secondary, #2d2d2d);
        border-radius: 0 4px 4px 0;
      }

      .md-blockquote p {
        margin: 0.25em 0;
      }

      .md-hr {
        border: none;
        border-top: 1px solid var(--designlibre-border, #3d3d3d);
        margin: 1em 0;
      }

      .md-inline-code {
        padding: 0.15em 0.4em;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        border-radius: 3px;
        font-family: 'SF Mono', Monaco, Consolas, monospace;
        font-size: 0.9em;
        color: var(--designlibre-text-primary, #e4e4e4);
      }

      .md-link {
        color: var(--designlibre-accent, #4dabff);
        text-decoration: none;
      }

      .md-link:hover {
        text-decoration: underline;
      }

      .md-code-wrapper {
        margin: 0.5em 0;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Dispose of the renderer
   */
  dispose(): void {
    this.clear();
  }
}

/**
 * Create a markdown renderer
 */
export function createMarkdownRenderer(
  container: HTMLElement,
  options?: MarkdownRendererOptions
): MarkdownRenderer {
  return new MarkdownRenderer(container, options);
}

/**
 * Render markdown to HTML string (without code block components)
 */
export function renderMarkdownToHtml(markdown: string): string {
  const { text, blocks } = extractCodeBlocks(markdown);
  let html = parseBlocks(text);

  // Replace placeholders with simple pre/code blocks
  for (const block of blocks) {
    const lang = detectLanguage(block.language);
    const codeHtml = `<pre class="md-code-block"><code class="language-${lang}">${escapeHtml(block.code)}</code></pre>`;
    html = html.replace(block.placeholder, codeHtml);
  }

  return html;
}
