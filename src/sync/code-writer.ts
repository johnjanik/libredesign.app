/**
 * Code Writer
 *
 * Handles non-destructive updates to source code files.
 * Modifies only specific value expressions while preserving formatting.
 */

import type { CodeFramework } from '@core/types/code-source-metadata';
import type { PropertyAnchor } from './source-mapping';

// ============================================================================
// Types
// ============================================================================

/**
 * Text edit to apply
 */
export interface TextEdit {
  /** Start offset in file */
  readonly offset: number;
  /** Length of text to replace */
  readonly length: number;
  /** New text to insert */
  readonly newText: string;
}

/**
 * Edit result
 */
export interface EditResult {
  /** New file content */
  readonly content: string;
  /** Edits that were applied */
  readonly edits: readonly TextEdit[];
  /** New offsets for edited properties (for updating anchors) */
  readonly newOffsets: Map<string, { offset: number; length: number }>;
}

/**
 * Value to code conversion options
 */
export interface ConversionOptions {
  /** Framework (swiftui or compose) */
  framework: CodeFramework;
  /** Property path being converted */
  propertyPath: string;
  /** Original expression for context */
  originalExpression?: string;
}

// ============================================================================
// Code Writer
// ============================================================================

/**
 * Non-destructive code file writer
 */
export class CodeWriter {
  /**
   * Apply edits to file content
   */
  applyEdits(content: string, edits: TextEdit[]): EditResult {
    // Sort edits by offset descending to preserve positions
    const sortedEdits = [...edits].sort((a, b) => b.offset - a.offset);

    let result = content;
    const newOffsets = new Map<string, { offset: number; length: number }>();

    for (const edit of sortedEdits) {
      result = result.slice(0, edit.offset) + edit.newText + result.slice(edit.offset + edit.length);
    }

    // Calculate new offsets (edits were applied in reverse order)
    let offsetDelta = 0;
    for (const edit of [...edits].sort((a, b) => a.offset - b.offset)) {
      const newOffset = edit.offset + offsetDelta;
      newOffsets.set(`${edit.offset}`, { offset: newOffset, length: edit.newText.length });
      offsetDelta += edit.newText.length - edit.length;
    }

    return {
      content: result,
      edits: sortedEdits,
      newOffsets,
    };
  }

  /**
   * Create an edit for a property change
   */
  createEdit(
    anchor: PropertyAnchor,
    newValue: unknown,
    options: ConversionOptions
  ): TextEdit {
    const newText = this.convertValueToCode(newValue, options);

    return {
      offset: anchor.charOffset,
      length: anchor.charLength,
      newText,
    };
  }

  /**
   * Convert a value to code expression
   */
  convertValueToCode(value: unknown, options: ConversionOptions): string {
    if (options.framework === 'swiftui') {
      return this.convertToSwiftUI(value, options.propertyPath, options.originalExpression);
    } else {
      return this.convertToCompose(value, options.propertyPath, options.originalExpression);
    }
  }

  /**
   * Convert value to SwiftUI expression
   */
  private convertToSwiftUI(value: unknown, propertyPath: string, originalExpr?: string): string {
    // Color
    if (this.isColorProperty(propertyPath)) {
      if (this.isRGBA(value)) {
        const color = value as { r: number; g: number; b: number; a: number };

        // Try to match original format
        if (originalExpr?.includes('Color.')) {
          // Named color format - find closest named color
          const namedColor = this.findClosestNamedColor(color, 'swiftui');
          if (namedColor) {
            return `Color.${namedColor}`;
          }
        }

        // RGB format
        if (color.a === 1) {
          return `Color(red: ${color.r.toFixed(3)}, green: ${color.g.toFixed(3)}, blue: ${color.b.toFixed(3)})`;
        }
        return `Color(red: ${color.r.toFixed(3)}, green: ${color.g.toFixed(3)}, blue: ${color.b.toFixed(3)}, opacity: ${color.a.toFixed(3)})`;
      }
    }

    // Dimension (points)
    if (this.isDimensionProperty(propertyPath)) {
      if (typeof value === 'number') {
        // SwiftUI uses CGFloat, can be just a number
        return value % 1 === 0 ? `${value}` : `${value.toFixed(1)}`;
      }
    }

    // Font size
    if (propertyPath.includes('fontSize')) {
      if (typeof value === 'number') {
        return `${value}`;
      }
    }

    // Opacity
    if (propertyPath === 'opacity') {
      if (typeof value === 'number') {
        return value.toFixed(2);
      }
    }

    // Corner radius
    if (propertyPath.includes('cornerRadius')) {
      if (typeof value === 'number') {
        return `${value}`;
      }
    }

    // Text content
    if (propertyPath === 'characters' || propertyPath === 'text') {
      if (typeof value === 'string') {
        return `"${this.escapeString(value)}"`;
      }
    }

    // Boolean
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    // Number (generic)
    if (typeof value === 'number') {
      return value % 1 === 0 ? `${value}` : `${value.toFixed(3)}`;
    }

    // String (generic)
    if (typeof value === 'string') {
      return `"${this.escapeString(value)}"`;
    }

    return String(value);
  }

  /**
   * Convert value to Compose expression
   */
  private convertToCompose(value: unknown, propertyPath: string, originalExpr?: string): string {
    // Color
    if (this.isColorProperty(propertyPath)) {
      if (this.isRGBA(value)) {
        const color = value as { r: number; g: number; b: number; a: number };

        // Try to match original format
        if (originalExpr?.includes('Color.')) {
          const namedColor = this.findClosestNamedColor(color, 'compose');
          if (namedColor) {
            return `Color.${namedColor}`;
          }
        }

        // Hex format
        const a = Math.round(color.a * 255);
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);
        const hex = ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
        return `Color(0x${hex.toString(16).toUpperCase().padStart(8, '0')})`;
      }
    }

    // Dimension with .dp
    if (this.isDimensionProperty(propertyPath)) {
      if (typeof value === 'number') {
        return value % 1 === 0 ? `${value}.dp` : `${value.toFixed(1)}.dp`;
      }
    }

    // Font size with .sp
    if (propertyPath.includes('fontSize')) {
      if (typeof value === 'number') {
        return `${value}.sp`;
      }
    }

    // Opacity (alpha)
    if (propertyPath === 'opacity') {
      if (typeof value === 'number') {
        return `${value.toFixed(2)}f`;
      }
    }

    // Corner radius
    if (propertyPath.includes('cornerRadius')) {
      if (typeof value === 'number') {
        return `${value}.dp`;
      }
    }

    // Text content
    if (propertyPath === 'characters' || propertyPath === 'text') {
      if (typeof value === 'string') {
        return `"${this.escapeString(value)}"`;
      }
    }

    // Boolean
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    // Number (generic)
    if (typeof value === 'number') {
      return value % 1 === 0 ? `${value}` : `${value.toFixed(3)}f`;
    }

    // String (generic)
    if (typeof value === 'string') {
      return `"${this.escapeString(value)}"`;
    }

    return String(value);
  }

  /**
   * Check if property is a color property
   */
  private isColorProperty(path: string): boolean {
    const colorKeywords = ['color', 'Color', 'fills', 'strokes', 'background', 'foreground', 'tint'];
    return colorKeywords.some(k => path.toLowerCase().includes(k.toLowerCase()));
  }

  /**
   * Check if property is a dimension property
   */
  private isDimensionProperty(path: string): boolean {
    const dimensionKeywords = ['width', 'height', 'x', 'y', 'padding', 'margin', 'spacing', 'radius', 'size', 'offset'];
    return dimensionKeywords.some(k => path.toLowerCase().includes(k.toLowerCase()));
  }

  /**
   * Check if value is RGBA
   */
  private isRGBA(value: unknown): value is { r: number; g: number; b: number; a: number } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'r' in value &&
      'g' in value &&
      'b' in value &&
      'a' in value
    );
  }

  /**
   * Find closest named color
   */
  private findClosestNamedColor(
    color: { r: number; g: number; b: number; a: number },
    framework: CodeFramework
  ): string | null {
    const swiftUIColors: Record<string, { r: number; g: number; b: number }> = {
      red: { r: 1, g: 0.231, b: 0.188 },
      orange: { r: 1, g: 0.584, b: 0 },
      yellow: { r: 1, g: 0.8, b: 0 },
      green: { r: 0.204, g: 0.78, b: 0.349 },
      blue: { r: 0, g: 0.478, b: 1 },
      purple: { r: 0.686, g: 0.322, b: 0.871 },
      pink: { r: 1, g: 0.176, b: 0.333 },
      white: { r: 1, g: 1, b: 1 },
      black: { r: 0, g: 0, b: 0 },
      gray: { r: 0.557, g: 0.557, b: 0.576 },
    };

    const composeColors: Record<string, { r: number; g: number; b: number }> = {
      Red: { r: 1, g: 0, b: 0 },
      Green: { r: 0, g: 0.5, b: 0 },
      Blue: { r: 0, g: 0, b: 1 },
      Yellow: { r: 1, g: 1, b: 0 },
      Cyan: { r: 0, g: 1, b: 1 },
      Magenta: { r: 1, g: 0, b: 1 },
      White: { r: 1, g: 1, b: 1 },
      Black: { r: 0, g: 0, b: 0 },
      Gray: { r: 0.5, g: 0.5, b: 0.5 },
    };

    const colors = framework === 'swiftui' ? swiftUIColors : composeColors;
    let closestName: string | null = null;
    let closestDistance = Infinity;

    for (const [name, c] of Object.entries(colors)) {
      const distance = Math.sqrt(
        Math.pow(color.r - c.r, 2) +
        Math.pow(color.g - c.g, 2) +
        Math.pow(color.b - c.b, 2)
      );

      if (distance < closestDistance && distance < 0.05) {
        closestDistance = distance;
        closestName = name;
      }
    }

    return closestName;
  }

  /**
   * Escape a string for code
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}

/**
 * Create a code writer
 */
export function createCodeWriter(): CodeWriter {
  return new CodeWriter();
}
