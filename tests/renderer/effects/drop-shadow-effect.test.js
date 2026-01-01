/**
 * Drop Shadow Effect tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DropShadowEffectRenderer, createDropShadowEffectRenderer } from '@renderer/effects/drop-shadow-effect';
// Mock WebGL constants
const GL = {
    TEXTURE_2D: 0x0DE1,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88E4,
    FLOAT: 0x1406,
    TRIANGLE_STRIP: 0x0005,
    COLOR_BUFFER_BIT: 0x4000,
    BLEND: 0x0BE2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
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
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
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
            ['uDestRect', {}],
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
// Default shadow config for tests
const defaultShadowConfig = {
    color: { r: 0, g: 0, b: 0, a: 0.5 },
    offset: { x: 4, y: 4 },
    radius: 8,
    spread: 0,
};
describe('DropShadowEffectRenderer', () => {
    let ctx;
    let shaders;
    let pool;
    let renderer;
    beforeEach(() => {
        ctx = createMockContext();
        shaders = createMockShaderManager();
        pool = createMockPool();
        renderer = new DropShadowEffectRenderer(ctx, shaders, pool);
    });
    describe('initialization', () => {
        it('creates quad resources', () => {
            expect(ctx.createVertexArray).toHaveBeenCalled();
            expect(ctx.createBuffer).toHaveBeenCalled();
        });
        it('respects maxBlurRadius option', () => {
            const customRenderer = new DropShadowEffectRenderer(ctx, shaders, pool, {
                maxBlurRadius: 32,
            });
            expect(customRenderer).toBeInstanceOf(DropShadowEffectRenderer);
            customRenderer.dispose();
        });
    });
    describe('apply', () => {
        it('uses shadow shader', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, defaultShadowConfig);
            expect(shaders.use).toHaveBeenCalledWith('shadow');
        });
        it('uses blur shader for shadow blur', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, defaultShadowConfig);
            expect(shaders.use).toHaveBeenCalledWith('blur');
        });
        it('uses composite shader for final compositing', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, defaultShadowConfig);
            expect(shaders.use).toHaveBeenCalledWith('composite');
        });
        it('sets shadow offset uniform', () => {
            const source = createMockRenderTarget(200, 100);
            const config = {
                ...defaultShadowConfig,
                offset: { x: 10, y: 20 },
            };
            renderer.apply(source, config);
            expect(ctx.gl.uniform2f).toHaveBeenCalledWith(expect.anything(), 10 / 200, // offset.x / width
            20 / 100 // offset.y / height
            );
        });
        it('sets shadow color uniform', () => {
            const source = createMockRenderTarget();
            const config = {
                ...defaultShadowConfig,
                color: { r: 1, g: 0.5, b: 0.25, a: 0.75 },
            };
            renderer.apply(source, config);
            expect(ctx.gl.uniform4f).toHaveBeenCalledWith(expect.anything(), 1, // r
            0.5, // g
            0.25, // b
            0.75 // a
            );
        });
        it('sets shadow spread uniform', () => {
            const source = createMockRenderTarget();
            const config = {
                ...defaultShadowConfig,
                spread: 5,
            };
            renderer.apply(source, config);
            expect(ctx.gl.uniform1f).toHaveBeenCalledWith(expect.anything(), 5);
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
        it('enables blending for compositing', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, defaultShadowConfig);
            expect(ctx.gl.enable).toHaveBeenCalledWith(GL.BLEND);
            expect(ctx.gl.blendFunc).toHaveBeenCalledWith(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
        });
        it('disables blending after compositing', () => {
            const source = createMockRenderTarget();
            renderer.apply(source, defaultShadowConfig);
            expect(ctx.gl.disable).toHaveBeenCalledWith(GL.BLEND);
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
            expect(shaders.use).toHaveBeenCalledWith('shadow');
            expect(shaders.use).toHaveBeenCalledWith('blur');
            // Should NOT use composite shader
            const compositeCalls = shaders.use.mock.calls
                .filter(call => call[0] === 'composite').length;
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
    describe('calculatePadding', () => {
        it('calculates padding based on radius, spread, and offset', () => {
            const config = {
                color: { r: 0, g: 0, b: 0, a: 1 },
                offset: { x: 10, y: 5 },
                radius: 8,
                spread: 4,
            };
            const padding = DropShadowEffectRenderer.calculatePadding(config);
            // radius * 2 + spread + |offset.x| + |offset.y|
            // 8 * 2 + 4 + 10 + 5 = 35
            expect(padding).toBe(35);
        });
        it('handles negative offset', () => {
            const config = {
                color: { r: 0, g: 0, b: 0, a: 1 },
                offset: { x: -10, y: -5 },
                radius: 8,
                spread: 0,
            };
            const padding = DropShadowEffectRenderer.calculatePadding(config);
            // radius * 2 + 0 + 10 + 5 = 31
            expect(padding).toBe(31);
        });
        it('handles zero values', () => {
            const config = {
                color: { r: 0, g: 0, b: 0, a: 1 },
                offset: { x: 0, y: 0 },
                radius: 0,
                spread: 0,
            };
            const padding = DropShadowEffectRenderer.calculatePadding(config);
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
describe('createDropShadowEffectRenderer', () => {
    it('creates a drop shadow effect renderer', () => {
        const ctx = createMockContext();
        const shaders = createMockShaderManager();
        const pool = createMockPool();
        const renderer = createDropShadowEffectRenderer(ctx, shaders, pool);
        expect(renderer).toBeInstanceOf(DropShadowEffectRenderer);
        renderer.dispose();
    });
});
//# sourceMappingURL=drop-shadow-effect.test.js.map