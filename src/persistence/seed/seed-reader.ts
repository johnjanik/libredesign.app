/**
 * Seed Reader
 *
 * Reads .seed archive files and imports them into DesignLibre.
 */

import JSZip from 'jszip';
import type {
  SeedManifest,
  SeedDocument,
  SeedPage,
  SeedTokens,
  SeedComponentRegistry,
  SeedComponent,
  SeedPrototypes,
  SeedAssetManifest,
  SeedHistory,
  SeedArchive,
  SeedReadOptions,
} from './seed-types';
import { SEED_MIMETYPE } from './seed-types';

const DEFAULT_OPTIONS: Required<SeedReadOptions> = {
  validateSchema: false,
  loadAssets: true,
};

/**
 * SeedReader - Reads .seed archives.
 */
export class SeedReader {
  private zip: JSZip | null = null;
  private options: Required<SeedReadOptions>;

  constructor(options: SeedReadOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Read a .seed archive from a File or Blob.
   */
  async read(file: File | Blob): Promise<SeedArchive> {
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

    const archive: SeedArchive = {
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
      throw new Error('Invalid .seed file: missing mimetype');
    }

    const mimetype = await mimetypeFile.async('string');
    if (mimetype.trim() !== SEED_MIMETYPE) {
      throw new Error(`Invalid mimetype: expected ${SEED_MIMETYPE}, got ${mimetype}`);
    }
  }

  private async readManifest(): Promise<SeedManifest> {
    if (!this.zip) throw new Error('No archive loaded');

    const manifestFile = this.zip.file('META-INF/manifest.json');
    if (!manifestFile) {
      throw new Error('Invalid .seed file: missing manifest');
    }

    const json = await manifestFile.async('string');
    return JSON.parse(json) as SeedManifest;
  }

  private async readDocument(): Promise<SeedDocument> {
    if (!this.zip) throw new Error('No archive loaded');

    const docFile = this.zip.file('document.json');
    if (!docFile) {
      throw new Error('Invalid .seed file: missing document.json');
    }

    const json = await docFile.async('string');
    return JSON.parse(json) as SeedDocument;
  }

  private async readPages(document: SeedDocument): Promise<Map<string, SeedPage>> {
    if (!this.zip) throw new Error('No archive loaded');

    const pages = new Map<string, SeedPage>();

    for (const pageRef of document.pages) {
      const pageFile = this.zip.file(pageRef.path);
      if (pageFile) {
        const json = await pageFile.async('string');
        const page = JSON.parse(json) as SeedPage;
        pages.set(pageRef.id, page);
      }
    }

    return pages;
  }

  private async readComponents(): Promise<{
    registry: SeedComponentRegistry | undefined;
    componentData: Map<string, SeedComponent> | undefined;
  }> {
    if (!this.zip) throw new Error('No archive loaded');

    const registryFile = this.zip.file('components/registry.json');
    if (!registryFile) {
      return { registry: undefined, componentData: undefined };
    }

    const registryJson = await registryFile.async('string');
    const registry = JSON.parse(registryJson) as SeedComponentRegistry;

    const componentData = new Map<string, SeedComponent>();

    for (const entry of registry.components) {
      const componentFile = this.zip.file(entry.path);
      if (componentFile) {
        const json = await componentFile.async('string');
        const component = JSON.parse(json) as SeedComponent;
        componentData.set(entry.id, component);
      }
    }

    return { registry, componentData };
  }

  private async readTokens(): Promise<SeedTokens | undefined> {
    if (!this.zip) throw new Error('No archive loaded');

    const tokensFile = this.zip.file('tokens/tokens.json');
    if (!tokensFile) {
      return undefined;
    }

    const json = await tokensFile.async('string');
    return JSON.parse(json) as SeedTokens;
  }

  private async readPrototypes(): Promise<SeedPrototypes | undefined> {
    if (!this.zip) throw new Error('No archive loaded');

    const prototypesFile = this.zip.file('prototypes/flows.json');
    if (!prototypesFile) {
      return undefined;
    }

    const json = await prototypesFile.async('string');
    return JSON.parse(json) as SeedPrototypes;
  }

  private async readAssets(): Promise<{
    manifest: SeedAssetManifest | undefined;
    assetData: Map<string, Blob> | undefined;
  }> {
    if (!this.zip) throw new Error('No archive loaded');

    const manifestFile = this.zip.file('assets/manifest.json');
    if (!manifestFile) {
      return { manifest: undefined, assetData: undefined };
    }

    const manifestJson = await manifestFile.async('string');
    const manifest = JSON.parse(manifestJson) as SeedAssetManifest;

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

  private async readHistory(): Promise<SeedHistory | undefined> {
    if (!this.zip) throw new Error('No archive loaded');

    const historyFile = this.zip.file('history/changelog.json');
    if (!historyFile) {
      return undefined;
    }

    const json = await historyFile.async('string');
    return JSON.parse(json) as SeedHistory;
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
 * Read a .seed archive.
 */
export async function readSeedArchive(
  file: File | Blob,
  options: SeedReadOptions = {}
): Promise<SeedArchive> {
  const reader = new SeedReader(options);
  return reader.read(file);
}

/**
 * Quick preview of a .seed archive (reads only metadata).
 */
export async function previewSeedArchive(file: File | Blob): Promise<{
  name: string;
  pageCount: number;
  created: string;
  modified: string;
  thumbnail?: Blob;
}> {
  const reader = new SeedReader({ loadAssets: false });
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
