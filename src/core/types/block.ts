/**
 * CAD Block System Types
 *
 * Defines reusable blocks (symbols) for technical drawings.
 * Similar to AutoCAD blocks - contain geometry + attributes.
 *
 * Key concepts:
 * - BlockDefinition: The master symbol definition
 * - BlockInstance: A placed reference to a block
 * - BlockAttribute: Editable text/values on instances
 * - DynamicBlock: Blocks with parametric geometry
 */

import type { NodeId } from './common';
import type { Point } from './geometry';
import type { RGBA } from './color';
import type { SerializedNode } from './page-schema';

// =============================================================================
// Block Definition
// =============================================================================

/**
 * Block definition - the master symbol
 */
export interface BlockDefinition {
  /** Unique block identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Block description */
  readonly description?: string;
  /** Category for organization */
  readonly category: BlockCategory;
  /** Search tags */
  readonly tags: string[];
  /** Block version */
  readonly version: string;
  /** Creation timestamp */
  readonly createdAt: string;
  /** Last modified timestamp */
  readonly updatedAt: string;

  /** Base point (insertion point origin) */
  readonly basePoint: Point;
  /** Geometry nodes that make up the block */
  readonly geometry: SerializedNode[];
  /** Attribute definitions */
  readonly attributes: BlockAttributeDefinition[];
  /** Dynamic parameters (for parametric blocks) */
  readonly parameters?: DynamicParameter[];
  /** Visibility states (for multi-state blocks) */
  readonly visibilityStates?: VisibilityState[];
  /** Actions (for dynamic blocks) */
  readonly actions?: DynamicAction[];

  /** Units used in block definition */
  readonly units: BlockUnits;
  /** Is block annotative (scales with paper) */
  readonly annotative: boolean;
  /** Allow non-uniform scaling */
  readonly allowExplode: boolean;
  /** Thumbnail image (base64) */
  readonly thumbnail?: string;
}

/**
 * Block categories for CAD/technical drawings
 */
export type BlockCategory =
  // Electrical/Electronics
  | 'electrical-passive'      // Resistors, capacitors, inductors
  | 'electrical-active'       // Transistors, ICs, op-amps
  | 'electrical-power'        // Power supplies, ground symbols
  | 'electrical-connectors'   // Plugs, terminals, headers
  | 'electrical-switches'     // Switches, relays
  // Mechanical
  | 'mechanical-fasteners'    // Bolts, screws, nuts
  | 'mechanical-bearings'     // Bearings, bushings
  | 'mechanical-gears'        // Gears, sprockets
  | 'mechanical-symbols'      // Weld symbols, surface finish
  // Architectural
  | 'architectural-doors'     // Doors, windows
  | 'architectural-furniture' // Tables, chairs
  | 'architectural-fixtures'  // Plumbing fixtures, outlets
  | 'architectural-symbols'   // Section marks, north arrows
  // Annotations
  | 'annotation-leaders'      // Leaders, callouts
  | 'annotation-symbols'      // Datum, GD&T symbols
  | 'annotation-notes'        // Note blocks, title blocks
  // General
  | 'general-shapes'          // Common geometric shapes
  | 'general-arrows'          // Arrows, direction indicators
  | 'custom';                 // User-defined

/**
 * Units for block definitions
 */
export type BlockUnits =
  | 'unitless'
  | 'millimeters'
  | 'centimeters'
  | 'meters'
  | 'inches'
  | 'feet'
  | 'pixels'
  | 'points';

// =============================================================================
// Block Attributes
// =============================================================================

/**
 * Attribute definition within a block
 */
export interface BlockAttributeDefinition {
  /** Attribute identifier (tag) */
  readonly tag: string;
  /** Display prompt */
  readonly prompt: string;
  /** Default value */
  readonly defaultValue: string;
  /** Attribute type */
  readonly type: AttributeType;
  /** Position relative to base point */
  readonly position: Point;
  /** Text style properties */
  readonly textStyle: AttributeTextStyle;
  /** Is value required */
  readonly required: boolean;
  /** Is attribute visible */
  readonly visible: boolean;
  /** Is attribute constant (not editable) */
  readonly constant: boolean;
  /** Verification mode */
  readonly verify: boolean;
  /** Preset values for selection */
  readonly presetValues?: string[];
  /** Validation constraints */
  readonly validation?: AttributeValidation;
}

/**
 * Attribute value types
 */
export type AttributeType =
  | 'text'         // Free-form text
  | 'number'       // Numeric value
  | 'date'         // Date value
  | 'enum'         // Selection from list
  | 'multiline'    // Multi-line text
  | 'hyperlink';   // URL/link

/**
 * Text styling for attributes
 */
export interface AttributeTextStyle {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly fontStyle: 'normal' | 'italic';
  readonly color: RGBA;
  readonly alignment: 'left' | 'center' | 'right';
  readonly rotation: number;
}

/**
 * Attribute validation rules
 */
export interface AttributeValidation {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;  // Regex pattern
  readonly min?: number;      // For numbers
  readonly max?: number;      // For numbers
  readonly message?: string;  // Custom error message
}

// =============================================================================
// Block Instance
// =============================================================================

/**
 * Block instance - a placed reference to a block definition
 */
export interface BlockInstance {
  /** Instance node ID */
  readonly id: NodeId;
  /** Reference to block definition */
  readonly blockId: string;
  /** Instance name */
  readonly name: string;
  /** Insertion point */
  readonly position: Point;
  /** Scale factors */
  readonly scale: { x: number; y: number };
  /** Rotation angle in degrees */
  readonly rotation: number;
  /** Attribute values (tag -> value) */
  readonly attributeValues: Record<string, string>;
  /** Current visibility state (for dynamic blocks) */
  readonly visibilityState?: string;
  /** Parameter values (for dynamic blocks) */
  readonly parameterValues?: Record<string, number | string | boolean>;
  /** Is instance exploded (converted to geometry) */
  readonly exploded: boolean;
  /** Layer the instance is on */
  readonly layer: string;
}

/**
 * Attribute value on an instance
 */
export interface BlockAttributeValue {
  /** Attribute tag */
  readonly tag: string;
  /** Current value */
  readonly value: string;
  /** Override text style (if different from definition) */
  readonly styleOverride?: Partial<AttributeTextStyle>;
  /** Override position */
  readonly positionOverride?: Point;
  /** Override visibility */
  readonly visibilityOverride?: boolean;
}

// =============================================================================
// Dynamic Block System
// =============================================================================

/**
 * Dynamic parameter - allows parametric modification of block geometry
 */
export interface DynamicParameter {
  /** Parameter identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Parameter type */
  readonly type: ParameterType;
  /** Default value */
  readonly defaultValue: number | string | boolean;
  /** Position for UI grip (if applicable) */
  readonly gripPosition?: Point;
  /** Constraints */
  readonly constraints?: ParameterConstraints;
}

/**
 * Parameter types for dynamic blocks
 */
export type ParameterType =
  | 'linear'       // Distance parameter
  | 'polar'        // Angle/distance parameter
  | 'rotation'     // Rotation angle
  | 'flip'         // Mirror state (boolean)
  | 'visibility'   // Visibility toggle
  | 'lookup'       // Lookup table value
  | 'base-point';  // Movable base point

/**
 * Constraints on parameter values
 */
export interface ParameterConstraints {
  readonly min?: number;
  readonly max?: number;
  readonly increment?: number;
  readonly values?: (number | string)[];  // Discrete values
}

/**
 * Visibility state - allows different appearances
 */
export interface VisibilityState {
  /** State identifier */
  readonly id: string;
  /** State name */
  readonly name: string;
  /** Node IDs visible in this state */
  readonly visibleNodes: string[];
  /** Is this the default state */
  readonly isDefault?: boolean;
}

/**
 * Dynamic action - geometry modification based on parameters
 */
export interface DynamicAction {
  /** Action identifier */
  readonly id: string;
  /** Action type */
  readonly type: ActionType;
  /** Parameter that triggers this action */
  readonly parameterId: string;
  /** Node IDs affected by this action */
  readonly affectedNodes: string[];
  /** Action-specific configuration */
  readonly config: ActionConfig;
}

/**
 * Types of dynamic actions
 */
export type ActionType =
  | 'stretch'      // Stretch geometry
  | 'move'         // Move geometry
  | 'scale'        // Scale geometry
  | 'rotate'       // Rotate geometry
  | 'flip'         // Mirror geometry
  | 'array'        // Create array of geometry
  | 'lookup';      // Lookup table modification

/**
 * Action configuration (varies by action type)
 */
export type ActionConfig =
  | StretchActionConfig
  | MoveActionConfig
  | ScaleActionConfig
  | RotateActionConfig
  | FlipActionConfig
  | ArrayActionConfig
  | LookupActionConfig;

export interface StretchActionConfig {
  readonly type: 'stretch';
  readonly direction: Point;      // Stretch direction
  readonly stretchPoint: Point;   // Point that stretches
  readonly fixedPoint: Point;     // Point that stays fixed
}

export interface MoveActionConfig {
  readonly type: 'move';
  readonly direction: Point;      // Movement direction
  readonly distance?: number;     // Fixed distance (or use parameter)
}

export interface ScaleActionConfig {
  readonly type: 'scale';
  readonly basePoint: Point;      // Scale origin
  readonly uniform: boolean;      // Uniform or non-uniform
}

export interface RotateActionConfig {
  readonly type: 'rotate';
  readonly center: Point;         // Rotation center
  readonly angleIncrement?: number;  // Snap to angles
}

export interface FlipActionConfig {
  readonly type: 'flip';
  readonly axis: 'x' | 'y';       // Flip axis
  readonly axisPosition: number;  // Position of flip axis
}

export interface ArrayActionConfig {
  readonly type: 'array';
  readonly arrayType: 'linear' | 'polar';
  readonly count: number;
  readonly spacing?: number;      // For linear
  readonly angle?: number;        // For polar
  readonly center?: Point;        // For polar
}

export interface LookupActionConfig {
  readonly type: 'lookup';
  readonly table: LookupTableEntry[];
}

export interface LookupTableEntry {
  readonly inputValue: string | number;
  readonly outputProperties: Record<string, unknown>;
}

// =============================================================================
// Block Library
// =============================================================================

/**
 * Block library - collection of block definitions
 */
export interface BlockLibrary {
  /** Library identifier */
  readonly id: string;
  /** Library name */
  readonly name: string;
  /** Library description */
  readonly description?: string;
  /** Library version */
  readonly version: string;
  /** Block definitions in this library */
  readonly blocks: BlockDefinition[];
  /** Is this a built-in library */
  readonly builtIn: boolean;
  /** Library file path (for external libraries) */
  readonly filePath?: string;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an empty block definition
 */
export function createBlockDefinition(
  name: string,
  category: BlockCategory,
  geometry: SerializedNode[] = []
): BlockDefinition {
  const now = new Date().toISOString();
  const id = `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    name,
    category,
    tags: [],
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
    basePoint: { x: 0, y: 0 },
    geometry,
    attributes: [],
    units: 'pixels',
    annotative: false,
    allowExplode: true,
  };
}

/**
 * Create a block instance
 */
export function createBlockInstance(
  blockId: string,
  position: Point,
  options: {
    name?: string;
    scale?: { x: number; y: number };
    rotation?: number;
    attributeValues?: Record<string, string>;
    layer?: string;
  } = {}
): BlockInstance {
  const id = `inst-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId;

  return {
    id,
    blockId,
    name: options.name ?? 'Block Instance',
    position,
    scale: options.scale ?? { x: 1, y: 1 },
    rotation: options.rotation ?? 0,
    attributeValues: options.attributeValues ?? {},
    exploded: false,
    layer: options.layer ?? 'default',
  };
}

/**
 * Create a block attribute definition
 */
export function createAttributeDefinition(
  tag: string,
  prompt: string,
  options: {
    defaultValue?: string;
    type?: AttributeType;
    position?: Point;
    visible?: boolean;
    constant?: boolean;
    presetValues?: string[];
  } = {}
): BlockAttributeDefinition {
  const attr: BlockAttributeDefinition = {
    tag,
    prompt,
    defaultValue: options.defaultValue ?? '',
    type: options.type ?? 'text',
    position: options.position ?? { x: 0, y: 0 },
    textStyle: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 12,
      fontWeight: 400,
      fontStyle: 'normal',
      color: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
      alignment: 'left',
      rotation: 0,
    },
    required: false,
    visible: options.visible ?? true,
    constant: options.constant ?? false,
    verify: false,
  };

  if (options.presetValues !== undefined) {
    return { ...attr, presetValues: options.presetValues };
  }
  return attr;
}

/**
 * Create a dynamic parameter
 */
export function createDynamicParameter(
  name: string,
  type: ParameterType,
  defaultValue: number | string | boolean,
  constraints?: ParameterConstraints
): DynamicParameter {
  const id = `param-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const param: DynamicParameter = {
    id,
    name,
    type,
    defaultValue,
  };

  if (constraints !== undefined) {
    return { ...param, constraints };
  }
  return param;
}

/**
 * Create a visibility state
 */
export function createVisibilityState(
  name: string,
  visibleNodes: string[],
  isDefault: boolean = false
): VisibilityState {
  const id = `state-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    name,
    visibleNodes,
    isDefault,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get attribute value from instance, falling back to default
 */
export function getAttributeValue(
  instance: BlockInstance,
  definition: BlockDefinition,
  tag: string
): string {
  if (instance.attributeValues[tag] !== undefined) {
    return instance.attributeValues[tag];
  }
  const attrDef = definition.attributes.find(a => a.tag === tag);
  return attrDef?.defaultValue ?? '';
}

/**
 * Get all attribute values for an instance
 */
export function getAllAttributeValues(
  instance: BlockInstance,
  definition: BlockDefinition
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const attr of definition.attributes) {
    values[attr.tag] = getAttributeValue(instance, definition, attr.tag);
  }
  return values;
}

/**
 * Validate attribute value against definition
 */
export function validateAttributeValue(
  value: string,
  definition: BlockAttributeDefinition
): { valid: boolean; message?: string } {
  const { validation, type, required, presetValues } = definition;

  // Check required
  if (required && !value.trim()) {
    return { valid: false, message: `${definition.tag} is required` };
  }

  // Check preset values (enum-like)
  if (presetValues && presetValues.length > 0 && value) {
    if (!presetValues.includes(value)) {
      return { valid: false, message: `Invalid value for ${definition.tag}` };
    }
  }

  // Type-specific validation
  if (type === 'number' && value) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { valid: false, message: `${definition.tag} must be a number` };
    }
    if (validation?.min !== undefined && num < validation.min) {
      return { valid: false, message: `${definition.tag} must be at least ${validation.min}` };
    }
    if (validation?.max !== undefined && num > validation.max) {
      return { valid: false, message: `${definition.tag} must be at most ${validation.max}` };
    }
  }

  // Pattern validation
  if (validation?.pattern && value) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(value)) {
      return { valid: false, message: validation.message ?? `Invalid format for ${definition.tag}` };
    }
  }

  // Length validation
  if (validation?.minLength !== undefined && value.length < validation.minLength) {
    return { valid: false, message: `${definition.tag} must be at least ${validation.minLength} characters` };
  }
  if (validation?.maxLength !== undefined && value.length > validation.maxLength) {
    return { valid: false, message: `${definition.tag} must be at most ${validation.maxLength} characters` };
  }

  return { valid: true };
}

/**
 * Get visible nodes for a given visibility state
 */
export function getVisibleNodesForState(
  definition: BlockDefinition,
  stateName?: string
): Set<string> {
  if (!definition.visibilityStates || definition.visibilityStates.length === 0) {
    // All nodes visible if no states defined
    return new Set(definition.geometry.map(n => n.id));
  }

  const state = stateName
    ? definition.visibilityStates.find(s => s.name === stateName)
    : definition.visibilityStates.find(s => s.isDefault) ?? definition.visibilityStates[0];

  return new Set(state?.visibleNodes ?? []);
}

/**
 * Apply parameter value to get modified geometry
 * Note: Returns node IDs that should be transformed
 */
export function getAffectedNodesForParameter(
  definition: BlockDefinition,
  parameterId: string
): string[] {
  if (!definition.actions) return [];

  return definition.actions
    .filter(action => action.parameterId === parameterId)
    .flatMap(action => action.affectedNodes);
}
