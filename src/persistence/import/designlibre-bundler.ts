/**
 * DesignLibre Bundler
 *
 * Create and read .designlibre bundle files.
 * A .designlibre file is a ZIP archive containing:
 * - canvas.json - The serialized document
 * - images/ - Directory with embedded images
 * - meta.json - Metadata file
 * - thumbnail.png - Preview thumbnail
 */

import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import { DocumentSerializer, type SerializedDocument } from '../serialization/document-serializer';
import { PNGExporter } from '../export/png-exporter';

/**
 * DesignLibre metadata
 */
export interface DesignLibreMeta {
  readonly version: string;
  readonly name: string;
  readonly created: string;
  readonly modified: string;
  readonly author?: string | undefined;
  readonly description?: string | undefined;
  readonly tags?: readonly string[] | undefined;
  readonly dimensions: {
    readonly width: number;
    readonly height: number;
  };
  readonly nodeCount: number;
  readonly imageCount: number;
  readonly fontCount: number;
}

/**
 * DesignLibre bundle options
 */
export interface DesignLibreBundleOptions {
  /** Author name */
  author?: string | undefined;
  /** Description */
  description?: string | undefined;
  /** Tags for organization */
  tags?: readonly string[] | undefined;
  /** Thumbnail size (default: 512) */
  thumbnailSize?: number | undefined;
  /** Include images (default: true) */
  includeImages?: boolean | undefined;
  /** Include fonts (default: false) */
  includeFonts?: boolean | undefined;
  /** Compression level (0-9, default: 6) */
  compressionLevel?: number | undefined;
}

/**
 * DesignLibre bundle result
 */
export interface DesignLibreBundleResult {
  readonly blob: Blob;
  readonly url: string;
  readonly meta: DesignLibreMeta;
  readonly size: number;
}

/**
 * DesignLibre import result
 */
export interface DesignLibreImportResult {
  readonly meta: DesignLibreMeta;
  readonly document: SerializedDocument;
  readonly images: Map<string, Blob>;
  readonly fonts: Map<string, Blob>;
  readonly thumbnail: Blob | null;
}

/**
 * Simple ZIP file writer
 * Implements a minimal ZIP format without compression
 */
class ZipWriter {
  private files: { name: string; data: Uint8Array; date: Date }[] = [];

  /**
   * Add a file to the archive.
   */
  addFile(name: string, data: string | Uint8Array | Blob): void {
    let bytes: Uint8Array;

    if (typeof data === 'string') {
      bytes = new TextEncoder().encode(data);
    } else if (data instanceof Blob) {
      // For blobs, we need to handle async, but for simplicity
      // we'll require Uint8Array directly for blobs
      throw new Error('Use addFileAsync for Blob data');
    } else {
      bytes = data;
    }

    this.files.push({
      name,
      data: bytes,
      date: new Date(),
    });
  }

  /**
   * Add a file from Blob asynchronously.
   */
  async addFileAsync(name: string, data: Blob): Promise<void> {
    const arrayBuffer = await data.arrayBuffer();
    this.files.push({
      name,
      data: new Uint8Array(arrayBuffer),
      date: new Date(),
    });
  }

  /**
   * Generate the ZIP file.
   */
  generate(): Blob {
    const parts: BlobPart[] = [];
    const centralDirectory: Uint8Array[] = [];
    let offset = 0;

    // Write local file headers and file data
    for (const file of this.files) {
      const localHeader = this.createLocalFileHeader(file);
      parts.push(localHeader as BlobPart);
      parts.push(file.data as BlobPart);

      const centralHeader = this.createCentralDirectoryHeader(file, offset);
      centralDirectory.push(centralHeader);

      offset += localHeader.length + file.data.length;
    }

    // Write central directory
    const centralDirOffset = offset;
    for (const header of centralDirectory) {
      parts.push(header as BlobPart);
      offset += header.length;
    }

    // Write end of central directory
    const endRecord = this.createEndOfCentralDirectory(
      this.files.length,
      offset - centralDirOffset,
      centralDirOffset
    );
    parts.push(endRecord as BlobPart);

    return new Blob(parts, { type: 'application/zip' });
  }

  private createLocalFileHeader(file: { name: string; data: Uint8Array; date: Date }): Uint8Array {
    const nameBytes = new TextEncoder().encode(file.name);
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);

    // Local file header signature
    view.setUint32(0, 0x04034b50, true);
    // Version needed to extract
    view.setUint16(4, 20, true);
    // General purpose bit flag
    view.setUint16(6, 0, true);
    // Compression method (0 = stored)
    view.setUint16(8, 0, true);
    // File modification time
    const dosTime = this.dateToDosTime(file.date);
    view.setUint16(10, dosTime.time, true);
    view.setUint16(12, dosTime.date, true);
    // CRC-32
    view.setUint32(14, this.crc32(file.data), true);
    // Compressed size
    view.setUint32(18, file.data.length, true);
    // Uncompressed size
    view.setUint32(22, file.data.length, true);
    // File name length
    view.setUint16(26, nameBytes.length, true);
    // Extra field length
    view.setUint16(28, 0, true);
    // File name
    header.set(nameBytes, 30);

    return header;
  }

  private createCentralDirectoryHeader(
    file: { name: string; data: Uint8Array; date: Date },
    localHeaderOffset: number
  ): Uint8Array {
    const nameBytes = new TextEncoder().encode(file.name);
    const header = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(header.buffer);

    // Central directory header signature
    view.setUint32(0, 0x02014b50, true);
    // Version made by
    view.setUint16(4, 20, true);
    // Version needed to extract
    view.setUint16(6, 20, true);
    // General purpose bit flag
    view.setUint16(8, 0, true);
    // Compression method
    view.setUint16(10, 0, true);
    // File modification time
    const dosTime = this.dateToDosTime(file.date);
    view.setUint16(12, dosTime.time, true);
    view.setUint16(14, dosTime.date, true);
    // CRC-32
    view.setUint32(16, this.crc32(file.data), true);
    // Compressed size
    view.setUint32(20, file.data.length, true);
    // Uncompressed size
    view.setUint32(24, file.data.length, true);
    // File name length
    view.setUint16(28, nameBytes.length, true);
    // Extra field length
    view.setUint16(30, 0, true);
    // File comment length
    view.setUint16(32, 0, true);
    // Disk number start
    view.setUint16(34, 0, true);
    // Internal file attributes
    view.setUint16(36, 0, true);
    // External file attributes
    view.setUint32(38, 0, true);
    // Relative offset of local header
    view.setUint32(42, localHeaderOffset, true);
    // File name
    header.set(nameBytes, 46);

    return header;
  }

  private createEndOfCentralDirectory(
    fileCount: number,
    centralDirSize: number,
    centralDirOffset: number
  ): Uint8Array {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);

    // End of central directory signature
    view.setUint32(0, 0x06054b50, true);
    // Number of this disk
    view.setUint16(4, 0, true);
    // Disk where central directory starts
    view.setUint16(6, 0, true);
    // Number of central directory records on this disk
    view.setUint16(8, fileCount, true);
    // Total number of central directory records
    view.setUint16(10, fileCount, true);
    // Size of central directory
    view.setUint32(12, centralDirSize, true);
    // Offset of start of central directory
    view.setUint32(16, centralDirOffset, true);
    // Comment length
    view.setUint16(20, 0, true);

    return record;
  }

  private dateToDosTime(date: Date): { time: number; date: number } {
    const time = (date.getSeconds() >> 1) | (date.getMinutes() << 5) | (date.getHours() << 11);
    const dateNum = date.getDate() | ((date.getMonth() + 1) << 5) | ((date.getFullYear() - 1980) << 9);
    return { time, date: dateNum };
  }

  private crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i]!;
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return crc ^ 0xffffffff;
  }
}

/**
 * Simple ZIP file reader
 */
class ZipReader {
  private data: Uint8Array;
  private view: DataView;

  constructor(data: Uint8Array) {
    this.data = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  /**
   * Read all files from the archive.
   */
  readFiles(): Map<string, Uint8Array> {
    const files = new Map<string, Uint8Array>();

    // Find end of central directory
    let eocdOffset = this.data.length - 22;
    while (eocdOffset >= 0 && this.view.getUint32(eocdOffset, true) !== 0x06054b50) {
      eocdOffset--;
    }

    if (eocdOffset < 0) {
      throw new Error('Invalid ZIP file: EOCD not found');
    }

    const centralDirOffset = this.view.getUint32(eocdOffset + 16, true);
    const fileCount = this.view.getUint16(eocdOffset + 10, true);

    // Read central directory
    let offset = centralDirOffset;
    for (let i = 0; i < fileCount; i++) {
      if (this.view.getUint32(offset, true) !== 0x02014b50) {
        throw new Error('Invalid ZIP file: Central directory header not found');
      }

      const nameLength = this.view.getUint16(offset + 28, true);
      const extraLength = this.view.getUint16(offset + 30, true);
      const commentLength = this.view.getUint16(offset + 32, true);
      const localHeaderOffset = this.view.getUint32(offset + 42, true);

      const nameBytes = this.data.subarray(offset + 46, offset + 46 + nameLength);
      const name = new TextDecoder().decode(nameBytes);

      // Read local file header
      const localNameLength = this.view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = this.view.getUint16(localHeaderOffset + 28, true);
      const compressedSize = this.view.getUint32(localHeaderOffset + 18, true);

      const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const fileData = this.data.subarray(dataOffset, dataOffset + compressedSize);

      files.set(name, fileData);

      offset += 46 + nameLength + extraLength + commentLength;
    }

    return files;
  }
}

/**
 * DesignLibre Bundler
 */
export class DesignLibreBundler {
  private sceneGraph: SceneGraph;
  private serializer: DocumentSerializer;
  private pngExporter: PNGExporter;

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
    this.serializer = new DocumentSerializer({ version: '1.0.0' });
    this.pngExporter = new PNGExporter(sceneGraph);
  }

  /**
   * Create a .designlibre bundle.
   */
  async bundle(options: DesignLibreBundleOptions = {}): Promise<DesignLibreBundleResult> {
    const doc = this.sceneGraph.getDocument();
    if (!doc) {
      throw new Error('No document to bundle');
    }

    const thumbnailSize = options.thumbnailSize ?? 512;
    const includeImages = options.includeImages ?? true;

    const zip = new ZipWriter();

    // Serialize document
    const canvasJson = this.serializer.serialize(this.sceneGraph, {
      prettyPrint: true,
      includeMetadata: true,
    });
    zip.addFile('canvas.json', canvasJson);

    // Get dimensions
    const dimensions = this.getDocumentDimensions();

    // Collect images
    const images = includeImages ? this.collectImages() : new Map<string, Blob>();
    let imageCount = 0;
    for (const [name, blob] of images) {
      await zip.addFileAsync(`images/${name}`, blob);
      imageCount++;
    }

    // Generate thumbnail
    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length > 0) {
      try {
        const thumbnailResult = await this.pngExporter.export(pageIds[0]!, {
          scale: Math.min(thumbnailSize / dimensions.width, thumbnailSize / dimensions.height),
          maxSize: thumbnailSize,
          backgroundColor: 'white',
        });
        await zip.addFileAsync('thumbnail.png', thumbnailResult.blob);
      } catch {
        // Thumbnail generation failed, continue without it
      }
    }

    // Create metadata
    const meta: DesignLibreMeta = {
      version: '1.0.0',
      name: doc.name,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      author: options.author,
      description: options.description,
      tags: options.tags,
      dimensions,
      nodeCount: this.countNodes(),
      imageCount,
      fontCount: 0,
    };
    zip.addFile('meta.json', JSON.stringify(meta, null, 2));

    // Generate bundle
    const blob = zip.generate();
    const url = URL.createObjectURL(blob);

    return {
      blob,
      url,
      meta,
      size: blob.size,
    };
  }

  /**
   * Import a .designlibre bundle.
   */
  async import(file: File | Blob): Promise<DesignLibreImportResult> {
    const arrayBuffer = await file.arrayBuffer();
    const zipReader = new ZipReader(new Uint8Array(arrayBuffer));
    const files = zipReader.readFiles();

    // Read metadata
    const metaData = files.get('meta.json');
    if (!metaData) {
      throw new Error('Invalid .designlibre file: missing meta.json');
    }
    const meta = JSON.parse(new TextDecoder().decode(metaData)) as DesignLibreMeta;

    // Read canvas
    const canvasData = files.get('canvas.json');
    if (!canvasData) {
      throw new Error('Invalid .designlibre file: missing canvas.json');
    }
    const document = JSON.parse(new TextDecoder().decode(canvasData)) as SerializedDocument;

    // Read images
    const images = new Map<string, Blob>();
    for (const [name, data] of files) {
      if (name.startsWith('images/')) {
        const imageName = name.substring(7);
        const mimeType = this.getMimeType(imageName);
        images.set(imageName, new Blob([data as BlobPart], { type: mimeType }));
      }
    }

    // Read fonts
    const fonts = new Map<string, Blob>();
    for (const [name, data] of files) {
      if (name.startsWith('fonts/')) {
        const fontName = name.substring(6);
        fonts.set(fontName, new Blob([data as BlobPart], { type: 'font/ttf' }));
      }
    }

    // Read thumbnail
    let thumbnail: Blob | null = null;
    const thumbnailData = files.get('thumbnail.png');
    if (thumbnailData) {
      thumbnail = new Blob([thumbnailData as BlobPart], { type: 'image/png' });
    }

    return {
      meta,
      document,
      images,
      fonts,
      thumbnail,
    };
  }

  /**
   * Apply imported bundle to scene graph.
   */
  apply(importResult: DesignLibreImportResult): void {
    this.serializer.deserialize(
      JSON.stringify(importResult.document),
      this.sceneGraph,
      { validate: true }
    );
  }

  /**
   * Download the bundle.
   */
  async download(
    filename: string = 'document.designlibre',
    options: DesignLibreBundleOptions = {}
  ): Promise<void> {
    const result = await this.bundle(options);

    const link = document.createElement('a');
    link.href = result.url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(result.url);
  }

  /**
   * Get bundle info without fully importing.
   */
  async getInfo(file: File | Blob): Promise<DesignLibreMeta> {
    const arrayBuffer = await file.arrayBuffer();
    const zipReader = new ZipReader(new Uint8Array(arrayBuffer));
    const files = zipReader.readFiles();

    const metaData = files.get('meta.json');
    if (!metaData) {
      throw new Error('Invalid .designlibre file: missing meta.json');
    }

    return JSON.parse(new TextDecoder().decode(metaData)) as DesignLibreMeta;
  }

  /**
   * Get thumbnail from bundle.
   */
  async getThumbnail(file: File | Blob): Promise<Blob | null> {
    const arrayBuffer = await file.arrayBuffer();
    const zipReader = new ZipReader(new Uint8Array(arrayBuffer));
    const files = zipReader.readFiles();

    const thumbnailData = files.get('thumbnail.png');
    if (!thumbnailData) {
      return null;
    }

    return new Blob([thumbnailData as BlobPart], { type: 'image/png' });
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private getDocumentDimensions(): { width: number; height: number } {
    const doc = this.sceneGraph.getDocument();
    if (!doc) return { width: 800, height: 600 };

    const pageIds = this.sceneGraph.getChildIds(doc.id);
    if (pageIds.length === 0) return { width: 800, height: 600 };

    const page = this.sceneGraph.getNode(pageIds[0]!);
    if (!page) return { width: 800, height: 600 };

    if ('width' in page && 'height' in page) {
      return {
        width: (page as { width: number }).width,
        height: (page as { height: number }).height,
      };
    }

    return { width: 800, height: 600 };
  }

  private countNodes(): number {
    let count = 0;

    const countRecursive = (nodeId: NodeId) => {
      count++;
      const childIds = this.sceneGraph.getChildIds(nodeId);
      for (const childId of childIds) {
        countRecursive(childId);
      }
    };

    const doc = this.sceneGraph.getDocument();
    if (doc) {
      countRecursive(doc.id);
    }

    return count;
  }

  private collectImages(): Map<string, Blob> {
    const images = new Map<string, Blob>();

    // In a real implementation, this would traverse the scene graph
    // and collect all image references, then fetch and store them.
    // For now, return empty map.

    return images;
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'svg': return 'image/svg+xml';
      default: return 'application/octet-stream';
    }
  }
}

/**
 * Create a DesignLibre bundler.
 */
export function createDesignLibreBundler(sceneGraph: SceneGraph): DesignLibreBundler {
  return new DesignLibreBundler(sceneGraph);
}
