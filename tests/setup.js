import { vi } from 'vitest';
// Mock WebGL2 context
function createMockWebGL2Context() {
    return {
        // Shader operations
        createShader: vi.fn(() => ({})),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => true),
        getShaderInfoLog: vi.fn(() => ''),
        deleteShader: vi.fn(),
        // Program operations
        createProgram: vi.fn(() => ({})),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn(() => true),
        getProgramInfoLog: vi.fn(() => ''),
        useProgram: vi.fn(),
        deleteProgram: vi.fn(),
        // Buffer operations
        createBuffer: vi.fn(() => ({})),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        bufferSubData: vi.fn(),
        deleteBuffer: vi.fn(),
        // VAO operations
        createVertexArray: vi.fn(() => ({})),
        bindVertexArray: vi.fn(),
        deleteVertexArray: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        disableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        vertexAttribDivisor: vi.fn(),
        // Drawing
        drawArrays: vi.fn(),
        drawArraysInstanced: vi.fn(),
        drawElements: vi.fn(),
        drawElementsInstanced: vi.fn(),
        // Texture operations
        createTexture: vi.fn(() => ({})),
        bindTexture: vi.fn(),
        texImage2D: vi.fn(),
        texParameteri: vi.fn(),
        activeTexture: vi.fn(),
        deleteTexture: vi.fn(),
        generateMipmap: vi.fn(),
        // Framebuffer operations
        createFramebuffer: vi.fn(() => ({})),
        bindFramebuffer: vi.fn(),
        framebufferTexture2D: vi.fn(),
        checkFramebufferStatus: vi.fn(() => 36053), // FRAMEBUFFER_COMPLETE
        deleteFramebuffer: vi.fn(),
        // Uniform operations
        getUniformLocation: vi.fn(() => ({})),
        uniform1f: vi.fn(),
        uniform2f: vi.fn(),
        uniform3f: vi.fn(),
        uniform4f: vi.fn(),
        uniform1i: vi.fn(),
        uniformMatrix3fv: vi.fn(),
        uniformMatrix4fv: vi.fn(),
        // Attribute operations
        getAttribLocation: vi.fn(() => 0),
        // State operations
        viewport: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        blendFunc: vi.fn(),
        blendFuncSeparate: vi.fn(),
        depthFunc: vi.fn(),
        cullFace: vi.fn(),
        scissor: vi.fn(),
        // Extension operations
        getExtension: vi.fn((name) => {
            if (name === 'EXT_color_buffer_float')
                return {};
            if (name === 'OES_texture_float_linear')
                return {};
            return null;
        }),
        // Query operations
        getParameter: vi.fn((param) => {
            const params = {
                7936: 'WebGL 2.0', // VERSION
                7937: 'Mock Vendor', // VENDOR
                7938: 'Mock Renderer', // RENDERER
                3379: 4096, // MAX_TEXTURE_SIZE
                34930: 16, // MAX_TEXTURE_IMAGE_UNITS
                35661: 16, // MAX_VERTEX_TEXTURE_IMAGE_UNITS
                36347: 16384, // MAX_UNIFORM_BLOCK_SIZE
            };
            return params[param] ?? 0;
        }),
        // WebGL2-specific
        createSampler: vi.fn(() => ({})),
        bindSampler: vi.fn(),
        samplerParameteri: vi.fn(),
        deleteSampler: vi.fn(),
        // UBO operations
        bindBufferBase: vi.fn(),
        getUniformBlockIndex: vi.fn(() => 0),
        uniformBlockBinding: vi.fn(),
        // Canvas reference
        canvas: document.createElement('canvas'),
        // Constants (subset)
        VERTEX_SHADER: 35633,
        FRAGMENT_SHADER: 35632,
        COMPILE_STATUS: 35713,
        LINK_STATUS: 35714,
        ARRAY_BUFFER: 34962,
        ELEMENT_ARRAY_BUFFER: 34963,
        STATIC_DRAW: 35044,
        DYNAMIC_DRAW: 35048,
        FLOAT: 5126,
        UNSIGNED_SHORT: 5123,
        UNSIGNED_INT: 5125,
        TRIANGLES: 4,
        TEXTURE_2D: 3553,
        TEXTURE0: 33984,
        RGBA: 6408,
        UNSIGNED_BYTE: 5121,
        FRAMEBUFFER: 36160,
        COLOR_ATTACHMENT0: 36064,
        DEPTH_TEST: 2929,
        BLEND: 3042,
        CULL_FACE: 2884,
        SRC_ALPHA: 770,
        ONE_MINUS_SRC_ALPHA: 771,
    };
}
// Override HTMLCanvasElement.getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (contextId, options) {
    if (contextId === 'webgl2') {
        return createMockWebGL2Context();
    }
    return originalGetContext.call(this, contextId, options);
};
// Mock crypto.getRandomValues for UUID generation
if (!globalThis.crypto) {
    Object.defineProperty(globalThis, 'crypto', {
        value: {
            getRandomValues: (array) => {
                if (array instanceof Uint8Array) {
                    for (let i = 0; i < array.length; i++) {
                        array[i] = Math.floor(Math.random() * 256);
                    }
                }
                return array;
            },
            randomUUID: () => {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                    const r = (Math.random() * 16) | 0;
                    const v = c === 'x' ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                });
            },
        },
    });
}
// Mock requestAnimationFrame
globalThis.requestAnimationFrame = vi.fn((callback) => {
    return setTimeout(() => callback(performance.now()), 16);
});
globalThis.cancelAnimationFrame = vi.fn((id) => {
    clearTimeout(id);
});
// Mock performance.now if not available
if (typeof performance === 'undefined') {
    Object.defineProperty(globalThis, 'performance', {
        value: {
            now: () => Date.now(),
        },
    });
}
// Mock URL.createObjectURL and URL.revokeObjectURL
if (!URL.createObjectURL) {
    URL.createObjectURL = (blob) => `blob:mock-${blob.size}`;
}
if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = () => { };
}
//# sourceMappingURL=setup.js.map