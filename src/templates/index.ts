/**
 * DesignLibre Templates
 *
 * Pre-built templates for various platforms and design systems.
 */

export { generateiOS26Template, iOS26Colors, iOS26Typography, iOS26Spacing, iOS26Radius, iOS26Devices, iOS26SwiftMappings } from './ios26-liquid-glass-template';

import JSZip from 'jszip';
import type { PreserveArchive } from '../persistence/preserve/preserve-types';
import { PRESERVE_MIMETYPE, PRESERVE_FORMAT_VERSION } from '../persistence/preserve/preserve-types';
import { generateiOS26Template } from './ios26-liquid-glass-template';

/**
 * Create a downloadable .preserve file from a template archive
 */
export async function exportTemplateAsPreserve(archive: PreserveArchive): Promise<Blob> {
  const zip = new JSZip();

  // 1. Write mimetype (uncompressed, first)
  zip.file('mimetype', PRESERVE_MIMETYPE, { compression: 'STORE' });

  // 2. Write manifest
  const manifestJson = JSON.stringify(archive.manifest, null, 2);
  zip.file('META-INF/manifest.json', manifestJson);

  // 3. Write document
  const documentJson = JSON.stringify(archive.document, null, 2);
  zip.file('document.json', documentJson);

  // 4. Write pages
  for (const [pageId, page] of archive.pages) {
    const pageJson = JSON.stringify(page, null, 2);
    // pageId already includes 'page-' prefix, so just use it directly
    zip.file(`pages/${pageId}.json`, pageJson);
  }

  // 5. Write components
  if (archive.components) {
    const componentsJson = JSON.stringify(archive.components, null, 2);
    zip.file('components/registry.json', componentsJson);
  }

  // 6. Write component data
  if (archive.componentData) {
    for (const [componentId, component] of archive.componentData) {
      const componentJson = JSON.stringify(component, null, 2);
      zip.file(`components/component-${componentId}.json`, componentJson);
    }
  }

  // 7. Write tokens
  if (archive.tokens) {
    const tokensJson = JSON.stringify(archive.tokens, null, 2);
    zip.file('tokens/tokens.json', tokensJson);
  }

  // 8. Write prototypes (placeholder)
  zip.file('prototypes/flows.json', JSON.stringify({
    $schema: 'https://designlibre.app/schemas/preserve/1.0/prototypes.json',
    flows: [],
    interactions: [],
  }, null, 2));

  // 9. Write assets manifest
  zip.file('assets/manifest.json', JSON.stringify({
    $schema: 'https://designlibre.app/schemas/preserve/1.0/assets.json',
    assets: [],
    externalRefs: [],
  }, null, 2));

  // 10. Write history
  zip.file('history/changelog.json', JSON.stringify({
    $schema: 'https://designlibre.app/schemas/preserve/1.0/history.json',
    currentVersion: PRESERVE_FORMAT_VERSION,
    changelog: [{
      version: PRESERVE_FORMAT_VERSION,
      date: new Date().toISOString(),
      message: 'iOS 26 Liquid Glass Template',
    }],
    comments: [],
  }, null, 2));

  // Generate the archive
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * Download the iOS 26 Liquid Glass template as a .preserve file
 */
export async function downloadiOS26Template(): Promise<void> {
  const archive = generateiOS26Template();
  const blob = await exportTemplateAsPreserve(archive);

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'iOS-26-Liquid-Glass-Template.preserve';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Available templates
 */
export const templates = {
  'ios26-liquid-glass': {
    name: 'iOS 26 Liquid Glass',
    description: 'Complete iOS 26 design system with Liquid Glass components, typography, and colors',
    platform: 'iOS/iPadOS',
    version: '26.0',
    generate: generateiOS26Template,
    download: downloadiOS26Template,
  },
} as const;

export type TemplateName = keyof typeof templates;
