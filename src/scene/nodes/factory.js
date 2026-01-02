/**
 * Node factory functions
 */
import { generateNodeId } from '@core/utils/uuid';
import { rgba } from '@core/types/color';
import { solidPaint } from '@core/types/paint';
import { DEFAULT_TRANSFORM, DEFAULT_APPEARANCE, DEFAULT_CONSTRAINTS, DEFAULT_AUTO_LAYOUT, DEFAULT_PAGE_BACKGROUND, DEFAULT_TEXT_STYLE, getDefaultNodeName, } from './defaults';
/** Create a document node */
export function createDocument(options = {}) {
    return {
        id: options.id ?? generateNodeId(),
        type: 'DOCUMENT',
        name: options.name ?? getDefaultNodeName('DOCUMENT'),
        visible: true,
        locked: false,
        parentId: null,
        childIds: [],
        pluginData: {},
    };
}
/** Create a page node */
export function createPage(options = {}) {
    return {
        id: options.id ?? generateNodeId(),
        type: 'PAGE',
        name: options.name ?? getDefaultNodeName('PAGE'),
        visible: true,
        locked: false,
        parentId: null,
        childIds: [],
        pluginData: {},
        x: 0,
        y: 0,
        width: options.width ?? 1920,
        height: options.height ?? 1080,
        rotation: 0,
        backgroundColor: options.backgroundColor ?? DEFAULT_PAGE_BACKGROUND,
    };
}
/** Create a frame node */
export function createFrame(options = {}) {
    return {
        id: options.id ?? generateNodeId(),
        type: 'FRAME',
        name: options.name ?? getDefaultNodeName('FRAME'),
        visible: true,
        locked: false,
        parentId: null,
        childIds: [],
        pluginData: {},
        ...DEFAULT_TRANSFORM,
        x: options.x ?? 0,
        y: options.y ?? 0,
        width: options.width ?? 100,
        height: options.height ?? 100,
        ...DEFAULT_APPEARANCE,
        fills: [solidPaint(rgba(1, 1, 1, 1))],
        constraints: DEFAULT_CONSTRAINTS,
        clipsContent: true,
        autoLayout: DEFAULT_AUTO_LAYOUT,
    };
}
/** Create a group node */
export function createGroup(options = {}) {
    return {
        id: options.id ?? generateNodeId(),
        type: 'GROUP',
        name: options.name ?? getDefaultNodeName('GROUP'),
        visible: true,
        locked: false,
        parentId: null,
        childIds: [],
        pluginData: {},
        ...DEFAULT_TRANSFORM,
        ...DEFAULT_APPEARANCE,
        constraints: DEFAULT_CONSTRAINTS,
        clipsContent: false,
    };
}
/** Create a vector node */
export function createVector(options = {}) {
    return {
        id: options.id ?? generateNodeId(),
        type: 'VECTOR',
        name: options.name ?? getDefaultNodeName('VECTOR'),
        visible: true,
        locked: false,
        parentId: null,
        childIds: [],
        pluginData: {},
        ...DEFAULT_TRANSFORM,
        x: options.x ?? 0,
        y: options.y ?? 0,
        width: options.width ?? 100,
        height: options.height ?? 100,
        ...DEFAULT_APPEARANCE,
        fills: options.fills ?? [solidPaint(rgba(0.85, 0.85, 0.85, 1))],
        strokes: options.strokes ?? [],
        strokeWeight: options.strokeWeight ?? 1,
        constraints: DEFAULT_CONSTRAINTS,
        clipsContent: false,
        vectorPaths: options.vectorPaths ?? [],
    };
}
/** Create an image node */
export function createImage(options) {
    return {
        id: options.id ?? generateNodeId(),
        type: 'IMAGE',
        name: options.name ?? getDefaultNodeName('IMAGE'),
        visible: true,
        locked: false,
        parentId: null,
        childIds: [],
        pluginData: {},
        ...DEFAULT_TRANSFORM,
        x: options.x ?? 0,
        y: options.y ?? 0,
        width: options.width ?? options.naturalWidth ?? 100,
        height: options.height ?? options.naturalHeight ?? 100,
        ...DEFAULT_APPEARANCE,
        fills: [],
        strokes: [],
        constraints: DEFAULT_CONSTRAINTS,
        clipsContent: false,
        imageRef: options.imageRef,
        naturalWidth: options.naturalWidth ?? options.width ?? 100,
        naturalHeight: options.naturalHeight ?? options.height ?? 100,
        scaleMode: options.scaleMode ?? 'FILL',
    };
}
/** Create a text node */
export function createText(options = {}) {
    const characters = options.characters ?? '';
    return {
        id: options.id ?? generateNodeId(),
        type: 'TEXT',
        name: options.name ?? getDefaultNodeName('TEXT'),
        visible: true,
        locked: false,
        parentId: null,
        childIds: [],
        pluginData: {},
        ...DEFAULT_TRANSFORM,
        x: options.x ?? 0,
        y: options.y ?? 0,
        width: 100,
        height: 20,
        ...DEFAULT_APPEARANCE,
        constraints: DEFAULT_CONSTRAINTS,
        clipsContent: false,
        characters,
        textStyles: [
            {
                start: 0,
                end: characters.length,
                ...DEFAULT_TEXT_STYLE,
            },
        ],
        textAutoResize: 'WIDTH_AND_HEIGHT',
        textAlignHorizontal: 'LEFT',
        textAlignVertical: 'TOP',
        paragraphSpacing: 0,
    };
}
/** Create a component node */
export function createComponent(options = {}) {
    return {
        id: options.id ?? generateNodeId(),
        type: 'COMPONENT',
        name: options.name ?? getDefaultNodeName('COMPONENT'),
        visible: true,
        locked: false,
        parentId: null,
        childIds: [],
        pluginData: {},
        ...DEFAULT_TRANSFORM,
        x: options.x ?? 0,
        y: options.y ?? 0,
        width: options.width ?? 100,
        height: options.height ?? 100,
        ...DEFAULT_APPEARANCE,
        fills: [solidPaint(rgba(1, 1, 1, 1))],
        constraints: DEFAULT_CONSTRAINTS,
        clipsContent: true,
        propertyDefinitions: {},
    };
}
/** Create an instance node */
export function createInstance(options) {
    return {
        id: options.id ?? generateNodeId(),
        type: 'INSTANCE',
        name: options.name ?? getDefaultNodeName('INSTANCE'),
        visible: true,
        locked: false,
        parentId: null,
        childIds: [],
        pluginData: {},
        ...DEFAULT_TRANSFORM,
        x: options.x ?? 0,
        y: options.y ?? 0,
        ...DEFAULT_APPEARANCE,
        constraints: DEFAULT_CONSTRAINTS,
        clipsContent: true,
        componentId: options.componentId,
        overrides: [],
        exposedInstances: [],
    };
}
/** Create a boolean operation node */
export function createBooleanOperation(options = {}) {
    return {
        id: options.id ?? generateNodeId(),
        type: 'BOOLEAN_OPERATION',
        name: options.name ?? getDefaultNodeName('BOOLEAN_OPERATION'),
        visible: true,
        locked: false,
        parentId: null,
        childIds: [],
        pluginData: {},
        ...DEFAULT_TRANSFORM,
        ...DEFAULT_APPEARANCE,
        constraints: DEFAULT_CONSTRAINTS,
        clipsContent: false,
        booleanOperation: options.operation ?? 'UNION',
    };
}
/** Create a slice node */
export function createSlice(options = {}) {
    return {
        id: options.id ?? generateNodeId(),
        type: 'SLICE',
        name: options.name ?? getDefaultNodeName('SLICE'),
        visible: true,
        locked: false,
        parentId: null,
        childIds: [],
        pluginData: {},
        x: options.x ?? 0,
        y: options.y ?? 0,
        width: options.width ?? 100,
        height: options.height ?? 100,
        rotation: 0,
        exportSettings: [],
    };
}
//# sourceMappingURL=factory.js.map