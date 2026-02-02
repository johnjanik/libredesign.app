/**
 * Mechanical Drawing Manager
 *
 * Manages mechanical drawings including:
 * - Drawing views (orthographic, section, detail, auxiliary)
 * - GD&T symbols (feature control frames, datum symbols)
 * - Mechanical symbols (fasteners, bearings, gears)
 * - Welding and surface finish symbols
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId } from '@core/types/common';
import type { Point } from '@core/types/geometry';
import type {
  DrawingView,
  SectionView,
  DetailView,
  AuxiliaryView,
  ViewProjection,
  SectionType,
  CuttingPlane,
  FeatureControlFrame,
  GDTCharacteristic,
  MaterialCondition,
  DatumReference,
  DatumSymbol,
  DatumTarget,
  FastenerSymbol,
  FastenerType,
  BearingSymbol,
  BearingType,
  GearSymbol,
  GearType,
  WeldingSymbol,
  WeldSideInfo,
  SurfaceFinishSymbol,
  SurfaceLay,
} from '@core/types/mechanical';
import {
  createDrawingView,
  createFeatureControlFrame,
  createDatumSymbol,
  createWeldingSymbol,
  createSurfaceFinishSymbol,
} from '@core/types/mechanical';

/**
 * Mechanical drawing sheet
 */
export interface MechanicalDrawing {
  readonly id: NodeId;
  readonly name: string;
  readonly sheetSize: 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'B' | 'C' | 'D' | 'E';
  readonly scale: string; // e.g., "1:1", "2:1", "1:2"
  readonly views: DrawingView[];
  readonly sectionViews: SectionView[];
  readonly detailViews: DetailView[];
  readonly auxiliaryViews: AuxiliaryView[];
  readonly featureControlFrames: FeatureControlFrame[];
  readonly datumSymbols: DatumSymbol[];
  readonly datumTargets: DatumTarget[];
  readonly fasteners: FastenerSymbol[];
  readonly bearings: BearingSymbol[];
  readonly gears: GearSymbol[];
  readonly weldingSymbols: WeldingSymbol[];
  readonly surfaceFinishSymbols: SurfaceFinishSymbol[];
  readonly titleBlock: TitleBlock;
}

/**
 * Title block information
 */
export interface TitleBlock {
  readonly title: string;
  readonly drawingNumber: string;
  readonly revision: string;
  readonly date: string;
  readonly drawnBy: string;
  readonly checkedBy?: string;
  readonly approvedBy?: string;
  readonly material?: string;
  readonly finish?: string;
  readonly tolerances?: string;
}

/**
 * Sheet size dimensions in mm
 */
const SHEET_SIZES = {
  A0: { width: 1189, height: 841 },
  A1: { width: 841, height: 594 },
  A2: { width: 594, height: 420 },
  A3: { width: 420, height: 297 },
  A4: { width: 297, height: 210 },
  B: { width: 432, height: 279 }, // ANSI B (11x17")
  C: { width: 559, height: 432 }, // ANSI C (17x22")
  D: { width: 864, height: 559 }, // ANSI D (22x34")
  E: { width: 1118, height: 864 }, // ANSI E (34x44")
} as const;

/**
 * Events emitted by MechanicalManager
 */
export interface MechanicalManagerEvents extends Record<string, unknown> {
  drawingCreated: { drawing: MechanicalDrawing };
  drawingUpdated: { drawing: MechanicalDrawing };
  drawingDeleted: { drawingId: NodeId };
  viewAdded: { drawingId: NodeId; view: DrawingView | SectionView | DetailView | AuxiliaryView };
  viewRemoved: { drawingId: NodeId; viewId: NodeId };
  symbolAdded: { drawingId: NodeId; symbol: FeatureControlFrame | DatumSymbol | WeldingSymbol | SurfaceFinishSymbol };
  symbolRemoved: { drawingId: NodeId; symbolId: NodeId };
}

/**
 * Options for creating views
 */
export interface ViewCreationOptions {
  scale?: number;
  rotation?: number;
  showHidden?: boolean;
  showCenterlines?: boolean;
}

/**
 * Options for creating section views
 */
export interface SectionViewOptions extends ViewCreationOptions {
  sectionType?: SectionType;
  hatchPattern?: string;
  hatchAngle?: number;
  hatchSpacing?: number;
}

/**
 * Options for creating detail views
 */
export interface DetailViewOptions extends ViewCreationOptions {
  detailScale?: number;
  detailLabel?: string;
}

/**
 * MechanicalManager class
 */
export class MechanicalManager extends EventEmitter<MechanicalManagerEvents> {
  private drawings: Map<NodeId, MechanicalDrawing> = new Map();

  constructor() {
    super();
  }

  // ==================== Drawing Management ====================

  /**
   * Create a new mechanical drawing
   */
  createDrawing(
    name: string,
    options: {
      sheetSize?: MechanicalDrawing['sheetSize'];
      scale?: string;
      titleBlock?: Partial<TitleBlock>;
    } = {}
  ): MechanicalDrawing {
    const id = `drawing-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId;

    const defaultDate = new Date().toISOString().split('T')[0] ?? '';
    const baseTitleBlock = {
      title: options.titleBlock?.title ?? name,
      drawingNumber: options.titleBlock?.drawingNumber ?? id,
      revision: options.titleBlock?.revision ?? 'A',
      date: options.titleBlock?.date ?? defaultDate,
      drawnBy: options.titleBlock?.drawnBy ?? '',
    };

    let titleBlock: TitleBlock = baseTitleBlock;
    if (options.titleBlock?.checkedBy !== undefined) {
      titleBlock = { ...titleBlock, checkedBy: options.titleBlock.checkedBy };
    }
    if (options.titleBlock?.approvedBy !== undefined) {
      titleBlock = { ...titleBlock, approvedBy: options.titleBlock.approvedBy };
    }
    if (options.titleBlock?.material !== undefined) {
      titleBlock = { ...titleBlock, material: options.titleBlock.material };
    }
    if (options.titleBlock?.finish !== undefined) {
      titleBlock = { ...titleBlock, finish: options.titleBlock.finish };
    }
    if (options.titleBlock?.tolerances !== undefined) {
      titleBlock = { ...titleBlock, tolerances: options.titleBlock.tolerances };
    }

    const drawing: MechanicalDrawing = {
      id,
      name,
      sheetSize: options.sheetSize ?? 'A3',
      scale: options.scale ?? '1:1',
      views: [],
      sectionViews: [],
      detailViews: [],
      auxiliaryViews: [],
      featureControlFrames: [],
      datumSymbols: [],
      datumTargets: [],
      fasteners: [],
      bearings: [],
      gears: [],
      weldingSymbols: [],
      surfaceFinishSymbols: [],
      titleBlock,
    };

    this.drawings.set(id, drawing);
    this.emit('drawingCreated', { drawing });
    return drawing;
  }

  /**
   * Get a drawing by ID
   */
  getDrawing(drawingId: NodeId): MechanicalDrawing | null {
    return this.drawings.get(drawingId) ?? null;
  }

  /**
   * Get all drawings
   */
  getAllDrawings(): MechanicalDrawing[] {
    return Array.from(this.drawings.values());
  }

  /**
   * Delete a drawing
   */
  deleteDrawing(drawingId: NodeId): boolean {
    const deleted = this.drawings.delete(drawingId);
    if (deleted) {
      this.emit('drawingDeleted', { drawingId });
    }
    return deleted;
  }

  /**
   * Get sheet dimensions
   */
  getSheetDimensions(sheetSize: MechanicalDrawing['sheetSize']): { width: number; height: number } {
    return SHEET_SIZES[sheetSize];
  }

  // ==================== View Management ====================

  /**
   * Build options object for createDrawingView, handling exactOptionalPropertyTypes
   */
  private buildViewOptions(options: ViewCreationOptions, parentViewId?: NodeId): Parameters<typeof createDrawingView>[3] {
    const viewOptions: Parameters<typeof createDrawingView>[3] = {};
    if (options.scale !== undefined) viewOptions.scale = options.scale;
    if (options.rotation !== undefined) viewOptions.rotation = options.rotation;
    if (options.showHidden !== undefined) viewOptions.showHidden = options.showHidden;
    if (options.showCenterlines !== undefined) viewOptions.showCenterlines = options.showCenterlines;
    if (parentViewId !== undefined) viewOptions.parentViewId = parentViewId;
    return viewOptions;
  }

  /**
   * Add an orthographic view to a drawing
   */
  addOrthographicView(
    drawingId: NodeId,
    name: string,
    projection: ViewProjection,
    position: Point,
    options: ViewCreationOptions = {}
  ): DrawingView | null {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return null;

    const view = createDrawingView(name, projection, position, this.buildViewOptions(options));

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      views: [...drawing.views, view],
    };
    this.drawings.set(drawingId, updatedDrawing);
    this.emit('viewAdded', { drawingId, view });
    this.emit('drawingUpdated', { drawing: updatedDrawing });

    return view;
  }

  /**
   * Add a section view to a drawing
   */
  addSectionView(
    drawingId: NodeId,
    name: string,
    position: Point,
    cuttingPlane: CuttingPlane,
    options: SectionViewOptions = {}
  ): SectionView | null {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return null;

    const baseView = createDrawingView(name, 'front', position, this.buildViewOptions(options));

    const baseSectionView = {
      ...baseView,
      sectionType: options.sectionType ?? 'full',
      cuttingPlane,
      hatchAngle: options.hatchAngle ?? 45,
      hatchSpacing: options.hatchSpacing ?? 3,
    };

    const sectionView: SectionView = options.hatchPattern
      ? { ...baseSectionView, hatchPattern: options.hatchPattern }
      : baseSectionView;

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      sectionViews: [...drawing.sectionViews, sectionView],
    };
    this.drawings.set(drawingId, updatedDrawing);
    this.emit('viewAdded', { drawingId, view: sectionView });
    this.emit('drawingUpdated', { drawing: updatedDrawing });

    return sectionView;
  }

  /**
   * Add a detail view to a drawing
   */
  addDetailView(
    drawingId: NodeId,
    name: string,
    position: Point,
    detailCenter: Point,
    detailRadius: number,
    parentViewId: NodeId,
    options: DetailViewOptions = {}
  ): DetailView | null {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return null;

    const detailScale = options.detailScale ?? 2;
    const viewOpts = this.buildViewOptions(
      { ...options, scale: detailScale, showHidden: options.showHidden ?? true },
      parentViewId
    );
    const baseView = createDrawingView(name, 'front', position, viewOpts);

    const detailView: DetailView = {
      ...baseView,
      detailCenter,
      detailRadius,
      detailLabel: options.detailLabel ?? name,
      detailScale,
    };

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      detailViews: [...drawing.detailViews, detailView],
    };
    this.drawings.set(drawingId, updatedDrawing);
    this.emit('viewAdded', { drawingId, view: detailView });
    this.emit('drawingUpdated', { drawing: updatedDrawing });

    return detailView;
  }

  /**
   * Add an auxiliary view to a drawing
   */
  addAuxiliaryView(
    drawingId: NodeId,
    name: string,
    position: Point,
    referenceEdge: { start: Point; end: Point },
    projectionAngle: number,
    parentViewId: NodeId,
    options: ViewCreationOptions = {}
  ): AuxiliaryView | null {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return null;

    const baseView = createDrawingView(name, 'front', position, this.buildViewOptions(options, parentViewId));

    const auxiliaryView: AuxiliaryView = {
      ...baseView,
      referenceEdge,
      projectionAngle,
    };

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      auxiliaryViews: [...drawing.auxiliaryViews, auxiliaryView],
    };
    this.drawings.set(drawingId, updatedDrawing);
    this.emit('viewAdded', { drawingId, view: auxiliaryView });
    this.emit('drawingUpdated', { drawing: updatedDrawing });

    return auxiliaryView;
  }

  /**
   * Remove a view from a drawing
   */
  removeView(drawingId: NodeId, viewId: NodeId): boolean {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return false;

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      views: drawing.views.filter((v) => v.id !== viewId),
      sectionViews: drawing.sectionViews.filter((v) => v.id !== viewId),
      detailViews: drawing.detailViews.filter((v) => v.id !== viewId),
      auxiliaryViews: drawing.auxiliaryViews.filter((v) => v.id !== viewId),
    };

    const removed =
      updatedDrawing.views.length !== drawing.views.length ||
      updatedDrawing.sectionViews.length !== drawing.sectionViews.length ||
      updatedDrawing.detailViews.length !== drawing.detailViews.length ||
      updatedDrawing.auxiliaryViews.length !== drawing.auxiliaryViews.length;

    if (removed) {
      this.drawings.set(drawingId, updatedDrawing);
      this.emit('viewRemoved', { drawingId, viewId });
      this.emit('drawingUpdated', { drawing: updatedDrawing });
    }

    return removed;
  }

  // ==================== GD&T Symbol Management ====================

  /**
   * Add a feature control frame to a drawing
   */
  addFeatureControlFrame(
    drawingId: NodeId,
    characteristic: GDTCharacteristic,
    toleranceValue: number,
    position: Point,
    options: {
      zoneDiameter?: boolean;
      toleranceModifier?: MaterialCondition;
      primaryDatum?: DatumReference;
      secondaryDatum?: DatumReference;
      tertiaryDatum?: DatumReference;
      leaderPoints?: Point[];
      attachedToSurface?: boolean;
    } = {}
  ): FeatureControlFrame | null {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return null;

    const fcf = createFeatureControlFrame(characteristic, toleranceValue, position, options);

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      featureControlFrames: [...drawing.featureControlFrames, fcf],
    };
    this.drawings.set(drawingId, updatedDrawing);
    this.emit('symbolAdded', { drawingId, symbol: fcf });
    this.emit('drawingUpdated', { drawing: updatedDrawing });

    return fcf;
  }

  /**
   * Add a datum symbol to a drawing
   */
  addDatumSymbol(
    drawingId: NodeId,
    letter: string,
    position: Point,
    options: {
      attachmentType?: 'surface' | 'centerline' | 'axis';
      rotation?: number;
      leaderPoints?: Point[];
    } = {}
  ): DatumSymbol | null {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return null;

    const datum = createDatumSymbol(letter, position, options);

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      datumSymbols: [...drawing.datumSymbols, datum],
    };
    this.drawings.set(drawingId, updatedDrawing);
    this.emit('symbolAdded', { drawingId, symbol: datum });
    this.emit('drawingUpdated', { drawing: updatedDrawing });

    return datum;
  }

  /**
   * Add a datum target to a drawing
   */
  addDatumTarget(
    drawingId: NodeId,
    letter: string,
    targetNumber: number,
    targetType: DatumTarget['targetType'],
    position: Point,
    options: {
      size?: number;
      areaShape?: 'circle' | 'rectangle';
    } = {}
  ): DatumTarget | null {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return null;

    const id = `datum-target-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId;

    const baseDatumTarget = {
      id,
      type: 'DATUM_TARGET' as const,
      letter,
      targetNumber,
      targetType,
      position,
    };

    let datumTarget: DatumTarget = baseDatumTarget;
    if (options.size !== undefined) {
      datumTarget = { ...datumTarget, size: options.size };
    }
    if (options.areaShape !== undefined) {
      datumTarget = { ...datumTarget, areaShape: options.areaShape };
    }

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      datumTargets: [...drawing.datumTargets, datumTarget],
    };
    this.drawings.set(drawingId, updatedDrawing);
    this.emit('drawingUpdated', { drawing: updatedDrawing });

    return datumTarget;
  }

  // ==================== Mechanical Symbol Management ====================

  /**
   * Add a fastener symbol to a drawing
   */
  addFastenerSymbol(
    drawingId: NodeId,
    fastenerType: FastenerType,
    size: string,
    position: Point,
    options: {
      thread?: { pitch: number; class: string };
      length?: number;
      viewType?: 'side' | 'top' | 'section';
      rotation?: number;
      scale?: number;
    } = {}
  ): FastenerSymbol | null {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return null;

    const id = `fastener-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId;

    const baseFastener = {
      id,
      type: 'FASTENER' as const,
      fastenerType,
      size,
      position,
      viewType: options.viewType ?? 'side',
      rotation: options.rotation ?? 0,
      scale: options.scale ?? 1,
    };

    let fastener: FastenerSymbol = baseFastener;
    if (options.thread !== undefined) {
      fastener = { ...fastener, thread: options.thread };
    }
    if (options.length !== undefined) {
      fastener = { ...fastener, length: options.length };
    }

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      fasteners: [...drawing.fasteners, fastener],
    };
    this.drawings.set(drawingId, updatedDrawing);
    this.emit('drawingUpdated', { drawing: updatedDrawing });

    return fastener;
  }

  /**
   * Add a bearing symbol to a drawing
   */
  addBearingSymbol(
    drawingId: NodeId,
    bearingType: BearingType,
    innerDiameter: number,
    outerDiameter: number,
    width: number,
    position: Point,
    options: {
      designation?: string;
      viewType?: 'front' | 'section';
      rotation?: number;
    } = {}
  ): BearingSymbol | null {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return null;

    const id = `bearing-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId;

    const baseBearing = {
      id,
      type: 'BEARING' as const,
      bearingType,
      innerDiameter,
      outerDiameter,
      width,
      position,
      viewType: options.viewType ?? 'section',
      rotation: options.rotation ?? 0,
    };

    const bearing: BearingSymbol = options.designation
      ? { ...baseBearing, designation: options.designation }
      : baseBearing;

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      bearings: [...drawing.bearings, bearing],
    };
    this.drawings.set(drawingId, updatedDrawing);
    this.emit('drawingUpdated', { drawing: updatedDrawing });

    return bearing;
  }

  /**
   * Add a gear symbol to a drawing
   */
  addGearSymbol(
    drawingId: NodeId,
    gearType: GearType,
    teeth: number,
    pitchDiameter: number,
    pressureAngle: number,
    position: Point,
    options: {
      module?: number;
      diametralPitch?: number;
      viewType?: 'front' | 'section' | 'side';
      rotation?: number;
    } = {}
  ): GearSymbol | null {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return null;

    const id = `gear-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as NodeId;

    const baseGear = {
      id,
      type: 'GEAR' as const,
      gearType,
      teeth,
      pitchDiameter,
      pressureAngle,
      position,
      viewType: options.viewType ?? 'front',
      rotation: options.rotation ?? 0,
    };

    let gear: GearSymbol = baseGear;
    if (options.module !== undefined) {
      gear = { ...gear, module: options.module };
    }
    if (options.diametralPitch !== undefined) {
      gear = { ...gear, diametralPitch: options.diametralPitch };
    }

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      gears: [...drawing.gears, gear],
    };
    this.drawings.set(drawingId, updatedDrawing);
    this.emit('drawingUpdated', { drawing: updatedDrawing });

    return gear;
  }

  // ==================== Welding & Surface Finish ====================

  /**
   * Add a welding symbol to a drawing
   */
  addWeldingSymbol(
    drawingId: NodeId,
    position: Point,
    arrowPoint: Point,
    options: {
      arrowSide?: WeldSideInfo;
      otherSide?: WeldSideInfo;
      allAround?: boolean;
      fieldWeld?: boolean;
      tail?: string;
      staggered?: boolean;
    } = {}
  ): WeldingSymbol | null {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return null;

    const symbol = createWeldingSymbol(position, arrowPoint, options);

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      weldingSymbols: [...drawing.weldingSymbols, symbol],
    };
    this.drawings.set(drawingId, updatedDrawing);
    this.emit('symbolAdded', { drawingId, symbol });
    this.emit('drawingUpdated', { drawing: updatedDrawing });

    return symbol;
  }

  /**
   * Add a surface finish symbol to a drawing
   */
  addSurfaceFinishSymbol(
    drawingId: NodeId,
    position: Point,
    options: {
      roughnessRa?: number;
      roughnessRz?: number;
      lay?: SurfaceLay;
      materialRemovalRequired?: 'required' | 'prohibited' | 'optional';
      machiningAllowance?: number;
      rotation?: number;
      leaderPoints?: Point[];
      cutoff?: number;
      productionMethod?: string;
    } = {}
  ): SurfaceFinishSymbol | null {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return null;

    const symbol = createSurfaceFinishSymbol(position, options);

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      surfaceFinishSymbols: [...drawing.surfaceFinishSymbols, symbol],
    };
    this.drawings.set(drawingId, updatedDrawing);
    this.emit('symbolAdded', { drawingId, symbol });
    this.emit('drawingUpdated', { drawing: updatedDrawing });

    return symbol;
  }

  /**
   * Remove any symbol from a drawing
   */
  removeSymbol(drawingId: NodeId, symbolId: NodeId): boolean {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return false;

    const updatedDrawing: MechanicalDrawing = {
      ...drawing,
      featureControlFrames: drawing.featureControlFrames.filter((s) => s.id !== symbolId),
      datumSymbols: drawing.datumSymbols.filter((s) => s.id !== symbolId),
      datumTargets: drawing.datumTargets.filter((s) => s.id !== symbolId),
      fasteners: drawing.fasteners.filter((s) => s.id !== symbolId),
      bearings: drawing.bearings.filter((s) => s.id !== symbolId),
      gears: drawing.gears.filter((s) => s.id !== symbolId),
      weldingSymbols: drawing.weldingSymbols.filter((s) => s.id !== symbolId),
      surfaceFinishSymbols: drawing.surfaceFinishSymbols.filter((s) => s.id !== symbolId),
    };

    // Check if anything was removed
    const totalBefore =
      drawing.featureControlFrames.length +
      drawing.datumSymbols.length +
      drawing.datumTargets.length +
      drawing.fasteners.length +
      drawing.bearings.length +
      drawing.gears.length +
      drawing.weldingSymbols.length +
      drawing.surfaceFinishSymbols.length;

    const totalAfter =
      updatedDrawing.featureControlFrames.length +
      updatedDrawing.datumSymbols.length +
      updatedDrawing.datumTargets.length +
      updatedDrawing.fasteners.length +
      updatedDrawing.bearings.length +
      updatedDrawing.gears.length +
      updatedDrawing.weldingSymbols.length +
      updatedDrawing.surfaceFinishSymbols.length;

    if (totalAfter < totalBefore) {
      this.drawings.set(drawingId, updatedDrawing);
      this.emit('symbolRemoved', { drawingId, symbolId });
      this.emit('drawingUpdated', { drawing: updatedDrawing });
      return true;
    }

    return false;
  }

  // ==================== View Arrangement ====================

  /**
   * Arrange standard orthographic views (third-angle projection)
   */
  arrangeThirdAngleViews(
    drawingId: NodeId,
    _geometryIds: NodeId[],
    options: {
      scale?: number;
      spacing?: number;
      includeFront?: boolean;
      includeTop?: boolean;
      includeRight?: boolean;
      includeLeft?: boolean;
      includeBottom?: boolean;
      includeBack?: boolean;
      includeIsometric?: boolean;
    } = {}
  ): DrawingView[] {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return [];

    const scale = options.scale ?? 1;
    const spacing = options.spacing ?? 50;
    const { width, height } = this.getSheetDimensions(drawing.sheetSize);

    // Standard third-angle projection layout
    const views: DrawingView[] = [];
    const viewSize = 100 * scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Front view (center)
    if (options.includeFront !== false) {
      const view = this.addOrthographicView(drawingId, 'Front', 'front', { x: centerX, y: centerY }, { scale });
      if (view) views.push(view);
    }

    // Top view (above front)
    if (options.includeTop !== false) {
      const view = this.addOrthographicView(
        drawingId,
        'Top',
        'top',
        { x: centerX, y: centerY - viewSize - spacing },
        { scale }
      );
      if (view) views.push(view);
    }

    // Right view (right of front)
    if (options.includeRight !== false) {
      const view = this.addOrthographicView(
        drawingId,
        'Right',
        'right',
        { x: centerX + viewSize + spacing, y: centerY },
        { scale }
      );
      if (view) views.push(view);
    }

    // Left view (left of front)
    if (options.includeLeft) {
      const view = this.addOrthographicView(
        drawingId,
        'Left',
        'left',
        { x: centerX - viewSize - spacing, y: centerY },
        { scale }
      );
      if (view) views.push(view);
    }

    // Bottom view (below front)
    if (options.includeBottom) {
      const view = this.addOrthographicView(
        drawingId,
        'Bottom',
        'bottom',
        { x: centerX, y: centerY + viewSize + spacing },
        { scale }
      );
      if (view) views.push(view);
    }

    // Isometric view (top-right corner)
    if (options.includeIsometric) {
      const view = this.addOrthographicView(
        drawingId,
        'Isometric',
        'isometric',
        { x: centerX + viewSize * 2 + spacing * 2, y: centerY - viewSize - spacing },
        { scale: scale * 0.8 }
      );
      if (view) views.push(view);
    }

    return views;
  }

  /**
   * Arrange standard orthographic views (first-angle projection)
   */
  arrangeFirstAngleViews(
    drawingId: NodeId,
    _geometryIds: NodeId[],
    options: {
      scale?: number;
      spacing?: number;
      includeFront?: boolean;
      includeTop?: boolean;
      includeRight?: boolean;
      includeLeft?: boolean;
      includeBottom?: boolean;
    } = {}
  ): DrawingView[] {
    const drawing = this.drawings.get(drawingId);
    if (!drawing) return [];

    const scale = options.scale ?? 1;
    const spacing = options.spacing ?? 50;
    const { width, height } = this.getSheetDimensions(drawing.sheetSize);

    const views: DrawingView[] = [];
    const viewSize = 100 * scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Front view (center)
    if (options.includeFront !== false) {
      const view = this.addOrthographicView(drawingId, 'Front', 'front', { x: centerX, y: centerY }, { scale });
      if (view) views.push(view);
    }

    // Top view (below front - first angle!)
    if (options.includeTop !== false) {
      const view = this.addOrthographicView(
        drawingId,
        'Top',
        'top',
        { x: centerX, y: centerY + viewSize + spacing },
        { scale }
      );
      if (view) views.push(view);
    }

    // Right view (left of front - first angle!)
    if (options.includeRight !== false) {
      const view = this.addOrthographicView(
        drawingId,
        'Right',
        'right',
        { x: centerX - viewSize - spacing, y: centerY },
        { scale }
      );
      if (view) views.push(view);
    }

    // Left view (right of front - first angle!)
    if (options.includeLeft) {
      const view = this.addOrthographicView(
        drawingId,
        'Left',
        'left',
        { x: centerX + viewSize + spacing, y: centerY },
        { scale }
      );
      if (view) views.push(view);
    }

    // Bottom view (above front - first angle!)
    if (options.includeBottom) {
      const view = this.addOrthographicView(
        drawingId,
        'Bottom',
        'bottom',
        { x: centerX, y: centerY - viewSize - spacing },
        { scale }
      );
      if (view) views.push(view);
    }

    return views;
  }
}

/**
 * Create a new MechanicalManager instance
 */
export function createMechanicalManager(): MechanicalManager {
  return new MechanicalManager();
}
