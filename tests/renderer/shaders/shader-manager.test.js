/**
 * Shader Manager tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShaderManager, createShaderManager } from '@renderer/shaders/shader-manager';
// Mock WebGL constants
const GL = {
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    COMPILE_STATUS: 0x8B81,
    LINK_STATUS: 0x8B82,
};
// Create mock WebGL2RenderingContext
const createMockGL = () => {
    let shaderCounter = 0;
    let programCounter = 0;
    return {
        ...GL,
        createShader: vi.fn(() => ({ _id: shaderCounter++, _type: 'shader' })),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn().mockReturnValue(true),
        getShaderInfoLog: vi.fn().mockReturnValue(''),
        deleteShader: vi.fn(),
        createProgram: vi.fn(() => ({ _id: programCounter++, _type: 'program' })),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn().mockReturnValue(true),
        getProgramInfoLog: vi.fn().mockReturnValue(''),
        deleteProgram: vi.fn(),
        getUniformLocation: vi.fn((_program, name) => ({ _name: name, _type: 'uniform' })),
        getAttribLocation: vi.fn((_program, name) => {
            const locations = {
                aPosition: 0,
                aTexCoord: 1,
                aNormal: 2,
            };
            return locations[name] ?? -1;
        }),
        useProgram: vi.fn(),
    };
};
// Create mock WebGLContext
const createMockContext = () => {
    const gl = createMockGL();
    return {
        gl: gl,
        useProgram: vi.fn(),
    };
};
describe('ShaderManager', () => {
    let ctx;
    let manager;
    beforeEach(() => {
        ctx = createMockContext();
        manager = new ShaderManager(ctx);
    });
    describe('initialization', () => {
        it('registers built-in shaders on construction', () => {
            expect(manager.hasShader('fill')).toBe(true);
            expect(manager.hasShader('stroke')).toBe(true);
            expect(manager.hasShader('text-sdf')).toBe(true);
            expect(manager.hasShader('image')).toBe(true);
            expect(manager.hasShader('blur')).toBe(true);
            expect(manager.hasShader('composite')).toBe(true);
            expect(manager.hasShader('shadow')).toBe(true);
            expect(manager.hasShader('innerShadow')).toBe(true);
            expect(manager.hasShader('innerShadowComposite')).toBe(true);
        });
        it('does not compile shaders until requested', () => {
            expect(ctx.gl.createShader).not.toHaveBeenCalled();
            expect(ctx.gl.createProgram).not.toHaveBeenCalled();
        });
    });
    describe('registerShader', () => {
        it('registers custom shaders', () => {
            const customSource = {
                vertex: 'void main() {}',
                fragment: 'void main() {}',
                uniforms: ['uCustom'],
                attributes: ['aCustom'],
            };
            manager.registerShader('custom', customSource);
            expect(manager.hasShader('custom')).toBe(true);
        });
        it('overwrites existing shader with same name', () => {
            const source1 = {
                vertex: 'version1',
                fragment: 'version1',
            };
            const source2 = {
                vertex: 'version2',
                fragment: 'version2',
            };
            manager.registerShader('test', source1);
            manager.registerShader('test', source2);
            expect(manager.hasShader('test')).toBe(true);
            // The second registration should have overwritten the first
        });
        it('registers shader without uniforms or attributes', () => {
            const minimalSource = {
                vertex: 'void main() {}',
                fragment: 'void main() {}',
            };
            manager.registerShader('minimal', minimalSource);
            expect(manager.hasShader('minimal')).toBe(true);
        });
    });
    describe('hasShader', () => {
        it('returns true for registered shaders', () => {
            expect(manager.hasShader('fill')).toBe(true);
        });
        it('returns false for unregistered shaders', () => {
            expect(manager.hasShader('nonexistent')).toBe(false);
        });
        it('returns true after custom registration', () => {
            expect(manager.hasShader('myShader')).toBe(false);
            manager.registerShader('myShader', {
                vertex: 'v',
                fragment: 'f',
            });
            expect(manager.hasShader('myShader')).toBe(true);
        });
    });
    describe('getProgram', () => {
        it('compiles shader on first access', () => {
            const program = manager.getProgram('fill');
            expect(program).toBeDefined();
            expect(program.program).toBeDefined();
            expect(ctx.gl.createShader).toHaveBeenCalledTimes(2);
            expect(ctx.gl.createProgram).toHaveBeenCalledTimes(1);
        });
        it('returns cached program on subsequent access', () => {
            const program1 = manager.getProgram('fill');
            const program2 = manager.getProgram('fill');
            expect(program2).toBe(program1);
            expect(ctx.gl.createProgram).toHaveBeenCalledTimes(1);
        });
        it('compiles different shaders independently', () => {
            const fillProgram = manager.getProgram('fill');
            const strokeProgram = manager.getProgram('stroke');
            expect(fillProgram).not.toBe(strokeProgram);
            expect(ctx.gl.createProgram).toHaveBeenCalledTimes(2);
        });
        it('throws for unknown shader', () => {
            expect(() => manager.getProgram('unknown')).toThrow('Unknown shader: unknown');
        });
        it('retrieves uniform locations', () => {
            const program = manager.getProgram('fill');
            expect(program.uniforms.get('uViewProjection')).toBeDefined();
            expect(program.uniforms.get('uTransform')).toBeDefined();
            expect(program.uniforms.get('uColor')).toBeDefined();
            expect(program.uniforms.get('uOpacity')).toBeDefined();
        });
        it('retrieves attribute locations', () => {
            const program = manager.getProgram('fill');
            expect(program.attributes.get('aPosition')).toBe(0);
        });
        it('retrieves multiple attribute locations', () => {
            const program = manager.getProgram('stroke');
            expect(program.attributes.get('aPosition')).toBe(0);
            expect(program.attributes.get('aNormal')).toBe(2);
        });
        it('handles missing uniform locations gracefully', () => {
            ctx.gl.getUniformLocation.mockReturnValue(null);
            const program = manager.getProgram('image');
            // Should not throw, just skip missing uniforms
            expect(program.uniforms.size).toBe(0);
        });
        it('handles invalid attribute locations gracefully', () => {
            ctx.gl.getAttribLocation.mockReturnValue(-1);
            const program = manager.getProgram('fill');
            // Should not throw, just skip invalid attributes
            expect(program.attributes.size).toBe(0);
        });
        it('deletes intermediate shaders after linking', () => {
            manager.getProgram('fill');
            expect(ctx.gl.deleteShader).toHaveBeenCalledTimes(2);
        });
    });
    describe('compilation errors', () => {
        it('throws on shader creation failure', () => {
            ctx.gl.createShader.mockReturnValue(null);
            expect(() => manager.getProgram('fill')).toThrow('Failed to create shader');
        });
        it('throws on vertex shader compilation failure', () => {
            ctx.gl.getShaderParameter.mockReturnValueOnce(false);
            ctx.gl.getShaderInfoLog.mockReturnValueOnce('Vertex error');
            expect(() => manager.getProgram('fill')).toThrow('Failed to compile shader: Vertex error');
        });
        it('throws on fragment shader compilation failure', () => {
            ctx.gl.getShaderParameter
                .mockReturnValueOnce(true) // vertex succeeds
                .mockReturnValueOnce(false); // fragment fails
            ctx.gl.getShaderInfoLog.mockReturnValueOnce('Fragment error');
            expect(() => manager.getProgram('fill')).toThrow('Failed to compile shader: Fragment error');
        });
        it('deletes shader on compilation failure', () => {
            ctx.gl.getShaderParameter.mockReturnValueOnce(false);
            try {
                manager.getProgram('fill');
            }
            catch {
                // Expected
            }
            expect(ctx.gl.deleteShader).toHaveBeenCalled();
        });
        it('throws on program creation failure', () => {
            ctx.gl.createProgram.mockReturnValue(null);
            expect(() => manager.getProgram('fill')).toThrow('Failed to create program');
        });
        it('throws on link failure', () => {
            ctx.gl.getProgramParameter.mockReturnValue(false);
            ctx.gl.getProgramInfoLog.mockReturnValue('Link error');
            expect(() => manager.getProgram('fill')).toThrow('Failed to link program: Link error');
        });
        it('cleans up on link failure', () => {
            ctx.gl.getProgramParameter.mockReturnValue(false);
            try {
                manager.getProgram('fill');
            }
            catch {
                // Expected
            }
            expect(ctx.gl.deleteProgram).toHaveBeenCalled();
            expect(ctx.gl.deleteShader).toHaveBeenCalledTimes(2);
        });
    });
    describe('use', () => {
        it('activates the shader program', () => {
            const program = manager.use('fill');
            expect(ctx.useProgram).toHaveBeenCalledWith(program.program);
        });
        it('returns the shader program', () => {
            const program = manager.use('fill');
            expect(program).toBeDefined();
            expect(program.program).toBeDefined();
            expect(program.uniforms).toBeInstanceOf(Map);
            expect(program.attributes).toBeInstanceOf(Map);
        });
        it('compiles shader on first use', () => {
            manager.use('image');
            expect(ctx.gl.createProgram).toHaveBeenCalled();
        });
        it('throws for unknown shader', () => {
            expect(() => manager.use('nonexistent')).toThrow('Unknown shader: nonexistent');
        });
        it('can switch between shaders', () => {
            const fillProgram = manager.use('fill');
            const strokeProgram = manager.use('stroke');
            manager.use('fill');
            expect(ctx.useProgram).toHaveBeenCalledTimes(3);
            expect(ctx.useProgram).toHaveBeenNthCalledWith(1, fillProgram.program);
            expect(ctx.useProgram).toHaveBeenNthCalledWith(2, strokeProgram.program);
            expect(ctx.useProgram).toHaveBeenNthCalledWith(3, fillProgram.program);
        });
    });
    describe('dispose', () => {
        it('deletes all compiled programs', () => {
            manager.getProgram('fill');
            manager.getProgram('stroke');
            manager.getProgram('image');
            manager.dispose();
            expect(ctx.gl.deleteProgram).toHaveBeenCalledTimes(3);
        });
        it('clears the program cache', () => {
            const program1 = manager.getProgram('fill');
            manager.dispose();
            // Re-create manager since programs are cleared
            manager = new ShaderManager(ctx);
            const program2 = manager.getProgram('fill');
            // Different program instances
            expect(program2).not.toBe(program1);
        });
        it('handles dispose with no compiled programs', () => {
            expect(() => manager.dispose()).not.toThrow();
            expect(ctx.gl.deleteProgram).not.toHaveBeenCalled();
        });
        it('can be called multiple times safely', () => {
            manager.getProgram('fill');
            manager.dispose();
            manager.dispose();
            expect(ctx.gl.deleteProgram).toHaveBeenCalledTimes(1);
        });
    });
    describe('built-in shaders', () => {
        it('fill shader has correct uniforms and attributes', () => {
            const program = manager.getProgram('fill');
            expect(program.uniforms.has('uViewProjection')).toBe(true);
            expect(program.uniforms.has('uTransform')).toBe(true);
            expect(program.uniforms.has('uColor')).toBe(true);
            expect(program.uniforms.has('uOpacity')).toBe(true);
            expect(program.attributes.has('aPosition')).toBe(true);
        });
        it('stroke shader has correct uniforms and attributes', () => {
            const program = manager.getProgram('stroke');
            expect(program.uniforms.has('uViewProjection')).toBe(true);
            expect(program.uniforms.has('uTransform')).toBe(true);
            expect(program.uniforms.has('uColor')).toBe(true);
            expect(program.uniforms.has('uOpacity')).toBe(true);
            expect(program.uniforms.has('uStrokeWidth')).toBe(true);
            expect(program.attributes.has('aPosition')).toBe(true);
            expect(program.attributes.has('aNormal')).toBe(true);
        });
        it('text-sdf shader has correct uniforms and attributes', () => {
            const program = manager.getProgram('text-sdf');
            expect(program.uniforms.has('uViewProjection')).toBe(true);
            expect(program.uniforms.has('uTransform')).toBe(true);
            expect(program.uniforms.has('uColor')).toBe(true);
            expect(program.uniforms.has('uOpacity')).toBe(true);
            expect(program.uniforms.has('uAtlas')).toBe(true);
            expect(program.uniforms.has('uSDFParams')).toBe(true);
            expect(program.attributes.has('aPosition')).toBe(true);
            expect(program.attributes.has('aTexCoord')).toBe(true);
        });
        it('image shader has correct uniforms and attributes', () => {
            const program = manager.getProgram('image');
            expect(program.uniforms.has('uViewProjection')).toBe(true);
            expect(program.uniforms.has('uTransform')).toBe(true);
            expect(program.uniforms.has('uOpacity')).toBe(true);
            expect(program.uniforms.has('uTexture')).toBe(true);
            expect(program.attributes.has('aPosition')).toBe(true);
            expect(program.attributes.has('aTexCoord')).toBe(true);
        });
        it('blur shader has correct uniforms and attributes', () => {
            const program = manager.getProgram('blur');
            expect(program.uniforms.has('uTexture')).toBe(true);
            expect(program.uniforms.has('uDirection')).toBe(true);
            expect(program.uniforms.has('uRadius')).toBe(true);
            expect(program.attributes.has('aPosition')).toBe(true);
            expect(program.attributes.has('aTexCoord')).toBe(true);
        });
        it('composite shader has correct uniforms and attributes', () => {
            const program = manager.getProgram('composite');
            expect(program.uniforms.has('uTexture')).toBe(true);
            expect(program.uniforms.has('uDestRect')).toBe(true);
            expect(program.attributes.has('aPosition')).toBe(true);
            expect(program.attributes.has('aTexCoord')).toBe(true);
        });
        it('shadow shader has correct uniforms and attributes', () => {
            const program = manager.getProgram('shadow');
            expect(program.uniforms.has('uTexture')).toBe(true);
            expect(program.uniforms.has('uOffset')).toBe(true);
            expect(program.uniforms.has('uColor')).toBe(true);
            expect(program.uniforms.has('uSpread')).toBe(true);
            expect(program.attributes.has('aPosition')).toBe(true);
            expect(program.attributes.has('aTexCoord')).toBe(true);
        });
        it('innerShadow shader has correct uniforms and attributes', () => {
            const program = manager.getProgram('innerShadow');
            expect(program.uniforms.has('uTexture')).toBe(true);
            expect(program.uniforms.has('uOffset')).toBe(true);
            expect(program.uniforms.has('uColor')).toBe(true);
            expect(program.uniforms.has('uSpread')).toBe(true);
            expect(program.attributes.has('aPosition')).toBe(true);
            expect(program.attributes.has('aTexCoord')).toBe(true);
        });
        it('innerShadowComposite shader has correct uniforms and attributes', () => {
            const program = manager.getProgram('innerShadowComposite');
            expect(program.uniforms.has('uSource')).toBe(true);
            expect(program.uniforms.has('uShadow')).toBe(true);
            expect(program.attributes.has('aPosition')).toBe(true);
            expect(program.attributes.has('aTexCoord')).toBe(true);
        });
    });
});
describe('createShaderManager', () => {
    it('creates a shader manager instance', () => {
        const ctx = createMockContext();
        const manager = createShaderManager(ctx);
        expect(manager).toBeInstanceOf(ShaderManager);
    });
    it('manager has built-in shaders registered', () => {
        const ctx = createMockContext();
        const manager = createShaderManager(ctx);
        expect(manager.hasShader('fill')).toBe(true);
        expect(manager.hasShader('stroke')).toBe(true);
        expect(manager.hasShader('text-sdf')).toBe(true);
        expect(manager.hasShader('image')).toBe(true);
        expect(manager.hasShader('blur')).toBe(true);
        expect(manager.hasShader('composite')).toBe(true);
        expect(manager.hasShader('shadow')).toBe(true);
        expect(manager.hasShader('innerShadow')).toBe(true);
        expect(manager.hasShader('innerShadowComposite')).toBe(true);
    });
});
//# sourceMappingURL=shader-manager.test.js.map