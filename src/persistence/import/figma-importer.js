/**
 * Figma Importer
 *
 * Import Figma files via REST API or .fig file parsing.
 * Note: .fig files use a proprietary format. This importer primarily
 * uses the Figma REST API for reliable imports.
 */
/**
 * Figma Importer
 */
export class FigmaImporter {
    sceneGraph;
    warnings = [];
    nodeCount = 0;
    componentMap = new Map();
    constructor(sceneGraph) {
        this.sceneGraph = sceneGraph;
    }
    /**
     * Import from Figma API using file key.
     */
    async importFromApi(fileKey, options = {}) {
        if (!options.accessToken) {
            throw new Error('Figma access token is required for API import');
        }
        this.warnings = [];
        this.nodeCount = 0;
        this.componentMap.clear();
        // Build API URL
        let url = `https://api.figma.com/v1/files/${fileKey}`;
        if (options.nodeIds && options.nodeIds.length > 0) {
            url += `?ids=${options.nodeIds.join(',')}`;
        }
        // Fetch file data
        const response = await fetch(url, {
            headers: {
                'X-Figma-Token': options.accessToken,
            },
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Figma API error: ${error}`);
        }
        const fileData = await response.json();
        // Build component map
        this.buildComponentMap(fileData.document);
        // Get or create parent
        const parentId = options.parentId ?? this.getDefaultParent();
        // Create root group
        const rootId = this.sceneGraph.createNode('GROUP', parentId, -1, {
            name: `Figma: ${fileData.name}`,
            x: 0,
            y: 0,
        });
        this.nodeCount++;
        // Import document
        this.importNode(fileData.document, rootId, options);
        return {
            rootId,
            nodeCount: this.nodeCount,
            documentName: fileData.name,
            warnings: this.warnings,
        };
    }
    /**
     * Import from Figma URL.
     */
    async importFromUrl(figmaUrl, options = {}) {
        // Parse Figma URL to extract file key
        // URLs look like: https://www.figma.com/file/FILE_KEY/NAME?node-id=...
        const match = /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/.exec(figmaUrl);
        if (!match) {
            throw new Error('Invalid Figma URL');
        }
        const fileKey = match[1];
        // Extract node IDs if present in URL
        const nodeIdMatch = /node-id=([^&]+)/.exec(figmaUrl);
        if (nodeIdMatch && !options.nodeIds) {
            options = {
                ...options,
                nodeIds: [decodeURIComponent(nodeIdMatch[1])],
            };
        }
        return this.importFromApi(fileKey, options);
    }
    /**
     * Parse a .fig file.
     * Note: .fig files use a proprietary protobuf format.
     * This provides limited support for basic structures.
     */
    async importFigFile(file, options = {}) {
        this.warnings = [];
        this.nodeCount = 0;
        this.componentMap.clear();
        this.warnings.push('.fig file format has limited support. Consider using Figma API for full fidelity.');
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        // .fig files are ZIP archives containing protobuf data
        // Attempt to parse as ZIP first
        if (data[0] === 0x50 && data[1] === 0x4B) {
            return this.parseFigZip(data, options);
        }
        // Otherwise treat as raw protobuf (older format)
        return this.parseFigProtobuf(data, options);
    }
    // =========================================================================
    // Private Methods - API Import
    // =========================================================================
    buildComponentMap(node) {
        if (node.type === 'COMPONENT') {
            this.componentMap.set(node.id, node);
        }
        if (node.children) {
            for (const child of node.children) {
                this.buildComponentMap(child);
            }
        }
    }
    importNode(figmaNode, parentId, options) {
        // Skip hidden nodes unless importing hidden
        if (!options.importHidden && figmaNode.visible === false) {
            return;
        }
        const scale = options.scale ?? 1;
        switch (figmaNode.type) {
            case 'DOCUMENT':
                // Import children directly
                for (const child of figmaNode.children ?? []) {
                    this.importNode(child, parentId, options);
                }
                break;
            case 'CANVAS':
                this.importCanvas(figmaNode, parentId, options);
                break;
            case 'FRAME':
            case 'GROUP':
                this.importFrame(figmaNode, parentId, options);
                break;
            case 'RECTANGLE':
                this.importRectangle(figmaNode, parentId, scale);
                break;
            case 'ELLIPSE':
                this.importEllipse(figmaNode, parentId, scale);
                break;
            case 'VECTOR':
            case 'LINE':
            case 'STAR':
            case 'REGULAR_POLYGON':
                this.importVector(figmaNode, parentId, scale);
                break;
            case 'TEXT':
                this.importText(figmaNode, parentId, scale);
                break;
            case 'COMPONENT':
                if (options.flattenComponents) {
                    this.importFrame(figmaNode, parentId, options);
                }
                else {
                    this.importComponent(figmaNode, parentId, options);
                }
                break;
            case 'INSTANCE':
                this.importInstance(figmaNode, parentId, options);
                break;
            case 'BOOLEAN_OPERATION':
                this.importBooleanOperation(figmaNode, parentId, options);
                break;
            case 'SLICE':
                // Skip slices
                break;
            default:
                this.warnings.push(`Unknown Figma node type: ${figmaNode.type}`);
        }
    }
    importCanvas(figmaNode, parentId, options) {
        const pageId = this.sceneGraph.createNode('FRAME', parentId, -1, {
            name: figmaNode.name,
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            fills: this.convertFills(figmaNode.fills),
        });
        this.nodeCount++;
        for (const child of figmaNode.children ?? []) {
            this.importNode(child, pageId, options);
        }
    }
    importFrame(figmaNode, parentId, options) {
        const scale = options.scale ?? 1;
        const bounds = figmaNode.absoluteBoundingBox;
        const frameId = this.sceneGraph.createNode('FRAME', parentId, -1, {
            name: figmaNode.name,
            x: (bounds?.x ?? 0) * scale,
            y: (bounds?.y ?? 0) * scale,
            width: (bounds?.width ?? 100) * scale,
            height: (bounds?.height ?? 100) * scale,
            cornerRadius: figmaNode.cornerRadius ? figmaNode.cornerRadius * scale : undefined,
            fills: this.convertFills(figmaNode.fills),
            strokes: this.convertStrokes(figmaNode.strokes),
            strokeWeight: figmaNode.strokeWeight ? figmaNode.strokeWeight * scale : undefined,
            opacity: figmaNode.opacity,
            visible: figmaNode.visible ?? true,
        });
        this.nodeCount++;
        for (const child of figmaNode.children ?? []) {
            this.importNode(child, frameId, options);
        }
    }
    importRectangle(figmaNode, parentId, scale) {
        const bounds = figmaNode.absoluteBoundingBox;
        this.sceneGraph.createNode('FRAME', parentId, -1, {
            name: figmaNode.name,
            x: (bounds?.x ?? 0) * scale,
            y: (bounds?.y ?? 0) * scale,
            width: (bounds?.width ?? 100) * scale,
            height: (bounds?.height ?? 100) * scale,
            cornerRadius: figmaNode.cornerRadius ? figmaNode.cornerRadius * scale : undefined,
            fills: this.convertFills(figmaNode.fills),
            strokes: this.convertStrokes(figmaNode.strokes),
            strokeWeight: figmaNode.strokeWeight ? figmaNode.strokeWeight * scale : undefined,
            opacity: figmaNode.opacity,
            visible: figmaNode.visible ?? true,
        });
        this.nodeCount++;
    }
    importEllipse(figmaNode, parentId, scale) {
        const bounds = figmaNode.absoluteBoundingBox;
        const w = (bounds?.width ?? 100) * scale;
        const h = (bounds?.height ?? 100) * scale;
        // Create ellipse path
        const rx = w / 2;
        const ry = h / 2;
        const k = 0.5522847498;
        const path = {
            windingRule: 'NONZERO',
            commands: [
                { type: 'M', x: rx, y: 0 },
                { type: 'C', x1: rx, y1: -ry * k, x2: rx * k, y2: -ry, x: 0, y: -ry },
                { type: 'C', x1: -rx * k, y1: -ry, x2: -rx, y2: -ry * k, x: -rx, y: 0 },
                { type: 'C', x1: -rx, y1: ry * k, x2: -rx * k, y2: ry, x: 0, y: ry },
                { type: 'C', x1: rx * k, y1: ry, x2: rx, y2: ry * k, x: rx, y: 0 },
                { type: 'Z' },
            ],
        };
        this.sceneGraph.createNode('VECTOR', parentId, -1, {
            name: figmaNode.name,
            x: (bounds?.x ?? 0) * scale,
            y: (bounds?.y ?? 0) * scale,
            width: w,
            height: h,
            vectorPaths: [path],
            fills: this.convertFills(figmaNode.fills),
            strokes: this.convertStrokes(figmaNode.strokes),
            strokeWeight: figmaNode.strokeWeight ? figmaNode.strokeWeight * scale : undefined,
            opacity: figmaNode.opacity,
            visible: figmaNode.visible ?? true,
        });
        this.nodeCount++;
    }
    importVector(figmaNode, parentId, scale) {
        const bounds = figmaNode.absoluteBoundingBox;
        // Parse vector paths from Figma format
        const vectorPaths = this.convertVectorPaths(figmaNode.vectorPaths, scale);
        this.sceneGraph.createNode('VECTOR', parentId, -1, {
            name: figmaNode.name,
            x: (bounds?.x ?? 0) * scale,
            y: (bounds?.y ?? 0) * scale,
            width: (bounds?.width ?? 100) * scale,
            height: (bounds?.height ?? 100) * scale,
            vectorPaths,
            fills: this.convertFills(figmaNode.fills),
            strokes: this.convertStrokes(figmaNode.strokes),
            strokeWeight: figmaNode.strokeWeight ? figmaNode.strokeWeight * scale : undefined,
            opacity: figmaNode.opacity,
            visible: figmaNode.visible ?? true,
        });
        this.nodeCount++;
    }
    importText(figmaNode, parentId, scale) {
        const bounds = figmaNode.absoluteBoundingBox;
        const style = figmaNode.style ?? {};
        this.sceneGraph.createNode('TEXT', parentId, -1, {
            name: figmaNode.name,
            x: (bounds?.x ?? 0) * scale,
            y: (bounds?.y ?? 0) * scale,
            width: (bounds?.width ?? 100) * scale,
            height: (bounds?.height ?? 100) * scale,
            characters: figmaNode.characters ?? '',
            textStyles: [{
                    fontFamily: style.fontFamily ?? 'Inter',
                    fontSize: (style.fontSize ?? 14) * scale,
                    fontWeight: style.fontWeight ?? 400,
                    letterSpacing: style.letterSpacing,
                    lineHeight: style.lineHeightPx,
                }],
            textAlignHorizontal: style.textAlignHorizontal ?? 'LEFT',
            textAlignVertical: style.textAlignVertical ?? 'TOP',
            fills: this.convertFills(figmaNode.fills),
            opacity: figmaNode.opacity,
            visible: figmaNode.visible ?? true,
        });
        this.nodeCount++;
    }
    importComponent(figmaNode, parentId, options) {
        const scale = options.scale ?? 1;
        const bounds = figmaNode.absoluteBoundingBox;
        const componentId = this.sceneGraph.createNode('COMPONENT', parentId, -1, {
            name: figmaNode.name,
            x: (bounds?.x ?? 0) * scale,
            y: (bounds?.y ?? 0) * scale,
            width: (bounds?.width ?? 100) * scale,
            height: (bounds?.height ?? 100) * scale,
            fills: this.convertFills(figmaNode.fills),
            strokes: this.convertStrokes(figmaNode.strokes),
            opacity: figmaNode.opacity,
            visible: figmaNode.visible ?? true,
        });
        this.nodeCount++;
        for (const child of figmaNode.children ?? []) {
            this.importNode(child, componentId, options);
        }
    }
    importInstance(figmaNode, parentId, options) {
        const scale = options.scale ?? 1;
        const bounds = figmaNode.absoluteBoundingBox;
        // For instances, we import as a frame with the resolved content
        // A proper implementation would link to the component
        const instanceId = this.sceneGraph.createNode('FRAME', parentId, -1, {
            name: figmaNode.name,
            x: (bounds?.x ?? 0) * scale,
            y: (bounds?.y ?? 0) * scale,
            width: (bounds?.width ?? 100) * scale,
            height: (bounds?.height ?? 100) * scale,
            fills: this.convertFills(figmaNode.fills),
            strokes: this.convertStrokes(figmaNode.strokes),
            opacity: figmaNode.opacity,
            visible: figmaNode.visible ?? true,
        });
        this.nodeCount++;
        for (const child of figmaNode.children ?? []) {
            this.importNode(child, instanceId, options);
        }
    }
    importBooleanOperation(figmaNode, parentId, options) {
        const scale = options.scale ?? 1;
        const bounds = figmaNode.absoluteBoundingBox;
        // Import as GROUP for now
        const groupId = this.sceneGraph.createNode('GROUP', parentId, -1, {
            name: figmaNode.name,
            x: (bounds?.x ?? 0) * scale,
            y: (bounds?.y ?? 0) * scale,
            width: (bounds?.width ?? 100) * scale,
            height: (bounds?.height ?? 100) * scale,
            opacity: figmaNode.opacity,
            visible: figmaNode.visible ?? true,
        });
        this.nodeCount++;
        this.warnings.push(`Boolean operation "${figmaNode.name}" imported as group`);
        for (const child of figmaNode.children ?? []) {
            this.importNode(child, groupId, options);
        }
    }
    // =========================================================================
    // Private Methods - Type Conversion
    // =========================================================================
    convertFills(fills) {
        if (!fills)
            return [];
        return fills.map(fill => {
            if (fill.type === 'SOLID' && fill.color) {
                return {
                    type: 'SOLID',
                    visible: fill.visible ?? true,
                    color: {
                        r: fill.color.r,
                        g: fill.color.g,
                        b: fill.color.b,
                        a: fill.color.a,
                    },
                    opacity: fill.opacity ?? 1,
                };
            }
            if (fill.type.startsWith('GRADIENT') && fill.gradientStops) {
                return {
                    type: fill.type,
                    visible: fill.visible ?? true,
                    gradientStops: fill.gradientStops.map(stop => ({
                        position: stop.position,
                        color: {
                            r: stop.color.r,
                            g: stop.color.g,
                            b: stop.color.b,
                            a: stop.color.a,
                        },
                    })),
                    opacity: fill.opacity ?? 1,
                };
            }
            if (fill.type === 'IMAGE') {
                return {
                    type: 'IMAGE',
                    visible: fill.visible ?? true,
                    imageRef: fill.imageRef,
                    opacity: fill.opacity ?? 1,
                };
            }
            return null;
        }).filter((fill) => fill !== null);
    }
    convertStrokes(strokes) {
        if (!strokes)
            return [];
        return this.convertFills(strokes);
    }
    convertVectorPaths(paths, scale) {
        if (!paths)
            return [];
        return paths.map(path => ({
            windingRule: path.windingRule === 'EVENODD' ? 'EVENODD' : 'NONZERO',
            commands: this.parseSVGPathData(path.data, scale),
        }));
    }
    parseSVGPathData(d, scale) {
        // Simplified SVG path parser
        const commands = [];
        const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) ?? [];
        let i = 0;
        while (i < tokens.length) {
            const cmd = tokens[i];
            i++;
            switch (cmd) {
                case 'M': {
                    const x = parseFloat(tokens[i++]) * scale;
                    const y = parseFloat(tokens[i++]) * scale;
                    commands.push({ type: 'M', x, y });
                    break;
                }
                case 'L': {
                    const x = parseFloat(tokens[i++]) * scale;
                    const y = parseFloat(tokens[i++]) * scale;
                    commands.push({ type: 'L', x, y });
                    break;
                }
                case 'C': {
                    const x1 = parseFloat(tokens[i++]) * scale;
                    const y1 = parseFloat(tokens[i++]) * scale;
                    const x2 = parseFloat(tokens[i++]) * scale;
                    const y2 = parseFloat(tokens[i++]) * scale;
                    const x = parseFloat(tokens[i++]) * scale;
                    const y = parseFloat(tokens[i++]) * scale;
                    commands.push({ type: 'C', x1, y1, x2, y2, x, y });
                    break;
                }
                case 'Z':
                case 'z':
                    commands.push({ type: 'Z' });
                    break;
            }
        }
        return commands;
    }
    // =========================================================================
    // Private Methods - .fig File Parsing
    // =========================================================================
    async parseFigZip(_data, options) {
        // .fig files are ZIP archives
        // We need to extract and parse the contents
        this.warnings.push('.fig ZIP parsing has limited support');
        // For now, return a placeholder
        const parentId = options.parentId ?? this.getDefaultParent();
        const rootId = this.sceneGraph.createNode('GROUP', parentId, -1, {
            name: 'Imported Figma File',
            x: 0,
            y: 0,
        });
        this.nodeCount++;
        return {
            rootId,
            nodeCount: this.nodeCount,
            documentName: 'Imported Figma File',
            warnings: this.warnings,
        };
    }
    async parseFigProtobuf(_data, options) {
        // .fig protobuf format is proprietary and undocumented
        this.warnings.push('.fig protobuf parsing is not fully supported');
        const parentId = options.parentId ?? this.getDefaultParent();
        const rootId = this.sceneGraph.createNode('GROUP', parentId, -1, {
            name: 'Imported Figma File',
            x: 0,
            y: 0,
        });
        this.nodeCount++;
        return {
            rootId,
            nodeCount: this.nodeCount,
            documentName: 'Imported Figma File',
            warnings: this.warnings,
        };
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
 * Create a Figma importer.
 */
export function createFigmaImporter(sceneGraph) {
    return new FigmaImporter(sceneGraph);
}
//# sourceMappingURL=figma-importer.js.map