/**
 * Sketch Importer
 *
 * Import Sketch files (.sketch) and convert them to scene graph nodes.
 * Sketch files are ZIP archives containing JSON and image assets.
 */

import type { NodeId } from '@core/types/common';
import type { VectorPath, PathCommand } from '@core/types/geometry';
import type { RGBA } from '@core/types/color';
import type { SceneGraph, CreateNodeOptions } from '@scene/graph/scene-graph';

/**
 * Sketch import options
 */
export interface SketchImportOptions {
  /** Parent node ID to import into */
  parentId?: NodeId | undefined;
  /** Import only specific page names */
  pageNames?: readonly string[] | undefined;
  /** Scale factor (default: 1) */
  scale?: number | undefined;
  /** Import hidden layers (default: false) */
  importHidden?: boolean | undefined;
  /** Flatten symbols (default: false) */
  flattenSymbols?: boolean | undefined;
}

/**
 * Sketch import result
 */
export interface SketchImportResult {
  /** Root node ID of imported content */
  readonly rootId: NodeId;
  /** Number of nodes created */
  readonly nodeCount: number;
  /** Original document name */
  readonly documentName: string;
  /** Page count */
  readonly pageCount: number;
  /** Warnings during import */
  readonly warnings: readonly string[];
}

/**
 * Sketch document structure
 */
interface SketchDocument {
  _class: string;
  do_objectID: string;
  assets: unknown;
  colorSpace: number;
  currentPageIndex: number;
  foreignLayerStyles: unknown[];
  foreignSymbols: unknown[];
  foreignTextStyles: unknown[];
  layerStyles: unknown;
  layerSymbols: unknown;
  layerTextStyles: unknown;
  pages: { _ref: string; _class: string }[];
}

/**
 * Sketch page structure
 */
interface SketchPage {
  _class: 'page';
  do_objectID: string;
  name: string;
  frame: SketchRect;
  layers: SketchLayer[];
}

/**
 * Sketch layer types
 */
type SketchLayerClass =
  | 'artboard'
  | 'group'
  | 'rectangle'
  | 'oval'
  | 'shapePath'
  | 'shapeGroup'
  | 'text'
  | 'bitmap'
  | 'symbolInstance'
  | 'symbolMaster'
  | 'slice';

/**
 * Sketch layer
 */
interface SketchLayer {
  _class: SketchLayerClass;
  do_objectID: string;
  name: string;
  isVisible: boolean;
  isLocked: boolean;
  frame: SketchRect;
  rotation: number;
  style?: SketchStyle;
  layers?: SketchLayer[];
  // Rectangle specific
  fixedRadius?: number;
  // Text specific
  attributedString?: { string: string; attributes: unknown[] };
  // Path specific
  path?: SketchPath;
  // Symbol specific
  symbolID?: string;
  // Boolean specific
  booleanOperation?: number;
}

/**
 * Sketch rectangle frame
 */
interface SketchRect {
  _class: 'rect';
  constrainProportions: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Sketch style
 */
interface SketchStyle {
  _class: 'style';
  fills?: SketchFill[];
  borders?: SketchBorder[];
  shadows?: SketchShadow[];
  innerShadows?: SketchShadow[];
  blur?: SketchBlur;
  contextSettings?: { opacity: number; blendMode: number };
}

/**
 * Sketch fill
 */
interface SketchFill {
  _class: 'fill';
  isEnabled: boolean;
  fillType: number; // 0=solid, 1=gradient, 4=image
  color?: SketchColor;
  gradient?: SketchGradient;
}

/**
 * Sketch border
 */
interface SketchBorder {
  _class: 'border';
  isEnabled: boolean;
  color: SketchColor;
  thickness: number;
  position: number; // 0=center, 1=inside, 2=outside
}

/**
 * Sketch shadow
 */
interface SketchShadow {
  _class: 'shadow' | 'innerShadow';
  isEnabled: boolean;
  color: SketchColor;
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  spread: number;
}

/**
 * Sketch blur
 */
interface SketchBlur {
  _class: 'blur';
  isEnabled: boolean;
  radius: number;
  type: number;
}

/**
 * Sketch color
 */
interface SketchColor {
  _class: 'color';
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

/**
 * Sketch gradient
 */
interface SketchGradient {
  _class: 'gradient';
  gradientType: number;
  stops: { color: SketchColor; position: number }[];
  from: string;
  to: string;
}

/**
 * Sketch path
 */
interface SketchPath {
  _class: 'path' | 'shapePath';
  isClosed: boolean;
  points: SketchPathPoint[];
}

/**
 * Sketch path point
 */
interface SketchPathPoint {
  _class: 'curvePoint';
  cornerRadius: number;
  curveFrom: string;
  curveTo: string;
  curveMode: number;
  hasCurveFrom: boolean;
  hasCurveTo: boolean;
  point: string;
}

/**
 * Simple ZIP reader for Sketch files
 */
class SketchZipReader {
  private data: Uint8Array;
  private view: DataView;

  constructor(data: Uint8Array) {
    this.data = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  readFiles(): Map<string, Uint8Array> {
    const files = new Map<string, Uint8Array>();

    let eocdOffset = this.data.length - 22;
    while (eocdOffset >= 0 && this.view.getUint32(eocdOffset, true) !== 0x06054b50) {
      eocdOffset--;
    }

    if (eocdOffset < 0) {
      throw new Error('Invalid Sketch file: not a valid ZIP archive');
    }

    const centralDirOffset = this.view.getUint32(eocdOffset + 16, true);
    const fileCount = this.view.getUint16(eocdOffset + 10, true);

    let offset = centralDirOffset;
    for (let i = 0; i < fileCount; i++) {
      if (this.view.getUint32(offset, true) !== 0x02014b50) {
        throw new Error('Invalid Sketch file: Central directory header not found');
      }

      const nameLength = this.view.getUint16(offset + 28, true);
      const extraLength = this.view.getUint16(offset + 30, true);
      const commentLength = this.view.getUint16(offset + 32, true);
      const localHeaderOffset = this.view.getUint32(offset + 42, true);

      const nameBytes = this.data.subarray(offset + 46, offset + 46 + nameLength);
      const name = new TextDecoder().decode(nameBytes);

      const localNameLength = this.view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = this.view.getUint16(localHeaderOffset + 28, true);
      const compressedSize = this.view.getUint32(localHeaderOffset + 18, true);

      const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const fileData = this.data.subarray(dataOffset, dataOffset + compressedSize);

      files.set(name, fileData);

      offset += 46 + nameLength + extraLength + commentLength;
    }

    return files;
  }
}

/**
 * Sketch Importer
 */
export class SketchImporter {
  private sceneGraph: SceneGraph;
  private warnings: string[] = [];
  private nodeCount = 0;
  private symbolMap: Map<string, SketchLayer> = new Map();
  private imageMap: Map<string, Blob> = new Map();

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  /**
   * Import a Sketch file.
   */
  async import(file: File, options: SketchImportOptions = {}): Promise<SketchImportResult> {
    this.warnings = [];
    this.nodeCount = 0;
    this.symbolMap.clear();
    this.imageMap.clear();

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Verify it's a ZIP file
    if (data[0] !== 0x50 || data[1] !== 0x4B) {
      throw new Error('Invalid Sketch file: not a ZIP archive');
    }

    // Read ZIP contents
    const zipReader = new SketchZipReader(data);
    const files = zipReader.readFiles();

    // Read document.json
    const documentData = files.get('document.json');
    if (!documentData) {
      throw new Error('Invalid Sketch file: missing document.json');
    }

    const document = JSON.parse(new TextDecoder().decode(documentData)) as SketchDocument;

    // Read images
    for (const [name, data] of files) {
      if (name.startsWith('images/')) {
        const imageName = name.substring(7);
        const mimeType = this.getMimeType(imageName);
        this.imageMap.set(imageName, new Blob([data as BlobPart], { type: mimeType }));
      }
    }

    // Get or create parent
    const parentId = options.parentId ?? this.getDefaultParent();

    // Create root group
    const rootId = this.sceneGraph.createNode('GROUP', parentId, -1, {
      name: `Sketch: ${file.name.replace('.sketch', '')}`,
      x: 0,
      y: 0,
    } as CreateNodeOptions);
    this.nodeCount++;

    // Import pages
    let pageCount = 0;
    for (const pageRef of document.pages) {
      const pagePath = `pages/${pageRef._ref}.json`;
      const pageData = files.get(pagePath);

      if (!pageData) {
        this.warnings.push(`Page not found: ${pageRef._ref}`);
        continue;
      }

      const page = JSON.parse(new TextDecoder().decode(pageData)) as SketchPage;

      // Filter pages by name if specified
      if (options.pageNames && !options.pageNames.includes(page.name)) {
        continue;
      }

      // Build symbol map from page
      this.buildSymbolMap(page.layers);

      // Import page
      this.importPage(page, rootId, options);
      pageCount++;
    }

    return {
      rootId,
      nodeCount: this.nodeCount,
      documentName: file.name.replace('.sketch', ''),
      pageCount,
      warnings: this.warnings,
    };
  }

  // =========================================================================
  // Private Methods - Import
  // =========================================================================

  private buildSymbolMap(layers: SketchLayer[]): void {
    for (const layer of layers) {
      if (layer._class === 'symbolMaster') {
        this.symbolMap.set(layer.do_objectID, layer);
      }
      if (layer.layers) {
        this.buildSymbolMap(layer.layers);
      }
    }
  }

  private importPage(
    page: SketchPage,
    parentId: NodeId,
    options: SketchImportOptions
  ): void {
    const scale = options.scale ?? 1;

    const pageId = this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: page.name,
      x: page.frame.x * scale,
      y: page.frame.y * scale,
      width: page.frame.width * scale,
      height: page.frame.height * scale,
      fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1, a: 1 } }],
    } as CreateNodeOptions);
    this.nodeCount++;

    for (const layer of page.layers) {
      this.importLayer(layer, pageId, options);
    }
  }

  private importLayer(
    layer: SketchLayer,
    parentId: NodeId,
    options: SketchImportOptions
  ): void {
    // Skip hidden layers unless importing hidden
    if (!options.importHidden && !layer.isVisible) {
      return;
    }

    switch (layer._class) {
      case 'artboard':
        this.importArtboard(layer, parentId, options);
        break;
      case 'group':
        this.importGroup(layer, parentId, options);
        break;
      case 'rectangle':
        this.importRectangle(layer, parentId, options);
        break;
      case 'oval':
        this.importOval(layer, parentId, options);
        break;
      case 'shapePath':
      case 'shapeGroup':
        this.importShape(layer, parentId, options);
        break;
      case 'text':
        this.importText(layer, parentId, options);
        break;
      case 'bitmap':
        this.importBitmap(layer, parentId, options);
        break;
      case 'symbolInstance':
        this.importSymbolInstance(layer, parentId, options);
        break;
      case 'symbolMaster':
        if (!options.flattenSymbols) {
          this.importSymbolMaster(layer, parentId, options);
        }
        break;
      case 'slice':
        // Skip slices
        break;
      default:
        this.warnings.push(`Unknown Sketch layer class: ${layer._class}`);
    }
  }

  private importArtboard(
    layer: SketchLayer,
    parentId: NodeId,
    options: SketchImportOptions
  ): void {
    const scale = options.scale ?? 1;

    const artboardId = this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: layer.name,
      x: layer.frame.x * scale,
      y: layer.frame.y * scale,
      width: layer.frame.width * scale,
      height: layer.frame.height * scale,
      fills: this.convertFills(layer.style?.fills),
      strokes: this.convertBorders(layer.style?.borders, scale),
      strokeWeight: this.getStrokeWeight(layer.style?.borders, scale),
      opacity: this.getOpacity(layer.style),
      visible: layer.isVisible,
    } as CreateNodeOptions);
    this.nodeCount++;

    for (const child of layer.layers ?? []) {
      this.importLayer(child, artboardId, options);
    }
  }

  private importGroup(
    layer: SketchLayer,
    parentId: NodeId,
    options: SketchImportOptions
  ): void {
    const scale = options.scale ?? 1;

    const groupId = this.sceneGraph.createNode('GROUP', parentId, -1, {
      name: layer.name,
      x: layer.frame.x * scale,
      y: layer.frame.y * scale,
      width: layer.frame.width * scale,
      height: layer.frame.height * scale,
      opacity: this.getOpacity(layer.style),
      visible: layer.isVisible,
    } as CreateNodeOptions);
    this.nodeCount++;

    for (const child of layer.layers ?? []) {
      this.importLayer(child, groupId, options);
    }
  }

  private importRectangle(
    layer: SketchLayer,
    parentId: NodeId,
    options: SketchImportOptions
  ): void {
    const scale = options.scale ?? 1;

    this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: layer.name,
      x: layer.frame.x * scale,
      y: layer.frame.y * scale,
      width: layer.frame.width * scale,
      height: layer.frame.height * scale,
      cornerRadius: layer.fixedRadius ? layer.fixedRadius * scale : undefined,
      fills: this.convertFills(layer.style?.fills),
      strokes: this.convertBorders(layer.style?.borders, scale),
      strokeWeight: this.getStrokeWeight(layer.style?.borders, scale),
      effects: this.convertEffects(layer.style),
      opacity: this.getOpacity(layer.style),
      rotation: layer.rotation,
      visible: layer.isVisible,
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importOval(
    layer: SketchLayer,
    parentId: NodeId,
    options: SketchImportOptions
  ): void {
    const scale = options.scale ?? 1;
    const rx = (layer.frame.width / 2) * scale;
    const ry = (layer.frame.height / 2) * scale;
    const k = 0.5522847498;

    const path: VectorPath = {
      windingRule: 'NONZERO',
      commands: [
        { type: 'M', x: rx * 2, y: ry },
        { type: 'C', x1: rx * 2, y1: ry + ry * k, x2: rx + rx * k, y2: ry * 2, x: rx, y: ry * 2 },
        { type: 'C', x1: rx - rx * k, y1: ry * 2, x2: 0, y2: ry + ry * k, x: 0, y: ry },
        { type: 'C', x1: 0, y1: ry - ry * k, x2: rx - rx * k, y2: 0, x: rx, y: 0 },
        { type: 'C', x1: rx + rx * k, y1: 0, x2: rx * 2, y2: ry - ry * k, x: rx * 2, y: ry },
        { type: 'Z' },
      ],
    };

    this.sceneGraph.createNode('VECTOR', parentId, -1, {
      name: layer.name,
      x: layer.frame.x * scale,
      y: layer.frame.y * scale,
      width: layer.frame.width * scale,
      height: layer.frame.height * scale,
      vectorPaths: [path],
      fills: this.convertFills(layer.style?.fills),
      strokes: this.convertBorders(layer.style?.borders, scale),
      strokeWeight: this.getStrokeWeight(layer.style?.borders, scale),
      effects: this.convertEffects(layer.style),
      opacity: this.getOpacity(layer.style),
      rotation: layer.rotation,
      visible: layer.isVisible,
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importShape(
    layer: SketchLayer,
    parentId: NodeId,
    options: SketchImportOptions
  ): void {
    const scale = options.scale ?? 1;

    // Convert path if available
    const vectorPaths = layer.path ? [this.convertPath(layer.path, layer.frame, scale)] : [];

    if (vectorPaths.length === 0 && layer.layers) {
      // Shape group - import as group
      const groupId = this.sceneGraph.createNode('GROUP', parentId, -1, {
        name: layer.name,
        x: layer.frame.x * scale,
        y: layer.frame.y * scale,
        width: layer.frame.width * scale,
        height: layer.frame.height * scale,
        opacity: this.getOpacity(layer.style),
        visible: layer.isVisible,
      } as CreateNodeOptions);
      this.nodeCount++;

      for (const child of layer.layers) {
        this.importLayer(child, groupId, options);
      }
      return;
    }

    this.sceneGraph.createNode('VECTOR', parentId, -1, {
      name: layer.name,
      x: layer.frame.x * scale,
      y: layer.frame.y * scale,
      width: layer.frame.width * scale,
      height: layer.frame.height * scale,
      vectorPaths,
      fills: this.convertFills(layer.style?.fills),
      strokes: this.convertBorders(layer.style?.borders, scale),
      strokeWeight: this.getStrokeWeight(layer.style?.borders, scale),
      effects: this.convertEffects(layer.style),
      opacity: this.getOpacity(layer.style),
      rotation: layer.rotation,
      visible: layer.isVisible,
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importText(
    layer: SketchLayer,
    parentId: NodeId,
    options: SketchImportOptions
  ): void {
    const scale = options.scale ?? 1;
    const text = layer.attributedString?.string ?? '';

    this.sceneGraph.createNode('TEXT', parentId, -1, {
      name: layer.name,
      x: layer.frame.x * scale,
      y: layer.frame.y * scale,
      width: layer.frame.width * scale,
      height: layer.frame.height * scale,
      characters: text,
      textStyles: [{
        fontFamily: 'system-ui',
        fontSize: 14 * scale,
        fontWeight: 400,
      }],
      fills: this.convertFills(layer.style?.fills),
      opacity: this.getOpacity(layer.style),
      rotation: layer.rotation,
      visible: layer.isVisible,
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importBitmap(
    layer: SketchLayer,
    parentId: NodeId,
    options: SketchImportOptions
  ): void {
    const scale = options.scale ?? 1;

    this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: layer.name,
      x: layer.frame.x * scale,
      y: layer.frame.y * scale,
      width: layer.frame.width * scale,
      height: layer.frame.height * scale,
      fills: [{
        type: 'IMAGE',
        visible: true,
        scaleMode: 'FILL',
      }],
      opacity: this.getOpacity(layer.style),
      rotation: layer.rotation,
      visible: layer.isVisible,
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importSymbolInstance(
    layer: SketchLayer,
    parentId: NodeId,
    options: SketchImportOptions
  ): void {
    const scale = options.scale ?? 1;

    if (options.flattenSymbols && layer.symbolID) {
      const master = this.symbolMap.get(layer.symbolID);
      if (master) {
        // Import symbol content directly
        for (const child of master.layers ?? []) {
          this.importLayer(child, parentId, options);
        }
        return;
      }
    }

    // Import as instance placeholder
    this.sceneGraph.createNode('INSTANCE', parentId, -1, {
      name: layer.name,
      x: layer.frame.x * scale,
      y: layer.frame.y * scale,
      width: layer.frame.width * scale,
      height: layer.frame.height * scale,
      componentId: layer.symbolID ?? '',
      opacity: this.getOpacity(layer.style),
      rotation: layer.rotation,
      visible: layer.isVisible,
    } as CreateNodeOptions);
    this.nodeCount++;
  }

  private importSymbolMaster(
    layer: SketchLayer,
    parentId: NodeId,
    options: SketchImportOptions
  ): void {
    const scale = options.scale ?? 1;

    const componentId = this.sceneGraph.createNode('COMPONENT', parentId, -1, {
      name: layer.name,
      x: layer.frame.x * scale,
      y: layer.frame.y * scale,
      width: layer.frame.width * scale,
      height: layer.frame.height * scale,
      fills: this.convertFills(layer.style?.fills),
      opacity: this.getOpacity(layer.style),
      visible: layer.isVisible,
    } as CreateNodeOptions);
    this.nodeCount++;

    for (const child of layer.layers ?? []) {
      this.importLayer(child, componentId, options);
    }
  }

  // =========================================================================
  // Private Methods - Conversion
  // =========================================================================

  private convertFills(fills: SketchFill[] | undefined): object[] {
    if (!fills) return [];

    return fills
      .filter(fill => fill.isEnabled)
      .map(fill => {
        if (fill.fillType === 0 && fill.color) {
          return {
            type: 'SOLID',
            visible: true,
            color: this.convertColor(fill.color),
          };
        }

        if (fill.fillType === 1 && fill.gradient) {
          return {
            type: fill.gradient.gradientType === 0 ? 'GRADIENT_LINEAR' : 'GRADIENT_RADIAL',
            visible: true,
            gradientStops: fill.gradient.stops.map(stop => ({
              position: stop.position,
              color: this.convertColor(stop.color),
            })),
          };
        }

        return null;
      })
      .filter((fill): fill is NonNullable<typeof fill> => fill !== null);
  }

  private convertBorders(borders: SketchBorder[] | undefined, _scale: number): object[] {
    if (!borders) return [];

    return borders
      .filter(border => border.isEnabled)
      .map(border => ({
        type: 'SOLID',
        visible: true,
        color: this.convertColor(border.color),
      }));
  }

  private getStrokeWeight(borders: SketchBorder[] | undefined, scale: number): number | undefined {
    if (!borders || borders.length === 0) return undefined;

    const enabledBorder = borders.find(b => b.isEnabled);
    return enabledBorder ? enabledBorder.thickness * scale : undefined;
  }

  private convertEffects(style: SketchStyle | undefined): object[] {
    if (!style) return [];

    const effects: object[] = [];

    // Shadows
    for (const shadow of style.shadows ?? []) {
      if (shadow.isEnabled) {
        effects.push({
          type: 'DROP_SHADOW',
          visible: true,
          color: this.convertColor(shadow.color),
          offset: { x: shadow.offsetX, y: shadow.offsetY },
          radius: shadow.blurRadius,
          spread: shadow.spread,
        });
      }
    }

    // Inner shadows
    for (const shadow of style.innerShadows ?? []) {
      if (shadow.isEnabled) {
        effects.push({
          type: 'INNER_SHADOW',
          visible: true,
          color: this.convertColor(shadow.color),
          offset: { x: shadow.offsetX, y: shadow.offsetY },
          radius: shadow.blurRadius,
        });
      }
    }

    // Blur
    if (style.blur?.isEnabled) {
      effects.push({
        type: 'LAYER_BLUR',
        visible: true,
        radius: style.blur.radius,
      });
    }

    return effects;
  }

  private getOpacity(style: SketchStyle | undefined): number {
    return style?.contextSettings?.opacity ?? 1;
  }

  private convertColor(color: SketchColor): RGBA {
    return {
      r: color.red,
      g: color.green,
      b: color.blue,
      a: color.alpha,
    };
  }

  private convertPath(path: SketchPath, frame: SketchRect, scale: number): VectorPath {
    const commands: PathCommand[] = [];
    const points = path.points;

    if (points.length === 0) {
      return { windingRule: 'NONZERO', commands: [] };
    }

    // Parse first point
    const firstPoint = this.parsePoint(points[0]!.point, frame, scale);
    commands.push({ type: 'M', x: firstPoint.x, y: firstPoint.y });

    // Process remaining points
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1]!;
      const point = points[i]!;

      const from = this.parsePoint(prevPoint.point, frame, scale);
      const to = this.parsePoint(point.point, frame, scale);

      if (prevPoint.hasCurveFrom || point.hasCurveTo) {
        const cp1 = prevPoint.hasCurveFrom
          ? this.parsePoint(prevPoint.curveFrom, frame, scale)
          : from;
        const cp2 = point.hasCurveTo
          ? this.parsePoint(point.curveTo, frame, scale)
          : to;

        commands.push({
          type: 'C',
          x1: cp1.x,
          y1: cp1.y,
          x2: cp2.x,
          y2: cp2.y,
          x: to.x,
          y: to.y,
        });
      } else {
        commands.push({ type: 'L', x: to.x, y: to.y });
      }
    }

    // Close path if needed
    if (path.isClosed) {
      const lastPoint = points[points.length - 1]!;
      const firstPt = points[0]!;
      const from = this.parsePoint(lastPoint.point, frame, scale);
      const to = this.parsePoint(firstPt.point, frame, scale);

      if (lastPoint.hasCurveFrom || firstPt.hasCurveTo) {
        const cp1 = lastPoint.hasCurveFrom
          ? this.parsePoint(lastPoint.curveFrom, frame, scale)
          : from;
        const cp2 = firstPt.hasCurveTo
          ? this.parsePoint(firstPt.curveTo, frame, scale)
          : to;

        commands.push({
          type: 'C',
          x1: cp1.x,
          y1: cp1.y,
          x2: cp2.x,
          y2: cp2.y,
          x: to.x,
          y: to.y,
        });
      }
      commands.push({ type: 'Z' });
    }

    return { windingRule: 'NONZERO', commands };
  }

  private parsePoint(
    pointStr: string,
    frame: SketchRect,
    scale: number
  ): { x: number; y: number } {
    // Point format: "{x, y}" where x and y are 0-1 normalized
    const match = /\{([\d.]+),\s*([\d.]+)\}/.exec(pointStr);
    if (!match) {
      return { x: 0, y: 0 };
    }

    const nx = parseFloat(match[1]!);
    const ny = parseFloat(match[2]!);

    return {
      x: nx * frame.width * scale,
      y: ny * frame.height * scale,
    };
  }

  // =========================================================================
  // Private Methods - Helpers
  // =========================================================================

  private getDefaultParent(): NodeId {
    const doc = this.sceneGraph.getDocument();
    if (!doc) {
      throw new Error('No document in scene graph');
    }

    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) {
      throw new Error('No pages in document');
    }

    return pageIds[0]!;
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'svg': return 'image/svg+xml';
      case 'pdf': return 'application/pdf';
      default: return 'application/octet-stream';
    }
  }
}

/**
 * Create a Sketch importer.
 */
export function createSketchImporter(sceneGraph: SceneGraph): SketchImporter {
  return new SketchImporter(sceneGraph);
}
