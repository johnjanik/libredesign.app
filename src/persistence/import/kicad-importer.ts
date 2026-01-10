/**
 * KiCad PCB Importer
 *
 * Converts parsed KiCad .kicad_pcb files to DesignLibre PCB types.
 */

import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import type { RGBA } from '@core/types/color';
import type {
  PCBBoard,
  PCBTrack,
  PCBVia,
  PCBFootprint,
  PCBComponent,
  PCBZone,
  PCBPad,
  PCBLayer,
  PCBLayerStackup,
  DesignRules,
  FootprintGraphic,
  FootprintText,
  TrackSegment,
  ViaType,
  PadType,
  PadShape,
  FootprintCategory,
} from '@core/types/pcb';
import { createDefaultDesignRules } from '@core/types/pcb';
import { parseKiCad } from './kicad-parser';
import type {
  KiCadPCB,
  KiCadFootprint,
  KiCadPad,
  KiCadSegment,
  KiCadVia,
  KiCadZone,
  KiCadFpGraphic,
  KiCadPoint,
} from './kicad-types';

// =============================================================================
// Types
// =============================================================================

/**
 * Import options
 */
export interface KiCadImportOptions {
  /** Import segments/tracks */
  importTracks?: boolean;
  /** Import vias */
  importVias?: boolean;
  /** Import components/footprints */
  importComponents?: boolean;
  /** Import zones (copper pours) */
  importZones?: boolean;
  /** Import graphics (board outline, etc.) */
  importGraphics?: boolean;
  /** Layer filter - only import specified layers */
  layerFilter?: string[];
  /** Scale factor (KiCad uses mm) */
  scale?: number;
}

/**
 * Import result
 */
export interface KiCadImportResult {
  /** Created board */
  board: PCBBoard;
  /** Imported tracks */
  tracks: PCBTrack[];
  /** Imported vias */
  vias: PCBVia[];
  /** Registered footprints */
  footprints: PCBFootprint[];
  /** Placed components */
  components: PCBComponent[];
  /** Copper zones */
  zones: PCBZone[];
  /** Net names by ID */
  nets: Map<number, string>;
  /** Import warnings */
  warnings: string[];
  /** Import statistics */
  stats: {
    trackCount: number;
    viaCount: number;
    componentCount: number;
    zoneCount: number;
    netCount: number;
  };
}

// =============================================================================
// Importer Class
// =============================================================================

/**
 * KiCad PCB file importer
 */
export class KiCadImporter {
  private options: Required<KiCadImportOptions>;
  private idCounter = 0;
  private nets: Map<number, string> = new Map();
  private warnings: string[] = [];

  constructor(options: KiCadImportOptions = {}) {
    this.options = {
      importTracks: options.importTracks ?? true,
      importVias: options.importVias ?? true,
      importComponents: options.importComponents ?? true,
      importZones: options.importZones ?? true,
      importGraphics: options.importGraphics ?? true,
      layerFilter: options.layerFilter ?? [],
      scale: options.scale ?? 1,
    };
  }

  /**
   * Import a KiCad PCB file
   */
  import(content: string): KiCadImportResult {
    this.idCounter = 0;
    this.nets.clear();
    this.warnings = [];

    // Parse the file
    const kicad = parseKiCad(content);

    // Build net map
    for (const net of kicad.nets) {
      this.nets.set(net.id, net.name);
    }

    // Create board
    const board = this.createBoard(kicad);

    // Import elements
    const tracks = this.options.importTracks ? this.importTracks(kicad) : [];
    const vias = this.options.importVias ? this.importVias(kicad) : [];
    const { footprints, components } = this.options.importComponents
      ? this.importComponents(kicad)
      : { footprints: [], components: [] };
    const zones = this.options.importZones ? this.importZones(kicad) : [];

    return {
      board,
      tracks,
      vias,
      footprints,
      components,
      zones,
      nets: this.nets,
      warnings: this.warnings,
      stats: {
        trackCount: tracks.length,
        viaCount: vias.length,
        componentCount: components.length,
        zoneCount: zones.length,
        netCount: this.nets.size,
      },
    };
  }

  // ===========================================================================
  // Board Creation
  // ===========================================================================

  private createBoard(kicad: KiCadPCB): PCBBoard {
    // Determine board dimensions from Edge.Cuts graphics or use defaults
    let width = 100;
    let height = 100;
    const outline: Point[] = [];

    // Look for board outline in graphics
    for (const graphic of kicad.graphics) {
      if (graphic.layer === 'Edge.Cuts') {
        if (graphic.type === 'gr_rect') {
          width = Math.abs(graphic.end.x - graphic.start.x);
          height = Math.abs(graphic.end.y - graphic.start.y);
          outline.push(
            { x: graphic.start.x, y: graphic.start.y },
            { x: graphic.end.x, y: graphic.start.y },
            { x: graphic.end.x, y: graphic.end.y },
            { x: graphic.start.x, y: graphic.end.y }
          );
        } else if (graphic.type === 'gr_line') {
          outline.push({ x: graphic.start.x, y: graphic.start.y });
          outline.push({ x: graphic.end.x, y: graphic.end.y });
        } else if (graphic.type === 'gr_poly') {
          for (const pt of graphic.pts) {
            outline.push({ x: pt.x, y: pt.y });
          }
        }
      }
    }

    // Calculate bounds from outline if we have it
    if (outline.length > 0) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const pt of outline) {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y);
        maxY = Math.max(maxY, pt.y);
      }
      width = maxX - minX;
      height = maxY - minY;
    }

    // Create layer stackup
    const layers = this.createLayerStackup(kicad);

    // Create design rules
    const designRules = this.createDesignRules(kicad);

    const board: PCBBoard = {
      id: this.generateId(),
      name: kicad.titleBlock?.title ?? 'Imported KiCad Board',
      outline: outline.length > 0 ? outline : [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
      ],
      width,
      height,
      layers,
      thickness: kicad.general?.thickness ?? 1.6,
      units: 'mm',
      designRules,
      grid: {
        size: 0.1,
        units: 'mm',
        snapEnabled: true,
        visible: true,
      },
    };

    return board;
  }

  private createLayerStackup(kicad: KiCadPCB): PCBLayerStackup {
    // Count copper layers
    const copperLayers = kicad.layers.filter((l) => l.name.endsWith('.Cu'));
    const copperCount = Math.max(2, copperLayers.length);

    const layers: PCBLayer[] = [];
    let order = 0;

    // Add copper layers
    for (const layer of copperLayers) {
      layers.push({
        id: layer.name,
        name: layer.userName ?? layer.name,
        type: 'copper',
        color: this.getLayerColor(layer.name),
        visible: true,
        locked: false,
        order: order++,
        copperWeight: 1,
      });
    }

    // Add other standard layers
    const otherLayers: Array<{ id: string; name: string; type: PCBLayer['type'] }> = [
      { id: 'F.SilkS', name: 'Front Silkscreen', type: 'silkscreen' },
      { id: 'B.SilkS', name: 'Back Silkscreen', type: 'silkscreen' },
      { id: 'F.Mask', name: 'Front Soldermask', type: 'soldermask' },
      { id: 'B.Mask', name: 'Back Soldermask', type: 'soldermask' },
      { id: 'F.Paste', name: 'Front Paste', type: 'solderpaste' },
      { id: 'B.Paste', name: 'Back Paste', type: 'solderpaste' },
      { id: 'Edge.Cuts', name: 'Board Outline', type: 'mechanical' },
    ];

    for (const layer of otherLayers) {
      layers.push({
        id: layer.id,
        name: layer.name,
        type: layer.type,
        color: this.getLayerColor(layer.id),
        visible: true,
        locked: false,
        order: order++,
      });
    }

    return {
      copperLayers: copperCount,
      layers,
      activeLayerId: 'F.Cu',
    };
  }

  private createDesignRules(kicad: KiCadPCB): DesignRules {
    const defaults = createDefaultDesignRules();

    // Get rules from net classes
    const defaultClass = kicad.netClasses.find((nc) => nc.name === 'Default');

    // Build net classes if present
    const netClasses = kicad.netClasses.length > 0
      ? kicad.netClasses.map((nc) => ({
          name: nc.name,
          ...(nc.description && { description: nc.description }),
          trackWidth: nc.traceWidth,
          clearance: nc.clearance,
          viaDrill: nc.viaDrill,
          viaDiameter: nc.viaDiameter,
          nets: nc.nets,
        }))
      : undefined;

    return {
      defaultTrackWidth: defaultClass?.traceWidth ?? defaults.defaultTrackWidth,
      minTrackWidth: defaults.minTrackWidth,
      defaultClearance: defaultClass?.clearance ?? defaults.defaultClearance,
      minClearance: defaults.minClearance,
      defaultViaDrill: defaultClass?.viaDrill ?? defaults.defaultViaDrill,
      minViaDrill: defaults.minViaDrill,
      defaultViaDiameter: defaultClass?.viaDiameter ?? defaults.defaultViaDiameter,
      minViaDiameter: defaults.minViaDiameter,
      minHoleToHole: defaults.minHoleToHole,
      minAnnularRing: defaults.minAnnularRing,
      minSilkToPad: defaults.minSilkToPad,
      minSilkToSilk: defaults.minSilkToSilk,
      ...(netClasses && { netClasses }),
    };
  }

  // ===========================================================================
  // Track Import
  // ===========================================================================

  private importTracks(kicad: KiCadPCB): PCBTrack[] {
    const tracks: PCBTrack[] = [];

    // Group segments by net and layer for efficiency
    const groupedSegments = new Map<string, KiCadSegment[]>();
    for (const segment of kicad.segments) {
      if (this.shouldImportLayer(segment.layer)) {
        const key = `${segment.net}-${segment.layer}-${segment.width}`;
        const group = groupedSegments.get(key) ?? [];
        group.push(segment);
        groupedSegments.set(key, group);
      }
    }

    // Create tracks from grouped segments
    for (const [_key, segments] of groupedSegments) {
      if (segments.length === 0) continue;

      const first = segments[0]!;
      const trackSegments: TrackSegment[] = segments.map((seg) => ({
        type: 'line' as const,
        start: this.convertPoint(seg.start),
        end: this.convertPoint(seg.end),
      }));

      const track: PCBTrack = {
        id: this.generateId(),
        type: 'TRACK',
        net: this.nets.get(first.net) ?? '',
        layer: first.layer,
        width: first.width * this.options.scale,
        segments: trackSegments,
        locked: first.locked ?? false,
      };

      tracks.push(track);
    }

    // Handle arc segments
    for (const arc of kicad.arcs) {
      if (!this.shouldImportLayer(arc.layer)) continue;

      const track: PCBTrack = {
        id: this.generateId(),
        type: 'TRACK',
        net: this.nets.get(arc.net) ?? '',
        layer: arc.layer,
        width: arc.width * this.options.scale,
        segments: [
          {
            type: 'arc' as const,
            start: this.convertPoint(arc.start),
            end: this.convertPoint(arc.end),
            center: this.convertPoint(arc.mid),
          },
        ],
        locked: arc.locked ?? false,
      };

      tracks.push(track);
    }

    return tracks;
  }

  // ===========================================================================
  // Via Import
  // ===========================================================================

  private importVias(kicad: KiCadPCB): PCBVia[] {
    return kicad.vias.map((via) => this.convertVia(via));
  }

  private convertVia(via: KiCadVia): PCBVia {
    let viaType: ViaType = 'through';
    if (via.viaType === 'blind') viaType = 'blind';
    else if (via.viaType === 'micro') viaType = 'micro';

    return {
      id: this.generateId(),
      type: 'VIA',
      net: this.nets.get(via.net) ?? '',
      viaType,
      position: this.convertPoint(via.at),
      drill: via.drill * this.options.scale,
      diameter: via.size * this.options.scale,
      startLayer: via.layers[0],
      endLayer: via.layers[1],
      tented: false,
      locked: via.locked ?? false,
    };
  }

  // ===========================================================================
  // Component Import
  // ===========================================================================

  private importComponents(kicad: KiCadPCB): {
    footprints: PCBFootprint[];
    components: PCBComponent[];
  } {
    const footprintMap = new Map<string, PCBFootprint>();
    const components: PCBComponent[] = [];

    for (const fp of kicad.footprints) {
      // Create or get footprint definition
      const fpKey = fp.library ? `${fp.library}:${fp.name}` : fp.name;
      if (!footprintMap.has(fpKey)) {
        footprintMap.set(fpKey, this.convertFootprint(fp));
      }

      // Create component instance
      const component = this.convertComponent(fp, fpKey);
      components.push(component);
    }

    return {
      footprints: Array.from(footprintMap.values()),
      components,
    };
  }

  private convertFootprint(fp: KiCadFootprint): PCBFootprint {
    // Convert pads
    const pads = fp.pads.map((pad) => this.convertPad(pad));

    // Convert graphics to silkscreen/courtyard/fab
    const silkscreen: FootprintGraphic[] = [];
    const fabrication: FootprintGraphic[] = [];
    const courtyard: Point[] = [];

    for (const graphic of fp.graphics) {
      if (graphic.layer.includes('SilkS')) {
        silkscreen.push(this.convertFpGraphic(graphic));
      } else if (graphic.layer.includes('Fab')) {
        fabrication.push(this.convertFpGraphic(graphic));
      } else if (graphic.layer.includes('CrtYd')) {
        // Extract courtyard points
        if (graphic.type === 'fp_rect') {
          courtyard.push(
            this.convertPoint(graphic.start),
            { x: graphic.end.x, y: graphic.start.y },
            this.convertPoint(graphic.end),
            { x: graphic.start.x, y: graphic.end.y }
          );
        } else if (graphic.type === 'fp_poly') {
          for (const pt of graphic.pts) {
            courtyard.push(this.convertPoint(pt));
          }
        }
      }
    }

    // Extract reference and value text
    const textFields: FootprintText[] = [];
    for (const graphic of fp.graphics) {
      if (graphic.type === 'fp_text') {
        textFields.push({
          type: graphic.textType,
          text: graphic.text,
          position: this.convertPoint(graphic.at),
          rotation: graphic.at.angle ?? 0,
          layer: graphic.layer,
          fontSize: graphic.effects?.font?.size.height ?? 1,
          visible: !graphic.hide,
        });
      }
    }

    // Determine category
    const category = this.determineCategory(fp);

    return {
      id: this.generateId(),
      name: fp.name,
      ...(fp.descr && { description: fp.descr }),
      category,
      keywords: fp.tags ?? [],
      refDesPrefix: this.getRefDesPrefix(fp),
      pads,
      silkscreen,
      courtyard,
      fabrication,
      ...(fp.model?.path && { model3D: fp.model.path }),
      origin: { x: 0, y: 0 },
      textFields,
    };
  }

  private convertPad(pad: KiCadPad): PCBPad {
    const padType = this.convertPadType(pad.padType);
    const shape = this.convertPadShape(pad.shape);

    // Build optional properties
    const drill = pad.drill
      ? {
          width: pad.drill.diameter * this.options.scale,
          height: (pad.drill.height ?? pad.drill.diameter) * this.options.scale,
          shape: (pad.drill.width ? 'oval' : 'circle') as 'circle' | 'oval',
        }
      : undefined;

    const roundRectRatio = pad.roundrectRatio;
    const soldermaskMargin = pad.solderMaskMargin !== undefined
      ? pad.solderMaskMargin * this.options.scale
      : undefined;
    const pasteMargin = pad.solderPasteMargin !== undefined
      ? pad.solderPasteMargin * this.options.scale
      : undefined;

    // Build the pad object with all properties
    const pcbPad: PCBPad = {
      id: this.generateId(),
      type: 'PAD',
      number: pad.number,
      net: pad.net?.name ?? '',
      padType,
      shape,
      position: this.convertPoint(pad.at),
      rotation: pad.at.angle ?? 0,
      size: {
        width: pad.size.width * this.options.scale,
        height: pad.size.height * this.options.scale,
      },
      layers: pad.layers,
      ...(drill && { drill }),
      ...(roundRectRatio !== undefined && { roundRectRatio }),
      ...(soldermaskMargin !== undefined && { soldermaskMargin }),
      ...(pasteMargin !== undefined && { pasteMargin }),
    };

    return pcbPad;
  }

  private convertComponent(fp: KiCadFootprint, footprintId: string): PCBComponent {
    // Find reference and value from text fields
    let reference = 'U?';
    let value = '';

    for (const graphic of fp.graphics) {
      if (graphic.type === 'fp_text') {
        if (graphic.textType === 'reference') {
          reference = graphic.text;
        } else if (graphic.textType === 'value') {
          value = graphic.text;
        }
      }
    }

    return {
      id: this.generateId(),
      type: 'COMPONENT',
      reference,
      value,
      footprintId,
      position: this.convertPoint(fp.at),
      rotation: fp.at.angle ?? 0,
      side: fp.layer === 'B.Cu' ? 'bottom' : 'top',
      locked: fp.locked ?? false,
    };
  }

  // ===========================================================================
  // Zone Import
  // ===========================================================================

  private importZones(kicad: KiCadPCB): PCBZone[] {
    return kicad.zones
      .filter((zone) => this.shouldImportLayer(zone.layer ?? ''))
      .map((zone) => this.convertZone(zone));
  }

  private convertZone(zone: KiCadZone): PCBZone {
    const outline = zone.polygon.map((pt: KiCadPoint) => this.convertPoint(pt));

    // Build optional properties
    const hatchOrientation = zone.fill?.hatchOrientation;
    const hatchWidth = zone.fill?.hatchThickness !== undefined
      ? zone.fill.hatchThickness * this.options.scale
      : undefined;
    const filledPolygons = zone.filledPolygons && zone.filledPolygons.length > 0
      ? zone.filledPolygons.map((poly: KiCadPoint[]) =>
          poly.map((pt: KiCadPoint) => this.convertPoint(pt))
        )
      : undefined;

    const pcbZone: PCBZone = {
      id: this.generateId(),
      type: 'ZONE',
      net: zone.netName,
      layer: zone.layer ?? 'F.Cu',
      outline,
      fillType: zone.fill?.mode === 'hatch' ? 'hatch' : 'solid',
      minWidth: (zone.minThickness ?? 0.25) * this.options.scale,
      clearance: (zone.fill?.thermalGap ?? 0.5) * this.options.scale,
      thermalRelief: {
        spokes: 4,
        spokeWidth: (zone.fill?.thermalBridgeWidth ?? 0.5) * this.options.scale,
        gap: (zone.fill?.thermalGap ?? 0.5) * this.options.scale,
      },
      priority: zone.priority ?? 0,
      filled: zone.fill?.yes ?? false,
      locked: zone.locked ?? false,
      ...(hatchOrientation !== undefined && { hatchOrientation }),
      ...(hatchWidth !== undefined && { hatchWidth }),
      ...(filledPolygons && { filledPolygons }),
    };

    return pcbZone;
  }

  // ===========================================================================
  // Conversion Helpers
  // ===========================================================================

  private convertPoint(pt: KiCadPoint): Point {
    return {
      x: pt.x * this.options.scale,
      y: pt.y * this.options.scale,
    };
  }

  private convertPadType(type: string): PadType {
    switch (type) {
      case 'smd':
        return 'smd';
      case 'connect':
        return 'connect';
      case 'np_thru_hole':
        return 'np_thru_hole';
      case 'thru_hole':
      default:
        return 'thru_hole';
    }
  }

  private convertPadShape(shape: string): PadShape {
    switch (shape) {
      case 'rect':
        return 'rect';
      case 'oval':
        return 'oval';
      case 'roundrect':
        return 'roundrect';
      case 'trapezoid':
        return 'trapezoid';
      case 'custom':
        return 'custom';
      case 'circle':
      default:
        return 'circle';
    }
  }

  private convertFpGraphic(graphic: KiCadFpGraphic): FootprintGraphic {
    switch (graphic.type) {
      case 'fp_line':
        return {
          type: 'line',
          layer: graphic.layer,
          width: graphic.width * this.options.scale,
          fill: 'none',
          points: [this.convertPoint(graphic.start), this.convertPoint(graphic.end)],
        };
      case 'fp_rect':
        return {
          type: 'rect',
          layer: graphic.layer,
          width: graphic.width * this.options.scale,
          fill: graphic.fill === 'solid' ? 'solid' : 'none',
          points: [this.convertPoint(graphic.start), this.convertPoint(graphic.end)],
        };
      case 'fp_circle':
        return {
          type: 'circle',
          layer: graphic.layer,
          width: graphic.width * this.options.scale,
          fill: graphic.fill === 'solid' ? 'solid' : 'none',
          center: this.convertPoint(graphic.center),
          radius: this.calculateRadius(graphic.center, graphic.end) * this.options.scale,
        };
      case 'fp_arc':
        return {
          type: 'arc',
          layer: graphic.layer,
          width: graphic.width * this.options.scale,
          fill: 'none',
          points: [
            this.convertPoint(graphic.start),
            this.convertPoint(graphic.mid ?? graphic.start),
            this.convertPoint(graphic.end),
          ],
        };
      case 'fp_poly':
        return {
          type: 'polygon',
          layer: graphic.layer,
          width: graphic.width * this.options.scale,
          fill: graphic.fill === 'solid' ? 'solid' : 'none',
          points: graphic.pts.map((pt) => this.convertPoint(pt)),
        };
      case 'fp_text':
        return {
          type: 'text',
          layer: graphic.layer,
          width: 0,
          fill: 'none',
          text: graphic.text,
          fontSize: graphic.effects?.font?.size.height ?? 1,
        };
      default:
        return {
          type: 'line',
          layer: 'F.SilkS',
          width: 0.15,
          fill: 'none',
        };
    }
  }

  private calculateRadius(center: KiCadPoint, edge: KiCadPoint): number {
    const dx = edge.x - center.x;
    const dy = edge.y - center.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private determineCategory(fp: KiCadFootprint): FootprintCategory {
    const name = fp.name.toLowerCase();
    const tags = (fp.tags ?? []).join(' ').toLowerCase();
    const attrs = (fp.attr ?? []).join(' ').toLowerCase();

    if (attrs.includes('smd')) {
      if (name.includes('soic') || name.includes('ssop') || name.includes('tssop') ||
          name.includes('qfp') || name.includes('qfn') || name.includes('bga')) {
        return 'smd-ic';
      }
      if (name.includes('sot') || name.includes('dpak')) {
        return 'smd-discrete';
      }
      if (/^\d{4}$/.test(name) || name.includes('0402') || name.includes('0603') ||
          name.includes('0805') || name.includes('1206')) {
        return 'smd-chip';
      }
      return 'smd-chip';
    }

    if (attrs.includes('through_hole')) {
      if (name.includes('dip') || name.includes('pdip') || name.includes('sip')) {
        return 'thru-hole-ic';
      }
      if (name.includes('to-') || name.includes('to92') || name.includes('to220')) {
        return 'thru-hole-discrete';
      }
      return 'thru-hole-passive';
    }

    if (name.includes('connector') || name.includes('header') || name.includes('usb') ||
        name.includes('pin') || tags.includes('connector')) {
      return 'connector';
    }

    if (name.includes('mounting') || name.includes('hole')) {
      return 'mounting';
    }

    return 'custom';
  }

  private getRefDesPrefix(fp: KiCadFootprint): string {
    // Try to get from reference text
    for (const graphic of fp.graphics) {
      if (graphic.type === 'fp_text' && graphic.textType === 'reference') {
        const match = graphic.text.match(/^([A-Z]+)/);
        if (match) return match[1]!;
      }
    }

    // Guess from footprint name/category
    const name = fp.name.toLowerCase();
    if (name.includes('resistor') || /^r[_\d]/.test(name)) return 'R';
    if (name.includes('capacitor') || /^c[_\d]/.test(name)) return 'C';
    if (name.includes('inductor') || /^l[_\d]/.test(name)) return 'L';
    if (name.includes('diode') || /^d[_\d]/.test(name)) return 'D';
    if (name.includes('transistor') || /^q[_\d]/.test(name)) return 'Q';
    if (name.includes('led')) return 'LED';
    if (name.includes('connector') || name.includes('header')) return 'J';
    if (name.includes('switch')) return 'SW';
    if (name.includes('fuse')) return 'F';

    return 'U';
  }

  private getLayerColor(layerName: string): RGBA {
    const colors: Record<string, RGBA> = {
      'F.Cu': { r: 0.8, g: 0.2, b: 0.2, a: 0.8 },
      'B.Cu': { r: 0.2, g: 0.2, b: 0.8, a: 0.8 },
      'In1.Cu': { r: 0.8, g: 0.8, b: 0.2, a: 0.8 },
      'In2.Cu': { r: 0.2, g: 0.8, b: 0.8, a: 0.8 },
      'F.SilkS': { r: 1, g: 1, b: 1, a: 1 },
      'B.SilkS': { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      'F.Mask': { r: 0.5, g: 0, b: 0.5, a: 0.5 },
      'B.Mask': { r: 0, g: 0.5, b: 0.5, a: 0.5 },
      'F.Paste': { r: 0.75, g: 0.75, b: 0.75, a: 0.5 },
      'B.Paste': { r: 0.5, g: 0.5, b: 0.5, a: 0.5 },
      'Edge.Cuts': { r: 1, g: 1, b: 0, a: 1 },
    };
    return colors[layerName] ?? { r: 0.5, g: 0.5, b: 0.5, a: 1 };
  }

  private shouldImportLayer(layer: string): boolean {
    if (this.options.layerFilter.length === 0) return true;
    return this.options.layerFilter.includes(layer);
  }

  private generateId(): NodeId {
    return `kicad-${Date.now()}-${++this.idCounter}` as NodeId;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Import a KiCad PCB file
 */
export function importKiCad(
  content: string,
  options?: KiCadImportOptions
): KiCadImportResult {
  const importer = new KiCadImporter(options);
  return importer.import(content);
}

/**
 * Create a KiCad importer instance
 */
export function createKiCadImporter(options?: KiCadImportOptions): KiCadImporter {
  return new KiCadImporter(options);
}
