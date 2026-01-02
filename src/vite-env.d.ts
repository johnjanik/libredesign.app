/// <reference types="vite/client" />

declare module 'harfbuzzjs' {
  interface HBBlob {
    free(): void;
  }

  interface HBFace {
    free(): void;
    reference_table(tag: string): HBBlob;
  }

  interface HBFont {
    free(): void;
    setScale(xScale: number, yScale: number): void;
    setVariations(variations: Array<{ tag: string; value: number }>): void;
  }

  interface HBBuffer {
    free(): void;
    addText(text: string): void;
    guessSegmentProperties(): void;
    setDirection(direction: string): void;
    setScript(script: string): void;
    setLanguage(language: string): void;
    setClusterLevel(level: number): void;
    json(): Array<{
      g: number;
      cl: number;
      ax: number;
      ay: number;
      dx: number;
      dy: number;
      flags?: number;
    }>;
  }

  interface HarfBuzz {
    createBlob(data: Uint8Array): HBBlob;
    createFace(blob: HBBlob, index: number): HBFace;
    createFont(face: HBFace): HBFont;
    createBuffer(): HBBuffer;
    shape(font: HBFont, buffer: HBBuffer, features?: string): void;
  }

  export interface HarfBuzzOptions {
    locateFile?: (file: string) => string;
  }

  export default function hb(options?: HarfBuzzOptions): Promise<HarfBuzz>;
}
