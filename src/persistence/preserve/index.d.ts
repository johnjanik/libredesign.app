/**
 * .preserve File Format Module
 *
 * The .preserve format is an open-source, LLM-friendly design document format.
 * It is a ZIP archive containing JSON files for structured data.
 *
 * @example
 * // Write a .preserve file
 * const blob = await createPreserveArchive(sceneGraph, tokenRegistry);
 * downloadBlob(blob, 'my-design.preserve');
 *
 * @example
 * // Read a .preserve file
 * const archive = await readPreserveArchive(file);
 * console.log(archive.document.name);
 * console.log(archive.pages.size);
 */
export * from './preserve-types';
export { PreserveWriter, createPreserveArchive } from './preserve-writer';
export { PreserveReader, readPreserveArchive, previewPreserveArchive } from './preserve-reader';
export { nodeToPreserve, preserveToNode } from './converters/node-converter';
//# sourceMappingURL=index.d.ts.map