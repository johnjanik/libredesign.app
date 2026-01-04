/**
 * Export Format Utilities
 *
 * Provides consistent number formatting for design-to-code exports.
 */

/**
 * Format a number for export with appropriate precision.
 * - Rounds to integers when very close (within 0.001)
 * - Otherwise rounds to 2 decimal places
 * - Strips trailing zeros
 *
 * @example
 * formatNum(408.0000820576977) // "408"
 * formatNum(408.12345) // "408.12"
 * formatNum(100.5) // "100.5"
 */
export function formatNum(value: number | undefined): string {
  if (value === undefined || value === null || !isFinite(value)) {
    return '0';
  }

  // Round to integer if very close
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 0.001) {
    return String(rounded);
  }

  // Otherwise round to 2 decimal places
  const fixed = value.toFixed(2);

  // Strip trailing zeros
  return fixed.replace(/\.?0+$/, '');
}

/**
 * Format a number with a CSS unit suffix.
 *
 * @example
 * formatPx(408.0001) // "408px"
 * formatDp(24.5) // "24.5.dp"
 */
export function formatPx(value: number | undefined): string {
  return `${formatNum(value)}px`;
}

export function formatDp(value: number | undefined): string {
  return `${formatNum(value)}.dp`;
}

export function formatPt(value: number | undefined): string {
  return `${formatNum(value)}pt`;
}

/**
 * Format a number for Swift/UIKit.
 * Uses CGFloat type with appropriate precision.
 */
export function formatCGFloat(value: number | undefined): string {
  return formatNum(value);
}

/**
 * Format dimensions as "width x height" string.
 */
export function formatDimensions(
  width: number | undefined,
  height: number | undefined
): string {
  return `${formatNum(width)} x ${formatNum(height)}`;
}
