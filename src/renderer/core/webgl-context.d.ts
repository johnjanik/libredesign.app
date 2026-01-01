/**
 * WebGL Context Wrapper
 *
 * Wraps WebGL2 context with state caching for optimal performance.
 */
/**
 * WebGL Context wrapper with state caching
 */
export declare class WebGLContext {
    readonly gl: WebGL2RenderingContext;
    private state;
    private extensions;
    constructor(canvas: HTMLCanvasElement, options?: WebGLContextAttributes);
    private setupInitialState;
    getExtension<T>(name: string): T | null;
    useProgram(program: WebGLProgram | null): void;
    bindVertexArray(vao: WebGLVertexArrayObject | null): void;
    bindFramebuffer(framebuffer: WebGLFramebuffer | null): void;
    setViewport(x: number, y: number, width: number, height: number): void;
    setBlendEnabled(enabled: boolean): void;
    setBlendFunc(src: number, dst: number): void;
    setDepthTest(enabled: boolean): void;
    setScissorEnabled(enabled: boolean): void;
    setScissor(x: number, y: number, width: number, height: number): void;
    activeTexture(unit: number): void;
    bindTexture(target: number, texture: WebGLTexture | null, unit?: number): void;
    createBuffer(): WebGLBuffer;
    deleteBuffer(buffer: WebGLBuffer): void;
    bufferData(target: number, data: BufferSource | number, usage: number): void;
    bufferSubData(target: number, offset: number, data: BufferSource): void;
    createTexture(): WebGLTexture;
    deleteTexture(texture: WebGLTexture): void;
    createVertexArray(): WebGLVertexArrayObject;
    deleteVertexArray(vao: WebGLVertexArrayObject): void;
    createFramebuffer(): WebGLFramebuffer;
    deleteFramebuffer(framebuffer: WebGLFramebuffer): void;
    clear(mask?: number): void;
    drawArrays(mode: number, first: number, count: number): void;
    drawElements(mode: number, count: number, type: number, offset: number): void;
    drawArraysInstanced(mode: number, first: number, count: number, instances: number): void;
    drawElementsInstanced(mode: number, count: number, type: number, offset: number, instances: number): void;
    getCanvasSize(): {
        width: number;
        height: number;
    };
    resize(width: number, height: number): void;
    getMaxTextureSize(): number;
    checkError(): void;
    /**
     * Reset all cached state (for debugging or state corruption recovery)
     */
    resetState(): void;
}
/**
 * Create a WebGL context.
 */
export declare function createWebGLContext(canvas: HTMLCanvasElement, options?: WebGLContextAttributes): WebGLContext;
//# sourceMappingURL=webgl-context.d.ts.map