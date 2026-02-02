/**
 * Schematic Manager
 *
 * Manages schematic capture operations:
 * - Wire/net connectivity tracking
 * - Junction management
 * - Net labeling
 * - Electrical rule checking (ERC)
 */

import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import {
  type WireSegment,
  type Junction,
  type Net,
  type NetLabel,
  type Bus,
  type PinReference,
  type SchematicPin,
  type ERCError,
  createJunction,
  createNet,
  pointsConnect,
  wireIntersection,
} from '@core/types/schematic';

/**
 * Schematic manager configuration
 */
export interface SchematicManagerConfig {
  /** Tolerance for connection detection */
  readonly connectionTolerance: number;
  /** Auto-assign net names */
  readonly autoNetNames: boolean;
  /** Run ERC on changes */
  readonly autoERC: boolean;
}

const DEFAULT_CONFIG: SchematicManagerConfig = {
  connectionTolerance: 5,
  autoNetNames: true,
  autoERC: false,
};

/**
 * Component with pins for schematic
 */
export interface SchematicComponent {
  /** Component instance ID */
  readonly id: NodeId;
  /** Component position */
  readonly position: Point;
  /** Rotation in degrees */
  readonly rotation: number;
  /** Pin definitions */
  readonly pins: SchematicPin[];
  /** Reference designator */
  readonly refDes: string;
}

/**
 * Schematic Manager
 */
export class SchematicManager {
  private config: SchematicManagerConfig;

  // Data storage
  private wires: Map<string, WireSegment> = new Map();
  private junctions: Map<string, Junction> = new Map();
  private nets: Map<string, Net> = new Map();
  private netLabels: Map<string, NetLabel> = new Map();
  private buses: Map<string, Bus> = new Map();
  private components: Map<NodeId, SchematicComponent> = new Map();

  // Connectivity cache
  private netsByWire: Map<string, string> = new Map();
  private wiresByNet: Map<string, Set<string>> = new Map();
  private pinConnections: Map<string, string> = new Map(); // "componentId:pinId" -> netId

  // Callbacks
  private onNetlistChange?: () => void;
  private onERCComplete?: (errors: ERCError[]) => void;

  constructor(config: Partial<SchematicManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set callbacks
   */
  setOnNetlistChange(callback: () => void): void {
    this.onNetlistChange = callback;
  }

  setOnERCComplete(callback: (errors: ERCError[]) => void): void {
    this.onERCComplete = callback;
  }

  // =========================================================================
  // Wire Management
  // =========================================================================

  /**
   * Add a wire segment
   */
  addWire(wire: WireSegment): void {
    this.wires.set(wire.id, wire);
    this.updateConnectivity();
    this.checkAutoJunctions(wire);
  }

  /**
   * Add multiple wire segments
   */
  addWires(wires: WireSegment[]): void {
    for (const wire of wires) {
      this.wires.set(wire.id, wire);
    }
    this.updateConnectivity();
    for (const wire of wires) {
      this.checkAutoJunctions(wire);
    }
  }

  /**
   * Remove a wire segment
   */
  removeWire(wireId: string): void {
    this.wires.delete(wireId);
    this.updateConnectivity();
  }

  /**
   * Get all wires
   */
  getWires(): WireSegment[] {
    return Array.from(this.wires.values());
  }

  /**
   * Get wire by ID
   */
  getWire(wireId: string): WireSegment | undefined {
    return this.wires.get(wireId);
  }

  /**
   * Find wires at a point
   */
  findWiresAtPoint(point: Point): WireSegment[] {
    const result: WireSegment[] = [];
    const tolerance = this.config.connectionTolerance;

    for (const wire of this.wires.values()) {
      if (pointsConnect(point, wire.start, tolerance) ||
          pointsConnect(point, wire.end, tolerance) ||
          this.isPointOnWire(point, wire)) {
        result.push(wire);
      }
    }

    return result;
  }

  // =========================================================================
  // Junction Management
  // =========================================================================

  /**
   * Add a junction
   */
  addJunction(junction: Junction): void {
    this.junctions.set(junction.id, junction);
    this.updateJunctionConnections(junction);
  }

  /**
   * Remove a junction
   */
  removeJunction(junctionId: string): void {
    this.junctions.delete(junctionId);
  }

  /**
   * Get all junctions
   */
  getJunctions(): Junction[] {
    return Array.from(this.junctions.values());
  }

  /**
   * Check and create auto-junctions for a new wire
   */
  private checkAutoJunctions(newWire: WireSegment): void {
    const tolerance = this.config.connectionTolerance;

    for (const existingWire of this.wires.values()) {
      if (existingWire.id === newWire.id) continue;

      const intersection = wireIntersection(newWire, existingWire);
      if (intersection) {
        // Check if junction already exists
        let junctionExists = false;
        for (const junction of this.junctions.values()) {
          if (pointsConnect(junction.position, intersection, tolerance)) {
            junctionExists = true;
            break;
          }
        }

        if (!junctionExists) {
          // Check if it's at an endpoint (no junction needed)
          const isEndpoint =
            pointsConnect(intersection, newWire.start, tolerance) ||
            pointsConnect(intersection, newWire.end, tolerance) ||
            pointsConnect(intersection, existingWire.start, tolerance) ||
            pointsConnect(intersection, existingWire.end, tolerance);

          if (!isEndpoint) {
            const junction = createJunction(intersection, [newWire.id, existingWire.id]);
            this.addJunction(junction);
          }
        }
      }
    }
  }

  /**
   * Update junction wire connections
   */
  private updateJunctionConnections(junction: Junction): void {
    const connectedWires: string[] = [];
    const tolerance = this.config.connectionTolerance;

    for (const wire of this.wires.values()) {
      if (pointsConnect(junction.position, wire.start, tolerance) ||
          pointsConnect(junction.position, wire.end, tolerance) ||
          this.isPointOnWire(junction.position, wire)) {
        connectedWires.push(wire.id);
      }
    }

    // Update junction with connected wires
    const updated: Junction = {
      ...junction,
      connectedWires,
    };
    this.junctions.set(junction.id, updated);
  }

  // =========================================================================
  // Net Management
  // =========================================================================

  /**
   * Add or update a net
   */
  addNet(net: Net): void {
    this.nets.set(net.id, net);
    this.onNetlistChange?.();
  }

  /**
   * Get net by ID
   */
  getNet(netId: string): Net | undefined {
    return this.nets.get(netId);
  }

  /**
   * Get net by name
   */
  getNetByName(name: string): Net | undefined {
    for (const net of this.nets.values()) {
      if (net.name === name) return net;
    }
    return undefined;
  }

  /**
   * Get all nets
   */
  getNets(): Net[] {
    return Array.from(this.nets.values());
  }

  /**
   * Get net for a wire
   */
  getNetForWire(wireId: string): Net | undefined {
    const netId = this.netsByWire.get(wireId);
    return netId ? this.nets.get(netId) : undefined;
  }

  /**
   * Get net for a pin
   */
  getNetForPin(componentId: NodeId, pinId: string): Net | undefined {
    const key = `${componentId}:${pinId}`;
    const netId = this.pinConnections.get(key);
    return netId ? this.nets.get(netId) : undefined;
  }

  // =========================================================================
  // Net Labels
  // =========================================================================

  /**
   * Add a net label
   */
  addNetLabel(label: NetLabel): void {
    this.netLabels.set(label.id, label);

    // Find wires at label position and assign net
    const wiresAtPoint = this.findWiresAtPoint(label.position);
    if (wiresAtPoint.length > 0) {
      this.assignNetNameToWires(label.text, wiresAtPoint.map(w => w.id));
    }

    this.updateConnectivity();
  }

  /**
   * Remove a net label
   */
  removeNetLabel(labelId: string): void {
    this.netLabels.delete(labelId);
    this.updateConnectivity();
  }

  /**
   * Get all net labels
   */
  getNetLabels(): NetLabel[] {
    return Array.from(this.netLabels.values());
  }

  /**
   * Assign net name to a group of wires
   */
  private assignNetNameToWires(netName: string, wireIds: string[]): void {
    let net = this.getNetByName(netName);

    if (!net) {
      net = createNet(netName, {
        isPower: this.isPowerNet(netName),
        isGround: this.isGroundNet(netName),
      });
      this.nets.set(net.id, net);
    }

    for (const wireId of wireIds) {
      this.netsByWire.set(wireId, net.id);
    }
  }

  /**
   * Check if net name indicates power
   */
  private isPowerNet(name: string): boolean {
    const powerPatterns = /^(VCC|VDD|V\+|VBAT|3V3|5V|12V|VIN|VOUT|\+\d+V?)$/i;
    return powerPatterns.test(name);
  }

  /**
   * Check if net name indicates ground
   */
  private isGroundNet(name: string): boolean {
    const groundPatterns = /^(GND|VSS|V-|AGND|DGND|PGND|0V|GROUND)$/i;
    return groundPatterns.test(name);
  }

  // =========================================================================
  // Component Management
  // =========================================================================

  /**
   * Register a component
   */
  registerComponent(component: SchematicComponent): void {
    this.components.set(component.id, component);
    this.updateConnectivity();
  }

  /**
   * Unregister a component
   */
  unregisterComponent(componentId: NodeId): void {
    this.components.delete(componentId);
    this.updateConnectivity();
  }

  /**
   * Get component by ID
   */
  getComponent(componentId: NodeId): SchematicComponent | undefined {
    return this.components.get(componentId);
  }

  /**
   * Get all components
   */
  getComponents(): SchematicComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Find pin at world position
   */
  findPinAtPosition(position: Point): { component: SchematicComponent; pin: SchematicPin } | null {
    const tolerance = this.config.connectionTolerance;

    for (const component of this.components.values()) {
      for (const pin of component.pins) {
        const pinWorldPos = this.getPinWorldPosition(component, pin);
        if (pointsConnect(position, pinWorldPos, tolerance)) {
          return { component, pin };
        }
      }
    }

    return null;
  }

  /**
   * Get pin world position
   */
  getPinWorldPosition(component: SchematicComponent, pin: SchematicPin): Point {
    const angle = (component.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return {
      x: component.position.x + pin.position.x * cos - pin.position.y * sin,
      y: component.position.y + pin.position.x * sin + pin.position.y * cos,
    };
  }

  // =========================================================================
  // Connectivity Analysis
  // =========================================================================

  /**
   * Update all connectivity information
   */
  updateConnectivity(): void {
    this.netsByWire.clear();
    this.wiresByNet.clear();
    this.pinConnections.clear();

    // Build connectivity graph
    const connectivity = this.buildConnectivityGraph();

    // Assign nets based on labels and connectivity
    this.assignNetsFromConnectivity(connectivity);

    // Update pin connections
    this.updatePinConnections();

    this.onNetlistChange?.();

    if (this.config.autoERC) {
      this.runERC();
    }
  }

  /**
   * Build connectivity graph using union-find
   */
  private buildConnectivityGraph(): Map<string, Set<string>> {
    const groups = new Map<string, Set<string>>();
    const tolerance = this.config.connectionTolerance;

    // Initialize each wire as its own group
    for (const wire of this.wires.values()) {
      groups.set(wire.id, new Set([wire.id]));
    }

    // Merge groups based on connections
    for (const wire1 of this.wires.values()) {
      for (const wire2 of this.wires.values()) {
        if (wire1.id >= wire2.id) continue;

        const connected =
          pointsConnect(wire1.start, wire2.start, tolerance) ||
          pointsConnect(wire1.start, wire2.end, tolerance) ||
          pointsConnect(wire1.end, wire2.start, tolerance) ||
          pointsConnect(wire1.end, wire2.end, tolerance);

        if (connected) {
          this.mergeGroups(groups, wire1.id, wire2.id);
        }
      }
    }

    // Also connect through junctions
    for (const junction of this.junctions.values()) {
      const wireIds = junction.connectedWires;
      for (let i = 0; i < wireIds.length; i++) {
        for (let j = i + 1; j < wireIds.length; j++) {
          this.mergeGroups(groups, wireIds[i]!, wireIds[j]!);
        }
      }
    }

    return groups;
  }

  /**
   * Merge two groups in union-find structure
   */
  private mergeGroups(groups: Map<string, Set<string>>, id1: string, id2: string): void {
    const group1 = this.findGroup(groups, id1);
    const group2 = this.findGroup(groups, id2);

    if (group1 === group2) return;

    // Merge smaller into larger
    const set1 = groups.get(group1)!;
    const set2 = groups.get(group2)!;

    if (set1.size >= set2.size) {
      for (const id of set2) {
        set1.add(id);
        groups.set(id, set1);
      }
    } else {
      for (const id of set1) {
        set2.add(id);
        groups.set(id, set2);
      }
    }
  }

  /**
   * Find group representative
   */
  private findGroup(groups: Map<string, Set<string>>, id: string): string {
    const group = groups.get(id);
    if (!group) return id;

    // Return first element as representative
    return group.values().next().value ?? id;
  }

  /**
   * Assign nets based on connectivity and labels
   */
  private assignNetsFromConnectivity(connectivity: Map<string, Set<string>>): void {
    let netCounter = 1;
    const processedGroups = new Set<Set<string>>();

    for (const [_wireId, group] of connectivity) {
      if (processedGroups.has(group)) continue;
      processedGroups.add(group);

      // Check for net labels in this group
      let netName: string | null = null;
      for (const wId of group) {
        const wire = this.wires.get(wId);
        if (!wire) continue;

        for (const label of this.netLabels.values()) {
          if (pointsConnect(label.position, wire.start, this.config.connectionTolerance) ||
              pointsConnect(label.position, wire.end, this.config.connectionTolerance) ||
              this.isPointOnWire(label.position, wire)) {
            netName = label.text;
            break;
          }
        }
        if (netName) break;
      }

      // Generate net name if not found
      if (!netName && this.config.autoNetNames) {
        netName = `NET${netCounter++}`;
      }

      if (netName) {
        this.assignNetNameToWires(netName, Array.from(group));
      }
    }
  }

  /**
   * Update pin to net connections
   */
  private updatePinConnections(): void {
    const tolerance = this.config.connectionTolerance;

    for (const component of this.components.values()) {
      for (const pin of component.pins) {
        const pinPos = this.getPinWorldPosition(component, pin);

        // Find wire at pin position
        for (const wire of this.wires.values()) {
          if (pointsConnect(pinPos, wire.start, tolerance) ||
              pointsConnect(pinPos, wire.end, tolerance)) {
            const netId = this.netsByWire.get(wire.id);
            if (netId) {
              this.pinConnections.set(`${component.id}:${pin.id}`, netId);
            }
            break;
          }
        }
      }
    }
  }

  // =========================================================================
  // Electrical Rule Check (ERC)
  // =========================================================================

  /**
   * Run electrical rule check
   */
  runERC(): ERCError[] {
    const errors: ERCError[] = [];

    // Check for unconnected wires
    errors.push(...this.checkUnconnectedWires());

    // Check for unconnected pins
    errors.push(...this.checkUnconnectedPins());

    // Check for multiple drivers
    errors.push(...this.checkMultipleDrivers());

    // Check for floating inputs
    errors.push(...this.checkFloatingInputs());

    this.onERCComplete?.(errors);
    return errors;
  }

  private checkUnconnectedWires(): ERCError[] {
    const errors: ERCError[] = [];

    for (const wire of this.wires.values()) {
      // Check start point
      const startConnections = this.countConnectionsAtPoint(wire.start, wire.id);
      if (startConnections === 0) {
        errors.push({
          type: 'unconnected_wire',
          severity: 'warning',
          message: 'Unconnected wire endpoint',
          position: wire.start,
        });
      }

      // Check end point
      const endConnections = this.countConnectionsAtPoint(wire.end, wire.id);
      if (endConnections === 0) {
        errors.push({
          type: 'unconnected_wire',
          severity: 'warning',
          message: 'Unconnected wire endpoint',
          position: wire.end,
        });
      }
    }

    return errors;
  }

  private countConnectionsAtPoint(point: Point, excludeWireId: string): number {
    let count = 0;
    const tolerance = this.config.connectionTolerance;

    // Count other wires
    for (const wire of this.wires.values()) {
      if (wire.id === excludeWireId) continue;
      if (pointsConnect(point, wire.start, tolerance) ||
          pointsConnect(point, wire.end, tolerance)) {
        count++;
      }
    }

    // Count pins
    for (const component of this.components.values()) {
      for (const pin of component.pins) {
        const pinPos = this.getPinWorldPosition(component, pin);
        if (pointsConnect(point, pinPos, tolerance)) {
          count++;
        }
      }
    }

    return count;
  }

  private checkUnconnectedPins(): ERCError[] {
    const errors: ERCError[] = [];

    for (const component of this.components.values()) {
      for (const pin of component.pins) {
        if (pin.electricalType === 'no_connect') continue;

        const key = `${component.id}:${pin.id}`;
        if (!this.pinConnections.has(key)) {
          const pinPos = this.getPinWorldPosition(component, pin);
          errors.push({
            type: 'unconnected_pin',
            severity: pin.electricalType === 'input' ? 'error' : 'warning',
            message: `Unconnected pin: ${component.refDes}.${pin.name}`,
            position: pinPos,
          });
        }
      }
    }

    return errors;
  }

  private checkMultipleDrivers(): ERCError[] {
    const errors: ERCError[] = [];
    const driverTypes = new Set(['output', 'power_out', 'bidirectional']);

    for (const net of this.nets.values()) {
      const drivers: PinReference[] = [];

      for (const component of this.components.values()) {
        for (const pin of component.pins) {
          const key = `${component.id}:${pin.id}`;
          const netId = this.pinConnections.get(key);

          if (netId === net.id && driverTypes.has(pin.electricalType)) {
            drivers.push({
              componentId: component.id,
              pinId: pin.id,
              position: this.getPinWorldPosition(component, pin),
            });
          }
        }
      }

      if (drivers.length > 1 && !net.properties.isPower) {
        errors.push({
          type: 'multiple_drivers',
          severity: 'error',
          message: `Multiple drivers on net ${net.name}`,
          position: drivers[0]!.position,
          netId: net.id,
          pinRefs: drivers,
        });
      }
    }

    return errors;
  }

  private checkFloatingInputs(): ERCError[] {
    const errors: ERCError[] = [];

    for (const net of this.nets.values()) {
      let hasDriver = false;
      const inputs: PinReference[] = [];

      for (const component of this.components.values()) {
        for (const pin of component.pins) {
          const key = `${component.id}:${pin.id}`;
          const netId = this.pinConnections.get(key);

          if (netId !== net.id) continue;

          if (['output', 'power_out', 'bidirectional'].includes(pin.electricalType)) {
            hasDriver = true;
          }

          if (pin.electricalType === 'input') {
            inputs.push({
              componentId: component.id,
              pinId: pin.id,
              position: this.getPinWorldPosition(component, pin),
            });
          }
        }
      }

      if (!hasDriver && inputs.length > 0 && !net.properties.isPower && !net.properties.isGround) {
        for (const input of inputs) {
          errors.push({
            type: 'floating_input',
            severity: 'warning',
            message: `Floating input on net ${net.name}`,
            position: input.position,
            netId: net.id,
          });
        }
      }
    }

    return errors;
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  private isPointOnWire(point: Point, wire: WireSegment): boolean {
    const tolerance = this.config.connectionTolerance;
    const { start, end } = wire;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 1e-10) return pointsConnect(point, start, tolerance);

    const t = Math.max(0, Math.min(1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length)
    ));

    const closest = {
      x: start.x + t * dx,
      y: start.y + t * dy,
    };

    return pointsConnect(point, closest, tolerance);
  }

  /**
   * Export netlist
   */
  exportNetlist(): { nets: Net[]; components: SchematicComponent[] } {
    return {
      nets: this.getNets(),
      components: this.getComponents(),
    };
  }

  /**
   * Clear all schematic data
   */
  clear(): void {
    this.wires.clear();
    this.junctions.clear();
    this.nets.clear();
    this.netLabels.clear();
    this.buses.clear();
    this.components.clear();
    this.netsByWire.clear();
    this.wiresByNet.clear();
    this.pinConnections.clear();
    this.onNetlistChange?.();
  }
}

/**
 * Create a schematic manager
 */
export function createSchematicManager(config?: Partial<SchematicManagerConfig>): SchematicManager {
  return new SchematicManager(config);
}
