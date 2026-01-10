/**
 * KiCad S-Expression Parser
 *
 * Parses KiCad .kicad_pcb files into structured data.
 * KiCad uses Lisp-like S-expressions for its file format.
 */

import type {
  SExpr,
  ParsedSExpr,
  KiCadPCB,
  KiCadLayer,
  KiCadNet,
  KiCadNetClass,
  KiCadFootprint,
  KiCadSegment,
  KiCadArc,
  KiCadVia,
  KiCadZone,
  KiCadGraphic,
  KiCadPad,
  KiCadFpGraphic,
  KiCadFpText,
  KiCadPoint,
  KiCadPosition,
  KiCadSize,
  KiCadStroke,
} from './kicad-types';

// =============================================================================
// S-Expression Tokenizer
// =============================================================================

/**
 * Token types
 */
type TokenType = 'lparen' | 'rparen' | 'string' | 'atom';

interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

/**
 * Tokenize S-expression input
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  while (i < input.length) {
    const char = input[i]!;

    // Skip whitespace
    if (/\s/.test(char)) {
      if (char === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
      continue;
    }

    // Left paren
    if (char === '(') {
      tokens.push({ type: 'lparen', value: '(', line, col });
      i++;
      col++;
      continue;
    }

    // Right paren
    if (char === ')') {
      tokens.push({ type: 'rparen', value: ')', line, col });
      i++;
      col++;
      continue;
    }

    // Quoted string
    if (char === '"') {
      let str = '';
      const startCol = col;
      i++;
      col++;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) {
          i++;
          col++;
          const escaped = input[i]!;
          if (escaped === 'n') str += '\n';
          else if (escaped === 't') str += '\t';
          else if (escaped === 'r') str += '\r';
          else str += escaped;
        } else {
          str += input[i];
        }
        if (input[i] === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
        i++;
      }
      tokens.push({ type: 'string', value: str, line, col: startCol });
      i++; // Skip closing quote
      col++;
      continue;
    }

    // Atom (symbol, number, etc.)
    let atom = '';
    const startCol = col;
    while (i < input.length && !/[\s()]/.test(input[i]!)) {
      atom += input[i];
      i++;
      col++;
    }
    if (atom) {
      tokens.push({ type: 'atom', value: atom, line, col: startCol });
    }
  }

  return tokens;
}

// =============================================================================
// S-Expression Parser
// =============================================================================

/**
 * Parse tokens into S-expression tree
 */
function parseSExpr(tokens: Token[]): SExpr {
  let pos = 0;

  function parse(): SExpr {
    if (pos >= tokens.length) {
      throw new Error('Unexpected end of input');
    }

    const token = tokens[pos]!;

    if (token.type === 'lparen') {
      pos++; // Skip (
      const list: SExpr[] = [];
      while (pos < tokens.length && tokens[pos]!.type !== 'rparen') {
        list.push(parse());
      }
      if (pos >= tokens.length) {
        throw new Error('Missing closing parenthesis');
      }
      pos++; // Skip )
      return list;
    }

    if (token.type === 'string' || token.type === 'atom') {
      pos++;
      return token.value;
    }

    throw new Error(`Unexpected token: ${token.type} at line ${token.line}`);
  }

  return parse();
}

/**
 * Convert raw S-expression to ParsedSExpr for easier access
 */
function toParsedSExpr(sexpr: SExpr): ParsedSExpr {
  if (typeof sexpr === 'string') {
    return { name: sexpr, values: [], children: [], raw: sexpr };
  }

  const [name, ...rest] = sexpr;
  const values: string[] = [];
  const children: ParsedSExpr[] = [];

  for (const item of rest) {
    if (typeof item === 'string') {
      values.push(item);
    } else {
      children.push(toParsedSExpr(item));
    }
  }

  return {
    name: typeof name === 'string' ? name : '',
    values,
    children,
    raw: sexpr,
  };
}

// =============================================================================
// KiCad PCB Parser
// =============================================================================

/**
 * KiCad PCB file parser
 */
export class KiCadParser {
  private parsed: ParsedSExpr | null = null;

  /**
   * Parse a KiCad PCB file
   */
  parse(content: string): KiCadPCB {
    const tokens = tokenize(content);
    const sexpr = parseSExpr(tokens);
    this.parsed = toParsedSExpr(sexpr);

    if (this.parsed.name !== 'kicad_pcb') {
      throw new Error('Invalid KiCad PCB file: missing kicad_pcb root');
    }

    return this.buildPCB(this.parsed);
  }

  /**
   * Build KiCadPCB from parsed S-expression
   */
  private buildPCB(root: ParsedSExpr): KiCadPCB {
    // Start with required fields
    let version = 0;
    let generator = '';
    let generatorVersion: string | undefined;
    let general: KiCadPCB['general'] | undefined;
    let paper: string | undefined;
    let titleBlock: KiCadPCB['titleBlock'] | undefined;
    let setup: KiCadPCB['setup'] | undefined;
    const layers: KiCadLayer[] = [];
    const nets: KiCadNet[] = [];
    const netClasses: KiCadNetClass[] = [];
    const footprints: KiCadFootprint[] = [];
    const segments: KiCadSegment[] = [];
    const arcs: KiCadArc[] = [];
    const vias: KiCadVia[] = [];
    const zones: KiCadZone[] = [];
    const graphics: KiCadGraphic[] = [];

    for (const child of root.children) {
      switch (child.name) {
        case 'version':
          version = parseInt(child.values[0] ?? '0', 10);
          break;
        case 'generator':
          generator = child.values[0] ?? '';
          break;
        case 'generator_version':
          if (child.values[0]) generatorVersion = child.values[0];
          break;
        case 'general':
          general = this.parseGeneral(child);
          break;
        case 'paper':
          if (child.values[0]) paper = child.values[0];
          break;
        case 'title_block':
          titleBlock = this.parseTitleBlock(child);
          break;
        case 'layers':
          layers.push(...this.parseLayers(child));
          break;
        case 'setup':
          setup = this.parseSetup(child);
          break;
        case 'net':
          nets.push(this.parseNet(child));
          break;
        case 'net_class':
          netClasses.push(this.parseNetClass(child));
          break;
        case 'footprint':
        case 'module': // Legacy name
          footprints.push(this.parseFootprint(child));
          break;
        case 'segment':
          segments.push(this.parseSegment(child));
          break;
        case 'arc':
          arcs.push(this.parseArcSegment(child));
          break;
        case 'via':
          vias.push(this.parseVia(child));
          break;
        case 'zone':
          zones.push(this.parseZone(child));
          break;
        case 'gr_line':
        case 'gr_arc':
        case 'gr_circle':
        case 'gr_rect':
        case 'gr_poly':
        case 'gr_text':
          graphics.push(this.parseGraphic(child));
          break;
      }
    }

    // Build PCB object with only defined optional properties
    return {
      version,
      generator,
      ...(generatorVersion && { generatorVersion }),
      ...(general && { general }),
      ...(paper && { paper }),
      ...(titleBlock && { titleBlock }),
      layers,
      ...(setup && { setup }),
      nets,
      netClasses,
      footprints,
      segments,
      arcs,
      vias,
      zones,
      graphics,
    };
  }

  // ===========================================================================
  // General Parsing
  // ===========================================================================

  private parseGeneral(node: ParsedSExpr): KiCadPCB['general'] {
    const general: NonNullable<KiCadPCB['general']> = {};

    for (const child of node.children) {
      switch (child.name) {
        case 'thickness':
          general.thickness = parseFloat(child.values[0] ?? '0');
          break;
        case 'drawings':
          general.drawingsCount = parseInt(child.values[0] ?? '0', 10);
          break;
        case 'tracks':
          general.tracksCount = parseInt(child.values[0] ?? '0', 10);
          break;
        case 'zones':
          general.zonesCount = parseInt(child.values[0] ?? '0', 10);
          break;
        case 'modules':
          general.modulesCount = parseInt(child.values[0] ?? '0', 10);
          break;
        case 'nets':
          general.netsCount = parseInt(child.values[0] ?? '0', 10);
          break;
      }
    }

    return general;
  }

  private parseTitleBlock(node: ParsedSExpr): NonNullable<KiCadPCB['titleBlock']> {
    let title: string | undefined;
    let date: string | undefined;
    let rev: string | undefined;
    let company: string | undefined;
    const comments: string[] = [];

    for (const child of node.children) {
      switch (child.name) {
        case 'title':
          if (child.values[0]) title = child.values[0];
          break;
        case 'date':
          if (child.values[0]) date = child.values[0];
          break;
        case 'rev':
          if (child.values[0]) rev = child.values[0];
          break;
        case 'company':
          if (child.values[0]) company = child.values[0];
          break;
        case 'comment':
          comments.push(child.values[1] ?? child.values[0] ?? '');
          break;
      }
    }

    return {
      ...(title && { title }),
      ...(date && { date }),
      ...(rev && { rev }),
      ...(company && { company }),
      ...(comments.length > 0 && { comment: comments }),
    };
  }

  // ===========================================================================
  // Layer Parsing
  // ===========================================================================

  private parseLayers(node: ParsedSExpr): KiCadLayer[] {
    const layers: KiCadLayer[] = [];

    for (const child of node.children) {
      // Layer format: (0 "F.Cu" signal)
      const ordinal = parseInt(child.name, 10);
      if (!isNaN(ordinal)) {
        const userName = child.values[2];
        layers.push({
          ordinal,
          name: child.values[0] ?? '',
          type: (child.values[1] as KiCadLayer['type']) ?? 'signal',
          ...(userName && { userName }),
        });
      }
    }

    return layers;
  }

  // ===========================================================================
  // Setup Parsing
  // ===========================================================================

  private parseSetup(node: ParsedSExpr): KiCadPCB['setup'] {
    const setup: NonNullable<KiCadPCB['setup']> = {};

    for (const child of node.children) {
      switch (child.name) {
        case 'stackup_layers':
          setup.stackupLayers = parseInt(child.values[0] ?? '0', 10);
          break;
        case 'pad_to_mask_clearance':
          setup.padToMaskClearance = parseFloat(child.values[0] ?? '0');
          break;
        case 'solder_mask_min_width':
          setup.solderMaskMinWidth = parseFloat(child.values[0] ?? '0');
          break;
        case 'pad_to_paste_clearance':
          setup.padToPasteClearance = parseFloat(child.values[0] ?? '0');
          break;
        case 'aux_axis_origin':
          setup.auxAxisOrigin = this.parsePoint(child);
          break;
        case 'grid_origin':
          setup.gridOrigin = this.parsePoint(child);
          break;
      }
    }

    return setup;
  }

  // ===========================================================================
  // Net Parsing
  // ===========================================================================

  private parseNet(node: ParsedSExpr): KiCadNet {
    return {
      id: parseInt(node.values[0] ?? '0', 10),
      name: node.values[1] ?? '',
    };
  }

  private parseNetClass(node: ParsedSExpr): KiCadNetClass {
    const netClass: KiCadNetClass = {
      name: node.values[0] ?? 'Default',
      clearance: 0,
      traceWidth: 0,
      viaDiameter: 0,
      viaDrill: 0,
      nets: [],
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'clearance':
          netClass.clearance = parseFloat(child.values[0] ?? '0');
          break;
        case 'trace_width':
          netClass.traceWidth = parseFloat(child.values[0] ?? '0');
          break;
        case 'via_dia':
          netClass.viaDiameter = parseFloat(child.values[0] ?? '0');
          break;
        case 'via_drill':
          netClass.viaDrill = parseFloat(child.values[0] ?? '0');
          break;
        case 'uvia_dia':
          netClass.microViaDiameter = parseFloat(child.values[0] ?? '0');
          break;
        case 'uvia_drill':
          netClass.microViaDrill = parseFloat(child.values[0] ?? '0');
          break;
        case 'add_net':
          netClass.nets.push(child.values[0] ?? '');
          break;
      }
    }

    if (node.values[1]) {
      netClass.description = node.values[1];
    }

    return netClass;
  }

  // ===========================================================================
  // Footprint Parsing
  // ===========================================================================

  private parseFootprint(node: ParsedSExpr): KiCadFootprint {
    const nameParts = (node.values[0] ?? '').split(':');
    const name = nameParts.length > 1 ? nameParts[1]! : nameParts[0]!;
    const library = nameParts.length > 1 ? nameParts[0] : undefined;

    let layer: 'F.Cu' | 'B.Cu' = 'F.Cu';
    let at: KiCadPosition = { x: 0, y: 0 };
    let descr: string | undefined;
    let tags: string[] | undefined;
    let path: string | undefined;
    let attr: KiCadFootprint['attr'] | undefined;
    let locked: boolean | undefined;
    let placed: boolean | undefined;
    let tstamp: string | undefined;
    let model: KiCadFootprint['model'] | undefined;
    const pads: KiCadPad[] = [];
    const graphics: KiCadFpGraphic[] = [];

    for (const child of node.children) {
      switch (child.name) {
        case 'layer':
          layer = child.values[0] as 'F.Cu' | 'B.Cu';
          break;
        case 'at':
          at = this.parsePosition(child);
          break;
        case 'descr':
          if (child.values[0]) descr = child.values[0];
          break;
        case 'tags':
          if (child.values[0]) tags = child.values[0].split(/\s+/);
          break;
        case 'path':
          if (child.values[0]) path = child.values[0];
          break;
        case 'attr':
          if (child.values.length > 0) attr = child.values as NonNullable<KiCadFootprint['attr']>;
          break;
        case 'locked':
          locked = true;
          break;
        case 'placed':
          placed = true;
          break;
        case 'tstamp':
          if (child.values[0]) tstamp = child.values[0];
          break;
        case 'pad':
          pads.push(this.parsePad(child));
          break;
        case 'fp_line':
        case 'fp_arc':
        case 'fp_circle':
        case 'fp_rect':
        case 'fp_poly':
        case 'fp_text':
          graphics.push(this.parseFpGraphic(child));
          break;
        case 'model':
          model = this.parseModel3D(child);
          break;
      }
    }

    return {
      name,
      ...(library && { library }),
      layer,
      at,
      ...(descr && { descr }),
      ...(tags && { tags }),
      ...(path && { path }),
      ...(attr && { attr }),
      pads,
      graphics,
      ...(model && { model }),
      ...(locked && { locked }),
      ...(placed && { placed }),
      ...(tstamp && { tstamp }),
    };
  }

  private parsePad(node: ParsedSExpr): KiCadPad {
    const number = node.values[0] ?? '';
    const padType = (node.values[1] as KiCadPad['padType']) ?? 'thru_hole';
    const shape = (node.values[2] as KiCadPad['shape']) ?? 'circle';

    let at: KiCadPosition = { x: 0, y: 0 };
    let size: KiCadSize = { width: 0, height: 0 };
    let layers: string[] = [];
    let drill: KiCadPad['drill'] | undefined;
    let roundrectRatio: number | undefined;
    let net: KiCadPad['net'] | undefined;
    let pinFunction: string | undefined;
    let pinType: string | undefined;
    let diePad: boolean | undefined;
    let solderMaskMargin: number | undefined;
    let solderPasteMargin: number | undefined;
    let solderPasteRatio: number | undefined;
    let clearance: number | undefined;
    let thermalBridgeWidth: number | undefined;
    let thermalGap: number | undefined;
    let tstamp: string | undefined;

    for (const child of node.children) {
      switch (child.name) {
        case 'at':
          at = this.parsePosition(child);
          break;
        case 'size':
          size = this.parseSize(child);
          break;
        case 'drill':
          drill = this.parseDrill(child);
          break;
        case 'layers':
          layers = child.values;
          break;
        case 'roundrect_rratio':
          roundrectRatio = parseFloat(child.values[0] ?? '0');
          break;
        case 'net':
          net = {
            id: parseInt(child.values[0] ?? '0', 10),
            name: child.values[1] ?? '',
          };
          break;
        case 'pinfunction':
          if (child.values[0]) pinFunction = child.values[0];
          break;
        case 'pintype':
          if (child.values[0]) pinType = child.values[0];
          break;
        case 'die_pad':
          diePad = true;
          break;
        case 'solder_mask_margin':
          solderMaskMargin = parseFloat(child.values[0] ?? '0');
          break;
        case 'solder_paste_margin':
          solderPasteMargin = parseFloat(child.values[0] ?? '0');
          break;
        case 'solder_paste_margin_ratio':
          solderPasteRatio = parseFloat(child.values[0] ?? '0');
          break;
        case 'clearance':
          clearance = parseFloat(child.values[0] ?? '0');
          break;
        case 'thermal_bridge_width':
          thermalBridgeWidth = parseFloat(child.values[0] ?? '0');
          break;
        case 'thermal_gap':
          thermalGap = parseFloat(child.values[0] ?? '0');
          break;
        case 'tstamp':
          if (child.values[0]) tstamp = child.values[0];
          break;
      }
    }

    return {
      number,
      padType,
      shape,
      at,
      size,
      layers,
      ...(drill && { drill }),
      ...(roundrectRatio !== undefined && { roundrectRatio }),
      ...(net && { net }),
      ...(pinFunction && { pinFunction }),
      ...(pinType && { pinType }),
      ...(diePad && { diePad }),
      ...(solderMaskMargin !== undefined && { solderMaskMargin }),
      ...(solderPasteMargin !== undefined && { solderPasteMargin }),
      ...(solderPasteRatio !== undefined && { solderPasteRatio }),
      ...(clearance !== undefined && { clearance }),
      ...(thermalBridgeWidth !== undefined && { thermalBridgeWidth }),
      ...(thermalGap !== undefined && { thermalGap }),
      ...(tstamp && { tstamp }),
    };
  }

  private parseDrill(node: ParsedSExpr): KiCadPad['drill'] | undefined {
    if (node.values.length === 0) return undefined;

    const drill: NonNullable<KiCadPad['drill']> = {
      diameter: parseFloat(node.values[0] ?? '0'),
    };

    // Check for oval drill
    if (node.values[0] === 'oval' && node.values.length >= 3) {
      drill.diameter = parseFloat(node.values[1] ?? '0');
      drill.width = parseFloat(node.values[1] ?? '0');
      drill.height = parseFloat(node.values[2] ?? '0');
    }

    // Check for offset
    const offsetChild = node.children.find((c) => c.name === 'offset');
    if (offsetChild) {
      drill.offset = this.parsePoint(offsetChild);
    }

    return drill;
  }

  private parseModel3D(node: ParsedSExpr): KiCadFootprint['model'] {
    const model: NonNullable<KiCadFootprint['model']> = {
      path: node.values[0] ?? '',
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'offset':
          model.offset = this.parseXYZ(child);
          break;
        case 'scale':
          model.scale = this.parseXYZ(child);
          break;
        case 'rotate':
          model.rotate = this.parseXYZ(child);
          break;
        case 'hide':
          model.hide = true;
          break;
      }
    }

    return model;
  }

  // ===========================================================================
  // Segment/Track Parsing
  // ===========================================================================

  private parseSegment(node: ParsedSExpr): KiCadSegment {
    let start: KiCadPoint = { x: 0, y: 0 };
    let end: KiCadPoint = { x: 0, y: 0 };
    let width = 0;
    let layer = '';
    let net = 0;
    let locked: boolean | undefined;
    let tstamp: string | undefined;

    for (const child of node.children) {
      switch (child.name) {
        case 'start':
          start = this.parsePoint(child);
          break;
        case 'end':
          end = this.parsePoint(child);
          break;
        case 'width':
          width = parseFloat(child.values[0] ?? '0');
          break;
        case 'layer':
          layer = child.values[0] ?? '';
          break;
        case 'net':
          net = parseInt(child.values[0] ?? '0', 10);
          break;
        case 'locked':
          locked = true;
          break;
        case 'tstamp':
          if (child.values[0]) tstamp = child.values[0];
          break;
      }
    }

    return {
      type: 'segment',
      start,
      end,
      width,
      layer,
      net,
      ...(locked && { locked }),
      ...(tstamp && { tstamp }),
    };
  }

  private parseArcSegment(node: ParsedSExpr): KiCadArc {
    let start: KiCadPoint = { x: 0, y: 0 };
    let mid: KiCadPoint = { x: 0, y: 0 };
    let end: KiCadPoint = { x: 0, y: 0 };
    let width = 0;
    let layer = '';
    let net = 0;
    let locked: boolean | undefined;
    let tstamp: string | undefined;

    for (const child of node.children) {
      switch (child.name) {
        case 'start':
          start = this.parsePoint(child);
          break;
        case 'mid':
          mid = this.parsePoint(child);
          break;
        case 'end':
          end = this.parsePoint(child);
          break;
        case 'width':
          width = parseFloat(child.values[0] ?? '0');
          break;
        case 'layer':
          layer = child.values[0] ?? '';
          break;
        case 'net':
          net = parseInt(child.values[0] ?? '0', 10);
          break;
        case 'locked':
          locked = true;
          break;
        case 'tstamp':
          if (child.values[0]) tstamp = child.values[0];
          break;
      }
    }

    return {
      type: 'arc',
      start,
      mid,
      end,
      width,
      layer,
      net,
      ...(locked && { locked }),
      ...(tstamp && { tstamp }),
    };
  }

  // ===========================================================================
  // Via Parsing
  // ===========================================================================

  private parseVia(node: ParsedSExpr): KiCadVia {
    let at: KiCadPoint = { x: 0, y: 0 };
    let size = 0;
    let drill = 0;
    let layers: [string, string] = ['F.Cu', 'B.Cu'];
    let net = 0;
    let viaType: KiCadVia['viaType'] | undefined;
    let locked: boolean | undefined;
    let free: boolean | undefined;
    let tstamp: string | undefined;

    for (const child of node.children) {
      switch (child.name) {
        case 'at':
          at = this.parsePoint(child);
          break;
        case 'size':
          size = parseFloat(child.values[0] ?? '0');
          break;
        case 'drill':
          drill = parseFloat(child.values[0] ?? '0');
          break;
        case 'layers':
          layers = [child.values[0] ?? 'F.Cu', child.values[1] ?? 'B.Cu'];
          break;
        case 'net':
          net = parseInt(child.values[0] ?? '0', 10);
          break;
        case 'locked':
          locked = true;
          break;
        case 'free':
          free = true;
          break;
        case 'tstamp':
          if (child.values[0]) tstamp = child.values[0];
          break;
        case 'blind':
          viaType = 'blind';
          break;
        case 'micro':
          viaType = 'micro';
          break;
      }
    }

    return {
      type: 'via',
      at,
      size,
      drill,
      layers,
      net,
      ...(viaType && { viaType }),
      ...(locked && { locked }),
      ...(free && { free }),
      ...(tstamp && { tstamp }),
    };
  }

  // ===========================================================================
  // Zone Parsing
  // ===========================================================================

  private parseZone(node: ParsedSExpr): KiCadZone {
    let net = 0;
    let netName = '';
    let polygon: KiCadPoint[] = [];
    let layer: string | undefined;
    let layers: string[] | undefined;
    let name: string | undefined;
    let priority: number | undefined;
    let locked: boolean | undefined;
    let tstamp: string | undefined;
    let minThickness: number | undefined;
    let connectPads: KiCadZone['connectPads'] | undefined;
    let fill: KiCadZone['fill'] | undefined;
    let keepout: KiCadZone['keepout'] | undefined;
    const filledPolygons: KiCadPoint[][] = [];

    for (const child of node.children) {
      switch (child.name) {
        case 'net':
          net = parseInt(child.values[0] ?? '0', 10);
          break;
        case 'net_name':
          netName = child.values[0] ?? '';
          break;
        case 'layer':
          if (child.values[0]) layer = child.values[0];
          break;
        case 'layers':
          if (child.values.length > 0) layers = child.values;
          break;
        case 'name':
          if (child.values[0]) name = child.values[0];
          break;
        case 'priority':
          priority = parseInt(child.values[0] ?? '0', 10);
          break;
        case 'locked':
          locked = true;
          break;
        case 'tstamp':
          if (child.values[0]) tstamp = child.values[0];
          break;
        case 'min_thickness':
          minThickness = parseFloat(child.values[0] ?? '0');
          break;
        case 'connect_pads':
          if (child.values[0]) connectPads = child.values[0] as NonNullable<KiCadZone['connectPads']>;
          break;
        case 'polygon':
          polygon = this.parsePolygonPoints(child);
          break;
        case 'filled_polygon':
          filledPolygons.push(this.parsePolygonPoints(child));
          break;
        case 'fill':
          fill = this.parseZoneFill(child);
          break;
        case 'keepout':
          keepout = this.parseZoneKeepout(child);
          break;
      }
    }

    return {
      net,
      netName,
      polygon,
      ...(layer && { layer }),
      ...(layers && { layers }),
      ...(name && { name }),
      ...(priority !== undefined && { priority }),
      ...(locked && { locked }),
      ...(tstamp && { tstamp }),
      ...(minThickness !== undefined && { minThickness }),
      ...(connectPads && { connectPads }),
      ...(fill && { fill }),
      ...(keepout && { keepout }),
      ...(filledPolygons.length > 0 && { filledPolygons }),
    };
  }

  private parsePolygonPoints(node: ParsedSExpr): KiCadPoint[] {
    const points: KiCadPoint[] = [];
    const ptsChild = node.children.find((c) => c.name === 'pts');
    if (ptsChild) {
      for (const xyChild of ptsChild.children) {
        if (xyChild.name === 'xy') {
          points.push(this.parsePoint(xyChild));
        }
      }
    }
    return points;
  }

  private parseZoneFill(node: ParsedSExpr): KiCadZone['fill'] {
    const fill: NonNullable<KiCadZone['fill']> = {};

    if (node.values[0] === 'yes') {
      fill.yes = true;
    }

    for (const child of node.children) {
      switch (child.name) {
        case 'mode':
          fill.mode = child.values[0] as 'solid' | 'hatch';
          break;
        case 'thermal_gap':
          fill.thermalGap = parseFloat(child.values[0] ?? '0');
          break;
        case 'thermal_bridge_width':
          fill.thermalBridgeWidth = parseFloat(child.values[0] ?? '0');
          break;
        case 'smoothing':
          fill.smoothingStyle = child.values[0] as 'none' | 'chamfer' | 'fillet';
          break;
        case 'radius':
          fill.smoothingRadius = parseFloat(child.values[0] ?? '0');
          break;
        case 'hatch_thickness':
          fill.hatchThickness = parseFloat(child.values[0] ?? '0');
          break;
        case 'hatch_gap':
          fill.hatchGap = parseFloat(child.values[0] ?? '0');
          break;
        case 'hatch_orientation':
          fill.hatchOrientation = parseFloat(child.values[0] ?? '0');
          break;
      }
    }

    return fill;
  }

  private parseZoneKeepout(node: ParsedSExpr): KiCadZone['keepout'] {
    const keepout: NonNullable<KiCadZone['keepout']> = {};

    for (const child of node.children) {
      switch (child.name) {
        case 'tracks':
          keepout.tracks = child.values[0] as 'allowed' | 'not_allowed';
          break;
        case 'vias':
          keepout.vias = child.values[0] as 'allowed' | 'not_allowed';
          break;
        case 'pads':
          keepout.pads = child.values[0] as 'allowed' | 'not_allowed';
          break;
        case 'copperpour':
          keepout.copperpour = child.values[0] as 'allowed' | 'not_allowed';
          break;
        case 'footprints':
          keepout.footprints = child.values[0] as 'allowed' | 'not_allowed';
          break;
      }
    }

    return keepout;
  }

  // ===========================================================================
  // Graphic Parsing
  // ===========================================================================

  private parseGraphic(node: ParsedSExpr): KiCadGraphic {
    switch (node.name) {
      case 'gr_line':
        return this.parseGrLine(node);
      case 'gr_arc':
        return this.parseGrArc(node);
      case 'gr_circle':
        return this.parseGrCircle(node);
      case 'gr_rect':
        return this.parseGrRect(node);
      case 'gr_poly':
        return this.parseGrPoly(node);
      case 'gr_text':
        return this.parseGrText(node);
      default:
        throw new Error(`Unknown graphic type: ${node.name}`);
    }
  }

  private parseGrLine(node: ParsedSExpr): KiCadGraphic {
    const line: KiCadGraphic = {
      type: 'gr_line',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      layer: '',
      width: 0,
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'start':
          line.start = this.parsePoint(child);
          break;
        case 'end':
          line.end = this.parsePoint(child);
          break;
        case 'layer':
          line.layer = child.values[0] ?? '';
          break;
        case 'width':
          line.width = parseFloat(child.values[0] ?? '0');
          break;
        case 'stroke':
          line.stroke = this.parseStroke(child);
          break;
      }
    }

    return line;
  }

  private parseGrArc(node: ParsedSExpr): KiCadGraphic {
    const arc: KiCadGraphic = {
      type: 'gr_arc',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      layer: '',
      width: 0,
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'start':
          arc.start = this.parsePoint(child);
          break;
        case 'mid':
          arc.mid = this.parsePoint(child);
          break;
        case 'end':
          arc.end = this.parsePoint(child);
          break;
        case 'layer':
          arc.layer = child.values[0] ?? '';
          break;
        case 'width':
          arc.width = parseFloat(child.values[0] ?? '0');
          break;
        case 'stroke':
          arc.stroke = this.parseStroke(child);
          break;
      }
    }

    return arc;
  }

  private parseGrCircle(node: ParsedSExpr): KiCadGraphic {
    const circle: KiCadGraphic = {
      type: 'gr_circle',
      center: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      layer: '',
      width: 0,
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'center':
          circle.center = this.parsePoint(child);
          break;
        case 'end':
          circle.end = this.parsePoint(child);
          break;
        case 'layer':
          circle.layer = child.values[0] ?? '';
          break;
        case 'width':
          circle.width = parseFloat(child.values[0] ?? '0');
          break;
        case 'fill':
          circle.fill = child.values[0] as 'none' | 'solid';
          break;
        case 'stroke':
          circle.stroke = this.parseStroke(child);
          break;
      }
    }

    return circle;
  }

  private parseGrRect(node: ParsedSExpr): KiCadGraphic {
    const rect: KiCadGraphic = {
      type: 'gr_rect',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      layer: '',
      width: 0,
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'start':
          rect.start = this.parsePoint(child);
          break;
        case 'end':
          rect.end = this.parsePoint(child);
          break;
        case 'layer':
          rect.layer = child.values[0] ?? '';
          break;
        case 'width':
          rect.width = parseFloat(child.values[0] ?? '0');
          break;
        case 'fill':
          rect.fill = child.values[0] as 'none' | 'solid';
          break;
        case 'stroke':
          rect.stroke = this.parseStroke(child);
          break;
      }
    }

    return rect;
  }

  private parseGrPoly(node: ParsedSExpr): KiCadGraphic {
    const poly: KiCadGraphic = {
      type: 'gr_poly',
      pts: [],
      layer: '',
      width: 0,
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'pts':
          for (const ptChild of child.children) {
            if (ptChild.name === 'xy') {
              poly.pts.push(this.parsePoint(ptChild));
            }
          }
          break;
        case 'layer':
          poly.layer = child.values[0] ?? '';
          break;
        case 'width':
          poly.width = parseFloat(child.values[0] ?? '0');
          break;
        case 'fill':
          poly.fill = child.values[0] as 'none' | 'solid';
          break;
        case 'stroke':
          poly.stroke = this.parseStroke(child);
          break;
      }
    }

    return poly;
  }

  private parseGrText(node: ParsedSExpr): KiCadGraphic {
    const text: KiCadGraphic = {
      type: 'gr_text',
      text: node.values[0] ?? '',
      at: { x: 0, y: 0 },
      layer: '',
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'at':
          text.at = this.parsePosition(child);
          break;
        case 'layer':
          text.layer = child.values[0] ?? '';
          break;
        case 'effects':
          text.effects = this.parseTextEffects(child);
          break;
      }
    }

    return text;
  }

  // ===========================================================================
  // Footprint Graphic Parsing
  // ===========================================================================

  private parseFpGraphic(node: ParsedSExpr): KiCadFpGraphic {
    switch (node.name) {
      case 'fp_line':
        return this.parseFpLine(node);
      case 'fp_arc':
        return this.parseFpArc(node);
      case 'fp_circle':
        return this.parseFpCircle(node);
      case 'fp_rect':
        return this.parseFpRect(node);
      case 'fp_poly':
        return this.parseFpPoly(node);
      case 'fp_text':
        return this.parseFpText(node);
      default:
        throw new Error(`Unknown footprint graphic type: ${node.name}`);
    }
  }

  private parseFpLine(node: ParsedSExpr): KiCadFpGraphic {
    const line: KiCadFpGraphic = {
      type: 'fp_line',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      layer: '',
      width: 0,
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'start':
          line.start = this.parsePoint(child);
          break;
        case 'end':
          line.end = this.parsePoint(child);
          break;
        case 'layer':
          line.layer = child.values[0] ?? '';
          break;
        case 'width':
          line.width = parseFloat(child.values[0] ?? '0');
          break;
        case 'stroke':
          line.stroke = this.parseStroke(child);
          break;
      }
    }

    return line;
  }

  private parseFpArc(node: ParsedSExpr): KiCadFpGraphic {
    const arc: KiCadFpGraphic = {
      type: 'fp_arc',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      layer: '',
      width: 0,
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'start':
          arc.start = this.parsePoint(child);
          break;
        case 'mid':
          arc.mid = this.parsePoint(child);
          break;
        case 'end':
          arc.end = this.parsePoint(child);
          break;
        case 'layer':
          arc.layer = child.values[0] ?? '';
          break;
        case 'width':
          arc.width = parseFloat(child.values[0] ?? '0');
          break;
        case 'stroke':
          arc.stroke = this.parseStroke(child);
          break;
      }
    }

    return arc;
  }

  private parseFpCircle(node: ParsedSExpr): KiCadFpGraphic {
    const circle: KiCadFpGraphic = {
      type: 'fp_circle',
      center: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      layer: '',
      width: 0,
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'center':
          circle.center = this.parsePoint(child);
          break;
        case 'end':
          circle.end = this.parsePoint(child);
          break;
        case 'layer':
          circle.layer = child.values[0] ?? '';
          break;
        case 'width':
          circle.width = parseFloat(child.values[0] ?? '0');
          break;
        case 'fill':
          circle.fill = child.values[0] as 'none' | 'solid';
          break;
        case 'stroke':
          circle.stroke = this.parseStroke(child);
          break;
      }
    }

    return circle;
  }

  private parseFpRect(node: ParsedSExpr): KiCadFpGraphic {
    const rect: KiCadFpGraphic = {
      type: 'fp_rect',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      layer: '',
      width: 0,
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'start':
          rect.start = this.parsePoint(child);
          break;
        case 'end':
          rect.end = this.parsePoint(child);
          break;
        case 'layer':
          rect.layer = child.values[0] ?? '';
          break;
        case 'width':
          rect.width = parseFloat(child.values[0] ?? '0');
          break;
        case 'fill':
          rect.fill = child.values[0] as 'none' | 'solid';
          break;
        case 'stroke':
          rect.stroke = this.parseStroke(child);
          break;
      }
    }

    return rect;
  }

  private parseFpPoly(node: ParsedSExpr): KiCadFpGraphic {
    const poly: KiCadFpGraphic = {
      type: 'fp_poly',
      pts: [],
      layer: '',
      width: 0,
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'pts':
          for (const ptChild of child.children) {
            if (ptChild.name === 'xy') {
              poly.pts.push(this.parsePoint(ptChild));
            }
          }
          break;
        case 'layer':
          poly.layer = child.values[0] ?? '';
          break;
        case 'width':
          poly.width = parseFloat(child.values[0] ?? '0');
          break;
        case 'fill':
          poly.fill = child.values[0] as 'none' | 'solid';
          break;
        case 'stroke':
          poly.stroke = this.parseStroke(child);
          break;
      }
    }

    return poly;
  }

  private parseFpText(node: ParsedSExpr): KiCadFpText {
    const textType = (node.values[0] as 'reference' | 'value' | 'user') ?? 'user';
    const text = node.values[1] ?? '';
    let at: KiCadPosition = { x: 0, y: 0 };
    let layer = '';
    let hide: boolean | undefined;
    let effects: KiCadFpText['effects'] | undefined;
    let tstamp: string | undefined;

    for (const child of node.children) {
      switch (child.name) {
        case 'at':
          at = this.parsePosition(child);
          break;
        case 'layer':
          layer = child.values[0] ?? '';
          break;
        case 'hide':
          hide = true;
          break;
        case 'effects':
          effects = this.parseTextEffects(child);
          break;
        case 'tstamp':
          if (child.values[0]) tstamp = child.values[0];
          break;
      }
    }

    return {
      type: 'fp_text',
      textType,
      text,
      at,
      layer,
      ...(hide && { hide }),
      ...(effects && { effects }),
      ...(tstamp && { tstamp }),
    };
  }

  // ===========================================================================
  // Common Parsing Helpers
  // ===========================================================================

  private parsePoint(node: ParsedSExpr): KiCadPoint {
    return {
      x: parseFloat(node.values[0] ?? '0'),
      y: parseFloat(node.values[1] ?? '0'),
    };
  }

  private parsePosition(node: ParsedSExpr): KiCadPosition {
    const pos: KiCadPosition = {
      x: parseFloat(node.values[0] ?? '0'),
      y: parseFloat(node.values[1] ?? '0'),
    };
    if (node.values[2] !== undefined) {
      pos.angle = parseFloat(node.values[2]);
    }
    return pos;
  }

  private parseSize(node: ParsedSExpr): KiCadSize {
    return {
      width: parseFloat(node.values[0] ?? '0'),
      height: parseFloat(node.values[1] ?? '0'),
    };
  }

  private parseXYZ(node: ParsedSExpr): { x: number; y: number; z: number } {
    const xyzChild = node.children.find((c) => c.name === 'xyz');
    if (xyzChild) {
      return {
        x: parseFloat(xyzChild.values[0] ?? '0'),
        y: parseFloat(xyzChild.values[1] ?? '0'),
        z: parseFloat(xyzChild.values[2] ?? '0'),
      };
    }
    return {
      x: parseFloat(node.values[0] ?? '0'),
      y: parseFloat(node.values[1] ?? '0'),
      z: parseFloat(node.values[2] ?? '0'),
    };
  }

  private parseStroke(node: ParsedSExpr): KiCadStroke {
    const stroke: KiCadStroke = {
      width: 0,
      type: 'default',
    };

    for (const child of node.children) {
      switch (child.name) {
        case 'width':
          stroke.width = parseFloat(child.values[0] ?? '0');
          break;
        case 'type':
          stroke.type = child.values[0] as KiCadStroke['type'];
          break;
        case 'color':
          stroke.color = {
            r: parseFloat(child.values[0] ?? '0'),
            g: parseFloat(child.values[1] ?? '0'),
            b: parseFloat(child.values[2] ?? '0'),
            a: parseFloat(child.values[3] ?? '1'),
          };
          break;
      }
    }

    return stroke;
  }

  private parseTextEffects(node: ParsedSExpr): NonNullable<KiCadFpText['effects']> {
    let font: NonNullable<KiCadFpText['effects']>['font'] | undefined;
    let justify: NonNullable<KiCadFpText['effects']>['justify'] | undefined;

    for (const child of node.children) {
      switch (child.name) {
        case 'font': {
          let size: KiCadSize = { width: 1, height: 1 };
          let thickness: number | undefined;
          let bold: boolean | undefined;
          let italic: boolean | undefined;

          for (const fontChild of child.children) {
            switch (fontChild.name) {
              case 'size':
                size = this.parseSize(fontChild);
                break;
              case 'thickness':
                thickness = parseFloat(fontChild.values[0] ?? '0');
                break;
              case 'bold':
                bold = true;
                break;
              case 'italic':
                italic = true;
                break;
            }
          }

          font = {
            size,
            ...(thickness !== undefined && { thickness }),
            ...(bold && { bold }),
            ...(italic && { italic }),
          };
          break;
        }
        case 'justify':
          if (child.values.length > 0) {
            justify = child.values as NonNullable<NonNullable<KiCadFpText['effects']>['justify']>;
          }
          break;
      }
    }

    return {
      ...(font && { font }),
      ...(justify && { justify }),
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Parse a KiCad PCB file
 */
export function parseKiCad(content: string): KiCadPCB {
  const parser = new KiCadParser();
  return parser.parse(content);
}
