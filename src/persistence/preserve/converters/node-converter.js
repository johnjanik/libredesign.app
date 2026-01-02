/**
 * Node Converter
 *
 * Converts between internal NodeData and PreserveNode formats.
 */
/**
 * Convert internal NodeData to PreserveNode format.
 */
export function nodeToPreserve(node, children) {
    const base = {
        id: node.id,
        name: node.name,
        visible: node.visible,
        locked: node.locked,
    };
    switch (node.type) {
        case 'FRAME': {
            const frame = node;
            return {
                ...base,
                type: 'FRAME',
                transform: transformToPreserve(frame),
                appearance: appearanceToPreserve(frame),
                layout: layoutToPreserve(frame),
                constraints: constraintsToPreserve(frame),
                clipContent: frame.clipsContent,
                children,
            };
        }
        case 'GROUP': {
            const group = node;
            return {
                ...base,
                type: 'GROUP',
                transform: transformToPreserve(group),
                appearance: appearanceToPreserve(group),
                constraints: constraintsToPreserve(group),
                children,
            };
        }
        case 'VECTOR': {
            const vector = node;
            return {
                ...base,
                type: 'VECTOR',
                transform: transformToPreserve(vector),
                appearance: appearanceToPreserve(vector),
                constraints: constraintsToPreserve(vector),
                paths: vector.vectorPaths?.map(pathToPreserve) ?? [],
            };
        }
        case 'TEXT': {
            const text = node;
            return {
                ...base,
                type: 'TEXT',
                transform: transformToPreserve(text),
                appearance: appearanceToPreserve(text),
                constraints: constraintsToPreserve(text),
                characters: text.characters,
                styles: text.textStyles?.map(styleToPreserve) ?? [],
                textAlignHorizontal: text.textAlignHorizontal,
                textAlignVertical: text.textAlignVertical,
                textAutoResize: text.textAutoResize,
            };
        }
        case 'IMAGE': {
            const image = node;
            return {
                ...base,
                type: 'IMAGE',
                transform: transformToPreserve(image),
                appearance: appearanceToPreserve(image),
                constraints: constraintsToPreserve(image),
                assetRef: image.imageRef,
                scaleMode: image.scaleMode,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
            };
        }
        case 'COMPONENT': {
            const comp = node;
            return {
                ...base,
                type: 'COMPONENT',
                transform: transformToPreserve(comp),
                appearance: appearanceToPreserve(comp),
                constraints: constraintsToPreserve(comp),
                propertyDefinitions: comp.propertyDefinitions,
                children,
            };
        }
        case 'INSTANCE': {
            const instance = node;
            return {
                ...base,
                type: 'INSTANCE',
                transform: transformToPreserve(instance),
                constraints: constraintsToPreserve(instance),
                componentRef: instance.componentId ?? '',
                overrides: instance.overrides?.map(overrideToPreserve),
            };
        }
        case 'BOOLEAN_OPERATION': {
            const bool = node;
            return {
                ...base,
                type: 'BOOLEAN_OPERATION',
                transform: transformToPreserve(bool),
                appearance: appearanceToPreserve(bool),
                constraints: constraintsToPreserve(bool),
                booleanOperation: bool.booleanOperation ?? 'UNION',
                children,
            };
        }
        case 'SLICE': {
            const slice = node;
            return {
                ...base,
                type: 'SLICE',
                transform: {
                    x: slice.x ?? 0,
                    y: slice.y ?? 0,
                    width: slice.width ?? 100,
                    height: slice.height ?? 100,
                    rotation: slice.rotation ?? 0,
                },
                exportSettings: slice.exportSettings?.map(exportSettingToPreserve),
            };
        }
        default:
            // Fallback for unknown types - treat as frame
            return {
                ...base,
                type: 'FRAME',
                transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
                children,
            };
    }
}
function transformToPreserve(node) {
    return {
        x: node.x ?? 0,
        y: node.y ?? 0,
        width: node.width ?? 100,
        height: node.height ?? 100,
        rotation: node.rotation ?? 0,
    };
}
function appearanceToPreserve(node) {
    const appearance = {};
    if (node.opacity !== undefined && node.opacity !== 1) {
        appearance.opacity = node.opacity;
    }
    if (node.blendMode && node.blendMode !== 'NORMAL') {
        appearance.blendMode = node.blendMode;
    }
    if (node.fills && node.fills.length > 0) {
        appearance.fills = node.fills.map(paintToPreserve);
    }
    if (node.strokes && node.strokes.length > 0) {
        appearance.strokes = node.strokes.map(paintToPreserve);
    }
    if (node.strokeWeight !== undefined) {
        appearance.strokeWeight = node.strokeWeight;
    }
    if (node.strokeAlign) {
        appearance.strokeAlign = node.strokeAlign;
    }
    if (node.strokeCap) {
        appearance.strokeCap = node.strokeCap;
    }
    if (node.strokeJoin) {
        appearance.strokeJoin = node.strokeJoin;
    }
    if (node.dashPattern && node.dashPattern.length > 0) {
        appearance.dashPattern = [...node.dashPattern];
    }
    if (node.effects && node.effects.length > 0) {
        appearance.effects = node.effects.map(effectToPreserve);
    }
    // Return undefined if empty
    return Object.keys(appearance).length > 0 ? appearance : undefined;
}
function layoutToPreserve(node) {
    const autoLayout = node.autoLayout;
    if (!autoLayout || autoLayout.mode === 'NONE') {
        return undefined;
    }
    const result = {
        autoLayout: autoLayout.mode,
        gap: autoLayout.itemSpacing,
    };
    const hasPadding = autoLayout.paddingTop || autoLayout.paddingRight || autoLayout.paddingBottom || autoLayout.paddingLeft;
    if (hasPadding) {
        result.padding = {
            top: autoLayout.paddingTop ?? 0,
            right: autoLayout.paddingRight ?? 0,
            bottom: autoLayout.paddingBottom ?? 0,
            left: autoLayout.paddingLeft ?? 0,
        };
    }
    if (autoLayout.primaryAxisAlignItems) {
        result.alignItems = autoLayout.primaryAxisAlignItems;
    }
    if (autoLayout.counterAxisAlignItems) {
        result.justifyContent = autoLayout.counterAxisAlignItems;
    }
    return result;
}
function constraintsToPreserve(node) {
    if (!node.constraints) {
        return undefined;
    }
    return {
        horizontal: node.constraints.horizontal ?? 'MIN',
        vertical: node.constraints.vertical ?? 'MIN',
    };
}
function paintToPreserve(paint) {
    if (paint.type === 'SOLID') {
        const solid = paint;
        return {
            type: 'SOLID',
            color: solid.color,
            opacity: solid.opacity,
            visible: solid.visible,
        };
    }
    if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL') {
        const gradient = paint;
        return {
            type: paint.type,
            stops: gradient.gradientStops.map(stop => ({
                position: stop.position,
                color: stop.color,
            })),
            opacity: gradient.opacity,
            visible: gradient.visible,
        };
    }
    if (paint.type === 'IMAGE') {
        const image = paint;
        return {
            type: 'IMAGE',
            assetRef: image.imageRef,
            scaleMode: image.scaleMode,
            opacity: image.opacity,
            visible: image.visible,
        };
    }
    // Default to solid black
    return {
        type: 'SOLID',
        color: { r: 0, g: 0, b: 0, a: 1 },
    };
}
function effectToPreserve(effect) {
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        const shadow = effect;
        return {
            type: effect.type,
            color: shadow.color,
            offset: shadow.offset,
            blur: shadow.radius,
            spread: shadow.spread ?? 0,
            visible: shadow.visible,
        };
    }
    if (effect.type === 'BLUR' || effect.type === 'BACKGROUND_BLUR') {
        const blur = effect;
        return {
            type: effect.type,
            radius: blur.radius,
            visible: blur.visible,
        };
    }
    // Default
    return {
        type: 'BLUR',
        radius: 0,
    };
}
function pathToPreserve(path) {
    return {
        windingRule: path.windingRule,
        commands: path.commands.map(commandToPreserve),
    };
}
function commandToPreserve(cmd) {
    const result = { type: cmd.type };
    if ('x' in cmd && cmd.x !== undefined)
        result.x = cmd.x;
    if ('y' in cmd && cmd.y !== undefined)
        result.y = cmd.y;
    if ('x1' in cmd && cmd.x1 !== undefined)
        result.x1 = cmd.x1;
    if ('y1' in cmd && cmd.y1 !== undefined)
        result.y1 = cmd.y1;
    if ('x2' in cmd && cmd.x2 !== undefined)
        result.x2 = cmd.x2;
    if ('y2' in cmd && cmd.y2 !== undefined)
        result.y2 = cmd.y2;
    return result;
}
function styleToPreserve(style) {
    const result = {
        start: style.start ?? 0,
        end: style.end ?? 0,
        fontFamily: style.fontFamily ?? 'Inter',
        fontWeight: style.fontWeight ?? 400,
        fontSize: style.fontSize ?? 14,
    };
    if (typeof style.lineHeight === 'number') {
        result.lineHeight = { unit: 'PIXELS', value: style.lineHeight };
    }
    else if (style.lineHeight === 'AUTO') {
        result.lineHeight = { unit: 'AUTO' };
    }
    if (typeof style.letterSpacing === 'number') {
        result.letterSpacing = { unit: 'PIXELS', value: style.letterSpacing };
    }
    if (style.textDecoration) {
        result.textDecoration = style.textDecoration;
    }
    if (style.fills) {
        result.fills = [...style.fills].map(paintToPreserve);
    }
    return result;
}
function overrideToPreserve(override) {
    const o = override;
    return {
        path: o.path ?? [],
        value: o.value,
    };
}
function exportSettingToPreserve(setting) {
    return {
        format: setting.format ?? 'PNG',
        suffix: setting.suffix,
        scale: setting.constraint?.value,
    };
}
/**
 * Convert PreserveNode back to internal NodeData format.
 * This is used when importing .preserve files.
 */
export function preserveToNode(preserve) {
    // Implementation for import - simplified version
    // Full implementation would reverse all the above transforms
    const base = {
        id: preserve.id,
        name: preserve.name,
        visible: preserve.visible ?? true,
        locked: preserve.locked ?? false,
    };
    if (preserve.type === 'FRAME' || preserve.type === 'GROUP') {
        const frame = preserve;
        return {
            ...base,
            type: preserve.type,
            x: frame.transform.x,
            y: frame.transform.y,
            width: frame.transform.width,
            height: frame.transform.height,
            rotation: frame.transform.rotation,
            opacity: frame.appearance?.opacity ?? 1,
            fills: frame.appearance?.fills?.map(preserveToPaint) ?? [],
            strokes: frame.appearance?.strokes?.map(preserveToPaint) ?? [],
            effects: frame.appearance?.effects?.map(preserveToEffect) ?? [],
        };
    }
    // Add other type conversions as needed...
    return base;
}
function preserveToPaint(paint) {
    if (paint.type === 'SOLID') {
        return {
            type: 'SOLID',
            color: paint.color,
            opacity: paint.opacity ?? 1,
            visible: paint.visible ?? true,
        };
    }
    // Handle other paint types...
    return {
        type: 'SOLID',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
    };
}
function preserveToEffect(effect) {
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        return {
            type: effect.type,
            color: effect.color,
            offset: effect.offset,
            radius: effect.blur,
            spread: effect.spread,
            visible: effect.visible ?? true,
        };
    }
    return {
        type: 'BLUR',
        radius: effect.radius ?? 0,
        visible: effect.visible ?? true,
    };
}
//# sourceMappingURL=node-converter.js.map