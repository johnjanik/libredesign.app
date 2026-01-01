/**
 * WebGL Context Wrapper
 *
 * Wraps WebGL2 context with state caching for optimal performance.
 */

/**
 * WebGL state for caching
 */
interface WebGLState {
  program: WebGLProgram | null;
  vao: WebGLVertexArrayObject | null;
  framebuffer: WebGLFramebuffer | null;
  viewport: { x: number; y: number; width: number; height: number };
  blendEnabled: boolean;
  blendSrc: number;
  blendDst: number;
  depthTest: boolean;
  scissorEnabled: boolean;
  scissor: { x: number; y: number; width: number; height: number };
  activeTexture: number;
  boundTextures: Map<number, WebGLTexture | null>;
}

/**
 * WebGL Context wrapper with state caching
 */
export class WebGLContext {
  readonly gl: WebGL2RenderingContext;
  private state: WebGLState;
  private extensions: Map<string, unknown> = new Map();

  constructor(canvas: HTMLCanvasElement, options?: WebGLContextAttributes) {
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

  private setupInitialState(): void {
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

  getExtension<T>(name: string): T | null {
    if (this.extensions.has(name)) {
      return this.extensions.get(name) as T;
    }

    const ext = this.gl.getExtension(name);
    if (ext) {
      this.extensions.set(name, ext);
    }
    return ext as T | null;
  }

  // =========================================================================
  // State Management (Cached)
  // =========================================================================

  useProgram(program: WebGLProgram | null): void {
    if (this.state.program !== program) {
      this.gl.useProgram(program);
      this.state.program = program;
    }
  }

  bindVertexArray(vao: WebGLVertexArrayObject | null): void {
    if (this.state.vao !== vao) {
      this.gl.bindVertexArray(vao);
      this.state.vao = vao;
    }
  }

  bindFramebuffer(framebuffer: WebGLFramebuffer | null): void {
    if (this.state.framebuffer !== framebuffer) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
      this.state.framebuffer = framebuffer;
    }
  }

  setViewport(x: number, y: number, width: number, height: number): void {
    const v = this.state.viewport;
    if (v.x !== x || v.y !== y || v.width !== width || v.height !== height) {
      this.gl.viewport(x, y, width, height);
      this.state.viewport = { x, y, width, height };
    }
  }

  setBlendEnabled(enabled: boolean): void {
    if (this.state.blendEnabled !== enabled) {
      if (enabled) {
        this.gl.enable(this.gl.BLEND);
      } else {
        this.gl.disable(this.gl.BLEND);
      }
      this.state.blendEnabled = enabled;
    }
  }

  setBlendFunc(src: number, dst: number): void {
    if (this.state.blendSrc !== src || this.state.blendDst !== dst) {
      this.gl.blendFunc(src, dst);
      this.state.blendSrc = src;
      this.state.blendDst = dst;
    }
  }

  setDepthTest(enabled: boolean): void {
    if (this.state.depthTest !== enabled) {
      if (enabled) {
        this.gl.enable(this.gl.DEPTH_TEST);
      } else {
        this.gl.disable(this.gl.DEPTH_TEST);
      }
      this.state.depthTest = enabled;
    }
  }

  setScissorEnabled(enabled: boolean): void {
    if (this.state.scissorEnabled !== enabled) {
      if (enabled) {
        this.gl.enable(this.gl.SCISSOR_TEST);
      } else {
        this.gl.disable(this.gl.SCISSOR_TEST);
      }
      this.state.scissorEnabled = enabled;
    }
  }

  setScissor(x: number, y: number, width: number, height: number): void {
    const s = this.state.scissor;
    if (s.x !== x || s.y !== y || s.width !== width || s.height !== height) {
      this.gl.scissor(x, y, width, height);
      this.state.scissor = { x, y, width, height };
    }
  }

  activeTexture(unit: number): void {
    if (this.state.activeTexture !== unit) {
      this.gl.activeTexture(unit);
      this.state.activeTexture = unit;
    }
  }

  bindTexture(target: number, texture: WebGLTexture | null, unit?: number): void {
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

  createBuffer(): WebGLBuffer {
    const buffer = this.gl.createBuffer();
    if (!buffer) {
      throw new Error('Failed to create buffer');
    }
    return buffer;
  }

  deleteBuffer(buffer: WebGLBuffer): void {
    this.gl.deleteBuffer(buffer);
  }

  bufferData(
    target: number,
    data: BufferSource | number,
    usage: number
  ): void {
    this.gl.bufferData(target, data as ArrayBufferView, usage);
  }

  bufferSubData(target: number, offset: number, data: BufferSource): void {
    this.gl.bufferSubData(target, offset, data as ArrayBufferView);
  }

  // =========================================================================
  // Texture Operations
  // =========================================================================

  createTexture(): WebGLTexture {
    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create texture');
    }
    return texture;
  }

  deleteTexture(texture: WebGLTexture): void {
    this.gl.deleteTexture(texture);
  }

  // =========================================================================
  // VAO Operations
  // =========================================================================

  createVertexArray(): WebGLVertexArrayObject {
    const vao = this.gl.createVertexArray();
    if (!vao) {
      throw new Error('Failed to create VAO');
    }
    return vao;
  }

  deleteVertexArray(vao: WebGLVertexArrayObject): void {
    this.gl.deleteVertexArray(vao);
  }

  // =========================================================================
  // Framebuffer Operations
  // =========================================================================

  createFramebuffer(): WebGLFramebuffer {
    const fb = this.gl.createFramebuffer();
    if (!fb) {
      throw new Error('Failed to create framebuffer');
    }
    return fb;
  }

  deleteFramebuffer(framebuffer: WebGLFramebuffer): void {
    this.gl.deleteFramebuffer(framebuffer);
  }

  // =========================================================================
  // Drawing Operations
  // =========================================================================

  clear(mask?: number): void {
    this.gl.clear(mask ?? (this.gl.COLOR_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT));
  }

  drawArrays(mode: number, first: number, count: number): void {
    this.gl.drawArrays(mode, first, count);
  }

  drawElements(mode: number, count: number, type: number, offset: number): void {
    this.gl.drawElements(mode, count, type, offset);
  }

  drawArraysInstanced(mode: number, first: number, count: number, instances: number): void {
    this.gl.drawArraysInstanced(mode, first, count, instances);
  }

  drawElementsInstanced(mode: number, count: number, type: number, offset: number, instances: number): void {
    this.gl.drawElementsInstanced(mode, count, type, offset, instances);
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  getCanvasSize(): { width: number; height: number } {
    return {
      width: this.gl.drawingBufferWidth,
      height: this.gl.drawingBufferHeight,
    };
  }

  resize(width: number, height: number): void {
    const canvas = this.gl.canvas as HTMLCanvasElement;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      this.setViewport(0, 0, width, height);
    }
  }

  getMaxTextureSize(): number {
    return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
  }

  checkError(): void {
    const error = this.gl.getError();
    if (error !== this.gl.NO_ERROR) {
      console.error('WebGL error:', error);
    }
  }

  /**
   * Reset all cached state (for debugging or state corruption recovery)
   */
  resetState(): void {
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
export function createWebGLContext(
  canvas: HTMLCanvasElement,
  options?: WebGLContextAttributes
): WebGLContext {
  return new WebGLContext(canvas, options);
}
