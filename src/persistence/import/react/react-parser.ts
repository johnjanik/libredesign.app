/**
 * React/JSX Parser
 *
 * Parses React/JSX source code to extract UI structure.
 */

import { createSourceLocation } from '@core/types/code-source-metadata';
import type { ParsedJSXElement, ParsedPropValue, ParsedStyle } from './types';

/**
 * React/JSX code parser
 */
export class ReactParser {
  private source: string = '';
  private filePath: string = '';
  private position: number = 0;

  /**
   * Parse React/JSX source code
   */
  parse(source: string, filePath: string): ParsedJSXElement[] {
    this.source = source;
    this.filePath = filePath;
    this.position = 0;

    const elements: ParsedJSXElement[] = [];

    // Find JSX elements in the source
    while (this.position < source.length) {
      const element = this.tryParseJSXElement();
      if (element) {
        elements.push(element);
      } else {
        this.position++;
      }
    }

    return elements;
  }

  /**
   * Try to parse a JSX element at current position
   */
  private tryParseJSXElement(): ParsedJSXElement | null {
    this.skipWhitespace();

    // Check for opening tag
    if (this.source[this.position] !== '<') return null;

    // Skip comments
    if (this.source.slice(this.position, this.position + 4) === '<!--') return null;
    if (this.source.slice(this.position, this.position + 2) === '</') return null;

    const startPos = this.position;
    this.position++; // Skip '<'

    // Parse tag name
    const tagName = this.parseIdentifier();
    if (!tagName) {
      this.position = startPos;
      return null;
    }

    // Parse props
    const props = this.parseProps();

    // Check for self-closing or opening tag
    this.skipWhitespace();
    const isSelfClosing = this.source.slice(this.position, this.position + 2) === '/>';

    if (isSelfClosing) {
      this.position += 2;
      return {
        tagName,
        location: this.createLocation(startPos, this.position),
        props,
        children: [],
        isCustomComponent: /^[A-Z]/.test(tagName),
      };
    }

    // Expect '>'
    if (this.source[this.position] !== '>') {
      this.position = startPos;
      return null;
    }
    this.position++; // Skip '>'

    // Parse children
    const children: ParsedJSXElement[] = [];
    let textContent = '';

    while (this.position < this.source.length) {
      this.skipWhitespace();

      // Check for closing tag
      if (this.source.slice(this.position, this.position + 2) === '</') {
        break;
      }

      // Try to parse child element
      const child = this.tryParseJSXElement();
      if (child) {
        children.push(child);
      } else if (this.source[this.position] === '{') {
        // Skip JSX expressions for now
        this.skipJSXExpression();
      } else if (this.source[this.position] !== '<') {
        // Text content
        const text = this.parseTextContent();
        if (text.trim()) {
          textContent += text;
        }
      } else {
        break;
      }
    }

    // Parse closing tag
    if (this.source.slice(this.position, this.position + 2) === '</') {
      this.position += 2;
      const closingTag = this.parseIdentifier();
      if (closingTag === tagName) {
        this.skipWhitespace();
        if (this.source[this.position] === '>') {
          this.position++;
        }
      }
    }

    const element: ParsedJSXElement = {
      tagName,
      location: this.createLocation(startPos, this.position),
      props,
      children,
      isCustomComponent: /^[A-Z]/.test(tagName),
    };

    if (textContent.trim()) {
      element.textContent = textContent.trim();
    }

    return element;
  }

  /**
   * Parse identifier (tag name or prop name)
   */
  private parseIdentifier(): string {
    this.skipWhitespace();
    let name = '';
    while (this.position < this.source.length) {
      const char = this.source[this.position]!;
      if (/[a-zA-Z0-9_.-]/.test(char)) {
        name += char;
        this.position++;
      } else {
        break;
      }
    }
    return name;
  }

  /**
   * Parse props/attributes
   */
  private parseProps(): Map<string, ParsedPropValue> {
    const props = new Map<string, ParsedPropValue>();

    while (this.position < this.source.length) {
      this.skipWhitespace();

      const char = this.source[this.position];
      if (char === '>' || char === '/') break;

      // Parse prop name
      const propName = this.parseIdentifier();
      if (!propName) break;

      this.skipWhitespace();

      // Check for '='
      if (this.source[this.position] === '=') {
        this.position++;
        this.skipWhitespace();

        // Parse prop value
        const value = this.parsePropValue();
        if (value) {
          props.set(propName, value);
        }
      } else {
        // Boolean prop (just the name)
        props.set(propName, { type: 'boolean', value: true, rawExpression: 'true' });
      }
    }

    return props;
  }

  /**
   * Parse prop value
   */
  private parsePropValue(): ParsedPropValue | null {
    this.skipWhitespace();
    const char = this.source[this.position];

    // String literal
    if (char === '"' || char === "'") {
      return this.parseStringLiteral();
    }

    // JSX expression {value}
    if (char === '{') {
      return this.parseJSXExpressionValue();
    }

    return null;
  }

  /**
   * Parse string literal
   */
  private parseStringLiteral(): ParsedPropValue {
    const quote = this.source[this.position]!;
    this.position++;
    let value = '';

    while (this.position < this.source.length) {
      const char = this.source[this.position]!;
      if (char === quote) {
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
   * Parse JSX expression value {expression}
   */
  private parseJSXExpressionValue(): ParsedPropValue {
    this.position++; // Skip '{'
    const startPos = this.position;
    let depth = 1;

    while (this.position < this.source.length && depth > 0) {
      const char = this.source[this.position]!;
      if (char === '{') depth++;
      else if (char === '}') depth--;
      if (depth > 0) this.position++;
    }

    const expression = this.source.slice(startPos, this.position).trim();
    this.position++; // Skip '}'

    // Try to parse the expression
    return this.parseExpression(expression);
  }

  /**
   * Parse an expression and determine its type
   */
  private parseExpression(expr: string): ParsedPropValue {
    const trimmed = expr.trim();

    // Number
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return { type: 'number', value: parseFloat(trimmed), rawExpression: trimmed };
    }

    // Boolean
    if (trimmed === 'true') {
      return { type: 'boolean', value: true, rawExpression: trimmed };
    }
    if (trimmed === 'false') {
      return { type: 'boolean', value: false, rawExpression: trimmed };
    }

    // Object literal (style prop)
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const style = this.parseStyleObject(trimmed);
      return { type: 'object', value: style, rawExpression: trimmed };
    }

    // Array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return { type: 'array', value: [], rawExpression: trimmed };
    }

    // Expression (variable, function call, etc.)
    return { type: 'expression', value: null, rawExpression: trimmed };
  }

  /**
   * Parse style object
   */
  parseStyleObject(expr: string): ParsedStyle {
    const style: ParsedStyle = {};

    // Remove outer braces
    const inner = expr.slice(1, -1).trim();

    // Match key-value pairs
    const propPattern = /(\w+)\s*:\s*(?:['"]([^'"]+)['"]|(\d+(?:\.\d+)?)|([^,}]+))/g;
    let match;

    while ((match = propPattern.exec(inner)) !== null) {
      const key = match[1]!;
      const stringValue = match[2];
      const numValue = match[3];
      const otherValue = match[4];

      if (stringValue !== undefined) {
        (style as Record<string, unknown>)[key] = stringValue;
      } else if (numValue !== undefined) {
        (style as Record<string, unknown>)[key] = parseFloat(numValue);
      } else if (otherValue !== undefined) {
        const trimmed = otherValue.trim();
        // Try to parse as number
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
          (style as Record<string, unknown>)[key] = parseFloat(trimmed);
        } else {
          (style as Record<string, unknown>)[key] = trimmed.replace(/['"]/g, '');
        }
      }
    }

    return style;
  }

  /**
   * Skip JSX expression {expression}
   */
  private skipJSXExpression(): void {
    if (this.source[this.position] !== '{') return;
    this.position++;
    let depth = 1;

    while (this.position < this.source.length && depth > 0) {
      const char = this.source[this.position]!;
      if (char === '{') depth++;
      else if (char === '}') depth--;
      this.position++;
    }
  }

  /**
   * Parse text content
   */
  private parseTextContent(): string {
    let text = '';
    while (this.position < this.source.length) {
      const char = this.source[this.position]!;
      if (char === '<' || char === '{') break;
      text += char;
      this.position++;
    }
    return text;
  }

  /**
   * Skip whitespace
   */
  private skipWhitespace(): void {
    while (this.position < this.source.length) {
      const char = this.source[this.position]!;
      if (!/\s/.test(char)) break;
      this.position++;
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
 * Create a React parser instance
 */
export function createReactParser(): ReactParser {
  return new ReactParser();
}
