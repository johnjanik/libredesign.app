/**
 * .seed File Format Module
 *
 * The .seed format is an open-source, LLM-friendly design document format.
 * It is a ZIP archive containing JSON files for structured data.
 *
 * @example
 * // Write a .seed file
 * const blob = await createSeedArchive(sceneGraph, tokenRegistry);
 * downloadBlob(blob, 'my-design.seed');
 *
 * @example
 * // Read a .seed file
 * const archive = await readSeedArchive(file);
 * console.log(archive.document.name);
 * console.log(archive.pages.size);
 */

// Types
export * from './seed-types';

// Writer
export { SeedWriter, createSeedArchive } from './seed-writer';

// Reader
export { SeedReader, readSeedArchive, previewSeedArchive } from './seed-reader';

// Converters
export { nodeToSeed, seedToNode } from './converters/node-converter';
