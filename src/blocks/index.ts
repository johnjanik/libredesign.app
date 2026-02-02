/**
 * Block System Module
 *
 * CAD-style reusable blocks (symbols) with attributes.
 */

// Types
export type {
  BlockDefinition,
  BlockInstance,
  BlockLibrary,
  BlockCategory,
  BlockUnits,
  BlockAttributeDefinition,
  BlockAttributeValue,
  AttributeType,
  AttributeTextStyle,
  AttributeValidation,
  DynamicParameter,
  ParameterType,
  ParameterConstraints,
  VisibilityState,
  DynamicAction,
  ActionType,
  ActionConfig,
  StretchActionConfig,
  MoveActionConfig,
  ScaleActionConfig,
  RotateActionConfig,
  FlipActionConfig,
  ArrayActionConfig,
  LookupActionConfig,
  LookupTableEntry,
} from '@core/types/block';

// Factory functions
export {
  createBlockDefinition,
  createBlockInstance,
  createAttributeDefinition,
  createDynamicParameter,
  createVisibilityState,
  getAttributeValue,
  getAllAttributeValues,
  validateAttributeValue,
  getVisibleNodesForState,
  getAffectedNodesForParameter,
} from '@core/types/block';

// Block Manager
export {
  BlockManager,
  createBlockManager,
  BLOCK_CATEGORY_INFO,
  getCategoriesByGroup,
  type BlockManagerEvents,
  type BlockSearchOptions,
} from './block-manager';

// Built-in Libraries
export {
  ELECTRICAL_SYMBOLS,
  ELECTRICAL_SYMBOLS_LIBRARY,
  getElectricalSymbolsLibrary,
} from './libraries/electrical-symbols';
