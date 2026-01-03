/**
 * Code Block Component
 *
 * Renders code blocks with syntax highlighting, copy button,
 * and optional line numbers.
 */

/**
 * Supported languages for syntax highlighting
 */
export type CodeLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'css'
  | 'html'
  | 'json'
  | 'markdown'
  | 'yaml'
  | 'sql'
  | 'bash'
  | 'rust'
  | 'go'
  | 'swift'
  | 'kotlin'
  | 'java'
  | 'c'
  | 'cpp'
  | 'text';

/**
 * Code block options
 */
export interface CodeBlockOptions {
  /** Code content */
  code: string;
  /** Language for syntax highlighting */
  language?: CodeLanguage;
  /** Show line numbers */
  lineNumbers?: boolean;
  /** Filename to display in header */
  filename?: string;
  /** Make collapsible for long blocks */
  collapsible?: boolean;
  /** Maximum lines before collapsing (default: 20) */
  collapseThreshold?: number;
}

/**
 * SVG Icons
 */
const ICONS = {
  copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,
  expand: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`,
  collapse: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="18 15 12 9 6 15"/>
  </svg>`,
};

/**
 * Language display names
 */
const LANGUAGE_NAMES: Record<CodeLanguage, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  css: 'CSS',
  html: 'HTML',
  json: 'JSON',
  markdown: 'Markdown',
  yaml: 'YAML',
  sql: 'SQL',
  bash: 'Bash',
  rust: 'Rust',
  go: 'Go',
  swift: 'Swift',
  kotlin: 'Kotlin',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  text: 'Plain Text',
};

/**
 * Syntax highlighting patterns (CSS-based, lightweight)
 */
interface HighlightPattern {
  pattern: RegExp;
  className: string;
}

const HIGHLIGHT_PATTERNS: Record<string, HighlightPattern[]> = {
  typescript: [
    { pattern: /\b(import|export|from|const|let|var|function|class|interface|type|extends|implements|return|if|else|for|while|switch|case|break|continue|new|this|super|async|await|try|catch|throw|finally|typeof|instanceof|in|of|as|is|keyof|readonly|public|private|protected|static|abstract|declare|namespace|module|enum|void|null|undefined|true|false|never|unknown|any)\b/g, className: 'keyword' },
    { pattern: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /\/\/.*$/gm, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /\b\d+\.?\d*\b/g, className: 'number' },
    { pattern: /\b([A-Z][a-zA-Z0-9]*)\b/g, className: 'type' },
  ],
  javascript: [
    { pattern: /\b(import|export|from|const|let|var|function|class|extends|return|if|else|for|while|switch|case|break|continue|new|this|super|async|await|try|catch|throw|finally|typeof|instanceof|in|of|void|null|undefined|true|false)\b/g, className: 'keyword' },
    { pattern: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /\/\/.*$/gm, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /\b\d+\.?\d*\b/g, className: 'number' },
  ],
  python: [
    { pattern: /\b(import|from|as|def|class|return|if|elif|else|for|while|break|continue|try|except|finally|raise|with|lambda|yield|pass|True|False|None|and|or|not|in|is|global|nonlocal|assert|del)\b/g, className: 'keyword' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /"""[\s\S]*?"""|'''[\s\S]*?'''/g, className: 'string' },
    { pattern: /#.*$/gm, className: 'comment' },
    { pattern: /\b\d+\.?\d*\b/g, className: 'number' },
  ],
  css: [
    { pattern: /\b(import|media|keyframes|font-face|supports|charset)\b/g, className: 'keyword' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /#[0-9a-fA-F]{3,8}\b/g, className: 'number' },
    { pattern: /\b\d+\.?\d*(px|em|rem|%|vh|vw|deg|s|ms)?\b/g, className: 'number' },
    { pattern: /[.#][\w-]+(?=\s*\{)/g, className: 'type' },
  ],
  html: [
    { pattern: /<!--[\s\S]*?-->/g, className: 'comment' },
    { pattern: /<\/?[\w-]+/g, className: 'keyword' },
    { pattern: /\s[\w-]+(?==)/g, className: 'type' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
  ],
  json: [
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1(?=\s*:)/g, className: 'type' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /\b(true|false|null)\b/g, className: 'keyword' },
    { pattern: /-?\b\d+\.?\d*([eE][+-]?\d+)?\b/g, className: 'number' },
  ],
  swift: [
    { pattern: /\b(import|class|struct|enum|protocol|extension|func|var|let|if|else|guard|switch|case|for|while|repeat|return|throw|try|catch|defer|where|in|is|as|self|Self|super|init|deinit|subscript|typealias|associatedtype|true|false|nil|some|any|async|await|actor)\b/g, className: 'keyword' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /\/\/.*$/gm, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /\b\d+\.?\d*\b/g, className: 'number' },
    { pattern: /\b([A-Z][a-zA-Z0-9]*)\b/g, className: 'type' },
  ],
  kotlin: [
    { pattern: /\b(import|package|class|interface|object|fun|val|var|if|else|when|for|while|do|return|throw|try|catch|finally|break|continue|is|in|as|this|super|true|false|null|companion|data|sealed|enum|annotation|suspend|lateinit|by|init|constructor|where|typealias|inline|reified|crossinline|noinline|tailrec|operator|infix|expect|actual)\b/g, className: 'keyword' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /\/\/.*$/gm, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /\b\d+\.?\d*[fFL]?\b/g, className: 'number' },
    { pattern: /\b([A-Z][a-zA-Z0-9]*)\b/g, className: 'type' },
  ],
  bash: [
    { pattern: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|export|source|alias|unalias|cd|pwd|echo|read|local|declare|readonly|set|unset|shift|trap)\b/g, className: 'keyword' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /#.*$/gm, className: 'comment' },
    { pattern: /\$[\w{]+/g, className: 'type' },
  ],
  rust: [
    { pattern: /\b(fn|let|mut|const|static|struct|enum|impl|trait|type|where|pub|mod|use|crate|self|super|as|in|for|loop|while|if|else|match|break|continue|return|async|await|move|ref|dyn|unsafe|extern|true|false|Some|None|Ok|Err)\b/g, className: 'keyword' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /\/\/.*$/gm, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /\b\d+\.?\d*\b/g, className: 'number' },
    { pattern: /\b([A-Z][a-zA-Z0-9]*)\b/g, className: 'type' },
  ],
  go: [
    { pattern: /\b(package|import|func|var|const|type|struct|interface|map|chan|range|for|if|else|switch|case|default|break|continue|return|go|defer|select|fallthrough|true|false|nil|iota)\b/g, className: 'keyword' },
    { pattern: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /\/\/.*$/gm, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /\b\d+\.?\d*\b/g, className: 'number' },
  ],
  sql: [
    { pattern: /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|AS|JOIN|LEFT|RIGHT|INNER|OUTER|ON|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|DATABASE|IF|EXISTS|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|DEFAULT|CHECK|CONSTRAINT|CASE|WHEN|THEN|ELSE|END|UNION|ALL|DISTINCT|COUNT|SUM|AVG|MIN|MAX)\b/gi, className: 'keyword' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /--.*$/gm, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /\b\d+\.?\d*\b/g, className: 'number' },
  ],
  yaml: [
    { pattern: /^[\w-]+(?=:)/gm, className: 'type' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /#.*$/gm, className: 'comment' },
    { pattern: /\b(true|false|null|yes|no|on|off)\b/gi, className: 'keyword' },
    { pattern: /\b\d+\.?\d*\b/g, className: 'number' },
  ],
  markdown: [
    { pattern: /^#{1,6}\s.*/gm, className: 'keyword' },
    { pattern: /\*\*.*?\*\*|__.*?__/g, className: 'keyword' },
    { pattern: /\*.*?\*|_.*?_/g, className: 'string' },
    { pattern: /`[^`]+`/g, className: 'type' },
    { pattern: /\[.*?\]\(.*?\)/g, className: 'string' },
  ],
  java: [
    { pattern: /\b(import|package|class|interface|extends|implements|public|private|protected|static|final|abstract|synchronized|volatile|transient|native|strictfp|new|this|super|if|else|for|while|do|switch|case|default|break|continue|return|throw|try|catch|finally|throws|instanceof|true|false|null|void|enum|assert)\b/g, className: 'keyword' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /\/\/.*$/gm, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /\b\d+\.?\d*[fFdDlL]?\b/g, className: 'number' },
    { pattern: /\b([A-Z][a-zA-Z0-9]*)\b/g, className: 'type' },
  ],
  c: [
    { pattern: /\b(auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|inline|restrict|_Bool|_Complex|_Imaginary)\b/g, className: 'keyword' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /\/\/.*$/gm, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /#\s*\w+/g, className: 'keyword' },
    { pattern: /\b\d+\.?\d*[fFlLuU]*\b/g, className: 'number' },
  ],
  cpp: [
    { pattern: /\b(alignas|alignof|and|and_eq|asm|auto|bitand|bitor|bool|break|case|catch|char|char8_t|char16_t|char32_t|class|compl|concept|const|consteval|constexpr|constinit|const_cast|continue|co_await|co_return|co_yield|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|register|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq)\b/g, className: 'keyword' },
    { pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g, className: 'string' },
    { pattern: /\/\/.*$/gm, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /#\s*\w+/g, className: 'keyword' },
    { pattern: /\b\d+\.?\d*[fFlLuU]*\b/g, className: 'number' },
    { pattern: /\b([A-Z][a-zA-Z0-9_]*)\b/g, className: 'type' },
  ],
  text: [],
};

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
 * Apply syntax highlighting to code
 */
function highlightCode(code: string, language: CodeLanguage): string {
  const patterns = HIGHLIGHT_PATTERNS[language] || HIGHLIGHT_PATTERNS['text'] || [];

  if (patterns.length === 0) {
    return escapeHtml(code);
  }

  // Create tokens array to track highlighted regions
  interface Token {
    start: number;
    end: number;
    className: string;
    text: string;
  }

  const tokens: Token[] = [];

  // Find all matches
  for (const { pattern, className } of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(code)) !== null) {
      tokens.push({
        start: match.index,
        end: match.index + match[0].length,
        className,
        text: match[0],
      });
    }
  }

  // Sort by start position
  tokens.sort((a, b) => a.start - b.start);

  // Remove overlapping tokens (keep first)
  const filtered: Token[] = [];
  let lastEnd = 0;
  for (const token of tokens) {
    if (token.start >= lastEnd) {
      filtered.push(token);
      lastEnd = token.end;
    }
  }

  // Build highlighted HTML
  let result = '';
  let pos = 0;

  for (const token of filtered) {
    // Add unhighlighted text before this token
    if (token.start > pos) {
      result += escapeHtml(code.slice(pos, token.start));
    }
    // Add highlighted token
    result += `<span class="cb-${token.className}">${escapeHtml(token.text)}</span>`;
    pos = token.end;
  }

  // Add remaining text
  if (pos < code.length) {
    result += escapeHtml(code.slice(pos));
  }

  return result;
}

/**
 * Code Block component
 */
export class CodeBlock {
  private container: HTMLElement;
  private options: Required<CodeBlockOptions>;
  private element: HTMLElement | null = null;
  private isCollapsed = false;

  constructor(container: HTMLElement, options: CodeBlockOptions) {
    this.container = container;
    this.options = {
      code: options.code,
      language: options.language || 'text',
      lineNumbers: options.lineNumbers ?? false,
      filename: options.filename || '',
      collapsible: options.collapsible ?? false,
      collapseThreshold: options.collapseThreshold ?? 20,
    };

    this.render();
  }

  private render(): void {
    this.element = document.createElement('div');
    this.element.className = 'cb-container';

    const lineCount = this.options.code.split('\n').length;
    const shouldCollapse = this.options.collapsible && lineCount > this.options.collapseThreshold;
    this.isCollapsed = shouldCollapse;

    // Header
    const header = this.createHeader(shouldCollapse, lineCount);
    this.element.appendChild(header);

    // Code content
    const content = this.createContent();
    if (shouldCollapse) {
      content.style.maxHeight = '200px';
      content.style.overflow = 'hidden';
    }
    this.element.appendChild(content);

    // Apply styles
    this.applyStyles();

    this.container.appendChild(this.element);
  }

  private createHeader(showExpand: boolean, lineCount: number): HTMLElement {
    const header = document.createElement('div');
    header.className = 'cb-header';

    // Left side - language/filename
    const left = document.createElement('div');
    left.className = 'cb-header-left';

    if (this.options.filename) {
      const filename = document.createElement('span');
      filename.className = 'cb-filename';
      filename.textContent = this.options.filename;
      left.appendChild(filename);
    } else {
      const lang = document.createElement('span');
      lang.className = 'cb-language';
      lang.textContent = LANGUAGE_NAMES[this.options.language];
      left.appendChild(lang);
    }

    header.appendChild(left);

    // Right side - actions
    const right = document.createElement('div');
    right.className = 'cb-header-right';

    // Expand/collapse button
    if (showExpand) {
      const expandBtn = document.createElement('button');
      expandBtn.className = 'cb-expand-btn';
      expandBtn.innerHTML = `${ICONS.expand} <span>${lineCount} lines</span>`;
      expandBtn.addEventListener('click', () => this.toggleCollapse());
      right.appendChild(expandBtn);
    }

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'cb-copy-btn';
    copyBtn.innerHTML = ICONS.copy;
    copyBtn.title = 'Copy code';
    copyBtn.addEventListener('click', () => this.copyCode(copyBtn));
    right.appendChild(copyBtn);

    header.appendChild(right);

    return header;
  }

  private createContent(): HTMLElement {
    const content = document.createElement('div');
    content.className = 'cb-content';

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = `language-${this.options.language}`;

    if (this.options.lineNumbers) {
      const lines = this.options.code.split('\n');
      const numberedLines = lines.map((line, i) => {
        const lineNum = `<span class="cb-line-number">${i + 1}</span>`;
        const lineContent = highlightCode(line, this.options.language);
        return `<span class="cb-line">${lineNum}<span class="cb-line-content">${lineContent}</span></span>`;
      });
      code.innerHTML = numberedLines.join('\n');
    } else {
      code.innerHTML = highlightCode(this.options.code, this.options.language);
    }

    pre.appendChild(code);
    content.appendChild(pre);

    return content;
  }

  private toggleCollapse(): void {
    if (!this.element) return;

    const content = this.element.querySelector('.cb-content') as HTMLElement;
    const expandBtn = this.element.querySelector('.cb-expand-btn') as HTMLElement;

    if (!content || !expandBtn) return;

    this.isCollapsed = !this.isCollapsed;

    if (this.isCollapsed) {
      content.style.maxHeight = '200px';
      content.style.overflow = 'hidden';
      expandBtn.innerHTML = `${ICONS.expand} <span>Show more</span>`;
    } else {
      content.style.maxHeight = 'none';
      content.style.overflow = 'visible';
      expandBtn.innerHTML = `${ICONS.collapse} <span>Show less</span>`;
    }
  }

  private async copyCode(button: HTMLElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.options.code);

      // Show feedback
      const originalContent = button.innerHTML;
      button.innerHTML = ICONS.check;
      button.classList.add('cb-copied');

      setTimeout(() => {
        button.innerHTML = originalContent;
        button.classList.remove('cb-copied');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }

  private applyStyles(): void {
    // Check if styles are already added
    if (document.getElementById('cb-styles')) return;

    const style = document.createElement('style');
    style.id = 'cb-styles';
    style.textContent = `
      .cb-container {
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 6px;
        overflow: hidden;
        margin: 8px 0;
        background: var(--designlibre-bg-secondary, #1a1a1a);
      }

      .cb-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        background: var(--designlibre-bg-tertiary, #252525);
        border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      }

      .cb-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .cb-header-right {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .cb-language, .cb-filename {
        font-size: 11px;
        color: var(--designlibre-text-secondary, #a0a0a0);
        text-transform: uppercase;
      }

      .cb-filename {
        text-transform: none;
        font-family: 'SF Mono', Monaco, Consolas, monospace;
      }

      .cb-copy-btn, .cb-expand-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border: none;
        background: transparent;
        color: var(--designlibre-text-secondary, #a0a0a0);
        cursor: pointer;
        border-radius: 4px;
        font-size: 11px;
        transition: all 0.15s;
      }

      .cb-copy-btn:hover, .cb-expand-btn:hover {
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
      }

      .cb-copied {
        color: var(--designlibre-success, #4caf50) !important;
      }

      .cb-content {
        overflow-x: auto;
        transition: max-height 0.3s ease;
      }

      .cb-content pre {
        margin: 0;
        padding: 12px;
        overflow-x: auto;
      }

      .cb-content code {
        font-family: 'SF Mono', Monaco, 'Fira Code', Consolas, monospace;
        font-size: 12px;
        line-height: 1.5;
        color: var(--designlibre-text-primary, #e4e4e4);
      }

      .cb-line {
        display: block;
      }

      .cb-line-number {
        display: inline-block;
        width: 3em;
        padding-right: 1em;
        text-align: right;
        color: var(--designlibre-text-muted, #6a6a6a);
        user-select: none;
      }

      .cb-line-content {
        display: inline;
      }

      /* Syntax highlighting */
      .cb-keyword { color: #c678dd; }
      .cb-string { color: #98c379; }
      .cb-number { color: #d19a66; }
      .cb-comment { color: #5c6370; font-style: italic; }
      .cb-type { color: #e5c07b; }
      .cb-property { color: #61afef; }

      /* Light theme overrides */
      @media (prefers-color-scheme: light) {
        :root.light-theme .cb-keyword { color: #a626a4; }
        :root.light-theme .cb-string { color: #50a14f; }
        :root.light-theme .cb-number { color: #986801; }
        :root.light-theme .cb-comment { color: #a0a1a7; }
        :root.light-theme .cb-type { color: #c18401; }
        :root.light-theme .cb-property { color: #4078f2; }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Update the code content
   */
  updateCode(code: string, language?: CodeLanguage): void {
    this.options.code = code;
    if (language) {
      this.options.language = language;
    }

    if (this.element) {
      this.element.remove();
    }
    this.render();
  }

  /**
   * Dispose of the component
   */
  dispose(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

/**
 * Create a code block component
 */
export function createCodeBlock(container: HTMLElement, options: CodeBlockOptions): CodeBlock {
  return new CodeBlock(container, options);
}

/**
 * Detect language from markdown fence
 */
export function detectLanguage(fence: string): CodeLanguage {
  const lang = fence.toLowerCase().trim();

  const aliases: Record<string, CodeLanguage> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    md: 'markdown',
    rs: 'rust',
    'c++': 'cpp',
    'c#': 'typescript', // Approximate
    csharp: 'typescript', // Approximate
  };

  if (lang in aliases) {
    return aliases[lang] as CodeLanguage;
  }

  if (lang in LANGUAGE_NAMES) {
    return lang as CodeLanguage;
  }

  return 'text';
}
