/**
 * Token Resolver
 *
 * Resolves node properties to token references.
 */
import type { TextStyleRange } from '@scene/nodes/base-node';
import type { DropShadowEffect, InnerShadowEffect } from '@core/types/effect';
import type { RGBA } from '@core/types/color';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { TokenRegistry } from './token-registry';
import type { AnyDesignToken, ColorToken, TypographyToken, SpacingToken, ShadowToken, TokenReference, TokenUsageReport } from './token-types';
/**
 * Token Resolver
 *
 * Resolves node properties to design tokens.
 */
export declare class TokenResolver {
    private readonly registry;
    private readonly sceneGraph;
    constructor(registry: TokenRegistry, sceneGraph: SceneGraph);
    /**
     * Find a matching color token for a color value.
     */
    resolveColor(color: RGBA): ColorToken | null;
    /**
     * Find a matching typography token for text style.
     */
    resolveTypography(style: TextStyleRange): TypographyToken | null;
    /**
     * Find a matching spacing token for a value.
     */
    resolveSpacing(value: number): SpacingToken | null;
    /**
     * Find a matching shadow token for an effect.
     */
    resolveShadow(effect: DropShadowEffect | InnerShadowEffect): ShadowToken | null;
    /**
     * Extract all token references from a node.
     */
    extractTokenReferences(nodeId: string): TokenReference[];
    /**
     * Get a complete token usage report for a node.
     */
    getTokenUsage(nodeId: string): TokenUsageReport;
    /**
     * Get token usage for multiple nodes.
     */
    getTokenUsageForNodes(nodeIds: string[]): TokenUsageReport[];
    /**
     * Find all nodes that use a specific token.
     */
    findNodesUsingToken(tokenId: string): string[];
    /**
     * Suggest tokens that could be created from a node's properties.
     */
    suggestTokensFromNode(nodeId: string): AnyDesignToken[];
    private colorsMatch;
    private isRGBA;
    private getAllNodeIds;
    private generateTokenName;
}
/**
 * Create a token resolver.
 */
export declare function createTokenResolver(registry: TokenRegistry, sceneGraph: SceneGraph): TokenResolver;
//# sourceMappingURL=token-resolver.d.ts.map