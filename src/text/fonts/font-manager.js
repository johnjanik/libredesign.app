/**
 * Font Manager
 *
 * Manages font loading, caching, and fallback chains.
 */
/**
 * Font Manager - handles font loading and selection
 */
export class FontManager {
    shaper;
    fonts = new Map();
    familyFonts = new Map();
    loadingFonts = new Map();
    fallbackChain = ['sans-serif'];
    constructor(shaper) {
        this.shaper = shaper;
    }
    // =========================================================================
    // Font Loading
    // =========================================================================
    /**
     * Load a font from a URL.
     */
    async loadFont(request) {
        const { family, weight = 400, style = 'normal', stretch = 'normal', url, } = request;
        const id = this.buildFontId(family, weight, style, stretch);
        // Check if already loaded
        const existing = this.fonts.get(id);
        if (existing) {
            return existing;
        }
        // Check if already loading
        const loading = this.loadingFonts.get(id);
        if (loading) {
            await loading;
            return this.fonts.get(id);
        }
        // Start loading
        const loadPromise = this.doLoadFont(id, family, weight, style, stretch, url);
        this.loadingFonts.set(id, loadPromise);
        try {
            await loadPromise;
            return this.fonts.get(id);
        }
        finally {
            this.loadingFonts.delete(id);
        }
    }
    /**
     * Internal font loading.
     */
    async doLoadFont(id, family, weight, style, stretch, url) {
        let fontData;
        if (url) {
            // Load from URL
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load font from ${url}: ${response.status}`);
            }
            fontData = new Uint8Array(await response.arrayBuffer());
        }
        else {
            // Try to load system font (not supported in browser, would need fallback)
            throw new Error(`System font loading not supported. Provide a URL for ${family}`);
        }
        // Load into shaper
        const handle = this.shaper.loadFont(id, fontData);
        // Store metadata
        const metadata = {
            id,
            family,
            weight,
            style,
            stretch,
            source: url ? 'custom' : 'system',
            url,
        };
        this.fonts.set(id, metadata);
        // Add to family index
        let familySet = this.familyFonts.get(family);
        if (!familySet) {
            familySet = new Set();
            this.familyFonts.set(family, familySet);
        }
        familySet.add(id);
        return handle;
    }
    /**
     * Load a font from ArrayBuffer.
     */
    loadFontFromData(family, data, weight = 400, style = 'normal', stretch = 'normal') {
        const id = this.buildFontId(family, weight, style, stretch);
        // Check if already loaded
        const existing = this.fonts.get(id);
        if (existing) {
            return existing;
        }
        // Load into shaper
        this.shaper.loadFont(id, data);
        // Store metadata
        const metadata = {
            id,
            family,
            weight,
            style,
            stretch,
            source: 'custom',
        };
        this.fonts.set(id, metadata);
        // Add to family index
        let familySet = this.familyFonts.get(family);
        if (!familySet) {
            familySet = new Set();
            this.familyFonts.set(family, familySet);
        }
        familySet.add(id);
        return metadata;
    }
    /**
     * Unload a font.
     */
    unloadFont(id) {
        const metadata = this.fonts.get(id);
        if (!metadata)
            return;
        // Remove from shaper
        this.shaper.unloadFont(id);
        // Remove from family index
        const familySet = this.familyFonts.get(metadata.family);
        if (familySet) {
            familySet.delete(id);
            if (familySet.size === 0) {
                this.familyFonts.delete(metadata.family);
            }
        }
        this.fonts.delete(id);
    }
    // =========================================================================
    // Font Selection
    // =========================================================================
    /**
     * Find the best matching font for a descriptor.
     */
    findFont(descriptor) {
        const { family, weight = 400, style = 'normal', stretch = 'normal', } = descriptor;
        // Check exact match
        const exactId = this.buildFontId(family, weight, style, stretch);
        if (this.fonts.has(exactId)) {
            return this.fonts.get(exactId);
        }
        // Get all fonts for the family
        const familyFonts = this.familyFonts.get(family);
        if (!familyFonts || familyFonts.size === 0) {
            return this.findFallbackFont(descriptor);
        }
        // Find best match using CSS font matching algorithm
        let bestMatch = null;
        let bestScore = -Infinity;
        for (const fontId of familyFonts) {
            const font = this.fonts.get(fontId);
            const score = this.calculateMatchScore(font, weight, style, stretch);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = font;
            }
        }
        return bestMatch;
    }
    /**
     * Find a fallback font.
     */
    findFallbackFont(descriptor) {
        for (const fallbackFamily of this.fallbackChain) {
            const fallbackFonts = this.familyFonts.get(fallbackFamily);
            if (fallbackFonts && fallbackFonts.size > 0) {
                return this.findFont({ ...descriptor, family: fallbackFamily });
            }
        }
        return null;
    }
    /**
     * Calculate match score for font selection.
     */
    calculateMatchScore(font, targetWeight, targetStyle, targetStretch) {
        let score = 0;
        // Style matching (exact or close)
        if (font.style === targetStyle) {
            score += 1000;
        }
        else if ((font.style === 'italic' && targetStyle === 'oblique') ||
            (font.style === 'oblique' && targetStyle === 'italic')) {
            score += 500;
        }
        // Weight matching (prefer closer weights)
        const weightDiff = Math.abs(font.weight - targetWeight);
        score -= weightDiff;
        // Stretch matching
        const stretchOrder = [
            'ultra-condensed', 'extra-condensed', 'condensed', 'semi-condensed',
            'normal', 'semi-expanded', 'expanded', 'extra-expanded', 'ultra-expanded',
        ];
        const fontStretchIndex = stretchOrder.indexOf(font.stretch);
        const targetStretchIndex = stretchOrder.indexOf(targetStretch);
        const stretchDiff = Math.abs(fontStretchIndex - targetStretchIndex);
        score -= stretchDiff * 50;
        return score;
    }
    // =========================================================================
    // Fallback Chain
    // =========================================================================
    /**
     * Set the fallback font chain.
     */
    setFallbackChain(families) {
        this.fallbackChain = [...families];
    }
    /**
     * Get the fallback font chain.
     */
    getFallbackChain() {
        return this.fallbackChain;
    }
    // =========================================================================
    // Utilities
    // =========================================================================
    /**
     * Build a unique font ID.
     */
    buildFontId(family, weight, style, stretch) {
        return `${family}:${weight}:${style}:${stretch}`;
    }
    /**
     * Get all loaded fonts.
     */
    getAllFonts() {
        return Array.from(this.fonts.values());
    }
    /**
     * Get all loaded font families.
     */
    getAllFamilies() {
        return Array.from(this.familyFonts.keys());
    }
    /**
     * Check if a font is loaded.
     */
    hasFont(id) {
        return this.fonts.has(id);
    }
    /**
     * Check if a font family is loaded.
     */
    hasFamily(family) {
        return this.familyFonts.has(family);
    }
    /**
     * Dispose of all fonts.
     */
    dispose() {
        for (const id of this.fonts.keys()) {
            this.unloadFont(id);
        }
    }
}
/**
 * Create a new font manager.
 */
export function createFontManager(shaper) {
    return new FontManager(shaper);
}
//# sourceMappingURL=font-manager.js.map