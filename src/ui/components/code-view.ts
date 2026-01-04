/**
 * Code View Component
 *
 * Displays generated code for the current selection with language switching.
 * Used in the Design/Code split view.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import { createTypeScriptReactGenerator } from '@persistence/export/typescript-react-generator';
import { createIOSCodeGenerator } from '@persistence/export/ios-code-generator';
import { createAndroidCodeGenerator } from '@persistence/export/android-code-generator';
import { copyToClipboard, showCopyFeedback } from '@devtools/code-export/clipboard';
import { createSwiftUIImporter } from '@persistence/import/swiftui/swiftui-importer';
import type { SwiftUIImportResult } from '@persistence/import/swiftui/types';

/** Supported code languages */
export type CodeLanguage = 'typescript' | 'swift' | 'kotlin';

/** Code view options */
export interface CodeViewOptions {
  defaultLanguage?: CodeLanguage;
  syntaxHighlighting?: boolean;
}

/**
 * Syntax highlighting CSS - injected into the document
 */
const SYNTAX_HIGHLIGHTING_CSS = `
/* Swift - Xcode Dark theme */
.sh-swift-keyword { color: #FC5FA3; }
.sh-swift-string { color: #FC6A5D; }
.sh-swift-type { color: #5DD8FF; }
.sh-swift-function { color: #67B7A4; }
.sh-swift-number { color: #D0BF69; }
.sh-swift-comment { color: #6C7986; }
.sh-swift-property { color: #B281EB; }
.sh-swift-attribute { color: #FF8170; }

/* Kotlin - Android Studio Darcula theme */
.sh-kotlin-keyword { color: #CC7832; }
.sh-kotlin-string { color: #6A8759; }
.sh-kotlin-type { color: #FFC66D; }
.sh-kotlin-function { color: #FFC66D; }
.sh-kotlin-number { color: #6897BB; }
.sh-kotlin-comment { color: #808080; }
.sh-kotlin-annotation { color: #BBB529; }
.sh-kotlin-property { color: #9876AA; }

/* TypeScript - VS Code Dark+ theme */
.sh-typescript-keyword { color: #569CD6; }
.sh-typescript-string { color: #CE9178; }
.sh-typescript-type { color: #4EC9B0; }
.sh-typescript-function { color: #DCDCAA; }
.sh-typescript-number { color: #B5CEA8; }
.sh-typescript-comment { color: #6A9955; }
.sh-typescript-variable { color: #9CDCFE; }
.sh-typescript-jsx { color: #808080; }
`;

// Inject syntax highlighting CSS once
let syntaxCSSInjected = false;
function ensureSyntaxCSS(): void {
  if (syntaxCSSInjected) return;
  const style = document.createElement('style');
  style.id = 'designlibre-syntax-highlighting-css';
  style.textContent = SYNTAX_HIGHLIGHTING_CSS;
  document.head.appendChild(style);
  syntaxCSSInjected = true;
}

/**
 * Code View
 *
 * Displays generated code with language switching and copy functionality.
 */
export class CodeView {
  private runtime: DesignLibreRuntime;
  private sceneGraph: SceneGraph;
  private container: HTMLElement;
  private element: HTMLElement;
  private codeElement: HTMLElement;
  private textareaElement: HTMLTextAreaElement;
  private languageSelect: HTMLSelectElement;
  private highlightToggle: HTMLButtonElement;
  private importButton: HTMLButtonElement;
  private currentLanguage: CodeLanguage;
  private syntaxHighlighting: boolean;
  private selectedNodeIds: NodeId[] = [];
  private codeCache: Map<CodeLanguage, string> = new Map();
  private unsubscribers: Array<() => void> = [];
  private isImporting: boolean = false;

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: CodeViewOptions = {}
  ) {
    this.runtime = runtime;
    this.sceneGraph = runtime.getSceneGraph();
    this.container = container;
    this.currentLanguage = options.defaultLanguage ?? 'typescript';
    // Load syntax highlighting preference from localStorage, default true
    const storedPref = localStorage.getItem('designlibre-syntax-highlighting');
    this.syntaxHighlighting = options.syntaxHighlighting ?? (storedPref === null ? true : storedPref === 'true');

    this.element = this.createView();
    this.codeElement = this.element.querySelector('.code-view-content')!;
    this.textareaElement = this.element.querySelector('.code-view-textarea')!;
    this.languageSelect = this.element.querySelector('.code-view-language')!;
    this.highlightToggle = this.element.querySelector('.code-view-highlight-toggle')!;
    this.importButton = this.element.querySelector('.code-view-import')!;

    this.container.appendChild(this.element);
    this.setupEventListeners();
    this.updateCode();
    this.updateEditableState();
  }

  private createView(): HTMLElement {
    const view = document.createElement('div');
    view.className = 'code-view';
    view.innerHTML = `
      <div class="code-view-header">
        <div class="code-view-title">Code</div>
        <select class="code-view-language">
          <option value="typescript">TypeScript (React)</option>
          <option value="swift">Swift (SwiftUI)</option>
          <option value="kotlin">Kotlin (Compose)</option>
        </select>
        <button class="code-view-highlight-toggle" title="Toggle syntax highlighting">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 8 1zM3.5 8a.5.5 0 0 1-.5-.5h-1a.5.5 0 0 1 0-1h1a.5.5 0 0 1 .5.5.5.5 0 0 1-.5.5zm9 0a.5.5 0 0 1-.5-.5.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1zm-9.743-3.95a.5.5 0 0 1 .707 0l.707.707a.5.5 0 1 1-.707.707l-.707-.707a.5.5 0 0 1 0-.707zm9.193.707a.5.5 0 0 1-.707-.707l.707-.707a.5.5 0 0 1 .707.707l-.707.707zM8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
          </svg>
        </button>
        <button class="code-view-import" title="Import SwiftUI code as design layers" style="display: none;">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0l4 4h-3v6h-2V4H4l4-4zm-8 10h16v6H0v-6zm2 2v2h12v-2H2z"/>
          </svg>
        </button>
        <button class="code-view-copy" title="Copy to clipboard">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 4v-2.5c0-.83.67-1.5 1.5-1.5h7c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-2.5v2.5c0 .83-.67 1.5-1.5 1.5h-7c-.83 0-1.5-.67-1.5-1.5v-9c0-.83.67-1.5 1.5-1.5h2.5zm1 0h4c.83 0 1.5.67 1.5 1.5v5.5h2v-9h-7v2zm-2.5 1h7v9h-7v-9z"/>
          </svg>
        </button>
      </div>
      <div class="code-view-body">
        <pre class="code-view-content"><code>Select an element to see generated code</code></pre>
        <textarea class="code-view-textarea" placeholder="Paste SwiftUI code here to render as design layers..." spellcheck="false"></textarea>
      </div>
    `;

    // Set initial language selection
    const select = view.querySelector('.code-view-language') as HTMLSelectElement;
    select.value = this.currentLanguage;

    // Set initial highlight toggle state
    const highlightBtn = view.querySelector('.code-view-highlight-toggle') as HTMLButtonElement;
    highlightBtn.classList.toggle('active', this.syntaxHighlighting);

    return view;
  }

  private setupEventListeners(): void {
    // Language change
    this.languageSelect.addEventListener('change', () => {
      this.currentLanguage = this.languageSelect.value as CodeLanguage;
      this.updateCode();
      this.updateEditableState();
    });

    // Textarea paste handler for SwiftUI import
    this.textareaElement.addEventListener('paste', async (e) => {
      await this.handlePaste(e);
    });

    // Import button click
    this.importButton.addEventListener('click', async () => {
      const code = this.textareaElement.value.trim();
      if (code && this.looksLikeSwiftUI(code)) {
        await this.importSwiftUICode(code);
      }
    });

    // Syntax highlight toggle
    this.highlightToggle.addEventListener('click', () => {
      this.syntaxHighlighting = !this.syntaxHighlighting;
      this.highlightToggle.classList.toggle('active', this.syntaxHighlighting);
      this.highlightToggle.title = this.syntaxHighlighting
        ? 'Syntax highlighting ON (click for plain text)'
        : 'Syntax highlighting OFF (click for colors)';
      // Save to localStorage
      localStorage.setItem('designlibre-syntax-highlighting', String(this.syntaxHighlighting));
      this.updateCode();
    });

    // Copy button
    const copyBtn = this.element.querySelector('.code-view-copy');
    copyBtn?.addEventListener('click', async () => {
      const code = this.codeElement.textContent ?? '';
      if (code && code !== 'Select an element to see generated code' && code !== 'No element selected') {
        const result = await copyToClipboard(code);
        showCopyFeedback(copyBtn as HTMLElement, result.success);
      }
    });

    // Selection change
    const unsubSelection = this.runtime.on('selection:changed', (event: unknown) => {
      const { nodeIds } = event as { nodeIds: NodeId[] };
      this.selectedNodeIds = [...nodeIds];
      this.codeCache.clear();
      this.updateCode();
    });
    this.unsubscribers.push(unsubSelection);

    // Property change
    const unsubProperty = this.runtime.on('node:propertyChanged', (event: unknown) => {
      const { nodeId } = event as { nodeId: NodeId };
      if (this.selectedNodeIds.includes(nodeId)) {
        this.codeCache.clear();
        this.updateCode();
      }
    });
    this.unsubscribers.push(unsubProperty);

    // Listen for settings changes from the Settings menu
    const settingsHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { syntaxHighlighting?: boolean };
      if (detail.syntaxHighlighting !== undefined) {
        this.syntaxHighlighting = detail.syntaxHighlighting;
        this.highlightToggle.classList.toggle('active', this.syntaxHighlighting);
        this.updateCode();
      }
    };
    window.addEventListener('designlibre-settings-changed', settingsHandler);
    this.unsubscribers.push(() => window.removeEventListener('designlibre-settings-changed', settingsHandler));
  }

  private updateCode(): void {
    if (this.selectedNodeIds.length === 0) {
      this.codeElement.innerHTML = '<code>Select an element to see generated code</code>';
      return;
    }

    // Check cache
    const cached = this.codeCache.get(this.currentLanguage);
    if (cached) {
      this.codeElement.innerHTML = `<code>${this.escapeHtml(cached)}</code>`;
      this.applySyntaxHighlighting();
      return;
    }

    // Generate code for first selected node
    const nodeId = this.selectedNodeIds[0]!;
    const code = this.generateCode(nodeId, this.currentLanguage);

    this.codeCache.set(this.currentLanguage, code);
    this.codeElement.innerHTML = `<code>${this.escapeHtml(code)}</code>`;
    this.applySyntaxHighlighting();
  }

  private generateCode(nodeId: NodeId, language: CodeLanguage): string {
    try {
      switch (language) {
        case 'typescript': {
          const generator = createTypeScriptReactGenerator(this.sceneGraph);
          const result = generator.generate(nodeId, {
            includeComments: false,
            includeTypes: true,
          });
          return result.code;
        }
        case 'swift': {
          const generator = createIOSCodeGenerator(this.sceneGraph);
          const result = generator.generate(nodeId, {
            language: 'swift',
            framework: 'swiftui',
            includeComments: false,
            includePreview: true,
          });
          return result.code;
        }
        case 'kotlin': {
          const generator = createAndroidCodeGenerator(this.sceneGraph);
          const result = generator.generate(nodeId, {
            language: 'kotlin',
            framework: 'compose',
            includeComments: false,
            includePreview: true,
          });
          return result.code;
        }
        default:
          return '// Unsupported language';
      }
    } catch (e) {
      console.error('Code generation error:', e);
      return `// Error generating code\n// ${e instanceof Error ? e.message : 'Unknown error'}`;
    }
  }

  private applySyntaxHighlighting(): void {
    const codeEl = this.codeElement.querySelector('code');
    if (!codeEl) return;

    // Ensure CSS is injected
    ensureSyntaxCSS();

    // If syntax highlighting is off, just show plain white text
    if (!this.syntaxHighlighting) {
      codeEl.style.color = '#ffffff';
      return;
    }

    // Get the raw code text
    const code = codeEl.textContent ?? '';

    // Tokenize and colorize
    const highlighted = this.highlightCode(code, this.currentLanguage);
    codeEl.innerHTML = highlighted;
    codeEl.style.color = '';
  }

  /**
   * Highlight code using single-pass tokenization to avoid regex conflicts
   */
  private highlightCode(code: string, language: CodeLanguage): string {
    const prefix = `sh-${language}`;
    const tokens: Array<{ type: string; text: string }> = [];
    let remaining = code;

    // Get patterns for the language
    const patterns = this.getPatterns(language, prefix);

    // Single-pass tokenization
    while (remaining.length > 0) {
      let matched = false;

      for (const { regex, type } of patterns) {
        regex.lastIndex = 0;
        const match = regex.exec(remaining);
        if (match && match.index === 0) {
          tokens.push({ type, text: match[0] });
          remaining = remaining.slice(match[0].length);
          matched = true;
          break;
        }
      }

      // If no pattern matched, take one character as plain text
      if (!matched) {
        const lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === '') {
          lastToken.text += remaining[0];
        } else {
          tokens.push({ type: '', text: remaining[0]! });
        }
        remaining = remaining.slice(1);
      }
    }

    // Build result HTML
    return tokens.map(token => {
      const escaped = this.escapeHtml(token.text);
      if (token.type) {
        return `<span class="${token.type}">${escaped}</span>`;
      }
      return escaped;
    }).join('');
  }

  /**
   * Get regex patterns for a language, ordered by priority
   */
  private getPatterns(language: CodeLanguage, prefix: string): Array<{ regex: RegExp; type: string }> {
    const common = [
      // Comments first (highest priority)
      { regex: /^\/\/.*/, type: `${prefix}-comment` },
      { regex: /^\/\*[\s\S]*?\*\//, type: `${prefix}-comment` },
      // Strings
      { regex: /^"(?:[^"\\]|\\.)*"/, type: `${prefix}-string` },
      { regex: /^'(?:[^'\\]|\\.)*'/, type: `${prefix}-string` },
      // Numbers
      { regex: /^\d+\.?\d*[fFL]?/, type: `${prefix}-number` },
    ];

    switch (language) {
      case 'swift':
        return [
          ...common,
          // Attributes
          { regex: /^@\w+/, type: `${prefix}-attribute` },
          // Keywords
          { regex: /^(?:import|struct|class|func|var|let|if|else|guard|return|self|private|public|internal|static|mutating|init|deinit|enum|case|switch|for|in|while|do|try|catch|throw|throws|async|await|some|any|protocol|extension|where|typealias|associatedtype)\b/, type: `${prefix}-keyword` },
          // Types (capitalized identifiers)
          { regex: /^[A-Z][a-zA-Z0-9]*/, type: `${prefix}-type` },
          // Identifiers (lowercase)
          { regex: /^[a-z_][a-zA-Z0-9_]*/, type: '' },
          // Whitespace and punctuation
          { regex: /^\s+/, type: '' },
          { regex: /^[{}()\[\];,.<>:=+\-*/%&|^!?#]/, type: '' },
        ];

      case 'kotlin':
        return [
          ...common,
          // Annotations
          { regex: /^@\w+/, type: `${prefix}-annotation` },
          // Keywords
          { regex: /^(?:package|import|class|object|interface|fun|val|var|if|else|when|for|while|do|return|this|super|private|public|internal|protected|open|sealed|data|enum|annotation|companion|override|abstract|final|suspend|inline|infix|operator|by|in|out|is|as|null|true|false)\b/, type: `${prefix}-keyword` },
          // Types
          { regex: /^[A-Z][a-zA-Z0-9]*/, type: `${prefix}-type` },
          // Identifiers
          { regex: /^[a-z_][a-zA-Z0-9_]*/, type: '' },
          // Whitespace and punctuation
          { regex: /^\s+/, type: '' },
          { regex: /^[{}()\[\];,.<>:=+\-*/%&|^!?#]/, type: '' },
        ];

      case 'typescript':
        return [
          ...common,
          // Template literals
          { regex: /^`(?:[^`\\]|\\.)*`/, type: `${prefix}-string` },
          // JSX tags
          { regex: /^<\/?[a-zA-Z][a-zA-Z0-9]*/, type: `${prefix}-jsx` },
          { regex: /^\/>/, type: `${prefix}-jsx` },
          // Keywords
          { regex: /^(?:import|export|from|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|class|extends|implements|interface|type|enum|namespace|module|declare|async|await|new|this|super|static|private|public|protected|readonly|abstract|as|typeof|instanceof|in|of|void|null|undefined|true|false|try|catch|finally|throw)\b/, type: `${prefix}-keyword` },
          // Types
          { regex: /^[A-Z][a-zA-Z0-9]*/, type: `${prefix}-type` },
          // Function calls (identifier followed by paren)
          { regex: /^[a-z_][a-zA-Z0-9_]*(?=\s*\()/, type: `${prefix}-function` },
          // Identifiers
          { regex: /^[a-z_][a-zA-Z0-9_]*/, type: `${prefix}-variable` },
          // Whitespace and punctuation
          { regex: /^\s+/, type: '' },
          { regex: /^[{}()\[\];,.<>:=+\-*/%&|^!?]/, type: '' },
        ];

      default:
        return common;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================================================
  // SwiftUI Import
  // ============================================================================

  /**
   * Update editable state based on current language
   */
  private updateEditableState(): void {
    const isEditable = this.currentLanguage === 'swift';
    this.element.classList.toggle('editable', isEditable);
    this.importButton.style.display = isEditable ? 'flex' : 'none';

    if (isEditable) {
      // Show textarea, hide code display
      this.codeElement.style.display = 'none';
      this.textareaElement.style.display = 'block';
      // Populate textarea with current generated code
      const cached = this.codeCache.get('swift');
      if (cached) {
        this.textareaElement.value = cached;
      }
    } else {
      // Show code display, hide textarea
      this.codeElement.style.display = 'block';
      this.textareaElement.style.display = 'none';
    }
  }

  /**
   * Handle paste event in the textarea
   */
  private async handlePaste(e: ClipboardEvent): Promise<void> {
    if (this.currentLanguage !== 'swift' || this.isImporting) return;

    const text = e.clipboardData?.getData('text');
    if (!text) return;

    // Check if it looks like SwiftUI code
    if (this.looksLikeSwiftUI(text)) {
      e.preventDefault();
      this.textareaElement.value = text;
      await this.importSwiftUICode(text);
    }
    // Otherwise, let the default paste behavior happen
  }

  /**
   * Check if code looks like SwiftUI
   */
  private looksLikeSwiftUI(code: string): boolean {
    return (
      code.includes('import SwiftUI') ||
      code.includes(': View') ||
      code.includes('@ViewBuilder') ||
      /\b(VStack|HStack|ZStack|Text|Image|Button|Rectangle|Circle|Ellipse|RoundedRectangle|Capsule|NavigationView|List|ForEach|ScrollView|Spacer|Divider)\s*[({]/.test(code)
    );
  }

  /**
   * Import SwiftUI code as design layers
   */
  private async importSwiftUICode(code: string): Promise<void> {
    if (this.isImporting) return;
    this.isImporting = true;

    try {
      const importer = createSwiftUIImporter(this.sceneGraph);

      // Get viewport center for placement
      const { x, y } = this.getViewportCenter();

      const result = await importer.import(code, 'pasted-code.swift', {
        x,
        y,
        preserveSourceMetadata: true,
      });

      // Select the newly created root node
      this.runtime.emit('selection:set', { nodeIds: [result.rootId] });

      // Show feedback
      this.showImportFeedback(result);

    } catch (error) {
      this.showImportError(error);
    } finally {
      this.isImporting = false;
    }
  }

  /**
   * Get the center of the current viewport
   */
  private getViewportCenter(): { x: number; y: number } {
    // Try to get viewport from canvas container
    const canvasContainer = document.querySelector('.designlibre-canvas-container');
    if (canvasContainer) {
      const rect = canvasContainer.getBoundingClientRect();
      // Return center in canvas coordinates (rough approximation)
      return {
        x: rect.width / 2 - 187.5, // Half of default iPhone width (375/2)
        y: rect.height / 2 - 406, // Half of default iPhone height (812/2)
      };
    }
    return { x: 100, y: 100 };
  }

  /**
   * Show import success feedback
   */
  private showImportFeedback(result: SwiftUIImportResult): void {
    const viewCount = result.viewsFound.length;
    const msg = `Imported ${result.nodeCount} layer${result.nodeCount !== 1 ? 's' : ''} from ${viewCount} SwiftUI view${viewCount !== 1 ? 's' : ''}`;

    this.showToast(msg, result.warnings.length > 0 ? 'warning' : 'success');

    if (result.warnings.length > 0) {
      console.warn('SwiftUI import warnings:', result.warnings);
    }
  }

  /**
   * Show import error feedback
   */
  private showImportError(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.showToast(`Import failed: ${message}`, 'error');
    console.error('SwiftUI import error:', error);
  }

  /**
   * Show a toast notification
   */
  private showToast(message: string, type: 'success' | 'warning' | 'error'): void {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `code-view-toast code-view-toast-${type}`;
    toast.textContent = message;

    // Add to document
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    // Remove after delay
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Get the view element.
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Set the current language.
   */
  setLanguage(language: CodeLanguage): void {
    this.currentLanguage = language;
    this.languageSelect.value = language;
    this.updateCode();
  }

  /**
   * Get the current language.
   */
  getLanguage(): CodeLanguage {
    return this.currentLanguage;
  }

  /**
   * Dispose of the code view.
   */
  dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.codeCache.clear();
    this.element.remove();
  }
}

/**
 * Create a code view.
 */
export function createCodeView(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: CodeViewOptions
): CodeView {
  return new CodeView(runtime, container, options);
}
