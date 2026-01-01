/**
 * Glyph Atlas for Text Rendering
 *
 * Manages a texture atlas of SDF (Signed Distance Field) glyphs
 * for high-quality GPU text rendering.
 */
/**
 * Glyph Atlas - manages SDF glyph textures
 */
export class GlyphAtlas {
    width;
    height;
    padding;
    sdfRadius;
    data;
    glyphs = new Map();
    freeRegions = [];
    dirty = false;
    canvas = null;
    ctx = null;
    constructor(width = 2048, height = 2048, options = {}) {
        this.width = width;
        this.height = height;
        this.padding = options.padding ?? 4;
        this.sdfRadius = options.sdfRadius ?? 8;
        // Initialize atlas data
        this.data = new Uint8Array(width * height);
        // Initialize with single free region
        this.freeRegions = [{ x: 0, y: 0, width, height }];
        // Create offscreen canvas for glyph rendering
        if (typeof OffscreenCanvas !== 'undefined') {
            this.canvas = new OffscreenCanvas(256, 256);
            this.ctx = this.canvas.getContext('2d');
        }
    }
    // =========================================================================
    // Glyph Management
    // =========================================================================
    /**
     * Get a glyph from the atlas.
     */
    getGlyph(fontId, glyphId, fontSize) {
        const key = this.buildKey(fontId, glyphId, fontSize);
        return this.glyphs.get(key) ?? null;
    }
    /**
     * Check if a glyph is in the atlas.
     */
    hasGlyph(fontId, glyphId, fontSize) {
        const key = this.buildKey(fontId, glyphId, fontSize);
        return this.glyphs.has(key);
    }
    /**
     * Add a glyph to the atlas.
     * Returns null if there's no space.
     */
    addGlyph(fontId, glyphId, fontSize, glyphData) {
        const key = this.buildKey(fontId, glyphId, fontSize);
        // Check if already exists
        const existing = this.glyphs.get(key);
        if (existing) {
            return existing;
        }
        // Calculate size with padding
        const paddedWidth = glyphData.width + this.padding * 2;
        const paddedHeight = glyphData.height + this.padding * 2;
        // Find a free region
        const region = this.allocateRegion(paddedWidth, paddedHeight);
        if (!region) {
            return null;
        }
        // Copy bitmap data to atlas
        const atlasX = region.x + this.padding;
        const atlasY = region.y + this.padding;
        for (let y = 0; y < glyphData.height; y++) {
            for (let x = 0; x < glyphData.width; x++) {
                const srcIdx = y * glyphData.width + x;
                const dstIdx = (atlasY + y) * this.width + (atlasX + x);
                this.data[dstIdx] = glyphData.bitmap[srcIdx];
            }
        }
        // Create glyph entry
        const glyph = {
            glyphId,
            fontId,
            fontSize,
            x: atlasX,
            y: atlasY,
            width: glyphData.width,
            height: glyphData.height,
            bearingX: glyphData.bearingX,
            bearingY: glyphData.bearingY,
            advance: glyphData.advance,
        };
        this.glyphs.set(key, glyph);
        this.dirty = true;
        return glyph;
    }
    /**
     * Render a glyph using canvas and add to atlas.
     */
    renderAndAddGlyph(fontId, glyphId, fontSize, char, fontFamily) {
        if (!this.canvas || !this.ctx) {
            return null;
        }
        // Calculate glyph size
        const renderSize = fontSize + this.sdfRadius * 2;
        const padding = this.sdfRadius;
        // Resize canvas if needed
        if (this.canvas.width < renderSize * 2) {
            this.canvas.width = renderSize * 2;
            this.canvas.height = renderSize * 2;
        }
        const ctx = this.ctx;
        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Set up font
        ctx.font = `${fontSize}px "${fontFamily}"`;
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'alphabetic';
        // Measure text
        const metrics = ctx.measureText(char);
        const width = Math.ceil(metrics.width) + padding * 2;
        const height = Math.ceil(fontSize * 1.5) + padding * 2;
        const bearingX = 0;
        const bearingY = Math.ceil(fontSize);
        const advance = metrics.width;
        // Draw glyph
        ctx.fillText(char, padding, padding + bearingY);
        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        const bitmap = new Uint8Array(width * height);
        // Convert to grayscale (use alpha channel)
        for (let i = 0; i < width * height; i++) {
            bitmap[i] = imageData.data[i * 4 + 3]; // Alpha channel
        }
        // Generate SDF
        const sdfBitmap = this.generateSDF(bitmap, width, height);
        return this.addGlyph(fontId, glyphId, fontSize, {
            width,
            height,
            bearingX,
            bearingY,
            advance,
            bitmap: sdfBitmap,
        });
    }
    // =========================================================================
    // SDF Generation
    // =========================================================================
    /**
     * Generate SDF from a bitmap.
     */
    generateSDF(bitmap, width, height) {
        const sdf = new Uint8Array(width * height);
        const radius = this.sdfRadius;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const isInside = bitmap[idx] > 127;
                // Find minimum distance to opposite state
                let minDist = radius;
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nidx = ny * width + nx;
                            const nIsInside = bitmap[nidx] > 127;
                            if (isInside !== nIsInside) {
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                minDist = Math.min(minDist, dist);
                            }
                        }
                    }
                }
                // Normalize to 0-255
                const normalized = isInside
                    ? 127 + (minDist / radius) * 128
                    : 127 - (minDist / radius) * 128;
                sdf[idx] = Math.max(0, Math.min(255, Math.round(normalized)));
            }
        }
        return sdf;
    }
    // =========================================================================
    // Region Allocation (Simple Bin Packing)
    // =========================================================================
    /**
     * Allocate a region in the atlas.
     */
    allocateRegion(width, height) {
        // Find best fit region (smallest that fits)
        let bestIdx = -1;
        let bestArea = Infinity;
        for (let i = 0; i < this.freeRegions.length; i++) {
            const region = this.freeRegions[i];
            if (region.width >= width && region.height >= height) {
                const area = region.width * region.height;
                if (area < bestArea) {
                    bestArea = area;
                    bestIdx = i;
                }
            }
        }
        if (bestIdx === -1) {
            return null;
        }
        // Split the region
        const region = this.freeRegions[bestIdx];
        const allocated = {
            x: region.x,
            y: region.y,
            width,
            height,
        };
        // Remove the used region
        this.freeRegions.splice(bestIdx, 1);
        // Add remaining regions
        const rightWidth = region.width - width;
        const bottomHeight = region.height - height;
        if (rightWidth > 0) {
            this.freeRegions.push({
                x: region.x + width,
                y: region.y,
                width: rightWidth,
                height,
            });
        }
        if (bottomHeight > 0) {
            this.freeRegions.push({
                x: region.x,
                y: region.y + height,
                width: region.width,
                height: bottomHeight,
            });
        }
        return allocated;
    }
    // =========================================================================
    // Atlas Data Access
    // =========================================================================
    /**
     * Get the atlas texture data.
     */
    getData() {
        return this.data;
    }
    /**
     * Get atlas dimensions.
     */
    getSize() {
        return { width: this.width, height: this.height };
    }
    /**
     * Check if atlas has been modified.
     */
    isDirty() {
        return this.dirty;
    }
    /**
     * Clear dirty flag.
     */
    clearDirty() {
        this.dirty = false;
    }
    /**
     * Get UV coordinates for a glyph.
     */
    getGlyphUVs(glyph) {
        return {
            u0: glyph.x / this.width,
            v0: glyph.y / this.height,
            u1: (glyph.x + glyph.width) / this.width,
            v1: (glyph.y + glyph.height) / this.height,
        };
    }
    // =========================================================================
    // Utilities
    // =========================================================================
    /**
     * Build a cache key.
     */
    buildKey(fontId, glyphId, fontSize) {
        return `${fontId}:${glyphId}:${fontSize}`;
    }
    /**
     * Clear the atlas.
     */
    clear() {
        this.data.fill(0);
        this.glyphs.clear();
        this.freeRegions = [{ x: 0, y: 0, width: this.width, height: this.height }];
        this.dirty = true;
    }
    /**
     * Get usage statistics.
     */
    getStats() {
        let usedArea = 0;
        for (const glyph of this.glyphs.values()) {
            usedArea += (glyph.width + this.padding * 2) * (glyph.height + this.padding * 2);
        }
        return {
            glyphCount: this.glyphs.size,
            usedArea,
            totalArea: this.width * this.height,
        };
    }
}
/**
 * Create a new glyph atlas.
 */
export function createGlyphAtlas(width, height, options) {
    return new GlyphAtlas(width, height, options);
}
//# sourceMappingURL=glyph-atlas.js.map