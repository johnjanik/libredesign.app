/**
 * iOS Code Generator
 *
 * Generate Swift and Objective-C code from scene graph nodes.
 */
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
/**
 * iOS code generation options
 */
export interface IOSCodeGeneratorOptions {
    /** Output language (default: 'swift') */
    language?: 'swift' | 'objc' | undefined;
    /** Use SwiftUI or UIKit (default: 'swiftui' for swift, 'uikit' for objc) */
    framework?: 'swiftui' | 'uikit' | undefined;
    /** Class/struct name prefix (default: '') */
    prefix?: string | undefined;
    /** Include preview provider (default: true, SwiftUI only) */
    includePreview?: boolean | undefined;
    /** Use extensions for colors (default: true) */
    useColorExtension?: boolean | undefined;
    /** Include comments (default: true) */
    includeComments?: boolean | undefined;
}
/**
 * iOS code generation result
 */
export interface IOSCodeGeneratorResult {
    /** Generated code */
    readonly code: string;
    /** Color extension code */
    readonly colorExtension: string;
    /** File extension */
    readonly extension: string;
    /** Blob for download */
    readonly blob: Blob;
    /** Download URL */
    readonly url: string;
}
/**
 * iOS Code Generator
 */
export declare class IOSCodeGenerator {
    private sceneGraph;
    private colorIndex;
    private extractedColors;
    constructor(sceneGraph: SceneGraph);
    /**
     * Generate iOS code for a node.
     */
    generate(nodeId: NodeId, options?: IOSCodeGeneratorOptions): IOSCodeGeneratorResult;
    /**
     * Download the generated code.
     */
    download(nodeId: NodeId, filename?: string, options?: IOSCodeGeneratorOptions): void;
    private generateSwiftUI;
    private generateSwiftUIBody;
    private generateSwiftUIFrame;
    private generateSwiftUIVector;
    private generateSwiftUIPathCommands;
    private generateSwiftUIText;
    private generateSwiftUIGroup;
    private generateSwiftUIModifiers;
    private generateUIKit;
    private generateUIKitSetup;
    private generateUIKitChildSetup;
    private generateObjC;
    private generateObjCSetup;
    private generateSwiftColorExtension;
    private generateUIKitColorExtension;
    private generateObjCColorExtension;
    private extractColors;
    private registerColor;
    private getColorName;
    private colorToKey;
    private getFirstSolidFill;
    private getFirstSolidStroke;
    private swiftFontWeight;
    private sanitizeName;
    private escapeString;
}
/**
 * Create an iOS code generator.
 */
export declare function createIOSCodeGenerator(sceneGraph: SceneGraph): IOSCodeGenerator;
//# sourceMappingURL=ios-code-generator.d.ts.map