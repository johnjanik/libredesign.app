/**
 * Image Importer
 *
 * Import raster images with optional auto-tracing to vectors.
 */
/**
 * Image Importer
 */
export class ImageImporter {
    sceneGraph;
    constructor(sceneGraph) {
        this.sceneGraph = sceneGraph;
    }
    /**
     * Import an image file.
     */
    async import(file, options = {}) {
        // Load image
        const img = await this.loadImage(file);
        // Calculate dimensions
        let width = img.width;
        let height = img.height;
        if (options.maxWidth || options.maxHeight) {
            const scaleX = options.maxWidth ? options.maxWidth / width : Infinity;
            const scaleY = options.maxHeight ? options.maxHeight / height : Infinity;
            const scale = Math.min(scaleX, scaleY, 1);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }
        const x = options.x ?? 0;
        const y = options.y ?? 0;
        const parentId = options.parentId ?? this.getDefaultParent();
        if (options.autoTrace) {
            // Auto-trace to vectors
            const traceOptions = options.traceOptions ?? {};
            const tracedPaths = await this.traceImage(img, traceOptions);
            // Create group for traced paths
            const groupId = this.sceneGraph.createNode('GROUP', parentId, -1, {
                name: file.name.replace(/\.[^.]+$/, ''),
                x,
                y,
                width,
                height,
            });
            // Create vector nodes for each path
            for (const traced of tracedPaths) {
                this.sceneGraph.createNode('VECTOR', groupId, -1, {
                    name: 'Traced Path',
                    x: 0,
                    y: 0,
                    width,
                    height,
                    vectorPaths: [traced.path],
                    fills: [{
                            type: 'SOLID',
                            visible: true,
                            color: traced.color,
                        }],
                });
            }
            return {
                nodeId: groupId,
                originalWidth: img.width,
                originalHeight: img.height,
                width,
                height,
                traced: true,
                pathCount: tracedPaths.length,
            };
        }
        else {
            // Import as raster image
            const imageUrl = await this.fileToDataUrl(file);
            const nodeId = this.sceneGraph.createNode('FRAME', parentId, -1, {
                name: file.name.replace(/\.[^.]+$/, ''),
                x,
                y,
                width,
                height,
                fills: [{
                        type: 'IMAGE',
                        visible: true,
                        imageUrl,
                        scaleMode: 'FILL',
                    }],
            });
            return {
                nodeId,
                originalWidth: img.width,
                originalHeight: img.height,
                width,
                height,
                traced: false,
                pathCount: 0,
            };
        }
    }
    /**
     * Import multiple images.
     */
    async importMultiple(files, options = {}) {
        const results = [];
        let offsetY = options.y ?? 0;
        for (const file of files) {
            const result = await this.import(file, {
                ...options,
                y: offsetY,
            });
            results.push(result);
            offsetY += result.height + 20; // Add spacing between images
        }
        return results;
    }
    /**
     * Trace an image to vector paths.
     */
    async traceImage(source, options = {}) {
        const threshold = options.threshold ?? 128;
        const minPathLength = options.minPathLength ?? 5;
        const tolerance = options.tolerance ?? 2;
        const traceColors = options.traceColors ?? false;
        const colorCount = options.colorCount ?? 8;
        const blurRadius = options.blurRadius ?? 0;
        const invert = options.invert ?? false;
        // Get image data
        const imageData = this.getImageData(source);
        const { width, height } = imageData;
        // Copy to get Uint8ClampedArray<ArrayBuffer> instead of Uint8ClampedArray<ArrayBufferLike>
        let data = new Uint8ClampedArray(imageData.data);
        // Apply blur if requested
        if (blurRadius > 0) {
            data = this.applyBlur(data, width, height, blurRadius);
        }
        // Invert if requested
        if (invert) {
            data = this.invertColors(data);
        }
        if (traceColors) {
            return this.traceWithColors(data, width, height, colorCount, tolerance, minPathLength);
        }
        else {
            return this.traceEdges(data, width, height, threshold, tolerance, minPathLength);
        }
    }
    // =========================================================================
    // Private Methods - Image Loading
    // =========================================================================
    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }
    async fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
    getImageData(source) {
        if (source instanceof ImageData) {
            return source;
        }
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (source instanceof HTMLImageElement) {
            canvas.width = source.width;
            canvas.height = source.height;
            ctx.drawImage(source, 0, 0);
        }
        else {
            canvas.width = source.width;
            canvas.height = source.height;
            ctx.drawImage(source, 0, 0);
        }
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    // =========================================================================
    // Private Methods - Image Processing
    // =========================================================================
    applyBlur(data, width, height, radius) {
        const result = new Uint8ClampedArray(data.length);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0, count = 0;
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = Math.min(Math.max(x + dx, 0), width - 1);
                        const ny = Math.min(Math.max(y + dy, 0), height - 1);
                        const idx = (ny * width + nx) * 4;
                        r += data[idx];
                        g += data[idx + 1];
                        b += data[idx + 2];
                        a += data[idx + 3];
                        count++;
                    }
                }
                const idx = (y * width + x) * 4;
                result[idx] = r / count;
                result[idx + 1] = g / count;
                result[idx + 2] = b / count;
                result[idx + 3] = a / count;
            }
        }
        return result;
    }
    invertColors(data) {
        const result = new Uint8ClampedArray(data.length);
        for (let i = 0; i < data.length; i += 4) {
            result[i] = 255 - data[i];
            result[i + 1] = 255 - data[i + 1];
            result[i + 2] = 255 - data[i + 2];
            result[i + 3] = data[i + 3];
        }
        return result;
    }
    // =========================================================================
    // Private Methods - Edge Tracing
    // =========================================================================
    traceEdges(data, width, height, threshold, tolerance, minPathLength) {
        // Convert to grayscale and threshold
        const binary = new Uint8Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            binary[i / 4] = gray > threshold ? 1 : 0;
        }
        // Find contours using marching squares
        const contours = this.findContours(binary, width, height);
        // Convert contours to paths
        const paths = [];
        for (const contour of contours) {
            if (contour.length < minPathLength)
                continue;
            // Simplify path
            const simplified = this.simplifyPath(contour, tolerance);
            if (simplified.length < 3)
                continue;
            // Convert to vector path
            const commands = [];
            commands.push({ type: 'M', x: simplified[0].x, y: simplified[0].y });
            for (let i = 1; i < simplified.length; i++) {
                commands.push({ type: 'L', x: simplified[i].x, y: simplified[i].y });
            }
            commands.push({ type: 'Z' });
            paths.push({
                path: { windingRule: 'NONZERO', commands },
                color: { r: 0, g: 0, b: 0, a: 1 },
            });
        }
        return paths;
    }
    findContours(binary, width, height) {
        const contours = [];
        const visited = new Set();
        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                // Check if this is an edge pixel
                const idx = y * width + x;
                if (binary[idx] === 1 && !visited.has(`${x},${y}`)) {
                    // Trace contour
                    const contour = this.traceContour(binary, width, height, x, y, visited);
                    if (contour.length > 0) {
                        contours.push(contour);
                    }
                }
            }
        }
        return contours;
    }
    traceContour(binary, width, height, startX, startY, visited) {
        const contour = [];
        const directions = [
            { dx: 1, dy: 0 },
            { dx: 1, dy: 1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: -1, dy: -1 },
            { dx: 0, dy: -1 },
            { dx: 1, dy: -1 },
        ];
        let x = startX;
        let y = startY;
        let dir = 0;
        do {
            visited.add(`${x},${y}`);
            contour.push({ x, y });
            // Find next edge pixel
            let found = false;
            for (let i = 0; i < 8; i++) {
                const d = directions[(dir + i) % 8];
                const nx = x + d.dx;
                const ny = y + d.dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const idx = ny * width + nx;
                    if (binary[idx] === 1) {
                        x = nx;
                        y = ny;
                        dir = (dir + i + 5) % 8; // Turn around
                        found = true;
                        break;
                    }
                }
            }
            if (!found)
                break;
        } while (!(x === startX && y === startY) && contour.length < 10000);
        return contour;
    }
    // =========================================================================
    // Private Methods - Color Tracing
    // =========================================================================
    traceWithColors(data, width, height, colorCount, tolerance, minPathLength) {
        // Quantize colors
        const colors = this.quantizeColors(data, colorCount);
        // Create binary image for each color
        const paths = [];
        for (const color of colors) {
            // Create mask for this color
            const mask = new Uint8Array(width * height);
            for (let i = 0; i < data.length; i += 4) {
                const dr = Math.abs(data[i] - color.r * 255);
                const dg = Math.abs(data[i + 1] - color.g * 255);
                const db = Math.abs(data[i + 2] - color.b * 255);
                if (dr + dg + db < 50) {
                    mask[i / 4] = 1;
                }
            }
            // Trace this color
            const colorPaths = this.traceEdges(new Uint8ClampedArray(mask.map(v => v * 255)), width, height, 128, tolerance, minPathLength);
            // Update color for all paths
            for (const p of colorPaths) {
                p.color = color;
                paths.push(p);
            }
        }
        return paths;
    }
    quantizeColors(data, colorCount) {
        // Simple median cut color quantization
        const pixels = [];
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 128) { // Only consider opaque pixels
                pixels.push({
                    r: data[i],
                    g: data[i + 1],
                    b: data[i + 2],
                });
            }
        }
        if (pixels.length === 0)
            return [];
        // Simple k-means style quantization
        const colors = [];
        // Start with evenly distributed colors
        for (let i = 0; i < colorCount; i++) {
            const idx = Math.floor((i / colorCount) * pixels.length);
            const p = pixels[idx] ?? pixels[0];
            colors.push({ r: p.r / 255, g: p.g / 255, b: p.b / 255, a: 1 });
        }
        return colors;
    }
    // =========================================================================
    // Private Methods - Path Simplification
    // =========================================================================
    simplifyPath(points, tolerance) {
        if (points.length <= 2)
            return points;
        // Ramer-Douglas-Peucker algorithm
        let maxDist = 0;
        let maxIdx = 0;
        const first = points[0];
        const last = points[points.length - 1];
        for (let i = 1; i < points.length - 1; i++) {
            const dist = this.pointToLineDistance(points[i], first, last);
            if (dist > maxDist) {
                maxDist = dist;
                maxIdx = i;
            }
        }
        if (maxDist > tolerance) {
            const left = this.simplifyPath(points.slice(0, maxIdx + 1), tolerance);
            const right = this.simplifyPath(points.slice(maxIdx), tolerance);
            return [...left.slice(0, -1), ...right];
        }
        return [first, last];
    }
    pointToLineDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) {
            return Math.sqrt(Math.pow(point.x - lineStart.x, 2) +
                Math.pow(point.y - lineStart.y, 2));
        }
        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (len * len);
        const projX = lineStart.x + t * dx;
        const projY = lineStart.y + t * dy;
        return Math.sqrt(Math.pow(point.x - projX, 2) +
            Math.pow(point.y - projY, 2));
    }
    // =========================================================================
    // Private Methods - Helpers
    // =========================================================================
    getDefaultParent() {
        const doc = this.sceneGraph.getDocument();
        if (!doc) {
            throw new Error('No document in scene graph');
        }
        const pageIds = this.sceneGraph.getChildIds(doc.id);
        if (pageIds.length === 0) {
            throw new Error('No pages in document');
        }
        return pageIds[0];
    }
}
/**
 * Create an image importer.
 */
export function createImageImporter(sceneGraph) {
    return new ImageImporter(sceneGraph);
}
//# sourceMappingURL=image-importer.js.map