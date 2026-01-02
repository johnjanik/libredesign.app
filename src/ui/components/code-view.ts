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

/** Supported code languages */
export type CodeLanguage = 'typescript' | 'swift' | 'kotlin';

/** Code view options */
export interface CodeViewOptions {
  defaultLanguage?: CodeLanguage;
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
  private languageSelect: HTMLSelectElement;
  private currentLanguage: CodeLanguage;
  private selectedNodeIds: NodeId[] = [];
  private codeCache: Map<CodeLanguage, string> = new Map();
  private unsubscribers: Array<() => void> = [];

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: CodeViewOptions = {}
  ) {
    this.runtime = runtime;
    this.sceneGraph = runtime.getSceneGraph();
    this.container = container;
    this.currentLanguage = options.defaultLanguage ?? 'typescript';

    this.element = this.createView();
    this.codeElement = this.element.querySelector('.code-view-content')!;
    this.languageSelect = this.element.querySelector('.code-view-language')!;

    this.container.appendChild(this.element);
    this.setupEventListeners();
    this.updateCode();
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
        <button class="code-view-copy" title="Copy to clipboard">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 4v-2.5c0-.83.67-1.5 1.5-1.5h7c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-2.5v2.5c0 .83-.67 1.5-1.5 1.5h-7c-.83 0-1.5-.67-1.5-1.5v-9c0-.83.67-1.5 1.5-1.5h2.5zm1 0h4c.83 0 1.5.67 1.5 1.5v5.5h2v-9h-7v2zm-2.5 1h7v9h-7v-9z"/>
          </svg>
        </button>
      </div>
      <pre class="code-view-content"><code>Select an element to see generated code</code></pre>
    `;

    // Set initial language selection
    const select = view.querySelector('.code-view-language') as HTMLSelectElement;
    select.value = this.currentLanguage;

    return view;
  }

  private setupEventListeners(): void {
    // Language change
    this.languageSelect.addEventListener('change', () => {
      this.currentLanguage = this.languageSelect.value as CodeLanguage;
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
    // Simple CSS-based syntax highlighting
    const codeEl = this.codeElement.querySelector('code');
    if (!codeEl) return;

    // Add language class for potential external highlighters
    codeEl.className = `language-${this.currentLanguage === 'typescript' ? 'tsx' : this.currentLanguage}`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
