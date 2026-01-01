/**
 * PNG Exporter
 *
 * Export scene graph nodes to PNG images using canvas rasterization.
 */
/**
 * PNG Exporter
 */
export class PNGExporter {
    sceneGraph;
    constructor(sceneGraph) {
        this.sceneGraph = sceneGraph;
    }
    /**
     * Export a node to PNG.
     */
    async export(nodeId, options = {}) {
        const scale = options.scale ?? 1;
        const backgroundColor = options.backgroundColor ?? 'transparent';
        const mimeType = options.mimeType ?? 'image/png';
        const quality = options.quality ?? 0.92;
        const padding = options.padding ?? 0;
        const maxSize = options.maxSize ?? 4096;
        // Get node bounds
        const node = this.sceneGraph.getNode(nodeId);
        if (!node) {
            throw new Error(`Node not found: ${nodeId}`);
        }
        const bounds = this.getNodeBounds(nodeId);
        if (!bounds) {
            throw new Error(`Cannot get bounds for node: ${nodeId}`);
        }
        // Calculate canvas size
        let width = Math.ceil((bounds.width + padding * 2) * scale);
        let height = Math.ceil((bounds.height + padding * 2) * scale);
        // Apply max size limit
        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context');
        }
        // Fill background
        if (backgroundColor !== 'transparent') {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
        }
        // Set up transform
        ctx.translate(padding * scale, padding * scale);
        ctx.scale(scale, scale);
        ctx.translate(-bounds.x, -bounds.y);
        // Render node
        this.renderNode(ctx, nodeId);
        // Convert to blob
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                }
                else {
                    reject(new Error('Failed to create blob'));
                }
            }, mimeType, quality);
        });
        const url = URL.createObjectURL(blob);
        return {
            blob,
            width,
            height,
            url,
        };
    }
    /**
     * Export multiple nodes to a single PNG.
     */
    async exportMultiple(nodeIds, options = {}) {
        if (nodeIds.length === 0) {
            throw new Error('No nodes to export');
        }
        if (nodeIds.length === 1) {
            return this.export(nodeIds[0], options);
        }
        const scale = options.scale ?? 1;
        const backgroundColor = options.backgroundColor ?? 'transparent';
        const mimeType = options.mimeType ?? 'image/png';
        const quality = options.quality ?? 0.92;
        const padding = options.padding ?? 0;
        const maxSize = options.maxSize ?? 4096;
        // Calculate combined bounds
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const nodeId of nodeIds) {
            const bounds = this.getNodeBounds(nodeId);
            if (bounds) {
                minX = Math.min(minX, bounds.x);
                minY = Math.min(minY, bounds.y);
                maxX = Math.max(maxX, bounds.x + bounds.width);
                maxY = Math.max(maxY, bounds.y + bounds.height);
            }
        }
        if (minX === Infinity) {
            throw new Error('Cannot calculate bounds for nodes');
        }
        const boundsWidth = maxX - minX;
        const boundsHeight = maxY - minY;
        // Calculate canvas size
        let width = Math.ceil((boundsWidth + padding * 2) * scale);
        let height = Math.ceil((boundsHeight + padding * 2) * scale);
        // Apply max size limit
        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context');
        }
        // Fill background
        if (backgroundColor !== 'transparent') {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
        }
        // Set up transform
        ctx.translate(padding * scale, padding * scale);
        ctx.scale(scale, scale);
        ctx.translate(-minX, -minY);
        // Render nodes
        for (const nodeId of nodeIds) {
            this.renderNode(ctx, nodeId);
        }
        // Convert to blob
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                }
                else {
                    reject(new Error('Failed to create blob'));
                }
            }, mimeType, quality);
        });
        const url = URL.createObjectURL(blob);
        return {
            blob,
            width,
            height,
            url,
        };
    }
    /**
     * Export current page to PNG.
     */
    async exportPage(options = {}) {
        const doc = this.sceneGraph.getDocument();
        if (!doc) {
            throw new Error('No document in scene graph');
        }
        const pageIds = this.sceneGraph.getChildIds(doc.id);
        if (pageIds.length === 0) {
            throw new Error('No pages in document');
        }
        return this.export(pageIds[0], options);
    }
    /**
     * Download the exported image.
     */
    async download(nodeId, filename = 'export.png', options = {}) {
        const result = await this.export(nodeId, options);
        const link = document.createElement('a');
        link.href = result.url;
        link.download = filename;
        link.click();
        // Clean up
        URL.revokeObjectURL(result.url);
    }
    // =========================================================================
    // Private Methods
    // =========================================================================
    getNodeBounds(nodeId) {
        const node = this.sceneGraph.getNode(nodeId);
        if (!node)
            return null;
        if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
            const n = node;
            return { x: n.x, y: n.y, width: n.width, height: n.height };
        }
        // For containers, calculate bounds from children
        const childIds = this.sceneGraph.getChildIds(nodeId);
        if (childIds.length === 0)
            return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const childId of childIds) {
            const childBounds = this.getNodeBounds(childId);
            if (childBounds) {
                minX = Math.min(minX, childBounds.x);
                minY = Math.min(minY, childBounds.y);
                maxX = Math.max(maxX, childBounds.x + childBounds.width);
                maxY = Math.max(maxY, childBounds.y + childBounds.height);
            }
        }
        if (minX === Infinity)
            return null;
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }
    renderNode(ctx, nodeId) {
        const node = this.sceneGraph.getNode(nodeId);
        if (!node)
            return;
        // Skip invisible nodes
        if ('visible' in node && !node.visible) {
            return;
        }
        ctx.save();
        // Apply node transform
        if ('x' in node && 'y' in node) {
            const n = node;
            ctx.translate(n.x, n.y);
            if (n.rotation) {
                ctx.rotate((n.rotation * Math.PI) / 180);
            }
        }
        // Apply opacity
        if ('opacity' in node) {
            ctx.globalAlpha *= node.opacity;
        }
        // Render based on node type
        this.renderNodeContent(ctx, node);
        // Render children
        const childIds = this.sceneGraph.getChildIds(nodeId);
        for (const childId of childIds) {
            ctx.save();
            // Reset translation for children (they have their own position)
            if ('x' in node && 'y' in node) {
                const n = node;
                ctx.translate(-n.x, -n.y);
            }
            this.renderNode(ctx, childId);
            ctx.restore();
        }
        ctx.restore();
    }
    renderNodeContent(ctx, node) {
        switch (node.type) {
            case 'FRAME':
                this.renderFrame(ctx, node);
                break;
            case 'VECTOR':
                this.renderVector(ctx, node);
                break;
            case 'TEXT':
                this.renderText(ctx, node);
                break;
            // Add more node types as needed
        }
    }
    renderFrame(ctx, node) {
        if (!('width' in node && 'height' in node))
            return;
        const n = node;
        const fills = n.fills;
        for (const fill of fills ?? []) {
            if (!fill.visible || fill.type !== 'SOLID')
                continue;
            const c = fill.color;
            const opacity = fill.opacity ?? 1;
            ctx.fillStyle = `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a * opacity})`;
            ctx.fillRect(0, 0, n.width, n.height);
        }
    }
    renderVector(ctx, node) {
        if (!('vectorPaths' in node))
            return;
        const n = node;
        const path = n.vectorPaths?.[0];
        if (!path)
            return;
        // Create path
        ctx.beginPath();
        for (const cmd of path.commands) {
            switch (cmd.type) {
                case 'M':
                    ctx.moveTo(cmd.x ?? 0, cmd.y ?? 0);
                    break;
                case 'L':
                    ctx.lineTo(cmd.x ?? 0, cmd.y ?? 0);
                    break;
                case 'C':
                    ctx.bezierCurveTo(cmd.x1 ?? 0, cmd.y1 ?? 0, cmd.x2 ?? 0, cmd.y2 ?? 0, cmd.x ?? 0, cmd.y ?? 0);
                    break;
                case 'Z':
                    ctx.closePath();
                    break;
            }
        }
        // Fill
        for (const fill of n.fills ?? []) {
            if (!fill.visible || fill.type !== 'SOLID')
                continue;
            const c = fill.color;
            const opacity = fill.opacity ?? 1;
            ctx.fillStyle = `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a * opacity})`;
            ctx.fill();
        }
    }
    renderText(ctx, node) {
        if (!('characters' in node))
            return;
        const n = node;
        const firstStyle = n.textStyles?.[0];
        const fontSize = firstStyle?.fontSize ?? 12;
        const fontFamily = firstStyle?.fontFamily ?? 'sans-serif';
        ctx.font = `${fontSize}px ${fontFamily}`;
        // Use style fills or node fills
        const fills = firstStyle?.fills ?? n.fills ?? [];
        for (const fill of fills) {
            if (!fill.visible || fill.type !== 'SOLID')
                continue;
            const c = fill.color;
            const opacity = fill.opacity ?? 1;
            ctx.fillStyle = `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a * opacity})`;
            ctx.fillText(n.characters, 0, fontSize);
        }
    }
}
/**
 * Create a PNG exporter.
 */
export function createPNGExporter(sceneGraph) {
    return new PNGExporter(sceneGraph);
}
//# sourceMappingURL=png-exporter.js.map