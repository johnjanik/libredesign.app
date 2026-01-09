/**
 * Fixture Loader
 *
 * Loads and parses test fixtures for visual regression testing.
 * Fixtures are JSON files that define scene graph nodes for testing.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { NodeId, AutoLayoutMode, AxisAlign, CounterAxisAlign, SizingMode } from '@core/types/common';
import config from '../visual-regression.config';

/**
 * Minimal node representation for test fixtures.
 * Simplified from the full node types for easier fixture authoring.
 */
export interface FixtureNode {
  /** Node ID (auto-generated if not provided) */
  id?: string;
  /** Node type */
  type: 'FRAME' | 'RECTANGLE' | 'ELLIPSE' | 'TEXT' | 'GROUP' | 'IMAGE';
  /** Node name for debugging */
  name?: string;
  /** Position and size */
  x?: number;
  y?: number;
  width: number;
  height: number;
  /** Rotation in degrees */
  rotation?: number;
  /** Visibility */
  visible?: boolean;
  /** Fills (simplified) */
  fills?: FixtureFill[];
  /** Strokes (simplified) */
  strokes?: FixtureStroke[];
  /** Corner radius */
  cornerRadius?: number;
  /** Effects */
  effects?: FixtureEffect[];
  /** Text-specific properties */
  text?: FixtureTextProps;
  /** Auto layout properties (for frames) */
  autoLayout?: FixtureAutoLayout;
  /** Children (for frames and groups) */
  children?: FixtureNode[];
}

export interface FixtureFill {
  type: 'SOLID' | 'LINEAR_GRADIENT' | 'RADIAL_GRADIENT';
  color?: { r: number; g: number; b: number; a?: number };
  opacity?: number;
  /** Gradient stops for gradient fills */
  stops?: Array<{
    position: number;
    color: { r: number; g: number; b: number; a?: number };
  }>;
}

export interface FixtureStroke {
  type: 'SOLID';
  color: { r: number; g: number; b: number; a?: number };
  weight?: number;
  opacity?: number;
}

export interface FixtureEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'BLUR';
  color?: { r: number; g: number; b: number; a?: number };
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  visible?: boolean;
}

export interface FixtureTextProps {
  content: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY';
  verticalAlign?: 'TOP' | 'CENTER' | 'BOTTOM';
  lineHeight?: number;
  letterSpacing?: number;
}

export interface FixtureAutoLayout {
  mode: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  itemSpacing?: number;
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  primaryAxisAlign?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlign?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  primaryAxisSizing?: 'FIXED' | 'AUTO';
  counterAxisSizing?: 'FIXED' | 'AUTO';
  wrap?: boolean;
}

/**
 * Test fixture containing a scene to render
 */
export interface TestFixture {
  /** Fixture name/identifier */
  name: string;
  /** Fixture description */
  description?: string;
  /** Test category for threshold selection */
  category: 'layout' | 'styling' | 'typography' | 'components';
  /** Target platforms to test */
  platforms?: Array<'react' | 'css' | 'swiftui' | 'compose'>;
  /** Canvas dimensions */
  canvas: {
    width: number;
    height: number;
    backgroundColor?: string;
  };
  /** Root node to render */
  root: FixtureNode;
  /** Expected code output (for validation) */
  expectedCode?: {
    react?: string;
    swiftui?: string;
    compose?: string;
  };
}

let nodeIdCounter = 0;

/**
 * Generate a unique node ID for fixtures
 */
function generateNodeId(): NodeId {
  return `fixture-node-${++nodeIdCounter}` as NodeId;
}

/**
 * Load a fixture from file
 */
export function loadFixture(fixturePath: string): TestFixture {
  const fullPath = join(process.cwd(), config.paths.fixtures, fixturePath);

  if (!existsSync(fullPath)) {
    throw new Error(`Fixture not found: ${fullPath}`);
  }

  const content = readFileSync(fullPath, 'utf-8');
  const fixture = JSON.parse(content) as TestFixture;

  // Validate required fields
  if (!fixture.name) {
    throw new Error(`Fixture missing required field 'name': ${fixturePath}`);
  }
  if (!fixture.category) {
    throw new Error(`Fixture missing required field 'category': ${fixturePath}`);
  }
  if (!fixture.canvas) {
    throw new Error(`Fixture missing required field 'canvas': ${fixturePath}`);
  }
  if (!fixture.root) {
    throw new Error(`Fixture missing required field 'root': ${fixturePath}`);
  }

  // Assign IDs to nodes if not present
  assignNodeIds(fixture.root);

  return fixture;
}

/**
 * Recursively assign node IDs to fixture nodes
 */
function assignNodeIds(node: FixtureNode): void {
  if (!node.id) {
    node.id = generateNodeId();
  }
  if (node.children) {
    for (const child of node.children) {
      assignNodeIds(child);
    }
  }
}

/**
 * Convert fixture node to full scene node data
 */
export function fixtureToSceneNode(node: FixtureNode): Record<string, unknown> {
  const baseData = {
    id: node.id || generateNodeId(),
    type: node.type,
    name: node.name || node.type,
    visible: node.visible ?? true,
    locked: false,
    parentId: null,
    childIds: (node.children || []).map(c => c.id || generateNodeId()),
    pluginData: {},
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width,
    height: node.height,
    rotation: node.rotation ?? 0,
    opacity: 1,
    blendMode: 'NORMAL',
    fills: convertFills(node.fills || []),
    strokes: convertStrokes(node.strokes || []),
    strokeWeight: node.strokes?.[0]?.weight ?? 0,
    strokeAlign: 'CENTER',
    strokeCap: 'NONE',
    strokeJoin: 'MITER',
    strokeMiterLimit: 4,
    dashPattern: [],
    dashOffset: 0,
    effects: convertEffects(node.effects || []),
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
    clipsContent: false,
    cornerRadius: node.cornerRadius ?? 0,
  };

  if (node.type === 'FRAME') {
    return {
      ...baseData,
      autoLayout: convertAutoLayout(node.autoLayout),
    };
  }

  if (node.type === 'TEXT' && node.text) {
    return {
      ...baseData,
      characters: node.text.content,
      fontSize: node.text.fontSize ?? 16,
      fontFamily: node.text.fontFamily ?? 'Inter',
      fontWeight: node.text.fontWeight ?? 400,
      textAlign: node.text.textAlign ?? 'LEFT',
      verticalAlign: node.text.verticalAlign ?? 'TOP',
      lineHeight: node.text.lineHeight ?? 1.2,
      letterSpacing: node.text.letterSpacing ?? 0,
    };
  }

  return baseData;
}

function convertFills(fills: FixtureFill[]): unknown[] {
  return fills.map(fill => ({
    type: fill.type,
    visible: true,
    opacity: fill.opacity ?? 1,
    color: fill.color
      ? {
          r: fill.color.r,
          g: fill.color.g,
          b: fill.color.b,
          a: fill.color.a ?? 1,
        }
      : undefined,
    gradientStops: fill.stops?.map(stop => ({
      position: stop.position,
      color: {
        r: stop.color.r,
        g: stop.color.g,
        b: stop.color.b,
        a: stop.color.a ?? 1,
      },
    })),
  }));
}

function convertStrokes(strokes: FixtureStroke[]): unknown[] {
  return strokes.map(stroke => ({
    type: stroke.type,
    visible: true,
    opacity: stroke.opacity ?? 1,
    color: {
      r: stroke.color.r,
      g: stroke.color.g,
      b: stroke.color.b,
      a: stroke.color.a ?? 1,
    },
  }));
}

function convertEffects(effects: FixtureEffect[]): unknown[] {
  return effects.map(effect => ({
    type: effect.type,
    visible: effect.visible ?? true,
    color: effect.color
      ? {
          r: effect.color.r,
          g: effect.color.g,
          b: effect.color.b,
          a: effect.color.a ?? 1,
        }
      : undefined,
    offset: effect.offset ?? { x: 0, y: 0 },
    radius: effect.radius ?? 0,
    spread: effect.spread ?? 0,
  }));
}

function convertAutoLayout(
  layout?: FixtureAutoLayout
): Record<string, unknown> {
  if (!layout) {
    return {
      mode: 'NONE' as AutoLayoutMode,
      itemSpacing: 0,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      primaryAxisAlignItems: 'MIN' as AxisAlign,
      counterAxisAlignItems: 'MIN' as CounterAxisAlign,
      primaryAxisSizingMode: 'FIXED' as SizingMode,
      counterAxisSizingMode: 'FIXED' as SizingMode,
      wrap: false,
    };
  }

  const padding =
    typeof layout.padding === 'number'
      ? {
          top: layout.padding,
          right: layout.padding,
          bottom: layout.padding,
          left: layout.padding,
        }
      : layout.padding ?? {};

  return {
    mode: layout.mode as AutoLayoutMode,
    itemSpacing: layout.itemSpacing ?? 0,
    paddingTop: padding.top ?? 0,
    paddingRight: padding.right ?? 0,
    paddingBottom: padding.bottom ?? 0,
    paddingLeft: padding.left ?? 0,
    primaryAxisAlignItems: (layout.primaryAxisAlign ?? 'MIN') as AxisAlign,
    counterAxisAlignItems: (layout.counterAxisAlign ?? 'MIN') as CounterAxisAlign,
    primaryAxisSizingMode: (layout.primaryAxisSizing ?? 'FIXED') as SizingMode,
    counterAxisSizingMode: (layout.counterAxisSizing ?? 'FIXED') as SizingMode,
    wrap: layout.wrap ?? false,
  };
}

/**
 * Get all fixture files in a category
 */
export function getFixturesInCategory(category: string): string[] {
  const categoryPath = join(process.cwd(), config.paths.fixtures, category);

  if (!existsSync(categoryPath)) {
    return [];
  }

  const { readdirSync } = require('fs');
  return readdirSync(categoryPath)
    .filter((file: string) => file.endsWith('.json'))
    .map((file: string) => `${category}/${file}`);
}

/**
 * Reset node ID counter (for testing)
 */
export function resetNodeIdCounter(): void {
  nodeIdCounter = 0;
}
