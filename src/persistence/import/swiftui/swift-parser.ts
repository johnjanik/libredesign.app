/**
 * Swift Parser
 *
 * Parses Swift/SwiftUI source code to extract UI structure.
 * Uses pattern matching for common SwiftUI constructs.
 */

import type { RGBA } from '@core/types/color';
import type {
  SourceLocation,
  PropertyBindingType,
  SemanticAnchor,
} from '@core/types/code-source-metadata';
import { createSourceLocation, createPropertySource } from '@core/types/code-source-metadata';
import type {
  ParsedSwiftUIView,
  ParsedModifier,
  ParsedModifierArgument,
  ParsedPropertyValue,
  ParsedSwiftUIColor,
  ParsedSwiftUIFont,
  SwiftUIViewType,
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
 * Swift/SwiftUI code parser
 */
export class SwiftParser {
  private state!: ParserState;

  /**
   * Parse Swift source code
   */
  parse(source: string, filePath: string): ParsedSwiftUIView[] {
    this.state = {
      source,
      filePath,
      position: 0,
      line: 1,
      column: 1,
      scopeStack: [],
      siblingCounters: new Map(),
    };

    const views: ParsedSwiftUIView[] = [];

    // Find all struct definitions that conform to View
    const structMatches = source.matchAll(
      /struct\s+(\w+)\s*:\s*(?:\w+\s*,\s*)*View\b[^{]*\{/g
    );

    for (const match of structMatches) {
      const structName = match[1]!;
      const structStart = match.index!;

      // Find the body property
      const bodyMatch = this.findBodyProperty(source, structStart);
      if (bodyMatch) {
        this.state.scopeStack = [structName];
        this.state.siblingCounters.clear();
        const parsedViews = this.parseViewBody(bodyMatch.content, bodyMatch.start, structName);
        views.push(...parsedViews);
      }
    }

    return views;
  }

  /**
   * Find the body property of a View struct
   */
  private findBodyProperty(source: string, structStart: number): { content: string; start: number } | null {
    // Find "var body: some View {"
    const bodyPattern = /var\s+body\s*:\s*some\s+View\s*\{/g;
    bodyPattern.lastIndex = structStart;

    const match = bodyPattern.exec(source);
    if (!match) return null;

    const bodyStart = match.index + match[0].length;
    const bodyEnd = this.findMatchingBrace(source, bodyStart - 1);

    if (bodyEnd === -1) return null;

    return {
      content: source.slice(bodyStart, bodyEnd),
      start: bodyStart,
    };
  }

  /**
   * Find the matching closing brace
   */
  private findMatchingBrace(source: string, openBracePos: number): number {
    let depth = 1;
    let i = openBracePos + 1;
    let inString = false;
    let stringChar = '';

    while (i < source.length && depth > 0) {
      const char = source[i]!;
      const prevChar = source[i - 1];

      // Handle string literals
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
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
   * Parse the body of a SwiftUI view
   */
  private parseViewBody(content: string, offset: number, scope: string): ParsedSwiftUIView[] {
    const views: ParsedSwiftUIView[] = [];
    let pos = 0;

    while (pos < content.length) {
      // Skip whitespace and comments
      pos = this.skipWhitespaceAndComments(content, pos);
      if (pos >= content.length) break;

      // Try to parse a view
      const viewResult = this.tryParseView(content, pos, offset, scope);
      if (viewResult) {
        views.push(viewResult.view);
        pos = viewResult.end;
      } else {
        // Skip to next potential view
        pos++;
      }
    }

    return views;
  }

  /**
   * Try to parse a SwiftUI view at the current position
   */
  private tryParseView(
    content: string,
    pos: number,
    offset: number,
    scope: string
  ): { view: ParsedSwiftUIView; end: number } | null {
    // Match view name (e.g., VStack, Text, Button)
    const viewMatch = content.slice(pos).match(/^(\w+)\s*(?:\(([^)]*)\))?\s*(\{)?/);
    if (!viewMatch) return null;

    const viewType = viewMatch[1]!;

    // Check if this is a known SwiftUI view type
    if (!this.isKnownViewType(viewType)) {
      // Could be a custom view
      if (!/^[A-Z]/.test(viewType)) return null;
    }

    const hasArgs = viewMatch[2] !== undefined;
    const hasBody = viewMatch[3] === '{';
    const startPos = pos;
    let endPos = pos + viewMatch[0].length;

    // Parse constructor arguments
    const properties = new Map<string, ParsedPropertyValue>();
    if (hasArgs && viewMatch[2]) {
      this.parseConstructorArgs(viewMatch[2], offset + pos, properties);
    }

    // Parse children if has body
    let children: ParsedSwiftUIView[] = [];
    if (hasBody) {
      const bodyStart = endPos;
      const bodyEnd = this.findMatchingBrace(content, bodyStart - 1);
      if (bodyEnd !== -1) {
        const bodyContent = content.slice(bodyStart, bodyEnd);
        children = this.parseViewBody(bodyContent, offset + bodyStart, `${scope}.${viewType}`);
        endPos = bodyEnd + 1;
      }
    }

    // Parse modifiers
    const modifiersResult = this.parseModifiers(content, endPos, offset);
    const modifiers = modifiersResult.modifiers;
    endPos = modifiersResult.end;

    // Create source location
    const location = this.createLocation(offset + startPos, offset + endPos);

    // Create semantic anchor
    const siblingKey = `${scope}.${viewType}`;
    const siblingIndex = this.state.siblingCounters.get(siblingKey) ?? 0;
    this.state.siblingCounters.set(siblingKey, siblingIndex + 1);

    const anchor: SemanticAnchor = {
      viewType,
      containingScope: scope,
      siblingIndex,
      structureHash: this.computeStructureHash(viewType, children.length, modifiers.length),
    };

    const view: ParsedSwiftUIView = {
      viewType,
      location,
      modifiers,
      children,
      properties,
      isConditional: false,
      anchor,
    };

    return { view, end: endPos };
  }

  /**
   * Parse constructor arguments
   */
  private parseConstructorArgs(
    argsString: string,
    offset: number,
    properties: Map<string, ParsedPropertyValue>
  ): void {
    // Simple argument parsing for common patterns
    // "Hello, World" for Text
    const stringMatch = argsString.match(/^"([^"]*)"/);
    if (stringMatch) {
      properties.set('content', this.createPropertyValue(
        'string',
        stringMatch[1]!,
        stringMatch[0],
        offset,
        'literal'
      ));
      return;
    }

    // Named arguments: alignment: .center, spacing: 10
    const namedArgs = argsString.matchAll(/(\w+)\s*:\s*([^,]+)/g);
    for (const match of namedArgs) {
      const name = match[1]!;
      const valueStr = match[2]!.trim();
      const parsedValue = this.parseValueExpression(valueStr, offset);
      properties.set(name, parsedValue);
    }
  }

  /**
   * Parse modifiers chain
   */
  private parseModifiers(
    content: string,
    startPos: number,
    offset: number
  ): { modifiers: ParsedModifier[]; end: number } {
    const modifiers: ParsedModifier[] = [];
    let pos = startPos;

    while (pos < content.length) {
      // Skip whitespace
      pos = this.skipWhitespaceAndComments(content, pos);
      if (pos >= content.length) break;

      // Check for modifier (starts with .)
      if (content[pos] !== '.') break;

      // Match modifier name
      const nameMatch = content.slice(pos).match(/^\.(\w+)/);
      if (!nameMatch) break;

      const modifierName = nameMatch[1]!;
      const modifierStart = pos;
      pos += nameMatch[0].length;

      // Skip whitespace before potential arguments
      const wsStart = pos;
      while (pos < content.length && /\s/.test(content[pos]!)) pos++;

      // Check for arguments (opening paren)
      let argsString: string | undefined;
      if (content[pos] === '(') {
        // Find matching closing paren, handling nested parens
        const argsStart = pos;
        const argsEnd = this.findMatchingParen(content, pos);
        if (argsEnd !== -1) {
          argsString = content.slice(argsStart, argsEnd + 1);
          pos = argsEnd + 1;
        } else {
          // No matching paren, restore position
          pos = wsStart;
        }
      } else {
        // No args, restore whitespace position
        pos = wsStart;
      }

      // Parse modifier arguments
      const args: ParsedModifierArgument[] = [];
      if (argsString) {
        const argsContent = argsString.slice(1, -1).trim(); // Remove parens
        this.parseModifierArgs(argsContent, offset + modifierStart, args);
      }

      modifiers.push({
        name: modifierName,
        arguments: args,
        location: this.createLocation(offset + modifierStart, offset + pos),
      });
    }

    return { modifiers, end: pos };
  }

  /**
   * Find matching closing parenthesis, handling nested parens
   */
  private findMatchingParen(content: string, openPos: number): number {
    if (content[openPos] !== '(') return -1;

    let depth = 1;
    let pos = openPos + 1;
    let inString = false;
    let stringChar = '';

    while (pos < content.length && depth > 0) {
      const char = content[pos]!;

      // Handle string literals
      if ((char === '"' || char === "'") && content[pos - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '(') depth++;
        else if (char === ')') depth--;
      }

      pos++;
    }

    return depth === 0 ? pos - 1 : -1;
  }

  /**
   * Parse modifier arguments
   */
  private parseModifierArgs(
    argsString: string,
    offset: number,
    args: ParsedModifierArgument[]
  ): void {
    if (!argsString) return;

    // Handle different argument patterns
    // .frame(width: 100, height: 50)
    // .padding(16)
    // .foregroundColor(.red)
    // .font(.title)
    // .fill(Color(hex: "#333333"))

    // First, check if the entire argument is a single complex expression like Color(...)
    // This prevents Color(hex: "...") from being parsed as named args
    const trimmed = argsString.trim();
    if (trimmed.startsWith('Color(') || trimmed.startsWith('UIColor(') || trimmed.startsWith('#colorLiteral(')) {
      const parsedValue = this.parseValueExpression(trimmed, offset);
      args.push({
        value: parsedValue,
        location: this.createLocation(offset, offset + argsString.length),
      });
      return;
    }

    // Try named arguments first
    const namedPattern = /(\w+)\s*:\s*([^,]+)/g;
    let match;
    let hasNamed = false;

    while ((match = namedPattern.exec(argsString)) !== null) {
      hasNamed = true;
      const label = match[1]!;
      const valueStr = match[2]!.trim();
      const parsedValue = this.parseValueExpression(valueStr, offset);

      args.push({
        label,
        value: parsedValue,
        location: this.createLocation(offset, offset + argsString.length),
      });
    }

    // If no named args, treat as positional
    if (!hasNamed && argsString.trim()) {
      const parsedValue = this.parseValueExpression(argsString.trim(), offset);
      args.push({
        value: parsedValue,
        location: this.createLocation(offset, offset + argsString.length),
      });
    }
  }

  /**
   * Parse a value expression and determine its type and editability
   */
  private parseValueExpression(expr: string, offset: number): ParsedPropertyValue {
    const trimmed = expr.trim();

    // Number literal
    const numberMatch = trimmed.match(/^-?\d+(\.\d+)?$/);
    if (numberMatch) {
      return this.createPropertyValue('number', parseFloat(trimmed), trimmed, offset, 'literal');
    }

    // String literal
    const stringMatch = trimmed.match(/^"([^"]*)"$/);
    if (stringMatch) {
      return this.createPropertyValue('string', stringMatch[1]!, trimmed, offset, 'literal');
    }

    // Boolean
    if (trimmed === 'true' || trimmed === 'false') {
      return this.createPropertyValue('boolean', trimmed === 'true', trimmed, offset, 'literal');
    }

    // SwiftUI color
    const colorResult = this.parseSwiftUIColor(trimmed);
    if (colorResult) {
      return this.createPropertyValue(
        'color',
        colorResult.rgba ?? null,
        trimmed,
        offset,
        colorResult.isEditable ? 'literal' : 'computed'
      );
    }

    // SwiftUI font
    const fontResult = this.parseSwiftUIFont(trimmed);
    if (fontResult) {
      return this.createPropertyValue(
        'font',
        fontResult.size ?? null,
        trimmed,
        offset,
        fontResult.isEditable ? 'literal' : 'computed'
      );
    }

    // Enum value (starts with .)
    if (trimmed.startsWith('.')) {
      return this.createPropertyValue('enum', trimmed.slice(1), trimmed, offset, 'literal');
    }

    // CGFloat, Double conversion
    const cgFloatMatch = trimmed.match(/^(?:CGFloat|Double|Float)\((\d+(?:\.\d+)?)\)$/);
    if (cgFloatMatch) {
      return this.createPropertyValue('number', parseFloat(cgFloatMatch[1]!), trimmed, offset, 'literal');
    }

    // State binding ($something or something where something is @State)
    if (trimmed.startsWith('$')) {
      return this.createPropertyValue('expression', null, trimmed, offset, 'binding');
    }

    // Function call or computed
    if (trimmed.includes('(') || trimmed.includes('.')) {
      // Check for simple property access that might be state
      const bindingType = this.inferBindingType(trimmed);
      return this.createPropertyValue('expression', null, trimmed, offset, bindingType);
    }

    // Variable reference
    return this.createPropertyValue('expression', null, trimmed, offset, 'unknown');
  }

  /**
   * Parse SwiftUI color expression
   */
  private parseSwiftUIColor(expr: string): ParsedSwiftUIColor | null {
    // Color.red, Color.blue, etc. or just .red, .blue
    const namedMatch = expr.match(/^(?:Color)?\.?(\w+)$/);
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

    // Color(.red), Color(.blue) - alternate syntax
    const colorDotMatch = expr.match(/^Color\s*\(\s*\.(\w+)\s*\)$/);
    if (colorDotMatch) {
      const colorName = colorDotMatch[1]!.toLowerCase();
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

    // Color(red: r, green: g, blue: b, opacity: a)
    const rgbMatch = expr.match(/Color\s*\(\s*red:\s*([\d.]+)\s*,\s*green:\s*([\d.]+)\s*,\s*blue:\s*([\d.]+)(?:\s*,\s*opacity:\s*([\d.]+))?\s*\)/);
    if (rgbMatch) {
      return {
        type: 'rgb',
        rgba: {
          r: parseFloat(rgbMatch[1]!),
          g: parseFloat(rgbMatch[2]!),
          b: parseFloat(rgbMatch[3]!),
          a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
        },
        expression: expr,
        isEditable: true,
      };
    }

    // Color(white: w, opacity: a) - grayscale
    const whiteMatch = expr.match(/Color\s*\(\s*white:\s*([\d.]+)(?:\s*,\s*opacity:\s*([\d.]+))?\s*\)/);
    if (whiteMatch) {
      const w = parseFloat(whiteMatch[1]!);
      return {
        type: 'rgb',
        rgba: {
          r: w,
          g: w,
          b: w,
          a: whiteMatch[2] ? parseFloat(whiteMatch[2]) : 1,
        },
        expression: expr,
        isEditable: true,
      };
    }

    // Color(hue: h, saturation: s, brightness: b, opacity: a) - HSB
    const hsbMatch = expr.match(/Color\s*\(\s*hue:\s*([\d.]+)\s*,\s*saturation:\s*([\d.]+)\s*,\s*brightness:\s*([\d.]+)(?:\s*,\s*opacity:\s*([\d.]+))?\s*\)/);
    if (hsbMatch) {
      const h = parseFloat(hsbMatch[1]!);
      const s = parseFloat(hsbMatch[2]!);
      const b = parseFloat(hsbMatch[3]!);
      const a = hsbMatch[4] ? parseFloat(hsbMatch[4]) : 1;
      const rgb = this.hsbToRgb(h, s, b);
      return {
        type: 'hsb',
        rgba: { ...rgb, a },
        expression: expr,
        isEditable: true,
      };
    }

    // Color(hex: 0xFFFFFF) or Color(hex: "FFFFFF") - common extension
    const hexMatch = expr.match(/Color\s*\(\s*hex:\s*(?:0x|"#?)?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})"?\s*\)/);
    if (hexMatch) {
      const hex = hexMatch[1]!;
      const rgba = this.hexToRgba(hex);
      return {
        type: 'hex',
        rgba,
        expression: expr,
        isEditable: true,
      };
    }

    // #colorLiteral(red: r, green: g, blue: b, alpha: a) - Xcode color picker
    const literalMatch = expr.match(/#colorLiteral\s*\(\s*red:\s*([\d.]+)\s*,\s*green:\s*([\d.]+)\s*,\s*blue:\s*([\d.]+)\s*,\s*alpha:\s*([\d.]+)\s*\)/);
    if (literalMatch) {
      return {
        type: 'rgb',
        rgba: {
          r: parseFloat(literalMatch[1]!),
          g: parseFloat(literalMatch[2]!),
          b: parseFloat(literalMatch[3]!),
          a: parseFloat(literalMatch[4]!),
        },
        expression: expr,
        isEditable: true,
      };
    }

    // UIColor references - Color(uiColor: .systemRed) or Color(UIColor.systemRed)
    const uiColorMatch = expr.match(/Color\s*\(\s*(?:uiColor:\s*)?(?:UIColor)?\.?(\w+)\s*\)/);
    if (uiColorMatch) {
      const colorName = uiColorMatch[1]!.toLowerCase().replace('system', '');
      const rgba = this.namedColorToRGBA(colorName);
      if (rgba) {
        return {
          type: 'named',
          rgba,
          expression: expr,
          isEditable: false, // UIColor refs might be theme-dependent
        };
      }
    }

    // Color("AssetName")
    const assetMatch = expr.match(/Color\s*\(\s*"([^"]+)"\s*\)/);
    if (assetMatch) {
      return {
        type: 'asset',
        expression: expr,
        assetName: assetMatch[1]!,
        isEditable: false,
      };
    }

    // .primary, .secondary (semantic colors) - provide fallback RGBA for rendering
    const semanticColorDefaults: Record<string, RGBA> = {
      '.primary': { r: 0, g: 0, b: 0, a: 1 },           // Black (light mode default)
      '.secondary': { r: 0.55, g: 0.55, b: 0.58, a: 1 }, // Gray (light mode default)
      '.accentColor': { r: 0, g: 0.478, b: 1, a: 1 },   // iOS blue accent
      'primary': { r: 0, g: 0, b: 0, a: 1 },
      'secondary': { r: 0.55, g: 0.55, b: 0.58, a: 1 },
      'accentColor': { r: 0, g: 0.478, b: 1, a: 1 },
    };
    if (semanticColorDefaults[expr]) {
      return {
        type: 'semantic',
        rgba: semanticColorDefaults[expr],
        expression: expr,
        isEditable: false,
      };
    }

    return null;
  }

  /**
   * Convert HSB to RGB
   */
  private hsbToRgb(h: number, s: number, b: number): { r: number; g: number; b: number } {
    const c = b * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = b - c;

    let r = 0, g = 0, bb = 0;
    const hh = h * 6;

    if (hh < 1) { r = c; g = x; bb = 0; }
    else if (hh < 2) { r = x; g = c; bb = 0; }
    else if (hh < 3) { r = 0; g = c; bb = x; }
    else if (hh < 4) { r = 0; g = x; bb = c; }
    else if (hh < 5) { r = x; g = 0; bb = c; }
    else { r = c; g = 0; bb = x; }

    return { r: r + m, g: g + m, b: bb + m };
  }

  /**
   * Convert hex string to RGBA
   */
  private hexToRgba(hex: string): RGBA {
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  /**
   * Parse SwiftUI font expression
   */
  private parseSwiftUIFont(expr: string): ParsedSwiftUIFont | null {
    // .title, .body, .caption, etc.
    const semanticMatch = expr.match(/^\.?(title|title2|title3|headline|subheadline|body|callout|caption|caption2|footnote|largeTitle)$/);
    if (semanticMatch) {
      const semanticSizes: Record<string, number> = {
        largeTitle: 34,
        title: 28,
        title2: 22,
        title3: 20,
        headline: 17,
        body: 17,
        callout: 16,
        subheadline: 15,
        footnote: 13,
        caption: 12,
        caption2: 11,
      };
      const fontName = semanticMatch[1]!;
      const size = semanticSizes[fontName];
      if (size !== undefined) {
        return {
          type: 'semantic',
          size,
          expression: expr,
          isEditable: false,
        };
      }
    }

    // .system(size: 16, weight: .bold)
    const systemMatch = expr.match(/\.?system\s*\(\s*size:\s*(\d+(?:\.\d+)?)/);
    if (systemMatch) {
      return {
        type: 'system',
        size: parseFloat(systemMatch[1]!),
        expression: expr,
        isEditable: true,
      };
    }

    // .custom("FontName", size: 16)
    const customMatch = expr.match(/\.?custom\s*\(\s*"([^"]+)"\s*,\s*size:\s*(\d+(?:\.\d+)?)\s*\)/);
    if (customMatch) {
      return {
        type: 'custom',
        family: customMatch[1]!,
        size: parseFloat(customMatch[2]!),
        expression: expr,
        isEditable: true,
      };
    }

    return null;
  }

  /**
   * Convert named color to RGBA
   */
  private namedColorToRGBA(name: string): RGBA | null {
    const colors: Record<string, RGBA> = {
      red: { r: 1, g: 0.231, b: 0.188, a: 1 },
      orange: { r: 1, g: 0.584, b: 0, a: 1 },
      yellow: { r: 1, g: 0.8, b: 0, a: 1 },
      green: { r: 0.204, g: 0.78, b: 0.349, a: 1 },
      mint: { r: 0, g: 0.78, b: 0.745, a: 1 },
      teal: { r: 0.188, g: 0.69, b: 0.78, a: 1 },
      cyan: { r: 0.196, g: 0.678, b: 0.902, a: 1 },
      blue: { r: 0, g: 0.478, b: 1, a: 1 },
      indigo: { r: 0.345, g: 0.337, b: 0.839, a: 1 },
      purple: { r: 0.686, g: 0.322, b: 0.871, a: 1 },
      pink: { r: 1, g: 0.176, b: 0.333, a: 1 },
      brown: { r: 0.635, g: 0.518, b: 0.369, a: 1 },
      white: { r: 1, g: 1, b: 1, a: 1 },
      gray: { r: 0.557, g: 0.557, b: 0.576, a: 1 },
      black: { r: 0, g: 0, b: 0, a: 1 },
      clear: { r: 0, g: 0, b: 0, a: 0 },
    };
    return colors[name] ?? null;
  }

  /**
   * Infer binding type from expression
   */
  private inferBindingType(expr: string): PropertyBindingType {
    if (expr.startsWith('$')) return 'binding';
    if (expr.includes('ViewModel') || expr.includes('viewModel')) return 'state';
    if (expr.includes('?') && expr.includes(':')) return 'conditional';
    if (expr.includes('()')) return 'function';
    if (expr.includes('geometry.size')) return 'computed';
    return 'unknown';
  }

  /**
   * Create a property value
   */
  private createPropertyValue(
    type: ParsedPropertyValue['type'],
    value: ParsedPropertyValue['value'],
    rawExpression: string,
    offset: number,
    bindingType: PropertyBindingType
  ): ParsedPropertyValue {
    const location = this.createLocation(offset, offset + rawExpression.length);
    return {
      type,
      value,
      rawExpression,
      source: createPropertySource(location, bindingType, rawExpression),
    };
  }

  /**
   * Check if a name is a known SwiftUI view type
   */
  private isKnownViewType(name: string): boolean {
    const knownViews: SwiftUIViewType[] = [
      'VStack', 'HStack', 'ZStack', 'LazyVStack', 'LazyHStack',
      'ScrollView', 'List', 'Form', 'Group', 'Section',
      'NavigationStack', 'NavigationView', 'TabView',
      'Text', 'Image', 'Rectangle', 'RoundedRectangle',
      'Circle', 'Ellipse', 'Capsule', 'Path',
      'Button', 'Toggle', 'Slider', 'TextField', 'TextEditor',
      'Picker', 'DatePicker', 'Stepper', 'Link',
      'Spacer', 'Divider', 'Color', 'GeometryReader',
      'ForEach', 'EmptyView', 'AnyView',
    ];
    return knownViews.includes(name as SwiftUIViewType);
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
   * Create source location from offsets
   */
  private createLocation(startOffset: number, endOffset: number): SourceLocation {
    // Calculate line/column from offset
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
   * Compute a hash of the view structure
   */
  private computeStructureHash(viewType: string, childCount: number, modifierCount: number): string {
    const data = `${viewType}:${childCount}:${modifierCount}`;
    // Simple hash for now
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
 * Create a Swift parser instance
 */
export function createSwiftParser(): SwiftParser {
  return new SwiftParser();
}
