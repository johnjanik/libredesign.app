/**
 * Asset Storage Service
 *
 * Persists user-saved assets to IndexedDB.
 */

import type { SavedAsset, AssetCategory } from '@core/types/asset';
import { DEFAULT_ASSET_CATEGORIES } from '@core/types/asset';

const DB_NAME = 'designlibre-assets';
const DB_VERSION = 1;
const STORE_ASSETS = 'assets';
const STORE_CATEGORIES = 'categories';

/**
 * Asset storage service
 */
export class AssetStorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open assets database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create assets store
        if (!db.objectStoreNames.contains(STORE_ASSETS)) {
          const assetStore = db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
          assetStore.createIndex('category', 'category', { unique: false });
          assetStore.createIndex('name', 'name', { unique: false });
          assetStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create categories store
        if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
          db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
        }
      };
    });

    await this.initPromise;

    // Initialize default categories
    await this.initDefaultCategories();
  }

  /**
   * Initialize default categories if not present
   */
  private async initDefaultCategories(): Promise<void> {
    const categories = await this.getCategories();
    if (categories.length === 0) {
      for (const category of DEFAULT_ASSET_CATEGORIES) {
        await this.saveCategory(category);
      }
    }
  }

  /**
   * Save an asset
   */
  async saveAsset(asset: SavedAsset): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_ASSETS], 'readwrite');
      const store = transaction.objectStore(STORE_ASSETS);
      const request = store.put(asset);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get an asset by ID
   */
  async getAsset(id: string): Promise<SavedAsset | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_ASSETS], 'readonly');
      const store = transaction.objectStore(STORE_ASSETS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all assets
   */
  async getAllAssets(): Promise<SavedAsset[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_ASSETS], 'readonly');
      const store = transaction.objectStore(STORE_ASSETS);
      const request = store.getAll();

      request.onsuccess = () => {
        const assets = request.result as SavedAsset[];
        // Sort by updatedAt descending
        assets.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(assets);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get assets by category
   */
  async getAssetsByCategory(category: string): Promise<SavedAsset[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_ASSETS], 'readonly');
      const store = transaction.objectStore(STORE_ASSETS);
      const index = store.index('category');
      const request = index.getAll(IDBKeyRange.only(category));

      request.onsuccess = () => {
        const assets = request.result as SavedAsset[];
        assets.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(assets);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Search assets by name or tags
   */
  async searchAssets(query: string): Promise<SavedAsset[]> {
    const allAssets = await this.getAllAssets();
    const lowerQuery = query.toLowerCase();

    return allAssets.filter(asset =>
      asset.name.toLowerCase().includes(lowerQuery) ||
      asset.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Delete an asset
   */
  async deleteAsset(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_ASSETS], 'readwrite');
      const store = transaction.objectStore(STORE_ASSETS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update asset name
   */
  async renameAsset(id: string, newName: string): Promise<void> {
    const asset = await this.getAsset(id);
    if (!asset) throw new Error('Asset not found');

    asset.name = newName;
    asset.updatedAt = Date.now();
    await this.saveAsset(asset);
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<AssetCategory[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_CATEGORIES], 'readonly');
      const store = transaction.objectStore(STORE_CATEGORIES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as AssetCategory[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a category
   */
  async saveCategory(category: AssetCategory): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_CATEGORIES], 'readwrite');
      const store = transaction.objectStore(STORE_CATEGORIES);
      const request = store.put(category);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_CATEGORIES], 'readwrite');
      const store = transaction.objectStore(STORE_CATEGORIES);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Singleton instance
let storageInstance: AssetStorageService | null = null;

/**
 * Get the global asset storage service
 */
export function getAssetStorageService(): AssetStorageService {
  if (!storageInstance) {
    storageInstance = new AssetStorageService();
  }
  return storageInstance;
}
