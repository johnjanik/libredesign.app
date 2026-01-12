/**
 * Main Renderer
 *
 * Coordinates WebGL rendering of the scene graph.
 */

import type { NodeId } from '@core/types/common';
import type { Matrix2x3, VectorPath } from '@core/types/geometry';
import type { RGBA } from '@core/types/color';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeData, FrameNodeData, VectorNodeData, ImageNodeData, TextNodeData } from '@scene/nodes/base-node';
import { identity, multiply, compose } from '@core/math/matrix';
import { EventEmitter } from '@core/events/event-emitter';
import { WebGLContext, createWebGLContext } from './webgl-context';
import { Viewport, createViewport } from './viewport';
import { ShaderManager, createShaderManager, type ShaderProgram } from '../shaders/shader-manager';
import { TextureManager, createTextureManager } from '../textures/texture-manager';
import { createBatchBuilder } from '../batching/batch-generator';
import { tessellateRect, tessellateRoundedRect, tessellateFill } from '../geometry/path-tessellation';

/**
 * Renderer events
 */
export type RendererEvents = {
  'frame:start': { time: number };
  'frame:end': { time: number; drawCalls: number };
  'resize': { width: number; height: number };
  [key: string]: unknown;
};

/**
 * Render statistics
 */
export interface RenderStats {
  readonly frameTime: number;
  readonly drawCalls: number;
  readonly triangles: number;
  readonly fps: number;
}

/**
 * Renderer options
 */
export interface RendererOptions {
  readonly clearColor?: RGBA;
  readonly antialias?: boolean;
  readonly pixelRatio?: number;
}

/**
 * Main Renderer class
 */
export class Renderer extends EventEmitter<RendererEvents> {
  private canvas: HTMLCanvasElement;
  private ctx: WebGLContext;
  private viewport: Viewport;
  private shaders: ShaderManager;
  private textures: TextureManager;

  // WebGL resources
  private fillVAO: WebGLVertexArrayObject | null = null;
  private fillVBO: WebGLBuffer | null = null;
  private fillIBO: WebGLBuffer | null = null;

  // Image rendering resources (position + texcoord interleaved)
  private imageVAO: WebGLVertexArrayObject | null = null;
  private imageVBO: WebGLBuffer | null = null;
  private imageIBO: WebGLBuffer | null = null;


  // State
  private sceneGraph: SceneGraph | null = null;
  private currentPageId: NodeId | null = null;
  private clearColor: RGBA;
  private pixelRatio: number;
  private animationFrameId: number | null = null;
  private isRendering = false;
  private showOriginCrosshair = false;

  // Stroke geometry cache (keyed by "nodeId:strokeWeight")
  private strokeGeomCache = new Map<string, { vertices: Float32Array; indices: Uint16Array }>();

  // Stats
  private lastFrameTime = 0;
  private frameCount = 0;
  private drawCallCount = 0;
  private triangleCount = 0;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    super();

    this.canvas = canvas;
    this.clearColor = options.clearColor ?? { r: 0.039, g: 0.039, b: 0.039, a: 1 };
    this.pixelRatio = options.pixelRatio ?? window.devicePixelRatio ?? 1;

    // Initialize WebGL
    this.ctx = createWebGLContext(canvas, { antialias: options.antialias ?? true });
    this.viewport = createViewport();
    this.shaders = createShaderManager(this.ctx);
    this.textures = createTextureManager(this.ctx);
    // Batch builder reserved for future batching optimization
    void createBatchBuilder;

    // Set up resources
    this.setupResources();

    // Initial resize
    this.resize();

    // Listen for viewport changes
    this.viewport.on('changed', () => {
      this.requestRender();
    });
  }

  // =========================================================================
  // Setup
  // =========================================================================

  /**
   * Set up WebGL resources.
   */
  private setupResources(): void {
    const gl = this.ctx.gl;

    // Create VAO for fills
    this.fillVAO = this.ctx.createVertexArray();
    this.fillVBO = this.ctx.createBuffer();
    this.fillIBO = this.ctx.createBuffer();

    // Set up fill VAO
    this.ctx.bindVertexArray(this.fillVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillVBO);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fillIBO);

    // Position attribute
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.ctx.bindVertexArray(null);

    // Create VAO for images (position + texcoord interleaved)
    this.imageVAO = this.ctx.createVertexArray();
    this.imageVBO = this.ctx.createBuffer();
    this.imageIBO = this.ctx.createBuffer();

    // Set up image VAO
    this.ctx.bindVertexArray(this.imageVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.imageVBO);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.imageIBO);

    // Position attribute (location 0): 2 floats
    // TexCoord attribute (location 1): 2 floats
    // Stride = 4 floats = 16 bytes
    const stride = 4 * 4; // 4 floats * 4 bytes
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 2 * 4);

    this.ctx.bindVertexArray(null);
  }

  // =========================================================================
  // Scene Graph
  // =========================================================================

  /**
   * Set the scene graph to render.
   */
  setSceneGraph(sceneGraph: SceneGraph): void {
    this.sceneGraph = sceneGraph;

    // Listen for changes
    sceneGraph.on('node:created', () => this.requestRender());
    sceneGraph.on('node:deleted', () => this.requestRender());
    sceneGraph.on('node:propertyChanged', () => this.requestRender());
    sceneGraph.on('node:parentChanged', () => this.requestRender());

    this.requestRender();
  }

  /**
   * Set the current page to render.
   */
  setCurrentPageId(pageId: NodeId | null): void {
    this.currentPageId = pageId;
    this.requestRender();
  }

  /**
   * Get the current page ID.
   */
  getCurrentPageId(): NodeId | null {
    return this.currentPageId;
  }

  // =========================================================================
  // Viewport
  // =========================================================================

  /**
   * Get the viewport.
   */
  getViewport(): Viewport {
    return this.viewport;
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  /**
   * Request a render on next frame.
   */
  requestRender(): void {
    if (this.animationFrameId !== null) return;

    this.animationFrameId = requestAnimationFrame((time) => {
      this.animationFrameId = null;
      this.render(time);
    });
  }

  /**
   * Start continuous rendering loop.
   */
  startRenderLoop(): void {
    if (this.isRendering) return;

    this.isRendering = true;
    const loop = (time: number) => {
      if (!this.isRendering) return;
      this.render(time);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /**
   * Stop the render loop.
   */
  stopRenderLoop(): void {
    this.isRendering = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Render a frame.
   */
  render(time: number = performance.now()): void {
    const startTime = performance.now();
    this.emit('frame:start', { time });

    this.drawCallCount = 0;
    this.triangleCount = 0;

    const gl = this.ctx.gl;

    // Clear
    const c = this.clearColor;
    gl.clearColor(c.r, c.g, c.b, c.a);
    this.ctx.clear();

    // Render scene
    if (this.sceneGraph) {
      this.renderScene();
    }

    // Render origin crosshair if enabled
    if (this.showOriginCrosshair) {
      this.renderOriginCrosshair();
    }

    this.lastFrameTime = performance.now() - startTime;
    this.frameCount++;

    this.emit('frame:end', { time, drawCalls: this.drawCallCount });
  }

  /**
   * Render the scene graph.
   */
  private renderScene(): void {
    if (!this.sceneGraph) return;

    // Get document
    const doc = this.sceneGraph.getDocument();
    if (!doc) return;

    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) return;

    // Use currentPageId if set and valid, otherwise use first page
    let pageId = this.currentPageId;
    if (!pageId || !pageIds.includes(pageId)) {
      pageId = pageIds[0]!;
      this.currentPageId = pageId;
    }

    const page = this.sceneGraph.getNode(pageId);

    // Check if page is visible
    const pageVisible = page ? (page as { visible?: boolean }).visible !== false : true;

    if (!pageVisible) {
      // Page is hidden - show transparency grid
      this.renderTransparencyGrid();
      return;
    }

    // Get page properties
    const pageData = page as { backgroundColor?: RGBA; opacity?: number };
    const bgColor = pageData.backgroundColor ?? { r: 0.102, g: 0.102, b: 0.102, a: 1 };
    const pageOpacity = pageData.opacity ?? 1;

    // If page has transparency, show grid underneath
    if (pageOpacity < 1) {
      this.renderTransparencyGrid();
    }

    // Render page background with its color and opacity
    this.renderPageBackground(bgColor, pageOpacity);

    // Render page children
    const viewProjection = this.viewport.getViewProjectionMatrix();
    const childIds = this.sceneGraph.getChildIds(pageId);
    for (const childId of childIds) {
      this.renderNode(childId, identity(), viewProjection);
    }
  }

  /**
   * Render the page background color.
   */
  private renderPageBackground(color: RGBA, opacity: number): void {
    const gl = this.ctx.gl;
    const viewProjection = this.viewport.getViewProjectionMatrix();

    // Get visible world bounds
    const bounds = this.viewport.getVisibleBounds();

    // Create fullscreen quad covering the visible area
    const vertices = new Float32Array([
      bounds.minX, bounds.minY,
      bounds.maxX, bounds.minY,
      bounds.maxX, bounds.maxY,
      bounds.minX, bounds.maxY,
    ]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    // Use fill shader
    const shader = this.shaders.use('fill');

    // Upload geometry
    this.ctx.bindVertexArray(this.fillVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fillIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Set uniforms
    this.setMatrixUniform(shader, 'uViewProjection', viewProjection);
    this.setMatrixUniform(shader, 'uTransform', identity());
    gl.uniform4f(shader.uniforms.get('uColor')!, color.r, color.g, color.b, color.a);
    gl.uniform1f(shader.uniforms.get('uOpacity')!, opacity);

    // Draw
    this.ctx.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    this.drawCallCount++;
    this.triangleCount += 2;

    this.ctx.bindVertexArray(null);
  }

  /**
   * Render transparency checkerboard grid.
   */
  private renderTransparencyGrid(): void {
    const gl = this.ctx.gl;
    const viewProjection = this.viewport.getViewProjectionMatrix();

    // Get visible world bounds
    const bounds = this.viewport.getVisibleBounds();
    const zoom = this.viewport.getZoom();

    const minX = bounds.minX;
    const minY = bounds.minY;
    const maxX = bounds.maxX;
    const maxY = bounds.maxY;

    // Create fullscreen quad covering the visible area
    const vertices = new Float32Array([
      minX, minY,
      maxX, minY,
      maxX, maxY,
      minX, maxY,
    ]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    // Use transparency grid shader
    const shader = this.shaders.use('transparencyGrid');

    // Upload geometry
    this.ctx.bindVertexArray(this.fillVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fillIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);

    // Set uniforms
    this.setMatrixUniform(shader, 'uViewProjection', viewProjection);

    // Grid size adjusts with zoom - aim for ~10 pixel squares on screen
    const gridSize = 10 / zoom;
    gl.uniform1f(shader.uniforms.get('uGridSize')!, gridSize);

    // Checkerboard colors (light and medium gray)
    gl.uniform4f(shader.uniforms.get('uColor1')!, 0.3, 0.3, 0.3, 1.0);
    gl.uniform4f(shader.uniforms.get('uColor2')!, 0.2, 0.2, 0.2, 1.0);

    // Draw
    this.ctx.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    this.drawCallCount++;
    this.triangleCount += 2;

    this.ctx.bindVertexArray(null);
  }

  /**
   * Render origin crosshair at (0, 0).
   */
  private renderOriginCrosshair(): void {
    const gl = this.ctx.gl;
    const viewProjection = this.viewport.getViewProjectionMatrix();
    const zoom = this.viewport.getZoom();

    // Use fill shader
    const shader = this.shaders.use('fill');

    // Calculate line length based on viewport (extend well beyond visible area)
    const bounds = this.viewport.getVisibleBounds();
    const extent = Math.max(
      Math.abs(bounds.maxX - bounds.minX),
      Math.abs(bounds.maxY - bounds.minY)
    ) * 2;

    // Line thickness in world space (2 pixels on screen)
    const thickness = 2 / zoom;

    // Red crosshair color
    const color = { r: 1.0, g: 0.2, b: 0.2, a: 0.8 };

    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Horizontal line through origin
    const hVertices = new Float32Array([
      -extent, -thickness / 2,
      extent, -thickness / 2,
      extent, thickness / 2,
      -extent, thickness / 2,
    ]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    this.ctx.bindVertexArray(this.fillVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillVBO);
    gl.bufferData(gl.ARRAY_BUFFER, hVertices, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fillIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);

    this.setMatrixUniform(shader, 'uViewProjection', viewProjection);
    this.setMatrixUniform(shader, 'uTransform', identity());
    gl.uniform4f(shader.uniforms.get('uColor')!, color.r, color.g, color.b, color.a);
    gl.uniform1f(shader.uniforms.get('uOpacity')!, 1.0);

    this.ctx.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    this.drawCallCount++;
    this.triangleCount += 2;

    // Vertical line through origin
    const vVertices = new Float32Array([
      -thickness / 2, -extent,
      thickness / 2, -extent,
      thickness / 2, extent,
      -thickness / 2, extent,
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, vVertices, gl.DYNAMIC_DRAW);
    this.ctx.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    this.drawCallCount++;
    this.triangleCount += 2;

    this.ctx.bindVertexArray(null);
  }

  /**
   * Render a node and its children.
   */
  private renderNode(nodeId: NodeId, parentTransform: Matrix2x3, viewProjection: Matrix2x3): void {
    const node = this.sceneGraph!.getNode(nodeId);
    if (!node) return;

    // Skip invisible nodes
    if ('visible' in node && !(node as { visible: boolean }).visible) {
      return;
    }

    // Calculate world transform
    const localTransform = this.getNodeTransform(node);
    const worldTransform = multiply(parentTransform, localTransform);

    // Render this node
    this.renderNodeContent(node, worldTransform, viewProjection);

    // Render children
    const childIds = this.sceneGraph!.getChildIds(nodeId);
    for (const childId of childIds) {
      this.renderNode(childId, worldTransform, viewProjection);
    }
  }

  /**
   * Get the local transform for a node.
   */
  private getNodeTransform(node: NodeData): Matrix2x3 {
    if ('x' in node && 'y' in node) {
      const x = (node as { x: number }).x;
      const y = (node as { y: number }).y;
      const rotation = 'rotation' in node ? (node as { rotation: number }).rotation : 0;
      // Convert rotation from degrees to radians
      const rotationRad = (rotation * Math.PI) / 180;

      return compose(x, y, rotationRad, 1, 1);
    }
    return identity();
  }

  /**
   * Render the content of a node.
   */
  private renderNodeContent(
    node: NodeData,
    worldTransform: Matrix2x3,
    viewProjection: Matrix2x3
  ): void {
    switch (node.type) {
      case 'FRAME':
        this.renderFrame(node as FrameNodeData, worldTransform, viewProjection);
        break;
      case 'VECTOR':
        this.renderVector(node as VectorNodeData, worldTransform, viewProjection);
        break;
      case 'IMAGE':
        this.renderImage(node as ImageNodeData, worldTransform, viewProjection);
        break;
      case 'TEXT':
        this.renderText(node as TextNodeData, worldTransform, viewProjection);
        break;
      // Other node types...
    }
  }

  /**
   * Render a frame node.
   */
  private renderFrame(
    node: FrameNodeData,
    worldTransform: Matrix2x3,
    viewProjection: Matrix2x3
  ): void {
    const gl = this.ctx.gl;

    // Get fill color
    const fill = node.fills?.[0];
    if (!fill || fill.type !== 'SOLID' || !fill.visible) {
      return;
    }

    const color = fill.color;
    const opacity = (node.opacity ?? 1) * (fill.opacity ?? 1);

    // Tessellate rectangle with corner radius if specified
    const cornerRadius = node.cornerRadius ?? 0;
    const tess = cornerRadius > 0
      ? tessellateRoundedRect(0, 0, node.width, node.height, cornerRadius)
      : tessellateRect(0, 0, node.width, node.height);

    // Use fill shader
    const shader = this.shaders.use('fill');

    // Upload geometry
    this.ctx.bindVertexArray(this.fillVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillVBO);
    gl.bufferData(gl.ARRAY_BUFFER, tess.vertices, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fillIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tess.indices, gl.DYNAMIC_DRAW);

    // Set uniforms
    this.setMatrixUniform(shader, 'uViewProjection', viewProjection);
    this.setMatrixUniform(shader, 'uTransform', worldTransform);
    this.setColorUniform(shader, 'uColor', color);
    gl.uniform1f(shader.uniforms.get('uOpacity')!, opacity);

    // Draw
    this.ctx.drawElements(gl.TRIANGLES, tess.indices.length, gl.UNSIGNED_SHORT, 0);
    this.drawCallCount++;
    this.triangleCount += tess.indices.length / 3;

    this.ctx.bindVertexArray(null);
  }

  /**
   * Render a vector node.
   */
  private renderVector(
    node: VectorNodeData,
    worldTransform: Matrix2x3,
    viewProjection: Matrix2x3
  ): void {
    const gl = this.ctx.gl;

    // Calculate scale factor based on node size vs path bounds
    const path = node.vectorPaths?.[0];
    if (!path) return;

    const pathBounds = this.getPathBounds(path);
    const nodeWidth = node.width ?? pathBounds.width;
    const nodeHeight = node.height ?? pathBounds.height;

    // Calculate scale to fit path to node dimensions
    const scaleX = pathBounds.width > 0 ? nodeWidth / pathBounds.width : 1;
    const scaleY = pathBounds.height > 0 ? nodeHeight / pathBounds.height : 1;

    // Apply scale to transform if needed
    let renderTransform = worldTransform;
    if (Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001) {
      // Create scaled transform: worldTransform * scale
      renderTransform = multiply(worldTransform, compose(0, 0, 0, scaleX, scaleY));
    }

    // Render fills
    for (const fill of node.fills ?? []) {
      if (!fill.visible || fill.type !== 'SOLID') continue;

      const opacity = (node.opacity ?? 1) * (fill.opacity ?? 1);

      const tess = tessellateFill(path);
      if (tess.indices.length === 0) continue;

      const shader = this.shaders.use('fill');

      this.ctx.bindVertexArray(this.fillVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fillVBO);
      gl.bufferData(gl.ARRAY_BUFFER, tess.vertices, gl.DYNAMIC_DRAW);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fillIBO);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tess.indices, gl.DYNAMIC_DRAW);

      this.setMatrixUniform(shader, 'uViewProjection', viewProjection);
      this.setMatrixUniform(shader, 'uTransform', renderTransform);
      this.setColorUniform(shader, 'uColor', fill.color);
      gl.uniform1f(shader.uniforms.get('uOpacity')!, opacity);

      this.ctx.drawElements(gl.TRIANGLES, tess.indices.length, gl.UNSIGNED_SHORT, 0);
      this.drawCallCount++;
      this.triangleCount += tess.indices.length / 3;

      this.ctx.bindVertexArray(null);
    }

    // Render strokes
    const strokeWeight = node.strokeWeight ?? 1;
    for (const stroke of node.strokes ?? []) {
      if (!stroke.visible || stroke.type !== 'SOLID') continue;

      const opacity = (node.opacity ?? 1) * (stroke.opacity ?? 1);

      // Use cached stroke geometry if available
      const cacheKey = `${node.id}:${strokeWeight}`;
      let strokeGeom = this.strokeGeomCache.get(cacheKey);
      if (!strokeGeom) {
        strokeGeom = this.tessellateStroke(path, strokeWeight);
        this.strokeGeomCache.set(cacheKey, strokeGeom);
      }
      if (strokeGeom.indices.length === 0) continue;

      const shader = this.shaders.use('fill');

      this.ctx.bindVertexArray(this.fillVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fillVBO);
      gl.bufferData(gl.ARRAY_BUFFER, strokeGeom.vertices, gl.DYNAMIC_DRAW);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fillIBO);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, strokeGeom.indices, gl.DYNAMIC_DRAW);

      this.setMatrixUniform(shader, 'uViewProjection', viewProjection);
      this.setMatrixUniform(shader, 'uTransform', renderTransform);
      this.setColorUniform(shader, 'uColor', stroke.color);
      gl.uniform1f(shader.uniforms.get('uOpacity')!, opacity);

      this.ctx.drawElements(gl.TRIANGLES, strokeGeom.indices.length, gl.UNSIGNED_SHORT, 0);
      this.drawCallCount++;
      this.triangleCount += strokeGeom.indices.length / 3;

      this.ctx.bindVertexArray(null);
    }
  }

  /**
   * Tessellate a path into stroke geometry (thick lines as triangles).
   */
  private tessellateStroke(path: VectorPath, strokeWeight: number): { vertices: Float32Array; indices: Uint16Array } {
    const halfWidth = strokeWeight / 2;
    const vertices: number[] = [];
    const indices: number[] = [];

    // Extract points from path
    const points: { x: number; y: number }[] = [];
    for (const cmd of path.commands) {
      if (cmd.type === 'M' || cmd.type === 'L') {
        points.push({ x: cmd.x, y: cmd.y });
      } else if (cmd.type === 'C') {
        // Approximate cubic bezier with line segments (64 segments for smooth curves)
        const lastPt = points[points.length - 1] || { x: 0, y: 0 };
        const segments = 64;
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const t2 = t * t;
          const t3 = t2 * t;
          const mt = 1 - t;
          const mt2 = mt * mt;
          const mt3 = mt2 * mt;
          points.push({
            x: mt3 * lastPt.x + 3 * mt2 * t * cmd.x1 + 3 * mt * t2 * cmd.x2 + t3 * cmd.x,
            y: mt3 * lastPt.y + 3 * mt2 * t * cmd.y1 + 3 * mt * t2 * cmd.y2 + t3 * cmd.y,
          });
        }
      }
    }

    if (points.length < 2) {
      return { vertices: new Float32Array([]), indices: new Uint16Array([]) };
    }

    // Generate stroke geometry
    let vertexIndex = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]!;
      const p1 = points[i + 1]!;

      // Direction vector
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.001) continue;

      // Perpendicular (normal) vector
      const nx = -dy / len * halfWidth;
      const ny = dx / len * halfWidth;

      // Four corners of the line quad
      const v0 = vertexIndex;
      vertices.push(p0.x + nx, p0.y + ny);  // top-left
      vertices.push(p0.x - nx, p0.y - ny);  // bottom-left
      vertices.push(p1.x - nx, p1.y - ny);  // bottom-right
      vertices.push(p1.x + nx, p1.y + ny);  // top-right
      vertexIndex += 4;

      // Two triangles for the quad
      indices.push(v0, v0 + 1, v0 + 2);
      indices.push(v0, v0 + 2, v0 + 3);
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }

  /**
   * Calculate bounds of a vector path.
   */
  private getPathBounds(path: VectorPath): { x: number; y: number; width: number; height: number } {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    let currentX = 0, currentY = 0;

    for (const cmd of path.commands) {
      switch (cmd.type) {
        case 'M':
        case 'L':
          currentX = cmd.x;
          currentY = cmd.y;
          minX = Math.min(minX, currentX);
          minY = Math.min(minY, currentY);
          maxX = Math.max(maxX, currentX);
          maxY = Math.max(maxY, currentY);
          break;
        case 'C':
          // Include control points and end point
          minX = Math.min(minX, cmd.x1, cmd.x2, cmd.x);
          minY = Math.min(minY, cmd.y1, cmd.y2, cmd.y);
          maxX = Math.max(maxX, cmd.x1, cmd.x2, cmd.x);
          maxY = Math.max(maxY, cmd.y1, cmd.y2, cmd.y);
          currentX = cmd.x;
          currentY = cmd.y;
          break;
        case 'Z':
          // ClosePath - no coordinates to update
          break;
      }
    }

    if (!isFinite(minX)) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Render an image node.
   */
  private renderImage(
    node: ImageNodeData,
    worldTransform: Matrix2x3,
    viewProjection: Matrix2x3
  ): void {
    const gl = this.ctx.gl;
    const opacity = node.opacity ?? 1;

    // Get or load texture
    const textureEntry = this.textures.getTexture(node.imageRef);
    if (!textureEntry) {
      // Start loading the texture if not already loading
      if (!this.textures.hasTexture(node.imageRef)) {
        // Load image from data URL
        const img = new Image();
        img.onload = () => {
          this.textures.loadFromImage(node.imageRef, img, {
            generateMipmaps: true,
            flipY: true,
          });
          // Trigger re-render once loaded
          this.requestRender();
        };
        img.onerror = () => {
          console.error('Failed to load image:', node.imageRef.slice(0, 50));
        };
        img.src = node.imageRef;

        // Create a placeholder entry to avoid repeated load attempts
        this.textures.loadFromData(node.imageRef + '_placeholder', 1, 1, new Uint8Array([200, 200, 200, 255]));
      }

      // Render placeholder rectangle
      this.renderImagePlaceholder(node, worldTransform, viewProjection, opacity);
      return;
    }

    // Create quad vertices with position + texcoord interleaved
    // Format: x, y, u, v for each vertex
    const vertices = new Float32Array([
      // Bottom-left
      0, 0, 0, 1,
      // Bottom-right
      node.width, 0, 1, 1,
      // Top-right
      node.width, node.height, 1, 0,
      // Top-left
      0, node.height, 0, 0,
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    // Use image shader
    const shader = this.shaders.use('image');

    // Upload geometry
    this.ctx.bindVertexArray(this.imageVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.imageVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.imageIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);

    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Bind texture
    this.textures.bindTextureEntry(textureEntry, 0);
    gl.uniform1i(shader.uniforms.get('uTexture')!, 0);

    // Set uniforms
    this.setMatrixUniform(shader, 'uViewProjection', viewProjection);
    this.setMatrixUniform(shader, 'uTransform', worldTransform);
    gl.uniform1f(shader.uniforms.get('uOpacity')!, opacity);
    gl.uniform1i(shader.uniforms.get('uTiling')!, node.scaleMode === 'TILE' ? 1 : 0);

    // Draw
    this.ctx.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    this.drawCallCount++;
    this.triangleCount += 2;

    this.ctx.bindVertexArray(null);
  }

  /**
   * Render a placeholder rectangle for images that are loading.
   */
  private renderImagePlaceholder(
    node: ImageNodeData,
    worldTransform: Matrix2x3,
    viewProjection: Matrix2x3,
    opacity: number
  ): void {
    const gl = this.ctx.gl;

    // Simple rectangle
    const tess = tessellateRect(0, 0, node.width, node.height);

    const shader = this.shaders.use('fill');

    this.ctx.bindVertexArray(this.fillVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillVBO);
    gl.bufferData(gl.ARRAY_BUFFER, tess.vertices, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fillIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tess.indices, gl.DYNAMIC_DRAW);

    this.setMatrixUniform(shader, 'uViewProjection', viewProjection);
    this.setMatrixUniform(shader, 'uTransform', worldTransform);
    // Light gray placeholder color
    gl.uniform4f(shader.uniforms.get('uColor')!, 0.8, 0.8, 0.8, 1);
    gl.uniform1f(shader.uniforms.get('uOpacity')!, opacity);

    this.ctx.drawElements(gl.TRIANGLES, tess.indices.length, gl.UNSIGNED_SHORT, 0);
    this.drawCallCount++;
    this.triangleCount += tess.indices.length / 3;

    this.ctx.bindVertexArray(null);
  }

  /**
   * Render a text node.
   */
  private renderText(
    _node: TextNodeData,
    _worldTransform: Matrix2x3,
    _viewProjection: Matrix2x3
  ): void {
    // Text rendering requires the text engine and glyph atlas
    // Placeholder for now
  }

  // =========================================================================
  // Uniform Helpers
  // =========================================================================

  private setMatrixUniform(shader: ShaderProgram, name: string, matrix: Matrix2x3): void {
    const location = shader.uniforms.get(name);
    if (location) {
      // Convert Matrix2x3 tuple [a, b, c, d, tx, ty] to 3x3 for GLSL
      const [a, b, c, d, tx, ty] = matrix;
      this.ctx.gl.uniformMatrix3fv(location, false, [
        a, b, 0,
        c, d, 0,
        tx, ty, 1,
      ]);
    }
  }

  private setColorUniform(shader: ShaderProgram, name: string, color: RGBA): void {
    const location = shader.uniforms.get(name);
    if (location) {
      this.ctx.gl.uniform4f(location, color.r, color.g, color.b, color.a);
    }
  }

  // =========================================================================
  // Resize
  // =========================================================================

  /**
   * Set the pixel ratio (for handling browser zoom changes).
   * Call this before resize() when devicePixelRatio changes.
   */
  setPixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
  }

  /**
   * Get the current pixel ratio.
   */
  getPixelRatio(): number {
    return this.pixelRatio;
  }

  /**
   * Resize the renderer to fit the canvas.
   */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.floor(rect.width * this.pixelRatio);
    const height = Math.floor(rect.height * this.pixelRatio);

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.ctx.resize(width, height);
      this.viewport.setCanvasSize(width, height);
      this.emit('resize', { width, height });
      this.requestRender();
    }
  }

  // =========================================================================
  // Canvas Settings
  // =========================================================================

  /**
   * Set the canvas clear/background color.
   */
  setClearColor(color: RGBA): void {
    this.clearColor = color;
    this.requestRender();
  }

  /**
   * Get the current clear color.
   */
  getClearColor(): RGBA {
    return this.clearColor;
  }

  /**
   * Set whether to show the origin crosshair.
   */
  setShowOriginCrosshair(show: boolean): void {
    this.showOriginCrosshair = show;
    this.requestRender();
  }

  /**
   * Get whether origin crosshair is shown.
   */
  getShowOriginCrosshair(): boolean {
    return this.showOriginCrosshair;
  }

  // =========================================================================
  // Stats
  // =========================================================================

  /**
   * Get render statistics.
   */
  getStats(): RenderStats {
    return {
      frameTime: this.lastFrameTime,
      drawCalls: this.drawCallCount,
      triangles: this.triangleCount,
      fps: this.frameCount > 0 ? 1000 / this.lastFrameTime : 0,
    };
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  /**
   * Invalidate stroke geometry cache for a specific node.
   * Call this when a node's path or stroke weight changes.
   */
  invalidateStrokeCache(nodeId: NodeId): void {
    // Remove all cache entries for this node
    for (const key of this.strokeGeomCache.keys()) {
      if (key.startsWith(`${nodeId}:`)) {
        this.strokeGeomCache.delete(key);
      }
    }
  }

  /**
   * Clear all stroke geometry cache.
   */
  clearStrokeCache(): void {
    this.strokeGeomCache.clear();
  }

  /**
   * Dispose of the renderer.
   */
  dispose(): void {
    this.stopRenderLoop();

    // Clean up stroke cache
    this.strokeGeomCache.clear();

    // Clean up fill resources
    if (this.fillVAO) {
      this.ctx.deleteVertexArray(this.fillVAO);
    }
    if (this.fillVBO) {
      this.ctx.deleteBuffer(this.fillVBO);
    }
    if (this.fillIBO) {
      this.ctx.deleteBuffer(this.fillIBO);
    }

    // Clean up image resources
    if (this.imageVAO) {
      this.ctx.deleteVertexArray(this.imageVAO);
    }
    if (this.imageVBO) {
      this.ctx.deleteBuffer(this.imageVBO);
    }
    if (this.imageIBO) {
      this.ctx.deleteBuffer(this.imageIBO);
    }

    this.textures.dispose();
    this.shaders.dispose();
  }
}

/**
 * Create a renderer.
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  options?: RendererOptions
): Renderer {
  return new Renderer(canvas, options);
}
