/**
 * JSON5 Parser
 *
 * Lightweight JSON5 parser that handles common relaxed JSON syntax
 * produced by AI models. Supports:
 * - Trailing commas
 * - Unquoted object keys (identifiers)
 * - Single-quoted strings
 * - Comments (single-line // and multi-line block comments)
 * - Hexadecimal numbers
 * - Leading/trailing decimals (.5, 5.)
 * - Infinity and NaN
 * - Multi-line strings (escaped newlines)
 */

// =============================================================================
// Types
// =============================================================================

export interface JSON5ParseResult {
  success: boolean;
  value: unknown;
  error?: string;
}

// =============================================================================
// Tokenizer
// =============================================================================

type TokenType =
  | 'string'
  | 'number'
  | 'identifier'
  | 'null'
  | 'true'
  | 'false'
  | 'lbrace'
  | 'rbrace'
  | 'lbracket'
  | 'rbracket'
  | 'colon'
  | 'comma'
  | 'eof';

interface Token {
  type: TokenType;
  value: unknown;
  raw: string;
  start: number;
  end: number;
}

class Tokenizer {
  private text: string;
  private pos: number = 0;
  private length: number;

  constructor(text: string) {
    this.text = text;
    this.length = text.length;
  }

  private peek(offset: number = 0): string {
    return this.text[this.pos + offset] || '';
  }

  private advance(): string {
    return this.text[this.pos++] || '';
  }

  private skipWhitespace(): void {
    while (this.pos < this.length) {
      const char = this.peek();

      // Whitespace
      if (/\s/.test(char)) {
        this.advance();
        continue;
      }

      // Single-line comment
      if (char === '/' && this.peek(1) === '/') {
        this.advance();
        this.advance();
        while (this.pos < this.length && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }

      // Multi-line comment
      if (char === '/' && this.peek(1) === '*') {
        this.advance();
        this.advance();
        while (this.pos < this.length) {
          if (this.peek() === '*' && this.peek(1) === '/') {
            this.advance();
            this.advance();
            break;
          }
          this.advance();
        }
        continue;
      }

      break;
    }
  }

  private readString(quote: string): Token {
    const start = this.pos;
    this.advance(); // Skip opening quote
    let value = '';

    while (this.pos < this.length) {
      const char = this.advance();

      if (char === quote) {
        return {
          type: 'string',
          value,
          raw: this.text.slice(start, this.pos),
          start,
          end: this.pos,
        };
      }

      if (char === '\\') {
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 'r': value += '\r'; break;
          case 't': value += '\t'; break;
          case 'b': value += '\b'; break;
          case 'f': value += '\f'; break;
          case '\\': value += '\\'; break;
          case '/': value += '/'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          case '\n': break; // Line continuation
          case '\r':
            if (this.peek() === '\n') this.advance();
            break;
          case 'u': {
            // Unicode escape
            let hex = '';
            for (let i = 0; i < 4; i++) {
              hex += this.advance();
            }
            value += String.fromCharCode(parseInt(hex, 16));
            break;
          }
          case 'x': {
            // Hex escape
            let hex = '';
            for (let i = 0; i < 2; i++) {
              hex += this.advance();
            }
            value += String.fromCharCode(parseInt(hex, 16));
            break;
          }
          default:
            value += escaped;
        }
      } else {
        value += char;
      }
    }

    throw new Error(`Unterminated string starting at position ${start}`);
  }

  private readNumber(): Token {
    const start = this.pos;
    let value = '';

    // Sign
    if (this.peek() === '-' || this.peek() === '+') {
      value += this.advance();
    }

    // Infinity
    if (this.text.slice(this.pos, this.pos + 8) === 'Infinity') {
      this.pos += 8;
      const num = value === '-' ? -Infinity : Infinity;
      return {
        type: 'number',
        value: num,
        raw: this.text.slice(start, this.pos),
        start,
        end: this.pos,
      };
    }

    // NaN
    if (this.text.slice(this.pos, this.pos + 3) === 'NaN') {
      this.pos += 3;
      return {
        type: 'number',
        value: NaN,
        raw: this.text.slice(start, this.pos),
        start,
        end: this.pos,
      };
    }

    // Hexadecimal
    if (this.peek() === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X')) {
      value += this.advance();
      value += this.advance();
      while (/[0-9a-fA-F]/.test(this.peek())) {
        value += this.advance();
      }
      return {
        type: 'number',
        value: parseInt(value, 16),
        raw: this.text.slice(start, this.pos),
        start,
        end: this.pos,
      };
    }

    // Integer part (can be empty for .5)
    while (/[0-9]/.test(this.peek())) {
      value += this.advance();
    }

    // Decimal part
    if (this.peek() === '.') {
      value += this.advance();
      while (/[0-9]/.test(this.peek())) {
        value += this.advance();
      }
    }

    // Exponent
    if (this.peek() === 'e' || this.peek() === 'E') {
      value += this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.advance();
      }
      while (/[0-9]/.test(this.peek())) {
        value += this.advance();
      }
    }

    return {
      type: 'number',
      value: parseFloat(value),
      raw: this.text.slice(start, this.pos),
      start,
      end: this.pos,
    };
  }

  private readIdentifier(): Token {
    const start = this.pos;
    let value = '';

    while (/[a-zA-Z0-9_$]/.test(this.peek())) {
      value += this.advance();
    }

    // Check for keywords
    if (value === 'null') {
      return { type: 'null', value: null, raw: value, start, end: this.pos };
    }
    if (value === 'true') {
      return { type: 'true', value: true, raw: value, start, end: this.pos };
    }
    if (value === 'false') {
      return { type: 'false', value: false, raw: value, start, end: this.pos };
    }
    if (value === 'Infinity') {
      return { type: 'number', value: Infinity, raw: value, start, end: this.pos };
    }
    if (value === 'NaN') {
      return { type: 'number', value: NaN, raw: value, start, end: this.pos };
    }

    // Python-style keywords (common from local models)
    if (value === 'None') {
      return { type: 'null', value: null, raw: value, start, end: this.pos };
    }
    if (value === 'True') {
      return { type: 'true', value: true, raw: value, start, end: this.pos };
    }
    if (value === 'False') {
      return { type: 'false', value: false, raw: value, start, end: this.pos };
    }

    return { type: 'identifier', value, raw: value, start, end: this.pos };
  }

  nextToken(): Token {
    this.skipWhitespace();

    if (this.pos >= this.length) {
      return { type: 'eof', value: null, raw: '', start: this.pos, end: this.pos };
    }

    const char = this.peek();
    const start = this.pos;

    // String (double or single quotes)
    if (char === '"' || char === "'") {
      return this.readString(char);
    }

    // Number (including leading decimal like .5)
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(this.peek(1))) ||
        ((char === '-' || char === '+') && (/[0-9.]/.test(this.peek(1)) || this.text.slice(this.pos + 1, this.pos + 9) === 'Infinity'))) {
      return this.readNumber();
    }

    // Identifier (including keywords)
    if (/[a-zA-Z_$]/.test(char)) {
      return this.readIdentifier();
    }

    // Punctuation
    this.advance();
    switch (char) {
      case '{': return { type: 'lbrace', value: '{', raw: char, start, end: this.pos };
      case '}': return { type: 'rbrace', value: '}', raw: char, start, end: this.pos };
      case '[': return { type: 'lbracket', value: '[', raw: char, start, end: this.pos };
      case ']': return { type: 'rbracket', value: ']', raw: char, start, end: this.pos };
      case ':': return { type: 'colon', value: ':', raw: char, start, end: this.pos };
      case ',': return { type: 'comma', value: ',', raw: char, start, end: this.pos };
      default:
        throw new Error(`Unexpected character '${char}' at position ${start}`);
    }
  }
}

// =============================================================================
// Parser
// =============================================================================

class Parser {
  private tokenizer: Tokenizer;
  private currentToken: Token;

  constructor(text: string) {
    this.tokenizer = new Tokenizer(text);
    this.currentToken = this.tokenizer.nextToken();
  }

  private advance(): Token {
    const token = this.currentToken;
    this.currentToken = this.tokenizer.nextToken();
    return token;
  }

  private expect(type: TokenType): Token {
    if (this.currentToken.type !== type) {
      throw new Error(`Expected ${type} but got ${this.currentToken.type} at position ${this.currentToken.start}`);
    }
    return this.advance();
  }

  parse(): unknown {
    const value = this.parseValue();

    if (this.currentToken.type !== 'eof') {
      throw new Error(`Unexpected token ${this.currentToken.type} after value at position ${this.currentToken.start}`);
    }

    return value;
  }

  private parseValue(): unknown {
    switch (this.currentToken.type) {
      case 'string':
      case 'number':
      case 'null':
      case 'true':
      case 'false':
        return this.advance().value;

      case 'lbrace':
        return this.parseObject();

      case 'lbracket':
        return this.parseArray();

      case 'identifier':
        // Unquoted string value (not recommended but handle it)
        return this.advance().value;

      default:
        throw new Error(`Unexpected token ${this.currentToken.type} at position ${this.currentToken.start}`);
    }
  }

  private parseObject(): Record<string, unknown> {
    this.expect('lbrace');
    const obj: Record<string, unknown> = {};

    if (this.currentToken.type === 'rbrace') {
      this.advance();
      return obj;
    }

    while (true) {
      // Key (can be string or identifier in JSON5)
      let key: string;
      if (this.currentToken.type === 'string') {
        key = this.advance().value as string;
      } else if (this.currentToken.type === 'identifier') {
        key = this.advance().value as string;
      } else {
        throw new Error(`Expected string or identifier for object key at position ${this.currentToken.start}`);
      }

      // Colon
      this.expect('colon');

      // Value
      obj[key] = this.parseValue();

      // Comma or end - cast type because control flow analysis doesn't track through parseValue()
      const tokenType = this.currentToken.type as TokenType;
      if (tokenType === 'comma') {
        this.advance();
        // Allow trailing comma
        const nextType = this.currentToken.type as TokenType;
        if (nextType === 'rbrace') {
          break;
        }
      } else if (tokenType === 'rbrace') {
        break;
      } else {
        throw new Error(`Expected ',' or '}' at position ${this.currentToken.start}`);
      }
    }

    this.expect('rbrace');
    return obj;
  }

  private parseArray(): unknown[] {
    this.expect('lbracket');
    const arr: unknown[] = [];

    if (this.currentToken.type === 'rbracket') {
      this.advance();
      return arr;
    }

    while (true) {
      arr.push(this.parseValue());

      // Cast type because control flow analysis doesn't track through parseValue()
      const tokenType = this.currentToken.type as TokenType;
      if (tokenType === 'comma') {
        this.advance();
        // Allow trailing comma
        const nextType = this.currentToken.type as TokenType;
        if (nextType === 'rbracket') {
          break;
        }
      } else if (tokenType === 'rbracket') {
        break;
      } else {
        throw new Error(`Expected ',' or ']' at position ${this.currentToken.start}`);
      }
    }

    this.expect('rbracket');
    return arr;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Parse a JSON5 string
 */
export function parseJSON5(text: string): JSON5ParseResult {
  try {
    const parser = new Parser(text);
    const value = parser.parse();
    return { success: true, value };
  } catch (error) {
    return {
      success: false,
      value: undefined,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Try to parse as standard JSON first, then fall back to JSON5
 */
export function parseJsonOrJson5(text: string): JSON5ParseResult {
  // Try standard JSON first (faster)
  try {
    const value = JSON.parse(text);
    return { success: true, value };
  } catch {
    // Fall back to JSON5
    return parseJSON5(text);
  }
}

/**
 * Check if text looks like JSON5 (has features not in JSON)
 */
export function looksLikeJSON5(text: string): boolean {
  // Quick heuristics for JSON5 features
  const hasComments = /\/\/|\/\*/.test(text);
  const hasTrailingComma = /,\s*[}\]]/.test(text);
  const hasSingleQuotes = /'[^']*'/.test(text);
  const hasUnquotedKeys = /[{,]\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:/.test(text);
  const hasHexNumbers = /0x[0-9a-fA-F]+/.test(text);
  const hasSpecialNumbers = /\b(Infinity|NaN)\b/.test(text);

  return hasComments || hasTrailingComma || hasSingleQuotes ||
         hasUnquotedKeys || hasHexNumbers || hasSpecialNumbers;
}
