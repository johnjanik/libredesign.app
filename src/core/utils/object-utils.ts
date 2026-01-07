/**
 * Object utilities for handling optional properties
 */

/**
 * Removes undefined values from an object for exactOptionalPropertyTypes compliance.
 * This is useful when passing optional configuration objects where undefined
 * values should be omitted rather than explicitly set.
 *
 * @example
 * const options = definedProps({
 *   maxTokens: config.maxTokens,
 *   temperature: config.temperature,
 *   systemPrompt: 'Hello',
 * });
 * // If maxTokens is undefined, it won't be in the result
 */
export function definedProps<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

/**
 * Conditionally includes a property in an object spread.
 * Returns an object with the property if value is defined, empty object otherwise.
 *
 * @example
 * const result = {
 *   name: 'test',
 *   ...conditionalProp('description', maybeDescription),
 * };
 */
export function conditionalProp<K extends string, V>(
  key: K,
  value: V | undefined
): { [P in K]: V } | Record<string, never> {
  if (value !== undefined) {
    return { [key]: value } as { [P in K]: V };
  }
  return {} as Record<string, never>;
}
