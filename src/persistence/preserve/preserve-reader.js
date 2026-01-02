/**
 * Preserve Reader
 *
 * Reads .preserve archive files and imports them into DesignLibre.
 */
import JSZip from 'jszip';
import { PRESERVE_MIMETYPE } from './preserve-types';
const DEFAULT_OPTIONS = {
    validateSchema: false,
    loadAssets: true,
};
/**
 * PreserveReader - Reads .preserve archives.
 */
export class PreserveReader {
    zip = null;
    options;
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Read a .preserve archive from a File or Blob.
     */
    async read(file) {
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
        const archive = {
            manifest,
            document,
            pages,
        };
        if (components)
            archive.components = components;
        if (componentData)
            archive.componentData = componentData;
        if (tokens)
            archive.tokens = tokens;
        if (prototypes)
            archive.prototypes = prototypes;
        if (assets)
            archive.assets = assets;
        if (assetData)
            archive.assetData = assetData;
        if (history)
            archive.history = history;
        if (thumbnail)
            archive.thumbnail = thumbnail;
        return archive;
    }
    async validateMimetype() {
        if (!this.zip)
            throw new Error('No archive loaded');
        const mimetypeFile = this.zip.file('mimetype');
        if (!mimetypeFile) {
            throw new Error('Invalid .preserve file: missing mimetype');
        }
        const mimetype = await mimetypeFile.async('string');
        if (mimetype.trim() !== PRESERVE_MIMETYPE) {
            throw new Error(`Invalid mimetype: expected ${PRESERVE_MIMETYPE}, got ${mimetype}`);
        }
    }
    async readManifest() {
        if (!this.zip)
            throw new Error('No archive loaded');
        const manifestFile = this.zip.file('META-INF/manifest.json');
        if (!manifestFile) {
            throw new Error('Invalid .preserve file: missing manifest');
        }
        const json = await manifestFile.async('string');
        return JSON.parse(json);
    }
    async readDocument() {
        if (!this.zip)
            throw new Error('No archive loaded');
        const docFile = this.zip.file('document.json');
        if (!docFile) {
            throw new Error('Invalid .preserve file: missing document.json');
        }
        const json = await docFile.async('string');
        return JSON.parse(json);
    }
    async readPages(document) {
        if (!this.zip)
            throw new Error('No archive loaded');
        const pages = new Map();
        for (const pageRef of document.pages) {
            const pageFile = this.zip.file(pageRef.path);
            if (pageFile) {
                const json = await pageFile.async('string');
                const page = JSON.parse(json);
                pages.set(pageRef.id, page);
            }
        }
        return pages;
    }
    async readComponents() {
        if (!this.zip)
            throw new Error('No archive loaded');
        const registryFile = this.zip.file('components/registry.json');
        if (!registryFile) {
            return { registry: undefined, componentData: undefined };
        }
        const registryJson = await registryFile.async('string');
        const registry = JSON.parse(registryJson);
        const componentData = new Map();
        for (const entry of registry.components) {
            const componentFile = this.zip.file(entry.path);
            if (componentFile) {
                const json = await componentFile.async('string');
                const component = JSON.parse(json);
                componentData.set(entry.id, component);
            }
        }
        return { registry, componentData };
    }
    async readTokens() {
        if (!this.zip)
            throw new Error('No archive loaded');
        const tokensFile = this.zip.file('tokens/tokens.json');
        if (!tokensFile) {
            return undefined;
        }
        const json = await tokensFile.async('string');
        return JSON.parse(json);
    }
    async readPrototypes() {
        if (!this.zip)
            throw new Error('No archive loaded');
        const prototypesFile = this.zip.file('prototypes/flows.json');
        if (!prototypesFile) {
            return undefined;
        }
        const json = await prototypesFile.async('string');
        return JSON.parse(json);
    }
    async readAssets() {
        if (!this.zip)
            throw new Error('No archive loaded');
        const manifestFile = this.zip.file('assets/manifest.json');
        if (!manifestFile) {
            return { manifest: undefined, assetData: undefined };
        }
        const manifestJson = await manifestFile.async('string');
        const manifest = JSON.parse(manifestJson);
        if (!this.options.loadAssets) {
            return { manifest, assetData: undefined };
        }
        const assetData = new Map();
        for (const asset of manifest.assets) {
            const assetFile = this.zip.file(asset.path);
            if (assetFile) {
                const data = await assetFile.async('blob');
                assetData.set(asset.id, data);
            }
        }
        return { manifest, assetData };
    }
    async readHistory() {
        if (!this.zip)
            throw new Error('No archive loaded');
        const historyFile = this.zip.file('history/changelog.json');
        if (!historyFile) {
            return undefined;
        }
        const json = await historyFile.async('string');
        return JSON.parse(json);
    }
    async readThumbnail() {
        if (!this.zip)
            throw new Error('No archive loaded');
        const thumbnailFile = this.zip.file('thumbnail.png');
        if (!thumbnailFile) {
            return undefined;
        }
        return thumbnailFile.async('blob');
    }
    /**
     * Get a specific file from the archive.
     */
    async getFile(path) {
        if (!this.zip)
            return null;
        const file = this.zip.file(path);
        if (!file)
            return null;
        return file.async('string');
    }
    /**
     * Get a specific binary file from the archive.
     */
    async getBinaryFile(path) {
        if (!this.zip)
            return null;
        const file = this.zip.file(path);
        if (!file)
            return null;
        return file.async('blob');
    }
    /**
     * List all files in the archive.
     */
    listFiles() {
        if (!this.zip)
            return [];
        const files = [];
        this.zip.forEach((relativePath) => {
            files.push(relativePath);
        });
        return files;
    }
}
/**
 * Read a .preserve archive.
 */
export async function readPreserveArchive(file, options = {}) {
    const reader = new PreserveReader(options);
    return reader.read(file);
}
/**
 * Quick preview of a .preserve archive (reads only metadata).
 */
export async function previewPreserveArchive(file) {
    const reader = new PreserveReader({ loadAssets: false });
    const archive = await reader.read(file);
    const result = {
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
//# sourceMappingURL=preserve-reader.js.map