/**
 * Inner Shadow Effect tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InnerShadowEffectRenderer, createInnerShadowEffectRenderer } from '@renderer/effects/inner-shadow-effect';
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
    uniform4f: vi.fn(),
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
    use: vi.fn((_name) => ({
        program: {},
        uniforms: new Map([
            ['uTexture', {}],
            ['uDirection', {}],
            ['uRadius', {}],
            ['uOffset', {}],
            ['uColor', {}],
            ['uSpread', {}],
            ['uSource', {}],
            ['uShadow', {}],
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
// Default inner shadow config for tests
const defaultShadowConfig = {
    color: { r: 0, g: 0, b: 0, a: 0.5 },
    offset: { x: 2, y: 2 },
    radius: 4,
    spread: 0,
};
describe('InnerShadowEffectRenderer', () => {
    let ctx;
    let shaders;
    let pool;
    let renderer;
    beforeEach(() => {
        ctx = createMockContext();
        shaders = createMockShaderManager();
        pool = createMockPool();
        renderer = new InnerShadowEffectRenderer(ctx, shaders, pool);
    });
    describe('initialization', () => {
        it('creates quad resources', () => {
            expect(ctx.createVertexArray).toHaveBeenCalled();
            expect(ctx.createBuffer).toHaveBeenCalled();
        });
        it('respects maxBlurRadius option', () => {
            const customRenderer = new InnerShadowEffectRenderer(ctx, shaders, pool, {
                maxBlurRadius: 32,
            });
            expect(customRenderer).toBeInstanceOf(InnerShadowEffectRenderer);
            customRenderer.dispose();
        });
    });
    describe('apply', () => {
        it('uses innerShadow shader', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, defaultShadowConfig);
            expect(shaders.use).toHaveBeenCalledWith('innerShadow');
        });
        it('uses blur shader for shadow blur', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, defaultShadowConfig);
            expect(shaders.use).toHaveBeenCalledWith('blur');
        });
        it('uses innerShadowComposite shader for final compositing', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, defaultShadowConfig);
            expect(shaders.use).toHaveBeenCalledWith('innerShadowComposite');
        });
        it('sets shadow offset uniform', () => {
            const source = createMockRenderTarget(200, 100);
            const config = {
                ...defaultShadowConfig,
                offset: { x: 5, y: 10 },
            };
            renderer.apply(source, config);
            expect(ctx.gl.uniform2f).toHaveBeenCalledWith(expect.anything(), 5 / 200, // offset.x / width
            10 / 100 // offset.y / height
            );
        });
        it('sets shadow color uniform', () => {
            const source = createMockRenderTarget();
            const config = {
                ...defaultShadowConfig,
                color: { r: 0.8, g: 0.2, b: 0.1, a: 0.6 },
            };
            renderer.apply(source, config);
            expect(ctx.gl.uniform4f).toHaveBeenCalledWith(expect.anything(), 0.8, // r
            0.2, // g
            0.1, // b
            0.6 // a
            );
        });
        it('sets shadow spread uniform', () => {
            const source = createMockRenderTarget();
            const config = {
                ...defaultShadowConfig,
                spread: 3,
            };
            renderer.apply(source, config);
            expect(ctx.gl.uniform1f).toHaveBeenCalledWith(expect.anything(), 3);
        });
        it('acquires render targets from pool', () => {
            const source = createMockRenderTarget(256, 256);
            renderer.apply(source, defaultShadowConfig);
            expect(pool.acquire).toHaveBeenCalledWith(256, 256);
        });
        it('releases intermediate targets', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, defaultShadowConfig);
            expect(pool.release).toHaveBeenCalled();
        });
        it('releases source when releaseSource is true', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, defaultShadowConfig, true);
            expect(pool.release).toHaveBeenCalledWith(source);
        });
        it('does not release source when releaseSource is false', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, defaultShadowConfig, false);
            // Should not have released the source
            const releaseCalls = pool.release.mock.calls;
            const sourceReleased = releaseCalls.some(call => call[0] === source);
            expect(sourceReleased).toBe(false);
        });
        it('binds both source and shadow textures for composite', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, defaultShadowConfig);
            // Should set both uSource and uShadow uniforms
            expect(ctx.gl.uniform1i).toHaveBeenCalledWith(expect.anything(), 0); // uSource
            expect(ctx.gl.uniform1i).toHaveBeenCalledWith(expect.anything(), 1); // uShadow
        });
        it('returns a new render target', () => {
            const source = createMockRenderTarget();
            const result = renderer.apply(source, defaultShadowConfig);
            expect(result).not.toBe(source);
            expect(result.width).toBe(source.width);
            expect(result.height).toBe(source.height);
        });
    });
    describe('renderShadowOnly', () => {
        it('renders shadow without compositing', () => {
            const source = createMockRenderTarget();
            const shadow = renderer.renderShadowOnly(source, defaultShadowConfig);
            expect(shadow).toBeDefined();
            expect(shaders.use).toHaveBeenCalledWith('innerShadow');
            expect(shaders.use).toHaveBeenCalledWith('blur');
            // Should NOT use innerShadowComposite shader
            const compositeCalls = shaders.use.mock.calls
                .filter(call => call[0] === 'innerShadowComposite').length;
            expect(compositeCalls).toBe(0);
        });
        it('does not release source', () => {
            const source = createMockRenderTarget();
            renderer.renderShadowOnly(source, defaultShadowConfig);
            const releaseCalls = pool.release.mock.calls;
            const sourceReleased = releaseCalls.some(call => call[0] === source);
            expect(sourceReleased).toBe(false);
        });
    });
    describe('applyMultiple', () => {
        it('returns source unchanged when no configs', () => {
            const source = createMockRenderTarget();
            const result = renderer.applyMultiple(source, []);
            expect(result).toBe(source);
        });
        it('applies single shadow', () => {
            const source = createMockRenderTarget();
            const result = renderer.applyMultiple(source, [defaultShadowConfig]);
            expect(result).not.toBe(source);
            expect(shaders.use).toHaveBeenCalledWith('innerShadow');
        });
        it('applies multiple shadows in sequence', () => {
            const source = createMockRenderTarget();
            const configs = [
                { ...defaultShadowConfig, offset: { x: 2, y: 2 } },
                { ...defaultShadowConfig, offset: { x: -2, y: -2 } },
                { ...defaultShadowConfig, offset: { x: 0, y: 4 } },
            ];
            renderer.applyMultiple(source, configs);
            // Should call innerShadow shader 3 times
            const innerShadowCalls = shaders.use.mock.calls
                .filter(call => call[0] === 'innerShadow').length;
            expect(innerShadowCalls).toBe(3);
        });
        it('releases intermediate targets', () => {
            const source = createMockRenderTarget();
            const configs = [
                defaultShadowConfig,
                defaultShadowConfig,
            ];
            renderer.applyMultiple(source, configs);
            // Intermediate targets should be released
            expect(pool.release).toHaveBeenCalled();
        });
        it('respects releaseSource for first shadow only', () => {
            const source = createMockRenderTarget();
            const configs = [defaultShadowConfig, defaultShadowConfig];
            renderer.applyMultiple(source, configs, false);
            // Source should not be released
            const releaseCalls = pool.release.mock.calls;
            const sourceReleased = releaseCalls.some(call => call[0] === source);
            expect(sourceReleased).toBe(false);
        });
    });
    describe('calculatePadding', () => {
        it('calculates minimal padding for inner shadow', () => {
            const config = {
                color: { r: 0, g: 0, b: 0, a: 1 },
                offset: { x: 10, y: 5 },
                radius: 8,
                spread: 4,
            };
            const padding = InnerShadowEffectRenderer.calculatePadding(config);
            // Inner shadows are contained, only need radius * 0.5 for edge quality
            expect(padding).toBe(Math.ceil(8 * 0.5));
        });
        it('handles zero radius', () => {
            const config = {
                color: { r: 0, g: 0, b: 0, a: 1 },
                offset: { x: 0, y: 0 },
                radius: 0,
                spread: 0,
            };
            const padding = InnerShadowEffectRenderer.calculatePadding(config);
            expect(padding).toBe(0);
        });
    });
    describe('dispose', () => {
        it('disposes resources', () => {
            renderer.dispose();
            expect(ctx.deleteVertexArray).toHaveBeenCalled();
            expect(ctx.deleteBuffer).toHaveBeenCalled();
        });
    });
});
describe('createInnerShadowEffectRenderer', () => {
    it('creates an inner shadow effect renderer', () => {
        const ctx = createMockContext();
        const shaders = createMockShaderManager();
        const pool = createMockPool();
        const renderer = createInnerShadowEffectRenderer(ctx, shaders, pool);
        expect(renderer).toBeInstanceOf(InnerShadowEffectRenderer);
        renderer.dispose();
    });
});
//# sourceMappingURL=inner-shadow-effect.test.js.map