/**
 * Token Registry
 *
 * Central store for all design tokens with CRUD operations and events.
 */
import { EventEmitter } from '@core/events/event-emitter';
import { colorsEqual } from '@core/types/color';
/**
 * Token Registry
 *
 * Central store for managing design tokens.
 */
export class TokenRegistry extends EventEmitter {
    tokens = new Map();
    tokensByType = new Map();
    tokensByGroup = new Map();
    activeTheme = 'light';
    constructor() {
        super();
        // Initialize type maps
        const types = ['color', 'typography', 'spacing', 'shadow', 'radius', 'opacity'];
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
    register(token) {
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
    update(id, updates) {
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
        const updated = { ...existing, ...updates };
        this.tokens.set(id, updated);
        this.emit('token:updated', { token: updated, changes: updates });
    }
    /**
     * Delete a token.
     */
    delete(id) {
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
    get(id) {
        return this.tokens.get(id);
    }
    /**
     * Check if a token exists.
     */
    has(id) {
        return this.tokens.has(id);
    }
    /**
     * Get all tokens.
     */
    getAll() {
        return Array.from(this.tokens.values());
    }
    /**
     * Get token count.
     */
    get size() {
        return this.tokens.size;
    }
    /**
     * Clear all tokens.
     */
    clear() {
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
    getByType(type) {
        const ids = this.tokensByType.get(type);
        if (!ids)
            return [];
        const tokens = [];
        for (const id of ids) {
            const token = this.tokens.get(id);
            if (token) {
                tokens.push(token);
            }
        }
        return tokens;
    }
    /**
     * Get all tokens in a group.
     */
    getByGroup(group) {
        const ids = this.tokensByGroup.get(group);
        if (!ids)
            return [];
        const tokens = [];
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
    getGroups() {
        return Array.from(this.tokensByGroup.keys()).filter(group => (this.tokensByGroup.get(group)?.size ?? 0) > 0);
    }
    /**
     * Find a color token by value.
     */
    findColorByValue(color, tolerance = 0.001) {
        const colorTokens = this.getByType('color');
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
    findTypographyByValue(value) {
        const tokens = this.getByType('typography');
        for (const token of tokens) {
            if (token.value.fontFamily === value.fontFamily &&
                token.value.fontSize === value.fontSize &&
                token.value.fontWeight === value.fontWeight &&
                token.value.lineHeight === value.lineHeight &&
                token.value.letterSpacing === value.letterSpacing) {
                return token;
            }
        }
        return undefined;
    }
    /**
     * Find a spacing token by value.
     */
    findSpacingByValue(value) {
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
    setActiveTheme(theme) {
        if (this.activeTheme !== theme) {
            this.activeTheme = theme;
            this.emit('theme:changed', { theme });
        }
    }
    /**
     * Get the active theme.
     */
    getActiveTheme() {
        return this.activeTheme;
    }
    /**
     * Get the themed value for a color token.
     */
    getThemedColorValue(token) {
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
    toJSON() {
        const tokens = this.getAll().map(token => {
            // Add theme variants for color tokens
            const themeProps = token.type === 'color' ? {
                ...(token.lightValue !== undefined && { lightValue: token.lightValue }),
                ...(token.darkValue !== undefined && { darkValue: token.darkValue }),
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
    fromJSON(data) {
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
    deserializeToken(data) {
        switch (data.type) {
            case 'color':
                return {
                    id: data.id,
                    name: data.name,
                    type: 'color',
                    value: data.value,
                    description: data.description,
                    group: data.group,
                    lightValue: data.lightValue,
                    darkValue: data.darkValue,
                };
            case 'typography':
                return {
                    id: data.id,
                    name: data.name,
                    type: 'typography',
                    value: data.value,
                    description: data.description,
                    group: data.group,
                };
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
                };
            case 'shadow':
                return {
                    id: data.id,
                    name: data.name,
                    type: 'shadow',
                    value: data.value,
                    description: data.description,
                    group: data.group,
                };
            default:
                console.warn(`Unknown token type: ${data.type}`);
                return null;
        }
    }
}
/**
 * Create a token registry.
 */
export function createTokenRegistry() {
    return new TokenRegistry();
}
//# sourceMappingURL=token-registry.js.map