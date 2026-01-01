/**
 * Property Extractor
 *
 * Extracts displayable properties from nodes for the inspector panel.
 */
import { isSceneNode } from '@scene/nodes/base-node';
import { rgbaToHex } from '@core/types/color';
// ============================================================================
// Property Extractor
// ============================================================================
/**
 * Extract all displayable properties from a node.
 */
export function extractProperties(node) {
    const categories = {
        identity: [],
        transform: [],
        appearance: [],
        layout: [],
        typography: [],
        effects: [],
    };
    const colors = [];
    // Identity properties (all nodes)
    categories['identity'].push(createProperty('name', 'Name', 'identity', node.name, node.name, `"${node.name}"`, true, 'string'), createProperty('type', 'Type', 'identity', node.type, node.type, node.type, false, 'string'), createProperty('id', 'ID', 'identity', node.id, truncateId(node.id), `"${node.id}"`, false, 'string'), createProperty('visible', 'Visible', 'identity', node.visible, node.visible ? 'Yes' : 'No', String(node.visible), true, 'boolean'), createProperty('locked', 'Locked', 'identity', node.locked, node.locked ? 'Yes' : 'No', String(node.locked), true, 'boolean'));
    // Transform properties (scene nodes)
    if (isSceneNode(node) || node.type === 'PAGE' || node.type === 'SLICE') {
        const n = node;
        categories['transform'].push(createProperty('x', 'X', 'transform', n.x, formatNumber(n.x), String(n.x), true, 'number', 'px'), createProperty('y', 'Y', 'transform', n.y, formatNumber(n.y), String(n.y), true, 'number', 'px'), createProperty('width', 'Width', 'transform', n.width, formatNumber(n.width), String(n.width), true, 'number', 'px'), createProperty('height', 'Height', 'transform', n.height, formatNumber(n.height), String(n.height), true, 'number', 'px'));
        if ('rotation' in n && n.rotation !== undefined) {
            categories['transform'].push(createProperty('rotation', 'Rotation', 'transform', n.rotation, formatNumber(n.rotation) + '°', String(n.rotation), true, 'number', '°'));
        }
    }
    // Appearance properties (scene nodes)
    if (isSceneNode(node)) {
        const n = node;
        categories['appearance'].push(createProperty('opacity', 'Opacity', 'appearance', n.opacity, formatPercent(n.opacity), String(n.opacity), true, 'number', '%'));
        categories['appearance'].push(createProperty('blendMode', 'Blend Mode', 'appearance', n.blendMode, formatBlendMode(n.blendMode), n.blendMode, true, 'enum', undefined, BLEND_MODES));
        // Fills
        if (n.fills && n.fills.length > 0) {
            const fillsDisplay = formatPaints(n.fills, 'Fill', colors);
            categories['appearance'].push(...fillsDisplay);
        }
        // Strokes
        if (n.strokes && n.strokes.length > 0) {
            const strokesDisplay = formatPaints(n.strokes, 'Stroke', colors);
            categories['appearance'].push(...strokesDisplay);
            if (n.strokeWeight !== undefined) {
                categories['appearance'].push(createProperty('strokeWeight', 'Stroke Width', 'appearance', n.strokeWeight, formatNumber(n.strokeWeight), String(n.strokeWeight), true, 'number', 'px'));
            }
        }
    }
    // Layout properties (frames)
    if (node.type === 'FRAME') {
        const frame = node;
        if (frame.autoLayout && frame.autoLayout.mode !== 'NONE') {
            const al = frame.autoLayout;
            categories['layout'].push(createProperty('autoLayout.mode', 'Layout', 'layout', al.mode, formatAutoLayoutMode(al.mode), al.mode, false, 'enum'), createProperty('autoLayout.itemSpacing', 'Item Spacing', 'layout', al.itemSpacing, formatNumber(al.itemSpacing), String(al.itemSpacing), true, 'number', 'px'), createProperty('autoLayout.paddingTop', 'Padding Top', 'layout', al.paddingTop, formatNumber(al.paddingTop), String(al.paddingTop), true, 'number', 'px'), createProperty('autoLayout.paddingRight', 'Padding Right', 'layout', al.paddingRight, formatNumber(al.paddingRight), String(al.paddingRight), true, 'number', 'px'), createProperty('autoLayout.paddingBottom', 'Padding Bottom', 'layout', al.paddingBottom, formatNumber(al.paddingBottom), String(al.paddingBottom), true, 'number', 'px'), createProperty('autoLayout.paddingLeft', 'Padding Left', 'layout', al.paddingLeft, formatNumber(al.paddingLeft), String(al.paddingLeft), true, 'number', 'px'));
        }
    }
    // Typography properties (text nodes)
    if (node.type === 'TEXT') {
        const text = node;
        categories['typography'].push(createProperty('characters', 'Content', 'typography', text.characters, truncateText(text.characters, 50), `"${text.characters}"`, true, 'string'), createProperty('textAlignHorizontal', 'Align H', 'typography', text.textAlignHorizontal, text.textAlignHorizontal, text.textAlignHorizontal, true, 'enum', undefined, ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']), createProperty('textAlignVertical', 'Align V', 'typography', text.textAlignVertical, text.textAlignVertical, text.textAlignVertical, true, 'enum', undefined, ['TOP', 'CENTER', 'BOTTOM']));
        // First text style
        if (text.textStyles && text.textStyles.length > 0) {
            const style = text.textStyles[0];
            categories['typography'].push(createProperty('fontFamily', 'Font', 'typography', style.fontFamily, style.fontFamily, `"${style.fontFamily}"`, true, 'string'), createProperty('fontSize', 'Size', 'typography', style.fontSize, formatNumber(style.fontSize), String(style.fontSize), true, 'number', 'px'), createProperty('fontWeight', 'Weight', 'typography', style.fontWeight, formatFontWeight(style.fontWeight), String(style.fontWeight), true, 'number'), createProperty('lineHeight', 'Line Height', 'typography', style.lineHeight, formatLineHeight(style.lineHeight), String(style.lineHeight), true, style.lineHeight === 'AUTO' ? 'enum' : 'number'), createProperty('letterSpacing', 'Letter Spacing', 'typography', style.letterSpacing, formatNumber(style.letterSpacing), String(style.letterSpacing), true, 'number', 'px'));
        }
    }
    // Effects
    if (isSceneNode(node)) {
        const n = node;
        if (n.effects && n.effects.length > 0) {
            const effectsDisplay = formatEffects(n.effects, colors);
            categories['effects'].push(...effectsDisplay);
        }
    }
    return {
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        categories,
        colors,
    };
}
/**
 * Extract properties from multiple selected nodes.
 * Returns only properties that are common across all nodes.
 */
export function extractSharedProperties(nodes) {
    if (nodes.length === 0)
        return null;
    if (nodes.length === 1)
        return extractProperties(nodes[0]);
    // For multiple selection, show count and shared properties
    const first = nodes[0];
    const categories = {
        identity: [],
        transform: [],
        appearance: [],
        layout: [],
        typography: [],
        effects: [],
    };
    categories['identity'].push(createProperty('count', 'Selected', 'identity', nodes.length, `${nodes.length} items`, String(nodes.length), false, 'number'));
    // Check for shared type
    const types = new Set(nodes.map(n => n.type));
    if (types.size === 1) {
        categories['identity'].push(createProperty('type', 'Type', 'identity', first.type, first.type, first.type, false, 'string'));
    }
    else {
        categories['identity'].push(createProperty('type', 'Type', 'identity', 'Mixed', 'Mixed', 'Mixed', false, 'string'));
    }
    // TODO: Extract more shared properties
    return {
        nodeId: 'multiple',
        nodeName: `${nodes.length} items`,
        nodeType: types.size === 1 ? first.type : 'MIXED',
        categories,
        colors: [],
    };
}
// ============================================================================
// Helper Functions
// ============================================================================
function createProperty(name, label, category, value, displayValue, copyValue, editable, type, unit, options) {
    return {
        name,
        label,
        category,
        value,
        displayValue,
        copyValue,
        editable,
        type,
        ...(unit !== undefined && { unit }),
        ...(options !== undefined && { options }),
    };
}
function formatNumber(n) {
    if (Number.isInteger(n))
        return String(n);
    return n.toFixed(2).replace(/\.?0+$/, '');
}
function formatPercent(n) {
    return `${Math.round(n * 100)}%`;
}
function truncateId(id) {
    if (id.length <= 12)
        return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.slice(0, maxLength - 3) + '...';
}
function formatBlendMode(mode) {
    return mode.charAt(0) + mode.slice(1).toLowerCase().replace(/_/g, ' ');
}
function formatAutoLayoutMode(mode) {
    switch (mode) {
        case 'HORIZONTAL': return 'Horizontal';
        case 'VERTICAL': return 'Vertical';
        case 'NONE': return 'None';
        default: return mode;
    }
}
function formatFontWeight(weight) {
    const names = {
        100: 'Thin',
        200: 'Extra Light',
        300: 'Light',
        400: 'Regular',
        500: 'Medium',
        600: 'Semi Bold',
        700: 'Bold',
        800: 'Extra Bold',
        900: 'Black',
    };
    return names[weight] ?? String(weight);
}
function formatLineHeight(lh) {
    if (lh === 'AUTO')
        return 'Auto';
    return formatNumber(lh);
}
function formatPaints(paints, prefix, colors) {
    const props = [];
    for (let i = 0; i < paints.length; i++) {
        const paint = paints[i];
        const index = paints.length > 1 ? ` ${i + 1}` : '';
        if (paint.type === 'SOLID') {
            const solid = paint;
            const hex = rgbaToHex(solid.color);
            colors.push({
                color: solid.color,
                hex,
                opacity: solid.opacity ?? 1,
            });
            props.push(createProperty(`fills[${i}].color`, `${prefix}${index}`, 'appearance', solid.color, hex.toUpperCase(), hex.toUpperCase(), true, 'color'));
        }
        else if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL') {
            const gradient = paint;
            const gradientType = paint.type === 'GRADIENT_LINEAR' ? 'Linear' : 'Radial';
            const stopsCount = gradient.gradientStops?.length ?? 0;
            props.push(createProperty(`fills[${i}]`, `${prefix}${index}`, 'appearance', paint, `${gradientType} (${stopsCount} stops)`, paint.type, false, 'complex'));
            // Add gradient stop colors to swatches
            for (const stop of gradient.gradientStops ?? []) {
                colors.push({
                    color: stop.color,
                    hex: rgbaToHex(stop.color),
                    opacity: stop.color.a,
                });
            }
        }
        else if (paint.type === 'IMAGE') {
            props.push(createProperty(`fills[${i}]`, `${prefix}${index}`, 'appearance', paint, 'Image', 'IMAGE', false, 'complex'));
        }
    }
    return props;
}
function formatEffects(effects, colors) {
    const props = [];
    for (let i = 0; i < effects.length; i++) {
        const effect = effects[i];
        if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
            const shadow = effect;
            const hex = rgbaToHex(shadow.color);
            colors.push({
                color: shadow.color,
                hex,
                opacity: shadow.color.a,
            });
            const shadowType = effect.type === 'DROP_SHADOW' ? 'Drop Shadow' : 'Inner Shadow';
            const displayValue = `${shadowType} (${formatNumber(shadow.offset.x)}, ${formatNumber(shadow.offset.y)})`;
            props.push(createProperty(`effects[${i}]`, shadowType, 'effects', shadow, displayValue, `${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px ${hex}`, false, 'complex'));
        }
        else if (effect.type === 'BLUR' || effect.type === 'BACKGROUND_BLUR') {
            const blur = effect;
            const blurType = effect.type === 'BLUR' ? 'Blur' : 'Background Blur';
            props.push(createProperty(`effects[${i}]`, blurType, 'effects', blur, `${blurType} (${formatNumber(blur.radius)}px)`, `blur(${blur.radius}px)`, false, 'complex'));
        }
    }
    return props;
}
const BLEND_MODES = [
    'NORMAL',
    'MULTIPLY',
    'SCREEN',
    'OVERLAY',
    'DARKEN',
    'LIGHTEN',
    'COLOR_DODGE',
    'COLOR_BURN',
    'HARD_LIGHT',
    'SOFT_LIGHT',
    'DIFFERENCE',
    'EXCLUSION',
    'HUE',
    'SATURATION',
    'COLOR',
    'LUMINOSITY',
];
//# sourceMappingURL=property-extractor.js.map