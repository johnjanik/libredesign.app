/**
 * Main Renderer
 *
 * Coordinates WebGL rendering of the scene graph.
 */

import type { NodeId } from '@core/types/common';
import type { Matrix2x3 } from '@core/types/geometry';
import type { RGBA } from '@core/types/color';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeData, FrameNodeData, VectorNodeData, TextNodeData } from '@scene/nodes/base-node';
import { identity, multiply, compose } from '@core/math/matrix';
import { EventEmitter } from '@core/events/event-emitter';
import { WebGLContext, createWebGLContext } from './webgl-context';
import { Viewport, createViewport } from './viewport';
import { ShaderManager, createShaderManager, type ShaderProgram } from '../shaders/shader-manager';
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

  // WebGL resources
  private fillVAO: WebGLVertexArrayObject | null = null;
  private fillVBO: WebGLBuffer | null = null;
  private fillIBO: WebGLBuffer | null = null;


  // State
  private sceneGraph: SceneGraph | null = null;
  private clearColor: RGBA;
  private pixelRatio: number;
  private animationFrameId: number | null = null;
  private isRendering = false;

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

    // Set up VAO
    this.ctx.bindVertexArray(this.fillVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillVBO);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fillIBO);

    // Position attribute
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

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

    const pageId = pageIds[0]!;
    const page = this.sceneGraph.getNode(pageId);

    // Check if page is visible
    const pageVisible = page ? (page as { visible?: boolean }).visible !== false : true;

    if (!pageVisible) {
      // Page is hidden - show transparency grid
      this.renderTransparencyGrid();
      return;
    }

    // Render page and its children
    const viewProjection = this.viewport.getViewProjectionMatrix();
    this.renderNode(pageId, identity(), viewProjection);
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

    // Tessellate rectangle (FrameNode doesn't have cornerRadius in current types, default to 0)
    const cornerRadius = 0;
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

    // Render fills
    for (const fill of node.fills ?? []) {
      if (!fill.visible || fill.type !== 'SOLID') continue;

      const opacity = (node.opacity ?? 1) * (fill.opacity ?? 1);
      const path = node.vectorPaths?.[0];
      if (!path) continue;

      const tess = tessellateFill(path);
      if (tess.indices.length === 0) continue;

      const shader = this.shaders.use('fill');

      this.ctx.bindVertexArray(this.fillVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fillVBO);
      gl.bufferData(gl.ARRAY_BUFFER, tess.vertices, gl.DYNAMIC_DRAW);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fillIBO);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tess.indices, gl.DYNAMIC_DRAW);

      this.setMatrixUniform(shader, 'uViewProjection', viewProjection);
      this.setMatrixUniform(shader, 'uTransform', worldTransform);
      this.setColorUniform(shader, 'uColor', fill.color);
      gl.uniform1f(shader.uniforms.get('uOpacity')!, opacity);

      this.ctx.drawElements(gl.TRIANGLES, tess.indices.length, gl.UNSIGNED_SHORT, 0);
      this.drawCallCount++;
      this.triangleCount += tess.indices.length / 3;

      this.ctx.bindVertexArray(null);
    }

    // Note: Stroke rendering skipped for now - would require stroke VAO with normals
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
   * Dispose of the renderer.
   */
  dispose(): void {
    this.stopRenderLoop();

    // Clean up resources
    if (this.fillVAO) {
      this.ctx.deleteVertexArray(this.fillVAO);
    }
    if (this.fillVBO) {
      this.ctx.deleteBuffer(this.fillVBO);
    }
    if (this.fillIBO) {
      this.ctx.deleteBuffer(this.fillIBO);
    }

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
