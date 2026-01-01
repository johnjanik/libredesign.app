/**
 * CSS Code Generator
 *
 * Generate CSS code from scene graph nodes for web development.
 */
/**
 * Blend mode to CSS mapping
 */
const BLEND_MODE_MAP = {
    PASS_THROUGH: 'normal',
    NORMAL: 'normal',
    DARKEN: 'darken',
    MULTIPLY: 'multiply',
    COLOR_BURN: 'color-burn',
    LIGHTEN: 'lighten',
    SCREEN: 'screen',
    COLOR_DODGE: 'color-dodge',
    OVERLAY: 'overlay',
    SOFT_LIGHT: 'soft-light',
    HARD_LIGHT: 'hard-light',
    DIFFERENCE: 'difference',
    EXCLUSION: 'exclusion',
    HUE: 'hue',
    SATURATION: 'saturation',
    COLOR: 'color',
    LUMINOSITY: 'luminosity',
};
/**
 * CSS Code Generator
 */
export class CSSGenerator {
    sceneGraph;
    colorIndex = 0;
    typographyIndex = 0;
    extractedColors = new Map();
    extractedTypography = new Map();
    constructor(sceneGraph) {
        this.sceneGraph = sceneGraph;
    }
    /**
     * Generate CSS for a node.
     */
    generate(nodeId, options = {}) {
        const format = options.format ?? 'css';
        const useVariables = options.useVariables ?? true;
        const variablePrefix = options.variablePrefix ?? '--designlibre-';
        const classPrefix = options.classPrefix ?? '';
        const useShorthand = options.useShorthand ?? true;
        const includeComments = options.includeComments ?? true;
        const unit = options.unit ?? 'px';
        const baseFontSize = options.baseFontSize ?? 16;
        const minify = options.minify ?? false;
        const includeReset = options.includeReset ?? false;
        // Reset extraction state
        this.colorIndex = 0;
        this.typographyIndex = 0;
        this.extractedColors.clear();
        this.extractedTypography.clear();
        const nl = minify ? '' : '\n';
        const space = minify ? '' : ' ';
        const parts = [];
        const classNames = [];
        // Add reset styles if requested
        if (includeReset) {
            parts.push(this.generateReset(minify));
            parts.push(nl);
        }
        // First pass: extract colors and typography
        this.extractDesignTokens(nodeId, variablePrefix);
        // Generate CSS variables
        const variables = this.generateVariables(variablePrefix, minify);
        // Second pass: generate styles
        const styles = this.generateNodeStyles(nodeId, {
            classPrefix,
            useVariables,
            variablePrefix,
            useShorthand,
            includeComments,
            unit,
            baseFontSize,
            minify,
            format,
        }, classNames);
        // Build output based on format
        if (format === 'scss' || format === 'less') {
            parts.push(variables);
            parts.push(nl);
            parts.push(styles);
        }
        else if (format === 'tailwind') {
            parts.push(this.generateTailwindConfig());
        }
        else {
            // Standard CSS
            if (useVariables && variables) {
                parts.push(`:root${space}{${nl}${variables}}${nl}${nl}`);
            }
            parts.push(styles);
        }
        const css = parts.join('');
        const blob = new Blob([css], { type: 'text/css' });
        const url = URL.createObjectURL(blob);
        return {
            css,
            variables,
            classNames,
            colorPalette: Array.from(this.extractedColors.values()),
            typography: Array.from(this.extractedTypography.values()),
            blob,
            url,
        };
    }
    /**
     * Generate CSS for multiple nodes.
     */
    generateMultiple(nodeIds, options = {}) {
        if (nodeIds.length === 0) {
            throw new Error('No nodes to generate CSS for');
        }
        if (nodeIds.length === 1) {
            return this.generate(nodeIds[0], options);
        }
        const minify = options.minify ?? false;
        const useVariables = options.useVariables ?? true;
        const variablePrefix = options.variablePrefix ?? '--designlibre-';
        const nl = minify ? '' : '\n';
        const space = minify ? '' : ' ';
        // Reset extraction state
        this.colorIndex = 0;
        this.typographyIndex = 0;
        this.extractedColors.clear();
        this.extractedTypography.clear();
        // Extract all design tokens first
        for (const nodeId of nodeIds) {
            this.extractDesignTokens(nodeId, variablePrefix);
        }
        const variables = this.generateVariables(variablePrefix, minify);
        const parts = [];
        const classNames = [];
        if (useVariables && variables) {
            parts.push(`:root${space}{${nl}${variables}}${nl}${nl}`);
        }
        // Generate styles for each node
        for (const nodeId of nodeIds) {
            const styles = this.generateNodeStyles(nodeId, {
                classPrefix: options.classPrefix ?? '',
                useVariables,
                variablePrefix,
                useShorthand: options.useShorthand ?? true,
                includeComments: options.includeComments ?? true,
                unit: options.unit ?? 'px',
                baseFontSize: options.baseFontSize ?? 16,
                minify,
                ...(options.format !== undefined && { format: options.format }),
            }, classNames);
            parts.push(styles);
            if (!minify)
                parts.push(nl);
        }
        const css = parts.join('');
        const blob = new Blob([css], { type: 'text/css' });
        const url = URL.createObjectURL(blob);
        return {
            css,
            variables,
            classNames,
            colorPalette: Array.from(this.extractedColors.values()),
            typography: Array.from(this.extractedTypography.values()),
            blob,
            url,
        };
    }
    /**
     * Download the generated CSS.
     */
    download(nodeId, filename = 'styles.css', options = {}) {
        const result = this.generate(nodeId, options);
        const link = document.createElement('a');
        link.href = result.url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(result.url);
    }
    // =========================================================================
    // Private Methods
    // =========================================================================
    extractDesignTokens(nodeId, prefix) {
        const node = this.sceneGraph.getNode(nodeId);
        if (!node)
            return;
        // Extract colors from fills and strokes
        if ('fills' in node) {
            const fills = node.fills;
            for (const fill of fills ?? []) {
                if (fill.type === 'SOLID' && fill.visible !== false) {
                    this.registerColor(fill.color, prefix);
                }
            }
        }
        if ('strokes' in node) {
            const strokes = node.strokes;
            for (const stroke of strokes ?? []) {
                if (stroke.type === 'SOLID' && stroke.visible !== false) {
                    this.registerColor(stroke.color, prefix);
                }
            }
        }
        // Extract typography from text nodes
        if (node.type === 'TEXT') {
            const textNode = node;
            for (const style of textNode.textStyles ?? []) {
                // Handle lineHeight which can be number | 'AUTO'
                const lineHeight = typeof style.lineHeight === 'number' ? style.lineHeight : undefined;
                this.registerTypography({
                    fontFamily: style.fontFamily,
                    fontSize: style.fontSize,
                    fontWeight: style.fontWeight,
                    ...(lineHeight !== undefined && { lineHeight }),
                    letterSpacing: style.letterSpacing,
                }, prefix);
            }
        }
        // Extract from children
        const childIds = this.sceneGraph.getChildIds(nodeId);
        for (const childId of childIds) {
            this.extractDesignTokens(childId, prefix);
        }
    }
    registerColor(color, prefix) {
        const key = this.colorToHex(color);
        if (!this.extractedColors.has(key)) {
            const name = `${prefix}color-${++this.colorIndex}`;
            this.extractedColors.set(key, {
                name,
                value: this.colorToCSS(color),
                rgba: color,
            });
        }
        return this.extractedColors.get(key).name;
    }
    registerTypography(style, prefix) {
        const key = `${style.fontFamily}-${style.fontSize}-${style.fontWeight}`;
        if (!this.extractedTypography.has(key)) {
            const name = `${prefix}font-${++this.typographyIndex}`;
            this.extractedTypography.set(key, {
                name,
                fontFamily: style.fontFamily ?? 'sans-serif',
                fontSize: style.fontSize ?? 16,
                fontWeight: style.fontWeight ?? 400,
                lineHeight: style.lineHeight,
                letterSpacing: style.letterSpacing,
            });
        }
        return this.extractedTypography.get(key).name;
    }
    generateVariables(_prefix, minify) {
        const nl = minify ? '' : '\n';
        const indent = minify ? '' : '  ';
        const parts = [];
        // Color variables
        for (const color of this.extractedColors.values()) {
            parts.push(`${indent}${color.name}: ${color.value};${nl}`);
        }
        // Typography variables
        for (const typo of this.extractedTypography.values()) {
            parts.push(`${indent}${typo.name}-family: ${typo.fontFamily};${nl}`);
            parts.push(`${indent}${typo.name}-size: ${typo.fontSize}px;${nl}`);
            parts.push(`${indent}${typo.name}-weight: ${typo.fontWeight};${nl}`);
        }
        return parts.join('');
    }
    generateNodeStyles(nodeId, options, classNames) {
        const node = this.sceneGraph.getNode(nodeId);
        if (!node)
            return '';
        if ('visible' in node && !node.visible) {
            return '';
        }
        const { classPrefix, useVariables, variablePrefix, includeComments, unit, baseFontSize, minify } = options;
        const nl = minify ? '' : '\n';
        const indent = minify ? '' : '  ';
        const space = minify ? '' : ' ';
        const parts = [];
        const className = this.sanitizeClassName(`${classPrefix}${node.name || node.type.toLowerCase()}`);
        classNames.push(className);
        // Add comment with node info
        if (includeComments && !minify) {
            parts.push(`/* ${node.name || node.type} */\n`);
        }
        const properties = [];
        // Position and dimensions
        if ('x' in node && 'y' in node) {
            const n = node;
            properties.push(`position:${space}absolute`);
            properties.push(`left:${space}${this.toUnit(n.x, unit, baseFontSize)}`);
            properties.push(`top:${space}${this.toUnit(n.y, unit, baseFontSize)}`);
            if (n.width !== undefined) {
                properties.push(`width:${space}${this.toUnit(n.width, unit, baseFontSize)}`);
            }
            if (n.height !== undefined) {
                properties.push(`height:${space}${this.toUnit(n.height, unit, baseFontSize)}`);
            }
        }
        // Opacity
        if ('opacity' in node) {
            const opacity = node.opacity;
            if (opacity !== 1) {
                properties.push(`opacity:${space}${opacity}`);
            }
        }
        // Blend mode
        if ('blendMode' in node) {
            const blendMode = node.blendMode;
            if (blendMode && blendMode !== 'NORMAL' && blendMode !== 'PASS_THROUGH') {
                properties.push(`mix-blend-mode:${space}${BLEND_MODE_MAP[blendMode]}`);
            }
        }
        // Rotation
        if ('rotation' in node) {
            const rotation = node.rotation;
            if (rotation && rotation !== 0) {
                properties.push(`transform:${space}rotate(${rotation}deg)`);
            }
        }
        // Background (fills)
        if ('fills' in node) {
            const fills = node.fills ?? [];
            const bgValue = this.fillsToCSS(fills, useVariables, variablePrefix);
            if (bgValue) {
                properties.push(`background:${space}${bgValue}`);
            }
        }
        // Border radius
        if ('cornerRadius' in node) {
            const radius = node.cornerRadius;
            if (radius > 0) {
                properties.push(`border-radius:${space}${this.toUnit(radius, unit, baseFontSize)}`);
            }
        }
        // Strokes as border
        if ('strokes' in node && 'strokeWeight' in node) {
            const strokes = node.strokes ?? [];
            const strokeWeight = node.strokeWeight ?? 1;
            const borderValue = this.strokesToCSS(strokes, strokeWeight, useVariables, variablePrefix);
            if (borderValue) {
                properties.push(`border:${space}${borderValue}`);
            }
        }
        // Effects (shadows, blur)
        if ('effects' in node) {
            const effects = node.effects ?? [];
            const shadowValue = this.effectsToCSS(effects);
            if (shadowValue) {
                properties.push(`box-shadow:${space}${shadowValue}`);
            }
        }
        // Text styles
        if (node.type === 'TEXT') {
            const textNode = node;
            const textStyles = this.textStylesToCSS(textNode, useVariables, variablePrefix, unit, baseFontSize);
            properties.push(...textStyles);
        }
        // Build the CSS rule
        if (properties.length > 0) {
            parts.push(`.${className}${space}{${nl}`);
            for (const prop of properties) {
                parts.push(`${indent}${prop};${nl}`);
            }
            parts.push(`}${nl}`);
        }
        // Generate styles for children
        const childIds = this.sceneGraph.getChildIds(nodeId);
        for (const childId of childIds) {
            const childStyles = this.generateNodeStyles(childId, options, classNames);
            if (childStyles) {
                parts.push(childStyles);
            }
        }
        return parts.join('');
    }
    generateReset(minify) {
        const nl = minify ? '' : '\n';
        const indent = minify ? '' : '  ';
        const space = minify ? '' : ' ';
        return `*,${space}*::before,${space}*::after${space}{${nl}${indent}box-sizing:${space}border-box;${nl}${indent}margin:${space}0;${nl}${indent}padding:${space}0;${nl}}${nl}`;
    }
    generateTailwindConfig() {
        const colors = {};
        const fontFamily = {};
        const fontSize = {};
        for (const color of this.extractedColors.values()) {
            colors[`designlibre-${this.colorIndex++}`] = color.value;
        }
        for (const typo of this.extractedTypography.values()) {
            fontFamily[`designlibre-${this.typographyIndex++}`] = [typo.fontFamily];
            fontSize[`designlibre-${this.typographyIndex}`] = `${typo.fontSize}px`;
        }
        return `/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(colors, null, 2)},
      fontFamily: ${JSON.stringify(fontFamily, null, 2)},
      fontSize: ${JSON.stringify(fontSize, null, 2)},
    },
  },
};
`;
    }
    fillsToCSS(fills, useVariables, _prefix) {
        const visibleFills = fills.filter(f => f.visible !== false);
        if (visibleFills.length === 0)
            return '';
        const solidFill = visibleFills.find(f => f.type === 'SOLID');
        if (solidFill && solidFill.color) {
            if (useVariables) {
                const colorDef = this.extractedColors.get(this.colorToHex(solidFill.color));
                if (colorDef) {
                    return `var(${colorDef.name})`;
                }
            }
            return this.colorToCSS(solidFill.color, solidFill.opacity);
        }
        // TODO: Handle gradients
        return '';
    }
    strokesToCSS(strokes, strokeWeight, useVariables, _prefix) {
        const visibleStrokes = strokes.filter(s => s.visible !== false);
        if (visibleStrokes.length === 0)
            return '';
        const solidStroke = visibleStrokes.find(s => s.type === 'SOLID');
        if (solidStroke && solidStroke.color) {
            const colorValue = useVariables
                ? `var(${this.extractedColors.get(this.colorToHex(solidStroke.color))?.name ?? this.colorToCSS(solidStroke.color)})`
                : this.colorToCSS(solidStroke.color, solidStroke.opacity);
            return `${strokeWeight}px solid ${colorValue}`;
        }
        return '';
    }
    effectsToCSS(effects) {
        const shadows = [];
        for (const effect of effects) {
            const e = effect;
            if (e.visible === false)
                continue;
            if (e.type === 'DROP_SHADOW' && e.color && e.offset) {
                const color = this.colorToCSS(e.color);
                const x = e.offset.x ?? 0;
                const y = e.offset.y ?? 0;
                const blur = e.radius ?? 0;
                const spread = e.spread ?? 0;
                shadows.push(`${x}px ${y}px ${blur}px ${spread}px ${color}`);
            }
            else if (e.type === 'INNER_SHADOW' && e.color && e.offset) {
                const color = this.colorToCSS(e.color);
                const x = e.offset.x ?? 0;
                const y = e.offset.y ?? 0;
                const blur = e.radius ?? 0;
                shadows.push(`inset ${x}px ${y}px ${blur}px ${color}`);
            }
        }
        return shadows.join(', ');
    }
    textStylesToCSS(node, useVariables, _prefix, unit, baseFontSize) {
        const properties = [];
        const firstStyle = node.textStyles[0];
        if (firstStyle) {
            properties.push(`font-family: ${firstStyle.fontFamily ?? 'sans-serif'}`);
            properties.push(`font-size: ${this.toUnit(firstStyle.fontSize ?? 16, unit, baseFontSize)}`);
            properties.push(`font-weight: ${firstStyle.fontWeight ?? 400}`);
            if (firstStyle.lineHeight) {
                properties.push(`line-height: ${firstStyle.lineHeight}`);
            }
            if (firstStyle.letterSpacing) {
                properties.push(`letter-spacing: ${firstStyle.letterSpacing}px`);
            }
        }
        // Text alignment
        if (node.textAlignHorizontal) {
            const alignMap = {
                LEFT: 'left',
                CENTER: 'center',
                RIGHT: 'right',
                JUSTIFIED: 'justify',
            };
            properties.push(`text-align: ${alignMap[node.textAlignHorizontal] ?? 'left'}`);
        }
        // Text color from fills
        const fills = node.fills ?? [];
        const solidFill = fills.find(f => f.type === 'SOLID' && f.visible !== false);
        if (solidFill && 'color' in solidFill) {
            const color = solidFill.color;
            if (useVariables) {
                const colorDef = this.extractedColors.get(this.colorToHex(color));
                if (colorDef) {
                    properties.push(`color: var(${colorDef.name})`);
                }
            }
            else {
                properties.push(`color: ${this.colorToCSS(color)}`);
            }
        }
        return properties;
    }
    colorToCSS(color, opacity) {
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);
        const a = color.a * (opacity ?? 1);
        if (a === 1) {
            return `rgb(${r}, ${g}, ${b})`;
        }
        return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    }
    colorToHex(color) {
        const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
        const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
        const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
        const a = Math.round(color.a * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}${a}`;
    }
    toUnit(value, unit, baseFontSize) {
        switch (unit) {
            case 'rem':
                return `${(value / baseFontSize).toFixed(4)}rem`;
            case 'em':
                return `${(value / baseFontSize).toFixed(4)}em`;
            default:
                return `${value}px`;
        }
    }
    sanitizeClassName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
/**
 * Create a CSS generator.
 */
export function createCSSGenerator(sceneGraph) {
    return new CSSGenerator(sceneGraph);
}
//# sourceMappingURL=css-generator.js.map