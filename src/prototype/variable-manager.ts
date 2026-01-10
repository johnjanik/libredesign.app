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
 * Variable kind - regular state or computed/derived
 */
export type VariableKind = 'state' | 'computed';

/**
 * Number constraints for numeric variables
 */
export interface NumberConstraints {
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
}

/**
 * String constraints for string variables
 */
export interface StringConstraints {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: string[]; // Enum-like options
}

/**
 * Computed variable expression
 */
export interface ComputedExpression {
  /** Variable IDs this computed value depends on */
  dependencies: string[];
  /** Expression string (e.g., "price * quantity") */
  expression: string;
  /** Pre-parsed AST for evaluation (internal) */
  parsedExpression?: unknown;
}

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
  /** Variable kind - state or computed */
  readonly kind: VariableKind;
  /** Description for documentation */
  readonly description?: string;
  /** Group/category for organization */
  readonly group?: string;
  /** Component ID if scope is 'component' */
  readonly componentId?: string;
  /** Number constraints for numeric variables */
  readonly numberConstraints?: NumberConstraints;
  /** String constraints for string variables */
  readonly stringConstraints?: StringConstraints;
  /** Computed expression (for kind='computed') */
  readonly computedExpression?: ComputedExpression;
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
 * Component instance key for scoped variables
 */
export type ComponentInstanceKey = string; // `${componentId}:${instanceId}`

/**
 * Manages prototype variables
 */
export class VariableManager extends EventEmitter<VariableManagerEvents> {
  /** Variable definitions indexed by ID */
  private definitions = new Map<string, VariableDefinition>();

  /** Current variable values (runtime state) - document/page scope */
  private values = new Map<string, VariableValue>();

  /** Component-scoped variable instances: Map<instanceKey, Map<variableId, value>> */
  private componentInstances = new Map<ComponentInstanceKey, Map<string, VariableValue>>();

  /** Variables indexed by group */
  private byGroup = new Map<string, Set<string>>();

  /** Variables indexed by component ID */
  private byComponent = new Map<string, Set<string>>();

  /** Computed variable dependency graph */
  private dependencyGraph = new Map<string, Set<string>>();

  constructor() {
    super();
  }

  // ===========================================================================
  // Component Instance Management
  // ===========================================================================

  /**
   * Create a new component instance with its own variable state
   */
  createComponentInstance(componentId: string, instanceId: string): ComponentInstanceKey {
    const key: ComponentInstanceKey = `${componentId}:${instanceId}`;

    // Get all variables scoped to this component
    const componentVars = this.byComponent.get(componentId);
    if (componentVars) {
      const instanceValues = new Map<string, VariableValue>();
      for (const varId of componentVars) {
        const def = this.definitions.get(varId);
        if (def) {
          instanceValues.set(varId, def.defaultValue);
        }
      }
      this.componentInstances.set(key, instanceValues);
    }

    return key;
  }

  /**
   * Remove a component instance
   */
  removeComponentInstance(instanceKey: ComponentInstanceKey): void {
    this.componentInstances.delete(instanceKey);
  }

  /**
   * Get all instances for a component
   */
  getComponentInstances(componentId: string): ComponentInstanceKey[] {
    const instances: ComponentInstanceKey[] = [];
    for (const key of this.componentInstances.keys()) {
      if (key.startsWith(`${componentId}:`)) {
        instances.push(key);
      }
    }
    return instances;
  }

  /**
   * Get a component-scoped variable's value for a specific instance
   */
  getComponentValue(instanceKey: ComponentInstanceKey, variableId: string): VariableValue | undefined {
    return this.componentInstances.get(instanceKey)?.get(variableId);
  }

  /**
   * Set a component-scoped variable's value for a specific instance
   */
  setComponentValue(instanceKey: ComponentInstanceKey, variableId: string, value: VariableValue): void {
    const instanceValues = this.componentInstances.get(instanceKey);
    if (!instanceValues) return;

    const definition = this.definitions.get(variableId);
    if (!definition || definition.scope !== 'component') return;

    const coercedValue = this.coerceValue(value, definition.type);
    const constrainedValue = this.applyConstraints(coercedValue, definition);
    const oldValue = instanceValues.get(variableId);

    if (oldValue !== constrainedValue) {
      instanceValues.set(variableId, constrainedValue);
      this.emit('value:changed', {
        id: variableId,
        oldValue: oldValue ?? definition.defaultValue,
        newValue: constrainedValue,
      });

      // Recompute dependent computed variables for this instance
      this.recomputeDependentsForInstance(instanceKey, variableId);
    }
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

    // Don't allow setting computed variables directly
    if (definition.kind === 'computed') return;

    // Type coercion based on definition type
    const coercedValue = this.coerceValue(value, definition.type);
    const constrainedValue = this.applyConstraints(coercedValue, definition);
    const oldValue = this.values.get(id);

    if (oldValue !== constrainedValue) {
      this.values.set(id, constrainedValue);
      this.emit('value:changed', {
        id,
        oldValue: oldValue ?? definition.defaultValue,
        newValue: constrainedValue,
      });

      // Recompute any dependent computed variables
      this.recomputeDependents(id);
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
    this.byComponent.clear();
    this.componentInstances.clear();
    this.dependencyGraph.clear();
    this.emit('variables:cleared');
  }

  // ===========================================================================
  // Component Queries
  // ===========================================================================

  /**
   * Get variables scoped to a specific component
   */
  getByComponent(componentId: string): VariableDefinition[] {
    const ids = this.byComponent.get(componentId);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.definitions.get(id))
      .filter((d): d is VariableDefinition => d !== undefined);
  }

  /**
   * Get all computed variables
   */
  getComputedVariables(): VariableDefinition[] {
    return Array.from(this.definitions.values())
      .filter(d => d.kind === 'computed');
  }

  /**
   * Get all state variables (non-computed)
   */
  getStateVariables(): VariableDefinition[] {
    return Array.from(this.definitions.values())
      .filter(d => d.kind === 'state');
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private indexVariable(definition: VariableDefinition): void {
    // Index by group
    const group = definition.group ?? 'Ungrouped';
    if (!this.byGroup.has(group)) {
      this.byGroup.set(group, new Set());
    }
    this.byGroup.get(group)!.add(definition.id);

    // Index by component if component-scoped
    if (definition.scope === 'component' && definition.componentId) {
      if (!this.byComponent.has(definition.componentId)) {
        this.byComponent.set(definition.componentId, new Set());
      }
      this.byComponent.get(definition.componentId)!.add(definition.id);
    }

    // Build dependency graph for computed variables
    if (definition.kind === 'computed' && definition.computedExpression) {
      for (const depId of definition.computedExpression.dependencies) {
        if (!this.dependencyGraph.has(depId)) {
          this.dependencyGraph.set(depId, new Set());
        }
        this.dependencyGraph.get(depId)!.add(definition.id);
      }
    }
  }

  private unindexVariable(definition: VariableDefinition): void {
    // Remove from group index
    const group = definition.group ?? 'Ungrouped';
    this.byGroup.get(group)?.delete(definition.id);

    // Remove from component index
    if (definition.scope === 'component' && definition.componentId) {
      this.byComponent.get(definition.componentId)?.delete(definition.id);
    }

    // Remove from dependency graph
    if (definition.kind === 'computed' && definition.computedExpression) {
      for (const depId of definition.computedExpression.dependencies) {
        this.dependencyGraph.get(depId)?.delete(definition.id);
      }
    }
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

  /**
   * Apply constraints to a value
   */
  private applyConstraints(value: VariableValue, definition: VariableDefinition): VariableValue {
    if (definition.type === 'number' && typeof value === 'number') {
      const constraints = definition.numberConstraints;
      if (constraints) {
        let result = value;
        if (constraints.min !== undefined && result < constraints.min) {
          result = constraints.min;
        }
        if (constraints.max !== undefined && result > constraints.max) {
          result = constraints.max;
        }
        if (constraints.step !== undefined && constraints.step > 0) {
          const min = constraints.min ?? 0;
          result = Math.round((result - min) / constraints.step) * constraints.step + min;
        }
        if (constraints.precision !== undefined) {
          result = Number(result.toFixed(constraints.precision));
        }
        return result;
      }
    }

    if (definition.type === 'string' && typeof value === 'string') {
      const constraints = definition.stringConstraints;
      if (constraints) {
        let result = value;
        if (constraints.maxLength !== undefined && result.length > constraints.maxLength) {
          result = result.slice(0, constraints.maxLength);
        }
        if (constraints.options && constraints.options.length > 0) {
          // If options are specified, value must be one of them
          if (!constraints.options.includes(result)) {
            result = constraints.options[0]!;
          }
        }
        return result;
      }
    }

    return value;
  }

  /**
   * Recompute all variables that depend on the changed variable
   */
  private recomputeDependents(changedId: string): void {
    const dependents = this.dependencyGraph.get(changedId);
    if (!dependents) return;

    for (const depId of dependents) {
      this.computeValue(depId);
    }
  }

  /**
   * Recompute dependents for a specific component instance
   */
  private recomputeDependentsForInstance(instanceKey: ComponentInstanceKey, changedId: string): void {
    const dependents = this.dependencyGraph.get(changedId);
    if (!dependents) return;

    for (const depId of dependents) {
      const definition = this.definitions.get(depId);
      if (definition?.scope === 'component') {
        this.computeValueForInstance(instanceKey, depId);
      }
    }
  }

  /**
   * Compute the value of a computed variable (document/page scope)
   */
  private computeValue(variableId: string): void {
    const definition = this.definitions.get(variableId);
    if (!definition || definition.kind !== 'computed' || !definition.computedExpression) {
      return;
    }

    const result = this.evaluateExpression(definition.computedExpression.expression);
    if (result !== undefined) {
      const coerced = this.coerceValue(result, definition.type);
      const oldValue = this.values.get(variableId);
      if (oldValue !== coerced) {
        this.values.set(variableId, coerced);
        this.emit('value:changed', {
          id: variableId,
          oldValue: oldValue ?? definition.defaultValue,
          newValue: coerced,
        });
        // Cascade to dependents
        this.recomputeDependents(variableId);
      }
    }
  }

  /**
   * Compute value for a component instance
   */
  private computeValueForInstance(instanceKey: ComponentInstanceKey, variableId: string): void {
    const definition = this.definitions.get(variableId);
    if (!definition || definition.kind !== 'computed' || !definition.computedExpression) {
      return;
    }

    const instanceValues = this.componentInstances.get(instanceKey);
    if (!instanceValues) return;

    const result = this.evaluateExpressionForInstance(
      definition.computedExpression.expression,
      instanceKey
    );
    if (result !== undefined) {
      const coerced = this.coerceValue(result, definition.type);
      const oldValue = instanceValues.get(variableId);
      if (oldValue !== coerced) {
        instanceValues.set(variableId, coerced);
        this.emit('value:changed', {
          id: variableId,
          oldValue: oldValue ?? definition.defaultValue,
          newValue: coerced,
        });
        this.recomputeDependentsForInstance(instanceKey, variableId);
      }
    }
  }

  /**
   * Evaluate a computed expression (simple expression evaluator)
   */
  private evaluateExpression(expression: string): VariableValue | undefined {
    try {
      // Build a context with all variable values
      const context: Record<string, VariableValue> = {};
      for (const [id, def] of this.definitions) {
        const value = this.values.get(id) ?? def.defaultValue;
        // Use variable name as key for expression evaluation
        context[def.name] = value;
        // Also use id for direct reference
        context[id] = value;
      }

      // Simple safe expression evaluation
      return this.safeEval(expression, context);
    } catch {
      return undefined;
    }
  }

  /**
   * Evaluate expression for a component instance
   */
  private evaluateExpressionForInstance(
    expression: string,
    instanceKey: ComponentInstanceKey
  ): VariableValue | undefined {
    try {
      const instanceValues = this.componentInstances.get(instanceKey);
      const context: Record<string, VariableValue> = {};

      // First add document/page scoped variables
      for (const [id, def] of this.definitions) {
        if (def.scope !== 'component') {
          const value = this.values.get(id) ?? def.defaultValue;
          context[def.name] = value;
          context[id] = value;
        }
      }

      // Then add component-scoped variables (from this instance)
      if (instanceValues) {
        for (const [id, value] of instanceValues) {
          const def = this.definitions.get(id);
          if (def) {
            context[def.name] = value;
            context[id] = value;
          }
        }
      }

      return this.safeEval(expression, context);
    } catch {
      return undefined;
    }
  }

  /**
   * Safe expression evaluator (handles basic arithmetic and comparisons)
   */
  private safeEval(expression: string, context: Record<string, VariableValue>): VariableValue {
    // Replace variable references with their values
    let expr = expression;
    for (const [name, value] of Object.entries(context)) {
      const regex = new RegExp(`\\b${name}\\b`, 'g');
      if (typeof value === 'string') {
        expr = expr.replace(regex, JSON.stringify(value));
      } else {
        expr = expr.replace(regex, String(value));
      }
    }

    // Only allow safe operations: +, -, *, /, %, <, >, <=, >=, ==, !=, &&, ||, !, ?, :, (, ), numbers, strings, booleans
    const safePattern = /^[\d\s+\-*/%<>=!&|?:().,"'true false]+$/;
    if (!safePattern.test(expr)) {
      throw new Error('Unsafe expression');
    }

    // Use Function constructor for evaluation (safer than eval)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(`return (${expr})`);
    return fn() as VariableValue;
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
    options: {
      group?: string;
      description?: string;
      scope?: VariableScope;
      componentId?: string;
    } = {}
  ): VariableDefinition {
    let def: VariableDefinition = {
      id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      type: 'boolean',
      kind: 'state',
      defaultValue,
      scope: options.scope ?? 'document',
    };
    if (options.componentId) def = { ...def, componentId: options.componentId };
    if (options.group) def = { ...def, group: options.group };
    if (options.description) def = { ...def, description: options.description };
    return def;
  }

  /**
   * Create a number variable definition
   */
  static createNumber(
    name: string,
    defaultValue: number = 0,
    options: {
      group?: string;
      description?: string;
      scope?: VariableScope;
      componentId?: string;
      constraints?: NumberConstraints;
    } = {}
  ): VariableDefinition {
    let def: VariableDefinition = {
      id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      type: 'number',
      kind: 'state',
      defaultValue,
      scope: options.scope ?? 'document',
    };
    if (options.componentId) def = { ...def, componentId: options.componentId };
    if (options.group) def = { ...def, group: options.group };
    if (options.description) def = { ...def, description: options.description };
    if (options.constraints) def = { ...def, numberConstraints: options.constraints };
    return def;
  }

  /**
   * Create a string variable definition
   */
  static createString(
    name: string,
    defaultValue: string = '',
    options: {
      group?: string;
      description?: string;
      scope?: VariableScope;
      componentId?: string;
      constraints?: StringConstraints;
    } = {}
  ): VariableDefinition {
    let def: VariableDefinition = {
      id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      type: 'string',
      kind: 'state',
      defaultValue,
      scope: options.scope ?? 'document',
    };
    if (options.componentId) def = { ...def, componentId: options.componentId };
    if (options.group) def = { ...def, group: options.group };
    if (options.description) def = { ...def, description: options.description };
    if (options.constraints) def = { ...def, stringConstraints: options.constraints };
    return def;
  }

  /**
   * Create a color variable definition
   */
  static createColor(
    name: string,
    defaultValue: string = '#000000',
    options: {
      group?: string;
      description?: string;
      scope?: VariableScope;
      componentId?: string;
    } = {}
  ): VariableDefinition {
    let def: VariableDefinition = {
      id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      type: 'color',
      kind: 'state',
      defaultValue,
      scope: options.scope ?? 'document',
    };
    if (options.componentId) def = { ...def, componentId: options.componentId };
    if (options.group) def = { ...def, group: options.group };
    if (options.description) def = { ...def, description: options.description };
    return def;
  }

  /**
   * Create a computed variable definition
   */
  static createComputed(
    name: string,
    type: VariableType,
    expression: string,
    dependencies: string[],
    options: {
      group?: string;
      description?: string;
      scope?: VariableScope;
      componentId?: string;
    } = {}
  ): VariableDefinition {
    // Compute default value based on type
    let defaultValue: VariableValue;
    switch (type) {
      case 'boolean':
        defaultValue = false;
        break;
      case 'number':
        defaultValue = 0;
        break;
      case 'string':
      case 'color':
        defaultValue = '';
        break;
    }

    let def: VariableDefinition = {
      id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      type,
      kind: 'computed',
      defaultValue,
      scope: options.scope ?? 'document',
      computedExpression: {
        expression,
        dependencies,
      },
    };
    if (options.componentId) def = { ...def, componentId: options.componentId };
    if (options.group) def = { ...def, group: options.group };
    if (options.description) def = { ...def, description: options.description };
    return def;
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
