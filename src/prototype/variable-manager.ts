/**
 * Variable Manager
 *
 * Manages prototype variables for interactive prototypes.
 * Variables can be used to create dynamic, stateful interactions.
 */

import { EventEmitter } from '@core/events/event-emitter';

// =============================================================================
// Types
// =============================================================================

/**
 * Variable types supported by the prototype system
 */
export type VariableType = 'boolean' | 'number' | 'string' | 'color';

/**
 * Variable scope - where the variable is accessible
 */
export type VariableScope = 'document' | 'page' | 'component';

/**
 * Variable definition
 */
export interface VariableDefinition {
  /** Unique variable ID */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Variable type */
  readonly type: VariableType;
  /** Default value */
  readonly defaultValue: VariableValue;
  /** Variable scope */
  readonly scope: VariableScope;
  /** Description for documentation */
  readonly description?: string;
  /** Group/category for organization */
  readonly group?: string;
}

/**
 * Variable value union type
 */
export type VariableValue = boolean | number | string;

/**
 * Variable instance (runtime state)
 */
export interface VariableInstance {
  /** Reference to definition ID */
  readonly definitionId: string;
  /** Current value */
  value: VariableValue;
}

/**
 * Variable manager events
 */
export type VariableManagerEvents = {
  'variable:defined': { variable: VariableDefinition };
  'variable:updated': { variable: VariableDefinition };
  'variable:removed': { id: string };
  'value:changed': { id: string; oldValue: VariableValue; newValue: VariableValue };
  'variables:cleared': undefined;
  [key: string]: unknown;
};

/**
 * Comparison operators for conditions
 */
export type ComparisonOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty';

/**
 * Condition for conditional actions
 */
export interface Condition {
  /** Variable to check */
  readonly variableId: string;
  /** Comparison operator */
  readonly operator: ComparisonOperator;
  /** Value to compare against (not needed for is_empty/is_not_empty) */
  readonly value?: VariableValue;
}

/**
 * Condition group with AND/OR logic
 */
export interface ConditionGroup {
  /** Logic operator between conditions */
  readonly logic: 'AND' | 'OR';
  /** Conditions in this group */
  readonly conditions: Condition[];
}

// =============================================================================
// Variable Manager
// =============================================================================

/**
 * Manages prototype variables
 */
export class VariableManager extends EventEmitter<VariableManagerEvents> {
  /** Variable definitions indexed by ID */
  private definitions = new Map<string, VariableDefinition>();

  /** Current variable values (runtime state) */
  private values = new Map<string, VariableValue>();

  /** Variables indexed by group */
  private byGroup = new Map<string, Set<string>>();

  constructor() {
    super();
  }

  // ===========================================================================
  // Definition CRUD
  // ===========================================================================

  /**
   * Define a new variable
   */
  defineVariable(definition: VariableDefinition): void {
    this.definitions.set(definition.id, definition);
    this.indexVariable(definition);

    // Initialize with default value if not set
    if (!this.values.has(definition.id)) {
      this.values.set(definition.id, definition.defaultValue);
    }

    this.emit('variable:defined', { variable: definition });
  }

  /**
   * Update a variable definition
   */
  updateDefinition(id: string, updates: Partial<Omit<VariableDefinition, 'id'>>): void {
    const existing = this.definitions.get(id);
    if (!existing) return;

    // Remove old index
    this.unindexVariable(existing);

    const updated: VariableDefinition = {
      ...existing,
      ...updates,
    };

    this.definitions.set(id, updated);
    this.indexVariable(updated);

    this.emit('variable:updated', { variable: updated });
  }

  /**
   * Remove a variable definition
   */
  removeVariable(id: string): void {
    const definition = this.definitions.get(id);
    if (!definition) return;

    this.unindexVariable(definition);
    this.definitions.delete(id);
    this.values.delete(id);

    this.emit('variable:removed', { id });
  }

  /**
   * Get a variable definition
   */
  getDefinition(id: string): VariableDefinition | undefined {
    return this.definitions.get(id);
  }

  /**
   * Get all variable definitions
   */
  getAllDefinitions(): VariableDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Get variables by group
   */
  getByGroup(group: string): VariableDefinition[] {
    const ids = this.byGroup.get(group);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.definitions.get(id))
      .filter((d): d is VariableDefinition => d !== undefined);
  }

  /**
   * Get all groups
   */
  getGroups(): string[] {
    return Array.from(this.byGroup.keys());
  }

  // ===========================================================================
  // Value Operations
  // ===========================================================================

  /**
   * Get a variable's current value
   */
  getValue(id: string): VariableValue | undefined {
    return this.values.get(id);
  }

  /**
   * Set a variable's value
   */
  setValue(id: string, value: VariableValue): void {
    const definition = this.definitions.get(id);
    if (!definition) return;

    // Type coercion based on definition type
    const coercedValue = this.coerceValue(value, definition.type);
    const oldValue = this.values.get(id);

    if (oldValue !== coercedValue) {
      this.values.set(id, coercedValue);
      this.emit('value:changed', {
        id,
        oldValue: oldValue ?? definition.defaultValue,
        newValue: coercedValue,
      });
    }
  }

  /**
   * Reset a variable to its default value
   */
  resetToDefault(id: string): void {
    const definition = this.definitions.get(id);
    if (!definition) return;

    this.setValue(id, definition.defaultValue);
  }

  /**
   * Reset all variables to defaults
   */
  resetAllToDefaults(): void {
    for (const definition of this.definitions.values()) {
      this.values.set(definition.id, definition.defaultValue);
    }
  }

  /**
   * Toggle a boolean variable
   */
  toggleBoolean(id: string): void {
    const definition = this.definitions.get(id);
    if (!definition || definition.type !== 'boolean') return;

    const current = this.values.get(id) as boolean;
    this.setValue(id, !current);
  }

  /**
   * Increment a number variable
   */
  incrementNumber(id: string, amount: number = 1): void {
    const definition = this.definitions.get(id);
    if (!definition || definition.type !== 'number') return;

    const current = (this.values.get(id) as number) ?? 0;
    this.setValue(id, current + amount);
  }

  /**
   * Decrement a number variable
   */
  decrementNumber(id: string, amount: number = 1): void {
    this.incrementNumber(id, -amount);
  }

  // ===========================================================================
  // Conditions
  // ===========================================================================

  /**
   * Evaluate a single condition
   */
  evaluateCondition(condition: Condition): boolean {
    const value = this.values.get(condition.variableId);
    const definition = this.definitions.get(condition.variableId);

    if (value === undefined || !definition) return false;

    const compareValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return value === compareValue;

      case 'not_equals':
        return value !== compareValue;

      case 'greater_than':
        return typeof value === 'number' && typeof compareValue === 'number'
          ? value > compareValue
          : false;

      case 'less_than':
        return typeof value === 'number' && typeof compareValue === 'number'
          ? value < compareValue
          : false;

      case 'greater_or_equal':
        return typeof value === 'number' && typeof compareValue === 'number'
          ? value >= compareValue
          : false;

      case 'less_or_equal':
        return typeof value === 'number' && typeof compareValue === 'number'
          ? value <= compareValue
          : false;

      case 'contains':
        return typeof value === 'string' && typeof compareValue === 'string'
          ? value.includes(compareValue)
          : false;

      case 'not_contains':
        return typeof value === 'string' && typeof compareValue === 'string'
          ? !value.includes(compareValue)
          : false;

      case 'starts_with':
        return typeof value === 'string' && typeof compareValue === 'string'
          ? value.startsWith(compareValue)
          : false;

      case 'ends_with':
        return typeof value === 'string' && typeof compareValue === 'string'
          ? value.endsWith(compareValue)
          : false;

      case 'is_empty':
        return value === '' || value === 0 || value === false;

      case 'is_not_empty':
        return value !== '' && value !== 0 && value !== false;

      default:
        return false;
    }
  }

  /**
   * Evaluate a condition group (multiple conditions with AND/OR)
   */
  evaluateConditionGroup(group: ConditionGroup): boolean {
    if (group.conditions.length === 0) return true;

    if (group.logic === 'AND') {
      return group.conditions.every(c => this.evaluateCondition(c));
    } else {
      return group.conditions.some(c => this.evaluateCondition(c));
    }
  }

  // ===========================================================================
  // Serialization
  // ===========================================================================

  /**
   * Export variable definitions for persistence
   */
  exportDefinitions(): VariableDefinition[] {
    return this.getAllDefinitions();
  }

  /**
   * Export current values for persistence
   */
  exportValues(): Record<string, VariableValue> {
    const result: Record<string, VariableValue> = {};
    for (const [id, value] of this.values) {
      result[id] = value;
    }
    return result;
  }

  /**
   * Load variable definitions
   */
  loadDefinitions(definitions: VariableDefinition[]): void {
    this.clear();
    for (const definition of definitions) {
      this.definitions.set(definition.id, definition);
      this.indexVariable(definition);
      this.values.set(definition.id, definition.defaultValue);
    }
  }

  /**
   * Load variable values (runtime state)
   */
  loadValues(values: Record<string, VariableValue>): void {
    for (const [id, value] of Object.entries(values)) {
      if (this.definitions.has(id)) {
        this.values.set(id, value);
      }
    }
  }

  /**
   * Clear all variables
   */
  clear(): void {
    this.definitions.clear();
    this.values.clear();
    this.byGroup.clear();
    this.emit('variables:cleared');
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private indexVariable(definition: VariableDefinition): void {
    const group = definition.group ?? 'Ungrouped';
    if (!this.byGroup.has(group)) {
      this.byGroup.set(group, new Set());
    }
    this.byGroup.get(group)!.add(definition.id);
  }

  private unindexVariable(definition: VariableDefinition): void {
    const group = definition.group ?? 'Ungrouped';
    this.byGroup.get(group)?.delete(definition.id);
  }

  private coerceValue(value: VariableValue, type: VariableType): VariableValue {
    switch (type) {
      case 'boolean':
        return Boolean(value);
      case 'number':
        return typeof value === 'number' ? value : Number(value) || 0;
      case 'string':
      case 'color':
        return String(value);
      default:
        return value;
    }
  }

  // ===========================================================================
  // Factory Helpers
  // ===========================================================================

  /**
   * Create a boolean variable definition
   */
  static createBoolean(
    name: string,
    defaultValue: boolean = false,
    options: { group?: string; description?: string } = {}
  ): VariableDefinition {
    return {
      id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      type: 'boolean',
      defaultValue,
      scope: 'document',
      ...options,
    };
  }

  /**
   * Create a number variable definition
   */
  static createNumber(
    name: string,
    defaultValue: number = 0,
    options: { group?: string; description?: string } = {}
  ): VariableDefinition {
    return {
      id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      type: 'number',
      defaultValue,
      scope: 'document',
      ...options,
    };
  }

  /**
   * Create a string variable definition
   */
  static createString(
    name: string,
    defaultValue: string = '',
    options: { group?: string; description?: string } = {}
  ): VariableDefinition {
    return {
      id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      type: 'string',
      defaultValue,
      scope: 'document',
      ...options,
    };
  }

  /**
   * Create a color variable definition
   */
  static createColor(
    name: string,
    defaultValue: string = '#000000',
    options: { group?: string; description?: string } = {}
  ): VariableDefinition {
    return {
      id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      type: 'color',
      defaultValue,
      scope: 'document',
      ...options,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a variable manager
 */
export function createVariableManager(): VariableManager {
  return new VariableManager();
}

/**
 * Get operators valid for a variable type
 */
export function getOperatorsForType(type: VariableType): ComparisonOperator[] {
  switch (type) {
    case 'boolean':
      return ['equals', 'not_equals'];
    case 'number':
      return [
        'equals',
        'not_equals',
        'greater_than',
        'less_than',
        'greater_or_equal',
        'less_or_equal',
      ];
    case 'string':
    case 'color':
      return [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'starts_with',
        'ends_with',
        'is_empty',
        'is_not_empty',
      ];
    default:
      return ['equals', 'not_equals'];
  }
}

/**
 * Get display name for an operator
 */
export function getOperatorDisplayName(operator: ComparisonOperator): string {
  const names: Record<ComparisonOperator, string> = {
    equals: 'Equals',
    not_equals: 'Not equals',
    greater_than: 'Greater than',
    less_than: 'Less than',
    greater_or_equal: 'Greater or equal',
    less_or_equal: 'Less or equal',
    contains: 'Contains',
    not_contains: 'Does not contain',
    starts_with: 'Starts with',
    ends_with: 'Ends with',
    is_empty: 'Is empty',
    is_not_empty: 'Is not empty',
  };
  return names[operator] ?? operator;
}
