/**
 * Main Renderer
 *
 * Coordinates WebGL rendering of the scene graph.
 */
import { identity, multiply, compose } from '@core/math/matrix';
import { EventEmitter } from '@core/events/event-emitter';
import { createWebGLContext } from './webgl-context';
import { createViewport } from './viewport';
import { createShaderManager } from '../shaders/shader-manager';
import { createTextureManager } from '../textures/texture-manager';
import { createBatchBuilder } from '../batching/batch-generator';
import { tessellateRect, tessellateRoundedRect, tessellateFill } from '../geometry/path-tessellation';
/**
 * Main Renderer class
 */
export class Renderer extends EventEmitter {
    canvas;
    ctx;
    viewport;
    shaders;
    textures;
    // WebGL resources
    fillVAO = null;
    fillVBO = null;
    fillIBO = null;
    // Image rendering resources (position + texcoord interleaved)
    imageVAO = null;
    imageVBO = null;
    imageIBO = null;
    // State
    sceneGraph = null;
    currentPageId = null;
    clearColor;
    pixelRatio;
    animationFrameId = null;
    isRendering = false;
    // Stats
    lastFrameTime = 0;
    frameCount = 0;
    drawCallCount = 0;
    triangleCount = 0;
    constructor(canvas, options = {}) {
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
    setupResources() {
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
    setSceneGraph(sceneGraph) {
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
    setCurrentPageId(pageId) {
        this.currentPageId = pageId;
        this.requestRender();
    }
    /**
     * Get the current page ID.
     */
    getCurrentPageId() {
        return this.currentPageId;
    }
    // =========================================================================
    // Viewport
    // =========================================================================
    /**
     * Get the viewport.
     */
    getViewport() {
        return this.viewport;
    }
    // =========================================================================
    // Rendering
    // =========================================================================
    /**
     * Request a render on next frame.
     */
    requestRender() {
        if (this.animationFrameId !== null)
            return;
        this.animationFrameId = requestAnimationFrame((time) => {
            this.animationFrameId = null;
            this.render(time);
        });
    }
    /**
     * Start continuous rendering loop.
     */
    startRenderLoop() {
        if (this.isRendering)
            return;
        this.isRendering = true;
        const loop = (time) => {
            if (!this.isRendering)
                return;
            this.render(time);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
    /**
     * Stop the render loop.
     */
    stopRenderLoop() {
        this.isRendering = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    /**
     * Render a frame.
     */
    render(time = performance.now()) {
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
    renderScene() {
        if (!this.sceneGraph)
            return;
        // Get document
        const doc = this.sceneGraph.getDocument();
        if (!doc)
            return;
        const pageIds = this.sceneGraph.getChildIds(doc.id);
        if (pageIds.length === 0)
            return;
        // Use currentPageId if set and valid, otherwise use first page
        let pageId = this.currentPageId;
        if (!pageId || !pageIds.includes(pageId)) {
            pageId = pageIds[0];
            this.currentPageId = pageId;
        }
        const page = this.sceneGraph.getNode(pageId);
        // Check if page is visible
        const pageVisible = page ? page.visible !== false : true;
        if (!pageVisible) {
            // Page is hidden - show transparency grid
            this.renderTransparencyGrid();
            return;
        }
        // Get page properties
        const pageData = page;
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
    renderPageBackground(color, opacity) {
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
        gl.uniform4f(shader.uniforms.get('uColor'), color.r, color.g, color.b, color.a);
        gl.uniform1f(shader.uniforms.get('uOpacity'), opacity);
        // Draw
        this.ctx.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        this.drawCallCount++;
        this.triangleCount += 2;
        this.ctx.bindVertexArray(null);
    }
    /**
     * Render transparency checkerboard grid.
     */
    renderTransparencyGrid() {
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
        gl.uniform1f(shader.uniforms.get('uGridSize'), gridSize);
        // Checkerboard colors (light and medium gray)
        gl.uniform4f(shader.uniforms.get('uColor1'), 0.3, 0.3, 0.3, 1.0);
        gl.uniform4f(shader.uniforms.get('uColor2'), 0.2, 0.2, 0.2, 1.0);
        // Draw
        this.ctx.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        this.drawCallCount++;
        this.triangleCount += 2;
        this.ctx.bindVertexArray(null);
    }
    /**
     * Render a node and its children.
     */
    renderNode(nodeId, parentTransform, viewProjection) {
        const node = this.sceneGraph.getNode(nodeId);
        if (!node)
            return;
        // Skip invisible nodes
        if ('visible' in node && !node.visible) {
            return;
        }
        // Calculate world transform
        const localTransform = this.getNodeTransform(node);
        const worldTransform = multiply(parentTransform, localTransform);
        // Render this node
        this.renderNodeContent(node, worldTransform, viewProjection);
        // Render children
        const childIds = this.sceneGraph.getChildIds(nodeId);
        for (const childId of childIds) {
            this.renderNode(childId, worldTransform, viewProjection);
        }
    }
    /**
     * Get the local transform for a node.
     */
    getNodeTransform(node) {
        if ('x' in node && 'y' in node) {
            const x = node.x;
            const y = node.y;
            const rotation = 'rotation' in node ? node.rotation : 0;
            // Convert rotation from degrees to radians
            const rotationRad = (rotation * Math.PI) / 180;
            return compose(x, y, rotationRad, 1, 1);
        }
        return identity();
    }
    /**
     * Render the content of a node.
     */
    renderNodeContent(node, worldTransform, viewProjection) {
        switch (node.type) {
            case 'FRAME':
                this.renderFrame(node, worldTransform, viewProjection);
                break;
            case 'VECTOR':
                this.renderVector(node, worldTransform, viewProjection);
                break;
            case 'IMAGE':
                this.renderImage(node, worldTransform, viewProjection);
                break;
            case 'TEXT':
                this.renderText(node, worldTransform, viewProjection);
                break;
            // Other node types...
        }
    }
    /**
     * Render a frame node.
     */
    renderFrame(node, worldTransform, viewProjection) {
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
        gl.uniform1f(shader.uniforms.get('uOpacity'), opacity);
        // Draw
        this.ctx.drawElements(gl.TRIANGLES, tess.indices.length, gl.UNSIGNED_SHORT, 0);
        this.drawCallCount++;
        this.triangleCount += tess.indices.length / 3;
        this.ctx.bindVertexArray(null);
    }
    /**
     * Render a vector node.
     */
    renderVector(node, worldTransform, viewProjection) {
        const gl = this.ctx.gl;
        // Render fills
        for (const fill of node.fills ?? []) {
            if (!fill.visible || fill.type !== 'SOLID')
                continue;
            const opacity = (node.opacity ?? 1) * (fill.opacity ?? 1);
            const path = node.vectorPaths?.[0];
            if (!path)
                continue;
            const tess = tessellateFill(path);
            if (tess.indices.length === 0)
                continue;
            const shader = this.shaders.use('fill');
            this.ctx.bindVertexArray(this.fillVAO);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.fillVBO);
            gl.bufferData(gl.ARRAY_BUFFER, tess.vertices, gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fillIBO);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tess.indices, gl.DYNAMIC_DRAW);
            this.setMatrixUniform(shader, 'uViewProjection', viewProjection);
            this.setMatrixUniform(shader, 'uTransform', worldTransform);
            this.setColorUniform(shader, 'uColor', fill.color);
            gl.uniform1f(shader.uniforms.get('uOpacity'), opacity);
            this.ctx.drawElements(gl.TRIANGLES, tess.indices.length, gl.UNSIGNED_SHORT, 0);
            this.drawCallCount++;
            this.triangleCount += tess.indices.length / 3;
            this.ctx.bindVertexArray(null);
        }
        // Note: Stroke rendering skipped for now - would require stroke VAO with normals
    }
    /**
     * Render an image node.
     */
    renderImage(node, worldTransform, viewProjection) {
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
        gl.uniform1i(shader.uniforms.get('uTexture'), 0);
        // Set uniforms
        this.setMatrixUniform(shader, 'uViewProjection', viewProjection);
        this.setMatrixUniform(shader, 'uTransform', worldTransform);
        gl.uniform1f(shader.uniforms.get('uOpacity'), opacity);
        gl.uniform1i(shader.uniforms.get('uTiling'), node.scaleMode === 'TILE' ? 1 : 0);
        // Draw
        this.ctx.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        this.drawCallCount++;
        this.triangleCount += 2;
        this.ctx.bindVertexArray(null);
    }
    /**
     * Render a placeholder rectangle for images that are loading.
     */
    renderImagePlaceholder(node, worldTransform, viewProjection, opacity) {
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
        gl.uniform4f(shader.uniforms.get('uColor'), 0.8, 0.8, 0.8, 1);
        gl.uniform1f(shader.uniforms.get('uOpacity'), opacity);
        this.ctx.drawElements(gl.TRIANGLES, tess.indices.length, gl.UNSIGNED_SHORT, 0);
        this.drawCallCount++;
        this.triangleCount += tess.indices.length / 3;
        this.ctx.bindVertexArray(null);
    }
    /**
     * Render a text node.
     */
    renderText(_node, _worldTransform, _viewProjection) {
        // Text rendering requires the text engine and glyph atlas
        // Placeholder for now
    }
    // =========================================================================
    // Uniform Helpers
    // =========================================================================
    setMatrixUniform(shader, name, matrix) {
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
    setColorUniform(shader, name, color) {
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
    resize() {
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
    getStats() {
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
    dispose() {
        this.stopRenderLoop();
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
export function createRenderer(canvas, options) {
    return new Renderer(canvas, options);
}
//# sourceMappingURL=renderer.js.map