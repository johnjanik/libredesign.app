/**
 * Shader Manager
 *
 * Compiles, links, and manages WebGL shaders and programs.
 */
import type { WebGLContext } from '../core/webgl-context';
/**
 * Shader program with uniform locations
 */
export interface ShaderProgram {
    readonly program: WebGLProgram;
    readonly uniforms: Map<string, WebGLUniformLocation>;
    readonly attributes: Map<string, number>;
}
/**
 * Shader source definition
 */
export interface ShaderSource {
    readonly vertex: string;
    readonly fragment: string;
    readonly uniforms?: readonly string[];
    readonly attributes?: readonly string[];
}
/**
 * Built-in shader names
 */
export type BuiltInShader = 'fill' | 'stroke' | 'text-sdf' | 'image' | 'blur' | 'composite' | 'shadow' | 'innerShadow' | 'innerShadowComposite' | 'linearGradient' | 'radialGradient' | 'angularGradient' | 'diamondGradient' | 'colorAdjustment' | 'noise' | 'motionBlur' | 'motionBlurHQ';
/**
 * Shader Manager - compiles and manages shader programs
 */
export declare class ShaderManager {
    private ctx;
    private programs;
    private shaderSources;
    constructor(ctx: WebGLContext);
    /**
     * Register a shader source.
     */
    registerShader(name: string, source: ShaderSource): void;
    /**
     * Register built-in shaders.
     */
    private registerBuiltInShaders;
    /**
     * Get or compile a shader program.
     */
    getProgram(name: string): ShaderProgram;
    /**
     * Compile a shader program.
     */
    private compileProgram;
    /**
     * Compile a single shader.
     */
    private compileShader;
    /**
     * Use a shader program.
     */
    use(name: string): ShaderProgram;
    /**
     * Check if a shader is registered.
     */
    hasShader(name: string): boolean;
    /**
     * Dispose of all programs.
     */
    dispose(): void;
}
/**
 * Create a shader manager.
 */
export declare function createShaderManager(ctx: WebGLContext): ShaderManager;
//# sourceMappingURL=shader-manager.d.ts.map