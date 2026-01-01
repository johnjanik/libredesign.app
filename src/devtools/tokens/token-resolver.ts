/**
 * Token Resolver
 *
 * Resolves node properties to token references.
 */

import type { TextNodeData, TextStyleRange } from '@scene/nodes/base-node';
import { isSceneNode } from '@scene/nodes/base-node';
import type { Paint, SolidPaint } from '@core/types/paint';
import type { Effect, DropShadowEffect, InnerShadowEffect } from '@core/types/effect';
import type { RGBA } from '@core/types/color';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { TokenRegistry } from './token-registry';
import type {
  AnyDesignToken,
  ColorToken,
  TypographyToken,
  SpacingToken,
  ShadowToken,
  TokenReference,
  TokenUsageReport,
  TypographyValue,
} from './token-types';

/**
 * Token Resolver
 *
 * Resolves node properties to design tokens.
 */
export class TokenResolver {
  constructor(
    private readonly registry: TokenRegistry,
    private readonly sceneGraph: SceneGraph
  ) {}

  // ===========================================================================
  // Value Resolution
  // ===========================================================================

  /**
   * Find a matching color token for a color value.
   */
  resolveColor(color: RGBA): ColorToken | null {
    const token = this.registry.findColorByValue(color);
    return token ?? null;
  }

  /**
   * Find a matching typography token for text style.
   */
  resolveTypography(style: TextStyleRange): TypographyToken | null {
    const value: TypographyValue = {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight === 'AUTO' ? 'auto' : style.lineHeight,
      letterSpacing: style.letterSpacing,
    };
    const token = this.registry.findTypographyByValue(value);
    return token ?? null;
  }

  /**
   * Find a matching spacing token for a value.
   */
  resolveSpacing(value: number): SpacingToken | null {
    const token = this.registry.findSpacingByValue(value);
    return token as SpacingToken | null;
  }

  /**
   * Find a matching shadow token for an effect.
   */
  resolveShadow(effect: DropShadowEffect | InnerShadowEffect): ShadowToken | null {
    const shadowTokens = this.registry.getByType<ShadowToken>('shadow');

    for (const token of shadowTokens) {
      const tv = token.value;
      if (
        tv.offsetX === effect.offset.x &&
        tv.offsetY === effect.offset.y &&
        tv.blur === effect.radius &&
        tv.spread === effect.spread &&
        this.colorsMatch(tv.color, effect.color)
      ) {
        return token;
      }
    }

    return null;
  }

  // ===========================================================================
  // Node Token Extraction
  // ===========================================================================

  /**
   * Extract all token references from a node.
   */
  extractTokenReferences(nodeId: string): TokenReference[] {
    const node = this.sceneGraph.getNode(nodeId as any);
    if (!node) return [];

    const references: TokenReference[] = [];

    // Extract color references from fills
    if (isSceneNode(node)) {
      const sceneNode = node as { fills?: readonly Paint[]; strokes?: readonly Paint[]; effects?: readonly Effect[] };

      // Fills
      if (sceneNode.fills) {
        for (let i = 0; i < sceneNode.fills.length; i++) {
          const fill = sceneNode.fills[i]!;
          if (fill.type === 'SOLID') {
            const solidFill = fill as SolidPaint;
            const token = this.resolveColor(solidFill.color);
            references.push({
              path: ['fills', String(i), 'color'],
              token,
              rawValue: solidFill.color,
            });
          }
        }
      }

      // Strokes
      if (sceneNode.strokes) {
        for (let i = 0; i < sceneNode.strokes.length; i++) {
          const stroke = sceneNode.strokes[i]!;
          if (stroke.type === 'SOLID') {
            const solidStroke = stroke as SolidPaint;
            const token = this.resolveColor(solidStroke.color);
            references.push({
              path: ['strokes', String(i), 'color'],
              token,
              rawValue: solidStroke.color,
            });
          }
        }
      }

      // Effects
      if (sceneNode.effects) {
        for (let i = 0; i < sceneNode.effects.length; i++) {
          const effect = sceneNode.effects[i]!;
          if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
            const shadowEffect = effect as DropShadowEffect | InnerShadowEffect;

            // Shadow as a whole
            const shadowToken = this.resolveShadow(shadowEffect);
            references.push({
              path: ['effects', String(i)],
              token: shadowToken,
              rawValue: shadowEffect,
            });

            // Shadow color
            const colorToken = this.resolveColor(shadowEffect.color);
            references.push({
              path: ['effects', String(i), 'color'],
              token: colorToken,
              rawValue: shadowEffect.color,
            });
          }
        }
      }
    }

    // Text styles
    if (node.type === 'TEXT') {
      const textNode = node as TextNodeData;
      if (textNode.textStyles) {
        for (let i = 0; i < textNode.textStyles.length; i++) {
          const style = textNode.textStyles[i]!;

          // Typography
          const typographyToken = this.resolveTypography(style);
          references.push({
            path: ['textStyles', String(i)],
            token: typographyToken,
            rawValue: style,
          });

          // Text fill colors
          if (style.fills) {
            for (let j = 0; j < style.fills.length; j++) {
              const fill = style.fills[j]!;
              if (fill.type === 'SOLID') {
                const solidFill = fill as SolidPaint;
                const colorToken = this.resolveColor(solidFill.color);
                references.push({
                  path: ['textStyles', String(i), 'fills', String(j), 'color'],
                  token: colorToken,
                  rawValue: solidFill.color,
                });
              }
            }
          }
        }
      }
    }

    return references;
  }

  /**
   * Get a complete token usage report for a node.
   */
  getTokenUsage(nodeId: string): TokenUsageReport {
    const references = this.extractTokenReferences(nodeId);
    const unresolvedCount = references.filter(ref => ref.token === null).length;

    return {
      nodeId,
      references,
      unresolvedCount,
    };
  }

  /**
   * Get token usage for multiple nodes.
   */
  getTokenUsageForNodes(nodeIds: string[]): TokenUsageReport[] {
    return nodeIds.map(id => this.getTokenUsage(id));
  }

  /**
   * Find all nodes that use a specific token.
   */
  findNodesUsingToken(tokenId: string): string[] {
    const token = this.registry.get(tokenId);
    if (!token) return [];

    const nodeIds: string[] = [];
    const allNodes = this.getAllNodeIds();

    for (const nodeId of allNodes) {
      const references = this.extractTokenReferences(nodeId);
      const usesToken = references.some(ref => ref.token?.id === tokenId);
      if (usesToken) {
        nodeIds.push(nodeId);
      }
    }

    return nodeIds;
  }

  // ===========================================================================
  // Token Suggestions
  // ===========================================================================

  /**
   * Suggest tokens that could be created from a node's properties.
   */
  suggestTokensFromNode(nodeId: string): AnyDesignToken[] {
    const references = this.extractTokenReferences(nodeId);
    const suggestions: AnyDesignToken[] = [];

    for (const ref of references) {
      // Only suggest for unresolved values
      if (ref.token !== null) continue;

      // Suggest color token
      if (this.isRGBA(ref.rawValue)) {
        const color = ref.rawValue as RGBA;
        // Generate a name based on the path
        const name = this.generateTokenName(ref.path, 'color');
        suggestions.push({
          id: `suggestion_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          name,
          type: 'color',
          value: color,
        } as ColorToken);
      }
    }

    return suggestions;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private colorsMatch(a: RGBA, b: RGBA, tolerance: number = 0.001): boolean {
    return (
      Math.abs(a.r - b.r) < tolerance &&
      Math.abs(a.g - b.g) < tolerance &&
      Math.abs(a.b - b.b) < tolerance &&
      Math.abs(a.a - b.a) < tolerance
    );
  }

  private isRGBA(value: unknown): value is RGBA {
    return (
      typeof value === 'object' &&
      value !== null &&
      'r' in value &&
      'g' in value &&
      'b' in value &&
      'a' in value
    );
  }

  private getAllNodeIds(): string[] {
    const doc = this.sceneGraph.getDocument();
    if (!doc) return [];

    const ids: string[] = [];
    const collectIds = (nodeId: string) => {
      ids.push(nodeId);
      const children = this.sceneGraph.getChildIds(nodeId as any);
      for (const childId of children) {
        collectIds(childId as string);
      }
    };

    collectIds(doc.id as string);
    return ids;
  }

  private generateTokenName(path: readonly string[], type: string): string {
    // Generate a reasonable name from the property path
    const pathStr = path.filter(p => isNaN(Number(p))).join('-');
    return `${type}-${pathStr}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
}

/**
 * Create a token resolver.
 */
export function createTokenResolver(
  registry: TokenRegistry,
  sceneGraph: SceneGraph
): TokenResolver {
  return new TokenResolver(registry, sceneGraph);
}
