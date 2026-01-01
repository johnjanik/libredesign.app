/**
 * Token Registry
 *
 * Central store for all design tokens with CRUD operations and events.
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { RGBA } from '@core/types/color';
import { colorsEqual } from '@core/types/color';
import type {
  TokenType,
  ThemeMode,
  AnyDesignToken,
  ColorToken,
  TypographyToken,
  TypographyValue,
  SerializedTokens,
  SerializedToken,
} from './token-types';

/**
 * Token registry events
 */
export type TokenRegistryEvents = {
  'token:added': { token: AnyDesignToken };
  'token:updated': { token: AnyDesignToken; changes: Partial<AnyDesignToken> };
  'token:deleted': { tokenId: string };
  'theme:changed': { theme: ThemeMode };
  'tokens:cleared': undefined;
  'tokens:imported': { count: number };
};

/**
 * Token Registry
 *
 * Central store for managing design tokens.
 */
export class TokenRegistry extends EventEmitter<TokenRegistryEvents> {
  private tokens: Map<string, AnyDesignToken> = new Map();
  private tokensByType: Map<TokenType, Set<string>> = new Map();
  private tokensByGroup: Map<string, Set<string>> = new Map();
  private activeTheme: ThemeMode = 'light';

  constructor() {
    super();
    // Initialize type maps
    const types: TokenType[] = ['color', 'typography', 'spacing', 'shadow', 'radius', 'opacity'];
    for (const type of types) {
      this.tokensByType.set(type, new Set());
    }
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  /**
   * Register a new token.
   */
  register(token: AnyDesignToken): void {
    if (this.tokens.has(token.id)) {
      throw new Error(`Token with id "${token.id}" already exists`);
    }

    this.tokens.set(token.id, token);

    // Add to type index
    const typeSet = this.tokensByType.get(token.type);
    typeSet?.add(token.id);

    // Add to group index
    if (token.group) {
      let groupSet = this.tokensByGroup.get(token.group);
      if (!groupSet) {
        groupSet = new Set();
        this.tokensByGroup.set(token.group, groupSet);
      }
      groupSet.add(token.id);
    }

    this.emit('token:added', { token });
  }

  /**
   * Update an existing token.
   */
  update(id: string, updates: Partial<Omit<AnyDesignToken, 'id' | 'type'>>): void {
    const existing = this.tokens.get(id);
    if (!existing) {
      throw new Error(`Token with id "${id}" not found`);
    }

    // Handle group change
    if (updates.group !== undefined && updates.group !== existing.group) {
      // Remove from old group
      if (existing.group) {
        const oldGroupSet = this.tokensByGroup.get(existing.group);
        oldGroupSet?.delete(id);
      }
      // Add to new group
      if (updates.group) {
        let newGroupSet = this.tokensByGroup.get(updates.group);
        if (!newGroupSet) {
          newGroupSet = new Set();
          this.tokensByGroup.set(updates.group, newGroupSet);
        }
        newGroupSet.add(id);
      }
    }

    // Create updated token
    const updated = { ...existing, ...updates } as AnyDesignToken;
    this.tokens.set(id, updated);

    this.emit('token:updated', { token: updated, changes: updates as Partial<AnyDesignToken> });
  }

  /**
   * Delete a token.
   */
  delete(id: string): boolean {
    const token = this.tokens.get(id);
    if (!token) {
      return false;
    }

    this.tokens.delete(id);

    // Remove from type index
    const typeSet = this.tokensByType.get(token.type);
    typeSet?.delete(id);

    // Remove from group index
    if (token.group) {
      const groupSet = this.tokensByGroup.get(token.group);
      groupSet?.delete(id);
    }

    this.emit('token:deleted', { tokenId: id });
    return true;
  }

  /**
   * Get a token by ID.
   */
  get(id: string): AnyDesignToken | undefined {
    return this.tokens.get(id);
  }

  /**
   * Check if a token exists.
   */
  has(id: string): boolean {
    return this.tokens.has(id);
  }

  /**
   * Get all tokens.
   */
  getAll(): AnyDesignToken[] {
    return Array.from(this.tokens.values());
  }

  /**
   * Get token count.
   */
  get size(): number {
    return this.tokens.size;
  }

  /**
   * Clear all tokens.
   */
  clear(): void {
    this.tokens.clear();
    for (const set of this.tokensByType.values()) {
      set.clear();
    }
    this.tokensByGroup.clear();
    this.emit('tokens:cleared');
  }

  // ===========================================================================
  // Query Operations
  // ===========================================================================

  /**
   * Get all tokens of a specific type.
   */
  getByType<T extends AnyDesignToken>(type: TokenType): T[] {
    const ids = this.tokensByType.get(type);
    if (!ids) return [];

    const tokens: T[] = [];
    for (const id of ids) {
      const token = this.tokens.get(id);
      if (token) {
        tokens.push(token as T);
      }
    }
    return tokens;
  }

  /**
   * Get all tokens in a group.
   */
  getByGroup(group: string): AnyDesignToken[] {
    const ids = this.tokensByGroup.get(group);
    if (!ids) return [];

    const tokens: AnyDesignToken[] = [];
    for (const id of ids) {
      const token = this.tokens.get(id);
      if (token) {
        tokens.push(token);
      }
    }
    return tokens;
  }

  /**
   * Get all unique group names.
   */
  getGroups(): string[] {
    return Array.from(this.tokensByGroup.keys()).filter(
      group => (this.tokensByGroup.get(group)?.size ?? 0) > 0
    );
  }

  /**
   * Find a color token by value.
   */
  findColorByValue(color: RGBA, tolerance: number = 0.001): ColorToken | undefined {
    const colorTokens = this.getByType<ColorToken>('color');
    for (const token of colorTokens) {
      if (colorsEqual(token.value, color, tolerance)) {
        return token;
      }
    }
    return undefined;
  }

  /**
   * Find a typography token by value.
   */
  findTypographyByValue(value: TypographyValue): TypographyToken | undefined {
    const tokens = this.getByType<TypographyToken>('typography');
    for (const token of tokens) {
      if (
        token.value.fontFamily === value.fontFamily &&
        token.value.fontSize === value.fontSize &&
        token.value.fontWeight === value.fontWeight &&
        token.value.lineHeight === value.lineHeight &&
        token.value.letterSpacing === value.letterSpacing
      ) {
        return token;
      }
    }
    return undefined;
  }

  /**
   * Find a spacing token by value.
   */
  findSpacingByValue(value: number): AnyDesignToken | undefined {
    const tokens = this.getByType('spacing');
    for (const token of tokens) {
      if (token.value === value) {
        return token;
      }
    }
    return undefined;
  }

  // ===========================================================================
  // Theme Support
  // ===========================================================================

  /**
   * Set the active theme.
   */
  setActiveTheme(theme: ThemeMode): void {
    if (this.activeTheme !== theme) {
      this.activeTheme = theme;
      this.emit('theme:changed', { theme });
    }
  }

  /**
   * Get the active theme.
   */
  getActiveTheme(): ThemeMode {
    return this.activeTheme;
  }

  /**
   * Get the themed value for a color token.
   */
  getThemedColorValue(token: ColorToken): RGBA {
    if (this.activeTheme === 'dark' && token.darkValue) {
      return token.darkValue;
    }
    if (this.activeTheme === 'light' && token.lightValue) {
      return token.lightValue;
    }
    return token.value;
  }

  // ===========================================================================
  // Serialization
  // ===========================================================================

  /**
   * Serialize all tokens to JSON.
   */
  toJSON(): SerializedTokens {
    const tokens: SerializedToken[] = this.getAll().map(token => {
      // Add theme variants for color tokens
      const themeProps = token.type === 'color' ? {
        ...((token as ColorToken).lightValue !== undefined && { lightValue: (token as ColorToken).lightValue }),
        ...((token as ColorToken).darkValue !== undefined && { darkValue: (token as ColorToken).darkValue }),
      } : {};

      return {
        id: token.id,
        name: token.name,
        type: token.type,
        value: token.value,
        ...(token.description !== undefined && { description: token.description }),
        ...(token.group !== undefined && { group: token.group }),
        ...themeProps,
      };
    });

    return {
      version: '1.0.0',
      tokens,
    };
  }

  /**
   * Load tokens from JSON.
   */
  fromJSON(data: SerializedTokens): void {
    this.clear();

    for (const serialized of data.tokens) {
      const token = this.deserializeToken(serialized);
      if (token) {
        // Directly add to avoid emitting individual events
        this.tokens.set(token.id, token);
        this.tokensByType.get(token.type)?.add(token.id);
        if (token.group) {
          let groupSet = this.tokensByGroup.get(token.group);
          if (!groupSet) {
            groupSet = new Set();
            this.tokensByGroup.set(token.group, groupSet);
          }
          groupSet.add(token.id);
        }
      }
    }

    this.emit('tokens:imported', { count: data.tokens.length });
  }

  private deserializeToken(data: SerializedToken): AnyDesignToken | null {
    switch (data.type) {
      case 'color':
        return {
          id: data.id,
          name: data.name,
          type: 'color',
          value: data.value as RGBA,
          description: data.description,
          group: data.group,
          lightValue: data.lightValue as RGBA | undefined,
          darkValue: data.darkValue as RGBA | undefined,
        } as ColorToken;

      case 'typography':
        return {
          id: data.id,
          name: data.name,
          type: 'typography',
          value: data.value as TypographyValue,
          description: data.description,
          group: data.group,
        } as TypographyToken;

      case 'spacing':
      case 'radius':
      case 'opacity':
        return {
          id: data.id,
          name: data.name,
          type: data.type,
          value: data.value,
          description: data.description,
          group: data.group,
        } as AnyDesignToken;

      case 'shadow':
        return {
          id: data.id,
          name: data.name,
          type: 'shadow',
          value: data.value,
          description: data.description,
          group: data.group,
        } as AnyDesignToken;

      default:
        console.warn(`Unknown token type: ${data.type}`);
        return null;
    }
  }
}

/**
 * Create a token registry.
 */
export function createTokenRegistry(): TokenRegistry {
  return new TokenRegistry();
}
