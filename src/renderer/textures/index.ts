/**
 * Textures Module
 *
 * Provides texture and image management for rendering.
 */

// Texture manager
export {
  TextureManager,
  createTextureManager,
} from './texture-manager';
export type {
  TextureEntry,
  TextureLoadOptions,
  TextureManagerConfig,
} from './texture-manager';

// Image cache
export {
  ImageCache,
  createImageCache,
} from './image-cache';
export type {
  ImageEntry,
  ImageStatus,
  ImageCacheConfig,
} from './image-cache';
