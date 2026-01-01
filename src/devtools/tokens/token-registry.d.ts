/**
 * Token Registry
 *
 * Central store for all design tokens with CRUD operations and events.
 */
import { EventEmitter } from '@core/events/event-emitter';
import type { RGBA } from '@core/types/color';
import type { TokenType, ThemeMode, AnyDesignToken, ColorToken, TypographyToken, TypographyValue, SerializedTokens } from './token-types';
/**
 * Token registry events
 */
export type TokenRegistryEvents = {
    'token:added': {
        token: AnyDesignToken;
    };
    'token:updated': {
        token: AnyDesignToken;
        changes: Partial<AnyDesignToken>;
    };
    'token:deleted': {
        tokenId: string;
    };
    'theme:changed': {
        theme: ThemeMode;
    };
    'tokens:cleared': undefined;
    'tokens:imported': {
        count: number;
    };
};
/**
 * Token Registry
 *
 * Central store for managing design tokens.
 */
export declare class TokenRegistry extends EventEmitter<TokenRegistryEvents> {
    private tokens;
    private tokensByType;
    private tokensByGroup;
    private activeTheme;
    constructor();
    /**
     * Register a new token.
     */
    register(token: AnyDesignToken): void;
    /**
     * Update an existing token.
     */
    update(id: string, updates: Partial<Omit<AnyDesignToken, 'id' | 'type'>>): void;
    /**
     * Delete a token.
     */
    delete(id: string): boolean;
    /**
     * Get a token by ID.
     */
    get(id: string): AnyDesignToken | undefined;
    /**
     * Check if a token exists.
     */
    has(id: string): boolean;
    /**
     * Get all tokens.
     */
    getAll(): AnyDesignToken[];
    /**
     * Get token count.
     */
    get size(): number;
    /**
     * Clear all tokens.
     */
    clear(): void;
    /**
     * Get all tokens of a specific type.
     */
    getByType<T extends AnyDesignToken>(type: TokenType): T[];
    /**
     * Get all tokens in a group.
     */
    getByGroup(group: string): AnyDesignToken[];
    /**
     * Get all unique group names.
     */
    getGroups(): string[];
    /**
     * Find a color token by value.
     */
    findColorByValue(color: RGBA, tolerance?: number): ColorToken | undefined;
    /**
     * Find a typography token by value.
     */
    findTypographyByValue(value: TypographyValue): TypographyToken | undefined;
    /**
     * Find a spacing token by value.
     */
    findSpacingByValue(value: number): AnyDesignToken | undefined;
    /**
     * Set the active theme.
     */
    setActiveTheme(theme: ThemeMode): void;
    /**
     * Get the active theme.
     */
    getActiveTheme(): ThemeMode;
    /**
     * Get the themed value for a color token.
     */
    getThemedColorValue(token: ColorToken): RGBA;
    /**
     * Serialize all tokens to JSON.
     */
    toJSON(): SerializedTokens;
    /**
     * Load tokens from JSON.
     */
    fromJSON(data: SerializedTokens): void;
    private deserializeToken;
}
/**
 * Create a token registry.
 */
export declare function createTokenRegistry(): TokenRegistry;
//# sourceMappingURL=token-registry.d.ts.map