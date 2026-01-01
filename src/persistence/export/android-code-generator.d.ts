/**
 * Android Code Generator
 *
 * Generate Kotlin and Java code from scene graph nodes.
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
/**
 * Android code generation options
 */
export interface AndroidCodeGeneratorOptions {
    /** Output language (default: 'kotlin') */
    language?: 'kotlin' | 'java' | undefined;
    /** Use Jetpack Compose or View system (default: 'compose' for kotlin, 'view' for java) */
    framework?: 'compose' | 'view' | undefined;
    /** Package name (default: 'com.designlibre.generated') */
    packageName?: string | undefined;
    /** Class name prefix (default: '') */
    prefix?: string | undefined;
    /** Include preview annotations (default: true, Compose only) */
    includePreview?: boolean | undefined;
    /** Generate colors.xml resource (default: true) */
    generateColorsXml?: boolean | undefined;
    /** Include comments (default: true) */
    includeComments?: boolean | undefined;
}
/**
 * Android code generation result
 */
export interface AndroidCodeGeneratorResult {
    /** Generated code */
    readonly code: string;
    /** Colors XML content */
    readonly colorsXml: string;
    /** Dimens XML content */
    readonly dimensXml: string;
    /** File extension */
    readonly extension: string;
    /** Blob for download */
    readonly blob: Blob;
    /** Download URL */
    readonly url: string;
}
/**
 * Android Code Generator
 */
export declare class AndroidCodeGenerator {
    private sceneGraph;
    private colorIndex;
    private dimenIndex;
    private extractedColors;
    private extractedDimens;
    constructor(sceneGraph: SceneGraph);
    /**
     * Generate Android code for a node.
     */
    generate(nodeId: NodeId, options?: AndroidCodeGeneratorOptions): AndroidCodeGeneratorResult;
    /**
     * Download the generated code.
     */
    download(nodeId: NodeId, filename?: string, options?: AndroidCodeGeneratorOptions): void;
    private generateCompose;
    private generateComposeBody;
    private generateComposeFrame;
    private generateComposeVector;
    private generateComposeText;
    private generateComposeGroup;
    private generateComposeModifiers;
    private generateKotlinView;
    private generateKotlinViewSetup;
    private generateKotlinChildSetup;
    private generateJavaView;
    private generateJavaViewSetup;
    private generateJavaChildSetup;
    private generateColorsXml;
    private generateDimensXml;
    private extractDesignTokens;
    private registerColor;
    private registerDimen;
    private getColorName;
    private colorToKey;
    private rgbaToHex;
    private getFirstSolidFill;
    private kotlinFontWeight;
    private sanitizeName;
    private escapeString;
}
/**
 * Create an Android code generator.
 */
export declare function createAndroidCodeGenerator(sceneGraph: SceneGraph): AndroidCodeGenerator;
//# sourceMappingURL=android-code-generator.d.ts.map