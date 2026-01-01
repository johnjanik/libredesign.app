/**
 * WebGL Context Wrapper
 *
 * Wraps WebGL2 context with state caching for optimal performance.
 */
/**
 * WebGL Context wrapper with state caching
 */
export class WebGLContext {
    gl;
    state;
    extensions = new Map();
    constructor(canvas, options) {
        const gl = canvas.getContext('webgl2', {
            alpha: true,
            antialias: true,
            depth: false,
            stencil: true,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance',
            ...options,
        });
        if (!gl) {
            throw new Error('WebGL 2 is not supported');
        }
        this.gl = gl;
        // Initialize state
        this.state = {
            program: null,
            vao: null,
            framebuffer: null,
            viewport: { x: 0, y: 0, width: canvas.width, height: canvas.height },
            blendEnabled: false,
            blendSrc: gl.ONE,
            blendDst: gl.ZERO,
            depthTest: false,
            scissorEnabled: false,
            scissor: { x: 0, y: 0, width: canvas.width, height: canvas.height },
            activeTexture: gl.TEXTURE0,
            boundTextures: new Map(),
        };
        // Set up initial state
        this.setupInitialState();
    }
    // =========================================================================
    // Initial Setup
    // =========================================================================
    setupInitialState() {
        const gl = this.gl;
        // Enable blending by default
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        this.state.blendEnabled = true;
        this.state.blendSrc = gl.ONE;
        this.state.blendDst = gl.ONE_MINUS_SRC_ALPHA;
        // Disable depth test for 2D
        gl.disable(gl.DEPTH_TEST);
        this.state.depthTest = false;
        // Enable stencil for masking
        gl.enable(gl.STENCIL_TEST);
        gl.stencilMask(0xFF);
        // Set clear color
        gl.clearColor(0, 0, 0, 0);
    }
    // =========================================================================
    // Extensions
    // =========================================================================
    getExtension(name) {
        if (this.extensions.has(name)) {
            return this.extensions.get(name);
        }
        const ext = this.gl.getExtension(name);
        if (ext) {
            this.extensions.set(name, ext);
        }
        return ext;
    }
    // =========================================================================
    // State Management (Cached)
    // =========================================================================
    useProgram(program) {
        if (this.state.program !== program) {
            this.gl.useProgram(program);
            this.state.program = program;
        }
    }
    bindVertexArray(vao) {
        if (this.state.vao !== vao) {
            this.gl.bindVertexArray(vao);
            this.state.vao = vao;
        }
    }
    bindFramebuffer(framebuffer) {
        if (this.state.framebuffer !== framebuffer) {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
            this.state.framebuffer = framebuffer;
        }
    }
    setViewport(x, y, width, height) {
        const v = this.state.viewport;
        if (v.x !== x || v.y !== y || v.width !== width || v.height !== height) {
            this.gl.viewport(x, y, width, height);
            this.state.viewport = { x, y, width, height };
        }
    }
    setBlendEnabled(enabled) {
        if (this.state.blendEnabled !== enabled) {
            if (enabled) {
                this.gl.enable(this.gl.BLEND);
            }
            else {
                this.gl.disable(this.gl.BLEND);
            }
            this.state.blendEnabled = enabled;
        }
    }
    setBlendFunc(src, dst) {
        if (this.state.blendSrc !== src || this.state.blendDst !== dst) {
            this.gl.blendFunc(src, dst);
            this.state.blendSrc = src;
            this.state.blendDst = dst;
        }
    }
    setDepthTest(enabled) {
        if (this.state.depthTest !== enabled) {
            if (enabled) {
                this.gl.enable(this.gl.DEPTH_TEST);
            }
            else {
                this.gl.disable(this.gl.DEPTH_TEST);
            }
            this.state.depthTest = enabled;
        }
    }
    setScissorEnabled(enabled) {
        if (this.state.scissorEnabled !== enabled) {
            if (enabled) {
                this.gl.enable(this.gl.SCISSOR_TEST);
            }
            else {
                this.gl.disable(this.gl.SCISSOR_TEST);
            }
            this.state.scissorEnabled = enabled;
        }
    }
    setScissor(x, y, width, height) {
        const s = this.state.scissor;
        if (s.x !== x || s.y !== y || s.width !== width || s.height !== height) {
            this.gl.scissor(x, y, width, height);
            this.state.scissor = { x, y, width, height };
        }
    }
    activeTexture(unit) {
        if (this.state.activeTexture !== unit) {
            this.gl.activeTexture(unit);
            this.state.activeTexture = unit;
        }
    }
    bindTexture(target, texture, unit) {
        if (unit !== undefined) {
            this.activeTexture(this.gl.TEXTURE0 + unit);
        }
        const currentUnit = this.state.activeTexture;
        const currentTexture = this.state.boundTextures.get(currentUnit);
        if (currentTexture !== texture) {
            this.gl.bindTexture(target, texture);
            this.state.boundTextures.set(currentUnit, texture);
        }
    }
    // =========================================================================
    // Buffer Operations
    // =========================================================================
    createBuffer() {
        const buffer = this.gl.createBuffer();
        if (!buffer) {
            throw new Error('Failed to create buffer');
        }
        return buffer;
    }
    deleteBuffer(buffer) {
        this.gl.deleteBuffer(buffer);
    }
    bufferData(target, data, usage) {
        this.gl.bufferData(target, data, usage);
    }
    bufferSubData(target, offset, data) {
        this.gl.bufferSubData(target, offset, data);
    }
    // =========================================================================
    // Texture Operations
    // =========================================================================
    createTexture() {
        const texture = this.gl.createTexture();
        if (!texture) {
            throw new Error('Failed to create texture');
        }
        return texture;
    }
    deleteTexture(texture) {
        this.gl.deleteTexture(texture);
    }
    // =========================================================================
    // VAO Operations
    // =========================================================================
    createVertexArray() {
        const vao = this.gl.createVertexArray();
        if (!vao) {
            throw new Error('Failed to create VAO');
        }
        return vao;
    }
    deleteVertexArray(vao) {
        this.gl.deleteVertexArray(vao);
    }
    // =========================================================================
    // Framebuffer Operations
    // =========================================================================
    createFramebuffer() {
        const fb = this.gl.createFramebuffer();
        if (!fb) {
            throw new Error('Failed to create framebuffer');
        }
        return fb;
    }
    deleteFramebuffer(framebuffer) {
        this.gl.deleteFramebuffer(framebuffer);
    }
    // =========================================================================
    // Drawing Operations
    // =========================================================================
    clear(mask) {
        this.gl.clear(mask ?? (this.gl.COLOR_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT));
    }
    drawArrays(mode, first, count) {
        this.gl.drawArrays(mode, first, count);
    }
    drawElements(mode, count, type, offset) {
        this.gl.drawElements(mode, count, type, offset);
    }
    drawArraysInstanced(mode, first, count, instances) {
        this.gl.drawArraysInstanced(mode, first, count, instances);
    }
    drawElementsInstanced(mode, count, type, offset, instances) {
        this.gl.drawElementsInstanced(mode, count, type, offset, instances);
    }
    // =========================================================================
    // Utilities
    // =========================================================================
    getCanvasSize() {
        return {
            width: this.gl.drawingBufferWidth,
            height: this.gl.drawingBufferHeight,
        };
    }
    resize(width, height) {
        const canvas = this.gl.canvas;
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            this.setViewport(0, 0, width, height);
        }
    }
    getMaxTextureSize() {
        return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
    }
    checkError() {
        const error = this.gl.getError();
        if (error !== this.gl.NO_ERROR) {
            console.error('WebGL error:', error);
        }
    }
    /**
     * Reset all cached state (for debugging or state corruption recovery)
     */
    resetState() {
        this.state.program = null;
        this.state.vao = null;
        this.state.framebuffer = null;
        this.state.boundTextures.clear();
        this.setupInitialState();
    }
}
/**
 * Create a WebGL context.
 */
export function createWebGLContext(canvas, options) {
    return new WebGLContext(canvas, options);
}
//# sourceMappingURL=webgl-context.js.map