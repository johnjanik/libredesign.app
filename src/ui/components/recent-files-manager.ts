/**
 * Recent Files Manager
 * Tracks and persists recently opened files for the Open Recent menu.
 */

const STORAGE_KEY = 'designlibre-recent-files';
const MAX_RECENT_FILES = 10;

/**
 * Recent file entry metadata
 */
export interface RecentFileEntry {
  /** Display name of the file */
  readonly name: string;
  /** File path (if available from File System Access API) */
  readonly path?: string;
  /** Timestamp when the file was last opened */
  readonly lastOpened: number;
  /** File format extension */
  readonly format: 'designlibre' | 'seed';
}

/**
 * Recent Files Manager
 * Handles storing and retrieving recently opened files using localStorage.
 */
export class RecentFilesManager {
  private recentFiles: RecentFileEntry[] = [];

  constructor() {
    this.load();
  }

  /**
   * Get the list of recent files.
   */
  getRecentFiles(): readonly RecentFileEntry[] {
    return this.recentFiles;
  }

  /**
   * Add a file to the recent files list.
   */
  addRecentFile(name: string, path?: string): void {
    // Determine format from extension
    const format = name.toLowerCase().endsWith('.seed') ? 'seed' : 'designlibre';

    // Remove existing entry with the same name/path if it exists
    this.recentFiles = this.recentFiles.filter(
      (entry) => !(entry.name === name || (path && entry.path === path))
    );

    // Add new entry at the beginning
    const newEntry: RecentFileEntry = {
      name,
      lastOpened: Date.now(),
      format,
    };
    if (path !== undefined) {
      (newEntry as { path?: string }).path = path;
    }
    this.recentFiles.unshift(newEntry);

    // Limit the list size
    if (this.recentFiles.length > MAX_RECENT_FILES) {
      this.recentFiles = this.recentFiles.slice(0, MAX_RECENT_FILES);
    }

    this.save();
  }

  /**
   * Remove a file from the recent files list.
   */
  removeRecentFile(name: string): void {
    this.recentFiles = this.recentFiles.filter((entry) => entry.name !== name);
    this.save();
  }

  /**
   * Clear all recent files.
   */
  clearRecentFiles(): void {
    this.recentFiles = [];
    this.save();
  }

  /**
   * Load recent files from localStorage.
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.recentFiles = parsed.filter(this.isValidEntry);
        }
      }
    } catch (error) {
      console.warn('Failed to load recent files:', error);
      this.recentFiles = [];
    }
  }

  /**
   * Save recent files to localStorage.
   */
  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.recentFiles));
    } catch (error) {
      console.warn('Failed to save recent files:', error);
    }
  }

  /**
   * Validate a recent file entry.
   */
  private isValidEntry(entry: unknown): entry is RecentFileEntry {
    if (typeof entry !== 'object' || entry === null) return false;
    const e = entry as Record<string, unknown>;
    return (
      typeof e['name'] === 'string' &&
      typeof e['lastOpened'] === 'number' &&
      (e['format'] === 'designlibre' || e['format'] === 'seed')
    );
  }
}

// Singleton instance
let instance: RecentFilesManager | null = null;

/**
 * Get the RecentFilesManager singleton instance.
 */
export function getRecentFilesManager(): RecentFilesManager {
  if (!instance) {
    instance = new RecentFilesManager();
  }
  return instance;
}

/**
 * Format a timestamp as a relative time string.
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} ago`;

  // Format as date for older files
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}
