/**
 * Documentation Generator
 *
 * Auto-generates documentation for components.
 */

import type { NodeId } from '@core/types/common';
import type { NodeData, ComponentNodeData } from '@scene/nodes/base-node';
import { isSceneNode } from '@scene/nodes/base-node';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { TokenRegistry } from '@devtools/tokens/token-registry';
import type { AnyDesignToken } from '@devtools/tokens/token-types';
import { rgbaToHex } from '@core/types/color';

/** Property documentation */
export interface PropertyDocumentation {
  readonly name: string;
  readonly type: string;
  readonly defaultValue: string;
  readonly description?: string;
}

/** Variant documentation */
export interface VariantDocumentation {
  readonly name: string;
  readonly properties: Record<string, string>;
}

/** Component documentation */
export interface ComponentDocumentation {
  readonly name: string;
  readonly description: string;
  readonly nodeType: string;
  readonly properties: readonly PropertyDocumentation[];
  readonly variants: readonly VariantDocumentation[];
  readonly usedTokens: readonly AnyDesignToken[];
  readonly children: readonly string[];
  readonly dimensions: {
    readonly width: number;
    readonly height: number;
  };
}

/** Style guide documentation */
export interface StyleGuideDocumentation {
  readonly title: string;
  readonly sections: readonly StyleGuideSection[];
}

/** Style guide section */
export interface StyleGuideSection {
  readonly title: string;
  readonly components: readonly ComponentDocumentation[];
}

/**
 * Documentation Generator
 *
 * Generates documentation for components and style guides.
 */
export class DocumentationGenerator {
  constructor(
    private readonly sceneGraph: SceneGraph,
    private readonly tokenRegistry: TokenRegistry
  ) {}

  /**
   * Generate documentation for a component.
   */
  generateComponentDoc(componentId: NodeId): ComponentDocumentation | null {
    const node = this.sceneGraph.getNode(componentId);
    if (!node) return null;

    const properties = this.extractProperties(node);
    const variants = this.extractVariants(node);
    const usedTokens = this.findUsedTokens(componentId);
    const children = this.getChildNames(componentId);
    const dimensions = this.getDimensions(node);

    return {
      name: node.name,
      description: this.generateDescription(node),
      nodeType: node.type,
      properties,
      variants,
      usedTokens,
      children,
      dimensions,
    };
  }

  /**
   * Generate a style guide from a page.
   */
  generateStyleGuide(pageId: NodeId): StyleGuideDocumentation | null {
    const page = this.sceneGraph.getNode(pageId);
    if (!page || page.type !== 'PAGE') return null;

    const sections: StyleGuideSection[] = [];
    const childIds = this.sceneGraph.getChildIds(pageId);

    // Group components by their parent frames (sections)
    for (const childId of childIds) {
      const child = this.sceneGraph.getNode(childId);
      if (!child) continue;

      if (child.type === 'FRAME') {
        // Treat top-level frames as sections
        const sectionComponents: ComponentDocumentation[] = [];
        const frameChildIds = this.sceneGraph.getChildIds(childId);

        for (const frameChildId of frameChildIds) {
          const doc = this.generateComponentDoc(frameChildId);
          if (doc) {
            sectionComponents.push(doc);
          }
        }

        if (sectionComponents.length > 0) {
          sections.push({
            title: child.name,
            components: sectionComponents,
          });
        }
      } else if (child.type === 'COMPONENT') {
        // Standalone component
        const doc = this.generateComponentDoc(childId);
        if (doc) {
          // Add to "Components" section
          let componentsSection = sections.find(s => s.title === 'Components');
          if (!componentsSection) {
            componentsSection = { title: 'Components', components: [] };
            sections.push(componentsSection);
          }
          (componentsSection.components as ComponentDocumentation[]).push(doc);
        }
      }
    }

    return {
      title: page.name,
      sections,
    };
  }

  /**
   * Export documentation to Markdown.
   */
  exportToMarkdown(doc: ComponentDocumentation): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${doc.name}`);
    lines.push('');
    lines.push(doc.description);
    lines.push('');

    // Dimensions
    lines.push('## Dimensions');
    lines.push('');
    lines.push(`- Width: ${doc.dimensions.width}px`);
    lines.push(`- Height: ${doc.dimensions.height}px`);
    lines.push('');

    // Properties
    if (doc.properties.length > 0) {
      lines.push('## Properties');
      lines.push('');
      lines.push('| Property | Type | Default | Description |');
      lines.push('|----------|------|---------|-------------|');
      for (const prop of doc.properties) {
        lines.push(`| ${prop.name} | ${prop.type} | ${prop.defaultValue} | ${prop.description ?? ''} |`);
      }
      lines.push('');
    }

    // Variants
    if (doc.variants.length > 0) {
      lines.push('## Variants');
      lines.push('');
      for (const variant of doc.variants) {
        lines.push(`### ${variant.name}`);
        lines.push('');
        for (const [key, value] of Object.entries(variant.properties)) {
          lines.push(`- ${key}: ${value}`);
        }
        lines.push('');
      }
    }

    // Design Tokens
    if (doc.usedTokens.length > 0) {
      lines.push('## Design Tokens');
      lines.push('');
      lines.push('| Token | Type | Value |');
      lines.push('|-------|------|-------|');
      for (const token of doc.usedTokens) {
        const value = this.formatTokenValue(token);
        lines.push(`| ${token.name} | ${token.type} | ${value} |`);
      }
      lines.push('');
    }

    // Children
    if (doc.children.length > 0) {
      lines.push('## Children');
      lines.push('');
      for (const child of doc.children) {
        lines.push(`- ${child}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export documentation to HTML.
   */
  exportToHTML(doc: ComponentDocumentation): string {
    const lines: string[] = [];

    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="en">');
    lines.push('<head>');
    lines.push('  <meta charset="UTF-8">');
    lines.push(`  <title>${doc.name} - Component Documentation</title>`);
    lines.push('  <style>');
    lines.push('    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }');
    lines.push('    h1 { color: #1a1a1a; }');
    lines.push('    h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px; }');
    lines.push('    table { width: 100%; border-collapse: collapse; margin: 16px 0; }');
    lines.push('    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; }');
    lines.push('    th { background: #f5f5f5; }');
    lines.push('    .token-color { width: 20px; height: 20px; border-radius: 4px; display: inline-block; vertical-align: middle; margin-right: 8px; }');
    lines.push('  </style>');
    lines.push('</head>');
    lines.push('<body>');

    lines.push(`<h1>${this.escapeHtml(doc.name)}</h1>`);
    lines.push(`<p>${this.escapeHtml(doc.description)}</p>`);

    // Dimensions
    lines.push('<h2>Dimensions</h2>');
    lines.push(`<p>Width: ${doc.dimensions.width}px | Height: ${doc.dimensions.height}px</p>`);

    // Properties
    if (doc.properties.length > 0) {
      lines.push('<h2>Properties</h2>');
      lines.push('<table>');
      lines.push('<tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr>');
      for (const prop of doc.properties) {
        lines.push(`<tr><td>${this.escapeHtml(prop.name)}</td><td>${this.escapeHtml(prop.type)}</td><td>${this.escapeHtml(prop.defaultValue)}</td><td>${this.escapeHtml(prop.description ?? '')}</td></tr>`);
      }
      lines.push('</table>');
    }

    // Tokens
    if (doc.usedTokens.length > 0) {
      lines.push('<h2>Design Tokens</h2>');
      lines.push('<table>');
      lines.push('<tr><th>Token</th><th>Type</th><th>Value</th></tr>');
      for (const token of doc.usedTokens) {
        const value = this.formatTokenValue(token);
        let colorSwatch = '';
        if (token.type === 'color') {
          const hex = rgbaToHex(token.value as any);
          colorSwatch = `<span class="token-color" style="background: ${hex}"></span>`;
        }
        lines.push(`<tr><td>${this.escapeHtml(token.name)}</td><td>${token.type}</td><td>${colorSwatch}${this.escapeHtml(value)}</td></tr>`);
      }
      lines.push('</table>');
    }

    lines.push('</body>');
    lines.push('</html>');

    return lines.join('\n');
  }

  /**
   * Export style guide to Markdown.
   */
  exportStyleGuideToMarkdown(guide: StyleGuideDocumentation): string {
    const lines: string[] = [];

    lines.push(`# ${guide.title}`);
    lines.push('');
    lines.push('## Table of Contents');
    lines.push('');

    for (const section of guide.sections) {
      lines.push(`- [${section.title}](#${this.toSlug(section.title)})`);
      for (const component of section.components) {
        lines.push(`  - [${component.name}](#${this.toSlug(component.name)})`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    for (const section of guide.sections) {
      lines.push(`## ${section.title}`);
      lines.push('');

      for (const component of section.components) {
        lines.push(this.exportToMarkdown(component));
        lines.push('---');
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private extractProperties(node: NodeData): PropertyDocumentation[] {
    const props: PropertyDocumentation[] = [];

    if (node.type === 'COMPONENT') {
      const comp = node as ComponentNodeData;
      for (const [name, def] of Object.entries(comp.propertyDefinitions)) {
        const prop: PropertyDocumentation = {
          name,
          type: def.type,
          defaultValue: String(def.defaultValue),
        };
        props.push(prop);
      }
    }

    return props;
  }

  private extractVariants(_node: NodeData): VariantDocumentation[] {
    // For now, return empty - would need component set support
    return [];
  }

  private findUsedTokens(nodeId: NodeId): AnyDesignToken[] {
    // Find all tokens that match colors in this node
    const usedTokens: AnyDesignToken[] = [];
    const allTokens = this.tokenRegistry.getAll();

    const checkNode = (id: NodeId): void => {
      const node = this.sceneGraph.getNode(id);
      if (!node) return;

      if (isSceneNode(node)) {
        const sceneNode = node as any;

        // Check fills
        if (sceneNode.fills) {
          for (const fill of sceneNode.fills) {
            if (fill.type === 'SOLID') {
              const matchingToken = allTokens.find(t => {
                if (t.type !== 'color') return false;
                const tc = t.value as any;
                return (
                  Math.abs(tc.r - fill.color.r) < 0.01 &&
                  Math.abs(tc.g - fill.color.g) < 0.01 &&
                  Math.abs(tc.b - fill.color.b) < 0.01
                );
              });
              if (matchingToken && !usedTokens.includes(matchingToken)) {
                usedTokens.push(matchingToken);
              }
            }
          }
        }
      }

      // Recurse
      const childIds = this.sceneGraph.getChildIds(id);
      for (const childId of childIds) {
        checkNode(childId);
      }
    };

    checkNode(nodeId);
    return usedTokens;
  }

  private getChildNames(nodeId: NodeId): string[] {
    const names: string[] = [];
    const childIds = this.sceneGraph.getChildIds(nodeId);

    for (const childId of childIds) {
      const child = this.sceneGraph.getNode(childId);
      if (child) {
        names.push(child.name);
      }
    }

    return names;
  }

  private getDimensions(node: NodeData): { width: number; height: number } {
    if ('width' in node && 'height' in node) {
      const n = node as { width: number; height: number };
      return { width: n.width, height: n.height };
    }
    return { width: 0, height: 0 };
  }

  private generateDescription(node: NodeData): string {
    const type = node.type.charAt(0) + node.type.slice(1).toLowerCase();
    return `A ${type} component named "${node.name}".`;
  }

  private formatTokenValue(token: AnyDesignToken): string {
    switch (token.type) {
      case 'color':
        return rgbaToHex(token.value as any);
      case 'spacing':
      case 'radius':
        return `${token.value}px`;
      case 'opacity':
        return `${Math.round((token.value as number) * 100)}%`;
      case 'typography': {
        const t = token.value as any;
        return `${t.fontFamily} ${t.fontSize}px`;
      }
      case 'shadow': {
        const s = token.value as any;
        return `${s.offsetX}px ${s.offsetY}px ${s.blur}px`;
      }
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private toSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

/**
 * Create a documentation generator.
 */
export function createDocumentationGenerator(
  sceneGraph: SceneGraph,
  tokenRegistry: TokenRegistry
): DocumentationGenerator {
  return new DocumentationGenerator(sceneGraph, tokenRegistry);
}
