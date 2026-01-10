/**
 * PCB Manager
 *
 * Manages PCB boards, components, tracks, and provides
 * design rule checking functionality.
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId } from '@core/types/common';
import type {
  PCBBoard,
  PCBTrack,
  PCBVia,
  PCBFootprint,
  PCBComponent,
  PCBZone,
  PCBUnits,
  DesignRules,
  DRCViolation,
  TrackSegment,
  ThermalRelief,
  ViaType,
} from '@core/types/pcb';
import {
  createPCBBoard,
  createPCBTrack,
  createPCBVia,
  createPCBComponent,
} from '@core/types/pcb';
import type { Point } from '@core/types/geometry';

// =============================================================================
// Types
// =============================================================================

/**
 * PCB Manager Events
 */
export interface PCBManagerEvents extends Record<string, unknown> {
  'board-created': { board: PCBBoard };
  'board-updated': { board: PCBBoard };
  'track-added': { boardId: string; track: PCBTrack };
  'track-removed': { boardId: string; trackId: NodeId };
  'via-added': { boardId: string; via: PCBVia };
  'via-removed': { boardId: string; viaId: NodeId };
  'component-added': { boardId: string; component: PCBComponent };
  'component-removed': { boardId: string; componentId: NodeId };
  'component-moved': { boardId: string; component: PCBComponent };
  'zone-added': { boardId: string; zone: PCBZone };
  'zone-removed': { boardId: string; zoneId: NodeId };
  'drc-started': { boardId: string };
  'drc-completed': { boardId: string; violations: DRCViolation[] };
  'footprint-registered': { footprint: PCBFootprint };
}

/**
 * Track routing options
 */
export interface TrackRoutingOptions {
  width?: number;
  layer: string;
  net?: string;
  viaOnLayerChange?: boolean;
}

/**
 * Component placement options
 */
export interface ComponentPlacementOptions {
  rotation?: number;
  side?: 'top' | 'bottom';
  locked?: boolean;
  value?: string;
}

// =============================================================================
// PCB Manager
// =============================================================================

/**
 * Manages PCB design operations
 */
export class PCBManager extends EventEmitter<PCBManagerEvents> {
  private boards: Map<string, PCBBoard> = new Map();
  private tracks: Map<string, Map<NodeId, PCBTrack>> = new Map();
  private vias: Map<string, Map<NodeId, PCBVia>> = new Map();
  private components: Map<string, Map<NodeId, PCBComponent>> = new Map();
  private zones: Map<string, Map<NodeId, PCBZone>> = new Map();
  private footprints: Map<string, PCBFootprint> = new Map();
  private activeBoard: string | null = null;

  // ===========================================================================
  // Board Management
  // ===========================================================================

  /**
   * Create a new PCB board
   */
  createBoard(
    name: string,
    width: number,
    height: number,
    options: {
      layers?: number;
      units?: PCBUnits;
      thickness?: number;
    } = {}
  ): PCBBoard {
    const board = createPCBBoard(name, width, height, options);

    this.boards.set(board.id, board);
    this.tracks.set(board.id, new Map());
    this.vias.set(board.id, new Map());
    this.components.set(board.id, new Map());
    this.zones.set(board.id, new Map());

    if (!this.activeBoard) {
      this.activeBoard = board.id;
    }

    this.emit('board-created', { board });
    return board;
  }

  /**
   * Get a board by ID
   */
  getBoard(id: string): PCBBoard | undefined {
    return this.boards.get(id);
  }

  /**
   * Get active board
   */
  getActiveBoard(): PCBBoard | undefined {
    return this.activeBoard ? this.boards.get(this.activeBoard) : undefined;
  }

  /**
   * Set active board
   */
  setActiveBoard(id: string): void {
    if (this.boards.has(id)) {
      this.activeBoard = id;
    }
  }

  /**
   * Get all boards
   */
  getAllBoards(): PCBBoard[] {
    return Array.from(this.boards.values());
  }

  /**
   * Update board design rules
   */
  updateDesignRules(boardId: string, rules: Partial<DesignRules>): void {
    const board = this.boards.get(boardId);
    if (!board) return;

    const updatedBoard: PCBBoard = {
      ...board,
      designRules: { ...board.designRules, ...rules },
    };

    this.boards.set(boardId, updatedBoard);
    this.emit('board-updated', { board: updatedBoard });
  }

  // ===========================================================================
  // Footprint Management
  // ===========================================================================

  /**
   * Register a footprint
   */
  registerFootprint(footprint: PCBFootprint): void {
    this.footprints.set(footprint.id, footprint);
    this.emit('footprint-registered', { footprint });
  }

  /**
   * Get a footprint by ID
   */
  getFootprint(id: string): PCBFootprint | undefined {
    return this.footprints.get(id);
  }

  /**
   * Get all footprints
   */
  getAllFootprints(): PCBFootprint[] {
    return Array.from(this.footprints.values());
  }

  /**
   * Search footprints
   */
  searchFootprints(query: string): PCBFootprint[] {
    const q = query.toLowerCase();
    return Array.from(this.footprints.values()).filter(
      (fp) =>
        fp.name.toLowerCase().includes(q) ||
        fp.description?.toLowerCase().includes(q) ||
        fp.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }

  // ===========================================================================
  // Component Placement
  // ===========================================================================

  /**
   * Place a component on the board
   */
  placeComponent(
    boardId: string,
    footprintId: string,
    reference: string,
    position: Point,
    options: ComponentPlacementOptions = {}
  ): PCBComponent | null {
    const board = this.boards.get(boardId);
    const footprint = this.footprints.get(footprintId);

    if (!board || !footprint) return null;

    const componentOptions: { value?: string; rotation?: number; side?: 'top' | 'bottom' } = {};
    if (options.rotation !== undefined) componentOptions.rotation = options.rotation;
    if (options.side !== undefined) componentOptions.side = options.side;
    if (options.value !== undefined) componentOptions.value = options.value;

    const component = createPCBComponent(reference, footprintId, position, componentOptions);

    const boardComponents = this.components.get(boardId);
    if (boardComponents) {
      boardComponents.set(component.id, component);
      this.emit('component-added', { boardId, component });
    }

    return component;
  }

  /**
   * Move a component
   */
  moveComponent(boardId: string, componentId: NodeId, position: Point): void {
    const boardComponents = this.components.get(boardId);
    if (!boardComponents) return;

    const component = boardComponents.get(componentId);
    if (!component || component.locked) return;

    const updated: PCBComponent = { ...component, position };
    boardComponents.set(componentId, updated);
    this.emit('component-moved', { boardId, component: updated });
  }

  /**
   * Rotate a component
   */
  rotateComponent(boardId: string, componentId: NodeId, angle: number): void {
    const boardComponents = this.components.get(boardId);
    if (!boardComponents) return;

    const component = boardComponents.get(componentId);
    if (!component || component.locked) return;

    const updated: PCBComponent = {
      ...component,
      rotation: (component.rotation + angle) % 360,
    };
    boardComponents.set(componentId, updated);
    this.emit('component-moved', { boardId, component: updated });
  }

  /**
   * Flip a component (move to other side)
   */
  flipComponent(boardId: string, componentId: NodeId): void {
    const boardComponents = this.components.get(boardId);
    if (!boardComponents) return;

    const component = boardComponents.get(componentId);
    if (!component || component.locked) return;

    const updated: PCBComponent = {
      ...component,
      side: component.side === 'top' ? 'bottom' : 'top',
    };
    boardComponents.set(componentId, updated);
    this.emit('component-moved', { boardId, component: updated });
  }

  /**
   * Remove a component
   */
  removeComponent(boardId: string, componentId: NodeId): void {
    const boardComponents = this.components.get(boardId);
    if (!boardComponents) return;

    if (boardComponents.delete(componentId)) {
      this.emit('component-removed', { boardId, componentId });
    }
  }

  /**
   * Get components on a board
   */
  getComponents(boardId: string): PCBComponent[] {
    const boardComponents = this.components.get(boardId);
    return boardComponents ? Array.from(boardComponents.values()) : [];
  }

  // ===========================================================================
  // Track Routing
  // ===========================================================================

  /**
   * Add a track
   */
  addTrack(
    boardId: string,
    segments: TrackSegment[],
    options: TrackRoutingOptions
  ): PCBTrack | null {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const width = options.width ?? board.designRules.defaultTrackWidth;
    const track = createPCBTrack(options.net ?? '', options.layer, segments, width);

    const boardTracks = this.tracks.get(boardId);
    if (boardTracks) {
      boardTracks.set(track.id, track);
      this.emit('track-added', { boardId, track });
    }

    return track;
  }

  /**
   * Remove a track
   */
  removeTrack(boardId: string, trackId: NodeId): void {
    const boardTracks = this.tracks.get(boardId);
    if (!boardTracks) return;

    if (boardTracks.delete(trackId)) {
      this.emit('track-removed', { boardId, trackId });
    }
  }

  /**
   * Get tracks on a board
   */
  getTracks(boardId: string): PCBTrack[] {
    const boardTracks = this.tracks.get(boardId);
    return boardTracks ? Array.from(boardTracks.values()) : [];
  }

  /**
   * Get tracks on a specific layer
   */
  getTracksOnLayer(boardId: string, layer: string): PCBTrack[] {
    return this.getTracks(boardId).filter((t) => t.layer === layer);
  }

  // ===========================================================================
  // Via Management
  // ===========================================================================

  /**
   * Add a via
   */
  addVia(
    boardId: string,
    position: Point,
    options: {
      viaType?: 'through' | 'blind' | 'buried' | 'micro';
      drill?: number;
      diameter?: number;
      startLayer?: string;
      endLayer?: string;
      net?: string;
    } = {}
  ): PCBVia | null {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const viaOptions: {
      viaType?: ViaType;
      drill?: number;
      diameter?: number;
      startLayer?: string;
      endLayer?: string;
    } = {
      drill: options.drill ?? board.designRules.defaultViaDrill,
      diameter: options.diameter ?? board.designRules.defaultViaDiameter,
    };
    if (options.viaType !== undefined) viaOptions.viaType = options.viaType;
    if (options.startLayer !== undefined) viaOptions.startLayer = options.startLayer;
    if (options.endLayer !== undefined) viaOptions.endLayer = options.endLayer;

    const via = createPCBVia(options.net ?? '', position, viaOptions);

    const boardVias = this.vias.get(boardId);
    if (boardVias) {
      boardVias.set(via.id, via);
      this.emit('via-added', { boardId, via });
    }

    return via;
  }

  /**
   * Remove a via
   */
  removeVia(boardId: string, viaId: NodeId): void {
    const boardVias = this.vias.get(boardId);
    if (!boardVias) return;

    if (boardVias.delete(viaId)) {
      this.emit('via-removed', { boardId, viaId });
    }
  }

  /**
   * Get vias on a board
   */
  getVias(boardId: string): PCBVia[] {
    const boardVias = this.vias.get(boardId);
    return boardVias ? Array.from(boardVias.values()) : [];
  }

  // ===========================================================================
  // Zone Management
  // ===========================================================================

  /**
   * Add a copper zone
   */
  addZone(
    boardId: string,
    outline: Point[],
    layer: string,
    options: {
      net?: string;
      priority?: number;
      minWidth?: number;
      clearance?: number;
      fillType?: 'solid' | 'hatch';
      hatchOrientation?: number;
      hatchWidth?: number;
    } = {}
  ): PCBZone | null {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const thermalRelief: ThermalRelief = {
      spokes: 4,
      spokeWidth: 0.5,
      gap: 0.5,
    };

    const zone: PCBZone = {
      id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` as NodeId,
      type: 'ZONE',
      outline,
      layer,
      net: options.net ?? '',
      priority: options.priority ?? 0,
      minWidth: options.minWidth ?? board.designRules.minTrackWidth,
      clearance: options.clearance ?? board.designRules.defaultClearance,
      fillType: options.fillType ?? 'solid',
      thermalRelief,
      filled: false,
      locked: false,
    };

    // Add optional hatch properties only if defined
    let finalZone = zone;
    if (options.hatchOrientation !== undefined) {
      finalZone = { ...finalZone, hatchOrientation: options.hatchOrientation };
    }
    if (options.hatchWidth !== undefined) {
      finalZone = { ...finalZone, hatchWidth: options.hatchWidth };
    }

    const boardZones = this.zones.get(boardId);
    if (boardZones) {
      boardZones.set(finalZone.id, finalZone);
      this.emit('zone-added', { boardId, zone: finalZone });
    }

    return finalZone;
  }

  /**
   * Remove a zone
   */
  removeZone(boardId: string, zoneId: NodeId): void {
    const boardZones = this.zones.get(boardId);
    if (!boardZones) return;

    if (boardZones.delete(zoneId)) {
      this.emit('zone-removed', { boardId, zoneId });
    }
  }

  /**
   * Get zones on a board
   */
  getZones(boardId: string): PCBZone[] {
    const boardZones = this.zones.get(boardId);
    return boardZones ? Array.from(boardZones.values()) : [];
  }

  // ===========================================================================
  // Design Rule Check (DRC)
  // ===========================================================================

  /**
   * Run design rule check
   */
  runDRC(boardId: string): DRCViolation[] {
    const board = this.boards.get(boardId);
    if (!board) return [];

    this.emit('drc-started', { boardId });

    const violations: DRCViolation[] = [];

    // Check track clearances
    violations.push(...this.checkTrackClearances(boardId, board));

    // Check via clearances
    violations.push(...this.checkViaClearances(boardId, board));

    // Check track widths
    violations.push(...this.checkTrackWidths(boardId, board));

    // Check pad clearances
    violations.push(...this.checkPadClearances(boardId, board));

    // Check annular ring
    violations.push(...this.checkAnnularRing(boardId, board));

    // Check drill sizes
    violations.push(...this.checkDrillSizes(boardId, board));

    // Check hole-to-hole spacing
    violations.push(...this.checkHoleToHole(boardId, board));

    // Check silkscreen clearances
    violations.push(...this.checkSilkscreenClearances(boardId, board));

    // Check courtyard overlaps
    violations.push(...this.checkCourtyardOverlaps(boardId, board));

    this.emit('drc-completed', { boardId, violations });
    return violations;
  }

  /**
   * Check track clearances
   */
  private checkTrackClearances(boardId: string, board: PCBBoard): DRCViolation[] {
    const violations: DRCViolation[] = [];
    const tracks = this.getTracks(boardId);
    const minClearance = board.designRules.minClearance;

    // Check each track pair on the same layer
    for (let i = 0; i < tracks.length; i++) {
      for (let j = i + 1; j < tracks.length; j++) {
        const t1 = tracks[i]!;
        const t2 = tracks[j]!;

        if (t1.layer !== t2.layer) continue;
        if (t1.net && t1.net === t2.net) continue; // Same net

        // Check clearance between segments
        for (const seg1 of t1.segments) {
          for (const seg2 of t2.segments) {
            const distance = this.segmentToSegmentDistance(seg1, seg2);
            if (distance < minClearance) {
              violations.push({
                type: 'clearance',
                severity: 'error',
                description: `Track clearance violation: ${distance.toFixed(3)}mm < ${minClearance}mm`,
                position: seg1.start,
                objectIds: [t1.id, t2.id],
                layers: [t1.layer],
                actualValue: distance,
                ruleValue: minClearance,
              });
            }
          }
        }
      }
    }

    return violations;
  }

  /**
   * Check via clearances
   */
  private checkViaClearances(boardId: string, board: PCBBoard): DRCViolation[] {
    const violations: DRCViolation[] = [];
    const vias = this.getVias(boardId);
    const minClearance = board.designRules.minClearance;

    // Check via-to-via clearance
    for (let i = 0; i < vias.length; i++) {
      for (let j = i + 1; j < vias.length; j++) {
        const v1 = vias[i]!;
        const v2 = vias[j]!;

        if (v1.net && v1.net === v2.net) continue;

        const distance = this.pointDistance(v1.position, v2.position);
        const requiredDistance = (v1.diameter + v2.diameter) / 2 + minClearance;

        if (distance < requiredDistance) {
          violations.push({
            type: 'clearance',
            severity: 'error',
            description: `Via clearance violation`,
            position: v1.position,
            objectIds: [v1.id, v2.id],
            layers: ['*.Cu'],
            actualValue: distance - (v1.diameter + v2.diameter) / 2,
            ruleValue: minClearance,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check track widths
   */
  private checkTrackWidths(boardId: string, board: PCBBoard): DRCViolation[] {
    const violations: DRCViolation[] = [];
    const tracks = this.getTracks(boardId);
    const minWidth = board.designRules.minTrackWidth;

    for (const track of tracks) {
      if (track.width < minWidth) {
        violations.push({
          type: 'track_width',
          severity: 'error',
          description: `Track width ${track.width}mm < minimum ${minWidth}mm`,
          position: track.segments[0]?.start ?? { x: 0, y: 0 },
          objectIds: [track.id],
          layers: [track.layer],
          actualValue: track.width,
          ruleValue: minWidth,
        });
      }
    }

    return violations;
  }

  /**
   * Check pad clearances
   */
  private checkPadClearances(boardId: string, board: PCBBoard): DRCViolation[] {
    const violations: DRCViolation[] = [];
    const components = this.getComponents(boardId);
    const tracks = this.getTracks(boardId);
    const minClearance = board.designRules.minClearance;

    // Get all pads from all components
    const allPads: Array<{ pad: { position: Point; size: { width: number; height: number }; net: string; layers: string[] }; component: PCBComponent; worldPos: Point }> = [];

    for (const component of components) {
      const footprint = this.footprints.get(component.footprintId);
      if (!footprint) continue;

      for (const pad of footprint.pads) {
        // Transform pad position to world coordinates
        const worldPos = this.transformPoint(pad.position, component);
        allPads.push({
          pad: { position: pad.position, size: pad.size, net: pad.net, layers: pad.layers },
          component,
          worldPos,
        });
      }
    }

    // Check pad-to-track clearance
    for (const { pad, component, worldPos } of allPads) {
      for (const track of tracks) {
        // Skip if same net
        if (pad.net && pad.net === track.net) continue;

        // Check if track is on same layer
        const padLayers = pad.layers;
        if (!padLayers.some(l => l === track.layer || l === '*.Cu')) continue;

        // Simple clearance check (point to segment)
        for (const seg of track.segments) {
          const distance = this.pointToSegmentDistance(worldPos, seg);
          const padRadius = Math.max(pad.size.width, pad.size.height) / 2;
          const actualClearance = distance - padRadius - track.width / 2;

          if (actualClearance < minClearance) {
            violations.push({
              type: 'clearance',
              severity: 'error',
              description: `Pad-track clearance violation on ${component.reference}`,
              position: worldPos,
              objectIds: [component.id, track.id],
              layers: [track.layer],
              actualValue: actualClearance,
              ruleValue: minClearance,
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Check via annular ring
   */
  private checkAnnularRing(boardId: string, board: PCBBoard): DRCViolation[] {
    const violations: DRCViolation[] = [];
    const vias = this.getVias(boardId);
    const minAnnularRing = board.designRules.minAnnularRing;

    for (const via of vias) {
      const annularRing = (via.diameter - via.drill) / 2;
      if (annularRing < minAnnularRing) {
        violations.push({
          type: 'annular_ring',
          severity: 'error',
          description: `Via annular ring ${annularRing.toFixed(3)}mm < minimum ${minAnnularRing}mm`,
          position: via.position,
          objectIds: [via.id],
          layers: ['*.Cu'],
          actualValue: annularRing,
          ruleValue: minAnnularRing,
        });
      }
    }

    // Check pad annular rings for through-hole pads
    const components = this.getComponents(boardId);
    for (const component of components) {
      const footprint = this.footprints.get(component.footprintId);
      if (!footprint) continue;

      for (const pad of footprint.pads) {
        if (pad.padType !== 'thru_hole' || !pad.drill) continue;

        const drillDia = pad.drill.width;
        const padMinDim = Math.min(pad.size.width, pad.size.height);
        const annularRing = (padMinDim - drillDia) / 2;

        if (annularRing < minAnnularRing) {
          const worldPos = this.transformPoint(pad.position, component);
          violations.push({
            type: 'annular_ring',
            severity: 'error',
            description: `Pad ${pad.number} on ${component.reference} annular ring ${annularRing.toFixed(3)}mm < minimum ${minAnnularRing}mm`,
            position: worldPos,
            objectIds: [component.id],
            layers: pad.layers,
            actualValue: annularRing,
            ruleValue: minAnnularRing,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check drill sizes
   */
  private checkDrillSizes(boardId: string, board: PCBBoard): DRCViolation[] {
    const violations: DRCViolation[] = [];
    const vias = this.getVias(boardId);
    const minViaDrill = board.designRules.minViaDrill;

    // Check via drill sizes
    for (const via of vias) {
      if (via.drill < minViaDrill) {
        violations.push({
          type: 'drill_size',
          severity: 'error',
          description: `Via drill ${via.drill}mm < minimum ${minViaDrill}mm`,
          position: via.position,
          objectIds: [via.id],
          layers: ['*.Cu'],
          actualValue: via.drill,
          ruleValue: minViaDrill,
        });
      }
    }

    // Check through-hole pad drill sizes
    const components = this.getComponents(boardId);
    for (const component of components) {
      const footprint = this.footprints.get(component.footprintId);
      if (!footprint) continue;

      for (const pad of footprint.pads) {
        if ((pad.padType !== 'thru_hole' && pad.padType !== 'np_thru_hole') || !pad.drill) continue;

        const drillDia = pad.drill.width;
        if (drillDia < minViaDrill) {
          const worldPos = this.transformPoint(pad.position, component);
          violations.push({
            type: 'drill_size',
            severity: 'error',
            description: `Pad ${pad.number} on ${component.reference} drill ${drillDia}mm < minimum ${minViaDrill}mm`,
            position: worldPos,
            objectIds: [component.id],
            layers: pad.layers,
            actualValue: drillDia,
            ruleValue: minViaDrill,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check hole-to-hole spacing
   */
  private checkHoleToHole(boardId: string, board: PCBBoard): DRCViolation[] {
    const violations: DRCViolation[] = [];
    const minHoleToHole = board.designRules.minHoleToHole;

    // Collect all holes (vias + through-hole pads)
    interface HoleInfo {
      id: NodeId;
      position: Point;
      diameter: number;
      type: 'via' | 'pad';
      reference?: string;
    }

    const holes: HoleInfo[] = [];

    // Add vias
    const vias = this.getVias(boardId);
    for (const via of vias) {
      holes.push({
        id: via.id,
        position: via.position,
        diameter: via.drill,
        type: 'via',
      });
    }

    // Add through-hole pads
    const components = this.getComponents(boardId);
    for (const component of components) {
      const footprint = this.footprints.get(component.footprintId);
      if (!footprint) continue;

      for (const pad of footprint.pads) {
        if ((pad.padType !== 'thru_hole' && pad.padType !== 'np_thru_hole') || !pad.drill) continue;

        const worldPos = this.transformPoint(pad.position, component);
        holes.push({
          id: component.id,
          position: worldPos,
          diameter: pad.drill.width,
          type: 'pad',
          reference: `${component.reference}.${pad.number}`,
        });
      }
    }

    // Check all hole pairs
    for (let i = 0; i < holes.length; i++) {
      for (let j = i + 1; j < holes.length; j++) {
        const h1 = holes[i]!;
        const h2 = holes[j]!;

        const distance = this.pointDistance(h1.position, h2.position);
        // Edge-to-edge distance
        const edgeDistance = distance - (h1.diameter + h2.diameter) / 2;

        if (edgeDistance < minHoleToHole) {
          const h1Name = h1.type === 'via' ? 'Via' : h1.reference;
          const h2Name = h2.type === 'via' ? 'Via' : h2.reference;
          violations.push({
            type: 'hole_to_hole',
            severity: 'error',
            description: `Hole spacing ${h1Name} to ${h2Name}: ${edgeDistance.toFixed(3)}mm < minimum ${minHoleToHole}mm`,
            position: h1.position,
            objectIds: [h1.id, h2.id],
            layers: ['*.Cu'],
            actualValue: edgeDistance,
            ruleValue: minHoleToHole,
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check silkscreen clearances
   */
  private checkSilkscreenClearances(boardId: string, board: PCBBoard): DRCViolation[] {
    const violations: DRCViolation[] = [];
    const minSilkToPad = board.designRules.minSilkToPad;
    const components = this.getComponents(boardId);

    // Collect all pads with world positions
    interface PadInfo {
      position: Point;
      size: { width: number; height: number };
      componentId: NodeId;
      reference: string;
    }

    const allPads: PadInfo[] = [];

    for (const component of components) {
      const footprint = this.footprints.get(component.footprintId);
      if (!footprint) continue;

      for (const pad of footprint.pads) {
        const worldPos = this.transformPoint(pad.position, component);
        allPads.push({
          position: worldPos,
          size: pad.size,
          componentId: component.id,
          reference: `${component.reference}.${pad.number}`,
        });
      }
    }

    // Check each component's silkscreen against all pads
    for (const component of components) {
      const footprint = this.footprints.get(component.footprintId);
      if (!footprint) continue;

      for (const silk of footprint.silkscreen) {
        // Get silkscreen bounds/points
        const silkPoints = this.getSilkscreenPoints(silk, component);

        for (const silkPoint of silkPoints) {
          for (const pad of allPads) {
            // Simple distance check from silk point to pad center
            const distance = this.pointDistance(silkPoint, pad.position);
            const padRadius = Math.max(pad.size.width, pad.size.height) / 2;
            const clearance = distance - padRadius;

            if (clearance < minSilkToPad) {
              violations.push({
                type: 'silk_overlap',
                severity: 'warning',
                description: `Silkscreen too close to pad ${pad.reference}: ${clearance.toFixed(3)}mm < ${minSilkToPad}mm`,
                position: silkPoint,
                objectIds: [component.id, pad.componentId],
                layers: [silk.layer],
                actualValue: clearance,
                ruleValue: minSilkToPad,
              });
              break; // One violation per silk element is enough
            }
          }
        }
      }
    }

    return violations;
  }

  /**
   * Get points representing a silkscreen graphic
   */
  private getSilkscreenPoints(
    graphic: { type: string; points?: Point[]; center?: Point; radius?: number; width: number },
    component: PCBComponent
  ): Point[] {
    const points: Point[] = [];

    switch (graphic.type) {
      case 'line':
        if (graphic.points && graphic.points.length >= 2) {
          points.push(this.transformPoint(graphic.points[0]!, component));
          points.push(this.transformPoint(graphic.points[1]!, component));
        }
        break;
      case 'rect':
        if (graphic.points && graphic.points.length >= 2) {
          const p1 = graphic.points[0]!;
          const p2 = graphic.points[1]!;
          // Add corners
          points.push(this.transformPoint({ x: p1.x, y: p1.y }, component));
          points.push(this.transformPoint({ x: p2.x, y: p1.y }, component));
          points.push(this.transformPoint({ x: p2.x, y: p2.y }, component));
          points.push(this.transformPoint({ x: p1.x, y: p2.y }, component));
        }
        break;
      case 'circle':
        if (graphic.center && graphic.radius) {
          const center = this.transformPoint(graphic.center, component);
          // Sample points around circle
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            points.push({
              x: center.x + graphic.radius * Math.cos(angle),
              y: center.y + graphic.radius * Math.sin(angle),
            });
          }
        }
        break;
      case 'polygon':
        if (graphic.points) {
          for (const p of graphic.points) {
            points.push(this.transformPoint(p, component));
          }
        }
        break;
    }

    return points;
  }

  /**
   * Check courtyard overlaps
   */
  private checkCourtyardOverlaps(boardId: string, _board: PCBBoard): DRCViolation[] {
    const violations: DRCViolation[] = [];
    const components = this.getComponents(boardId);

    // Get courtyards for all components
    interface CourtyardInfo {
      component: PCBComponent;
      polygon: Point[];
      bounds: { minX: number; maxX: number; minY: number; maxY: number };
    }

    const courtyards: CourtyardInfo[] = [];

    for (const component of components) {
      const footprint = this.footprints.get(component.footprintId);
      if (!footprint || footprint.courtyard.length < 3) continue;

      // Transform courtyard to world coordinates
      const polygon = footprint.courtyard.map((p) => this.transformPoint(p, component));

      // Calculate bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of polygon) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }

      courtyards.push({
        component,
        polygon,
        bounds: { minX, maxX, minY, maxY },
      });
    }

    // Check for overlaps between components on the same side
    for (let i = 0; i < courtyards.length; i++) {
      for (let j = i + 1; j < courtyards.length; j++) {
        const c1 = courtyards[i]!;
        const c2 = courtyards[j]!;

        // Skip if components are on different sides
        if (c1.component.side !== c2.component.side) continue;

        // Quick bounding box check
        if (
          c1.bounds.maxX < c2.bounds.minX ||
          c2.bounds.maxX < c1.bounds.minX ||
          c1.bounds.maxY < c2.bounds.minY ||
          c2.bounds.maxY < c1.bounds.minY
        ) {
          continue; // No overlap possible
        }

        // Detailed polygon intersection check
        if (this.polygonsIntersect(c1.polygon, c2.polygon)) {
          violations.push({
            type: 'courtyard',
            severity: 'error',
            description: `Courtyard overlap: ${c1.component.reference} and ${c2.component.reference}`,
            position: c1.component.position,
            objectIds: [c1.component.id, c2.component.id],
            layers: [c1.component.side === 'top' ? 'F.CrtYd' : 'B.CrtYd'],
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check if two polygons intersect
   */
  private polygonsIntersect(poly1: Point[], poly2: Point[]): boolean {
    // Check if any edge of poly1 intersects any edge of poly2
    for (let i = 0; i < poly1.length; i++) {
      const a1 = poly1[i]!;
      const a2 = poly1[(i + 1) % poly1.length]!;

      for (let j = 0; j < poly2.length; j++) {
        const b1 = poly2[j]!;
        const b2 = poly2[(j + 1) % poly2.length]!;

        if (this.segmentsIntersect(a1, a2, b1, b2)) {
          return true;
        }
      }
    }

    // Check if poly1 is entirely inside poly2 or vice versa
    if (poly1.length > 0 && this.pointInPolygon(poly1[0]!, poly2)) {
      return true;
    }
    if (poly2.length > 0 && this.pointInPolygon(poly2[0]!, poly1)) {
      return true;
    }

    return false;
  }

  /**
   * Check if two line segments intersect
   */
  private segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
    const d1 = this.crossProduct(b2, b1, a1);
    const d2 = this.crossProduct(b2, b1, a2);
    const d3 = this.crossProduct(a2, a1, b1);
    const d4 = this.crossProduct(a2, a1, b2);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      return true;
    }

    return false;
  }

  /**
   * Cross product for orientation test
   */
  private crossProduct(a: Point, b: Point, c: Point): number {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  }

  /**
   * Check if a point is inside a polygon using ray casting
   */
  private pointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const pi = polygon[i]!;
      const pj = polygon[j]!;

      if (
        ((pi.y > point.y) !== (pj.y > point.y)) &&
        (point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x)
      ) {
        inside = !inside;
      }
    }

    return inside;
  }

  // ===========================================================================
  // Geometry Helpers
  // ===========================================================================

  /**
   * Distance between two points
   */
  private pointDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Distance from point to line segment
   */
  private pointToSegmentDistance(
    point: Point,
    segment: TrackSegment
  ): number {
    const { start, end } = segment;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return this.pointDistance(point, start);
    }

    let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const closest = {
      x: start.x + t * dx,
      y: start.y + t * dy,
    };

    return this.pointDistance(point, closest);
  }

  /**
   * Approximate distance between two line segments
   */
  private segmentToSegmentDistance(
    seg1: TrackSegment,
    seg2: TrackSegment
  ): number {
    // Simplified: check endpoints to endpoints
    const distances = [
      this.pointToSegmentDistance(seg1.start, seg2),
      this.pointToSegmentDistance(seg1.end, seg2),
      this.pointToSegmentDistance(seg2.start, seg1),
      this.pointToSegmentDistance(seg2.end, seg1),
    ];
    return Math.min(...distances);
  }

  /**
   * Transform a point by component position/rotation
   */
  private transformPoint(point: Point, component: PCBComponent): Point {
    const rad = (component.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return {
      x: component.position.x + point.x * cos - point.y * sin,
      y: component.position.y + point.x * sin + point.y * cos,
    };
  }

  // ===========================================================================
  // Serialization
  // ===========================================================================

  /**
   * Export board to JSON
   */
  exportBoardToJSON(boardId: string): string | null {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const data = {
      board,
      tracks: this.getTracks(boardId),
      vias: this.getVias(boardId),
      components: this.getComponents(boardId),
      zones: this.getZones(boardId),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import board from JSON
   */
  importBoardFromJSON(json: string): PCBBoard | null {
    try {
      const data = JSON.parse(json) as {
        board: PCBBoard;
        tracks: PCBTrack[];
        vias: PCBVia[];
        components: PCBComponent[];
        zones: PCBZone[];
      };

      const board = data.board;
      this.boards.set(board.id, board);

      const boardTracks = new Map<NodeId, PCBTrack>();
      for (const track of data.tracks) {
        boardTracks.set(track.id, track);
      }
      this.tracks.set(board.id, boardTracks);

      const boardVias = new Map<NodeId, PCBVia>();
      for (const via of data.vias) {
        boardVias.set(via.id, via);
      }
      this.vias.set(board.id, boardVias);

      const boardComponents = new Map<NodeId, PCBComponent>();
      for (const component of data.components) {
        boardComponents.set(component.id, component);
      }
      this.components.set(board.id, boardComponents);

      const boardZones = new Map<NodeId, PCBZone>();
      for (const zone of data.zones) {
        boardZones.set(zone.id, zone);
      }
      this.zones.set(board.id, boardZones);

      this.emit('board-created', { board });
      return board;
    } catch {
      console.error('Failed to import PCB board');
      return null;
    }
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a PCB manager instance
 */
export function createPCBManager(): PCBManager {
  return new PCBManager();
}
