/**
 * Preserve Reader
 *
 * Reads .preserve archive files and imports them into DesignLibre.
 */

import JSZip from 'jszip';
import type {
  PreserveManifest,
  PreserveDocument,
  PreservePage,
  PreserveTokens,
  PreserveComponentRegistry,
  PreserveComponent,
  PreservePrototypes,
  PreserveAssetManifest,
  PreserveHistory,
  PreserveArchive,
  PreserveReadOptions,
} from './preserve-types';
import { PRESERVE_MIMETYPE } from './preserve-types';

const DEFAULT_OPTIONS: Required<PreserveReadOptions> = {
  validateSchema: false,
  loadAssets: true,
};

/**
 * PreserveReader - Reads .preserve archives.
 */
export class PreserveReader {
  private zip: JSZip | null = null;
  private options: Required<PreserveReadOptions>;

  constructor(options: PreserveReadOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Read a .preserve archive from a File or Blob.
   */
  async read(file: File | Blob): Promise<PreserveArchive> {
    // Load the ZIP archive
    this.zip = await JSZip.loadAsync(file);

    // Validate mimetype
    await this.validateMimetype();

    // Read manifest
    const manifest = await this.readManifest();

    // Read document
    const document = await this.readDocument();

    // Read pages
    const pages = await this.readPages(document);

    // Read components
    const { registry: components, componentData } = await this.readComponents();

    // Read tokens
    const tokens = await this.readTokens();

    // Read prototypes
    const prototypes = await this.readPrototypes();

    // Read assets
    const { manifest: assets, assetData } = await this.readAssets();

    // Read history
    const history = await this.readHistory();

    // Read thumbnail
    const thumbnail = await this.readThumbnail();

    const archive: PreserveArchive = {
      manifest,
      document,
      pages,
    };

    if (components) archive.components = components;
    if (componentData) archive.componentData = componentData;
    if (tokens) archive.tokens = tokens;
    if (prototypes) archive.prototypes = prototypes;
    if (assets) archive.assets = assets;
    if (assetData) archive.assetData = assetData;
    if (history) archive.history = history;
    if (thumbnail) archive.thumbnail = thumbnail;

    return archive;
  }

  private async validateMimetype(): Promise<void> {
    if (!this.zip) throw new Error('No archive loaded');

    const mimetypeFile = this.zip.file('mimetype');
    if (!mimetypeFile) {
      throw new Error('Invalid .preserve file: missing mimetype');
    }

    const mimetype = await mimetypeFile.async('string');
    if (mimetype.trim() !== PRESERVE_MIMETYPE) {
      throw new Error(`Invalid mimetype: expected ${PRESERVE_MIMETYPE}, got ${mimetype}`);
    }
  }

  private async readManifest(): Promise<PreserveManifest> {
    if (!this.zip) throw new Error('No archive loaded');

    const manifestFile = this.zip.file('META-INF/manifest.json');
    if (!manifestFile) {
      throw new Error('Invalid .preserve file: missing manifest');
    }

    const json = await manifestFile.async('string');
    return JSON.parse(json) as PreserveManifest;
  }

  private async readDocument(): Promise<PreserveDocument> {
    if (!this.zip) throw new Error('No archive loaded');

    const docFile = this.zip.file('document.json');
    if (!docFile) {
      throw new Error('Invalid .preserve file: missing document.json');
    }

    const json = await docFile.async('string');
    return JSON.parse(json) as PreserveDocument;
  }

  private async readPages(document: PreserveDocument): Promise<Map<string, PreservePage>> {
    if (!this.zip) throw new Error('No archive loaded');

    const pages = new Map<string, PreservePage>();

    for (const pageRef of document.pages) {
      const pageFile = this.zip.file(pageRef.path);
      if (pageFile) {
        const json = await pageFile.async('string');
        const page = JSON.parse(json) as PreservePage;
        pages.set(pageRef.id, page);
      }
    }

    return pages;
  }

  private async readComponents(): Promise<{
    registry: PreserveComponentRegistry | undefined;
    componentData: Map<string, PreserveComponent> | undefined;
  }> {
    if (!this.zip) throw new Error('No archive loaded');

    const registryFile = this.zip.file('components/registry.json');
    if (!registryFile) {
      return { registry: undefined, componentData: undefined };
    }

    const registryJson = await registryFile.async('string');
    const registry = JSON.parse(registryJson) as PreserveComponentRegistry;

    const componentData = new Map<string, PreserveComponent>();

    for (const entry of registry.components) {
      const componentFile = this.zip.file(entry.path);
      if (componentFile) {
        const json = await componentFile.async('string');
        const component = JSON.parse(json) as PreserveComponent;
        componentData.set(entry.id, component);
      }
    }

    return { registry, componentData };
  }

  private async readTokens(): Promise<PreserveTokens | undefined> {
    if (!this.zip) throw new Error('No archive loaded');

    const tokensFile = this.zip.file('tokens/tokens.json');
    if (!tokensFile) {
      return undefined;
    }

    const json = await tokensFile.async('string');
    return JSON.parse(json) as PreserveTokens;
  }

  private async readPrototypes(): Promise<PreservePrototypes | undefined> {
    if (!this.zip) throw new Error('No archive loaded');

    const prototypesFile = this.zip.file('prototypes/flows.json');
    if (!prototypesFile) {
      return undefined;
    }

    const json = await prototypesFile.async('string');
    return JSON.parse(json) as PreservePrototypes;
  }

  private async readAssets(): Promise<{
    manifest: PreserveAssetManifest | undefined;
    assetData: Map<string, Blob> | undefined;
  }> {
    if (!this.zip) throw new Error('No archive loaded');

    const manifestFile = this.zip.file('assets/manifest.json');
    if (!manifestFile) {
      return { manifest: undefined, assetData: undefined };
    }

    const manifestJson = await manifestFile.async('string');
    const manifest = JSON.parse(manifestJson) as PreserveAssetManifest;

    if (!this.options.loadAssets) {
      return { manifest, assetData: undefined };
    }

    const assetData = new Map<string, Blob>();

    for (const asset of manifest.assets) {
      const assetFile = this.zip.file(asset.path);
      if (assetFile) {
        const data = await assetFile.async('blob');
        assetData.set(asset.id, data);
      }
    }

    return { manifest, assetData };
  }

  private async readHistory(): Promise<PreserveHistory | undefined> {
    if (!this.zip) throw new Error('No archive loaded');

    const historyFile = this.zip.file('history/changelog.json');
    if (!historyFile) {
      return undefined;
    }

    const json = await historyFile.async('string');
    return JSON.parse(json) as PreserveHistory;
  }

  private async readThumbnail(): Promise<Blob | undefined> {
    if (!this.zip) throw new Error('No archive loaded');

    const thumbnailFile = this.zip.file('thumbnail.png');
    if (!thumbnailFile) {
      return undefined;
    }

    return thumbnailFile.async('blob');
  }

  /**
   * Get a specific file from the archive.
   */
  async getFile(path: string): Promise<string | null> {
    if (!this.zip) return null;

    const file = this.zip.file(path);
    if (!file) return null;

    return file.async('string');
  }

  /**
   * Get a specific binary file from the archive.
   */
  async getBinaryFile(path: string): Promise<Blob | null> {
    if (!this.zip) return null;

    const file = this.zip.file(path);
    if (!file) return null;

    return file.async('blob');
  }

  /**
   * List all files in the archive.
   */
  listFiles(): string[] {
    if (!this.zip) return [];

    const files: string[] = [];
    this.zip.forEach((relativePath) => {
      files.push(relativePath);
    });
    return files;
  }
}

/**
 * Read a .preserve archive.
 */
export async function readPreserveArchive(
  file: File | Blob,
  options: PreserveReadOptions = {}
): Promise<PreserveArchive> {
  const reader = new PreserveReader(options);
  return reader.read(file);
}

/**
 * Quick preview of a .preserve archive (reads only metadata).
 */
export async function previewPreserveArchive(file: File | Blob): Promise<{
  name: string;
  pageCount: number;
  created: string;
  modified: string;
  thumbnail?: Blob;
}> {
  const reader = new PreserveReader({ loadAssets: false });
  const archive = await reader.read(file);

  const result: {
    name: string;
    pageCount: number;
    created: string;
    modified: string;
    thumbnail?: Blob;
  } = {
    name: archive.document.name,
    pageCount: archive.document.pages.length,
    created: archive.document.created,
    modified: archive.document.modified,
  };

  if (archive.thumbnail) {
    result.thumbnail = archive.thumbnail;
  }

  return result;
}
