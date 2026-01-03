/**
 * AI-Powered PNG Importer
 *
 * Uses Ollama vision model to analyze PNG images and extract
 * UI elements as editable design nodes (leaves).
 *
 * Each imported PNG becomes a separate "leaf" - a top-level frame
 * containing all detected elements as child nodes.
 */

import type { NodeId } from '@core/types/common';
import type { RGBA } from '@core/types/color';
import type { SceneGraph, CreateNodeOptions } from '@scene/graph/scene-graph';
import { getConfigManager } from '@ai/config/config-manager';

// =============================================================================
// Types
// =============================================================================

/**
 * A detected UI element from vision analysis
 */
export interface DetectedElement {
  type: 'FRAME' | 'TEXT' | 'IMAGE' | 'VECTOR';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: RGBA;
  textContent?: string;
  fontSize?: number;
  fontWeight?: number;
  textColor?: RGBA;
  cornerRadius?: number;
  opacity?: number;
  children?: DetectedElement[];
}

/**
 * Vision analysis result from Ollama
 */
export interface VisionAnalysisResult {
  width: number;
  height: number;
  backgroundColor: RGBA;
  elements: DetectedElement[];
  description: string;
}

/**
 * Import options for AI PNG importer
 */
export interface AIPngImportOptions {
  /** Parent node ID to import into (defaults to current page) */
  parentId?: NodeId;
  /** Position X for the leaf frame */
  x?: number;
  /** Position Y for the leaf frame */
  y?: number;
  /** Vision model to use (defaults to config) */
  visionModel?: string;
  /** Chat model for structured extraction (defaults to config) */
  chatModel?: string;
  /** Ollama endpoint (defaults to config) */
  endpoint?: string;
  /** Include original image as background */
  includeOriginalImage?: boolean;
  /** Maximum dimension for analysis (for performance) */
  maxAnalysisDimension?: number;
}

/**
 * Result of importing a PNG
 */
export interface AIPngImportResult {
  /** Created leaf node ID */
  leafId: NodeId;
  /** Original image dimensions */
  originalWidth: number;
  originalHeight: number;
  /** Number of elements detected */
  elementCount: number;
  /** AI's description of the image */
  description: string;
  /** Processing time in ms */
  processingTime: number;
}

// =============================================================================
// Vision Analysis Prompts
// =============================================================================

const VISION_ANALYSIS_PROMPT = `Analyze this UI screenshot and extract all visual elements. Return a JSON object with the following structure:

{
  "width": <estimated image width in pixels>,
  "height": <estimated image height in pixels>,
  "backgroundColor": {"r": 0-1, "g": 0-1, "b": 0-1, "a": 1},
  "description": "<brief description of what this UI shows>",
  "elements": [
    {
      "type": "FRAME" | "TEXT" | "IMAGE",
      "name": "<descriptive name>",
      "x": <x position from left>,
      "y": <y position from top>,
      "width": <width in pixels>,
      "height": <height in pixels>,
      "backgroundColor": {"r": 0-1, "g": 0-1, "b": 0-1, "a": 1} (optional),
      "textContent": "<text content>" (for TEXT type),
      "fontSize": <font size> (for TEXT type),
      "fontWeight": 400 | 500 | 600 | 700 (for TEXT type),
      "textColor": {"r": 0-1, "g": 0-1, "b": 0-1, "a": 1} (for TEXT type),
      "cornerRadius": <corner radius> (optional),
      "children": [] (optional nested elements)
    }
  ]
}

Guidelines:
- Identify all visible UI elements: buttons, cards, text, icons, images, navigation bars
- Estimate positions relative to the image top-left corner
- For colors, convert hex to normalized RGB (0-1 range): #FF0000 = {"r": 1, "g": 0, "b": 0, "a": 1}
- Group related elements into parent FRAME containers
- Name elements descriptively (e.g., "Header", "Search Bar", "Card 1")
- Include all text content you can read
- Estimate font sizes based on visual appearance

Return ONLY the JSON object, no markdown or explanation.`;

// =============================================================================
// AI PNG Importer Class
// =============================================================================

/**
 * AI-Powered PNG Importer
 *
 * Uses Ollama vision model to analyze images and create editable design nodes.
 */
export class AIPngImporter {
  private sceneGraph: SceneGraph;

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  /**
   * Import a single PNG file as a leaf node.
   */
  async import(file: File, options: AIPngImportOptions = {}): Promise<AIPngImportResult> {
    const startTime = performance.now();

    // Load image and get dimensions
    const img = await this.loadImage(file);
    const originalWidth = img.width;
    const originalHeight = img.height;

    // Get config
    const config = getConfigManager().getProviderConfig('ollama');
    const endpoint = options.endpoint ?? config.endpoint ?? 'http://localhost:11434';
    const visionModel = options.visionModel ?? config.visionModel ?? 'llava:latest';

    // Convert image to base64
    const imageBase64 = await this.imageToBase64(img, options.maxAnalysisDimension);

    // Analyze image with vision model
    const analysis = await this.analyzeImage(endpoint, visionModel, imageBase64);

    // Create leaf node (parent frame for all detected elements)
    const parentId = options.parentId ?? this.getDefaultParent();
    const x = options.x ?? 0;
    const y = options.y ?? 0;

    const leafId = this.sceneGraph.createNode('FRAME', parentId, -1, {
      name: file.name.replace(/\.[^.]+$/, ''),
      x,
      y,
      width: analysis.width || originalWidth,
      height: analysis.height || originalHeight,
      fills: options.includeOriginalImage
        ? [{
            type: 'IMAGE',
            visible: true,
            imageUrl: await this.fileToDataUrl(file),
            scaleMode: 'FILL',
            opacity: 0.3, // Faded background for reference
          }]
        : [{
            type: 'SOLID',
            visible: true,
            color: analysis.backgroundColor || { r: 1, g: 1, b: 1, a: 1 },
          }],
      clipContent: true,
    } as CreateNodeOptions);

    // Create child nodes for each detected element
    let elementCount = 0;
    for (const element of analysis.elements) {
      elementCount += this.createElementNode(element, leafId);
    }

    const processingTime = performance.now() - startTime;

    return {
      leafId,
      originalWidth,
      originalHeight,
      elementCount,
      description: analysis.description,
      processingTime,
    };
  }

  /**
   * Import multiple PNG files, each as a separate leaf.
   */
  async importMultiple(
    files: File[],
    options: AIPngImportOptions = {}
  ): Promise<AIPngImportResult[]> {
    const results: AIPngImportResult[] = [];
    let offsetY = options.y ?? 0;

    for (const file of files) {
      const result = await this.import(file, {
        ...options,
        y: offsetY,
      });
      results.push(result);
      // Stack vertically with spacing
      offsetY += result.originalHeight + 40;
    }

    return results;
  }

  // =========================================================================
  // Private Methods - Vision Analysis
  // =========================================================================

  /**
   * Analyze image using Ollama vision model
   */
  private async analyzeImage(
    endpoint: string,
    model: string,
    imageBase64: string
  ): Promise<VisionAnalysisResult> {
    try {
      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: VISION_ANALYSIS_PROMPT,
              images: [imageBase64],
            },
          ],
          stream: false,
          options: {
            temperature: 0.1, // Low temperature for structured output
            num_predict: 4096,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Vision analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.message?.content ?? '';

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in vision response, using defaults');
        return this.getDefaultAnalysis();
      }

      const parsed = JSON.parse(jsonMatch[0]) as VisionAnalysisResult;
      return this.validateAnalysis(parsed);
    } catch (error) {
      console.error('Vision analysis error:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Validate and normalize analysis result
   */
  private validateAnalysis(analysis: Partial<VisionAnalysisResult>): VisionAnalysisResult {
    return {
      width: analysis.width ?? 400,
      height: analysis.height ?? 300,
      backgroundColor: this.validateColor(analysis.backgroundColor) ?? { r: 1, g: 1, b: 1, a: 1 },
      elements: (analysis.elements ?? []).map(el => this.validateElement(el)),
      description: analysis.description ?? 'Imported image',
    };
  }

  /**
   * Validate a detected element
   */
  private validateElement(element: Partial<DetectedElement>): DetectedElement {
    const validated: DetectedElement = {
      type: (['FRAME', 'TEXT', 'IMAGE', 'VECTOR'].includes(element.type ?? '')
        ? element.type
        : 'FRAME') as DetectedElement['type'],
      name: element.name ?? 'Element',
      x: Math.max(0, element.x ?? 0),
      y: Math.max(0, element.y ?? 0),
      width: Math.max(1, element.width ?? 100),
      height: Math.max(1, element.height ?? 50),
    };

    const bgColor = this.validateColor(element.backgroundColor);
    if (bgColor) validated.backgroundColor = bgColor;

    if (element.textContent) validated.textContent = element.textContent;
    if (element.fontSize) validated.fontSize = element.fontSize;
    if (element.fontWeight) validated.fontWeight = element.fontWeight;

    const txtColor = this.validateColor(element.textColor);
    if (txtColor) validated.textColor = txtColor;

    if (element.cornerRadius) validated.cornerRadius = element.cornerRadius;
    if (element.opacity !== undefined) validated.opacity = element.opacity;
    if (element.children) validated.children = element.children.map(c => this.validateElement(c));

    return validated;
  }

  /**
   * Validate color value
   */
  private validateColor(color: unknown): RGBA | undefined {
    if (!color || typeof color !== 'object') return undefined;
    const c = color as Record<string, unknown>;
    const r = c['r'];
    const g = c['g'];
    const b = c['b'];
    const a = c['a'];
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      return undefined;
    }
    return {
      r: Math.max(0, Math.min(1, r)),
      g: Math.max(0, Math.min(1, g)),
      b: Math.max(0, Math.min(1, b)),
      a: typeof a === 'number' ? Math.max(0, Math.min(1, a)) : 1,
    };
  }

  /**
   * Get default analysis for fallback
   */
  private getDefaultAnalysis(): VisionAnalysisResult {
    return {
      width: 400,
      height: 300,
      backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
      elements: [],
      description: 'Unable to analyze image',
    };
  }

  // =========================================================================
  // Private Methods - Node Creation
  // =========================================================================

  /**
   * Create a scene node from a detected element
   */
  private createElementNode(element: DetectedElement, parentId: NodeId): number {
    let count = 1;

    if (element.type === 'TEXT') {
      this.sceneGraph.createNode('TEXT', parentId, -1, {
        name: element.name,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        characters: element.textContent ?? '',
        fontSize: element.fontSize ?? 14,
        fontWeight: element.fontWeight ?? 400,
        fills: element.textColor
          ? [{ type: 'SOLID', visible: true, color: element.textColor }]
          : [{ type: 'SOLID', visible: true, color: { r: 0, g: 0, b: 0, a: 1 } }],
        opacity: element.opacity ?? 1,
      } as CreateNodeOptions);
    } else {
      // FRAME, IMAGE, or VECTOR - create as frame
      const nodeId = this.sceneGraph.createNode('FRAME', parentId, -1, {
        name: element.name,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        fills: element.backgroundColor
          ? [{ type: 'SOLID', visible: true, color: element.backgroundColor }]
          : [],
        cornerRadius: element.cornerRadius,
        opacity: element.opacity ?? 1,
        clipContent: true,
      } as CreateNodeOptions);

      // Create children recursively
      if (element.children) {
        for (const child of element.children) {
          count += this.createElementNode(child, nodeId);
        }
      }
    }

    return count;
  }

  // =========================================================================
  // Private Methods - Image Processing
  // =========================================================================

  /**
   * Load image from file
   */
  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Convert image to base64 for vision API
   */
  private async imageToBase64(
    img: HTMLImageElement,
    maxDimension?: number
  ): Promise<string> {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    // Scale down if needed for performance
    if (maxDimension && (width > maxDimension || height > maxDimension)) {
      const scale = maxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);

    // Get base64 without data URL prefix (Ollama format)
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.split(',')[1] ?? '';
  }

  /**
   * Convert file to data URL
   */
  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get default parent (current page)
   */
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
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an AI PNG importer instance.
 */
export function createAIPngImporter(sceneGraph: SceneGraph): AIPngImporter {
  return new AIPngImporter(sceneGraph);
}

// =============================================================================
// Standalone Import Function
// =============================================================================

/**
 * Import PNG files as leaves using AI vision analysis.
 *
 * Each PNG file becomes a separate leaf (frame) with all detected
 * UI elements as child nodes.
 *
 * @example
 * ```typescript
 * const results = await importPngsAsLeaves(sceneGraph, files, {
 *   visionModel: 'llava:latest',
 *   includeOriginalImage: true,
 * });
 *
 * for (const result of results) {
 *   console.log(`Imported ${result.leafId}: ${result.elementCount} elements`);
 * }
 * ```
 */
export async function importPngsAsLeaves(
  sceneGraph: SceneGraph,
  files: File[],
  options: AIPngImportOptions = {}
): Promise<AIPngImportResult[]> {
  const importer = createAIPngImporter(sceneGraph);
  return importer.importMultiple(files, options);
}
