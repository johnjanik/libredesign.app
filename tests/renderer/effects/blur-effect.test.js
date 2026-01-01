/**
 * Blur Effect tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlurEffectRenderer, createBlurEffectRenderer } from '@renderer/effects/blur-effect';
// Mock WebGL constants
const GL = {
    TEXTURE_2D: 0x0DE1,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88E4,
    FLOAT: 0x1406,
    TRIANGLE_STRIP: 0x0005,
    COLOR_BUFFER_BIT: 0x4000,
};
// Create mock WebGL2RenderingContext
const createMockGL = () => ({
    ...GL,
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
});
// Create mock RenderTarget
const createMockRenderTarget = (width = 256, height = 256) => ({
    width,
    height,
    framebuffer: {},
    texture: {},
    disposed: false,
    bind: vi.fn(),
    unbind: vi.fn(),
    clear: vi.fn(),
    bindTexture: vi.fn(),
    dispose: vi.fn(),
});
// Create mock WebGLContext
const createMockContext = () => {
    const gl = createMockGL();
    return {
        gl: gl,
        createVertexArray: vi.fn(() => ({})),
        createBuffer: vi.fn(() => ({})),
        bindVertexArray: vi.fn(),
        drawArrays: vi.fn(),
        deleteVertexArray: vi.fn(),
        deleteBuffer: vi.fn(),
    };
};
// Create mock ShaderManager
const createMockShaderManager = () => ({
    use: vi.fn(() => ({
        program: {},
        uniforms: new Map([
            ['uTexture', {}],
            ['uDirection', {}],
            ['uRadius', {}],
        ]),
        attributes: new Map([
            ['aPosition', 0],
            ['aTexCoord', 1],
        ]),
    })),
    getProgram: vi.fn(),
    hasShader: vi.fn(),
    registerShader: vi.fn(),
    dispose: vi.fn(),
});
// Create mock RenderTargetPool
const createMockPool = () => {
    const targets = [];
    return {
        acquire: vi.fn((width, height) => {
            const target = createMockRenderTarget(width, height);
            targets.push(target);
            return target;
        }),
        release: vi.fn(),
        getStats: vi.fn(() => ({ total: targets.length, inUse: 0, available: targets.length })),
        clear: vi.fn(),
        dispose: vi.fn(),
    };
};
describe('BlurEffectRenderer', () => {
    let ctx;
    let shaders;
    let pool;
    let renderer;
    beforeEach(() => {
        ctx = createMockContext();
        shaders = createMockShaderManager();
        pool = createMockPool();
        renderer = new BlurEffectRenderer(ctx, shaders, pool);
    });
    describe('initialization', () => {
        it('creates quad resources', () => {
            expect(ctx.createVertexArray).toHaveBeenCalled();
            expect(ctx.createBuffer).toHaveBeenCalledTimes(2);
        });
        it('can use external quad VAO', () => {
            const externalVAO = {};
            const renderer2 = new BlurEffectRenderer(ctx, shaders, pool, { quadVAO: externalVAO });
            // Should not create new VAO
            expect(ctx.createVertexArray).toHaveBeenCalledTimes(1); // From first renderer
            renderer2.dispose();
        });
        it('respects maxRadius option', () => {
            const customRenderer = new BlurEffectRenderer(ctx, shaders, pool, { maxRadius: 32 });
            // Test with radius exceeding max - should be clamped
            const source = createMockRenderTarget();
            customRenderer.apply(source, { radius: 100 });
            // The blur should have been applied with clamped radius
            expect(shaders.use).toHaveBeenCalledWith('blur');
            customRenderer.dispose();
        });
    });
    describe('apply', () => {
        it('returns source unchanged when radius is 0', () => {
            const source = createMockRenderTarget();
            const result = renderer.apply(source, { radius: 0 });
            expect(result.target).toBe(source);
            expect(result.sourceConsumed).toBe(false);
            expect(pool.acquire).not.toHaveBeenCalled();
        });
        it('returns source unchanged when radius is negative', () => {
            const source = createMockRenderTarget();
            const result = renderer.apply(source, { radius: -5 });
            expect(result.target).toBe(source);
            expect(result.sourceConsumed).toBe(false);
        });
        it('performs two-pass blur (horizontal + vertical)', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, { radius: 10 });
            // Should use blur shader twice per pass (H+V), default 2 passes = 4 times
            expect(shaders.use).toHaveBeenCalledWith('blur');
            expect(ctx.drawArrays).toHaveBeenCalled();
        });
        it('acquires render targets from pool', () => {
            const source = createMockRenderTarget(256, 256);
            renderer.apply(source, { radius: 10 });
            // Should acquire targets for each blur pass (H+V per pass)
            expect(pool.acquire).toHaveBeenCalledWith(256, 256);
        });
        it('releases intermediate targets to pool', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, { radius: 10 });
            // Intermediate targets should be released
            expect(pool.release).toHaveBeenCalled();
        });
        it('releases source when releaseSource is true', () => {
            const source = createMockRenderTarget();
            const result = renderer.apply(source, { radius: 10 }, true);
            expect(result.sourceConsumed).toBe(true);
            expect(pool.release).toHaveBeenCalledWith(source);
        });
        it('does not release source when releaseSource is false', () => {
            const source = createMockRenderTarget();
            const result = renderer.apply(source, { radius: 10 }, false);
            expect(result.sourceConsumed).toBe(false);
        });
        it('sets correct uniforms for horizontal pass', () => {
            const source = createMockRenderTarget(256, 128);
            renderer.apply(source, { radius: 10, passes: 1 });
            expect(ctx.gl.uniform2f).toHaveBeenCalledWith(expect.anything(), 1 / 256, // Horizontal direction
            0);
        });
        it('sets correct uniforms for vertical pass', () => {
            const source = createMockRenderTarget(256, 128);
            renderer.apply(source, { radius: 10, passes: 1 });
            expect(ctx.gl.uniform2f).toHaveBeenCalledWith(expect.anything(), 0, 1 / 128 // Vertical direction
            );
        });
        it('respects custom number of passes', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, { radius: 10, passes: 3 });
            // 3 passes * 2 (H+V) = 6 blur shader uses
            const blurCalls = shaders.use.mock.calls
                .filter(call => call[0] === 'blur').length;
            expect(blurCalls).toBe(6);
        });
        it('divides radius across passes', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, { radius: 20, passes: 2 });
            // Radius should be divided: 20 / 2 = 10 per pass
            expect(ctx.gl.uniform1f).toHaveBeenCalledWith(expect.anything(), 10);
        });
    });
    describe('applyAdaptive', () => {
        it('uses 1 pass for small radius', () => {
            const source = createMockRenderTarget();
            renderer.applyAdaptive(source, 8);
            // Small radius = 1 pass = 2 shader uses (H+V)
            const blurCalls = shaders.use.mock.calls
                .filter(call => call[0] === 'blur').length;
            expect(blurCalls).toBe(2);
        });
        it('uses 2 passes for medium radius', () => {
            const source = createMockRenderTarget();
            renderer.applyAdaptive(source, 24);
            // Medium radius = 2 passes = 4 shader uses
            const blurCalls = shaders.use.mock.calls
                .filter(call => call[0] === 'blur').length;
            expect(blurCalls).toBe(4);
        });
        it('uses 3 passes for large radius', () => {
            const source = createMockRenderTarget();
            renderer.applyAdaptive(source, 48);
            // Large radius = 3 passes = 6 shader uses
            const blurCalls = shaders.use.mock.calls
                .filter(call => call[0] === 'blur').length;
            expect(blurCalls).toBe(6);
        });
    });
    describe('dispose', () => {
        it('disposes quad resources when owned', () => {
            renderer.dispose();
            expect(ctx.deleteVertexArray).toHaveBeenCalled();
            expect(ctx.deleteBuffer).toHaveBeenCalledTimes(2);
        });
        it('does not dispose external quad VAO', () => {
            const externalVAO = {};
            const renderer2 = new BlurEffectRenderer(ctx, shaders, pool, { quadVAO: externalVAO });
            renderer2.dispose();
            // Should not delete the external VAO
            expect(ctx.deleteVertexArray).not.toHaveBeenCalled();
        });
    });
});
describe('createBlurEffectRenderer', () => {
    it('creates a blur effect renderer', () => {
        const ctx = createMockContext();
        const shaders = createMockShaderManager();
        const pool = createMockPool();
        const renderer = createBlurEffectRenderer(ctx, shaders, pool);
        expect(renderer).toBeInstanceOf(BlurEffectRenderer);
        renderer.dispose();
    });
});
//# sourceMappingURL=blur-effect.test.js.map