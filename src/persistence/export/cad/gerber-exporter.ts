/**
 * Gerber/Excellon Exporter
 *
 * Exports PCB design data to Gerber RS-274X and Excellon drill formats.
 * Standard format for PCB fabrication.
 */

import type { NodeId } from '@core/types/common';
import type { VectorPath } from '@core/types/geometry';

/**
 * PCB layer types
 */
export type PCBLayerType =
  | 'TOP_COPPER'
  | 'BOTTOM_COPPER'
  | 'INNER_COPPER_1'
  | 'INNER_COPPER_2'
  | 'TOP_SOLDER_MASK'
  | 'BOTTOM_SOLDER_MASK'
  | 'TOP_SILKSCREEN'
  | 'BOTTOM_SILKSCREEN'
  | 'TOP_PASTE'
  | 'BOTTOM_PASTE'
  | 'DRILL'
  | 'BOARD_OUTLINE';

/**
 * Gerber aperture types
 */
export type ApertureType = 'C' | 'R' | 'O' | 'P'; // Circle, Rectangle, Obround, Polygon

/**
 * Aperture definition
 */
export interface Aperture {
  code: number; // D10, D11, etc.
  type: ApertureType;
  // Circle
  diameter?: number;
  // Rectangle/Obround
  width?: number;
  height?: number;
  // Polygon
  outerDiameter?: number;
  vertices?: number;
  rotation?: number;
  // Hole
  holeDiameter?: number;
}

/**
 * PCB pad/via
 */
export interface PCBPad {
  x: number;
  y: number;
  aperture: number; // Aperture code
  type: 'pad' | 'via' | 'mount';
  drill?: number; // Drill diameter
  layer?: PCBLayerType;
}

/**
 * PCB trace
 */
export interface PCBTrace {
  points: Array<{ x: number; y: number }>;
  width: number;
  layer: PCBLayerType;
}

/**
 * PCB region (filled area)
 */
export interface PCBRegion {
  outline: VectorPath;
  layer: PCBLayerType;
  polarity: 'dark' | 'clear';
}

/**
 * Node with PCB properties
 */
export interface GerberExportableNode {
  id: NodeId;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  // PCB-specific properties
  pcbType?: 'pad' | 'trace' | 'region' | 'drill' | 'outline';
  layer?: PCBLayerType;
  apertureCode?: number;
  drillDiameter?: number;
  traceWidth?: number;
  vectorPaths?: readonly VectorPath[];
  childIds?: readonly NodeId[];
}

/**
 * Gerber export options
 */
export interface GerberExportOptions {
  /** Units */
  units?: 'mm' | 'in';
  /** Decimal places for coordinates */
  decimals?: number;
  /** Integer places for coordinates */
  integers?: number;
  /** Output coordinate format (e.g., 3.5 = 3 integers, 5 decimals) */
  format?: string;
  /** Board outline margin */
  outlineMargin?: number;
  /** Scale factor */
  scale?: number;
  /** Mirror X axis */
  mirrorX?: boolean;
  /** Mirror Y axis */
  mirrorY?: boolean;
  /** Origin offset */
  originX?: number;
  originY?: number;
}

/**
 * Excellon export options
 */
export interface ExcellonExportOptions {
  /** Units */
  units?: 'mm' | 'in';
  /** Decimal format (e.g., 3:3 = 3 integers, 3 decimals) */
  format?: string;
  /** Tool numbering start */
  toolStart?: number;
  /** Leading zeros */
  leadingZeros?: boolean;
  /** Trailing zeros */
  trailingZeros?: boolean;
}

/**
 * Gerber output result
 */
export interface GerberExportResult {
  /** Layer files */
  layers: Map<PCBLayerType, string>;
  /** Drill file */
  drill?: string;
  /** Aperture list used */
  apertures: Aperture[];
  /** Tool list used */
  tools: Array<{ number: number; diameter: number }>;
}

/**
 * Gerber Exporter class
 */
export class GerberExporter {
  private options: Required<GerberExportOptions>;
  private apertures: Map<string, Aperture> = new Map();
  private nextApertureCode = 10;
  private scale = 1;

  constructor(options: GerberExportOptions = {}) {
    this.options = {
      units: options.units ?? 'mm',
      decimals: options.decimals ?? 6,
      integers: options.integers ?? 3,
      format: options.format ?? '36',
      outlineMargin: options.outlineMargin ?? 0,
      scale: options.scale ?? 1,
      mirrorX: options.mirrorX ?? false,
      mirrorY: options.mirrorY ?? false,
      originX: options.originX ?? 0,
      originY: options.originY ?? 0,
    };

    this.scale = this.options.scale;
  }

  /**
   * Export nodes to Gerber files
   */
  export(
    nodes: GerberExportableNode[],
    getNode?: (id: NodeId) => GerberExportableNode | null
  ): GerberExportResult {
    this.apertures.clear();
    this.nextApertureCode = 10;

    const result: GerberExportResult = {
      layers: new Map(),
      apertures: [],
      tools: [],
    };

    // Collect elements by layer
    const elementsByLayer = this.collectElements(nodes, getNode);

    // Generate Gerber file for each layer
    for (const [layerType, elements] of elementsByLayer) {
      if (layerType === 'DRILL') {
        result.drill = this.generateExcellon(elements);
      } else {
        const gerber = this.generateGerber(layerType, elements);
        result.layers.set(layerType, gerber);
      }
    }

    result.apertures = Array.from(this.apertures.values());

    return result;
  }

  /**
   * Export single layer to Gerber
   */
  exportLayer(
    nodes: GerberExportableNode[],
    layer: PCBLayerType,
    getNode?: (id: NodeId) => GerberExportableNode | null
  ): string {
    const elementsByLayer = this.collectElements(nodes, getNode);
    const elements = elementsByLayer.get(layer) || [];

    if (layer === 'DRILL') {
      return this.generateExcellon(elements);
    }
    return this.generateGerber(layer, elements);
  }

  /**
   * Collect elements by layer
   */
  private collectElements(
    nodes: GerberExportableNode[],
    getNode?: (id: NodeId) => GerberExportableNode | null
  ): Map<PCBLayerType, GerberExportableNode[]> {
    const elementsByLayer = new Map<PCBLayerType, GerberExportableNode[]>();

    const processNode = (node: GerberExportableNode) => {
      if (!node.visible) return;

      const layer = node.layer || this.inferLayer(node);
      if (layer) {
        if (!elementsByLayer.has(layer)) {
          elementsByLayer.set(layer, []);
        }
        elementsByLayer.get(layer)!.push(node);
      }

      // Process children
      if (node.childIds && getNode) {
        for (const childId of node.childIds) {
          const child = getNode(childId);
          if (child) processNode(child);
        }
      }
    };

    for (const node of nodes) {
      processNode(node);
    }

    return elementsByLayer;
  }

  /**
   * Infer layer from node properties
   */
  private inferLayer(node: GerberExportableNode): PCBLayerType | null {
    const name = node.name.toLowerCase();

    if (name.includes('drill') || node.pcbType === 'drill') return 'DRILL';
    if (name.includes('outline') || node.pcbType === 'outline') return 'BOARD_OUTLINE';
    if (name.includes('top') && name.includes('copper')) return 'TOP_COPPER';
    if (name.includes('bottom') && name.includes('copper')) return 'BOTTOM_COPPER';
    if (name.includes('top') && name.includes('mask')) return 'TOP_SOLDER_MASK';
    if (name.includes('bottom') && name.includes('mask')) return 'BOTTOM_SOLDER_MASK';
    if (name.includes('top') && name.includes('silk')) return 'TOP_SILKSCREEN';
    if (name.includes('bottom') && name.includes('silk')) return 'BOTTOM_SILKSCREEN';
    if (name.includes('top') && name.includes('paste')) return 'TOP_PASTE';
    if (name.includes('bottom') && name.includes('paste')) return 'BOTTOM_PASTE';

    // Default to top copper for pads/traces
    if (node.pcbType === 'pad' || node.pcbType === 'trace') return 'TOP_COPPER';

    return null;
  }

  /**
   * Generate Gerber RS-274X file
   */
  private generateGerber(layer: PCBLayerType, elements: GerberExportableNode[]): string {
    const lines: string[] = [];

    // Header
    lines.push('%FSLAX' + this.options.format + 'Y' + this.options.format + '*%');
    lines.push(this.options.units === 'mm' ? '%MOMM*%' : '%MOIN*%');
    lines.push('%TF.GenerationSoftware,DesignLibre,GerberExporter*%');
    lines.push(`%TF.FileFunction,${this.getFileFunction(layer)}*%`);
    lines.push(`%TF.FilePolarity,${this.getFilePolarity(layer)}*%`);

    // Collect and define apertures
    const usedApertures = this.collectApertures(elements);
    for (const aperture of usedApertures) {
      lines.push(this.formatApertureDef(aperture));
    }

    // Draw elements
    for (const node of elements) {
      const commands = this.nodeToGerberCommands(node);
      lines.push(...commands);
    }

    // Footer
    lines.push('M02*');

    return lines.join('\n');
  }

  /**
   * Generate Excellon drill file
   */
  private generateExcellon(elements: GerberExportableNode[]): string {
    const lines: string[] = [];

    // Header
    lines.push('M48');
    lines.push(this.options.units === 'mm' ? 'METRIC,TZ' : 'INCH,TZ');

    // Collect drill sizes and create tool list
    const drillSizes = new Map<number, number>(); // diameter -> tool number
    let toolNum = 1;

    for (const node of elements) {
      const diameter = node.drillDiameter || 0.8; // Default drill size
      if (!drillSizes.has(diameter)) {
        drillSizes.set(diameter, toolNum++);
      }
    }

    // Define tools
    for (const [diameter, tool] of drillSizes) {
      lines.push(`T${tool.toString().padStart(2, '0')}C${diameter.toFixed(3)}`);
    }

    lines.push('%');

    // Drill hits grouped by tool
    for (const [diameter, tool] of drillSizes) {
      lines.push(`T${tool.toString().padStart(2, '0')}`);

      for (const node of elements) {
        const nodeDiameter = node.drillDiameter || 0.8;
        if (nodeDiameter === diameter) {
          const x = this.transformX(node.x + node.width / 2);
          const y = this.transformY(node.y + node.height / 2);
          lines.push(`X${this.formatExcellonCoord(x)}Y${this.formatExcellonCoord(y)}`);
        }
      }
    }

    lines.push('M30');

    return lines.join('\n');
  }

  /**
   * Collect apertures used by elements
   */
  private collectApertures(elements: GerberExportableNode[]): Aperture[] {
    const used = new Set<number>();

    for (const node of elements) {
      const code = this.getOrCreateAperture(node);
      used.add(code);
    }

    return Array.from(this.apertures.values()).filter(a => used.has(a.code));
  }

  /**
   * Get or create aperture for node
   */
  private getOrCreateAperture(node: GerberExportableNode): number {
    // Generate aperture key based on shape
    let key: string;
    let aperture: Aperture;

    if (node.pcbType === 'pad') {
      // Pad - typically round or rectangular
      const isRound = node.width === node.height;
      if (isRound) {
        const diameter = node.width * this.scale;
        key = `C${diameter.toFixed(4)}`;
        aperture = {
          code: 0,
          type: 'C',
          diameter,
        };
      } else {
        const w = node.width * this.scale;
        const h = node.height * this.scale;
        key = `R${w.toFixed(4)}X${h.toFixed(4)}`;
        aperture = {
          code: 0,
          type: 'R',
          width: w,
          height: h,
        };
      }
    } else if (node.pcbType === 'trace') {
      // Trace - round aperture with trace width
      const width = (node.traceWidth || 0.25) * this.scale;
      key = `C${width.toFixed(4)}`;
      aperture = {
        code: 0,
        type: 'C',
        diameter: width,
      };
    } else {
      // Default circular aperture
      const size = Math.min(node.width, node.height) * this.scale;
      key = `C${size.toFixed(4)}`;
      aperture = {
        code: 0,
        type: 'C',
        diameter: size || 0.1,
      };
    }

    // Check if aperture already exists
    if (this.apertures.has(key)) {
      return this.apertures.get(key)!.code;
    }

    // Create new aperture
    aperture.code = this.nextApertureCode++;
    this.apertures.set(key, aperture);
    return aperture.code;
  }

  /**
   * Format aperture definition
   */
  private formatApertureDef(aperture: Aperture): string {
    const d = `D${aperture.code}`;

    switch (aperture.type) {
      case 'C':
        if (aperture.holeDiameter) {
          return `%ADD${d}C,${aperture.diameter!.toFixed(4)}X${aperture.holeDiameter.toFixed(4)}*%`;
        }
        return `%ADD${d}C,${aperture.diameter!.toFixed(4)}*%`;

      case 'R':
        if (aperture.holeDiameter) {
          return `%ADD${d}R,${aperture.width!.toFixed(4)}X${aperture.height!.toFixed(4)}X${aperture.holeDiameter.toFixed(4)}*%`;
        }
        return `%ADD${d}R,${aperture.width!.toFixed(4)}X${aperture.height!.toFixed(4)}*%`;

      case 'O':
        return `%ADD${d}O,${aperture.width!.toFixed(4)}X${aperture.height!.toFixed(4)}*%`;

      case 'P':
        return `%ADD${d}P,${aperture.outerDiameter!.toFixed(4)}X${aperture.vertices}*%`;

      default:
        return `%ADD${d}C,0.1*%`;
    }
  }

  /**
   * Convert node to Gerber commands
   */
  private nodeToGerberCommands(node: GerberExportableNode): string[] {
    const commands: string[] = [];
    const apertureCode = this.getOrCreateAperture(node);

    // Select aperture
    commands.push(`D${apertureCode}*`);

    if (node.pcbType === 'pad' || node.pcbType === 'drill') {
      // Flash at center
      const x = this.transformX(node.x + node.width / 2);
      const y = this.transformY(node.y + node.height / 2);
      commands.push(`X${this.formatCoord(x)}Y${this.formatCoord(y)}D03*`);
    } else if (node.pcbType === 'trace' && node.vectorPaths && node.vectorPaths.length > 0) {
      // Draw path
      for (const path of node.vectorPaths) {
        for (const cmd of path.commands) {
          if (cmd.type === 'M') {
            const x = this.transformX(node.x + cmd.x);
            const y = this.transformY(node.y + cmd.y);
            // D02 = move without drawing
            commands.push(`X${this.formatCoord(x)}Y${this.formatCoord(y)}D02*`);
          } else if (cmd.type === 'L') {
            const x = this.transformX(node.x + cmd.x);
            const y = this.transformY(node.y + cmd.y);
            // D01 = draw line
            commands.push(`X${this.formatCoord(x)}Y${this.formatCoord(y)}D01*`);
          }
          // Note: Gerber doesn't natively support curves - would need to approximate
        }
      }
    } else if (node.pcbType === 'region' && node.vectorPaths && node.vectorPaths.length > 0) {
      // Region fill
      commands.push('G36*');
      for (const path of node.vectorPaths) {
        for (const cmd of path.commands) {
          if (cmd.type === 'M') {
            const x = this.transformX(node.x + cmd.x);
            const y = this.transformY(node.y + cmd.y);
            commands.push(`X${this.formatCoord(x)}Y${this.formatCoord(y)}D02*`);
          } else if (cmd.type === 'L') {
            const x = this.transformX(node.x + cmd.x);
            const y = this.transformY(node.y + cmd.y);
            commands.push(`X${this.formatCoord(x)}Y${this.formatCoord(y)}D01*`);
          }
          // Z (close path) is implicit in region mode
        }
      }
      commands.push('G37*');
    } else {
      // Default: flash as pad
      const x = this.transformX(node.x + node.width / 2);
      const y = this.transformY(node.y + node.height / 2);
      commands.push(`X${this.formatCoord(x)}Y${this.formatCoord(y)}D03*`);
    }

    return commands;
  }

  /**
   * Transform X coordinate
   */
  private transformX(x: number): number {
    let result = x * this.scale + this.options.originX;
    if (this.options.mirrorX) result = -result;
    return result;
  }

  /**
   * Transform Y coordinate
   */
  private transformY(y: number): number {
    let result = y * this.scale + this.options.originY;
    if (this.options.mirrorY) result = -result;
    return result;
  }

  /**
   * Format coordinate for Gerber
   */
  private formatCoord(value: number): string {
    // Format: integer digits + decimal digits (no decimal point)
    const multiplier = Math.pow(10, this.options.decimals);
    const intValue = Math.round(value * multiplier);
    return intValue.toString();
  }

  /**
   * Format coordinate for Excellon
   */
  private formatExcellonCoord(value: number): string {
    // Format depends on machine settings
    return value.toFixed(4).replace('.', '');
  }

  /**
   * Get file function attribute
   */
  private getFileFunction(layer: PCBLayerType): string {
    switch (layer) {
      case 'TOP_COPPER': return 'Copper,L1,Top';
      case 'BOTTOM_COPPER': return 'Copper,L2,Bot';
      case 'INNER_COPPER_1': return 'Copper,L2,Inr';
      case 'INNER_COPPER_2': return 'Copper,L3,Inr';
      case 'TOP_SOLDER_MASK': return 'Soldermask,Top';
      case 'BOTTOM_SOLDER_MASK': return 'Soldermask,Bot';
      case 'TOP_SILKSCREEN': return 'Legend,Top';
      case 'BOTTOM_SILKSCREEN': return 'Legend,Bot';
      case 'TOP_PASTE': return 'Paste,Top';
      case 'BOTTOM_PASTE': return 'Paste,Bot';
      case 'BOARD_OUTLINE': return 'Profile,NP';
      default: return 'Other';
    }
  }

  /**
   * Get file polarity
   */
  private getFilePolarity(_layer: PCBLayerType): string {
    // All layers are typically positive polarity
    // Negative polarity would be used for inverted layers
    return 'Positive';
  }
}

/**
 * Export nodes to Gerber files
 */
export function exportGerber(
  nodes: GerberExportableNode[],
  options?: GerberExportOptions,
  getNode?: (id: NodeId) => GerberExportableNode | null
): GerberExportResult {
  const exporter = new GerberExporter(options);
  return exporter.export(nodes, getNode);
}

/**
 * Export single layer to Gerber
 */
export function exportGerberLayer(
  nodes: GerberExportableNode[],
  layer: PCBLayerType,
  options?: GerberExportOptions,
  getNode?: (id: NodeId) => GerberExportableNode | null
): string {
  const exporter = new GerberExporter(options);
  return exporter.exportLayer(nodes, layer, getNode);
}

/**
 * Export drill file to Excellon format
 */
export function exportExcellon(
  nodes: GerberExportableNode[],
  options?: GerberExportOptions,
  getNode?: (id: NodeId) => GerberExportableNode | null
): string {
  const exporter = new GerberExporter(options);
  return exporter.exportLayer(nodes, 'DRILL', getNode);
}

/**
 * Standard Gerber file extensions
 */
export const GERBER_EXTENSIONS: Record<PCBLayerType, string> = {
  TOP_COPPER: '.gtl',
  BOTTOM_COPPER: '.gbl',
  INNER_COPPER_1: '.g2',
  INNER_COPPER_2: '.g3',
  TOP_SOLDER_MASK: '.gts',
  BOTTOM_SOLDER_MASK: '.gbs',
  TOP_SILKSCREEN: '.gto',
  BOTTOM_SILKSCREEN: '.gbo',
  TOP_PASTE: '.gtp',
  BOTTOM_PASTE: '.gbp',
  DRILL: '.drl',
  BOARD_OUTLINE: '.gko',
};
