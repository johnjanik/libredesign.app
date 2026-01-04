/**
 * Seed Writer
 *
 * Creates .seed archive files from DesignLibre documents.
 */

import JSZip from 'jszip';
import type { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeData, PageNodeData } from '@scene/nodes/base-node';
import type { NodeId } from '@core/types/common';
import type { TokenRegistry } from '@devtools/tokens/token-registry';
import type {
  SeedManifest,
  SeedManifestEntry,
  SeedDocument,
  SeedPage,
  SeedNode,
  SeedTokens,
  SeedTokenGroup,
  SeedComponentRegistry,
  SeedPrototypes,
  SeedAssetManifest,
  SeedHistory,
  SeedWriteOptions,
} from './seed-types';
import {
  SEED_MIMETYPE,
  SEED_FORMAT_VERSION,
} from './seed-types';
import { nodeToSeed } from './converters/node-converter';

const DEFAULT_OPTIONS: Required<SeedWriteOptions> = {
  includeThumbnail: true,
  thumbnailSize: 512,
  includeHistory: true,
  compression: 'DEFLATE',
};

/**
 * SeedWriter - Creates .seed archives from DesignLibre documents.
 */
export class SeedWriter {
  private zip: JSZip;
  private sceneGraph: SceneGraph;
  private tokenRegistry: TokenRegistry | null;
  private options: Required<SeedWriteOptions>;
  private entries: SeedManifestEntry[] = [];

  constructor(
    sceneGraph: SceneGraph,
    tokenRegistry: TokenRegistry | null = null,
    options: SeedWriteOptions = {}
  ) {
    this.zip = new JSZip();
    this.sceneGraph = sceneGraph;
    this.tokenRegistry = tokenRegistry;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Write the document to a .seed archive.
   */
  async write(): Promise<Blob> {
    // 1. Write mimetype (uncompressed, first)
    this.writeMimetype();

    // 2. Write document.json
    this.writeDocument();

    // 3. Write pages
    this.writePages();

    // 4. Write components
    this.writeComponents();

    // 5. Write tokens
    this.writeTokens();

    // 6. Write prototypes (placeholder)
    this.writePrototypes();

    // 7. Write assets
    await this.writeAssets();

    // 8. Write history
    if (this.options.includeHistory) {
      this.writeHistory();
    }

    // 9. Write thumbnail
    if (this.options.includeThumbnail) {
      await this.writeThumbnail();
    }

    // 10. Write manifest (last, includes all entries)
    this.writeManifest();

    // Generate the archive
    return this.zip.generateAsync({
      type: 'blob',
      compression: this.options.compression,
      compressionOptions: { level: 6 },
    });
  }

  private writeMimetype(): void {
    // Must be uncompressed and first in archive
    this.zip.file('mimetype', SEED_MIMETYPE, { compression: 'STORE' });
  }

  private writeManifest(): void {
    const now = new Date().toISOString();

    const manifest: SeedManifest = {
      version: SEED_FORMAT_VERSION,
      generator: 'DesignLibre 0.1.0',
      created: now,
      modified: now,
      entries: this.entries,
    };

    const json = JSON.stringify(manifest, null, 2);
    this.zip.file('META-INF/manifest.json', json);
  }

  private writeDocument(): void {
    const doc = this.sceneGraph.getDocument();
    if (!doc) return;

    const pageIds = this.sceneGraph.getChildIds(doc.id);
    const now = new Date().toISOString();

    const document: SeedDocument = {
      $schema: 'https://designlibre.app/schemas/seed/1.0/document.json',
      id: doc.id,
      name: doc.name,
      formatVersion: SEED_FORMAT_VERSION,
      created: now,
      modified: now,
      pages: pageIds.map((pageId, index) => {
        const page = this.sceneGraph.getNode(pageId);
        return {
          id: pageId,
          name: page?.name ?? `Leaf ${index + 1}`,
          path: `pages/page-${pageId}.json`,
        };
      }),
      settings: {
        colorSpace: 'sRGB',
        defaultUnit: 'px',
      },
    };

    const json = JSON.stringify(document, null, 2);
    this.zip.file('document.json', json);
    this.addEntry('document.json', 'document', json.length);
  }

  private writePages(): void {
    const doc = this.sceneGraph.getDocument();
    if (!doc) return;

    const pageIds = this.sceneGraph.getChildIds(doc.id);

    for (const pageId of pageIds) {
      const pageNode = this.sceneGraph.getNode(pageId) as PageNodeData | null;
      if (!pageNode) continue;

      const childIds = this.sceneGraph.getChildIds(pageId);
      const nodes: SeedNode[] = [];

      for (const childId of childIds) {
        const node = this.sceneGraph.getNode(childId);
        if (node) {
          nodes.push(this.convertNodeTree(node));
        }
      }

      const page: SeedPage = {
        $schema: 'https://designlibre.app/schemas/seed/1.0/page.json',
        id: pageId,
        name: pageNode.name,
        backgroundColor: pageNode.backgroundColor,
        nodes,
      };

      const path = `pages/page-${pageId}.json`;
      const json = JSON.stringify(page, null, 2);
      this.zip.file(path, json);
      this.addEntry(path, 'page', json.length);
    }
  }

  private convertNodeTree(node: NodeData): SeedNode {
    const childIds = this.sceneGraph.getChildIds(node.id);
    let children: SeedNode[] | undefined;

    if (childIds.length > 0) {
      children = [];
      for (const childId of childIds) {
        const child = this.sceneGraph.getNode(childId);
        if (child) {
          children.push(this.convertNodeTree(child));
        }
      }
    }

    return nodeToSeed(node, children);
  }

  private writeComponents(): void {
    // Get component nodes from scene graph
    const doc = this.sceneGraph.getDocument();
    if (!doc) return;

    const componentNodes: NodeData[] = [];
    const allNodes = this.getAllNodes();

    for (const node of allNodes) {
      if (node.type === 'COMPONENT') {
        componentNodes.push(node);
      }
    }

    if (componentNodes.length === 0) return;

    const registry: SeedComponentRegistry = {
      $schema: 'https://designlibre.app/schemas/seed/1.0/components.json',
      components: componentNodes.map(node => ({
        id: node.id,
        name: node.name,
        path: `components/component-${node.id}.json`,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      })),
      componentSets: [],
    };

    const registryJson = JSON.stringify(registry, null, 2);
    this.zip.file('components/registry.json', registryJson);
    this.addEntry('components/registry.json', 'component', registryJson.length);

    // Write individual component files
    for (const node of componentNodes) {
      const component = {
        $schema: 'https://designlibre.app/schemas/seed/1.0/component.json',
        id: node.id,
        name: node.name,
        nodes: [this.convertNodeTree(node)],
      };

      const path = `components/component-${node.id}.json`;
      const json = JSON.stringify(component, null, 2);
      this.zip.file(path, json);
      this.addEntry(path, 'component', json.length);
    }
  }

  private writeTokens(): void {
    if (!this.tokenRegistry) return;

    const groups: SeedTokenGroup[] = [];

    // Get all tokens by type (using lowercase type names)
    const colorTokens = this.tokenRegistry.getByType('color');
    const typographyTokens = this.tokenRegistry.getByType('typography');
    const spacingTokens = this.tokenRegistry.getByType('spacing');
    const shadowTokens = this.tokenRegistry.getByType('shadow');

    if (colorTokens.length > 0) {
      groups.push({
        name: 'colors',
        tokens: colorTokens.map((t: { id: string; name: string; value: unknown; description?: string }) => {
          const token: { id: string; name: string; type: 'COLOR'; value: { r: number; g: number; b: number; a: number }; description?: string } = {
            id: t.id,
            name: t.name,
            type: 'COLOR',
            value: t.value as { r: number; g: number; b: number; a: number },
          };
          if (t.description) token.description = t.description;
          return token;
        }),
      });
    }

    if (typographyTokens.length > 0) {
      groups.push({
        name: 'typography',
        tokens: typographyTokens.map((t: { id: string; name: string; value: unknown; description?: string }) => {
          const token: { id: string; name: string; type: 'TYPOGRAPHY'; value: { fontFamily: string; fontWeight: number; fontSize: number }; description?: string } = {
            id: t.id,
            name: t.name,
            type: 'TYPOGRAPHY',
            value: t.value as { fontFamily: string; fontWeight: number; fontSize: number },
          };
          if (t.description) token.description = t.description;
          return token;
        }),
      });
    }

    if (spacingTokens.length > 0) {
      groups.push({
        name: 'spacing',
        tokens: spacingTokens.map((t: { id: string; name: string; value: unknown; description?: string }) => {
          const token: { id: string; name: string; type: 'SPACING'; value: number; description?: string } = {
            id: t.id,
            name: t.name,
            type: 'SPACING',
            value: t.value as number,
          };
          if (t.description) token.description = t.description;
          return token;
        }),
      });
    }

    if (shadowTokens.length > 0) {
      groups.push({
        name: 'shadows',
        tokens: shadowTokens.map((t: { id: string; name: string; value: unknown; description?: string }) => {
          const token: { id: string; name: string; type: 'SHADOW'; value: { type: 'DROP_SHADOW' | 'INNER_SHADOW'; color: { r: number; g: number; b: number; a: number }; offset: { x: number; y: number }; blur: number; spread: number }; description?: string } = {
            id: t.id,
            name: t.name,
            type: 'SHADOW',
            value: t.value as { type: 'DROP_SHADOW' | 'INNER_SHADOW'; color: { r: number; g: number; b: number; a: number }; offset: { x: number; y: number }; blur: number; spread: number },
          };
          if (t.description) token.description = t.description;
          return token;
        }),
      });
    }

    if (groups.length === 0) return;

    const tokens: SeedTokens = {
      $schema: 'https://designlibre.app/schemas/seed/1.0/tokens.json',
      version: '1.0.0',
      groups,
    };

    const json = JSON.stringify(tokens, null, 2);
    this.zip.file('tokens/tokens.json', json);
    this.addEntry('tokens/tokens.json', 'tokens', json.length);
  }

  private writePrototypes(): void {
    // Placeholder for prototype data
    // Will be implemented when prototype system is complete
    const prototypes: SeedPrototypes = {
      $schema: 'https://designlibre.app/schemas/seed/1.0/prototypes.json',
      flows: [],
      interactions: [],
    };

    const json = JSON.stringify(prototypes, null, 2);
    this.zip.file('prototypes/flows.json', json);
    this.addEntry('prototypes/flows.json', 'prototypes', json.length);
  }

  private async writeAssets(): Promise<void> {
    // Collect all image references from the document
    const imageRefs = new Set<string>();
    const allNodes = this.getAllNodes();

    for (const node of allNodes) {
      if (node.type === 'IMAGE') {
        const imageNode = node as { imageRef?: string };
        if (imageNode.imageRef) {
          imageRefs.add(imageNode.imageRef);
        }
      }

      // Check fills for image paints
      if ('fills' in node) {
        const nodeWithFills = node as unknown as { fills?: readonly { type: string; imageRef?: string }[] };
        const fills = nodeWithFills.fills ?? [];
        for (const fill of fills) {
          if (fill.type === 'IMAGE' && fill.imageRef) {
            imageRefs.add(fill.imageRef);
          }
        }
      }
    }

    const manifest: SeedAssetManifest = {
      $schema: 'https://designlibre.app/schemas/seed/1.0/assets.json',
      assets: [],
      externalRefs: [],
    };

    // For now, we'll store data URLs as embedded assets
    // In a real implementation, we'd extract the binary data
    for (const ref of imageRefs) {
      if (ref.startsWith('data:')) {
        // Extract MIME type and data from data URL
        const match = ref.match(/^data:([^;]+);base64,(.*)$/);
        if (match) {
          const [, mediaType, base64Data] = match;
          const hash = this.hashString(ref.slice(0, 100));
          const ext = mediaType === 'image/png' ? 'png' : 'jpg';
          const path = `assets/images/${hash}.${ext}`;

          // Decode base64 and store
          const binaryData = atob(base64Data!);
          const bytes = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
          }

          this.zip.file(path, bytes);

          manifest.assets.push({
            id: hash,
            name: `image-${hash}.${ext}`,
            path,
            type: 'image',
            mediaType: mediaType!,
            size: bytes.length,
          });

          this.addEntry(path, 'asset', bytes.length, mediaType);
        }
      } else {
        // External URL reference
        manifest.externalRefs!.push({
          id: this.hashString(ref),
          name: ref.split('/').pop() ?? 'external',
          type: 'image',
          url: ref,
          mediaType: 'image/png',
        });
      }
    }

    const json = JSON.stringify(manifest, null, 2);
    this.zip.file('assets/manifest.json', json);
    this.addEntry('assets/manifest.json', 'asset', json.length);
  }

  private writeHistory(): void {
    const history: SeedHistory = {
      $schema: 'https://designlibre.app/schemas/seed/1.0/history.json',
      currentVersion: '1.0.0',
      changelog: [
        {
          version: '1.0.0',
          date: new Date().toISOString(),
          message: 'Initial export',
        },
      ],
      comments: [],
    };

    const json = JSON.stringify(history, null, 2);
    this.zip.file('history/changelog.json', json);
    this.addEntry('history/changelog.json', 'history', json.length);
  }

  private async writeThumbnail(): Promise<void> {
    // Generate a simple placeholder thumbnail
    // In a real implementation, we'd render the first page to canvas
    // and export as PNG

    // For now, skip if no canvas available
    // The thumbnail generation would require access to the renderer
  }

  private getAllNodes(): NodeData[] {
    const nodes: NodeData[] = [];
    const doc = this.sceneGraph.getDocument();
    if (!doc) return nodes;

    const traverse = (nodeId: NodeId) => {
      const node = this.sceneGraph.getNode(nodeId);
      if (!node) return;
      if (node.type !== 'DOCUMENT') {
        nodes.push(node);
      }
      const childIds = this.sceneGraph.getChildIds(nodeId);
      for (const childId of childIds) {
        traverse(childId);
      }
    };

    traverse(doc.id);
    return nodes;
  }

  private addEntry(path: string, type: SeedManifestEntry['type'], size: number, mediaType?: string): void {
    const entry: SeedManifestEntry = { path, type, size };
    if (mediaType) {
      entry.mediaType = mediaType;
    }
    this.entries.push(entry);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

/**
 * Create a .seed archive from a scene graph.
 */
export async function createSeedArchive(
  sceneGraph: SceneGraph,
  tokenRegistry: TokenRegistry | null = null,
  options: SeedWriteOptions = {}
): Promise<Blob> {
  const writer = new SeedWriter(sceneGraph, tokenRegistry, options);
  return writer.write();
}
