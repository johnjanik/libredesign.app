/**
 * DXF Parser
 *
 * Parses DXF (Drawing Exchange Format) files into structured data.
 * Supports DXF R12 through R2018 ASCII format.
 */

import type {
  DXFFile,
  DXFHeader,
  DXFTables,
  DXFLayer,
  DXFLinetype,
  DXFTextStyle,
  DXFDimStyle,
  DXFBlock,
  DXFEntity,
  DXFLine,
  DXFCircle,
  DXFArc,
  DXFEllipse,
  DXFPolyline,
  DXFSpline,
  DXFText,
  DXFMText,
  DXFDimension,
  DXFHatch,
  DXFInsert,
  DXFSolid,
  DXFPointEntity,
  DXFPoint,
  DXFVertex,
  DXFGroupCode,
} from './dxf-types';

/**
 * DXF Parser class
 */
export class DXFParser {
  private lines: string[] = [];
  private index: number = 0;

  /**
   * Parse a DXF file content
   */
  parse(content: string): DXFFile {
    // Normalize line endings and split
    this.lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    this.index = 0;

    const result: DXFFile = {
      header: this.createDefaultHeader(),
      tables: { layers: [], linetypes: [], styles: [], dimstyles: [] },
      blocks: [],
      entities: [],
    };

    // Parse sections
    while (this.index < this.lines.length) {
      const group = this.readGroupCode();
      if (!group) break;

      if (group.code === 0 && group.value === 'SECTION') {
        const nameGroup = this.readGroupCode();
        if (nameGroup && nameGroup.code === 2) {
          const sectionName = nameGroup.value as string;

          switch (sectionName) {
            case 'HEADER':
              result.header = this.parseHeader();
              break;
            case 'TABLES':
              result.tables = this.parseTables();
              break;
            case 'BLOCKS':
              result.blocks = this.parseBlocks();
              break;
            case 'ENTITIES':
              result.entities = this.parseEntities();
              break;
            default:
              this.skipSection();
          }
        }
      } else if (group.code === 0 && group.value === 'EOF') {
        break;
      }
    }

    return result;
  }

  /**
   * Read a group code-value pair
   */
  private readGroupCode(): DXFGroupCode | null {
    if (this.index >= this.lines.length - 1) return null;

    const codeLine = this.lines[this.index]?.trim() ?? '';
    const valueLine = this.lines[this.index + 1] ?? '';

    if (codeLine === '' && this.index + 2 < this.lines.length) {
      this.index++;
      return this.readGroupCode();
    }

    const code = parseInt(codeLine, 10);
    if (isNaN(code)) return null;

    this.index += 2;

    // Parse value based on group code
    let value: string | number;
    if (this.isNumericCode(code)) {
      value = parseFloat(valueLine.trim());
      if (isNaN(value)) value = 0;
    } else if (this.isIntegerCode(code)) {
      value = parseInt(valueLine.trim(), 10);
      if (isNaN(value)) value = 0;
    } else {
      value = valueLine.trim();
    }

    return { code, value };
  }

  /**
   * Peek at the next group code without advancing
   */
  private peekGroupCode(): DXFGroupCode | null {
    const savedIndex = this.index;
    const result = this.readGroupCode();
    this.index = savedIndex;
    return result;
  }

  /**
   * Check if group code represents a floating-point value
   */
  private isNumericCode(code: number): boolean {
    return (
      (code >= 10 && code <= 59) || (code >= 110 && code <= 149) || (code >= 210 && code <= 239) || code === 40 || code === 41 || code === 42 || code === 50 || code === 51
    );
  }

  /**
   * Check if group code represents an integer value
   */
  private isIntegerCode(code: number): boolean {
    return (
      (code >= 60 && code <= 99) ||
      (code >= 170 && code <= 179) ||
      (code >= 270 && code <= 289) ||
      (code >= 370 && code <= 389) ||
      (code >= 400 && code <= 409) ||
      (code >= 1060 && code <= 1079)
    );
  }

  /**
   * Create default header values
   */
  private createDefaultHeader(): DXFHeader {
    return {
      version: 'AC1015', // AutoCAD 2000
      insunits: 0,
      extmin: { x: 0, y: 0, z: 0 },
      extmax: { x: 100, y: 100, z: 0 },
      limmin: { x: 0, y: 0 },
      limmax: { x: 100, y: 100 },
      ltscale: 1,
      textsize: 2.5,
      dimscale: 1,
    };
  }

  /**
   * Parse HEADER section
   */
  private parseHeader(): DXFHeader {
    const header = this.createDefaultHeader();

    while (this.index < this.lines.length) {
      const group = this.readGroupCode();
      if (!group) break;

      if (group.code === 0 && group.value === 'ENDSEC') break;

      if (group.code === 9) {
        const varName = group.value as string;
        this.parseHeaderVariable(header, varName);
      }
    }

    return header;
  }

  /**
   * Parse a header variable
   */
  private parseHeaderVariable(header: DXFHeader, varName: string): void {
    const valueGroup = this.readGroupCode();
    if (!valueGroup) return;

    switch (varName) {
      case '$ACADVER':
        header.version = valueGroup.value as string;
        break;
      case '$INSUNITS':
        header.insunits = valueGroup.value as number;
        break;
      case '$LTSCALE':
        header.ltscale = valueGroup.value as number;
        break;
      case '$TEXTSIZE':
        header.textsize = valueGroup.value as number;
        break;
      case '$DIMSCALE':
        header.dimscale = valueGroup.value as number;
        break;
      case '$EXTMIN':
        header.extmin = this.readPoint(valueGroup);
        break;
      case '$EXTMAX':
        header.extmax = this.readPoint(valueGroup);
        break;
      case '$LIMMIN':
        header.limmin = this.readPoint(valueGroup);
        break;
      case '$LIMMAX':
        header.limmax = this.readPoint(valueGroup);
        break;
      default:
        header[varName] = valueGroup.value;
    }
  }

  /**
   * Read a point from group codes
   */
  private readPoint(firstGroup: DXFGroupCode): DXFPoint {
    const point: DXFPoint = { x: 0, y: 0 };

    // First group is X
    if (firstGroup.code >= 10 && firstGroup.code < 20) {
      point.x = firstGroup.value as number;
    }

    // Look for Y and Z
    let peek = this.peekGroupCode();
    while (peek && ((peek.code >= 20 && peek.code < 30) || (peek.code >= 30 && peek.code < 40))) {
      const group = this.readGroupCode();
      if (!group) break;

      if (group.code >= 20 && group.code < 30) {
        point.y = group.value as number;
      } else if (group.code >= 30 && group.code < 40) {
        point.z = group.value as number;
      }

      peek = this.peekGroupCode();
    }

    return point;
  }

  /**
   * Parse TABLES section
   */
  private parseTables(): DXFTables {
    const tables: DXFTables = {
      layers: [],
      linetypes: [],
      styles: [],
      dimstyles: [],
    };

    while (this.index < this.lines.length) {
      const group = this.readGroupCode();
      if (!group) break;

      if (group.code === 0 && group.value === 'ENDSEC') break;

      if (group.code === 0 && group.value === 'TABLE') {
        const nameGroup = this.readGroupCode();
        if (nameGroup && nameGroup.code === 2) {
          const tableName = nameGroup.value as string;

          switch (tableName) {
            case 'LAYER':
              tables.layers = this.parseLayerTable();
              break;
            case 'LTYPE':
              tables.linetypes = this.parseLinetypeTable();
              break;
            case 'STYLE':
              tables.styles = this.parseStyleTable();
              break;
            case 'DIMSTYLE':
              tables.dimstyles = this.parseDimStyleTable();
              break;
            default:
              this.skipTable();
          }
        }
      }
    }

    return tables;
  }

  /**
   * Parse LAYER table
   */
  private parseLayerTable(): DXFLayer[] {
    const layers: DXFLayer[] = [];

    while (this.index < this.lines.length) {
      const group = this.readGroupCode();
      if (!group) break;

      if (group.code === 0 && group.value === 'ENDTAB') break;

      if (group.code === 0 && group.value === 'LAYER') {
        const layer = this.parseLayerEntry();
        if (layer) layers.push(layer);
      }
    }

    return layers;
  }

  /**
   * Parse a single layer entry
   */
  private parseLayerEntry(): DXFLayer | null {
    const layer: DXFLayer = {
      name: '0',
      color: 7,
      linetype: 'CONTINUOUS',
      lineweight: -1,
      frozen: false,
      locked: false,
      off: false,
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 2:
          layer.name = group.value as string;
          break;
        case 62:
          const color = group.value as number;
          layer.color = Math.abs(color);
          layer.off = color < 0;
          break;
        case 6:
          layer.linetype = group.value as string;
          break;
        case 370:
          layer.lineweight = group.value as number;
          break;
        case 70:
          const flags = group.value as number;
          layer.frozen = (flags & 1) !== 0;
          layer.locked = (flags & 4) !== 0;
          break;
      }
    }

    return layer;
  }

  /**
   * Parse LTYPE table
   */
  private parseLinetypeTable(): DXFLinetype[] {
    const linetypes: DXFLinetype[] = [];

    while (this.index < this.lines.length) {
      const group = this.readGroupCode();
      if (!group) break;

      if (group.code === 0 && group.value === 'ENDTAB') break;

      if (group.code === 0 && group.value === 'LTYPE') {
        const linetype = this.parseLinetypeEntry();
        if (linetype) linetypes.push(linetype);
      }
    }

    return linetypes;
  }

  /**
   * Parse a single linetype entry
   */
  private parseLinetypeEntry(): DXFLinetype | null {
    const linetype: DXFLinetype = {
      name: 'CONTINUOUS',
      description: '',
      pattern: [],
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 2:
          linetype.name = group.value as string;
          break;
        case 3:
          linetype.description = group.value as string;
          break;
        case 49:
          linetype.pattern.push(group.value as number);
          break;
      }
    }

    return linetype;
  }

  /**
   * Parse STYLE table
   */
  private parseStyleTable(): DXFTextStyle[] {
    const styles: DXFTextStyle[] = [];

    while (this.index < this.lines.length) {
      const group = this.readGroupCode();
      if (!group) break;

      if (group.code === 0 && group.value === 'ENDTAB') break;

      if (group.code === 0 && group.value === 'STYLE') {
        const style = this.parseStyleEntry();
        if (style) styles.push(style);
      }
    }

    return styles;
  }

  /**
   * Parse a single style entry
   */
  private parseStyleEntry(): DXFTextStyle | null {
    const style: DXFTextStyle = {
      name: 'Standard',
      fontName: 'txt',
      height: 0,
      widthFactor: 1,
      oblique: 0,
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 2:
          style.name = group.value as string;
          break;
        case 3:
          style.fontName = group.value as string;
          break;
        case 40:
          style.height = group.value as number;
          break;
        case 41:
          style.widthFactor = group.value as number;
          break;
        case 50:
          style.oblique = group.value as number;
          break;
      }
    }

    return style;
  }

  /**
   * Parse DIMSTYLE table
   */
  private parseDimStyleTable(): DXFDimStyle[] {
    const dimstyles: DXFDimStyle[] = [];

    while (this.index < this.lines.length) {
      const group = this.readGroupCode();
      if (!group) break;

      if (group.code === 0 && group.value === 'ENDTAB') break;

      if (group.code === 0 && group.value === 'DIMSTYLE') {
        const dimstyle = this.parseDimStyleEntry();
        if (dimstyle) dimstyles.push(dimstyle);
      }
    }

    return dimstyles;
  }

  /**
   * Parse a single dimension style entry
   */
  private parseDimStyleEntry(): DXFDimStyle | null {
    const dimstyle: DXFDimStyle = {
      name: 'Standard',
      dimscale: 1,
      dimtxt: 2.5,
      dimasz: 2.5,
      dimdec: 4,
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 2:
          dimstyle.name = group.value as string;
          break;
        case 40:
          dimstyle.dimscale = group.value as number;
          break;
        case 140:
          dimstyle.dimtxt = group.value as number;
          break;
        case 141:
          dimstyle.dimasz = group.value as number;
          break;
        case 271:
          dimstyle.dimdec = group.value as number;
          break;
      }
    }

    return dimstyle;
  }

  /**
   * Skip a table
   */
  private skipTable(): void {
    while (this.index < this.lines.length) {
      const group = this.readGroupCode();
      if (!group) break;
      if (group.code === 0 && group.value === 'ENDTAB') break;
    }
  }

  /**
   * Parse BLOCKS section
   */
  private parseBlocks(): DXFBlock[] {
    const blocks: DXFBlock[] = [];

    while (this.index < this.lines.length) {
      const group = this.readGroupCode();
      if (!group) break;

      if (group.code === 0 && group.value === 'ENDSEC') break;

      if (group.code === 0 && group.value === 'BLOCK') {
        const block = this.parseBlock();
        if (block) blocks.push(block);
      }
    }

    return blocks;
  }

  /**
   * Parse a single block
   */
  private parseBlock(): DXFBlock | null {
    const block: DXFBlock = {
      name: '',
      basePoint: { x: 0, y: 0 },
      entities: [],
    };

    // Read block header
    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || (peek.code === 0 && peek.value !== 'BLOCK')) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 2:
          block.name = group.value as string;
          break;
        case 10:
          block.basePoint = this.readPoint(group);
          break;
      }
    }

    // Read block entities
    while (this.index < this.lines.length) {
      const group = this.readGroupCode();
      if (!group) break;

      if (group.code === 0 && group.value === 'ENDBLK') break;

      if (group.code === 0) {
        const entity = this.parseEntity(group.value as string);
        if (entity) block.entities.push(entity);
      }
    }

    return block;
  }

  /**
   * Parse ENTITIES section
   */
  private parseEntities(): DXFEntity[] {
    const entities: DXFEntity[] = [];

    while (this.index < this.lines.length) {
      const group = this.readGroupCode();
      if (!group) break;

      if (group.code === 0 && group.value === 'ENDSEC') break;

      if (group.code === 0) {
        const entity = this.parseEntity(group.value as string);
        if (entity) entities.push(entity);
      }
    }

    return entities;
  }

  /**
   * Parse a single entity
   */
  private parseEntity(entityType: string): DXFEntity | null {
    switch (entityType) {
      case 'LINE':
        return this.parseLine();
      case 'CIRCLE':
        return this.parseCircle();
      case 'ARC':
        return this.parseArc();
      case 'ELLIPSE':
        return this.parseEllipse();
      case 'LWPOLYLINE':
      case 'POLYLINE':
        return this.parsePolyline(entityType);
      case 'SPLINE':
        return this.parseSpline();
      case 'TEXT':
        return this.parseText();
      case 'MTEXT':
        return this.parseMText();
      case 'DIMENSION':
        return this.parseDimension();
      case 'HATCH':
        return this.parseHatch();
      case 'INSERT':
        return this.parseInsert();
      case 'SOLID':
        return this.parseSolid();
      case 'POINT':
        return this.parsePoint();
      default:
        this.skipEntity();
        return null;
    }
  }

  /**
   * Skip an unknown entity
   */
  private skipEntity(): void {
    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;
      this.readGroupCode();
    }
  }

  /**
   * Skip a section
   */
  private skipSection(): void {
    while (this.index < this.lines.length) {
      const group = this.readGroupCode();
      if (!group) break;
      if (group.code === 0 && group.value === 'ENDSEC') break;
    }
  }


  /**
   * Parse LINE entity
   */
  private parseLine(): DXFLine {
    const line: DXFLine = {
      type: 'LINE',
      layer: '0',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          line.layer = group.value as string;
          break;
        case 5:
          line.handle = group.value as string;
          break;
        case 62:
          line.color = { aci: group.value as number };
          break;
        case 6:
          line.linetype = group.value as string;
          break;
        case 10:
          line.start.x = group.value as number;
          break;
        case 20:
          line.start.y = group.value as number;
          break;
        case 30:
          line.start.z = group.value as number;
          break;
        case 11:
          line.end.x = group.value as number;
          break;
        case 21:
          line.end.y = group.value as number;
          break;
        case 31:
          line.end.z = group.value as number;
          break;
      }
    }

    return line;
  }

  /**
   * Parse CIRCLE entity
   */
  private parseCircle(): DXFCircle {
    const circle: DXFCircle = {
      type: 'CIRCLE',
      layer: '0',
      center: { x: 0, y: 0 },
      radius: 0,
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          circle.layer = group.value as string;
          break;
        case 5:
          circle.handle = group.value as string;
          break;
        case 62:
          circle.color = { aci: group.value as number };
          break;
        case 10:
          circle.center.x = group.value as number;
          break;
        case 20:
          circle.center.y = group.value as number;
          break;
        case 30:
          circle.center.z = group.value as number;
          break;
        case 40:
          circle.radius = group.value as number;
          break;
      }
    }

    return circle;
  }

  /**
   * Parse ARC entity
   */
  private parseArc(): DXFArc {
    const arc: DXFArc = {
      type: 'ARC',
      layer: '0',
      center: { x: 0, y: 0 },
      radius: 0,
      startAngle: 0,
      endAngle: 360,
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          arc.layer = group.value as string;
          break;
        case 5:
          arc.handle = group.value as string;
          break;
        case 62:
          arc.color = { aci: group.value as number };
          break;
        case 10:
          arc.center.x = group.value as number;
          break;
        case 20:
          arc.center.y = group.value as number;
          break;
        case 30:
          arc.center.z = group.value as number;
          break;
        case 40:
          arc.radius = group.value as number;
          break;
        case 50:
          arc.startAngle = group.value as number;
          break;
        case 51:
          arc.endAngle = group.value as number;
          break;
      }
    }

    return arc;
  }

  /**
   * Parse ELLIPSE entity
   */
  private parseEllipse(): DXFEllipse {
    const ellipse: DXFEllipse = {
      type: 'ELLIPSE',
      layer: '0',
      center: { x: 0, y: 0 },
      majorAxis: { x: 1, y: 0 },
      ratio: 1,
      startParam: 0,
      endParam: Math.PI * 2,
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          ellipse.layer = group.value as string;
          break;
        case 10:
          ellipse.center.x = group.value as number;
          break;
        case 20:
          ellipse.center.y = group.value as number;
          break;
        case 11:
          ellipse.majorAxis.x = group.value as number;
          break;
        case 21:
          ellipse.majorAxis.y = group.value as number;
          break;
        case 40:
          ellipse.ratio = group.value as number;
          break;
        case 41:
          ellipse.startParam = group.value as number;
          break;
        case 42:
          ellipse.endParam = group.value as number;
          break;
      }
    }

    return ellipse;
  }

  /**
   * Parse LWPOLYLINE or POLYLINE entity
   */
  private parsePolyline(type: string): DXFPolyline {
    const polyline: DXFPolyline = {
      type: type as 'POLYLINE' | 'LWPOLYLINE',
      layer: '0',
      vertices: [],
      closed: false,
    };

    let currentVertex: DXFVertex | null = null;

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          polyline.layer = group.value as string;
          break;
        case 70:
          polyline.closed = ((group.value as number) & 1) !== 0;
          break;
        case 43:
          polyline.constantWidth = group.value as number;
          break;
        case 10:
          // Start new vertex
          if (currentVertex) {
            polyline.vertices.push(currentVertex);
          }
          currentVertex = { x: group.value as number, y: 0 };
          break;
        case 20:
          if (currentVertex) {
            currentVertex.y = group.value as number;
          }
          break;
        case 42:
          if (currentVertex) {
            currentVertex.bulge = group.value as number;
          }
          break;
        case 40:
          if (currentVertex) {
            currentVertex.startWidth = group.value as number;
          }
          break;
        case 41:
          if (currentVertex) {
            currentVertex.endWidth = group.value as number;
          }
          break;
      }
    }

    // Add last vertex
    if (currentVertex) {
      polyline.vertices.push(currentVertex);
    }

    return polyline;
  }

  /**
   * Parse SPLINE entity
   */
  private parseSpline(): DXFSpline {
    const spline: DXFSpline = {
      type: 'SPLINE',
      layer: '0',
      degree: 3,
      closed: false,
      controlPoints: [],
      fitPoints: [],
      knots: [],
    };

    let controlPoint: DXFPoint | null = null;
    let fitPoint: DXFPoint | null = null;

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          spline.layer = group.value as string;
          break;
        case 71:
          spline.degree = group.value as number;
          break;
        case 70:
          spline.closed = ((group.value as number) & 1) !== 0;
          break;
        case 40:
          spline.knots.push(group.value as number);
          break;
        case 10:
          if (controlPoint) spline.controlPoints.push(controlPoint);
          controlPoint = { x: group.value as number, y: 0 };
          break;
        case 20:
          if (controlPoint) controlPoint.y = group.value as number;
          break;
        case 11:
          if (fitPoint) spline.fitPoints.push(fitPoint);
          fitPoint = { x: group.value as number, y: 0 };
          break;
        case 21:
          if (fitPoint) fitPoint.y = group.value as number;
          break;
      }
    }

    if (controlPoint) spline.controlPoints.push(controlPoint);
    if (fitPoint) spline.fitPoints.push(fitPoint);

    return spline;
  }

  /**
   * Parse TEXT entity
   */
  private parseText(): DXFText {
    const text: DXFText = {
      type: 'TEXT',
      layer: '0',
      position: { x: 0, y: 0 },
      height: 2.5,
      text: '',
      rotation: 0,
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          text.layer = group.value as string;
          break;
        case 10:
          text.position.x = group.value as number;
          break;
        case 20:
          text.position.y = group.value as number;
          break;
        case 40:
          text.height = group.value as number;
          break;
        case 1:
          text.text = group.value as string;
          break;
        case 50:
          text.rotation = group.value as number;
          break;
        case 7:
          text.style = group.value as string;
          break;
        case 72:
          text.horizontalJustification = group.value as number;
          break;
        case 73:
          text.verticalJustification = group.value as number;
          break;
        case 41:
          text.widthFactor = group.value as number;
          break;
        case 51:
          text.oblique = group.value as number;
          break;
      }
    }

    return text;
  }

  /**
   * Parse MTEXT entity
   */
  private parseMText(): DXFMText {
    const mtext: DXFMText = {
      type: 'MTEXT',
      layer: '0',
      position: { x: 0, y: 0 },
      height: 2.5,
      text: '',
      rotation: 0,
      width: 100,
      attachmentPoint: 1,
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          mtext.layer = group.value as string;
          break;
        case 10:
          mtext.position.x = group.value as number;
          break;
        case 20:
          mtext.position.y = group.value as number;
          break;
        case 40:
          mtext.height = group.value as number;
          break;
        case 1:
        case 3:
          mtext.text += group.value as string;
          break;
        case 50:
          mtext.rotation = group.value as number;
          break;
        case 41:
          mtext.width = group.value as number;
          break;
        case 71:
          mtext.attachmentPoint = group.value as number;
          break;
        case 7:
          mtext.style = group.value as string;
          break;
      }
    }

    return mtext;
  }

  /**
   * Parse DIMENSION entity (simplified)
   */
  private parseDimension(): DXFDimension {
    const dimension: DXFDimension = {
      type: 'DIMENSION',
      layer: '0',
      dimensionType: 0,
      definitionPoint: { x: 0, y: 0 },
      middlePoint: { x: 0, y: 0 },
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          dimension.layer = group.value as string;
          break;
        case 70:
          dimension.dimensionType = group.value as number;
          break;
        case 10:
          dimension.definitionPoint.x = group.value as number;
          break;
        case 20:
          dimension.definitionPoint.y = group.value as number;
          break;
        case 11:
          dimension.middlePoint.x = group.value as number;
          break;
        case 21:
          dimension.middlePoint.y = group.value as number;
          break;
        case 1:
          dimension.text = group.value as string;
          break;
        case 50:
          dimension.rotation = group.value as number;
          break;
        case 3:
          dimension.style = group.value as string;
          break;
      }
    }

    return dimension;
  }

  /**
   * Parse HATCH entity (simplified)
   */
  private parseHatch(): DXFHatch {
    const hatch: DXFHatch = {
      type: 'HATCH',
      layer: '0',
      patternName: 'SOLID',
      solid: true,
      associative: false,
      boundaryPaths: [],
      patternAngle: 0,
      patternScale: 1,
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          hatch.layer = group.value as string;
          break;
        case 2:
          hatch.patternName = group.value as string;
          break;
        case 70:
          hatch.solid = (group.value as number) === 1;
          break;
        case 52:
          hatch.patternAngle = group.value as number;
          break;
        case 41:
          hatch.patternScale = group.value as number;
          break;
      }
    }

    return hatch;
  }

  /**
   * Parse INSERT entity
   */
  private parseInsert(): DXFInsert {
    const insert: DXFInsert = {
      type: 'INSERT',
      layer: '0',
      blockName: '',
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: 0,
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          insert.layer = group.value as string;
          break;
        case 2:
          insert.blockName = group.value as string;
          break;
        case 10:
          insert.position.x = group.value as number;
          break;
        case 20:
          insert.position.y = group.value as number;
          break;
        case 30:
          insert.position.z = group.value as number;
          break;
        case 41:
          insert.scale.x = group.value as number;
          break;
        case 42:
          insert.scale.y = group.value as number;
          break;
        case 43:
          insert.scale.z = group.value as number;
          break;
        case 50:
          insert.rotation = group.value as number;
          break;
        case 70:
          insert.columnCount = group.value as number;
          break;
        case 71:
          insert.rowCount = group.value as number;
          break;
        case 44:
          insert.columnSpacing = group.value as number;
          break;
        case 45:
          insert.rowSpacing = group.value as number;
          break;
      }
    }

    return insert;
  }

  /**
   * Parse SOLID entity
   */
  private parseSolid(): DXFSolid {
    const solid: DXFSolid = {
      type: 'SOLID',
      layer: '0',
      point1: { x: 0, y: 0 },
      point2: { x: 0, y: 0 },
      point3: { x: 0, y: 0 },
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          solid.layer = group.value as string;
          break;
        case 10:
          solid.point1.x = group.value as number;
          break;
        case 20:
          solid.point1.y = group.value as number;
          break;
        case 11:
          solid.point2.x = group.value as number;
          break;
        case 21:
          solid.point2.y = group.value as number;
          break;
        case 12:
          solid.point3.x = group.value as number;
          break;
        case 22:
          solid.point3.y = group.value as number;
          break;
        case 13:
          solid.point4 = { x: group.value as number, y: 0 };
          break;
        case 23:
          if (solid.point4) solid.point4.y = group.value as number;
          break;
      }
    }

    return solid;
  }

  /**
   * Parse POINT entity
   */
  private parsePoint(): DXFPointEntity {
    const point: DXFPointEntity = {
      type: 'POINT',
      layer: '0',
      position: { x: 0, y: 0 },
    };

    while (this.index < this.lines.length) {
      const peek = this.peekGroupCode();
      if (!peek || peek.code === 0) break;

      const group = this.readGroupCode();
      if (!group) break;

      switch (group.code) {
        case 8:
          point.layer = group.value as string;
          break;
        case 10:
          point.position.x = group.value as number;
          break;
        case 20:
          point.position.y = group.value as number;
          break;
        case 30:
          point.position.z = group.value as number;
          break;
      }
    }

    return point;
  }
}

/**
 * Parse DXF file content
 */
export function parseDXF(content: string): DXFFile {
  const parser = new DXFParser();
  return parser.parse(content);
}
