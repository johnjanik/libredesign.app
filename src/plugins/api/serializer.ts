/**
 * Serializer
 *
 * Safe serialization for IPC between host and plugin sandbox.
 * Enforces depth limits, size limits, and strips non-serializable values.
 */

import type {
  SerializableValue,
  SerializationLimits,
  SerializationResult,
  DeserializationResult,
} from '../types/serialization';
import { DEFAULT_SERIALIZATION_LIMITS, isPlainObject } from '../types/serialization';

/**
 * Serialization context for tracking limits
 */
interface SerializationContext {
  readonly limits: SerializationLimits;
  currentDepth: number;
  totalSize: number;
  visitedObjects: WeakSet<object>;
}

/**
 * Serialize a value for IPC transmission
 */
export function serialize(
  value: unknown,
  limits: SerializationLimits = DEFAULT_SERIALIZATION_LIMITS
): SerializationResult {
  const context: SerializationContext = {
    limits,
    currentDepth: 0,
    totalSize: 0,
    visitedObjects: new WeakSet(),
  };

  try {
    const result = serializeValue(value, context);
    return {
      success: true,
      data: result,
      size: context.totalSize,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Serialize a single value
 */
function serializeValue(value: unknown, context: SerializationContext): SerializableValue {
  // Check depth limit
  if (context.currentDepth > context.limits.maxDepth) {
    throw new Error(`Maximum depth ${context.limits.maxDepth} exceeded`);
  }

  // Handle primitives
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return null; // Convert undefined to null
  }

  if (typeof value === 'boolean') {
    context.totalSize += 4; // Approximate
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null; // Convert NaN, Infinity to null
    }
    context.totalSize += 8;
    return value;
  }

  if (typeof value === 'string') {
    if (value.length > context.limits.maxStringLength) {
      throw new Error(`String length ${value.length} exceeds limit ${context.limits.maxStringLength}`);
    }
    context.totalSize += value.length * 2; // UTF-16
    checkSizeLimit(context);
    return value;
  }

  // Handle special objects
  if (value instanceof Date) {
    const iso = value.toISOString();
    context.totalSize += iso.length * 2;
    return iso;
  }

  if (value instanceof RegExp) {
    const str = value.toString();
    context.totalSize += str.length * 2;
    return str;
  }

  // Skip functions and symbols
  if (typeof value === 'function' || typeof value === 'symbol') {
    return null;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length > context.limits.maxArrayLength) {
      throw new Error(`Array length ${value.length} exceeds limit ${context.limits.maxArrayLength}`);
    }

    // Check for circular reference
    if (context.visitedObjects.has(value)) {
      throw new Error('Circular reference detected');
    }
    context.visitedObjects.add(value);

    context.currentDepth++;
    const result = value.map((item) => serializeValue(item, context));
    context.currentDepth--;

    return result;
  }

  // Handle plain objects
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length > context.limits.maxObjectKeys) {
      throw new Error(`Object key count ${keys.length} exceeds limit ${context.limits.maxObjectKeys}`);
    }

    // Check for circular reference
    if (context.visitedObjects.has(value)) {
      throw new Error('Circular reference detected');
    }
    context.visitedObjects.add(value);

    context.currentDepth++;
    const result: Record<string, SerializableValue> = {};
    for (const key of keys) {
      const serialized = serializeValue(value[key], context);
      if (serialized !== null || value[key] === null) {
        result[key] = serialized;
        context.totalSize += key.length * 2;
      }
    }
    context.currentDepth--;

    return result;
  }

  // Handle typed arrays
  if (ArrayBuffer.isView(value)) {
    const arr = Array.from(value as unknown as ArrayLike<number>);
    if (arr.length > context.limits.maxArrayLength) {
      throw new Error(`TypedArray length ${arr.length} exceeds limit ${context.limits.maxArrayLength}`);
    }
    context.totalSize += arr.length * 8;
    checkSizeLimit(context);
    return arr;
  }

  // Handle ArrayBuffer
  if (value instanceof ArrayBuffer) {
    const arr = Array.from(new Uint8Array(value));
    if (arr.length > context.limits.maxArrayLength) {
      throw new Error(`ArrayBuffer length ${arr.length} exceeds limit ${context.limits.maxArrayLength}`);
    }
    context.totalSize += arr.length;
    checkSizeLimit(context);
    return arr;
  }

  // Handle Map
  if (value instanceof Map) {
    const obj: Record<string, SerializableValue> = {};
    let count = 0;
    for (const [k, v] of value) {
      if (typeof k === 'string') {
        if (++count > context.limits.maxObjectKeys) {
          throw new Error(`Map size exceeds limit ${context.limits.maxObjectKeys}`);
        }
        context.currentDepth++;
        obj[k] = serializeValue(v, context);
        context.currentDepth--;
      }
    }
    return obj;
  }

  // Handle Set
  if (value instanceof Set) {
    const arr: SerializableValue[] = [];
    for (const item of value) {
      if (arr.length >= context.limits.maxArrayLength) {
        throw new Error(`Set size exceeds limit ${context.limits.maxArrayLength}`);
      }
      context.currentDepth++;
      arr.push(serializeValue(item, context));
      context.currentDepth--;
    }
    return arr;
  }

  // Unknown object type - try to serialize as plain object
  try {
    const obj: Record<string, SerializableValue> = {};
    const keys = Object.keys(value as object);

    if (keys.length > context.limits.maxObjectKeys) {
      throw new Error(`Object key count ${keys.length} exceeds limit ${context.limits.maxObjectKeys}`);
    }

    context.currentDepth++;
    for (const key of keys) {
      const val = (value as Record<string, unknown>)[key];
      if (typeof val !== 'function') {
        obj[key] = serializeValue(val, context);
      }
    }
    context.currentDepth--;

    return obj;
  } catch {
    return null;
  }
}

/**
 * Check if total size limit is exceeded
 */
function checkSizeLimit(context: SerializationContext): void {
  if (context.totalSize > context.limits.maxTotalSize) {
    throw new Error(`Total size ${context.totalSize} exceeds limit ${context.limits.maxTotalSize}`);
  }
}

/**
 * Deserialize a value from IPC transmission
 */
export function deserialize<T>(
  data: SerializableValue
): DeserializationResult<T> {
  try {
    // SerializableValue is already a valid JS value
    // Just do basic type checking
    return {
      success: true,
      value: data as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Clone a value through serialization (deep clone with sanitization)
 */
export function cloneDeep<T>(value: T): T {
  const result = serialize(value);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data as T;
}

/**
 * Check if a value is safely serializable
 */
export function isSerializable(
  value: unknown,
  limits: SerializationLimits = DEFAULT_SERIALIZATION_LIMITS
): boolean {
  const result = serialize(value, limits);
  return result.success;
}

/**
 * Get estimated serialized size in bytes
 */
export function estimateSize(value: unknown): number {
  const result = serialize(value);
  return result.size ?? 0;
}

/**
 * Sanitize a value by removing non-serializable parts
 */
export function sanitize(value: unknown): SerializableValue {
  const result = serialize(value, {
    ...DEFAULT_SERIALIZATION_LIMITS,
    // Use larger limits for sanitization
    maxDepth: 20,
    maxArrayLength: 10000,
    maxObjectKeys: 1000,
    maxStringLength: 1000000,
    maxTotalSize: 100 * 1024 * 1024,
  });

  if (!result.success) {
    return null;
  }

  return result.data!;
}
