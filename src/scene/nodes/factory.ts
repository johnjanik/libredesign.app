/**
 * Node factory functions
 */

import { generateNodeId } from '@core/utils/uuid';
import type { NodeId } from '@core/types/common';
import type { VectorPath } from '@core/types/geometry';
import type { Paint } from '@core/types/paint';
import { rgba } from '@core/types/color';
import { solidPaint } from '@core/types/paint';
import type {
  DocumentNodeData,
  PageNodeData,
  FrameNodeData,
  GroupNodeData,
  VectorNodeData,
  ImageNodeData,
  ImageScaleMode,
  TextNodeData,
  ComponentNodeData,
  InstanceNodeData,
  BooleanOperationNodeData,
  SliceNodeData,
} from './base-node';
import {
  DEFAULT_TRANSFORM,
  DEFAULT_APPEARANCE,
  DEFAULT_CONSTRAINTS,
  DEFAULT_AUTO_LAYOUT,
  DEFAULT_PAGE_BACKGROUND,
  DEFAULT_TEXT_STYLE,
  getDefaultNodeName,
} from './defaults';

/** Options for creating a document node */
export interface CreateDocumentOptions {
  id?: NodeId;
  name?: string;
}

/** Create a document node */
export function createDocument(options: CreateDocumentOptions = {}): DocumentNodeData {
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

/** Options for creating a page node */
export interface CreatePageOptions {
  id?: NodeId;
  name?: string;
  width?: number;
  height?: number;
  backgroundColor?: { r: number; g: number; b: number; a: number };
}

/** Create a page node */
export function createPage(options: CreatePageOptions = {}): PageNodeData {
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

/** Options for creating a frame node */
export interface CreateFrameOptions {
  id?: NodeId;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/** Create a frame node */
export function createFrame(options: CreateFrameOptions = {}): FrameNodeData {
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

/** Options for creating a group node */
export interface CreateGroupOptions {
  id?: NodeId;
  name?: string;
}

/** Create a group node */
export function createGroup(options: CreateGroupOptions = {}): GroupNodeData {
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

/** Options for creating a vector node */
export interface CreateVectorOptions {
  id?: NodeId;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  vectorPaths?: VectorPath[];
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
}

/** Create a vector node */
export function createVector(options: CreateVectorOptions = {}): VectorNodeData {
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

/** Options for creating an image node */
export interface CreateImageOptions {
  id?: NodeId;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  imageRef: string;
  naturalWidth?: number;
  naturalHeight?: number;
  scaleMode?: ImageScaleMode;
}

/** Create an image node */
export function createImage(options: CreateImageOptions): ImageNodeData {
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

/** Options for creating a text node */
export interface CreateTextOptions {
  id?: NodeId;
  name?: string;
  x?: number;
  y?: number;
  characters?: string;
}

/** Create a text node */
export function createText(options: CreateTextOptions = {}): TextNodeData {
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

/** Options for creating a component node */
export interface CreateComponentOptions {
  id?: NodeId;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/** Create a component node */
export function createComponent(options: CreateComponentOptions = {}): ComponentNodeData {
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

/** Options for creating an instance node */
export interface CreateInstanceOptions {
  id?: NodeId;
  name?: string;
  componentId: NodeId;
  x?: number;
  y?: number;
}

/** Create an instance node */
export function createInstance(options: CreateInstanceOptions): InstanceNodeData {
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

/** Options for creating a boolean operation node */
export interface CreateBooleanOperationOptions {
  id?: NodeId;
  name?: string;
  operation?: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';
}

/** Create a boolean operation node */
export function createBooleanOperation(
  options: CreateBooleanOperationOptions = {}
): BooleanOperationNodeData {
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

/** Options for creating a slice node */
export interface CreateSliceOptions {
  id?: NodeId;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/** Create a slice node */
export function createSlice(options: CreateSliceOptions = {}): SliceNodeData {
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
