/**
 * Kotlin/Compose Parser
 *
 * Parses Kotlin/Compose source code to extract UI structure.
 */

import { createSourceLocation } from '@core/types/code-source-metadata';
import type { ParsedComposable, ParsedComposeModifier, ParsedParamValue } from './types';

/**
 * Kotlin/Compose code parser
 */
export class ComposeParser {
  private source: string = '';
  private filePath: string = '';
  private position: number = 0;

  /**
   * Parse Compose source code
   */
  parse(source: string, filePath: string): ParsedComposable[] {
    this.source = source;
    this.filePath = filePath;
    this.position = 0;

    const composables: ParsedComposable[] = [];

    // Find @Composable functions and their content
    while (this.position < source.length) {
      const composable = this.tryParseComposable();
      if (composable) {
        composables.push(composable);
      } else {
        this.position++;
      }
    }

    return composables;
  }

  /**
   * Try to parse a Composable at current position
   */
  private tryParseComposable(): ParsedComposable | null {
    this.skipWhitespace();

    // Check for Compose component call (starts with capital letter)
    const nameMatch = this.source.slice(this.position).match(/^([A-Z][a-zA-Z0-9]*)\s*\(/);
    if (!nameMatch) return null;

    const name = nameMatch[1]!;
    const startPos = this.position;
    this.position += nameMatch[0].length - 1; // Position at '('

    // Parse parameters
    const params = this.parseParameters();

    // Check for trailing lambda (content)
    this.skipWhitespace();
    const children: ParsedComposable[] = [];
    let textContent: string | undefined;

    if (this.source[this.position] === '{') {
      this.position++;
      const contentResult = this.parseContent();
      children.push(...contentResult.children);
      textContent = contentResult.textContent;
    }

    // Parse modifiers from parameters
    const modifiers = this.extractModifiers(params);

    const result: ParsedComposable = {
      name,
      location: this.createLocation(startPos, this.position),
      modifiers,
      parameters: params,
      children,
    };
    if (textContent) {
      result.textContent = textContent;
    }
    return result;
  }

  /**
   * Parse function parameters
   */
  private parseParameters(): Map<string, ParsedParamValue> {
    const params = new Map<string, ParsedParamValue>();

    if (this.source[this.position] !== '(') return params;
    this.position++; // Skip '('

    while (this.position < this.source.length) {
      this.skipWhitespace();

      if (this.source[this.position] === ')') {
        this.position++;
        break;
      }

      // Parse parameter name
      const paramMatch = this.source.slice(this.position).match(/^(\w+)\s*=\s*/);
      if (paramMatch) {
        const paramName = paramMatch[1]!;
        this.position += paramMatch[0].length;

        // Parse value
        const value = this.parseValue();
        if (value) {
          params.set(paramName, value);
        }
      } else {
        // Positional argument
        const value = this.parseValue();
        if (value) {
          params.set(`_arg${params.size}`, value);
        }
      }

      // Skip comma
      this.skipWhitespace();
      if (this.source[this.position] === ',') {
        this.position++;
      }
    }

    return params;
  }

  /**
   * Parse a value expression
   */
  private parseValue(): ParsedParamValue | null {
    this.skipWhitespace();
    const startPos = this.position;

    // String literal
    if (this.source[this.position] === '"') {
      return this.parseStringLiteral();
    }

    // Number with dp/sp suffix
    const dpMatch = this.source.slice(this.position).match(/^(\d+(?:\.\d+)?)\s*\.\s*dp\b/);
    if (dpMatch) {
      this.position += dpMatch[0].length;
      return { type: 'dp', value: parseFloat(dpMatch[1]!), rawExpression: dpMatch[0] };
    }

    const spMatch = this.source.slice(this.position).match(/^(\d+(?:\.\d+)?)\s*\.\s*sp\b/);
    if (spMatch) {
      this.position += spMatch[0].length;
      return { type: 'sp', value: parseFloat(spMatch[1]!), rawExpression: spMatch[0] };
    }

    // Plain number
    const numMatch = this.source.slice(this.position).match(/^-?\d+(?:\.\d+)?[fFL]?/);
    if (numMatch) {
      this.position += numMatch[0].length;
      return { type: 'number', value: parseFloat(numMatch[0]), rawExpression: numMatch[0] };
    }

    // Color
    const colorMatch = this.source.slice(this.position).match(/^Color\s*\(\s*(0x[A-Fa-f0-9]+|[^)]+)\s*\)/);
    if (colorMatch) {
      this.position += colorMatch[0].length;
      return { type: 'color', value: colorMatch[1], rawExpression: colorMatch[0] };
    }

    // Color constant
    const colorConstMatch = this.source.slice(this.position).match(/^Color\s*\.\s*(\w+)/);
    if (colorConstMatch) {
      this.position += colorConstMatch[0].length;
      return { type: 'color', value: colorConstMatch[1], rawExpression: colorConstMatch[0] };
    }

    // Boolean
    if (this.source.slice(this.position, this.position + 4) === 'true') {
      this.position += 4;
      return { type: 'boolean', value: true, rawExpression: 'true' };
    }
    if (this.source.slice(this.position, this.position + 5) === 'false') {
      this.position += 5;
      return { type: 'boolean', value: false, rawExpression: 'false' };
    }

    // Expression (anything else until comma or closing paren)
    let depth = 0;
    let expr = '';
    while (this.position < this.source.length) {
      const char = this.source[this.position]!;
      if (char === '(' || char === '{' || char === '[') depth++;
      else if (char === ')' || char === '}' || char === ']') {
        if (depth === 0) break;
        depth--;
      } else if (char === ',' && depth === 0) break;

      expr += char;
      this.position++;
    }

    if (expr.trim()) {
      return { type: 'expression', value: null, rawExpression: expr.trim() };
    }

    this.position = startPos;
    return null;
  }

  /**
   * Parse string literal
   */
  private parseStringLiteral(): ParsedParamValue {
    this.position++; // Skip opening quote
    let value = '';

    while (this.position < this.source.length) {
      const char = this.source[this.position]!;
      if (char === '"') {
        this.position++;
        break;
      }
      if (char === '\\' && this.position + 1 < this.source.length) {
        this.position++;
        value += this.source[this.position];
      } else {
        value += char;
      }
      this.position++;
    }

    return { type: 'string', value, rawExpression: `"${value}"` };
  }

  /**
   * Parse content block
   */
  private parseContent(): { children: ParsedComposable[]; textContent?: string } {
    const children: ParsedComposable[] = [];
    let textContent = '';
    let depth = 1;

    while (this.position < this.source.length && depth > 0) {
      this.skipWhitespace();

      const char = this.source[this.position]!;

      if (char === '{') {
        depth++;
        this.position++;
      } else if (char === '}') {
        depth--;
        this.position++;
      } else {
        // Try to parse nested Composable
        const child = this.tryParseComposable();
        if (child) {
          children.push(child);
        } else {
          // Check for text content
          const textMatch = this.source.slice(this.position).match(/^[^{}"]+/);
          if (textMatch) {
            const text = textMatch[0].trim();
            if (text && !text.match(/^[\s\n]*$/)) {
              textContent += text + ' ';
            }
            this.position += textMatch[0].length;
          } else {
            this.position++;
          }
        }
      }
    }

    const trimmed = textContent.trim();
    if (trimmed) {
      return { children, textContent: trimmed };
    }
    return { children };
  }

  /**
   * Extract modifiers from parameters
   */
  private extractModifiers(params: Map<string, ParsedParamValue>): ParsedComposeModifier[] {
    const modifiers: ParsedComposeModifier[] = [];
    const modifierParam = params.get('modifier');

    if (!modifierParam || modifierParam.type !== 'expression') return modifiers;

    const expr = modifierParam.rawExpression;

    // Parse modifier chain: Modifier.fillMaxWidth().padding(16.dp).background(Color.Red)
    const modifierPattern = /\.(\w+)\s*\(([^)]*)\)/g;
    let match;

    while ((match = modifierPattern.exec(expr)) !== null) {
      const name = match[1]!;
      const argsStr = match[2]!;
      const args = new Map<string, ParsedParamValue>();

      // Parse arguments
      if (argsStr.trim()) {
        const argParts = argsStr.split(',');
        for (const part of argParts) {
          const trimmed = part.trim();
          const namedMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
          if (namedMatch) {
            const argName = namedMatch[1]!;
            const argValue = namedMatch[2]!;
            args.set(argName, this.parseValueFromString(argValue));
          } else {
            args.set(`_arg${args.size}`, this.parseValueFromString(trimmed));
          }
        }
      }

      modifiers.push({ name, arguments: args });
    }

    return modifiers;
  }

  /**
   * Parse value from string
   */
  private parseValueFromString(str: string): ParsedParamValue {
    const trimmed = str.trim();

    // dp value
    const dpMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\.\s*dp$/);
    if (dpMatch) {
      return { type: 'dp', value: parseFloat(dpMatch[1]!), rawExpression: trimmed };
    }

    // sp value
    const spMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\.\s*sp$/);
    if (spMatch) {
      return { type: 'sp', value: parseFloat(spMatch[1]!), rawExpression: trimmed };
    }

    // Number
    if (/^-?\d+(?:\.\d+)?[fFL]?$/.test(trimmed)) {
      return { type: 'number', value: parseFloat(trimmed), rawExpression: trimmed };
    }

    // Color
    if (trimmed.startsWith('Color')) {
      return { type: 'color', value: trimmed, rawExpression: trimmed };
    }

    return { type: 'expression', value: null, rawExpression: trimmed };
  }

  /**
   * Skip whitespace and comments
   */
  private skipWhitespace(): void {
    while (this.position < this.source.length) {
      const char = this.source[this.position]!;

      if (/\s/.test(char)) {
        this.position++;
        continue;
      }

      // Line comment
      if (this.source.slice(this.position, this.position + 2) === '//') {
        const newline = this.source.indexOf('\n', this.position);
        this.position = newline === -1 ? this.source.length : newline + 1;
        continue;
      }

      // Block comment
      if (this.source.slice(this.position, this.position + 2) === '/*') {
        const end = this.source.indexOf('*/', this.position + 2);
        this.position = end === -1 ? this.source.length : end + 2;
        continue;
      }

      break;
    }
  }

  /**
   * Create source location
   */
  private createLocation(startOffset: number, endOffset: number) {
    const beforeStart = this.source.slice(0, startOffset);
    const startLine = (beforeStart.match(/\n/g) ?? []).length + 1;
    const lastNewline = beforeStart.lastIndexOf('\n');
    const startColumn = startOffset - lastNewline;

    const beforeEnd = this.source.slice(0, endOffset);
    const endLine = (beforeEnd.match(/\n/g) ?? []).length + 1;
    const lastNewlineEnd = beforeEnd.lastIndexOf('\n');
    const endColumn = endOffset - lastNewlineEnd;

    return createSourceLocation(
      this.filePath,
      startLine,
      startColumn,
      endLine,
      endColumn,
      startOffset,
      endOffset
    );
  }
}

/**
 * Create a Compose parser instance
 */
export function createComposeParser(): ComposeParser {
  return new ComposeParser();
}
