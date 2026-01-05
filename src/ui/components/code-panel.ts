/**
 * Code Panel
 *
 * Code export panel showing generated CSS/Swift/Kotlin for selected elements.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import { copyToClipboard, showCopyFeedback } from '@devtools/code-export/clipboard';

/** Supported code formats */
export type CodeFormat = 'css' | 'swift' | 'kotlin';

/** Code panel options */
export interface CodePanelOptions {
  defaultFormat?: CodeFormat;
  width?: number;
  position?: 'left' | 'right';
}

/**
 * Code Panel
 *
 * Displays generated code for selected elements.
 */
export class CodePanel {
  private runtime: DesignLibreRuntime;
  private sceneGraph: SceneGraph;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private codeElement: HTMLElement | null = null;
  private currentFormat: CodeFormat;
  private options: Required<CodePanelOptions>;
  private selectedNodeIds: NodeId[] = [];
  private unsubscribers: Array<() => void> = [];

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: CodePanelOptions = {}
  ) {
    this.runtime = runtime;
    this.sceneGraph = runtime.getSceneGraph();
    this.container = container;
    this.options = {
      defaultFormat: options.defaultFormat ?? 'css',
      width: options.width ?? 320,
      position: options.position ?? 'right',
    };
    this.currentFormat = this.options.defaultFormat;

    this.setup();
  }

  private setup(): void {
    // Create panel element
    this.element = document.createElement('div');
    this.element.className = 'designlibre-code-panel';
    this.element.style.cssText = this.getPanelStyles();

    // Header with tabs
    const header = this.createHeader();
    this.element.appendChild(header);

    // Code display area
    this.codeElement = document.createElement('pre');
    this.codeElement.className = 'designlibre-code-content';
    this.codeElement.style.cssText = `
      flex: 1;
      margin: 0;
      padding: 12px;
      overflow: auto;
      background: var(--designlibre-bg-secondary, #f5f5f5);
      font-family: 'SF Mono', Monaco, 'Fira Code', Consolas, monospace;
      font-size: 11px;
      line-height: 1.5;
      tab-size: 2;
      white-space: pre-wrap;
      word-break: break-word;
    `;
    this.element.appendChild(this.codeElement);

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'designlibre-code-copy-btn';
    copyBtn.style.cssText = `
      position: absolute;
      top: 48px;
      right: 12px;
      padding: 6px 12px;
      background: var(--designlibre-accent, #0066ff);
      color: white;
      border: none;
      border-radius: var(--designlibre-radius-sm, 4px);
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
    `;
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', async () => {
      if (this.codeElement) {
        const result = await copyToClipboard(this.codeElement.textContent ?? '');
        showCopyFeedback(copyBtn, result.success);
      }
    });
    this.element.appendChild(copyBtn);

    // Add to container
    this.container.appendChild(this.element);

    // Subscribe to selection changes
    const unsubSelection = this.runtime.on('selection:changed', ({ nodeIds }) => {
      this.selectedNodeIds = nodeIds;
      this.updateCode();
    });
    this.unsubscribers.push(unsubSelection);

    // Subscribe to property changes
    const unsubProperty = this.sceneGraph.on('node:propertyChanged', ({ nodeId }) => {
      if (this.selectedNodeIds.includes(nodeId)) {
        this.updateCode();
      }
    });
    this.unsubscribers.push(unsubProperty);

    // Initial update
    this.updateCode();
  }

  private getPanelStyles(): string {
    return `
      position: absolute;
      top: 0;
      ${this.options.position}: 0;
      width: ${this.options.width}px;
      height: 100%;
      background: var(--designlibre-bg-primary, #ffffff);
      border-${this.options.position === 'right' ? 'left' : 'right'}: 1px solid var(--designlibre-border, #e0e0e0);
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 100;
      box-shadow: var(--designlibre-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
    `;
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      border-bottom: 1px solid var(--designlibre-border, #e0e0e0);
    `;

    const tabs: { format: CodeFormat; label: string }[] = [
      { format: 'css', label: 'CSS' },
      { format: 'swift', label: 'Swift' },
      { format: 'kotlin', label: 'Kotlin' },
    ];

    for (const tab of tabs) {
      const tabBtn = document.createElement('button');
      tabBtn.className = `designlibre-code-tab ${tab.format === this.currentFormat ? 'active' : ''}`;
      tabBtn.style.cssText = `
        flex: 1;
        padding: 12px;
        background: ${tab.format === this.currentFormat ? 'var(--designlibre-bg-primary, #ffffff)' : 'var(--designlibre-bg-secondary, #f5f5f5)'};
        border: none;
        border-bottom: ${tab.format === this.currentFormat ? '2px solid var(--designlibre-accent, #0066ff)' : '2px solid transparent'};
        cursor: pointer;
        font-size: 12px;
        font-weight: ${tab.format === this.currentFormat ? '600' : '400'};
        color: ${tab.format === this.currentFormat ? 'var(--designlibre-accent, #0066ff)' : 'var(--designlibre-text-secondary, #666666)'};
      `;
      tabBtn.textContent = tab.label;
      tabBtn.addEventListener('click', () => {
        this.setFormat(tab.format);
        // Update all tab styles
        const allTabs = header.querySelectorAll('button');
        allTabs.forEach((btn, index) => {
          const isActive = tabs[index]?.format === this.currentFormat;
          btn.style.background = isActive ? 'var(--designlibre-bg-primary, #ffffff)' : 'var(--designlibre-bg-secondary, #f5f5f5)';
          btn.style.borderBottom = isActive ? '2px solid var(--designlibre-accent, #0066ff)' : '2px solid transparent';
          btn.style.fontWeight = isActive ? '600' : '400';
          btn.style.color = isActive ? 'var(--designlibre-accent, #0066ff)' : 'var(--designlibre-text-secondary, #666666)';
        });
      });
      header.appendChild(tabBtn);
    }

    return header;
  }

  private setFormat(format: CodeFormat): void {
    this.currentFormat = format;
    this.updateCode();
  }

  private updateCode(): void {
    if (!this.codeElement) return;

    if (this.selectedNodeIds.length === 0) {
      this.codeElement.innerHTML = this.highlightSyntax(
        '/* Select an element to generate code */',
        'css'
      );
      return;
    }

    // Generate code for the first selected node
    const nodeId = this.selectedNodeIds[0]!;
    const code = this.generateCode(nodeId);
    this.codeElement.innerHTML = this.highlightSyntax(code, this.currentFormat);
  }

  private generateCode(nodeId: NodeId): string {
    const node = this.sceneGraph.getNode(nodeId);
    if (!node) return '/* Node not found */';

    switch (this.currentFormat) {
      case 'css':
        return this.generateCSS(node);
      case 'swift':
        return this.generateSwift(node);
      case 'kotlin':
        return this.generateKotlin(node);
      default:
        return '/* Unknown format */';
    }
  }

  private generateCSS(node: any): string {
    const lines: string[] = [];
    const className = this.toClassName(node.name);

    lines.push(`.${className} {`);

    // Position and size
    if ('width' in node) {
      lines.push(`  width: ${node.width}px;`);
    }
    if ('height' in node) {
      lines.push(`  height: ${node.height}px;`);
    }

    // Opacity
    if ('opacity' in node && node.opacity !== 1) {
      lines.push(`  opacity: ${node.opacity};`);
    }

    // Background (fills)
    if ('fills' in node && node.fills?.length > 0) {
      const fill = node.fills[0];
      if (fill?.type === 'SOLID') {
        const color = this.rgbaToCSS(fill.color);
        lines.push(`  background-color: ${color};`);
      }
    }

    // Border (strokes)
    if ('strokes' in node && node.strokes?.length > 0) {
      const stroke = node.strokes[0];
      if (stroke?.type === 'SOLID') {
        const color = this.rgbaToCSS(stroke.color);
        const weight = node.strokeWeight ?? 1;
        lines.push(`  border: ${weight}px solid ${color};`);
      }
    }

    // Border radius
    if ('cornerRadius' in node && node.cornerRadius > 0) {
      lines.push(`  border-radius: ${node.cornerRadius}px;`);
    }

    // Effects (shadows)
    if ('effects' in node && node.effects?.length > 0) {
      const shadows = node.effects
        .filter((e: any) => e.type === 'DROP_SHADOW' && e.visible !== false)
        .map((e: any) => {
          const color = this.rgbaToCSS(e.color);
          return `${e.offset?.x ?? 0}px ${e.offset?.y ?? 0}px ${e.radius ?? 0}px ${e.spread ?? 0}px ${color}`;
        });
      if (shadows.length > 0) {
        lines.push(`  box-shadow: ${shadows.join(', ')};`);
      }
    }

    // Typography for text nodes
    if (node.type === 'TEXT') {
      if (node.textStyles?.length > 0) {
        const style = node.textStyles[0];
        lines.push(`  font-family: "${style.fontFamily}", sans-serif;`);
        lines.push(`  font-size: ${style.fontSize}px;`);
        lines.push(`  font-weight: ${style.fontWeight};`);
        if (style.lineHeight !== 'AUTO') {
          lines.push(`  line-height: ${style.lineHeight};`);
        }
        if (style.letterSpacing !== 0) {
          lines.push(`  letter-spacing: ${style.letterSpacing}px;`);
        }
      }
      if (node.textAlignHorizontal) {
        lines.push(`  text-align: ${node.textAlignHorizontal.toLowerCase()};`);
      }
    }

    lines.push('}');

    return lines.join('\n');
  }

  private generateSwift(node: any): string {
    const lines: string[] = [];
    const viewName = this.toPascalCase(node.name);

    lines.push('import SwiftUI');
    lines.push('');
    lines.push(`struct ${viewName}: View {`);
    lines.push('    var body: some View {');

    if (node.type === 'TEXT') {
      lines.push(`        Text("${node.characters ?? ''}")`);
      if (node.textStyles?.length > 0) {
        const style = node.textStyles[0];
        lines.push(`            .font(.custom("${style.fontFamily}", size: ${style.fontSize}))`);
        lines.push(`            .fontWeight(.init(rawValue: ${style.fontWeight}))`);
      }
    } else {
      lines.push('        Rectangle()');
    }

    // Size
    if ('width' in node && 'height' in node) {
      lines.push(`            .frame(width: ${node.width}, height: ${node.height})`);
    }

    // Background
    if ('fills' in node && node.fills?.length > 0) {
      const fill = node.fills[0];
      if (fill?.type === 'SOLID') {
        const { r, g, b, a } = fill.color;
        lines.push(`            .foregroundColor(Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)}, opacity: ${a.toFixed(3)}))`);
      }
    }

    // Corner radius
    if ('cornerRadius' in node && node.cornerRadius > 0) {
      lines.push(`            .cornerRadius(${node.cornerRadius})`);
    }

    // Opacity
    if ('opacity' in node && node.opacity !== 1) {
      lines.push(`            .opacity(${node.opacity})`);
    }

    lines.push('    }');
    lines.push('}');

    return lines.join('\n');
  }

  private generateKotlin(node: any): string {
    const lines: string[] = [];
    const funcName = this.toCamelCase(node.name);

    lines.push('import androidx.compose.foundation.background');
    lines.push('import androidx.compose.foundation.layout.*');
    lines.push('import androidx.compose.foundation.shape.RoundedCornerShape');
    lines.push('import androidx.compose.material3.Text');
    lines.push('import androidx.compose.runtime.Composable');
    lines.push('import androidx.compose.ui.Modifier');
    lines.push('import androidx.compose.ui.graphics.Color');
    lines.push('import androidx.compose.ui.unit.dp');
    lines.push('import androidx.compose.ui.unit.sp');
    lines.push('');
    lines.push('@Composable');
    lines.push(`fun ${this.toPascalCase(funcName)}() {`);

    if (node.type === 'TEXT') {
      lines.push(`    Text(`);
      lines.push(`        text = "${node.characters ?? ''}",`);
      if (node.textStyles?.length > 0) {
        const style = node.textStyles[0];
        lines.push(`        fontSize = ${style.fontSize}.sp,`);
      }
      lines.push(`    )`);
    } else {
      lines.push('    Box(');
      lines.push('        modifier = Modifier');

      // Size
      if ('width' in node && 'height' in node) {
        lines.push(`            .size(width = ${node.width}.dp, height = ${node.height}.dp)`);
      }

      // Background
      if ('fills' in node && node.fills?.length > 0) {
        const fill = node.fills[0];
        if (fill?.type === 'SOLID') {
          const hex = this.rgbaToHexInt(fill.color);
          lines.push(`            .background(Color(${hex}))`);
        }
      }

      lines.push('    ) { }');
    }

    lines.push('}');

    return lines.join('\n');
  }

  private highlightSyntax(code: string, language: CodeFormat): string {
    // Simple CSS-based syntax highlighting
    let highlighted = this.escapeHtml(code);

    if (language === 'css') {
      // CSS keywords
      highlighted = highlighted.replace(
        /\b(px|em|rem|%|vh|vw|solid|none|auto)\b/g,
        '<span style="color: #0066ff;">$1</span>'
      );
      // Property names
      highlighted = highlighted.replace(
        /([a-z-]+)(?=\s*:)/g,
        '<span style="color: #9932cc;">$1</span>'
      );
      // Values
      highlighted = highlighted.replace(
        /(#[a-fA-F0-9]{3,8})/g,
        '<span style="color: #098658;">$1</span>'
      );
      // Comments
      highlighted = highlighted.replace(
        /(\/\*[\s\S]*?\*\/)/g,
        '<span style="color: #6a737d;">$1</span>'
      );
    } else if (language === 'swift') {
      // Swift keywords
      highlighted = highlighted.replace(
        /\b(import|struct|var|let|func|return|some|View|body)\b/g,
        '<span style="color: #af00db;">$1</span>'
      );
      // Types
      highlighted = highlighted.replace(
        /\b(Text|Rectangle|Color|SwiftUI)\b/g,
        '<span style="color: #267f99;">$1</span>'
      );
      // Numbers
      highlighted = highlighted.replace(
        /\b(\d+\.?\d*)\b/g,
        '<span style="color: #098658;">$1</span>'
      );
    } else if (language === 'kotlin') {
      // Kotlin keywords
      highlighted = highlighted.replace(
        /\b(import|fun|val|var|return|package)\b/g,
        '<span style="color: #af00db;">$1</span>'
      );
      // Annotations
      highlighted = highlighted.replace(
        /(@\w+)/g,
        '<span style="color: #795e26;">$1</span>'
      );
      // Types
      highlighted = highlighted.replace(
        /\b(Modifier|Color|Box|Text|Composable)\b/g,
        '<span style="color: #267f99;">$1</span>'
      );
    }

    return highlighted;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private toClassName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private toCamelCase(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
  }

  private toPascalCase(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private rgbaToCSS(color: { r: number; g: number; b: number; a: number }): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    if (color.a === 1) {
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
  }

  private rgbaToHexInt(color: { r: number; g: number; b: number; a: number }): string {
    const a = Math.round(color.a * 255);
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    const hex = ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
    return `0x${hex.toString(16).toUpperCase().padStart(8, '0')}`;
  }

  /** Show the panel */
  show(): void {
    if (this.element) {
      this.element.style.display = 'flex';
    }
  }

  /** Hide the panel */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /** Dispose of the panel */
  dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.codeElement = null;
  }
}

/**
 * Create a code panel.
 */
export function createCodePanel(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: CodePanelOptions
): CodePanel {
  return new CodePanel(runtime, container, options);
}
