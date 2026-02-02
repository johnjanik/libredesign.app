/**
 * PCB Module
 *
 * PCB design tools and management.
 */

export { PCBManager, createPCBManager } from './pcb-manager';
export type { PCBManagerEvents, TrackRoutingOptions, ComponentPlacementOptions } from './pcb-manager';

// Re-export types
export type {
  PCBBoard,
  PCBLayer,
  PCBLayerStackup,
  PCBLayerType,
  PCBTrack,
  PCBVia,
  ViaType,
  PCBPad,
  PadShape,
  PadType,
  PCBFootprint,
  PCBComponent,
  PCBZone,
  PCBUnits,
  PCBGrid,
  DesignRules,
  DRCViolation,
  DRCViolationType,
  TrackSegment,
  ThermalRelief,
  FootprintGraphic,
  FootprintText,
  FootprintCategory,
} from '@core/types/pcb';

export {
  createPCBBoard,
  createPCBTrack,
  createPCBVia,
  createPCBPad,
  createPCBComponent,
  createDefaultStackup,
  create4LayerStackup,
  createDefaultDesignRules,
  convertPCBUnits,
  formatPCBMeasurement,
  getCopperLayers,
  isCopperLayer,
} from '@core/types/pcb';
