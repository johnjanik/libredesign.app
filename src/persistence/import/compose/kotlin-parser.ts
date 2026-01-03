/**
 * Kotlin/Compose Parser
 *
 * Parses Kotlin source code to extract Jetpack Compose UI structure.
 * Uses pattern matching for common Compose constructs.
 */

import type { RGBA } from '@core/types/color';
import type {
  SourceLocation,
  PropertyBindingType,
  SemanticAnchor,
} from '@core/types/code-source-metadata';
import { createSourceLocation, createPropertySource } from '@core/types/code-source-metadata';
import type {
  ParsedComposable,
  ParsedComposeModifier,
  ParsedModifierArgument,
  ParsedParameterValue,
  ParsedComposeColor,
} from './types';

// ============================================================================
// Parser State
// ============================================================================

interface ParserState {
  source: string;
  filePath: string;
  position: number;
  line: number;
  column: number;
  scopeStack: string[];
  siblingCounters: Map<string, number>;
}

// ============================================================================
// Main Parser Class
// ============================================================================

/**
 * Kotlin/Compose code parser
 */
export class KotlinComposeParser {
  private state!: ParserState;
  private themeColors: Record<string, RGBA> = {};

  constructor() {
    // Initialize with default Material 3 colors
    this.setThemeColors('light');
  }

  /**
   * Set theme colors for resolution
   */
  setThemeColors(_variant: 'light' | 'dark'): void {
    // Use default light theme for now
    const scheme = {
      primary: { r: 0.4, g: 0.31, b: 0.64, a: 1 },
      onPrimary: { r: 1, g: 1, b: 1, a: 1 },
      primaryContainer: { r: 0.91, g: 0.85, b: 1, a: 1 },
      secondary: { r: 0.38, g: 0.36, b: 0.44, a: 1 },
      background: { r: 1, g: 0.98, b: 1, a: 1 },
      surface: { r: 1, g: 0.98, b: 1, a: 1 },
      error: { r: 0.73, g: 0.11, b: 0.11, a: 1 },
    };
    this.themeColors = scheme;
  }

  /**
   * Parse Kotlin source code
   */
  parse(source: string, filePath: string): ParsedComposable[] {
    this.state = {
      source,
      filePath,
      position: 0,
      line: 1,
      column: 1,
      scopeStack: [],
      siblingCounters: new Map(),
    };

    const composables: ParsedComposable[] = [];

    // Find all @Composable functions
    const composableMatches = source.matchAll(
      /@Composable\s+(?:fun|private\s+fun|internal\s+fun)\s+(\w+)\s*\([^)]*\)\s*(?::\s*Unit\s*)?\{/g
    );

    for (const match of composableMatches) {
      const funcName = match[1]!;
      const funcStart = match.index!;

      // Find the function body
      const bodyStart = funcStart + match[0].length;
      const bodyEnd = this.findMatchingBrace(source, bodyStart - 1);

      if (bodyEnd !== -1) {
        const bodyContent = source.slice(bodyStart, bodyEnd);
        this.state.scopeStack = [funcName];
        this.state.siblingCounters.clear();
        const parsed = this.parseComposableBody(bodyContent, bodyStart, funcName);
        composables.push(...parsed);
      }
    }

    return composables;
  }

  /**
   * Find matching closing brace
   */
  private findMatchingBrace(source: string, openBracePos: number): number {
    let depth = 1;
    let i = openBracePos + 1;
    let inString = false;
    let inRawString = false;
    let stringDelimiter = '';

    while (i < source.length && depth > 0) {
      const char = source[i]!;
      const prevChar = source[i - 1];

      // Handle raw strings """
      if (source.slice(i, i + 3) === '"""') {
        if (!inString) {
          inRawString = true;
          inString = true;
          i += 3;
          continue;
        } else if (inRawString) {
          inRawString = false;
          inString = false;
          i += 3;
          continue;
        }
      }

      // Handle regular strings
      if ((char === '"' || char === '\'') && !inRawString && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringDelimiter = char;
        } else if (char === stringDelimiter) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '{') depth++;
        else if (char === '}') depth--;
      }

      i++;
    }

    return depth === 0 ? i - 1 : -1;
  }

  /**
   * Parse composable function body
   */
  private parseComposableBody(content: string, offset: number, scope: string): ParsedComposable[] {
    const composables: ParsedComposable[] = [];
    let pos = 0;

    while (pos < content.length) {
      pos = this.skipWhitespaceAndComments(content, pos);
      if (pos >= content.length) break;

      const result = this.tryParseComposable(content, pos, offset, scope);
      if (result) {
        composables.push(result.composable);
        pos = result.end;
      } else {
        pos++;
      }
    }

    return composables;
  }

  /**
   * Try to parse a composable call at current position
   */
  private tryParseComposable(
    content: string,
    pos: number,
    offset: number,
    scope: string
  ): { composable: ParsedComposable; end: number } | null {
    // Match composable call: Name(...) { ... } or Name { ... } or Name(...)
    const callMatch = content.slice(pos).match(
      /^([A-Z]\w*)\s*(?:\(([^)]*)\))?\s*(\{)?/
    );
    if (!callMatch) return null;

    const composableName = callMatch[1]!;
    const hasArgs = callMatch[2] !== undefined;
    const hasBody = callMatch[3] === '{';
    const startPos = pos;
    let endPos = pos + callMatch[0].length;

    // Parse parameters
    const parameters = new Map<string, ParsedParameterValue>();
    let modifierChain: ParsedComposeModifier[] = [];

    if (hasArgs && callMatch[2]) {
      this.parseParameters(callMatch[2], offset + pos, parameters, modifierChain);
    }

    // Parse children if has body
    let children: ParsedComposable[] = [];
    if (hasBody) {
      const bodyStart = endPos;
      const bodyEnd = this.findMatchingBrace(content, bodyStart - 1);
      if (bodyEnd !== -1) {
        const bodyContent = content.slice(bodyStart, bodyEnd);
        children = this.parseComposableBody(bodyContent, offset + bodyStart, `${scope}.${composableName}`);
        endPos = bodyEnd + 1;
      }
    }

    // Check for trailing modifier chain (using let/also pattern)
    // Not common in Compose but handle just in case

    // Create source location
    const location = this.createLocation(offset + startPos, offset + endPos);

    // Create semantic anchor
    const siblingKey = `${scope}.${composableName}`;
    const siblingIndex = this.state.siblingCounters.get(siblingKey) ?? 0;
    this.state.siblingCounters.set(siblingKey, siblingIndex + 1);

    const anchor: SemanticAnchor = {
      viewType: composableName,
      containingScope: scope,
      siblingIndex,
      structureHash: this.computeStructureHash(composableName, children.length, modifierChain.length),
    };

    const composable: ParsedComposable = {
      name: composableName,
      location,
      modifiers: modifierChain,
      children,
      parameters,
      isConditional: false,
      anchor,
    };

    return { composable, end: endPos };
  }

  /**
   * Parse composable parameters
   */
  private parseParameters(
    paramsString: string,
    offset: number,
    parameters: Map<string, ParsedParameterValue>,
    modifiers: ParsedComposeModifier[]
  ): void {
    // Handle modifier parameter: modifier = Modifier.padding(16.dp).background(Color.Red)
    const modifierMatch = paramsString.match(/modifier\s*=\s*(Modifier[^,}]*)/);
    if (modifierMatch) {
      this.parseModifierChain(modifierMatch[1]!, offset, modifiers);
    }

    // Handle named parameters
    const namedParams = paramsString.matchAll(/(\w+)\s*=\s*([^,]+)/g);
    for (const match of namedParams) {
      const name = match[1]!;
      if (name === 'modifier') continue; // Already handled

      const valueStr = match[2]!.trim();
      const parsedValue = this.parseValueExpression(valueStr, offset);
      parameters.set(name, parsedValue);
    }

    // Handle positional string parameter (common for Text)
    const stringMatch = paramsString.match(/^"([^"]*)"(?:\s*,|$)/);
    if (stringMatch) {
      parameters.set('text', this.createParameterValue(
        'string',
        stringMatch[1]!,
        stringMatch[0],
        offset,
        'literal'
      ));
    }
  }

  /**
   * Parse Modifier chain
   */
  private parseModifierChain(
    modifierStr: string,
    offset: number,
    modifiers: ParsedComposeModifier[]
  ): void {
    // Split by . but keep function calls together
    const parts = modifierStr.split(/\.(?=[a-z])/).slice(1); // Skip "Modifier"

    for (const part of parts) {
      const callMatch = part.match(/^(\w+)(?:\(([^)]*)\))?/);
      if (!callMatch) continue;

      const modifierName = callMatch[1]!;
      const argsString = callMatch[2] ?? '';

      const args: ParsedModifierArgument[] = [];
      this.parseModifierArgs(argsString, offset, args);

      modifiers.push({
        name: modifierName,
        arguments: args,
        location: this.createLocation(offset, offset + part.length),
      });
    }
  }

  /**
   * Parse modifier arguments
   */
  private parseModifierArgs(
    argsString: string,
    offset: number,
    args: ParsedModifierArgument[]
  ): void {
    if (!argsString.trim()) return;

    // Handle named arguments: horizontal = 16.dp, vertical = 8.dp
    const namedPattern = /(\w+)\s*=\s*([^,]+)/g;
    let match;
    let hasNamed = false;

    while ((match = namedPattern.exec(argsString)) !== null) {
      hasNamed = true;
      const name = match[1]!;
      const valueStr = match[2]!.trim();
      const parsedValue = this.parseValueExpression(valueStr, offset);

      args.push({
        name,
        value: parsedValue,
        location: this.createLocation(offset, offset + argsString.length),
      });
    }

    // If no named args, treat as positional
    if (!hasNamed && argsString.trim()) {
      const values = argsString.split(',').map(v => v.trim()).filter(Boolean);
      for (const valueStr of values) {
        const parsedValue = this.parseValueExpression(valueStr, offset);
        args.push({
          value: parsedValue,
          location: this.createLocation(offset, offset + argsString.length),
        });
      }
    }
  }

  /**
   * Parse a value expression
   */
  private parseValueExpression(expr: string, offset: number): ParsedParameterValue {
    const trimmed = expr.trim();

    // Dimension with .dp or .sp
    const dpMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\.dp$/);
    if (dpMatch) {
      return this.createParameterValue('dp', parseFloat(dpMatch[1]!), trimmed, offset, 'literal');
    }

    const spMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\.sp$/);
    if (spMatch) {
      return this.createParameterValue('sp', parseFloat(spMatch[1]!), trimmed, offset, 'literal');
    }

    // Number literal
    const numberMatch = trimmed.match(/^-?\d+(\.\d+)?f?$/);
    if (numberMatch) {
      return this.createParameterValue('number', parseFloat(trimmed), trimmed, offset, 'literal');
    }

    // String literal
    const stringMatch = trimmed.match(/^"([^"]*)"$/);
    if (stringMatch) {
      return this.createParameterValue('string', stringMatch[1]!, trimmed, offset, 'literal');
    }

    // Boolean
    if (trimmed === 'true' || trimmed === 'false') {
      return this.createParameterValue('boolean', trimmed === 'true', trimmed, offset, 'literal');
    }

    // Compose color
    const colorResult = this.parseComposeColor(trimmed);
    if (colorResult) {
      return this.createParameterValue(
        'color',
        colorResult.rgba ?? null,
        trimmed,
        offset,
        colorResult.isEditable ? 'literal' : 'computed'
      );
    }

    // Enum-like values (e.g., Alignment.Center, ContentScale.Fit)
    const enumMatch = trimmed.match(/^(\w+)\.(\w+)$/);
    if (enumMatch) {
      return this.createParameterValue('enum', `${enumMatch[1]}.${enumMatch[2]}`, trimmed, offset, 'literal');
    }

    // State binding or computed value
    const bindingType = this.inferBindingType(trimmed);
    return this.createParameterValue('expression', null, trimmed, offset, bindingType);
  }

  /**
   * Parse Compose color expression
   */
  private parseComposeColor(expr: string): ParsedComposeColor | null {
    // Color.Red, Color.Blue, etc.
    const namedMatch = expr.match(/^Color\.(\w+)$/);
    if (namedMatch) {
      const colorName = namedMatch[1]!.toLowerCase();
      const rgba = this.namedColorToRGBA(colorName);
      if (rgba) {
        return {
          type: 'named',
          rgba,
          expression: expr,
          isEditable: true,
        };
      }
    }

    // Color(0xFFRRGGBB) or Color(0xAARRGGBB)
    const hexMatch = expr.match(/^Color\s*\(\s*0x([0-9A-Fa-f]{6,8})\s*\)$/);
    if (hexMatch) {
      const hex = hexMatch[1]!;
      let r: number, g: number, b: number, a: number;
      if (hex.length === 8) {
        a = parseInt(hex.slice(0, 2), 16) / 255;
        r = parseInt(hex.slice(2, 4), 16) / 255;
        g = parseInt(hex.slice(4, 6), 16) / 255;
        b = parseInt(hex.slice(6, 8), 16) / 255;
      } else {
        a = 1;
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
      }
      return {
        type: 'hex',
        rgba: { r, g, b, a },
        expression: expr,
        isEditable: true,
      };
    }

    // MaterialTheme.colorScheme.primary, etc.
    const themeMatch = expr.match(/^MaterialTheme\.colorScheme\.(\w+)$/);
    if (themeMatch) {
      const colorName = themeMatch[1]!;
      const rgba = this.themeColors[colorName as keyof typeof this.themeColors];
      const base = {
        type: 'theme' as const,
        expression: expr,
        themeColorName: colorName,
        isEditable: false, // Theme colors are not directly editable
      };
      if (rgba) {
        return { ...base, rgba };
      }
      return base;
    }

    return null;
  }

  /**
   * Convert named color to RGBA
   */
  private namedColorToRGBA(name: string): RGBA | null {
    const colors: Record<string, RGBA> = {
      red: { r: 1, g: 0, b: 0, a: 1 },
      green: { r: 0, g: 0.5, b: 0, a: 1 },
      blue: { r: 0, g: 0, b: 1, a: 1 },
      yellow: { r: 1, g: 1, b: 0, a: 1 },
      cyan: { r: 0, g: 1, b: 1, a: 1 },
      magenta: { r: 1, g: 0, b: 1, a: 1 },
      white: { r: 1, g: 1, b: 1, a: 1 },
      black: { r: 0, g: 0, b: 0, a: 1 },
      gray: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      lightgray: { r: 0.75, g: 0.75, b: 0.75, a: 1 },
      darkgray: { r: 0.25, g: 0.25, b: 0.25, a: 1 },
      transparent: { r: 0, g: 0, b: 0, a: 0 },
    };
    return colors[name] ?? null;
  }

  /**
   * Infer binding type from expression
   */
  private inferBindingType(expr: string): PropertyBindingType {
    if (expr.includes('remember')) return 'state';
    if (expr.includes('ViewModel') || expr.includes('viewModel')) return 'state';
    if (expr.includes('by ')) return 'state';
    if (expr.startsWith('$')) return 'binding';
    if (expr.includes('if') || expr.includes('when')) return 'conditional';
    if (expr.includes('()')) return 'function';
    return 'unknown';
  }

  /**
   * Create a parameter value
   */
  private createParameterValue(
    type: ParsedParameterValue['type'],
    value: ParsedParameterValue['value'],
    rawExpression: string,
    offset: number,
    bindingType: PropertyBindingType
  ): ParsedParameterValue {
    const location = this.createLocation(offset, offset + rawExpression.length);
    return {
      type,
      value,
      rawExpression,
      source: createPropertySource(location, bindingType, rawExpression),
    };
  }

  /**
   * Skip whitespace and comments
   */
  private skipWhitespaceAndComments(content: string, pos: number): number {
    while (pos < content.length) {
      const char = content[pos]!;

      // Whitespace
      if (/\s/.test(char)) {
        pos++;
        continue;
      }

      // Line comment
      if (content.slice(pos, pos + 2) === '//') {
        const newline = content.indexOf('\n', pos);
        pos = newline === -1 ? content.length : newline + 1;
        continue;
      }

      // Block comment
      if (content.slice(pos, pos + 2) === '/*') {
        const end = content.indexOf('*/', pos + 2);
        pos = end === -1 ? content.length : end + 2;
        continue;
      }

      break;
    }

    return pos;
  }

  /**
   * Create source location
   */
  private createLocation(startOffset: number, endOffset: number): SourceLocation {
    const beforeStart = this.state.source.slice(0, startOffset);
    const startLine = (beforeStart.match(/\n/g) ?? []).length + 1;
    const lastNewline = beforeStart.lastIndexOf('\n');
    const startColumn = startOffset - lastNewline;

    const beforeEnd = this.state.source.slice(0, endOffset);
    const endLine = (beforeEnd.match(/\n/g) ?? []).length + 1;
    const lastNewlineEnd = beforeEnd.lastIndexOf('\n');
    const endColumn = endOffset - lastNewlineEnd;

    return createSourceLocation(
      this.state.filePath,
      startLine,
      startColumn,
      endLine,
      endColumn,
      startOffset,
      endOffset
    );
  }

  /**
   * Compute structure hash
   */
  private computeStructureHash(name: string, childCount: number, modifierCount: number): string {
    const data = `${name}:${childCount}:${modifierCount}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

/**
 * Create a Kotlin/Compose parser instance
 */
export function createKotlinComposeParser(): KotlinComposeParser {
  return new KotlinComposeParser();
}
